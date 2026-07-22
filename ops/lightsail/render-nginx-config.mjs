import { randomBytes } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { isIP } from "node:net";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = "__GIWA_STAGE_HOST__";
const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
const OUTPUT_FILENAME = /^giwa-staging(?:\.candidate-[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?)?\.conf$/u;
const ALLOWED_OUTPUT_PARENTS = new Set([
  "/etc/nginx/sites-available",
  "/etc/nginx/conf.d"
]);
const scriptPath = fileURLToPath(import.meta.url);
const templatePath = fileURLToPath(
  new URL("./nginx/giwa-staging.conf.template", import.meta.url)
);

export function normalizeStageHostname(rawValue) {
  if (
    typeof rawValue !== "string" ||
    rawValue.length === 0 ||
    rawValue !== rawValue.trim()
  ) {
    throw new Error("invalid-host");
  }

  const host = rawValue.toLowerCase();
  const labels = host.split(".");
  const finalLabel = labels.at(-1) ?? "";
  if (
    host.length > 253 ||
    host.endsWith(".") ||
    labels.length < 2 ||
    isIP(host) !== 0 ||
    !/[a-z]/u.test(finalLabel) ||
    labels.some((label) => !DNS_LABEL.test(label))
  ) {
    throw new Error("invalid-host");
  }

  let canonicalHost;
  try {
    canonicalHost = new URL(`http://${host}/`).hostname;
  } catch (_error) {
    throw new Error("invalid-host");
  }
  if (isIP(canonicalHost) !== 0) {
    throw new Error("invalid-host");
  }
  return host;
}

export function isMainModuleInvocation(invokedPath, modulePath) {
  if (
    typeof invokedPath !== "string" ||
    invokedPath.length === 0 ||
    typeof modulePath !== "string" ||
    modulePath.length === 0
  ) {
    return false;
  }
  try {
    return realpathSync(invokedPath) === realpathSync(modulePath);
  } catch (_error) {
    return false;
  }
}

function lstatIfExists(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
}

function requireOutputPath(rawValue) {
  if (
    typeof rawValue !== "string" ||
    rawValue.length === 0 ||
    rawValue !== rawValue.trim() ||
    !isAbsolute(rawValue)
  ) {
    throw new Error("invalid-output");
  }

  const outputPath = rawValue;
  const outputParent = dirname(outputPath);
  const outputFilename = basename(outputPath);
  if (
    !ALLOWED_OUTPUT_PARENTS.has(outputParent) ||
    !OUTPUT_FILENAME.test(outputFilename)
  ) {
    throw new Error("invalid-output");
  }

  const outputParentStats = lstatSync(outputParent);
  if (!outputParentStats.isDirectory() || outputParentStats.isSymbolicLink()) {
    throw new Error("invalid-output");
  }
  if (lstatIfExists(outputPath) !== undefined) {
    throw new Error("output-exists");
  }

  return { outputPath, outputParent };
}

export function publishNoReplace(tempPath, outputPath) {
  linkSync(tempPath, outputPath);
}

function writeNewOutput({ outputPath, outputParent }, rendered) {
  let fileDescriptor;
  let tempPath;
  try {
    const candidateTempPath = join(
      outputParent,
      `.giwa-staging.render-${process.pid}-${randomBytes(8).toString("hex")}.tmp`
    );
    fileDescriptor = openSync(candidateTempPath, "wx", 0o640);
    tempPath = candidateTempPath;
    writeFileSync(fileDescriptor, rendered, { encoding: "utf8" });
    fsyncSync(fileDescriptor);
    closeSync(fileDescriptor);
    fileDescriptor = undefined;

    if (lstatIfExists(outputPath) !== undefined) {
      throw new Error("output-exists");
    }
    publishNoReplace(tempPath, outputPath);
    unlinkSync(tempPath);
    tempPath = undefined;
  } finally {
    if (fileDescriptor !== undefined) {
      try {
        closeSync(fileDescriptor);
      } catch (_error) {
        // The bounded top-level failure handler owns reporting.
      }
    }
    if (tempPath !== undefined) {
      try {
        unlinkSync(tempPath);
      } catch (_error) {
        // Never remove or replace the requested output during cleanup.
      }
    }
  }
}

function render() {
  if (process.argv.length !== 3) {
    throw new Error("invalid-output");
  }

  const output = requireOutputPath(process.argv[2]);
  const host = normalizeStageHostname(process.env.GIWA_STAGE_HOST);
  const template = readFileSync(templatePath, "utf8");
  const tokenCount = template.split(TOKEN).length - 1;
  if (tokenCount !== 1) throw new Error("invalid-template");

  const rendered = template.replace(TOKEN, host);
  if (/__[A-Z0-9_]+__/u.test(rendered)) throw new Error("unresolved-token");
  writeNewOutput(output, rendered);
}

if (isMainModuleInvocation(process.argv[1], scriptPath)) {
  try {
    render();
  } catch (_error) {
    process.stderr.write("nginx renderer failed\n");
    process.exitCode = 1;
  }
}

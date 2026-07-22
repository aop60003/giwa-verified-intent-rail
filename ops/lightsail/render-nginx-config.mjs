import { readFileSync, writeFileSync } from "node:fs";
import { isIP } from "node:net";
import { fileURLToPath } from "node:url";

const TOKEN = "__GIWA_STAGE_HOST__";
const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
const templatePath = fileURLToPath(
  new URL("./nginx/giwa-staging.conf.template", import.meta.url)
);

function requireHostname(rawValue) {
  if (
    typeof rawValue !== "string" ||
    rawValue.length === 0 ||
    rawValue !== rawValue.trim()
  ) {
    throw new Error("invalid-host");
  }

  const host = rawValue.toLowerCase();
  const labels = host.split(".");
  if (
    host.length > 253 ||
    host.endsWith(".") ||
    labels.length < 2 ||
    isIP(host) !== 0 ||
    labels.some((label) => !DNS_LABEL.test(label))
  ) {
    throw new Error("invalid-host");
  }
  return host;
}

function render() {
  const outputPath = process.argv[2];
  if (process.argv.length !== 3 || typeof outputPath !== "string" || outputPath.length === 0) {
    throw new Error("invalid-output");
  }

  const host = requireHostname(process.env.GIWA_STAGE_HOST);
  const template = readFileSync(templatePath, "utf8");
  const tokenCount = template.split(TOKEN).length - 1;
  if (tokenCount !== 1) throw new Error("invalid-template");

  const rendered = template.replace(TOKEN, host);
  if (/__[A-Z0-9_]+__/u.test(rendered)) throw new Error("unresolved-token");
  writeFileSync(outputPath, rendered, { encoding: "utf8", mode: 0o640 });
}

try {
  render();
} catch (_error) {
  process.stderr.write("nginx renderer failed\n");
  process.exitCode = 1;
}

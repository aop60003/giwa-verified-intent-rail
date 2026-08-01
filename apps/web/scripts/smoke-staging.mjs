import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_REPLAY_OUTPUT_BYTES = 16 * 1024;
const PUBLIC_HASH_PATTERN = /^0x[a-f0-9]{64}$/u;
const REQUEST_HEADERS = Object.freeze({
  "authorization": "Bearer giwa-smoke-request-authorization-canary",
  "user-agent": "giwa-smoke-request-user-agent-canary",
  "x-forwarded-for": "giwa-smoke-request-forwarded-for-canary",
  "x-giwa-smoke-canary": "giwa-smoke-request-custom-canary"
});
const REQUEST_SENTINEL_VALUES = Object.values(REQUEST_HEADERS);
const REPLAY_CHECK_NAMES = [
  "manifestHash",
  "manifestSignature",
  "verifierInputHash",
  "decodedLogHash",
  "receiptHash",
  "crossReferences"
];
const FORBIDDEN_PUBLIC_KEY_SHAPES = new Set([
  "authorization",
  "clientip",
  "credential",
  "credentials",
  "env",
  "environment",
  "forwardedfor",
  "headers",
  "ip",
  "ipaddress",
  "rawip",
  "realip",
  "remoteaddress",
  "remoteip",
  "requestheaders",
  "run",
  "runid",
  "session",
  "sessionhash",
  "sessionid",
  "useragent",
  "xforwardedfor",
  "xauthorization",
  "xclientip",
  "xenv",
  "xrawip",
  "xrealip",
  "xrun",
  "xrunid",
  "xsession",
  "xsessionhash",
  "xsessionid"
]);
const FORBIDDEN_RESPONSE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "forwarded",
  "proxyauthorization",
  "setcookie",
  "useragent",
  "xauthorization",
  "xcapability",
  "xclientip",
  "xcredential",
  "xcredentials",
  "xenvironment",
  "xforwardedfor",
  "xprivatekey",
  "xrawip",
  "xrealip",
  "xrun",
  "xruncapability",
  "xrunid",
  "xsession",
  "xsessionhash",
  "xsessionid",
  "xuseragent"
]);
const REPLAY_EVAL_SOURCE = `
  import { normalizePublicVerificationBundle } from ${JSON.stringify(
    new URL("../src/lib/live/publicVerificationBundle.ts", import.meta.url).href
  )};
  import { replayPublicVerificationBundle } from ${JSON.stringify(
    new URL("../src/lib/live/publicVerificationReplay.ts", import.meta.url).href
  )};
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const bundle = normalizePublicVerificationBundle(JSON.parse(input));
  const result = await replayPublicVerificationBundle(bundle);
  process.stdout.write(JSON.stringify(result));
`;

const checks = [
  ["landing","/",200,"landing.js"],
  ["guided-demo","/giwa-demo",200,"user-flow.js"],
  ["proof-ledger","/evidence",200,"flow.js"],
  ["participant","/user",200,"user-flow.js"],
  ["participant-help","/user/help",200,"user-flow.js"],
  ["campaign-page","/partner",200,"GIWA Verified Intent Rail"],
  ["campaign-api","/api/public/campaign-studio",200,"\"screenKind\":\"public-campaign-studio\""],
  ["health","/healthz",200,"\"ok\":true"],
  ["readiness","/readyz",200,"\"ready\":true"],
  ["public-config","/api/public/config",200,"\"chainId\":91342"]
];

function parseBaseUrl(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") throw new Error("invalid base URL");

  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error("invalid base URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid base URL");
  if (parsed.username !== "" || parsed.password !== "") throw new Error("invalid base URL");
  if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") throw new Error("invalid base URL");

  return parsed;
}

function parsePublicHash(rawValue) {
  if (typeof rawValue !== "string" || !PUBLIC_HASH_PATTERN.test(rawValue)) {
    throw new Error("invalid public hash");
  }
  return rawValue;
}

function boundedStatus(value) {
  return Number.isInteger(value) && value >= 100 && value <= 599 ? String(value) : "000";
}

function writeResult(label, status, passed) {
  console.log(`${label} ${status} ${passed ? "pass" : "fail"}`);
}

function normalizedPublicKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function structuredJsonKeyIsForbidden(value) {
  const normalized = normalizedPublicKey(value);
  return (
    FORBIDDEN_PUBLIC_KEY_SHAPES.has(normalized) ||
    normalized.includes("capability") ||
    normalized.includes("credential") ||
    normalized.includes("environment") ||
    normalized.endsWith("headers") ||
    normalized.includes("privatekey") ||
    normalized.startsWith("session") ||
    normalized.includes("useragent")
  );
}

function jsonContainsForbiddenKey(value) {
  if (Array.isArray(value)) {
    return value.some((item) => jsonContainsForbiddenKey(item));
  }
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      structuredJsonKeyIsForbidden(key) || jsonContainsForbiddenKey(nested)
  );
}

function containsRequestSentinel(value) {
  return REQUEST_SENTINEL_VALUES.some((sentinel) => value.includes(sentinel));
}

function responseHeadersAreSafe(headers) {
  for (const [name, value] of headers.entries()) {
    if (
      FORBIDDEN_RESPONSE_HEADER_NAMES.has(normalizedPublicKey(name)) ||
      containsRequestSentinel(name) ||
      containsRequestSentinel(value)
    ) {
      return false;
    }
  }
  return true;
}

function publicResponseIsSafe(body, headers) {
  if (containsRequestSentinel(body) || !responseHeadersAreSafe(headers)) {
    return false;
  }
  try {
    return !jsonContainsForbiddenKey(JSON.parse(body));
  } catch {
    return true;
  }
}

async function readBoundedBody(response) {
  const contentLength = response.headers.get("content-length");
  if (
    contentLength !== null &&
    /^\d+$/u.test(contentLength) &&
    Number(contentLength) > MAX_RESPONSE_BYTES
  ) {
    throw new Error("response too large");
  }
  if (response.body === null) throw new Error("missing response body");

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) throw new Error("response too large");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

async function fetchBounded(baseUrl, path) {
  const url = path instanceof URL ? path : new URL(path, baseUrl);
  if (url.origin !== baseUrl.origin) throw new Error("cross-origin request");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      method: "GET",
      redirect: "manual",
      signal: controller.signal
    });
    if (new URL(response.url).origin !== baseUrl.origin) {
      throw new Error("cross-origin response");
    }
    const body = await readBoundedBody(response);
    if (!publicResponseIsSafe(body, response.headers)) {
      throw new Error("unsafe public response");
    }
    return {
      response,
      status: boundedStatus(response.status),
      body
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runCheck(baseUrl, [label, path, expectedStatus, expectedMarker]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(new URL(path, baseUrl), {
      headers: REQUEST_HEADERS,
      method: "GET",
      redirect: "manual",
      signal: controller.signal
    });
    const status = boundedStatus(response.status);
    const body = await readBoundedBody(response);
    if (new URL(response.url).origin !== baseUrl.origin) {
      writeResult(label, status, false);
      return false;
    }
    const passed =
      response.status === expectedStatus &&
      body.includes(expectedMarker) &&
      publicResponseIsSafe(body, response.headers);
    writeResult(label, status, passed);
    return passed;
  } catch {
    writeResult(label, "000", false);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonObject(text) {
  const value = JSON.parse(text);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid JSON object");
  }
  return value;
}

function parseProof(result) {
  const summary = parseJsonObject(result.body);
  const bundle = summary.bundle;
  if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new Error("invalid bundle");
  }
  return {
    status: result.status,
    response: result.response,
    rawBody: result.body,
    queryKind: summary.queryKind,
    summaryReceiptHash: summary.receiptHash,
    body: bundle
  };
}

function proofIdentityMatches(proof, queryKind, publicHashes) {
  return (
    proof.status === "200" &&
    proof.queryKind === queryKind &&
    proof.summaryReceiptHash === publicHashes.receiptHash &&
    proof.body.identity?.receiptHash === publicHashes.receiptHash &&
    proof.body.identity.intentHash === publicHashes.intentHash &&
    proof.body.identity.depositTxHash === publicHashes.depositTxHash
  );
}

export function replayBundle(
  bundleJson,
  {
    spawnImpl = spawn,
    timeoutMs = REQUEST_TIMEOUT_MS,
    maxOutputBytes = MAX_REPLAY_OUTPUT_BYTES
  } = {}
) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawnImpl(
        process.execPath,
        ["--experimental-strip-types", "--input-type=module", "--eval", REPLAY_EVAL_SOURCE],
        {
          env: { NODE_NO_WARNINGS: "1" },
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true
        }
      );
    } catch {
      resolve(false);
      return;
    }
    let stdout = "";
    let stderrBytes = 0;
    let settled = false;
    let terminationRequested = false;
    const finishAfterClose = (passed) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(passed);
    };
    const requestTermination = () => {
      if (terminationRequested) return;
      terminationRequested = true;
      try {
        child.kill();
      } catch {
        // A failed spawn has no live child to terminate; wait for close cleanup.
      }
    };
    const timeout = setTimeout(requestTermination, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      const nextBytes = Buffer.byteLength(stdout) + Buffer.byteLength(chunk);
      if (nextBytes > maxOutputBytes) {
        requestTermination();
        return;
      }
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += Buffer.byteLength(chunk);
      if (stderrBytes > maxOutputBytes) {
        requestTermination();
      }
    });
    child.on("error", requestTermination);
    child.on("close", (code) => {
      if (terminationRequested || code !== 0) {
        finishAfterClose(false);
        return;
      }
      try {
        const replay = parseJsonObject(stdout);
        finishAfterClose(
          replay.ok === true &&
            REPLAY_CHECK_NAMES.every((name) => replay.checks?.[name] === "passed")
        );
      } catch {
        finishAfterClose(false);
      }
    });
    child.stdin.on("error", requestTermination);
    try {
      child.stdin.end(bundleJson);
    } catch {
      requestTermination();
    }
  });
}

function displayMatchedRate(numerator, denominator) {
  if (denominator === 0) return "0%";
  const percent = (numerator / denominator) * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

export function campaignMetricsAreComplete(body) {
  const campaign = parseJsonObject(body);
  const generatedAt = campaign.generatedAt;
  const kpis = campaign.kpis;
  return (
    campaign.screenKind === "public-campaign-studio" &&
    campaign.source === "live" &&
    typeof generatedAt === "string" &&
    new Date(generatedAt).toISOString() === generatedAt &&
    kpis !== null &&
    typeof kpis === "object" &&
    Number.isSafeInteger(kpis.matchedReceiptCount) &&
    kpis.matchedReceiptCount >= 0 &&
    Number.isSafeInteger(kpis.submittedDepositCount) &&
    kpis.submittedDepositCount >= 0 &&
    kpis.matchedReceiptCount <= kpis.submittedDepositCount &&
    Number.isSafeInteger(kpis.matchedRate?.numerator) &&
    kpis.matchedRate.numerator >= 0 &&
    Number.isSafeInteger(kpis.matchedRate?.denominator) &&
    kpis.matchedRate.denominator >= 0 &&
    kpis.matchedRate.numerator === kpis.matchedReceiptCount &&
    kpis.matchedRate.denominator === kpis.submittedDepositCount &&
    kpis.matchedRate.displayRate ===
      displayMatchedRate(kpis.matchedReceiptCount, kpis.submittedDepositCount) &&
    kpis.matchedRate.definition === "Matched Receipts / submitted deposits" &&
    Number.isSafeInteger(kpis.uniqueParticipantCount) &&
    kpis.uniqueParticipantCount >= 0 &&
    Number.isSafeInteger(kpis.repeatActivationCount) &&
    kpis.repeatActivationCount >= 0 &&
    !containsRequestSentinel(body) &&
    !jsonContainsForbiddenKey(campaign)
  );
}

async function runGate(label, operation) {
  try {
    const result = await operation();
    writeResult(label, result.status, result.passed);
    return result.passed;
  } catch {
    writeResult(label, "000", false);
    return false;
  }
}

function randomUnknownHash(publicHashes) {
  for (;;) {
    const candidate = `0x${randomBytes(32).toString("hex")}`;
    if (!Object.values(publicHashes).includes(candidate)) return candidate;
  }
}

async function runPublicVerificationChecks(baseUrl, publicHashes) {
  const proofInputs = [
    ["receipt-proof", "receipt", `/api/public/evidence/${publicHashes.receiptHash}`],
    ["intent-proof", "intent", `/api/public/evidence/${publicHashes.intentHash}`],
    ["deposit-proof", "depositTx", `/api/public/evidence/${publicHashes.depositTxHash}`]
  ];
  let receiptProof;

  for (const [label, queryKind, path] of proofInputs) {
    const passed = await runGate(label, async () => {
      const proof = parseProof(await fetchBounded(baseUrl, path));
      if (queryKind === "receipt") receiptProof = proof;
      return {
        status: proof.status,
        passed: proofIdentityMatches(proof, queryKind, publicHashes)
      };
    });
    if (!passed) return false;
  }

  const downloadUrl = new URL(
    `/api/public/evidence/${publicHashes.receiptHash}`,
    baseUrl
  );
  downloadUrl.searchParams.set("download", "1");
  let downloadBody = "";
  const downloadPassed = await runGate("bundle-download", async () => {
    const result = await fetchBounded(baseUrl, downloadUrl);
    downloadBody = result.body;
    const contentType = result.response.headers.get("content-type");
    const disposition = result.response.headers.get("content-disposition");
    const cacheControl = result.response.headers.get("cache-control");
    const expectedDisposition =
      `attachment; filename="giwa-receipt-${publicHashes.receiptHash}.json"`;
    const bundle = parseJsonObject(result.body);
    return {
      status: result.status,
      passed:
        result.status === "200" &&
        contentType === "application/json; charset=utf-8" &&
        disposition === expectedDisposition &&
        cacheControl === "public, max-age=60, stale-while-revalidate=300" &&
        JSON.stringify(bundle) === JSON.stringify(receiptProof.body)
    };
  });
  if (!downloadPassed) return false;

  const replayPassed = await runGate("bundle-replay", async () => ({
    status: "200",
    passed: await replayBundle(downloadBody)
  }));
  if (!replayPassed) return false;

  const campaignPassed = await runGate("campaign-metrics", async () => {
    const result = await fetchBounded(baseUrl, "/api/public/campaign-studio");
    return {
      status: result.status,
      passed: result.status === "200" && campaignMetricsAreComplete(result.body)
    };
  });
  if (!campaignPassed) return false;

  const unknownHash = randomUnknownHash(publicHashes);
  return runGate("unknown-proof", async () => {
    const result = await fetchBounded(
      baseUrl,
      `/api/public/evidence/${unknownHash}`
    );
    const body = parseJsonObject(result.body);
    return {
      status: result.status,
      passed:
        result.status === "404" &&
        body.error === "proof_not_found" &&
        result.response.headers.get("cache-control") === "no-store"
    };
  });
}

export async function runStagingSmoke(environment = process.env) {
  let baseUrl;
  let publicHashes;
  try {
    baseUrl = parseBaseUrl(environment.GIWA_SMOKE_BASE_URL);
    publicHashes = {
      receiptHash: parsePublicHash(environment.GIWA_SMOKE_RECEIPT_HASH),
      intentHash: parsePublicHash(environment.GIWA_SMOKE_INTENT_HASH),
      depositTxHash: parsePublicHash(environment.GIWA_SMOKE_DEPOSIT_TX_HASH)
    };
  } catch {
    writeResult("smoke-config", "000", false);
    return 1;
  }

  for (const check of checks) {
    const passed = await runCheck(baseUrl, check);
    if (!passed) return 1;
  }

  if (!(await runPublicVerificationChecks(baseUrl, publicHashes))) {
    return 1;
  }
  return 0;
}

const invokedPath =
  process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await runStagingSmoke();
}

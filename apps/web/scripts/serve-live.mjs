import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "viem/accounts";

import { exportFlowData } from "./export-flow-data.mjs";
import { createLiveApiHandler } from "../src/lib/live/liveApi.ts";
import {
  buildRedactedHostedEnvReadiness,
  buildRedactedLiveEnvReadiness,
  requireLiveServerEnv
} from "../src/lib/live/liveEnv.ts";
import { createLiveManifestIssuer } from "../src/lib/live/liveManifestIssuer.ts";
import { createSqliteLiveStore } from "../src/lib/live/liveStore.ts";
import { authenticateLiveRequest } from "../src/lib/live/liveAuth.ts";
import { buildLiveHealthBody, buildLiveReadinessBody } from "../src/lib/live/liveHealth.ts";
import { evaluateHostedModePolicy } from "../src/lib/live/hostedMode.ts";
import { createMemoryLiveRateLimiter, liveRateLimitBucket } from "../src/lib/live/liveRateLimit.ts";
import { evaluateLiveRequestSafety } from "../src/lib/live/liveRequestSafety.ts";
import { redactLiveLogEvent } from "../src/lib/live/liveTelemetry.ts";
import { createMemoryVerificationJobQueue } from "../src/lib/live/verificationJobQueue.ts";
import { createStandardRpcReceiptClient } from "../src/lib/verifier/standardRpcReceiptClient.ts";
import { verifyLiveRun } from "../src/lib/verifier/liveVerifierService.ts";

const publicDir = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const workspaceRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const deploymentPath = fileURLToPath(new URL("../src/generated/deployment.json", import.meta.url));
const port = Number(process.env.PORT ?? 4177);
const liveMode = process.env.GIWA_LIVE_MODE ?? "local";
const host = process.env.HOST ?? "127.0.0.1";
const dbPath = resolve(workspaceRoot, process.env.GIWA_LIVE_DB_PATH ?? "apps/web/.data/live-mvp-sprint12.sqlite");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

exportFlowData();
mkdirSync(dirname(dbPath), { recursive: true });

function parseEnvFileContent(content) {
  const parsed = {};
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const assignment = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const separatorIndex = assignment.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = assignment.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) continue;
    const rawValue = assignment.slice(separatorIndex + 1).trim();
    const quoted =
      (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));
    parsed[key] = quoted ? rawValue.slice(1, -1) : rawValue;
  }
  return parsed;
}

function loadLocalEnv(processEnv) {
  const candidates = [
    { label: "workspace .env", path: resolve(workspaceRoot, ".env") },
    { label: "workspace .env.local", path: resolve(workspaceRoot, ".env.local") }
  ];
  const fileEnv = {};
  const loadedEnvFiles = [];

  for (const candidate of candidates) {
    if (!existsSync(candidate.path)) continue;
    Object.assign(fileEnv, parseEnvFileContent(readFileSync(candidate.path, "utf8")));
    loadedEnvFiles.push(candidate.label);
  }

  const effectiveEnv = { ...fileEnv };
  for (const [key, value] of Object.entries(processEnv)) {
    if (typeof value === "string" && value.trim().length > 0) {
      effectiveEnv[key] = value;
    }
  }

  return { effectiveEnv, loadedEnvFiles };
}

const loadedEnv =
  liveMode === "local" ? loadLocalEnv(process.env) : { effectiveEnv: { ...process.env }, loadedEnvFiles: [] };
const readiness = buildRedactedLiveEnvReadiness({
  GIWA_SEPOLIA_RPC_URL: loadedEnv.effectiveEnv.GIWA_SEPOLIA_RPC_URL,
  GIWA_EXPLORER_TX_URL_TEMPLATE: loadedEnv.effectiveEnv.GIWA_EXPLORER_TX_URL_TEMPLATE,
  GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: loadedEnv.effectiveEnv.GIWA_EXPLORER_ADDRESS_URL_TEMPLATE,
  CAMPAIGN_SIGNER_PRIVATE_KEY: loadedEnv.effectiveEnv.CAMPAIGN_SIGNER_PRIVATE_KEY,
  INTENT_SUBMITTER_PRIVATE_KEY: loadedEnv.effectiveEnv.INTENT_SUBMITTER_PRIVATE_KEY,
  VERIFIER_PRIVATE_KEY: loadedEnv.effectiveEnv.VERIFIER_PRIVATE_KEY,
  GIWA_LIVE_DB_PATH: dbPath
});
const hostedReadiness = buildRedactedHostedEnvReadiness({
  GIWA_LIVE_MODE: liveMode,
  GIWA_LIVE_ALLOWED_ORIGINS: loadedEnv.effectiveEnv.GIWA_LIVE_ALLOWED_ORIGINS,
  GIWA_LIVE_PARTNER_CREDENTIAL_HASHES: loadedEnv.effectiveEnv.GIWA_LIVE_PARTNER_CREDENTIAL_HASHES
});
const mockMode = loadedEnv.effectiveEnv.GIWA_LIVE_MOCK_MODE === "1";
const allowedOrigins = (loadedEnv.effectiveEnv.GIWA_LIVE_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0);
const credentialHashes = (loadedEnv.effectiveEnv.GIWA_LIVE_PARTNER_CREDENTIAL_HASHES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0);
const partnerTenantId = loadedEnv.effectiveEnv.GIWA_LIVE_PARTNER_TENANT_ID ?? "tenant_default";
const credentials = credentialHashes.map((tokenHash, index) => ({
  id: `partner-${index + 1}`,
  tenantId: partnerTenantId,
  scopes: ["runs:read", "runs:write", "receipts:read", "verify:write", "partner:read"],
  tokenHash
}));
const hostedPolicy = evaluateHostedModePolicy({
  mode: liveMode,
  mockMode,
  host,
  authReady: liveMode === "local" || credentials.length > 0,
  tenantReady: true,
  rateLimitReady: true,
  requestSafetyReady: true,
  repositoryReady: true,
  telemetryReady: true
});

console.log(
  JSON.stringify(
    {
      liveEnvReadiness: readiness,
      liveHostedReadiness: hostedReadiness,
      loadedEnvFiles: loadedEnv.loadedEnvFiles,
      liveMode,
      liveMockMode: mockMode,
      hostedPolicy
    },
    null,
    2
  )
);

if (!hostedPolicy.ok) {
  process.exitCode = 1;
  console.error(`Hosted mode policy failed: ${hostedPolicy.reason}`);
  process.exit();
}

if (!readiness.ok && !mockMode) {
  process.exitCode = 1;
  console.error("Live env readiness failed. Set GIWA_LIVE_MOCK_MODE=1 only for local API contract mode.");
  process.exit();
}

const serverEnv = mockMode ? null : requireLiveServerEnv({ ...loadedEnv.effectiveEnv, GIWA_LIVE_DB_PATH: dbPath });
const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
const campaignSignerAccount = serverEnv === null ? null : privateKeyToAccount(serverEnv.campaignSignerPrivateKey);
const manifestIssuer =
  serverEnv === null
    ? null
    : createLiveManifestIssuer({
        campaignSignerAccount,
        deployment,
        nowSeconds: () => Math.floor(Date.now() / 1000),
        nonceSource: () => `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
      });

const store = createSqliteLiveStore(dbPath);
const verificationJobs = createMemoryVerificationJobQueue({ now: () => new Date().toISOString() });
const rateLimiter = createMemoryLiveRateLimiter({ nowMs: () => Date.now() });
const receiptClient =
  serverEnv === null
    ? null
    : createStandardRpcReceiptClient({
        chainId: 91342,
        rpcUrl: serverEnv.standardRpcUrl
      });
const api = createLiveApiHandler({
  store,
  mode: liveMode,
  baseUrl: `http://${host}:${port}`,
  verificationJobs,
  now: () => new Date().toISOString(),
  issueManifest: async (input) => {
    if (manifestIssuer !== null) {
      const issued = await manifestIssuer.issue(input);
      return {
        runId: issued.intentHash,
        nonce: issued.manifest.nonce,
        intentHash: issued.intentHash,
        manifestJson: issued.manifestJson,
        manifestSignature: issued.manifestSignature,
        expiryUnix: issued.manifest.expiryUnix,
        preview: issued.preview
      };
    }

    const issuedAt = Date.now();
    return {
      runId: `live-${issuedAt.toString(36)}`,
      nonce: `nonce-${issuedAt.toString(36)}`,
      intentHash: `intent-${issuedAt.toString(36)}`,
      manifestJson: JSON.stringify(input),
      manifestSignature: "signature-not-issued-in-sprint-8",
      expiryUnix: Math.floor(issuedAt / 1000) + 3600,
      preview: null
    };
  },
  verifyRun:
    receiptClient === null
      ? undefined
      : ({ run, submittedTx }) =>
          verifyLiveRun({
            run,
            submittedTx,
            receiptClient,
            nowSeconds: () => Math.floor(Date.now() / 1000),
            verifierVersion: "live-sprint-14",
            trustPolicy: {
              chainId: 91342,
              officialCampaignSigner: campaignSignerAccount.address,
              intentRailAddress: deployment.intentRailAddress,
              mockTokenAddress: deployment.mockTokenAddress,
              mockVaultAddress: deployment.mockVaultAddress,
              minConfirmations: 3,
              amountPolicy: "exact",
              allowancePolicy: "exact"
            }
          })
});

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function requestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function rateLimitInputs(auth, request, url) {
  const source = request.socket.remoteAddress ?? "unknown";
  const inputs = [
    {
      bucket: liveRateLimitBucket({ kind: "ip", value: source, tenantId: auth?.tenantId }),
      limit: 300,
      windowMs: 60_000
    }
  ];
  if (auth !== null) {
    inputs.push({
      bucket: liveRateLimitBucket({ kind: "credential", value: auth.actorId, tenantId: auth.tenantId }),
      limit: 180,
      windowMs: 60_000
    });
  }
  if (url.pathname.endsWith("/verify")) {
    inputs.push({
      bucket: liveRateLimitBucket({ kind: "verify", value: url.pathname, tenantId: auth?.tenantId }),
      limit: 2,
      windowMs: 60_000
    });
  }
  return inputs;
}

function publicPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested =
    decoded === "/live"
      ? "/live.html"
      : decoded === "/demo"
        ? "/demo.html"
      : decoded === "/" || decoded === "/partner" || decoded.startsWith("/receipt/")
        ? "/index.html"
        : decoded;
  const normalized = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(publicDir, normalized);
}

async function readBody(request) {
  const maxBytes = 64 * 1024;
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      const error = new Error("request_body_too_large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("malformed_json");
    error.statusCode = 400;
    throw error;
  }
}

const server = createServer(async (request, response) => {
  const startedAt = Date.now();
  const id = requestId();
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/healthz") {
    sendJson(response, 200, buildLiveHealthBody());
    return;
  }

  if (request.method === "GET" && url.pathname === "/readyz") {
    const body = buildLiveReadinessBody({
      mode: liveMode,
      envReady: readiness.ok || mockMode,
      authReady: liveMode === "local" || credentials.length > 0,
      tenantReady: true,
      repositoryReady: true,
      rateLimitReady: true,
      requestSafetyReady: true,
      telemetryReady: true,
      missingKeys: [...readiness.missing, ...hostedReadiness.missing],
      invalidKeys: [...readiness.invalid, ...hostedReadiness.invalid]
    });
    sendJson(response, body.ready ? 200 : 503, body);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    const safety = evaluateLiveRequestSafety({
      method: request.method ?? "GET",
      pathname: url.pathname,
      origin: typeof request.headers.origin === "string" ? request.headers.origin : undefined,
      allowedOrigins: liveMode === "local" ? [] : allowedOrigins,
      contentType: typeof request.headers["content-type"] === "string" ? request.headers["content-type"] : undefined
    });
    if (!safety.ok) {
      sendJson(response, safety.status, { error: safety.code, requestId: id });
      return;
    }

    let parsedBody;
    try {
      parsedBody = request.method === "POST" ? await readBody(request) : undefined;
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 400;
      const message = error instanceof Error ? error.message : "malformed_json";
      sendJson(response, status, {
        error: message === "request_body_too_large" ? "request_body_too_large" : "malformed_json",
        requestId: id
      });
      return;
    }
    const authResult =
      liveMode === "local"
        ? { ok: true, context: null }
        : authenticateLiveRequest({ headers: request.headers, credentials });
    if (!authResult.ok) {
      sendJson(response, authResult.status, { error: authResult.code, requestId: id });
      return;
    }
    const auth = authResult.context;
    for (const input of rateLimitInputs(auth, request, url)) {
      const decision = rateLimiter.consume(input);
      if (!decision.allowed) {
        sendJson(response, 429, { error: decision.code, retryAfterMs: decision.retryAfterMs, requestId: id });
        return;
      }
    }
    const result = await api({
      method: request.method ?? "GET",
      pathname: url.pathname,
      body: parsedBody,
      auth,
      requestId: id
    });
    sendJson(response, result.status, result.body);
    console.log(
      JSON.stringify(
        redactLiveLogEvent({
          event: "live.api.request",
          requestId: id,
          method: request.method,
          pathname: url.pathname,
          status: result.status,
          errorCode: typeof result.body.error === "string" ? result.body.error : null,
          tenantId: auth?.tenantId ?? null,
          durationMs: Date.now() - startedAt
        })
      )
    );
    return;
  }

  const filePath = publicPath(url.pathname);
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`@giwa/web live server: http://${host}:${port}`);
});

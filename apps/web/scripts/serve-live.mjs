import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { isIP } from "node:net";
import { dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { exportFlowData } from "./export-flow-data.mjs";
import { createLiveApiHandler } from "../src/lib/live/liveApi.ts";
import { PUBLIC_CAMPAIGN_EVENT_BODY_MAX_BYTES } from "../src/lib/live/publicCampaignAnalytics.ts";
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
import {
  evaluateStudioAuthConfig,
  applyStudioAuthBootstrap
} from "../src/lib/live/studioAuthConfig.ts";
import { createStudioAuthService } from "../src/lib/live/studioAuthService.ts";
import { createStudioAuthApiHandler } from "../src/lib/live/studioAuthApi.ts";
import { createStudioCampaignApiHandler } from "../src/lib/live/studioCampaignApi.ts";
import {
  createPublicCampaignVersionApiHandler,
  createStudioCampaignVersionApiHandler
} from "../src/lib/live/studioCampaignVersionApi.ts";
import {
  createStudioCampaignService,
  STUDIO_CAMPAIGN_BODY_MAX_BYTES
} from "../src/lib/live/studioCampaignService.ts";
import { createStudioCampaignVersionService } from "../src/lib/live/studioCampaignVersionService.ts";
import {
  LIVE_RATE_LIMIT_POLICY,
  classifyLiveRateLimitRoute,
  createMemoryLiveRateLimiter,
  liveRateLimitBucket,
  parseLivePartnerCredentialHashes,
  selectLiveClientIp
} from "../src/lib/live/liveRateLimit.ts";
import { evaluateLiveRequestSafety } from "../src/lib/live/liveRequestSafety.ts";
import { redactLiveLogEvent } from "../src/lib/live/liveTelemetry.ts";
import { createMemoryVerificationJobQueue } from "../src/lib/live/verificationJobQueue.ts";
import { classifyLiveApiRoute } from "../src/lib/live/liveRoutePolicy.ts";
import { issueLiveRunCapability } from "../src/lib/live/liveParticipantCapability.ts";
import { buildLivePublicConfig } from "../src/lib/live/livePublicConfig.ts";
import { probeLiveChainReadiness } from "../src/lib/live/liveChainReadiness.ts";
import {
  REQUIRED_LIVE_MIGRATIONS as ALL_REQUIRED_LIVE_MIGRATIONS,
  evaluateLiveSchemaState
} from "../src/lib/live/liveSchemaMigrations.ts";
import { createStandardRpcReceiptClient } from "../src/lib/verifier/standardRpcReceiptClient.ts";
import { verifyLiveRun } from "../src/lib/verifier/liveVerifierService.ts";

const publicDir = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const workspaceRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const deploymentPath = fileURLToPath(new URL("../src/generated/deployment.json", import.meta.url));
const port = Number(process.env.PORT ?? 4177);
const liveMode = process.env.GIWA_LIVE_MODE ?? "local";
const host = process.env.HOST ?? "127.0.0.1";
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SHUTDOWN_TIMEOUT_MS = 10_000;
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const STUDIO_PUBLISH_PATH = /^\/api\/studio\/campaigns\/campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/publish$/u;
const STUDIO_VERSION_PATH = /^\/api\/studio\/campaigns\/campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/versions$/u;
const PUBLIC_VERSION_PATH = /^\/api\/public\/campaigns\/campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/versions\/([1-9][0-9]*)$/u;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

export function derivePublicEvidenceDownloadRequested(url) {
  const downloadValues = url.searchParams.getAll("download");
  return downloadValues.length === 1 && downloadValues[0] === "1";
}

export function deriveLocalOrigin(localHost, localPort) {
  const originHost = isIP(localHost) === 6 ? `[${localHost}]` : localHost;
  return `http://${originHost}:${localPort}`;
}

export function isTask4QuerySuffixedRoute(method, pathname, search) {
  if (search.length === 0) return false;
  if (method === "POST" && STUDIO_PUBLISH_PATH.test(pathname)) return true;
  if (method === "GET" && STUDIO_VERSION_PATH.test(pathname)) return true;
  const publicVersion = method === "GET" ? PUBLIC_VERSION_PATH.exec(pathname) : null;
  if (publicVersion?.[1] === undefined) return false;
  const versionNumber = Number(publicVersion[1]);
  return Number.isSafeInteger(versionNumber) && versionNumber > 0;
}

export function writeLiveJsonResponse(
  response,
  status,
  body,
  headers = {},
  onFinished
) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  const payload = body === null ? undefined : JSON.stringify(body);
  if (typeof onFinished === "function") {
    response.end(payload, onFinished);
  } else {
    response.end(payload);
  }
}

export function writeLiveRequestBodyError(
  request,
  response,
  status,
  body
) {
  if (status !== 413) {
    writeLiveJsonResponse(response, status, body);
    return;
  }
  response.shouldKeepAlive = false;
  writeLiveJsonResponse(
    response,
    status,
    body,
    { connection: "close" },
    () => {
      request.destroy();
    }
  );
}

export async function readLiveJsonBody(request, pathname, method = "POST") {
  const maxBytes =
    pathname === "/api/public/events"
      ? PUBLIC_CAMPAIGN_EVENT_BODY_MAX_BYTES
      : (
        (method === "POST" && (pathname === "/api/studio/campaigns" || STUDIO_PUBLISH_PATH.test(pathname))) ||
        (method === "PATCH" && /^\/api\/studio\/campaigns\/(campaign_[0-9a-f-]+|gasok-demo)$/u.test(pathname))
      )
        ? STUDIO_CAMPAIGN_BODY_MAX_BYTES
      : 64 * 1024;
  const declaredLength = request.headers?.["content-length"];
  if (
    typeof declaredLength === "string" &&
    /^\d+$/u.test(declaredLength) &&
    BigInt(declaredLength) > BigInt(maxBytes)
  ) {
    const error = new Error("request_body_too_large");
    error.statusCode = 413;
    throw error;
  }

  return await new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const detach = (removeErrorListener) => {
      request.removeListener("data", onData);
      request.removeListener("end", onEnd);
      request.removeListener("aborted", onAborted);
      if (removeErrorListener) {
        request.removeListener("error", onError);
      }
    };
    const rejectOnce = (error, options = {}) => {
      if (settled) return;
      settled = true;
      if (options.pause === true) request.pause();
      detach(options.keepErrorListener !== true);
      rejectBody(error);
    };
    const resolveOnce = (value) => {
      if (settled) return;
      settled = true;
      detach(true);
      resolveBody(value);
    };
    const bodyError = (message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    };
    function onData(chunk) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += bytes.byteLength;
      if (totalBytes > maxBytes) {
        rejectOnce(bodyError("request_body_too_large", 413), {
          pause: true,
          keepErrorListener: true
        });
        return;
      }
      chunks.push(bytes);
    }
    function onEnd() {
      if (chunks.length === 0) {
        resolveOnce(undefined);
        return;
      }
      try {
        resolveOnce(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        rejectOnce(bodyError("malformed_json", 400));
      }
    }
    function onError(error) {
      rejectOnce(error);
    }
    function onAborted() {
      rejectOnce(bodyError("malformed_json", 400));
    }

    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
    request.once("aborted", onAborted);
  });
}

export function assertHostedLiveSchemaState({ mode, store }) {
  if (mode === "local") return;
  try {
    const schemaState = evaluateLiveSchemaState({
      ...store.getSchemaState(),
      requiredMigrations: ALL_REQUIRED_LIVE_MIGRATIONS
    });
    if (!schemaState.ok) {
      throw new Error(`Hosted live schema state failed: ${schemaState.reason}`);
    }
  } catch (error) {
    try {
      store.close();
    } catch (_closeError) {
      // Preserve the schema failure that made the hosted runtime unusable.
    }
    throw error;
  }
}

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

function isWithinRoot(candidatePath, rootPath) {
  const relativePath = relative(resolve(rootPath), resolve(candidatePath));
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  );
}

function requireExternalHostedDbPath(configuredPath) {
  if (!isAbsolute(configuredPath)) throw new Error("Hosted live DB path must be absolute");
  const dbPath = resolve(configuredPath);
  const immutableRoots = [workspaceRoot, resolve("/opt/giwa/current"), resolve("/opt/giwa/releases")];
  if (immutableRoots.some((rootPath) => isWithinRoot(dbPath, rootPath))) {
    throw new Error("Hosted live DB path must be outside the immutable release tree");
  }
  return dbPath;
}

export function initializeStudioAuthApi({
  store,
  studioAuthReadiness,
  nowIso
}) {
  try {
    if (studioAuthReadiness.enabled) {
      applyStudioAuthBootstrap({
        repository: store.studioAuth,
        config: studioAuthReadiness.config,
        existingTenantIds: [
          ...new Set(store.listRuns().map((run) => run.tenantId ?? "local"))
        ],
        nowIso
      });
      return createStudioAuthApiHandler({
        service: createStudioAuthService({
          repository: store.studioAuth,
          config: studioAuthReadiness.config
        }),
        origin: studioAuthReadiness.config.origin,
        secureCookie: studioAuthReadiness.config.secureCookie
      });
    }
    return async () => ({
      status: 503,
      body: { error: "studio_auth_unavailable" },
      headers: {}
    });
  } catch (error) {
    try {
      store.close();
    } catch (_closeError) {
      // Preserve the initialization failure that made the runtime unusable.
    }
    throw error;
  }
}

export function initializeStudioCampaignApi({
  store,
  studioAuthReadiness,
  rateLimiter
}) {
  try {
    if (studioAuthReadiness.enabled) {
      const service = createStudioCampaignService({
        repository: store.studioCampaigns
      });
      service.bootstrapBaseline(studioAuthReadiness.config.organizationId);
      const studioAuthService = createStudioAuthService({
        repository: store.studioAuth,
        config: studioAuthReadiness.config
      });
      return createStudioCampaignApiHandler({
        service,
        authenticateSession: studioAuthService.authenticateSession,
        origin: studioAuthReadiness.config.origin,
        secureCookie: studioAuthReadiness.config.secureCookie,
        consumeMutation(context) {
          return rateLimiter.consume({
            bucket: liveRateLimitBucket({
              kind: "studio", value: context.sessionId, tenantId: context.tenantId
            }),
            limit: LIVE_RATE_LIMIT_POLICY.studioMutationPerSessionPerMinute,
            windowMs: 60_000
          });
        }
      });
    }
    return async () => ({
      status: 503,
      body: { error: "studio_campaign_unavailable" },
      headers: {}
    });
  } catch (error) {
    try {
      store.close();
    } catch (_closeError) {
      // Preserve the initialization failure that made the runtime unusable.
    }
    throw error;
  }
}

export function initializeStudioCampaignVersionApis({
  store,
  studioAuthReadiness,
  rateLimiter
}) {
  const schemaState = evaluateLiveSchemaState({
    ...store.getSchemaState(),
    requiredMigrations: ALL_REQUIRED_LIVE_MIGRATIONS
  });
  if (!schemaState.ok) {
    return {
      publicApi: async () => ({
        status: 503,
        body: { error: "service_unavailable" },
        headers: { "cache-control": "no-store" }
      }),
      studioApi: async () => ({
        status: 503,
        body: { error: "service_unavailable" },
        headers: {}
      })
    };
  }

  const service = createStudioCampaignVersionService({
    repository: store.studioCampaignVersions
  });
  const publicApi = createPublicCampaignVersionApiHandler({ service });
  if (!studioAuthReadiness.enabled) {
    return {
      publicApi,
      studioApi: async () => ({
        status: 503,
        body: { error: "service_unavailable" },
        headers: {}
      })
    };
  }

  const studioAuthService = createStudioAuthService({
    repository: store.studioAuth,
    config: studioAuthReadiness.config
  });
  return {
    publicApi,
    studioApi: createStudioCampaignVersionApiHandler({
      service,
      authenticateSession: studioAuthService.authenticateSession,
      origin: studioAuthReadiness.config.origin,
      secureCookie: studioAuthReadiness.config.secureCookie,
      consumeMutation(context) {
        return rateLimiter.consume({
          bucket: liveRateLimitBucket({
            kind: "studio", value: context.sessionId, tenantId: context.tenantId
          }),
          limit: LIVE_RATE_LIMIT_POLICY.studioMutationPerSessionPerMinute,
          windowMs: 60_000
        });
      }
    })
  };
}

async function startLiveServer() {
  const loadedEnv =
    liveMode === "local" ? loadLocalEnv(process.env) : { effectiveEnv: { ...process.env }, loadedEnvFiles: [] };
  const localOrigin = deriveLocalOrigin(host, port);
  const studioAuthReadiness = evaluateStudioAuthConfig({
    env: loadedEnv.effectiveEnv,
    mode: liveMode,
    localOrigin
  });
  const readiness = buildRedactedLiveEnvReadiness({
    GIWA_SEPOLIA_RPC_URL: loadedEnv.effectiveEnv.GIWA_SEPOLIA_RPC_URL,
    GIWA_EXPLORER_TX_URL_TEMPLATE: loadedEnv.effectiveEnv.GIWA_EXPLORER_TX_URL_TEMPLATE,
    GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: loadedEnv.effectiveEnv.GIWA_EXPLORER_ADDRESS_URL_TEMPLATE,
    CAMPAIGN_SIGNER_PRIVATE_KEY: loadedEnv.effectiveEnv.CAMPAIGN_SIGNER_PRIVATE_KEY,
    INTENT_SUBMITTER_PRIVATE_KEY: loadedEnv.effectiveEnv.INTENT_SUBMITTER_PRIVATE_KEY,
    VERIFIER_PRIVATE_KEY: loadedEnv.effectiveEnv.VERIFIER_PRIVATE_KEY,
    GIWA_LIVE_DB_PATH: loadedEnv.effectiveEnv.GIWA_LIVE_DB_PATH
  });
  const hostedReadiness = buildRedactedHostedEnvReadiness({
    GIWA_LIVE_MODE: liveMode,
    GIWA_LIVE_ALLOWED_ORIGINS: loadedEnv.effectiveEnv.GIWA_LIVE_ALLOWED_ORIGINS,
    GIWA_LIVE_PARTNER_CREDENTIAL_HASHES: loadedEnv.effectiveEnv.GIWA_LIVE_PARTNER_CREDENTIAL_HASHES,
    GIWA_LIVE_PUBLIC_ORIGIN: loadedEnv.effectiveEnv.GIWA_LIVE_PUBLIC_ORIGIN,
    GIWA_LIVE_MIN_GAS_WEI: loadedEnv.effectiveEnv.GIWA_LIVE_MIN_GAS_WEI,
    GIWA_LIVE_FAUCET_HELP_URL: loadedEnv.effectiveEnv.GIWA_LIVE_FAUCET_HELP_URL,
    GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS:
      loadedEnv.effectiveEnv.GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS
  });
  const mockMode = loadedEnv.effectiveEnv.GIWA_LIVE_MOCK_MODE === "1";
  const allowedOrigins = (loadedEnv.effectiveEnv.GIWA_LIVE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const credentialHashes =
    liveMode === "local"
      ? []
      : parseLivePartnerCredentialHashes(loadedEnv.effectiveEnv.GIWA_LIVE_PARTNER_CREDENTIAL_HASHES);
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
    authReady:
      liveMode === "local" ||
      (credentialHashes.length > 0 && studioAuthReadiness.ok),
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
        studioAuthReadiness: studioAuthReadiness.readiness,
        studioAuthEnabled: studioAuthReadiness.enabled,
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

  if (!readiness.ok && !(liveMode === "local" && mockMode)) {
    process.exitCode = 1;
    console.error("Live env readiness failed. Set GIWA_LIVE_MOCK_MODE=1 only for local API contract mode.");
    process.exit();
  }

  const serverEnv = liveMode === "local" && mockMode ? null : requireLiveServerEnv(loadedEnv.effectiveEnv);
  const dbPath =
    liveMode === "local"
      ? resolve(
          workspaceRoot,
          serverEnv?.dbPath ??
            loadedEnv.effectiveEnv.GIWA_LIVE_DB_PATH ??
            "apps/web/.data/live-mvp-sprint12.sqlite"
        )
      : requireExternalHostedDbPath(serverEnv.dbPath);
  if (process.env.GIWA_SKIP_PUBLIC_EXPORT !== "1") exportFlowData();
  mkdirSync(dirname(dbPath), { recursive: true });
  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  const campaignSignerAccount = serverEnv === null ? null : privateKeyToAccount(serverEnv.campaignSignerPrivateKey);
  const publicBaseUrl =
    liveMode === "local" ? localOrigin : serverEnv?.publicOrigin;
  if (publicBaseUrl === undefined) {
    throw new Error("Validated hosted public origin is unavailable");
  }
  const publicConfig =
    serverEnv?.faucetHelpUrl === undefined || serverEnv.minGasBalanceWei === undefined
      ? undefined
      : buildLivePublicConfig({
          chainId: deployment.chainId,
          txExplorerTemplate: serverEnv.txExplorerTemplate,
          faucetHelpUrl: serverEnv.faucetHelpUrl,
          minGasBalanceWei: serverEnv.minGasBalanceWei,
          deployment
        });
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
  assertHostedLiveSchemaState({ mode: liveMode, store });
  const studioAuthApi = initializeStudioAuthApi({
    store,
    studioAuthReadiness,
    nowIso: new Date().toISOString()
  });
  const retentionMs =
    serverEnv?.incompleteRunRetentionHours === undefined
      ? null
      : serverEnv.incompleteRunRetentionHours * 60 * 60 * 1000;
  let pruneTimer = null;
  function pruneStaleIncompleteRuns() {
    if (retentionMs === null) return;
    try {
      const cutoffIso = new Date(Date.now() - retentionMs).toISOString();
      const removedCount = store.pruneIncompleteRuns(cutoffIso);
      console.log(JSON.stringify({ event: "live.incomplete-runs.pruned", removedCount }));
    } catch (_error) {
      console.error("Incomplete run pruning failed");
    }
  }
  if (retentionMs !== null) {
    pruneStaleIncompleteRuns();
    pruneTimer = setInterval(pruneStaleIncompleteRuns, PRUNE_INTERVAL_MS);
    pruneTimer.unref();
  }
  const verificationJobs = createMemoryVerificationJobQueue({ now: () => new Date().toISOString() });
  const rateLimiter = createMemoryLiveRateLimiter({ nowMs: () => Date.now() });
  const studioCampaignApi = initializeStudioCampaignApi({
    store,
    studioAuthReadiness,
    rateLimiter
  });
  const studioCampaignVersionApis = initializeStudioCampaignVersionApis({
    store,
    studioAuthReadiness,
    rateLimiter
  });
  const receiptClient =
    serverEnv === null
      ? null
      : createStandardRpcReceiptClient({
          chainId: 91342,
          rpcUrl: serverEnv.standardRpcUrl
        });
  const chainProbeClient =
    serverEnv === null
      ? null
      : createPublicClient({
          transport: http(serverEnv.standardRpcUrl)
        });
  const api = createLiveApiHandler({
    store,
    mode: liveMode,
    baseUrl: publicBaseUrl,
    verificationJobs,
    issueRunCapability: issueLiveRunCapability,
    publicConfig,
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
              verifierVersion: "gasok-staging-1",
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

  function requestId() {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function preAuthRateLimitInputs(request, url) {
    const clientIp = selectLiveClientIp({
      socketAddress: request.socket.remoteAddress,
      realIpHeader: request.headers["x-real-ip"],
      isIp: isIP
    });
    const inputs = [
      {
        bucket: liveRateLimitBucket({ kind: "ip", value: clientIp }),
        limit: LIVE_RATE_LIMIT_POLICY.generalPerIpPerMinute,
        windowMs: 60_000
      }
    ];
    const route = classifyLiveRateLimitRoute(request.method ?? "GET", url.pathname);
    if (route?.kind === "auth") {
      inputs.push({
        bucket: liveRateLimitBucket({ kind: "auth", value: clientIp }),
        limit: LIVE_RATE_LIMIT_POLICY.authPerIpPerMinute,
        windowMs: 60_000
      });
    }
    if (route?.kind === "create") {
      inputs.push({
        bucket: liveRateLimitBucket({ kind: "create", value: clientIp }),
        limit: LIVE_RATE_LIMIT_POLICY.createRunPerIpPerMinute,
        windowMs: 60_000
      });
    }
    if (route?.kind === "verify") {
      inputs.push({
        bucket: liveRateLimitBucket({ kind: "verify", value: route.runId }),
        limit: LIVE_RATE_LIMIT_POLICY.verifyPerRunPerMinute,
        windowMs: 60_000
      });
    }
    return inputs;
  }

  function partnerRateLimitInput(auth) {
    return {
      bucket: liveRateLimitBucket({ kind: "credential", value: auth.actorId, tenantId: auth.tenantId }),
      limit: LIVE_RATE_LIMIT_POLICY.partnerPerCredentialPerMinute,
      windowMs: 60_000
    };
  }

  function consumeRateLimits(inputs, response, id) {
    for (const input of inputs) {
      const decision = rateLimiter.consume(input);
      if (!decision.allowed) {
        writeLiveJsonResponse(response, 429, { error: decision.code, retryAfterMs: decision.retryAfterMs, requestId: id });
        return false;
      }
    }
    return true;
  }

  function readRunCapabilityHeader(value) {
    if (Array.isArray(value) || typeof value !== "string") return null;
    const trimmed = value.trim();
    return CAPABILITY_PATTERN.test(trimmed) ? trimmed : null;
  }

function publicPath(pathname, search = "") {
  const decoded = decodeURIComponent(pathname);
  const CAMPAIGN_VERSION_PUBLIC_PATH = /^\/campaign\/campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/v\/[1-9][0-9]*$/u;
  const requested =
    decoded === "/"
      ? "/landing.html"
        : CAMPAIGN_VERSION_PUBLIC_PATH.test(decoded) && search === ""
          ? "/campaign.html"
          : decoded === "/live"
          ? "/live.html"
          : decoded === "/giwa-demo"
            ? "/giwa-demo.html"
            : decoded === "/demo"
              ? "/demo.html"
              : decoded === "/studio"
                ? "/studio.html"
                : decoded === "/user" ||
                  decoded === "/user/receipts" ||
                  decoded === "/user/help" ||
                  decoded.startsWith("/user/receipt/")
                  ? "/user.html"
                  : decoded === "/evidence" ||
                      decoded === "/partner" ||
                      decoded.startsWith("/receipt/")
                    ? "/index.html"
                    : decoded;
    const normalized = normalize(requested).replace(/^(\.\.[/\\])+/, "");
    return join(publicDir, normalized);
  }

  const server = createServer(async (request, response) => {
    const startedAt = Date.now();
    const id = requestId();
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      writeLiveJsonResponse(response, 200, buildLiveHealthBody());
      return;
    }

    if (request.method === "GET" && url.pathname === "/readyz") {
      const chainReadiness =
        chainProbeClient === null
          ? null
          : await probeLiveChainReadiness({
              client: chainProbeClient,
              expectedChainId: 91342,
              contracts: {
                mockToken: deployment.mockTokenAddress,
                mockVault: deployment.mockVaultAddress,
                intentRail: deployment.intentRailAddress
              }
            });
      const schemaState = evaluateLiveSchemaState({
        ...store.getSchemaState(),
        requiredMigrations: ALL_REQUIRED_LIVE_MIGRATIONS
      });
      const originReady =
        liveMode === "local" ||
        (serverEnv?.publicOrigin !== undefined &&
          allowedOrigins.filter((origin) => origin === serverEnv.publicOrigin).length === 1);
      const body = buildLiveReadinessBody({
        mode: liveMode,
        envReady: (readiness.ok || (liveMode === "local" && mockMode)) && hostedReadiness.ok,
        authReady:
          liveMode === "local" ||
          (credentialHashes.length > 0 && studioAuthReadiness.ok),
        tenantReady: partnerTenantId.trim().length > 0,
        repositoryReady: schemaState.ok,
        rateLimitReady: true,
        requestSafetyReady: true,
        telemetryReady: true,
        storageReady: store.checkWritable(),
        chainReady: chainReadiness?.ok === true,
        signerReady: campaignSignerAccount !== null && manifestIssuer !== null,
        originReady: originReady,
        verifierReady: receiptClient !== null,
        schemaReady: schemaState.ok,
        missingKeys: [
          ...readiness.missing,
          ...hostedReadiness.missing,
          ...studioAuthReadiness.missing
        ],
        invalidKeys: [
          ...readiness.invalid,
          ...hostedReadiness.invalid,
          ...studioAuthReadiness.invalid
        ]
      });
      writeLiveJsonResponse(response, body.ready ? 200 : 503, body);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      if (isTask4QuerySuffixedRoute(request.method ?? "GET", url.pathname, url.search)) {
        writeLiveJsonResponse(response, 404, { error: "not_found" });
        return;
      }
      const routeClass = classifyLiveApiRoute(request.method ?? "GET", url.pathname);
      if (!consumeRateLimits(preAuthRateLimitInputs(request, url), response, id)) return;
      const safety = evaluateLiveRequestSafety({
        method: request.method ?? "GET",
        pathname: url.pathname,
        origin: typeof request.headers.origin === "string" ? request.headers.origin : undefined,
        allowedOrigins: liveMode === "local" ? [] : allowedOrigins,
        contentType: typeof request.headers["content-type"] === "string" ? request.headers["content-type"] : undefined
      });
      if (!safety.ok) {
        writeLiveJsonResponse(response, safety.status, { error: safety.code, requestId: id });
        return;
      }

      let parsedBody;
      try {
        parsedBody =
          request.method === "POST" || request.method === "PATCH"
            ? await readLiveJsonBody(request, url.pathname, request.method)
            : undefined;
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 400;
        const message = error instanceof Error ? error.message : "malformed_json";
        const body = {
          error: message === "request_body_too_large" ? "request_body_too_large" : "malformed_json",
          requestId: id
        };
        if (message === "request_body_too_large") {
          writeLiveRequestBodyError(request, response, status, body);
        } else {
          writeLiveJsonResponse(response, status, body);
        }
        return;
      }

      if (routeClass === "auth") {
        const result = await studioAuthApi({
          method: request.method ?? "GET",
          pathname: url.pathname,
          origin:
            typeof request.headers.origin === "string"
              ? request.headers.origin
              : undefined,
          cookie:
            typeof request.headers.cookie === "string"
              ? request.headers.cookie
              : undefined,
          body: parsedBody,
          requestId: id
        });
        writeLiveJsonResponse(response, result.status, result.body, result.headers);
        console.log(
          JSON.stringify(
            redactLiveLogEvent({
              event: "live.api.request",
              requestId: id,
              method: request.method,
              pathname: url.pathname,
              status: result.status,
              errorCode:
                typeof result.body?.error === "string"
                  ? result.body.error
                  : null,
              tenantId: null,
              durationMs: Date.now() - startedAt
            })
          )
        );
        return;
      }

      if (routeClass === "studio") {
        const handler = STUDIO_VERSION_PATH.test(url.pathname) || STUDIO_PUBLISH_PATH.test(url.pathname)
          ? studioCampaignVersionApis.studioApi
          : studioCampaignApi;
        const result = await handler({
          method: request.method ?? "GET",
          pathname: url.pathname,
          origin:
            typeof request.headers.origin === "string"
              ? request.headers.origin
              : undefined,
          cookie:
            typeof request.headers.cookie === "string"
              ? request.headers.cookie
              : undefined,
          body: parsedBody,
          requestId: id
        });
        writeLiveJsonResponse(response, result.status, result.body, result.headers);
        console.log(
          JSON.stringify(
            redactLiveLogEvent({
              event: "live.api.request",
              requestId: id,
              method: request.method,
              pathname: url.pathname,
              status: result.status,
              errorCode:
                typeof result.body?.error === "string"
                  ? result.body.error
                  : null,
              tenantId: null,
              durationMs: Date.now() - startedAt
            })
          )
        );
        return;
      }

      if (routeClass === "campaign-version-public") {
        const result = await studioCampaignVersionApis.publicApi({
          method: request.method ?? "GET",
          pathname: url.pathname,
          requestId: id
        });
        writeLiveJsonResponse(response, result.status, result.body, result.headers);
        console.log(
          JSON.stringify(
            redactLiveLogEvent({
              event: "live.api.request",
              requestId: id,
              method: request.method,
              pathname: url.pathname,
              status: result.status,
              errorCode: typeof result.body?.error === "string" ? result.body.error : null,
              tenantId: null,
              durationMs: Date.now() - startedAt
            })
          )
        );
        return;
      }

      let auth = null;
      if (routeClass === "partner" && liveMode !== "local") {
        const authResult = authenticateLiveRequest({ headers: request.headers, credentials });
        if (!authResult.ok) {
          writeLiveJsonResponse(response, authResult.status, { error: authResult.code, requestId: id });
          return;
        }
        auth = authResult.context;
        if (!consumeRateLimits([partnerRateLimitInput(auth)], response, id)) return;
      }
      const result = await api({
        method: request.method ?? "GET",
        pathname: url.pathname,
        body: parsedBody,
        auth,
        runCapability: readRunCapabilityHeader(request.headers["x-giwa-run-capability"]),
        requestId: id,
        downloadRequested:
          derivePublicEvidenceDownloadRequested(url)
      });
      writeLiveJsonResponse(response, result.status, result.body, result.headers);
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

    const filePath = publicPath(url.pathname, url.search);
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

  let shutdownStarted = false;
  let storeClosed = false;
  function shutdown() {
    if (shutdownStarted) return;
    shutdownStarted = true;
    if (pruneTimer !== null) {
      clearInterval(pruneTimer);
      pruneTimer = null;
    }

    const fallbackTimer = setTimeout(forceShutdown, SHUTDOWN_TIMEOUT_MS);
    fallbackTimer.unref();
    server.close(() => {
      clearTimeout(fallbackTimer);
      process.exit(closeStoreOnce() ? 0 : 1);
    });

    function closeStoreOnce() {
      if (storeClosed) return process.exitCode !== 1;
      storeClosed = true;
      try {
        store.close();
        return true;
      } catch (_error) {
        process.exitCode = 1;
        console.error("Live store close failed");
        return false;
      }
    }

    function forceShutdown() {
      server.closeAllConnections();
      closeStoreOnce();
      process.exit(1);
    }
  }

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  server.listen(port, host, () => {
    console.log(`@giwa/web live server: http://${host}:${port}`);
  });
}

const invokedPath =
  process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  startLiveServer().catch((_error) => {
    process.exitCode = 1;
    console.error("Live server startup failed");
  });
}

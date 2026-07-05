import type { LiveStore } from "./liveStore.ts";
import type { HostedRuntimeMode } from "./hostedMode.ts";
import { hasLiveAuthScope, type LiveAuthContext } from "./liveAuth.ts";
import { rejectBodyTenantOverride } from "./liveTenantPolicy.ts";
import type {
  DecisionRecord,
  LiveRunRecord,
  PartnerRunProjection,
  ReceiptRecord,
  SubmittedTxRecord,
  VerifierInputRecord
} from "./liveTypes.ts";
import { DEFAULT_LIVE_TENANT_ID } from "./liveTypes.ts";
import type { LiveManifestPreview } from "./liveManifestIssuer.ts";
import type { VerificationJobQueue } from "./verificationJobQueue.ts";
import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";
import { toLiveApiErrorBody } from "./liveApiErrors.ts";
import { failureCodeDisplayCopy, toBoundedFailureCode, toSafeFailureReason } from "../verifier/liveFailureCode.ts";
import { buildLiveDemoControlRoom, selectLatestRun } from "./liveDemoControlRoom.ts";

const GIWA_SEPOLIA_CHAIN_ID = 91342;

export type LiveApiRequest = {
  method: string;
  pathname: string;
  body?: unknown;
  auth?: LiveAuthContext | null;
  requestId?: string;
};

export type LiveApiResponse = {
  status: number;
  body: Record<string, unknown>;
};

export type ManifestIssueInput = {
  wallet: string;
  campaignId: string;
  missionId: string;
  referralCode: string | null;
};

export type ManifestIssueResult = {
  runId: string;
  nonce: string;
  intentHash: string;
  manifestJson: string;
  manifestSignature: string;
  expiryUnix: number;
  preview?: LiveManifestPreview | null;
};

export type LiveApiDependencies = {
  store: LiveStore;
  mode?: HostedRuntimeMode;
  baseUrl?: string;
  verificationJobs?: VerificationJobQueue;
  now: () => string;
  issueManifest: (input: ManifestIssueInput) => Promise<ManifestIssueResult>;
  verifyRun?: (input: { run: LiveRunRecord; submittedTx: SubmittedTxRecord }) => Promise<{
    decision: "matched" | "mismatched" | "failed" | "timeout";
    failureReason: string | null;
    verifierInputHash: string;
    receiptHash: string | null;
    decisionTxHash: string | null;
    standardRpcReceiptStatus: 1 | 0;
    depositBlockNumber: number;
    depositBlockHash: string;
    confirmationDepth: number;
    receipt?: ReceiptRecord;
    verifierInputRecord?: VerifierInputRecord;
  }>;
};

function errorBody(error: string, requestId: string | undefined): Record<string, unknown> {
  return requestId === undefined ? { error } : { error, requestId };
}

function requestTenant(request: LiveApiRequest): string {
  return request.auth?.tenantId ?? DEFAULT_LIVE_TENANT_ID;
}

function hostedAuthFailure(deps: LiveApiDependencies, request: LiveApiRequest): LiveApiResponse | null {
  const mode = deps.mode ?? "local";
  if (mode !== "local" && request.pathname.startsWith("/api/") && request.auth == null) {
    return { status: 401, body: errorBody("unauthorized", request.requestId) };
  }
  return null;
}

function scopeAllowed(deps: LiveApiDependencies, request: LiveApiRequest, scope: Parameters<typeof hasLiveAuthScope>[1]): boolean {
  if ((deps.mode ?? "local") === "local") return true;
  return request.auth !== null && request.auth !== undefined && hasLiveAuthScope(request.auth, scope);
}

function forbidden(request: LiveApiRequest): LiveApiResponse {
  return { status: 403, body: errorBody("forbidden", request.requestId) };
}

function objectBody(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be an object");
  }

  return value as Record<string, unknown>;
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function optionalString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value.trim();
}

function requiredBoundedString(body: Record<string, unknown>, key: string, maxLength: number): string {
  const value = requiredString(body, key);
  if (value.length > maxLength) throw new Error(`${key} is too long`);
  if (/[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${key} contains unsupported characters`);
  return value;
}

function optionalBoundedString(body: Record<string, unknown>, key: string, maxLength: number): string | null {
  const value = optionalString(body, key);
  if (value === null || value.length === 0) return null;
  if (value.length > maxLength) throw new Error(`${key} is too long`);
  if (/[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${key} contains unsupported characters`);
  return value;
}

function optionalNumber(body: Record<string, unknown>, key: string): number | null {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${key} must be an integer`);
  return value;
}

function requiredAddress(body: Record<string, unknown>, key: string): string {
  const value = requiredString(body, key).toLowerCase();
  if (!/^0x[a-f0-9]{40}$/u.test(value)) {
    throw new Error(`${key} must be a valid address`);
  }
  return value;
}

function requiredTxHash(body: Record<string, unknown>, key: string): string {
  const value = requiredString(body, key).toLowerCase();
  if (!/^0x[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${key} must be bytes32`);
  }
  return value;
}

function optionalTxHash(body: Record<string, unknown>, key: string): string | null {
  const value = optionalString(body, key)?.toLowerCase() ?? null;
  if (value === null) return null;
  if (!/^0x[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${key} must be bytes32`);
  }
  return value;
}

function nowUnix(nowIso: string): number {
  return Math.floor(new Date(nowIso).getTime() / 1000);
}

function runResponse(
  run: LiveRunRecord,
  issued?: ManifestIssueResult,
  state?: {
    submittedTx?: SubmittedTxRecord | undefined;
    decision?: DecisionRecord | undefined;
    verificationJob?: ReturnType<LiveStore["getVerificationJobForRun"]> | undefined;
  }
): Record<string, unknown> {
  const manifestPreview = issued?.preview ?? null;
  const transactionReady = run.status === "manifestIssued" && manifestPreview !== null;
  const safeFailureReason = toSafeFailureReason(state?.decision?.failureReason ?? null);
  const verification =
    state?.verificationJob === undefined
      ? undefined
      : {
          status:
            state.verificationJob.status === "pending" || state.verificationJob.status === "leased"
              ? "queued"
              : state.verificationJob.status,
          pollPath: `/api/runs/${run.runId}`,
          jobId: state.verificationJob.jobId
        };

  return {
    runId: run.runId,
    wallet: run.wallet,
    campaignId: run.campaignId,
    missionId: run.missionId,
    status: run.status,
    nonce: run.nonce,
    intentHash: run.intentHash,
    manifestJson: run.manifestJson,
    manifestSignature: run.manifestSignature,
    expiryUnix: run.expiryUnix,
    manifestPreview,
    approveAction: {
      enabled: transactionReady,
      reason: transactionReady ? null : "manifest_preview_required",
      capability: transactionReady ? "ready" : "manifest_preview_required"
    },
    depositAction: {
      enabled: transactionReady,
      reason: transactionReady ? null : "manifest_preview_required",
      capability: transactionReady ? "ready" : "manifest_preview_required"
    },
    approveTxHash: state?.submittedTx?.approveTxHash ?? null,
    depositTxHash: state?.submittedTx?.depositTxHash ?? null,
    decision: state?.decision?.decision ?? null,
    failureReason: safeFailureReason,
    verifierInputHash: state?.decision?.verifierInputHash ?? null,
    receiptReady: state?.decision?.decision === "matched" && state.decision.receiptHash !== null,
    receiptHash: state?.decision?.receiptHash ?? null,
    decisionTxHash: state?.decision?.decisionTxHash ?? null,
    verification,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt
  };
}

function partnerRunProjection(run: LiveRunRecord, receiptHash: string | null): PartnerRunProjection {
  return {
    runId: run.runId,
    wallet: run.wallet,
    campaignId: run.campaignId,
    missionId: run.missionId,
    status: run.status,
    intentHash: run.intentHash,
    receiptHash,
    updatedAt: run.updatedAt
  };
}

function runIdFrom(pathname: string, suffix = ""): string | undefined {
  const prefix = "/api/runs/";
  if (!pathname.startsWith(prefix)) return undefined;
  const value = pathname.slice(prefix.length);
  if (suffix.length > 0 && value.endsWith(suffix)) return value.slice(0, -suffix.length);
  if (suffix.length === 0) return value.includes("/") ? undefined : value;
  return undefined;
}

export function createLiveApiHandler(deps: LiveApiDependencies): (request: LiveApiRequest) => Promise<LiveApiResponse> {
  return async function handle(request): Promise<LiveApiResponse> {
    try {
      const authFailure = hostedAuthFailure(deps, request);
      if (authFailure !== null) return authFailure;

      if (request.method === "POST" && request.pathname === "/api/runs") {
        if (!scopeAllowed(deps, request, "runs:write")) return forbidden(request);
        const body = objectBody(request.body);
        const tenantPolicy = rejectBodyTenantOverride(body);
        if (!tenantPolicy.ok) return { status: 400, body: errorBody(tenantPolicy.code, request.requestId) };
        const input: ManifestIssueInput = {
          wallet: requiredAddress(body, "wallet"),
          campaignId: requiredBoundedString(body, "campaignId", 96),
          missionId: requiredBoundedString(body, "missionId", 96),
          referralCode: optionalBoundedString(body, "referralCode", 96)
        };
        const chainId = optionalNumber(body, "chainId");
        if (chainId !== null && chainId !== GIWA_SEPOLIA_CHAIN_ID) {
          return {
            status: 409,
            body: { error: "wrong_chain", expectedChainId: GIWA_SEPOLIA_CHAIN_ID, receivedChainId: chainId }
          };
        }
        const issued = await deps.issueManifest(input);
        const timestamp = deps.now();
        const tenantId = requestTenant(request);
        const run = deps.store.createRun({
          runId: issued.runId,
          tenantId,
          idempotencyKey: [tenantId, input.wallet, input.campaignId, input.missionId, input.referralCode ?? ""].join(
            ":"
          ),
          wallet: input.wallet,
          campaignId: input.campaignId,
          missionId: input.missionId,
          referralCode: input.referralCode,
          nonce: issued.nonce,
          intentHash: issued.intentHash,
          manifestJson: issued.manifestJson,
          manifestSignature: issued.manifestSignature,
          status: "manifestIssued",
          expiryUnix: issued.expiryUnix,
          createdAt: timestamp,
          updatedAt: timestamp
        });

        return { status: 201, body: runResponse(run, issued) };
      }

      const getRunId = request.method === "GET" ? runIdFrom(request.pathname) : undefined;
      if (getRunId !== undefined) {
        if (!scopeAllowed(deps, request, "runs:read")) return forbidden(request);
        const run =
          (deps.mode ?? "local") === "local"
            ? deps.store.getRun(getRunId)
            : deps.store.getRunForTenant(requestTenant(request), getRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        return {
          status: 200,
          body: runResponse(run, undefined, {
            submittedTx: deps.store.getSubmittedTx(run.runId),
            decision: deps.store.getDecisionByIntentHash(run.intentHash),
            verificationJob: deps.store.getVerificationJobForRun(run.runId)
          })
        };
      }

      const evidenceRunId = request.method === "POST" ? runIdFrom(request.pathname, "/evidence") : undefined;
      if (evidenceRunId !== undefined) {
        if (!scopeAllowed(deps, request, "runs:write")) return forbidden(request);
        const run =
          (deps.mode ?? "local") === "local"
            ? deps.store.getRun(evidenceRunId)
            : deps.store.getRunForTenant(requestTenant(request), evidenceRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        const timestamp = deps.now();
        if (run.status === "manifestInvalidated") {
          return { status: 409, body: { error: "manifest_invalidated" } };
        }
        if (nowUnix(timestamp) > run.expiryUnix) {
          return { status: 409, body: { error: "manifest_expired" } };
        }
        const body = objectBody(request.body);
        const depositTxHash = requiredTxHash(body, "depositTxHash");
        const approveTxHash = optionalTxHash(body, "approveTxHash");
        let submitted: ReturnType<LiveStore["saveSubmittedTx"]>;
        try {
          submitted = deps.store.saveSubmittedTx({
            runId: evidenceRunId,
            approveTxHash,
            depositTxHash,
            submittedAt: timestamp
          });
        } catch (error) {
          if (error instanceof Error && error.message === "depositTxHash already belongs to another run") {
            return { status: 409, body: { error: "deposit_tx_hash_already_used" } };
          }
          throw error;
        }
        const updated = deps.store.updateRunStatus(evidenceRunId, "depositSubmitted", deps.now());
        return {
          status: 200,
          body: {
            ...submitted,
            status: updated.status,
            receiptReady: false,
            receiptHash: null,
            verification: { status: "not_started", reason: "deposit_evidence_stored" }
          }
        };
      }

      const invalidateRunId = request.method === "POST" ? runIdFrom(request.pathname, "/invalidate") : undefined;
      if (invalidateRunId !== undefined) {
        if (!scopeAllowed(deps, request, "runs:write")) return forbidden(request);
        const run =
          (deps.mode ?? "local") === "local"
            ? deps.store.getRun(invalidateRunId)
            : deps.store.getRunForTenant(requestTenant(request), invalidateRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        const updated = deps.store.updateRunStatus(invalidateRunId, "manifestInvalidated", deps.now());
        return { status: 200, body: { ...runResponse(updated), invalidationAccepted: true } };
      }

      const intentRelayRunId = request.method === "POST" ? runIdFrom(request.pathname, "/intent-submit") : undefined;
      if (intentRelayRunId !== undefined) {
        return {
          status: 409,
          body: {
            error: "chain_action_unavailable",
            runId: intentRelayRunId,
            reason: "server_wallet_actions_are_disabled"
          }
        };
      }

      const verifyRunId = request.method === "POST" ? runIdFrom(request.pathname, "/verify") : undefined;
      if (verifyRunId !== undefined) {
        if (!scopeAllowed(deps, request, "verify:write")) return forbidden(request);
        if (deps.verifyRun === undefined) {
          return {
            status: 409,
            body: { error: "verifier_unavailable", runId: verifyRunId, reason: "local_verifier_not_configured" }
          };
        }
        const run =
          (deps.mode ?? "local") === "local"
            ? deps.store.getRun(verifyRunId)
            : deps.store.getRunForTenant(requestTenant(request), verifyRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        const submittedTx = deps.store.getSubmittedTx(verifyRunId);
        if (submittedTx === undefined) return { status: 409, body: { error: "deposit_evidence_required" } };

        const existingDecision = deps.store.getDecisionByIntentHash(run.intentHash);
        if (existingDecision !== undefined) {
          const failureCode = toBoundedFailureCode(existingDecision.failureReason);
          const safeFailureReason = toSafeFailureReason(existingDecision.failureReason);
          const failureCopy = failureCode === null ? null : failureCodeDisplayCopy(failureCode);
          return {
            status: 200,
            body: {
              ...runResponse(run),
              decision: existingDecision.decision,
              failureReason: safeFailureReason,
              failureCode,
              failureCopy,
              verifierInputHash: existingDecision.verifierInputHash,
              receiptReady: existingDecision.decision === "matched" && existingDecision.receiptHash !== null,
              receiptHash: existingDecision.receiptHash,
              decisionTxHash: existingDecision.decisionTxHash,
              verification: { status: "terminal" }
            }
          };
        }

        if ((deps.mode ?? "local") !== "local" && deps.verificationJobs !== undefined) {
          const job = deps.verificationJobs.enqueue({
            tenantId: requestTenant(request),
            runId: verifyRunId,
            reason: "manual_verify"
          });
          deps.store.enqueueVerificationJob({
            tenantId: requestTenant(request),
            runId: verifyRunId,
            reason: "manual_verify",
            createdAt: deps.now()
          });
          return {
            status: 202,
            body: {
              ...runResponse(run),
              verification: {
                status: "queued",
                jobId: job.jobId,
                pollPath: `/api/runs/${verifyRunId}`
              }
            }
          };
        }

        deps.store.updateRunStatus(verifyRunId, "verifierChecking", deps.now());
        const result = await deps.verifyRun({ run, submittedTx });
        const failureCode = toBoundedFailureCode(result.failureReason);
        const safeFailureReason = toSafeFailureReason(result.failureReason);
        const failureCopy = failureCode === null ? null : failureCodeDisplayCopy(failureCode);
        if (result.decision === "timeout") {
          const updated = deps.store.updateRunStatus(verifyRunId, "timeout", deps.now());
          return {
            status: 200,
            body: {
              ...runResponse(updated),
              decision: result.decision,
              failureReason: safeFailureReason,
              failureCode,
              failureCopy,
              verifierInputHash: result.verifierInputHash,
              receiptReady: false,
              receiptHash: null,
              decisionTxHash: null,
              standardRpcReceiptStatus: result.standardRpcReceiptStatus,
              depositBlockNumber: result.depositBlockNumber,
              depositBlockHash: result.depositBlockHash,
              confirmationDepth: result.confirmationDepth
            }
          };
        }

        if (result.decision === "matched" && result.receipt === undefined) {
          throw new Error("matched verifier result must include receipt");
        }
        if (result.verifierInputRecord !== undefined) deps.store.saveVerifierInput(result.verifierInputRecord);
        if (result.receipt !== undefined) deps.store.saveReceipt(result.receipt);
        const decision = deps.store.saveDecision({
          intentHash: run.intentHash,
          depositTxHash: submittedTx.depositTxHash,
          decision: result.decision,
          failureReason: safeFailureReason,
          verifierInputHash: result.verifierInputHash,
          receiptHash: result.receiptHash,
          decisionTxHash: result.decisionTxHash,
          issuedAt: nowUnix(deps.now())
        });
        const updated = deps.store.updateRunStatus(verifyRunId, decision.decision, deps.now());
        return {
          status: 200,
          body: {
            ...runResponse(updated),
            decision: decision.decision,
            failureReason: decision.failureReason,
            failureCode,
            failureCopy,
            verifierInputHash: decision.verifierInputHash,
            receiptReady: decision.decision === "matched" && decision.receiptHash !== null,
            receiptHash: decision.receiptHash,
            decisionTxHash: decision.decisionTxHash,
            standardRpcReceiptStatus: result.standardRpcReceiptStatus,
            depositBlockNumber: result.depositBlockNumber,
            depositBlockHash: result.depositBlockHash,
            confirmationDepth: result.confirmationDepth
          }
        };
      }

      if (request.method === "GET" && request.pathname.startsWith("/api/receipts/")) {
        if (!scopeAllowed(deps, request, "receipts:read")) return forbidden(request);
        const receiptHash = request.pathname.slice("/api/receipts/".length);
        const receipt =
          (deps.mode ?? "local") === "local"
            ? deps.store.getReceipt(receiptHash)
            : deps.store.getReceiptForTenant(requestTenant(request), receiptHash);
        if (receipt === undefined) return { status: 404, body: { error: "receipt_not_found" } };
        const decision = deps.store.getDecisionByIntentHash(receipt.intentHash);
        const verifierInput =
          decision === undefined ? undefined : deps.store.getVerifierInput(decision.verifierInputHash);
        const run = deps.store
          .listRuns()
          .find((candidate) => candidate.intentHash.toLowerCase() === receipt.intentHash.toLowerCase());
        const gate = evaluateCommercialReceiptGate({
          run,
          decision,
          receipt,
          verifierInput,
          replay: { requireHashRecomputation: true }
        });
        if (!gate.open) {
          return { status: 404, body: { error: "receipt_not_found" } };
        }
        let payload: unknown;
        try {
          payload = JSON.parse(receipt.payloadJson);
        } catch {
          return { status: 500, body: { error: "receipt_payload_invalid", receiptHash } };
        }
        return {
          status: 200,
          body: {
            source: "live",
            receiptHash: receipt.receiptHash,
            intentHash: receipt.intentHash,
            payload,
            payloadJson: receipt.payloadJson,
            canonicalPayload: receipt.canonicalPayload,
            canonicalPayloadBytesHex: receipt.canonicalPayloadBytesHex
          }
        };
      }

      if (request.method === "GET" && request.pathname === "/api/demo/status") {
        if (!scopeAllowed(deps, request, "partner:read") && !scopeAllowed(deps, request, "runs:read")) {
          return forbidden(request);
        }
        const rows =
          (deps.mode ?? "local") === "local" && request.auth == null
            ? deps.store.listRuns()
            : deps.store.listRunsForTenant(requestTenant(request));
        const latestRun = selectLatestRun(rows);
        const decision = latestRun === null ? undefined : deps.store.getDecisionByIntentHash(latestRun.intentHash);
        const controlRoom = buildLiveDemoControlRoom({
          baseUrl: deps.baseUrl ?? "http://127.0.0.1:4177",
          health: { ok: true },
          readiness: { ready: true, mode: deps.mode ?? "local" },
          latestRun,
          receiptHash: decision?.receiptHash ?? null,
          snapshot: {
            present: false,
            receiptHash: null,
            path: "/live-demo-snapshot.json"
          },
          staticFallback: { available: true }
        });

        return {
          status: 200,
          body: {
            source: "live",
            controlRoom
          }
        };
      }

      if (request.method === "GET" && request.pathname === "/api/partner/runs") {
        if (!scopeAllowed(deps, request, "partner:read") && !scopeAllowed(deps, request, "runs:read")) {
          return forbidden(request);
        }
        const rows =
          (deps.mode ?? "local") === "local" && request.auth == null
            ? deps.store.listRuns().map((run) => runResponse(run))
            : deps.store
                .listRunsForTenant(requestTenant(request))
                .map((run) =>
                  partnerRunProjection(run, deps.store.getDecisionByIntentHash(run.intentHash)?.receiptHash ?? null)
                );
        return {
          status: 200,
          body: {
            source: "live",
            rows
          }
        };
      }

      return { status: 404, body: { error: "not_found" } };
    } catch (error) {
      return {
        status: 400,
        body: toLiveApiErrorBody(error, request.requestId)
      };
    }
  };
}

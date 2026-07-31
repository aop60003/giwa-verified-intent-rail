import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex
} from "../../../../../packages/protocol/src/index.ts";
import type { LiveStore } from "./liveStore.ts";
import type { HostedRuntimeMode } from "./hostedMode.ts";
import { hasLiveAuthScope, type LiveAuthContext } from "./liveAuth.ts";
import type {
  DecisionRecord,
  LiveRunRecord,
  PartnerRunProjection,
  PublicEvidenceRecord,
  ReceiptRecord,
  SubmittedTxRecord,
  VerifierInputRecord
} from "./liveTypes.ts";
import type { LiveVerifierPublicEvidenceDraft } from "../verifier/liveVerifierService.ts";
import { DEFAULT_LIVE_TENANT_ID, isTerminalLiveRunStatus } from "./liveTypes.ts";
import type { LiveManifestPreview } from "./liveManifestIssuer.ts";
import type { VerificationJobQueue } from "./verificationJobQueue.ts";
import { toLiveApiErrorBody } from "./liveApiErrors.ts";
import { failureCodeDisplayCopy, toBoundedFailureCode, toSafeFailureReason } from "../verifier/liveFailureCode.ts";
import { buildLiveDemoControlRoom, selectLatestRun } from "./liveDemoControlRoom.ts";
import {
  hashLiveRunCapability,
  issueLiveRunCapability,
  type IssuedLiveRunCapability
} from "./liveParticipantCapability.ts";
import {
  GASOK_CAMPAIGN_ID,
  GASOK_MISSION_ID,
  type LivePublicConfig
} from "./livePublicConfig.ts";
import { classifyLiveApiRoute } from "./liveRoutePolicy.ts";
import { buildPublicCampaignStudio } from "../partner/publicCampaignStudio.ts";
import { lookupPublicMatchedProof } from "./publicProofLookup.ts";
import {
  PUBLIC_VERIFICATION_NOTICE,
  PUBLIC_VERIFICATION_REPLAY_COMMAND,
  normalizePublicVerificationBundle
} from "./publicVerificationBundle.ts";
import { replayPublicVerificationBundle } from "./publicVerificationReplay.ts";

const GIWA_SEPOLIA_CHAIN_ID = 91342;

export type LiveApiRequest = {
  method: string;
  pathname: string;
  body?: unknown;
  auth?: LiveAuthContext | null;
  runCapability?: string | null;
  requestId?: string;
  downloadRequested?: boolean;
};

export type LiveApiResponse = {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
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
  issueRunCapability?: () => IssuedLiveRunCapability;
  publicConfig?: LivePublicConfig;
  now: () => string;
  issueManifest: (input: ManifestIssueInput) => Promise<ManifestIssueResult>;
  verifyRun?: (input: { run: LiveRunRecord; submittedTx: SubmittedTxRecord }) => Promise<{
    decision: "matched" | "mismatched" | "failed" | "timeout";
    failureReason: string | null;
    verifierInputHash: string;
    receiptHash: string | null;
    decisionTxHash: string | null;
    standardRpcReceiptStatus: 1 | 0 | null;
    depositBlockNumber: number | null;
    depositBlockHash: string | null;
    confirmationDepth: number;
    receipt?: ReceiptRecord;
    verifierInputRecord?: VerifierInputRecord;
    publicEvidenceDraft?: LiveVerifierPublicEvidenceDraft;
  }>;
  replayPublicEvidence?: typeof replayPublicVerificationBundle;
};

function errorBody(error: string, requestId: string | undefined): Record<string, unknown> {
  return requestId === undefined ? { error } : { error, requestId };
}

function requestTenant(request: LiveApiRequest): string {
  return request.auth?.tenantId ?? DEFAULT_LIVE_TENANT_ID;
}

function scopeAllowed(deps: LiveApiDependencies, request: LiveApiRequest, scope: Parameters<typeof hasLiveAuthScope>[1]): boolean {
  if ((deps.mode ?? "local") === "local") return true;
  return request.auth !== null && request.auth !== undefined && hasLiveAuthScope(request.auth, scope);
}

function forbidden(request: LiveApiRequest): LiveApiResponse {
  return { status: 403, body: errorBody("forbidden", request.requestId) };
}

function unauthorized(request: LiveApiRequest, error = "unauthorized"): LiveApiResponse {
  return { status: 401, body: errorBody(error, request.requestId) };
}

function participantRun(
  deps: LiveApiDependencies,
  request: LiveApiRequest,
  runId: string
): LiveRunRecord | undefined {
  if ((deps.mode ?? "local") === "local") return deps.store.getRun(runId);
  if (typeof request.runCapability !== "string") return undefined;
  return deps.store.getRunForCapabilityHash(runId, hashLiveRunCapability(request.runCapability));
}

function hasTerminalRunState(deps: LiveApiDependencies, run: LiveRunRecord): boolean {
  return isTerminalLiveRunStatus(run.status) || deps.store.getDecisionByIntentHash(run.intentHash) !== undefined;
}

const RUN_CREATE_KEYS = new Set(["wallet", "chainId", "referralCode", "campaignId", "missionId"]);

function assertFixedRunPolicy(body: Record<string, unknown>): void {
  if (Object.keys(body).some((key) => !RUN_CREATE_KEYS.has(key))) {
    throw new Error("fixed_policy_override_not_allowed");
  }
  if (body.campaignId !== undefined && body.campaignId !== GASOK_CAMPAIGN_ID) {
    throw new Error("fixed_policy_override_not_allowed");
  }
  if (body.missionId !== undefined && body.missionId !== GASOK_MISSION_ID) {
    throw new Error("fixed_policy_override_not_allowed");
  }
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

function optionalNumber(body: Record<string, unknown>, key: string): number | null {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${key} must be an integer`);
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
    publicEvidence?: PublicEvidenceRecord | undefined;
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
      nextSprint: null
    },
    depositAction: {
      enabled: transactionReady,
      reason: transactionReady ? null : "manifest_preview_required",
      nextSprint: null
    },
    approveTxHash: state?.submittedTx?.approveTxHash ?? null,
    depositTxHash: state?.submittedTx?.depositTxHash ?? null,
    decision: state?.decision?.decision ?? null,
    failureReason: safeFailureReason,
    verifierInputHash: state?.decision?.verifierInputHash ?? null,
    receiptReady:
      state?.decision?.decision === "matched" &&
      state.decision.receiptHash !== null &&
      state.publicEvidence !== undefined,
    receiptHash: state?.decision?.receiptHash ?? null,
    decisionTxHash: state?.decision?.decisionTxHash ?? null,
    verification,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt
  };
}

function matchingPublicEvidence(
  store: LiveStore,
  decision: DecisionRecord | undefined
): PublicEvidenceRecord | undefined {
  if (decision?.decision !== "matched" || decision.receiptHash === null) {
    return undefined;
  }
  const evidence = store.getPublicEvidenceByReceiptHash(decision.receiptHash);
  if (
    evidence === undefined ||
    evidence.receiptHash.toLowerCase() !== decision.receiptHash.toLowerCase() ||
    evidence.intentHash.toLowerCase() !== decision.intentHash.toLowerCase() ||
    evidence.depositTxHash.toLowerCase() !== decision.depositTxHash.toLowerCase()
  ) {
    return undefined;
  }
  return evidence;
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

function buildPublicVerificationBundle(
  draft: LiveVerifierPublicEvidenceDraft,
  generatedAt: string
) {
  return normalizePublicVerificationBundle({
    schemaVersion: "1",
    source: "live",
    generatedAt,
    identity: {
      receiptHash: draft.receipt.record.receiptHash,
      intentHash: draft.receipt.record.intentHash,
      depositTxHash: draft.receipt.payload.depositTxHash
    },
    manifest: {
      payload: draft.manifest.payload,
      canonicalPayload: canonicalManifestPayload(draft.manifest.payload),
      canonicalPayloadBytesHex: canonicalManifestPayloadBytesHex(
        draft.manifest.payload
      ),
      signature: draft.manifest.signature,
      signingDomain: {
        name: "GIWA Verified Intent Rail",
        version: "1",
        chainId: 91342,
        verifyingContract: draft.manifest.verifyingContract
      },
      recoveredSigner: draft.manifest.recoveredSigner
    },
    verifierInput: draft.verifierInput,
    verification: draft.verification,
    decodedLogs: draft.decodedLogs,
    receipt: {
      payload: draft.receipt.payload,
      canonicalPayload: draft.receipt.record.canonicalPayload,
      canonicalPayloadBytesHex: draft.receipt.record.canonicalPayloadBytesHex,
      receiptHash: draft.receipt.record.receiptHash,
      schemaVersion: draft.receipt.schemaVersion,
      verifierVersion: draft.receipt.verifierVersion
    },
    replay: {
      algorithm: "keccak256-canonical-json+eip712",
      command: PUBLIC_VERIFICATION_REPLAY_COMMAND
    },
    notice: PUBLIC_VERIFICATION_NOTICE
  });
}

export function createLiveApiHandler(deps: LiveApiDependencies): (request: LiveApiRequest) => Promise<LiveApiResponse> {
  return async function handle(request): Promise<LiveApiResponse> {
    try {
      const routeClass = classifyLiveApiRoute(request.method, request.pathname);
      const hosted = (deps.mode ?? "local") !== "local";
      if (hosted && routeClass === "partner" && request.auth == null) return unauthorized(request);
      if (hosted && routeClass === "participant" && typeof request.runCapability !== "string") {
        return unauthorized(request, "run_capability_required");
      }

      if (request.method === "GET" && request.pathname === "/api/public/config") {
        if (deps.publicConfig === undefined) {
          return { status: 503, body: errorBody("public_config_unavailable", request.requestId) };
        }
        return { status: 200, body: deps.publicConfig };
      }

      if (
        request.method === "GET" &&
        request.pathname === "/api/public/campaign-studio"
      ) {
        return {
          status: 200,
          body: await buildPublicCampaignStudio({
            store: deps.store,
            campaignId: GASOK_CAMPAIGN_ID,
            missionId: GASOK_MISSION_ID,
            generatedAt: deps.now()
          })
        };
      }

      if (
        request.method === "POST" &&
        request.pathname === "/api/public/events"
      ) {
        return {
          status: 503,
          body: { error: "public_campaign_events_disabled" }
        };
      }

      if (
        request.method === "GET" &&
        /^\/api\/public\/evidence\/[^/]+$/u.test(request.pathname)
      ) {
        const queryHash = request.pathname.slice(
          "/api/public/evidence/".length
        );
        let proof = null;
        try {
          proof = await lookupPublicMatchedProof({
            store: deps.store,
            queryHash
          });
        } catch {
          proof = null;
        }
        if (proof === null) {
          return {
            status: 404,
            body: { error: "proof_not_found" },
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store"
            }
          };
        }

        const headers: Record<string, string> = {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60, stale-while-revalidate=300"
        };
        if (request.downloadRequested === true) {
          headers["content-disposition"] =
            `attachment; filename="giwa-receipt-${proof.receiptHash}.json"`;
        }
        return {
          status: 200,
          body: request.downloadRequested === true ? proof.bundle : proof,
          headers
        };
      }

      if (request.method === "POST" && request.pathname === "/api/runs") {
        const body = objectBody(request.body);
        assertFixedRunPolicy(body);
        const input: ManifestIssueInput = {
          wallet: requiredString(body, "wallet").toLowerCase(),
          campaignId: GASOK_CAMPAIGN_ID,
          missionId: GASOK_MISSION_ID,
          referralCode: optionalString(body, "referralCode")
        };
        const chainId = optionalNumber(body, "chainId");
        if (chainId !== null && chainId !== GIWA_SEPOLIA_CHAIN_ID) {
          return {
            status: 409,
            body: { error: "wrong_chain", expectedChainId: GIWA_SEPOLIA_CHAIN_ID, receivedChainId: chainId }
          };
        }
        const issued = await deps.issueManifest(input);
        const capability = (deps.issueRunCapability ?? issueLiveRunCapability)();
        const timestamp = deps.now();
        const tenantId = requestTenant(request);
        const run = deps.store.createRun({
          runId: issued.runId,
          tenantId,
          capabilityHash: capability.hash,
          idempotencyKey: [
            tenantId,
            issued.runId,
            input.wallet,
            input.campaignId,
            input.missionId,
            input.referralCode ?? ""
          ].join(":"),
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
        if (run.capabilityHash !== capability.hash) {
          return { status: 409, body: errorBody("run_capability_conflict", request.requestId) };
        }

        return { status: 201, body: { ...runResponse(run, issued), runCapability: capability.value } };
      }

      const getRunId = request.method === "GET" ? runIdFrom(request.pathname) : undefined;
      if (getRunId !== undefined) {
        const run = participantRun(deps, request, getRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        const decision = deps.store.getDecisionByIntentHash(run.intentHash);
        return {
          status: 200,
          body: runResponse(run, undefined, {
            submittedTx: deps.store.getSubmittedTx(run.runId),
            decision,
            publicEvidence: matchingPublicEvidence(deps.store, decision),
            verificationJob: deps.store.getVerificationJobForRun(run.runId)
          })
        };
      }

      const evidenceRunId = request.method === "POST" ? runIdFrom(request.pathname, "/evidence") : undefined;
      if (evidenceRunId !== undefined) {
        const run = participantRun(deps, request, evidenceRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        if (hasTerminalRunState(deps, run)) {
          return { status: 409, body: errorBody("run_terminal", request.requestId) };
        }
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
            nextSprint: "Sprint 11"
          }
        };
      }

      const invalidateRunId = request.method === "POST" ? runIdFrom(request.pathname, "/invalidate") : undefined;
      if (invalidateRunId !== undefined) {
        const run = participantRun(deps, request, invalidateRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        if (hasTerminalRunState(deps, run)) {
          return { status: 409, body: errorBody("run_terminal", request.requestId) };
        }
        const updated = deps.store.updateRunStatus(invalidateRunId, "manifestInvalidated", deps.now());
        return { status: 200, body: { ...runResponse(updated), invalidationAccepted: true } };
      }

      const intentRelayRunId = request.method === "POST" ? runIdFrom(request.pathname, "/intent-submit") : undefined;
      if (intentRelayRunId !== undefined) {
        if (participantRun(deps, request, intentRelayRunId) === undefined) {
          return { status: 404, body: { error: "run_not_found" } };
        }
        return {
          status: 409,
          body: { error: "chain_action_disabled_until_sprint_11", runId: intentRelayRunId, nextSprint: "Sprint 11" }
        };
      }

      const verifyRunId = request.method === "POST" ? runIdFrom(request.pathname, "/verify") : undefined;
      if (verifyRunId !== undefined) {
        const run = participantRun(deps, request, verifyRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        if (deps.verifyRun === undefined) {
          return {
            status: 409,
            body: { error: "chain_action_disabled_until_sprint_11", runId: verifyRunId, nextSprint: "Sprint 11" }
          };
        }
        const submittedTx = deps.store.getSubmittedTx(verifyRunId);
        if (submittedTx === undefined) return { status: 409, body: { error: "deposit_evidence_required" } };

        const existingDecision = deps.store.getDecisionByIntentHash(run.intentHash);
        if (existingDecision !== undefined) {
          const publicEvidence = matchingPublicEvidence(deps.store, existingDecision);
          const receiptReady =
            existingDecision.decision === "matched" &&
            existingDecision.receiptHash !== null &&
            publicEvidence !== undefined;
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
              receiptReady,
              receiptHash: existingDecision.receiptHash,
              decisionTxHash: existingDecision.decisionTxHash,
              verification: { status: "terminal" }
            }
          };
        }

        if ((deps.mode ?? "local") === "prod-testnet" && deps.verificationJobs !== undefined) {
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
              confirmationDepth: result.confirmationDepth,
              verification: {
                status: "retryable",
                retryPath: `/api/runs/${verifyRunId}/verify`
              }
            }
          };
        }

        const decisionTime = deps.now();
        const decisionInput: DecisionRecord = {
          intentHash: run.intentHash,
          depositTxHash: submittedTx.depositTxHash,
          decision: result.decision,
          failureReason: safeFailureReason,
          verifierInputHash: result.verifierInputHash,
          receiptHash: result.receiptHash,
          decisionTxHash: result.decisionTxHash,
          issuedAt: nowUnix(decisionTime),
          standardRpcReceiptStatus: result.standardRpcReceiptStatus,
          depositBlockNumber: result.depositBlockNumber,
          depositBlockHash: result.depositBlockHash,
          confirmationDepth: result.confirmationDepth
        };
        let decision: DecisionRecord;
        let updated: LiveRunRecord;

        if (result.decision === "matched") {
          if (result.receipt === undefined) {
            throw new Error("matched verifier result must include receipt");
          }
          if (
            result.verifierInputRecord === undefined ||
            result.publicEvidenceDraft === undefined
          ) {
            throw new Error("matched verifier result must include public evidence");
          }
          if (
            JSON.stringify(result.receipt) !==
              JSON.stringify(result.publicEvidenceDraft.receipt.record) ||
            result.verifierInputRecord.canonicalPayload !==
              result.publicEvidenceDraft.verifierInput.canonicalPayload ||
            result.verifierInputRecord.canonicalPayloadBytesHex !==
              result.publicEvidenceDraft.verifierInput.canonicalPayloadBytesHex ||
            result.verifierInputRecord.verifierInputHash !==
              result.publicEvidenceDraft.verifierInput.verifierInputHash
          ) {
            throw new Error("matched verifier evidence draft is incoherent");
          }

          const publicationTime = decisionTime;
          const bundle = buildPublicVerificationBundle(
            result.publicEvidenceDraft,
            publicationTime
          );
          const replay = await (
            deps.replayPublicEvidence ?? replayPublicVerificationBundle
          )(bundle);
          if (!replay.ok) {
            throw new Error("public verification bundle replay failed");
          }
          const published = deps.store.publishMatchedEvidence({
            runId: verifyRunId,
            updatedAt: publicationTime,
            verifierInput: result.verifierInputRecord,
            receipt: result.receipt,
            decision: decisionInput,
            publicEvidence: {
              receiptHash: bundle.identity.receiptHash,
              intentHash: bundle.identity.intentHash,
              depositTxHash: bundle.identity.depositTxHash,
              bundleJson: JSON.stringify(bundle),
              createdAt: publicationTime
            }
          });
          decision = published.decision;
          updated = published.run;
        } else {
          if (result.verifierInputRecord !== undefined) {
            deps.store.saveVerifierInput(result.verifierInputRecord);
          }
          decision = deps.store.saveDecision(decisionInput);
          updated = deps.store.updateRunStatus(verifyRunId, decision.decision, decisionTime);
        }
        return {
          status: 200,
          body: {
            ...runResponse(updated),
            decision: decision.decision,
            failureReason: decision.failureReason,
            failureCode,
            failureCopy,
            verifierInputHash: decision.verifierInputHash,
            receiptReady: matchingPublicEvidence(deps.store, decision) !== undefined,
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
        const receiptHash = request.pathname.slice("/api/receipts/".length);
        const proof = await lookupPublicMatchedProof({
          store: deps.store,
          queryHash: receiptHash
        });
        if (proof === null || proof.queryKind !== "receipt") {
          return { status: 404, body: { error: "receipt_not_found" } };
        }
        const { bundle } = proof;
        return {
          status: 200,
          body: {
            source: "live",
            receiptHash: bundle.identity.receiptHash,
            intentHash: bundle.identity.intentHash,
            payload: bundle.receipt.payload,
            payloadJson: JSON.stringify(bundle.receipt.payload),
            canonicalPayload: bundle.receipt.canonicalPayload,
            canonicalPayloadBytesHex: bundle.receipt.canonicalPayloadBytesHex,
            verifierInputHash: bundle.verifierInput.verifierInputHash,
            standardRpcReceiptStatus: bundle.verification.standardRpcReceiptStatus,
            depositBlockNumber: bundle.verification.depositBlockNumber,
            depositBlockHash: bundle.verification.depositBlockHash,
            confirmationDepth: bundle.verification.confirmationDepth,
            testnetNotice: "Testnet-only. No real asset, no yield, no RWA claim."
          }
        };
      }

      if (request.method === "GET" && request.pathname === "/api/demo/status") {
        if (hosted && request.auth == null) return unauthorized(request);
        if (hosted && !scopeAllowed(deps, request, "runs:read")) return forbidden(request);
        const rows = hosted
          ? deps.store.listRunsForTenant(requestTenant(request))
          : deps.store.listRuns();
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
        if (!scopeAllowed(deps, request, "partner:read")) {
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
      if (
        error instanceof Error &&
        (error.message === "fixed_policy_override_not_allowed" || error.message === "run_capability_required")
      ) {
        return { status: 400, body: errorBody(error.message, request.requestId) };
      }
      return {
        status: 400,
        body: toLiveApiErrorBody(error, request.requestId)
      };
    }
  };
}

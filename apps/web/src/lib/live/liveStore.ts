import { DatabaseSync } from "node:sqlite";

import type {
  DecisionRecord,
  LiveRunRecord,
  MatchedEvidencePublication,
  PublicCampaignEventAggregate,
  PublicCampaignEventRecord,
  PublicEvidenceRecord,
  ReceiptRecord,
  SubmittedTxRecord,
  VerifierInputRecord
} from "./liveTypes.ts";
import { assertPublicCampaignEventRecord } from "./publicCampaignAnalytics.ts";
import { REQUIRED_LIVE_MIGRATIONS } from "./liveSchemaMigrations.ts";
import type { LiveSchemaStateInput } from "./liveSchemaMigrations.ts";
import {
  DEFAULT_LIVE_TENANT_ID as DEFAULT_TENANT,
  isTerminalLiveRunStatus,
  normalizeLiveRunStatus
} from "./liveTypes.ts";
import type { VerificationJobReason, VerificationJobRecord } from "./verificationJobQueue.ts";

export type LiveStore = {
  createRun(input: LiveRunRecord): LiveRunRecord;
  getRun(runId: string): LiveRunRecord | undefined;
  getRunForCapabilityHash(runId: string, capabilityHash: string): LiveRunRecord | undefined;
  getRunForTenant(tenantId: string, runId: string): LiveRunRecord | undefined;
  listRuns(): LiveRunRecord[];
  listRunsForTenant(tenantId: string): LiveRunRecord[];
  updateRunStatus(runId: string, status: LiveRunRecord["status"], updatedAt: string): LiveRunRecord;
  saveSubmittedTx(input: SubmittedTxRecord): SubmittedTxRecord;
  getSubmittedTx(runId: string): SubmittedTxRecord | undefined;
  saveDecision(input: DecisionRecord): DecisionRecord;
  getDecisionByIntentHash(intentHash: string): DecisionRecord | undefined;
  saveReceipt(input: ReceiptRecord): ReceiptRecord;
  getReceipt(receiptHash: string): ReceiptRecord | undefined;
  getReceiptForTenant(tenantId: string, receiptHash: string): ReceiptRecord | undefined;
  saveVerifierInput(input: VerifierInputRecord): VerifierInputRecord;
  getVerifierInput(verifierInputHash: string): VerifierInputRecord | undefined;
  savePublicEvidence(input: PublicEvidenceRecord): PublicEvidenceRecord;
  getPublicEvidenceByReceiptHash(receiptHash: string): PublicEvidenceRecord | undefined;
  getPublicEvidenceByIntentHash(intentHash: string): PublicEvidenceRecord | undefined;
  getPublicEvidenceByDepositTxHash(depositTxHash: string): PublicEvidenceRecord | undefined;
  publishMatchedEvidence(input: MatchedEvidencePublication): {
    run: LiveRunRecord;
    verifierInput: VerifierInputRecord;
    receipt: ReceiptRecord;
    decision: DecisionRecord;
    publicEvidence: PublicEvidenceRecord;
  };
  savePublicCampaignEvent(input: PublicCampaignEventRecord): PublicCampaignEventRecord;
  aggregatePublicCampaignEvents(
    campaignId: string,
    missionId: string
  ): PublicCampaignEventAggregate;
  enqueueVerificationJob(input: {
    tenantId: string;
    runId: string;
    reason: VerificationJobReason;
    createdAt: string;
  }): VerificationJobRecord;
  getVerificationJobForRun(runId: string): VerificationJobRecord | undefined;
  checkWritable(): boolean;
  getSchemaState(): LiveSchemaStateInput;
  pruneIncompleteRuns(cutoffIso: string): number;
};

export type ClosableLiveStore = LiveStore & {
  close(): void;
};

function tenantIdFor(run: Pick<LiveRunRecord, "tenantId">): string {
  return run.tenantId ?? DEFAULT_TENANT;
}

function idempotencyLookupKey(input: Pick<LiveRunRecord, "tenantId" | "idempotencyKey">): string {
  return `${tenantIdFor(input)}:${input.idempotencyKey}`;
}

function jobIdFor(tenantId: string, runId: string): string {
  return `job_${tenantId}_${runId}`.replace(/[^A-Za-z0-9_]/gu, "_");
}

function publicCampaignEventKey(input: PublicCampaignEventRecord): string {
  return [
    input.eventType,
    input.sessionHash,
    input.campaignId,
    input.missionId
  ].join(":");
}

function publicEvidenceRecordsEqual(
  left: PublicEvidenceRecord,
  right: PublicEvidenceRecord
): boolean {
  return (
    left.receiptHash === right.receiptHash &&
    left.intentHash === right.intentHash &&
    left.depositTxHash === right.depositTxHash &&
    left.bundleJson === right.bundleJson &&
    left.createdAt === right.createdAt
  );
}

function verifierInputRecordsEqual(
  left: VerifierInputRecord,
  right: VerifierInputRecord
): boolean {
  return (
    left.runId === right.runId &&
    left.verifierInputHash === right.verifierInputHash &&
    left.canonicalPayload === right.canonicalPayload &&
    left.canonicalPayloadBytesHex === right.canonicalPayloadBytesHex &&
    left.createdAt === right.createdAt
  );
}

function receiptRecordsEqual(left: ReceiptRecord, right: ReceiptRecord): boolean {
  return (
    left.receiptHash === right.receiptHash &&
    left.intentHash === right.intentHash &&
    left.payloadJson === right.payloadJson &&
    left.canonicalPayload === right.canonicalPayload &&
    left.canonicalPayloadBytesHex === right.canonicalPayloadBytesHex
  );
}

function decisionRecordsEqual(left: DecisionRecord, right: DecisionRecord): boolean {
  return (
    left.intentHash === right.intentHash &&
    left.depositTxHash === right.depositTxHash &&
    left.decision === right.decision &&
    left.failureReason === right.failureReason &&
    left.verifierInputHash === right.verifierInputHash &&
    left.receiptHash === right.receiptHash &&
    left.decisionTxHash === right.decisionTxHash &&
    left.issuedAt === right.issuedAt &&
    (left.standardRpcReceiptStatus ?? null) ===
      (right.standardRpcReceiptStatus ?? null) &&
    (left.depositBlockNumber ?? null) === (right.depositBlockNumber ?? null) &&
    (left.depositBlockHash ?? null) === (right.depositBlockHash ?? null) &&
    (left.confirmationDepth ?? null) === (right.confirmationDepth ?? null)
  );
}

function sameHash(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function assertMatchedEvidencePublication(
  store: Pick<LiveStore, "getRun" | "getSubmittedTx">,
  input: MatchedEvidencePublication
): LiveRunRecord {
  const run = store.getRun(input.runId);
  const submittedTx = store.getSubmittedTx(input.runId);
  const coherent =
    run !== undefined &&
    submittedTx !== undefined &&
    input.decision.decision === "matched" &&
    input.decision.failureReason === null &&
    input.decision.receiptHash !== null &&
    input.decision.standardRpcReceiptStatus === 1 &&
    sameHash(run.intentHash, input.publicEvidence.intentHash) &&
    sameHash(submittedTx.depositTxHash, input.publicEvidence.depositTxHash) &&
    input.verifierInput.runId === input.runId &&
    sameHash(input.receipt.receiptHash, input.publicEvidence.receiptHash) &&
    sameHash(input.receipt.intentHash, input.publicEvidence.intentHash) &&
    sameHash(input.decision.intentHash, input.publicEvidence.intentHash) &&
    sameHash(input.decision.depositTxHash, input.publicEvidence.depositTxHash) &&
    sameHash(input.decision.verifierInputHash, input.verifierInput.verifierInputHash) &&
    sameHash(input.decision.receiptHash, input.publicEvidence.receiptHash);
  if (!coherent) throw new Error("matched evidence publication is incoherent");
  if (isTerminalLiveRunStatus(run.status) && run.status !== "matched") {
    throw new Error("matched evidence publication conflicts with terminal run");
  }
  return run;
}

export function createMemoryLiveStore(): LiveStore {
  const runsById = new Map<string, LiveRunRecord>();
  const runsByIdempotency = new Map<string, LiveRunRecord>();
  const submittedByRun = new Map<string, SubmittedTxRecord>();
  const submittedRunByDeposit = new Map<string, string>();
  const decisionsByIntent = new Map<string, DecisionRecord>();
  const decisionsByDeposit = new Map<string, DecisionRecord>();
  const receiptsByHash = new Map<string, ReceiptRecord>();
  const verifierInputsByHash = new Map<string, VerifierInputRecord>();
  const publicEvidenceByReceipt = new Map<string, PublicEvidenceRecord>();
  const publicEvidenceByIntent = new Map<string, PublicEvidenceRecord>();
  const publicEvidenceByDeposit = new Map<string, PublicEvidenceRecord>();
  const publicCampaignEvents = new Map<string, PublicCampaignEventRecord>();
  const verificationJobsById = new Map<string, VerificationJobRecord>();
  const verificationJobIdByRun = new Map<string, string>();

  return {
    createRun(input) {
      const normalized = { ...input, tenantId: tenantIdFor(input) };
      const existing = runsByIdempotency.get(idempotencyLookupKey(normalized));
      if (existing !== undefined) return existing;
      if (runsById.has(normalized.runId)) throw new Error("runId already exists");
      if ([...runsById.values()].some((run) => run.intentHash === normalized.intentHash)) {
        throw new Error("intentHash already exists");
      }
      runsById.set(normalized.runId, normalized);
      runsByIdempotency.set(idempotencyLookupKey(normalized), normalized);
      return normalized;
    },
    getRun(runId) {
      return runsById.get(runId);
    },
    getRunForCapabilityHash(runId, capabilityHash) {
      const run = runsById.get(runId);
      if (run === undefined || run.capabilityHash !== capabilityHash) return undefined;
      return run;
    },
    getRunForTenant(tenantId, runId) {
      const run = runsById.get(runId);
      if (run === undefined || tenantIdFor(run) !== tenantId) return undefined;
      return run;
    },
    listRuns() {
      return [...runsById.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },
    listRunsForTenant(tenantId) {
      return this.listRuns().filter((run) => tenantIdFor(run) === tenantId);
    },
    updateRunStatus(runId, status, updatedAt) {
      const existing = runsById.get(runId);
      if (existing === undefined) throw new Error("run does not exist");
      const updated = { ...existing, status, updatedAt };
      runsById.set(runId, updated);
      runsByIdempotency.set(idempotencyLookupKey(updated), updated);
      return updated;
    },
    saveSubmittedTx(input) {
      const normalizedDeposit = input.depositTxHash.toLowerCase();
      const existingRunId = submittedRunByDeposit.get(normalizedDeposit);
      if (existingRunId !== undefined && existingRunId !== input.runId) {
        throw new Error("depositTxHash already belongs to another run");
      }
      const existing = submittedByRun.get(input.runId);
      if (existing !== undefined) return existing;
      if (!runsById.has(input.runId)) throw new Error("run does not exist");
      submittedByRun.set(input.runId, input);
      submittedRunByDeposit.set(normalizedDeposit, input.runId);
      return input;
    },
    getSubmittedTx(runId) {
      return submittedByRun.get(runId);
    },
    saveDecision(input) {
      const existingByIntent = decisionsByIntent.get(input.intentHash);
      if (existingByIntent !== undefined) return existingByIntent;
      const existingByDeposit = decisionsByDeposit.get(input.depositTxHash);
      if (existingByDeposit !== undefined) throw new Error("depositTxHash already has a terminal decision");
      decisionsByIntent.set(input.intentHash, input);
      decisionsByDeposit.set(input.depositTxHash, input);
      return input;
    },
    getDecisionByIntentHash(intentHash) {
      return decisionsByIntent.get(intentHash);
    },
    saveReceipt(input) {
      const existing = receiptsByHash.get(input.receiptHash);
      if (existing !== undefined) return existing;
      receiptsByHash.set(input.receiptHash, input);
      return input;
    },
    getReceipt(receiptHash) {
      return receiptsByHash.get(receiptHash);
    },
    getReceiptForTenant(tenantId, receiptHash) {
      const receipt = receiptsByHash.get(receiptHash);
      if (receipt === undefined) return undefined;
      const run = [...runsById.values()].find((candidate) => candidate.intentHash === receipt.intentHash);
      if (run === undefined || tenantIdFor(run) !== tenantId) return undefined;
      return receipt;
    },
    saveVerifierInput(input) {
      const existing = verifierInputsByHash.get(input.verifierInputHash);
      if (existing !== undefined) return existing;
      verifierInputsByHash.set(input.verifierInputHash, input);
      return input;
    },
    getVerifierInput(verifierInputHash) {
      return verifierInputsByHash.get(verifierInputHash);
    },
    savePublicEvidence(input) {
      const existing =
        publicEvidenceByReceipt.get(input.receiptHash.toLowerCase()) ??
        publicEvidenceByIntent.get(input.intentHash.toLowerCase()) ??
        publicEvidenceByDeposit.get(input.depositTxHash.toLowerCase());
      if (existing !== undefined) {
        if (!publicEvidenceRecordsEqual(existing, input)) {
          throw new Error("public evidence conflict");
        }
        return existing;
      }
      throw new Error("public evidence must be published atomically");
    },
    getPublicEvidenceByReceiptHash(receiptHash) {
      return publicEvidenceByReceipt.get(receiptHash.toLowerCase());
    },
    getPublicEvidenceByIntentHash(intentHash) {
      return publicEvidenceByIntent.get(intentHash.toLowerCase());
    },
    getPublicEvidenceByDepositTxHash(depositTxHash) {
      return publicEvidenceByDeposit.get(depositTxHash.toLowerCase());
    },
    publishMatchedEvidence(input) {
      const run = assertMatchedEvidencePublication(this, input);
      const existingVerifierInput = verifierInputsByHash.get(
        input.verifierInput.verifierInputHash
      );
      const existingReceipt = receiptsByHash.get(input.receipt.receiptHash);
      const existingReceiptByIntent = [...receiptsByHash.values()].find((candidate) =>
        sameHash(candidate.intentHash, input.receipt.intentHash)
      );
      const existingDecisionByIntent = decisionsByIntent.get(input.decision.intentHash);
      const existingDecisionByDeposit = decisionsByDeposit.get(input.decision.depositTxHash);
      const existingPublicEvidence =
        publicEvidenceByReceipt.get(input.publicEvidence.receiptHash.toLowerCase()) ??
        publicEvidenceByIntent.get(input.publicEvidence.intentHash.toLowerCase()) ??
        publicEvidenceByDeposit.get(input.publicEvidence.depositTxHash.toLowerCase());
      if (
        (existingVerifierInput !== undefined &&
          !verifierInputRecordsEqual(existingVerifierInput, input.verifierInput)) ||
        (existingReceipt !== undefined &&
          !receiptRecordsEqual(existingReceipt, input.receipt)) ||
        (existingReceiptByIntent !== undefined &&
          !receiptRecordsEqual(existingReceiptByIntent, input.receipt)) ||
        (existingDecisionByIntent !== undefined &&
          !decisionRecordsEqual(existingDecisionByIntent, input.decision)) ||
        (existingDecisionByDeposit !== undefined &&
          !decisionRecordsEqual(existingDecisionByDeposit, input.decision)) ||
        (existingPublicEvidence !== undefined &&
          !publicEvidenceRecordsEqual(existingPublicEvidence, input.publicEvidence))
      ) {
        throw new Error("matched evidence publication conflict");
      }

      verifierInputsByHash.set(input.verifierInput.verifierInputHash, input.verifierInput);
      receiptsByHash.set(input.receipt.receiptHash, input.receipt);
      decisionsByIntent.set(input.decision.intentHash, input.decision);
      decisionsByDeposit.set(input.decision.depositTxHash, input.decision);
      publicEvidenceByReceipt.set(
        input.publicEvidence.receiptHash.toLowerCase(),
        input.publicEvidence
      );
      publicEvidenceByIntent.set(
        input.publicEvidence.intentHash.toLowerCase(),
        input.publicEvidence
      );
      publicEvidenceByDeposit.set(
        input.publicEvidence.depositTxHash.toLowerCase(),
        input.publicEvidence
      );
      const updatedRun = { ...run, status: "matched" as const, updatedAt: input.updatedAt };
      runsById.set(input.runId, updatedRun);
      runsByIdempotency.set(idempotencyLookupKey(updatedRun), updatedRun);
      return {
        run: updatedRun,
        verifierInput: input.verifierInput,
        receipt: input.receipt,
        decision: input.decision,
        publicEvidence: input.publicEvidence
      };
    },
    savePublicCampaignEvent(input) {
      assertPublicCampaignEventRecord(input);
      const key = publicCampaignEventKey(input);
      const existing = publicCampaignEvents.get(key);
      if (existing !== undefined) return existing;
      publicCampaignEvents.set(key, input);
      return input;
    },
    aggregatePublicCampaignEvents(campaignId, missionId) {
      const visitorSessions = new Set<string>();
      const walletSessions = new Set<string>();
      for (const event of publicCampaignEvents.values()) {
        if (
          event.campaignId !== campaignId ||
          event.missionId !== missionId
        ) {
          continue;
        }
        if (event.eventType === "campaignVisited") {
          visitorSessions.add(event.sessionHash);
        } else {
          walletSessions.add(event.sessionHash);
        }
      }
      return {
        uniqueCampaignVisitorCount: visitorSessions.size,
        uniqueWalletConnectSessionCount: walletSessions.size
      };
    },
    enqueueVerificationJob(input) {
      const existingId = verificationJobIdByRun.get(input.runId);
      const existing = existingId === undefined ? undefined : verificationJobsById.get(existingId);
      if (existing !== undefined && existing.status !== "dead") return existing;
      const job: VerificationJobRecord = {
        jobId: jobIdFor(input.tenantId, input.runId),
        tenantId: input.tenantId,
        runId: input.runId,
        status: "pending",
        attempts: 0,
        availableAt: input.createdAt,
        leasedBy: null,
        leasedUntil: null,
        lastErrorCode: null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt
      };
      verificationJobsById.set(job.jobId, job);
      verificationJobIdByRun.set(input.runId, job.jobId);
      return job;
    },
    getVerificationJobForRun(runId) {
      const id = verificationJobIdByRun.get(runId);
      return id === undefined ? undefined : verificationJobsById.get(id);
    },
    checkWritable() {
      return true;
    },
    getSchemaState() {
      return {
        migrations: [...REQUIRED_LIVE_MIGRATIONS],
        tables: {
          runs: [{ name: "capabilityHash", notNull: false }],
          decisions: [
            { name: "decisionTxHash", notNull: false },
            { name: "standardRpcReceiptStatus", notNull: false },
            { name: "depositBlockNumber", notNull: false },
            { name: "depositBlockHash", notNull: false },
            { name: "confirmationDepth", notNull: false }
          ],
          public_evidence_bundles: [
            {
              name: "receiptHash",
              declaredType: "TEXT",
              notNull: false,
              pkPosition: 1
            },
            {
              name: "intentHash",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 0
            },
            {
              name: "depositTxHash",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 0
            },
            {
              name: "bundleJson",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 0
            },
            {
              name: "createdAt",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 0
            }
          ],
          public_campaign_events: [
            {
              name: "eventType",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 1
            },
            {
              name: "sessionHash",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 2
            },
            {
              name: "campaignId",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 3
            },
            {
              name: "missionId",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 4
            },
            {
              name: "recordedAt",
              declaredType: "TEXT",
              notNull: true,
              pkPosition: 0
            }
          ]
        },
        indexes: {
          public_evidence_bundles: [
            {
              name: "memory_public_evidence_pk",
              unique: true,
              origin: "pk",
              partial: false,
              columns: ["receiptHash"]
            },
            {
              name: "memory_public_evidence_intent",
              unique: true,
              origin: "u",
              partial: false,
              columns: ["intentHash"]
            },
            {
              name: "memory_public_evidence_deposit",
              unique: true,
              origin: "u",
              partial: false,
              columns: ["depositTxHash"]
            }
          ],
          public_campaign_events: [
            {
              name: "memory_public_campaign_events_pk",
              unique: true,
              origin: "pk",
              partial: false,
              columns: [
                "eventType",
                "sessionHash",
                "campaignId",
                "missionId"
              ]
            },
            {
              name: "memory_public_campaign_events_aggregate",
              unique: false,
              origin: "c",
              partial: false,
              columns: [
                "campaignId",
                "missionId",
                "eventType",
                "sessionHash"
              ]
            }
          ]
        },
        requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
      };
    },
    pruneIncompleteRuns(cutoffIso) {
      const evidenceIntentHashes = new Set<string>();
      for (const decision of decisionsByIntent.values()) {
        evidenceIntentHashes.add(decision.intentHash.toLowerCase());
      }
      for (const receipt of receiptsByHash.values()) {
        evidenceIntentHashes.add(receipt.intentHash.toLowerCase());
      }
      for (const evidence of publicEvidenceByIntent.values()) {
        evidenceIntentHashes.add(evidence.intentHash.toLowerCase());
      }
      const staleRuns = [...runsById.values()].filter(
        (run) =>
          run.createdAt < cutoffIso &&
          !isTerminalLiveRunStatus(run.status) &&
          !evidenceIntentHashes.has(run.intentHash.toLowerCase())
      );

      for (const run of staleRuns) {
        runsById.delete(run.runId);
        runsByIdempotency.delete(idempotencyLookupKey(run));

        const submitted = submittedByRun.get(run.runId);
        if (submitted !== undefined) {
          submittedRunByDeposit.delete(submitted.depositTxHash.toLowerCase());
          submittedByRun.delete(run.runId);
        }

        for (const [verifierInputHash, verifierInput] of verifierInputsByHash) {
          if (verifierInput.runId === run.runId) verifierInputsByHash.delete(verifierInputHash);
        }

        const verificationJobId = verificationJobIdByRun.get(run.runId);
        if (verificationJobId !== undefined) {
          verificationJobsById.delete(verificationJobId);
          verificationJobIdByRun.delete(run.runId);
        }
      }

      return staleRuns.length;
    }
  };
}

function stringValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`${key} is not a string`);
  return value;
}

function nullableStringValue(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`${key} is not a string`);
  return value;
}

function numberValue(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`${key} is not a number`);
}

function nullableNumberValue(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`${key} is not a number`);
}

function nullableReceiptStatusValue(row: Record<string, unknown>, key: string): 1 | 0 | null {
  const value = nullableNumberValue(row, key);
  if (value === null || value === 0 || value === 1) return value;
  throw new Error(`${key} is not a receipt status`);
}

function rowToRun(row: Record<string, unknown>): LiveRunRecord {
  return {
    runId: stringValue(row, "runId"),
    tenantId: nullableStringValue(row, "tenantId") ?? DEFAULT_TENANT,
    capabilityHash: nullableStringValue(row, "capabilityHash"),
    idempotencyKey: stringValue(row, "idempotencyKey"),
    wallet: stringValue(row, "wallet"),
    campaignId: stringValue(row, "campaignId"),
    missionId: stringValue(row, "missionId"),
    referralCode: nullableStringValue(row, "referralCode"),
    nonce: stringValue(row, "nonce"),
    intentHash: stringValue(row, "intentHash"),
    manifestJson: stringValue(row, "manifestJson"),
    manifestSignature: stringValue(row, "manifestSignature"),
    status: normalizeLiveRunStatus(stringValue(row, "status")),
    expiryUnix: numberValue(row, "expiryUnix"),
    createdAt: stringValue(row, "createdAt"),
    updatedAt: stringValue(row, "updatedAt")
  };
}

function rowToSubmittedTx(row: Record<string, unknown>): SubmittedTxRecord {
  return {
    runId: stringValue(row, "runId"),
    approveTxHash: nullableStringValue(row, "approveTxHash"),
    depositTxHash: stringValue(row, "depositTxHash"),
    submittedAt: stringValue(row, "submittedAt")
  };
}

function rowToDecision(row: Record<string, unknown>): DecisionRecord {
  const decision = stringValue(row, "decision");
  if (decision !== "matched" && decision !== "mismatched" && decision !== "failed") {
    throw new Error("decision is not terminal");
  }

  return {
    intentHash: stringValue(row, "intentHash"),
    depositTxHash: stringValue(row, "depositTxHash"),
    decision,
    failureReason: nullableStringValue(row, "failureReason"),
    verifierInputHash: stringValue(row, "verifierInputHash"),
    receiptHash: nullableStringValue(row, "receiptHash"),
    decisionTxHash: nullableStringValue(row, "decisionTxHash"),
    issuedAt: numberValue(row, "issuedAt"),
    standardRpcReceiptStatus: nullableReceiptStatusValue(row, "standardRpcReceiptStatus"),
    depositBlockNumber: nullableNumberValue(row, "depositBlockNumber"),
    depositBlockHash: nullableStringValue(row, "depositBlockHash"),
    confirmationDepth: nullableNumberValue(row, "confirmationDepth")
  };
}

function rowToReceipt(row: Record<string, unknown>): ReceiptRecord {
  return {
    receiptHash: stringValue(row, "receiptHash"),
    intentHash: stringValue(row, "intentHash"),
    payloadJson: stringValue(row, "payloadJson"),
    canonicalPayload: stringValue(row, "canonicalPayload"),
    canonicalPayloadBytesHex: stringValue(row, "canonicalPayloadBytesHex")
  };
}

function rowToVerifierInput(row: Record<string, unknown>): VerifierInputRecord {
  return {
    runId: stringValue(row, "runId"),
    verifierInputHash: stringValue(row, "verifierInputHash"),
    canonicalPayload: stringValue(row, "canonicalPayload"),
    canonicalPayloadBytesHex: stringValue(row, "canonicalPayloadBytesHex"),
    createdAt: stringValue(row, "createdAt")
  };
}

function rowToPublicEvidence(row: Record<string, unknown>): PublicEvidenceRecord {
  return {
    receiptHash: stringValue(row, "receiptHash"),
    intentHash: stringValue(row, "intentHash"),
    depositTxHash: stringValue(row, "depositTxHash"),
    bundleJson: stringValue(row, "bundleJson"),
    createdAt: stringValue(row, "createdAt")
  };
}

function rowToVerificationJob(row: Record<string, unknown>): VerificationJobRecord {
  const status = stringValue(row, "status");
  if (status !== "pending" && status !== "leased" && status !== "succeeded" && status !== "retryable" && status !== "dead") {
    throw new Error("verification job status is invalid");
  }
  return {
    jobId: stringValue(row, "jobId"),
    tenantId: stringValue(row, "tenantId"),
    runId: stringValue(row, "runId"),
    status,
    attempts: numberValue(row, "attempts"),
    availableAt: stringValue(row, "availableAt"),
    leasedBy: nullableStringValue(row, "leasedBy"),
    leasedUntil: nullableStringValue(row, "leasedUntil"),
    lastErrorCode: nullableStringValue(row, "lastErrorCode"),
    createdAt: stringValue(row, "createdAt"),
    updatedAt: stringValue(row, "updatedAt")
  };
}

export function createSqliteLiveStore(dbPath: string): ClosableLiveStore {
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
    create table if not exists runs (
      runId text primary key,
      tenantId text not null default 'local',
      capabilityHash text,
      idempotencyKey text not null,
      wallet text not null,
      campaignId text not null,
      missionId text not null,
      referralCode text,
      nonce text not null,
      intentHash text not null unique,
      manifestJson text not null,
      manifestSignature text not null,
      status text not null,
      expiryUnix integer not null,
      createdAt text not null,
      updatedAt text not null,
      unique (tenantId, idempotencyKey)
    );

    create table if not exists submitted_txs (
      runId text primary key,
      approveTxHash text,
      depositTxHash text not null unique,
      submittedAt text not null
    );

    create table if not exists decisions (
      intentHash text primary key,
      depositTxHash text not null unique,
      decision text not null,
      failureReason text,
      verifierInputHash text not null,
      receiptHash text unique,
      decisionTxHash text,
      issuedAt integer not null,
      standardRpcReceiptStatus integer,
      depositBlockNumber integer,
      depositBlockHash text,
      confirmationDepth integer
    );

    create table if not exists receipts (
      receiptHash text primary key,
      intentHash text not null unique,
      payloadJson text not null,
      canonicalPayload text not null,
      canonicalPayloadBytesHex text not null
    );

    create table if not exists verifier_inputs (
      verifierInputHash text primary key,
      runId text not null,
      canonicalPayload text not null,
      canonicalPayloadBytesHex text not null,
      createdAt text not null
    );

    create table if not exists public_evidence_bundles (
      receiptHash text primary key,
      intentHash text not null unique,
      depositTxHash text not null unique,
      bundleJson text not null,
      createdAt text not null
    );

    create table if not exists public_campaign_events (
      eventType text not null,
      sessionHash text not null,
      campaignId text not null,
      missionId text not null,
      recordedAt text not null,
      primary key (eventType, sessionHash, campaignId, missionId)
    );

    create index if not exists idx_public_campaign_events_aggregate
      on public_campaign_events (
        campaignId,
        missionId,
        eventType,
        sessionHash
      );

    create table if not exists verification_jobs (
      jobId text primary key,
      tenantId text not null,
      runId text not null unique,
      status text not null,
      attempts integer not null,
      availableAt text not null,
      leasedBy text,
      leasedUntil text,
      lastErrorCode text,
      createdAt text not null,
      updatedAt text not null
    );

    create table if not exists schema_migrations (
      id text primary key,
      checksum text not null,
      appliedAt text not null
    );
  `);
    ensureRunTenantIdColumn(db);
    ensureNullableColumn(db, "runs", "capabilityHash", "text");
    ensureNullableDecisionTxHash(db, dbPath);
    ensureNullableColumn(db, "decisions", "standardRpcReceiptStatus", "integer");
    ensureNullableColumn(db, "decisions", "depositBlockNumber", "integer");
    ensureNullableColumn(db, "decisions", "depositBlockHash", "text");
    ensureNullableColumn(db, "decisions", "confirmationDepth", "integer");
    recordLocalMigrations(db);
  } catch (error) {
    db.close();
    throw error;
  }

  return {
    createRun(input) {
      const normalized = { ...input, tenantId: tenantIdFor(input) };
      const existing = db
        .prepare("select * from runs where tenantId = ? and idempotencyKey = ?")
        .get(normalized.tenantId, normalized.idempotencyKey);
      if (existing !== undefined) return rowToRun(existing);
      if (db.prepare("select runId from runs where runId = ?").get(normalized.runId) !== undefined) {
        throw new Error("runId already exists");
      }
      if (db.prepare("select intentHash from runs where intentHash = ?").get(normalized.intentHash) !== undefined) {
        throw new Error("intentHash already exists");
      }
      db.prepare(
        `insert into runs (
          runId, tenantId, capabilityHash, idempotencyKey, wallet, campaignId, missionId, referralCode, nonce, intentHash,
          manifestJson, manifestSignature, status, expiryUnix, createdAt, updatedAt
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        normalized.runId,
        normalized.tenantId,
        normalized.capabilityHash ?? null,
        normalized.idempotencyKey,
        normalized.wallet,
        normalized.campaignId,
        normalized.missionId,
        normalized.referralCode,
        normalized.nonce,
        normalized.intentHash,
        normalized.manifestJson,
        normalized.manifestSignature,
        normalized.status,
        normalized.expiryUnix,
        normalized.createdAt,
        normalized.updatedAt
      );
      return normalized;
    },
    getRun(runId) {
      const row = db.prepare("select * from runs where runId = ?").get(runId);
      return row === undefined ? undefined : rowToRun(row);
    },
    getRunForCapabilityHash(runId, capabilityHash) {
      const row = db.prepare("select * from runs where runId = ? and capabilityHash = ?").get(runId, capabilityHash);
      return row === undefined ? undefined : rowToRun(row);
    },
    getRunForTenant(tenantId, runId) {
      const row = db.prepare("select * from runs where tenantId = ? and runId = ?").get(tenantId, runId);
      return row === undefined ? undefined : rowToRun(row);
    },
    listRuns() {
      return db.prepare("select * from runs order by createdAt asc").all().map(rowToRun);
    },
    listRunsForTenant(tenantId) {
      return db.prepare("select * from runs where tenantId = ? order by createdAt asc").all(tenantId).map(rowToRun);
    },
    updateRunStatus(runId, status, updatedAt) {
      const existing = this.getRun(runId);
      if (existing === undefined) throw new Error("run does not exist");
      db.prepare("update runs set status = ?, updatedAt = ? where runId = ?").run(status, updatedAt, runId);
      return { ...existing, status, updatedAt };
    },
    saveSubmittedTx(input) {
      if (this.getRun(input.runId) === undefined) throw new Error("run does not exist");
      const existingForRun = this.getSubmittedTx(input.runId);
      if (existingForRun !== undefined) return existingForRun;
      const existingDeposit = db
        .prepare("select runId from submitted_txs where lower(depositTxHash) = lower(?)")
        .get(input.depositTxHash);
      if (existingDeposit !== undefined && stringValue(existingDeposit, "runId") !== input.runId) {
        throw new Error("depositTxHash already belongs to another run");
      }
      db.prepare(
        "insert into submitted_txs (runId, approveTxHash, depositTxHash, submittedAt) values (?, ?, ?, ?)"
      ).run(input.runId, input.approveTxHash, input.depositTxHash, input.submittedAt);
      return input;
    },
    getSubmittedTx(runId) {
      const row = db.prepare("select * from submitted_txs where runId = ?").get(runId);
      return row === undefined ? undefined : rowToSubmittedTx(row);
    },
    saveDecision(input) {
      const existingByIntent = this.getDecisionByIntentHash(input.intentHash);
      if (existingByIntent !== undefined) return existingByIntent;
      const existingByDeposit = db.prepare("select * from decisions where depositTxHash = ?").get(input.depositTxHash);
      if (existingByDeposit !== undefined) throw new Error("depositTxHash already has a terminal decision");
      db.prepare(
        `insert into decisions (
          intentHash, depositTxHash, decision, failureReason, verifierInputHash, receiptHash, decisionTxHash, issuedAt,
          standardRpcReceiptStatus, depositBlockNumber, depositBlockHash, confirmationDepth
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        input.intentHash,
        input.depositTxHash,
        input.decision,
        input.failureReason,
        input.verifierInputHash,
        input.receiptHash,
        input.decisionTxHash,
        input.issuedAt,
        input.standardRpcReceiptStatus ?? null,
        input.depositBlockNumber ?? null,
        input.depositBlockHash ?? null,
        input.confirmationDepth ?? null
      );
      return input;
    },
    getDecisionByIntentHash(intentHash) {
      const row = db.prepare("select * from decisions where intentHash = ?").get(intentHash);
      return row === undefined ? undefined : rowToDecision(row);
    },
    saveReceipt(input) {
      const existing = this.getReceipt(input.receiptHash);
      if (existing !== undefined) return existing;
      db.prepare(
        "insert into receipts (receiptHash, intentHash, payloadJson, canonicalPayload, canonicalPayloadBytesHex) values (?, ?, ?, ?, ?)"
      ).run(
        input.receiptHash,
        input.intentHash,
        input.payloadJson,
        input.canonicalPayload,
        input.canonicalPayloadBytesHex
      );
      return input;
    },
    getReceipt(receiptHash) {
      const row = db.prepare("select * from receipts where receiptHash = ?").get(receiptHash);
      return row === undefined ? undefined : rowToReceipt(row);
    },
    getReceiptForTenant(tenantId, receiptHash) {
      const row = db
        .prepare(
          `select receipts.* from receipts
           join runs on lower(runs.intentHash) = lower(receipts.intentHash)
           where runs.tenantId = ? and lower(receipts.receiptHash) = lower(?)`
        )
        .get(tenantId, receiptHash);
      return row === undefined ? undefined : rowToReceipt(row);
    },
    saveVerifierInput(input) {
      const existing = this.getVerifierInput(input.verifierInputHash);
      if (existing !== undefined) return existing;
      db.prepare(
        `insert into verifier_inputs (
          verifierInputHash, runId, canonicalPayload, canonicalPayloadBytesHex, createdAt
        ) values (?, ?, ?, ?, ?)`
      ).run(
        input.verifierInputHash,
        input.runId,
        input.canonicalPayload,
        input.canonicalPayloadBytesHex,
        input.createdAt
      );
      return input;
    },
    getVerifierInput(verifierInputHash) {
      const row = db.prepare("select * from verifier_inputs where verifierInputHash = ?").get(verifierInputHash);
      return row === undefined ? undefined : rowToVerifierInput(row);
    },
    savePublicEvidence(input) {
      const existing =
        this.getPublicEvidenceByReceiptHash(input.receiptHash) ??
        this.getPublicEvidenceByIntentHash(input.intentHash) ??
        this.getPublicEvidenceByDepositTxHash(input.depositTxHash);
      if (existing !== undefined) {
        if (!publicEvidenceRecordsEqual(existing, input)) {
          throw new Error("public evidence conflict");
        }
        return existing;
      }
      throw new Error("public evidence must be published atomically");
    },
    getPublicEvidenceByReceiptHash(receiptHash) {
      const row = db
        .prepare("select * from public_evidence_bundles where lower(receiptHash) = lower(?)")
        .get(receiptHash);
      return row === undefined ? undefined : rowToPublicEvidence(row);
    },
    getPublicEvidenceByIntentHash(intentHash) {
      const row = db
        .prepare("select * from public_evidence_bundles where lower(intentHash) = lower(?)")
        .get(intentHash);
      return row === undefined ? undefined : rowToPublicEvidence(row);
    },
    getPublicEvidenceByDepositTxHash(depositTxHash) {
      const row = db
        .prepare("select * from public_evidence_bundles where lower(depositTxHash) = lower(?)")
        .get(depositTxHash);
      return row === undefined ? undefined : rowToPublicEvidence(row);
    },
    publishMatchedEvidence(input) {
      assertMatchedEvidencePublication(this, input);
      db.exec("begin immediate");
      try {
        const existingVerifierInput = this.getVerifierInput(
          input.verifierInput.verifierInputHash
        );
        const existingReceipt = this.getReceipt(input.receipt.receiptHash);
        const existingReceiptByIntentRow = db
          .prepare("select * from receipts where lower(intentHash) = lower(?)")
          .get(input.receipt.intentHash);
        const existingReceiptByIntent =
          existingReceiptByIntentRow === undefined
            ? undefined
            : rowToReceipt(existingReceiptByIntentRow);
        const existingDecisionByIntent = this.getDecisionByIntentHash(
          input.decision.intentHash
        );
        const existingDecisionByDepositRow = db
          .prepare("select * from decisions where lower(depositTxHash) = lower(?)")
          .get(input.decision.depositTxHash);
        const existingDecisionByDeposit =
          existingDecisionByDepositRow === undefined
            ? undefined
            : rowToDecision(existingDecisionByDepositRow);
        const existingPublicEvidence =
          this.getPublicEvidenceByReceiptHash(input.publicEvidence.receiptHash) ??
          this.getPublicEvidenceByIntentHash(input.publicEvidence.intentHash) ??
          this.getPublicEvidenceByDepositTxHash(input.publicEvidence.depositTxHash);
        if (
          (existingVerifierInput !== undefined &&
            !verifierInputRecordsEqual(existingVerifierInput, input.verifierInput)) ||
          (existingReceipt !== undefined &&
            !receiptRecordsEqual(existingReceipt, input.receipt)) ||
          (existingReceiptByIntent !== undefined &&
            !receiptRecordsEqual(existingReceiptByIntent, input.receipt)) ||
          (existingDecisionByIntent !== undefined &&
            !decisionRecordsEqual(existingDecisionByIntent, input.decision)) ||
          (existingDecisionByDeposit !== undefined &&
            !decisionRecordsEqual(existingDecisionByDeposit, input.decision)) ||
          (existingPublicEvidence !== undefined &&
            !publicEvidenceRecordsEqual(existingPublicEvidence, input.publicEvidence))
        ) {
          throw new Error("matched evidence publication conflict");
        }

        const verifierInput = this.saveVerifierInput(input.verifierInput);
        const receipt = this.saveReceipt(input.receipt);
        const decision = this.saveDecision(input.decision);
        const publicEvidence =
          existingPublicEvidence === undefined
            ? input.publicEvidence
            : this.savePublicEvidence(input.publicEvidence);
        if (existingPublicEvidence === undefined) {
          db.prepare(
            `insert into public_evidence_bundles (
              receiptHash, intentHash, depositTxHash, bundleJson, createdAt
            ) values (?, ?, ?, ?, ?)`
          ).run(
            publicEvidence.receiptHash,
            publicEvidence.intentHash,
            publicEvidence.depositTxHash,
            publicEvidence.bundleJson,
            publicEvidence.createdAt
          );
        }
        const run = this.updateRunStatus(input.runId, "matched", input.updatedAt);
        db.exec("commit");
        return { run, verifierInput, receipt, decision, publicEvidence };
      } catch (error) {
        db.exec("rollback");
        throw error;
      }
    },
    savePublicCampaignEvent(input) {
      assertPublicCampaignEventRecord(input);
      db.prepare(
        `insert or ignore into public_campaign_events (
          eventType, sessionHash, campaignId, missionId, recordedAt
        ) values (?, ?, ?, ?, ?)`
      ).run(
        input.eventType,
        input.sessionHash,
        input.campaignId,
        input.missionId,
        input.recordedAt
      );
      const row = db
        .prepare(
          `select eventType, sessionHash, campaignId, missionId, recordedAt
           from public_campaign_events
           where eventType = ? and sessionHash = ? and campaignId = ? and missionId = ?`
        )
        .get(
          input.eventType,
          input.sessionHash,
          input.campaignId,
          input.missionId
        );
      if (row === undefined) {
        throw new Error("public campaign event persistence failed");
      }
      return {
        eventType: stringValue(row, "eventType") as PublicCampaignEventRecord["eventType"],
        sessionHash: stringValue(row, "sessionHash"),
        campaignId: stringValue(row, "campaignId") as PublicCampaignEventRecord["campaignId"],
        missionId: stringValue(row, "missionId") as PublicCampaignEventRecord["missionId"],
        recordedAt: stringValue(row, "recordedAt")
      };
    },
    aggregatePublicCampaignEvents(campaignId, missionId) {
      const row = db
        .prepare(
          `select
             count(distinct case when eventType = 'campaignVisited' then sessionHash end)
               as uniqueCampaignVisitorCount,
             count(distinct case when eventType = 'walletConnected' then sessionHash end)
               as uniqueWalletConnectSessionCount
           from public_campaign_events
           where campaignId = ? and missionId = ?`
        )
        .get(campaignId, missionId);
      if (row === undefined) {
        return {
          uniqueCampaignVisitorCount: 0,
          uniqueWalletConnectSessionCount: 0
        };
      }
      return {
        uniqueCampaignVisitorCount: numberValue(
          row,
          "uniqueCampaignVisitorCount"
        ),
        uniqueWalletConnectSessionCount: numberValue(
          row,
          "uniqueWalletConnectSessionCount"
        )
      };
    },
    enqueueVerificationJob(input) {
      const existing = this.getVerificationJobForRun(input.runId);
      if (existing !== undefined && existing.status !== "dead") return existing;
      const job: VerificationJobRecord = {
        jobId: jobIdFor(input.tenantId, input.runId),
        tenantId: input.tenantId,
        runId: input.runId,
        status: "pending",
        attempts: 0,
        availableAt: input.createdAt,
        leasedBy: null,
        leasedUntil: null,
        lastErrorCode: null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt
      };
      db.prepare(
        `insert into verification_jobs (
          jobId, tenantId, runId, status, attempts, availableAt, leasedBy, leasedUntil,
          lastErrorCode, createdAt, updatedAt
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        job.jobId,
        job.tenantId,
        job.runId,
        job.status,
        job.attempts,
        job.availableAt,
        job.leasedBy,
        job.leasedUntil,
        job.lastErrorCode,
        job.createdAt,
        job.updatedAt
      );
      return job;
    },
    getVerificationJobForRun(runId) {
      const row = db.prepare("select * from verification_jobs where runId = ?").get(runId);
      return row === undefined ? undefined : rowToVerificationJob(row);
    },
    checkWritable() {
      let writable = false;
      try {
        db.exec("begin immediate");
        writable = true;
      } catch (_error) {
        writable = false;
      } finally {
        try {
          db.exec("rollback");
        } catch (_error) {
          writable = false;
        }
      }
      return writable;
    },
    getSchemaState() {
      return readLiveSchemaState(db);
    },
    pruneIncompleteRuns(cutoffIso) {
      const pruneCandidateQuery = `
        select candidate_runs.runId
        from runs as candidate_runs
        where candidate_runs.createdAt < ?
          and candidate_runs.status not in ('matched', 'mismatched', 'failed')
          and not exists (
            select 1 from decisions
            where lower(decisions.intentHash) = lower(candidate_runs.intentHash)
          )
          and not exists (
            select 1 from receipts
            where lower(receipts.intentHash) = lower(candidate_runs.intentHash)
          )
          and not exists (
            select 1 from public_evidence_bundles
            where lower(public_evidence_bundles.intentHash) = lower(candidate_runs.intentHash)
          )
      `;
      const incompleteRunFilter = `runId in (${pruneCandidateQuery})`;
      db.exec("begin immediate");
      try {
        const staleRuns = db.prepare(pruneCandidateQuery).all(cutoffIso);
        db.prepare(`delete from submitted_txs where ${incompleteRunFilter}`).run(cutoffIso);
        db.prepare(`delete from verifier_inputs where ${incompleteRunFilter}`).run(cutoffIso);
        db.prepare(`delete from verification_jobs where ${incompleteRunFilter}`).run(cutoffIso);
        db.prepare(`delete from runs where ${incompleteRunFilter}`).run(cutoffIso);
        db.exec("commit");
        return staleRuns.length;
      } catch (error) {
        db.exec("rollback");
        throw error;
      }
    },
    close() {
      db.close();
    }
  };
}

function ensureRunTenantIdColumn(db: DatabaseSync): void {
  const columns = db.prepare("pragma table_info(runs)").all() as Record<string, unknown>[];
  if (!columns.some((row) => row.name === "tenantId")) {
    db.exec("alter table runs add column tenantId text not null default 'local'");
  }
}

function ensureNullableColumn(
  db: DatabaseSync,
  table: "runs" | "decisions",
  column: "capabilityHash" | "standardRpcReceiptStatus" | "depositBlockNumber" | "depositBlockHash" | "confirmationDepth",
  type: "text" | "integer"
): void {
  const columns = db.prepare(`pragma table_info(${table})`).all();
  if (!columns.some((row) => row.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${type}`);
  }
}

function ensureNullableDecisionTxHash(db: DatabaseSync, dbPath: string): void {
  const columns = db.prepare("pragma table_info(decisions)").all() as Record<string, unknown>[];
  const column = columns.find((row) => row.name === "decisionTxHash");
  if (column !== undefined && Number(column.notnull) === 1) {
    throw new Error(
      `live DB decisions.decisionTxHash is not nullable; use a new Sprint 11 DB path or back up/reset ${dbPath}`
    );
  }
}

function recordLocalMigrations(db: DatabaseSync): void {
  const appliedAt = new Date(0).toISOString();
  const migrations = [
    ["001_live_base", "local-live-base"],
    ["002_nullable_decision_tx_hash", "nullable-decision-tx-hash"],
    ["003_verification_jobs", "verification-jobs"],
    ["004_run_capability_hash", "run-capability-hash"],
    ["005_decision_rpc_metadata", "decision-rpc-metadata"],
    ["006_public_evidence_bundles", "public-evidence-bundles"],
    ["007_public_campaign_events", "public-campaign-events"]
  ] as const;
  const insert = db.prepare("insert or ignore into schema_migrations (id, checksum, appliedAt) values (?, ?, ?)");
  for (const migration of migrations) {
    insert.run(migration[0], migration[1], appliedAt);
  }
}

function readLiveSchemaState(db: DatabaseSync): LiveSchemaStateInput {
  const migrations = db
    .prepare("select id from schema_migrations order by rowid asc")
    .all()
    .map((row) => stringValue(row, "id"));
  const tableNames = [
    "runs",
    "submitted_txs",
    "decisions",
    "receipts",
    "verifier_inputs",
    "public_evidence_bundles",
    "public_campaign_events",
    "verification_jobs",
    "schema_migrations"
  ] as const;
  const tables: LiveSchemaStateInput["tables"] = {};
  const indexes: NonNullable<LiveSchemaStateInput["indexes"]> = {};

  for (const tableName of tableNames) {
    tables[tableName] = db
      .prepare(`pragma table_info(${tableName})`)
      .all()
      .map((row) => ({
        name: stringValue(row, "name"),
        declaredType: stringValue(row, "type"),
        notNull: numberValue(row, "notnull") === 1,
        pkPosition: numberValue(row, "pk")
      }));
    const indexRows = db
      .prepare(
        `select name, "unique" as isUnique, origin, partial
         from pragma_index_list(?)
         order by seq asc`
      )
      .all(tableName);
    indexes[tableName] = indexRows.map((indexRow) => {
      const indexName = stringValue(indexRow, "name");
      const columns = db
        .prepare(
          `select name
           from pragma_index_info(?)
           order by seqno asc`
        )
        .all(indexName)
        .map((columnRow) => stringValue(columnRow, "name"));
      return {
        name: indexName,
        unique: numberValue(indexRow, "isUnique") === 1,
        origin: stringValue(indexRow, "origin"),
        partial: numberValue(indexRow, "partial") === 1,
        columns
      };
    });
  }

  return {
    migrations,
    tables,
    indexes,
    requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
  };
}

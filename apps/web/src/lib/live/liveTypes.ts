export const LIVE_RUN_STATUSES = [
  "created",
  "walletConnected",
  "wrongChain",
  "manifestIssued",
  "manifestInvalidated",
  "intentSubmitted",
  "approveRequired",
  "approveSubmitted",
  "approveConfirmed",
  "depositReady",
  "depositSubmitted",
  "depositConfirmed",
  "verifierChecking",
  "matched",
  "mismatched",
  "failed",
  "timeout"
] as const;

export type LiveRunStatus = (typeof LIVE_RUN_STATUSES)[number];

export type LiveSource = "fixture" | "live";

export const DEFAULT_LIVE_TENANT_ID = "local";

export type LiveRunRecord = {
  runId: string;
  tenantId?: string;
  capabilityHash?: string | null;
  idempotencyKey: string;
  wallet: string;
  campaignId: string;
  missionId: string;
  referralCode: string | null;
  nonce: string;
  intentHash: string;
  manifestJson: string;
  manifestSignature: string;
  status: LiveRunStatus;
  expiryUnix: number;
  createdAt: string;
  updatedAt: string;
};

export type SubmittedTxRecord = {
  runId: string;
  approveTxHash: string | null;
  depositTxHash: string;
  submittedAt: string;
};

export type DecisionRecord = {
  intentHash: string;
  depositTxHash: string;
  decision: "matched" | "mismatched" | "failed";
  failureReason: string | null;
  verifierInputHash: string;
  receiptHash: string | null;
  decisionTxHash: string | null;
  issuedAt: number;
  standardRpcReceiptStatus?: 1 | 0 | null;
  depositBlockNumber?: number | null;
  depositBlockHash?: string | null;
  confirmationDepth?: number | null;
};

export type ReceiptRecord = {
  receiptHash: string;
  intentHash: string;
  payloadJson: string;
  canonicalPayload: string;
  canonicalPayloadBytesHex: string;
};

export type VerifierInputRecord = {
  runId: string;
  verifierInputHash: string;
  canonicalPayload: string;
  canonicalPayloadBytesHex: string;
  createdAt: string;
};

export type PublicEvidenceRecord = {
  receiptHash: string;
  intentHash: string;
  depositTxHash: string;
  bundleJson: string;
  createdAt: string;
};

export type PublicCampaignEventInput = {
  eventType: "campaignVisited" | "walletConnected";
  anonymousSessionId: string;
  campaignId: "gasok-demo";
  missionId: "first-mock-vault-deposit";
};

export type PublicCampaignEventRecord = {
  eventType: PublicCampaignEventInput["eventType"];
  sessionHash: string;
  campaignId: PublicCampaignEventInput["campaignId"];
  missionId: PublicCampaignEventInput["missionId"];
  recordedAt: string;
};

export type PublicCampaignEventAggregate = {
  uniqueCampaignVisitorCount: number;
  uniqueWalletConnectSessionCount: number;
};

export type MatchedEvidencePublication = {
  runId: string;
  updatedAt: string;
  verifierInput: VerifierInputRecord;
  receipt: ReceiptRecord;
  decision: DecisionRecord;
  publicEvidence: PublicEvidenceRecord;
};

export type PartnerRunProjection = {
  runId: string;
  wallet: string;
  campaignId: string;
  missionId: string;
  status: LiveRunStatus;
  intentHash: string;
  receiptHash: string | null;
  updatedAt: string;
};

export type ReceiptGateInput = {
  status: LiveRunStatus;
  receiptHash: string | null;
};

const STATUS_SET = new Set<string>(LIVE_RUN_STATUSES);
const TERMINAL_SET = new Set<LiveRunStatus>(["matched", "mismatched", "failed"]);

export function normalizeLiveRunStatus(value: string): LiveRunStatus {
  if (!STATUS_SET.has(value)) {
    throw new Error(`Unknown live run status: ${value}`);
  }

  return value as LiveRunStatus;
}

export function isTerminalLiveRunStatus(status: LiveRunStatus): boolean {
  return TERMINAL_SET.has(status);
}

export function canOpenReceiptRoute(input: ReceiptGateInput): boolean {
  return input.status === "matched" && typeof input.receiptHash === "string" && input.receiptHash.length > 0;
}

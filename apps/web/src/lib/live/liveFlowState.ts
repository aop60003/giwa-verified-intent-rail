import type { WalletReadinessState } from "../wallet/walletTypes.ts";
import type { LiveRunStatus } from "./liveTypes.ts";
import { recoveryCopyFor, type RecoveryCopy } from "./liveRecoveryCopy.ts";

export type LiveManifestPreviewFields = {
  target: string;
  selector: string;
  asset: string;
  amountBaseUnits: string;
  spender: string;
  maxAllowanceBaseUnits: string;
  expiryUnix: number;
  intentHash: string;
};

export type LiveVerificationState =
  | { status: "idle" }
  | { status: "queued"; pollPath: string }
  | { status: "terminal" };

export type LiveFlowRunState = {
  runId?: string;
  status: LiveRunStatus | string;
  manifestPreview: LiveManifestPreviewFields | null;
  approveTxHash?: string | null;
  depositTxHash?: string | null;
  decision?: "matched" | "mismatched" | "failed" | "timeout" | null;
  receiptReady?: boolean;
  receiptHash?: string | null;
  failureCode?: string | null;
  failureCopy?: string | null;
  expiryUnix?: number;
  verification?: LiveVerificationState;
};

export type LiveFlowInput = {
  wallet: WalletReadinessState;
  run: null | LiveFlowRunState;
  nowSeconds?: number;
};

export type LiveParticipantStepId =
  | "walletReady"
  | "manifestIssued"
  | "approveSubmitted"
  | "depositSubmitted"
  | "standardRpcChecking"
  | "verifierMatched"
  | "receiptReady";

export type LiveActionReason =
  | null
  | "wallet_required"
  | "wrong_chain"
  | "manifest_required"
  | "manifest_invalidated"
  | "manifest_expired"
  | "already_submitted"
  | "deposit_required"
  | "verification_queued";

export type LiveActionState = {
  enabled: boolean;
  label: string;
  reason: LiveActionReason;
  describedById: string;
};

export type LiveStatusRailStep = {
  id: LiveParticipantStepId;
  label: string;
  state: "complete" | "active" | "pending" | "blocked";
  current: boolean;
  finalConfirmation: boolean;
  detail: string;
};

export type LiveFlowViewModel = {
  screenKind: "live-wallet-manifest-flow";
  blockers: string[];
  primaryAction:
    | { kind: "connectWallet"; enabled: true }
    | { kind: "switchNetwork"; enabled: true }
    | { kind: "issueManifest"; enabled: boolean }
    | { kind: "verifyReceipt"; enabled: boolean }
    | { kind: "viewReceipt"; enabled: true };
  manifestPreview: {
    visible: boolean;
    fields: LiveManifestPreviewFields | null;
  };
  actions: {
    approve: LiveActionState;
    deposit: LiveActionState;
    verify: LiveActionState;
  };
  approveAction: LiveActionState;
  depositAction: LiveActionState;
  statusRail: LiveStatusRailStep[];
  receiptHandoff: null | {
    receiptHash: string;
    apiPath: string;
  };
  recovery: RecoveryCopy | null;
  noticeRegion: {
    role: "status";
    live: "polite";
  };
};

const GIWA_SEPOLIA_CHAIN_ID = 91342;
const STEP_IDS: LiveParticipantStepId[] = [
  "walletReady",
  "manifestIssued",
  "approveSubmitted",
  "depositSubmitted",
  "standardRpcChecking",
  "verifierMatched",
  "receiptReady"
];

const STEP_LABELS: Record<LiveParticipantStepId, string> = {
  walletReady: "Wallet ready",
  manifestIssued: "Manifest issued",
  approveSubmitted: "Approve submitted",
  depositSubmitted: "Deposit submitted",
  standardRpcChecking: "Standard RPC checking",
  verifierMatched: "Verifier matched",
  receiptReady: "Receipt ready"
};

const STEP_DETAILS: Record<LiveParticipantStepId, string> = {
  walletReady: "Wallet is connected on GIWA Sepolia.",
  manifestIssued: "Signed manifest preview is available for this wallet.",
  approveSubmitted: "Approve transaction hash is stored after wallet submission.",
  depositSubmitted: "Deposit transaction hash is stored after wallet submission.",
  standardRpcChecking: "Verifier checks standard RPC receipt evidence.",
  verifierMatched: "Verifier matched the transaction evidence to the manifest.",
  receiptReady: "Receipt opens only after matched verification."
};

function isExpired(input: LiveFlowInput): boolean {
  const expiry = input.run?.expiryUnix ?? input.run?.manifestPreview?.expiryUnix;
  if (expiry === undefined) return false;
  return (input.nowSeconds ?? Math.floor(Date.now() / 1000)) > expiry;
}

function manifestActionReason(input: LiveFlowInput): Exclude<LiveActionReason, "already_submitted" | "deposit_required" | "verification_queued"> | null {
  if (input.wallet.account === null) return "wallet_required";
  if (input.wallet.status !== "connected" || input.wallet.chainId !== GIWA_SEPOLIA_CHAIN_ID) return "wrong_chain";
  if (input.run?.status === "manifestInvalidated") return "manifest_invalidated";
  if (input.run?.manifestPreview === null || input.run === null) return "manifest_required";
  if (isExpired(input)) return "manifest_expired";
  return null;
}

function action(
  label: string,
  describedById: string,
  reason: LiveActionReason,
  alreadySubmitted: boolean
): LiveActionState {
  if (alreadySubmitted) {
    return { enabled: false, label: `${label} submitted`, reason: "already_submitted", describedById };
  }
  return { enabled: reason === null, label, reason, describedById };
}

function verifyAction(input: LiveFlowInput): LiveActionState {
  const run = input.run;
  if (run?.verification?.status === "queued") {
    return { enabled: false, label: "Verification queued", reason: "verification_queued", describedById: "verify-action-reason" };
  }
  if (run?.status === "matched" || run?.status === "mismatched" || run?.status === "failed") {
    return { enabled: false, label: "Verification complete", reason: "already_submitted", describedById: "verify-action-reason" };
  }
  if (run?.status === "timeout") {
    return { enabled: true, label: "Retry verification", reason: null, describedById: "verify-action-reason" };
  }
  if (run?.depositTxHash === null || run?.depositTxHash === undefined) {
    return { enabled: false, label: "Verify receipt", reason: "deposit_required", describedById: "verify-action-reason" };
  }
  return { enabled: true, label: "Verify receipt", reason: null, describedById: "verify-action-reason" };
}

function stepState(input: LiveFlowInput, id: LiveParticipantStepId): LiveStatusRailStep["state"] {
  const run = input.run;
  const walletReady = input.wallet.status === "connected" && input.wallet.account !== null && input.wallet.chainId === GIWA_SEPOLIA_CHAIN_ID;
  const hasPreview = run?.manifestPreview !== null && run?.manifestPreview !== undefined;
  const hasApprove = typeof run?.approveTxHash === "string";
  const hasDeposit = typeof run?.depositTxHash === "string";
  const checking = run?.verification?.status === "queued" || run?.status === "verifierChecking";
  const matched = run?.status === "matched" || run?.decision === "matched";
  const receiptReady = matched && typeof run?.receiptHash === "string";

  if (id === "walletReady") return walletReady ? "complete" : "active";
  if (id === "manifestIssued") {
    if (!walletReady) return "pending";
    if (run?.status === "manifestInvalidated" || isExpired(input)) return "blocked";
    return hasPreview ? "complete" : "active";
  }
  if (id === "approveSubmitted") return hasApprove ? "complete" : hasPreview ? "active" : "pending";
  if (id === "depositSubmitted") return hasDeposit ? "complete" : hasApprove || hasPreview ? "active" : "pending";
  if (id === "standardRpcChecking") {
    if (matched || run?.status === "mismatched" || run?.status === "failed" || run?.status === "timeout") return "complete";
    return checking || hasDeposit ? "active" : "pending";
  }
  if (id === "verifierMatched") {
    if (matched) return "complete";
    if (run?.status === "mismatched" || run?.status === "failed") return "blocked";
    return hasDeposit ? "active" : "pending";
  }
  if (id === "receiptReady") return receiptReady ? "complete" : matched ? "active" : "pending";
  return "pending";
}

function currentStep(steps: LiveStatusRailStep[]): LiveParticipantStepId {
  return steps.find((step) => step.state === "active")?.id ?? [...steps].reverse().find((step) => step.state === "complete")?.id ?? "walletReady";
}

function statusRail(input: LiveFlowInput): LiveStatusRailStep[] {
  const initial = STEP_IDS.map((id) => ({
    id,
    label: STEP_LABELS[id],
    state: stepState(input, id),
    current: false,
    finalConfirmation: id === "standardRpcChecking",
    detail: STEP_DETAILS[id]
  }));
  const current = currentStep(initial);
  return initial.map((step) => ({ ...step, current: step.id === current }));
}

function recovery(input: LiveFlowInput): RecoveryCopy | null {
  if (input.wallet.status === "providerMissing") return recoveryCopyFor({ code: "provider_missing" });
  if (input.wallet.status === "wrongChain") return recoveryCopyFor({ code: "wrong_chain", expectedChainId: GIWA_SEPOLIA_CHAIN_ID });
  if (input.run?.status === "manifestInvalidated") return recoveryCopyFor({ code: "manifest_invalidated" });
  if (isExpired(input) && input.run?.status !== "matched") return recoveryCopyFor({ code: "manifest_expired" });
  if (input.run?.status === "timeout") return recoveryCopyFor({ code: "verifier_timeout" });
  if (input.run?.status === "mismatched" || input.run?.status === "failed") {
    return recoveryCopyFor({ code: "verifier_mismatch", failureCode: input.run.failureCode ?? null, failureCopy: input.run.failureCopy ?? null });
  }
  return null;
}

export function buildLiveFlowViewModel(input: LiveFlowInput) {
  const wrongChain = input.wallet.status === "wrongChain";
  const previewVisible = input.run?.manifestPreview !== null && input.run?.manifestPreview !== undefined;
  const reason = manifestActionReason(input);
  const approve = action("Approve", "approve-action-reason", reason, typeof input.run?.approveTxHash === "string");
  const deposit = action("Deposit", "deposit-action-reason", reason, typeof input.run?.depositTxHash === "string");
  const verify = verifyAction(input);
  const receiptHash = input.run?.status === "matched" && typeof input.run.receiptHash === "string" ? input.run.receiptHash : null;
  const model: LiveFlowViewModel = {
    screenKind: "live-wallet-manifest-flow",
    blockers: wrongChain ? ["wrong_chain"] : [],
    primaryAction:
      input.wallet.account === null
        ? { kind: "connectWallet", enabled: true }
        : wrongChain
          ? { kind: "switchNetwork", enabled: true }
          : receiptHash !== null
            ? { kind: "viewReceipt", enabled: true }
            : input.run?.depositTxHash !== undefined
              ? { kind: "verifyReceipt", enabled: verify.enabled }
              : { kind: "issueManifest", enabled: input.wallet.status === "connected" },
    manifestPreview: {
      visible: previewVisible,
      fields: input.run?.manifestPreview ?? null
    },
    actions: { approve, deposit, verify },
    approveAction: approve,
    depositAction: deposit,
    statusRail: statusRail(input),
    receiptHandoff: receiptHash === null ? null : { receiptHash, apiPath: `/api/receipts/${receiptHash}` },
    recovery: recovery(input),
    noticeRegion: { role: "status", live: "polite" }
  };

  return model;
}

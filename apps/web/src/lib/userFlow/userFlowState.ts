export const USER_GIWA_CHAIN_ID = 91342 as const;

export type UserWalletStatus = "disconnected" | "connecting" | "connected" | "wrongChain" | "providerMissing";
export type UserRunStatus =
  | "idle"
  | "manifestIssued"
  | "approveSubmitted"
  | "depositSubmitted"
  | "standardRpcReceiptFound"
  | "verifierChecking"
  | "matched"
  | "pending"
  | "notMatched"
  | "failed"
  | "timeout"
  | "manifestInvalidated";
export type UserScreen = "actionPage" | "walletGate" | "intentPreview" | "progress" | "receipt" | "recovery";
export type UserCta =
  | "connect_wallet"
  | "switch_network"
  | "review_action"
  | "continue_to_wallet"
  | "verify_receipt"
  | "view_receipt";
export type UserBlockReason =
  | "wallet_disconnected"
  | "wrong_network"
  | "manifest_missing"
  | "manifest_expired"
  | "manifest_invalidated"
  | "wallet_action_submitted"
  | "receipt_locked";

export type UserWalletState = {
  status: UserWalletStatus;
  account: string | null;
  chainId: number | null;
};

export type UserManifestPreview = {
  actionName: string;
  amountBaseUnits: string;
  target: string;
  wallet: string;
  expiryUnix?: number;
  intentHash: string;
};

export type UserRunState = {
  status: Exclude<UserRunStatus, "idle">;
  runId: string;
  expiryUnix: number;
  manifestPreview: UserManifestPreview | null;
  approveTxHash?: string | null;
  depositTxHash?: string | null;
  receiptHash?: string | null;
};

export type UserFlowInput = {
  wallet: UserWalletState;
  run: UserRunState | null;
  nowUnix: number;
};

export type UserProgressStep = {
  id:
    | "wallet_connected"
    | "intent_issued"
    | "approval_submitted"
    | "deposit_submitted"
    | "standard_rpc_receipt_found"
    | "verification_matched"
    | "receipt_ready";
  state: "pending" | "active" | "complete" | "blocked";
};

export type UserFlowState = {
  currentScreen: UserScreen;
  primaryCta: UserCta;
  canIssueIntent: boolean;
  canRequestWalletAction: boolean;
  canVerifyReceipt: boolean;
  blockReason: UserBlockReason | null;
  network: { requiredChainId: typeof USER_GIWA_CHAIN_ID; observedChainId: number | null };
  progress: UserProgressStep[];
};

const terminalUnmatched = new Set<UserRunStatus>(["notMatched", "failed"]);
const receiptFound = new Set<UserRunStatus>([
  "standardRpcReceiptFound",
  "verifierChecking",
  "matched",
  "notMatched",
  "failed",
  "timeout"
]);

function completeIf(condition: boolean): "pending" | "complete" {
  return condition ? "complete" : "pending";
}

export function deriveUserFlowState(input: UserFlowInput): UserFlowState {
  const walletConnected = input.wallet.status === "connected" && input.wallet.chainId === USER_GIWA_CHAIN_ID;
  const run = input.run;
  const manifestReady = run?.manifestPreview !== null && run?.manifestPreview !== undefined && run.status !== "manifestInvalidated";
  const expired = run !== null && input.nowUnix > run.expiryUnix;
  const approveSubmitted = typeof run?.approveTxHash === "string";
  const depositSubmitted = typeof run?.depositTxHash === "string";
  const matched = run?.status === "matched";
  const notMatched = terminalUnmatched.has(run?.status ?? "idle");
  const receiptReady = matched && typeof run?.receiptHash === "string";

  let blockReason: UserBlockReason | null = null;
  if (!walletConnected) blockReason = input.wallet.status === "wrongChain" ? "wrong_network" : "wallet_disconnected";
  else if (run === null) blockReason = "manifest_missing";
  else if (run.status === "manifestInvalidated") blockReason = "manifest_invalidated";
  else if (expired) blockReason = "manifest_expired";
  else if (!receiptReady && depositSubmitted) blockReason = "receipt_locked";

  const canIssueIntent = walletConnected && (run === null || run.status === "manifestInvalidated");
  const canRequestWalletAction = walletConnected && manifestReady && !expired && !receiptReady;
  const canVerifyReceipt = walletConnected && depositSubmitted && !matched && !notMatched;

  const currentScreen: UserScreen = receiptReady
    ? "receipt"
    : depositSubmitted
      ? "progress"
      : manifestReady
        ? "intentPreview"
        : "actionPage";

  const primaryCta: UserCta =
    input.wallet.account === null
      ? "connect_wallet"
      : input.wallet.chainId !== USER_GIWA_CHAIN_ID
        ? "switch_network"
        : receiptReady
          ? "view_receipt"
          : depositSubmitted
            ? "verify_receipt"
            : manifestReady
              ? "continue_to_wallet"
              : "review_action";

  return {
    currentScreen,
    primaryCta,
    canIssueIntent,
    canRequestWalletAction,
    canVerifyReceipt,
    blockReason,
    network: { requiredChainId: USER_GIWA_CHAIN_ID, observedChainId: input.wallet.chainId },
    progress: [
      { id: "wallet_connected", state: walletConnected ? "complete" : "active" },
      { id: "intent_issued", state: manifestReady ? "complete" : walletConnected ? "active" : "pending" },
      { id: "approval_submitted", state: completeIf(approveSubmitted) },
      { id: "deposit_submitted", state: completeIf(depositSubmitted) },
      { id: "standard_rpc_receipt_found", state: receiptFound.has(run?.status ?? "idle") ? "complete" : "pending" },
      { id: "verification_matched", state: matched ? "complete" : notMatched ? "blocked" : "pending" },
      { id: "receipt_ready", state: receiptReady ? "complete" : "pending" }
    ]
  };
}

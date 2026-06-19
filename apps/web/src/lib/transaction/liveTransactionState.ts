import type { TransactionBlocker } from "./walletTransactionGuard.ts";

export type LiveTransactionViewInput = {
  guard: { canRequestTransaction: boolean; blocker: TransactionBlocker | null };
  approveTxHash: string | null;
  depositTxHash: string | null;
  receiptHash: string | null;
  runStatus: string;
};

export function buildLiveTransactionViewModel(input: LiveTransactionViewInput) {
  const txReady = input.guard.canRequestTransaction;
  const approveSubmitted = input.approveTxHash !== null;
  const depositSubmitted = input.depositTxHash !== null || input.runStatus === "depositSubmitted";
  const receiptUnlocked = input.runStatus === "matched" && input.receiptHash !== null;

  return {
    approveAction: approveSubmitted
      ? { enabled: false, label: "Approve submitted" }
      : { enabled: txReady, label: txReady ? "Approve" : "Approve locked", blocker: input.guard.blocker },
    depositAction: depositSubmitted
      ? { enabled: false, label: "Deposit submitted" }
      : { enabled: txReady, label: txReady ? "Deposit" : "Deposit locked", blocker: input.guard.blocker },
    receipt: {
      locked: !receiptUnlocked,
      reason: receiptUnlocked ? null : "verifier_pending_sprint_11",
      receiptHash: input.receiptHash
    }
  };
}

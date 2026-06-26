import type { UserBlockReason, UserCta, UserProgressStep } from "./userFlowState";

export const userCtaCopy: Record<UserCta, string> = {
  connect_wallet: "Connect wallet",
  switch_network: "Switch to GIWA Sepolia",
  review_action: "Review action",
  continue_to_wallet: "Continue to wallet",
  verify_receipt: "Verify receipt",
  view_receipt: "View receipt"
};

export const userBlockCopy: Record<UserBlockReason, string> = {
  wallet_disconnected: "Connect a wallet to continue.",
  wrong_network: "Switch to GIWA Sepolia to continue.",
  manifest_missing: "Review the action before continuing.",
  manifest_expired: "Review a fresh intent before continuing.",
  manifest_invalidated: "Your wallet context changed. Review a fresh intent before continuing.",
  wallet_action_submitted: "Wallet action is already submitted.",
  receipt_locked: "Receipt is waiting for verification."
};

export const userReceiptStateCopy = {
  verified: "Verified receipt ready.",
  pending: "Receipt is waiting for verification.",
  notMatched: "This transaction did not match the reviewed action."
} as const;

export const userProgressCopy: Record<UserProgressStep["id"], { label: string; detail: string }> = {
  wallet_connected: {
    label: "Wallet connected",
    detail: "Your wallet is connected to GIWA Sepolia."
  },
  intent_issued: {
    label: "Intent issued",
    detail: "The action preview is bound to your wallet."
  },
  approval_submitted: {
    label: "Approval submitted",
    detail: "Your wallet returned the approval transaction hash."
  },
  deposit_submitted: {
    label: "Deposit submitted",
    detail: "Your wallet returned the deposit transaction hash."
  },
  standard_rpc_receipt_found: {
    label: "Block evidence found",
    detail: "The verifier found standard RPC block evidence."
  },
  verification_matched: {
    label: "Verification matched",
    detail: "The confirmed transaction matched the reviewed action."
  },
  receipt_ready: {
    label: "Receipt ready",
    detail: "Your receipt is ready to view and share."
  }
};

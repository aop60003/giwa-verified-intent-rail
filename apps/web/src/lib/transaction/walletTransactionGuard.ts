import { GIWA_SEPOLIA_CHAIN_ID, type WalletReadinessState } from "../wallet/walletTypes.ts";

export type TransactionGuardRun = {
  status: string;
  wallet: string;
  expiryUnix: number;
  manifestPreview: unknown;
};

export type TransactionBlocker =
  | "wallet_not_connected"
  | "wrong_chain"
  | "wallet_mismatch"
  | "manifest_missing"
  | "manifest_invalidated"
  | "manifest_expired";

export function evaluateWalletTransactionGuard(input: {
  wallet: WalletReadinessState;
  run: TransactionGuardRun | null;
  nowUnix: number;
}): { canRequestTransaction: boolean; blocker: TransactionBlocker | null } {
  if (input.wallet.account === null) {
    return { canRequestTransaction: false, blocker: "wallet_not_connected" };
  }
  if (input.wallet.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    return { canRequestTransaction: false, blocker: "wrong_chain" };
  }
  if (input.wallet.status !== "connected") {
    return { canRequestTransaction: false, blocker: "wallet_not_connected" };
  }
  if (input.run === null || input.run.manifestPreview === null) {
    return { canRequestTransaction: false, blocker: "manifest_missing" };
  }
  if (input.run.status === "manifestInvalidated") {
    return { canRequestTransaction: false, blocker: "manifest_invalidated" };
  }
  if (input.run.wallet.toLowerCase() !== input.wallet.account.toLowerCase()) {
    return { canRequestTransaction: false, blocker: "wallet_mismatch" };
  }
  if (input.nowUnix > input.run.expiryUnix) {
    return { canRequestTransaction: false, blocker: "manifest_expired" };
  }

  return { canRequestTransaction: true, blocker: null };
}

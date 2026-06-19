import { isAddress } from "viem";

export const GIWA_SEPOLIA_CHAIN_ID = 91342 as const;
export const GIWA_SEPOLIA_CHAIN_HEX = "0x164ce" as const;

export const WALLET_STATUSES = [
  "providerMissing",
  "disconnected",
  "connecting",
  "connected",
  "wrongChain",
  "requestRejected",
  "switchRejected",
  "addChainRejected",
  "accountChanged",
  "chainChanged",
  "manifestInvalidated"
] as const;

export type WalletStatus = (typeof WALLET_STATUSES)[number];

export type WalletReadinessState = {
  status: WalletStatus;
  account: `0x${string}` | null;
  chainId: number | null;
};

export function normalizeWalletAccount(value: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) {
    throw new Error("wallet account must be a valid address");
  }

  return value.toLowerCase() as `0x${string}`;
}

export function canIssueManifestFromWalletState(state: WalletReadinessState): boolean {
  return state.status === "connected" && state.account !== null && state.chainId === GIWA_SEPOLIA_CHAIN_ID;
}

export function walletStatusLabel(status: WalletStatus): string {
  const labels: Record<WalletStatus, string> = {
    providerMissing: "Wallet provider not detected",
    disconnected: "Connect wallet",
    connecting: "Wallet request pending",
    connected: "Wallet connected",
    wrongChain: "Switch to GIWA Sepolia",
    requestRejected: "Wallet request rejected",
    switchRejected: "Network switch rejected",
    addChainRejected: "Network add rejected",
    accountChanged: "Wallet account changed",
    chainChanged: "Wallet chain changed",
    manifestInvalidated: "Manifest invalidated"
  };

  return labels[status];
}

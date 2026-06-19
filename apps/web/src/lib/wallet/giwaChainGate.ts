import {
  GIWA_SEPOLIA_CHAIN_HEX,
  GIWA_SEPOLIA_CHAIN_ID,
  normalizeWalletAccount,
  type WalletReadinessState
} from "./walletTypes.ts";

export function evaluateGiwaChainGate(input: { account: string | null; chainId: number | null }): WalletReadinessState {
  if (input.account === null) {
    return { status: "disconnected", account: null, chainId: input.chainId };
  }

  const account = normalizeWalletAccount(input.account);
  if (input.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    return { status: "wrongChain", account, chainId: input.chainId };
  }

  return { status: "connected", account, chainId: GIWA_SEPOLIA_CHAIN_ID };
}

export function buildGiwaAddChainRequest(): Record<string, unknown> {
  return {
    chainId: GIWA_SEPOLIA_CHAIN_HEX,
    chainName: "GIWA Sepolia",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia-rpc.giwa.io"],
    blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
  };
}

import { describe, expect, it } from "vitest";

import {
  GIWA_SEPOLIA_CHAIN_HEX,
  GIWA_SEPOLIA_CHAIN_ID,
  canIssueManifestFromWalletState,
  normalizeWalletAccount,
  walletStatusLabel
} from "./walletTypes.ts";

describe("Sprint 9 wallet types", () => {
  it("documents the GIWA Sepolia chain gate constants", () => {
    expect(GIWA_SEPOLIA_CHAIN_ID).toBe(91342);
    expect(GIWA_SEPOLIA_CHAIN_HEX).toBe("0x164ce");
  });

  it("normalizes connected wallet addresses for manifest binding", () => {
    expect(normalizeWalletAccount("0x00000000000000000000000000000000000000A1")).toBe(
      "0x00000000000000000000000000000000000000a1"
    );
  });

  it("blocks manifest issuance unless wallet and chain are ready", () => {
    expect(
      canIssueManifestFromWalletState({
        status: "connected",
        account: "0x0000000000000000000000000000000000000001",
        chainId: 91342
      })
    ).toBe(true);
    expect(canIssueManifestFromWalletState({ status: "wrongChain", account: null, chainId: 1 })).toBe(false);
    expect(canIssueManifestFromWalletState({ status: "manifestInvalidated", account: null, chainId: 91342 })).toBe(
      false
    );
  });

  it("keeps copy scoped to wallet readiness", () => {
    expect(walletStatusLabel("providerMissing")).toBe("Wallet provider not detected");
    expect(walletStatusLabel("wrongChain")).toBe("Switch to GIWA Sepolia");
    expect(walletStatusLabel("manifestInvalidated")).toBe("Manifest invalidated");
  });
});

import { describe, expect, it } from "vitest";

import { evaluateWalletAssetReadiness } from "./walletAssetReadiness.ts";

describe("wallet asset readiness", () => {
  it("requires gas before token or approval actions", () => {
    expect(
      evaluateWalletAssetReadiness({
        gasWei: 0n,
        minGasWei: 1n,
        tokenBalance: 0n,
        requiredAmount: 10n,
        allowance: 0n
      })
    ).toEqual({ next: "gas_required", approveRequired: true });
  });

  it("requires minting when gas is ready but the token balance is short", () => {
    expect(
      evaluateWalletAssetReadiness({
        gasWei: 1n,
        minGasWei: 1n,
        tokenBalance: 0n,
        requiredAmount: 10n,
        allowance: 0n
      })
    ).toEqual({ next: "mint_required", approveRequired: true });
  });

  it("requires approval when gas and token balances are ready", () => {
    expect(
      evaluateWalletAssetReadiness({
        gasWei: 1n,
        minGasWei: 1n,
        tokenBalance: 10n,
        requiredAmount: 10n,
        allowance: 0n
      })
    ).toEqual({ next: "approval_required", approveRequired: true });
  });

  it("allows deposit when gas, token balance, and allowance are ready", () => {
    expect(
      evaluateWalletAssetReadiness({
        gasWei: 1n,
        minGasWei: 1n,
        tokenBalance: 10n,
        requiredAmount: 10n,
        allowance: 10n
      })
    ).toEqual({ next: "deposit_ready", approveRequired: false });
  });

  it("allows a zero minimum gas threshold", () => {
    expect(
      evaluateWalletAssetReadiness({
        gasWei: 0n,
        minGasWei: 0n,
        tokenBalance: 10n,
        requiredAmount: 10n,
        allowance: 10n
      })
    ).toEqual({ next: "deposit_ready", approveRequired: false });
  });

  it("rejects non-positive required amounts and negative wallet asset values", () => {
    const valid = {
      gasWei: 1n,
      minGasWei: 1n,
      tokenBalance: 10n,
      requiredAmount: 10n,
      allowance: 10n
    };
    const invalidInputs = [
      { ...valid, requiredAmount: 0n },
      { ...valid, requiredAmount: -1n },
      { ...valid, gasWei: -1n },
      { ...valid, minGasWei: -1n },
      { ...valid, tokenBalance: -1n },
      { ...valid, allowance: -1n }
    ];

    for (const input of invalidInputs) {
      expect(() => evaluateWalletAssetReadiness(input)).toThrow("wallet asset readiness values are out of range");
    }
  });
});

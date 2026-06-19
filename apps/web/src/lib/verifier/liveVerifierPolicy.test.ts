import { describe, expect, it } from "vitest";

import { normalizeLiveVerifierPolicy } from "./liveVerifierPolicy.ts";

describe("live verifier policy", () => {
  it("normalizes signer, rail, token, vault, and confirmation policy", () => {
    const policy = normalizeLiveVerifierPolicy({
      chainId: 91342,
      officialCampaignSigner: "0x1111111111111111111111111111111111111111",
      intentRailAddress: "0x2222222222222222222222222222222222222222",
      mockTokenAddress: "0x3333333333333333333333333333333333333333",
      mockVaultAddress: "0x4444444444444444444444444444444444444444",
      minConfirmations: 3,
      amountPolicy: "exact",
      allowancePolicy: "exact"
    });

    expect(policy).toMatchObject({
      chainId: 91342,
      officialCampaignSigner: "0x1111111111111111111111111111111111111111",
      intentRailAddress: "0x2222222222222222222222222222222222222222",
      mockTokenAddress: "0x3333333333333333333333333333333333333333",
      mockVaultAddress: "0x4444444444444444444444444444444444444444",
      minConfirmations: 3,
      amountPolicy: "exact",
      allowancePolicy: "exact"
    });
  });

  it("rejects non-GIWA chain policy", () => {
    expect(() =>
      normalizeLiveVerifierPolicy({
        chainId: 1,
        officialCampaignSigner: "0x1111111111111111111111111111111111111111",
        intentRailAddress: "0x2222222222222222222222222222222222222222",
        mockTokenAddress: "0x3333333333333333333333333333333333333333",
        mockVaultAddress: "0x4444444444444444444444444444444444444444",
        minConfirmations: 3,
        amountPolicy: "exact",
        allowancePolicy: "exact"
      })
    ).toThrow("chainId must be 91342");
  });
});

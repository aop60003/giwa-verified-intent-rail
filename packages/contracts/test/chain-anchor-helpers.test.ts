import { describe, expect, it } from "vitest";

import {
  buildExplorerUrl,
  buildSprint3Manifest,
  sprint3AmountBaseUnits,
  sprint3CampaignId,
  sprint3MissionId
} from "../scripts/chain-anchor-helpers.js";

describe("Sprint 3 chain anchor helpers", () => {
  it("binds the manifest to deployed token and vault addresses", () => {
    const manifest = buildSprint3Manifest({
      nonce: "sprint-3-test-nonce",
      expiryUnix: 1_790_000_000,
      wallet: "0xf3a729973559082260e742EBeDf705271aD29476",
      mockVaultAddress: "0x1111111111111111111111111111111111111111",
      mockTokenAddress: "0x2222222222222222222222222222222222222222"
    });

    expect(manifest).toMatchObject({
      chainId: 91_342,
      campaignId: sprint3CampaignId,
      missionId: sprint3MissionId,
      target: "0x1111111111111111111111111111111111111111",
      asset: "0x2222222222222222222222222222222222222222",
      spender: "0x1111111111111111111111111111111111111111",
      amountBaseUnits: sprint3AmountBaseUnits,
      maxAllowanceBaseUnits: sprint3AmountBaseUnits
    });
  });

  it("builds explorer URLs from supported placeholders", () => {
    expect(buildExplorerUrl("https://explorer.example.invalid/tx/{txHash}", `0x${"1".repeat(64)}`)).toBe(
      `https://explorer.example.invalid/tx/0x${"1".repeat(64)}`
    );
  });
});

import { describe, expect, it } from "vitest";
import { buildSupportSummary, validateRecoveryTxHash } from "./userRecovery";

describe("userRecovery", () => {
  it("accepts only 32-byte transaction hashes", () => {
    expect(validateRecoveryTxHash("0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30").ok).toBe(true);
    expect(validateRecoveryTxHash("0x1234")).toEqual({ ok: false, reason: "invalid_tx_hash" });
  });

  it("builds a bounded support summary without private data", () => {
    const summary = buildSupportSummary({
      wallet: "0xf3a729973559082260e742ebedf705271ad29476",
      actionName: "First mock vault action",
      depositTxHash: "0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30",
      receiptHash: null
    });

    expect(summary).toContain("First mock vault action");
    expect(summary).toContain("0x63c1ad31...26b30");
    expect(summary).not.toMatch(/private|mnemonic|seed phrase|runtime config|stack/iu);
  });
});

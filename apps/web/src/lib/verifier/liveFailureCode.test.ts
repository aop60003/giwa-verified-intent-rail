import { describe, expect, it } from "vitest";

import { failureCodeDisplayCopy, toBoundedFailureCode } from "./liveFailureCode.ts";

describe("live verifier failure code mapping", () => {
  it.each([
    ["RECEIPT_REVERTED", "TX_FAILED"],
    ["TX_FAILED", "TX_FAILED"],
    ["TRANSFER_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
    ["DEPOSIT_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
    ["APPROVAL_LOG_MISSING", "MISSING_REQUIRED_LOG"],
    ["TARGET_MISMATCH", "TARGET_MISMATCH"],
    ["SELECTOR_MISMATCH", "SELECTOR_MISMATCH"],
    ["ASSET_MISMATCH", "ASSET_MISMATCH"],
    ["SPENDER_MISMATCH", "SPENDER_MISMATCH"],
    ["AMOUNT_MISMATCH", "AMOUNT_MISMATCH"],
    ["ALLOWANCE_EXCEEDED", "ALLOWANCE_EXCEEDED"],
    ["EXPIRED", "EXPIRED"],
    ["UNDER_CONFIRMED", "UNDER_CONFIRMED"],
    ["WRONG_CHAIN", "WRONG_CHAIN"]
  ])("maps %s to %s", (raw, expected) => {
    expect(toBoundedFailureCode(raw)).toBe(expected);
  });

  it("uses safe display copy without raw provider details", () => {
    expect(failureCodeDisplayCopy("MISSING_REQUIRED_LOG")).toBe(
      "Required standard RPC receipt evidence was missing. Receipt stays locked."
    );
  });
});

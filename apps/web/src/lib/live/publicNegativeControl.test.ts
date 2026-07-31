import { describe, expect, it } from "vitest";

import { PUBLIC_NEGATIVE_CONTROL } from "./publicNegativeControl.ts";

describe("PUBLIC_NEGATIVE_CONTROL", () => {
  it("publishes only the fixed controlled TARGET_MISMATCH projection", () => {
    expect(PUBLIC_NEGATIVE_CONTROL).toEqual({
      label: "Recorded negative control",
      scenario: "TARGET_MISMATCH",
      scope: "controlled-demo-scenario",
      receiptIssued: false,
      publicReceiptAvailable: false,
      path: "/giwa-demo?example=mismatch"
    });
    expect(Object.keys(PUBLIC_NEGATIVE_CONTROL)).toEqual([
      "label",
      "scenario",
      "scope",
      "receiptIssued",
      "publicReceiptAvailable",
      "path"
    ]);
  });

  it("contains no participant, run, transaction, trace, or authority data", () => {
    const serialized = JSON.stringify(PUBLIC_NEGATIVE_CONTROL);

    for (const forbidden of [
      "wallet",
      "runId",
      "intentHash",
      "transactionHash",
      "txHash",
      "failureTrace",
      "capability"
    ]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

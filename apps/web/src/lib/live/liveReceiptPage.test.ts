import { describe, expect, it } from "vitest";

import { buildReceiptPageModel, receiptGateReasonToPageState } from "./liveReceiptPage.ts";

const receiptHash = `0x${"8".repeat(64)}`;
const receipt = {
  receiptHash,
  intentHash: `0x${"a".repeat(64)}`,
  payloadJson: JSON.stringify({ status: "matched", chainId: 91342 }),
  canonicalPayload: "{\"status\":\"matched\",\"chainId\":91342}",
  canonicalPayloadBytesHex: "0x7b7d"
};

describe("buildReceiptPageModel", () => {
  it("keeps unknown public receipts non-enumerating", () => {
    const model = buildReceiptPageModel({
      routeHash: `0x${"1".repeat(64)}`,
      lookup: { kind: "not_found" }
    });

    expect(model.state).toBe("unknown");
    expect(model.publicTitle).toBe("Receipt not found or not available");
    expect(model.showRunDetails).toBe(false);
  });

  it("shows matched receipt proof with progressive disclosure", () => {
    const model = buildReceiptPageModel({
      routeHash: receiptHash,
      lookup: {
        kind: "matched",
        receipt,
        primaryEvidence: {
          receiptHash,
          intentHash: receipt.intentHash,
          depositTxHash: `0x${"d".repeat(64)}`,
          verifierInputHash: `0x${"9".repeat(64)}`,
          blockNumber: 28483877,
          blockHash: `0x${"b".repeat(64)}`
        }
      }
    });

    expect(model.state).toBe("matched");
    expect(model.primaryEvidence?.receiptHash).toBe(receiptHash);
    expect(model.disclosures.map((item) => item.id)).toEqual(["manifest", "verifierInput", "receiptPayload", "decodedLogs"]);
  });

  it("maps pending, mismatch, and integrity gate states to locked pages", () => {
    expect(
      buildReceiptPageModel({ routeHash: receiptHash, lookup: { kind: "pending", status: "depositSubmitted" } }).state
    ).toBe("pending");
    expect(
      buildReceiptPageModel({
        routeHash: receiptHash,
        lookup: { kind: "terminal_unmatched", status: "mismatched", failureCopy: "Receipt stays locked." }
      }).state
    ).toBe("mismatch");
    expect(receiptGateReasonToPageState("receipt_hash_recompute_mismatch")).toBe("integrity_locked");
  });

  it("treats malformed receipt hashes as unknown", () => {
    const model = buildReceiptPageModel({ routeHash: "not-a-hash", lookup: { kind: "not_found" } });

    expect(model.state).toBe("unknown");
    expect(model.showRunDetails).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  canOpenReceiptRoute,
  isTerminalLiveRunStatus,
  normalizeLiveRunStatus,
  type LiveRunStatus
} from "./liveTypes.ts";

describe("live run status model", () => {
  it("marks only matched, mismatched, and failed as terminal", () => {
    const terminal: LiveRunStatus[] = ["matched", "mismatched", "failed"];
    const nonTerminal: LiveRunStatus[] = [
      "created",
      "walletConnected",
      "wrongChain",
      "manifestIssued",
      "intentSubmitted",
      "approveRequired",
      "approveSubmitted",
      "approveConfirmed",
      "depositReady",
      "depositSubmitted",
      "depositConfirmed",
      "verifierChecking",
      "timeout"
    ];

    for (const status of terminal) expect(isTerminalLiveRunStatus(status)).toBe(true);
    for (const status of nonTerminal) expect(isTerminalLiveRunStatus(status)).toBe(false);
  });

  it("opens receipt route only for matched status with a receipt hash", () => {
    expect(canOpenReceiptRoute({ status: "matched", receiptHash: "0xabc" })).toBe(true);
    expect(canOpenReceiptRoute({ status: "matched", receiptHash: null })).toBe(false);
    expect(canOpenReceiptRoute({ status: "depositConfirmed", receiptHash: "0xabc" })).toBe(false);
    expect(canOpenReceiptRoute({ status: "mismatched", receiptHash: "0xabc" })).toBe(false);
  });

  it("treats manifestInvalidated as non-terminal and receipt-locked", () => {
    expect(isTerminalLiveRunStatus("manifestInvalidated")).toBe(false);
    expect(canOpenReceiptRoute({ status: "manifestInvalidated", receiptHash: "0xreceipt" })).toBe(false);
  });

  it("keeps receipt route locked for Sprint 10 transaction-submitted states", () => {
    expect(canOpenReceiptRoute({ status: "approveSubmitted", receiptHash: "0xreceipt" })).toBe(false);
    expect(canOpenReceiptRoute({ status: "depositSubmitted", receiptHash: "0xreceipt" })).toBe(false);
    expect(canOpenReceiptRoute({ status: "depositConfirmed", receiptHash: "0xreceipt" })).toBe(false);
  });

  it("rejects unknown status strings", () => {
    expect(() => normalizeLiveRunStatus("created")).not.toThrow();
    expect(() => normalizeLiveRunStatus("settled")).toThrow("Unknown live run status");
  });
});

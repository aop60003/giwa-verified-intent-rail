import { describe, expect, it } from "vitest";

import { buildLiveTransactionViewModel } from "./liveTransactionState.ts";

describe("live transaction state", () => {
  it("enables approve and deposit when transaction guard passes and no tx hash is stored", () => {
    expect(
      buildLiveTransactionViewModel({
        guard: { canRequestTransaction: true, blocker: null },
        approveTxHash: null,
        depositTxHash: null,
        receiptHash: null,
        runStatus: "manifestIssued"
      })
    ).toMatchObject({
      approveAction: { enabled: true, label: "Approve" },
      depositAction: { enabled: true, label: "Deposit" },
      receipt: { locked: true }
    });
  });

  it("keeps receipt locked after deposit submission", () => {
    expect(
      buildLiveTransactionViewModel({
        guard: { canRequestTransaction: true, blocker: null },
        approveTxHash: `0x${"a".repeat(64)}`,
        depositTxHash: `0x${"b".repeat(64)}`,
        receiptHash: null,
        runStatus: "depositSubmitted"
      })
    ).toMatchObject({
      approveAction: { enabled: false, label: "Approve submitted" },
      depositAction: { enabled: false, label: "Deposit submitted" },
      receipt: { locked: true, reason: "verifier_pending_sprint_11" }
    });
  });

  it("unlocks receipt only after matched verifier status and receipt hash", () => {
    expect(
      buildLiveTransactionViewModel({
        guard: { canRequestTransaction: false, blocker: null },
        approveTxHash: `0x${"a".repeat(64)}`,
        depositTxHash: `0x${"b".repeat(64)}`,
        receiptHash: `0x${"c".repeat(64)}`,
        runStatus: "matched"
      }).receipt
    ).toMatchObject({ locked: false, receiptHash: `0x${"c".repeat(64)}` });
  });

  it.each(["depositSubmitted", "verifierChecking", "mismatched", "failed"])("keeps receipt locked for %s", (status) => {
    expect(
      buildLiveTransactionViewModel({
        guard: { canRequestTransaction: false, blocker: null },
        approveTxHash: `0x${"a".repeat(64)}`,
        depositTxHash: `0x${"b".repeat(64)}`,
        receiptHash: `0x${"c".repeat(64)}`,
        runStatus: status
      }).receipt.locked
    ).toBe(true);
  });
});

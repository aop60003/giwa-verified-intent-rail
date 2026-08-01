import { describe, expect, it } from "vitest";
import {
  filterUserReceipts,
  partitionUserReceipts
} from "./userReceiptsList";

describe("filterUserReceipts", () => {
  const receipts = [
    { id: "r1", state: "verified" as const, actionName: "First mock vault action" },
    { id: "r2", state: "pending" as const, actionName: "First mock vault action" },
    { id: "r3", state: "notMatched" as const, actionName: "First mock vault action" }
  ];

  it("filters user receipt states", () => {
    expect(filterUserReceipts(receipts, "verified")).toHaveLength(1);
    expect(filterUserReceipts(receipts, "pending")).toHaveLength(1);
    expect(filterUserReceipts(receipts, "notMatched")).toHaveLength(1);
    expect(filterUserReceipts(receipts, "all")).toHaveLength(3);
  });

  it("separates acquired Receipts from executions that need recovery", () => {
    const partitioned = partitionUserReceipts(receipts);

    expect(partitioned.acquired.map((item) => item.id)).toEqual(["r1"]);
    expect(partitioned.recovery.map((item) => item.id)).toEqual(["r2", "r3"]);
    expect(
      partitioned.acquired.every((item) => item.state === "verified")
    ).toBe(true);
  });
});

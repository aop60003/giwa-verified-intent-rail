import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readUserFlow(): string {
  const direct = join(process.cwd(), "public/user-flow.js");
  const workspace = join(process.cwd(), "apps/web/public/user-flow.js");
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

function standaloneFunction<T extends (...args: never[]) => unknown>(
  source: string,
  name: string
): T {
  const start = source.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return Function(`"use strict"; return (${source.slice(start, index + 1)});`)() as T;
    }
  }
  throw new Error(`unterminated function ${name}`);
}

describe("upsertReceiptHistory", () => {
  const upsert = standaloneFunction<
    (
      items: Array<Record<string, unknown>>,
      next: Record<string, unknown>
    ) => Array<Record<string, unknown>>
  >(readUserFlow(), "upsertReceiptHistory");

  it("promotes one run from pending to verified without duplication", () => {
    const runId = "run_1";
    const depositTxHash = `0x${"a".repeat(64)}`;
    const receiptHash = `0x${"b".repeat(64)}`;
    const pending = {
      id: runId,
      runId,
      state: "pending",
      depositTxHash,
      receiptHash: null
    };
    const verified = {
      id: runId,
      runId,
      state: "verified",
      depositTxHash,
      receiptHash
    };

    expect(upsert([pending], verified)).toEqual([verified]);
  });

  it.each(["verified", "notMatched"] as const)(
    "does not downgrade %s history with a late pending projection",
    (state) => {
      const runId = `run_${state}`;
      const depositTxHash =
        `0x${(state === "verified" ? "e" : "f").repeat(64)}`;
      const terminal = {
        id: runId,
        runId,
        state,
        depositTxHash,
        receiptHash:
          state === "verified" ? `0x${"9".repeat(64)}` : null,
        savedAt: "2026-07-31T01:00:00.000Z"
      };
      const latePending = {
        id: runId,
        runId,
        state: "pending",
        depositTxHash,
        receiptHash: null,
        savedAt: "2026-07-31T01:01:00.000Z"
      };

      expect(upsert([terminal], latePending)).toEqual([terminal]);
    }
  );

  it("deduplicates legacy deposit and Receipt identities", () => {
    const depositTxHash = `0x${"c".repeat(64)}`;
    const receiptHash = `0x${"d".repeat(64)}`;
    const legacy = {
      id: depositTxHash,
      state: "pending",
      depositTxHash,
      receiptHash: null
    };
    const verified = {
      id: "run_2",
      runId: "run_2",
      state: "verified",
      depositTxHash,
      receiptHash
    };

    expect(upsert([legacy], verified)).toEqual([verified]);
  });

  it("keeps the history bounded to twelve entries", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `run_${index}`,
      runId: `run_${index}`
    }));
    expect(upsert(items, { id: "new", runId: "new" })).toHaveLength(12);
  });
});

describe("projectCampaignHandoffReceipt", () => {
  const source = readUserFlow();
  const runId = "run_handoff";
  const depositTxHash = `0x${"6".repeat(64)}`;
  const receiptHash = `0x${"7".repeat(64)}`;
  const pending = {
    id: runId,
    runId,
    state: "pending",
    depositTxHash,
    receiptHash: null
  };
  const verified = {
    id: runId,
    runId,
    state: "verified",
    depositTxHash,
    receiptHash
  };

  it("marks the current public Receipt on pending to verified transition", () => {
    const project = standaloneFunction<
      (
        items: Array<Record<string, unknown>>,
        next: Record<string, unknown>
      ) => string | null
    >(source, "projectCampaignHandoffReceipt");

    expect(project([pending], verified)).toBe(receiptHash);
  });

  it("does not re-mark an existing verified identity on revisit", () => {
    const project = standaloneFunction<
      (
        items: Array<Record<string, unknown>>,
        next: Record<string, unknown>
      ) => string | null
    >(source, "projectCampaignHandoffReceipt");

    expect(project([verified], { ...verified })).toBeNull();
  });

  it("persists only the public-safe hash after the local history write", () => {
    const storeStart = source.indexOf("function storeReceiptProjection");
    const storeEnd = source.indexOf("function renderReceiptCard", storeStart);
    const store = source.slice(storeStart, storeEnd);
    const writerStart = source.indexOf("function writeCampaignHandoffReceipt");
    const writerEnd = source.indexOf("function view", writerStart);
    const writer = source.slice(writerStart, writerEnd);

    expect(source).toContain(
      'const CAMPAIGN_HANDOFF_RECEIPT_KEY = "giwa:campaignHandoffReceipt";'
    );
    expect(store).toContain(
      "projectCampaignHandoffReceipt(items, next)"
    );
    expect(store).toContain(
      "if (historyWritten && handoffReceiptHash !== null)"
    );
    expect(store).toContain(
      "writeCampaignHandoffReceipt(handoffReceiptHash)"
    );
    expect(writer).toContain(
      "sessionStorage.setItem(CAMPAIGN_HANDOFF_RECEIPT_KEY"
    );
    expect(writer).not.toMatch(
      /runCapability|manifestSignature|JSON\.stringify|private/iu
    );
  });
});

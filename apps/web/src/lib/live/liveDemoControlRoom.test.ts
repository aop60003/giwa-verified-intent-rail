import { describe, expect, it } from "vitest";

import { buildLiveDemoControlRoom, selectLatestRun } from "./liveDemoControlRoom.ts";
import type { LiveRunRecord } from "./liveTypes.ts";

function run(overrides: Partial<LiveRunRecord> = {}): LiveRunRecord {
  return {
    runId: "run-1",
    idempotencyKey: "wallet:campaign:mission:",
    wallet: "0x1111111111111111111111111111111111111111",
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    referralCode: null,
    nonce: "nonce-1",
    intentHash: `0x${"a".repeat(64)}`,
    manifestJson: "{\"hidden\":true}",
    manifestSignature: "0xsig",
    status: "matched",
    expiryUnix: 1790003600,
    createdAt: "2026-06-19T00:00:00.000Z",
    updatedAt: "2026-06-19T00:02:00.000Z",
    ...overrides
  };
}

describe("buildLiveDemoControlRoom", () => {
  it("prefers a matched live run and keeps static fallback visible", () => {
    const room = buildLiveDemoControlRoom({
      baseUrl: "http://127.0.0.1:4190",
      health: { ok: true },
      readiness: { ready: true, mode: "local" },
      latestRun: run(),
      receiptHash: `0x${"8".repeat(64)}`,
      snapshot: { present: true, receiptHash: `0x${"8".repeat(64)}`, path: "/live-demo-snapshot.json" },
      staticFallback: { available: true }
    });

    expect(room.openingOrder.map((item) => item.id)).toEqual([
      "freshLive",
      "dynamicReceipt",
      "staticFallback",
      "partnerConsole",
      "staticSnapshot"
    ]);
    expect(room.openingOrder.map((item) => item.label)).toEqual([
      "Fresh live path",
      "Dynamic receipt API",
      "Static fallback",
      "Partner console",
      "Static snapshot"
    ]);
    expect(JSON.stringify(room.safeProjection)).not.toContain("manifestJson");
    expect(JSON.stringify(room.safeProjection)).not.toContain("manifestSignature");
  });

  it("falls back to static demo when no matched live receipt exists", () => {
    const room = buildLiveDemoControlRoom({
      baseUrl: "http://127.0.0.1:4190",
      health: { ok: true },
      readiness: { ready: false, mode: "local" },
      latestRun: run({ status: "depositSubmitted" }),
      receiptHash: null,
      snapshot: { present: false, receiptHash: null, path: "/live-demo-snapshot.json" },
      staticFallback: { available: true }
    });

    expect(room.openingOrder[0]).toMatchObject({ id: "freshLive", state: "blocked" });
    expect(room.openingOrder.find((item) => item.id === "staticFallback")).toMatchObject({ state: "ready" });
  });
});

describe("selectLatestRun", () => {
  it("chooses the latest updated run with deterministic tie-break", () => {
    const latest = selectLatestRun([
      run({ runId: "run-b", updatedAt: "2026-06-19T00:02:00.000Z" }),
      run({ runId: "run-c", updatedAt: "2026-06-19T00:03:00.000Z" }),
      run({ runId: "run-a", updatedAt: "2026-06-19T00:03:00.000Z" })
    ]);

    expect(latest?.runId).toBe("run-c");
  });
});

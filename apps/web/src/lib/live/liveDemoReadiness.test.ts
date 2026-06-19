import { describe, expect, it } from "vitest";

import { buildLiveDemoReadiness } from "./liveDemoReadiness.ts";
import type { LiveRunRecord } from "./liveTypes.ts";

function run(status: LiveRunRecord["status"]): LiveRunRecord {
  return {
    runId: "run-1",
    idempotencyKey: "wallet:campaign:mission",
    wallet: "0x1111111111111111111111111111111111111111",
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    referralCode: null,
    nonce: "nonce-1",
    intentHash: `0x${"a".repeat(64)}`,
    manifestJson: "{}",
    manifestSignature: `0x${"b".repeat(130)}`,
    status,
    expiryUnix: 1790003600,
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:01:00.000Z"
  };
}

describe("live demo readiness", () => {
  it("uses the live path and enables export for a matched run with receipt evidence", () => {
    const readiness = buildLiveDemoReadiness({
      latestRun: run("matched"),
      receiptHash: `0x${"8".repeat(64)}`,
      staticFallbackReady: true
    });

    expect(readiness).toEqual({
      primaryPath: "live",
      canExportLiveSnapshot: true,
      blockers: []
    });
  });

  it("falls back to static demo and blocks export before verifier match", () => {
    const readiness = buildLiveDemoReadiness({
      latestRun: run("depositSubmitted"),
      receiptHash: null,
      staticFallbackReady: true
    });

    expect(readiness.primaryPath).toBe("staticFallback");
    expect(readiness.canExportLiveSnapshot).toBe(false);
    expect(readiness.blockers).toEqual(["live_verifier_not_matched"]);
  });
});

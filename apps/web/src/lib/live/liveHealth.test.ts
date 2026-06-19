import { describe, expect, it } from "vitest";

import { buildLiveHealthBody, buildLiveReadinessBody } from "./liveHealth.ts";

describe("live hosted health and readiness", () => {
  it("reports process health without readiness details", () => {
    expect(buildLiveHealthBody()).toEqual({ ok: true });
  });

  it("reports readiness without raw config values", () => {
    const body = buildLiveReadinessBody({
      mode: "staging-testnet",
      envReady: false,
      authReady: true,
      tenantReady: true,
      repositoryReady: false,
      rateLimitReady: true,
      requestSafetyReady: true,
      telemetryReady: true,
      missingKeys: ["GIWA_SEPOLIA_RPC_URL"],
      invalidKeys: []
    });

    expect(body.ready).toBe(false);
    expect(JSON.stringify(body)).toContain("GIWA_SEPOLIA_RPC_URL");
    expect(JSON.stringify(body)).not.toContain("https://");
  });
});

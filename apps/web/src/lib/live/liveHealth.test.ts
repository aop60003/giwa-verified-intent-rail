import { describe, expect, it } from "vitest";

import { buildLiveHealthBody, buildLiveReadinessBody } from "./liveHealth.ts";

describe("live hosted health and readiness", () => {
  it("reports process health without readiness details", () => {
    expect(buildLiveHealthBody()).toEqual({ ok: true });
  });

  it("reports readiness without raw config values or raw env key names", () => {
    const body = buildLiveReadinessBody({
      mode: "staging-testnet",
      envReady: false,
      authReady: true,
      tenantReady: true,
      repositoryReady: false,
      rateLimitReady: true,
      requestSafetyReady: true,
      telemetryReady: true,
      missingKeys: ["GIWA_SEPOLIA_RPC_URL", "CAMPAIGN_SIGNER_PRIVATE_KEY"],
      invalidKeys: []
    });
    const serialized = JSON.stringify(body);

    expect(body.ready).toBe(false);
    expect(body.missingKeyCount).toBe(2);
    expect(body.missingKeys).toEqual(["giwa-rpc-endpoint", "server-role-signer"]);
    expect(serialized).not.toContain("GIWA_SEPOLIA_RPC_URL");
    expect(serialized).not.toContain("CAMPAIGN_SIGNER_PRIVATE_KEY");
    expect(serialized).not.toContain("PRIVATE_KEY");
    expect(serialized).not.toContain("https://");
  });
});

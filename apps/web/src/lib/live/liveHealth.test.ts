import { describe, expect, it } from "vitest";

import { buildLiveHealthBody, buildLiveReadinessBody } from "./liveHealth.ts";

const allReady = {
  mode: "staging-testnet" as const,
  envReady: true,
  authReady: true,
  tenantReady: true,
  repositoryReady: true,
  rateLimitReady: true,
  requestSafetyReady: true,
  telemetryReady: true,
  storageReady: true,
  chainReady: true,
  signerReady: true,
  originReady: true,
  verifierReady: true,
  schemaReady: true,
  missingKeys: [],
  invalidKeys: []
};

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
      storageReady: true,
      chainReady: false,
      signerReady: true,
      originReady: false,
      verifierReady: true,
      schemaReady: true,
      missingKeys: ["GIWA_SEPOLIA_RPC_URL", "CAMPAIGN_SIGNER_PRIVATE_KEY", "GIWA_LIVE_PUBLIC_ORIGIN"],
      invalidKeys: []
    });
    const serialized = JSON.stringify(body);

    expect(body.ready).toBe(false);
    expect(body.missingKeyCount).toBe(3);
    expect(body.missingKeys).toEqual(["giwa-rpc-endpoint", "server-role-signer", "hosted-public-origin"]);
    expect(body.checks).toEqual({
      env: "missing",
      auth: "ok",
      tenant: "ok",
      repository: "missing",
      rateLimit: "ok",
      requestSafety: "ok",
      telemetry: "ok",
      storage: "ok",
      chain: "missing",
      signer: "ok",
      origin: "missing",
      verifier: "ok",
      schema: "ok"
    });
    expect(serialized).not.toContain("GIWA_SEPOLIA_RPC_URL");
    expect(serialized).not.toContain("CAMPAIGN_SIGNER_PRIVATE_KEY");
    expect(serialized).not.toContain("PRIVATE_KEY");
    expect(serialized).not.toContain("https://");
  });

  it("requires every existing and expanded readiness check", () => {
    expect(buildLiveReadinessBody(allReady).ready).toBe(true);
    const checkInputs = [
      "envReady",
      "authReady",
      "tenantReady",
      "repositoryReady",
      "rateLimitReady",
      "requestSafetyReady",
      "telemetryReady",
      "storageReady",
      "chainReady",
      "signerReady",
      "originReady",
      "verifierReady",
      "schemaReady"
    ] as const;

    for (const key of checkInputs) {
      expect(buildLiveReadinessBody({ ...allReady, [key]: false }).ready, key).toBe(false);
    }
  });
});

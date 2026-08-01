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
      runtimeConfig: "missing",
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
    expect(serialized).not.toMatch(/"env"/u);
  });

  it("redacts Studio organization and Owner configuration keys exactly", () => {
    const body = buildLiveReadinessBody({
      ...allReady,
      authReady: false,
      missingKeys: [
        "GIWA_LIVE_STUDIO_OWNER_WALLETS",
        "GIWA_LIVE_PARTNER_TENANT_ID"
      ],
      invalidKeys: ["GIWA_LIVE_STUDIO_ORGANIZATION_NAME"]
    });
    const serialized = JSON.stringify(body);

    expect(body.missingKeys).toEqual([
      "studio-owner-list",
      "studio-organization"
    ]);
    expect(body.invalidKeys).toEqual(["studio-organization-name"]);
    expect(serialized).not.toContain("GIWA_LIVE_STUDIO_OWNER_WALLETS");
    expect(serialized).not.toContain("GIWA_LIVE_PARTNER_TENANT_ID");
    expect(serialized).not.toContain("GIWA_LIVE_STUDIO_ORGANIZATION_NAME");
    expect(serialized).not.toContain("0x1234");
    expect(serialized).not.toContain("tenant_private");
    expect(serialized).not.toContain("Private Organization");
  });

  it("keeps readiness counts consistent when evaluators report the same key", () => {
    const body = buildLiveReadinessBody({
      ...allReady,
      envReady: false,
      missingKeys: ["GIWA_LIVE_PUBLIC_ORIGIN", "GIWA_LIVE_PUBLIC_ORIGIN"],
      invalidKeys: [
        "GIWA_LIVE_STUDIO_OWNER_WALLETS",
        "GIWA_LIVE_STUDIO_OWNER_WALLETS"
      ]
    });

    expect(body.missingKeys).toEqual(["hosted-public-origin"]);
    expect(body.missingKeyCount).toBe(body.missingKeys.length);
    expect(body.invalidKeys).toEqual(["studio-owner-list"]);
    expect(body.invalidKeyCount).toBe(body.invalidKeys.length);
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

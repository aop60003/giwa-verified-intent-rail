import { describe, expect, it } from "vitest";

import { buildRedactedHostedEnvReadiness, buildRedactedLiveEnvReadiness, requireLiveServerEnv } from "./liveEnv.ts";

const validEnv = {
  GIWA_SEPOLIA_RPC_URL: "https://example.invalid/rpc",
  GIWA_EXPLORER_TX_URL_TEMPLATE: "https://example.invalid/tx/{txHash}",
  GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: "https://example.invalid/address/{address}",
  CAMPAIGN_SIGNER_PRIVATE_KEY: `0x${"1".repeat(64)}`,
  INTENT_SUBMITTER_PRIVATE_KEY: `0x${"2".repeat(64)}`,
  VERIFIER_PRIVATE_KEY: `0x${"3".repeat(64)}`,
  GIWA_LIVE_DB_PATH: "apps/web/.data/live-mvp.test.sqlite"
};

describe("live env readiness", () => {
  it("reports missing keys without printing values", () => {
    const readiness = buildRedactedLiveEnvReadiness({});

    expect(readiness.ok).toBe(false);
    expect(readiness.missing).toContain("GIWA_SEPOLIA_RPC_URL");
    expect(JSON.stringify(readiness)).not.toContain("https://");
  });

  it("accepts valid env and reports only redacted metadata", () => {
    const readiness = buildRedactedLiveEnvReadiness(validEnv);

    expect(readiness.ok).toBe(true);
    expect(readiness.keys.CAMPAIGN_SIGNER_PRIVATE_KEY).toEqual({
      state: "set",
      format: "hex32",
      length: 66
    });
    expect(JSON.stringify(readiness)).not.toContain(validEnv.CAMPAIGN_SIGNER_PRIVATE_KEY);
  });

  it("throws with missing key names only", () => {
    expect(() => requireLiveServerEnv({})).toThrow("Missing live server env");
    expect(() => requireLiveServerEnv({})).not.toThrow("https://");
  });

  it("keeps the campaign signer material server-only while exposing no raw value in readiness", () => {
    const readiness = buildRedactedLiveEnvReadiness({
      GIWA_SEPOLIA_RPC_URL: "https://sepolia-rpc.giwa.io",
      GIWA_EXPLORER_TX_URL_TEMPLATE: "https://sepolia-explorer.giwa.io/tx/{txHash}",
      GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: "https://sepolia-explorer.giwa.io/address/{address}",
      CAMPAIGN_SIGNER_PRIVATE_KEY: `0x${"1".repeat(64)}`,
      INTENT_SUBMITTER_PRIVATE_KEY: `0x${"2".repeat(64)}`,
      VERIFIER_PRIVATE_KEY: `0x${"3".repeat(64)}`,
      GIWA_LIVE_DB_PATH: "apps/web/.data/live-mvp.sqlite"
    });

    expect(readiness.ok).toBe(true);
    expect(JSON.stringify(readiness)).not.toContain("1111111111111111111111111111111111111111111111111111111111111111");
    expect(readiness.keys.CAMPAIGN_SIGNER_PRIVATE_KEY).toMatchObject({
      state: "set",
      format: "hex32",
      length: 66
    });
  });

  it("reports hosted env readiness without raw origin or credential hash values", () => {
    const readiness = buildRedactedHostedEnvReadiness({
      GIWA_LIVE_MODE: "staging-testnet",
      GIWA_LIVE_ALLOWED_ORIGINS: "https://partner.example",
      GIWA_LIVE_PARTNER_CREDENTIAL_HASHES: "abcdef123456"
    });

    expect(readiness.ok).toBe(true);
    expect(readiness.keys.GIWA_LIVE_ALLOWED_ORIGINS).toMatchObject({ state: "set", format: "csv" });
    expect(JSON.stringify(readiness)).not.toContain("partner.example");
    expect(JSON.stringify(readiness)).not.toContain("abcdef123456");
  });
});

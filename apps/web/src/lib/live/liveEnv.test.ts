import { describe, expect, it } from "vitest";

import { buildRedactedHostedEnvReadiness, buildRedactedLiveEnvReadiness, requireLiveServerEnv } from "./liveEnv.ts";

const validEnv = {
  GIWA_SEPOLIA_RPC_URL: "https://example.invalid/rpc",
  GIWA_EXPLORER_TX_URL_TEMPLATE: "https://example.invalid/tx/{txHash}",
  GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: "https://example.invalid/address/{address}",
  CAMPAIGN_SIGNER_PRIVATE_KEY: `0x${"1".repeat(64)}`,
  GIWA_LIVE_DB_PATH: "apps/web/.data/live-mvp.test.sqlite"
};

const validHostedEnv = {
  GIWA_LIVE_MODE: "staging-testnet",
  GIWA_LIVE_ALLOWED_ORIGINS: "https://app.example,https://partner.example",
  GIWA_LIVE_PARTNER_CREDENTIAL_HASHES: "abcdef123456",
  GIWA_LIVE_PUBLIC_ORIGIN: "https://app.example",
  GIWA_LIVE_MIN_GAS_WEI: "0",
  GIWA_LIVE_FAUCET_HELP_URL: "https://docs.giwa.io/introduction/try-giwa",
  GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS: "24"
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
    expect(readiness.keys).not.toHaveProperty("INTENT_SUBMITTER_PRIVATE_KEY");
    expect(readiness.keys).not.toHaveProperty("VERIFIER_PRIVATE_KEY");
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
    const readiness = buildRedactedHostedEnvReadiness(validHostedEnv);

    expect(readiness.ok).toBe(true);
    expect(readiness.keys.GIWA_LIVE_ALLOWED_ORIGINS).toMatchObject({ state: "set", format: "csv" });
    expect(readiness.keys.GIWA_LIVE_PUBLIC_ORIGIN).toMatchObject({ state: "set", format: "origin" });
    expect(readiness.keys.GIWA_LIVE_MIN_GAS_WEI).toMatchObject({ state: "set", format: "decimal" });
    expect(readiness.keys.GIWA_LIVE_FAUCET_HELP_URL).toMatchObject({ state: "set", format: "url" });
    expect(readiness.keys.GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS).toMatchObject({
      state: "set",
      format: "integer"
    });
    expect(JSON.stringify(readiness)).not.toContain("app.example");
    expect(JSON.stringify(readiness)).not.toContain("partner.example");
    expect(JSON.stringify(readiness)).not.toContain("abcdef123456");
  });

  it("requires and validates every hosted public runtime setting", () => {
    const missing = buildRedactedHostedEnvReadiness({ GIWA_LIVE_MODE: "staging-testnet" });
    expect(missing.ok).toBe(false);
    expect(missing.missing).toEqual(
      expect.arrayContaining([
        "GIWA_LIVE_PUBLIC_ORIGIN",
        "GIWA_LIVE_MIN_GAS_WEI",
        "GIWA_LIVE_FAUCET_HELP_URL",
        "GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS"
      ])
    );

    const invalid = buildRedactedHostedEnvReadiness({
      ...validHostedEnv,
      GIWA_LIVE_PUBLIC_ORIGIN: "https://app.example/path",
      GIWA_LIVE_MIN_GAS_WEI: "-1",
      GIWA_LIVE_FAUCET_HELP_URL: "http://docs.example.invalid",
      GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS: "0"
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.invalid).toEqual(
      expect.arrayContaining([
        "GIWA_LIVE_PUBLIC_ORIGIN",
        "GIWA_LIVE_MIN_GAS_WEI",
        "GIWA_LIVE_FAUCET_HELP_URL",
        "GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS"
      ])
    );
  });

  it("requires the hosted public origin exactly once in the allowed-origin list", () => {
    const absent = buildRedactedHostedEnvReadiness({
      ...validHostedEnv,
      GIWA_LIVE_ALLOWED_ORIGINS: "https://partner.example"
    });
    const duplicate = buildRedactedHostedEnvReadiness({
      ...validHostedEnv,
      GIWA_LIVE_ALLOWED_ORIGINS: "https://app.example, https://app.example"
    });

    expect(absent.invalid).toContain("GIWA_LIVE_ALLOWED_ORIGINS");
    expect(duplicate.invalid).toContain("GIWA_LIVE_ALLOWED_ORIGINS");
  });

  it("rejects every non-HTTPS allowed origin in hosted mode", () => {
    const readiness = buildRedactedHostedEnvReadiness({
      ...validHostedEnv,
      GIWA_LIVE_ALLOWED_ORIGINS: "https://app.example,http://partner.example"
    });

    expect(readiness.ok).toBe(false);
    expect(readiness.invalid).toContain("GIWA_LIVE_ALLOWED_ORIGINS");
    expect(JSON.stringify(readiness)).not.toContain("partner.example");
  });

  it("preserves local hosted-gate behavior without requiring hosted-only values", () => {
    expect(buildRedactedHostedEnvReadiness({})).toEqual({
      ok: true,
      missing: [],
      invalid: [],
      keys: {
        GIWA_LIVE_MODE: { state: "set", format: "mode", length: 5 }
      }
    });
  });

  it("returns only web-runtime signer fields and validated hosted values", () => {
    const serverEnv = requireLiveServerEnv({ ...validEnv, ...validHostedEnv });

    expect(serverEnv).toMatchObject({
      publicOrigin: "https://app.example",
      minGasBalanceWei: "0",
      faucetHelpUrl: "https://docs.giwa.io/introduction/try-giwa",
      incompleteRunRetentionHours: 24
    });
    expect(serverEnv).not.toHaveProperty("intentSubmitterPrivateKey");
    expect(serverEnv).not.toHaveProperty("verifierPrivateKey");
  });

  it("accepts usable retention hours and rejects values outside safe millisecond and Date ranges", () => {
    const normal = buildRedactedHostedEnvReadiness(validHostedEnv);
    const overflowValue = String(Number.MAX_SAFE_INTEGER);
    const overflow = buildRedactedHostedEnvReadiness({
      ...validHostedEnv,
      GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS: overflowValue
    });
    const maxDateTimeMs = 8_640_000_000_000_000;
    const dateOverflowValue = String(Math.floor((Date.now() + maxDateTimeMs) / 3_600_000) + 1);
    const dateOverflow = buildRedactedHostedEnvReadiness({
      ...validHostedEnv,
      GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS: dateOverflowValue
    });

    expect(normal.keys.GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS).toMatchObject({ state: "set" });
    expect(requireLiveServerEnv({ ...validEnv, ...validHostedEnv }).incompleteRunRetentionHours).toBe(24);
    expect(overflow.ok).toBe(false);
    expect(overflow.invalid).toContain("GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS");
    expect(JSON.stringify(overflow)).not.toContain(overflowValue);
    expect(dateOverflow.ok).toBe(false);
    expect(dateOverflow.invalid).toContain("GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS");
    expect(JSON.stringify(dateOverflow)).not.toContain(dateOverflowValue);
  });
});

import { describe, expect, it } from "vitest";

import type { StudioAuthRepository } from "./studioAuthRepository.ts";
import { createMemoryStudioAuthRepository } from "./studioAuthRepository.ts";
import { applyStudioAuthBootstrap, evaluateStudioAuthConfig } from "./studioAuthConfig.ts";

const owner = "0x1111111111111111111111111111111111111111";
const secondOwner = "0x2222222222222222222222222222222222222222";
const now = "2026-08-01T00:00:00.000Z";

function hostedEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    GIWA_LIVE_PARTNER_TENANT_ID: "tenant_default",
    GIWA_LIVE_STUDIO_ORGANIZATION_NAME: "Loop",
    GIWA_LIVE_STUDIO_OWNER_WALLETS: owner,
    GIWA_LIVE_PUBLIC_ORIGIN: "https://app.example",
    ...overrides
  };
}

function enabledConfig() {
  const result = evaluateStudioAuthConfig({
    env: hostedEnv(),
    mode: "staging-testnet",
    localOrigin: null
  });
  if (!result.ok || !result.enabled) throw new Error("expected enabled config");
  return result.config;
}

function recordingRepository() {
  const upserts: Array<{ id: string; displayName: string }> = [];
  const syncs: Array<{ organizationId: string; walletAddresses: readonly `0x${string}`[]; nowIso: string }> = [];
  const bootstraps: Array<{ organizationId: string; walletAddresses: readonly `0x${string}`[] }> = [];
  const repository: StudioAuthRepository = {
    upsertOrganization(record) {
      upserts.push({ id: record.id, displayName: record.displayName });
    },
    bootstrapOrganizationsAndOwners(input) {
      bootstraps.push({ organizationId: input.organizationId, walletAddresses: input.walletAddresses });
      for (const record of input.organizations) {
        upserts.push({ id: record.id, displayName: record.displayName });
      }
      syncs.push({
        organizationId: input.organizationId,
        walletAddresses: input.walletAddresses,
        nowIso: input.nowIso
      });
      return { activeOwnerCount: new Set(input.walletAddresses).size };
    },
    syncBootstrapOwners(input) {
      syncs.push(input);
      return { activeOwnerCount: new Set(input.walletAddresses).size };
    },
    getActiveMember() { return null; },
    createChallenge() {},
    getChallenge() { return null; },
    incrementChallengeAttempt() { return 0; },
    consumeChallengeAndCreateSession() { return false; },
    getSessionContextByTokenHash() { return null; },
    revokeSessionByTokenHash() { return false; },
    pruneExpiredAuthRecords() { return { challengesRemoved: 0, sessionsRemoved: 0 }; }
  };
  return { repository, upserts, syncs, bootstraps };
}

describe("Studio auth configuration", () => {
  it("fails hosted mode closed without explicit tenant, Owner, and HTTPS origin", () => {
    const result = evaluateStudioAuthConfig({ env: {}, mode: "staging-testnet", localOrigin: null });

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining([
      "GIWA_LIVE_PARTNER_TENANT_ID",
      "GIWA_LIVE_STUDIO_OWNER_WALLETS",
      "GIWA_LIVE_PUBLIC_ORIGIN"
    ]));
    expect(JSON.stringify(result)).not.toContain(owner);
  });

  it("accepts one redacted hosted Owner configuration", () => {
    const result = evaluateStudioAuthConfig({
      env: hostedEnv(),
      mode: "staging-testnet",
      localOrigin: null
    });

    expect(result).toMatchObject({ ok: true, enabled: true, ownerCount: 1 });
    if (!result.ok || !result.enabled) throw new Error("expected enabled config");
    expect(result.config.studioUri).toBe("https://app.example/studio");
    expect(result.config.secureCookie).toBe(true);
    expect(JSON.stringify(result.readiness)).not.toContain(owner);
  });

  it("rejects malformed and duplicate configured Owner wallets without exposing them in readiness", () => {
    const malformed = evaluateStudioAuthConfig({
      env: hostedEnv({ GIWA_LIVE_STUDIO_OWNER_WALLETS: "0x1234" }),
      mode: "staging-testnet",
      localOrigin: null
    });
    const duplicate = evaluateStudioAuthConfig({
      env: hostedEnv({ GIWA_LIVE_STUDIO_OWNER_WALLETS: `${owner},0x${owner.slice(2).toUpperCase()}` }),
      mode: "staging-testnet",
      localOrigin: null
    });

    expect(malformed).toMatchObject({ ok: false, invalid: ["GIWA_LIVE_STUDIO_OWNER_WALLETS"], ownerCount: 0 });
    expect(duplicate).toMatchObject({ ok: false, invalid: ["GIWA_LIVE_STUDIO_OWNER_WALLETS"], ownerCount: 0 });
    expect(JSON.stringify(duplicate.readiness)).not.toContain(owner);
  });

  it("enforces organization ID and name bounds", () => {
    const invalidId = evaluateStudioAuthConfig({
      env: hostedEnv({ GIWA_LIVE_PARTNER_TENANT_ID: "tenant default" }),
      mode: "staging-testnet",
      localOrigin: null
    });
    const tooLongName = evaluateStudioAuthConfig({
      env: hostedEnv({ GIWA_LIVE_STUDIO_ORGANIZATION_NAME: "L".repeat(81) }),
      mode: "staging-testnet",
      localOrigin: null
    });
    const defaultName = evaluateStudioAuthConfig({
      env: hostedEnv({ GIWA_LIVE_STUDIO_ORGANIZATION_NAME: undefined }),
      mode: "staging-testnet",
      localOrigin: null
    });

    expect(invalidId).toMatchObject({ ok: false, invalid: ["GIWA_LIVE_PARTNER_TENANT_ID"] });
    expect(tooLongName).toMatchObject({ ok: false, invalid: ["GIWA_LIVE_STUDIO_ORGANIZATION_NAME"] });
    if (!defaultName.ok || !defaultName.enabled) throw new Error("expected enabled config");
    expect(defaultName.config.organizationName).toBe("Loop");
  });

  it("rejects HTTP origins for hosted configuration", () => {
    const result = evaluateStudioAuthConfig({
      env: hostedEnv({ GIWA_LIVE_PUBLIC_ORIGIN: "http://app.example" }),
      mode: "prod-testnet",
      localOrigin: null
    });

    expect(result).toMatchObject({ ok: false, invalid: ["GIWA_LIVE_PUBLIC_ORIGIN"] });
  });

  it("allows a disabled local Studio without silently granting an Owner", () => {
    const result = evaluateStudioAuthConfig({ env: {}, mode: "local", localOrigin: "http://127.0.0.1:4177" });

    expect(result).toMatchObject({ ok: true, enabled: false, ownerCount: 0 });
    expect(JSON.stringify(result.readiness)).not.toContain(owner);
  });

  it("rejects a local origin that is not loopback", () => {
    const result = evaluateStudioAuthConfig({ env: {}, mode: "local", localOrigin: "http://app.example:4177" });

    expect(result).toMatchObject({ ok: false, invalid: ["LOCAL_STUDIO_ORIGIN"] });
  });

  it("uses the server-supplied loopback origin for an explicitly enabled local Studio", () => {
    const result = evaluateStudioAuthConfig({
      env: hostedEnv({ GIWA_LIVE_PUBLIC_ORIGIN: "http://ignored.example" }),
      mode: "local",
      localOrigin: "http://localhost:4177"
    });

    if (!result.ok || !result.enabled) throw new Error("expected enabled config");
    expect(result.config).toMatchObject({
      origin: "http://localhost:4177",
      studioUri: "http://localhost:4177/studio",
      secureCookie: false
    });
  });

  it("bootstraps each distinct existing tenant and synchronizes configured Owners once", () => {
    const { repository, upserts, syncs, bootstraps } = recordingRepository();

    const result = applyStudioAuthBootstrap({
      repository,
      config: enabledConfig(),
      existingTenantIds: ["local", "tenant_default", "local", "tenant_default"],
      nowIso: now
    });

    expect(result).toEqual({ activeOwnerCount: 1 });
    expect(upserts).toEqual([
      { id: "local", displayName: "Tenant local" },
      { id: "tenant_default", displayName: "Loop" }
    ]);
    expect(syncs).toEqual([{
      organizationId: "tenant_default",
      walletAddresses: [owner as `0x${string}`],
      nowIso: now
    }]);
    expect(bootstraps).toEqual([{
      organizationId: "tenant_default",
      walletAddresses: [owner as `0x${string}`]
    }]);
  });

  it("creates and synchronizes the configured organization without an existing tenant row", () => {
    const repository = createMemoryStudioAuthRepository();

    expect(applyStudioAuthBootstrap({
      repository,
      config: enabledConfig(),
      existingTenantIds: [],
      nowIso: now
    })).toEqual({ activeOwnerCount: 1 });
    expect(repository.getActiveMember("tenant_default", owner as `0x${string}`)?.role).toBe("Owner");
  });

  it("does not mutate organizations or Owners when bootstrap has no Owner", () => {
    const { repository, upserts, syncs } = recordingRepository();

    expect(() => applyStudioAuthBootstrap({
      repository,
      config: { ...enabledConfig(), ownerWallets: [] },
      existingTenantIds: ["local"],
      nowIso: now
    })).toThrow("studio_bootstrap_owner_required");
    expect(upserts).toEqual([]);
    expect(syncs).toEqual([]);
  });

  it("normalizes configured wallets before bootstrap", () => {
    const repository = createMemoryStudioAuthRepository();
    const result = applyStudioAuthBootstrap({
      repository,
      config: { ...enabledConfig(), ownerWallets: [`0x${secondOwner.slice(2).toUpperCase()}` as `0x${string}`] },
      existingTenantIds: [],
      nowIso: now
    });

    expect(result).toEqual({ activeOwnerCount: 1 });
    expect(repository.getActiveMember("tenant_default", secondOwner as `0x${string}`)?.walletAddress).toBe(secondOwner);
  });
});

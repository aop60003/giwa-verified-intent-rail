import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import type { StudioAuthConfig } from "./studioAuthConfig.ts";
import {
  STUDIO_AUTH_CHALLENGE_TTL_MS,
  STUDIO_AUTH_SESSION_TTL_MS,
  hashStudioAuthSecret,
  parseStudioAuthMessage
} from "./studioAuthMessage.ts";
import { createMemoryStudioAuthRepository } from "./studioAuthRepository.ts";
import { createStudioAuthService } from "./studioAuthService.ts";

declare const Buffer: {
  alloc(size: number, fill: number): { toString(encoding: "base64url"): string };
};

const account = privateKeyToAccount(keccak256(stringToBytes("studio auth service owner fixture")));
const otherAccount = privateKeyToAccount(keccak256(stringToBytes("studio auth service other fixture")));
const initialNow = new Date("2026-08-01T00:00:00.000Z");
const authenticationFailed = { ok: false, code: "authentication_failed" } as const;

const config: StudioAuthConfig = {
  organizationId: "tenant_default",
  organizationName: "Loop",
  ownerWallets: [account.address.toLowerCase() as `0x${string}`],
  origin: "https://app.example",
  studioUri: "https://app.example/studio",
  secureCookie: true
};

function setup(options: { bootstrapOwner?: boolean } = {}) {
  const repository = createMemoryStudioAuthRepository();
  repository.upsertOrganization({
    id: config.organizationId,
    displayName: config.organizationName,
    createdAt: initialNow.toISOString(),
    updatedAt: initialNow.toISOString()
  });
  if (options.bootstrapOwner !== false) {
    repository.syncBootstrapOwners({
      organizationId: config.organizationId,
      walletAddresses: config.ownerWallets,
      nowIso: initialNow.toISOString()
    });
  }
  let currentNow = new Date(initialNow);
  let nextByte = 1;
  const service = createStudioAuthService({
    repository,
    config,
    now: () => new Date(currentNow),
    randomBytes: (size) => Buffer.alloc(size, nextByte++)
  });
  return {
    repository,
    service,
    setNow(value: string) {
      currentNow = new Date(value);
    }
  };
}

async function verifyOwner(
  service: ReturnType<typeof createStudioAuthService>,
  issued = service.createChallenge(account.address)
) {
  const signature = await account.signMessage({ message: issued.message });
  const verified = await service.verifyChallenge({
    challengeId: issued.challengeId,
    message: issued.message,
    signature
  });
  if (!verified.ok) throw new Error("expected verified session");
  return { issued, verified };
}

describe("Studio auth service", () => {
  it("issues a configured five-minute challenge while storing only the nonce hash", () => {
    const { repository, service } = setup();

    const issued = service.createChallenge(account.address);
    const stored = repository.getChallenge(issued.challengeId);
    const parsed = parseStudioAuthMessage(issued.message);
    if (parsed === null) throw new Error("expected canonical challenge message");

    expect(issued).toMatchObject({
      challengeId: expect.stringMatching(/^challenge_[A-Za-z0-9_-]{24}$/u),
      expiresAt: new Date(initialNow.getTime() + STUDIO_AUTH_CHALLENGE_TTL_MS).toISOString()
    });
    expect(issued.message).toContain(`URI: ${config.studioUri}`);
    expect(issued.message).toContain(`Domain: ${new URL(config.origin).host}`);
    expect(issued.message).toContain("Chain ID: 91342");
    expect(stored).toMatchObject({
      expectedWallet: account.address.toLowerCase(),
      origin: config.origin,
      uri: config.studioUri,
      chainId: 91_342,
      issuedAt: initialNow.toISOString(),
      expiresAt: issued.expiresAt,
      attemptCount: 0,
      usedAt: null
    });
    expect(stored?.nonceHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(stored?.nonceHash).toBe(hashStudioAuthSecret(parsed.nonce));
    expect(JSON.stringify(stored)).not.toContain(parsed.nonce);
  });

  it("verifies a configured Owner and creates an exact eight-hour hashed session", async () => {
    const { repository, service, setNow } = setup();
    const issued = service.createChallenge(account.address);
    setNow("2026-08-01T00:01:00.000Z");
    const signature = await account.signMessage({ message: issued.message });

    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      message: issued.message,
      signature
    });

    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("expected verified session");
    expect(verified.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(verified.projection).toEqual({
      authenticated: true,
      organization: { id: "tenant_default", displayName: "Loop" },
      member: { walletAddress: account.address, role: "Owner" },
      chainId: 91_342,
      expiresAt: new Date(
        new Date("2026-08-01T00:01:00.000Z").getTime() + STUDIO_AUTH_SESSION_TTL_MS
      ).toISOString()
    });
    expect(Object.keys(verified.projection).sort()).toEqual([
      "authenticated",
      "chainId",
      "expiresAt",
      "member",
      "organization"
    ]);
    expect(JSON.stringify(verified.projection)).not.toContain(verified.rawToken);
    expect(repository.getSessionContextByTokenHash(
      hashStudioAuthSecret(verified.rawToken),
      "2026-08-01T00:02:00.000Z"
    )?.session).toMatchObject({
      tokenHash: hashStudioAuthSecret(verified.rawToken),
      expiresAt: verified.projection.expiresAt
    });
    expect(repository.getSessionContextByTokenHash(
      verified.rawToken,
      "2026-08-01T00:02:00.000Z"
    )).toBeNull();
    expect(service.authenticateSession(verified.rawToken)).toEqual({
      context: {
        actorId: account.address.toLowerCase(),
        tenantId: "tenant_default",
        memberId: expect.stringMatching(/^member_[a-f0-9]{64}$/u),
        mode: "wallet-session",
        organizationRole: "Owner",
        sessionId: expect.stringMatching(/^session_[A-Za-z0-9_-]{24}$/u)
      },
      projection: verified.projection
    });
    const authenticated = service.authenticateSession(verified.rawToken);
    if (authenticated === null) throw new Error("expected authenticated session");
    expect(JSON.stringify(authenticated.projection)).not.toContain("memberId");
  });

  it("returns one generic failure and increments once for an altered message", async () => {
    const { repository, service } = setup();
    const issued = service.createChallenge(account.address);
    const signature = await account.signMessage({ message: issued.message });

    await expect(service.verifyChallenge({
      challengeId: issued.challengeId,
      message: issued.message.replace(config.studioUri, `${config.origin}/other`),
      signature
    })).resolves.toEqual(authenticationFailed);
    expect(repository.getChallenge(issued.challengeId)?.attemptCount).toBe(1);
  });

  it("rejects an expired challenge without incrementing it", async () => {
    const { repository, service, setNow } = setup();
    const issued = service.createChallenge(account.address);
    const signature = await account.signMessage({ message: issued.message });
    setNow(issued.expiresAt);

    await expect(service.verifyChallenge({
      challengeId: issued.challengeId,
      message: issued.message,
      signature
    })).resolves.toEqual(authenticationFailed);
    expect(repository.getChallenge(issued.challengeId)?.attemptCount).toBe(0);
  });

  it("rejects a valid signature from the wrong signer without membership lookup success", async () => {
    const { service } = setup();
    const issued = service.createChallenge(account.address);
    const signature = await otherAccount.signMessage({ message: issued.message });

    await expect(service.verifyChallenge({
      challengeId: issued.challengeId,
      message: issued.message,
      signature
    })).resolves.toEqual(authenticationFailed);
  });

  it("does not reveal that a recovered signer lacks membership", async () => {
    const { service } = setup({ bootstrapOwner: false });
    const issued = service.createChallenge(account.address);
    const signature = await account.signMessage({ message: issued.message });

    await expect(service.verifyChallenge({
      challengeId: issued.challengeId,
      message: issued.message,
      signature
    })).resolves.toEqual(authenticationFailed);
  });

  it("allows five submitted attempts and rejects a sixth without incrementing past five", async () => {
    const { repository, service } = setup();
    const issued = service.createChallenge(account.address);
    const signature = await account.signMessage({ message: issued.message });
    const alteredMessage = issued.message.replace("Chain ID: 91342", "Chain ID: 1");

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await expect(service.verifyChallenge({
        challengeId: issued.challengeId,
        message: alteredMessage,
        signature
      })).resolves.toEqual(authenticationFailed);
    }
    expect(repository.getChallenge(issued.challengeId)?.attemptCount).toBe(5);
  });

  it("uses guarded challenge consumption so only one concurrent replay creates a session", async () => {
    const { service } = setup();
    const issued = service.createChallenge(account.address);
    const signature = await account.signMessage({ message: issued.message });

    const results = await Promise.all([
      service.verifyChallenge({ challengeId: issued.challengeId, message: issued.message, signature }),
      service.verifyChallenge({ challengeId: issued.challengeId, message: issued.message, signature })
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([authenticationFailed]);
  });

  it("rejects malformed signatures with the same public failure", async () => {
    const { service } = setup();
    const issued = service.createChallenge(account.address);

    await expect(service.verifyChallenge({
      challengeId: issued.challengeId,
      message: issued.message,
      signature: "0xinvalid"
    })).resolves.toEqual(authenticationFailed);
  });

  it("expires a session exactly at its fixed expiration", async () => {
    const { service, setNow } = setup();
    const { verified } = await verifyOwner(service);

    setNow(verified.projection.expiresAt);
    expect(service.authenticateSession(verified.rawToken)).toBeNull();
  });

  it("logs out idempotently", async () => {
    const { service } = setup();
    const { verified } = await verifyOwner(service);

    expect(service.logout(verified.rawToken)).toBeUndefined();
    expect(service.authenticateSession(verified.rawToken)).toBeNull();
    expect(service.logout(verified.rawToken)).toBeUndefined();
    expect(service.logout("unknown-token")).toBeUndefined();
  });

  it("invalidates an existing session when its bootstrap Owner is removed", async () => {
    const { repository, service } = setup();
    const { verified } = await verifyOwner(service);

    repository.syncBootstrapOwners({
      organizationId: config.organizationId,
      walletAddresses: [otherAccount.address.toLowerCase() as `0x${string}`],
      nowIso: "2026-08-01T00:02:00.000Z"
    });

    expect(service.authenticateSession(verified.rawToken)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { createMemoryStudioAuthRepository } from "./studioAuthRepository.ts";

const now = "2026-08-01T00:00:00.000Z";
const ownerA = "0x1111111111111111111111111111111111111111" as const;
const ownerB = "0x2222222222222222222222222222222222222222" as const;

function organization(id = "tenant-a") {
  return { id, displayName: id, createdAt: now, updatedAt: now };
}

function challenge(overrides: Partial<{
  challengeId: string;
  expectedWallet: `0x${string}`;
  nonceHash: string;
  expiresAt: string;
}> = {}) {
  return {
    challengeId: "challenge-one",
    expectedWallet: ownerA,
    nonceHash: "a".repeat(64),
    origin: "https://app.example",
    uri: "https://app.example/studio",
    chainId: 91_342 as const,
    issuedAt: now,
    expiresAt: "2026-08-01T00:05:00.000Z",
    usedAt: null,
    attemptCount: 0,
    createdAt: now,
    ...overrides
  };
}

function session(memberId: string, overrides: Partial<{
  sessionId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
}> = {}) {
  return {
    sessionId: "session-one",
    tokenHash: "b".repeat(64),
    memberId,
    createdAt: "2026-08-01T00:01:00.000Z",
    expiresAt: "2026-08-01T08:01:00.000Z",
    revokedAt: null,
    ...overrides
  };
}

function repositoryWithOwner() {
  const repository = createMemoryStudioAuthRepository();
  repository.upsertOrganization(organization());
  repository.syncBootstrapOwners({ organizationId: "tenant-a", walletAddresses: [ownerA], nowIso: now });
  return { repository, member: repository.getActiveMember("tenant-a", ownerA)! };
}

describe("memory Studio auth repository", () => {
  it("synchronizes only configured bootstrap Owners without changing their stable IDs", () => {
    const repository = createMemoryStudioAuthRepository();
    repository.upsertOrganization(organization());

    expect(repository.syncBootstrapOwners({
      organizationId: "tenant-a",
      walletAddresses: [ownerA, ownerA, ownerB],
      nowIso: now
    })).toEqual({ activeOwnerCount: 2 });
    const originalMemberId = repository.getActiveMember("tenant-a", ownerA)?.memberId;

    repository.syncBootstrapOwners({ organizationId: "tenant-a", walletAddresses: [ownerB], nowIso: now });
    expect(repository.getActiveMember("tenant-a", ownerA)).toBeNull();
    expect(repository.getActiveMember("tenant-a", ownerB)).toMatchObject({
      role: "Owner",
      status: "active",
      provisioningSource: "bootstrap-config"
    });

    repository.syncBootstrapOwners({ organizationId: "tenant-a", walletAddresses: [ownerA, ownerB], nowIso: now });
    expect(repository.getActiveMember("tenant-a", ownerA)?.memberId).toBe(originalMemberId);
    expect(() => repository.syncBootstrapOwners({ organizationId: "tenant-a", walletAddresses: [], nowIso: now }))
      .toThrow("studio_bootstrap_owner_required");
  });

  it("keeps the same wallet isolated by organization", () => {
    const repository = createMemoryStudioAuthRepository();
    for (const id of ["tenant-a", "tenant-b"]) {
      repository.upsertOrganization(organization(id));
      repository.syncBootstrapOwners({ organizationId: id, walletAddresses: [ownerA], nowIso: now });
    }

    const tenantAMember = repository.getActiveMember("tenant-a", ownerA)!;
    const tenantBMember = repository.getActiveMember("tenant-b", ownerA)!;
    expect(tenantAMember.organizationId).toBe("tenant-a");
    expect(tenantBMember.organizationId).toBe("tenant-b");
    expect(tenantAMember.memberId).not.toBe(tenantBMember.memberId);
  });

  it("rolls back organization provisioning when atomic Owner bootstrap synchronization fails", () => {
    const repository = createMemoryStudioAuthRepository();
    repository.upsertOrganization(organization("tenant-existing"));
    repository.syncBootstrapOwners({ organizationId: "tenant-existing", walletAddresses: [ownerA], nowIso: now });

    expect(() => repository.bootstrapOrganizationsAndOwners({
      organizations: [
        { ...organization("tenant-existing"), displayName: "Changed" },
        organization("tenant-new")
      ],
      organizationId: "tenant-new",
      walletAddresses: ["0x1234" as `0x${string}`],
      nowIso: now
    })).toThrow("invalid_studio_wallet");
    expect(repository.getActiveMember("tenant-existing", ownerA)).toMatchObject({
      role: "Owner",
      status: "active"
    });
    expect(() => repository.syncBootstrapOwners({
      organizationId: "tenant-new",
      walletAddresses: [ownerB],
      nowIso: now
    })).toThrow("studio_organization_not_found");
  });

  it("tracks attempts and rejects duplicate challenge IDs or nonce hashes", () => {
    const repository = createMemoryStudioAuthRepository();
    repository.createChallenge(challenge());

    expect(repository.incrementChallengeAttempt("challenge-one")).toBe(1);
    expect(repository.incrementChallengeAttempt("challenge-one")).toBe(2);
    expect(repository.getChallenge("challenge-one")?.attemptCount).toBe(2);
    expect(repository.incrementChallengeAttempt("missing")).toBe(0);
    expect(() => repository.createChallenge(challenge())).toThrow("duplicate_studio_auth_challenge");
    expect(() => repository.createChallenge(challenge({ challengeId: "challenge-two" })))
      .toThrow("duplicate_studio_auth_challenge");
  });

  it("consumes a challenge and creates one session atomically", () => {
    const { repository, member } = repositoryWithOwner();
    repository.createChallenge(challenge());
    const input = {
      challengeId: "challenge-one",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: session(member.memberId)
    };

    expect(repository.consumeChallengeAndCreateSession(input)).toBe(true);
    expect(repository.consumeChallengeAndCreateSession(input)).toBe(false);
    expect(repository.getChallenge("challenge-one")?.usedAt).toBe(input.nowIso);
    expect(repository.getSessionContextByTokenHash(input.session.tokenHash, "2026-08-01T00:02:00.000Z"))
      .toMatchObject({ organization: { id: "tenant-a" }, member: { role: "Owner", status: "active" } });
  });

  it("leaves a challenge unused when a duplicate session ID or token hash prevents creation", () => {
    const { repository, member } = repositoryWithOwner();
    const first = session(member.memberId);
    repository.createChallenge(challenge());
    expect(repository.consumeChallengeAndCreateSession({
      challengeId: "challenge-one",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: first
    })).toBe(true);

    repository.createChallenge(challenge({
      challengeId: "challenge-two",
      nonceHash: "c".repeat(64)
    }));
    expect(repository.consumeChallengeAndCreateSession({
      challengeId: "challenge-two",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: session(member.memberId, { tokenHash: "d".repeat(64) })
    })).toBe(false);
    expect(repository.getChallenge("challenge-two")?.usedAt).toBeNull();

    repository.createChallenge(challenge({
      challengeId: "challenge-three",
      nonceHash: "e".repeat(64)
    }));
    expect(repository.consumeChallengeAndCreateSession({
      challengeId: "challenge-three",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: session(member.memberId, { sessionId: "session-three" })
    })).toBe(false);
    expect(repository.getChallenge("challenge-three")?.usedAt).toBeNull();
  });

  it("leaves a challenge unused when the session member does not exist", () => {
    const repository = createMemoryStudioAuthRepository();
    repository.createChallenge(challenge());

    expect(repository.consumeChallengeAndCreateSession({
      challengeId: "challenge-one",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: session("missing-member")
    })).toBe(false);
    expect(repository.getChallenge("challenge-one")?.usedAt).toBeNull();
    expect(repository.getSessionContextByTokenHash("b".repeat(64), now)).toBeNull();
  });

  it("uses live active membership and rejects expired or revoked sessions", () => {
    const { repository, member } = repositoryWithOwner();
    repository.createChallenge(challenge());
    const activeSession = session(member.memberId);
    repository.consumeChallengeAndCreateSession({
      challengeId: "challenge-one",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: activeSession
    });
    expect(repository.getSessionContextByTokenHash(activeSession.tokenHash, "2026-08-01T00:02:00.000Z")?.member.role)
      .toBe("Owner");
    expect(repository.revokeSessionByTokenHash(activeSession.tokenHash, "2026-08-01T00:03:00.000Z")).toBe(true);
    expect(repository.revokeSessionByTokenHash(activeSession.tokenHash, "2026-08-01T00:04:00.000Z")).toBe(false);
    expect(repository.getSessionContextByTokenHash(activeSession.tokenHash, "2026-08-01T00:04:00.000Z")).toBeNull();

    repository.createChallenge(challenge({ challengeId: "challenge-two", nonceHash: "c".repeat(64) }));
    const expiringSession = session(member.memberId, {
      sessionId: "session-two",
      tokenHash: "d".repeat(64),
      expiresAt: "2026-08-01T00:02:00.000Z"
    });
    repository.consumeChallengeAndCreateSession({
      challengeId: "challenge-two",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: expiringSession
    });
    expect(repository.getSessionContextByTokenHash(expiringSession.tokenHash, expiringSession.expiresAt)).toBeNull();

    repository.createChallenge(challenge({ challengeId: "challenge-three", nonceHash: "e".repeat(64) }));
    const disabledMemberSession = session(member.memberId, {
      sessionId: "session-three",
      tokenHash: "f".repeat(64)
    });
    repository.consumeChallengeAndCreateSession({
      challengeId: "challenge-three",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: disabledMemberSession
    });
    repository.syncBootstrapOwners({ organizationId: "tenant-a", walletAddresses: [ownerB], nowIso: "2026-08-01T00:02:00.000Z" });
    expect(repository.getSessionContextByTokenHash(disabledMemberSession.tokenHash, "2026-08-01T00:03:00.000Z")).toBeNull();
  });

  it("prunes expired challenges and sessions at the requested bound", () => {
    const { repository, member } = repositoryWithOwner();
    repository.createChallenge(challenge({ challengeId: "challenge-oldest", nonceHash: "1".repeat(64), expiresAt: "2026-08-01T00:01:00.000Z" }));
    repository.createChallenge(challenge({ challengeId: "challenge-newer", nonceHash: "2".repeat(64), expiresAt: "2026-08-01T00:02:00.000Z" }));
    repository.createChallenge(challenge({ challengeId: "challenge-live", nonceHash: "3".repeat(64), expiresAt: "2026-08-01T00:04:00.000Z" }));
    for (const [challengeId, sessionId, tokenHash, expiresAt] of [
      ["challenge-oldest", "session-oldest", "4".repeat(64), "2026-08-01T00:01:00.000Z"],
      ["challenge-newer", "session-newer", "5".repeat(64), "2026-08-01T00:02:00.000Z"]
    ] as const) {
      expect(repository.consumeChallengeAndCreateSession({
        challengeId,
        nowIso: now,
        session: session(member.memberId, { sessionId, tokenHash, expiresAt })
      })).toBe(true);
    }

    expect(repository.pruneExpiredAuthRecords("2026-08-01T00:03:00.000Z", 1)).toEqual({
      challengesRemoved: 1,
      sessionsRemoved: 1
    });
    expect(repository.getChallenge("challenge-oldest")).toBeNull();
    expect(repository.getChallenge("challenge-newer")).not.toBeNull();
    expect(repository.getChallenge("challenge-live")).not.toBeNull();
    expect(repository.pruneExpiredAuthRecords("2026-08-01T00:03:00.000Z", 0)).toEqual({
      challengesRemoved: 0,
      sessionsRemoved: 0
    });
  });
});

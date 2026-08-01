import { createHash } from "node:crypto";

import { normalizeStudioWallet } from "./studioAuthMessage.ts";

export type StudioOrganizationRole = "Owner" | "Editor" | "Viewer";
export type StudioMemberStatus = "active" | "disabled";

export type StudioOrganization = {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioOrganizationMember = {
  memberId: string;
  organizationId: string;
  walletAddress: `0x${string}`;
  role: StudioOrganizationRole;
  status: StudioMemberStatus;
  provisioningSource: "bootstrap-config";
  createdAt: string;
  updatedAt: string;
};

export type StudioAuthChallenge = {
  challengeId: string;
  expectedWallet: `0x${string}`;
  nonceHash: string;
  origin: string;
  uri: string;
  chainId: 91342;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
  attemptCount: number;
  createdAt: string;
};

export type StudioAuthSession = {
  sessionId: string;
  tokenHash: string;
  memberId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type StudioAuthSessionContext = {
  session: StudioAuthSession;
  member: StudioOrganizationMember;
  organization: StudioOrganization;
};

export type StudioAuthRepository = {
  upsertOrganization(record: StudioOrganization): void;
  bootstrapOrganizationsAndOwners(input: {
    organizations: readonly StudioOrganization[];
    organizationId: string;
    walletAddresses: readonly `0x${string}`[];
    nowIso: string;
  }): { activeOwnerCount: number };
  syncBootstrapOwners(input: {
    organizationId: string;
    walletAddresses: readonly `0x${string}`[];
    nowIso: string;
  }): { activeOwnerCount: number };
  getActiveMember(organizationId: string, walletAddress: `0x${string}`): StudioOrganizationMember | null;
  createChallenge(record: StudioAuthChallenge): void;
  getChallenge(challengeId: string): StudioAuthChallenge | null;
  incrementChallengeAttempt(challengeId: string): number;
  consumeChallengeAndCreateSession(input: {
    challengeId: string;
    nowIso: string;
    session: StudioAuthSession;
  }): boolean;
  getSessionContextByTokenHash(tokenHash: string, nowIso: string): StudioAuthSessionContext | null;
  revokeSessionByTokenHash(tokenHash: string, revokedAt: string): boolean;
  pruneExpiredAuthRecords(nowIso: string, limit: number): {
    challengesRemoved: number;
    sessionsRemoved: number;
  };
};

function bootstrapMemberId(organizationId: string, walletAddress: `0x${string}`): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([organizationId, walletAddress]), "utf8")
    .digest("hex");
  return `member_${digest}`;
}

function cloneOrganization(record: StudioOrganization): StudioOrganization {
  return { ...record };
}

function cloneMember(record: StudioOrganizationMember): StudioOrganizationMember {
  return { ...record };
}

function cloneChallenge(record: StudioAuthChallenge): StudioAuthChallenge {
  return { ...record };
}

function cloneSession(record: StudioAuthSession): StudioAuthSession {
  return { ...record };
}

function boundedExpiredRecords<T extends { expiresAt: string }>(
  records: Iterable<T>,
  nowIso: string,
  limit: number
): T[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  return [...records]
    .filter((record) => record.expiresAt <= nowIso)
    .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt))
    .slice(0, Math.floor(limit));
}

export function createMemoryStudioAuthRepository(): StudioAuthRepository {
  const organizations = new Map<string, StudioOrganization>();
  const memberIdsByOrganizationAndWallet = new Map<string, Map<`0x${string}`, string>>();
  const membersById = new Map<string, StudioOrganizationMember>();
  const challengesById = new Map<string, StudioAuthChallenge>();
  const challengeIdsByNonceHash = new Map<string, string>();
  const sessionsByTokenHash = new Map<string, StudioAuthSession>();
  const tokenHashesBySessionId = new Map<string, string>();

  const memberFor = (organizationId: string, walletAddress: `0x${string}`): StudioOrganizationMember | undefined => {
    const memberId = memberIdsByOrganizationAndWallet.get(organizationId)?.get(walletAddress);
    return memberId === undefined ? undefined : membersById.get(memberId);
  };

  const upsertOrganization = (record: StudioOrganization) => {
    organizations.set(record.id, cloneOrganization(record));
  };

  const syncBootstrapOwners = ({ organizationId, walletAddresses, nowIso }: {
    organizationId: string;
    walletAddresses: readonly `0x${string}`[];
    nowIso: string;
  }) => {
    if (!organizations.has(organizationId)) throw new Error("studio_organization_not_found");
    const configuredWallets = new Set(walletAddresses.map(normalizeStudioWallet));
    if (configuredWallets.size === 0) throw new Error("studio_bootstrap_owner_required");

    const memberIdsByWallet = memberIdsByOrganizationAndWallet.get(organizationId) ?? new Map();
    memberIdsByOrganizationAndWallet.set(organizationId, memberIdsByWallet);
    for (const [walletAddress, memberId] of memberIdsByWallet) {
      if (configuredWallets.has(walletAddress)) continue;
      const member = membersById.get(memberId);
      if (member !== undefined && member.provisioningSource === "bootstrap-config" && member.status !== "disabled") {
        membersById.set(memberId, { ...member, status: "disabled", updatedAt: nowIso });
      }
    }
    for (const walletAddress of configuredWallets) {
      const memberId = memberIdsByWallet.get(walletAddress) ?? bootstrapMemberId(organizationId, walletAddress);
      const existing = membersById.get(memberId);
      const member: StudioOrganizationMember = {
        memberId,
        organizationId,
        walletAddress,
        role: "Owner",
        status: "active",
        provisioningSource: "bootstrap-config",
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso
      };
      memberIdsByWallet.set(walletAddress, memberId);
      membersById.set(memberId, member);
    }
    return { activeOwnerCount: configuredWallets.size };
  };

  const snapshotBootstrapState = () => ({
    organizations: new Map([...organizations].map(([id, record]) => [id, cloneOrganization(record)])),
    memberIdsByOrganizationAndWallet: new Map(
      [...memberIdsByOrganizationAndWallet].map(([organizationId, members]) => [organizationId, new Map(members)])
    ),
    membersById: new Map([...membersById].map(([memberId, member]) => [memberId, cloneMember(member)]))
  });

  const restoreBootstrapState = (snapshot: ReturnType<typeof snapshotBootstrapState>) => {
    organizations.clear();
    for (const [id, record] of snapshot.organizations) organizations.set(id, record);
    memberIdsByOrganizationAndWallet.clear();
    for (const [organizationId, members] of snapshot.memberIdsByOrganizationAndWallet) {
      memberIdsByOrganizationAndWallet.set(organizationId, members);
    }
    membersById.clear();
    for (const [memberId, member] of snapshot.membersById) membersById.set(memberId, member);
  };

  return {
    upsertOrganization(record) {
      upsertOrganization(record);
    },

    bootstrapOrganizationsAndOwners(input) {
      const snapshot = snapshotBootstrapState();
      try {
        for (const organization of input.organizations) upsertOrganization(organization);
        return syncBootstrapOwners(input);
      } catch (error) {
        restoreBootstrapState(snapshot);
        throw error;
      }
    },

    syncBootstrapOwners(input) {
      return syncBootstrapOwners(input);
    },

    getActiveMember(organizationId, walletAddress) {
      const member = memberFor(organizationId, normalizeStudioWallet(walletAddress));
      return member === undefined || member.status !== "active" ? null : cloneMember(member);
    },

    createChallenge(record) {
      const normalizedRecord = {
        ...record,
        expectedWallet: normalizeStudioWallet(record.expectedWallet)
      };
      if (challengesById.has(record.challengeId) || challengeIdsByNonceHash.has(record.nonceHash)) {
        throw new Error("duplicate_studio_auth_challenge");
      }
      challengesById.set(record.challengeId, cloneChallenge(normalizedRecord));
      challengeIdsByNonceHash.set(record.nonceHash, record.challengeId);
    },

    getChallenge(challengeId) {
      const challenge = challengesById.get(challengeId);
      return challenge === undefined ? null : cloneChallenge(challenge);
    },

    incrementChallengeAttempt(challengeId) {
      const challenge = challengesById.get(challengeId);
      if (challenge === undefined) return 0;
      const attemptCount = challenge.attemptCount + 1;
      challengesById.set(challengeId, { ...challenge, attemptCount });
      return attemptCount;
    },

    consumeChallengeAndCreateSession({ challengeId, nowIso, session }) {
      const challenge = challengesById.get(challengeId);
      if (challenge === undefined || challenge.usedAt !== null || challenge.expiresAt <= nowIso) return false;
      if (!membersById.has(session.memberId)) return false;
      if (sessionsByTokenHash.has(session.tokenHash) || tokenHashesBySessionId.has(session.sessionId)) return false;
      challengesById.set(challengeId, { ...challenge, usedAt: nowIso });
      sessionsByTokenHash.set(session.tokenHash, cloneSession(session));
      tokenHashesBySessionId.set(session.sessionId, session.tokenHash);
      return true;
    },

    getSessionContextByTokenHash(tokenHash, nowIso) {
      const session = sessionsByTokenHash.get(tokenHash);
      if (session === undefined || session.revokedAt !== null || session.expiresAt <= nowIso) return null;
      const member = membersById.get(session.memberId);
      if (member === undefined || member.status !== "active") return null;
      const organization = organizations.get(member.organizationId);
      if (organization === undefined) return null;
      return {
        session: cloneSession(session),
        member: cloneMember(member),
        organization: cloneOrganization(organization)
      };
    },

    revokeSessionByTokenHash(tokenHash, revokedAt) {
      const session = sessionsByTokenHash.get(tokenHash);
      if (session === undefined || session.revokedAt !== null) return false;
      sessionsByTokenHash.set(tokenHash, { ...session, revokedAt });
      return true;
    },

    pruneExpiredAuthRecords(nowIso, limit) {
      const expiredChallenges = boundedExpiredRecords(challengesById.values(), nowIso, limit);
      for (const challenge of expiredChallenges) {
        challengesById.delete(challenge.challengeId);
        challengeIdsByNonceHash.delete(challenge.nonceHash);
      }
      const expiredSessions = boundedExpiredRecords(sessionsByTokenHash.values(), nowIso, limit);
      for (const session of expiredSessions) {
        sessionsByTokenHash.delete(session.tokenHash);
        tokenHashesBySessionId.delete(session.sessionId);
      }
      return { challengesRemoved: expiredChallenges.length, sessionsRemoved: expiredSessions.length };
    }
  };
}

import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import type {
  StudioAuthChallenge,
  StudioAuthRepository,
  StudioAuthSession,
  StudioOrganization,
  StudioOrganizationMember
} from "./studioAuthRepository.ts";
import { normalizeStudioWallet } from "./studioAuthMessage.ts";

const STUDIO_AUTH_MIGRATION_ID = "008_studio_wallet_auth";
const STUDIO_AUTH_MIGRATION_CHECKSUM = "studio-wallet-auth-v1";

function stringValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`${key} is not a string`);
  return value;
}

function nullableStringValue(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`${key} is not a string`);
  return value;
}

function numberValue(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`${key} is not a number`);
}

function changesValue(result: unknown): number {
  if (typeof result !== "object" || result === null || !("changes" in result)) {
    throw new Error("SQLite statement result has no change count");
  }
  const changes = result.changes;
  if (typeof changes === "number") return changes;
  if (typeof changes === "bigint") return Number(changes);
  throw new Error("SQLite statement change count is invalid");
}

function bootstrapMemberId(organizationId: string, walletAddress: `0x${string}`): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([organizationId, walletAddress]), "utf8")
    .digest("hex");
  return `member_${digest}`;
}

function rowToOrganization(row: Record<string, unknown>): StudioOrganization {
  return {
    id: stringValue(row, "organizationId"),
    displayName: stringValue(row, "organizationDisplayName"),
    createdAt: stringValue(row, "organizationCreatedAt"),
    updatedAt: stringValue(row, "organizationUpdatedAt")
  };
}

function rowToMember(row: Record<string, unknown>): StudioOrganizationMember {
  const role = stringValue(row, "role");
  const status = stringValue(row, "status");
  const provisioningSource = stringValue(row, "provisioningSource");
  if (role !== "Owner" && role !== "Editor" && role !== "Viewer") {
    throw new Error("studio member role is invalid");
  }
  if (status !== "active" && status !== "disabled") {
    throw new Error("studio member status is invalid");
  }
  if (provisioningSource !== "bootstrap-config") {
    throw new Error("studio member provisioning source is invalid");
  }
  return {
    memberId: stringValue(row, "memberId"),
    organizationId: stringValue(row, "organizationId"),
    walletAddress: stringValue(row, "walletAddress") as `0x${string}`,
    role,
    status,
    provisioningSource,
    createdAt: stringValue(row, "memberCreatedAt"),
    updatedAt: stringValue(row, "memberUpdatedAt")
  };
}

function rowToChallenge(row: Record<string, unknown>): StudioAuthChallenge {
  const chainId = numberValue(row, "chainId");
  if (chainId !== 91_342) throw new Error("studio auth challenge chain is invalid");
  return {
    challengeId: stringValue(row, "challengeId"),
    expectedWallet: stringValue(row, "expectedWallet") as `0x${string}`,
    nonceHash: stringValue(row, "nonceHash"),
    origin: stringValue(row, "origin"),
    uri: stringValue(row, "uri"),
    chainId,
    issuedAt: stringValue(row, "issuedAt"),
    expiresAt: stringValue(row, "expiresAt"),
    usedAt: nullableStringValue(row, "usedAt"),
    attemptCount: numberValue(row, "attemptCount"),
    createdAt: stringValue(row, "createdAt")
  };
}

function rowToSession(row: Record<string, unknown>): StudioAuthSession {
  return {
    sessionId: stringValue(row, "sessionId"),
    tokenHash: stringValue(row, "tokenHash"),
    memberId: stringValue(row, "memberId"),
    createdAt: stringValue(row, "sessionCreatedAt"),
    expiresAt: stringValue(row, "sessionExpiresAt"),
    revokedAt: nullableStringValue(row, "revokedAt")
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

function isForeignKeyConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("FOREIGN KEY constraint failed");
}

export function installStudioAuthMigration(db: DatabaseSync, appliedAt: string): void {
  db.exec("pragma foreign_keys = on");
  db.exec("begin immediate");
  try {
    db.exec(`
      create table if not exists organizations (
        id text primary key,
        displayName text not null,
        createdAt text not null,
        updatedAt text not null
      );

      create table if not exists organization_members (
        memberId text primary key,
        organizationId text not null,
        walletAddress text not null,
        role text not null check (role in ('Owner', 'Editor', 'Viewer')),
        status text not null check (status in ('active', 'disabled')),
        provisioningSource text not null check (provisioningSource = 'bootstrap-config'),
        createdAt text not null,
        updatedAt text not null,
        foreign key (organizationId) references organizations(id),
        unique (organizationId, walletAddress)
      );

      create table if not exists auth_challenges (
        challengeId text primary key,
        expectedWallet text not null,
        nonceHash text not null unique,
        origin text not null,
        uri text not null,
        chainId integer not null check (chainId = 91342),
        issuedAt text not null,
        expiresAt text not null,
        usedAt text,
        attemptCount integer not null check (attemptCount >= 0),
        createdAt text not null
      );

      create table if not exists auth_sessions (
        sessionId text primary key,
        tokenHash text not null unique,
        memberId text not null,
        createdAt text not null,
        expiresAt text not null,
        revokedAt text,
        foreign key (memberId) references organization_members(memberId)
      );

      create index if not exists idx_organization_members_wallet
        on organization_members (organizationId, walletAddress, status);
      create index if not exists idx_auth_challenges_expiry
        on auth_challenges (expiresAt, usedAt);
      create index if not exists idx_auth_sessions_expiry
        on auth_sessions (expiresAt, revokedAt);
    `);
    db.prepare(
      "insert or ignore into schema_migrations (id, checksum, appliedAt) values (?, ?, ?)"
    ).run(STUDIO_AUTH_MIGRATION_ID, STUDIO_AUTH_MIGRATION_CHECKSUM, appliedAt);
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

function upsertOrganization(db: DatabaseSync, record: StudioOrganization): void {
  db.prepare(
    `insert into organizations (id, displayName, createdAt, updatedAt)
     values (?, ?, ?, ?)
     on conflict(id) do update set
       displayName = excluded.displayName,
       createdAt = excluded.createdAt,
       updatedAt = excluded.updatedAt`
  ).run(record.id, record.displayName, record.createdAt, record.updatedAt);
}

function synchronizeBootstrapOwners(
  db: DatabaseSync,
  { organizationId, walletAddresses, nowIso }: {
    organizationId: string;
    walletAddresses: readonly `0x${string}`[];
    nowIso: string;
  }
): { activeOwnerCount: number } {
  const configuredWallets = new Set(walletAddresses.map(normalizeStudioWallet));
  if (configuredWallets.size === 0) throw new Error("studio_bootstrap_owner_required");
  const organization = db.prepare("select id from organizations where id = ?").get(organizationId);
  if (organization === undefined) throw new Error("studio_organization_not_found");

  const existingMembers = db.prepare(
    `select memberId, walletAddress
     from organization_members
     where organizationId = ? and provisioningSource = ?`
  ).all(organizationId, "bootstrap-config");
  const disable = db.prepare(
    `update organization_members
     set status = ?, updatedAt = ?
     where memberId = ? and provisioningSource = ?`
  );
  for (const row of existingMembers) {
    const walletAddress = stringValue(row, "walletAddress") as `0x${string}`;
    if (!configuredWallets.has(normalizeStudioWallet(walletAddress))) {
      disable.run("disabled", nowIso, stringValue(row, "memberId"), "bootstrap-config");
    }
  }

  const upsert = db.prepare(
    `insert into organization_members (
       memberId, organizationId, walletAddress, role, status,
       provisioningSource, createdAt, updatedAt
     ) values (?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(organizationId, walletAddress) do update set
       role = excluded.role,
       status = excluded.status,
       provisioningSource = excluded.provisioningSource,
       updatedAt = excluded.updatedAt`
  );
  for (const walletAddress of configuredWallets) {
    upsert.run(
      bootstrapMemberId(organizationId, walletAddress),
      organizationId,
      walletAddress,
      "Owner",
      "active",
      "bootstrap-config",
      nowIso,
      nowIso
    );
  }
  return { activeOwnerCount: configuredWallets.size };
}

export function createSqliteStudioAuthRepository(db: DatabaseSync): StudioAuthRepository {
  return {
    upsertOrganization(record) {
      upsertOrganization(db, record);
    },

    bootstrapOrganizationsAndOwners(input) {
      db.exec("begin immediate");
      try {
        for (const organization of input.organizations) upsertOrganization(db, organization);
        const result = synchronizeBootstrapOwners(db, input);
        db.exec("commit");
        return result;
      } catch (error) {
        db.exec("rollback");
        throw error;
      }
    },

    syncBootstrapOwners(input) {
      db.exec("begin immediate");
      try {
        const result = synchronizeBootstrapOwners(db, input);
        db.exec("commit");
        return result;
      } catch (error) {
        db.exec("rollback");
        throw error;
      }
    },

    getActiveMember(organizationId, walletAddress) {
      const row = db.prepare(
        `select memberId, organizationId, walletAddress, role, status, provisioningSource,
                createdAt as memberCreatedAt, updatedAt as memberUpdatedAt
         from organization_members
         where organizationId = ? and walletAddress = ? and status = ?`
      ).get(organizationId, normalizeStudioWallet(walletAddress), "active");
      return row === undefined ? null : rowToMember(row);
    },

    createChallenge(record) {
      try {
        db.prepare(
          `insert into auth_challenges (
             challengeId, expectedWallet, nonceHash, origin, uri, chainId,
             issuedAt, expiresAt, usedAt, attemptCount, createdAt
           ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          record.challengeId,
          normalizeStudioWallet(record.expectedWallet),
          record.nonceHash,
          record.origin,
          record.uri,
          record.chainId,
          record.issuedAt,
          record.expiresAt,
          record.usedAt,
          record.attemptCount,
          record.createdAt
        );
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new Error("duplicate_studio_auth_challenge");
        throw error;
      }
    },

    getChallenge(challengeId) {
      const row = db.prepare("select * from auth_challenges where challengeId = ?").get(challengeId);
      return row === undefined ? null : rowToChallenge(row);
    },

    incrementChallengeAttempt(challengeId) {
      const row = db.prepare(
        `update auth_challenges
         set attemptCount = attemptCount + 1
         where challengeId = ?
         returning attemptCount`
      ).get(challengeId);
      return row === undefined ? 0 : numberValue(row, "attemptCount");
    },

    consumeChallengeAndCreateSession(input) {
      db.exec("begin immediate");
      try {
        const consumed = db.prepare(
          `update auth_challenges
           set usedAt = ?
           where challengeId = ? and usedAt is null and expiresAt > ?`
        ).run(input.nowIso, input.challengeId, input.nowIso);
        if (changesValue(consumed) !== 1) {
          db.exec("rollback");
          return false;
        }
        db.prepare(
          `insert into auth_sessions
             (sessionId, tokenHash, memberId, createdAt, expiresAt, revokedAt)
           values (?, ?, ?, ?, ?, ?)`
        ).run(
          input.session.sessionId,
          input.session.tokenHash,
          input.session.memberId,
          input.session.createdAt,
          input.session.expiresAt,
          input.session.revokedAt
        );
        db.exec("commit");
        return true;
      } catch (error) {
        db.exec("rollback");
        if (isUniqueConstraintError(error) || isForeignKeyConstraintError(error)) return false;
        throw error;
      }
    },

    getSessionContextByTokenHash(tokenHash, nowIso) {
      const row = db.prepare(
        `select
           s.sessionId, s.tokenHash, s.memberId,
           s.createdAt as sessionCreatedAt, s.expiresAt as sessionExpiresAt, s.revokedAt,
           m.organizationId, m.walletAddress, m.role, m.status, m.provisioningSource,
           m.createdAt as memberCreatedAt, m.updatedAt as memberUpdatedAt,
           o.displayName as organizationDisplayName,
           o.createdAt as organizationCreatedAt, o.updatedAt as organizationUpdatedAt
         from auth_sessions s
         join organization_members m on m.memberId = s.memberId
         join organizations o on o.id = m.organizationId
         where s.tokenHash = ?
           and m.status = ?
           and s.revokedAt is null
           and s.expiresAt > ?`
      ).get(tokenHash, "active", nowIso);
      if (row === undefined) return null;
      return {
        session: rowToSession(row),
        member: rowToMember(row),
        organization: rowToOrganization(row)
      };
    },

    revokeSessionByTokenHash(tokenHash, revokedAt) {
      const result = db.prepare(
        `update auth_sessions set revokedAt = ?
         where tokenHash = ? and revokedAt is null`
      ).run(revokedAt, tokenHash);
      return changesValue(result) === 1;
    },

    pruneExpiredAuthRecords(nowIso, limit) {
      if (!Number.isFinite(limit) || limit <= 0) {
        return { challengesRemoved: 0, sessionsRemoved: 0 };
      }
      const boundedLimit = Math.floor(limit);
      const challenges = db.prepare(
        `delete from auth_challenges
         where challengeId in (
           select challengeId from auth_challenges
           where expiresAt <= ?
           order by expiresAt asc
           limit ?
         )`
      ).run(nowIso, boundedLimit);
      const sessions = db.prepare(
        `delete from auth_sessions
         where sessionId in (
           select sessionId from auth_sessions
           where expiresAt <= ?
           order by expiresAt asc
           limit ?
         )`
      ).run(nowIso, boundedLimit);
      return {
        challengesRemoved: changesValue(challenges),
        sessionsRemoved: changesValue(sessions)
      };
    }
  };
}

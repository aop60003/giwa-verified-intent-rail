# GIWA Release 4 Wallet Session and Read-Only Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an application-defined EIP-191 Owner login, an eight-hour server session, organization-backed auth storage, and a read-only `/studio` without changing existing public or partner-token behavior.

**Architecture:** Keep wallet authentication additive to the live adapter. A strict challenge module owns canonical message bytes, an organization auth repository provides memory and SQLite parity, a service owns challenge/session state transitions, and a small HTTP adapter owns cookies and generic failures. The dependency-light Studio page consumes only the four auth endpoints; existing partner routes continue to accept only their current bearer credential.

**Tech Stack:** Node.js, pnpm 10 workspace, TypeScript 6, Vitest, viem 2.52, Node `crypto`, Node `sqlite`, dependency-light HTML/CSS/ES modules.

## Global Constraints

- The authoritative design is `docs/superpowers/specs/2026-08-01-giwa-release-4-wallet-session-studio-design.md`.
- Use `GIWA Verified Intent Rail` publicly. `Loop` is only the organization display name.
- Keep the experience on GIWA Sepolia chain ID `91342` and testnet-only.
- Describe the signature as an application-defined EIP-191 `personal_sign` challenge; do not claim complete SIWE compatibility.
- Challenge lifetime is exactly five minutes; session lifetime is exactly eight hours with no sliding extension.
- Hosted cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and have no `Domain`; only an explicitly detected loopback development origin may omit `Secure`.
- Store only SHA-256 hashes of nonce and session-token values. Do not log raw nonce, message, signature, cookie, token, environment value, IP address, or wallet address in a rate-limit bucket.
- Derive organization identity from the verified server session. Never accept a caller-supplied tenant or organization as authorization.
- Do not let wallet sessions authenticate any existing partner route in this slice.
- Preserve all existing Manifest, verifier-input, Receipt, and public-evidence bytes and hashes.
- Do not add open registration, membership UI, campaign mutations, Receipt history, analytics, PostgreSQL, mainnet, real assets, real rewards, RWA issuance, settlement, KYC, identity, phishing-prevention, or security-guarantee claims.
- Do not deploy, change DNS or cloud state, submit wallet or chain transactions, or expose `.env` values.
- Project policy requires explicit user direction before staging or committing. Every task ends at an unstaged review checkpoint. If the user later authorizes Git, create one Conventional Commit per accepted task; otherwise run no `git add` or `git commit` command.

## File Structure

### New domain and service files

- `apps/web/src/lib/live/studioAuthMessage.ts` — canonical EIP-191 message format/parser, wallet normalization, and SHA-256 helpers.
- `apps/web/src/lib/live/studioAuthMessage.test.ts` — canonical-byte and strict-parser tests.
- `apps/web/src/lib/live/studioAuthRepository.ts` — auth records, repository contract, and memory implementation.
- `apps/web/src/lib/live/studioAuthRepository.test.ts` — reusable memory repository behavior tests.
- `apps/web/src/lib/live/studioAuthSqliteRepository.ts` — SQLite schema installer and repository implementation over the live DB connection.
- `apps/web/src/lib/live/studioAuthConfig.ts` — redacted configuration evaluation and bootstrap synchronization.
- `apps/web/src/lib/live/studioAuthConfig.test.ts` — hosted fail-closed and bootstrap synchronization tests.
- `apps/web/src/lib/live/studioAuthService.ts` — challenge issuance, signature verification, session recovery, and logout.
- `apps/web/src/lib/live/studioAuthService.test.ts` — service state-transition and replay tests.
- `apps/web/src/lib/live/studioAuthApi.ts` — auth endpoint contract, Origin enforcement, cookie parsing/serialization, and generic HTTP errors.
- `apps/web/src/lib/live/studioAuthApi.test.ts` — endpoint and cookie contract tests.
- `apps/web/src/lib/live/studioAuthRuntimeContract.test.ts` — live-server wiring and no-authority-expansion source contract.

### New Studio assets

- `apps/web/public/studio.html` — Studio entry document and initial loading state.
- `apps/web/public/studio.js` — session recovery, user-triggered wallet/signature flow, read-only rendering, and logout.
- `apps/web/src/lib/live/studioPresentation.test.ts` — route, copy, accessibility, and browser-source contract.

### Existing files to modify

- `apps/web/src/lib/live/liveStore.ts` — expose `studioAuth`, install the new repository, record migration `008`, and report its schema.
- `apps/web/src/lib/live/liveStore.test.ts` — SQLite persistence, migration, foreign-key, unchanged-evidence, and parity checks.
- `apps/web/src/lib/live/liveSchemaMigrations.ts` — require and validate the four auth tables and indexes.
- `apps/web/src/lib/live/liveSchemaMigrations.test.ts` — exact migration/table/index readiness checks.
- `apps/web/src/lib/live/liveRoutePolicy.ts` and `.test.ts` — exact auth route classification.
- `apps/web/src/lib/live/liveRateLimit.ts` and `.test.ts` — privacy-safe auth-route IP buckets.
- `apps/web/src/lib/live/liveHealth.ts` and `.test.ts` — redacted Studio auth readiness labels.
- `apps/web/scripts/serve-live.mjs` — initialize config/bootstrap/service/API and dispatch auth routes before legacy live API handling.
- `apps/web/scripts/serve-static.mjs` — map `/studio` to the Studio document without adding any static auth shortcut.
- `apps/web/public/protocol-dossier.js` — add the Studio destination and active-view semantics.
- `apps/web/public/styles.css` — responsive Studio gate/card/state styles using the Release 3 tokens.
- `apps/web/src/lib/userFlow/protocolDossierPresentation.test.ts` — shared Studio destination and active-state contract.
- `apps/web/src/lib/live/publicCopyGuard.test.ts` — include the Studio assets in prohibited-copy scanning.
- `apps/web/src/lib/landing/landingRouting.test.ts` — assert static/live Studio route ownership.
- `docs/implementation/giwa-gasok-staging-runbook.md` — document names and gates for the new hosted configuration without values.
- `README.md` — route the current local state to the Release 4 freeze.
- `docs/implementation/giwa-release-4-wallet-session-studio-local-completion-freeze.md` — record local verification and unresolved external gates.

---

### Task 1: Canonical EIP-191 Challenge Message

**Files:**
- Create: `apps/web/src/lib/live/studioAuthMessage.ts`
- Create: `apps/web/src/lib/live/studioAuthMessage.test.ts`

**Interfaces:**
- Consumes: viem `getAddress`, `isAddress`; Node `createHash`.
- Produces:
  - `STUDIO_AUTH_CHAIN_ID = 91342`
  - `STUDIO_AUTH_CHALLENGE_TTL_MS = 300_000`
  - `STUDIO_AUTH_SESSION_TTL_MS = 28_800_000`
  - `normalizeStudioWallet(value: string): \`0x${string}\``
  - `formatStudioAuthMessage(fields: StudioAuthMessageFields): string`
  - `parseStudioAuthMessage(message: string): StudioAuthMessageFields | null`
  - `hashStudioAuthSecret(value: string): string`
  - `studioAuthHashEquals(leftHex: string, rightHex: string): boolean`

- [ ] **Step 1: Write strict formatter/parser tests**

Create `studioAuthMessage.test.ts` with a fixed field fixture and table-driven mutation cases:

```ts
import { describe, expect, it } from "vitest";

import {
  STUDIO_AUTH_CHAIN_ID,
  formatStudioAuthMessage,
  hashStudioAuthSecret,
  normalizeStudioWallet,
  parseStudioAuthMessage,
  studioAuthHashEquals
} from "./studioAuthMessage.ts";

const fields = {
  walletAddress: "0x1111111111111111111111111111111111111111" as const,
  statement: "Sign in to the Loop organization Studio. This does not submit a transaction or spend funds.",
  uri: "https://app.example/studio",
  domain: "app.example",
  chainId: STUDIO_AUTH_CHAIN_ID,
  nonce: "abcdefghijklmnopqrstuvwxyzABCDEF",
  issuedAt: "2026-08-01T00:00:00.000Z",
  expirationTime: "2026-08-01T00:05:00.000Z"
};

describe("Studio auth message", () => {
  it("formats and parses one canonical byte sequence", () => {
    const message = formatStudioAuthMessage(fields);
    expect(message).toBe(
      [
        "GIWA Verified Intent Rail authentication request",
        "",
        `Wallet: ${fields.walletAddress}`,
        `Statement: ${fields.statement}`,
        `URI: ${fields.uri}`,
        `Domain: ${fields.domain}`,
        "Chain ID: 91342",
        `Nonce: ${fields.nonce}`,
        `Issued At: ${fields.issuedAt}`,
        `Expiration Time: ${fields.expirationTime}`
      ].join("\n")
    );
    expect(parseStudioAuthMessage(message)).toEqual(fields);
  });

  it.each([
    ["changed title", (message: string) => message.replace("authentication request", "login")],
    ["reordered fields", (message: string) => message.replace("URI:", "Domain2:")],
    ["wrong chain", (message: string) => message.replace("91342", "1")],
    ["duplicate field", (message: string) => `${message}\nNonce: ${fields.nonce}`],
    ["non-canonical time", (message: string) => message.replace(".000Z", "Z")],
    ["unknown field", (message: string) => `${message}\nRequest ID: one`]
  ])("rejects %s", (_label, mutate) => {
    expect(parseStudioAuthMessage(mutate(formatStudioAuthMessage(fields)))).toBeNull();
  });

  it("normalizes valid EVM addresses and rejects malformed values", () => {
    expect(normalizeStudioWallet("0x1111111111111111111111111111111111111111")).toBe(
      "0x1111111111111111111111111111111111111111"
    );
    expect(() => normalizeStudioWallet("0x1234")).toThrow("invalid_studio_wallet");
  });

  it("hashes without returning the source value", () => {
    const hash = hashStudioAuthSecret("one-time-value");
    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(hash).not.toContain("one-time-value");
    expect(studioAuthHashEquals(hash, hash)).toBe(true);
    expect(studioAuthHashEquals(hash, "b".repeat(64))).toBe(false);
    expect(studioAuthHashEquals(hash, "short")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and observe the missing-module failure**

Run: `pnpm --filter @giwa/web test -- studioAuthMessage`

Expected: FAIL because `./studioAuthMessage.ts` does not exist.

- [ ] **Step 3: Implement one formatter and strict parser**

Create `studioAuthMessage.ts` with these exact constants and guards:

```ts
import { createHash, timingSafeEqual } from "node:crypto";
import { getAddress, isAddress } from "viem";

export const STUDIO_AUTH_CHAIN_ID = 91_342;
export const STUDIO_AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1_000;
export const STUDIO_AUTH_SESSION_TTL_MS = 8 * 60 * 60 * 1_000;
export const STUDIO_AUTH_STATEMENT =
  "Sign in to the Loop organization Studio. This does not submit a transaction or spend funds.";

export type StudioAuthMessageFields = {
  walletAddress: `0x${string}`;
  statement: typeof STUDIO_AUTH_STATEMENT;
  uri: string;
  domain: string;
  chainId: typeof STUDIO_AUTH_CHAIN_ID;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
};

export function normalizeStudioWallet(value: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) throw new Error("invalid_studio_wallet");
  return getAddress(value).toLowerCase() as `0x${string}`;
}

function canonicalIso(value: string): boolean {
  const time = new Date(value);
  return !Number.isNaN(time.getTime()) && time.toISOString() === value;
}

export function formatStudioAuthMessage(fields: StudioAuthMessageFields): string {
  return [
    "GIWA Verified Intent Rail authentication request",
    "",
    `Wallet: ${getAddress(fields.walletAddress)}`,
    `Statement: ${fields.statement}`,
    `URI: ${fields.uri}`,
    `Domain: ${fields.domain}`,
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    `Expiration Time: ${fields.expirationTime}`
  ].join("\n");
}

export function parseStudioAuthMessage(message: string): StudioAuthMessageFields | null {
  const lines = message.split("\n");
  if (lines.length !== 10 || lines[0] !== "GIWA Verified Intent Rail authentication request" || lines[1] !== "") {
    return null;
  }
  const value = (index: number, prefix: string): string | null =>
    lines[index]?.startsWith(prefix) === true ? lines[index]!.slice(prefix.length) : null;
  const wallet = value(2, "Wallet: ");
  const statement = value(3, "Statement: ");
  const uri = value(4, "URI: ");
  const domain = value(5, "Domain: ");
  const chainId = value(6, "Chain ID: ");
  const nonce = value(7, "Nonce: ");
  const issuedAt = value(8, "Issued At: ");
  const expirationTime = value(9, "Expiration Time: ");
  if (
    wallet === null || statement !== STUDIO_AUTH_STATEMENT || uri === null || domain === null ||
    chainId !== String(STUDIO_AUTH_CHAIN_ID) || nonce === null || issuedAt === null || expirationTime === null ||
    !/^[A-Za-z0-9_-]{32}$/u.test(nonce) || !canonicalIso(issuedAt) || !canonicalIso(expirationTime)
  ) return null;
  try {
    const normalized = normalizeStudioWallet(wallet);
    const parsedUri = new URL(uri);
    if (parsedUri.host !== domain) return null;
    const fields: StudioAuthMessageFields = {
      walletAddress: normalized,
      statement: STUDIO_AUTH_STATEMENT,
      uri,
      domain,
      chainId: STUDIO_AUTH_CHAIN_ID,
      nonce,
      issuedAt,
      expirationTime
    };
    return formatStudioAuthMessage(fields) === message ? fields : null;
  } catch {
    return null;
  }
}

export function hashStudioAuthSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function studioAuthHashEquals(leftHex: string, rightHex: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(leftHex) || !/^[a-f0-9]{64}$/u.test(rightHex)) return false;
  return timingSafeEqual(Buffer.from(leftHex, "hex"), Buffer.from(rightHex, "hex"));
}
```

- [ ] **Step 4: Verify the domain module**

Run: `pnpm --filter @giwa/web test -- studioAuthMessage && pnpm --filter @giwa/web typecheck`

Expected: PASS. Confirm tests compare the exact formatted string and reject every mutation.

- [ ] **Step 5: Stop at an unstaged review checkpoint**

Inspect: `git diff -- apps/web/src/lib/live/studioAuthMessage.ts apps/web/src/lib/live/studioAuthMessage.test.ts`

Expected: only the canonical message module and its tests; do not stage or commit.

---

### Task 2: Organization Auth Repository and Memory Semantics

**Files:**
- Create: `apps/web/src/lib/live/studioAuthRepository.ts`
- Create: `apps/web/src/lib/live/studioAuthRepository.test.ts`

**Interfaces:**
- Consumes: Task 1 normalized wallet and hash strings.
- Produces `StudioAuthRepository` with:
  - `upsertOrganization(record)`
  - `syncBootstrapOwners(input)`
  - `getActiveMember(organizationId, walletAddress)`
  - `createChallenge(record)` / `getChallenge(challengeId)` / `incrementChallengeAttempt(challengeId)`
  - `consumeChallengeAndCreateSession(input)` as one atomic operation
  - `getSessionContextByTokenHash(tokenHash, nowIso)`
  - `revokeSessionByTokenHash(tokenHash, revokedAt)`
  - `pruneExpiredAuthRecords(nowIso, limit)`
  - `createMemoryStudioAuthRepository()`

- [ ] **Step 1: Write repository behavior tests**

Create tests that use fixed records and assert bootstrap authority, isolation,
atomic consumption, current-role lookup, and bounded cleanup:

```ts
import { describe, expect, it } from "vitest";

import { createMemoryStudioAuthRepository } from "./studioAuthRepository.ts";

const now = "2026-08-01T00:00:00.000Z";
const ownerA = "0x1111111111111111111111111111111111111111" as const;
const ownerB = "0x2222222222222222222222222222222222222222" as const;

describe("memory Studio auth repository", () => {
  it("synchronizes only bootstrap-config Owners", () => {
    const repository = createMemoryStudioAuthRepository();
    repository.upsertOrganization({ id: "tenant-a", displayName: "Loop", createdAt: now, updatedAt: now });
    expect(repository.syncBootstrapOwners({
      organizationId: "tenant-a",
      walletAddresses: [ownerA, ownerB],
      nowIso: now
    })).toEqual({ activeOwnerCount: 2 });
    repository.syncBootstrapOwners({ organizationId: "tenant-a", walletAddresses: [ownerB], nowIso: now });
    expect(repository.getActiveMember("tenant-a", ownerA)).toBeNull();
    expect(repository.getActiveMember("tenant-a", ownerB)?.role).toBe("Owner");
  });

  it("keeps the same wallet isolated by organization", () => {
    const repository = createMemoryStudioAuthRepository();
    for (const id of ["tenant-a", "tenant-b"]) {
      repository.upsertOrganization({ id, displayName: id, createdAt: now, updatedAt: now });
      repository.syncBootstrapOwners({ organizationId: id, walletAddresses: [ownerA], nowIso: now });
    }
    expect(repository.getActiveMember("tenant-a", ownerA)?.organizationId).toBe("tenant-a");
    expect(repository.getActiveMember("tenant-b", ownerA)?.organizationId).toBe("tenant-b");
  });

  it("consumes a challenge and creates one session atomically", () => {
    const repository = createMemoryStudioAuthRepository();
    repository.upsertOrganization({ id: "tenant-a", displayName: "Loop", createdAt: now, updatedAt: now });
    repository.syncBootstrapOwners({ organizationId: "tenant-a", walletAddresses: [ownerA], nowIso: now });
    const member = repository.getActiveMember("tenant-a", ownerA)!;
    repository.createChallenge({
      challengeId: "challenge-one",
      expectedWallet: ownerA,
      nonceHash: "a".repeat(64),
      origin: "https://app.example",
      uri: "https://app.example/studio",
      chainId: 91342,
      issuedAt: now,
      expiresAt: "2026-08-01T00:05:00.000Z",
      usedAt: null,
      attemptCount: 0,
      createdAt: now
    });
    const input = {
      challengeId: "challenge-one",
      nowIso: "2026-08-01T00:01:00.000Z",
      session: {
        sessionId: "session-one",
        tokenHash: "b".repeat(64),
        memberId: member.memberId,
        createdAt: "2026-08-01T00:01:00.000Z",
        expiresAt: "2026-08-01T08:01:00.000Z",
        revokedAt: null
      }
    } as const;
    expect(repository.consumeChallengeAndCreateSession(input)).toBe(true);
    expect(repository.consumeChallengeAndCreateSession(input)).toBe(false);
    expect(repository.getSessionContextByTokenHash("b".repeat(64), "2026-08-01T00:02:00.000Z")?.organization.id)
      .toBe("tenant-a");
  });

  it("rejects expired or revoked sessions and prunes at the requested bound", () => {
    const repository = createMemoryStudioAuthRepository();
    expect(repository.pruneExpiredAuthRecords("2026-08-02T00:00:00.000Z", 1)).toEqual({
      challengesRemoved: 0,
      sessionsRemoved: 0
    });
  });
});
```

- [ ] **Step 2: Run the missing-repository test**

Run: `pnpm --filter @giwa/web test -- studioAuthRepository`

Expected: FAIL because the repository module does not exist.

- [ ] **Step 3: Define records and the repository contract**

Use these names consistently in `studioAuthRepository.ts`:

```ts
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
```

- [ ] **Step 4: Implement memory semantics without hidden authorization**

Implement maps keyed by organization, `(organizationId, walletAddress)`,
challenge ID, and token hash. Derive stable bootstrap member IDs from the
organization and normalized address hash; do not use array position. The
critical atomic transition must execute synchronously:

```ts
consumeChallengeAndCreateSession({ challengeId, nowIso, session }) {
  const challenge = challenges.get(challengeId);
  if (challenge === undefined || challenge.usedAt !== null || challenge.expiresAt <= nowIso) return false;
  if (sessionsByTokenHash.has(session.tokenHash)) return false;
  challenges.set(challengeId, { ...challenge, usedAt: nowIso });
  sessionsByTokenHash.set(session.tokenHash, { ...session });
  return true;
}
```

`getSessionContextByTokenHash` must return `null` when the session is expired or
revoked, the member is missing or disabled, or the organization is missing. It
must return the member's current role rather than a session-time snapshot.

- [ ] **Step 5: Verify memory behavior and types**

Run: `pnpm --filter @giwa/web test -- studioAuthRepository && pnpm --filter @giwa/web typecheck`

Expected: PASS with replay returning `false`, tenant lookups isolated, and no test depending on map iteration order.

- [ ] **Step 6: Stop at an unstaged review checkpoint**

Inspect: `git diff -- apps/web/src/lib/live/studioAuthRepository.ts apps/web/src/lib/live/studioAuthRepository.test.ts`

Expected: repository-only change; do not stage or commit.

---

### Task 3: SQLite Auth Schema, Migration 008, and Store Parity

**Files:**
- Create: `apps/web/src/lib/live/studioAuthSqliteRepository.ts`
- Modify: `apps/web/src/lib/live/liveStore.ts`
- Modify: `apps/web/src/lib/live/liveStore.test.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.test.ts`

**Interfaces:**
- Consumes: `StudioAuthRepository` from Task 2 and the existing live `DatabaseSync` connection.
- Produces:
  - `installStudioAuthMigration(db: DatabaseSync, appliedAt: string): void`
  - `createSqliteStudioAuthRepository(db: DatabaseSync): StudioAuthRepository`
  - `LiveStore.studioAuth: StudioAuthRepository`
  - required migration ID `008_studio_wallet_auth`

- [ ] **Step 1: Add failing schema and persistence tests**

Extend `liveSchemaMigrations.test.ts` to expect migration 008 and all table names:

```ts
expect(REQUIRED_LIVE_MIGRATIONS).toEqual([
  "001_live_base",
  "002_nullable_decision_tx_hash",
  "003_verification_jobs",
  "004_run_capability_hash",
  "005_decision_rpc_metadata",
  "006_public_evidence_bundles",
  "007_public_campaign_events",
  "008_studio_wallet_auth"
]);
```

Extend `liveStore.test.ts` with a temporary SQLite round trip:

```ts
it("persists Studio organizations, Owners, challenges, and sessions", () => {
  const dir = mkdtempSync(join(tmpdir(), "giwa-studio-auth-"));
  const dbPath = join(dir, "live.sqlite");
  try {
    const first = createSqliteLiveStore(dbPath);
    first.studioAuth.upsertOrganization({
      id: "tenant-a", displayName: "Loop",
      createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z"
    });
    first.studioAuth.syncBootstrapOwners({
      organizationId: "tenant-a",
      walletAddresses: ["0x1111111111111111111111111111111111111111"],
      nowIso: "2026-08-01T00:00:00.000Z"
    });
    first.close();

    const reopened = createSqliteLiveStore(dbPath);
    expect(reopened.studioAuth.getActiveMember(
      "tenant-a", "0x1111111111111111111111111111111111111111"
    )?.role).toBe("Owner");
    expect(reopened.getSchemaState().migrations).toContain("008_studio_wallet_auth");
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

Add a legacy-upgrade test that writes a known Receipt/public-evidence payload,
records its exact JSON/hash fields, reopens through the new store, and asserts
the fields are unchanged. Add direct `pragma foreign_key_list(...)` assertions
for members and sessions.

- [ ] **Step 2: Run the focused store tests and observe missing migration/repository failures**

Run: `pnpm --filter @giwa/web test -- liveSchemaMigrations liveStore`

Expected: FAIL because migration 008, `LiveStore.studioAuth`, and the tables do not exist.

- [ ] **Step 3: Install the additive SQLite schema transactionally**

Create `studioAuthSqliteRepository.ts`. `installStudioAuthMigration` executes
`pragma foreign_keys = on`, starts `begin immediate`, executes the schema below,
inserts migration ID `008_studio_wallet_auth` with checksum
`studio-wallet-auth-v1`, and commits. On any error it rolls back before
rethrowing.

```sql
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
```

Do not alter, copy, or rewrite existing live tables. The migration insert and
all four table/index creations must succeed or roll back together.

- [ ] **Step 4: Implement SQLite repository operations**

Use prepared statements for every value. Implement `syncBootstrapOwners` in
`begin immediate` / `commit` / `rollback`, upserting configured addresses and
disabling only rows with `provisioningSource = 'bootstrap-config'` that are not
in the normalized input set. Reject an empty input before opening the
transaction.

Implement the replay boundary as one transaction and one guarded update:

```ts
db.exec("begin immediate");
try {
  const consumed = db.prepare(
    `update auth_challenges
     set usedAt = ?
     where challengeId = ? and usedAt is null and expiresAt > ?`
  ).run(input.nowIso, input.challengeId, input.nowIso);
  if (Number(consumed.changes) !== 1) {
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
  throw error;
}
```

Join `auth_sessions -> organization_members -> organizations` for session
lookup and include `status = 'active'`, `revokedAt is null`, and
`expiresAt > nowIso` in SQL.

- [ ] **Step 5: Attach the repository to both live stores**

In `liveStore.ts`, add `studioAuth: StudioAuthRepository` to `LiveStore`, create
one memory repository inside `createMemoryLiveStore`, create one SQLite
repository over the existing `db`, and return it as `studioAuth`. Keep
`recordLocalMigrations` responsible for migrations 001-007, then call:

```ts
recordLocalMigrations(db);
installStudioAuthMigration(db, new Date(0).toISOString());
```

This preserves row order and prevents migration 008 from being recorded outside
its schema transaction. Add the four table names to `readLiveSchemaState`.

- [ ] **Step 6: Make readiness validate the exact auth schema**

Extend `LiveSchemaStateInput` with foreign-key metadata and make
`evaluateLiveSchemaState` require, when migration 008 is required:

- exact column order, declared SQLite type, nullability, and primary-key position;
- the membership composite unique index;
- unique nonce and token hashes;
- all three covering/expiry indexes shown above;
- `organization_members.organizationId -> organizations.id`;
- `auth_sessions.memberId -> organization_members.memberId`.

Read foreign keys with `pragma_foreign_key_list(?)` in `readLiveSchemaState`.
Any mismatch returns the existing fail-closed `migration_missing` result.

- [ ] **Step 7: Verify SQLite parity and non-destructive migration**

Run: `pnpm --filter @giwa/web test -- studioAuthRepository liveStore liveSchemaMigrations && pnpm --filter @giwa/web typecheck`

Expected: PASS. The legacy-upgrade fixture must retain its exact Receipt and public-evidence values.

- [ ] **Step 8: Stop at an unstaged review checkpoint**

Inspect: `git diff -- apps/web/src/lib/live/studioAuthSqliteRepository.ts apps/web/src/lib/live/liveStore.ts apps/web/src/lib/live/liveStore.test.ts apps/web/src/lib/live/liveSchemaMigrations.ts apps/web/src/lib/live/liveSchemaMigrations.test.ts`

Expected: additive auth schema only; no existing data rewrite and no stage/commit.

---

### Task 4: Redacted Configuration and Owner Bootstrap

**Files:**
- Create: `apps/web/src/lib/live/studioAuthConfig.ts`
- Create: `apps/web/src/lib/live/studioAuthConfig.test.ts`

**Interfaces:**
- Consumes: `EnvMap`, wallet normalization, and `StudioAuthRepository`.
- Produces:
  - `evaluateStudioAuthConfig(input): StudioAuthConfigReadiness`
  - `applyStudioAuthBootstrap(input): { activeOwnerCount: number }`
  - enabled `StudioAuthConfig` with `organizationId`, `organizationName`, `ownerWallets`, `origin`, `studioUri`, and `secureCookie`.

- [ ] **Step 1: Write hosted/local configuration tests**

```ts
import { describe, expect, it } from "vitest";

import { createMemoryStudioAuthRepository } from "./studioAuthRepository.ts";
import { applyStudioAuthBootstrap, evaluateStudioAuthConfig } from "./studioAuthConfig.ts";

const owner = "0x1111111111111111111111111111111111111111";

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
      env: {
        GIWA_LIVE_PARTNER_TENANT_ID: "tenant_default",
        GIWA_LIVE_STUDIO_ORGANIZATION_NAME: "Loop",
        GIWA_LIVE_STUDIO_OWNER_WALLETS: owner,
        GIWA_LIVE_PUBLIC_ORIGIN: "https://app.example"
      },
      mode: "staging-testnet",
      localOrigin: null
    });
    expect(result).toMatchObject({ ok: true, enabled: true, ownerCount: 1 });
    if (!result.ok || !result.enabled) throw new Error("expected enabled config");
    expect(result.config.studioUri).toBe("https://app.example/studio");
    expect(result.config.secureCookie).toBe(true);
    expect(JSON.stringify(result.readiness)).not.toContain(owner);
  });

  it("allows a disabled local Studio without silently granting an Owner", () => {
    const result = evaluateStudioAuthConfig({ env: {}, mode: "local", localOrigin: "http://127.0.0.1:4177" });
    expect(result).toMatchObject({ ok: true, enabled: false, ownerCount: 0 });
  });

  it("bootstraps existing tenant IDs and synchronizes configured Owners", () => {
    const repository = createMemoryStudioAuthRepository();
    const result = applyStudioAuthBootstrap({
      repository,
      config: {
        organizationId: "tenant_default",
        organizationName: "Loop",
        ownerWallets: [owner.toLowerCase() as `0x${string}`],
        origin: "https://app.example",
        studioUri: "https://app.example/studio",
        secureCookie: true
      },
      existingTenantIds: ["local", "tenant_default"],
      nowIso: "2026-08-01T00:00:00.000Z"
    });
    expect(result).toEqual({ activeOwnerCount: 1 });
    expect(repository.getActiveMember("tenant_default", owner as `0x${string}`)?.role).toBe("Owner");
  });
});
```

- [ ] **Step 2: Run the missing-config test**

Run: `pnpm --filter @giwa/web test -- studioAuthConfig`

Expected: FAIL because `studioAuthConfig.ts` does not exist.

- [ ] **Step 3: Implement exact configuration parsing**

Use these variables and rules:

```text
GIWA_LIVE_PARTNER_TENANT_ID          ^[A-Za-z0-9_-]{1,64}$; required hosted
GIWA_LIVE_STUDIO_ORGANIZATION_NAME  trimmed 1..80 chars; default Loop
GIWA_LIVE_STUDIO_OWNER_WALLETS      comma-separated unique valid EVM addresses; required hosted
GIWA_LIVE_PUBLIC_ORIGIN             exact HTTPS origin hosted
```

Local mode accepts only an `http:` loopback or `https:` local origin supplied
by the server. It does not invent a development Owner. Return raw config only
under the discriminated branch `{ ok: true, enabled: true, config }`; expose a
separate `readiness` object containing key status and `ownerCount`, never the
address list.

- [ ] **Step 4: Implement transactional bootstrap calls**

`applyStudioAuthBootstrap` must:

1. validate at least one Owner before mutation;
2. upsert one organization for each distinct existing tenant ID;
3. assign `Loop` only to the configured organization and an administrative
   `Tenant <id>` display label to other non-public records;
4. upsert the configured organization even when no old run exists;
5. call `syncBootstrapOwners` exactly once for the configured organization.

The function must never rewrite any run, job, Receipt, or public-evidence row.

- [ ] **Step 5: Verify redaction and bootstrap behavior**

Run: `pnpm --filter @giwa/web test -- studioAuthConfig studioAuthRepository && pnpm --filter @giwa/web typecheck`

Expected: PASS. Serializing readiness must not contain an Owner address.

- [ ] **Step 6: Stop at an unstaged review checkpoint**

Inspect: `git diff -- apps/web/src/lib/live/studioAuthConfig.ts apps/web/src/lib/live/studioAuthConfig.test.ts`

Expected: configuration and bootstrap only; no environment values added to repository files.

---

### Task 5: Challenge Verification and Eight-Hour Session Service

**Files:**
- Create: `apps/web/src/lib/live/studioAuthService.ts`
- Create: `apps/web/src/lib/live/studioAuthService.test.ts`

**Interfaces:**
- Consumes: Tasks 1-4 and viem `recoverMessageAddress` / `getAddress`.
- Produces `createStudioAuthService(options)` with:
  - `createChallenge(walletAddress)`
  - `verifyChallenge({ challengeId, message, signature })`
  - `authenticateSession(rawToken)`
  - `logout(rawToken)`
  - internal `StudioWalletAuthContext` and public-safe `StudioSessionProjection`.

- [ ] **Step 1: Write the end-to-end service tests with a deterministic test account**

Use `privateKeyToAccount` from `viem/accounts`, inject a monotonic `now`, and
inject deterministic random byte blocks. The happy path must sign the returned
message and assert:

```ts
const issued = service.createChallenge(account.address);
const signature = await account.signMessage({ message: issued.message });
const verified = await service.verifyChallenge({
  challengeId: issued.challengeId,
  message: issued.message,
  signature
});
expect(verified.ok).toBe(true);
if (!verified.ok) throw new Error("expected verified session");
expect(verified.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
expect(verified.projection).toMatchObject({
  authenticated: true,
  organization: { id: "tenant_default", displayName: "Loop" },
  member: { walletAddress: getAddress(account.address), role: "Owner" },
  chainId: 91342
});
expect(service.authenticateSession(verified.rawToken)).toEqual({
  context: {
    actorId: account.address.toLowerCase(),
    tenantId: "tenant_default",
    mode: "wallet-session",
    organizationRole: "Owner",
    sessionId: expect.stringMatching(/^session_/u)
  },
  projection: verified.projection
});
```

Add separate tests for altered message, expired challenge, wrong signer,
unknown member, sixth attempt, atomic replay, session expiry, logout, and Owner
disablement after login. Every public verification failure must equal:

```ts
{ ok: false, code: "authentication_failed" }
```

- [ ] **Step 2: Run the missing-service test**

Run: `pnpm --filter @giwa/web test -- studioAuthService`

Expected: FAIL because `studioAuthService.ts` does not exist.

- [ ] **Step 3: Implement challenge issuance**

Create IDs and opaque random values using injected `randomBytes` with a Node default. Encode
base64url without padding. Generate:

```ts
const issuedAt = options.now();
const expiresAt = new Date(issuedAt.getTime() + STUDIO_AUTH_CHALLENGE_TTL_MS);
const nonce = base64url(options.randomBytes(24));
const challengeId = `challenge_${base64url(options.randomBytes(18))}`;
```

Store `hashStudioAuthSecret(nonce)`, never `nonce`. Use the configured origin,
Studio URI, organization, and chain ID rather than request values.

- [ ] **Step 4: Implement verification and atomic session creation**

Verification order is fixed:

1. load challenge and reject missing, used, expired, or `attemptCount >= 5`;
2. increment the attempt count once for every submitted verification;
3. strictly parse the exact message;
4. compare normalized wallet, nonce hash, origin, URI, chain, issued-at, and expiration to the stored challenge;
5. recover the signing address and compare it to `expectedWallet`;
6. load an active Owner under the configured organization;
7. generate a 32-byte session token and independent session ID;
8. call `consumeChallengeAndCreateSession`; return generic failure when the guarded consume loses a race.

Set session expiration to exactly `now + STUDIO_AUTH_SESSION_TTL_MS`. Return the
raw token only from the successful internal service result; never place it in
the projection.

- [ ] **Step 5: Implement live membership session lookup and logout**

Hash the presented raw token before repository lookup.
`authenticateSession` returns `null` unless the joined member remains active
and role `Owner`. A successful result contains:

```ts
export type StudioWalletAuthContext = {
  actorId: `0x${string}`;
  tenantId: string;
  mode: "wallet-session";
  organizationRole: "Owner" | "Editor" | "Viewer";
  sessionId: string;
};
```

The HTTP layer receives both this internal context and the public projection,
but serializes only the projection. Format the projected wallet with viem
`getAddress`. After repository lookup, compare the returned stored hash with
the computed hash using `studioAuthHashEquals` before accepting the context.
`logout` hashes the token and calls repository revocation; it is idempotent for
unknown tokens.

- [ ] **Step 6: Verify service state transitions**

Run: `pnpm --filter @giwa/web test -- studioAuthMessage studioAuthRepository studioAuthService && pnpm --filter @giwa/web typecheck`

Expected: PASS. Replay, expiry, membership disablement, and all signature failures are covered.

- [ ] **Step 7: Stop at an unstaged review checkpoint**

Inspect: `git diff -- apps/web/src/lib/live/studioAuthService.ts apps/web/src/lib/live/studioAuthService.test.ts`

Expected: service-only change; no HTTP or browser concerns and no staged files.

---

### Task 6: Auth HTTP Contract, Cookies, Exact Routes, and Rate Limits

**Files:**
- Create: `apps/web/src/lib/live/studioAuthApi.ts`
- Create: `apps/web/src/lib/live/studioAuthApi.test.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.test.ts`
- Modify: `apps/web/src/lib/live/liveRateLimit.ts`
- Modify: `apps/web/src/lib/live/liveRateLimit.test.ts`

**Interfaces:**
- Consumes: `StudioAuthService` and an exact configured Origin.
- Produces:
  - `createStudioAuthApiHandler(options)`
  - `StudioAuthApiResult { status, body, headers }`
  - route class `auth`
  - auth rate-limit route kind and `authPerIpPerMinute`.

- [ ] **Step 1: Write API and cookie contract tests**

Use a fake service to isolate HTTP behavior. Assert exact route/method matching,
body validation, same-Origin enforcement, no token in JSON, and cookie flags:

```ts
expect(result.status).toBe(200);
expect(result.body).toEqual(sessionProjection);
expect(result.headers["set-cookie"]).toMatch(
  /^giwa_studio_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=28800; Expires=/u
);
expect(result.headers["set-cookie"]).toContain("; Secure");
expect(JSON.stringify(result.body)).not.toContain(rawToken);
```

Add tests for:

- `POST /api/auth/challenge` with exact `{ walletAddress }`;
- `POST /api/auth/verify` with exact three string fields;
- `GET /api/auth/session` with missing, valid, expired, and duplicate session cookies;
- `POST /api/auth/logout` revoking before a `Max-Age=0` clear cookie;
- missing/wrong Origin returning `403 origin_not_allowed` on all auth POSTs;
- malformed input returning `400 invalid_request`;
- service failure returning `401 authentication_failed` with no membership detail;
- local loopback cookie omitting `Secure`, hosted cookie including it.

- [ ] **Step 2: Add failing exact-route and rate-limit expectations**

Extend route tests with:

```ts
expect(classifyLiveApiRoute("POST", "/api/auth/challenge")).toBe("auth");
expect(classifyLiveApiRoute("POST", "/api/auth/verify")).toBe("auth");
expect(classifyLiveApiRoute("GET", "/api/auth/session")).toBe("auth");
expect(classifyLiveApiRoute("POST", "/api/auth/logout")).toBe("auth");
expect(classifyLiveApiRoute("GET", "/api/auth/challenge")).toBe("unknown");
expect(classifyLiveApiRoute("POST", "/api/auth/challenge/extra")).toBe("unknown");
```

Extend rate-limit tests to expect both challenge and verify POSTs to classify as
`{ kind: "auth" }`, with hashed IP buckets that do not contain the raw IP.

- [ ] **Step 3: Run focused tests and observe missing handler/classes**

Run: `pnpm --filter @giwa/web test -- studioAuthApi liveRoutePolicy liveRateLimit`

Expected: FAIL because the API handler and auth classifications do not exist.

- [ ] **Step 4: Implement strict cookie helpers**

Accept only one `giwa_studio_session` cookie whose value matches
`^[A-Za-z0-9_-]{43}$`. Duplicate names, invalid encoding, or invalid length
behave as no session. Serialize success with:

```ts
function sessionCookie(rawToken: string, expiresAt: string, secure: boolean): string {
  return [
    `giwa_studio_session=${rawToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=28800",
    `Expires=${new Date(expiresAt).toUTCString()}`,
    secure ? "Secure" : null
  ].filter((part): part is string => part !== null).join("; ");
}
```

Clear with the same path and attributes plus `Max-Age=0` and
`Expires=Thu, 01 Jan 1970 00:00:00 GMT`.

- [ ] **Step 5: Implement the endpoint handler**

Define one dispatcher over `{ method, pathname, origin, cookie, body,
requestId }`. Before any auth POST, require `origin === configuredOrigin`.
Validate body shape with exact own-key sets; arrays, null, additional fields,
and non-string fields return `400`.

Endpoint results:

```text
challenge success  200 challenge JSON, no cookie
verify success     200 public projection, Set-Cookie
session valid      200 public projection
session absent     200 { authenticated: false }, clear stale cookie when present
logout             204 empty body, clear cookie after service logout
```

Do not return the raw token from the handler body and do not put raw service
errors in `error`. Catch unexpected service/store errors at this boundary and
return only `{ error: "service_unavailable", requestId }` with status `500`.

- [ ] **Step 6: Add exact auth route and rate-limit policy**

Add `"auth"` to `LiveApiRouteClass`. Match only the four method/path pairs
listed in the design. Add:

```ts
authPerIpPerMinute: 20
```

to `LIVE_RATE_LIMIT_POLICY`, extend `LiveRateLimitRoute` with
`{ kind: "auth" }`, and classify only challenge and verify POSTs as auth-rate
routes. Existing general IP limiting still applies to session/logout.

- [ ] **Step 7: Verify the HTTP boundary**

Run: `pnpm --filter @giwa/web test -- studioAuthApi liveRoutePolicy liveRateLimit && pnpm --filter @giwa/web typecheck`

Expected: PASS. Cookie tests show no raw token in response JSON and route variants fail closed.

- [ ] **Step 8: Stop at an unstaged review checkpoint**

Inspect the six task files with `git diff --`. Confirm no existing partner route
accepts `auth` and do not stage or commit.

---

### Task 7: Live Runtime Wiring and Hosted Readiness

**Files:**
- Create: `apps/web/src/lib/live/studioAuthRuntimeContract.test.ts`
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/src/lib/live/liveHealth.ts`
- Modify: `apps/web/src/lib/live/liveHealth.test.ts`

**Interfaces:**
- Consumes: config/bootstrap, live store repository, auth service/API, route/rate classifiers.
- Produces: a locally runnable auth API and hosted fail-closed readiness without changing legacy auth acceptance.

- [ ] **Step 1: Write the runtime source contract before wiring**

Read `scripts/serve-live.mjs` as text and assert it contains imports and calls for
`evaluateStudioAuthConfig`, `applyStudioAuthBootstrap`,
`createStudioAuthService`, and `createStudioAuthApiHandler`. Assert the auth
route branch appears before `authenticateLiveRequest`, and retain this negative
contract:

```ts
expect(source).not.toMatch(
  /routeClass\s*===\s*["']partner["'][\s\S]{0,500}wallet-session/u
);
expect(source).not.toMatch(/console\.(?:log|error)\([^)]*(?:rawToken|signature|nonce|message)/u);
```

Extend health tests so missing Studio Owner configuration is redacted to
`studio-owner-list`, organization ID to `studio-organization`, and organization
name to `studio-organization-name`; raw key names and values must not appear.

- [ ] **Step 2: Run the runtime/health tests and observe missing wiring**

Run: `pnpm --filter @giwa/web test -- studioAuthRuntimeContract liveHealth`

Expected: FAIL because the runtime does not initialize Studio auth and health does not map its readiness keys.

- [ ] **Step 3: Evaluate Studio config before hosted policy**

In `startLiveServer`, derive the local origin as `http://${host}:${port}` and
evaluate Studio auth from `loadedEnv.effectiveEnv`. For hosted mode require both
the existing credential hashes and `studioAuthReadiness.ok` in the hosted auth
gate. For local mode, allow the server to start with Studio auth disabled.

Log only:

```ts
{
  studioAuthReadiness: studioAuthReadiness.readiness,
  studioAuthEnabled: studioAuthReadiness.enabled
}
```

Never serialize `studioAuthReadiness.config`.

- [ ] **Step 4: Bootstrap the repository and create the service**

Immediately after `createSqliteLiveStore(dbPath)`, when config is enabled:

```ts
applyStudioAuthBootstrap({
  repository: store.studioAuth,
  config: studioAuthReadiness.config,
  existingTenantIds: store.listRuns().map((run) => run.tenantId ?? "local"),
  nowIso: new Date().toISOString()
});
```

Create the service and HTTP handler with the same repository and config. When
local Studio auth is disabled, install a bounded handler that returns
`503 studio_auth_unavailable` without exposing configuration detail.

- [ ] **Step 5: Dispatch auth endpoints without broadening partner auth**

Inside the `/api/` block:

1. classify and consume general/auth IP limits;
2. apply existing request-safety checks;
3. parse POST JSON with `readLiveJsonBody`;
4. if `routeClass === "auth"`, call the Studio auth API, write its status/body/headers, emit only the existing redacted request event, and return;
5. only then run existing partner credential authentication and existing live API dispatch.

For auth rate-limit routes, add a second hashed IP input using
`LIVE_RATE_LIMIT_POLICY.authPerIpPerMinute`. Do not use the submitted wallet,
message, signature, or cookie as an un-hashed bucket or telemetry value.

- [ ] **Step 6: Merge readiness without exposing config**

Hosted `/readyz` must require Studio config readiness in `authReady`, keep
schema migration 008 in `schemaReady`, and merge Studio missing/invalid key
names into `buildLiveReadinessBody`. Add exact redaction mappings in
`liveHealth.ts`:

```ts
if (key === "GIWA_LIVE_STUDIO_OWNER_WALLETS") return "studio-owner-list";
if (key === "GIWA_LIVE_PARTNER_TENANT_ID") return "studio-organization";
if (key === "GIWA_LIVE_STUDIO_ORGANIZATION_NAME") return "studio-organization-name";
```

- [ ] **Step 7: Verify runtime wiring and regression-sensitive live tests**

Run: `pnpm --filter @giwa/web test -- studioAuthRuntimeContract liveHealth hostedMode liveRequestSafety liveAuth liveApi && pnpm --filter @giwa/web typecheck`

Expected: PASS. Existing partner credential tests retain their previous acceptance/rejection behavior.

- [ ] **Step 8: Stop at an unstaged review checkpoint**

Inspect the runtime and health diff. Search:

`rg -n "rawToken|signature|nonce|GIWA_LIVE_STUDIO_OWNER_WALLETS" apps/web/scripts/serve-live.mjs apps/web/src/lib/live/liveHealth.ts`

Expected: references are limited to type-safe plumbing/redacted key mapping; no value logging, staging, or commit.

---

### Task 8: Read-Only Studio Page and Shared Dossier Navigation

**Files:**
- Create: `apps/web/public/studio.html`
- Create: `apps/web/public/studio.js`
- Create: `apps/web/src/lib/live/studioPresentation.test.ts`
- Modify: `apps/web/public/protocol-dossier.js`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/scripts/serve-static.mjs`
- Modify: `apps/web/src/lib/userFlow/protocolDossierPresentation.test.ts`
- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`
- Modify: `apps/web/src/lib/landing/landingRouting.test.ts`

**Interfaces:**
- Consumes: the four auth endpoints and browser EIP-1193 provider.
- Produces: `/studio`, exported render helpers for QA, and no campaign mutation controls.

- [ ] **Step 1: Write the Studio presentation/source tests**

Assert all of the following:

```ts
const html = readWebFile("public/studio.html");
const source = readWebFile("public/studio.js");
const css = readWebFile("public/styles.css");

expect(html).toContain("GIWA Verified Intent Rail");
expect(html).toContain("/fonts/pretendard-giwa-subset.woff2");
expect(html).toContain('<script src="/protocol-dossier.js"></script>');
expect(html).toContain('<script type="module" src="/studio.js"></script>');
expect(source).toContain('"/api/auth/session"');
expect(source).toContain('"/api/auth/challenge"');
expect(source).toContain('"/api/auth/verify"');
expect(source).toContain('"/api/auth/logout"');
expect(source).toContain('method: "personal_sign"');
expect(source).toContain('method: "wallet_switchEthereumChain"');
expect(source).toContain('credentials: "same-origin"');
expect(source).not.toContain("innerHTML");
expect(source).not.toMatch(/eth_sendTransaction|wallet_addEthereumChain/u);
expect(source).not.toMatch(/campaign.*(?:create|publish|delete)/iu);
expect(css).toContain(".studio-primary-action:focus-visible");
expect(css).toMatch(/\.studio-primary-action[\s\S]*min-height:\s*var\(--protocol-target\)/u);
expect(css).toContain("@media (max-width: 360px)");
expect(css).not.toContain("min-width: 320px");
```

Extend the route tests to require `/studio -> /studio.html` in both static and
live servers. Extend the shared Dossier test to require a Studio destination.
Add `studio.html` and `studio.js` to `publicCopyGuard.test.ts`.

- [ ] **Step 2: Run presentation tests and observe missing assets/routes**

Run: `pnpm --filter @giwa/web test -- studioPresentation protocolDossierPresentation landingRouting publicCopyGuard`

Expected: FAIL because the Studio assets and route mapping do not exist.

- [ ] **Step 3: Create the semantic Studio document**

Create `studio.html` using the same font preload and `/styles.css` as the
current user/index documents:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="지갑 서명으로 접근하는 GIWA Verified Intent Rail 조직 Studio." />
    <title>Organization Studio · GIWA Verified Intent Rail</title>
    <link rel="preload" href="/fonts/pretendard-giwa-subset.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/fonts/pretendard.css" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main id="studio-app" class="app-shell studio-shell">
      <section class="loading-panel" aria-live="polite" aria-busy="true">
        <p class="eyebrow">GIWA Verified Intent Rail · Studio</p>
        <h1>세션을 확인하는 중</h1>
      </section>
    </main>
    <script src="/protocol-dossier.js"></script>
    <script type="module" src="/studio.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Implement passive session recovery and explicit wallet actions**

In `studio.js`, export `renderStudioGate` and `renderAuthenticatedStudio` for
browser QA, then call a private `boot()` at module load. Build DOM nodes with
`createElement` and `textContent` only.

On boot, call only `GET /api/auth/session`. Do not access `ethereum` until the
user clicks `Connect wallet`. The click flow is:

```js
const accounts = await provider.request({ method: "eth_requestAccounts" });
const chainId = Number.parseInt(await provider.request({ method: "eth_chainId" }), 16);
if (chainId !== 91342) {
  renderStudioGate({ state: "wrong-network", walletAddress: accounts[0] });
  return;
}
const challenge = await authFetch("/api/auth/challenge", {
  method: "POST",
  body: JSON.stringify({ walletAddress: accounts[0] })
});
const signature = await provider.request({
  method: "personal_sign",
  params: [challenge.message, accounts[0]]
});
const session = await authFetch("/api/auth/verify", {
  method: "POST",
  body: JSON.stringify({
    challengeId: challenge.challengeId,
    message: challenge.message,
    signature
  })
});
renderAuthenticatedStudio(session);
```

`authFetch` always sets `credentials: "same-origin"` and JSON content type for
POST. It maps public error codes to bounded Korean copy and never renders a raw
server error. Error code `4001` maps separately for account, network-switch,
and signature rejection based on the active operation.

The `Switch network` button calls only:

```js
provider.request({
  method: "wallet_switchEthereumChain",
  params: [{ chainId: "0x164ce" }]
});
```

It never switches on load. Logout POSTs `{}` to `/api/auth/logout`, waits for
success, and renders the disconnected gate.

- [ ] **Step 5: Render only the approved information hierarchy**

The unauthenticated gate contains product identity, GIWA Sepolia/Testnet state,
one organization-auth explanation, the connect/switch action, and the exact
meaning statement that signing does not submit a transaction, spend funds, or
require gas.

The authenticated card contains only:

```text
organization.displayName
member.walletAddress
member.role
GIWA Sepolia · Testnet
localized absolute expiresAt
Sign out
```

Use `aria-live="polite"` for state copy and keep focus on the user's active
control unless a full authenticated view replaces the gate. Do not add disabled
campaign, analytics, Receipt, or membership controls.

- [ ] **Step 6: Add Studio navigation and route ownership**

In `protocol-dossier.js`, add `[/studio, Studio, studio]` to the destination
list and support `activeView: "studio"`. In both server `publicPath` functions,
map exact `/studio` to `/studio.html`; do not map `/studio/*` and do not create a
static API response.

- [ ] **Step 7: Add responsive/accessibility styles using existing tokens**

Add focused selectors for `.studio-shell`, `.studio-auth-gate`,
`.studio-organization-card`, `.studio-state`, `.studio-primary-action`, and
`.studio-secondary-action`. Use `min-height: var(--protocol-target)`, existing
color/focus tokens, `overflow-wrap: anywhere` for the wallet address, one column
at 360px, and the existing reduced-motion block. Do not add a minimum page
width, remote asset, emoji, CSS-drawn icon, or new font.

- [ ] **Step 8: Verify the Studio static surface**

Run: `pnpm --filter @giwa/web test -- studioPresentation protocolDossierPresentation landingRouting publicCopyGuard && pnpm --filter @giwa/web typecheck`

Expected: PASS. The source scan finds no transaction call, raw error rendering, prohibited public name, or campaign mutation control.

- [ ] **Step 9: Stop at an unstaged review checkpoint**

Inspect all Task 8 files. Confirm the page works as a sign-in shell under the
static server but obtains no protected data without the live auth API. Do not
stage or commit.

---

### Task 9: Regression Gate, Browser QA, Runbook, and Local Completion Freeze

**Files:**
- Modify: `docs/implementation/giwa-gasok-staging-runbook.md`
- Modify: `README.md`
- Create: `docs/implementation/giwa-release-4-wallet-session-studio-local-completion-freeze.md`
- Verify: every file changed by Tasks 1-8

**Interfaces:**
- Consumes: the completed local vertical slice.
- Produces: fresh verification evidence and an explicit non-deployment handoff.

- [ ] **Step 1: Run all focused Release 4 tests from a clean process**

Run:

```powershell
pnpm --filter @giwa/web test -- studioAuthMessage studioAuthRepository studioAuthConfig studioAuthService studioAuthApi studioAuthRuntimeContract studioPresentation liveStore liveSchemaMigrations liveRoutePolicy liveRateLimit liveHealth protocolDossierPresentation landingRouting publicCopyGuard
```

Expected: PASS with no retry and no ignored failure.

- [ ] **Step 2: Run the complete verification matrix**

Run in order:

```powershell
pnpm --filter @giwa/web test
pnpm typecheck
pnpm test
pnpm build
```

Expected: every command exits 0. If a caused failure appears, return to the
owning task and fix it before continuing. Record a pre-existing unrelated
failure separately only when fresh evidence proves it predates this slice.

- [ ] **Step 3: Perform live API smoke verification without a real wallet or chain action**

Start `pnpm --filter @giwa/web dev:live` only in local mock mode with a temporary
SQLite path and a deterministic test-account address supplied through the
established local environment mechanism. Use the deterministic test account in
a one-off Node process to:

1. request a challenge;
2. sign its returned message locally;
3. verify from the same configured Origin;
4. retain only the response cookie in process memory;
5. recover the session;
6. logout;
7. confirm the same cookie no longer authenticates.

Expected: status sequence `200, 200, 200, 204, authenticated:false`. Do not
print the message, signature, cookie, raw token, signer material, or `.env` content.
Stop the server and remove only the explicitly created temporary database after
resolving and verifying its path.

- [ ] **Step 4: Inspect Studio browser states and responsive boundaries**

With the local server running, inspect `/studio` at `320x720`, `390x844`,
`1366x768`, and `1440x1024`:

- loading to disconnected gate;
- wallet-unavailable state;
- wrong-network state through an ephemeral browser-tool provider stub;
- authenticated card by calling the exported renderer with a public-safe fake
  projection, not by adding a source backdoor;
- session-expired/access-denied and retryable copy;
- visible keyboard focus, 44px targets, reduced-motion rule, 200% reflow, and
  `scrollWidth <= clientWidth`.

Expected: no console error, no automatic wallet prompt, no horizontal overflow,
and no campaign mutation controls. This visual fixture validates rendering only;
the real signature/session authority remains proven by service/API tests and
the local API smoke.

- [ ] **Step 5: Scan the final diff for authority or secret leakage**

Run:

```powershell
git diff --check
rg -n "Loop Rail|Looprail|GIWA Verified Activation Rail|eth_sendTransaction|real yield|real funds|settlement complete|SIWE-compatible" apps/web/public apps/web/src/lib/live/studioAuth* docs/implementation/giwa-release-4-wallet-session-studio-local-completion-freeze.md
rg -n "console\.(log|error).*?(rawToken|signature|nonce|message|cookie)|GIWA_LIVE_STUDIO_OWNER_WALLETS=.*0x" apps/web docs
git status --short
```

Expected: the first command reports no whitespace error; claim/auth scans have
no unsafe match; status lists only intentional local changes. A non-goal sentence
may contain a prohibited concept only when it clearly denies the claim.

- [ ] **Step 6: Update the staging runbook without values or execution**

Add rows for:

```text
GIWA_LIVE_PARTNER_TENANT_ID
GIWA_LIVE_STUDIO_ORGANIZATION_NAME
GIWA_LIVE_STUDIO_OWNER_WALLETS
```

Document that hosted readiness requires an explicit organization ID, at least
one valid Owner address, and the existing exact HTTPS public Origin. State that
Owner addresses are public configuration, but readiness/logs expose only
validation state and count. Add backup-before-migration, migration 008 schema
readiness, cookie/Origin smoke, and additive rollback checks. Do not add actual
addresses, URLs, credentials, commands that deploy, or a claim that staging was
changed. Correct the existing required-key count rather than leaving the old
number.

- [ ] **Step 7: Write the Release 4 local completion freeze**

Follow the Release 3 freeze structure and record:

- exact completion boundary and excluded Release 4 features;
- auth/message/session/storage/UI behavior actually delivered;
- focused/full command outcomes and counts from Steps 1-2;
- API status sequence without values from Step 3;
- browser viewport outcomes from Step 4;
- migration 008 and legacy hash preservation evidence;
- unresolved Git, protected CI, deployment, DNS/HTTPS, hosted configuration,
  wallet, and chain approval gates.

Update `README.md` to link the design, this plan, and the new freeze, and route
the next product slice to a separately reviewed Release 4 campaign/role design.

- [ ] **Step 8: Re-run docs-sensitive guards and final diff inspection**

Run:

```powershell
pnpm --filter @giwa/web test -- publicCopyGuard studioPresentation studioAuthRuntimeContract
git diff --check
git status --short
```

Expected: PASS. Review the entire intentional diff, including untracked files,
without staging or committing.

## Execution Review Gates

After each task:

1. compare the implementation with that task's `Interfaces` block;
2. run the focused command fresh;
3. inspect the task-only diff;
4. verify no existing public or partner-token authority changed;
5. leave files unstaged unless the user separately authorizes Git.

The implementation is not complete when only the happy path works. Migration,
replay, membership revocation, Origin, cookie, tenant isolation, legacy auth,
responsive UI, and prohibited-copy checks are all release gates.

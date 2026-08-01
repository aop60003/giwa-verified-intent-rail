# GIWA Release 4 Owner Campaign Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated Owner publish a saved organization Draft as an immutable numbered Campaign Version and open its exact public preview without enabling execution, Manifest/Receipt creation, wallet signatures, or chain activity.

**Architecture:** Keep `campaigns` as the mutable Draft workspace and add an append-only `campaign_versions` repository with memory and SQLite adapters. A server service constructs fixed-order canonical JSON and its Keccak-256 hash inside the repository publication transaction; authenticated Studio APIs publish and list versions, while one unauthenticated exact-read API powers a dedicated `/campaign/:campaignId/v/:versionNumber` preview.

**Tech Stack:** Node.js, TypeScript 6, pnpm 10 workspace, Vitest, viem `2.52.2`, Node `DatabaseSync` SQLite, dependency-light HTML/CSS/ES modules.

## Global Constraints

- Public product name is exactly `GIWA Verified Intent Rail`; `Loop Rail` is legacy/internal only.
- GIWA Sepolia chain ID is exactly `91342`; the feature remains testnet-only and uses Mock assets only.
- The only action template is the server-owned value `mockVaultDeposit`.
- `Published` means a publicly readable application preview, not executable, verified, signed, anchored, settled, secure, compliant, or final.
- Do not change existing Manifest, verifier-input, Receipt, public-evidence, or submission-artifact bytes/hashes.
- Do not add wallet connect, transaction, Manifest, Receipt, delete, unpublish, arbitrary contract, real asset, yield/reward, settlement, KYC, phishing-prevention, security, or finality controls or claims.
- Derive organization and member authority only from the verified Owner session; never accept those identifiers from a request body.
- Preserve static evaluator routes independently of the live adapter and never substitute Draft/demo data when an exact live preview is unavailable.
- Do not read `.env` values into logs, docs, tests, or public output; do not copy `apps/web/.data/` or `docs/evidence/local/` into release evidence.
- Git stage/commit/branch/push/PR steps below are approval checkpoints only. Execute them only after explicit user authorization; otherwise leave the verified worktree unstaged.
- Deployment, hosted configuration, DNS/HTTPS, real-wallet authentication, signatures, RPC writes, and every chain action remain separately approved gates.

## File and Responsibility Map

| Path | Responsibility |
| --- | --- |
| `apps/web/src/lib/live/studioCampaignIdentifier.ts` | One canonical Draft campaign-ID and positive-integer validator shared by service/API routes |
| `apps/web/src/lib/live/studioCampaignVersionRepository.ts` | Campaign Version records, result types, public projections, and memory repository |
| `apps/web/src/lib/live/studioCampaignVersionSqliteRepository.ts` | Migration `010`, immutable SQLite adapter, and transaction-owned publication |
| `apps/web/src/lib/live/studioCampaignVersionService.ts` | Canonical JSON, Keccak-256, Owner permission checks, publication/list/public projections |
| `apps/web/src/lib/live/studioCampaignVersionApi.ts` | Authenticated publish/history API and unauthenticated exact public lookup API |
| `apps/web/src/lib/live/liveStore.ts` | Expose memory/SQLite Campaign Version repositories and schema inspection |
| `apps/web/src/lib/live/liveSchemaMigrations.ts` | Require and verify migration `010`, composite keys, indexes, checks, and triggers |
| `apps/web/src/lib/live/liveRoutePolicy.ts` | Classify exact Studio Version and public exact-version routes |
| `apps/web/scripts/serve-live.mjs` | Body bounds, service construction, API dispatch, cache headers, and live public route mapping |
| `apps/web/scripts/serve-static.mjs` | Map exact public preview paths to the dependency-light document |
| `apps/web/public/studio-campaign-model.js` | Pure publish eligibility, payload, response, and failure presentation decisions |
| `apps/web/public/studio.js` | Confirmation, publish/history requests, accessible status, and public links |
| `apps/web/public/campaign-version-model.js` | Strict route/payload parsing and public-safe preview projection |
| `apps/web/public/campaign.html` | Dedicated public preview document |
| `apps/web/public/campaign.js` | Safe-DOM loading, loaded, missing, and unavailable rendering |
| `apps/web/public/styles.css` | Studio confirmation/history and responsive preview styles using existing tokens |

---

### Task 1: Shared Identifier and Memory Campaign Version Repository

**Files:**
- Create: `apps/web/src/lib/live/studioCampaignIdentifier.ts`
- Create: `apps/web/src/lib/live/studioCampaignIdentifier.test.ts`
- Create: `apps/web/src/lib/live/studioCampaignVersionRepository.ts`
- Create: `apps/web/src/lib/live/studioCampaignVersionRepository.test.ts`
- Modify: `apps/web/src/lib/live/studioCampaignService.ts`
- Test: `apps/web/src/lib/live/studioCampaignService.test.ts`

**Interfaces:**
- Produces: `isStudioDraftCampaignId(value): value is string`
- Produces: `isPositiveSafeInteger(value): value is number`
- Produces: `StudioCampaignVersionRecord`, `StudioCampaignVersionPublicationResult`, and `StudioCampaignVersionRepository`
- Produces: `createMemoryStudioCampaignVersionRepository(campaigns: StudioCampaignRepository)`

- [ ] **Step 1: Write failing identifier and memory-repository tests**

Add exact validator cases and a repository fixture that provisions `tenant-a`, creates one Draft, and supplies a deterministic `buildVersion` callback:

```ts
expect(isStudioDraftCampaignId("campaign_00000000-0000-4000-8000-000000000001")).toBe(true);
expect(isStudioDraftCampaignId("gasok-demo")).toBe(false);
expect(isStudioDraftCampaignId("campaign_not-a-uuid")).toBe(false);
expect(isPositiveSafeInteger(1)).toBe(true);
expect(isPositiveSafeInteger(0)).toBe(false);
expect(isPositiveSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);

const campaigns = createMemoryStudioCampaignRepository();
campaigns.createDraft({
  campaignId: "campaign_00000000-0000-4000-8000-000000000001",
  organizationId: "tenant-a",
  name: "Partner Testnet Activation",
  summary: "Public preview of a Mock Vault Deposit campaign.",
  actionTemplate: "mockVaultDeposit",
  lifecycleState: "draft",
  source: "studio-draft",
  revision: 1,
  createdByMemberId: "member-a",
  updatedByMemberId: "member-a",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
});
const versions = createMemoryStudioCampaignVersionRepository(campaigns);
const publicationInput = {
  organizationId: "tenant-a",
  campaignId: "campaign_00000000-0000-4000-8000-000000000001",
  expectedRevision: 1,
  publishedByMemberId: "member-a",
  publishedAt: "2026-08-01T00:00:00.000Z",
  buildVersion: (campaign: StudioCampaignRecord, versionNumber: number): StudioCampaignVersionRecord => ({
    campaignId: campaign.campaignId,
    organizationId: campaign.organizationId,
    versionNumber,
    name: campaign.name,
    summary: campaign.summary,
    actionTemplate: "mockVaultDeposit",
    sourceDraftRevision: campaign.revision,
    canonicalJson: `{"campaignId":"${campaign.campaignId}","versionNumber":${versionNumber}}`,
    campaignVersionHash: `0x${"1".repeat(64)}`,
    publishedByMemberId: "member-a",
    publishedAt: "2026-08-01T00:00:00.000Z"
  })
};
const first = versions.publishDraftVersion(publicationInput);
expect(first).toMatchObject({ ok: true, version: { versionNumber: 1, sourceDraftRevision: 1 } });
expect(versions.publishDraftVersion(publicationInput)).toMatchObject({
  ok: false,
  reason: "already_published",
  existingVersion: { versionNumber: 1 }
});
```

Cover stale revision, cross-tenant lookup, baseline rejection, unchanged latest semantic content, Version 2 after a real Draft update, newest-first private history, exact public lookup, and clone-by-value returns.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignIdentifier.test.ts src/lib/live/studioCampaignVersionRepository.test.ts src/lib/live/studioCampaignService.test.ts
```

Expected: FAIL because `studioCampaignIdentifier.ts` and `studioCampaignVersionRepository.ts` do not exist and the Draft service still owns its private regex.

- [ ] **Step 3: Add the shared exact validators**

Create `studioCampaignIdentifier.ts` with this complete public boundary:

```ts
const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
export const STUDIO_DRAFT_CAMPAIGN_ID_PATTERN = new RegExp(`^campaign_${UUID_V4}$`, "u");

export function isStudioDraftCampaignId(value: unknown): value is string {
  return typeof value === "string" && STUDIO_DRAFT_CAMPAIGN_ID_PATTERN.test(value);
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
```

Replace the private Draft-ID and positive-revision checks in `studioCampaignService.ts` with these helpers. Preserve the special `gasok-demo` update path so baseline updates still reach the existing non-enumerating `404` behavior.

- [ ] **Step 4: Add the record and repository contracts**

Define the exact record and publication boundary in `studioCampaignVersionRepository.ts`:

```ts
export type StudioCampaignVersionRecord = {
  campaignId: string;
  organizationId: string;
  versionNumber: number;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  sourceDraftRevision: number;
  canonicalJson: string;
  campaignVersionHash: `0x${string}`;
  publishedByMemberId: string;
  publishedAt: string;
};

export type StudioCampaignVersionPublicationResult =
  | { ok: true; version: StudioCampaignVersionRecord }
  | { ok: false; reason: "not_found" | "revision_conflict" }
  | {
      ok: false;
      reason: "already_published" | "no_changes_to_publish";
      existingVersion: StudioCampaignVersionRecord;
    };

export type StudioCampaignVersionRepository = {
  publishDraftVersion(input: {
    organizationId: string;
    campaignId: string;
    expectedRevision: number;
    publishedByMemberId: string;
    publishedAt: string;
    buildVersion(
      campaign: StudioCampaignRecord,
      versionNumber: number
    ): StudioCampaignVersionRecord;
  }): StudioCampaignVersionPublicationResult;
  listForOrganizationCampaign(
    organizationId: string,
    campaignId: string
  ): StudioCampaignVersionRecord[];
  getPublicVersion(campaignId: string, versionNumber: number): StudioCampaignVersionRecord | null;
};
```

Implement the memory adapter with a private `Map<string, StudioCampaignVersionRecord[]>`. Resolve a Draft only through `campaigns.listForOrganization(organizationId)`, require `studio-draft` plus `draft`, compare the expected revision, reject an existing `sourceDraftRevision`, reject a latest semantic match on `name`, `summary`, and `actionTemplate`, allocate `latest.versionNumber + 1` or `1`, validate the callback record against the requested tenant/Draft/version/revision/publisher/time, and store clones. Sort private history by descending version number and return clones from every method.

- [ ] **Step 5: Run the focused tests and confirm GREEN**

Run the Step 2 command again.

Expected: all identifier, memory repository, and existing Draft service tests PASS.

- [ ] **Step 6: Commit Task 1 only after explicit Git authorization**

```powershell
git add apps/web/src/lib/live/studioCampaignIdentifier.ts apps/web/src/lib/live/studioCampaignIdentifier.test.ts apps/web/src/lib/live/studioCampaignVersionRepository.ts apps/web/src/lib/live/studioCampaignVersionRepository.test.ts apps/web/src/lib/live/studioCampaignService.ts apps/web/src/lib/live/studioCampaignService.test.ts
git commit -m "feat(web): add campaign version repository boundary"
```

### Task 2: SQLite Migration, Immutability, and Schema Guard

**Files:**
- Create: `apps/web/src/lib/live/studioCampaignVersionSqliteRepository.ts`
- Create: `apps/web/src/lib/live/studioCampaignVersionSqliteRepository.test.ts`
- Modify: `apps/web/src/lib/live/liveStore.ts`
- Modify: `apps/web/src/lib/live/liveStore.test.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.test.ts`

**Interfaces:**
- Consumes: `StudioCampaignVersionRepository` from Task 1
- Produces: `STUDIO_CAMPAIGN_VERSION_MIGRATION_ID = "010_campaign_versions"`
- Produces: `STUDIO_CAMPAIGN_VERSION_MIGRATION_CHECKSUM = "campaign-versions-v1"`
- Produces: `installStudioCampaignVersionMigration(db, appliedAt)` and `createSqliteStudioCampaignVersionRepository(db)`
- Changes: `LiveStore.studioCampaignVersions`

- [ ] **Step 1: Write failing migration, parity, restart, and immutability tests**

Add tests that require:

```ts
expect(REQUIRED_LIVE_MIGRATIONS.at(-1)).toBe("010_campaign_versions");
expect(store.getSchemaState().migrationChecksums?.["010_campaign_versions"])
  .toBe("campaign-versions-v1");
expect(store.getSchemaState().triggers?.map((trigger) => trigger.name)).toEqual([
  "campaign_versions_no_delete",
  "campaign_versions_no_update"
]);
```

Run the same publish/reject/list/public sequence against `createMemoryLiveStore()` and `createSqliteLiveStore()`. Close and reopen SQLite, assert Version 1 is byte-for-byte equal, publish Version 2 after updating the Draft, then execute direct `UPDATE campaign_versions` and `DELETE FROM campaign_versions` statements in a disposable database and assert `campaign_versions_immutable` without changing either row.

Mutate one column, checksum, composite unique index, composite foreign-key pair, hash check, or trigger at a time in `liveSchemaMigrations.test.ts`; each drifted shape must return `{ ok: false, reason: "migration_missing" }`.

- [ ] **Step 2: Run the focused tests and confirm RED**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignVersionSqliteRepository.test.ts src/lib/live/liveStore.test.ts src/lib/live/liveSchemaMigrations.test.ts
```

Expected: FAIL because migration `010`, trigger inspection, and `LiveStore.studioCampaignVersions` do not exist.

- [ ] **Step 3: Create the additive migration with exact constraints**

The migration must run inside `begin immediate` and execute this schema before inserting its checksum row:

```sql
create unique index if not exists idx_campaigns_campaign_organization
  on campaigns (campaignId, organizationId);
create unique index if not exists idx_organization_members_member_organization
  on organization_members (memberId, organizationId);

create table if not exists campaign_versions (
  campaignId text not null,
  organizationId text not null,
  versionNumber integer not null check (versionNumber >= 1),
  name text not null,
  summary text not null,
  actionTemplate text not null check (actionTemplate = 'mockVaultDeposit'),
  sourceDraftRevision integer not null check (sourceDraftRevision >= 1),
  canonicalJson text not null check (length(canonicalJson) > 0),
  campaignVersionHash text not null unique check (
    length(campaignVersionHash) = 66
    and substr(campaignVersionHash, 1, 2) = '0x'
    and substr(campaignVersionHash, 3) not glob '*[^0-9a-f]*'
  ),
  publishedByMemberId text not null,
  publishedAt text not null,
  primary key (campaignId, versionNumber),
  unique (campaignId, sourceDraftRevision),
  foreign key (campaignId, organizationId)
    references campaigns(campaignId, organizationId) on delete restrict,
  foreign key (publishedByMemberId, organizationId)
    references organization_members(memberId, organizationId) on delete restrict
);

create index if not exists idx_campaign_versions_org_campaign_version
  on campaign_versions (organizationId, campaignId, versionNumber desc);

create trigger if not exists campaign_versions_no_update
before update on campaign_versions
begin
  select raise(abort, 'campaign_versions_immutable');
end;

create trigger if not exists campaign_versions_no_delete
before delete on campaign_versions
begin
  select raise(abort, 'campaign_versions_immutable');
end;
```

If any statement fails, roll back and rethrow. Record checksum `campaign-versions-v1` only inside the same transaction.

- [ ] **Step 4: Implement the SQLite publication transaction**

Prepare exact Draft, source-revision, latest-version, insert, history, and public-read statements. `publishDraftVersion` must `begin immediate`, load only `campaignId + organizationId + draft + studio-draft`, apply the same reason ordering as the memory adapter, call `buildVersion` before insert, insert all eleven columns, and commit. On any error, roll back; translate uniqueness caused by the already-published source revision into the bounded repository result only when a matching stored version can be read.

Use `rowToCampaignVersion` to reject unsafe integer values, a non-`mockVaultDeposit` template, an invalid lowercase 32-byte hash, empty canonical JSON, or inconsistent version/revision values before returning data.

- [ ] **Step 5: Wire the repository and exact schema inspection into `LiveStore`**

Add:

```ts
export type LiveSchemaTrigger = { name: string; table: string; sql: string };
```

and `triggers?: readonly LiveSchemaTrigger[]` to `LiveSchemaStateInput`. Add optional `id` and `sequence` fields to `LiveSchemaForeignKey`, populated from `pragma_foreign_key_list`, so composite pairs can be verified as pairs rather than unordered individual columns.

Install migration `010` after `009`, create `studioCampaignVersions` after `studioCampaigns`, expose it from memory and SQLite stores, include `campaign_versions` in schema inspection, and read triggers with:

```sql
select name, tbl_name as tableName, sql
from sqlite_master
where type = 'trigger'
order by name asc
```

Extend `evaluateLiveSchemaState` to verify the checksum, exact eleven-column shape, primary/unique/covering indexes, descending metadata, both grouped composite foreign keys with `RESTRICT`, all SQL checks, and the exact two trigger names/table/normalized bodies.

- [ ] **Step 6: Run the focused tests and confirm GREEN**

Run the Step 2 command again.

Expected: all migration, schema-drift, memory/SQLite parity, restart, and immutability tests PASS.

- [ ] **Step 7: Commit Task 2 only after explicit Git authorization**

```powershell
git add apps/web/src/lib/live/studioCampaignVersionSqliteRepository.ts apps/web/src/lib/live/studioCampaignVersionSqliteRepository.test.ts apps/web/src/lib/live/liveStore.ts apps/web/src/lib/live/liveStore.test.ts apps/web/src/lib/live/liveSchemaMigrations.ts apps/web/src/lib/live/liveSchemaMigrations.test.ts
git commit -m "feat(web): persist immutable campaign versions"
```

### Task 3: Canonical Hashing and Owner Campaign Version Service

**Files:**
- Create: `apps/web/src/lib/live/studioCampaignVersionService.ts`
- Create: `apps/web/src/lib/live/studioCampaignVersionService.test.ts`

**Interfaces:**
- Consumes: `StudioCampaignVersionRepository` from Task 1
- Produces: `canonicalCampaignVersionJson(input)`
- Produces: `createStudioCampaignVersionService({ repository, now? })`
- Produces: `StudioCampaignVersionServiceError`

- [ ] **Step 1: Write failing golden-vector and authorization tests**

Use the approved sample without altering field order:

```ts
const canonical = canonicalCampaignVersionJson({
  schemaVersion: "1",
  chainId: 91342,
  campaignId: "campaign_00000000-0000-4000-8000-000000000000",
  versionNumber: 1,
  name: "Partner Testnet Activation",
  summary: "Public preview of a Mock Vault Deposit campaign.",
  actionTemplate: "mockVaultDeposit",
  sourceDraftRevision: 3,
  publishedAt: "2026-08-01T00:00:00.000Z"
});
expect(canonical).toBe('{"schemaVersion":"1","chainId":91342,"campaignId":"campaign_00000000-0000-4000-8000-000000000000","versionNumber":1,"name":"Partner Testnet Activation","summary":"Public preview of a Mock Vault Deposit campaign.","actionTemplate":"mockVaultDeposit","sourceDraftRevision":3,"publishedAt":"2026-08-01T00:00:00.000Z"}');
expect(keccak256(toBytes(canonical))).toBe(
  "0x101fd0cda215689f915c76bf14471a1d4be5e71c0491e8c5f48abd170028a18e"
);
```

Also test Unicode/JSON escaping, Owner publication, Editor/Viewer `insufficient_access`, invalid IDs/revisions, stale/duplicate/no-change mappings, tenant-scoped history, exact public projection, and omission of `organizationId`, `publishedByMemberId`, and `canonicalJson` from every response.

- [ ] **Step 2: Run the service test and confirm RED**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignVersionService.test.ts
```

Expected: FAIL because the service module does not exist.

- [ ] **Step 3: Implement canonicalization and service errors**

Use `JSON.stringify` on one object literal whose property order exactly matches the approved vector. Hash with `keccak256(toBytes(canonicalJson))` from viem. Define these error codes:

```ts
export type StudioCampaignVersionServiceErrorCode =
  | "invalid_request"
  | "insufficient_access"
  | "not_found"
  | "revision_conflict"
  | "already_published"
  | "no_changes_to_publish";

export type ExistingPublishedVersionProjection = {
  versionNumber: number;
  publicPath: string;
};

export class StudioCampaignVersionServiceError extends Error {
  constructor(
    public readonly code: StudioCampaignVersionServiceErrorCode,
    public readonly existingVersion: ExistingPublishedVersionProjection | null = null
  ) {
    super(code);
  }
}
```

For `already_published` and `no_changes_to_publish`, project the repository's `existingVersion` to exactly `versionNumber` and `publicPath` on the error. Other errors carry `null`. Do not accept canonical JSON, hashes, version numbers, timestamps, template values, organization IDs, or member IDs from a caller.

- [ ] **Step 4: Implement publish, history, and public projection methods**

Define the projections and service boundary exactly as:

```ts
export type StudioCampaignVersionProjection = {
  campaignId: string;
  versionNumber: number;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  sourceDraftRevision: number;
  campaignVersionHash: `0x${string}`;
  publishedAt: string;
  publicPath: string;
};

export type StudioCampaignVersionPublicationProjection = Pick<
  StudioCampaignVersionProjection,
  "campaignId" | "versionNumber" | "campaignVersionHash" | "publishedAt" | "publicPath"
>;

export type PublicCampaignVersionProjection = {
  campaignId: string;
  versionNumber: number;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  campaignVersionHash: `0x${string}`;
  publishedAt: string;
  chainId: 91342;
  network: "GIWA Sepolia";
  publicPath: string;
  executionAvailable: false;
};

return {
  publishVersion(context: StudioWalletAuthContext, input: {
    campaignId: string;
    revision: number;
  }): StudioCampaignVersionPublicationProjection,
  listVersions(context: StudioWalletAuthContext, input: {
    campaignId: string;
  }): { versions: StudioCampaignVersionProjection[] },
  getPublicVersion(input: {
    campaignId: string;
    versionNumber: number;
  }): { campaign: PublicCampaignVersionProjection }
};
```

`publishVersion` requires `Owner`, validates the exact Draft ID and positive revision, uses `now().toISOString()`, supplies the repository callback, and returns `campaignId`, `versionNumber`, `campaignVersionHash`, `publishedAt`, and `/campaign/${campaignId}/v/${versionNumber}`. History requires Owner and returns newest first. Public projection returns only campaign/version/name/summary/template/hash/time, `chainId: 91342`, `network: "GIWA Sepolia"`, the exact public path, and `executionAvailable: false`. A missing public version maps to `not_found`.

- [ ] **Step 5: Run the service test and confirm GREEN**

Run the Step 2 command again.

Expected: all canonicalization, authorization, projection, and error-mapping tests PASS.

- [ ] **Step 6: Commit Task 3 only after explicit Git authorization**

```powershell
git add apps/web/src/lib/live/studioCampaignVersionService.ts apps/web/src/lib/live/studioCampaignVersionService.test.ts
git commit -m "feat(web): add owner campaign publishing service"
```

### Task 4: Studio/Public APIs and Live Runtime Wiring

**Files:**
- Create: `apps/web/src/lib/live/studioCampaignVersionApi.ts`
- Create: `apps/web/src/lib/live/studioCampaignVersionApi.test.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.test.ts`
- Modify: `apps/web/src/lib/live/liveRequestSafety.test.ts`
- Modify: `apps/web/src/lib/live/runtimeSourceImports.test.ts`
- Modify: `apps/web/src/lib/live/studioAuthRuntimeContract.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/scripts/serve-live.mjs`

**Interfaces:**
- Consumes: Campaign Version service from Task 3
- Produces: `createStudioCampaignVersionApiHandler(options)`
- Produces: `createPublicCampaignVersionApiHandler(options)`
- Adds route class: `campaign-version-public`

- [ ] **Step 1: Write failing API contract and route-policy tests**

Require these exact supported routes:

```ts
const campaignPath = "/api/studio/campaigns/campaign_00000000-0000-4000-8000-000000000001";
const publicPath = "/api/public/campaigns/campaign_00000000-0000-4000-8000-000000000001/versions";
expect(classifyLiveApiRoute("POST", `${campaignPath}/publish`)).toBe("studio");
expect(classifyLiveApiRoute("GET", `${campaignPath}/versions`)).toBe("studio");
expect(classifyLiveApiRoute("GET", `${publicPath}/1`)).toBe("campaign-version-public");
```

Reject `DELETE`, query-suffixed pathnames, `gasok-demo`, malformed UUIDs, zero/negative/unsafe versions, trailing slashes, and extra segments as `unknown`.

API tests must cover exact `{ revision }` body, unknown-field rejection, Owner session, same-origin before rate-limit consumption, 201 success, newest-first history, public 200 with `cache-control: public, max-age=300, immutable`, generic public 404 with `cache-control: no-store`, and mappings for 400/401/403/404/409/429/503. `already_published` and `no_changes_to_publish` return only `{ error, existingVersion: { versionNumber, publicPath } }`; `revision_conflict` returns only `{ error: "revision_conflict" }`. Assert no private fields or canonical JSON in serialized public and Studio responses.

- [ ] **Step 2: Run focused API/runtime tests and confirm RED**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignVersionApi.test.ts src/lib/live/liveRoutePolicy.test.ts src/lib/live/liveRequestSafety.test.ts src/lib/live/runtimeSourceImports.test.ts src/lib/live/studioAuthRuntimeContract.test.ts src/lib/live/liveApi.test.ts
```

Expected: FAIL because the new handlers and route class do not exist.

- [ ] **Step 3: Implement exact authenticated and public API handlers**

Use these exact regular-expression route shapes with the shared UUID-v4 grammar:

```ts
const STUDIO_PUBLISH = /^\/api\/studio\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/publish$/u;
const STUDIO_VERSIONS = /^\/api\/studio\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/versions$/u;
const PUBLIC_VERSION = /^\/api\/public\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/versions\/([1-9][0-9]*)$/u;
```

The Studio handler must parse the existing secure session cookie, authenticate the session, enforce exact origin and the Studio mutation limiter only for publish, accept exactly one own `revision` property, and map service errors without returning repository data. The public handler performs no authentication and calls only `getPublicVersion` after confirming a positive safe integer. Route classification must parse the captured decimal before returning `campaign-version-public`, so a value above `Number.MAX_SAFE_INTEGER` remains `unknown` even though it matches the digit grammar.

- [ ] **Step 4: Classify and dispatch without broad catch-all authority**

Add the two Studio exact paths as `studio` and the exact public version path as `campaign-version-public`. Keep all other routes unchanged.

In `serve-live.mjs`:

- treat the exact publish path as a 4 KiB Studio body;
- construct one Campaign Version service from `store.studioCampaignVersions`;
- construct the public handler whenever the verified store is available, independently of Studio auth configuration;
- construct the authenticated handler only when Studio auth configuration is enabled;
- dispatch `campaign-version-public` before the general live API;
- route Studio version paths to the version handler and existing Draft paths to the existing handler;
- pass handler-owned headers through `writeLiveJsonResponse`;
- log only the existing redacted request envelope.

Disabled Studio auth returns a generic `503` only for authenticated Studio Version routes; it does not hide already published public versions. Store/schema unavailability returns a generic public `503` and never closes a healthy store after startup. Startup schema evaluation must include migration `010` before either Version handler is exposed.

- [ ] **Step 5: Extend body-bound, request-safety, and runtime-source regressions**

Assert exactly 4,096 bytes succeeds for the publish path, 4,097 returns 413, JSON content type and origin rules remain enforced, no `DELETE` method is added, runtime imports use `.ts`, and no new log statement mentions cookies, session tokens, canonical JSON, hashes from request bodies, wallet signatures, DB paths, or environment values.

- [ ] **Step 6: Run focused API/runtime tests and confirm GREEN**

Run the Step 2 command again.

Expected: all new API, routing, body-bound, safety, startup, and existing live API tests PASS.

- [ ] **Step 7: Commit Task 4 only after explicit Git authorization**

```powershell
git add apps/web/src/lib/live/studioCampaignVersionApi.ts apps/web/src/lib/live/studioCampaignVersionApi.test.ts apps/web/src/lib/live/liveRoutePolicy.ts apps/web/src/lib/live/liveRoutePolicy.test.ts apps/web/src/lib/live/liveRequestSafety.test.ts apps/web/src/lib/live/runtimeSourceImports.test.ts apps/web/src/lib/live/studioAuthRuntimeContract.test.ts apps/web/src/lib/live/liveApi.test.ts apps/web/scripts/serve-live.mjs
git commit -m "feat(web): expose campaign version APIs"
```

### Task 5: Studio Publish Confirmation and Version History

**Files:**
- Modify: `apps/web/public/studio-campaign-model.js`
- Modify: `apps/web/public/studio.js`
- Modify: `apps/web/public/studio.html`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/src/lib/live/studioCampaignPresentation.test.ts`
- Modify: `apps/web/src/lib/live/studioPresentation.test.ts`

**Interfaces:**
- Consumes: Studio publish/history APIs from Task 4
- Produces: pure publish eligibility, payload, response, and failure decisions in `studio-campaign-model.js`

- [ ] **Step 1: Write failing pure-model and source-presentation tests**

Require these decisions:

```js
export function studioCampaignPublishAllowed(state) {
  return state?.editor?.mode === "edit"
    && state.editor.campaignId !== null
    && state.editor.revision > 0
    && !studioCampaignEditorIsDirty(state.editor)
    && state.loading !== true
    && state.saving !== true
    && state.publishing !== true;
}

export function studioCampaignPublishPayload(editor) {
  if (editor?.mode !== "edit" || !isSafePositiveInteger(editor.revision)) {
    throw new TypeError("Invalid campaign editor");
  }
  return { revision: editor.revision };
}
```

Test disabled states for create/dirty/loading/saving/publishing, strict version-history payload parsing, strict publish-response path/hash consistency, 409 distinctions using response error codes, session expiry, confirmation cancel focus, no double submit, and the absence of publish controls on `gasok-demo`.

- [ ] **Step 2: Run focused Studio presentation tests and confirm RED**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignPresentation.test.ts src/lib/live/studioPresentation.test.ts
```

Expected: FAIL because publishing state, confirmation, and version history are absent.

- [ ] **Step 3: Add pure publish/history state decisions**

Add `publishing: false`, `versionsLoading: false`, `versions: []`, and `publishConfirmation: null` to the Campaign Studio state. Extend busy-state logic so publish, save, selection, new Draft, and sign-out cannot race one another. Add strict parsers that require the exact public path `/campaign/${campaignId}/v/${versionNumber}`, a lowercase 32-byte hash, a positive version/revision, and `mockVaultDeposit`.

Map conflict codes as follows:

```js
const PUBLISH_CONFLICT_COPY = Object.freeze({
  revision_conflict: { message: "This Draft changed elsewhere. Reload the latest revision.", action: "reload-latest" },
  already_published: { message: "This saved Draft revision is already public.", action: "open-latest" },
  no_changes_to_publish: { message: "The public preview already matches this Draft.", action: "open-latest" }
});
```

- [ ] **Step 4: Render the accessible confirmation and history**

For a clean saved Draft, render one `Publish public preview` button after Save. Opening it must show campaign name, proposed next Version, saved revision, `GIWA Sepolia testnet`, `Mock assets only`, immutable-public warning, and the explicit statement that no transaction, Manifest, verification, or Receipt is created.

Use a semantic `<dialog>` in `studio.html` with Cancel and final `Publish public preview` controls. On cancel, close and restore focus to the trigger. On success, close, announce `Published Version N.`, refetch history, and render ordinary links whose text includes the Version number. Do not use `innerHTML` for campaign content.

- [ ] **Step 5: Implement bounded publish/history requests**

History uses authenticated `GET /api/studio/campaigns/:id/versions` when a saved Draft is selected. Publish uses:

```js
await authFetch(`/api/studio/campaigns/${encodeURIComponent(editor.campaignId)}/publish`, {
  method: "POST",
  body: JSON.stringify(studioCampaignPublishPayload(editor))
});
```

Keep editor text and selection on every failure. A 401 returns to the sign-in gate; stale revision offers existing reload-latest; duplicate/unchanged results expose the latest public link; 429 and 503 remain retryable. Disable the final button while the request is pending.

- [ ] **Step 6: Add responsive and reduced-motion styles**

Use existing color, spacing, type, focus, and border tokens. At narrow widths and 200 percent zoom, stack confirmation facts and version rows in reading order; long hashes wrap with `overflow-wrap: anywhere`. Keep the dialog within the viewport, provide a visible backdrop, preserve `:focus-visible`, and add no animation when `prefers-reduced-motion: reduce` is active.

- [ ] **Step 7: Run focused Studio presentation tests and confirm GREEN**

Run the Step 2 command again.

Expected: all pure state, safe DOM, copy, accessibility, confirmation, and existing Draft UI tests PASS.

- [ ] **Step 8: Commit Task 5 only after explicit Git authorization**

```powershell
git add apps/web/public/studio-campaign-model.js apps/web/public/studio.js apps/web/public/studio.html apps/web/public/styles.css apps/web/src/lib/live/studioCampaignPresentation.test.ts apps/web/src/lib/live/studioPresentation.test.ts
git commit -m "feat(web): add owner publish confirmation"
```

### Task 6: Dedicated Public Campaign Version Preview

**Files:**
- Create: `apps/web/public/campaign-version-model.js`
- Create: `apps/web/public/campaign.html`
- Create: `apps/web/public/campaign.js`
- Create: `apps/web/src/lib/live/publicCampaignVersionPresentation.test.ts`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/scripts/serve-static.mjs`
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/src/lib/landing/landingRouting.test.ts`
- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`

**Interfaces:**
- Consumes: public exact-version API from Task 4
- Produces: `campaignVersionRoute(pathname)` and `projectPublicCampaignVersion(payload, route)`

- [ ] **Step 1: Write failing route, payload, safe-copy, and server-mapping tests**

Require:

```js
expect(campaignVersionRoute("/campaign/campaign_00000000-0000-4000-8000-000000000001/v/2"))
  .toEqual({
    campaignId: "campaign_00000000-0000-4000-8000-000000000001",
    versionNumber: 2
  });
expect(campaignVersionRoute("/campaign/gasok-demo/v/1")).toBeNull();
expect(campaignVersionRoute("/campaign/campaign_00000000-0000-4000-8000-000000000001/v/0"))
  .toBeNull();
```

Reject cross-field ID/version/path mismatch, missing properties, extra unsafe execution capability fields, a non-lowercase hash, wrong chain/network/template, or `executionAvailable !== false`. Verify static and live servers map only the exact public path shape to `/campaign.html`, not `/campaign/*` broadly.

- [ ] **Step 2: Run focused public presentation/routing tests and confirm RED**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/publicCampaignVersionPresentation.test.ts src/lib/landing/landingRouting.test.ts src/lib/live/publicCopyGuard.test.ts
```

Expected: FAIL because the public preview assets and route mapping do not exist.

- [ ] **Step 3: Implement strict route and payload projection**

`campaign-version-model.js` must parse one decoded route with the same canonical UUID-v4 and positive-safe-version grammar. `projectPublicCampaignVersion` must require exact own fields, verify that `publicPath` equals the current route, accept only chain `91342`, network `GIWA Sepolia`, template `mockVaultDeposit`, lowercase 32-byte hash, and `executionAvailable: false`, then return a frozen public-safe view model. Do not retain unrecognized payload fields.

- [ ] **Step 4: Build the dependency-light document and safe renderer**

`campaign.html` loads the existing self-hosted Pretendard assets, shared stylesheet, `protocol-dossier.js`, and `campaign.js`; it contains one root and a no-script message.

`campaign.js` renders with `createElement`, `textContent`, and attribute assignment only. It must show:

```text
Published campaign preview
GIWA Sepolia testnet
Mock assets only
Version N
Mock Vault Deposit
Preview only - Transaction unavailable
```

Show name, summary, publication time, and full hash. Link to `/partner` as `View existing Campaign evidence board` and explicitly state that the preview itself has no execution or Receipt evidence. Do not render wallet, execute, Manifest, Receipt, publish, edit, delete, reward, yield, real-asset, settlement, KYC, or security controls.

Malformed paths and a live JSON `404 { "error": "not_found" }` share one generic `Campaign version not found` state. A non-JSON static-server API response, network failure, or live `503` shows `Live campaign preview unavailable` and never falls back to Draft, baseline, `flow-data.json`, or retained demo evidence.

- [ ] **Step 5: Add exact server mappings and responsive styles**

Both servers map only:

```js
/^\/campaign\/campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/v\/[1-9][0-9]*$/u
```

to `/campaign.html`. The model still rejects unsafe integers in the browser. Style the preview with the existing Dossier shell, one-column mobile flow, bounded reading width, full hash wrapping, focus-visible links, and reduced-motion stability.

- [ ] **Step 6: Run focused public presentation/routing tests and confirm GREEN**

Run the Step 2 command again.

Expected: public model, safe copy/control, asset, and exact server-route tests PASS.

- [ ] **Step 7: Commit Task 6 only after explicit Git authorization**

```powershell
git add apps/web/public/campaign-version-model.js apps/web/public/campaign.html apps/web/public/campaign.js apps/web/public/styles.css apps/web/scripts/serve-static.mjs apps/web/scripts/serve-live.mjs apps/web/src/lib/live/publicCampaignVersionPresentation.test.ts apps/web/src/lib/landing/landingRouting.test.ts apps/web/src/lib/live/publicCopyGuard.test.ts
git commit -m "feat(web): add public campaign version preview"
```

### Task 7: End-to-End Local API and Browser-State Verification

**Files:**
- Modify: `apps/web/src/lib/live/studioAuthRuntimeContract.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/live/studioCampaignPresentation.test.ts`
- Modify: `apps/web/src/lib/live/publicCampaignVersionPresentation.test.ts`
- Create: `.superpowers/sdd/r4-publishing-task-7-report.md`

**Interfaces:**
- Consumes: complete local slice from Tasks 1-6
- Produces: deterministic smoke and browser-state evidence without real wallet or chain actions

- [ ] **Step 1: Add the deterministic API integration vector**

Using a disposable SQLite database, configured deterministic Owner session fixture, and the real runtime handlers, verify this sequence:

```text
GET campaigns                         -> 200
POST Draft                            -> 201 revision 1
PATCH Draft                           -> 200 revision 2
POST publish revision 2               -> 201 Version 1
POST publish revision 2 again         -> 409 already_published
GET Studio versions                   -> 200 [Version 1]
GET public Version 1                  -> 200 immutable projection
PATCH Draft                            -> 200 revision 3
POST publish revision 3               -> 201 Version 2
GET public Version 1                  -> 200 original bytes
GET public Version 2                  -> 200 changed snapshot
POST logout                           -> 204
POST publish after logout             -> 401
```

Assert no Manifest, Receipt, evidence, transaction, verification job, RPC, or chain store record is created by either publication.

- [ ] **Step 2: Run the focused integration set and confirm GREEN**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignVersionRepository.test.ts src/lib/live/studioCampaignVersionSqliteRepository.test.ts src/lib/live/studioCampaignVersionService.test.ts src/lib/live/studioCampaignVersionApi.test.ts src/lib/live/studioAuthRuntimeContract.test.ts src/lib/live/studioCampaignPresentation.test.ts src/lib/live/publicCampaignVersionPresentation.test.ts
```

Expected: all focused Campaign Publishing tests PASS.

- [ ] **Step 3: Inspect deterministic browser states**

Run the local live adapter only with disposable local configuration and no real wallet/RPC write. Inspect:

- clean saved Draft with enabled publish action;
- dirty Draft with disabled publish action;
- confirmation open, Cancel focus restoration, and pending double-submit lock;
- Version 1 success/history/link;
- stale, duplicate, unchanged, 429, 503, and expired-session states;
- public loading, Version 1, Version 2, malformed, missing, and static-unavailable states;
- widths `320`, `360`, `768`, `1024`, and `1440`, plus a `512` CSS-pixel 200-percent-zoom proxy;
- keyboard-only traversal, visible focus, dialog focus behavior, reduced motion, and unexpected console errors.

Do not claim a browser state that policy or tooling prevents. Record it as an explicit manual-review item instead.

- [ ] **Step 4: Record Task 7 evidence**

Write `.superpowers/sdd/r4-publishing-task-7-report.md` with exact commands, exit codes, API status vector, inspected viewports/states, temporary resource cleanup, and any manual-only items. Record that no Git, deployment, real wallet, signature, RPC write, or chain action occurred.

- [ ] **Step 5: Commit Task 7 only after explicit Git authorization**

```powershell
git add apps/web/src/lib/live/studioAuthRuntimeContract.test.ts apps/web/src/lib/live/liveApi.test.ts apps/web/src/lib/live/studioCampaignPresentation.test.ts apps/web/src/lib/live/publicCampaignVersionPresentation.test.ts .superpowers/sdd/r4-publishing-task-7-report.md
git commit -m "test(web): verify campaign publishing flow"
```

### Task 8: Full Regression, Evidence Invariance, and Local Completion Freeze

**Files:**
- Create: `docs/implementation/giwa-release-4-owner-campaign-publishing-local-completion-freeze.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `.superpowers/sdd/progress.md`

**Interfaces:**
- Consumes: verified implementation and Task 7 report
- Produces: local-advisory completion boundary and unresolved-gate handoff

- [ ] **Step 1: Capture the pre-verification generated-artifact state**

Record `git status --short` and hashes for these existing generated/public evidence paths before running build/export-owning commands:

```powershell
git hash-object apps/web/public/flow-data.json
git hash-object apps/web/public/partner-snapshot.json
git hash-object docs/evidence/giwa-sepolia-mvp-evidence.json
git hash-object apps/web/src/generated/deployment.json
```

Do not stage or modify ignored runtime data.

- [ ] **Step 2: Run fresh focused and full verification**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignIdentifier.test.ts src/lib/live/studioCampaignVersionRepository.test.ts src/lib/live/studioCampaignVersionSqliteRepository.test.ts src/lib/live/studioCampaignVersionService.test.ts src/lib/live/studioCampaignVersionApi.test.ts src/lib/live/studioCampaignPresentation.test.ts src/lib/live/publicCampaignVersionPresentation.test.ts
pnpm --filter @giwa/web test
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @giwa/web artifact:scan
git diff --check
```

Expected: focused/full tests, typecheck, workspace tests, build, and diff check exit `0`. If `artifact:scan` reports only its documented pre-existing baseline, record the exact allowlisted counts and do not claim a clean scan; any new publishing-related unsafe copy or sensitive match must be fixed before completion.

- [ ] **Step 3: Prove existing evidence and execution behavior are unchanged**

Re-run the four `git hash-object` commands from Step 1 and compare exact hashes. Inspect `git diff --` for those paths and require no diff caused by this slice. Search the new/modified public files and service/API projections for forbidden controls and claims:

```powershell
$claimTokens = @('exec' + 'ute', 'wallet connect', 'manifest', 'receipt', 'yield', 'reward', 'real asset', 'settle' + 'ment', 'kyc', 'phishing', 'finality', 'secure', 'guarantee', 'delete', 'unpublish')
rg -n -i ($claimTokens -join '|') apps/web/public/campaign.html apps/web/public/campaign.js apps/web/public/campaign-version-model.js apps/web/public/studio.js apps/web/src/lib/live/studioCampaignVersionService.ts apps/web/src/lib/live/studioCampaignVersionApi.ts
```

Every retained match must be an approved negative boundary such as `Transaction unavailable`, `no Manifest`, or `no Receipt`; no enabled control or affirmative claim may remain.

- [ ] **Step 4: Write the local completion freeze and routing updates**

The freeze document must record:

- exact local scope and architecture;
- migration ID/checksum, immutable triggers, canonical golden hash, and API paths;
- focused/full verification commands and concise outcomes;
- API status vector and browser matrix from Task 7;
- unchanged evidence/hash result;
- exclusions and claim boundaries;
- current dirty/staged Git state without claiming a source freeze;
- unresolved Git review, protected CI, deployment, hosted migration, real-wallet, signature, RPC, and chain gates.

Update README local evolution status, AGENTS sources of truth/architecture decisions, and `.superpowers/sdd/progress.md` to point to the freeze. Do not claim protected CI or deployment.

- [ ] **Step 5: Freshly inspect final diff and rerun the narrow documentation checks**

```powershell
$blockedTokens = @('T' + 'BD', 'T' + 'ODO', 'FIX' + 'ME', ([char]0x3f).ToString() * 2)
rg -n -i ($blockedTokens -join '|') docs/implementation/giwa-release-4-owner-campaign-publishing-local-completion-freeze.md README.md AGENTS.md .superpowers/sdd/r4-publishing-task-7-report.md .superpowers/sdd/progress.md
git diff --check
git status --short
```

Expected: no placeholders, clean diff check, and only the preserved intended worktree changes. Inspect the final diff before reporting completion.

- [ ] **Step 6: Request independent code review before declaring completion**

Review in this order: security/tenant isolation, transaction/immutability logic, API/error privacy, public-copy boundaries, responsive/accessibility behavior, and test omissions. Resolve every Critical or Important finding, rerun affected focused tests, and record remaining Minor findings explicitly.

- [ ] **Step 7: Commit Task 8 only after explicit Git authorization**

```powershell
git add docs/implementation/giwa-release-4-owner-campaign-publishing-local-completion-freeze.md README.md AGENTS.md .superpowers/sdd/progress.md
git commit -m "docs: freeze local campaign publishing completion"
```

## Execution Stop Conditions

Stop and ask for direction instead of assuming authority if implementation would require:

- changing the product from public-preview-only to participant execution;
- generating/signing a Manifest or issuing a Receipt for a Published Version;
- changing existing public evidence or generated submission artifacts;
- enabling Editor/Viewer authentication or membership mutation;
- adding a dependency with licensing, billing, private-registry, or material security commitment;
- staging, committing, branching, pushing, opening a PR, deploying, changing cloud/DNS/HTTPS, handling secret values, using a real wallet/signature, sending an RPC write, or taking any chain action without explicit user direction.

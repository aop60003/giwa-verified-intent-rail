# GIWA Release 4 Owner Campaign Draft Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Owner-only, organization-scoped Studio surface that lists the
read-only `gasok-demo` baseline and creates or edits persistent
`mockVaultDeposit` Drafts without changing public or onchain behavior.

**Architecture:** Add a focused campaign repository beside the existing Studio
authentication repository, with memory and SQLite implementations behind the
same interface. A campaign service owns validation, projection, baseline
bootstrap, IDs, and optimistic concurrency; an authenticated API derives
tenant and actor context only from the wallet session. The dependency-light
Studio browser adds a pure campaign model plus a responsive list/editor UI.

**Tech Stack:** Node.js, pnpm 10 workspace, TypeScript 6, Vitest, Node
`crypto` and `node:sqlite`, existing dependency-light browser JavaScript and
CSS.

## Global Constraints

- Public naming remains `GIWA Verified Intent Rail`; `Loop` is the organization display name.
- GIWA Sepolia chain ID remains exactly `91342` and every new campaign capability is testnet-only.
- The only accepted action template is exactly `mockVaultDeposit`.
- `gasok-demo` is a read-only `published-baseline` and its existing public
  behavior remains unchanged.
- A saved Draft never publishes, executes, issues a Manifest or Receipt, or changes public evidence.
- Do not accept arbitrary target, selector, calldata, asset, amount, spender,
  verifier, lifecycle, organization, or member fields.
- Do not claim real assets, yield, rewards, RWA issuance, settlement, KYC,
  identity, phishing prevention, security guarantees, or Flashblocks finality.
- Do not add runtime dependencies.
- Do not copy `apps/web/.data/` or `docs/evidence/local/` into public artifacts.
- Do not stage, commit, branch, push, deploy, or perform wallet or chain
  transactions without separate explicit user direction.
- Preserve unrelated worktree changes and edit sources of truth rather than generated projections.

---

## File Structure

### New files

- `apps/web/src/lib/live/studioCampaignRepository.ts` — record types,
  repository contract, result types, and memory implementation.
- `apps/web/src/lib/live/studioCampaignRepository.test.ts` — memory behavior,
  isolation, baseline, and concurrency tests.
- `apps/web/src/lib/live/studioCampaignSqliteRepository.ts` — migration 009
  installer, row projection, and SQLite repository.
- `apps/web/src/lib/live/studioCampaignService.ts` — Owner access checks,
  validation, baseline bootstrap, ID generation, and projections.
- `apps/web/src/lib/live/studioCampaignService.test.ts` — validation,
  projection, authority, and concurrency tests.
- `apps/web/src/lib/live/studioSessionCookie.ts` — shared parsing and
  serialization for the existing Studio session cookie.
- `apps/web/src/lib/live/studioSessionCookie.test.ts` — duplicate, malformed,
  valid, secure, and clearing cookie tests.
- `apps/web/src/lib/live/studioCampaignApi.ts` — exact route/body handling and
  campaign status mapping.
- `apps/web/src/lib/live/studioCampaignApi.test.ts` — session, Owner, tenant,
  origin, input, conflict, and error tests.
- `apps/web/public/studio-campaign-model.js` — DOM-free Draft validation,
  payload building, dirty state, and error presentation.
- `apps/web/src/lib/live/studioCampaignPresentation.test.ts` — pure browser
  model and campaign Studio source-contract tests.
- `docs/implementation/giwa-release-4-owner-campaign-drafts-local-completion-freeze.md`
  — local completion evidence, created only after verification passes.

### Modified files

- `apps/web/src/lib/live/liveStore.ts` and `liveStore.test.ts` — expose both
  repositories, install migration 009, and prove parity/persistence.
- `apps/web/src/lib/live/liveSchemaMigrations.ts` and
  `liveSchemaMigrations.test.ts` — require and validate migration 009.
- `apps/web/src/lib/live/studioAuthService.ts` and
  `studioAuthService.test.ts` — add the internal member ID to wallet-session
  context only.
- `apps/web/src/lib/live/studioAuthApi.ts` and `studioAuthApi.test.ts` —
  consume the shared cookie helper without changing auth behavior.
- `apps/web/src/lib/live/liveRoutePolicy.ts` and `liveRoutePolicy.test.ts` —
  classify exact Studio campaign routes.
- `apps/web/src/lib/live/liveRequestSafety.ts` and
  `liveRequestSafety.test.ts` — allow PATCH and enforce mutation JSON/origin
  rules.
- `apps/web/src/lib/live/liveRateLimit.ts` and `liveRateLimit.test.ts` — add a
  hashed Studio-session mutation bucket.
- `apps/web/scripts/serve-live.mjs` — bootstrap the baseline, construct the
  API, read bounded PATCH bodies, and dispatch Studio routes.
- `apps/web/src/lib/live/studioAuthRuntimeContract.test.ts` and
  `liveApi.test.ts` — verify runtime wiring and 4 KiB bodies.
- `apps/web/public/studio.js`, `studio.html`, and `styles.css` —
  authenticated campaign list/editor UI.
- `apps/web/src/lib/live/studioPresentation.test.ts` and
  `publicCopyGuard.test.ts` — new UI and safe-copy coverage.
- `README.md` and `AGENTS.md` — route to the locally completed slice and
  record its durable boundary.

## Task 1: Campaign Domain and Memory Repository

**Files:**
- Create: `apps/web/src/lib/live/studioCampaignRepository.ts`
- Create: `apps/web/src/lib/live/studioCampaignRepository.test.ts`

**Interfaces:**
- Consumes: organization/member IDs established by `StudioAuthRepository`.
- Produces:

```typescript
export type StudioCampaignActionTemplate = "mockVaultDeposit";
export type StudioCampaignLifecycleState = "draft" | "published-baseline";
export type StudioCampaignSource = "studio-draft" | "gasok-evidence";

export type StudioCampaignRecord = {
  campaignId: string;
  organizationId: string;
  name: string;
  summary: string;
  actionTemplate: StudioCampaignActionTemplate;
  lifecycleState: StudioCampaignLifecycleState;
  source: StudioCampaignSource;
  revision: number;
  createdByMemberId: string | null;
  updatedByMemberId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudioCampaignUpdateResult =
  | { ok: true; campaign: StudioCampaignRecord }
  | { ok: false; reason: "not_found" | "revision_conflict" };

export type StudioCampaignRepository = {
  bootstrapPublishedBaseline(record: StudioCampaignRecord): StudioCampaignRecord;
  listForOrganization(organizationId: string): StudioCampaignRecord[];
  createDraft(record: StudioCampaignRecord): StudioCampaignRecord;
  updateDraft(input: {
    organizationId: string;
    campaignId: string;
    name: string;
    summary: string;
    updatedByMemberId: string;
    updatedAt: string;
    expectedRevision: number;
  }): StudioCampaignUpdateResult;
};

export function createMemoryStudioCampaignRepository(): StudioCampaignRepository;
```

- [ ] **Step 1: Write failing memory repository tests**

Use this exact baseline and two Drafts:

```typescript
const baseline: StudioCampaignRecord = {
  campaignId: "gasok-demo",
  organizationId: "tenant-a",
  name: "GIWA GASOK Demo",
  summary: "Existing verified-intent testnet campaign.",
  actionTemplate: "mockVaultDeposit",
  lifecycleState: "published-baseline",
  source: "gasok-evidence",
  revision: 1,
  createdByMemberId: null,
  updatedByMemberId: null,
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z"
};

it("lists the baseline first and Drafts by recent update within one organization", () => {
  const repository = createMemoryStudioCampaignRepository();
  repository.bootstrapPublishedBaseline(baseline);
  for (const [campaignId, name, updatedAt] of [
    ["campaign_old", "Old", "2026-08-01T00:00:00.000Z"],
    ["campaign_new", "New", "2026-08-01T00:01:00.000Z"]
  ] as const) {
    repository.createDraft({
      ...baseline,
      campaignId,
      name,
      lifecycleState: "draft",
      source: "studio-draft",
      createdByMemberId: "member-a",
      updatedByMemberId: "member-a",
      createdAt: updatedAt,
      updatedAt
    });
  }

  expect(repository.listForOrganization("tenant-a").map((row) => row.campaignId))
    .toEqual(["gasok-demo", "campaign_new", "campaign_old"]);
  expect(repository.listForOrganization("tenant-b")).toEqual([]);
});

it("allows one update per revision and never mutates the baseline", () => {
  const repository = createMemoryStudioCampaignRepository();
  repository.bootstrapPublishedBaseline(baseline);
  repository.createDraft({
    ...baseline,
    campaignId: "campaign_draft",
    lifecycleState: "draft",
    source: "studio-draft",
    createdByMemberId: "member-a",
    updatedByMemberId: "member-a"
  });

  const input = {
    organizationId: "tenant-a",
    campaignId: "campaign_draft",
    name: "Updated",
    summary: "Updated summary",
    updatedByMemberId: "member-a",
    updatedAt: "2026-08-01T01:00:00.000Z",
    expectedRevision: 1
  };
  expect(repository.updateDraft(input))
    .toMatchObject({ ok: true, campaign: { revision: 2, name: "Updated" } });
  expect(repository.updateDraft({ ...input, name: "Stale" }))
    .toEqual({ ok: false, reason: "revision_conflict" });
  expect(repository.updateDraft({ ...input, campaignId: "gasok-demo" }))
    .toEqual({ ok: false, reason: "not_found" });
});
```

Also test duplicate IDs, baseline organization/source mismatch, cloned return
values, cross-tenant update, and `campaignId` tie-breaking.

- [ ] **Step 2: Run focused test and verify RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignRepository.test.ts
```

Expected: FAIL because the repository module does not exist.

- [ ] **Step 3: Implement the memory repository**

Use a private `Map<string, StudioCampaignRecord>` and validate every inserted
record:

```typescript
function assertCampaignRecord(record: StudioCampaignRecord): void {
  const draft = record.source === "studio-draft" &&
    record.lifecycleState === "draft" &&
    record.createdByMemberId !== null &&
    record.updatedByMemberId !== null;
  const baseline = record.source === "gasok-evidence" &&
    record.lifecycleState === "published-baseline" &&
    record.createdByMemberId === null &&
    record.updatedByMemberId === null;
  if (
    record.actionTemplate !== "mockVaultDeposit" ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 1 ||
    (!draft && !baseline)
  ) throw new Error("invalid_studio_campaign");
}
```

`bootstrapPublishedBaseline` is idempotent only for the same campaign ID,
organization, source, and lifecycle; otherwise throw
`studio_campaign_baseline_conflict`. `createDraft` rejects an existing ID with
`duplicate_studio_campaign`. `updateDraft` filters by organization and Draft
state before comparing revision, increments once, and returns clones.

- [ ] **Step 4: Run focused test and verify GREEN**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 5: Review checkpoint**

Reject the task if any public method lists all organizations or updates without
`organizationId`. Do not stage or commit.

## Task 2: SQLite Migration, Repository, and Schema Guard

**Files:**
- Create: `apps/web/src/lib/live/studioCampaignSqliteRepository.ts`
- Modify: `apps/web/src/lib/live/liveStore.ts`
- Modify: `apps/web/src/lib/live/liveStore.test.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.test.ts`

**Interfaces:**
- Consumes: `StudioCampaignRepository` plus migration 008 organizations/members.
- Produces:

```typescript
export const STUDIO_CAMPAIGN_MIGRATION_ID = "009_studio_campaign_drafts";
export const STUDIO_CAMPAIGN_MIGRATION_CHECKSUM = "studio-campaign-drafts-v1";
export function installStudioCampaignMigration(db: DatabaseSync, appliedAt: string): void;
export function createSqliteStudioCampaignRepository(db: DatabaseSync): StudioCampaignRepository;
```

`LiveStore` gains `studioCampaigns: StudioCampaignRepository`.

- [ ] **Step 1: Write failing schema and parity tests**

Require migration 009 and checksum validation:

```typescript
expect(REQUIRED_LIVE_MIGRATIONS).toContain("009_studio_campaign_drafts");
expect(evaluateLiveSchemaState({
  ...validState,
  migrationChecksums: {
    ...validState.migrationChecksums,
    "009_studio_campaign_drafts": "drifted"
  }
})).toEqual({ ok: false, reason: "migration_missing" });
```

In `liveStore.test.ts` run the Task 1 scenario against memory and temporary
SQLite stores. Assert idempotent baseline bootstrap, mismatch failure,
ordering, one same-revision winner, baseline immutability, tenant isolation,
and close/reopen persistence.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
$tests = @(
  "src/lib/live/liveSchemaMigrations.test.ts"
  "src/lib/live/liveStore.test.ts"
)
pnpm --filter @giwa/web exec vitest run $tests
```

Expected: FAIL because migration 009 and `studioCampaigns` are absent.

- [ ] **Step 3: Install migration 009**

Use `begin immediate` and this schema:

```sql
create table if not exists campaigns (
  campaignId text primary key,
  organizationId text not null,
  name text not null,
  summary text not null,
  actionTemplate text not null check (actionTemplate = 'mockVaultDeposit'),
  lifecycleState text not null
    check (lifecycleState in ('draft', 'published-baseline')),
  source text not null
    check (source in ('studio-draft', 'gasok-evidence')),
  revision integer not null check (revision >= 1),
  createdByMemberId text,
  updatedByMemberId text,
  createdAt text not null,
  updatedAt text not null,
  foreign key (organizationId) references organizations(id) on delete restrict,
  foreign key (createdByMemberId) references organization_members(memberId) on delete restrict,
  foreign key (updatedByMemberId) references organization_members(memberId) on delete restrict,
  check (
    (source = 'studio-draft' and lifecycleState = 'draft'
      and createdByMemberId is not null and updatedByMemberId is not null)
    or
    (source = 'gasok-evidence' and lifecycleState = 'published-baseline'
      and createdByMemberId is null and updatedByMemberId is null)
  )
);
create index if not exists idx_campaigns_organization_state_updated
  on campaigns (organizationId, lifecycleState, updatedAt desc, campaignId);
```

Insert the exported checksum marker in the same transaction and roll back on
failure.

- [ ] **Step 4: Implement the SQLite repository**

Use one strict row mapper. List and update only with these predicates:

```sql
select * from campaigns
where organizationId = ?
order by
  case when lifecycleState = 'published-baseline' then 0 else 1 end,
  updatedAt desc,
  campaignId asc;

update campaigns
set name = ?, summary = ?, updatedByMemberId = ?, updatedAt = ?,
    revision = revision + 1
where campaignId = ? and organizationId = ?
  and lifecycleState = 'draft' and source = 'studio-draft'
  and revision = ?
returning *;
```

If update returns no row, query only the same organization and Draft state:
return `revision_conflict` when it exists, otherwise `not_found`. Never query a
foreign campaign by ID to decide the public result.

- [ ] **Step 5: Wire stores and schema inspection**

Construct and expose a memory repository. Include migration 009/checksum/table
metadata in memory schema state. In SQLite:

```typescript
installStudioAuthMigration(db, new Date(0).toISOString());
installStudioCampaignMigration(db, new Date(0).toISOString());
const studioAuth = createSqliteStudioAuthRepository(db);
const studioCampaigns = createSqliteStudioCampaignRepository(db);
```

Extend `evaluateLiveSchemaState` to check migration checksum, required columns,
source/lifecycle constraints, the organization index, and all three foreign
keys.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 2 command.

Expected: PASS, including restart persistence.

- [ ] **Step 7: Review checkpoint**

Confirm every SQL read/update is organization-scoped and baseline rows cannot
match update SQL. Do not stage or commit.

## Task 3: Campaign Service and Public-Safe Projection

**Files:**
- Create: `apps/web/src/lib/live/studioCampaignService.ts`
- Create: `apps/web/src/lib/live/studioCampaignService.test.ts`
- Modify: `apps/web/src/lib/live/studioAuthService.ts`
- Modify: `apps/web/src/lib/live/studioAuthService.test.ts`

**Interfaces:**
- Consumes: repository and `StudioWalletAuthContext`.
- Produces:

```typescript
export const STUDIO_CAMPAIGN_NAME_LIMIT = 80;
export const STUDIO_CAMPAIGN_SUMMARY_LIMIT = 280;
export const STUDIO_CAMPAIGN_BODY_MAX_BYTES = 4 * 1024;

export type StudioCampaignProjection = {
  campaignId: string;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  lifecycleState: "draft" | "published-baseline";
  editable: boolean;
  revision: number;
  updatedAt: string;
};

export class StudioCampaignServiceError extends Error {
  constructor(public readonly code:
    | "invalid_request"
    | "insufficient_access"
    | "not_found"
    | "revision_conflict") {
    super(code);
  }
}

export function createStudioCampaignService(options: {
  repository: StudioCampaignRepository;
  now?: () => Date;
  randomUUID?: () => string;
}): {
  bootstrapBaseline(organizationId: string): StudioCampaignProjection;
  listCampaigns(context: StudioWalletAuthContext): {
    campaigns: StudioCampaignProjection[];
    limits: { name: 80; summary: 280 };
  };
  createDraft(
    context: StudioWalletAuthContext,
    input: { name: string; summary?: string }
  ): StudioCampaignProjection;
  updateDraft(
    context: StudioWalletAuthContext,
    input: { campaignId: string; name: string; summary: string; revision: number }
  ): StudioCampaignProjection;
};
```

- [ ] **Step 1: Write failing service tests**

Use:

```typescript
const owner: StudioWalletAuthContext = {
  actorId: "0x1111111111111111111111111111111111111111",
  tenantId: "tenant-a",
  memberId: "member-a",
  mode: "wallet-session",
  organizationRole: "Owner",
  sessionId: "session-a"
};
```

Assert baseline projection is read-only/fixed-template; injected UUID creates
`campaign_00000000-0000-4000-8000-000000000001`; organization/member come
only from context; name/summary are trimmed; omitted summary becomes empty;
Unicode code-point limits are 80/280; name line breaks, controls, invalid
revision/ID fail; Editor/Viewer fail; baseline/foreign update share
`not_found`; stale update is `revision_conflict`; projections omit tenant,
member IDs, and source.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignService.test.ts
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Add internal member ID to auth context**

Add `memberId: string` to `StudioWalletAuthContext` and populate it from the
stored session member in `authenticateSession`. Do not add it to
`StudioSessionProjection`. Update auth tests to assert the internal field and
that `JSON.stringify(authenticated.projection)` does not contain `memberId`.

- [ ] **Step 4: Implement validation, authority, IDs, and projections**

Use:

```typescript
function requireOwner(context: StudioWalletAuthContext): void {
  if (context.organizationRole !== "Owner") {
    throw new StudioCampaignServiceError("insufficient_access");
  }
}

function project(record: StudioCampaignRecord): StudioCampaignProjection {
  return {
    campaignId: record.campaignId,
    name: record.name,
    summary: record.summary,
    actionTemplate: record.actionTemplate,
    lifecycleState: record.lifecycleState,
    editable: record.lifecycleState === "draft" &&
      record.source === "studio-draft",
    revision: record.revision,
    updatedAt: record.updatedAt
  };
}
```

Count code points with `[...trimmed].length`, normalize CRLF in summary, reject
C0 controls and any name line break, and validate positive safe revision.
Generate IDs only from canonical injected/random UUIDs. Build baseline timestamp
as `1970-01-01T00:00:00.000Z` so startup never rewrites it.

- [ ] **Step 5: Map repository results**

Pass `context.tenantId` and `context.memberId` to repository calls. Convert
`not_found` and `revision_conflict` to service errors without returning current
server contents.

- [ ] **Step 6: Run service and auth tests and verify GREEN**

Run:

```powershell
$tests = @(
  "src/lib/live/studioCampaignService.test.ts"
  "src/lib/live/studioAuthService.test.ts"
)
pnpm --filter @giwa/web exec vitest run $tests
```

Expected: PASS and no new public auth field.

- [ ] **Step 7: Review checkpoint**

Search public projections for `organizationId`, `memberId`, `source`, and
creator/updater fields. None may be exposed. Do not stage or commit.

## Task 4: Shared Session Cookie and Campaign API

**Files:**
- Create: `apps/web/src/lib/live/studioSessionCookie.ts`
- Create: `apps/web/src/lib/live/studioSessionCookie.test.ts`
- Create: `apps/web/src/lib/live/studioCampaignApi.ts`
- Create: `apps/web/src/lib/live/studioCampaignApi.test.ts`
- Modify: `apps/web/src/lib/live/studioAuthApi.ts`
- Modify: `apps/web/src/lib/live/studioAuthApi.test.ts`

**Interfaces:**
- Consumes: existing `authenticateSession` and campaign service.
- Produces:

```typescript
export const STUDIO_SESSION_COOKIE_NAME = "giwa_studio_session";
export function parseStudioSessionCookie(cookie: string | undefined): {
  present: boolean;
  rawToken: string | null;
};
export function studioSessionCookie(
  rawToken: string,
  expiresAt: string,
  secure: boolean
): string;
export function clearStudioSessionCookie(secure: boolean): string;

export type StudioCampaignApiRequest = {
  method: string;
  pathname: string;
  origin?: string;
  cookie?: string;
  body?: unknown;
  requestId: string;
};

export type StudioCampaignApiResult = {
  status: number;
  body: Record<string, unknown> | null;
  headers: Record<string, string>;
};

export function createStudioCampaignApiHandler(options: {
  authenticateSession(rawToken: string): StudioAuthenticatedSession | null;
  service: ReturnType<typeof createStudioCampaignService>;
  origin: string;
  secureCookie: boolean;
  consumeMutation(context: StudioWalletAuthContext): RateLimitDecision;
}): (
  request: StudioCampaignApiRequest
) => Promise<StudioCampaignApiResult>;
```

- [ ] **Step 1: Extract cookie tests first**

Move existing valid, absent, malformed, duplicate-name, secure, loopback, and
clear-cookie assertions from auth API tests. Add:

```typescript
expect(parseStudioSessionCookie(
  "giwa_studio_session=one; giwa_studio_session=two"
)).toEqual({ present: true, rawToken: null });
expect(clearStudioSessionCookie(true)).toContain("Secure");
expect(clearStudioSessionCookie(true)).toContain("Max-Age=0");
```

- [ ] **Step 2: Run cookie/auth tests and verify RED**

Run:

```powershell
$tests = @(
  "src/lib/live/studioSessionCookie.test.ts"
  "src/lib/live/studioAuthApi.test.ts"
)
pnpm --filter @giwa/web exec vitest run $tests
```

Expected: new test FAILS because the cookie module is absent.

- [ ] **Step 3: Move cookie code and preserve auth behavior**

Move the exact name, token grammar, parser, setter, and clearer. Import them
into `studioAuthApi.ts` without changing cookie attributes or statuses. Rerun
Step 2 and require PASS before campaign API work.

- [ ] **Step 4: Write failing campaign API tests**

Test exact success requests:

```typescript
const token = "a".repeat(43);
await expect(handle({
  method: "GET",
  pathname: "/api/studio/campaigns",
  cookie: `giwa_studio_session=${token}`,
  requestId: "req-list"
})).resolves.toMatchObject({ status: 200 });

await expect(handle({
  method: "POST",
  pathname: "/api/studio/campaigns",
  origin: "https://app.example",
  cookie: `giwa_studio_session=${token}`,
  body: { name: "Draft", summary: "" },
  requestId: "req-create"
})).resolves.toMatchObject({ status: 201 });

await expect(handle({
  method: "PATCH",
  pathname: "/api/studio/campaigns/campaign_one",
  origin: "https://app.example",
  cookie: `giwa_studio_session=${token}`,
  body: { name: "Updated", summary: "", revision: 1 },
  requestId: "req-update"
})).resolves.toMatchObject({ status: 200 });
```

Also test create with omitted `summary` normalizes to an empty string;
missing/malformed/expired cookie 401 and stale-cookie clearing; wrong
Origin 403 before mutation; unknown paths/methods 404; unknown action,
organization, target, amount, or lifecycle fields 400; service error mapping;
limiter denial 429 with `retryAfterMs`; unexpected failure 503 with only
`service_unavailable` and request ID; no token/internal field in responses.

- [ ] **Step 5: Run campaign API tests and verify RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignApi.test.ts
```

Expected: FAIL because the module is absent.

- [ ] **Step 6: Implement exact routing/auth/status behavior**

Match:

```typescript
const isList = request.method === "GET" &&
  request.pathname === "/api/studio/campaigns";
const isCreate = request.method === "POST" &&
  request.pathname === "/api/studio/campaigns";
const updateMatch = request.method === "PATCH"
  ? /^\/api\/studio\/campaigns\/(campaign_[0-9a-f-]+|gasok-demo)$/u
      .exec(request.pathname)
  : null;
```

Authenticate before service access. Require exact Origin for create/update.
Apply a privacy-safe injected mutation limiter after authentication. Accept
only own keys: create requires string `name` and permits an optional string
`summary`; update requires both strings plus numeric `revision`. Map service
errors to 400/403/404/409 and unexpected errors to 503.

- [ ] **Step 7: Run API/auth tests and verify GREEN**

Run:

```powershell
$tests = @(
  "src/lib/live/studioSessionCookie.test.ts"
  "src/lib/live/studioAuthApi.test.ts"
  "src/lib/live/studioCampaignApi.test.ts"
)
pnpm --filter @giwa/web exec vitest run $tests
```

Expected: PASS.

- [ ] **Step 8: Review checkpoint**

Confirm API bodies never expose `StudioAuthenticatedSession.context` and
baseline/cross-tenant updates converge on 404. Do not stage or commit.

## Task 5: Live Runtime Routing, Safety, Bootstrap, and Rate Limit

**Files:**
- Modify: `apps/web/src/lib/live/liveRoutePolicy.ts` and `liveRoutePolicy.test.ts`
- Modify: `apps/web/src/lib/live/liveRequestSafety.ts` and `liveRequestSafety.test.ts`
- Modify: `apps/web/src/lib/live/liveRateLimit.ts` and `liveRateLimit.test.ts`
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/src/lib/live/studioAuthRuntimeContract.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`

**Interfaces:**
- Consumes: campaign API/service/repository and existing live request loop.
- Produces: exact live dispatch, 4 KiB bodies, baseline bootstrap, and hashed
  per-session mutation rate limiting.

- [ ] **Step 1: Write failing route and safety tests**

```typescript
expect(classifyLiveApiRoute("GET", "/api/studio/campaigns")).toBe("studio");
expect(classifyLiveApiRoute("POST", "/api/studio/campaigns")).toBe("studio");
expect(classifyLiveApiRoute(
  "PATCH",
  "/api/studio/campaigns/campaign_00000000-0000-4000-8000-000000000001"
)).toBe("studio");
expect(classifyLiveApiRoute("DELETE", "/api/studio/campaigns/x"))
  .toBe("unknown");

expect(evaluateLiveRequestSafety({
  method: "PATCH",
  pathname: "/api/studio/campaigns/campaign_one",
  origin: "https://app.example",
  allowedOrigins: ["https://app.example"],
  contentType: "application/json"
})).toEqual({ ok: true });
```

PATCH missing/wrong Origin must be 403, wrong media type 415, DELETE 405.

- [ ] **Step 2: Write failing limiter/body tests**

```typescript
expect(LIVE_RATE_LIMIT_POLICY.studioMutationPerSessionPerMinute).toBe(30);
expect(liveRateLimitBucket({
  kind: "studio",
  value: "session-identifier",
  tenantId: "tenant-a"
})).not.toContain("session-identifier");
```

In `liveApi.test.ts` assert 4096-byte Studio POST/PATCH bodies pass and 4097
bytes fail with 413 `request_body_too_large`.

- [ ] **Step 3: Run focused foundation tests and verify RED**

Run:

```powershell
$tests = @(
  "src/lib/live/liveRoutePolicy.test.ts"
  "src/lib/live/liveRequestSafety.test.ts"
  "src/lib/live/liveRateLimit.test.ts"
  "src/lib/live/liveApi.test.ts"
)
pnpm --filter @giwa/web exec vitest run $tests
```

Expected: FAIL for missing Studio route, PATCH policy, limit, and body boundary.

- [ ] **Step 4: Implement route, safety, rate, and body rules**

Add `"studio"` to route class and exact path matching. Change safety to:

```typescript
const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH"]);
const isMutation = input.method === "POST" || input.method === "PATCH";
```

Apply Origin/JSON checks to `isMutation`. Add rate bucket kind `"studio"` and
policy 30. Use `STUDIO_CAMPAIGN_BODY_MAX_BYTES` for Studio campaign paths and
parse bodies for POST or PATCH.

- [ ] **Step 5: Write failing runtime construction tests**

In `studioAuthRuntimeContract.test.ts` require campaign service/API imports and
assert that runtime:

- bootstraps baseline after auth organization/Owner bootstrap;
- uses `store.studioCampaigns` and configured organization ID;
- authenticates with existing Studio auth service;
- passes a hashed tenant/session limiter;
- dispatches `routeClass === "studio"` before partner-token auth;
- returns 503 when disabled and closes the store on bootstrap failure;
- never passes partner-token auth to campaign API.

- [ ] **Step 6: Implement startup and dispatch**

Add `initializeStudioCampaignApi`:

```javascript
const authService = createStudioAuthService({
  repository: store.studioAuth,
  config: studioAuthReadiness.config
});
const campaignService = createStudioCampaignService({
  repository: store.studioCampaigns
});
campaignService.bootstrapBaseline(studioAuthReadiness.config.organizationId);
return createStudioCampaignApiHandler({
  authenticateSession: (rawToken) => authService.authenticateSession(rawToken),
  service: campaignService,
  origin: studioAuthReadiness.config.origin,
  secureCookie: studioAuthReadiness.config.secureCookie,
  consumeMutation: (context) => rateLimiter.consume({
    bucket: liveRateLimitBucket({
      kind: "studio",
      value: context.sessionId,
      tenantId: context.tenantId
    }),
    limit: LIVE_RATE_LIMIT_POLICY.studioMutationPerSessionPerMinute,
    windowMs: 60_000
  })
});
```

Construct after `initializeStudioAuthApi`. On construction failure close the
store and rethrow; when disabled return generic 503. Dispatch Studio result
with method/path/Origin/cookie/body/request ID and log only redacted
route/status/error with `tenantId: null`.

- [ ] **Step 7: Run focused runtime tests and verify GREEN**

Run:

```powershell
$tests = @(
  "src/lib/live/liveRoutePolicy.test.ts"
  "src/lib/live/liveRequestSafety.test.ts"
  "src/lib/live/liveRateLimit.test.ts"
  "src/lib/live/liveApi.test.ts"
  "src/lib/live/studioAuthRuntimeContract.test.ts"
)
pnpm --filter @giwa/web exec vitest run $tests
```

Expected: PASS.

- [ ] **Step 8: Review checkpoint**

Trace one PATCH from server safety through bounded parsing, session auth,
hashed limiter, service, and organization-scoped update. Partner-token bypass
must not appear. Do not stage or commit.

## Task 6: Dependency-Free Browser Campaign Model

**Files:**
- Create: `apps/web/public/studio-campaign-model.js`
- Create: `apps/web/src/lib/live/studioCampaignPresentation.test.ts`
- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`

**Interfaces:**
- Consumes: public-safe campaign API projections.
- Produces:

```javascript
export function emptyStudioCampaignEditor();
export function editorFromStudioCampaign(campaign);
export function validateStudioCampaignEditor(editor, limits);
export function studioCampaignEditorIsDirty(editor);
export function createStudioCampaignPayload(editor);
export function updateStudioCampaignPayload(editor);
export function studioCampaignFailurePresentation(error);
```

- [ ] **Step 1: Write failing pure-model tests**

```typescript
expect(model.createStudioCampaignPayload({
  mode: "create",
  campaignId: null,
  name: "  Partner Draft  ",
  summary: "  Testnet only  ",
  revision: null,
  initialName: "",
  initialSummary: ""
})).toEqual({ name: "Partner Draft", summary: "Testnet only" });

expect(model.updateStudioCampaignPayload({
  mode: "edit",
  campaignId: "campaign_one",
  name: "Updated",
  summary: "",
  revision: 2,
  initialName: "Draft",
  initialSummary: ""
})).toEqual({ name: "Updated", summary: "", revision: 2 });
```

Assert code-point limits, single-line name, control rejection, dirty detection,
baseline non-editability, and error mappings for 400/401/403/404/409/429/503.
No presentation may include raw `error.message` or request data.

- [ ] **Step 2: Run model test and verify RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/studioCampaignPresentation.test.ts
```

Expected: FAIL because the model module is absent.

- [ ] **Step 3: Implement the pure model**

Use this exact editor shape:

```javascript
{
  mode: "create" | "edit",
  campaignId: string | null,
  name: string,
  summary: string,
  revision: number | null,
  initialName: string,
  initialSummary: string
}
```

Validation returns `{ ok: true, value: { name, summary } }` or
`{ ok: false, field, message }`. Builders emit only API keys. Map 401 to
`session-expired` and 409 to `revision-conflict`.

- [ ] **Step 4: Add safe-copy coverage and verify GREEN**

Include the module in `publicCopyGuard.test.ts` and assert no dynamic HTML or
prohibited claim. Run:

```powershell
$tests = @(
  "src/lib/live/studioCampaignPresentation.test.ts"
  "src/lib/live/publicCopyGuard.test.ts"
)
pnpm --filter @giwa/web exec vitest run $tests
```

Expected: PASS.

- [ ] **Step 5: Review checkpoint**

The model must be unable to create action, target, amount, lifecycle, member,
or organization fields. Do not stage or commit.

## Task 7: Authenticated Studio Campaign List and Editor

**Files:**
- Modify: `apps/web/public/studio.js`
- Modify: `apps/web/public/studio.html`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/src/lib/live/studioPresentation.test.ts`
- Modify: `apps/web/src/lib/live/studioCampaignPresentation.test.ts`

**Interfaces:**
- Consumes: browser campaign model and exact API.
- Produces: organization context, baseline-first list, responsive editor,
  dirty-state protection, and accessible status.

- [ ] **Step 1: Write failing UI/source tests**

Preserve every wallet-auth assertion. Replace only the obsolete
`not.toMatch(/campaign.*create/)` check. Require:

- import of `/studio-campaign-model.js`;
- GET after session recovery/verification, POST create, PATCH edit;
- copy `Published baseline`, `Read only`, `Draft`, and
  `Mock Vault Deposit · Testnet only`;
- no Publish/Delete/Clone/Execute/custom-target/amount controls;
- `createElement`/`textContent` and never `innerHTML`;
- persistent testnet Draft-only notice;
- preserved text on failure/conflict;
- `beforeunload` only while dirty;
- `aria-live` save status and keyboard focus restoration;
- desktop, 360 px, and 200 percent zoom layouts without overflow.

- [ ] **Step 2: Run presentation tests and verify RED**

Run:

```powershell
$tests = @(
  "src/lib/live/studioPresentation.test.ts"
  "src/lib/live/studioCampaignPresentation.test.ts"
)
pnpm --filter @giwa/web exec vitest run $tests
```

Expected: FAIL because authenticated Studio is still organization-card-only.

- [ ] **Step 3: Extend authenticated DOM**

Render inside `studio-workspace`:

```html
<section class="studio-campaign-panel" aria-labelledby="studio-campaign-title">
  <div class="studio-campaign-heading">...</div>
  <p class="studio-draft-boundary">
    Draft 저장은 공개, 트랜잭션 실행 또는 기존 데모 변경을 수행하지 않습니다.
  </p>
  <div class="studio-campaign-layout">
    <section aria-label="Campaign list">...</section>
    <section aria-label="Draft editor">...</section>
  </div>
  <p class="studio-campaign-status" role="status" aria-live="polite"></p>
</section>
```

Build with the existing `element` helper. Baseline may link to public
`/partner` but never loads into the editor.

- [ ] **Step 4: Implement load/select/save/conflict behavior**

Generalize `authFetch` so POST/PATCH set JSON content type. After valid session:

```javascript
renderAuthenticatedStudio(session);
await loadStudioCampaigns(session);
```

Keep:

```javascript
let campaignStudioState = {
  session: null,
  campaigns: [],
  limits: { name: 80, summary: 280 },
  editor: null,
  loading: false,
  saving: false,
  notice: null
};
```

Confirm before leaving a dirty editor and register `beforeunload` only while
dirty. Save sequence: local validate, disable, exact POST/PATCH, refetch,
select saved record, reset initial values, announce, restore focus. Preserve
editor on failure. A 401 returns to sign-in; 409 preserves text and renders
explicit `Reload latest`.

- [ ] **Step 5: Add responsive/accessibility CSS**

```css
.studio-campaign-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: var(--protocol-space-6);
}

.studio-campaign-card,
.studio-campaign-input,
.studio-campaign-textarea,
.studio-campaign-save {
  min-height: var(--protocol-target);
}

@media (max-width: 760px) {
  .studio-campaign-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Add `overflow-wrap: anywhere`, visible focus, bounded textarea resize, disabled
state, and no fixed minimum width.

- [ ] **Step 6: Update metadata and run GREEN**

Update `studio.html` description to organization campaign Draft management
while retaining product/testnet copy. Run Step 2 command.

Expected: PASS at all tested states/viewports.

- [ ] **Step 7: Review checkpoint**

Search for baseline edit paths, hidden publish controls, `innerHTML`,
auto-signing, or transaction RPC calls. All must be absent. Do not stage or
commit.

## Task 8: Integrated Regression, Smoke, and Completion Freeze

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Create: `docs/implementation/giwa-release-4-owner-campaign-drafts-local-completion-freeze.md`
- Modify only for caused failures: files already listed in Tasks 1-7.

**Interfaces:**
- Consumes: complete local Draft slice.
- Produces: fresh evidence, durable local boundary, unresolved Git/deployment
  gates.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run `
  src/lib/live/studioCampaignRepository.test.ts `
  src/lib/live/studioCampaignService.test.ts `
  src/lib/live/studioSessionCookie.test.ts `
  src/lib/live/studioCampaignApi.test.ts `
  src/lib/live/liveSchemaMigrations.test.ts `
  src/lib/live/liveStore.test.ts `
  src/lib/live/liveRoutePolicy.test.ts `
  src/lib/live/liveRequestSafety.test.ts `
  src/lib/live/liveRateLimit.test.ts `
  src/lib/live/studioAuthRuntimeContract.test.ts `
  src/lib/live/studioPresentation.test.ts `
  src/lib/live/studioCampaignPresentation.test.ts
```

Expected: PASS with zero failures.

- [ ] **Step 2: Run full gates**

```powershell
pnpm --filter @giwa/web test
pnpm typecheck
pnpm test
pnpm build
& .\scripts\ci\check-safe-scans.ps1
```

Expected: all exit 0. Record actual test/file counts, not predicted counts.

- [ ] **Step 3: Run deterministic local API smoke**

Use the runtime test harness, not a real wallet:

```text
valid Owner session
-> GET campaigns = 200 and baseline first
-> POST Draft = 201 and revision 1
-> PATCH revision 1 = 200 and revision 2
-> PATCH revision 1 again = 409
-> reopen store and GET contains revision 2
-> POST logout = 204
-> GET campaigns with revoked session = 401
```

Expected statuses: `200,201,200,409,200,204,401`. No response contains token,
member ID, organization ID, or source.

- [ ] **Step 4: Verify public/execution boundaries**

```powershell
git diff --name-only -- `
  docs/evidence/giwa-sepolia-mvp-evidence.json `
  apps/web/src/generated/deployment.json `
  apps/web/public/flow-data.json `
  apps/web/public/partner-snapshot.json
rg -n "eth_sendTransaction|wallet_addEthereumChain|Publish|Delete|Execute" `
  apps/web/public/studio.js `
  apps/web/public/studio-campaign-model.js
```

Expected: no slice-caused evidence/generated changes and no transaction or
prohibited campaign controls. Existing user-triggered
`wallet_switchEthereumChain` remains allowed.

- [ ] **Step 5: Perform browser verification**

Start `pnpm --filter @giwa/web dev:live` with existing local test config and a
deterministic session fixture. Check disconnected, loading, baseline-only,
create, edit, save failure, conflict, and expired session at widths 320, 360,
768, 1024, 1440 and 200 percent zoom. Check keyboard-only use, no horizontal
overflow, unchanged `/partner`, and no unexpected console warning/error. Stop
the server and remove only task-created temporary files.

- [ ] **Step 6: Write completion freeze and durable routing**

Record implemented routes/migration/data/authority, actual command counts,
smoke statuses, viewport matrix, unchanged public evidence/execution, and that
no Git/deployment/real wallet/chain action occurred. List excluded publish,
versioning, membership/roles, Receipt history, analytics, PostgreSQL, mainnet,
and real asset/reward features.

Update `README.md` with design/plan/freeze. In the bounded `AGENTS.md` Project
Profile record:

```markdown
- Owner-authenticated Studio campaign Drafts are organization-scoped,
  SQLite-backed, fixed to `mockVaultDeposit`, and disconnected from public or
  executable campaign behavior until a separately approved publish design.
```

- [ ] **Step 7: Run fresh final verification**

```powershell
pnpm --filter @giwa/web test
pnpm typecheck
pnpm test
pnpm build
& .\scripts\ci\check-safe-scans.ps1
git diff --check
git status --short
```

Expected: all checks exit 0 and diff check is clean. Inspect only plan files,
preserve unrelated changes, and report remaining Git/deployment gates. Do not
stage or commit.

## Execution Stop Conditions

Stop and return to design review if:

- a new Draft must become public or executable;
- `campaign_versions` or `mission_definitions` becomes necessary for current
  acceptance;
- Editor/Viewer provisioning or membership mutation becomes necessary;
- arbitrary address, amount, selector, or calldata becomes necessary;
- migration 009 would copy ignored runtime data into public evidence;
- a public evidence hash or existing execution path must change;
- deployment, a real signature, or a chain transaction becomes necessary.

The broader `pnpm --filter @giwa/web artifact:scan` is not a completion gate
for this slice. Its baseline is already blocked by five Release 3 font/license
files with unsupported manifest extensions; resolving that unrelated manifest
policy requires a separate approved scope.

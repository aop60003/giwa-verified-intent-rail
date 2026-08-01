# GIWA Release 4 Owner Campaign Publishing Design

## Status

Approved section by section by the user on 2026-08-01.

This document defines the next local Release 4 vertical slice after the Owner
Campaign Draft Studio. It authorizes an implementation plan only after the user
reviews this written specification. It does not authorize Git staging or
publication, deployment, cloud changes, real-wallet authentication, contract
deployment, wallet signatures, or chain transactions.

## Decision

Add the smallest useful publishing capability:

```text
saved organization Draft
-> Owner confirmation
-> immutable Published Version
-> exact public preview URL
```

Publishing creates a public, read-only campaign preview. It does not create or
sign a Manifest, activate a participant route, execute a transaction, verify an
action, issue a Receipt, or anchor data on GIWA Sepolia.

## Goals

1. Let an authenticated active Owner publish the current saved revision of an
   organization-owned Draft.
2. Store every Published Version as an immutable, reproducible snapshot with a
   canonical application-defined hash.
3. Give each Published Version one stable public preview URL.
4. Preserve the mutable Draft as the workspace for a later version without
   changing any earlier Published Version.
5. Keep the existing GASOK baseline, public evidence, Manifest, Receipt, and
   execution behavior unchanged.

## Non-Goals

This slice does not add:

- participant activation or execution links for a Published Version;
- Manifest generation, signing, or verifier integration;
- Receipt issuance, analytics, anchoring, or chain transactions;
- campaign deletion, unpublishing, archiving, rollback, cloning, or scheduling;
- arbitrary action templates, targets, selectors, calldata, assets, amounts,
  spender addresses, or verifier rules;
- Editor or Viewer authentication, provisioning, or role management;
- changes to the existing `/partner`, `/user`, `/receipt/:hash`, or `/evidence`
  data sources;
- PostgreSQL, hosted deployment, DNS, managed infrastructure, or mainnet;
- real assets, funds, yield, rewards, RWA issuance, settlement, KYC, identity,
  phishing prevention, security guarantees, or finality claims.

## Existing Boundaries to Preserve

- The application-defined EIP-191 Owner challenge, eight-hour session, active
  membership recheck, cookie, same-origin policy, and logout behavior remain
  unchanged.
- Existing partner-token authorization does not gain access to Studio publish
  routes.
- The session-derived organization ID is the only authority for private
  campaign access. Caller-supplied organization or member IDs never establish
  scope.
- The fixed `gasok-demo` published baseline remains read-only and cannot enter
  the new publish path.
- Existing Manifest, verifier-input, Receipt, and evidence hashes remain
  byte-for-byte valid.
- Static evaluator routes continue to work independently of the live adapter.
  A static campaign preview may report that live published data is unavailable;
  it must never substitute Draft or demo data for the requested version.
- Ignored runtime data remains local and is never copied into public or release
  evidence.

## Chosen Approach

Use a mutable campaign workspace plus append-only Published Versions.

The existing `campaigns` row remains the editable Draft. Publishing copies its
saved fields into `campaign_versions`; it does not convert or delete the Draft.
An Owner may then edit the Draft and publish the next numbered version. This
keeps historical versions stable while avoiding a second clone/new-draft
workflow in the first publishing slice.

Using `/partner` for the new preview was rejected because that route is the
existing evidence-derived campaign board. Mixing arbitrary Published Versions
into it would blur its source and evidence semantics. A Studio-only preview was
rejected because it would not provide the selected public-preview outcome.

## Route Boundary

The live adapter adds only these routes:

```text
POST /api/studio/campaigns/:campaignId/publish
GET  /api/studio/campaigns/:campaignId/versions
GET  /api/public/campaigns/:campaignId/versions/:versionNumber
GET  /campaign/:campaignId/v/:versionNumber
```

The final route serves a dependency-light `campaign.html` public surface. The
public API is exact-version lookup only; it provides no campaign or Draft
enumeration endpoint. Unknown paths, unsupported methods, malformed campaign
IDs, and invalid version numbers fail closed.

The current list, create, and update endpoints remain unchanged. The Studio
list projection may add a bounded `latestPublishedVersion` summary, but it must
not expose repository source fields or private organization/member values.

## Data Model

Migration `010_campaign_versions` adds a `campaign_versions` table. Each row
contains:

| Column | Purpose |
| --- | --- |
| `campaignId` | Existing Draft ID and part of the public version identity |
| `organizationId` | Required tenant boundary derived from the session |
| `versionNumber` | Positive, per-campaign monotonically increasing number |
| `name` | Published snapshot of the saved Draft name |
| `summary` | Published snapshot of the saved Draft summary |
| `actionTemplate` | Fixed value `mockVaultDeposit` |
| `sourceDraftRevision` | Exact positive Draft revision that was published |
| `canonicalJson` | Exact UTF-8 JSON text hashed for this version |
| `campaignVersionHash` | Lowercase `0x`-prefixed Keccak-256 digest |
| `publishedByMemberId` | Active Owner that created the version |
| `publishedAt` | UTC ISO timestamp included in the canonical payload |

The primary identity is `(campaignId, versionNumber)`. A unique constraint on
`(campaignId, sourceDraftRevision)` prevents duplicate publication of the same
saved revision. `campaignVersionHash` is globally unique. A tenant-aware
composite foreign key ensures the campaign and version belong to the same
organization. A second composite foreign key ensures the publisher is a member
of that organization. Migration `010` adds the required unique indexes on
`campaigns(campaignId, organizationId)` and
`organization_members(memberId, organizationId)` before it creates these
references.

Database constraints enforce the fixed action template, positive numbers, hash
shape, and non-empty canonical JSON. `BEFORE UPDATE` and `BEFORE DELETE`
triggers abort every attempt to modify or remove a Published Version. The live
store exposes no update or delete method for the table.

### Canonical version payload

The server constructs a fixed-key-order JSON object containing exactly:

```json
{
  "schemaVersion": "1",
  "chainId": 91342,
  "campaignId": "campaign_00000000-0000-4000-8000-000000000000",
  "versionNumber": 1,
  "name": "Partner Testnet Activation",
  "summary": "Public preview of a Mock Vault Deposit campaign.",
  "actionTemplate": "mockVaultDeposit",
  "sourceDraftRevision": 3,
  "publishedAt": "2026-08-01T00:00:00.000Z"
}
```

Serialization uses the displayed key order, JSON string escaping, UTF-8, and no
insignificant whitespace. `campaignVersionHash` is
`keccak256(utf8(canonicalJson))`. The hash is application-defined evidence of
the stored preview snapshot; it is not a wallet signature, contract anchor,
settlement proof, or security guarantee.

For the displayed sample, the exact canonical JSON is:

```text
{"schemaVersion":"1","chainId":91342,"campaignId":"campaign_00000000-0000-4000-8000-000000000000","versionNumber":1,"name":"Partner Testnet Activation","summary":"Public preview of a Mock Vault Deposit campaign.","actionTemplate":"mockVaultDeposit","sourceDraftRevision":3,"publishedAt":"2026-08-01T00:00:00.000Z"}
```

Its golden hash is
`0x101fd0cda215689f915c76bf14471a1d4be5e71c0491e8c5f48abd170028a18e`.

## Repository Boundary

A dedicated `StudioCampaignVersionRepository` is exposed beside the existing
campaign repository. Memory and SQLite implementations provide equivalent
operations:

- publish one tenant-scoped saved Draft revision atomically;
- list Published Versions for one tenant-scoped campaign;
- read one exact public Published Version.

Private operations receive the organization and member IDs from the verified
session context. The public read receives only the validated campaign ID and
version number and returns a public-safe projection.

The SQLite publish operation uses one immediate transaction:

```text
load tenant-owned editable Draft
-> verify expected revision
-> reject an already-published source revision
-> compare with the latest semantic snapshot
-> allocate latest version number + 1
-> build canonical JSON and hash
-> insert immutable version
-> commit
```

The transaction and uniqueness constraints permit exactly one winner for
concurrent attempts. A later attempt receives a bounded conflict rather than a
second version. If the latest version has the same name, summary, and action
template, publishing is rejected as `no_changes_to_publish`, even if a no-op
Draft update produced a newer revision.

Returned records are cloned or freshly projected. Public projections never
contain `organizationId`, `publishedByMemberId`, repository source values,
private runtime state, authorization capabilities, or raw database errors.

## API Contracts

### Publish the saved Draft revision

`POST /api/studio/campaigns/:campaignId/publish` accepts exactly:

```json
{
  "revision": 3
}
```

The API rejects unknown fields. The campaign ID comes from the validated route;
the organization, publisher, action template, next version number, hash, and
timestamp are server-owned. Success returns `201 Created`:

```json
{
  "campaignId": "campaign_00000000-0000-4000-8000-000000000000",
  "versionNumber": 1,
  "campaignVersionHash": "0x101fd0cda215689f915c76bf14471a1d4be5e71c0491e8c5f48abd170028a18e",
  "publishedAt": "2026-08-01T00:00:00.000Z",
  "publicPath": "/campaign/campaign_00000000-0000-4000-8000-000000000000/v/1"
}
```

### List Studio version history

`GET /api/studio/campaigns/:campaignId/versions` returns newest first. Each
entry contains the version number, public snapshot fields, hash, publication
time, source Draft revision, and public path. The response does not expose the
organization or publisher identity.

### Read an exact public version

`GET /api/public/campaigns/:campaignId/versions/:versionNumber` returns exactly
one public-safe immutable projection:

```json
{
  "campaign": {
    "campaignId": "campaign_00000000-0000-4000-8000-000000000000",
    "versionNumber": 1,
    "name": "Partner Testnet Activation",
    "summary": "Public preview of a Mock Vault Deposit campaign.",
    "actionTemplate": "mockVaultDeposit",
    "campaignVersionHash": "0x101fd0cda215689f915c76bf14471a1d4be5e71c0491e8c5f48abd170028a18e",
    "publishedAt": "2026-08-01T00:00:00.000Z",
    "chainId": 91342,
    "network": "GIWA Sepolia",
    "publicPath": "/campaign/campaign_00000000-0000-4000-8000-000000000000/v/1",
    "executionAvailable": false
  }
}
```

Successful exact immutable responses may use bounded public caching. Missing or
invalid responses are not cached as authoritative campaign data.

## Authentication and Authorization

Publish and Studio version-history routes reuse the existing server-side
session and active-membership join. They require:

- a non-expired, non-revoked session;
- an active member;
- the `Owner` role;
- the organization attached to that membership.

Publish additionally requires exact same-origin validation and the existing
privacy-safe Studio mutation rate-limit bucket. The public exact-version route
requires no authentication and never receives a tenant ID from the caller.

A missing campaign, another organization's campaign, the `gasok-demo`
baseline, a non-Draft record, and otherwise inaccessible records all return the
same public `404` response. Authentication failures return `401`; an
authenticated non-Owner returns `403`.

## Studio Experience

Only a selected, saved, clean Draft shows an enabled `Publish public preview`
button. A dirty editor, pending save, pending publish, session error, or
read-only baseline disables or omits the action.

Activating the action opens an accessible confirmation surface containing:

- the campaign name and proposed version number;
- the exact saved Draft revision;
- a GIWA Sepolia testnet and Mock assets notice;
- the statement that the version becomes public and cannot be edited or
  deleted;
- the statement that no transaction, Manifest, verification, or Receipt is
  created.

The destructive-looking consequence is public immutability, not data deletion.
The final action is explicitly labeled `Publish public preview`; cancel returns
focus to the trigger. Double submission is blocked while the request is
pending.

On success, Studio announces the new Version, refreshes the bounded version
history, and exposes an ordinary link to its public preview. The current Draft
remains selected and editable. Editing it creates a new revision; a later
publication creates the next Version without changing the earlier public URL.

Failures keep the editor content and current selection. A revision conflict
uses the existing reload-latest decision. `already_published` and
`no_changes_to_publish` link to the existing latest version rather than
silently creating another one. Session expiration returns to the sign-in gate.

## Public Preview Experience

`/campaign/:campaignId/v/:versionNumber` renders:

- `Published campaign preview`;
- `GIWA Sepolia testnet` and `Mock assets only` labels;
- campaign name, summary, and Version number;
- fixed `Mock Vault Deposit` action-template context;
- publication time and full `campaignVersionHash`;
- `Preview only - Transaction unavailable`.

It renders no wallet-connect, execute, publish, edit, Manifest, verification,
Receipt, yield, reward, or real-asset control. It may link back to the existing
public Campaign evidence board with wording that does not imply the new preview
has evidence or Receipts.

The page uses safe DOM construction rather than untrusted HTML insertion. It
supports keyboard navigation, visible focus, semantic headings and status,
narrow viewports, 200 percent zoom, self-hosted fonts, and reduced motion. A
missing, malformed, or unavailable version shows one generic not-found state
without confirming whether a Draft or private campaign exists.

## Error Model

| Condition | Status | Public behavior |
| --- | --- | --- |
| Malformed JSON, unknown fields, or invalid revision | `400` | Bounded invalid-request message |
| Missing, expired, revoked, or inactive session | `401` | Return to Studio sign-in state |
| Authenticated role is not Owner | `403` | Generic insufficient-access message |
| Missing, inaccessible, baseline, or non-Draft campaign | `404` | One non-enumerating response |
| Malformed or unsupported route ID/version | `404` | Same generic not-found response |
| Stale Draft revision | `409` | Preserve edits and offer reload-latest |
| Source revision already published | `409` | Link to the existing version |
| Latest public content is unchanged | `409` | Link to the latest version |
| Privacy-safe rate limit exceeded | `429` | Retry-later message |
| Store, migration, or bootstrap unavailable | `503` | Generic retryable message with request ID |

Unexpected errors never log or return cookies, session tokens, wallet
signatures, raw request bodies, canonical JSON from private records, database
details, ignored runtime data, or cross-organization identifiers.

## Migration and Startup

Migration `010_campaign_versions` is additive, transactional, versioned, and
checksum-verified. It creates the table, constraints, tenant-aware indexes, and
immutability triggers. The schema inspector and hosted guard verify the exact
columns, primary/unique indexes, foreign keys, checks, and both triggers.

Startup ordering remains:

```text
open live store
-> apply and verify migrations
-> bootstrap organization and configured Owners
-> bootstrap or verify gasok-demo baseline
-> construct Campaign Version repository and services
-> expose Studio and public version routes
```

Hosted modes fail closed before Studio campaign bootstrap or route exposure
when the version schema is missing or drifted. Existing public evaluator routes
continue using their independent sources of truth.

## Security and Claim Boundaries

- Tenant isolation is enforced in repository predicates and foreign-key or
  guarded-insert constraints, not only in UI filtering.
- Immutability is enforced by the repository surface and SQLite triggers.
- Optimistic concurrency and source-revision uniqueness prevent duplicate or
  stale publication.
- Canonical hashing is deterministic and covered by a fixed test vector.
- The public route exposes only a stored preview snapshot and no capability,
  session, organization, member, Draft, or runtime data.
- `Published` means publicly readable application data. It does not mean
  executable, verified, signed, anchored, settled, secure, compliant, or final.
- Flashblocks preconfirmation is not introduced or described as finality or
  settlement.

## Test Strategy

### Canonicalization, repository, and migration

- fixed canonical JSON and Keccak-256 golden vector;
- string escaping, Unicode, empty summary, and key-order regression tests;
- migration inventory, checksum, table checks, indexes, foreign keys, and
  immutability-trigger tests;
- memory and SQLite parity for publish, list, exact read, and errors;
- restart persistence and historical-version immutability;
- organization isolation, baseline rejection, stale revision, duplicate source
  revision, no-change publication, and concurrent single-winner tests;
- sequential Version 1 and Version 2 creation from distinct Draft revisions.

### API and authorization

- valid Owner publish, Studio history, and public exact-read paths;
- missing, expired, revoked, disabled, and non-Owner sessions;
- exact same-origin and mutation rate-limit enforcement;
- another organization and baseline records share the bounded `404` response;
- unknown fields, body limit, ID, version, and revision validation;
- public response omission of organization/member/source/private fields;
- generic internal-error behavior and privacy-safe request identifiers;
- existing authentication, Draft, partner-token, and public-evidence routes
  remain unchanged.

### Presentation and accessibility

- clean, dirty, saving, publishing, success, conflict, duplicate, unchanged,
  failure, and session-expired Studio states;
- baseline and unsaved Drafts cannot expose an enabled publish control;
- confirmation content, cancel focus restoration, and double-submit blocking;
- version history and exact public links;
- public loading, loaded, malformed, missing, and unavailable states;
- no execute, wallet, Manifest, Receipt, delete, unpublish, or arbitrary-action
  controls;
- safe DOM rendering, keyboard operation, focus, announcements, narrow viewport
  matrix, 200 percent zoom, and reduced motion;
- no unexpected application console errors.

### Regression gates

- focused Campaign Version tests;
- full web test suite;
- workspace typecheck and tests;
- production build;
- migration and safe-content guards;
- local API smoke for session, Draft save, publish, duplicate/conflict, history,
  public read, and logout;
- confirmation that existing Manifest, Receipt, public evidence, and generated
  submission artifacts did not change.

## Acceptance Criteria

The slice is locally complete when:

1. a configured active Owner can publish the current saved Draft revision as
   Version 1;
2. its exact public URL renders the immutable public-safe snapshot;
3. the same Draft revision, stale revision, no-change revision, simultaneous
   attempt, baseline, other organization, non-Owner, and expired session cannot
   create an unauthorized or duplicate version;
4. editing the Draft and publishing Version 2 leaves Version 1 byte-for-byte
   unchanged;
5. public responses never expose Draft, organization, member, session,
   capability, or private runtime data;
6. publishing changes no existing public evidence, Manifest, Receipt, or
   execution behavior and performs no wallet or chain action;
7. focused and regression verification passes.

## Delivery Boundary

Implementation remains local until the user separately authorizes Git or
deployment actions. No real wallet signature or GIWA Sepolia transaction is
required to prove local completion. Deterministic service, repository, API,
static/live route, and browser verification are sufficient for this
public-preview-only slice.

Future participant activation, Manifest/Receipt integration, organization role
management, analytics, and GIWA Sepolia Receipt anchoring each require their own
separately reviewed design. None is implied by a Published Version record.

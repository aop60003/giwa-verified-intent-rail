# GIWA Release 4 Owner Campaign Draft Studio Design

## Status

Approved section by section by the user on 2026-08-01.

This document refines the next local vertical slice of Release 4 after
`2026-08-01-giwa-release-4-wallet-session-studio-design.md`. It authorizes
an implementation plan only after user review of this written design. It does
not authorize Git staging or publication, deployment, cloud changes, contract
deployment, wallet transactions, or chain transactions.

## Decision

Add the smallest useful organization-scoped campaign authoring capability:

```text
Owner wallet session
-> authenticated organization Studio
-> read-only gasok-demo published baseline
-> create one mockVaultDeposit Draft
-> edit the Draft with optimistic concurrency
-> persist the Draft in local SQLite
```

The slice is deliberately draft-only. A saved Draft does not become public,
does not issue a Manifest or Receipt, and does not submit or authorize a
transaction.

## Goals

1. Let an authenticated active Owner create and edit organization-owned
   campaign Drafts in Studio.
2. Keep the existing `gasok-demo` campaign visible as a read-only published
   baseline without changing its public evidence or execution behavior.
3. Establish a tenant-scoped campaign repository that behaves identically in
   memory and SQLite.
4. Preserve a narrow path toward later campaign versions and role management
   without implementing those capabilities now.
5. Keep all campaign input constrained to the existing exact
   `mockVaultDeposit` testnet template.

## Non-Goals

This slice does not add:

- campaign publishing, version creation, cloning, archiving, or deletion;
- participant links, Manifest issuance, execution, verification, or Receipt
  issuance for a new Draft;
- `mockTokenTransfer`, arbitrary targets, selectors, calldata, asset
  addresses, amounts, spender addresses, or verifier rules;
- Editor or Viewer provisioning, invitations, or role-management UI;
- analytics, Receipt history, or wallet-linked participant cases;
- changes to the public `/partner`, `/user`, `/receipt/:hash`, or
  `/evidence` behavior;
- PostgreSQL, hosted deployment, DNS, managed infrastructure, or mainnet;
- real assets, yield, rewards, RWA issuance, settlement, KYC, identity,
  phishing prevention, or security guarantees.

## Existing Boundaries to Preserve

- The application-defined EIP-191 challenge, eight-hour server session,
  active-membership recheck, secure cookie, origin policy, and logout behavior
  remain unchanged.
- Existing partner-token authorization does not gain access to the new Studio
  campaign API.
- The session-derived organization ID is the only authority for campaign
  access. A caller-supplied tenant or organization ID never establishes scope.
- Existing Manifest, verifier-input, Receipt, and evidence hashes remain
  byte-for-byte valid.
- The committed public evidence remains authoritative for the existing
  `gasok-demo` behavior.
- Static evaluator routes continue to work independently of the live adapter.
- Ignored runtime data remains local and is not copied into release evidence.

## Chosen Approach

Use a server-authoritative minimal Draft repository instead of browser-local
storage or the complete campaign-version system.

Browser-local storage was rejected because it cannot provide organization
isolation, cross-session persistence, or a credible path to role-based
authoring. Building `campaign_versions` and `mission_definitions` now was
rejected because this slice has no publish operation or executable new
campaign, so those records would create untested lifecycle surface without a
current consumer.

## Route Boundary

The existing `/studio` page remains the only authenticated Studio surface.
It gains the following endpoints:

```text
GET   /api/studio/campaigns
POST  /api/studio/campaigns
PATCH /api/studio/campaigns/:campaignId
```

No catch-all Studio mutation route is introduced. Unknown paths and unsupported
methods fail closed. There is no DELETE or publish endpoint.

## Data Model

Migration `009_studio_campaign_drafts` adds one `campaigns` table. The table
contains:

| Column | Purpose |
| --- | --- |
| `campaignId` | Immutable server-generated primary key, except the fixed `gasok-demo` baseline ID |
| `organizationId` | Required foreign key to `organizations` |
| `name` | Owner-visible campaign name |
| `summary` | Optional short description, stored as an empty string when omitted |
| `actionTemplate` | Required value `mockVaultDeposit` |
| `lifecycleState` | Either `draft` or `published-baseline` |
| `source` | Either `studio-draft` or `gasok-evidence` |
| `revision` | Positive integer used for optimistic concurrency |
| `createdByMemberId` | Active Owner that created a Draft; null only for the baseline |
| `updatedByMemberId` | Active Owner that last changed a Draft; null only for the baseline |
| `createdAt` | UTC ISO timestamp |
| `updatedAt` | UTC ISO timestamp |

Database checks enforce the allowed template, lifecycle, source, and positive
revision values. They also enforce the valid source/lifecycle combinations:

- `studio-draft` records are `draft` and have creator/updater member IDs;
- `gasok-evidence` records are `published-baseline` and have null
  creator/updater member IDs.

The table uses restrictive foreign keys to the organization and member tables.
An index on organization, lifecycle state, update time, and campaign ID owns
the list-query order. Names are not identifiers and are not unique.

### Campaign IDs

New Draft IDs are generated by the server from cryptographically random UUID
material and use a stable `campaign_` prefix. The client cannot request or
replace an ID. The existing baseline retains the exact `gasok-demo` ID.

### Published baseline bootstrap

After the existing organization and bootstrap-Owner transaction succeeds, the
campaign bootstrap inserts or verifies one `gasok-demo` baseline for the
configured default organization. Its public-safe name, summary, and template
come from committed application/evidence metadata, never from ignored local
runtime evidence.

Bootstrap is idempotent. It may refresh presentation metadata only when the
existing row is the same `gasok-evidence` baseline owned by the same
organization. An ID collision, source mismatch, or organization mismatch fails
closed rather than reassigning data.

The baseline row is used only by the authenticated Studio list. Existing
public routes continue to read their current sources of truth.

## Repository Boundary

A dedicated `StudioCampaignRepository` is exposed from the live store beside
the authentication repository. Both memory and SQLite implementations provide
equivalent operations:

- bootstrap or verify the published baseline;
- list campaigns for one organization;
- create one organization-scoped Draft;
- update one organization-scoped Draft at an expected revision.

Repository methods receive an explicit organization ID from the service, not
from an untrusted request. Returned records are cloned or freshly projected so
callers cannot mutate repository state by reference.

Draft creation is atomic. Draft update uses a conditional write matching
campaign ID, organization ID, `draft` state, and expected revision. A
successful update increments the revision exactly once. Baseline records never
enter the update path.

## API Contracts

### List campaigns

`GET /api/studio/campaigns` returns:

```json
{
  "campaigns": [
    {
      "campaignId": "gasok-demo",
      "name": "GIWA GASOK Demo",
      "summary": "Existing verified-intent testnet campaign.",
      "actionTemplate": "mockVaultDeposit",
      "lifecycleState": "published-baseline",
      "editable": false,
      "revision": 1,
      "updatedAt": "2026-08-01T00:00:00.000Z"
    }
  ],
  "limits": {
    "name": 80,
    "summary": 280
  }
}
```

The baseline sorts first. Drafts then sort by `updatedAt` descending with
`campaignId` as the stable tie-breaker. The response does not expose
organization IDs, member IDs, database source fields, private runtime data, or
authorization capabilities.

### Create a Draft

`POST /api/studio/campaigns` accepts exactly:

```json
{
  "name": "Partner Testnet Activation",
  "summary": "A draft for the existing Mock Vault Deposit flow."
}
```

Unknown fields are rejected. The server supplies the organization, member,
campaign ID, action template, lifecycle, source, revision, and timestamps.
Success returns `201 Created` with the public-safe Draft projection.

### Update a Draft

`PATCH /api/studio/campaigns/:campaignId` accepts exactly:

```json
{
  "name": "Updated Partner Testnet Activation",
  "summary": "Updated draft copy.",
  "revision": 1
}
```

Unknown fields are rejected. Success returns `200 OK` with revision 2. A
stale revision returns `409 Conflict` and does not overwrite either version.
The conflict response tells the browser to refetch but does not include data
outside the authenticated organization.

## Input Validation

- Requests must use JSON and stay within the existing bounded request-body
  mechanism; the campaign payload limit is 4 KiB.
- `name` is trimmed, single-line, and 1 to 80 Unicode code points.
- `summary` is trimmed and 0 to 280 Unicode code points.
- NUL and disallowed control characters are rejected.
- `revision` is a positive safe integer.
- Route campaign IDs must match the server-generated campaign ID grammar or the
  fixed `gasok-demo` ID before repository access.
- The API never accepts an action template, target, selector, calldata, asset,
  amount, spender, verifier rule, lifecycle, source, organization, or member
  field.

## Authentication and Authorization

Every campaign endpoint resolves the existing Studio session cookie through
the server-side session and active-member join. The request must resolve to:

- a non-expired, non-revoked session;
- an active member;
- the `Owner` role;
- the organization attached to that membership.

The list, create, and update operations all use that derived organization.
Although the master Release 4 role vocabulary permits future Editor read/write
and Viewer read access, this first campaign slice grants no route authority to
either role.

POST and PATCH reuse the existing exact same-origin policy. Mutation requests
also use a privacy-safe rate-limit bucket without retaining raw wallet,
organization, campaign, or session-token values. GET remains non-mutating but
still requires the authenticated session.

Authentication failures return `401`. An authenticated non-Owner returns
`403`. A missing campaign, another organization campaign, a baseline update,
and an otherwise inaccessible campaign all use the same public `404`
response so existence is not disclosed.

## Studio Experience

After authentication, `/studio` renders:

1. the existing organization context with organization name, wallet, Owner
   role, GIWA Sepolia testnet label, session expiration, and sign-out;
2. a campaign list with the read-only published baseline first and Drafts in
   recent-update order;
3. an inline Draft editor.

The baseline card shows:

- `Published baseline`;
- `Read only`;
- the existing `mockVaultDeposit` template;
- an optional link to the current public partner evidence view.

Each Draft card shows its name, summary, template, last-updated time, and
`Draft` state. Selecting a Draft loads it into the editor. `New draft`
opens an empty editor. The only editable controls are name and summary.
`Mock Vault Deposit - Testnet only` is visible as fixed context, not a form
control.

A persistent notice states that saving a Draft does not publish it, execute a
transaction, or change the public demo. No publish, delete, clone, execute, or
custom-contract control is rendered.

Desktop layouts place the list and editor side by side. Narrow layouts and
200 percent browser zoom stack them in reading order. Existing design tokens,
focus styles, reduced-motion behavior, keyboard navigation, semantic labels,
and live status announcements remain authoritative.

### UI states

The page distinguishes:

- session recovery;
- campaign-list loading;
- published baseline with no Drafts;
- Draft selection;
- new Draft;
- dirty editor;
- saving;
- saved;
- retryable list or save failure;
- validation failure;
- revision conflict;
- session expiration.

Save is disabled while an identical request is pending. A failed save keeps
the entered text. Internal navigation away from a dirty editor requires
confirmation, and browser navigation uses the standard unsaved-change warning.
Successful creation or update refreshes the list, selects the saved Draft, and
announces the result without forcing unexpected focus movement.

On a revision conflict, the browser preserves the unsaved local text and
offers an explicit reload-latest action. It does not silently merge or
overwrite.

## Error Model

| Condition | Status | Public behavior |
| --- | --- | --- |
| Malformed JSON, unknown fields, invalid input | `400` | Field-safe validation message |
| Missing, expired, revoked, or inactive session | `401` | Return to Studio sign-in state |
| Authenticated role is not Owner | `403` | Generic insufficient-access message |
| Missing, inaccessible, or immutable campaign | `404` | One non-enumerating response |
| Stale revision | `409` | Preserve edits and offer reload-latest |
| Privacy-safe rate limit exceeded | `429` | Retry-later message |
| Store or bootstrap unavailable | `503` | Generic retryable message |

Unexpected errors receive a request identifier but never log or return cookie
values, session tokens, wallet signatures, raw private runtime data, request
bodies, or cross-organization identifiers.

## Migration and Startup

Migration `009_studio_campaign_drafts` is transactional, versioned, and
checksum-verified by the existing schema guard. Hosted modes fail closed when
the migration, checksum, table constraints, indexes, or foreign keys are
missing or drifted.

Startup ordering is:

```text
open live store
-> apply and verify migrations
-> bootstrap organization and configured Owners
-> bootstrap or verify gasok-demo baseline
-> expose Studio campaign routes
```

If baseline bootstrap fails, the authenticated campaign endpoints remain
unavailable; public routes continue to use their independent existing sources.
No migration or bootstrap reads from `apps/web/.data/` to produce a public
artifact.

## Security and Claim Boundaries

- Tenant isolation is enforced in repository filters and API service
  construction, not only in UI filtering.
- Baseline immutability is enforced in the repository update predicate, not
  only by hiding edit controls.
- The fixed action template is supplied by the server and constrained by the
  database. Client-supplied execution fields are rejected.
- Optimistic concurrency prevents stale tabs from silently overwriting newer
  work.
- The feature is an authoring Draft surface, not proof that a campaign is
  published, verified, settled, secure, compliant, or executable.
- Testnet labeling remains visible. The product makes no real-asset, yield,
  RWA, KYC, identity, phishing-prevention, settlement, or finality claim.

## Test Strategy

### Repository and migration

- migration inventory, checksum, schema, checks, index, and foreign-key tests;
- idempotent baseline bootstrap and collision/mismatch fail-closed tests;
- memory and SQLite parity for list, create, update, conflict, and persistence;
- organization isolation and baseline immutability tests;
- generated-ID shape and uniqueness tests;
- restart persistence for SQLite.

### API and authorization

- valid Owner list, create, and update paths;
- missing, expired, revoked, disabled, and non-Owner sessions;
- same-origin enforcement for POST and PATCH;
- another organization campaign cannot be read or changed through the API;
- baseline and inaccessible campaign updates share the non-enumerating 404;
- unknown fields, body limit, name, summary, control-character, ID, and
  revision validation;
- concurrent same-revision update permits exactly one winner;
- rate-limit and generic internal-error behavior;
- existing authentication and partner-token routes remain unchanged.

### Presentation and accessibility

- baseline-first and recent-Draft ordering;
- empty, loading, selected, dirty, saving, saved, error, conflict, and expired
  states;
- no publish, delete, execute, or arbitrary action controls;
- failed saves preserve editor contents;
- focus restoration, keyboard operation, labels, status announcements, and
  unsaved-change handling;
- responsive viewport matrix and 200 percent zoom;
- no unexpected application console errors.

### Regression gates

- focused Studio campaign tests;
- the full web test suite;
- workspace typecheck and tests;
- production build;
- migration and safe-content guards;
- local API smoke covering session, list, create, update, conflict, and logout;
- confirmation that public artifacts and existing evidence hashes did not
  change.

## Acceptance Criteria

The slice is locally complete when:

1. a configured active Owner can authenticate and list the organization
   campaigns;
2. `gasok-demo` appears first as a read-only published baseline;
3. the Owner can create a named `mockVaultDeposit` Draft;
4. the Owner can edit that Draft only with the current revision;
5. the Draft remains after the SQLite store is reopened;
6. another organization, non-Owner, expired session, and baseline update cannot
   cross the authorization boundary;
7. saving a Draft does not change public routes, evidence, Manifest or Receipt
   hashes, or execute a transaction;
8. focused and regression verification passes.

## Delivery Boundary

Implementation remains local until the user separately authorizes Git or
deployment actions. No real wallet signature or GIWA Sepolia transaction is
required to prove local completion; deterministic service, repository, API,
and browser tests are sufficient for this Draft-only slice.

After this slice, campaign publishing/versioning and organization
membership/role management each require a separately reviewed design. Neither
is implied by the presence of campaign Draft records.

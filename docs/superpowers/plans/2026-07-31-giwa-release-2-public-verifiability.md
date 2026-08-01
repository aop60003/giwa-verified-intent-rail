# GIWA Release 2 — Public Verifiability and Partner Evidence Implementation Plan

> **Execution note:** Implement task-by-task with RED → GREEN → REFACTOR. Use
> the current working directory, preserve unrelated changes, and do not stage,
> commit, push, deploy, mutate cloud resources, or submit chain transactions
> without a separate explicit user direction.

## Local Completion Status — 2026-07-31

This plan is locally complete:

- [x] Task 1 — Canonical public bundle and independent replay contract.
- [x] Task 2 — Immutable verification-time evidence persistence.
- [x] Task 3 — Three-key public lookup and safe legacy backfill path.
- [x] Task 4 — Replay CLI and downloadable JSON response.
- [x] Task 5 — Receipt and Proof Ledger verification-bundle UX.
- [x] Task 6 — Capability-free controlled negative control.
- [x] Task 7 — Privacy-safe campaign events and evidence metrics.
- [x] Task 8 — Replay, migration, and staging-smoke documentation.
- [x] Task 9 — Local Release 2 verification and final review gate.

The durable completion boundary and remaining release gates are recorded in
[`docs/implementation/giwa-release-1-2-local-completion-freeze.md`](../../implementation/giwa-release-1-2-local-completion-freeze.md).
Public campaign-event ingestion remains no-go until `R2-T7-M1` is resolved.
Local completion does not authorize staging, remote migration, backfill, Git
publication, or a chain transaction.

**Goal:** Turn the product's current public proof summary into a downloadable,
replayable, privacy-safe verification capability that connects one Matched
Receipt to its Manifest, verifier input, decoded chain evidence, campaign
metrics, and controlled negative example.

**Architecture:** Capture a versioned public-safe evidence bundle at verification
time and persist it as an immutable SQLite record keyed by Receipt, Intent, and
deposit transaction hashes. Public reads use only this stored bundle and the
existing commercial Receipt gate; they never re-run privileged operations or
expose participant capabilities. A pure replay module and CLI recompute the
Manifest, verifier-input, decoded-log, and Receipt hashes from bundle fields
alone. Campaign visit and wallet-connect events use a random first-party
anonymous session identifier whose hash—not the raw identifier, IP address, or
user-agent—is persisted.

**Stack:** TypeScript 6, Node.js 22, pnpm 10, Vitest, viem, `node:sqlite`,
dependency-light browser JavaScript, existing live API and static public shell.

**Approved source:**
`docs/superpowers/specs/2026-07-31-giwa-full-platform-evolution-design.md`

---

## Scope and fixed decisions

### Selected implementation approach

Use an immutable verification-time public evidence snapshot.

- A successful Matched decision produces `PublicVerificationBundleV1`.
- The exact serialized bundle is stored once and never mutated.
- Receipt, Intent, and deposit transaction lookups resolve the same record.
- Public lookup fails closed when the commercial Receipt gate fails or the
  immutable bundle does not replay.
- Existing matched records are upgraded by a bounded public-RPC backfill that
  must reproduce every already-persisted hash before saving a bundle.

### Rejected approaches

1. **Read-time RPC reconstruction**
   - Rejected because public reads would depend on current RPC availability and
     could return different confirmation snapshots over time.
2. **Static export only**
   - Rejected because newly completed participant journeys would not become
     independently verifiable without a manual release.
3. **Expose internal verifier/runtime rows directly**
   - Rejected because internal records contain implementation coupling and make
     capability or private-state disclosure easier.

### Public bundle boundary

The bundle contains proof material only:

- canonical Manifest JSON, bytes, signature, EIP-712 domain, chain ID,
  verifying contract, and recovered signer;
- canonical verifier input JSON, bytes, hash, and version;
- deposit transaction hash, verification block number and hash,
  head block at verification, and confirmation snapshot;
- decoded public-safe Approval, Transfer, and MockDeposit logs;
- canonical Receipt JSON, bytes, hash, and version;
- testnet/mock-asset notice and replay instructions.

The bundle must never contain:

- run capability or capability hash;
- `runId`, session token, partner credential, authentication nonce, or private
  error trace;
- database path/key, request headers, raw IP, raw user-agent, environment
  values, or signing secrets.

### Analytics definitions

- `campaignVisited` = distinct anonymous session hashes that recorded a campaign
  visit for the fixed campaign and mission.
- `walletConnected` = distinct anonymous session hashes that recorded a wallet
  connection for the fixed campaign and mission.
- `uniqueParticipantCount` = distinct normalized wallet addresses among runs
  with a submitted deposit transaction.
- `repeatActivatorCount` = distinct wallets with at least two Matched Receipts.
- `repeatActivationCount` = Matched Receipts after the first Matched Receipt for
  each wallet.
- `matchedTxRate` = `matchedReceiptCount / submittedDepositCount`; both numerator
  and denominator are returned with a human-readable definition.

Each anonymous session can contribute at most once to each public event type for
the fixed campaign and mission. The browser stores a random first-party
identifier; the server persists only its SHA-256 hash.

---

## Task 1: Define the canonical public bundle and independent replay contract

**Files:**

- Create: `apps/web/src/lib/live/publicVerificationBundle.ts`
- Create: `apps/web/src/lib/live/publicVerificationBundle.test.ts`
- Create: `apps/web/src/lib/live/publicVerificationReplay.ts`
- Create: `apps/web/src/lib/live/publicVerificationReplay.test.ts`
- Modify: `packages/protocol/src/index.ts` only if an existing canonical helper
  must be exported; do not duplicate protocol hashing logic in the web package.

### Step 1: Write failing bundle fixture tests

Create a deterministic `PublicVerificationBundleV1` fixture from the existing
protocol Manifest, verifier input, decoded log, and Receipt fixtures.

Assert:

- `schemaVersion === "1"`;
- all identity hashes are normalized lowercase `bytes32`;
- the canonical Manifest JSON and bytes recompute `intentHash`;
- the canonical verifier input JSON and bytes recompute `verifierInputHash`;
- decoded logs recompute `decodedLogSnapshotHash`;
- canonical Receipt JSON and bytes recompute `receiptHash`;
- EIP-712 recovery returns the bundle's `recoveredSigner`;
- the Receipt, Intent, and deposit transaction fields agree across all sections;
- the notice is exactly testnet/mock-only and makes no settlement/finality claim.

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/publicVerificationBundle.test.ts src/lib/live/publicVerificationReplay.test.ts
```

Expected: FAIL because the bundle and replay modules do not exist.

### Step 2: Implement strict bundle normalization

Define:

```ts
export type PublicVerificationBundleV1 = {
  schemaVersion: "1";
  source: "live";
  generatedAt: string;
  identity: {
    receiptHash: string;
    intentHash: string;
    depositTxHash: string;
  };
  manifest: {
    payload: ActionManifest;
    canonicalPayload: string;
    canonicalPayloadBytesHex: string;
    signature: string;
    signingDomain: {
      name: "GIWA Verified Intent Rail";
      version: "1";
      chainId: 91342;
      verifyingContract: string;
    };
    recoveredSigner: string;
  };
  verifierInput: {
    payload: VerifierInputPayload;
    canonicalPayload: string;
    canonicalPayloadBytesHex: string;
    verifierInputHash: string;
    verifierVersion: string;
  };
  verification: {
    depositBlockNumber: number;
    depositBlockHash: string;
    headBlockNumberAtVerification: number;
    confirmationDepth: number;
    standardRpcReceiptStatus: 1;
  };
  decodedLogs: DecodedLogSnapshot[];
  receipt: {
    payload: ReceiptPayload;
    canonicalPayload: string;
    canonicalPayloadBytesHex: string;
    receiptHash: string;
    schemaVersion: "1";
    verifierVersion: string;
  };
  replay: {
    algorithm: "keccak256-canonical-json+eip712";
    command: string;
  };
  notice: "GIWA Sepolia testnet · Mock assets only · No settlement or finality claim";
};
```

The normalizer must:

- reject unknown schema versions;
- reject malformed hashes, addresses, signatures, timestamps, and negative or
  unsafe integer fields;
- normalize public hashes and addresses to lowercase;
- restrict decoded event names to `Approval`, `Transfer`, and `MockDeposit`;
- keep only documented decoded-log fields;
- reject any recursively discovered forbidden key such as `runId`,
  `capability`, `session`, `credential`, `privateKey`, `headers`, or `env`.

### Step 3: Implement replay from bundle fields only

`replayPublicVerificationBundle(bundle)` must not accept a store, RPC client,
environment, or server dependency. Return a structured result:

```ts
{
  ok: boolean;
  checks: {
    manifestHash: "passed" | "failed";
    manifestSignature: "passed" | "failed";
    verifierInputHash: "passed" | "failed";
    decodedLogHash: "passed" | "failed";
    receiptHash: "passed" | "failed";
    crossReferences: "passed" | "failed";
  };
  recoveredSigner: string | null;
}
```

Use existing protocol canonicalization and signature recovery functions. Do not
trust hash strings already present in the bundle.

### Step 4: Add tamper and forbidden-field tests

Clone the valid fixture and independently tamper:

- Manifest wallet;
- signature;
- verifier input bytes;
- decoded log amount;
- Receipt deposit hash;
- top-level identity hash;
- a nested `runCapability` canary.

Every mutation must fail the appropriate replay or normalization check.

### Step 5: Run focused tests and typecheck

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/publicVerificationBundle.test.ts src/lib/live/publicVerificationReplay.test.ts
pnpm --filter @giwa/web typecheck
```

Expected: PASS.

---

## Task 2: Capture and persist immutable verification-time evidence

**Files:**

- Modify: `apps/web/src/lib/live/liveTypes.ts`
- Modify: `apps/web/src/lib/live/liveStore.ts`
- Modify: `apps/web/src/lib/live/liveStore.test.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.test.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`

### Step 1: Write failing storage contract tests

Add `PublicEvidenceRecord`:

```ts
type PublicEvidenceRecord = {
  receiptHash: string;
  intentHash: string;
  depositTxHash: string;
  bundleJson: string;
  createdAt: string;
};
```

Tests for both memory and SQLite stores must prove:

- save-once idempotency for the same exact record;
- uniqueness across Receipt, Intent, and deposit transaction hashes;
- lookup by each of the three hashes returns the same record;
- a conflicting rewrite throws instead of replacing evidence;
- reopen preserves the exact serialized bytes;
- incomplete-run pruning never removes a run referenced by public evidence.

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveStore.test.ts src/lib/live/liveSchemaMigrations.test.ts
```

Expected: FAIL because the store has no public-evidence record.

### Step 2: Add migration `006_public_evidence_bundles`

Create:

```sql
create table if not exists public_evidence_bundles (
  receiptHash text primary key,
  intentHash text not null unique,
  depositTxHash text not null unique,
  bundleJson text not null,
  createdAt text not null
);
```

Add the migration to `REQUIRED_LIVE_MIGRATIONS`, readiness schema inspection,
memory storage, SQLite row parsing, and store methods:

- `savePublicEvidence(record)`
- `getPublicEvidenceByReceiptHash(hash)`
- `getPublicEvidenceByIntentHash(hash)`
- `getPublicEvidenceByDepositTxHash(hash)`

Existing databases must migrate additively without rewriting Receipt or decision
rows.

### Step 3: Make the verifier return matched proof material

Extend `LiveVerifierServiceResult` with an optional public evidence draft that
contains only:

- normalized Manifest and signature;
- verifying contract and recovered signer;
- canonical verifier input and decoded public-safe logs;
- verification-time block/confirmation fields;
- built Receipt record.

Do not serialize or persist a bundle for timeout, failed, or mismatched
decisions. The commercial Receipt rule remains: only `matched` plus a valid
Receipt can become public.

### Step 4: Persist outcome coherently

In `liveApi.ts`, after replaying the newly built bundle and before returning a
public-ready response:

1. save canonical verifier input;
2. save Receipt;
3. save terminal decision;
4. save immutable public evidence;
5. update run state to `matched`.

For SQLite, introduce a single store operation or transaction boundary so a
process failure cannot leave a public bundle without its Receipt/decision or a
Matched decision without its bundle. Preserve existing idempotent terminal
behavior.

### Step 5: Test failure atomicity and privacy

Add regressions for:

- bundle replay failure keeps the public gate closed;
- evidence persistence failure does not publish a partial Matched outcome;
- retry after an interrupted write is idempotent;
- serialized `bundleJson` contains no capability hash, run ID, session value,
  request ID, private trace, environment value, or injected canary.

### Step 6: Run focused tests

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveStore.test.ts src/lib/live/liveSchemaMigrations.test.ts src/lib/verifier/liveVerifierService.test.ts src/lib/live/liveApi.test.ts
pnpm --filter @giwa/web typecheck
```

Expected: PASS.

---

## Task 3: Upgrade exact-hash public lookup and add safe legacy backfill

**Files:**

- Modify: `apps/web/src/lib/live/publicProofLookup.ts`
- Modify: `apps/web/src/lib/live/publicProofLookup.test.ts`
- Create: `apps/web/src/lib/live/publicEvidenceBackfill.ts`
- Create: `apps/web/src/lib/live/publicEvidenceBackfill.test.ts`
- Create: `apps/web/scripts/backfill-public-evidence.mjs`
- Create: `apps/web/src/lib/live/publicEvidenceBackfillScript.test.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.test.ts`

### Step 1: Write failing three-key bundle lookup tests

For one valid stored bundle, request:

- Receipt hash;
- Intent hash;
- deposit transaction hash.

Assert byte-equivalent bundle content and only `queryKind` differs. Also assert:

- malformed hash returns the same bounded not-found response;
- a mismatched, pending, or integrity-locked record is never public;
- a valid Receipt without a public bundle is not falsely described as fully
  replayable;
- no capability-bearing field appears in success or failure bodies.

### Step 2: Replace the summary projection with bundle-backed projection

Keep the existing public UI compatibility fields at the response top level, but
make the immutable bundle the source of truth:

```ts
{
  screenKind: "public-matched-proof";
  queryKind: "receipt" | "intent" | "depositTx";
  receiptHash: string;
  intentHash: string;
  depositTxHash: string;
  ...
  bundle: PublicVerificationBundleV1;
}
```

Before returning success:

1. resolve stored bundle by exact hash;
2. resolve the existing run, decision, Receipt, and verifier input;
3. run the commercial Receipt gate;
4. replay the public bundle;
5. ensure all identities agree;
6. return 404 on any failure without disclosing which private record existed.

### Step 3: Add a public-RPC legacy backfill function

The backfill must process only already-Matched Receipts missing a bundle.

For each candidate:

- fetch deposit/approval transaction and Receipt snapshots through the existing
  standard RPC client;
- decode only approved event types;
- read the historical head block and confirmation depth from the persisted
  canonical verifier input; do not replace the verification-time snapshot with
  the RPC's current head or a larger current confirmation count;
- rebuild public proof material using the persisted Manifest, verifier input,
  decision, and Receipt;
- require exact equality with the already-persisted Intent, verifier-input,
  Receipt, block, deposit, and confirmation snapshot fields;
- save the bundle only when all comparisons and replay checks pass;
- record a bounded result code, never a raw RPC error or secret.

The backfill must never:

- create or update a decision;
- change a run status;
- reissue a Receipt;
- never use a signing private key;
- make a chain transaction.

### Step 4: Add an operator CLI

Add:

```json
"evidence:backfill": "node --experimental-strip-types scripts/backfill-public-evidence.mjs"
```

The CLI accepts an explicit local/external SQLite path and standard RPC URL
through the established secure environment mechanism. It prints only aggregate
counts:

- candidates;
- saved;
- already present;
- skipped integrity mismatch;
- failed bounded error.

Do not print hashes, wallet addresses, request bodies, headers, or environment
values.

### Step 5: Run focused tests

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/publicProofLookup.test.ts src/lib/live/publicEvidenceBackfill.test.ts src/lib/live/publicEvidenceBackfillScript.test.ts src/lib/live/liveApi.test.ts src/lib/live/liveRoutePolicy.test.ts
pnpm --filter @giwa/web typecheck
```

Expected: PASS.

---

## Task 4: Ship the independent replay CLI and downloadable JSON contract

**Files:**

- Create: `apps/web/scripts/replay-public-evidence.mjs`
- Create: `apps/web/src/lib/live/publicEvidenceReplayScript.test.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/src/lib/live/runtimeSourceImports.test.ts`

### Step 1: Write failing CLI contract tests

Test a valid fixture file and one tampered fixture file. Assert:

- valid bundle exits `0` and reports all checks passed;
- tampered bundle exits non-zero with only bounded failed check names;
- the script accepts a local JSON file and an HTTPS URL;
- response-size and request-time limits are enforced for remote input;
- output contains no full wallet, signature, environment, or header dump.

### Step 2: Implement the replay command

Add:

```json
"evidence:replay": "node --experimental-strip-types scripts/replay-public-evidence.mjs"
```

Usage:

```powershell
pnpm --filter @giwa/web evidence:replay -- .\downloaded-bundle.json
```

The CLI imports `publicVerificationReplay.ts` and must not connect to SQLite,
GIWA RPC, or any private API.

### Step 3: Add a stable JSON download response

`GET /api/public/evidence/:hash` remains cache-safe and public. Add response
metadata support so the live adapter can return:

- `Content-Type: application/json; charset=utf-8`;
- `Content-Disposition: attachment; filename="giwa-receipt-<hash>.json"` only
  when a bounded download query is explicitly requested;
- `Cache-Control: public, max-age=60, stale-while-revalidate=300` for immutable
  successful bundles;
- `Cache-Control: no-store` for errors.

Do not let arbitrary filenames or query parameters reach response headers.
Extend `LiveApiRequest` with one bounded download flag derived by
`serve-live.mjs` from `URL.searchParams`; do not pass the raw query string into
the API handler.

### Step 4: Test API and adapter headers

Assert success and error headers, filename normalization, stable JSON bytes, and
no header injection.

### Step 5: Run focused tests

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/publicEvidenceReplayScript.test.ts src/lib/live/liveApi.test.ts src/lib/live/runtimeSourceImports.test.ts
pnpm --filter @giwa/web typecheck
```

Expected: PASS.

---

## Task 5: Add Receipt and Proof Ledger verification-bundle UX

**Files:**

- Modify: `apps/web/public/flow.js`
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/src/lib/flow/publicEvidencePresentation.test.ts`
- Modify: `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`
- Modify: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`
- Modify: `apps/web/src/lib/userFlow/userReceiptView.test.ts`
- Modify: `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`

### Step 1: Write failing public presentation tests

Assert the public Receipt and Proof Ledger each expose:

- `검증 번들 JSON 받기`;
- an independent replay instruction using the package command;
- Manifest signature, recovered signer, verifier input, block snapshot, decoded
  logs, and Receipt hash sections;
- source `Live`, generated-at time, schema version, and verifier version;
- a clear GIWA Sepolia/mock-only notice;
- separate GIWA Explorer and JSON bundle destinations.

Also assert:

- buttons are unavailable, not fake-active, when no bundle exists;
- pending/mismatched/private records never show a bundle URL;
- the browser never receives or stores a run capability through public proof;
- long hashes wrap or scroll inside their own disclosure without page overflow.

### Step 2: Parse and validate the expanded public response

Expand the existing proof-response parser so it validates the complete bundle
shape and rejects:

- missing canonical payloads;
- identity disagreement;
- invalid timestamps or versions;
- decoded logs outside the allowlist;
- forbidden public keys.

Keep the UI fail-closed: malformed evidence renders `찾을 수 없거나 공개되지
않은 증거` rather than partial proof.

### Step 3: Add the bundle actions

On both public Receipt and Proof Ledger:

- use an `<a download>` link to the bounded download route;
- provide a copyable replay command;
- show a concise `6개 무결성 검사를 직접 재계산할 수 있습니다` explanation;
- keep the Matched badge separate from independent replay instructions;
- preserve existing Receipt/Campaign navigation.

### Step 4: Add progressive disclosure

Use existing disclosure patterns:

1. Manifest and signature;
2. verifier input;
3. decoded logs;
4. Receipt canonical payload;
5. replay instructions.

The default view should remain judge-readable and not dump raw JSON into the
page. JSON remains available by download.

### Step 5: Verify desktop and mobile layout

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/flow/publicEvidencePresentation.test.ts src/lib/flow/livePublicReceiptRoute.test.ts src/lib/userFlow/userPublicBoundary.test.ts src/lib/userFlow/userReceiptView.test.ts src/lib/partner/publicCampaignStudioPresentation.test.ts
```

Then inspect at:

- `390 × 844`;
- `1366 × 768`;
- `200%` browser zoom.

Expected: no horizontal page overflow, no clipped actions, and keyboard-visible
focus on every disclosure and link.

---

## Task 6: Publish a controlled negative control without leaking private runs

**Files:**

- Create: `apps/web/src/lib/live/publicNegativeControl.ts`
- Create: `apps/web/src/lib/live/publicNegativeControl.test.ts`
- Modify: `apps/web/src/lib/partner/publicCampaignStudio.ts`
- Modify: `apps/web/src/lib/partner/publicCampaignStudio.test.ts`
- Modify: `apps/web/public/flow.js`
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`
- Modify: `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`

### Step 1: Write failing negative-control boundary tests

The public projection must be exactly:

```ts
{
  label: "Recorded negative control";
  scenario: "TARGET_MISMATCH";
  scope: "controlled-demo-scenario";
  receiptIssued: false;
  publicReceiptAvailable: false;
  path: "/giwa-demo?example=mismatch";
}
```

Assert it contains no wallet, run ID, Intent hash, transaction hash, failure
trace, or participant capability.

### Step 2: Centralize the controlled scenario

Replace duplicated hard-coded negative-example copy with one public-safe
projection. It must explain:

- the Manifest expected one target;
- the controlled execution used another target;
- the verifier did not issue a Matched Receipt;
- exact-hash public Receipt lookup therefore remains unavailable.

The scenario is not a real asset loss or exploit-prevention claim.
Do not present a security guarantee, GIWA Dojang issuance, or settlement failure.

### Step 3: Surface it in Campaign and Proof Ledger

Add a visually secondary `불일치 대조 예시` card after positive Matched
evidence. Keep the primary judge path on the real Matched Receipt.

### Step 4: Run focused tests

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/publicNegativeControl.test.ts src/lib/partner/publicCampaignStudio.test.ts src/lib/userFlow/giwaDemoPresentation.test.ts src/lib/partner/publicCampaignStudioPresentation.test.ts
```

Expected: PASS.

---

## Task 7: Add privacy-safe campaign events and evidence metrics

**Files:**

- Create: `apps/web/src/lib/live/publicCampaignAnalytics.ts`
- Create: `apps/web/src/lib/live/publicCampaignAnalytics.test.ts`
- Modify: `apps/web/src/lib/live/liveTypes.ts`
- Modify: `apps/web/src/lib/live/liveStore.ts`
- Modify: `apps/web/src/lib/live/liveStore.test.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.test.ts`
- Modify: `apps/web/src/lib/live/liveRateLimit.ts`
- Modify: `apps/web/src/lib/live/liveRateLimit.test.ts`
- Modify: `apps/web/src/lib/live/liveRequestSafety.ts`
- Modify: `apps/web/src/lib/live/liveRequestSafety.test.ts`
- Modify: `apps/web/src/lib/partner/publicCampaignStudio.ts`
- Modify: `apps/web/src/lib/partner/publicCampaignStudio.test.ts`
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/flow.js`
- Modify: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`
- Modify: `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`

### Step 1: Write failing anonymous-event tests

Validate only:

```ts
type PublicCampaignEventInput = {
  eventType: "campaignVisited" | "walletConnected";
  anonymousSessionId: string;
  campaignId: "gasok-demo";
  missionId: "first-mock-vault-deposit";
};
```

Tests must prove:

- a UUID-shaped random identifier is accepted;
- unknown event types, campaign overrides, mission overrides, extra keys, large
  bodies, or malformed IDs are rejected;
- the persisted record contains only a SHA-256 session hash;
- the raw session ID, IP, user-agent, headers, and request ID are absent;
- duplicate event type + session + campaign + mission is idempotent;
- event collection remains bounded by the existing origin and rate-limit gates.

### Step 2: Add migration `007_public_campaign_events`

Create:

```sql
create table if not exists public_campaign_events (
  eventType text not null,
  sessionHash text not null,
  campaignId text not null,
  missionId text not null,
  recordedAt text not null,
  primary key (eventType, sessionHash, campaignId, missionId)
);
```

Add memory and SQLite store methods that save and aggregate bounded event types.
Do not expose raw event rows through a public endpoint.

### Step 3: Add public event ingestion

Add:

```text
POST /api/public/events
```

Return `202 { accepted: true }` for both a newly stored event and an idempotent
duplicate. Never reveal whether a session hash already existed.

The server handler must not pass request headers or selected client IP into the
analytics module. Existing IP use for in-memory abuse prevention remains
separate from persisted analytics.

### Step 4: Instrument the browser

In `user-flow.js`:

- create one random first-party anonymous session ID with
  `crypto.randomUUID()` and a bounded random-byte fallback;
- store it under a versioned local key;
- record `campaignVisited` once when the fixed mission becomes visible;
- record `walletConnected` after a successful GIWA Sepolia connection;
- use fire-and-forget delivery with no blocking of the participant journey;
- never include wallet address, run ID, capability, user-agent, referrer, or
  page URL in the event body.

### Step 5: Extend public Campaign metrics

Return:

- event capture status and generated-at time;
- unique campaign visitor count;
- unique wallet-connect session count;
- submitted deposit count;
- Matched Receipt count;
- Matched rate numerator, denominator, display rate, and definition;
- unique participant count;
- repeat activator count;
- repeat activation count;
- approval-required and approval-not-required branches;
- bounded mismatch reason counts.

Use the full gated Matched Receipt set for KPIs before applying any latest-20
display limit.

### Step 6: Render metric definitions

Campaign Studio must say exactly what is counted. Avoid generic labels such as
`conversion` without a numerator and denominator. Use `—` only when capture is
genuinely unavailable; use `0` for a captured zero.

### Step 7: Run focused tests

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/publicCampaignAnalytics.test.ts src/lib/live/liveStore.test.ts src/lib/live/liveSchemaMigrations.test.ts src/lib/live/liveApi.test.ts src/lib/live/liveRoutePolicy.test.ts src/lib/live/liveRateLimit.test.ts src/lib/partner/publicCampaignStudio.test.ts src/lib/userFlow/userPublicBoundary.test.ts src/lib/partner/publicCampaignStudioPresentation.test.ts
pnpm --filter @giwa/web typecheck
```

Expected: PASS.

---

## Task 8: Document the replay and migration operation

**Files:**

- Modify: `README.md`
- Create: `docs/implementation/giwa-public-verification-bundle.md`
- Modify: `docs/implementation/giwa-gasok-staging-runbook.md`
- Modify: `apps/web/scripts/smoke-staging.mjs`
- Modify: `apps/web/src/lib/live/stagingSmokeScript.test.ts`
- Modify: `apps/web/src/lib/live/stagingParticipantFlow.test.ts`

### Step 1: Write the public verification guide

Document:

1. search by Receipt, Intent, or deposit transaction hash;
2. download the JSON bundle;
3. run the replay command;
4. interpret the six checks;
5. distinguish Standard RPC block evidence from GIWA finality or settlement;
6. understand the controlled negative example;
7. understand exactly which campaign metric denominator is used.

Use no secret values or private runtime paths.

### Step 2: Add deployment-gated migration steps

The runbook must separate:

1. local schema/test verification;
2. remote backup;
3. application/schema rollout;
4. read-only readiness check;
5. public evidence backfill;
6. exact-hash bundle smoke;
7. rollback to the previous release while preserving the additive database
   tables.

Make explicit that this plan does not authorize deployment or remote backfill.

### Step 3: Extend staging smoke source

After a separately approved deployment, smoke must verify:

- one known exact hash returns a replayable bundle;
- all three hash forms resolve the same Receipt identity;
- download headers are safe;
- Campaign Studio exposes source, time, numerator, denominator, unique
  participants, and repeat activations;
- a random unknown hash returns the bounded 404;
- no capability/session canary appears.

The smoke must not create a run, connect a wallet, submit a transaction, or
write an analytics event unless separately authorized.

### Step 4: Run documentation and source-contract tests

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/stagingSmokeScript.test.ts src/lib/live/stagingParticipantFlow.test.ts
```

Expected: PASS.

---

## Task 9: Run the Release 2 verification gate

**Files:**

- Inspect: all Release 2 changed files
- Inspect: `docs/superpowers/specs/2026-07-31-giwa-full-platform-evolution-design.md`
- Inspect: `docs/superpowers/plans/2026-07-31-giwa-release-2-public-verifiability.md`
- Create or update: `.superpowers/sdd/release2-command-report.md`
- Create or update: `.superpowers/sdd/release2-browser-report.md`
- Create or update: `.superpowers/sdd/progress.md`

### Step 1: Run focused Release 2 suites

Run every test file named in Tasks 1–8 together. Record file/test counts and any
pre-existing runtime warnings.

### Step 2: Run package and workspace gates

```powershell
pnpm --filter @giwa/web test
pnpm --filter @giwa/protocol test
pnpm --filter @giwa/contracts test
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Expected: PASS. Do not claim completion if a Release 2-caused failure remains.

### Step 3: Run local live integration

Use an isolated temporary SQLite database and existing mock/local live mode.
Verify:

- schema migrations `006` and `007` are ready;
- one Matched fixture persists a bundle atomically;
- Receipt, Intent, and deposit hashes return the same bundle;
- the replay CLI passes using the downloaded JSON;
- event ingestion stores only a session hash;
- Campaign Studio counts and definitions agree with stored data;
- malformed/private inputs fail closed.

Remove only the exact temporary files created by this verification after
confirming their resolved paths are inside the workspace's ignored local data
directory.

### Step 4: Run browser QA

Inspect:

- `/user/receipt/<known-receipt-hash>`;
- `/receipt/<known-receipt-hash>`;
- `/evidence?proof=<receipt-hash>`;
- `/partner?receipt=<receipt-hash>`;
- `/giwa-demo?example=mismatch`.

At `390 × 844` and `1366 × 768`, confirm:

- JSON download action is visible and works;
- replay instructions are readable;
- canonical data disclosures do not overflow;
- Campaign metrics include definitions;
- negative control is clearly secondary and never shows a Receipt;
- keyboard focus and reduced-motion behavior remain intact.

### Step 5: Run privacy and authority scan

Search public API fixtures, built public files, and bundle snapshots for:

```text
runCapability
capabilityHash
runId
sessionId
sessionHash
partner token
privateKey
CAMPAIGN_SIGNER_PRIVATE_KEY
request headers
raw user-agent
raw IP
```

`sessionHash` may exist only in private store tests/implementation, never in a
public response or generated public artifact.

### Step 6: Inspect the final diff

Confirm:

- no unrelated user changes were reverted;
- generated files were changed only through their owning command;
- no secret or ignored runtime database was added;
- Release 3 visual-system work and Release 4 multi-tenant auth work did not
  leak into this release;
- no deployment, Git publication, or chain mutation occurred.

### Step 7: Request final code review

Review in this order:

1. public authority/capability boundary;
2. bundle replay correctness;
3. SQLite atomicity and migration behavior;
4. analytics privacy and denominator correctness;
5. UI failure states and accessibility;
6. documentation and operational safety.

Fix every Critical or Important finding with a new failing regression test, then
rerun the affected focused tests and Steps 2–5.

---

## Release 2 completion criteria

Release 2 may be reported locally complete only when:

1. a newly Matched Receipt persists one immutable public bundle;
2. Receipt, Intent, and deposit transaction hashes resolve the same bundle;
3. a third party can download JSON and replay all hashes/signature without
   SQLite, RPC, private API, or server capability;
4. decoded public-safe logs and the verification-time block snapshot are present;
5. public responses contain no participant, partner, session, or operator
   authority;
6. the controlled negative case clearly shows that no Matched Receipt exists;
7. Campaign Studio exposes live source, generated-at time, explicit rate
   denominator, unique participants, and repeat activations;
8. campaign visit and wallet-connect analytics persist no raw session ID, IP, or
   user-agent;
9. existing Matched Receipts have a safe, separately gated backfill path;
10. focused tests, package tests, workspace tests, typecheck, build, browser QA,
    privacy scan, and final review pass.

Deployment remains a separate user approval gate.

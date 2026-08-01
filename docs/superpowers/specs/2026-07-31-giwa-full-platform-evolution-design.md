# GIWA Verified Intent Rail Full Platform Evolution

## Status

Approved by the user on 2026-07-31.

This document is the master design for correcting the current GASOK demo and
extending it through the previously deferred P3 platform scope. It authorizes
local implementation planning after review. It does not authorize Git
publication, deployment, cloud mutations, contract deployment, or chain
transactions.

## Decision

Evolve the existing product in five independently testable releases:

```text
Release 1 — Trust and data integrity
Release 2 — Public verifiability and partner evidence
Release 3 — Product design and responsive accessibility
Release 4 — Multi-tenant participation platform
Release 5 — GIWA Sepolia Receipt anchoring
```

The implementation extends the current participant, verifier, Receipt, and
public-proof system instead of replacing it. Each release gets its own
implementation plan and verification gate. A later release must not weaken a
completed earlier release.

## Product Positioning

GIWA Verified Intent Rail is not a small DEX, settlement layer, security
guarantee, identity service, RWA issuer, or yield product.

Its product claim is:

> A campaign signs the exact testnet action it permits, a participant executes
> from their own wallet, the verifier compares standard RPC transaction
> evidence and logs, and one canonical Receipt identity connects the
> participant result, partner reporting, and public proof.

The core continuity is:

```text
Signed conditions
→ participant wallet execution
→ standard RPC and log comparison
→ canonical Matched Receipt
→ participant / campaign / public-proof views
→ optional GIWA Sepolia Receipt hash anchor
```

The product remains GIWA Sepolia testnet-only. Mock assets have no real value,
yield, settlement, RWA, KYC, identity, or security meaning.

## Global Constraints

- Use `GIWA Verified Intent Rail` publicly.
- Preserve all valid historical Manifest and Receipt hashes.
- Never reinterpret Flashblocks feedback as finality or settlement.
- Public proof must not expose run capabilities, session tokens, private
  runtime data, raw internal errors, signing keys, or environment values.
- Public routes remain usable without authentication where explicitly defined.
- Partner mutations require a valid wallet-authenticated organization session.
- Published campaign versions are immutable.
- Only server-defined action templates may be published.
- A Receipt is issued only after the existing verifier and commercial Receipt
  gate succeed.
- On-chain anchoring is asynchronous evidence and never changes a previously
  valid Receipt decision.
- Do not add mainnet, real assets, real rewards, yield, RWA issuance,
  settlement, KYC, identity, or security guarantees.
- Deployment, DNS, cloud resources, Git publication, contract deployment, and
  chain transactions remain separate approval gates.

## Release Decomposition

### Release 1 — Trust and Data Integrity

Correct the misleading or internally inconsistent behavior already present in
the deployed product.

Deliverables:

1. Replace the pre-execution `검증 완료` badge with the neutral
   `발급 조건 · 4/4 일치 필요` state.
2. Distinguish a newly issued Receipt from an older selected Receipt in
   Campaign Studio.
3. Show a top-level Campaign handoff summary before focusing the selected
   ledger row.
4. Make `Proof Ledger에서 공개 검증` navigate to
   `/evidence?hash=<receiptHash>`, while public Receipt detail remains a
   separately named action.
5. Represent approval submission, approval confirmation, and
   approval-not-required as valid branch outcomes instead of a non-monotonic
   funnel.
6. Use a stable run or deposit identity when promoting a local pending Receipt
   history entry to verified.
7. Label confirmation depth as a verification-time snapshot.
8. Remove an empty decoded-log panel or populate it with actual public-safe log
   summaries.
9. Separate malformed hashes from the fail-closed public
   `not found or not public` state. A participant-authorized recovery view may
   distinguish its own pending evidence without changing the public boundary.
10. Distinguish missing wallet provider, rejected request, wrong network, and
    retryable wallet errors.

Release 1 must not change Manifest, verifier, Receipt, contract, or valid API
semantics beyond the explicitly listed public presentation and stable-history
identity fixes.

### Release 2 — Public Verifiability and Partner Evidence

Turn “publicly verifiable” into a reproducible capability rather than a UI
label.

Deliverables:

1. A public-safe verification bundle containing:
   - canonical Manifest JSON;
   - Manifest signature;
   - signing domain and chain ID;
   - verifying contract;
   - recovered campaign signer;
   - canonical verifier input payload and bytes;
   - deposit transaction hash;
   - verification block number and block hash;
   - verification-time confirmation snapshot;
   - decoded public-safe Approval, Transfer, MockDeposit, or transfer logs;
   - canonical Receipt JSON and bytes;
   - Receipt hash;
   - verifier and schema versions;
   - testnet and mock-asset notice.
2. Bundle lookup by Receipt, Intent, or deposit transaction hash.
3. JSON download from the public Receipt and Proof Ledger.
4. A replay utility that recomputes Manifest, verifier-input, and Receipt
   hashes without private runtime state.
5. A clearly labeled `Recorded negative control` that explains one mismatch
   and confirms that no Matched Receipt is public.
6. Live source, generated-at time, denominator definition, unique participant,
   and repeat activation metrics in the public campaign evidence view.
7. Privacy-safe campaign visit and wallet-connect collection without storing
   raw IP addresses or raw user-agent strings.

The public bundle exposes proof material, not server authority. It must not
include run capabilities, session identifiers, private error traces, database
keys, or signing secrets.

### Release 3 — Product Design and Responsive Accessibility

Apply one shared `GIWA Protocol Dossier` system to the public participant,
Receipt, Campaign, and Proof surfaces.

#### Shared shell

- Official GIWA mark when an approved source asset is available.
- Product name and GIWA Sepolia testnet state.
- A semantic read-only three-step progression:
  `조건 확인 → 지갑 실행 → 결과 공개`.
- A real wallet control or a visually distinct non-interactive connection
  status.
- `내 Receipt`, public proof, and authenticated Studio destinations.
- Pills limited to compact status and network labels.

#### Mission

- One outcome headline.
- One mission cockpit.
- Neutral expected Receipt state before execution.
- Primary action visible without scrolling at `1366 × 768`.
- Testnet and mock-asset limits inside the first viewport.

#### Execution

- One stable workspace joining signed conditions and observed wallet execution.
- Explicit approval-required or approval-not-required branch.
- Pending, matched, and mismatched states use text, icon, and color.
- Technical hashes remain progressively disclosed.
- Live-region updates do not move keyboard focus unnecessarily.

#### Receipt

- External heading uses `Matched Receipt` and serial identity.
- The success sentence appears once inside the artifact.
- `4/4`, verification snapshot, block, Manifest, and seal form the acquisition
  moment.
- Campaign and Proof actions appear in the first meaningful action group.
- Evidence disclosures have a visible chevron, focus surface, and expanded
  state.
- Receipt reveal motion completes within `320–360ms`.

#### Campaign and Proof

- Campaign query handoff first explains how the selected Receipt contributes
  to live evidence, then links to the ledger row.
- Proof first explains the verification chain, then exposes raw hashes.
- Exact lookup, bundle download, Explorer, participant Receipt, and public
  Receipt actions use consistent action hierarchy.

#### Responsive and accessibility requirements

- No horizontal page overflow at `320px`.
- At `360px` and below, routes and utilities use one column.
- Important body copy is `16px`; supporting copy is never below `12px`.
- Interactive targets are at least `44px`.
- `focus-visible` is clearly perceptible.
- Hashes truncate visually but have an accessible full-value disclosure.
- `200%` zoom reflows without clipping.
- `prefers-reduced-motion` renders stable terminal states immediately.
- Pretendard subsets are self-hosted with preload and `font-display: swap`.
- Icons come from one approved line-icon family; no emoji, text symbols,
  CSS drawings, or handcrafted approximate brand marks.

### Release 4 — Multi-Tenant Participation Platform

Add wallet-authenticated partner operations while preserving public evaluator
routes.

#### Route boundary

```text
/user               public participant journey
/user/receipts      wallet-linked participant Receipt case
/partner            public-safe campaign evidence board
/receipt/:hash      public technical Receipt
/evidence           public Proof Ledger
/studio             authenticated partner application
```

Public routes do not require organization membership. `/studio` and every
partner mutation require an authenticated organization session.

#### Wallet authentication

Use an application-defined EIP-191 personal-sign challenge rather than claiming
full SIWE compatibility.

Challenge properties:

- exact HTTPS domain and URI;
- GIWA Sepolia chain ID `91342`;
- random one-time nonce;
- issued-at and five-minute expiration;
- human-readable statement;
- expected wallet address when supplied.

Authentication endpoints:

```text
POST /api/auth/challenge
POST /api/auth/verify
POST /api/auth/logout
GET  /api/auth/session
```

Rules:

- Nonces are single-use and stored hashed.
- Signature verification recovers the wallet address.
- Sessions expire after eight hours.
- The browser receives a `Secure`, `HttpOnly`, `SameSite=Lax` cookie.
- Only a session-token hash is stored.
- State-changing requests verify same-origin and reject missing or invalid
  session context.
- Logout invalidates the server session before clearing the cookie.
- Authentication errors never disclose whether an unrelated wallet belongs to
  another organization.

#### Organization roles

```text
Owner  — organization and member management, publish, anchor configuration
Editor — create and edit drafts, inspect runs and analytics
Viewer — read campaigns, Receipts, and analytics
```

Only Owners may publish a campaign version, change membership, or configure
the anchor operator. An organization must always retain at least one Owner.

#### Tenant storage

Extend the existing SQLite store with explicit organization boundaries and a
repository interface that can later be implemented with PostgreSQL.

Core records:

```text
organizations
organization_members
auth_nonces
auth_sessions
campaigns
campaign_versions
mission_definitions
participant_events
receipt_anchors
```

Every non-public partner query requires an organization ID derived from the
verified session. Caller-supplied organization IDs never establish access.
Foreign keys, uniqueness constraints, and repository filters enforce tenant
isolation.

Existing GASOK live data is assigned to one explicit default organization
during a transactional migration. Migration never copies local ignored
runtime evidence into public artifacts.

#### Campaign lifecycle

```text
Draft
→ Published Version 1
→ New Draft from Version 1
→ Published Version 2
```

- Drafts are mutable by Owners and Editors.
- Published versions are immutable.
- Only Owners publish.
- Publishing records a canonical campaign-version hash.
- Runs and Receipts retain the exact published version identity.
- A new version never changes historical runs or Receipts.
- Deleting a published version is not supported.

#### Action templates

Campaign authors select server-defined templates. Arbitrary target, selector,
calldata, verifier rule, or asset input is not accepted.

Initial templates:

1. `mockVaultDeposit`
   - existing exact Mock Token approval and Mock Vault deposit;
   - approval required only when current allowance is insufficient;
   - existing valid Manifest and Receipt schema remains supported.
2. `mockTokenTransfer`
   - exact transfer of `1 Mock Token` to the published campaign target;
   - no approval transaction;
   - verifier checks sender, recipient, asset, amount, transaction status,
     Transfer log, block evidence, and confirmations.

Manifest schema version 2 retains the shared condition fields and represents
no-approval actions with the zero-address spender and
`maxAllowanceBaseUnits = "0"`. The action-template verifier owns the semantic
interpretation. Version 1 deposit Manifests and Receipts remain valid and
unchanged.

#### Wallet-linked Receipt case

Authenticated wallet sessions may retrieve public-safe Receipts issued to the
same recovered wallet. This replaces browser-local history as the authoritative
Receipt case while retaining local history only as a temporary convenience and
recovery cache.

No wallet may query another wallet's non-public pending or failed runs.
Public Matched Receipts remain available through the bounded public campaign
evidence view and their exact public hash routes.

#### Analytics

Organization-scoped analytics include:

- unique participant wallets;
- repeat activations;
- submitted, matched, and mismatched runs;
- matched rate with explicit denominator;
- approval-required and approval-not-required paths;
- mismatch reasons;
- mission conversion;
- Receipt trend by bounded time period.

Campaign visits use a random first-party anonymous session identifier. Raw IP
address and raw user-agent values are not stored.

### Release 5 — GIWA Sepolia Receipt Anchoring

Add an append-only minimum-data Receipt registry on GIWA Sepolia.

#### Contract

Create `ReceiptAnchorRegistry.sol` with:

```solidity
struct ReceiptAnchor {
    bytes32 intentHash;
    bytes32 campaignVersionHash;
    uint64 anchoredAt;
}

mapping(bytes32 receiptHash => ReceiptAnchor) public anchors;

event ReceiptAnchored(
    bytes32 indexed receiptHash,
    bytes32 indexed intentHash,
    bytes32 indexed campaignVersionHash,
    uint64 anchoredAt
);
```

The contract exposes:

```solidity
function anchorReceipt(
    bytes32 receiptHash,
    bytes32 intentHash,
    bytes32 campaignVersionHash
) external;
```

Rules:

- Only the configured anchor operator may call `anchorReceipt`.
- Zero hashes are rejected.
- A Receipt hash may be anchored exactly once.
- Anchors are never updated or deleted.
- Wallet address, Manifest JSON, Receipt JSON, signatures, and private
  metadata are not stored.
- Operator changes use an explicit owner-controlled method and event.

#### Anchor lifecycle

```text
Receipt issued
→ anchor pending
→ transaction submitted
→ standard RPC receipt confirmed
→ anchored
```

Anchoring runs asynchronously after Receipt issuance. The persisted record
contains:

- receipt hash;
- intent hash;
- campaign version hash;
- safe status;
- transaction hash;
- confirmed block number and block hash;
- attempt count;
- next retry time;
- bounded public-safe failure code.

Retry timing is `10s`, `30s`, `2m`, then `10m`. Retries reuse the same
idempotency key. A duplicate on-chain anchor is treated as terminal success
only after the stored contract values exactly match.

Anchor failure never changes a Matched decision or invalidates a Receipt. The
public Receipt shows `Anchor pending`, `Anchored`, or a retryable unavailable
state without implying GIWA issuance, finality, or settlement.

Contract deployment, operator funding, registry configuration, and the first
chain transaction require a separate runbook and explicit user approval.

## Shared Data Flow

```text
Public participant selects a published mission
→ server resolves immutable campaign version
→ server signs Manifest for wallet and exact action template
→ participant wallet executes on GIWA Sepolia
→ participant submits transaction evidence with run capability
→ action-template verifier reads standard RPC transaction, receipt, and logs
→ commercial Receipt gate recomputes all canonical hashes
→ Matched Receipt is persisted and exposed by exact public hash
→ participant, campaign, and public proof resolve the same Receipt identity
→ public verification bundle can replay the proof
→ anchor worker optionally records the minimum Receipt hash tuple on GIWA Sepolia
```

Partner sessions do not participate in participant run authorization.
Participant run capabilities do not authorize Studio mutations.

## Error and Recovery Model

| Condition | Public behavior | Recovery |
|---|---|---|
| Wallet provider absent | Explain that no wallet provider is available | Open supported-wallet guidance |
| Signature rejected | Preserve current screen and explain rejection | Request signature again |
| Wrong network | Show expected and current chain | Switch or add GIWA Sepolia |
| Gas insufficient | Do not submit action | Open official faucet guidance |
| Mock Token insufficient | Do not submit action | Use existing mock-token preparation flow |
| Transaction reverted | Show Explorer status | Start a new run after reviewing reason |
| Verifier timeout | Keep transaction evidence | Retry verification only |
| Proven mismatch | Show field and safe failure reason | Start a new Manifest; never issue Receipt |
| Malformed proof hash | Explain required hash format | Correct input |
| Public proof absent | Use one fail-closed `not found or not public` state | Check another exact hash |
| Participant-owned evidence not public | Only an authorized participant recovery view may show its own pending state | Wait or use participant recovery |
| Session expired | Do not lose drafts | Re-authenticate wallet |
| Role forbidden | Do not reveal target resource | Request organization Owner access |
| Publish conflict | Preserve draft | Refresh latest campaign version |
| Anchor delayed | Keep Receipt valid | Background retry |
| Anchor reverted | Keep Receipt valid and safe failure code | Retry with same idempotency key |

Distinct failures must not collapse into an ambiguous generic error when a safe
next action is known.

## Security Boundaries

- Never trust organization, role, wallet, campaign version, target, selector,
  asset, or verifier policy from the browser without server-side resolution.
- Never accept arbitrary calldata from Campaign Studio.
- Verify challenge domain, URI, nonce, expiry, chain ID, and recovered address.
- Reject nonce replay and session fixation.
- Hash session tokens and authentication nonces at rest.
- Apply tenant scope before resource lookup to avoid cross-tenant existence
  leaks.
- Use transactional migrations and uniqueness constraints for membership,
  published versions, Receipt anchors, and idempotency keys.
- Keep public error responses bounded and capability-free.
- Never log signatures, session cookies, capabilities, private keys, or
  environment contents.
- Public verification bundles contain proof material but no authority-bearing
  capability.

## Test Strategy

Every behavior change follows RED → GREEN → REFACTOR.

### Release 1

- Presentation regression tests for pre-execution state and destination labels.
- Campaign highlight tests for newest and historical Receipts.
- Funnel tests for required, skipped, submitted, and confirmed approval paths.
- Stable Receipt history promotion tests.
- Proof error-state tests.
- Wallet error projection tests.

### Release 2

- Canonical bundle fixture tests.
- Manifest signature recovery tests.
- Public-boundary tests preventing capability and session disclosure.
- Replay tests from only public bundle fields.
- Receipt, Intent, and deposit hash lookup equivalence tests.
- Negative-control visibility tests.
- Analytics denominator and unique/repeat tests.

### Release 3

- Source-contract presentation tests.
- Browser checks at `320 × 720`, `390 × 844`, `1366 × 768`, and
  `1440 × 1024`.
- Keyboard order and focus-visible checks.
- `200%` zoom reflow inspection.
- Reduced-motion terminal-state checks.
- No-horizontal-overflow assertions.

### Release 4

- Challenge expiration, domain, nonce replay, wrong wallet, and wrong-chain
  authentication tests.
- Session creation, expiry, logout, and token-hash tests.
- Owner, Editor, Viewer authorization matrix tests.
- Cross-tenant read and mutation denial tests.
- Transactional SQLite migration and rollback tests.
- Published-version immutability and new-version tests.
- Action-template allowlist and arbitrary-calldata rejection tests.
- Mock transfer transaction construction and verifier tests.
- Wallet-linked Receipt ownership and public-boundary tests.
- Unique/repeat and time-bucket analytics tests.

### Release 5

- Contract owner/operator and zero-hash tests.
- Duplicate-anchor and immutable-anchor tests.
- Event and mapping consistency tests.
- Worker idempotency, retry, restart, and reconciliation tests.
- Public anchor-status projection tests.
- Local integration from Matched Receipt to anchored registry state.

### Full verification gate

Before any release is declared complete:

```text
focused tests
→ affected package tests
→ pnpm typecheck
→ pnpm test
→ pnpm build
→ local live smoke
→ responsive browser QA when UI changed
→ staging smoke only after separate deployment approval
```

## Acceptance Criteria

The master scope is complete only when:

1. pre-execution and post-verification states cannot be confused;
2. Campaign counts, branches, timestamps, and selected-Receipt copy are
   internally consistent;
3. one exact Receipt identity connects participant, partner, public proof, and
   downloadable verification bundle;
4. a third party can replay public hashes without private server state;
5. public, participant-capability, partner-session, and anchor-operator
   authorities remain separate;
6. organization roles and tenant isolation pass adversarial tests;
7. a published campaign version cannot be mutated;
8. both Mock Vault Deposit and Verified Mock Transfer work on GIWA Sepolia
   testnet with action-specific verification;
9. wallet-linked Receipt history does not depend on one browser's localStorage;
10. Campaign Studio provides real draft, publish, version, member, and analytics
    operations;
11. the public product reflows at `320px` and `200%` zoom without clipping;
12. a Matched Receipt may progress independently from `Anchor pending` to
    `Anchored`;
13. the registry stores no raw wallet, Manifest, Receipt, or signature data;
14. no public copy implies real funds, rewards, yield, RWA issuance, KYC,
    identity, settlement, security guarantee, finality, or GIWA Dojang
    issuance; and
15. every release has fresh test, typecheck, build, and risk-appropriate
    integration evidence.

## Implementation Sequencing

This master design is intentionally decomposed. Implementation must proceed as:

1. write and approve the Release 1 implementation plan;
2. implement and verify Release 1;
3. review the shipped local diff;
4. write and approve the Release 2 implementation plan;
5. repeat through Release 5.

Do not write one monolithic plan or combine unfinished releases into one
deployment. Git commits, if later authorized, should follow the same release
boundaries.

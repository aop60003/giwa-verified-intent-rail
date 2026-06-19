# GIWA Commercial Readiness Design

## Purpose

Sprint 0 through Sprint 12 proved that `GIWA Verified Intent Rail` can run a GIWA Sepolia testnet mock vault flow, collect public transaction evidence, run a local verifier, and unlock a dynamic receipt after a matched decision.

This document defines the next product step: move from a local live MVP into a commercial-readiness foundation for a paid partner pilot.

The next target is not a self-serve SaaS dashboard. The next target is a narrow, repeatable partner pilot:

```text
one partner campaign
-> one GIWA Sepolia mock vault mission
-> wallet-owned approve/deposit
-> standard RPC verification
-> matched-only receipt
-> partner-readable evidence packet
```

## Source Context

- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-17-giwa-live-mvp-architecture-cutover-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`
- `docs/evidence/live-demo-sprint12-snapshot.schema.md`
- `apps/web/src/lib/live`
- `apps/web/src/lib/verifier`
- `apps/web/scripts/serve-live.mjs`

Official network references checked for the commercial boundary:

- GIWA Sepolia chain information: https://docs.giwa.io/get-started/connect-to-giwa
- GIWA node operation guidance: https://docs.giwa.io/node-operators/get-started
- GIWA Flashblocks reference: https://docs.giwa.io/giwa-chain/en/network-information/flashblocks

These references keep the commercial path scoped to GIWA Sepolia testnet and reinforce that public RPC endpoints are not a production-grade infrastructure plan.

## Design Decision

Use a staged commercial-readiness approach.

### Option A: Paid Partner Evidence Pilot

Package the current product as a managed pilot for one GIWA ecosystem partner campaign.

Pros:

- fits the current single-flow MVP
- avoids premature platform scope
- lets the product sell evidence quality rather than broad analytics
- keeps the demo testnet-only and partner-readable
- provides a concrete buyer and success metric

Cons:

- less scalable than self-serve
- requires manual operator support
- needs clear partner intake and closeout docs

Recommendation: use this option.

### Option B: Self-Serve Quest or Dashboard Product

Turn the app into a broader campaign dashboard or quest platform.

Pros:

- easier for users to recognize
- broader feature surface

Cons:

- invites direct comparison with established quest tools
- weakens the manifest-matched evidence distinction
- expands scope before commercial trust boundaries are stable
- risks unsafe copy and unsupported claims

Do not use this as the next step.

### Option C: Hosted Commercial Service Immediately

Open the live API to external partner traffic before adding auth, tenant isolation, rate limiting, durable storage, and observability.

Pros:

- closer to a public beta

Cons:

- current API is local-first and unauthenticated
- current SQLite store is local rehearsal storage
- current verifier runs inline in the request path
- current partner endpoint is not tenant-scoped

Do not use this until the Sprint 13 and Sprint 14 gates are satisfied.

## Commercial Wedge

`GIWA Verified Intent Rail` should be positioned as a partner activation evidence pilot.

Recommended wedge:

```text
For one GIWA ecosystem partner campaign, prove that campaign traffic can become a manifest-matched GIWA Sepolia testnet action with receipt-grade evidence.
```

The buyer is a GIWA ecosystem team, partner dApp, or campaign operator that needs proof beyond clicks, quest checkmarks, and wallet connection counts.

The user job is to complete one confusing first GIWA Sepolia mock vault action with a clear intent preview, wallet-owned execution, and a receipt after verifier match.

The partner job is to answer:

```text
Which users completed the specific manifest-covered GIWA Sepolia testnet action, and what evidence can we show?
```

## Paid Pilot Package

Package name:

```text
Manifest-Matched Activation Evidence Pilot
```

Scope:

- one partner
- one campaign
- one mission
- one flagship action: `First Mock Vault Deposit on GIWA Sepolia`
- one mock token
- one mock vault
- one manifest schema
- one receipt schema
- one partner evidence packet

Pilot deliverables:

- campaign entry spec: `campaignId`, `missionId`, optional referral, QR, and link metadata
- action manifest config: target, selector, asset, amount, spender, max allowance, expiry
- user-facing flow: wallet readiness, GIWA Sepolia chain check, intent preview, approve/deposit, status ladder
- evidence output: `intentHash`, `depositTxHash`, verifier status, and `receiptHash` for matched runs only
- partner output: funnel counts, matched transaction rate, mock testnet deposit metrics, receipt links, and exported public snapshot
- closeout readout: conversion summary, failure points, evidence quality, and recommendation for a second pilot

Commercial model:

- fixed-fee pilot package
- no TVL fee
- no yield share
- no settlement fee
- no production transaction claim
- pricing based on configuration, rehearsal, evidence review, partner readout, and safe copy alignment

Default pilot window:

```text
2-4 weeks: kickoff, dry run, live testnet window, closeout.
```

## Success Metrics

Activation funnel:

- campaign entry opened
- wallet connected
- GIWA Sepolia readiness passed
- intent preview viewed
- manifest accepted
- approve submitted when required
- deposit submitted
- standard RPC block confirmation observed
- verifier decision reached
- receipt issued only when status is `matched`

Evidence quality:

- successful receipts include chain id `91342`, `intentHash`, `depositTxHash`, block evidence, verifier status, and `receiptHash`
- no receipt opens before verifier status is `matched`
- Flashblocks is never used as final confirmation
- public artifacts contain no private keys, mnemonics, bearer tokens, API credentials, auth headers, or tokenized RPC URLs

Commercial learning:

- partner understands the difference between participation and manifest-matched testnet action evidence
- partner can use the pilot readout in an internal campaign review
- partner requests a second action template, export, or repeat campaign without asking for out-of-scope claims

## Non-Goals

The commercial-readiness path must not become:

- a quest marketplace
- a dashboard-first analytics product
- a wallet firewall
- a phishing-prevention product
- a KYC, compliance, eligibility, or identity decision product
- a production asset product
- a production yield product
- a settlement rail
- a mainnet launch
- a self-serve billing system
- a server-side wallet custody or user transaction signing flow

`verifiedState` remains read-only context where available. The guest path remains open.

## Global Stop Conditions

Stop the pilot, implementation, or demo if any condition appears:

- a partner requires mainnet, production funds, production yield, asset issuance, settlement, KYC, or security-guarantee positioning
- Flashblocks is described as final confirmation
- receipt UI or partner reporting shows success before verifier status is `matched`
- scope expands beyond one campaign, one mission, and one mock vault action
- any workflow asks for a user private key, mnemonic, bearer token, or secret value
- `.env` or `.env.local` content must be read, copied, printed, or placed in public evidence
- `verifiedState` is used as a gate, KYC result, eligibility result, or identity decision
- partner metrics are interpreted as TVL, production deposit volume, yield, or settlement
- public hosting is attempted before auth, tenant isolation, request limits, rate limiting, and redaction gates exist

## Commercial Receipt Trust Boundary

A commercial receipt is not a payment receipt or a settlement proof. It is ProofKPI evidence that a GIWA Sepolia testnet mock vault action matched the signed manifest.

| Surface | Trust level | Rule |
|---|---:|---|
| Browser wallet state, request body, tx hashes | untrusted input | Not sufficient for receipt unlock until the verifier re-reads evidence through standard RPC. |
| Flashblocks observation | non-final feedback | UI fast feedback only. It is not verifier input and does not count as final confirmation. |
| Server-issued manifest | trusted only after verification | Recompute canonical manifest hash, recover EIP-712 signer, and check deployed rail domain. |
| Standard RPC snapshot | verifier evidence source | Collect chain id, tx, receipt, head block, confirmation depth, and logs with timeouts. |
| Live store decision | commercial gate source | Terminal matched decision and receipt record must cross-check. |
| Partner summary and snapshot | derived output | Include only commercial-gate-passed matched receipts. |

## Commercial Receipt Gate

The receipt gate opens only when all rules pass:

1. `run.status === "matched"`.
2. A terminal decision exists for `intentHash`.
3. `decision.decision === "matched"`.
4. `decision.failureReason === null`.
5. `decision.receiptHash` is non-null.
6. `decision.receiptHash === receipt.receiptHash`.
7. `receipt.intentHash === decision.intentHash`.
8. Receipt payload JSON parses.
9. Receipt canonical payload and bytes recompute.
10. `computeReceiptHash(payload) === receiptHash`.
11. `verifierInputHash` recomputes from the exported verifier input or stored canonical verifier payload.
12. Standard RPC receipt status is success.
13. Confirmation depth meets the configured threshold.
14. Manifest signer recovers to the configured campaign signer for the deployed rail domain.
15. The receipt, partner output, and snapshot contain no secret-like material.

The gate stays closed for:

- `created`
- `walletConnected`
- `wrongChain`
- `manifestIssued`
- `manifestInvalidated`
- `intentSubmitted`
- `approveRequired`
- `approveSubmitted`
- `approveConfirmed`
- `depositReady`
- `depositSubmitted`
- `depositConfirmed`
- `verifierChecking`
- `timeout`
- `mismatched`
- `failed`

`timeout` is non-terminal and off-chain only. It must not produce a receipt, partner matched count, snapshot export, or `IntentFailed`.

## Verifier Pipeline

The commercial verifier pipeline should run in this order:

1. Load trust policy: chain id `91342`, campaign signer, `IntentRail`, intent submitter policy, verifier operator policy, minimum confirmations, expected token and vault.
2. Load run and submitted transaction evidence.
3. Reject missing run, missing `depositTxHash`, invalidated manifest, malformed tx hashes, duplicate `depositTxHash`, or wrong chain request.
4. Parse and normalize `manifestJson`.
5. Recompute `intentHash` from the normalized manifest and compare it with stored run `intentHash`.
6. Recover EIP-712 manifest signer using the deployed `IntentRail` verifying contract.
7. Fetch standard RPC chain id and require `91342`.
8. Fetch deposit transaction, deposit receipt, head block, and block data with timeouts.
9. Fetch approve receipt when `approveTxHash` is present.
10. Compute confirmation depth from standard RPC data.
11. Decode calldata and logs from raw receipts, not from caller-provided decoded JSON.
12. Bind every required log to the expected contract address and tx receipt.
13. Match wallet, target, selector, asset, amount policy, spender, allowance policy, expiry, status, block hash, and block number.
14. Classify as `matched`, `mismatched`, `failed`, or `timeout`.
15. Build canonical verifier input and compute `verifierInputHash`.
16. Build a receipt only for `matched`.
17. Persist receipt and matched decision atomically.
18. Return frozen terminal decisions for repeated verification of the same `intentHash`.
19. Publish receipt API, partner summary, and snapshot only through the commercial receipt gate.

## On-Chain Anchor Decision

Sprint 13 does not require a contract change if commercial readiness is defined as off-chain verifier gate plus public receipt and snapshot consistency.

If a later sprint requires public on-chain decision anchoring, use a new rail version or explicit migration plan. The minimum anchor design should:

- include `verifierInputHash` in a terminal decision event or new decision anchor event
- keep one terminal decision per `intentHash`
- keep `timeout` off-chain only
- bind accepted `IntentSubmitted` events to a configured submitter or strict verifier rule
- keep human-readable failure strings off-chain
- avoid custody, asset issuance, yield, settlement, identity, phishing-prevention, or security-decision logic

## Target Hosted Architecture

Current live MVP:

```text
Browser
-> serve-live.mjs
   -> static files
   -> live API
   -> manifest issuer
   -> SQLite store
   -> inline standard RPC verifier
   -> receipt response
```

Target commercial-readiness architecture:

```text
Browser UI
  -> Public API
  -> Run Store
  -> Partner Read API

Public API
  -> auth and tenant resolution
  -> request validation
  -> manifest issuer
  -> submitted transaction intake
  -> verification job enqueue

Verifier Worker
  -> verification job lease
  -> standard RPC snapshot
  -> verifier policy
  -> receipt builder
  -> terminal decision writer

Evidence Store
  -> canonical payloads
  -> snapshot hashes
  -> receipt payloads
  -> redacted partner exports
```

## Service Boundaries

- Web UI: wallet connect, GIWA Sepolia chain guard, manifest preview, approve/deposit wallet requests, status polling.
- Public API: run creation, evidence intake, run lookup, receipt lookup, partner lookup.
- Manifest Issuer: wallet-bound manifest signing through server-only campaign signer.
- Run Store: idempotency, run status, transaction hash uniqueness, terminal decision immutability.
- Verification Worker: queued job lease, standard RPC snapshot, log decode, manifest match, receipt creation.
- Receipt Service: matched-only receipt read and canonical payload exposure.
- Partner Read Model: fixture/live source separation and partner-facing ProofKPI summary.
- Migration/Admin: schema versioning, dry-run validation, rollback and stop-condition reporting.

## Data Model

Commercial readiness should evolve from the local Sprint 12 tables into this hosted relational shape:

| Entity | Key fields | Purpose |
|---|---|---|
| `partners` | `partner_id`, `display_name`, `status` | Customer boundary. |
| `campaigns` | `campaign_id`, `partner_id`, `status` | Partner campaign boundary. |
| `missions` | `campaign_id`, `mission_id`, `action_type`, `chain_id`, `target`, `selector`, `asset`, `amount_base_units`, `spender`, `max_allowance_base_units`, `manifest_ttl_seconds` | Supported action configuration. |
| `runs` | `run_id`, `idempotency_key`, `wallet`, `campaign_id`, `mission_id`, `referral_code`, `nonce`, `intent_hash`, `manifest_json`, `manifest_signature`, `manifest_preview_json`, `expiry_unix`, `status`, `created_at`, `updated_at` | Wallet-bound manifest run. |
| `run_status_events` | `event_id`, `run_id`, `from_status`, `to_status`, `reason`, `actor`, `metadata_json`, `created_at` | Audit and funnel source. |
| `submitted_transactions` | `run_id`, `approve_tx_hash`, `deposit_tx_hash`, `submitted_at` | Wallet-returned public tx hashes. |
| `verification_jobs` | `job_id`, `run_id`, `deposit_tx_hash`, `status`, `attempt_count`, `available_at`, `leased_at`, `lease_owner`, `last_error_code`, `last_error_redacted` | Durable verifier queue. |
| `rpc_snapshots` | `snapshot_id`, `run_id`, `tx_hash`, `kind`, `payload_hash`, `payload_json`, `block_number`, `block_hash`, `block_timestamp`, `head_block_number`, `confirmation_depth`, `captured_at` | Recomputable standard RPC evidence. |
| `verifier_inputs` | `verifier_input_hash`, `run_id`, `canonical_payload`, `canonical_payload_bytes_hex`, snapshot hashes | Recomputable verifier identity. |
| `decisions` | `intent_hash`, `run_id`, `deposit_tx_hash`, `decision`, `failure_reason`, `verifier_input_hash`, `receipt_hash`, `decision_tx_hash`, `issued_at` | Terminal matched, mismatched, or failed decisions. |
| `receipts` | `receipt_hash`, `intent_hash`, `payload_json`, `canonical_payload`, `canonical_payload_bytes_hex`, `created_at` | Matched-only receipt storage. |
| `schema_migrations` | `version`, `checksum`, `applied_at`, `applied_by` | Hosted migration control. |
| `audit_events` | `event_id`, `request_id`, `actor`, `run_id`, `event_type`, `redacted_metadata_json`, `created_at` | Support and incident audit. |

## State Machine

Durable run flow:

```text
manifestIssued
  -> manifestInvalidated
  -> depositSubmitted
  -> verifierChecking
  -> timeout
  -> verifierChecking
  -> matched | mismatched | failed
```

Rules:

- `matched`, `mismatched`, and `failed` are terminal.
- `timeout` is non-terminal and receipt-locked.
- `manifestInvalidated` is non-terminal and receipt-locked.
- UI-only states such as `wrongChain`, `approveSubmitted`, and `depositReady` may remain view-model states unless persistence is required for support.

Verification queue:

1. `/api/runs/:runId/evidence` validates run, expiry, invalidation, tx hash shape, and duplicate deposit hash.
2. The same DB transaction saves submitted transaction evidence, sets run status to `depositSubmitted`, and inserts a `verification_jobs` row.
3. Worker leases one due job, marks run `verifierChecking`, and fetches standard RPC data.
4. Missing receipt or low confirmation depth returns retryable `timeout`.
5. Confirmed evidence is decoded and matched against the manifest.
6. Matched evidence saves verifier input, receipt, decision, and outbox/audit event atomically.
7. Mismatched or failed evidence saves terminal decision without a receipt.
8. Transient RPC failures retry with backoff and jitter.
9. Exhausted jobs go to dead-letter without creating terminal decision unless evidence proves terminal failure.

## Security Architecture

Minimum commercial preview security:

- all public APIs require auth before external access
- partner APIs are tenant-scoped
- tenant id is derived from auth context, not request body
- exact origin allowlist for browser requests
- request body size limit and JSON parse failure handling
- per-IP, per-token, per-tenant, per-wallet, and per-run rate limits
- verifier route uses single-flight or queued job semantics
- raw exception strings are not returned to clients
- readiness output remains redacted
- server never requests, stores, or submits user wallet private keys
- runtime process does not include deployer or funder keys
- public artifacts never contain secret values or credential-bearing URLs

## Privacy and Retention

Classify wallet address, referral code, run id, timestamps, and transaction hashes as pseudonymous linkable operational data.

Default retention policy:

- local unmatched, failed, or timeout rehearsal DBs: purge within 7 days unless a maintainer preserves them
- local matched rehearsal DBs: purge within 30 days after public snapshot export unless a maintainer preserves them
- public evidence snapshots: retain as versioned artifacts after redaction scan
- raw local logs: do not share; if centralized logging is added, retain redacted logs for 14 days by default
- audit logs for partner beta: retain 90 days by default

Deletion note:

```text
App-owned raw rows and derived exports can be deleted. Public on-chain transaction data cannot be deleted by the app.
```

## Redaction Gates

Required gates:

- `.env.example` may contain names only with empty values.
- Real `.env` files must never be content-printed.
- Real env scanners may report only file path, match type, and count.
- Runtime readiness may print set/missing state, format class, public address, and length category only.
- API responses must use bounded error codes.
- Snapshots must be allowlist-based and fail closed.
- Secret-like field names fail export even if values look synthetic.
- Browser bundles, public JSON, screenshots, and docs must not include server-only values.

## UX Information Architecture

Commercial readiness keeps four user-facing surfaces:

1. `/live`: fresh wallet-run path.
2. `/`: recorded static fallback path.
3. `/api/receipts/<receiptHash>` and `/receipt/<receiptHash>`: receipt evidence surfaces.
4. `/partner`: one-run partner proof view.

The flow is:

```text
wallet readiness
-> manifest preview
-> approve/deposit wallet action
-> verifier status
-> matched-only receipt
-> partner evidence packet
```

Raw hashes, selectors, contract addresses, and canonical JSON should use progressive disclosure:

- Level 1: human-readable action summary.
- Level 2: short hash chip, copy button, explorer link.
- Level 3: expandable technical manifest and receipt fields.
- Level 4: canonical payload/API JSON export.

Failure copy formula:

```text
what happened
-> what is locked
-> what the user can do next
```

Example:

```text
Verifier returned SPENDER_MISMATCH. Receipt stays locked. Request a fresh manifest and retry the wallet action.
```

## UX Failure Matrix

| State | Trigger | UX response | Gate |
|---|---|---|---|
| Provider missing | no injected provider | explain wallet provider not detected | no manifest |
| Wallet request rejected | account request fails | show retryable wallet request failure | no manifest |
| Wrong chain | chain id is not `91342` | prompt switch to GIWA Sepolia | no manifest or tx |
| Switch/add chain rejected | wallet rejects network action | show manual recovery copy | no manifest or tx |
| Manifest invalidated | account or chain changed | hide preview and request fresh manifest | no tx or receipt |
| Manifest expired | expiry passed | show fresh manifest required | no receipt |
| Approve rejected | wallet rejects approve | keep approve retry available | no approve hash |
| Deposit rejected | wallet rejects deposit | keep deposit retry available | no deposit hash |
| Duplicate deposit hash | tx belongs to another run | explain tx already used | no receipt |
| Missing deposit evidence | verify before deposit evidence | keep verify disabled or show requirement | no receipt |
| Verifier timeout | confirmation depth too low | wait, check explorer, retry | non-terminal |
| Verifier mismatched | manifest comparison fails | show failure reason | terminal, no receipt |
| Verifier failed | tx failed or required log missing | show failure reason | terminal, no receipt |
| Receipt not found | unknown receipt hash | clear not-found response | no success copy |
| Live DB/env blocked | readiness or schema failure | show blocker and fallback path | no export |

## Operations and Release Readiness

Before hosted partner beta, add:

- git-backed repo and protected main branch
- required CI checks
- staging and prod-testnet separation
- secret manager
- health endpoint
- readiness endpoint
- metrics endpoint or metrics log export
- structured redacted logs
- backup and restore drill
- incident owner
- static fallback/read-only mode
- evidence archive with hash recomputation

Release readiness matrix:

| Area | Current | Commercial gate |
|---|---|---|
| Source control | non-git prototype mode may apply | git repo, protected main, required CI |
| Runtime | local `127.0.0.1` | staging and prod-testnet separated |
| Storage | local SQLite | durable DB, migrations, backup, restore drill |
| Verification | inline request verifier | queued worker, retry, terminal immutability |
| Secrets | local env contract | secret manager and role isolation |
| API access | local unauthenticated API | auth, tenant isolation, rate limit, request limits |
| Evidence | public snapshots | immutable evidence archive and redaction gate |
| Incident handling | demo runbook | severity table, key rotation path, fallback path |

## Sprint Roadmap

### Sprint 13: Commercial Readiness Foundation

Scope:

- write this commercial readiness design
- add commercial receipt gate model
- harden live receipt API around decision and receipt cross-checks
- add bounded error model and request size limit plan or implementation
- gate partner metrics and snapshot export on matched commercial receipt
- update runtime gate, runbook, and acceptance checklist

Exit gate:

```text
Commercial receipt can be opened only through the gate.
Partner matched metrics use gate-passed receipts only.
Public snapshots fail closed when the commercial gate fails.
Docs define paid pilot scope, hosted blockers, security gates, and next sprint handoff.
```

### Sprint 14: Verifier Trust Hardening

Scope:

- explicit live manifest signer recovery
- verifier input canonical payload export
- expiry check against confirmed block timestamp
- stricter log contract address binding
- failure code mapping
- optional `IntentRailV2` decision anchor decision

Exit gate:

```text
Verifier output is externally replayable from exported public evidence.
```

### Sprint 15: Hosted API Foundation

Scope:

- tenant/auth model
- DB-backed verification jobs
- repository and migration boundary
- request limits and rate limits
- structured redacted logging

Exit gate:

```text
Staging can run a controlled prod-testnet beta without local SQLite or unauthenticated partner APIs.
```

### Sprint 16: Commercial UX Pass

Scope:

- `/live` production information architecture
- human-readable `/receipt/:hash`
- partner evidence packet
- operator `/demo` control room
- failure and recovery screens

Exit gate:

```text
Participant, partner, and operator flows explain action state, receipt gate, and fallback path without internal sprint-stage copy.
```

### Sprint 17: Ops and Pilot Launch Gate

Scope:

- CI
- staging promotion
- backup/restore
- monitoring/alerts
- incident drill
- pilot kickoff and closeout templates

Exit gate:

```text
One paid partner pilot can run as a controlled GIWA Sepolia testnet beta with documented rollback, fallback, and evidence retention.
```

## Approval Gate

This design is approved only when:

- commercial wedge is fixed as one paid partner activation evidence pilot
- receipt gate is matched-only and verifier-backed
- hosted blockers are explicit
- UI scope remains one mock vault action
- security and privacy gates are defined
- next sprint implementation can be executed without asking for secrets or installing dependencies


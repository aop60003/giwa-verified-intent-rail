# GIWA Live MVP Architecture Cutover Design

## Purpose

This document defines the next product step for `GIWA Verified Intent Rail` after the Sprint 7 submission pack.

Sprint 0 through Sprint 7 proved one GIWA Sepolia mock vault action with a recorded evidence bundle, verifier decision, receipt, static guided flow, and partner proof console. The next goal is not to polish the static viewer. The next goal is to make the product generate a fresh live run from a connected user wallet.

The Live MVP target is:

```text
connected wallet
-> wallet-bound manifest
-> user approve and deposit on GIWA Sepolia
-> standard RPC evidence collection
-> verifier decision
-> dynamic receipt
-> live partner row
```

## Current Baseline

The current app is a submission-grade evidence viewer with real GIWA Sepolia artifacts.

Existing strengths:

- canonical manifest, intent hash, receipt hash, and verifier input hash utilities
- GIWA Sepolia mock token, mock vault, and intent rail deployment evidence
- `IntentSubmitted`, user approve/deposit, and verifier decision evidence
- reusable verifier logic under `apps/web/src/lib/verifier`
- static guided flow and partner console under `apps/web/public`
- final submission evidence and runbook

Current limitation:

```text
The UI replays completed fixture evidence. It does not create a new user run.
```

The Live MVP must preserve the recorded Sprint 7 fallback while adding runtime execution.

## Product Definition

A Live MVP run is successful only when a user can complete a fresh GIWA Sepolia testnet action with their own wallet and receive a receipt after verifier match.

Minimum success path:

1. User opens the campaign flow.
2. User connects an injected wallet provider.
3. App confirms GIWA Sepolia chain `91342`.
4. Server issues a manifest bound to the connected wallet.
5. Server relays `IntentSubmitted`.
6. User reviews target, selector, asset, amount, spender, and max allowance.
7. User sends approve if current allowance is insufficient.
8. User sends mock vault deposit.
9. App records approve and deposit transaction hashes.
10. App waits for standard RPC receipt confirmation.
11. Verifier checks manifest signature, intent event, transaction calldata, logs, wallet, target, spender, amount, allowance, and expiry.
12. Verifier emits `IntentMatched` or a terminal failure event when evidence is confirmed.
13. `matched` runs receive a receipt hash and receipt route.
14. Partner console shows a `live` row separate from fixture evidence.

## Non-Goals

The Live MVP must not expand into:

- multiple campaigns
- multiple action templates
- production dashboard analytics
- wallet risk scanning
- identity gating
- production asset issuance
- settlement claims
- yield claims
- security guarantees
- mainnet operation

The first Live MVP remains one flow:

```text
First Mock Vault Deposit on GIWA Sepolia
```

## Recommended Approach

Use a staged local-first cutover.

### Option A: Local Live MVP First

Build live execution locally with server-only keys, local storage, and GIWA Sepolia RPC.

Pros:

- smallest jump from the current workspace
- keeps secret exposure limited to local server env
- preserves Sprint 7 recorded fallback
- proves the product is repeatable before hosting
- avoids premature deployment and secret-manager complexity

Cons:

- not publicly hosted yet
- requires the operator machine to run the live server

Recommendation: use this approach.

### Option B: Hosted Static MVP First

Deploy the existing static evidence viewer without live server-side signing.

Pros:

- quick public URL
- low secret risk because no server-only keys are hosted
- useful as a submission artifact

Cons:

- does not solve the Live MVP gap
- still cannot create fresh user runs

Use this only after Local Live MVP if a public evidence viewer is needed.

### Option C: Hosted Live MVP Immediately

Deploy live manifest signing, intent relay, verifier decision, and persistence to a hosted environment.

Pros:

- closer to a public product
- external users can try it without local setup

Cons:

- requires secret manager, storage, rate limiting, RPC failover, rollback, and operational runbooks
- increases risk before the live run model is proven

Do not use this as the next step.

## Architecture

The Live MVP adds a runtime server boundary while preserving the existing protocol and verifier libraries.

```text
Browser UI
  -> wallet adapter
  -> live run API
  -> status polling
  -> receipt and partner views

Server API
  -> env validator
  -> run store
  -> manifest issuer
  -> intent relay
  -> evidence collector
  -> verifier wrapper
  -> decision writer
  -> receipt reader

Existing packages
  -> protocol canonical hashing
  -> contracts ABIs and deployment data
  -> verifier logic
```

The verifier should not be rewritten. The existing `verifyDepositEvidence()` logic should become the core of a server-side verifier wrapper.

## Runtime Boundaries

### Browser-Safe Boundary

Browser code may access:

- public deployment addresses
- public ABI fragments required for approve and deposit
- public chain id and explorer templates
- connected wallet address
- public run status
- public receipt data after match

Browser code must not access:

- campaign signer key
- intent submitter key
- verifier key
- raw env files
- RPC credentials with private tokens
- server-only role policy

### Server-Only Boundary

Server code owns:

- campaign manifest signing
- intent submission relay
- standard RPC evidence collection
- verifier decision write
- durable run state
- receipt persistence
- redacted evidence export

The server must fail closed if required env values are missing or malformed.

## Wallet Design

Use `EIP-1193` directly through a narrow wallet adapter for the first Live MVP.

The current web app does not use React, wagmi, RainbowKit, or a browser bundler. Adding a large wallet framework before the runtime model is proven would increase scope without solving the core product gap.

Wallet adapter responsibilities:

- detect injected provider
- request accounts
- read current chain
- request switch to GIWA Sepolia
- request add GIWA Sepolia when the wallet does not know the chain
- listen for account changes
- listen for chain changes
- send approve transaction
- send deposit transaction
- capture transaction hash returned by the provider

Required wallet states:

- no provider
- disconnected
- connected
- wrong chain
- switch rejected
- add chain rejected
- pending wallet request
- account changed
- chain changed
- approve requested
- approve submitted
- approve confirmed
- approve failed
- deposit requested
- deposit submitted
- deposit confirmed
- deposit failed

GIWA Sepolia chain values:

```text
chainId decimal: 91342
chainId hex: 0x164ce
```

## API Surface

The minimal API should be explicit and idempotent.

### `POST /api/runs`

Creates or returns a live run for a wallet, campaign, and mission.

Input:

- wallet address
- campaign id
- mission id
- optional referral code

Server behavior:

- validate wallet address
- validate chain configuration
- create nonce
- create manifest
- sign manifest with campaign signer
- compute intent hash through protocol package
- store run with status `manifestIssued`
- return manifest, signature, intent hash, and run id

### `GET /api/runs/:runId`

Returns the current run state.

Response includes:

- run id
- wallet
- campaign id
- mission id
- manifest summary
- status
- approve tx hash
- deposit tx hash
- verifier decision
- failure reason
- receipt hash when matched
- decision tx hash when terminal

### `POST /api/runs/:runId/intent-submit`

Relays `IntentSubmitted` through the server-only intent submitter.

Server behavior:

- confirm run exists
- confirm manifest has not expired
- confirm no terminal decision exists
- submit `IntentSubmitted`
- store intent submission tx hash
- return tx hash and explorer URL

### `POST /api/runs/:runId/evidence`

Stores user-submitted transaction hashes.

Input:

- approve tx hash, nullable when approval was not required
- deposit tx hash

Server behavior:

- validate hash formats
- reject deposit tx hash reuse across different runs
- store hashes
- do not emit verifier decision in this endpoint

### `POST /api/runs/:runId/verify`

Collects standard RPC evidence and attempts verification.

Server behavior:

- fetch deposit transaction
- fetch deposit receipt
- fetch intent submission transaction and receipt
- decode required logs
- compute snapshot hashes
- call verifier library
- return `timeout` without on-chain failure event if confirmation is insufficient
- emit matched or failed decision only for confirmed terminal evidence
- freeze verifier input hash, receipt hash, issued time, and decision tx hash after terminal decision

### `GET /api/receipts/:receiptHash`

Returns receipt envelope only after a matched terminal decision.

### `GET /api/partner/runs`

Returns fixture and live rows separately.

The partner view must never merge fixture rows and live rows without source labels.

## Storage Design

Use SQLite for the local Live MVP.

File JSON is acceptable for recorded evidence artifacts, but it is weak for live state because live state needs uniqueness, idempotency, and safe retries.

Minimum tables:

### `runs`

Fields:

- `runId`
- `idempotencyKey`
- `wallet`
- `campaignId`
- `missionId`
- `referralCode`
- `nonce`
- `intentHash`
- `manifestJson`
- `manifestSignature`
- `status`
- `expiryUnix`
- `createdAt`
- `updatedAt`

Constraints:

- unique `runId`
- unique `intentHash`
- unique `idempotencyKey`

### `submitted_txs`

Fields:

- `runId`
- `approveTxHash`
- `depositTxHash`
- `submittedAt`

Constraints:

- unique `depositTxHash`

### `decisions`

Fields:

- `intentHash`
- `depositTxHash`
- `decision`
- `failureReason`
- `verifierInputHash`
- `receiptHash`
- `decisionTxHash`
- `issuedAt`

Constraints:

- unique `intentHash`
- unique `depositTxHash`
- unique nullable `receiptHash`

### `receipts`

Fields:

- `receiptHash`
- `intentHash`
- `payloadJson`
- `canonicalPayload`
- `canonicalPayloadBytesHex`

Constraints:

- unique `receiptHash`
- unique `intentHash`

### `evidence_snapshots`

Fields:

- `runId`
- `depositTransactionSnapshotHash`
- `depositReceiptSnapshotHash`
- `decodedLogSnapshotHash`
- `redactedSnapshotJson`
- `createdAt`

## State Model

Use product lifecycle states instead of only UI decoration states.

Allowed run states:

- `created`
- `walletConnected`
- `wrongChain`
- `manifestIssued`
- `intentSubmitted`
- `approveRequired`
- `approveSubmitted`
- `approveConfirmed`
- `depositReady`
- `depositSubmitted`
- `depositConfirmed`
- `verifierChecking`
- `matched`
- `mismatched`
- `failed`
- `timeout`

Terminal states:

- `matched`
- `mismatched`
- `failed`

Non-terminal states:

- all other states, including `timeout`

Receipt rule:

```text
receipt route opens only when state is matched and receiptHash exists.
```

Flashblocks rule:

```text
Flashblocks may update fast feedback copy only. It does not unlock receipt routes and does not define final confirmation.
```

## Verifier and Decision Rules

The server verifier wrapper must enforce:

- configured chain id from standard RPC equals `91342`
- manifest signer matches configured campaign signer
- manifest wallet matches connected run wallet
- `IntentSubmitted` fields match manifest fields
- `IntentSubmitted.tx.from` matches configured intent submitter
- deposit transaction `from` matches manifest wallet
- deposit transaction `to` matches manifest target
- deposit calldata selector matches manifest selector
- decoded asset and amount fit manifest bounds
- approval owner matches wallet
- approval spender matches manifest spender
- approval amount does not exceed max allowance
- token transfer log and mock vault deposit log match the deposit action
- manifest has not expired at verifier issue time
- standard RPC receipt status is success for matched decisions
- unconfirmed evidence returns `timeout` without an on-chain terminal event

Idempotency rule:

```text
Once a terminal decision exists for an intentHash, later verify requests return the frozen decision and receipt data.
```

Replay rule:

```text
The same depositTxHash cannot be assigned to a different run.
```

## UI Design

The first screen remains the action flow, not a landing page.

Primary sections:

- mission summary
- wallet readiness
- network gate
- manifest preview
- approve action
- deposit action
- status rail
- receipt panel
- partner link

Live status rail:

```text
connect wallet
-> issue manifest
-> submit intent
-> approve if needed
-> deposit
-> fast feedback
-> block confirmed
-> verifier checking
-> matched or failed
-> receipt ready
```

Receipt page:

- locked before match
- shows clear not-found state for unknown receipt hash
- shows pending state for known but unmatched run
- shows receipt hash, intent hash, deposit tx hash, decision tx hash, block number, block hash, verifier decision, and explorer links after match

Partner console:

- fixture rows and live rows separated
- live rows show run id, wallet, campaign, mission, current status, source, deposit tx, decision tx, receipt hash, failure reason, and generated time
- matched transaction rate computed from live rows and labeled as mock testnet evidence

## Error Handling

The Live MVP must expose recovery states instead of silent failures.

Required user-visible failures:

- wallet provider missing
- wallet connection rejected
- wrong chain
- network switch rejected
- chain add rejected
- account changed after manifest issue
- chain changed after manifest issue
- approve rejected
- approve transaction failed
- deposit rejected
- deposit transaction failed
- transaction receipt timeout
- verifier timeout
- verifier mismatched
- manifest expired
- deposit tx hash already used

Required server failures:

- missing env value
- invalid role key format
- standard RPC chain id mismatch
- verifier key public address does not match deployed operator
- intent submitter mismatch
- evidence snapshot decode failure
- duplicate terminal decision attempt

Every server-side network call must use a timeout.

## Security and Secret Handling

No browser route, static asset, generated JSON, or public snapshot may contain private keys, wallet recovery phrases, bearer-style tokens, auth headers, or RPC credentials with private query tokens.

The previously exposed testnet key material must be treated as retired for future live runs. If a verifier operator key was exposed and the deployed contract has no operator rotation function, the next Live MVP run should deploy a fresh `IntentRail` with a fresh verifier operator.

Key boundaries:

- deployer key: local deploy scripts only
- campaign signer key: manifest issuer only
- intent submitter key: intent relay only
- verifier key: decision writer only
- user wallet key: never requested by the app

## Evidence Strategy

The Live MVP must keep two evidence modes:

### Recorded Fixture Mode

Purpose:

- demo fallback
- reproducible submission evidence
- no server-only keys required

Sources:

- `docs/evidence/giwa-sepolia-mvp-evidence.json`
- `packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json`
- generated public `flow-data.json`
- generated public `partner-snapshot.json`

### Live Run Mode

Purpose:

- create fresh runs
- prove repeatability
- feed dynamic receipt and partner views

Sources:

- SQLite run store
- standard RPC evidence collector
- verifier output
- redacted live evidence export

The Live MVP must not overwrite Sprint 7 final evidence. Fresh runs should write separate live evidence exports.

Suggested live export path:

```text
docs/evidence/live-runs/<runId>.json
```

## Dependency Decision

The next implementation plan should decide dependencies explicitly.

Likely needed:

- one HTTP server or application framework for runtime API
- one SQLite adapter
- one browser bundling path if shared viem/browser utilities are imported directly

Default recommendation:

```text
Avoid React and wallet UI frameworks for Sprint 8.
Use EIP-1193 directly.
Add the smallest server/storage layer that supports the API and SQLite.
```

If Next.js is introduced, it should be justified by API routes and hosted deployment path, not by UI preference alone.

## Sprint Breakdown

### Sprint 8: Local Live Architecture Cutover

Goal:

Define and implement runtime contracts without sending live user transactions yet.

Outputs:

- dependency approval update
- server env validator
- SQLite schema and adapter
- API route skeletons
- run status model
- fixture/live source separation
- redacted env readiness command
- key rotation note for future live runs

Exit gate:

```text
Server starts locally.
API contracts pass unit tests.
Storage idempotency tests pass.
No wallet transaction is sent yet.
Recorded Sprint 7 static demo still works.
```

### Sprint 9: Wallet and Manifest Issuance

Goal:

Connect a user wallet and issue a wallet-bound manifest.

Outputs:

- EIP-1193 wallet adapter
- GIWA Sepolia chain gate
- account and chain change handling
- live manifest issue API
- manifest preview from live run

Exit gate:

```text
User can connect wallet on GIWA Sepolia and receive a signed wallet-bound manifest.
Changing wallet or chain invalidates the manifest.
No approve or deposit transaction is required for the exit gate.
```

### Sprint 10: Live Approve and Deposit

Goal:

Send user-signed approve and deposit transactions from the browser wallet.

Outputs:

- allowance and balance read
- approve transaction request
- approve receipt tracking
- deposit transaction request
- deposit receipt tracking
- evidence hash submission API

Exit gate:

```text
At least one fresh GIWA Sepolia deposit tx is created from the connected wallet and stored as a live run.
Receipt remains locked until verifier match.
```

### Sprint 11: Live Verifier and Dynamic Receipt

Goal:

Turn a fresh live deposit into a verifier decision and dynamic receipt.

Outputs:

- standard RPC evidence collector
- verifier wrapper
- decision writer
- receipt persistence
- dynamic receipt route
- retry-safe idempotency

Exit gate:

```text
A fresh live run reaches matched, emits a decision tx, stores receiptHash, and opens a dynamic receipt route.
```

### Sprint 12: Dynamic Partner Console and Hardening

Goal:

Make live runs visible and repeatable for demo and review.

Outputs:

- live partner rows
- fixture/live separation
- live evidence export
- run reset rules
- browser smoke
- secret scan
- fallback runbook

Exit gate:

```text
Two fresh live runs can be performed without overwriting Sprint 7 recorded evidence.
Partner console shows live rows with matched status and source labels.
Recorded fallback remains available.
```

## Verification Plan

Unit tests:

- run state transitions
- storage uniqueness
- duplicate verify idempotency
- receipt route locked before match
- receipt route mismatch handling
- fixture/live partner row separation
- wallet adapter error mapping

Integration tests:

- API creates run and returns signed manifest
- intent relay records tx hash in local mocked client
- evidence submit rejects reused deposit tx hash
- verifier wrapper returns timeout for unconfirmed evidence
- verifier wrapper freezes terminal decisions

Manual GIWA Sepolia gates:

- redacted env readiness
- preflight chain id and role address check
- funded role check
- fresh wallet run
- standard RPC receipt confirmation
- decision tx explorer link

Safety scans:

- no unfinished markers in new docs and source
- no forbidden claim wording in public UI
- no secret-like values in public assets, generated JSON, docs, or source
- no content-printing scans over real env files

## Open Decisions Before Implementation

These decisions must be made in the Sprint 8 implementation plan:

1. Choose the minimal runtime server approach.
2. Choose the SQLite library after dependency review.
3. Decide whether Sprint 8 writes only API skeletons or also local mocked API behavior.
4. Decide whether old deployed contracts can be reused or fresh contracts are required after key rotation.
5. Decide whether hosted static deployment is Sprint 10 side work or deferred until after Sprint 12.

## Approval Gate

This design is ready for review when:

- it preserves the Sprint 7 recorded demo
- it defines live run success as fresh wallet execution and fresh verifier output
- it keeps private keys server-only
- it keeps Flashblocks out of final confirmation
- it avoids expanding beyond the single mock vault action

After this design is approved, the next artifact should be a Sprint 8 implementation plan, not immediate coding.

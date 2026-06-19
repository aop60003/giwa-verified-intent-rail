# Sprint 4 Verifier and Receipt Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify confirmed GIWA Sepolia deposit evidence against the official signed manifest and issue a stable receipt only when matched.

**Architecture:** The verifier reads protocol rules from Sprint 1, chain evidence from Sprint 3, and contract events from Sprint 2. It permits one terminal confirmed attempt per `intentHash` and returns the same receipt for duplicate checks of the same `intentHash + depositTxHash`.

**Tech Stack:** TypeScript, viem, Next API or standalone verifier module, local JSON evidence storage for MVP.

---

## Start Conditions

- Sprint 3 exit gate is approved.
- Chain anchor evidence exists.
- Standard RPC receipt/log snapshots are available.
- Official campaign signer address is known.
- `VERIFIER_PRIVATE_KEY` is available in local env for decision events.
- `apps/web` scaffold and server-only env boundaries exist from Sprint 0.
- `pnpm-workspace.yaml` and `apps/web/package.json` exist.
- Sprint 3 provides `verifierOperatorAddress`, `intentSubmitterAddress`, and deployment-bound manifest vector.

## Files

- Create: `apps/web/src/lib/verifier/verifyDeposit.ts`
- Create: `apps/web/src/lib/verifier/verifyManifestSigner.ts`
- Create: `apps/web/src/lib/verifier/decodeEvidence.ts`
- Create: `apps/web/src/lib/storage/receiptStore.ts`
- Create: `apps/web/src/lib/storage/nonceStore.ts`
- Create: `apps/web/src/lib/env/serverEnv.ts`
- Create: `apps/web/src/lib/env/publicEnv.ts`
- Create: `apps/web/src/app/api/manifest/route.ts`
- Create: `apps/web/src/app/api/intent-submit/route.ts`
- Create: `apps/web/src/app/api/verify/route.ts`
- Test: `apps/web/src/lib/verifier/*.test.ts`
- Update: `docs/evidence/giwa-sepolia-chain-anchor.json`
- Create or update draft: `docs/evidence/giwa-sepolia-mvp-evidence.json`

## Required Decisions

- `matched`
- `mismatched`
- `failed`
- `timeout`

`blockConfirmed` is not the same as `matched`.

Verifier status model:

```text
checking -> matched | mismatched | failed | timeout
```

Receipt creation is allowed only for `matched`.

Terminal decision policy:

- one `intentHash` has at most one terminal confirmed attempt in the MVP
- `matched`, `mismatched`, and `failed` are terminal
- `timeout` is off-chain and non-terminal; it does not emit `IntentFailed`
- same `intentHash + depositTxHash` returns existing decision/receipt
- same `intentHash` with a different confirmed deposit after any terminal decision is rejected

## Tasks

- [ ] Write failing tests for official signer verification.

Expected coverage:

- configured campaign signer passes
- attacker signer fails
- malformed signature fails
- wrong chain domain fails
- wrong `verifyingContract` fails after Sprint 3 deployment-bound vector exists
- request-provided `manifestSigner` is ignored for trust decisions
- `CAMPAIGN_SIGNER_PRIVATE_KEY` is never required in client code

- [ ] Implement server-only manifest signing.

Required behavior:

- API or local script signs EIP-712 manifest payloads server-side only
- response includes `canonicalManifestPayload`, `canonicalManifestPayloadBytesHex`, signature, domain, recovered signer, `intentHash`, `manifestStructHash`, `eip712Digest`, nonce, and nonce source
- nonce is generated and stored by the manifest server path
- client receives signed data but never receives or imports private key material
- `domain.verifyingContract` is the deployed `IntentRail` address for live GIWA Sepolia evidence

- [ ] Implement server-only intent submit relay.

Required behavior:

- `/api/intent-submit` uses `INTENT_SUBMITTER_PRIVATE_KEY`
- `IntentSubmitted.tx.from` must equal the configured intent submitter
- `IntentSubmitted.wallet` must equal manifest `wallet`
- private key material is never returned to the client

- [ ] Write failing tests for chain evidence decoding.

Expected coverage:

- deposit calldata selector
- deposit amount
- token `Approval` log
- token `Transfer` log
- vault `MockDeposit` event
- rail `IntentSubmitted` event
- receipt status
- block number and block hash
- `contractAddress` and `logIndex` for each matched log
- raw `eth_getTransactionReceipt` fields for each relevant tx
- raw `eth_getTransaction` calldata fields for the deposit tx

- [ ] Write failing tests for negative verifier outcomes.

Expected coverage:

- wrong wallet
- wrong target
- wrong asset
- wrong spender
- amount above manifest
- allowance above manifest bound
- expired manifest
- failed transaction
- unconfirmed transaction
- missing `IntentSubmitted`

- [ ] Write failing tests for receipt idempotency.

Expected coverage:

- same `intentHash + depositTxHash` returns same receipt
- second deposit for same used `intentHash` is rejected
- duplicate verification does not change `receiptHash`

- [ ] Implement verifier decision engine.

The verifier must check:

- official signer
- `chainId: 91342`
- `IntentSubmitted` field match
- `IntentSubmitted.tx.from` equals configured intent submitter
- deposit tx `from` equals manifest `wallet`
- approve owner equals manifest `wallet` when approve is required
- tx target
- function selector
- asset
- amount
- spender
- allowance bound
- expiry
- standard RPC confirmation
- `confirmationDepth`
- `headBlockNumberAtVerification`

- [ ] Emit verifier decision event.

Matched output:

```text
IntentMatched emitted by verifier operator
decisionTxHash captured
```

Failure output:

```text
IntentFailed emitted by verifier operator when evidence is confirmed but mismatched or failed
```

Do not emit `IntentFailed` for an unconfirmed timeout.

- [ ] Create receipt payload and hash.

Receipt is created only when verifier status is `matched`.

- [ ] Implement receipt idempotency in storage.

Required behavior:

- same `intentHash + depositTxHash` returns the existing receipt
- same `intentHash` with a different deposit after any terminal decision is rejected
- duplicate verification does not change `receiptHash`, `issuedAt`, or `decisionTxHash`

- [ ] Update evidence file.

Required fields:

- verifier version
- canonical manifest payload
- manifest signature
- EIP-712 domain
- recovered signer
- verifier input hash
- tx receipt status, block number, and block hash
- decoded log snapshot hashes
- matched fields
- failure reason when not matched
- `decisionTxHash`
- canonical receipt payload
- canonical receipt payload byte hex
- receipt envelope fields, including `decisionTxHash`, decision block, explorer URLs, and display-only copy
- `verifierInputHash = keccak256(canonicalVerifierInputPayload)`
- `receiptHash`

## Verification

Run:

```powershell
Test-Path .\pnpm-workspace.yaml
Test-Path .\apps\web\package.json
pnpm --filter @giwa/web --fail-if-no-match test -- verify
pnpm --filter @giwa/web --fail-if-no-match typecheck
```

Expected:

```text
Verifier tests pass.
TypeScript reports no errors.
Matched evidence produces receipt and decisionTxHash.
Mismatched evidence does not produce successful receipt.
Filtered pnpm commands fail if `@giwa/web` does not exist.
```

## Exit Gate

Sprint 4 is complete only when:

- official signer rule is enforced
- log-based verification passes
- negative fixture suite passes
- duplicate verification returns same receipt
- `decisionTxHash` is produced from verifier output
- evidence file can recompute or inspect core proof fields
- evidence file is marked as a draft until Sprint 7 finalization

## Stop Conditions

Stop if:

- verifier trusts request-provided `manifestSigner`
- verifier copies receipt fields without checking logs
- receipt appears before `matched`
- duplicate verification creates a different `receiptHash`
- decision event is emitted without verifier result

## Handoff To Sprint 5

Pass these artifacts:

- verifier API contract
- receipt payload schema
- evidence file shape
- manifest signing API contract
- status model separating block confirmation and verifier match
- `decisionTxHash` creation path

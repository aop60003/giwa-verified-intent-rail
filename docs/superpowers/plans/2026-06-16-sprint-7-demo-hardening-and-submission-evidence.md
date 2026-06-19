# Sprint 7 Demo Hardening and Submission Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MVP repeatable for judging with final evidence, demo script, runbook, and submission-safe wording.

**Architecture:** This sprint does not expand the product. It hardens the single vertical slice, captures evidence, and verifies the demo can be repeated.

**Tech Stack:** Existing MVP app, GIWA Sepolia, evidence JSON, Markdown runbooks.

---

## Start Conditions

- Sprint 6 exit gate is approved.
- User flow works.
- Partner summary works.
- Verifier emits final decision event.
- Draft `docs/evidence/giwa-sepolia-mvp-evidence.json` exists or can be written from Sprint 4 evidence.
- local receipt/run stores exist under `apps/web/.data/` or fixture data is available.

## Files

- Finalize: `docs/evidence/giwa-sepolia-mvp-evidence.json`
- Create: `docs/implementation/giwa-mvp-demo-script.md`
- Create: `docs/implementation/giwa-mvp-runbook.md`
- Create: `docs/implementation/giwa-mvp-acceptance-checklist.md`
- Create: `docs/implementation/giwa-mvp-submission-evidence.md`
- Update: `README.md`

## Required Final Evidence

- chain id
- RPC provider labels and sanitized endpoint host/path; query strings, headers, tokens, and credentials must be `<redacted>`
- explorer template
- deployed contract addresses
- deployment transaction hashes
- `eth_getCode` checks
- `intentSubmittedTxHash`
- `approveTxHash` when used
- `depositTxHash`
- `decisionTxHash`
- standard RPC receipt snapshot
- relevant log snapshots
- canonical manifest payload
- manifest signature
- EIP-712 domain
- recovered signer
- verifier input hash
- decoded log snapshot hashes
- raw `eth_getTransactionReceipt` snapshots
- raw `eth_getTransaction` deposit calldata snapshot
- confirmation depth
- head block number at verification
- canonical receipt payload
- canonical receipt payload byte hex
- receipt envelope fields
- deterministic field order and schema version
- `intentHash`
- `receiptHash`
- verifier version
- verifier status
- partner summary values
- fixture/live source labels

## Tasks

- [ ] Run happy path twice.

Expected:

```text
Two run ids exist.
Each run has separate tx evidence.
Each run reaches matched receipt.
```

- [ ] Capture final `evidence.json`.

Expected:

```text
docs/evidence/giwa-sepolia-mvp-evidence.json exists and includes all required fields.
intentHash recomputes from canonicalManifestPayload.
receiptHash recomputes from canonicalReceiptPayload.
verifierInputHash recomputes from canonicalVerifierInputPayload.
decodedLogSnapshotHash recomputes from decoded log snapshots.
raw local evidence is either kept under `docs/evidence/local/` or exported into a sanitized final evidence file.
final evidence contains no private keys, bearer tokens, RPC query tokens, API keys, mnemonics, or auth headers.
```

- [ ] Export sanitized evidence from local stores.

Inputs:

- `apps/web/.data/` receipt store
- `apps/web/.data/` run store
- Sprint 3 chain evidence fixture
- Sprint 4 verifier evidence draft

Output:

```text
docs/evidence/giwa-sepolia-mvp-evidence.json
```

- [ ] Write demo script.

The demo script must fit this sequence:

```text
open campaign
connect wallet
review intent
approve if needed
deposit
show fast feedback
show block confirmation
show verifier checking
show verifier match
show receipt
show partner summary
show evidence.json
```

The runbook must include both:

- live demo mode using current GIWA Sepolia RPC, explorer, and faucet state
- recorded evidence fallback with tx timestamps, explorer links, and replay commands

- [ ] Write acceptance checklist.

Include:

- wrong network
- no test token
- expired manifest fixture
- mismatched target fixture
- mismatched spender fixture
- allowance above manifest bound fixture
- failed deposit fixture
- missing signer fixture
- duplicate verification fixture
- guest verified-state path
- unavailable verified-state path
- Flashblocks timeout copy

Acceptance matrix shape:

```text
canonical case -> verifier fixture -> UI expected state -> partner summary inclusion/exclusion -> evidence field
```

- [ ] Write submission evidence document.

Map GASOK criteria to artifacts:

- GIWA ecosystem fit
- originality
- feasibility
- marketability
- GIWA Wallet integration path
- implementation level
- technical maturity
- team capability

Include current official reference check date and URLs used for GIWA Sepolia RPC, Flashblocks, explorer, faucet, Dojang, and up.id.

- [ ] Run final scans.

Run:

```powershell
Test-Path .\pnpm-workspace.yaml
Test-Path .\package.json
pnpm -r --fail-if-no-match test
pnpm -r --fail-if-no-match typecheck
pnpm -r --fail-if-no-match build
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("preconfirmed succ" + "ess") + "|" + ("payment set" + "tled") + "|" + ("real f" + "unds")
$secretPattern = "0x[a-fA-F0-9]{64}|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|NEXT_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"
rg -n $docPattern 03_giwa_verified_intent_rail_positioning.md README.md docs/superpowers/plans -g "2026-06-16-*.md" -g "*.ts" -g "*.tsx"
rg -n $riskPattern 03_giwa_verified_intent_rail_positioning.md README.md docs/superpowers/plans -g "2026-06-16-*.md" -g "*.ts" -g "*.tsx"
rg -n $secretPattern . -g "*.md" -g "*.json" -g "*.ts" -g "*.tsx" -g "!*.env*" -g "!docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md"
```

Expected:

```text
Tests pass.
Typecheck passes.
Build passes.
Documentation scans have only allowed policy or guardrail matches.
Secret scans have no live secret values; pattern definitions and guardrails are allowed only when clearly marked.
Do not run content-printing `rg -n` against real `.env` files. Real env files must be checked only by a redacted scanner that reports file path, match type, and count without printing secret values.
```

## Exit Gate

Sprint 7 is complete only when:

- happy path is repeatable
- evidence file is complete
- `intentHash` and `receiptHash` recomputation is recorded
- `verifierInputHash` and decoded log snapshot hash recomputation is recorded
- final evidence redaction checklist is recorded
- demo script is written
- runbook is written
- acceptance checklist is written
- partner summary is populated
- final scans are recorded

## Stop Conditions

Stop if:

- final evidence cannot reproduce `intentHash`, `receiptHash`, `verifierInputHash`, or decoded log snapshot hashes
- demo only works once
- explorer links do not open
- partner summary is empty after successful flow
- final copy crosses testnet or mock-boundary claims

## Final Handoff

Final handoff must include:

- local app URL
- GIWA Sepolia contract addresses
- explorer links
- receipt URL
- partner summary URL
- evidence JSON path
- demo script path
- known limitations

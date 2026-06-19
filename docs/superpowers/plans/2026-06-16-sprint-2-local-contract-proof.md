# Sprint 2 Local Contract Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the mock token, mock vault, and intent rail event model locally before GIWA Sepolia deployment.

**Architecture:** Contracts stay simple and inspectable. On-chain code emits evidence events; off-chain verifier logic remains in Sprint 4.

**Tech Stack:** Solidity, Hardhat, TypeScript, protocol package from Sprint 1.

---

## Start Conditions

- Sprint 1 exit gate is approved.
- Contract dependencies are approved.
- Protocol exports for ids and hashes are stable.
- `pnpm-workspace.yaml` and `packages/contracts/package.json` exist.
- No GIWA Sepolia deployment happens in this sprint.

## Files

- Create: `packages/contracts/package.json`
- Create: `packages/contracts/hardhat.config.ts`
- Create: `packages/contracts/contracts/MockIntentToken.sol`
- Create: `packages/contracts/contracts/MockVault.sol`
- Create: `packages/contracts/contracts/IntentRail.sol`
- Test: `packages/contracts/test/*.test.ts`
- Create: `packages/contracts/scripts/deploy-local.ts`
- Create: `packages/contracts/fixtures/chain-evidence/local-happy-path.json`

## Contract Scope

Required contracts:

- `MockIntentToken`
- `MockVault`
- `IntentRail`

Required events:

- token `Approval`
- token `Transfer`
- vault `MockDeposit`
- rail `IntentSubmitted`
- rail `IntentMatched`
- rail `IntentFailed`

Required event alignment:

- `IntentSubmitted` emits `campaignIdBytes32` and `missionIdBytes32`, not raw strings.
- `IntentMatched` includes `approveTxHash`, `depositTxHash`, `blockNumber`, `blockHash`, and `allowanceUsedBaseUnits`.
- `IntentFailed` includes `depositTxHash`, `blockNumber`, `blockHash`, bounded `status`, and bounded `failureReason` only for confirmed but mismatched or failed transaction evidence.
- `timeout` is off-chain and non-terminal; it does not emit `IntentFailed`.
- `IntentRail` prevents a second terminal decision event for an already decided `intentHash`.

Status code constants:

- `MATCHED = bytes32("MATCHED")`
- `MISMATCHED = bytes32("MISMATCHED")`
- `FAILED = bytes32("FAILED")`
- failure reason examples: `EXPIRED`, `TARGET_MISMATCH`, `SPENDER_MISMATCH`, `ALLOWANCE_EXCEEDED`, `TX_FAILED`, `MISSING_REQUIRED_LOG`

## Tasks

- [ ] Write failing tests for token mint, approve, and transferFrom.

Expected proof:

- minted balance increases
- approval event records owner, spender, and amount
- transfer event records from, to, and amount

- [ ] Write failing tests for vault deposit.

Expected proof:

- deposit requires positive amount
- deposit transfers mock token into vault
- deposit emits wallet, asset, and amount
- deposit balance is tracked for demo wallet

- [ ] Write failing tests for rail events.

Expected proof:

- `IntentSubmitted` emits manifest-covered fields
- `IntentMatched` can only be emitted by verifier operator
- `IntentFailed` can only be emitted by verifier operator
- non-operator calls fail
- duplicate decision for the same `intentHash` fails

- [ ] Implement contracts with only the required behavior.

Avoid:

- complex on-chain verification
- multi-campaign registry logic
- production permission systems
- non-MVP action templates

- [ ] Add local deployment script.

The script should produce local addresses and keep the shape similar to Sprint 3 deployment output.

- [ ] Write the local chain evidence fixture pack.

Required fixture fields:

- local contract addresses
- `IntentSubmitted` log
- `Approval` log
- `Transfer` log
- `MockDeposit` log
- `IntentMatched` or `IntentFailed` log
- decoded event fields with `contractAddress` and `logIndex`

## Verification

Run:

```powershell
Test-Path .\pnpm-workspace.yaml
Test-Path .\packages\contracts\package.json
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match build
```

Expected:

```text
All local contract tests pass.
Contracts compile.
Filtered pnpm commands fail if `@giwa/contracts` does not exist.
```

## Exit Gate

Sprint 2 is complete only when:

- token approval and transfer logs are observable
- vault deposit event is observable
- rail submit and decision events are observable
- verifier operator access rule is enforced
- local deployment output contains token, vault, and rail addresses
- local fixture pack can be consumed by Sprint 4 verifier tests

## Stop Conditions

Stop if:

- contracts attempt to perform full verifier logic on-chain
- event fields do not cover verifier evidence needs
- token/vault logs cannot support Sprint 4 asset, spender, amount, and allowance checks

## Handoff To Sprint 3

Pass these artifacts:

- contract names and ABIs
- local test results
- deployment script shape
- expected event signatures
- verifier operator address handling
- local chain evidence fixture path

## Sprint 2 Exit Approval

```text
Sprint 2 exit approval:
approvedBy=user
approvedAt=2026-06-16
evidencePath=C:/Users/qwaqw/Desktop/Looprail/packages/contracts/fixtures/chain-evidence/local-happy-path.json
nextSprint=C:/Users/qwaqw/Desktop/Looprail/docs/superpowers/plans/2026-06-16-sprint-3-giwa-sepolia-chain-anchor.md
```

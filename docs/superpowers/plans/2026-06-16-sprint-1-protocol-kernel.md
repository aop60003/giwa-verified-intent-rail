# Sprint 1 Protocol Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared protocol kernel for manifest, receipt, signer, and hash rules.

**Architecture:** The protocol package becomes the single source of truth for canonical payload ordering, `intentHash`, `receiptHash`, signer validation, chain binding, and typed evidence shapes. Persistent receipt idempotency belongs to Sprint 4 storage, not this pure protocol package.

**Tech Stack:** TypeScript, viem, Vitest, pnpm workspace after dependency approval.

---

## Start Conditions

- Sprint 0 exit gate is approved.
- Dependency approval allows TypeScript, viem, and Vitest.
- Workspace mode is decided.
- `pnpm-workspace.yaml` and `packages/protocol/package.json` exist.
- Evidence schema exists.
- No UI or contract implementation starts in this sprint.

## Files

- Create: `packages/protocol/package.json`
- Create: `packages/protocol/src/types.ts`
- Create: `packages/protocol/src/canonical.ts`
- Create: `packages/protocol/src/hash.ts`
- Create: `packages/protocol/src/ids.ts`
- Create: `packages/protocol/src/manifest.ts`
- Create: `packages/protocol/src/signing.ts`
- Create: `packages/protocol/src/receipt.ts`
- Create: `packages/protocol/src/evidence.ts`
- Create: `packages/protocol/src/index.ts`
- Test: `packages/protocol/src/*.test.ts`
- Update: `docs/evidence/giwa-sepolia-mvp-evidence.schema.md` when protocol fields are finalized

## Required Protocol Rules

- `chainId` must be `91342`.
- `actionType` must be `mockVaultDeposit`.
- `nonce`, `campaignId`, and `missionId` must be trimmed non-empty strings.
- `campaignId` and `missionId` convert to `bytes32` by `keccak256(toUtf8Bytes(id.trim()))`.
- `intentHash` is computed from canonical manifest payload.
- `receiptHash` is computed from canonical receipt payload.
- Signed manifest uses EIP-712/domain-separated signing and is bound to GIWA Sepolia.
- Protocol exposes signer recovery and `verifyAgainstAllowedSigner` utilities; the official signer allowlist is injected by the Sprint 4 server boundary.
- The package exposes stable idempotency keys, but duplicate storage policy is implemented in Sprint 4.

Canonical encoding rules:

- `canonicalPayloadBytes = utf8(JSON.stringify(fieldsInExactOrder))`
- field order is fixed by schema tests
- absent optional fields are omitted
- null is allowed only for fields that explicitly permit null
- addresses are lowercase `0x` strings
- `uint256` values are base-unit decimal strings
- golden vectors include payload JSON, payload byte hex, and hash

EIP-712 relation:

- `intentHash` is the product identity hash used in events, receipts, and evidence
- `manifestStructHash` is the EIP-712 struct hash
- `eip712Digest` is the EIP-712 signing digest
- deployed vectors use `domain.verifyingContract = IntentRail`
- deployment-independent vectors are unit-test vectors only

## Tasks

- [ ] Write failing tests for canonical manifest ordering.

Expected coverage:

- field order is stable
- addresses normalize consistently
- base-unit amounts stay strings
- optional referral code is omitted when absent

- [ ] Write failing tests for invalid manifest rejection.

Expected coverage:

- wrong chain id
- empty nonce
- empty campaign id
- empty mission id
- unsupported action type
- invalid address
- invalid selector
- non-integer amount strings

- [ ] Write failing tests for signing.

Expected coverage:

- official campaign signer passes
- non-official signer fails
- domain includes `name`, `version`, `chainId`, and `verifyingContract`
- deployment-independent vector exists before Sprint 3
- deployment-bound vector update is handed off to Sprint 3 and Sprint 4
- `intentHash`, `manifestStructHash`, and `eip712Digest` are separately documented

- [ ] Write failing tests for bytes32 id normalization.

Expected coverage:

- trimmed ids hash consistently
- empty trimmed ids fail
- `campaignIdBytes32` and `missionIdBytes32` golden vectors are documented
- human-readable ids remain in manifest and evidence payloads

- [ ] Write failing tests for receipt canonical identity rules.

Expected coverage:

- field order is stable
- `issuedAt` is included only when the receipt is first issued
- base-unit amounts stay strings
- `receiptHash` and `decisionTxHash` are excluded from canonical receipt payload
- `receiptHash` golden vector is documented

- [ ] Implement the smallest protocol utilities that pass the tests.

Implementation must not include UI, API routes, or contracts.

- [ ] Update evidence schema field names if the protocol package finalizes names differently.

## Verification

Run:

```powershell
Test-Path .\pnpm-workspace.yaml
Test-Path .\packages\protocol\package.json
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/protocol --fail-if-no-match typecheck
```

Expected:

```text
Protocol tests pass.
TypeScript reports no errors.
Filtered pnpm commands fail if `@giwa/protocol` does not exist.
```

## Exit Gate

Sprint 1 is complete only when:

- manifest tests pass
- receipt canonical hash tests pass
- signer tests pass
- bytes32 id normalization tests pass
- official signer mismatch fails
- golden vectors are stored or documented
- Sprint 2 can import protocol types without guessing field names

## Stop Conditions

Stop if:

- EIP-712 or domain-separated signing cannot be implemented cleanly
- official signer verification is skipped
- receipt hash changes on duplicate verification
- protocol fields diverge from `03_giwa_verified_intent_rail_positioning.md`

## Handoff To Sprint 2

Pass these artifacts:

- protocol package path
- exported manifest and receipt types
- `intentHash` and `receiptHash` test vectors
- signer validation rule
- bytes32 id normalization rule
- deployment-independent EIP-712 signing vector
- canonical payload encoding rule
- `intentHash` / `manifestStructHash` / `eip712Digest` relationship

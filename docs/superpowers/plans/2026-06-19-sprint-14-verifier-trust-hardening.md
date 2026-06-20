# Sprint 14 Verifier Trust Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live verifier output externally replayable from public GIWA Sepolia standard RPC evidence, signed manifest evidence, canonical verifier input, and matched-only receipt gates.

**Architecture:** Sprint 14 stays local, testnet-only, and single-flow. It hardens the verifier pipeline around manifest signer recovery, standard RPC evidence snapshots, raw log decoding, canonical verifier input export, bounded failure codes, and Sprint 13 commercial receipt gates. Optional `IntentRailV2` anchoring remains a design decision only unless a later sprint explicitly approves contract implementation and deployment.

**Tech Stack:** TypeScript 6, Vitest 4, viem 2, existing protocol helpers, existing Hardhat contracts for reference only, Node HTTP live server, existing `node:sqlite` adapter, markdown docs. No new dependency is allowed.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-19-giwa-commercial-readiness-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-13-commercial-readiness.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/evidence/live-demo-sprint12-snapshot.schema.md`
- `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`
- `apps/web/src/lib/live`
- `apps/web/src/lib/verifier`
- `apps/web/src/lib/partner`
- `packages/protocol/src`
- `packages/contracts/contracts`

## Parallel Analysis Summary

Sprint 14 planning used four read-only parallel analyses:

1. **Verifier/protocol trust boundary:** protocol helpers already support canonical manifest hash, EIP-712 domain binding, signer recovery, receipt hash, and verifier input hash. The live verifier must call those checks explicitly instead of trusting stored run fields.
2. **Standard RPC evidence and snapshot reproducibility:** runtime verifier decisions use standard RPC snapshots, but public exports do not yet include enough canonical verifier input and raw snapshot hashes for external replay.
3. **On-chain event / `IntentRailV2` necessity:** current `IntentRail` supports terminal events but does not bind `verifierInputHash`; Sprint 14 should decide and document an optional V2 anchor, not implement or deploy it by default.
4. **Security, redaction, and partner export:** Sprint 13 gates receipt access, but Sprint 14 should normalize verifier failure output, guard public exports, and keep partner metrics tied to gate-passed evidence only.

## Sprint 14 Boundary

Allowed:

- add pure verifier trust policy types and tests
- verify manifest signer, EIP-712 domain, deployed `IntentRail` verifying contract, and stored `intentHash`
- extend standard RPC snapshots with raw transaction, receipt, log, head block, and deposit block timestamp data
- decode required evidence from raw receipt logs and calldata, not caller-provided decoded JSON
- define and apply a unified amount, allowance, confirmation, and expiry policy
- map verifier failures to bounded public failure codes
- export canonical verifier input payload, bytes, and component hashes for public replay
- connect verifier output to Sprint 13 commercial receipt gate
- add public artifact guard tests for snapshot/export output
- document optional `IntentRailV2` anchor decision criteria

Not allowed:

- read or print `.env` or `.env.local` contents
- do not request or use a user wallet private key
- send wallet approve or deposit transactions from scripts or server code
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- expose the live API outside localhost
- use Flashblocks as final confirmation
- do not add claims about production asset, production yield, settlement, identity/KYC service, phishing prevention, or safety guarantees
- implement hosted auth, tenant isolation, rate limits, or public beta scope; that is Sprint 15+

## File Structure

Create:

- `apps/web/src/lib/verifier/liveVerifierPolicy.ts` - trust policy model for signer, deployed rail, chain id, expected contracts, amount policy, allowance policy, and confirmation threshold.
- `apps/web/src/lib/verifier/liveVerifierPolicy.test.ts` - policy normalization and rejection tests.
- `apps/web/src/lib/verifier/liveFailureCode.ts` - bounded verifier failure code mapping and safe display copy.
- `apps/web/src/lib/verifier/liveFailureCode.test.ts` - mapping coverage for raw internal reasons.
- `apps/web/src/lib/verifier/publicArtifactGuard.ts` - allowlist-style public export guard for JSON artifacts.
- `apps/web/src/lib/verifier/publicArtifactGuard.test.ts` - secret-like and forbidden-claim rejection tests.
- `docs/superpowers/specs/2026-06-19-intentrail-v2-decision-anchor-design.md` - optional anchor decision design only.

Modify:

- `apps/web/src/lib/verifier/verifyManifestSigner.ts`
- `apps/web/src/lib/verifier/verifyManifestSigner.test.ts`
- `apps/web/src/lib/verifier/liveVerifierInput.ts`
- `apps/web/src/lib/verifier/liveVerifierInput.test.ts`
- `apps/web/src/lib/verifier/standardRpcReceiptClient.ts`
- `apps/web/src/lib/verifier/standardRpcReceiptClient.test.ts`
- `apps/web/src/lib/verifier/depositReceiptDecoder.ts`
- `apps/web/src/lib/verifier/depositReceiptDecoder.test.ts`
- `apps/web/src/lib/verifier/matchLiveDeposit.ts`
- `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`
- `apps/web/src/lib/verifier/liveVerifierService.ts`
- `apps/web/src/lib/verifier/liveVerifierService.test.ts`
- `apps/web/src/lib/live/commercialReceiptGate.ts`
- `apps/web/src/lib/live/commercialReceiptGate.test.ts`
- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveApi.test.ts`
- `apps/web/src/lib/live/liveStore.ts`
- `apps/web/src/lib/live/liveStore.test.ts`
- `apps/web/src/lib/live/liveDemoSnapshot.ts`
- `apps/web/src/lib/live/liveDemoSnapshot.test.ts`
- `apps/web/src/lib/partner/partnerSummary.ts`
- `apps/web/src/lib/partner/partnerSummary.test.ts`
- `apps/web/scripts/export-flow-data.mjs`
- `apps/web/scripts/export-live-demo-snapshot.mjs`
- `docs/evidence/live-demo-sprint12-snapshot.schema.md`
- `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

Read-only reference:

- `packages/protocol/src/manifest.ts`
- `packages/protocol/src/signing.ts`
- `packages/protocol/src/evidence.ts`
- `packages/protocol/src/receipt.ts`
- `packages/contracts/contracts/IntentRail.sol`

## Task 1: Sprint 14 Boundary Docs and Index Update

**Files:**

- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`
- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

- [ ] **Step 1: Write the failing documentation scan**

Run:

```powershell
rg -n "Sprint 14 Verifier Trust Hardening|verifier input replay|IntentRailV2 decision anchor" docs\implementation docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md
```

Expected:

```text
FAIL or incomplete matches before the Sprint 14 boundary text is added.
```

- [ ] **Step 2: Add Sprint 14 boundary text**

Add this section to `docs/implementation/giwa-live-mvp-runtime-gate.md`:

```markdown
## Sprint 14 Verifier Trust Hardening Boundary

Sprint 14 makes live verifier output replayable from public standard RPC evidence, signed manifest evidence, canonical verifier input, and matched-only receipt gates.

Sprint 14 does not deploy contracts, send verifier transactions, send wallet transactions, expose the live API outside localhost, or implement hosted partner beta scope.

The verifier must reject signer mismatch, wrong EIP-712 domain, stored intent hash mismatch, wrong log contract address, under-confirmed receipts, expired-at-block evidence, amount mismatch, allowance overflow, missing required logs, and synthetic decoded evidence.

Optional `IntentRailV2` anchoring remains a design decision until a later sprint explicitly approves contract implementation and deployment.
```

Add this section to `docs/implementation/giwa-commercial-readiness-gate.md`:

```markdown
## Sprint 14 Verifier Replay Gate

Commercial receipt access also requires Sprint 14 replay checks when those fields are present:

- recovered manifest signer equals the configured campaign signer
- EIP-712 domain uses GIWA Sepolia `91342` and the deployed `IntentRail` verifying contract
- recomputed manifest `intentHash` equals the stored run `intentHash`
- recomputed `verifierInputHash` equals the stored decision `verifierInputHash`
- recomputed `receiptHash` equals the stored receipt hash
- confirmation and expiry checks use standard RPC block data
- decoded evidence is derived from raw standard RPC receipt logs
```

Add this section to `docs/implementation/giwa-mvp-runbook.md`:

```markdown
## Sprint 14 Verifier Trust Checks

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- manifest
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate liveDemoSnapshot partnerSummary
pnpm --filter @giwa/web --fail-if-no-match typecheck
node --check apps/web/scripts/export-live-demo-snapshot.mjs
```

Sprint 14 is complete only when verifier input and receipt hashes can be recomputed from public evidence without relying on caller-provided decoded JSON.
```

Update `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md` so the Sprint 14 note says:

```markdown
Sprint 14 hardens verifier trust before any hosted API sprint. It keeps the local live MVP testnet-only, requires public replay of `verifierInputHash` and `receiptHash`, and treats optional `IntentRailV2` anchoring as a design decision rather than a deployment step.
```

- [ ] **Step 3: Run the documentation scan**

Run:

```powershell
rg -n "Sprint 14 Verifier Trust Hardening|verifier input replay|IntentRailV2 decision anchor" docs\implementation docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md
```

Expected:

```text
Sprint 14 references are present in runtime gate, runbook, commercial gate, and sprint index.
```

**Exit condition:** Sprint 14 boundary is documented without changing runtime behavior.

## Task 2: Manifest Binding Verifier Tests

**Files:**

- Create: `apps/web/src/lib/verifier/liveVerifierPolicy.ts`
- Create: `apps/web/src/lib/verifier/liveVerifierPolicy.test.ts`
- Modify: `apps/web/src/lib/verifier/verifyManifestSigner.ts`
- Modify: `apps/web/src/lib/verifier/verifyManifestSigner.test.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.test.ts`

- [ ] **Step 1: Write failing policy and signer tests**

Create `apps/web/src/lib/verifier/liveVerifierPolicy.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { normalizeLiveVerifierPolicy } from "./liveVerifierPolicy.ts";

describe("live verifier policy", () => {
  it("normalizes signer, rail, token, vault, and confirmation policy", () => {
    const policy = normalizeLiveVerifierPolicy({
      chainId: 91342,
      officialCampaignSigner: "0x1111111111111111111111111111111111111111",
      intentRailAddress: "0x2222222222222222222222222222222222222222",
      mockTokenAddress: "0x3333333333333333333333333333333333333333",
      mockVaultAddress: "0x4444444444444444444444444444444444444444",
      minConfirmations: 3,
      amountPolicy: "exact",
      allowancePolicy: "exact"
    });

    expect(policy).toMatchObject({
      chainId: 91342,
      officialCampaignSigner: "0x1111111111111111111111111111111111111111",
      intentRailAddress: "0x2222222222222222222222222222222222222222",
      mockTokenAddress: "0x3333333333333333333333333333333333333333",
      mockVaultAddress: "0x4444444444444444444444444444444444444444",
      minConfirmations: 3,
      amountPolicy: "exact",
      allowancePolicy: "exact"
    });
  });

  it("rejects non-GIWA chain policy", () => {
    expect(() =>
      normalizeLiveVerifierPolicy({
        chainId: 1,
        officialCampaignSigner: "0x1111111111111111111111111111111111111111",
        intentRailAddress: "0x2222222222222222222222222222222222222222",
        mockTokenAddress: "0x3333333333333333333333333333333333333333",
        mockVaultAddress: "0x4444444444444444444444444444444444444444",
        minConfirmations: 3,
        amountPolicy: "exact",
        allowancePolicy: "exact"
      })
    ).toThrow("chainId must be 91342");
  });
});
```

Add tests to `apps/web/src/lib/verifier/liveVerifierService.test.ts`:

```typescript
it("rejects a manifest when the stored intent hash does not recompute", async () => {
  const result = await verifyLiveRun({
    run: { ...run, intentHash: `0x${"9".repeat(64)}` },
    submittedTx,
    receiptClient: makeClient(),
    nowSeconds: () => 1790000020,
    verifierVersion: "live-sprint-14",
    trustPolicy,
    manifestSignature: validManifestSignature
  });

  expect(result.decision).toBe("mismatched");
  expect(result.failureReason).toBe("INTENT_HASH_MISMATCH");
  expect(result.receipt).toBeUndefined();
});

it("rejects a manifest signed for a different verifying contract", async () => {
  const result = await verifyLiveRun({
    run,
    submittedTx,
    receiptClient: makeClient(),
    nowSeconds: () => 1790000020,
    verifierVersion: "live-sprint-14",
    trustPolicy,
    manifestSignature: wrongDomainSignature
  });

  expect(result.decision).toBe("mismatched");
  expect(result.failureReason).toBe("SIGNER_MISMATCH");
  expect(result.receipt).toBeUndefined();
});
```

Use `viem/accounts` only with deterministic test private keys derived inside the test, as existing tests do. Never use local env keys.

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveVerifierPolicy verifyManifestSigner liveVerifierService
```

Expected:

```text
FAIL because liveVerifierPolicy.ts does not exist and verifyLiveRun does not yet enforce signer/domain/intentHash checks.
```

- [ ] **Step 3: Implement policy and verifier binding**

Create `apps/web/src/lib/verifier/liveVerifierPolicy.ts` with:

```typescript
import { GIWA_SEPOLIA_CHAIN_ID, type Address } from "../../../../../packages/protocol/src/index.ts";
import { normalizeAddress, requirePositiveInteger } from "../../../../../packages/protocol/src/validation.ts";

export type LiveAmountPolicy = "exact" | "max";
export type LiveAllowancePolicy = "exact" | "max";

export type LiveVerifierPolicyInput = {
  chainId: number;
  officialCampaignSigner: string;
  intentRailAddress: string;
  mockTokenAddress: string;
  mockVaultAddress: string;
  minConfirmations: number;
  amountPolicy: LiveAmountPolicy;
  allowancePolicy: LiveAllowancePolicy;
};

export type LiveVerifierPolicy = {
  chainId: typeof GIWA_SEPOLIA_CHAIN_ID;
  officialCampaignSigner: Address;
  intentRailAddress: Address;
  mockTokenAddress: Address;
  mockVaultAddress: Address;
  minConfirmations: number;
  amountPolicy: LiveAmountPolicy;
  allowancePolicy: LiveAllowancePolicy;
};

export function normalizeLiveVerifierPolicy(input: LiveVerifierPolicyInput): LiveVerifierPolicy {
  if (input.chainId !== GIWA_SEPOLIA_CHAIN_ID) throw new Error("chainId must be 91342");
  if (input.amountPolicy !== "exact" && input.amountPolicy !== "max") throw new Error("amountPolicy is invalid");
  if (input.allowancePolicy !== "exact" && input.allowancePolicy !== "max") throw new Error("allowancePolicy is invalid");

  return {
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    officialCampaignSigner: normalizeAddress(input.officialCampaignSigner, "officialCampaignSigner"),
    intentRailAddress: normalizeAddress(input.intentRailAddress, "intentRailAddress"),
    mockTokenAddress: normalizeAddress(input.mockTokenAddress, "mockTokenAddress"),
    mockVaultAddress: normalizeAddress(input.mockVaultAddress, "mockVaultAddress"),
    minConfirmations: requirePositiveInteger(input.minConfirmations, "minConfirmations"),
    amountPolicy: input.amountPolicy,
    allowancePolicy: input.allowancePolicy
  };
}
```

In `apps/web/src/lib/verifier/liveVerifierService.ts`:

- parse and normalize the manifest before snapshot matching
- compute `computeIntentHash(manifest)` and compare it to `run.intentHash`
- call `verifyDeploymentManifestSigner` with `policy.intentRailAddress`, `manifestSignature`, and `policy.officialCampaignSigner`
- return `mismatched` with `SIGNER_MISMATCH` or `INTENT_HASH_MISMATCH` before building a receipt

- [ ] **Step 4: Run passing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveVerifierPolicy verifyManifestSigner liveVerifierService
```

Expected:

```text
PASS policy, signer, and live verifier service tests.
```

**Exit condition:** The live verifier no longer trusts stored manifest fields without recomputing identity and signer/domain binding.

## Task 3: Canonical Verifier Input Builder Plan

**Files:**

- Modify: `apps/web/src/lib/verifier/liveVerifierInput.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierInput.test.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.ts`
- Modify: `apps/web/src/lib/live/liveStore.ts`
- Modify: `apps/web/src/lib/live/liveStore.test.ts`

- [ ] **Step 1: Write failing canonical replay tests**

Add to `apps/web/src/lib/verifier/liveVerifierInput.test.ts`:

```typescript
it("returns canonical verifier input payload and component hashes for public replay", () => {
  const result = buildLiveVerifierInput(input);

  expect(result.payload.depositTransactionSnapshotHash).toMatch(/^0x[a-f0-9]{64}$/u);
  expect(result.payload.depositReceiptSnapshotHash).toMatch(/^0x[a-f0-9]{64}$/u);
  expect(result.payload.decodedLogSnapshotHash).toMatch(/^0x[a-f0-9]{64}$/u);
  expect(result.canonicalPayload).toContain("\"verifierVersion\":\"live-sprint-14\"");
  expect(result.canonicalPayloadBytesHex).toMatch(/^0x[0-9a-f]+$/u);
  expect(result.verifierInputHash).toMatch(/^0x[a-f0-9]{64}$/u);
});

it("rejects stored intent hash mismatch before building verifier input", () => {
  expect(() =>
    buildLiveVerifierInput({
      ...input,
      run: { ...input.run, intentHash: `0x${"9".repeat(64)}` }
    })
  ).toThrow("intentHash does not match manifest");
});
```

Add to `apps/web/src/lib/live/liveStore.test.ts`:

```typescript
it("persists canonical verifier input payload for replay", () => {
  const store = createMemoryLiveStore();
  store.saveVerifierInput({
    runId: "run-1",
    verifierInputHash: `0x${"a".repeat(64)}`,
    canonicalPayload: "{\"schemaVersion\":\"1\"}",
    canonicalPayloadBytesHex: "0x7b7d",
    createdAt: "2026-06-19T00:00:00.000Z"
  });

  expect(store.getVerifierInput(`0x${"a".repeat(64)}`)).toMatchObject({
    runId: "run-1",
    verifierInputHash: `0x${"a".repeat(64)}`
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveVerifierInput liveStore
```

Expected:

```text
FAIL until verifier input intent-hash recomputation and store methods exist.
```

- [ ] **Step 3: Implement canonical verifier input persistence**

In `apps/web/src/lib/verifier/liveVerifierInput.ts`:

- compute `const recomputedIntentHash = computeIntentHash(manifest)`
- reject when it differs from `input.run.intentHash`
- return existing `canonicalPayload`, `canonicalPayloadBytesHex`, and `verifierInputHash`

In `apps/web/src/lib/live/liveTypes.ts`, add:

```typescript
export type VerifierInputRecord = {
  runId: string;
  verifierInputHash: string;
  canonicalPayload: string;
  canonicalPayloadBytesHex: string;
  createdAt: string;
};
```

In `apps/web/src/lib/live/liveStore.ts`, add methods:

```typescript
saveVerifierInput(input: VerifierInputRecord): VerifierInputRecord;
getVerifierInput(verifierInputHash: string): VerifierInputRecord | undefined;
```

Back the memory store with a map and SQLite store with a `verifier_inputs` table. If an existing DB schema blocks creation, fail closed with a clear message and use a new Sprint 14 DB path during execution.

In `apps/web/src/lib/verifier/liveVerifierService.ts`, save or return the canonical verifier input record so `liveApi.ts` can persist it alongside the terminal decision.

- [ ] **Step 4: Run passing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveVerifierInput liveStore liveApi
```

Expected:

```text
PASS verifier input, store, and API integration tests.
```

**Exit condition:** `verifierInputHash` is replayable from stored/exported canonical verifier input, not only stored as an opaque hash.

## Task 4: Raw Standard RPC Snapshot Model

**Files:**

- Modify: `apps/web/src/lib/verifier/standardRpcReceiptClient.ts`
- Modify: `apps/web/src/lib/verifier/standardRpcReceiptClient.test.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierInput.ts`
- Modify: `docs/evidence/live-demo-sprint12-snapshot.schema.md`

- [ ] **Step 1: Write failing raw snapshot tests**

Add to `apps/web/src/lib/verifier/standardRpcReceiptClient.test.ts`:

```typescript
it("captures raw transaction, raw receipt, head block, and deposit block timestamp", async () => {
  const client = createStandardRpcReceiptClient({
    chainId: 91342,
    transport: {
      async getChainId() {
        return 91342;
      },
      async getTransaction() {
        return { hash: `0x${"a".repeat(64)}`, from: "0x1111111111111111111111111111111111111111", to: "0x2222222222222222222222222222222222222222", input: "0x", value: 0n };
      },
      async getTransactionReceipt() {
        return { status: "success", blockNumber: 10n, blockHash: `0x${"b".repeat(64)}`, logs: [] };
      },
      async getBlockNumber() {
        return 14n;
      },
      async getBlock(input) {
        expect(input).toEqual({ blockNumber: 10n });
        return { number: 10n, hash: `0x${"b".repeat(64)}`, timestamp: 1790000000n };
      }
    }
  });

  const bundle = await snapshotDepositTransaction(client, `0x${"a".repeat(64)}`);

  expect(bundle.rawTransaction).toMatchObject({ hash: `0x${"a".repeat(64)}` });
  expect(bundle.rawReceipt).toMatchObject({ blockNumber: 10n });
  expect(bundle.depositBlock).toMatchObject({ blockNumber: 10, timestamp: 1790000000 });
  expect(bundle.confirmationDepth).toBe(5);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- standardRpcReceiptClient
```

Expected:

```text
FAIL until raw snapshot and block timestamp fields are added.
```

- [ ] **Step 3: Implement raw snapshot model**

Extend `StandardRpcTransport` with:

```typescript
getBlock(input?: { blockNumber: bigint }): Promise<Record<string, unknown>>;
```

Extend `StandardRpcTransactionBundle` with:

```typescript
rawTransaction: Record<string, unknown>;
rawReceipt: Record<string, unknown>;
depositBlock: {
  blockNumber: number;
  blockHash: Hex;
  timestamp: number;
};
```

Fetch `getBlock({ blockNumber: BigInt(receipt.blockNumber) })`, normalize `timestamp`, and require the deposit block hash to equal the receipt block hash.

- [ ] **Step 4: Run passing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- standardRpcReceiptClient liveVerifierInput
```

Expected:

```text
PASS RPC snapshot and verifier input tests.
```

**Exit condition:** standard RPC evidence includes raw snapshots and block timestamp needed for expiry verification and public replay.

## Task 5: Raw Log Decoder Binding Tests

**Files:**

- Modify: `apps/web/src/lib/verifier/depositReceiptDecoder.ts`
- Modify: `apps/web/src/lib/verifier/depositReceiptDecoder.test.ts`
- Modify: `apps/web/src/lib/verifier/matchLiveDeposit.ts`
- Modify: `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`

- [ ] **Step 1: Write failing log-binding tests**

Add to `apps/web/src/lib/verifier/depositReceiptDecoder.test.ts`:

```typescript
it("preserves source transaction and block binding on decoded logs", () => {
  const decoded = decodeDepositReceiptLogs([
    {
      address: manifest.asset,
      data: approvalData,
      topics: approvalTopics,
      logIndex: 0,
      transactionHash: submittedTx.approveTxHash!,
      blockNumber: 9,
      blockHash: `0x${"f".repeat(64)}`
    }
  ]);

  expect(decoded[0]).toMatchObject({
    eventName: "Approval",
    sourceTxHash: submittedTx.approveTxHash,
    blockNumber: 9,
    blockHash: `0x${"f".repeat(64)}`
  });
});
```

Add to `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`:

```typescript
it("rejects a transfer log copied from a different transaction", () => {
  const result = matchLiveDeposit({
    ...matchedInput,
    decodedLogSnapshots: matchedInput.decodedLogSnapshots.map((log) =>
      log.eventName === "Transfer" ? { ...log, sourceTxHash: `0x${"9".repeat(64)}` } : log
    )
  });

  expect(result.decision).toBe("mismatched");
  expect(result.failureReason).toBe("MISSING_REQUIRED_LOG");
});

it("rejects logs from the wrong contract address", () => {
  const result = matchLiveDeposit({
    ...matchedInput,
    decodedLogSnapshots: matchedInput.decodedLogSnapshots.map((log) =>
      log.eventName === "MockDeposit" ? { ...log, contractAddress: "0x9999999999999999999999999999999999999999" } : log
    )
  });

  expect(result.decision).toBe("mismatched");
  expect(result.failureReason).toBe("TARGET_MISMATCH");
});
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- depositReceiptDecoder matchLiveDeposit
```

Expected:

```text
FAIL until decoded logs carry source binding and matcher enforces it.
```

- [ ] **Step 3: Implement source-bound decoded logs**

Extend `StandardRpcLogSnapshot` with:

```typescript
transactionHash: Hex;
blockNumber: number;
blockHash: Hex;
```

Extend `DecodedLogSnapshot` in `apps/web/src/lib/verifier/decodeEvidence.ts` with:

```typescript
sourceTxHash: Hex;
blockNumber: number;
blockHash: Hex;
```

Make `decodeDepositReceiptLogs` copy those fields from raw logs. In `matchLiveDeposit`, require:

- `Approval` logs come from `approveTxHash` when approval exists
- `Transfer` and `MockDeposit` logs come from `depositTxHash`
- required logs use the expected contract address
- required logs use the deposit receipt block number and block hash
- required logs are present exactly once

- [ ] **Step 4: Run passing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- depositReceiptDecoder matchLiveDeposit liveVerifierService
```

Expected:

```text
PASS decoder, matcher, and verifier service tests.
```

**Exit condition:** verifier decisions cannot be produced from decoded JSON detached from the raw standard RPC receipt.

## Task 6: Unified Amount, Allowance, Confirmation, and Expiry Policy

**Files:**

- Modify: `apps/web/src/lib/verifier/liveVerifierPolicy.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierPolicy.test.ts`
- Modify: `apps/web/src/lib/verifier/matchLiveDeposit.ts`
- Modify: `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.test.ts`

- [ ] **Step 1: Write failing policy tests**

Add to `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`:

```typescript
it("returns timeout for under-confirmed receipts without creating terminal failure", () => {
  const result = matchLiveDeposit({ ...matchedInput, confirmationDepth: 2, minConfirmations: 3 });

  expect(result.decision).toBe("timeout");
  expect(result.failureReason).toBe("UNDER_CONFIRMED");
  expect(result.receiptCandidate).toBeUndefined();
});

it("checks expiry against deposit block timestamp", () => {
  const result = matchLiveDeposit({
    ...matchedInput,
    depositBlockTimestamp: matchedInput.manifest.expiryUnix + 1
  });

  expect(result.decision).toBe("mismatched");
  expect(result.failureReason).toBe("EXPIRED");
});

it("rejects allowance above manifest bound under max allowance policy", () => {
  const result = matchLiveDeposit({
    ...matchedInput,
    allowancePolicy: "max",
    decodedLogSnapshots: withApprovalAmount(matchedInput.decodedLogSnapshots, "2000000000000000000")
  });

  expect(result.decision).toBe("mismatched");
  expect(result.failureReason).toBe("ALLOWANCE_EXCEEDED");
});
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- matchLiveDeposit liveVerifierService
```

Expected:

```text
FAIL until the matcher accepts policy inputs and deposit block timestamp.
```

- [ ] **Step 3: Implement unified policy**

Update `LiveDepositMatchInput` with:

```typescript
amountPolicy?: "exact" | "max";
allowancePolicy?: "exact" | "max";
depositBlockTimestamp: number;
```

Rules:

- `receipt.status === "reverted"` returns `failed` with `TX_FAILED`
- `confirmationDepth < minConfirmations` returns `timeout` with `UNDER_CONFIRMED`
- `depositBlockTimestamp > manifest.expiryUnix` returns `mismatched` with `EXPIRED`
- `amountPolicy: "exact"` requires deposit amount equals manifest amount
- `amountPolicy: "max"` allows deposit amount less than or equal to manifest amount
- `allowancePolicy: "exact"` requires approval amount equals max allowance
- `allowancePolicy: "max"` rejects approval amount above max allowance

Thread policy values from `LiveVerifierPolicy` through `verifyLiveRun` into `matchLiveDeposit`.

- [ ] **Step 4: Run passing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveVerifierPolicy matchLiveDeposit liveVerifierService
```

Expected:

```text
PASS policy, matcher, and service tests.
```

**Exit condition:** static and live verifier semantics use one explicit policy for amount, allowance, confirmation, and expiry.

## Task 7: Failure Code Mapping

**Files:**

- Create: `apps/web/src/lib/verifier/liveFailureCode.ts`
- Create: `apps/web/src/lib/verifier/liveFailureCode.test.ts`
- Modify: `apps/web/src/lib/verifier/matchLiveDeposit.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/public/live-flow.js`

- [ ] **Step 1: Write failing failure-code tests**

Create `apps/web/src/lib/verifier/liveFailureCode.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { toBoundedFailureCode, failureCodeDisplayCopy } from "./liveFailureCode.ts";

describe("live verifier failure code mapping", () => {
  it.each([
    ["RECEIPT_REVERTED", "TX_FAILED"],
    ["TRANSFER_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
    ["DEPOSIT_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
    ["APPROVAL_LOG_MISSING", "MISSING_REQUIRED_LOG"],
    ["TARGET_MISMATCH", "TARGET_MISMATCH"],
    ["SPENDER_MISMATCH", "SPENDER_MISMATCH"],
    ["AMOUNT_MISMATCH", "AMOUNT_MISMATCH"],
    ["ALLOWANCE_EXCEEDED", "ALLOWANCE_EXCEEDED"],
    ["EXPIRED", "EXPIRED"],
    ["UNDER_CONFIRMED", "UNDER_CONFIRMED"]
  ])("maps %s to %s", (raw, expected) => {
    expect(toBoundedFailureCode(raw)).toBe(expected);
  });

  it("uses safe display copy without raw provider details", () => {
    expect(failureCodeDisplayCopy("MISSING_REQUIRED_LOG")).toBe(
      "Required standard RPC receipt evidence was missing. Receipt stays locked."
    );
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFailureCode
```

Expected:

```text
FAIL because liveFailureCode.ts does not exist.
```

- [ ] **Step 3: Implement bounded failure code mapping**

Create `apps/web/src/lib/verifier/liveFailureCode.ts` with:

```typescript
export const LIVE_FAILURE_CODES = [
  "SIGNER_MISMATCH",
  "INTENT_HASH_MISMATCH",
  "TARGET_MISMATCH",
  "SPENDER_MISMATCH",
  "AMOUNT_MISMATCH",
  "ALLOWANCE_EXCEEDED",
  "TX_FAILED",
  "EXPIRED",
  "MISSING_REQUIRED_LOG",
  "UNDER_CONFIRMED"
] as const;

export type LiveFailureCode = (typeof LIVE_FAILURE_CODES)[number];

const RAW_TO_CODE = new Map<string, LiveFailureCode>([
  ["RECEIPT_REVERTED", "TX_FAILED"],
  ["TX_FAILED", "TX_FAILED"],
  ["TX_HASH_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["WALLET_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["SELECTOR_MISMATCH", "TARGET_MISMATCH"],
  ["ASSET_MISMATCH", "TARGET_MISMATCH"],
  ["DEPOSIT_CALL_INVALID", "TARGET_MISMATCH"],
  ["APPROVAL_LOG_MISSING", "MISSING_REQUIRED_LOG"],
  ["APPROVAL_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["TRANSFER_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["DEPOSIT_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["TARGET_MISMATCH", "TARGET_MISMATCH"],
  ["SPENDER_MISMATCH", "SPENDER_MISMATCH"],
  ["AMOUNT_MISMATCH", "AMOUNT_MISMATCH"],
  ["ALLOWANCE_EXCEEDED", "ALLOWANCE_EXCEEDED"],
  ["EXPIRED", "EXPIRED"],
  ["SIGNER_MISMATCH", "SIGNER_MISMATCH"],
  ["INTENT_HASH_MISMATCH", "INTENT_HASH_MISMATCH"],
  ["UNDER_CONFIRMED", "UNDER_CONFIRMED"]
]);

export function toBoundedFailureCode(raw: string | null): LiveFailureCode | null {
  if (raw === null) return null;
  return RAW_TO_CODE.get(raw) ?? "MISSING_REQUIRED_LOG";
}

export function failureCodeDisplayCopy(code: LiveFailureCode): string {
  return {
    SIGNER_MISMATCH: "Manifest signer did not match the configured campaign signer. Receipt stays locked.",
    INTENT_HASH_MISMATCH: "Manifest hash did not match the stored run. Receipt stays locked.",
    TARGET_MISMATCH: "Transaction target evidence did not match the manifest. Receipt stays locked.",
    SPENDER_MISMATCH: "Allowance spender evidence did not match the manifest. Receipt stays locked.",
    AMOUNT_MISMATCH: "Deposit amount evidence did not match the manifest. Receipt stays locked.",
    ALLOWANCE_EXCEEDED: "Allowance evidence exceeded the manifest bound. Receipt stays locked.",
    TX_FAILED: "The standard RPC receipt shows the transaction failed. Receipt stays locked.",
    EXPIRED: "The deposit confirmed after the manifest expiry. Receipt stays locked.",
    MISSING_REQUIRED_LOG: "Required standard RPC receipt evidence was missing. Receipt stays locked.",
    UNDER_CONFIRMED: "The transaction has not reached the required standard RPC confirmation depth. Receipt stays locked."
  }[code];
}
```

Use `failureCode` in API and UI responses while keeping raw internal details out of public copy.

- [ ] **Step 4: Run passing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFailureCode liveApi live
node --check apps/web/public/live-flow.js
```

Expected:

```text
PASS failure code, API, live UI tests, and JS syntax check.
```

**Exit condition:** public verifier failure output uses bounded codes and safe display copy.

## Task 8: Live Verifier Integration with Commercial Gate

**Files:**

- Modify: `apps/web/src/lib/live/commercialReceiptGate.ts`
- Modify: `apps/web/src/lib/live/commercialReceiptGate.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/partner/partnerSummary.ts`
- Modify: `apps/web/src/lib/partner/partnerSummary.test.ts`

- [ ] **Step 1: Write failing gate replay tests**

Add to `apps/web/src/lib/live/commercialReceiptGate.test.ts`:

```typescript
it("stays closed when receipt hash does not recompute from canonical payload", () => {
  const result = evaluateCommercialReceiptGate({
    run: matchedRun,
    decision: matchedDecision,
    receipt: {
      ...matchedReceipt,
      canonicalPayload: "{\"status\":\"matched\",\"tampered\":true}"
    },
    verifierInput: matchedVerifierInput,
    replay: { requireHashRecomputation: true }
  });

  expect(result.open).toBe(false);
  expect(result.reason).toBe("receipt_hash_recompute_mismatch");
});

it("stays closed when verifier input hash does not recompute", () => {
  const result = evaluateCommercialReceiptGate({
    run: matchedRun,
    decision: matchedDecision,
    receipt: matchedReceipt,
    verifierInput: {
      ...matchedVerifierInput,
      canonicalPayload: "{\"schemaVersion\":\"1\",\"tampered\":true}"
    },
    replay: { requireHashRecomputation: true }
  });

  expect(result.open).toBe(false);
  expect(result.reason).toBe("verifier_input_hash_mismatch");
});
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate liveApi partnerSummary
```

Expected:

```text
FAIL until commercial gate accepts verifier input replay data and API supplies it.
```

- [ ] **Step 3: Implement replay-aware commercial gate**

Extend gate input with:

```typescript
verifierInput?: VerifierInputRecord;
replay?: {
  requireHashRecomputation: boolean;
};
```

Add reasons:

```typescript
| "receipt_hash_recompute_mismatch"
| "receipt_payload_bytes_mismatch"
| "verifier_input_missing"
| "verifier_input_hash_mismatch"
| "verifier_input_bytes_mismatch"
```

When replay is required:

- parse receipt payload and recompute `canonicalReceiptPayload`, bytes, and `computeReceiptHash`
- recompute `canonicalVerifierInputPayloadBytesHex` from stored canonical verifier payload where possible
- compare `verifierInput.verifierInputHash` with `decision.verifierInputHash`
- require `verifierInput.runId === run.runId`

In `liveApi.ts`, load `store.getVerifierInput(decision.verifierInputHash)` and pass it to the gate.

In `partnerSummary.ts`, keep matched KPI counts tied to gate-passed evidence where live verifier records are present.

- [ ] **Step 4: Run passing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate liveApi partnerSummary
```

Expected:

```text
PASS commercial gate, API, and partner summary tests.
```

**Exit condition:** receipt API, snapshot export, and partner metrics can be locked by replay failure even when run, decision, and receipt rows exist.

## Task 9: Snapshot and Export Evidence Recomputability

**Files:**

- Modify: `apps/web/src/lib/live/liveDemoSnapshot.ts`
- Modify: `apps/web/src/lib/live/liveDemoSnapshot.test.ts`
- Modify: `apps/web/scripts/export-live-demo-snapshot.mjs`
- Modify: `apps/web/scripts/export-flow-data.mjs`
- Create: `apps/web/src/lib/verifier/publicArtifactGuard.ts`
- Create: `apps/web/src/lib/verifier/publicArtifactGuard.test.ts`
- Modify: `docs/evidence/live-demo-sprint12-snapshot.schema.md`

- [ ] **Step 1: Write failing snapshot replay and guard tests**

Create `apps/web/src/lib/verifier/publicArtifactGuard.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { assertPublicArtifactSafe } from "./publicArtifactGuard.ts";

describe("public artifact guard", () => {
  it("allows public evidence hashes and addresses", () => {
    expect(() =>
      assertPublicArtifactSafe({
        receiptHash: `0x${"a".repeat(64)}`,
        wallet: "0x1111111111111111111111111111111111111111",
        note: "mock testnet deposit evidence"
      })
    ).not.toThrow();
  });

  it("rejects secret-like keys even with synthetic values", () => {
    expect(() =>
      assertPublicArtifactSafe({
        apiKey: "example"
      })
    ).toThrow("public artifact contains blocked key");
  });

  it("rejects forbidden public claims", () => {
    expect(() =>
      assertPublicArtifactSafe({
        copy: "guarantee " + "safety"
      })
    ).toThrow("public artifact contains blocked claim");
  });
});
```

Add to `apps/web/src/lib/live/liveDemoSnapshot.test.ts`:

```typescript
it("exports canonical verifier input replay fields", () => {
  const snapshot = buildLiveDemoSnapshot(buildMatchedSnapshotInputWithVerifierInput());

  expect(snapshot.verifier).toMatchObject({
    verifierInputHash: `0x${"9".repeat(64)}`,
    canonicalVerifierInputPayload: expect.any(String),
    canonicalVerifierInputPayloadBytesHex: expect.stringMatching(/^0x[0-9a-f]+$/u)
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicArtifactGuard liveDemoSnapshot
```

Expected:

```text
FAIL until public artifact guard and verifier replay snapshot fields exist.
```

- [ ] **Step 3: Implement export guard and replay fields**

Create `apps/web/src/lib/verifier/publicArtifactGuard.ts`:

```typescript
const BLOCKED_KEY_PATTERN = new RegExp(
  ["private[_-]?key", "mnem" + "onic", "seed ph" + "rase", "bear" + "er", "api[_-]?ke" + "y", "access[_-]?tok" + "en", "author" + "ization", "rpc[_-]?tok" + "en", "process\\.env", "\\.env"].join("|"),
  "i"
);
const BLOCKED_CLAIM_PATTERN = new RegExp(
  [("instant final" + "ity"), ("200ms confirm" + "ed"), ("guarantee safe" + "ty"), ("perform K" + "YC"), ("real R" + "WA"), ("real y" + "ield"), ("real f" + "unds"), ("payment set" + "tled")].join("|"),
  "i"
);

export function assertPublicArtifactSafe(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("public artifact is not serializable");
  if (BLOCKED_CLAIM_PATTERN.test(serialized)) throw new Error("public artifact contains blocked claim");

  const scan = (entry: unknown): void => {
    if (Array.isArray(entry)) {
      for (const item of entry) scan(item);
      return;
    }
    if (entry !== null && typeof entry === "object") {
      for (const [key, child] of Object.entries(entry)) {
        if (BLOCKED_KEY_PATTERN.test(key)) throw new Error("public artifact contains blocked key");
        scan(child);
      }
    }
  };
  scan(value);
}
```

Call `assertPublicArtifactSafe` before writing:

- `apps/web/scripts/export-flow-data.mjs`
- `apps/web/scripts/export-live-demo-snapshot.mjs`

Extend live demo snapshot `verifier` object with:

- `canonicalVerifierInputPayload`
- `canonicalVerifierInputPayloadBytesHex`
- component snapshot hashes

Update `docs/evidence/live-demo-sprint12-snapshot.schema.md` to document the new Sprint 14 fields and replay rule.

- [ ] **Step 4: Run passing tests and syntax checks**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicArtifactGuard liveDemoSnapshot
node --check apps/web/scripts/export-flow-data.mjs
node --check apps/web/scripts/export-live-demo-snapshot.mjs
```

Expected:

```text
PASS artifact guard, snapshot tests, and script syntax checks.
```

**Exit condition:** exported public artifacts fail closed if unsafe or not replayable.

## Task 10: Optional `IntentRailV2` Anchor Decision Section

**Files:**

- Create: `docs/superpowers/specs/2026-06-19-intentrail-v2-decision-anchor-design.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`
- Modify: `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`

- [ ] **Step 1: Write the decision doc**

Create `docs/superpowers/specs/2026-06-19-intentrail-v2-decision-anchor-design.md`:

```markdown
# IntentRailV2 Decision Anchor Design

## Scope

This document defines when a future `IntentRailV2` decision anchor is useful. It does not authorize contract implementation, deployment, funding, or verifier transactions.

## Current Boundary

Sprint 11 and Sprint 12 live verifier decisions are local standard RPC verifier decisions with `decisionTxHash: null`.

Sprint 14 commercial readiness can be satisfied off-chain when public evidence can recompute `intentHash`, `verifierInputHash`, and `receiptHash`.

## When V2 Is Needed

Use `IntentRailV2` only if a partner pilot requires public on-chain anchoring of the verifier decision identity in addition to the public receipt snapshot.

## Minimum Event Shape

```solidity
event IntentDecisionAnchored(
    bytes32 indexed intentHash,
    bytes32 indexed verifierInputHash,
    address indexed wallet,
    bytes32 receiptHash,
    bytes32 approveTxHash,
    bytes32 depositTxHash,
    uint256 depositBlockNumber,
    bytes32 depositBlockHash,
    uint256 allowanceUsedBaseUnits,
    bytes32 status,
    bytes32 failureReason,
    uint256 decidedAt
);
```

## Rules

- `verifierInputHash` must be nonzero.
- `MATCHED`, `MISMATCHED`, and `FAILED` are terminal.
- `timeout` remains off-chain and non-terminal.
- `receiptHash` is nonzero only for `MATCHED`.
- human-readable failure copy stays off-chain.
- this event does not custody assets, issue assets, produce yield, settle payments, run identity checks, prevent phishing, or make safety guarantees.
```

- [ ] **Step 2: Link decision doc**

Add to `docs/implementation/giwa-commercial-readiness-gate.md`:

```markdown
## Optional Decision Anchor

The commercial pilot does not require an on-chain decision anchor when public evidence can recompute `intentHash`, `verifierInputHash`, and `receiptHash`.

If a future pilot enables an anchor, the gate must also check that the anchored `verifierInputHash` equals the stored verifier input hash.
```

Add to `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`:

```markdown
## Optional Decision Anchor

Local live verifier evidence may use `decisionTxHash: null`.

If an optional decision anchor exists, evidence should include `decisionAnchor.intentHash`, `decisionAnchor.verifierInputHash`, `decisionAnchor.status`, `decisionAnchor.receiptHash`, and `decisionAnchor.txHash`.
```

- [ ] **Step 3: Run doc scan**

Run:

```powershell
rg -n "IntentRailV2|decisionAnchor|verifierInputHash" docs\superpowers\specs\2026-06-19-intentrail-v2-decision-anchor-design.md docs\implementation\giwa-commercial-readiness-gate.md docs\evidence\giwa-sepolia-mvp-evidence.schema.md
```

Expected:

```text
Decision anchor references are present and state that Sprint 14 does not deploy contracts.
```

**Exit condition:** the optional anchor decision is documented without contract edits or transaction execution.

## Task 11: Regression and Safe Scans

**Files:**

- Verify Sprint 14 changes.

- [ ] **Step 1: Run focused verifier tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- manifest
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate liveDemoSnapshot partnerSummary
```

Expected:

```text
Verifier, manifest, receipt gate, snapshot, and partner tests pass.
```

- [ ] **Step 2: Run package checks**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/export-live-demo-snapshot.mjs
```

Expected:

```text
All commands exit 0.
```

- [ ] **Step 3: Run safe scans without reading real env files**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("payment set" + "tled")
$secretSurfacePattern = "private" + "Key|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|author" + "ization|NEXT" + "_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"

rg -n $docPattern docs\superpowers\plans\2026-06-19-sprint-14-verifier-trust-hardening.md docs\superpowers\specs\2026-06-19-intentrail-v2-decision-anchor-design.md docs\implementation apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"

rg -n $riskPattern docs\superpowers\plans\2026-06-19-sprint-14-verifier-trust-hardening.md docs\superpowers\specs\2026-06-19-intentrail-v2-decision-anchor-design.md docs\implementation apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"

rg -n $secretSurfacePattern docs\superpowers\plans\2026-06-19-sprint-14-verifier-trust-hardening.md docs\superpowers\specs\2026-06-19-intentrail-v2-decision-anchor-design.md docs\implementation apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
```

Expected:

```text
Unfinished-marker matches are zero.
Risk-phrase matches appear only in explicit guardrail, non-goal, or stop-condition text.
Secret-surface matches appear only in explicit redaction policy or scan pattern text.
No real env file content is printed.
```

**Exit condition:** Sprint 14 passes focused tests, full package checks, syntax checks, and safe scans.

## Sprint 14 Exit Gate

Sprint 14 is complete only when:

- live verifier checks manifest signer and deployed `IntentRail` EIP-712 domain
- stored run `intentHash` is recomputed from normalized `manifestJson`
- standard RPC snapshot includes raw tx, raw receipt, raw log, head block, and deposit block timestamp evidence
- decoded logs are derived from raw standard RPC receipt logs and bound to tx hash, block number, block hash, and contract address
- confirmation depth and expiry policy use standard RPC data
- amount and allowance policy are explicit and tested
- verifier failure output uses bounded public failure codes
- canonical verifier input payload, bytes, and hash are persisted or exported
- receipt hash and verifier input hash can be recomputed from public evidence
- commercial receipt gate keeps receipt API, snapshot export, and partner metrics locked when replay checks fail
- optional `IntentRailV2` anchor decision is documented without contract deployment
- no dependency is installed
- no wallet secret is requested
- no wallet tx, deploy, fund, anchor, verify, or mint command is run
- real env files are not content-scanned
- Flashblocks remains non-final fast feedback only
- Sprint 7 static fallback, Sprint 12 live rehearsal path, and Sprint 13 commercial receipt gate remain preserved

## Handoff

Sprint 14 completion report must include:

- files changed
- commands run and results
- whether code changes were limited to verifier trust, replay evidence, failure code, export guard, and docs
- confirmation that no dependency was installed
- confirmation that no wallet secret was requested
- confirmation that wallet tx, deploy, fund, anchor, verify, and mint commands were not run
- confirmation that real env files were not content-scanned
- verifier trust hardening summary
- replay evidence paths
- optional `IntentRailV2` decision
- unresolved risks
- recommended next sprint:

```text
docs/superpowers/plans/2026-06-19-sprint-15-hosted-api-foundation.md
```

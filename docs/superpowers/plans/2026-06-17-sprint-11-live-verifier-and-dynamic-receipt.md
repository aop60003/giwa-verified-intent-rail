# Sprint 11 Live Verifier and Dynamic Receipt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify live `depositTxHash` values from the local live DB through GIWA Sepolia standard RPC, deterministically match the deposit against the signed manifest, create a recomputable receipt only for matched evidence, and unlock the live receipt route.

**Architecture:** Sprint 11 stays inside the local live runtime introduced in Sprint 8. It reuses the Sprint 4 verifier and protocol hash rules, adds a live standard RPC snapshot boundary, persists terminal verifier decisions in `liveStore`, and serves dynamic receipts from `/api/receipts/:receiptHash`. Browser wallet transaction sending remains the Sprint 10 layer. Chain-side verifier decision writes are explicitly gated out of the default Sprint 11 path.

**Tech Stack:** TypeScript 6, Vitest 4, viem 2, existing Node HTTP live server, existing `node:sqlite` store adapter, existing dependency-free static UI. No new dependency is allowed.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-17-giwa-live-mvp-architecture-cutover-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-17-sprint-8-local-live-architecture-cutover.md`
- `docs/superpowers/plans/2026-06-17-sprint-9-wallet-and-manifest-issuance.md`
- `docs/superpowers/plans/2026-06-17-sprint-10-live-approve-and-deposit.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`
- `apps/web/src/lib/live`
- `apps/web/src/lib/transaction`
- `apps/web/src/lib/wallet`
- `apps/web/src/lib/verifier`
- `packages/protocol/src`

## Sprint 11 Boundary

Allowed:

- read a submitted `depositTxHash` from the live store
- query GIWA Sepolia standard RPC for transaction, transaction receipt, and current block number
- record `blockNumber`, `blockHash`, `confirmationDepth`, and hashable RPC snapshots
- decode `deposit(address,uint256)`, `Approval`, `Transfer`, and `MockDeposit`
- verify manifest signer, wallet, target, asset, amount, spender, receipt status, decoded logs, and confirmation depth
- persist `matched`, `mismatched`, or `failed` verifier decisions
- create a `receiptHash` only for `matched`
- serve matched dynamic receipts from `/api/receipts/:receiptHash`
- update `/live` so the receipt link unlocks only after `matched`

Not allowed:

- read or print `.env`, `.env.local`, wallet export files, or raw secret values
- ask for a user wallet secret
- run `deploy:giwa`, `fund:giwa`, or `anchor:giwa`
- add dependencies
- treat Flashblocks observations as final confirmation
- expand into Sprint 12 submission polish or partner hardening
- break Sprint 7 static fallback, Sprint 8 mock mode, Sprint 9 manifest issuance, or Sprint 10 approve/deposit behavior

## Decision Transaction Policy

Sprint 11 default behavior is local verifier decision plus dynamic receipt. It does not emit a new verifier decision transaction.

Reasoning:

- The Sprint 10 live flow already has the user wallet deposit transaction.
- The Sprint 11 exit gate asks for standard RPC verification, receipt hash creation, and dynamic route unlock.
- Adding a verifier operator chain write requires a separate key path, gas funding check, replay/idempotency policy, and operator approval.

Implementation rule:

- `POST /api/runs/:runId/verify` must not send a chain transaction by default.
- Decision records must allow `decisionTxHash: null` for the Sprint 11 local verifier decision path.
- If a later sprint adds an on-chain decision write, it must be behind a new explicit runtime gate and user approval.

## File Structure

Create:

- `apps/web/src/lib/verifier/liveVerifierInput.ts`
- `apps/web/src/lib/verifier/liveVerifierInput.test.ts`
- `apps/web/src/lib/verifier/standardRpcReceiptClient.ts`
- `apps/web/src/lib/verifier/standardRpcReceiptClient.test.ts`
- `apps/web/src/lib/verifier/depositReceiptDecoder.ts`
- `apps/web/src/lib/verifier/depositReceiptDecoder.test.ts`
- `apps/web/src/lib/verifier/matchLiveDeposit.ts`
- `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`
- `apps/web/src/lib/verifier/liveReceiptBuilder.ts`
- `apps/web/src/lib/verifier/liveReceiptBuilder.test.ts`
- `apps/web/src/lib/verifier/liveVerifierService.ts`
- `apps/web/src/lib/verifier/liveVerifierService.test.ts`

Modify:

- `apps/web/src/lib/live/liveTypes.ts`
- `apps/web/src/lib/live/liveTypes.test.ts`
- `apps/web/src/lib/live/liveStore.ts`
- `apps/web/src/lib/live/liveStore.test.ts`
- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveApi.test.ts`
- `apps/web/src/lib/transaction/liveTransactionState.ts`
- `apps/web/src/lib/transaction/liveTransactionState.test.ts`
- `apps/web/public/live-flow.js`
- `apps/web/scripts/serve-live.mjs`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`

Do not modify:

- `packages/contracts` deploy, fund, anchor, or verify scripts
- Sprint 7 fixture evidence except through static fallback regression checks
- `.env`, `.env.local`, or local wallet files

## Task 1: Sprint 11 Runtime Boundary Doc Update

**Files:**

- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`

- [ ] **Step 1: Write the failing doc regression check**

Run before editing:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n "Sprint 11 Live Verifier" docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
rg -n $docPattern docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
```

Expected:

```text
The Sprint 11 section is absent.
No unfinished-marker matches are introduced.
```

- [ ] **Step 2: Add Sprint 11 runtime boundary**

Append this section to `docs/implementation/giwa-live-mvp-runtime-gate.md`:

```markdown
## Sprint 11 Live Verifier Boundary

Sprint 11 verifies live deposit transaction hashes through GIWA Sepolia standard RPC and unlocks dynamic receipts only after deterministic verifier match.

Allowed standard RPC reads:

- `eth_getTransactionByHash`
- `eth_getTransactionReceipt`
- `eth_blockNumber`

Required verifier inputs:

- stored live run and signed manifest
- stored `depositTxHash`
- optional stored `approveTxHash`
- standard RPC transaction snapshot
- standard RPC receipt snapshot
- decoded deposit log snapshots
- confirmation depth computed from standard RPC head block

Sprint 11 does not emit a new verifier decision transaction by default. Decision records may contain `decisionTxHash: null` for local verifier decisions.

Flashblocks observations remain fast feedback only and are excluded from final verifier confirmation.
```

Append this section to `docs/implementation/giwa-mvp-runbook.md`:

```markdown
## Sprint 11 Live Verify and Receipt

Start the live server:

```powershell
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
http://127.0.0.1:4177/live
```

After a wallet submits the deposit and the live API stores `depositTxHash`, press Verify. The server reads GIWA Sepolia standard RPC, checks the deposit receipt and decoded logs, and unlocks the receipt only for `matched`.

Stop if:

- standard RPC chain id is not GIWA Sepolia `91342`
- the receipt is missing or has failed status
- transaction `from`, `to`, calldata, asset, amount, spender, or decoded logs do not match the manifest
- confirmation depth is below the configured threshold
- the app attempts to use Flashblocks as final confirmation
- the app attempts a verifier decision transaction without a separate approval gate
```

- [ ] **Step 3: Verify docs**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("payment set" + "tled")
rg -n $docPattern docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
rg -n $riskPattern docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
```

Expected:

```text
No matches in the new Sprint 11 sections.
```

## Task 2: Live Verifier Input Model and Tests

**Files:**

- Create: `apps/web/src/lib/verifier/liveVerifierInput.ts`
- Create: `apps/web/src/lib/verifier/liveVerifierInput.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/verifier/liveVerifierInput.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildLiveVerifierInput } from "./liveVerifierInput.ts";

const run = {
  runId: "run-1",
  wallet: "0x1111111111111111111111111111111111111111",
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  intentHash: `0x${"a".repeat(64)}`,
  manifestJson: JSON.stringify({
    manifestVersion: "1",
    chainId: 91342,
    nonce: "nonce-1",
    expiryUnix: 1790003600,
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    wallet: "0x1111111111111111111111111111111111111111",
    actionType: "mockVaultDeposit",
    target: "0x2222222222222222222222222222222222222222",
    selector: "0x47e7ef24",
    asset: "0x3333333333333333333333333333333333333333",
    amountBaseUnits: "1000000000000000000",
    spender: "0x2222222222222222222222222222222222222222",
    maxAllowanceBaseUnits: "1000000000000000000"
  }),
  manifestSignature: `0x${"b".repeat(130)}`,
  expiryUnix: 1790003600,
  status: "depositSubmitted"
};

describe("live verifier input", () => {
  it("combines a live run and submitted tx into normalized verifier input", () => {
    const input = buildLiveVerifierInput({
      run,
      submittedTx: {
        runId: "run-1",
        approveTxHash: `0x${"c".repeat(64)}`,
        depositTxHash: `0x${"d".repeat(64)}`,
        submittedAt: "2026-06-17T00:00:00.000Z"
      }
    });

    expect(input.manifest.intentHash).toBe(run.intentHash);
    expect(input.depositTxHash).toBe(`0x${"d".repeat(64)}`);
    expect(input.approveTxHash).toBe(`0x${"c".repeat(64)}`);
  });

  it("rejects runs without a submitted deposit hash", () => {
    expect(() => buildLiveVerifierInput({ run, submittedTx: undefined })).toThrow("deposit tx hash is required");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveVerifierInput
```

Expected:

```text
FAIL because liveVerifierInput.ts does not exist.
```

- [ ] **Step 3: Implement the input model**

Create `apps/web/src/lib/verifier/liveVerifierInput.ts`:

```typescript
import type { ActionManifest, Hex } from "../../../../../packages/protocol/src/index.ts";
import { normalizeBytes32 } from "../../../../../packages/protocol/src/validation.ts";
import type { LiveRunRecord, SubmittedTxRecord } from "../live/liveTypes.ts";

export type LiveVerifierInput = {
  runId: string;
  manifest: ActionManifest;
  manifestSignature: Hex;
  intentHash: Hex;
  approveTxHash: Hex | null;
  depositTxHash: Hex;
};

export function buildLiveVerifierInput(input: {
  run: Pick<LiveRunRecord, "runId" | "manifestJson" | "manifestSignature" | "intentHash">;
  submittedTx: SubmittedTxRecord | undefined;
}): LiveVerifierInput {
  if (input.submittedTx === undefined) throw new Error("deposit tx hash is required");
  if (input.submittedTx.runId !== input.run.runId) throw new Error("submitted tx runId mismatch");

  const manifest = JSON.parse(input.run.manifestJson) as ActionManifest;
  const depositTxHash = normalizeBytes32(input.submittedTx.depositTxHash, "depositTxHash");
  const approveTxHash =
    input.submittedTx.approveTxHash === null ? null : normalizeBytes32(input.submittedTx.approveTxHash, "approveTxHash");

  return {
    runId: input.run.runId,
    manifest,
    manifestSignature: input.run.manifestSignature as Hex,
    intentHash: normalizeBytes32(input.run.intentHash, "intentHash"),
    approveTxHash,
    depositTxHash
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveVerifierInput
```

Expected:

```text
PASS liveVerifierInput.test.ts
```

## Task 3: Standard RPC Receipt Client Boundary and Tests

**Files:**

- Create: `apps/web/src/lib/verifier/standardRpcReceiptClient.ts`
- Create: `apps/web/src/lib/verifier/standardRpcReceiptClient.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/verifier/standardRpcReceiptClient.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { createStandardRpcReceiptClient, snapshotDepositTransaction } from "./standardRpcReceiptClient.ts";

describe("standard RPC receipt client", () => {
  it("collects transaction, receipt, head block, and confirmation depth", async () => {
    const client = createStandardRpcReceiptClient({
      chainId: 91342,
      timeoutMs: 1000,
      transport: {
        async getChainId() {
          return 91342;
        },
        async getTransaction() {
          return { hash: `0x${"a".repeat(64)}`, from: "0x1111111111111111111111111111111111111111", to: "0x2222222222222222222222222222222222222222", input: "0x47e7ef24", value: 0n };
        },
        async getTransactionReceipt() {
          return { status: "success", blockNumber: 10n, blockHash: `0x${"b".repeat(64)}`, logs: [] };
        },
        async getBlockNumber() {
          return 13n;
        }
      }
    });

    const snapshot = await snapshotDepositTransaction(client, `0x${"a".repeat(64)}`);

    expect(snapshot.chainId).toBe(91342);
    expect(snapshot.confirmationDepth).toBe(4);
    expect(snapshot.receipt.status).toBe("success");
  });

  it("rejects wrong chain before returning snapshots", async () => {
    const client = createStandardRpcReceiptClient({
      chainId: 91342,
      timeoutMs: 1000,
      transport: {
        async getChainId() {
          return 1;
        },
        async getTransaction() {
          throw new Error("not reached");
        },
        async getTransactionReceipt() {
          throw new Error("not reached");
        },
        async getBlockNumber() {
          throw new Error("not reached");
        }
      }
    });

    await expect(snapshotDepositTransaction(client, `0x${"a".repeat(64)}`)).rejects.toThrow("standard RPC chainId mismatch");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- standardRpcReceiptClient
```

Expected:

```text
FAIL because standardRpcReceiptClient.ts does not exist.
```

- [ ] **Step 3: Implement the standard RPC boundary**

Create `apps/web/src/lib/verifier/standardRpcReceiptClient.ts`:

```typescript
import { createPublicClient, http, type Hex } from "viem";

export type StandardRpcTransport = {
  getChainId(): Promise<number>;
  getTransaction(args: { hash: Hex }): Promise<unknown>;
  getTransactionReceipt(args: { hash: Hex }): Promise<unknown>;
  getBlockNumber(): Promise<bigint>;
};

export type StandardRpcReceiptClient = {
  expectedChainId: 91342;
  timeoutMs: number;
  transport: StandardRpcTransport;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    })
  ]);
}

export function createStandardRpcReceiptClient(input: {
  rpcUrl?: string;
  chainId?: 91342;
  timeoutMs?: number;
  transport?: StandardRpcTransport;
}): StandardRpcReceiptClient {
  const expectedChainId = input.chainId ?? 91342;
  const timeoutMs = input.timeoutMs ?? 15000;
  const transport =
    input.transport ??
    createPublicClient({
      transport: http(input.rpcUrl)
    });

  return { expectedChainId, timeoutMs, transport };
}

export async function snapshotDepositTransaction(client: StandardRpcReceiptClient, depositTxHash: Hex) {
  const chainId = await withTimeout(client.transport.getChainId(), client.timeoutMs, "getChainId");
  if (chainId !== client.expectedChainId) {
    throw new Error("standard RPC chainId mismatch");
  }

  const [transaction, receipt, headBlockNumber] = await Promise.all([
    withTimeout(client.transport.getTransaction({ hash: depositTxHash }), client.timeoutMs, "getTransaction"),
    withTimeout(client.transport.getTransactionReceipt({ hash: depositTxHash }), client.timeoutMs, "getTransactionReceipt"),
    withTimeout(client.transport.getBlockNumber(), client.timeoutMs, "getBlockNumber")
  ]);

  const receiptBlockNumber = (receipt as { blockNumber?: bigint }).blockNumber;
  if (typeof receiptBlockNumber !== "bigint") throw new Error("receipt blockNumber is missing");
  const confirmationDepth = Number(headBlockNumber - receiptBlockNumber + 1n);

  return { chainId, transaction, receipt, headBlockNumber: Number(headBlockNumber), confirmationDepth };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- standardRpcReceiptClient
```

Expected:

```text
PASS standardRpcReceiptClient.test.ts
```

## Task 4: Deposit Receipt and Log Decoder Tests

**Files:**

- Create: `apps/web/src/lib/verifier/depositReceiptDecoder.ts`
- Create: `apps/web/src/lib/verifier/depositReceiptDecoder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/verifier/depositReceiptDecoder.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { encodeEventTopics, encodeFunctionData, parseAbi } from "viem";

import { decodeDepositCall, decodeDepositReceiptLogs } from "./depositReceiptDecoder.ts";

const vaultAbi = parseAbi(["function deposit(address asset,uint256 amount)", "event MockDeposit(address indexed wallet,address indexed asset,uint256 amount)"]);
const tokenAbi = parseAbi(["event Approval(address indexed owner,address indexed spender,uint256 amount)", "event Transfer(address indexed from,address indexed to,uint256 amount)"]);

describe("deposit receipt decoder", () => {
  it("decodes deposit calldata and required receipt logs", () => {
    const wallet = "0x1111111111111111111111111111111111111111";
    const target = "0x2222222222222222222222222222222222222222";
    const asset = "0x3333333333333333333333333333333333333333";
    const amount = 1000000000000000000n;
    const input = encodeFunctionData({ abi: vaultAbi, functionName: "deposit", args: [asset, amount] });

    expect(decodeDepositCall(input)).toEqual({
      selector: "0x47e7ef24",
      asset,
      amountBaseUnits: amount.toString()
    });

    const decoded = decodeDepositReceiptLogs([
      {
        address: asset,
        logIndex: 0,
        topics: encodeEventTopics({ abi: tokenAbi, eventName: "Approval", args: { owner: wallet, spender: target } }),
        data: `0x${amount.toString(16).padStart(64, "0")}`
      },
      {
        address: asset,
        logIndex: 1,
        topics: encodeEventTopics({ abi: tokenAbi, eventName: "Transfer", args: { from: wallet, to: target } }),
        data: `0x${amount.toString(16).padStart(64, "0")}`
      },
      {
        address: target,
        logIndex: 2,
        topics: encodeEventTopics({ abi: vaultAbi, eventName: "MockDeposit", args: { wallet, asset } }),
        data: `0x${amount.toString(16).padStart(64, "0")}`
      }
    ]);

    expect(decoded.map((entry) => entry.eventName)).toEqual(["Approval", "Transfer", "MockDeposit"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- depositReceiptDecoder
```

Expected:

```text
FAIL because depositReceiptDecoder.ts does not exist.
```

- [ ] **Step 3: Implement decoders**

Implement with `viem` `decodeFunctionData` and `decodeEventLog`. Use these ABI entries:

```typescript
const vaultAbi = parseAbi([
  "function deposit(address asset,uint256 amount)",
  "event MockDeposit(address indexed wallet,address indexed asset,uint256 amount)"
]);
const tokenAbi = parseAbi([
  "event Approval(address indexed owner,address indexed spender,uint256 amount)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)"
]);
```

Implementation requirements:

- `decodeDepositCall(input)` returns selector, asset, and amount string.
- `decodeDepositReceiptLogs(logs)` returns only recognized `Approval`, `Transfer`, and `MockDeposit` logs.
- Returned log snapshots must include `eventName`, `contractAddress`, `logIndex`, `topics`, and stringified args.
- Unknown logs are ignored.
- Malformed logs must not be silently accepted; throw with event context.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- depositReceiptDecoder
```

Expected:

```text
PASS depositReceiptDecoder.test.ts
```

## Task 5: Manifest-vs-Deposit Matching Tests

**Files:**

- Create: `apps/web/src/lib/verifier/matchLiveDeposit.ts`
- Create: `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { matchLiveDeposit } from "./matchLiveDeposit.ts";

const manifest = {
  manifestVersion: "1",
  chainId: 91342,
  nonce: "nonce-1",
  expiryUnix: 1790003600,
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  wallet: "0x1111111111111111111111111111111111111111",
  actionType: "mockVaultDeposit",
  target: "0x2222222222222222222222222222222222222222",
  selector: "0x47e7ef24",
  asset: "0x3333333333333333333333333333333333333333",
  amountBaseUnits: "1000000000000000000",
  spender: "0x2222222222222222222222222222222222222222",
  maxAllowanceBaseUnits: "1000000000000000000"
};

const decodedLogSnapshots = [
  { eventName: "Approval", contractAddress: manifest.asset, logIndex: 0, args: { owner: manifest.wallet, spender: manifest.spender, amount: manifest.maxAllowanceBaseUnits } },
  { eventName: "Transfer", contractAddress: manifest.asset, logIndex: 1, args: { from: manifest.wallet, to: manifest.target, amount: manifest.amountBaseUnits } },
  { eventName: "MockDeposit", contractAddress: manifest.target, logIndex: 2, args: { wallet: manifest.wallet, asset: manifest.asset, amount: manifest.amountBaseUnits } }
];

describe("live deposit matcher", () => {
  it("matches successful standard RPC receipt evidence against the manifest", () => {
    const result = matchLiveDeposit({
      manifest,
      depositTxHash: `0x${"d".repeat(64)}`,
      approveTxHash: `0x${"c".repeat(64)}`,
      confirmationDepth: 3,
      minimumConfirmationDepth: 1,
      transaction: {
        hash: `0x${"d".repeat(64)}`,
        from: manifest.wallet,
        to: manifest.target,
        input: ["0x47e7ef24", "0".repeat(24), manifest.asset.slice(2), "0".repeat(47), "de0b6b3a7640000"].join(""),
        value: 0n
      },
      receipt: {
        status: "success",
        blockNumber: 10n,
        blockHash: `0x${"e".repeat(64)}`
      },
      decodedLogSnapshots
    });

    expect(result.decision).toBe("matched");
    expect(result.failureReason).toBeNull();
    expect(result.matchedFields).toContain("mockDepositLog");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- matchLiveDeposit
```

Expected:

```text
FAIL because matchLiveDeposit.ts does not exist.
```

- [ ] **Step 3: Implement matcher**

Create `apps/web/src/lib/verifier/matchLiveDeposit.ts` and keep it pure. It must:

- require receipt `status === "success"`
- require `confirmationDepth >= minimumConfirmationDepth`
- require transaction hash equals stored deposit hash
- require transaction `from` equals manifest wallet
- require transaction `to` equals manifest target
- decode calldata and require selector, asset, and amount match manifest
- require `Approval.owner`, `Approval.spender`, and allowance bound
- require `Transfer.from`, `Transfer.to`, and amount match deposit calldata
- require `MockDeposit.wallet`, `MockDeposit.asset`, and amount match deposit calldata
- return `{ decision: "matched", failureReason: null, matchedFields }` only when every required condition passes

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- matchLiveDeposit
```

Expected:

```text
PASS matchLiveDeposit.test.ts
```

## Task 6: Mismatch and Failure Status Handling Tests

**Files:**

- Modify: `apps/web/src/lib/verifier/matchLiveDeposit.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`

- [ ] **Step 1: Add failing mismatch tests**

Add table-driven cases to `matchLiveDeposit.test.ts`:

```typescript
function makeMatchInput(patch: {
  transaction?: Partial<{
    hash: string;
    from: string;
    to: string;
    input: string;
    value: bigint;
  }>;
  receipt?: Partial<{ status: string; blockNumber: bigint; blockHash: string }>;
  confirmationDepth?: number;
} = {}) {
  return {
    manifest,
    depositTxHash: `0x${"d".repeat(64)}`,
    approveTxHash: `0x${"c".repeat(64)}`,
    confirmationDepth: patch.confirmationDepth ?? 3,
    minimumConfirmationDepth: 1,
    transaction: {
      hash: `0x${"d".repeat(64)}`,
      from: manifest.wallet,
      to: manifest.target,
      input: ["0x47e7ef24", "0".repeat(24), manifest.asset.slice(2), "0".repeat(47), "de0b6b3a7640000"].join(""),
      value: 0n,
      ...patch.transaction
    },
    receipt: {
      status: "success",
      blockNumber: 10n,
      blockHash: `0x${"e".repeat(64)}`,
      ...patch.receipt
    },
    decodedLogSnapshots
  };
}

it.each([
  ["wrong wallet", { transaction: { from: "0x9999999999999999999999999999999999999999" } }, "WALLET_MISMATCH"],
  ["wrong target", { transaction: { to: "0x9999999999999999999999999999999999999999" } }, "TARGET_MISMATCH"],
  ["failed receipt", { receipt: { status: "reverted" } }, "TX_FAILED"],
  ["low confirmation depth", { confirmationDepth: 0 }, "UNCONFIRMED"]
])("returns non-matched decision for %s", (_label, patch, expectedReason) => {
  const result = matchLiveDeposit(makeMatchInput(patch));
  expect(result.decision).not.toBe("matched");
  expect(result.failureReason).toBe(expectedReason);
  expect(result.receiptCandidate).toBeUndefined();
});
```

Add API-level expectation to `liveApi.test.ts`:

```typescript
it("persists mismatched verifier decisions without creating a receipt", async () => {
  const store = createMemoryLiveStore();
  const api = createLiveApiHandler({
    store,
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => makeIssuedManifest(),
    verifyRun: async () => ({
      decision: "mismatched",
      failureReason: "WALLET_MISMATCH",
      verifierInputHash: `0x${"9".repeat(64)}`,
      receipt: undefined
    })
  });

  await createRunAndSubmitDeposit(api);
  const response = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });

  expect(response.status).toBe(200);
  expect(response.body.status).toBe("mismatched");
  expect(response.body.receiptReady).toBe(false);
  expect(response.body.receiptHash).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- matchLiveDeposit
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
matchLiveDeposit fails until mismatch branches exist.
liveApi fails until verifyRun dependency and terminal decision persistence exist.
```

- [ ] **Step 3: Implement mismatch handling**

Implementation requirements:

- `failed` means the standard RPC receipt exists but has non-success status.
- `mismatched` means the transaction or logs do not match the manifest.
- `timeout` or insufficient confirmation must not create a receipt.
- Non-matched decisions must still store `verifierInputHash`, `failureReason`, and terminal status when applicable.
- Non-matched decisions must not store a `ReceiptRecord`.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- matchLiveDeposit
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
Mismatch and failed receipt tests pass.
No non-matched branch returns receiptReady true.
```

## Task 7: Receipt Payload and Hash Integration Tests

**Files:**

- Create: `apps/web/src/lib/verifier/liveReceiptBuilder.ts`
- Create: `apps/web/src/lib/verifier/liveReceiptBuilder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/verifier/liveReceiptBuilder.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import type { ActionManifest } from "../../../../../packages/protocol/src/index.ts";
import { computeReceiptHash } from "../../../../../packages/protocol/src/index.ts";

import { buildLiveReceipt } from "./liveReceiptBuilder.ts";

function makeManifest(): ActionManifest {
  return {
    manifestVersion: "1",
    chainId: 91342,
    nonce: "nonce-1",
    expiryUnix: 1790003600,
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    wallet: "0x1111111111111111111111111111111111111111",
    actionType: "mockVaultDeposit",
    target: "0x2222222222222222222222222222222222222222",
    selector: "0x47e7ef24",
    asset: "0x3333333333333333333333333333333333333333",
    amountBaseUnits: "1000000000000000000",
    spender: "0x2222222222222222222222222222222222222222",
    maxAllowanceBaseUnits: "1000000000000000000"
  };
}

describe("live receipt builder", () => {
  it("creates a recomputable receipt payload only for matched live evidence", () => {
    const receipt = buildLiveReceipt({
      manifest: makeManifest(),
      intentHash: `0x${"a".repeat(64)}`,
      approveTxHash: `0x${"b".repeat(64)}`,
      depositTxHash: `0x${"c".repeat(64)}`,
      depositBlockNumber: 12345,
      depositBlockHash: `0x${"d".repeat(64)}`,
      allowanceUsedBaseUnits: "1000000000000000000",
      issuedAt: 1790000000,
      verifierVersion: "live-sprint-11"
    });

    expect(receipt.receiptHash).toBe(computeReceiptHash(receipt.payload));
    expect(receipt.payload.status).toBe("matched");
    expect(receipt.payload.depositBlockNumber).toBe(12345);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveReceiptBuilder
```

Expected:

```text
FAIL because liveReceiptBuilder.ts does not exist.
```

- [ ] **Step 3: Implement receipt builder**

Create `apps/web/src/lib/verifier/liveReceiptBuilder.ts` and use protocol exports:

```typescript
import {
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  computeReceiptHash,
  RECEIPT_SAFETY_NOTICE,
  type ActionManifest,
  type Hex,
  type ReceiptPayload
} from "../../../../../packages/protocol/src/index.ts";

export function buildLiveReceipt(input: {
  manifest: ActionManifest;
  intentHash: Hex;
  approveTxHash: Hex | null;
  depositTxHash: Hex;
  depositBlockNumber: number;
  depositBlockHash: Hex;
  allowanceUsedBaseUnits: string;
  issuedAt: number;
  verifierVersion: string;
}) {
  const payload: ReceiptPayload = {
    schemaVersion: "1",
    verifierVersion: input.verifierVersion,
    intentHash: input.intentHash,
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: "mockVaultDeposit",
    asset: input.manifest.asset,
    amountBaseUnits: input.manifest.amountBaseUnits,
    target: input.manifest.target,
    spender: input.manifest.spender,
    maxAllowanceBaseUnits: input.manifest.maxAllowanceBaseUnits,
    allowanceUsedBaseUnits: input.allowanceUsedBaseUnits,
    approvalRequired: input.approveTxHash !== null,
    approveTxHash: input.approveTxHash,
    depositTxHash: input.depositTxHash,
    depositBlockNumber: input.depositBlockNumber,
    depositBlockHash: input.depositBlockHash,
    campaignId: input.manifest.campaignId,
    missionId: input.manifest.missionId,
    wallet: input.manifest.wallet,
    verifiedState: "guest",
    testnetDepositAmountDelta: input.manifest.amountBaseUnits,
    issuedAt: input.issuedAt,
    issuer: "GIWA Verified Intent Rail MVP",
    safetyNotice: RECEIPT_SAFETY_NOTICE
  };

  return {
    payload,
    canonicalPayload: canonicalReceiptPayload(payload),
    canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(payload),
    receiptHash: computeReceiptHash(payload)
  };
}
```

Use the existing protocol receipt safety constant. Do not edit protocol constants unless all protocol tests are updated and pass.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveReceiptBuilder
pnpm --filter @giwa/protocol --fail-if-no-match test
```

Expected:

```text
Receipt hash is recomputable.
Protocol tests remain green.
```

## Task 8: liveStore Decision and Receipt Persistence Regression

**Files:**

- Modify: `apps/web/src/lib/live/liveTypes.ts`
- Modify: `apps/web/src/lib/live/liveStore.ts`
- Modify: `apps/web/src/lib/live/liveStore.test.ts`

- [ ] **Step 1: Add failing persistence tests**

Add these tests to `liveStore.test.ts`:

```typescript
it("stores a local verifier decision without a decision transaction hash", () => {
  const store = createMemoryLiveStore();
  store.createRun(run({ intentHash: `0x${"a".repeat(64)}` }));

  const decision = store.saveDecision({
    intentHash: `0x${"a".repeat(64)}`,
    depositTxHash: `0x${"d".repeat(64)}`,
    decision: "matched",
    failureReason: null,
    verifierInputHash: `0x${"9".repeat(64)}`,
    receiptHash: `0x${"8".repeat(64)}`,
    decisionTxHash: null,
    issuedAt: 1790000000
  });

  expect(decision.decisionTxHash).toBeNull();
});

it("persists dynamic receipts across sqlite adapter instances", () => {
  const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
  const dbPath = join(dir, "live.sqlite");
  try {
    const receipt = {
      receiptHash: `0x${"8".repeat(64)}`,
      intentHash: `0x${"a".repeat(64)}`,
      payloadJson: "{\"status\":\"matched\"}",
      canonicalPayload: "{\"status\":\"matched\"}",
      canonicalPayloadBytesHex: "0x7b7d"
    };
    const first = createSqliteLiveStore(dbPath);
    first.saveReceipt(receipt);
    first.close();

    const second = createSqliteLiveStore(dbPath);
    expect(second.getReceipt(receipt.receiptHash)).toEqual(receipt);
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveStore
```

Expected:

```text
FAIL because DecisionRecord currently requires a string decisionTxHash.
```

- [ ] **Step 3: Update decision type and SQLite schema**

Change `DecisionRecord`:

```typescript
decisionTxHash: string | null;
```

Change SQLite table creation:

```sql
decisionTxHash text,
```

Add a small schema guard for existing local DBs:

```typescript
function ensureNullableDecisionTxHash(db: DatabaseSync): void {
  const column = db.prepare("pragma table_info(decisions)").all().find((row) => row.name === "decisionTxHash");
  if (column !== undefined && Number(column.notnull) === 1) {
    throw new Error("live DB decisions.decisionTxHash is not nullable; back up or reset apps/web/.data/live-mvp.sqlite before Sprint 11");
  }
}
```

Call the guard after `db.exec`. Do not mutate a user DB silently. If the guard fails during execution, stop and report the reset/back-up choice.

- [ ] **Step 4: Run persistence tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveStore
```

Expected:

```text
Memory and SQLite store tests pass.
Existing idempotent decision behavior remains unchanged.
```

## Task 9: `/api/runs/:runId/verify` Behavior Update Plan

**Files:**

- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Create: `apps/web/src/lib/verifier/liveVerifierService.ts`
- Create: `apps/web/src/lib/verifier/liveVerifierService.test.ts`

- [ ] **Step 1: Add failing API tests**

Add tests to `liveApi.test.ts`:

```typescript
function makeIssuedManifest() {
  return {
    runId: "run-1",
    nonce: "nonce-1",
    intentHash: `0x${"a".repeat(64)}`,
    manifestJson: JSON.stringify({
      manifestVersion: "1",
      chainId: 91342,
      nonce: "nonce-1",
      expiryUnix: 1790003600,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      wallet: "0x1111111111111111111111111111111111111111",
      actionType: "mockVaultDeposit",
      target: "0x2222222222222222222222222222222222222222",
      selector: "0x47e7ef24",
      asset: "0x3333333333333333333333333333333333333333",
      amountBaseUnits: "1000000000000000000",
      spender: "0x2222222222222222222222222222222222222222",
      maxAllowanceBaseUnits: "1000000000000000000"
    }),
    manifestSignature: `0x${"b".repeat(130)}`,
    expiryUnix: 1790003600,
    preview: null
  };
}

async function createRun(api: ReturnType<typeof createLiveApiHandler>) {
  return api({
    method: "POST",
    pathname: "/api/runs",
    body: {
      wallet: "0x1111111111111111111111111111111111111111",
      chainId: 91342,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null
    }
  });
}

async function createRunAndSubmitDeposit(api: ReturnType<typeof createLiveApiHandler>) {
  await createRun(api);
  return api({
    method: "POST",
    pathname: "/api/runs/run-1/evidence",
    body: {
      approveTxHash: `0x${"c".repeat(64)}`,
      depositTxHash: `0x${"d".repeat(64)}`
    }
  });
}

it("runs the live verifier and unlocks receipt for matched evidence", async () => {
  const store = createMemoryLiveStore();
  const api = createLiveApiHandler({
    store,
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => makeIssuedManifest(),
    verifyRun: async () => ({
      decision: "matched",
      failureReason: null,
      verifierInputHash: `0x${"9".repeat(64)}`,
      receipt: {
        receiptHash: `0x${"8".repeat(64)}`,
        payloadJson: "{\"status\":\"matched\"}",
        canonicalPayload: "{\"status\":\"matched\"}",
        canonicalPayloadBytesHex: "0x7b7d"
      }
    })
  });

  await createRunAndSubmitDeposit(api);
  const response = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });

  expect(response.status).toBe(200);
  expect(response.body.status).toBe("matched");
  expect(response.body.receiptReady).toBe(true);
  expect(response.body.receiptHash).toBe(`0x${"8".repeat(64)}`);
  expect(store.getReceipt(`0x${"8".repeat(64)}`)).toBeDefined();
});

it("rejects verify before deposit evidence exists", async () => {
  const api = createLiveApiHandler({
    store: createMemoryLiveStore(),
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => makeIssuedManifest(),
    verifyRun: async () => {
      throw new Error("not reached");
    }
  });

  await createRun(api);
  const response = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });

  expect(response.status).toBe(409);
  expect(response.body.error).toBe("deposit_tx_required");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
FAIL because `/verify` still returns the Sprint 10 gate.
```

- [ ] **Step 3: Implement `verifyRun` dependency**

Extend `LiveApiDependencies`:

```typescript
verifyRun?: (input: { run: LiveRunRecord; submittedTx: SubmittedTxRecord }) => Promise<LiveVerifierServiceResult>;
```

Replace the Sprint 10 verify branch:

```typescript
const verifyRunId = request.method === "POST" ? runIdFrom(request.pathname, "/verify") : undefined;
if (verifyRunId !== undefined) {
  const run = deps.store.getRun(verifyRunId);
  if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
  const submittedTx = deps.store.getSubmittedTx(verifyRunId);
  if (submittedTx === undefined) return { status: 409, body: { error: "deposit_tx_required" } };
  if (deps.verifyRun === undefined) return { status: 409, body: { error: "verifier_not_configured" } };

  const result = await deps.verifyRun({ run, submittedTx });
  const decision = deps.store.saveDecision({
    intentHash: run.intentHash,
    depositTxHash: submittedTx.depositTxHash,
    decision: result.decision,
    failureReason: result.failureReason,
    verifierInputHash: result.verifierInputHash,
    receiptHash: result.receipt?.receiptHash ?? null,
    decisionTxHash: null,
    issuedAt: Math.floor(new Date(deps.now()).getTime() / 1000)
  });

  if (result.receipt !== undefined) {
    deps.store.saveReceipt({
      receiptHash: result.receipt.receiptHash,
      intentHash: run.intentHash,
      payloadJson: result.receipt.payloadJson,
      canonicalPayload: result.receipt.canonicalPayload,
      canonicalPayloadBytesHex: result.receipt.canonicalPayloadBytesHex
    });
  }

  const updated = deps.store.updateRunStatus(verifyRunId, decision.decision, deps.now());
  return {
    status: 200,
    body: {
      ...runResponse(updated),
      verifierInputHash: decision.verifierInputHash,
      failureReason: decision.failureReason,
      receiptHash: decision.receiptHash,
      receiptReady: decision.decision === "matched" && decision.receiptHash !== null,
      decisionTxHash: decision.decisionTxHash
    }
  };
}
```

- [ ] **Step 4: Implement `liveVerifierService`**

`createLiveVerifierService` must:

- build live verifier input from run and submitted tx
- call standard RPC snapshot client
- decode deposit calldata and receipt logs
- match evidence
- compute `verifierInputHash` through protocol helpers
- create receipt output only for `matched`
- return structured result without throwing for mismatch or failed receipt

- [ ] **Step 5: Run focused tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveVerifierService
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
Matched verify creates a receipt.
Mismatched and failed verify create terminal decisions without receipts.
```

## Task 10: `/api/receipts/:receiptHash` Dynamic Receipt Behavior Update Plan

**Files:**

- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`

- [ ] **Step 1: Add failing dynamic receipt tests**

Add tests:

```typescript
it("returns dynamic receipt payload after matched verification", async () => {
  const store = createMemoryLiveStore();
  store.saveReceipt({
    receiptHash: `0x${"8".repeat(64)}`,
    intentHash: `0x${"a".repeat(64)}`,
    payloadJson: "{\"status\":\"matched\"}",
    canonicalPayload: "{\"status\":\"matched\"}",
    canonicalPayloadBytesHex: "0x7b7d"
  });

  const api = createLiveApiHandler({
    store,
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => {
      throw new Error("not reached");
    }
  });

  const response = await api({ method: "GET", pathname: `/api/receipts/0x${"8".repeat(64)}` });

  expect(response.status).toBe(200);
  expect(response.body.receiptHash).toBe(`0x${"8".repeat(64)}`);
  expect(response.body.payloadJson).toContain("matched");
});
```

- [ ] **Step 2: Run test**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- receipt
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
Existing receipt route may already return store records. Keep the regression and adjust response shape if needed.
```

- [ ] **Step 3: Harden response shape**

Response must include:

- `receiptHash`
- `intentHash`
- `payload`
- `canonicalPayload`
- `canonicalPayloadBytesHex`
- `source: "live"`

If `payloadJson` fails to parse, return status `500` with `error: "receipt_payload_invalid"` and do not hide the failure.

- [ ] **Step 4: Run tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- receipt
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
Dynamic receipt response is stable.
Unknown receipt hash still returns 404.
```

## Task 11: Live UI Receipt Unlock State Model

**Files:**

- Modify: `apps/web/src/lib/transaction/liveTransactionState.ts`
- Modify: `apps/web/src/lib/transaction/liveTransactionState.test.ts`
- Modify: `apps/web/public/live-flow.js`

- [ ] **Step 1: Add failing view-model tests**

Add tests:

```typescript
it("unlocks receipt only after matched verifier status and receipt hash", () => {
  expect(
    buildLiveTransactionViewModel({
      guard: { canRequestTransaction: false, blocker: null },
      approveTxHash: `0x${"a".repeat(64)}`,
      depositTxHash: `0x${"b".repeat(64)}`,
      receiptHash: `0x${"c".repeat(64)}`,
      runStatus: "matched"
    }).receipt
  ).toMatchObject({ locked: false, receiptHash: `0x${"c".repeat(64)}` });
});

it.each(["depositSubmitted", "verifierChecking", "mismatched", "failed"])("keeps receipt locked for %s", (status) => {
  expect(
    buildLiveTransactionViewModel({
      guard: { canRequestTransaction: false, blocker: null },
      approveTxHash: `0x${"a".repeat(64)}`,
      depositTxHash: `0x${"b".repeat(64)}`,
      receiptHash: `0x${"c".repeat(64)}`,
      runStatus: status
    }).receipt.locked
  ).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveTransactionState
```

Expected:

```text
FAIL if receipt lock only checks receiptHash.
```

- [ ] **Step 3: Implement UI state**

Rules:

- show `Verify` button only when `depositTxHash` exists and status is not terminal
- call `POST /api/runs/:runId/verify`
- on `matched`, show receipt link `/receipt/:receiptHash` or dynamic receipt panel link from `/api/receipts/:receiptHash`
- on `mismatched` or `failed`, show clear verifier failure copy and no receipt link
- keep static Sprint 7 pages untouched

- [ ] **Step 4: Run syntax and UI tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveTransactionState
node --check apps/web/public/live-flow.js
```

Expected:

```text
View model locks and unlocks receipt according to verifier status.
Browser script syntax is valid.
```

## Task 12: Static Fallback Regression Check

**Files:**

- Verify: `apps/web/public/flow.js`
- Verify: `apps/web/public/live-flow.js`
- Verify: `apps/web/scripts/serve-live.mjs`
- Verify: `apps/web/scripts/serve-static.mjs`

- [ ] **Step 1: Run static and live syntax checks**

Run:

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
All syntax checks exit 0.
```

- [ ] **Step 2: Smoke Sprint 7 static fallback**

Start static server:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
```

Request:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner-snapshot.json
```

Expected:

```text
All routes return HTTP 200.
Recorded fixture evidence remains readable.
```

- [ ] **Step 3: Smoke Sprint 8/9/10 live regressions**

Start live server in mock mode for API contract checks:

```powershell
$env:GIWA_LIVE_MOCK_MODE="1"
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Expected:

```text
`/live` returns HTTP 200.
`GET /api/partner/runs` returns HTTP 200.
`POST /api/runs` still works in mock mode.
Sprint 10 evidence endpoint still stores tx hashes and does not create a receipt before verify.
```

## Task 13: Safe Scans and Final Verification

**Files:**

- Verify all modified Sprint 11 files.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- receipt
pnpm --filter @giwa/web --fail-if-no-match test -- live
```

Expected:

```text
Verifier, receipt, and live API tests pass.
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
All commands exit 0. Existing local runtime experimental warnings are acceptable when tests already account for them.
```

- [ ] **Step 3: Run safe scans without reading real env files**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("payment set" + "tled")
$secretPattern = "0x[a-fA-F0-9]{64}|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|NEXT" + "_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"
rg -n $docPattern docs\superpowers\plans\2026-06-17-sprint-11-live-verifier-and-dynamic-receipt.md docs\implementation apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $riskPattern docs\superpowers\plans\2026-06-17-sprint-11-live-verifier-and-dynamic-receipt.md docs\implementation apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $secretPattern docs\superpowers\plans\2026-06-17-sprint-11-live-verifier-and-dynamic-receipt.md docs\implementation apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
```

Expected:

```text
Unfinished-marker scan has no matches in Sprint 11 code or Sprint 11 docs.
Restricted-claim scan has no matches in user-facing Sprint 11 copy.
Secret-like scan has no live credential values. Synthetic tests and pattern definitions are allowed only when no raw credential value is printed.
```

## Sprint 11 Exit Gate

Sprint 11 is complete only when:

- live `depositTxHash` is verified through GIWA Sepolia standard RPC
- standard RPC receipt status is success
- `blockNumber` and `blockHash` are recorded in receipt payload
- confirmation depth is computed from standard RPC head block
- decoded deposit calldata matches manifest selector, asset, and amount
- decoded `Approval`, `Transfer`, and `MockDeposit` logs match manifest wallet, target, asset, spender, and amount
- wrong wallet, target, asset, amount, failed receipt, missing receipt, and low confirmation depth never produce `matched`
- `matched` creates a recomputable `receiptHash`
- `/api/runs/:runId/verify` stores a terminal verifier decision
- `/api/receipts/:receiptHash` returns the dynamic live receipt only after match
- `/live` unlocks receipt UI only after match
- `/intent-submit` remains disabled or separately gated
- Flashblocks evidence remains excluded from final verifier confirmation
- Sprint 7 static fallback still works
- Sprint 8 mock API still works
- Sprint 9 manifest issuance still works
- Sprint 10 approve/deposit tx request and tx hash storage still work
- no wallet secret is requested
- no deploy, fund, or anchor command is run
- no new dependency is installed

## Handoff

Sprint 11 completion report must include:

- files changed
- commands run and results
- live server URL
- live DB path
- verified run id
- deposit transaction hash
- standard RPC receipt status
- deposit block number and block hash
- confirmation depth
- verifier decision
- verifier input hash
- receipt hash, if matched
- dynamic receipt API path
- confirmation that no wallet secret was requested
- confirmation that `deploy:giwa`, `fund:giwa`, and `anchor:giwa` were not run
- confirmation that no new dependency was installed
- Sprint 7 fallback status
- Sprint 8 mock API status
- Sprint 9 manifest issuance status
- Sprint 10 approve/deposit status
- unresolved risks
- explicit next sprint document path: `docs/superpowers/plans/2026-06-17-sprint-12-live-demo-hardening-and-submission-refresh.md`

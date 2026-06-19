# Sprint 10 Live Approve and Deposit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable a connected wallet on GIWA Sepolia to create user-signed ERC-20 approve and mock vault deposit transaction requests, store returned transaction hashes on the live run, and keep receipt/verifier paths locked for Sprint 11.

**Architecture:** Build Sprint 10 as a browser-wallet transaction layer on top of the Sprint 9 signed manifest preview. The browser prepares public calldata and sends EIP-1193 transaction requests through the user's wallet only; the server stores returned tx hashes and keeps `/intent-submit`, `/verify`, and receipt unlock disabled until Sprint 11.

**Tech Stack:** TypeScript 6, Vitest 4, viem 2, browser EIP-1193 provider, existing dependency-free static UI, Node HTTP live server, existing `node:sqlite` live store boundary.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-17-giwa-live-mvp-architecture-cutover-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-17-sprint-8-local-live-architecture-cutover.md`
- `docs/superpowers/plans/2026-06-17-sprint-9-wallet-and-manifest-issuance.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-role-and-key-policy.md`
- `docs/implementation/giwa-mvp-runbook.md`

## Sprint 10 Boundary

Allowed:

- build ERC-20 approve calldata for `approve(spender,uint256)`
- build mock vault deposit calldata for `deposit(address,uint256)`
- build EIP-1193 transaction request objects for connected wallets
- call `eth_sendTransaction` from browser code only after wallet, chain, manifest, and expiry gates pass
- store `approveTxHash` and `depositTxHash` through `POST /api/runs/:runId/evidence`
- reject duplicate `depositTxHash` across runs
- update live UI state to show submitted tx hashes and receipt locked copy

Not allowed:

- ask for, import, or store a user wallet secret
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, or `verify:giwa`
- implement Sprint 11 verifier, decision transaction, receipt unlock, or dynamic receipt route
- use Flashblocks as final confirmation
- add new dependencies
- break Sprint 7 static fallback, Sprint 8 mock API, or Sprint 9 manifest issuance

## File Structure

Create:

- `apps/web/src/lib/transaction/erc20ApproveCalldata.ts` - typed calldata builder for ERC-20 approve.
- `apps/web/src/lib/transaction/erc20ApproveCalldata.test.ts` - approve calldata tests.
- `apps/web/src/lib/transaction/mockVaultDepositCalldata.ts` - typed calldata builder for mock vault deposit.
- `apps/web/src/lib/transaction/mockVaultDepositCalldata.test.ts` - deposit calldata tests.
- `apps/web/src/lib/transaction/walletTransactionGuard.ts` - manifest, wallet, chain, expiry, and invalidation gate for tx buttons.
- `apps/web/src/lib/transaction/walletTransactionGuard.test.ts` - transaction guard tests.
- `apps/web/src/lib/transaction/walletTransactionRequest.ts` - builds EIP-1193 request objects from signed manifest preview.
- `apps/web/src/lib/transaction/walletTransactionRequest.test.ts` - transaction request object tests.
- `apps/web/src/lib/transaction/liveTransactionState.ts` - approve/deposit UI state model and receipt lock model.
- `apps/web/src/lib/transaction/liveTransactionState.test.ts` - browser action state tests.

Modify:

- `apps/web/src/lib/wallet/eip1193Provider.ts` - add `sendTransaction` wrapper.
- `apps/web/src/lib/wallet/eip1193Provider.test.ts` - verify send wrapper and returned hash validation.
- `apps/web/src/lib/live/liveTypes.ts` - keep statuses explicit and receipt gate locked for submitted tx states.
- `apps/web/src/lib/live/liveTypes.test.ts` - receipt route regression for `approveSubmitted`, `depositSubmitted`, and `depositConfirmed`.
- `apps/web/src/lib/live/liveApi.ts` - harden `/api/runs/:runId/evidence` input validation and response shape.
- `apps/web/src/lib/live/liveApi.test.ts` - evidence hardening, duplicate tx, invalidated manifest, expired manifest, and receipt lock tests.
- `apps/web/public/live-flow.js` - enable approve/deposit buttons only after guards pass, send wallet tx requests, then store tx hashes.
- `apps/web/public/styles.css` - button/status polish if needed without changing the Sprint 7 static layout.
- `apps/web/scripts/serve-live.mjs` - no new route required; keep Sprint 8/9 API behavior.
- `docs/implementation/giwa-live-mvp-runtime-gate.md` - add Sprint 10 boundary and exit gate.
- `docs/implementation/giwa-mvp-runbook.md` - add Sprint 10 live approve/deposit commands and stop conditions.

No `.env`, `.env.local`, wallet secret, or tokenized RPC value may be printed or content-scanned.

## Task 1: Sprint 10 Runtime Boundary Docs

**Files:**

- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`

- [ ] **Step 1: Update runtime gate with Sprint 10 boundary**

Append this section to `docs/implementation/giwa-live-mvp-runtime-gate.md`:

```markdown
## Sprint 10 Live Approve and Deposit Boundary

Sprint 10 enables browser-wallet transaction requests for the one mock vault action.

Allowed browser wallet methods:

- `eth_requestAccounts`
- `eth_chainId`
- `wallet_switchEthereumChain`
- `wallet_addEthereumChain`
- `eth_sendTransaction`

`eth_sendTransaction` may only be called after:

- wallet account is connected
- chain id is GIWA Sepolia `91342`
- signed manifest exists
- manifest is not invalidated
- manifest has not expired
- transaction request target and calldata are derived from the manifest preview

Sprint 10 stores returned approve and deposit transaction hashes in the live API. It does not verify those hashes, emit verifier decisions, or unlock receipts. Those belong to Sprint 11.

The app never asks for a user wallet secret. The wallet app owns signing and returns public transaction hashes only.
```

- [ ] **Step 2: Update runbook with Sprint 10 operator notes**

Append this section to `docs/implementation/giwa-mvp-runbook.md`:

```markdown
## Sprint 10 Live Approve and Deposit

Start the non-mock live server:

```powershell
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
http://127.0.0.1:4177/live
```

Sprint 10 lets the connected wallet create approve and deposit transaction requests. Receipt routes remain locked until Sprint 11 verifier match is implemented.

Stop if:

- the browser asks for a wallet secret
- the app tries to send transactions on any chain other than `91342`
- manifest state is invalidated or expired
- `/intent-submit` or `/verify` starts emitting chain actions before Sprint 11
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
No matches in the new Sprint 10 sections.
```

## Task 2: ERC-20 Approve Calldata Builder

**Files:**

- Create: `apps/web/src/lib/transaction/erc20ApproveCalldata.ts`
- Create: `apps/web/src/lib/transaction/erc20ApproveCalldata.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/transaction/erc20ApproveCalldata.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { encodeFunctionData, parseAbi } from "viem";

import { buildErc20ApproveCalldata } from "./erc20ApproveCalldata.ts";

const erc20Abi = parseAbi(["function approve(address spender,uint256 amount)"]);

describe("ERC-20 approve calldata", () => {
  it("encodes approve(spender,uint256) from manifest spender and max allowance", () => {
    const spender = "0x2222222222222222222222222222222222222222";
    const amount = "1000000000000000000";

    expect(buildErc20ApproveCalldata({ spender, amountBaseUnits: amount })).toBe(
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, BigInt(amount)]
      })
    );
  });

  it("rejects invalid spender and amount", () => {
    expect(() => buildErc20ApproveCalldata({ spender: "not-address", amountBaseUnits: "1" })).toThrow(
      "spender must be a valid address"
    );
    expect(() =>
      buildErc20ApproveCalldata({
        spender: "0x2222222222222222222222222222222222222222",
        amountBaseUnits: "-1"
      })
    ).toThrow("amountBaseUnits must be a base-unit decimal string");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- erc20ApproveCalldata
```

Expected:

```text
FAIL because erc20ApproveCalldata.ts does not exist.
```

- [ ] **Step 3: Implement approve calldata builder**

Create `apps/web/src/lib/transaction/erc20ApproveCalldata.ts`:

```typescript
import { encodeFunctionData, isAddress, parseAbi, type Hex } from "viem";

const erc20Abi = parseAbi(["function approve(address spender,uint256 amount)"]);

function requireAddress(value: string, field: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) {
    throw new Error(`${field} must be a valid address`);
  }

  return value.toLowerCase() as `0x${string}`;
}

function requireBaseUnitString(value: string, field: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error(`${field} must be a base-unit decimal string`);
  }

  return BigInt(value);
}

export function buildErc20ApproveCalldata(input: { spender: string; amountBaseUnits: string }): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [requireAddress(input.spender, "spender"), requireBaseUnitString(input.amountBaseUnits, "amountBaseUnits")]
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- erc20ApproveCalldata
```

Expected:

```text
PASS erc20ApproveCalldata.test.ts
```

## Task 3: Mock Vault Deposit Calldata Builder

**Files:**

- Create: `apps/web/src/lib/transaction/mockVaultDepositCalldata.ts`
- Create: `apps/web/src/lib/transaction/mockVaultDepositCalldata.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/transaction/mockVaultDepositCalldata.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { encodeFunctionData, parseAbi } from "viem";

import { buildMockVaultDepositCalldata } from "./mockVaultDepositCalldata.ts";

const vaultAbi = parseAbi(["function deposit(address asset,uint256 amount)"]);

describe("mock vault deposit calldata", () => {
  it("encodes deposit(address,uint256) from manifest asset and amount", () => {
    const asset = "0x3333333333333333333333333333333333333333";
    const amount = "1000000000000000000";

    expect(buildMockVaultDepositCalldata({ asset, amountBaseUnits: amount })).toBe(
      encodeFunctionData({
        abi: vaultAbi,
        functionName: "deposit",
        args: [asset, BigInt(amount)]
      })
    );
  });

  it("rejects malformed manifest fields", () => {
    expect(() => buildMockVaultDepositCalldata({ asset: "0x1234", amountBaseUnits: "1" })).toThrow(
      "asset must be a valid address"
    );
    expect(() =>
      buildMockVaultDepositCalldata({
        asset: "0x3333333333333333333333333333333333333333",
        amountBaseUnits: "1.0"
      })
    ).toThrow("amountBaseUnits must be a base-unit decimal string");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- mockVaultDepositCalldata
```

Expected:

```text
FAIL because mockVaultDepositCalldata.ts does not exist.
```

- [ ] **Step 3: Implement deposit calldata builder**

Create `apps/web/src/lib/transaction/mockVaultDepositCalldata.ts`:

```typescript
import { encodeFunctionData, isAddress, parseAbi, type Hex } from "viem";

const vaultAbi = parseAbi(["function deposit(address asset,uint256 amount)"]);

function requireAddress(value: string, field: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) {
    throw new Error(`${field} must be a valid address`);
  }

  return value.toLowerCase() as `0x${string}`;
}

function requireBaseUnitString(value: string, field: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error(`${field} must be a base-unit decimal string`);
  }

  return BigInt(value);
}

export function buildMockVaultDepositCalldata(input: { asset: string; amountBaseUnits: string }): Hex {
  return encodeFunctionData({
    abi: vaultAbi,
    functionName: "deposit",
    args: [requireAddress(input.asset, "asset"), requireBaseUnitString(input.amountBaseUnits, "amountBaseUnits")]
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- mockVaultDepositCalldata
```

Expected:

```text
PASS mockVaultDepositCalldata.test.ts
```

## Task 4: Wallet Transaction Request Guard

**Files:**

- Create: `apps/web/src/lib/transaction/walletTransactionGuard.ts`
- Create: `apps/web/src/lib/transaction/walletTransactionGuard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/transaction/walletTransactionGuard.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { evaluateWalletTransactionGuard } from "./walletTransactionGuard.ts";

const wallet = {
  status: "connected" as const,
  account: "0x1111111111111111111111111111111111111111" as const,
  chainId: 91342
};

const run = {
  status: "manifestIssued",
  wallet: "0x1111111111111111111111111111111111111111",
  expiryUnix: 1790003600,
  manifestPreview: {
    target: "0x2222222222222222222222222222222222222222",
    selector: "0xb6b55f25",
    asset: "0x3333333333333333333333333333333333333333",
    amountBaseUnits: "1000000000000000000",
    spender: "0x2222222222222222222222222222222222222222",
    maxAllowanceBaseUnits: "1000000000000000000",
    expiryUnix: 1790003600,
    intentHash: `0x${"a".repeat(64)}`
  }
};

describe("wallet transaction guard", () => {
  it("allows tx requests only for a connected wallet on GIWA Sepolia with a valid manifest", () => {
    expect(evaluateWalletTransactionGuard({ wallet, run, nowUnix: 1790000000 })).toEqual({
      canRequestTransaction: true,
      blocker: null
    });
  });

  it("blocks wrong chain, disconnected wallet, invalidated manifest, and expired manifest", () => {
    expect(
      evaluateWalletTransactionGuard({
        wallet: { ...wallet, chainId: 1, status: "wrongChain" },
        run,
        nowUnix: 1790000000
      }).blocker
    ).toBe("wrong_chain");
    expect(evaluateWalletTransactionGuard({ wallet: { status: "disconnected", account: null, chainId: null }, run, nowUnix: 1790000000 }).blocker).toBe("wallet_not_connected");
    expect(evaluateWalletTransactionGuard({ wallet, run: { ...run, status: "manifestInvalidated" }, nowUnix: 1790000000 }).blocker).toBe("manifest_invalidated");
    expect(evaluateWalletTransactionGuard({ wallet, run, nowUnix: 1790003601 }).blocker).toBe("manifest_expired");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- walletTransactionGuard
```

Expected:

```text
FAIL because walletTransactionGuard.ts does not exist.
```

- [ ] **Step 3: Implement transaction guard**

Create `apps/web/src/lib/transaction/walletTransactionGuard.ts`:

```typescript
import { GIWA_SEPOLIA_CHAIN_ID, type WalletReadinessState } from "../wallet/walletTypes.ts";

export type TransactionGuardRun = {
  status: string;
  wallet: string;
  expiryUnix: number;
  manifestPreview: unknown;
};

export type TransactionBlocker =
  | "wallet_not_connected"
  | "wrong_chain"
  | "wallet_mismatch"
  | "manifest_missing"
  | "manifest_invalidated"
  | "manifest_expired";

export function evaluateWalletTransactionGuard(input: {
  wallet: WalletReadinessState;
  run: TransactionGuardRun | null;
  nowUnix: number;
}): { canRequestTransaction: boolean; blocker: TransactionBlocker | null } {
  if (input.wallet.account === null || input.wallet.status !== "connected") {
    return { canRequestTransaction: false, blocker: "wallet_not_connected" };
  }
  if (input.wallet.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    return { canRequestTransaction: false, blocker: "wrong_chain" };
  }
  if (input.run === null || input.run.manifestPreview === null) {
    return { canRequestTransaction: false, blocker: "manifest_missing" };
  }
  if (input.run.status === "manifestInvalidated") {
    return { canRequestTransaction: false, blocker: "manifest_invalidated" };
  }
  if (input.run.wallet.toLowerCase() !== input.wallet.account.toLowerCase()) {
    return { canRequestTransaction: false, blocker: "wallet_mismatch" };
  }
  if (input.nowUnix > input.run.expiryUnix) {
    return { canRequestTransaction: false, blocker: "manifest_expired" };
  }

  return { canRequestTransaction: true, blocker: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- walletTransactionGuard
```

Expected:

```text
PASS walletTransactionGuard.test.ts
```

## Task 5: Transaction Request Objects

**Files:**

- Create: `apps/web/src/lib/transaction/walletTransactionRequest.ts`
- Create: `apps/web/src/lib/transaction/walletTransactionRequest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/transaction/walletTransactionRequest.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildApproveTransactionRequest, buildDepositTransactionRequest } from "./walletTransactionRequest.ts";

const preview = {
  target: "0x2222222222222222222222222222222222222222",
  selector: "0xb6b55f25",
  asset: "0x3333333333333333333333333333333333333333",
  amountBaseUnits: "1000000000000000000",
  spender: "0x2222222222222222222222222222222222222222",
  maxAllowanceBaseUnits: "1000000000000000000",
  expiryUnix: 1790003600,
  intentHash: `0x${"a".repeat(64)}`
};

describe("wallet transaction requests", () => {
  it("builds approve request to token contract from manifest preview", () => {
    const request = buildApproveTransactionRequest({
      from: "0x1111111111111111111111111111111111111111",
      preview
    });

    expect(request.from).toBe("0x1111111111111111111111111111111111111111");
    expect(request.to).toBe(preview.asset);
    expect(request.value).toBe("0x0");
    expect(request.data).toMatch(/^0x095ea7b3/u);
  });

  it("builds deposit request to mock vault from manifest preview", () => {
    const request = buildDepositTransactionRequest({
      from: "0x1111111111111111111111111111111111111111",
      preview
    });

    expect(request.from).toBe("0x1111111111111111111111111111111111111111");
    expect(request.to).toBe(preview.target);
    expect(request.value).toBe("0x0");
    expect(request.data).toMatch(/^0xb6b55f25/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- walletTransactionRequest
```

Expected:

```text
FAIL because walletTransactionRequest.ts does not exist.
```

- [ ] **Step 3: Implement request builders**

Create `apps/web/src/lib/transaction/walletTransactionRequest.ts`:

```typescript
import { isAddress, type Hex } from "viem";

import { buildErc20ApproveCalldata } from "./erc20ApproveCalldata.ts";
import { buildMockVaultDepositCalldata } from "./mockVaultDepositCalldata.ts";

export type LiveManifestPreviewFields = {
  target: string;
  selector: string;
  asset: string;
  amountBaseUnits: string;
  spender: string;
  maxAllowanceBaseUnits: string;
  expiryUnix: number;
  intentHash: string;
};

export type WalletTransactionRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  data: Hex;
  value: "0x0";
};

function requireAddress(value: string, field: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) {
    throw new Error(`${field} must be a valid address`);
  }

  return value.toLowerCase() as `0x${string}`;
}

export function buildApproveTransactionRequest(input: {
  from: string;
  preview: LiveManifestPreviewFields;
}): WalletTransactionRequest {
  return {
    from: requireAddress(input.from, "from"),
    to: requireAddress(input.preview.asset, "asset"),
    data: buildErc20ApproveCalldata({
      spender: input.preview.spender,
      amountBaseUnits: input.preview.maxAllowanceBaseUnits
    }),
    value: "0x0"
  };
}

export function buildDepositTransactionRequest(input: {
  from: string;
  preview: LiveManifestPreviewFields;
}): WalletTransactionRequest {
  return {
    from: requireAddress(input.from, "from"),
    to: requireAddress(input.preview.target, "target"),
    data: buildMockVaultDepositCalldata({
      asset: input.preview.asset,
      amountBaseUnits: input.preview.amountBaseUnits
    }),
    value: "0x0"
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- walletTransactionRequest
```

Expected:

```text
PASS walletTransactionRequest.test.ts
```

## Task 6: EIP-1193 Send Transaction Wrapper

**Files:**

- Modify: `apps/web/src/lib/wallet/eip1193Provider.ts`
- Modify: `apps/web/src/lib/wallet/eip1193Provider.test.ts`

- [ ] **Step 1: Extend failing provider test**

Add this test to `apps/web/src/lib/wallet/eip1193Provider.test.ts`:

```typescript
it("sends a transaction request and normalizes the returned tx hash", async () => {
  const txHash = `0x${"a".repeat(64)}`;
  const provider = new MockProvider({ eth_sendTransaction: txHash });
  const wallet = createEip1193WalletAdapter(provider);

  await expect(
    wallet.sendTransaction({
      from: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      data: "0x095ea7b3",
      value: "0x0"
    })
  ).resolves.toBe(txHash);
  expect(provider.requests[0]).toMatchObject({ method: "eth_sendTransaction" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- eip1193Provider
```

Expected:

```text
FAIL because sendTransaction is not implemented.
```

- [ ] **Step 3: Implement send wrapper**

Update `apps/web/src/lib/wallet/eip1193Provider.ts`:

```typescript
export type Eip1193TransactionRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: "0x0";
};

export type Eip1193WalletAdapter = {
  requestAccounts(): Promise<`0x${string}`[]>;
  getChainId(): Promise<number>;
  requestSwitchChain(chainIdHex: string): Promise<void>;
  requestAddChain(params: Record<string, unknown>): Promise<void>;
  sendTransaction(request: Eip1193TransactionRequest): Promise<`0x${string}`>;
  onAccountsChanged(listener: (accounts: `0x${string}`[]) => void): () => void;
  onChainChanged(listener: (chainId: number) => void): () => void;
};

function txHashFromProvider(value: unknown): `0x${string}` {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{64}$/u.test(value)) {
    throw new Error("provider transaction hash must be bytes32");
  }

  return value.toLowerCase() as `0x${string}`;
}
```

Add this method inside `createEip1193WalletAdapter`:

```typescript
async sendTransaction(request) {
  return txHashFromProvider(await provider.request({ method: "eth_sendTransaction", params: [request] }));
},
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- eip1193Provider
```

Expected:

```text
PASS eip1193Provider.test.ts
```

## Task 7: Browser Action State Model

**Files:**

- Create: `apps/web/src/lib/transaction/liveTransactionState.ts`
- Create: `apps/web/src/lib/transaction/liveTransactionState.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/transaction/liveTransactionState.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildLiveTransactionViewModel } from "./liveTransactionState.ts";

describe("live transaction state", () => {
  it("enables approve and deposit when transaction guard passes and no tx hash is stored", () => {
    expect(
      buildLiveTransactionViewModel({
        guard: { canRequestTransaction: true, blocker: null },
        approveTxHash: null,
        depositTxHash: null,
        receiptHash: null,
        runStatus: "manifestIssued"
      })
    ).toMatchObject({
      approveAction: { enabled: true, label: "Approve" },
      depositAction: { enabled: true, label: "Deposit" },
      receipt: { locked: true }
    });
  });

  it("keeps receipt locked after deposit submission", () => {
    expect(
      buildLiveTransactionViewModel({
        guard: { canRequestTransaction: true, blocker: null },
        approveTxHash: `0x${"a".repeat(64)}`,
        depositTxHash: `0x${"b".repeat(64)}`,
        receiptHash: null,
        runStatus: "depositSubmitted"
      })
    ).toMatchObject({
      approveAction: { enabled: false, label: "Approve submitted" },
      depositAction: { enabled: false, label: "Deposit submitted" },
      receipt: { locked: true, reason: "verifier_pending_sprint_11" }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveTransactionState
```

Expected:

```text
FAIL because liveTransactionState.ts does not exist.
```

- [ ] **Step 3: Implement action state model**

Create `apps/web/src/lib/transaction/liveTransactionState.ts`:

```typescript
import type { TransactionBlocker } from "./walletTransactionGuard.ts";

export type LiveTransactionViewInput = {
  guard: { canRequestTransaction: boolean; blocker: TransactionBlocker | null };
  approveTxHash: string | null;
  depositTxHash: string | null;
  receiptHash: string | null;
  runStatus: string;
};

export function buildLiveTransactionViewModel(input: LiveTransactionViewInput) {
  const txReady = input.guard.canRequestTransaction;
  const approveSubmitted = input.approveTxHash !== null;
  const depositSubmitted = input.depositTxHash !== null || input.runStatus === "depositSubmitted";

  return {
    approveAction: approveSubmitted
      ? { enabled: false, label: "Approve submitted" }
      : { enabled: txReady, label: txReady ? "Approve" : "Approve locked", blocker: input.guard.blocker },
    depositAction: depositSubmitted
      ? { enabled: false, label: "Deposit submitted" }
      : { enabled: txReady, label: txReady ? "Deposit" : "Deposit locked", blocker: input.guard.blocker },
    receipt: {
      locked: input.receiptHash === null,
      reason: input.receiptHash === null ? "verifier_pending_sprint_11" : null,
      receiptHash: input.receiptHash
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveTransactionState
```

Expected:

```text
PASS liveTransactionState.test.ts
```

## Task 8: Live API Evidence Hardening

**Files:**

- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/live/liveTypes.test.ts`

- [ ] **Step 1: Add failing API tests**

Add these tests to `apps/web/src/lib/live/liveApi.test.ts`:

```typescript
it("rejects evidence for invalidated or expired manifests", async () => {
  const store = createMemoryLiveStore();
  const api = createLiveApiHandler({
    store,
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => ({
      runId: "run-1",
      nonce: "nonce-1",
      intentHash: `0x${"a".repeat(64)}`,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      expiryUnix: 100,
      preview: null
    })
  });

  await api({
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

  const expired = await api({
    method: "POST",
    pathname: "/api/runs/run-1/evidence",
    body: { approveTxHash: null, depositTxHash: `0x${"b".repeat(64)}` }
  });

  expect(expired.status).toBe(409);
  expect(expired.body.error).toBe("manifest_expired");
});

it("stores approve and deposit tx hashes but keeps receipt locked", async () => {
  const store = createMemoryLiveStore();
  const api = createLiveApiHandler({
    store,
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => ({
      runId: "run-1",
      nonce: "nonce-1",
      intentHash: `0x${"a".repeat(64)}`,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      expiryUnix: 1790003600,
      preview: null
    })
  });

  await api({
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

  const response = await api({
    method: "POST",
    pathname: "/api/runs/run-1/evidence",
    body: { approveTxHash: `0x${"c".repeat(64)}`, depositTxHash: `0x${"d".repeat(64)}` }
  });

  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    status: "depositSubmitted",
    receiptReady: false,
    nextSprint: "Sprint 11"
  });
  expect(store.getRun("run-1")?.status).toBe("depositSubmitted");
});
```

Add this test to `apps/web/src/lib/live/liveTypes.test.ts`:

```typescript
it("keeps receipt route locked for Sprint 10 transaction-submitted states", () => {
  expect(canOpenReceiptRoute({ status: "approveSubmitted", receiptHash: "0xreceipt" })).toBe(false);
  expect(canOpenReceiptRoute({ status: "depositSubmitted", receiptHash: "0xreceipt" })).toBe(false);
  expect(canOpenReceiptRoute({ status: "depositConfirmed", receiptHash: "0xreceipt" })).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
pnpm --filter @giwa/web --fail-if-no-match test -- liveTypes
```

Expected:

```text
liveApi fails because evidence currently lacks expiry and locked receipt response behavior.
liveTypes passes if receipt gate is already locked; keep the regression test.
```

- [ ] **Step 3: Harden `/api/runs/:runId/evidence`**

Update `apps/web/src/lib/live/liveApi.ts` with helpers:

```typescript
function requiredTxHash(body: Record<string, unknown>, key: string): string {
  const value = requiredString(body, key).toLowerCase();
  if (!/^0x[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${key} must be bytes32`);
  }
  return value;
}

function optionalTxHash(body: Record<string, unknown>, key: string): string | null {
  const value = optionalString(body, key)?.toLowerCase() ?? null;
  if (value === null) return null;
  if (!/^0x[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${key} must be bytes32`);
  }
  return value;
}

function nowUnix(nowIso: string): number {
  return Math.floor(new Date(nowIso).getTime() / 1000);
}
```

Replace the evidence branch with:

```typescript
const timestamp = deps.now();
if (run.status === "manifestInvalidated") {
  return { status: 409, body: { error: "manifest_invalidated" } };
}
if (nowUnix(timestamp) > run.expiryUnix) {
  return { status: 409, body: { error: "manifest_expired" } };
}
const body = objectBody(request.body);
const depositTxHash = requiredTxHash(body, "depositTxHash");
const approveTxHash = optionalTxHash(body, "approveTxHash");
const submitted = deps.store.saveSubmittedTx({
  runId: evidenceRunId,
  approveTxHash,
  depositTxHash,
  submittedAt: timestamp
});
const updated = deps.store.updateRunStatus(evidenceRunId, "depositSubmitted", deps.now());
return {
  status: 200,
  body: {
    ...submitted,
    status: updated.status,
    receiptReady: false,
    receiptHash: null,
    nextSprint: "Sprint 11"
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
pnpm --filter @giwa/web --fail-if-no-match test -- liveTypes
```

Expected:

```text
All tests pass.
```

## Task 9: Duplicate Deposit Hash Regression

**Files:**

- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Verify: `apps/web/src/lib/live/liveStore.test.ts`

- [ ] **Step 1: Add failing duplicate API test**

Add this test to `apps/web/src/lib/live/liveApi.test.ts`:

```typescript
it("rejects a deposit tx hash that already belongs to another run", async () => {
  const store = createMemoryLiveStore();
  let counter = 0;
  const api = createLiveApiHandler({
    store,
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async (input) => {
      counter += 1;
      return {
        runId: `run-${counter}`,
        nonce: `nonce-${counter}`,
        intentHash: `0x${String(counter).repeat(64).slice(0, 64)}`,
        manifestJson: JSON.stringify(input),
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      };
    }
  });

  for (const wallet of ["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222"]) {
    await api({
      method: "POST",
      pathname: "/api/runs",
      body: { wallet, chainId: 91342, campaignId: "gasok-demo", missionId: "first-mock-vault-deposit", referralCode: wallet }
    });
  }

  const depositTxHash = `0x${"d".repeat(64)}`;
  expect(
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: null, depositTxHash }
    })
  ).toMatchObject({ status: 200 });

  const duplicate = await api({
    method: "POST",
    pathname: "/api/runs/run-2/evidence",
    body: { approveTxHash: null, depositTxHash }
  });

  expect(duplicate.status).toBe(409);
  expect(duplicate.body.error).toBe("deposit_tx_hash_already_used");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
FAIL because duplicate store errors currently surface as generic 400 errors.
```

- [ ] **Step 3: Map duplicate deposit errors to 409**

Wrap `deps.store.saveSubmittedTx` in the evidence branch:

```typescript
let submitted;
try {
  submitted = deps.store.saveSubmittedTx({
    runId: evidenceRunId,
    approveTxHash,
    depositTxHash,
    submittedAt: timestamp
  });
} catch (error) {
  if (error instanceof Error && error.message === "depositTxHash already belongs to another run") {
    return { status: 409, body: { error: "deposit_tx_hash_already_used" } };
  }
  throw error;
}
```

- [ ] **Step 4: Run duplicate tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
pnpm --filter @giwa/web --fail-if-no-match test -- liveStore
```

Expected:

```text
API duplicate test passes.
Existing liveStore duplicate test still passes.
```

## Task 10: Wire Browser Approve and Deposit Actions

**Files:**

- Modify: `apps/web/public/live-flow.js`

- [ ] **Step 1: Add browser smokeable helpers**

In `apps/web/public/live-flow.js`, add these helpers above `render()`:

```javascript
function canRequestTransaction() {
  if (walletState.account === null) return false;
  if (walletState.status !== "connected") return false;
  if (walletState.chainId !== GIWA_CHAIN_ID) return false;
  if (runState === null || runState.status === "manifestInvalidated") return false;
  if (runState.manifestPreview === null) return false;
  return Math.floor(Date.now() / 1000) <= Number(runState.expiryUnix);
}

function approveCalldata(preview) {
  const selector = "0x095ea7b3";
  const spender = preview.spender.slice(2).padStart(64, "0");
  const amount = BigInt(preview.maxAllowanceBaseUnits).toString(16).padStart(64, "0");
  return `${selector}${spender}${amount}`;
}

function depositCalldata(preview) {
  const selector = "0xb6b55f25";
  const asset = preview.asset.slice(2).padStart(64, "0");
  const amount = BigInt(preview.amountBaseUnits).toString(16).padStart(64, "0");
  return `${selector}${asset}${amount}`;
}
```

- [ ] **Step 2: Replace disabled Sprint 10 buttons with guarded buttons**

Update the action buttons in `render()`:

```javascript
view("button", { type: "button", id: "approve-action", disabled: !canRequestTransaction() || runState?.approveTxHash, text: runState?.approveTxHash ? "Approve submitted" : "Approve" }),
view("button", { type: "button", id: "deposit-action", disabled: !canRequestTransaction() || runState?.depositTxHash, text: runState?.depositTxHash ? "Deposit submitted" : "Deposit" })
```

Add listeners after the primary action listener:

```javascript
document.querySelector("#approve-action")?.addEventListener("click", onApproveAction);
document.querySelector("#deposit-action")?.addEventListener("click", onDepositAction);
```

- [ ] **Step 3: Add wallet send and evidence submit handlers**

Add below `issueManifest()`:

```javascript
async function sendWalletTransaction(request) {
  const provider = walletProvider();
  if (provider === null) throw new Error("Wallet provider not detected");
  const hash = await provider.request({ method: "eth_sendTransaction", params: [request] });
  if (typeof hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    throw new Error("Wallet returned an invalid transaction hash");
  }
  return hash.toLowerCase();
}

async function submitEvidence() {
  if (!runState?.runId || !runState.depositTxHash) return;
  const response = await fetch(`/api/runs/${runState.runId}/evidence`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      approveTxHash: runState.approveTxHash ?? null,
      depositTxHash: runState.depositTxHash
    })
  });
  const body = await response.json();
  if (!response.ok) {
    notice = `Evidence submit blocked: ${body.error ?? "unknown error"}`;
    return;
  }
  runState = { ...runState, ...body, receiptLocked: true };
  notice = "Deposit submitted. Receipt remains locked until Sprint 11 verifier match.";
}

async function onApproveAction() {
  if (!canRequestTransaction()) return;
  try {
    const preview = runState.manifestPreview;
    const approveTxHash = await sendWalletTransaction({
      from: walletState.account,
      to: preview.asset,
      data: approveCalldata(preview),
      value: "0x0"
    });
    runState = { ...runState, approveTxHash, status: "approveSubmitted" };
    notice = "Approve transaction submitted.";
  } catch (error) {
    notice = error instanceof Error ? error.message : "Approve request failed";
  }
  render();
}

async function onDepositAction() {
  if (!canRequestTransaction()) return;
  try {
    const preview = runState.manifestPreview;
    const depositTxHash = await sendWalletTransaction({
      from: walletState.account,
      to: preview.target,
      data: depositCalldata(preview),
      value: "0x0"
    });
    runState = { ...runState, depositTxHash, status: "depositSubmitted" };
    await submitEvidence();
  } catch (error) {
    notice = error instanceof Error ? error.message : "Deposit request failed";
  }
  render();
}
```

- [ ] **Step 4: Run syntax and browser-scope scans**

Run:

```powershell
node --check apps/web/public/live-flow.js
rg -n "privateKey|mnemonic|seed phrase|Bearer|api[_-]?key|access[_-]?token" apps\web\public\live-flow.js
```

Expected:

```text
Syntax check exits 0.
Secret-surface scan has no matches.
```

## Task 11: Receipt Route and Disabled Server Actions Regression

**Files:**

- Modify: `apps/web/src/lib/live/liveApi.test.ts`

- [ ] **Step 1: Add regression tests**

Add these tests to `apps/web/src/lib/live/liveApi.test.ts`:

```typescript
it("keeps intent relay and verifier server actions disabled in Sprint 10", async () => {
  const api = createLiveApiHandler({
    store: createMemoryLiveStore(),
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => {
      throw new Error("not used");
    }
  });

  expect((await api({ method: "POST", pathname: "/api/runs/run-1/intent-submit", body: {} })).status).toBe(409);
  expect((await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} })).status).toBe(409);
});

it("does not open a receipt from submitted tx evidence", async () => {
  const store = createMemoryLiveStore();
  const api = createLiveApiHandler({
    store,
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => ({
      runId: "run-1",
      nonce: "nonce-1",
      intentHash: `0x${"a".repeat(64)}`,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      expiryUnix: 1790003600,
      preview: null
    })
  });

  await api({
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
  await api({
    method: "POST",
    pathname: "/api/runs/run-1/evidence",
    body: { approveTxHash: null, depositTxHash: `0x${"d".repeat(64)}` }
  });

  const receipt = await api({ method: "GET", pathname: `/api/receipts/0x${"e".repeat(64)}` });

  expect(receipt.status).toBe(404);
  expect(receipt.body.error).toBe("receipt_not_found");
});
```

- [ ] **Step 2: Run regression tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
All liveApi tests pass.
```

## Task 12: Static Fallback, Live Regression, and Final Verification

**Files:**

- Verify: `apps/web/public/flow.js`
- Verify: `apps/web/public/live-flow.js`
- Verify: `apps/web/scripts/serve-live.mjs`
- Verify: `apps/web/src/lib/transaction/*`
- Verify: `apps/web/src/lib/live/*`
- Verify: `apps/web/src/lib/wallet/*`

- [ ] **Step 1: Run focused Sprint 10 tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- wallet
pnpm --filter @giwa/web --fail-if-no-match test -- manifest
pnpm --filter @giwa/web --fail-if-no-match test -- transaction
pnpm --filter @giwa/web --fail-if-no-match test -- live
```

Expected:

```text
Wallet, manifest, transaction, and live tests pass.
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
All commands exit 0. Existing Node experimental warnings from the local runtime boundary are acceptable.
```

- [ ] **Step 3: Smoke Sprint 8 mock API**

Start mock live server:

```powershell
$env:GIWA_LIVE_MOCK_MODE="1"
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Request:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4177/api/partner/runs
```

Expected:

```text
HTTP 200 JSON response with source live and rows array.
```

- [ ] **Step 4: Smoke Sprint 9 signed manifest issuance**

Start non-mock live server with redacted env readiness only:

```powershell
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Request:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:4177/api/runs -Method POST -ContentType "application/json" -Body '{"wallet":"0x1111111111111111111111111111111111111111","chainId":91342,"campaignId":"gasok-demo","missionId":"first-mock-vault-deposit","referralCode":null}'
```

Expected:

```text
HTTP 201.
Response includes status manifestIssued, manifestSignature, manifestPreview, approveAction, and depositAction.
No secret value is printed.
```

- [ ] **Step 5: Smoke Sprint 7 static fallback**

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
Recorded fixture evidence remains visible.
```

- [ ] **Step 6: Run safe scans without reading real env files**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("payment set" + "tled")
$secretPattern = "0x[a-fA-F0-9]{64}|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|NEXT_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"
rg -n $docPattern docs\superpowers\plans\2026-06-17-sprint-10-live-approve-and-deposit.md docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $riskPattern docs\superpowers\plans\2026-06-17-sprint-10-live-approve-and-deposit.md docs\implementation apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $secretPattern docs\superpowers\plans\2026-06-17-sprint-10-live-approve-and-deposit.md docs\implementation apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
```

Expected:

```text
Unfinished-marker scan has no matches in Sprint 10 code or Sprint 10 docs.
Forbidden-claim scan has no matches in user-facing Sprint 10 copy.
Secret-like scan has no live credential values. Synthetic tests and pattern definitions are allowed only when no raw credential value is printed.
```

## Sprint 10 Exit Gate

Sprint 10 is complete only when:

- connected wallet plus GIWA Sepolia chain `91342` plus valid manifest enables approve and deposit buttons
- disconnected wallet, wrong chain, invalidated manifest, and expired manifest block transaction requests
- approve transaction request calldata is generated from manifest spender and max allowance
- deposit transaction request calldata is generated from manifest target, asset, and amount
- wallet-returned approve and deposit tx hashes are stored through the live API
- duplicate `depositTxHash` is rejected
- `/intent-submit` and `/verify` remain disabled or next-sprint gated
- receipt route remains locked
- no user wallet secret is requested
- no deploy, fund, anchor, or verify command is run
- Sprint 7 static fallback still works
- Sprint 8 mock API still works
- Sprint 9 signed manifest issuance still works

## Handoff

Sprint 10 completion report must include:

- files changed
- commands run and results
- live server URL
- live DB path
- approve tx hash and deposit tx hash storage evidence when a manual wallet run is performed
- confirmation that no user wallet secret was requested
- confirmation that `deploy:giwa`, `fund:giwa`, `anchor:giwa`, and `verify:giwa` were not run
- Sprint 7 fallback status
- Sprint 8 mock API status
- Sprint 9 signed manifest status
- unresolved risks
- explicit next sprint document path: `docs/superpowers/plans/2026-06-17-sprint-11-live-verifier-and-dynamic-receipt.md`

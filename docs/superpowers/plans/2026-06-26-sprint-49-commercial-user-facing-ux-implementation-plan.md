# Sprint 49 Commercial User-Facing UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the commercial user-facing UX for `GIWA Verified Intent Rail` as a separate static/live surface without changing existing demo, partner, reviewer, or operator routes.

**Architecture:** Add a focused user-flow model under `apps/web/src/lib/userFlow`, then render it through a new public user route shell and browser script. Reuse existing live API, wallet request behavior, verifier receipt API, public copy guard style, and static server routing patterns while keeping `/live`, `/demo`, `/partner`, recorded `/`, and existing receipt fallback behavior intact.

**Tech Stack:** TypeScript model tests with Vitest, dependency-free static HTML/JavaScript/CSS, existing Node static/live servers, existing `@giwa/web` scripts, no new packages.

---

## Scope

Sprint 49 implements the Sprint 48 commercial user-facing UX design:

```text
Action Page -> Wallet / Network Gate -> Intent Preview -> Transaction Progress -> Verified Receipt -> My Receipts -> Help / Recovery
```

The implementation must remain local/testnet MVP work. It must not deploy, public-host, connect managed infrastructure, dispatch protected CI, install dependencies, run chain-operation package commands, or ask for wallet signing material outside the browser wallet.

## Parallel Analysis Summary

| Perspective | Plan consequence |
| --- | --- |
| UI route/component decomposition | Add `/user`, `/user/receipt/<hash>`, `/user/receipts`, and `/user/help` static/live routes without replacing `/live`, `/demo`, `/partner`, or `/receipt/<hash>`. |
| State model and flow progression | Centralize user flow states in `apps/web/src/lib/userFlow/userFlowState.ts` so UI copy and buttons do not infer from raw live run values. |
| Wallet/network/intent UX boundary | Reuse GIWA Sepolia chain `91342`, EIP-1193 wallet events, and manifest issuance behavior, but expose user-safe labels only. |
| Receipt/public share boundary | Project dynamic receipt API output into a user receipt view with safe fields and collapsed technical details. |
| Recovery/support flow | Add deterministic support-summary and tx-hash recovery helpers; re-verify calls stay routed through existing live API boundaries. |
| Existing static/live code reuse | Keep `live-flow.js` as rehearsal surface; add `user-flow.js` for commercial user copy and route handling. |
| Test and smoke strategy | Add model/copy/view tests first, then public asset guard checks, node syntax checks, static/live route smoke, and existing full suite. |
| Security/privacy/copy guard | Add regression tests that reject raw exception readback, internal gate identifiers, signer-role internals, credential-marker text, overclaim phrases, and blocker-register copy in user assets. |

## File Responsibility Map

| File | Responsibility |
| --- | --- |
| `apps/web/src/lib/userFlow/userFlowState.ts` | Pure state machine and derived flags for Action Page, gate, preview, progress, receipt, receipts list, and recovery. |
| `apps/web/src/lib/userFlow/userFlowCopy.ts` | User-safe copy tables for CTAs, notices, errors, progress labels, and empty states. |
| `apps/web/src/lib/userFlow/userReceiptView.ts` | Projection from live receipt/API model into user-safe receipt cards and technical accordion fields. |
| `apps/web/src/lib/userFlow/userRecovery.ts` | Tx hash validation, support summary, and re-verify request boundary model. |
| `apps/web/src/lib/userFlow/*.test.ts` | Vitest coverage for state, copy, receipt projection, recovery, and public boundary constraints. |
| `apps/web/public/user.html` | Commercial user-facing route shell. |
| `apps/web/public/user-flow.js` | Dependency-free browser renderer and wallet/live API coordinator for user-facing routes. |
| `apps/web/public/styles.css` | Shared static styles plus user-flow classes, responsive stepper, receipt cards, and accordions. |
| `apps/web/scripts/serve-static.mjs` | Static route mapping for `/user`, `/user/receipt/<hash>`, `/user/receipts`, and `/user/help`. |
| `apps/web/scripts/serve-live.mjs` | Live route mapping for the same user routes while reusing existing `/api/*` endpoints. |
| `docs/evidence/commercial-user-flow-sprint49-plan.json` | Public-safe execution evidence produced during Sprint 49 implementation after tests pass. |
| `README.md` | Link to Sprint 49 plan/evidence after implementation. |
| `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md` | Add Sprint 49 execution row and status after implementation. |

## Route Boundary

| Route | Owner | Behavior |
| --- | --- | --- |
| `/user` | New commercial user flow | Action Page, Wallet / Network Gate, Intent Preview, Transaction Progress. |
| `/user/receipt/<hash>` | New public-safe receipt share | User-safe receipt page with collapsed technical details. |
| `/user/receipts` | New commercial user flow | Current-browser/local run receipt list projection. |
| `/user/help` | New commercial user flow | Tx hash paste, re-verify boundary, support summary copy. |
| `/live` | Existing rehearsal surface | Must remain unchanged except shared helper imports if explicitly needed. |
| `/demo` | Existing operator/reviewer surface | Must remain unchanged. |
| `/partner` | Existing partner/reviewer surface | Must remain unchanged. |
| `/receipt/<hash>` | Existing recorded/static receipt route | Must remain unchanged. |

## Task 1: User Flow State Model

**Files:**
- Create: `apps/web/src/lib/userFlow/userFlowState.ts`
- Create: `apps/web/src/lib/userFlow/userFlowState.test.ts`

- [ ] **Step 1: Write failing state tests**

Create `apps/web/src/lib/userFlow/userFlowState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveUserFlowState } from "./userFlowState";

describe("deriveUserFlowState", () => {
  it("blocks action before wallet connection", () => {
    const state = deriveUserFlowState({
      wallet: { status: "disconnected", account: null, chainId: null },
      run: null,
      nowUnix: 1_800_000_000
    });

    expect(state.currentScreen).toBe("actionPage");
    expect(state.primaryCta).toBe("connect_wallet");
    expect(state.canIssueIntent).toBe(false);
    expect(state.canRequestWalletAction).toBe(false);
    expect(state.progress.map((step) => step.id)).toEqual([
      "wallet_connected",
      "intent_issued",
      "approval_submitted",
      "deposit_submitted",
      "standard_rpc_receipt_found",
      "verification_matched",
      "receipt_ready"
    ]);
  });

  it("requires GIWA Sepolia before intent issuance", () => {
    const state = deriveUserFlowState({
      wallet: { status: "wrongChain", account: "0xf3a729973559082260e742ebedf705271ad29476", chainId: 1 },
      run: null,
      nowUnix: 1_800_000_000
    });

    expect(state.primaryCta).toBe("switch_network");
    expect(state.network.requiredChainId).toBe(91342);
    expect(state.canIssueIntent).toBe(false);
  });

  it("invalidates wallet action when manifest is expired", () => {
    const state = deriveUserFlowState({
      wallet: { status: "connected", account: "0xf3a729973559082260e742ebedf705271ad29476", chainId: 91342 },
      run: {
        status: "manifestIssued",
        runId: "run_1",
        expiryUnix: 1_799_999_999,
        manifestPreview: {
          actionName: "First mock vault action",
          amountBaseUnits: "1000000",
          target: "0x1111111111111111111111111111111111111111",
          wallet: "0xf3a729973559082260e742ebedf705271ad29476",
          intentHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        }
      },
      nowUnix: 1_800_000_000
    });

    expect(state.currentScreen).toBe("intentPreview");
    expect(state.canRequestWalletAction).toBe(false);
    expect(state.blockReason).toBe("manifest_expired");
  });
});
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlowState
```

Expected: fails because `userFlowState.ts` does not exist.

- [ ] **Step 3: Implement state model**

Create `apps/web/src/lib/userFlow/userFlowState.ts`:

```ts
export const USER_GIWA_CHAIN_ID = 91342 as const;

export type UserWalletStatus = "disconnected" | "connecting" | "connected" | "wrongChain" | "providerMissing";
export type UserRunStatus =
  | "idle"
  | "manifestIssued"
  | "approveSubmitted"
  | "depositSubmitted"
  | "standardRpcReceiptFound"
  | "verifierChecking"
  | "matched"
  | "pending"
  | "notMatched"
  | "failed"
  | "timeout"
  | "manifestInvalidated";
export type UserScreen = "actionPage" | "walletGate" | "intentPreview" | "progress" | "receipt" | "recovery";
export type UserCta = "connect_wallet" | "switch_network" | "review_action" | "continue_to_wallet" | "verify_receipt" | "view_receipt";
export type UserBlockReason =
  | "wallet_disconnected"
  | "wrong_network"
  | "manifest_missing"
  | "manifest_expired"
  | "manifest_invalidated"
  | "wallet_action_submitted"
  | "receipt_locked";

export type UserWalletState = {
  status: UserWalletStatus;
  account: string | null;
  chainId: number | null;
};

export type UserManifestPreview = {
  actionName: string;
  amountBaseUnits: string;
  target: string;
  wallet: string;
  intentHash: string;
};

export type UserRunState = {
  status: Exclude<UserRunStatus, "idle">;
  runId: string;
  expiryUnix: number;
  manifestPreview: UserManifestPreview | null;
  approveTxHash?: string | null;
  depositTxHash?: string | null;
  receiptHash?: string | null;
};

export type UserFlowInput = {
  wallet: UserWalletState;
  run: UserRunState | null;
  nowUnix: number;
};

export type UserProgressStep = {
  id:
    | "wallet_connected"
    | "intent_issued"
    | "approval_submitted"
    | "deposit_submitted"
    | "standard_rpc_receipt_found"
    | "verification_matched"
    | "receipt_ready";
  state: "pending" | "active" | "complete" | "blocked";
};

export type UserFlowState = {
  currentScreen: UserScreen;
  primaryCta: UserCta;
  canIssueIntent: boolean;
  canRequestWalletAction: boolean;
  canVerifyReceipt: boolean;
  blockReason: UserBlockReason | null;
  network: { requiredChainId: 91342; observedChainId: number | null };
  progress: UserProgressStep[];
};

function completeIf(condition: boolean): "pending" | "complete" {
  return condition ? "complete" : "pending";
}

export function deriveUserFlowState(input: UserFlowInput): UserFlowState {
  const walletConnected = input.wallet.status === "connected" && input.wallet.chainId === USER_GIWA_CHAIN_ID;
  const run = input.run;
  const manifestReady = run?.manifestPreview !== null && run?.manifestPreview !== undefined && run.status !== "manifestInvalidated";
  const expired = run !== null && input.nowUnix > run.expiryUnix;
  const approveSubmitted = typeof run?.approveTxHash === "string";
  const depositSubmitted = typeof run?.depositTxHash === "string";
  const matched = run?.status === "matched";
  const notMatched = run?.status === "notMatched" || run?.status === "failed";
  const receiptReady = matched && typeof run?.receiptHash === "string";

  let blockReason: UserBlockReason | null = null;
  if (!walletConnected) blockReason = input.wallet.status === "wrongChain" ? "wrong_network" : "wallet_disconnected";
  else if (run === null) blockReason = "manifest_missing";
  else if (run.status === "manifestInvalidated") blockReason = "manifest_invalidated";
  else if (expired) blockReason = "manifest_expired";
  else if (receiptReady) blockReason = null;

  const canIssueIntent = walletConnected && (run === null || run.status === "manifestInvalidated");
  const canRequestWalletAction = walletConnected && manifestReady && !expired && !receiptReady;
  const canVerifyReceipt = walletConnected && depositSubmitted && !matched && !notMatched;

  const currentScreen: UserScreen =
    receiptReady ? "receipt" : depositSubmitted ? "progress" : manifestReady ? "intentPreview" : "actionPage";

  const primaryCta: UserCta =
    input.wallet.account === null
      ? "connect_wallet"
      : input.wallet.chainId !== USER_GIWA_CHAIN_ID
        ? "switch_network"
        : receiptReady
          ? "view_receipt"
          : depositSubmitted
            ? "verify_receipt"
            : manifestReady
              ? "continue_to_wallet"
              : "review_action";

  return {
    currentScreen,
    primaryCta,
    canIssueIntent,
    canRequestWalletAction,
    canVerifyReceipt,
    blockReason,
    network: { requiredChainId: USER_GIWA_CHAIN_ID, observedChainId: input.wallet.chainId },
    progress: [
      { id: "wallet_connected", state: walletConnected ? "complete" : "active" },
      { id: "intent_issued", state: completeIf(Boolean(manifestReady)) },
      { id: "approval_submitted", state: completeIf(approveSubmitted) },
      { id: "deposit_submitted", state: completeIf(depositSubmitted) },
      {
        id: "standard_rpc_receipt_found",
        state: ["standardRpcReceiptFound", "verifierChecking", "matched", "notMatched", "failed", "timeout"].includes(run?.status ?? "")
          ? "complete"
          : "pending"
      },
      { id: "verification_matched", state: matched ? "complete" : notMatched ? "blocked" : "pending" },
      { id: "receipt_ready", state: receiptReady ? "complete" : "pending" }
    ]
  };
}
```

- [ ] **Step 4: Verify pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlowState
```

Expected: `userFlowState` tests pass.

## Task 2: User-Safe Copy Model

**Files:**
- Create: `apps/web/src/lib/userFlow/userFlowCopy.ts`
- Create: `apps/web/src/lib/userFlow/userFlowCopy.test.ts`

- [ ] **Step 1: Write failing copy tests**

Create `apps/web/src/lib/userFlow/userFlowCopy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { userBlockCopy, userCtaCopy, userProgressCopy, userReceiptStateCopy } from "./userFlowCopy";

const allCopy = [
  ...Object.values(userCtaCopy),
  ...Object.values(userBlockCopy),
  ...Object.values(userReceiptStateCopy),
  ...Object.values(userProgressCopy).flatMap((step) => [step.label, step.detail])
].join("\n");

describe("userFlowCopy", () => {
  it("maps core CTA and blocker states to bounded user copy", () => {
    expect(userCtaCopy.connect_wallet).toBe("Connect wallet");
    expect(userCtaCopy.switch_network).toBe("Switch to GIWA Sepolia");
    expect(userBlockCopy.manifest_expired).toBe("Review a fresh intent before continuing.");
  });

  it("keeps implementation and operator wording out of user copy", () => {
    expect(allCopy).not.toMatch(/gateReason|blocker register|protected CI|signer role|stack trace|exception/iu);
    expect(allCopy).not.toMatch(/production asset|production yield|identity service|safety guarantee/iu);
  });

  it("labels fast feedback as non-final", () => {
    expect(userProgressCopy.standard_rpc_receipt_found.detail).toContain("standard RPC");
    expect(allCopy).not.toMatch(/preconfirmed success|final in/iu);
  });
});
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlowCopy
```

Expected: fails because copy module does not exist.

- [ ] **Step 3: Implement copy tables**

Create `apps/web/src/lib/userFlow/userFlowCopy.ts`:

```ts
import type { UserBlockReason, UserCta, UserProgressStep } from "./userFlowState";

export const userCtaCopy: Record<UserCta, string> = {
  connect_wallet: "Connect wallet",
  switch_network: "Switch to GIWA Sepolia",
  review_action: "Review action",
  continue_to_wallet: "Continue to wallet",
  verify_receipt: "Verify receipt",
  view_receipt: "View receipt"
};

export const userBlockCopy: Record<UserBlockReason, string> = {
  wallet_disconnected: "Connect a wallet to continue.",
  wrong_network: "Switch to GIWA Sepolia to continue.",
  manifest_missing: "Review the action before continuing.",
  manifest_expired: "Review a fresh intent before continuing.",
  manifest_invalidated: "Your wallet context changed. Review a fresh intent before continuing.",
  wallet_action_submitted: "Wallet action is already submitted.",
  receipt_locked: "Receipt is waiting for verification."
};

export const userReceiptStateCopy = {
  verified: "Verified receipt ready.",
  pending: "Receipt is waiting for verification.",
  notMatched: "This transaction did not match the reviewed action."
} as const;

export const userProgressCopy: Record<UserProgressStep["id"], { label: string; detail: string }> = {
  wallet_connected: {
    label: "Wallet connected",
    detail: "Your wallet is connected to GIWA Sepolia."
  },
  intent_issued: {
    label: "Intent issued",
    detail: "The action preview is bound to your wallet."
  },
  approval_submitted: {
    label: "Approval submitted",
    detail: "Your wallet returned the approval transaction hash."
  },
  deposit_submitted: {
    label: "Deposit submitted",
    detail: "Your wallet returned the deposit transaction hash."
  },
  standard_rpc_receipt_found: {
    label: "Block evidence found",
    detail: "The verifier found standard RPC block evidence."
  },
  verification_matched: {
    label: "Verification matched",
    detail: "The confirmed transaction matched the reviewed action."
  },
  receipt_ready: {
    label: "Receipt ready",
    detail: "Your receipt is ready to view and share."
  }
};
```

- [ ] **Step 4: Verify pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlowCopy
```

Expected: copy tests pass.

## Task 3: Receipt Projection And Public Share Boundary

**Files:**
- Create: `apps/web/src/lib/userFlow/userReceiptView.ts`
- Create: `apps/web/src/lib/userFlow/userReceiptView.test.ts`

- [ ] **Step 1: Write failing receipt projection tests**

Create `apps/web/src/lib/userFlow/userReceiptView.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildUserReceiptView } from "./userReceiptView";

describe("buildUserReceiptView", () => {
  it("projects matched receipt fields into a user-safe view", () => {
    const view = buildUserReceiptView({
      status: "matched",
      receiptHash: "0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8",
      depositTxHash: "0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30",
      blockNumber: 28483877,
      wallet: "0xf3a729973559082260e742ebedf705271ad29476",
      actionName: "First mock vault action",
      networkName: "GIWA Sepolia",
      technical: {
        intentHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        verifierInputHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        target: "0x1111111111111111111111111111111111111111",
        selector: "0x47e7ef24",
        asset: "0x2222222222222222222222222222222222222222",
        spender: "0x3333333333333333333333333333333333333333",
        blockHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
      }
    });

    expect(view.state).toBe("verified");
    expect(view.summary.receiptId).toBe("0x057b0c02...74be8");
    expect(view.share.copyLabel).toBe("Copy receipt link");
    expect(view.technicalAccordion).toHaveLength(7);
  });

  it("does not project internal or operator fields", () => {
    const view = buildUserReceiptView({
      status: "pending",
      receiptHash: null,
      depositTxHash: null,
      blockNumber: null,
      wallet: "0xf3a729973559082260e742ebedf705271ad29476",
      actionName: "First mock vault action",
      networkName: "GIWA Sepolia",
      technical: {}
    });

    const json = JSON.stringify(view);
    expect(json).not.toMatch(/gateReason|localDb|blocker|protectedCI|signer/iu);
    expect(view.state).toBe("pending");
  });
});
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userReceiptView
```

Expected: fails because receipt view module does not exist.

- [ ] **Step 3: Implement receipt projection**

Create `apps/web/src/lib/userFlow/userReceiptView.ts`:

```ts
export type UserReceiptInput = {
  status: "matched" | "pending" | "notMatched" | "failed" | "timeout";
  receiptHash: string | null;
  depositTxHash: string | null;
  blockNumber: number | null;
  wallet: string;
  actionName: string;
  networkName: string;
  technical: Partial<Record<"intentHash" | "verifierInputHash" | "target" | "selector" | "asset" | "spender" | "blockHash", string>>;
};

export type UserReceiptView = {
  state: "verified" | "pending" | "notMatched";
  summary: {
    receiptId: string;
    actionName: string;
    wallet: string;
    networkName: string;
    depositTxHash: string;
    blockNumber: string;
  };
  share: {
    copyLabel: string;
    href: string | null;
  };
  technicalAccordion: Array<{ label: string; value: string }>;
};

function shortHash(value: string | null): string {
  if (typeof value !== "string" || value.length < 18) return "pending";
  return `${value.slice(0, 10)}...${value.slice(-5)}`;
}

export function buildUserReceiptView(input: UserReceiptInput): UserReceiptView {
  const state = input.status === "matched" ? "verified" : input.status === "pending" || input.status === "timeout" ? "pending" : "notMatched";
  const technicalLabels: Record<string, string> = {
    intentHash: "Intent hash",
    verifierInputHash: "Verifier input hash",
    target: "Target",
    selector: "Selector",
    asset: "Asset",
    spender: "Spender",
    blockHash: "Block hash"
  };

  return {
    state,
    summary: {
      receiptId: shortHash(input.receiptHash),
      actionName: input.actionName,
      wallet: input.wallet,
      networkName: input.networkName,
      depositTxHash: shortHash(input.depositTxHash),
      blockNumber: input.blockNumber === null ? "pending" : String(input.blockNumber)
    },
    share: {
      copyLabel: "Copy receipt link",
      href: input.receiptHash === null ? null : `/user/receipt/${input.receiptHash}`
    },
    technicalAccordion: Object.entries(technicalLabels)
      .map(([key, label]) => ({ label, value: input.technical[key as keyof typeof input.technical] }))
      .filter((entry): entry is { label: string; value: string } => typeof entry.value === "string")
  };
}
```

- [ ] **Step 4: Verify pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userReceiptView
```

Expected: receipt projection tests pass.

## Task 4: Recovery And Support Model

**Files:**
- Create: `apps/web/src/lib/userFlow/userRecovery.ts`
- Create: `apps/web/src/lib/userFlow/userRecovery.test.ts`

- [ ] **Step 1: Write failing recovery tests**

Create `apps/web/src/lib/userFlow/userRecovery.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildSupportSummary, parseRecoveryTxHash } from "./userRecovery";

describe("userRecovery", () => {
  it("accepts public transaction hashes and normalizes them", () => {
    expect(parseRecoveryTxHash(" 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA ")).toEqual({
      ok: true,
      txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    });
  });

  it("rejects malformed recovery input without echoing raw input", () => {
    expect(parseRecoveryTxHash("not a hash")).toEqual({ ok: false, error: "invalid_transaction_hash" });
  });

  it("builds support summary with public fields only", () => {
    const summary = buildSupportSummary({
      receiptId: "0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8",
      txHash: "0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30",
      wallet: "0xf3a729973559082260e742ebedf705271ad29476",
      network: "GIWA Sepolia",
      status: "pending",
      timestamp: "2026-06-26T00:00:00.000Z"
    });

    expect(summary).toContain("Receipt: 0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8");
    expect(summary).not.toMatch(/localDb|gateReason|credential|runtime/iu);
  });
});
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userRecovery
```

Expected: fails because recovery module does not exist.

- [ ] **Step 3: Implement recovery helpers**

Create `apps/web/src/lib/userFlow/userRecovery.ts`:

```ts
export type RecoveryTxHashResult =
  | { ok: true; txHash: string }
  | { ok: false; error: "invalid_transaction_hash" };

export function parseRecoveryTxHash(input: string): RecoveryTxHashResult {
  const normalized = input.trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/u.test(normalized)) return { ok: false, error: "invalid_transaction_hash" };
  return { ok: true, txHash: normalized };
}

export type SupportSummaryInput = {
  receiptId: string | null;
  txHash: string | null;
  wallet: string;
  network: string;
  status: "verified" | "pending" | "notMatched";
  timestamp: string;
};

export function buildSupportSummary(input: SupportSummaryInput): string {
  return [
    `Receipt: ${input.receiptId ?? "pending"}`,
    `Transaction: ${input.txHash ?? "pending"}`,
    `Wallet: ${input.wallet}`,
    `Network: ${input.network}`,
    `Status: ${input.status}`,
    `Time: ${input.timestamp}`
  ].join("\n");
}
```

- [ ] **Step 4: Verify pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userRecovery
```

Expected: recovery tests pass.

## Task 5: Commercial User Route Shell

**Files:**
- Create: `apps/web/public/user.html`
- Modify: `apps/web/scripts/serve-static.mjs`
- Modify: `apps/web/scripts/serve-live.mjs`
- Test: `apps/web/src/lib/live/userRouteMapping.test.ts`

- [ ] **Step 1: Write failing route mapping test**

Create `apps/web/src/lib/live/userRouteMapping.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("commercial user route mapping", () => {
  it("static and live servers route user paths to user.html", () => {
    const staticServer = readFileSync("apps/web/scripts/serve-static.mjs", "utf8");
    const liveServer = readFileSync("apps/web/scripts/serve-live.mjs", "utf8");

    for (const source of [staticServer, liveServer]) {
      expect(source).toContain('decoded === "/user"');
      expect(source).toContain('decoded.startsWith("/user/receipt/")');
      expect(source).toContain('decoded === "/user/receipts"');
      expect(source).toContain('decoded === "/user/help"');
      expect(source).toContain('"/user.html"');
    }
  });

  it("does not reroute existing demo, partner, or recorded receipt surfaces", () => {
    const staticServer = readFileSync("apps/web/scripts/serve-static.mjs", "utf8");
    expect(staticServer).toContain('decoded === "/demo"');
    expect(staticServer).toContain('decoded === "/" || decoded === "/partner" || decoded.startsWith("/receipt/")');
  });
});
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userRouteMapping
```

Expected: fails because `/user` routes are absent.

- [ ] **Step 3: Create user shell**

Create `apps/web/public/user.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GIWA Verified Intent Rail Action</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main id="app" class="app-shell user-shell" aria-live="polite">
      <section class="loading-panel">
        <p class="eyebrow">GIWA Verified Intent Rail</p>
        <h1>Loading action</h1>
      </section>
    </main>
    <script type="module" src="/user-flow.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Add route mapping**

In both server scripts, extend `publicPath(pathname)` so these paths resolve to `"/user.html"` before the existing `/`, `/partner`, and `/receipt/` branch:

```js
decoded === "/user" ||
decoded === "/user/receipts" ||
decoded === "/user/help" ||
decoded.startsWith("/user/receipt/")
  ? "/user.html"
```

- [ ] **Step 5: Verify pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userRouteMapping
node --check apps/web/scripts/serve-static.mjs
node --check apps/web/scripts/serve-live.mjs
```

Expected: route mapping test and syntax checks pass.

## Task 6: User Browser Renderer

**Files:**
- Create: `apps/web/public/user-flow.js`
- Test: `apps/web/src/lib/live/publicCopyGuard.test.ts`

- [ ] **Step 1: Extend failing public-copy guard**

Modify `apps/web/src/lib/live/publicCopyGuard.test.ts` to include `apps/web/public/user-flow.js` and reject raw browser failure copy:

```ts
const publicAssetPaths = [
  "apps/web/public/flow.js",
  "apps/web/public/live-flow.js",
  "apps/web/public/demo-control-room.js",
  "apps/web/public/user-flow.js"
];

expect(copy).not.toMatch(/error\s+instanceof\s+Error\s*\?\s*error\.message/u);
expect(copy).not.toMatch(/gateReason|blocker register|protected CI|signer role/iu);
expect(copy).not.toMatch(/production asset|production yield|safety guarantee/iu);
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
```

Expected: fails because `user-flow.js` is missing or not included safely.

- [ ] **Step 3: Create minimal renderer**

Create `apps/web/public/user-flow.js` with these responsibilities:

```js
const app = document.querySelector("#app");
const GIWA_CHAIN_ID = 91342;
const GIWA_CHAIN_HEX = "0x164ce";

let walletState = { status: "disconnected", account: null, chainId: null };
let runState = null;
let notice = "Review the action before your wallet asks for approval.";

function view(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (value !== null && value !== false) node.setAttribute(key, String(value));
  }
  for (const child of children) node.append(child);
  return node;
}

function publicNotice(kind) {
  const notices = {
    wallet: "Wallet request was not completed. Check the wallet state and try again.",
    network: "Switch to GIWA Sepolia to continue.",
    manifest: "Action preview could not be created. Retry from this page.",
    approve: "Approve request was not completed. Check the wallet and try again.",
    deposit: "Deposit request was not completed. Check the wallet and try again.",
    verify: "Verification is temporarily unavailable. Retry from this receipt.",
    recovery: "Enter a valid transaction hash and try again."
  };
  return notices[kind] ?? "Request was not completed. Try again from the current step.";
}

function routeName() {
  if (location.pathname === "/user/receipts") return "receipts";
  if (location.pathname === "/user/help") return "help";
  if (location.pathname.startsWith("/user/receipt/")) return "receipt";
  return "action";
}

function renderActionPage() {
  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow user-action-hero" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "GIWA Sepolia action" }),
        view("h1", { text: "Review your testnet action before signing" }),
        view("p", {
          className: "lead",
          text: "Connect a wallet, review the intent, submit wallet actions, and receive a receipt after verification."
        }),
        view("p", { className: "notice", role: "status", "aria-live": "polite", text: notice }),
        view("div", { className: "hero-actions" }, [
          view("button", { type: "button", id: "user-primary-action", text: primaryLabel() }),
          view("a", { className: "secondary-link", href: "/user/help", text: "Need help?" }),
          view("a", { className: "secondary-link", href: "/user/receipts", text: "My receipts" })
        ])
      ]),
      renderIntentPanel()
    ])
  );
  document.querySelector("#user-primary-action")?.addEventListener("click", onPrimaryAction);
}

function primaryLabel() {
  if (walletState.account === null) return "Connect wallet";
  if (walletState.chainId !== GIWA_CHAIN_ID) return "Switch to GIWA Sepolia";
  if (runState?.receiptHash) return "View receipt";
  if (runState?.manifestPreview) return "Continue to wallet";
  return "Review action";
}
```

Continue the file by adapting safe pieces from `live-flow.js`: wallet connect, switch network, manifest issuance, approve/deposit request, evidence submit, verify request, receipt route rendering, receipts list rendering, and help rendering. Keep all `catch` blocks mapped to `publicNotice(kind)` and do not display raw exception messages.

- [ ] **Step 4: Verify syntax and guard**

Run:

```powershell
node --check apps/web/public/user-flow.js
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
```

Expected: syntax passes and public-copy guard passes.

## Task 7: Action Page And Wallet / Network Gate Rendering

**Files:**
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/styles.css`
- Test: `apps/web/src/lib/userFlow/userFlowState.test.ts`
- Test: `apps/web/src/lib/userFlow/userFlowCopy.test.ts`

- [ ] **Step 1: Add failing model/copy cases**

Extend tests with:

```ts
expect(deriveUserFlowState({
  wallet: { status: "providerMissing", account: null, chainId: null },
  run: null,
  nowUnix: 1
}).primaryCta).toBe("connect_wallet");

expect(userBlockCopy.wrong_network).toBe("Switch to GIWA Sepolia to continue.");
```

- [ ] **Step 2: Verify targeted tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlowState userFlowCopy
```

Expected: pass after prior tasks, fail only if missing new state handling.

- [ ] **Step 3: Implement page and gate sections**

Render these user-facing sections in `user-flow.js`:

- action summary card
- required wallet card
- network label card
- expected steps list
- bounded notice area
- primary CTA
- help and receipts links

Add styles in `styles.css`:

```css
.user-action-hero {
  min-height: 92vh;
}

.user-step-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 18px 0 0;
  list-style: none;
}

.user-step-list li {
  border: 1px solid #d7dedc;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlow
node --check apps/web/public/user-flow.js
```

Expected: tests and syntax pass.

## Task 8: Intent Preview With Collapsed Technical Details

**Files:**
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/styles.css`
- Test: `apps/web/src/lib/userFlow/userFlowCopy.test.ts`

- [ ] **Step 1: Add failing copy guard for preview**

Add assertions that the preview copy exposes user fields but not signer-role or internal terms:

```ts
expect(allCopy).not.toMatch(/signer role|server-only|internal gate/iu);
```

- [ ] **Step 2: Implement preview rendering**

In `user-flow.js`, render:

- action name
- amount
- target label and shortened target
- wallet
- expiry
- primary CTA
- collapsed `<details>` with target, selector, asset, spender, max allowance, intent hash

Use `details`/`summary` for the technical section:

```js
view("details", { className: "panel user-technical-details" }, [
  view("summary", { text: "Technical details" }),
  field("Target", preview.target),
  field("Selector", preview.selector),
  field("Asset", preview.asset),
  field("Spender", preview.spender),
  field("Intent hash", preview.intentHash)
]);
```

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlowCopy
node --check apps/web/public/user-flow.js
```

Expected: pass.

## Task 9: Transaction Progress Stepper

**Files:**
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/styles.css`
- Test: `apps/web/src/lib/userFlow/userFlowState.test.ts`

- [ ] **Step 1: Add failing progress tests**

Add a test that a matched run completes all progress steps:

```ts
const state = deriveUserFlowState({
  wallet: { status: "connected", account: "0xf3a729973559082260e742ebedf705271ad29476", chainId: 91342 },
  run: {
    status: "matched",
    runId: "run_1",
    expiryUnix: 1_800_000_100,
    manifestPreview: {
      actionName: "First mock vault action",
      amountBaseUnits: "1000000",
      target: "0x1111111111111111111111111111111111111111",
      wallet: "0xf3a729973559082260e742ebedf705271ad29476",
      intentHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },
    approveTxHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    depositTxHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
    receiptHash: "0x3333333333333333333333333333333333333333333333333333333333333333"
  },
  nowUnix: 1_800_000_000
});

expect(state.progress.every((step) => step.state === "complete")).toBe(true);
```

- [ ] **Step 2: Implement stepper rendering**

Render the seven progress steps using state/copy tables:

- wallet connected
- intent issued
- approval submitted
- deposit submitted
- standard RPC receipt found
- verification matched
- receipt ready

Use existing `.status-rail` where possible and add only minimal user-specific classes if needed.

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlowState
node --check apps/web/public/user-flow.js
```

Expected: pass.

## Task 10: Verified Receipt Page And Share Link

**Files:**
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/styles.css`
- Test: `apps/web/src/lib/userFlow/userReceiptView.test.ts`

- [ ] **Step 1: Extend receipt projection tests**

Add pending and not-matched cases:

```ts
expect(buildUserReceiptView({
  status: "failed",
  receiptHash: null,
  depositTxHash: "0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30",
  blockNumber: 28483877,
  wallet: "0xf3a729973559082260e742ebedf705271ad29476",
  actionName: "First mock vault action",
  networkName: "GIWA Sepolia",
  technical: {}
}).state).toBe("notMatched");
```

- [ ] **Step 2: Implement route behavior**

For `/user/receipt/<hash>`:

- fetch `/api/receipts/<hash>` on live server
- render verified receipt if `status` is matched
- render pending/not matched copy if API returns bounded missing or locked response
- render copy/share button for verified receipt
- include explorer links when available
- render technical accordion collapsed by default

Static server fallback may render a safe empty receipt state when `/api/receipts` is unavailable.

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userReceiptView
node --check apps/web/public/user-flow.js
```

Expected: pass.

## Task 11: My Receipts

**Files:**
- Modify: `apps/web/public/user-flow.js`
- Create: `apps/web/src/lib/userFlow/userReceiptsList.ts`
- Create: `apps/web/src/lib/userFlow/userReceiptsList.test.ts`

- [ ] **Step 1: Write failing receipts list tests**

Create `apps/web/src/lib/userFlow/userReceiptsList.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterUserReceipts } from "./userReceiptsList";

describe("filterUserReceipts", () => {
  const receipts = [
    { id: "r1", state: "verified" as const, actionName: "First mock vault action" },
    { id: "r2", state: "pending" as const, actionName: "First mock vault action" },
    { id: "r3", state: "notMatched" as const, actionName: "First mock vault action" }
  ];

  it("filters user receipt states", () => {
    expect(filterUserReceipts(receipts, "verified")).toHaveLength(1);
    expect(filterUserReceipts(receipts, "pending")).toHaveLength(1);
    expect(filterUserReceipts(receipts, "notMatched")).toHaveLength(1);
    expect(filterUserReceipts(receipts, "all")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Implement list helper**

Create:

```ts
export type UserReceiptListState = "verified" | "pending" | "notMatched";
export type UserReceiptListFilter = UserReceiptListState | "all";
export type UserReceiptListItem = {
  id: string;
  state: UserReceiptListState;
  actionName: string;
};

export function filterUserReceipts(items: UserReceiptListItem[], filter: UserReceiptListFilter): UserReceiptListItem[] {
  if (filter === "all") return items;
  return items.filter((item) => item.state === filter);
}
```

- [ ] **Step 3: Render `/user/receipts`**

In `user-flow.js`, render:

- filters: `All`, `Verified`, `Pending`, `Not matched`
- cards from current run/local projection
- empty state: `No receipts yet. Start an action to create your first receipt.`

Do not render partner KPIs, blocker register status, or operator links.

- [ ] **Step 4: Verify**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userReceiptsList
node --check apps/web/public/user-flow.js
```

Expected: pass.

## Task 12: Help / Recovery

**Files:**
- Modify: `apps/web/public/user-flow.js`
- Test: `apps/web/src/lib/userFlow/userRecovery.test.ts`

- [ ] **Step 1: Add recovery rendering coverage through static source guard**

Extend public copy guard with user help route text expectations:

```ts
expect(copy).toContain("Enter a valid transaction hash");
expect(copy).toContain("Copy support summary");
expect(copy).not.toMatch(/raw request|upstream|stack|runtime config/iu);
```

- [ ] **Step 2: Implement `/user/help`**

Render:

- tx hash paste input
- `Re-verify` button boundary
- support summary copy area
- return to action page link
- bounded notices for invalid tx hash or unavailable verification

Re-verify may call existing live API only when a current run id is present; otherwise render user-safe recovery guidance.

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userRecovery publicCopyGuard
node --check apps/web/public/user-flow.js
```

Expected: pass.

## Task 13: Styles And Responsive Polish

**Files:**
- Modify: `apps/web/public/styles.css`

- [ ] **Step 1: Add visual constraints**

Add user-flow classes without changing existing card nesting or broad palette:

```css
.user-shell .hero-flow {
  min-height: 88vh;
}

.user-receipt-card,
.user-help-panel {
  border: 1px solid #d7dedc;
  border-radius: 8px;
  background: #ffffff;
  padding: 20px;
}

.user-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.user-technical-details {
  margin-top: 16px;
}
```

- [ ] **Step 2: Verify CSS and route syntax**

Run:

```powershell
node --check apps/web/public/user-flow.js
```

Expected: syntax passes. CSS is validated through browser smoke in Task 16.

## Task 14: Public Boundary Regression Tests

**Files:**
- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`
- Create: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`

- [ ] **Step 1: Add user boundary test**

Create:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("commercial user public boundary", () => {
  it("does not expose internal blocker or credential-marker copy in user public assets", () => {
    const files = [
      "apps/web/public/user.html",
      "apps/web/public/user-flow.js",
      "apps/web/public/styles.css"
    ];
    const joined = files.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(joined).not.toMatch(/gateReason|protected CI|blocker register|local DB path|signer role/iu);
    expect(joined).not.toMatch(/production asset|production yield|safety guarantee|final confirmation in/iu);
    const credentialPattern = new RegExp(
      [("mnem" + "onic"), ("seed ph" + "rase"), "credential value", ("bear" + "er " + "token")].join("|"),
      "iu"
    );
    expect(joined).not.toMatch(credentialPattern);
  });
});
```

- [ ] **Step 2: Verify**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userPublicBoundary publicCopyGuard
```

Expected: pass.

## Task 15: Sprint 49 Evidence And Docs

**Files:**
- Create: `docs/evidence/commercial-user-flow-sprint49-plan.json`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

- [ ] **Step 1: Create public-safe evidence JSON**

After implementation and verification, create:

```json
{
  "sprint": 49,
  "title": "Commercial User-Facing UX Implementation",
  "authority": "local-advisory",
  "implementedSurfaces": [
    "/user",
    "/user/receipt/<receiptHash>",
    "/user/receipts",
    "/user/help"
  ],
  "preservedSurfaces": [
    "/",
    "/live",
    "/demo",
    "/partner",
    "/receipt/<receiptHash>"
  ],
  "blockedExternalActions": [
    "protected-ci-dispatch",
    "public-hosting",
    "managed-infrastructure",
    "chain-operation-package-commands",
    "dependency-install"
  ],
  "verification": {
    "webUserTests": "pass",
    "webTests": "pass",
    "typecheck": "pass",
    "build": "pass",
    "nodeChecks": "pass",
    "safeScans": "pass"
  }
}
```

Do not include local environment file contents, credential values, raw request bodies, or external signoff claims.

- [ ] **Step 2: Update routing docs**

Add Sprint 49 links and state to:

- `README.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

Keep Sprint 49 local-advisory and no-deployment.

## Task 16: Verification And Smoke

**Files:**
- All Sprint 49 files.

- [ ] **Step 1: Targeted tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- userFlow
pnpm --filter @giwa/web --fail-if-no-match test -- userReceipt
pnpm --filter @giwa/web --fail-if-no-match test -- userRecovery
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
```

Expected: all targeted tests pass.

- [ ] **Step 2: Package verification**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/public/user-flow.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Expected: all commands pass.

- [ ] **Step 3: Static server smoke**

Run:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
```

Smoke in a second terminal:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/user
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/user/receipts
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/user/help
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner
```

Expected: all return HTTP `200`.

- [ ] **Step 4: Live server smoke**

Run with the existing local live DB only:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:PORT="4190"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Smoke:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/user
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/user/receipts
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/user/help
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/demo
```

Expected: all return HTTP `200`. Do not submit wallet transactions during smoke.

- [ ] **Step 5: Full local advisory verification**

Run:

```powershell
powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
pnpm test
pnpm build
pnpm typecheck
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
git status --short
```

Expected: all commands pass and working tree contains only Sprint 49 changes before commit.

## Task 17: Commit

**Files:**
- Sprint 49 changed files only.

- [ ] **Step 1: Inspect diff**

Run:

```powershell
git diff -- README.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\evidence\commercial-user-flow-sprint49-plan.json apps\web
```

Expected: diff contains only commercial user-facing UX implementation, tests, docs, styles, and evidence.

- [ ] **Step 2: Commit**

Run:

```powershell
git add README.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\evidence\commercial-user-flow-sprint49-plan.json apps\web
git commit -m "feat: add commercial user-facing ux flow [skip ci]"
```

Expected: commit succeeds. Use `[skip ci]` because protected CI dispatch remains external-blocked unless a separate approval changes that state.

## Exit Gate

Sprint 49 is complete only when:

- `/user`, `/user/receipt/<hash>`, `/user/receipts`, and `/user/help` are implemented locally.
- Existing `/`, `/live`, `/demo`, `/partner`, and `/receipt/<hash>` routes still work.
- User copy is bounded and does not expose raw exception messages, internal gate identifiers, signer-role internals, local runtime details, or overclaim language.
- Receipt view exposes safe fields by default and technical details only through an accordion.
- My Receipts and Help / Recovery are local-safe and do not imply partner dashboard or operator control access.
- Tests, typecheck, build, node syntax checks, artifact verification, and safe scans pass.
- No public hosting, deployment, protected CI dispatch, managed infrastructure connection, dependency installation, wallet transaction, or chain-operation package command is run.

## Next Sprint Candidate

After Sprint 49 passes, Sprint 50 should be a local UX QA and responsive smoke sprint:

```text
docs/superpowers/plans/2026-06-26-sprint-50-commercial-user-facing-ux-qa-and-smoke.md
```

Sprint 50 should use browser screenshots and mobile/desktop smoke only after Sprint 49 implementation exists.

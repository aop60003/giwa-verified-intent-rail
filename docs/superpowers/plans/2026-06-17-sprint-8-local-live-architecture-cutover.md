# Sprint 8 Local Live Architecture Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the local runtime foundation for fresh GIWA Sepolia live runs without sending wallet transactions yet.

**Architecture:** Keep the Sprint 7 static evidence viewer intact, then add a local live server boundary, redacted env validation, typed run states, SQLite-backed run persistence, and API contracts for manifest issuance, intent relay, evidence submission, verification, receipt lookup, and partner run listing. Sprint 8 stops before wallet signing and before live approve/deposit transactions.

**Tech Stack:** TypeScript 6, Vitest 4, viem 2, Node HTTP server, Node `node:sqlite` experimental local adapter behind a narrow storage interface, existing protocol/verifier libraries.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-17-giwa-live-mvp-architecture-cutover-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/implementation/giwa-mvp-role-and-key-policy.md`
- `docs/implementation/giwa-mvp-faucet-and-preflight.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`

## Sprint 8 Boundary

Sprint 8 creates runtime contracts and local persistence only.

Allowed:

- local live API server
- redacted env readiness
- local SQLite storage
- typed run state model
- API request and response validators
- route handlers with mocked chain clients
- fixture and live source separation
- tests for idempotency and receipt locking

Not allowed:

- sending wallet approve or deposit transactions
- requesting a user wallet secret
- running `deploy:giwa`, `fund:giwa`, `anchor:giwa`, or `verify:giwa`
- exposing server-only env values to browser assets
- replacing the Sprint 7 static demo
- using Flashblocks as final confirmation

## File Structure

Create:

- `apps/web/src/lib/live/liveTypes.ts` - live run statuses, API request/response types, terminal-state helpers
- `apps/web/src/lib/live/liveTypes.test.ts` - status and receipt gate tests
- `apps/web/src/lib/live/liveEnv.ts` - server-only env validation with redacted output
- `apps/web/src/lib/live/liveEnv.test.ts` - missing/malformed env tests without printing values
- `apps/web/src/lib/live/liveStore.ts` - storage interface, in-memory implementation, SQLite implementation
- `apps/web/src/lib/live/liveStore.test.ts` - uniqueness, idempotency, and terminal-decision tests
- `apps/web/src/lib/live/liveApi.ts` - method/path router and pure API handlers
- `apps/web/src/lib/live/liveApi.test.ts` - API contract tests with mocked storage and chain services
- `apps/web/src/lib/live/node-sqlite.d.ts` - minimal type declaration for `node:sqlite`
- `apps/web/src/lib/live/node-runtime.d.ts` - minimal Node test/runtime type declarations used by Sprint 8 tests
- `apps/web/scripts/serve-live.mjs` - local static plus live API server
- `docs/implementation/giwa-live-mvp-runtime-gate.md` - Sprint 8 runtime boundary and local commands

Modify:

- `apps/web/package.json` - add `dev:live`, `serve:live`, and `test:live`
- `apps/web/tsconfig.json` - include live `.d.ts`
- `docs/implementation/giwa-mvp-runbook.md` - link to Local Live MVP runtime gate
- `docs/implementation/giwa-mvp-dependency-approval.md` - record that Sprint 8 uses built-in `node:sqlite` and installs no SQLite package
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md` - add Sprint 8 as the next local-live plan

No `.env` or `.env.local` content may be printed or searched with content-printing commands.

## Task 1: Runtime Boundary Document

**Files:**

- Create: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`
- Modify: `docs/implementation/giwa-mvp-dependency-approval.md`

- [ ] **Step 1: Write the runtime gate document**

Create `docs/implementation/giwa-live-mvp-runtime-gate.md`:

```markdown
# GIWA Live MVP Runtime Gate

## Purpose

Sprint 8 adds a local runtime server for fresh Live MVP runs while preserving the Sprint 7 recorded evidence demo.

## Runtime Mode

The workspace remains in non-git prototype mode when `Test-Path .\.git` returns `False`.

## Dependency Boundary

Sprint 8 installs no new packages.

Local SQLite uses Node `node:sqlite` behind `apps/web/src/lib/live/liveStore.ts`. Node prints an experimental warning for this module in the current local runtime, so all database calls must stay behind the storage interface.

If hosted live deployment later requires a non-experimental SQLite package, dependency approval must be updated before installation.

## Mock Mode

Sprint 8 may start the live API in mock mode only when `GIWA_LIVE_MOCK_MODE=1` is set. Mock mode is limited to API contract and storage testing. It does not sign protocol manifests, relay intents, verify transactions, or send wallet transactions.

Without mock mode, the server must stop when required live env readiness fails.

## Server-Only Values

The live server reads role and RPC values from process env or local env loaders, but it must only print redacted readiness:

- key is set or missing
- normalized public address where derivable
- string length category
- chain id result

Raw secret values must never be printed.

## Live API Scope

Sprint 8 exposes local API contracts for:

- `POST /api/runs`
- `GET /api/runs/:runId`
- `POST /api/runs/:runId/intent-submit`
- `POST /api/runs/:runId/evidence`
- `POST /api/runs/:runId/verify`
- `GET /api/receipts/:receiptHash`
- `GET /api/partner/runs`

Sprint 8 does not send wallet approve or deposit transactions.

## Verification Commands

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- live
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm test
pnpm build
node --check apps/web/public/flow.js
```

## Exit Gate

Sprint 8 is complete when:

- live API server starts locally
- live API contract tests pass
- live storage idempotency tests pass
- static Sprint 7 demo still works
- no wallet transaction is sent
- public assets contain no server-only values
```

- [ ] **Step 2: Update the runbook**

Append this section to `docs/implementation/giwa-mvp-runbook.md`:

```markdown
## Local Live MVP Runtime

Sprint 8 local live mode is documented in:

```text
docs/implementation/giwa-live-mvp-runtime-gate.md
```

Start the Sprint 8 live server only after the Sprint 8 exit gate is implemented:

```powershell
$env:GIWA_LIVE_MOCK_MODE="1"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

The recorded Sprint 7 static demo remains the fallback when live GIWA Sepolia readiness is unavailable.
```

- [ ] **Step 3: Update dependency approval**

Append this section to `docs/implementation/giwa-mvp-dependency-approval.md`:

```markdown
## Sprint 8 Runtime Boundary

Sprint 8 installs no new package for local SQLite.

The implementation uses Node `node:sqlite` behind a narrow storage adapter because the local runtime exposes the module. The module is experimental in the current local Node runtime, so the adapter boundary is required. A future hosted Live MVP may replace this adapter after dependency approval.
```

- [ ] **Step 4: Verify documentation scans**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("payment set" + "tled")
rg -n $docPattern docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md docs\implementation\giwa-mvp-dependency-approval.md
rg -n $riskPattern docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md docs\implementation\giwa-mvp-dependency-approval.md
```

Expected:

```text
No matches in the new Sprint 8 runtime section.
```

## Task 2: Live Run Types and State Gates

**Files:**

- Create: `apps/web/src/lib/live/liveTypes.ts`
- Create: `apps/web/src/lib/live/liveTypes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/live/liveTypes.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  canOpenReceiptRoute,
  isTerminalLiveRunStatus,
  normalizeLiveRunStatus,
  type LiveRunStatus
} from "./liveTypes.ts";

describe("live run status model", () => {
  it("marks only matched, mismatched, and failed as terminal", () => {
    const terminal: LiveRunStatus[] = ["matched", "mismatched", "failed"];
    const nonTerminal: LiveRunStatus[] = [
      "created",
      "walletConnected",
      "wrongChain",
      "manifestIssued",
      "intentSubmitted",
      "approveRequired",
      "approveSubmitted",
      "approveConfirmed",
      "depositReady",
      "depositSubmitted",
      "depositConfirmed",
      "verifierChecking",
      "timeout"
    ];

    for (const status of terminal) expect(isTerminalLiveRunStatus(status)).toBe(true);
    for (const status of nonTerminal) expect(isTerminalLiveRunStatus(status)).toBe(false);
  });

  it("opens receipt route only for matched status with a receipt hash", () => {
    expect(canOpenReceiptRoute({ status: "matched", receiptHash: "0xabc" })).toBe(true);
    expect(canOpenReceiptRoute({ status: "matched", receiptHash: null })).toBe(false);
    expect(canOpenReceiptRoute({ status: "depositConfirmed", receiptHash: "0xabc" })).toBe(false);
    expect(canOpenReceiptRoute({ status: "mismatched", receiptHash: "0xabc" })).toBe(false);
  });

  it("rejects unknown status strings", () => {
    expect(() => normalizeLiveRunStatus("created")).not.toThrow();
    expect(() => normalizeLiveRunStatus("settled")).toThrow("Unknown live run status");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveTypes
```

Expected:

```text
FAIL because apps/web/src/lib/live/liveTypes.ts does not exist.
```

- [ ] **Step 3: Implement live types**

Create `apps/web/src/lib/live/liveTypes.ts`:

```typescript
export const LIVE_RUN_STATUSES = [
  "created",
  "walletConnected",
  "wrongChain",
  "manifestIssued",
  "intentSubmitted",
  "approveRequired",
  "approveSubmitted",
  "approveConfirmed",
  "depositReady",
  "depositSubmitted",
  "depositConfirmed",
  "verifierChecking",
  "matched",
  "mismatched",
  "failed",
  "timeout"
] as const;

export type LiveRunStatus = (typeof LIVE_RUN_STATUSES)[number];

export type LiveSource = "fixture" | "live";

export type LiveRunRecord = {
  runId: string;
  idempotencyKey: string;
  wallet: string;
  campaignId: string;
  missionId: string;
  referralCode: string | null;
  nonce: string;
  intentHash: string;
  manifestJson: string;
  manifestSignature: string;
  status: LiveRunStatus;
  expiryUnix: number;
  createdAt: string;
  updatedAt: string;
};

export type SubmittedTxRecord = {
  runId: string;
  approveTxHash: string | null;
  depositTxHash: string;
  submittedAt: string;
};

export type DecisionRecord = {
  intentHash: string;
  depositTxHash: string;
  decision: "matched" | "mismatched" | "failed";
  failureReason: string | null;
  verifierInputHash: string;
  receiptHash: string | null;
  decisionTxHash: string;
  issuedAt: number;
};

export type ReceiptRecord = {
  receiptHash: string;
  intentHash: string;
  payloadJson: string;
  canonicalPayload: string;
  canonicalPayloadBytesHex: string;
};

export type ReceiptGateInput = {
  status: LiveRunStatus;
  receiptHash: string | null;
};

const STATUS_SET = new Set<string>(LIVE_RUN_STATUSES);
const TERMINAL_SET = new Set<LiveRunStatus>(["matched", "mismatched", "failed"]);

export function normalizeLiveRunStatus(value: string): LiveRunStatus {
  if (!STATUS_SET.has(value)) {
    throw new Error(`Unknown live run status: ${value}`);
  }

  return value as LiveRunStatus;
}

export function isTerminalLiveRunStatus(status: LiveRunStatus): boolean {
  return TERMINAL_SET.has(status);
}

export function canOpenReceiptRoute(input: ReceiptGateInput): boolean {
  return input.status === "matched" && typeof input.receiptHash === "string" && input.receiptHash.length > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveTypes
```

Expected:

```text
PASS liveTypes.test.ts
```

## Task 3: Redacted Live Env Validator

**Files:**

- Create: `apps/web/src/lib/live/liveEnv.ts`
- Create: `apps/web/src/lib/live/liveEnv.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/live/liveEnv.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildRedactedLiveEnvReadiness, requireLiveServerEnv } from "./liveEnv.ts";

const validEnv = {
  GIWA_SEPOLIA_RPC_URL: "https://example.invalid/rpc",
  GIWA_EXPLORER_TX_URL_TEMPLATE: "https://example.invalid/tx/{txHash}",
  GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: "https://example.invalid/address/{address}",
  CAMPAIGN_SIGNER_PRIVATE_KEY: `0x${"1".repeat(64)}`,
  INTENT_SUBMITTER_PRIVATE_KEY: `0x${"2".repeat(64)}`,
  VERIFIER_PRIVATE_KEY: `0x${"3".repeat(64)}`,
  GIWA_LIVE_DB_PATH: "apps/web/.data/live-mvp.test.sqlite"
};

describe("live env readiness", () => {
  it("reports missing keys without printing values", () => {
    const readiness = buildRedactedLiveEnvReadiness({});

    expect(readiness.ok).toBe(false);
    expect(readiness.missing).toContain("GIWA_SEPOLIA_RPC_URL");
    expect(JSON.stringify(readiness)).not.toContain("https://");
  });

  it("accepts valid env and reports only redacted metadata", () => {
    const readiness = buildRedactedLiveEnvReadiness(validEnv);

    expect(readiness.ok).toBe(true);
    expect(readiness.keys.CAMPAIGN_SIGNER_PRIVATE_KEY).toEqual({
      state: "set",
      format: "hex32",
      length: 66
    });
    expect(JSON.stringify(readiness)).not.toContain(validEnv.CAMPAIGN_SIGNER_PRIVATE_KEY);
  });

  it("throws with missing key names only", () => {
    expect(() => requireLiveServerEnv({})).toThrow("Missing live server env");
    expect(() => requireLiveServerEnv({})).not.toThrow("https://");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveEnv
```

Expected:

```text
FAIL because liveEnv.ts does not exist.
```

- [ ] **Step 3: Implement redacted env validation**

Create `apps/web/src/lib/live/liveEnv.ts`:

```typescript
export type EnvMap = Record<string, string | undefined>;

export type RedactedEnvKey = {
  state: "set" | "missing" | "invalid";
  format: "url" | "template" | "hex32" | "path" | "unknown";
  length: number;
};

export type RedactedLiveEnvReadiness = {
  ok: boolean;
  missing: string[];
  invalid: string[];
  keys: Record<string, RedactedEnvKey>;
};

export type LiveServerEnv = {
  standardRpcUrl: string;
  txExplorerTemplate: string;
  addressExplorerTemplate: string;
  campaignSignerPrivateKey: `0x${string}`;
  intentSubmitterPrivateKey: `0x${string}`;
  verifierPrivateKey: `0x${string}`;
  dbPath: string;
};

const REQUIRED = [
  "GIWA_SEPOLIA_RPC_URL",
  "GIWA_EXPLORER_TX_URL_TEMPLATE",
  "GIWA_EXPLORER_ADDRESS_URL_TEMPLATE",
  "CAMPAIGN_SIGNER_PRIVATE_KEY",
  "INTENT_SUBMITTER_PRIVATE_KEY",
  "VERIFIER_PRIVATE_KEY",
  "GIWA_LIVE_DB_PATH"
] as const;

function isHex32(value: string): boolean {
  const hex = value.startsWith("0x") ? value.slice(2) : "";
  return hex.length === 64 && [...hex].every((char) => /[a-fA-F0-9]/u.test(char));
}

function classify(key: string, value: string | undefined): RedactedEnvKey {
  if (value === undefined || value.trim().length === 0) {
    return { state: "missing", format: "unknown", length: 0 };
  }

  const trimmed = value.trim();
  if (key.endsWith("_PRIVATE_KEY")) {
    return {
      state: isHex32(trimmed) ? "set" : "invalid",
      format: "hex32",
      length: trimmed.length
    };
  }

  if (key.endsWith("_TEMPLATE")) {
    return {
      state: trimmed.includes("{") && trimmed.includes("}") ? "set" : "invalid",
      format: "template",
      length: trimmed.length
    };
  }

  if (key.endsWith("_URL")) {
    return {
      state: /^https?:\/\//u.test(trimmed) ? "set" : "invalid",
      format: "url",
      length: trimmed.length
    };
  }

  return {
    state: "set",
    format: "path",
    length: trimmed.length
  };
}

export function buildRedactedLiveEnvReadiness(env: EnvMap): RedactedLiveEnvReadiness {
  const keys: Record<string, RedactedEnvKey> = {};
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of REQUIRED) {
    const status = classify(key, env[key]);
    keys[key] = status;
    if (status.state === "missing") missing.push(key);
    if (status.state === "invalid") invalid.push(key);
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    keys
  };
}

export function requireLiveServerEnv(env: EnvMap): LiveServerEnv {
  const readiness = buildRedactedLiveEnvReadiness(env);
  if (!readiness.ok) {
    throw new Error(
      `Missing live server env: ${readiness.missing.join(", ")}; invalid live server env: ${readiness.invalid.join(", ")}`
    );
  }

  return {
    standardRpcUrl: env.GIWA_SEPOLIA_RPC_URL!.trim(),
    txExplorerTemplate: env.GIWA_EXPLORER_TX_URL_TEMPLATE!.trim(),
    addressExplorerTemplate: env.GIWA_EXPLORER_ADDRESS_URL_TEMPLATE!.trim(),
    campaignSignerPrivateKey: env.CAMPAIGN_SIGNER_PRIVATE_KEY!.trim() as `0x${string}`,
    intentSubmitterPrivateKey: env.INTENT_SUBMITTER_PRIVATE_KEY!.trim() as `0x${string}`,
    verifierPrivateKey: env.VERIFIER_PRIVATE_KEY!.trim() as `0x${string}`,
    dbPath: env.GIWA_LIVE_DB_PATH!.trim()
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveEnv
```

Expected:

```text
PASS liveEnv.test.ts
```

## Task 4: Live Store Interface and SQLite Adapter

**Files:**

- Create: `apps/web/src/lib/live/node-sqlite.d.ts`
- Create: `apps/web/src/lib/live/node-runtime.d.ts`
- Create: `apps/web/src/lib/live/liveStore.ts`
- Create: `apps/web/src/lib/live/liveStore.test.ts`
- Modify: `apps/web/tsconfig.json`

- [ ] **Step 1: Add the SQLite type shim**

Create `apps/web/src/lib/live/node-sqlite.d.ts`:

```typescript
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class StatementSync {
    run(...values: unknown[]): unknown;
    get(...values: unknown[]): Record<string, unknown> | undefined;
    all(...values: unknown[]): Array<Record<string, unknown>>;
  }
}
```

- [ ] **Step 2: Add minimal Node runtime type shim**

Create `apps/web/src/lib/live/node-runtime.d.ts`:

```typescript
declare module "node:fs" {
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}
```

- [ ] **Step 3: Write failing tests**

Create `apps/web/src/lib/live/liveStore.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { createMemoryLiveStore } from "./liveStore.ts";
import type { LiveRunRecord } from "./liveTypes.ts";

function run(overrides: Partial<LiveRunRecord> = {}): LiveRunRecord {
  return {
    runId: "run-1",
    idempotencyKey: "wallet:campaign:mission",
    wallet: "0x1111111111111111111111111111111111111111",
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    referralCode: null,
    nonce: "nonce-1",
    intentHash: "0xintent",
    manifestJson: "{}",
    manifestSignature: "0xsig",
    status: "manifestIssued",
    expiryUnix: 1790000000,
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:00:00.000Z",
    ...overrides
  };
}

describe("live store", () => {
  it("returns an existing run for the same idempotency key", () => {
    const store = createMemoryLiveStore();
    const first = store.createRun(run());
    const second = store.createRun(run({ runId: "run-2", intentHash: "0xother" }));

    expect(second).toEqual(first);
    expect(store.listRuns()).toHaveLength(1);
  });

  it("rejects the same deposit transaction on a different run", () => {
    const store = createMemoryLiveStore();
    store.createRun(run());
    store.createRun(
      run({
        runId: "run-2",
        idempotencyKey: "wallet:campaign:mission:2",
        intentHash: "0xintent2"
      })
    );
    store.saveSubmittedTx({ runId: "run-1", approveTxHash: null, depositTxHash: "0xdeposita", submittedAt: "2026-06-17T00:01:00.000Z" });

    expect(() =>
      store.saveSubmittedTx({
        runId: "run-2",
        approveTxHash: null,
        depositTxHash: "0xdeposita",
        submittedAt: "2026-06-17T00:02:00.000Z"
      })
    ).toThrow("depositTxHash already belongs to another run");
  });

  it("freezes terminal decisions by intent hash", () => {
    const store = createMemoryLiveStore();
    store.createRun(run());

    const decision = store.saveDecision({
      intentHash: "0xintent",
      depositTxHash: "0xdeposita",
      decision: "matched",
      failureReason: null,
      verifierInputHash: "0xverifier",
      receiptHash: "0xreceipt",
      decisionTxHash: "0xdecision",
      issuedAt: 1790000000
    });

    const repeated = store.saveDecision({
      intentHash: "0xintent",
      depositTxHash: "0xdeposita",
      decision: "matched",
      failureReason: null,
      verifierInputHash: "0xchanged",
      receiptHash: "0xchanged",
      decisionTxHash: "0xchanged",
      issuedAt: 1790000001
    });

    expect(repeated).toEqual(decision);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveStore
```

Expected:

```text
FAIL because liveStore.ts does not exist.
```

- [ ] **Step 5: Implement the live store interface and memory adapter**

Create `apps/web/src/lib/live/liveStore.ts` with the memory adapter first:

```typescript
import type { DecisionRecord, LiveRunRecord, ReceiptRecord, SubmittedTxRecord } from "./liveTypes.ts";

export type LiveStore = {
  createRun(input: LiveRunRecord): LiveRunRecord;
  getRun(runId: string): LiveRunRecord | undefined;
  listRuns(): LiveRunRecord[];
  updateRunStatus(runId: string, status: LiveRunRecord["status"], updatedAt: string): LiveRunRecord;
  saveSubmittedTx(input: SubmittedTxRecord): SubmittedTxRecord;
  getSubmittedTx(runId: string): SubmittedTxRecord | undefined;
  saveDecision(input: DecisionRecord): DecisionRecord;
  getDecisionByIntentHash(intentHash: string): DecisionRecord | undefined;
  saveReceipt(input: ReceiptRecord): ReceiptRecord;
  getReceipt(receiptHash: string): ReceiptRecord | undefined;
};

export function createMemoryLiveStore(): LiveStore {
  const runsById = new Map<string, LiveRunRecord>();
  const runsByIdempotency = new Map<string, LiveRunRecord>();
  const submittedByRun = new Map<string, SubmittedTxRecord>();
  const submittedRunByDeposit = new Map<string, string>();
  const decisionsByIntent = new Map<string, DecisionRecord>();
  const decisionsByDeposit = new Map<string, DecisionRecord>();
  const receiptsByHash = new Map<string, ReceiptRecord>();

  return {
    createRun(input) {
      const existing = runsByIdempotency.get(input.idempotencyKey);
      if (existing !== undefined) return existing;
      if (runsById.has(input.runId)) throw new Error("runId already exists");
      if ([...runsById.values()].some((run) => run.intentHash === input.intentHash)) {
        throw new Error("intentHash already exists");
      }
      runsById.set(input.runId, input);
      runsByIdempotency.set(input.idempotencyKey, input);
      return input;
    },
    getRun(runId) {
      return runsById.get(runId);
    },
    listRuns() {
      return [...runsById.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },
    updateRunStatus(runId, status, updatedAt) {
      const existing = runsById.get(runId);
      if (existing === undefined) throw new Error("run does not exist");
      const updated = { ...existing, status, updatedAt };
      runsById.set(runId, updated);
      runsByIdempotency.set(updated.idempotencyKey, updated);
      return updated;
    },
    saveSubmittedTx(input) {
      const existingRunId = submittedRunByDeposit.get(input.depositTxHash.toLowerCase());
      if (existingRunId !== undefined && existingRunId !== input.runId) {
        throw new Error("depositTxHash already belongs to another run");
      }
      const existing = submittedByRun.get(input.runId);
      if (existing !== undefined) return existing;
      if (!runsById.has(input.runId)) throw new Error("run does not exist");
      submittedByRun.set(input.runId, input);
      submittedRunByDeposit.set(input.depositTxHash.toLowerCase(), input.runId);
      return input;
    },
    getSubmittedTx(runId) {
      return submittedByRun.get(runId);
    },
    saveDecision(input) {
      const existingByIntent = decisionsByIntent.get(input.intentHash);
      if (existingByIntent !== undefined) return existingByIntent;
      const existingByDeposit = decisionsByDeposit.get(input.depositTxHash);
      if (existingByDeposit !== undefined) throw new Error("depositTxHash already has a terminal decision");
      decisionsByIntent.set(input.intentHash, input);
      decisionsByDeposit.set(input.depositTxHash, input);
      return input;
    },
    getDecisionByIntentHash(intentHash) {
      return decisionsByIntent.get(intentHash);
    },
    saveReceipt(input) {
      const existing = receiptsByHash.get(input.receiptHash);
      if (existing !== undefined) return existing;
      receiptsByHash.set(input.receiptHash, input);
      return input;
    },
    getReceipt(receiptHash) {
      return receiptsByHash.get(receiptHash);
    }
  };
}
```

- [ ] **Step 6: Run memory store tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveStore
```

Expected:

```text
PASS liveStore.test.ts
```

- [ ] **Step 7: Add SQLite adapter after memory tests pass**

Extend `liveStore.ts` by adding a `createSqliteLiveStore(dbPath: string)` export behind the same `LiveStore` interface. Use `DatabaseSync` only inside this function.

The implementation must create these tables:

```sql
create table if not exists runs (
  runId text primary key,
  idempotencyKey text not null unique,
  wallet text not null,
  campaignId text not null,
  missionId text not null,
  referralCode text,
  nonce text not null,
  intentHash text not null unique,
  manifestJson text not null,
  manifestSignature text not null,
  status text not null,
  expiryUnix integer not null,
  createdAt text not null,
  updatedAt text not null
);

create table if not exists submitted_txs (
  runId text primary key,
  approveTxHash text,
  depositTxHash text not null unique,
  submittedAt text not null
);

create table if not exists decisions (
  intentHash text primary key,
  depositTxHash text not null unique,
  decision text not null,
  failureReason text,
  verifierInputHash text not null,
  receiptHash text unique,
  decisionTxHash text not null,
  issuedAt integer not null
);

create table if not exists receipts (
  receiptHash text primary key,
  intentHash text not null unique,
  payloadJson text not null,
  canonicalPayload text not null,
  canonicalPayloadBytesHex text not null
);
```

Keep row mapping functions small:

```typescript
function stringValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`${key} is not a string`);
  return value;
}
```

- [ ] **Step 8: Add SQLite adapter tests**

Extend `liveStore.test.ts` with a temporary DB path:

```typescript
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSqliteLiveStore } from "./liveStore.ts";

describe("sqlite live store", () => {
  it("persists runs across adapter instances", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const first = createSqliteLiveStore(dbPath);
      first.createRun(run());
      first.close();

      const second = createSqliteLiveStore(dbPath);
      expect(second.getRun("run-1")?.intentHash).toBe("0xintent");
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

The SQLite store return type may extend `LiveStore` with `close(): void`.

- [ ] **Step 9: Run live store tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveStore
```

Expected:

```text
PASS liveStore.test.ts
```

## Task 5: Live API Contracts

**Files:**

- Create: `apps/web/src/lib/live/liveApi.ts`
- Create: `apps/web/src/lib/live/liveApi.test.ts`

- [ ] **Step 1: Write failing API contract tests**

Create `apps/web/src/lib/live/liveApi.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { createMemoryLiveStore } from "./liveStore.ts";
import { createLiveApiHandler } from "./liveApi.ts";

describe("live API contracts", () => {
  it("creates a run and returns a wallet-bound manifest summary", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async (input) => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: JSON.stringify(input),
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("manifestIssued");
    expect(response.body.intentHash).toBe("0xintent");
  });

  it("returns the existing run for an idempotent create request", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async (input) => ({
        runId: `run-${input.wallet.slice(-4)}`,
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: JSON.stringify(input),
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    const request = {
      method: "POST" as const,
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    };

    const first = await api(request);
    const second = await api(request);

    expect(first.body.runId).toBe(second.body.runId);
    expect(store.listRuns()).toHaveLength(1);
  });

  it("stores evidence hashes without verifying", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: null, depositTxHash: "0xdeposita" }
    });

    expect(response.status).toBe(200);
    expect(response.body.depositTxHash).toBe("0xdeposita");
    expect(store.getDecisionByIntentHash("0xintent")).toBeUndefined();
  });

  it("blocks chain-bound intent relay during Sprint 8", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    const response = await api({ method: "POST", pathname: "/api/runs/run-1/intent-submit", body: {} });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("chain_action_disabled_in_sprint_8");
  });

  it("blocks verifier transaction path during Sprint 8", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    const response = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("chain_action_disabled_in_sprint_8");
  });

  it("returns not found for unknown receipt hash", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not used");
      }
    });

    const response = await api({ method: "GET", pathname: "/api/receipts/receipt-1" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("receipt_not_found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
FAIL because liveApi.ts does not exist.
```

- [ ] **Step 3: Implement pure live API handler**

Create `apps/web/src/lib/live/liveApi.ts`:

```typescript
import type { LiveStore } from "./liveStore.ts";
import type { LiveRunRecord } from "./liveTypes.ts";

export type LiveApiRequest = {
  method: "GET" | "POST";
  pathname: string;
  body?: unknown;
};

export type LiveApiResponse = {
  status: number;
  body: Record<string, unknown>;
};

export type ManifestIssueInput = {
  wallet: string;
  campaignId: string;
  missionId: string;
  referralCode: string | null;
};

export type ManifestIssueResult = {
  runId: string;
  nonce: string;
  intentHash: string;
  manifestJson: string;
  manifestSignature: string;
  expiryUnix: number;
};

export type LiveApiDependencies = {
  store: LiveStore;
  now: () => string;
  issueManifest: (input: ManifestIssueInput) => Promise<ManifestIssueResult>;
};

function objectBody(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be an object");
  }

  return value as Record<string, unknown>;
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function optionalString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value.trim();
}

function runResponse(run: LiveRunRecord): Record<string, unknown> {
  return {
    runId: run.runId,
    wallet: run.wallet,
    campaignId: run.campaignId,
    missionId: run.missionId,
    status: run.status,
    intentHash: run.intentHash,
    expiryUnix: run.expiryUnix,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt
  };
}

function runIdFrom(pathname: string, suffix = ""): string | undefined {
  const prefix = "/api/runs/";
  if (!pathname.startsWith(prefix)) return undefined;
  const value = pathname.slice(prefix.length);
  if (suffix.length > 0 && value.endsWith(suffix)) return value.slice(0, -suffix.length);
  if (suffix.length === "") return value.includes("/") ? undefined : value;
  return undefined;
}

export function createLiveApiHandler(deps: LiveApiDependencies): (request: LiveApiRequest) => Promise<LiveApiResponse> {
  return async function handle(request): Promise<LiveApiResponse> {
    try {
      if (request.method === "POST" && request.pathname === "/api/runs") {
        const body = objectBody(request.body);
        const input: ManifestIssueInput = {
          wallet: requiredString(body, "wallet").toLowerCase(),
          campaignId: requiredString(body, "campaignId"),
          missionId: requiredString(body, "missionId"),
          referralCode: optionalString(body, "referralCode")
        };
        const issued = await deps.issueManifest(input);
        const timestamp = deps.now();
        const run = deps.store.createRun({
          runId: issued.runId,
          idempotencyKey: [input.wallet, input.campaignId, input.missionId, input.referralCode ?? ""].join(":"),
          wallet: input.wallet,
          campaignId: input.campaignId,
          missionId: input.missionId,
          referralCode: input.referralCode,
          nonce: issued.nonce,
          intentHash: issued.intentHash,
          manifestJson: issued.manifestJson,
          manifestSignature: issued.manifestSignature,
          status: "manifestIssued",
          expiryUnix: issued.expiryUnix,
          createdAt: timestamp,
          updatedAt: timestamp
        });

        return { status: 201, body: runResponse(run) };
      }

      const getRunId = request.method === "GET" ? runIdFrom(request.pathname) : undefined;
      if (getRunId !== undefined) {
        const run = deps.store.getRun(getRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        return { status: 200, body: runResponse(run) };
      }

      const evidenceRunId = request.method === "POST" ? runIdFrom(request.pathname, "/evidence") : undefined;
      if (evidenceRunId !== undefined) {
        const run = deps.store.getRun(evidenceRunId);
        if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
        const body = objectBody(request.body);
        const depositTxHash = requiredString(body, "depositTxHash").toLowerCase();
        const approveTxHash = optionalString(body, "approveTxHash")?.toLowerCase() ?? null;
        const submitted = deps.store.saveSubmittedTx({
          runId: evidenceRunId,
          approveTxHash,
          depositTxHash,
          submittedAt: deps.now()
        });
        deps.store.updateRunStatus(evidenceRunId, "depositSubmitted", deps.now());
        return { status: 200, body: { ...submitted, status: "depositSubmitted" } };
      }

      const intentRelayRunId = request.method === "POST" ? runIdFrom(request.pathname, "/intent-submit") : undefined;
      if (intentRelayRunId !== undefined) {
        return { status: 409, body: { error: "chain_action_disabled_in_sprint_8", runId: intentRelayRunId } };
      }

      const verifyRunId = request.method === "POST" ? runIdFrom(request.pathname, "/verify") : undefined;
      if (verifyRunId !== undefined) {
        return { status: 409, body: { error: "chain_action_disabled_in_sprint_8", runId: verifyRunId } };
      }

      if (request.method === "GET" && request.pathname.startsWith("/api/receipts/")) {
        const receiptHash = request.pathname.slice("/api/receipts/".length);
        const receipt = deps.store.getReceipt(receiptHash);
        if (receipt === undefined) return { status: 404, body: { error: "receipt_not_found" } };
        return { status: 200, body: receipt };
      }

      if (request.method === "GET" && request.pathname === "/api/partner/runs") {
        return {
          status: 200,
          body: {
            source: "live",
            rows: deps.store.listRuns().map(runResponse)
          }
        };
      }

      return { status: 404, body: { error: "not_found" } };
    } catch (error) {
      return {
        status: 400,
        body: {
          error: error instanceof Error ? error.message : "unknown_error"
        }
      };
    }
  };
}
```

- [ ] **Step 4: Run API tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
PASS liveApi.test.ts
```

## Task 6: Local Live Server

**Files:**

- Create: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add package scripts**

Modify `apps/web/package.json` scripts:

```json
{
  "build": "node --experimental-strip-types scripts/export-flow-data.mjs && tsc -p tsconfig.json --noEmit",
  "dev": "node --experimental-strip-types scripts/serve-static.mjs",
  "dev:live": "node --experimental-strip-types scripts/serve-live.mjs",
  "export:flow": "node --experimental-strip-types scripts/export-flow-data.mjs",
  "serve": "node --experimental-strip-types scripts/serve-static.mjs",
  "serve:live": "node --experimental-strip-types scripts/serve-live.mjs",
  "test": "vitest run",
  "test:live": "vitest run live",
  "typecheck": "tsc -p tsconfig.json --noEmit"
}
```

- [ ] **Step 2: Create live server script**

Create `apps/web/scripts/serve-live.mjs`:

```javascript
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { exportFlowData } from "./export-flow-data.mjs";
import { buildRedactedLiveEnvReadiness } from "../src/lib/live/liveEnv.ts";
import { createLiveApiHandler } from "../src/lib/live/liveApi.ts";
import { createSqliteLiveStore } from "../src/lib/live/liveStore.ts";

const publicDir = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const workspaceRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const port = Number(process.env.PORT ?? 4177);
const dbPath = resolve(workspaceRoot, process.env.GIWA_LIVE_DB_PATH ?? "apps/web/.data/live-mvp.sqlite");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

exportFlowData();
mkdirSync(dirname(dbPath), { recursive: true });

const readiness = buildRedactedLiveEnvReadiness({
  GIWA_SEPOLIA_RPC_URL: process.env.GIWA_SEPOLIA_RPC_URL,
  GIWA_EXPLORER_TX_URL_TEMPLATE: process.env.GIWA_EXPLORER_TX_URL_TEMPLATE,
  GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: process.env.GIWA_EXPLORER_ADDRESS_URL_TEMPLATE,
  CAMPAIGN_SIGNER_PRIVATE_KEY: process.env.CAMPAIGN_SIGNER_PRIVATE_KEY,
  INTENT_SUBMITTER_PRIVATE_KEY: process.env.INTENT_SUBMITTER_PRIVATE_KEY,
  VERIFIER_PRIVATE_KEY: process.env.VERIFIER_PRIVATE_KEY,
  GIWA_LIVE_DB_PATH: dbPath
});
const mockMode = process.env.GIWA_LIVE_MOCK_MODE === "1";

console.log(JSON.stringify({ liveEnvReadiness: readiness, liveMockMode: mockMode }, null, 2));

if (!readiness.ok && !mockMode) {
  process.exitCode = 1;
  console.error("Live env readiness failed. Set GIWA_LIVE_MOCK_MODE=1 only for Sprint 8 API contract mode.");
  process.exit();
}

const store = createSqliteLiveStore(dbPath);
const api = createLiveApiHandler({
  store,
  now: () => new Date().toISOString(),
  issueManifest: async (input) => {
    const issuedAt = Date.now();
    return {
      runId: `live-${issuedAt.toString(36)}`,
      nonce: `nonce-${issuedAt.toString(36)}`,
      intentHash: `intent-${issuedAt.toString(36)}`,
      manifestJson: JSON.stringify(input),
      manifestSignature: "signature-not-issued-in-sprint-8",
      expiryUnix: Math.floor(issuedAt / 1000) + 3600
    };
  }
});

function publicPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === "/" || decoded === "/partner" || decoded.startsWith("/receipt/") ? "/index.html" : decoded;
  const normalized = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(publicDir, normalized);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    const result = await api({
      method: request.method === "POST" ? "POST" : "GET",
      pathname: url.pathname,
      body: request.method === "POST" ? await readBody(request) : undefined
    });
    response.writeHead(result.status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(JSON.stringify(result.body));
    return;
  }

  const filePath = publicPath(url.pathname);
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`@giwa/web Sprint 8 live server: http://127.0.0.1:${port}`);
});
```

This Sprint 8 script intentionally uses non-chain manifest values. Sprint 9 replaces `issueManifest` with the protocol-backed signer.

- [ ] **Step 3: Verify server script syntax**

Run:

```powershell
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
No syntax errors.
```

- [ ] **Step 4: Start the live server and smoke API**

Run:

```powershell
$env:PORT=4177
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp.sqlite"
$env:GIWA_LIVE_MOCK_MODE="1"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

In another shell, run:

```powershell
Invoke-RestMethod -Method Get -Uri http://127.0.0.1:4177/api/partner/runs
```

Expected:

```text
The response contains source=live and rows=[] before any live run.
```

Stop the server before continuing.

## Task 7: Fixture and Live Source Separation

**Files:**

- Modify: `apps/web/src/lib/partner/partnerSummary.ts`
- Modify: `apps/web/src/lib/partner/partnerSummary.test.ts`

- [ ] **Step 1: Add failing partner test**

Extend `apps/web/src/lib/partner/partnerSummary.test.ts`:

```typescript
it("keeps fixture and live rows source-labeled", () => {
  const model = buildPartnerProofConsoleModel(flowModel, evidence, {
    evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json",
    extraRunEvents: [
      {
        name: "deposit_submitted",
        runId: "live-run-1",
        timestamp: "2026-06-17T00:00:00.000Z",
        campaignId: flowModel.mission.campaignId,
        missionId: flowModel.mission.missionId,
        wallet: flowModel.readiness.wallet,
        source: "live"
      }
    ]
  });

  expect(model.source.fixtureRowsVisible).toBe(true);
  expect(model.source.liveRowsVisible).toBe(true);
  expect(new Set(model.rows.map((row) => row.source))).toContain("fixture");
});
```

If existing test fixtures use different variable names, adapt only the variable references, not the assertion intent.

- [ ] **Step 2: Run test to verify current behavior**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- partnerSummary
```

Expected:

```text
FAIL if live source labeling is not represented clearly enough.
```

- [ ] **Step 3: Preserve fixture row as the primary Sprint 7 row**

In `partnerSummary.ts`, keep the existing fixture row and add future live rows only through explicitly source-labeled run events. Sprint 8 should not infer a matched live row from fixture receipt data.

Use this rule in the row builder:

```typescript
const fixtureRow = {
  runId: rowRunEvent.runId,
  dedupeKey: runDedupeKey(rowRunEvent),
  source: "fixture" as const,
  campaignId: rowRunEvent.campaignId,
  missionId: rowRunEvent.missionId,
  wallet: rowRunEvent.wallet ?? flow.readiness.wallet,
  verifiedState,
  status,
  receiptHash: flow.receipt.receiptHash,
  depositTxHash: flow.receipt.depositTxHash,
  decisionTxHash: flow.receipt.decisionTxHash,
  intentSubmittedTxHash: evidence.transactions?.intentSubmittedTxHash ?? null,
  blockNumber: flow.receipt.blockNumber,
  blockHash: flow.receipt.blockHash,
  receiptPermalink,
  depositExplorerUrl: flow.receipt.depositExplorerUrl,
  decisionExplorerUrl: flow.receipt.decisionExplorerUrl
};
```

Sprint 12 will add full live row aggregation from the live API. Sprint 8 only prevents source ambiguity.

- [ ] **Step 4: Run partner tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- partnerSummary
```

Expected:

```text
PASS partnerSummary.test.ts
```

## Task 8: Sprint Index Update

**Files:**

- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

- [ ] **Step 1: Add Sprint 8 to the sprint order**

Add this row after Sprint 7:

```markdown
| 8 | `2026-06-17-sprint-8-local-live-architecture-cutover.md` | local live runtime API, state model, and storage cutover | Sprint 7 approval |
```

- [ ] **Step 2: Add Live MVP extension note**

Add this section after `P0 Evidence Chain`:

```markdown
## Local Live MVP Extension

Sprint 8 starts the post-submission Live MVP path. Sprint 0 through Sprint 7 remain the recorded evidence baseline. Sprint 8 must preserve that baseline while adding local runtime state for fresh user runs.

The Sprint 8 exit gate does not require wallet approve or deposit transactions. Those belong to Sprint 10 after wallet and manifest issuance are implemented.
```

- [ ] **Step 3: Verify index scan**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $docPattern docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md
```

Expected:

```text
No new Sprint 8 matches.
```

## Task 9: Sprint 8 Verification

**Files:**

- Verify only; no new file changes expected.

- [ ] **Step 1: Run focused live tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- live
```

Expected:

```text
liveTypes, liveEnv, liveStore, and liveApi tests pass.
```

- [ ] **Step 2: Run web checks**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
node --check apps/web/public/flow.js
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
All commands exit 0.
```

- [ ] **Step 3: Run workspace checks**

Run:

```powershell
pnpm test
pnpm build
```

Expected:

```text
All workspace packages pass.
```

- [ ] **Step 4: Run safe scans**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("payment set" + "tled")
$secretPattern = ("0x[a-fA-F0-9]" + "{64}") + "|" + ("mnem" + "onic") + "|" + ("seed ph" + "rase") + "|" + ("Bear" + "er") + "|" + ("api[_-]?ke" + "y") + "|" + ("access[_-]?tok" + "en") + "|" + ("NEXT_" + "PUBLIC_.*" + "(SECRET|PRIVATE|API[_-]?KEY)")
rg -n $docPattern docs\superpowers\plans docs\implementation apps\web\src apps\web\scripts -g "*.md" -g "*.ts" -g "*.mjs"
rg -n $riskPattern docs\superpowers\plans docs\implementation apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.mjs"
rg -n $secretPattern docs\superpowers\plans docs\implementation apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.json" -g "*.ts" -g "*.js" -g "*.mjs"
```

Expected:

```text
No matches in new Sprint 8 source, docs, scripts, or public assets.
Policy-only matches outside Sprint 8 scope may be reported separately.
```

Do not scan real env files with content-printing commands.

- [ ] **Step 5: Run static fallback smoke**

Run:

```powershell
$env:PORT=4176
pnpm --filter @giwa/web --fail-if-no-match serve
```

Open or request:

```text
http://127.0.0.1:4176/
http://127.0.0.1:4176/partner
http://127.0.0.1:4176/partner-snapshot.json
```

Expected:

```text
The Sprint 7 recorded demo still renders from fixture evidence.
```

Stop the server before final handoff.

## Sprint 8 Exit Gate

Sprint 8 is complete only when:

- `docs/implementation/giwa-live-mvp-runtime-gate.md` exists
- `apps/web/src/lib/live/liveTypes.ts` exists and tests pass
- `apps/web/src/lib/live/liveEnv.ts` exists and redacted readiness tests pass
- `apps/web/src/lib/live/liveStore.ts` exists and memory plus SQLite adapter tests pass
- `apps/web/src/lib/live/liveApi.ts` exists and API contract tests pass
- `apps/web/scripts/serve-live.mjs` starts a local live API server
- `apps/web/package.json` exposes `serve:live`
- Sprint 7 static fallback still works
- no wallet approve or deposit transaction is sent
- no deploy, fund, anchor, or verifier transaction command is run
- no server-only value appears in public assets or generated JSON

## Sprint 8 Handoff

Final handoff must include:

- files changed
- commands run
- test results
- live server URL
- live DB path
- confirmation that no wallet transaction was sent
- confirmation that Sprint 7 static fallback still works
- unresolved risks
- next sprint path:

```text
docs/superpowers/plans/2026-06-17-sprint-9-wallet-and-manifest-issuance.md
```

## Next Sprint Preview

Sprint 9 should replace Sprint 8's mocked manifest issuer with protocol-backed wallet-bound manifest issuance and add the EIP-1193 wallet adapter. Sprint 9 still should not require a deposit transaction as its first exit gate; it should prove wallet connection, chain gate, manifest issuance, and manifest invalidation on wallet or chain change.

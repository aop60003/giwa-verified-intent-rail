# Sprint 12 Live Demo Hardening and Submission Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Sprint 11 live verifier flow into a repeatable demo and submission package with a fresh-run rehearsal path, commit-safe live snapshot export, clear DB policy, and static fallback preservation.

**Architecture:** Sprint 12 does not add a new protocol capability. It hardens the local live runtime around the existing Sprint 9-11 path, adds public snapshot/export tooling for matched live runs, updates demo documents, and verifies both the fresh live path and the Sprint 7 recorded fallback. Browser wallet actions remain user-controlled.

**Tech Stack:** TypeScript 6, Vitest 4, viem 2, Node HTTP live server, existing `node:sqlite` store adapter, dependency-free static UI, existing markdown submission documents. No new dependency is allowed.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-17-sprint-8-local-live-architecture-cutover.md`
- `docs/superpowers/plans/2026-06-17-sprint-9-wallet-and-manifest-issuance.md`
- `docs/superpowers/plans/2026-06-17-sprint-10-live-approve-and-deposit.md`
- `docs/superpowers/plans/2026-06-17-sprint-11-live-verifier-and-dynamic-receipt.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-demo-script.md`
- `docs/implementation/giwa-mvp-acceptance-checklist.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`
- `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`
- `apps/web/src/lib/live`
- `apps/web/src/lib/verifier`
- `apps/web/public/live-flow.js`
- `apps/web/scripts/serve-live.mjs`
- `apps/web/scripts/export-flow-data.mjs`

## Sprint 12 Boundary

Allowed:

- add a commit-safe live demo snapshot model and export script
- add a live demo readiness model for runbook and UI state checks
- update `/live` copy and receipt links for the current local live flow
- update runbook, demo script, acceptance checklist, and submission evidence map
- rehearse a fresh browser-wallet run when the user operates the wallet app
- export public live evidence from SQLite after matched verification
- keep the Sprint 7 static demo as fallback

Not allowed:

- request, print, or store a user wallet secret
- content-scan `.env`, `.env.local`, wallet export files, or tokenized RPC URLs
- run `deploy:giwa`, `fund:giwa`, or `anchor:giwa`
- send a wallet transaction from server code or a script
- install dependencies
- use Flashblocks as final confirmation
- do not add claims about production assets, yield, settlement, identity checks, phishing prevention, or security guarantees
- add multi-campaign dashboards or partner analytics beyond the one live run snapshot

## Fresh-Run Policy

Sprint 12 supports two demo paths:

1. **Fresh live path:** the user operates the browser wallet in `/live`, submits approve/deposit, selects verify, and exports a live snapshot after `matched`.
2. **Recorded fallback path:** if faucet, RPC, wallet, or timing blocks a fresh run, the static Sprint 7 evidence remains the fallback demo.

The agent must not use a wallet private key or send a wallet transaction directly. If a fresh run is needed, the agent starts the server and gives the URL; the user performs wallet confirmations.

## File Structure

Create:

- `apps/web/src/lib/live/liveDemoReadiness.ts` - pure model for live demo readiness and fallback state.
- `apps/web/src/lib/live/liveDemoReadiness.test.ts` - readiness tests.
- `apps/web/src/lib/live/liveDemoSnapshot.ts` - commit-safe live matched-run snapshot builder.
- `apps/web/src/lib/live/liveDemoSnapshot.test.ts` - snapshot redaction and recomputation tests.
- `apps/web/scripts/export-live-demo-snapshot.mjs` - exports public live snapshot from SQLite.
- `docs/evidence/live-demo-sprint12-snapshot.schema.md` - schema for exported live demo snapshot.

Modify:

- `apps/web/package.json` - add `export:live-demo` script.
- `apps/web/public/live-flow.js` - improve live receipt/demo state copy and links.
- `apps/web/public/styles.css` - minimal layout polish if text wrapping needs it.
- `docs/implementation/giwa-live-mvp-runtime-gate.md` - add Sprint 12 runtime boundary.
- `docs/implementation/giwa-mvp-runbook.md` - add fresh live rehearsal and export commands.
- `docs/implementation/giwa-mvp-demo-script.md` - add live path plus fallback path.
- `docs/implementation/giwa-mvp-acceptance-checklist.md` - add Sprint 12 acceptance rows.
- `docs/implementation/giwa-mvp-submission-evidence.md` - add live snapshot and fresh-run evidence map.
- `README.md` - add a short local live MVP section.

Generated when a matched live run exists:

- `docs/evidence/live-demo-sprint12-snapshot.json`
- `apps/web/public/live-demo-snapshot.json`

Do not create these generated JSON files from synthetic data. If no matched live run exists, the export command must fail clearly without writing misleading evidence.

## Task 1: Sprint 12 Runtime Boundary Docs

**Files:**

- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`

- [ ] **Step 1: Run the failing doc presence check**

Run:

```powershell
rg -n "Sprint 12 Live Demo" docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
```

Expected:

```text
No matches before Sprint 12 docs are added.
```

- [ ] **Step 2: Update runtime gate**

Append to `docs/implementation/giwa-live-mvp-runtime-gate.md`:

```markdown
## Sprint 12 Live Demo Hardening Boundary

Sprint 12 hardens the local live demo and submission package. It does not add new chain behavior.

Allowed Sprint 12 operations:

- start the live server with a Sprint 11-compatible DB path
- let the user operate browser-wallet approve and deposit actions
- verify a stored deposit transaction hash through standard RPC
- export a commit-safe live demo snapshot after `matched`
- keep the recorded Sprint 7 static demo available as fallback

Disallowed Sprint 12 operations:

- server-side wallet transaction sending
- no wallet private key handling
- deploy, fund, or anchor commands
- Flashblocks final confirmation
- public evidence containing secret values or tokenized RPC URLs

The live snapshot is public evidence only. It may contain public addresses, public transaction hashes, block numbers, block hashes, canonical payloads, and receipt hashes.
```

Append to `docs/implementation/giwa-mvp-runbook.md`:

```markdown
## Sprint 12 Live Demo Rehearsal

Use a Sprint 11-compatible DB path:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-sprint12.sqlite"
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
http://127.0.0.1:4177/live
```

Fresh live path:

1. Connect a browser wallet.
2. Confirm GIWA Sepolia `91342`.
3. Issue manifest.
4. Use the wallet app to approve.
5. Use the wallet app to deposit.
6. Select `Verify receipt`.
7. Open the dynamic receipt API link after `matched`.
8. Export the live demo snapshot.

Export:

```powershell
pnpm --filter @giwa/web --fail-if-no-match export:live-demo
```

If a fresh wallet run is blocked, use the recorded Sprint 7 fallback URLs and state that the live path is blocked by current faucet, wallet, or RPC state.
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
No matches in the new Sprint 12 sections.
```

## Task 2: Live Demo Readiness Model

**Files:**

- Create: `apps/web/src/lib/live/liveDemoReadiness.ts`
- Create: `apps/web/src/lib/live/liveDemoReadiness.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/live/liveDemoReadiness.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildLiveDemoReadiness } from "./liveDemoReadiness.ts";

describe("live demo readiness", () => {
  it("marks a matched live run ready for dynamic receipt demo", () => {
    const readiness = buildLiveDemoReadiness({
      liveServerReady: true,
      staticFallbackReady: true,
      run: {
        runId: "run-1",
        status: "matched",
        wallet: "0x1111111111111111111111111111111111111111",
        depositTxHash: `0x${"d".repeat(64)}`,
        receiptHash: `0x${"f".repeat(64)}`,
        confirmationDepth: 12
      }
    });

    expect(readiness.primaryPath).toBe("live");
    expect(readiness.canExportLiveSnapshot).toBe(true);
    expect(readiness.blockers).toEqual([]);
  });

  it("falls back to recorded evidence when live run is not matched", () => {
    const readiness = buildLiveDemoReadiness({
      liveServerReady: true,
      staticFallbackReady: true,
      run: {
        runId: "run-1",
        status: "depositSubmitted",
        wallet: "0x1111111111111111111111111111111111111111",
        depositTxHash: `0x${"d".repeat(64)}`,
        receiptHash: null,
        confirmationDepth: null
      }
    });

    expect(readiness.primaryPath).toBe("staticFallback");
    expect(readiness.canExportLiveSnapshot).toBe(false);
    expect(readiness.blockers).toContain("live_verifier_not_matched");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoReadiness
```

Expected:

```text
FAIL because liveDemoReadiness.ts does not exist.
```

- [ ] **Step 3: Implement readiness model**

Create `apps/web/src/lib/live/liveDemoReadiness.ts`:

```typescript
type DemoRun = {
  runId: string;
  status: string;
  wallet: string | null;
  depositTxHash: string | null;
  receiptHash: string | null;
  confirmationDepth: number | null;
};

export type LiveDemoReadinessInput = {
  liveServerReady: boolean;
  staticFallbackReady: boolean;
  run: DemoRun | null;
};

export function buildLiveDemoReadiness(input: LiveDemoReadinessInput) {
  const blockers: string[] = [];
  if (!input.liveServerReady) blockers.push("live_server_not_ready");
  if (input.run === null) blockers.push("live_run_missing");
  if (input.run !== null && input.run.status !== "matched") blockers.push("live_verifier_not_matched");
  if (input.run !== null && input.run.receiptHash === null) blockers.push("live_receipt_missing");
  if (input.run !== null && input.run.confirmationDepth === null) blockers.push("confirmation_depth_missing");

  const canExportLiveSnapshot =
    input.liveServerReady &&
    input.run !== null &&
    input.run.status === "matched" &&
    input.run.receiptHash !== null &&
    input.run.depositTxHash !== null &&
    input.run.confirmationDepth !== null;

  return {
    primaryPath: canExportLiveSnapshot ? "live" : input.staticFallbackReady ? "staticFallback" : "blocked",
    canExportLiveSnapshot,
    blockers
  } as const;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoReadiness
```

Expected:

```text
PASS liveDemoReadiness.test.ts
```

## Task 3: Commit-Safe Live Demo Snapshot Model

**Files:**

- Create: `apps/web/src/lib/live/liveDemoSnapshot.ts`
- Create: `apps/web/src/lib/live/liveDemoSnapshot.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/live/liveDemoSnapshot.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildLiveDemoSnapshot } from "./liveDemoSnapshot.ts";

describe("live demo snapshot", () => {
  it("exports only public matched-run evidence", () => {
    const snapshot = buildLiveDemoSnapshot({
      capturedAt: "2026-06-17T12:00:00.000Z",
      liveUrl: "http://127.0.0.1:4177/live",
      run: {
        runId: `0x${"a".repeat(64)}`,
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        status: "matched",
        intentHash: `0x${"b".repeat(64)}`,
        createdAt: "2026-06-17T11:00:00.000Z",
        updatedAt: "2026-06-17T11:10:00.000Z"
      },
      submittedTx: {
        approveTxHash: `0x${"c".repeat(64)}`,
        depositTxHash: `0x${"d".repeat(64)}`,
        submittedAt: "2026-06-17T11:05:00.000Z"
      },
      decision: {
        decision: "matched",
        failureReason: null,
        verifierInputHash: `0x${"e".repeat(64)}`,
        receiptHash: `0x${"f".repeat(64)}`,
        decisionTxHash: null,
        issuedAt: 1790000000
      },
      receipt: {
        receiptHash: `0x${"f".repeat(64)}`,
        intentHash: `0x${"b".repeat(64)}`,
        payloadJson: JSON.stringify({
          depositBlockNumber: 12345,
          depositBlockHash: `0x${"1".repeat(64)}`,
          confirmationDepth: 9
        }),
        canonicalPayload: "{\"status\":\"matched\"}",
        canonicalPayloadBytesHex: "0x7b7d"
      }
    });

    expect(snapshot.schemaVersion).toBe("1");
    expect(snapshot.source).toBe("live");
    expect(snapshot.run.status).toBe("matched");
    const secretSurface = ["private", "mnem" + "onic", "bear" + "er", "tokenized"].join("|");
    expect(JSON.stringify(snapshot)).not.toMatch(new RegExp(secretSurface, "i"));
  });

  it("rejects non-matched runs", () => {
    expect(() =>
      buildLiveDemoSnapshot({
        capturedAt: "2026-06-17T12:00:00.000Z",
        liveUrl: "http://127.0.0.1:4177/live",
        run: {
          runId: "run-1",
          wallet: "0x1111111111111111111111111111111111111111",
          campaignId: "gasok-demo",
          missionId: "first-mock-vault-deposit",
          status: "failed",
          intentHash: `0x${"b".repeat(64)}`,
          createdAt: "2026-06-17T11:00:00.000Z",
          updatedAt: "2026-06-17T11:10:00.000Z"
        },
        submittedTx: null,
        decision: null,
        receipt: null
      })
    ).toThrow("matched live run is required");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoSnapshot
```

Expected:

```text
FAIL because liveDemoSnapshot.ts does not exist.
```

- [ ] **Step 3: Implement snapshot model**

Create `apps/web/src/lib/live/liveDemoSnapshot.ts`:

```typescript
export type LiveDemoSnapshotInput = {
  capturedAt: string;
  liveUrl: string;
  run: {
    runId: string;
    wallet: string;
    campaignId: string;
    missionId: string;
    status: string;
    intentHash: string;
    createdAt: string;
    updatedAt: string;
  };
  submittedTx: null | {
    approveTxHash: string | null;
    depositTxHash: string;
    submittedAt: string;
  };
  decision: null | {
    decision: string;
    failureReason: string | null;
    verifierInputHash: string;
    receiptHash: string | null;
    decisionTxHash: string | null;
    issuedAt: number;
  };
  receipt: null | {
    receiptHash: string;
    intentHash: string;
    payloadJson: string;
    canonicalPayload: string;
    canonicalPayloadBytesHex: string;
  };
};

export function buildLiveDemoSnapshot(input: LiveDemoSnapshotInput) {
  if (input.run.status !== "matched") throw new Error("matched live run is required");
  if (input.submittedTx === null) throw new Error("submitted tx evidence is required");
  if (input.decision === null || input.decision.decision !== "matched") throw new Error("matched verifier decision is required");
  if (input.receipt === null) throw new Error("live receipt is required");

  const payload = JSON.parse(input.receipt.payloadJson) as Record<string, unknown>;

  return {
    schemaVersion: "1",
    source: "live",
    capturedAt: input.capturedAt,
    liveUrl: input.liveUrl,
    run: {
      runId: input.run.runId,
      campaignId: input.run.campaignId,
      missionId: input.run.missionId,
      wallet: input.run.wallet,
      status: input.run.status,
      intentHash: input.run.intentHash,
      createdAt: input.run.createdAt,
      updatedAt: input.run.updatedAt
    },
    transactions: {
      approveTxHash: input.submittedTx.approveTxHash,
      depositTxHash: input.submittedTx.depositTxHash,
      submittedAt: input.submittedTx.submittedAt
    },
    verifier: {
      decision: input.decision.decision,
      failureReason: input.decision.failureReason,
      verifierInputHash: input.decision.verifierInputHash,
      decisionTxHash: input.decision.decisionTxHash
    },
    receipt: {
      receiptHash: input.receipt.receiptHash,
      intentHash: input.receipt.intentHash,
      payload,
      canonicalPayload: input.receipt.canonicalPayload,
      canonicalPayloadBytesHex: input.receipt.canonicalPayloadBytesHex
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoSnapshot
```

Expected:

```text
PASS liveDemoSnapshot.test.ts
```

## Task 4: Live Demo Snapshot Export Script

**Files:**

- Create: `apps/web/scripts/export-live-demo-snapshot.mjs`
- Modify: `apps/web/package.json`
- Create: `docs/evidence/live-demo-sprint12-snapshot.schema.md`

- [ ] **Step 1: Write the failing script check**

Run:

```powershell
node --check apps/web/scripts/export-live-demo-snapshot.mjs
```

Expected:

```text
FAIL because export-live-demo-snapshot.mjs does not exist.
```

- [ ] **Step 2: Add script to package.json**

Add:

```json
"export:live-demo": "node --experimental-strip-types scripts/export-live-demo-snapshot.mjs"
```

- [ ] **Step 3: Create export script**

Create `apps/web/scripts/export-live-demo-snapshot.mjs`:

```javascript
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createSqliteLiveStore } from "../src/lib/live/liveStore.ts";
import { buildLiveDemoSnapshot } from "../src/lib/live/liveDemoSnapshot.ts";

const workspaceRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const dbPath = resolve(workspaceRoot, process.env.GIWA_LIVE_DB_PATH ?? "apps/web/.data/live-mvp-sprint12.sqlite");
const docsOutputPath = resolve(workspaceRoot, "docs/evidence/live-demo-sprint12-snapshot.json");
const publicOutputPath = resolve(workspaceRoot, "apps/web/public/live-demo-snapshot.json");
const port = Number(process.env.PORT ?? 4177);

if (!existsSync(dbPath)) {
  throw new Error(`live DB not found: ${dbPath}`);
}

const store = createSqliteLiveStore(dbPath);
try {
  const matchedRun = store
    .listRuns()
    .filter((run) => run.status === "matched")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  if (matchedRun === undefined) throw new Error("matched live run not found");

  const submittedTx = store.getSubmittedTx(matchedRun.runId) ?? null;
  const decision = store.getDecisionByIntentHash(matchedRun.intentHash) ?? null;
  const receipt = decision?.receiptHash === null || decision?.receiptHash === undefined ? null : store.getReceipt(decision.receiptHash) ?? null;

  const snapshot = buildLiveDemoSnapshot({
    capturedAt: new Date().toISOString(),
    liveUrl: `http://127.0.0.1:${port}/live`,
    run: matchedRun,
    submittedTx,
    decision,
    receipt
  });

  mkdirSync(dirname(docsOutputPath), { recursive: true });
  mkdirSync(dirname(publicOutputPath), { recursive: true });
  writeFileSync(docsOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(publicOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        exported: true,
        docsOutputPath,
        publicOutputPath,
        runId: snapshot.run.runId,
        receiptHash: snapshot.receipt.receiptHash,
        depositTxHash: snapshot.transactions.depositTxHash
      },
      null,
      2
    )
  );
} finally {
  store.close?.();
}
```

- [ ] **Step 4: Create snapshot schema doc**

Create `docs/evidence/live-demo-sprint12-snapshot.schema.md`:

```markdown
# Sprint 12 Live Demo Snapshot Schema

The live demo snapshot is commit-safe public evidence exported from a matched local live run.

Required top-level fields:

- `schemaVersion`
- `source`
- `capturedAt`
- `liveUrl`
- `run`
- `transactions`
- `verifier`
- `receipt`

Rules:

- `source` must be `live`.
- `run.status` must be `matched`.
- `transactions.depositTxHash` must be present.
- `verifier.decision` must be `matched`.
- `receipt.receiptHash` must be present.
- `verifier.decisionTxHash` may be `null` because Sprint 11 and Sprint 12 use local verifier decisions by default.
- Snapshot files must not contain private keys, wallet export material, auth headers, auth tokens, tokenized RPC URLs, or local browser storage.
- Flashblocks data must not be used as final confirmation.
```

- [ ] **Step 5: Run syntax and script tests**

Run:

```powershell
node --check apps/web/scripts/export-live-demo-snapshot.mjs
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoSnapshot
```

Expected:

```text
Script syntax passes.
Snapshot unit tests pass.
```

## Task 5: Live UI Demo State Polish

**Files:**

- Modify: `apps/web/public/live-flow.js`
- Modify: `apps/web/public/styles.css` only if needed for wrapping

- [ ] **Step 1: Add browser-script expectations**

Before editing, run:

```powershell
node --check apps/web/public/live-flow.js
rg -n "Open dynamic receipt|Verify receipt|Deposit submitted" apps\web\public\live-flow.js
```

Expected:

```text
Syntax passes.
Existing Sprint 11 labels are present.
```

- [ ] **Step 2: Update live copy**

Keep the UI operational and concise:

- after `matched`, show `Dynamic receipt ready`
- show both `/api/receipts/<receiptHash>` and `receiptHash`
- after `mismatched` or `failed`, show the verifier failure reason and no receipt link
- after `timeout`, show standard RPC confirmation wait copy
- do not add marketing copy or dashboard sections

Example patch target:

```javascript
runState?.receiptHash && runState?.status === "matched"
  ? view("a", { className: "button-link", href: `/api/receipts/${runState.receiptHash}`, text: "Dynamic receipt ready" })
  : view("span")
```

- [ ] **Step 3: Run syntax and public scan**

Run:

```powershell
node --check apps/web/public/live-flow.js
$secretSurfacePattern = "private" + "Key|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en"
rg -n $secretSurfacePattern apps\web\public\live-flow.js apps\web\public\styles.css
```

Expected:

```text
Syntax passes.
Public scan has no matches.
```

## Task 6: Demo Script and Runbook Refresh

**Files:**

- Modify: `docs/implementation/giwa-mvp-demo-script.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`

- [ ] **Step 1: Check current demo script labels**

Run:

```powershell
rg -n "Sprint 7|Static Demo|Sprint 11|Sprint 12|Live" docs\implementation\giwa-mvp-demo-script.md docs\implementation\giwa-mvp-runbook.md
```

Expected:

```text
Sprint 12 live rehearsal is absent or incomplete before this task.
```

- [ ] **Step 2: Update demo script**

Add a new section before `Evidence Close`:

```markdown
## Live Demo Path

Open:

```text
http://127.0.0.1:4177/live
```

Narration:

```text
This live path issues a fresh wallet-bound manifest, lets the user operate approve and deposit from the wallet app, verifies the deposit through standard RPC, and unlocks a dynamic receipt only after match.
```

Steps:

1. Connect wallet.
2. Confirm GIWA Sepolia `91342`.
3. Issue manifest.
4. Confirm approve in the wallet app.
5. Confirm deposit in the wallet app.
6. Select `Verify receipt`.
7. Open the dynamic receipt API link after `matched`.
8. If a fresh run is blocked by faucet, wallet, or RPC state, use the recorded static demo path and explain the blocker.
```

- [ ] **Step 3: Run doc scan**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $docPattern docs\implementation\giwa-mvp-demo-script.md docs\implementation\giwa-mvp-runbook.md
```

Expected:

```text
No unfinished-marker matches.
```

## Task 7: Acceptance Checklist Refresh

**Files:**

- Modify: `docs/implementation/giwa-mvp-acceptance-checklist.md`

- [ ] **Step 1: Add live acceptance rows**

Add rows to the checklist:

```markdown
| Live manifest issuance | `POST /api/runs` non-mock live server | Manifest preview visible | Excluded until matched receipt | `status=manifestIssued` |
| Live deposit submitted | Browser wallet returns deposit tx hash | Verify button enabled | Excluded until matched receipt | `status=depositSubmitted` |
| Live verifier matched | `POST /api/runs/:runId/verify` | Dynamic receipt unlocked | One live matched snapshot | `status=matched`, `receiptHash` |
| Live verifier mismatch | `matchLiveDeposit.ts` branch | Receipt locked with failure reason | Excluded from matched snapshot | `failureReason` |
| Live DB incompatible schema | `createSqliteLiveStore` guard | Server stops with DB path guidance | No snapshot generated | nullable `decisionTxHash` required |
| Live snapshot export | `export:live-demo` | Public snapshot generated after match | Snapshot can be attached | `docs/evidence/live-demo-sprint12-snapshot.json` |
```

- [ ] **Step 2: Verify checklist**

Run:

```powershell
rg -n "Live manifest issuance|Live snapshot export" docs\implementation\giwa-mvp-acceptance-checklist.md
```

Expected:

```text
All new rows are present.
```

## Task 8: Submission Evidence Refresh

**Files:**

- Modify: `docs/implementation/giwa-mvp-submission-evidence.md`
- Modify: `README.md`

- [ ] **Step 1: Update artifact map**

Add live artifacts:

```markdown
| Live demo snapshot schema | `docs/evidence/live-demo-sprint12-snapshot.schema.md` |
| Live demo snapshot | `docs/evidence/live-demo-sprint12-snapshot.json` |
| Public live demo snapshot | `apps/web/public/live-demo-snapshot.json` |
```

Add a note:

```markdown
Sprint 12 live snapshot files are generated only after a matched local live run. If absent, use the recorded Sprint 7 evidence fallback and the runbook blocker note.
```

- [ ] **Step 2: Add README live section**

Add:

```markdown
## Local Live MVP

The local live path is served at:

```text
http://127.0.0.1:4177/live
```

Use a Sprint 11-compatible DB path for live rehearsals:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-sprint12.sqlite"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

The browser wallet owns approve and deposit confirmations. The server verifies the resulting public deposit transaction hash through standard RPC before unlocking a dynamic receipt.
```

- [ ] **Step 3: Verify docs**

Run:

```powershell
rg -n "live-demo-sprint12-snapshot|Local Live MVP" README.md docs\implementation\giwa-mvp-submission-evidence.md
```

Expected:

```text
README and submission map reference Sprint 12 live artifacts.
```

## Task 9: Live Snapshot Export Rehearsal

**Files:**

- Verify: `apps/web/scripts/export-live-demo-snapshot.mjs`
- Generated only after matched run: `docs/evidence/live-demo-sprint12-snapshot.json`
- Generated only after matched run: `apps/web/public/live-demo-snapshot.json`

- [ ] **Step 1: Run export against empty or missing DB**

Use a disposable path that does not contain a matched run:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-sprint12-empty.sqlite"
pnpm --filter @giwa/web --fail-if-no-match export:live-demo
```

Expected:

```text
Command fails with `matched live run not found` or `live DB not found`.
No generated snapshot is written from synthetic data.
```

- [ ] **Step 2: Run export after matched live run exists**

After the user completes a fresh live run or after a verified Sprint 11 live DB is selected:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-sprint12.sqlite"
pnpm --filter @giwa/web --fail-if-no-match export:live-demo
```

Expected:

```text
Command exits 0.
Output reports runId, receiptHash, and depositTxHash.
Generated JSON files exist.
```

- [ ] **Step 3: Scan generated snapshot without env files**

Run:

```powershell
$secretSurfacePattern = "private" + "Key|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|author" + "ization"
rg -n $secretSurfacePattern docs\evidence\live-demo-sprint12-snapshot.json apps\web\public\live-demo-snapshot.json
```

Expected:

```text
No secret-surface matches. Public transaction hashes and public addresses are allowed.
```

## Task 10: Fresh Live Demo Rehearsal

**Files:**

- Verify runtime behavior only.

- [ ] **Step 1: Start live server**

Run:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-sprint12.sqlite"
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Expected:

```text
Server prints redacted readiness only.
Live URL is http://127.0.0.1:4177/live.
No secret values are printed.
```

- [ ] **Step 2: User-operated wallet rehearsal**

The user performs these actions in the browser wallet:

```text
connect wallet
switch or confirm GIWA Sepolia 91342
issue manifest
approve
deposit
verify receipt
open dynamic receipt
```

Expected:

```text
No user wallet secret is requested.
The browser wallet prompts for approve and deposit.
The live API stores depositTxHash.
The verifier returns matched or a clear non-matched reason.
Receipt unlocks only when matched.
```

- [ ] **Step 3: Record public rehearsal evidence**

Report:

```text
runId=<public run id>
depositTxHash=<public tx hash>
receiptHash=<public receipt hash if matched>
verifierDecision=<matched|mismatched|failed|timeout>
dynamicReceiptApi=http://127.0.0.1:4177/api/receipts/<receiptHash>
```

Do not report private keys, RPC tokens, bearer tokens, or tokenized URLs.

## Task 11: Static Fallback and Live Regression Checks

**Files:**

- Verify: `apps/web/public/flow.js`
- Verify: `apps/web/public/live-flow.js`
- Verify: `apps/web/scripts/serve-live.mjs`
- Verify: `apps/web/scripts/serve-static.mjs`

- [ ] **Step 1: Run syntax checks**

Run:

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/export-live-demo-snapshot.mjs
```

Expected:

```text
All syntax checks pass.
```

- [ ] **Step 2: Smoke static fallback**

Run static server:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
```

Check:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner-snapshot.json
```

Expected:

```text
All return HTTP 200.
Recorded fixture evidence remains visible.
```

- [ ] **Step 3: Smoke live mock API**

Run:

```powershell
$env:GIWA_LIVE_MOCK_MODE="1"
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Check:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4177/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4177/api/partner/runs
```

Expected:

```text
Both return HTTP 200.
Mock `/verify` remains blocked because mock mode has no standard RPC verifier dependency.
```

## Task 12: Final Verification and Safe Scans

**Files:**

- Verify all modified files.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemo
pnpm --filter @giwa/web --fail-if-no-match test -- live
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- receipt
```

Expected:

```text
Focused tests pass.
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
rg -n $docPattern docs\superpowers\plans\2026-06-17-sprint-12-live-demo-hardening-and-submission-refresh.md docs\implementation README.md apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $riskPattern docs\superpowers\plans\2026-06-17-sprint-12-live-demo-hardening-and-submission-refresh.md docs\implementation README.md apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $secretSurfacePattern docs\superpowers\plans\2026-06-17-sprint-12-live-demo-hardening-and-submission-refresh.md docs\implementation README.md apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
```

Expected:

```text
No unfinished-marker matches in Sprint 12 work.
Restricted-claim scan has no user-facing Sprint 12 matches.
Secret-surface scan has no live secret values. Guardrail text and scan pattern definitions are acceptable only when clearly marked.
```

## Sprint 12 Exit Gate

Sprint 12 is complete only when:

- live demo readiness model exists and is tested
- live demo snapshot model exists and is tested
- `export:live-demo` exists
- export fails clearly when no matched live run exists
- export succeeds after a matched live run exists
- generated live snapshot contains public matched-run evidence only
- `/live` copy clearly distinguishes pending, matched, mismatch, failed, and timeout states
- runbook includes fresh live rehearsal, export command, DB path policy, and fallback path
- demo script includes live path and recorded fallback path
- acceptance checklist covers live manifest, deposit, verify, snapshot, DB schema, and fallback cases
- submission evidence map includes Sprint 12 live snapshot artifacts
- README includes the local live MVP entry point
- Sprint 7 static fallback still returns HTTP 200
- Sprint 8 mock API still returns HTTP 200
- Sprint 9 manifest issuance still works
- Sprint 10 approve/deposit storage still works
- Sprint 11 verify/dynamic receipt still works
- no wallet secret is requested
- no deploy, fund, or anchor command is run
- no dependency is installed
- Flashblocks is not used as final confirmation

## Handoff

Sprint 12 completion report must include:

- files changed
- commands run and results
- live server URL
- live DB path
- whether a fresh wallet run was completed
- if matched: run id, deposit transaction hash, receipt hash, dynamic receipt API path
- live snapshot path, if generated
- static fallback status
- live mock API status
- manifest issuance status
- approve/deposit storage status
- verifier/dynamic receipt status
- confirmation that no wallet secret was requested
- confirmation that `deploy:giwa`, `fund:giwa`, and `anchor:giwa` were not run
- confirmation that no dependency was installed
- unresolved risks
- explicit next sprint document path if another sprint is needed

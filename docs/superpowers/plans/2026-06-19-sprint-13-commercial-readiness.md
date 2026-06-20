# Sprint 13 Commercial Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Sprint 12 local live MVP into a commercial-readiness foundation with a matched-only receipt gate, safer API boundaries, partner metric gating, redacted export rules, and explicit paid-pilot documentation.

**Architecture:** Sprint 13 keeps the app local and testnet-only. It adds pure gate models and API checks before any hosted deployment, keeps browser wallets as transaction owners, and preserves the Sprint 7 static fallback plus Sprint 12 live rehearsal path.

**Tech Stack:** TypeScript 6, Vitest 4, viem 2, Node HTTP live server, existing `node:sqlite` local store, dependency-free static UI, existing markdown docs. No new dependency is allowed.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-19-giwa-commercial-readiness-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-acceptance-checklist.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`
- `docs/evidence/live-demo-sprint12-snapshot.schema.md`
- `apps/web/src/lib/live`
- `apps/web/src/lib/verifier`
- `apps/web/src/lib/partner`
- `apps/web/scripts/serve-live.mjs`

## Sprint 13 Boundary

Allowed:

- add a pure commercial receipt gate model
- add tests for matched-only commercial receipt opening
- harden `/api/receipts/:receiptHash` so it cross-checks receipt, decision, and run state
- gate live snapshot export on the commercial receipt gate
- gate partner matched metrics on gate-passed receipts
- add bounded API error mapping
- add request body size and malformed JSON handling to the live server
- update runtime, runbook, acceptance, and evidence docs
- update the sprint index with Sprint 13 and Sprint 14 handoff

Not allowed:

- read or print `.env` or `.env.local` content
- do not request or use a user wallet private key
- send approve/deposit transactions from server code or scripts
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or `mint` commands
- install dependencies
- expose the live API outside localhost
- use Flashblocks as final confirmation
- do not add claims about production assets, yield, settlement, identity checks, phishing prevention, or security guarantees
- expand into multi-campaign dashboard scope

## File Structure

Create:

- `apps/web/src/lib/live/commercialReceiptGate.ts` - pure commercial receipt gate and failure reasons.
- `apps/web/src/lib/live/commercialReceiptGate.test.ts` - matched-only gate tests.
- `apps/web/src/lib/live/liveApiErrors.ts` - bounded API error mapper.
- `apps/web/src/lib/live/liveApiErrors.test.ts` - API error redaction tests.
- `docs/implementation/giwa-commercial-readiness-gate.md` - paid pilot, security, privacy, release, and stop-condition gate.

Modify:

- `apps/web/src/lib/live/liveApi.ts` - use commercial receipt gate and bounded error responses.
- `apps/web/src/lib/live/liveDemoSnapshot.ts` - require gate-passed evidence before public snapshot output.
- `apps/web/src/lib/live/liveDemoSnapshot.test.ts` - add negative commercial-gate tests.
- `apps/web/src/lib/partner/partnerSummary.ts` - document or implement matched metric gate for future live rows.
- `apps/web/scripts/serve-live.mjs` - add request body size and malformed JSON handling.
- `docs/implementation/giwa-live-mvp-runtime-gate.md` - add Sprint 13 runtime boundary.
- `docs/implementation/giwa-mvp-runbook.md` - add Sprint 13 verification and commercial gate rehearsal notes.
- `docs/implementation/giwa-mvp-acceptance-checklist.md` - add commercial readiness rows.
- `docs/implementation/giwa-mvp-submission-evidence.md` - add commercial readiness artifacts.
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md` - add Sprint 13 and Sprint 14 handoff.

## Task 1: Commercial Receipt Gate Model

**Files:**

- Create: `apps/web/src/lib/live/commercialReceiptGate.ts`
- Create: `apps/web/src/lib/live/commercialReceiptGate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/live/commercialReceiptGate.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";
import type { DecisionRecord, LiveRunRecord, ReceiptRecord } from "./liveTypes.ts";

const matchedRun: LiveRunRecord = {
  runId: "run-1",
  idempotencyKey: "wallet:campaign:mission:",
  wallet: "0x1111111111111111111111111111111111111111",
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  referralCode: null,
  nonce: "nonce-1",
  intentHash: `0x${"a".repeat(64)}`,
  manifestJson: JSON.stringify({ chainId: 91342 }),
  manifestSignature: `0x${"b".repeat(130)}`,
  status: "matched",
  expiryUnix: 1790000000,
  createdAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-06-19T00:10:00.000Z"
};

const matchedDecision: DecisionRecord = {
  intentHash: matchedRun.intentHash,
  depositTxHash: `0x${"c".repeat(64)}`,
  decision: "matched",
  failureReason: null,
  verifierInputHash: `0x${"d".repeat(64)}`,
  receiptHash: `0x${"e".repeat(64)}`,
  decisionTxHash: null,
  issuedAt: 1790000000
};

const matchedReceipt: ReceiptRecord = {
  receiptHash: `0x${"e".repeat(64)}`,
  intentHash: matchedRun.intentHash,
  payloadJson: JSON.stringify({ status: "matched" }),
  canonicalPayload: "{\"status\":\"matched\"}",
  canonicalPayloadBytesHex: "0x7b22737461747573223a226d617463686564227d"
};

describe("commercial receipt gate", () => {
  it("opens for matched run, matched decision, and matching receipt", () => {
    const result = evaluateCommercialReceiptGate({
      run: matchedRun,
      decision: matchedDecision,
      receipt: matchedReceipt
    });

    expect(result.open).toBe(true);
    expect(result.reason).toBe(null);
  });

  it("stays closed when the run is not matched", () => {
    const result = evaluateCommercialReceiptGate({
      run: { ...matchedRun, status: "depositSubmitted" },
      decision: matchedDecision,
      receipt: matchedReceipt
    });

    expect(result.open).toBe(false);
    expect(result.reason).toBe("run_not_matched");
  });

  it("stays closed when decision and receipt hash differ", () => {
    const result = evaluateCommercialReceiptGate({
      run: matchedRun,
      decision: { ...matchedDecision, receiptHash: `0x${"f".repeat(64)}` },
      receipt: matchedReceipt
    });

    expect(result.open).toBe(false);
    expect(result.reason).toBe("receipt_hash_mismatch");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm red**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate
```

Expected:

```text
FAIL because commercialReceiptGate.ts does not exist.
```

- [ ] **Step 3: Implement the pure gate**

Create `apps/web/src/lib/live/commercialReceiptGate.ts`:

```typescript
import type { DecisionRecord, LiveRunRecord, ReceiptRecord } from "./liveTypes.ts";

export type CommercialReceiptGateReason =
  | "run_missing"
  | "decision_missing"
  | "receipt_missing"
  | "run_not_matched"
  | "decision_not_matched"
  | "decision_failure_reason_present"
  | "decision_receipt_missing"
  | "receipt_hash_mismatch"
  | "intent_hash_mismatch"
  | "receipt_payload_invalid";

export type CommercialReceiptGateInput = {
  run: LiveRunRecord | undefined;
  decision: DecisionRecord | undefined;
  receipt: ReceiptRecord | undefined;
};

export type CommercialReceiptGateResult =
  | { open: true; reason: null }
  | { open: false; reason: CommercialReceiptGateReason };

function hasJsonObjectPayload(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export function evaluateCommercialReceiptGate(input: CommercialReceiptGateInput): CommercialReceiptGateResult {
  if (input.run === undefined) return { open: false, reason: "run_missing" };
  if (input.decision === undefined) return { open: false, reason: "decision_missing" };
  if (input.receipt === undefined) return { open: false, reason: "receipt_missing" };
  if (input.run.status !== "matched") return { open: false, reason: "run_not_matched" };
  if (input.decision.decision !== "matched") return { open: false, reason: "decision_not_matched" };
  if (input.decision.failureReason !== null) return { open: false, reason: "decision_failure_reason_present" };
  if (input.decision.receiptHash === null) return { open: false, reason: "decision_receipt_missing" };
  if (input.decision.receiptHash.toLowerCase() !== input.receipt.receiptHash.toLowerCase()) {
    return { open: false, reason: "receipt_hash_mismatch" };
  }
  if (input.decision.intentHash.toLowerCase() !== input.receipt.intentHash.toLowerCase()) {
    return { open: false, reason: "intent_hash_mismatch" };
  }
  if (input.run.intentHash.toLowerCase() !== input.receipt.intentHash.toLowerCase()) {
    return { open: false, reason: "intent_hash_mismatch" };
  }
  if (!hasJsonObjectPayload(input.receipt.payloadJson)) return { open: false, reason: "receipt_payload_invalid" };

  return { open: true, reason: null };
}
```

- [ ] **Step 4: Run the focused test and confirm green**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate
```

Expected:

```text
PASS commercialReceiptGate.test.ts
```

## Task 2: Receipt API Uses Commercial Gate

**Files:**

- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`

- [ ] **Step 1: Add failing receipt gate API tests**

Append cases to the live API receipt tests:

```typescript
it("does not return a live receipt when no matched decision exists", async () => {
  const store = createMemoryLiveStore();
  const now = "2026-06-19T00:00:00.000Z";
  const run = store.createRun({
    runId: "run-1",
    idempotencyKey: "wallet:campaign:mission:",
    wallet: "0x1111111111111111111111111111111111111111",
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    referralCode: null,
    nonce: "nonce-1",
    intentHash: `0x${"a".repeat(64)}`,
    manifestJson: JSON.stringify({ chainId: 91342 }),
    manifestSignature: `0x${"b".repeat(130)}`,
    status: "depositSubmitted",
    expiryUnix: 1790000000,
    createdAt: now,
    updatedAt: now
  });
  store.saveReceipt({
    receiptHash: `0x${"e".repeat(64)}`,
    intentHash: run.intentHash,
    payloadJson: JSON.stringify({ status: "matched" }),
    canonicalPayload: "{\"status\":\"matched\"}",
    canonicalPayloadBytesHex: "0x7b7d"
  });

  const api = createLiveApiHandler({
    store,
    now: () => now,
    issueManifest: async () => {
      throw new Error("not used");
    }
  });

  const response = await api({ method: "GET", pathname: `/api/receipts/0x${"e".repeat(64)}` });

  expect(response.status).toBe(404);
  expect(response.body.error).toBe("receipt_not_found");
});
```

- [ ] **Step 2: Run the live API tests and confirm red**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
FAIL because receipt records are currently returned without a commercial gate cross-check.
```

- [ ] **Step 3: Update receipt route**

In `apps/web/src/lib/live/liveApi.ts`, import the gate:

```typescript
import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";
```

Update the `/api/receipts/` branch so it finds the decision and run before returning the receipt:

```typescript
const receipt = deps.store.getReceipt(receiptHash);
if (receipt === undefined) return { status: 404, body: { error: "receipt_not_found" } };
const decision = deps.store.getDecisionByIntentHash(receipt.intentHash);
const run = deps.store.listRuns().find((candidate) => candidate.intentHash === receipt.intentHash);
const gate = evaluateCommercialReceiptGate({ run, decision, receipt });
if (!gate.open) return { status: 404, body: { error: "receipt_not_found", gateReason: gate.reason } };
```

Keep the existing JSON parse and response body after the gate.

- [ ] **Step 4: Run the focused tests and confirm green**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi commercialReceiptGate
```

Expected:

```text
PASS liveApi and commercialReceiptGate tests.
```

## Task 3: Bounded API Error Mapping

**Files:**

- Create: `apps/web/src/lib/live/liveApiErrors.ts`
- Create: `apps/web/src/lib/live/liveApiErrors.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`

- [ ] **Step 1: Write the failing error mapper test**

Create `apps/web/src/lib/live/liveApiErrors.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { toLiveApiErrorBody } from "./liveApiErrors.ts";

describe("live API error mapping", () => {
  it("maps known validation messages to bounded codes", () => {
    expect(toLiveApiErrorBody(new Error("Request body must be an object"))).toEqual({
      error: "invalid_request_body"
    });
  });

  it("does not expose unknown raw error messages", () => {
    const body = toLiveApiErrorBody(new Error("rpc token failed against https://example.invalid/private"));
    expect(body).toEqual({ error: "internal_error" });
    expect(JSON.stringify(body)).not.toContain("https://");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm red**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApiErrors
```

Expected:

```text
FAIL because liveApiErrors.ts does not exist.
```

- [ ] **Step 3: Implement bounded mapper**

Create `apps/web/src/lib/live/liveApiErrors.ts`:

```typescript
const MESSAGE_TO_CODE = new Map<string, string>([
  ["Request body must be an object", "invalid_request_body"],
  ["depositTxHash already belongs to another run", "deposit_tx_hash_already_used"],
  ["depositTxHash already has a terminal decision", "deposit_tx_hash_already_decided"],
  ["run does not exist", "run_not_found"],
  ["matched verifier result must include receipt", "matched_receipt_required"]
]);

export function toLiveApiErrorBody(error: unknown): { error: string } {
  if (!(error instanceof Error)) return { error: "internal_error" };
  const mapped = MESSAGE_TO_CODE.get(error.message);
  return { error: mapped ?? "internal_error" };
}
```

- [ ] **Step 4: Use the mapper in liveApi**

In `apps/web/src/lib/live/liveApi.ts`, import:

```typescript
import { toLiveApiErrorBody } from "./liveApiErrors.ts";
```

Replace the catch body with:

```typescript
return {
  status: 400,
  body: toLiveApiErrorBody(error)
};
```

- [ ] **Step 5: Run tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi liveApiErrors
```

Expected:

```text
PASS liveApi and liveApiErrors tests.
```

## Task 4: Live Server Request Body Limit

**Files:**

- Modify: `apps/web/scripts/serve-live.mjs`

- [ ] **Step 1: Run current syntax check**

Run:

```powershell
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
Syntax check passes before editing.
```

- [ ] **Step 2: Add bounded body reading**

Replace `readBody` with:

```javascript
async function readBody(request) {
  const maxBytes = 64 * 1024;
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      const error = new Error("request_body_too_large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("malformed_json");
    error.statusCode = 400;
    throw error;
  }
}
```

Wrap the API branch body read:

```javascript
let parsedBody;
try {
  parsedBody = request.method === "POST" ? await readBody(request) : undefined;
} catch (error) {
  const status = Number(error.statusCode ?? 400);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify({ error: error.message === "request_body_too_large" ? "request_body_too_large" : "malformed_json" }));
  return;
}
```

Pass `parsedBody` into the API handler.

- [ ] **Step 3: Run syntax check**

Run:

```powershell
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
Syntax check passes.
```

## Task 5: Snapshot Export Requires Commercial Gate

**Files:**

- Modify: `apps/web/src/lib/live/liveDemoSnapshot.ts`
- Modify: `apps/web/src/lib/live/liveDemoSnapshot.test.ts`

- [ ] **Step 1: Add failing snapshot gate test**

Add a test proving receipt/decision mismatch fails:

```typescript
it("rejects matched snapshots when decision and receipt hash differ", () => {
  const input = buildMatchedSnapshotInput();
  expect(() =>
    buildLiveDemoSnapshot({
      ...input,
      decision: {
        ...input.decision!,
        receiptHash: `0x${"9".repeat(64)}`
      }
    })
  ).toThrow("commercial receipt gate failed");
});
```

Use the existing test fixture builder in `liveDemoSnapshot.test.ts`; if no builder exists, extract the current matched input into `buildMatchedSnapshotInput()`.

- [ ] **Step 2: Run snapshot tests and confirm red**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoSnapshot
```

Expected:

```text
FAIL until buildLiveDemoSnapshot uses the commercial gate.
```

- [ ] **Step 3: Apply gate in snapshot builder**

In `apps/web/src/lib/live/liveDemoSnapshot.ts`, import:

```typescript
import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";
```

Before parsing manifest and receipt payload, run:

```typescript
const gate = evaluateCommercialReceiptGate({
  run: input.run,
  decision: input.decision ?? undefined,
  receipt: input.receipt ?? undefined
});
if (!gate.open) {
  throw new Error(`commercial receipt gate failed: ${gate.reason}`);
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoSnapshot commercialReceiptGate
```

Expected:

```text
PASS liveDemoSnapshot and commercialReceiptGate tests.
```

## Task 6: Partner Metrics Gate

**Files:**

- Modify: `apps/web/src/lib/partner/partnerSummary.ts`
- Modify: `apps/web/src/lib/partner/partnerSummary.test.ts`

- [ ] **Step 1: Add test for non-matched exclusion**

Add a test that a live or fixture row without receipt readiness does not increase `manifestMatchedReceiptCount`:

```typescript
it("does not count non-ready receipts as manifest matched", () => {
  const model = buildPartnerProofConsoleModel(
    {
      ...fixtureFlow,
      receipt: {
        ...fixtureFlow.receipt,
        ready: false,
        receiptHash: null
      }
    },
    fixtureEvidence,
    { evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json" }
  );

  expect(model.summary.manifestMatchedReceiptCount).toBe(0);
  expect(model.summary.matchedTxRate).toBe("0%");
});
```

Use the local fixtures already present in `partnerSummary.test.ts`.

- [ ] **Step 2: Run partner tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- partnerSummary
```

Expected:

```text
PASS if current behavior already excludes non-ready receipts, or FAIL until the summary gate is corrected.
```

- [ ] **Step 3: Correct summary gate if needed**

Ensure `manifestMatchedReceiptCount` is derived only from `flow.receipt.ready === true` and matched receipt events. If the current model is already correct, leave production code unchanged and keep the regression test.

- [ ] **Step 4: Run tests again**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- partnerSummary
```

Expected:

```text
PASS partnerSummary tests.
```

## Task 7: Commercial Readiness Gate Document

**Files:**

- Create: `docs/implementation/giwa-commercial-readiness-gate.md`
- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`

- [ ] **Step 1: Create readiness gate doc**

Create `docs/implementation/giwa-commercial-readiness-gate.md`:

```markdown
# GIWA Commercial Readiness Gate

## Scope

`GIWA Verified Intent Rail` is commercial-ready only for a managed GIWA Sepolia testnet activation evidence pilot.

The supported pilot is one partner, one campaign, one mission, one mock vault action, one matched-only receipt flow, and one partner evidence packet.

## Receipt Gate

Commercial receipt access requires:

- run status `matched`
- terminal decision `matched`
- no failure reason
- decision receipt hash equals stored receipt hash
- decision intent hash equals stored receipt intent hash
- receipt payload parses
- standard RPC evidence was used for final verifier decision
- Flashblocks was not used as final confirmation

## Hosted Blockers

Do not expose the live API outside localhost until these exist:

- auth
- tenant isolation
- request body limits
- rate limits
- exact origin policy
- bounded error responses
- redacted structured logs
- durable DB and backup policy

## Pilot Stop Conditions

Stop if a workflow asks for wallet secrets, prints real env values, opens receipts before `matched`, treats Flashblocks as final confirmation, or expands the product into production assets, yield, settlement, KYC, phishing prevention, or safety guarantees.
```

- [ ] **Step 2: Link it from runtime gate**

Append to `docs/implementation/giwa-live-mvp-runtime-gate.md`:

```markdown
## Sprint 13 Commercial Readiness Boundary

Sprint 13 adds a commercial receipt gate and hosted-preview blocker list. It does not make the local live server a public hosted service.

Commercial readiness is tracked in:

```text
docs/implementation/giwa-commercial-readiness-gate.md
```

The live API remains localhost-only until auth, tenant isolation, request body limits, rate limits, exact origin policy, bounded errors, redacted logs, durable storage, and backup/restore gates are implemented.
```

- [ ] **Step 3: Run doc scan**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $docPattern docs\implementation\giwa-commercial-readiness-gate.md docs\implementation\giwa-live-mvp-runtime-gate.md
```

Expected:

```text
No unfinished-marker matches.
```

## Task 8: Runbook, Acceptance, Evidence, and Index Updates

**Files:**

- Modify: `docs/implementation/giwa-mvp-runbook.md`
- Modify: `docs/implementation/giwa-mvp-acceptance-checklist.md`
- Modify: `docs/implementation/giwa-mvp-submission-evidence.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

- [ ] **Step 1: Update runbook**

Add a `Sprint 13 Commercial Readiness Checks` section:

```markdown
## Sprint 13 Commercial Readiness Checks

Commercial readiness keeps the live server local and testnet-only.

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate
pnpm --filter @giwa/web --fail-if-no-match test -- liveApiErrors
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi liveDemoSnapshot partnerSummary
node --check apps/web/scripts/serve-live.mjs
```

Receipt access is valid only when the commercial receipt gate opens. Hosted partner beta remains blocked until the hosted blockers in `docs/implementation/giwa-commercial-readiness-gate.md` are implemented.
```

- [ ] **Step 2: Update acceptance checklist**

Add rows:

```markdown
| Commercial receipt gate | `evaluateCommercialReceiptGate` | Receipt opens only for matched run, matched decision, matching receipt | Public receipt evidence | receipt route locked otherwise |
| Bounded API errors | `toLiveApiErrorBody` | Raw provider/storage/RPC messages are not returned | Safer local API behavior | unknown errors map to `internal_error` |
| Request body limit | `serve-live.mjs` | Oversized or malformed API body fails before handler | Safer local API behavior | no raw request body logging |
| Snapshot commercial gate | `buildLiveDemoSnapshot` | Export succeeds only for gate-passed matched receipt | Commit-safe live snapshot | no synthetic evidence |
| Hosted blocker list | commercial readiness gate doc | External hosting remains blocked until auth, tenant, rate, request, logging, and storage gates exist | Sprint 14+ routing | local-only Sprint 13 |
```

- [ ] **Step 3: Update submission evidence map**

Add:

```markdown
| Commercial readiness design | `docs/superpowers/specs/2026-06-19-giwa-commercial-readiness-design.md` |
| Sprint 13 plan | `docs/superpowers/plans/2026-06-19-sprint-13-commercial-readiness.md` |
| Commercial readiness gate | `docs/implementation/giwa-commercial-readiness-gate.md` |
```

- [ ] **Step 4: Update sprint index**

Add Sprint 13 to the sprint table:

```markdown
| 13 | `2026-06-19-sprint-13-commercial-readiness.md` | commercial receipt gate, API safety boundary, partner metric gate, hosted blocker design | Sprint 12 approval |
```

Add a short extension note:

```markdown
Sprint 13 starts the commercial readiness foundation. It keeps the product local, GIWA Sepolia testnet-only, and single-flow while adding a commercial receipt gate and hosted-preview blockers.
```

- [ ] **Step 5: Run doc checks**

Run:

```powershell
rg -n "Sprint 13|commercial readiness|Commercial receipt gate" docs\implementation docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md
```

Expected:

```text
New Sprint 13 references are present.
```

## Task 9: Final Verification

**Files:**

- Verify all Sprint 13 changes.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate
pnpm --filter @giwa/web --fail-if-no-match test -- liveApiErrors
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi liveDemoSnapshot partnerSummary
```

Expected:

```text
Focused tests pass.
```

- [ ] **Step 2: Run package checks**

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
rg -n $docPattern docs\superpowers\specs\2026-06-19-giwa-commercial-readiness-design.md docs\superpowers\plans\2026-06-19-sprint-13-commercial-readiness.md docs\implementation apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $riskPattern docs\superpowers\specs\2026-06-19-giwa-commercial-readiness-design.md docs\superpowers\plans\2026-06-19-sprint-13-commercial-readiness.md docs\implementation apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $secretSurfacePattern docs\superpowers\specs\2026-06-19-giwa-commercial-readiness-design.md docs\superpowers\plans\2026-06-19-sprint-13-commercial-readiness.md docs\implementation apps\web\src apps\web\public apps\web\scripts -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
```

Expected:

```text
No unfinished-marker matches in Sprint 13 files.
Risk-phrase matches are allowed only in explicit guardrail, non-goal, or stop-condition sections.
Secret-surface matches are allowed only in explicit redaction policy or scan pattern text.
No real env file content is printed.
```

## Sprint 13 Exit Gate

Sprint 13 is complete only when:

- `docs/superpowers/specs/2026-06-19-giwa-commercial-readiness-design.md` exists
- `docs/implementation/giwa-commercial-readiness-gate.md` exists
- `commercialReceiptGate` tests pass
- receipt API returns live receipts only through the commercial gate
- snapshot export fails closed when the commercial gate fails
- partner matched metrics exclude non-ready receipts
- API unknown errors do not expose raw exception strings
- live server rejects oversized and malformed JSON bodies
- runbook, acceptance checklist, submission evidence, and sprint index reference Sprint 13
- no dependency is installed
- no wallet secret is requested
- no deploy, fund, anchor, verify, or mint chain command is run
- Flashblocks remains non-final fast feedback only
- Sprint 7 static fallback and Sprint 12 live rehearsal path remain preserved

## Handoff

Sprint 13 completion report must include:

- files changed
- commands run and results
- whether code changes were limited to gate/error/request hardening
- confirmation that no dependency was installed
- confirmation that no wallet secret was requested
- confirmation that deploy/fund/anchor/verify/mint commands were not run
- confirmation that real env files were not content-scanned
- commercial receipt gate behavior summary
- hosted blockers still unresolved
- recommended next sprint:

```text
docs/superpowers/plans/2026-06-19-sprint-14-verifier-trust-hardening.md
```

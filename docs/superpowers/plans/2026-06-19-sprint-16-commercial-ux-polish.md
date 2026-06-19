# Sprint 16 Commercial UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the commercial demo UX for `GIWA Verified Intent Rail` without changing the product scope. Sprint 16 turns the existing local live flow, dynamic receipt API, static fallback, partner proof console, and hosted API foundation into a clearer participant, partner, and operator experience for one GIWA Sepolia mock vault action.

**Architecture:** Sprint 16 is a UI/model polish sprint on top of Sprint 12 live evidence, Sprint 13 receipt gate, Sprint 14 verifier replay, and Sprint 15 hosted API foundation. It must preserve the Sprint 7 static fallback, keep `/live` as the participant flow, keep `/receipt/:hash` matched-only, keep `/partner` as a single evidence packet, and add an operator-facing `/demo` control room only as a local/reviewer surface. It must not public-host the live service or start Sprint 17 operations.

**Tech Stack:** TypeScript 6, Vitest 4, dependency-free browser JavaScript, Node HTTP local live server, existing `node:sqlite` adapter behind `liveStore`, existing verifier and receipt gate modules, existing CSS, markdown docs. No new dependency is allowed in Sprint 16.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-19-giwa-commercial-readiness-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-17-sprint-12-live-demo-hardening-and-submission-refresh.md`
- `docs/superpowers/plans/2026-06-19-sprint-13-commercial-readiness.md`
- `docs/superpowers/plans/2026-06-19-sprint-14-verifier-trust-hardening.md`
- `docs/superpowers/plans/2026-06-19-sprint-15-hosted-api-foundation.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-demo-script.md`
- `apps/web/src/lib/live/*`
- `apps/web/src/lib/partner/*`
- `apps/web/src/lib/verifier/*`
- `apps/web/public/flow.js`
- `apps/web/public/live-flow.js`
- `apps/web/public/styles.css`
- `apps/web/scripts/serve-live.mjs`

## Parallel Read-Only Analysis Summary

Five read-only explorer passes informed this plan:

- Participant `/live` UX: the current live page can connect a wallet, issue a manifest, send browser-wallet transaction requests, store hashes, verify, and link the dynamic receipt, but it does not yet show the full participant rail from wallet readiness through receipt unlock. `apps/web/src/lib/live/liveFlowState.ts` still contains older Sprint 9 copy while `apps/web/public/live-flow.js` has later behavior.
- Receipt UX: the current static `/receipt/:hash` path only distinguishes the known static hash from other paths. Sprint 16 needs explicit matched, pending, mismatch, integrity-locked, and unknown states while preserving the commercial receipt gate and non-enumerating public behavior.
- Partner packet UX: `/partner` already has KPI, transaction, signer, confirmation, decoded log, fixture source, and export surfaces. Sprint 16 should convert that into a single matched-only evidence packet for one partner/campaign/mission, not a broader dashboard.
- Operator demo UX: reviewer flow is currently spread across README/runbook URLs. Sprint 16 should add a local `/demo` control room that reports health, readiness, latest run, receipt handoff, snapshot freshness, and static fallback status with safe projections only.
- Accessibility and copy QA: long hashes wrap in some places but need viewport proof; disabled wallet actions lack accessible reason text; dynamic notices need a stable status region; stale sprint-stage copy should be removed from public-facing surfaces.

## Sprint 16 Boundary

Allowed:

- Add pure TypeScript view models and tests for participant, receipt, partner packet, recovery copy, and demo control-room surfaces.
- Update `apps/web/public/live-flow.js`, `apps/web/public/flow.js`, and `apps/web/public/styles.css` to consume those models or mirror their tested behavior.
- Add `apps/web/public/demo.html` and `apps/web/public/demo-control-room.js` for a local operator control room.
- Add a safe local `/api/demo/status` projection if needed for `/demo`.
- Reuse `evaluateCommercialReceiptGate`, verifier replay outputs, `failureCodeDisplayCopy`, live store, live demo snapshot, health/readiness, auth, tenant, request safety, rate limit, and telemetry boundaries.
- Update README/runbook/demo/commercial readiness docs only to link Sprint 16 and clarify the opening order.

Not allowed:

- New dependency installation.
- Public hosting or deployment.
- Cloud database, managed secret store, or hosted operations launch.
- Wallet transaction submission from server or scripts.
- Contract deployment, funding, chain anchor, verifier-chain command, or mint command execution.
- Sprint 17 operational beta work.
- Flashblocks as final confirmation.
- Production asset, yield, fund movement, settlement, identity-service, phishing-prevention, or safety warranty claims.
- Reading or printing real env file contents.

## Planned File Structure

Create or update during Sprint 16 implementation:

```text
apps/web/src/lib/live/liveFlowState.ts
apps/web/src/lib/live/liveFlowState.test.ts
apps/web/src/lib/live/liveRecoveryCopy.ts
apps/web/src/lib/live/liveRecoveryCopy.test.ts
apps/web/src/lib/live/liveReceiptPage.ts
apps/web/src/lib/live/liveReceiptPage.test.ts
apps/web/src/lib/live/liveDemoControlRoom.ts
apps/web/src/lib/live/liveDemoControlRoom.test.ts
apps/web/src/lib/live/liveApi.ts
apps/web/src/lib/live/liveApi.test.ts
apps/web/src/lib/live/liveStore.ts
apps/web/src/lib/live/liveStore.test.ts
apps/web/src/lib/partner/partnerEvidencePacket.ts
apps/web/src/lib/partner/partnerEvidencePacket.test.ts
apps/web/src/lib/partner/partnerSummary.ts
apps/web/src/lib/partner/partnerSummary.test.ts
apps/web/public/live-flow.js
apps/web/public/flow.js
apps/web/public/demo.html
apps/web/public/demo-control-room.js
apps/web/public/styles.css
apps/web/scripts/serve-live.mjs
docs/implementation/giwa-live-mvp-runtime-gate.md
docs/implementation/giwa-mvp-runbook.md
docs/implementation/giwa-mvp-demo-script.md
docs/implementation/giwa-commercial-readiness-gate.md
```

Keep implementation close to these files. Do not add framework scaffolding or a second UI runtime.

---

## Task 1: Sprint 16 Boundary Docs and Index Update

Files:

- `docs/superpowers/plans/2026-06-19-sprint-16-commercial-ux-polish.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-demo-script.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`

Steps:

- [ ] Write a failing documentation smoke check that proves Sprint 16 is not yet linked from the sprint index and runtime docs.

Failure command:

```powershell
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-16-commercial-ux-polish.md"
Select-String -Path docs\implementation\giwa-live-mvp-runtime-gate.md -Pattern "Sprint 16 Commercial UX Polish Boundary"
Select-String -Path docs\implementation\giwa-mvp-runbook.md -Pattern "Sprint 16 Commercial UX Polish"
Select-String -Path docs\implementation\giwa-mvp-demo-script.md -Pattern "Commercial UX polish"
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Commercial UX Polish Gate"
```

Expected failing result:

```text
No matches before the docs are linked.
```

- [ ] Add a Sprint 16 row to the sprint index after Sprint 15.
- [ ] Add a short runtime boundary section that says Sprint 16 is local UX polish only.
- [ ] Add a short runbook link for the future `/demo` and polished `/live` surfaces without changing current runnable commands.
- [ ] Add a short demo-script note that Sprint 16 implementation should open `/demo` first when available.
- [ ] Add a commercial readiness gate note that Sprint 16 must not weaken matched-only receipt access.

Minimal implementation direction:

```text
Sprint 16 plans commercial UX polish for participant, receipt, partner packet, and operator demo surfaces. It keeps the live server local by default, preserves the static fallback, and does not authorize public hosting.
```

Passing command:

```powershell
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-16-commercial-ux-polish.md"
Select-String -Path docs\implementation\giwa-live-mvp-runtime-gate.md -Pattern "Sprint 16 Commercial UX Polish Boundary"
Select-String -Path docs\implementation\giwa-mvp-runbook.md -Pattern "Sprint 16 Commercial UX Polish"
Select-String -Path docs\implementation\giwa-mvp-demo-script.md -Pattern "Commercial UX polish"
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Commercial UX Polish Gate"
```

Exit condition:

```text
Sprint 16 is discoverable from the index, runtime gate, runbook, demo script, and commercial gate docs. No implementation files are changed in this task.
```

## Task 2: Live Participant UX View Model

Files:

- `apps/web/src/lib/live/liveFlowState.ts`
- `apps/web/src/lib/live/liveFlowState.test.ts`
- `apps/web/src/lib/live/liveTypes.ts`
- `apps/web/public/live-flow.js`

Steps:

- [ ] Add failing tests that describe the participant journey for disconnected, wrong-chain, manifest-issued, invalidated, approve-submitted, deposit-submitted, verification-queued, matched, mismatch, failure, and timeout states.

Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFlowState
```

Expected failing result:

```text
Assertions fail because the current model still exposes older approve/deposit disabled copy and lacks a full status rail.
```

Test shape:

```ts
import { describe, expect, it } from "vitest";
import { buildLiveFlowViewModel } from "./liveFlowState.ts";

describe("buildLiveFlowViewModel commercial rail", () => {
  it("shows a complete participant rail after matched verification", () => {
    const model = buildLiveFlowViewModel({
      wallet: { status: "connected", account: "0xf3a729973559082260e742ebedf705271ad29476", chainId: 91342 },
      run: {
        runId: "0xrun",
        status: "matched",
        manifestPreview: manifestPreviewFixture,
        approveTxHash: "0xapprove",
        depositTxHash: "0xdeposit",
        verification: { status: "terminal" },
        receiptHash: "0xreceipt"
      },
      nowSeconds: manifestPreviewFixture.expiryUnix - 1
    });

    expect(model.primaryAction.kind).toBe("viewReceipt");
    expect(model.statusRail.map((step) => step.id)).toEqual([
      "walletReady",
      "manifestIssued",
      "approveSubmitted",
      "depositSubmitted",
      "standardRpcChecking",
      "verifierMatched",
      "receiptReady"
    ]);
    expect(model.receiptHandoff?.receiptHash).toBe("0xreceipt");
  });
});
```

- [ ] Expand `LiveFlowInput` so the pure model can represent the fields the browser already uses: run id, hashes, verifier status, receipt readiness, failure copy, and expiry.
- [ ] Make action availability deterministic: wallet connected, chain id `91342`, valid manifest, non-expired preview, not invalidated, and not already submitted.
- [ ] Add a queued verification state for hosted mode where `POST /api/runs/:runId/verify` returns `202`.
- [ ] Update `apps/web/public/live-flow.js` to render from the model shape or keep equivalent tested branches.

Minimal implementation direction:

```ts
export type LiveParticipantStepId =
  | "walletReady"
  | "manifestIssued"
  | "approveSubmitted"
  | "depositSubmitted"
  | "standardRpcChecking"
  | "verifierMatched"
  | "receiptReady";

export type LiveActionState = {
  enabled: boolean;
  label: string;
  reason: null | "wallet_required" | "wrong_chain" | "manifest_required" | "manifest_invalidated" | "manifest_expired" | "already_submitted";
};
```

Passing command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFlowState
node --check apps/web/public/live-flow.js
```

Exit condition:

```text
The live participant view model has complete tested states from wallet readiness to receipt handoff, and public copy no longer references old sprint-stage labels.
```

## Task 3: Live Failure and Recovery Copy Model

Files:

- `apps/web/src/lib/live/liveRecoveryCopy.ts`
- `apps/web/src/lib/live/liveRecoveryCopy.test.ts`
- `apps/web/src/lib/verifier/liveFailureCode.ts`
- `apps/web/public/live-flow.js`

Steps:

- [ ] Add failing tests for every user-visible recovery state: provider missing, wallet request rejected, wrong chain, manifest invalidated, manifest expired, approve rejected, deposit rejected, duplicate deposit hash, missing deposit evidence, verifier timeout, mismatch, failed verification, receipt not found, hosted auth blocked, rate limited, and readiness blocked.

Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveRecoveryCopy liveFailureCode
```

Expected failing result:

```text
Tests fail because copy is embedded in browser handlers and not centrally mapped.
```

Test shape:

```ts
import { describe, expect, it } from "vitest";
import { recoveryCopyFor } from "./liveRecoveryCopy.ts";

describe("recoveryCopyFor", () => {
  it("uses the three-part recovery formula for wrong chain", () => {
    expect(recoveryCopyFor({ code: "wrong_chain", expectedChainId: 91342 })).toEqual({
      title: "Switch to GIWA Sepolia",
      happened: "The connected wallet is on a different chain.",
      locked: "Manifest issuance and wallet actions are locked.",
      next: "Switch the wallet to chain 91342, then issue a new manifest.",
      severity: "action-required"
    });
  });
});
```

- [ ] Reuse `failureCodeDisplayCopy` for verifier mismatch/failed states and wrap it in participant-safe copy.
- [ ] Keep raw provider, RPC, storage, and runtime messages out of public copy.
- [ ] Ensure Flashblocks appears only as non-final fast feedback when shown.
- [ ] Ensure blocked states say what is locked and what the user can safely do next.

Minimal implementation direction:

```ts
export type RecoveryCopy = {
  title: string;
  happened: string;
  locked: string;
  next: string;
  severity: "info" | "action-required" | "blocked";
};
```

Passing command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveRecoveryCopy liveFailureCode
node --check apps/web/public/live-flow.js
```

Exit condition:

```text
All participant-facing failure and recovery states have bounded copy, no raw upstream message, and no claim outside the testnet mock action boundary.
```

## Task 4: Commercial Receipt Page Model and Route Behavior

Files:

- `apps/web/src/lib/live/liveReceiptPage.ts`
- `apps/web/src/lib/live/liveReceiptPage.test.ts`
- `apps/web/src/lib/live/commercialReceiptGate.ts`
- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveApi.test.ts`
- `apps/web/public/flow.js`
- `apps/web/public/styles.css`

Steps:

- [ ] Add failing tests for receipt route states: matched, unknown, pending, mismatch, failed, timeout, malformed hash, hash mismatch, and gate-closed integrity state.

Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveReceiptPage commercialReceiptGate liveApi
```

Expected failing result:

```text
Tests fail because current static route behavior only checks the known recorded receipt hash and does not model locked states.
```

Test shape:

```ts
import { describe, expect, it } from "vitest";
import { buildReceiptPageModel } from "./liveReceiptPage.ts";

describe("buildReceiptPageModel", () => {
  it("keeps unknown public receipts non-enumerating", () => {
    const model = buildReceiptPageModel({
      routeHash: "0x" + "11".repeat(32),
      lookup: { kind: "not_found" }
    });

    expect(model.state).toBe("unknown");
    expect(model.publicTitle).toBe("Receipt not found or not available");
    expect(model.showRunDetails).toBe(false);
  });

  it("shows matched receipt proof with progressive disclosure", () => {
    const model = buildReceiptPageModel({
      routeHash: matchedReceipt.receiptHash,
      lookup: { kind: "matched", receipt: matchedReceipt, verifierInput: verifierInputFixture }
    });

    expect(model.state).toBe("matched");
    expect(model.primaryEvidence.receiptHash).toBe(matchedReceipt.receiptHash);
    expect(model.disclosures.map((item) => item.id)).toEqual(["manifest", "verifierInput", "receiptPayload", "decodedLogs"]);
  });
});
```

- [ ] Preserve `GET /api/receipts/:receiptHash` public `receipt_not_found` behavior for unknown and gate-closed states.
- [ ] Add an internal route model that can explain pending and mismatch states only when the caller already has scoped run state.
- [ ] Update `apps/web/public/flow.js` receipt rendering so a wrong static hash shows a clear locked/unknown state instead of the generic guided flow.
- [ ] Add progressive disclosure sections for manifest fields, verifier input hash, receipt payload, canonical payload bytes/hash, and decoded logs when matched.

Minimal implementation direction:

```ts
export type ReceiptPageState = "matched" | "unknown" | "pending" | "mismatch" | "integrity_locked";

export type ReceiptDisclosure = {
  id: "manifest" | "verifierInput" | "receiptPayload" | "decodedLogs";
  label: string;
  defaultOpen: boolean;
};
```

Passing command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveReceiptPage commercialReceiptGate liveApi
node --check apps/web/public/flow.js
```

Exit condition:

```text
The commercial receipt page opens only for matched gate-passed receipts, gives clear locked states elsewhere, and never exposes scoped run details through an unknown public hash.
```

## Task 5: Partner Evidence Packet Polish

Files:

- `apps/web/src/lib/partner/partnerEvidencePacket.ts`
- `apps/web/src/lib/partner/partnerEvidencePacket.test.ts`
- `apps/web/src/lib/partner/partnerSummary.ts`
- `apps/web/src/lib/partner/partnerSummary.test.ts`
- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveTypes.ts`
- `apps/web/public/flow.js`
- `apps/web/public/styles.css`

Steps:

- [ ] Add failing tests for a single partner evidence packet with one campaign, one mission, matched-only rows, fixture/live labels, standard RPC confirmation, replay status, receipt permalink, and JSON export link.

Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- partnerEvidencePacket partnerSummary liveApi
```

Expected failing result:

```text
Tests fail because current partner summary is fixture-first and does not model a separate evidence packet row set.
```

Test shape:

```ts
import { describe, expect, it } from "vitest";
import { buildPartnerEvidencePacket } from "./partnerEvidencePacket.ts";

describe("buildPartnerEvidencePacket", () => {
  it("includes only gate-passed matched rows in the packet", () => {
    const packet = buildPartnerEvidencePacket({
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      rows: [matchedLiveRow, timeoutLiveRow, mismatchLiveRow],
      source: { snapshotPath: "/live-demo-snapshot.json", generatedAt: "2026-06-19T00:00:00.000Z" }
    });

    expect(packet.rows).toHaveLength(1);
    expect(packet.rows[0].status).toBe("matched");
    expect(packet.kpis.matchedTxRate).toBe("1/3");
    expect(packet.evidence.standardRpc.finalConfirmation).toBe(true);
    expect(packet.evidence.fastFeedback.finalConfirmation).toBe(false);
  });
});
```

- [ ] Use the existing commercial receipt gate and replay fields instead of recomputing verifier trust in UI code.
- [ ] Keep `/partner` as a proof packet for one campaign/mission, with source labels and a source timestamp.
- [ ] Add packet summary fields: matched receipt count, submitted deposit count, matched transaction rate, mock testnet amount, source mix, replay status, and snapshot path.
- [ ] Update `apps/web/public/flow.js` so `/partner` renders the evidence packet before raw hashes and deep evidence cards.

Minimal implementation direction:

```ts
export type PartnerEvidencePacketRow = {
  source: "fixture" | "live";
  runId: string;
  wallet: string;
  status: "matched";
  receiptHash: string;
  depositTxHash: string;
  verifierInputHash: string;
  receiptPermalink: string;
};
```

Passing command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- partnerEvidencePacket partnerSummary liveApi
node --check apps/web/public/flow.js
```

Exit condition:

```text
Partner view presents one matched-only evidence packet, keeps fixture and live sources distinct, and does not broaden into a multi-campaign dashboard.
```

## Task 6: Operator Demo Control Room Decision, Route, and Model

Files:

- `apps/web/src/lib/live/liveDemoControlRoom.ts`
- `apps/web/src/lib/live/liveDemoControlRoom.test.ts`
- `apps/web/src/lib/live/liveDemoReadiness.ts`
- `apps/web/src/lib/live/liveDemoReadiness.test.ts`
- `apps/web/src/lib/live/liveStore.ts`
- `apps/web/src/lib/live/liveStore.test.ts`
- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveApi.test.ts`
- `apps/web/scripts/serve-live.mjs`
- `apps/web/public/demo.html`
- `apps/web/public/demo-control-room.js`
- `apps/web/public/styles.css`

Steps:

- [ ] Add failing tests for a local operator control room model that selects the recommended opening order from live, dynamic receipt, live snapshot, static fallback, partner console, and static snapshot status.

Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoControlRoom liveDemoReadiness liveApi liveStore
```

Expected failing result:

```text
Tests fail because no control-room model, /demo route, or safe demo status projection exists.
```

Test shape:

```ts
import { describe, expect, it } from "vitest";
import { buildLiveDemoControlRoom } from "./liveDemoControlRoom.ts";

describe("buildLiveDemoControlRoom", () => {
  it("prefers a matched live run and keeps static fallback visible", () => {
    const room = buildLiveDemoControlRoom({
      health: { ok: true },
      readiness: { ready: true, mode: "local" },
      latestMatchedRun: matchedRunFixture,
      receipt: matchedReceiptFixture,
      snapshot: { present: true, receiptHash: matchedReceiptFixture.receiptHash },
      staticFallback: { available: true }
    });

    expect(room.openingOrder.map((item) => item.id)).toEqual([
      "freshLive",
      "dynamicReceipt",
      "staticFallback",
      "partnerConsole",
      "staticSnapshot"
    ]);
    expect(room.safeProjection.manifestJson).toBeUndefined();
  });
});
```

- [ ] Add deterministic latest-run selection in store code or a pure helper: newest `updatedAt`, stable tie-break by run id, ignore invalidated runs for primary receipt.
- [ ] Add `/api/demo/status` only if needed. Its response must be a safe projection: no signed manifest internals, no credential material, no raw env values, no RPC URL, no stack message.
- [ ] Add `/demo` static route in `serve-live.mjs` mapping to `demo.html`.
- [ ] Add `demo-control-room.js` to fetch health/readiness/demo status and render copyable local URLs.
- [ ] Keep `/healthz` and `/readyz` redacted and separate from reviewer status.

Minimal implementation direction:

```ts
export type DemoOpeningItem = {
  id: "freshLive" | "dynamicReceipt" | "staticFallback" | "partnerConsole" | "staticSnapshot";
  href: string;
  state: "ready" | "blocked" | "stale";
  reason: string;
};
```

Passing command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoControlRoom liveDemoReadiness liveApi liveStore
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
```

Exit condition:

```text
Local `/demo` explains the demo opening order and runtime state using safe projections, while `/live`, `/receipt/:hash`, `/partner`, health, readiness, and static fallback remain unchanged.
```

## Task 7: Public Copy Cleanup

Files:

- `apps/web/src/lib/live/publicCopyGuard.test.ts`
- `apps/web/src/lib/live/liveFlowState.ts`
- `apps/web/src/lib/live/liveRecoveryCopy.ts`
- `apps/web/src/lib/live/liveReceiptPage.ts`
- `apps/web/src/lib/partner/partnerEvidencePacket.ts`
- `apps/web/public/live-flow.js`
- `apps/web/public/flow.js`
- `apps/web/public/demo-control-room.js`
- `apps/web/public/index.html`
- `apps/web/public/live.html`
- `apps/web/public/demo.html`
- `docs/implementation/giwa-mvp-demo-script.md`
- `docs/implementation/giwa-mvp-runbook.md`

Steps:

- [ ] Add a failing copy guard test that scans public-facing strings for legacy product names, stale sprint-stage labels, forbidden claim terms, and server-only wording.

Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
```

Expected failing result:

```text
Tests fail because current public copy still includes old sprint-stage labels in live flow surfaces.
```

Test shape:

```ts
import { describe, expect, it } from "vitest";
import { publicCopyCorpus } from "./publicCopyGuard.fixtures.ts";

describe("public commercial copy", () => {
  it("uses current product and demo language", () => {
    const copy = publicCopyCorpus.join("\n");
    expect(copy).toContain("GIWA Verified Intent Rail");
    expect(copy).not.toMatch(/Loop Rail|GIWA Verified Activation Rail/u);
    expect(copy).not.toMatch(/Sprint 10|Sprint 11|Sprint 12/u);
  });
});
```

- [ ] Replace visible sprint-stage copy with user-centered copy such as `Wallet action`, `Verification`, `Receipt ready`, and `Receipt locked`.
- [ ] Keep internal docs allowed to mention sprint numbers, but keep public UI copy free of implementation stage labels.
- [ ] Keep all claim language within the testnet mock action boundary.
- [ ] Keep `ProofKPI` as evidence/reporting wording only when needed; do not use it as a safety, identity, or settlement claim.

Minimal implementation direction:

```text
Use outcome-based copy: "Receipt locked until verifier match" instead of implementation-stage copy.
Use source-based copy: "Standard RPC receipt" and "non-final fast feedback" where appropriate.
```

Passing command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
node --check apps/web/public/live-flow.js
node --check apps/web/public/flow.js
node --check apps/web/public/demo-control-room.js
```

Exit condition:

```text
Public UI copy is current, product-name consistent, testnet-bounded, and free of stale sprint-stage labels.
```

## Task 8: Mobile, Hash Wrapping, and Accessibility Pass

Files:

- `apps/web/public/styles.css`
- `apps/web/public/live-flow.js`
- `apps/web/public/flow.js`
- `apps/web/public/demo-control-room.js`
- `apps/web/src/lib/live/liveFlowState.test.ts`
- `apps/web/src/lib/live/liveReceiptPage.test.ts`

Steps:

- [ ] Add failing tests or smoke checks for long hash wrapping, accessible disabled action reasons, focus-visible styles, live notice region, active step state, and mobile viewport overflow.

Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFlowState liveReceiptPage
node --check apps/web/public/live-flow.js
node --check apps/web/public/flow.js
node --check apps/web/public/demo-control-room.js
```

Expected failing result:

```text
Model tests fail for missing disabled reasons or status metadata; manual/browser smoke catches any layout overflow after implementation starts.
```

Model assertion shape:

```ts
expect(model.actions.approve).toMatchObject({
  enabled: false,
  reason: "manifest_required",
  describedById: "approve-action-reason"
});
expect(model.noticeRegion).toEqual({ role: "status", live: "polite" });
expect(model.statusRail.some((step) => step.current)).toBe(true);
```

- [ ] Add visible focus rings for buttons and links using `:focus-visible`.
- [ ] Add stable `role="status"` and `aria-live="polite"` for dynamic notices.
- [ ] Add `aria-describedby` reason text for disabled wallet actions.
- [ ] Add `aria-current="step"` to the current status rail item.
- [ ] Add hash utility classes for full hash, short hash, and copyable hash rows with `overflow-wrap: anywhere`.
- [ ] Test viewport widths `320`, `375`, `390`, `768`, `981`, and desktop. Record the smoke result in the Sprint 16 completion report.

Minimal implementation direction:

```css
.focus-ring:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 3px solid #0078a6;
  outline-offset: 3px;
}

.hash-wrap {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}
```

Passing command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFlowState liveReceiptPage
node --check apps/web/public/live-flow.js
node --check apps/web/public/flow.js
node --check apps/web/public/demo-control-room.js
```

Browser smoke:

```text
Open /live, /receipt/<matchedHash>, /partner, and /demo at 320, 375, 390, 768, 981, and desktop widths. Confirm no horizontal overflow, no overlapping cards, visible focus state, and long hashes wrap inside their containers.
```

Exit condition:

```text
Commercial surfaces are keyboard-visible, screen-reader friendlier, and stable on narrow and desktop viewports.
```

## Task 9: Browser and Static Smoke QA Plan

Files:

- `apps/web/scripts/serve-live.mjs`
- `apps/web/scripts/serve-static.mjs`
- `apps/web/public/live-flow.js`
- `apps/web/public/flow.js`
- `apps/web/public/demo-control-room.js`
- `apps/web/public/styles.css`

Steps:

- [ ] Add a smoke checklist to Sprint 16 completion notes and run it during implementation after tests pass.
- [ ] Verify local live routes with the final rehearsal DB or a selected local DB path.
- [ ] Verify static fallback routes on the static server.
- [ ] Verify hosted-mode foundations are not weakened by local UX additions.

Failure command before implementation:

```powershell
node --check apps/web/public/demo-control-room.js
```

Expected failing result:

```text
The command fails until the Sprint 16 /demo browser script exists.
```

Live server smoke:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:PORT="4190"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

HTTP checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/demo
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/readyz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/api/partner/runs
```

Static fallback smoke:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner-snapshot.json
```

Passing command:

```powershell
node --check apps/web/public/live-flow.js
node --check apps/web/public/flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
```

Exit condition:

```text
Live, demo, receipt, partner, health, readiness, and static fallback routes load locally with safe output and without weakening Sprint 15 gates.
```

## Task 10: Regression and Safe Scans

Files:

- All Sprint 16 changed files.
- Public assets under `apps/web/public`.
- Docs under `docs/implementation`.
- Sprint plans under `docs/superpowers/plans`.

Steps:

- [ ] Run focused package tests.
- [ ] Run full package tests and builds.
- [ ] Run syntax checks for public browser scripts and Node server scripts.
- [ ] Run safe scans without reading real env files.
- [ ] Confirm no new dependency was installed.
- [ ] Confirm no wallet, deploy, funding, anchor, verifier-chain, or mint command was run.

Focused commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFlowState liveRecoveryCopy liveReceiptPage partnerEvidencePacket liveDemoControlRoom liveDemoReadiness liveApi liveStore partnerSummary commercialReceiptGate
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
pnpm --filter @giwa/web --fail-if-no-match typecheck
node --check apps/web/public/live-flow.js
node --check apps/web/public/flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
```

Full regression commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
```

Documentation and public surface scans:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("payment set" + "tled")
$secretSurfacePattern = "private" + "Key|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|author" + "ization|NEXT" + "_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"
rg -n $docPattern docs\superpowers\plans\2026-06-19-sprint-16-commercial-ux-polish.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation -g "*.md"
rg -n $riskPattern docs\superpowers\plans\2026-06-19-sprint-16-commercial-ux-polish.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation -g "*.md"
rg -n $secretSurfacePattern docs\superpowers\plans\2026-06-19-sprint-16-commercial-ux-polish.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation -g "*.md" -g "!**/.env*"
rg -n $secretSurfacePattern apps\web\public -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
```

Expected result:

```text
New Sprint 16 docs and public assets contain no unfinished markers, no forbidden commercial claim, and no exposed secret-like surface. Existing matches outside changed text must be reported as guardrail examples only.
```

Exit condition:

```text
Sprint 16 implementation is complete only after focused tests, full regressions, syntax checks, HTTP/browser smoke, and safe scans pass or have clearly documented residual risk.
```

---

## Sprint 16 Exit Gate

Sprint 16 exit gate is satisfied when:

- `/live` shows a participant-ready flow from wallet readiness to matched receipt handoff.
- `/live` blocks wrong chain, disconnected wallet, invalidated manifest, expired manifest, duplicate deposit hash, and locked receipt states with clear recovery copy.
- `/receipt/:hash` has matched, unknown, pending, mismatch, and integrity-locked route behavior without exposing scoped details through unknown public hashes.
- `/partner` presents one partner evidence packet for one campaign and one mission, with matched-only receipt rows and fixture/live source labels.
- `/demo` exists locally and gives reviewers the opening order, health/readiness, latest run status, dynamic receipt link, snapshot status, and static fallback links through safe projections.
- Long hashes wrap on mobile and desktop.
- Buttons and links have visible focus states.
- Dynamic notices use a status region.
- Disabled actions have visible and machine-readable reasons.
- Flashblocks is shown only as non-final fast feedback.
- The Sprint 7 static fallback still works.
- The Sprint 8-15 live API, hosted foundation, and commercial receipt gate tests still pass.
- No new dependency is installed.
- No wallet transaction is sent by server or scripts.
- No deploy, funding, anchor, verifier-chain, or mint command is run.
- No real env file content is printed or scanned with content-printing commands.

## Completion Report Template

```text
Sprint 16 Commercial UX Polish completion:

Changed files:
- <path>

Commands run:
- <command> -> <result>

Browser smoke:
- /live -> <result>
- /receipt/<hash> -> <result>
- /partner -> <result>
- /demo -> <result>
- mobile widths -> <result>

Exit gate:
- participant flow: <met/not met>
- receipt page: <met/not met>
- partner packet: <met/not met>
- operator control room: <met/not met>
- static fallback: <met/not met>
- hosted foundation preserved: <met/not met>

Safety confirmations:
- no server/script wallet transaction sent
- no deploy/fund/anchor/verifier-chain/mint command run
- no new dependency installed
- no real env content printed or scanned
- Flashblocks remained non-final

Unresolved risks:
- <risk or none>

nextSprint:
- docs/superpowers/plans/2026-06-19-sprint-17-hosted-ops-and-partner-beta.md
```

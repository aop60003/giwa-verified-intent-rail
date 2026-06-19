# Sprint 6 Partner ProofKPI Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin partner-facing summary that shows why the receipt matters without becoming a dashboard product.

**Architecture:** The partner view reads existing receipts and run events. It does not introduce multi-campaign analytics, billing, export, or production partner management.

**Tech Stack:** Next.js, local JSON storage for MVP, protocol receipt schema.

---

## ProofKPI Definition

`ProofKPI` means manifest-matched GIWA Sepolia testnet action evidence converted into partner-readable activation metrics. It is reporting for mock testnet actions, not TVL, yield, settlement, compliance, or production performance.

## Start Conditions

- Sprint 5 exit gate is approved.
- Receipt data exists or fixture receipt data is available.
- Status model and run event capture points exist.
- `pnpm-workspace.yaml` and `apps/web/package.json` exist.
- Partner summary remains one page.

## Files

- Create: `apps/web/src/app/partner/page.tsx`
- Create: `apps/web/src/components/PartnerSummary.tsx`
- Create: `apps/web/src/lib/storage/runStore.ts`
- Update: `apps/web/src/lib/storage/receiptStore.ts`
- Test: `apps/web/src/components/PartnerSummary.test.tsx`

## Required Metrics

- `campaignEntryCount`
- `walletConnectedCount`
- `intentAcceptedCount`
- `depositSubmittedCount`
- `manifestMatchedReceiptCount`
- `matchedTxRate`
- `matchedTestnetDepositAmountBaseUnits`

Metric rules:

- `runId` is required.
- dedupe key is `wallet + campaignId + missionId + intentHash`.
- matched transaction rate is `manifestMatchedReceiptCount / depositSubmittedCount`.
- if `depositSubmittedCount` is `0`, matched transaction rate displays `N/A`.
- fixture rows and live rows must be visibly separated.

## Required Evidence Fields

- `intentSubmittedTxHash`
- `depositTxHash`
- `decisionTxHash`
- `receiptHash`
- matched status
- `blockNumber`
- `blockHash`
- explorer links

## Tasks

- [ ] Define run events.

Allowed event names:

- `campaign_entry`
- `wallet_connected`
- `intent_accepted`
- `intent_submitted`
- `deposit_submitted`
- `receipt_matched`

Each event must include `runId`, timestamp, `campaignId`, `missionId`, wallet address when available, and fixture/live source.

- [ ] Build local run store.

The MVP can use local JSON storage. Do not add a database in this sprint.

Storage path:

```text
apps/web/.data/
```

Sprint 7 exports sanitized submission evidence from this local store.

- [ ] Build partner summary component.

The component must fit one page and focus on evidence, not broad analytics.

Required partner-facing explanation:

```text
Quest clicks show participation. GIWA Verified Intent Rail shows that a signed, manifest-covered GIWA Sepolia testnet action matched a block-confirmed transaction and produced a receipt hash.
```

Example summary row for judging:

```text
campaignEntryCount=2, walletConnectedCount=2, depositSubmittedCount=2, manifestMatchedReceiptCount=2, matchedTxRate=100%, matchedTestnetDepositAmountBaseUnits=<base-unit amount>, source=fixture|live
```

- [ ] Build partner route.

Route:

```text
/partner
```

- [ ] Add evidence links.

Each matched receipt row should expose:

- receipt link
- deposit explorer link
- decision explorer link

- [ ] Add partner summary tests.

Expected coverage:

- dedupe rule prevents double counting a repeated run
- matched transaction rate formula is stable
- fixture rows are labeled as fixture data
- `receiptHash`, `depositTxHash`, and `decisionTxHash` are visible
- copy does not imply TVL, yield, settlement, real funds, or production compliance

## Verification

Run:

```powershell
Test-Path .\pnpm-workspace.yaml
Test-Path .\apps\web\package.json
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match test -- PartnerSummary
pnpm --filter @giwa/web --fail-if-no-match build
```

Expected:

```text
Partner page builds.
Partner summary shows evidence fields and mock testnet metrics.
Partner summary tests pass.
Filtered pnpm commands fail if `@giwa/web` does not exist.
```

## Exit Gate

Sprint 6 is complete only when:

- partner page is one page
- partner page shows why the rail matters
- receipt and explorer links are visible
- `receiptHash`, `depositTxHash`, and `decisionTxHash` are visible
- matched transaction rate and dedupe rules are documented
- no broad analytics or billing features are added
- wording stays testnet-only and mock-metric-specific

## Stop Conditions

Stop if:

- summary expands into a dashboard
- metrics imply production value, settlement, yield, or TVL
- partner page hides `receiptHash` or transaction evidence

## Handoff To Sprint 7

Pass these artifacts:

- partner route
- summary metrics
- evidence field list
- sample populated report

# Sprint 5 Thin Guided User Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the minimal user-facing flow for one GIWA Sepolia mock vault action and receipt.

**Architecture:** The UI is a thin client over already-proven chain and verifier behavior. It must guide the user through review, approve, deposit, confirmation, verifier match, and receipt without expanding into a landing page or dashboard.

**Tech Stack:** Next.js, React, viem, protocol package, verifier API from Sprint 4.

---

## Start Conditions

- Sprint 4 exit gate is approved.
- Deployed GIWA Sepolia contract addresses exist.
- Verifier API and receipt schema are stable.
- Server-only manifest signing API is stable.
- Server-only intent submit relay API is stable.
- `pnpm-workspace.yaml` and `apps/web/package.json` exist.
- UI copy must follow finality and testnet boundaries.

## Files

- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/receipt/[receiptHash]/page.tsx`
- Create: `apps/web/src/components/WalletPanel.tsx`
- Create: `apps/web/src/components/ReadinessPanel.tsx`
- Create: `apps/web/src/components/IntentPreview.tsx`
- Create: `apps/web/src/components/ExecutionPanel.tsx`
- Create: `apps/web/src/components/StatusRail.tsx`
- Create: `apps/web/src/lib/chain.ts`
- Create: `apps/web/src/lib/status/watchDepositStatus.ts`
- Update: `apps/web/src/app/globals.css`

## UI Flow

```text
campaign entry
-> wallet connect
-> GIWA Sepolia network check
-> token balance check
-> optional verified state
-> intent preview
-> approve if required
-> deposit
-> fast feedback
-> block confirmed
-> verifier checking
-> verifier matched
-> receipt page
```

## Tasks

- [ ] Build campaign entry as the first screen.

Do not build a marketing landing page. The first screen starts the guided action.

- [ ] Build wallet and network readiness.

Required states:

- no wallet
- wrong network
- GIWA Sepolia ready
- insufficient test token
- read-only verifiedState: `verified`, `guest`, or `unavailable`

The verified state is not KYC, not eligibility, and not a gating decision.

- [ ] Build intent preview.

Required fields:

- target
- selector
- asset
- amount
- spender
- max allowance
- expiry
- `intentHash`

- [ ] Build execution flow.

Required actions:

- request signed manifest from a server-only endpoint
- submit or trigger relayed `IntentSubmitted` through the configured intent submitter path
- approve mock token if needed
- deposit into mock vault
- send `depositTxHash` to verifier

The UI must never expose `CAMPAIGN_SIGNER_PRIVATE_KEY`, `VERIFIER_PRIVATE_KEY`, or `INTENT_SUBMITTER_PRIVATE_KEY`.

- [ ] Build status model.

Required states:

- chain states: `idle`, `submitted`, `fastFeedback`, `blockConfirmed`, `confirmationTimeout`
- verifier states: `verifierChecking`, `matched`, `mismatched`, `failed`, `verifierTimeout`

Receipt-ready condition:

```text
blockConfirmed && verifierStatus === matched && receiptHash exists
```

Do not use copy that implies fast feedback or block confirmation is final verifier success.

- [ ] Add status and receipt route tests.

Expected coverage:

- fast feedback does not show a receipt
- block confirmation starts verifier checking but does not show a receipt
- matched status enables the receipt page
- mismatched, failed, and timeout states do not show a successful receipt
- optional verified state is read-only and never gates the guest path
- client code cannot import server-only env modules

- [ ] Capture run events.

Required events:

- `campaign_entry`
- `wallet_connected`
- `intent_accepted`
- `intent_submitted`
- `deposit_submitted`
- `receipt_matched`

Each event includes `runId`, timestamp, `campaignId`, `missionId`, wallet address when available, and fixture/live source.

Legacy flat state names may be displayed internally only when mapped to:

- `idle`
- `submitted`
- `fastFeedback`
- `blockConfirmed`
- `confirmationTimeout`
- `verifierChecking`
- `matched`
- `mismatched`
- `failed`
- `verifierTimeout`

- [ ] Build receipt page.

Required fields:

- `intentHash`
- `receiptHash`
- `depositTxHash`
- `decisionTxHash`
- `blockNumber`
- `blockHash`
- explorer links
- testnet safety notice

## Verification

Run:

```powershell
Test-Path .\pnpm-workspace.yaml
Test-Path .\apps\web\package.json
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match test -- StatusRail ExecutionPanel receipt
pnpm --filter @giwa/web --fail-if-no-match build
```

Expected:

```text
TypeScript reports no errors.
Status and receipt route tests pass.
Next.js build succeeds.
Receipt page is reachable only after verifier matched status.
Filtered pnpm commands fail if `@giwa/web` does not exist.
```

## Exit Gate

Sprint 5 is complete only when:

- user can review manifest before transactions
- wrong network blocks execution
- fast feedback is visually separate from confirmed block
- block confirmation is visually separate from verifier match
- receipt waits for verifier matched status
- receipt page shows all core evidence fields
- no partner dashboard work is added

## Stop Conditions

Stop if:

- UI claims completion at fast feedback
- UI shows receipt after block confirmation but before verifier match
- UI hides target, spender, amount, or max allowance
- UI turns into a general campaign dashboard

## Handoff To Sprint 6

Pass these artifacts:

- user flow routes
- receipt route
- status state model
- available run events
- run event capture points
- evidence fields displayed in UI
- tested receipt route guard

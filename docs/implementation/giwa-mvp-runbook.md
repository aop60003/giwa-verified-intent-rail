# GIWA Verified Intent Rail Runbook

This runbook is the final handoff for running and verifying the completed GIWA Sepolia mock vault flow.

## Final Demo Opening Order

```text
Demo control room:   http://127.0.0.1:4190/demo
Fresh live path:     http://127.0.0.1:4190/live
Dynamic receipt API: http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
Static fallback:     http://127.0.0.1:4176/
Partner console:     http://127.0.0.1:4176/partner
Static snapshot:     http://127.0.0.1:4176/partner-snapshot.json
```

Use the Sprint 16 demo control room first when the local live server is running. Use the static fallback when live wallet, local DB, or RPC state is unavailable during review.

## Prerequisites

- Node and pnpm available in the workspace.
- Dependencies already restored from the existing lockfile.
- Do not print `.env.local` or any secret value.
- Do not place private keys or server-only env values in public web files.

## Verification Commands

Run package checks:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match test -- wallet
pnpm --filter @giwa/web --fail-if-no-match test -- manifest
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- receipt
pnpm --filter @giwa/web --fail-if-no-match test -- live
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
```

Manual historical verifier idempotency check:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match verify:giwa
```

When the existing decision transaction is present, the verifier command checks the prior decision receipt and event instead of emitting a new decision.

This command is not part of the Sprint 17 hosted ops release gate. Sprint 17 release checks must not run verifier-chain, deploy, fund, anchor, mint, or wallet-action commands. If a later sprint needs release-time verifier replay, create a separately named read-only command that cannot emit chain transactions.

## Static Demo

Start the static server:

```powershell
pnpm --filter @giwa/web --fail-if-no-match serve
```

Open:

```text
Guided flow:     http://127.0.0.1:4176/
Receipt route:   http://127.0.0.1:4176/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503
Partner console: http://127.0.0.1:4176/partner
JSON snapshot:   http://127.0.0.1:4176/partner-snapshot.json
```

## Evidence Paths

```text
docs/evidence/giwa-sepolia-mvp-evidence.json
docs/evidence/giwa-sepolia-chain-anchor.json
packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json
apps/web/src/generated/deployment.json
apps/web/public/flow-data.json
apps/web/public/partner-snapshot.json
```

## Chain Artifacts

```text
Chain id: 91342
Network: GIWA Sepolia
Receipt hash: 0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503
Decision transaction: 0x2eb0cd03c3b71fb53664cf9364916453c442de8c05f5b436f3537414636f85df
Deposit transaction: 0xd25a4f064d15aba1fb108a2db08dc673932314c42507db5b7f9162e0a0126886
Intent hash: 0x359228ce2ef1d59fff6479e3f0a8c4a9ccc84d74dc89b9b387a25247fd28c7a4
Verifier input hash: 0x1ca37e2ff786764bbc84e55df26382a5948e7bf8de279b54c1ac5736366395de
Decoded log snapshot hash: 0x1f338c1999a710bdf1688d5074be7fe2f77a372520ed20fced2aacfc2044d4ce
```

## Recorded Evidence Fallback

If wallet funding, faucet rate limits, or network state blocks a live rerun, use the recorded fixture paths above. The static app reads `docs/evidence/giwa-sepolia-mvp-evidence.json` through the export script and does not need secret material.

Replay the public artifact export:

```powershell
pnpm --filter @giwa/web --fail-if-no-match export:flow
```

## Local Live MVP Runtime

Sprint 8 and Sprint 9 local live mode is documented in:

```text
docs/implementation/giwa-live-mvp-runtime-gate.md
```

The `4177` examples below are historical local live regression defaults. The current final demo order uses port `4190` for the demo control room and fresh live path, and port `4176` for the static fallback.

Start the live mock server for API contract and storage regression checks:

```powershell
$env:GIWA_LIVE_MOCK_MODE="1"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
Live wallet flow: http://127.0.0.1:4177/live
Live partner API: http://127.0.0.1:4177/api/partner/runs
```

For non-mock Sprint 9 manifest issuance, unset `GIWA_LIVE_MOCK_MODE` and provide the required server-only env values through the local process environment. The server prints only redacted readiness and signs the manifest on the server side.

Sprint 9 live mode supports wallet connect, GIWA Sepolia chain check, signed manifest preview, and manifest invalidation after wallet or chain changes.

The recorded Sprint 7 static demo remains the fallback when live GIWA Sepolia readiness is unavailable.

## Sprint 10 Live Approve and Deposit

Start the non-mock live server:

```powershell
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
http://127.0.0.1:4177/live
```

Sprint 10 lets the connected wallet create approve and deposit transaction requests. Receipt routes remain locked until Sprint 11 verifier match runs.

Stop if:

- the browser asks for a wallet secret
- the app tries to send transactions on any chain other than `91342`
- manifest state is invalidated or expired
- `/intent-submit` or `/verify` starts emitting chain actions before Sprint 11

## Sprint 11 Live Verifier and Dynamic Receipt

Use a Sprint 11 DB path if the existing local DB was created before nullable local verifier decisions:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-sprint11.sqlite"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
http://127.0.0.1:4177/live
```

After a wallet-bound manifest has a stored deposit transaction hash, select `Verify receipt`. The server collects standard RPC transaction and receipt snapshots, matches decoded logs to the manifest, and unlocks a dynamic receipt only for `matched`.

Dynamic receipt API:

```text
GET http://127.0.0.1:4177/api/receipts/<receiptHash>
```

Sprint 11 local verifier decisions use:

```text
decisionTxHash: null
```

No verifier transaction is sent in Sprint 11. `/intent-submit` remains chain-action disabled.

## Sprint 12 Live Demo Rehearsal

Sprint 12 uses a separate local DB path so older Sprint 8-11 rehearsal data cannot hide schema or state issues. The final fresh wallet rehearsal used `apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite` and matched:

```text
Run id:              0x67c754c6e4582cb6b1c574c21e2ea4fe034691de80e7512223fe338aee40a88d
Wallet:              0xf3a729973559082260e742ebedf705271ad29476
Approve tx:          0xdac977c324239faf5e4560c6b137b6d6954d2490b85dd83690ba7a39f430774b
Deposit tx:          0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30
Verifier input hash: 0x83a4b7d20d0162affe04be016a68d9711f86eef356cf527620159957c7b2ed04
Receipt hash:        0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
Deposit block:       28483877
```

Start or resume the final rehearsal server:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:PORT="4190"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
http://127.0.0.1:4190/live
```

Rehearsal path:

1. Connect a browser wallet.
2. Switch to GIWA Sepolia chain `91342`.
3. Issue a wallet-bound signed manifest.
4. Approve and deposit from the browser wallet.
5. Verify the stored deposit transaction with the local standard RPC verifier.
6. Open the dynamic receipt API link shown after `matched`.

The server and scripts must not request a user wallet private key or send approve/deposit transactions. If a matched live run exists, export the commit-safe live demo snapshot:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:GIWA_LIVE_URL="http://127.0.0.1:4190/live"
pnpm --filter @giwa/web --fail-if-no-match export:live-demo
```

Snapshot outputs:

```text
docs/evidence/live-demo-sprint12-snapshot.json
apps/web/public/live-demo-snapshot.json
```

If no matched live run exists, the export command fails closed and does not create a synthetic snapshot.

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

## Sprint 14 Verifier Trust Checks

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- manifest
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate liveDemoSnapshot partnerSummary
pnpm --filter @giwa/web --fail-if-no-match typecheck
node --check apps/web/scripts/export-live-demo-snapshot.mjs
```

Sprint 14 Verifier Trust Hardening is complete only when verifier input replay and receipt hashes can be recomputed from public evidence without relying on caller-provided decoded JSON.

## Sprint 15 Hosted API Foundation Checks

Sprint 15 keeps the live service local by default and adds hosted API foundation gates.

Focused checks:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- hostedMode liveAuth liveTenantPolicy liveRequestSafety liveRateLimit verificationJobQueue liveSchemaMigrations liveHealth liveTelemetry liveEnv liveStore liveApi
pnpm --filter @giwa/web --fail-if-no-match typecheck
node --check apps/web/scripts/serve-live.mjs
```

Runtime endpoints:

```text
GET /healthz
GET /readyz
```

Hosted mode remains blocked until an approved deployment plan chooses the host, durable storage adapter, credential distribution process, backup and restore procedure, and operational owner.

## Sprint 16 Commercial UX Polish

Sprint 16 implementation follows:

```text
docs/superpowers/plans/2026-06-19-sprint-16-commercial-ux-polish.md
```

Open the local operator control room first if the live server is running:

```text
http://127.0.0.1:4190/demo
```

The control room points reviewers to the fresh live path, dynamic receipt API, static fallback, partner console, and static snapshot without exposing server-only values.

## Sprint 17 Hosted Ops

Sprint 17 execution follows:

```text
docs/superpowers/plans/2026-06-19-sprint-17-hosted-ops-and-partner-beta.md
```

Sprint 17 is documentation and operations-readiness work. It does not launch public hosting, connect external storage, connect a cloud credential manager, send wallet transactions, or run chain-operation commands.

Primary outputs:

```text
docs/implementation/giwa-hosted-ops-runbook.md
docs/implementation/giwa-partner-beta-runbook.md
docs/implementation/giwa-incident-response.md
docs/implementation/giwa-evidence-retention-policy.md
```

Release gate checks are documented in the hosted ops runbook. The gate is local/read-only by default and excludes verifier-chain, deploy, fund, anchor, mint, and wallet-action commands.

Reviewer order for a controlled beta rehearsal remains:

```text
/demo
/live
/api/receipts/<matchedReceiptHash>
/
/partner
/partner-snapshot.json
```

If live readiness, wallet state, faucet state, RPC state, DB state, or hosted policy blocks review, switch to the recorded static fallback and label it as recorded GIWA Sepolia testnet evidence.

## Sprint 18 Partner Beta Rehearsal

Sprint 18 execution follows:

```text
docs/superpowers/plans/2026-06-19-sprint-18-partner-beta-rehearsal.md
```

The rehearsal package is documentation and local-ops work. It does not launch public hosting, connect external infrastructure, send wallet actions from a server or script, or run chain-operation commands.

Primary outputs:

```text
docs/implementation/giwa-partner-beta-rehearsal-runbook.md
docs/implementation/giwa-partner-beta-rehearsal-checklist.md
docs/implementation/giwa-partner-beta-feedback-form.md
docs/implementation/giwa-partner-beta-closeout-report.md
```

Reviewer order for Sprint 18 remains:

```text
1. http://127.0.0.1:4190/demo
2. http://127.0.0.1:4190/live
3. http://127.0.0.1:4190/api/receipts/<matchedReceiptHash>
4. http://127.0.0.1:4176/
5. http://127.0.0.1:4176/partner
6. http://127.0.0.1:4176/partner-snapshot.json
```

Use the feedback form and closeout report only for observed partner or reviewer input. Do not prefill success claims before a rehearsal or dry run is actually completed.

## Sprint 39 Final Readiness Handoff

Sprint 39 closes the local-advisory partner handoff packet:

```text
docs/implementation/giwa-commercial-hardening-and-partner-handoff-final-readiness.md
docs/evidence/commercial-readiness-sprint39-final-handoff.json
```

The handoff references Sprint 38 local readiness evidence and keeps protected CI, protected artifact metadata, partner signoff, external hosting approval, and managed infrastructure blocked. It does not authorize public hosting, deployment, managed infrastructure, wallet actions, or GIWA chain-operation package commands.

## Sprint 40 Staging Readiness Freeze

Sprint 40 freezes the current local-advisory handoff packet:

```text
docs/superpowers/plans/2026-06-20-sprint-40-external-only-blocker-handoff-and-staging-readiness-freeze.md
docs/implementation/giwa-external-only-blocker-handoff-and-staging-readiness-freeze.md
docs/evidence/commercial-readiness-sprint40-freeze.json
```

Use Sprint 40 as the current commercial/staging readiness state. It records current `main` `afe0bf50022717f8011fd7691b00ce0a8af90802`, check-runs count `0`, and the latest billing-lock run as stale for current source. The packet is ready for local review only. Public hosting, staging execution, partner traffic, managed infrastructure, protected CI provenance, and release approval remain blocked.

## Safety Boundaries

- The MVP displays one GIWA Sepolia mock vault action.
- Metrics are mock testnet metrics, not production asset, yield, settlement, or identity-service metrics.
- Flashblocks appears only as non-final fast feedback.
- Standard RPC receipts and verifier events are the confirmation source.
- Browser-visible files must not include secret names or values beyond public transaction/address evidence.

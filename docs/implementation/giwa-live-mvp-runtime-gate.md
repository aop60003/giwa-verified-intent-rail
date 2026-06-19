# GIWA Live MVP Runtime Gate

## Purpose

Sprint 8 adds a local runtime server for fresh Live MVP runs while preserving the Sprint 7 recorded evidence demo.

Sprint 9 adds browser wallet readiness, GIWA Sepolia chain gating, and a signed wallet-bound manifest preview. It does not send approve or deposit transactions.

## Runtime Mode

The workspace remains in non-git prototype mode when `Test-Path .\.git` returns `False`.

## Dependency Boundary

Sprint 8 installs no new packages.

Sprint 9 installs no new packages.

Local SQLite uses Node `node:sqlite` behind `apps/web/src/lib/live/liveStore.ts`. Node prints an experimental warning for this module in the current local runtime, so all database calls must stay behind the storage interface.

If hosted live deployment later requires a non-experimental SQLite package, dependency approval must be updated before installation.

## Mock Mode

Sprint 8 may start the live API in mock mode only when `GIWA_LIVE_MOCK_MODE=1` is set. Mock mode is limited to API contract and storage testing. It does not sign protocol manifests, relay intents, verify transactions, or send wallet transactions.

Sprint 9 keeps mock mode available for regression checks. In mock mode, `/api/runs` may return an unsigned mock manifest summary and `manifestPreview: null`.

In non-mock mode, `/api/runs` uses the server-only campaign signer to issue a protocol-backed manifest preview. The browser receives the signed manifest fields and preview metadata only; it never receives private key material.

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

Sprint 9 extends the live API with:

- `POST /api/runs` chain id guard for GIWA Sepolia `91342`
- `POST /api/runs/:runId/invalidate`
- manifest preview response fields for target, selector, asset, amount, spender, max allowance, expiry, and intent hash

Sprint 9 browser flow is served at:

```text
http://127.0.0.1:4177/live
```

The Sprint 9 browser flow may call wallet connect and wallet network switch methods. It must not call transaction sending methods.

## Verification Commands

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- live
pnpm --filter @giwa/web --fail-if-no-match test -- wallet
pnpm --filter @giwa/web --fail-if-no-match test -- manifest
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
```

## Exit Gate

Sprint 8 is complete when:

- live API server starts locally
- live API contract tests pass
- live storage idempotency tests pass
- static Sprint 7 demo still works
- no wallet transaction is sent
- public assets contain no server-only values

Sprint 9 is complete when:

- wallet adapter tests pass
- GIWA Sepolia chain gate tests pass
- protocol-backed manifest issuer tests pass
- `/api/runs` returns manifest preview only on GIWA Sepolia
- `/api/runs/:runId/invalidate` marks stale manifests without chain activity
- `/live` serves the wallet manifest preview shell
- Sprint 7 static fallback and Sprint 8 live mock API still work

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

## Sprint 11 Live Verifier and Dynamic Receipt Boundary

Sprint 11 enables a local verifier decision path for runs that already have a stored deposit transaction hash.

Allowed verifier behavior:

- read the submitted approve/deposit transaction hashes from the live store
- collect transaction and receipt snapshots through the GIWA Sepolia standard RPC
- decode approve/deposit logs from standard RPC receipts
- compare the decoded evidence against the server-issued manifest
- persist a local verifier decision with `decisionTxHash: null`
- create a dynamic receipt only when the decision is `matched`

Disallowed verifier behavior:

- sending a verifier chain transaction
- sending wallet approve or deposit transactions
- treating Flashblocks data as final confirmation
- unlocking receipt routes for `mismatched`, `failed`, or `timeout` decisions

`POST /api/runs/:runId/verify` is active only when the non-mock live server has a standard RPC verifier dependency. Mock mode keeps the endpoint blocked for API regression checks.

`GET /api/receipts/:receiptHash` returns live dynamic receipt payloads only after matched verification. Unknown or unmatched receipt hashes return `receipt_not_found`.

SQLite compatibility rule: Sprint 11 requires `decisions.decisionTxHash` to be nullable because the default live verifier decision is local and does not emit a verifier transaction. If an existing local DB has the older `NOT NULL` schema, the store fails closed. Use a new DB path such as:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-sprint11.sqlite"
```

## Sprint 12 Live Demo Hardening Boundary

Sprint 12 keeps the live MVP local, testnet-only, and single-flow. It adds demo readiness, exportable live demo snapshots, and submission-pack references without adding new chain actions.

Runtime rules:

- use `apps/web/.data/live-mvp-sprint12.sqlite` as the default Sprint 12 live rehearsal DB
- use `apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite` for the final fresh wallet rehearsal snapshot selected for submission review
- keep `apps/web/.data/live-mvp.sqlite` and older Sprint DB files untouched unless a maintainer explicitly selects them
- fail snapshot export when no matched live run exists
- export only public, commit-safe evidence into `docs/evidence/live-demo-sprint12-snapshot.json` and `apps/web/public/live-demo-snapshot.json`
- keep `/api/runs/:runId/verify` as a local standard RPC verifier path with `decisionTxHash: null`
- keep `/intent-submit` chain-action disabled

Sprint 12 does not send wallet transactions from scripts or the server. The browser wallet owns approve/deposit signing, and the live API stores only public transaction hashes returned by the wallet.

Flashblocks remains non-final fast feedback only. Final live demo evidence uses GIWA Sepolia standard RPC receipts and matched local verifier decisions.

## Sprint 13 Commercial Readiness Boundary

Sprint 13 adds a commercial receipt gate and hosted-preview blocker list. It does not make the local live server a public hosted service.

Commercial readiness is tracked in:

```text
docs/implementation/giwa-commercial-readiness-gate.md
```

The live API remains localhost-only until authentication, tenant isolation, request body limits, rate limits, exact origin policy, bounded errors, redacted logs, durable storage, and backup/restore gates are implemented.

## Sprint 14 Verifier Trust Hardening Boundary

Sprint 14 Verifier Trust Hardening makes live verifier output replayable from public standard RPC evidence, signed manifest evidence, canonical verifier input, and matched-only receipt gates.

Sprint 14 does not deploy contracts, send verifier transactions, send wallet transactions, expose the live API outside localhost, or implement hosted partner beta scope.

The verifier must reject signer mismatch, wrong EIP-712 domain, stored intent hash mismatch, wrong log contract address, under-confirmed receipts, expired-at-block evidence, amount mismatch, allowance overflow, missing required logs, and synthetic decoded evidence.

Optional `IntentRailV2` anchoring remains a decision anchor design until a later sprint explicitly approves contract implementation and deployment.

## Sprint 15 Hosted API Foundation Boundary

Sprint 15 plans the hosted API foundation without exposing the local live API outside the approved host policy.

The Sprint 15 plan is:

```text
docs/superpowers/plans/2026-06-19-sprint-15-hosted-api-foundation.md
```

Hosted mode must fail closed when auth, tenant isolation, exact origin policy, request limits, rate limits, bounded errors, redacted logs, durable repository, verification job queue, or migration guards are not ready.

`local` mode remains the localhost rehearsal path. `staging-testnet` and `prod-testnet` are GIWA Sepolia testnet modes only. `prod-testnet` cannot use mock mode.

Sprint 15 does not send wallet transactions, deploy contracts, run verifier chain transactions, or use Flashblocks as final confirmation.

Implemented Sprint 15 local foundation pieces:

- hosted mode policy for `local`, `staging-testnet`, and `prod-testnet`
- hosted auth context with tenant-scoped API requests
- partner run projection without signed manifest internals
- request method, origin, content-type, body-size, and malformed JSON boundaries
- dependency-free memory rate limits
- verification job queue interface and local persistence
- SQLite migration markers and verification job table
- `/healthz` and `/readyz` redacted readiness endpoints

The local rehearsal server still defaults to:

```text
host=127.0.0.1
mode=local
```

Hosted modes use process env only for hosted readiness and do not load local env files.

## Sprint 16 Commercial UX Polish Boundary

Sprint 16 adds a commercial UX polish pass without changing the runtime trust boundary.

The Sprint 16 plan is:

```text
docs/superpowers/plans/2026-06-19-sprint-16-commercial-ux-polish.md
```

Sprint 16 polishes the local participant `/live` flow, matched-only `/receipt/:hash` route, `/partner` evidence packet, and local `/demo` operator control room. It keeps the live server local by default, preserves hosted mode gates from Sprint 15, and keeps public evidence limited to safe transaction, receipt, block, and verifier hash data.

Sprint 16 does not send wallet transactions from server or scripts, deploy contracts, run verifier-chain transactions, mint test tokens, or authorize public hosting.

## Sprint 17 Hosted Ops Boundary

Sprint 17 adds hosted operations and partner beta readiness documents without changing runtime behavior.

The Sprint 17 plan is:

```text
docs/superpowers/plans/2026-06-19-sprint-17-hosted-ops-and-partner-beta.md
```

Sprint 17 outputs:

```text
docs/implementation/giwa-hosted-ops-runbook.md
docs/implementation/giwa-partner-beta-runbook.md
docs/implementation/giwa-incident-response.md
docs/implementation/giwa-evidence-retention-policy.md
```

`local`, `staging-testnet`, and `prod-testnet` remain GIWA Sepolia testnet operating modes. `prod-testnet` cannot use mock mode and cannot bind publicly until a later approved deployment plan completes release, storage, backup, observability, incident, and partner beta gates.

Sprint 17 does not public-host the live service, connect external managed infrastructure, send wallet transactions from server or scripts, run deploy/fund/anchor/verifier-chain/mint commands, or scan real env file contents.

## Sprint 18 Partner Beta Rehearsal Boundary

Sprint 18 uses the local live runtime and static fallback surfaces for partner rehearsal only.

The Sprint 18 plan is:

```text
docs/superpowers/plans/2026-06-19-sprint-18-partner-beta-rehearsal.md
```

Sprint 18 outputs:

```text
docs/implementation/giwa-partner-beta-rehearsal-runbook.md
docs/implementation/giwa-partner-beta-rehearsal-checklist.md
docs/implementation/giwa-partner-beta-feedback-form.md
docs/implementation/giwa-partner-beta-closeout-report.md
```

Runtime expectations:

- local live rehearsal uses isolated DB state
- `/healthz` and `/readyz` stay bounded and redacted
- wallet signing remains browser-wallet owned
- server and scripts do not send wallet actions
- dynamic receipt stays locked until verifier `matched`
- static fallback remains available and recorded
- public hosting and staging deployment stay blocked for Sprint 19 planning

## Sprint 19 Staging Deployment Preparation Boundary

Sprint 19 planning is:

```text
docs/superpowers/plans/2026-06-19-sprint-19-staging-deployment-preparation.md
```

Sprint 19 defines staging preparation gates for runtime mode, environment readiness, source provenance, storage, observability, security, rollback, and partner promotion. It does not start staging deployment, public host binding, managed infrastructure connection, wallet action, or chain-operation commands.

Sprint 19 execution outputs:

```text
docs/implementation/giwa-staging-deployment-preparation.md
docs/implementation/giwa-staging-release-provenance.md
docs/implementation/giwa-staging-env-contract.md
docs/implementation/giwa-staging-storage-and-restore.md
docs/implementation/giwa-staging-observability.md
docs/implementation/giwa-staging-security-boundary.md
docs/implementation/giwa-staging-rollback-and-incident-drill.md
docs/implementation/giwa-staging-partner-promotion-gate.md
docs/implementation/giwa-staging-blocker-register.md
```

Current runtime blocker notes:

- hosted modes must use process env only
- `GIWA_LIVE_PARTNER_TENANT_ID` needs explicit staging mapping before public binding
- `repositoryReady`, `tenantReady`, `rateLimitReady`, backup readiness, and queue readiness need real staging probes before they can be treated as green
- local SQLite, memory rate limits, and memory verification queue remain local-only unless a later plan approves hosted behavior

## Sprint 34 Hosted Adapter Readiness Boundary

Sprint 34 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-34-hosted-adapter-readiness-under-protected-ci-blocker.md
```

Sprint 34 readiness record:

```text
docs/implementation/giwa-hosted-adapter-readiness.md
```

Sprint 34 does not change runtime behavior. It records that:

- `serve-live.mjs` remains the local live server path
- local SQLite is not hosted adapter evidence
- memory rate limits are not multi-instance staging evidence
- memory verification queue state is not durable staging evidence
- `tenant_default` or any implicit local tenant is a staging no-go
- `repositoryReady`, `tenantReady`, `rateLimitReady`, backup readiness, restore readiness, and queue readiness need measured hosted probes
- hosted modes must use process env only and must not load local env files

Sprint 34 exits with:

```text
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
cloudSecretManagerConnection=blocked
protectedCI=blocked-billing-lock
stagingDryRunExecution=blocked-protected-ci
```

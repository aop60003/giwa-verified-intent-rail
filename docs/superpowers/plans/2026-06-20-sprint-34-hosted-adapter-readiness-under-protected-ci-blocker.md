# Sprint 34 Hosted Adapter Readiness Under Protected-CI Blocker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging for external blocker evidence and superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the hosted adapter readiness packet needed before any staging dry-run execution, while protected CI remains blocked by GitHub billing.

**Architecture:** Sprint 34 is a no-infrastructure readiness sprint. It does not connect a hosted database, cloud runtime, secret manager, or public host; instead, it locks the adapter contract, migration gate, storage/restore evidence, queue/rate durability expectations, and security/observability/rollback owners that a later protected-CI-backed staging dry run must satisfy.

**Tech Stack:** GIWA local live server, PowerShell, pnpm workspace checks, GitHub Actions evidence, staging readiness markdown runbooks.

---

## Current State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
currentMainHead=0a5fdc235cd49f2bef78087d029f194635833e7c
latestProtectedRunId=27850867132
latestProtectedRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestProtectedRunConclusion=failure
latestProtectedRunFirstJob=source-provenance
latestProtectedRunDownstreamJobs=9-skipped
latestProtectedRunLog=not-found
rootCauseClass=github-account-billing-lock
protectedCI=blocked-billing-lock
hostedAdapter=not-selected
managedDatabase=not-connected
cloudSecretManager=not-connected
publicHosting=blocked
deployment=blocked
```

## Non-Goals

Sprint 34 does not:

- resolve GitHub billing from inside this repository
- implement a hosted adapter
- connect production, managed, or cloud infrastructure
- create migrations or mutate DB state
- public-host or deploy the app
- read or print local env-file values
- output credential values
- send wallet transactions from browser, server, or scripts
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- create release tags
- claim protected CI, protected artifact, staging execution, or release-grade provenance

## Parallel Review Perspectives

Sprint 34 must incorporate these review lenses before exit:

| Perspective | Required finding in the Sprint 34 packet |
| --- | --- |
| Adapter selection and runtime boundary | adapter is not implemented or connected; selection criteria are explicit |
| Env contract and local env loading | hosted modes use process env only and readiness is redacted |
| Storage, migration, backup, restore | schema, probe, backup, restore, and owner evidence are specified |
| Rate-limit and queue durability | local memory behavior is not treated as multi-instance staging evidence |
| Observability and readiness | `/healthz`, `/readyz`, request id, logs, metrics, and alert owners are specified |
| Rollback and incident fallback | static fallback, artifact manifest, prior checksums, and owner requirements are specified |
| Auth, tenant, origin, rate security | credential-to-actor-to-tenant mapping and exact origin/rate gates are specified |
| Partner and commercial boundary | partner beta/commercial promotion stays blocked until protected CI and adapter gates pass |

## Task 1: Record The Protected-CI Blocker Baseline

- [ ] Read current GitHub run and branch state:
  ```powershell
  gh run list --repo aop60003/giwa-verified-intent-rail --limit 3 --json databaseId,headSha,status,conclusion,name,event,createdAt,updatedAt
  gh api repos/aop60003/giwa-verified-intent-rail/branches/main --jq '{name:.name,protected:.protected,commit:.commit.sha}'
  gh api repos/aop60003/giwa-verified-intent-rail/branches/main/protection --jq '{required_status_checks:.required_status_checks.contexts,enforce_admins:.enforce_admins.enabled}'
  ```
- [ ] Expected result:
  ```text
  latest protected run is not passing
  main remains protected
  required checks remain configured
  Sprint 34 remains readiness-only
  ```

## Task 2: Create Hosted Adapter Readiness Record

- [ ] Create:
  ```text
  docs/implementation/giwa-hosted-adapter-readiness.md
  ```
- [ ] Include this adapter contract:
  ```text
  adapterName=<approved later>
  adapterOwner=<approved later>
  runtimeMode=staging-testnet
  envSource=process-env-only
  localEnvFileLoading=disabled-for-hosted-modes
  readinessProbe=required-redacted
  migrationGuard=required
  backupCatalog=required
  restoreDrill=required
  rateLimitDurability=required-or-explicit-rehearsal-limitation
  verificationQueueDurability=required-or-explicit-rehearsal-limitation
  ```

## Task 3: Update Storage And Env Gates

- [ ] Update:
  ```text
  docs/implementation/giwa-staging-env-contract.md
  docs/implementation/giwa-staging-storage-and-restore.md
  docs/implementation/giwa-staging-deployment-preparation.md
  docs/implementation/giwa-staging-blocker-register.md
  docs/implementation/giwa-live-mvp-runtime-gate.md
  ```
- [ ] Record that Sprint 34 can define readiness but cannot connect:
  ```text
  hostedAdapterReadiness=prepared
  hostedAdapterImplementation=blocked
  managedDatabaseConnection=blocked
  cloudSecretManagerConnection=blocked
  protectedCI=blocked-billing-lock
  stagingDryRunExecution=blocked-protected-ci
  ```
- [ ] Confirm `serve-live.mjs`, `liveHealth.ts`, `liveRateLimit.ts`, `verificationJobQueue.ts`, `liveStore.ts`, and `liveApi.ts` remain local-runtime references only, not hosted implementation changes.

## Task 4: Update Security, Observability, And Rollback Gates

- [ ] Update:
  ```text
  docs/implementation/giwa-staging-security-boundary.md
  docs/implementation/giwa-staging-observability.md
  docs/implementation/giwa-staging-rollback-and-incident-drill.md
  ```
- [ ] Ensure these items are explicit:
  ```text
  requestIdCoverage=required
  readyzRedaction=required
  logDenylist=required
  metricCardinalityLimit=required
  rollbackOwner=required
  partnerCommsOwner=required
  staticFallbackSmoke=required
  exactOriginPolicy=required
  tenantFromAuthContext=required
  ```

## Task 5: Update Partner And Commercial Gates

- [ ] Update:
  ```text
  docs/implementation/giwa-staging-partner-promotion-gate.md
  docs/implementation/giwa-commercial-readiness-gate.md
  docs/implementation/giwa-partner-beta-runbook.md
  ```
- [ ] Record that hosted adapter readiness is not partner beta promotion:
  ```text
  partnerPromotion=blocked
  commercialReadiness=blocked
  protectedCI=blocked-billing-lock
  hostedAdapterReadiness=advisory
  ```

## Task 6: Update Routing Documents

- [ ] Update:
  ```text
  README.md
  docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
  ```
- [ ] Add Sprint 34 link and narrative:
  ```text
  Sprint 34 prepares the hosted adapter readiness packet under the protected-CI billing blocker. It does not implement or connect a hosted adapter, managed database, secret manager, public host, or deployment.
  ```

## Task 7: Verification

- [ ] Run local verification that does not read real env files:
  ```powershell
  powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
  powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
  pnpm test
  pnpm build
  pnpm typecheck
  node --check apps/web/public/flow.js
  node --check apps/web/public/live-flow.js
  node --check apps/web/public/demo-control-room.js
  node --check apps/web/scripts/serve-live.mjs
  node --check apps/web/scripts/serve-static.mjs
  ```
- [ ] Run documentation scans:
  ```powershell
  $docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
  $riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment")
  rg -n $docPattern README.md docs/superpowers/plans docs/implementation -g "*.md"
  rg -n $riskPattern README.md docs/superpowers/plans docs/implementation -g "*.md"
  ```

## Sprint 34 Exit Gate

Sprint 34 exits as `hosted-adapter-readiness-prepared-blocked` when:

- hosted adapter readiness record exists
- env, storage, deployment, security, observability, rollback, partner, commercial, blocker, README, and sprint index docs point to the same Sprint 34 state
- no hosted adapter, managed database, cloud secret manager, public host, deployment, wallet action, chain-operation command, dependency install, release tag, fake CI result, or protected provenance claim is introduced
- protected CI remains blocked or a later verified rerun is recorded without weakening the required checks

Sprint 34 does not exit as staging-ready unless:

- protected CI passes from the intended source commit
- protected artifact metadata exists
- hosted adapter owner, probe, migration, backup, restore, retention, auth, tenant, origin, observability, rollback, and partner gates are approved
- release approval is recorded

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-35-post-billing-protected-ci-rerun-and-artifact-handoff.md`
- `docs/superpowers/plans/2026-06-20-sprint-35-hosted-adapter-implementation-after-protected-ci.md`
- `docs/superpowers/plans/2026-06-20-sprint-35-staging-deployment-dry-run-after-protected-ci.md`

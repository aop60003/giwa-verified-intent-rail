# Sprint 33 Staging Dry-Run Preparation Under Billing Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging for GitHub Actions and release-gate evidence, and superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the staging dry-run evidence package that can be executed after GitHub billing is resolved, without public hosting, deployment, managed infrastructure, or protected-CI provenance claims.

**Architecture:** Sprint 33 is a no-deploy staging readiness sprint. It keeps the GitHub billing lock as the active external blocker, turns host/runtime/storage/security/rollback requirements into a dry-run packet, and prevents local-advisory or failing GitHub evidence from being promoted to release authority.

**Tech Stack:** GitHub Actions, GitHub CLI, PowerShell, pnpm workspace checks, local static fallback, local live MVP, staging readiness documents.

---

## Current State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=public
defaultBranch=main
branchProtected=true
branchProtectionEnforceAdmins=false
requiredChecks=source-provenance,workflow-command-boundary,web-checks,protocol-checks,contracts-checks,node-syntax-checks,safe-scans,workspace-checks,artifact-provenance,protected-ci-gate
latestProtectedRunId=27849769064
latestProtectedRunHeadSha=d8b8f36874a35c2c290a3a1055c0ba9f23b30a03
latestProtectedRunConclusion=failure
latestProtectedRunAnnotation=account-locked-due-to-billing
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
releaseApproval=blocked
stagingPromotion=blocked
```

## Non-Goals

Sprint 33 does not:

- resolve GitHub billing from inside this repository
- public-host or deploy the app
- connect production, managed, or cloud infrastructure
- read or print local env-file values
- output credential values
- send wallet transactions from browser, server, or scripts
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- create release tags
- claim protected CI, protected artifact, or release-grade provenance until GitHub required checks pass

## Parallel Review Perspectives

Sprint 33 should incorporate these independent review lenses before exit:

| Perspective | Required finding in the Sprint 33 packet |
| --- | --- |
| Deployment target and runtime boundary | staging host remains unbound; localhost rehearsal is advisory only |
| Hosted adapter readiness | adapter selection is blocked until protected CI and host approval exist |
| CI and release provenance | failing/billing-locked checks cannot satisfy release authority |
| Branch protection and billing gate | branch policy stays configured, but checks remain red |
| Env contract and redacted readiness | variable names and readiness states are documented without values |
| Storage and restore | local SQLite cannot substitute for approved staging storage and restore drill |
| Observability and rollback | `/healthz`, `/readyz`, logs, static fallback, and owner routing are required before dry run |
| Security, tenant, and partner gate | auth, tenant, rate-limit, receipt access, and beta closeout remain go/no-go gates |

## Task 1: Confirm Billing-Lock Baseline

- [ ] Read the latest protected workflow state without changing source:
  ```powershell
  gh run list --repo aop60003/giwa-verified-intent-rail --limit 3 --json databaseId,headSha,status,conclusion,name,event,createdAt,updatedAt
  gh run view 27849769064 --repo aop60003/giwa-verified-intent-rail --json databaseId,workflowName,status,conclusion,jobs,url,headSha,event
  ```
- [ ] Expected result:
  ```text
  latest protected run remains failure
  first protected job is not started because of GitHub account billing
  branch protection remains configured but cannot be satisfied
  ```

## Task 2: Create the Staging Dry-Run Preparation Record

- [ ] Create:
  ```text
  docs/implementation/giwa-staging-dry-run-preparation-under-billing-lock.md
  ```
- [ ] Include the exact dry-run opening order:
  ```text
  1. Read staging blocker register
  2. Confirm protected CI state
  3. Confirm local static fallback
  4. Confirm local live rehearsal packet
  5. Confirm host/runtime/storage/security/rollback gates
  6. Stop before public hosting or deployment
  ```
- [ ] Include the dry-run go/no-go matrix:
  ```text
  protectedCI=blocked-billing-lock -> no-go
  protectedArtifactGeneration=blocked -> no-go
  releaseApproval=blocked -> no-go
  stagingHost=unapproved -> no-go
  durableStorage=absent -> no-go
  rollbackOwner=absent -> no-go
  staticFallback=required -> advisory-check-only
  ```

## Task 3: Update Routing Documents

- [ ] Update:
  ```text
  README.md
  docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
  ```
- [ ] Add Sprint 33 links and status:
  ```text
  Sprint 33 prepares the staging dry-run packet under the GitHub billing lock. It keeps staging promotion blocked, records required host/runtime/storage/security/rollback evidence, and defines the post-billing handoff without deploying or claiming protected CI.
  ```

## Task 4: Update Staging Gate Documents

- [ ] Update:
  ```text
  docs/implementation/giwa-staging-blocker-register.md
  docs/implementation/giwa-staging-deployment-preparation.md
  docs/implementation/giwa-staging-release-provenance.md
  docs/implementation/giwa-staging-env-contract.md
  docs/implementation/giwa-staging-storage-and-restore.md
  docs/implementation/giwa-staging-observability.md
  docs/implementation/giwa-staging-rollback-and-incident-drill.md
  docs/implementation/giwa-staging-security-boundary.md
  docs/implementation/giwa-staging-partner-promotion-gate.md
  docs/implementation/giwa-commercial-readiness-gate.md
  docs/implementation/giwa-partner-beta-runbook.md
  ```
- [ ] Record:
  ```text
  stagingDryRunPreparation=ready-for-post-billing-review
  stagingDryRunExecution=blocked-protected-ci
  protectedArtifactUpload=blocked
  publicHosting=blocked
  deployment=blocked
  ```
- [ ] Confirm every gate keeps local static and live checks advisory until protected CI passes.

## Task 5: Local Advisory Verification

- [ ] Run safe scans without reading real env files:
  ```powershell
  powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
  powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
  ```
- [ ] Run workspace checks:
  ```powershell
  pnpm test
  pnpm build
  pnpm typecheck
  ```
- [ ] Run syntax checks:
  ```powershell
  node --check apps/web/public/flow.js
  node --check apps/web/public/live-flow.js
  node --check apps/web/public/demo-control-room.js
  node --check apps/web/scripts/serve-live.mjs
  node --check apps/web/scripts/serve-static.mjs
  ```

## Task 6: GitHub Boundary Verification

- [ ] Verify branch protection state:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/branches/main/protection --jq '{required_status_checks:.required_status_checks.contexts,enforce_admins:.enforce_admins.enabled}'
  ```
- [ ] Verify latest run still cannot authorize staging:
  ```powershell
  gh run list --repo aop60003/giwa-verified-intent-rail --limit 1 --json databaseId,headSha,status,conclusion,name
  ```
- [ ] Expected result:
  ```text
  required check names remain configured
  latest run is not a passing protected CI authority
  staging remains blocked
  ```

## Sprint 33 Exit Gate

Sprint 33 exits as `staging-dry-run-prepared-blocked` when:

- the staging dry-run packet exists
- README, sprint index, blocker register, deployment preparation, and release provenance documents point to the same Sprint 33 state
- protected CI remains blocked by GitHub billing or passes only after a later verified rerun
- local advisory checks pass or failures are documented without claiming staging readiness
- no public hosting, deployment, managed infrastructure, wallet action, chain-operation command, dependency install, release tag, fake CI result, or protected provenance claim is introduced

Sprint 33 does not exit as staging-ready unless:

- the GitHub billing lock has been resolved outside the repository
- all required checks pass from the intended source commit
- protected artifact generation and upload metadata exist
- host/runtime/storage/security/rollback/partner gates are approved
- release approval is recorded

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-34-post-billing-protected-ci-rerun-and-artifact-handoff.md`
- `docs/superpowers/plans/2026-06-20-sprint-34-hosted-adapter-readiness.md`
- `docs/superpowers/plans/2026-06-20-sprint-34-staging-deployment-dry-run-after-protected-ci.md`

# Sprint 32 GitHub Billing Lock and Protected CI Rerun Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging for GitHub Actions evidence and superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare the exact post-billing-lock recovery path for protected CI, branch policy verification, and release provenance without changing application deployment state.

**Architecture:** Sprint 32 treats GitHub account billing as an external gate. Repository source visibility, branch protection, workflow definitions, and required check contexts already exist; this sprint records the blocker, defines the rerun procedure after billing is resolved, and prevents local-advisory or failing GitHub checks from being treated as release authority.

**Tech Stack:** GitHub Actions, GitHub CLI, PowerShell, pnpm workspace checks, local-advisory provenance scripts.

---

## Current State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=public
defaultBranch=main
latestSourceCommit=7858b34cbac7d7141254b03051c4516048225de1
branchProtected=true
branchProtectionEnforceAdmins=false
requiredChecks=source-provenance,workflow-command-boundary,web-checks,protocol-checks,contracts-checks,node-syntax-checks,safe-scans,workspace-checks,artifact-provenance,protected-ci-gate
latestProtectedRunId=27849499574
latestProtectedRunConclusion=failure
latestProtectedRunFirstJob=source-provenance
latestProtectedRunAnnotation=The job was not started because your account is locked due to a billing issue.
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
releaseApproval=blocked
stagingPromotion=blocked
```

## Non-Goals

Sprint 32 does not:

- resolve account billing from inside the repository
- read or print `.env` or `.env.local` contents
- output credential values
- public-host or deploy the app
- connect production, managed, or cloud infrastructure
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint
- install dependencies
- create release tags
- claim protected CI or release-grade provenance until GitHub checks actually pass

## Task 1: Record Billing-Lock Evidence

- [ ] Confirm the latest protected workflow run still fails because of billing lock.
  ```powershell
  gh run view 27849499574 --repo aop60003/giwa-verified-intent-rail --json databaseId,workflowName,status,conclusion,jobs,url,headSha,event
  $jobs = gh run view 27849499574 --repo aop60003/giwa-verified-intent-rail --json jobs | ConvertFrom-Json
  $first = $jobs.jobs | Where-Object { $_.name -eq 'source-provenance' } | Select-Object -First 1
  gh api "repos/aop60003/giwa-verified-intent-rail/check-runs/$($first.databaseId)/annotations"
  ```
  Expected result: first job annotation says the account is locked due to a billing issue.

## Task 2: Post-Billing Rerun Procedure

- [ ] After the GitHub billing lock is resolved outside the repository, rerun the protected workflow without changing source:
  ```powershell
  gh run rerun 27849499574 --repo aop60003/giwa-verified-intent-rail
  gh run watch 27849499574 --repo aop60003/giwa-verified-intent-rail --exit-status
  ```
- [ ] If rerun is unavailable or the previous run remains locked to a stale attempt, dispatch the workflow at the current `main` ref:
  ```powershell
  gh workflow run ci.yml --repo aop60003/giwa-verified-intent-rail --ref main
  gh run list --repo aop60003/giwa-verified-intent-rail --workflow ci.yml --limit 5 --json databaseId,status,conclusion,headSha,url
  ```
- [ ] Expected result after billing is resolved:
  ```text
  source-provenance=success
  workflow-command-boundary=success
  web-checks=success
  protocol-checks=success
  contracts-checks=success
  node-syntax-checks=success
  safe-scans=success
  workspace-checks=success
  artifact-provenance=success
  protected-ci-gate=success
  ```

## Task 3: Protected Artifact Handoff Gate

- [ ] If all required checks pass, inspect `artifact-provenance` logs and artifacts.
  ```powershell
  gh run view <passing-run-id> --repo aop60003/giwa-verified-intent-rail --json databaseId,workflowName,status,conclusion,jobs,artifacts,url,headSha
  gh run download <passing-run-id> --repo aop60003/giwa-verified-intent-rail --dir .gh-artifacts\protected-ci
  ```
- [ ] If no protected artifact upload exists, keep protected artifact generation blocked and plan a separate protected artifact upload sprint.
- [ ] If protected artifact upload exists, record file names, byte counts, SHA-256 hashes, retention, run id, and source commit in staging-named evidence.

## Task 4: Branch Policy Verification

- [ ] Verify branch protection still requires the canonical check names:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/branches/main/protection --jq '{required_status_checks:.required_status_checks.contexts,enforce_admins:.enforce_admins.enabled}'
  ```
- [ ] Verify `main` points to the intended source commit:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/branches/main --jq '{name:.name,protected:.protected,commit:.commit.sha}'
  ```
- [ ] If a push bypass occurs, record it as admin bypass evidence and do not treat that push as protected merge evidence.

## Task 5: Documentation Updates

- [ ] Update:
  ```text
  README.md
  docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
  docs/implementation/giwa-github-actions-startup-failure-triage.md
  docs/implementation/giwa-staging-blocker-register.md
  docs/implementation/giwa-staging-release-provenance.md
  docs/implementation/giwa-protected-ci-run-and-release-provenance.md
  docs/implementation/giwa-release-approval-checklist.md
  docs/implementation/giwa-branch-protection-approval.md
  ```
- [ ] Record one of these terminal states:
  ```text
  billingLockStillOpen
  billingResolvedProtectedCiPassed
  billingResolvedProtectedCiFailedWithCommand
  billingResolvedProtectedCiFailedWithArtifactGate
  ```

## Task 6: Verification

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

## Sprint 32 Exit Gate

Sprint 32 exits as `blocked-billing-lock` when:

- current GitHub evidence still shows the account billing lock
- repository remains public
- branch protection remains configured with canonical checks
- protected CI and staging promotion remain blocked
- blocker register and release docs reflect the billing gate

Sprint 32 exits as `protected-ci-passed` only when:

- all required GitHub checks pass on the intended source commit
- branch protection is still configured
- no admin bypass is used as protected merge evidence
- artifact/provenance handoff is recorded or explicitly blocked for a later sprint

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-33-protected-artifact-upload-and-release-evidence.md`
- `docs/superpowers/plans/2026-06-20-sprint-33-github-billing-unlock-rerun.md`
- `docs/superpowers/plans/2026-06-20-sprint-33-staging-deployment-dry-run-preparation.md`

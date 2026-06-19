# Sprint 37 Protected CI Dispatch After Reported Billing Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging for GitHub Actions evidence and superpowers:verification-before-completion before reporting success. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dispatch `ci-source-provenance` on current `main` after the user reports the GitHub billing/account gate is unlocked, collect all required-check outcomes, collect Actions artifact metadata, and update staging dry-run blockers without claiming protected provenance unless the checks actually pass.

**Architecture:** Sprint 37 is an evidence-bound protected-CI dispatch sprint. It is allowed to execute the workflow dispatch because billing unlock was reported by the user, but the dispatch result is authoritative only for what GitHub reports. If GitHub still returns an account billing annotation, the sprint exits as blocked and records the failed dispatch as non-release evidence.

**Tech Stack:** GitHub CLI, GitHub Actions, branch protection API, markdown handoff records, evidence JSON, PowerShell local verification, pnpm workspace verification.

---

## Current State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=public
currentMainHead=b769003e733a83faa70b57b4c0bda6ac26821044
currentMainCommitMessage=docs: record sprint 36 ci unlock blocker [skip ci]
branchProtected=true
requiredChecks=10
latestPriorRealActionsRunId=27850867132
latestPriorRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestPriorRealActionsRunConclusion=failure
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
```

## Non-Goals

Sprint 37 does not:

- resolve account billing from inside this repository
- weaken branch protection or remove required checks
- public-host or deploy
- connect managed infrastructure
- read or print local env-file values
- output credential values
- send wallet transactions
- run GIWA chain-operation commands
- install dependencies
- create release tags
- create fake CI results, fake release hashes, or fake artifact metadata
- claim protected CI, protected artifact handoff, staging execution, or release-grade provenance before checks pass on the intended source commit

## Parallel Review Findings

| Perspective | Sprint 37 finding |
| --- | --- |
| Billing unlock gate | user reported unlock, so dispatch is allowed; GitHub remains the authority for whether the gate is actually cleared |
| Source binding | dispatch must target `main` and bind the resulting run to `b769003e733a83faa70b57b4c0bda6ac26821044` |
| Required checks | branch protection still requires the ten canonical workflow job contexts |
| Job failure routing | if `source-provenance` fails before runner steps, downstream skipped jobs cannot be counted as protected CI |
| Artifact handoff | Actions artifacts API must be inspected; zero artifacts keeps protected artifact upload blocked |
| Local-advisory boundary | local artifacts can support review only and cannot substitute for protected CI output |
| Staging dry-run | staging remains no-go unless required checks pass and protected artifact metadata exists |
| Handoff records | blocker register, release provenance, branch protection, release approval, hosted adapter, and partner promotion documents must all agree on the same run id and decision |

## Task 1: Confirm Source And Branch Policy

- [ ] Confirm local source state:
  ```powershell
  git status --short
  git log --oneline -5
  ```
- [ ] Confirm protected branch policy:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/branches/main --jq '{protected: .protected, sha: .commit.sha, required_contexts: .protection.required_status_checks.contexts}'
  ```
  Expected:
  ```text
  protected=true
  sha=b769003e733a83faa70b57b4c0bda6ac26821044
  required_contexts contains exactly the ten canonical checks
  ```

## Task 2: Dispatch Protected Workflow

- [ ] Dispatch after reported unlock:
  ```powershell
  gh workflow run ci.yml --repo aop60003/giwa-verified-intent-rail --ref main
  ```
- [ ] Identify the new run:
  ```powershell
  gh run list --repo aop60003/giwa-verified-intent-rail --workflow ci.yml --limit 5 --json databaseId,status,conclusion,headSha,url,createdAt,event
  ```
- [ ] Watch the run:
  ```powershell
  gh run watch <run-id> --repo aop60003/giwa-verified-intent-rail --exit-status
  ```

## Task 3: Collect Required-Check Results

- [ ] Collect run details:
  ```powershell
  gh run view <run-id> --repo aop60003/giwa-verified-intent-rail --json databaseId,workflowName,event,headSha,status,conclusion,createdAt,updatedAt,url,jobs
  ```
- [ ] Collect commit check runs:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/commits/b769003e733a83faa70b57b4c0bda6ac26821044/check-runs --jq '{total_count, check_runs: [.check_runs[] | {name, conclusion, status, html_url}]}'
  ```
- [ ] If the first job fails before runner steps, collect check-run annotations:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/check-runs/<source-provenance-check-run-id>/annotations
  ```

## Task 4: Collect Artifact Metadata

- [ ] Inspect Actions artifacts:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/actions/runs/<run-id>/artifacts --jq '{total_count, artifacts: [.artifacts[] | {name, size_in_bytes, expired, created_at}]}'
  ```
- [ ] If `total_count=0`, record:
  ```text
  protectedArtifactGeneration=blocked
  protectedArtifactUpload=blocked-no-artifacts
  releaseApproval=blocked
  ```

## Task 5: Update Handoff Records

- [ ] Create:
  ```text
  docs/implementation/giwa-protected-ci-dispatch-after-reported-billing-unlock.md
  docs/evidence/protected-ci-sprint37-dispatch-failure.json
  ```
- [ ] Update:
  ```text
  README.md
  docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
  docs/implementation/giwa-staging-blocker-register.md
  docs/implementation/giwa-staging-release-provenance.md
  docs/implementation/giwa-protected-ci-run-and-release-provenance.md
  docs/implementation/giwa-release-approval-checklist.md
  docs/implementation/giwa-branch-protection-approval.md
  docs/implementation/giwa-staging-dry-run-preparation-under-billing-lock.md
  docs/implementation/giwa-hosted-adapter-readiness.md
  docs/implementation/giwa-staging-partner-promotion-gate.md
  ```

## Task 6: Verification

- [ ] Run local verification without reading real env files:
  ```powershell
  powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
  powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
  pnpm test
  pnpm build
  pnpm typecheck
  pnpm --filter @giwa/web --fail-if-no-match artifact:local
  pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
  pnpm --filter @giwa/web --fail-if-no-match artifact:scan
  node --check apps/web/public/flow.js
  node --check apps/web/public/live-flow.js
  node --check apps/web/public/demo-control-room.js
  node --check apps/web/scripts/serve-live.mjs
  node --check apps/web/scripts/serve-static.mjs
  ```

## Sprint 37 Exit Gate

Sprint 37 exits as `blocked-billing-lock-after-dispatch` when:

- workflow dispatch executed on `main`
- run `headSha` matches `b769003e733a83faa70b57b4c0bda6ac26821044`
- `source-provenance` fails before runner steps with the account billing annotation
- downstream required jobs are skipped
- Actions artifacts total `0`
- protected CI, protected artifact handoff, release approval, staging dry-run execution, hosted adapter implementation, partner promotion, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, dependency installation, release tags, and protected provenance claims remain blocked

Sprint 37 exits as `protected-ci-passed` only if all ten required checks pass on current `main` and protected artifact metadata exists.

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-38-billing-unlock-retry-after-github-account-clearance.md`
- `docs/superpowers/plans/2026-06-20-sprint-38-protected-artifact-upload-after-ci-pass.md`
- `docs/superpowers/plans/2026-06-20-sprint-38-staging-dry-run-readiness-after-protected-ci.md`

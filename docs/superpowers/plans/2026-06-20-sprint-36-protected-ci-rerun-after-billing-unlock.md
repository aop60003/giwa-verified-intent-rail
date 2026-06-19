# Sprint 36 Protected CI Rerun After Billing Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging for GitHub Actions evidence and superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify whether GitHub billing/account unlock has occurred, then either rerun protected CI on the current `main` commit or record a precise blocked handoff without claiming protected provenance.

**Architecture:** Sprint 36 is a gated protected-CI execution sprint. It first performs read-only GitHub state checks, then stops if billing unlock is not evidenced. Only after unlock is externally confirmed may it dispatch or rerun the workflow on the current `main` commit, verify all ten required checks, inspect Actions artifacts, and update staging readiness handoff records.

**Tech Stack:** GitHub CLI read-only checks, GitHub Actions, branch protection API, PowerShell, pnpm workspace verification, local-advisory artifact/provenance scripts, markdown/evidence JSON records.

---

## Current State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
currentMainHead=30eddb3da26ca6cf8302d1396bd8f5fbe61759c1
currentMainCommitMessage=docs: record sprint 35 ci blocker handoff [skip ci]
latestRealActionsRunId=27850867132
latestRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestRealActionsRunConclusion=failure
latestRealActionsRunFirstJob=source-provenance
latestRealActionsRunDownstreamJobs=9-skipped
latestRealActionsRunLog=not-found
latestRealActionsRunArtifactTotalCount=0
rootCauseClass=github-account-billing-lock
billingUnlockConfirmed=false
noActionsRunForCurrentMain=true
currentMainCheckRuns=0
rerunAllowed=false
rerunExecuted=false
workflowDispatchExecuted=false
sourceBinding=blocked-no-run-for-current-main
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
protectedArtifactUploadImplemented=false
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
hostedAdapterImplementation=blocked
partnerPromotion=blocked
```

## Non-Goals

Sprint 36 does not:

- resolve GitHub billing from inside this repository
- rerun or dispatch GitHub Actions while billing unlock is not evidenced
- treat a `[skip ci]` direct push as protected CI evidence
- treat an old run on `779b63878b37c3b4f3792dd67718ea5bb3e9d92b` as evidence for current `main`
- weaken branch protection or remove required checks
- public-host or deploy
- connect production, managed, or cloud infrastructure
- read or print local env-file values
- output credential values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- create release tags
- create fake CI results, fake release hashes, or fake artifact metadata
- claim protected CI, protected artifact, staging execution, or release-grade provenance before checks pass on the intended source commit

## Parallel Review Findings

| Perspective | Sprint 36 finding |
| --- | --- |
| Billing unlock gate | unlock is not evidenced; the latest first job remains account-billing locked and logs are unavailable |
| Source binding | current `main` is `30eddb3...`; latest real run is on `779b638...`; no run exists for current head |
| Required checks | branch protection still requires the ten canonical check contexts |
| Artifact handoff | current workflow has no protected artifact upload step and latest run artifacts total `0` |
| Local-advisory boundary | local evidence can verify repository state only; it cannot unblock staging |
| Branch protection/admin bypass | branch protection is configured, but direct `[skip ci]` pushes are not protected merge evidence |
| Staging readiness | staging dry-run execution stays blocked until protected CI and protected artifact metadata exist |
| Hosted adapter and partner handoff | hosted adapter implementation and partner promotion remain blocked until release gates close |

## Task 1: Read-Only GitHub State Check

- [ ] Confirm local and remote source state:
  ```powershell
  git status --short
  git log --oneline -5
  gh api repos/aop60003/giwa-verified-intent-rail/branches/main --jq '{protected: .protected, sha: .commit.sha, required_contexts: .protection.required_status_checks.contexts}'
  ```
  Expected while blocked:
  ```text
  branch protected is true
  current main commit is recorded
  required_contexts contains exactly ten checks
  ```

- [ ] Confirm latest Actions state without rerun:
  ```powershell
  gh run list --repo aop60003/giwa-verified-intent-rail --limit 5 --json databaseId,workflowName,status,conclusion,headSha,event,createdAt,url
  gh run view 27850867132 --repo aop60003/giwa-verified-intent-rail --json databaseId,workflowName,status,conclusion,jobs,url,headSha,event,createdAt,updatedAt
  gh api repos/aop60003/giwa-verified-intent-rail/actions/runs/27850867132/artifacts --jq '{total_count, artifacts: [.artifacts[] | {name, size_in_bytes, expired, created_at}]}'
  ```
  Expected while blocked:
  ```text
  latest real Actions run remains failure on old head
  source-provenance is failure
  downstream nine required jobs are skipped
  artifact total_count is 0
  ```

- [ ] Confirm current `main` has no protected CI authority:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/commits/30eddb3da26ca6cf8302d1396bd8f5fbe61759c1/check-runs --jq '.total_count'
  ```
  Expected while blocked:
  ```text
  0
  ```

## Task 2: Billing Unlock Decision Gate

- [ ] If billing unlock is not externally evidenced, do not run:
  ```powershell
  gh run rerun 27850867132 --repo aop60003/giwa-verified-intent-rail
  gh workflow run ci.yml --repo aop60003/giwa-verified-intent-rail --ref main
  ```
- [ ] Record blocked terminal state:
  ```text
  billingUnlockConfirmed=false
  rerunAllowed=false
  rerunExecuted=false
  workflowDispatchExecuted=false
  protectedCI=blocked-billing-lock
  ```
- [ ] If billing unlock is externally confirmed in a later sprint, dispatch against current `main` rather than rerunning stale run evidence:
  ```powershell
  gh workflow run ci.yml --repo aop60003/giwa-verified-intent-rail --ref main
  gh run list --repo aop60003/giwa-verified-intent-rail --workflow ci.yml --limit 5 --json databaseId,status,conclusion,headSha,url,createdAt
  gh run watch <new-run-id> --repo aop60003/giwa-verified-intent-rail --exit-status
  ```
  Expected after unlock:
  ```text
  new run headSha equals current main commit
  all ten required checks pass
  ```

## Task 3: Sprint 36 Blocked Handoff Record

- [ ] Create:
  ```text
  docs/implementation/giwa-protected-ci-rerun-after-billing-unlock.md
  docs/evidence/protected-ci-sprint36-blocked-handoff.json
  ```
- [ ] Record:
  ```text
  currentMainHead=30eddb3da26ca6cf8302d1396bd8f5fbe61759c1
  latestRealActionsRunId=27850867132
  latestRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
  billingUnlockConfirmed=false
  rerunAllowed=false
  rerunExecuted=false
  workflowDispatchExecuted=false
  sourceBinding=blocked-no-run-for-current-main
  protectedCI=blocked-billing-lock
  protectedArtifactUploadImplemented=false
  latestRealActionsRunArtifactTotalCount=0
  releaseApproval=blocked
  ```

## Task 4: Protected Artifact Handoff Gate

- [ ] Keep protected handoff blocked until a passing protected CI run exposes staging-named artifact metadata:
  ```text
  docs/evidence/giwa-staging-artifact-manifest.json
  docs/evidence/giwa-staging-provenance-report.json
  docs/evidence/giwa-staging-provenance-report.json.sha256
  docs/evidence/giwa-staging-artifact-upload-metadata.json
  ```
- [ ] Required metadata after a successful protected run:
  ```text
  authority=protected-ci
  workflowPath=.github/workflows/ci.yml
  workflowRunId=<passing-run-id>
  sourceCommit=<current-main-head>
  artifactName=<github-artifact-name>
  retentionDays=<github-retention>
  manifestSha256=<computed-from-protected-artifact>
  provenanceReportSha256=<computed-from-protected-artifact>
  verificationDecision=pass
  ```
- [ ] If checks pass but the Actions artifacts API returns zero artifacts, exit as:
  ```text
  protectedCI=passed
  protectedArtifactUpload=blocked-no-artifacts
  releaseApproval=blocked
  ```

## Task 5: Update Routing And Blocker Documents

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
- [ ] Preserve:
  ```text
  stagingDryRunExecution=blocked-protected-ci
  hostedAdapterImplementation=blocked
  managedDatabaseConnection=blocked
  cloudSecretManagerConnection=blocked
  partnerPromotion=blocked
  publicHosting=blocked
  deployment=blocked
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
- [ ] Run documentation scans:
  ```powershell
  $docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
  $riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment")
  rg -n $docPattern README.md docs/superpowers/plans docs/implementation -g "*.md"
  rg -n $riskPattern README.md docs/superpowers/plans docs/implementation -g "*.md"
  ```

## Sprint 36 Exit Gate

Sprint 36 exits as `blocked-billing-lock` when:

- billing unlock is not evidenced
- no workflow rerun or dispatch is executed
- current `main` has no protected CI run
- latest real Actions run remains on an old commit
- protected artifacts remain absent
- local-advisory outputs remain separated from protected CI provenance
- staging dry-run execution, hosted adapter implementation, partner promotion, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, dependency install, release tags, and protected provenance claims remain blocked

Sprint 36 exits as `protected-ci-rerun-executed` only when:

- billing unlock is externally evidenced
- protected workflow dispatch or rerun targets current `main`
- all ten required checks complete
- run id, run URL, head SHA, check conclusions, and artifact listing are recorded

Sprint 36 does not exit as staging-ready unless:

- all ten required checks pass on the current `main` source commit
- protected artifact metadata exists
- branch protection still requires the canonical checks
- release owner and rollback owner approval are recorded
- staging dry-run, hosted adapter, partner, storage, security, observability, and rollback gates are green

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-37-github-billing-unlock-watch-and-current-main-ci-dispatch.md`
- `docs/superpowers/plans/2026-06-20-sprint-37-protected-artifact-upload-after-ci-pass.md`
- `docs/superpowers/plans/2026-06-20-sprint-37-staging-dry-run-readiness-after-protected-ci.md`
- `docs/superpowers/plans/2026-06-20-sprint-37-hosted-adapter-implementation-after-protected-ci.md`

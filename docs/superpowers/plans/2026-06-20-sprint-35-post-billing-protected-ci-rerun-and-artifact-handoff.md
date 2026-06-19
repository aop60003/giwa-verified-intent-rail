# Sprint 35 Post-Billing Protected CI Rerun and Artifact Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging for GitHub Actions evidence and superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define and gate the protected CI rerun and artifact handoff procedure after GitHub billing is resolved, while recording the current blocked state without pretending protected provenance exists.

**Architecture:** Sprint 35 is a rerun-readiness and blocked-handoff sprint unless billing unlock is externally confirmed. It binds any future protected CI rerun to the intended `main` source commit, verifies all ten required checks, separates protected artifact metadata from local-advisory evidence, and keeps staging dry-run, hosted adapter implementation, partner beta traffic, public hosting, deployment, managed infrastructure, wallet actions, and chain-operation commands blocked while checks fail or remain unrunnable.

**Tech Stack:** GitHub Actions, GitHub CLI read-only checks, PowerShell, pnpm workspace verification, local-advisory artifact/provenance scripts, staging readiness markdown records.

---

## Current State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
currentMainHead=11587e18caae0c73bf0ac61ef8f6e096655f8cac
latestRealActionsRunId=27850867132
latestRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestRealActionsRunConclusion=failure
latestRealActionsRunFirstJob=source-provenance
latestRealActionsRunDownstreamJobs=9-skipped
latestRealActionsRunLog=not-found
rootCauseClass=github-account-billing-lock
noActionsRunForCurrentMain=true
currentMainCommitSkippedCI=true
protectedArtifactUploadImplemented=false
branchProtected=true
requiredChecks=source-provenance,workflow-command-boundary,web-checks,protocol-checks,contracts-checks,node-syntax-checks,safe-scans,workspace-checks,artifact-provenance,protected-ci-gate
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
hostedAdapterImplementation=blocked
partnerPromotion=blocked
```

## Non-Goals

Sprint 35 does not:

- resolve GitHub billing from inside this repository
- rerun or dispatch the protected workflow before billing unlock is confirmed
- weaken branch protection or remove required checks
- treat an admin-bypassed direct push as protected merge evidence
- public-host or deploy the app
- connect production, managed, or cloud infrastructure
- read or print local env-file values
- output credential values
- send wallet transactions from browser, server, or scripts
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- create release tags
- create fake CI results, fake release hashes, or fake artifact metadata
- claim protected CI, protected artifact, staging execution, or release-grade provenance while checks fail or remain unrunnable

## Parallel Review Perspectives

Sprint 35 must incorporate these review lenses before exit:

| Perspective | Required finding in the Sprint 35 packet |
| --- | --- |
| Billing unlock and rerun no-go | no rerun occurs unless billing unlock is externally confirmed |
| Source binding | any rerun must target intended `main` head and record head SHA |
| Required checks | all ten canonical check names must pass before artifact handoff |
| Artifact/provenance handoff | protected artifact metadata is required and separate from local-advisory files |
| Provenance schema drift | workflow path and required-check schema must match `.github/workflows/ci.yml` and all ten canonical checks |
| Branch protection/admin bypass | branch protection is configured but bypass pushes are not protected evidence |
| Staging dry-run readiness | dry-run execution remains blocked while protected CI or artifact metadata is absent |
| Hosted adapter readiness | readiness stays advisory; implementation and infrastructure remain blocked |
| Partner/commercial handoff | partner traffic and commercial readiness remain blocked until blocker register closes |

## Task 1: Read-Only Billing And CI State Check

- [ ] Confirm current local and remote source:
  ```powershell
  git status --short
  git log --oneline -5
  gh api repos/aop60003/giwa-verified-intent-rail/branches/main --jq '{name:.name,protected:.protected,commit:.commit.sha}'
  ```
  Expected result:
  ```text
  working tree clean
  remote main commit is recorded
  branch protected is true
  ```
- [ ] Confirm latest Actions state without rerun:
  ```powershell
  gh run list --repo aop60003/giwa-verified-intent-rail --limit 5 --json databaseId,headSha,status,conclusion,name,event,createdAt,updatedAt
  gh run view 27850867132 --repo aop60003/giwa-verified-intent-rail --json databaseId,workflowName,status,conclusion,jobs,url,headSha,event
  ```
  Expected result while billing is still blocked:
  ```text
  no passing protected run exists for current main
  latest real run remains failure
  downstream required jobs remain skipped
  ```

## Task 2: Rerun Decision Gate

- [ ] If billing unlock is not externally confirmed, do not run:
  ```powershell
  gh run rerun <run-id>
  gh workflow run ci.yml --repo aop60003/giwa-verified-intent-rail --ref main
  ```
- [ ] Record terminal state:
  ```text
  billingUnlockConfirmed=false
  rerunExecuted=false
  noActionsRunForCurrentMain=true
  currentMainCommitSkippedCI=true
  protectedCI=blocked-billing-lock
  protectedArtifactGeneration=blocked
  protectedArtifactUploadImplemented=false
  releaseApproval=blocked
  ```
- [ ] If billing unlock is externally confirmed in a later sprint, only then run one of:
  ```powershell
  gh run rerun <latest-protected-run-id> --repo aop60003/giwa-verified-intent-rail
  gh workflow run ci.yml --repo aop60003/giwa-verified-intent-rail --ref main
  ```
  Expected result after unlock:
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

## Task 3: Protected Artifact Handoff Contract

- [ ] Create:
  ```text
  docs/implementation/giwa-post-billing-protected-ci-rerun-and-artifact-handoff.md
  ```
- [ ] Record current blocked handoff:
  ```text
  currentMainHead=11587e18caae0c73bf0ac61ef8f6e096655f8cac
  latestRealActionsRunId=27850867132
  latestRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
  billingUnlockConfirmed=false
  rerunExecuted=false
  protectedCI=blocked-billing-lock
  protectedArtifactGeneration=blocked
  protectedArtifactUpload=blocked
  protectedArtifactUploadImplemented=false
  latestRealActionsRunArtifactTotalCount=0
  ```
- [ ] Define protected handoff evidence that a later sprint must collect:
  ```text
  docs/evidence/giwa-staging-artifact-manifest.json
  docs/evidence/giwa-staging-provenance-report.json
  docs/evidence/giwa-staging-provenance-report.json.sha256
  docs/evidence/giwa-staging-artifact-upload-metadata.json
  ```
- [ ] Confirm the provenance artifact manifest schema uses:
  ```text
  workflowPath=.github/workflows/ci.yml
  requiredChecks=10
  includes=artifact-provenance,protected-ci-gate
  ```
- [ ] Use the GitHub Actions artifacts API for read-only artifact listing:
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail/actions/runs/<run-id>/artifacts
  ```
- [ ] If all checks pass but artifact count is zero, exit as:
  ```text
  protectedCI=passed
  protectedArtifactUpload=blocked-no-artifacts
  releaseApproval=blocked
  ```

## Task 4: Update Release And Blocker Documents

- [ ] Update:
  ```text
  docs/implementation/giwa-staging-blocker-register.md
  docs/implementation/giwa-staging-release-provenance.md
  docs/implementation/giwa-protected-ci-run-and-release-provenance.md
  docs/implementation/giwa-release-approval-checklist.md
  docs/implementation/giwa-branch-protection-approval.md
  docs/implementation/giwa-provenance-artifact-manifest.md
  docs/evidence/protected-ci-sprint35-blocked-handoff.json
  ```
- [ ] Record:
  ```text
  sprint35Status=blocked-billing-lock
  billingUnlockConfirmed=false
  rerunExecuted=false
  protectedCI=blocked-billing-lock
  requiredChecks=configured-not-passing
  currentMainHead=11587e18caae0c73bf0ac61ef8f6e096655f8cac
  latestRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
  noActionsRunForCurrentMain=true
  currentMainCommitSkippedCI=true
  sourceBinding=blocked-no-run-for-current-main
  ```

## Task 5: Update Staging, Hosted Adapter, And Partner Handoff Documents

- [ ] Update:
  ```text
  docs/implementation/giwa-staging-dry-run-preparation-under-billing-lock.md
  docs/implementation/giwa-hosted-adapter-readiness.md
  docs/implementation/giwa-staging-partner-promotion-gate.md
  docs/implementation/giwa-commercial-readiness-gate.md
  ```
- [ ] Preserve blocked decisions:
  ```text
  stagingDryRunExecution=blocked-protected-ci
  hostedAdapterImplementation=blocked
  managedDatabaseConnection=blocked
  cloudSecretManagerConnection=blocked
  partnerPromotion=blocked
  commercialReadiness=blocked
  ```

## Task 6: Update Routing Documents

- [ ] Update:
  ```text
  README.md
  docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
  ```
- [ ] Add Sprint 35 link and narrative:
  ```text
  Sprint 35 records the post-billing protected CI rerun and artifact handoff plan. Billing unlock is not confirmed, so the workflow is not rerun and protected CI, artifact handoff, release approval, staging dry-run execution, hosted adapter implementation, and partner promotion remain blocked.
  ```

## Task 7: Verification

- [ ] Run local verification that does not read real env files:
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

## Sprint 35 Exit Gate

Sprint 35 exits as `blocked-billing-lock` when:

- billing unlock is not externally confirmed
- no workflow rerun or dispatch is executed
- current main and latest real run head SHA mismatch is recorded
- protected CI and artifact handoff remain blocked
- local-advisory outputs remain clearly separated from protected CI provenance
- staging dry-run execution, hosted adapter implementation, partner promotion, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, dependency install, release tags, and protected provenance claims remain blocked

Sprint 35 exits as `protected-ci-rerun-ready` only when:

- billing unlock is externally confirmed
- rerun execution is approved for the intended `main` source commit
- rerun command and expected evidence fields are documented

Sprint 35 does not exit as staging-ready unless:

- all ten required checks pass on the intended source commit
- protected artifact metadata exists
- branch protection still requires the canonical checks
- release owner and rollback owner approval are recorded
- staging dry-run, hosted adapter, partner, storage, security, observability, and rollback gates are green

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-36-protected-ci-rerun-after-billing-unlock.md`
- `docs/superpowers/plans/2026-06-20-sprint-36-protected-artifact-handoff-after-ci-pass.md`
- `docs/superpowers/plans/2026-06-20-sprint-36-staging-dry-run-execution-after-protected-ci.md`

# GIWA Protected CI Rerun After Billing Unlock

Sprint 36 checks whether the GitHub billing/account gate has been unlocked. Unlock is not evidenced, so this record keeps the protected workflow rerun blocked and does not claim protected CI or release-grade provenance.

## Current State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=public
branch=main
branchProtected=true
currentMainHead=30eddb3da26ca6cf8302d1396bd8f5fbe61759c1
currentMainCommitMessage=docs: record sprint 35 ci blocker handoff [skip ci]
latestRealActionsRunId=27850867132
latestRealActionsRunUrl=https://github.com/aop60003/giwa-verified-intent-rail/actions/runs/27850867132
latestRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestRealActionsRunConclusion=failure
latestRealActionsRunFirstJob=source-provenance
latestRealActionsRunFirstJobConclusion=failure
latestRealActionsRunDownstreamJobs=9-skipped
latestRealActionsRunLog=not-found
latestRealActionsRunArtifactTotalCount=0
rootCauseClass=github-account-billing-lock
billingUnlockConfirmed=false
currentMainCheckRuns=0
noActionsRunForCurrentMain=true
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

Sprint 36 read-only evidence:

```text
docs/evidence/protected-ci-sprint36-blocked-handoff.json
```

## Rerun Decision

No rerun or workflow dispatch is allowed while:

```text
billingUnlockConfirmed=false
```

Rerunning the latest real run would not prove current `main`, because:

```text
currentMainHead=30eddb3da26ca6cf8302d1396bd8f5fbe61759c1
latestRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
sourceBinding=blocked-no-run-for-current-main
```

After billing unlock is externally confirmed, the preferred action is to dispatch the workflow on `main` and bind evidence to the resulting `headSha`. A rerun of `27850867132` is stale for the current source commit.

## Required Checks

The branch protection rule still requires these ten checks:

```text
source-provenance
workflow-command-boundary
web-checks
protocol-checks
contracts-checks
node-syntax-checks
safe-scans
workspace-checks
artifact-provenance
protected-ci-gate
```

Any failing, skipped, missing, stale, renamed, or old-SHA check keeps release approval blocked.

## Artifact Handoff Boundary

The protected artifact gate remains blocked:

```text
protectedArtifactUploadImplemented=false
latestRealActionsRunArtifactTotalCount=0
```

A future passing protected CI run must expose staging-named protected outputs and metadata:

```text
docs/evidence/giwa-staging-artifact-manifest.json
docs/evidence/giwa-staging-provenance-report.json
docs/evidence/giwa-staging-provenance-report.json.sha256
docs/evidence/giwa-staging-artifact-upload-metadata.json
```

Local advisory files remain review aids only:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-command-evidence-report.json
docs/evidence/local-provenance-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
```

They cannot unblock staging while `protectedCI=blocked-billing-lock`.

## Safety Confirmation

Sprint 36 does not:

- rerun or dispatch GitHub Actions while billing unlock is unconfirmed
- public-host or deploy
- connect managed infrastructure
- read or print local env-file values
- output credential values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- create release tags
- create fake CI results or fake artifact metadata
- claim protected CI or release-grade provenance

## Exit Decision

Sprint 36 exits as:

```text
sprint36Status=blocked-billing-lock
billingUnlockConfirmed=false
rerunAllowed=false
rerunExecuted=false
workflowDispatchExecuted=false
noActionsRunForCurrentMain=true
currentMainCheckRuns=0
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
protectedArtifactUploadImplemented=false
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
hostedAdapterImplementation=blocked
partnerPromotion=blocked
nextExternalAction=resolve-github-billing-account-lock
nextSprintCandidateAfterUnlock=docs/superpowers/plans/2026-06-20-sprint-37-protected-ci-dispatch-on-current-main.md
```

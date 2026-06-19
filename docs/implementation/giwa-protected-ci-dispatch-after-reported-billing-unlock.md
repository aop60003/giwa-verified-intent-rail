# GIWA Protected CI Dispatch After Reported Billing Unlock

Sprint 37 executed a protected workflow dispatch after the user reported that the GitHub billing/account gate was unlocked. GitHub still returned an account billing annotation before runner steps, so this record does not claim protected CI or release-grade provenance.

## Dispatch Result

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=public
branch=main
branchProtected=true
currentMainHead=b769003e733a83faa70b57b4c0bda6ac26821044
currentMainCommitMessage=docs: record sprint 36 ci unlock blocker [skip ci]
workflowName=ci-source-provenance
workflowPath=.github/workflows/ci.yml
workflowDispatchExecuted=true
workflowRunId=27852941488
workflowRunUrl=https://github.com/aop60003/giwa-verified-intent-rail/actions/runs/27852941488
workflowRunEvent=workflow_dispatch
workflowRunHeadSha=b769003e733a83faa70b57b4c0bda6ac26821044
workflowRunStatus=completed
workflowRunConclusion=failure
workflowRunCreatedAt=2026-06-19T23:26:14Z
workflowRunUpdatedAt=2026-06-19T23:26:19Z
```

## Required-Check Outcome

The current `main` commit now has ten GitHub check runs, but they are not passing protected CI evidence:

```text
requiredCheckCount=10
source-provenance=failure
workflow-command-boundary=skipped
web-checks=skipped
protocol-checks=skipped
contracts-checks=skipped
node-syntax-checks=skipped
safe-scans=skipped
workspace-checks=skipped
artifact-provenance=skipped
protected-ci-gate=skipped
```

The failing `source-provenance` check-run annotation was:

```text
The job was not started because your account is locked due to a billing issue.
```

The failed job has no runner steps and `gh run view --log-failed` returned no job log for the failed job.

## Artifact Handoff

Actions artifact listing for run `27852941488` returned:

```text
artifactTotalCount=0
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked-no-artifacts
```

Because no protected artifact was generated or uploaded, these staging-named outputs remain absent:

```text
docs/evidence/giwa-staging-artifact-manifest.json
docs/evidence/giwa-staging-provenance-report.json
docs/evidence/giwa-staging-provenance-report.json.sha256
docs/evidence/giwa-staging-artifact-upload-metadata.json
```

## Evidence Path

```text
docs/evidence/protected-ci-sprint37-dispatch-failure.json
```

## Decision

```text
billingUnlockClaimedByUser=true
billingUnlockConfirmedByGitHub=false
workflowDispatchExecuted=true
rerunExecuted=false
rootCauseClass=github-account-billing-lock
protectedCI=blocked-billing-lock-after-dispatch
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked-no-artifacts
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
hostedAdapterImplementation=blocked
partnerPromotion=blocked
```

## Safety Confirmation

Sprint 37 did not:

- public-host or deploy
- connect managed infrastructure
- read or print local env-file values
- output credential values
- send wallet transactions
- run GIWA chain-operation commands
- install dependencies
- create release tags
- create fake CI results or fake artifact metadata
- claim protected CI or release-grade provenance

## Exit Decision

Sprint 37 exits as:

```text
sprint37Status=blocked-billing-lock-after-dispatch
workflowDispatchExecuted=true
workflowRunId=27852941488
workflowRunHeadSha=b769003e733a83faa70b57b4c0bda6ac26821044
sourceProvenanceConclusion=failure
downstreamRequiredJobs=9-skipped
artifactTotalCount=0
protectedCI=blocked-billing-lock-after-dispatch
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked-no-artifacts
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
hostedAdapterImplementation=blocked
partnerPromotion=blocked
nextExternalAction=resolve-github-account-billing-lock-confirmed-by-successful-runner-start
```

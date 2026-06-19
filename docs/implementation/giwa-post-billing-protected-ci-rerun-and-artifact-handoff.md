# GIWA Post-Billing Protected CI Rerun and Artifact Handoff

Sprint 35 records the protected CI rerun and artifact handoff path. GitHub billing/account unlock is not confirmed, so this record keeps the workflow rerun blocked and does not claim protected CI provenance.

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
billingUnlockConfirmed=false
rerunExecuted=false
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
protectedArtifactUploadImplemented=false
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
hostedAdapterImplementation=blocked
partnerPromotion=blocked
```

Sprint 35 read-only evidence:

```text
docs/evidence/protected-ci-sprint35-blocked-handoff.json
```

## Source Binding Rule

Any future protected CI rerun must bind to the intended source commit:

```text
intendedSourceCommit=11587e18caae0c73bf0ac61ef8f6e096655f8cac
latestRealRunSourceCommit=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
sourceBinding=blocked-no-run-for-current-main
noActionsRunForCurrentMain=true
currentMainCommitSkippedCI=true
```

If a rerun or dispatch later produces a different `headSha`, do not treat it as Sprint 35 release evidence.

## Required Checks

Protected CI authority requires all ten checks to pass:

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

Any red, skipped, startup-failed, billing-blocked, missing, or renamed check keeps release approval blocked.

## Protected Artifact Handoff

Protected artifact handoff is blocked until a passing GitHub Actions run produces and exposes these staging-named outputs:

```text
docs/evidence/giwa-staging-artifact-manifest.json
docs/evidence/giwa-staging-provenance-report.json
docs/evidence/giwa-staging-provenance-report.json.sha256
docs/evidence/giwa-staging-artifact-upload-metadata.json
```

Current workflow note:

```text
protectedArtifactUploadImplemented=false
artifactListingCommand=gh api repos/aop60003/giwa-verified-intent-rail/actions/runs/<run-id>/artifacts
latestRealActionsRunArtifactTotalCount=0
```

If a future protected CI run passes all checks but returns zero artifacts from the Actions artifacts API, release approval stays blocked and the next sprint must add an approved protected artifact upload path.

The handoff record must include:

| Field | Required value source |
| --- | --- |
| `runId` | passing GitHub Actions run |
| `runUrl` | GitHub Actions run URL |
| `headSha` | intended `main` source commit |
| `requiredCheckResults` | all ten canonical checks |
| `artifactNames` | GitHub artifact listing |
| `artifactByteCounts` | downloaded or listed artifact metadata |
| `artifactSha256` | locally computed from downloaded protected artifacts |
| `retention` | GitHub artifact retention metadata or policy |
| `releaseOwner` | named approval owner |
| `rollbackOwner` | named rollback owner |

Local advisory files remain advisory:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-command-evidence-report.json
docs/evidence/local-provenance-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
```

They cannot unblock staging while `protectedCI=blocked-billing-lock`.

## Rerun Procedure After Billing Unlock

Only after billing unlock is externally confirmed:

```powershell
gh run rerun <latest-protected-run-id> --repo aop60003/giwa-verified-intent-rail
gh run watch <rerun-id> --repo aop60003/giwa-verified-intent-rail --exit-status
```

If rerun cannot target the intended `main` head, dispatch from `main`:

```powershell
gh workflow run ci.yml --repo aop60003/giwa-verified-intent-rail --ref main
gh run list --repo aop60003/giwa-verified-intent-rail --workflow ci.yml --limit 5 --json databaseId,status,conclusion,headSha,url
gh api repos/aop60003/giwa-verified-intent-rail/actions/runs/<run-id>/artifacts
```

Do not run either command while `billingUnlockConfirmed=false`.

## Safety Confirmation

Sprint 35 does not:

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

Sprint 35 exits as:

```text
sprint35Status=blocked-billing-lock
billingUnlockConfirmed=false
rerunExecuted=false
noActionsRunForCurrentMain=true
currentMainCommitSkippedCI=true
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
protectedArtifactUploadImplemented=false
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
hostedAdapterImplementation=blocked
partnerPromotion=blocked
nextSprint=docs/superpowers/plans/2026-06-20-sprint-36-protected-ci-rerun-after-billing-unlock.md
```

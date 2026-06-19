# GIWA Protected CI Run And Release Provenance

## Purpose

This document records the Sprint 27 protected CI run and release provenance probe after Sprint 26 created the local git repository and workflow file.

Sprint 27 does not prove protected CI. It records why protected CI, branch protection, release approval, and staging promotion remain blocked.

## Local Source Evidence

Observed local source state:

```text
branch=main
baselineLocalCommit=9918a5267a79f63ef512be7847b6f89d95ac8081
workflowPath=.github/workflows/ci.yml
workflowName=ci-source-provenance
scripts/ci=False
authority=local-advisory
```

The baseline local commit is the Sprint 26 initial commit. Later Sprint 27 documentation and evidence commits are local-only until a remote GitHub repository and push approval exist.

## Remote And Actions Probe

Observed Sprint 27 remote/protected-CI state:

```text
remoteGitHubRepository=absent
remoteConfig=absent
remotePushApproval=absent
remotePush=blocked
githubActionsRun=absent
requiredCheckStatuses=absent
protectedArtifactGeneration=absent
protectedArtifactUpload=absent
releaseApproval=blocked
rollbackOwner=absent
branchProtection=blocked
protectedProvenance=blocked
```

No remote was created, no push was attempted, no GitHub Actions workflow was dispatched, no repository settings were changed, and no branch protection rule was configured.

## Sprint 28 Local Hardening Update

Sprint 28 adds local CI guard scripts under `scripts/ci`, routes `.github/workflows/ci.yml` through those guards, and adds `protected-ci-gate` as a future required-check candidate. This update does not create protected CI authority because no remote, push, real Actions run id, required-check status, branch protection rule, or protected artifact upload metadata exists.

## Required Check Names

The current workflow defines these job names:

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

These are required-check candidates only. They cannot become protected checks until a GitHub repository exists, the workflow has run from pushed source, and matching GitHub status checks are visible.

## Protected Provenance Blockers

Protected provenance remains blocked by:

- no configured GitHub remote
- no push approval
- no pushed immutable source commit
- no GitHub Actions run id
- no real required-check statuses
- no branch protection or ruleset evidence
- no protected artifact generation or upload metadata
- no release owner approval
- no rollback owner
- `safe-scans` has not run as a protected required check and must be reviewed for blocking behavior before it is enforced for release authority

Local artifact and provenance outputs remain useful for review and drift detection only.

## Local Advisory Evidence

Sprint 27 may refresh:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-provenance-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
docs/evidence/local-command-evidence-report.json
```

These files must remain:

```text
authority=local-advisory
releaseGrade=false
canUnblockStaging=false
```

They must not populate protected source commit, GitHub run id, release tag, or staging promotion fields.

## Branch Protection Status

Branch protection is blocked because:

- no GitHub remote is configured
- required check statuses have not run in GitHub
- repository settings cannot be changed locally
- branch protection requires exact status check names from a real workflow run

If a future sprint receives remote, push, and settings authority, it must record repository URL, protected branch, reviewer policy, merge policy, required checks, release owner, rollback owner, and repository settings evidence before treating protected CI as authoritative.

## Sprint 28 Approval Gates

Future external activation remains split into these explicit gates:

```text
git-remote-add
git-push
github-actions-observe-or-dispatch
branch-protection-or-ruleset
protected-artifact-upload
```

The protected artifact upload gate must record:

```text
docs/evidence/giwa-staging-artifact-manifest.json
docs/evidence/giwa-staging-provenance-report.json
docs/evidence/giwa-staging-provenance-report.json.sha256
docs/evidence/giwa-staging-artifact-upload-metadata.json
```

## Sprint 29 GitHub Remote Activation

Sprint 29 executed the approved GitHub remote activation path:

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=private
remoteName=origin
remoteUrl=https://github.com/aop60003/giwa-verified-intent-rail.git
targetBranch=main
pushedCommit=f0a54e684bcd873cedc3623a8416faf356484730
workflowPath=.github/workflows/ci.yml
workflowName=ci-source-provenance
```

Real GitHub Actions runs were observed:

```text
pushRunId=27848145919
pushRunUrl=https://github.com/aop60003/giwa-verified-intent-rail/actions/runs/27848145919
pushRunHeadSha=f0a54e684bcd873cedc3623a8416faf356484730
pushRunConclusion=startup_failure
pushRunJobs=0

dispatchRunId=27848184212
dispatchRunUrl=https://github.com/aop60003/giwa-verified-intent-rail/actions/runs/27848184212
dispatchRunHeadSha=f0a54e684bcd873cedc3623a8416faf356484730
dispatchRunConclusion=startup_failure
dispatchRunJobs=0
```

The workflow is active in GitHub, but no jobs were created for either run. Because no job contexts reached GitHub status checks, these runs do not prove protected CI, do not satisfy required checks, and do not produce protected artifact upload metadata.

Observed branch protection attempt:

```text
branchProtectionAttempt=blocked
branchProtectionApiStatus=403
branchProtectionErrorClass=github-plan-or-visibility-gate
branchProtectionErrorSummary=Upgrade to GitHub Pro or make this repository public to enable this feature.
```

The repository remains private. Sprint 29 did not make the repository public to work around the branch-protection gate.

Protected provenance remains blocked by:

- Actions startup failure with zero jobs
- no successful required-check statuses
- branch protection blocked by GitHub plan or repository visibility
- no protected artifact generation
- no protected artifact upload metadata
- no release owner approval
- no rollback owner

## Sprint 30 Startup Triage

Sprint 30 continues from the Sprint 29 result with a focused startup-failure triage:

```text
plan=docs/superpowers/plans/2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md
triageRecord=docs/implementation/giwa-github-actions-startup-failure-triage.md
latestPushedCommit=6cc707a5713c3355bba0a22afe7458a787e1c8d7
latestPushRunId=27848419907
latestPushRunConclusion=startup_failure
latestPushRunJobs=0
diagnosticRunId=27849055389
diagnosticRunConclusion=startup_failure
diagnosticRunJobs=0
postVisibilityDiagnosticRunId=27849292869
postVisibilityDiagnosticConclusion=failure
postVisibilityDiagnosticJobs=3
postVisibilityDiagnosticAnnotation=account-locked-due-to-billing
branchProtection=configured-required-checks-failing
protectedBranch=main
branchProtectionEnforceAdmins=false
protectedWorkflowCheckRuns=10
```

The first diagnostic workflow failed before creating jobs while the repository was private. After public source visibility, diagnostic jobs were created, but the first job was not started because the GitHub account is locked due to a billing issue. The current root-cause class is `github-account-billing-lock`. This does not weaken the protected check list, does not create protected artifact evidence, and does not unblock release approval by itself.

## Sprint 32 Billing-Lock Rerun Gate

Sprint 32 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-32-github-billing-lock-and-protected-ci-rerun.md
```

Current protected CI state:

```text
latestProtectedRunId=27849499574
latestProtectedRunHeadSha=7858b34cbac7d7141254b03051c4516048225de1
latestProtectedRunAttempt=2
latestProtectedRunConclusion=failure
latestProtectedRunFirstJob=source-provenance
latestProtectedRunAnnotation=account-locked-due-to-billing
branchProtected=true
requiredChecks=10
protectedArtifactGeneration=blocked
releaseApproval=blocked
```

After the GitHub account billing lock is resolved outside the repository, rerun the protected workflow before any staging artifact or release approval work. Do not treat admin-bypassed pushes as protected merge evidence.

## Sprint 33 Staging Dry-Run Preparation State

Sprint 33 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-33-staging-dry-run-preparation-under-billing-lock.md
```

Sprint 33 preparation record:

```text
docs/implementation/giwa-staging-dry-run-preparation-under-billing-lock.md
```

Latest protected CI state:

```text
latestProtectedRunId=27849769064
latestProtectedRunHeadSha=d8b8f36874a35c2c290a3a1055c0ba9f23b30a03
latestProtectedRunConclusion=failure
latestProtectedRunAnnotation=account-locked-due-to-billing
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
releaseApproval=blocked
stagingPromotion=blocked
```

Sprint 33 prepares the dry-run packet for post-billing review only. It does not create protected CI provenance, protected artifacts, release approval, public hosting, deployment, managed infrastructure, wallet actions, or chain-operation commands.

## Safety Confirmation

Sprint 27 did not:

- read or print real local environment file contents
- output credential values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint
- install new dependencies
- public-host or deploy
- create a remote, push, workflow dispatch, branch protection rule, release tag, fake CI result, or protected provenance claim
- treat Flashblocks as final confirmation

## Exit Decision

Sprint 27 exits as:

```text
protectedCI=blocked
branchProtection=blocked
releaseApproval=blocked
stagingPromotion=blocked
nextRequiredExternalInput=GitHub remote URL plus push and repository-settings approval
```

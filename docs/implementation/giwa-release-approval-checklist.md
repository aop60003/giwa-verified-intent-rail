# GIWA Release Approval Checklist

## Purpose

This checklist defines what must be true before protected CI can support release provenance. It does not approve public hosting or deployment.

## Current Status

```text
.git=True
.github=True
.github/workflows=True
workflowPath=.github/workflows/ci.yml
localInitialCommit=9918a5267a79f63ef512be7847b6f89d95ac8081
remoteGitHubRepository=https://github.com/aop60003/giwa-verified-intent-rail
githubActionsRun=observed-startup-failure
requiredCheckStatuses=absent
protected CI=blocked-startup-failure
protected artifact manifest=blocked
protected provenance report=blocked
protected artifact upload metadata=blocked
release approval=blocked
```

## Required Repository Gates

- Repository transition approved by the user and completed locally.
- Workflow-file creation approved by the user and completed locally.
- `.git=True`.
- `.github=True`.
- `.github/workflows/ci.yml` reviewed.
- GitHub remote repository recorded.
- Push approval recorded.
- Immutable pushed source commit recorded.
- Protected branch name recorded.
- Reviewer policy recorded.
- Merge policy recorded.
- Direct release from local checks forbidden.

## Required Branch Protection Checks

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

The command-boundary guard may be a standalone required check or a required step inside a required job, but the release approval record must identify where it ran.

## Required CI Evidence

- immutable source commit
- protected branch or reviewed PR context
- workflow path
- workflow file hash
- CI run id
- runner OS
- Node version `22.16.0`
- pnpm version `10.32.1`
- frozen lockfile install result
- package check results
- workspace check results
- syntax check results
- redacted scan summary
- artifact manifest
- provenance report
- protected artifact upload metadata
- build tree hash

## Required Product Gates

- static fallback smoke remains green
- static fallback is hash-verified before it is named as continuity surface
- matched-only receipt gate remains green
- Flashblocks remains non-final status only
- public evidence contains only approved public fields
- no public hosting command ran
- no deployment command ran
- no wallet action ran
- no GIWA chain-operation command ran
- no dependency install beyond frozen lockfile CI install

## Approval Record Shape

```text
releaseOwner=<name-or-role>
approvedAt=<ISO-8601>
sourceCommit=<protected-ci-commit>
workflowPath=.github/workflows/ci.yml
ciRunId=<protected-ci-run-id>
artifactManifestPath=docs/evidence/giwa-staging-artifact-manifest.json
provenanceReportPath=docs/evidence/giwa-staging-provenance-report.json
provenanceSidecarPath=docs/evidence/giwa-staging-provenance-report.json.sha256
artifactUploadMetadataPath=docs/evidence/giwa-staging-artifact-upload-metadata.json
buildTreeSha256=<computed>
promotionDecision=approved-or-blocked
failureTriagePath=docs/implementation/giwa-ci-failure-triage.md
rollbackOwner=<name-or-role>
rollbackRoute=static-fallback-and-blocker-register
staticFallbackStatus=green-and-hash-verified-or-blocked
blockerRegisterUpdatedAt=<ISO-8601>
blockerRegisterUpdatedBy=<name-or-role>
workflowRemovalApproval=required-if-rollback-removes-workflow
```

## Sprint 24 Rollback And Blocker Register Gate

Before retrying a failed protected CI run, attach the first failing job and command to the approval record.

Before naming static fallback as a continuity surface, record GET smoke and hash verification.

After any approved repository, workflow, or branch-protection action, update:

- `Source provenance`
- `Protected CI`
- `Rollback`
- `Static fallback`

Rollback can replace app artifacts and lock new writes. Rollback cannot reverse public GIWA Sepolia evidence. Local Sprint 22/23 evidence remains advisory until protected CI regenerates it.

## Blocked States

Release approval remains blocked when any of these are true:

- remote GitHub repository absent
- pushed source commit absent
- GitHub Actions run id absent
- required-check statuses absent
- protected branch absent
- required checks not enforced
- artifact manifest absent
- provenance report absent
- protected artifact upload metadata absent
- local advisory output treated as final
- unsafe scan output prints matched values
- public artifact hash mismatch
- unmanifested served public file exists
- static fallback smoke fails
- receipt opens before `matched`
- external partner signoff is absent for a partner beta promotion

## Sprint 29 Remote Activation Record

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
pushedCommit=f0a54e684bcd873cedc3623a8416faf356484730
pushRunId=27848145919
pushRunConclusion=startup_failure
dispatchRunId=27848184212
dispatchRunConclusion=startup_failure
branchProtectionApiStatus=403
branchProtectionErrorClass=github-plan-or-visibility-gate
releaseApproval=blocked
```

## Sprint 30 Startup Failure Triage

Sprint 30 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md
```

Sprint 30 triage record:

```text
docs/implementation/giwa-github-actions-startup-failure-triage.md
```

Observed Sprint 30 diagnostic:

```text
diagnosticRunId=27849055389
diagnosticRunConclusion=startup_failure
diagnosticRunJobs=0
rootCauseClass=repository-account-platform-startup-gate
```

Observed Sprint 31 source visibility diagnostic:

```text
visibilityAfter=public
postVisibilityDiagnosticRunId=27849292869
postVisibilityDiagnosticConclusion=failure
postVisibilityDiagnosticJobs=3
postVisibilityDiagnosticAnnotation=account-locked-due-to-billing
rootCauseClass=github-account-billing-lock
branchProtection=configured-required-checks-failing
```

Release approval remains blocked until:

- GitHub Actions creates real job/check contexts.
- GitHub account billing lock is resolved and jobs can start runner steps.
- The protected required-check set passes from pushed source.
- Branch protection is configured or an approved substitute source-control policy is recorded.
- Protected artifact manifest, provenance report, sidecar, and upload metadata are generated by the approved CI path.
- Release and rollback owners are recorded.

## Sprint 27 Protected CI Probe

Sprint 27 record:

```text
docs/implementation/giwa-protected-ci-run-and-release-provenance.md
```

Sprint 27 confirms local git and workflow state, but release approval remains blocked because there is no configured GitHub remote, no push approval, no GitHub Actions run id, no required-check statuses, no protected artifact generation, no branch protection evidence, no release owner, and no rollback owner.

## Current Recommendation

Under the current remote-pushed but protected-CI-blocked state, the safe next sprint is:

```text
docs/superpowers/plans/2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md
```

Hosted adapter and staging dry-run paths remain blocked until protected source, workflow, and provenance gates exist.

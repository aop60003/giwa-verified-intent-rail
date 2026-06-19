# GIWA GitHub Actions Startup Failure Triage

## Purpose

This document records the Sprint 30 triage for GitHub Actions runs that fail before creating jobs. It does not approve public hosting, deployment, managed infrastructure, wallet actions, GIWA chain-operation commands, dependency installation, release tags, or protected CI provenance claims.

## Observed Sprint 29 State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=private
workflowPath=.github/workflows/ci.yml
workflowName=ci-source-provenance
latestPushedCommit=6cc707a5713c3355bba0a22afe7458a787e1c8d7
pushRunId=27848419907
pushRunUrl=https://github.com/aop60003/giwa-verified-intent-rail/actions/runs/27848419907
pushRunConclusion=startup_failure
pushRunJobs=0
checkRuns=0
protectedArtifactUploadMetadata=absent
```

The GitHub Actions workflow is visible and active, but the latest push run completed before any job context was created. That means the failure is classified as a pre-job startup failure, not as a failure in `pnpm`, tests, build commands, safe scans, artifact commands, or any application code path.

## Check Suite Evidence

Observed check suites for commit `6cc707a5713c3355bba0a22afe7458a787e1c8d7`:

| App | Status | Conclusion | Check runs | Authority |
| --- | --- | --- | --- | --- |
| GitHub Actions | completed | startup_failure | 0 | blocked |
| cloudtype | queued | absent | 0 | non-authoritative |
| Cloudflare Workers and Pages | queued | absent | 0 | non-authoritative |
| Vercel | queued | absent | 0 | non-authoritative |

The third-party app check suites are not required checks and are not release evidence. They remain integration noise until an owner intentionally configures them, confirms their scope, and records passing check contexts.

## Diagnostic Workflow Policy

Sprint 30 may add a minimal diagnostic workflow at:

```text
.github/workflows/ci-diagnostic.yml
```

Allowed diagnostic jobs:

- platform echo on `ubuntu-latest` without external actions
- `actions/checkout@v4` smoke
- platform echo on `windows-latest` without external actions

The diagnostic workflow must not:

- install dependencies
- read real env files
- output process env values
- start app servers
- public-host or deploy
- run wallet actions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint
- claim protected CI provenance

## Sprint 30 Diagnostic Result

Sprint 30 added and dispatched:

```text
diagnosticWorkflowPath=.github/workflows/ci-diagnostic.yml
diagnosticWorkflowName=ci-diagnostic
diagnosticRunId=27849055389
diagnosticRunUrl=https://github.com/aop60003/giwa-verified-intent-rail/actions/runs/27849055389
diagnosticRunHeadSha=450df0435910eeeb7f91b68d31c878806ac5157d
diagnosticRunConclusion=startup_failure
diagnosticRunJobs=0
```

The diagnostic workflow is active in GitHub alongside the protected CI candidate workflow:

```text
ci-diagnostic=.github/workflows/ci-diagnostic.yml active
ci-source-provenance=.github/workflows/ci.yml active
```

Repository Actions permissions are not the immediate blocker:

```text
actionsEnabled=true
allowedActions=all
defaultWorkflowPermissions=read
```

The GitHub billing API probe did not expose billing or private runner minutes with the current CLI auth scope:

```text
billingProbe=unavailable
billingProbeStatus=404
billingProbeRequiredScope=user
```

Because a minimal workflow with no dependency install, no app command, and no env access also failed before job creation, the root-cause class is now `repository-account-platform-startup-gate`. The protected workflow YAML and package command matrix remain unproven but are no longer the first suspected layer.

## Branch Protection Status

Observed branch protection attempt:

```text
protectedBranch=main
branchProtectionApiStatus=403
branchProtectionErrorClass=github-plan-or-visibility-gate
branchProtectionErrorSummary=Upgrade to GitHub Pro or make this repository public to enable this feature.
```

The repository remains private. Branch protection is blocked until one of these is recorded:

- GitHub plan upgrade or repository feature availability changes.
- Explicit public repository conversion approval and source visibility review.
- Approved replacement source-control policy for the current private repository.

## Release Boundary

Current authority remains:

```text
sourceProvenance=partial-remote
protectedCI=blocked-startup-failure
branchProtection=blocked-github-plan-or-visibility
protectedArtifactGeneration=blocked
releaseApproval=blocked
stagingPromotion=blocked
```

No staging release or protected artifact can be claimed until a real GitHub Actions run creates job/check contexts and the required checks pass from the pushed source commit.

## Triage Routes

| Signal | Classification | Required response |
| --- | --- | --- |
| `ci-source-provenance` run has `startup_failure` and zero jobs | protected CI startup gate | keep release blocked and run minimal diagnostic workflow |
| diagnostic workflow also has zero jobs | repository/account/platform gate | keep protected CI blocked and record GitHub plan, billing, runner, or visibility gate |
| diagnostic platform job runs but checkout job fails | allowed-actions or checkout policy | keep protected CI blocked and inspect repository Actions policy |
| diagnostic Linux job runs but Windows job fails | runner availability or Windows runner gate | keep current protected workflow blocked and record runner policy decision |
| diagnostic workflow passes but `ci.yml` still startup-fails | protected workflow graph or YAML gate | inspect `ci.yml` without dropping required jobs or safe scans |
| branch protection API returns plan or visibility 403 | branch policy gate | keep branch protection blocked until plan, visibility, or substitute policy changes |
| third-party app checks remain queued | non-authoritative app checks | exclude from required checks and do not trigger hosting providers |

## Sprint 30 Exit State

Sprint 30 may only unblock protected CI if a GitHub Actions run creates the expected job/check contexts and the required checks pass. Otherwise it exits with a documented blocker and keeps staging promotion blocked.

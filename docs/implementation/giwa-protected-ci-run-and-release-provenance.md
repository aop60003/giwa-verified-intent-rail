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

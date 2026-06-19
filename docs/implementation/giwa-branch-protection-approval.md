# GIWA Branch Protection Approval

## Purpose

This document is the Sprint 24 approval checklist for future branch protection and required checks. It does not configure repository settings, create branches, create workflow files, or create protected CI.

## Current Blocked State

```text
.git=True
.github=True
.github/workflows=True
scripts/ci=True
branch-protection=blocked
required-checks=blocked
protected-ci=blocked
```

Sprint 29 update:

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=private
protectedBranch=main
branchProtectionAttempt=blocked
branchProtectionApiStatus=403
branchProtectionErrorClass=github-plan-or-visibility-gate
branchProtectionErrorSummary=Upgrade to GitHub Pro or make this repository public to enable this feature.
requiredChecksProduced=false
```

Sprint 31 update:

```text
repositoryVisibility=public
diagnosticRunId=27849292869
diagnosticJobs=3
diagnosticFirstJobConclusion=failure
diagnosticFirstJobAnnotation=account-locked-due-to-billing
branchProtectionRetry=not-attempted
branchProtectionCurrentBlocker=no-passing-required-checks
```

Branch protection requires a GitHub repository, a reviewed workflow path, and required checks that have run from a protected source context. A local workflow draft alone cannot satisfy this gate.

## Prerequisites

Branch protection approval cannot proceed until:

- git repository initialization is approved and complete
- `.github/workflows/ci.yml` is approved and created
- workflow job names are stable
- required checks have produced at least one real CI status
- branch naming policy is recorded
- reviewer and merge policy are recorded

## Approval Record

| Field | Required value |
|---|---|
| `approvedBy` | user or named role |
| `approvedAt` | ISO-8601 timestamp |
| `repository` | GitHub repository name or URL |
| `protectedBranch` | expected branch name |
| `reviewerPolicy` | required review count and owner rule |
| `mergePolicy` | merge method and direct-push rule |
| `requiredChecks` | exact check names listed below |
| `releaseOwner` | named owner |
| `rollbackOwner` | named owner |
| `workflowPath` | `.github/workflows/ci.yml` |

## Required Checks

Required check names:

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

Do not configure branch protection with approximate names. The required status check names must match actual workflow job names.

## Protected Branch Requirements

The protected branch policy must require:

- pull request review before merge
- direct push disabled except for explicitly named maintainers if approved
- required checks to pass before merge
- stale check dismissal or re-run policy
- conversation resolution if GitHub settings support it
- release owner approval before promotion
- no release tag creation by CI

## Release Boundary

Branch protection can make CI authoritative only after protected CI runs from immutable source.

It does not authorize:

- public hosting
- deployment
- managed infrastructure
- wallet actions
- chain-operation commands
- dependency changes
- release-grade provenance claims before CI-generated artifact evidence exists

## Failure Handling

| Failure | Required response |
|---|---|
| GitHub repository absent | keep branch protection blocked |
| workflow job names differ from required checks | update approval record before enforcing |
| required checks missing or skipped | block release provenance |
| direct push allowed without approval | block promotion |
| artifact-provenance check missing | keep protected CI incomplete |
| GitHub plan or private visibility blocks branch protection | keep branch protection blocked until plan upgrade or explicit public repository conversion approval |

## Sprint 30 Retry Policy

The Sprint 29 branch protection attempt returned a plan or visibility gate for the private repository. Sprint 30 may retry branch protection only after one of these has changed and is recorded:

- GitHub plan or repository feature availability now supports private repository branch protection.
- Public repository conversion is explicitly approved as a source visibility decision and completed after a source-safety review.
- A substitute source-control policy is explicitly approved for the private repository and recorded as non-branch-protection release governance.

Do not add queued third-party app check suites as required checks. Only stable, intentionally configured, passing check contexts with owners can be considered for required-check policy.

After Sprint 31, repository visibility is public, but branch protection remains blocked because the GitHub account billing lock prevents required checks from starting successfully. Retry branch protection only after the billing lock is resolved and the protected required-check names have passing GitHub check contexts.

## Exit Gate

Branch protection approval is ready only when:

- repository identity is recorded
- protected branch name is recorded
- reviewer and merge policy are recorded
- exact required check names are recorded
- workflow path exists in an approved repository
- at least one protected CI run has produced matching check names
- release and rollback owners are recorded
- staging promotion remains blocked until release approval is separately recorded

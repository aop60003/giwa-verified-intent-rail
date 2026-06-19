# GIWA Git Initialization Approval

## Purpose

This document is the Sprint 24 approval checklist for moving GIWA Verified Intent Rail from non-git prototype mode toward a git-backed workspace. It does not initialize git, create commits, create branches, configure remotes, push, or create pull requests.

## Current Blocked State

```text
.git=False
.github=False
.github/workflows=False
scripts/ci=False
authority=local-advisory
source-provenance=blocked
protected-ci=blocked
```

There is no authoritative source commit, branch, pull request context, protected check result, release provenance, or staging promotion authority while `.git=False`.

## Approval Scope

Git initialization approval may authorize only the exact repository initialization or import action named by the user.

It does not authorize:

- `.github` or workflow file creation
- CI helper script creation
- branch protection setup
- commit, tag, push, merge, remote, or pull request setup unless separately named
- public hosting or deployment
- chain-operation commands
- wallet actions
- dependency changes
- release tags or release-grade provenance claims

## Approval Record

Before any git initialization or repository import, record:

| Field | Required value |
|---|---|
| `approvedBy` | user or named role |
| `approvedAt` | ISO-8601 timestamp |
| `approvedAction` | `git-initialization` or `repository-import`; `git-init` is a legacy alias that must be normalized before execution |
| `workspacePath` | `C:\Users\qwaqw\Desktop\Looprail` |
| `initialBranchPolicy` | branch name and naming rule |
| `commitIncluded` | `false` unless the user explicitly names a commit action |
| `remoteIncluded` | `false` unless the user explicitly names a remote action |
| `pushIncluded` | `false` unless the user explicitly names a push action |
| `workflowIncluded` | `false` |
| `branchProtectionIncluded` | `false` |

## Pre-Approval Checks

Run only path/state checks before approval:

```powershell
Test-Path .git
Test-Path .github
Test-Path .github\workflows
Test-Path scripts\ci
Test-Path .gitignore
```

Expected before approval:

```text
False
False
False
False
True
```

Do not run `git status --short` before `.git` exists.

## Ignore-Rule Review

Before first staging, review `.gitignore` for these excluded surfaces:

- local env files
- wallet export files
- key material files
- auth header dumps
- local runtime DB files
- local runtime data folders
- Node and build outputs
- Hardhat cache and generated contract outputs
- local memory folders
- raw or private JSON files

If an excluded surface is not covered, stop before staging and update the ignore rule under a separate approved documentation or repository hygiene change.

## Post-Approval Initialization Steps

After explicit approval for repository initialization:

1. Run only the approved initialization or import command.
2. Confirm `.git=True`.
3. Review `git status --short` before staging.
4. Stage only reviewed source, documentation, package manifests, lockfile, public artifacts, and approved evidence.
5. Avoid broad staging unless the include/exclude list has already been reviewed.
6. Keep local Sprint 22/23 outputs labeled `local-advisory`.

## First Staged-File Policy

Allowed staged categories:

- `README.md`
- canonical product and implementation documentation
- sprint plans
- public-safe evidence files
- public web assets
- source files
- package manifests
- `pnpm-lock.yaml`
- workspace config files

Blocked staged categories:

- local env files
- local DB files
- wallet exports
- auth header dumps
- runtime logs
- cache folders
- browser state
- generated private artifacts
- raw or private JSON files

## Provenance Boundary

Git initialization alone does not create protected CI provenance.

These fields stay blocked until a git-backed protected CI run exists:

- source commit for release approval
- workflow run id
- required-check enforcement
- protected artifact upload identity
- release tag
- promotion decision

## Failure Handling

| Failure | Required response |
|---|---|
| `.git` appears without approval | stop and report approval gap |
| broad staging includes excluded surfaces | unstage before any commit and report blocked file classes |
| workflow files appear during git initialization | stop and route to workflow approval |
| branch protection is requested before GitHub repository exists | stop and route to branch protection approval |

## Exit Gate

This approval document is satisfied when:

- pre-approval blocked state is recorded
- approval record fields are defined
- `.gitignore` review requirements are explicit
- first staged-file policy is explicit
- git initialization remains separated from workflow creation and branch protection
- local evidence remains `local-advisory`
- no `.git`, `.github`, workflow file, or CI script is created by this document

# GIWA Git And Workflow Initialization Execution

## Purpose

This document records the Sprint 26 execution pass that initialized a local git repository, created the first local source snapshot, created a reviewed GitHub Actions workflow file, and evaluated branch protection readiness.

It does not record public hosting, deployment, wallet action, GIWA chain-operation command execution, dependency installation, protected CI provenance, release tag creation, or staging promotion.

## Approval Record

The active user prompt approved these Sprint 26 gates:

| Gate | Approval status | Execution scope |
| --- | --- | --- |
| Git repository initialization | approved by user | local `git init` only |
| Initial commit | approved by user | one allowlist-reviewed initial commit |
| Workflow file creation | approved by user | `.github/workflows/ci.yml` |
| Branch protection / required checks | approved by user for attempt | blocked unless remote, auth, and real CI statuses exist |

Explicit non-approvals:

```text
push=false
publicHosting=false
deployment=false
walletTransactions=false
chainOperations=false
dependencyInstall=false
releaseTag=false
fakeCIResult=false
```

## Preflight

Observed before repository initialization on `2026-06-19T21:40:56+09:00`:

| Check | Result |
| --- | --- |
| `Test-Path .git` | `False` |
| `Test-Path .github` | `False` |
| `Test-Path .github\workflows` | `False` |
| `Test-Path scripts\ci` | `False` |
| `git --version` | `git version 2.53.0.windows.2` |
| `pnpm --version` | `10.32.1` |
| `node --version` | `v22.16.0` |

No `git status --short` command was run before `.git=True`.

## Git Initialization

Approved command:

```powershell
git init -b main
```

Result:

```text
.git=True
insideWorkTree=true
branch=main
```

No remote was configured and no push was attempted.

## Workflow File Creation

Created workflow path:

```text
.github/workflows/ci.yml
```

The earlier Sprint 24/25 draft used `.github/workflows/ci-source-provenance.yml`. Sprint 26 records `.github/workflows/ci.yml` as the user-approved execution path for this local source snapshot. Branch protection must use the actual path and exact job names when remote CI exists.

Workflow name:

```text
ci-source-provenance
```

Required job names:

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
```

The workflow uses `windows-latest`, Node `22.16.0`, root-pinned `pnpm@10.32.1`, `permissions: contents: read`, safe triggers, existing package scripts, syntax checks, local-advisory artifact checks, and no artifact upload.

Helper scripts remain absent:

```text
scripts/ci=False
helperScriptsIncluded=none
```

## Branch Protection Attempt

Branch protection remains blocked in this local execution pass.

Blockers:

- no GitHub remote is configured
- no push is approved
- no GitHub workflow run exists
- no real CI status exists for the required check names
- no repository settings can be changed locally
- protected CI cannot be claimed until GitHub Actions runs from an immutable source commit

No `gh` command, repository setting change, branch protection command, remote setup, or push was run.

## Initial Commit Policy

Initial commit uses allowlist staging. Excluded classes stay blocked:

- real env files and variants
- local runtime databases and journals
- runtime logs
- browser state
- generated caches
- Node/build outputs
- Hardhat generated outputs
- local memory folders
- raw/private JSON variants
- wallet exports
- credential material and auth dumps

The final initial commit hash is reported outside this file. Recording the hash inside the same first commit would change the hash itself.

## Local Advisory Boundary

Local artifact and provenance outputs remain:

```text
authority=local-advisory
releaseGrade=false
canUnblockStaging=false
```

Sprint 26 may record a local source commit and workflow file, but protected CI authority remains blocked until a remote GitHub workflow run exists and regenerates evidence from immutable source.

## Safety Confirmation

This execution pass did not:

- read or print real env file contents
- print private key, mnemonic, bearer token, RPC token, or API key values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint
- install new dependencies
- public-host or deploy
- create a fake CI result, fake artifact hash, or fake release tag
- treat Flashblocks as final confirmation

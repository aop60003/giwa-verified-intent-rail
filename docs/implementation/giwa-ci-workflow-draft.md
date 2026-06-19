# GIWA CI Workflow Draft

## Purpose

This document is the Sprint 21 documentation-only draft for a future GitHub Actions workflow. It does not create `.github`, does not create a workflow file, and does not start protected CI.

The future workflow path is:

```text
.github/workflows/ci-source-provenance.yml
```

That path remains blocked until the user approves repository transition and workflow-file creation in an execution session.

## Current Gate State

```text
.git=False
.github=False
.github/workflows=False
workflow file=absent
public hosting=not run
deployment=not run
wallet action=not run
GIWA chain-operation command=not run
dependency install=not run
```

Local checks in this state are advisory only. They cannot populate source commit, CI run id, release tag, or final artifact provenance fields.

## Approval Boundaries

Repository transition and workflow-file creation are separate gates:

1. User approval for repository transition.
2. Review `.gitignore` and first staged-file scope.
3. User approval for `.github/workflows/ci-source-provenance.yml`.
4. Review workflow path, command boundary, job matrix, and artifact policy.
5. Enable branch protection and required checks after the workflow exists.

No step in Sprint 21 documentation creates the repository metadata or workflow path.

## Future Workflow Header

Draft only:

```yaml
name: ci-source-provenance

on:
  pull_request:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-source-provenance-${{ github.ref }}
  cancel-in-progress: true
```

The workflow must avoid privileged pull request triggers, scheduled release triggers, deployment triggers, and write-scoped permissions unless a later approved plan changes that boundary.

## Job Model

Each GitHub-hosted job runs on a fresh runner. `needs` orders jobs but does not share checkout state or `node_modules`.

Every job that runs package commands must perform:

```powershell
node --version
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm --version
pnpm install --frozen-lockfile
```

The preferred future DAG is:

```text
source-provenance
-> workflow-command-boundary
-> web-checks
-> protocol-checks
-> contracts-checks
-> node-syntax-checks
-> safe-scans
-> workspace-checks
-> artifact-provenance
```

Parallel jobs may be used only if each job performs its own checkout, Node setup, Corepack activation, pnpm store restore, and frozen install.

## Future Job Draft

```yaml
jobs:
  source-provenance:
    runs-on: windows-latest
    timeout-minutes: 10

  workflow-command-boundary:
    runs-on: windows-latest
    timeout-minutes: 10
    needs: source-provenance

  web-checks:
    runs-on: windows-latest
    timeout-minutes: 25
    needs: workflow-command-boundary

  protocol-checks:
    runs-on: windows-latest
    timeout-minutes: 20
    needs: workflow-command-boundary

  contracts-checks:
    runs-on: windows-latest
    timeout-minutes: 30
    needs: workflow-command-boundary

  node-syntax-checks:
    runs-on: windows-latest
    timeout-minutes: 10
    needs: workflow-command-boundary

  safe-scans:
    runs-on: windows-latest
    timeout-minutes: 10
    needs: workflow-command-boundary

  workspace-checks:
    runs-on: windows-latest
    timeout-minutes: 35
    needs:
      - web-checks
      - protocol-checks
      - contracts-checks

  artifact-provenance:
    runs-on: windows-latest
    timeout-minutes: 35
    needs:
      - workspace-checks
      - node-syntax-checks
      - safe-scans
```

## Required Check Matrix

Install commands for each command-running job:

```powershell
node --version
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm --version
pnpm install --frozen-lockfile
```

Web checks:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
```

Protocol checks:

```powershell
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/protocol --fail-if-no-match typecheck
pnpm --filter @giwa/protocol --fail-if-no-match build
```

Contracts checks:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match typecheck
pnpm --filter @giwa/contracts --fail-if-no-match build
```

Workspace checks:

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Node syntax checks:

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/export-flow-data.mjs
node --check apps/web/scripts/export-live-demo-snapshot.mjs
node --check apps/web/scripts/export-artifact-manifest.mjs
node --check apps/web/scripts/verify-provenance-report.mjs
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Artifact provenance checks:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
```

Guard and scan checks:

```powershell
node scripts/ci/assert-workflow-command-boundary.mjs .github/workflows/ci-source-provenance.yml
node scripts/ci/redacted-safe-scan.mjs --mode ci
```

The guard and scanner are future approved files. They are not created in Sprint 21 documentation work.

## Sprint 24 Approval Packet

Sprint 24 adds documentation-only approval packets:

```text
docs/implementation/giwa-git-initialization-approval.md
docs/implementation/giwa-ci-workflow-creation-approval.md
docs/implementation/giwa-branch-protection-approval.md
docs/implementation/giwa-ci-workflow-yaml-draft.md
```

`docs/implementation/giwa-ci-workflow-yaml-draft.md` is the current Markdown-only YAML draft. It is not `.github/workflows/ci-source-provenance.yml`, does not run CI, and cannot satisfy protected checks.

Runner policy is an approval field. The Sprint 24 YAML draft keeps `windows-latest` to align with this Sprint 21 draft and PowerShell command examples unless a later approval records a different runner.

## Cache Boundary

Cache only the pnpm store:

```text
pnpm-store-${{ runner.os }}-node-22.16.0-pnpm-10.32.1-${{ hashFiles('pnpm-lock.yaml') }}
```

Never cache:

```text
node_modules
env files
local DB files
browser state
contract cache
contract artifacts
dist
coverage
generated runtime data
local memory folders
```

## Blocked Command Boundary

The workflow must not execute:

```text
deploy:local
deploy:giwa
fund:giwa
preflight:giwa
sign:manifest
anchor:giwa
verify:giwa
mint
dev:live
serve:live
export:live-demo
wallet transaction commands
public hosting commands
managed infrastructure commands
```

The command-boundary guard must be command-aware. It must allow syntax checks against scripts such as `node --check apps/web/scripts/serve-live.mjs` while blocking execution of live server, export, chain-operation, or wallet-action scripts.

## Required Protected Checks

Branch protection should require:

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

Local simulation may mirror the command list, but it does not satisfy protected checks.

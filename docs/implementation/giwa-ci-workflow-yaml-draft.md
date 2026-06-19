# GIWA CI Workflow YAML Draft

## Purpose

This document is a Markdown-only Sprint 24 workflow draft. It is not `.github/workflows/ci-source-provenance.yml`, does not run CI, and cannot satisfy protected checks.

The future workflow path remains blocked until explicit workflow file creation approval:

```text
.github/workflows/ci-source-provenance.yml
```

## Runner Decision

The draft below keeps `windows-latest` to match the existing Sprint 21 workflow draft and PowerShell command examples. A later approval may switch to `ubuntu-latest`, but that change must be recorded in `docs/implementation/giwa-ci-workflow-creation-approval.md` before any workflow file is created.

## Draft YAML

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

## Job Prelude

Every command-running job must perform checkout, Node setup, Corepack activation, pnpm activation, and frozen install. The command prelude is:

```powershell
node --version
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm --version
pnpm install --frozen-lockfile
```

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

## Command Matrix

`web-checks`:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
```

`protocol-checks`:

```powershell
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/protocol --fail-if-no-match typecheck
pnpm --filter @giwa/protocol --fail-if-no-match build
```

`contracts-checks`:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match typecheck
pnpm --filter @giwa/contracts --fail-if-no-match build
```

`workspace-checks`:

```powershell
pnpm test
pnpm typecheck
pnpm build
```

`node-syntax-checks`:

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

`artifact-provenance`:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
```

## Future Helper Gate

These helper commands remain blocked until helper files are explicitly approved and created:

```powershell
node scripts/ci/assert-workflow-command-boundary.mjs .github/workflows/ci-source-provenance.yml
node scripts/ci/redacted-safe-scan.mjs --mode ci
```

If helper files are not included in the same approved change, omit those helper commands from the actual workflow file.

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
dev
serve
dev:live
serve:live
export:live-demo
artifact:provenance:check
artifact:drift
artifact:commands
mint
wallet signing
public hosting
managed infrastructure
```

Syntax checks against blocked runtime scripts are allowed only through `node --check`.

## Draft Exit Gate

This draft is ready for approval review only when:

- the document remains Markdown-only
- no `.github` directory is created
- no workflow file is created
- no CI helper script is created
- command matrix uses existing package scripts only
- artifact/provenance commands run after build-producing checks
- upload remains blocked until protected CI exists
- local authority remains `local-advisory`

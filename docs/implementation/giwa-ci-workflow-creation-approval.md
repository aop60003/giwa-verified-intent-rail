# GIWA CI Workflow Creation Approval

## Purpose

This document is the Sprint 24 approval checklist for future CI workflow file creation. It does not create `.github`, `.github/workflows`, workflow files, or CI helper scripts.

## Current Blocked State

```text
.git=False
.github=False
.github/workflows=False
scripts/ci=False
authority=local-advisory
protected-ci=blocked
```

A workflow file cannot satisfy protected CI while the workspace has no GitHub repository context, workflow path, protected branch, or required checks.

## Approval Scope

Workflow file creation approval is separate from git initialization and branch protection.

Approval may cover:

- creation of `.github/workflows/ci.yml` for Sprint 26; `.github/workflows/ci-source-provenance.yml` remains a historical draft path
- creation of CI helper scripts only if those script paths are explicitly named
- the exact workflow name, path, triggers, jobs, runner, permissions, and cache policy

Approval does not cover:

- git initialization
- commit, branch, tag, remote, push, merge, or pull request setup
- branch protection or required-check settings
- public hosting or deployment
- chain-operation commands
- wallet actions
- dependency changes
- release tags
- release-grade provenance claims

## Approval Record

| Field | Required value |
|---|---|
| `approvedBy` | user or named role |
| `approvedAt` | ISO-8601 timestamp |
| `workflowPath` | `.github/workflows/ci.yml` |
| `workflowName` | `ci-source-provenance` |
| `draftSource` | `docs/implementation/giwa-ci-workflow-yaml-draft.md` |
| `runnerPolicy` | approved runner value |
| `helperScriptsIncluded` | explicit list or `none` |
| `branchProtectionIncluded` | `false` |
| `publicHostingIncluded` | `false` |

## Pre-Creation Dry-Run

Run local checks before workflow creation approval. These checks are advisory until protected CI exists.

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
node --check apps/web/scripts/export-artifact-manifest.mjs
node --check apps/web/scripts/verify-provenance-report.mjs
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Do not run chain-operation commands as part of this dry-run.

## Workflow Requirements

The workflow must:

- use only `pull_request`, `push` to `main`, and `workflow_dispatch`
- avoid privileged pull request, schedule, release, deployment, and tag triggers
- use `permissions: contents: read`
- use Node `22.16.0`
- activate `pnpm@10.32.1`
- run `pnpm install --frozen-lockfile`
- cache only the pnpm store
- use existing package scripts only
- run artifact/provenance checks after build-producing commands
- keep local outputs labeled `local-advisory`
- upload provenance JSON as CI artifacts only after protected CI exists

The workflow must not execute runtime, hosted, deployment, wallet, or chain-operation commands.

## Command Matrix

Package and workspace commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/protocol --fail-if-no-match typecheck
pnpm --filter @giwa/protocol --fail-if-no-match build
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match typecheck
pnpm --filter @giwa/contracts --fail-if-no-match build
pnpm test
pnpm typecheck
pnpm build
```

Syntax checks:

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

Artifact/provenance commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
```

## Blocked Workflow Commands

The workflow must not include:

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

Syntax checks against script files are allowed only as `node --check`.

## Env And Credential Boundary

Workflow checks must not load raw local env files or print process env values.

Safe scans must:

- reject excluded paths before reading content
- scan allowlisted source, docs, public artifacts, and package metadata only
- classify public chain hashes separately from credential-like material
- report path, line, rule id, match class, count, and decision only
- keep `valuePrinted=false`

Future helper `scripts/ci/redacted-safe-scan.mjs` remains blocked until helper creation is explicitly approved.

## Artifact Upload Policy

Artifact upload is blocked until protected CI exists.

Allowed future CI artifact candidates:

- `docs/evidence/local-artifact-manifest.json`
- `docs/evidence/local-provenance-report.json`
- `docs/evidence/local-provenance-report.json.sha256`
- `docs/evidence/local-provenance-verification.json`
- `docs/evidence/local-command-evidence-report.json`

Upload metadata must include workflow run id, source commit, uploaded file list, byte counts, hashes, retention, manifest hash, report hash, and verification decision.

Do not upload private local DB files or raw local env files.

## Exit Gate

Workflow creation approval is ready only when:

- git initialization approval state is known
- workflow path and name are explicit
- YAML draft source is reviewed
- runner policy is selected
- helper script inclusion is explicit
- command matrix is limited to existing scripts and syntax checks
- artifact upload remains blocked until protected CI exists
- branch protection remains a separate approval gate
- `.github`, `.github/workflows`, workflow files, and CI scripts remain absent until explicit approval; Sprint 26 approval created `.github/workflows/ci.yml`

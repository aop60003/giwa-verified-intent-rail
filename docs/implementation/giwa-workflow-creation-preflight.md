# GIWA Workflow Creation Preflight

## Purpose

This document records preflight requirements for workflow file creation. Sprint 25 used it as a future-facing readiness document. Sprint 26 approved and created the local workflow file path recorded below.

## Current State

```text
.git=True
.github=True
.github/workflows=True
scripts/ci=False
authority=local-advisory
protected-ci=blocked
```

Workflow creation was approved for Sprint 26 and completed for `.github/workflows/ci.yml`. Protected CI remains blocked until a remote GitHub run exists.

## Future Workflow Target

| Field | Value |
| --- | --- |
| Workflow path | `.github/workflows/ci.yml` |
| Workflow name | `ci-source-provenance` |
| Draft source | `docs/implementation/giwa-ci-workflow-yaml-draft.md` |
| Runner policy | `windows-latest` unless a later approval changes it |
| Node version | `22.16.0` |
| Package manager | `pnpm@10.32.1` |
| Permissions | `contents: read` |
| Helper scripts | `none` unless exact paths are approved |

The Markdown YAML draft was not a direct copy target. Sprint 26 converted it into executable workflow steps at the approved path.

## Approved Trigger Shape

Future workflow triggers may include only:

- `pull_request`
- `push` to the protected branch
- `workflow_dispatch`

Do not use privileged pull request triggers, release triggers, deployment triggers, schedule triggers, or tag-driven release behavior.

## Command Matrix

Future CI may run these existing command categories:

- package-scoped web test, typecheck, and build
- package-scoped protocol test, typecheck, and build
- package-scoped contracts test, typecheck, and build
- workspace test, typecheck, and build
- JavaScript syntax checks with `node --check`
- local artifact manifest generation
- provenance verification
- public artifact scan
- redacted safe scans over allowlisted source, docs, public assets, and package metadata

Artifact and provenance commands stay advisory until protected CI exists.

## Blocked Commands

The workflow must not run deploy, fund, preflight, sign-manifest, anchor, verifier-chain, development server, live server, live export, wallet signing, mint, public hosting, or managed-infrastructure commands.

Syntax checking a script file with `node --check` is allowed when the script is not executed.

## Scan Boundary

Safe scans must reject excluded paths before reading content. Allowed output is limited to path, line, rule id, match class, count, decision, and `valuePrinted=false`.

Real env files, local runtime databases, browser state, generated caches, build outputs, and private local artifacts stay outside the workflow scan surface.

## Artifact Upload Boundary

Artifact upload is blocked until protected CI exists. Future upload metadata must include:

- workflow run id
- source commit
- branch
- artifact name
- file list
- byte counts
- file hashes
- retention
- manifest hash
- report hash
- verification decision

Do not upload local runtime databases or local env files.

## Preflight Checks Before Creation

Before approved workflow creation, record:

```powershell
Test-Path .git
Test-Path .github
Test-Path .github\workflows
Test-Path scripts\ci
Test-Path .gitignore
```

Expected immediately before Gate C execution depends on Gate A and Gate B:

- `.git=True` only if repository initialization was approved and completed
- `.github=False` unless created in the approved workflow step
- `.github/workflows=False` unless created in the approved workflow step
- `scripts/ci=False` when helper scripts are not approved
- `.gitignore=True`

## Stop Conditions

Stop if:

- Gate C approval is missing
- workflow path appears before approval or changes after approval
- helper paths appear before approval
- command matrix includes blocked commands
- workflow job names differ from the required-check list
- scan output would print matched values
- artifact upload is configured before protected CI exists

## Decision

Workflow creation readiness is documented. Sprint 26 workflow file creation is complete for `.github/workflows/ci.yml`; branch protection and protected CI remain blocked.

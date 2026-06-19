# GIWA Initial Commit File Policy

## Purpose

This document defines the file policy for a future first commit. It is not an approval record and does not authorize staging or commit creation.

## Prerequisites

Initial commit work can start only when:

1. Gate A has been explicitly approved and completed.
2. `.git=True` is confirmed.
3. Gate B explicitly approves initial commit creation.
4. The approval record says `stagingPolicy=allowlist-only`.
5. No remote, push, workflow, or branch protection authority is bundled into Gate B.

## Candidate Enumeration

After `.git=True`, use `git status --short` only to enumerate candidate paths. Do not stage files until every candidate path has been reviewed against this document.

## Allowlist Categories

The first commit may include only reviewed files in these categories:

- repository entrypoint and canonical product documentation
- sprint plans and implementation runbooks
- source files under reviewed package directories
- public static web assets
- public-safe evidence JSON and Markdown
- package manifests and lockfile
- workspace configuration
- `.gitignore`

## Excluded Categories

The first commit must exclude:

- local env files and env variants
- local runtime databases and journals
- runtime logs
- browser state and local test output folders
- generated caches
- Node and build outputs
- Hardhat cache and generated contract outputs
- local memory folders
- raw or private JSON variants
- wallet export files
- credential material or auth dumps

If a candidate path belongs to an excluded category, stop before commit creation.

## Ignore Coverage Review

Current `.gitignore` covers the known Sprint 25 classes for env files, credential material, local runtime data, Node output, build output, Hardhat output, local memory, raw/private JSON, and public-safe `.env.example`.

Before first staging, review coverage for future naming variants:

```text
*.log
*.sqlite
*.sqlite3
*.db
*.db-journal
.envrc
browser-state folders
test-output folders
generic cache folders
private JSON names outside *.raw.json and *.private.json
```

If coverage is missing, route the fix to a repository hygiene approval before staging.

## Staging Rules

- Prefer explicit file lists over broad staging.
- Broad staging is allowed only after all candidate paths have been reviewed.
- Staging review output may list path, category, decision, and reason.
- Staging review output must not print local env content, process env values, auth headers, local database rows, or matched credential values.

## Public Evidence Policy

Public-safe evidence may include public addresses, public transaction hashes, block fields, verifier status, receipt hashes, verifier input hashes, public routes, and approved snapshot paths.

Public evidence must not include local configuration, local runtime databases, auth headers, raw request bodies, browser state, wallet signing material, or server-only runtime values.

## Stop And Cleanup Route

| Event | Required response |
| --- | --- |
| Excluded file appears in candidate list | stop before staging and record blocked class |
| Excluded file is staged | unstage before commit and record blocked class |
| Initial commit is created without Gate B approval | stop all further git actions and require cleanup approval |
| Broad staging cannot be reviewed confidently | stop and require explicit per-path review |
| Ignore rule misses an excluded class | stop and route to repository hygiene approval |

History-changing cleanup, including amend, reset, drop, or rewrite operations, requires explicit cleanup approval.

## Reviewer Signoff Record

Use this table shape before any first commit:

| Path or path group | Category | Decision | Reviewer | Notes |
| --- | --- | --- | --- | --- |
| `README.md` | documentation | include-or-block | pending | reviewed before staging |
| `docs/**` | documentation/evidence | include-or-block | pending | public-safe subset only |
| `apps/web/public/**` | public asset | include-or-block | pending | manifest-covered files only |
| `packages/**` | source | include-or-block | pending | exclude generated outputs |
| `pnpm-lock.yaml` | lockfile | include-or-block | pending | drift must be explained |

## Decision

Initial commit preparation is documented. Commit creation remains blocked until Gate B approval is explicit in the active session.

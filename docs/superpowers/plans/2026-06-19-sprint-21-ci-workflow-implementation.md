# Sprint 21 CI Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the reviewed CI workflow and provenance reporting path for `GIWA Verified Intent Rail` without weakening the existing local/static demo boundaries.

**Architecture:** Sprint 21 is an execution plan, not execution. It separates user approval for repository transition, user approval for workflow-file creation, local advisory checks, protected GitHub CI, artifact provenance, and release-approval routing. Local non-git checks remain advisory; only protected CI from an immutable source commit can unblock staging provenance.

**Tech Stack:** Markdown plan, GitHub Actions future workflow design, Windows runner, PowerShell, Node `22.16.0`, root-pinned `pnpm@10.32.1`, TypeScript, Vitest, Hardhat build/test checks, Node syntax checks, SHA-256 artifact manifests.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-deployment-preparation.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `package.json`
- `apps/web/package.json`
- `packages/protocol/package.json`
- `packages/contracts/package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`

## Eight-Perspective Read-Only Analysis Summary

| Perspective | Sprint 21 design consequence |
| --- | --- |
| Git initialization / repository transition | `.git` creation is a separate user approval gate; first staging must review `.gitignore` and staged paths before any commit operation. |
| GitHub Actions workflow design | Future workflow path is `.github/workflows/ci-source-provenance.yml`; triggers avoid `pull_request_target`, permissions stay `contents: read`, and workflow output is CI artifact only. |
| CI command matrix and caching | Use Windows + PowerShell, Node `22.16.0`, `pnpm@10.32.1`, frozen lockfile install, package jobs, workspace aggregate jobs, public/script syntax checks, and pnpm-store-only cache. |
| Sensitive-surface scan strategy | CI scans allowlisted source/docs/public artifacts only, excludes real env files and local runtime state, and reports rule id plus redacted match class instead of matched text. |
| Artifact manifest and hash generation | Manifest and provenance report are separate JSON artifacts; SHA-256 covers lockfile, evidence inputs, public artifacts, and sorted build tree lines. |
| Branch protection / release approval | Branch protection, reviewer policy, required checks, release owner, and approval timestamp are required before provenance can unblock staging. |
| Local advisory checks vs authoritative CI | Local checks can prove tool availability and command exit codes only; protected CI proves immutable source, required checks, lockfile drift, and artifact provenance. |
| Failure triage and rollback routing | Source provenance, protected CI, artifact hash mismatch, non-matched receipt unlock, lockfile drift, scan failure, rollback gaps, and partner gaps each route to explicit blockers. |

## Sprint 21 Boundary

Allowed in this plan:

- Define the future repository transition task.
- Define the future GitHub Actions workflow implementation task.
- Define local advisory checks and protected CI checks.
- Define artifact manifest and provenance report schemas.
- Define safe-scan, branch protection, release approval, failure triage, rollback, and static fallback gates.
- Update sprint routing and documentation links.

Not allowed in this plan-writing sprint:

- Create `.git`.
- Create `.github` or workflow files.
- Run commit, branch, tag, push, merge, or remote setup commands.
- Public-host, deploy, connect managed infrastructure, or create release artifacts.
- Install or change dependencies.
- Send wallet actions or GIWA Sepolia transactions.
- Run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, mint commands, or live signing commands.
- Create fake CI result, fake source id, fake artifact hash, or fake release tag.
- Treat local checks as protected CI.
- Use Flashblocks as final confirmation evidence.

## Planned File Structure For Sprint 21 Execution

Future Sprint 21 execution may create or modify these files only after user approval:

```text
.github/workflows/ci-source-provenance.yml
docs/evidence/giwa-staging-artifact-manifest.schema.md
docs/evidence/giwa-staging-provenance-report.schema.md
scripts/ci/write-artifact-manifest.mjs
scripts/ci/write-provenance-report.mjs
scripts/ci/redacted-safe-scan.mjs
scripts/ci/assert-workflow-command-boundary.mjs
```

This plan-writing sprint creates only:

```text
docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md
```

and may link it from:

```text
docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
README.md
docs/implementation/giwa-staging-release-provenance.md
docs/implementation/giwa-staging-blocker-register.md
docs/implementation/giwa-commercial-readiness-gate.md
```

Sprint 21 execution, while workflow creation remains blocked, may create documentation-only dry-run artifacts:

```text
docs/implementation/giwa-ci-workflow-draft.md
docs/implementation/giwa-local-ci-simulation.md
docs/implementation/giwa-provenance-artifact-manifest.md
docs/implementation/giwa-release-approval-checklist.md
docs/implementation/giwa-ci-failure-triage.md
```

---

## Task 1: Sprint Routing And Approval Split

### Files

- Create: `docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `README.md`

- [ ] **Step 1: Write the failing route check**

Run before execution:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-21-ci-workflow-implementation.md
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-21-ci-workflow-implementation.md" -Quiet
Select-String -Path README.md -Pattern "Sprint 21 CI Workflow Implementation" -Quiet
```

Expected red state:

```text
The plan file check is True only after plan-writing. At least one link check is False before routing updates.
```

- [ ] **Step 2: Add Sprint 21 routing**

Add this sprint index row:

```markdown
| 21 | `2026-06-19-sprint-21-ci-workflow-implementation.md` | CI workflow implementation plan for approved git transition, reviewed workflow creation, protected checks, artifact provenance, and release approval routing | Sprint 20 approval |
```

Add this README hosted-readiness line:

```markdown
Sprint 21 CI Workflow Implementation is the next gated execution plan for source-control transition, reviewed workflow creation, and protected provenance checks.
```

- [ ] **Step 3: Verify routing**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-21-ci-workflow-implementation.md
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-21-ci-workflow-implementation.md" -Quiet
Select-String -Path README.md -Pattern "Sprint 21 CI Workflow Implementation" -Quiet
```

Expected:

```text
All checks return True.
```

## Task 2: Repository Transition User Approval Gate

### Files

- Future execute only after approval: `.git`
- Modify documentation only: `docs/implementation/giwa-staging-release-provenance.md`
- Modify documentation only: `docs/implementation/giwa-staging-blocker-register.md`

- [ ] **Step 1: Write the failing transition check**

Run:

```powershell
Test-Path .git
Test-Path .github
Test-Path .gitignore
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 21 Repository Transition Gate" -Quiet
```

Expected current state before Sprint 21 execution:

```text
False
False
True
False
```

- [ ] **Step 2: Require user approval before repository creation**

Record this gate in the execution notes before any repository transition command runs:

```markdown
## Sprint 21 Repository Transition Gate

Repository transition is blocked until the user explicitly approves it in the active session.

Before approval:

- `Test-Path .git` must remain `False`.
- `.gitignore` must be reviewed for `.env*`, local DB files, local runtime data, generated private artifacts, cache outputs, and build outputs.
- No commit, branch, tag, push, merge, or remote setup command may run.

After approval:

- Run `git init` or repository import only in the approved path.
- Review `git status --short` before first staging.
- Stage only reviewed source, docs, package manifests, lockfile, public artifacts, and approved evidence.
- Do not stage real env files, local DB files, wallet exports, runtime logs, cache folders, or local browser state.
- Record source commit only after the first approved commit exists.
```

- [ ] **Step 3: Verify transition is still gated**

Run:

```powershell
Test-Path .git
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 21 Repository Transition Gate" -Quiet
```

Expected in plan-writing or pre-approval state:

```text
False
True
```

## Task 3: Workflow File User Approval Gate

### Files

- Future create after approval: `.github/workflows/ci-source-provenance.yml`
- Modify documentation only: `docs/implementation/giwa-staging-release-provenance.md`

- [ ] **Step 1: Write the failing workflow-path check**

Run:

```powershell
Test-Path .github
Test-Path .github\workflows\ci-source-provenance.yml
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 21 Workflow Creation Gate" -Quiet
```

Expected current state before Sprint 21 execution:

```text
False
False
False
```

- [ ] **Step 2: Document workflow creation approval**

Add this gate before creating any workflow file:

```markdown
## Sprint 21 Workflow Creation Gate

Workflow creation is blocked until the user explicitly approves `.github/workflows/ci-source-provenance.yml`.

The planned workflow must:

- use `pull_request`, `push` to the protected branch, and optional manual dispatch
- avoid privileged pull request triggers
- use `permissions: contents: read`
- define job timeouts
- define concurrency cancellation for repeated branch pushes
- use Windows runner and PowerShell
- pin Node `22.16.0`
- activate root-pinned `pnpm@10.32.1`
- run only test, typecheck, build, syntax, safe-scan, and artifact-provenance jobs
- upload provenance JSON as CI artifact only
- not create release tags
- not deploy or public-host
```

- [ ] **Step 3: Verify workflow file is still absent before approval**

Run:

```powershell
Test-Path .github\workflows\ci-source-provenance.yml
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 21 Workflow Creation Gate" -Quiet
```

Expected before approval:

```text
False
True
```

## Task 4: Workflow Job Skeleton

### Files

- Future create after approval: `.github/workflows/ci-source-provenance.yml`
- Modify documentation only: `docs/implementation/giwa-staging-release-provenance.md`

- [ ] **Step 1: Write the failing skeleton check**

After workflow-file creation is approved, run:

```powershell
Test-Path .github\workflows\ci-source-provenance.yml
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "source-provenance" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "artifact-provenance" -Quiet
```

Expected red state before workflow creation:

```text
False
False
False
```

- [ ] **Step 2: Implement the minimal workflow skeleton after approval**

Create this workflow shape after user approval:

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

  install:
    runs-on: windows-latest
    timeout-minutes: 20
    needs: source-provenance

  web-checks:
    runs-on: windows-latest
    timeout-minutes: 20
    needs: install

  protocol-checks:
    runs-on: windows-latest
    timeout-minutes: 15
    needs: install

  contracts-checks:
    runs-on: windows-latest
    timeout-minutes: 25
    needs: install

  node-syntax-checks:
    runs-on: windows-latest
    timeout-minutes: 10
    needs: install

  safe-scans:
    runs-on: windows-latest
    timeout-minutes: 10
    needs: install

  workspace-checks:
    runs-on: windows-latest
    timeout-minutes: 30
    needs:
      - web-checks
      - protocol-checks
      - contracts-checks

  artifact-provenance:
    runs-on: windows-latest
    timeout-minutes: 10
    needs:
      - workspace-checks
      - node-syntax-checks
      - safe-scans
```

- [ ] **Step 3: Verify skeleton**

Run:

```powershell
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pull_request_target" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "permissions:" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "contents: read" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "artifact-provenance" -Quiet
```

Expected after approval and implementation:

```text
False
True
True
True
```

## Task 5: Install Job And Cache Boundary

### Files

- Future modify after approval: `.github/workflows/ci-source-provenance.yml`

- [ ] **Step 1: Write the failing install check**

Run after workflow skeleton exists:

```powershell
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm@10.32.1" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "frozen-lockfile" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm-store" -Quiet
```

Expected red state before install implementation:

```text
At least one check returns False.
```

- [ ] **Step 2: Implement install job**

Use these commands in the `install` job:

```powershell
node --version
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm --version
pnpm install --frozen-lockfile
```

Cache rule:

```text
Cache pnpm store only.
Cache key: pnpm-store-${{ runner.os }}-node-22.16.0-pnpm-10.32.1-${{ hashFiles('pnpm-lock.yaml') }}
Do not cache node_modules, local DB files, env files, contract cache/artifacts, dist, coverage, browser state, or generated runtime data.
```

- [ ] **Step 3: Verify install job**

Run:

```powershell
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm@10.32.1" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm install --frozen-lockfile" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm-store" -Quiet
```

Expected:

```text
All checks return True.
```

## Task 6: Package And Workspace Check Matrix

### Files

- Future modify after approval: `.github/workflows/ci-source-provenance.yml`

- [ ] **Step 1: Write failing command checks**

Run after workflow skeleton exists:

```powershell
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm --filter @giwa/web --fail-if-no-match test" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm --filter @giwa/protocol --fail-if-no-match build" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm --filter @giwa/contracts --fail-if-no-match build" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm typecheck" -Quiet
```

Expected red state before command matrix:

```text
At least one check returns False.
```

- [ ] **Step 2: Add package commands**

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

Note: local `pnpm build` can regenerate public artifacts through the web package export script. In non-git mode this is advisory only. Protected CI must own the final artifact manifest.

- [ ] **Step 3: Verify command matrix**

Run:

```powershell
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm --filter @giwa/web --fail-if-no-match build" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm --filter @giwa/protocol --fail-if-no-match build" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm --filter @giwa/contracts --fail-if-no-match build" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "pnpm build" -Quiet
```

Expected:

```text
All checks return True.
```

## Task 7: Node Syntax Checks

### Files

- Future modify after approval: `.github/workflows/ci-source-provenance.yml`

- [ ] **Step 1: Write failing syntax-target checks**

Run:

```powershell
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "node --check apps/web/public/flow.js" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "node --check apps/web/scripts/export-live-demo-snapshot.mjs" -Quiet
```

Expected red state before syntax job:

```text
At least one check returns False.
```

- [ ] **Step 2: Add syntax commands**

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/export-flow-data.mjs
node --check apps/web/scripts/export-live-demo-snapshot.mjs
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

- [ ] **Step 3: Verify syntax job**

Run:

```powershell
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "node --check apps/web/public/demo-control-room.js" -Quiet
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "node --check apps/web/scripts/serve-static.mjs" -Quiet
```

Expected:

```text
Both checks return True.
```

## Task 8: CI Forbidden Command Guard

### Files

- Future modify after approval: `.github/workflows/ci-source-provenance.yml`
- Future create after approval: `scripts/ci/assert-workflow-command-boundary.mjs`

- [ ] **Step 1: Write failing guard test**

Create a test fixture in the guard script implementation that fails when workflow text contains any forbidden command token:

```javascript
const forbiddenTokens = [
  "deploy:local",
  "deploy:giwa",
  "fund:giwa",
  "preflight:giwa",
  "sign:manifest",
  "anchor:giwa",
  "verify:giwa",
  "mint",
  "serve:live",
  "dev:live",
  "export:live-demo"
];
```

Run:

```powershell
node scripts/ci/assert-workflow-command-boundary.mjs .github/workflows/ci-source-provenance.yml
```

Expected red state before guard implementation:

```text
The command fails because the guard script does not exist.
```

- [ ] **Step 2: Implement minimal guard**

The guard reads only the workflow file path passed as argv, checks forbidden tokens, and prints token names only when configured to print rule ids. It must not scan env files, local DB files, or process environment values.

Expected failure example:

```text
workflow_command_boundary_violation: deploy:giwa
```

- [ ] **Step 3: Verify guard**

Run:

```powershell
node scripts/ci/assert-workflow-command-boundary.mjs .github/workflows/ci-source-provenance.yml
```

Expected:

```text
No output and exit 0 when the workflow contains only approved commands.
```

## Task 9: Safe-Scan Job Boundary

### Files

- Future create after approval: `scripts/ci/redacted-safe-scan.mjs`
- Future modify after approval: `.github/workflows/ci-source-provenance.yml`

- [ ] **Step 1: Write failing safe-scan command check**

Run:

```powershell
Test-Path scripts\ci\redacted-safe-scan.mjs
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "redacted-safe-scan" -Quiet
```

Expected red state before implementation:

```text
False
False
```

- [ ] **Step 2: Implement redacted scan policy**

The scanner may inspect only these allowlisted surfaces:

```text
README.md
03_giwa_verified_intent_rail_positioning.md
docs/implementation/*.md
docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md
docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md
apps/web/src
apps/web/public
apps/web/scripts
packages/protocol/src
packages/contracts/contracts
packages/contracts/scripts
packages/contracts/test
package.json
apps/web/package.json
packages/protocol/package.json
packages/contracts/package.json
pnpm-workspace.yaml
pnpm-lock.yaml
```

The scanner must exclude:

```text
.env
.env.local
.env.*
.engram
apps/web/.data
*.sqlite
*.db
*.raw.json
*.private.json
node_modules
.next
dist
coverage
.turbo
packages/contracts/cache
packages/contracts/artifacts
packages/contracts/typechain-types
```

Output shape:

```json
{
  "ruleId": "unsupported-claim",
  "path": "README.md",
  "line": 123,
  "matchClass": "guardrail-example",
  "decision": "allowed"
}
```

Matched text and value snippets are never printed.

- [ ] **Step 3: Verify safe-scan job**

Run:

```powershell
node scripts/ci/redacted-safe-scan.mjs --mode ci
Select-String -Path .github\workflows\ci-source-provenance.yml -Pattern "redacted-safe-scan.mjs" -Quiet
```

Expected:

```text
The scanner exits 0 when only guardrail examples are present, and the workflow references the scanner.
```

## Task 10: Artifact Manifest Schema And Writer

### Files

- Future create after approval: `docs/evidence/giwa-staging-artifact-manifest.schema.md`
- Future create after approval: `scripts/ci/write-artifact-manifest.mjs`
- Future output from protected CI only: `docs/evidence/giwa-staging-artifact-manifest.json`

- [ ] **Step 1: Write failing schema/writer checks**

Run:

```powershell
Test-Path docs\evidence\giwa-staging-artifact-manifest.schema.md
Test-Path scripts\ci\write-artifact-manifest.mjs
```

Expected red state before implementation:

```text
False
False
```

- [ ] **Step 2: Define artifact manifest schema**

Schema fields:

```json
{
  "schemaVersion": "1",
  "releaseId": "giwa-intent-rail-staging-YYYYMMDD",
  "stage": "staging-testnet",
  "generatedAt": "ISO-8601",
  "sourceCommit": "github-sha-from-protected-ci",
  "sourceTreeStatus": "clean",
  "ci": {
    "workflowPath": ".github/workflows/ci-source-provenance.yml",
    "runId": "github-run-id",
    "runAttempt": "github-run-attempt",
    "runnerOs": "Windows",
    "nodeVersion": "22.16.0",
    "pnpmVersion": "10.32.1"
  },
  "sourceLockfiles": [
    { "path": "pnpm-lock.yaml", "sha256": "computed", "bytes": 0 }
  ],
  "evidenceInputs": [
    { "path": "docs/evidence/giwa-sepolia-chain-anchor.json", "sha256": "computed", "bytes": 0 },
    { "path": "docs/evidence/giwa-sepolia-mvp-evidence.json", "sha256": "computed", "bytes": 0 }
  ],
  "artifacts": [
    { "path": "apps/web/public/flow-data.json", "sha256": "computed", "bytes": 0, "role": "public-artifact", "generatedBy": "pnpm --filter @giwa/web --fail-if-no-match build" },
    { "path": "apps/web/public/partner-snapshot.json", "sha256": "computed", "bytes": 0, "role": "public-artifact", "generatedBy": "pnpm --filter @giwa/web --fail-if-no-match build" },
    { "path": "apps/web/public/live-demo-snapshot.json", "sha256": "computed", "bytes": 0, "role": "public-artifact", "generatedBy": "approved-export-or-checked-in" },
    { "path": "docs/evidence/live-demo-sprint12-snapshot.json", "sha256": "computed", "bytes": 0, "role": "evidence-output", "generatedBy": "approved-export-or-checked-in" }
  ],
  "buildTreeSha256": "computed-from-sorted-lines",
  "checks": {
    "install": "pass",
    "web": "pass",
    "protocol": "pass",
    "contracts": "pass",
    "workspace": "pass",
    "syntax": "pass",
    "safeScans": "pass",
    "commandBoundary": "pass"
  }
}
```

Hash rule:

```text
Normalize paths to repo-relative POSIX style.
Compute file SHA-256 for every manifest entry.
Build tree input is sorted lines: <sha256><two spaces><normalized-path><newline>.
Compute buildTreeSha256 from the UTF-8 bytes of the sorted lines.
```

- [ ] **Step 3: Verify schema/writer**

Run:

```powershell
node scripts/ci/write-artifact-manifest.mjs --dry-run
Test-Path docs\evidence\giwa-staging-artifact-manifest.schema.md
```

Expected:

```text
The dry run prints only paths, byte counts, hash placeholders or hashes, and exits 0.
```

## Task 11: Provenance Report Schema And Writer

### Files

- Future create after approval: `docs/evidence/giwa-staging-provenance-report.schema.md`
- Future create after approval: `scripts/ci/write-provenance-report.mjs`
- Future output from protected CI only: `docs/evidence/giwa-staging-provenance-report.json`

- [ ] **Step 1: Write failing report checks**

Run:

```powershell
Test-Path docs\evidence\giwa-staging-provenance-report.schema.md
Test-Path scripts\ci\write-provenance-report.mjs
```

Expected red state before implementation:

```text
False
False
```

- [ ] **Step 2: Define provenance report schema**

Schema fields:

```json
{
  "schemaVersion": "1",
  "manifestPath": "docs/evidence/giwa-staging-artifact-manifest.json",
  "releaseId": "giwa-intent-rail-staging-YYYYMMDD",
  "source": {
    "commit": "github-sha-from-protected-ci",
    "branch": "protected-branch",
    "protectedBranch": true,
    "dirtyStatus": "clean",
    "lockfileSha256": "computed"
  },
  "workflow": {
    "path": ".github/workflows/ci-source-provenance.yml",
    "runId": "github-run-id",
    "requiredChecks": [
      "install",
      "web-checks",
      "protocol-checks",
      "contracts-checks",
      "workspace-checks",
      "node-syntax-checks",
      "safe-scans",
      "artifact-provenance"
    ]
  },
  "approvals": {
    "releaseOwner": "required-before-promotion",
    "reviewerPolicy": "required-before-promotion",
    "mergePolicy": "required-before-promotion",
    "approvedAt": "required-before-promotion"
  },
  "blockedActions": {
    "chainOperations": "not-run",
    "walletActions": "not-run",
    "publicHosting": "not-run",
    "dependencyChanges": "not-run"
  },
  "scanSummary": [
    { "ruleId": "unsupported-claim", "filesScanned": 0, "redactedMatchCount": 0, "decision": "pass" }
  ],
  "promotionDecision": "blocked-until-release-approval"
}
```

- [ ] **Step 3: Verify report writer**

Run:

```powershell
node scripts/ci/write-provenance-report.mjs --dry-run
Test-Path docs\evidence\giwa-staging-provenance-report.schema.md
```

Expected:

```text
The dry run prints no environment values and exits 0.
```

## Task 12: Local Advisory Checks Versus Protected CI

### Files

- Modify documentation only: `docs/implementation/giwa-staging-release-provenance.md`
- Modify documentation only: `docs/implementation/giwa-staging-blocker-register.md`

- [ ] **Step 1: Write failing separation check**

Run:

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 21 Local Advisory Versus Protected CI" -Quiet
```

Expected red state before documentation update:

```text
False
```

- [ ] **Step 2: Add separation policy**

Add:

```markdown
## Sprint 21 Local Advisory Versus Protected CI

Local non-git checks can prove only tool availability, syntax, command exit codes, and documentation route consistency.

Only protected CI can prove:

- immutable source commit
- branch protection enforcement
- required checks enforcement
- clean lockfile and package state from a fresh checkout
- workflow run id
- artifact manifest generated by CI
- provenance report generated by CI
- release approval readiness

Local checks must not populate final source commit, CI run id, release tag, or final artifact provenance fields.
```

- [ ] **Step 3: Verify separation policy**

Run:

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 21 Local Advisory Versus Protected CI" -Quiet
```

Expected:

```text
True
```

## Task 13: Branch Protection And Release Approval Checklist

### Files

- Modify documentation only: `docs/implementation/giwa-staging-release-provenance.md`
- Modify documentation only: `docs/implementation/giwa-commercial-readiness-gate.md`

- [ ] **Step 1: Write failing approval check**

Run:

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 21 Branch Protection And Release Approval" -Quiet
```

Expected:

```text
False
```

- [ ] **Step 2: Add approval checklist**

```markdown
## Sprint 21 Branch Protection And Release Approval

Release approval requires:

- `.git=True`
- `.github=True`
- workflow path reviewed
- protected branch name recorded
- reviewer policy recorded
- merge policy recorded
- required checks enabled
- immutable source commit recorded
- frozen lockfile install passed
- package and workspace checks passed
- syntax checks passed
- safe scans passed
- artifact manifest generated by CI
- provenance report generated by CI
- static fallback route smoke remains green
- matched-only receipt gate remains green
- release owner recorded
- approval timestamp recorded
```

- [ ] **Step 3: Verify approval checklist**

Run:

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 21 Branch Protection And Release Approval" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Sprint 21 CI Workflow Implementation Gate" -Quiet
```

Expected:

```text
Both checks return True after documentation links are added.
```

## Task 14: Failure Triage And Rollback Routing

### Files

- Modify documentation only: `docs/implementation/giwa-staging-blocker-register.md`
- Modify documentation only: `docs/implementation/giwa-staging-release-provenance.md`

- [ ] **Step 1: Write failing triage check**

Run:

```powershell
Select-String -Path docs\implementation\giwa-staging-blocker-register.md -Pattern "Sprint 21 Failure Triage" -Quiet
```

Expected:

```text
False
```

- [ ] **Step 2: Add failure triage table**

```markdown
## Sprint 21 Failure Triage

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | Sprint 21 plan missing | plan path check is false | approval gap | do not execute CI workflow work |
| P1 | source provenance failed | `.git=False` or `.github=False` | source provenance gate | block staging and keep local checks advisory |
| P1 | protected CI absent or failing | workflow path, required checks, or artifact generation missing | protected CI blocker | block release provenance |
| P1 | artifact hash mismatch | build tree or public artifact hash changes after manifest | no-rebuild promotion gate | stop promotion and regenerate from protected source |
| P1 | non-matched receipt unlock | pending or failed state opens receipt | commercial receipt gate | lock receipt/export and replay standard RPC evidence |
| P2 | lockfile drift | frozen install fails or rewrites lockfile | dependency policy | block until approved drift is recorded |
| P2 | safe scan failure | unsupported claim or sensitive surface failure | evidence boundary | quarantine artifact, correct source, rerun scans |
| P2 | rollback prerequisites missing | no manifest, prior checksum, owner, or static fallback | rollback gate | block promotion |
| P2 | partner promotion gap | signoff absent or blocker register open | partner gate | no-go for beta or staging promotion |
```

Rollback relationship:

```markdown
Rollback can replace app artifacts and lock new writes. Rollback cannot reverse public GIWA Sepolia evidence. Static fallback remains the continuity surface and must stay GET-only, labeled as recorded GIWA Sepolia testnet evidence, and hash-verified.
```

- [ ] **Step 3: Verify triage table**

Run:

```powershell
Select-String -Path docs\implementation\giwa-staging-blocker-register.md -Pattern "Sprint 21 Failure Triage" -Quiet
Select-String -Path docs\implementation\giwa-staging-blocker-register.md -Pattern "artifact hash mismatch" -Quiet
```

Expected:

```text
Both checks return True.
```

## Task 15: Final Verification And Handoff

### Files

- `docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `README.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`

- [ ] **Step 1: Run plan existence check**

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-21-ci-workflow-implementation.md
```

Expected:

```text
True
```

- [ ] **Step 2: Run unfinished-marker scan**

```powershell
$unfinishedPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $unfinishedPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

Expected:

```text
No active implementation markers in the created or modified Sprint 21 documents.
```

- [ ] **Step 3: Run unsupported-claim scan**

```powershell
$claimPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment")
rg -n $claimPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

Expected:

```text
Existing guardrail examples only. New Sprint 21 plan text has no matches.
```

- [ ] **Step 4: Run Sprint 21 sensitive-surface scan**

```powershell
$surfacePattern = "private " + "key|mnem" + "onic|bear" + "er|api " + "key|sec" + "ret"
rg -n $surfacePattern docs\superpowers\plans\2026-06-19-sprint-21-ci-workflow-implementation.md
```

Expected:

```text
No matches.
```

- [ ] **Step 5: Confirm no implementation files were created during plan-writing**

```powershell
Test-Path .git
Test-Path .github
Test-Path .github\workflows
```

Expected current plan-writing state:

```text
False
False
False
```

## Sprint 21 Exit Gate

Sprint 21 plan-writing is complete when:

- this plan exists
- Sprint index links Sprint 21
- README links Sprint 21
- repository transition approval is separated from workflow creation approval
- local advisory checks are separated from protected CI
- planned workflow jobs are documented
- required CI command matrix is documented
- cache boundary is documented
- CI safe-scan boundary is documented without real env file access
- artifact manifest schema is documented
- provenance report schema is documented
- branch protection and release approval checklist are documented
- failure triage and rollback routing are documented
- `.git`, `.github`, and workflow files remain uncreated in this plan-writing sprint
- no public hosting, deployment, managed infrastructure, wallet action, GIWA chain-operation command, dependency installation, fake CI result, fake release tag, or fake artifact hash is created

## Sprint 22 Candidates

Choose exactly one after user approval:

```text
docs/superpowers/plans/2026-06-19-sprint-22-artifact-manifest-local-implementation.md
docs/superpowers/plans/2026-06-19-sprint-22-hosted-adapter-implementation.md
docs/superpowers/plans/2026-06-19-sprint-22-staging-deployment-dry-run.md
```

Recommended next path:

```text
docs/superpowers/plans/2026-06-19-sprint-22-artifact-manifest-local-implementation.md
```

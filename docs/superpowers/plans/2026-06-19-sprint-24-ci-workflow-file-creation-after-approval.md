# Sprint 24 CI Workflow File Creation After Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the approval-gated path for creating a GitHub Actions workflow file for GIWA Verified Intent Rail without turning local-advisory provenance into protected CI provenance.

**Architecture:** Sprint 24 is a planning sprint. It separates repository initialization, workflow file creation, and branch protection into explicit user approval gates. It consumes Sprint 21 workflow draft material and Sprint 22/23 local-advisory artifact outputs, but it does not create repository metadata, workflow files, CI helper scripts, hosted infrastructure, or release-grade provenance.

**Tech Stack:** Documentation plan for a pnpm workspace with TypeScript, Vitest, Hardhat, static web assets, local artifact manifest tooling, and future GitHub Actions.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md`
- `docs/superpowers/plans/2026-06-19-sprint-22-artifact-manifest-local-implementation.md`
- `docs/superpowers/plans/2026-06-19-sprint-23-provenance-report-local-implementation.md`
- `docs/implementation/giwa-ci-workflow-draft.md`
- `docs/implementation/giwa-local-ci-simulation.md`
- `docs/implementation/giwa-provenance-artifact-manifest.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/evidence/local-artifact-manifest.json`
- `docs/evidence/local-provenance-report.json`
- `docs/evidence/local-provenance-verification.json`
- `apps/web/package.json`
- `package.json`
- `pnpm-workspace.yaml`

## Current State

Sprint 23 has produced local-advisory evidence:

- Manifest hash: `a8b25f37811b8037185b52693c6cbc6e72ef0eab86487eb59a42de6dcee82bf0`
- Report hash: `8cae49a35ad7db56a9c57167c790f57605779700cabf9af7b9d1c31a96d225f0`
- Verification decision: `pass`
- Known blockers: `source-provenance`, `protected-ci`
- Repository state: `.git=False`, `.github=False`, `.github/workflows=False`

These facts remain advisory until a user-approved repository transition and protected CI setup exists.

## Eight-Perspective Planning Review

| Perspective | Sprint 24 plan consequence |
|---|---|
| Approval gate reviewer | The plan must separate approval for repository initialization, workflow file creation, and protected check enforcement. No gate is implied by a previous sprint. |
| Git initialization reviewer | `.git=False` means there is no authoritative source commit, branch, or pull request context. Any future repository transition must be its own approved action. |
| GitHub Actions YAML reviewer | The workflow draft source is `docs/implementation/giwa-ci-workflow-draft.md`. Sprint 24 may specify the file path, triggers, job names, cache policy, and validation commands, but must not create `.github/workflows`. |
| CI command matrix reviewer | The workflow must preserve existing package scripts only, run artifact/provenance checks after build-producing commands, and avoid draft-only commands unless their scripts are created in the same approved change. |
| Artifact/provenance integration reviewer | `artifact:scan`, `artifact:local`, and `artifact:provenance:verify -- --check` must bind to the Sprint 22/23 evidence contract and stay local-advisory until protected CI runs them from immutable source. |
| Env and credential safety reviewer | CI must not read raw local env files or print process env values. Future workflow checks should use redacted readiness and public artifact scans only. |
| Branch protection reviewer | Protected checks require a GitHub repository, required status checks, and branch rules. A workflow file alone cannot satisfy protected CI. |
| Failure and rollback reviewer | Failed checks route to the CI failure triage document. Demo fallback remains the static local submission pack while staging remains blocked. |

## Scope

Sprint 24 plans how a future execution sprint may create a workflow file only after explicit approval. It records the file boundary, dry-run checks, command matrix, artifact policy, branch protection requirements, and failure routing.

Sprint 24 may update documentation links so reviewers can find the plan.

## Non-Goals

Sprint 24 does not:

- initialize git
- create `.github`, `.github/workflows`, workflow files, or CI helper scripts
- create source commits, branches, tags, or pushed refs
- run public hosting or deployment
- connect hosted storage, managed runtime, or cloud credential systems
- send wallet actions from scripts or servers
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- generate fake CI results, fake artifact hashes, or fake release tags
- claim protected CI provenance or release-grade provenance
- expand product claims beyond the testnet MVP boundary

## Approval Gates

Sprint 24 execution must keep these gates distinct:

### Gate 1: Git Repository Initialization Approval

Required before any of these commands or effects:

- `git init`
- branch creation
- commit creation
- remote configuration
- push or pull request setup

Evidence required after approval:

- `Test-Path .git` returns `True`
- initial branch policy is documented
- ignored files are reviewed before the first commit
- no local env file is staged or copied into evidence

### Gate 2: `.github/workflows` File Creation Approval

Required before creating:

- `.github`
- `.github/workflows`
- `.github/workflows/ci-source-provenance.yml`
- any CI helper script

Evidence required before creation:

- Sprint 24 dry-run commands pass locally
- workflow source has been reviewed against `docs/implementation/giwa-ci-workflow-draft.md`
- file path and workflow name are confirmed by the user
- workflow uses `permissions: contents: read`
- workflow uses only `pull_request`, `push` to `main`, and `workflow_dispatch` triggers
- workflow uses Node `22.16.0`, `pnpm@10.32.1`, frozen install, and pnpm-store-only cache
- workflow command-boundary and safe-scan helpers are either created in the same approved change or omitted from the workflow

### Gate 3: Branch Protection and Required Checks Approval

Required before configuring:

- protected branch rules
- required status checks
- pull request review rules
- deployment promotion rules

Evidence required after approval:

- required check names match workflow job names
- direct push policy is documented
- rollback route references the static fallback and blocker register
- protected branch name, reviewer policy, merge policy, release owner, and approval timestamp are recorded

Required check candidates:

- `source-provenance`
- `workflow-command-boundary`
- `web-checks`
- `protocol-checks`
- `contracts-checks`
- `node-syntax-checks`
- `safe-scans`
- `workspace-checks`
- `artifact-provenance`

## Non-Git Mode Blockers

When `.git=False`, these remain blocked:

- source commit binding
- pull request check authority
- branch protection
- release tag authority
- protected artifact upload authority
- hosted deployment promotion

When `.github=False` or `.github/workflows=False`, these remain blocked:

- GitHub Actions execution
- required workflow checks
- workflow artifact retention
- protected CI provenance

The Sprint 22/23 outputs may still be used as local-advisory evidence, not release approval evidence.

## Workflow File Creation Dry-Run

Before any workflow file exists, run the local command matrix from a clean terminal:

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
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/export-flow-data.mjs
node --check apps/web/scripts/export-live-demo-snapshot.mjs
node --check apps/web/scripts/export-artifact-manifest.mjs
node --check apps/web/scripts/verify-provenance-report.mjs
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
```

Expected result:

```text
All commands exit 0.
Generated local evidence remains authority=local-advisory.
Known blockers remain source-provenance and protected-ci until repository and workflow approvals are completed.
```

## GitHub Actions YAML Draft Source

The workflow draft source is `docs/implementation/giwa-ci-workflow-draft.md`. Sprint 24 execution may create the workflow file only after Gate 2 approval.

Planned future path:

```text
.github/workflows/ci-source-provenance.yml
```

Planned workflow shape:

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

jobs:
  source-provenance:
    runs-on: ubuntu-latest
  workflow-command-boundary:
    runs-on: ubuntu-latest
  web-checks:
    runs-on: ubuntu-latest
  protocol-checks:
    runs-on: ubuntu-latest
  contracts-checks:
    runs-on: ubuntu-latest
  node-syntax-checks:
    needs:
      - web-checks
      - protocol-checks
      - contracts-checks
    runs-on: ubuntu-latest
  safe-scans:
    runs-on: ubuntu-latest
  workspace-checks:
    needs:
      - web-checks
      - protocol-checks
      - contracts-checks
    runs-on: ubuntu-latest
  artifact-provenance:
    needs:
      - workspace-checks
      - node-syntax-checks
      - safe-scans
    runs-on: ubuntu-latest
```

This YAML is a planning sketch. It is not a workflow file and does not run CI.

Every command-running job should begin with:

```powershell
node --version
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm --version
pnpm install --frozen-lockfile
```

Do not add workflow permissions beyond read-only content access unless a later approval explicitly changes the release model.

## CI Command Matrix

| Job | Commands |
|---|---|
| source-provenance | after repository approval only: bind workflow run to immutable source commit and branch |
| workflow-command-boundary | after helper creation approval only: assert workflow does not call runtime, hosted, deployment, wallet, or chain-operation commands |
| web | `pnpm --filter @giwa/web --fail-if-no-match test`, `pnpm --filter @giwa/web --fail-if-no-match typecheck`, `pnpm --filter @giwa/web --fail-if-no-match build` |
| protocol | `pnpm --filter @giwa/protocol --fail-if-no-match test`, `pnpm --filter @giwa/protocol --fail-if-no-match typecheck`, `pnpm --filter @giwa/protocol --fail-if-no-match build` |
| contracts | `pnpm --filter @giwa/contracts --fail-if-no-match test`, `pnpm --filter @giwa/contracts --fail-if-no-match typecheck`, `pnpm --filter @giwa/contracts --fail-if-no-match build` |
| node syntax | `node --check apps/web/public/flow.js`, `node --check apps/web/public/live-flow.js`, `node --check apps/web/public/demo-control-room.js`, `node --check apps/web/scripts/export-flow-data.mjs`, `node --check apps/web/scripts/export-live-demo-snapshot.mjs`, `node --check apps/web/scripts/export-artifact-manifest.mjs`, `node --check apps/web/scripts/verify-provenance-report.mjs`, `node --check apps/web/scripts/serve-live.mjs`, `node --check apps/web/scripts/serve-static.mjs` |
| safe scans | unfinished-marker scan, unsupported-claim scan, credential-pattern scan excluding local env files; future helper may be `node scripts/ci/redacted-safe-scan.mjs --mode ci` only after helper creation approval |
| workspace | `pnpm test`, `pnpm typecheck`, `pnpm build` |
| artifact | `pnpm --filter @giwa/web --fail-if-no-match test -- provenance`, `pnpm --filter @giwa/web --fail-if-no-match artifact:scan`, `pnpm --filter @giwa/web --fail-if-no-match artifact:local`, `pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify`, `pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check` |

Run package-scoped tests before workspace-level aggregate checks when diagnosing failures. Run artifact/provenance commands after build-producing commands because public JSON artifacts may be refreshed by the web build. Do not run build and contract tests in parallel if cache writes collide.

Do not reference `artifact:provenance:check`, `artifact:drift`, or `artifact:commands` until those scripts exist.

## Workflow Command Boundary

Future workflow content must avoid command paths that send transactions, start long-running local servers, export live demo snapshots, or perform deployment-style actions.

Blocked workflow commands include:

- `deploy:local`
- `deploy:giwa`
- `fund:giwa`
- `preflight:giwa`
- `sign:manifest`
- `anchor:giwa`
- `verify:giwa`
- `dev`
- `serve`
- `dev:live`
- `serve:live`
- `export:live-demo`

Syntax checks against script files are allowed because they do not execute the runtime path.

## Env and Credential Boundary

Future CI must:

- avoid reading raw local env files
- avoid printing sensitive env values
- use repository-managed CI variables only after approval
- keep public artifact scans limited to public asset and evidence paths
- treat any sensitive pattern in public files as a blocking failure until reviewed
- report scan findings by path, rule id, match class, count, and decision, without printing matched values
- reject excluded paths before reading content

The workflow must not require wallet signing material or RPC tokens for local-advisory artifact checks.

## Artifact Upload Policy

Artifacts may be uploaded only after a protected CI run exists. Until then, local files remain local-advisory. Future uploads are CI artifacts only, not release assets and not public-hosted artifacts.

Future upload candidates:

- `docs/evidence/local-artifact-manifest.json`
- `docs/evidence/local-provenance-report.json`
- `docs/evidence/local-provenance-report.json.sha256`
- `docs/evidence/local-provenance-verification.json`
- `docs/evidence/local-command-evidence-report.json`

Upload metadata must include:

- workflow run id
- source commit
- branch name
- artifact name
- uploaded file list
- uploaded byte counts and hashes
- artifact retention period
- CI artifact-only classification
- manifest hash
- report hash
- verification decision

Upload is blocked if `artifact:scan` fails or if `docs/evidence/local-provenance-verification.json` does not report a passing verification decision.

Do not upload private local DB files or raw local env files.

## Failure Triage and Rollback Route

Failure handling routes:

| Failure | Immediate action | Owner evidence |
|---|---|---|
| install failure | inspect lockfile and package manager version | `package.json`, `pnpm-lock.yaml` |
| web failure | isolate web tests, typecheck, build, and syntax checks | `apps/web/package.json` |
| protocol failure | isolate protocol tests and build | `packages/protocol/package.json` |
| contracts failure | isolate Hardhat build and Vitest output | `packages/contracts/package.json` |
| artifact failure | rerun artifact command with `--check` where supported | `docs/evidence/local-provenance-verification.json` |
| scan failure | review finding without printing raw sensitive values | scanner summary only |
| protected check mismatch | compare branch rule names with job names | repository settings screenshot or exported policy |

Rollback route:

1. Remove the workflow file only with explicit approval.
2. Keep static demo and local live evidence available.
3. Record the blocker in `docs/implementation/giwa-staging-blocker-register.md`.
4. Re-run local-advisory artifact verification before retrying protected CI setup.

## Task Plan

### Task 1: Record Sprint 24 Routing

- [ ] Add this plan file at `docs/superpowers/plans/2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md`.
- [ ] Add Sprint 24 to `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`.
- [ ] Link Sprint 24 from `README.md` if hosted readiness links remain the reviewer entry point.

Failing check before edit:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md
```

Expected before edit:

```text
False
```

Passing check after edit:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md
```

Expected after edit:

```text
True
```

### Task 2: Lock Approval Gates

- [ ] Confirm the plan has the three approval gates: repository initialization, workflow file creation, and branch protection.
- [ ] Confirm each gate states what is blocked before approval.
- [ ] Confirm Sprint 24 plan-writing does not authorize the actions behind those gates.

Check:

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md -Pattern "Gate 1","Gate 2","Gate 3"
```

Expected:

```text
Three gate headings are present.
```

### Task 3: Preserve Non-Git Boundary

- [ ] Record `.git=False`, `.github=False`, and `.github/workflows=False`.
- [ ] State that workflow files alone cannot create protected CI.
- [ ] Keep local-advisory evidence distinct from protected CI provenance.

Check:

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md -Pattern "local-advisory","protected CI",".git=False"
```

Expected:

```text
All boundary phrases are present.
```

### Task 4: Specify Workflow Draft and Command Matrix

- [ ] Reference `docs/implementation/giwa-ci-workflow-draft.md` as the YAML source.
- [ ] Specify the future workflow path without creating it.
- [ ] Include package-scoped and workspace-level commands.
- [ ] Include `artifact:local`, `artifact:provenance:verify -- --check`, and `artifact:scan`.

Check:

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md -Pattern "artifact:local","artifact:provenance:verify -- --check","artifact:scan"
```

Expected:

```text
All artifact commands are present.
```

### Task 5: Specify Env and Credential Boundary

- [ ] State that raw local env files are excluded from CI and scans.
- [ ] State that public artifact scans are limited to public-safe paths.
- [ ] State that sensitive pattern matches in public files block workflow promotion until reviewed.

Check:

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md -Pattern "raw local env files","public artifact scans","sensitive pattern"
```

Expected:

```text
All env and credential boundary phrases are present.
```

### Task 6: Define Artifact Upload Policy

- [ ] Keep upload blocked until protected CI exists.
- [ ] List candidate local evidence outputs.
- [ ] Require source commit and workflow run id in upload metadata after CI exists.

Check:

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md -Pattern "workflow run id","source commit","local-provenance-verification.json"
```

Expected:

```text
Upload metadata and evidence paths are present.
```

### Task 7: Define Failure Triage and Rollback

- [ ] Route CI failures to command-specific triage.
- [ ] Keep static demo and local live evidence as fallback surfaces.
- [ ] Require blocker register updates for staging blockers.

Check:

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md -Pattern "Failure Triage","Rollback route","giwa-staging-blocker-register.md"
```

Expected:

```text
Failure and rollback sections are present.
```

### Task 8: Verify Documentation Safety

- [ ] Run the documentation path check.
- [ ] Run unfinished-marker scan.
- [ ] Run unsupported-claim scan.
- [ ] Run credential-pattern scan against this Sprint 24 plan.
- [ ] Confirm `.git`, `.github`, workflow files, and CI scripts were not created.

Commands:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment")
$credentialPattern = ("private ke" + "y") + "|" + ("mnem" + "onic") + "|" + ("bear" + "er") + "|" + ("api " + "key") + "|" + ("sec" + "ret")
rg -n $docPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $riskPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $credentialPattern docs\superpowers\plans\2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md
Test-Path .git
Test-Path .github
Test-Path .github\workflows
Test-Path scripts\ci
```

Expected:

```text
Sprint 24 plan path exists.
Any repository-wide scan hits are pre-existing guardrail text or policy examples.
Sprint 24 credential-pattern scan has no matches.
.git, .github, .github/workflows, and scripts/ci remain absent unless the user separately approved them.
```

## Sprint 24 Exit Gate

Sprint 24 planning is complete only when:

- this plan exists
- sprint index routes to this plan
- README links this plan if README remains the review entry point
- the three approval gates are explicit
- non-git blocked state is explicit
- workflow draft source is identified
- command matrix is complete
- env and credential boundary is documented without raw values
- artifact upload remains blocked until protected CI exists
- failure triage and rollback route are documented
- validation commands have been run and reported
- `.git`, `.github`, `.github/workflows`, workflow files, and CI scripts were not created during plan-writing

## Sprint 25 Candidates

- `git-and-workflow-initialization-after-approval`
- `hosted-adapter-implementation`
- `staging-deployment-dry-run`

Recommended next action after Sprint 24 planning approval:

```text
Ask the user whether to approve repository initialization, workflow file creation, both, or neither.
Do not infer approval from this plan.
```

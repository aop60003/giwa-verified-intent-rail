# Sprint 20 CI and Source Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a git-backed, CI-backed source provenance gate for `GIWA Verified Intent Rail` before any staging dry run can be considered.

**Architecture:** Sprint 20 is a provenance and CI planning sprint. It defines the transition from non-git prototype mode to protected source, the future CI workflow design, artifact and evidence hashing, lockfile policy, redacted scan rules, approval gates, and rollback relationship without creating `.git`, `.github`, a workflow file, a release tag, or a deployment.

**Tech Stack:** Markdown plan, existing pnpm workspace, TypeScript, Vitest, Hardhat, Node syntax checks, existing static/live public artifact exporters, existing Sprint 19 staging preparation docs.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-19-staging-deployment-preparation.md`
- `docs/implementation/giwa-staging-deployment-preparation.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-env-contract.md`
- `docs/implementation/giwa-staging-storage-and-restore.md`
- `docs/implementation/giwa-staging-observability.md`
- `docs/implementation/giwa-staging-security-boundary.md`
- `docs/implementation/giwa-staging-rollback-and-incident-drill.md`
- `docs/implementation/giwa-staging-partner-promotion-gate.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `package.json`
- `apps/web/package.json`
- `packages/protocol/package.json`
- `packages/contracts/package.json`

## Parallel Read-Only Analysis Summary

Eight read-only perspectives informed this plan:

- Git/source provenance: current `.git=False` and `.github=False`; release manifest source identity remains blocked until protected source exists.
- CI workflow design: required future jobs are source provenance, pinned install, web checks, protocol checks, contracts checks, workspace checks, syntax checks, safe scans, and artifact provenance.
- Artifact and evidence hashing: source, lockfile, evidence inputs, generated public artifacts, and build tree hashes must be separated.
- Dependency and lockfile policy: `pnpm-lock.yaml=True`; CI must use root-pinned `pnpm@10.32.1`; drift blocks promotion.
- Sensitive surface and env safety: scans must avoid real env files and report redacted rule ids/classes, not matched values.
- Test/build matrix: package-scoped tests, root checks, root typecheck, and Node syntax checks are required; chain-operation scripts are excluded.
- Release approval and rollback: no-rebuild promotion requires immutable source, artifact manifest, prior checksums, static fallback, and matched-only gate.
- Non-git migration path: Sprint 20 plan-only work records before/after git and before/after workflow steps, but does not perform those steps.

## Sprint 20 Boundary

Allowed:

- Write this Sprint 20 plan.
- Update sprint routing and documentation links.
- Define future CI workflow design without creating `.github`.
- Define artifact manifest and hash policy without emitting a release artifact.
- Define scan rules without reading real env files.
- Run documentation verification scans.

Not allowed:

- Create `.git`, run git initialization, commit, branch, merge, tag, or push.
- Create `.github` or workflow files.
- Start public hosting, deployment, staging dry run, managed infrastructure, or artifact promotion.
- Install or change dependencies.
- Send wallet actions or GIWA Sepolia transactions.
- Run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands.
- Create fake CI results, fake artifact hashes, fake source commits, or fake release tags.
- Treat local checks as protected CI.
- Treat Flashblocks as authoritative confirmation.

## Planned File Structure

Sprint 20 plan-writing creates:

```text
docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md
```

Sprint 20 plan-writing updates:

```text
docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
README.md
docs/implementation/giwa-staging-release-provenance.md
docs/implementation/giwa-staging-deployment-preparation.md
docs/implementation/giwa-staging-blocker-register.md
docs/implementation/giwa-commercial-readiness-gate.md
```

Future Sprint 20 execution may create a `.github/workflows/...` file only after the user approves execution. This plan does not create that file.

---

## Task 1: Plan Routing and Non-Git State

### Files

- Create: `docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `README.md`

### Red Check

- [ ] Run checks that prove Sprint 20 routing is not present before the plan is linked.

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-20-ci-and-source-provenance.md
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-20-ci-and-source-provenance.md" -Quiet
Select-String -Path README.md -Pattern "Sprint 20 CI and Source Provenance" -Quiet
```

Expected red state:

```text
The plan file check is False before Sprint 20 plan-writing, and at least one link check is False.
```

### Minimal Writing

- [ ] Add Sprint 20 after Sprint 19 in the sprint index.
- [ ] Add a README link under Hosted Ops Readiness.
- [ ] Record that `.git=False` and `.github=False` keep source provenance blocked.

Sprint index row:

```markdown
| 20 | `2026-06-19-sprint-20-ci-and-source-provenance.md` | CI and source provenance plan for git-backed protected checks, artifact hashing, lockfile policy, redacted scans, release approval, and no-rebuild promotion | Sprint 19 approval |
```

### Green Check

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-20-ci-and-source-provenance.md
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-20-ci-and-source-provenance.md" -Quiet
Select-String -Path README.md -Pattern "Sprint 20 CI and Source Provenance" -Quiet
```

Expected green state:

```text
All three checks return True.
```

## Task 2: Source Provenance Gate

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`

### Red Check

- [ ] Confirm the current workspace remains blocked for source provenance.

```powershell
Test-Path .git
Test-Path .github
Test-Path pnpm-lock.yaml
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Source Provenance Gate" -Quiet
```

Expected red state:

```text
`.git` and `.github` are False in this workspace, `pnpm-lock.yaml` is True, and the Sprint 20 gate section is absent before execution.
```

### Minimal Writing

- [ ] Add a Sprint 20 source provenance gate.
- [ ] Keep `sourceCommit` blocked until git-backed source exists.
- [ ] State local checks are advisory only until protected CI repeats them.

Required source identity checks for a future execution sprint:

```powershell
Test-Path .git
Test-Path .github
Test-Path pnpm-lock.yaml
Get-ChildItem -LiteralPath .github\workflows -File
git rev-parse --verify HEAD
git status --short
git diff --exit-code -- package.json pnpm-lock.yaml apps/web/package.json packages/protocol/package.json packages/contracts/package.json
```

Expected future pass criteria:

```text
`.git=True`, `.github=True`, lockfile exists, workflow path exists, immutable commit is recorded, and package/lockfile drift is absent or approved.
```

### Green Check

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Source Provenance Gate" -Quiet
Select-String -Path docs\implementation\giwa-staging-blocker-register.md -Pattern "Sprint 20 CI and Source Provenance" -Quiet
```

Expected green state:

```text
Both checks return True while the actual source state remains blocked until a later approved execution sprint changes it.
```

## Task 3: Git Transition Procedure

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`

### Red Check

- [ ] Confirm transition phases are not documented.

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Before Git Transition" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "After Workflow Creation" -Quiet
```

Expected red state:

```text
At least one check returns False before execution updates the provenance doc.
```

### Minimal Writing

- [ ] Add these phases:

```markdown
## Before Git Transition

1. Record workspace mode as `non-git prototype`.
2. Treat staging promotion, release provenance, and artifact promotion as blocked.
3. Allow only advisory local review and documentation planning.
4. Keep `sourceCommit` blocked until git-backed source exists.
5. Require user approval before any migration work.

## After Git Transition

1. Verify `Test-Path .git` returns `True`.
2. Record protected branch name, reviewer policy, merge policy, release owner, and approval timestamp.
3. Identify an immutable source commit for future release manifests.
4. Check lockfile state and block if drift is unexplained.
5. Keep local checks advisory until protected CI repeats them from the git-backed commit.

## Before Workflow Creation

1. Define the intended `.github/workflows/...` path and required checks before creating it.
2. Require review of the workflow path and check list.
3. Include web, protocol, contracts, workspace, syntax, scan, and artifact provenance checks.
4. Define redacted scan behavior that excludes real env file content.
5. Define artifact manifest shape and checksum rules without promoting artifacts.

## After Workflow Creation

1. Verify `Test-Path .github` returns `True`.
2. Verify the workflow path was reviewed.
3. Run protected CI from the immutable git-backed source commit.
4. Record CI result, source commit, lockfile state, artifact checksums, release owner, and timestamp.
5. Mark source provenance unblocked only after protected CI passes.
```

### Green Check

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Before Git Transition" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "After Workflow Creation" -Quiet
```

Expected green state:

```text
Both checks return True.
```

## Task 4: CI Workflow Design

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`

### Red Check

- [ ] Confirm the workflow design section is not yet documented.

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 CI Workflow Design" -Quiet
```

Expected red state:

```text
The check returns False before execution adds the design.
```

### Minimal Writing

- [ ] Document future workflow jobs without creating `.github`.

Proposed future workflow path:

```text
.github/workflows/ci-source-provenance.yml
```

Future job design:

```yaml
name: ci-source-provenance
on:
  pull_request:
  push:
    branches: [main]
jobs:
  source-provenance:
    runs-on: windows-latest
  install-lockfile:
    runs-on: windows-latest
    needs: source-provenance
  web-checks:
    runs-on: windows-latest
    needs: install-lockfile
  protocol-checks:
    runs-on: windows-latest
    needs: install-lockfile
  contracts-checks:
    runs-on: windows-latest
    needs: install-lockfile
  workspace-checks:
    runs-on: windows-latest
    needs: [web-checks, protocol-checks, contracts-checks]
  static-js-syntax:
    runs-on: windows-latest
    needs: install-lockfile
  safe-scans:
    runs-on: windows-latest
    needs: install-lockfile
  artifact-provenance:
    runs-on: windows-latest
    needs: [workspace-checks, static-js-syntax, safe-scans]
```

Design rules:

- Use an explicit Node version that supports `node --experimental-strip-types`.
- Use the root-pinned `pnpm@10.32.1`.
- Run from protected git-backed source only.
- Do not call `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands.
- Do not require wallet action, managed infrastructure, or real env output.
- Fail on unexplained lockfile drift.

### Green Check

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 CI Workflow Design" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "ci-source-provenance.yml" -Quiet
```

Expected green state:

```text
Both checks return True, and no workflow file has been created during plan-writing.
```

## Task 5: Required Check Matrix

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`

### Red Check

- [ ] Confirm Sprint 20 check matrix is absent.

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Required Check Matrix" -Quiet
```

Expected red state:

```text
The check returns False before execution adds the matrix.
```

### Minimal Writing

- [ ] Add exact required commands:

```powershell
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm --version
pnpm install --frozen-lockfile
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
pnpm typecheck
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Expected pass criteria:

```text
Every command exits 0, `pnpm --version` prints 10.32.1, the lockfile is not rewritten, and generated public artifacts are captured by the artifact manifest.
```

Optional focused web shards for diagnosis:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- wallet
pnpm --filter @giwa/web --fail-if-no-match test -- manifest
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- receipt
pnpm --filter @giwa/web --fail-if-no-match test -- live
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate
pnpm --filter @giwa/web --fail-if-no-match test -- liveApiErrors
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi liveDemoSnapshot partnerSummary
pnpm --filter @giwa/web --fail-if-no-match test -- hostedMode liveAuth liveTenantPolicy liveRequestSafety liveRateLimit verificationJobQueue liveSchemaMigrations liveHealth liveTelemetry liveEnv liveStore liveApi
```

Excluded commands:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match deploy:local
pnpm --filter @giwa/contracts --fail-if-no-match deploy:giwa
pnpm --filter @giwa/contracts --fail-if-no-match fund:giwa
pnpm --filter @giwa/contracts --fail-if-no-match anchor:giwa
pnpm --filter @giwa/contracts --fail-if-no-match verify:giwa
```

### Green Check

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Required Check Matrix" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "pnpm typecheck" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "node --check apps/web/public/demo-control-room.js" -Quiet
```

Expected green state:

```text
All checks return True.
```

## Task 6: Artifact and Evidence Hash Policy

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`

### Red Check

- [ ] Confirm Sprint 20 hash policy is absent.

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Hash Policy" -Quiet
```

Expected red state:

```text
The check returns False before execution adds the hash policy.
```

### Minimal Writing

- [ ] Add source, lockfile, evidence input, public artifact, and build tree hash policy.

Release manifest shape:

```json
{
  "releaseId": "giwa-intent-rail-testnet-YYYYMMDD",
  "sourceCommit": "blocked-until-git-backed",
  "stage": "staging-testnet",
  "generatedAt": "ISO-8601",
  "ci": {
    "workflowPath": ".github/workflows/ci-source-provenance.yml",
    "ciRunId": "required-after-protected-ci",
    "nodeVersion": "required-after-protected-ci",
    "pnpmVersion": "10.32.1"
  },
  "sourceLockfiles": [
    { "path": "pnpm-lock.yaml", "sha256": "computed-in-ci" }
  ],
  "evidenceInputs": [
    { "path": "docs/evidence/giwa-sepolia-chain-anchor.json", "sha256": "computed-in-ci" },
    { "path": "docs/evidence/giwa-sepolia-mvp-evidence.json", "sha256": "computed-in-ci" }
  ],
  "artifacts": [
    { "path": "apps/web/public/flow-data.json", "sha256": "computed-in-ci" },
    { "path": "apps/web/public/partner-snapshot.json", "sha256": "computed-in-ci" },
    { "path": "apps/web/public/live-demo-snapshot.json", "sha256": "computed-in-ci" },
    { "path": "docs/evidence/live-demo-sprint12-snapshot.json", "sha256": "computed-in-ci" }
  ],
  "buildTreeSha256": "computed-from-sorted-artifact-paths",
  "checks": {
    "staticFallback": "pass-or-blocked",
    "liveReadOnlySmoke": "pass-or-blocked",
    "commercialReceiptGate": "pass-or-blocked",
    "safeScans": "pass-or-blocked"
  }
}
```

Hash rules:

- Source identity is the protected git commit.
- Lockfile hash is recorded separately from generated artifacts.
- Evidence input hashes are recorded separately from public artifact hashes.
- Public artifact hashes are computed after public artifact safety checks pass.
- Build tree hash is computed from sorted normalized artifact paths and file hashes.
- Promotion stops if any later-stage hash differs.
- Local SQLite files, local env files, process env values, and browser local state are excluded from artifact hashing.

### Green Check

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Hash Policy" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "buildTreeSha256" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "evidenceInputs" -Quiet
```

Expected green state:

```text
All checks return True.
```

## Task 7: Lockfile and Dependency Policy

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`

### Red Check

- [ ] Confirm Sprint 20 lockfile policy is absent.

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Lockfile Policy" -Quiet
```

Expected red state:

```text
The check returns False before execution adds the section.
```

### Minimal Writing

- [ ] Add lockfile and dependency gates:

```markdown
## Sprint 20 Lockfile Policy

- `pnpm-lock.yaml` must exist.
- CI uses root `packageManager` value `pnpm@10.32.1`.
- `pnpm install --frozen-lockfile` must not rewrite the lockfile.
- Any package manifest or lockfile drift blocks promotion unless the dependency approval document records approval.
- No package is added in Sprint 20 planning.
- A later execution sprint may change packages only after approval records license, recency or adoption, lighter alternative, approval date, and approver.
```

### Green Check

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Lockfile Policy" -Quiet
Select-String -Path docs\implementation\giwa-staging-blocker-register.md -Pattern "Lockfile and dependency policy" -Quiet
```

Expected green state:

```text
Both checks return True.
```

## Task 8: Sensitive Surface Scan Policy

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`

### Red Check

- [ ] Confirm the scan policy is absent.

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sensitive Surface Scan Policy" -Quiet
```

Expected red state:

```text
The check returns False before execution adds the section.
```

### Minimal Writing

- [ ] Add scan policy:

```markdown
## Sensitive Surface Scan Policy

- CI scans repository source, docs, public artifacts, and release manifests.
- CI excludes real env files and never prints process environment values.
- Scan output reports file path, line number, rule id, and redacted match class only.
- Public artifact checks allow public addresses, public transaction hashes, block fields, hash fields, bounded verifier status, public routes, and approved snapshot paths.
- Promotion stops when a scan fails.
- Existing guardrail language in policy docs is acceptable only when the match is a clearly marked boundary example.
```

Safe scan commands for future CI:

```powershell
$unfinishedPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$claimPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment")
$surfacePattern = "private " + "key|mnem" + "onic|bear" + "er|api " + "key|sec" + "ret"
rg -n $unfinishedPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $claimPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $surfacePattern docs\superpowers\plans\2026-06-19-sprint-20-ci-and-source-provenance.md
```

### Green Check

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sensitive Surface Scan Policy" -Quiet
```

Expected green state:

```text
The check returns True.
```

## Task 9: Release Approval and Static Fallback Relationship

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-staging-deployment-preparation.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`

### Red Check

- [ ] Confirm Sprint 20 release approval section is absent.

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Release Approval Checklist" -Quiet
```

Expected red state:

```text
The check returns False before execution adds the section.
```

### Minimal Writing

- [ ] Add release approval gates:

```markdown
## Sprint 20 Release Approval Checklist

Release approval requires:

- `.git=True`
- `.github=True`
- reviewed workflow path
- protected branch, reviewer, and merge policy recorded
- immutable source commit recorded
- root-pinned package manager used
- lockfile clean or approved
- protected CI passed
- artifact manifest generated by CI
- static fallback GET routes checked
- live read-only smoke checked when a local server is selected
- commercial receipt gate remains matched-only
- public artifact scans passed
- release owner and approval timestamp recorded
```

Rollback relationship:

```markdown
Rollback can replace app artifacts and lock new writes. Rollback cannot reverse public GIWA Sepolia evidence. Static fallback remains the continuity surface and must stay GET-only, labeled recorded GIWA Sepolia testnet evidence, and hash-verified from captured evidence.
```

### Green Check

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Sprint 20 Release Approval Checklist" -Quiet
Select-String -Path docs\implementation\giwa-staging-deployment-preparation.md -Pattern "Sprint 20 CI and Source Provenance" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Sprint 20 CI and Source Provenance" -Quiet
```

Expected green state:

```text
All checks return True.
```

## Task 10: Final Verification and Handoff

### Files

- `docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `README.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-deployment-preparation.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`

### Verification Commands

- [ ] Run plan existence check.

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-20-ci-and-source-provenance.md
```

Expected:

```text
True
```

- [ ] Run unfinished marker scan.

```powershell
$unfinishedPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $unfinishedPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

Expected:

```text
No matches, or existing policy examples only.
```

- [ ] Run unsupported claim scan.

```powershell
$claimPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment")
rg -n $claimPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

Expected:

```text
Existing guardrail examples only. New Sprint 20 plan text has no matches.
```

- [ ] Run plan-sensitive surface scan.

```powershell
$surfacePattern = "private " + "key|mnem" + "onic|bear" + "er|api " + "key|sec" + "ret"
rg -n $surfacePattern docs\superpowers\plans\2026-06-19-sprint-20-ci-and-source-provenance.md
```

Expected:

```text
No matches.
```

- [ ] Confirm forbidden local actions were not performed.

```powershell
Test-Path .git
Test-Path .github
```

Expected current plan-writing state:

```text
False
False
```

### Handoff

Sprint 20 plan-writing handoff must include:

- created and modified files
- eight-perspective analysis summary
- verification results
- confirmation that Sprint 20 implementation did not start
- confirmation that `.git` and `.github` were not created
- confirmation that no wallet action, deployment, funding, anchoring, verifier-chain, mint, public hosting, managed infrastructure, or dependency installation occurred
- unresolved risks
- next action

## Sprint 20 Exit Gate

Sprint 20 plan-writing is complete when:

- this plan exists
- Sprint index links Sprint 20
- README links Sprint 20
- source provenance blockers are documented
- git transition procedure is documented
- CI workflow design is documented without creating workflow files
- required checks are documented
- artifact manifest and hash policy are documented
- lockfile and dependency policy are documented
- sensitive surface scan policy is documented without reading real env files
- release approval and rollback relationship are documented
- `.git` and `.github` remain uncreated in this plan-writing sprint
- no deployment, public host, managed infrastructure, wallet action, GIWA chain operation, dependency installation, fake CI result, fake release tag, or fake artifact hash is created

## Sprint 21 Candidates

Choose exactly one after user approval:

```text
docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md
docs/superpowers/plans/2026-06-19-sprint-21-hosted-adapter-implementation.md
docs/superpowers/plans/2026-06-19-sprint-21-staging-deployment-dry-run.md
```

Recommended next path:

```text
docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md
```

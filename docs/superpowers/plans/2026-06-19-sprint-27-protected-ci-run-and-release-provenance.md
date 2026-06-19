# Sprint 27 Protected CI Run and Release Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Try to advance Sprint 26 local git and workflow state toward protected CI release provenance, and fail closed with explicit blockers when a GitHub remote, push approval, real Actions run, or branch-protection authority is absent.

**Architecture:** Sprint 27 separates local source evidence from protected CI evidence. Local commands may verify the repository, workflow file, artifact hashes, and blocker documents, but protected provenance requires a remote GitHub repository, a pushed immutable commit, real GitHub Actions statuses, and branch-protection evidence.

**Tech Stack:** Git, GitHub Actions YAML, pnpm `10.32.1`, Node `22.16.0`, TypeScript, Vitest, Hardhat, local artifact/provenance scripts, Markdown release gates.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`
- `docs/implementation/giwa-git-and-workflow-initialization-execution.md`
- `docs/implementation/giwa-protected-ci-transition-checklist.md`
- `docs/implementation/giwa-branch-protection-approval.md`
- `docs/implementation/giwa-release-approval-checklist.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `.github/workflows/ci.yml`
- `docs/evidence/local-artifact-manifest.json`
- `docs/evidence/local-provenance-report.json`
- `docs/evidence/local-provenance-verification.json`
- `package.json`
- `apps/web/package.json`
- `packages/protocol/package.json`
- `packages/contracts/package.json`

## Current State

Sprint 26 completed the local source snapshot and workflow creation:

```text
branch=main
localInitialCommit=9918a5267a79f63ef512be7847b6f89d95ac8081
workflowPath=.github/workflows/ci.yml
workflowName=ci-source-provenance
scripts/ci=False
authority=local-advisory
```

Observed Sprint 27 preflight state:

```text
gitRemote=absent
remotePushApproval=absent
githubActionsRun=absent
requiredCheckStatuses=absent
branchProtection=blocked
protectedProvenance=blocked
```

Protected CI must not be claimed from the local workflow file alone.

## Parallel Readiness Review

| Perspective | Sprint 27 consequence |
| --- | --- |
| GitHub remote and auth gate | No remote is configured. A remote URL and push approval are required before any Actions run can exist. |
| Workflow readiness | Job names match the protected-check list, but the workflow has not run on GitHub. Artifact upload remains absent by policy. |
| Branch protection | Exact required checks are known, but they cannot be enforced before real GitHub statuses exist. |
| Provenance binding | Local manifest/report verification can be refreshed, but protected source commit and run id remain blocked. |
| Safe scan boundary | Local scans can classify guardrail text; real protected scan authority waits for a GitHub run and a review that `safe-scans` blocks release-relevant findings. |
| Blocker register | Source provenance must be `partial-local / remote blocked`; protected CI and branch protection stay blocked. |
| Release approval | Release approval remains blocked until remote source, CI run id, protected artifacts, release owner, and rollback owner are recorded. |
| Stop gate | The sprint must stop before remote setup, push, workflow dispatch, branch-protection settings, public hosting, deployment, wallet action, chain operation, or dependency installation. |

## Goals

Sprint 27 execution should:

- add this plan to the sprint routing documents
- record current local git and workflow evidence
- check whether a GitHub remote is configured without creating one
- stop before push or workflow dispatch when no remote exists
- create a Sprint 27 execution record
- refresh local-advisory artifact/provenance verification
- update stale release/provenance docs from pre-Sprint-26 state
- update blocker register rows for remote source, protected CI, branch protection, release approval, and rollback owner
- keep local-advisory evidence distinct from protected CI evidence
- commit the safe documentation and workflow-preparation changes locally

## Non-Goals

Sprint 27 does not:

- create or configure a GitHub remote
- push to any remote
- dispatch GitHub Actions manually
- claim protected CI or release-grade provenance without a real GitHub run
- configure branch protection or repository rulesets without repository settings authority
- upload CI artifacts
- create release tags
- run public hosting or deployment
- connect managed infrastructure
- read or print real local environment file contents
- output credential values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- expand product claims beyond the GIWA Sepolia testnet evidence boundary

## Required Check Names

Protected branch settings, when later authorized, must use exactly:

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

These names must match real GitHub check statuses, not only YAML job ids.

## Task Plan

### Task 1: Add Sprint 27 Routing

**Files:**

- Create: `docs/superpowers/plans/2026-06-19-sprint-27-protected-ci-run-and-release-provenance.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `README.md`

- [ ] **Step 1: Verify the plan path is missing**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-27-protected-ci-run-and-release-provenance.md
```

Expected before creation:

```text
False
```

- [ ] **Step 2: Create this Sprint 27 plan**

Write the plan at the exact path above with the current state, stop gates, task plan, verification commands, and Sprint 28 candidate.

- [ ] **Step 3: Update routing docs**

Add Sprint 27 to `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md` after Sprint 26. Extend `README.md` hosted readiness text with Sprint 27 as a blocked protected-CI probe, not a deployment step.

- [ ] **Step 4: Verify the plan path exists**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-27-protected-ci-run-and-release-provenance.md
```

Expected after creation:

```text
True
```

### Task 2: Probe Remote And Protected CI Authority

**Files:**

- Create: `docs/implementation/giwa-protected-ci-run-and-release-provenance.md`

- [ ] **Step 1: Run local source state checks**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
git branch --show-current
git remote -v
Test-Path .github\workflows\ci.yml
```

Expected in the current workspace:

```text
branch main exists
HEAD is 9918a5267a79f63ef512be7847b6f89d95ac8081 or a later local commit after Sprint 27 docs
git remote -v prints no remote entries
.github\workflows\ci.yml exists
```

- [ ] **Step 2: Stop before external action**

If no remote is configured, do not run `git remote add`, `git push`, `gh workflow run`, `gh api`, or branch-protection settings commands. Record:

```text
remoteGitHubRepository=absent
remotePushApproval=absent
githubActionsRun=absent
requiredCheckStatuses=absent
protectedProvenance=blocked
branchProtection=blocked
```

- [ ] **Step 3: Create execution record**

Create `docs/implementation/giwa-protected-ci-run-and-release-provenance.md` with:

```text
localCommit=<current local commit before Sprint 27 commit>
workflowPath=.github/workflows/ci.yml
workflowName=ci-source-provenance
requiredChecks=<exact check names>
remoteGitHubRepository=absent
githubActionsRun=absent
protectedArtifactGeneration=absent
releaseApproval=blocked
branchProtection=blocked
authority=local-advisory
```

### Task 3: Refresh Release Provenance Documents

**Files:**

- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-release-approval-checklist.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`

- [ ] **Step 1: Update stale current-state text**

Replace pre-Sprint-26 current-state wording with:

```text
.git=True
.github=True
.github/workflows=True
workflowPath=.github/workflows/ci.yml
remoteGitHubRepository=absent
githubActionsRun=absent
protected-ci=blocked
branch-protection=blocked
authority=local-advisory
```

- [ ] **Step 2: Update blocker rows**

Set:

```text
Source provenance = partial-local / remote blocked
Protected CI = blocked
Branch protection = blocked
Rollback = blocked
Release approval = blocked
```

Required evidence must name remote GitHub repository, push approval, immutable remote commit, GitHub Actions run id, exact required-check statuses, protected artifact generation, branch protection or ruleset evidence, release owner, and rollback owner.

- [ ] **Step 3: Preserve local-advisory boundary**

Keep:

```text
releaseGrade=false
canUnblockStaging=false
local advisory outputs do not authorize staging promotion
```

### Task 4: Refresh Local Advisory Provenance

**Files:**

- Modify: `docs/evidence/local-artifact-manifest.json`
- Modify: `docs/evidence/local-provenance-report.json`
- Modify: `docs/evidence/local-provenance-report.json.sha256`
- Modify: `docs/evidence/local-provenance-verification.json`
- Modify: `docs/evidence/local-command-evidence-report.json`

- [ ] **Step 1: Regenerate local advisory artifact/provenance files**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
```

Expected:

```text
authority=local-advisory
verificationDecision=pass
scanDecision=pass
releaseGrade=false
canUnblockStaging=false
```

- [ ] **Step 2: Record hashes**

Run:

```powershell
Get-FileHash docs\evidence\local-artifact-manifest.json -Algorithm SHA256
Get-FileHash docs\evidence\local-provenance-report.json -Algorithm SHA256
Get-FileHash docs\evidence\local-provenance-verification.json -Algorithm SHA256
```

Expected:

```text
Hashes are stable for the final Sprint 27 working tree and are labeled local-advisory.
```

### Task 5: Verify Workflow And Package Boundaries

**Files:**

- Verify: `.github/workflows/ci.yml`
- Verify: `package.json`
- Verify: `apps/web/package.json`
- Verify: `packages/protocol/package.json`
- Verify: `packages/contracts/package.json`

- [ ] **Step 1: Check workflow syntax as text**

Run:

```powershell
Select-String -Path .github\workflows\ci.yml -Pattern "source-provenance","artifact-provenance","permissions:","contents: read"
```

Expected:

```text
Workflow name, job names, and read-only permissions are present.
```

- [ ] **Step 2: Confirm no forbidden workflow command is invoked**

Run:

```powershell
$workflow = Get-Content .github\workflows\ci.yml
$blocked = "deploy:giwa","fund:giwa","anchor:giwa","verify:giwa","mint","serve:live","public hosting","managed infrastructure"
$hits = foreach ($line in $workflow) {
  if ($line -match "^\s*BLOCKED_WORKFLOW_COMMANDS:") { continue }
  foreach ($term in $blocked) {
    if ($term -eq "mint") {
      if ($line -match "pnpm\s+.*\bmint\b") { "$term :: $line" }
    } elseif ($line.Contains($term)) {
      "$term :: $line"
    }
  }
}
if ($hits) { $hits; exit 1 } else { "NO_FORBIDDEN_WORKFLOW_COMMANDS" }
```

Expected:

```text
NO_FORBIDDEN_WORKFLOW_COMMANDS
```

### Task 6: Final Verification And Local Commit

**Files:**

- Verify all changed docs and local evidence.

- [ ] **Step 1: Run verification**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
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
node --check apps/web/scripts/export-artifact-manifest.mjs
node --check apps/web/scripts/verify-provenance-report.mjs
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Expected:

```text
All commands exit 0.
```

- [ ] **Step 2: Run safe scans without reading real local environment files**

Run:

```powershell
$placeholderPattern = ("TO" + "DO") + "|" + ("FIX" + "ME") + "|" + ("T" + "BD")
rg -n $placeholderPattern docs\implementation docs\superpowers\plans README.md .github -g "*.md" -g "*.yml" -g "*.yaml"
rg -n "instant finality|200ms confirmed|guarantee safety|perform KYC|real RWA|real yield|real funds|settlement" docs\implementation docs\superpowers\plans README.md apps\web\public apps\web\src apps\web\scripts .github -g "*.md" -g "*.html" -g "*.js" -g "*.ts" -g "*.mjs" -g "*.yml" -g "*.yaml"
rg -n "private key|mnemonic|bearer|api key|secret" docs\implementation docs\superpowers\plans README.md apps\web\public apps\web\src apps\web\scripts .github -g "*.md" -g "*.html" -g "*.js" -g "*.ts" -g "*.mjs" -g "*.yml" -g "*.yaml"
```

Expected:

```text
Unfinished-marker scan has no matches.
Unsupported-claim and credential-term matches, if present, are guardrail text, negative examples, scan pattern definitions, or tests. No live credential values are printed.
```

- [ ] **Step 3: Commit safe Sprint 27 changes**

Run:

```powershell
git status --short
git add README.md docs .github/workflows/ci.yml
git status --short
git commit -m "docs: record protected ci blocker state"
git log --oneline -1
```

Expected:

```text
A local commit is created. No push or remote operation occurs.
```

## Sprint 27 Exit Gate

Sprint 27 exits when:

- the Sprint 27 plan exists and is linked
- current local commit and workflow path are recorded
- missing GitHub remote, push approval, Actions run, required-check statuses, branch protection, protected artifact generation, release owner, and rollback owner are explicitly documented
- local-advisory provenance is refreshed and verified
- release/provenance/checklist/blocker docs reflect post-Sprint-26 local state
- protected CI and staging promotion remain blocked when no remote run exists
- all verification commands that can run locally pass
- no public hosting, deployment, managed infrastructure connection, wallet action, chain-operation command, dependency installation, release tag, fake CI result, fake artifact hash, or protected provenance claim occurs

## Sprint 28 Candidate

Recommended next sprint after Sprint 27:

```text
docs/superpowers/plans/2026-06-19-sprint-28-github-remote-and-protected-ci-activation.md
```

Sprint 28 should start only after the user provides or approves:

- GitHub repository remote URL or repository creation path
- push approval
- GitHub Actions run authority
- branch-protection settings authority
- protected artifact retention policy

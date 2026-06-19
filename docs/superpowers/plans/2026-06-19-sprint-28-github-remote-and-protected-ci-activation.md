# Sprint 28 GitHub Remote and Protected CI Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the repository for GitHub remote activation and protected CI by hardening the workflow gates, defining remote/push/Actions/branch-protection approval boundaries, and preserving release provenance blockers until real GitHub evidence exists.

**Architecture:** Sprint 28 separates local workflow hardening from external GitHub activation. Local tasks may create CI guard scripts and update `.github/workflows/ci.yml`; remote setup, push, Actions dispatch, branch protection, artifact upload authority, release approval, and staging promotion remain separate stop gates that require explicit user approval and external GitHub evidence.

**Tech Stack:** Git, GitHub Actions YAML, PowerShell CI guard scripts, pnpm `10.32.1`, Node `22.16.0`, TypeScript, Vitest, Hardhat, local artifact/provenance scripts, Markdown staging gates.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-27-protected-ci-run-and-release-provenance.md`
- `docs/implementation/giwa-protected-ci-run-and-release-provenance.md`
- `docs/implementation/giwa-protected-ci-transition-checklist.md`
- `docs/implementation/giwa-branch-protection-approval.md`
- `docs/implementation/giwa-release-approval-checklist.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `docs/implementation/giwa-provenance-artifact-manifest.md`
- `.github/workflows/ci.yml`
- `package.json`
- `apps/web/package.json`
- `packages/protocol/package.json`
- `packages/contracts/package.json`

## Current State

Sprint 27 local state:

```text
branch=main
currentLocalCommit=d5d15980bdf3d5f829525145457646ecde791f8e
remoteGitHubRepository=absent
remotePushApproval=absent
githubActionsRun=absent
requiredCheckStatuses=absent
branchProtection=blocked
releaseApproval=blocked
authority=local-advisory
```

Current workflow path:

```text
.github/workflows/ci.yml
```

Current required-check candidates:

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

Sprint 28 may harden local workflow behavior, but it must not treat the workflow as protected CI until a GitHub remote, pushed source, real run id, and matching check statuses exist.

## Parallel Planning Review

| Perspective | Sprint 28 plan consequence |
| --- | --- |
| Remote and push approval | `git remote add`, `git push`, Actions dispatch, and repository settings each require separate approval. Push to `main` can trigger Actions. |
| Workflow hardening | `safe-scans` must fail on unallowlisted findings, redact secret-scan output, and package scripts need a command-boundary check. |
| Branch protection | Required check names match current job ids, but enforcement is blocked until real GitHub status checks exist and settings authority is granted. |
| Artifact provenance | Local `local-*` evidence remains advisory. Future protected CI artifacts must use staging-named outputs and upload metadata. |
| Safe scans | Existing scans include guardrail-only matches. Sprint 28 should use allowlisted blocking scans instead of raw blocking scans. |
| Release approval | Release approval remains blocked until source commit, run id, protected artifacts, release owner, rollback owner, and branch protection are recorded. |
| Stop gates | Stop before public hosting, deployment, managed infrastructure, secret values, wallet action, chain-operation command, dependency install, or fake CI/release evidence. |

## Goals

Sprint 28 execution should:

- add this plan and routing links
- add CI guard scripts under `scripts/ci`
- update `.github/workflows/ci.yml` to call guard scripts
- make safe scans fail on unallowlisted findings while redacting sensitive matched values
- add package-script command boundary checks for root, web, protocol, and contracts package manifests
- add artifact drift detection after dry-run/check-only artifact checks
- add a final `protected-ci-gate` job that depends on the required CI jobs
- document approval text for remote add, push, Actions activation, branch protection, protected artifact upload, release owner, and rollback owner
- keep branch protection and staging promotion blocked without real GitHub evidence
- refresh local advisory provenance after safe local changes
- commit local hardening and documentation changes without push

## Non-Goals

Sprint 28 does not:

- create or configure a GitHub remote without explicit user approval
- push to a remote without explicit user approval
- dispatch GitHub Actions without explicit user approval
- configure branch protection or rulesets without repository settings authority
- public-host or deploy
- connect production, managed DB, managed storage, or cloud secret manager services
- read or print real local environment file contents
- output credential values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- create release tags
- upload protected artifacts before a real protected CI run exists
- claim protected CI, release-grade provenance, or staging promotion from local evidence

## Approval Gates

Future external activation requires separate approval records.

### Gate A: Remote Add Approval

Required text:

```text
approvedAction=git-remote-add
remoteName=<origin-or-approved-name>
remoteUrl=<https-or-ssh-url-without-embedded-credential>
targetBranch=main
pushIncluded=false
actionsDispatchIncluded=false
branchProtectionIncluded=false
publicHostingIncluded=false
```

### Gate B: Push Approval

Required text:

```text
approvedAction=git-push
remoteName=<approved-remote-name>
targetBranch=main
sourceCommit=<exact-local-commit>
acknowledgesPushTriggersActions=true
actionsRunAuthority=observe-only-until-run-id-recorded
branchProtectionIncluded=false
publicHostingIncluded=false
```

### Gate C: Actions Activation And Observation Approval

Required text:

```text
approvedAction=github-actions-observe-or-dispatch
repository=<owner/repo-or-url>
workflowPath=.github/workflows/ci.yml
workflowName=ci-source-provenance
sourceCommit=<pushed-commit>
runId=<real-run-id-or-to-be-observed>
artifactUploadIncluded=false-unless-Gate-E-exists
```

### Gate D: Branch Protection Approval

Required text:

```text
approvedAction=branch-protection-or-ruleset
repository=<owner/repo-or-url>
protectedBranch=main
requiredChecks=source-provenance,workflow-command-boundary,web-checks,protocol-checks,contracts-checks,node-syntax-checks,safe-scans,workspace-checks,artifact-provenance,protected-ci-gate
reviewerPolicy=<count-and-owner-rule>
mergePolicy=<merge-method-and-direct-push-rule>
releaseOwner=<name-or-role>
rollbackOwner=<name-or-role>
```

### Gate E: Protected Artifact Upload Approval

Required text:

```text
approvedAction=protected-artifact-upload
artifactManifestPath=docs/evidence/giwa-staging-artifact-manifest.json
provenanceReportPath=docs/evidence/giwa-staging-provenance-report.json
provenanceSidecarPath=docs/evidence/giwa-staging-provenance-report.json.sha256
uploadMetadataPath=docs/evidence/giwa-staging-artifact-upload-metadata.json
retentionDays=<approved-retention-days>
sourceCommit=<pushed-commit>
runId=<real-run-id>
```

## Task Plan

### Task 1: Add Sprint 28 Routing

**Files:**

- Create: `docs/superpowers/plans/2026-06-19-sprint-28-github-remote-and-protected-ci-activation.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `README.md`

- [ ] **Step 1: Verify plan path is missing**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-28-github-remote-and-protected-ci-activation.md
```

Expected before edit:

```text
False
```

- [ ] **Step 2: Create this Sprint 28 plan**

Create the plan with approval gates, local hardening tasks, stop gates, verification commands, and Sprint 29 candidate.

- [ ] **Step 3: Update routing docs**

Add Sprint 28 to the sprint index after Sprint 27. Link the Sprint 28 plan from `README.md` hosted ops readiness section.

- [ ] **Step 4: Verify plan path exists**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-28-github-remote-and-protected-ci-activation.md
```

Expected after edit:

```text
True
```

### Task 2: Add Safe Scan Guard Script

**Files:**

- Create: `scripts/ci/check-safe-scans.ps1`
- Modify: `.github/workflows/ci.yml`
- Test: run script locally

- [ ] **Step 1: Write the failing command**

Run before script creation:

```powershell
Test-Path scripts\ci\check-safe-scans.ps1
```

Expected:

```text
False
```

- [ ] **Step 2: Create guard script**

Create `scripts/ci/check-safe-scans.ps1` that:

- scans only docs, public assets, source, scripts, and `.github`
- excludes `.env`, `.env.local`, `node_modules`, `.git`, local DB files, and runtime data
- treats unallowlisted findings as failures
- prints secret-like findings as `ruleId:path:line` only
- exits `0` only when all findings are allowlisted or absent

Skeleton shape:

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Scan {
  param(
    [string] $RuleId,
    [string] $Pattern,
    [string[]] $Paths,
    [string[]] $Globs,
    [scriptblock] $Allow
  )

  $output = & rg -n $Pattern @Paths @Globs
  if ($LASTEXITCODE -eq 1) { return @() }
  if ($LASTEXITCODE -ne 0) { throw "scan_failed:$RuleId" }

  $failures = @()
  foreach ($line in $output) {
    if (-not (& $Allow $line)) {
      $parts = $line -split ":", 3
      $failures += "$RuleId:$($parts[0]):$($parts[1])"
    }
  }
  return $failures
}
```

The implementation must include explicit allowlist predicates for:

- historical reference plan negative examples
- guardrail sections
- scan pattern definitions
- tests that assert redaction behavior

- [ ] **Step 3: Run script**

Run:

```powershell
pwsh -NoProfile -File scripts\ci\check-safe-scans.ps1
```

Expected:

```text
safe_scans=pass
```

### Task 3: Add Package Script Boundary Guard

**Files:**

- Create: `scripts/ci/check-package-script-boundary.ps1`
- Modify: `.github/workflows/ci.yml`
- Test: run script locally

- [ ] **Step 1: Write the failing command**

Run before script creation:

```powershell
Test-Path scripts\ci\check-package-script-boundary.ps1
```

Expected:

```text
False
```

- [ ] **Step 2: Create package-script guard**

Create `scripts/ci/check-package-script-boundary.ps1` that parses:

```text
package.json
apps/web/package.json
packages/protocol/package.json
packages/contracts/package.json
```

The guard must fail if CI-invoked scripts contain blocked commands. It must allow non-CI scripts to exist only when they are not called by the CI workflow. It must inspect recursive root scripts to ensure `pnpm test`, `pnpm build`, and `pnpm typecheck` cannot call:

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
mint
public hosting
managed infrastructure
```

- [ ] **Step 3: Run script**

Run:

```powershell
pwsh -NoProfile -File scripts\ci\check-package-script-boundary.ps1
```

Expected:

```text
package_script_boundary=pass
```

### Task 4: Harden Workflow Jobs

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace inline safe scan calls**

Update `safe-scans` job to run:

```powershell
pwsh -NoProfile -File scripts\ci\check-safe-scans.ps1
```

- [ ] **Step 2: Extend workflow command boundary**

Update `workflow-command-boundary` job to run:

```powershell
pwsh -NoProfile -File scripts\ci\check-package-script-boundary.ps1
```

after the workflow text boundary check.

- [ ] **Step 3: Add artifact drift check**

After dry-run artifact generation and verification in `artifact-provenance`, add:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:local -- --dry-run
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
```

Then add:

```powershell
git diff --exit-code -- docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-report.json.sha256 docs/evidence/local-provenance-verification.json apps/web/public/flow-data.json apps/web/public/partner-snapshot.json
```

Expected:

```text
Protected CI fails if checked-in generated artifacts drift without relying on timestamped write-mode output.
```

- [ ] **Step 4: Add protected gate job**

Add:

```yaml
  protected-ci-gate:
    runs-on: windows-latest
    timeout-minutes: 5
    needs:
      - source-provenance
      - workflow-command-boundary
      - web-checks
      - protocol-checks
      - contracts-checks
      - node-syntax-checks
      - safe-scans
      - workspace-checks
      - artifact-provenance
    steps:
      - name: Confirm protected CI gate
        shell: pwsh
        run: |
          Write-Host "protected_ci_gate=pass"
```

### Task 5: Document Protected Artifact Handoff

**Files:**

- Modify: `docs/implementation/giwa-protected-ci-transition-checklist.md`
- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Modify: `docs/implementation/giwa-release-approval-checklist.md`

- [ ] **Step 1: Add staging artifact names**

Record protected-CI-only paths:

```text
docs/evidence/giwa-staging-artifact-manifest.json
docs/evidence/giwa-staging-provenance-report.json
docs/evidence/giwa-staging-provenance-report.json.sha256
docs/evidence/giwa-staging-artifact-upload-metadata.json
```

- [ ] **Step 2: Preserve local advisory boundary**

State that these remain local-only:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-command-evidence-report.json
docs/evidence/local-provenance-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
```

and must keep:

```text
authority=local-advisory
releaseGrade=false
canUnblockStaging=false
```

- [ ] **Step 3: Record upload metadata contract**

`docs/evidence/giwa-staging-artifact-upload-metadata.json` must include:

```json
{
  "authority": "protected-ci",
  "repository": "owner/repo",
  "workflowPath": ".github/workflows/ci.yml",
  "workflowRunId": "numeric-or-url-id",
  "sourceCommit": "40-char-sha",
  "branch": "main",
  "artifactName": "giwa-staging-provenance",
  "retentionDays": 30,
  "files": [
    { "path": "docs/evidence/giwa-staging-artifact-manifest.json", "bytes": 0, "sha256": "64-hex" }
  ],
  "manifestSha256": "64-hex",
  "provenanceReportSha256": "64-hex",
  "verificationDecision": "pass"
}
```

### Task 6: Remote And Branch Protection Stop Gate Record

**Files:**

- Modify: `docs/implementation/giwa-protected-ci-run-and-release-provenance.md`
- Modify: `docs/implementation/giwa-branch-protection-approval.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`

- [ ] **Step 1: Record approval-gated remote flow**

Add the five approval gates from this plan:

```text
git-remote-add
git-push
github-actions-observe-or-dispatch
branch-protection-or-ruleset
protected-artifact-upload
```

- [ ] **Step 2: Confirm no external action was run**

Run:

```powershell
git remote -v
git status --short
```

Expected before external approval:

```text
git remote -v prints no entries
working tree shows only local Sprint 28 changes before commit
```

### Task 7: Verification And Local Commit

**Files:**

- Verify all changed files.

- [ ] **Step 1: Run focused guard checks**

Run:

```powershell
pwsh -NoProfile -File scripts\ci\check-safe-scans.ps1
pwsh -NoProfile -File scripts\ci\check-package-script-boundary.ps1
```

Expected:

```text
safe_scans=pass
package_script_boundary=pass
```

- [ ] **Step 2: Run package and workspace checks**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
pnpm typecheck
```

Expected:

```text
All commands exit 0.
```

- [ ] **Step 3: Refresh and verify local advisory provenance**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify
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

- [ ] **Step 4: Run syntax and final scans**

Run:

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/export-artifact-manifest.mjs
node --check apps/web/scripts/verify-provenance-report.mjs
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
$unfinishedPattern = ("TO" + "DO") + "|" + ("FIX" + "ME") + "|" + ("T" + "BD")
rg -n $unfinishedPattern docs\implementation docs\superpowers\plans README.md .github scripts\ci -g "*.md" -g "*.yml" -g "*.yaml" -g "*.ps1"
```

Expected:

```text
No unfinished-marker matches.
```

- [ ] **Step 5: Commit local Sprint 28 changes**

Run:

```powershell
git add README.md docs .github/workflows/ci.yml scripts/ci
git status --short
git commit -m "ci: harden protected ci activation gates"
git log --oneline -1
```

Expected:

```text
Local commit created. No remote or push operation occurs.
```

## Sprint 28 Exit Gate

Sprint 28 exits when:

- this plan exists and is linked
- workflow hardening scripts exist
- `.github/workflows/ci.yml` uses the guard scripts
- `safe-scans` blocks unallowlisted findings and redacts secret-like output
- package-script command boundary passes
- artifact drift is checked
- `protected-ci-gate` job exists as a future required-check candidate
- protected artifact upload paths and metadata contract are documented
- remote add, push, Actions, branch-protection, and artifact-upload approval gates are explicit
- local advisory evidence is refreshed and verified
- a local commit records the changes
- no remote is added, no push occurs, no Actions run is dispatched, no branch protection is configured, no public hosting or deployment occurs, no managed infrastructure is connected, no wallet action or chain-operation command runs, no dependency is installed, and no protected provenance claim is made

## Sprint 29 Candidate

Recommended next sprint:

```text
docs/superpowers/plans/2026-06-19-sprint-29-github-remote-activation-after-user-approval.md
```

Sprint 29 should start only after the user provides or approves:

- GitHub repository URL or repository creation path
- remote name
- push approval
- Actions observation/dispatch authority
- branch protection settings authority
- protected artifact upload retention policy

# Sprint 29 GitHub Remote Activation After User Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the approved GitHub remote path, push the current source snapshot, observe the real GitHub Actions run, and record the protected CI and branch-protection state without public hosting or deployment.

**Architecture:** Sprint 29 turns the Sprint 28 approval gates into a controlled private GitHub repository activation. It creates or reuses a private GitHub repository, adds `origin`, pushes `main`, observes the `ci-source-provenance` workflow, attempts branch protection only after check names exist, and records any remaining blockers as evidence rather than claiming release-grade provenance prematurely.

**Tech Stack:** Git, GitHub CLI, GitHub Actions, PowerShell, pnpm `10.32.1`, Node `22.16.0`, local advisory artifact/provenance reports, Markdown release gates.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-28-github-remote-and-protected-ci-activation.md`
- `docs/implementation/giwa-protected-ci-run-and-release-provenance.md`
- `docs/implementation/giwa-protected-ci-transition-checklist.md`
- `docs/implementation/giwa-branch-protection-approval.md`
- `docs/implementation/giwa-release-approval-checklist.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `.github/workflows/ci.yml`
- `scripts/ci/check-safe-scans.ps1`
- `scripts/ci/check-package-script-boundary.ps1`

## Current State

Sprint 28 local state:

```text
branch=main
currentLocalCommit=8ca0227
remoteGitHubRepository=absent
remoteConfig=absent
githubCliAuth=present-for-aop60003
approvedAction=all-sprint-29-github-activation-gates
approvedAt=2026-06-20
publicHostingIncluded=false
deploymentIncluded=false
walletOrChainActionIncluded=false
dependencyInstallIncluded=false
```

Repository target:

```text
repository=aop60003/giwa-verified-intent-rail
visibility=private
remoteName=origin
targetBranch=main
```

## Parallel Review Inputs

| Perspective | Sprint 29 plan consequence |
| --- | --- |
| Remote and push | Prefer an existing private repository if present; otherwise create a private GitHub repository with no public hosting. |
| Actions run | The first push to `main` is expected to trigger `ci-source-provenance`; record the real run id and conclusion. |
| Required checks | Branch protection can be attempted only after GitHub exposes matching check contexts for the pushed commit. |
| Branch protection | If GitHub plan, permissions, or repository settings block protection, record the API failure class and leave promotion blocked. |
| Artifact provenance | Existing `local-*` evidence stays advisory. Protected artifact upload metadata remains blocked unless a workflow artifact exists from the real run. |
| Safety boundary | Do not read real env files, output credentials, install packages, deploy, public-host, or run wallet/chain commands. |
| Failure routing | Failed CI must be triaged by job name and command, then fixed locally and pushed only within this approved GitHub activation scope. |
| Staging readiness | Staging dry-run remains blocked until protected CI passes, branch protection is recorded or explicitly blocked, release owner is recorded, and deployment approval exists. |

## Goals

Sprint 29 execution should:

- add this plan and routing links
- create or reuse the private GitHub repository `aop60003/giwa-verified-intent-rail`
- add `origin` without embedding credentials in the URL
- push `main` from the reviewed local commit
- observe the real `ci-source-provenance` GitHub Actions run
- record run id, URL, head SHA, status, conclusion, and check names
- attempt branch protection or ruleset configuration after check names exist
- record protected CI and branch protection state in docs
- keep `local-*` evidence advisory unless protected CI generated replacement artifacts
- keep public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, and dependency installation out of scope

## Non-Goals

Sprint 29 does not:

- make the app publicly hosted
- deploy to a hosting provider
- connect a production or managed database
- connect a cloud secret manager
- read or print real env file contents
- output private key, mnemonic, bearer token, RPC token, or API key values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint
- install dependencies
- create a release tag
- claim staging promotion if CI or branch protection is absent or failed
- claim protected artifact upload metadata unless a real GitHub Actions artifact exists

## Task Plan

### Task 1: Add Sprint 29 Routing

**Files:**

- Create: `docs/superpowers/plans/2026-06-19-sprint-29-github-remote-activation-after-user-approval.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `README.md`

- [ ] **Step 1: Verify plan path is missing**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-29-github-remote-activation-after-user-approval.md
```

Expected before edit:

```text
False
```

- [ ] **Step 2: Create this Sprint 29 plan**

Create this plan with repository target, approval state, remote creation, push, Actions observation, branch protection attempt, blocker recording, and verification commands.

- [ ] **Step 3: Update routing docs**

Add Sprint 29 to the sprint index after Sprint 28 and link this plan from `README.md`.

- [ ] **Step 4: Commit routing changes**

Run:

```powershell
git add README.md docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md docs/superpowers/plans/2026-06-19-sprint-29-github-remote-activation-after-user-approval.md
git commit -m "docs: plan github remote activation"
```

Expected:

```text
Local documentation commit created before remote activation.
```

### Task 2: Create Or Reuse Private GitHub Repository

**Files:**

- Modify later: `docs/implementation/giwa-protected-ci-run-and-release-provenance.md`
- Modify later: `docs/implementation/giwa-staging-blocker-register.md`

- [ ] **Step 1: Confirm clean local state**

Run:

```powershell
git status --short
git log --oneline -1
git remote -v
```

Expected:

```text
working tree clean
latest commit is the Sprint 29 plan commit
no remote entries before activation
```

- [ ] **Step 2: Reuse repository if present**

Run:

```powershell
gh repo view aop60003/giwa-verified-intent-rail --json nameWithOwner,url,visibility,defaultBranchRef
```

Expected if present:

```text
Repository JSON with visibility PRIVATE or INTERNAL.
```

- [ ] **Step 3: Create private repository if missing**

Run only if Step 2 reports not found:

```powershell
gh repo create aop60003/giwa-verified-intent-rail --private --description "GIWA Verified Intent Rail staging readiness workspace"
```

Expected:

```text
Private GitHub repository is created. No app hosting or deployment is started.
```

- [ ] **Step 4: Add remote**

Run:

```powershell
git remote add origin https://github.com/aop60003/giwa-verified-intent-rail.git
git remote -v
```

Expected:

```text
origin points to the GitHub repository URL without embedded credentials.
```

### Task 3: Push Main And Observe Actions

**Files:**

- Modify later: `docs/implementation/giwa-protected-ci-run-and-release-provenance.md`
- Modify later: `docs/implementation/giwa-staging-release-provenance.md`
- Modify later: `docs/implementation/giwa-staging-blocker-register.md`

- [ ] **Step 1: Push current main**

Run:

```powershell
$sourceCommit = git rev-parse HEAD
git push -u origin main
```

Expected:

```text
main pushed to origin; push may trigger GitHub Actions.
```

- [ ] **Step 2: Locate workflow run**

Run:

```powershell
gh run list --repo aop60003/giwa-verified-intent-rail --workflow ci-source-provenance --branch main --limit 5 --json databaseId,status,conclusion,headSha,url,createdAt
```

Expected:

```text
At least one run exists for the pushed source commit.
```

- [ ] **Step 3: Watch run to terminal state**

Run:

```powershell
gh run watch <run-id> --repo aop60003/giwa-verified-intent-rail --exit-status
```

Expected:

```text
Exit 0 if all jobs pass. If nonzero, capture job name and failing command without fabricating success.
```

- [ ] **Step 4: Capture job conclusions**

Run:

```powershell
gh run view <run-id> --repo aop60003/giwa-verified-intent-rail --json databaseId,status,conclusion,headSha,url,jobs
```

Expected:

```text
Real run id, URL, head SHA, job names, and job conclusions are available for documentation.
```

### Task 4: Attempt Branch Protection After Check Names Exist

**Files:**

- Modify later: `docs/implementation/giwa-branch-protection-approval.md`
- Modify later: `docs/implementation/giwa-staging-blocker-register.md`
- Modify later: `docs/implementation/giwa-release-approval-checklist.md`

- [ ] **Step 1: Build required check context list**

Use these exact check contexts:

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
protected-ci-gate
```

- [ ] **Step 2: Attempt branch protection**

Run only after the workflow run produces the above contexts:

```powershell
$protection = @{
  required_status_checks = @{
    strict = $true
    contexts = @(
      "source-provenance",
      "workflow-command-boundary",
      "web-checks",
      "protocol-checks",
      "contracts-checks",
      "node-syntax-checks",
      "safe-scans",
      "workspace-checks",
      "artifact-provenance",
      "protected-ci-gate"
    )
  }
  enforce_admins = $true
  required_pull_request_reviews = @{
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $false
    required_approving_review_count = 1
  }
  restrictions = $null
  required_conversation_resolution = $true
  allow_force_pushes = $false
  allow_deletions = $false
} | ConvertTo-Json -Depth 10
$protection | gh api -X PUT repos/aop60003/giwa-verified-intent-rail/branches/main/protection --input -
```

Expected:

```text
Branch protection is configured, or GitHub returns a permission or plan-specific blocker that must be recorded.
```

- [ ] **Step 3: Read back branch protection**

Run:

```powershell
gh api repos/aop60003/giwa-verified-intent-rail/branches/main/protection
```

Expected:

```text
Branch protection JSON is returned, or the absence is recorded as blocked with the GitHub error class.
```

### Task 5: Record Protected CI Evidence And Remaining Blockers

**Files:**

- Modify: `docs/implementation/giwa-protected-ci-run-and-release-provenance.md`
- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Modify: `docs/implementation/giwa-branch-protection-approval.md`
- Modify: `docs/implementation/giwa-release-approval-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Record remote and run evidence**

Add repository URL, pushed commit, workflow run id, workflow URL, job conclusions, and whether the run passed.

- [ ] **Step 2: Record branch protection evidence**

Record whether branch protection was configured. If it was blocked, record only the GitHub error class and required next action.

- [ ] **Step 3: Preserve artifact authority boundary**

Record that `local-*` outputs remain `local-advisory`. If no protected artifact upload metadata exists, keep protected artifact generation blocked.

- [ ] **Step 4: Refresh local advisory evidence**

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
releaseGrade=false
canUnblockStaging=false
```

### Task 6: Verification And Final Push

**Files:**

- Verify all changed files.

- [ ] **Step 1: Run local guard checks**

Run:

```powershell
powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
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

- [ ] **Step 3: Commit and push Sprint 29 evidence record**

Run:

```powershell
git add README.md docs
git commit -m "docs: record github protected ci activation"
git push origin main
```

Expected:

```text
Local documentation record is pushed. A new Actions run may start and must be observed before final reporting.
```

- [ ] **Step 4: Observe final run**

Run:

```powershell
gh run list --repo aop60003/giwa-verified-intent-rail --workflow ci-source-provenance --branch main --limit 3 --json databaseId,status,conclusion,headSha,url,createdAt
```

Expected:

```text
Latest run corresponds to the final pushed commit and reaches a terminal conclusion.
```

## Sprint 29 Exit Gate

Sprint 29 exits when:

- this plan exists and is linked
- private GitHub repository exists or a GitHub creation blocker is recorded
- remote `origin` is configured without embedded credentials
- `main` is pushed or the push blocker is recorded
- a real GitHub Actions run is observed or the run blocker is recorded
- required check names are captured from GitHub when available
- branch protection is configured or the GitHub blocker is recorded
- protected artifact upload metadata remains blocked unless generated by a real run
- local advisory evidence remains labeled `local-advisory`
- final docs and evidence are committed and pushed when remote push is available
- no public hosting, deployment, managed infrastructure, env content read, credential output, wallet action, chain-operation command, dependency install, fake CI result, release tag, or staging promotion occurs

## Sprint 30 Candidate

Recommended next sprint:

```text
docs/superpowers/plans/2026-06-20-sprint-30-protected-artifact-upload-and-release-evidence.md
```

Sprint 30 should generate protected staging-named artifact outputs inside GitHub Actions only after Sprint 29 confirms a real workflow run and branch-protection state.

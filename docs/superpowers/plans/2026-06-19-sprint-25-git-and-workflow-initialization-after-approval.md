# Sprint 25 Git and Workflow Initialization After Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the final approval-gated execution plan for git repository initialization, first source snapshot, workflow file creation, and branch-protection preparation without performing those actions during plan-writing.

**Architecture:** Sprint 25 is a planning sprint for the first future execution session that may cross from local non-git advisory evidence toward git-backed protected CI. It keeps four user approvals separate: repository initialization, initial commit, workflow file creation, and branch protection. Local Sprint 22/23 evidence remains advisory until a protected CI run regenerates equivalent evidence from immutable source.

**Tech Stack:** Documentation plan for a pnpm workspace using TypeScript, Vitest, Hardhat, static public assets, local artifact/provenance scripts, and future GitHub Actions.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md`
- `docs/implementation/giwa-ci-workflow-creation-approval.md`
- `docs/implementation/giwa-git-initialization-approval.md`
- `docs/implementation/giwa-branch-protection-approval.md`
- `docs/implementation/giwa-ci-workflow-yaml-draft.md`
- `docs/implementation/giwa-ci-workflow-draft.md`
- `docs/implementation/giwa-staging-release-provenance.md`
- `docs/implementation/giwa-staging-blocker-register.md`
- `docs/implementation/giwa-release-approval-checklist.md`
- `docs/implementation/giwa-ci-failure-triage.md`
- `docs/evidence/local-artifact-manifest.json`
- `docs/evidence/local-provenance-report.json`
- `docs/evidence/local-provenance-verification.json`
- `package.json`
- `apps/web/package.json`
- `pnpm-workspace.yaml`

## Current State

Sprint 24 completed the approval packet and YAML draft documentation. The repository remains in non-git prototype mode:

```text
.git=False
.github=False
.github/workflows=False
scripts/ci=False
authority=local-advisory
source-provenance=blocked
protected-ci=blocked
```

The latest local advisory hashes are:

```text
localArtifactManifestSha256=21de5ba700520dc2c80d7c3dd4856bf96644ed11e6f1561b42176f1133d96699
localProvenanceReportSha256=12a36edd86af167da8cb369e332616bdbb3df9971035acbb37242e08f7fd1e5a
localProvenanceVerification=pass
```

These hashes can support review. They cannot become protected CI evidence without a future approved git-backed workflow run.

## Eight-Perspective Planning Review

| Perspective | Sprint 25 plan consequence |
|---|---|
| Git repository initialization safety | Repository initialization requires an explicit approval record. Preflight uses path checks only while `.git=False`; `git status --short` waits until `.git=True`. |
| Initial commit and history strategy | Initial commit is a separate approval from repository initialization. Staging must be allowlist-based and broad staging is blocked until include/exclude scope is reviewed. |
| GitHub workflow file creation safety | `docs/implementation/giwa-ci-workflow-yaml-draft.md` is the authoritative draft source. Workflow path, runner policy, triggers, permissions, and helper inclusion require explicit approval. |
| CI command matrix and artifact upload | The matrix uses existing package scripts only. Artifact upload remains blocked until protected CI exists and reports source commit, run id, hashes, and verification decision. |
| Credential and local env boundary | Future scans reject excluded paths before content reads and report metadata only. Public evidence may include public chain and hash fields, not local runtime or credential material. |
| Branch protection and required checks | Branch protection waits for a repository, workflow path, stable job names, real CI statuses, branch policy, reviewer policy, and exact required check names. |
| Local advisory to protected CI transition | Local advisory outputs are superseded only when protected CI regenerates equivalent artifact and report evidence from immutable source. |
| Failure rollback and cleanup strategy | Unauthorized repo/workflow artifacts stop the sprint. Cleanup of workflow files or repository metadata requires explicit approval and blocker-register updates. |

## Goals

Sprint 25 plan-writing defines:

- the exact approval text required before future repository initialization
- the exact approval text required before future initial commit
- the exact approval text required before future workflow file creation
- the exact approval text required before future branch protection
- git initialization preflight and stop gates
- initial commit include and exclude policy
- `.gitignore` review policy
- workflow YAML creation scope
- CI command matrix and blocked commands
- artifact upload policy
- criteria for moving from local advisory evidence to protected CI evidence
- rollback and cleanup routing for failed or unauthorized steps

## Non-Goals

Sprint 25 plan-writing does not:

- run `git init`
- create `.git`
- create `.github`
- create `.github/workflows`
- create `.github/workflows/ci-source-provenance.yml`
- create CI helper scripts
- create commits, branches, tags, remotes, pushes, merges, or pull requests
- configure branch protection
- upload artifacts
- claim release-grade or protected CI provenance
- run public hosting or deployment
- connect managed infrastructure
- send wallet actions
- run chain-operation commands
- install dependencies
- create fake CI results, fake release tags, or fake artifact hashes
- expand beyond the testnet evidence boundary

## Approval Text Requirements

Future execution must not infer approval from this plan. It must receive explicit user approval in one of these forms.

### Approval A: Repository Initialization Only

The user approval must include these fields:

```text
approvedAction=git-initialization
approvedBy=named-user-or-role
approvedAt=ISO-8601 timestamp recorded by operator
workspacePath=C:\Users\qwaqw\Desktop\Looprail
initialBranchPolicy=recorded branch name and naming rule
commitIncluded=false
remoteIncluded=false
pushIncluded=false
workflowIncluded=false
branchProtectionIncluded=false
```

This approval authorizes only repository initialization. It does not authorize staging, commit, remote, push, workflow, branch protection, deployment, hosted runtime activation, or chain-operation commands.

### Approval B: Initial Commit Only

Initial commit approval is valid only after `.git=True` and after the user separately approves commit creation. It must include:

```text
approvedAction=initial-commit
approvedBy=named-user-or-role
approvedAt=ISO-8601 timestamp recorded by operator
commitMessage=approved conventional commit message
stagingPolicy=allowlist-only
remoteIncluded=false
pushIncluded=false
workflowIncluded=false
branchProtectionIncluded=false
```

This approval does not authorize remote setup, push, workflow file creation, or branch protection.

### Approval C: Workflow File Creation Only

Workflow creation approval is valid only after repository initialization approval and after the user confirms the future workflow path. It must include:

```text
approvedAction=workflow-file-creation
approvedBy=named-user-or-role
approvedAt=ISO-8601 timestamp recorded by operator
workflowPath=.github/workflows/ci-source-provenance.yml
workflowName=ci-source-provenance
draftSource=docs/implementation/giwa-ci-workflow-yaml-draft.md
runnerPolicy=windows-latest unless user records a different runner
helperScriptsIncluded=none unless exact paths are named
branchProtectionIncluded=false
publicHostingIncluded=false
```

This approval does not authorize branch protection, artifact upload, release tags, deployment, or public hosting.

### Approval D: Branch Protection Only

Branch protection approval is valid only after a GitHub repository exists, the workflow file exists, and real CI statuses are visible. It must include:

```text
approvedAction=branch-protection
approvedBy=named-user-or-role
approvedAt=ISO-8601 timestamp recorded by operator
repository=recorded repository URL or name
protectedBranch=recorded branch name
reviewerPolicy=recorded reviewer count and owner rule
mergePolicy=recorded merge method and direct-push rule
requiredChecks=exact workflow job names
releaseOwner=recorded owner
rollbackOwner=recorded owner
workflowPath=.github/workflows/ci-source-provenance.yml
```

This approval does not authorize public hosting or deployment.

## Git Initialization Preflight

Before any future repository initialization, run only path/state checks:

```powershell
Test-Path .git
Test-Path .github
Test-Path .github\workflows
Test-Path scripts\ci
Test-Path .gitignore
```

Expected before approved execution:

```text
False
False
False
False
True
```

Stop before any repository action if the observed state differs from the approval record.

Do not run `git status --short` until `.git=True`.

## Initial Commit Include Policy

The first commit, if later approved, must use allowlist staging. Allowed categories:

- `README.md`
- canonical product documents
- sprint plans
- implementation documents
- public-safe evidence files
- public web assets
- source files
- package manifests
- `pnpm-lock.yaml`
- workspace config files

Before staging, inspect the candidate list with a non-destructive command after `.git=True`:

```powershell
git status --short
```

Expected:

```text
Only reviewed source, docs, public assets, public-safe evidence, package metadata, lockfile, and workspace config appear as staging candidates.
```

Broad staging is blocked until the operator records that every candidate path has been reviewed against the include and exclude policies.

## Initial Commit Exclude Policy

The first commit must exclude:

- `.env`
- `.env.local`
- `.env.*`
- wallet export files
- credential-bearing files
- tokenized RPC or auth-header dumps
- `apps/web/.data`
- local DB files
- runtime logs
- browser state
- `node_modules`
- `.next`
- `dist`
- `coverage`
- `.turbo`
- Hardhat cache and contract artifacts
- local memory folders
- raw or private JSON files
- generated runtime cache folders

If any excluded class appears in the staging candidate list, stop before commit and remove it from staging. If `.gitignore` does not cover the excluded class, stop and route to a separate repository hygiene approval.

## `.gitignore` Review Policy

Before future staging, verify that `.gitignore` covers at least:

```text
.env
.env.*
*.pem
*.key
*.p8
*.p12
*.keystore
*.jks
*private-key*
*private_key*
*privatekey*
wallet recovery phrase filename globs already present in `.gitignore`
*seed-phrase*
*seed_phrase*
*.seed
wallet*.json
*.wallet.json
wallet-*.json
*-wallet.json
*auth-header*
node_modules/
.next/
dist/
coverage/
.turbo/
apps/web/.data/
docs/evidence/local/
*.raw.json
*.private.json
packages/contracts/cache/
packages/contracts/artifacts/
packages/contracts/typechain-types/
```

The review result must be recorded before an initial commit approval can proceed.

## Workflow YAML Creation Scope

The authoritative Markdown draft source is:

```text
docs/implementation/giwa-ci-workflow-yaml-draft.md
```

The future workflow path is:

```text
.github/workflows/ci-source-provenance.yml
```

Workflow creation is limited to the approved path and any explicitly approved helper paths. If `helperScriptsIncluded=none`, omit helper command steps from the actual workflow.

The workflow must use:

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
```

The planned runner policy is `windows-latest` unless the approval record explicitly changes it. Any runner change must be recorded before the workflow file is created.

## CI Matrix

Every command-running job uses this prelude:

```powershell
node --version
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm --version
pnpm install --frozen-lockfile
```

Package checks:

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
```

Workspace checks:

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Node syntax checks:

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

Artifact and provenance checks:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
```

Run package-scoped checks before aggregate workspace checks while diagnosing failures. Run artifact/provenance checks after build-producing commands. Avoid parallel build and contract test runs if cache writes collide.

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

Syntax checks against script files are allowed only through `node --check`.

## Safe Scan Boundary

Future CI scans must:

- reject excluded paths before reading content
- scan only repository source, docs, public assets, public-safe evidence, and package metadata
- report file path, line, rule id, match class, count, decision, and `valuePrinted=false`
- classify public addresses, public transaction hashes, block fields, and hash fields separately from credential-like material
- fail if a public artifact is served but missing from the artifact manifest
- never print local env contents or process env values

## Artifact Upload Policy

Artifact upload is blocked until protected CI exists.

Future upload candidates:

- `docs/evidence/local-artifact-manifest.json`
- `docs/evidence/local-provenance-report.json`
- `docs/evidence/local-provenance-report.json.sha256`
- `docs/evidence/local-provenance-verification.json`
- `docs/evidence/local-command-evidence-report.json`

Future upload metadata must include:

- workflow run id
- source commit
- branch name
- artifact name
- uploaded file list
- byte counts
- file hashes
- retention period
- CI-artifact-only classification
- manifest hash
- report hash
- verification decision

Upload stays blocked if `artifact:scan` fails or if provenance verification is not passing.

## Protected Branch And Required Checks

Branch protection is a later approval gate. It requires:

- approved repository initialization
- approved workflow file creation
- stable workflow job names
- at least one real CI status from the workflow
- recorded branch naming policy
- recorded reviewer policy
- recorded merge policy

Required check names:

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

Do not configure approximate required checks. If a job name differs, update the approval record before enforcement.

## Local Advisory To Protected CI Transition

Local advisory evidence can be superseded only when all of these are true:

- `.git=True`
- `.github=True`
- `.github/workflows=True`
- `scripts/ci` state is recorded
- immutable source commit is recorded
- workflow run id is recorded
- required checks are enforced on the protected branch
- frozen lockfile install passes in CI
- artifact manifest is generated by protected CI
- provenance report is generated by protected CI
- provenance verification passes in protected CI
- artifact upload metadata includes source commit and workflow run id
- release owner and approval timestamp are recorded

Until then, these fields remain blocked:

- source commit authority
- workflow run authority
- protected check enforcement
- protected artifact upload identity
- release tag authority
- staging promotion decision

## Failure Rollback And Cleanup

| Failure | Required response |
|---|---|
| `.git` appears without approval | Stop and report approval gap. Do not proceed to staging, commit, workflow, or branch protection. |
| Workflow path appears without approval | Stop workflow work and route to workflow creation approval. Remove only after explicit cleanup approval. |
| CI helper path appears without approval | Stop and record helper approval gap. Remove only after explicit cleanup approval. |
| Broad staging includes excluded surfaces | Unstage before commit and report blocked file classes. |
| Branch protection is requested before repository and real CI statuses exist | Keep branch protection blocked and route to branch protection approval. |
| Required check names do not match workflow job names | Block protected CI and update the approval record before enforcement. |
| Artifact upload happens before protected CI exists | Quarantine the upload, keep local evidence advisory, and update blocker register. |
| Safe scan prints matched values | Quarantine the output, stop promotion, and replace with metadata-only scan output. |

Rollback cannot reverse public GIWA Sepolia evidence. Static fallback remains the continuity surface only when GET smoke and hash verification are recorded.

## Task Plan

### Task 1: Create Sprint 25 Routing Plan

**Files:**

- Create: `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `README.md`

- [ ] **Step 1: Write the failing path check**

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md
```

Expected before edit:

```text
False
```

- [ ] **Step 2: Add the plan and routing links**

Create the plan at the exact path above. Add Sprint 25 to the sprint index after Sprint 24. Link Sprint 25 from the README hosted ops readiness section.

- [ ] **Step 3: Run the passing path check**

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md
```

Expected after edit:

```text
True
```

### Task 2: Lock Approval Gates

**Files:**

- Modify: `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`

- [ ] **Step 1: Check for gate text before final review**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "Approval A","Approval B","Approval C","Approval D"
```

Expected:

```text
Four approval sections are present.
```

- [ ] **Step 2: Confirm the stop boundary**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "does not authorize","must not infer approval","This approval does not authorize"
```

Expected:

```text
Approval text prevents bundling repository, commit, workflow, and branch-protection actions.
```

### Task 3: Specify Git Preflight And Staging Boundary

**Files:**

- Modify: `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`

- [ ] **Step 1: Verify preflight commands are present**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "Test-Path .git","Test-Path .github","Test-Path scripts\\ci","Test-Path .gitignore"
```

Expected:

```text
All path checks are present.
```

- [ ] **Step 2: Verify include and exclude policies are present**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "Initial Commit Include Policy","Initial Commit Exclude Policy",".gitignore Review Policy"
```

Expected:

```text
Initial commit and ignore review sections are present.
```

### Task 4: Specify Workflow Creation Boundary

**Files:**

- Modify: `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`

- [ ] **Step 1: Verify draft source and future workflow path**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "docs/implementation/giwa-ci-workflow-yaml-draft.md",".github/workflows/ci-source-provenance.yml","windows-latest"
```

Expected:

```text
Authoritative draft source, future workflow path, and runner policy are present.
```

- [ ] **Step 2: Verify safe workflow header**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "permissions:","contents: read","workflow_dispatch"
```

Expected:

```text
Read-only permissions and safe triggers are present.
```

### Task 5: Specify CI Matrix And Artifact Policy

**Files:**

- Modify: `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`

- [ ] **Step 1: Verify package and workspace commands**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "pnpm --filter @giwa/web --fail-if-no-match test","pnpm --filter @giwa/protocol --fail-if-no-match build","pnpm --filter @giwa/contracts --fail-if-no-match build","pnpm build"
```

Expected:

```text
Package and workspace commands are present.
```

- [ ] **Step 2: Verify artifact commands and upload block**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "artifact:local","artifact:provenance:verify -- --check","Artifact upload is blocked until protected CI exists"
```

Expected:

```text
Artifact commands and upload block are present.
```

### Task 6: Specify Protected Branch Transition

**Files:**

- Modify: `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`

- [ ] **Step 1: Verify exact check names**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "source-provenance","workflow-command-boundary","artifact-provenance"
```

Expected:

```text
Required check names are present.
```

- [ ] **Step 2: Verify transition criteria**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "Local Advisory To Protected CI Transition","immutable source commit","workflow run id"
```

Expected:

```text
Transition criteria are present and still distinguish local advisory evidence from protected CI evidence.
```

### Task 7: Specify Failure And Cleanup Routing

**Files:**

- Modify: `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`

- [ ] **Step 1: Verify rollback table**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "Failure Rollback And Cleanup","appears without approval","Remove only after explicit cleanup approval"
```

Expected:

```text
Rollback and cleanup stop conditions are present.
```

- [ ] **Step 2: Verify blocked workflow commands**

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md -Pattern "deploy:giwa","fund:giwa","anchor:giwa","verify:giwa","serve:live","export:live-demo"
```

Expected:

```text
Blocked commands are listed for future workflow review.
```

### Task 8: Verify Documentation Safety

**Files:**

- Verify: `docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md`
- Verify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Verify: `README.md`

- [ ] **Step 1: Run required path check**

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md
```

Expected:

```text
True
```

- [ ] **Step 2: Run unfinished-marker scan**

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $docPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

Expected:

```text
No new Sprint 25 unfinished-marker matches. Existing repository policy examples, if any, are reported as guardrail text.
```

- [ ] **Step 3: Run unsupported-claim scan**

```powershell
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment")
rg -n $riskPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

Expected:

```text
No new Sprint 25 unsupported-claim matches. Existing matches are guardrail or historical reference text.
```

- [ ] **Step 4: Run Sprint 25 credential-term scan**

```powershell
$credentialPattern = ("private ke" + "y") + "|" + ("mnem" + "onic") + "|" + ("bear" + "er") + "|" + ("api " + "key") + "|" + ("sec" + "ret")
rg -n $credentialPattern docs\superpowers\plans\2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md
```

Expected:

```text
No matches.
```

- [ ] **Step 5: Confirm no repository or workflow path was created**

```powershell
Test-Path .git
Test-Path .github
Test-Path .github\workflows
Test-Path scripts\ci
```

Expected:

```text
False
False
False
False
```

## Sprint 25 Exit Gate

Sprint 25 planning is complete only when:

- this plan exists
- sprint index routes to this plan
- README links this plan if README remains the reviewer entry point
- approval text requirements are explicit for repository initialization, initial commit, workflow creation, and branch protection
- git initialization preflight is path-only while `.git=False`
- initial commit include/exclude policy is explicit
- `.gitignore` review policy is explicit
- workflow YAML source and future path are explicit
- CI command matrix uses existing scripts only
- blocked commands are listed
- artifact upload remains blocked until protected CI exists
- protected branch check names are exact
- local advisory to protected CI transition criteria are explicit
- failure rollback and cleanup routing is explicit
- validation commands have been run and reported
- `.git`, `.github`, `.github/workflows`, workflow files, and CI scripts were not created during plan-writing

## Sprint 26 Candidates

- `git-and-workflow-initialization-execution`
- `hosted-adapter-implementation`
- `staging-deployment-dry-run`

Recommended next action after Sprint 25 planning approval:

```text
Ask the user to approve repository initialization, workflow file creation, both, or neither. If the user also wants an initial commit or branch protection, require separate explicit approval for those actions.
```

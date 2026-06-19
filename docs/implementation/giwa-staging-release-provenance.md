# GIWA Staging Release Provenance

## Source Provenance Gate

Staging preparation remains blocked until protected CI and release approval exist. Sprint 26 creates a local git repository and workflow file, but a staging artifact still cannot be promoted from local-only evidence.

Current workspace check:

```powershell
Test-Path .git
Test-Path .github
```

Observed Sprint 19 status:

```text
.git=False
.github=False
```

Observed Sprint 26 local state:

```text
.git=True
.github=True
.github/workflows=True
workflowPath=.github/workflows/ci.yml
remoteGitHubRepository=absent
githubActionsRun=absent
requiredCheckStatuses=absent
protected-ci=blocked
branch-protection=blocked
```

Observed Sprint 29 remote state:

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=private
remoteName=origin
pushedCommit=6cc707a5713c3355bba0a22afe7458a787e1c8d7
githubActionsRun=observed-startup-failure
requiredCheckStatuses=absent
protectedArtifactUploadMetadata=absent
branchProtection=blocked-github-plan-or-visibility
```

Required before staging dry run:

| Gate | Required evidence |
| --- | --- |
| Git-backed workspace | `Test-Path .git` returns `True` |
| CI workflow path | `Test-Path .github` returns `True` and workflow path is reviewed |
| Remote GitHub source | configured remote URL, push approval, and immutable pushed source commit |
| Protected branch policy | recorded branch, reviewer, and merge policy |
| Source commit | immutable commit id recorded in release manifest |
| Lockfile state | no unexplained lockfile drift |
| Release owner | named owner and approval timestamp |
| Local checks | advisory only until CI repeats them |

## Artifact Manifest

Artifact manifest shape:

```json
{
  "releaseId": "giwa-intent-rail-testnet-YYYYMMDD",
  "sourceCommit": "blocked-required-after-git-backed",
  "stage": "staging-testnet",
  "generatedAt": "ISO-8601",
  "artifacts": [
    { "path": "apps/web/public/flow-data.json", "sha256": "computed" },
    { "path": "apps/web/public/partner-snapshot.json", "sha256": "computed" },
    { "path": "apps/web/public/live-demo-snapshot.json", "sha256": "computed" },
    { "path": "docs/evidence/live-demo-sprint12-snapshot.json", "sha256": "computed" }
  ],
  "checks": {
    "staticFallback": "pass-or-blocked",
    "liveReadOnlySmoke": "pass-or-blocked",
    "commercialReceiptGate": "pass-or-blocked",
    "safeScans": "pass-or-blocked"
  }
}
```

## No-Rebuild Promotion

Promotion requires:

1. Build once from a protected source commit.
2. Record artifact checksums.
3. Promote the same artifact set to later stages.
4. Stop if any artifact changes between stages.
5. Stop if lockfile drift is unexplained.
6. Stop if public artifact scan fails.
7. Stop if readiness is red.
8. Stop if any gate requires wallet action, chain-operation command, or real env output.

## CI Gate

Protected CI must run at least:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Local command results remain advisory evidence until protected CI repeats them from a git-backed source.

## Sprint 20 CI and Source Provenance

Sprint 20 planning is documented in:

```text
docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md
```

Sprint 20 turns this provenance gate into a future protected-CI plan. It does not create `.git`, `.github`, workflow files, release tags, release artifacts, or public deployment.

## Sprint 20 Source Provenance Gate

Historical Sprint 20 blocker state before repository initialization:

```text
.git=False
.github=False
pnpm-lock.yaml=True
```

Current Sprint 27 blocker state after local repository and workflow initialization:

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

Source provenance stays blocked until:

- workflow path is reviewed
- remote GitHub repository and push approval are recorded
- immutable source commit is recorded
- GitHub Actions run id is recorded
- protected branch, reviewer, and merge policy are recorded
- root package manager is pinned and honored
- lockfile drift is absent or approved
- protected CI passes from the immutable source commit

## Sprint 20 CI Workflow Design

Sprint 26 workflow path:

```text
.github/workflows/ci.yml
```

Future workflow jobs:

- `source-provenance`
- `workflow-command-boundary`
- `web-checks`
- `protocol-checks`
- `contracts-checks`
- `workspace-checks`
- `node-syntax-checks`
- `safe-scans`
- `artifact-provenance`
- `protected-ci-gate`

The workflow must use `pnpm@10.32.1`, run from protected git-backed source, and exclude `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, mint commands, wallet actions, managed infrastructure, and real env output.

## Sprint 20 Required Check Matrix

Required future checks:

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

## Sprint 20 Hash Policy

Release manifests must separate:

- source commit identity
- lockfile hash
- evidence input hashes
- generated public artifact hashes
- aggregate build tree hash

Hashing excludes local DB files, local env files, process env values, and browser local state.

## Sprint 20 Lockfile Policy

- `pnpm-lock.yaml` must exist.
- CI uses root `packageManager` value `pnpm@10.32.1`.
- `pnpm install --frozen-lockfile` must not rewrite the lockfile.
- Any package manifest or lockfile drift blocks promotion unless dependency approval records the change.
- No package is added in Sprint 20 planning.

## Sensitive Surface Scan Policy

- CI scans repository source, docs, public artifacts, and release manifests.
- CI excludes real env files and never prints process environment values.
- Scan output reports file path, line number, rule id, and redacted match class only.
- Public artifact checks allow public addresses, public transaction hashes, block fields, hash fields, bounded verifier status, public routes, and approved snapshot paths.
- Promotion stops when a scan fails.

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
- protected artifact upload metadata generated by CI
- static fallback GET routes checked
- live read-only smoke checked when a local server is selected
- commercial receipt gate remains matched-only
- public artifact scans passed
- release owner and approval timestamp recorded

## Sprint 21 CI Workflow Implementation

Sprint 21 planning is documented in:

```text
docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md
```

Sprint 21 keeps repository transition and workflow-file creation behind separate user approval gates. Local non-git checks remain advisory until protected CI repeats the matrix from an immutable source commit and generates artifact provenance.

## Sprint 21 Repository Transition Gate

Repository transition is blocked until the user explicitly approves it in the active session.

Before approval:

- `Test-Path .git` must remain `False`.
- `.gitignore` must be reviewed for env files, local DB files, local runtime data, generated private artifacts, cache outputs, and build outputs.
- No commit, branch, tag, push, merge, or remote setup command may run.

After approval:

- Run repository initialization or import only in the approved path.
- Review `git status --short` before first staging.
- Stage only reviewed source, docs, package manifests, lockfile, public artifacts, and approved evidence.
- Do not stage real env files, local DB files, wallet exports, runtime logs, cache folders, or local browser state.
- Record source commit only after the first approved commit exists.

## Sprint 21 Workflow Creation Gate

Workflow creation was approved and executed locally at `.github/workflows/ci.yml`; protected CI remains blocked until that workflow runs from pushed GitHub source.

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
- protected artifact upload metadata generated by CI
- release approval readiness

Local checks must not populate final source commit, CI run id, release tag, or final artifact provenance fields.

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
- protected artifact upload metadata generated by CI
- static fallback route smoke remains green
- matched-only receipt gate remains green
- release owner recorded
- approval timestamp recorded

## Sprint 21 Dry-Run Artifacts

Sprint 21 execution artifacts are documentation-only:

```text
docs/implementation/giwa-ci-workflow-draft.md
docs/implementation/giwa-local-ci-simulation.md
docs/implementation/giwa-provenance-artifact-manifest.md
docs/implementation/giwa-release-approval-checklist.md
docs/implementation/giwa-ci-failure-triage.md
```

These artifacts refine the future workflow, local-advisory simulation scope, artifact/provenance schemas, release checklist, and failure routing. They do not create `.git`, `.github`, workflow files, source commits, CI run ids, release tags, or final artifact provenance.

## Sprint 22 Local Advisory Artifact Manifest

Sprint 22 local outputs:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-provenance-report.json
```

These files can prove local inventory, file hashes, public artifact scan results, and report-to-manifest binding for the current workspace. They cannot prove immutable source identity, protected workflow execution, required check enforcement, or release approval.

## Sprint 23 Local Provenance Verification

Sprint 23 local outputs:

```text
docs/evidence/local-command-evidence-report.json
docs/evidence/local-provenance-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
```

Sprint 23 verifies the local report against raw manifest bytes, current public artifact drift, redacted scanner results, domain hash classifications, command catalog metadata, and the external-only sidecar hash.

The output authority remains `local-advisory`. Staging promotion remains blocked until a git-backed protected CI run regenerates equivalent evidence and records immutable source commit, workflow run id, required-check enforcement, artifact digest, release owner, and release approval timestamp.

## Sprint 24 Workflow Creation Approval Gate

Sprint 24 approval documents:

```text
docs/implementation/giwa-git-initialization-approval.md
docs/implementation/giwa-ci-workflow-creation-approval.md
docs/implementation/giwa-branch-protection-approval.md
docs/implementation/giwa-ci-workflow-yaml-draft.md
```

These documents prepare approval records only. They do not create `.git`, `.github`, workflow files, CI helper scripts, source commits, workflow run ids, release tags, or final artifact provenance.

Approval remains split into four gates:

1. Git repository initialization approval.
2. Initial commit approval.
3. `.github/workflows` file creation approval.
4. Branch protection and required checks approval.

The Sprint 24 YAML draft is Markdown-only. Sprint 26 converted the approved workflow path to:

```text
.github/workflows/ci.yml
```

Protected release provenance remains blocked until all of these are true:

- `.git=True`
- `.github=True`
- workflow path reviewed
- branch protection configured
- required checks enforced
- source commit recorded
- workflow run id recorded
- artifact manifest generated by protected CI
- provenance report generated by protected CI
- protected artifact upload metadata generated by protected CI
- release owner and approval timestamp recorded

Local Sprint 22/23 evidence stays `local-advisory` until protected CI regenerates equivalent evidence from immutable source.

## Sprint 26 Git And Workflow Initialization Execution

Sprint 26 execution record:

```text
docs/implementation/giwa-git-and-workflow-initialization-execution.md
```

Sprint 26 creates local source provenance and the workflow file at `.github/workflows/ci.yml`. It does not push, create a remote workflow run, configure branch protection, upload artifacts, create release tags, public-host, deploy, connect managed infrastructure, send wallet actions, run chain-operation commands, install dependencies, or create protected CI provenance.

## Sprint 27 Protected CI Run And Release Provenance

Sprint 27 execution record:

```text
docs/implementation/giwa-protected-ci-run-and-release-provenance.md
```

Sprint 27 confirms that local git and `.github/workflows/ci.yml` exist, but protected CI remains blocked:

```text
remoteGitHubRepository=absent
remotePushApproval=absent
githubActionsRun=absent
requiredCheckStatuses=absent
protectedArtifactGeneration=absent
releaseApproval=blocked
branchProtection=blocked
authority=local-advisory
```

Local advisory artifact and provenance files can support review only. They cannot be promoted to staging release authority until protected CI regenerates equivalent evidence from pushed immutable source and branch protection enforces the exact required checks.

## Sprint 25 Readiness And Protected CI Transition

Sprint 25 readiness documents:

```text
docs/implementation/giwa-git-and-workflow-initialization-readiness.md
docs/implementation/giwa-initial-commit-file-policy.md
docs/implementation/giwa-workflow-creation-preflight.md
docs/implementation/giwa-protected-ci-transition-checklist.md
```

These documents record the current blocked approval state and do not create repository metadata, commits, workflow files, CI helper scripts, workflow run ids, release tags, protected checks, or final artifact provenance.

The canonical required check names for future branch protection are:

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

Protected CI can supersede local advisory evidence only after a git-backed source commit, reviewed workflow path, successful protected CI run, exact required-check enforcement, CI-generated artifact manifest, CI-generated provenance report, upload metadata, release owner, and approval timestamp are recorded.

## Sprint 28 Protected CI Activation Hardening

Sprint 28 local hardening adds CI guard scripts and the `protected-ci-gate` required-check candidate. It also separates write-mode local artifact refresh from workflow drift checks: protected CI uses dry-run/check-only artifact commands and fails if committed evidence artifacts drift.

Protected CI evidence must use staging-named paths:

```text
docs/evidence/giwa-staging-artifact-manifest.json
docs/evidence/giwa-staging-provenance-report.json
docs/evidence/giwa-staging-provenance-report.json.sha256
docs/evidence/giwa-staging-artifact-upload-metadata.json
```

The local files keep advisory authority:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-command-evidence-report.json
docs/evidence/local-provenance-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
```

These local files must remain `authority=local-advisory`, `releaseGrade=false`, and `canUnblockStaging=false`.

## Sprint 29 GitHub Remote Activation Result

Sprint 29 moved source provenance from local-only to remote-pushed, but it did not produce protected CI authority:

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
sourceCommit=f0a54e684bcd873cedc3623a8416faf356484730
pushRunId=27848145919
pushRunConclusion=startup_failure
dispatchRunId=27848184212
dispatchRunConclusion=startup_failure
jobConclusions=absent
protectedArtifactUploadMetadata=absent
```

Branch protection remains blocked by GitHub plan or repository visibility:

```text
branchProtectionApiStatus=403
branchProtectionErrorClass=github-plan-or-visibility-gate
```

Staging dry-run remains blocked until a successful protected CI run produces required check statuses and branch protection is configured or an explicit source-control policy replacement is approved.

## Sprint 30 Startup Failure Triage

Sprint 30 routes the current GitHub Actions failure before protected artifact handoff:

```text
plan=docs/superpowers/plans/2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md
triage=docs/implementation/giwa-github-actions-startup-failure-triage.md
latestPushRunId=27848419907
latestPushRunConclusion=startup_failure
latestPushRunJobs=0
diagnosticRunId=27849055389
diagnosticRunConclusion=startup_failure
diagnosticRunJobs=0
postVisibilityDiagnosticRunId=27849292869
postVisibilityDiagnosticConclusion=failure
postVisibilityDiagnosticJobs=3
postVisibilityDiagnosticAnnotation=account-locked-due-to-billing
branchProtection=configured-required-checks-failing
protectedBranch=main
branchProtectionEnforceAdmins=false
protectedWorkflowCheckRuns=10
protectedArtifactGeneration=blocked
protectedArtifactUploadMetadata=blocked
```

Protected artifact generation and upload metadata are downstream of successful GitHub job/check contexts. Public source visibility allowed diagnostic check runs to be created, but the first diagnostic job was not started because the GitHub account is locked due to a billing issue. The diagnostic workflow cannot substitute for the protected `ci-source-provenance` required-check set or release approval.

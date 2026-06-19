# Sprint 31 Source Visibility and Actions Runner Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging for GitHub Actions evidence and superpowers:executing-plans for task-by-task execution.

**Goal:** Resolve or definitively classify the repository/account/platform startup gate found in Sprint 30 by testing whether public source visibility unblocks GitHub Actions job creation and branch protection for the repository.

**Non-goals:** Sprint 31 does not public-host the web app, deploy an application, connect managed infrastructure, read or print real env values, send wallet transactions, run GIWA chain-operation commands, install dependencies, create release tags, or claim protected CI provenance before real GitHub checks pass.

## Current State

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
currentVisibility=private
sourceCommit=8d9f369c9816ed2341c70402e4db6c13b6714df8
protectedWorkflow=.github/workflows/ci.yml
diagnosticWorkflow=.github/workflows/ci-diagnostic.yml
diagnosticRunId=27849055389
diagnosticRunConclusion=startup_failure
diagnosticRunJobs=0
branchProtectionStatus=blocked-github-plan-or-visibility
rootCauseClass=repository-account-platform-startup-gate
```

## Approval Interpretation

The user approved continued GitHub repository, workflow, protected CI preparation, branch protection setup attempts, documentation, tests, local evidence, provenance artifacts, and additional commits. Sprint 31 treats source visibility conversion as a repository governance action, not as public app hosting or deployment.

Because public source visibility can expose repository contents, Sprint 31 must run and record source-safety checks before conversion. If source-safety checks fail, stop before changing visibility.

## Task 1: Source Visibility Safety Check

- [ ] Verify the working tree is clean.
  ```powershell
  git status --short
  ```
- [ ] Verify the repository remains private before conversion.
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail --jq '{full_name:.full_name,private:.private,visibility:.visibility}'
  ```
- [ ] Run safe scans that exclude real env files and report only public repository files.
  ```powershell
  powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
  rg -n "0x[a-fA-F0-9]{64}|mnem" README.md docs apps packages .github -g "*.md" -g "*.json" -g "*.ts" -g "*.tsx" -g "*.js" -g "*.mjs" -g "*.yml" -g "*.yaml" -g "!*.env*"
  ```
  Expected result: safe scan passes; raw sensitive values are absent. Public testnet hashes and policy examples may exist and do not block source visibility.

## Task 2: Public Source Visibility Conversion

- [ ] Convert the GitHub repository from private to public only after Task 1 passes.
  ```powershell
  gh repo edit aop60003/giwa-verified-intent-rail --visibility public --accept-visibility-change-consequences
  ```
- [ ] Record visibility after conversion.
  ```powershell
  gh api repos/aop60003/giwa-verified-intent-rail --jq '{full_name:.full_name,private:.private,visibility:.visibility}'
  ```
- [ ] Update source visibility state in blocker and provenance docs.

## Task 3: Diagnostic Workflow Rerun

- [ ] Dispatch the minimal diagnostic workflow.
  ```powershell
  gh workflow run ci-diagnostic.yml --repo aop60003/giwa-verified-intent-rail --ref main
  gh run list --repo aop60003/giwa-verified-intent-rail --workflow ci-diagnostic.yml --limit 5 --json databaseId,status,conclusion,jobs,headSha,url
  ```
- [ ] If diagnostic jobs are created and pass, classify the previous blocker as private repository plan/minutes/visibility-related.
- [ ] If diagnostic still has zero jobs, classify the blocker as account/platform runner startup gate and stop before branch-protection retry.

## Task 4: Protected Workflow Rerun

- [ ] If diagnostic passes, dispatch the protected workflow.
  ```powershell
  gh workflow run ci.yml --repo aop60003/giwa-verified-intent-rail --ref main
  gh run list --repo aop60003/giwa-verified-intent-rail --workflow ci.yml --limit 5 --json databaseId,status,conclusion,headSha,url
  ```
- [ ] Record job/check contexts and first failing command if any job fails.
- [ ] Do not weaken required checks or remove safe-scan/artifact jobs unless a separate root-cause record proves a workflow defect.

## Task 5: Branch Protection Retry

- [ ] Retry branch protection only after at least one real check context exists.
- [ ] Required check candidates remain:
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
- [ ] If branch protection succeeds, record policy evidence.
- [ ] If branch protection fails, record status, response class, and next external gate.

## Task 6: Documentation, Verification, and Commit

- [ ] Update:
  ```text
  README.md
  docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
  docs/implementation/giwa-github-actions-startup-failure-triage.md
  docs/implementation/giwa-staging-blocker-register.md
  docs/implementation/giwa-staging-release-provenance.md
  docs/implementation/giwa-protected-ci-run-and-release-provenance.md
  docs/implementation/giwa-release-approval-checklist.md
  docs/implementation/giwa-branch-protection-approval.md
  ```
- [ ] Run verification:
  ```powershell
  powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
  powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
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

## Sprint 31 Exit Gate

Sprint 31 exits when one of these is true:

- Public source visibility is enabled, diagnostic/protected workflows create real jobs, required checks are observed, and branch protection is configured or its next blocker is recorded.
- Public source visibility is enabled but diagnostic workflows still fail before jobs; blocker is updated to account/platform startup gate.
- Source-safety checks fail before conversion; repository remains private and blocker is updated.

In all cases:

- no public app hosting or deployment occurred
- no managed infrastructure was connected
- no env file contents were read or printed
- no wallet transaction or GIWA chain-operation command ran
- no dependency was installed
- no release tag was created
- protected CI is claimed only if real GitHub required checks pass

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-32-protected-ci-required-checks-and-branch-policy.md`
- `docs/superpowers/plans/2026-06-20-sprint-32-github-account-platform-support-gate.md`
- `docs/superpowers/plans/2026-06-20-sprint-32-staging-artifact-protected-ci-handoff.md`

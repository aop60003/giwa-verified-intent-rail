# Sprint 30 Protected CI Startup and Branch Policy Unblock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging before changing workflow behavior. Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Diagnose and unblock the GitHub Actions startup gate after Sprint 29 created the private GitHub remote, pushed `main`, and observed `startup_failure` with zero jobs.

**Non-goals:** Sprint 30 does not public-host, deploy, connect managed infrastructure, read or print real env values, send wallet transactions, run GIWA chain-operation commands, install dependencies, create release tags, or claim protected CI provenance before real GitHub job/check contexts exist.

**Current evidence:**

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
visibility=private
latestPushedCommit=6cc707a5713c3355bba0a22afe7458a787e1c8d7
workflowPath=.github/workflows/ci.yml
workflowName=ci-source-provenance
pushRunId=27848419907
pushRunConclusion=startup_failure
pushRunJobs=0
checkSuiteConclusion=startup_failure
checkRuns=0
branchProtectionApiStatus=403
branchProtectionErrorClass=github-plan-or-visibility-gate
protectedArtifactUploadMetadata=absent
```

## Parallel Analysis Summary

Eight review perspectives shape this sprint:

1. **Actions startup failure:** `startup_failure` with zero jobs is a pre-job failure class, not a package command failure.
2. **Workflow/YAML diagnostics:** inspect run/check-suite metadata first; use a minimal diagnostic workflow only to isolate platform, runner, and allowed-action gates.
3. **GitHub plan and private repository boundary:** branch protection is blocked by account plan or private repository visibility until plan upgrade, public source visibility approval, or an approved substitute policy exists.
4. **Third-party app check suites:** Cloudtype, Cloudflare, and Vercel queued check suites are non-authoritative until intentionally configured, owned, and passing.
5. **Release provenance boundary:** remote-pushed source is partial provenance; protected CI requires successful job/check contexts and protected artifact evidence.
6. **Blocker register policy:** every external-state transition must update run id, job count, check contexts, branch-protection result, artifact count, owner/timestamp, and next retry condition.
7. **Safety boundary:** diagnostics must not read env files, output secret values, run deploy/chain/wallet commands, or start hosting.
8. **Staging routing:** staging dry-run remains blocked until Actions starts, branch policy is enforced or explicitly replaced, protected artifacts are generated, and release/rollback owners are recorded.

## Task 1: Record Startup Evidence

- [ ] Gather current GitHub run and check-suite metadata.
  - Commands:
    ```powershell
    gh api repos/aop60003/giwa-verified-intent-rail/actions/runs/27848419907 --jq '{id:.id,check_suite_id:.check_suite_id,status:.status,conclusion:.conclusion,path:.path,head_sha:.head_sha,event:.event}'
    gh api repos/aop60003/giwa-verified-intent-rail/commits/6cc707a5713c3355bba0a22afe7458a787e1c8d7/check-suites --jq '{total_count:.total_count, check_suites:[.check_suites[] | {id:.id,app:.app.name,status:.status,conclusion:.conclusion,latest_check_runs_count:.latest_check_runs_count}]}'
    gh api repos/aop60003/giwa-verified-intent-rail/commits/6cc707a5713c3355bba0a22afe7458a787e1c8d7/check-runs --jq '{total_count:.total_count}'
    ```
  - Expected result: GitHub Actions check suite has `conclusion=startup_failure` and zero check runs.
- [ ] Create `docs/implementation/giwa-github-actions-startup-failure-triage.md` with observed metadata and failure classification.

## Task 2: Add Minimal Diagnostic Workflow

- [ ] Failing test first: prove current `ci-source-provenance` cannot produce job contexts.
  - Command:
    ```powershell
    gh run view 27848419907 --repo aop60003/giwa-verified-intent-rail --json databaseId,status,conclusion,jobs
    ```
  - Expected result: `conclusion=startup_failure` and `jobs=[]`.
- [ ] Minimum implementation: add `.github/workflows/ci-diagnostic.yml`.
  - It must contain only non-deploying diagnostics:
    - `diagnostic-platform` on `ubuntu-latest` without external actions.
    - `diagnostic-checkout` using `actions/checkout@v4`.
    - `diagnostic-windows` on `windows-latest` without external actions.
  - It must not install dependencies, read env files, run app servers, deploy, mint, or call GIWA chain commands.
- [ ] Passing check: push the diagnostic workflow and observe whether GitHub creates job contexts.
  - Commands:
    ```powershell
    git status --short
    git add .github/workflows/ci-diagnostic.yml docs/superpowers/plans/2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md docs/implementation/giwa-github-actions-startup-failure-triage.md
    git commit -m "ci: add github actions startup diagnostic"
    git push origin main
    gh run list --repo aop60003/giwa-verified-intent-rail --limit 10 --json databaseId,workflowName,status,conclusion,headSha,url
    ```
  - Expected result:
    - If diagnostic jobs appear, the startup issue is likely specific to the protected CI workflow or runner/action subset.
    - If diagnostic jobs also do not appear, the startup issue is likely a repository/account/platform gate.

## Task 3: Branch Policy Gate

- [ ] Keep branch protection blocked unless GitHub plan, repository visibility, or an approved substitute source-control policy changes.
- [ ] Do not make the private repository public as an implicit workaround.
- [ ] Record the current API result:
  ```text
  branchProtectionApiStatus=403
  branchProtectionErrorClass=github-plan-or-visibility-gate
  ```
- [ ] Update `docs/implementation/giwa-branch-protection-approval.md` with retry policy.

## Task 4: Third-Party Check Suite Classification

- [ ] Record Cloudtype, Cloudflare Workers and Pages, and Vercel check suites as non-authoritative until intentionally configured.
- [ ] Do not add third-party app checks to branch protection or release approval.
- [ ] Do not trigger public hosting, preview deployment, app-side retry, or provider setup.

## Task 5: Documentation and Blocker Updates

- [ ] Update:
  ```text
  README.md
  docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
  docs/implementation/giwa-staging-blocker-register.md
  docs/implementation/giwa-staging-release-provenance.md
  docs/implementation/giwa-protected-ci-run-and-release-provenance.md
  docs/implementation/giwa-release-approval-checklist.md
  docs/implementation/giwa-ci-failure-triage.md
  docs/implementation/giwa-branch-protection-approval.md
  ```
- [ ] Keep local evidence labeled `local-advisory`.
- [ ] Keep staging promotion blocked.

## Task 6: Verification

- [ ] Run local checks that do not require env files:
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
- [ ] Run GitHub observation:
  ```powershell
  gh run list --repo aop60003/giwa-verified-intent-rail --limit 10 --json databaseId,workflowName,status,conclusion,headSha,url
  gh api repos/aop60003/giwa-verified-intent-rail/actions/permissions
  ```
- [ ] Run safe documentation scans without reading real env files:
  ```powershell
  rg -n "TODO|FIXME|TBD" README.md docs/superpowers/plans docs/implementation -g "*.md"
  rg -n "instant finality|200ms confirmed|guarantee safety|perform KYC|real RWA|real yield|real funds|settlement" README.md docs/superpowers/plans docs/implementation -g "*.md"
  rg -n "private key|mnemonic|bearer|api key|secret" docs/superpowers/plans/2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md
  ```
  Expected result: matches, if any, are policy/guardrail references only.

## Sprint 30 Exit Gate

Sprint 30 exits when:

- GitHub Actions startup failure is classified with evidence.
- Diagnostic workflow either creates job contexts or confirms the startup gate applies to minimal workflows too.
- Branch protection remains blocked or is updated only after a recorded plan/visibility/source-control policy change.
- Third-party app check suites are classified as non-authoritative.
- Protected artifact generation remains blocked unless a real successful protected CI run exists.
- README, sprint index, blocker register, release provenance, branch protection, and CI triage docs reflect the current status.
- No public hosting, deployment, managed infrastructure, env-content read, wallet action, GIWA chain-operation command, dependency installation, release tag, or protected-CI claim occurred.

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-31-protected-ci-startup-resolution.md`
- `docs/superpowers/plans/2026-06-20-sprint-31-source-control-policy-decision.md`
- `docs/superpowers/plans/2026-06-20-sprint-31-staging-artifact-protected-ci-handoff.md`

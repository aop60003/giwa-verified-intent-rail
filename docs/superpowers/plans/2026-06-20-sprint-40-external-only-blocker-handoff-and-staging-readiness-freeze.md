# Sprint 40 External-Only Blocker Handoff And Staging Readiness Freeze Implementation Plan

**Goal:** Freeze the maximum safe local-advisory commercial and staging-readiness package while protected CI remains blocked by the external GitHub account gate.

**Architecture:** Sprint 40 does not rerun or dispatch GitHub Actions. It binds the latest local source state, Sprint 38/39 readiness artifacts, bounded receipt/API hardening, public copy hardening, and safe-scan hardening into a final local handoff. It separates external-only blockers from mixed repository/workflow blockers so the next executable action is not ambiguous.

**Authority:** `local-advisory`. Sprint 40 cannot create protected CI provenance, release-grade artifacts, public hosting approval, managed infrastructure approval, partner signoff, or staging execution approval.

## Non-Goals

Sprint 40 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read local env-file contents, output credential values, send wallet actions, run GIWA chain-operation package commands, install dependencies, create release tags, create fake CI results, create fake partner signoff, create fake staging URLs, or claim protected CI provenance.

## Parallel Review Inputs

| Perspective | Sprint 40 action |
| --- | --- |
| Commercial readiness reviewer | freeze the local-advisory package and keep partner traffic blocked |
| Partner handoff reviewer | link final demo, partner packet, and closeout paths to Sprint 40 evidence |
| Evidence packet reviewer | add a public-safe Sprint 40 freeze JSON and include it in artifact inventory |
| Security/privacy reviewer | keep locked receipt API responses bounded and scan public surfaces for unsafe copy |
| Operator/demo reviewer | make `/demo` the first local surface and clearly split live receipt from static receipt |
| Hosted adapter reviewer | keep local adapter contract advisory and managed infrastructure blocked |
| Staging dry-run reviewer | keep execution blocked until protected CI and protected artifact metadata exist |
| External-only blocker reviewer | keep GitHub account, external signoff, hosting approval, and managed infrastructure as external blockers while classifying protected artifact and branch checks as mixed blockers |

## Tasks

- [x] **Task 1: Freeze Sprint 40 scope**
  - Write this plan and keep the scope local-advisory.
  - Confirm no protected CI dispatch or rerun is part of this sprint.

- [x] **Task 2: Harden locked receipt behavior**
  - Add a failing test that proves locked receipt API responses do not expose internal receipt gate reasons.
  - Implement the bounded `receipt_not_found` response.
  - Confirm the focused live API test passes.

- [x] **Task 3: Harden public copy and scan guardrails**
  - Add public copy tests for stale internal wording.
  - Add safe-scan script tests for plan allowlist and common secret-like names.
  - Update public copy and safe scan rules without reading real env files.

- [x] **Task 4: Refresh final handoff documents**
  - Update README, sprint index, commercial readiness, staging blocker, staging provenance, runbook, demo script, submission map, acceptance checklist, partner beta docs, hosted ops, and runtime gate with Sprint 40 status.
  - Keep live and static receipt hashes clearly separated.

- [x] **Task 5: Create Sprint 40 evidence**
  - Record current `main`, check-run count, latest billing-lock run, closed safe tracks, external-only blockers, mixed blockers, and forbidden-action confirmation.
  - Keep evidence public-safe and `releaseGrade=false`.

- [x] **Task 6: Verify local-advisory package**
  - Run focused regression tests.
  - Run package/workspace tests, typecheck, build, artifact local export, provenance verification, artifact scan, node syntax checks, safe scans, and git status/log review.

## Sprint 40 Exit Gate

Sprint 40 exits when:

- plan, implementation record, and public-safe evidence exist
- current `main` source state and zero check-runs are recorded
- locked receipt API responses are bounded
- public copy avoids stale sprint/internal commercial wording
- safe scans no longer blanket-allow all plan files for unsupported and sensitive terms
- partner handoff, demo order, acceptance checklist, submission map, commercial gate, blocker register, runtime gate, and provenance docs point to Sprint 40
- protected CI dispatch or rerun is not executed
- no public hosting, deployment, managed infrastructure connection, credential output, wallet action, chain-operation package command, dependency install, fake CI result, fake partner signoff, fake staging URL, unsupported claim, or Flashblocks final confirmation occurs

## Verification Commands

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
pnpm --filter @giwa/web --fail-if-no-match test -- safeScanScript
powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
pnpm test
pnpm build
pnpm typecheck
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
git status --short
git log --oneline -5
```

Expected result: local tests and artifact verification pass; protected CI remains external-account blocked and is not rerun.

## Handoff

```text
Sprint 40 exit approval:
approvedBy=local-operator
approvedAt=2026-06-21
evidencePath=docs/evidence/commercial-readiness-sprint40-freeze.json
nextSprint=external-github-account-unlock-or-approved-hosted-adapter-implementation
```

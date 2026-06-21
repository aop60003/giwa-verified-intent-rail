# Sprint 47 Client-Side Public Error Copy Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the last audited public browser surface that could display raw exception messages during local demo operation.

**Architecture:** Add a public-copy regression test first, then replace static browser exception display paths with bounded, reviewer-safe copy. Keep protected CI, hosting, managed infrastructure, wallet actions, chain operations, and dependencies untouched.

**Tech Stack:** Static browser JavaScript, Vitest public-copy guard, local-advisory evidence JSON, existing artifact/provenance scripts.

---

## Scope

Sprint 47 handles one bounded internal risk found during final termination audit:

- Public browser surfaces must not render raw `Error.message` or generic unknown-error fallback strings when static data, live status, wallet, approve, deposit, or verify requests fail.

Sprint 47 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation package commands, install dependencies, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

## Task 1: Public Browser Error Copy Regression

**Files:**
- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`

- [x] **Step 1: Write failing test**

Add a test that rejects raw exception-message fallback patterns in checked-in public browser assets:

```ts
expect(copy).not.toMatch(/error\s+instanceof\s+Error\s*\?\s*error\.message/u);
expect(copy).not.toContain("Unknown error");
expect(copy).not.toContain("unknown error");
```

- [x] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
```

Expected before implementation: fails because public JS still renders raw `error.message` fallback paths.

## Task 2: Bounded Client-Side Public Notices

**Files:**
- Modify: `apps/web/public/live-flow.js`
- Modify: `apps/web/public/flow.js`
- Modify: `apps/web/public/demo-control-room.js`

- [x] **Step 1: Minimal implementation**

Replace raw browser exception display with bounded public copy:

- wallet, approve, deposit, and verify failures use fixed local instructions.
- API failures display bounded server `error` codes or `request_failed`.
- static demo load failure uses fixed retry guidance.
- demo control room load failure uses fixed fallback guidance.

- [x] **Step 2: Verify targeted pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicCopyGuard
```

Expected after implementation: public-copy guard passes.

## Task 3: Handoff Documents And Evidence

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`
- Modify: `docs/implementation/giwa-mvp-submission-evidence.md`
- Modify: `docs/implementation/giwa-partner-customer-handoff-package.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Create: `docs/evidence/client-side-public-error-copy-sprint47.json`

- [x] **Step 1: Update handoff copy**

Record Sprint 47 as local-advisory client-side public error-copy hardening only. Keep commercial readiness and staging dry-run blocked.

- [x] **Step 2: Create evidence JSON**

Record the risk, changed files, targeted red/green result, full verification command set, blocked actions, and remaining external blockers.

## Task 4: Full Verification And Commit

**Files:**
- All Sprint 47 modified files.

- [x] **Step 1: Run verification**

Run:

```powershell
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
```

Expected: all commands pass and working tree contains only reviewed Sprint 47 changes before commit.

- [ ] **Step 2: Commit and push**

Use a normal commit with `[skip ci]` because protected CI dispatch remains blocked by the external GitHub account gate.

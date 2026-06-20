# Sprint 39 Commercial Hardening And Partner Handoff Final Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the commercial hardening and partner handoff safe track while protected CI remains blocked by an external GitHub account gate.

**Architecture:** Sprint 39 is documentation and evidence hardening only. It binds the Sprint 38 local hosted-adapter contract and staging simulation outputs into the partner handoff packet, updates stale final-demo and acceptance documents, and separates completed local readiness from external-only blockers.

**Tech Stack:** Markdown runbooks, public-safe JSON evidence, existing local-advisory artifact/provenance scripts, PowerShell verification commands.

---

## Current State

```text
remoteMain=042d58ddabdf16426c4b870c2c63be2bd406a68f
currentMainCheckRuns=0
latestBillingLockRun=27873338373
latestBillingLockHeadSha=2b414c91b1da6ed64287dbf7b2635be7586e287d
protectedCI=blocked-external-github-account
protectedProvenance=absent
hostedAdapterLocalContract=blocked-local-advisory
stagingDryRunSimulation=blocked-local-advisory
sprint38Evidence=docs/evidence/staging-readiness-sprint38-handoff.json
sprint38EvidenceSha256=DFDDBCF91B5374B5B980BE1DFCCFE70364A66469B41933006605E8B6ED97D3C3
```

## Non-Goals

Sprint 39 does not dispatch or rerun GitHub Actions, public-host, deploy, connect managed infrastructure, read local env-file contents, output credential values, send wallet actions, run GIWA chain-operation package commands, install dependencies, create release tags, create fake CI results, create fake partner signoff, create fake staging URLs, or claim protected CI provenance.

## Parallel Review Findings

| Perspective | Sprint 39 action |
| --- | --- |
| Commercial readiness reviewer | keep commercial readiness blocked, but close local packet/document consistency gaps |
| Partner handoff reviewer | link Sprint 38 local contract and simulation outputs into partner runbooks without inventing signoff |
| Evidence packet reviewer | add a public-safe Sprint 39 handoff JSON and include it in local-advisory artifact inventory |
| Security/privacy boundary reviewer | preserve public-only evidence fields and bounded readiness language |
| Operator/demo readiness reviewer | refresh final opening order and note static fallback plus fresh live evidence roles |
| Hosted adapter boundary reviewer | keep local contract advisory and adapter activation blocked |
| Staging dry-run blocker reviewer | keep staging execution blocked while local readiness evidence is reviewable |
| External-only blocker reviewer | isolate GitHub account gate, partner signoff, hosting approval, and managed infrastructure while classifying protected artifact metadata as mixed repo/workflow readiness |

## Task 1: Plan, Record, And Evidence

**Files:**
- Create: `docs/superpowers/plans/2026-06-20-sprint-39-commercial-hardening-and-partner-handoff-final-readiness.md`
- Create: `docs/implementation/giwa-commercial-hardening-and-partner-handoff-final-readiness.md`
- Create: `docs/evidence/commercial-readiness-sprint39-final-handoff.json`

- [x] **Step 1: Write the plan**

Create this Sprint 39 plan with exact scope, non-goals, tasks, and verification commands.

- [x] **Step 2: Write the final readiness record**

Record final demo order, partner handoff packet, local readiness evidence, external-only blockers, and safety confirmations.

- [x] **Step 3: Write public-safe JSON evidence**

Record current `main`, current check-run count, latest billing-lock run, Sprint 38 evidence hash, local readiness status, mixed repo/workflow blockers, and external-only blockers.

## Task 2: Partner And Demo Handoff Documents

**Files:**
- Modify: `README.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`
- Modify: `docs/implementation/giwa-mvp-demo-script.md`
- Modify: `docs/implementation/giwa-mvp-submission-evidence.md`
- Modify: `docs/implementation/giwa-mvp-acceptance-checklist.md`
- Modify: `docs/implementation/giwa-partner-beta-runbook.md`
- Modify: `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- Modify: `docs/implementation/giwa-partner-beta-closeout-report.md`

- [x] **Step 1: Link Sprint 39 record and evidence**

Add links to the final readiness record and evidence packet.

- [x] **Step 2: Refresh stale source-control state**

Replace stale non-git/prototype wording with the current git-backed but protected-CI-blocked state.

- [x] **Step 3: Preserve partner signoff boundary**

Record external partner signoff as absent unless observed later.

## Task 3: Commercial And Staging Blocker Documents

**Files:**
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Modify: `docs/implementation/giwa-staging-release-provenance.md`

- [x] **Step 1: Update commercial readiness gate**

Record that local hardening and partner handoff are complete at local-advisory authority, while commercial readiness remains blocked externally.

- [x] **Step 2: Update blocker register**

Separate local-readiness-complete fields, mixed repo/workflow blockers, and external-only blockers.

- [x] **Step 3: Update release provenance boundary**

Keep current `main` check-runs count `0` separate from the previous billing-lock dispatch run.

## Task 4: Verification

- [x] Run:

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
git log --oneline -5
```

Expected: local checks pass; protected CI remains externally blocked and is not rerun.

## Sprint 39 Exit Gate

Sprint 39 exits when:

- Sprint 39 plan, record, and public-safe evidence exist
- partner handoff packet references Sprint 38 local readiness evidence
- commercial readiness gate separates local readiness, mixed repo/workflow blockers, and external-only blockers
- final demo, acceptance, submission, and partner docs are current
- local tests, build, typecheck, artifact verification, syntax checks, and safe scans pass
- working tree is committed and pushed
- protected CI dispatch or rerun is not executed
- no public hosting, deployment, managed infrastructure connection, credential output, wallet action, chain-operation package command, dependency install, fake CI result, fake partner signoff, fake staging URL, unsupported claim, or Flashblocks final confirmation occurs

## Next Sprint Candidate

```text
docs/superpowers/plans/2026-06-20-sprint-40-external-only-blocker-handoff-and-staging-readiness-freeze.md
```

# Sprint 43 External Blocker Monitoring and Staging Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the local-advisory staging handoff and make the remaining external blockers monitorable without running protected CI, public hosting, managed infrastructure, wallet actions, or chain-operation commands.

**Architecture:** Sprint 43 is a documentation and evidence freeze. It binds Sprint 40, Sprint 41, and Sprint 42 evidence, defines exact restart conditions for each external blocker, and states that no internal safe-track work should continue unless a blocker changes state.

**Tech Stack:** Markdown runbooks, JSON evidence, local-advisory artifact/provenance scripts, pnpm workspace verification.

---

## Parallel Review Inputs

- External blocker monitor reviewer: keep GitHub account, partner signoff, hosting approval, and managed infrastructure approval as monitored blockers with explicit resume evidence.
- Staging handoff reviewer: add Sprint 42 evidence to the first-read packet and make the protected CI source binding explicit.
- Protected CI recovery reviewer: do not dispatch until GitHub runner startup is available; require all ten checks, artifact metadata, branch protection, and release owner.
- Partner signoff reviewer: define a signoff artifact contract without creating fake signoff.
- Hosting and managed infrastructure reviewer: keep host, origin, operator, rollback owner, durable DB, credential manager, backup target, queue design, and restore owner blocked.
- Evidence map reviewer: bind Sprint 40/41/42 evidence hashes and refresh stale references.
- Commercial readiness auditor: declare local-advisory handoff complete, not commercial-ready.
- Stop condition reviewer: stop when only external blockers remain and no forbidden action has occurred.

## Tasks

- [x] Task 1: Confirm Sprint 43 has no existing plan.
  - Command: `Test-Path docs\superpowers\plans\2026-06-21-sprint-43-external-blocker-monitoring-and-staging-handoff.md`
  - Expected before this sprint: `False`.

- [x] Task 2: Collect read-only parallel reviews.
  - External/protected CI, staging/signoff, hosted/commercial, and evidence/stop-condition reviews completed with no file edits and no forbidden commands.

- [x] Task 3: Create the Sprint 43 monitoring plan.
  - File: `docs/superpowers/plans/2026-06-21-sprint-43-external-blocker-monitoring-and-staging-handoff.md`
  - Required content: monitorable blocker table, resume conditions, stop conditions, evidence binding, and no external execution.

- [x] Task 4: Create the staging handoff record.
  - File: `docs/implementation/giwa-external-blocker-monitoring-and-staging-handoff.md`
  - Required content: current source input, evidence packet, blocker owners by action type, and final local freeze decision.

- [x] Task 5: Create the Sprint 43 evidence JSON.
  - File: `docs/evidence/staging-handoff-sprint43-external-blockers.json`
  - Required content: Sprint 40/41/42 hashes, forbidden action flags, external blocker checklist, mixed repo/workflow blockers, and local safe-track audit.

- [x] Task 6: Refresh stale public docs.
  - Files:
    - `README.md`
    - `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
    - `docs/implementation/giwa-staging-blocker-register.md`
    - `docs/implementation/giwa-staging-release-provenance.md`
    - `docs/implementation/giwa-commercial-readiness-gate.md`
    - `docs/implementation/giwa-partner-customer-handoff-package.md`
    - `docs/implementation/giwa-mvp-runbook.md`
    - `docs/implementation/giwa-mvp-demo-script.md`
    - `docs/implementation/giwa-mvp-acceptance-checklist.md`
    - `docs/implementation/giwa-mvp-submission-evidence.md`

- [x] Task 7: Verify, regenerate local-advisory artifacts, commit, and push.
  - Commands:
    - `powershell -NoProfile -File scripts\ci\check-safe-scans.ps1`
    - `powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1`
    - `pnpm test`
    - `pnpm build`
    - `pnpm typecheck`
    - `pnpm --filter @giwa/web --fail-if-no-match artifact:local`
    - `pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check`
    - `pnpm --filter @giwa/web --fail-if-no-match artifact:scan`
    - `node --check apps/web/public/flow.js`
    - `node --check apps/web/public/live-flow.js`
    - `node --check apps/web/public/demo-control-room.js`
    - `node --check apps/web/scripts/serve-live.mjs`
    - `node --check apps/web/scripts/serve-static.mjs`

## Monitorable External Blockers

| Blocker | Monitor signal | Resume condition | Stop condition |
| --- | --- | --- | --- |
| GitHub account runner startup | Actions UI and latest run annotation | Billing/account lock warning absent, Actions enabled, and runner reaches queued or started state | Billing annotation, startup failure before logs, skipped required jobs, or stale SHA |
| Protected CI required checks | GitHub checks for intended source | All ten required checks pass on the explicitly selected current `main` SHA | Any missing, skipped, renamed, failing, or non-current check |
| Protected artifact metadata | Actions artifact list and staging-named metadata | Artifact manifest, provenance report, sidecar, upload metadata, names, ids, sizes, retention, and SHA binding exist | Zero artifacts or local-advisory files promoted as protected evidence |
| Branch protection satisfaction | Branch protection and check contexts | Required checks are configured and passing on protected branch | Required checks bypass, mismatch, or absent current-head checks |
| Partner/customer signoff | Signed review record | Reviewer identity, date, reviewed packet hash, reviewed local URLs, receipt hashes, blocker acknowledgement, and no-release-approval attestation exist | Fake signoff or signoff used as release/staging approval |
| External hosting approval | Approved host packet | Host, origin policy, operator, rollback owner, and monitoring route approved | Public URL invented or public hosting started |
| Managed infrastructure approval | Approved infra packet | Durable DB, credential manager, backup target, queue design, restore owner, and connection plan approved | Managed DB, cloud secret manager, queue, or backup target connected before approval |

## Exit Gate

Sprint 43 exits when:

- External blockers are monitorable and not repeatedly re-documented as new internal work.
- Sprint 40, Sprint 41, and Sprint 42 evidence paths and hashes are linked from the handoff packet.
- Local-advisory handoff is frozen as complete for review, while commercial readiness and staging dry-run execution remain blocked.
- Protected CI dispatch/rerun, public hosting, managed infrastructure connection, wallet actions, chain-operation commands, dependency install, fake CI evidence, fake signoff, fake staging URLs, and protected provenance claims remain absent.

## Next Action

Wait for a real external blocker state change. If GitHub account runner startup is confirmed, create a protected CI recovery execution plan that targets the exact current `main` SHA. If partner/customer signoff, hosting approval, or managed infrastructure approval arrives first, record that approval artifact without starting staging execution.

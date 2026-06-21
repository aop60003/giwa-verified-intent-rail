# Sprint 41 Partner Customer Handoff Package Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize a local-advisory partner and customer handoff package that a reviewer can open, run, and audit without confusing it for protected CI provenance, public hosting, staging approval, or partner traffic approval.

**Architecture:** Sprint 41 is a documentation and evidence packaging sprint. It aligns the demo order, runbook, acceptance matrix, submission evidence map, blocker register, and partner closeout template around the Sprint 40 local freeze while keeping protected CI and external approvals blocked.

**Tech Stack:** Markdown handoff documents, public-safe JSON evidence, local-advisory artifact/provenance generation, PowerShell scan scripts, pnpm workspace verification.

---

## Boundaries

Sprint 41 may update documents and public-safe evidence only.

Sprint 41 must not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read local environment file contents, print credential values, send wallet actions, run GIWA chain-operation package commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

## Parallel Review Inputs

| Review perspective | Sprint 41 action |
| --- | --- |
| Partner onboarding reviewer | Make the first-read handoff package point to `/demo`, `/live`, dynamic receipt API, static fallback, partner console, and static snapshot in one order. |
| Customer evidence reviewer | Add Sprint 41 evidence and distinguish fresh live rehearsal receipt from recorded static fallback receipt. |
| Demo operator reviewer | Use port `4190` for demo/live/dynamic receipt and port `4176` for static fallback only. |
| Acceptance checklist reviewer | Add a Sprint 41 row to the acceptance checklist and submission evidence map. |
| Security/privacy boundary reviewer | State public evidence boundaries and credential exclusion without printing values. |
| Staging blocker reviewer | Keep protected CI, protected artifacts, branch protection satisfaction, release approval, hosting, infrastructure, and signoff blocked. |
| Commercial copy reviewer | Use local-advisory partner review-ready wording, not release-grade or protected-provenance wording. |
| External-only blocker reviewer | Separate external-only blockers from mixed repo/workflow blockers. |

## File Structure

| Path | Responsibility |
| --- | --- |
| `docs/implementation/giwa-partner-customer-handoff-package.md` | Single partner/customer first-read handoff packet. |
| `docs/evidence/partner-customer-handoff-sprint41.json` | Public-safe Sprint 41 handoff evidence and blocker state. |
| `docs/implementation/giwa-mvp-demo-script.md` | Demo narration and closeout pointers. |
| `docs/implementation/giwa-mvp-runbook.md` | Operator run order and command boundaries. |
| `docs/implementation/giwa-mvp-acceptance-checklist.md` | Sprint 41 acceptance row and final notes. |
| `docs/implementation/giwa-mvp-submission-evidence.md` | Submission artifact map and evidence summary. |
| `docs/implementation/giwa-staging-blocker-register.md` | Sprint 41 blocker state. |
| `docs/implementation/giwa-partner-beta-closeout-report.md` | Observed-results-only closeout pointer. |
| `README.md` | Repository-level entrypoint to Sprint 41 handoff. |
| `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md` | Sprint 41 routing row and summary. |

## Task 1: Create The Sprint 41 Plan

**Files:**
- Create: `docs/superpowers/plans/2026-06-21-sprint-41-partner-customer-handoff-package-finalization.md`

- [ ] **Step 1: Write this plan file**

Add this complete plan with exact paths, boundaries, review inputs, tasks, and verification commands.

- [ ] **Step 2: Confirm the plan exists**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-21-sprint-41-partner-customer-handoff-package-finalization.md
```

Expected:

```text
True
```

## Task 2: Create The Partner Customer Handoff Package

**Files:**
- Create: `docs/implementation/giwa-partner-customer-handoff-package.md`

- [ ] **Step 1: Add the first-read handoff package**

The document must include:

- local-advisory authority
- recommended opening order
- fresh live versus recorded static fallback receipt distinction
- evidence packet paths and stable input evidence hashes
- operator command boundary
- public evidence boundary
- partner/customer review checklist
- external-only blockers
- mixed repo/workflow blockers

- [ ] **Step 2: Verify no unsupported claim is introduced**

Run:

```powershell
powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
```

Expected:

```text
safe_scans=pass
```

## Task 3: Create Sprint 41 Evidence

**Files:**
- Create: `docs/evidence/partner-customer-handoff-sprint41.json`

- [ ] **Step 1: Add public-safe evidence JSON**

The evidence must include:

- `authority=local-advisory`
- `releaseGrade=false`
- `canUnblockStaging=false`
- `handoffDecision=partner-customer-handoff-package-finalized`
- Sprint 40 freeze input source binding
- latest failed protected CI dispatch metadata
- handoff surfaces
- live and static receipt mode separation
- external-only blockers with required transitions
- mixed repo/workflow blockers with required transitions
- forbidden action booleans set to `false`

- [ ] **Step 2: Verify JSON syntax**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('docs/evidence/partner-customer-handoff-sprint41.json','utf8')); console.log('json=pass')"
```

Expected:

```text
json=pass
```

## Task 4: Align Demo, Runbook, Acceptance, Submission, And Closeout Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/implementation/giwa-mvp-demo-script.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`
- Modify: `docs/implementation/giwa-mvp-acceptance-checklist.md`
- Modify: `docs/implementation/giwa-mvp-submission-evidence.md`
- Modify: `docs/implementation/giwa-partner-beta-closeout-report.md`

- [ ] **Step 1: Add Sprint 41 entrypoints**

Each document must point to:

```text
docs/implementation/giwa-partner-customer-handoff-package.md
docs/evidence/partner-customer-handoff-sprint41.json
```

- [ ] **Step 2: Keep demo commands separated**

Use:

```powershell
$env:PORT=4176
pnpm --filter @giwa/web --fail-if-no-match serve
```

for static fallback, and:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:PORT="4190"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

for local live review.

- [ ] **Step 3: Keep live and static receipts separate**

Use:

```text
Fresh live receipt: 0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
Recorded static receipt: 0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503
```

## Task 5: Update The Sprint Index And Blocker Register

**Files:**
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`

- [ ] **Step 1: Add Sprint 41 to the routing table**

Sprint 41 must start after Sprint 40 local-advisory freeze and preserve protected CI as blocked.

- [ ] **Step 2: Add Sprint 41 blocker state**

The blocker register must state:

```text
partnerCustomerHandoffPackage=local-advisory-finalized
commercialReadiness=blocked
stagingDryRunExecution=blocked
protectedCI=blocked-external-github-account
```

## Task 6: Regenerate Local Artifact And Provenance Outputs

**Files:**
- Regenerate: `docs/evidence/local-artifact-manifest.json`
- Regenerate: `docs/evidence/local-provenance-report.json`
- Regenerate: `docs/evidence/local-provenance-report.json.sha256`
- Regenerate: `docs/evidence/local-provenance-verification.json`

- [ ] **Step 1: Run local artifact generation**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:local
```

Expected: command exits `0` and writes local-advisory outputs only.

- [ ] **Step 2: Verify local provenance**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
```

Expected: command exits `0`.

- [ ] **Step 3: Scan public artifacts**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
```

Expected: command exits `0`.

## Task 7: Run Final Verification

**Files:**
- Verify all touched docs and scripts.

- [ ] **Step 1: Run safe scans**

```powershell
powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
```

Expected: both commands pass.

- [ ] **Step 2: Run workspace verification**

```powershell
pnpm test
pnpm build
pnpm typecheck
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Expected: every command exits `0`.

- [ ] **Step 3: Check git state**

```powershell
git status --short
git log --oneline -5
```

Expected: only Sprint 41 intended files are changed before commit.

## Sprint 41 Exit Gate

Sprint 41 exits when:

- the partner/customer handoff package exists
- Sprint 41 evidence exists
- demo, runbook, acceptance, submission, blocker, closeout, README, and sprint index documents agree on the same opening order and blockers
- local artifact/provenance outputs are regenerated and verified
- tests, build, typecheck, syntax checks, package boundary checks, artifact checks, and safe scans pass
- protected CI dispatch/rerun is not executed
- no forbidden action occurs
- the changes are committed and pushed with protected CI still documented as external-blocked


# Sprint 46 Public Boundary Final Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining local internal risks found after Sprint 45 without touching protected CI, hosting, managed infrastructure, wallet actions, chain operations, or dependencies.

**Architecture:** Harden public API and public artifact boundaries with regression tests first, then align operator-facing documentation with the current local-advisory handoff. The sprint keeps protected CI and staging authority blocked until external gates change.

**Tech Stack:** TypeScript, Vitest, static HTML/JS/CSS assets, PowerShell scan guards, local-advisory provenance scripts.

---

## Scope

Sprint 46 handles five bounded risks:

- Legacy or out-of-band stored verifier `failureReason` values must be redacted on every read path.
- `/readyz` must report readiness state without exposing raw env variable names or signer-key categories.
- `artifact:scan` must scan checked-in public evidence JSON, not only served public assets.
- Public JSON and view models must use `standardRpcBlockEvidence` rather than `finalConfirmation`.
- Historical or rehearsal docs must not look like current approval to run wallet, chain, hosting, or protected CI work.

Sprint 46 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation package commands, install dependencies, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

## Task 1: Public API Redaction And Readiness Metadata

**Files:**
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/live/liveHealth.ts`
- Modify: `apps/web/src/lib/live/liveHealth.test.ts`

- [x] **Step 1: Write failing tests**

Added tests that prove legacy stored raw verifier failure text and raw readiness key names currently leak.

- [x] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi liveHealth
```

Expected before implementation: fails on raw `failureReason` and missing redacted readiness count fields.

- [x] **Step 3: Minimal implementation**

Sanitize decision records before returning run or existing-decision responses, and replace `/readyz` key names with bounded category labels plus counts.

- [x] **Step 4: Verify pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi liveHealth
```

Expected after implementation: targeted tests pass.

## Task 2: Public Evidence Scan And Claim Guard Alignment

**Files:**
- Modify: `apps/web/src/lib/provenance/publicArtifactScanner.ts`
- Modify: `apps/web/src/lib/provenance/publicArtifactScanner.test.ts`
- Modify: `apps/web/src/lib/verifier/publicArtifactGuard.ts`
- Modify: `apps/web/src/lib/verifier/publicArtifactGuard.test.ts`
- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`

- [x] **Step 1: Write failing tests**

Added tests that require public evidence JSON to be scanned and require guard parity for unsupported settlement wording.

- [x] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicArtifactScanner publicArtifactGuard publicCopyGuard
```

Expected before implementation: fails on missing evidence JSON scan and narrower guard pattern.

- [x] **Step 3: Minimal implementation**

Include public evidence JSON scan targets, keep schema markdown out of blocking scans, and align the export-time guard with the scanner claim boundary.

- [x] **Step 4: Verify pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicArtifactScanner publicArtifactGuard publicCopyGuard
```

Expected after implementation: targeted tests pass.

## Task 3: Public Model Field Wording

**Files:**
- Modify: `apps/web/src/lib/flow/guidedFlow.ts`
- Modify: `apps/web/src/lib/flow/guidedFlow.test.ts`
- Modify: `apps/web/src/lib/live/liveFlowState.ts`
- Modify: `apps/web/src/lib/live/liveFlowState.test.ts`
- Modify: `apps/web/src/lib/partner/partnerSummary.ts`
- Modify: `apps/web/src/lib/partner/partnerSummary.test.ts`
- Modify: `apps/web/src/lib/partner/partnerEvidencePacket.ts`
- Modify: `apps/web/src/lib/partner/partnerEvidencePacket.test.ts`
- Modify: `apps/web/public/flow.js`
- Modify: `apps/web/public/live-flow.js`

- [x] **Step 1: Write failing tests**

Added tests that reject `finalConfirmation` in public models and public checked-in assets.

- [x] **Step 2: Verify failure**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- guidedFlow liveFlowState partnerSummary partnerEvidencePacket publicCopyGuard
```

Expected before implementation: fails while models and generated assets still use `finalConfirmation`.

- [x] **Step 3: Minimal implementation**

Rename public model fields to `standardRpcBlockEvidence`, preserving the same UI labels: standard RPC block evidence and non-final step.

- [x] **Step 4: Verify pass**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- guidedFlow liveFlowState partnerSummary partnerEvidencePacket publicCopyGuard
```

Expected after implementation: targeted tests pass.

## Task 4: Handoff Copy And Evidence

**Files:**
- Modify: `README.md`
- Modify: `docs/implementation/giwa-hosted-ops-runbook.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`
- Modify: `docs/implementation/giwa-mvp-faucet-and-preflight.md`
- Modify: `docs/implementation/giwa-partner-beta-runbook.md`
- Modify: `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- Modify: `docs/implementation/giwa-mvp-submission-evidence.md`
- Modify: `docs/implementation/giwa-partner-customer-handoff-package.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Create: `docs/evidence/public-boundary-final-hardening-sprint46.json`

- [x] **Step 1: Read and patch copy**

Clarify historical chain-operation docs as reference-only, gate live wallet rehearsal under separate approval, surface legacy live snapshot replay boundary, and add Sprint 46 to the sprint index.

- [x] **Step 2: Generate evidence**

Create a local-advisory evidence JSON that records the Sprint 46 risks, changes, verification, and remaining external blockers.

- [x] **Step 3: Regenerate public artifacts and provenance**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
```

Expected: generated public JSON no longer contains `finalConfirmation`, local-advisory provenance passes, and protected CI remains absent.

## Task 5: Full Verification And Commit

**Files:**
- All Sprint 46 modified files.

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

Expected: all commands pass and working tree contains only reviewed Sprint 46 changes before commit.

- [x] **Step 2: Commit and push**

Use a normal commit with `[skip ci]` because protected CI dispatch remains blocked by the external GitHub account gate.

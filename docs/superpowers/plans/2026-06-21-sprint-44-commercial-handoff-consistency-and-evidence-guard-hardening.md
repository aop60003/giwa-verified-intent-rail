# Sprint 44 Commercial Handoff Consistency and Evidence Guard Hardening Implementation Plan

## Goal

Harden the commercial-ready local handoff package without touching external blockers. Sprint 44 removes remaining first-read inconsistencies, pins checked-in provenance evidence, and strengthens local public/API guardrails while keeping protected CI, hosting, managed infrastructure, wallet actions, and chain operations blocked.

## Non-Goals

- No protected CI workflow dispatch or rerun.
- No GitHub billing/account retry.
- No public hosting or deployment.
- No managed DB, external queue, cloud credential manager, or production infrastructure connection.
- No wallet transaction, GIWA chain-operation command, mint, fund, deploy, anchor, or verify package command.
- No dependency installation.
- No partner/customer signoff, staging URL, release tag, protected CI result, or release-grade provenance fabrication.

## Parallel Review Inputs

| Reviewer | Sprint 44 finding used |
| --- | --- |
| Documentation consistency | Submission evidence should open Sprint 43 blocker handoff before demo routes; README and index should describe routing/stop state rather than an active execution plan. |
| Evidence integrity | `local-provenance-verification.json` drifted from the current provenance sidecar and needs a regression test plus regeneration. |
| UX/copy | Handoff language should keep live wallet actions operator-only and review surfaces pre-seeded unless a new rehearsal is approved. |
| Security/privacy | POST API requests without JSON content type should fail closed; public artifact guard should reject credential-like strings in values as well as keys. |
| Operator readiness | Runbook should route reviewers through Sprint 43 stop conditions and distinguish historical verifier/manual operations from handoff review. |
| Test coverage | Add regression coverage for checked-in provenance, Sprint 43 evidence semantics, and handoff opening order. |
| Script/CI guard | Keep safe scans, package boundary checks, local artifact generation, provenance verification, and public artifact scanning as local-advisory only. |
| Commercial handoff | Produce a Sprint 44 evidence record that says what was improved and keeps all external blockers unchanged. |

## Tasks

- [x] Add failing tests for missing POST `Content-Type`, credential-like public artifact string values, checked-in provenance verification drift, Sprint 43 blocker evidence semantics, and submission evidence opening order.
- [x] Confirm the tests fail before implementation.
- [x] Implement the minimal request-safety and public-artifact guard changes.
- [x] Update submission evidence opening order so the Sprint 43 blocker handoff and evidence are first.
- [x] Update README, sprint index, blocker register, runbook, hosted ops runbook, and Sprint 43 handoff language to reflect the current local-advisory stop condition.
- [x] Create Sprint 44 local-advisory evidence.
- [x] Regenerate local artifact/provenance outputs and update stale provenance verification.
- [x] Run full verification.
- [x] Commit and push.

## Exit Gate

Sprint 44 exits only when:

- focused guard and provenance tests pass;
- local provenance verification is bound to the current sidecar;
- submission evidence opens Sprint 43 handoff first;
- full local test/build/typecheck/artifact verification passes;
- protected CI, public hosting, managed infrastructure, wallet actions, chain operations, dependency installation, fake signoff, fake deployment URL, and fake protected provenance remain unexecuted;
- remaining blockers are still external-only or mixed repo/workflow blockers.

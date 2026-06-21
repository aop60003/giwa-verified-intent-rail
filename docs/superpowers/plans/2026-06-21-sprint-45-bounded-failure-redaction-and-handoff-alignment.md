# Sprint 45 Bounded Failure Redaction and Handoff Alignment Implementation Plan

## Goal

Close the remaining internal commercial-quality gaps found after Sprint 44 without touching external blockers. Sprint 45 hardens raw verifier failure redaction, hosted request safety, public artifact credential scanning, telemetry redaction, legacy live snapshot replay boundaries, and handoff copy alignment.

## Non-Goals

- No protected CI workflow dispatch or rerun.
- No GitHub billing/account retry.
- No public hosting or deployment.
- No managed DB, external queue, cloud credential manager, or production infrastructure connection.
- No wallet transaction, GIWA chain-operation command, mint, fund, deploy, anchor, or verify package command.
- No dependency installation.
- No partner/customer signoff, staging URL, release tag, protected CI result, or release-grade provenance fabrication.

## Parallel Review Inputs

| Reviewer | Sprint 45 finding used |
| --- | --- |
| Documentation consistency | Sprint 44 was committed but its plan still showed verification and commit unchecked; handoff docs need the next evidence row. |
| Evidence integrity | Checked-in live demo snapshot lacks canonical verifier input replay fields; do not synthesize them, record an explicit legacy replay boundary instead. |
| UX/copy | Public copy should say recorded approve/deposit evidence instead of implying a reviewer must execute wallet actions. |
| Security/privacy | Raw verifier failure strings can leak into API responses and stored decisions unless bounded before persistence. |
| Operator runbook | Operator-only live server and wallet action language must stay separate from reviewer handoff paths. |
| Test/regression | Missing-origin, invalid JSON media type, public artifact credential markers, telemetry value redaction, and checked-in snapshot boundaries need regression coverage. |
| Script/CI guard | Keep all new checks local-advisory and regenerate artifact/provenance outputs without claiming protected CI. |
| Commercial handoff | Produce one Sprint 45 evidence record that improves internal quality while preserving all external blockers. |

## Tasks

- [x] Add failing tests for raw verifier failure redaction, hosted missing-origin rejection, exact JSON content type, expanded public artifact credential markers, telemetry value redaction, and checked-in live snapshot replay boundary.
- [x] Confirm the new tests fail against the Sprint 44 implementation.
- [x] Implement bounded failure persistence and response redaction.
- [x] Tighten hosted request safety and public artifact scanning without widening public-surface access.
- [x] Add legacy replay boundary metadata to the retained Sprint 12 live snapshot copies and schema.
- [x] Polish public copy for recorded wallet evidence and standard RPC block evidence.
- [x] Update Sprint 44 completion state, sprint index, README, blocker register, commercial readiness gate, handoff package, runbook, demo script, acceptance checklist, and submission evidence map.
- [x] Create Sprint 45 local-advisory evidence.
- [x] Regenerate static public data, local artifact manifest, provenance report, sidecar, and verification output.
- [x] Run full local verification.
- [x] Commit and push with protected CI still untouched.

## Exit Gate

Sprint 45 exits only when:

- focused regression tests pass;
- raw verifier failure canaries do not appear in API responses or stored decisions;
- public artifact guard and scanner reject additional credential-shaped keys and values without printing values;
- hosted request safety rejects missing origins when an allowlist is configured and rejects JSON-like invalid media types;
- checked-in live snapshot copies either include canonical verifier input replay fields or an explicit legacy replay boundary;
- public copy avoids implying reviewer wallet execution;
- full local test/build/typecheck/artifact verification passes;
- protected CI, public hosting, managed infrastructure, wallet actions, chain operations, dependency installation, fake signoff, fake deployment URL, and fake protected provenance remain unexecuted.

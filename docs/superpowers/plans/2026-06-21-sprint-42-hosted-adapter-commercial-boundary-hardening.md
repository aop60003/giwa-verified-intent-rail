# Sprint 42 Hosted Adapter Commercial Boundary Hardening Implementation Plan

**Goal:** Harden the hosted adapter commercial boundary without connecting managed infrastructure, public hosting, or protected CI. Sprint 42 turns the remaining hosted adapter risks into code-backed local-advisory checks, documented failure modes, and public-safe evidence.

**Status:** executed as a safe-track sprint after Sprint 41.

**Authority:** local-advisory only. This sprint does not create protected CI provenance, protected artifact metadata, public staging approval, managed infrastructure approval, partner traffic approval, or release approval.

## Parallel Review Inputs

- Hosted storage adapter reviewer: separate local contract satisfaction from commercial hosted activation, and keep local SQLite from being treated as hosted evidence.
- Migration and backup reviewer: require migration marker inventory, checksum drift handling, backup catalog, restore drill, row-count checks, and receipt hash recomputation before hosted activation.
- Queue durability reviewer: keep memory verification queue blocked for multi-instance use, and track lease recovery plus tenant-scoped dedupe as explicit gaps.
- Rate-limit and origin reviewer: keep process-local rate limiting blocked, require durable bucket coverage, exact origin allowlist, and missing-origin policy evidence.
- Tenant isolation reviewer: keep hosted promotion blocked until all secondary lookups are tenant-bound.
- Redacted logging reviewer: keep hosted promotion blocked until logging is allowlist-based, query-stripped, and bounded.
- Failure mode reviewer: classify failures into external approval, repo workflow, hosted adapter contract, staging simulation, and public evidence boundaries.
- Commercial handoff reviewer: preserve partner/customer handoff usability while preventing local-advisory evidence from being treated as release authority.

## Scope

Sprint 42 may:

- Add a commercial boundary evaluator under `apps/web/src/lib/live`.
- Add local tests for storage, migration, backup, queue, rate-limit, origin, tenant, logging, and failure-mode blocker separation.
- Refine the staging dry-run simulation blocker taxonomy.
- Add Sprint 42 plan, implementation record, and evidence JSON.
- Update README, sprint index, hosted adapter, commercial readiness, and blocker documents.

Sprint 42 must not:

- Dispatch or rerun protected CI.
- Public-host, deploy, or create a staging URL.
- Connect managed database, queue, storage, or credential infrastructure.
- Read local env-file contents or print credential values.
- Send wallet actions or run GIWA chain-operation package commands.
- Install dependencies.
- Invent CI results, artifact hashes, partner signoff, deploy URLs, or staging URLs.

## Tasks

- [x] Task 1: Read current hosted adapter and staging simulation contracts.
  - Failing test: not applicable; this is a read-only discovery step.
  - Confirmation command: `Get-Content -Raw apps\web\src\lib\live\hostedAdapterContract.ts`
  - Minimum implementation: none.
  - Passing command: focused file reads completed without env-file content reads.

- [x] Task 2: Add commercial boundary tests before implementation.
  - Failing test: create `apps/web/src/lib/live/hostedAdapterCommercialBoundary.test.ts`.
  - Failure command: `pnpm --filter @giwa/web --fail-if-no-match test -- hostedAdapterCommercialBoundary stagingDryRunSimulation`
  - Expected failure: missing commercial boundary module and old staging blocker taxonomy.
  - Minimum implementation: add evaluator and update staging simulation taxonomy.
  - Passing command: same focused test command.

- [x] Task 3: Implement local-advisory commercial boundary evaluator.
  - File: `apps/web/src/lib/live/hostedAdapterCommercialBoundary.ts`
  - Required result fields:
    - `authority=local-advisory`
    - `releaseGrade=false`
    - `externalConnectionAllowed=false`
    - `partnerTrafficAllowed=false`
    - `managedInfrastructureConnectionAllowed=false`
    - `externalOnlyBlockers`
    - `mixedRepoWorkflowBlockers`
    - `localContractBlockers`
  - Passing command: `pnpm --filter @giwa/web --fail-if-no-match test -- hostedAdapterCommercialBoundary`

- [x] Task 4: Refine staging dry-run simulation blocker taxonomy.
  - Files:
    - `apps/web/src/lib/live/stagingDryRunSimulation.ts`
    - `apps/web/src/lib/live/stagingDryRunSimulation.test.ts`
  - Required behavior:
    - GitHub account billing lock, partner signoff, external hosting approval, and managed infrastructure approval are external-only blockers.
    - Protected artifact metadata is a mixed repo/workflow blocker.
    - Hosted adapter, fallback, rehearsal, and receipt gate gaps are local contract blockers.
  - Passing command: `pnpm --filter @giwa/web --fail-if-no-match test -- stagingDryRunSimulation`

- [x] Task 5: Document Sprint 42 commercial boundary state.
  - Files:
    - `docs/implementation/giwa-hosted-adapter-commercial-boundary.md`
    - `docs/evidence/hosted-adapter-commercial-boundary-sprint42.json`
  - Expected result: managed infrastructure remains unconnected and commercial readiness remains blocked.

- [x] Task 6: Refresh routing and blocker documents.
  - Files:
    - `README.md`
    - `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
    - `docs/implementation/giwa-hosted-adapter-readiness.md`
    - `docs/implementation/giwa-hosted-adapter-local-contract.md`
    - `docs/implementation/giwa-staging-dry-run-simulation.md`
    - `docs/implementation/giwa-commercial-readiness-gate.md`
    - `docs/implementation/giwa-staging-blocker-register.md`

- [x] Task 7: Run verification and regenerate local-advisory provenance.
  - Commands:
    - `pnpm --filter @giwa/web --fail-if-no-match test -- hostedAdapter`
    - `pnpm --filter @giwa/web --fail-if-no-match test -- live`
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

## Exit Gate

Sprint 42 exits only if:

- Hosted adapter commercial boundary evaluator and tests pass locally.
- Staging dry-run simulation separates external-only, mixed repo/workflow, and local contract blockers.
- Evidence records protected CI, protected artifact metadata, managed infrastructure approval, public hosting, partner signoff, and release approval as blocked.
- Managed infrastructure, public hosting, wallet actions, chain-operation commands, dependency installation, fake CI evidence, fake partner signoff, fake staging URLs, and protected provenance claims remain absent.
- Local test, build, typecheck, artifact, provenance, and safe scan commands pass.

## Next Sprint Candidate

`docs/superpowers/plans/2026-06-21-sprint-43-external-blocker-monitoring-and-staging-handoff.md`

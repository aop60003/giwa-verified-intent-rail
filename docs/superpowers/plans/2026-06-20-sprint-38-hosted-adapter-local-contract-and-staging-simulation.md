# Sprint 38 Hosted Adapter Local Contract And Staging Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Advance all safe non-external staging-readiness work while GitHub protected CI remains blocked by the external billing/account lock.

**Architecture:** Sprint 38 keeps protected CI fixed as an external blocker and moves to local-only readiness work. It adds a hosted adapter contract evaluator, a staging dry-run simulation evaluator, and documentation/evidence that separates local-advisory readiness from protected CI provenance.

**Tech Stack:** TypeScript, Vitest, existing `@giwa/web` live modules, Markdown runbooks, local-advisory JSON evidence.

---

## Current State

```text
latestProtectedDispatchRun=27873338373
latestProtectedDispatchHeadSha=2b414c91b1da6ed64287dbf7b2635be7586e287d
source-provenance=failure
annotation=account-locked-due-to-billing
artifacts=0
protectedCI=blocked-billing-lock
protectedProvenance=absent
stagingDryRun=blocked-protected-ci
workflowDispatchOrRerun=forbidden-until-ui-unlock-confirmed
```

## Non-Goals

Sprint 38 does not:

- dispatch or rerun GitHub Actions
- public-host or deploy
- connect production, managed, or cloud infrastructure
- read or print local env-file values
- output credential values
- send wallet transactions
- run GIWA chain-operation commands
- install dependencies
- create fake CI results, fake artifact hashes, fake release tags, fake partner signoff, fake deploy URLs, or fake staging URLs
- claim protected CI or release-grade provenance

## Parallel Review Findings

| Perspective | Sprint 38 finding |
| --- | --- |
| Protected CI | fixed external blocker; no rerun until UI confirms billing/account unlock and runner can start |
| Hosted adapter boundary | safe local work can define adapter categories, activation blockers, migration/backup/restore contracts, and no-go reasons |
| Staging simulation | safe local work can compute a dry-run decision from existing gates without public hosting |
| Commercial hardening | existing auth, tenant, request, rate, receipt, and public artifact guards can feed the simulation decision |
| Partner handoff | local partner packets can stay advisory and explicitly record missing external signoff |
| Evidence boundary | local JSON may record public-safe blocker state but must remain `local-advisory` |
| Final readiness | blocker register can be reduced toward external-only blockers without weakening protected CI gate |
| Safety | all new behavior must be deterministic, bounded, and free of secret/env values |

## Task 1: Hosted Adapter Contract Evaluator

**Files:**
- Create: `apps/web/src/lib/live/hostedAdapterContract.ts`
- Create: `apps/web/src/lib/live/hostedAdapterContract.test.ts`

- [x] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";

import { evaluateHostedAdapterContract } from "./hostedAdapterContract.ts";

describe("hosted adapter local contract", () => {
  it("blocks staging activation while protected CI and artifact metadata are absent", () => {
    const result = evaluateHostedAdapterContract({
      adapterKind: "local-sqlite",
      protectedCiPassed: false,
      protectedArtifactMetadataReady: false,
      managedConnectionAttempted: false,
      processEnvOnly: true,
      migrationContractReady: true,
      backupContractReady: true,
      restoreContractReady: true,
      tenantPolicyReady: true,
      originPolicyReady: true,
      rateLimitDurabilityReady: false,
      queueDurabilityReady: false
    });

    expect(result.activation).toBe("blocked");
    expect(result.blockers).toContain("protected_ci_missing");
    expect(result.blockers).toContain("protected_artifact_metadata_missing");
    expect(result.authority).toBe("local-advisory");
  });

  it("fails closed when a managed connection is attempted in Sprint 38", () => {
    const result = evaluateHostedAdapterContract({
      adapterKind: "managed-postgres",
      protectedCiPassed: true,
      protectedArtifactMetadataReady: true,
      managedConnectionAttempted: true,
      processEnvOnly: true,
      migrationContractReady: true,
      backupContractReady: true,
      restoreContractReady: true,
      tenantPolicyReady: true,
      originPolicyReady: true,
      rateLimitDurabilityReady: true,
      queueDurabilityReady: true
    });

    expect(result.activation).toBe("blocked");
    expect(result.blockers).toContain("managed_connection_forbidden_in_sprint_38");
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- hostedAdapterContract
```

Expected: fail because `hostedAdapterContract.ts` does not exist.

- [x] **Step 3: Implement the evaluator**

Create a deterministic local-only evaluator that returns `authority=local-advisory`, `releaseGrade=false`, and explicit blockers.

- [x] **Step 4: Verify GREEN**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- hostedAdapterContract
```

Expected: pass.

## Task 2: Staging Dry-Run Simulation Evaluator

**Files:**
- Create: `apps/web/src/lib/live/stagingDryRunSimulation.ts`
- Create: `apps/web/src/lib/live/stagingDryRunSimulation.test.ts`

- [x] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";

import { buildStagingDryRunSimulation } from "./stagingDryRunSimulation.ts";

describe("staging dry-run simulation", () => {
  it("keeps execution blocked while protected CI is blocked even if local rehearsal evidence is present", () => {
    const simulation = buildStagingDryRunSimulation({
      protectedCi: "blocked-billing-lock",
      protectedArtifactMetadataReady: false,
      hostedAdapterActivation: "blocked",
      staticFallbackReady: true,
      liveRehearsalReady: true,
      commercialReceiptGateReady: true,
      partnerSignoffPresent: false,
      externalHostingApproved: false
    });

    expect(simulation.execution).toBe("blocked");
    expect(simulation.authority).toBe("local-advisory");
    expect(simulation.canCreatePublicStagingUrl).toBe(false);
    expect(simulation.externalOnlyBlockers).toContain("protected_ci_billing_lock");
    expect(simulation.blockers).toContain("partner_signoff_absent");
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- stagingDryRunSimulation
```

Expected: fail because `stagingDryRunSimulation.ts` does not exist.

- [x] **Step 3: Implement the simulation builder**

Return a bounded public-safe object with local advisory authority, blocker lists, and no fake URLs.

- [x] **Step 4: Verify GREEN**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- stagingDryRunSimulation
```

Expected: pass.

## Task 3: Handoff Documents And Evidence

**Files:**
- Create: `docs/implementation/giwa-hosted-adapter-local-contract.md`
- Create: `docs/implementation/giwa-staging-dry-run-simulation.md`
- Create: `docs/evidence/staging-readiness-sprint38-handoff.json`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`
- Modify: `docs/implementation/giwa-hosted-adapter-readiness.md`

- [x] **Step 1: Document local contract**

Record local-only adapter contract status, no-go states, and external blockers.

- [x] **Step 2: Document staging simulation**

Record simulation opening order, decision matrix, external-only blockers, and no fake staging URL.

- [x] **Step 3: Create public-safe evidence JSON**

Record:

```json
{
  "schemaVersion": "1",
  "authority": "local-advisory",
  "releaseGrade": false,
  "canUnblockStaging": false,
  "protectedCI": "blocked-billing-lock",
  "stagingDryRunExecution": "blocked-protected-ci",
  "publicHosting": "blocked",
  "managedInfrastructure": "blocked",
  "externalPartnerSignoff": "absent"
}
```

## Task 4: Verification

- [x] Run:

```powershell
powershell -NoProfile -File scripts\ci\check-safe-scans.ps1
powershell -NoProfile -File scripts\ci\check-package-script-boundary.ps1
pnpm --filter @giwa/web --fail-if-no-match test -- hostedAdapterContract
pnpm --filter @giwa/web --fail-if-no-match test -- stagingDryRunSimulation
pnpm test
pnpm build
pnpm typecheck
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
git status --short
git log --oneline -5
```

Expected: all command checks pass except protected CI remains externally blocked.

## Sprint 38 Exit Gate

Sprint 38 exits when:

- protected CI remains fixed as a billing/account external blocker
- no workflow dispatch or rerun occurs
- hosted adapter local contract has tests and docs
- staging dry-run simulation has tests and docs
- final handoff evidence is local-advisory and public-safe
- blocker register distinguishes external-only blockers from locally completed readiness work
- no public hosting, deployment, managed infrastructure, env/secret exposure, wallet action, chain-operation command, dependency install, fake CI, fake artifact hash, fake release tag, fake partner signoff, fake staging URL, unsupported claim, or Flashblocks final confirmation occurs

## Next Sprint Candidates

- `docs/superpowers/plans/2026-06-20-sprint-39-commercial-hardening-local-evidence.md`
- `docs/superpowers/plans/2026-06-20-sprint-39-partner-handoff-final-readiness.md`

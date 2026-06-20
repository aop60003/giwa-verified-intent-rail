# GIWA Staging Dry-Run Simulation

Sprint 38 converts the staging dry-run packet into a local simulation evaluator. The simulation checks whether the local package can describe readiness without creating a public staging URL or promoting local evidence.

## Current Inputs

```text
protectedCi=blocked-billing-lock
protectedArtifactMetadataReady=false
hostedAdapterActivation=blocked
staticFallbackReady=true
liveRehearsalReady=true
commercialReceiptGateReady=true
partnerSignoffPresent=false
externalHostingApproved=false
```

## Current Decision

```text
authority=local-advisory
releaseGrade=false
execution=blocked
canCreatePublicStagingUrl=false
blockers=protected_ci_billing_lock,protected_artifact_metadata_missing,hosted_adapter_blocked,partner_signoff_absent,external_hosting_not_approved
externalOnlyBlockers=protected_ci_billing_lock,protected_artifact_metadata_missing,partner_signoff_absent,external_hosting_not_approved
```

The local static fallback, local live rehearsal, and matched-only receipt gate remain available for review. They do not replace protected CI, protected artifact metadata, partner signoff, or hosting approval.

## Simulation Boundary

| Gate | Sprint 38 state | Result |
| --- | --- | --- |
| Protected CI | blocked by GitHub account billing | no-go |
| Protected artifact metadata | absent | no-go |
| Hosted adapter activation | blocked | no-go |
| Static fallback | available | advisory only |
| Live rehearsal | available | advisory only |
| Commercial receipt gate | ready | advisory only |
| Partner signoff | absent | no-go |
| External hosting approval | absent | no-go |

## Failure Drill

| Signal | Route | Required response |
| --- | --- | --- |
| Billing annotation appears | GitHub account gate | keep protected CI blocked and do not dispatch again |
| Protected artifact metadata absent | artifact handoff gate | keep staging dry-run execution blocked |
| Hosted adapter blocked | storage/runtime gate | keep adapter activation local-only |
| Partner signoff absent | partner handoff gate | keep beta promotion blocked |
| External hosting approval absent | hosted ops gate | do not create a public staging URL |

## Implementation Surface

Sprint 38 adds the local evaluator in:

```text
apps/web/src/lib/live/stagingDryRunSimulation.ts
apps/web/src/lib/live/stagingDryRunSimulation.test.ts
```

The evaluator separates external-only blockers from local readiness gaps so later sprints can continue non-external hardening without obscuring the GitHub billing gate.

## Safety Confirmation

Sprint 38 does not dispatch GitHub Actions after the billing-lock repeat, public-host, deploy, connect managed infrastructure, print credential values, send wallet actions, run GIWA chain-operation package commands, install dependencies, create release tags, or claim protected CI provenance.

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
managedInfrastructureApproved=false
```

## Current Decision

```text
authority=local-advisory
releaseGrade=false
execution=blocked
canCreatePublicStagingUrl=false
blockers=github_account_billing_lock,protected_artifact_metadata_missing,hosted_adapter_blocked,partner_signoff_absent,external_hosting_not_approved,managed_infrastructure_not_approved
externalOnlyBlockers=github_account_billing_lock,partner_signoff_absent,external_hosting_not_approved,managed_infrastructure_not_approved
mixedRepoWorkflowBlockers=protected_artifact_metadata_missing
localContractBlockers=hosted_adapter_blocked
```

The local static fallback, local live rehearsal, and matched-only receipt gate remain available for review. They do not replace protected CI, protected artifact metadata, partner signoff, or hosting approval. Protected artifact metadata remains mixed because it depends on both the external account gate and repository workflow upload metadata.

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
| Managed infrastructure approval | absent | no-go |

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

## Sprint 40 Freeze

Sprint 40 keeps this staging simulation as local-advisory and records the current freeze evidence:

```text
docs/evidence/commercial-readiness-sprint40-freeze.json
```

Current decision:

```text
freezeInputMainHead=afe0bf50022717f8011fd7691b00ce0a8af90802
currentMainCheckRuns=0
authority=local-advisory
releaseGrade=false
execution=blocked
canCreatePublicStagingUrl=false
protectedCI=blocked-external-github-account
protectedArtifactMetadata=mixed-repo-workflow-blocker
```

The local simulation can support reviewer preparation only. It does not create a staging URL, public host binding, release approval, partner traffic approval, protected CI provenance, or managed infrastructure approval.

## Sprint 42 Blocker Taxonomy Hardening

Sprint 42 refines the evaluator output so protected artifact metadata is no longer grouped as external-only. Current taxonomy:

```text
externalOnlyBlockers=github_account_billing_lock,partner_signoff_absent,external_hosting_not_approved,managed_infrastructure_not_approved
mixedRepoWorkflowBlockers=protected_artifact_metadata_missing
localContractBlockers=hosted_adapter_blocked
canCreatePublicStagingUrl=false
```

The managed infrastructure approval field is explicit in the evaluator input. The simulation remains local-advisory and cannot create a public staging URL or substitute for protected CI, protected artifact metadata, release approval, partner/customer signoff, external hosting approval, or managed infrastructure approval.

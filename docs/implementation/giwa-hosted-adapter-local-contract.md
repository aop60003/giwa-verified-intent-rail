# GIWA Hosted Adapter Local Contract

Sprint 38 converts the Sprint 34 hosted adapter readiness packet into a local contract evaluator. This is still a local-advisory gate. It does not connect managed infrastructure, select a public host, approve staging execution, or create protected CI provenance.

## Current Inputs

```text
adapterKind=local-sqlite
protectedCiPassed=false
protectedArtifactMetadataReady=false
managedConnectionAttempted=false
processEnvOnly=true
migrationContractReady=true
backupContractReady=true
restoreContractReady=true
tenantPolicyReady=true
originPolicyReady=true
rateLimitDurabilityReady=false
queueDurabilityReady=false
```

## Current Decision

```text
authority=local-advisory
releaseGrade=false
activation=blocked
externalConnectionAllowed=false
blockers=protected_ci_missing,protected_artifact_metadata_missing,rate_limit_durability_missing,queue_durability_missing
```

The result means the local contract shape is explicit, but hosted adapter activation remains blocked. Protected CI is an external gate. Protected artifact metadata is a mixed repo/workflow gate because the workflow must produce upload metadata after a protected run can start. Rate-limit plus verification-queue durability are still implementation gates for a later hosted adapter sprint.

## Contract Boundary

| Gate | Sprint 38 contract | Staging requirement |
| --- | --- | --- |
| Source authority | local-advisory | passing protected CI on current `main` |
| Artifact metadata | mixed blocker | protected artifact metadata from CI after workflow upload metadata exists |
| Adapter kind | `local-sqlite` | approved hosted adapter |
| Env source | process env only | hosted process env with redacted readiness |
| Managed connection | not attempted | separate approved hosted adapter sprint |
| Migration contract | ready | migration probe in hosted adapter test plan |
| Backup contract | ready | backup catalog with owner and timestamp |
| Restore contract | ready | restore drill with public-safe hash checks |
| Tenant policy | ready | tenant-scoped hosted API enforcement |
| Origin policy | ready | exact hosted origin allowlist |
| Rate-limit durability | blocked | durable or explicitly single-instance rehearsal state |
| Queue durability | blocked | durable verification queue lifecycle |

## No-Go Conditions

Hosted adapter activation remains blocked while any of these is true:

- protected CI is blocked, skipped, failing, or absent
- protected artifact metadata is absent
- managed infrastructure connection would be required
- runtime cannot prove process-env-only hosted activation
- rate-limit state remains process-local without an approved rehearsal limitation
- verification queue state remains process-local without an approved rehearsal limitation
- release owner, rollback owner, or partner closeout approval is absent

## Implementation Surface

Sprint 38 adds the local evaluator in:

```text
apps/web/src/lib/live/hostedAdapterContract.ts
apps/web/src/lib/live/hostedAdapterContract.test.ts
```

The evaluator is intentionally small. It records blocker categories and never upgrades authority beyond `local-advisory`.

## Sprint 42 Commercial Boundary Follow-Up

Sprint 42 keeps this Sprint 38 local evaluator intact but adds a stricter commercial boundary evaluator:

```text
apps/web/src/lib/live/hostedAdapterCommercialBoundary.ts
apps/web/src/lib/live/hostedAdapterCommercialBoundary.test.ts
docs/implementation/giwa-hosted-adapter-commercial-boundary.md
docs/evidence/hosted-adapter-commercial-boundary-sprint42.json
```

The Sprint 42 evaluator tracks storage probe, migration checksum drift, backup catalog, restore drill, queue lease recovery, tenant-scoped queue dedupe, durable rate limits, exact origin policy, tenant isolation, redacted logging, bounded failures, rollback owner, protected CI, protected artifact metadata, and managed infrastructure approval. Its result remains `local-advisory`, `releaseGrade=false`, and `externalConnectionAllowed=false`.

## Safety Confirmation

Sprint 38 does not public-host, deploy, connect managed infrastructure, print credential values, send wallet actions, run GIWA chain-operation package commands, install dependencies, create release tags, or claim protected CI provenance.

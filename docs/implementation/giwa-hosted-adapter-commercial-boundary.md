# GIWA Hosted Adapter Commercial Boundary

Sprint 42 hardens the hosted adapter boundary without connecting managed infrastructure. The output is a code-backed local-advisory commercial boundary check that prevents local storage, memory queues, process-local rate limits, or local rehearsals from being promoted as hosted activation evidence.

## Current Decision

```text
sprint=42
handoffInputMain=d782a5746364b5b1395d362dd0d442329a30a138
authority=local-advisory
releaseGrade=false
commercialReadiness=blocked
externalConnectionAllowed=false
partnerTrafficAllowed=false
managedInfrastructureConnectionAllowed=false
protectedCI=blocked-external-github-account
protectedArtifactMetadata=mixed-repo-workflow-blocker
managedInfrastructureApproval=absent
```

Sprint 42 does not authorize partner traffic, public hosting, deployment, managed database use, managed queue use, cloud credential infrastructure, wallet actions, or GIWA chain-operation package commands.

## Implementation Surface

```text
apps/web/src/lib/live/hostedAdapterCommercialBoundary.ts
apps/web/src/lib/live/hostedAdapterCommercialBoundary.test.ts
apps/web/src/lib/live/stagingDryRunSimulation.ts
apps/web/src/lib/live/stagingDryRunSimulation.test.ts
```

The Sprint 38 `evaluateHostedAdapterContract` result can say the local contract inputs are ready, but that means only the local contract shape is satisfied. Sprint 42 adds `evaluateHostedAdapterCommercialBoundary` so commercial activation remains blocked unless external, repo/workflow, and local contract gates are all explicitly green.

## Blocker Split

| Category | Sprint 42 status | Required transition |
| --- | --- | --- |
| External approval | blocked | GitHub account runner startup, partner/customer signoff, external hosting approval, managed infrastructure approval |
| Repo/workflow provenance | blocked | protected CI pass on intended source, protected artifact metadata, branch-protection satisfaction, release approval |
| Storage adapter | blocked | approved adapter owner, measured hosted storage probe, no local SQLite promotion |
| Migration | blocked | marker inventory, checksum drift fail-closed behavior, incompatible schema fail-closed behavior |
| Backup and restore | blocked | backup catalog, snapshot hash, restore drill, row counts, verifier input hash, receipt hash |
| Queue durability | blocked | durable queue state, lease recovery, tenant-scoped dedupe |
| Rate limit | blocked | durable buckets and documented source, credential, tenant, wallet, and verify coverage |
| Origin policy | blocked | exact allowlist, missing-origin policy, hosted origin module |
| Tenant isolation | blocked | tenant-bound secondary lookups and no local default tenant promotion |
| Redacted logging | blocked | allowlisted event metadata, query stripping, bounded event and error names |
| Failure modes | blocked | bounded hosted adapter failure table with rollback owner and static fallback smoke |

## Current Evaluator Inputs

```text
protectedCiPassed=false
protectedArtifactMetadataReady=false
managedInfrastructureApproved=false
managedConnectionAttempted=false
processEnvOnly=true
storageProbeMeasured=false
migrationMarkerInventoryReady=false
migrationChecksumMismatchFailsClosed=false
incompatibleSchemaFailsClosed=false
backupCatalogReady=false
backupSnapshotHashReady=false
restoreDrillReady=false
restoredRowCountsReady=false
verifierInputHashRecomputed=false
receiptHashRecomputed=false
restoredQueueStatesBounded=false
queueDurabilityReady=false
queueLeaseRecoveryReady=false
queueTenantScopedDedupeReady=false
rateLimitDurabilityReady=false
rateLimitScopeCoverageReady=false
originAllowlistConfigured=false
originMissingHeaderPolicyReady=false
originPolicyModuleReady=false
tenantIsolationReady=false
tenantMappingReady=false
localTenantDefaultForbidden=false
redactedLoggingReady=false
boundedEventNamesReady=false
boundedFailureModesReady=false
staticFallbackSmokeReady=true
rollbackOwnerReady=false
```

## Current Evaluator Result

```text
commercialReadiness=blocked
externalOnlyBlockers=managed_infrastructure_approval_missing
mixedRepoWorkflowBlockers=protected_ci_missing,protected_artifact_metadata_missing
localContractBlockers=storage_probe_missing,migration_marker_inventory_missing,migration_checksum_validation_missing,incompatible_schema_fail_closed_missing,backup_catalog_missing,backup_snapshot_hash_missing,restore_drill_missing,restored_row_counts_missing,verifier_input_hash_recompute_missing,receipt_hash_recompute_missing,restored_queue_states_unbounded,queue_durability_missing,queue_lease_recovery_missing,queue_tenant_scoped_dedupe_missing,rate_limit_durability_missing,rate_limit_scope_coverage_missing,origin_allowlist_missing,origin_missing_header_policy_missing,origin_policy_module_missing,tenant_isolation_missing,tenant_mapping_missing,local_tenant_default_present,redacted_logging_missing,bounded_event_names_missing,bounded_failure_modes_missing,rollback_owner_missing
```

## Failure Modes Captured

| Failure | Sprint 42 route | Required response |
| --- | --- | --- |
| Local SQLite treated as hosted storage | storage adapter boundary | keep hosted adapter blocked |
| Local contract readiness treated as commercial activation | commercial claim boundary | require Sprint 42 evaluator and release approval |
| Migration rows exist but checksum drift is not detected | migration boundary | require checksum fail-closed evidence |
| Backup exists without restore recomputation | backup and restore boundary | require row count and hash recomputation evidence |
| Memory queue promoted as durable | queue boundary | require durable or explicitly constrained hosted queue design |
| Memory rate limit promoted as multi-instance control | rate-limit boundary | require durable rate state |
| Secondary lookups are globally keyed | tenant boundary | require tenant-bound decision, submitted tx, verifier input, job, receipt, and export paths |
| Log metadata is blocklist-only | logging boundary | require allowlisted keys and bounded path/event/error normalization |

## Evidence

Sprint 42 evidence:

```text
docs/evidence/hosted-adapter-commercial-boundary-sprint42.json
```

The evidence is public-safe and records blocker state only. It does not include local env-file contents, credential values, raw managed infrastructure config, wallet actions, or chain-operation output.

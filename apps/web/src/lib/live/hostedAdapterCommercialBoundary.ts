export type HostedAdapterCommercialBoundaryBlocker =
  | "protected_ci_missing"
  | "protected_artifact_metadata_missing"
  | "managed_infrastructure_approval_missing"
  | "managed_connection_forbidden_in_sprint_42"
  | "local_env_file_boundary_missing"
  | "storage_probe_missing"
  | "migration_marker_inventory_missing"
  | "migration_checksum_validation_missing"
  | "incompatible_schema_fail_closed_missing"
  | "backup_catalog_missing"
  | "backup_snapshot_hash_missing"
  | "restore_drill_missing"
  | "restored_row_counts_missing"
  | "verifier_input_hash_recompute_missing"
  | "receipt_hash_recompute_missing"
  | "restored_queue_states_unbounded"
  | "queue_durability_missing"
  | "queue_lease_recovery_missing"
  | "queue_tenant_scoped_dedupe_missing"
  | "rate_limit_durability_missing"
  | "rate_limit_scope_coverage_missing"
  | "origin_allowlist_missing"
  | "origin_missing_header_policy_missing"
  | "origin_policy_module_missing"
  | "tenant_isolation_missing"
  | "tenant_mapping_missing"
  | "local_tenant_default_present"
  | "redacted_logging_missing"
  | "bounded_event_names_missing"
  | "bounded_failure_modes_missing"
  | "static_fallback_smoke_missing"
  | "rollback_owner_missing";

export type HostedAdapterCommercialBoundaryInput = {
  protectedCiPassed: boolean;
  protectedArtifactMetadataReady: boolean;
  managedInfrastructureApproved: boolean;
  managedConnectionAttempted: boolean;
  processEnvOnly: boolean;
  storageProbeMeasured: boolean;
  migrationMarkerInventoryReady: boolean;
  migrationChecksumMismatchFailsClosed: boolean;
  incompatibleSchemaFailsClosed: boolean;
  backupCatalogReady: boolean;
  backupSnapshotHashReady: boolean;
  restoreDrillReady: boolean;
  restoredRowCountsReady: boolean;
  verifierInputHashRecomputed: boolean;
  receiptHashRecomputed: boolean;
  restoredQueueStatesBounded: boolean;
  queueDurabilityReady: boolean;
  queueLeaseRecoveryReady: boolean;
  queueTenantScopedDedupeReady: boolean;
  rateLimitDurabilityReady: boolean;
  rateLimitScopeCoverageReady: boolean;
  originAllowlistConfigured: boolean;
  originMissingHeaderPolicyReady: boolean;
  originPolicyModuleReady: boolean;
  tenantIsolationReady: boolean;
  tenantMappingReady: boolean;
  localTenantDefaultForbidden: boolean;
  redactedLoggingReady: boolean;
  boundedEventNamesReady: boolean;
  boundedFailureModesReady: boolean;
  staticFallbackSmokeReady: boolean;
  rollbackOwnerReady: boolean;
};

export type HostedAdapterCommercialBoundaryResult = {
  authority: "local-advisory";
  releaseGrade: false;
  commercialReadiness: "local-contract-ready" | "blocked";
  externalConnectionAllowed: false;
  partnerTrafficAllowed: false;
  managedInfrastructureConnectionAllowed: false;
  blockers: HostedAdapterCommercialBoundaryBlocker[];
  externalOnlyBlockers: HostedAdapterCommercialBoundaryBlocker[];
  mixedRepoWorkflowBlockers: HostedAdapterCommercialBoundaryBlocker[];
  localContractBlockers: HostedAdapterCommercialBoundaryBlocker[];
};

const EXTERNAL_ONLY_BLOCKERS = new Set<HostedAdapterCommercialBoundaryBlocker>([
  "managed_infrastructure_approval_missing"
]);

const MIXED_REPO_WORKFLOW_BLOCKERS = new Set<HostedAdapterCommercialBoundaryBlocker>([
  "protected_ci_missing",
  "protected_artifact_metadata_missing"
]);

function addBlocker(
  blockers: HostedAdapterCommercialBoundaryBlocker[],
  condition: boolean,
  blocker: HostedAdapterCommercialBoundaryBlocker
): void {
  if (condition) blockers.push(blocker);
}

export function evaluateHostedAdapterCommercialBoundary(
  input: HostedAdapterCommercialBoundaryInput
): HostedAdapterCommercialBoundaryResult {
  const blockers: HostedAdapterCommercialBoundaryBlocker[] = [];

  addBlocker(blockers, !input.protectedCiPassed, "protected_ci_missing");
  addBlocker(blockers, !input.protectedArtifactMetadataReady, "protected_artifact_metadata_missing");
  addBlocker(blockers, !input.managedInfrastructureApproved, "managed_infrastructure_approval_missing");
  addBlocker(blockers, input.managedConnectionAttempted, "managed_connection_forbidden_in_sprint_42");
  addBlocker(blockers, !input.processEnvOnly, "local_env_file_boundary_missing");
  addBlocker(blockers, !input.storageProbeMeasured, "storage_probe_missing");
  addBlocker(blockers, !input.migrationMarkerInventoryReady, "migration_marker_inventory_missing");
  addBlocker(blockers, !input.migrationChecksumMismatchFailsClosed, "migration_checksum_validation_missing");
  addBlocker(blockers, !input.incompatibleSchemaFailsClosed, "incompatible_schema_fail_closed_missing");
  addBlocker(blockers, !input.backupCatalogReady, "backup_catalog_missing");
  addBlocker(blockers, !input.backupSnapshotHashReady, "backup_snapshot_hash_missing");
  addBlocker(blockers, !input.restoreDrillReady, "restore_drill_missing");
  addBlocker(blockers, !input.restoredRowCountsReady, "restored_row_counts_missing");
  addBlocker(blockers, !input.verifierInputHashRecomputed, "verifier_input_hash_recompute_missing");
  addBlocker(blockers, !input.receiptHashRecomputed, "receipt_hash_recompute_missing");
  addBlocker(blockers, !input.restoredQueueStatesBounded, "restored_queue_states_unbounded");
  addBlocker(blockers, !input.queueDurabilityReady, "queue_durability_missing");
  addBlocker(blockers, !input.queueLeaseRecoveryReady, "queue_lease_recovery_missing");
  addBlocker(blockers, !input.queueTenantScopedDedupeReady, "queue_tenant_scoped_dedupe_missing");
  addBlocker(blockers, !input.rateLimitDurabilityReady, "rate_limit_durability_missing");
  addBlocker(blockers, !input.rateLimitScopeCoverageReady, "rate_limit_scope_coverage_missing");
  addBlocker(blockers, !input.originAllowlistConfigured, "origin_allowlist_missing");
  addBlocker(blockers, !input.originMissingHeaderPolicyReady, "origin_missing_header_policy_missing");
  addBlocker(blockers, !input.originPolicyModuleReady, "origin_policy_module_missing");
  addBlocker(blockers, !input.tenantIsolationReady, "tenant_isolation_missing");
  addBlocker(blockers, !input.tenantMappingReady, "tenant_mapping_missing");
  addBlocker(blockers, !input.localTenantDefaultForbidden, "local_tenant_default_present");
  addBlocker(blockers, !input.redactedLoggingReady, "redacted_logging_missing");
  addBlocker(blockers, !input.boundedEventNamesReady, "bounded_event_names_missing");
  addBlocker(blockers, !input.boundedFailureModesReady, "bounded_failure_modes_missing");
  addBlocker(blockers, !input.staticFallbackSmokeReady, "static_fallback_smoke_missing");
  addBlocker(blockers, !input.rollbackOwnerReady, "rollback_owner_missing");

  const externalOnlyBlockers = blockers.filter((blocker) => EXTERNAL_ONLY_BLOCKERS.has(blocker));
  const mixedRepoWorkflowBlockers = blockers.filter((blocker) => MIXED_REPO_WORKFLOW_BLOCKERS.has(blocker));
  const localContractBlockers = blockers.filter(
    (blocker) => !EXTERNAL_ONLY_BLOCKERS.has(blocker) && !MIXED_REPO_WORKFLOW_BLOCKERS.has(blocker)
  );

  return {
    authority: "local-advisory",
    releaseGrade: false,
    commercialReadiness: blockers.length === 0 ? "local-contract-ready" : "blocked",
    externalConnectionAllowed: false,
    partnerTrafficAllowed: false,
    managedInfrastructureConnectionAllowed: false,
    blockers,
    externalOnlyBlockers,
    mixedRepoWorkflowBlockers,
    localContractBlockers
  };
}

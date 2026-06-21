import { describe, expect, it } from "vitest";

import { evaluateHostedAdapterCommercialBoundary } from "./hostedAdapterCommercialBoundary.ts";

const READY_INPUT = {
  protectedCiPassed: true,
  protectedArtifactMetadataReady: true,
  managedInfrastructureApproved: true,
  managedConnectionAttempted: false,
  processEnvOnly: true,
  storageProbeMeasured: true,
  migrationMarkerInventoryReady: true,
  migrationChecksumMismatchFailsClosed: true,
  incompatibleSchemaFailsClosed: true,
  backupCatalogReady: true,
  backupSnapshotHashReady: true,
  restoreDrillReady: true,
  restoredRowCountsReady: true,
  verifierInputHashRecomputed: true,
  receiptHashRecomputed: true,
  restoredQueueStatesBounded: true,
  queueDurabilityReady: true,
  queueLeaseRecoveryReady: true,
  queueTenantScopedDedupeReady: true,
  rateLimitDurabilityReady: true,
  rateLimitScopeCoverageReady: true,
  originAllowlistConfigured: true,
  originMissingHeaderPolicyReady: true,
  originPolicyModuleReady: true,
  tenantIsolationReady: true,
  tenantMappingReady: true,
  localTenantDefaultForbidden: true,
  redactedLoggingReady: true,
  boundedEventNamesReady: true,
  boundedFailureModesReady: true,
  staticFallbackSmokeReady: true,
  rollbackOwnerReady: true
};

describe("hosted adapter commercial boundary", () => {
  it("blocks commercial activation when protected CI, artifact metadata, and external approvals are missing", () => {
    const result = evaluateHostedAdapterCommercialBoundary({
      ...READY_INPUT,
      protectedCiPassed: false,
      protectedArtifactMetadataReady: false,
      managedInfrastructureApproved: false
    });

    expect(result.commercialReadiness).toBe("blocked");
    expect(result.authority).toBe("local-advisory");
    expect(result.releaseGrade).toBe(false);
    expect(result.externalConnectionAllowed).toBe(false);
    expect(result.managedInfrastructureConnectionAllowed).toBe(false);
    expect(result.mixedRepoWorkflowBlockers).toEqual([
      "protected_ci_missing",
      "protected_artifact_metadata_missing"
    ]);
    expect(result.externalOnlyBlockers).toEqual(["managed_infrastructure_approval_missing"]);
  });

  it("fails closed when a managed connection is attempted in Sprint 42", () => {
    const result = evaluateHostedAdapterCommercialBoundary({
      ...READY_INPUT,
      managedConnectionAttempted: true
    });

    expect(result.commercialReadiness).toBe("blocked");
    expect(result.managedInfrastructureConnectionAllowed).toBe(false);
    expect(result.localContractBlockers).toContain("managed_connection_forbidden_in_sprint_42");
  });

  it("separates storage, migration, backup, queue, rate, origin, tenant, and logging gaps", () => {
    const result = evaluateHostedAdapterCommercialBoundary({
      ...READY_INPUT,
      storageProbeMeasured: false,
      migrationMarkerInventoryReady: false,
      migrationChecksumMismatchFailsClosed: false,
      backupCatalogReady: false,
      restoreDrillReady: false,
      queueDurabilityReady: false,
      queueLeaseRecoveryReady: false,
      queueTenantScopedDedupeReady: false,
      rateLimitDurabilityReady: false,
      originAllowlistConfigured: false,
      originPolicyModuleReady: false,
      tenantIsolationReady: false,
      localTenantDefaultForbidden: false,
      redactedLoggingReady: false,
      boundedFailureModesReady: false
    });

    expect(result.localContractBlockers).toEqual([
      "storage_probe_missing",
      "migration_marker_inventory_missing",
      "migration_checksum_validation_missing",
      "backup_catalog_missing",
      "restore_drill_missing",
      "queue_durability_missing",
      "queue_lease_recovery_missing",
      "queue_tenant_scoped_dedupe_missing",
      "rate_limit_durability_missing",
      "origin_allowlist_missing",
      "origin_policy_module_missing",
      "tenant_isolation_missing",
      "local_tenant_default_present",
      "redacted_logging_missing",
      "bounded_failure_modes_missing"
    ]);
  });

  it("can mark the local contract ready only without granting hosted activation authority", () => {
    const result = evaluateHostedAdapterCommercialBoundary(READY_INPUT);

    expect(result.commercialReadiness).toBe("local-contract-ready");
    expect(result.blockers).toEqual([]);
    expect(result.authority).toBe("local-advisory");
    expect(result.releaseGrade).toBe(false);
    expect(result.externalConnectionAllowed).toBe(false);
    expect(result.partnerTrafficAllowed).toBe(false);
  });
});

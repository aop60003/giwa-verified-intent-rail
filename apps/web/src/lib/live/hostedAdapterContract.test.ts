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

  it("lists every missing local contract gate without granting release authority", () => {
    const result = evaluateHostedAdapterContract({
      adapterKind: "local-sqlite",
      protectedCiPassed: true,
      protectedArtifactMetadataReady: true,
      managedConnectionAttempted: false,
      processEnvOnly: false,
      migrationContractReady: false,
      backupContractReady: false,
      restoreContractReady: false,
      tenantPolicyReady: false,
      originPolicyReady: false,
      rateLimitDurabilityReady: false,
      queueDurabilityReady: false
    });

    expect(result).toMatchObject({
      authority: "local-advisory",
      releaseGrade: false,
      externalConnectionAllowed: false,
      activation: "blocked"
    });
    expect(result.blockers).toEqual([
      "local_env_file_boundary_missing",
      "migration_contract_missing",
      "backup_contract_missing",
      "restore_contract_missing",
      "tenant_policy_missing",
      "origin_policy_missing",
      "rate_limit_durability_missing",
      "queue_durability_missing"
    ]);
  });

  it("can mark the local contract ready only when every gate is explicitly ready", () => {
    const result = evaluateHostedAdapterContract({
      adapterKind: "local-sqlite",
      protectedCiPassed: true,
      protectedArtifactMetadataReady: true,
      managedConnectionAttempted: false,
      processEnvOnly: true,
      migrationContractReady: true,
      backupContractReady: true,
      restoreContractReady: true,
      tenantPolicyReady: true,
      originPolicyReady: true,
      rateLimitDurabilityReady: true,
      queueDurabilityReady: true
    });

    expect(result.activation).toBe("ready");
    expect(result.blockers).toEqual([]);
    expect(result.authority).toBe("local-advisory");
    expect(result.releaseGrade).toBe(false);
    expect(result.externalConnectionAllowed).toBe(false);
  });
});

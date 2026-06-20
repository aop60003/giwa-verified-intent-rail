export type HostedAdapterKind = "local-sqlite" | "managed-postgres" | "managed-sqlite" | "custom-managed";

export type HostedAdapterContractInput = {
  adapterKind: HostedAdapterKind;
  protectedCiPassed: boolean;
  protectedArtifactMetadataReady: boolean;
  managedConnectionAttempted: boolean;
  processEnvOnly: boolean;
  migrationContractReady: boolean;
  backupContractReady: boolean;
  restoreContractReady: boolean;
  tenantPolicyReady: boolean;
  originPolicyReady: boolean;
  rateLimitDurabilityReady: boolean;
  queueDurabilityReady: boolean;
};

export type HostedAdapterContractBlocker =
  | "protected_ci_missing"
  | "protected_artifact_metadata_missing"
  | "managed_connection_forbidden_in_sprint_38"
  | "local_env_file_boundary_missing"
  | "migration_contract_missing"
  | "backup_contract_missing"
  | "restore_contract_missing"
  | "tenant_policy_missing"
  | "origin_policy_missing"
  | "rate_limit_durability_missing"
  | "queue_durability_missing";

export type HostedAdapterContractResult = {
  authority: "local-advisory";
  releaseGrade: false;
  activation: "ready" | "blocked";
  adapterKind: HostedAdapterKind;
  externalConnectionAllowed: false;
  blockers: HostedAdapterContractBlocker[];
};

function addBlocker(
  blockers: HostedAdapterContractBlocker[],
  condition: boolean,
  blocker: HostedAdapterContractBlocker
): void {
  if (condition) blockers.push(blocker);
}

export function evaluateHostedAdapterContract(input: HostedAdapterContractInput): HostedAdapterContractResult {
  const blockers: HostedAdapterContractBlocker[] = [];

  addBlocker(blockers, !input.protectedCiPassed, "protected_ci_missing");
  addBlocker(blockers, !input.protectedArtifactMetadataReady, "protected_artifact_metadata_missing");
  addBlocker(blockers, input.managedConnectionAttempted, "managed_connection_forbidden_in_sprint_38");
  addBlocker(blockers, !input.processEnvOnly, "local_env_file_boundary_missing");
  addBlocker(blockers, !input.migrationContractReady, "migration_contract_missing");
  addBlocker(blockers, !input.backupContractReady, "backup_contract_missing");
  addBlocker(blockers, !input.restoreContractReady, "restore_contract_missing");
  addBlocker(blockers, !input.tenantPolicyReady, "tenant_policy_missing");
  addBlocker(blockers, !input.originPolicyReady, "origin_policy_missing");
  addBlocker(blockers, !input.rateLimitDurabilityReady, "rate_limit_durability_missing");
  addBlocker(blockers, !input.queueDurabilityReady, "queue_durability_missing");

  return {
    authority: "local-advisory",
    releaseGrade: false,
    activation: blockers.length === 0 ? "ready" : "blocked",
    adapterKind: input.adapterKind,
    externalConnectionAllowed: false,
    blockers
  };
}

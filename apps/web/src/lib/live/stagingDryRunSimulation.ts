export type ProtectedCiState = "passed" | "blocked-billing-lock" | "failed" | "absent";
export type StagingSimulationActivation = "ready" | "blocked";

export type StagingDryRunSimulationInput = {
  protectedCi: ProtectedCiState;
  protectedArtifactMetadataReady: boolean;
  hostedAdapterActivation: StagingSimulationActivation;
  staticFallbackReady: boolean;
  liveRehearsalReady: boolean;
  commercialReceiptGateReady: boolean;
  partnerSignoffPresent: boolean;
  externalHostingApproved: boolean;
};

export type StagingDryRunBlocker =
  | "protected_ci_billing_lock"
  | "protected_ci_failed"
  | "protected_ci_absent"
  | "protected_artifact_metadata_missing"
  | "hosted_adapter_blocked"
  | "static_fallback_missing"
  | "live_rehearsal_missing"
  | "commercial_receipt_gate_missing"
  | "partner_signoff_absent"
  | "external_hosting_not_approved";

export type StagingDryRunSimulation = {
  authority: "local-advisory";
  releaseGrade: false;
  execution: "ready" | "blocked";
  canCreatePublicStagingUrl: false;
  blockers: StagingDryRunBlocker[];
  externalOnlyBlockers: StagingDryRunBlocker[];
};

function protectedCiBlocker(state: ProtectedCiState): StagingDryRunBlocker | null {
  if (state === "passed") return null;
  if (state === "blocked-billing-lock") return "protected_ci_billing_lock";
  if (state === "failed") return "protected_ci_failed";
  return "protected_ci_absent";
}

export function buildStagingDryRunSimulation(input: StagingDryRunSimulationInput): StagingDryRunSimulation {
  const blockers: StagingDryRunBlocker[] = [];
  const ciBlocker = protectedCiBlocker(input.protectedCi);
  if (ciBlocker !== null) blockers.push(ciBlocker);
  if (!input.protectedArtifactMetadataReady) blockers.push("protected_artifact_metadata_missing");
  if (input.hostedAdapterActivation !== "ready") blockers.push("hosted_adapter_blocked");
  if (!input.staticFallbackReady) blockers.push("static_fallback_missing");
  if (!input.liveRehearsalReady) blockers.push("live_rehearsal_missing");
  if (!input.commercialReceiptGateReady) blockers.push("commercial_receipt_gate_missing");
  if (!input.partnerSignoffPresent) blockers.push("partner_signoff_absent");
  if (!input.externalHostingApproved) blockers.push("external_hosting_not_approved");

  const externalOnlyBlockers = blockers.filter((blocker) =>
    [
      "protected_ci_billing_lock",
      "protected_artifact_metadata_missing",
      "partner_signoff_absent",
      "external_hosting_not_approved"
    ].includes(blocker)
  );

  return {
    authority: "local-advisory",
    releaseGrade: false,
    execution: blockers.length === 0 ? "ready" : "blocked",
    canCreatePublicStagingUrl: false,
    blockers,
    externalOnlyBlockers
  };
}

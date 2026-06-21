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
      externalHostingApproved: false,
      managedInfrastructureApproved: false
    });

    expect(simulation.execution).toBe("blocked");
    expect(simulation.authority).toBe("local-advisory");
    expect(simulation.canCreatePublicStagingUrl).toBe(false);
    expect(simulation.externalOnlyBlockers).toEqual([
      "github_account_billing_lock",
      "partner_signoff_absent",
      "external_hosting_not_approved",
      "managed_infrastructure_not_approved"
    ]);
    expect(simulation.mixedRepoWorkflowBlockers).toEqual(["protected_artifact_metadata_missing"]);
    expect(simulation.localContractBlockers).toEqual(["hosted_adapter_blocked"]);
  });

  it("separates local readiness gaps from external-only blockers", () => {
    const simulation = buildStagingDryRunSimulation({
      protectedCi: "passed",
      protectedArtifactMetadataReady: true,
      hostedAdapterActivation: "blocked",
      staticFallbackReady: false,
      liveRehearsalReady: false,
      commercialReceiptGateReady: false,
      partnerSignoffPresent: true,
      externalHostingApproved: true,
      managedInfrastructureApproved: true
    });

    expect(simulation.execution).toBe("blocked");
    expect(simulation.blockers).toEqual([
      "hosted_adapter_blocked",
      "static_fallback_missing",
      "live_rehearsal_missing",
      "commercial_receipt_gate_missing"
    ]);
    expect(simulation.externalOnlyBlockers).toEqual([]);
    expect(simulation.mixedRepoWorkflowBlockers).toEqual([]);
    expect(simulation.localContractBlockers).toEqual([
      "hosted_adapter_blocked",
      "static_fallback_missing",
      "live_rehearsal_missing",
      "commercial_receipt_gate_missing"
    ]);
  });

  it("does not create a public staging URL even when all inputs are green", () => {
    const simulation = buildStagingDryRunSimulation({
      protectedCi: "passed",
      protectedArtifactMetadataReady: true,
      hostedAdapterActivation: "ready",
      staticFallbackReady: true,
      liveRehearsalReady: true,
      commercialReceiptGateReady: true,
      partnerSignoffPresent: true,
      externalHostingApproved: true,
      managedInfrastructureApproved: true
    });

    expect(simulation.execution).toBe("ready");
    expect(simulation.canCreatePublicStagingUrl).toBe(false);
    expect(simulation.authority).toBe("local-advisory");
    expect(simulation.releaseGrade).toBe(false);
  });

  it("classifies protected artifact metadata as repo workflow, not external-only", () => {
    const simulation = buildStagingDryRunSimulation({
      protectedCi: "passed",
      protectedArtifactMetadataReady: false,
      hostedAdapterActivation: "ready",
      staticFallbackReady: true,
      liveRehearsalReady: true,
      commercialReceiptGateReady: true,
      partnerSignoffPresent: true,
      externalHostingApproved: true,
      managedInfrastructureApproved: true
    });

    expect(simulation.externalOnlyBlockers).toEqual([]);
    expect(simulation.mixedRepoWorkflowBlockers).toEqual(["protected_artifact_metadata_missing"]);
    expect(simulation.localContractBlockers).toEqual([]);
  });
});

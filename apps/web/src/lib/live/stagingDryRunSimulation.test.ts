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
      externalHostingApproved: false
    });

    expect(simulation.execution).toBe("blocked");
    expect(simulation.authority).toBe("local-advisory");
    expect(simulation.canCreatePublicStagingUrl).toBe(false);
    expect(simulation.externalOnlyBlockers).toContain("protected_ci_billing_lock");
    expect(simulation.blockers).toContain("partner_signoff_absent");
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
      externalHostingApproved: true
    });

    expect(simulation.execution).toBe("blocked");
    expect(simulation.blockers).toEqual([
      "hosted_adapter_blocked",
      "static_fallback_missing",
      "live_rehearsal_missing",
      "commercial_receipt_gate_missing"
    ]);
    expect(simulation.externalOnlyBlockers).toEqual([]);
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
      externalHostingApproved: true
    });

    expect(simulation.execution).toBe("ready");
    expect(simulation.canCreatePublicStagingUrl).toBe(false);
    expect(simulation.authority).toBe("local-advisory");
    expect(simulation.releaseGrade).toBe(false);
  });
});

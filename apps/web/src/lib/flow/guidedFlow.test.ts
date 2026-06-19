import { describe, expect, it } from "vitest";

import deployment from "../../generated/deployment.json";
import evidence from "../../../../../docs/evidence/giwa-sepolia-mvp-evidence.json";
import { buildGuidedFlowModel, resolveReceiptRoute } from "./guidedFlow.js";

function cloneEvidence(): Record<string, any> {
  return structuredClone(evidence) as Record<string, any>;
}

const deploymentRecord = deployment as Record<string, any>;

describe("Sprint 5 guided flow model", () => {
  it("builds the first-screen guided action from completed Sprint 4 evidence", () => {
    const model = buildGuidedFlowModel(cloneEvidence(), deploymentRecord);

    expect(model.screenKind).toBe("guided-flow");
    expect(model.mission.campaignId).toBe("gasok-demo");
    expect(model.mission.missionId).toBe("first-mock-vault-deposit");
    expect(model.manifest.intentHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(model.deployedAddresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Mock token" }),
        expect.objectContaining({ label: "Mock vault" }),
        expect.objectContaining({ label: "Intent rail" })
      ])
    );
    expect(model.walletActions.map((action) => action.kind)).toEqual(["approve", "deposit"]);
  });

  it("separates fast feedback, block confirmation, verifier match, and receipt readiness", () => {
    const model = buildGuidedFlowModel(cloneEvidence(), deploymentRecord);

    expect(model.statusRail.find((step) => step.id === "fastFeedback")).toMatchObject({
      state: "complete",
      finalConfirmation: false
    });
    expect(model.statusRail.find((step) => step.id === "blockConfirmed")).toMatchObject({
      state: "complete",
      finalConfirmation: true
    });
    expect(model.statusRail.find((step) => step.id === "matched")).toMatchObject({
      state: "complete"
    });
    expect(model.receipt.ready).toBe(true);
    expect(model.receipt.routeEnabled).toBe(true);
  });

  it("does not expose a successful receipt after block confirmation before verifier match", () => {
    const pending = cloneEvidence();
    pending.status = "standard_rpc_deposit_confirmed";
    pending.verifier = undefined;
    pending.receipt = undefined;
    pending.transactions.decisionTxHash = null;

    const model = buildGuidedFlowModel(pending, {
      ...deployment,
      decisionTxHash: null
    } as Record<string, any>);

    expect(model.statusRail.find((step) => step.id === "blockConfirmed")?.state).toBe("complete");
    expect(model.statusRail.find((step) => step.id === "verifierChecking")?.state).toBe("active");
    expect(model.statusRail.find((step) => step.id === "matched")?.state).toBe("pending");
    expect(model.receipt.ready).toBe(false);
    expect(model.receipt.routeEnabled).toBe(false);
  });

  it("blocks wallet execution and receipt routing on the wrong network", () => {
    const wrongNetwork = cloneEvidence();
    wrongNetwork.network.chainId = 1;
    wrongNetwork.network.networkName = "Ethereum Sepolia";

    const model = buildGuidedFlowModel(wrongNetwork, deploymentRecord);

    expect(model.networkGate).toMatchObject({
      requiredChainId: 91342,
      observedChainId: 1,
      state: "wrong_network",
      blocksExecution: true
    });
    expect(model.walletActions.every((action) => action.status === "blocked")).toBe(true);
    expect(model.statusRail.find((step) => step.id === "walletAction")?.state).toBe("blocked");
    expect(model.receipt.ready).toBe(false);
    expect(resolveReceiptRoute(model, `/receipt/${evidence.receipt.receiptHash}`)).toMatchObject({
      allowed: false,
      reason: "receipt_not_ready"
    });
  });

  it("keeps verified state read-only and guest path ungated", () => {
    const model = buildGuidedFlowModel(cloneEvidence(), deploymentRecord);

    expect(model.readiness.verifiedState).toMatchObject({
      state: "guest",
      readOnly: true,
      gatesGuestPath: false
    });
  });

  it("guards the receipt route until the matched receipt hash is present", () => {
    const model = buildGuidedFlowModel(cloneEvidence(), deploymentRecord);
    const pending = cloneEvidence();
    pending.status = "standard_rpc_deposit_confirmed";
    pending.verifier = undefined;
    pending.receipt = undefined;
    pending.transactions.decisionTxHash = null;
    const pendingModel = buildGuidedFlowModel(pending, {
      ...deployment,
      decisionTxHash: null
    } as Record<string, any>);

    expect(resolveReceiptRoute(model, `/receipt/${model.receipt.receiptHash}`)).toMatchObject({
      allowed: true,
      receiptHash: model.receipt.receiptHash
    });
    expect(resolveReceiptRoute(model, "/receipt/0x0000")).toMatchObject({
      allowed: false,
      reason: "receipt_hash_mismatch"
    });
    expect(resolveReceiptRoute(pendingModel, `/receipt/${model.receipt.receiptHash}`)).toMatchObject({
      allowed: false,
      reason: "receipt_not_ready"
    });
  });

  it("captures required run events without secret-like material", () => {
    const model = buildGuidedFlowModel(cloneEvidence(), deploymentRecord);
    const serialized = JSON.stringify(model);

    expect(model.runEvents.map((event) => event.name)).toEqual([
      "campaign_entry",
      "wallet_connected",
      "intent_accepted",
      "intent_submitted",
      "deposit_submitted",
      "receipt_matched"
    ]);
    expect(serialized).not.toMatch(/private[_-]?key|mnemonic|bearer|authorization|rpc[_-]?token|api[_-]?key/i);
    expect(serialized).not.toContain("GIWA_SEPOLIA_RPC_URL");
  });
});

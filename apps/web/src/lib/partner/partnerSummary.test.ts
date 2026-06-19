import { describe, expect, it } from "vitest";

import deployment from "../../generated/deployment.json";
import evidence from "../../../../../docs/evidence/giwa-sepolia-mvp-evidence.json";
import { buildGuidedFlowModel } from "../flow/guidedFlow.js";
import { buildPartnerProofConsoleModel } from "./partnerSummary.js";

function baseFlow() {
  return buildGuidedFlowModel(structuredClone(evidence) as Record<string, any>, deployment as Record<string, any>);
}

describe("Sprint 6 partner proof console model", () => {
  it("summarizes fixture run events with dedupe and stable matched transaction rate", () => {
    const flow = baseFlow();
    const duplicateDeposit = structuredClone(flow.runEvents.find((event) => event.name === "deposit_submitted"));
    const model = buildPartnerProofConsoleModel(flow, structuredClone(evidence) as Record<string, any>, {
      evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json",
      extraRunEvents: duplicateDeposit === undefined ? [] : [duplicateDeposit]
    });

    expect(model.screenKind).toBe("partner-proof-console");
    expect(model.summary).toMatchObject({
      campaignEntryCount: 1,
      walletConnectedCount: 1,
      intentAcceptedCount: 1,
      depositSubmittedCount: 1,
      manifestMatchedReceiptCount: 1,
      matchedTxRate: "100%",
      matchedTxRateNumerator: 1,
      matchedTxRateDenominator: 1,
      mockTestnetDepositCount: 1,
      mockTestnetDepositAmountBaseUnits: "1000000000000000000"
    });
  });

  it("reports N/A matched rate when no deposit was submitted", () => {
    const flow = baseFlow();
    flow.runEvents = flow.runEvents.filter((event) => event.name !== "deposit_submitted" && event.name !== "receipt_matched");

    const model = buildPartnerProofConsoleModel(flow, structuredClone(evidence) as Record<string, any>, {
      evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json"
    });

    expect(model.summary).toMatchObject({
      depositSubmittedCount: 0,
      manifestMatchedReceiptCount: 0,
      matchedTxRate: "N/A",
      matchedTxRateNumerator: 0,
      matchedTxRateDenominator: 0
    });
  });

  it("does not count non-ready receipts as manifest matched", () => {
    const flow = baseFlow();
    flow.receipt = {
      ...flow.receipt,
      ready: false,
      receiptHash: null
    };

    const model = buildPartnerProofConsoleModel(flow, structuredClone(evidence) as Record<string, any>, {
      evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json"
    });

    expect(model.summary.manifestMatchedReceiptCount).toBe(0);
    expect(model.summary.matchedTxRate).toBe("0%");
    expect(model.summary.mockTestnetDepositCount).toBe(0);
    expect(model.summary.mockTestnetDepositAmountBaseUnits).toBe("0");
  });

  it("keeps fixture rows labeled and exposes evidence hashes and explorer links", () => {
    const flow = baseFlow();
    const model = buildPartnerProofConsoleModel(flow, structuredClone(evidence) as Record<string, any>, {
      evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json"
    });

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]).toMatchObject({
      source: "fixture",
      status: "matched",
      receiptHash: evidence.receipt.receiptHash,
      depositTxHash: evidence.transactions.depositTxHash,
      decisionTxHash: evidence.transactions.decisionTxHash,
      receiptPermalink: `/receipt/${evidence.receipt.receiptHash}`
    });
    expect(model.rows[0]?.depositExplorerUrl).toContain(evidence.transactions.depositTxHash);
    expect(model.rows[0]?.decisionExplorerUrl).toContain(evidence.transactions.decisionTxHash);
    expect(model.evidenceCards.decodedLogSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventName: "Approval" }),
        expect.objectContaining({ eventName: "MockDeposit" })
      ])
    );
  });

  it("does not label the fixture receipt row as live when only extra live events are present", () => {
    const flow = baseFlow();
    flow.runEvents = [];

    const model = buildPartnerProofConsoleModel(flow, structuredClone(evidence) as Record<string, any>, {
      evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json",
      extraRunEvents: [
        {
          name: "deposit_submitted",
          runId: "live-run-1",
          timestamp: "2026-06-17T00:00:00.000Z",
          campaignId: flow.mission.campaignId,
          missionId: flow.mission.missionId,
          wallet: flow.readiness.wallet,
          source: "live"
        }
      ]
    });

    expect(model.source.fixtureRowsVisible).toBe(true);
    expect(model.source.liveRowsVisible).toBe(true);
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]).toMatchObject({
      source: "fixture",
      receiptHash: evidence.receipt.receiptHash
    });
  });

  it("shows signer and confirmation evidence without duplicating verifier logic", () => {
    const flow = baseFlow();
    const model = buildPartnerProofConsoleModel(flow, structuredClone(evidence) as Record<string, any>, {
      evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json"
    });

    expect(model.evidenceCards.manifestSigner).toMatchObject({
      expectedSigner: evidence.roles.campaignSignerAddress,
      recoveredSigner: evidence.manifest.recoveredSigner,
      signerMatched: true
    });
    expect(model.evidenceCards.standardConfirmation).toMatchObject({
      status: 1,
      blockNumber: "28328168",
      blockHash: evidence.confirmation.depositBlockHash,
      finalConfirmation: true
    });
    expect(model.evidenceCards.fastFeedback).toMatchObject({
      namespace: "non-final",
      finalConfirmation: false
    });
  });

  it("keeps partner copy scoped to mock testnet evidence and avoids secret-like material", () => {
    const flow = baseFlow();
    const model = buildPartnerProofConsoleModel(flow, structuredClone(evidence) as Record<string, any>, {
      evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json"
    });
    const serialized = JSON.stringify(model);
    const forbiddenClaimPattern = new RegExp(
      ["real TVL", "real y" + "ield", "real R" + "WA", "settlement", "perform K" + "YC", "guarantee safe" + "ty"].join("|"),
      "i"
    );

    expect(model.partnerExplanation).toContain("manifest-covered GIWA Sepolia testnet action");
    expect(serialized).not.toMatch(/private[_-]?key|mnemonic|bearer|authorization|rpc[_-]?token|api[_-]?key|process\.env|\.env/i);
    expect(serialized).not.toMatch(forbiddenClaimPattern);
  });
});

import { describe, expect, it } from "vitest";

import anchorEvidence from "../../../../../packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json";
import type { Address, Hex } from "../../../../../packages/protocol/src/index.js";
import { createMemoryReceiptStore } from "../storage/receiptStore.js";
import type { ChainEvidence } from "./decodeEvidence.js";
import { buildReceiptPayload, verifyDepositEvidence } from "./verifyDeposit.js";

function cloneAnchorEvidence(): ChainEvidence {
  return structuredClone(anchorEvidence) as ChainEvidence;
}

function withIntentSubmittedTx(evidence: ReturnType<typeof cloneAnchorEvidence>): ChainEvidence {
  return {
    ...evidence,
    transactions: {
      ...evidence.transactions,
      intentSubmittedTx: {
        rawEthGetTransaction: {
          from: evidence.roles.intentSubmitterAddress,
          to: evidence.contracts.intentRailAddress,
          hash: evidence.transactions.intentSubmittedTxHash
        }
      }
    }
  };
}

describe("Sprint 4 deposit verifier", () => {
  it("matches the Sprint 3 deployed evidence using standard RPC receipt and decoded logs", async () => {
    const evidence = withIntentSubmittedTx(cloneAnchorEvidence());
    const result = await verifyDepositEvidence(evidence, {
      officialCampaignSigner: evidence.roles.campaignSignerAddress as Address,
      configuredIntentSubmitter: evidence.roles.intentSubmitterAddress as Address,
      confirmationDepth: 5,
      headBlockNumberAtVerification: Number(evidence.confirmation.depositBlockNumber) + 5,
      issuedAt: 1_781_700_000,
      verifierVersion: "1"
    });

    expect(result.decision).toBe("matched");
    expect(result.failureReason).toBeNull();
    expect(result.verifierInputHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.receipt?.receiptHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.matchedFields).toEqual(
      expect.arrayContaining([
        "officialSigner",
        "intentSubmitted",
        "intentSubmitter",
        "depositWallet",
        "depositTarget",
        "depositSelector",
        "depositAsset",
        "depositAmount",
        "approvalOwner",
        "approvalSpender",
        "allowanceBound",
        "standardRpcReceipt",
        "confirmationDepth"
      ])
    );
  });

  it("rejects mismatched confirmed evidence without creating a receipt", async () => {
    const wrongWallet = withIntentSubmittedTx(cloneAnchorEvidence());
    wrongWallet.transactions.depositTx.rawEthGetTransaction.from = "0x0000000000000000000000000000000000000001";

    const result = await verifyDepositEvidence(wrongWallet, {
      officialCampaignSigner: wrongWallet.roles.campaignSignerAddress as Address,
      configuredIntentSubmitter: wrongWallet.roles.intentSubmitterAddress as Address,
      confirmationDepth: 5,
      headBlockNumberAtVerification: Number(wrongWallet.confirmation.depositBlockNumber) + 5,
      issuedAt: 1_781_700_000,
      verifierVersion: "1"
    });

    expect(result).toMatchObject({
      decision: "mismatched",
      failureReason: "WALLET_MISMATCH"
    });
    expect(result.receipt).toBeUndefined();
  });

  it("rejects failed or unconfirmed evidence without successful receipt output", async () => {
    const failed = withIntentSubmittedTx(cloneAnchorEvidence());
    failed.transactions.depositTx.rawEthGetTransactionReceipt.status = "reverted";

    const failedResult = await verifyDepositEvidence(failed, {
      officialCampaignSigner: failed.roles.campaignSignerAddress as Address,
      configuredIntentSubmitter: failed.roles.intentSubmitterAddress as Address,
      confirmationDepth: 5,
      headBlockNumberAtVerification: Number(failed.confirmation.depositBlockNumber) + 5,
      issuedAt: 1_781_700_000,
      verifierVersion: "1"
    });

    expect(failedResult).toMatchObject({
      decision: "failed",
      failureReason: "TX_FAILED"
    });
    expect(failedResult.receipt).toBeUndefined();

    const timeout = withIntentSubmittedTx(cloneAnchorEvidence());
    const timeoutResult = await verifyDepositEvidence(timeout, {
      officialCampaignSigner: timeout.roles.campaignSignerAddress as Address,
      configuredIntentSubmitter: timeout.roles.intentSubmitterAddress as Address,
      confirmationDepth: 0,
      headBlockNumberAtVerification: Number(timeout.confirmation.depositBlockNumber),
      issuedAt: 1_781_700_000,
      verifierVersion: "1"
    });

    expect(timeoutResult).toMatchObject({
      decision: "timeout",
      failureReason: "UNCONFIRMED"
    });
    expect(timeoutResult.receipt).toBeUndefined();
  });

  it("keeps receipt idempotency stable for the same intentHash and depositTxHash", async () => {
    const evidence = withIntentSubmittedTx(cloneAnchorEvidence());
    const payload = buildReceiptPayload(evidence, {
      allowanceUsedBaseUnits: evidence.manifest.manifest.amountBaseUnits,
      issuedAt: 1_781_700_000,
      verifierVersion: "1"
    });
    const store = createMemoryReceiptStore();

    const first = store.saveMatched({
      intentHash: evidence.manifest.intentHash as Hex,
      depositTxHash: evidence.transactions.depositTxHash as Hex,
      receiptPayload: payload
    });
    const duplicate = store.saveMatched({
      intentHash: evidence.manifest.intentHash as Hex,
      depositTxHash: evidence.transactions.depositTxHash as Hex,
      receiptPayload: { ...payload, issuedAt: payload.issuedAt + 99 }
    });

    expect(duplicate.receiptHash).toBe(first.receiptHash);
    expect(duplicate.payload.issuedAt).toBe(first.payload.issuedAt);
    expect(() =>
      store.saveMatched({
        intentHash: evidence.manifest.intentHash as Hex,
        depositTxHash: `0x${"9".repeat(64)}` as Hex,
        receiptPayload: { ...payload, depositTxHash: `0x${"9".repeat(64)}` as Hex }
      })
    ).toThrow("intentHash already has a terminal decision");
  });
});

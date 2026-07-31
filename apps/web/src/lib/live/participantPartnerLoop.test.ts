import { describe, expect, it } from "vitest";

import { createLiveApiHandler } from "./liveApi.ts";
import { createMemoryLiveStore } from "./liveStore.ts";
import { createPublicVerificationBundleFixture } from "./publicVerificationBundle.test.ts";

describe("participant, partner, and public proof loop", () => {
  it("joins all three surfaces by the same gate-passed Receipt", async () => {
    const store = createMemoryLiveStore();
    const bundle = await createPublicVerificationBundleFixture();
    const intentHash = bundle.identity.intentHash;
    const depositTxHash = bundle.identity.depositTxHash;
    const verifierInputHash = bundle.verifierInput.verifierInputHash;
    const receiptHash = bundle.identity.receiptHash;
    const receiptPayload = bundle.receipt.payload;
    const receiptRecord = {
      receiptHash,
      intentHash,
      payloadJson: JSON.stringify(receiptPayload),
      canonicalPayload: bundle.receipt.canonicalPayload,
      canonicalPayloadBytesHex: bundle.receipt.canonicalPayloadBytesHex
    };
    store.createRun({
      runId: "run-matched",
      idempotencyKey: "run-matched:idempotency",
      wallet: receiptPayload.wallet,
      campaignId: receiptPayload.campaignId,
      missionId: receiptPayload.missionId,
      referralCode: null,
      nonce: bundle.manifest.payload.nonce,
      intentHash,
      manifestJson: JSON.stringify(bundle.manifest.payload),
      manifestSignature: bundle.manifest.signature,
      status: "matched",
      expiryUnix: 1_800_003_600,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:03:00.000Z"
    });
    store.saveSubmittedTx({
      runId: "run-matched",
      approveTxHash: receiptPayload.approveTxHash,
      depositTxHash,
      submittedAt: "2026-07-30T00:01:00.000Z"
    });
    store.publishMatchedEvidence({
      runId: "run-matched",
      verifierInput: {
        runId: "run-matched",
        verifierInputHash,
        canonicalPayload: bundle.verifierInput.canonicalPayload,
        canonicalPayloadBytesHex: bundle.verifierInput.canonicalPayloadBytesHex,
        createdAt: "2026-07-30T00:02:00.000Z"
      },
      receipt: receiptRecord,
      decision: {
        intentHash,
        depositTxHash,
        decision: "matched",
        failureReason: null,
        verifierInputHash,
        receiptHash,
        decisionTxHash: null,
        issuedAt: receiptPayload.issuedAt,
        standardRpcReceiptStatus: 1,
        depositBlockNumber: bundle.verification.depositBlockNumber,
        depositBlockHash: bundle.verification.depositBlockHash,
        confirmationDepth: bundle.verification.confirmationDepth
      },
      publicEvidence: {
        receiptHash,
        intentHash,
        depositTxHash,
        bundleJson: JSON.stringify(bundle),
        createdAt: bundle.generatedAt
      },
      updatedAt: "2026-07-30T00:03:00.000Z"
    });

    const mismatchIntentHash = `0x${"6".repeat(64)}`;
    const mismatchDepositTxHash = `0x${"7".repeat(64)}`;
    const mismatchReceiptHash = `0x${"f".repeat(64)}`;
    store.createRun({
      runId: "run-mismatch",
      idempotencyKey: "run-mismatch:idempotency",
      wallet: "0x5555555555555555555555555555555555555555",
      campaignId: receiptPayload.campaignId,
      missionId: receiptPayload.missionId,
      referralCode: null,
      nonce: "mismatch",
      intentHash: mismatchIntentHash,
      manifestJson: "{}",
      manifestSignature: `0x${"8".repeat(130)}`,
      status: "mismatched",
      expiryUnix: 1_800_003_600,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:04:00.000Z"
    });
    store.saveSubmittedTx({
      runId: "run-mismatch",
      approveTxHash: null,
      depositTxHash: mismatchDepositTxHash,
      submittedAt: "2026-07-30T00:01:00.000Z"
    });
    store.saveDecision({
      intentHash: mismatchIntentHash,
      depositTxHash: mismatchDepositTxHash,
      decision: "mismatched",
      failureReason: "TARGET_MISMATCH",
      verifierInputHash: `0x${"9".repeat(64)}`,
      receiptHash: null,
      decisionTxHash: null,
      issuedAt: 1_800_000_000,
      standardRpcReceiptStatus: 1,
      depositBlockNumber: 32_034_051,
      depositBlockHash: `0x${"4".repeat(64)}`,
      confirmationDepth: 4
    });

    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      now: () => "2026-07-30T00:05:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });
    const participant = await api({
      method: "GET",
      pathname: `/api/receipts/${receiptHash}`
    });
    const studio = await api({
      method: "GET",
      pathname: "/api/public/campaign-studio"
    });
    const proof = await api({
      method: "GET",
      pathname: `/api/public/evidence/${depositTxHash}`
    });

    expect(participant.status).toBe(200);
    expect(studio.status).toBe(200);
    expect(proof.status).toBe(200);
    expect(participant.body.receiptHash).toBe(receiptHash);
    expect(
      (
        studio.body.receipts as Array<{ receiptHash: string }>
      )[0]?.receiptHash
    ).toBe(receiptHash);
    expect(proof.body.receiptHash).toBe(receiptHash);

    const mismatchReceipt = await api({
      method: "GET",
      pathname: `/api/receipts/${mismatchReceiptHash}`
    });
    const mismatchProof = await api({
      method: "GET",
      pathname: `/api/public/evidence/${mismatchIntentHash}`
    });
    const studioAfterMismatch = await api({
      method: "GET",
      pathname: "/api/public/campaign-studio"
    });

    expect(mismatchReceipt.status).toBe(404);
    expect(mismatchProof.status).toBe(404);
    expect(
      (
        studioAfterMismatch.body.receipts as Array<{ receiptHash: string }>
      ).some((row) => row.receiptHash === mismatchReceiptHash)
    ).toBe(false);
  });
});

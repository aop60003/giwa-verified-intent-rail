import { describe, expect, it } from "vitest";

import {
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  computeReceiptHash,
  computeVerifierInputHash,
  type ReceiptPayload,
  type VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";
import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";
import type { DecisionRecord, LiveRunRecord, ReceiptRecord, VerifierInputRecord } from "./liveTypes.ts";

const matchedRun: LiveRunRecord = {
  runId: "run-1",
  idempotencyKey: "wallet:campaign:mission:",
  wallet: "0x1111111111111111111111111111111111111111",
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  referralCode: null,
  nonce: "nonce-1",
  intentHash: `0x${"a".repeat(64)}`,
  manifestJson: JSON.stringify({ chainId: 91342 }),
  manifestSignature: `0x${"b".repeat(130)}`,
  status: "matched",
  expiryUnix: 1790000000,
  createdAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-06-19T00:10:00.000Z"
};

const matchedDecision: DecisionRecord = {
  intentHash: matchedRun.intentHash,
  depositTxHash: `0x${"c".repeat(64)}`,
  decision: "matched",
  failureReason: null,
  verifierInputHash: `0x${"d".repeat(64)}`,
  receiptHash: `0x${"e".repeat(64)}`,
  decisionTxHash: null,
  issuedAt: 1790000000
};

const matchedReceipt: ReceiptRecord = {
  receiptHash: `0x${"e".repeat(64)}`,
  intentHash: matchedRun.intentHash,
  payloadJson: JSON.stringify({ status: "matched" }),
  canonicalPayload: "{\"status\":\"matched\"}",
  canonicalPayloadBytesHex: "0x7b22737461747573223a226d617463686564227d"
};

function buildReplayFixture(): {
  decision: DecisionRecord;
  receipt: ReceiptRecord;
  verifierInput: VerifierInputRecord;
} {
  const verifierInputPayload: VerifierInputPayload = {
    schemaVersion: "1",
    chainId: 91342,
    intentHash: matchedRun.intentHash as `0x${string}`,
    depositTxHash: matchedDecision.depositTxHash as `0x${string}`,
    depositTransactionSnapshotHash: `0x${"1".repeat(64)}`,
    depositReceiptSnapshotHash: `0x${"2".repeat(64)}`,
    decodedLogSnapshotHash: `0x${"3".repeat(64)}`,
    confirmationDepth: 4,
    headBlockNumberAtVerification: 14,
    verifierVersion: "live-sprint-14"
  };
  const receiptPayload: ReceiptPayload = {
    schemaVersion: "1",
    verifierVersion: "live-sprint-14",
    intentHash: matchedRun.intentHash as `0x${string}`,
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: "mockVaultDeposit",
    asset: "0x3333333333333333333333333333333333333333",
    amountBaseUnits: "1000000000000000000",
    target: "0x2222222222222222222222222222222222222222",
    spender: "0x2222222222222222222222222222222222222222",
    maxAllowanceBaseUnits: "1000000000000000000",
    allowanceUsedBaseUnits: "1000000000000000000",
    approvalRequired: true,
    approveTxHash: `0x${"b".repeat(64)}`,
    depositTxHash: matchedDecision.depositTxHash as `0x${string}`,
    depositBlockNumber: 10,
    depositBlockHash: `0x${"4".repeat(64)}`,
    campaignId: matchedRun.campaignId,
    missionId: matchedRun.missionId,
    wallet: matchedRun.wallet as `0x${string}`,
    verifiedState: "guest",
    testnetDepositAmountDelta: "1000000000000000000",
    issuedAt: 1790000000,
    issuer: "GIWA Verified Intent Rail MVP",
    safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
  };
  const verifierInputHash = computeVerifierInputHash(verifierInputPayload);
  const receiptHash = computeReceiptHash(receiptPayload);

  return {
    decision: {
      ...matchedDecision,
      verifierInputHash,
      receiptHash
    },
    receipt: {
      receiptHash,
      intentHash: matchedRun.intentHash,
      payloadJson: JSON.stringify(receiptPayload),
      canonicalPayload: canonicalReceiptPayload(receiptPayload),
      canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload)
    },
    verifierInput: {
      runId: matchedRun.runId,
      verifierInputHash,
      canonicalPayload: canonicalVerifierInputPayload(verifierInputPayload),
      canonicalPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(verifierInputPayload),
      createdAt: "2026-06-19T00:00:00.000Z"
    }
  };
}

describe("commercial receipt gate", () => {
  it("opens for matched run, matched decision, and matching receipt", () => {
    const result = evaluateCommercialReceiptGate({
      run: matchedRun,
      decision: matchedDecision,
      receipt: matchedReceipt
    });

    expect(result.open).toBe(true);
    expect(result.reason).toBe(null);
  });

  it("stays closed when the run is not matched", () => {
    const result = evaluateCommercialReceiptGate({
      run: { ...matchedRun, status: "depositSubmitted" },
      decision: matchedDecision,
      receipt: matchedReceipt
    });

    expect(result.open).toBe(false);
    expect(result.reason).toBe("run_not_matched");
  });

  it("stays closed when decision and receipt hash differ", () => {
    const result = evaluateCommercialReceiptGate({
      run: matchedRun,
      decision: { ...matchedDecision, receiptHash: `0x${"f".repeat(64)}` },
      receipt: matchedReceipt
    });

    expect(result.open).toBe(false);
    expect(result.reason).toBe("receipt_hash_mismatch");
  });

  it("stays closed when receipt hash does not recompute from canonical payload", () => {
    const replay = buildReplayFixture();
    const result = evaluateCommercialReceiptGate({
      run: matchedRun,
      decision: replay.decision,
      receipt: {
        ...replay.receipt,
        canonicalPayload: "{\"status\":\"matched\",\"tampered\":true}"
      },
      verifierInput: replay.verifierInput,
      replay: { requireHashRecomputation: true }
    });

    expect(result.open).toBe(false);
    expect(result.reason).toBe("receipt_hash_recompute_mismatch");
  });

  it("stays closed when verifier input hash does not recompute", () => {
    const replay = buildReplayFixture();
    const result = evaluateCommercialReceiptGate({
      run: matchedRun,
      decision: replay.decision,
      receipt: replay.receipt,
      verifierInput: {
        ...replay.verifierInput,
        canonicalPayload: "{\"schemaVersion\":\"1\",\"tampered\":true}"
      },
      replay: { requireHashRecomputation: true }
    });

    expect(result.open).toBe(false);
    expect(result.reason).toBe("verifier_input_hash_mismatch");
  });
});

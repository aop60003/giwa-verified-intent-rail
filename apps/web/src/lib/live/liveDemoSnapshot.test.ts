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
import { buildLiveDemoSnapshot, type LiveDemoSnapshotInput } from "./liveDemoSnapshot.ts";
import type {
  DecisionRecord,
  LiveRunRecord,
  ReceiptRecord,
  SubmittedTxRecord,
  VerifierInputRecord
} from "./liveTypes.ts";

const intentHash = `0x${"a".repeat(64)}` as `0x${string}`;
const depositTxHash = `0x${"d".repeat(64)}` as `0x${string}`;
const verifierInputPayload: VerifierInputPayload = {
  schemaVersion: "1",
  chainId: 91342,
  intentHash,
  depositTxHash,
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
  intentHash,
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
  approveTxHash: `0x${"c".repeat(64)}`,
  depositTxHash,
  depositBlockNumber: 10,
  depositBlockHash: `0x${"e".repeat(64)}`,
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  wallet: "0x1111111111111111111111111111111111111111",
  verifiedState: "guest",
  testnetDepositAmountDelta: "1000000000000000000",
  issuedAt: 1790000020,
  issuer: "GIWA Verified Intent Rail MVP",
  safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
};

function run(status: LiveRunRecord["status"] = "matched"): LiveRunRecord {
  return {
    runId: "run-1",
    idempotencyKey: "wallet:campaign:mission",
    wallet: "0x1111111111111111111111111111111111111111",
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    referralCode: null,
    nonce: "nonce-1",
    intentHash,
    manifestJson: JSON.stringify({
      chainId: 91342,
      wallet: "0x1111111111111111111111111111111111111111",
      target: "0x2222222222222222222222222222222222222222",
      selector: "0x47e7ef24",
      asset: "0x3333333333333333333333333333333333333333",
      amountBaseUnits: "1000000000000000000",
      spender: "0x2222222222222222222222222222222222222222",
      maxAllowanceBaseUnits: "1000000000000000000"
    }),
    manifestSignature: `0x${"b".repeat(130)}`,
    status,
    expiryUnix: 1790003600,
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:02:00.000Z"
  };
}

const submittedTx: SubmittedTxRecord = {
  runId: "run-1",
  approveTxHash: `0x${"c".repeat(64)}`,
  depositTxHash,
  submittedAt: "2026-06-17T00:01:00.000Z"
};

const decision: DecisionRecord = {
  intentHash,
  depositTxHash,
  decision: "matched",
  failureReason: null,
  verifierInputHash: computeVerifierInputHash(verifierInputPayload),
  receiptHash: computeReceiptHash(receiptPayload),
  decisionTxHash: null,
  issuedAt: 1790000020
};

const receipt: ReceiptRecord = {
  receiptHash: computeReceiptHash(receiptPayload),
  intentHash,
  payloadJson: JSON.stringify(receiptPayload),
  canonicalPayload: canonicalReceiptPayload(receiptPayload),
  canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload)
};

const verifierInput: VerifierInputRecord = {
  runId: "run-1",
  verifierInputHash: computeVerifierInputHash(verifierInputPayload),
  canonicalPayload: canonicalVerifierInputPayload(verifierInputPayload),
  canonicalPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(verifierInputPayload),
  createdAt: "2026-06-19T00:00:00.000Z"
};

function buildMatchedSnapshotInput(): LiveDemoSnapshotInput {
  return {
    capturedAt: "2026-06-17T00:03:00.000Z",
    liveUrl: "http://127.0.0.1:4177/live",
    run: run(),
    submittedTx,
    decision,
    receipt,
    verifierInput
  };
}

describe("live demo snapshot", () => {
  it("exports public matched-run evidence without secret-like keys", () => {
    const snapshot = buildLiveDemoSnapshot(buildMatchedSnapshotInput());

    expect(snapshot.schemaVersion).toBe("1");
    expect(snapshot.source).toBe("live");
    expect(snapshot.run.status).toBe("matched");
    expect(snapshot.receipt.receiptHash).toBe(receipt.receiptHash);
    expect(snapshot.transactions.depositTxHash).toBe(depositTxHash);
    expect(snapshot.verifier.canonicalVerifierInputPayload).toBe(verifierInput.canonicalPayload);
    expect(snapshot.verifier.canonicalVerifierInputPayloadBytesHex).toBe(verifierInput.canonicalPayloadBytesHex);
    expect(JSON.stringify(snapshot)).not.toMatch(/privateKey|mnemonic|bearer|rpcUrl|apiKey|token/i);
  });

  it("rejects non-matched runs", () => {
    const input = buildMatchedSnapshotInput();

    expect(() =>
      buildLiveDemoSnapshot({
        ...input,
        run: run("depositSubmitted")
      })
    ).toThrow("commercial receipt gate failed: run_not_matched");
  });

  it("rejects matched snapshots when decision and receipt hash differ", () => {
    const input = buildMatchedSnapshotInput();

    expect(() =>
      buildLiveDemoSnapshot({
        ...input,
        decision: {
          ...input.decision!,
          receiptHash: `0x${"9".repeat(64)}`
        }
      })
    ).toThrow("commercial receipt gate failed");
  });
});

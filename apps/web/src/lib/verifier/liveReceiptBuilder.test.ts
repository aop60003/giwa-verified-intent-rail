import { describe, expect, it } from "vitest";

import { buildLiveReceipt } from "./liveReceiptBuilder.ts";

const manifest = {
  manifestVersion: "1",
  chainId: 91342,
  nonce: "nonce-1",
  expiryUnix: 1790003600,
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  wallet: "0x1111111111111111111111111111111111111111",
  actionType: "mockVaultDeposit",
  target: "0x2222222222222222222222222222222222222222",
  selector: "0x47e7ef24",
  asset: "0x3333333333333333333333333333333333333333",
  amountBaseUnits: "1000000000000000000",
  spender: "0x2222222222222222222222222222222222222222",
  maxAllowanceBaseUnits: "1000000000000000000"
} as const;

describe("live receipt builder", () => {
  it("builds a deterministic matched receipt payload and hash", () => {
    const receipt = buildLiveReceipt({
      manifest,
      submittedTx: {
        runId: "run-1",
        approveTxHash: `0x${"c".repeat(64)}`,
        depositTxHash: `0x${"d".repeat(64)}`,
        submittedAt: "2026-06-17T00:01:00.000Z"
      },
      depositBlockNumber: 10,
      depositBlockHash: `0x${"e".repeat(64)}`,
      issuedAt: 1790000020,
      verifierVersion: "live-sprint-11"
    });

    expect(receipt.payload).toMatchObject({
      status: "matched",
      chainId: 91342,
      wallet: manifest.wallet,
      depositTxHash: `0x${"d".repeat(64)}`,
      approveTxHash: `0x${"c".repeat(64)}`,
      verifiedState: "guest"
    });
    expect(receipt.receiptHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(receipt.canonicalPayload).toContain("\"status\":\"matched\"");
    expect(receipt.canonicalPayloadBytesHex).toMatch(/^0x[0-9a-f]+$/u);
  });
});

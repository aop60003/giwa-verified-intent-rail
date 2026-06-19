import { describe, expect, it } from "vitest";

import { computeIntentHash } from "../../../../../packages/protocol/src/index.ts";
import { buildLiveVerifierInput } from "./liveVerifierInput.ts";

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

const run = {
  runId: "run-1",
  idempotencyKey: "wallet:campaign:mission",
  wallet: "0x1111111111111111111111111111111111111111",
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  referralCode: null,
  nonce: "nonce-1",
  intentHash: computeIntentHash(manifest),
  manifestJson: JSON.stringify(manifest),
  manifestSignature: `0x${"b".repeat(130)}`,
  status: "depositSubmitted",
  expiryUnix: 1790003600,
  createdAt: "2026-06-17T00:00:00.000Z",
  updatedAt: "2026-06-17T00:01:00.000Z"
} as const;

describe("live verifier input", () => {
  it("builds a protocol verifier input hash from live snapshots", () => {
    const result = buildLiveVerifierInput({
      run,
      submittedTx: {
        runId: "run-1",
        approveTxHash: null,
        depositTxHash: `0x${"d".repeat(64)}`,
        submittedAt: "2026-06-17T00:01:00.000Z"
      },
      depositTransactionSnapshot: {
        hash: `0x${"d".repeat(64)}`,
        from: run.wallet,
        to: "0x2222222222222222222222222222222222222222",
        input: "0x47e7ef24",
        value: "0"
      },
      depositReceiptSnapshot: {
        status: "success",
        blockNumber: 10,
        blockHash: `0x${"e".repeat(64)}`,
        logs: []
      },
      decodedLogSnapshots: [],
      confirmationDepth: 4,
      headBlockNumberAtVerification: 13,
      verifierVersion: "live-sprint-11"
    });

    expect(result.manifest.wallet).toBe(run.wallet);
    expect(result.payload).toMatchObject({
      chainId: 91342,
      intentHash: run.intentHash,
      depositTxHash: `0x${"d".repeat(64)}`,
      confirmationDepth: 4,
      headBlockNumberAtVerification: 13,
      verifierVersion: "live-sprint-11"
    });
    expect(result.verifierInputHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(result.canonicalPayloadBytesHex).toMatch(/^0x[0-9a-f]+$/u);
  });

  it("returns canonical verifier input payload and component hashes for public replay", () => {
    const result = buildLiveVerifierInput({
      run,
      submittedTx: {
        runId: "run-1",
        approveTxHash: null,
        depositTxHash: `0x${"d".repeat(64)}`,
        submittedAt: "2026-06-17T00:01:00.000Z"
      },
      depositTransactionSnapshot: {
        hash: `0x${"d".repeat(64)}`,
        from: run.wallet,
        to: "0x2222222222222222222222222222222222222222",
        input: "0x47e7ef24",
        value: "0"
      },
      depositReceiptSnapshot: {
        status: "success",
        blockNumber: 10,
        blockHash: `0x${"e".repeat(64)}`,
        logs: []
      },
      decodedLogSnapshots: [],
      confirmationDepth: 4,
      headBlockNumberAtVerification: 13,
      verifierVersion: "live-sprint-14"
    });

    expect(result.payload.depositTransactionSnapshotHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(result.payload.depositReceiptSnapshotHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(result.payload.decodedLogSnapshotHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(result.canonicalPayload).toContain("\"verifierVersion\":\"live-sprint-14\"");
    expect(result.canonicalPayloadBytesHex).toMatch(/^0x[0-9a-f]+$/u);
    expect(result.verifierInputHash).toMatch(/^0x[a-f0-9]{64}$/u);
  });

  it("rejects stored intent hash mismatch before building verifier input", () => {
    expect(() =>
      buildLiveVerifierInput({
        run: { ...run, intentHash: `0x${"9".repeat(64)}` },
        submittedTx: {
          runId: "run-1",
          approveTxHash: null,
          depositTxHash: `0x${"d".repeat(64)}`,
          submittedAt: "2026-06-17T00:01:00.000Z"
        },
        depositTransactionSnapshot: {
          hash: `0x${"d".repeat(64)}`,
          from: run.wallet,
          to: "0x2222222222222222222222222222222222222222",
          input: "0x47e7ef24",
          value: "0"
        },
        depositReceiptSnapshot: {
          status: "success",
          blockNumber: 10,
          blockHash: `0x${"e".repeat(64)}`,
          logs: []
        },
        decodedLogSnapshots: [],
        confirmationDepth: 4,
        headBlockNumberAtVerification: 13,
        verifierVersion: "live-sprint-14"
      })
    ).toThrow("intentHash does not match manifest");
  });
});

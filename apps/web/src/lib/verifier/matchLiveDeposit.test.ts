import { describe, expect, it } from "vitest";

import { matchLiveDeposit, type LiveDepositMatchInput } from "./matchLiveDeposit.ts";

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

const decodedLogSnapshots = [
  {
    eventName: "Approval",
    contractAddress: manifest.asset,
    logIndex: 0,
    sourceTxHash: `0x${"c".repeat(64)}`,
    blockNumber: 9,
    blockHash: `0x${"f".repeat(64)}`,
    args: { owner: manifest.wallet, spender: manifest.spender, amount: manifest.maxAllowanceBaseUnits }
  },
  {
    eventName: "Transfer",
    contractAddress: manifest.asset,
    logIndex: 1,
    sourceTxHash: `0x${"d".repeat(64)}`,
    blockNumber: 10,
    blockHash: `0x${"e".repeat(64)}`,
    args: { from: manifest.wallet, to: manifest.target, amount: manifest.amountBaseUnits }
  },
  {
    eventName: "MockDeposit",
    contractAddress: manifest.target,
    logIndex: 2,
    sourceTxHash: `0x${"d".repeat(64)}`,
    blockNumber: 10,
    blockHash: `0x${"e".repeat(64)}`,
    args: { wallet: manifest.wallet, asset: manifest.asset, amount: manifest.amountBaseUnits }
  }
] as const;

function input(patch: Partial<LiveDepositMatchInput> = {}): LiveDepositMatchInput {
  const base: LiveDepositMatchInput = {
    manifest,
    submittedTx: {
      runId: "run-1",
      approveTxHash: `0x${"c".repeat(64)}`,
      depositTxHash: `0x${"d".repeat(64)}`,
      submittedAt: "2026-06-17T00:01:00.000Z"
    },
    transaction: {
      hash: `0x${"d".repeat(64)}`,
      from: manifest.wallet,
      to: manifest.target,
      input:
        "0x47e7ef2400000000000000000000000033333333333333333333333333333333333333330000000000000000000000000000000000000000000000000de0b6b3a7640000",
      value: "0"
    },
    receipt: {
      status: "success",
      blockNumber: 10,
      blockHash: `0x${"e".repeat(64)}`,
      logs: []
    },
    decodedLogSnapshots,
    confirmationDepth: 4,
    minConfirmations: 3
  };

  return {
    ...base,
    ...patch,
    submittedTx: { ...base.submittedTx, ...patch.submittedTx },
    transaction: { ...base.transaction, ...patch.transaction },
    receipt: { ...base.receipt, ...patch.receipt }
  };
}

describe("live deposit matcher", () => {
  it("matches a standard RPC deposit receipt to a wallet-bound manifest", () => {
    const result = matchLiveDeposit(input());

    expect(result.decision).toBe("matched");
    expect(result.failureReason).toBeNull();
    expect(result.receiptCandidate).toMatchObject({
      depositBlockNumber: 10,
      depositBlockHash: `0x${"e".repeat(64)}`
    });
  });

  it.each([
    ["wallet mismatch", { transaction: { from: "0x9999999999999999999999999999999999999999" } }, "WALLET_MISMATCH"],
    ["target mismatch", { transaction: { to: "0x9999999999999999999999999999999999999999" } }, "TARGET_MISMATCH"],
    ["reverted receipt", { receipt: { status: "reverted" } }, "TX_FAILED"],
    ["low confirmation", { confirmationDepth: 1 }, "UNDER_CONFIRMED"]
  ])("does not match on %s", (_label, patch, reason) => {
    const result = matchLiveDeposit(input(patch as Partial<LiveDepositMatchInput>));

    expect(result.decision).not.toBe("matched");
    expect(result.failureReason).toBe(reason);
    expect(result.receiptCandidate).toBeUndefined();
  });

  it("rejects deposits confirmed after manifest expiry using block timestamp", () => {
    const result = matchLiveDeposit(input({ depositBlockTimestamp: manifest.expiryUnix + 1 }));

    expect(result.decision).toBe("mismatched");
    expect(result.failureReason).toBe("EXPIRED");
  });

  it("rejects approval amounts that exceed the manifest allowance bound", () => {
    const result = matchLiveDeposit(
      input({
        allowancePolicy: "max",
        decodedLogSnapshots: [
          { ...decodedLogSnapshots[0], args: { ...decodedLogSnapshots[0].args, amount: "1000000000000000001" } },
          decodedLogSnapshots[1],
          decodedLogSnapshots[2]
        ]
      })
    );

    expect(result.decision).toBe("mismatched");
    expect(result.failureReason).toBe("ALLOWANCE_EXCEEDED");
  });

  it("rejects decoded logs that are not bound to the deposit receipt block", () => {
    const result = matchLiveDeposit(
      input({
        decodedLogSnapshots: [
          decodedLogSnapshots[0],
          { ...decodedLogSnapshots[1], blockHash: `0x${"9".repeat(64)}` },
          decodedLogSnapshots[2]
        ]
      })
    );

    expect(result.decision).toBe("mismatched");
    expect(result.failureReason).toBe("MISSING_REQUIRED_LOG");
  });
});

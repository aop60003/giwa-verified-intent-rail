import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { computeIntentHash, signManifest, type Address, type Hex } from "../../../../../packages/protocol/src/index.ts";
import type { LiveRunRecord, SubmittedTxRecord } from "../live/liveTypes.ts";
import { createStandardRpcReceiptClient } from "./standardRpcReceiptClient.ts";
import { verifyLiveRun } from "./liveVerifierService.ts";

const vaultAbi = parseAbi([
  "function deposit(address asset,uint256 amount)",
  "event MockDeposit(address indexed wallet,address indexed asset,uint256 amount)"
]);
const tokenAbi = parseAbi([
  "event Approval(address indexed owner,address indexed spender,uint256 amount)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)"
]);

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

const run: LiveRunRecord = {
  runId: "run-1",
  idempotencyKey: "wallet:campaign:mission",
  wallet: manifest.wallet,
  campaignId: manifest.campaignId,
  missionId: manifest.missionId,
  referralCode: null,
  nonce: manifest.nonce,
  intentHash: computeIntentHash(manifest),
  manifestJson: JSON.stringify(manifest),
  manifestSignature: `0x${"b".repeat(130)}`,
  status: "depositSubmitted",
  expiryUnix: manifest.expiryUnix,
  createdAt: "2026-06-17T00:00:00.000Z",
  updatedAt: "2026-06-17T00:01:00.000Z"
};

const submittedTx: SubmittedTxRecord = {
  runId: "run-1",
  approveTxHash: `0x${"c".repeat(64)}`,
  depositTxHash: `0x${"d".repeat(64)}`,
  submittedAt: "2026-06-17T00:01:00.000Z"
};

function eventTopics(value: ReturnType<typeof encodeEventTopics>): readonly `0x${string}`[] {
  return value as unknown as readonly `0x${string}`[];
}

function log(
  address: string,
  logIndex: number,
  topics: readonly `0x${string}`[],
  data: `0x${string}`,
  sourceTxHash: `0x${string}`,
  blockNumber: bigint,
  blockHash: `0x${string}`
) {
  return { address, logIndex, topics, data, transactionHash: sourceTxHash, blockNumber, blockHash };
}

function makeClient({ reverted = false, wrongWallet = false } = {}) {
  const amount = BigInt(manifest.amountBaseUnits);
  const depositInput = encodeFunctionData({
    abi: vaultAbi,
    functionName: "deposit",
    args: [manifest.asset, amount]
  });
  const approvalLog = log(
    manifest.asset,
    0,
    eventTopics(encodeEventTopics({
      abi: tokenAbi,
      eventName: "Approval",
      args: { owner: manifest.wallet, spender: manifest.spender }
    })),
    encodeAbiParameters([{ type: "uint256" }], [amount]),
    submittedTx.approveTxHash! as Hex,
    9n,
    `0x${"f".repeat(64)}`
  );
  const transferLog = log(
    manifest.asset,
    1,
    eventTopics(encodeEventTopics({
      abi: tokenAbi,
      eventName: "Transfer",
      args: { from: wrongWallet ? "0x9999999999999999999999999999999999999999" : manifest.wallet, to: manifest.target }
    })),
    encodeAbiParameters([{ type: "uint256" }], [amount]),
    submittedTx.depositTxHash as Hex,
    10n,
    `0x${"e".repeat(64)}`
  );
  const depositLog = log(
    manifest.target,
    2,
    eventTopics(encodeEventTopics({
      abi: vaultAbi,
      eventName: "MockDeposit",
      args: { wallet: manifest.wallet, asset: manifest.asset }
    })),
    encodeAbiParameters([{ type: "uint256" }], [amount]),
    submittedTx.depositTxHash as Hex,
    10n,
    `0x${"e".repeat(64)}`
  );

  return createStandardRpcReceiptClient({
    chainId: 91342,
    transport: {
      async getChainId() {
        return 91342;
      },
      async getTransaction(input) {
        const hash = input?.hash ?? submittedTx.depositTxHash;
        return {
          hash,
          from: hash === submittedTx.depositTxHash ? manifest.wallet : manifest.wallet,
          to: hash === submittedTx.depositTxHash ? manifest.target : manifest.asset,
          input: hash === submittedTx.depositTxHash ? depositInput : "0x095ea7b3",
          value: 0n
        };
      },
      async getTransactionReceipt(input) {
        const hash = input?.hash ?? submittedTx.depositTxHash;
        return {
          status: reverted ? "reverted" : "success",
          blockNumber: hash === submittedTx.depositTxHash ? 10n : 9n,
          blockHash: hash === submittedTx.depositTxHash ? `0x${"e".repeat(64)}` : `0x${"f".repeat(64)}`,
          logs: hash === submittedTx.depositTxHash ? [transferLog, depositLog] : [approvalLog]
        };
      },
      async getBlockNumber() {
        return 13n;
      },
      async getBlock(input) {
        const blockNumber = input?.blockNumber === 10n ? 10n : 9n;
        return {
          number: blockNumber,
          hash: blockNumber === 10n ? `0x${"e".repeat(64)}` : `0x${"f".repeat(64)}`,
          timestamp: blockNumber === 10n ? 1790000020n : 1790000010n
        };
      }
    }
  });
}

const signingAccount = privateKeyToAccount(`0x${"1".repeat(64)}` as Hex);
const trustPolicy = {
  chainId: 91342,
  officialCampaignSigner: signingAccount.address,
  intentRailAddress: "0x4444444444444444444444444444444444444444" as Address,
  mockTokenAddress: manifest.asset,
  mockVaultAddress: manifest.target,
  minConfirmations: 3,
  amountPolicy: "exact" as const,
  allowancePolicy: "exact" as const
};

async function signedRun(verifyingContract = trustPolicy.intentRailAddress): Promise<LiveRunRecord> {
  const signed = await signManifest({
    manifest,
    verifyingContract,
    account: signingAccount
  });

  return {
    ...run,
    intentHash: signed.intentHash,
    manifestSignature: signed.manifestSignature
  };
}

describe("live verifier service", () => {
  it("creates a matched local verifier decision and receipt from standard RPC snapshots", async () => {
    const result = await verifyLiveRun({
      run,
      submittedTx,
      receiptClient: makeClient(),
      nowSeconds: () => 1790000020,
      verifierVersion: "live-sprint-11"
    });

    expect(result.decision).toBe("matched");
    expect(result.decisionTxHash).toBeNull();
    expect(result.standardRpcReceiptStatus).toBe(1);
    expect(result.depositBlockNumber).toBe(10);
    expect(result.confirmationDepth).toBe(4);
    expect(result.receipt?.receiptHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(result.verifierInputHash).toMatch(/^0x[a-f0-9]{64}$/u);
  });

  it("does not build a receipt for mismatched logs", async () => {
    const result = await verifyLiveRun({
      run,
      submittedTx,
      receiptClient: makeClient({ wrongWallet: true }),
      nowSeconds: () => 1790000020,
      verifierVersion: "live-sprint-11"
    });

    expect(result.decision).toBe("mismatched");
    expect(result.failureReason).toBe("MISSING_REQUIRED_LOG");
    expect(result.receipt).toBeUndefined();
  });

  it("rejects a manifest when the stored intent hash does not recompute", async () => {
    const validRun = await signedRun();
    const result = await verifyLiveRun({
      run: { ...validRun, intentHash: `0x${"9".repeat(64)}` },
      submittedTx,
      receiptClient: makeClient(),
      nowSeconds: () => 1790000020,
      verifierVersion: "live-sprint-14",
      trustPolicy
    });

    expect(result.decision).toBe("mismatched");
    expect(result.failureReason).toBe("INTENT_HASH_MISMATCH");
    expect(result.receipt).toBeUndefined();
  });

  it("rejects a manifest signed for a different verifying contract", async () => {
    const wrongDomainRun = await signedRun("0x5555555555555555555555555555555555555555");
    const result = await verifyLiveRun({
      run: wrongDomainRun,
      submittedTx,
      receiptClient: makeClient(),
      nowSeconds: () => 1790000020,
      verifierVersion: "live-sprint-14",
      trustPolicy
    });

    expect(result.decision).toBe("mismatched");
    expect(result.failureReason).toBe("SIGNER_MISMATCH");
    expect(result.receipt).toBeUndefined();
  });
});

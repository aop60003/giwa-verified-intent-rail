import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  parseAbi,
  type Hex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";

import {
  computeIntentHash,
  signManifest,
  type Address
} from "../../../../../packages/protocol/src/index.ts";
import { verifyLiveRun } from "../verifier/liveVerifierService.ts";
import {
  createStandardRpcReceiptClient,
  type StandardRpcReceiptClient
} from "../verifier/standardRpcReceiptClient.ts";
import { backfillPublicEvidence } from "./publicEvidenceBackfill.ts";
import { createMemoryLiveStore } from "./liveStore.ts";
import type { LiveRunRecord, SubmittedTxRecord } from "./liveTypes.ts";

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
  nonce: "legacy-backfill",
  expiryUnix: 1_790_003_600,
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
const submittedTx: SubmittedTxRecord = {
  runId: "run-legacy",
  approveTxHash: `0x${"c".repeat(64)}`,
  depositTxHash: `0x${"d".repeat(64)}`,
  submittedAt: "2026-07-31T00:01:00.000Z"
};
const signingAccount = privateKeyToAccount(`0x${"1".repeat(64)}` as Hex);
const verifyingContract =
  "0x4444444444444444444444444444444444444444" as Address;
const trustPolicy = {
  chainId: 91342,
  officialCampaignSigner: signingAccount.address,
  intentRailAddress: verifyingContract,
  mockTokenAddress: manifest.asset,
  mockVaultAddress: manifest.target,
  minConfirmations: 3,
  amountPolicy: "exact" as const,
  allowancePolicy: "exact" as const
};

function eventTopics(
  value: ReturnType<typeof encodeEventTopics>
): readonly Hex[] {
  return value as unknown as readonly Hex[];
}

function rpcFixture(input: {
  headBlockNumber: number;
  wrongWallet?: boolean;
  failWith?: Error;
}): StandardRpcReceiptClient {
  const amount = BigInt(manifest.amountBaseUnits);
  const depositInput = encodeFunctionData({
    abi: vaultAbi,
    functionName: "deposit",
    args: [manifest.asset, amount]
  });
  const approvalLog = {
    address: manifest.asset,
    logIndex: 0,
    topics: eventTopics(
      encodeEventTopics({
        abi: tokenAbi,
        eventName: "Approval",
        args: { owner: manifest.wallet, spender: manifest.spender }
      })
    ),
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
    transactionHash: submittedTx.approveTxHash,
    blockNumber: 9n,
    blockHash: `0x${"f".repeat(64)}`
  };
  const transferLog = {
    address: manifest.asset,
    logIndex: 1,
    topics: eventTopics(
      encodeEventTopics({
        abi: tokenAbi,
        eventName: "Transfer",
        args: {
          from: input.wrongWallet
            ? "0x9999999999999999999999999999999999999999"
            : manifest.wallet,
          to: manifest.target
        }
      })
    ),
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
    transactionHash: submittedTx.depositTxHash,
    blockNumber: 10n,
    blockHash: `0x${"e".repeat(64)}`
  };
  const depositLog = {
    address: manifest.target,
    logIndex: 2,
    topics: eventTopics(
      encodeEventTopics({
        abi: vaultAbi,
        eventName: "MockDeposit",
        args: { wallet: manifest.wallet, asset: manifest.asset }
      })
    ),
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
    transactionHash: submittedTx.depositTxHash,
    blockNumber: 10n,
    blockHash: `0x${"e".repeat(64)}`
  };

  return createStandardRpcReceiptClient({
    chainId: 91342,
    transport: {
      async getChainId() {
        if (input.failWith !== undefined) throw input.failWith;
        return 91342;
      },
      async getTransaction(request) {
        if (input.failWith !== undefined) throw input.failWith;
        const hash = request?.hash ?? submittedTx.depositTxHash;
        return {
          hash,
          from: manifest.wallet,
          to: hash === submittedTx.depositTxHash ? manifest.target : manifest.asset,
          input: hash === submittedTx.depositTxHash ? depositInput : "0x095ea7b3",
          value: 0n
        };
      },
      async getTransactionReceipt(request) {
        if (input.failWith !== undefined) throw input.failWith;
        const hash = request?.hash ?? submittedTx.depositTxHash;
        return {
          status: "success",
          blockNumber: hash === submittedTx.depositTxHash ? 10n : 9n,
          blockHash:
            hash === submittedTx.depositTxHash
              ? `0x${"e".repeat(64)}`
              : `0x${"f".repeat(64)}`,
          logs:
            hash === submittedTx.depositTxHash
              ? [transferLog, depositLog]
              : [approvalLog]
        };
      },
      async getBlockNumber() {
        if (input.failWith !== undefined) throw input.failWith;
        return BigInt(input.headBlockNumber);
      },
      async getBlock(request) {
        const blockNumber = request?.blockNumber === 10n ? 10n : 9n;
        return {
          number: blockNumber,
          hash:
            blockNumber === 10n
              ? `0x${"e".repeat(64)}`
              : `0x${"f".repeat(64)}`,
          timestamp: blockNumber === 10n ? 1_790_000_020n : 1_790_000_010n
        };
      }
    }
  });
}

async function legacyFixture() {
  const signed = await signManifest({
    manifest,
    verifyingContract,
    account: signingAccount
  });
  const run: LiveRunRecord = {
    runId: submittedTx.runId,
    tenantId: "local",
    capabilityHash: "private-capability-canary",
    idempotencyKey: "legacy-backfill:idempotency",
    wallet: manifest.wallet,
    campaignId: manifest.campaignId,
    missionId: manifest.missionId,
    referralCode: null,
    nonce: manifest.nonce,
    intentHash: computeIntentHash(manifest),
    manifestJson: JSON.stringify(manifest),
    manifestSignature: signed.manifestSignature,
    status: "depositSubmitted",
    expiryUnix: manifest.expiryUnix,
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:01:00.000Z"
  };
  const verified = await verifyLiveRun({
    run,
    submittedTx,
    receiptClient: rpcFixture({ headBlockNumber: 13 }),
    nowSeconds: () => 1_790_000_020,
    verifierVersion: "live-release-2",
    trustPolicy
  });
  if (
    verified.decision !== "matched" ||
    verified.receipt === undefined ||
    verified.verifierInputRecord === undefined
  ) {
    throw new Error("test fixture did not produce matched evidence");
  }

  const store = createMemoryLiveStore();
  store.createRun(run);
  store.saveSubmittedTx(submittedTx);
  store.saveVerifierInput(verified.verifierInputRecord);
  store.saveReceipt(verified.receipt);
  store.saveDecision({
    intentHash: run.intentHash,
    depositTxHash: submittedTx.depositTxHash,
    decision: verified.decision,
    failureReason: verified.failureReason,
    verifierInputHash: verified.verifierInputHash,
    receiptHash: verified.receiptHash,
    decisionTxHash: verified.decisionTxHash,
    issuedAt: 1_790_000_020,
    standardRpcReceiptStatus: verified.standardRpcReceiptStatus,
    depositBlockNumber: verified.depositBlockNumber,
    depositBlockHash: verified.depositBlockHash,
    confirmationDepth: verified.confirmationDepth
  });
  store.updateRunStatus(run.runId, "matched", run.updatedAt);

  return {
    store,
    run: store.getRun(run.runId)!,
    decision: store.getDecisionByIntentHash(run.intentHash)!,
    receipt: verified.receipt,
    verifierInput: verified.verifierInputRecord
  };
}

describe("backfillPublicEvidence", () => {
  it("saves a replayable bundle with the persisted historical head and confirmation depth", async () => {
    const fixture = await legacyFixture();
    const before = structuredClone({
      run: fixture.store.getRun(fixture.run.runId),
      decision: fixture.store.getDecisionByIntentHash(fixture.run.intentHash),
      receipt: fixture.store.getReceipt(fixture.receipt.receiptHash),
      verifierInput: fixture.store.getVerifierInput(
        fixture.verifierInput.verifierInputHash
      )
    });

    const result = await backfillPublicEvidence({
      store: fixture.store,
      receiptClient: rpcFixture({ headBlockNumber: 500 }),
      verifyingContract,
      now: () => "2026-07-31T01:00:00.000Z"
    });

    expect(result).toEqual({
      candidates: 1,
      saved: 1,
      alreadyPresent: 0,
      skippedIntegrityMismatch: 0,
      failedBoundedError: 0
    });
    const stored = fixture.store.getPublicEvidenceByReceiptHash(
      fixture.receipt.receiptHash
    );
    expect(stored).toBeDefined();
    const bundle = JSON.parse(stored!.bundleJson);
    expect(bundle.verification).toMatchObject({
      headBlockNumberAtVerification: 13,
      confirmationDepth: 4,
      depositBlockNumber: 10,
      standardRpcReceiptStatus: 1
    });
    expect(bundle.manifest.recoveredSigner).toBe(
      signingAccount.address.toLowerCase()
    );
    expect({
      run: fixture.store.getRun(fixture.run.runId),
      decision: fixture.store.getDecisionByIntentHash(fixture.run.intentHash),
      receipt: fixture.store.getReceipt(fixture.receipt.receiptHash),
      verifierInput: fixture.store.getVerifierInput(
        fixture.verifierInput.verifierInputHash
      )
    }).toEqual(before);
  });

  it("is idempotent and counts an existing bundle without reading RPC again", async () => {
    const fixture = await legacyFixture();
    await backfillPublicEvidence({
      store: fixture.store,
      receiptClient: rpcFixture({ headBlockNumber: 500 }),
      verifyingContract,
      now: () => "2026-07-31T01:00:00.000Z"
    });

    const second = await backfillPublicEvidence({
      store: fixture.store,
      receiptClient: rpcFixture({
        headBlockNumber: 500,
        failWith: new Error("RPC must not be called for existing evidence")
      }),
      verifyingContract,
      now: () => "2026-07-31T02:00:00.000Z"
    });

    expect(second).toEqual({
      candidates: 1,
      saved: 0,
      alreadyPresent: 1,
      skippedIntegrityMismatch: 0,
      failedBoundedError: 0
    });
  });

  it("skips current public facts that do not reproduce the persisted snapshots", async () => {
    const fixture = await legacyFixture();

    const result = await backfillPublicEvidence({
      store: fixture.store,
      receiptClient: rpcFixture({ headBlockNumber: 500, wrongWallet: true }),
      verifyingContract,
      now: () => "2026-07-31T01:00:00.000Z"
    });

    expect(result).toEqual({
      candidates: 1,
      saved: 0,
      alreadyPresent: 0,
      skippedIntegrityMismatch: 1,
      failedBoundedError: 0
    });
    expect(
      fixture.store.getPublicEvidenceByReceiptHash(fixture.receipt.receiptHash)
    ).toBeUndefined();
  });

  it("reduces RPC failures to one bounded aggregate without raw error data", async () => {
    const fixture = await legacyFixture();
    const privateError =
      "provider rejected request with Authorization=private-secret-canary";

    const result = await backfillPublicEvidence({
      store: fixture.store,
      receiptClient: rpcFixture({
        headBlockNumber: 500,
        failWith: new Error(privateError)
      }),
      verifyingContract,
      now: () => "2026-07-31T01:00:00.000Z"
    });

    expect(result).toEqual({
      candidates: 1,
      saved: 0,
      alreadyPresent: 0,
      skippedIntegrityMismatch: 0,
      failedBoundedError: 1
    });
    expect(JSON.stringify(result)).not.toContain(privateError);
  });
});

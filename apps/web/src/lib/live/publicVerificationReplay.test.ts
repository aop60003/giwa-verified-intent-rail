import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  computeIntentHash,
  computeReceiptHash,
  computeVerifierInputHash,
  signManifest,
  type ActionManifest,
  type ReceiptPayload,
  type VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";
import {
  hashEvidenceJson,
  type DecodedLogSnapshot
} from "../verifier/decodeEvidence.ts";
import {
  PUBLIC_VERIFICATION_NOTICE,
  normalizePublicVerificationBundle,
  type PublicVerificationBundleV1
} from "./publicVerificationBundle.ts";
import { replayPublicVerificationBundle } from "./publicVerificationReplay.ts";

const depositTxHash = `0x${"d".repeat(64)}` as const;
const approveTxHash = `0x${"c".repeat(64)}` as const;
const depositBlockHash = `0x${"e".repeat(64)}` as const;
const manifest: ActionManifest = {
  manifestVersion: "1",
  chainId: 91342,
  nonce: "release-2-replay-test",
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
  maxAllowanceBaseUnits: "2000000000000000000",
  referralCode: "qr-judge-demo"
};
const verifyingContract = "0x4444444444444444444444444444444444444444" as const;
const fixtureAccount = privateKeyToAccount(
  keccak256(stringToBytes("GIWA release 2 independent replay test signer"))
);

function decodedLogs(): DecodedLogSnapshot[] {
  return [
    {
      eventName: "Approval",
      contractAddress: manifest.asset,
      logIndex: 0,
      sourceTxHash: approveTxHash,
      blockNumber: 99,
      blockHash: `0x${"a".repeat(64)}`,
      args: {
        owner: manifest.wallet,
        spender: manifest.spender,
        amount: manifest.maxAllowanceBaseUnits
      }
    },
    {
      eventName: "Transfer",
      contractAddress: manifest.asset,
      logIndex: 1,
      sourceTxHash: depositTxHash,
      blockNumber: 100,
      blockHash: depositBlockHash,
      args: {
        from: manifest.wallet,
        to: manifest.target,
        amount: manifest.amountBaseUnits
      }
    },
    {
      eventName: "MockDeposit",
      contractAddress: manifest.target,
      logIndex: 2,
      sourceTxHash: depositTxHash,
      blockNumber: 100,
      blockHash: depositBlockHash,
      args: {
        wallet: manifest.wallet,
        asset: manifest.asset,
        amount: manifest.amountBaseUnits
      }
    }
  ];
}

async function createPublicVerificationBundleFixture(): Promise<PublicVerificationBundleV1> {
  const signed = await signManifest({
    manifest,
    verifyingContract,
    account: fixtureAccount
  });
  const intentHash = computeIntentHash(manifest);
  const logs = decodedLogs();
  const verifierInputPayload: VerifierInputPayload = {
    schemaVersion: "1",
    chainId: 91342,
    intentHash,
    depositTxHash,
    depositTransactionSnapshotHash: `0x${"5".repeat(64)}`,
    depositReceiptSnapshotHash: `0x${"6".repeat(64)}`,
    decodedLogSnapshotHash: hashEvidenceJson(logs),
    confirmationDepth: 4,
    headBlockNumberAtVerification: 103,
    verifierVersion: "live-release-2"
  };
  const receiptPayload: ReceiptPayload = {
    schemaVersion: "1",
    verifierVersion: "live-release-2",
    intentHash,
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: "mockVaultDeposit",
    asset: manifest.asset,
    amountBaseUnits: manifest.amountBaseUnits,
    target: manifest.target,
    spender: manifest.spender,
    maxAllowanceBaseUnits: manifest.maxAllowanceBaseUnits,
    allowanceUsedBaseUnits: manifest.amountBaseUnits,
    approvalRequired: true,
    approveTxHash,
    depositTxHash,
    depositBlockNumber: 100,
    depositBlockHash,
    campaignId: manifest.campaignId,
    missionId: manifest.missionId,
    wallet: manifest.wallet,
    verifiedState: "guest",
    testnetDepositAmountDelta: manifest.amountBaseUnits,
    issuedAt: 1790000000,
    issuer: "GIWA Verified Intent Rail MVP",
    safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
  };
  const receiptHash = computeReceiptHash(receiptPayload);

  return normalizePublicVerificationBundle({
    schemaVersion: "1",
    source: "live",
    generatedAt: "2026-07-31T00:00:00.000Z",
    identity: { receiptHash, intentHash, depositTxHash },
    manifest: {
      payload: manifest,
      canonicalPayload: canonicalManifestPayload(manifest),
      canonicalPayloadBytesHex: canonicalManifestPayloadBytesHex(manifest),
      signature: signed.manifestSignature,
      signingDomain: {
        name: "GIWA Verified Intent Rail",
        version: "1",
        chainId: 91342,
        verifyingContract
      },
      recoveredSigner: signed.recoveredSigner
    },
    verifierInput: {
      payload: verifierInputPayload,
      canonicalPayload: canonicalVerifierInputPayload(verifierInputPayload),
      canonicalPayloadBytesHex:
        canonicalVerifierInputPayloadBytesHex(verifierInputPayload),
      verifierInputHash: computeVerifierInputHash(verifierInputPayload),
      verifierVersion: verifierInputPayload.verifierVersion
    },
    verification: {
      depositBlockNumber: 100,
      depositBlockHash,
      headBlockNumberAtVerification: 103,
      confirmationDepth: 4,
      standardRpcReceiptStatus: 1
    },
    decodedLogs: logs,
    receipt: {
      payload: receiptPayload,
      canonicalPayload: canonicalReceiptPayload(receiptPayload),
      canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload),
      receiptHash,
      schemaVersion: "1",
      verifierVersion: receiptPayload.verifierVersion
    },
    replay: {
      algorithm: "keccak256-canonical-json+eip712",
      command: "pnpm --filter @giwa/web evidence:replay -- <bundle.json>"
    },
    notice: PUBLIC_VERIFICATION_NOTICE
  });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function rehashReceipt(bundle: any): void {
  bundle.receipt.canonicalPayload = canonicalReceiptPayload(bundle.receipt.payload);
  bundle.receipt.canonicalPayloadBytesHex = canonicalReceiptPayloadBytesHex(
    bundle.receipt.payload
  );
  bundle.receipt.receiptHash = computeReceiptHash(bundle.receipt.payload);
  bundle.identity.receiptHash = bundle.receipt.receiptHash;
}

function rehashVerifierInput(bundle: any): void {
  bundle.verifierInput.canonicalPayload = canonicalVerifierInputPayload(
    bundle.verifierInput.payload
  );
  bundle.verifierInput.canonicalPayloadBytesHex =
    canonicalVerifierInputPayloadBytesHex(bundle.verifierInput.payload);
  bundle.verifierInput.verifierInputHash = computeVerifierInputHash(
    bundle.verifierInput.payload
  );
}

function rehashDecodedLogs(bundle: any): void {
  bundle.verifierInput.payload.decodedLogSnapshotHash = hashEvidenceJson(
    bundle.decodedLogs
  );
  rehashVerifierInput(bundle);
}

describe("public verification bundle replay", () => {
  it("replays the valid bundle using only immutable bundle fields", async () => {
    const result = await replayPublicVerificationBundle(
      await createPublicVerificationBundleFixture()
    );

    expect(result).toEqual({
      ok: true,
      checks: {
        manifestHash: "passed",
        manifestSignature: "passed",
        verifierInputHash: "passed",
        decodedLogHash: "passed",
        receiptHash: "passed",
        crossReferences: "passed"
      },
      recoveredSigner: expect.stringMatching(/^0x[a-f0-9]{40}$/u)
    });
  });

  it.each([
    [
      "Manifest wallet",
      (bundle: any) => (bundle.manifest.payload.wallet = "0x9999999999999999999999999999999999999999"),
      "manifestHash"
    ],
    [
      "signature",
      (bundle: any) =>
        (bundle.manifest.signature =
          `${bundle.manifest.signature.slice(0, 2)}` +
          `${bundle.manifest.signature[2] === "0" ? "1" : "0"}` +
          `${bundle.manifest.signature.slice(3)}`),
      "manifestSignature"
    ],
    [
      "verifier input bytes",
      (bundle: any) => (bundle.verifierInput.canonicalPayloadBytesHex = "0x7b7d"),
      "verifierInputHash"
    ],
    [
      "decoded log amount",
      (bundle: any) => (bundle.decodedLogs[2].args.amount = "1000000000000000001"),
      "decodedLogHash"
    ],
    [
      "Receipt deposit hash",
      (bundle: any) => (bundle.receipt.payload.depositTxHash = `0x${"9".repeat(64)}`),
      "receiptHash"
    ],
    [
      "top-level identity hash",
      (bundle: any) => (bundle.identity.intentHash = `0x${"8".repeat(64)}`),
      "crossReferences"
    ]
  ])("fails the appropriate check after tampering with %s", async (_label, mutate, expectedCheck) => {
    const bundle = clone(await createPublicVerificationBundleFixture()) as any;
    mutate(bundle);

    const result = await replayPublicVerificationBundle(bundle);

    expect(result.ok).toBe(false);
    expect(result.checks[expectedCheck as keyof typeof result.checks]).toBe("failed");
  });

  it("rejects a nested runCapability canary before replay", async () => {
    const bundle = clone(await createPublicVerificationBundleFixture()) as any;
    bundle.decodedLogs[1].args.metadata = { runCapability: "secret-canary" };

    expect(() => normalizePublicVerificationBundle(bundle)).toThrow(/forbidden public bundle key/u);
  });

  it.each(["allowanceUsedBaseUnits", "testnetDepositAmountDelta"])(
    "fails cross-references when a rehashed Receipt tampers with %s",
    async (field) => {
      const bundle = clone(await createPublicVerificationBundleFixture()) as any;
      bundle.receipt.payload[field] = "999";
      rehashReceipt(bundle);

      const result = await replayPublicVerificationBundle(bundle);

      expect(result.checks.receiptHash).toBe("passed");
      expect(result.checks.crossReferences).toBe("failed");
      expect(result.ok).toBe(false);
    }
  );

  it.each([
    [
      "head block",
      (bundle: any) => {
        bundle.verifierInput.payload.headBlockNumberAtVerification = 104;
        bundle.verification.headBlockNumberAtVerification = 104;
      }
    ],
    [
      "confirmation depth",
      (bundle: any) => {
        bundle.verifierInput.payload.confirmationDepth = 5;
        bundle.verification.confirmationDepth = 5;
      }
    ]
  ])(
    "fails cross-references when rehashed verifier input has inconsistent %s arithmetic",
    async (_label, mutate) => {
      const bundle = clone(await createPublicVerificationBundleFixture()) as any;
      mutate(bundle);
      rehashVerifierInput(bundle);

      const result = await replayPublicVerificationBundle(bundle);

      expect(result.checks.verifierInputHash).toBe("passed");
      expect(result.checks.crossReferences).toBe("failed");
      expect(result.ok).toBe(false);
    }
  );

  it.each(["Transfer", "MockDeposit", "Approval"])(
    "rejects a conflicting duplicate %s log after hashes are recomputed",
    async (eventName) => {
      const bundle = clone(await createPublicVerificationBundleFixture()) as any;
      const original = bundle.decodedLogs.find(
        (log: DecodedLogSnapshot) => log.eventName === eventName
      );
      bundle.decodedLogs.push({
        ...clone(original),
        logIndex: original.logIndex + 10,
        args: { ...original.args, amount: "999" }
      });
      rehashDecodedLogs(bundle);

      const result = await replayPublicVerificationBundle(bundle);

      expect(result.checks.verifierInputHash).toBe("passed");
      expect(result.checks.decodedLogHash).toBe("passed");
      expect(result.checks.crossReferences).toBe("failed");
      expect(result.ok).toBe(false);
    }
  );

  it("requires zero Approval logs when the Receipt says approval was not required", async () => {
    const bundle = clone(await createPublicVerificationBundleFixture()) as any;
    const approval = clone(
      bundle.decodedLogs.find(
        (log: DecodedLogSnapshot) => log.eventName === "Approval"
      )
    );
    bundle.decodedLogs = bundle.decodedLogs.filter(
      (log: DecodedLogSnapshot) => log.eventName !== "Approval"
    );
    bundle.receipt.payload.approvalRequired = false;
    bundle.receipt.payload.approveTxHash = null;
    rehashReceipt(bundle);
    rehashDecodedLogs(bundle);

    await expect(replayPublicVerificationBundle(bundle)).resolves.toMatchObject({
      ok: true,
      checks: { crossReferences: "passed" }
    });

    bundle.decodedLogs.push(approval);
    rehashDecodedLogs(bundle);
    const tampered = await replayPublicVerificationBundle(bundle);

    expect(tampered.checks.verifierInputHash).toBe("passed");
    expect(tampered.checks.decodedLogHash).toBe("passed");
    expect(tampered.checks.crossReferences).toBe("failed");
    expect(tampered.ok).toBe(false);
  });
});

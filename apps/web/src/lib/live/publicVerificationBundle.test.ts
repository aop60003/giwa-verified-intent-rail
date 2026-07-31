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
  recoverManifestSigner,
  signManifest,
  type ActionManifest,
  type ReceiptPayload,
  type VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";
import { hashEvidenceJson, type DecodedLogSnapshot } from "../verifier/decodeEvidence.ts";
import {
  PUBLIC_VERIFICATION_NOTICE,
  normalizePublicVerificationBundle,
  type PublicVerificationBundleV1
} from "./publicVerificationBundle.ts";

const upperHex = (value: string): string => `0x${value.slice(2).toUpperCase()}`;
const depositTxHash = `0x${"d".repeat(64)}` as const;
const approveTxHash = `0x${"c".repeat(64)}` as const;
const depositBlockHash = `0x${"e".repeat(64)}` as const;

const manifest: ActionManifest = {
  manifestVersion: "1",
  chainId: 91342,
  nonce: "release-2-public-replay",
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

const decodedLogs: DecodedLogSnapshot[] = [
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

const fixtureAccount = privateKeyToAccount(
  keccak256(stringToBytes("GIWA release 2 public verification fixture signer"))
);
const verifyingContract = "0x4444444444444444444444444444444444444444" as const;

function mixedCaseManifest(): ActionManifest {
  return {
    ...manifest,
    wallet: upperHex(manifest.wallet) as ActionManifest["wallet"],
    target: upperHex(manifest.target) as ActionManifest["target"],
    selector: upperHex(manifest.selector) as ActionManifest["selector"],
    asset: upperHex(manifest.asset) as ActionManifest["asset"],
    spender: upperHex(manifest.spender) as ActionManifest["spender"]
  };
}

function mixedCaseDecodedLogs(): DecodedLogSnapshot[] {
  return decodedLogs.map((log) => ({
    ...log,
    contractAddress: upperHex(log.contractAddress) as DecodedLogSnapshot["contractAddress"],
    sourceTxHash: upperHex(log.sourceTxHash) as DecodedLogSnapshot["sourceTxHash"],
    blockHash: upperHex(log.blockHash) as DecodedLogSnapshot["blockHash"],
    args: Object.fromEntries(
      Object.entries(log.args).map(([key, value]) => [
        key,
        typeof value === "string" && /^0x[0-9a-f]{40}$/u.test(value) ? upperHex(value) : value
      ])
    )
  }));
}

export async function createPublicVerificationBundleFixture(): Promise<PublicVerificationBundleV1> {
  const signed = await signManifest({
    manifest,
    verifyingContract,
    account: fixtureAccount
  });
  const intentHash = computeIntentHash(manifest);
  const verifierInputPayload: VerifierInputPayload = {
    schemaVersion: "1",
    chainId: 91342,
    intentHash: upperHex(intentHash) as VerifierInputPayload["intentHash"],
    depositTxHash: upperHex(depositTxHash) as VerifierInputPayload["depositTxHash"],
    depositTransactionSnapshotHash: `0x${"5".repeat(64)}`,
    depositReceiptSnapshotHash: `0x${"6".repeat(64)}`,
    decodedLogSnapshotHash: hashEvidenceJson(decodedLogs),
    confirmationDepth: 4,
    headBlockNumberAtVerification: 103,
    verifierVersion: "live-release-2"
  };
  const receiptPayload: ReceiptPayload = {
    schemaVersion: "1",
    verifierVersion: "live-release-2",
    intentHash: upperHex(intentHash) as ReceiptPayload["intentHash"],
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: "mockVaultDeposit",
    asset: upperHex(manifest.asset) as ReceiptPayload["asset"],
    amountBaseUnits: manifest.amountBaseUnits,
    target: upperHex(manifest.target) as ReceiptPayload["target"],
    spender: upperHex(manifest.spender) as ReceiptPayload["spender"],
    maxAllowanceBaseUnits: manifest.maxAllowanceBaseUnits,
    allowanceUsedBaseUnits: manifest.amountBaseUnits,
    approvalRequired: true,
    approveTxHash: upperHex(approveTxHash) as ReceiptPayload["approveTxHash"],
    depositTxHash: upperHex(depositTxHash) as ReceiptPayload["depositTxHash"],
    depositBlockNumber: 100,
    depositBlockHash: upperHex(depositBlockHash) as ReceiptPayload["depositBlockHash"],
    campaignId: manifest.campaignId,
    missionId: manifest.missionId,
    wallet: upperHex(manifest.wallet) as ReceiptPayload["wallet"],
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
    identity: {
      receiptHash: upperHex(receiptHash),
      intentHash: upperHex(intentHash),
      depositTxHash: upperHex(depositTxHash)
    },
    manifest: {
      payload: mixedCaseManifest(),
      canonicalPayload: canonicalManifestPayload(manifest),
      canonicalPayloadBytesHex: canonicalManifestPayloadBytesHex(manifest),
      signature: upperHex(signed.manifestSignature),
      signingDomain: {
        name: "GIWA Verified Intent Rail",
        version: "1",
        chainId: 91342,
        verifyingContract: upperHex(verifyingContract)
      },
      recoveredSigner: upperHex(signed.recoveredSigner)
    },
    verifierInput: {
      payload: verifierInputPayload,
      canonicalPayload: canonicalVerifierInputPayload(verifierInputPayload),
      canonicalPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(verifierInputPayload),
      verifierInputHash: upperHex(computeVerifierInputHash(verifierInputPayload)),
      verifierVersion: "live-release-2"
    },
    verification: {
      depositBlockNumber: 100,
      depositBlockHash: upperHex(depositBlockHash),
      headBlockNumberAtVerification: 103,
      confirmationDepth: 4,
      standardRpcReceiptStatus: 1
    },
    decodedLogs: mixedCaseDecodedLogs(),
    receipt: {
      payload: receiptPayload,
      canonicalPayload: canonicalReceiptPayload(receiptPayload),
      canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload),
      receiptHash: upperHex(receiptHash),
      schemaVersion: "1",
      verifierVersion: "live-release-2"
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

describe("public verification bundle", () => {
  it("normalizes a deterministic, independently replayable fixture", async () => {
    const bundle = await createPublicVerificationBundleFixture();

    expect(bundle.schemaVersion).toBe("1");
    expect(Object.values(bundle.identity)).toEqual(
      Object.values(bundle.identity).map((value) => value.toLowerCase())
    );
    expect(Object.values(bundle.identity)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^0x[a-f0-9]{64}$/u),
        expect.stringMatching(/^0x[a-f0-9]{64}$/u),
        expect.stringMatching(/^0x[a-f0-9]{64}$/u)
      ])
    );

    expect(bundle.manifest.canonicalPayload).toBe(canonicalManifestPayload(bundle.manifest.payload));
    expect(bundle.manifest.canonicalPayloadBytesHex).toBe(
      canonicalManifestPayloadBytesHex(bundle.manifest.payload)
    );
    expect(computeIntentHash(bundle.manifest.payload)).toBe(bundle.identity.intentHash);

    expect(bundle.verifierInput.canonicalPayload).toBe(
      canonicalVerifierInputPayload(bundle.verifierInput.payload)
    );
    expect(bundle.verifierInput.canonicalPayloadBytesHex).toBe(
      canonicalVerifierInputPayloadBytesHex(bundle.verifierInput.payload)
    );
    expect(computeVerifierInputHash(bundle.verifierInput.payload)).toBe(
      bundle.verifierInput.verifierInputHash
    );

    expect(hashEvidenceJson(bundle.decodedLogs)).toBe(
      bundle.verifierInput.payload.decodedLogSnapshotHash
    );

    expect(bundle.receipt.canonicalPayload).toBe(canonicalReceiptPayload(bundle.receipt.payload));
    expect(bundle.receipt.canonicalPayloadBytesHex).toBe(
      canonicalReceiptPayloadBytesHex(bundle.receipt.payload)
    );
    expect(computeReceiptHash(bundle.receipt.payload)).toBe(bundle.receipt.receiptHash);

    await expect(
      recoverManifestSigner({
        manifest: bundle.manifest.payload,
        verifyingContract: bundle.manifest.signingDomain.verifyingContract as `0x${string}`,
        signature: bundle.manifest.signature as `0x${string}`
      })
    ).resolves.toBe(bundle.manifest.recoveredSigner);

    expect(bundle.receipt.payload).toMatchObject({
      intentHash: bundle.identity.intentHash,
      depositTxHash: bundle.identity.depositTxHash,
      wallet: bundle.manifest.payload.wallet,
      campaignId: bundle.manifest.payload.campaignId,
      missionId: bundle.manifest.payload.missionId,
      asset: bundle.manifest.payload.asset,
      amountBaseUnits: bundle.manifest.payload.amountBaseUnits,
      target: bundle.manifest.payload.target
    });
    expect(bundle.verifierInput.payload).toMatchObject({
      intentHash: bundle.identity.intentHash,
      depositTxHash: bundle.identity.depositTxHash
    });
    expect(bundle.notice).toBe(
      "GIWA Sepolia testnet \u00b7 Mock assets only \u00b7 No settlement or finality claim"
    );
    expect(bundle.notice.toLowerCase()).not.toMatch(/\b(settled|finalized|finality achieved)\b/u);
  });

  it.each([
    ["schema version", (bundle: any) => (bundle.schemaVersion = "2")],
    ["receipt hash", (bundle: any) => (bundle.identity.receiptHash = "0x1234")],
    ["Manifest wallet", (bundle: any) => (bundle.manifest.payload.wallet = "not-an-address")],
    ["signature", (bundle: any) => (bundle.manifest.signature = "0x1234")],
    ["timestamp", (bundle: any) => (bundle.generatedAt = "not-a-timestamp")],
    ["negative integer", (bundle: any) => (bundle.verification.confirmationDepth = -1)],
    [
      "unsafe integer",
      (bundle: any) => (bundle.verification.headBlockNumberAtVerification = Number.MAX_SAFE_INTEGER + 1)
    ],
    ["decoded event", (bundle: any) => (bundle.decodedLogs[0].eventName = "AdminChanged")]
  ])("rejects an invalid %s", async (_label, mutate) => {
    const bundle = clone(await createPublicVerificationBundleFixture());
    mutate(bundle);

    expect(() => normalizePublicVerificationBundle(bundle)).toThrow();
  });

  it("keeps only documented decoded-log fields", async () => {
    const bundle = clone(await createPublicVerificationBundleFixture()) as any;
    bundle.decodedLogs[0].databaseRowKey = "public-noise";
    bundle.decodedLogs[0].args.unrelated = "public-noise";

    const normalized = normalizePublicVerificationBundle(bundle);

    expect(normalized.decodedLogs[0]).not.toHaveProperty("databaseRowKey");
    expect(normalized.decodedLogs[0]?.args).not.toHaveProperty("unrelated");
  });

  it("rejects recursively nested private capability material", async () => {
    const bundle = clone(await createPublicVerificationBundleFixture()) as any;
    bundle.receipt.payload.extra = { presentation: [{ runCapability: "secret-canary" }] };

    expect(() => normalizePublicVerificationBundle(bundle)).toThrow(/forbidden public bundle key/u);
  });

  it("rejects forbidden private material smuggled inside canonical JSON", async () => {
    const bundle = clone(await createPublicVerificationBundleFixture()) as any;
    bundle.manifest.canonicalPayload = '{"runCapability":"secret-canary"}';

    expect(() => normalizePublicVerificationBundle(bundle)).toThrow(
      /manifest\.canonicalPayload/u
    );
  });

  it.each([
    "replay --runCapability secret-canary",
    "replay --authorization bearer-token",
    "replay --token secret-canary",
    "replay --env production",
    "replay --privateKey secret-canary"
  ])("rejects a non-allowlisted replay command: %s", async (command) => {
    const bundle = clone(await createPublicVerificationBundleFixture()) as any;
    bundle.replay.command = command;

    expect(() => normalizePublicVerificationBundle(bundle)).toThrow(
      /replay\.command/u
    );
  });
});

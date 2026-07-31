import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";

import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  canonicalPayloadBytesHex,
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  computeIntentHash,
  computeReceiptHash,
  computeVerifierInputHash,
  hashCanonicalPayload,
  signManifest,
  type ActionManifest,
  type Hex,
  type ReceiptPayload,
  type VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";
import { hashEvidenceJson, type DecodedLogSnapshot } from "../verifier/decodeEvidence.ts";
import type {
  LiveVerifierServiceResult,
  LiveVerifierPublicEvidenceDraft
} from "../verifier/liveVerifierService.ts";
import { createLiveApiHandler } from "./liveApi.ts";
import { hashLiveRunCapability } from "./liveParticipantCapability.ts";
import type { LivePublicConfig } from "./livePublicConfig.ts";
import { createMemoryLiveStore } from "./liveStore.ts";
import type { LiveStore } from "./liveStore.ts";
import { createMemoryVerificationJobQueue } from "./verificationJobQueue.ts";

const TEST_RUN_CAPABILITY = "A".repeat(43);
const TEST_PUBLIC_CONFIG: LivePublicConfig = {
  chainId: 91342,
  chainName: "GIWA Sepolia",
  explorerTxBaseUrl: "https://sepolia-explorer.giwa.io/tx/",
  faucetHelpUrl: "https://docs.giwa.io/faucet",
  minGasBalanceWei: "1000000000000000",
  demoAmountBaseUnits: "1000000000000000000",
  contracts: {
    mockToken: "0x3333333333333333333333333333333333333333",
    mockVault: "0x2222222222222222222222222222222222222222",
    intentRail: "0x4444444444444444444444444444444444444444"
  }
};

const MATCHED_MANIFEST: ActionManifest = {
  manifestVersion: "1",
  chainId: 91342,
  nonce: "release-2-live-api",
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
};
const MATCHED_DEPOSIT_TX_HASH = `0x${"d".repeat(64)}` as Hex;
const MATCHED_DEPOSIT_BLOCK_HASH = `0x${"e".repeat(64)}` as Hex;
const MATCHED_SIGNER = privateKeyToAccount(`0x${"1".repeat(64)}` as Hex);

async function matchedVerifierFixture(
  runId = "run-1"
): Promise<{
  manifestIssue: {
    runId: string;
    nonce: string;
    intentHash: Hex;
    manifestJson: string;
    manifestSignature: Hex;
    expiryUnix: number;
    preview: null;
  };
  result: LiveVerifierServiceResult;
}> {
  const signed = await signManifest({
    manifest: MATCHED_MANIFEST,
    verifyingContract: TEST_PUBLIC_CONFIG.contracts.intentRail as `0x${string}`,
    account: MATCHED_SIGNER
  });
  const intentHash = computeIntentHash(MATCHED_MANIFEST);
  const decodedLogs: DecodedLogSnapshot[] = [
    {
      eventName: "Transfer",
      contractAddress: MATCHED_MANIFEST.asset,
      logIndex: 1,
      sourceTxHash: MATCHED_DEPOSIT_TX_HASH,
      blockNumber: 100,
      blockHash: MATCHED_DEPOSIT_BLOCK_HASH,
      args: {
        from: MATCHED_MANIFEST.wallet,
        to: MATCHED_MANIFEST.target,
        amount: MATCHED_MANIFEST.amountBaseUnits
      }
    },
    {
      eventName: "MockDeposit",
      contractAddress: MATCHED_MANIFEST.target,
      logIndex: 2,
      sourceTxHash: MATCHED_DEPOSIT_TX_HASH,
      blockNumber: 100,
      blockHash: MATCHED_DEPOSIT_BLOCK_HASH,
      args: {
        wallet: MATCHED_MANIFEST.wallet,
        asset: MATCHED_MANIFEST.asset,
        amount: MATCHED_MANIFEST.amountBaseUnits
      }
    }
  ];
  const verifierInputPayload: VerifierInputPayload = {
    schemaVersion: "1",
    chainId: 91342,
    intentHash,
    depositTxHash: MATCHED_DEPOSIT_TX_HASH,
    depositTransactionSnapshotHash: `0x${"5".repeat(64)}`,
    depositReceiptSnapshotHash: `0x${"6".repeat(64)}`,
    decodedLogSnapshotHash: hashEvidenceJson(decodedLogs),
    confirmationDepth: 4,
    headBlockNumberAtVerification: 103,
    verifierVersion: "live-release-2"
  };
  const verifierInputHash = computeVerifierInputHash(verifierInputPayload);
  const receiptPayload: ReceiptPayload = {
    schemaVersion: "1",
    verifierVersion: "live-release-2",
    intentHash,
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: MATCHED_MANIFEST.actionType,
    asset: MATCHED_MANIFEST.asset,
    amountBaseUnits: MATCHED_MANIFEST.amountBaseUnits,
    target: MATCHED_MANIFEST.target,
    spender: MATCHED_MANIFEST.spender,
    maxAllowanceBaseUnits: MATCHED_MANIFEST.maxAllowanceBaseUnits,
    allowanceUsedBaseUnits: MATCHED_MANIFEST.amountBaseUnits,
    approvalRequired: false,
    approveTxHash: null,
    depositTxHash: MATCHED_DEPOSIT_TX_HASH,
    depositBlockNumber: 100,
    depositBlockHash: MATCHED_DEPOSIT_BLOCK_HASH,
    campaignId: MATCHED_MANIFEST.campaignId,
    missionId: MATCHED_MANIFEST.missionId,
    wallet: MATCHED_MANIFEST.wallet,
    verifiedState: "guest",
    testnetDepositAmountDelta: MATCHED_MANIFEST.amountBaseUnits,
    issuedAt: 1790000020,
    issuer: "GIWA Verified Intent Rail MVP",
    safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
  };
  const receiptHash = computeReceiptHash(receiptPayload);
  const receipt = {
    receiptHash,
    intentHash,
    payloadJson: JSON.stringify(receiptPayload),
    canonicalPayload: canonicalReceiptPayload(receiptPayload),
    canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload)
  };
  const publicEvidenceDraft: LiveVerifierPublicEvidenceDraft = {
    manifest: {
      payload: MATCHED_MANIFEST,
      signature: signed.manifestSignature,
      verifyingContract: TEST_PUBLIC_CONFIG.contracts.intentRail,
      recoveredSigner: signed.recoveredSigner
    },
    verifierInput: {
      payload: verifierInputPayload,
      canonicalPayload: canonicalVerifierInputPayload(verifierInputPayload),
      canonicalPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(verifierInputPayload),
      verifierInputHash,
      verifierVersion: "live-release-2"
    },
    verification: {
      depositBlockNumber: 100,
      depositBlockHash: MATCHED_DEPOSIT_BLOCK_HASH,
      headBlockNumberAtVerification: 103,
      confirmationDepth: 4,
      standardRpcReceiptStatus: 1
    },
    decodedLogs,
    receipt: {
      record: receipt,
      payload: receiptPayload,
      schemaVersion: "1",
      verifierVersion: "live-release-2"
    }
  };

  return {
    manifestIssue: {
      runId,
      nonce: MATCHED_MANIFEST.nonce,
      intentHash,
      manifestJson: JSON.stringify(MATCHED_MANIFEST),
      manifestSignature: signed.manifestSignature,
      expiryUnix: MATCHED_MANIFEST.expiryUnix,
      preview: null
    },
    result: {
      decision: "matched",
      failureReason: null,
      verifierInputHash,
      receiptHash,
      decisionTxHash: null,
      standardRpcReceiptStatus: 1,
      depositBlockNumber: 100,
      depositBlockHash: MATCHED_DEPOSIT_BLOCK_HASH,
      confirmationDepth: 4,
      receipt,
      verifierInputRecord: {
        runId,
        verifierInputHash,
        canonicalPayload: publicEvidenceDraft.verifierInput.canonicalPayload,
        canonicalPayloadBytesHex: publicEvidenceDraft.verifierInput.canonicalPayloadBytesHex,
        createdAt: "2026-07-31T00:00:00.000Z"
      },
      publicEvidenceDraft
    }
  };
}

async function createMatchedRunAndEvidence(input: {
  api: ReturnType<typeof createLiveApiHandler>;
  runId?: string;
  requestId?: string;
}): Promise<void> {
  const runId = input.runId ?? "run-1";
  await input.api({
    method: "POST",
    pathname: "/api/runs",
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    body: {
      wallet: MATCHED_MANIFEST.wallet,
      chainId: 91342,
      campaignId: MATCHED_MANIFEST.campaignId,
      missionId: MATCHED_MANIFEST.missionId,
      referralCode: null
    }
  });
  await input.api({
    method: "POST",
    pathname: `/api/runs/${runId}/evidence`,
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    body: { approveTxHash: null, depositTxHash: MATCHED_DEPOSIT_TX_HASH }
  });
}

describe("live API contracts", () => {
  it("creates a run and returns a wallet-bound manifest summary", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async (input) => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: JSON.stringify(input),
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("manifestIssued");
    expect(response.body.intentHash).toBe("0xintent");
  });

  it("keeps the existing run when a repeated create issues an unstored capability", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async (input) => ({
        runId: `run-${input.wallet.slice(-4)}`,
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: JSON.stringify(input),
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    const request = {
      method: "POST" as const,
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    };

    const first = await api(request);
    const second = await api(request);

    expect(first.status).toBe(201);
    expect(first.body.runId).toBe("run-1111");
    expect(second).toEqual({ status: 409, body: { error: "run_capability_conflict" } });
    expect(store.listRuns()).toHaveLength(1);
  });

  it("requires GIWA Sepolia chain id before issuing a live manifest", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("issuer should not run on wrong chain");
      }
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("wrong_chain");
  });

  it("returns signed manifest preview fields from the live issuer", async () => {
    const mockIntentHash = `0x${"a".repeat(64)}` as `0x${string}`;
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: mockIntentHash,
        manifestJson: "{\"wallet\":\"0x1111111111111111111111111111111111111111\"}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: {
          target: "0x2222222222222222222222222222222222222222",
          selector: "0x47e7ef24",
          asset: "0x3333333333333333333333333333333333333333",
          amountBaseUnits: "1000000000000000000",
          spender: "0x2222222222222222222222222222222222222222",
          maxAllowanceBaseUnits: "1000000000000000000",
          expiryUnix: 1790003600,
          intentHash: mockIntentHash
        }
      })
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    expect(response.status).toBe(201);
    expect(response.body.manifestSignature).toBe("0xsig");
    expect(response.body.manifestPreview).toMatchObject({
      target: "0x2222222222222222222222222222222222222222",
      selector: "0x47e7ef24",
      intentHash: mockIntentHash
    });
    expect(response.body.approveAction).toMatchObject({ enabled: true, nextSprint: null });
    expect(response.body.depositAction).toMatchObject({ enabled: true, nextSprint: null });
  });

  it("stores evidence hashes without verifying", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: null, depositTxHash: `0x${"b".repeat(64)}` }
    });

    expect(response.status).toBe(200);
    expect(response.body.depositTxHash).toBe(`0x${"b".repeat(64)}`);
    expect(store.getDecisionByIntentHash("0xintent")).toBeUndefined();
  });

  it("rejects evidence for expired manifests", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 100,
        preview: null
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    const expired = await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: null, depositTxHash: `0x${"b".repeat(64)}` }
    });

    expect(expired.status).toBe(409);
    expect(expired.body.error).toBe("manifest_expired");
  });

  it("rejects evidence for invalidated manifests", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });
    await api({ method: "POST", pathname: "/api/runs/run-1/invalidate", body: { reason: "account_changed" } });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: null, depositTxHash: `0x${"b".repeat(64)}` }
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("manifest_invalidated");
  });

  it("stores approve and deposit tx hashes but keeps receipt locked", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: `0x${"c".repeat(64)}`, depositTxHash: `0x${"d".repeat(64)}` }
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "depositSubmitted",
      receiptReady: false,
      receiptHash: null,
      nextSprint: "Sprint 11"
    });
    expect(store.getRun("run-1")?.status).toBe("depositSubmitted");
  });

  it("rejects duplicate deposit tx hash on a different run", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async (input) => ({
        runId: `run-${input.wallet.slice(-4)}`,
        nonce: "nonce-1",
        intentHash: `0x${input.wallet.slice(-4).padStart(64, "0")}`,
        manifestJson: JSON.stringify(input),
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      })
    });
    const depositTxHash = `0x${"e".repeat(64)}`;

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });
    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x2222222222222222222222222222222222222222",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1111/evidence",
      body: { approveTxHash: null, depositTxHash }
    });

    const duplicate = await api({
      method: "POST",
      pathname: "/api/runs/run-2222/evidence",
      body: { approveTxHash: null, depositTxHash }
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe("deposit_tx_hash_already_used");
  });

  it("blocks chain-bound intent relay until Sprint 11", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    const response = await api({ method: "POST", pathname: "/api/runs/run-1/intent-submit", body: {} });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("chain_action_disabled_until_sprint_11");
    expect(response.body.nextSprint).toBe("Sprint 11");
  });

  it("blocks verifier transaction path until Sprint 11", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: "0xintent",
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790000000
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    const response = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("chain_action_disabled_until_sprint_11");
    expect(response.body.nextSprint).toBe("Sprint 11");
  });

  it("runs local verifier and unlocks a dynamic receipt after a matched deposit", async () => {
    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture();
    const receiptHash = fixture.result.receiptHash!;
    const api = createLiveApiHandler({
      store,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => fixture.result
    });

    await createMatchedRunAndEvidence({ api });

    const response = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "matched",
      receiptReady: true,
      receiptHash,
      decisionTxHash: null,
      verifierInputHash: fixture.result.verifierInputHash,
      standardRpcReceiptStatus: 1,
      depositBlockNumber: 100,
      depositBlockHash: MATCHED_DEPOSIT_BLOCK_HASH,
      confirmationDepth: 4
    });
    expect(store.getRun("run-1")?.status).toBe("matched");
    expect(store.getReceipt(receiptHash)?.payloadJson).toContain("matched");
    expect(store.getPublicEvidenceByReceiptHash(receiptHash)?.bundleJson).toContain(
      '"notice":"GIWA Sepolia testnet · Mock assets only · No settlement or finality claim"'
    );
    const participant = await api({
      method: "GET",
      pathname: "/api/runs/run-1"
    });
    expect(participant.body.receiptReady).toBe(true);
  });

  it("serves one bundle-backed public proof through all three exact hashes with bounded failures", async () => {
    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => fixture.result
    });
    await createMatchedRunAndEvidence({ api });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      body: {}
    });

    const hashes = [
      fixture.result.receiptHash!,
      fixture.manifestIssue.intentHash,
      MATCHED_DEPOSIT_TX_HASH
    ];
    const responses = await Promise.all(
      hashes.map((hash) =>
        api({ method: "GET", pathname: `/api/public/evidence/${hash}` })
      )
    );
    const identities = responses.map((response) => {
      const { queryKind: _queryKind, ...identity } = response.body;
      return identity;
    });
    const malformed = await api({
      method: "GET",
      pathname: "/api/public/evidence/not-a-hash"
    });
    const missing = await api({
      method: "GET",
      pathname: `/api/public/evidence/0x${"9".repeat(64)}`
    });

    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200
    ]);
    expect(identities[0]).toEqual(identities[1]);
    expect(identities[1]).toEqual(identities[2]);
    expect(
      responses.map((response) => response.body.queryKind)
    ).toEqual(["receipt", "intent", "depositTx"]);
    expect(responses[0]!.body.bundle).toEqual(responses[1]!.body.bundle);
    expect(responses[1]!.body.bundle).toEqual(responses[2]!.body.bundle);
    expect(malformed).toEqual({
      status: 404,
      body: { error: "proof_not_found" },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
    expect(missing).toEqual(malformed);
    expect(JSON.stringify([...responses, malformed, missing])).not.toMatch(
      /runCapability|capabilityHash|session|privateTrace|manifestJson/iu
    );
  });

  it("returns stable replayable bundle bytes with fixed cache-safe download headers", async () => {
    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture();
    const receiptHash = fixture.result.receiptHash!;
    const api = createLiveApiHandler({
      store,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => fixture.result
    });
    await createMatchedRunAndEvidence({ api });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      body: {}
    });

    const proof = await api({
      method: "GET",
      pathname: `/api/public/evidence/${fixture.manifestIssue.intentHash}`
    });
    const download = await api({
      method: "GET",
      pathname: `/api/public/evidence/${MATCHED_DEPOSIT_TX_HASH.toUpperCase().replace("0X", "0x")}`,
      downloadRequested: true
    });
    const missing = await api({
      method: "GET",
      pathname: `/api/public/evidence/0x${"9".repeat(64)}`,
      downloadRequested: true
    });
    const injected = await api({
      method: "GET",
      pathname: `/api/public/evidence/${receiptHash}%0d%0aX-Evil:yes`,
      downloadRequested: true
    });

    expect(proof.headers).toEqual({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=300"
    });
    expect(download.headers).toEqual({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
      "content-disposition": `attachment; filename="giwa-receipt-${receiptHash}.json"`
    });
    expect(download.body).toEqual(proof.body.bundle);
    expect(JSON.stringify(download.body)).toBe(
      store.getPublicEvidenceByReceiptHash(receiptHash)?.bundleJson
    );
    expect(missing).toEqual({
      status: 404,
      body: { error: "proof_not_found" },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
    expect(injected).toEqual(missing);
    expect(JSON.stringify([download.headers, missing.headers, injected.headers]))
      .not.toMatch(/X-Evil|%0d|%0a/iu);
  });

  it("serializes ordinary and bounded download responses through the actual HTTP adapter", async () => {
    type TestRequest = { method?: string; url?: string };
    type TestResponse = {
      writeHead(status: number, headers: Record<string, string>): void;
      end(body: string): void;
    };
    type TestServer = {
      listen(port: number, host: string, callback: () => void): void;
      address(): { port: number } | string | null;
      close(callback: (error?: Error) => void): void;
    };
    const httpSpecifier = "node:http";
    const { createServer } = (await import(httpSpecifier)) as {
      createServer(
        handler: (
          request: TestRequest,
          response: TestResponse
        ) => Promise<void>
      ): TestServer;
    };
    const serveScriptPath = resolve(
      process.cwd(),
      "scripts/serve-live.mjs"
    );
    const serveScriptUrl =
      `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      derivePublicEvidenceDownloadRequested?: (url: URL) => boolean;
      writeLiveJsonResponse?: (
        response: TestResponse,
        status: number,
        body: Record<string, unknown>,
        headers?: Record<string, string>
      ) => void;
    };

    expect(typeof adapter.derivePublicEvidenceDownloadRequested).toBe(
      "function"
    );
    expect(typeof adapter.writeLiveJsonResponse).toBe("function");

    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture();
    const receiptHash = fixture.result.receiptHash!;
    const api = createLiveApiHandler({
      store,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => fixture.result
    });
    await createMatchedRunAndEvidence({ api });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      body: {}
    });

    const server = createServer(async (request, response) => {
      const url = new URL(
        request.url ?? "/",
        "http://127.0.0.1"
      );
      const result = await api({
        method: request.method ?? "GET",
        pathname: url.pathname,
        downloadRequested:
          adapter.derivePublicEvidenceDownloadRequested!(url)
      });
      adapter.writeLiveJsonResponse!(
        response,
        result.status,
        result.body,
        result.headers
      );
    });
    await new Promise<void>((resolveListening) => {
      server.listen(0, "127.0.0.1", resolveListening);
    });

    try {
      const address = server.address();
      expect(address).not.toBeNull();
      expect(typeof address).not.toBe("string");
      const port = (address as { port: number }).port;
      const origin =
        `http://127.0.0.1:${port}/api/public/evidence/${receiptHash}`;
      const paths = [
        "",
        "?download=1",
        "?download=yes",
        "?download=1&download=0",
        "?download=1&filename=evil.json"
      ];
      const responses = await Promise.all(
        paths.map(async (suffix) => {
          const response = await fetch(`${origin}${suffix}`);
          return {
            status: response.status,
            contentType: response.headers.get("content-type"),
            cacheControl: response.headers.get("cache-control"),
            disposition: response.headers.get("content-disposition"),
            text: await response.text()
          };
        })
      );
      const missingResponse = await fetch(
        origin.replace(receiptHash, `0x${"9".repeat(64)}`)
      );
      const missing = {
        status: missingResponse.status,
        contentType: missingResponse.headers.get("content-type"),
        cacheControl: missingResponse.headers.get("cache-control"),
        disposition: missingResponse.headers.get("content-disposition"),
        body: await missingResponse.json()
      };
      const [ordinary, download, invalid, duplicate, fixedDespiteFilename] =
        responses;

      expect(ordinary).toMatchObject({
        status: 200,
        contentType: "application/json; charset=utf-8",
        cacheControl: "public, max-age=60, stale-while-revalidate=300",
        disposition: null
      });
      expect(JSON.parse(ordinary!.text).screenKind).toBe(
        "public-matched-proof"
      );
      expect(download).toMatchObject({
        status: 200,
        contentType: "application/json; charset=utf-8",
        cacheControl: "public, max-age=60, stale-while-revalidate=300",
        disposition:
          `attachment; filename="giwa-receipt-${receiptHash}.json"`
      });
      expect(download!.text).toBe(
        store.getPublicEvidenceByReceiptHash(receiptHash)?.bundleJson
      );
      expect(invalid).toMatchObject({
        status: 200,
        contentType: "application/json; charset=utf-8",
        cacheControl: "public, max-age=60, stale-while-revalidate=300",
        disposition: null
      });
      expect(invalid!.text).toBe(ordinary!.text);
      expect(duplicate).toMatchObject({
        status: 200,
        contentType: "application/json; charset=utf-8",
        cacheControl: "public, max-age=60, stale-while-revalidate=300",
        disposition: null
      });
      expect(duplicate!.text).toBe(ordinary!.text);
      expect(fixedDespiteFilename!.text).toBe(download!.text);
      expect(fixedDespiteFilename!.disposition).toBe(
        download!.disposition
      );
      expect(missing).toEqual({
        status: 404,
        contentType: "application/json; charset=utf-8",
        cacheControl: "no-store",
        disposition: null,
        body: { error: "proof_not_found" }
      });
    } finally {
      await new Promise<void>((resolveClosed, rejectClosed) => {
        server.close((error) => {
          if (error === undefined) resolveClosed();
          else rejectClosed(error);
        });
      });
    }
  });

  it("enforces the event raw-byte limit while preserving the general API limit", async () => {
    type BodyRequest = AsyncIterable<Uint8Array> & {
      headers: Record<string, string | undefined>;
      on(event: string, listener: (...args: unknown[]) => void): BodyRequest;
      once(event: string, listener: (...args: unknown[]) => void): BodyRequest;
      removeListener(
        event: string,
        listener: (...args: unknown[]) => void
      ): BodyRequest;
      pause(): BodyRequest;
    };
    const serveScriptPath = resolve(process.cwd(), "scripts/serve-live.mjs");
    const serveScriptUrl =
      `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      readLiveJsonBody?: (
        request: BodyRequest,
        pathname: string
      ) => Promise<unknown>;
      writeLiveRequestBodyError?: (
        request: { destroy(): void },
        response: {
          shouldKeepAlive: boolean;
          writeHead(status: number, headers: Record<string, string>): void;
          end(body: string, callback?: () => void): void;
        },
        status: number,
        body: Record<string, unknown>
      ) => void;
    };
    expect(typeof adapter.readLiveJsonBody).toBe("function");
    expect(typeof adapter.writeLiveRequestBodyError).toBe("function");
    const readLiveJsonBody = adapter.readLiveJsonBody!;
    const streamSpecifier = "node:stream";
    const { Readable } = (await import(streamSpecifier)) as {
      Readable: {
        from(chunks: readonly Uint8Array[]): BodyRequest;
      };
    };
    const request = (
      rawBody: string,
      contentLength?: string,
      extraHeaders: Record<string, string> = {}
    ): BodyRequest =>
      Object.assign(
        Readable.from([new TextEncoder().encode(rawBody)]),
        {
          headers: {
          ...extraHeaders,
          ...(contentLength === undefined
            ? {}
            : { "content-length": contentLength })
          }
        }
      );
    const expectTooLarge = async (
      rawBody: string,
      contentLength?: string
    ): Promise<void> => {
      await expect(
        readLiveJsonBody(
          request(rawBody, contentLength),
          "/api/public/events"
        )
      ).rejects.toMatchObject({
        message: "request_body_too_large",
        statusCode: 413
      });
    };
    const exactBoundary = JSON.stringify({ pad: "x".repeat(502) });
    const overEventBound = `${JSON.stringify({
      eventType: "campaignVisited",
      anonymousSessionId: "9b2f8a0d-a733-4db7-b058-1c6f70ef1f8a",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit"
    })}${" ".repeat(512)}`;

    expect(new TextEncoder().encode(exactBoundary).byteLength).toBe(512);
    await expect(
      readLiveJsonBody(
        request(exactBoundary, "512", {
          "user-agent": "private-canary",
          "x-forwarded-for": "203.0.113.10"
        }),
        "/api/public/events"
      )
    ).resolves.toEqual({ pad: "x".repeat(502) });
    await expectTooLarge(overEventBound);
    await expectTooLarge(overEventBound, "1");
    await expectTooLarge("", "513");

    const ordinaryBody = JSON.stringify({ pad: "x".repeat(65_526) });
    const oversizedOrdinaryBody = JSON.stringify({
      pad: "x".repeat(65_527)
    });
    expect(new TextEncoder().encode(ordinaryBody).byteLength).toBe(64 * 1024);
    await expect(
      readLiveJsonBody(
        request(
          ordinaryBody,
          String(new TextEncoder().encode(ordinaryBody).byteLength)
        ),
        "/api/runs"
      )
    ).resolves.toEqual({ pad: "x".repeat(65_526) });
    await expect(
      readLiveJsonBody(
        request(oversizedOrdinaryBody),
        "/api/runs"
      )
    ).rejects.toMatchObject({
      message: "request_body_too_large",
      statusCode: 413
    });

    type TestRequest = BodyRequest & {
      url?: string;
      destroy(): void;
    };
    type TestResponse = {
      shouldKeepAlive: boolean;
      writeHead(status: number, headers: Record<string, string>): void;
      end(body: string, callback?: () => void): void;
    };
    type TestServer = {
      listen(port: number, host: string, callback: () => void): void;
      address(): { port: number } | string | null;
      close(callback: (error?: Error) => void): void;
    };
    const httpSpecifier = "node:http";
    type ClientResponse = AsyncIterable<Uint8Array> & {
      statusCode?: number;
      headers: Record<string, string | string[] | undefined>;
    };
    type ClientRequest = {
      flushHeaders(): void;
      write(chunk: string): void;
      destroy(): void;
      on(event: "error", listener: (error: Error) => void): ClientRequest;
    };
    const { createServer, request: httpRequest } = (await import(
      httpSpecifier
    )) as {
      createServer(
        handler: (
          request: TestRequest,
          response: TestResponse
        ) => Promise<void>
      ): TestServer;
      request(
        options: {
          host: string;
          port: number;
          path: string;
          method: string;
          headers: Record<string, string>;
        },
        callback: (response: ClientResponse) => void
      ): ClientRequest;
    };
    const server = createServer(async (incoming, response) => {
      try {
        await readLiveJsonBody(
          incoming,
          new URL(incoming.url ?? "/", "http://127.0.0.1").pathname
        );
        response.writeHead(202, { "content-type": "application/json" });
        response.end('{"accepted":true}');
      } catch (error) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error
            ? Number(error.statusCode)
            : 400;
        adapter.writeLiveRequestBodyError!(
          incoming,
          response,
          status,
          { error: "request_body_too_large" }
        );
      }
    });
    await new Promise<void>((resolveListening) => {
      server.listen(0, "127.0.0.1", resolveListening);
    });
    try {
      const address = server.address();
      expect(address).not.toBeNull();
      expect(typeof address).not.toBe("string");
      const port = (address as { port: number }).port;
      const sendSlowOversizedRequest = (
        mode: "declared" | "chunked"
      ): Promise<{
        status: number | undefined;
        connection: string | string[] | undefined;
        body: unknown;
      }> =>
        new Promise((resolveResponse, rejectResponse) => {
          const client = httpRequest(
            {
              host: "127.0.0.1",
              port,
              path: "/api/public/events",
              method: "POST",
              headers: {
                "content-type": "application/json",
                connection: "keep-alive",
                ...(mode === "declared"
                  ? { "content-length": "513" }
                  : { "transfer-encoding": "chunked" })
              }
            },
            async (incomingResponse) => {
              try {
                const responseChunks: Uint8Array[] = [];
                for await (const chunk of incomingResponse) {
                  responseChunks.push(chunk);
                }
                const total = responseChunks.reduce(
                  (sum, chunk) => sum + chunk.byteLength,
                  0
                );
                const bytes = new Uint8Array(total);
                let offset = 0;
                for (const chunk of responseChunks) {
                  bytes.set(chunk, offset);
                  offset += chunk.byteLength;
                }
                resolveResponse({
                  status: incomingResponse.statusCode,
                  connection: incomingResponse.headers.connection,
                  body: JSON.parse(new TextDecoder().decode(bytes))
                });
              } catch (error) {
                rejectResponse(error);
              } finally {
                client.destroy();
              }
            }
          );
          client.on("error", rejectResponse);
          client.flushHeaders();
          if (mode === "chunked") {
            client.write(" ".repeat(513));
          }
        });

      for (const mode of ["declared", "chunked"] as const) {
        await expect(sendSlowOversizedRequest(mode)).resolves.toEqual({
          status: 413,
          connection: "close",
          body: { error: "request_body_too_large" }
        });
      }
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error === undefined) resolveClose();
          else rejectClose(error);
        });
      });
    }
  }, 5_000);

  it("maps public proof storage exceptions to the same bounded not-found response", async () => {
    const privateError =
      "database path and capability private-canary must never escape";
    const baseStore = createMemoryLiveStore();
    const throwingStore: LiveStore = {
      ...baseStore,
      getPublicEvidenceByReceiptHash() {
        throw new Error(privateError);
      }
    };
    const api = createLiveApiHandler({
      store: throwingStore,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });

    const response = await api({
      method: "GET",
      pathname: `/api/public/evidence/0x${"a".repeat(64)}`,
      requestId: "private-request-id-canary"
    });

    expect(response).toEqual({
      status: 404,
      body: { error: "proof_not_found" },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
    expect(JSON.stringify(response)).not.toMatch(
      /requestId|internal_error|capability|private-canary|database path/iu
    );
  });

  it("keeps the public gate closed when verification bundle replay fails", async () => {
    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => fixture.result,
      replayPublicEvidence: async () => ({
        ok: false,
        checks: {
          manifestHash: "passed",
          manifestSignature: "passed",
          verifierInputHash: "passed",
          decodedLogHash: "passed",
          receiptHash: "failed",
          crossReferences: "failed"
        },
        recoveredSigner: MATCHED_SIGNER.address
      })
    });
    await createMatchedRunAndEvidence({ api });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      body: {}
    });

    expect(response).toEqual({ status: 400, body: { error: "internal_error" } });
    expect(store.getRun("run-1")?.status).toBe("verifierChecking");
    expect(store.getVerifierInput(fixture.result.verifierInputHash)).toBeUndefined();
    expect(store.getReceipt(fixture.result.receiptHash!)).toBeUndefined();
    expect(store.getDecisionByIntentHash(fixture.manifestIssue.intentHash)).toBeUndefined();
    expect(
      store.getPublicEvidenceByReceiptHash(fixture.result.receiptHash!)
    ).toBeUndefined();
  });

  it("does not claim immediate receipt readiness when published evidence is not readable", async () => {
    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture();
    const unreadableEvidenceStore: LiveStore = {
      ...store,
      getPublicEvidenceByReceiptHash() {
        return undefined;
      },
      getPublicEvidenceByIntentHash() {
        return undefined;
      },
      getPublicEvidenceByDepositTxHash() {
        return undefined;
      }
    };
    const api = createLiveApiHandler({
      store: unreadableEvidenceStore,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => fixture.result
    });
    await createMatchedRunAndEvidence({ api });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      body: {}
    });

    expect(response.status).toBe(200);
    expect(response.body.receiptReady).toBe(false);
    expect(
      store.getPublicEvidenceByReceiptHash(fixture.result.receiptHash!)
    ).toBeDefined();
  });

  it("does not publish a partial matched outcome when evidence persistence fails", async () => {
    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture();
    const failingStore: LiveStore = {
      ...store,
      publishMatchedEvidence() {
        throw new Error("evidence_persistence_canary");
      }
    };
    const api = createLiveApiHandler({
      store: failingStore,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => fixture.result
    });
    await createMatchedRunAndEvidence({ api });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      body: {}
    });

    expect(response).toEqual({ status: 400, body: { error: "internal_error" } });
    expect(store.getRun("run-1")?.status).toBe("verifierChecking");
    expect(store.getVerifierInput(fixture.result.verifierInputHash)).toBeUndefined();
    expect(store.getReceipt(fixture.result.receiptHash!)).toBeUndefined();
    expect(store.getDecisionByIntentHash(fixture.manifestIssue.intentHash)).toBeUndefined();
    expect(
      store.getPublicEvidenceByReceiptHash(fixture.result.receiptHash!)
    ).toBeUndefined();
  });

  it("retries idempotently after a committed matched publication loses its response", async () => {
    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture();
    let interruptAfterCommit = true;
    let verifierCalls = 0;
    const interruptedStore: LiveStore = {
      ...store,
      publishMatchedEvidence(input) {
        const published = store.publishMatchedEvidence(input);
        if (interruptAfterCommit) {
          interruptAfterCommit = false;
          throw new Error("response_interrupted_canary");
        }
        return published;
      }
    };
    const api = createLiveApiHandler({
      store: interruptedStore,
      now: () => "2026-07-31T00:00:00.000Z",
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => {
        verifierCalls += 1;
        return fixture.result;
      }
    });
    await createMatchedRunAndEvidence({ api });

    const first = await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      body: {}
    });
    const retry = await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      body: {}
    });

    expect(first).toEqual({ status: 400, body: { error: "internal_error" } });
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({
      status: "matched",
      receiptReady: true,
      receiptHash: fixture.result.receiptHash
    });
    expect(verifierCalls).toBe(1);
    expect(
      store.getPublicEvidenceByReceiptHash(fixture.result.receiptHash!)?.bundleJson
    ).toBeDefined();
  });

  it("serializes no run capability, session, request, private trace, DB, env, secret, or injected canary", async () => {
    const runIdCanary = "run-private-canary";
    const capabilityCanary = "capability-private-canary";
    const sessionCanary = "session-private-canary";
    const requestCanary = "request-private-canary";
    const privateTraceCanary = "trace-private-canary";
    const environmentCanary = "environment-private-canary";
    const secretCanary = "secret-private-canary";
    const databaseCanary = "database-private-canary";
    const store = createMemoryLiveStore();
    const fixture = await matchedVerifierFixture(runIdCanary);
    const verifierResultWithPrivateFields = {
      ...fixture.result,
      privateTrace: privateTraceCanary,
      environmentValue: environmentCanary,
      secretValue: secretCanary,
      databaseValue: databaseCanary
    };
    const api = createLiveApiHandler({
      store,
      now: () => "2026-07-31T00:00:00.000Z",
      issueRunCapability: () => ({
        value: capabilityCanary,
        hash: hashLiveRunCapability(capabilityCanary)
      }),
      issueManifest: async () => fixture.manifestIssue,
      verifyRun: async () => verifierResultWithPrivateFields
    });
    await createMatchedRunAndEvidence({
      api,
      runId: runIdCanary,
      requestId: requestCanary
    });

    const response = await api({
      method: "POST",
      pathname: `/api/runs/${runIdCanary}/verify`,
      body: {},
      requestId: requestCanary,
      auth: {
        actorId: sessionCanary,
        tenantId: databaseCanary,
        scopes: ["verify:write"],
        mode: "credential"
      }
    });
    const bundleJson = store.getPublicEvidenceByReceiptHash(
      fixture.result.receiptHash!
    )?.bundleJson;

    expect(response.status).toBe(200);
    expect(bundleJson).toBeDefined();
    for (const canary of [
      runIdCanary,
      capabilityCanary,
      sessionCanary,
      requestCanary,
      privateTraceCanary,
      environmentCanary,
      secretCanary,
      databaseCanary
    ]) {
      expect(bundleJson).not.toContain(canary);
    }
    expect(bundleJson).not.toMatch(
      /capabilityHash|runId|session|credential|requestId|privateTrace|database|environment|secret/u
    );
  });

  it.each(["mismatched", "failed"] as const)(
    "stores a %s verifier decision without serializing or unlocking public evidence",
    async (terminalDecision) => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      }),
      verifyRun: async () => ({
        decision: terminalDecision,
        failureReason: "WALLET_MISMATCH",
        verifierInputHash: `0x${"9".repeat(64)}`,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: 1,
        depositBlockNumber: 10,
        depositBlockHash: `0x${"e".repeat(64)}`,
        confirmationDepth: 4
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: null, depositTxHash: `0x${"d".repeat(64)}` }
    });

    const response = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: terminalDecision,
      receiptReady: false,
      receiptHash: null,
      failureReason: "WALLET_MISMATCH",
      failureCode: "MISSING_REQUIRED_LOG"
    });
    expect(store.getDecisionByIntentHash(`0x${"a".repeat(64)}`)?.decisionTxHash).toBeNull();
    expect(
      store.getPublicEvidenceByIntentHash(`0x${"a".repeat(64)}`)
    ).toBeUndefined();
    }
  );

  it("does not expose raw verifier failure details in API responses or stored decisions", async () => {
    const store = createMemoryLiveStore();
    const rawFailureCanary = "provider rejected request with client_secret=CANARY-DO-NOT-LEAK";
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      }),
      verifyRun: async () => ({
        decision: "mismatched",
        failureReason: rawFailureCanary,
        verifierInputHash: `0x${"9".repeat(64)}`,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: 1,
        depositBlockNumber: 10,
        depositBlockHash: `0x${"e".repeat(64)}`,
        confirmationDepth: 4
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: null, depositTxHash: `0x${"d".repeat(64)}` }
    });

    const verifyResponse = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });
    const runResponse = await api({ method: "GET", pathname: "/api/runs/run-1" });
    const storedDecision = store.getDecisionByIntentHash(`0x${"a".repeat(64)}`);

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.failureCode).toBe("MISSING_REQUIRED_LOG");
    expect(verifyResponse.body.failureReason).toBe("MISSING_REQUIRED_LOG");
    expect(storedDecision?.failureReason).toBe("MISSING_REQUIRED_LOG");
    expect(JSON.stringify(verifyResponse.body)).not.toContain(rawFailureCanary);
    expect(JSON.stringify(runResponse.body)).not.toContain(rawFailureCanary);
    expect(JSON.stringify(storedDecision)).not.toContain(rawFailureCanary);
  });

  it("redacts legacy stored verifier failure details on read and existing-decision paths", async () => {
    const store = createMemoryLiveStore();
    const rawFailureCanary = "worker wrote raw provider error with client_secret=CANARY-DO-NOT-LEAK";
    const intentHash = `0x${"a".repeat(64)}`;
    store.createRun({
      runId: "run-1",
      idempotencyKey: "wallet:campaign:mission:",
      wallet: "0x1111111111111111111111111111111111111111",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-1",
      intentHash,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      status: "depositSubmitted",
      expiryUnix: 1790003600,
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: "2026-06-17T00:02:00.000Z"
    });
    store.saveSubmittedTx({
      runId: "run-1",
      approveTxHash: null,
      depositTxHash: `0x${"d".repeat(64)}`,
      submittedAt: "2026-06-17T00:02:00.000Z"
    });
    store.saveDecision({
      intentHash,
      depositTxHash: `0x${"d".repeat(64)}`,
      decision: "mismatched",
      failureReason: rawFailureCanary,
      verifierInputHash: `0x${"9".repeat(64)}`,
      receiptHash: null,
      decisionTxHash: null,
      issuedAt: 1790000000
    });
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      },
      verifyRun: async () => {
        throw new Error("existing decision should be returned before verifier execution");
      }
    });

    const runResponse = await api({ method: "GET", pathname: "/api/runs/run-1" });
    const verifyResponse = await api({ method: "POST", pathname: "/api/runs/run-1/verify", body: {} });

    expect(runResponse.status).toBe(200);
    expect(verifyResponse.status).toBe(200);
    expect(runResponse.body.failureReason).toBe("MISSING_REQUIRED_LOG");
    expect(verifyResponse.body.failureReason).toBe("MISSING_REQUIRED_LOG");
    expect(JSON.stringify(runResponse.body)).not.toContain(rawFailureCanary);
    expect(JSON.stringify(verifyResponse.body)).not.toContain(rawFailureCanary);
  });

  it("returns not found for unknown receipt hash", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not used");
      }
    });

    const response = await api({ method: "GET", pathname: "/api/receipts/receipt-1" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("receipt_not_found");
  });

  it("does not return a live receipt when no matched decision exists", async () => {
    const store = createMemoryLiveStore();
    const now = "2026-06-19T00:00:00.000Z";
    const run = store.createRun({
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
      status: "depositSubmitted",
      expiryUnix: 1790000000,
      createdAt: now,
      updatedAt: now
    });
    store.saveReceipt({
      receiptHash: `0x${"e".repeat(64)}`,
      intentHash: run.intentHash,
      payloadJson: JSON.stringify({ status: "matched" }),
      canonicalPayload: "{\"status\":\"matched\"}",
      canonicalPayloadBytesHex: "0x7b7d"
    });

    const api = createLiveApiHandler({
      store,
      now: () => now,
      issueManifest: async () => {
        throw new Error("not used");
      }
    });

    const response = await api({ method: "GET", pathname: `/api/receipts/0x${"e".repeat(64)}` });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("receipt_not_found");
    expect(response.body).not.toHaveProperty("gateReason");
  });

  it("keeps a dynamic receipt closed when its public bundle cannot normalize or replay", async () => {
    const store = createMemoryLiveStore();
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
      approvalRequired: false,
      approveTxHash: null,
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
    const verifierInputHash = computeVerifierInputHash(verifierInputPayload);
    const receiptHash = computeReceiptHash(receiptPayload);
    store.createRun({
      runId: "run-1",
      capabilityHash: hashLiveRunCapability(TEST_RUN_CAPABILITY),
      idempotencyKey: "wallet:campaign:mission:",
      wallet: "0x1111111111111111111111111111111111111111",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-1",
      intentHash,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      status: "matched",
      expiryUnix: 1790003600,
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: "2026-06-17T00:02:00.000Z"
    });
    store.saveSubmittedTx({
      runId: "run-1",
      approveTxHash: null,
      depositTxHash,
      submittedAt: "2026-06-17T00:01:00.000Z"
    });
    store.saveDecision({
      intentHash,
      depositTxHash,
      decision: "matched",
      failureReason: null,
      verifierInputHash,
      receiptHash,
      decisionTxHash: null,
      issuedAt: 1790000020,
      standardRpcReceiptStatus: 1,
      depositBlockNumber: 10,
      depositBlockHash: `0x${"e".repeat(64)}`,
      confirmationDepth: 4
    });
    store.saveVerifierInput({
      runId: "run-1",
      verifierInputHash,
      canonicalPayload: canonicalVerifierInputPayload(verifierInputPayload),
      canonicalPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(verifierInputPayload),
      createdAt: "2026-06-17T00:02:00.000Z"
    });
    store.saveReceipt({
      receiptHash,
      intentHash,
      payloadJson: JSON.stringify(receiptPayload),
      canonicalPayload: canonicalReceiptPayload(receiptPayload),
      canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload)
    });
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });
    const legacyRunResponse = await api({
      method: "GET",
      pathname: "/api/runs/run-1",
      runCapability: TEST_RUN_CAPABILITY
    });
    const legacyReceiptResponse = await api({
      method: "GET",
      pathname: `/api/receipts/${receiptHash}`
    });

    expect(legacyRunResponse.status).toBe(200);
    expect(legacyRunResponse.body.receiptReady).toBe(false);
    expect(legacyReceiptResponse).toEqual({
      status: 404,
      body: { error: "receipt_not_found" }
    });

    store.publishMatchedEvidence({
      runId: "run-1",
      updatedAt: "2026-06-17T00:02:00.000Z",
      verifierInput: store.getVerifierInput(verifierInputHash)!,
      receipt: store.getReceipt(receiptHash)!,
      decision: store.getDecisionByIntentHash(intentHash)!,
      publicEvidence: {
        receiptHash,
        intentHash,
        depositTxHash,
        bundleJson: '{"schemaVersion":"1","source":"live"}',
        createdAt: "2026-06-17T00:02:00.000Z"
      }
    });

    const response = await api({ method: "GET", pathname: `/api/receipts/${receiptHash}` });
    const publishedRunResponse = await api({
      method: "GET",
      pathname: "/api/runs/run-1",
      runCapability: TEST_RUN_CAPABILITY
    });
    const receiptProof = await api({
      method: "GET",
      pathname: `/api/public/evidence/${receiptHash}`
    });
    const intentProof = await api({
      method: "GET",
      pathname: `/api/public/evidence/${intentHash}`
    });
    const depositProof = await api({
      method: "GET",
      pathname: `/api/public/evidence/${depositTxHash}`
    });

    expect(response).toEqual({
      status: 404,
      body: { error: "receipt_not_found" }
    });
    expect(JSON.stringify(response.body)).not.toContain("capabilityHash");
    expect(JSON.stringify(response.body)).not.toContain(hashLiveRunCapability(TEST_RUN_CAPABILITY));
    expect(publishedRunResponse.body.receiptReady).toBe(true);
    expect(receiptProof).toEqual({
      status: 404,
      body: { error: "proof_not_found" },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
    expect(intentProof).toEqual(receiptProof);
    expect(depositProof).toEqual(receiptProof);
  });

  it("keeps matched terminal rows immutable while a legacy receipt without evidence stays closed", async () => {
    const store = createMemoryLiveStore();
    const intentHash = `0x${"a".repeat(64)}`;
    const originalDepositTxHash = `0x${"d".repeat(64)}`;
    const verifierCanonicalPayload = "{\"kind\":\"verifier-input\"}";
    const verifierInputHash = hashCanonicalPayload(verifierCanonicalPayload);
    const receiptCanonicalPayload = "{\"status\":\"matched\"}";
    const receiptHash = hashCanonicalPayload(receiptCanonicalPayload);
    store.createRun({
      runId: "run-terminal",
      tenantId: "local",
      capabilityHash: hashLiveRunCapability(TEST_RUN_CAPABILITY),
      idempotencyKey: "local:run-terminal",
      wallet: "0x1111111111111111111111111111111111111111",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-terminal",
      intentHash,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      status: "matched",
      expiryUnix: 1790003600,
      createdAt: "2026-06-19T00:00:00.000Z",
      updatedAt: "2026-06-19T00:02:00.000Z"
    });
    store.saveSubmittedTx({
      runId: "run-terminal",
      approveTxHash: null,
      depositTxHash: originalDepositTxHash,
      submittedAt: "2026-06-19T00:01:00.000Z"
    });
    store.saveDecision({
      intentHash,
      depositTxHash: originalDepositTxHash,
      decision: "matched",
      failureReason: null,
      verifierInputHash,
      receiptHash,
      decisionTxHash: null,
      issuedAt: 1790000020,
      standardRpcReceiptStatus: 1,
      depositBlockNumber: 10,
      depositBlockHash: `0x${"e".repeat(64)}`,
      confirmationDepth: 4
    });
    store.saveVerifierInput({
      runId: "run-terminal",
      verifierInputHash,
      canonicalPayload: verifierCanonicalPayload,
      canonicalPayloadBytesHex: canonicalPayloadBytesHex(verifierCanonicalPayload),
      createdAt: "2026-06-19T00:02:00.000Z"
    });
    store.saveReceipt({
      receiptHash,
      intentHash,
      payloadJson: receiptCanonicalPayload,
      canonicalPayload: receiptCanonicalPayload,
      canonicalPayloadBytesHex: canonicalPayloadBytesHex(receiptCanonicalPayload)
    });
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      now: () => "2026-06-19T00:03:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });
    const beforeSubmitted = store.getSubmittedTx("run-terminal");
    const beforeDecision = store.getDecisionByIntentHash(intentHash);
    const beforeReceipt = store.getReceipt(receiptHash);
    const publicReceiptBefore = await api({ method: "GET", pathname: `/api/receipts/${receiptHash}` });

    const wrongCapabilityEvidence = await api({
      method: "POST",
      pathname: "/api/runs/run-terminal/evidence",
      runCapability: "B".repeat(43),
      body: { approveTxHash: null, depositTxHash: `0x${"c".repeat(64)}` }
    });
    const wrongCapabilityInvalidate = await api({
      method: "POST",
      pathname: "/api/runs/run-terminal/invalidate",
      runCapability: "B".repeat(43),
      body: { reason: "account_changed" }
    });
    const evidence = await api({
      method: "POST",
      pathname: "/api/runs/run-terminal/evidence",
      runCapability: TEST_RUN_CAPABILITY,
      body: { approveTxHash: null, depositTxHash: `0x${"c".repeat(64)}` }
    });
    const invalidate = await api({
      method: "POST",
      pathname: "/api/runs/run-terminal/invalidate",
      runCapability: TEST_RUN_CAPABILITY,
      body: { reason: "account_changed" }
    });
    const publicReceiptAfter = await api({ method: "GET", pathname: `/api/receipts/${receiptHash}` });

    expect(publicReceiptBefore.status).toBe(404);
    expect(wrongCapabilityEvidence).toEqual({ status: 404, body: { error: "run_not_found" } });
    expect(wrongCapabilityInvalidate).toEqual({ status: 404, body: { error: "run_not_found" } });
    expect(evidence).toEqual({ status: 409, body: { error: "run_terminal" } });
    expect(invalidate).toEqual({ status: 409, body: { error: "run_terminal" } });
    expect(store.getRun("run-terminal")?.status).toBe("matched");
    expect(store.getSubmittedTx("run-terminal")).toEqual(beforeSubmitted);
    expect(store.getDecisionByIntentHash(intentHash)).toEqual(beforeDecision);
    expect(store.getReceipt(receiptHash)).toEqual(beforeReceipt);
    expect(publicReceiptAfter.status).toBe(404);
  });

  it.each(["mismatched", "failed"] as const)(
    "rejects evidence and invalidation for %s terminal run status without a persisted decision",
    async (status) => {
      const store = createMemoryLiveStore();
      store.createRun({
        runId: `run-${status}`,
        capabilityHash: hashLiveRunCapability(TEST_RUN_CAPABILITY),
        idempotencyKey: `local:run-${status}`,
        wallet: "0x1111111111111111111111111111111111111111",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null,
        nonce: `nonce-${status}`,
        intentHash: status === "mismatched" ? `0x${"a".repeat(64)}` : `0x${"b".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        status,
        expiryUnix: 1790003600,
        createdAt: "2026-06-19T00:00:00.000Z",
        updatedAt: "2026-06-19T00:02:00.000Z"
      });
      const api = createLiveApiHandler({
        store,
        mode: "staging-testnet",
        now: () => "2026-06-19T00:03:00.000Z",
        issueManifest: async () => {
          throw new Error("not reached");
        }
      });

      const evidence = await api({
        method: "POST",
        pathname: `/api/runs/run-${status}/evidence`,
        runCapability: TEST_RUN_CAPABILITY,
        body: { approveTxHash: null, depositTxHash: `0x${"c".repeat(64)}` }
      });
      const invalidate = await api({
        method: "POST",
        pathname: `/api/runs/run-${status}/invalidate`,
        runCapability: TEST_RUN_CAPABILITY,
        body: { reason: "account_changed" }
      });

      expect(evidence).toEqual({ status: 409, body: { error: "run_terminal" } });
      expect(invalidate).toEqual({ status: 409, body: { error: "run_terminal" } });
      expect(store.getRun(`run-${status}`)?.status).toBe(status);
      expect(store.getSubmittedTx(`run-${status}`)).toBeUndefined();
    }
  );

  it("rejects terminal mutations when a persisted decision exists before the run status catches up", async () => {
    const store = createMemoryLiveStore();
    const intentHash = `0x${"a".repeat(64)}`;
    store.createRun({
      runId: "run-status-lag",
      capabilityHash: hashLiveRunCapability(TEST_RUN_CAPABILITY),
      idempotencyKey: "local:run-status-lag",
      wallet: "0x1111111111111111111111111111111111111111",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-status-lag",
      intentHash,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      status: "depositSubmitted",
      expiryUnix: 1790003600,
      createdAt: "2026-06-19T00:00:00.000Z",
      updatedAt: "2026-06-19T00:02:00.000Z"
    });
    store.saveDecision({
      intentHash,
      depositTxHash: `0x${"d".repeat(64)}`,
      decision: "mismatched",
      failureReason: "MISSING_REQUIRED_LOG",
      verifierInputHash: `0x${"9".repeat(64)}`,
      receiptHash: null,
      decisionTxHash: null,
      issuedAt: 1790000020
    });
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      now: () => "2026-06-19T00:03:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });

    const evidence = await api({
      method: "POST",
      pathname: "/api/runs/run-status-lag/evidence",
      runCapability: TEST_RUN_CAPABILITY,
      body: { approveTxHash: null, depositTxHash: `0x${"c".repeat(64)}` }
    });
    const invalidate = await api({
      method: "POST",
      pathname: "/api/runs/run-status-lag/invalidate",
      runCapability: TEST_RUN_CAPABILITY,
      body: { reason: "account_changed" }
    });

    expect(evidence).toEqual({ status: 409, body: { error: "run_terminal" } });
    expect(invalidate).toEqual({ status: 409, body: { error: "run_terminal" } });
    expect(store.getRun("run-status-lag")?.status).toBe("depositSubmitted");
    expect(store.getSubmittedTx("run-status-lag")).toBeUndefined();
  });

  it("keeps receipt route locked after Sprint 10 deposit evidence submission", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      body: { approveTxHash: `0x${"c".repeat(64)}`, depositTxHash: `0x${"d".repeat(64)}` }
    });

    const receipt = await api({ method: "GET", pathname: `/api/receipts/0x${"f".repeat(64)}` });

    expect(store.getRun("run-1")?.status).toBe("depositSubmitted");
    expect(receipt.status).toBe(404);
    expect(receipt.body.error).toBe("receipt_not_found");
  });

  it("marks a run manifest invalidated without sending a chain transaction", async () => {
    const store = createMemoryLiveStore();
    const mockIntentHash = `0x${"a".repeat(64)}` as `0x${string}`;
    const api = createLiveApiHandler({
      store,
      now: () => "2026-06-17T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: mockIntentHash,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      })
    });

    await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/invalidate",
      body: { reason: "account_changed" }
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("manifestInvalidated");
    expect(store.getRun("run-1")?.status).toBe("manifestInvalidated");
  });

  it("requires auth context for partner runs in hosted mode", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      },
      mode: "staging-testnet"
    });

    const response = await api({
      method: "GET",
      pathname: "/api/partner/runs",
      body: undefined,
      auth: null,
      requestId: "req_1"
    });
    const wrongScope = await api({
      method: "GET",
      pathname: "/api/partner/runs",
      auth: {
        actorId: "cred-runs",
        tenantId: "tenant-alpha",
        scopes: ["runs:read"],
        mode: "credential"
      },
      requestId: "req_2"
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "unauthorized", requestId: "req_1" });
    expect(wrongScope).toEqual({ status: 403, body: { error: "forbidden", requestId: "req_2" } });
  });

  it("opens hosted run creation without partner credentials and returns one capability only in the creation response", async () => {
    const store = createMemoryLiveStore();
    let issuedInput: Record<string, unknown> | undefined;
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      publicConfig: TEST_PUBLIC_CONFIG,
      issueRunCapability: () => ({
        value: TEST_RUN_CAPABILITY,
        hash: hashLiveRunCapability(TEST_RUN_CAPABILITY)
      }),
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async (input) => {
        issuedInput = input;
        return {
          runId: "run-public",
          nonce: "nonce-public",
          intentHash: `0x${"a".repeat(64)}`,
          manifestJson: JSON.stringify(input),
          manifestSignature: "0xsig",
          expiryUnix: 1790003600,
          preview: null
        };
      }
    });

    const created = await api({
      method: "POST",
      pathname: "/api/runs",
      auth: null,
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });

    expect(created.status).toBe(201);
    expect(created.body.runCapability).toBe(TEST_RUN_CAPABILITY);
    expect(Object.keys(created.body).filter((key) => key === "runCapability")).toHaveLength(1);
    expect(created.body).not.toHaveProperty("capabilityHash");
    expect(issuedInput).toMatchObject({
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit"
    });
    expect(store.getRun("run-public")?.capabilityHash).toBe(hashLiveRunCapability(TEST_RUN_CAPABILITY));

    const projected = await api({
      method: "GET",
      pathname: "/api/runs/run-public",
      runCapability: TEST_RUN_CAPABILITY
    });
    expect(projected.status).toBe(200);
    expect(projected.body).not.toHaveProperty("runCapability");
    expect(projected.body).not.toHaveProperty("capabilityHash");
    expect(JSON.stringify(projected.body)).not.toContain(TEST_RUN_CAPABILITY);
    expect(JSON.stringify(projected.body)).not.toContain(hashLiveRunCapability(TEST_RUN_CAPABILITY));
  });

  it("rejects a duplicate issued runId when the newly issued capability was not stored", async () => {
    const store = createMemoryLiveStore();
    const capabilities = [TEST_RUN_CAPABILITY, "B".repeat(43)];
    let capabilityIndex = 0;
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      publicConfig: TEST_PUBLIC_CONFIG,
      issueRunCapability: () => {
        const value = capabilities[capabilityIndex++];
        if (value === undefined) throw new Error("unexpected capability request");
        return { value, hash: hashLiveRunCapability(value) };
      },
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-duplicate",
        nonce: "nonce-duplicate",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      })
    });
    const request = {
      method: "POST" as const,
      pathname: "/api/runs",
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        referralCode: null
      }
    };

    const first = await api(request);
    const firstRead = await api({
      method: "GET",
      pathname: "/api/runs/run-duplicate",
      runCapability: TEST_RUN_CAPABILITY
    });
    const second = await api(request);
    const firstReadAfterConflict = await api({
      method: "GET",
      pathname: "/api/runs/run-duplicate",
      runCapability: TEST_RUN_CAPABILITY
    });
    const secondCapabilityRead = await api({
      method: "GET",
      pathname: "/api/runs/run-duplicate",
      runCapability: "B".repeat(43)
    });
    const serializedConflict = JSON.stringify(second.body);

    expect(first.status).toBe(201);
    expect(first.body.runCapability).toBe(TEST_RUN_CAPABILITY);
    expect(firstRead.status).toBe(200);
    expect(second).toEqual({ status: 409, body: { error: "run_capability_conflict" } });
    expect(serializedConflict).not.toContain("B".repeat(43));
    expect(serializedConflict).not.toContain(hashLiveRunCapability(TEST_RUN_CAPABILITY));
    expect(serializedConflict).not.toContain(hashLiveRunCapability("B".repeat(43)));
    expect(firstReadAfterConflict.status).toBe(200);
    expect(secondCapabilityRead).toEqual({ status: 404, body: { error: "run_not_found" } });
    expect(store.getRun("run-duplicate")?.capabilityHash).toBe(hashLiveRunCapability(TEST_RUN_CAPABILITY));
  });

  it("rejects fixed-policy overrides and accepts only equal legacy campaign and mission values", async () => {
    const rejectedBodies = [
      { campaignId: "other-campaign" },
      { missionId: "other-mission" },
      { campaign: "gasok-demo" },
      { mission: "first-mock-vault-deposit" },
      { tenant: "tenant-alpha" },
      { tenantId: "tenant-alpha" },
      { target: "0x2222222222222222222222222222222222222222" },
      { asset: "0x3333333333333333333333333333333333333333" },
      { spender: "0x2222222222222222222222222222222222222222" },
      { unexpected: true }
    ];

    for (const override of rejectedBodies) {
      const api = createLiveApiHandler({
        store: createMemoryLiveStore(),
        mode: "staging-testnet",
        publicConfig: TEST_PUBLIC_CONFIG,
        issueRunCapability: () => ({
          value: TEST_RUN_CAPABILITY,
          hash: hashLiveRunCapability(TEST_RUN_CAPABILITY)
        }),
        now: () => "2026-06-19T00:00:00.000Z",
        issueManifest: async () => {
          throw new Error("issuer must not run for a fixed policy override");
        }
      });
      const response = await api({
        method: "POST",
        pathname: "/api/runs",
        body: {
          wallet: "0x1111111111111111111111111111111111111111",
          chainId: 91342,
          referralCode: null,
          ...override
        }
      });

      expect(response.status, JSON.stringify(override)).toBe(400);
      expect(response.body.error, JSON.stringify(override)).toBe("fixed_policy_override_not_allowed");
    }
  });

  it("requires the matching run capability for hosted evidence, verification, invalidation, and reads", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      publicConfig: TEST_PUBLIC_CONFIG,
      issueRunCapability: () => ({
        value: TEST_RUN_CAPABILITY,
        hash: hashLiveRunCapability(TEST_RUN_CAPABILITY)
      }),
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-capability",
        nonce: "nonce-capability",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      }),
      verifyRun: async () => ({
        decision: "mismatched",
        failureReason: "UNDER_CONFIRMED",
        verifierInputHash: `0x${"9".repeat(64)}`,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: 1,
        depositBlockNumber: 10,
        depositBlockHash: `0x${"e".repeat(64)}`,
        confirmationDepth: 2
      })
    });
    await api({
      method: "POST",
      pathname: "/api/runs",
      body: { wallet: "0x1111111111111111111111111111111111111111", chainId: 91342, referralCode: null }
    });
    store.createRun({
      runId: "run-invalidate",
      tenantId: "local",
      capabilityHash: hashLiveRunCapability(TEST_RUN_CAPABILITY),
      idempotencyKey: "local:run-invalidate",
      wallet: "0x1111111111111111111111111111111111111111",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-invalidate",
      intentHash: `0x${"b".repeat(64)}`,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      status: "manifestIssued",
      expiryUnix: 1790003600,
      createdAt: "2026-06-19T00:00:00.000Z",
      updatedAt: "2026-06-19T00:00:00.000Z"
    });

    const missing = await api({ method: "GET", pathname: "/api/runs/run-capability" });
    const incorrect = await api({
      method: "GET",
      pathname: "/api/runs/run-capability",
      runCapability: "B".repeat(43)
    });
    const apiWithoutVerifier = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      publicConfig: TEST_PUBLIC_CONFIG,
      issueRunCapability: () => ({
        value: TEST_RUN_CAPABILITY,
        hash: hashLiveRunCapability(TEST_RUN_CAPABILITY)
      }),
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });
    const incorrectDisabledVerify = await apiWithoutVerifier({
      method: "POST",
      pathname: "/api/runs/run-capability/verify",
      runCapability: "B".repeat(43),
      body: {}
    });
    const incorrectIntentRelay = await apiWithoutVerifier({
      method: "POST",
      pathname: "/api/runs/run-capability/intent-submit",
      runCapability: "B".repeat(43),
      body: {}
    });
    const evidence = await api({
      method: "POST",
      pathname: "/api/runs/run-capability/evidence",
      runCapability: TEST_RUN_CAPABILITY,
      body: { approveTxHash: null, depositTxHash: `0x${"d".repeat(64)}` }
    });
    const verified = await api({
      method: "POST",
      pathname: "/api/runs/run-capability/verify",
      runCapability: TEST_RUN_CAPABILITY,
      body: {}
    });
    const invalidated = await api({
      method: "POST",
      pathname: "/api/runs/run-invalidate/invalidate",
      runCapability: TEST_RUN_CAPABILITY,
      body: { reason: "account_changed" }
    });

    expect(missing).toEqual({ status: 401, body: { error: "run_capability_required" } });
    expect(incorrect).toEqual({ status: 404, body: { error: "run_not_found" } });
    expect(incorrectDisabledVerify).toEqual({ status: 404, body: { error: "run_not_found" } });
    expect(incorrectIntentRelay).toEqual({ status: 404, body: { error: "run_not_found" } });
    expect(evidence.status).toBe(200);
    expect(verified.status).toBe(200);
    expect(invalidated.status).toBe(200);
    expect(store.getDecisionByIntentHash(`0x${"a".repeat(64)}`)).toMatchObject({
      standardRpcReceiptStatus: 1,
      depositBlockNumber: 10,
      depositBlockHash: `0x${"e".repeat(64)}`,
      confirmationDepth: 2
    });
  });

  it("serves the hosted public configuration without partner credentials", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      mode: "staging-testnet",
      publicConfig: TEST_PUBLIC_CONFIG,
      issueRunCapability: () => ({
        value: TEST_RUN_CAPABILITY,
        hash: hashLiveRunCapability(TEST_RUN_CAPABILITY)
      }),
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });

    const response = await api({ method: "GET", pathname: "/api/public/config", auth: null });

    expect(response).toEqual({ status: 200, body: TEST_PUBLIC_CONFIG });
  });

  it("serves a public-safe campaign studio without partner credentials", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      mode: "staging-testnet",
      publicConfig: TEST_PUBLIC_CONFIG,
      now: () => "2026-07-30T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });

    const response = await api({
      method: "GET",
      pathname: "/api/public/campaign-studio",
      auth: null
    });

    expect(response.status).toBe(200);
    expect(response.body.screenKind).toBe("public-campaign-studio");
    expect(JSON.stringify(response.body)).not.toMatch(
      /manifestJson|manifestSignature|capabilityHash|referralCode/u
    );
  });

  it("keeps Standard RPC timeouts retryable without saving a terminal decision or receipt", async () => {
    const store = createMemoryLiveStore();
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      publicConfig: TEST_PUBLIC_CONFIG,
      issueRunCapability: () => ({
        value: TEST_RUN_CAPABILITY,
        hash: hashLiveRunCapability(TEST_RUN_CAPABILITY)
      }),
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-timeout",
        nonce: "nonce-timeout",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      }),
      verifyRun: async () => ({
        decision: "timeout",
        failureReason: "UNDER_CONFIRMED",
        verifierInputHash: `0x${"0".repeat(64)}`,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: null,
        depositBlockNumber: null,
        depositBlockHash: null,
        confirmationDepth: 0
      })
    });
    await api({
      method: "POST",
      pathname: "/api/runs",
      body: { wallet: "0x1111111111111111111111111111111111111111", chainId: 91342, referralCode: null }
    });
    await api({
      method: "POST",
      pathname: "/api/runs/run-timeout/evidence",
      runCapability: TEST_RUN_CAPABILITY,
      body: { approveTxHash: null, depositTxHash: `0x${"d".repeat(64)}` }
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-timeout/verify",
      runCapability: TEST_RUN_CAPABILITY,
      body: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "timeout",
      decision: "timeout",
      standardRpcReceiptStatus: null,
      depositBlockNumber: null,
      depositBlockHash: null,
      confirmationDepth: 0,
      verification: { status: "retryable", retryPath: "/api/runs/run-timeout/verify" }
    });
    expect(store.getDecisionByIntentHash(`0x${"a".repeat(64)}`)).toBeUndefined();
    expect(store.listRuns()).toHaveLength(1);
    expect(store.getReceipt(`0x${"8".repeat(64)}`)).toBeUndefined();
    expect(
      store.getPublicEvidenceByIntentHash(`0x${"a".repeat(64)}`)
    ).toBeUndefined();
  });

  it("returns tenant-scoped redacted partner run projections in hosted mode", async () => {
    const store = createMemoryLiveStore();
    const now = "2026-06-19T00:00:00.000Z";
    store.createRun({
      runId: "run-alpha",
      tenantId: "tenant-alpha",
      capabilityHash: hashLiveRunCapability(TEST_RUN_CAPABILITY),
      idempotencyKey: "tenant-alpha:wallet:campaign:mission:",
      wallet: "0x1111111111111111111111111111111111111111",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-1",
      intentHash: `0x${"a".repeat(64)}`,
      manifestJson: "{\"hidden\":true}",
      manifestSignature: "0xsig",
      status: "manifestIssued",
      expiryUnix: 1790000000,
      createdAt: now,
      updatedAt: now
    });
    store.createRun({
      runId: "run-beta",
      tenantId: "tenant-beta",
      idempotencyKey: "tenant-beta:wallet:campaign:mission:",
      wallet: "0x2222222222222222222222222222222222222222",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-2",
      intentHash: `0x${"b".repeat(64)}`,
      manifestJson: "{\"hidden\":true}",
      manifestSignature: "0xsig",
      status: "manifestIssued",
      expiryUnix: 1790000000,
      createdAt: now,
      updatedAt: now
    });

    const api = createLiveApiHandler({
      store,
      now: () => now,
      issueManifest: async () => {
        throw new Error("not reached");
      },
      mode: "staging-testnet"
    });

    const response = await api({
      method: "GET",
      pathname: "/api/partner/runs",
      auth: {
        actorId: "cred-alpha",
        tenantId: "tenant-alpha",
        scopes: ["partner:read"],
        mode: "credential"
      },
      requestId: "req_2"
    });

    expect(response.status).toBe(200);
    expect(response.body.rows).toEqual([
      expect.objectContaining({
        runId: "run-alpha",
        intentHash: `0x${"a".repeat(64)}`
      })
    ]);
    expect(JSON.stringify(response.body)).not.toContain("run-beta");
    expect(JSON.stringify(response.body)).not.toContain("manifestSignature");
    expect(JSON.stringify(response.body)).not.toContain("manifestJson");
    expect(JSON.stringify(response.body)).not.toContain("capabilityHash");
    expect(JSON.stringify(response.body)).not.toContain(hashLiveRunCapability(TEST_RUN_CAPABILITY));
  });

  it("requires hosted operator credentials with runs:read scope for demo status", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      mode: "staging-testnet",
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });

    const unauthenticated = await api({
      method: "GET",
      pathname: "/api/demo/status",
      auth: null,
      requestId: "req_demo_1"
    });
    const wrongScope = await api({
      method: "GET",
      pathname: "/api/demo/status",
      auth: {
        actorId: "cred-partner",
        tenantId: "tenant-alpha",
        scopes: ["partner:read"],
        mode: "credential"
      },
      requestId: "req_demo_2"
    });

    expect(unauthenticated).toEqual({
      status: 401,
      body: { error: "unauthorized", requestId: "req_demo_1" }
    });
    expect(wrongScope).toEqual({
      status: 403,
      body: { error: "forbidden", requestId: "req_demo_2" }
    });
  });

  it("scopes hosted operator demo status to the authenticated tenant", async () => {
    const store = createMemoryLiveStore();
    const now = "2026-06-19T00:00:00.000Z";
    store.createRun({
      runId: "run-alpha",
      tenantId: "tenant-alpha",
      idempotencyKey: "tenant-alpha:run-alpha",
      wallet: "0x1111111111111111111111111111111111111111",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-alpha",
      intentHash: `0x${"a".repeat(64)}`,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      status: "manifestIssued",
      expiryUnix: 1790003600,
      createdAt: now,
      updatedAt: now
    });
    store.createRun({
      runId: "run-beta",
      tenantId: "tenant-beta",
      idempotencyKey: "tenant-beta:run-beta",
      wallet: "0x2222222222222222222222222222222222222222",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-beta",
      intentHash: `0x${"b".repeat(64)}`,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      status: "matched",
      expiryUnix: 1790003600,
      createdAt: "2026-06-19T00:01:00.000Z",
      updatedAt: "2026-06-19T00:01:00.000Z"
    });
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      now: () => now,
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });

    const response = await api({
      method: "GET",
      pathname: "/api/demo/status",
      auth: {
        actorId: "cred-operator",
        tenantId: "tenant-alpha",
        scopes: ["runs:read"],
        mode: "credential"
      }
    });
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body.controlRoom).toMatchObject({
      safeProjection: { latestRun: { runId: "run-alpha" } }
    });
    expect(serialized).not.toContain("run-beta");
    expect(serialized).not.toContain("0x2222222222222222222222222222222222222222");
    expect(serialized).not.toContain(`0x${"b".repeat(64)}`);
  });

  it("runs staging-testnet verification synchronously even when a job queue is configured", async () => {
    const store = createMemoryLiveStore();
    const verificationJobs = createMemoryVerificationJobQueue({ now: () => "2026-06-19T00:00:00.000Z" });
    const api = createLiveApiHandler({
      store,
      verificationJobs,
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      }),
      issueRunCapability: () => ({
        value: TEST_RUN_CAPABILITY,
        hash: hashLiveRunCapability(TEST_RUN_CAPABILITY)
      }),
      publicConfig: TEST_PUBLIC_CONFIG,
      verifyRun: async () => ({
        decision: "mismatched",
        failureReason: "UNDER_CONFIRMED",
        verifierInputHash: `0x${"9".repeat(64)}`,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: 1,
        depositBlockNumber: 10,
        depositBlockHash: `0x${"e".repeat(64)}`,
        confirmationDepth: 1
      }),
      mode: "staging-testnet"
    });
    const auth = {
      actorId: "cred-alpha",
      tenantId: "tenant-alpha",
      scopes: ["runs:write", "runs:read", "verify:write"] as const,
      mode: "credential" as const
    };

    const created = await api({
      method: "POST",
      pathname: "/api/runs",
      auth,
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      auth,
      runCapability: created.body.runCapability as string,
      body: { approveTxHash: null, depositTxHash: `0x${"d".repeat(64)}` }
    });

    const response = await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      auth,
      runCapability: created.body.runCapability as string,
      body: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ decision: "mismatched", confirmationDepth: 1 });
    expect(verificationJobs.getJobForRun("run-1")).toBeUndefined();
  });

  it("queues prod-testnet verification and returns pollable run state", async () => {
    const store = createMemoryLiveStore();
    const verificationJobs = createMemoryVerificationJobQueue({ now: () => "2026-06-19T00:00:00.000Z" });
    const auth = {
      actorId: "cred-alpha",
      tenantId: "tenant-alpha",
      scopes: ["runs:write", "runs:read", "verify:write"] as const,
      mode: "credential" as const
    };
    const api = createLiveApiHandler({
      store,
      verificationJobs,
      mode: "prod-testnet",
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => ({
        runId: "run-1",
        nonce: "nonce-1",
        intentHash: `0x${"a".repeat(64)}`,
        manifestJson: "{}",
        manifestSignature: "0xsig",
        expiryUnix: 1790003600,
        preview: null
      }),
      issueRunCapability: () => ({
        value: TEST_RUN_CAPABILITY,
        hash: hashLiveRunCapability(TEST_RUN_CAPABILITY)
      }),
      publicConfig: TEST_PUBLIC_CONFIG,
      verifyRun: async () => {
        throw new Error("hosted verify should enqueue");
      }
    });

    const created = await api({
      method: "POST",
      pathname: "/api/runs",
      auth,
      body: {
        wallet: "0x1111111111111111111111111111111111111111",
        chainId: 91342,
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit",
        referralCode: null
      }
    });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/evidence",
      auth,
      runCapability: created.body.runCapability as string,
      body: { approveTxHash: `0x${"c".repeat(64)}`, depositTxHash: `0x${"d".repeat(64)}` }
    });
    await api({
      method: "POST",
      pathname: "/api/runs/run-1/verify",
      auth,
      runCapability: created.body.runCapability as string,
      body: {}
    });

    const response = await api({
      method: "GET",
      pathname: "/api/runs/run-1",
      auth,
      runCapability: created.body.runCapability as string
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      approveTxHash: `0x${"c".repeat(64)}`,
      depositTxHash: `0x${"d".repeat(64)}`,
      receiptReady: false,
      verification: { status: "queued", pollPath: "/api/runs/run-1" }
    });
  });

  it("returns a safe operator demo status without signed manifest internals", async () => {
    const store = createMemoryLiveStore();
    const now = "2026-06-19T00:00:00.000Z";
    store.createRun({
      runId: "run-1",
      idempotencyKey: "wallet:campaign:mission:",
      wallet: "0x1111111111111111111111111111111111111111",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null,
      nonce: "nonce-1",
      intentHash: `0x${"a".repeat(64)}`,
      manifestJson: "{\"hidden\":true}",
      manifestSignature: "0xsig",
      status: "matched",
      expiryUnix: 1790003600,
      createdAt: now,
      updatedAt: now
    });
    store.saveDecision({
      intentHash: `0x${"a".repeat(64)}`,
      depositTxHash: `0x${"d".repeat(64)}`,
      decision: "matched",
      failureReason: null,
      verifierInputHash: `0x${"9".repeat(64)}`,
      receiptHash: `0x${"8".repeat(64)}`,
      decisionTxHash: null,
      issuedAt: 1790000000
    });
    const api = createLiveApiHandler({
      store,
      now: () => now,
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });

    const response = await api({ method: "GET", pathname: "/api/demo/status" });
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body.controlRoom).toMatchObject({
      screenKind: "operator-demo-control-room",
      safeProjection: {
        latestRun: { runId: "run-1", status: "matched" },
        receiptHash: `0x${"8".repeat(64)}`
      }
    });
    expect(serialized).not.toContain("manifestJson");
    expect(serialized).not.toContain("manifestSignature");
    expect(serialized).not.toContain("hidden");
  });
});

describe("public campaign event API", () => {
  function eventApi(store: LiveStore = createMemoryLiveStore()) {
    return createLiveApiHandler({
      store,
      mode: "staging-testnet",
      now: () => "2026-07-31T03:04:05.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      }
    });
  }

  it("keeps ingestion disabled without an approved retention and pruning policy", async () => {
    const store = createMemoryLiveStore();
    const api = eventApi(store);
    const request = {
      method: "POST",
      pathname: "/api/public/events",
      requestId: "req_private_canary",
      body: {
        eventType: "campaignVisited",
        anonymousSessionId: "9b2f8a0d-a733-4db7-b058-1c6f70ef1f8a",
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit"
      }
    } as const;

    const response = await api(request);

    expect(response).toEqual({
      status: 503,
      body: { error: "public_campaign_events_disabled" }
    });
    expect(
      store.aggregatePublicCampaignEvents(
        "gasok-demo",
        "first-mock-vault-deposit"
      )
    ).toEqual({
      uniqueCampaignVisitorCount: 0,
      uniqueWalletConnectSessionCount: 0
    });
    expect(JSON.stringify(response)).not.toContain("req_private_canary");
    expect(JSON.stringify(response)).not.toContain(
      "9b2f8a0d-a733-4db7-b058-1c6f70ef1f8a"
    );
  });

  it("does not expose an event-row read endpoint", async () => {
    const response = await eventApi()({
      method: "GET",
      pathname: "/api/public/events"
    });
    expect(response).toEqual({ status: 404, body: { error: "not_found" } });
  });
});

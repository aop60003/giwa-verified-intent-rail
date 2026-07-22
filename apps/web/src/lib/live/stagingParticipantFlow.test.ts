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
import { createLiveApiHandler, type LiveApiResponse } from "./liveApi.ts";
import { hashLiveRunCapability } from "./liveParticipantCapability.ts";
import { buildLivePublicConfig } from "./livePublicConfig.ts";
import { createMemoryLiveStore } from "./liveStore.ts";

const RUN_ID = "run-staging-journey";
const RUN_CAPABILITY = "A".repeat(43);
const RUN_CAPABILITY_HASH = hashLiveRunCapability(RUN_CAPABILITY);
const INTENT_HASH = `0x${"a".repeat(64)}` as `0x${string}`;
const DEPOSIT_TX_HASH = `0x${"d".repeat(64)}` as `0x${string}`;
const DEPOSIT_BLOCK_HASH = `0x${"e".repeat(64)}` as `0x${string}`;

const PUBLIC_CONFIG = buildLivePublicConfig({
  chainId: 91342,
  txExplorerTemplate: "https://sepolia-explorer.giwa.io/tx/{txHash}",
  faucetHelpUrl: "https://docs.giwa.io/introduction/try-giwa",
  minGasBalanceWei: "100000000000000",
  deployment: {
    mockTokenAddress: "0x06a26a1182bd40ec38b38ee987a0a16cf572222f",
    mockVaultAddress: "0x94c7a4deb22318ff798cbe8340d7cc3365c405f6",
    intentRailAddress: "0x5282325c5b82e9e3fb39050bdd8ec0f500185597"
  }
});

const VERIFIER_INPUT_PAYLOAD: VerifierInputPayload = {
  schemaVersion: "1",
  chainId: 91342,
  intentHash: INTENT_HASH,
  depositTxHash: DEPOSIT_TX_HASH,
  depositTransactionSnapshotHash: `0x${"1".repeat(64)}`,
  depositReceiptSnapshotHash: `0x${"2".repeat(64)}`,
  decodedLogSnapshotHash: `0x${"3".repeat(64)}`,
  confirmationDepth: 4,
  headBlockNumberAtVerification: 14,
  verifierVersion: "gasok-staging-1"
};

const RECEIPT_PAYLOAD: ReceiptPayload = {
  schemaVersion: "1",
  verifierVersion: "gasok-staging-1",
  intentHash: INTENT_HASH,
  chainId: 91342,
  networkName: "GIWA Sepolia",
  status: "matched",
  actionType: "mockVaultDeposit",
  asset: PUBLIC_CONFIG.contracts.mockToken,
  amountBaseUnits: PUBLIC_CONFIG.demoAmountBaseUnits,
  target: PUBLIC_CONFIG.contracts.mockVault,
  spender: PUBLIC_CONFIG.contracts.mockVault,
  maxAllowanceBaseUnits: PUBLIC_CONFIG.demoAmountBaseUnits,
  allowanceUsedBaseUnits: PUBLIC_CONFIG.demoAmountBaseUnits,
  approvalRequired: false,
  approveTxHash: null,
  depositTxHash: DEPOSIT_TX_HASH,
  depositBlockNumber: 10,
  depositBlockHash: DEPOSIT_BLOCK_HASH,
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  wallet: "0x1111111111111111111111111111111111111111",
  verifiedState: "guest",
  testnetDepositAmountDelta: PUBLIC_CONFIG.demoAmountBaseUnits,
  issuedAt: 1790000020,
  issuer: "GIWA Verified Intent Rail MVP",
  safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
};

const VERIFIER_INPUT_HASH = computeVerifierInputHash(VERIFIER_INPUT_PAYLOAD);
const RECEIPT_HASH = computeReceiptHash(RECEIPT_PAYLOAD);
const RECEIPT_RECORD = {
  receiptHash: RECEIPT_HASH,
  intentHash: INTENT_HASH,
  payloadJson: JSON.stringify(RECEIPT_PAYLOAD),
  canonicalPayload: canonicalReceiptPayload(RECEIPT_PAYLOAD),
  canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(RECEIPT_PAYLOAD)
};
const VERIFIER_INPUT_RECORD = {
  runId: RUN_ID,
  verifierInputHash: VERIFIER_INPUT_HASH,
  canonicalPayload: canonicalVerifierInputPayload(VERIFIER_INPUT_PAYLOAD),
  canonicalPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(VERIFIER_INPUT_PAYLOAD),
  createdAt: "2026-06-19T00:02:00.000Z"
};

function expectCapabilityAbsent(response: LiveApiResponse): void {
  const serialized = JSON.stringify(response.body);
  expect(serialized).not.toContain("runCapability");
  expect(serialized).not.toContain("capabilityHash");
  expect(serialized).not.toContain(RUN_CAPABILITY);
  expect(serialized).not.toContain(RUN_CAPABILITY_HASH);
}

describe("staging participant journey", () => {
  it("retries a timeout and exposes only the matched public receipt", async () => {
    const store = createMemoryLiveStore();
    let verificationAttempts = 0;
    const api = createLiveApiHandler({
      store,
      mode: "staging-testnet",
      publicConfig: PUBLIC_CONFIG,
      issueRunCapability: () => ({ value: RUN_CAPABILITY, hash: RUN_CAPABILITY_HASH }),
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async (input) => ({
        runId: RUN_ID,
        nonce: "nonce-staging-journey",
        intentHash: INTENT_HASH,
        manifestJson: JSON.stringify({ chainId: 91342, ...input }),
        manifestSignature: `0x${"b".repeat(130)}`,
        expiryUnix: 1790003600,
        preview: null
      }),
      verifyRun: async () => {
        verificationAttempts += 1;
        if (verificationAttempts === 1) {
          return {
            decision: "timeout",
            failureReason: "UNDER_CONFIRMED",
            verifierInputHash: VERIFIER_INPUT_HASH,
            receiptHash: null,
            decisionTxHash: null,
            standardRpcReceiptStatus: null,
            depositBlockNumber: null,
            depositBlockHash: null,
            confirmationDepth: 0
          };
        }
        return {
          decision: "matched",
          failureReason: null,
          verifierInputHash: VERIFIER_INPUT_HASH,
          receiptHash: RECEIPT_HASH,
          decisionTxHash: null,
          standardRpcReceiptStatus: 1,
          depositBlockNumber: 10,
          depositBlockHash: DEPOSIT_BLOCK_HASH,
          confirmationDepth: 4,
          receipt: RECEIPT_RECORD,
          verifierInputRecord: VERIFIER_INPUT_RECORD
        };
      }
    });

    const publicConfig = await api({ method: "GET", pathname: "/api/public/config" });
    expect(publicConfig).toEqual({ status: 200, body: PUBLIC_CONFIG });

    const created = await api({
      method: "POST",
      pathname: "/api/runs",
      body: {
        wallet: RECEIPT_PAYLOAD.wallet,
        chainId: 91342,
        referralCode: null
      }
    });
    expect(created.status).toBe(201);
    expect(created.body.runCapability).toBe(RUN_CAPABILITY);
    expect(created.body).not.toHaveProperty("capabilityHash");
    expect(JSON.stringify(created.body).match(new RegExp(RUN_CAPABILITY, "gu"))).toHaveLength(1);

    const storedRun = store.getRun(RUN_ID);
    expect(storedRun?.capabilityHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(storedRun?.capabilityHash).toBe(RUN_CAPABILITY_HASH);
    expect(storedRun).not.toHaveProperty("runCapability");
    expect(JSON.stringify(storedRun)).not.toContain(RUN_CAPABILITY);

    const missingCapability = await api({ method: "GET", pathname: `/api/runs/${RUN_ID}` });
    expect(missingCapability).toEqual({ status: 401, body: { error: "run_capability_required" } });

    const evidence = await api({
      method: "POST",
      pathname: `/api/runs/${RUN_ID}/evidence`,
      runCapability: RUN_CAPABILITY,
      body: { approveTxHash: null, depositTxHash: DEPOSIT_TX_HASH }
    });
    expect(evidence).toMatchObject({
      status: 200,
      body: { runId: RUN_ID, status: "depositSubmitted", receiptReady: false, receiptHash: null }
    });

    const timedOut = await api({
      method: "POST",
      pathname: `/api/runs/${RUN_ID}/verify`,
      runCapability: RUN_CAPABILITY,
      body: {}
    });
    expect(timedOut).toMatchObject({
      status: 200,
      body: {
        status: "timeout",
        decision: "timeout",
        receiptReady: false,
        receiptHash: null,
        decisionTxHash: null,
        verification: { status: "retryable", retryPath: `/api/runs/${RUN_ID}/verify` }
      }
    });
    expect(store.getDecisionByIntentHash(INTENT_HASH)).toBeUndefined();
    expect(store.getReceipt(RECEIPT_HASH)).toBeUndefined();

    const matched = await api({
      method: "POST",
      pathname: `/api/runs/${RUN_ID}/verify`,
      runCapability: RUN_CAPABILITY,
      body: {}
    });
    expect(matched).toMatchObject({
      status: 200,
      body: {
        status: "matched",
        decision: "matched",
        receiptReady: true,
        receiptHash: RECEIPT_HASH,
        verifierInputHash: VERIFIER_INPUT_HASH,
        standardRpcReceiptStatus: 1,
        depositBlockNumber: 10,
        depositBlockHash: DEPOSIT_BLOCK_HASH,
        confirmationDepth: 4
      }
    });

    const publicReceipt = await api({ method: "GET", pathname: `/api/receipts/${RECEIPT_HASH}` });
    expect(publicReceipt).toEqual({
      status: 200,
      body: {
        source: "live",
        receiptHash: RECEIPT_HASH,
        intentHash: INTENT_HASH,
        payload: RECEIPT_PAYLOAD,
        payloadJson: RECEIPT_RECORD.payloadJson,
        canonicalPayload: RECEIPT_RECORD.canonicalPayload,
        canonicalPayloadBytesHex: RECEIPT_RECORD.canonicalPayloadBytesHex,
        verifierInputHash: VERIFIER_INPUT_HASH,
        standardRpcReceiptStatus: 1,
        depositBlockNumber: 10,
        depositBlockHash: DEPOSIT_BLOCK_HASH,
        confirmationDepth: 4,
        testnetNotice: "Testnet-only. No real asset, no yield, no RWA claim."
      }
    });
    expect(JSON.stringify(publicReceipt.body)).not.toMatch(/session|auth/iu);

    const rejectedPartnerRead = await api({ method: "GET", pathname: "/api/partner/runs" });
    expect(rejectedPartnerRead).toEqual({ status: 401, body: { error: "unauthorized" } });
    expect(verificationAttempts).toBe(2);

    for (const response of [
      publicConfig,
      missingCapability,
      evidence,
      timedOut,
      matched,
      publicReceipt,
      rejectedPartnerRead
    ]) {
      expectCapabilityAbsent(response);
    }
  });
});

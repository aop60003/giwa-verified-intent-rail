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
import { createLiveApiHandler } from "./liveApi.ts";
import { hashLiveRunCapability } from "./liveParticipantCapability.ts";
import type { LivePublicConfig } from "./livePublicConfig.ts";
import { createMemoryLiveStore } from "./liveStore.ts";
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

  it("returns the existing run for an idempotent create request", async () => {
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

    expect(first.body.runId).toBe(second.body.runId);
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
    const receiptHash = `0x${"8".repeat(64)}`;
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
        decision: "matched",
        failureReason: null,
        verifierInputHash: `0x${"9".repeat(64)}`,
        receiptHash,
        decisionTxHash: null,
        standardRpcReceiptStatus: 1,
        depositBlockNumber: 10,
        depositBlockHash: `0x${"e".repeat(64)}`,
        confirmationDepth: 4,
        receipt: {
          receiptHash,
          intentHash: `0x${"a".repeat(64)}`,
          payloadJson: "{\"status\":\"matched\"}",
          canonicalPayload: "{\"status\":\"matched\"}",
          canonicalPayloadBytesHex: "0x7b7d"
        }
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
      status: "matched",
      receiptReady: true,
      receiptHash,
      decisionTxHash: null,
      verifierInputHash: `0x${"9".repeat(64)}`,
      standardRpcReceiptStatus: 1,
      depositBlockNumber: 10,
      depositBlockHash: `0x${"e".repeat(64)}`,
      confirmationDepth: 4
    });
    expect(store.getRun("run-1")?.status).toBe("matched");
    expect(store.getReceipt(receiptHash)?.payloadJson).toContain("matched");
  });

  it("stores a mismatched verifier decision without unlocking a receipt", async () => {
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
        decision: "mismatched",
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
      status: "mismatched",
      receiptReady: false,
      receiptHash: null,
      failureReason: "WALLET_MISMATCH",
      failureCode: "MISSING_REQUIRED_LOG"
    });
    expect(store.getDecisionByIntentHash(`0x${"a".repeat(64)}`)?.decisionTxHash).toBeNull();
  });

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

  it("returns dynamic receipt payload after matched verification", async () => {
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

    const response = await api({ method: "GET", pathname: `/api/receipts/${receiptHash}` });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      source: "live",
      receiptHash,
      intentHash: `0x${"a".repeat(64)}`,
      payload: { status: "matched" },
      verifierInputHash,
      standardRpcReceiptStatus: 1,
      depositBlockNumber: 10,
      depositBlockHash: `0x${"e".repeat(64)}`,
      confirmationDepth: 4,
      testnetNotice: "Testnet-only. No real asset, no yield, no RWA claim.",
      canonicalPayload: canonicalReceiptPayload(receiptPayload),
      canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload)
    });
    expect(JSON.stringify(response.body)).not.toContain("capabilityHash");
    expect(JSON.stringify(response.body)).not.toContain(hashLiveRunCapability(TEST_RUN_CAPABILITY));
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
      pathname: "/api/runs/run-capability/invalidate",
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

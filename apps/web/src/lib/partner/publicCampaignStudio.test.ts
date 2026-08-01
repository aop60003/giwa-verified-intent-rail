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
import { createMemoryLiveStore } from "../live/liveStore.ts";
import type { LiveRunRecord } from "../live/liveTypes.ts";
import { buildPublicCampaignStudio } from "./publicCampaignStudio.ts";

const campaignId = "gasok-demo";
const missionId = "first-mock-vault-deposit";
const fullWallet = "0x1111111111111111111111111111111111111111";
const matchedIntentHash = `0x${"a".repeat(64)}` as `0x${string}`;
const matchedDepositTxHash = `0x${"d".repeat(64)}` as `0x${string}`;

function run(
  runId: string,
  status: LiveRunRecord["status"],
  intentHash: string,
  wallet: string,
  updatedAt: string
): LiveRunRecord {
  return {
    runId,
    idempotencyKey: `${runId}:idempotency`,
    wallet,
    campaignId,
    missionId,
    referralCode: null,
    nonce: `${runId}:nonce`,
    intentHash,
    manifestJson: JSON.stringify({ chainId: 91342 }),
    manifestSignature: `0x${"b".repeat(130)}`,
    status,
    expiryUnix: 1_800_003_600,
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt
  };
}

function studioFixture(options: { includePending?: boolean } = {}) {
  const store = createMemoryLiveStore();
  const verifierPayload: VerifierInputPayload = {
    schemaVersion: "1",
    chainId: 91342,
    intentHash: matchedIntentHash,
    depositTxHash: matchedDepositTxHash,
    depositTransactionSnapshotHash: `0x${"1".repeat(64)}`,
    depositReceiptSnapshotHash: `0x${"2".repeat(64)}`,
    decodedLogSnapshotHash: `0x${"3".repeat(64)}`,
    confirmationDepth: 4,
    headBlockNumberAtVerification: 32_034_054,
    verifierVersion: "live-sprint-14"
  };
  const receiptPayload: ReceiptPayload = {
    schemaVersion: "1",
    verifierVersion: "live-sprint-14",
    intentHash: matchedIntentHash,
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
    approvalRequired: true,
    approveTxHash: `0x${"c".repeat(64)}`,
    depositTxHash: matchedDepositTxHash,
    depositBlockNumber: 32_034_050,
    depositBlockHash: `0x${"4".repeat(64)}`,
    campaignId,
    missionId,
    wallet: fullWallet,
    verifiedState: "guest",
    testnetDepositAmountDelta: "1000000000000000000",
    issuedAt: 1_800_000_000,
    issuer: "GIWA Verified Intent Rail MVP",
    safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
  };
  const verifierInputHash = computeVerifierInputHash(verifierPayload);
  const matchedReceiptHash = computeReceiptHash(receiptPayload);

  store.createRun(
    run(
      "run-matched",
      "matched",
      matchedIntentHash,
      fullWallet,
      "2026-07-30T00:03:00.000Z"
    )
  );
  store.createRun(
    run(
      "run-mismatch",
      "mismatched",
      `0x${"e".repeat(64)}`,
      "0x5555555555555555555555555555555555555555",
      "2026-07-30T00:02:00.000Z"
    )
  );
  if (options.includePending !== false) {
    store.createRun(
      run(
        "run-pending",
        "manifestIssued",
        `0x${"f".repeat(64)}`,
        "0x6666666666666666666666666666666666666666",
        "2026-07-30T00:01:00.000Z"
      )
    );
  }
  store.saveSubmittedTx({
    runId: "run-matched",
    approveTxHash: `0x${"c".repeat(64)}`,
    depositTxHash: matchedDepositTxHash,
    submittedAt: "2026-07-30T00:02:00.000Z"
  });
  store.saveSubmittedTx({
    runId: "run-mismatch",
    approveTxHash: null,
    depositTxHash: `0x${"9".repeat(64)}`,
    submittedAt: "2026-07-30T00:01:30.000Z"
  });
  store.saveDecision({
    intentHash: matchedIntentHash,
    depositTxHash: matchedDepositTxHash,
    decision: "matched",
    failureReason: null,
    verifierInputHash,
    receiptHash: matchedReceiptHash,
    decisionTxHash: null,
    issuedAt: 1_800_000_000
  });
  store.saveDecision({
    intentHash: `0x${"e".repeat(64)}`,
    depositTxHash: `0x${"9".repeat(64)}`,
    decision: "mismatched",
    failureReason: "TARGET_MISMATCH",
    verifierInputHash: `0x${"8".repeat(64)}`,
    receiptHash: null,
    decisionTxHash: null,
    issuedAt: 1_800_000_000
  });
  store.saveReceipt({
    receiptHash: matchedReceiptHash,
    intentHash: matchedIntentHash,
    payloadJson: JSON.stringify(receiptPayload),
    canonicalPayload: canonicalReceiptPayload(receiptPayload),
    canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload)
  });
  store.saveVerifierInput({
    runId: "run-matched",
    verifierInputHash,
    canonicalPayload: canonicalVerifierInputPayload(verifierPayload),
    canonicalPayloadBytesHex:
      canonicalVerifierInputPayloadBytesHex(verifierPayload),
    createdAt: "2026-07-30T00:02:30.000Z"
  });
  store.savePublicCampaignEvent({
    eventType: "campaignVisited",
    sessionHash: "a".repeat(64),
    campaignId,
    missionId,
    recordedAt: "2026-07-30T00:00:00.000Z"
  });
  store.savePublicCampaignEvent({
    eventType: "campaignVisited",
    sessionHash: "b".repeat(64),
    campaignId,
    missionId,
    recordedAt: "2026-07-30T00:01:00.000Z"
  });
  store.savePublicCampaignEvent({
    eventType: "walletConnected",
    sessionHash: "a".repeat(64),
    campaignId,
    missionId,
    recordedAt: "2026-07-30T00:02:00.000Z"
  });

  return { store, matchedReceiptHash };
}

function hex64(value: number): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function addMatchedReceipt(
  store: ReturnType<typeof createMemoryLiveStore>,
  sequence: number,
  wallet: `0x${string}` = `0x${(7_000 + sequence)
    .toString(16)
    .padStart(40, "0")}`
): void {
  const runId = `run-bulk-${sequence}`;
  const intentHash = hex64(1_000 + sequence);
  const depositTxHash = hex64(2_000 + sequence);
  const verifierPayload: VerifierInputPayload = {
    schemaVersion: "1",
    chainId: 91342,
    intentHash,
    depositTxHash,
    depositTransactionSnapshotHash: hex64(3_000 + sequence),
    depositReceiptSnapshotHash: hex64(4_000 + sequence),
    decodedLogSnapshotHash: hex64(5_000 + sequence),
    confirmationDepth: 4,
    headBlockNumberAtVerification: 32_034_054 + sequence,
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
    depositBlockNumber: 32_034_050 + sequence,
    depositBlockHash: hex64(6_000 + sequence),
    campaignId,
    missionId,
    wallet,
    verifiedState: "guest",
    testnetDepositAmountDelta: "1000000000000000000",
    issuedAt: 1_800_000_000 + sequence,
    issuer: "GIWA Verified Intent Rail MVP",
    safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
  };
  const verifierInputHash = computeVerifierInputHash(verifierPayload);
  const receiptHash = computeReceiptHash(receiptPayload);
  const updatedAt = new Date(
    Date.parse("2026-07-30T01:00:00.000Z") + sequence * 1_000
  ).toISOString();

  store.createRun(
    run(
      runId,
      "matched",
      intentHash,
      receiptPayload.wallet,
      updatedAt
    )
  );
  store.saveSubmittedTx({
    runId,
    approveTxHash: null,
    depositTxHash,
    submittedAt: updatedAt
  });
  store.saveDecision({
    intentHash,
    depositTxHash,
    decision: "matched",
    failureReason: null,
    verifierInputHash,
    receiptHash,
    decisionTxHash: null,
    issuedAt: receiptPayload.issuedAt
  });
  store.saveReceipt({
    receiptHash,
    intentHash,
    payloadJson: JSON.stringify(receiptPayload),
    canonicalPayload: canonicalReceiptPayload(receiptPayload),
    canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload)
  });
  store.saveVerifierInput({
    runId,
    verifierInputHash,
    canonicalPayload: canonicalVerifierInputPayload(verifierPayload),
    canonicalPayloadBytesHex:
      canonicalVerifierInputPayloadBytesHex(verifierPayload),
    createdAt: updatedAt
  });
}

function resolveFixturePublicProof(
  store: ReturnType<typeof createMemoryLiveStore>
) {
  return async (receiptHash: string) => {
    const receipt = store.getReceipt(receiptHash);
    const run = store
      .listRuns()
      .find((candidate) => candidate.intentHash === receipt?.intentHash);
    const decision =
      run === undefined
        ? undefined
        : store.getDecisionByIntentHash(run.intentHash);
    const submittedTx =
      run === undefined ? undefined : store.getSubmittedTx(run.runId);
    if (
      receipt === undefined ||
      run === undefined ||
      decision === undefined ||
      submittedTx === undefined
    ) {
      return null;
    }
    const normalizedWallet = run.wallet.toLowerCase();
    return {
      walletLabel: `${normalizedWallet.slice(0, 8)}…${normalizedWallet.slice(-4)}`,
      receiptHash: receipt.receiptHash,
      intentHash: run.intentHash,
      depositTxHash: submittedTx.depositTxHash,
      verifierInputHash: decision.verifierInputHash,
      receiptPath: `/receipt/${receipt.receiptHash}`,
      participantReceiptPath: `/user/receipt/${receipt.receiptHash}`,
      explorerUrl: `https://sepolia-explorer.giwa.io/tx/${submittedTx.depositTxHash}`
    };
  };
}

describe("buildPublicCampaignStudio", () => {
  it("omits legacy Matched Receipts without replayable public evidence", async () => {
    const { store } = studioFixture();
    const model = await buildPublicCampaignStudio({
      store,
      campaignId,
      missionId,
      generatedAt: "2026-07-30T00:00:00.000Z"
    });

    expect(model).toMatchObject({
      screenKind: "public-campaign-studio",
      source: "live",
      campaign: {
        campaignId,
        missionId,
        networkName: "GIWA Sepolia",
        policyVersion: null,
        policyStatus: "fixed-unversioned"
      },
      kpis: {
        uniqueCampaignVisitorCount: null,
        uniqueWalletConnectSessionCount: null,
        submittedDepositCount: 2,
        matchedReceiptCount: 1,
        matchedRate: {
          numerator: 1,
          denominator: 2,
          displayRate: "50%",
          definition: "Matched Receipts / submitted deposits"
        },
        uniqueParticipantCount: 2,
        repeatActivatorCount: 0,
        repeatActivationCount: 0
      },
      eventCapture: {
        status: "unavailable",
        generatedAt: "2026-07-30T00:00:00.000Z"
      },
      negativeControl: {
        label: "Recorded negative control",
        scenario: "TARGET_MISMATCH",
        scope: "controlled-demo-scenario",
        receiptIssued: false,
        publicReceiptAvailable: false,
        path: "/giwa-demo?example=mismatch"
      }
    });
    expect(model.receipts).toHaveLength(0);
    expect(JSON.stringify(model)).not.toContain(fullWallet);
    expect(JSON.stringify(model)).not.toContain("manifestSignature");
    expect(JSON.stringify(model)).not.toContain("capabilityHash");
    expect(JSON.stringify(model)).not.toContain("runId");
    expect(JSON.stringify(model.negativeControl)).not.toContain(fullWallet);
    expect(model.negativeControl).not.toHaveProperty("intentHash");
    expect(model.negativeControl).not.toHaveProperty("depositTxHash");
    expect(model.negativeControl).not.toHaveProperty("failureTrace");
    expect(model.negativeControl).not.toHaveProperty("capability");
    expect(
      model.funnel.find((step) => step.id === "campaignVisited")
    ).toMatchObject({
      count: null,
      capture: "not-captured"
    });
    expect(
      model.funnel.find((step) => step.id === "walletConnected")
    ).toMatchObject({
      count: null,
      capture: "not-captured"
    });
    expect(model.mismatchBreakdown).toEqual([
      { code: "TARGET_MISMATCH", label: "실행 대상 불일치", count: 1 }
    ]);
  });

  it("separates approval branches from the monotonic evidence funnel", async () => {
    const { store } = studioFixture({ includePending: false });
    const model = await buildPublicCampaignStudio({
      store,
      campaignId,
      missionId,
      generatedAt: "2026-07-30T00:00:00.000Z"
    });

    expect(model.approvalPaths).toEqual({
      exactApprovalSubmitted: 1,
      exactApprovalConfirmed: 1,
      approvalNotRequired: 1,
      depositSubmitted: 2
    });
    expect(model.funnel.map((step) => [step.label, step.count])).toEqual([
      ["캠페인 방문", null],
      ["지갑 연결", null],
      ["Manifest 발급", 2],
      ["예치 제출", 2],
      ["예치 확인", 2],
      ["Verifier 대조", 2],
      ["조건 일치", 1],
      ["Receipt 발급", 1]
    ]);
    expect(model.funnel.map((step) => step.id)).not.toContain(
      "approveSubmitted"
    );
    expect(model.funnel.map((step) => step.id)).not.toContain(
      "approveConfirmed"
    );
    const counts = model.funnel
      .filter((step) => step.capture === "derived")
      .map((step) => step.count)
      .filter((count): count is number => count !== null);
    expect(
      counts.every(
        (count, index) => index === 0 || count <= counts[index - 1]!
      )
    ).toBe(true);
  });

  it("counts every matched receipt before limiting the public list to 20 rows", async () => {
    const store = createMemoryLiveStore();
    for (let sequence = 1; sequence <= 21; sequence += 1) {
      addMatchedReceipt(store, sequence);
    }

    const model = await buildPublicCampaignStudio({
      store,
      campaignId,
      missionId,
      generatedAt: "2026-07-30T02:00:00.000Z",
      resolvePublicProof: resolveFixturePublicProof(store)
    });

    expect(model.receipts).toHaveLength(20);
    expect(model.kpis).toMatchObject({
      submittedDepositCount: 21,
      matchedReceiptCount: 21,
      matchedRate: {
        numerator: 21,
        denominator: 21,
        displayRate: "100%",
        definition: "Matched Receipts / submitted deposits"
      },
      uniqueParticipantCount: 21,
      repeatActivatorCount: 0,
      repeatActivationCount: 0
    });
    expect(
      model.funnel.find((step) => step.id === "matched")?.count
    ).toBe(21);
    expect(
      model.funnel.find((step) => step.id === "receiptIssued")?.count
    ).toBe(21);
  });

  it("counts unique participants and repeat activations from the full gated set", async () => {
    const store = createMemoryLiveStore();
    const repeatedWallet = "0x1111111111111111111111111111111111111111";
    addMatchedReceipt(store, 1, repeatedWallet);
    addMatchedReceipt(store, 2, repeatedWallet);
    addMatchedReceipt(
      store,
      3,
      "0x2222222222222222222222222222222222222222"
    );

    const model = await buildPublicCampaignStudio({
      store,
      campaignId,
      missionId,
      generatedAt: "2026-07-30T02:00:00.000Z",
      resolvePublicProof: resolveFixturePublicProof(store)
    });

    expect(model.kpis).toMatchObject({
      uniqueParticipantCount: 2,
      repeatActivatorCount: 1,
      repeatActivationCount: 1
    });
  });

  it("distinguishes full wallets that collide after public shortening", async () => {
    const store = createMemoryLiveStore();
    const firstWallet =
      `0xabcdef${"1".repeat(30)}1234` as `0x${string}`;
    const secondWallet =
      `0xabcdef${"2".repeat(30)}1234` as `0x${string}`;
    addMatchedReceipt(store, 1, firstWallet);
    addMatchedReceipt(store, 2, secondWallet);

    const model = await buildPublicCampaignStudio({
      store,
      campaignId,
      missionId,
      generatedAt: "2026-07-30T02:00:00.000Z",
      resolvePublicProof: resolveFixturePublicProof(store)
    });

    expect(model.receipts.map((row) => row.walletLabel)).toEqual([
      "0xabcdef…1234",
      "0xabcdef…1234"
    ]);
    expect(model.kpis).toMatchObject({
      uniqueParticipantCount: 2,
      repeatActivatorCount: 0,
      repeatActivationCount: 0
    });
    expect(JSON.stringify(model)).not.toContain(firstWallet);
    expect(JSON.stringify(model)).not.toContain(secondWallet);
  });

  it("keeps event-derived metrics unavailable while public ingestion is disabled", async () => {
    const model = await buildPublicCampaignStudio({
      store: createMemoryLiveStore(),
      campaignId,
      missionId,
      generatedAt: "2026-07-30T02:00:00.000Z"
    });

    expect(model.eventCapture.status).toBe("unavailable");
    expect(model.kpis).toMatchObject({
      uniqueCampaignVisitorCount: null,
      uniqueWalletConnectSessionCount: null,
      submittedDepositCount: 0,
      matchedReceiptCount: 0,
      matchedRate: {
        numerator: 0,
        denominator: 0,
        displayRate: "0%"
      },
      uniqueParticipantCount: 0,
      repeatActivatorCount: 0,
      repeatActivationCount: 0
    });
  });
});

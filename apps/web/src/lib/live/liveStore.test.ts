import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createMemoryLiveStore, createSqliteLiveStore } from "./liveStore.ts";
import type { LiveStore } from "./liveStore.ts";
import type { StudioAuthRepository } from "./studioAuthRepository.ts";
import type { StudioCampaignRecord } from "./studioCampaignRepository.ts";
import type { StudioCampaignVersionRecord } from "./studioCampaignVersionRepository.ts";
import {
  evaluateLiveSchemaState,
  REQUIRED_LIVE_MIGRATIONS
} from "./liveSchemaMigrations.ts";
import type {
  DecisionRecord,
  LiveRunRecord,
  PublicCampaignEventRecord,
  PublicEvidenceRecord,
  ReceiptRecord,
  VerifierInputRecord
} from "./liveTypes.ts";

function campaignEvent(
  overrides: Partial<PublicCampaignEventRecord> = {}
): PublicCampaignEventRecord {
  return {
    eventType: "campaignVisited",
    sessionHash: "a".repeat(64),
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    recordedAt: "2026-07-31T00:00:00.000Z",
    ...overrides
  };
}

type PublicEvidenceStoreContract = {
  savePublicEvidence(record: PublicEvidenceRecord): PublicEvidenceRecord;
  getPublicEvidenceByReceiptHash(hash: string): PublicEvidenceRecord | undefined;
  getPublicEvidenceByIntentHash(hash: string): PublicEvidenceRecord | undefined;
  getPublicEvidenceByDepositTxHash(hash: string): PublicEvidenceRecord | undefined;
};

type MatchedEvidencePublication = {
  runId: string;
  updatedAt: string;
  verifierInput: VerifierInputRecord;
  receipt: ReceiptRecord;
  decision: DecisionRecord;
  publicEvidence: PublicEvidenceRecord;
};

type AtomicPublicEvidenceStoreContract = PublicEvidenceStoreContract & {
  publishMatchedEvidence(input: MatchedEvidencePublication): {
    run: LiveRunRecord;
    verifierInput: VerifierInputRecord;
    receipt: ReceiptRecord;
    decision: DecisionRecord;
    publicEvidence: PublicEvidenceRecord;
  };
};

function run(overrides: Partial<LiveRunRecord> = {}): LiveRunRecord {
  return {
    runId: "run-1",
    idempotencyKey: "wallet:campaign:mission",
    wallet: "0x1111111111111111111111111111111111111111",
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    referralCode: null,
    nonce: "nonce-1",
    intentHash: "0xintent",
    manifestJson: "{}",
    manifestSignature: "0xsig",
    status: "manifestIssued",
    expiryUnix: 1790000000,
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:00:00.000Z",
    ...overrides
  };
}

function publicEvidence(
  overrides: Partial<PublicEvidenceRecord> = {}
): PublicEvidenceRecord {
  return {
    receiptHash: `0x${"8".repeat(64)}`,
    intentHash: `0x${"a".repeat(64)}`,
    depositTxHash: `0x${"d".repeat(64)}`,
    bundleJson: '{"schemaVersion":"1","source":"live"}',
    createdAt: "2026-07-31T00:00:00.000Z",
    ...overrides
  };
}

const studioNow = "2026-08-01T00:00:00.000Z";
const studioOwnerA = "0x1111111111111111111111111111111111111111" as const;
const studioOwnerB = "0x2222222222222222222222222222222222222222" as const;

const campaignBaseline: StudioCampaignRecord = {
  campaignId: "gasok-demo",
  organizationId: "tenant-a",
  name: "GIWA GASOK Demo",
  summary: "Existing verified-intent testnet campaign.",
  actionTemplate: "mockVaultDeposit",
  lifecycleState: "published-baseline",
  source: "gasok-evidence",
  revision: 1,
  createdByMemberId: null,
  updatedByMemberId: null,
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z"
};

function campaignDraft(overrides: Partial<StudioCampaignRecord> = {}): StudioCampaignRecord {
  return {
    ...campaignBaseline,
    campaignId: "campaign-draft",
    lifecycleState: "draft",
    source: "studio-draft",
    createdByMemberId: "member-a",
    updatedByMemberId: "member-a",
    createdAt: studioNow,
    updatedAt: studioNow,
    ...overrides
  };
}

function publishedCampaignVersion(
  campaign: StudioCampaignRecord,
  versionNumber: number,
  memberId: string
): StudioCampaignVersionRecord {
  return {
    campaignId: campaign.campaignId,
    organizationId: campaign.organizationId,
    versionNumber,
    name: campaign.name,
    summary: campaign.summary,
    actionTemplate: "mockVaultDeposit",
    sourceDraftRevision: campaign.revision,
    canonicalJson: `{"campaignId":"${campaign.campaignId}","versionNumber":${versionNumber}}`,
    campaignVersionHash: `0x${String(versionNumber).repeat(64)}`,
    publishedByMemberId: memberId,
    publishedAt: studioNow
  };
}

function provisionCampaignOrganizations(store: LiveStore): { memberA: string; memberB: string } {
  for (const [id, displayName, wallet] of [
    ["tenant-a", "Loop", studioOwnerA],
    ["tenant-b", "Other", studioOwnerB]
  ] as const) {
    store.studioAuth.upsertOrganization({ id, displayName, createdAt: studioNow, updatedAt: studioNow });
    store.studioAuth.syncBootstrapOwners({ organizationId: id, walletAddresses: [wallet], nowIso: studioNow });
  }
  return {
    memberA: store.studioAuth.getActiveMember("tenant-a", studioOwnerA)!.memberId,
    memberB: store.studioAuth.getActiveMember("tenant-b", studioOwnerB)!.memberId
  };
}

function studioChallenge(
  overrides: Partial<Parameters<StudioAuthRepository["createChallenge"]>[0]> = {}
): Parameters<StudioAuthRepository["createChallenge"]>[0] {
  return {
    challengeId: "challenge-one",
    expectedWallet: studioOwnerA,
    nonceHash: "a".repeat(64),
    origin: "https://app.example",
    uri: "https://app.example/studio",
    chainId: 91_342,
    issuedAt: studioNow,
    expiresAt: "2026-08-01T00:05:00.000Z",
    usedAt: null,
    attemptCount: 0,
    createdAt: studioNow,
    ...overrides
  };
}

function studioSession(
  memberId: string,
  overrides: Partial<Parameters<StudioAuthRepository["consumeChallengeAndCreateSession"]>[0]["session"]> = {}
): Parameters<StudioAuthRepository["consumeChallengeAndCreateSession"]>[0]["session"] {
  return {
    sessionId: "session-one",
    tokenHash: "b".repeat(64),
    memberId,
    createdAt: "2026-08-01T00:01:00.000Z",
    expiresAt: "2026-08-01T08:01:00.000Z",
    revokedAt: null,
    ...overrides
  };
}

function evidenceStore(store: LiveStore): PublicEvidenceStoreContract {
  expect("savePublicEvidence" in store).toBe(true);
  expect("getPublicEvidenceByReceiptHash" in store).toBe(true);
  expect("getPublicEvidenceByIntentHash" in store).toBe(true);
  expect("getPublicEvidenceByDepositTxHash" in store).toBe(true);
  return store as LiveStore & PublicEvidenceStoreContract;
}

function atomicEvidenceStore(store: LiveStore): AtomicPublicEvidenceStoreContract {
  const evidence = evidenceStore(store);
  expect("publishMatchedEvidence" in store).toBe(true);
  return evidence as AtomicPublicEvidenceStoreContract;
}

function matchedPublication(
  overrides: Partial<MatchedEvidencePublication> = {}
): MatchedEvidencePublication {
  const publicEvidenceRecord = overrides.publicEvidence ?? publicEvidence();
  const verifierInput: VerifierInputRecord = overrides.verifierInput ?? {
    runId: "run-1",
    verifierInputHash: `0x${"9".repeat(64)}`,
    canonicalPayload: '{"schemaVersion":"1"}',
    canonicalPayloadBytesHex: "0x7b7d",
    createdAt: "2026-07-31T00:00:00.000Z"
  };
  const receipt: ReceiptRecord = overrides.receipt ?? {
    receiptHash: publicEvidenceRecord.receiptHash,
    intentHash: publicEvidenceRecord.intentHash,
    payloadJson: '{"status":"matched"}',
    canonicalPayload: '{"status":"matched"}',
    canonicalPayloadBytesHex: "0x7b7d"
  };
  const decision: DecisionRecord = overrides.decision ?? {
    intentHash: publicEvidenceRecord.intentHash,
    depositTxHash: publicEvidenceRecord.depositTxHash,
    decision: "matched",
    failureReason: null,
    verifierInputHash: verifierInput.verifierInputHash,
    receiptHash: receipt.receiptHash,
    decisionTxHash: null,
    issuedAt: 1796083200,
    standardRpcReceiptStatus: 1,
    depositBlockNumber: 100,
    depositBlockHash: `0x${"e".repeat(64)}`,
    confirmationDepth: 4
  };
  return {
    runId: "run-1",
    updatedAt: "2026-07-31T00:00:00.000Z",
    verifierInput,
    receipt,
    decision,
    publicEvidence: publicEvidenceRecord,
    ...overrides
  };
}

function seedRunForPublication(store: LiveStore, publication: MatchedEvidencePublication): void {
  store.createRun(
    run({
      runId: publication.runId,
      idempotencyKey: publication.runId,
      intentHash: publication.publicEvidence.intentHash,
      status: "verifierChecking"
    })
  );
  store.saveSubmittedTx({
    runId: publication.runId,
    approveTxHash: null,
    depositTxHash: publication.publicEvidence.depositTxHash,
    submittedAt: "2026-07-31T00:00:00.000Z"
  });
}

function seedPublicEvidenceDependencies(
  store: LiveStore,
  record: PublicEvidenceRecord
): void {
  const publication = matchedPublication({ publicEvidence: record });
  seedRunForPublication(store, publication);
  store.saveVerifierInput(publication.verifierInput);
  store.saveReceipt(publication.receipt);
  store.saveDecision(publication.decision);
}

function publishExistingPublicEvidence(
  store: LiveStore,
  runId: string,
  record: PublicEvidenceRecord,
  updatedAt: string
): PublicEvidenceRecord {
  const decision = store.getDecisionByIntentHash(record.intentHash);
  const receipt = store.getReceipt(record.receiptHash);
  const verifierInput =
    decision === undefined ? undefined : store.getVerifierInput(decision.verifierInputHash);
  expect(decision).toBeDefined();
  expect(receipt).toBeDefined();
  expect(verifierInput).toBeDefined();
  return atomicEvidenceStore(store).publishMatchedEvidence({
    runId,
    updatedAt,
    verifierInput: verifierInput!,
    receipt: receipt!,
    decision: decision!,
    publicEvidence: record
  }).publicEvidence;
}

function expectPublicEvidenceContract(store: LiveStore): void {
  const evidence = evidenceStore(store);
  const record = publicEvidence();
  const publication = matchedPublication({ publicEvidence: record });
  seedRunForPublication(store, publication);

  expect(atomicEvidenceStore(store).publishMatchedEvidence(publication).publicEvidence).toEqual(
    record
  );
  expect(evidence.savePublicEvidence({ ...record })).toEqual(record);
  expect(evidence.getPublicEvidenceByReceiptHash(record.receiptHash)).toEqual(record);
  expect(evidence.getPublicEvidenceByIntentHash(record.intentHash)).toEqual(record);
  expect(evidence.getPublicEvidenceByDepositTxHash(record.depositTxHash)).toEqual(record);

  expect(() =>
    evidence.savePublicEvidence(
      publicEvidence({
        intentHash: `0x${"b".repeat(64)}`,
        depositTxHash: `0x${"1".repeat(64)}`,
        bundleJson: '{"conflict":"receipt"}'
      })
    )
  ).toThrow("public evidence conflict");
  expect(() =>
    evidence.savePublicEvidence(
      publicEvidence({
        receiptHash: `0x${"7".repeat(64)}`,
        depositTxHash: `0x${"2".repeat(64)}`,
        bundleJson: '{"conflict":"intent"}'
      })
    )
  ).toThrow("public evidence conflict");
  expect(() =>
    evidence.savePublicEvidence(
      publicEvidence({
        receiptHash: `0x${"6".repeat(64)}`,
        intentHash: `0x${"c".repeat(64)}`,
        bundleJson: '{"conflict":"deposit"}'
      })
    )
  ).toThrow("public evidence conflict");
}

function persistCrashWindowEvidence(store: LiveStore): void {
  store.createRun(
    run({
      runId: "stale-decided",
      idempotencyKey: "stale-decided",
      intentHash: "0xstale-decided",
      status: "verifierChecking",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    })
  );
  store.saveSubmittedTx({
    runId: "stale-decided",
    approveTxHash: null,
    depositTxHash: "0xstale-decided-deposit",
    submittedAt: "2026-06-01T00:01:00.000Z"
  });
  store.saveVerifierInput({
    runId: "stale-decided",
    verifierInputHash: "0xstale-decided-verifier",
    canonicalPayload: "{}",
    canonicalPayloadBytesHex: "0x7b7d",
    createdAt: "2026-06-01T00:02:00.000Z"
  });
  store.saveDecision({
    intentHash: "0xstale-decided",
    depositTxHash: "0xstale-decided-deposit",
    decision: "mismatched",
    failureReason: "target_mismatch",
    verifierInputHash: "0xstale-decided-verifier",
    receiptHash: null,
    decisionTxHash: null,
    issuedAt: 1780272000
  });
  store.enqueueVerificationJob({
    tenantId: "local",
    runId: "stale-decided",
    reason: "manual_verify",
    createdAt: "2026-06-01T00:03:00.000Z"
  });

  store.createRun(
    run({
      runId: "stale-receipted",
      idempotencyKey: "stale-receipted",
      intentHash: "0xstale-receipted",
      status: "verifierChecking",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    })
  );
  store.saveSubmittedTx({
    runId: "stale-receipted",
    approveTxHash: null,
    depositTxHash: "0xstale-receipted-deposit",
    submittedAt: "2026-06-01T00:01:00.000Z"
  });
  store.saveVerifierInput({
    runId: "stale-receipted",
    verifierInputHash: "0xstale-receipted-verifier",
    canonicalPayload: "{}",
    canonicalPayloadBytesHex: "0x7b7d",
    createdAt: "2026-06-01T00:02:00.000Z"
  });
  store.saveReceipt({
    receiptHash: "0xstale-receipted-receipt",
    intentHash: "0xstale-receipted",
    payloadJson: "{}",
    canonicalPayload: "{}",
    canonicalPayloadBytesHex: "0x7b7d"
  });
  store.enqueueVerificationJob({
    tenantId: "local",
    runId: "stale-receipted",
    reason: "manual_verify",
    createdAt: "2026-06-01T00:03:00.000Z"
  });
}

describe("live store", () => {
  it("stores immutable public evidence with three-hash lookup in memory", () => {
    expectPublicEvidenceContract(createMemoryLiveStore());
  });

  it("rejects standalone insertion even when matched dependencies already exist", () => {
    const store = createMemoryLiveStore();
    const record = publicEvidence();
    seedPublicEvidenceDependencies(store, record);

    expect(() => evidenceStore(store).savePublicEvidence(record)).toThrow(
      "public evidence must be published atomically"
    );
    expect(evidenceStore(store).getPublicEvidenceByReceiptHash(record.receiptHash)).toBeUndefined();
  });

  it("publishes a matched outcome atomically and idempotently in memory", () => {
    const store = createMemoryLiveStore();
    const publication = matchedPublication();
    seedRunForPublication(store, publication);

    const first = atomicEvidenceStore(store).publishMatchedEvidence(publication);
    const repeated = atomicEvidenceStore(store).publishMatchedEvidence({
      ...publication,
      verifierInput: { ...publication.verifierInput },
      receipt: { ...publication.receipt },
      decision: { ...publication.decision },
      publicEvidence: { ...publication.publicEvidence }
    });

    expect(first).toEqual(repeated);
    expect(first.run.status).toBe("matched");
    expect(store.getRun(publication.runId)?.status).toBe("matched");
    expect(store.getDecisionByIntentHash(publication.decision.intentHash)).toEqual(publication.decision);
    expect(
      evidenceStore(store).getPublicEvidenceByReceiptHash(publication.publicEvidence.receiptHash)
    ).toEqual(publication.publicEvidence);
  });

  it("leaves no matched artifacts when an in-memory publication is incoherent", () => {
    const store = createMemoryLiveStore();
    const publication = matchedPublication();
    seedRunForPublication(store, publication);

    expect(() =>
      atomicEvidenceStore(store).publishMatchedEvidence({
        ...publication,
        decision: {
          ...publication.decision,
          receiptHash: `0x${"7".repeat(64)}`
        }
      })
    ).toThrow("matched evidence publication is incoherent");

    expect(store.getRun(publication.runId)?.status).toBe("verifierChecking");
    expect(store.getVerifierInput(publication.verifierInput.verifierInputHash)).toBeUndefined();
    expect(store.getReceipt(publication.receipt.receiptHash)).toBeUndefined();
    expect(store.getDecisionByIntentHash(publication.decision.intentHash)).toBeUndefined();
    expect(
      evidenceStore(store).getPublicEvidenceByReceiptHash(publication.publicEvidence.receiptHash)
    ).toBeUndefined();
  });

  it("rejects verifier input assigned to a differently cased run identifier", () => {
    const store = createMemoryLiveStore();
    const publication = matchedPublication();
    seedRunForPublication(store, publication);

    expect(() =>
      atomicEvidenceStore(store).publishMatchedEvidence({
        ...publication,
        verifierInput: {
          ...publication.verifierInput,
          runId: publication.runId.toUpperCase()
        }
      })
    ).toThrow("matched evidence publication is incoherent");

    expect(store.getRun(publication.runId)?.status).toBe("verifierChecking");
    expect(store.getDecisionByIntentHash(publication.decision.intentHash)).toBeUndefined();
  });

  it("returns an existing run for the same idempotency key", () => {
    const store = createMemoryLiveStore();
    const first = store.createRun(run());
    const second = store.createRun(run({ runId: "run-2", intentHash: "0xother" }));

    expect(second).toEqual(first);
    expect(store.listRuns()).toHaveLength(1);
  });

  it("rejects the same deposit transaction on a different run", () => {
    const store = createMemoryLiveStore();
    store.createRun(run());
    store.createRun(
      run({
        runId: "run-2",
        idempotencyKey: "wallet:campaign:mission:2",
        intentHash: "0xintent2"
      })
    );
    store.saveSubmittedTx({
      runId: "run-1",
      approveTxHash: null,
      depositTxHash: "0xdeposita",
      submittedAt: "2026-06-17T00:01:00.000Z"
    });

    expect(() =>
      store.saveSubmittedTx({
        runId: "run-2",
        approveTxHash: null,
        depositTxHash: "0xdeposita",
        submittedAt: "2026-06-17T00:02:00.000Z"
      })
    ).toThrow("depositTxHash already belongs to another run");
  });

  it("freezes terminal decisions by intent hash", () => {
    const store = createMemoryLiveStore();
    store.createRun(run());

    const decision = store.saveDecision({
      intentHash: "0xintent",
      depositTxHash: "0xdeposita",
      decision: "matched",
      failureReason: null,
      verifierInputHash: "0xverifier",
      receiptHash: "0xreceipt",
      decisionTxHash: "0xdecision",
      issuedAt: 1790000000
    });

    const repeated = store.saveDecision({
      intentHash: "0xintent",
      depositTxHash: "0xdeposita",
      decision: "matched",
      failureReason: null,
      verifierInputHash: "0xchanged",
      receiptHash: "0xchanged",
      decisionTxHash: "0xchanged",
      issuedAt: 1790000001
    });

    expect(repeated).toEqual(decision);
  });

  it("stores a local verifier decision without a decision transaction hash", () => {
    const store = createMemoryLiveStore();
    store.createRun(run({ intentHash: `0x${"a".repeat(64)}` }));

    const decision = store.saveDecision({
      intentHash: `0x${"a".repeat(64)}`,
      depositTxHash: `0x${"d".repeat(64)}`,
      decision: "matched",
      failureReason: null,
      verifierInputHash: `0x${"9".repeat(64)}`,
      receiptHash: `0x${"8".repeat(64)}`,
      decisionTxHash: null,
      issuedAt: 1790000000
    });

    expect(decision.decisionTxHash).toBeNull();
  });

  it("persists canonical verifier input payload for replay", () => {
    const store = createMemoryLiveStore();
    store.saveVerifierInput({
      runId: "run-1",
      verifierInputHash: `0x${"a".repeat(64)}`,
      canonicalPayload: "{\"schemaVersion\":\"1\"}",
      canonicalPayloadBytesHex: "0x7b7d",
      createdAt: "2026-06-19T00:00:00.000Z"
    });

    expect(store.getVerifierInput(`0x${"a".repeat(64)}`)).toMatchObject({
      runId: "run-1",
      verifierInputHash: `0x${"a".repeat(64)}`
    });
  });

  it("keeps idempotency and partner listing scoped by tenant", () => {
    const store = createMemoryLiveStore();

    store.createRun(run({ tenantId: "tenant-alpha" }));
    store.createRun(
      run({
        tenantId: "tenant-beta",
        runId: "run-2",
        intentHash: "0xintent2"
      })
    );

    expect(store.listRunsForTenant("tenant-alpha")).toHaveLength(1);
    expect(store.getRunForTenant("tenant-beta", "run-1")).toBeUndefined();
  });

  it("stores verification jobs behind the live store adapter", () => {
    const store = createMemoryLiveStore();
    const first = store.enqueueVerificationJob({
      tenantId: "tenant-alpha",
      runId: "run-1",
      reason: "deposit_submitted",
      createdAt: "2026-06-19T00:00:00.000Z"
    });
    const second = store.enqueueVerificationJob({
      tenantId: "tenant-alpha",
      runId: "run-1",
      reason: "manual_verify",
      createdAt: "2026-06-19T00:01:00.000Z"
    });

    expect(second.jobId).toBe(first.jobId);
    expect(store.getVerificationJobForRun("run-1")?.status).toBe("pending");
  });

  it("binds capabilities and prunes only incomplete runs in memory", () => {
    const store = createMemoryLiveStore();
    const capabilityHash = "a".repeat(64);
    store.createRun(
      run({
        capabilityHash,
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      })
    );
    store.createRun(
      run({
        runId: "stale-incomplete",
        idempotencyKey: "stale-incomplete",
        intentHash: "0xstale-incomplete",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z"
      })
    );
    store.createRun(
      run({
        runId: "stale-matched",
        idempotencyKey: "stale-matched",
        intentHash: "0xstale-matched",
        status: "matched",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z"
      })
    );
    store.saveSubmittedTx({
      runId: "stale-matched",
      approveTxHash: null,
      depositTxHash: "0xstale-matched-deposit",
      submittedAt: "2026-06-01T00:01:00.000Z"
    });
    store.saveSubmittedTx({
      runId: "stale-incomplete",
      approveTxHash: null,
      depositTxHash: "0xstale-incomplete-deposit",
      submittedAt: "2026-06-01T00:01:00.000Z"
    });
    store.saveVerifierInput({
      runId: "stale-incomplete",
      verifierInputHash: "0xstale-incomplete-verifier",
      canonicalPayload: "{}",
      canonicalPayloadBytesHex: "0x7b7d",
      createdAt: "2026-06-01T00:02:00.000Z"
    });
    store.enqueueVerificationJob({
      tenantId: "local",
      runId: "stale-incomplete",
      reason: "deposit_submitted",
      createdAt: "2026-06-01T00:03:00.000Z"
    });
    store.saveDecision({
      intentHash: "0xstale-matched",
      depositTxHash: "0xstale-matched-deposit",
      decision: "matched",
      failureReason: null,
      verifierInputHash: "0xstale-matched-verifier",
      receiptHash: "0xstale-matched-receipt",
      decisionTxHash: null,
      issuedAt: 1780272000,
      standardRpcReceiptStatus: 1
    });
    store.saveReceipt({
      receiptHash: "0xstale-matched-receipt",
      intentHash: "0xstale-matched",
      payloadJson: "{}",
      canonicalPayload: "{}",
      canonicalPayloadBytesHex: "0x7b7d"
    });
    store.saveVerifierInput({
      runId: "stale-matched",
      verifierInputHash: "0xstale-matched-verifier",
      canonicalPayload: "{}",
      canonicalPayloadBytesHex: "0x7b7d",
      createdAt: "2026-06-01T00:02:00.000Z"
    });
    publishExistingPublicEvidence(
      store,
      "stale-matched",
      publicEvidence({
        receiptHash: "0xstale-matched-receipt",
        intentHash: "0xstale-matched",
        depositTxHash: "0xstale-matched-deposit"
      }),
      "2026-06-01T00:02:00.000Z"
    );
    persistCrashWindowEvidence(store);

    expect(store.getRunForCapabilityHash("run-1", capabilityHash)?.runId).toBe("run-1");
    expect(store.getRunForCapabilityHash("run-1", "b".repeat(64))).toBeUndefined();
    expect(store.checkWritable()).toBe(true);
    expect(store.getSchemaState().migrations).toEqual(REQUIRED_LIVE_MIGRATIONS);
    expect(store.pruneIncompleteRuns("2026-07-01T00:00:00.000Z")).toBe(1);
    expect(store.getRun("stale-incomplete")).toBeUndefined();
    expect(store.getRun("stale-matched")?.status).toBe("matched");
    expect(store.getSubmittedTx("stale-incomplete")).toBeUndefined();
    expect(store.getVerifierInput("0xstale-incomplete-verifier")).toBeUndefined();
    expect(store.getVerificationJobForRun("stale-incomplete")).toBeUndefined();
    expect(store.getDecisionByIntentHash("0xstale-matched")?.decision).toBe("matched");
    expect(store.getReceipt("0xstale-matched-receipt")?.intentHash).toBe("0xstale-matched");
    expect(store.getRun("stale-decided")?.status).toBe("verifierChecking");
    expect(store.getSubmittedTx("stale-decided")?.depositTxHash).toBe("0xstale-decided-deposit");
    expect(store.getVerifierInput("0xstale-decided-verifier")?.runId).toBe("stale-decided");
    expect(store.getDecisionByIntentHash("0xstale-decided")?.decision).toBe("mismatched");
    expect(store.getVerificationJobForRun("stale-decided")?.status).toBe("pending");
    expect(store.getRun("stale-receipted")?.status).toBe("verifierChecking");
    expect(store.getSubmittedTx("stale-receipted")?.depositTxHash).toBe("0xstale-receipted-deposit");
    expect(store.getVerifierInput("0xstale-receipted-verifier")?.runId).toBe("stale-receipted");
    expect(store.getReceipt("0xstale-receipted-receipt")?.intentHash).toBe("0xstale-receipted");
    expect(store.getReceiptForTenant("local", "0xstale-receipted-receipt")?.intentHash).toBe(
      "0xstale-receipted"
    );
    expect(store.getVerificationJobForRun("stale-receipted")?.status).toBe("pending");
  });
});

describe("public campaign event store contract", () => {
  it.each([
    ["memory", () => createMemoryLiveStore()],
    ["SQLite", () => {
      const dir = mkdtempSync(join(tmpdir(), "giwa-public-events-"));
      const store = createSqliteLiveStore(join(dir, "events.sqlite"));
      return Object.assign(store, {
        dispose: () => {
          store.close();
          rmSync(dir, { recursive: true, force: true });
        }
      });
    }]
  ] as const)(
    "stores idempotent privacy-safe events and aggregates unique sessions in %s",
    (_label, createStore) => {
      const store = createStore();
      try {
        const visited = campaignEvent();
        const duplicate = campaignEvent({
          recordedAt: "2026-07-31T00:01:00.000Z"
        });
        const connected = campaignEvent({ eventType: "walletConnected" });
        const anotherVisitor = campaignEvent({ sessionHash: "b".repeat(64) });

        expect(store.savePublicCampaignEvent(visited)).toEqual(visited);
        expect(store.savePublicCampaignEvent(duplicate)).toEqual(visited);
        expect(store.savePublicCampaignEvent(connected)).toEqual(connected);
        expect(store.savePublicCampaignEvent(anotherVisitor)).toEqual(
          anotherVisitor
        );
        expect(
          store.aggregatePublicCampaignEvents(
            "gasok-demo",
            "first-mock-vault-deposit"
          )
        ).toEqual({
          uniqueCampaignVisitorCount: 2,
          uniqueWalletConnectSessionCount: 1
        });
        expect(JSON.stringify(store.getSchemaState())).not.toContain(
          "anonymousSessionId"
        );
      } finally {
        if ("dispose" in store && typeof store.dispose === "function") {
          store.dispose();
        }
      }
    }
  );

  it.each([
    campaignEvent({ eventType: "depositSubmitted" as "campaignVisited" }),
    campaignEvent({ sessionHash: "raw-session-id" }),
    campaignEvent({
      campaignId: "other-campaign" as "gasok-demo"
    }),
    campaignEvent({
      missionId: "other-mission" as "first-mock-vault-deposit"
    }),
    campaignEvent({ recordedAt: "not-a-date" }),
    {
      ...campaignEvent(),
      ipAddress: "203.0.113.10"
    } as PublicCampaignEventRecord
  ])("rejects malformed persisted event records", (record) => {
    const store = createMemoryLiveStore();
    expect(() => store.savePublicCampaignEvent(record)).toThrow(
      "invalid_public_campaign_event_record"
    );
  });
});

describe("Studio auth live-store parity", () => {
  it.each(["memory", "SQLite"] as const)(
    "rolls back atomic bootstrap organization provisioning in %s when Owner synchronization fails",
    (adapter) => {
      const dir = adapter === "SQLite"
        ? mkdtempSync(join(tmpdir(), "giwa-studio-auth-bootstrap-rollback-"))
        : null;
      const store = adapter === "SQLite"
        ? createSqliteLiveStore(join(dir!, "live.sqlite"))
        : createMemoryLiveStore();
      try {
        const auth = store.studioAuth;
        auth.upsertOrganization({
          id: "tenant-existing",
          displayName: "Existing",
          createdAt: studioNow,
          updatedAt: studioNow
        });
        auth.syncBootstrapOwners({
          organizationId: "tenant-existing",
          walletAddresses: [studioOwnerA],
          nowIso: studioNow
        });

        expect(() => auth.bootstrapOrganizationsAndOwners({
          organizations: [
            { id: "tenant-existing", displayName: "Changed", createdAt: studioNow, updatedAt: studioNow },
            { id: "tenant-new", displayName: "New", createdAt: studioNow, updatedAt: studioNow }
          ],
          organizationId: "tenant-new",
          walletAddresses: ["0x1234" as `0x${string}`],
          nowIso: studioNow
        })).toThrow("invalid_studio_wallet");
        expect(auth.getActiveMember("tenant-existing", studioOwnerA)).toMatchObject({
          role: "Owner",
          status: "active"
        });
        expect(() => auth.syncBootstrapOwners({
          organizationId: "tenant-new",
          walletAddresses: [studioOwnerB],
          nowIso: studioNow
        })).toThrow("studio_organization_not_found");
      } finally {
        if ("close" in store && typeof store.close === "function") store.close();
        if (dir !== null) rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it.each(["memory", "SQLite"] as const)(
    "matches organization, challenge, session, and pruning semantics in %s",
    (adapter) => {
      const dir = adapter === "SQLite"
        ? mkdtempSync(join(tmpdir(), "giwa-studio-auth-parity-"))
        : null;
      const store = adapter === "SQLite"
        ? createSqliteLiveStore(join(dir!, "live.sqlite"))
        : createMemoryLiveStore();
      try {
        const auth = store.studioAuth;
        auth.upsertOrganization({
          id: "tenant-a",
          displayName: "Loop",
          createdAt: studioNow,
          updatedAt: studioNow
        });
        expect(auth.syncBootstrapOwners({
          organizationId: "tenant-a",
          walletAddresses: [studioOwnerA, studioOwnerA, studioOwnerB],
          nowIso: studioNow
        })).toEqual({ activeOwnerCount: 2 });
        const member = auth.getActiveMember("tenant-a", studioOwnerA)!;
        auth.syncBootstrapOwners({
          organizationId: "tenant-a",
          walletAddresses: [studioOwnerB],
          nowIso: "2026-08-01T00:00:01.000Z"
        });
        expect(auth.getActiveMember("tenant-a", studioOwnerA)).toBeNull();
        auth.syncBootstrapOwners({
          organizationId: "tenant-a",
          walletAddresses: [studioOwnerA, studioOwnerB],
          nowIso: "2026-08-01T00:00:02.000Z"
        });
        expect(auth.getActiveMember("tenant-a", studioOwnerA)?.memberId).toBe(member.memberId);
        expect(() => auth.syncBootstrapOwners({
          organizationId: "tenant-a",
          walletAddresses: [],
          nowIso: studioNow
        })).toThrow("studio_bootstrap_owner_required");

        auth.createChallenge(studioChallenge());
        expect(auth.incrementChallengeAttempt("challenge-one")).toBe(1);
        expect(auth.incrementChallengeAttempt("missing")).toBe(0);
        expect(() => auth.createChallenge(studioChallenge())).toThrow("duplicate_studio_auth_challenge");
        expect(() => auth.createChallenge(studioChallenge({ challengeId: "challenge-duplicate-nonce" })))
          .toThrow("duplicate_studio_auth_challenge");

        auth.createChallenge(studioChallenge({
          challengeId: "challenge-exact-expiry",
          nonceHash: "c".repeat(64),
          expiresAt: "2026-08-01T00:02:00.000Z"
        }));
        expect(auth.consumeChallengeAndCreateSession({
          challengeId: "challenge-exact-expiry",
          nowIso: "2026-08-01T00:02:00.000Z",
          session: studioSession(member.memberId, {
            sessionId: "session-exact-expiry",
            tokenHash: "d".repeat(64)
          })
        })).toBe(false);
        expect(auth.getChallenge("challenge-exact-expiry")?.usedAt).toBeNull();

        const validSession = studioSession(member.memberId);
        expect(auth.consumeChallengeAndCreateSession({
          challengeId: "challenge-one",
          nowIso: "2026-08-01T00:01:00.000Z",
          session: validSession
        })).toBe(true);
        expect(auth.consumeChallengeAndCreateSession({
          challengeId: "challenge-one",
          nowIso: "2026-08-01T00:01:00.000Z",
          session: validSession
        })).toBe(false);
        auth.createChallenge(studioChallenge({
          challengeId: "challenge-duplicate-session-id",
          nonceHash: "e".repeat(64)
        }));
        expect(auth.consumeChallengeAndCreateSession({
          challengeId: "challenge-duplicate-session-id",
          nowIso: "2026-08-01T00:01:00.000Z",
          session: studioSession(member.memberId, { tokenHash: "f".repeat(64) })
        })).toBe(false);
        expect(auth.getChallenge("challenge-duplicate-session-id")?.usedAt).toBeNull();
        auth.createChallenge(studioChallenge({
          challengeId: "challenge-duplicate-token-hash",
          nonceHash: "1".repeat(64)
        }));
        expect(auth.consumeChallengeAndCreateSession({
          challengeId: "challenge-duplicate-token-hash",
          nowIso: "2026-08-01T00:01:00.000Z",
          session: studioSession(member.memberId, { sessionId: "session-other" })
        })).toBe(false);
        expect(auth.getChallenge("challenge-duplicate-token-hash")?.usedAt).toBeNull();
        expect(auth.getSessionContextByTokenHash(
          validSession.tokenHash,
          "2026-08-01T00:02:00.000Z"
        )).toMatchObject({
          organization: { id: "tenant-a" },
          member: { memberId: member.memberId, status: "active" }
        });
        expect(auth.getSessionContextByTokenHash(validSession.tokenHash, validSession.expiresAt)).toBeNull();
        expect(auth.revokeSessionByTokenHash(validSession.tokenHash, "2026-08-01T00:03:00.000Z")).toBe(true);
        expect(auth.revokeSessionByTokenHash(validSession.tokenHash, "2026-08-01T00:04:00.000Z")).toBe(false);

        expect(auth.pruneExpiredAuthRecords("2026-08-01T00:03:00.000Z", 1)).toEqual({
          challengesRemoved: 1,
          sessionsRemoved: 0
        });
        expect(auth.getChallenge("challenge-exact-expiry")).toBeNull();
        expect(auth.pruneExpiredAuthRecords("2026-08-01T09:00:00.000Z", 1)).toEqual({
          challengesRemoved: 1,
          sessionsRemoved: 1
        });
      } finally {
        if ("close" in store && typeof store.close === "function") store.close();
        if (dir !== null) rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it("normalizes case variants to one stable Owner and challenge wallet in memory and SQLite", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-studio-auth-case-parity-"));
    const sqlite = createSqliteLiveStore(join(dir, "live.sqlite"));
    const memory = createMemoryLiveStore();
    const mixedCaseOwner = "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa" as const;
    const lowerCaseOwner = mixedCaseOwner.toLowerCase() as `0x${string}`;
    const snapshot = (repository: StudioAuthRepository) => {
      repository.upsertOrganization({
        id: "tenant-case",
        displayName: "Case",
        createdAt: studioNow,
        updatedAt: studioNow
      });
      const synchronized = repository.syncBootstrapOwners({
        organizationId: "tenant-case",
        walletAddresses: [mixedCaseOwner, lowerCaseOwner],
        nowIso: studioNow
      });
      const mixedCaseMember = repository.getActiveMember("tenant-case", mixedCaseOwner);
      const lowerCaseMember = repository.getActiveMember("tenant-case", lowerCaseOwner);
      repository.syncBootstrapOwners({
        organizationId: "tenant-case",
        walletAddresses: [lowerCaseOwner],
        nowIso: "2026-08-01T00:01:00.000Z"
      });
      repository.createChallenge(studioChallenge({
        challengeId: "challenge-case",
        expectedWallet: mixedCaseOwner,
        nonceHash: "2".repeat(64)
      }));
      return {
        synchronized,
        mixedCaseMember,
        lowerCaseMember,
        stableMember: repository.getActiveMember("tenant-case", lowerCaseOwner),
        challenge: repository.getChallenge("challenge-case")
      };
    };

    try {
      const memorySnapshot = snapshot(memory.studioAuth);
      const sqliteSnapshot = snapshot(sqlite.studioAuth);
      for (const result of [memorySnapshot, sqliteSnapshot]) {
        expect(result.synchronized).toEqual({ activeOwnerCount: 1 });
        expect(result.mixedCaseMember).toEqual(result.lowerCaseMember);
        expect(result.mixedCaseMember?.walletAddress).toBe(lowerCaseOwner);
        expect(result.stableMember?.memberId).toBe(result.mixedCaseMember?.memberId);
        expect(result.challenge?.expectedWallet).toBe(lowerCaseOwner);
      }
      expect(sqliteSnapshot).toEqual(memorySnapshot);
    } finally {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each(["memory", "SQLite"] as const)(
    "rejects invalid EVM wallet input at every repository boundary in %s",
    (adapter) => {
      const dir = adapter === "SQLite"
        ? mkdtempSync(join(tmpdir(), "giwa-studio-auth-invalid-wallet-"))
        : null;
      const store = adapter === "SQLite"
        ? createSqliteLiveStore(join(dir!, "live.sqlite"))
        : createMemoryLiveStore();
      const invalidWallet = "0x1234" as const;
      try {
        store.studioAuth.upsertOrganization({
          id: "tenant-invalid",
          displayName: "Invalid",
          createdAt: studioNow,
          updatedAt: studioNow
        });
        expect(() => store.studioAuth.syncBootstrapOwners({
          organizationId: "tenant-invalid",
          walletAddresses: [invalidWallet],
          nowIso: studioNow
        })).toThrow("invalid_studio_wallet");
        expect(() => store.studioAuth.getActiveMember("tenant-invalid", invalidWallet))
          .toThrow("invalid_studio_wallet");
        expect(() => store.studioAuth.createChallenge(studioChallenge({
          challengeId: "challenge-invalid",
          expectedWallet: invalidWallet,
          nonceHash: "3".repeat(64)
        }))).toThrow("invalid_studio_wallet");
      } finally {
        if ("close" in store && typeof store.close === "function") store.close();
        if (dir !== null) rmSync(dir, { recursive: true, force: true });
      }
    }
  );
});

describe("Studio campaign live-store parity", () => {
  it.each(["memory", "sqlite"] as const)(
    "publishes immutable campaign versions with %s storage",
    (kind) => {
      const dir = kind === "sqlite" ? mkdtempSync(join(tmpdir(), "giwa-campaign-version-parity-")) : null;
      const store = kind === "sqlite"
        ? createSqliteLiveStore(join(dir!, "live.sqlite"))
        : createMemoryLiveStore();
      try {
        const { memberA } = provisionCampaignOrganizations(store);
        const draft = store.studioCampaigns.createDraft(campaignDraft({
          campaignId: "campaign_00000000-0000-4000-8000-000000000001",
          createdByMemberId: memberA,
          updatedByMemberId: memberA
        }));
        const first = store.studioCampaignVersions.publishDraftVersion({
          organizationId: draft.organizationId,
          campaignId: draft.campaignId,
          expectedRevision: draft.revision,
          publishedByMemberId: memberA,
          publishedAt: studioNow,
          buildVersion: (campaign, versionNumber) => publishedCampaignVersion(campaign, versionNumber, memberA)
        });
        expect(first).toMatchObject({ ok: true, version: { versionNumber: 1 } });
        expect(store.studioCampaignVersions.publishDraftVersion({
          organizationId: draft.organizationId,
          campaignId: draft.campaignId,
          expectedRevision: draft.revision,
          publishedByMemberId: memberA,
          publishedAt: studioNow,
          buildVersion: (campaign, versionNumber) => publishedCampaignVersion(campaign, versionNumber, memberA)
        })).toMatchObject({ ok: false, reason: "already_published" });
        expect(store.studioCampaignVersions.listForOrganizationCampaign("tenant-a", draft.campaignId))
          .toMatchObject([{ versionNumber: 1, sourceDraftRevision: 1 }]);
        expect(evaluateLiveSchemaState(store.getSchemaState())).toEqual({ ok: true, reason: null });
      } finally {
        if (kind === "sqlite") (store as ReturnType<typeof createSqliteLiveStore>).close();
        if (dir !== null) rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it.each(["memory", "sqlite"] as const)(
    "uses the same global version-hash collision outcome with %s storage",
    (kind) => {
      const dir = kind === "sqlite" ? mkdtempSync(join(tmpdir(), "giwa-campaign-hash-parity-")) : null;
      const store = kind === "sqlite" ? createSqliteLiveStore(join(dir!, "live.sqlite")) : createMemoryLiveStore();
      try {
        const { memberA } = provisionCampaignOrganizations(store);
        const first = store.studioCampaigns.createDraft(campaignDraft({
          campaignId: "campaign_00000000-0000-4000-8000-000000000011",
          createdByMemberId: memberA,
          updatedByMemberId: memberA
        }));
        const second = store.studioCampaigns.createDraft(campaignDraft({
          campaignId: "campaign_00000000-0000-4000-8000-000000000012",
          name: "Second campaign",
          createdByMemberId: memberA,
          updatedByMemberId: memberA
        }));
        const publish = (campaign: StudioCampaignRecord) => store.studioCampaignVersions.publishDraftVersion({
          organizationId: campaign.organizationId,
          campaignId: campaign.campaignId,
          expectedRevision: campaign.revision,
          publishedByMemberId: memberA,
          publishedAt: studioNow,
          buildVersion: (draft, versionNumber) => ({
            ...publishedCampaignVersion(draft, versionNumber, memberA),
            campaignVersionHash: `0x${"f".repeat(64)}`
          })
        });
        expect(publish(first)).toMatchObject({ ok: true });
        expect(() => publish(second)).toThrow("duplicate_studio_campaign_version_hash");
      } finally {
        if (kind === "sqlite") (store as ReturnType<typeof createSqliteLiveStore>).close();
        if (dir !== null) rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it.each(["memory", "SQLite"] as const)(
    "keeps baseline, Draft revision, ordering, and tenant boundaries aligned in %s",
    (adapter) => {
      const dir = adapter === "SQLite"
        ? mkdtempSync(join(tmpdir(), "giwa-studio-campaign-parity-"))
        : null;
      const store = adapter === "SQLite"
        ? createSqliteLiveStore(join(dir!, "live.sqlite"))
        : createMemoryLiveStore();
      try {
        const { memberA, memberB } = provisionCampaignOrganizations(store);
        const campaigns = store.studioCampaigns;
        expect(campaigns.bootstrapPublishedBaseline(campaignBaseline)).toEqual(campaignBaseline);
        expect(campaigns.bootstrapPublishedBaseline({ ...campaignBaseline, name: "Ignored replacement" }))
          .toEqual(campaignBaseline);
        expect(() => campaigns.bootstrapPublishedBaseline({ ...campaignBaseline, organizationId: "tenant-b" }))
          .toThrow("studio_campaign_baseline_conflict");

        campaigns.createDraft(campaignDraft({
          campaignId: "campaign-old",
          createdByMemberId: memberA,
          updatedByMemberId: memberA,
          updatedAt: "2026-08-01T00:00:00.000Z"
        }));
        campaigns.createDraft(campaignDraft({
          campaignId: "campaign-new",
          createdByMemberId: memberA,
          updatedByMemberId: memberA,
          updatedAt: "2026-08-01T00:01:00.000Z"
        }));
        campaigns.createDraft(campaignDraft({
          campaignId: "campaign-tenant-b",
          organizationId: "tenant-b",
          createdByMemberId: memberB,
          updatedByMemberId: memberB
        }));
        expect(campaigns.listForOrganization("tenant-a").map((campaign) => campaign.campaignId))
          .toEqual(["gasok-demo", "campaign-new", "campaign-old"]);
        expect(campaigns.listForOrganization("tenant-b").map((campaign) => campaign.campaignId))
          .toEqual(["campaign-tenant-b"]);

        const update = {
          organizationId: "tenant-a",
          campaignId: "campaign-new",
          name: "Updated Draft",
          summary: "Updated local draft.",
          updatedByMemberId: memberA,
          updatedAt: "2026-08-01T01:00:00.000Z",
          expectedRevision: 1
        };
        expect(campaigns.updateDraft(update)).toMatchObject({
          ok: true,
          campaign: { revision: 2, name: "Updated Draft" }
        });
        expect(campaigns.updateDraft({ ...update, name: "Stale writer" }))
          .toEqual({ ok: false, reason: "revision_conflict" });
        expect(campaigns.updateDraft({ ...update, campaignId: "campaign-tenant-b" }))
          .toEqual({ ok: false, reason: "not_found" });
        expect(campaigns.updateDraft({ ...update, campaignId: "gasok-demo" }))
          .toEqual({ ok: false, reason: "not_found" });
        expect(campaigns.listForOrganization("tenant-a")[0]).toEqual(campaignBaseline);

        campaigns.createDraft(campaignDraft({
          campaignId: "campaign-max-revision",
          createdByMemberId: memberA,
          updatedByMemberId: memberA,
          revision: Number.MAX_SAFE_INTEGER
        }));
        const exhausted = {
          ...update,
          campaignId: "campaign-max-revision",
          expectedRevision: Number.MAX_SAFE_INTEGER
        };
        expect(() => campaigns.updateDraft(exhausted)).toThrow("studio_campaign_revision_exhausted");
        expect(campaigns.listForOrganization("tenant-a").find(
          (campaign) => campaign.campaignId === exhausted.campaignId
        )).toMatchObject({ revision: Number.MAX_SAFE_INTEGER, name: campaignBaseline.name });
      } finally {
        if ("close" in store && typeof store.close === "function") store.close();
        if (dir !== null) rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it("persists Studio campaign Drafts after SQLite close and reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-studio-campaign-persistence-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const first = createSqliteLiveStore(dbPath);
      const { memberA } = provisionCampaignOrganizations(first);
      first.studioCampaigns.bootstrapPublishedBaseline(campaignBaseline);
      first.studioCampaigns.createDraft(campaignDraft({
        createdByMemberId: memberA,
        updatedByMemberId: memberA
      }));
      first.close();

      const reopened = createSqliteLiveStore(dbPath);
      expect(reopened.studioCampaigns.listForOrganization("tenant-a").map((campaign) => campaign.campaignId))
        .toEqual(["gasok-demo", "campaign-draft"]);
      expect(reopened.getSchemaState().migrations).toContain("009_studio_campaign_drafts");
      reopened.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("sqlite live store", () => {
  it("persists Studio organizations, Owners, challenges, and sessions", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-studio-auth-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const first = createSqliteLiveStore(dbPath);
      first.studioAuth.upsertOrganization({
        id: "tenant-a",
        displayName: "Loop",
        createdAt: studioNow,
        updatedAt: studioNow
      });
      first.studioAuth.syncBootstrapOwners({
        organizationId: "tenant-a",
        walletAddresses: [studioOwnerA],
        nowIso: studioNow
      });
      const member = first.studioAuth.getActiveMember("tenant-a", studioOwnerA)!;
      first.studioAuth.createChallenge(studioChallenge());
      expect(first.studioAuth.consumeChallengeAndCreateSession({
        challengeId: "challenge-one",
        nowIso: "2026-08-01T00:01:00.000Z",
        session: studioSession(member.memberId)
      })).toBe(true);
      first.close();

      const reopened = createSqliteLiveStore(dbPath);
      expect(reopened.studioAuth.getActiveMember("tenant-a", studioOwnerA)?.role).toBe("Owner");
      expect(reopened.studioAuth.getChallenge("challenge-one")?.usedAt).toBe("2026-08-01T00:01:00.000Z");
      expect(reopened.studioAuth.getSessionContextByTokenHash(
        "b".repeat(64),
        "2026-08-01T00:02:00.000Z"
      )?.organization.id).toBe("tenant-a");
      expect(reopened.getSchemaState().migrations).toContain("008_studio_wallet_auth");
      reopened.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports exact Studio auth foreign keys", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-studio-auth-fk-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const store = createSqliteLiveStore(dbPath);
      store.close();
      const db = new DatabaseSync(dbPath);
      expect(db.prepare(
        `select "from", "table", "to" from pragma_foreign_key_list(?)`
      ).all("organization_members")).toEqual([
        { from: "organizationId", table: "organizations", to: "id" }
      ]);
      expect(db.prepare(
        `select "from", "table", "to" from pragma_foreign_key_list(?)`
      ).all("auth_sessions")).toEqual([
        { from: "memberId", table: "organization_members", to: "memberId" }
      ]);
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each(["memory", "SQLite"] as const)(
    "rejects a nonexistent session member without consuming the challenge in %s",
    (adapter) => {
      const dir = adapter === "SQLite"
        ? mkdtempSync(join(tmpdir(), "giwa-studio-auth-member-parity-"))
        : null;
      const store = adapter === "SQLite"
        ? createSqliteLiveStore(join(dir!, "live.sqlite"))
        : createMemoryLiveStore();
      try {
        store.studioAuth.createChallenge(studioChallenge());
        expect(store.studioAuth.consumeChallengeAndCreateSession({
          challengeId: "challenge-one",
          nowIso: "2026-08-01T00:01:00.000Z",
          session: studioSession("missing-member")
        })).toBe(false);
        expect(store.studioAuth.getChallenge("challenge-one")?.usedAt).toBeNull();
      } finally {
        if ("close" in store && typeof store.close === "function") store.close();
        if (dir !== null) rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it("reports a drifted migration-008 checksum without overwriting it on reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-studio-auth-checksum-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const initial = createSqliteLiveStore(dbPath);
      initial.close();
      const drifted = new DatabaseSync(dbPath);
      drifted.prepare(
        "update schema_migrations set checksum = ? where id = ?"
      ).run("drifted-checksum", "008_studio_wallet_auth");
      drifted.close();

      const reopened = createSqliteLiveStore(dbPath);
      try {
        expect(reopened.getSchemaState().migrationChecksums?.["008_studio_wallet_auth"])
          .toBe("drifted-checksum");
        expect(evaluateLiveSchemaState(reopened.getSchemaState())).toEqual({
          ok: false,
          reason: "migration_missing"
        });
      } finally {
        reopened.close();
      }
      const inspected = new DatabaseSync(dbPath);
      expect(inspected.prepare(
        "select checksum from schema_migrations where id = ?"
      ).get("008_studio_wallet_auth")).toEqual({ checksum: "drifted-checksum" });
      inspected.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rolls back every migration-008 artifact when schema installation fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-studio-auth-migration-rollback-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const malformed = new DatabaseSync(dbPath);
      malformed.exec(`
        create table schema_migrations (
          id text primary key,
          checksum text not null,
          appliedAt text not null
        );
        create table organization_members (memberId text primary key);
      `);
      malformed.close();

      expect(() => createSqliteLiveStore(dbPath)).toThrow();

      const inspected = new DatabaseSync(dbPath);
      expect(inspected.prepare(
        "select id from schema_migrations where id = ?"
      ).get("008_studio_wallet_auth")).toBeUndefined();
      expect(inspected.prepare(
        "select name from sqlite_master where type = 'table' and name = ?"
      ).get("organizations")).toBeUndefined();
      expect(inspected.prepare(
        "select name from sqlite_master where type = 'table' and name = ?"
      ).get("auth_challenges")).toBeUndefined();
      expect(inspected.prepare(
        "select name from sqlite_master where type = 'table' and name = ?"
      ).get("auth_sessions")).toBeUndefined();
      inspected.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("reports exact SQLite column positions, index origins, and aggregation coverage", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const store = createSqliteLiveStore(dbPath);
      try {
        const schema = store.getSchemaState();
        expect(schema.tables.public_campaign_events).toEqual([
          {
            name: "eventType",
            declaredType: "TEXT",
            notNull: true,
            pkPosition: 1
          },
          {
            name: "sessionHash",
            declaredType: "TEXT",
            notNull: true,
            pkPosition: 2
          },
          {
            name: "campaignId",
            declaredType: "TEXT",
            notNull: true,
            pkPosition: 3
          },
          {
            name: "missionId",
            declaredType: "TEXT",
            notNull: true,
            pkPosition: 4
          },
          {
            name: "recordedAt",
            declaredType: "TEXT",
            notNull: true,
            pkPosition: 0
          }
        ]);
        expect(schema.indexes?.public_campaign_events).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              unique: true,
              origin: "pk",
              partial: false,
              columns: [
                "eventType",
                "sessionHash",
                "campaignId",
                "missionId"
              ]
            }),
            expect.objectContaining({
              unique: false,
              origin: "c",
              partial: false,
              columns: [
                "campaignId",
                "missionId",
                "eventType",
                "sessionHash"
              ]
            })
          ])
        );
      } finally {
        store.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports the required descending Studio campaign index direction", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const store = createSqliteLiveStore(dbPath);
      try {
        expect(store.getSchemaState().indexes?.campaigns).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: "idx_campaigns_organization_state_updated",
              columns: ["organizationId", "lifecycleState", "updatedAt", "campaignId"],
              descending: [false, false, true, false]
            })
          ])
        );
      } finally {
        store.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stores immutable public evidence with three-hash lookup in sqlite", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const store = createSqliteLiveStore(dbPath);
      try {
        expectPublicEvidenceContract(store);
      } finally {
        store.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("upgrades a pre-008 database without changing exact Receipt or public-evidence bytes", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    const record = publicEvidence({
      bundleJson: '{\n  "schemaVersion": "1",\n  "exactBytes": "\\u003c"\n}\n'
    });
    const receipt: ReceiptRecord = {
      receiptHash: record.receiptHash,
      intentHash: record.intentHash,
      payloadJson: '{\n  "status": "matched",\n  "exactBytes": "\\u003c"\n}\n',
      canonicalPayload: '{"exactBytes":"<","status":"matched"}',
      canonicalPayloadBytesHex: "0x7b2265786163744279746573223a223c227d"
    };
    try {
      const first = createSqliteLiveStore(dbPath);
      try {
        const publication = matchedPublication({ publicEvidence: record, receipt });
        seedRunForPublication(first, publication);
        atomicEvidenceStore(first).publishMatchedEvidence(publication);
      } finally {
        first.close();
      }

      const legacy = new DatabaseSync(dbPath);
      legacy.exec(`
        drop table if exists auth_sessions;
        drop table if exists auth_challenges;
        drop table if exists organization_members;
        drop table if exists organizations;
      `);
      legacy.prepare("delete from schema_migrations where id = ?").run("008_studio_wallet_auth");
      legacy.close();

      const second = createSqliteLiveStore(dbPath);
      try {
        expect(second.getReceipt(receipt.receiptHash)).toEqual(receipt);
        expect(evidenceStore(second).getPublicEvidenceByReceiptHash(record.receiptHash)).toEqual(record);
        expect(second.getSchemaState().migrations).toContain("008_studio_wallet_auth");
      } finally {
        second.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rolls back every sqlite artifact when a matched publication is incoherent", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    const publication = matchedPublication();
    try {
      const store = createSqliteLiveStore(dbPath);
      try {
        seedRunForPublication(store, publication);
        expect(() =>
          atomicEvidenceStore(store).publishMatchedEvidence({
            ...publication,
            publicEvidence: {
              ...publication.publicEvidence,
              depositTxHash: `0x${"1".repeat(64)}`
            }
          })
        ).toThrow("matched evidence publication is incoherent");

        expect(store.getRun(publication.runId)?.status).toBe("verifierChecking");
        expect(store.getVerifierInput(publication.verifierInput.verifierInputHash)).toBeUndefined();
        expect(store.getReceipt(publication.receipt.receiptHash)).toBeUndefined();
        expect(store.getDecisionByIntentHash(publication.decision.intentHash)).toBeUndefined();
        expect(
          evidenceStore(store).getPublicEvidenceByReceiptHash(publication.publicEvidence.receiptHash)
        ).toBeUndefined();
      } finally {
        store.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("migrates a pre-006 database additively without rewriting Receipt or decision rows", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    const receiptHash = `0x${"8".repeat(64)}`;
    const intentHash = `0x${"a".repeat(64)}`;
    try {
      const before = createSqliteLiveStore(dbPath);
      before.saveReceipt({
        receiptHash,
        intentHash,
        payloadJson: '{"status":"matched","bytes":"exact"}',
        canonicalPayload: '{"bytes":"exact","status":"matched"}',
        canonicalPayloadBytesHex: "0x6578616374"
      });
      before.saveDecision({
        intentHash,
        depositTxHash: `0x${"d".repeat(64)}`,
        decision: "matched",
        failureReason: null,
        verifierInputHash: `0x${"9".repeat(64)}`,
        receiptHash,
        decisionTxHash: null,
        issuedAt: 1796083200
      });
      before.close();

      const legacy = new DatabaseSync(dbPath);
      legacy.exec("drop table public_evidence_bundles");
      legacy.prepare("delete from schema_migrations where id = ?").run("006_public_evidence_bundles");
      legacy.close();

      const migrated = createSqliteLiveStore(dbPath);
      try {
        expect(migrated.getReceipt(receiptHash)).toEqual({
          receiptHash,
          intentHash,
          payloadJson: '{"status":"matched","bytes":"exact"}',
          canonicalPayload: '{"bytes":"exact","status":"matched"}',
          canonicalPayloadBytesHex: "0x6578616374"
        });
        expect(migrated.getDecisionByIntentHash(intentHash)).toMatchObject({
          intentHash,
          receiptHash,
          decision: "matched",
          issuedAt: 1796083200
        });
        expect(migrated.getSchemaState().migrations).toContain("006_public_evidence_bundles");
      } finally {
        migrated.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("persists runs across adapter instances", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const first = createSqliteLiveStore(dbPath);
      first.createRun(run());
      first.close();

      const second = createSqliteLiveStore(dbPath);
      expect(second.getRun("run-1")?.intentHash).toBe("0xintent");
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("persists dynamic receipts and nullable decision hashes across adapter instances", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const first = createSqliteLiveStore(dbPath);
      first.createRun(run({ intentHash: `0x${"a".repeat(64)}` }));
      first.saveDecision({
        intentHash: `0x${"a".repeat(64)}`,
        depositTxHash: `0x${"d".repeat(64)}`,
        decision: "matched",
        failureReason: null,
        verifierInputHash: `0x${"9".repeat(64)}`,
        receiptHash: `0x${"8".repeat(64)}`,
        decisionTxHash: null,
        issuedAt: 1790000000
      });
      first.saveReceipt({
        receiptHash: `0x${"8".repeat(64)}`,
        intentHash: `0x${"a".repeat(64)}`,
        payloadJson: "{\"status\":\"matched\"}",
        canonicalPayload: "{\"status\":\"matched\"}",
        canonicalPayloadBytesHex: "0x7b7d"
      });
      first.close();

      const second = createSqliteLiveStore(dbPath);
      expect(second.getDecisionByIntentHash(`0x${"a".repeat(64)}`)?.decisionTxHash).toBeNull();
      expect(second.getReceipt(`0x${"8".repeat(64)}`)?.canonicalPayload).toBe("{\"status\":\"matched\"}");
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails closed when an existing sqlite decisions table requires decisionTxHash", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "legacy.sqlite");
    try {
      const legacy = createSqliteLiveStore(dbPath);
      legacy.close();
      const sqlite = new DatabaseSync(dbPath);
      sqlite.exec("drop table decisions");
      sqlite.exec(`
        create table decisions (
          intentHash text primary key,
          depositTxHash text not null unique,
          decision text not null,
          failureReason text,
          verifierInputHash text not null,
          receiptHash text unique,
          decisionTxHash text not null,
          issuedAt integer not null
        );
      `);
      sqlite.close();

      expect(() => createSqliteLiveStore(dbPath)).toThrow("decisions.decisionTxHash is not nullable");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("creates schema migration and verification job tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const store = createSqliteLiveStore(dbPath);
      expect(evaluateLiveSchemaState(store.getSchemaState())).toEqual({
        ok: true,
        reason: null
      });
      store.close();

      const sqlite = new DatabaseSync(dbPath);
      const migration = sqlite.prepare("select id from schema_migrations where id = ?").get("003_verification_jobs");
      const jobsTable = sqlite
        .prepare("select name from sqlite_master where type = 'table' and name = 'verification_jobs'")
        .get();
      sqlite.close();

      expect(migration).toBeDefined();
      expect(jobsTable).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.each([
    {
      label: "Receipt primary key",
      tableSql: `
        create table public_evidence_bundles (
          receiptHash text not null,
          intentHash text not null unique,
          depositTxHash text not null unique,
          bundleJson text not null,
          createdAt text not null
        );
      `
    },
    {
      label: "Intent and deposit unique indexes",
      tableSql: `
        create table public_evidence_bundles (
          receiptHash text primary key,
          intentHash text not null,
          depositTxHash text not null,
          bundleJson text not null,
          createdAt text not null
        );
      `
    }
  ])("reports a malformed SQLite evidence table without $label as not ready", ({ tableSql }) => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const initial = createSqliteLiveStore(dbPath);
      initial.close();

      const malformed = new DatabaseSync(dbPath);
      malformed.exec("drop table public_evidence_bundles");
      malformed.exec(tableSql);
      malformed.close();

      const reopened = createSqliteLiveStore(dbPath);
      try {
        expect(evaluateLiveSchemaState(reopened.getSchemaState())).toEqual({
          ok: false,
          reason: "migration_missing"
        });
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("persists capability and receipt metadata while pruning only incomplete runs", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    const capabilityHash = "a".repeat(64);
    try {
      const store = createSqliteLiveStore(dbPath);
      try {
        store.createRun(
          run({
            capabilityHash,
            intentHash: `0x${"a".repeat(64)}`,
            createdAt: "2026-07-02T00:00:00.000Z",
            updatedAt: "2026-07-02T00:00:00.000Z"
          })
        );
        store.saveDecision({
          intentHash: `0x${"a".repeat(64)}`,
          depositTxHash: `0x${"d".repeat(64)}`,
          decision: "matched",
          failureReason: null,
          verifierInputHash: `0x${"9".repeat(64)}`,
          receiptHash: `0x${"8".repeat(64)}`,
          decisionTxHash: null,
          issuedAt: 1790000000,
          standardRpcReceiptStatus: 1,
          depositBlockNumber: 123,
          depositBlockHash: `0x${"c".repeat(64)}`,
          confirmationDepth: 3
        });
        store.createRun(
          run({
            runId: "stale-incomplete",
            idempotencyKey: "stale-incomplete",
            intentHash: "0xstale-incomplete",
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z"
          })
        );
        store.createRun(
          run({
            runId: "stale-matched",
            idempotencyKey: "stale-matched",
            intentHash: "0xstale-matched",
            status: "matched",
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z"
          })
        );
        store.saveSubmittedTx({
          runId: "stale-matched",
          approveTxHash: null,
          depositTxHash: "0xstale-matched-deposit",
          submittedAt: "2026-06-01T00:01:00.000Z"
        });
        store.saveSubmittedTx({
          runId: "stale-incomplete",
          approveTxHash: null,
          depositTxHash: "0xstale-incomplete-deposit",
          submittedAt: "2026-06-01T00:01:00.000Z"
        });
        store.saveVerifierInput({
          runId: "stale-incomplete",
          verifierInputHash: "0xstale-incomplete-verifier",
          canonicalPayload: "{}",
          canonicalPayloadBytesHex: "0x7b7d",
          createdAt: "2026-06-01T00:02:00.000Z"
        });
        store.enqueueVerificationJob({
          tenantId: "local",
          runId: "stale-incomplete",
          reason: "deposit_submitted",
          createdAt: "2026-06-01T00:03:00.000Z"
        });
        store.saveDecision({
          intentHash: "0xstale-matched",
          depositTxHash: "0xstale-matched-deposit",
          decision: "matched",
          failureReason: null,
          verifierInputHash: "0xstale-matched-verifier",
          receiptHash: "0xstale-matched-receipt",
          decisionTxHash: null,
          issuedAt: 1780272000,
          standardRpcReceiptStatus: 1
        });
        store.saveReceipt({
          receiptHash: "0xstale-matched-receipt",
          intentHash: "0xstale-matched",
          payloadJson: "{}",
          canonicalPayload: "{}",
          canonicalPayloadBytesHex: "0x7b7d"
        });
        store.saveVerifierInput({
          runId: "stale-matched",
          verifierInputHash: "0xstale-matched-verifier",
          canonicalPayload: "{}",
          canonicalPayloadBytesHex: "0x7b7d",
          createdAt: "2026-06-01T00:02:00.000Z"
        });
        publishExistingPublicEvidence(
          store,
          "stale-matched",
          publicEvidence({
            receiptHash: "0xstale-matched-receipt",
            intentHash: "0xstale-matched",
            depositTxHash: "0xstale-matched-deposit"
          }),
          "2026-06-01T00:02:00.000Z"
        );
        persistCrashWindowEvidence(store);

        expect(store.getRunForCapabilityHash("run-1", capabilityHash)?.runId).toBe("run-1");
        expect(store.getRunForCapabilityHash("run-1", "b".repeat(64))).toBeUndefined();
        expect(store.checkWritable()).toBe(true);
        expect(store.getSchemaState().migrations).toEqual(REQUIRED_LIVE_MIGRATIONS);
        expect(store.pruneIncompleteRuns("2026-07-01T00:00:00.000Z")).toBe(1);
        expect(store.getRun("stale-incomplete")).toBeUndefined();
        expect(store.getRun("stale-matched")?.status).toBe("matched");
        expect(store.getSubmittedTx("stale-incomplete")).toBeUndefined();
        expect(store.getVerifierInput("0xstale-incomplete-verifier")).toBeUndefined();
        expect(store.getVerificationJobForRun("stale-incomplete")).toBeUndefined();
        expect(store.getRun("stale-decided")?.status).toBe("verifierChecking");
        expect(store.getSubmittedTx("stale-decided")?.depositTxHash).toBe("0xstale-decided-deposit");
        expect(store.getVerifierInput("0xstale-decided-verifier")?.runId).toBe("stale-decided");
        expect(store.getDecisionByIntentHash("0xstale-decided")?.decision).toBe("mismatched");
        expect(store.getVerificationJobForRun("stale-decided")?.status).toBe("pending");
        expect(store.getRun("stale-receipted")?.status).toBe("verifierChecking");
        expect(store.getSubmittedTx("stale-receipted")?.depositTxHash).toBe("0xstale-receipted-deposit");
        expect(store.getVerifierInput("0xstale-receipted-verifier")?.runId).toBe("stale-receipted");
        expect(store.getReceipt("0xstale-receipted-receipt")?.intentHash).toBe("0xstale-receipted");
        expect(store.getReceiptForTenant("local", "0xstale-receipted-receipt")?.intentHash).toBe(
          "0xstale-receipted"
        );
        expect(store.getVerificationJobForRun("stale-receipted")?.status).toBe("pending");
      } finally {
        store.close();
      }

      const reloaded = createSqliteLiveStore(dbPath);
      try {
        expect(reloaded.getRunForCapabilityHash("run-1", capabilityHash)?.capabilityHash).toBe(capabilityHash);
        expect(reloaded.getDecisionByIntentHash(`0x${"a".repeat(64)}`)).toMatchObject({
          standardRpcReceiptStatus: 1,
          depositBlockNumber: 123,
          depositBlockHash: `0x${"c".repeat(64)}`,
          confirmationDepth: 3
        });
        expect(reloaded.getDecisionByIntentHash("0xstale-matched")?.decision).toBe("matched");
        expect(reloaded.getReceipt("0xstale-matched-receipt")?.intentHash).toBe("0xstale-matched");
        expect(
          evidenceStore(reloaded).getPublicEvidenceByIntentHash("0xstale-matched")?.receiptHash
        ).toBe("0xstale-matched-receipt");
        expect(reloaded.getRun("stale-decided")?.status).toBe("verifierChecking");
        expect(reloaded.getVerifierInput("0xstale-decided-verifier")?.runId).toBe("stale-decided");
        expect(reloaded.getDecisionByIntentHash("0xstale-decided")?.decision).toBe("mismatched");
        expect(reloaded.getRun("stale-receipted")?.status).toBe("verifierChecking");
        expect(reloaded.getVerifierInput("0xstale-receipted-verifier")?.runId).toBe("stale-receipted");
        expect(reloaded.getReceipt("0xstale-receipted-receipt")?.intentHash).toBe("0xstale-receipted");
        expect(reloaded.getReceiptForTenant("local", "0xstale-receipted-receipt")?.intentHash).toBe(
          "0xstale-receipted"
        );
      } finally {
        reloaded.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

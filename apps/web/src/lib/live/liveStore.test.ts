import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createMemoryLiveStore, createSqliteLiveStore } from "./liveStore.ts";
import type { LiveStore } from "./liveStore.ts";
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

describe("sqlite live store", () => {
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

  it("preserves the exact public evidence bytes after sqlite reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-live-store-"));
    const dbPath = join(dir, "live.sqlite");
    const record = publicEvidence({
      bundleJson: '{\n  "schemaVersion": "1",\n  "exactBytes": "\\u003c"\n}\n'
    });
    try {
      const first = createSqliteLiveStore(dbPath);
      try {
        const publication = matchedPublication({ publicEvidence: record });
        seedRunForPublication(first, publication);
        atomicEvidenceStore(first).publishMatchedEvidence(publication);
      } finally {
        first.close();
      }

      const second = createSqliteLiveStore(dbPath);
      try {
        expect(evidenceStore(second).getPublicEvidenceByReceiptHash(record.receiptHash)?.bundleJson).toBe(
          record.bundleJson
        );
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

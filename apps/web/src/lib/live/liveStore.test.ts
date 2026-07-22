import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createMemoryLiveStore, createSqliteLiveStore } from "./liveStore.ts";
import type { LiveStore } from "./liveStore.ts";
import { REQUIRED_LIVE_MIGRATIONS } from "./liveSchemaMigrations.ts";
import type { LiveRunRecord } from "./liveTypes.ts";

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
      issuedAt: 1780272000
    });
    store.saveReceipt({
      receiptHash: "0xstale-matched-receipt",
      intentHash: "0xstale-matched",
      payloadJson: "{}",
      canonicalPayload: "{}",
      canonicalPayloadBytesHex: "0x7b7d"
    });
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

describe("sqlite live store", () => {
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
          issuedAt: 1780272000
        });
        store.saveReceipt({
          receiptHash: "0xstale-matched-receipt",
          intentHash: "0xstale-matched",
          payloadJson: "{}",
          canonicalPayload: "{}",
          canonicalPayloadBytesHex: "0x7b7d"
        });
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

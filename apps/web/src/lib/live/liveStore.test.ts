import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createMemoryLiveStore, createSqliteLiveStore } from "./liveStore.ts";
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
});

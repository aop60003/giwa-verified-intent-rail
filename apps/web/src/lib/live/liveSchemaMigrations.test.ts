import { describe, expect, it } from "vitest";

import { evaluateLiveSchemaState, REQUIRED_LIVE_MIGRATIONS } from "./liveSchemaMigrations.ts";

describe("evaluateLiveSchemaState", () => {
  it("tracks every required live store migration", () => {
    expect(REQUIRED_LIVE_MIGRATIONS).toEqual([
      "001_live_base",
      "002_nullable_decision_tx_hash",
      "003_verification_jobs",
      "004_run_capability_hash",
      "005_decision_rpc_metadata"
    ]);
  });

  it("rejects pre-Sprint14 decisions schema", () => {
    const result = evaluateLiveSchemaState({
      migrations: [],
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: true }]
      }
    });

    expect(result).toEqual({
      ok: false,
      reason: "legacy_decision_tx_hash_not_nullable"
    });
  });

  it("requires verification job migration in hosted modes", () => {
    const result = evaluateLiveSchemaState({
      migrations: ["001_live_base", "002_nullable_decision_tx_hash"],
      tables: { decisions: [{ name: "decisionTxHash", notNull: false }] },
      requiredMigrations: ["001_live_base", "002_nullable_decision_tx_hash", "003_verification_jobs"]
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("migration_missing");
  });
});

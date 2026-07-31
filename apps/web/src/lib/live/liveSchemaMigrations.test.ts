import { describe, expect, it } from "vitest";

import { evaluateLiveSchemaState, REQUIRED_LIVE_MIGRATIONS } from "./liveSchemaMigrations.ts";

describe("evaluateLiveSchemaState", () => {
  const publicEvidenceColumns = [
    {
      name: "receiptHash",
      declaredType: "TEXT",
      notNull: false,
      pkPosition: 1
    },
    {
      name: "intentHash",
      declaredType: "TEXT",
      notNull: true,
      pkPosition: 0
    },
    {
      name: "depositTxHash",
      declaredType: "TEXT",
      notNull: true,
      pkPosition: 0
    },
    {
      name: "bundleJson",
      declaredType: "TEXT",
      notNull: true,
      pkPosition: 0
    },
    {
      name: "createdAt",
      declaredType: "TEXT",
      notNull: true,
      pkPosition: 0
    }
  ] as const;
  const publicEvidenceIndexes = [
    {
      name: "public_evidence_pk",
      unique: true,
      origin: "pk",
      partial: false,
      columns: ["receiptHash"]
    },
    {
      name: "public_evidence_intent",
      unique: true,
      origin: "u",
      partial: false,
      columns: ["intentHash"]
    },
    {
      name: "public_evidence_deposit",
      unique: true,
      origin: "u",
      partial: false,
      columns: ["depositTxHash"]
    }
  ] as const;
  const publicEventColumns = [
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
  ] as const;
  const publicEventIndexes = [
    {
      name: "public_campaign_events_pk",
      unique: true,
      origin: "pk",
      partial: false,
      columns: ["eventType", "sessionHash", "campaignId", "missionId"]
    },
    {
      name: "public_campaign_events_aggregate",
      unique: false,
      origin: "c",
      partial: false,
      columns: ["campaignId", "missionId", "eventType", "sessionHash"]
    }
  ] as const;

  it("tracks every required live store migration", () => {
    expect(REQUIRED_LIVE_MIGRATIONS).toEqual([
      "001_live_base",
      "002_nullable_decision_tx_hash",
      "003_verification_jobs",
      "004_run_capability_hash",
      "005_decision_rpc_metadata",
      "006_public_evidence_bundles",
      "007_public_campaign_events"
    ]);
  });

  it("requires the privacy-safe event table shape and composite uniqueness", () => {
    const valid = {
      migrations: [...REQUIRED_LIVE_MIGRATIONS],
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: false }],
        public_evidence_bundles: publicEvidenceColumns,
        public_campaign_events: publicEventColumns
      },
      indexes: {
        public_evidence_bundles: publicEvidenceIndexes,
        public_campaign_events: publicEventIndexes
      },
      requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
    };

    expect(evaluateLiveSchemaState(valid)).toEqual({ ok: true, reason: null });
    expect(
      evaluateLiveSchemaState({
        ...valid,
        tables: {
          ...valid.tables,
          public_campaign_events: publicEventColumns.filter(
            (column) => column.name !== "recordedAt"
          )
        }
      })
    ).toEqual({ ok: false, reason: "migration_missing" });
    expect(
      evaluateLiveSchemaState({
        ...valid,
        indexes: {
          ...valid.indexes,
          public_campaign_events: [
            {
              ...publicEventIndexes[0],
              columns: ["sessionHash", "eventType", "campaignId", "missionId"]
            }
          ]
        }
      })
    ).toEqual({ ok: false, reason: "migration_missing" });
  });

  it.each([
    {
      label: "an extra private column",
      columns: [
        ...publicEventColumns,
        {
          name: "rawSessionId",
          declaredType: "TEXT",
          notNull: true,
          pkPosition: 0
        }
      ]
    },
    {
      label: "the wrong declared type",
      columns: publicEventColumns.map((column) =>
        column.name === "sessionHash"
          ? { ...column, declaredType: "BLOB" }
          : column
      )
    },
    {
      label: "nullable event data",
      columns: publicEventColumns.map((column) =>
        column.name === "recordedAt"
          ? { ...column, notNull: false }
          : column
      )
    },
    {
      label: "a reordered primary key",
      columns: publicEventColumns.map((column) =>
        column.name === "eventType"
          ? { ...column, pkPosition: 2 }
          : column.name === "sessionHash"
            ? { ...column, pkPosition: 1 }
            : column
      )
    }
  ])("rejects the event table with $label", ({ columns }) => {
    const result = evaluateLiveSchemaState({
      migrations: [...REQUIRED_LIVE_MIGRATIONS],
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: false }],
        public_evidence_bundles: publicEvidenceColumns,
        public_campaign_events: columns
      },
      indexes: {
        public_evidence_bundles: publicEvidenceIndexes,
        public_campaign_events: publicEventIndexes
      },
      requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
    });

    expect(result).toEqual({ ok: false, reason: "migration_missing" });
  });

  it("requires the real primary-key origin and aggregation covering index", () => {
    const base = {
      migrations: [...REQUIRED_LIVE_MIGRATIONS],
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: false }],
        public_evidence_bundles: publicEvidenceColumns,
        public_campaign_events: publicEventColumns
      },
      indexes: {
        public_evidence_bundles: publicEvidenceIndexes,
        public_campaign_events: publicEventIndexes
      },
      requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
    };
    const secondaryUniqueInExpectedOrder = {
      ...publicEventIndexes[0],
      name: "secondary_unique",
      origin: "c",
      columns: ["eventType", "sessionHash", "campaignId", "missionId"]
    } as const;

    expect(
      evaluateLiveSchemaState({
        ...base,
        indexes: {
          ...base.indexes,
          public_campaign_events: [
            secondaryUniqueInExpectedOrder,
            publicEventIndexes[1]
          ]
        }
      })
    ).toEqual({ ok: false, reason: "migration_missing" });
    expect(
      evaluateLiveSchemaState({
        ...base,
        indexes: {
          ...base.indexes,
          public_campaign_events: [publicEventIndexes[0]]
        }
      })
    ).toEqual({ ok: false, reason: "migration_missing" });
    expect(
      evaluateLiveSchemaState({
        ...base,
        indexes: {
          ...base.indexes,
          public_campaign_events: [
            publicEventIndexes[0],
            { ...publicEventIndexes[1], partial: true }
          ]
        }
      })
    ).toEqual({ ok: false, reason: "migration_missing" });
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

  it("rejects migration metadata that omits the public evidence table", () => {
    const result = evaluateLiveSchemaState({
      migrations: [...REQUIRED_LIVE_MIGRATIONS],
      tables: { decisions: [{ name: "decisionTxHash", notNull: false }] },
      requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
    });

    expect(result).toEqual({ ok: false, reason: "migration_missing" });
  });

  it("rejects a public evidence table without a Receipt primary key", () => {
    const result = evaluateLiveSchemaState({
      migrations: [...REQUIRED_LIVE_MIGRATIONS],
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: false }],
        public_evidence_bundles: publicEvidenceColumns.map((column) => ({
          ...column,
          pkPosition: 0
        }))
      },
      indexes: { public_evidence_bundles: publicEvidenceIndexes },
      requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
    });

    expect(result).toEqual({ ok: false, reason: "migration_missing" });
  });

  it.each([
    {
      label: "an extra column",
      columns: [
        ...publicEvidenceColumns,
        {
          name: "privatePayload",
          declaredType: "TEXT",
          notNull: true,
          pkPosition: 0
        }
      ]
    },
    {
      label: "a wrong type",
      columns: publicEvidenceColumns.map((column) =>
        column.name === "bundleJson"
          ? { ...column, declaredType: "BLOB" }
          : column
      )
    },
    {
      label: "a nullable required non-primary column",
      columns: publicEvidenceColumns.map((column) =>
        column.name === "createdAt"
          ? { ...column, notNull: false }
          : column
      )
    },
    {
      label: "a second primary-key column",
      columns: publicEvidenceColumns.map((column) =>
        column.name === "intentHash"
          ? { ...column, pkPosition: 2 }
          : column
      )
    }
  ])("rejects the public evidence table with $label", ({ columns }) => {
    const result = evaluateLiveSchemaState({
      migrations: [...REQUIRED_LIVE_MIGRATIONS],
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: false }],
        public_evidence_bundles: columns,
        public_campaign_events: publicEventColumns
      },
      indexes: {
        public_evidence_bundles: publicEvidenceIndexes,
        public_campaign_events: publicEventIndexes
      },
      requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
    });

    expect(result).toEqual({ ok: false, reason: "migration_missing" });
  });

  it.each(["intentHash", "depositTxHash"] as const)(
    "rejects a public evidence table without the unique %s index",
    (missingColumn) => {
      const result = evaluateLiveSchemaState({
        migrations: [...REQUIRED_LIVE_MIGRATIONS],
        tables: {
          decisions: [{ name: "decisionTxHash", notNull: false }],
          public_evidence_bundles: publicEvidenceColumns
        },
        indexes: {
          public_evidence_bundles: publicEvidenceIndexes.filter(
            (index) => index.columns[0] !== missingColumn
          )
        },
        requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
      });

      expect(result).toEqual({ ok: false, reason: "migration_missing" });
    }
  );

  it("accepts the valid public evidence primary key and unique indexes", () => {
    const result = evaluateLiveSchemaState({
      migrations: [...REQUIRED_LIVE_MIGRATIONS],
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: false }],
        public_evidence_bundles: publicEvidenceColumns,
        public_campaign_events: publicEventColumns
      },
      indexes: {
        public_evidence_bundles: publicEvidenceIndexes,
        public_campaign_events: publicEventIndexes
      },
      requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
    });

    expect(result).toEqual({ ok: true, reason: null });
  });
});

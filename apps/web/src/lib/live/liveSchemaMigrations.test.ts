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
  const authTables = {
    organizations: [
      { name: "id", declaredType: "TEXT", notNull: false, pkPosition: 1 },
      { name: "displayName", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "createdAt", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "updatedAt", declaredType: "TEXT", notNull: true, pkPosition: 0 }
    ],
    organization_members: [
      { name: "memberId", declaredType: "TEXT", notNull: false, pkPosition: 1 },
      { name: "organizationId", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "walletAddress", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "role", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "status", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "provisioningSource", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "createdAt", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "updatedAt", declaredType: "TEXT", notNull: true, pkPosition: 0 }
    ],
    auth_challenges: [
      { name: "challengeId", declaredType: "TEXT", notNull: false, pkPosition: 1 },
      { name: "expectedWallet", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "nonceHash", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "origin", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "uri", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "chainId", declaredType: "INTEGER", notNull: true, pkPosition: 0 },
      { name: "issuedAt", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "expiresAt", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "usedAt", declaredType: "TEXT", notNull: false, pkPosition: 0 },
      { name: "attemptCount", declaredType: "INTEGER", notNull: true, pkPosition: 0 },
      { name: "createdAt", declaredType: "TEXT", notNull: true, pkPosition: 0 }
    ],
    auth_sessions: [
      { name: "sessionId", declaredType: "TEXT", notNull: false, pkPosition: 1 },
      { name: "tokenHash", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "memberId", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "createdAt", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "expiresAt", declaredType: "TEXT", notNull: true, pkPosition: 0 },
      { name: "revokedAt", declaredType: "TEXT", notNull: false, pkPosition: 0 }
    ]
  } as const;
  const authIndexes = {
    organizations: [
      { name: "organizations_pk", unique: true, origin: "pk", partial: false, columns: ["id"] }
    ],
    organization_members: [
      { name: "organization_members_pk", unique: true, origin: "pk", partial: false, columns: ["memberId"] },
      { name: "organization_members_unique", unique: true, origin: "u", partial: false, columns: ["organizationId", "walletAddress"] },
      { name: "idx_organization_members_wallet", unique: false, origin: "c", partial: false, columns: ["organizationId", "walletAddress", "status"] },
      { name: "idx_organization_members_member_organization", unique: true, origin: "c", partial: false, columns: ["memberId", "organizationId"] }
    ],
    auth_challenges: [
      { name: "auth_challenges_pk", unique: true, origin: "pk", partial: false, columns: ["challengeId"] },
      { name: "auth_challenges_nonce", unique: true, origin: "u", partial: false, columns: ["nonceHash"] },
      { name: "idx_auth_challenges_expiry", unique: false, origin: "c", partial: false, columns: ["expiresAt", "usedAt"] }
    ],
    auth_sessions: [
      { name: "auth_sessions_pk", unique: true, origin: "pk", partial: false, columns: ["sessionId"] },
      { name: "auth_sessions_token", unique: true, origin: "u", partial: false, columns: ["tokenHash"] },
      { name: "idx_auth_sessions_expiry", unique: false, origin: "c", partial: false, columns: ["expiresAt", "revokedAt"] }
    ]
  } as const;
  const authForeignKeys = {
    organization_members: [
      { from: "organizationId", table: "organizations", to: "id", onDelete: "NO ACTION" }
    ],
    auth_sessions: [
      { from: "memberId", table: "organization_members", to: "memberId", onDelete: "NO ACTION" }
    ]
  } as const;
  const campaignColumns = [
    { name: "campaignId", declaredType: "TEXT", notNull: false, pkPosition: 1 },
    { name: "organizationId", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "name", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "summary", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "actionTemplate", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "lifecycleState", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "source", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "revision", declaredType: "INTEGER", notNull: true, pkPosition: 0 },
    { name: "createdByMemberId", declaredType: "TEXT", notNull: false, pkPosition: 0 },
    { name: "updatedByMemberId", declaredType: "TEXT", notNull: false, pkPosition: 0 },
    { name: "createdAt", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "updatedAt", declaredType: "TEXT", notNull: true, pkPosition: 0 }
  ] as const;
  const campaignIndexes = [
    { name: "campaigns_pk", unique: true, origin: "pk", partial: false, columns: ["campaignId"] },
    {
      name: "idx_campaigns_organization_state_updated",
      unique: false,
      origin: "c",
      partial: false,
      columns: ["organizationId", "lifecycleState", "updatedAt", "campaignId"],
      descending: [false, false, true, false]
    },
    { name: "idx_campaigns_campaign_organization", unique: true, origin: "c", partial: false, columns: ["campaignId", "organizationId"] }
  ] as const;
  const campaignForeignKeys = [
    { from: "updatedByMemberId", table: "organization_members", to: "memberId", onDelete: "RESTRICT" },
    { from: "createdByMemberId", table: "organization_members", to: "memberId", onDelete: "RESTRICT" },
    { from: "organizationId", table: "organizations", to: "id", onDelete: "RESTRICT" }
  ] as const;
  const campaignVersionColumns = [
    { name: "campaignId", declaredType: "TEXT", notNull: true, pkPosition: 1 },
    { name: "organizationId", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "versionNumber", declaredType: "INTEGER", notNull: true, pkPosition: 2 },
    { name: "name", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "summary", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "actionTemplate", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "sourceDraftRevision", declaredType: "INTEGER", notNull: true, pkPosition: 0 },
    { name: "canonicalJson", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "campaignVersionHash", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "publishedByMemberId", declaredType: "TEXT", notNull: true, pkPosition: 0 },
    { name: "publishedAt", declaredType: "TEXT", notNull: true, pkPosition: 0 }
  ] as const;
  const campaignVersionIndexes = [
    { name: "campaign_versions_pk", unique: true, origin: "pk", partial: false, columns: ["campaignId", "versionNumber"] },
    { name: "campaign_versions_revision", unique: true, origin: "u", partial: false, columns: ["campaignId", "sourceDraftRevision"] },
    { name: "campaign_versions_hash", unique: true, origin: "u", partial: false, columns: ["campaignVersionHash"] },
    {
      name: "idx_campaign_versions_org_campaign_version", unique: false, origin: "c", partial: false,
      columns: ["organizationId", "campaignId", "versionNumber"], descending: [false, false, true]
    }
  ] as const;
  const campaignVersionForeignKeys = [
    { id: 0, sequence: 0, from: "publishedByMemberId", table: "organization_members", to: "memberId", onDelete: "RESTRICT" },
    { id: 0, sequence: 1, from: "organizationId", table: "organization_members", to: "organizationId", onDelete: "RESTRICT" },
    { id: 1, sequence: 0, from: "campaignId", table: "campaigns", to: "campaignId", onDelete: "RESTRICT" },
    { id: 1, sequence: 1, from: "organizationId", table: "campaigns", to: "organizationId", onDelete: "RESTRICT" }
  ] as const;

  function validSchemaState() {
    return {
      migrations: [...REQUIRED_LIVE_MIGRATIONS],
      migrationChecksums: {
        "008_studio_wallet_auth": "studio-wallet-auth-v1",
        "009_studio_campaign_drafts": "studio-campaign-drafts-v1",
        "010_campaign_versions": "campaign-versions-v1"
      },
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: false }],
        public_evidence_bundles: publicEvidenceColumns,
        public_campaign_events: publicEventColumns,
        ...authTables,
        campaigns: campaignColumns,
        campaign_versions: campaignVersionColumns
      },
      indexes: {
        public_evidence_bundles: publicEvidenceIndexes,
        public_campaign_events: publicEventIndexes,
        ...authIndexes,
        campaigns: campaignIndexes,
        campaign_versions: campaignVersionIndexes
      },
      foreignKeys: {
        ...authForeignKeys,
        campaigns: campaignForeignKeys,
        campaign_versions: campaignVersionForeignKeys
      },
      tableSql: {
        campaigns: `create table campaigns (
          actionTemplate text check (actionTemplate = 'mockVaultDeposit'),
          lifecycleState text check (lifecycleState in ('draft', 'published-baseline')),
          source text check (source in ('studio-draft', 'gasok-evidence')),
          revision integer check (revision >= 1),
          check (source = 'studio-draft' and lifecycleState = 'draft'
            and createdByMemberId is not null and updatedByMemberId is not null),
          check (source = 'gasok-evidence' and lifecycleState = 'published-baseline'
            and createdByMemberId is null and updatedByMemberId is null)
        )`,
        campaign_versions: `create table campaign_versions (
          versionNumber integer not null check (versionNumber >= 1),
          sourceDraftRevision integer not null check (sourceDraftRevision >= 1),
          actionTemplate text not null check (actionTemplate = 'mockVaultDeposit'),
          canonicalJson text not null check (length(canonicalJson) > 0),
          campaignVersionHash text not null unique check (
            length(campaignVersionHash) = 66 and substr(campaignVersionHash, 1, 2) = '0x'
            and substr(campaignVersionHash, 3) not glob '*[^0-9a-f]*'
          )
        )`
      },
      triggers: [
        { name: "campaign_versions_no_delete", table: "campaign_versions", sql: "create trigger campaign_versions_no_delete before delete on campaign_versions begin select raise(abort, 'campaign_versions_immutable'); end" },
        { name: "campaign_versions_no_update", table: "campaign_versions", sql: "create trigger campaign_versions_no_update before update on campaign_versions begin select raise(abort, 'campaign_versions_immutable'); end" }
      ],
      requiredMigrations: [...REQUIRED_LIVE_MIGRATIONS]
    };
  }

  it("tracks every required live store migration", () => {
    expect(REQUIRED_LIVE_MIGRATIONS).toEqual([
      "001_live_base",
      "002_nullable_decision_tx_hash",
      "003_verification_jobs",
      "004_run_capability_hash",
      "005_decision_rpc_metadata",
      "006_public_evidence_bundles",
      "007_public_campaign_events",
      "008_studio_wallet_auth",
      "009_studio_campaign_drafts",
      "010_campaign_versions"
    ]);
  });

  it("requires exact immutable campaign-version migration artifacts", () => {
    const valid = validSchemaState();
    expect(evaluateLiveSchemaState(valid)).toEqual({ ok: true, reason: null });
    for (const mutated of [
      { ...valid, migrationChecksums: { ...valid.migrationChecksums, "010_campaign_versions": "drifted" } },
      { ...valid, tables: { ...valid.tables, campaign_versions: campaignVersionColumns.slice(0, -1) } },
      { ...valid, indexes: { ...valid.indexes, campaign_versions: campaignVersionIndexes.slice(0, -1) } },
      {
        ...valid,
        indexes: {
          ...valid.indexes,
          campaign_versions: campaignVersionIndexes.map((index) =>
            index.name === "idx_campaign_versions_org_campaign_version"
              ? { ...index, descending: [false, false, false] }
              : index
          )
        }
      },
      { ...valid, foreignKeys: { ...valid.foreignKeys, campaign_versions: campaignVersionForeignKeys.slice(0, -1) } },
      {
        ...valid,
        foreignKeys: {
          ...valid.foreignKeys,
          campaign_versions: campaignVersionForeignKeys.map((foreignKey) =>
            foreignKey.from === "organizationId" && foreignKey.table === "campaigns"
              ? { ...foreignKey, to: "campaignId" }
              : foreignKey
          )
        }
      },
      { ...valid, tableSql: { ...valid.tableSql, campaign_versions: "create table campaign_versions ()" } },
      {
        ...valid,
        tableSql: {
          ...valid.tableSql,
          campaign_versions: valid.tableSql.campaign_versions.replace(
            "and substr(campaignVersionHash, 1, 2) = '0x'",
            "or substr(campaignVersionHash, 1, 2) = '0x'"
          )
        }
      },
      { ...valid, triggers: valid.triggers?.slice(0, -1) }
      , {
        ...valid,
        triggers: valid.triggers?.map((trigger) =>
          trigger.name === "campaign_versions_no_update"
            ? { ...trigger, sql: trigger.sql.replace("raise(abort", "raise(ignore") }
            : trigger
        )
      }
    ]) {
      expect(evaluateLiveSchemaState(mutated)).toEqual({ ok: false, reason: "migration_missing" });
    }
  });

  it("requires the exact Studio auth tables, indexes, and foreign keys", () => {
    const valid = validSchemaState();
    expect(evaluateLiveSchemaState(valid)).toEqual({ ok: true, reason: null });

    expect(evaluateLiveSchemaState({
      ...valid,
      tables: {
        ...valid.tables,
        auth_challenges: authTables.auth_challenges.map((column) =>
          column.name === "chainId" ? { ...column, declaredType: "TEXT" } : column
        )
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      indexes: {
        ...valid.indexes,
        organization_members: authIndexes.organization_members.filter(
          (index) => index.columns.length !== 2
        )
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      foreignKeys: {
        ...authForeignKeys,
        auth_sessions: []
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
  });

  it("rejects migration 008 checksum drift", () => {
    const valid = validSchemaState();

    expect(evaluateLiveSchemaState({
      ...valid,
      migrationChecksums: {
        "008_studio_wallet_auth": "drifted-checksum"
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
  });

  it("requires the exact Studio campaign table, index, foreign keys, and checksum", () => {
    const valid = validSchemaState();
    expect(REQUIRED_LIVE_MIGRATIONS).toContain("009_studio_campaign_drafts");
    expect(evaluateLiveSchemaState(valid)).toEqual({ ok: true, reason: null });
    expect(evaluateLiveSchemaState({
      ...valid,
      migrationChecksums: {
        ...valid.migrationChecksums,
        "009_studio_campaign_drafts": "drifted"
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      tables: { ...valid.tables, campaigns: campaignColumns.slice(0, -1) }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      indexes: { ...valid.indexes, campaigns: [campaignIndexes[0]] }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      indexes: {
        ...valid.indexes,
        campaigns: campaignIndexes.map((index) =>
          index.name === "idx_campaigns_organization_state_updated"
            ? { ...index, descending: [false, false, false, false] }
            : index
        )
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      foreignKeys: { ...valid.foreignKeys, campaigns: campaignForeignKeys.slice(1) }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      foreignKeys: {
        ...valid.foreignKeys,
        campaigns: campaignForeignKeys.map((foreignKey) =>
          foreignKey.from === "organizationId" ? { ...foreignKey, onDelete: "CASCADE" } : foreignKey
        )
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      foreignKeys: {
        ...valid.foreignKeys,
        campaigns: campaignForeignKeys.map((foreignKey) =>
          foreignKey.from === "createdByMemberId" ? { ...foreignKey, onDelete: "SET NULL" } : foreignKey
        )
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      tableSql: {
        campaigns: valid.tableSql.campaigns.replace(
          "revision integer check (revision >= 1),\n          ",
          ""
        )
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      tableSql: {
        campaigns: valid.tableSql.campaigns.replace(
          "and createdByMemberId is not null and updatedByMemberId is not null",
          "and createdByMemberId is not null"
        )
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
    expect(evaluateLiveSchemaState({
      ...valid,
      tableSql: {
        campaigns: valid.tableSql.campaigns.replace(
          "and createdByMemberId is null and updatedByMemberId is null",
          "and createdByMemberId is null"
        )
      }
    })).toEqual({ ok: false, reason: "migration_missing" });
  });

  it("requires the privacy-safe event table shape and composite uniqueness", () => {
    const valid = validSchemaState();

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
    const result = evaluateLiveSchemaState(validSchemaState());

    expect(result).toEqual({ ok: true, reason: null });
  });
});

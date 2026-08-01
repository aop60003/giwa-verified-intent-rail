export type LiveSchemaColumn = {
  name: string;
  declaredType?: string;
  notNull: boolean;
  pkPosition?: number;
};

export type LiveSchemaIndex = {
  name: string;
  unique: boolean;
  origin?: string;
  partial?: boolean;
  columns: readonly string[];
  descending?: readonly boolean[];
};

export type LiveSchemaForeignKey = {
  id?: number;
  sequence?: number;
  from: string;
  table: string;
  to: string;
  onDelete: string;
};

export type LiveSchemaTrigger = { name: string; table: string; sql: string };

export type LiveSchemaStateInput = {
  migrations: readonly string[];
  migrationChecksums?: Readonly<Record<string, string>>;
  tables: Record<string, readonly LiveSchemaColumn[]>;
  indexes?: Record<string, readonly LiveSchemaIndex[]>;
  foreignKeys?: Record<string, readonly LiveSchemaForeignKey[]>;
  tableSql?: Readonly<Record<string, string>>;
  triggers?: readonly LiveSchemaTrigger[];
  requiredMigrations?: readonly string[];
};

export type LiveSchemaStateResult =
  | { ok: true; reason: null }
  | { ok: false; reason: "legacy_decision_tx_hash_not_nullable" | "migration_missing" };

export const REQUIRED_LIVE_MIGRATIONS = [
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
] as const;

type ExpectedColumn = {
  name: string;
  declaredType: "TEXT" | "INTEGER";
  notNull: boolean;
  pkPosition: number;
};

function hasExactColumns(
  actual: readonly LiveSchemaColumn[] | undefined,
  expected: readonly ExpectedColumn[]
): boolean {
  return (
    actual?.length === expected.length &&
    expected.every((expectedColumn, index) => {
      const actualColumn = actual[index];
      return (
        actualColumn?.name === expectedColumn.name &&
        actualColumn.declaredType?.toUpperCase() === expectedColumn.declaredType &&
        actualColumn.notNull === expectedColumn.notNull &&
        actualColumn.pkPosition === expectedColumn.pkPosition
      );
    })
  );
}

function hasExactIndex(
  indexes: readonly LiveSchemaIndex[] | undefined,
  expected: {
    name?: string;
    unique: boolean;
    origin: string;
    columns: readonly string[];
    descending?: readonly boolean[];
  }
): boolean {
  return indexes?.some((index) =>
    (expected.name === undefined || index.name === expected.name) &&
    index.unique === expected.unique &&
    index.origin === expected.origin &&
    index.partial === false &&
    index.columns.length === expected.columns.length &&
    expected.columns.every((column, position) => index.columns[position] === column) &&
    (expected.descending === undefined ||
      (index.descending?.length === expected.descending.length &&
        expected.descending.every(
          (isDescending, position) => index.descending?.[position] === isDescending
        )))
  ) === true;
}

function normalizedSql(sql: string): string {
  return sql.replace(/\s+/gu, " ").trim().toLowerCase();
}

function hasGroupedForeignKey(
  foreignKeys: readonly LiveSchemaForeignKey[] | undefined,
  expectedTable: string,
  expectedPairs: readonly [string, string][]
): boolean {
  if (foreignKeys === undefined) return false;
  const groups = new Map<number, LiveSchemaForeignKey[]>();
  for (const foreignKey of foreignKeys) {
    if (foreignKey.id === undefined || foreignKey.sequence === undefined) return false;
    const group = groups.get(foreignKey.id) ?? [];
    group.push(foreignKey);
    groups.set(foreignKey.id, group);
  }
  return [...groups.values()].some((group) =>
    group.length === expectedPairs.length && group.every((foreignKey, index) =>
      foreignKey.table === expectedTable && foreignKey.onDelete.toUpperCase() === "RESTRICT" &&
      foreignKey.sequence === index && foreignKey.from === expectedPairs[index]![0] &&
      foreignKey.to === expectedPairs[index]![1]
    )
  );
}

export function evaluateLiveSchemaState(input: LiveSchemaStateInput): LiveSchemaStateResult {
  const decisionTxHash = input.tables.decisions?.find((column) => column.name === "decisionTxHash");
  if (decisionTxHash?.notNull === true) return { ok: false, reason: "legacy_decision_tx_hash_not_nullable" };

  const required = input.requiredMigrations ?? [];
  for (const migration of required) {
    if (!input.migrations.includes(migration)) return { ok: false, reason: "migration_missing" };
  }

  if (
    required.includes("008_studio_wallet_auth") &&
    input.migrationChecksums?.["008_studio_wallet_auth"] !== "studio-wallet-auth-v1"
  ) {
    return { ok: false, reason: "migration_missing" };
  }

  if (
    required.includes("009_studio_campaign_drafts") &&
    input.migrationChecksums?.["009_studio_campaign_drafts"] !== "studio-campaign-drafts-v1"
  ) {
    return { ok: false, reason: "migration_missing" };
  }

  if (required.includes("006_public_evidence_bundles")) {
    const evidenceColumns = input.tables.public_evidence_bundles ?? [];
    const expectedEvidenceColumns = [
      "receiptHash",
      "intentHash",
      "depositTxHash",
      "bundleJson",
      "createdAt"
    ];
    if (
      evidenceColumns.length !== expectedEvidenceColumns.length ||
      expectedEvidenceColumns.some((name, index) => {
        const column = evidenceColumns[index];
        return (
          column?.name !== name ||
          column.declaredType?.toUpperCase() !== "TEXT" ||
          column.pkPosition !== (name === "receiptHash" ? 1 : 0) ||
          (name !== "receiptHash" && column.notNull !== true)
        );
      })
    ) {
      return { ok: false, reason: "migration_missing" };
    }
    const evidenceIndexes = input.indexes?.public_evidence_bundles ?? [];
    const hasReceiptPrimaryKey = evidenceIndexes.some(
      (index) =>
        index.unique &&
        index.origin === "pk" &&
        index.columns.length === 1 &&
        index.columns[0] === "receiptHash"
    );
    if (!hasReceiptPrimaryKey) {
      return { ok: false, reason: "migration_missing" };
    }
    for (const column of ["intentHash", "depositTxHash"]) {
      const hasUniqueIndex = evidenceIndexes.some(
        (index) =>
          index.unique &&
          index.origin === "u" &&
          index.columns.length === 1 &&
          index.columns[0] === column
      );
      if (!hasUniqueIndex) return { ok: false, reason: "migration_missing" };
    }
  }

  if (required.includes("007_public_campaign_events")) {
    const eventColumns = input.tables.public_campaign_events ?? [];
    const expectedEventColumns = [
      { name: "eventType", pkPosition: 1 },
      { name: "sessionHash", pkPosition: 2 },
      { name: "campaignId", pkPosition: 3 },
      { name: "missionId", pkPosition: 4 },
      { name: "recordedAt", pkPosition: 0 }
    ] as const;
    if (
      eventColumns.length !== expectedEventColumns.length ||
      expectedEventColumns.some((expected, index) => {
        const column = eventColumns[index];
        return (
          column?.name !== expected.name ||
          column.declaredType?.toUpperCase() !== "TEXT" ||
          column.notNull !== true ||
          column.pkPosition !== expected.pkPosition
        );
      })
    ) {
      return { ok: false, reason: "migration_missing" };
    }
    const eventIndexes = input.indexes?.public_campaign_events ?? [];
    const hasCompositePrimaryKey = eventIndexes.some(
      (index) =>
        index.unique &&
        index.origin === "pk" &&
        index.columns.length === 4 &&
        index.columns[0] === "eventType" &&
        index.columns[1] === "sessionHash" &&
        index.columns[2] === "campaignId" &&
        index.columns[3] === "missionId"
    );
    if (!hasCompositePrimaryKey) {
      return { ok: false, reason: "migration_missing" };
    }
    const hasAggregateCoveringIndex = eventIndexes.some(
      (index) =>
        !index.unique &&
        index.origin === "c" &&
        index.partial === false &&
        index.columns.length === 4 &&
        index.columns[0] === "campaignId" &&
        index.columns[1] === "missionId" &&
        index.columns[2] === "eventType" &&
        index.columns[3] === "sessionHash"
    );
    if (!hasAggregateCoveringIndex) {
      return { ok: false, reason: "migration_missing" };
    }
  }

  if (required.includes("008_studio_wallet_auth")) {
    const authTableShapes = {
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
    for (const [tableName, shape] of Object.entries(authTableShapes)) {
      if (!hasExactColumns(input.tables[tableName], shape)) {
        return { ok: false, reason: "migration_missing" };
      }
    }

    const requiredIndexes = [
      {
        table: "organization_members",
        unique: true,
        origin: "u",
        columns: ["organizationId", "walletAddress"]
      },
      {
        table: "organization_members",
        name: "idx_organization_members_wallet",
        unique: false,
        origin: "c",
        columns: ["organizationId", "walletAddress", "status"]
      },
      {
        table: "auth_challenges",
        unique: true,
        origin: "u",
        columns: ["nonceHash"]
      },
      {
        table: "auth_challenges",
        name: "idx_auth_challenges_expiry",
        unique: false,
        origin: "c",
        columns: ["expiresAt", "usedAt"]
      },
      {
        table: "auth_sessions",
        unique: true,
        origin: "u",
        columns: ["tokenHash"]
      },
      {
        table: "auth_sessions",
        name: "idx_auth_sessions_expiry",
        unique: false,
        origin: "c",
        columns: ["expiresAt", "revokedAt"]
      }
    ] as const;
    for (const expected of requiredIndexes) {
      if (!hasExactIndex(input.indexes?.[expected.table], expected)) {
        return { ok: false, reason: "migration_missing" };
      }
    }

    const memberForeignKeys = input.foreignKeys?.organization_members ?? [];
    const sessionForeignKeys = input.foreignKeys?.auth_sessions ?? [];
    if (
      memberForeignKeys.length !== 1 ||
      memberForeignKeys[0]?.from !== "organizationId" ||
      memberForeignKeys[0]?.table !== "organizations" ||
      memberForeignKeys[0]?.to !== "id" ||
      sessionForeignKeys.length !== 1 ||
      sessionForeignKeys[0]?.from !== "memberId" ||
      sessionForeignKeys[0]?.table !== "organization_members" ||
      sessionForeignKeys[0]?.to !== "memberId"
    ) {
      return { ok: false, reason: "migration_missing" };
    }
  }

  if (required.includes("009_studio_campaign_drafts")) {
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
    if (!hasExactColumns(input.tables.campaigns, campaignColumns)) {
      return { ok: false, reason: "migration_missing" };
    }
    if (!hasExactIndex(input.indexes?.campaigns, {
      name: "idx_campaigns_organization_state_updated",
      unique: false,
      origin: "c",
      columns: ["organizationId", "lifecycleState", "updatedAt", "campaignId"],
      descending: [false, false, true, false]
    })) {
      return { ok: false, reason: "migration_missing" };
    }
    const campaignForeignKeys = input.foreignKeys?.campaigns ?? [];
    const expectedForeignKeys = [
      { from: "updatedByMemberId", table: "organization_members", to: "memberId" },
      { from: "createdByMemberId", table: "organization_members", to: "memberId" },
      { from: "organizationId", table: "organizations", to: "id" }
    ];
    if (
      campaignForeignKeys.length !== expectedForeignKeys.length ||
      expectedForeignKeys.some((expected, index) => {
        const actual = campaignForeignKeys[index];
        return (
          actual?.from !== expected.from ||
          actual.table !== expected.table ||
          actual.to !== expected.to ||
          actual.onDelete.toUpperCase() !== "RESTRICT"
        );
      })
    ) return { ok: false, reason: "migration_missing" };

    const campaignSql = input.tableSql?.campaigns?.replace(/\s+/gu, " ").toLowerCase();
    if (
      campaignSql === undefined ||
      !campaignSql.includes("check (actiontemplate = 'mockvaultdeposit')") ||
      !campaignSql.includes("check (lifecyclestate in ('draft', 'published-baseline'))") ||
      !campaignSql.includes("check (source in ('studio-draft', 'gasok-evidence'))") ||
      !/check\s*\(\s*revision\s*>=\s*1\s*\)/u.test(campaignSql) ||
      !campaignSql.includes(
        "source = 'studio-draft' and lifecyclestate = 'draft' and createdbymemberid is not null and updatedbymemberid is not null"
      ) ||
      !campaignSql.includes(
        "source = 'gasok-evidence' and lifecyclestate = 'published-baseline' and createdbymemberid is null and updatedbymemberid is null"
      )
    ) return { ok: false, reason: "migration_missing" };
  }

  if (required.includes("010_campaign_versions")) {
    if (input.migrationChecksums?.["010_campaign_versions"] !== "campaign-versions-v1") {
      return { ok: false, reason: "migration_missing" };
    }
    const versionColumns = [
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
    if (!hasExactColumns(input.tables.campaign_versions, versionColumns) ||
      !hasExactIndex(input.indexes?.campaigns, {
        name: "idx_campaigns_campaign_organization", unique: true, origin: "c",
        columns: ["campaignId", "organizationId"]
      }) ||
      !hasExactIndex(input.indexes?.organization_members, {
        name: "idx_organization_members_member_organization", unique: true, origin: "c",
        columns: ["memberId", "organizationId"]
      }) ||
      !hasExactIndex(input.indexes?.campaign_versions, {
        unique: true, origin: "pk", columns: ["campaignId", "versionNumber"]
      }) ||
      !hasExactIndex(input.indexes?.campaign_versions, {
        unique: true, origin: "u", columns: ["campaignId", "sourceDraftRevision"]
      }) ||
      !hasExactIndex(input.indexes?.campaign_versions, {
        unique: true, origin: "u", columns: ["campaignVersionHash"]
      }) ||
      !hasExactIndex(input.indexes?.campaign_versions, {
        name: "idx_campaign_versions_org_campaign_version", unique: false, origin: "c",
        columns: ["organizationId", "campaignId", "versionNumber"], descending: [false, false, true]
      }) ||
      !hasGroupedForeignKey(input.foreignKeys?.campaign_versions, "campaigns", [
        ["campaignId", "campaignId"], ["organizationId", "organizationId"]
      ]) ||
      !hasGroupedForeignKey(input.foreignKeys?.campaign_versions, "organization_members", [
        ["publishedByMemberId", "memberId"], ["organizationId", "organizationId"]
      ])) return { ok: false, reason: "migration_missing" };

    const versionSql = input.tableSql?.campaign_versions;
    const expectedTriggers = [
      ["campaign_versions_no_delete", "create trigger campaign_versions_no_delete before delete on campaign_versions begin select raise(abort, 'campaign_versions_immutable'); end"],
      ["campaign_versions_no_update", "create trigger campaign_versions_no_update before update on campaign_versions begin select raise(abort, 'campaign_versions_immutable'); end"]
    ] as const;
    const normalizedVersionSql = versionSql === undefined ? undefined : normalizedSql(versionSql);
    const hasExactHashCheck = normalizedVersionSql !== undefined &&
      /check\s*\(\s*length\(campaignversionhash\)\s*=\s*66\s+and\s+substr\(campaignversionhash,\s*1,\s*2\)\s*=\s*'0x'\s+and\s+substr\(campaignversionhash,\s*3\)\s+not\s+glob\s+'\*\[\^0-9a-f\]\*'\s*\)/u.test(normalizedVersionSql);
    if (versionSql === undefined ||
      !normalizedSql(versionSql).includes("check (actiontemplate = 'mockvaultdeposit')") ||
      !/check\s*\(\s*versionnumber\s*>=\s*1\s*\)/u.test(normalizedSql(versionSql)) ||
      !/check\s*\(\s*sourcedraftrevision\s*>=\s*1\s*\)/u.test(normalizedSql(versionSql)) ||
      !normalizedSql(versionSql).includes("check (length(canonicaljson) > 0)") ||
      !hasExactHashCheck ||
      input.triggers?.length !== expectedTriggers.length ||
      !expectedTriggers.every(([name, sql]) => input.triggers?.some((trigger) =>
        trigger.name === name && trigger.table === "campaign_versions" && normalizedSql(trigger.sql) === sql
      ))) return { ok: false, reason: "migration_missing" };
  }

  return { ok: true, reason: null };
}

export type LiveRepositoryCapabilities = {
  tenantScopedRuns: boolean;
  verificationJobs: boolean;
  schemaMigrations: boolean;
  transactionalDecisions: boolean;
};

export function repositoryCapabilitiesReady(capabilities: LiveRepositoryCapabilities): boolean {
  return (
    capabilities.tenantScopedRuns &&
    capabilities.verificationJobs &&
    capabilities.schemaMigrations &&
    capabilities.transactionalDecisions
  );
}

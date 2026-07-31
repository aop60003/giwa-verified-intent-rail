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
};

export type LiveSchemaStateInput = {
  migrations: readonly string[];
  tables: Record<string, readonly LiveSchemaColumn[]>;
  indexes?: Record<string, readonly LiveSchemaIndex[]>;
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
  "007_public_campaign_events"
] as const;

export function evaluateLiveSchemaState(input: LiveSchemaStateInput): LiveSchemaStateResult {
  const decisionTxHash = input.tables.decisions?.find((column) => column.name === "decisionTxHash");
  if (decisionTxHash?.notNull === true) return { ok: false, reason: "legacy_decision_tx_hash_not_nullable" };

  const required = input.requiredMigrations ?? [];
  for (const migration of required) {
    if (!input.migrations.includes(migration)) return { ok: false, reason: "migration_missing" };
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

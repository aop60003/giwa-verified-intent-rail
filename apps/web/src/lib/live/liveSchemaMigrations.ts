export type LiveSchemaColumn = {
  name: string;
  notNull: boolean;
};

export type LiveSchemaStateInput = {
  migrations: readonly string[];
  tables: Record<string, readonly LiveSchemaColumn[]>;
  requiredMigrations?: readonly string[];
};

export type LiveSchemaStateResult =
  | { ok: true; reason: null }
  | { ok: false; reason: "legacy_decision_tx_hash_not_nullable" | "migration_missing" };

export const REQUIRED_LIVE_MIGRATIONS = [
  "001_live_base",
  "002_nullable_decision_tx_hash",
  "003_verification_jobs"
] as const;

export function evaluateLiveSchemaState(input: LiveSchemaStateInput): LiveSchemaStateResult {
  const decisionTxHash = input.tables.decisions?.find((column) => column.name === "decisionTxHash");
  if (decisionTxHash?.notNull === true) return { ok: false, reason: "legacy_decision_tx_hash_not_nullable" };

  const required = input.requiredMigrations ?? [];
  for (const migration of required) {
    if (!input.migrations.includes(migration)) return { ok: false, reason: "migration_missing" };
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

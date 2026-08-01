import type { DatabaseSync } from "node:sqlite";

import type {
  StudioCampaignRecord,
  StudioCampaignRepository,
  StudioCampaignUpdateResult
} from "./studioCampaignRepository.ts";

export const STUDIO_CAMPAIGN_MIGRATION_ID = "009_studio_campaign_drafts";
export const STUDIO_CAMPAIGN_MIGRATION_CHECKSUM = "studio-campaign-drafts-v1";

function stringValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`${key} is not a string`);
  return value;
}

function nullableStringValue(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`${key} is not a string`);
  return value;
}

function numberValue(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  const numeric = typeof value === "bigint" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isSafeInteger(numeric)) {
    throw new Error(`${key} is not a safe integer`);
  }
  return numeric;
}

function rowToCampaign(row: Record<string, unknown>): StudioCampaignRecord {
  const actionTemplate = stringValue(row, "actionTemplate");
  const lifecycleState = stringValue(row, "lifecycleState");
  const source = stringValue(row, "source");
  const record: StudioCampaignRecord = {
    campaignId: stringValue(row, "campaignId"),
    organizationId: stringValue(row, "organizationId"),
    name: stringValue(row, "name"),
    summary: stringValue(row, "summary"),
    actionTemplate: actionTemplate as StudioCampaignRecord["actionTemplate"],
    lifecycleState: lifecycleState as StudioCampaignRecord["lifecycleState"],
    source: source as StudioCampaignRecord["source"],
    revision: numberValue(row, "revision"),
    createdByMemberId: nullableStringValue(row, "createdByMemberId"),
    updatedByMemberId: nullableStringValue(row, "updatedByMemberId"),
    createdAt: stringValue(row, "createdAt"),
    updatedAt: stringValue(row, "updatedAt")
  };
  const validDraft = record.source === "studio-draft" &&
    record.lifecycleState === "draft" &&
    record.createdByMemberId !== null &&
    record.updatedByMemberId !== null;
  const validBaseline = record.source === "gasok-evidence" &&
    record.lifecycleState === "published-baseline" &&
    record.createdByMemberId === null &&
    record.updatedByMemberId === null;
  if (
    record.actionTemplate !== "mockVaultDeposit" ||
    record.revision < 1 ||
    (!validDraft && !validBaseline)
  ) throw new Error("invalid_studio_campaign");
  return record;
}

function assertCampaignRecord(record: StudioCampaignRecord): void {
  const validDraft = record.source === "studio-draft" &&
    record.lifecycleState === "draft" &&
    record.createdByMemberId !== null &&
    record.updatedByMemberId !== null;
  const validBaseline = record.source === "gasok-evidence" &&
    record.lifecycleState === "published-baseline" &&
    record.createdByMemberId === null &&
    record.updatedByMemberId === null;
  if (
    record.actionTemplate !== "mockVaultDeposit" ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 1 ||
    (!validDraft && !validBaseline)
  ) throw new Error("invalid_studio_campaign");
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

export function installStudioCampaignMigration(db: DatabaseSync, appliedAt: string): void {
  db.exec("pragma foreign_keys = on");
  db.exec("begin immediate");
  try {
    db.exec(`
      create table if not exists campaigns (
        campaignId text primary key,
        organizationId text not null,
        name text not null,
        summary text not null,
        actionTemplate text not null check (actionTemplate = 'mockVaultDeposit'),
        lifecycleState text not null
          check (lifecycleState in ('draft', 'published-baseline')),
        source text not null
          check (source in ('studio-draft', 'gasok-evidence')),
        revision integer not null check (revision >= 1),
        createdByMemberId text,
        updatedByMemberId text,
        createdAt text not null,
        updatedAt text not null,
        foreign key (organizationId) references organizations(id) on delete restrict,
        foreign key (createdByMemberId) references organization_members(memberId) on delete restrict,
        foreign key (updatedByMemberId) references organization_members(memberId) on delete restrict,
        check (
          (source = 'studio-draft' and lifecycleState = 'draft'
            and createdByMemberId is not null and updatedByMemberId is not null)
          or
          (source = 'gasok-evidence' and lifecycleState = 'published-baseline'
            and createdByMemberId is null and updatedByMemberId is null)
        )
      );
      create index if not exists idx_campaigns_organization_state_updated
        on campaigns (organizationId, lifecycleState, updatedAt desc, campaignId);
    `);
    db.prepare(
      "insert or ignore into schema_migrations (id, checksum, appliedAt) values (?, ?, ?)"
    ).run(STUDIO_CAMPAIGN_MIGRATION_ID, STUDIO_CAMPAIGN_MIGRATION_CHECKSUM, appliedAt);
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

export function createSqliteStudioCampaignRepository(db: DatabaseSync): StudioCampaignRepository {
  const listForOrganization = db.prepare(
    `select * from campaigns
     where organizationId = ?
     order by
       case when lifecycleState = 'published-baseline' then 0 else 1 end,
       updatedAt desc,
       campaignId asc`
  );
  const findDraftForOrganization = db.prepare(
    `select * from campaigns
     where campaignId = ? and organizationId = ?
       and lifecycleState = 'draft' and source = 'studio-draft'`
  );
  const updateDraft = db.prepare(
    `update campaigns
     set name = ?, summary = ?, updatedByMemberId = ?, updatedAt = ?,
         revision = revision + 1
     where campaignId = ? and organizationId = ?
       and lifecycleState = 'draft' and source = 'studio-draft'
       and revision = ?
     returning *`
  );

  return {
    bootstrapPublishedBaseline(record) {
      assertCampaignRecord(record);
      if (record.source !== "gasok-evidence" || record.lifecycleState !== "published-baseline") {
        throw new Error("studio_campaign_baseline_conflict");
      }
      const existing = db.prepare("select * from campaigns where campaignId = ?").get(record.campaignId);
      if (existing !== undefined) {
        const campaign = rowToCampaign(existing);
        if (
          campaign.organizationId !== record.organizationId ||
          campaign.source !== record.source ||
          campaign.lifecycleState !== record.lifecycleState
        ) throw new Error("studio_campaign_baseline_conflict");
        return campaign;
      }
      db.prepare(
        `insert into campaigns (
          campaignId, organizationId, name, summary, actionTemplate, lifecycleState, source, revision,
          createdByMemberId, updatedByMemberId, createdAt, updatedAt
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        record.campaignId, record.organizationId, record.name, record.summary, record.actionTemplate,
        record.lifecycleState, record.source, record.revision, record.createdByMemberId,
        record.updatedByMemberId, record.createdAt, record.updatedAt
      );
      return { ...record };
    },

    listForOrganization(organizationId) {
      return listForOrganization.all(organizationId).map(rowToCampaign);
    },

    createDraft(record) {
      assertCampaignRecord(record);
      if (record.source !== "studio-draft" || record.lifecycleState !== "draft") {
        throw new Error("invalid_studio_campaign");
      }
      try {
        db.prepare(
          `insert into campaigns (
            campaignId, organizationId, name, summary, actionTemplate, lifecycleState, source, revision,
            createdByMemberId, updatedByMemberId, createdAt, updatedAt
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          record.campaignId, record.organizationId, record.name, record.summary, record.actionTemplate,
          record.lifecycleState, record.source, record.revision, record.createdByMemberId,
          record.updatedByMemberId, record.createdAt, record.updatedAt
        );
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new Error("duplicate_studio_campaign");
        throw error;
      }
      return { ...record };
    },

    updateDraft(input): StudioCampaignUpdateResult {
      const existing = findDraftForOrganization.get(input.campaignId, input.organizationId);
      if (existing !== undefined) {
        const campaign = rowToCampaign(existing);
        if (campaign.revision === input.expectedRevision && campaign.revision >= Number.MAX_SAFE_INTEGER) {
          throw new Error("studio_campaign_revision_exhausted");
        }
      }
      const row = updateDraft.get(
        input.name,
        input.summary,
        input.updatedByMemberId,
        input.updatedAt,
        input.campaignId,
        input.organizationId,
        input.expectedRevision
      );
      if (row !== undefined) return { ok: true, campaign: rowToCampaign(row) };
      return findDraftForOrganization.get(input.campaignId, input.organizationId) !== undefined
        ? { ok: false, reason: "revision_conflict" }
        : { ok: false, reason: "not_found" };
    }
  };
}

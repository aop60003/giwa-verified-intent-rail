import type { DatabaseSync } from "node:sqlite";

import { isPositiveSafeInteger } from "./studioCampaignIdentifier.ts";
import type { StudioCampaignRecord } from "./studioCampaignRepository.ts";
import type {
  StudioCampaignVersionPublicationResult,
  StudioCampaignVersionRecord,
  StudioCampaignVersionRepository
} from "./studioCampaignVersionRepository.ts";

export const STUDIO_CAMPAIGN_VERSION_MIGRATION_ID = "010_campaign_versions";
export const STUDIO_CAMPAIGN_VERSION_MIGRATION_CHECKSUM = "campaign-versions-v1";

const VERSION_HASH = /^0x[0-9a-f]{64}$/u;

function stringValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`${key} is not a string`);
  return value;
}

function numberValue(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  const numeric = typeof value === "bigint" ? Number(value) : value;
  if (!isPositiveSafeInteger(numeric)) throw new Error(`${key} is not a positive safe integer`);
  return numeric;
}

function rowToCampaign(row: Record<string, unknown>): StudioCampaignRecord {
  const campaign: StudioCampaignRecord = {
    campaignId: stringValue(row, "campaignId"),
    organizationId: stringValue(row, "organizationId"),
    name: stringValue(row, "name"),
    summary: stringValue(row, "summary"),
    actionTemplate: stringValue(row, "actionTemplate") as "mockVaultDeposit",
    lifecycleState: stringValue(row, "lifecycleState") as "draft",
    source: stringValue(row, "source") as "studio-draft",
    revision: numberValue(row, "revision"),
    createdByMemberId: stringValue(row, "createdByMemberId"),
    updatedByMemberId: stringValue(row, "updatedByMemberId"),
    createdAt: stringValue(row, "createdAt"),
    updatedAt: stringValue(row, "updatedAt")
  };
  if (campaign.actionTemplate !== "mockVaultDeposit" || campaign.lifecycleState !== "draft" ||
    campaign.source !== "studio-draft") throw new Error("invalid_studio_campaign");
  return campaign;
}

function rowToCampaignVersion(row: Record<string, unknown>): StudioCampaignVersionRecord {
  const record: StudioCampaignVersionRecord = {
    campaignId: stringValue(row, "campaignId"),
    organizationId: stringValue(row, "organizationId"),
    versionNumber: numberValue(row, "versionNumber"),
    name: stringValue(row, "name"),
    summary: stringValue(row, "summary"),
    actionTemplate: stringValue(row, "actionTemplate") as "mockVaultDeposit",
    sourceDraftRevision: numberValue(row, "sourceDraftRevision"),
    canonicalJson: stringValue(row, "canonicalJson"),
    campaignVersionHash: stringValue(row, "campaignVersionHash") as `0x${string}`,
    publishedByMemberId: stringValue(row, "publishedByMemberId"),
    publishedAt: stringValue(row, "publishedAt")
  };
  if (record.actionTemplate !== "mockVaultDeposit" || record.canonicalJson.length === 0 ||
    !VERSION_HASH.test(record.campaignVersionHash)) throw new Error("invalid_studio_campaign_version");
  return record;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

function isDraft(campaign: StudioCampaignRecord): boolean {
  return campaign.source === "studio-draft" && campaign.lifecycleState === "draft";
}

function hasSameSemanticContent(version: StudioCampaignVersionRecord, campaign: StudioCampaignRecord): boolean {
  return version.name === campaign.name && version.summary === campaign.summary &&
    version.actionTemplate === campaign.actionTemplate;
}

function assertBuiltVersion(
  version: StudioCampaignVersionRecord,
  campaign: StudioCampaignRecord,
  versionNumber: number,
  input: {
    organizationId: string;
    campaignId: string;
    publishedByMemberId: string;
    publishedAt: string;
  }
): void {
  if (version.campaignId !== input.campaignId || version.organizationId !== input.organizationId ||
    version.versionNumber !== versionNumber || version.sourceDraftRevision !== campaign.revision ||
    version.name !== campaign.name || version.summary !== campaign.summary ||
    version.actionTemplate !== campaign.actionTemplate || version.publishedByMemberId !== input.publishedByMemberId ||
    version.publishedAt !== input.publishedAt || !isPositiveSafeInteger(version.versionNumber) ||
    !isPositiveSafeInteger(version.sourceDraftRevision) || version.canonicalJson.length === 0 ||
    !VERSION_HASH.test(version.campaignVersionHash)) throw new Error("invalid_studio_campaign_version");
}

export function installStudioCampaignVersionMigration(db: DatabaseSync, appliedAt: string): void {
  db.exec("pragma foreign_keys = on");
  db.exec("begin immediate");
  try {
    db.exec(`
      create unique index if not exists idx_campaigns_campaign_organization
        on campaigns (campaignId, organizationId);
      create unique index if not exists idx_organization_members_member_organization
        on organization_members (memberId, organizationId);

      create table if not exists campaign_versions (
        campaignId text not null,
        organizationId text not null,
        versionNumber integer not null check (versionNumber >= 1),
        name text not null,
        summary text not null,
        actionTemplate text not null check (actionTemplate = 'mockVaultDeposit'),
        sourceDraftRevision integer not null check (sourceDraftRevision >= 1),
        canonicalJson text not null check (length(canonicalJson) > 0),
        campaignVersionHash text not null unique check (
          length(campaignVersionHash) = 66
          and substr(campaignVersionHash, 1, 2) = '0x'
          and substr(campaignVersionHash, 3) not glob '*[^0-9a-f]*'
        ),
        publishedByMemberId text not null,
        publishedAt text not null,
        primary key (campaignId, versionNumber),
        unique (campaignId, sourceDraftRevision),
        foreign key (campaignId, organizationId)
          references campaigns(campaignId, organizationId) on delete restrict,
        foreign key (publishedByMemberId, organizationId)
          references organization_members(memberId, organizationId) on delete restrict
      );
      create index if not exists idx_campaign_versions_org_campaign_version
        on campaign_versions (organizationId, campaignId, versionNumber desc);
      create trigger if not exists campaign_versions_no_update
      before update on campaign_versions
      begin
        select raise(abort, 'campaign_versions_immutable');
      end;
      create trigger if not exists campaign_versions_no_delete
      before delete on campaign_versions
      begin
        select raise(abort, 'campaign_versions_immutable');
      end;
    `);
    db.prepare("insert or ignore into schema_migrations (id, checksum, appliedAt) values (?, ?, ?)")
      .run(STUDIO_CAMPAIGN_VERSION_MIGRATION_ID, STUDIO_CAMPAIGN_VERSION_MIGRATION_CHECKSUM, appliedAt);
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

export function createSqliteStudioCampaignVersionRepository(db: DatabaseSync): StudioCampaignVersionRepository {
  const findDraft = db.prepare(
    `select * from campaigns where campaignId = ? and organizationId = ?
     and source = 'studio-draft' and lifecycleState = 'draft'`
  );
  const latestVersion = db.prepare(
    `select * from campaign_versions where campaignId = ? and organizationId = ?
     order by versionNumber desc limit 1`
  );
  const versionForRevision = db.prepare(
    `select * from campaign_versions where campaignId = ? and organizationId = ? and sourceDraftRevision = ?`
  );
  const insertVersion = db.prepare(
    `insert into campaign_versions (
      campaignId, organizationId, versionNumber, name, summary, actionTemplate, sourceDraftRevision,
      canonicalJson, campaignVersionHash, publishedByMemberId, publishedAt
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const listVersions = db.prepare(
    `select * from campaign_versions where organizationId = ? and campaignId = ? order by versionNumber desc`
  );
  const getPublic = db.prepare("select * from campaign_versions where campaignId = ? and versionNumber = ?");

  return {
    publishDraftVersion(input): StudioCampaignVersionPublicationResult {
      db.exec("begin immediate");
      try {
        const draftRow = findDraft.get(input.campaignId, input.organizationId);
        if (draftRow === undefined) {
          db.exec("commit");
          return { ok: false, reason: "not_found" };
        }
        const campaign = rowToCampaign(draftRow);
        if (!isDraft(campaign)) {
          db.exec("commit");
          return { ok: false, reason: "not_found" };
        }
        if (campaign.revision !== input.expectedRevision) {
          db.exec("commit");
          return { ok: false, reason: "revision_conflict" };
        }
        const existingRow = versionForRevision.get(input.campaignId, input.organizationId, campaign.revision);
        if (existingRow !== undefined) {
          db.exec("commit");
          return { ok: false, reason: "already_published", existingVersion: rowToCampaignVersion(existingRow) };
        }
        const latestRow = latestVersion.get(input.campaignId, input.organizationId);
        const latest = latestRow === undefined ? null : rowToCampaignVersion(latestRow);
        if (latest !== null && hasSameSemanticContent(latest, campaign)) {
          db.exec("commit");
          return { ok: false, reason: "no_changes_to_publish", existingVersion: latest };
        }
        const versionNumber = latest === null ? 1 : latest.versionNumber + 1;
        if (!isPositiveSafeInteger(versionNumber)) throw new Error("studio_campaign_version_exhausted");
        const version = input.buildVersion(campaign, versionNumber);
        assertBuiltVersion(version, campaign, versionNumber, input);
        insertVersion.run(
          version.campaignId, version.organizationId, version.versionNumber, version.name, version.summary,
          version.actionTemplate, version.sourceDraftRevision, version.canonicalJson, version.campaignVersionHash,
          version.publishedByMemberId, version.publishedAt
        );
        db.exec("commit");
        return { ok: true, version: { ...version } };
      } catch (error) {
        try { db.exec("rollback"); } catch { /* transaction already closed */ }
        if (isUniqueConstraintError(error)) {
          const existing = versionForRevision.get(input.campaignId, input.organizationId, input.expectedRevision);
          if (existing !== undefined) {
            return { ok: false, reason: "already_published", existingVersion: rowToCampaignVersion(existing) };
          }
          if (error instanceof Error && error.message.includes("campaign_versions.campaignVersionHash")) {
            throw new Error("duplicate_studio_campaign_version_hash");
          }
        }
        throw error;
      }
    },

    listForOrganizationCampaign(organizationId, campaignId) {
      return listVersions.all(organizationId, campaignId).map(rowToCampaignVersion);
    },

    getPublicVersion(campaignId, versionNumber) {
      if (!isPositiveSafeInteger(versionNumber)) return null;
      const row = getPublic.get(campaignId, versionNumber);
      return row === undefined ? null : rowToCampaignVersion(row);
    }
  };
}

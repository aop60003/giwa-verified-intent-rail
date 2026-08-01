import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { createSqliteLiveStore } from "./liveStore.ts";
import {
  STUDIO_CAMPAIGN_VERSION_MIGRATION_CHECKSUM,
  STUDIO_CAMPAIGN_VERSION_MIGRATION_ID
} from "./studioCampaignVersionSqliteRepository.ts";

const organizationId = "tenant-a";
const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
const now = "2026-08-01T00:00:00.000Z";
const owner = "0x1111111111111111111111111111111111111111" as const;

function buildVersion(versionNumber: number, revision: number, name = "Partner preview") {
  return {
    campaignId,
    organizationId,
    versionNumber,
    name,
    summary: "Public preview of a Mock Vault Deposit campaign.",
    actionTemplate: "mockVaultDeposit" as const,
    sourceDraftRevision: revision,
    canonicalJson: `{"campaignId":"${campaignId}","versionNumber":${versionNumber}}`,
    campaignVersionHash: `0x${String(versionNumber).repeat(64)}` as `0x${string}`,
    publishedByMemberId: "",
    publishedAt: now
  };
}

function provisionDraft(store: ReturnType<typeof createSqliteLiveStore>) {
  store.studioAuth.upsertOrganization({ id: organizationId, displayName: "Loop", createdAt: now, updatedAt: now });
  store.studioAuth.syncBootstrapOwners({ organizationId, walletAddresses: [owner], nowIso: now });
  const memberId = store.studioAuth.getActiveMember(organizationId, owner)!.memberId;
  store.studioCampaigns.createDraft({
    campaignId,
    organizationId,
    name: "Partner preview",
    summary: "Public preview of a Mock Vault Deposit campaign.",
    actionTemplate: "mockVaultDeposit",
    lifecycleState: "draft",
    source: "studio-draft",
    revision: 1,
    createdByMemberId: memberId,
    updatedByMemberId: memberId,
    createdAt: now,
    updatedAt: now
  });
  return memberId;
}

describe("SQLite Studio campaign version repository", () => {
  it("records migration 010 and prevents direct mutation of immutable versions", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-campaign-versions-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const store = createSqliteLiveStore(dbPath);
      const memberId = provisionDraft(store);
      const published = store.studioCampaignVersions.publishDraftVersion({
        organizationId,
        campaignId,
        expectedRevision: 1,
        publishedByMemberId: memberId,
        publishedAt: now,
        buildVersion: (campaign, versionNumber) => ({
          ...buildVersion(versionNumber, campaign.revision),
          publishedByMemberId: memberId
        })
      });
      expect(published).toMatchObject({ ok: true, version: { versionNumber: 1 } });
      expect(store.getSchemaState().migrationChecksums?.[STUDIO_CAMPAIGN_VERSION_MIGRATION_ID])
        .toBe(STUDIO_CAMPAIGN_VERSION_MIGRATION_CHECKSUM);
      store.close();

      const db = new DatabaseSync(dbPath);
      expect(() => db.prepare("update campaign_versions set name = ?").run("changed"))
        .toThrow("campaign_versions_immutable");
      expect(() => db.exec("delete from campaign_versions"))
        .toThrow("campaign_versions_immutable");
      expect(db.prepare("select name from campaign_versions").get()).toEqual({ name: "Partner preview" });
      db.close();

      const reopened = createSqliteLiveStore(dbPath);
      expect(reopened.studioCampaignVersions.getPublicVersion(campaignId, 1)).toEqual({
        ...buildVersion(1, 1),
        publishedByMemberId: memberId
      });
      reopened.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("matches version sequencing and bounded publication outcomes", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-campaign-versions-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const store = createSqliteLiveStore(dbPath);
      const memberId = provisionDraft(store);
      const publish = (expectedRevision: number) => store.studioCampaignVersions.publishDraftVersion({
        organizationId,
        campaignId,
        expectedRevision,
        publishedByMemberId: memberId,
        publishedAt: now,
        buildVersion: (campaign, versionNumber) => ({
          ...buildVersion(versionNumber, campaign.revision, campaign.name),
          summary: campaign.summary,
          publishedByMemberId: memberId
        })
      });
      expect(publish(1)).toMatchObject({ ok: true, version: { versionNumber: 1 } });
      expect(store.studioCampaigns.updateDraft({
        organizationId, campaignId, name: "Partner preview",
        summary: "Public preview of a Mock Vault Deposit campaign.", updatedByMemberId: memberId,
        updatedAt: "2026-08-01T00:01:00.000Z", expectedRevision: 1
      })).toMatchObject({ ok: true, campaign: { revision: 2 } });
      expect(publish(2)).toMatchObject({ ok: false, reason: "no_changes_to_publish" });
      expect(store.studioCampaigns.updateDraft({
        organizationId, campaignId, name: "Changed preview",
        summary: "Public preview of a Mock Vault Deposit campaign.", updatedByMemberId: memberId,
        updatedAt: "2026-08-01T00:02:00.000Z", expectedRevision: 2
      })).toMatchObject({ ok: true, campaign: { revision: 3 } });
      expect(publish(3)).toMatchObject({ ok: true, version: { versionNumber: 2, sourceDraftRevision: 3 } });
      expect(publish(2)).toEqual({ ok: false, reason: "revision_conflict" });
      expect(store.studioCampaignVersions.publishDraftVersion({
        organizationId: "tenant-b", campaignId, expectedRevision: 3, publishedByMemberId: memberId,
        publishedAt: now, buildVersion: () => { throw new Error("must not build"); }
      })).toEqual({ ok: false, reason: "not_found" });
      store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails closed when a persisted version row is invalid", () => {
    const dir = mkdtempSync(join(tmpdir(), "giwa-campaign-versions-"));
    const dbPath = join(dir, "live.sqlite");
    try {
      const store = createSqliteLiveStore(dbPath);
      const memberId = provisionDraft(store);
      store.studioCampaignVersions.publishDraftVersion({
        organizationId, campaignId, expectedRevision: 1, publishedByMemberId: memberId, publishedAt: now,
        buildVersion: (campaign, versionNumber) => ({ ...buildVersion(versionNumber, campaign.revision), publishedByMemberId: memberId })
      });
      store.close();
      const db = new DatabaseSync(dbPath);
      db.exec("drop trigger campaign_versions_no_update; pragma ignore_check_constraints = on");
      db.prepare("update campaign_versions set actionTemplate = ?").run("unexpected");
      db.close();
      const reopened = createSqliteLiveStore(dbPath);
      expect(() => reopened.studioCampaignVersions.getPublicVersion(campaignId, 1))
        .toThrow("invalid_studio_campaign_version");
      reopened.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

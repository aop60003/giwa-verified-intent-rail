import { describe, expect, it } from "vitest";

import {
  createMemoryStudioCampaignRepository,
  type StudioCampaignRecord
} from "./studioCampaignRepository.ts";
import {
  createMemoryStudioCampaignVersionRepository,
  type StudioCampaignVersionRecord
} from "./studioCampaignVersionRepository.ts";

const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
const publishedAt = "2026-08-01T00:00:00.000Z";

function setup() {
  const campaigns = createMemoryStudioCampaignRepository();
  campaigns.createDraft({
    campaignId,
    organizationId: "tenant-a",
    name: "Partner Testnet Activation",
    summary: "Public preview of a Mock Vault Deposit campaign.",
    actionTemplate: "mockVaultDeposit",
    lifecycleState: "draft",
    source: "studio-draft",
    revision: 1,
    createdByMemberId: "member-a",
    updatedByMemberId: "member-a",
    createdAt: publishedAt,
    updatedAt: publishedAt
  });
  const versions = createMemoryStudioCampaignVersionRepository(campaigns);
  const publicationInput = {
    organizationId: "tenant-a",
    campaignId,
    expectedRevision: 1,
    publishedByMemberId: "member-a",
    publishedAt,
    buildVersion: (campaign: StudioCampaignRecord, versionNumber: number): StudioCampaignVersionRecord => ({
      campaignId: campaign.campaignId,
      organizationId: campaign.organizationId,
      versionNumber,
      name: campaign.name,
      summary: campaign.summary,
      actionTemplate: "mockVaultDeposit",
      sourceDraftRevision: campaign.revision,
      canonicalJson: `{"campaignId":"${campaign.campaignId}","versionNumber":${versionNumber}}`,
      campaignVersionHash: `0x${String(versionNumber).repeat(64)}`,
      publishedByMemberId: "member-a",
      publishedAt
    })
  };
  return { campaigns, versions, publicationInput };
}

describe("memory Studio campaign version repository", () => {
  it("publishes a Draft once per source revision", () => {
    const { versions, publicationInput } = setup();

    const first = versions.publishDraftVersion(publicationInput);
    expect(first).toMatchObject({ ok: true, version: { versionNumber: 1, sourceDraftRevision: 1 } });
    expect(versions.publishDraftVersion(publicationInput)).toMatchObject({
      ok: false,
      reason: "already_published",
      existingVersion: { versionNumber: 1 }
    });
  });

  it("rejects stale revisions, cross-tenant campaigns, and the baseline as not found", () => {
    const { campaigns, versions, publicationInput } = setup();
    campaigns.bootstrapPublishedBaseline({
      campaignId: "gasok-demo",
      organizationId: "tenant-a",
      name: "GIWA Verified Intent Rail GASOK Testnet Demo",
      summary: "Existing verified-intent testnet campaign.",
      actionTemplate: "mockVaultDeposit",
      lifecycleState: "published-baseline",
      source: "gasok-evidence",
      revision: 1,
      createdByMemberId: null,
      updatedByMemberId: null,
      createdAt: "1970-01-01T00:00:00.000Z",
      updatedAt: "1970-01-01T00:00:00.000Z"
    });

    expect(versions.publishDraftVersion({ ...publicationInput, expectedRevision: 2 }))
      .toEqual({ ok: false, reason: "revision_conflict" });
    expect(versions.publishDraftVersion({ ...publicationInput, organizationId: "tenant-b" }))
      .toEqual({ ok: false, reason: "not_found" });
    expect(versions.publishDraftVersion({ ...publicationInput, campaignId: "gasok-demo" }))
      .toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects unchanged semantic content and publishes Version 2 after a real Draft update", () => {
    const { campaigns, versions, publicationInput } = setup();
    expect(versions.publishDraftVersion(publicationInput)).toMatchObject({ ok: true });
    const unchanged = campaigns.updateDraft({
      organizationId: "tenant-a", campaignId, name: "Partner Testnet Activation",
      summary: "Public preview of a Mock Vault Deposit campaign.", updatedByMemberId: "member-a",
      updatedAt: "2026-08-01T00:01:00.000Z", expectedRevision: 1
    });
    expect(unchanged).toMatchObject({ ok: true, campaign: { revision: 2 } });
    expect(versions.publishDraftVersion({ ...publicationInput, expectedRevision: 2 }))
      .toMatchObject({ ok: false, reason: "no_changes_to_publish", existingVersion: { versionNumber: 1 } });

    const changed = campaigns.updateDraft({
      organizationId: "tenant-a", campaignId, name: "Updated Partner Activation",
      summary: "Public preview of a Mock Vault Deposit campaign.", updatedByMemberId: "member-a",
      updatedAt: "2026-08-01T00:02:00.000Z", expectedRevision: 2
    });
    expect(changed).toMatchObject({ ok: true, campaign: { revision: 3 } });
    expect(versions.publishDraftVersion({ ...publicationInput, expectedRevision: 3 }))
      .toMatchObject({ ok: true, version: { versionNumber: 2, sourceDraftRevision: 3 } });
  });

  it("rejects callback content or template that does not exactly snapshot the Draft", () => {
    const { versions, publicationInput } = setup();

    expect(() => versions.publishDraftVersion({
      ...publicationInput,
      buildVersion: (campaign, versionNumber) => ({
        ...publicationInput.buildVersion(campaign, versionNumber),
        name: "Mismatched published name",
        summary: "Mismatched published summary",
        actionTemplate: "unexpected-template" as "mockVaultDeposit"
      })
    })).toThrow("invalid_studio_campaign_version");
    expect(versions.listForOrganizationCampaign("tenant-a", campaignId)).toEqual([]);
    expect(versions.getPublicVersion(campaignId, 1)).toBeNull();
  });

  it("rejects a globally duplicated campaign-version hash across distinct campaigns", () => {
    const { campaigns, versions, publicationInput } = setup();
    campaigns.createDraft({
      ...campaigns.listForOrganization("tenant-a")[0]!,
      campaignId: "campaign_00000000-0000-4000-8000-000000000002",
      name: "Second Partner Testnet Activation"
    });
    expect(versions.publishDraftVersion(publicationInput)).toMatchObject({ ok: true });
    expect(() => versions.publishDraftVersion({
      ...publicationInput,
      campaignId: "campaign_00000000-0000-4000-8000-000000000002"
    })).toThrow("duplicate_studio_campaign_version_hash");
  });

  it("returns newest-first private history, exact public versions, and clones", () => {
    const { campaigns, versions, publicationInput } = setup();
    const first = versions.publishDraftVersion(publicationInput);
    campaigns.updateDraft({
      organizationId: "tenant-a", campaignId, name: "Changed", summary: "Changed", updatedByMemberId: "member-a",
      updatedAt: "2026-08-01T00:01:00.000Z", expectedRevision: 1
    });
    const second = versions.publishDraftVersion({ ...publicationInput, expectedRevision: 2 });
    expect(versions.listForOrganizationCampaign("tenant-a", campaignId).map((version) => version.versionNumber))
      .toEqual([2, 1]);
    expect(versions.listForOrganizationCampaign("tenant-b", campaignId)).toEqual([]);
    expect(versions.getPublicVersion(campaignId, 2)).toMatchObject({ versionNumber: 2, name: "Changed" });
    expect(versions.getPublicVersion(campaignId, 3)).toBeNull();

    if (!first.ok || !second.ok) throw new Error("expected published versions");
    first.version.name = "Mutated first";
    second.version.name = "Mutated second";
    const privateVersion = versions.listForOrganizationCampaign("tenant-a", campaignId)[0]!;
    privateVersion.name = "Mutated private";
    const publicVersion = versions.getPublicVersion(campaignId, 2)!;
    publicVersion.name = "Mutated public";
    expect(versions.listForOrganizationCampaign("tenant-a", campaignId)[0]).toMatchObject({ name: "Changed" });
    expect(versions.getPublicVersion(campaignId, 2)).toMatchObject({ name: "Changed" });
  });
});

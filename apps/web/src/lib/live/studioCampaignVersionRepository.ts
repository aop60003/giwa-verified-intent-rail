import { isPositiveSafeInteger } from "./studioCampaignIdentifier.ts";
import type { StudioCampaignRecord, StudioCampaignRepository } from "./studioCampaignRepository.ts";

export type StudioCampaignVersionRecord = {
  campaignId: string;
  organizationId: string;
  versionNumber: number;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  sourceDraftRevision: number;
  canonicalJson: string;
  campaignVersionHash: `0x${string}`;
  publishedByMemberId: string;
  publishedAt: string;
};

export type StudioCampaignVersionPublicationResult =
  | { ok: true; version: StudioCampaignVersionRecord }
  | { ok: false; reason: "not_found" | "revision_conflict" }
  | {
      ok: false;
      reason: "already_published" | "no_changes_to_publish";
      existingVersion: StudioCampaignVersionRecord;
    };

export type StudioCampaignVersionRepository = {
  publishDraftVersion(input: {
    organizationId: string;
    campaignId: string;
    expectedRevision: number;
    publishedByMemberId: string;
    publishedAt: string;
    buildVersion(
      campaign: StudioCampaignRecord,
      versionNumber: number
    ): StudioCampaignVersionRecord;
  }): StudioCampaignVersionPublicationResult;
  listForOrganizationCampaign(
    organizationId: string,
    campaignId: string
  ): StudioCampaignVersionRecord[];
  getPublicVersion(campaignId: string, versionNumber: number): StudioCampaignVersionRecord | null;
};

function keyFor(organizationId: string, campaignId: string): string {
  return `${organizationId}\u0000${campaignId}`;
}

function cloneVersion(record: StudioCampaignVersionRecord): StudioCampaignVersionRecord {
  return { ...record };
}

function isDraft(record: StudioCampaignRecord): boolean {
  return record.source === "studio-draft" && record.lifecycleState === "draft";
}

function hasSameSemanticContent(left: StudioCampaignVersionRecord, right: StudioCampaignRecord): boolean {
  return left.name === right.name &&
    left.summary === right.summary &&
    left.actionTemplate === right.actionTemplate;
}

function assertBuiltVersion(
  version: StudioCampaignVersionRecord,
  campaign: StudioCampaignRecord,
  versionNumber: number,
  input: {
    organizationId: string;
    campaignId: string;
    expectedRevision: number;
    publishedByMemberId: string;
    publishedAt: string;
  }
): void {
  if (
    version.campaignId !== input.campaignId ||
    version.organizationId !== input.organizationId ||
    version.versionNumber !== versionNumber ||
    version.sourceDraftRevision !== campaign.revision ||
    version.name !== campaign.name ||
    version.summary !== campaign.summary ||
    version.actionTemplate !== campaign.actionTemplate ||
    version.publishedByMemberId !== input.publishedByMemberId ||
    version.publishedAt !== input.publishedAt ||
    !isPositiveSafeInteger(version.versionNumber) ||
    !isPositiveSafeInteger(version.sourceDraftRevision) ||
    version.canonicalJson.length === 0 ||
    !/^0x[0-9a-f]{64}$/u.test(version.campaignVersionHash)
  ) throw new Error("invalid_studio_campaign_version");
}

export function createMemoryStudioCampaignVersionRepository(
  campaigns: StudioCampaignRepository
): StudioCampaignVersionRepository {
  const versionsByCampaign = new Map<string, StudioCampaignVersionRecord[]>();
  const versionsByHash = new Map<string, StudioCampaignVersionRecord>();

  return {
    publishDraftVersion(input) {
      const campaign = campaigns.listForOrganization(input.organizationId)
        .find((record) => record.campaignId === input.campaignId);
      if (campaign === undefined || !isDraft(campaign)) return { ok: false, reason: "not_found" };
      if (campaign.revision !== input.expectedRevision) return { ok: false, reason: "revision_conflict" };

      const key = keyFor(input.organizationId, input.campaignId);
      const versions = versionsByCampaign.get(key) ?? [];
      const existingRevision = versions.find((version) => version.sourceDraftRevision === campaign.revision);
      if (existingRevision !== undefined) {
        return { ok: false, reason: "already_published", existingVersion: cloneVersion(existingRevision) };
      }
      const latest = versions[0];
      if (latest !== undefined && hasSameSemanticContent(latest, campaign)) {
        return { ok: false, reason: "no_changes_to_publish", existingVersion: cloneVersion(latest) };
      }

      const versionNumber = latest === undefined ? 1 : latest.versionNumber + 1;
      if (!isPositiveSafeInteger(versionNumber)) throw new Error("studio_campaign_version_exhausted");
      const version = input.buildVersion({ ...campaign }, versionNumber);
      assertBuiltVersion(version, campaign, versionNumber, input);
      if (versionsByHash.has(version.campaignVersionHash)) {
        throw new Error("duplicate_studio_campaign_version_hash");
      }
      versions.push(cloneVersion(version));
      versions.sort((left, right) => right.versionNumber - left.versionNumber);
      versionsByCampaign.set(key, versions);
      versionsByHash.set(version.campaignVersionHash, cloneVersion(version));
      return { ok: true, version: cloneVersion(version) };
    },

    listForOrganizationCampaign(organizationId, campaignId) {
      return (versionsByCampaign.get(keyFor(organizationId, campaignId)) ?? []).map(cloneVersion);
    },

    getPublicVersion(campaignId, versionNumber) {
      for (const versions of versionsByCampaign.values()) {
        const version = versions.find((candidate) =>
          candidate.campaignId === campaignId && candidate.versionNumber === versionNumber
        );
        if (version !== undefined) return cloneVersion(version);
      }
      return null;
    }
  };
}

export type StudioCampaignActionTemplate = "mockVaultDeposit";
export type StudioCampaignLifecycleState = "draft" | "published-baseline";
export type StudioCampaignSource = "studio-draft" | "gasok-evidence";

export type StudioCampaignRecord = {
  campaignId: string;
  organizationId: string;
  name: string;
  summary: string;
  actionTemplate: StudioCampaignActionTemplate;
  lifecycleState: StudioCampaignLifecycleState;
  source: StudioCampaignSource;
  revision: number;
  createdByMemberId: string | null;
  updatedByMemberId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudioCampaignUpdateResult =
  | { ok: true; campaign: StudioCampaignRecord }
  | { ok: false; reason: "not_found" | "revision_conflict" };

export type StudioCampaignRepository = {
  bootstrapPublishedBaseline(record: StudioCampaignRecord): StudioCampaignRecord;
  listForOrganization(organizationId: string): StudioCampaignRecord[];
  createDraft(record: StudioCampaignRecord): StudioCampaignRecord;
  updateDraft(input: {
    organizationId: string;
    campaignId: string;
    name: string;
    summary: string;
    updatedByMemberId: string;
    updatedAt: string;
    expectedRevision: number;
  }): StudioCampaignUpdateResult;
};

function assertCampaignRecord(record: StudioCampaignRecord): void {
  const draft = record.source === "studio-draft" &&
    record.lifecycleState === "draft" &&
    record.createdByMemberId !== null &&
    record.updatedByMemberId !== null;
  const baseline = record.source === "gasok-evidence" &&
    record.lifecycleState === "published-baseline" &&
    record.createdByMemberId === null &&
    record.updatedByMemberId === null;
  if (
    record.actionTemplate !== "mockVaultDeposit" ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 1 ||
    (!draft && !baseline)
  ) throw new Error("invalid_studio_campaign");
}

function cloneCampaign(record: StudioCampaignRecord): StudioCampaignRecord {
  return { ...record };
}

function isBaseline(record: StudioCampaignRecord): boolean {
  return record.source === "gasok-evidence" && record.lifecycleState === "published-baseline";
}

function isDraft(record: StudioCampaignRecord): boolean {
  return record.source === "studio-draft" && record.lifecycleState === "draft";
}

export function createMemoryStudioCampaignRepository(): StudioCampaignRepository {
  const campaignsById = new Map<string, StudioCampaignRecord>();

  return {
    bootstrapPublishedBaseline(record) {
      assertCampaignRecord(record);
      if (!isBaseline(record)) throw new Error("studio_campaign_baseline_conflict");

      const existing = campaignsById.get(record.campaignId);
      if (existing !== undefined) {
        if (
          existing.organizationId !== record.organizationId ||
          existing.source !== record.source ||
          existing.lifecycleState !== record.lifecycleState
        ) throw new Error("studio_campaign_baseline_conflict");
        return cloneCampaign(existing);
      }
      campaignsById.set(record.campaignId, cloneCampaign(record));
      return cloneCampaign(record);
    },

    listForOrganization(organizationId) {
      return [...campaignsById.values()]
        .filter((record) => record.organizationId === organizationId)
        .sort((left, right) => {
          const stateDifference = Number(isDraft(left)) - Number(isDraft(right));
          if (stateDifference !== 0) return stateDifference;
          if (isDraft(left) && isDraft(right)) {
            const updateDifference = right.updatedAt.localeCompare(left.updatedAt);
            if (updateDifference !== 0) return updateDifference;
          }
          return left.campaignId.localeCompare(right.campaignId);
        })
        .map(cloneCampaign);
    },

    createDraft(record) {
      assertCampaignRecord(record);
      if (!isDraft(record)) throw new Error("invalid_studio_campaign");
      if (campaignsById.has(record.campaignId)) throw new Error("duplicate_studio_campaign");
      campaignsById.set(record.campaignId, cloneCampaign(record));
      return cloneCampaign(record);
    },

    updateDraft(input) {
      const existing = campaignsById.get(input.campaignId);
      if (existing === undefined || existing.organizationId !== input.organizationId || !isDraft(existing)) {
        return { ok: false, reason: "not_found" };
      }
      if (existing.revision !== input.expectedRevision) return { ok: false, reason: "revision_conflict" };
      if (existing.revision >= Number.MAX_SAFE_INTEGER) throw new Error("studio_campaign_revision_exhausted");

      const campaign = {
        ...existing,
        name: input.name,
        summary: input.summary,
        updatedByMemberId: input.updatedByMemberId,
        updatedAt: input.updatedAt,
        revision: existing.revision + 1
      };
      campaignsById.set(campaign.campaignId, campaign);
      return { ok: true, campaign: cloneCampaign(campaign) };
    }
  };
}

import { describe, expect, it } from "vitest";

import {
  createMemoryStudioCampaignRepository,
  type StudioCampaignRecord
} from "./studioCampaignRepository.ts";

const baseline: StudioCampaignRecord = {
  campaignId: "gasok-demo",
  organizationId: "tenant-a",
  name: "GIWA GASOK Demo",
  summary: "Existing verified-intent testnet campaign.",
  actionTemplate: "mockVaultDeposit",
  lifecycleState: "published-baseline",
  source: "gasok-evidence",
  revision: 1,
  createdByMemberId: null,
  updatedByMemberId: null,
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z"
};

function draft(overrides: Partial<StudioCampaignRecord> = {}): StudioCampaignRecord {
  return {
    ...baseline,
    campaignId: "campaign_draft",
    lifecycleState: "draft",
    source: "studio-draft",
    createdByMemberId: "member-a",
    updatedByMemberId: "member-a",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides
  };
}

describe("memory Studio campaign repository", () => {
  it("lists the baseline first and Drafts by recent update within one organization", () => {
    const repository = createMemoryStudioCampaignRepository();
    repository.bootstrapPublishedBaseline(baseline);
    for (const [campaignId, name, updatedAt] of [
      ["campaign_old", "Old", "2026-08-01T00:00:00.000Z"],
      ["campaign_new", "New", "2026-08-01T00:01:00.000Z"]
    ] as const) {
      repository.createDraft({
        ...baseline,
        campaignId,
        name,
        lifecycleState: "draft",
        source: "studio-draft",
        createdByMemberId: "member-a",
        updatedByMemberId: "member-a",
        createdAt: updatedAt,
        updatedAt
      });
    }

    expect(repository.listForOrganization("tenant-a").map((row) => row.campaignId))
      .toEqual(["gasok-demo", "campaign_new", "campaign_old"]);
    expect(repository.listForOrganization("tenant-b")).toEqual([]);
  });

  it("allows one update per revision and never mutates the baseline", () => {
    const repository = createMemoryStudioCampaignRepository();
    repository.bootstrapPublishedBaseline(baseline);
    repository.createDraft(draft());

    const input = {
      organizationId: "tenant-a",
      campaignId: "campaign_draft",
      name: "Updated",
      summary: "Updated summary",
      updatedByMemberId: "member-a",
      updatedAt: "2026-08-01T01:00:00.000Z",
      expectedRevision: 1
    };
    expect(repository.updateDraft(input))
      .toMatchObject({ ok: true, campaign: { revision: 2, name: "Updated" } });
    expect(repository.updateDraft({ ...input, name: "Stale" }))
      .toEqual({ ok: false, reason: "revision_conflict" });
    expect(repository.updateDraft({ ...input, campaignId: "gasok-demo" }))
      .toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects duplicate IDs and non-baseline records during baseline bootstrap", () => {
    const repository = createMemoryStudioCampaignRepository();
    repository.bootstrapPublishedBaseline(baseline);

    expect(() => repository.createDraft(draft({ campaignId: "gasok-demo" })))
      .toThrow("duplicate_studio_campaign");
    expect(() => repository.bootstrapPublishedBaseline(draft({ campaignId: "baseline-draft" })))
      .toThrow("studio_campaign_baseline_conflict");
  });

  it("permits only an identical baseline bootstrap and rejects organization or source mismatches", () => {
    const repository = createMemoryStudioCampaignRepository();
    const returned = repository.bootstrapPublishedBaseline(baseline);

    expect(repository.bootstrapPublishedBaseline({ ...baseline, name: "Ignored replacement" }))
      .toEqual(returned);
    expect(() => repository.bootstrapPublishedBaseline({ ...baseline, organizationId: "tenant-b" }))
      .toThrow("studio_campaign_baseline_conflict");
    expect(() => repository.bootstrapPublishedBaseline({
      ...draft({ campaignId: baseline.campaignId })
    })).toThrow("studio_campaign_baseline_conflict");
  });

  it("returns clones so caller changes cannot mutate repository state", () => {
    const repository = createMemoryStudioCampaignRepository();
    const inserted = draft();
    repository.bootstrapPublishedBaseline(baseline);
    const created = repository.createDraft(inserted);
    inserted.name = "Changed outside";
    created.name = "Changed returned";

    const listed = repository.listForOrganization("tenant-a");
    listed[1]!.name = "Changed listed";
    expect(repository.listForOrganization("tenant-a")[1]).toMatchObject({ name: "GIWA GASOK Demo" });
    expect(repository.listForOrganization("tenant-a")[1]).toMatchObject({ campaignId: "campaign_draft", name: baseline.name });
  });

  it("keeps updates organization-scoped and orders equal Draft timestamps by campaign ID", () => {
    const repository = createMemoryStudioCampaignRepository();
    repository.bootstrapPublishedBaseline(baseline);
    repository.createDraft(draft({ campaignId: "campaign-b" }));
    repository.createDraft(draft({ campaignId: "campaign-a" }));

    expect(repository.updateDraft({
      organizationId: "tenant-b",
      campaignId: "campaign-a",
      name: "Cross tenant",
      summary: "Cross tenant",
      updatedByMemberId: "member-b",
      updatedAt: "2026-08-01T01:00:00.000Z",
      expectedRevision: 1
    })).toEqual({ ok: false, reason: "not_found" });
    expect(repository.listForOrganization("tenant-a").map((row) => row.campaignId))
      .toEqual(["gasok-demo", "campaign-a", "campaign-b"]);
  });

  it("rejects an update when the next revision would be unsafe without mutating the Draft", () => {
    const repository = createMemoryStudioCampaignRepository();
    repository.createDraft(draft({ revision: Number.MAX_SAFE_INTEGER }));

    const input = {
      organizationId: "tenant-a",
      campaignId: "campaign_draft",
      name: "Unsafe update",
      summary: "Unsafe update",
      updatedByMemberId: "member-a",
      updatedAt: "2026-08-01T01:00:00.000Z",
      expectedRevision: Number.MAX_SAFE_INTEGER
    };
    expect(() => repository.updateDraft(input)).toThrow("studio_campaign_revision_exhausted");
    expect(repository.listForOrganization("tenant-a")[0]).toMatchObject({
      revision: Number.MAX_SAFE_INTEGER,
      name: "GIWA GASOK Demo",
      summary: "Existing verified-intent testnet campaign."
    });
  });
});

import { describe, expect, it } from "vitest";

import type { StudioWalletAuthContext } from "./studioAuthService.ts";
import { createMemoryStudioCampaignRepository } from "./studioCampaignRepository.ts";
import {
  createStudioCampaignService,
  STUDIO_CAMPAIGN_BODY_MAX_BYTES,
  STUDIO_CAMPAIGN_NAME_LIMIT,
  STUDIO_CAMPAIGN_SUMMARY_LIMIT,
  StudioCampaignServiceError
} from "./studioCampaignService.ts";
import { isStudioDraftCampaignId } from "./studioCampaignIdentifier.ts";

const owner: StudioWalletAuthContext = {
  actorId: "0x1111111111111111111111111111111111111111",
  tenantId: "tenant-a",
  memberId: "member-a",
  mode: "wallet-session",
  organizationRole: "Owner",
  sessionId: "session-a"
};

const fixedNow = new Date("2026-08-01T00:00:00.000Z");
const fixedUuid = "00000000-0000-4000-8000-000000000001";

function setup() {
  const repository = createMemoryStudioCampaignRepository();
  let nextUuid = 1;
  const service = createStudioCampaignService({
    repository,
    now: () => new Date(fixedNow),
    randomUUID: () => `00000000-0000-4000-8000-${String(nextUuid++).padStart(12, "0")}`
  });
  return { repository, service };
}

function expectErrorCode(action: () => unknown, code: ConstructorParameters<typeof StudioCampaignServiceError>[0]) {
  expect(action).toThrow(StudioCampaignServiceError);
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe("Studio campaign service", () => {
  it("bootstraps a fixed-template baseline as a read-only public-safe projection", () => {
    const { repository, service } = setup();

    expect(service.bootstrapBaseline(owner.tenantId)).toEqual({
      campaignId: "gasok-demo",
      name: "GIWA Verified Intent Rail GASOK Testnet Demo",
      summary: "Existing verified-intent testnet campaign.",
      actionTemplate: "mockVaultDeposit",
      lifecycleState: "published-baseline",
      editable: false,
      revision: 1,
      updatedAt: "1970-01-01T00:00:00.000Z"
    });
    expect(repository.listForOrganization(owner.tenantId)).toHaveLength(1);
  });

  it("creates a trimmed Draft from only the authenticated organization and member", () => {
    const { repository, service } = setup();

    const created = service.createDraft(owner, { name: "  Testnet launch  ", summary: "  GIWA Sepolia only.  " });

    expect(created).toEqual({
      campaignId: `campaign_${fixedUuid}`,
      name: "Testnet launch",
      summary: "GIWA Sepolia only.",
      actionTemplate: "mockVaultDeposit",
      lifecycleState: "draft",
      editable: true,
      revision: 1,
      updatedAt: fixedNow.toISOString()
    });
    expect(isStudioDraftCampaignId(created.campaignId)).toBe(true);
    expect(repository.listForOrganization(owner.tenantId)[0]).toMatchObject({
      organizationId: owner.tenantId,
      createdByMemberId: owner.memberId,
      updatedByMemberId: owner.memberId
    });
  });

  it("creates a canonical v4 Draft ID through the production default UUID path", () => {
    const repository = createMemoryStudioCampaignRepository();
    const service = createStudioCampaignService({
      repository,
      now: () => new Date(fixedNow)
    });

    expect(service.createDraft(owner, { name: "Production UUID" })).toMatchObject({
      campaignId: expect.stringMatching(
        /^campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      ),
      name: "Production UUID",
      summary: "",
      revision: 1
    });
  });

  it("defaults an omitted summary, normalizes CRLF, and exposes only projection fields", () => {
    const { service } = setup();
    const emptySummary = service.createDraft(owner, { name: "Draft" });
    const normalized = service.createDraft(owner, { name: "Second", summary: " one\r\ntwo \r\n" });
    const listed = service.listCampaigns(owner);

    expect(emptySummary.summary).toBe("");
    expect(normalized.summary).toBe("one\ntwo");
    expect(listed.limits).toEqual({ name: 80, summary: 280 });
    expect(JSON.stringify(listed.campaigns)).not.toMatch(/tenant|member|source|createdBy|updatedBy/u);
    expect(Object.keys(listed.campaigns[0]!).sort()).toEqual([
      "actionTemplate", "campaignId", "editable", "lifecycleState", "name", "revision", "summary", "updatedAt"
    ]);
  });

  it("enforces Unicode code-point limits and rejects controls, name breaks, invalid revisions, and invalid IDs", () => {
    const { service } = setup();
    const name80 = "가".repeat(80);
    const summary280 = "가".repeat(280);

    expect(service.createDraft(owner, { name: name80, summary: summary280 })).toMatchObject({ name: name80, summary: summary280 });
    expectErrorCode(() => service.createDraft(owner, { name: `${name80}x` }), "invalid_request");
    expectErrorCode(() => service.createDraft(owner, { name: "Name\nline" }), "invalid_request");
    expectErrorCode(() => service.createDraft(owner, { name: "Bad\u0000name" }), "invalid_request");
    expectErrorCode(() => service.createDraft(owner, { name: "Bad\tname" }), "invalid_request");
    expectErrorCode(() => service.createDraft(owner, { name: "Draft", summary: "Bad\u0001summary" }), "invalid_request");
    expectErrorCode(() => service.updateDraft(owner, {
      campaignId: "not-a-campaign-id", name: "Draft", summary: "", revision: 1
    }), "invalid_request");
    expectErrorCode(() => service.updateDraft(owner, {
      campaignId: `campaign_${fixedUuid}`, name: "Draft", summary: "", revision: 0
    }), "invalid_request");
  });

  it("allows only Owners to list, create, and update campaigns", () => {
    const { service } = setup();
    const editor = { ...owner, organizationRole: "Editor" as const };
    const viewer = { ...owner, organizationRole: "Viewer" as const };

    for (const context of [editor, viewer]) {
      expectErrorCode(() => service.listCampaigns(context), "insufficient_access");
      expectErrorCode(() => service.createDraft(context, { name: "Draft" }), "insufficient_access");
      expectErrorCode(() => service.updateDraft(context, {
        campaignId: `campaign_${fixedUuid}`, name: "Draft", summary: "", revision: 1
      }), "insufficient_access");
    }
  });

  it("maps baseline and foreign updates to the same opaque not-found error", () => {
    const { service } = setup();
    service.bootstrapBaseline(owner.tenantId);
    const draft = service.createDraft(owner, { name: "Draft" });
    const foreignOwner = { ...owner, tenantId: "tenant-b", memberId: "member-b" };

    for (const contextAndId of [[owner, "gasok-demo"], [foreignOwner, draft.campaignId]] as const) {
      expectErrorCode(() => service.updateDraft(contextAndId[0], {
        campaignId: contextAndId[1], name: "Changed", summary: "", revision: 1
      }), "not_found");
    }
  });

  it("maps stale writes to revision conflicts without returning current server contents", () => {
    const { service } = setup();
    const draft = service.createDraft(owner, { name: "Draft" });
    service.updateDraft(owner, { campaignId: draft.campaignId, name: "Changed", summary: "Updated", revision: 1 });

    expectErrorCode(() => service.updateDraft(owner, {
      campaignId: draft.campaignId, name: "Stale", summary: "Old", revision: 1
    }), "revision_conflict");
  });

  it("preserves the repository maximum-revision exhaustion error without mutating the Draft", () => {
    const { repository, service } = setup();
    repository.createDraft({
      campaignId: `campaign_${fixedUuid}`,
      organizationId: owner.tenantId,
      name: "Exhausted",
      summary: "",
      actionTemplate: "mockVaultDeposit",
      lifecycleState: "draft",
      source: "studio-draft",
      revision: Number.MAX_SAFE_INTEGER,
      createdByMemberId: owner.memberId,
      updatedByMemberId: owner.memberId,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString()
    });

    expect(() => service.updateDraft(owner, {
      campaignId: `campaign_${fixedUuid}`, name: "Changed", summary: "", revision: Number.MAX_SAFE_INTEGER
    })).toThrow("studio_campaign_revision_exhausted");
    expect(repository.listForOrganization(owner.tenantId)[0]).toMatchObject({ name: "Exhausted", revision: Number.MAX_SAFE_INTEGER });
  });

  it("exports the fixed campaign input limits", () => {
    expect(STUDIO_CAMPAIGN_NAME_LIMIT).toBe(80);
    expect(STUDIO_CAMPAIGN_SUMMARY_LIMIT).toBe(280);
    expect(STUDIO_CAMPAIGN_BODY_MAX_BYTES).toBe(4 * 1024);
  });
});

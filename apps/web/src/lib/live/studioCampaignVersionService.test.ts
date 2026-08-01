import { keccak256, toBytes } from "viem";
import { describe, expect, it } from "vitest";

import type { StudioWalletAuthContext } from "./studioAuthService.ts";
import { createMemoryStudioCampaignRepository } from "./studioCampaignRepository.ts";
import { createMemoryStudioCampaignVersionRepository } from "./studioCampaignVersionRepository.ts";
import {
  canonicalCampaignVersionJson,
  createStudioCampaignVersionService,
  StudioCampaignVersionServiceError
} from "./studioCampaignVersionService.ts";

const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
const publishedAt = "2026-08-01T00:00:00.000Z";
const owner: StudioWalletAuthContext = {
  actorId: "0x1111111111111111111111111111111111111111",
  tenantId: "tenant-a",
  memberId: "member-a",
  mode: "wallet-session",
  organizationRole: "Owner",
  sessionId: "session-a"
};

function setup() {
  const campaigns = createMemoryStudioCampaignRepository();
  campaigns.createDraft({
    campaignId,
    organizationId: owner.tenantId,
    name: "Partner Testnet Activation",
    summary: "Public preview of a Mock Vault Deposit campaign.",
    actionTemplate: "mockVaultDeposit",
    lifecycleState: "draft",
    source: "studio-draft",
    revision: 3,
    createdByMemberId: owner.memberId,
    updatedByMemberId: owner.memberId,
    createdAt: publishedAt,
    updatedAt: publishedAt
  });
  const repository = createMemoryStudioCampaignVersionRepository(campaigns);
  const service = createStudioCampaignVersionService({
    repository,
    now: () => new Date(publishedAt)
  });
  return { campaigns, repository, service };
}

function expectErrorCode(action: () => unknown, code: ConstructorParameters<typeof StudioCampaignVersionServiceError>[0]) {
  expect(action).toThrow(StudioCampaignVersionServiceError);
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code, existingVersion: null });
  }
}

function caughtError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("expected action to throw");
}

describe("Studio campaign version service", () => {
  it("serializes the approved fixed-order Unicode-safe canonical vector and hashes its UTF-8 bytes", () => {
    const canonical = canonicalCampaignVersionJson({
      schemaVersion: "1",
      chainId: 91342,
      campaignId: "campaign_00000000-0000-4000-8000-000000000000",
      versionNumber: 1,
      name: "Partner Testnet Activation",
      summary: "Public preview of a Mock Vault Deposit campaign.",
      actionTemplate: "mockVaultDeposit",
      sourceDraftRevision: 3,
      publishedAt
    });
    expect(canonical).toBe('{"schemaVersion":"1","chainId":91342,"campaignId":"campaign_00000000-0000-4000-8000-000000000000","versionNumber":1,"name":"Partner Testnet Activation","summary":"Public preview of a Mock Vault Deposit campaign.","actionTemplate":"mockVaultDeposit","sourceDraftRevision":3,"publishedAt":"2026-08-01T00:00:00.000Z"}');
    expect(keccak256(toBytes(canonical))).toBe("0x101fd0cda215689f915c76bf14471a1d4be5e71c0491e8c5f48abd170028a18e");

    expect(canonicalCampaignVersionJson({
      schemaVersion: "1", chainId: 91342, campaignId, versionNumber: 2,
      name: "K\u{1f604} \"preview\"", summary: "line 1\nline 2\\path",
      actionTemplate: "mockVaultDeposit", sourceDraftRevision: 4, publishedAt
    })).toBe('{"schemaVersion":"1","chainId":91342,"campaignId":"campaign_00000000-0000-4000-8000-000000000001","versionNumber":2,"name":"K😄 \\\"preview\\\"","summary":"line 1\\nline 2\\\\path","actionTemplate":"mockVaultDeposit","sourceDraftRevision":4,"publishedAt":"2026-08-01T00:00:00.000Z"}');
  });

  it("publishes an Owner's saved Draft using only server-owned canonical values", () => {
    const { service } = setup();

    expect(service.publishVersion(owner, { campaignId, revision: 3 })).toEqual({
      campaignId,
      versionNumber: 1,
      campaignVersionHash: expect.stringMatching(/^0x[0-9a-f]{64}$/u),
      publishedAt,
      publicPath: `/campaign/${campaignId}/v/1`
    });
  });

  it("rejects non-Owners and invalid Draft identifiers or positive revisions", () => {
    const { service } = setup();
    expectErrorCode(() => service.publishVersion({ ...owner, organizationRole: "Editor" }, { campaignId, revision: 3 }), "insufficient_access");
    expectErrorCode(() => service.listVersions({ ...owner, organizationRole: "Viewer" }, { campaignId }), "insufficient_access");
    expectErrorCode(() => service.publishVersion(owner, { campaignId: "gasok-demo", revision: 3 }), "invalid_request");
    expectErrorCode(() => service.publishVersion(owner, { campaignId: campaignId.toUpperCase(), revision: 3 }), "invalid_request");
    expectErrorCode(() => service.publishVersion(owner, { campaignId, revision: 0 }), "invalid_request");
    expectErrorCode(() => service.getPublicVersion({ campaignId, versionNumber: Number.MAX_SAFE_INTEGER + 1 }), "invalid_request");
  });

  it("maps stale, duplicate, and unchanged publication outcomes to bounded errors", () => {
    const { campaigns, service } = setup();
    expectErrorCode(() => service.publishVersion(owner, { campaignId, revision: 2 }), "revision_conflict");
    service.publishVersion(owner, { campaignId, revision: 3 });

    expect(caughtError(() => service.publishVersion(owner, { campaignId, revision: 3 }))).toMatchObject({
      code: "already_published",
      existingVersion: { versionNumber: 1, publicPath: `/campaign/${campaignId}/v/1` }
    });

    campaigns.updateDraft({
      organizationId: owner.tenantId, campaignId, name: "Partner Testnet Activation",
      summary: "Public preview of a Mock Vault Deposit campaign.", updatedByMemberId: owner.memberId,
      updatedAt: "2026-08-01T00:01:00.000Z", expectedRevision: 3
    });
    expect(caughtError(() => service.publishVersion(owner, { campaignId, revision: 4 }))).toMatchObject({
      code: "no_changes_to_publish",
      existingVersion: { versionNumber: 1, publicPath: `/campaign/${campaignId}/v/1` }
    });
  });

  it("returns tenant-scoped newest-first history without repository-private fields", () => {
    const { campaigns, service } = setup();
    const publication = service.publishVersion(owner, { campaignId, revision: 3 });
    campaigns.updateDraft({
      organizationId: owner.tenantId, campaignId, name: "Changed preview", summary: "Changed summary",
      updatedByMemberId: owner.memberId, updatedAt: "2026-08-01T00:01:00.000Z", expectedRevision: 3
    });
    service.publishVersion(owner, { campaignId, revision: 4 });

    const history = service.listVersions(owner, { campaignId });
    expect(history.versions.map((version) => version.versionNumber)).toEqual([2, 1]);
    expect(history.versions[0]).toEqual({
      campaignId, versionNumber: 2, name: "Changed preview", summary: "Changed summary",
      actionTemplate: "mockVaultDeposit", sourceDraftRevision: 4,
      campaignVersionHash: expect.stringMatching(/^0x[0-9a-f]{64}$/u), publishedAt,
      publicPath: `/campaign/${campaignId}/v/2`
    });
    expect(JSON.stringify(history)).not.toMatch(/organizationId|publishedByMemberId|canonicalJson/u);
    expect(service.listVersions({ ...owner, tenantId: "tenant-b" }, { campaignId })).toEqual({ versions: [] });
  });

  it("returns one exact public-safe immutable projection and hides private fields", () => {
    const { service } = setup();
    const publication = service.publishVersion(owner, { campaignId, revision: 3 });

    const publicVersion = service.getPublicVersion({ campaignId, versionNumber: 1 });
    expect(publicVersion).toEqual({
      campaign: {
        campaignId, versionNumber: 1, name: "Partner Testnet Activation",
        summary: "Public preview of a Mock Vault Deposit campaign.", actionTemplate: "mockVaultDeposit",
        campaignVersionHash: publication.campaignVersionHash,
        publishedAt, chainId: 91342, network: "GIWA Sepolia",
        publicPath: `/campaign/${campaignId}/v/1`, executionAvailable: false
      }
    });
    expect(JSON.stringify(publicVersion)).not.toMatch(/organizationId|publishedByMemberId|canonicalJson/u);
    expectErrorCode(() => service.getPublicVersion({ campaignId, versionNumber: 2 }), "not_found");
  });
});

import { describe, expect, it, vi } from "vitest";

import type { RateLimitDecision } from "./liveRateLimit.ts";
import type { StudioAuthenticatedSession, StudioWalletAuthContext } from "./studioAuthService.ts";
import { createMemoryStudioCampaignRepository } from "./studioCampaignRepository.ts";
import { createMemoryStudioCampaignVersionRepository } from "./studioCampaignVersionRepository.ts";
import { createStudioCampaignVersionService } from "./studioCampaignVersionService.ts";
import {
  createPublicCampaignVersionApiHandler,
  createStudioCampaignVersionApiHandler,
  type StudioCampaignVersionApiRequest
} from "./studioCampaignVersionApi.ts";

const rawToken = "a".repeat(43);
const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
const owner: StudioWalletAuthContext = {
  actorId: "0x1111111111111111111111111111111111111111",
  tenantId: "tenant-a",
  memberId: "member-a",
  mode: "wallet-session",
  organizationRole: "Owner",
  sessionId: "session-a"
};

function setup(options: { limiterDecision?: RateLimitDecision; authenticated?: boolean } = {}) {
  const campaigns = createMemoryStudioCampaignRepository();
  campaigns.createDraft({
    campaignId,
    organizationId: owner.tenantId,
    name: "Testnet preview",
    summary: "Mock assets only.",
    actionTemplate: "mockVaultDeposit",
    lifecycleState: "draft",
    source: "studio-draft",
    revision: 2,
    createdByMemberId: owner.memberId,
    updatedByMemberId: owner.memberId,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z"
  });
  const service = createStudioCampaignVersionService({
    repository: createMemoryStudioCampaignVersionRepository(campaigns),
    now: () => new Date("2026-08-01T00:00:00.000Z")
  });
  const session: StudioAuthenticatedSession = {
    context: owner,
    projection: {
      authenticated: true,
      organization: { id: owner.tenantId, displayName: "Private organization" },
      member: { walletAddress: owner.actorId, role: "Owner" },
      chainId: 91342,
      expiresAt: "2026-08-01T08:00:00.000Z"
    }
  };
  const authenticateSession = vi.fn((token: string) =>
    options.authenticated === false || token !== rawToken ? null : session
  );
  const consumeMutation = vi.fn(() => options.limiterDecision ?? {
    allowed: true as const, remaining: 1, resetAtMs: 10_000
  });
  return {
    service,
    authenticateSession,
    consumeMutation,
    studio: createStudioCampaignVersionApiHandler({
      service,
      authenticateSession,
      consumeMutation,
      origin: "https://app.example",
      secureCookie: true
    }),
    public: createPublicCampaignVersionApiHandler({ service })
  };
}

function studioRequest(
  request: Omit<StudioCampaignVersionApiRequest, "cookie" | "requestId"> & { requestId?: string }
): StudioCampaignVersionApiRequest {
  const { requestId = "req_version", ...rest } = request;
  return { ...rest, cookie: `giwa_studio_session=${rawToken}`, requestId };
}

describe("Studio campaign version HTTP APIs", () => {
  it("publishes an exact saved revision only after session, origin, and limiter checks", async () => {
    const { studio, service, authenticateSession, consumeMutation } = setup();
    const publish = vi.spyOn(service, "publishVersion");

    await expect(studio(studioRequest({
      method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`,
      origin: "https://app.example", body: { revision: 2 }
    }))).resolves.toMatchObject({
      status: 201,
      body: { campaignId, versionNumber: 1, publicPath: `/campaign/${campaignId}/v/1` },
      headers: {}
    });
    expect(authenticateSession).toHaveBeenCalledWith(rawToken);
    expect(consumeMutation).toHaveBeenCalledWith(owner);
    expect(publish).toHaveBeenCalledWith(owner, { campaignId, revision: 2 });
  });

  it("returns newest-first Studio history without private version fields", async () => {
    const { studio, service } = setup();
    service.publishVersion(owner, { campaignId, revision: 2 });

    const result = await studio(studioRequest({
      method: "GET", pathname: `/api/studio/campaigns/${campaignId}/versions`
    }));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ versions: [{ campaignId, versionNumber: 1 }] });
    expect(JSON.stringify(result.body)).not.toMatch(/organizationId|publishedByMemberId|canonicalJson|tenant|member/u);
  });

  it("rejects unknown own and inherited publish body fields", async () => {
    const { studio, service } = setup();
    const publish = vi.spyOn(service, "publishVersion");
    const inherited = Object.create({ revision: 2 });
    for (const body of [inherited, { revision: 2, extra: true }, { revision: 0 }, { revision: "2" }]) {
      await expect(studio(studioRequest({
        method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`,
        origin: "https://app.example", body
      }))).resolves.toEqual({ status: 400, body: { error: "invalid_request" }, headers: {} });
    }
    expect(publish).not.toHaveBeenCalled();
  });

  it("rejects a wrong origin before consuming the publish limiter", async () => {
    const { studio, service, consumeMutation } = setup();
    const publish = vi.spyOn(service, "publishVersion");
    await expect(studio(studioRequest({
      method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`,
      origin: "https://wrong.example", body: { revision: 2 }
    }))).resolves.toEqual({ status: 403, body: { error: "origin_not_allowed" }, headers: {} });
    expect(consumeMutation).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("maps session, service, and limiter failures without private fields", async () => {
    const missing = setup({ authenticated: false });
    await expect(missing.studio(studioRequest({
      method: "GET", pathname: `/api/studio/campaigns/${campaignId}/versions`
    }))).resolves.toMatchObject({ status: 401, body: { error: "authentication_required" } });

    const limited = setup({ limiterDecision: { allowed: false, code: "rate_limited", retryAfterMs: 1000 } });
    await expect(limited.studio(studioRequest({
      method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`,
      origin: "https://app.example", body: { revision: 2 }
    }))).resolves.toEqual({ status: 429, body: { error: "rate_limited", retryAfterMs: 1000 }, headers: {} });

    const conflict = setup();
    await expect(conflict.studio(studioRequest({
      method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`,
      origin: "https://app.example", body: { revision: 1 }
    }))).resolves.toEqual({ status: 409, body: { error: "revision_conflict" }, headers: {} });

    const duplicate = setup();
    duplicate.service.publishVersion(owner, { campaignId, revision: 2 });
    await expect(duplicate.studio(studioRequest({
      method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`,
      origin: "https://app.example", body: { revision: 2 }
    }))).resolves.toEqual({
      status: 409,
      body: {
        error: "already_published",
        existingVersion: { versionNumber: 1, publicPath: `/campaign/${campaignId}/v/1` }
      },
      headers: {}
    });
  });

  it("exposes only one exact public immutable projection with cache headers", async () => {
    const { public: publicHandler, service } = setup();
    service.publishVersion(owner, { campaignId, revision: 2 });

    const result = await publicHandler({
      method: "GET", pathname: `/api/public/campaigns/${campaignId}/versions/1`, requestId: "req_public"
    });
    expect(result).toMatchObject({
      status: 200,
      body: { campaign: { campaignId, versionNumber: 1, executionAvailable: false } },
      headers: { "cache-control": "public, max-age=300, immutable" }
    });
    expect(JSON.stringify(result.body)).not.toMatch(/organizationId|publishedByMemberId|canonicalJson|tenant|member/u);
  });

  it("returns generic no-store public errors for malformed, missing, and unavailable versions", async () => {
    const { public: publicHandler, service } = setup();
    const getPublic = vi.spyOn(service, "getPublicVersion");
    await expect(publicHandler({
      method: "GET", pathname: `/api/public/campaigns/${campaignId}/versions/9007199254740992`, requestId: "req_unsafe"
    })).resolves.toEqual({ status: 404, body: { error: "not_found" }, headers: { "cache-control": "no-store" } });
    expect(getPublic).not.toHaveBeenCalled();
    await expect(publicHandler({
      method: "GET", pathname: `/api/public/campaigns/${campaignId}/versions/1`, requestId: "req_missing"
    })).resolves.toEqual({ status: 404, body: { error: "not_found" }, headers: { "cache-control": "no-store" } });
    getPublic.mockImplementation(() => {
      throw new Error("private repository failure");
    });
    await expect(publicHandler({
      method: "GET", pathname: `/api/public/campaigns/${campaignId}/versions/1`, requestId: "req_unavailable"
    })).resolves.toEqual({
      status: 503,
      body: { error: "service_unavailable" },
      headers: { "cache-control": "no-store" }
    });
  });
});

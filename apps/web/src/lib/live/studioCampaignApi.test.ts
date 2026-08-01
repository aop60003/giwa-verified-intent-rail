import { describe, expect, it, vi } from "vitest";

import type { RateLimitDecision } from "./liveRateLimit.ts";
import type { StudioAuthenticatedSession, StudioWalletAuthContext } from "./studioAuthService.ts";
import { createMemoryStudioCampaignRepository } from "./studioCampaignRepository.ts";
import { createStudioCampaignService } from "./studioCampaignService.ts";
import {
  createStudioCampaignApiHandler,
  type StudioCampaignApiRequest
} from "./studioCampaignApi.ts";

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

function setup(options: {
  context?: StudioWalletAuthContext;
  authenticateSession?: (token: string) => StudioAuthenticatedSession | null;
  limiterDecision?: RateLimitDecision;
} = {}) {
  const repository = createMemoryStudioCampaignRepository();
  const service = createStudioCampaignService({
    repository,
    now: () => new Date("2026-08-01T00:00:00.000Z"),
    randomUUID: () => "00000000-0000-4000-8000-000000000001"
  });
  const context = options.context ?? owner;
  const session: StudioAuthenticatedSession = {
    context,
    projection: {
      authenticated: true,
      organization: { id: context.tenantId, displayName: "Private organization" },
      member: { walletAddress: context.actorId, role: context.organizationRole },
      chainId: 91_342,
      expiresAt: "2026-08-01T08:00:00.000Z"
    }
  };
  const authenticateSession = vi.fn(options.authenticateSession ?? ((token: string) => token === rawToken ? session : null));
  const consumeMutation = vi.fn(() => options.limiterDecision ?? {
    allowed: true as const,
    remaining: 3,
    resetAtMs: 10_000
  });
  return {
    repository,
    service,
    authenticateSession,
    consumeMutation,
    handle: createStudioCampaignApiHandler({
      authenticateSession,
      service,
      origin: "https://app.example",
      secureCookie: true,
      consumeMutation
    })
  };
}

function authenticatedRequest(
  overrides: Omit<StudioCampaignApiRequest, "cookie" | "requestId"> & { requestId?: string }
): StudioCampaignApiRequest {
  const { requestId = "req_campaign", ...request } = overrides;
  return {
    cookie: `giwa_studio_session=${rawToken}`,
    requestId,
    ...request
  };
}

describe("Studio campaign HTTP API", () => {
  it("lists only public-safe campaign projections for an authenticated Owner", async () => {
    const { handle, service, authenticateSession, consumeMutation } = setup();
    const list = vi.spyOn(service, "listCampaigns");

    const result = await handle(authenticatedRequest({
      method: "GET",
      pathname: "/api/studio/campaigns"
    }));

    expect(result).toEqual({
      status: 200,
      body: { campaigns: [], limits: { name: 80, summary: 280 } },
      headers: {}
    });
    expect(authenticateSession).toHaveBeenCalledWith(rawToken);
    expect(list).toHaveBeenCalledWith(owner);
    expect(consumeMutation).not.toHaveBeenCalled();
    expect(JSON.stringify(result.body)).not.toMatch(/context|token|tenant|member|source|author/u);
  });

  it("creates a Draft with an omitted summary forwarded as an empty string", async () => {
    const { handle, service, consumeMutation } = setup();
    const create = vi.spyOn(service, "createDraft");

    const result = await handle(authenticatedRequest({
      method: "POST",
      pathname: "/api/studio/campaigns",
      origin: "https://app.example",
      body: { name: "Draft" }
    }));

    expect(result).toMatchObject({
      status: 201,
      body: { campaignId, name: "Draft", summary: "", editable: true, revision: 1 },
      headers: {}
    });
    expect(create).toHaveBeenCalledWith(owner, { name: "Draft", summary: "" });
    expect(consumeMutation).toHaveBeenCalledWith(owner);
  });

  it("updates only a Draft selected by the exact supported campaign path", async () => {
    const { handle } = setup();
    await handle(authenticatedRequest({
      method: "POST",
      pathname: "/api/studio/campaigns",
      origin: "https://app.example",
      body: { name: "Draft", summary: "Initial" }
    }));

    await expect(handle(authenticatedRequest({
      method: "PATCH",
      pathname: `/api/studio/campaigns/${campaignId}`,
      origin: "https://app.example",
      body: { name: "Changed", summary: "Updated", revision: 1 }
    }))).resolves.toMatchObject({
      status: 200,
      body: { campaignId, name: "Changed", summary: "Updated", revision: 2 },
      headers: {}
    });
  });

  it("fails closed for unsupported paths and methods without authentication or service access", async () => {
    const { handle, service, authenticateSession } = setup();
    const list = vi.spyOn(service, "listCampaigns");
    const create = vi.spyOn(service, "createDraft");
    const update = vi.spyOn(service, "updateDraft");

    for (const [method, pathname] of [
      ["POST", "/api/studio/campaigns/extra"],
      ["DELETE", "/api/studio/campaigns"],
      ["PATCH", "/api/studio/campaigns/campaign_z"],
      ["GET", "/api/studio/campaigns/gasok-demo"]
    ] as const) {
      await expect(handle(authenticatedRequest({ method, pathname }))).resolves.toEqual({
        status: 404,
        body: { error: "not_found" },
        headers: {}
      });
    }
    expect(authenticateSession).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects missing, malformed, and expired sessions without service access", async () => {
    const expired = "b".repeat(43);
    const { handle, service, authenticateSession, consumeMutation } = setup();
    const list = vi.spyOn(service, "listCampaigns");
    const create = vi.spyOn(service, "createDraft");

    await expect(handle({ method: "GET", pathname: "/api/studio/campaigns", requestId: "req_missing" }))
      .resolves.toEqual({ status: 401, body: { error: "authentication_required" }, headers: {} });
    await expect(handle({
      method: "GET", pathname: "/api/studio/campaigns", cookie: "giwa_studio_session=malformed", requestId: "req_malformed"
    })).resolves.toEqual({
      status: 401,
      body: { error: "authentication_required" },
      headers: { "set-cookie": "giwa_studio_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure" }
    });
    await expect(handle({
      method: "POST", pathname: "/api/studio/campaigns", origin: "https://app.example", body: { name: "Draft" },
      cookie: `giwa_studio_session=${expired}`, requestId: "req_expired"
    })).resolves.toEqual({
      status: 401,
      body: { error: "authentication_required" },
      headers: { "set-cookie": "giwa_studio_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure" }
    });
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(authenticateSession).toHaveBeenCalledTimes(1);
    expect(authenticateSession).toHaveBeenCalledWith(expired);
    expect(consumeMutation).not.toHaveBeenCalled();
  });

  it("rejects mutation origins before consuming the limiter or calling the service", async () => {
    const { handle, service, consumeMutation } = setup();
    const create = vi.spyOn(service, "createDraft");

    for (const origin of [undefined, "https://wrong.example"]) {
      await expect(handle(authenticatedRequest({
        method: "POST", pathname: "/api/studio/campaigns", ...(origin === undefined ? {} : { origin }), body: { name: "Draft" }
      }))).resolves.toEqual({ status: 403, body: { error: "origin_not_allowed" }, headers: {} });
    }
    expect(consumeMutation).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns the limiter retry interval after authentication and origin validation", async () => {
    const { handle, service, consumeMutation } = setup({
      limiterDecision: { allowed: false, code: "rate_limited", retryAfterMs: 4_200 }
    });
    const create = vi.spyOn(service, "createDraft");

    await expect(handle(authenticatedRequest({
      method: "POST", pathname: "/api/studio/campaigns", origin: "https://app.example", body: { name: "Draft" }
    }))).resolves.toEqual({
      status: 429,
      body: { error: "rate_limited", retryAfterMs: 4_200 },
      headers: {}
    });
    expect(consumeMutation).toHaveBeenCalledWith(owner);
    expect(create).not.toHaveBeenCalled();
  });

  it("requires exact own request fields and rejects inherited or sensitive substitutes", async () => {
    const { handle, service } = setup();
    const create = vi.spyOn(service, "createDraft");
    const update = vi.spyOn(service, "updateDraft");
    const inherited = Object.create({ name: "Draft", summary: "", revision: 1 }) as object;

    for (const [method, pathname, body] of [
      ["POST", "/api/studio/campaigns", null],
      ["POST", "/api/studio/campaigns", []],
      ["POST", "/api/studio/campaigns", inherited],
      ["POST", "/api/studio/campaigns", { name: "Draft", action: "publish" }],
      ["POST", "/api/studio/campaigns", { name: "Draft", tenant: "tenant-b" }],
      ["PATCH", `/api/studio/campaigns/${campaignId}`, { name: "Draft", summary: "", revision: 1, source: "private" }],
      ["PATCH", `/api/studio/campaigns/${campaignId}`, { name: "Draft", summary: "", revision: "1" }],
      ["PATCH", `/api/studio/campaigns/${campaignId}`, { name: "Draft", summary: "" }]
    ] as const) {
      await expect(handle(authenticatedRequest({
        method, pathname, origin: "https://app.example", body
      }))).resolves.toEqual({ status: 400, body: { error: "invalid_request" }, headers: {} });
    }
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects non-enumerable and symbol own keys after applying the authenticated mutation limiter", async () => {
    const createWithTenant = { name: "Draft" };
    Object.defineProperty(createWithTenant, "tenant", { value: "tenant-b" });
    const updateWithSource = { name: "Changed", summary: "", revision: 1 };
    Object.defineProperty(updateWithSource, "source", { value: "private" });
    const createWithSymbol = { name: "Draft" };
    Object.defineProperty(createWithSymbol, Symbol("tenant"), { value: "tenant-b" });
    const updateWithSymbol = { name: "Changed", summary: "", revision: 1 };
    Object.defineProperty(updateWithSymbol, Symbol("source"), { value: "private" });

    for (const body of [createWithTenant, createWithSymbol]) {
      const { handle, service, consumeMutation } = setup();
      const create = vi.spyOn(service, "createDraft");
      await expect(handle(authenticatedRequest({
        method: "POST", pathname: "/api/studio/campaigns", origin: "https://app.example", body
      }))).resolves.toEqual({ status: 400, body: { error: "invalid_request" }, headers: {} });
      expect(consumeMutation).toHaveBeenCalledTimes(1);
      expect(create).not.toHaveBeenCalled();
    }
    for (const body of [updateWithSource, updateWithSymbol]) {
      const { handle, service, consumeMutation } = setup();
      const draft = service.createDraft(owner, { name: "Existing" });
      const update = vi.spyOn(service, "updateDraft");
      await expect(handle(authenticatedRequest({
        method: "PATCH", pathname: `/api/studio/campaigns/${draft.campaignId}`, origin: "https://app.example", body
      }))).resolves.toEqual({ status: 400, body: { error: "invalid_request" }, headers: {} });
      expect(consumeMutation).toHaveBeenCalledTimes(1);
      expect(update).not.toHaveBeenCalled();
    }
  });

  it("maps campaign service failures to opaque client errors", async () => {
    const { handle, service } = setup();
    service.bootstrapBaseline(owner.tenantId);
    const draft = service.createDraft(owner, { name: "Draft" });
    service.updateDraft(owner, { campaignId: draft.campaignId, name: "Changed", summary: "", revision: 1 });

    await expect(handle(authenticatedRequest({
      method: "POST", pathname: "/api/studio/campaigns", origin: "https://app.example", body: { name: "" }
    }))).resolves.toEqual({ status: 400, body: { error: "invalid_request" }, headers: {} });
    await expect(handle(authenticatedRequest({
      method: "PATCH", pathname: "/api/studio/campaigns/gasok-demo", origin: "https://app.example",
      body: { name: "Changed", summary: "", revision: 1 }
    }))).resolves.toEqual({ status: 404, body: { error: "not_found" }, headers: {} });
    await expect(handle(authenticatedRequest({
      method: "PATCH", pathname: `/api/studio/campaigns/${campaignId}`, origin: "https://app.example",
      body: { name: "Stale", summary: "", revision: 1 }
    }))).resolves.toEqual({ status: 409, body: { error: "revision_conflict" }, headers: {} });
  });

  it("maps non-Owner service access and unexpected failures without private details", async () => {
    const editor = { ...owner, organizationRole: "Editor" as const };
    const denied = setup({ context: editor });
    await expect(denied.handle(authenticatedRequest({
      method: "POST", pathname: "/api/studio/campaigns", origin: "https://app.example", body: { name: "Draft" }
    }))).resolves.toEqual({ status: 403, body: { error: "insufficient_access" }, headers: {} });

    const unexpected = setup();
    vi.spyOn(unexpected.service, "createDraft").mockImplementation(() => {
      throw new Error("private tenant member source token");
    });
    const result = await unexpected.handle(authenticatedRequest({
      method: "POST", pathname: "/api/studio/campaigns", origin: "https://app.example", body: { name: "Draft" }, requestId: "req_failure"
    }));
    expect(result).toEqual({
      status: 503,
      body: { error: "service_unavailable", requestId: "req_failure" },
      headers: {}
    });
    expect(JSON.stringify(result.body)).not.toMatch(/tenant|member|source|token/u);
  });
});

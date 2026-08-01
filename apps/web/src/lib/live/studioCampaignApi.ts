import type { RateLimitDecision } from "./liveRateLimit.ts";
import type { StudioAuthenticatedSession, StudioWalletAuthContext } from "./studioAuthService.ts";
import {
  createStudioCampaignService,
  StudioCampaignServiceError
} from "./studioCampaignService.ts";
import {
  clearStudioSessionCookie,
  parseStudioSessionCookie
} from "./studioSessionCookie.ts";

export type StudioCampaignApiRequest = {
  method: string;
  pathname: string;
  origin?: string;
  cookie?: string;
  body?: unknown;
  requestId: string;
};

export type StudioCampaignApiResult = {
  status: number;
  body: Record<string, unknown> | null;
  headers: Record<string, string>;
};

type StudioCampaignService = ReturnType<typeof createStudioCampaignService>;

type StudioCampaignRoute =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "update"; campaignId: string };

const UPDATE_PATH = /^\/api\/studio\/campaigns\/(campaign_[0-9a-f-]+|gasok-demo)$/u;

function routeFor(method: string, pathname: string): StudioCampaignRoute | null {
  if (method === "GET" && pathname === "/api/studio/campaigns") return { kind: "list" };
  if (method === "POST" && pathname === "/api/studio/campaigns") return { kind: "create" };
  const update = method === "PATCH" ? UPDATE_PATH.exec(pathname) : null;
  return update?.[1] === undefined ? null : { kind: "update", campaignId: update[1] };
}

function exactCreateBody(body: unknown): body is { name: string; summary?: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Reflect.ownKeys(body);
  if (!Object.hasOwn(body, "name") || typeof (body as { name?: unknown }).name !== "string") return false;
  if (keys.length === 1) return true;
  return keys.length === 2 && Object.hasOwn(body, "summary") && typeof (body as { summary?: unknown }).summary === "string";
}

function exactUpdateBody(body: unknown): body is { name: string; summary: string; revision: number } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Reflect.ownKeys(body);
  return keys.length === 3 &&
    Object.hasOwn(body, "name") &&
    Object.hasOwn(body, "summary") &&
    Object.hasOwn(body, "revision") &&
    typeof (body as { name?: unknown }).name === "string" &&
    typeof (body as { summary?: unknown }).summary === "string" &&
    typeof (body as { revision?: unknown }).revision === "number";
}

function result(
  status: number,
  body: Record<string, unknown> | null,
  headers: Record<string, string> = {}
): StudioCampaignApiResult {
  return { status, body, headers };
}

function authenticationRequired(cookiePresent: boolean, secureCookie: boolean): StudioCampaignApiResult {
  return result(
    401,
    { error: "authentication_required" },
    cookiePresent ? { "set-cookie": clearStudioSessionCookie(secureCookie) } : {}
  );
}

function campaignServiceError(error: StudioCampaignServiceError): StudioCampaignApiResult {
  switch (error.code) {
    case "invalid_request": return result(400, { error: "invalid_request" });
    case "insufficient_access": return result(403, { error: "insufficient_access" });
    case "not_found": return result(404, { error: "not_found" });
    case "revision_conflict": return result(409, { error: "revision_conflict" });
  }
}

export function createStudioCampaignApiHandler(options: {
  authenticateSession(rawToken: string): StudioAuthenticatedSession | null;
  service: StudioCampaignService;
  origin: string;
  secureCookie: boolean;
  consumeMutation(context: StudioWalletAuthContext): RateLimitDecision;
}): (request: StudioCampaignApiRequest) => Promise<StudioCampaignApiResult> {
  return async function handle(request: StudioCampaignApiRequest): Promise<StudioCampaignApiResult> {
    const route = routeFor(request.method, request.pathname);
    if (route === null) return result(404, { error: "not_found" });

    try {
      const cookie = parseStudioSessionCookie(request.cookie);
      if (cookie.rawToken === null) return authenticationRequired(cookie.present, options.secureCookie);
      const session = options.authenticateSession(cookie.rawToken);
      if (session === null) return authenticationRequired(true, options.secureCookie);

      const mutation = route.kind !== "list";
      if (mutation && request.origin !== options.origin) {
        return result(403, { error: "origin_not_allowed" });
      }
      if (mutation) {
        const decision = options.consumeMutation(session.context);
        if (!decision.allowed) {
          return result(429, { error: "rate_limited", retryAfterMs: decision.retryAfterMs });
        }
      }

      if (route.kind === "list") return result(200, options.service.listCampaigns(session.context));
      if (route.kind === "create") {
        if (!exactCreateBody(request.body)) return result(400, { error: "invalid_request" });
        return result(201, options.service.createDraft(session.context, {
          name: request.body.name,
          summary: request.body.summary ?? ""
        }));
      }
      if (!exactUpdateBody(request.body)) return result(400, { error: "invalid_request" });
      return result(200, options.service.updateDraft(session.context, {
        campaignId: route.campaignId,
        name: request.body.name,
        summary: request.body.summary,
        revision: request.body.revision
      }));
    } catch (error) {
      if (error instanceof StudioCampaignServiceError) return campaignServiceError(error);
      return result(503, { error: "service_unavailable", requestId: request.requestId });
    }
  };
}

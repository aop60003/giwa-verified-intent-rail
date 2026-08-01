import type { RateLimitDecision } from "./liveRateLimit.ts";
import type { StudioAuthenticatedSession, StudioWalletAuthContext } from "./studioAuthService.ts";
import { isPositiveSafeInteger } from "./studioCampaignIdentifier.ts";
import {
  createStudioCampaignVersionService,
  StudioCampaignVersionServiceError
} from "./studioCampaignVersionService.ts";
import {
  clearStudioSessionCookie,
  parseStudioSessionCookie
} from "./studioSessionCookie.ts";

const STUDIO_PUBLISH = /^\/api\/studio\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/publish$/u;
const STUDIO_VERSIONS = /^\/api\/studio\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/versions$/u;
const PUBLIC_VERSION = /^\/api\/public\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/versions\/([1-9][0-9]*)$/u;

type StudioCampaignVersionService = ReturnType<typeof createStudioCampaignVersionService>;

export type StudioCampaignVersionApiRequest = {
  method: string;
  pathname: string;
  origin?: string;
  cookie?: string;
  body?: unknown;
  requestId: string;
};

export type CampaignVersionApiResult = {
  status: number;
  body: Record<string, unknown> | null;
  headers: Record<string, string>;
};

type StudioVersionRoute =
  | { kind: "publish"; campaignId: string }
  | { kind: "list"; campaignId: string };

function result(
  status: number,
  body: Record<string, unknown> | null,
  headers: Record<string, string> = {}
): CampaignVersionApiResult {
  return { status, body, headers };
}

function studioRouteFor(method: string, pathname: string): StudioVersionRoute | null {
  const publish = method === "POST" ? STUDIO_PUBLISH.exec(pathname) : null;
  if (publish?.[1] !== undefined) return { kind: "publish", campaignId: publish[1] };
  const list = method === "GET" ? STUDIO_VERSIONS.exec(pathname) : null;
  return list?.[1] === undefined ? null : { kind: "list", campaignId: list[1] };
}

function publicRouteFor(method: string, pathname: string): { campaignId: string; versionNumber: number } | null {
  const matched = method === "GET" ? PUBLIC_VERSION.exec(pathname) : null;
  if (matched?.[1] === undefined || matched[2] === undefined) return null;
  const versionNumber = Number(matched[2]);
  return isPositiveSafeInteger(versionNumber) ? { campaignId: matched[1], versionNumber } : null;
}

function exactPublishBody(body: unknown): body is { revision: number } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Reflect.ownKeys(body);
  return keys.length === 1 &&
    keys[0] === "revision" &&
    Object.hasOwn(body, "revision") &&
    isPositiveSafeInteger((body as { revision?: unknown }).revision);
}

function authenticationRequired(cookiePresent: boolean, secureCookie: boolean): CampaignVersionApiResult {
  return result(
    401,
    { error: "authentication_required" },
    cookiePresent ? { "set-cookie": clearStudioSessionCookie(secureCookie) } : {}
  );
}

function studioServiceError(error: StudioCampaignVersionServiceError): CampaignVersionApiResult {
  switch (error.code) {
    case "invalid_request": return result(400, { error: "invalid_request" });
    case "insufficient_access": return result(403, { error: "insufficient_access" });
    case "not_found": return result(404, { error: "not_found" });
    case "revision_conflict": return result(409, { error: "revision_conflict" });
    case "already_published":
    case "no_changes_to_publish":
      if (error.existingVersion === null) return result(503, { error: "service_unavailable" });
      return result(409, {
        error: error.code,
        existingVersion: {
          versionNumber: error.existingVersion.versionNumber,
          publicPath: error.existingVersion.publicPath
        }
      });
  }
}

export function createStudioCampaignVersionApiHandler(options: {
  authenticateSession(rawToken: string): StudioAuthenticatedSession | null;
  service: StudioCampaignVersionService;
  origin: string;
  secureCookie: boolean;
  consumeMutation(context: StudioWalletAuthContext): RateLimitDecision;
}): (request: StudioCampaignVersionApiRequest) => Promise<CampaignVersionApiResult> {
  return async function handle(request: StudioCampaignVersionApiRequest): Promise<CampaignVersionApiResult> {
    const route = studioRouteFor(request.method, request.pathname);
    if (route === null) return result(404, { error: "not_found" });

    try {
      const cookie = parseStudioSessionCookie(request.cookie);
      if (cookie.rawToken === null) return authenticationRequired(cookie.present, options.secureCookie);
      const session = options.authenticateSession(cookie.rawToken);
      if (session === null) return authenticationRequired(true, options.secureCookie);

      if (route.kind === "publish") {
        if (request.origin !== options.origin) return result(403, { error: "origin_not_allowed" });
        const decision = options.consumeMutation(session.context);
        if (!decision.allowed) {
          return result(429, { error: "rate_limited", retryAfterMs: decision.retryAfterMs });
        }
        if (!exactPublishBody(request.body)) return result(400, { error: "invalid_request" });
        return result(201, options.service.publishVersion(session.context, {
          campaignId: route.campaignId,
          revision: request.body.revision
        }));
      }
      return result(200, options.service.listVersions(session.context, { campaignId: route.campaignId }));
    } catch (error) {
      if (error instanceof StudioCampaignVersionServiceError) return studioServiceError(error);
      return result(503, { error: "service_unavailable", requestId: request.requestId });
    }
  };
}

export function createPublicCampaignVersionApiHandler(options: {
  service: StudioCampaignVersionService;
}): (request: Pick<StudioCampaignVersionApiRequest, "method" | "pathname" | "requestId">) => Promise<CampaignVersionApiResult> {
  return async function handle(request): Promise<CampaignVersionApiResult> {
    const route = publicRouteFor(request.method, request.pathname);
    if (route === null) return result(404, { error: "not_found" }, { "cache-control": "no-store" });
    try {
      return result(
        200,
        options.service.getPublicVersion(route),
        { "cache-control": "public, max-age=300, immutable" }
      );
    } catch (error) {
      if (error instanceof StudioCampaignVersionServiceError && error.code === "not_found") {
        return result(404, { error: "not_found" }, { "cache-control": "no-store" });
      }
      return result(503, { error: "service_unavailable" }, { "cache-control": "no-store" });
    }
  };
}

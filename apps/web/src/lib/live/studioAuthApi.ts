import type {
  StudioAuthenticatedSession,
  StudioAuthVerificationResult
} from "./studioAuthService.ts";
import { normalizeStudioWallet } from "./studioAuthMessage.ts";
import {
  clearStudioSessionCookie,
  isStudioSessionToken,
  parseStudioSessionCookie,
  studioSessionCookie
} from "./studioSessionCookie.ts";

type StudioAuthService = {
  createChallenge(walletAddress: string): {
    challengeId: string;
    message: string;
    expiresAt: string;
  };
  verifyChallenge(input: {
    challengeId: string;
    message: string;
    signature: string;
  }): Promise<StudioAuthVerificationResult>;
  authenticateSession(rawToken: string): StudioAuthenticatedSession | null;
  logout(rawToken: string): void;
};

export type CreateStudioAuthApiHandlerOptions = {
  service: StudioAuthService;
  origin: string;
  secureCookie: boolean;
};

export type StudioAuthApiRequest = {
  method: string;
  pathname: string;
  origin?: string;
  cookie?: string;
  body?: unknown;
  requestId: string;
};

export type StudioAuthApiResult = {
  status: number;
  body: Record<string, unknown> | null;
  headers: Record<string, string>;
};

function exactStringBody<const Keys extends readonly string[]>(
  body: unknown,
  keys: Keys
): body is Record<Keys[number], string> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return false;
  const ownKeys = Object.keys(body);
  return ownKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(body, key) && typeof (body as Record<string, unknown>)[key] === "string") &&
    ownKeys.every((key) => keys.includes(key));
}

function validStudioWallet(value: string): boolean {
  try {
    normalizeStudioWallet(value);
    return true;
  } catch {
    return false;
  }
}

function result(
  status: number,
  body: Record<string, unknown> | null,
  headers: Record<string, string> = {}
): StudioAuthApiResult {
  return { status, body, headers };
}

export function createStudioAuthApiHandler(options: CreateStudioAuthApiHandlerOptions) {
  return async function handle(request: StudioAuthApiRequest): Promise<StudioAuthApiResult> {
    const isChallenge = request.method === "POST" && request.pathname === "/api/auth/challenge";
    const isVerify = request.method === "POST" && request.pathname === "/api/auth/verify";
    const isSession = request.method === "GET" && request.pathname === "/api/auth/session";
    const isLogout = request.method === "POST" && request.pathname === "/api/auth/logout";

    if (!isChallenge && !isVerify && !isSession && !isLogout) {
      return result(404, { error: "not_found" });
    }
    if ((isChallenge || isVerify || isLogout) && request.origin !== options.origin) {
      return result(403, { error: "origin_not_allowed" });
    }

    try {
      if (isChallenge) {
        if (
          !exactStringBody(request.body, ["walletAddress"]) ||
          !validStudioWallet(request.body.walletAddress)
        ) {
          return result(400, { error: "invalid_request" });
        }
        return result(200, options.service.createChallenge(request.body.walletAddress));
      }

      if (isVerify) {
        if (!exactStringBody(request.body, ["challengeId", "message", "signature"])) {
          return result(400, { error: "invalid_request" });
        }
        const verified = await options.service.verifyChallenge(request.body);
        if (!verified.ok) return result(401, { error: "authentication_failed" });
        if (!isStudioSessionToken(verified.rawToken)) throw new Error("Invalid session token");
        return result(200, verified.projection, {
          "set-cookie": studioSessionCookie(
            verified.rawToken,
            verified.projection.expiresAt,
            options.secureCookie
          )
        });
      }

      if (isLogout && !exactStringBody(request.body, [])) {
        return result(400, { error: "invalid_request" });
      }

      const cookie = parseStudioSessionCookie(request.cookie);
      if (isSession) {
        if (cookie.rawToken !== null) {
          const authenticated = options.service.authenticateSession(cookie.rawToken);
          if (authenticated !== null) return result(200, authenticated.projection);
        }
        return result(
          200,
          { authenticated: false },
          cookie.present ? { "set-cookie": clearStudioSessionCookie(options.secureCookie) } : {}
        );
      }

      if (cookie.rawToken !== null) options.service.logout(cookie.rawToken);
      return result(204, null, {
        "set-cookie": clearStudioSessionCookie(options.secureCookie)
      });
    } catch {
      return result(500, { error: "service_unavailable", requestId: request.requestId });
    }
  };
}

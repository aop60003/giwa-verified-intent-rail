import { describe, expect, it, vi } from "vitest";

import { createStudioAuthApiHandler } from "./studioAuthApi.ts";
import type { StudioAuthVerificationResult } from "./studioAuthService.ts";

const rawToken = "a".repeat(43);
const expiredToken = "b".repeat(43);
const expiresAt = "2026-08-01T08:00:00.000Z";
const projection = {
  authenticated: true as const,
  organization: { id: "tenant_default", displayName: "Loop" },
  member: {
    walletAddress: "0x1111111111111111111111111111111111111111" as const,
    role: "Owner" as const
  },
  chainId: 91_342 as const,
  expiresAt
};
const challenge = {
  challengeId: "challenge_example",
  message: "canonical message",
  expiresAt: "2026-08-01T00:05:00.000Z"
};

function setup(options: { secureCookie?: boolean } = {}) {
  const service = {
    createChallenge: vi.fn(() => challenge),
    verifyChallenge: vi.fn(async (): Promise<StudioAuthVerificationResult> => ({
      ok: true,
      rawToken,
      projection
    })),
    authenticateSession: vi.fn((token: string) =>
      token === rawToken ? { context: {} as never, projection } : null
    ),
    logout: vi.fn()
  };
  return {
    service,
    handle: createStudioAuthApiHandler({
      service,
      origin: "https://app.example",
      secureCookie: options.secureCookie ?? true
    })
  };
}

describe("Studio auth HTTP API", () => {
  it("creates a challenge only from the exact wallet-address body", async () => {
    const { handle, service } = setup();

    await expect(handle({
      method: "POST",
      pathname: "/api/auth/challenge",
      origin: "https://app.example",
      body: { walletAddress: projection.member.walletAddress },
      requestId: "req_challenge"
    })).resolves.toEqual({ status: 200, body: challenge, headers: {} });
    expect(service.createChallenge).toHaveBeenCalledWith(projection.member.walletAddress);
  });

  it("verifies an exact request without exposing the raw token in JSON", async () => {
    const { handle, service } = setup();
    const input = {
      challengeId: challenge.challengeId,
      message: challenge.message,
      signature: "0xsigned"
    };

    const result = await handle({
      method: "POST",
      pathname: "/api/auth/verify",
      origin: "https://app.example",
      body: input,
      requestId: "req_verify"
    });

    expect(service.verifyChallenge).toHaveBeenCalledWith(input);
    expect(result.status).toBe(200);
    expect(result.body).toEqual(projection);
    expect(result.headers).toHaveProperty("set-cookie");
    expect(JSON.stringify(result.body)).not.toContain(rawToken);
  });

  it("recovers valid sessions and returns an unauthenticated projection without a cookie", async () => {
    const { handle, service } = setup();

    await expect(handle({
      method: "GET",
      pathname: "/api/auth/session",
      cookie: `other=value; giwa_studio_session=${rawToken}`,
      requestId: "req_session"
    })).resolves.toEqual({ status: 200, body: projection, headers: {} });
    expect(service.authenticateSession).toHaveBeenCalledWith(rawToken);

    await expect(handle({
      method: "GET",
      pathname: "/api/auth/session",
      requestId: "req_missing"
    })).resolves.toEqual({
      status: 200,
      body: { authenticated: false },
      headers: {}
    });
  });

  it("treats expired, duplicate, malformed, and invalid-length cookies as absent and clears them", async () => {
    const { handle, service } = setup();
    const staleCookies = [
      `giwa_studio_session=${expiredToken}`,
      `giwa_studio_session=${rawToken}; giwa_studio_session=${expiredToken}`,
      `giwa_studio_session=${"a".repeat(42)}`,
      `giwa_studio_session=%${"a".repeat(42)}`,
      "giwa_studio_session"
    ];

    for (const cookie of staleCookies) {
      const result = await handle({
        method: "GET",
        pathname: "/api/auth/session",
        cookie,
        requestId: "req_stale"
      });
      expect(result).toEqual({
        status: 200,
        body: { authenticated: false },
        headers: {
          "set-cookie": "giwa_studio_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure"
        }
      });
    }
    expect(service.authenticateSession).toHaveBeenCalledTimes(1);
    expect(service.authenticateSession).toHaveBeenCalledWith(expiredToken);
  });

  it("revokes a valid session before returning the exact clear cookie", async () => {
    const { handle, service } = setup();

    const result = await handle({
      method: "POST",
      pathname: "/api/auth/logout",
      origin: "https://app.example",
      cookie: `giwa_studio_session=${rawToken}`,
      body: {},
      requestId: "req_logout"
    });

    expect(service.logout).toHaveBeenCalledWith(rawToken);
    expect(result).toEqual({
      status: 204,
      body: null,
      headers: {
        "set-cookie": "giwa_studio_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure"
      }
    });
  });

  it("does not clear the cookie when logout revocation fails", async () => {
    const { handle, service } = setup();
    service.logout.mockImplementation(() => {
      throw new Error("private store detail");
    });

    await expect(handle({
      method: "POST",
      pathname: "/api/auth/logout",
      origin: "https://app.example",
      cookie: `giwa_studio_session=${rawToken}`,
      body: {},
      requestId: "req_logout_failure"
    })).resolves.toEqual({
      status: 500,
      body: { error: "service_unavailable", requestId: "req_logout_failure" },
      headers: {}
    });
  });

  it("rejects a missing or mismatched Origin on every auth POST before service work", async () => {
    for (const [pathname, body] of [
      ["/api/auth/challenge", { walletAddress: projection.member.walletAddress }],
      ["/api/auth/verify", { challengeId: "id", message: "message", signature: "signature" }],
      ["/api/auth/logout", {}]
    ] as const) {
      for (const origin of [undefined, "https://wrong.example"]) {
        const { handle, service } = setup();
        await expect(handle({
          method: "POST",
          pathname,
          ...(origin === undefined ? {} : { origin }),
          body,
          requestId: "req_origin"
        })).resolves.toEqual({
          status: 403,
          body: { error: "origin_not_allowed" },
          headers: {}
        });
        expect(service.createChallenge).not.toHaveBeenCalled();
        expect(service.verifyChallenge).not.toHaveBeenCalled();
        expect(service.logout).not.toHaveBeenCalled();
      }
    }
  });

  it("rejects non-object, inherited, additional, missing, and non-string request fields", async () => {
    const { handle, service } = setup();
    const inherited = Object.create({ walletAddress: projection.member.walletAddress }) as object;
    const cases = [
      ["/api/auth/challenge", null],
      ["/api/auth/challenge", []],
      ["/api/auth/challenge", inherited],
      ["/api/auth/challenge", { walletAddress: projection.member.walletAddress, extra: true }],
      ["/api/auth/challenge", { walletAddress: 1 }],
      ["/api/auth/challenge", { walletAddress: "not-a-wallet" }],
      ["/api/auth/verify", { challengeId: "id", message: "message" }],
      ["/api/auth/verify", { challengeId: "id", message: "message", signature: 1 }],
      ["/api/auth/logout", null],
      ["/api/auth/logout", []],
      ["/api/auth/logout", { extra: true }]
    ] as const;

    for (const [pathname, body] of cases) {
      await expect(handle({
        method: "POST",
        pathname,
        origin: "https://app.example",
        body,
        requestId: "req_invalid"
      })).resolves.toEqual({
        status: 400,
        body: { error: "invalid_request" },
        headers: {}
      });
    }
    expect(service.createChallenge).not.toHaveBeenCalled();
    expect(service.verifyChallenge).not.toHaveBeenCalled();
    expect(service.logout).not.toHaveBeenCalled();
  });

  it("returns one generic 401 for verification failure", async () => {
    const { handle, service } = setup();
    service.verifyChallenge.mockResolvedValue({ ok: false, code: "authentication_failed" });

    await expect(handle({
      method: "POST",
      pathname: "/api/auth/verify",
      origin: "https://app.example",
      body: { challengeId: "unknown", message: "message", signature: "signature" },
      requestId: "req_denied"
    })).resolves.toEqual({
      status: 401,
      body: { error: "authentication_failed" },
      headers: {}
    });
  });

  it("sanitizes unexpected service failures and includes only the request ID", async () => {
    const { handle, service } = setup();
    service.createChallenge.mockImplementation(() => {
      throw new Error("database password and member detail");
    });

    await expect(handle({
      method: "POST",
      pathname: "/api/auth/challenge",
      origin: "https://app.example",
      body: { walletAddress: projection.member.walletAddress },
      requestId: "req_failure"
    })).resolves.toEqual({
      status: 500,
      body: { error: "service_unavailable", requestId: "req_failure" },
      headers: {}
    });
  });

  it("fails closed for every method or path outside the four exact pairs", async () => {
    const { handle, service } = setup();
    for (const [method, pathname] of [
      ["GET", "/api/auth/challenge"],
      ["POST", "/api/auth/challenge/extra"],
      ["GET", "/api/auth/verify"],
      ["POST", "/api/auth/session"],
      ["GET", "/api/auth/logout"]
    ] as const) {
      await expect(handle({ method, pathname, requestId: "req_unknown" })).resolves.toEqual({
        status: 404,
        body: { error: "not_found" },
        headers: {}
      });
    }
    expect(service.createChallenge).not.toHaveBeenCalled();
    expect(service.verifyChallenge).not.toHaveBeenCalled();
    expect(service.authenticateSession).not.toHaveBeenCalled();
    expect(service.logout).not.toHaveBeenCalled();
  });
});

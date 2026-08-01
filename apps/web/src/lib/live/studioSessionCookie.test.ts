import { describe, expect, it } from "vitest";

import {
  STUDIO_SESSION_COOKIE_NAME,
  clearStudioSessionCookie,
  isStudioSessionToken,
  parseStudioSessionCookie,
  studioSessionCookie
} from "./studioSessionCookie.ts";

const rawToken = "a".repeat(43);

describe("Studio session cookie", () => {
  it("owns the strict 43-character session-token grammar", () => {
    expect(isStudioSessionToken(rawToken)).toBe(true);
    expect(isStudioSessionToken("a".repeat(42))).toBe(false);
    expect(isStudioSessionToken(`%${"a".repeat(42)}`)).toBe(false);
  });

  it("accepts one valid session token and reports absent cookies", () => {
    expect(parseStudioSessionCookie(undefined)).toEqual({ present: false, rawToken: null });
    expect(parseStudioSessionCookie(`other=value; ${STUDIO_SESSION_COOKIE_NAME}=${rawToken}`))
      .toEqual({ present: true, rawToken });
  });

  it("marks malformed and duplicate session cookies as present but invalid", () => {
    for (const cookie of [
      STUDIO_SESSION_COOKIE_NAME,
      `${STUDIO_SESSION_COOKIE_NAME}=${"a".repeat(42)}`,
      `${STUDIO_SESSION_COOKIE_NAME}=%${"a".repeat(42)}`,
      `${STUDIO_SESSION_COOKIE_NAME}=one; ${STUDIO_SESSION_COOKIE_NAME}=two`
    ]) {
      expect(parseStudioSessionCookie(cookie)).toEqual({ present: true, rawToken: null });
    }
  });

  it("sets the exact secure production session cookie", () => {
    expect(studioSessionCookie(rawToken, "2026-08-01T08:00:00.000Z", true)).toBe(
      `${STUDIO_SESSION_COOKIE_NAME}=${rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800; Expires=Sat, 01 Aug 2026 08:00:00 GMT; Secure`
    );
  });

  it("omits Secure for explicit loopback development", () => {
    expect(studioSessionCookie(rawToken, "2026-08-01T08:00:00.000Z", false)).toBe(
      `${STUDIO_SESSION_COOKIE_NAME}=${rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800; Expires=Sat, 01 Aug 2026 08:00:00 GMT`
    );
  });

  it("clears the session cookie with the epoch expiry", () => {
    expect(clearStudioSessionCookie(true)).toBe(
      `${STUDIO_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure`
    );
    expect(clearStudioSessionCookie(false)).toBe(
      `${STUDIO_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
  });
});

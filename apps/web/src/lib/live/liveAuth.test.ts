import { describe, expect, it } from "vitest";

import { authenticateLiveRequest, hashLiveCredential } from "./liveAuth.ts";

const rawCredential = "alpha-secret-for-test";
const credentials = [
  {
    id: "cred_partner_alpha",
    tenantId: "tenant_alpha",
    scopes: ["runs:write", "runs:read", "receipts:read", "partner:read"] as const,
    tokenHash: hashLiveCredential(rawCredential)
  }
];

describe("authenticateLiveRequest", () => {
  it("rejects missing credentials", () => {
    expect(authenticateLiveRequest({ headers: {}, credentials })).toEqual({
      ok: false,
      status: 401,
      code: "unauthorized"
    });
  });

  it("derives tenant from the matched credential without returning the raw credential", () => {
    const result = authenticateLiveRequest({
      headers: { "x-giwa-partner-token": rawCredential },
      credentials
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.tenantId).toBe("tenant_alpha");
      expect(result.context.scopes).toContain("runs:write");
      expect(JSON.stringify(result)).not.toContain(rawCredential);
    }
  });

  it("allows local bypass only when explicitly enabled", () => {
    const denied = authenticateLiveRequest({ headers: {}, credentials: [], localBypass: false });
    const allowed = authenticateLiveRequest({ headers: {}, credentials: [], localBypass: true });

    expect(denied.ok).toBe(false);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) {
      expect(allowed.context.mode).toBe("local-bypass");
      expect(allowed.context.tenantId).toBe("local");
    }
  });
});

import { describe, expect, it } from "vitest";

import { tenantFromAuthContext, rejectBodyTenantOverride } from "./liveTenantPolicy.ts";

describe("live tenant policy", () => {
  it("derives tenant only from auth context", () => {
    expect(
      tenantFromAuthContext({
        actorId: "cred_partner_alpha",
        tenantId: "tenant_alpha",
        scopes: ["runs:read"],
        mode: "credential"
      })
    ).toBe("tenant_alpha");
  });

  it("rejects tenant ids supplied in request bodies", () => {
    expect(rejectBodyTenantOverride({ tenantId: "tenant_beta" })).toEqual({
      ok: false,
      code: "tenant_body_not_allowed"
    });
    expect(rejectBodyTenantOverride({ campaignId: "gasok-demo" })).toEqual({ ok: true });
  });
});

import type { LiveAuthContext } from "./liveAuth.ts";

export type TenantBodyPolicyResult = { ok: true } | { ok: false; code: "tenant_body_not_allowed" };

export function tenantFromAuthContext(context: LiveAuthContext): string {
  return context.tenantId;
}

export function rejectBodyTenantOverride(body: Record<string, unknown>): TenantBodyPolicyResult {
  if ("tenantId" in body || "partnerId" in body) return { ok: false, code: "tenant_body_not_allowed" };
  return { ok: true };
}

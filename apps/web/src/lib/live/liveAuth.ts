import { createHash } from "node:crypto";

export type LiveAuthScope = "runs:read" | "runs:write" | "receipts:read" | "verify:write" | "partner:read";

export type LiveAuthContext = {
  actorId: string;
  tenantId: string;
  scopes: readonly LiveAuthScope[];
  mode: "local-bypass" | "credential";
};

export type LiveCredentialRecord = {
  id: string;
  tenantId: string;
  scopes: readonly LiveAuthScope[];
  tokenHash: string;
};

export type LiveAuthResult =
  | { ok: true; context: LiveAuthContext }
  | { ok: false; status: 401; code: "unauthorized" };

export type LiveAuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  credentials: readonly LiveCredentialRecord[];
  localBypass?: boolean;
};

export function hashLiveCredential(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function headerValue(headers: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const direct = headers[key];
  const lower = headers[key.toLowerCase()];
  const value = direct ?? lower;
  if (Array.isArray(value)) return value[0];
  return value;
}

function hashEquals(leftHex: string, rightHex: string): boolean {
  return leftHex.length === rightHex.length && leftHex === rightHex;
}

export function authenticateLiveRequest(input: LiveAuthRequest): LiveAuthResult {
  if (input.localBypass === true) {
    return {
      ok: true,
      context: {
        actorId: "local-bypass",
        tenantId: "local",
        scopes: ["runs:read", "runs:write", "receipts:read", "verify:write", "partner:read"],
        mode: "local-bypass"
      }
    };
  }

  const presented = headerValue(input.headers, "x-giwa-partner-token")?.trim();
  if (presented === undefined || presented.length === 0) return { ok: false, status: 401, code: "unauthorized" };

  const presentedHash = hashLiveCredential(presented);
  const matched = input.credentials.find((credential) => hashEquals(credential.tokenHash, presentedHash));
  if (matched === undefined) return { ok: false, status: 401, code: "unauthorized" };

  return {
    ok: true,
    context: {
      actorId: matched.id,
      tenantId: matched.tenantId,
      scopes: [...matched.scopes],
      mode: "credential"
    }
  };
}

export function hasLiveAuthScope(context: LiveAuthContext, scope: LiveAuthScope): boolean {
  return context.scopes.includes(scope);
}

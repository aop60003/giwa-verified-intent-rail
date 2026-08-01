export type LiveRequestSafetyInput = {
  method: string;
  pathname: string;
  origin: string | undefined;
  allowedOrigins: readonly string[];
  contentType: string | undefined;
};

export type LiveRequestSafetyResult =
  | { ok: true }
  | {
      ok: false;
      status: 403 | 405 | 415;
      code: "origin_not_allowed" | "method_not_allowed" | "unsupported_media_type";
    };

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH"]);

function isJsonContentType(value: string | undefined): boolean {
  if (value === undefined) return false;
  const mediaType = value.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

export function evaluateLiveRequestSafety(input: LiveRequestSafetyInput): LiveRequestSafetyResult {
  if (input.pathname.startsWith("/api/") && !ALLOWED_METHODS.has(input.method)) {
    return { ok: false, status: 405, code: "method_not_allowed" };
  }

  if (
    input.pathname.startsWith("/api/") &&
    (input.method === "POST" || input.method === "PATCH") &&
    input.allowedOrigins.length > 0 &&
    (input.origin === undefined || !input.allowedOrigins.includes(input.origin))
  ) {
    return { ok: false, status: 403, code: "origin_not_allowed" };
  }

  if (
    input.pathname.startsWith("/api/") &&
    (input.method === "POST" || input.method === "PATCH") &&
    !isJsonContentType(input.contentType)
  ) {
    return { ok: false, status: 415, code: "unsupported_media_type" };
  }

  return { ok: true };
}

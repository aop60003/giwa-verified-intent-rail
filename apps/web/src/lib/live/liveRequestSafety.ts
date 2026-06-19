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

const ALLOWED_METHODS = new Set(["GET", "POST"]);

export function evaluateLiveRequestSafety(input: LiveRequestSafetyInput): LiveRequestSafetyResult {
  if (input.pathname.startsWith("/api/") && !ALLOWED_METHODS.has(input.method)) {
    return { ok: false, status: 405, code: "method_not_allowed" };
  }

  if (input.allowedOrigins.length > 0 && input.origin !== undefined && !input.allowedOrigins.includes(input.origin)) {
    return { ok: false, status: 403, code: "origin_not_allowed" };
  }

  if (
    input.pathname.startsWith("/api/") &&
    input.method === "POST" &&
    input.contentType !== undefined &&
    !input.contentType.toLowerCase().startsWith("application/json")
  ) {
    return { ok: false, status: 415, code: "unsupported_media_type" };
  }

  return { ok: true };
}

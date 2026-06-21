import { describe, expect, it } from "vitest";

import { evaluateLiveRequestSafety } from "./liveRequestSafety.ts";

describe("evaluateLiveRequestSafety", () => {
  it("rejects unsupported API methods", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "PUT",
        pathname: "/api/runs",
        origin: "http://127.0.0.1:4177",
        allowedOrigins: ["http://127.0.0.1:4177"],
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 405, code: "method_not_allowed" });
  });

  it("rejects unknown origins in hosted modes", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/runs",
        origin: "https://unexpected.example",
        allowedOrigins: ["https://partner.example"],
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 403, code: "origin_not_allowed" });
  });

  it("rejects missing origins when a hosted allowlist is configured", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/runs",
        origin: undefined,
        allowedOrigins: ["https://partner.example"],
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 403, code: "origin_not_allowed" });
  });

  it("requires JSON content type for POST API requests with a body", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/runs",
        origin: "https://partner.example",
        allowedOrigins: ["https://partner.example"],
        contentType: "text/plain"
      })
    ).toEqual({ ok: false, status: 415, code: "unsupported_media_type" });
  });

  it("rejects missing content type for POST API requests", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/runs",
        origin: "https://partner.example",
        allowedOrigins: ["https://partner.example"],
        contentType: undefined
      })
    ).toEqual({ ok: false, status: 415, code: "unsupported_media_type" });
  });

  it("rejects JSON-like but invalid media types for POST API requests", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/runs",
        origin: "https://partner.example",
        allowedOrigins: ["https://partner.example"],
        contentType: "application/json-malformed"
      })
    ).toEqual({ ok: false, status: 415, code: "unsupported_media_type" });
  });
});

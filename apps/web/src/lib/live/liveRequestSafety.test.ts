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

  it("accepts same-origin API reads without an Origin header", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "GET",
        pathname: "/api/runs/run-1",
        origin: undefined,
        allowedOrigins: ["https://partner.example"],
        contentType: undefined
      })
    ).toEqual({ ok: true });
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

  it("applies the same origin and JSON gates to the public event collector", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/public/events",
        origin: "https://unexpected.example",
        allowedOrigins: ["https://partner.example"],
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 403, code: "origin_not_allowed" });
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/public/events",
        origin: "https://partner.example",
        allowedOrigins: ["https://partner.example"],
        contentType: "text/plain"
      })
    ).toEqual({ ok: false, status: 415, code: "unsupported_media_type" });
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/public/events",
        origin: "https://partner.example",
        allowedOrigins: ["https://partner.example"],
        contentType: "application/json"
      })
    ).toEqual({ ok: true });
  });

  it("applies the existing mutation origin and JSON gates to Studio PATCH requests", () => {
    const input = {
      method: "PATCH",
      pathname: "/api/studio/campaigns/gasok-demo",
      allowedOrigins: ["https://studio.example"]
    };
    expect(
      evaluateLiveRequestSafety({
        ...input,
        origin: "https://studio.example",
        contentType: "application/json; charset=utf-8"
      })
    ).toEqual({ ok: true });
    expect(
      evaluateLiveRequestSafety({
        ...input,
        origin: undefined,
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 403, code: "origin_not_allowed" });
    expect(
      evaluateLiveRequestSafety({
        ...input,
        origin: "https://unexpected.example",
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 403, code: "origin_not_allowed" });
    expect(
      evaluateLiveRequestSafety({
        ...input,
        origin: "https://studio.example",
        contentType: "text/plain"
      })
    ).toEqual({ ok: false, status: 415, code: "unsupported_media_type" });
    expect(
      evaluateLiveRequestSafety({
        ...input,
        method: "DELETE",
        origin: "https://studio.example",
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 405, code: "method_not_allowed" });
  });

  it("applies the same JSON, origin, and method rules to exact Studio publish routes", () => {
    const pathname = "/api/studio/campaigns/campaign_00000000-0000-4000-8000-000000000001/publish";
    expect(evaluateLiveRequestSafety({
      method: "POST", pathname, origin: "https://studio.example",
      allowedOrigins: ["https://studio.example"], contentType: "application/json"
    })).toEqual({ ok: true });
    expect(evaluateLiveRequestSafety({
      method: "POST", pathname, origin: "https://wrong.example",
      allowedOrigins: ["https://studio.example"], contentType: "application/json"
    })).toEqual({ ok: false, status: 403, code: "origin_not_allowed" });
    expect(evaluateLiveRequestSafety({
      method: "POST", pathname, origin: "https://studio.example",
      allowedOrigins: ["https://studio.example"], contentType: "text/plain"
    })).toEqual({ ok: false, status: 415, code: "unsupported_media_type" });
    expect(evaluateLiveRequestSafety({
      method: "DELETE", pathname, origin: "https://studio.example",
      allowedOrigins: ["https://studio.example"], contentType: "application/json"
    })).toEqual({ ok: false, status: 405, code: "method_not_allowed" });
  });
});

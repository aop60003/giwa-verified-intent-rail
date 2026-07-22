import { describe, expect, it } from "vitest";

import {
  LIVE_RATE_LIMIT_POLICY,
  classifyLiveRateLimitRoute,
  createMemoryLiveRateLimiter,
  liveRateLimitBucket
} from "./liveRateLimit.ts";

describe("createMemoryLiveRateLimiter", () => {
  it("limits repeated verify attempts per run", () => {
    const limiter = createMemoryLiveRateLimiter({ nowMs: () => 1000 });
    const input = { bucket: "verify:run_alpha", limit: 2, windowMs: 60_000 };

    expect(limiter.consume(input).allowed).toBe(true);
    expect(limiter.consume(input).allowed).toBe(true);
    expect(limiter.consume(input)).toEqual({
      allowed: false,
      code: "rate_limited",
      retryAfterMs: 60_000
    });
  });

  it("uses the bounded single-instance staging policy", () => {
    expect(LIVE_RATE_LIMIT_POLICY).toEqual({
      generalPerIpPerMinute: 120,
      createRunPerIpPerMinute: 12,
      verifyPerRunPerMinute: 10,
      partnerPerCredentialPerMinute: 60
    });
  });

  it("classifies only exact create and participant verify routes", () => {
    expect(classifyLiveRateLimitRoute("POST", "/api/runs")).toEqual({ kind: "create" });
    expect(classifyLiveRateLimitRoute("GET", "/api/runs")).toBeNull();
    expect(classifyLiveRateLimitRoute("POST", "/api/runs/run_alpha/verify")).toEqual({
      kind: "verify",
      runId: "run_alpha"
    });

    for (const pathname of [
      "/api/runs/run_alpha/verify/extra",
      "/api/runs/run_alpha/preverify",
      "/api/runs/run_alpha/verify-later",
      "/api/partner/verify",
      "/api/runs//verify"
    ]) {
      expect(classifyLiveRateLimitRoute("POST", pathname), pathname).toBeNull();
    }
    expect(classifyLiveRateLimitRoute("GET", "/api/runs/run_alpha/verify")).toBeNull();
  });

  it("hashes every bucket identity instead of exposing raw participant or partner values", () => {
    const rawValues = ["203.0.113.44", "partner-alpha", "0x1111111111111111111111111111111111111111"];
    const buckets = [
      liveRateLimitBucket({ kind: "ip", value: rawValues[0]!, tenantId: "tenant_alpha" }),
      liveRateLimitBucket({ kind: "credential", value: rawValues[1]!, tenantId: "tenant_alpha" }),
      liveRateLimitBucket({ kind: "wallet", value: rawValues[2]!, tenantId: "tenant_alpha" })
    ];

    for (const bucket of buckets) {
      expect(bucket).not.toContain("tenant_alpha");
      for (const rawValue of rawValues) expect(bucket).not.toContain(rawValue);
    }
  });
});

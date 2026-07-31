import { describe, expect, it } from "vitest";

import {
  LIVE_RATE_LIMIT_POLICY,
  classifyLiveRateLimitRoute,
  createMemoryLiveRateLimiter,
  liveRateLimitBucket,
  parseLivePartnerCredentialHashes,
  selectLiveClientIp
} from "./liveRateLimit.ts";

function testIsIp(value: string): number {
  if (/^(?:127(?:\.[0-9]{1,3}){3}|(?:[0-9]{1,3}\.){3}[0-9]{1,3})$/u.test(value)) return 4;
  if (value === "::1" || value === "2001:db8::10" || /^::ffff:(?:127\.)?[0-9.]+$/iu.test(value)) return 6;
  return 0;
}

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

  it("keeps public event abuse prevention keyed only by the selected client IP", () => {
    const route = classifyLiveRateLimitRoute("POST", "/api/public/events");
    expect(route).toBeNull();
    expect(LIVE_RATE_LIMIT_POLICY.generalPerIpPerMinute).toBeGreaterThan(0);

    const selectedIp = selectLiveClientIp({
      socketAddress: "127.0.0.1",
      realIpHeader: "203.0.113.22",
      isIp: testIsIp
    });
    const bucket = liveRateLimitBucket({ kind: "ip", value: selectedIp });
    expect(bucket).not.toContain(selectedIp);
    expect(bucket).not.toMatch(/session|wallet|campaign/iu);
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

  it("trusts one valid X-Real-IP only from a loopback reverse proxy", () => {
    expect(
      selectLiveClientIp({ socketAddress: "127.0.0.1", realIpHeader: "203.0.113.10", isIp: testIsIp })
    ).toBe("203.0.113.10");
    expect(
      selectLiveClientIp({ socketAddress: "::1", realIpHeader: "2001:db8::10", isIp: testIsIp })
    ).toBe("2001:db8::10");
    expect(
      selectLiveClientIp({
        socketAddress: "::ffff:127.0.0.1",
        realIpHeader: "203.0.113.11",
        isIp: testIsIp
      })
    ).toBe("203.0.113.11");
    expect(
      selectLiveClientIp({ socketAddress: "198.51.100.9", realIpHeader: "203.0.113.12", isIp: testIsIp })
    ).toBe("198.51.100.9");
  });

  it("rejects ambiguous or malformed proxy headers and hashes distinct selected client IPs", () => {
    const invalidHeaders = [
      ["203.0.113.10"],
      "203.0.113.10, 203.0.113.11",
      "",
      "not-an-ip"
    ];
    for (const realIpHeader of invalidHeaders) {
      expect(
        selectLiveClientIp({ socketAddress: "127.0.0.1", realIpHeader, isIp: testIsIp }),
        String(realIpHeader)
      ).toBe("127.0.0.1");
    }

    const firstIp = selectLiveClientIp({
      socketAddress: "127.0.0.1",
      realIpHeader: "203.0.113.10",
      isIp: testIsIp
    });
    const secondIp = selectLiveClientIp({
      socketAddress: "127.0.0.1",
      realIpHeader: "203.0.113.11",
      isIp: testIsIp
    });
    const firstBucket = liveRateLimitBucket({ kind: "ip", value: firstIp });
    const secondBucket = liveRateLimitBucket({ kind: "ip", value: secondIp });

    expect(firstBucket).not.toBe(secondBucket);
    expect(firstBucket).not.toContain(firstIp);
    expect(secondBucket).not.toContain(secondIp);
  });

  it("accepts only unique SHA-256 partner credential hashes and normalizes casing", () => {
    const upper = "A".repeat(64);
    const lower = "b".repeat(64);
    expect(parseLivePartnerCredentialHashes(`${upper},${lower}`)).toEqual([upper.toLowerCase(), lower]);

    for (const invalid of [
      undefined,
      "",
      "abcdef123456",
      "g".repeat(64),
      `${lower},`,
      `${lower}, ${lower.toUpperCase()}`
    ]) {
      expect(() => parseLivePartnerCredentialHashes(invalid), String(invalid)).toThrow(
        "Invalid partner credential hash configuration"
      );
    }
  });
});

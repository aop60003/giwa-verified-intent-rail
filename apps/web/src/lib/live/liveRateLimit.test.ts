import { describe, expect, it } from "vitest";

import { createMemoryLiveRateLimiter, liveRateLimitBucket } from "./liveRateLimit.ts";

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

  it("builds buckets without raw credential values", () => {
    const bucket = liveRateLimitBucket({
      kind: "credential",
      value: "raw-secret-value",
      tenantId: "tenant_alpha"
    });

    expect(bucket).toContain("tenant_alpha");
    expect(bucket).not.toContain("raw-secret-value");
  });
});

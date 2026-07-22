import { createHash } from "node:crypto";

export type RateLimitDecision =
  | { allowed: true; remaining: number; resetAtMs: number }
  | { allowed: false; code: "rate_limited"; retryAfterMs: number };

export type RateLimitConsumeInput = {
  bucket: string;
  limit: number;
  windowMs: number;
};

export type MemoryLiveRateLimiter = {
  consume(input: RateLimitConsumeInput): RateLimitDecision;
};

export type LiveRateLimitBucketInput = {
  kind: "ip" | "create" | "credential" | "tenant" | "wallet" | "verify";
  value: string;
  tenantId?: string;
};

export const LIVE_RATE_LIMIT_POLICY = {
  generalPerIpPerMinute: 120,
  createRunPerIpPerMinute: 12,
  verifyPerRunPerMinute: 10,
  partnerPerCredentialPerMinute: 60
} as const;

export type LiveRateLimitRoute = { kind: "create" } | { kind: "verify"; runId: string } | null;

function hashBucketValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}

export function liveRateLimitBucket(input: LiveRateLimitBucketInput): string {
  const tenantPart = input.tenantId === undefined ? "global" : hashBucketValue(input.tenantId);
  return `${input.kind}:${tenantPart}:${hashBucketValue(input.value)}`;
}

export function classifyLiveRateLimitRoute(method: string, pathname: string): LiveRateLimitRoute {
  if (method === "POST" && pathname === "/api/runs") return { kind: "create" };
  if (method !== "POST") return null;
  const matched = /^\/api\/runs\/([^/]+)\/verify$/u.exec(pathname);
  return matched?.[1] === undefined ? null : { kind: "verify", runId: matched[1] };
}

export function createMemoryLiveRateLimiter(options: { nowMs: () => number }): MemoryLiveRateLimiter {
  const buckets = new Map<string, { count: number; resetAtMs: number }>();

  return {
    consume(input) {
      const now = options.nowMs();
      const existing = buckets.get(input.bucket);
      const current =
        existing === undefined || existing.resetAtMs <= now
          ? { count: 0, resetAtMs: now + input.windowMs }
          : existing;
      if (current.count >= input.limit) {
        return { allowed: false, code: "rate_limited", retryAfterMs: Math.max(0, current.resetAtMs - now) };
      }

      const next = { ...current, count: current.count + 1 };
      buckets.set(input.bucket, next);
      return { allowed: true, remaining: input.limit - next.count, resetAtMs: next.resetAtMs };
    }
  };
}

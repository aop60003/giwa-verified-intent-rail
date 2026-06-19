import type { HostedRuntimeMode } from "./hostedMode.ts";

export type LiveReadinessInput = {
  mode: HostedRuntimeMode;
  envReady: boolean;
  authReady: boolean;
  tenantReady: boolean;
  repositoryReady: boolean;
  rateLimitReady: boolean;
  requestSafetyReady: boolean;
  telemetryReady: boolean;
  missingKeys: string[];
  invalidKeys: string[];
};

export function buildLiveHealthBody(): { ok: true } {
  return { ok: true };
}

function status(value: boolean): "ok" | "missing" {
  return value ? "ok" : "missing";
}

export function buildLiveReadinessBody(input: LiveReadinessInput): {
  ready: boolean;
  mode: HostedRuntimeMode;
  checks: Record<string, "ok" | "missing">;
  missingKeys: string[];
  invalidKeys: string[];
} {
  const ready =
    input.envReady &&
    input.authReady &&
    input.tenantReady &&
    input.repositoryReady &&
    input.rateLimitReady &&
    input.requestSafetyReady &&
    input.telemetryReady;
  return {
    ready,
    mode: input.mode,
    checks: {
      env: status(input.envReady),
      auth: status(input.authReady),
      tenant: status(input.tenantReady),
      repository: status(input.repositoryReady),
      rateLimit: status(input.rateLimitReady),
      requestSafety: status(input.requestSafetyReady),
      telemetry: status(input.telemetryReady)
    },
    missingKeys: [...input.missingKeys],
    invalidKeys: [...input.invalidKeys]
  };
}

import { describe, expect, it } from "vitest";

import { evaluateHostedModePolicy } from "./hostedMode.ts";

describe("evaluateHostedModePolicy", () => {
  it("rejects prod-testnet mock mode", () => {
    const result = evaluateHostedModePolicy({
      mode: "prod-testnet",
      mockMode: true,
      host: "127.0.0.1",
      authReady: true,
      tenantReady: true,
      rateLimitReady: true,
      requestSafetyReady: true,
      repositoryReady: true,
      telemetryReady: true
    });

    expect(result).toEqual({ ok: false, reason: "mock_mode_forbidden" });
  });

  it("rejects public host binding before hosted gates are ready", () => {
    const result = evaluateHostedModePolicy({
      mode: "staging-testnet",
      mockMode: false,
      host: "0.0.0.0",
      authReady: false,
      tenantReady: true,
      rateLimitReady: true,
      requestSafetyReady: true,
      repositoryReady: true,
      telemetryReady: true
    });

    expect(result).toEqual({ ok: false, reason: "hosted_gate_not_ready" });
  });

  it("rejects every hosted mode on loopback before hosted gates are ready", () => {
    for (const [mode, host] of [
      ["staging-testnet", "127.0.0.1"],
      ["staging-testnet", "::1"],
      ["prod-testnet", "localhost"]
    ] as const) {
      expect(
        evaluateHostedModePolicy({
          mode,
          mockMode: false,
          host,
          authReady: false,
          tenantReady: true,
          rateLimitReady: true,
          requestSafetyReady: true,
          repositoryReady: true,
          telemetryReady: true
        }),
        `${mode} on ${host}`
      ).toEqual({ ok: false, reason: "hosted_gate_not_ready" });
    }
  });

  it("keeps local mode bound to localhost", () => {
    const result = evaluateHostedModePolicy({
      mode: "local",
      mockMode: true,
      host: "0.0.0.0",
      authReady: true,
      tenantReady: true,
      rateLimitReady: true,
      requestSafetyReady: true,
      repositoryReady: true,
      telemetryReady: true
    });

    expect(result).toEqual({ ok: false, reason: "public_host_forbidden" });
  });
});

export type HostedRuntimeMode = "local" | "staging-testnet" | "prod-testnet";

export type HostedModeInput = {
  mode: HostedRuntimeMode;
  mockMode: boolean;
  host: string;
  authReady: boolean;
  tenantReady: boolean;
  rateLimitReady: boolean;
  requestSafetyReady: boolean;
  repositoryReady: boolean;
  telemetryReady: boolean;
};

export type HostedModeResult =
  | { ok: true; reason: null }
  | { ok: false; reason: "mock_mode_forbidden" | "hosted_gate_not_ready" | "public_host_forbidden" };

function isLocalHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

export function evaluateHostedModePolicy(input: HostedModeInput): HostedModeResult {
  if (input.mode === "prod-testnet" && input.mockMode) return { ok: false, reason: "mock_mode_forbidden" };

  const publicHost = !isLocalHost(input.host);
  if (input.mode === "local" && publicHost) return { ok: false, reason: "public_host_forbidden" };

  const gatesReady =
    input.authReady &&
    input.tenantReady &&
    input.rateLimitReady &&
    input.requestSafetyReady &&
    input.repositoryReady &&
    input.telemetryReady;
  if (publicHost && !gatesReady) return { ok: false, reason: "hosted_gate_not_ready" };

  return { ok: true, reason: null };
}

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
  storageReady: boolean;
  chainReady: boolean;
  signerReady: boolean;
  originReady: boolean;
  verifierReady: boolean;
  schemaReady: boolean;
  missingKeys: string[];
  invalidKeys: string[];
};

export function buildLiveHealthBody(): { ok: true } {
  return { ok: true };
}

function status(value: boolean): "ok" | "missing" {
  return value ? "ok" : "missing";
}

function redactedConfigKey(key: string): string {
  if (key === "GIWA_SEPOLIA_RPC_URL") return "giwa-rpc-endpoint";
  if (key === "GIWA_EXPLORER_TX_URL_TEMPLATE" || key === "GIWA_EXPLORER_ADDRESS_URL_TEMPLATE") {
    return "giwa-explorer-template";
  }
  if (key.endsWith("_PRIVATE_KEY")) return "server-role-signer";
  if (key === "GIWA_LIVE_DB_PATH") return "live-storage-path";
  if (key === "GIWA_LIVE_MODE") return "live-mode";
  if (key === "GIWA_LIVE_ALLOWED_ORIGINS") return "hosted-origin-policy";
  if (key === "GIWA_LIVE_PUBLIC_ORIGIN") return "hosted-public-origin";
  if (key === "GIWA_LIVE_MIN_GAS_WEI") return "minimum-gas-policy";
  if (key === "GIWA_LIVE_FAUCET_HELP_URL") return "faucet-help-policy";
  if (key === "GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS") return "run-retention-policy";
  if (key === "GIWA_LIVE_PARTNER_CREDENTIAL_HASHES") return "hosted-auth-hash";
  return "live-config";
}

function redactedConfigKeys(keys: string[]): string[] {
  return [...new Set(keys.map(redactedConfigKey))];
}

export function buildLiveReadinessBody(input: LiveReadinessInput): {
  ready: boolean;
  mode: HostedRuntimeMode;
  checks: Record<string, "ok" | "missing">;
  missingKeys: string[];
  invalidKeys: string[];
  missingKeyCount: number;
  invalidKeyCount: number;
} {
  const ready =
    input.envReady &&
    input.authReady &&
    input.tenantReady &&
    input.repositoryReady &&
    input.rateLimitReady &&
    input.requestSafetyReady &&
    input.telemetryReady &&
    input.storageReady &&
    input.chainReady &&
    input.signerReady &&
    input.originReady &&
    input.verifierReady &&
    input.schemaReady;
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
      telemetry: status(input.telemetryReady),
      storage: status(input.storageReady),
      chain: status(input.chainReady),
      signer: status(input.signerReady),
      origin: status(input.originReady),
      verifier: status(input.verifierReady),
      schema: status(input.schemaReady)
    },
    missingKeys: redactedConfigKeys(input.missingKeys),
    invalidKeys: redactedConfigKeys(input.invalidKeys),
    missingKeyCount: input.missingKeys.length,
    invalidKeyCount: input.invalidKeys.length
  };
}

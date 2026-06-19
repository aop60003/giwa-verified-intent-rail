export type EnvMap = Record<string, string | undefined>;

export type RedactedEnvKey = {
  state: "set" | "missing" | "invalid";
  format: "url" | "template" | "hex32" | "path" | "mode" | "csv" | "hash-list" | "unknown";
  length: number;
};

export type RedactedLiveEnvReadiness = {
  ok: boolean;
  missing: string[];
  invalid: string[];
  keys: Record<string, RedactedEnvKey>;
};

export type LiveServerEnv = {
  standardRpcUrl: string;
  txExplorerTemplate: string;
  addressExplorerTemplate: string;
  campaignSignerPrivateKey: `0x${string}`;
  intentSubmitterPrivateKey: `0x${string}`;
  verifierPrivateKey: `0x${string}`;
  dbPath: string;
};

const REQUIRED = [
  "GIWA_SEPOLIA_RPC_URL",
  "GIWA_EXPLORER_TX_URL_TEMPLATE",
  "GIWA_EXPLORER_ADDRESS_URL_TEMPLATE",
  "CAMPAIGN_SIGNER_PRIVATE_KEY",
  "INTENT_SUBMITTER_PRIVATE_KEY",
  "VERIFIER_PRIVATE_KEY",
  "GIWA_LIVE_DB_PATH"
] as const;

const HOSTED_KEYS = ["GIWA_LIVE_MODE", "GIWA_LIVE_ALLOWED_ORIGINS", "GIWA_LIVE_PARTNER_CREDENTIAL_HASHES"] as const;

function isHex32(value: string): boolean {
  const hex = value.startsWith("0x") ? value.slice(2) : "";
  return hex.length === 64 && [...hex].every((char) => /[a-fA-F0-9]/u.test(char));
}

function classify(key: string, value: string | undefined): RedactedEnvKey {
  if (value === undefined || value.trim().length === 0) {
    return { state: "missing", format: "unknown", length: 0 };
  }

  const trimmed = value.trim();
  if (key.endsWith("_PRIVATE_KEY")) {
    return {
      state: isHex32(trimmed) ? "set" : "invalid",
      format: "hex32",
      length: trimmed.length
    };
  }

  if (key.endsWith("_TEMPLATE")) {
    return {
      state: trimmed.includes("{") && trimmed.includes("}") ? "set" : "invalid",
      format: "template",
      length: trimmed.length
    };
  }

  if (key.endsWith("_URL")) {
    return {
      state: /^https?:\/\//u.test(trimmed) ? "set" : "invalid",
      format: "url",
      length: trimmed.length
    };
  }

  return {
    state: "set",
    format: "path",
    length: trimmed.length
  };
}

export function buildRedactedLiveEnvReadiness(env: EnvMap): RedactedLiveEnvReadiness {
  const keys: Record<string, RedactedEnvKey> = {};
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of REQUIRED) {
    const status = classify(key, env[key]);
    keys[key] = status;
    if (status.state === "missing") missing.push(key);
    if (status.state === "invalid") invalid.push(key);
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    keys
  };
}

function classifyHosted(key: string, value: string | undefined): RedactedEnvKey {
  if (value === undefined || value.trim().length === 0) {
    return { state: "missing", format: "unknown", length: 0 };
  }
  const trimmed = value.trim();
  if (key === "GIWA_LIVE_MODE") {
    const valid = trimmed === "local" || trimmed === "staging-testnet" || trimmed === "prod-testnet";
    return { state: valid ? "set" : "invalid", format: "mode", length: trimmed.length };
  }
  if (key === "GIWA_LIVE_ALLOWED_ORIGINS") {
    return { state: trimmed.includes("://") ? "set" : "invalid", format: "csv", length: trimmed.length };
  }
  if (key === "GIWA_LIVE_PARTNER_CREDENTIAL_HASHES") {
    return { state: trimmed.length >= 12 ? "set" : "invalid", format: "hash-list", length: trimmed.length };
  }
  return { state: "set", format: "unknown", length: trimmed.length };
}

export function buildRedactedHostedEnvReadiness(env: EnvMap): RedactedLiveEnvReadiness {
  const mode = env.GIWA_LIVE_MODE?.trim() ?? "local";
  const required = mode === "local" ? (["GIWA_LIVE_MODE"] as const) : HOSTED_KEYS;
  const keys: Record<string, RedactedEnvKey> = {};
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of required) {
    const status = classifyHosted(key, key === "GIWA_LIVE_MODE" ? mode : env[key]);
    keys[key] = status;
    if (status.state === "missing") missing.push(key);
    if (status.state === "invalid") invalid.push(key);
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    keys
  };
}

export function requireLiveServerEnv(env: EnvMap): LiveServerEnv {
  const readiness = buildRedactedLiveEnvReadiness(env);
  if (!readiness.ok) {
    throw new Error(
      `Missing live server env: ${readiness.missing.join(", ")}; invalid live server env: ${readiness.invalid.join(", ")}`
    );
  }

  return {
    standardRpcUrl: env.GIWA_SEPOLIA_RPC_URL!.trim(),
    txExplorerTemplate: env.GIWA_EXPLORER_TX_URL_TEMPLATE!.trim(),
    addressExplorerTemplate: env.GIWA_EXPLORER_ADDRESS_URL_TEMPLATE!.trim(),
    campaignSignerPrivateKey: env.CAMPAIGN_SIGNER_PRIVATE_KEY!.trim() as `0x${string}`,
    intentSubmitterPrivateKey: env.INTENT_SUBMITTER_PRIVATE_KEY!.trim() as `0x${string}`,
    verifierPrivateKey: env.VERIFIER_PRIVATE_KEY!.trim() as `0x${string}`,
    dbPath: env.GIWA_LIVE_DB_PATH!.trim()
  };
}

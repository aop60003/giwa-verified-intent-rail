export type EnvMap = Record<string, string | undefined>;

export type RedactedEnvKey = {
  state: "set" | "missing" | "invalid";
  format:
    | "url"
    | "template"
    | "hex32"
    | "path"
    | "mode"
    | "csv"
    | "hash-list"
    | "origin"
    | "decimal"
    | "integer"
    | "unknown";
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
  dbPath: string;
  publicOrigin: string | undefined;
  minGasBalanceWei: string | undefined;
  faucetHelpUrl: string | undefined;
  incompleteRunRetentionHours: number | undefined;
};

const REQUIRED = [
  "GIWA_SEPOLIA_RPC_URL",
  "GIWA_EXPLORER_TX_URL_TEMPLATE",
  "GIWA_EXPLORER_ADDRESS_URL_TEMPLATE",
  "CAMPAIGN_SIGNER_PRIVATE_KEY",
  "GIWA_LIVE_DB_PATH"
] as const;

const HOSTED_KEYS = [
  "GIWA_LIVE_MODE",
  "GIWA_LIVE_ALLOWED_ORIGINS",
  "GIWA_LIVE_PARTNER_CREDENTIAL_HASHES",
  "GIWA_LIVE_PUBLIC_ORIGIN",
  "GIWA_LIVE_MIN_GAS_WEI",
  "GIWA_LIVE_FAUCET_HELP_URL",
  "GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS"
] as const;

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
    const origins = trimmed.split(",").map((entry) => entry.trim());
    const valid = origins.length > 0 && origins.every((origin) => isHttpOrigin(origin));
    return { state: valid ? "set" : "invalid", format: "csv", length: trimmed.length };
  }
  if (key === "GIWA_LIVE_PARTNER_CREDENTIAL_HASHES") {
    return { state: trimmed.length >= 12 ? "set" : "invalid", format: "hash-list", length: trimmed.length };
  }
  if (key === "GIWA_LIVE_PUBLIC_ORIGIN") {
    return { state: isHttpsOrigin(trimmed) ? "set" : "invalid", format: "origin", length: trimmed.length };
  }
  if (key === "GIWA_LIVE_MIN_GAS_WEI") {
    return { state: isNonnegativeDecimal(trimmed) ? "set" : "invalid", format: "decimal", length: trimmed.length };
  }
  if (key === "GIWA_LIVE_FAUCET_HELP_URL") {
    return { state: isHttpsUrl(trimmed) ? "set" : "invalid", format: "url", length: trimmed.length };
  }
  if (key === "GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS") {
    return { state: isPositiveInteger(trimmed) ? "set" : "invalid", format: "integer", length: trimmed.length };
  }
  return { state: "set", format: "unknown", length: trimmed.length };
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch (_error) {
    return undefined;
  }
}

function isHttpOrigin(value: string): boolean {
  const parsed = parseUrl(value);
  if (parsed === undefined || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) return false;
  return parsed.origin === value && parsed.username.length === 0 && parsed.password.length === 0;
}

function isHttpsOrigin(value: string): boolean {
  const parsed = parseUrl(value);
  return parsed !== undefined && parsed.protocol === "https:" && parsed.origin === value && isHttpOrigin(value);
}

function isHttpsUrl(value: string): boolean {
  const parsed = parseUrl(value);
  return parsed !== undefined && parsed.protocol === "https:" && parsed.username.length === 0 && parsed.password.length === 0;
}

function isNonnegativeDecimal(value: string): boolean {
  return /^(?:0|[1-9][0-9]*)$/u.test(value);
}

function isPositiveInteger(value: string): boolean {
  if (!/^[1-9][0-9]*$/u.test(value)) return false;
  return Number.isSafeInteger(Number(value));
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

  if (mode !== "local" && keys.GIWA_LIVE_PUBLIC_ORIGIN?.state === "set") {
    const publicOrigin = env.GIWA_LIVE_PUBLIC_ORIGIN!.trim();
    const occurrences = (env.GIWA_LIVE_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry === publicOrigin).length;
    if (occurrences !== 1) {
      const current = keys.GIWA_LIVE_ALLOWED_ORIGINS;
      keys.GIWA_LIVE_ALLOWED_ORIGINS = {
        state: "invalid",
        format: current?.format ?? "csv",
        length: current?.length ?? 0
      };
      if (!invalid.includes("GIWA_LIVE_ALLOWED_ORIGINS")) invalid.push("GIWA_LIVE_ALLOWED_ORIGINS");
    }
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

  const mode = env.GIWA_LIVE_MODE?.trim() ?? "local";
  if (mode !== "local") {
    const hostedReadiness = buildRedactedHostedEnvReadiness(env);
    if (!hostedReadiness.ok) {
      throw new Error(
        `Missing hosted live env: ${hostedReadiness.missing.join(", ")}; invalid hosted live env: ${hostedReadiness.invalid.join(", ")}`
      );
    }
  }

  const retentionHours = env.GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS?.trim();

  return {
    standardRpcUrl: env.GIWA_SEPOLIA_RPC_URL!.trim(),
    txExplorerTemplate: env.GIWA_EXPLORER_TX_URL_TEMPLATE!.trim(),
    addressExplorerTemplate: env.GIWA_EXPLORER_ADDRESS_URL_TEMPLATE!.trim(),
    campaignSignerPrivateKey: env.CAMPAIGN_SIGNER_PRIVATE_KEY!.trim() as `0x${string}`,
    dbPath: env.GIWA_LIVE_DB_PATH!.trim(),
    publicOrigin: env.GIWA_LIVE_PUBLIC_ORIGIN?.trim(),
    minGasBalanceWei: env.GIWA_LIVE_MIN_GAS_WEI?.trim(),
    faucetHelpUrl: env.GIWA_LIVE_FAUCET_HELP_URL?.trim(),
    incompleteRunRetentionHours: retentionHours === undefined ? undefined : Number(retentionHours)
  };
}

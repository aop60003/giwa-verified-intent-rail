import { getAddress, isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const EXPECTED_GIWA_SEPOLIA_CHAIN_ID = 91_342;

export const REQUIRED_ENV_NAMES = [
  "GIWA_SEPOLIA_RPC_URL",
  "GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL",
  "GIWA_EXPLORER_TX_URL_TEMPLATE",
  "GIWA_EXPLORER_ADDRESS_URL_TEMPLATE",
  "DEPLOYER_PRIVATE_KEY",
  "CAMPAIGN_SIGNER_PRIVATE_KEY",
  "INTENT_SUBMITTER_PRIVATE_KEY"
] as const;

export const PRIVATE_KEY_ENV_NAMES = [
  "DEPLOYER_PRIVATE_KEY",
  "CAMPAIGN_SIGNER_PRIVATE_KEY",
  "VERIFIER_PRIVATE_KEY",
  "INTENT_SUBMITTER_PRIVATE_KEY"
] as const;

export const ADDRESS_ENV_NAMES = ["VERIFIER_ADDRESS", "DEMO_WALLET_ADDRESS", "DEMO_USER_ADDRESS"] as const;

export type EnvMap = Record<string, string | undefined>;

export type RedactedEndpoint = {
  status: "valid-url" | "invalid-url";
  length: number;
  protocol?: string;
  host?: string;
  path: "/" | "<redacted-path>" | "invalid-url";
  hasQuery: boolean;
};

export type RedactedEnvEntry = {
  key: string;
  status: "set" | "missing";
  length: number;
  publicAddress?: Address | "invalid-address-format" | "invalid-private-key-format";
  redactedEndpoint?: RedactedEndpoint;
};

export type EnvReadiness = {
  entries: RedactedEnvEntry[];
  missing: string[];
};

export function parseEnvFileContent(content: string): EnvMap {
  const parsed: EnvMap = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const assignment = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const separatorIndex = assignment.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = assignment.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
      continue;
    }

    const rawValue = assignment.slice(separatorIndex + 1).trim();
    const quoted =
      (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));
    parsed[key] = quoted ? rawValue.slice(1, -1) : rawValue;
  }

  return parsed;
}

export function mergeEnvMaps(processEnv: EnvMap, fileEnv: EnvMap): EnvMap {
  const merged: EnvMap = { ...fileEnv };

  for (const [key, value] of Object.entries(processEnv)) {
    if (value !== undefined && value.trim().length > 0) {
      merged[key] = value;
    }
  }

  return merged;
}

export function normalizePrivateKey(value: string | undefined): Hex | undefined {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined;
  }

  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed as Hex;
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return `0x${trimmed}` as Hex;
  }

  return undefined;
}

export function publicAddressFromPrivateKey(
  value: string | undefined
): Address | "invalid-private-key-format" | undefined {
  const normalized = normalizePrivateKey(value);
  if (normalized === undefined) {
    return value === undefined || value.trim().length === 0 ? undefined : "invalid-private-key-format";
  }

  return privateKeyToAccount(normalized).address;
}

export function publicAddressFromAddressEnv(value: string | undefined): Address | "invalid-address-format" | undefined {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined;
  }

  return isAddress(trimmed) ? getAddress(trimmed) : "invalid-address-format";
}

export function redactEndpointForReport(value: string | undefined): RedactedEndpoint | undefined {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);
    return {
      status: "valid-url",
      length: trimmed.length,
      protocol: parsed.protocol,
      host: parsed.host,
      path: parsed.pathname === "/" ? "/" : "<redacted-path>",
      hasQuery: parsed.search.length > 0
    };
  } catch {
    return {
      status: "invalid-url",
      length: trimmed.length,
      path: "invalid-url",
      hasQuery: false
    };
  }
}

export function buildExplorerSmokeUrl(template: string | undefined, kind: "tx" | "address"): string | undefined {
  const trimmed = template?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined;
  }

  const sample =
    kind === "tx" ? `0x${"1".repeat(64)}` : `0x${"2".repeat(40)}`;
  const replacements =
    kind === "tx"
      ? ["{txHash}", "{hash}", ":txHash", ":hash", "<txHash>", "<hash>"]
      : ["{address}", ":address", "<address>"];

  let replaced = trimmed;
  for (const marker of replacements) {
    replaced = replaced.split(marker).join(sample);
  }

  if (replaced === trimmed) {
    return undefined;
  }

  try {
    return new URL(replaced).toString();
  } catch {
    return undefined;
  }
}

export function collectEnvReadiness(env: EnvMap): EnvReadiness {
  function hasEnvValue(name: string): boolean {
    const value = env[name]?.trim();
    return value !== undefined && value.length > 0;
  }

  const keys = [
    ...REQUIRED_ENV_NAMES,
    "VERIFIER_PRIVATE_KEY",
    "VERIFIER_ADDRESS",
    "DEMO_WALLET_ADDRESS",
    "DEMO_USER_ADDRESS"
  ];
  const missing: string[] = [];
  const entries = keys.map((key): RedactedEnvEntry => {
    const value = env[key];
    const trimmed = value?.trim();
    const entry: RedactedEnvEntry = {
      key,
      status: trimmed === undefined || trimmed.length === 0 ? "missing" : "set",
      length: value?.length ?? 0
    };

    if (entry.status === "set") {
      if ((PRIVATE_KEY_ENV_NAMES as readonly string[]).includes(key)) {
        const publicAddress = publicAddressFromPrivateKey(value);
        if (publicAddress !== undefined) {
          entry.publicAddress = publicAddress;
        }
      }

      if ((ADDRESS_ENV_NAMES as readonly string[]).includes(key)) {
        const publicAddress = publicAddressFromAddressEnv(value);
        if (publicAddress !== undefined) {
          entry.publicAddress = publicAddress;
        }
      }

      if (key.includes("RPC_URL") || key.includes("EXPLORER_")) {
        const redactedEndpoint = redactEndpointForReport(value);
        if (redactedEndpoint !== undefined) {
          entry.redactedEndpoint = redactedEndpoint;
        }
      }
    }

    return entry;
  });

  for (const requiredName of REQUIRED_ENV_NAMES) {
    if (!hasEnvValue(requiredName)) {
      missing.push(requiredName);
    }
  }

  if (!hasEnvValue("VERIFIER_PRIVATE_KEY") && !hasEnvValue("VERIFIER_ADDRESS")) {
    missing.push("VERIFIER_PRIVATE_KEY or VERIFIER_ADDRESS");
  }

  if (!hasEnvValue("DEMO_WALLET_ADDRESS") && !hasEnvValue("DEMO_USER_ADDRESS")) {
    missing.push("DEMO_WALLET_ADDRESS or DEMO_USER_ADDRESS");
  }

  return {
    entries,
    missing
  };
}

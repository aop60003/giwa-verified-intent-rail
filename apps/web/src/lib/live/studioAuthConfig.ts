import type { EnvMap } from "./liveEnv.ts";
import type { HostedRuntimeMode } from "./hostedMode.ts";
import { normalizeStudioWallet } from "./studioAuthMessage.ts";
import type { StudioAuthRepository } from "./studioAuthRepository.ts";

const TENANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;
const ORGANIZATION_NAME_MAX_LENGTH = 80;
const DEFAULT_ORGANIZATION_NAME = "Loop";

type StudioAuthConfigKey =
  | "GIWA_LIVE_PARTNER_TENANT_ID"
  | "GIWA_LIVE_STUDIO_ORGANIZATION_NAME"
  | "GIWA_LIVE_STUDIO_OWNER_WALLETS"
  | "GIWA_LIVE_PUBLIC_ORIGIN"
  | "LOCAL_STUDIO_ORIGIN";

export type StudioAuthConfigKeyStatus = {
  state: "set" | "missing" | "invalid";
  length: number;
};

export type StudioAuthReadiness = {
  ownerCount: number;
  keys: Partial<Record<StudioAuthConfigKey, StudioAuthConfigKeyStatus>>;
};

export type StudioAuthConfig = {
  organizationId: string;
  organizationName: string;
  ownerWallets: readonly `0x${string}`[];
  origin: string;
  studioUri: string;
  secureCookie: boolean;
};

type StudioAuthConfigBase = {
  missing: StudioAuthConfigKey[];
  invalid: StudioAuthConfigKey[];
  ownerCount: number;
  readiness: StudioAuthReadiness;
};

export type StudioAuthConfigReadiness =
  | (StudioAuthConfigBase & { ok: false; enabled: false })
  | (StudioAuthConfigBase & { ok: true; enabled: false })
  | (StudioAuthConfigBase & { ok: true; enabled: true; config: StudioAuthConfig });

export type EvaluateStudioAuthConfigInput = {
  env: EnvMap;
  mode: HostedRuntimeMode;
  localOrigin: string | null;
};

export type ApplyStudioAuthBootstrapInput = {
  repository: StudioAuthRepository;
  config: StudioAuthConfig;
  existingTenantIds: readonly string[];
  nowIso: string;
};

type ParsedOwnerWallets =
  | { state: "missing"; ownerWallets: readonly `0x${string}`[] }
  | { state: "invalid"; ownerWallets: readonly `0x${string}`[] }
  | { state: "set"; ownerWallets: readonly `0x${string}`[] };

function keyStatus(state: StudioAuthConfigKeyStatus["state"], value: string | null | undefined): StudioAuthConfigKeyStatus {
  return { state, length: value?.trim().length ?? 0 };
}

function readTrimmed(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseExactHttpOrigin(value: string): URL | undefined {
  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.origin !== value ||
      parsed.username.length > 0 ||
      parsed.password.length > 0
    ) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  const parts = hostname.split(".");
  return parts.length === 4 && parts[0] === "127" && parts.every((part) => {
    const number = Number(part);
    return Number.isInteger(number) && number >= 0 && number <= 255 && String(number) === part;
  });
}

function parseOwnerWallets(value: string | undefined): ParsedOwnerWallets {
  const trimmed = readTrimmed(value);
  if (trimmed === undefined) return { state: "missing", ownerWallets: [] };
  const ownerWallets: `0x${string}`[] = [];
  const seen = new Set<`0x${string}`>();
  for (const entry of value!.split(",")) {
    const wallet = entry.trim();
    if (wallet.length === 0) return { state: "invalid", ownerWallets: [] };
    try {
      const normalized = normalizeStudioWallet(wallet);
      if (seen.has(normalized)) return { state: "invalid", ownerWallets: [] };
      seen.add(normalized);
      ownerWallets.push(normalized);
    } catch {
      return { state: "invalid", ownerWallets: [] };
    }
  }
  return { state: "set", ownerWallets };
}

function classifyOrganizationName(value: string | undefined): { state: "set" | "invalid"; value: string } {
  if (value === undefined) return { state: "set", value: DEFAULT_ORGANIZATION_NAME };
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > ORGANIZATION_NAME_MAX_LENGTH) {
    return { state: "invalid", value: DEFAULT_ORGANIZATION_NAME };
  }
  return { state: "set", value: trimmed };
}

function collectIssues(keys: Partial<Record<StudioAuthConfigKey, StudioAuthConfigKeyStatus>>) {
  const missing: StudioAuthConfigKey[] = [];
  const invalid: StudioAuthConfigKey[] = [];
  for (const [key, status] of Object.entries(keys) as Array<[StudioAuthConfigKey, StudioAuthConfigKeyStatus]>) {
    if (status.state === "missing") missing.push(key);
    if (status.state === "invalid") invalid.push(key);
  }
  return { missing, invalid };
}

function readiness(
  keys: Partial<Record<StudioAuthConfigKey, StudioAuthConfigKeyStatus>>,
  ownerCount: number
): StudioAuthReadiness {
  return { keys, ownerCount };
}

function hostedReadiness(input: EvaluateStudioAuthConfigInput): StudioAuthConfigReadiness {
  const tenantId = readTrimmed(input.env.GIWA_LIVE_PARTNER_TENANT_ID);
  const organizationName = classifyOrganizationName(input.env.GIWA_LIVE_STUDIO_ORGANIZATION_NAME);
  const owners = parseOwnerWallets(input.env.GIWA_LIVE_STUDIO_OWNER_WALLETS);
  const origin = readTrimmed(input.env.GIWA_LIVE_PUBLIC_ORIGIN);
  const parsedOrigin = origin === undefined ? undefined : parseExactHttpOrigin(origin);
  const keys: Partial<Record<StudioAuthConfigKey, StudioAuthConfigKeyStatus>> = {
    GIWA_LIVE_PARTNER_TENANT_ID: keyStatus(
      tenantId === undefined ? "missing" : TENANT_ID_PATTERN.test(tenantId) ? "set" : "invalid",
      input.env.GIWA_LIVE_PARTNER_TENANT_ID
    ),
    GIWA_LIVE_STUDIO_ORGANIZATION_NAME: keyStatus(organizationName.state, input.env.GIWA_LIVE_STUDIO_ORGANIZATION_NAME ?? DEFAULT_ORGANIZATION_NAME),
    GIWA_LIVE_STUDIO_OWNER_WALLETS: keyStatus(owners.state, input.env.GIWA_LIVE_STUDIO_OWNER_WALLETS),
    GIWA_LIVE_PUBLIC_ORIGIN: keyStatus(
      origin === undefined ? "missing" : parsedOrigin?.protocol === "https:" ? "set" : "invalid",
      input.env.GIWA_LIVE_PUBLIC_ORIGIN
    )
  };
  const { missing, invalid } = collectIssues(keys);
  const studioReadiness = readiness(keys, owners.state === "set" ? owners.ownerWallets.length : 0);
  if (missing.length > 0 || invalid.length > 0) {
    return { ok: false, enabled: false, missing, invalid, ownerCount: studioReadiness.ownerCount, readiness: studioReadiness };
  }

  return {
    ok: true,
    enabled: true,
    missing,
    invalid,
    ownerCount: studioReadiness.ownerCount,
    readiness: studioReadiness,
    config: {
      organizationId: tenantId!,
      organizationName: organizationName.value,
      ownerWallets: owners.ownerWallets,
      origin: origin!,
      studioUri: `${origin!}/studio`,
      secureCookie: true
    }
  };
}

function localReadiness(input: EvaluateStudioAuthConfigInput): StudioAuthConfigReadiness {
  const parsedOrigin = input.localOrigin === null ? undefined : parseExactHttpOrigin(input.localOrigin);
  const validLocalOrigin = parsedOrigin !== undefined && isLoopbackHostname(parsedOrigin.hostname);
  const tenantId = readTrimmed(input.env.GIWA_LIVE_PARTNER_TENANT_ID);
  const organizationName = classifyOrganizationName(input.env.GIWA_LIVE_STUDIO_ORGANIZATION_NAME);
  const owners = parseOwnerWallets(input.env.GIWA_LIVE_STUDIO_OWNER_WALLETS);
  const keys: Partial<Record<StudioAuthConfigKey, StudioAuthConfigKeyStatus>> = {
    GIWA_LIVE_PARTNER_TENANT_ID: keyStatus(
      tenantId === undefined ? "missing" : TENANT_ID_PATTERN.test(tenantId) ? "set" : "invalid",
      input.env.GIWA_LIVE_PARTNER_TENANT_ID
    ),
    GIWA_LIVE_STUDIO_ORGANIZATION_NAME: keyStatus(organizationName.state, input.env.GIWA_LIVE_STUDIO_ORGANIZATION_NAME ?? DEFAULT_ORGANIZATION_NAME),
    GIWA_LIVE_STUDIO_OWNER_WALLETS: keyStatus(owners.state, input.env.GIWA_LIVE_STUDIO_OWNER_WALLETS),
    LOCAL_STUDIO_ORIGIN: keyStatus(validLocalOrigin ? "set" : "invalid", input.localOrigin)
  };
  const studioReadiness = readiness(keys, owners.state === "set" ? owners.ownerWallets.length : 0);
  if (!validLocalOrigin || organizationName.state === "invalid" || owners.state === "invalid" || (tenantId !== undefined && !TENANT_ID_PATTERN.test(tenantId))) {
    const { missing, invalid } = collectIssues(keys);
    return { ok: false, enabled: false, missing, invalid, ownerCount: studioReadiness.ownerCount, readiness: studioReadiness };
  }

  const configured = tenantId !== undefined || owners.state === "set";
  if (!configured) {
    return { ok: true, enabled: false, missing: [], invalid: [], ownerCount: 0, readiness: studioReadiness };
  }
  const { missing, invalid } = collectIssues(keys);
  const activationMissing = missing.filter((key) => key === "GIWA_LIVE_PARTNER_TENANT_ID" || key === "GIWA_LIVE_STUDIO_OWNER_WALLETS");
  if (activationMissing.length > 0) {
    return { ok: false, enabled: false, missing: activationMissing, invalid, ownerCount: studioReadiness.ownerCount, readiness: studioReadiness };
  }

  return {
    ok: true,
    enabled: true,
    missing: [],
    invalid: [],
    ownerCount: studioReadiness.ownerCount,
    readiness: studioReadiness,
    config: {
      organizationId: tenantId!,
      organizationName: organizationName.value,
      ownerWallets: owners.ownerWallets,
      origin: input.localOrigin!,
      studioUri: `${input.localOrigin!}/studio`,
      secureCookie: parsedOrigin!.protocol === "https:"
    }
  };
}

export function evaluateStudioAuthConfig(input: EvaluateStudioAuthConfigInput): StudioAuthConfigReadiness {
  return input.mode === "local" ? localReadiness(input) : hostedReadiness(input);
}

function validateBootstrapConfig(config: StudioAuthConfig): readonly `0x${string}`[] {
  if (!TENANT_ID_PATTERN.test(config.organizationId)) throw new Error("invalid_studio_organization_id");
  const organizationName = config.organizationName.trim();
  if (organizationName.length === 0 || organizationName.length > ORGANIZATION_NAME_MAX_LENGTH) {
    throw new Error("invalid_studio_organization_name");
  }
  if (config.ownerWallets.length === 0) throw new Error("studio_bootstrap_owner_required");
  const owners = new Set<`0x${string}`>();
  for (const owner of config.ownerWallets) owners.add(normalizeStudioWallet(owner));
  if (owners.size === 0) throw new Error("studio_bootstrap_owner_required");
  return [...owners];
}

export function applyStudioAuthBootstrap(input: ApplyStudioAuthBootstrapInput): { activeOwnerCount: number } {
  const ownerWallets = validateBootstrapConfig(input.config);
  const organizationIds = new Set([...input.existingTenantIds, input.config.organizationId]);
  const organizations = [...organizationIds].map((organizationId) =>
    ({
      id: organizationId,
      displayName: organizationId === input.config.organizationId
        ? input.config.organizationName
        : `Tenant ${organizationId}`,
      createdAt: input.nowIso,
      updatedAt: input.nowIso
    })
  );
  return input.repository.bootstrapOrganizationsAndOwners({
    organizations,
    organizationId: input.config.organizationId,
    walletAddresses: ownerWallets,
    nowIso: input.nowIso
  });
}

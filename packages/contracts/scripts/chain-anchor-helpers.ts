import { getAddress, toFunctionSelector, type Address, type Hex } from "viem";

import {
  ACTION_TYPE,
  GIWA_SEPOLIA_CHAIN_ID,
  MANIFEST_VERSION,
  type ActionManifest
} from "../../protocol/src/index.js";

export const sprint3AmountBaseUnits = "1000000000000000000";
export const sprint3CampaignId = "gasok-demo";
export const sprint3MissionId = "first-mock-vault-deposit";

export type Sprint3ManifestInput = {
  nonce: string;
  expiryUnix: number;
  wallet: Address;
  mockVaultAddress: Address;
  mockTokenAddress: Address;
};

export function buildSprint3Manifest(input: Sprint3ManifestInput): ActionManifest {
  const mockVaultAddress = getAddress(input.mockVaultAddress) as Address;

  return {
    manifestVersion: MANIFEST_VERSION,
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    nonce: input.nonce,
    expiryUnix: input.expiryUnix,
    campaignId: sprint3CampaignId,
    missionId: sprint3MissionId,
    wallet: getAddress(input.wallet) as Address,
    actionType: ACTION_TYPE,
    target: mockVaultAddress,
    selector: toFunctionSelector("deposit(address,uint256)") as Hex,
    asset: getAddress(input.mockTokenAddress) as Address,
    amountBaseUnits: sprint3AmountBaseUnits,
    spender: mockVaultAddress,
    maxAllowanceBaseUnits: sprint3AmountBaseUnits,
    referralCode: "sprint-3-giwa-sepolia"
  };
}

export function buildExplorerUrl(template: string, value: Hex | Address): string {
  const markers = ["{txHash}", "{hash}", "{address}", ":txHash", ":hash", ":address", "<txHash>", "<hash>", "<address>"];
  let replaced = template.trim();

  for (const marker of markers) {
    replaced = replaced.split(marker).join(value);
  }

  if (replaced === template.trim()) {
    throw new Error("explorer template must include a supported placeholder");
  }

  return new URL(replaced).toString();
}

export type DecodedLogSnapshotLike = Record<string, unknown> & {
  address?: unknown;
  contractAddress?: unknown;
  eventName?: unknown;
  logIndex?: unknown;
};

function decodedLogSnapshotKey(snapshot: DecodedLogSnapshotLike): string | undefined {
  const address = snapshot.contractAddress ?? snapshot.address;
  if (typeof snapshot.eventName !== "string" || typeof address !== "string" || snapshot.logIndex == null) {
    return undefined;
  }

  return `${snapshot.eventName}:${address.toLowerCase()}:${snapshot.logIndex.toString()}`;
}

export function upsertDecodedLogSnapshots<T extends DecodedLogSnapshotLike>(
  existingSnapshots: readonly T[],
  latestSnapshots: readonly T[]
): T[] {
  const latestKeys = new Set(
    latestSnapshots
      .map((snapshot) => decodedLogSnapshotKey(snapshot))
      .filter((key): key is string => key !== undefined)
  );

  return [
    ...existingSnapshots.filter((snapshot) => {
      const key = decodedLogSnapshotKey(snapshot);
      return key === undefined || !latestKeys.has(key);
    }),
    ...latestSnapshots
  ];
}

export function normalizeForEvidence(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    if (/^0x[a-fA-F0-9]{40}$/.test(value) || /^0x[a-fA-F0-9]{64}$/.test(value)) {
      return value.toLowerCase();
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForEvidence(entry));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeForEvidence(entry)])
    );
  }

  return value;
}

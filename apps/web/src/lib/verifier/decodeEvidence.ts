import { decodeFunctionData, keccak256, stringToBytes, type Address, type Hex } from "viem";

import {
  computeIntentHash,
  idToBytes32,
  type ActionManifest
} from "../../../../../packages/protocol/src/index.ts";
import { normalizeAddress, normalizeBytes32 } from "../../../../../packages/protocol/src/validation.ts";

export type ChainEvidence = Record<string, any>;

export type DecodedLogSnapshot = {
  eventName: string;
  contractAddress: Address;
  logIndex: number;
  sourceTxHash: Hex;
  blockNumber: number;
  blockHash: Hex;
  args: Record<string, unknown>;
  topics?: readonly Hex[];
};

const vaultAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  }
] as const;

export function normalizeEvidenceForHash(value: unknown): unknown {
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
    return value.map((entry) => normalizeEvidenceForHash(entry));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeEvidenceForHash(entry)]));
  }

  return value;
}

export function hashEvidenceJson(value: unknown): Hex {
  return keccak256(stringToBytes(JSON.stringify(normalizeEvidenceForHash(value))));
}

export function manifestFromEvidence(evidence: ChainEvidence): ActionManifest {
  return evidence.manifest.manifest as ActionManifest;
}

export function requireDecodedLog(evidence: ChainEvidence, eventName: string): DecodedLogSnapshot | undefined {
  return (evidence.decodedLogSnapshots ?? []).find(
    (snapshot: DecodedLogSnapshot) => snapshot.eventName === eventName
  );
}

export function decodeDepositCalldata(input: Hex): { asset: Address; amountBaseUnits: string; selector: Hex } {
  const decoded = decodeFunctionData({
    abi: vaultAbi,
    data: input
  });
  const [asset, amount] = decoded.args;

  return {
    asset: normalizeAddress(asset, "deposit asset"),
    amountBaseUnits: amount.toString(),
    selector: input.slice(0, 10).toLowerCase() as Hex
  };
}

export function deployedManifestVectorMatchesEvidence(evidence: ChainEvidence): boolean {
  const manifest = manifestFromEvidence(evidence);

  return (
    computeIntentHash(manifest) === normalizeBytes32(evidence.manifest.intentHash, "intentHash") &&
    idToBytes32(manifest.campaignId) === evidence.manifest.campaignIdBytes32 &&
    idToBytes32(manifest.missionId) === evidence.manifest.missionIdBytes32 &&
    normalizeAddress(evidence.manifest.verifyingContract, "verifyingContract") ===
      normalizeAddress(evidence.contracts.intentRailAddress, "intentRailAddress")
  );
}

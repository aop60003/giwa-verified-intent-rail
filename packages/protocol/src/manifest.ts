import {
  ACTION_TYPE,
  GIWA_SEPOLIA_CHAIN_ID,
  MANIFEST_VERSION,
  type ActionManifest,
  type Hex
} from "./types.ts";
import { canonicalPayload, canonicalPayloadBytesHex as toPayloadBytesHex } from "./canonical.ts";
import { hashCanonicalPayload } from "./hash.ts";
import {
  normalizeAddress,
  normalizeBytes4,
  normalizeOptionalString,
  requireBaseUnitString,
  requirePositiveInteger,
  requireTrimmedString
} from "./validation.ts";

export const MANIFEST_FIELD_ORDER = [
  "manifestVersion",
  "chainId",
  "nonce",
  "expiryUnix",
  "campaignId",
  "missionId",
  "wallet",
  "actionType",
  "target",
  "selector",
  "asset",
  "amountBaseUnits",
  "spender",
  "maxAllowanceBaseUnits",
  "referralCode"
] as const;

export function normalizeManifest(input: ActionManifest): ActionManifest {
  if (input.manifestVersion !== MANIFEST_VERSION) {
    throw new Error("manifestVersion must be 1");
  }
  if (input.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    throw new Error("chainId must be 91342");
  }
  if (input.actionType !== ACTION_TYPE) {
    throw new Error("actionType must be mockVaultDeposit");
  }

  const referralCode = normalizeOptionalString(input.referralCode);
  const normalized: ActionManifest = {
    manifestVersion: MANIFEST_VERSION,
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    nonce: requireTrimmedString(input.nonce, "nonce"),
    expiryUnix: requirePositiveInteger(input.expiryUnix, "expiryUnix"),
    campaignId: requireTrimmedString(input.campaignId, "campaignId"),
    missionId: requireTrimmedString(input.missionId, "missionId"),
    wallet: normalizeAddress(input.wallet, "wallet"),
    actionType: ACTION_TYPE,
    target: normalizeAddress(input.target, "target"),
    selector: normalizeBytes4(input.selector),
    asset: normalizeAddress(input.asset, "asset"),
    amountBaseUnits: requireBaseUnitString(input.amountBaseUnits, "amountBaseUnits"),
    spender: normalizeAddress(input.spender, "spender"),
    maxAllowanceBaseUnits: requireBaseUnitString(input.maxAllowanceBaseUnits, "maxAllowanceBaseUnits")
  };

  if (referralCode !== undefined) {
    normalized.referralCode = referralCode;
  }

  return normalized;
}

export function canonicalManifestPayload(input: ActionManifest): string {
  return canonicalPayload(normalizeManifest(input), MANIFEST_FIELD_ORDER);
}

export function canonicalManifestPayloadBytesHex(input: ActionManifest): Hex {
  return toPayloadBytesHex(canonicalManifestPayload(input));
}

export function computeIntentHash(input: ActionManifest): Hex {
  return hashCanonicalPayload(canonicalManifestPayload(input));
}

import {
  hashStruct,
  hashTypedData,
  recoverTypedDataAddress,
  type TypedData,
  type TypedDataDomain
} from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { canonicalManifestPayload, computeIntentHash, normalizeManifest } from "./manifest.ts";
import {
  GIWA_SEPOLIA_CHAIN_ID,
  MANIFEST_VERSION,
  type ActionManifest,
  type Address,
  type Hex,
  type ManifestTypedMessage,
  type SignedManifest
} from "./types.ts";
import { normalizeAddress } from "./validation.ts";

export const MANIFEST_EIP712_TYPES = {
  IntentManifest: [
    { name: "manifestVersion", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "nonce", type: "string" },
    { name: "expiryUnix", type: "uint256" },
    { name: "campaignId", type: "string" },
    { name: "missionId", type: "string" },
    { name: "wallet", type: "address" },
    { name: "actionType", type: "string" },
    { name: "target", type: "address" },
    { name: "selector", type: "bytes4" },
    { name: "asset", type: "address" },
    { name: "amountBaseUnits", type: "uint256" },
    { name: "spender", type: "address" },
    { name: "maxAllowanceBaseUnits", type: "uint256" },
    { name: "referralCode", type: "string" }
  ]
} as const satisfies TypedData;

export type ManifestTypedData = {
  domain: TypedDataDomain & {
    name: "GIWA Verified Intent Rail";
    version: typeof MANIFEST_VERSION;
    chainId: typeof GIWA_SEPOLIA_CHAIN_ID;
    verifyingContract: Address;
  };
  types: typeof MANIFEST_EIP712_TYPES;
  primaryType: "IntentManifest";
  message: ManifestTypedMessage;
};

function toManifestTypedMessage(input: ActionManifest): ManifestTypedMessage {
  const manifest = normalizeManifest(input);

  return {
    manifestVersion: manifest.manifestVersion,
    chainId: BigInt(manifest.chainId),
    nonce: manifest.nonce,
    expiryUnix: BigInt(manifest.expiryUnix),
    campaignId: manifest.campaignId,
    missionId: manifest.missionId,
    wallet: manifest.wallet,
    actionType: manifest.actionType,
    target: manifest.target,
    selector: manifest.selector,
    asset: manifest.asset,
    amountBaseUnits: BigInt(manifest.amountBaseUnits),
    spender: manifest.spender,
    maxAllowanceBaseUnits: BigInt(manifest.maxAllowanceBaseUnits),
    referralCode: manifest.referralCode ?? ""
  };
}

export function buildManifestTypedData({
  manifest,
  verifyingContract
}: {
  manifest: ActionManifest;
  verifyingContract: Address;
}): ManifestTypedData {
  return {
    domain: {
      name: "GIWA Verified Intent Rail",
      version: MANIFEST_VERSION,
      chainId: GIWA_SEPOLIA_CHAIN_ID,
      verifyingContract: normalizeAddress(verifyingContract, "verifyingContract")
    },
    types: MANIFEST_EIP712_TYPES,
    primaryType: "IntentManifest",
    message: toManifestTypedMessage(manifest)
  };
}

export function computeManifestStructHash(manifest: ActionManifest): Hex {
  return hashStruct({
    types: MANIFEST_EIP712_TYPES,
    primaryType: "IntentManifest",
    data: toManifestTypedMessage(manifest)
  });
}

export function computeEip712Digest({
  manifest,
  verifyingContract
}: {
  manifest: ActionManifest;
  verifyingContract: Address;
}): Hex {
  return hashTypedData(buildManifestTypedData({ manifest, verifyingContract }));
}

export async function recoverManifestSigner({
  manifest,
  verifyingContract,
  signature
}: {
  manifest: ActionManifest;
  verifyingContract: Address;
  signature: Hex;
}): Promise<Address> {
  const recovered = await recoverTypedDataAddress({
    ...buildManifestTypedData({ manifest, verifyingContract }),
    signature
  });

  return recovered.toLowerCase() as Address;
}

export async function verifyAgainstAllowedSigner({
  manifest,
  verifyingContract,
  signature,
  allowedSigner
}: {
  manifest: ActionManifest;
  verifyingContract: Address;
  signature: Hex;
  allowedSigner: Address;
}): Promise<boolean> {
  const recovered = await recoverManifestSigner({ manifest, verifyingContract, signature });
  return recovered === normalizeAddress(allowedSigner, "allowedSigner");
}

export async function signManifest({
  manifest,
  verifyingContract,
  account
}: {
  manifest: ActionManifest;
  verifyingContract: Address;
  account: PrivateKeyAccount;
}): Promise<SignedManifest> {
  const typedData = buildManifestTypedData({ manifest, verifyingContract });
  const manifestSignature = await account.signTypedData(typedData);
  const recoveredSigner = await recoverManifestSigner({ manifest, verifyingContract, signature: manifestSignature });

  return {
    manifest: normalizeManifest(manifest),
    verifyingContract: normalizeAddress(verifyingContract, "verifyingContract"),
    manifestSignature,
    recoveredSigner,
    intentHash: computeIntentHash(manifest),
    manifestStructHash: computeManifestStructHash(manifest),
    eip712Digest: computeEip712Digest({ manifest, verifyingContract })
  };
}

export function manifestSigningSummary({
  manifest,
  verifyingContract
}: {
  manifest: ActionManifest;
  verifyingContract: Address;
}): {
  canonicalManifestPayload: string;
  intentHash: Hex;
  manifestStructHash: Hex;
  eip712Digest: Hex;
} {
  return {
    canonicalManifestPayload: canonicalManifestPayload(manifest),
    intentHash: computeIntentHash(manifest),
    manifestStructHash: computeManifestStructHash(manifest),
    eip712Digest: computeEip712Digest({ manifest, verifyingContract })
  };
}

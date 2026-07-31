import {
  GIWA_SEPOLIA_CHAIN_ID,
  VERIFIER_SCHEMA_VERSION,
  type ActionManifest,
  type GoldenVector,
  type Hex,
  type ReceiptPayload,
  type VerifierInputPayload
} from "./types.ts";
import { canonicalPayload, canonicalPayloadBytesHex as toPayloadBytesHex } from "./canonical.ts";
import { hashCanonicalPayload } from "./hash.ts";
import { idToBytes32 } from "./ids.ts";
import {
  MANIFEST_FIELD_ORDER,
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  computeIntentHash,
  normalizeManifest
} from "./manifest.ts";
import {
  RECEIPT_FIELD_ORDER,
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  computeReceiptHash,
  normalizeReceiptPayload
} from "./receipt.ts";
import {
  normalizeBytes32,
  requireNonNegativeInteger,
  requirePositiveInteger,
  requireTrimmedString
} from "./validation.ts";

const fakeBytes32 = (char: string): Hex => `0x${char.repeat(64)}` as Hex;

export const VERIFIER_INPUT_FIELD_ORDER = [
  "schemaVersion",
  "chainId",
  "intentHash",
  "depositTxHash",
  "depositTransactionSnapshotHash",
  "depositReceiptSnapshotHash",
  "decodedLogSnapshotHash",
  "confirmationDepth",
  "headBlockNumberAtVerification",
  "verifierVersion"
] as const;

export function normalizeVerifierInputPayload(input: VerifierInputPayload): VerifierInputPayload {
  if (input.schemaVersion !== VERIFIER_SCHEMA_VERSION) {
    throw new Error("schemaVersion must be 1");
  }
  if (input.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    throw new Error("chainId must be 91342");
  }

  return {
    schemaVersion: VERIFIER_SCHEMA_VERSION,
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    intentHash: normalizeBytes32(input.intentHash, "intentHash"),
    depositTxHash: normalizeBytes32(input.depositTxHash, "depositTxHash"),
    depositTransactionSnapshotHash: normalizeBytes32(
      input.depositTransactionSnapshotHash,
      "depositTransactionSnapshotHash"
    ),
    depositReceiptSnapshotHash: normalizeBytes32(input.depositReceiptSnapshotHash, "depositReceiptSnapshotHash"),
    decodedLogSnapshotHash: normalizeBytes32(input.decodedLogSnapshotHash, "decodedLogSnapshotHash"),
    confirmationDepth: requireNonNegativeInteger(input.confirmationDepth, "confirmationDepth"),
    headBlockNumberAtVerification: requirePositiveInteger(
      input.headBlockNumberAtVerification,
      "headBlockNumberAtVerification"
    ),
    verifierVersion: requireTrimmedString(input.verifierVersion, "verifierVersion")
  };
}

export function canonicalVerifierInputPayload(input: VerifierInputPayload): string {
  return canonicalPayload(normalizeVerifierInputPayload(input), VERIFIER_INPUT_FIELD_ORDER);
}

export function canonicalVerifierInputPayloadBytesHex(input: VerifierInputPayload): Hex {
  return toPayloadBytesHex(canonicalVerifierInputPayload(input));
}

export function computeVerifierInputHash(input: VerifierInputPayload): Hex {
  return hashCanonicalPayload(canonicalVerifierInputPayload(input));
}

function vector(payloadName: string, fieldOrder: readonly string[], payloadJson: string, hash: Hex): GoldenVector {
  return {
    payloadName,
    fieldOrder,
    payloadJson,
    payloadBytesHex: toPayloadBytesHex(payloadJson),
    hash,
    createdBy: "Sprint 1 Protocol Kernel",
    createdAt: "2026-06-16"
  };
}

const manifestVector: ActionManifest = {
  manifestVersion: "1",
  chainId: 91342,
  nonce: "wallet-1-campaign-1-mission-1",
  expiryUnix: 1790000000,
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  wallet: "0x0000000000000000000000000000000000000001",
  actionType: "mockVaultDeposit",
  target: "0x0000000000000000000000000000000000000002",
  selector: "0xb6b55f25",
  asset: "0x0000000000000000000000000000000000000003",
  amountBaseUnits: "1000000000000000000",
  spender: "0x0000000000000000000000000000000000000002",
  maxAllowanceBaseUnits: "1000000000000000000",
  referralCode: "qr-judge-demo"
};

const receiptVector: ReceiptPayload = {
  schemaVersion: "1",
  verifierVersion: "1",
  intentHash: fakeBytes32("1"),
  chainId: 91342,
  networkName: "GIWA Sepolia",
  status: "matched",
  actionType: "mockVaultDeposit",
  asset: "0x0000000000000000000000000000000000000003",
  amountBaseUnits: "1000000000000000000",
  target: "0x0000000000000000000000000000000000000002",
  spender: "0x0000000000000000000000000000000000000002",
  maxAllowanceBaseUnits: "1000000000000000000",
  allowanceUsedBaseUnits: "1000000000000000000",
  approvalRequired: false,
  approveTxHash: null,
  depositTxHash: fakeBytes32("2"),
  depositBlockNumber: 12345,
  depositBlockHash: fakeBytes32("3"),
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  wallet: "0x0000000000000000000000000000000000000001",
  verifiedState: "guest",
  testnetDepositAmountDelta: "1000000000000000000",
  issuedAt: 1790000010,
  issuer: "GIWA Verified Intent Rail MVP",
  safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
};

const verifierInputVector: VerifierInputPayload = {
  schemaVersion: "1",
  chainId: 91342,
  intentHash: fakeBytes32("1"),
  depositTxHash: fakeBytes32("2"),
  depositTransactionSnapshotHash: fakeBytes32("3"),
  depositReceiptSnapshotHash: fakeBytes32("4"),
  decodedLogSnapshotHash: fakeBytes32("5"),
  confirmationDepth: 3,
  headBlockNumberAtVerification: 12348,
  verifierVersion: "1"
};

const campaignIdPayload = '{"id":"gasok-demo"}';
const missionIdPayload = '{"id":"first-mock-vault-deposit"}';

export const SPRINT1_GOLDEN_VECTORS = {
  campaignIdBytes32: vector("campaignIdBytes32", ["id"], campaignIdPayload, idToBytes32("gasok-demo")),
  missionIdBytes32: vector(
    "missionIdBytes32",
    ["id"],
    missionIdPayload,
    idToBytes32("first-mock-vault-deposit")
  ),
  canonicalManifestPayload: vector(
    "canonicalManifestPayload",
    MANIFEST_FIELD_ORDER,
    canonicalManifestPayload(normalizeManifest(manifestVector)),
    computeIntentHash(manifestVector)
  ),
  canonicalReceiptPayload: vector(
    "canonicalReceiptPayload",
    RECEIPT_FIELD_ORDER,
    canonicalReceiptPayload(normalizeReceiptPayload(receiptVector)),
    computeReceiptHash(receiptVector)
  ),
  canonicalVerifierInputPayload: vector(
    "canonicalVerifierInputPayload",
    VERIFIER_INPUT_FIELD_ORDER,
    canonicalVerifierInputPayload(verifierInputVector),
    computeVerifierInputHash(verifierInputVector)
  )
} as const;

export const SPRINT1_GOLDEN_VECTOR_PAYLOAD_BYTES = {
  canonicalManifestPayloadBytesHex: canonicalManifestPayloadBytesHex(manifestVector),
  canonicalReceiptPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptVector),
  canonicalVerifierInputPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(verifierInputVector)
} as const;

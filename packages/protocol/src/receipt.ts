import {
  ACTION_TYPE,
  GIWA_SEPOLIA_CHAIN_ID,
  NETWORK_NAME,
  RECEIPT_ISSUER,
  RECEIPT_SAFETY_NOTICE,
  RECEIPT_SCHEMA_VERSION,
  type Hex,
  type ReceiptEnvelope,
  type ReceiptEnvelopeFields,
  type ReceiptPayload
} from "./types.ts";
import { canonicalPayload, canonicalPayloadBytesHex as toPayloadBytesHex } from "./canonical.ts";
import { hashCanonicalPayload } from "./hash.ts";
import {
  normalizeAddress,
  normalizeBytes32,
  requireBaseUnitString,
  requirePositiveInteger,
  requireTrimmedString
} from "./validation.ts";

export const RECEIPT_FIELD_ORDER = [
  "schemaVersion",
  "verifierVersion",
  "intentHash",
  "chainId",
  "networkName",
  "status",
  "actionType",
  "asset",
  "amountBaseUnits",
  "target",
  "spender",
  "maxAllowanceBaseUnits",
  "allowanceUsedBaseUnits",
  "approvalRequired",
  "approveTxHash",
  "depositTxHash",
  "depositBlockNumber",
  "depositBlockHash",
  "campaignId",
  "missionId",
  "wallet",
  "verifiedState",
  "verifiedProvider",
  "testnetDepositAmountDelta",
  "issuedAt",
  "issuer",
  "safetyNotice"
] as const;

export function normalizeReceiptPayload(input: ReceiptPayload): ReceiptPayload {
  if (input.schemaVersion !== RECEIPT_SCHEMA_VERSION) {
    throw new Error("schemaVersion must be 1");
  }
  if (input.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    throw new Error("chainId must be 91342");
  }
  if (input.networkName !== NETWORK_NAME) {
    throw new Error("networkName must be GIWA Sepolia");
  }
  if (input.status !== "matched") {
    throw new Error("status must be matched");
  }
  if (input.actionType !== ACTION_TYPE) {
    throw new Error("actionType must be mockVaultDeposit");
  }
  if (input.issuer !== RECEIPT_ISSUER) {
    throw new Error("issuer must be GIWA Verified Intent Rail MVP");
  }
  if (input.safetyNotice !== RECEIPT_SAFETY_NOTICE) {
    throw new Error("safetyNotice must match the testnet-only receipt notice");
  }
  if (!["verified", "guest", "unavailable"].includes(input.verifiedState)) {
    throw new Error("verifiedState must be verified, guest, or unavailable");
  }
  if (typeof input.approvalRequired !== "boolean") {
    throw new Error("approvalRequired must be boolean");
  }
  if (
    input.verifiedProvider !== undefined &&
    !["Dojang", "up.id"].includes(input.verifiedProvider)
  ) {
    throw new Error("verifiedProvider must be Dojang or up.id");
  }

  const payload: ReceiptPayload = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    verifierVersion: requireTrimmedString(input.verifierVersion, "verifierVersion"),
    intentHash: normalizeBytes32(input.intentHash, "intentHash"),
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    networkName: NETWORK_NAME,
    status: "matched",
    actionType: ACTION_TYPE,
    asset: normalizeAddress(input.asset, "asset"),
    amountBaseUnits: requireBaseUnitString(input.amountBaseUnits, "amountBaseUnits"),
    target: normalizeAddress(input.target, "target"),
    spender: normalizeAddress(input.spender, "spender"),
    maxAllowanceBaseUnits: requireBaseUnitString(input.maxAllowanceBaseUnits, "maxAllowanceBaseUnits"),
    allowanceUsedBaseUnits: requireBaseUnitString(input.allowanceUsedBaseUnits, "allowanceUsedBaseUnits"),
    approvalRequired: input.approvalRequired,
    approveTxHash: input.approveTxHash === null ? null : normalizeBytes32(input.approveTxHash, "approveTxHash"),
    depositTxHash: normalizeBytes32(input.depositTxHash, "depositTxHash"),
    depositBlockNumber: requirePositiveInteger(input.depositBlockNumber, "depositBlockNumber"),
    depositBlockHash: normalizeBytes32(input.depositBlockHash, "depositBlockHash"),
    campaignId: requireTrimmedString(input.campaignId, "campaignId"),
    missionId: requireTrimmedString(input.missionId, "missionId"),
    wallet: normalizeAddress(input.wallet, "wallet"),
    verifiedState: input.verifiedState,
    testnetDepositAmountDelta: requireBaseUnitString(
      input.testnetDepositAmountDelta,
      "testnetDepositAmountDelta"
    ),
    issuedAt: requirePositiveInteger(input.issuedAt, "issuedAt"),
    issuer: RECEIPT_ISSUER,
    safetyNotice: RECEIPT_SAFETY_NOTICE
  };

  if (input.verifiedProvider !== undefined) {
    payload.verifiedProvider = input.verifiedProvider;
  }

  return payload;
}

export function canonicalReceiptPayload(input: ReceiptPayload): string {
  return canonicalPayload(normalizeReceiptPayload(input), RECEIPT_FIELD_ORDER);
}

export function canonicalReceiptPayloadBytesHex(input: ReceiptPayload): Hex {
  return toPayloadBytesHex(canonicalReceiptPayload(input));
}

export function computeReceiptHash(input: ReceiptPayload): Hex {
  return hashCanonicalPayload(canonicalReceiptPayload(input));
}

export function receiptIdempotencyKey(intentHash: Hex): string {
  return `proofkpi-receipt:${normalizeBytes32(intentHash, "intentHash")}`;
}

export function createReceiptEnvelope(
  input: ReceiptPayload,
  envelopeFields: ReceiptEnvelopeFields
): ReceiptEnvelope {
  const payload = normalizeReceiptPayload(input);

  return {
    payload,
    receiptHash: computeReceiptHash(payload),
    decisionTxHash: normalizeBytes32(envelopeFields.decisionTxHash, "decisionTxHash"),
    decisionBlockNumber: requirePositiveInteger(envelopeFields.decisionBlockNumber, "decisionBlockNumber"),
    decisionBlockHash: normalizeBytes32(envelopeFields.decisionBlockHash, "decisionBlockHash"),
    explorerUrl: requireTrimmedString(envelopeFields.explorerUrl, "explorerUrl"),
    displayStatus: requireTrimmedString(envelopeFields.displayStatus, "displayStatus"),
    displayCopy: requireTrimmedString(envelopeFields.displayCopy, "displayCopy")
  };
}

import {
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  computeIntentHash,
  computeReceiptHash,
  GIWA_SEPOLIA_CHAIN_ID,
  NETWORK_NAME,
  RECEIPT_ISSUER,
  RECEIPT_SAFETY_NOTICE,
  RECEIPT_SCHEMA_VERSION,
  type ActionManifest,
  type Hex,
  type ReceiptPayload
} from "../../../../../packages/protocol/src/index.ts";

import type { SubmittedTxRecord } from "../live/liveTypes.ts";

export type BuildLiveReceiptInput = {
  manifest: ActionManifest;
  submittedTx: SubmittedTxRecord;
  depositBlockNumber: number;
  depositBlockHash: Hex;
  issuedAt: number;
  verifierVersion: string;
};

export type BuiltLiveReceipt = {
  payload: ReceiptPayload;
  payloadJson: string;
  canonicalPayload: string;
  canonicalPayloadBytesHex: Hex;
  receiptHash: Hex;
};

export function buildLiveReceipt(input: BuildLiveReceiptInput): BuiltLiveReceipt {
  const payload: ReceiptPayload = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    verifierVersion: input.verifierVersion,
    intentHash: computeIntentHash(input.manifest),
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    networkName: NETWORK_NAME,
    status: "matched",
    actionType: input.manifest.actionType,
    asset: input.manifest.asset,
    amountBaseUnits: input.manifest.amountBaseUnits,
    target: input.manifest.target,
    spender: input.manifest.spender,
    maxAllowanceBaseUnits: input.manifest.maxAllowanceBaseUnits,
    allowanceUsedBaseUnits: input.manifest.amountBaseUnits,
    approvalRequired: input.submittedTx.approveTxHash !== null,
    approveTxHash: input.submittedTx.approveTxHash as Hex | null,
    depositTxHash: input.submittedTx.depositTxHash as Hex,
    depositBlockNumber: input.depositBlockNumber,
    depositBlockHash: input.depositBlockHash,
    campaignId: input.manifest.campaignId,
    missionId: input.manifest.missionId,
    wallet: input.manifest.wallet,
    verifiedState: "guest",
    testnetDepositAmountDelta: input.manifest.amountBaseUnits,
    issuedAt: input.issuedAt,
    issuer: RECEIPT_ISSUER,
    safetyNotice: RECEIPT_SAFETY_NOTICE
  };
  const canonicalPayload = canonicalReceiptPayload(payload);

  return {
    payload,
    payloadJson: JSON.stringify(payload),
    canonicalPayload,
    canonicalPayloadBytesHex: canonicalReceiptPayloadBytesHex(payload),
    receiptHash: computeReceiptHash(payload)
  };
}

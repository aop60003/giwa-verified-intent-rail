import {
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  computeReceiptHash,
  computeVerifierInputHash,
  type Address,
  type Hex,
  type ReceiptPayload,
  type VerifierDecision,
  type VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";
import { normalizeAddress, normalizeBytes32 } from "../../../../../packages/protocol/src/validation.ts";
import {
  decodeDepositCalldata,
  deployedManifestVectorMatchesEvidence,
  hashEvidenceJson,
  manifestFromEvidence,
  requireDecodedLog,
  type ChainEvidence
} from "./decodeEvidence.ts";
import { verifyDeploymentManifestSigner } from "./verifyManifestSigner.ts";

export type VerifyDepositOptions = {
  officialCampaignSigner: Address;
  configuredIntentSubmitter: Address;
  confirmationDepth: number;
  headBlockNumberAtVerification: number;
  issuedAt: number;
  verifierVersion: string;
  minimumConfirmationDepth?: number;
};

export type ReceiptDraft = {
  payload: ReceiptPayload;
  canonicalReceiptPayload: string;
  canonicalReceiptPayloadBytesHex: Hex;
  receiptHash: Hex;
};

export type DepositVerifierResult = {
  decision: VerifierDecision;
  failureReason: string | null;
  failureCode: string | null;
  matchedFields: string[];
  failureMatchedFields: string[];
  verifierInputPayload: VerifierInputPayload;
  canonicalVerifierInputPayload: string;
  canonicalVerifierInputPayloadBytesHex: Hex;
  verifierInputHash: Hex;
  receipt?: ReceiptDraft;
};

function amountAtMost(actual: string, maximum: string): boolean {
  return BigInt(actual) <= BigInt(maximum);
}

function sameAddress(left: string | undefined, right: string | undefined): boolean {
  return left !== undefined && right !== undefined && normalizeAddress(left, "left") === normalizeAddress(right, "right");
}

function fail(
  decision: VerifierDecision,
  failureReason: string,
  failureCode: string,
  matchedFields: string[],
  verifierInputPayload: VerifierInputPayload
): DepositVerifierResult {
  return {
    decision,
    failureReason,
    failureCode,
    matchedFields,
    failureMatchedFields: matchedFields,
    verifierInputPayload,
    canonicalVerifierInputPayload: canonicalVerifierInputPayload(verifierInputPayload),
    canonicalVerifierInputPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(verifierInputPayload),
    verifierInputHash: computeVerifierInputHash(verifierInputPayload)
  };
}

function buildVerifierInputPayload(evidence: ChainEvidence, options: VerifyDepositOptions): VerifierInputPayload {
  return {
    schemaVersion: "1",
    chainId: 91342,
    intentHash: normalizeBytes32(evidence.manifest.intentHash, "intentHash"),
    depositTxHash: normalizeBytes32(evidence.transactions.depositTxHash, "depositTxHash"),
    depositTransactionSnapshotHash:
      evidence.transactions.depositTx.depositTransactionSnapshotHash ??
      hashEvidenceJson(evidence.transactions.depositTx.rawEthGetTransaction),
    depositReceiptSnapshotHash:
      evidence.transactions.depositTx.depositReceiptSnapshotHash ??
      hashEvidenceJson(evidence.transactions.depositTx.rawEthGetTransactionReceipt),
    decodedLogSnapshotHash: evidence.decodedLogSnapshotHash ?? hashEvidenceJson(evidence.decodedLogSnapshots),
    confirmationDepth: options.confirmationDepth,
    headBlockNumberAtVerification: options.headBlockNumberAtVerification,
    verifierVersion: options.verifierVersion
  };
}

export function buildReceiptPayload(
  evidence: ChainEvidence,
  input: {
    allowanceUsedBaseUnits: string;
    issuedAt: number;
    verifierVersion: string;
  }
): ReceiptPayload {
  const manifest = manifestFromEvidence(evidence);

  return {
    schemaVersion: "1",
    verifierVersion: input.verifierVersion,
    intentHash: normalizeBytes32(evidence.manifest.intentHash, "intentHash"),
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: "mockVaultDeposit",
    asset: manifest.asset,
    amountBaseUnits: manifest.amountBaseUnits,
    target: manifest.target,
    spender: manifest.spender,
    maxAllowanceBaseUnits: manifest.maxAllowanceBaseUnits,
    allowanceUsedBaseUnits: input.allowanceUsedBaseUnits,
    approvalRequired: evidence.walletActions?.approvalRequired === true,
    approveTxHash: evidence.walletActions?.approvalRequired === true ? evidence.transactions.approveTxHash : null,
    depositTxHash: evidence.transactions.depositTxHash,
    depositBlockNumber: Number(evidence.transactions.depositTx.blockNumber),
    depositBlockHash: evidence.transactions.depositTx.blockHash,
    campaignId: manifest.campaignId,
    missionId: manifest.missionId,
    wallet: manifest.wallet,
    verifiedState: "guest",
    testnetDepositAmountDelta: manifest.amountBaseUnits,
    issuedAt: input.issuedAt,
    issuer: "GIWA Verified Intent Rail MVP",
    safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
  };
}

export async function verifyDepositEvidence(
  evidence: ChainEvidence,
  options: VerifyDepositOptions
): Promise<DepositVerifierResult> {
  const manifest = manifestFromEvidence(evidence);
  const matchedFields: string[] = [];
  const verifierInputPayload = buildVerifierInputPayload(evidence, options);
  const signer = await verifyDeploymentManifestSigner({
    manifest,
    verifyingContract: evidence.manifest.verifyingContract,
    signature: evidence.manifest.manifestSignature,
    officialCampaignSigner: options.officialCampaignSigner
  });
  if (!signer.ok) {
    return fail("mismatched", signer.failureReason ?? "OFFICIAL_SIGNER_MISMATCH", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  matchedFields.push("officialSigner");

  if (!deployedManifestVectorMatchesEvidence(evidence)) {
    return fail("mismatched", "DEPLOYED_MANIFEST_VECTOR_MISMATCH", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  matchedFields.push("deployedManifestVector");

  const intentSubmitted = requireDecodedLog(evidence, "IntentSubmitted");
  if (intentSubmitted === undefined) {
    return fail("mismatched", "MISSING_INTENT_SUBMITTED", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  const intentArgs = intentSubmitted.args;
  if (
    intentArgs.intentHash !== evidence.manifest.intentHash ||
    !sameAddress(intentArgs.wallet as string, manifest.wallet) ||
    !sameAddress(intentArgs.target as string, manifest.target) ||
    intentArgs.selector !== manifest.selector ||
    !sameAddress(intentArgs.asset as string, manifest.asset) ||
    (intentArgs.amountBaseUnits as string) !== manifest.amountBaseUnits ||
    !sameAddress(intentArgs.spender as string, manifest.spender) ||
    (intentArgs.maxAllowanceBaseUnits as string) !== manifest.maxAllowanceBaseUnits
  ) {
    return fail("mismatched", "INTENT_SUBMITTED_MISMATCH", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  matchedFields.push("intentSubmitted");

  const intentSubmittedFrom = evidence.transactions.intentSubmittedTx?.rawEthGetTransaction?.from;
  if (!sameAddress(intentSubmittedFrom, options.configuredIntentSubmitter)) {
    return fail("mismatched", "INTENT_SUBMITTER_MISMATCH", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  matchedFields.push("intentSubmitter");

  const minimumConfirmationDepth = options.minimumConfirmationDepth ?? 1;
  if (options.confirmationDepth < minimumConfirmationDepth) {
    return fail("timeout", "UNCONFIRMED", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  matchedFields.push("confirmationDepth");

  const depositReceipt = evidence.transactions.depositTx.rawEthGetTransactionReceipt;
  if (depositReceipt.status !== "success" || evidence.confirmation.standardRpcReceiptStatus !== 1) {
    return fail("failed", "TX_FAILED", "TX_FAILED", matchedFields, verifierInputPayload);
  }
  matchedFields.push("standardRpcReceipt");

  if (Number(manifest.expiryUnix) < options.issuedAt) {
    return fail("mismatched", "EXPIRED", "EXPIRED", matchedFields, verifierInputPayload);
  }
  matchedFields.push("expiry");

  const depositTx = evidence.transactions.depositTx.rawEthGetTransaction;
  if (!sameAddress(depositTx.from, manifest.wallet)) {
    return fail("mismatched", "WALLET_MISMATCH", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  matchedFields.push("depositWallet");

  if (!sameAddress(depositTx.to, manifest.target)) {
    return fail("mismatched", "TARGET_MISMATCH", "TARGET_MISMATCH", matchedFields, verifierInputPayload);
  }
  matchedFields.push("depositTarget");

  const decodedDeposit = decodeDepositCalldata(depositTx.input);
  if (decodedDeposit.selector !== manifest.selector) {
    return fail("mismatched", "SELECTOR_MISMATCH", "TARGET_MISMATCH", matchedFields, verifierInputPayload);
  }
  matchedFields.push("depositSelector");

  if (!sameAddress(decodedDeposit.asset, manifest.asset)) {
    return fail("mismatched", "ASSET_MISMATCH", "TARGET_MISMATCH", matchedFields, verifierInputPayload);
  }
  matchedFields.push("depositAsset");

  if (!amountAtMost(decodedDeposit.amountBaseUnits, manifest.amountBaseUnits)) {
    return fail("mismatched", "AMOUNT_EXCEEDED", "ALLOWANCE_EXCEEDED", matchedFields, verifierInputPayload);
  }
  matchedFields.push("depositAmount");

  const approval = requireDecodedLog(evidence, "Approval");
  const transfer = requireDecodedLog(evidence, "Transfer");
  const mockDeposit = requireDecodedLog(evidence, "MockDeposit");
  if (approval === undefined || transfer === undefined || mockDeposit === undefined) {
    return fail("mismatched", "MISSING_REQUIRED_LOG", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }

  if (!sameAddress(approval.args.owner as string, manifest.wallet)) {
    return fail("mismatched", "APPROVAL_OWNER_MISMATCH", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  matchedFields.push("approvalOwner");

  if (!sameAddress(approval.args.spender as string, manifest.spender)) {
    return fail("mismatched", "SPENDER_MISMATCH", "SPENDER_MISMATCH", matchedFields, verifierInputPayload);
  }
  matchedFields.push("approvalSpender");

  if (!amountAtMost(approval.args.amount as string, manifest.maxAllowanceBaseUnits)) {
    return fail("mismatched", "ALLOWANCE_EXCEEDED", "ALLOWANCE_EXCEEDED", matchedFields, verifierInputPayload);
  }
  matchedFields.push("allowanceBound");

  if (
    !sameAddress(transfer.args.from as string, manifest.wallet) ||
    !sameAddress(transfer.args.to as string, manifest.target) ||
    (transfer.args.amount as string) !== decodedDeposit.amountBaseUnits ||
    !sameAddress(mockDeposit.args.wallet as string, manifest.wallet) ||
    !sameAddress(mockDeposit.args.asset as string, manifest.asset) ||
    (mockDeposit.args.amount as string) !== decodedDeposit.amountBaseUnits
  ) {
    return fail("mismatched", "DEPOSIT_LOG_MISMATCH", "MISSING_REQUIRED_LOG", matchedFields, verifierInputPayload);
  }
  matchedFields.push("transferLog", "mockDepositLog");

  const receiptPayload = buildReceiptPayload(evidence, {
    allowanceUsedBaseUnits: approval.args.amount as string,
    issuedAt: options.issuedAt,
    verifierVersion: options.verifierVersion
  });
  const receipt = {
    payload: receiptPayload,
    canonicalReceiptPayload: canonicalReceiptPayload(receiptPayload),
    canonicalReceiptPayloadBytesHex: canonicalReceiptPayloadBytesHex(receiptPayload),
    receiptHash: computeReceiptHash(receiptPayload)
  };

  return {
    decision: "matched",
    failureReason: null,
    failureCode: null,
    matchedFields,
    failureMatchedFields: [],
    verifierInputPayload,
    canonicalVerifierInputPayload: canonicalVerifierInputPayload(verifierInputPayload),
    canonicalVerifierInputPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(verifierInputPayload),
    verifierInputHash: computeVerifierInputHash(verifierInputPayload),
    receipt
  };
}

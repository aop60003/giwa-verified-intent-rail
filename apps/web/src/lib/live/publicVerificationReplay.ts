import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  computeIntentHash,
  computeReceiptHash,
  computeVerifierInputHash,
  recoverManifestSigner
} from "../../../../../packages/protocol/src/index.ts";
import { hashEvidenceJson } from "../verifier/decodeEvidence.ts";
import type { PublicVerificationBundleV1 } from "./publicVerificationBundle.ts";

export type PublicVerificationReplayResult = {
  ok: boolean;
  checks: {
    manifestHash: "passed" | "failed";
    manifestSignature: "passed" | "failed";
    verifierInputHash: "passed" | "failed";
    decodedLogHash: "passed" | "failed";
    receiptHash: "passed" | "failed";
    crossReferences: "passed" | "failed";
  };
  recoveredSigner: string | null;
};

type Check = "passed" | "failed";

function check(operation: () => boolean): Check {
  try {
    return operation() ? "passed" : "failed";
  } catch {
    return "failed";
  }
}

function manifestHashCheck(bundle: PublicVerificationBundleV1): boolean {
  const canonicalPayload = canonicalManifestPayload(bundle.manifest.payload);
  const canonicalBytes = canonicalManifestPayloadBytesHex(bundle.manifest.payload);
  const intentHash = computeIntentHash(bundle.manifest.payload);

  return (
    canonicalPayload === bundle.manifest.canonicalPayload &&
    canonicalBytes === bundle.manifest.canonicalPayloadBytesHex &&
    intentHash === bundle.identity.intentHash
  );
}

function verifierInputHashCheck(bundle: PublicVerificationBundleV1): boolean {
  const canonicalPayload = canonicalVerifierInputPayload(
    bundle.verifierInput.payload
  );
  const canonicalBytes = canonicalVerifierInputPayloadBytesHex(
    bundle.verifierInput.payload
  );
  const verifierInputHash = computeVerifierInputHash(bundle.verifierInput.payload);

  return (
    canonicalPayload === bundle.verifierInput.canonicalPayload &&
    canonicalBytes === bundle.verifierInput.canonicalPayloadBytesHex &&
    verifierInputHash === bundle.verifierInput.verifierInputHash
  );
}

function receiptHashCheck(bundle: PublicVerificationBundleV1): boolean {
  const canonicalPayload = canonicalReceiptPayload(bundle.receipt.payload);
  const canonicalBytes = canonicalReceiptPayloadBytesHex(bundle.receipt.payload);
  const receiptHash = computeReceiptHash(bundle.receipt.payload);

  return (
    canonicalPayload === bundle.receipt.canonicalPayload &&
    canonicalBytes === bundle.receipt.canonicalPayloadBytesHex &&
    receiptHash === bundle.receipt.receiptHash
  );
}

function crossReferencesCheck(bundle: PublicVerificationBundleV1): boolean {
  const manifest = bundle.manifest.payload;
  const verifier = bundle.verifierInput.payload;
  const receipt = bundle.receipt.payload;
  const verification = bundle.verification;
  const transfers = bundle.decodedLogs.filter(
    (log) => log.eventName === "Transfer"
  );
  const deposits = bundle.decodedLogs.filter(
    (log) => log.eventName === "MockDeposit"
  );
  const approvals = bundle.decodedLogs.filter(
    (log) => log.eventName === "Approval"
  );
  const transfer = transfers[0];
  const deposit = deposits[0];
  const approval = approvals[0];
  const eventCardinalityAgrees =
    transfers.length === 1 &&
    deposits.length === 1 &&
    approvals.length === (receipt.approvalRequired ? 1 : 0);

  const commonReferencesAgree =
    bundle.identity.receiptHash === bundle.receipt.receiptHash &&
    bundle.identity.intentHash === verifier.intentHash &&
    bundle.identity.intentHash === receipt.intentHash &&
    bundle.identity.depositTxHash === verifier.depositTxHash &&
    bundle.identity.depositTxHash === receipt.depositTxHash &&
    manifest.chainId === verifier.chainId &&
    manifest.chainId === receipt.chainId &&
    manifest.wallet === receipt.wallet &&
    manifest.campaignId === receipt.campaignId &&
    manifest.missionId === receipt.missionId &&
    manifest.actionType === receipt.actionType &&
    manifest.asset === receipt.asset &&
    manifest.amountBaseUnits === receipt.amountBaseUnits &&
    manifest.target === receipt.target &&
    manifest.spender === receipt.spender &&
    manifest.maxAllowanceBaseUnits === receipt.maxAllowanceBaseUnits &&
    manifest.amountBaseUnits === receipt.allowanceUsedBaseUnits &&
    manifest.amountBaseUnits === receipt.testnetDepositAmountDelta &&
    verifier.verifierVersion === bundle.verifierInput.verifierVersion &&
    verifier.verifierVersion === receipt.verifierVersion &&
    verifier.verifierVersion === bundle.receipt.verifierVersion &&
    receipt.schemaVersion === bundle.receipt.schemaVersion &&
    verification.depositBlockNumber === receipt.depositBlockNumber &&
    verification.depositBlockHash === receipt.depositBlockHash &&
    verification.headBlockNumberAtVerification ===
      verifier.headBlockNumberAtVerification &&
    verification.confirmationDepth === verifier.confirmationDepth &&
    verification.confirmationDepth ===
      Math.max(
        0,
        verification.headBlockNumberAtVerification -
          receipt.depositBlockNumber +
          1
      ) &&
    verification.standardRpcReceiptStatus === 1;

  const transferAgrees =
    transfer !== undefined &&
    transfer.contractAddress === manifest.asset &&
    transfer.sourceTxHash === bundle.identity.depositTxHash &&
    transfer.blockNumber === verification.depositBlockNumber &&
    transfer.blockHash === verification.depositBlockHash &&
    transfer.args.from === manifest.wallet &&
    transfer.args.to === manifest.target &&
    transfer.args.amount === manifest.amountBaseUnits;

  const depositAgrees =
    deposit !== undefined &&
    deposit.contractAddress === manifest.target &&
    deposit.sourceTxHash === bundle.identity.depositTxHash &&
    deposit.blockNumber === verification.depositBlockNumber &&
    deposit.blockHash === verification.depositBlockHash &&
    deposit.args.wallet === manifest.wallet &&
    deposit.args.asset === manifest.asset &&
    deposit.args.amount === manifest.amountBaseUnits;

  const approvalAgrees = receipt.approvalRequired
    ? approval !== undefined &&
      receipt.approveTxHash !== null &&
      approval.contractAddress === manifest.asset &&
      approval.sourceTxHash === receipt.approveTxHash &&
      approval.args.owner === manifest.wallet &&
      approval.args.spender === manifest.spender &&
      approval.args.amount === manifest.maxAllowanceBaseUnits
    : receipt.approveTxHash === null;

  return (
    commonReferencesAgree &&
    eventCardinalityAgrees &&
    transferAgrees &&
    depositAgrees &&
    approvalAgrees
  );
}

export async function replayPublicVerificationBundle(
  bundle: PublicVerificationBundleV1
): Promise<PublicVerificationReplayResult> {
  const manifestHash = check(() => manifestHashCheck(bundle));
  const verifierInputHash = check(() => verifierInputHashCheck(bundle));
  const decodedLogHash = check(
    () =>
      hashEvidenceJson(bundle.decodedLogs) ===
      bundle.verifierInput.payload.decodedLogSnapshotHash
  );
  const receiptHash = check(() => receiptHashCheck(bundle));
  const crossReferences = check(() => crossReferencesCheck(bundle));

  let recoveredSigner: string | null = null;
  let manifestSignature: Check = "failed";
  try {
    recoveredSigner = await recoverManifestSigner({
      manifest: bundle.manifest.payload,
      verifyingContract: bundle.manifest.signingDomain
        .verifyingContract as `0x${string}`,
      signature: bundle.manifest.signature as `0x${string}`
    });
    manifestSignature =
      bundle.manifest.signingDomain.name === "GIWA Verified Intent Rail" &&
      bundle.manifest.signingDomain.version === "1" &&
      bundle.manifest.signingDomain.chainId === 91342 &&
      recoveredSigner === bundle.manifest.recoveredSigner
        ? "passed"
        : "failed";
  } catch {
    recoveredSigner = null;
  }

  const checks = {
    manifestHash,
    manifestSignature,
    verifierInputHash,
    decodedLogHash,
    receiptHash,
    crossReferences
  };

  return {
    ok: Object.values(checks).every((result) => result === "passed"),
    checks,
    recoveredSigner
  };
}

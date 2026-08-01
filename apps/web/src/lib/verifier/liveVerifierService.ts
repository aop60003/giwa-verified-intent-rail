import type {
  ActionManifest,
  Address,
  Hex,
  ReceiptPayload,
  VerifierDecision,
  VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";
import { normalizeAddress } from "../../../../../packages/protocol/src/validation.ts";

import type { LiveRunRecord, ReceiptRecord, SubmittedTxRecord } from "../live/liveTypes.ts";
import { buildLiveVerifierInput } from "./liveVerifierInput.ts";
import type { DecodedLogSnapshot } from "./decodeEvidence.ts";
import { decodeDepositReceiptLogs } from "./depositReceiptDecoder.ts";
import { buildLiveReceipt } from "./liveReceiptBuilder.ts";
import { normalizeLiveVerifierPolicy, type LiveVerifierPolicyInput } from "./liveVerifierPolicy.ts";
import { matchLiveDeposit } from "./matchLiveDeposit.ts";
import {
  isStandardRpcReceiptRetryableError,
  snapshotDepositTransaction,
  snapshotTransaction,
  type StandardRpcReceiptClient
} from "./standardRpcReceiptClient.ts";
import { verifyDeploymentManifestSigner } from "./verifyManifestSigner.ts";

export type LiveVerifierServiceInput = {
  run: LiveRunRecord;
  submittedTx: SubmittedTxRecord;
  receiptClient: StandardRpcReceiptClient;
  nowSeconds: () => number;
  verifierVersion?: string;
  minConfirmations?: number;
  trustPolicy?: LiveVerifierPolicyInput;
  manifestSignature?: Hex;
};

export type LiveVerifierServiceResult = {
  decision: VerifierDecision;
  failureReason: string | null;
  verifierInputHash: Hex;
  receiptHash: Hex | null;
  decisionTxHash: null;
  standardRpcReceiptStatus: 1 | 0 | null;
  depositBlockNumber: number | null;
  depositBlockHash: Hex | null;
  confirmationDepth: number;
  receipt?: ReceiptRecord;
  verifierInputRecord?: {
    runId: string;
    verifierInputHash: Hex;
    canonicalPayload: string;
    canonicalPayloadBytesHex: Hex;
    createdAt: string;
  };
  publicEvidenceDraft?: LiveVerifierPublicEvidenceDraft;
};

export type LiveVerifierPublicEvidenceDraft = {
  manifest: {
    payload: ActionManifest;
    signature: Hex;
    verifyingContract: Address;
    recoveredSigner: Address;
  };
  verifierInput: {
    payload: VerifierInputPayload;
    canonicalPayload: string;
    canonicalPayloadBytesHex: Hex;
    verifierInputHash: Hex;
    verifierVersion: string;
  };
  verification: {
    depositBlockNumber: number;
    depositBlockHash: Hex;
    headBlockNumberAtVerification: number;
    confirmationDepth: number;
    standardRpcReceiptStatus: 1;
  };
  decodedLogs: DecodedLogSnapshot[];
  receipt: {
    record: ReceiptRecord;
    payload: ReceiptPayload;
    schemaVersion: "1";
    verifierVersion: string;
  };
};

const DEFAULT_VERIFIER_VERSION = "live-sprint-11";
const ZERO_HASH = `0x${"0".repeat(64)}` as Hex;

export async function verifyLiveRun(input: LiveVerifierServiceInput): Promise<LiveVerifierServiceResult> {
  const verifierVersion = input.verifierVersion ?? DEFAULT_VERIFIER_VERSION;
  const policy = input.trustPolicy === undefined ? undefined : normalizeLiveVerifierPolicy(input.trustPolicy);
  let depositSnapshot;
  let approveSnapshot;
  try {
    depositSnapshot = await snapshotDepositTransaction(input.receiptClient, input.submittedTx.depositTxHash as Hex);
    approveSnapshot =
      input.submittedTx.approveTxHash === null
        ? null
        : await snapshotTransaction(input.receiptClient, input.submittedTx.approveTxHash as Hex);
  } catch (error) {
    if (!isStandardRpcReceiptRetryableError(error)) throw error;
    return {
      decision: "timeout",
      failureReason: "UNDER_CONFIRMED",
      verifierInputHash: ZERO_HASH,
      receiptHash: null,
      decisionTxHash: null,
      standardRpcReceiptStatus: null,
      depositBlockNumber: null,
      depositBlockHash: null,
      confirmationDepth: 0
    };
  }
  const decodedLogSnapshots = decodeDepositReceiptLogs([
    ...(approveSnapshot?.receipt.logs ?? []),
    ...depositSnapshot.receipt.logs
  ]);
  let verifierInput;
  try {
    verifierInput = buildLiveVerifierInput({
      run: input.run,
      submittedTx: input.submittedTx,
      depositTransactionSnapshot: depositSnapshot.transaction,
      depositReceiptSnapshot: depositSnapshot.receipt,
      decodedLogSnapshots,
      confirmationDepth: depositSnapshot.confirmationDepth,
      headBlockNumberAtVerification: depositSnapshot.headBlockNumber,
      verifierVersion
    });
  } catch (error) {
    if (error instanceof Error && error.message === "intentHash does not match manifest") {
      return {
        decision: "mismatched",
        failureReason: "INTENT_HASH_MISMATCH",
        verifierInputHash: ZERO_HASH,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: depositSnapshot.receipt.status === "success" ? (1 as const) : (0 as const),
        depositBlockNumber: depositSnapshot.receipt.blockNumber,
        depositBlockHash: depositSnapshot.receipt.blockHash,
        confirmationDepth: depositSnapshot.confirmationDepth
      };
    }
    throw error;
  }
  let verifiedManifest:
    | {
        signature: Hex;
        verifyingContract: Address;
        recoveredSigner: Address;
      }
    | undefined;
  if (policy !== undefined) {
    const manifestSignature = input.manifestSignature ?? (input.run.manifestSignature as Hex);
    const signer = await verifyDeploymentManifestSigner({
      manifest: verifierInput.manifest,
      verifyingContract: policy.intentRailAddress,
      signature: manifestSignature,
      officialCampaignSigner: policy.officialCampaignSigner
    });
    if (!signer.ok) {
      return {
        decision: "mismatched",
        failureReason: "SIGNER_MISMATCH",
        verifierInputHash: verifierInput.verifierInputHash,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: depositSnapshot.receipt.status === "success" ? (1 as const) : (0 as const),
        depositBlockNumber: depositSnapshot.receipt.blockNumber,
        depositBlockHash: depositSnapshot.receipt.blockHash,
        confirmationDepth: depositSnapshot.confirmationDepth,
        verifierInputRecord: {
          runId: input.run.runId,
          verifierInputHash: verifierInput.verifierInputHash,
          canonicalPayload: verifierInput.canonicalPayload,
          canonicalPayloadBytesHex: verifierInput.canonicalPayloadBytesHex,
          createdAt: new Date(input.nowSeconds() * 1000).toISOString()
        }
      };
    }
    if (signer.recoveredSigner === undefined) {
      return {
        decision: "mismatched",
        failureReason: "SIGNER_MISMATCH",
        verifierInputHash: verifierInput.verifierInputHash,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: depositSnapshot.receipt.status === "success" ? (1 as const) : (0 as const),
        depositBlockNumber: depositSnapshot.receipt.blockNumber,
        depositBlockHash: depositSnapshot.receipt.blockHash,
        confirmationDepth: depositSnapshot.confirmationDepth
      };
    }
    verifiedManifest = {
      signature: manifestSignature.toLowerCase() as Hex,
      verifyingContract: policy.intentRailAddress,
      recoveredSigner: signer.recoveredSigner
    };
    if (normalizeAddress(verifierInput.manifest.target, "target") !== policy.mockVaultAddress) {
      return {
        decision: "mismatched",
        failureReason: "TARGET_MISMATCH",
        verifierInputHash: verifierInput.verifierInputHash,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: depositSnapshot.receipt.status === "success" ? (1 as const) : (0 as const),
        depositBlockNumber: depositSnapshot.receipt.blockNumber,
        depositBlockHash: depositSnapshot.receipt.blockHash,
        confirmationDepth: depositSnapshot.confirmationDepth
      };
    }
    if (normalizeAddress(verifierInput.manifest.asset, "asset") !== policy.mockTokenAddress) {
      return {
        decision: "mismatched",
        failureReason: "ASSET_MISMATCH",
        verifierInputHash: verifierInput.verifierInputHash,
        receiptHash: null,
        decisionTxHash: null,
        standardRpcReceiptStatus: depositSnapshot.receipt.status === "success" ? (1 as const) : (0 as const),
        depositBlockNumber: depositSnapshot.receipt.blockNumber,
        depositBlockHash: depositSnapshot.receipt.blockHash,
        confirmationDepth: depositSnapshot.confirmationDepth
      };
    }
  }
  const matchInput = {
    manifest: verifierInput.manifest,
    submittedTx: input.submittedTx,
    transaction: depositSnapshot.transaction,
    receipt: depositSnapshot.receipt,
    decodedLogSnapshots,
    confirmationDepth: depositSnapshot.confirmationDepth,
    depositBlockTimestamp: depositSnapshot.depositBlock.timestamp
  };
  const minConfirmations = policy?.minConfirmations ?? input.minConfirmations;
  const matched = matchLiveDeposit({
    ...matchInput,
    ...(minConfirmations === undefined ? {} : { minConfirmations }),
    ...(policy?.amountPolicy === undefined ? {} : { amountPolicy: policy.amountPolicy }),
    ...(policy?.allowancePolicy === undefined ? {} : { allowancePolicy: policy.allowancePolicy })
  });
  const common = {
    decision: matched.decision,
    failureReason: matched.failureReason,
    verifierInputHash: verifierInput.verifierInputHash,
    receiptHash: null,
    decisionTxHash: null,
    standardRpcReceiptStatus: depositSnapshot.receipt.status === "success" ? (1 as const) : (0 as const),
    depositBlockNumber: depositSnapshot.receipt.blockNumber,
    depositBlockHash: depositSnapshot.receipt.blockHash,
    confirmationDepth: depositSnapshot.confirmationDepth,
    verifierInputRecord: {
      runId: input.run.runId,
      verifierInputHash: verifierInput.verifierInputHash,
      canonicalPayload: verifierInput.canonicalPayload,
      canonicalPayloadBytesHex: verifierInput.canonicalPayloadBytesHex,
      createdAt: new Date(input.nowSeconds() * 1000).toISOString()
    }
  };

  if (matched.decision !== "matched" || matched.receiptCandidate === undefined) {
    return common;
  }

  const receipt = buildLiveReceipt({
    manifest: verifierInput.manifest,
    submittedTx: input.submittedTx,
    depositBlockNumber: matched.receiptCandidate.depositBlockNumber,
    depositBlockHash: matched.receiptCandidate.depositBlockHash,
    issuedAt: input.nowSeconds(),
    verifierVersion
  });
  const receiptRecord: ReceiptRecord = {
    receiptHash: receipt.receiptHash,
    intentHash: input.run.intentHash,
    payloadJson: receipt.payloadJson,
    canonicalPayload: receipt.canonicalPayload,
    canonicalPayloadBytesHex: receipt.canonicalPayloadBytesHex
  };

  return {
    ...common,
    receiptHash: receipt.receiptHash,
    receipt: receiptRecord,
    ...(verifiedManifest === undefined
      ? {}
      : {
          publicEvidenceDraft: {
            manifest: {
              payload: verifierInput.manifest,
              signature: verifiedManifest.signature,
              verifyingContract: verifiedManifest.verifyingContract,
              recoveredSigner: verifiedManifest.recoveredSigner
            },
            verifierInput: {
              payload: verifierInput.payload,
              canonicalPayload: verifierInput.canonicalPayload,
              canonicalPayloadBytesHex: verifierInput.canonicalPayloadBytesHex,
              verifierInputHash: verifierInput.verifierInputHash,
              verifierVersion
            },
            verification: {
              depositBlockNumber: matched.receiptCandidate.depositBlockNumber,
              depositBlockHash: matched.receiptCandidate.depositBlockHash,
              headBlockNumberAtVerification: depositSnapshot.headBlockNumber,
              confirmationDepth: depositSnapshot.confirmationDepth,
              standardRpcReceiptStatus: 1 as const
            },
            decodedLogs: decodedLogSnapshots,
            receipt: {
              record: receiptRecord,
              payload: receipt.payload,
              schemaVersion: receipt.payload.schemaVersion,
              verifierVersion
            }
          }
        })
  };
}

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
  normalizeManifest,
  normalizeReceiptPayload,
  normalizeVerifierInputPayload,
  recoverManifestSigner,
  type Address,
  type Hex
} from "../../../../../packages/protocol/src/index.ts";
import { decodeDepositReceiptLogs } from "../verifier/depositReceiptDecoder.ts";
import { buildLiveVerifierInput } from "../verifier/liveVerifierInput.ts";
import {
  snapshotDepositTransaction,
  snapshotTransaction,
  type StandardRpcReceiptClient,
  type StandardRpcTransactionBundle
} from "../verifier/standardRpcReceiptClient.ts";
import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";
import type { LiveStore } from "./liveStore.ts";
import type {
  DecisionRecord,
  LiveRunRecord,
  PublicEvidenceRecord,
  ReceiptRecord,
  SubmittedTxRecord,
  VerifierInputRecord
} from "./liveTypes.ts";
import {
  PUBLIC_VERIFICATION_NOTICE,
  PUBLIC_VERIFICATION_REPLAY_COMMAND,
  normalizePublicVerificationBundle
} from "./publicVerificationBundle.ts";
import { replayPublicVerificationBundle } from "./publicVerificationReplay.ts";

export type PublicEvidenceBackfillCounts = {
  candidates: number;
  saved: number;
  alreadyPresent: number;
  skippedIntegrityMismatch: number;
  failedBoundedError: number;
};

export type PublicEvidenceBackfillInput = {
  store: LiveStore;
  receiptClient: StandardRpcReceiptClient;
  verifyingContract: Address;
  now: () => string;
};

type LegacyCandidate = {
  run: LiveRunRecord;
  submittedTx: SubmittedTxRecord;
  decision: DecisionRecord;
  receipt: ReceiptRecord;
  verifierInput: VerifierInputRecord;
};

function sameHash(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function exactCandidate(
  store: LiveStore,
  run: LiveRunRecord
): LegacyCandidate | undefined {
  const submittedTx = store.getSubmittedTx(run.runId);
  const decision = store.getDecisionByIntentHash(run.intentHash);
  if (
    submittedTx === undefined ||
    decision?.decision !== "matched" ||
    decision.receiptHash === null
  ) {
    return undefined;
  }
  const receipt = store.getReceipt(decision.receiptHash);
  const verifierInput = store.getVerifierInput(decision.verifierInputHash);
  if (receipt === undefined || verifierInput === undefined) return undefined;
  return { run, submittedTx, decision, receipt, verifierInput };
}

function hasPublicEvidence(
  store: LiveStore,
  candidate: LegacyCandidate
): boolean {
  return (
    store.getPublicEvidenceByReceiptHash(candidate.receipt.receiptHash) !==
      undefined ||
    store.getPublicEvidenceByIntentHash(candidate.run.intentHash) !==
      undefined ||
    store.getPublicEvidenceByDepositTxHash(
      candidate.submittedTx.depositTxHash
    ) !== undefined
  );
}

function snapshotsMatchPersistedIdentity(input: {
  candidate: LegacyCandidate;
  deposit: StandardRpcTransactionBundle;
  approval: StandardRpcTransactionBundle | null;
}): boolean {
  const { candidate, deposit, approval } = input;
  const { run, submittedTx, decision } = candidate;
  return (
    sameHash(run.intentHash, decision.intentHash) &&
    sameHash(submittedTx.depositTxHash, decision.depositTxHash) &&
    sameHash(deposit.depositTxHash, submittedTx.depositTxHash) &&
    sameHash(deposit.transaction.hash, submittedTx.depositTxHash) &&
    deposit.receipt.status === "success" &&
    decision.standardRpcReceiptStatus === 1 &&
    decision.depositBlockNumber === deposit.receipt.blockNumber &&
    decision.depositBlockHash !== null &&
    decision.depositBlockHash !== undefined &&
    sameHash(decision.depositBlockHash, deposit.receipt.blockHash) &&
    (submittedTx.approveTxHash === null
      ? approval === null
      : approval !== null &&
        sameHash(approval.depositTxHash, submittedTx.approveTxHash) &&
        sameHash(approval.transaction.hash, submittedTx.approveTxHash) &&
        approval.receipt.status === "success")
  );
}

async function buildPublicEvidenceRecord(input: {
  candidate: LegacyCandidate;
  deposit: StandardRpcTransactionBundle;
  approval: StandardRpcTransactionBundle | null;
  verifyingContract: Address;
  generatedAt: string;
}): Promise<PublicEvidenceRecord | undefined> {
  const { candidate, deposit, approval } = input;
  if (!snapshotsMatchPersistedIdentity({ candidate, deposit, approval })) {
    return undefined;
  }

  const gate = evaluateCommercialReceiptGate({
    run: candidate.run,
    decision: candidate.decision,
    receipt: candidate.receipt,
    verifierInput: candidate.verifierInput,
    replay: { requireHashRecomputation: true }
  });
  if (!gate.open) return undefined;

  const manifest = normalizeManifest(JSON.parse(candidate.run.manifestJson));
  const receiptPayload = normalizeReceiptPayload(
    JSON.parse(candidate.receipt.payloadJson)
  );
  const persistedVerifierPayload = normalizeVerifierInputPayload(
    JSON.parse(candidate.verifierInput.canonicalPayload)
  );
  const decodedLogs = decodeDepositReceiptLogs([
    ...(approval?.receipt.logs ?? []),
    ...deposit.receipt.logs
  ]);
  const rebuiltVerifier = buildLiveVerifierInput({
    run: candidate.run,
    submittedTx: candidate.submittedTx,
    depositTransactionSnapshot: deposit.transaction,
    depositReceiptSnapshot: deposit.receipt,
    decodedLogSnapshots: decodedLogs,
    confirmationDepth: persistedVerifierPayload.confirmationDepth,
    headBlockNumberAtVerification:
      persistedVerifierPayload.headBlockNumberAtVerification,
    verifierVersion: persistedVerifierPayload.verifierVersion
  });

  const receiptCanonical = canonicalReceiptPayload(receiptPayload);
  const receiptCanonicalBytes = canonicalReceiptPayloadBytesHex(receiptPayload);
  const verifierCanonical = canonicalVerifierInputPayload(
    persistedVerifierPayload
  );
  const verifierCanonicalBytes = canonicalVerifierInputPayloadBytesHex(
    persistedVerifierPayload
  );
  const historicalSnapshotAgrees =
    persistedVerifierPayload.headBlockNumberAtVerification ===
      deposit.receipt.blockNumber +
        persistedVerifierPayload.confirmationDepth -
        1 &&
    candidate.decision.confirmationDepth ===
      persistedVerifierPayload.confirmationDepth &&
    candidate.decision.depositBlockNumber ===
      receiptPayload.depositBlockNumber &&
    sameHash(
      candidate.decision.depositBlockHash!,
      receiptPayload.depositBlockHash
    ) &&
    sameHash(candidate.run.intentHash, computeIntentHash(manifest)) &&
    sameHash(candidate.run.intentHash, persistedVerifierPayload.intentHash) &&
    sameHash(candidate.run.intentHash, receiptPayload.intentHash) &&
    sameHash(
      candidate.submittedTx.depositTxHash,
      persistedVerifierPayload.depositTxHash
    ) &&
    sameHash(
      candidate.submittedTx.depositTxHash,
      receiptPayload.depositTxHash
    ) &&
    (candidate.submittedTx.approveTxHash?.toLowerCase() ?? null) ===
      receiptPayload.approveTxHash &&
    candidate.run.campaignId === receiptPayload.campaignId &&
    candidate.run.missionId === receiptPayload.missionId &&
    candidate.run.wallet.toLowerCase() === receiptPayload.wallet;
  const verifierRecordAgrees =
    rebuiltVerifier.canonicalPayload === candidate.verifierInput.canonicalPayload &&
    rebuiltVerifier.canonicalPayloadBytesHex ===
      candidate.verifierInput.canonicalPayloadBytesHex.toLowerCase() &&
    sameHash(
      rebuiltVerifier.verifierInputHash,
      candidate.verifierInput.verifierInputHash
    ) &&
    verifierCanonical === candidate.verifierInput.canonicalPayload &&
    verifierCanonicalBytes ===
      candidate.verifierInput.canonicalPayloadBytesHex.toLowerCase() &&
    sameHash(
      computeVerifierInputHash(persistedVerifierPayload),
      candidate.verifierInput.verifierInputHash
    );
  const receiptRecordAgrees =
    receiptCanonical === candidate.receipt.canonicalPayload &&
    receiptCanonicalBytes ===
      candidate.receipt.canonicalPayloadBytesHex.toLowerCase() &&
    sameHash(
      computeReceiptHash(receiptPayload),
      candidate.receipt.receiptHash
    ) &&
    sameHash(candidate.receipt.receiptHash, candidate.decision.receiptHash!);
  if (
    !historicalSnapshotAgrees ||
    !verifierRecordAgrees ||
    !receiptRecordAgrees
  ) {
    return undefined;
  }

  const recoveredSigner = await recoverManifestSigner({
    manifest,
    verifyingContract: input.verifyingContract,
    signature: candidate.run.manifestSignature as Hex
  });
  const bundle = normalizePublicVerificationBundle({
    schemaVersion: "1",
    source: "live",
    generatedAt: input.generatedAt,
    identity: {
      receiptHash: candidate.receipt.receiptHash,
      intentHash: candidate.run.intentHash,
      depositTxHash: candidate.submittedTx.depositTxHash
    },
    manifest: {
      payload: manifest,
      canonicalPayload: canonicalManifestPayload(manifest),
      canonicalPayloadBytesHex: canonicalManifestPayloadBytesHex(manifest),
      signature: candidate.run.manifestSignature,
      signingDomain: {
        name: "GIWA Verified Intent Rail",
        version: "1",
        chainId: 91342,
        verifyingContract: input.verifyingContract
      },
      recoveredSigner
    },
    verifierInput: {
      payload: persistedVerifierPayload,
      canonicalPayload: candidate.verifierInput.canonicalPayload,
      canonicalPayloadBytesHex:
        candidate.verifierInput.canonicalPayloadBytesHex,
      verifierInputHash: candidate.verifierInput.verifierInputHash,
      verifierVersion: persistedVerifierPayload.verifierVersion
    },
    verification: {
      depositBlockNumber: candidate.decision.depositBlockNumber,
      depositBlockHash: candidate.decision.depositBlockHash,
      headBlockNumberAtVerification:
        persistedVerifierPayload.headBlockNumberAtVerification,
      confirmationDepth: persistedVerifierPayload.confirmationDepth,
      standardRpcReceiptStatus: 1
    },
    decodedLogs,
    receipt: {
      payload: receiptPayload,
      canonicalPayload: candidate.receipt.canonicalPayload,
      canonicalPayloadBytesHex: candidate.receipt.canonicalPayloadBytesHex,
      receiptHash: candidate.receipt.receiptHash,
      schemaVersion: receiptPayload.schemaVersion,
      verifierVersion: receiptPayload.verifierVersion
    },
    replay: {
      algorithm: "keccak256-canonical-json+eip712",
      command: PUBLIC_VERIFICATION_REPLAY_COMMAND
    },
    notice: PUBLIC_VERIFICATION_NOTICE
  });
  const replay = await replayPublicVerificationBundle(bundle);
  if (!replay.ok) return undefined;

  return {
    receiptHash: bundle.identity.receiptHash,
    intentHash: bundle.identity.intentHash,
    depositTxHash: bundle.identity.depositTxHash,
    bundleJson: JSON.stringify(bundle),
    createdAt: bundle.generatedAt
  };
}

export async function backfillPublicEvidence(
  input: PublicEvidenceBackfillInput
): Promise<PublicEvidenceBackfillCounts> {
  const counts: PublicEvidenceBackfillCounts = {
    candidates: 0,
    saved: 0,
    alreadyPresent: 0,
    skippedIntegrityMismatch: 0,
    failedBoundedError: 0
  };

  for (const run of input.store.listRuns()) {
    if (run.status !== "matched") continue;
    const candidate = exactCandidate(input.store, run);
    if (candidate === undefined) continue;
    counts.candidates += 1;
    if (hasPublicEvidence(input.store, candidate)) {
      counts.alreadyPresent += 1;
      continue;
    }

    let deposit: StandardRpcTransactionBundle;
    let approval: StandardRpcTransactionBundle | null;
    try {
      [deposit, approval] = await Promise.all([
        snapshotDepositTransaction(
          input.receiptClient,
          candidate.submittedTx.depositTxHash as Hex
        ),
        candidate.submittedTx.approveTxHash === null
          ? Promise.resolve(null)
          : snapshotTransaction(
              input.receiptClient,
              candidate.submittedTx.approveTxHash as Hex
            )
      ]);
    } catch {
      counts.failedBoundedError += 1;
      continue;
    }

    let publicEvidence: PublicEvidenceRecord | undefined;
    try {
      publicEvidence = await buildPublicEvidenceRecord({
        candidate,
        deposit,
        approval,
        verifyingContract: input.verifyingContract,
        generatedAt: input.now()
      });
    } catch {
      publicEvidence = undefined;
    }
    if (publicEvidence === undefined) {
      counts.skippedIntegrityMismatch += 1;
      continue;
    }

    try {
      input.store.publishMatchedEvidence({
        runId: candidate.run.runId,
        updatedAt: candidate.run.updatedAt,
        verifierInput: candidate.verifierInput,
        receipt: candidate.receipt,
        decision: candidate.decision,
        publicEvidence
      });
      counts.saved += 1;
    } catch {
      counts.failedBoundedError += 1;
    }
  }

  return counts;
}

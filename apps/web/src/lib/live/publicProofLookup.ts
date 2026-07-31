import { canonicalManifestPayload } from "../../../../../packages/protocol/src/index.ts";
import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";
import type { LiveStore } from "./liveStore.ts";
import {
  normalizePublicVerificationBundle,
  type PublicVerificationBundleV1
} from "./publicVerificationBundle.ts";
import { replayPublicVerificationBundle } from "./publicVerificationReplay.ts";

export type PublicMatchedProof = {
  screenKind: "public-matched-proof";
  source: "live";
  queryKind: "receipt" | "intent" | "depositTx";
  campaignId: string;
  missionId: string;
  policyVersion: null;
  policyStatus: "fixed-unversioned";
  networkName: "GIWA Sepolia";
  walletLabel: string;
  receiptHash: string;
  intentHash: string;
  depositTxHash: string;
  verifierInputHash: string;
  blockNumber: number;
  blockHash: string;
  confirmationDepth: number;
  receiptPath: string;
  participantReceiptPath: string;
  explorerUrl: string;
  testnetNotice: "GIWA Sepolia testnet · Mock assets only";
  bundle: PublicVerificationBundleV1;
};

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/u;

function sameHash(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function walletLabel(wallet: string): string {
  const normalized = wallet.toLowerCase();
  return `${normalized.slice(0, 8)}…${normalized.slice(-4)}`;
}

function storedEvidenceForQuery(
  store: LiveStore,
  queryHash: string
):
  | {
      queryKind: PublicMatchedProof["queryKind"];
      bundleJson: string;
      receiptHash: string;
      intentHash: string;
      depositTxHash: string;
    }
  | undefined {
  const byReceipt = store.getPublicEvidenceByReceiptHash(queryHash);
  if (byReceipt !== undefined) {
    return { queryKind: "receipt", ...byReceipt };
  }
  const byIntent = store.getPublicEvidenceByIntentHash(queryHash);
  if (byIntent !== undefined) {
    return { queryKind: "intent", ...byIntent };
  }
  const byDeposit = store.getPublicEvidenceByDepositTxHash(queryHash);
  if (byDeposit !== undefined) {
    return { queryKind: "depositTx", ...byDeposit };
  }
  return undefined;
}

function recordsAgree(input: {
  store: LiveStore;
  bundle: PublicVerificationBundleV1;
  evidence: {
    receiptHash: string;
    intentHash: string;
    depositTxHash: string;
  };
}): boolean {
  const { store, bundle, evidence } = input;
  const run = store
    .listRuns()
    .find((candidate) => sameHash(candidate.intentHash, bundle.identity.intentHash));
  if (run === undefined) return false;
  const submittedTx = store.getSubmittedTx(run.runId);
  const decision = store.getDecisionByIntentHash(run.intentHash);
  const receipt =
    decision?.receiptHash === null || decision?.receiptHash === undefined
      ? undefined
      : store.getReceipt(decision.receiptHash);
  const verifierInput =
    decision === undefined
      ? undefined
      : store.getVerifierInput(decision.verifierInputHash);
  const gate = evaluateCommercialReceiptGate({
    run,
    decision,
    receipt,
    verifierInput,
    replay: { requireHashRecomputation: true }
  });
  if (
    !gate.open ||
    submittedTx === undefined ||
    decision === undefined ||
    receipt === undefined ||
    verifierInput === undefined
  ) {
    return false;
  }

  const identityAgrees =
    sameHash(evidence.receiptHash, bundle.identity.receiptHash) &&
    sameHash(evidence.intentHash, bundle.identity.intentHash) &&
    sameHash(evidence.depositTxHash, bundle.identity.depositTxHash) &&
    sameHash(run.intentHash, bundle.identity.intentHash) &&
    sameHash(submittedTx.depositTxHash, bundle.identity.depositTxHash) &&
    sameHash(decision.intentHash, bundle.identity.intentHash) &&
    sameHash(decision.depositTxHash, bundle.identity.depositTxHash) &&
    sameHash(receipt.receiptHash, bundle.identity.receiptHash) &&
    sameHash(receipt.intentHash, bundle.identity.intentHash) &&
    sameHash(verifierInput.verifierInputHash, bundle.verifierInput.verifierInputHash) &&
    sameHash(bundle.receipt.receiptHash, bundle.identity.receiptHash) &&
    sameHash(bundle.receipt.payload.intentHash, bundle.identity.intentHash) &&
    sameHash(bundle.receipt.payload.depositTxHash, bundle.identity.depositTxHash) &&
    sameHash(bundle.verifierInput.payload.intentHash, bundle.identity.intentHash) &&
    sameHash(bundle.verifierInput.payload.depositTxHash, bundle.identity.depositTxHash);

  const persistedPayloadsAgree =
    canonicalManifestPayload(JSON.parse(run.manifestJson)) ===
      bundle.manifest.canonicalPayload &&
    run.manifestSignature.toLowerCase() === bundle.manifest.signature &&
    receipt.canonicalPayload === bundle.receipt.canonicalPayload &&
    receipt.canonicalPayloadBytesHex.toLowerCase() ===
      bundle.receipt.canonicalPayloadBytesHex &&
    verifierInput.canonicalPayload === bundle.verifierInput.canonicalPayload &&
    verifierInput.canonicalPayloadBytesHex.toLowerCase() ===
      bundle.verifierInput.canonicalPayloadBytesHex &&
    verifierInput.runId === run.runId;

  const summaryAgrees =
    run.campaignId === bundle.receipt.payload.campaignId &&
    run.missionId === bundle.receipt.payload.missionId &&
    run.wallet.toLowerCase() === bundle.receipt.payload.wallet &&
    bundle.manifest.payload.campaignId === bundle.receipt.payload.campaignId &&
    bundle.manifest.payload.missionId === bundle.receipt.payload.missionId &&
    bundle.manifest.payload.wallet === bundle.receipt.payload.wallet &&
    (submittedTx.approveTxHash?.toLowerCase() ?? null) ===
      bundle.receipt.payload.approveTxHash &&
    decision.standardRpcReceiptStatus ===
      bundle.verification.standardRpcReceiptStatus &&
    decision.depositBlockNumber === bundle.verification.depositBlockNumber &&
    decision.depositBlockHash?.toLowerCase() ===
      bundle.verification.depositBlockHash &&
    decision.confirmationDepth === bundle.verification.confirmationDepth;

  return identityAgrees && persistedPayloadsAgree && summaryAgrees;
}

export async function lookupPublicMatchedProof(input: {
  store: LiveStore;
  queryHash: string;
}): Promise<PublicMatchedProof | null> {
  if (!HASH_PATTERN.test(input.queryHash)) return null;
  const queryHash = input.queryHash.toLowerCase();

  try {
    const evidence = storedEvidenceForQuery(input.store, queryHash);
    if (evidence === undefined) return null;
    const expectedQueryHash =
      evidence.queryKind === "receipt"
        ? evidence.receiptHash
        : evidence.queryKind === "intent"
          ? evidence.intentHash
          : evidence.depositTxHash;
    if (!sameHash(expectedQueryHash, queryHash)) return null;

    const bundle = normalizePublicVerificationBundle(
      JSON.parse(evidence.bundleJson)
    );
    if (!recordsAgree({ store: input.store, bundle, evidence })) return null;
    const replay = await replayPublicVerificationBundle(bundle);
    if (!replay.ok) return null;

    const receiptHash = bundle.identity.receiptHash;
    const intentHash = bundle.identity.intentHash;
    const depositTxHash = bundle.identity.depositTxHash;
    return {
      screenKind: "public-matched-proof",
      source: "live",
      queryKind: evidence.queryKind,
      campaignId: bundle.receipt.payload.campaignId,
      missionId: bundle.receipt.payload.missionId,
      policyVersion: null,
      policyStatus: "fixed-unversioned",
      networkName: bundle.receipt.payload.networkName,
      walletLabel: walletLabel(bundle.receipt.payload.wallet),
      receiptHash,
      intentHash,
      depositTxHash,
      verifierInputHash: bundle.verifierInput.verifierInputHash,
      blockNumber: bundle.verification.depositBlockNumber,
      blockHash: bundle.verification.depositBlockHash,
      confirmationDepth: bundle.verification.confirmationDepth,
      receiptPath: `/receipt/${receiptHash}`,
      participantReceiptPath: `/user/receipt/${receiptHash}`,
      explorerUrl: `https://sepolia-explorer.giwa.io/tx/${depositTxHash}`,
      testnetNotice: "GIWA Sepolia testnet · Mock assets only",
      bundle
    };
  } catch {
    return null;
  }
}

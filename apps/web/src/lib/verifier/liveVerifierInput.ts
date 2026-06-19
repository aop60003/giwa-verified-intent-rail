import {
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  computeVerifierInputHash,
  computeIntentHash,
  GIWA_SEPOLIA_CHAIN_ID,
  normalizeManifest,
  VERIFIER_SCHEMA_VERSION,
  type ActionManifest,
  type Hex,
  type VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";

import type { LiveRunRecord, SubmittedTxRecord } from "../live/liveTypes.ts";
import { hashEvidenceJson, type DecodedLogSnapshot } from "./decodeEvidence.ts";

export type LiveVerifierInputSnapshot = {
  run: Pick<LiveRunRecord, "intentHash" | "manifestJson">;
  submittedTx: SubmittedTxRecord;
  depositTransactionSnapshot: Record<string, unknown>;
  depositReceiptSnapshot: Record<string, unknown>;
  decodedLogSnapshots: readonly DecodedLogSnapshot[];
  confirmationDepth: number;
  headBlockNumberAtVerification: number;
  verifierVersion: string;
};

export type BuiltLiveVerifierInput = {
  manifest: ActionManifest;
  payload: VerifierInputPayload;
  canonicalPayload: string;
  canonicalPayloadBytesHex: Hex;
  verifierInputHash: Hex;
};

function parseManifest(manifestJson: string): ActionManifest {
  const parsed = JSON.parse(manifestJson) as ActionManifest;
  return normalizeManifest(parsed);
}

export function buildLiveVerifierInput(input: LiveVerifierInputSnapshot): BuiltLiveVerifierInput {
  const manifest = parseManifest(input.run.manifestJson);
  const recomputedIntentHash = computeIntentHash(manifest);
  if (recomputedIntentHash !== input.run.intentHash.toLowerCase()) {
    throw new Error("intentHash does not match manifest");
  }
  const payload: VerifierInputPayload = {
    schemaVersion: VERIFIER_SCHEMA_VERSION,
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    intentHash: recomputedIntentHash,
    depositTxHash: input.submittedTx.depositTxHash as Hex,
    depositTransactionSnapshotHash: hashEvidenceJson(input.depositTransactionSnapshot),
    depositReceiptSnapshotHash: hashEvidenceJson(input.depositReceiptSnapshot),
    decodedLogSnapshotHash: hashEvidenceJson(input.decodedLogSnapshots),
    confirmationDepth: input.confirmationDepth,
    headBlockNumberAtVerification: input.headBlockNumberAtVerification,
    verifierVersion: input.verifierVersion
  };

  return {
    manifest,
    payload,
    canonicalPayload: canonicalVerifierInputPayload(payload),
    canonicalPayloadBytesHex: canonicalVerifierInputPayloadBytesHex(payload),
    verifierInputHash: computeVerifierInputHash(payload)
  };
}

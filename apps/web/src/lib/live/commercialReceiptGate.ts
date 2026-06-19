import { canonicalPayloadBytesHex, hashCanonicalPayload } from "../../../../../packages/protocol/src/index.ts";
import type { DecisionRecord, LiveRunRecord, ReceiptRecord, VerifierInputRecord } from "./liveTypes.ts";

export type CommercialReceiptGateReason =
  | "run_missing"
  | "decision_missing"
  | "receipt_missing"
  | "run_not_matched"
  | "decision_not_matched"
  | "decision_failure_reason_present"
  | "decision_receipt_missing"
  | "receipt_hash_mismatch"
  | "intent_hash_mismatch"
  | "receipt_payload_invalid"
  | "receipt_hash_recompute_mismatch"
  | "receipt_payload_bytes_mismatch"
  | "verifier_input_missing"
  | "verifier_input_hash_mismatch"
  | "verifier_input_bytes_mismatch";

export type CommercialReceiptGateInput = {
  run: LiveRunRecord | undefined;
  decision: DecisionRecord | undefined;
  receipt: ReceiptRecord | undefined;
  verifierInput?: VerifierInputRecord | undefined;
  replay?: {
    requireHashRecomputation: boolean;
  };
};

export type CommercialReceiptGateResult =
  | { open: true; reason: null }
  | { open: false; reason: CommercialReceiptGateReason };

function hasJsonObjectPayload(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function sameLowercase(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function evaluateReplayGate(input: CommercialReceiptGateInput): CommercialReceiptGateResult {
  if (input.replay?.requireHashRecomputation !== true) return { open: true, reason: null };
  if (input.run === undefined || input.decision === undefined || input.receipt === undefined) {
    return { open: false, reason: "receipt_payload_invalid" };
  }
  if (input.verifierInput === undefined) return { open: false, reason: "verifier_input_missing" };
  if (input.verifierInput.runId !== input.run.runId) return { open: false, reason: "verifier_input_hash_mismatch" };
  if (!sameLowercase(input.verifierInput.verifierInputHash, input.decision.verifierInputHash)) {
    return { open: false, reason: "verifier_input_hash_mismatch" };
  }
  if (!sameLowercase(hashCanonicalPayload(input.receipt.canonicalPayload), input.receipt.receiptHash)) {
    return { open: false, reason: "receipt_hash_recompute_mismatch" };
  }
  if (!sameLowercase(canonicalPayloadBytesHex(input.receipt.canonicalPayload), input.receipt.canonicalPayloadBytesHex)) {
    return { open: false, reason: "receipt_payload_bytes_mismatch" };
  }
  if (!sameLowercase(hashCanonicalPayload(input.verifierInput.canonicalPayload), input.verifierInput.verifierInputHash)) {
    return { open: false, reason: "verifier_input_hash_mismatch" };
  }
  if (
    !sameLowercase(
      canonicalPayloadBytesHex(input.verifierInput.canonicalPayload),
      input.verifierInput.canonicalPayloadBytesHex
    )
  ) {
    return { open: false, reason: "verifier_input_bytes_mismatch" };
  }

  return { open: true, reason: null };
}

export function evaluateCommercialReceiptGate(input: CommercialReceiptGateInput): CommercialReceiptGateResult {
  if (input.run === undefined) return { open: false, reason: "run_missing" };
  if (input.decision === undefined) return { open: false, reason: "decision_missing" };
  if (input.receipt === undefined) return { open: false, reason: "receipt_missing" };
  if (input.run.status !== "matched") return { open: false, reason: "run_not_matched" };
  if (input.decision.decision !== "matched") return { open: false, reason: "decision_not_matched" };
  if (input.decision.failureReason !== null) return { open: false, reason: "decision_failure_reason_present" };
  if (input.decision.receiptHash === null) return { open: false, reason: "decision_receipt_missing" };
  if (!sameLowercase(input.decision.receiptHash, input.receipt.receiptHash)) {
    return { open: false, reason: "receipt_hash_mismatch" };
  }
  if (!sameLowercase(input.decision.intentHash, input.receipt.intentHash)) {
    return { open: false, reason: "intent_hash_mismatch" };
  }
  if (!sameLowercase(input.run.intentHash, input.receipt.intentHash)) {
    return { open: false, reason: "intent_hash_mismatch" };
  }
  if (!hasJsonObjectPayload(input.receipt.payloadJson)) {
    return { open: false, reason: "receipt_payload_invalid" };
  }
  const replay = evaluateReplayGate(input);
  if (!replay.open) return replay;

  return { open: true, reason: null };
}

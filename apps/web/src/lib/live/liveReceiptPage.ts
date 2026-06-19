import type { CommercialReceiptGateReason } from "./commercialReceiptGate.ts";
import type { LiveRunStatus, ReceiptRecord } from "./liveTypes.ts";

export type ReceiptPageState = "matched" | "unknown" | "pending" | "mismatch" | "integrity_locked";

export type ReceiptDisclosure = {
  id: "manifest" | "verifierInput" | "receiptPayload" | "decodedLogs";
  label: string;
  defaultOpen: boolean;
};

export type ReceiptPrimaryEvidence = {
  receiptHash: string;
  intentHash: string;
  depositTxHash: string | null;
  verifierInputHash: string | null;
  blockNumber: number | string | null;
  blockHash: string | null;
};

export type ReceiptPageLookup =
  | { kind: "not_found" }
  | {
      kind: "matched";
      receipt: ReceiptRecord;
      primaryEvidence: ReceiptPrimaryEvidence;
    }
  | { kind: "pending"; status: LiveRunStatus }
  | { kind: "terminal_unmatched"; status: "mismatched" | "failed"; failureCopy: string }
  | { kind: "integrity_locked"; reason: CommercialReceiptGateReason };

export type ReceiptPageModel = {
  state: ReceiptPageState;
  publicTitle: string;
  showRunDetails: boolean;
  routeHash: string;
  primaryEvidence: ReceiptPrimaryEvidence | null;
  receiptPayload: unknown;
  canonicalPayload: string | null;
  disclosures: ReceiptDisclosure[];
  recovery: {
    title: string;
    detail: string;
  };
};

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/u;

export function receiptGateReasonToPageState(reason: CommercialReceiptGateReason): ReceiptPageState {
  if (
    reason === "receipt_hash_mismatch" ||
    reason === "receipt_hash_recompute_mismatch" ||
    reason === "receipt_payload_bytes_mismatch" ||
    reason === "verifier_input_hash_mismatch" ||
    reason === "verifier_input_bytes_mismatch" ||
    reason === "intent_hash_mismatch"
  ) {
    return "integrity_locked";
  }
  if (reason === "run_not_matched" || reason === "decision_missing" || reason === "receipt_missing") return "pending";
  if (reason === "decision_not_matched" || reason === "decision_failure_reason_present") return "mismatch";
  return "unknown";
}

function parsePayload(receipt: ReceiptRecord): unknown {
  try {
    return JSON.parse(receipt.payloadJson) as unknown;
  } catch {
    return null;
  }
}

function disclosures(): ReceiptDisclosure[] {
  return [
    { id: "manifest", label: "Manifest fields", defaultOpen: false },
    { id: "verifierInput", label: "Verifier input", defaultOpen: false },
    { id: "receiptPayload", label: "Receipt payload", defaultOpen: true },
    { id: "decodedLogs", label: "Decoded logs", defaultOpen: false }
  ];
}

export function buildReceiptPageModel(input: { routeHash: string; lookup: ReceiptPageLookup }): ReceiptPageModel {
  const malformed = !HASH_PATTERN.test(input.routeHash);
  if (malformed || input.lookup.kind === "not_found") {
    return {
      state: "unknown",
      publicTitle: "Receipt not found or not available",
      showRunDetails: false,
      routeHash: input.routeHash,
      primaryEvidence: null,
      receiptPayload: null,
      canonicalPayload: null,
      disclosures: [],
      recovery: {
        title: "Receipt locked",
        detail: "Use the receipt link shown after matched verification."
      }
    };
  }

  if (input.lookup.kind === "matched") {
    return {
      state: "matched",
      publicTitle: "Receipt ready",
      showRunDetails: true,
      routeHash: input.routeHash,
      primaryEvidence: input.lookup.primaryEvidence,
      receiptPayload: parsePayload(input.lookup.receipt),
      canonicalPayload: input.lookup.receipt.canonicalPayload,
      disclosures: disclosures(),
      recovery: {
        title: "Receipt opened",
        detail: "Commercial receipt gate passed for this matched testnet action."
      }
    };
  }

  if (input.lookup.kind === "pending") {
    return {
      state: "pending",
      publicTitle: "Receipt locked",
      showRunDetails: true,
      routeHash: input.routeHash,
      primaryEvidence: null,
      receiptPayload: null,
      canonicalPayload: null,
      disclosures: [],
      recovery: {
        title: "Verification pending",
        detail: `Current run status is ${input.lookup.status}. Receipt opens only after matched verification.`
      }
    };
  }

  if (input.lookup.kind === "terminal_unmatched") {
    return {
      state: "mismatch",
      publicTitle: "Receipt not issued",
      showRunDetails: true,
      routeHash: input.routeHash,
      primaryEvidence: null,
      receiptPayload: null,
      canonicalPayload: null,
      disclosures: [],
      recovery: {
        title: "Verifier did not match",
        detail: input.lookup.failureCopy
      }
    };
  }

  return {
    state: "integrity_locked",
    publicTitle: "Receipt proof could not be verified",
    showRunDetails: false,
    routeHash: input.routeHash,
    primaryEvidence: null,
    receiptPayload: null,
    canonicalPayload: null,
    disclosures: [],
    recovery: {
      title: "Receipt gate closed",
      detail: "The receipt proof did not pass replay checks."
    }
  };
}

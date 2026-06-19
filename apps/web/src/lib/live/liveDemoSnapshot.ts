import type {
  DecisionRecord,
  LiveRunRecord,
  ReceiptRecord,
  SubmittedTxRecord,
  VerifierInputRecord
} from "./liveTypes.ts";
import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";

export type LiveDemoSnapshotInput = {
  capturedAt: string;
  liveUrl: string;
  run: LiveRunRecord;
  submittedTx: SubmittedTxRecord | null;
  decision: DecisionRecord | null;
  receipt: ReceiptRecord | null;
  verifierInput: VerifierInputRecord | null;
};

export type LiveDemoSnapshot = {
  schemaVersion: "1";
  source: "live";
  capturedAt: string;
  liveUrl: string;
  run: {
    runId: string;
    wallet: string;
    campaignId: string;
    missionId: string;
    status: "matched";
    intentHash: string;
    expiryUnix: number;
    createdAt: string;
    updatedAt: string;
    manifest: {
      chainId: unknown;
      target: unknown;
      selector: unknown;
      asset: unknown;
      amountBaseUnits: unknown;
      spender: unknown;
      maxAllowanceBaseUnits: unknown;
    };
  };
  transactions: {
    approveTxHash: string | null;
    depositTxHash: string;
    submittedAt: string;
  };
  verifier: {
    decision: "matched";
    failureReason: null;
    verifierInputHash: string;
    canonicalVerifierInputPayload: string;
    canonicalVerifierInputPayloadBytesHex: string;
    decisionTxHash: null;
    issuedAt: number;
  };
  receipt: {
    receiptHash: string;
    payload: unknown;
    canonicalPayload: string;
    canonicalPayloadBytesHex: string;
  };
};

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

export function buildLiveDemoSnapshot(input: LiveDemoSnapshotInput): LiveDemoSnapshot {
  if (input.submittedTx === null) {
    throw new Error("submitted transaction evidence is required");
  }
  const gate = evaluateCommercialReceiptGate({
    run: input.run,
    decision: input.decision ?? undefined,
    receipt: input.receipt ?? undefined,
    verifierInput: input.verifierInput ?? undefined,
    replay: { requireHashRecomputation: true }
  });
  if (!gate.open) {
    throw new Error(`commercial receipt gate failed: ${gate.reason}`);
  }
  const decision = input.decision;
  const receipt = input.receipt;
  const verifierInput = input.verifierInput;
  if (decision === null || receipt === null || verifierInput === null) throw new Error("commercial receipt gate failed");

  const manifest = parseJsonObject(input.run.manifestJson, "manifestJson");
  const payload = parseJsonObject(receipt.payloadJson, "receipt payload");

  return {
    schemaVersion: "1",
    source: "live",
    capturedAt: input.capturedAt,
    liveUrl: input.liveUrl,
    run: {
      runId: input.run.runId,
      wallet: input.run.wallet,
      campaignId: input.run.campaignId,
      missionId: input.run.missionId,
      status: "matched",
      intentHash: input.run.intentHash,
      expiryUnix: input.run.expiryUnix,
      createdAt: input.run.createdAt,
      updatedAt: input.run.updatedAt,
      manifest: {
        chainId: manifest.chainId,
        target: manifest.target,
        selector: manifest.selector,
        asset: manifest.asset,
        amountBaseUnits: manifest.amountBaseUnits,
        spender: manifest.spender,
        maxAllowanceBaseUnits: manifest.maxAllowanceBaseUnits
      }
    },
    transactions: {
      approveTxHash: input.submittedTx.approveTxHash,
      depositTxHash: input.submittedTx.depositTxHash,
      submittedAt: input.submittedTx.submittedAt
    },
    verifier: {
      decision: "matched",
      failureReason: null,
      verifierInputHash: decision.verifierInputHash,
      canonicalVerifierInputPayload: verifierInput.canonicalPayload,
      canonicalVerifierInputPayloadBytesHex: verifierInput.canonicalPayloadBytesHex,
      decisionTxHash: null,
      issuedAt: decision.issuedAt
    },
    receipt: {
      receiptHash: receipt.receiptHash,
      payload,
      canonicalPayload: receipt.canonicalPayload,
      canonicalPayloadBytesHex: receipt.canonicalPayloadBytesHex
    }
  };
}

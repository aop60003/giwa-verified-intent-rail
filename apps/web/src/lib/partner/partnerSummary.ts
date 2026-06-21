import type { GuidedFlowModel } from "../flow/guidedFlow.js";
import { dedupeRunEvents, runDedupeKey, type StoredRunEvent } from "../storage/runStore.ts";
import { buildPartnerEvidencePacket, type PartnerEvidencePacket } from "./partnerEvidencePacket.ts";

type JsonRecord = Record<string, any>;

export type PartnerProofConsoleModel = {
  screenKind: "partner-proof-console";
  productName: "GIWA Verified Intent Rail";
  partnerExplanation: string;
  source: {
    evidencePath: string;
    evidenceDraftUntilSprint7: boolean;
    fixtureRowsVisible: true;
    liveRowsVisible: boolean;
    sourceTimestamp: string;
  };
  summary: {
    campaignId: string;
    missionId: string;
    campaignEntryCount: number;
    walletConnectedCount: number;
    intentAcceptedCount: number;
    depositSubmittedCount: number;
    manifestMatchedReceiptCount: number;
    matchedTxRate: string;
    matchedTxRateNumerator: number;
    matchedTxRateDenominator: number;
    mockTestnetDepositAmountBaseUnits: string;
    mockTestnetDepositCount: number;
    matchedStatus: "matched" | "pending";
  };
  evidenceCards: {
    receiptHash: string | null;
    decisionTxHash: string | null;
    depositTxHash: string | null;
    intentSubmittedTxHash: string | null;
    standardConfirmation: {
      status: number | null;
      blockNumber: string | number | null;
      blockHash: string | null;
      confirmationDepth: number | null;
      standardRpcBlockEvidence: true;
    };
    fastFeedback: {
      observed: boolean;
      namespace: "non-final";
      standardRpcBlockEvidence: false;
    };
    manifestSigner: {
      expectedSigner: string | null;
      recoveredSigner: string | null;
      signerMatched: boolean;
    };
    decodedLogSummary: Array<{
      eventName: string;
      contractAddress: string;
      logIndex: number | string | null;
    }>;
  };
  rows: Array<{
    runId: string;
    dedupeKey: string;
    source: "fixture" | "live";
    campaignId: string;
    missionId: string;
    wallet: string;
    verifiedState: string;
    status: "matched" | "pending";
    receiptHash: string | null;
    depositTxHash: string | null;
    decisionTxHash: string | null;
    intentSubmittedTxHash: string | null;
    blockNumber: number | string | null;
    blockHash: string | null;
    receiptPermalink: string | null;
    depositExplorerUrl: string | null;
    decisionExplorerUrl: string | null;
  }>;
  exportSnapshot: {
    snapshotPath: "/partner-snapshot.json";
    receiptPermalink: string | null;
    generatedFrom: string;
  };
  evidencePacket: PartnerEvidencePacket;
};

export type PartnerProofConsoleOptions = {
  evidencePath: string;
  extraRunEvents?: PartnerRunEventInput[];
};

export type PartnerRunEventInput = Omit<StoredRunEvent, "intentHash"> & {
  intentHash?: string;
};

const PARTNER_EXPLANATION =
  "Quest clicks show participation. GIWA Verified Intent Rail shows that a signed, manifest-covered GIWA Sepolia testnet action matched a block-confirmed transaction and produced a receipt hash.";

function sourceTimestamp(evidence: JsonRecord): string {
  const issuedAt = evidence.receipt?.payload?.issuedAt;
  if (typeof issuedAt === "number") {
    return new Date(issuedAt * 1000).toISOString();
  }

  return evidence.network?.capturedAt ?? "fixture";
}

function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return "N/A";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function toStoredRunEvents(flow: GuidedFlowModel, extraRunEvents: PartnerRunEventInput[]): StoredRunEvent[] {
  return [...flow.runEvents, ...extraRunEvents].map((event) => ({
    ...event,
    intentHash: "intentHash" in event && event.intentHash !== undefined ? event.intentHash : flow.manifest.intentHash
  }));
}

function countEvents(events: StoredRunEvent[], name: StoredRunEvent["name"]): number {
  return events.filter((event) => event.name === name).length;
}

function sumBaseUnits(values: string[]): string {
  return values.reduce((total, value) => total + BigInt(value), 0n).toString();
}

function decodedLogSummary(evidence: JsonRecord): PartnerProofConsoleModel["evidenceCards"]["decodedLogSummary"] {
  return (evidence.decodedLogSnapshots ?? []).map((log: JsonRecord) => ({
    eventName: String(log.eventName),
    contractAddress: String(log.contractAddress),
    logIndex: log.logIndex ?? null
  }));
}

export function buildPartnerProofConsoleModel(
  flow: GuidedFlowModel,
  evidence: JsonRecord,
  options: PartnerProofConsoleOptions
): PartnerProofConsoleModel {
  const events = dedupeRunEvents(toStoredRunEvents(flow, options.extraRunEvents ?? []));
  const depositSubmittedCount = countEvents(events, "deposit_submitted");
  const receiptReady = flow.receipt.ready === true && flow.receipt.receiptHash !== null;
  const manifestMatchedReceiptCount = receiptReady ? countEvents(events, "receipt_matched") : 0;
  const matchedAmount = receiptReady ? [evidence.receipt?.payload?.testnetDepositAmountDelta ?? "0"] : [];
  const receiptPermalink = receiptReady ? `/receipt/${flow.receipt.receiptHash}` : null;
  const verifiedState = flow.readiness.verifiedState.state;
  const status: "matched" | "pending" = receiptReady ? "matched" : "pending";
  const firstFixtureRunEvent = events.find((event) => event.source === "fixture");
  const rowRunEvent = firstFixtureRunEvent ?? {
    runId: `${flow.mission.campaignId}:${flow.mission.missionId}:${flow.manifest.intentHash.slice(2, 10)}`,
    campaignId: flow.mission.campaignId,
    missionId: flow.mission.missionId,
    wallet: flow.readiness.wallet,
    intentHash: flow.manifest.intentHash,
    source: "fixture" as const
  };

  const row = {
    runId: rowRunEvent.runId,
    dedupeKey: runDedupeKey(rowRunEvent),
    source: "fixture" as const,
    campaignId: rowRunEvent.campaignId,
    missionId: rowRunEvent.missionId,
    wallet: rowRunEvent.wallet ?? flow.readiness.wallet,
    verifiedState,
    status,
    receiptHash: flow.receipt.receiptHash,
    depositTxHash: flow.receipt.depositTxHash,
    decisionTxHash: flow.receipt.decisionTxHash,
    intentSubmittedTxHash: evidence.transactions?.intentSubmittedTxHash ?? null,
    blockNumber: flow.receipt.blockNumber,
    blockHash: flow.receipt.blockHash,
    receiptPermalink,
    depositExplorerUrl: flow.receipt.depositExplorerUrl,
    decisionExplorerUrl: flow.receipt.decisionExplorerUrl
  };
  const evidencePacket = buildPartnerEvidencePacket({
    campaignId: flow.mission.campaignId,
    missionId: flow.mission.missionId,
    rows: [
      {
        source: "fixture",
        runId: row.runId,
        wallet: row.wallet,
        campaignId: row.campaignId,
        missionId: row.missionId,
        status: row.status,
        receiptHash: row.receiptHash,
        depositTxHash: row.depositTxHash,
        verifierInputHash: evidence.verifier?.verifierInputHash ?? evidence.receipt?.payload?.verifierInputHash ?? null,
        receiptPermalink: row.receiptPermalink,
        amountBaseUnits: evidence.receipt?.payload?.testnetDepositAmountDelta ?? "0",
        standardRpc: {
          status: evidence.confirmation?.standardRpcReceiptStatus ?? null,
          blockNumber: evidence.confirmation?.depositBlockNumber ?? flow.receipt.blockNumber,
          blockHash: evidence.confirmation?.depositBlockHash ?? flow.receipt.blockHash,
          confirmationDepth: evidence.confirmation?.confirmationDepth ?? null
        },
        replayStatus: receiptReady ? "passed" : "unavailable"
      }
    ],
    source: {
      snapshotPath: "/partner-snapshot.json",
      generatedAt: sourceTimestamp(evidence)
    }
  });

  return {
    screenKind: "partner-proof-console",
    productName: "GIWA Verified Intent Rail",
    partnerExplanation: PARTNER_EXPLANATION,
    source: {
      evidencePath: options.evidencePath,
      evidenceDraftUntilSprint7: flow.source.evidenceDraftUntilSprint7,
      fixtureRowsVisible: true,
      liveRowsVisible: events.some((event) => event.source === "live"),
      sourceTimestamp: sourceTimestamp(evidence)
    },
    summary: {
      campaignId: flow.mission.campaignId,
      missionId: flow.mission.missionId,
      campaignEntryCount: countEvents(events, "campaign_entry"),
      walletConnectedCount: countEvents(events, "wallet_connected"),
      intentAcceptedCount: countEvents(events, "intent_accepted"),
      depositSubmittedCount,
      manifestMatchedReceiptCount,
      matchedTxRate: formatRate(manifestMatchedReceiptCount, depositSubmittedCount),
      matchedTxRateNumerator: manifestMatchedReceiptCount,
      matchedTxRateDenominator: depositSubmittedCount,
      mockTestnetDepositAmountBaseUnits: sumBaseUnits(matchedAmount),
      mockTestnetDepositCount: manifestMatchedReceiptCount,
      matchedStatus: status
    },
    evidenceCards: {
      receiptHash: flow.receipt.receiptHash,
      decisionTxHash: flow.receipt.decisionTxHash,
      depositTxHash: flow.receipt.depositTxHash,
      intentSubmittedTxHash: evidence.transactions?.intentSubmittedTxHash ?? null,
      standardConfirmation: {
        status: evidence.confirmation?.standardRpcReceiptStatus ?? null,
        blockNumber: evidence.confirmation?.depositBlockNumber ?? flow.receipt.blockNumber,
        blockHash: evidence.confirmation?.depositBlockHash ?? flow.receipt.blockHash,
        confirmationDepth: evidence.confirmation?.confirmationDepth ?? null,
        standardRpcBlockEvidence: true
      },
      fastFeedback: {
        observed: evidence.confirmation?.flashblocksObserved === true,
        namespace: "non-final",
        standardRpcBlockEvidence: false
      },
      manifestSigner: {
        expectedSigner: evidence.roles?.campaignSignerAddress ?? null,
        recoveredSigner: evidence.manifest?.recoveredSigner ?? null,
        signerMatched:
          typeof evidence.roles?.campaignSignerAddress === "string" &&
          typeof evidence.manifest?.recoveredSigner === "string" &&
          evidence.roles.campaignSignerAddress.toLowerCase() === evidence.manifest.recoveredSigner.toLowerCase()
      },
      decodedLogSummary: decodedLogSummary(evidence)
    },
    rows: [row],
    exportSnapshot: {
      snapshotPath: "/partner-snapshot.json",
      receiptPermalink,
      generatedFrom: options.evidencePath
    },
    evidencePacket
  };
}

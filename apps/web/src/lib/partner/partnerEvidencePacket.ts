export type PartnerEvidencePacketInputRow = {
  source: "fixture" | "live";
  runId: string;
  wallet: string;
  campaignId: string;
  missionId: string;
  status: "matched" | "pending" | "timeout" | "mismatched" | "failed" | string;
  receiptHash: string | null;
  depositTxHash: string | null;
  verifierInputHash: string | null;
  receiptPermalink: string | null;
  amountBaseUnits: string;
  standardRpc?: {
    status: 1 | 0 | null;
    blockNumber: number | string | null;
    blockHash: string | null;
    confirmationDepth: number | null;
  };
  replayStatus?: "passed" | "blocked" | "unavailable";
};

export type PartnerEvidencePacketRow = {
  source: "fixture" | "live";
  runId: string;
  wallet: string;
  status: "matched";
  receiptHash: string;
  depositTxHash: string;
  verifierInputHash: string;
  receiptPermalink: string;
  amountBaseUnits: string;
};

export type PartnerEvidencePacket = {
  screenKind: "partner-evidence-packet";
  campaignId: string;
  missionId: string;
  rows: PartnerEvidencePacketRow[];
  sourceMix: {
    fixture: number;
    live: number;
  };
  kpis: {
    submittedDepositCount: number;
    matchedReceiptCount: number;
    matchedTxRate: string;
    mockTestnetDepositAmountBaseUnits: string;
  };
  evidence: {
    standardRpc: {
      standardRpcBlockEvidence: true;
      status: 1 | 0 | null;
      blockNumber: number | string | null;
      blockHash: string | null;
      confirmationDepth: number | null;
    };
    fastFeedback: {
      standardRpcBlockEvidence: false;
      namespace: "non-final";
    };
    replayStatus: "passed" | "blocked" | "unavailable";
  };
  exportLinks: {
    snapshotPath: string;
    generatedAt: string;
  };
};

function isMatchedRow(row: PartnerEvidencePacketInputRow): row is PartnerEvidencePacketInputRow & {
  status: "matched";
  receiptHash: string;
  depositTxHash: string;
  verifierInputHash: string;
  receiptPermalink: string;
} {
  return (
    row.status === "matched" &&
    typeof row.receiptHash === "string" &&
    typeof row.depositTxHash === "string" &&
    typeof row.verifierInputHash === "string" &&
    typeof row.receiptPermalink === "string" &&
    row.replayStatus === "passed"
  );
}

function sumBaseUnits(rows: PartnerEvidencePacketRow[]): string {
  return rows.reduce((total, row) => total + BigInt(row.amountBaseUnits), 0n).toString();
}

export function buildPartnerEvidencePacket(input: {
  campaignId: string;
  missionId: string;
  rows: PartnerEvidencePacketInputRow[];
  source: {
    snapshotPath: string;
    generatedAt: string;
  };
}): PartnerEvidencePacket {
  const scoped = input.rows.filter((row) => row.campaignId === input.campaignId && row.missionId === input.missionId);
  const matched = scoped.filter(isMatchedRow).map((row) => ({
    source: row.source,
    runId: row.runId,
    wallet: row.wallet,
    status: "matched" as const,
    receiptHash: row.receiptHash,
    depositTxHash: row.depositTxHash,
    verifierInputHash: row.verifierInputHash,
    receiptPermalink: row.receiptPermalink,
    amountBaseUnits: row.amountBaseUnits
  }));
  const firstEvidence = scoped.find((row) => row.standardRpc !== undefined) ?? scoped[0];
  const submittedDepositCount = scoped.filter((row) => row.depositTxHash !== null || row.status === "timeout" || row.status === "mismatched" || row.status === "failed").length;

  return {
    screenKind: "partner-evidence-packet",
    campaignId: input.campaignId,
    missionId: input.missionId,
    rows: matched,
    sourceMix: {
      fixture: matched.filter((row) => row.source === "fixture").length,
      live: matched.filter((row) => row.source === "live").length
    },
    kpis: {
      submittedDepositCount,
      matchedReceiptCount: matched.length,
      matchedTxRate: `${matched.length}/${submittedDepositCount}`,
      mockTestnetDepositAmountBaseUnits: sumBaseUnits(matched)
    },
    evidence: {
      standardRpc: {
        standardRpcBlockEvidence: true,
        status: firstEvidence?.standardRpc?.status ?? null,
        blockNumber: firstEvidence?.standardRpc?.blockNumber ?? null,
        blockHash: firstEvidence?.standardRpc?.blockHash ?? null,
        confirmationDepth: firstEvidence?.standardRpc?.confirmationDepth ?? null
      },
      fastFeedback: {
        standardRpcBlockEvidence: false,
        namespace: "non-final"
      },
      replayStatus: matched.length > 0 ? "passed" : scoped.some((row) => row.replayStatus === "blocked") ? "blocked" : "unavailable"
    },
    exportLinks: {
      snapshotPath: input.source.snapshotPath,
      generatedAt: input.source.generatedAt
    }
  };
}

import { describe, expect, it } from "vitest";

import { buildPartnerEvidencePacket } from "./partnerEvidencePacket.ts";

const matchedLiveRow = {
  source: "live" as const,
  runId: "run-live-1",
  wallet: "0x1111111111111111111111111111111111111111",
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  status: "matched" as const,
  receiptHash: `0x${"8".repeat(64)}`,
  depositTxHash: `0x${"d".repeat(64)}`,
  verifierInputHash: `0x${"9".repeat(64)}`,
  receiptPermalink: `/receipt/0x${"8".repeat(64)}`,
  amountBaseUnits: "1000000000000000000",
  standardRpc: {
    status: 1 as const,
    blockNumber: 28483877,
    blockHash: `0x${"b".repeat(64)}`,
    confirmationDepth: 37
  },
  replayStatus: "passed" as const
};

describe("buildPartnerEvidencePacket", () => {
  it("includes only gate-passed matched rows in the packet", () => {
    const packet = buildPartnerEvidencePacket({
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      rows: [
        matchedLiveRow,
        { ...matchedLiveRow, runId: "run-timeout", status: "timeout" },
        { ...matchedLiveRow, runId: "run-mismatch", status: "mismatched" }
      ],
      source: { snapshotPath: "/live-demo-snapshot.json", generatedAt: "2026-06-19T00:00:00.000Z" }
    });

    expect(packet.rows).toHaveLength(1);
    expect(packet.rows[0]?.status).toBe("matched");
    expect(packet.kpis.matchedTxRate).toBe("1/3");
    expect(packet.kpis.mockTestnetDepositAmountBaseUnits).toBe("1000000000000000000");
    expect(packet.evidence.standardRpc.standardRpcBlockEvidence).toBe(true);
    expect(packet.evidence.fastFeedback.standardRpcBlockEvidence).toBe(false);
    expect(JSON.stringify(packet)).not.toContain("finalConfirmation");
  });

  it("keeps fixture and live sources distinct", () => {
    const packet = buildPartnerEvidencePacket({
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      rows: [{ ...matchedLiveRow, source: "fixture" }, matchedLiveRow],
      source: { snapshotPath: "/partner-snapshot.json", generatedAt: "fixture" }
    });

    expect(packet.sourceMix).toEqual({ fixture: 1, live: 1 });
    expect(packet.rows.map((row) => row.source)).toEqual(["fixture", "live"]);
  });
});

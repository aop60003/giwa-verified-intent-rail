import type { HostedRuntimeMode } from "./hostedMode.ts";
import type { LiveRunRecord } from "./liveTypes.ts";

export type DemoOpeningItem = {
  id: "freshLive" | "dynamicReceipt" | "staticFallback" | "partnerConsole" | "staticSnapshot";
  label: string;
  href: string;
  state: "ready" | "blocked" | "stale";
  reason: string;
};

export type DemoControlRoom = {
  screenKind: "operator-demo-control-room";
  openingOrder: DemoOpeningItem[];
  safeProjection: {
    health: { ok: boolean };
    readiness: { ready: boolean; mode: HostedRuntimeMode };
    latestRun: null | {
      runId: string;
      wallet: string;
      campaignId: string;
      missionId: string;
      status: LiveRunRecord["status"];
      intentHash: string;
      updatedAt: string;
    };
    receiptHash: string | null;
  };
};

export function selectLatestRun(runs: LiveRunRecord[]): LiveRunRecord | null {
  if (runs.length === 0) return null;
  return [...runs].sort((left, right) => {
    const byDate = left.updatedAt.localeCompare(right.updatedAt);
    if (byDate !== 0) return byDate;
    return left.runId.localeCompare(right.runId);
  })[runs.length - 1] ?? null;
}

function item(
  id: DemoOpeningItem["id"],
  label: string,
  href: string,
  state: DemoOpeningItem["state"],
  reason: string
): DemoOpeningItem {
  return { id, label, href, state, reason };
}

export function buildLiveDemoControlRoom(input: {
  baseUrl: string;
  health: { ok: boolean };
  readiness: { ready: boolean; mode: HostedRuntimeMode };
  latestRun: LiveRunRecord | null;
  receiptHash: string | null;
  snapshot: { present: boolean; receiptHash: string | null; path: string };
  staticFallback: { available: boolean };
}): DemoControlRoom {
  const matched = input.latestRun?.status === "matched" && input.receiptHash !== null;
  const receiptHref = matched ? `${input.baseUrl}/api/receipts/${input.receiptHash}` : `${input.baseUrl}/api/receipts/<matched-receipt-hash>`;
  const snapshotState =
    matched && input.snapshot.present && input.snapshot.receiptHash?.toLowerCase() === input.receiptHash?.toLowerCase()
      ? "ready"
      : input.snapshot.present
        ? "stale"
        : "blocked";

  return {
    screenKind: "operator-demo-control-room",
    openingOrder: [
      item(
        "freshLive",
        "Fresh live path",
        `${input.baseUrl}/live`,
        matched ? "ready" : input.readiness.ready ? "stale" : "blocked",
        matched ? "Latest live run is matched." : "Use this for a fresh wallet rehearsal when readiness is clear."
      ),
      item(
        "dynamicReceipt",
        "Dynamic receipt API",
        receiptHref,
        matched ? "ready" : "blocked",
        matched ? "Dynamic receipt API is available." : "Receipt API opens after matched verification."
      ),
      item(
        "staticFallback",
        "Static fallback",
        "http://127.0.0.1:4176/",
        input.staticFallback.available ? "ready" : "blocked",
        input.staticFallback.available ? "Recorded static fallback is available." : "Static fallback was not detected."
      ),
      item(
        "partnerConsole",
        "Partner console",
        "http://127.0.0.1:4176/partner",
        input.staticFallback.available ? "ready" : "blocked",
        "Partner evidence packet fallback path."
      ),
      item(
        "staticSnapshot",
        "Static snapshot",
        "http://127.0.0.1:4176/partner-snapshot.json",
        input.staticFallback.available ? "ready" : "blocked",
        "Commit-safe static snapshot path."
      )
    ],
    safeProjection: {
      health: { ok: input.health.ok },
      readiness: { ready: input.readiness.ready, mode: input.readiness.mode },
      latestRun:
        input.latestRun === null
          ? null
          : {
              runId: input.latestRun.runId,
              wallet: input.latestRun.wallet,
              campaignId: input.latestRun.campaignId,
              missionId: input.latestRun.missionId,
              status: input.latestRun.status,
              intentHash: input.latestRun.intentHash,
              updatedAt: input.latestRun.updatedAt
            },
      receiptHash: input.receiptHash
    }
  };
}

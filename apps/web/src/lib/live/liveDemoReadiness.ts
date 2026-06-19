import type { LiveRunRecord } from "./liveTypes.ts";

export type LiveDemoPrimaryPath = "live" | "staticFallback" | "blocked";

export type LiveDemoReadinessInput = {
  latestRun: LiveRunRecord | null;
  receiptHash: string | null;
  staticFallbackReady: boolean;
};

export type LiveDemoReadiness = {
  primaryPath: LiveDemoPrimaryPath;
  canExportLiveSnapshot: boolean;
  blockers: string[];
};

export function buildLiveDemoReadiness(input: LiveDemoReadinessInput): LiveDemoReadiness {
  const blockers: string[] = [];
  const matchedWithReceipt = input.latestRun?.status === "matched" && input.receiptHash !== null;

  if (!matchedWithReceipt) {
    blockers.push(input.latestRun === null ? "live_run_missing" : "live_verifier_not_matched");
  }

  if (!input.staticFallbackReady && !matchedWithReceipt) {
    blockers.push("static_fallback_unavailable");
  }

  return {
    primaryPath: matchedWithReceipt ? "live" : input.staticFallbackReady ? "staticFallback" : "blocked",
    canExportLiveSnapshot: matchedWithReceipt,
    blockers
  };
}

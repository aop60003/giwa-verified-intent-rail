import { describe, expect, it } from "vitest";

import { buildLiveFlowViewModel } from "./liveFlowState.ts";

const preview = {
  target: "0x2222222222222222222222222222222222222222",
  selector: "0x47e7ef24",
  asset: "0x3333333333333333333333333333333333333333",
  amountBaseUnits: "1000000000000000000",
  spender: "0x2222222222222222222222222222222222222222",
  maxAllowanceBaseUnits: "1000000000000000000",
  expiryUnix: 1790003600,
  intentHash: `0x${"a".repeat(64)}`
} as const;

const wallet = {
  status: "connected" as const,
  account: "0x1111111111111111111111111111111111111111" as `0x${string}`,
  chainId: 91342
};

describe("Sprint 16 live participant flow state", () => {
  it("shows connect wallet before an account is available", () => {
    const model = buildLiveFlowViewModel({ wallet: { status: "disconnected", account: null, chainId: null }, run: null });

    expect(model.primaryAction).toMatchObject({ kind: "connectWallet", enabled: true });
    expect(model.manifestPreview.visible).toBe(false);
    expect(model.actions.approve).toMatchObject({
      enabled: false,
      reason: "wallet_required",
      describedById: "approve-action-reason"
    });
    expect(model.noticeRegion).toEqual({ role: "status", live: "polite" });
  });

  it("blocks manifest issuance on the wrong chain", () => {
    const model = buildLiveFlowViewModel({
      wallet: { status: "wrongChain", account: "0x1111111111111111111111111111111111111111", chainId: 1 },
      run: null
    });

    expect(model.primaryAction).toMatchObject({ kind: "switchNetwork", enabled: true });
    expect(model.blockers).toContain("wrong_chain");
    expect(model.actions.deposit.reason).toBe("wrong_chain");
  });

  it("shows manifest preview and enables wallet actions when the preview is valid", () => {
    const model = buildLiveFlowViewModel({
      wallet,
      run: { runId: "run-1", status: "manifestIssued", manifestPreview: preview, expiryUnix: preview.expiryUnix },
      nowSeconds: preview.expiryUnix - 1
    });

    expect(model.manifestPreview).toMatchObject({ visible: true, fields: preview });
    expect(model.actions.approve).toMatchObject({ enabled: true, reason: null, label: "Approve" });
    expect(model.actions.deposit).toMatchObject({ enabled: true, reason: null, label: "Deposit" });
    expect(model.statusRail.find((step) => step.id === "manifestIssued")).toMatchObject({
      state: "complete"
    });
    expect(model.statusRail.find((step) => step.id === "approveSubmitted")).toMatchObject({
      state: "active",
      current: true
    });
  });

  it("blocks wallet actions after manifest invalidation or expiry", () => {
    const invalidated = buildLiveFlowViewModel({
      wallet,
      run: { runId: "run-1", status: "manifestInvalidated", manifestPreview: null, expiryUnix: preview.expiryUnix },
      nowSeconds: preview.expiryUnix - 1
    });
    const expired = buildLiveFlowViewModel({
      wallet,
      run: { runId: "run-1", status: "manifestIssued", manifestPreview: preview, expiryUnix: preview.expiryUnix },
      nowSeconds: preview.expiryUnix + 1
    });

    expect(invalidated.actions.approve.reason).toBe("manifest_invalidated");
    expect(expired.actions.deposit.reason).toBe("manifest_expired");
  });

  it("shows a complete participant rail after matched verification", () => {
    const model = buildLiveFlowViewModel({
      wallet,
      run: {
        runId: "run-1",
        status: "matched",
        manifestPreview: preview,
        approveTxHash: `0x${"b".repeat(64)}`,
        depositTxHash: `0x${"c".repeat(64)}`,
        verification: { status: "terminal" },
        receiptHash: `0x${"d".repeat(64)}`,
        expiryUnix: preview.expiryUnix
      },
      nowSeconds: preview.expiryUnix - 1
    });

    expect(model.primaryAction.kind).toBe("viewReceipt");
    expect(model.statusRail.map((step) => step.id)).toEqual([
      "walletReady",
      "manifestIssued",
      "approveSubmitted",
      "depositSubmitted",
      "standardRpcChecking",
      "verifierMatched",
      "receiptReady"
    ]);
    expect(model.statusRail.filter((step) => step.current)).toHaveLength(1);
    expect(model.receiptHandoff?.receiptHash).toBe(`0x${"d".repeat(64)}`);
    expect(model.actions.verify).toMatchObject({ enabled: false, reason: "already_submitted" });
    expect(model.statusRail.find((step) => step.id === "standardRpcChecking")).toMatchObject({
      standardRpcBlockEvidence: true
    });
    expect(JSON.stringify(model)).not.toContain("finalConfirmation");
  });

  it("represents queued verification without implying a receipt is ready", () => {
    const model = buildLiveFlowViewModel({
      wallet,
      run: {
        runId: "run-1",
        status: "depositSubmitted",
        manifestPreview: preview,
        approveTxHash: `0x${"b".repeat(64)}`,
        depositTxHash: `0x${"c".repeat(64)}`,
        verification: { status: "queued", pollPath: "/api/runs/run-1" },
        expiryUnix: preview.expiryUnix
      },
      nowSeconds: preview.expiryUnix - 1
    });

    expect(model.statusRail.find((step) => step.id === "standardRpcChecking")).toMatchObject({
      state: "active",
      current: true
    });
    expect(model.receiptHandoff).toBeNull();
    expect(model.actions.verify).toMatchObject({ enabled: false, reason: "verification_queued" });
  });

  it("keeps mismatch and timeout states locked with recovery copy", () => {
    const mismatch = buildLiveFlowViewModel({
      wallet,
      run: {
        runId: "run-1",
        status: "mismatched",
        manifestPreview: preview,
        depositTxHash: `0x${"c".repeat(64)}`,
        failureCopy: "Required standard RPC receipt evidence was missing. Receipt stays locked.",
        expiryUnix: preview.expiryUnix
      },
      nowSeconds: preview.expiryUnix - 1
    });
    const timeout = buildLiveFlowViewModel({
      wallet,
      run: {
        runId: "run-1",
        status: "timeout",
        manifestPreview: preview,
        depositTxHash: `0x${"c".repeat(64)}`,
        expiryUnix: preview.expiryUnix
      },
      nowSeconds: preview.expiryUnix - 1
    });

    expect(mismatch.receiptHandoff).toBeNull();
    expect(mismatch.recovery?.title).toBe("Receipt not issued");
    expect(timeout.recovery?.title).toBe("Wait for more confirmations");
  });
});

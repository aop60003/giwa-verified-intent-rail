import { describe, expect, it } from "vitest";
import { deriveUserFlowState, type UserFlowInput } from "./userFlowState";

const wallet = "0xf3a729973559082260e742ebedf705271ad29476";
const manifestPreview = {
  actionName: "First mock vault action",
  amountBaseUnits: "1000000000000000000",
  target: "0x1111111111111111111111111111111111111111",
  wallet,
  expiryUnix: 1_800_000_100,
  intentHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
};

function state(overrides: Partial<UserFlowInput> = {}) {
  return deriveUserFlowState({
    wallet: { status: "connected", account: wallet, chainId: 91342 },
    readiness: "depositReady",
    run: null,
    nowUnix: 1_800_000_000,
    ...overrides
  });
}

describe("deriveUserFlowState", () => {
  it("derives the exact progressive phase and CTA order", () => {
    const issuedRun = {
      status: "manifestIssued" as const,
      runId: "run_1",
      expiryUnix: 1_800_000_100,
      manifestPreview
    };

    const sequence = [
      state({ wallet: { status: "disconnected", account: null, chainId: null }, readiness: null }),
      state({ wallet: { status: "wrongChain", account: wallet, chainId: 1 }, readiness: null }),
      state({ readiness: "gasRequired" }),
      state({ readiness: "mintRequired" }),
      state({ readiness: "depositReady" }),
      state({ readiness: "approvalRequired", run: issuedRun }),
      state({ readiness: "depositReady", run: issuedRun }),
      state({
        readiness: "depositReady",
        run: { ...issuedRun, status: "verifying", depositTxHash: `0x${"2".repeat(64)}` }
      }),
      state({
        readiness: "depositReady",
        run: {
          ...issuedRun,
          status: "matched",
          depositTxHash: `0x${"2".repeat(64)}`,
          receiptHash: `0x${"3".repeat(64)}`
        }
      })
    ];

    expect(sequence.map((item) => item.phase)).toEqual([
      "walletRequired",
      "networkRequired",
      "gasRequired",
      "mintRequired",
      "intentRequired",
      "approvalRequired",
      "depositReady",
      "verifying",
      "receiptReady"
    ]);
    expect(sequence.map((item) => item.primaryCta)).toEqual([
      "connect_wallet",
      "switch_network",
      "get_test_eth",
      "prepare_mock_token",
      "review_action",
      "approve_exact_amount",
      "deposit_to_vault",
      "verifying",
      "view_receipt"
    ]);
  });

  it("invalidates wallet action when Manifest is expired", () => {
    const result = state({
      readiness: "approvalRequired",
      run: {
        status: "manifestIssued",
        runId: "run_1",
        expiryUnix: 1_799_999_999,
        manifestPreview
      }
    });

    expect(result.currentScreen).toBe("intentPreview");
    expect(result.phase).toBe("intentRequired");
    expect(result.primaryCta).toBe("review_action");
    expect(result.canRequestWalletAction).toBe(false);
    expect(result.blockReason).toBe("manifest_expired");
  });

  it("supports provider missing as a wallet-connect state", () => {
    const result = state({
      wallet: { status: "providerMissing", account: null, chainId: null },
      readiness: null
    });

    expect(result.primaryCta).toBe("connect_wallet");
    expect(result.blockReason).toBe("wallet_disconnected");
  });

  it("completes every progress step for a matched Receipt", () => {
    const result = state({
      run: {
        status: "matched",
        runId: "run_1",
        expiryUnix: 1_800_000_100,
        manifestPreview,
        approveTxHash: `0x${"1".repeat(64)}`,
        depositTxHash: `0x${"2".repeat(64)}`,
        receiptHash: `0x${"3".repeat(64)}`
      }
    });

    expect(result.progress.every((step) => step.state === "complete")).toBe(true);
    expect(result.primaryCta).toBe("view_receipt");
  });
});

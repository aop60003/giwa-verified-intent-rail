import { describe, expect, it } from "vitest";
import { deriveUserFlowState } from "./userFlowState";

const wallet = "0xf3a729973559082260e742ebedf705271ad29476";
const manifestPreview = {
  actionName: "First mock vault action",
  amountBaseUnits: "1000000",
  target: "0x1111111111111111111111111111111111111111",
  wallet,
  expiryUnix: 1_800_000_100,
  intentHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
};

describe("deriveUserFlowState", () => {
  it("blocks action before wallet connection", () => {
    const state = deriveUserFlowState({
      wallet: { status: "disconnected", account: null, chainId: null },
      run: null,
      nowUnix: 1_800_000_000
    });

    expect(state.currentScreen).toBe("actionPage");
    expect(state.primaryCta).toBe("connect_wallet");
    expect(state.canIssueIntent).toBe(false);
    expect(state.canRequestWalletAction).toBe(false);
    expect(state.progress.map((step) => step.id)).toEqual([
      "wallet_connected",
      "intent_issued",
      "approval_submitted",
      "deposit_submitted",
      "standard_rpc_receipt_found",
      "verification_matched",
      "receipt_ready"
    ]);
  });

  it("requires GIWA Sepolia before intent issuance", () => {
    const state = deriveUserFlowState({
      wallet: { status: "wrongChain", account: wallet, chainId: 1 },
      run: null,
      nowUnix: 1_800_000_000
    });

    expect(state.primaryCta).toBe("switch_network");
    expect(state.network.requiredChainId).toBe(91342);
    expect(state.canIssueIntent).toBe(false);
    expect(state.blockReason).toBe("wrong_network");
  });

  it("invalidates wallet action when manifest is expired", () => {
    const state = deriveUserFlowState({
      wallet: { status: "connected", account: wallet, chainId: 91342 },
      run: {
        status: "manifestIssued",
        runId: "run_1",
        expiryUnix: 1_799_999_999,
        manifestPreview
      },
      nowUnix: 1_800_000_000
    });

    expect(state.currentScreen).toBe("intentPreview");
    expect(state.canRequestWalletAction).toBe(false);
    expect(state.blockReason).toBe("manifest_expired");
  });

  it("supports provider missing as a wallet-connect state", () => {
    const state = deriveUserFlowState({
      wallet: { status: "providerMissing", account: null, chainId: null },
      run: null,
      nowUnix: 1
    });

    expect(state.primaryCta).toBe("connect_wallet");
    expect(state.blockReason).toBe("wallet_disconnected");
  });

  it("completes every progress step for a matched receipt", () => {
    const state = deriveUserFlowState({
      wallet: { status: "connected", account: wallet, chainId: 91342 },
      run: {
        status: "matched",
        runId: "run_1",
        expiryUnix: 1_800_000_100,
        manifestPreview,
        approveTxHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
        depositTxHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
        receiptHash: "0x3333333333333333333333333333333333333333333333333333333333333333"
      },
      nowUnix: 1_800_000_000
    });

    expect(state.progress.every((step) => step.state === "complete")).toBe(true);
    expect(state.primaryCta).toBe("view_receipt");
  });
});

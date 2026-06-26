import { describe, expect, it } from "vitest";
import { buildUserReceiptView } from "./userReceiptView";

const receiptInput = {
  status: "matched" as const,
  receiptHash: "0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8",
  depositTxHash: "0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30",
  blockNumber: 28483877,
  wallet: "0xf3a729973559082260e742ebedf705271ad29476",
  actionName: "First mock vault action",
  networkName: "GIWA Sepolia",
  technical: {
    intentHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    verifierInputHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    target: "0x1111111111111111111111111111111111111111",
    selector: "0x47e7ef24",
    asset: "0x2222222222222222222222222222222222222222",
    spender: "0x3333333333333333333333333333333333333333",
    blockHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
  }
};

describe("buildUserReceiptView", () => {
  it("projects matched receipt fields into a user-safe view", () => {
    const view = buildUserReceiptView(receiptInput);

    expect(view.state).toBe("verified");
    expect(view.summary.receiptId).toBe("0x057b0c02...74be8");
    expect(view.share.copyLabel).toBe("Copy receipt link");
    expect(view.technicalAccordion).toHaveLength(7);
  });

  it("does not project internal or operator fields", () => {
    const view = buildUserReceiptView({
      status: "pending",
      receiptHash: null,
      depositTxHash: null,
      blockNumber: null,
      wallet: "0xf3a729973559082260e742ebedf705271ad29476",
      actionName: "First mock vault action",
      networkName: "GIWA Sepolia",
      technical: {}
    });

    const json = JSON.stringify(view);
    expect(json).not.toMatch(/gateReason|localDb|blocker|protectedCI|signer/iu);
    expect(view.state).toBe("pending");
  });

  it("maps failed verification to not matched", () => {
    expect(
      buildUserReceiptView({
        ...receiptInput,
        status: "failed",
        receiptHash: null
      }).state
    ).toBe("notMatched");
  });
});

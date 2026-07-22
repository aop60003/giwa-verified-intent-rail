import { describe, expect, it } from "vitest";
import { buildUserReceiptView } from "./userReceiptView";

const receiptInput = {
  status: "matched" as const,
  receiptHash: `0x${"0".repeat(64)}`,
  depositTxHash: `0x${"6".repeat(64)}`,
  blockNumber: 28_483_877,
  blockHash: `0x${"c".repeat(64)}`,
  confirmationDepth: 3,
  verifierInputHash: `0x${"b".repeat(64)}`,
  wallet: "0xf3a729973559082260e742ebedf705271ad29476",
  target: "0x1111111111111111111111111111111111111111",
  asset: "0x2222222222222222222222222222222222222222",
  amountBaseUnits: "1000000000000000000",
  issuedAt: 1_800_000_000,
  safetyNotice: "Testnet-only mock action evidence.",
  actionName: "First mock vault action",
  networkName: "GIWA Sepolia"
};

describe("buildUserReceiptView", () => {
  it("projects every matched public Receipt field without truncating evidence", () => {
    const receipt = buildUserReceiptView(receiptInput);

    expect(receipt.state).toBe("verified");
    expect(receipt.summary).toMatchObject({
      receiptHash: receiptInput.receiptHash,
      depositTxHash: receiptInput.depositTxHash,
      wallet: receiptInput.wallet,
      target: receiptInput.target,
      asset: receiptInput.asset,
      amountBaseUnits: receiptInput.amountBaseUnits,
      blockNumber: "28483877",
      blockHash: receiptInput.blockHash,
      confirmationDepth: "3",
      verifierInputHash: receiptInput.verifierInputHash,
      issuedAt: "2027-01-15T08:00:00.000Z",
      safetyNotice: receiptInput.safetyNotice
    });
    expect(receipt.share.path).toBe(`/user/receipt/${receiptInput.receiptHash}`);
  });

  it("does not project internal, operator, or capability fields", () => {
    const receipt = buildUserReceiptView({
      ...receiptInput,
      status: "pending",
      receiptHash: null,
      depositTxHash: null,
      blockNumber: null,
      blockHash: null,
      confirmationDepth: null,
      verifierInputHash: null,
      issuedAt: null,
      safetyNotice: null
    });

    const json = JSON.stringify(receipt);
    expect(json).not.toMatch(/gateReason|localDb|blocker|protectedCI|signer|capability/iu);
    expect(receipt.state).toBe("pending");
  });

  it("maps failed verification to not matched", () => {
    expect(buildUserReceiptView({ ...receiptInput, status: "failed", receiptHash: null }).state).toBe("notMatched");
  });
});

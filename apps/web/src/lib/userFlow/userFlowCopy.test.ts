import { describe, expect, it } from "vitest";
import { userBlockCopy, userCtaCopy, userProgressCopy, userReceiptStateCopy } from "./userFlowCopy";

const allCopy = [
  ...Object.values(userCtaCopy),
  ...Object.values(userBlockCopy),
  ...Object.values(userReceiptStateCopy),
  ...Object.values(userProgressCopy).flatMap((step) => [step.label, step.detail])
].join("\n");

describe("userFlowCopy", () => {
  it("maps core CTA and blocker states to bounded user copy", () => {
    expect(userCtaCopy.connect_wallet).toBe("Connect wallet");
    expect(userCtaCopy.switch_network).toBe("Switch to GIWA Sepolia");
    expect(userBlockCopy.wrong_network).toBe("Switch to GIWA Sepolia to continue.");
    expect(userBlockCopy.manifest_expired).toBe("Review a fresh intent before continuing.");
  });

  it("keeps implementation and operator wording out of user copy", () => {
    expect(allCopy).not.toMatch(/gateReason|blocker register|protected CI|signer role|stack trace|exception/iu);
    expect(allCopy).not.toMatch(/server-only|internal gate|production asset|production yield|identity service|safety guarantee/iu);
  });

  it("labels final verification source without claiming fast feedback finality", () => {
    expect(userProgressCopy.standard_rpc_receipt_found.detail).toContain("standard RPC");
    expect(allCopy).not.toMatch(/preconfirmed success|final in/iu);
  });
});

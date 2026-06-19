import { describe, expect, it } from "vitest";

import { evaluateWalletTransactionGuard } from "./walletTransactionGuard.ts";

const wallet = {
  status: "connected" as const,
  account: "0x1111111111111111111111111111111111111111" as const,
  chainId: 91342
};

const run = {
  status: "manifestIssued",
  wallet: "0x1111111111111111111111111111111111111111",
  expiryUnix: 1790003600,
  manifestPreview: {
    target: "0x2222222222222222222222222222222222222222",
    selector: "0x47e7ef24",
    asset: "0x3333333333333333333333333333333333333333",
    amountBaseUnits: "1000000000000000000",
    spender: "0x2222222222222222222222222222222222222222",
    maxAllowanceBaseUnits: "1000000000000000000",
    expiryUnix: 1790003600,
    intentHash: `0x${"a".repeat(64)}`
  }
};

describe("wallet transaction guard", () => {
  it("allows tx requests only for a connected wallet on GIWA Sepolia with a valid manifest", () => {
    expect(evaluateWalletTransactionGuard({ wallet, run, nowUnix: 1790000000 })).toEqual({
      canRequestTransaction: true,
      blocker: null
    });
  });

  it("blocks wrong chain, disconnected wallet, invalidated manifest, and expired manifest", () => {
    expect(
      evaluateWalletTransactionGuard({
        wallet: { ...wallet, chainId: 1, status: "wrongChain" },
        run,
        nowUnix: 1790000000
      }).blocker
    ).toBe("wrong_chain");
    expect(
      evaluateWalletTransactionGuard({
        wallet: { status: "disconnected", account: null, chainId: null },
        run,
        nowUnix: 1790000000
      }).blocker
    ).toBe("wallet_not_connected");
    expect(evaluateWalletTransactionGuard({ wallet, run: { ...run, status: "manifestInvalidated" }, nowUnix: 1790000000 }).blocker).toBe(
      "manifest_invalidated"
    );
    expect(evaluateWalletTransactionGuard({ wallet, run, nowUnix: 1790003601 }).blocker).toBe("manifest_expired");
  });
});

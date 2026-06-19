import { describe, expect, it } from "vitest";

import { invalidateManifestForWalletChange } from "./liveManifestState.ts";

const run = {
  runId: "run-1",
  wallet: "0x1111111111111111111111111111111111111111",
  chainId: 91342,
  status: "manifestIssued",
  intentHash: `0x${"a".repeat(64)}`
};

describe("manifest invalidation", () => {
  it("invalidates a manifest when the account changes", () => {
    expect(
      invalidateManifestForWalletChange(run, {
        account: "0x2222222222222222222222222222222222222222",
        chainId: 91342
      })
    ).toMatchObject({
      status: "manifestInvalidated",
      reason: "account_changed"
    });
  });

  it("invalidates a manifest when the chain changes", () => {
    expect(
      invalidateManifestForWalletChange(run, {
        account: "0x1111111111111111111111111111111111111111",
        chainId: 1
      })
    ).toMatchObject({
      status: "manifestInvalidated",
      reason: "chain_changed"
    });
  });

  it("keeps the manifest valid when account and chain are unchanged", () => {
    expect(
      invalidateManifestForWalletChange(run, {
        account: "0x1111111111111111111111111111111111111111",
        chainId: 91342
      })
    ).toMatchObject({ status: "manifestIssued", reason: null });
  });
});

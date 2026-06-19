import { describe, expect, it } from "vitest";
import { encodeFunctionData, parseAbi } from "viem";

import { buildMockVaultDepositCalldata } from "./mockVaultDepositCalldata.ts";

const vaultAbi = parseAbi(["function deposit(address asset,uint256 amount)"]);

describe("mock vault deposit calldata", () => {
  it("encodes deposit(address,uint256) from manifest asset and amount", () => {
    const asset = "0x3333333333333333333333333333333333333333";
    const amount = "1000000000000000000";

    expect(buildMockVaultDepositCalldata({ asset, amountBaseUnits: amount })).toBe(
      encodeFunctionData({
        abi: vaultAbi,
        functionName: "deposit",
        args: [asset, BigInt(amount)]
      })
    );
  });

  it("rejects malformed manifest fields", () => {
    expect(() => buildMockVaultDepositCalldata({ asset: "0x1234", amountBaseUnits: "1" })).toThrow(
      "asset must be a valid address"
    );
    expect(() =>
      buildMockVaultDepositCalldata({
        asset: "0x3333333333333333333333333333333333333333",
        amountBaseUnits: "1.0"
      })
    ).toThrow("amountBaseUnits must be a base-unit decimal string");
  });
});

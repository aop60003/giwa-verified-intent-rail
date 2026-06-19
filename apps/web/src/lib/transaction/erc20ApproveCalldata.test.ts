import { describe, expect, it } from "vitest";
import { encodeFunctionData, parseAbi } from "viem";

import { buildErc20ApproveCalldata } from "./erc20ApproveCalldata.ts";

const erc20Abi = parseAbi(["function approve(address spender,uint256 amount)"]);

describe("ERC-20 approve calldata", () => {
  it("encodes approve(spender,uint256) from manifest spender and max allowance", () => {
    const spender = "0x2222222222222222222222222222222222222222";
    const amount = "1000000000000000000";

    expect(buildErc20ApproveCalldata({ spender, amountBaseUnits: amount })).toBe(
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, BigInt(amount)]
      })
    );
  });

  it("rejects invalid spender and amount", () => {
    expect(() => buildErc20ApproveCalldata({ spender: "not-address", amountBaseUnits: "1" })).toThrow(
      "spender must be a valid address"
    );
    expect(() =>
      buildErc20ApproveCalldata({
        spender: "0x2222222222222222222222222222222222222222",
        amountBaseUnits: "-1"
      })
    ).toThrow("amountBaseUnits must be a base-unit decimal string");
  });
});

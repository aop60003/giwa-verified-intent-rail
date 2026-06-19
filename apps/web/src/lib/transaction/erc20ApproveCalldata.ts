import { encodeFunctionData, isAddress, parseAbi, type Hex } from "viem";

const erc20Abi = parseAbi(["function approve(address spender,uint256 amount)"]);

function requireAddress(value: string, field: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) {
    throw new Error(`${field} must be a valid address`);
  }

  return value.toLowerCase() as `0x${string}`;
}

function requireBaseUnitString(value: string, field: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error(`${field} must be a base-unit decimal string`);
  }

  return BigInt(value);
}

export function buildErc20ApproveCalldata(input: { spender: string; amountBaseUnits: string }): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [requireAddress(input.spender, "spender"), requireBaseUnitString(input.amountBaseUnits, "amountBaseUnits")]
  });
}

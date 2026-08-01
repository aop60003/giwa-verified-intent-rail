import { encodeFunctionData, isAddress, parseAbi, type Hex } from "viem";

const mockTokenAbi = parseAbi(["function mint(address to,uint256 amount)"]);

function requireAddress(value: string, field: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) {
    throw new Error(`${field} must be a valid address`);
  }

  return value.toLowerCase() as `0x${string}`;
}

function requirePositiveBaseUnitString(value: string, field: string): bigint {
  if (!/^[1-9][0-9]*$/u.test(value)) {
    throw new Error(`${field} must be a positive base-unit decimal string`);
  }

  return BigInt(value);
}

export function buildMockTokenMintCalldata(input: { to: string; amountBaseUnits: string }): Hex {
  return encodeFunctionData({
    abi: mockTokenAbi,
    functionName: "mint",
    args: [requireAddress(input.to, "to"), requirePositiveBaseUnitString(input.amountBaseUnits, "amountBaseUnits")]
  });
}

import { encodeFunctionData, isAddress, parseAbi, type Hex } from "viem";

const vaultAbi = parseAbi(["function deposit(address asset,uint256 amount)"]);

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

export function buildMockVaultDepositCalldata(input: { asset: string; amountBaseUnits: string }): Hex {
  return encodeFunctionData({
    abi: vaultAbi,
    functionName: "deposit",
    args: [requireAddress(input.asset, "asset"), requireBaseUnitString(input.amountBaseUnits, "amountBaseUnits")]
  });
}

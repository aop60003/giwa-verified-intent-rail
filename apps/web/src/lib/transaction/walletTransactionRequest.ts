import { isAddress, type Hex } from "viem";

import { buildErc20ApproveCalldata } from "./erc20ApproveCalldata.ts";
import { buildMockVaultDepositCalldata } from "./mockVaultDepositCalldata.ts";

export type LiveManifestPreviewFields = {
  target: string;
  selector: string;
  asset: string;
  amountBaseUnits: string;
  spender: string;
  maxAllowanceBaseUnits: string;
  expiryUnix: number;
  intentHash: string;
};

export type WalletTransactionRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  data: Hex;
  value: "0x0";
};

function requireAddress(value: string, field: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) {
    throw new Error(`${field} must be a valid address`);
  }

  return value.toLowerCase() as `0x${string}`;
}

export function buildApproveTransactionRequest(input: {
  from: string;
  preview: LiveManifestPreviewFields;
}): WalletTransactionRequest {
  return {
    from: requireAddress(input.from, "from"),
    to: requireAddress(input.preview.asset, "asset"),
    data: buildErc20ApproveCalldata({
      spender: input.preview.spender,
      amountBaseUnits: input.preview.maxAllowanceBaseUnits
    }),
    value: "0x0"
  };
}

export function buildDepositTransactionRequest(input: {
  from: string;
  preview: LiveManifestPreviewFields;
}): WalletTransactionRequest {
  return {
    from: requireAddress(input.from, "from"),
    to: requireAddress(input.preview.target, "target"),
    data: buildMockVaultDepositCalldata({
      asset: input.preview.asset,
      amountBaseUnits: input.preview.amountBaseUnits
    }),
    value: "0x0"
  };
}

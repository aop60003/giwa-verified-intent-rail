export type WalletAssetNext = "gas_required" | "mint_required" | "approval_required" | "deposit_ready";

export function evaluateWalletAssetReadiness(input: {
  gasWei: bigint;
  minGasWei: bigint;
  tokenBalance: bigint;
  requiredAmount: bigint;
  allowance: bigint;
}): { next: WalletAssetNext; approveRequired: boolean } {
  if (
    input.gasWei < 0n ||
    input.minGasWei < 0n ||
    input.tokenBalance < 0n ||
    input.requiredAmount <= 0n ||
    input.allowance < 0n
  ) {
    throw new Error("wallet asset readiness values are out of range");
  }

  const approveRequired = input.allowance < input.requiredAmount;

  if (input.gasWei < input.minGasWei) return { next: "gas_required", approveRequired };
  if (input.tokenBalance < input.requiredAmount) return { next: "mint_required", approveRequired };
  if (approveRequired) return { next: "approval_required", approveRequired: true };
  return { next: "deposit_ready", approveRequired: false };
}

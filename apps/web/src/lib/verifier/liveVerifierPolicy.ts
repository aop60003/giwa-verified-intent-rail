import { GIWA_SEPOLIA_CHAIN_ID, type Address } from "../../../../../packages/protocol/src/index.ts";
import { normalizeAddress, requirePositiveInteger } from "../../../../../packages/protocol/src/validation.ts";

export type LiveAmountPolicy = "exact" | "max";
export type LiveAllowancePolicy = "exact" | "max";

export type LiveVerifierPolicyInput = {
  chainId: number;
  officialCampaignSigner: string;
  intentRailAddress: string;
  mockTokenAddress: string;
  mockVaultAddress: string;
  minConfirmations: number;
  amountPolicy: LiveAmountPolicy;
  allowancePolicy: LiveAllowancePolicy;
};

export type LiveVerifierPolicy = {
  chainId: typeof GIWA_SEPOLIA_CHAIN_ID;
  officialCampaignSigner: Address;
  intentRailAddress: Address;
  mockTokenAddress: Address;
  mockVaultAddress: Address;
  minConfirmations: number;
  amountPolicy: LiveAmountPolicy;
  allowancePolicy: LiveAllowancePolicy;
};

export function normalizeLiveVerifierPolicy(input: LiveVerifierPolicyInput): LiveVerifierPolicy {
  if (input.chainId !== GIWA_SEPOLIA_CHAIN_ID) throw new Error("chainId must be 91342");
  if (input.amountPolicy !== "exact" && input.amountPolicy !== "max") throw new Error("amountPolicy is invalid");
  if (input.allowancePolicy !== "exact" && input.allowancePolicy !== "max") {
    throw new Error("allowancePolicy is invalid");
  }

  return {
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    officialCampaignSigner: normalizeAddress(input.officialCampaignSigner, "officialCampaignSigner"),
    intentRailAddress: normalizeAddress(input.intentRailAddress, "intentRailAddress"),
    mockTokenAddress: normalizeAddress(input.mockTokenAddress, "mockTokenAddress"),
    mockVaultAddress: normalizeAddress(input.mockVaultAddress, "mockVaultAddress"),
    minConfirmations: requirePositiveInteger(input.minConfirmations, "minConfirmations"),
    amountPolicy: input.amountPolicy,
    allowancePolicy: input.allowancePolicy
  };
}

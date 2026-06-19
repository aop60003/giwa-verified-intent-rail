import { getAddress, type Address } from "viem";

export type FundingRole = "deployer" | "verifier" | "intentSubmitter" | "demoWallet";

export type FundingRequirement = {
  role: FundingRole;
  address: Address;
  currentBalanceWei: bigint;
  targetBalanceWei: bigint;
};

export type FundingTransfer = {
  role: FundingRole;
  address: Address;
  valueWei: bigint;
};

export type FundingPlanSummaryInput = {
  funderAddress: Address;
  funderBalanceWei: bigint;
  estimatedTransferGasWei: bigint;
  transfers: FundingTransfer[];
  blockers: string[];
  secretLikeInput?: string;
};

export function buildFundingTransfers(
  requirements: readonly FundingRequirement[],
  funderAddress: Address
): FundingTransfer[] {
  const normalizedFunderAddress = getAddress(funderAddress);

  return requirements.flatMap((requirement) => {
    const address = getAddress(requirement.address);
    if (address === normalizedFunderAddress || requirement.currentBalanceWei >= requirement.targetBalanceWei) {
      return [];
    }

    return [
      {
        role: requirement.role,
        address,
        valueWei: requirement.targetBalanceWei - requirement.currentBalanceWei
      }
    ];
  });
}

export function totalFundingValueWei(transfers: readonly FundingTransfer[]): bigint {
  return transfers.reduce((total, transfer) => total + transfer.valueWei, 0n);
}

export function summarizeFundingPlan(input: FundingPlanSummaryInput) {
  const totalTransferValueWei = totalFundingValueWei(input.transfers);

  return {
    funderAddress: input.funderAddress,
    funderBalanceWei: input.funderBalanceWei.toString(),
    transferCount: input.transfers.length,
    totalTransferValueWei: totalTransferValueWei.toString(),
    estimatedTransferGasWei: input.estimatedTransferGasWei.toString(),
    estimatedTotalRequiredWei: (totalTransferValueWei + input.estimatedTransferGasWei).toString(),
    transfers: input.transfers.map((transfer) => ({
      role: transfer.role,
      address: transfer.address,
      valueWei: transfer.valueWei.toString()
    })),
    blockers: input.blockers
  };
}

export type ManifestInvalidationRun = {
  runId: string;
  wallet: string;
  chainId: number;
  status: string;
  intentHash: string;
};

export type ManifestInvalidationWallet = {
  account: string | null;
  chainId: number | null;
};

export function invalidateManifestForWalletChange(
  run: ManifestInvalidationRun,
  wallet: ManifestInvalidationWallet
): ManifestInvalidationRun & { reason: "account_changed" | "chain_changed" | null } {
  if (wallet.account === null || wallet.account.toLowerCase() !== run.wallet.toLowerCase()) {
    return { ...run, status: "manifestInvalidated", reason: "account_changed" };
  }

  if (wallet.chainId !== run.chainId) {
    return { ...run, status: "manifestInvalidated", reason: "chain_changed" };
  }

  return { ...run, reason: null };
}

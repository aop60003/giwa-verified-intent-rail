export const LIVE_FAILURE_CODES = [
  "SIGNER_MISMATCH",
  "INTENT_HASH_MISMATCH",
  "VERIFYING_CONTRACT_MISMATCH",
  "TARGET_MISMATCH",
  "SELECTOR_MISMATCH",
  "ASSET_MISMATCH",
  "AMOUNT_MISMATCH",
  "SPENDER_MISMATCH",
  "ALLOWANCE_EXCEEDED",
  "TX_FAILED",
  "EXPIRED",
  "MISSING_REQUIRED_LOG",
  "UNDER_CONFIRMED",
  "WRONG_CHAIN"
] as const;

export type LiveFailureCode = (typeof LIVE_FAILURE_CODES)[number];

const RAW_TO_CODE = new Map<string, LiveFailureCode>([
  ["SIGNER_MISMATCH", "SIGNER_MISMATCH"],
  ["INTENT_HASH_MISMATCH", "INTENT_HASH_MISMATCH"],
  ["VERIFYING_CONTRACT_MISMATCH", "VERIFYING_CONTRACT_MISMATCH"],
  ["TARGET_MISMATCH", "TARGET_MISMATCH"],
  ["SELECTOR_MISMATCH", "SELECTOR_MISMATCH"],
  ["ASSET_MISMATCH", "ASSET_MISMATCH"],
  ["AMOUNT_MISMATCH", "AMOUNT_MISMATCH"],
  ["SPENDER_MISMATCH", "SPENDER_MISMATCH"],
  ["ALLOWANCE_EXCEEDED", "ALLOWANCE_EXCEEDED"],
  ["RECEIPT_REVERTED", "TX_FAILED"],
  ["TX_FAILED", "TX_FAILED"],
  ["EXPIRED", "EXPIRED"],
  ["UNCONFIRMED", "UNDER_CONFIRMED"],
  ["UNDER_CONFIRMED", "UNDER_CONFIRMED"],
  ["WRONG_CHAIN", "WRONG_CHAIN"],
  ["TX_HASH_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["WALLET_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["DEPOSIT_CALL_INVALID", "MISSING_REQUIRED_LOG"],
  ["APPROVAL_LOG_MISSING", "MISSING_REQUIRED_LOG"],
  ["APPROVAL_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["TRANSFER_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["DEPOSIT_LOG_MISMATCH", "MISSING_REQUIRED_LOG"],
  ["MISSING_REQUIRED_LOG", "MISSING_REQUIRED_LOG"]
]);

export function toBoundedFailureCode(raw: string | null): LiveFailureCode | null {
  if (raw === null) return null;
  return RAW_TO_CODE.get(raw) ?? "MISSING_REQUIRED_LOG";
}

export function failureCodeDisplayCopy(code: LiveFailureCode): string {
  return {
    SIGNER_MISMATCH: "Manifest signer did not match the configured campaign signer. Receipt stays locked.",
    INTENT_HASH_MISMATCH: "Manifest hash did not match the stored run. Receipt stays locked.",
    VERIFYING_CONTRACT_MISMATCH: "Manifest domain did not match the deployed rail. Receipt stays locked.",
    TARGET_MISMATCH: "Transaction target evidence did not match the manifest. Receipt stays locked.",
    SELECTOR_MISMATCH: "Transaction selector evidence did not match the manifest. Receipt stays locked.",
    ASSET_MISMATCH: "Asset evidence did not match the manifest. Receipt stays locked.",
    AMOUNT_MISMATCH: "Deposit amount evidence did not match the manifest. Receipt stays locked.",
    SPENDER_MISMATCH: "Allowance spender evidence did not match the manifest. Receipt stays locked.",
    ALLOWANCE_EXCEEDED: "Allowance evidence exceeded the manifest bound. Receipt stays locked.",
    TX_FAILED: "The standard RPC receipt shows the transaction failed. Receipt stays locked.",
    EXPIRED: "The deposit confirmed after the manifest expiry. Receipt stays locked.",
    MISSING_REQUIRED_LOG: "Required standard RPC receipt evidence was missing. Receipt stays locked.",
    UNDER_CONFIRMED: "The transaction has not reached the required standard RPC confirmation depth. Receipt stays locked.",
    WRONG_CHAIN: "Standard RPC evidence came from the wrong chain. Receipt stays locked."
  }[code];
}

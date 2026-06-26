const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/u;

export type RecoveryTxHashValidation =
  | { ok: true; txHash: string }
  | { ok: false; reason: "invalid_tx_hash" };

export type SupportSummaryInput = {
  wallet: string | null;
  actionName: string;
  depositTxHash: string | null;
  receiptHash: string | null;
};

function shortHash(value: string | null): string {
  if (typeof value !== "string" || value.length <= 18) return String(value ?? "pending");
  return `${value.slice(0, 10)}...${value.slice(-5)}`;
}

export function validateRecoveryTxHash(value: string): RecoveryTxHashValidation {
  const trimmed = value.trim();
  if (!TX_HASH_PATTERN.test(trimmed)) return { ok: false, reason: "invalid_tx_hash" };
  return { ok: true, txHash: trimmed.toLowerCase() };
}

export function buildSupportSummary(input: SupportSummaryInput): string {
  return [
    `Action: ${input.actionName}`,
    `Wallet: ${shortHash(input.wallet)}`,
    `Deposit transaction: ${shortHash(input.depositTxHash)}`,
    `Receipt: ${shortHash(input.receiptHash)}`
  ].join("\n");
}

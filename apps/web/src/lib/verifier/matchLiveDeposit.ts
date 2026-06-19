import type { ActionManifest, Hex, VerifierDecision } from "../../../../../packages/protocol/src/index.ts";
import { normalizeAddress, normalizeBytes32 } from "../../../../../packages/protocol/src/validation.ts";

import type { SubmittedTxRecord } from "../live/liveTypes.ts";
import type { DecodedLogSnapshot } from "./decodeEvidence.ts";
import { decodeDepositCall } from "./depositReceiptDecoder.ts";
import type { StandardRpcReceiptSnapshot, StandardRpcTransactionSnapshot } from "./standardRpcReceiptClient.ts";

export type LiveDepositMatchInput = {
  manifest: ActionManifest;
  submittedTx: SubmittedTxRecord;
  transaction: StandardRpcTransactionSnapshot;
  receipt: StandardRpcReceiptSnapshot;
  decodedLogSnapshots: readonly DecodedLogSnapshot[];
  confirmationDepth: number;
  minConfirmations?: number;
  depositBlockTimestamp?: number;
  amountPolicy?: "exact" | "max";
  allowancePolicy?: "exact" | "max";
};

export type LiveReceiptCandidate = {
  depositBlockNumber: number;
  depositBlockHash: Hex;
  allowanceUsedBaseUnits: string;
  testnetDepositAmountDelta: string;
};

export type LiveDepositMatchResult = {
  decision: VerifierDecision;
  failureReason: string | null;
  receiptCandidate?: LiveReceiptCandidate;
};

function lower(value: string): string {
  return value.toLowerCase();
}

function arg(log: DecodedLogSnapshot | undefined, key: string): string | undefined {
  const value = log?.args[key];
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

function sourceMatches(log: DecodedLogSnapshot, txHash: string, blockNumber?: number, blockHash?: string): boolean {
  if (lower(log.sourceTxHash) !== lower(txHash)) return false;
  if (blockNumber !== undefined && log.blockNumber !== blockNumber) return false;
  if (blockHash !== undefined && lower(log.blockHash) !== lower(blockHash)) return false;
  return true;
}

function findLog(
  logs: readonly DecodedLogSnapshot[],
  eventName: string,
  predicate: (log: DecodedLogSnapshot) => boolean
): DecodedLogSnapshot | undefined {
  return logs.find((log) => log.eventName === eventName && predicate(log));
}

function mismatch(failureReason: string): LiveDepositMatchResult {
  return { decision: "mismatched", failureReason };
}

export function matchLiveDeposit(input: LiveDepositMatchInput): LiveDepositMatchResult {
  const minConfirmations = input.minConfirmations ?? 3;
  const amountPolicy = input.amountPolicy ?? "exact";
  const allowancePolicy = input.allowancePolicy ?? "exact";

  if (input.receipt.status === "reverted") return { decision: "failed", failureReason: "TX_FAILED" };
  if (input.confirmationDepth < minConfirmations) return { decision: "timeout", failureReason: "UNDER_CONFIRMED" };
  if (input.depositBlockTimestamp !== undefined && input.depositBlockTimestamp > input.manifest.expiryUnix) {
    return mismatch("EXPIRED");
  }

  if (normalizeBytes32(input.transaction.hash, "transaction hash") !== lower(input.submittedTx.depositTxHash)) {
    return mismatch("TX_HASH_MISMATCH");
  }
  if (normalizeAddress(input.transaction.from, "transaction from") !== normalizeAddress(input.manifest.wallet, "wallet")) {
    return mismatch("WALLET_MISMATCH");
  }
  if (input.transaction.to === null || normalizeAddress(input.transaction.to, "transaction to") !== normalizeAddress(input.manifest.target, "target")) {
    return mismatch("TARGET_MISMATCH");
  }

  let call;
  try {
    call = decodeDepositCall(input.transaction.input);
  } catch {
    return mismatch("DEPOSIT_CALL_INVALID");
  }
  if (lower(call.selector) !== lower(input.manifest.selector)) return mismatch("SELECTOR_MISMATCH");
  if (normalizeAddress(call.asset, "deposit asset") !== normalizeAddress(input.manifest.asset, "manifest asset")) {
    return mismatch("ASSET_MISMATCH");
  }
  const callAmount = BigInt(call.amountBaseUnits);
  const manifestAmount = BigInt(input.manifest.amountBaseUnits);
  if (amountPolicy === "exact" && call.amountBaseUnits !== input.manifest.amountBaseUnits) return mismatch("AMOUNT_MISMATCH");
  if (amountPolicy === "max" && callAmount > manifestAmount) return mismatch("AMOUNT_MISMATCH");

  if (input.submittedTx.approveTxHash !== null) {
    const approval = findLog(
      input.decodedLogSnapshots,
      "Approval",
      (log) =>
        sourceMatches(log, input.submittedTx.approveTxHash ?? "") &&
        normalizeAddress(log.contractAddress, "approval address") === normalizeAddress(input.manifest.asset, "asset") &&
        arg(log, "owner") === lower(input.manifest.wallet)
    );
    if (approval === undefined) return mismatch("MISSING_REQUIRED_LOG");
    if (arg(approval, "spender") !== lower(input.manifest.spender)) return mismatch("SPENDER_MISMATCH");
    const approvalAmount = arg(approval, "amount");
    if (approvalAmount === undefined) return mismatch("MISSING_REQUIRED_LOG");
    const approvalAmountValue = BigInt(approvalAmount);
    const maxAllowanceValue = BigInt(input.manifest.maxAllowanceBaseUnits);
    if (
      approvalAmountValue > maxAllowanceValue ||
      (allowancePolicy === "exact" && approvalAmount !== input.manifest.maxAllowanceBaseUnits)
    ) {
      return mismatch("ALLOWANCE_EXCEEDED");
    }
  }

  const transfer = findLog(
    input.decodedLogSnapshots,
    "Transfer",
    (log) =>
      sourceMatches(log, input.submittedTx.depositTxHash, input.receipt.blockNumber, input.receipt.blockHash) &&
      normalizeAddress(log.contractAddress, "transfer address") === normalizeAddress(input.manifest.asset, "asset") &&
      arg(log, "from") === lower(input.manifest.wallet) &&
      arg(log, "to") === lower(input.manifest.target) &&
      arg(log, "amount") === input.manifest.amountBaseUnits
  );
  if (transfer === undefined) {
    return mismatch("MISSING_REQUIRED_LOG");
  }

  const deposit = findLog(
    input.decodedLogSnapshots,
    "MockDeposit",
    (log) =>
      sourceMatches(log, input.submittedTx.depositTxHash, input.receipt.blockNumber, input.receipt.blockHash) &&
      normalizeAddress(log.contractAddress, "deposit address") === normalizeAddress(input.manifest.target, "target") &&
      arg(log, "wallet") === lower(input.manifest.wallet) &&
      arg(log, "asset") === lower(input.manifest.asset) &&
      arg(log, "amount") === input.manifest.amountBaseUnits
  );
  if (deposit === undefined) {
    return mismatch("MISSING_REQUIRED_LOG");
  }

  if (
    amountPolicy === "max" &&
    (BigInt(arg(transfer, "amount") ?? "0") > manifestAmount || BigInt(arg(deposit, "amount") ?? "0") > manifestAmount)
  ) {
    return mismatch("AMOUNT_MISMATCH");
  }

  return {
    decision: "matched",
    failureReason: null,
    receiptCandidate: {
      depositBlockNumber: input.receipt.blockNumber,
      depositBlockHash: input.receipt.blockHash,
      allowanceUsedBaseUnits: input.manifest.amountBaseUnits,
      testnetDepositAmountDelta: input.manifest.amountBaseUnits
    }
  };
}

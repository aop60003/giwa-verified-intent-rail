import { computeReceiptHash, type Hex, type ReceiptPayload } from "../../../../../packages/protocol/src/index.ts";
import { normalizeBytes32 } from "../../../../../packages/protocol/src/validation.ts";

export type StoredReceipt = {
  intentHash: Hex;
  depositTxHash: Hex;
  receiptHash: Hex;
  payload: ReceiptPayload;
};

export type ReceiptStore = {
  get(intentHash: Hex): StoredReceipt | undefined;
  saveMatched(input: {
    intentHash: Hex;
    depositTxHash: Hex;
    receiptPayload: ReceiptPayload;
  }): StoredReceipt;
};

export function createMemoryReceiptStore(): ReceiptStore {
  const byIntentHash = new Map<Hex, StoredReceipt>();

  return {
    get(intentHash) {
      return byIntentHash.get(normalizeBytes32(intentHash, "intentHash"));
    },
    saveMatched(input) {
      const intentHash = normalizeBytes32(input.intentHash, "intentHash");
      const depositTxHash = normalizeBytes32(input.depositTxHash, "depositTxHash");
      const existing = byIntentHash.get(intentHash);

      if (existing !== undefined) {
        if (existing.depositTxHash !== depositTxHash) {
          throw new Error("intentHash already has a terminal decision");
        }

        return existing;
      }

      const stored: StoredReceipt = {
        intentHash,
        depositTxHash,
        payload: input.receiptPayload,
        receiptHash: computeReceiptHash(input.receiptPayload)
      };
      byIntentHash.set(intentHash, stored);

      return stored;
    }
  };
}

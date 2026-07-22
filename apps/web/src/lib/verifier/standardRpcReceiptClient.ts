import { createPublicClient, http, type Hex } from "viem";

export type StandardRpcLogSnapshot = {
  address: string;
  data: Hex;
  topics: readonly Hex[];
  logIndex: number;
  sourceTxHash: Hex;
  blockNumber: number;
  blockHash: Hex;
};

export type StandardRpcTransactionSnapshot = {
  hash: Hex;
  from: string;
  to: string | null;
  input: Hex;
  value: string;
};

export type StandardRpcReceiptSnapshot = {
  status: "success" | "reverted";
  blockNumber: number;
  blockHash: Hex;
  logs: StandardRpcLogSnapshot[];
};

export type StandardRpcBlockSnapshot = {
  blockNumber: number;
  blockHash: Hex;
  timestamp: number;
};

export type StandardRpcTransactionBundle = {
  depositTxHash: Hex;
  transaction: StandardRpcTransactionSnapshot;
  receipt: StandardRpcReceiptSnapshot;
  depositBlock: StandardRpcBlockSnapshot;
  rawTransaction: Record<string, unknown>;
  rawReceipt: Record<string, unknown>;
  rawDepositBlock: Record<string, unknown>;
  headBlockNumber: number;
  confirmationDepth: number;
};

export type StandardRpcTransport = {
  getChainId(input?: unknown): Promise<number>;
  getTransaction(input?: { hash: Hex }): Promise<Record<string, unknown>>;
  getTransactionReceipt(input?: { hash: Hex }): Promise<Record<string, unknown>>;
  getBlockNumber(input?: unknown): Promise<bigint | number>;
  getBlock?(input?: { blockNumber: bigint }): Promise<Record<string, unknown>>;
};

export type StandardRpcReceiptClient = {
  chainId: number;
  timeoutMs: number;
  transport: StandardRpcTransport;
};

export type CreateStandardRpcReceiptClientInput =
  | {
      chainId: number;
      timeoutMs?: number;
      rpcUrl: string;
      transport?: never;
    }
  | {
      chainId: number;
      timeoutMs?: number;
      rpcUrl?: never;
      transport: StandardRpcTransport;
    };

const DEFAULT_TIMEOUT_MS = 10_000;
export const STANDARD_RPC_RECEIPT_RETRYABLE_CODE = "standard_rpc_receipt_retryable" as const;

export class StandardRpcReceiptRetryableError extends Error {
  readonly code = STANDARD_RPC_RECEIPT_RETRYABLE_CODE;

  constructor() {
    super(STANDARD_RPC_RECEIPT_RETRYABLE_CODE);
    this.name = "StandardRpcReceiptRetryableError";
  }
}

export function isStandardRpcReceiptRetryableError(error: unknown): error is StandardRpcReceiptRetryableError {
  return error instanceof StandardRpcReceiptRetryableError;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new StandardRpcReceiptRetryableError()), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function isReceiptNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: unknown }).code;
  return error.name === "TransactionReceiptNotFoundError" || code === "TRANSACTION_RECEIPT_NOT_FOUND";
}

async function getTransactionReceipt(
  client: StandardRpcReceiptClient,
  txHash: Hex
): Promise<Record<string, unknown>> {
  try {
    return await withTimeout(client.transport.getTransactionReceipt({ hash: txHash }), client.timeoutMs);
  } catch (error) {
    if (isStandardRpcReceiptRetryableError(error)) throw error;
    if (isReceiptNotFound(error)) throw new StandardRpcReceiptRetryableError();
    throw error;
  }
}

function numberFromBlock(value: unknown, field: string): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isInteger(value)) return value;
  throw new Error(`${field} is not a block number`);
}

function hexValue(value: unknown, field: string): Hex {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]*$/u.test(value)) {
    throw new Error(`${field} is not hex`);
  }
  return value.toLowerCase() as Hex;
}

function addressOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("transaction to is not a string");
  return value.toLowerCase();
}

function normalizeTransaction(raw: Record<string, unknown>, fallbackHash: Hex): StandardRpcTransactionSnapshot {
  const value = raw.value;

  return {
    hash: hexValue(raw.hash ?? fallbackHash, "transaction hash"),
    from: String(raw.from).toLowerCase(),
    to: addressOrNull(raw.to),
    input: hexValue(raw.input ?? raw.data ?? "0x", "transaction input"),
    value: typeof value === "bigint" ? value.toString() : String(value ?? "0")
  };
}

function normalizeReceipt(raw: Record<string, unknown>, fallbackTxHash: Hex): StandardRpcReceiptSnapshot {
  const status = raw.status;
  if (status !== "success" && status !== "reverted") {
    throw new Error("receipt status is not success or reverted");
  }
  const logs = Array.isArray(raw.logs) ? raw.logs : [];
  const blockNumber = numberFromBlock(raw.blockNumber, "receipt blockNumber");
  const blockHash = hexValue(raw.blockHash, "receipt blockHash");

  return {
    status,
    blockNumber,
    blockHash,
    logs: logs.map((entry, index) => {
      const log = entry as Record<string, unknown>;
      const topics = Array.isArray(log.topics) ? log.topics.map((topic) => hexValue(topic, "log topic")) : [];
      return {
        address: String(log.address).toLowerCase(),
        data: hexValue(log.data ?? "0x", "log data"),
        topics,
        logIndex: numberFromBlock(log.logIndex ?? index, "logIndex"),
        sourceTxHash: hexValue(log.transactionHash ?? fallbackTxHash, "log transactionHash"),
        blockNumber: numberFromBlock(log.blockNumber ?? blockNumber, "log blockNumber"),
        blockHash: hexValue(log.blockHash ?? blockHash, "log blockHash")
      };
    })
  };
}

function normalizeBlock(raw: Record<string, unknown>, expectedBlockNumber: number, expectedBlockHash: Hex): StandardRpcBlockSnapshot {
  const blockNumber = numberFromBlock(raw.number ?? expectedBlockNumber, "block number");
  const blockHash = hexValue(raw.hash ?? expectedBlockHash, "block hash");
  if (blockNumber !== expectedBlockNumber) throw new Error("deposit block number mismatch");
  if (blockHash !== expectedBlockHash) throw new Error("deposit block hash mismatch");

  return {
    blockNumber,
    blockHash,
    timestamp: numberFromBlock(raw.timestamp, "block timestamp")
  };
}

export function createStandardRpcReceiptClient(input: CreateStandardRpcReceiptClientInput): StandardRpcReceiptClient {
  const transport =
    input.transport ??
    (createPublicClient({
      transport: http(input.rpcUrl)
    }) as unknown as StandardRpcTransport);

  return {
    chainId: input.chainId,
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    transport
  };
}

export async function snapshotTransaction(
  client: StandardRpcReceiptClient,
  txHash: Hex
): Promise<StandardRpcTransactionBundle> {
  const chainId = await withTimeout(client.transport.getChainId(), client.timeoutMs);
  if (chainId !== client.chainId) {
    throw new Error(`wrong chain: expected ${client.chainId}, received ${chainId}`);
  }

  const [transactionRaw, receiptRaw, headRaw] = await Promise.all([
    withTimeout(client.transport.getTransaction({ hash: txHash }), client.timeoutMs),
    getTransactionReceipt(client, txHash),
    withTimeout(client.transport.getBlockNumber(), client.timeoutMs)
  ]);
  const transaction = normalizeTransaction(transactionRaw, txHash);
  const receipt = normalizeReceipt(receiptRaw, txHash);
  const headBlockNumber = numberFromBlock(headRaw, "head blockNumber");
  if (client.transport.getBlock === undefined) {
    throw new Error("eth_getBlockByNumber is unavailable");
  }
  const blockRaw = await withTimeout(
    client.transport.getBlock({ blockNumber: BigInt(receipt.blockNumber) }),
    client.timeoutMs
  );
  const depositBlock = normalizeBlock(blockRaw, receipt.blockNumber, receipt.blockHash);

  return {
    depositTxHash: txHash.toLowerCase() as Hex,
    transaction,
    receipt,
    depositBlock,
    rawTransaction: transactionRaw,
    rawReceipt: receiptRaw,
    rawDepositBlock: blockRaw,
    headBlockNumber,
    confirmationDepth: Math.max(0, headBlockNumber - receipt.blockNumber + 1)
  };
}

export function snapshotDepositTransaction(
  client: StandardRpcReceiptClient,
  depositTxHash: Hex
): Promise<StandardRpcTransactionBundle> {
  return snapshotTransaction(client, depositTxHash);
}

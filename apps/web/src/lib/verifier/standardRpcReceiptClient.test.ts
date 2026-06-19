import { describe, expect, it } from "vitest";

import { createStandardRpcReceiptClient, snapshotDepositTransaction } from "./standardRpcReceiptClient.ts";

describe("standard RPC receipt client", () => {
  it("collects raw transaction, raw receipt, deposit block, bound logs, head block, and confirmation depth", async () => {
    const client = createStandardRpcReceiptClient({
      chainId: 91342,
      timeoutMs: 1000,
      transport: {
        async getChainId() {
          return 91342;
        },
        async getTransaction() {
          return {
            hash: `0x${"a".repeat(64)}`,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            input: "0x47e7ef24",
            value: 0n
          };
        },
        async getTransactionReceipt() {
          return {
            status: "success",
            blockNumber: 10n,
            blockHash: `0x${"b".repeat(64)}`,
            logs: [
              {
                address: "0x3333333333333333333333333333333333333333",
                data: "0x",
                topics: [],
                logIndex: 0n,
                transactionHash: `0x${"a".repeat(64)}`,
                blockNumber: 10n,
                blockHash: `0x${"b".repeat(64)}`
              }
            ]
          };
        },
        async getBlockNumber() {
          return 13n;
        },
        async getBlock() {
          return { number: 10n, hash: `0x${"b".repeat(64)}`, timestamp: 1790000100n };
        }
      }
    });

    const snapshot = await snapshotDepositTransaction(client, `0x${"a".repeat(64)}`);

    expect(snapshot.depositTxHash).toBe(`0x${"a".repeat(64)}`);
    expect(snapshot.confirmationDepth).toBe(4);
    expect(snapshot.headBlockNumber).toBe(13);
    expect(snapshot.depositBlock).toMatchObject({
      blockNumber: 10,
      blockHash: `0x${"b".repeat(64)}`,
      timestamp: 1790000100
    });
    expect(snapshot.receipt.status).toBe("success");
    expect(snapshot.rawTransaction).toMatchObject({ hash: `0x${"a".repeat(64)}` });
    expect(snapshot.rawReceipt).toMatchObject({ status: "success" });
    expect(snapshot.receipt.logs[0]).toMatchObject({
      sourceTxHash: `0x${"a".repeat(64)}`,
      blockNumber: 10,
      blockHash: `0x${"b".repeat(64)}`
    });
  });

  it("fails closed on wrong chain", async () => {
    const client = createStandardRpcReceiptClient({
      chainId: 91342,
      timeoutMs: 1000,
      transport: {
        async getChainId() {
          return 1;
        },
        async getTransaction() {
          throw new Error("not reached");
        },
        async getTransactionReceipt() {
          throw new Error("not reached");
        },
        async getBlockNumber() {
          throw new Error("not reached");
        }
      }
    });

    await expect(snapshotDepositTransaction(client, `0x${"a".repeat(64)}`)).rejects.toThrow("wrong chain");
  });
});

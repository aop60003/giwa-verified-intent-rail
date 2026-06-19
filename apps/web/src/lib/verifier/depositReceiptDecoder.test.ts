import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, parseAbi } from "viem";

import { decodeDepositCall, decodeDepositReceiptLogs } from "./depositReceiptDecoder.ts";

const vaultAbi = parseAbi([
  "function deposit(address asset,uint256 amount)",
  "event MockDeposit(address indexed wallet,address indexed asset,uint256 amount)"
]);
const tokenAbi = parseAbi([
  "event Approval(address indexed owner,address indexed spender,uint256 amount)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)"
]);

function topics(value: ReturnType<typeof encodeEventTopics>): readonly `0x${string}`[] {
  return value as unknown as readonly `0x${string}`[];
}

describe("deposit receipt decoder", () => {
  it("decodes deposit calldata and known receipt logs", () => {
    const wallet = "0x1111111111111111111111111111111111111111";
    const target = "0x2222222222222222222222222222222222222222";
    const asset = "0x3333333333333333333333333333333333333333";
    const amount = 1000000000000000000n;
    const input = encodeFunctionData({ abi: vaultAbi, functionName: "deposit", args: [asset, amount] });

    expect(decodeDepositCall(input)).toEqual({
      selector: "0x47e7ef24",
      asset,
      amountBaseUnits: amount.toString()
    });

    const decoded = decodeDepositReceiptLogs([
      {
        address: asset,
        logIndex: 0,
        sourceTxHash: `0x${"c".repeat(64)}`,
        blockNumber: 9,
        blockHash: `0x${"f".repeat(64)}`,
        topics: topics(encodeEventTopics({ abi: tokenAbi, eventName: "Approval", args: { owner: wallet, spender: target } })),
        data: encodeAbiParameters([{ type: "uint256" }], [amount])
      },
      {
        address: asset,
        logIndex: 1,
        sourceTxHash: `0x${"d".repeat(64)}`,
        blockNumber: 10,
        blockHash: `0x${"e".repeat(64)}`,
        topics: topics(encodeEventTopics({ abi: tokenAbi, eventName: "Transfer", args: { from: wallet, to: target } })),
        data: encodeAbiParameters([{ type: "uint256" }], [amount])
      },
      {
        address: target,
        logIndex: 2,
        sourceTxHash: `0x${"d".repeat(64)}`,
        blockNumber: 10,
        blockHash: `0x${"e".repeat(64)}`,
        topics: topics(encodeEventTopics({ abi: vaultAbi, eventName: "MockDeposit", args: { wallet, asset } })),
        data: encodeAbiParameters([{ type: "uint256" }], [amount])
      }
    ]);

    expect(decoded.map((entry) => entry.eventName)).toEqual(["Approval", "Transfer", "MockDeposit"]);
    expect(decoded[2]).toMatchObject({
      contractAddress: target,
      sourceTxHash: `0x${"d".repeat(64)}`,
      blockNumber: 10,
      blockHash: `0x${"e".repeat(64)}`,
      args: { wallet, asset, amount: amount.toString() }
    });
  });
});

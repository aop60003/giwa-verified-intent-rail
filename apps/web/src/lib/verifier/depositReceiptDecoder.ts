import { decodeEventLog, decodeFunctionData, parseAbi, type Hex } from "viem";

import { normalizeAddress, normalizeHex } from "../../../../../packages/protocol/src/validation.ts";
import type { DecodedLogSnapshot } from "./decodeEvidence.ts";
import type { StandardRpcLogSnapshot } from "./standardRpcReceiptClient.ts";

const vaultAbi = parseAbi([
  "function deposit(address asset,uint256 amount)",
  "event MockDeposit(address indexed wallet,address indexed asset,uint256 amount)"
]);
const tokenAbi = parseAbi([
  "event Approval(address indexed owner,address indexed spender,uint256 amount)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)"
]);
const receiptAbi = [...vaultAbi, ...tokenAbi] as const;

export type DepositCall = {
  selector: Hex;
  asset: string;
  amountBaseUnits: string;
};

function normalizeArg(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value)) return value.toLowerCase();
  if (Array.isArray(value)) return value.map(normalizeArg);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeArg(entry)]));
  }
  return value;
}

export function decodeDepositCall(input: Hex): DepositCall {
  const decoded = decodeFunctionData({
    abi: vaultAbi,
    data: normalizeHex(input, "deposit input")
  });
  if (decoded.functionName !== "deposit") {
    throw new Error("deposit input is not mock vault deposit");
  }
  const [asset, amount] = decoded.args;

  return {
    selector: input.slice(0, 10).toLowerCase() as Hex,
    asset: normalizeAddress(asset, "deposit asset"),
    amountBaseUnits: amount.toString()
  };
}

export function decodeDepositReceiptLogs(logs: readonly StandardRpcLogSnapshot[]): DecodedLogSnapshot[] {
  const decoded: DecodedLogSnapshot[] = [];

  for (const log of logs) {
    try {
      if (log.topics.length === 0) continue;
      const event = decodeEventLog({
        abi: receiptAbi,
        data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]]
      });
      decoded.push({
        eventName: event.eventName,
        contractAddress: normalizeAddress(log.address, "log address"),
        logIndex: log.logIndex,
        sourceTxHash: log.sourceTxHash,
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        args: normalizeArg(event.args ?? {}) as Record<string, unknown>,
        topics: log.topics
      });
    } catch (error) {
      if (error instanceof Error) continue;
      throw error;
    }
  }

  return decoded.sort((left, right) => left.logIndex - right.logIndex);
}

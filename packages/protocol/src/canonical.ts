import { bytesToHex, stringToBytes } from "viem";
import type { Hex } from "./types.ts";

export function canonicalPayload<T extends Record<string, unknown>>(
  value: T,
  fieldOrder: readonly string[]
): string {
  const ordered: Record<string, unknown> = {};

  for (const field of fieldOrder) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      continue;
    }

    const item = value[field];
    if (item !== undefined) {
      ordered[field] = item;
    }
  }

  return JSON.stringify(ordered);
}

export function canonicalPayloadBytesHex(payload: string): Hex {
  return bytesToHex(stringToBytes(payload));
}

import { keccak256, stringToBytes } from "viem";
import type { Hex } from "./types.ts";

export function hashCanonicalPayload(payload: string): Hex {
  return keccak256(stringToBytes(payload));
}

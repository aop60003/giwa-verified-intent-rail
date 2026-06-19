import { keccak256, stringToBytes } from "viem";
import type { Hex } from "./types.ts";
import { requireTrimmedString } from "./validation.ts";

export function idToBytes32(id: string): Hex {
  return keccak256(stringToBytes(requireTrimmedString(id, "id")));
}

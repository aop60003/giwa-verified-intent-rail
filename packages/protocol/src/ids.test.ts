import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes } from "viem";
import { idToBytes32 } from "./ids";

describe("bytes32 id normalization", () => {
  it("hashes trimmed ids with keccak256(toUtf8Bytes(id.trim()))", () => {
    expect(idToBytes32(" gasok-demo ")).toBe(keccak256(stringToBytes("gasok-demo")));
    expect(idToBytes32(" first-mock-vault-deposit ")).toBe(
      keccak256(stringToBytes("first-mock-vault-deposit"))
    );
  });

  it("rejects empty trimmed ids", () => {
    expect(() => idToBytes32("   ")).toThrow("id must be a non-empty trimmed string");
  });
});

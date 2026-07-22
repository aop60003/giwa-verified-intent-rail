import { describe, expect, it } from "vitest";

import { buildMockTokenMintCalldata } from "./mockTokenMintCalldata.ts";

describe("mock token mint calldata", () => {
  it("encodes mint(address,uint256) with the expected selector and ABI words", () => {
    expect(
      buildMockTokenMintCalldata({
        to: "0x1111111111111111111111111111111111111111",
        amountBaseUnits: "1000000000000000000"
      })
    ).toBe(
      `0x40c10f19${"1".repeat(40).padStart(64, "0")}${BigInt("1000000000000000000").toString(16).padStart(64, "0")}`
    );
  });

  it("rejects an invalid recipient address", () => {
    expect(() => buildMockTokenMintCalldata({ to: "bad", amountBaseUnits: "1" })).toThrow(
      "to must be a valid address"
    );
  });

  it("rejects a zero mint amount", () => {
    expect(() =>
      buildMockTokenMintCalldata({
        to: "0x1111111111111111111111111111111111111111",
        amountBaseUnits: "0"
      })
    ).toThrow("amountBaseUnits must be a positive base-unit decimal string");
  });
});

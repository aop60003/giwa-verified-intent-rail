import { describe, expect, it } from "vitest";

import { assertPublicArtifactSafe } from "./publicArtifactGuard.ts";

describe("public artifact guard", () => {
  it("allows public evidence hashes and addresses", () => {
    expect(() =>
      assertPublicArtifactSafe({
        receiptHash: `0x${"a".repeat(64)}`,
        wallet: "0x1111111111111111111111111111111111111111",
        note: "mock testnet deposit evidence"
      })
    ).not.toThrow();
  });

  it("rejects secret-like keys even with synthetic values", () => {
    expect(() =>
      assertPublicArtifactSafe({
        apiKey: "example"
      })
    ).toThrow("public artifact contains blocked key");
  });

  it("rejects forbidden public claims", () => {
    expect(() =>
      assertPublicArtifactSafe({
        copy: "guarantee " + "safety"
      })
    ).toThrow("public artifact contains blocked claim");
  });
});

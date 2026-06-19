import { describe, expect, it } from "vitest";

import { recoveryCopyFor } from "./liveRecoveryCopy.ts";

describe("recoveryCopyFor", () => {
  it("uses the three-part recovery formula for wrong chain", () => {
    expect(recoveryCopyFor({ code: "wrong_chain", expectedChainId: 91342 })).toEqual({
      title: "Switch to GIWA Sepolia",
      happened: "The connected wallet is on a different chain.",
      locked: "Manifest issuance and wallet actions are locked.",
      next: "Switch the wallet to chain 91342, then issue a new manifest.",
      severity: "action-required"
    });
  });

  it("bounds verifier mismatch copy without exposing raw errors", () => {
    const copy = recoveryCopyFor({ code: "verifier_mismatch", failureCode: "MISSING_REQUIRED_LOG" });

    expect(copy.title).toBe("Receipt not issued");
    expect(copy.locked).toContain("Receipt stays locked");
    expect(JSON.stringify(copy)).not.toMatch(/stack|process\.env|raw upstream|exception/i);
  });

  it.each([
    ["provider_missing", "Install or enable a browser wallet"],
    ["manifest_invalidated", "Request a fresh manifest"],
    ["manifest_expired", "Issue a new manifest"],
    ["duplicate_deposit_hash", "Use a fresh run"],
    ["receipt_not_found", "Receipt not found or not available"],
    ["rate_limited", "Wait briefly and retry"]
  ] as const)("returns actionable copy for %s", (code, title) => {
    const copy = recoveryCopyFor({ code });

    expect(copy.title).toBe(title);
    expect(copy.happened.length).toBeGreaterThan(0);
    expect(copy.locked.length).toBeGreaterThan(0);
    expect(copy.next.length).toBeGreaterThan(0);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function safeScanScript(): string {
  return readFileSync(join(process.cwd(), "../../scripts/ci/check-safe-scans.ps1"), "utf8");
}

describe("safe scan script contract", () => {
  it("does not blanket-allow unsupported claims or sensitive terms across every sprint plan", () => {
    const script = safeScanScript();

    expect(script).not.toContain(
      '$normalizedPath.StartsWith("docs\\superpowers\\plans\\") -and $RuleId -in @("unsupported-claim", "sensitive-term")'
    );
  });

  it("detects common secret-like names without printing real env values", () => {
    const script = safeScanScript().toLowerCase();

    for (const pattern of [
      "api[_-]?key",
      "access[_-]?token",
      "authorization",
      "client[_-]?secret",
      "begin private key",
      "rpc[_-]?url"
    ]) {
      expect(script).toContain(pattern);
    }
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
}

describe("commercial user public boundary", () => {
  it("does not expose internal blocker or credential-marker copy in user public assets", () => {
    const files = ["public/user.html", "public/user-flow.js", "public/styles.css"];
    const joined = files.map((file) => readWebFile(file)).join("\n");

    expect(joined).toContain("Review action before signing");
    expect(joined).toContain("Enter a valid transaction hash");
    expect(joined).toContain("Copy support summary");
    expect(joined).not.toMatch(/gateReason|protected CI|blocker register|local DB path|signer role/iu);
    expect(joined).not.toMatch(/local API|static preview|partner packet|reviewer route|local review/iu);
    expect(joined).not.toMatch(/production asset|production yield|safety guarantee|final confirmation in/iu);
    const credentialPattern = new RegExp(
      [("mnem" + "onic"), ("seed ph" + "rase"), "credential value", ("bear" + "er " + "token")].join("|"),
      "iu"
    );
    expect(joined).not.toMatch(credentialPattern);
  });
});

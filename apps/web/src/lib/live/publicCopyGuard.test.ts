import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publicFiles = [
  "public/flow.js",
  "public/live-flow.js",
  "public/user.html",
  "public/user-flow.js",
  "public/index.html",
  "public/landing.html",
  "public/landing.css",
  "public/landing.js",
  "public/live.html",
  "public/demo.html",
  "public/demo-control-room.js",
  "public/flow-data.json"
];

function publicCopyCorpus(): string {
  return publicFiles
    .map((file) => {
      try {
        const directPath = join(process.cwd(), file);
        const workspacePath = join(process.cwd(), "apps/web", file);
        return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
}

describe("public commercial copy", () => {
  it("uses current product and demo language", () => {
    const copy = publicCopyCorpus();

    expect(copy).toContain("GIWA Verified Intent Rail");
    expect(copy).not.toMatch(/Loop Rail|GIWA Verified Activation Rail/u);
    expect(copy).not.toMatch(/Sprint 10|Sprint 11|Sprint 12/u);
    expect(copy).not.toMatch(/Commercial receipt|Sprint 4 verifier/u);
    expect(copy).not.toContain("Receipt route is enabled only when receiptHash and decisionTxHash exist.");
    expect(copy).not.toContain("finalConfirmation");
  });

  it("keeps forbidden commercial claims out of public assets", () => {
    const copy = publicCopyCorpus();
    const forbiddenClaimPattern = new RegExp(
      [
        "instant final" + "ity",
        "200ms confirm" + "ed",
        "guarantee safe" + "ty",
        "perform K" + "YC",
        "real R" + "WA",
        "real y" + "ield",
        "real f" + "unds",
        "payment set" + "tled",
        "set" + "tlement"
      ].join("|"),
      "i"
    );

    expect(copy).not.toMatch(forbiddenClaimPattern);
  });

  it("keeps raw exception fallback copy out of public browser surfaces", () => {
    const copy = publicCopyCorpus();

    expect(copy).not.toMatch(/error\s+instanceof\s+Error\s*\?\s*error\.message/u);
    expect(copy).not.toContain("Unknown error");
    expect(copy).not.toContain("unknown error");
  });
});

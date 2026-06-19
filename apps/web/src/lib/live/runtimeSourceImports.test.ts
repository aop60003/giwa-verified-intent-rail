import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const runtimeLoadedSourceFiles = [
  "src/lib/storage/receiptStore.ts",
  "src/lib/verifier/verifyManifestSigner.ts",
  "src/lib/verifier/verifyDeposit.ts",
  "src/lib/live/liveApi.ts",
  "scripts/serve-live.mjs"
];

describe("live server source imports", () => {
  it("uses TypeScript source extensions for protocol imports loaded by node strip-types", () => {
    for (const filePath of runtimeLoadedSourceFiles) {
      const source = readFileSync(filePath, "utf8");

      expect(source, filePath).not.toMatch(/packages\/protocol\/src\/[^"']+\.js["']/);
    }
  });
});

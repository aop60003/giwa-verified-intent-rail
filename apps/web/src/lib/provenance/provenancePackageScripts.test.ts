import { describe, expect, it } from "vitest";

import packageJson from "../../../package.json";

describe("provenance package scripts", () => {
  it("exposes local-advisory artifact commands without adding CI workflow commands", () => {
    expect(packageJson.scripts["artifact:manifest"]).toBe(
      "node --experimental-strip-types scripts/export-artifact-manifest.mjs --manifest"
    );
    expect(packageJson.scripts["artifact:provenance"]).toBe(
      "node --experimental-strip-types scripts/export-artifact-manifest.mjs --provenance"
    );
    expect(packageJson.scripts["artifact:scan"]).toBe(
      "node --experimental-strip-types scripts/export-artifact-manifest.mjs --scan"
    );
    expect(packageJson.scripts["artifact:local"]).toBe(
      "node --experimental-strip-types scripts/export-artifact-manifest.mjs"
    );
    expect(packageJson.scripts["artifact:provenance:verify"]).toBe(
      "node --experimental-strip-types scripts/verify-provenance-report.mjs"
    );
  });
});

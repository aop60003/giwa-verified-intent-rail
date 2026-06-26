import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
}

describe("commercial user visual polish", () => {
  it("keeps the action page structured as a commercial checkout surface", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source).toContain("user-cta-cluster");
    expect(source).toContain("user-gate-grid");
    expect(source).toContain("What happens next");
    expect(source).toContain("Technical details");
  });

  it("keeps receipt and recovery surfaces readable and share-oriented", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source).toContain("user-receipt-actions");
    expect(source).toContain("Open transaction");
    expect(source).toContain("user-help-card");
    expect(source).not.toMatch(/raw error|upstream|runtime config/iu);
  });

  it("adds responsive overflow guards for hashes, actions, and mobile widths", () => {
    const css = readWebFile("public/styles.css");

    expect(css).toContain(".user-cta-cluster");
    expect(css).toContain(".user-gate-grid");
    expect(css).toContain(".user-progress-heading");
    expect(css).toContain("@media (max-width: 430px)");
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("keeps static demo regression smoke quiet with bounded local projections", () => {
    const staticServer = readWebFile("scripts/serve-static.mjs");

    expect(staticServer).toContain("staticDemoStatusPayload");
    expect(staticServer).toContain('url.pathname === "/api/demo/status"');
    expect(staticServer).toContain('url.pathname === "/healthz"');
    expect(staticServer).toContain('url.pathname === "/readyz"');
    expect(staticServer).not.toMatch(/GIWA_|PRIVATE|MNEMONIC|BEARER|API_KEY|SECRET/u);
  });
});

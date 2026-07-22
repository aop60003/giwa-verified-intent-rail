import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
}

describe("evaluator visual polish", () => {
  it("uses Korean-first document language and accessible live status", () => {
    const html = readWebFile("public/user.html");
    const source = readWebFile("public/user-flow.js");

    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("GIWA Verified Intent Rail 평가자 흐름");
    expect(html).toContain("액션 화면을 불러오는 중");
    expect(source).toContain('role: "status", "aria-live": "polite"');
    expect(source).toContain('"aria-label": primaryLabel()');
    expect(source).toContain('type: "button"');
    expect(source).toContain('id: "user-primary-action"');
  });

  it("keeps the action page aligned to the established checkout primitives", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source).toContain("user-cta-cluster");
    expect(source).toContain("user-gate-grid");
    expect(source).toContain("다음 진행 단계");
    expect(source).toContain("Technical details");
    expect(source).toContain("GIWA Verified Intent Rail");
    expect(source).toContain("Manifest");
    expect(source).toContain("Receipt");
  });

  it("shows pending, blocked and complete states with share-safe receipt actions", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source).toContain("user-state pending");
    expect(source).toContain("user-state blocked");
    expect(source).toContain("user-state complete");
    expect(source).toContain("user-receipt-actions");
    expect(source).toContain("트랜잭션 열기");
    expect(source).toContain("user-help-card");
    expect(source).not.toMatch(/raw error|upstream|runtime config/iu);
  });

  it("adds responsive, focus, hash overflow, and reduced-motion guards", () => {
    const css = readWebFile("public/styles.css");

    expect(css).toContain(".user-cta-cluster");
    expect(css).toContain(".user-gate-grid");
    expect(css).toContain(".user-progress-heading");
    expect(css).toContain("@media (max-width: 430px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain(".user-primary-action:focus-visible");
  });

  it("keeps static demo regression smoke quiet with bounded local projections", () => {
    const staticServer = readWebFile("scripts/serve-static.mjs");

    expect(staticServer).toContain("staticDemoStatusPayload");
    expect(staticServer).toContain('url.pathname === "/api/demo/status"');
    expect(staticServer).toContain('url.pathname === "/healthz"');
    expect(staticServer).toContain('url.pathname === "/readyz"');
    expect(staticServer).not.toMatch(/PRIVATE_KEY|MNEMONIC|BEARER_TOKEN|API_KEY|SECRET_VALUE/u);
  });
});

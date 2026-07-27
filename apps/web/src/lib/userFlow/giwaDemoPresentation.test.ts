import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("GIWA public demo presentation", () => {
  it("ships a Korean one-screen shell that reuses the live controller", () => {
    const html = readWebFile("public/giwa-demo.html");
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("GIWA Demo · GIWA Verified Intent Rail");
    expect(html).toContain('href="/styles.css"');
    expect(html).toContain('href="/giwa-demo.css"');
    expect(html).toContain('src="/user-flow.js"');
    expect(html).toContain('href="/"');
  });

  it("adds a route-aware product link and four-stage projection", () => {
    const source = readWebFile("public/user-flow.js");
    expect(source).toContain('location.pathname === "/giwa-demo"');
    expect(source).toContain("renderDemoTopBar");
    expect(source).toContain("combineDemoStageState");
    expect(source).toContain("demoProgressStages");
    expect(source).toContain("준비");
    expect(source).toContain("조건 검토");
    expect(source).toContain("실행");
    expect(source).toContain("Receipt");
    expect(source).toContain('href: "/", text: "제품 소개"');
    expect(source).toContain('href: "/giwa-demo", text: "다시 실행"');
  });

  it("keeps one dominant action and the existing technical state machine", () => {
    const source = readWebFile("public/user-flow.js");
    expect(source).toContain('id: "user-primary-action"');
    expect(source).toContain("nextPrimaryAction()");
    expect(source).toContain("primaryLabel()");
    expect(source).toContain("progressSteps()");
    expect(source).toContain("renderActionSummary()");
    expect(source).toContain("renderIntentPanel()");
    expect(source.match(/id: "user-primary-action"/gu)).toHaveLength(1);
  });

  it("uses a desktop viewport shell with accessible stacked fallbacks", () => {
    const css = readWebFile("public/giwa-demo.css");
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain(".giwa-demo-topbar");
    expect(css).toContain(".giwa-demo-stage-rail");
    expect(css).toContain(".giwa-demo-frame");
    expect(css).toContain("@media (max-width: 980px)");
    expect(css).toContain("@media (max-height: 760px)");
    expect(css).toContain("overflow: visible");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain(".skip-link");
    expect(css).toContain("transform: translateY(-180%)");
  });
});

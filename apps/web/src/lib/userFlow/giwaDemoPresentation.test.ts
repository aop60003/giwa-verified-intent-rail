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

  it("adds a route-aware product link and three-stage projection", () => {
    const source = readWebFile("public/user-flow.js");
    expect(source).toContain('location.pathname === "/giwa-demo"');
    expect(source).toContain("renderDemoTopBar");
    expect(source).toContain("projectDemoStageState");
    expect(source).toContain("demoProgressStages");
    expect(source).toContain("renderDemoGuidedFlow");
    expect(source).toContain("준비 상태 확인");
    expect(source).toContain("조건 검토 및 실행");
    expect(source).toContain("Receipt 확인");
    expect(source).toContain('href: "/", text: "제품 설명 보기"');
    expect(source).toContain('href: "/giwa-demo", text: "다시 실행"');
    expect(source).toContain('view("span", { text: "확인한 조건대로," })');
    expect(source).toContain(
      'view("span", { text: "실행됐는지 증명합니다." })'
    );
    expect(source).toContain(
      "실제 트랜잭션이 조건과 모두 일치할 때만 Receipt가 열립니다."
    );
    expect(source).not.toContain("renderDemoStageRail");
  });

  it("explains the judge problem and the four-word product flow before execution", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source).toContain("renderDemoJudgePromise");
    expect(source).toContain(
      "버튼을 눌렀다는 기록만으로는, 약속한 온체인 액션이 실행됐는지 알 수 없습니다."
    );
    expect(source).toContain(
      "Looprail은 실행 전 Manifest와 실제 GIWA 트랜잭션을 대조합니다."
    );
    expect(source).toContain(
      'const labels = ["Manifest", "GIWA 실행", "Match", "Receipt"]'
    );
    expect(source).toContain("확인한 조건대로,");
    expect(source).toContain("실행됐는지 증명합니다.");
    expect(source).toContain("Receipt를 발급하지 않았습니다.");
    expect(source).toContain("renderDemoMismatchSummary");
    expect(source).not.toContain("Proofbook");
    expect(source).not.toContain("Execution Proof");
    expect(source).not.toContain("failed NFT");
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

  it("uses a fluid three-column flow and stacks without fixed-width overflow", () => {
    const css = readWebFile("public/giwa-demo.css");
    expect(css).toContain("min-height: 100dvh");
    expect(css).toContain(".giwa-demo-topbar");
    expect(css).toContain(".giwa-demo-guided-flow");
    expect(css).toContain(".giwa-demo-frame");
    expect(css).toContain(".giwa-demo-judge-promise");
    expect(css).toContain(".giwa-demo-proof-path");
    expect(css).toMatch(
      /\.giwa-demo-intro h1\s*\{[\s\S]*font-weight:\s*600;[\s\S]*line-height:\s*1\.08;[\s\S]*letter-spacing:\s*-0\.035em;/iu
    );
    expect(css).toMatch(
      /\.giwa-demo-intro h1\s*>\s*span\s*\{[\s\S]*display:\s*block/iu
    );
    expect(css).toMatch(
      /\.giwa-demo-guided-flow\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/iu
    );
    expect(css).toContain("@media (max-width: 959px)");
    expect(css).toContain("@media (max-width: 639px)");
    expect(css).not.toContain("minmax(420px");
    expect(css).not.toContain("minmax(520px");
    expect(css).not.toContain("scrollbar-gutter");
    expect(css).not.toMatch(/linear-gradient|radial-gradient|scroll-snap/iu);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain(".skip-link");
    expect(css).toContain("transform: translateY(-180%)");
  });

  it("keeps the primary action in the compact desktop first viewport", () => {
    const css = readWebFile("public/giwa-demo.css");
    const compactStart = css.indexOf(
      "@media (min-width: 960px) and (max-height: 800px)"
    );
    const compactEnd = css.indexOf("@media (max-width: 959px)", compactStart);
    const compact = css.slice(compactStart, compactEnd);

    expect(compactStart).toBeGreaterThanOrEqual(0);
    expect(compactEnd).toBeGreaterThan(compactStart);
    expect(compact).toContain(".giwa-demo-judge-promise");
    expect(compact).toContain("margin-bottom: 20px");
    expect(compact).toContain("padding-block: 14px");
    expect(compact).toContain("min-height: 40px");
  });
});

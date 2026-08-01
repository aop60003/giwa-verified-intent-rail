import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("GIWA Protocol Dossier presentation contract", () => {
  it("loads one shared shell before both route runtimes", () => {
    const userHtml = readWebFile("public/user.html");
    const indexHtml = readWebFile("public/index.html");

    expect(userHtml).toContain('<script src="/protocol-dossier.js"></script>');
    expect(indexHtml).toContain('<script src="/protocol-dossier.js"></script>');
    expect(userHtml.indexOf("/protocol-dossier.js")).toBeLessThan(
      userHtml.indexOf("/user-flow.js")
    );
    expect(indexHtml.indexOf("/protocol-dossier.js")).toBeLessThan(
      indexHtml.indexOf("/flow.js")
    );
  });

  it("keeps the shell semantic and testnet-bounded", () => {
    const shell = readWebFile("public/protocol-dossier.js");

    expect(shell).toContain("LoopRail Demo");
    expect(shell).toContain('["/studio", "Studio", "studio"]');
    expect(shell).toContain("GIWA Sepolia · Testnet");
    expect(shell).toContain("조건 확인");
    expect(shell).toContain("지갑 실행");
    expect(shell).toContain("결과 공개");
    expect(shell).toContain('setAttribute("aria-label", "검증 여정")');
    expect(shell).not.toMatch(/Loop Rail|mainnet|finality|settlement/iu);
  });

  it("self-hosts Pretendard with preload and swap", () => {
    const userHtml = readWebFile("public/user.html");
    const indexHtml = readWebFile("public/index.html");
    const fontCss = readWebFile("public/fonts/pretendard.css");

    for (const html of [userHtml, indexHtml]) {
      expect(html).toContain('rel="preload"');
      expect(html).toContain("/fonts/pretendard-giwa-subset.woff2");
      expect(html).toContain("/fonts/pretendard.css");
      expect(html).not.toContain("cdn.jsdelivr.net");
    }
    expect(fontCss).toContain("font-display: swap");
    expect(fontCss).toContain('format("woff2")');
  });

  it("uses one line-icon factory instead of text status symbols", () => {
    const shell = readWebFile("public/protocol-dossier.js");
    const userFlow = readWebFile("public/user-flow.js");

    expect(shell).toContain("createLineIcon");
    expect(shell).toContain('"check"');
    expect(shell).toContain('"clock-3"');
    expect(shell).toContain('"triangle-alert"');
    expect(shell).toContain('"chevron-down"');
    expect(userFlow).not.toContain('return "✓"');
    expect(userFlow).not.toContain('return "→"');
  });

  it("enforces responsive, focus, target, and reduced-motion guards", () => {
    const css = readWebFile("public/styles.css");

    expect(css).toContain("--protocol-target: 44px");
    expect(css).toContain("min-height: var(--protocol-target)");
    expect(css).toMatch(/button\s*\{[^}]*min-height:\s*var\(--protocol-target\)/su);
    expect(css).toMatch(
      /\.primary-link,\s*\.secondary-link,\s*\.disabled-link\s*\{[^}]*min-height:\s*var\(--protocol-target\)/su
    );
    expect(css).toContain("@media (max-width: 360px)");
    expect(css.lastIndexOf("@media (max-width: 360px)")).toBeGreaterThan(
      css.lastIndexOf("@media (max-width: 430px)")
    );
    expect(css).toContain(".protocol-mission-intro .lead,");
    expect(css).toContain("font-size: 16px");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".protocol-line-icon {");
    expect(css).toContain("transition: none !important");
    expect(css).toMatch(
      /\.protocol-line-icon,\s*\.matched-receipt-seal,\s*\.receipt-artifact\s*\{[^}]*animation:\s*none\s*!important[^}]*transition:\s*none\s*!important/su
    );
    expect(css).toMatch(
      /details\.panel\s*>\s*summary\s*\{[^}]*min-height:\s*var\(--protocol-target\)/su
    );
    expect(css).toContain(":focus-visible");
    expect(css).toContain(".hash-disclosure");
    expect(css).not.toContain("min-width: 320px");
  });
});

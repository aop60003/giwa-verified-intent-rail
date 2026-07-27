import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("GASOK judge landing presentation", () => {
  it("is Korean-first, static-first and keyboard navigable", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain("확인한 행동만");
    expect(html).toContain('href="/user"');
    expect(html).toContain('href="/evidence"');
    expect(html).toContain("TESTNET ONLY");
    expect(html).not.toContain("<form");
  });

  it("contains the complete five-state product story and judge evidence sections", () => {
    const html = readWebFile("public/landing.html");
    for (const step of ["review", "sign", "execute", "verify", "receipt"]) {
      expect(html).toContain(`data-story-step="${step}"`);
      expect(html).toContain(`data-story-frame="${step}"`);
    }
    for (const id of ["problem", "how-it-works", "evidence", "why-giwa", "execution"]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("keeps unsupported claims out and labels the wallet path as next", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain("GIWA Wallet in-app");
    expect(html).toContain("NEXT");
    expect(html).not.toMatch(/instant finality|mainnet ready|real yield|real funds|KYC service|settlement/iu);
  });

  it("provides safe evidence fallbacks before JavaScript runs", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain('data-recorded-receipt href="/evidence"');
    expect(html).toContain("data-recorded-explorer");
    expect(html).toContain("기록형 증거 보기");
  });

  it("uses the approved Pretendard, paper, responsive and reduced-motion system", () => {
    const css = readWebFile("public/landing.css");
    expect(css).toContain('"Pretendard Variable"');
    expect(css).toContain("--paper: #f4f3ee");
    expect(css).toContain("--verified: #1e684f");
    expect(css).toContain("position: sticky");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).not.toMatch(/backdrop-filter|linear-gradient|radial-gradient/iu);
  });

  it("uses bounded browser APIs without scroll handlers or unsafe HTML sinks", () => {
    const source = readWebFile("public/landing.js");
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("DOMContentLoaded");
    expect(source).toContain("querySelectorAll");
    expect(source).toContain("textContent");
    expect(source).toContain('setAttribute("aria-expanded"');
    expect(source).not.toContain("innerHTML");
    expect(source).not.toMatch(/addEventListener\(["']scroll/iu);
    expect(source).not.toMatch(/ethereum\.request|eth_sendTransaction|wallet_switchEthereumChain/iu);
  });
});

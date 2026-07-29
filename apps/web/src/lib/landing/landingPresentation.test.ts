import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("production landing presentation", () => {
  it("is Korean-first, concise, and demo-directed", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain("실행은 기록되고,");
    expect(html).toContain("약속은 증명됩니다.");
    expect(html).toContain(
      "서명된 Manifest와 GIWA Sepolia 트랜잭션을 대조해"
    );
    expect(html).toContain('class="button button-primary" href="/giwa-demo"');
    expect(html).toContain("데모 실행");
    expect(html).toContain("Receipt 확인");
    expect(html).not.toMatch(/GASOK|심사|평가자|선발|제출|데모데이/iu);
  });

  it("uses four focused editorial chapters", () => {
    const html = readWebFile("public/landing.html");
    expect(html.match(/<section\b/gu)).toHaveLength(4);
    for (const id of ["product", "why", "how-it-works", "final-action"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain('id="why-giwa"');
    expect(html).toContain("트랜잭션이 남았다는 사실만으로는");
    expect(html).toContain("Manifest에서 Receipt까지,");
    expect(html).toContain("하나의 검증 흐름.");
    expect(html).toContain("직접 실행하고,");
    expect(html).toContain("결과를 확인해보세요.");
    expect(html).not.toMatch(/use-cases-section|scope-section/iu);
  });

  it("keeps the semantic four-stage proof story", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain("data-scroll-story");
    expect(html).toContain("data-story-progress");
    for (const stage of ["manifest", "execution", "matching", "receipt"]) {
      expect(html).toContain(`data-story-step="${stage}"`);
      expect(html).toContain(`data-story-trigger="${stage}"`);
      expect(html).toContain(`data-story-proof="${stage}"`);
    }
    expect(html).toContain("Manifest");
    expect(html).toContain("Transaction");
    expect(html).toContain("MATCHED");
    expect(html).toContain("GIWA Wallet in-app");
    expect(html).toContain("NEXT");
    expect(html).not.toMatch(/hero-slip|receipt-stamp|data-story-root/iu);
  });

  it("shows both sides of every proof comparison and the mismatch rule", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain('role="columnheader">MANIFEST');
    expect(html).toContain('role="columnheader">ON-CHAIN');
    expect(html).toContain('class="ledger-rule"');
    expect(html).toContain(
      "한 필드라도 다르면 Receipt를 발행하지 않습니다."
    );
    expect(html.match(/class="ledger-manifest"/gu)).toHaveLength(4);
    expect(html.match(/class="ledger-onchain"/gu)).toHaveLength(4);
  });

  it("keeps unsupported claims and wallet APIs out", () => {
    const html = readWebFile("public/landing.html");
    const source = readWebFile("public/landing.js");
    expect(html).not.toMatch(
      /mainnet ready|real yield|real funds|real RWA|KYC service|settlement|customer logos/iu
    );
    expect(source).not.toMatch(
      /ethereum\.request|eth_sendTransaction|wallet_switchEthereumChain/iu
    );
  });

  it("uses the approved editorial tokens and responsive fallbacks", () => {
    const css = readWebFile("public/landing.css");
    expect(css).toContain('"Pretendard Variable"');
    expect(css).toContain("--paper: #f7f6f1");
    expect(css).toContain("--ink: #171916");
    expect(css).toContain("--verified: #0b5f43");
    expect(css).toContain("--control-radius: 10px");
    expect(css).toContain("@media (max-width: 1180px)");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("(max-height: 640px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain(
      "grid-template-columns: minmax(78px, 0.55fr) minmax(118px, 1fr) minmax(118px, 1fr) auto"
    );
    expect(css).toContain(".ledger-manifest::before");
    expect(css).toContain(".ledger-onchain::before");
    expect(css).toMatch(
      /\.flow-section\s*\{[\s\S]*width:\s*100%/iu
    );
    expect(css).not.toContain("width: 100vw");
    expect(css).not.toContain("margin-left: calc(50% - 50vw)");
    expect(css).toMatch(
      /@media\s*\(max-width:\s*1180px\)[\s\S]*\.hero\s*\{[\s\S]*grid-template-columns:\s*1fr/iu
    );
    expect(css).toMatch(
      /:root\s*\{[\s\S]*font-family:\s*"Pretendard Variable"/iu
    );
    expect(css).toMatch(
      /\.proof-ledger,[\s\S]*font-family:\s*ui-monospace/iu
    );
    expect(css).not.toMatch(
      /\.wordmark,\s*[\s\S]*font-family:\s*ui-monospace/iu
    );
    expect(css).not.toMatch(
      /backdrop-filter|linear-gradient|radial-gradient|scroll-snap|proof-shadow|surface-radius/iu
    );
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("production landing presentation", () => {
  it("is Korean-first, evergreen, and demo-directed", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain("조건은 서명되고,");
    expect(html).toContain("실행은 증명됩니다.");
    expect(html).toContain('href="/giwa-demo"');
    expect(html).toContain("GIWA 데모 열기");
    expect(html).toContain("검증된 Receipt 보기");
    expect(html).not.toMatch(/GASOK|심사|평가자|선발|제출|데모데이/iu);
  });

  it("contains the approved evergreen information architecture", () => {
    const html = readWebFile("public/landing.html");
    for (const id of [
      "product",
      "how-it-works",
      "evidence",
      "use-cases",
      "why-giwa",
      "scope"
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    for (const copy of [
      "트랜잭션이 존재한다는 사실만으로는",
      "무엇을 실행할지 먼저 고정합니다.",
      "동일한 조건으로 테스트넷 트랜잭션을 전송합니다.",
      "네 개의 필드를 각각 대조합니다.",
      "일치한 실행만 공개 Receipt로 남깁니다.",
      "제품이 필요한 순간",
      "현재 검증 범위"
    ]) {
      expect(html).toContain(copy);
    }
  });

  it("uses a semantic four-stage proof story without decorative metaphors", () => {
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

  it("uses the approved editorial tokens and accessibility fallbacks", () => {
    const css = readWebFile("public/landing.css");
    expect(css).toContain('"Pretendard Variable"');
    expect(css).toContain("--paper: #f7f6f1");
    expect(css).toContain("--ink: #171916");
    expect(css).toContain("--verified: #0b5f43");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("(max-height: 640px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toMatch(/\.story-steps\s*\{[\s\S]*display:\s*grid/iu);
    expect(css).toMatch(/\.story-steps\s*\{[\s\S]*padding-bottom:\s*72px/iu);
    expect(css).toMatch(/\.story-step\s*\{[\s\S]*display:\s*contents/iu);
    expect(css).toMatch(/\.story-proof[\s\S]*position:\s*sticky/iu);
    expect(css).toMatch(/\.story-proof[\s\S]*grid-row:\s*1\s*\/\s*5/iu);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*980px\)[\s\S]*\.story-step[\s\S]*display:\s*grid[\s\S]*\.story-proof[\s\S]*position:\s*relative/iu
    );
    expect(css).not.toMatch(
      /backdrop-filter|linear-gradient|radial-gradient|scroll-snap/iu
    );
  });
});

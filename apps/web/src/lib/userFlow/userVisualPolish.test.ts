import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
}

function readWebBuffer(path: string): Uint8Array {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath);
}

describe("evaluator visual polish", () => {
  it("uses Korean-first document language and accessible live status", () => {
    const html = readWebFile("public/user.html");
    const source = readWebFile("public/user-flow.js");

    expect(html).toContain('<html lang="ko">');
    expect(html).toContain(
      "<title>GIWA Genesis Journey · GIWA Verified Intent Rail</title>"
    );
    expect(html).toContain("미션을 불러오는 중");
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
    expect(source).toContain("약속한 조건대로 실행됐습니다.");
    expect(source).toContain(
      "Manifest와 GIWA Sepolia 트랜잭션을 대조해 일치한 실행 기록을 발급했습니다."
    );
    expect(source).toContain("campaignStudioReceiptPath");
    expect(source).toContain("readCampaignHandoffReceipt");
    expect(source).toContain("handoff=issued");
    expect(source).toContain('`/receipt/${receiptHash}`');
    expect(source).toContain("Campaign Studio에서 반영 확인");
  });

  it("shows pending, blocked and complete states with share-safe receipt actions", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source).toContain("user-state pending");
    expect(source).toContain("user-state blocked");
    expect(source).toContain("user-state complete");
    expect(source).toContain("receipt-next-participation");
    expect(source).toContain("Explorer에서 보기");
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
    expect(css).toContain(".journey-canvas");
    expect(css).toContain(".journey-stage-rail");
    expect(css).toContain(".journey-condition-table");
    expect(css).toContain(".journey-match-table");
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).not.toContain("min-width: 320px");
    expect(css).not.toMatch(/confetti|particle|trophy/iu);
  });

  it("keeps static demo regression smoke quiet with bounded local projections", () => {
    const staticServer = readWebFile("scripts/serve-static.mjs");

    expect(staticServer).toContain("staticDemoStatusPayload");
    expect(staticServer).toContain('url.pathname === "/api/demo/status"');
    expect(staticServer).toContain('url.pathname === "/healthz"');
    expect(staticServer).toContain('url.pathname === "/readyz"');
    expect(staticServer).not.toMatch(/PRIVATE_KEY|MNEMONIC|BEARER_TOKEN|API_KEY|SECRET_VALUE/u);
  });

  it("uses one real Seal asset and a human-readable matched Receipt hierarchy", () => {
    const html = readWebFile("public/user.html");
    const source = readWebFile("public/user-flow.js");
    const css = readWebFile("public/styles.css");
    const seal = readWebBuffer("public/matched-receipt-seal.png");
    const routeStart = source.indexOf("async function renderReceiptRoute");
    const receiptRoute = source.slice(
      routeStart,
      source.indexOf("function renderHelp", routeStart)
    );

    expect(html).toContain("pretendardvariable-dynamic-subset.min.css");
    expect(source).toContain("/matched-receipt-seal.png");
    expect(source).toContain('alt: ""');
    expect(source).toContain('"aria-hidden": "true"');
    expect(receiptRoute.indexOf("renderMatchedReceiptRows(matchRows)")).toBeLessThan(
      receiptRoute.indexOf('field("Receipt hash", receiptHash)')
    );
    expect(source).toContain('id: "copy-receipt-feedback"');
    expect(source).toContain('tabindex: "-1"');
    expect(css).toContain(".matched-receipt-seal");
    expect(css).toContain(".matched-receipt-rows");
    expect(css).toContain('[tabindex="-1"]:focus');
    expect(css).toContain("@keyframes matched-receipt-reveal");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect([...seal.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("describes Receipt history as local browser execution records", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source).toContain("내 실행 기록");
    expect(source).toContain("이 브라우저에 저장된 테스트넷 실행 기록입니다.");
    expect(source).toContain(
      "사용자는 실행 기록을 받고, 파트너는 클릭이 아니라 Manifest와 일치한 트랜잭션을 KPI로 확인합니다."
    );
    expect(source).toContain(
      "GIWA Wallet 안에서 실행 전 Manifest와 실행 후 Receipt 기록을 연결할 수 있습니다."
    );
    expect(source).toContain('networkName: "GIWA Sepolia"');
    expect(source).toContain("savedAt:");
    expect(source).not.toContain("영구 소유");
    expect(source).not.toContain("지갑에 귀속된 NFT");
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readUserFlow(): string {
  const direct = join(process.cwd(), "public/user-flow.js");
  const workspace = join(process.cwd(), "apps/web/public/user-flow.js");
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

function standaloneFunction<T extends (...args: never[]) => unknown>(
  source: string,
  name: string
): T {
  const start = source.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return Function(
        `"use strict"; return (${source.slice(start, index + 1)});`
      )() as T;
    }
  }
  throw new Error(`unterminated function ${name}`);
}

type ProtocolInput = {
  missionReviewed: boolean;
  approvalSubmitted: boolean;
  depositSubmitted: boolean;
  verifying: boolean;
  mismatched: boolean;
  receiptReady: boolean;
};

type ProtocolProjection = {
  activeView: "mission" | "execution" | "receipt";
  publicStages: Array<{
    id: "mission" | "execution" | "receipt";
    state: "pending" | "active" | "complete" | "blocked";
  }>;
  executionStages: Array<{
    id: "prepare" | "wallet" | "submit" | "match" | "receipt";
    state: "pending" | "active" | "complete" | "blocked";
  }>;
};

function input(overrides: Partial<ProtocolInput> = {}): ProtocolInput {
  return {
    missionReviewed: false,
    approvalSubmitted: false,
    depositSubmitted: false,
    verifying: false,
    mismatched: false,
    receiptReady: false,
    ...overrides
  };
}

describe("projectProtocolConsoleState", () => {
  const project = standaloneFunction<
    (value: ProtocolInput) => ProtocolProjection
  >(readUserFlow(), "projectProtocolConsoleState");

  it.each([
    ["mission", input(), "mission"],
    [
      "execution",
      input({
        missionReviewed: true,
        approvalSubmitted: true,
        depositSubmitted: true,
        verifying: true
      }),
      "execution"
    ],
    [
      "receipt",
      input({
        missionReviewed: true,
        approvalSubmitted: true,
        depositSubmitted: true,
        receiptReady: true
      }),
      "receipt"
    ]
  ] as const)("maps %s state to the %s view", (_name, value, expected) => {
    expect(project(value).activeView).toBe(expected);
  });

  it("exposes only the three public journey stages", () => {
    const result = project(input());

    expect(result.publicStages.map((stage) => stage.id)).toEqual([
      "mission",
      "execution",
      "receipt"
    ]);
    expect(result.publicStages.filter((stage) => stage.state === "active")).toEqual([
      { id: "mission", state: "active" }
    ]);
  });

  it("keeps five execution states internal and blocks match on mismatch", () => {
    const result = project(
      input({
        missionReviewed: true,
        approvalSubmitted: true,
        depositSubmitted: true,
        mismatched: true
      })
    );

    expect(result.executionStages.map((stage) => stage.id)).toEqual([
      "prepare",
      "wallet",
      "submit",
      "match",
      "receipt"
    ]);
    expect(result.executionStages.find((stage) => stage.id === "match")).toEqual({
      id: "match",
      state: "blocked"
    });
    expect(result.executionStages.find((stage) => stage.id === "receipt")).toEqual({
      id: "receipt",
      state: "pending"
    });
  });
});

describe("GIWA Protocol Console presentation contract", () => {
  const source = readUserFlow();
  const css = readWebFile("public/styles.css");

  it("renders the shared product shell and only one public three-step journey", () => {
    expect(source).toContain("function renderProtocolTopBar");
    expect(source).toContain("function renderPublicJourney");
    expect(source).toContain("GIWA Verified Intent Rail");
    expect(source).toContain("Mission");
    expect(source).toContain("Execution");
    expect(source).toContain("Receipt");
    expect(source).toContain("조건 확인");
    expect(source).toContain("지갑 실행");
    expect(source).toContain("결과 공개");
  });

  it("renders the approved Mission Cockpit copy and testnet boundary", () => {
    expect(source).toContain("function renderMissionCockpitPage");
    expect(source).toContain("약속한 조건을 확인하고,");
    expect(source).toContain("내 지갑으로 실행합니다.");
    expect(source).toContain(
      "GIWA Sepolia 테스트넷 · Mock 자산만 사용 · 실제 자금 및 수익 없음"
    );
    expect(source).toContain("받게 될 결과 · Matched Receipt");
  });

  it("keeps the promised Receipt neutral before wallet execution", () => {
    const start = source.indexOf("function renderPromisedReceipt");
    const end = source.indexOf("function renderMissionCockpitPage", start);
    const promisedReceipt = source.slice(start, end);

    expect(promisedReceipt).toContain('className: "protocol-status-badge pending"');
    expect(promisedReceipt).toContain('text: "발급 조건"');
    expect(promisedReceipt).toContain("4/4 조건 일치 필요");
    expect(promisedReceipt).not.toContain("검증 완료");
    expect(promisedReceipt).not.toContain(
      'className: "protocol-status-badge verified"'
    );
  });

  it("renders the five internal Live Execution Rail states", () => {
    expect(source).toContain("function renderLiveExecutionPage");
    expect(source).toContain("function renderExecutionLifecycle");
    expect(source).toContain("지갑 승인부터 Receipt 발급까지,");
    expect(source).toContain("실행 준비");
    expect(source).toContain("지갑 승인 완료");
    expect(source).toContain("트랜잭션 제출");
    expect(source).toContain("조건 대조 중");
    expect(source).toContain("Receipt 발급");
  });

  it("ships the scoped desktop and mobile visual system", () => {
    expect(css).toContain("--protocol-paper: #f7f6f1");
    expect(css).toContain("--protocol-verified: #0b5f43");
    expect(css).toContain(".protocol-product-bar");
    expect(css).toContain(".protocol-mission");
    expect(css).toContain(".mission-cockpit");
    expect(css).toContain(".execution-lifecycle");
    expect(css).toContain("@media (max-width: 720px)");
  });
});

describe("Receipt Artifact presentation contract", () => {
  const source = readUserFlow();
  const css = readWebFile("public/styles.css");

  it("keeps unavailable participant Receipt metrics neutral", () => {
    const project = standaloneFunction<
      (matched: boolean) => {
        fieldMatch: string;
        fieldMatchLabel: string;
        coveredFields: string;
        matchDetailsSummary: string;
        summaryAriaLabel: string;
      }
    >(source, "projectReceiptArtifactMetrics");

    expect(project(true)).toEqual({
      fieldMatch: "4 / 4",
      fieldMatchLabel: "조건 일치",
      coveredFields: "4 / 4",
      matchDetailsSummary: "조건 대조 결과 4/4 보기",
      summaryAriaLabel: "Matched Receipt 요약"
    });
    expect(project(false)).toEqual({
      fieldMatch: "—",
      fieldMatchLabel: "확인 불가",
      coveredFields: "—",
      matchDetailsSummary: "조건 대조 결과 확인 불가",
      summaryAriaLabel: "Receipt 확인 불가 요약"
    });
    expect(source).toContain(
      "const artifactMetrics = projectReceiptArtifactMetrics(matched);"
    );
    expect(source).toContain("text: artifactMetrics.fieldMatch");
    expect(source).toContain("text: artifactMetrics.coveredFields");
    expect(source).toContain("text: artifactMetrics.matchDetailsSummary");
    expect(source).toContain(
      '"aria-label": artifactMetrics.summaryAriaLabel'
    );
  });

  it("turns a matched Receipt into the approved acquisition moment", () => {
    expect(source).toContain("function renderReceiptArtifact");
    expect(source).toContain("약속한 조건대로 실행됐습니다.");
    expect(source).toContain("4개 조건 모두 일치 · Receipt 발급됨");
    expect(source).toContain("Receipt serial");
    expect(source).toContain("GIWA Sepolia · Testnet");
    expect(source).toContain("4 / 4");
  });

  it("carries the same Receipt into Campaign Studio and Proof Ledger", () => {
    const projectCampaignPath = standaloneFunction<
      (
        receiptHash: string | null,
        matched: boolean,
        handoffReceiptHash: string | null
      ) => string | null
    >(source, "campaignStudioReceiptPath");
    const receiptHash = `0x${"8".repeat(64)}`;
    const otherReceiptHash = `0x${"9".repeat(64)}`;
    const start = source.indexOf("function renderReceiptNextParticipation");
    const end = source.indexOf("function renderReceiptArtifact", start);
    const nextParticipation = source.slice(start, end);

    expect(projectCampaignPath(receiptHash, true, null)).toBe(
      `/partner?receipt=${receiptHash}`
    );
    expect(
      projectCampaignPath(receiptHash, true, otherReceiptHash)
    ).toBe(`/partner?receipt=${receiptHash}`);
    expect(projectCampaignPath(receiptHash, true, receiptHash)).toBe(
      `/partner?receipt=${receiptHash}&handoff=issued`
    );
    expect(projectCampaignPath(receiptHash, false, receiptHash)).toBeNull();
    expect(source).toContain("function renderReceiptNextParticipation");
    expect(source).toContain("Campaign Studio에서 반영 확인");
    expect(source).toContain("Proof Ledger에서 공개 검증");
    expect(source).toContain("다음 참여");
    expect(nextParticipation).toContain(
      "campaignStudioReceiptPath("
    );
    expect(nextParticipation).toContain("readCampaignHandoffReceipt()");
    expect(nextParticipation).toContain("`/evidence?proof=${receiptHash}`");
    expect(source).toContain("공개 Receipt 보기");
    expect(source).not.toContain(
      'const proofPath =\n    matched && receiptHash !== null\n      ? `/receipt/${receiptHash}`'
    );
  });

  it("labels participant Receipt confirmations as a verification snapshot", () => {
    const start = source.indexOf("async function renderReceiptRoute");
    const end = source.indexOf("function renderHelp", start);
    const receiptRoute = source.slice(start, end);

    expect(receiptRoute).toContain('field("Verification snapshot"');
    expect(receiptRoute).toContain("confirmations observed");
    expect(receiptRoute).not.toContain('field("Confirmation depth"');
  });

  it("ships the responsive Receipt Artifact visual system", () => {
    expect(css).toContain(".receipt-artifact");
    expect(css).toContain(".receipt-artifact-summary");
    expect(css).toContain(".receipt-artifact-actions");
    expect(css).toContain(".receipt-next-participation");
    expect(css).toMatch(
      /\.receipt-artifact\s*>\s*\.verification-bundle\s*\{\s*order:\s*5;/u
    );
    expect(css).toMatch(/\.receipt-match-details\s*\{\s*order:\s*6;/u);
    expect(css).toMatch(
      /\.receipt-artifact\s*>\s*\.matched-receipt-technical\s*\{\s*order:\s*7;/u
    );
  });

  it("keeps receipt action labels readable across desktop and 390px layouts", () => {
    const utilityRules = css.slice(
      css.indexOf(".receipt-artifact-utilities,"),
      css.indexOf(".receipt-artifact-summary")
    );
    const narrowRules = css.slice(css.indexOf("@media (max-width: 430px)"));

    expect(source).toContain('text: "Receipt 링크 복사"');
    expect(source).toContain('text: "공개 Receipt 보기"');
    expect(source).not.toContain("공개 Receipt 상세 보기");
    expect(source).toContain('text: "Explorer에서 보기"');
    expect(utilityRules).toContain("white-space: nowrap");
    expect(utilityRules).toContain("word-break: keep-all");
    expect(narrowRules).toMatch(
      /\.receipt-artifact-utilities\s*\{\s*grid-template-columns:\s*1fr;/u
    );
  });
});

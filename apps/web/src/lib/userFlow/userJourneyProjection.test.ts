import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readUserFlow(): string {
  const direct = join(process.cwd(), "public/user-flow.js");
  const workspace = join(process.cwd(), "apps/web/public/user-flow.js");
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
      return Function(`"use strict"; return (${source.slice(start, index + 1)});`)() as T;
    }
  }
  throw new Error(`unterminated function ${name}`);
}

type JourneyStageId =
  | "prepare"
  | "signedMission"
  | "execute"
  | "match"
  | "collect";

type ProjectionInput = {
  missionReviewed: boolean;
  walletReady: boolean;
  assetsReady: boolean;
  manifestReady: boolean;
  approvalSubmitted: boolean;
  depositSubmitted: boolean;
  verifying: boolean;
  receiptReady: boolean;
  mismatched: boolean;
};

type Projection = {
  activeStage: JourneyStageId;
  stages: Array<{
    id: JourneyStageId;
    state: "pending" | "active" | "complete" | "blocked";
  }>;
};

const projectJourneyStageState = standaloneFunction<
  (input: ProjectionInput) => Projection
>(readUserFlow(), "projectJourneyStageState");

function input(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    missionReviewed: false,
    walletReady: false,
    assetsReady: false,
    manifestReady: false,
    approvalSubmitted: false,
    depositSubmitted: false,
    verifying: false,
    receiptReady: false,
    mismatched: false,
    ...overrides
  };
}

describe("projectJourneyStageState", () => {
  it.each([
    ["prepare", input(), "prepare"],
    ["signed mission", input({ missionReviewed: true }), "signedMission"],
    [
      "execute",
      input({
        missionReviewed: true,
        walletReady: true,
        assetsReady: true,
        manifestReady: true
      }),
      "execute"
    ],
    [
      "match",
      input({
        missionReviewed: true,
        walletReady: true,
        assetsReady: true,
        manifestReady: true,
        depositSubmitted: true,
        verifying: true
      }),
      "match"
    ],
    [
      "collect",
      input({
        missionReviewed: true,
        walletReady: true,
        assetsReady: true,
        manifestReady: true,
        depositSubmitted: true,
        receiptReady: true
      }),
      "collect"
    ]
  ] as const)("maps %s to %s", (_name, value, expected) => {
    const result = projectJourneyStageState(value);

    expect(result.activeStage).toBe(expected);
    expect(result.stages.filter((stage) => stage.state === "active")).toHaveLength(1);
  });

  it("blocks match and keeps collect pending after a mismatch", () => {
    const result = projectJourneyStageState(
      input({
        missionReviewed: true,
        walletReady: true,
        assetsReady: true,
        manifestReady: true,
        approvalSubmitted: true,
        depositSubmitted: true,
        mismatched: true
      })
    );

    expect(result.activeStage).toBe("match");
    expect(result.stages.find((stage) => stage.id === "match")?.state).toBe("blocked");
    expect(result.stages.find((stage) => stage.id === "collect")?.state).toBe("pending");
  });
});

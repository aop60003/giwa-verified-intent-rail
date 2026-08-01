import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("participant mission entry presentation", () => {
  it("offers wallet connection as the first action because conditions are already visible", () => {
    const source = readWebFile("public/user-flow.js");
    const actionStart = source.indexOf("function nextPrimaryAction()");
    const actionEnd = source.indexOf("function primaryLabel()", actionStart);
    const actionSource = source.slice(actionStart, actionEnd);

    expect(actionSource).toContain('if (walletState.account === null) return "connect";');
    expect(actionSource).not.toContain("missionReviewed");
    expect(source).not.toContain("review_mission");
    expect(source).not.toContain("USER_MISSION_REVIEW_KEY");
  });

  it("labels the shared top-left home link as the demo", () => {
    const shell = readWebFile("public/protocol-dossier.js");

    expect(shell).toContain('"LoopRail Demo"');
    expect(shell).not.toContain('"GIWA Verified Intent Rail"');
  });
});

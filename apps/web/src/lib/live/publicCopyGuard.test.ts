import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publicFiles = [
  "public/flow.js",
  "public/live-flow.js",
  "public/user.html",
  "public/user-flow.js",
  "public/index.html",
  "public/studio.html",
  "public/studio.js",
  "public/landing.html",
  "public/landing.css",
  "public/landing.js",
  "public/giwa-demo.html",
  "public/giwa-demo.css",
  "public/live.html",
  "public/demo.html",
  "public/demo-control-room.js",
  "public/studio-campaign-model.js",
  "public/campaign-version-model.js",
  "public/campaign.html",
  "public/campaign.js",
  "public/flow-data.json"
];

function publicFileContent(file: string): string {
  try {
    const directPath = join(process.cwd(), file);
    const workspacePath = join(process.cwd(), "apps/web", file);
    return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
  } catch {
    return "";
  }
}

function publicCopyCorpus(): string {
  return publicFiles
    .map((file) => publicFileContent(file))
    .join("\n");
}

describe("public commercial copy", () => {
  it("uses current product and demo language", () => {
    const copy = publicCopyCorpus();

    expect(copy).toContain("GIWA Verified Intent Rail");
    expect(copy).not.toMatch(
      /Loop Rail|Looprail|GIWA Verified Activation Rail/u
    );
    expect(copy).not.toContain("사용자가 Manifest에 서명");
    expect(copy).not.toContain("Manifest에 서명하세요");
    expect(copy).not.toMatch(/Sprint 10|Sprint 11|Sprint 12/u);
    expect(copy).not.toMatch(/Commercial receipt|Sprint 4 verifier/u);
    expect(copy).not.toContain("Receipt route is enabled only when receiptHash and decisionTxHash exist.");
    expect(copy).not.toContain("finalConfirmation");
  });

  it("keeps forbidden commercial claims out of public assets", () => {
    const copy = publicCopyCorpus();
    const forbiddenClaimPattern = new RegExp(
      [
        "instant final" + "ity",
        "200ms confirm" + "ed",
        "guarantee safe" + "ty",
        "perform K" + "YC",
        "real R" + "WA",
        "real y" + "ield",
        "real f" + "unds",
        "payment set" + "tled",
        "set" + "tlement (?:complete|completed|confirmed|final)"
      ].join("|"),
      "i"
    );

    expect(copy).not.toMatch(forbiddenClaimPattern);
    expect(copy).toContain("No settlement or finality claim");
  });

  it("keeps raw exception fallback copy out of public browser surfaces", () => {
    const copy = publicCopyCorpus();

    expect(copy).not.toMatch(/error\s+instanceof\s+Error\s*\?\s*error\.message/u);
    expect(copy).not.toContain("Unknown error");
    expect(copy).not.toContain("unknown error");
  });

  it("keeps the Draft editor model free of HTML construction and unsafe public claims", () => {
    const model = publicFileContent("public/studio-campaign-model.js");
    const forbiddenClaimPattern = /instant finality|200ms confirmed|guarantee safety|perform KYC|real RWA|real yield|real funds|payment settled|settlement (?:complete|completed|confirmed|final)/iu;

    expect(model).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write|createContextualFragment/u);
    expect(model).not.toMatch(/Loop Rail|Looprail|GIWA Verified Activation Rail/u);
    expect(model).not.toMatch(forbiddenClaimPattern);
  });

  it("keeps the campaign version preview dependency-light and execution-free", () => {
    const html = publicFileContent("public/campaign.html");
    const renderer = publicFileContent("public/campaign.js");

    expect(html).toContain('id="app"');
    expect(html).toContain('src="/protocol-dossier.js"');
    expect(html).toContain('src="/campaign.js"');
    expect(renderer).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write|createContextualFragment/u);
    expect(renderer).toContain("Campaign version not found");
    expect(renderer).toContain("Live campaign preview unavailable");
    expect(renderer).toContain('window.location.search !== ""');
    expect(renderer).toContain("text: campaign.summary");
    expect(renderer).toContain("Preview only - Transaction unavailable");
    expect(renderer).toContain("View existing Campaign evidence board");
    expect(renderer).toContain("no execution or Receipt evidence");
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const publicModelPath: string = "../../../public/campaign-version-model.js";
const publicModel = import(publicModelPath);

const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
const routePath = `/campaign/${campaignId}/v/2`;

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

function publicPayload(overrides: Record<string, unknown> = {}) {
  return {
    campaign: {
      campaignId,
      versionNumber: 2,
      name: "Testnet campaign",
      summary: "A mock-only campaign version preview.",
      actionTemplate: "mockVaultDeposit",
      campaignVersionHash: `0x${"a".repeat(64)}`,
      publishedAt: "2026-08-01T00:00:00.000Z",
      chainId: 91342,
      network: "GIWA Sepolia",
      publicPath: routePath,
      executionAvailable: false,
      ...overrides
    }
  };
}

describe("public campaign version presentation", () => {
  it("keeps the Campaign header compact through the 801px and 820px intrinsic-overflow gap", () => {
    const styles = readWebFile("public/styles.css");
    const compactMedia = /@media \(max-width: ([0-9]+)px\) \{\s*\.protocol-product-bar-campaign/u.exec(styles);
    const compactBreakpoint = Number(compactMedia?.[1]);
    const compactStart = compactMedia?.index ?? -1;
    const compactEnd = styles.indexOf("@media (max-width: 760px)", compactStart);
    const compactStyles = styles.slice(compactStart, compactEnd);

    expect(compactStart).toBeGreaterThanOrEqual(0);
    expect(compactEnd).toBeGreaterThan(compactStart);
    expect(compactBreakpoint).toBeGreaterThanOrEqual(820);
    expect(compactBreakpoint).toBeLessThan(1024);
    expect([801, 820].every((width) => width <= compactBreakpoint)).toBe(true);
    expect(compactStyles).toContain(".protocol-product-bar-campaign");
    expect(compactStyles).toContain("grid-template-areas:");
    expect(compactStyles).toMatch(
      /\.protocol-product-bar-campaign \.protocol-destinations\s*\{[^}]*min-width: 0;[^}]*max-width: 100%;[^}]*overflow-x: auto;/su
    );
    expect(compactStyles).toMatch(
      /\.protocol-product-bar-campaign \.protocol-destination\s*\{[^}]*width: auto;[^}]*min-height: var\(--protocol-target\);/su
    );
  });

  it("accepts only the canonical decoded campaign version route", async () => {
    const { campaignVersionRoute } = await publicModel;
    expect(campaignVersionRoute(routePath)).toEqual({ campaignId, versionNumber: 2 });
    expect(campaignVersionRoute("/campaign/gasok-demo/v/1")).toBeNull();
    expect(campaignVersionRoute(`/campaign/${campaignId}/v/0`)).toBeNull();
    expect(campaignVersionRoute(`/campaign/${campaignId.toUpperCase()}/v/2`)).toBeNull();
    expect(campaignVersionRoute(`${routePath}/`)).toBeNull();
    expect(campaignVersionRoute(`${routePath}?preview=1`)).toBeNull();
    expect(campaignVersionRoute(`/campaign/${campaignId}/v/9007199254740992`)).toBeNull();
  });

  it("projects only an exact public-safe version matching its route", async () => {
    const { campaignVersionRoute, projectPublicCampaignVersion } = await publicModel;
    const route = campaignVersionRoute(routePath);
    expect(route).not.toBeNull();
    const projected = projectPublicCampaignVersion(publicPayload(), route);
    expect(projected).toEqual({
      campaignId,
      versionNumber: 2,
      name: "Testnet campaign",
      summary: "A mock-only campaign version preview.",
      actionTemplate: "mockVaultDeposit",
      campaignVersionHash: `0x${"a".repeat(64)}`,
      publishedAt: "2026-08-01T00:00:00.000Z",
      chainId: 91342,
      network: "GIWA Sepolia",
      publicPath: routePath,
      executionAvailable: false
    });
    expect(Object.isFrozen(projected)).toBe(true);
  });

  it("keeps a projected public Version snapshot unchanged when its source payload is later edited", async () => {
    const { campaignVersionRoute, projectPublicCampaignVersion } = await publicModel;
    const route = campaignVersionRoute(routePath);
    const payload = publicPayload();
    expect(route).not.toBeNull();
    const projected = projectPublicCampaignVersion(payload, route);
    expect(projected).not.toBeNull();

    payload.campaign.name = "Later Draft edit";
    payload.campaign.summary = "Later Draft summary";

    expect(projected).toMatchObject({
      name: "Testnet campaign",
      summary: "A mock-only campaign version preview.",
      versionNumber: 2
    });
    expect(Object.isFrozen(projected)).toBe(true);
  });

  it("keeps an empty published Draft summary in the public-safe view", async () => {
    const { campaignVersionRoute, projectPublicCampaignVersion } = await publicModel;
    const route = campaignVersionRoute(routePath);
    expect(route).not.toBeNull();
    expect(projectPublicCampaignVersion(publicPayload({ summary: "" }), route)).toMatchObject({
      campaignId,
      summary: ""
    });
  });

  it("rejects malformed, mismatched, and execution-capable payloads", async () => {
    const { campaignVersionRoute, projectPublicCampaignVersion } = await publicModel;
    const route = campaignVersionRoute(routePath);
    expect(route).not.toBeNull();
    for (const payload of [
      publicPayload({ campaignId: "campaign_00000000-0000-4000-8000-000000000002" }),
      publicPayload({ versionNumber: 3 }),
      publicPayload({ publicPath: `/campaign/${campaignId}/v/3` }),
      publicPayload({ campaignVersionHash: `0x${"A".repeat(64)}` }),
      publicPayload({ chainId: 1 }),
      publicPayload({ network: "GIWA Mainnet" }),
      publicPayload({ actionTemplate: "deposit" }),
      publicPayload({ executionAvailable: true }),
      publicPayload({ executionAvailable: false, walletCapability: "connect" }),
      { campaign: { campaignId } }
    ]) {
      expect(projectPublicCampaignVersion(payload, route)).toBeNull();
    }
  });
});

import { describe, expect, it } from "vitest";

import { classifyLiveApiRoute } from "./liveRoutePolicy.ts";

describe("classifyLiveApiRoute", () => {
  it("classifies the public, participant, partner, and unknown API boundaries", () => {
    expect(classifyLiveApiRoute("GET", "/api/public/config")).toBe("public");
    expect(
      classifyLiveApiRoute("GET", "/api/public/campaign-studio")
    ).toBe("public");
    expect(
      classifyLiveApiRoute(
        "GET",
        `/api/public/evidence/0x${"a".repeat(64)}`
      )
    ).toBe("public");
    expect(classifyLiveApiRoute("POST", "/api/public/events")).toBe("public");
    expect(classifyLiveApiRoute("POST", "/api/runs")).toBe("participant-create");
    expect(classifyLiveApiRoute("GET", "/api/runs/run-1")).toBe("participant");
    expect(classifyLiveApiRoute("POST", "/api/runs/run-1/evidence")).toBe("participant");
    expect(classifyLiveApiRoute("GET", "/api/receipts/0xabc")).toBe("public");
    expect(classifyLiveApiRoute("GET", "/api/partner/runs")).toBe("partner");
    expect(classifyLiveApiRoute("GET", "/api/unknown")).toBe("unknown");
  });

  it("classifies demo status as a protected partner boundary", () => {
    expect(classifyLiveApiRoute("GET", "/api/demo/status")).toBe("partner");
  });

  it("classifies only the four exact authentication method and path pairs", () => {
    expect(classifyLiveApiRoute("POST", "/api/auth/challenge")).toBe("auth");
    expect(classifyLiveApiRoute("POST", "/api/auth/verify")).toBe("auth");
    expect(classifyLiveApiRoute("GET", "/api/auth/session")).toBe("auth");
    expect(classifyLiveApiRoute("POST", "/api/auth/logout")).toBe("auth");
    expect(classifyLiveApiRoute("GET", "/api/auth/challenge")).toBe("unknown");
    expect(classifyLiveApiRoute("POST", "/api/auth/challenge/extra")).toBe("unknown");
  });

  it("keeps only one bounded public evidence path segment on the public boundary", () => {
    expect(classifyLiveApiRoute("GET", "/api/public/evidence/not-a-hash")).toBe(
      "public"
    );
    expect(classifyLiveApiRoute("GET", "/api/public/evidence/")).toBe("unknown");
    expect(
      classifyLiveApiRoute("GET", "/api/public/evidence/hash/extra")
    ).toBe("unknown");
    expect(
      classifyLiveApiRoute("POST", `/api/public/evidence/0x${"a".repeat(64)}`)
    ).toBe("unknown");
  });

  it("keeps the event collector on one exact public POST route", () => {
    expect(classifyLiveApiRoute("GET", "/api/public/events")).toBe("unknown");
    expect(classifyLiveApiRoute("POST", "/api/public/events/")).toBe("unknown");
    expect(classifyLiveApiRoute("POST", "/api/public/events/private")).toBe(
      "unknown"
    );
  });

  it("classifies only the exact Studio campaign collection and draft update routes", () => {
    const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
    expect(classifyLiveApiRoute("GET", "/api/studio/campaigns")).toBe("studio");
    expect(classifyLiveApiRoute("POST", "/api/studio/campaigns")).toBe("studio");
    expect(classifyLiveApiRoute("PATCH", `/api/studio/campaigns/${campaignId}`)).toBe("studio");
    expect(classifyLiveApiRoute("PATCH", "/api/studio/campaigns/gasok-demo")).toBe("studio");

    for (const [method, pathname] of [
      ["DELETE", `/api/studio/campaigns/${campaignId}`],
      ["PATCH", "/api/studio/campaigns/campaign_not-a-uuid"],
      ["PATCH", `/api/studio/campaigns/${campaignId}/extra`],
      ["PATCH", `/api/studio/campaigns/${campaignId}?revision=1`],
      ["patch", `/api/studio/campaigns/${campaignId}`],
      ["GET", "/api/studio/campaigns/"],
      ["POST", "/api/studio/campaigns/extra"]
    ] as const) {
      expect(classifyLiveApiRoute(method, pathname), `${method} ${pathname}`).toBe("unknown");
    }
  });

  it("classifies only exact campaign publishing and public-version routes", () => {
    const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
    const campaignPath = `/api/studio/campaigns/${campaignId}`;
    const publicPath = `/api/public/campaigns/${campaignId}/versions`;
    expect(classifyLiveApiRoute("POST", `${campaignPath}/publish`)).toBe("studio");
    expect(classifyLiveApiRoute("GET", `${campaignPath}/versions`)).toBe("studio");
    expect(classifyLiveApiRoute("GET", `${publicPath}/1`)).toBe("campaign-version-public");

    for (const [method, pathname] of [
      ["DELETE", `${campaignPath}/publish`],
      ["GET", `${campaignPath}/publish`],
      ["POST", `${campaignPath}/versions`],
      ["GET", `${campaignPath}/publish?revision=1`],
      ["GET", `${campaignPath}/versions/`],
      ["GET", "/api/public/campaigns/gasok-demo/versions/1"],
      ["GET", `${publicPath}/0`],
      ["GET", `${publicPath}/9007199254740992`],
      ["GET", `${publicPath}/1/extra`]
    ] as const) {
      expect(classifyLiveApiRoute(method, pathname), `${method} ${pathname}`).toBe("unknown");
    }
  });
});

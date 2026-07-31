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
});

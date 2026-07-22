import { describe, expect, it } from "vitest";

import { classifyLiveApiRoute } from "./liveRoutePolicy.ts";

describe("classifyLiveApiRoute", () => {
  it("classifies the public, participant, partner, and unknown API boundaries", () => {
    expect(classifyLiveApiRoute("GET", "/api/public/config")).toBe("public");
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
});

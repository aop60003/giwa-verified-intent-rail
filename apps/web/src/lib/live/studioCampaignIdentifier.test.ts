import { describe, expect, it } from "vitest";

import { isPositiveSafeInteger, isStudioDraftCampaignId } from "./studioCampaignIdentifier.ts";

describe("Studio campaign identifiers", () => {
  it("accepts only canonical Studio Draft campaign IDs", () => {
    expect(isStudioDraftCampaignId("campaign_00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isStudioDraftCampaignId("gasok-demo")).toBe(false);
    expect(isStudioDraftCampaignId("campaign_not-a-uuid")).toBe(false);
  });

  it("accepts only positive safe integer values", () => {
    expect(isPositiveSafeInteger(1)).toBe(true);
    expect(isPositiveSafeInteger(0)).toBe(false);
    expect(isPositiveSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });
});

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  PUBLIC_CAMPAIGN_EVENT_BODY_MAX_BYTES,
  parsePublicCampaignEventInput,
  toPublicCampaignEventRecord
} from "./publicCampaignAnalytics.ts";

const validEvent = {
  eventType: "campaignVisited",
  anonymousSessionId: "9b2f8a0d-a733-4db7-b058-1c6f70ef1f8a",
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit"
} as const;

describe("public campaign analytics", () => {
  it("accepts only the exact fixed anonymous-event contract", () => {
    expect(parsePublicCampaignEventInput(validEvent)).toEqual(validEvent);
    expect(
      parsePublicCampaignEventInput({
        ...validEvent,
        eventType: "walletConnected"
      })
    ).toMatchObject({ eventType: "walletConnected" });

    for (const input of [
      { ...validEvent, eventType: "depositSubmitted" },
      { ...validEvent, campaignId: "campaign-override" },
      { ...validEvent, missionId: "mission-override" },
      { ...validEvent, anonymousSessionId: "not-a-uuid" },
      { ...validEvent, anonymousSessionId: "00000000-0000-0000-0000-000000000000" },
      { ...validEvent, wallet: "0x1111111111111111111111111111111111111111" }
    ]) {
      expect(() => parsePublicCampaignEventInput(input), JSON.stringify(input)).toThrow(
        "invalid_public_campaign_event"
      );
    }
  });

  it("rejects bodies above the event-specific byte bound", () => {
    expect(PUBLIC_CAMPAIGN_EVENT_BODY_MAX_BYTES).toBeLessThanOrEqual(1024);
    expect(() =>
      parsePublicCampaignEventInput({
        ...validEvent,
        anonymousSessionId: `${validEvent.anonymousSessionId}${"x".repeat(
          PUBLIC_CAMPAIGN_EVENT_BODY_MAX_BYTES
        )}`
      })
    ).toThrow("public_campaign_event_body_too_large");
  });

  it("projects only a SHA-256 session hash into the persisted record", () => {
    const recordedAt = "2026-07-31T01:02:03.000Z";
    const record = toPublicCampaignEventRecord(validEvent, recordedAt);
    const expectedHash = createHash("sha256")
      .update(validEvent.anonymousSessionId, "utf8")
      .digest("hex");

    expect(record).toEqual({
      eventType: "campaignVisited",
      sessionHash: expectedHash,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      recordedAt
    });
    expect(Object.keys(record).sort()).toEqual(
      ["campaignId", "eventType", "missionId", "recordedAt", "sessionHash"].sort()
    );
    expect(JSON.stringify(record)).not.toContain(validEvent.anonymousSessionId);
    expect(JSON.stringify(record)).not.toMatch(
      /ip|userAgent|headers|referrer|requestId|wallet|runId|capability/iu
    );
  });

  it("canonicalizes UUID case before hashing so case variants are idempotent", () => {
    const uppercaseInput = {
      ...validEvent,
      anonymousSessionId: validEvent.anonymousSessionId.toUpperCase()
    };
    const lower = parsePublicCampaignEventInput(validEvent);
    const upper = parsePublicCampaignEventInput(uppercaseInput);

    expect(upper.anonymousSessionId).toBe(validEvent.anonymousSessionId);
    expect(
      toPublicCampaignEventRecord(upper, "2026-07-31T01:02:03.000Z")
        .sessionHash
    ).toBe(
      toPublicCampaignEventRecord(lower, "2026-07-31T01:02:03.000Z")
        .sessionHash
    );
  });

  it("requires a canonical timestamp before persisting", () => {
    for (const recordedAt of [
      "not-a-date",
      "2026-07-31",
      "2026-07-31T01:02:03Z",
      "2026-07-31T01:02:03.000+00:00"
    ]) {
      expect(() => toPublicCampaignEventRecord(validEvent, recordedAt)).toThrow(
        "invalid_public_campaign_event_timestamp"
      );
    }
  });
});

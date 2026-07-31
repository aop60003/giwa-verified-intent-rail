import { createHash } from "node:crypto";

import type {
  PublicCampaignEventInput,
  PublicCampaignEventRecord
} from "./liveTypes.ts";

export const PUBLIC_CAMPAIGN_EVENT_BODY_MAX_BYTES = 512;
export const PUBLIC_CAMPAIGN_ID = "gasok-demo";
export const PUBLIC_CAMPAIGN_MISSION_ID = "first-mock-vault-deposit";

const EVENT_TYPES = new Set(["campaignVisited", "walletConnected"]);
const EVENT_KEYS = new Set([
  "eventType",
  "anonymousSessionId",
  "campaignId",
  "missionId"
]);
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA_256_PATTERN = /^[0-9a-f]{64}$/u;

function canonicalTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function serializedByteLength(value: unknown): number {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined
      ? Number.POSITIVE_INFINITY
      : new TextEncoder().encode(serialized).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function parsePublicCampaignEventInput(
  value: unknown
): PublicCampaignEventInput {
  if (serializedByteLength(value) > PUBLIC_CAMPAIGN_EVENT_BODY_MAX_BYTES) {
    throw new Error("public_campaign_event_body_too_large");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_public_campaign_event");
  }
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body);
  if (
    keys.length !== EVENT_KEYS.size ||
    keys.some((key) => !EVENT_KEYS.has(key)) ||
    !EVENT_TYPES.has(String(body.eventType)) ||
    typeof body.anonymousSessionId !== "string" ||
    !UUID_V4_PATTERN.test(body.anonymousSessionId) ||
    body.campaignId !== PUBLIC_CAMPAIGN_ID ||
    body.missionId !== PUBLIC_CAMPAIGN_MISSION_ID
  ) {
    throw new Error("invalid_public_campaign_event");
  }
  return {
    eventType: body.eventType as PublicCampaignEventInput["eventType"],
    anonymousSessionId: body.anonymousSessionId.toLowerCase(),
    campaignId: PUBLIC_CAMPAIGN_ID,
    missionId: PUBLIC_CAMPAIGN_MISSION_ID
  };
}

export function assertPublicCampaignEventRecord(
  value: PublicCampaignEventRecord
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== 5 ||
    keys.some(
      (key) =>
        !["eventType", "sessionHash", "campaignId", "missionId", "recordedAt"].includes(
          key
        )
    ) ||
    !EVENT_TYPES.has(value.eventType) ||
    !SHA_256_PATTERN.test(value.sessionHash) ||
    value.campaignId !== PUBLIC_CAMPAIGN_ID ||
    value.missionId !== PUBLIC_CAMPAIGN_MISSION_ID ||
    !canonicalTimestamp(value.recordedAt)
  ) {
    throw new Error("invalid_public_campaign_event_record");
  }
}

export function toPublicCampaignEventRecord(
  input: PublicCampaignEventInput,
  recordedAt: string
): PublicCampaignEventRecord {
  if (!canonicalTimestamp(recordedAt)) {
    throw new Error("invalid_public_campaign_event_timestamp");
  }
  return {
    eventType: input.eventType,
    sessionHash: createHash("sha256")
      .update(input.anonymousSessionId.toLowerCase(), "utf8")
      .digest("hex"),
    campaignId: input.campaignId,
    missionId: input.missionId,
    recordedAt
  };
}

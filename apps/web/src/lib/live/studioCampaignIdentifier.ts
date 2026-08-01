const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
export const STUDIO_DRAFT_CAMPAIGN_ID_PATTERN = new RegExp(`^campaign_${UUID_V4}$`, "u");

export function isStudioDraftCampaignId(value: unknown): value is string {
  return typeof value === "string" && STUDIO_DRAFT_CAMPAIGN_ID_PATTERN.test(value);
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

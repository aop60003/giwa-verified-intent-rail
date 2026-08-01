const CAMPAIGN_VERSION_ROUTE = /^\/campaign\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/v\/([1-9][0-9]*)$/u;
const VERSION_HASH = /^0x[0-9a-f]{64}$/u;
const PUBLIC_FIELDS = [
  "campaignId",
  "versionNumber",
  "name",
  "summary",
  "actionTemplate",
  "campaignVersionHash",
  "publishedAt",
  "chainId",
  "network",
  "publicPath",
  "executionAvailable"
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactOwn(value, fields) {
  if (!isRecord(value)) return false;
  try {
    const keys = Reflect.ownKeys(value);
    return keys.length === fields.length && fields.every((field) => Object.hasOwn(value, field));
  } catch {
    return false;
  }
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function campaignVersionRoute(pathname) {
  if (typeof pathname !== "string") return null;
  const matched = CAMPAIGN_VERSION_ROUTE.exec(pathname);
  if (matched?.[1] === undefined || matched[2] === undefined) return null;
  const versionNumber = Number(matched[2]);
  return Number.isSafeInteger(versionNumber) && versionNumber > 0
    ? { campaignId: matched[1], versionNumber }
    : null;
}

export function projectPublicCampaignVersion(payload, route) {
  try {
    if (!hasExactOwn(payload, ["campaign"]) || !hasExactOwn(payload.campaign, PUBLIC_FIELDS)) return null;
    if (!isRecord(route) || !Object.hasOwn(route, "campaignId") || !Object.hasOwn(route, "versionNumber")) return null;
    const campaign = payload.campaign;
    if (
      campaign.campaignId !== route.campaignId ||
      campaign.versionNumber !== route.versionNumber ||
      !Number.isSafeInteger(campaign.versionNumber) ||
      campaign.versionNumber <= 0 ||
      campaign.publicPath !== `/campaign/${route.campaignId}/v/${route.versionNumber}` ||
      !isText(campaign.name) ||
      typeof campaign.summary !== "string" ||
      campaign.actionTemplate !== "mockVaultDeposit" ||
      !VERSION_HASH.test(campaign.campaignVersionHash) ||
      !isText(campaign.publishedAt) ||
      campaign.chainId !== 91342 ||
      campaign.network !== "GIWA Sepolia" ||
      campaign.executionAvailable !== false
    ) return null;

    return Object.freeze({
      campaignId: campaign.campaignId,
      versionNumber: campaign.versionNumber,
      name: campaign.name,
      summary: campaign.summary,
      actionTemplate: campaign.actionTemplate,
      campaignVersionHash: campaign.campaignVersionHash,
      publishedAt: campaign.publishedAt,
      chainId: campaign.chainId,
      network: campaign.network,
      publicPath: campaign.publicPath,
      executionAvailable: campaign.executionAvailable
    });
  } catch {
    return null;
  }
}

import { randomBytes as nodeRandomBytes } from "node:crypto";

import type { StudioWalletAuthContext } from "./studioAuthService.ts";
import { isPositiveSafeInteger, isStudioDraftCampaignId } from "./studioCampaignIdentifier.ts";
import type { StudioCampaignRecord, StudioCampaignRepository } from "./studioCampaignRepository.ts";

declare const Buffer: {
  from(value: string, encoding: "base64url"): Uint8Array;
};

export const STUDIO_CAMPAIGN_NAME_LIMIT = 80;
export const STUDIO_CAMPAIGN_SUMMARY_LIMIT = 280;
export const STUDIO_CAMPAIGN_BODY_MAX_BYTES = 4 * 1024;

export type StudioCampaignProjection = {
  campaignId: string;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  lifecycleState: "draft" | "published-baseline";
  editable: boolean;
  revision: number;
  updatedAt: string;
};

type StudioCampaignServiceErrorCode =
  | "invalid_request"
  | "insufficient_access"
  | "not_found"
  | "revision_conflict";

export class StudioCampaignServiceError extends Error {
  constructor(public readonly code: StudioCampaignServiceErrorCode) {
    super(code);
  }
}

const BASELINE_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const DISALLOWED_C0_CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F]/u;

function randomUuid(): string {
  const bytes = Buffer.from(nodeRandomBytes(16).toString("base64url"), "base64url");
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const variant = "89ab"[Number.parseInt(hex[16]!, 16) & 0b11]!;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function invalidRequest(): never {
  throw new StudioCampaignServiceError("invalid_request");
}

function requireOwner(context: StudioWalletAuthContext): void {
  if (context.organizationRole !== "Owner") {
    throw new StudioCampaignServiceError("insufficient_access");
  }
}

function project(record: StudioCampaignRecord): StudioCampaignProjection {
  return {
    campaignId: record.campaignId,
    name: record.name,
    summary: record.summary,
    actionTemplate: record.actionTemplate,
    lifecycleState: record.lifecycleState,
    editable: record.lifecycleState === "draft" && record.source === "studio-draft",
    revision: record.revision,
    updatedAt: record.updatedAt
  };
}

function validateText(value: unknown, limit: number, options: { allowLineBreaks: boolean }): string {
  if (typeof value !== "string") return invalidRequest();
  const normalized = options.allowLineBreaks ? value.replace(/\r\n/gu, "\n") : value;
  if (
    DISALLOWED_C0_CONTROL.test(normalized) ||
    (!options.allowLineBreaks && /[\r\n]/u.test(normalized)) ||
    (options.allowLineBreaks && /\r/u.test(normalized))
  ) return invalidRequest();
  const trimmed = normalized.trim();
  if (trimmed.length === 0 || [...trimmed].length > limit) return invalidRequest();
  return trimmed;
}

function validateSummary(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string") return invalidRequest();
  const normalized = value.replace(/\r\n/gu, "\n");
  if (DISALLOWED_C0_CONTROL.test(normalized) || /\r/u.test(normalized)) return invalidRequest();
  const trimmed = normalized.trim();
  if ([...trimmed].length > STUDIO_CAMPAIGN_SUMMARY_LIMIT) return invalidRequest();
  return trimmed;
}

function validateCampaignId(campaignId: unknown): string {
  if (typeof campaignId !== "string" || (campaignId !== "gasok-demo" && !isStudioDraftCampaignId(campaignId))) {
    return invalidRequest();
  }
  return campaignId;
}

function validateRevision(revision: unknown): number {
  if (!isPositiveSafeInteger(revision)) return invalidRequest();
  return revision;
}

export function createStudioCampaignService(options: {
  repository: StudioCampaignRepository;
  now?: () => Date;
  randomUUID?: () => string;
}) {
  const now = options.now ?? (() => new Date());
  const randomUUID = options.randomUUID ?? randomUuid;

  return {
    bootstrapBaseline(organizationId: string): StudioCampaignProjection {
      return project(options.repository.bootstrapPublishedBaseline({
        campaignId: "gasok-demo",
        organizationId,
        name: "GIWA Verified Intent Rail GASOK Testnet Demo",
        summary: "Existing verified-intent testnet campaign.",
        actionTemplate: "mockVaultDeposit",
        lifecycleState: "published-baseline",
        source: "gasok-evidence",
        revision: 1,
        createdByMemberId: null,
        updatedByMemberId: null,
        createdAt: BASELINE_TIMESTAMP,
        updatedAt: BASELINE_TIMESTAMP
      }));
    },

    listCampaigns(context: StudioWalletAuthContext) {
      requireOwner(context);
      return {
        campaigns: options.repository.listForOrganization(context.tenantId).map(project),
        limits: { name: STUDIO_CAMPAIGN_NAME_LIMIT, summary: STUDIO_CAMPAIGN_SUMMARY_LIMIT } as const
      };
    },

    createDraft(context: StudioWalletAuthContext, input: { name: string; summary?: string }): StudioCampaignProjection {
      requireOwner(context);
      const name = validateText(input?.name, STUDIO_CAMPAIGN_NAME_LIMIT, { allowLineBreaks: false });
      const summary = validateSummary(input?.summary);
      const campaignId = `campaign_${randomUUID()}`;
      if (!isStudioDraftCampaignId(campaignId)) invalidRequest();
      const timestamp = now().toISOString();
      return project(options.repository.createDraft({
        campaignId,
        organizationId: context.tenantId,
        name,
        summary,
        actionTemplate: "mockVaultDeposit",
        lifecycleState: "draft",
        source: "studio-draft",
        revision: 1,
        createdByMemberId: context.memberId,
        updatedByMemberId: context.memberId,
        createdAt: timestamp,
        updatedAt: timestamp
      }));
    },

    updateDraft(context: StudioWalletAuthContext, input: {
      campaignId: string;
      name: string;
      summary: string;
      revision: number;
    }): StudioCampaignProjection {
      requireOwner(context);
      const campaignId = validateCampaignId(input?.campaignId);
      const name = validateText(input?.name, STUDIO_CAMPAIGN_NAME_LIMIT, { allowLineBreaks: false });
      const summary = validateSummary(input?.summary);
      const expectedRevision = validateRevision(input?.revision);
      const result = options.repository.updateDraft({
        organizationId: context.tenantId,
        campaignId,
        name,
        summary,
        updatedByMemberId: context.memberId,
        updatedAt: now().toISOString(),
        expectedRevision
      });
      if (!result.ok) throw new StudioCampaignServiceError(result.reason);
      return project(result.campaign);
    }
  };
}

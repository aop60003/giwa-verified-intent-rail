import { keccak256, toBytes } from "viem";

import type { StudioWalletAuthContext } from "./studioAuthService.ts";
import { isPositiveSafeInteger, isStudioDraftCampaignId } from "./studioCampaignIdentifier.ts";
import type {
  StudioCampaignVersionRecord,
  StudioCampaignVersionRepository
} from "./studioCampaignVersionRepository.ts";

const CHAIN_ID = 91342 as const;
const NETWORK = "GIWA Sepolia" as const;
const ACTION_TEMPLATE = "mockVaultDeposit" as const;

export type CanonicalCampaignVersionInput = {
  schemaVersion: "1";
  chainId: 91342;
  campaignId: string;
  versionNumber: number;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  sourceDraftRevision: number;
  publishedAt: string;
};

export type StudioCampaignVersionServiceErrorCode =
  | "invalid_request"
  | "insufficient_access"
  | "not_found"
  | "revision_conflict"
  | "already_published"
  | "no_changes_to_publish";

export type ExistingPublishedVersionProjection = {
  versionNumber: number;
  publicPath: string;
};

export class StudioCampaignVersionServiceError extends Error {
  constructor(
    public readonly code: StudioCampaignVersionServiceErrorCode,
    public readonly existingVersion: ExistingPublishedVersionProjection | null = null
  ) {
    super(code);
    this.name = "StudioCampaignVersionServiceError";
  }
}

export type StudioCampaignVersionProjection = {
  campaignId: string;
  versionNumber: number;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  sourceDraftRevision: number;
  campaignVersionHash: `0x${string}`;
  publishedAt: string;
  publicPath: string;
};

export type StudioCampaignVersionPublicationProjection = Pick<
  StudioCampaignVersionProjection,
  "campaignId" | "versionNumber" | "campaignVersionHash" | "publishedAt" | "publicPath"
>;

export type PublicCampaignVersionProjection = {
  campaignId: string;
  versionNumber: number;
  name: string;
  summary: string;
  actionTemplate: "mockVaultDeposit";
  campaignVersionHash: `0x${string}`;
  publishedAt: string;
  chainId: 91342;
  network: "GIWA Sepolia";
  publicPath: string;
  executionAvailable: false;
};

export function canonicalCampaignVersionJson(input: CanonicalCampaignVersionInput): string {
  return JSON.stringify({
    schemaVersion: input.schemaVersion,
    chainId: input.chainId,
    campaignId: input.campaignId,
    versionNumber: input.versionNumber,
    name: input.name,
    summary: input.summary,
    actionTemplate: input.actionTemplate,
    sourceDraftRevision: input.sourceDraftRevision,
    publishedAt: input.publishedAt
  });
}

function invalidRequest(): never {
  throw new StudioCampaignVersionServiceError("invalid_request");
}

function requireOwner(context: StudioWalletAuthContext): void {
  if (context.organizationRole !== "Owner") {
    throw new StudioCampaignVersionServiceError("insufficient_access");
  }
}

function validateCampaignId(campaignId: unknown): string {
  if (!isStudioDraftCampaignId(campaignId)) return invalidRequest();
  return campaignId;
}

function validatePositiveSafeInteger(value: unknown): number {
  if (!isPositiveSafeInteger(value)) return invalidRequest();
  return value;
}

function publicPath(campaignId: string, versionNumber: number): string {
  return `/campaign/${campaignId}/v/${versionNumber}`;
}

function projectExistingVersion(record: StudioCampaignVersionRecord): ExistingPublishedVersionProjection {
  if (!isStudioDraftCampaignId(record.campaignId) || !isPositiveSafeInteger(record.versionNumber)) {
    throw new Error("invalid_studio_campaign_version");
  }
  return { versionNumber: record.versionNumber, publicPath: publicPath(record.campaignId, record.versionNumber) };
}

function projectVersion(record: StudioCampaignVersionRecord): StudioCampaignVersionProjection {
  return {
    campaignId: record.campaignId,
    versionNumber: record.versionNumber,
    name: record.name,
    summary: record.summary,
    actionTemplate: ACTION_TEMPLATE,
    sourceDraftRevision: record.sourceDraftRevision,
    campaignVersionHash: record.campaignVersionHash,
    publishedAt: record.publishedAt,
    publicPath: publicPath(record.campaignId, record.versionNumber)
  };
}

function isDuplicateHashError(error: unknown): boolean {
  return error instanceof Error && error.message === "duplicate_studio_campaign_version_hash";
}

export function createStudioCampaignVersionService(options: {
  repository: StudioCampaignVersionRepository;
  now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());

  return {
    publishVersion(context: StudioWalletAuthContext, input: {
      campaignId: string;
      revision: number;
    }): StudioCampaignVersionPublicationProjection {
      requireOwner(context);
      const campaignId = validateCampaignId(input?.campaignId);
      const revision = validatePositiveSafeInteger(input?.revision);
      const publishedAt = now().toISOString();

      let result;
      try {
        result = options.repository.publishDraftVersion({
          organizationId: context.tenantId,
          campaignId,
          expectedRevision: revision,
          publishedByMemberId: context.memberId,
          publishedAt,
          buildVersion: (campaign, versionNumber) => {
            const canonicalJson = canonicalCampaignVersionJson({
              schemaVersion: "1",
              chainId: CHAIN_ID,
              campaignId: campaign.campaignId,
              versionNumber,
              name: campaign.name,
              summary: campaign.summary,
              actionTemplate: ACTION_TEMPLATE,
              sourceDraftRevision: campaign.revision,
              publishedAt
            });
            return {
              campaignId: campaign.campaignId,
              organizationId: campaign.organizationId,
              versionNumber,
              name: campaign.name,
              summary: campaign.summary,
              actionTemplate: ACTION_TEMPLATE,
              sourceDraftRevision: campaign.revision,
              canonicalJson,
              campaignVersionHash: keccak256(toBytes(canonicalJson)),
              publishedByMemberId: context.memberId,
              publishedAt
            };
          }
        });
      } catch (error) {
        if (isDuplicateHashError(error)) throw new Error("campaign version publication unavailable");
        throw error;
      }

      if (result.ok) {
        return {
          campaignId: result.version.campaignId,
          versionNumber: result.version.versionNumber,
          campaignVersionHash: result.version.campaignVersionHash,
          publishedAt: result.version.publishedAt,
          publicPath: publicPath(result.version.campaignId, result.version.versionNumber)
        };
      }
      if (result.reason === "already_published" || result.reason === "no_changes_to_publish") {
        throw new StudioCampaignVersionServiceError(result.reason, projectExistingVersion(result.existingVersion));
      }
      throw new StudioCampaignVersionServiceError(result.reason);
    },

    listVersions(context: StudioWalletAuthContext, input: { campaignId: string }): { versions: StudioCampaignVersionProjection[] } {
      requireOwner(context);
      const campaignId = validateCampaignId(input?.campaignId);
      return {
        versions: options.repository.listForOrganizationCampaign(context.tenantId, campaignId).map(projectVersion)
      };
    },

    getPublicVersion(input: {
      campaignId: string;
      versionNumber: number;
    }): { campaign: PublicCampaignVersionProjection } {
      const campaignId = validateCampaignId(input?.campaignId);
      const versionNumber = validatePositiveSafeInteger(input?.versionNumber);
      const record = options.repository.getPublicVersion(campaignId, versionNumber);
      if (record === null) throw new StudioCampaignVersionServiceError("not_found");
      return {
        campaign: {
          campaignId: record.campaignId,
          versionNumber: record.versionNumber,
          name: record.name,
          summary: record.summary,
          actionTemplate: ACTION_TEMPLATE,
          campaignVersionHash: record.campaignVersionHash,
          publishedAt: record.publishedAt,
          chainId: CHAIN_ID,
          network: NETWORK,
          publicPath: publicPath(record.campaignId, record.versionNumber),
          executionAvailable: false
        }
      };
    }
  };
}

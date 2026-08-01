import { randomBytes as nodeRandomBytes } from "node:crypto";
import { getAddress, recoverMessageAddress } from "viem";

import type { StudioAuthConfig } from "./studioAuthConfig.ts";
import {
  STUDIO_AUTH_CHAIN_ID,
  STUDIO_AUTH_CHALLENGE_TTL_MS,
  STUDIO_AUTH_SESSION_TTL_MS,
  STUDIO_AUTH_STATEMENT,
  formatStudioAuthMessage,
  hashStudioAuthSecret,
  normalizeStudioWallet,
  parseStudioAuthMessage,
  studioAuthHashEquals
} from "./studioAuthMessage.ts";
import type {
  StudioAuthRepository,
  StudioAuthSessionContext,
  StudioOrganizationRole
} from "./studioAuthRepository.ts";

const MAX_CHALLENGE_ATTEMPTS = 5;

export type StudioWalletAuthContext = {
  actorId: `0x${string}`;
  tenantId: string;
  memberId: string;
  mode: "wallet-session";
  organizationRole: "Owner" | "Editor" | "Viewer";
  sessionId: string;
};

export type StudioSessionProjection = {
  authenticated: true;
  organization: {
    id: string;
    displayName: string;
  };
  member: {
    walletAddress: `0x${string}`;
    role: StudioOrganizationRole;
  };
  chainId: typeof STUDIO_AUTH_CHAIN_ID;
  expiresAt: string;
};

export type StudioAuthVerificationResult =
  | {
      ok: true;
      rawToken: string;
      projection: StudioSessionProjection;
    }
  | {
      ok: false;
      code: "authentication_failed";
    };

export type StudioAuthenticatedSession = {
  context: StudioWalletAuthContext;
  projection: StudioSessionProjection;
};

type StudioAuthRandomBytes = {
  toString(encoding: "base64url"): string;
};

export type CreateStudioAuthServiceOptions = {
  repository: StudioAuthRepository;
  config: StudioAuthConfig;
  now?: () => Date;
  randomBytes?: (size: number) => StudioAuthRandomBytes;
};

function base64url(value: StudioAuthRandomBytes): string {
  return value.toString("base64url");
}

function authenticationFailed(): StudioAuthVerificationResult {
  return { ok: false, code: "authentication_failed" };
}

function projectionFrom(context: StudioAuthSessionContext): StudioSessionProjection {
  return {
    authenticated: true,
    organization: {
      id: context.organization.id,
      displayName: context.organization.displayName
    },
    member: {
      walletAddress: getAddress(context.member.walletAddress),
      role: context.member.role
    },
    chainId: STUDIO_AUTH_CHAIN_ID,
    expiresAt: context.session.expiresAt
  };
}

export function createStudioAuthService(options: CreateStudioAuthServiceOptions) {
  const now = options.now ?? (() => new Date());
  const randomBytes = options.randomBytes ?? nodeRandomBytes;
  const domain = new URL(options.config.origin).host;

  return {
    createChallenge(walletAddress: string) {
      const issuedAt = now();
      const expiresAt = new Date(issuedAt.getTime() + STUDIO_AUTH_CHALLENGE_TTL_MS);
      const expectedWallet = normalizeStudioWallet(walletAddress);
      const nonce = base64url(randomBytes(24));
      const challengeId = `challenge_${base64url(randomBytes(18))}`;
      const message = formatStudioAuthMessage({
        walletAddress: expectedWallet,
        statement: STUDIO_AUTH_STATEMENT,
        uri: options.config.studioUri,
        domain,
        chainId: STUDIO_AUTH_CHAIN_ID,
        nonce,
        issuedAt: issuedAt.toISOString(),
        expirationTime: expiresAt.toISOString()
      });

      options.repository.createChallenge({
        challengeId,
        expectedWallet,
        nonceHash: hashStudioAuthSecret(nonce),
        origin: options.config.origin,
        uri: options.config.studioUri,
        chainId: STUDIO_AUTH_CHAIN_ID,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        usedAt: null,
        attemptCount: 0,
        createdAt: issuedAt.toISOString()
      });

      return { challengeId, message, expiresAt: expiresAt.toISOString() };
    },

    async verifyChallenge(input: {
      challengeId: string;
      message: string;
      signature: string;
    }): Promise<StudioAuthVerificationResult> {
      const challenge = options.repository.getChallenge(input.challengeId);
      const verifiedAt = now();
      const verifiedAtIso = verifiedAt.toISOString();
      if (
        challenge === null ||
        challenge.usedAt !== null ||
        challenge.expiresAt <= verifiedAtIso ||
        challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS
      ) return authenticationFailed();

      options.repository.incrementChallengeAttempt(input.challengeId);

      const parsed = parseStudioAuthMessage(input.message);
      if (
        parsed === null ||
        parsed.walletAddress !== challenge.expectedWallet ||
        !studioAuthHashEquals(hashStudioAuthSecret(parsed.nonce), challenge.nonceHash) ||
        parsed.domain !== domain ||
        parsed.uri !== options.config.studioUri ||
        parsed.chainId !== STUDIO_AUTH_CHAIN_ID ||
        parsed.issuedAt !== challenge.issuedAt ||
        parsed.expirationTime !== challenge.expiresAt ||
        challenge.origin !== options.config.origin ||
        challenge.uri !== options.config.studioUri ||
        challenge.chainId !== STUDIO_AUTH_CHAIN_ID
      ) return authenticationFailed();

      let signer: `0x${string}`;
      try {
        signer = normalizeStudioWallet(await recoverMessageAddress({
          message: input.message,
          signature: input.signature as `0x${string}`
        }));
      } catch {
        return authenticationFailed();
      }
      if (signer !== challenge.expectedWallet) return authenticationFailed();

      const member = options.repository.getActiveMember(options.config.organizationId, signer);
      if (member === null || member.role !== "Owner") return authenticationFailed();

      const rawToken = base64url(randomBytes(32));
      const sessionId = `session_${base64url(randomBytes(18))}`;
      const expiresAt = new Date(verifiedAt.getTime() + STUDIO_AUTH_SESSION_TTL_MS).toISOString();
      const tokenHash = hashStudioAuthSecret(rawToken);
      const consumed = options.repository.consumeChallengeAndCreateSession({
        challengeId: input.challengeId,
        nowIso: verifiedAtIso,
        session: {
          sessionId,
          tokenHash,
          memberId: member.memberId,
          createdAt: verifiedAtIso,
          expiresAt,
          revokedAt: null
        }
      });
      if (!consumed) return authenticationFailed();

      return {
        ok: true,
        rawToken,
        projection: {
          authenticated: true,
          organization: {
            id: options.config.organizationId,
            displayName: options.config.organizationName
          },
          member: {
            walletAddress: getAddress(member.walletAddress),
            role: "Owner"
          },
          chainId: STUDIO_AUTH_CHAIN_ID,
          expiresAt
        }
      };
    },

    authenticateSession(rawToken: string): StudioAuthenticatedSession | null {
      const tokenHash = hashStudioAuthSecret(rawToken);
      const stored = options.repository.getSessionContextByTokenHash(tokenHash, now().toISOString());
      if (
        stored === null ||
        !studioAuthHashEquals(tokenHash, stored.session.tokenHash) ||
        stored.member.status !== "active" ||
        stored.member.role !== "Owner" ||
        stored.member.organizationId !== options.config.organizationId ||
        stored.organization.id !== options.config.organizationId
      ) return null;

      return {
        context: {
          actorId: normalizeStudioWallet(stored.member.walletAddress),
          tenantId: stored.organization.id,
          memberId: stored.member.memberId,
          mode: "wallet-session",
          organizationRole: stored.member.role,
          sessionId: stored.session.sessionId
        },
        projection: projectionFrom(stored)
      };
    },

    logout(rawToken: string): void {
      options.repository.revokeSessionByTokenHash(hashStudioAuthSecret(rawToken), now().toISOString());
    }
  };
}

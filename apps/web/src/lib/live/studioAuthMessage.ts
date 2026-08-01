import { createHash, timingSafeEqual } from "node:crypto";
import { getAddress, isAddress } from "viem";

export const STUDIO_AUTH_CHAIN_ID = 91_342;
export const STUDIO_AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1_000;
export const STUDIO_AUTH_SESSION_TTL_MS = 8 * 60 * 60 * 1_000;
export const STUDIO_AUTH_STATEMENT =
  "Sign in to the Loop organization Studio. This does not submit a transaction or spend funds.";

export type StudioAuthMessageFields = {
  walletAddress: `0x${string}`;
  statement: typeof STUDIO_AUTH_STATEMENT;
  uri: string;
  domain: string;
  chainId: typeof STUDIO_AUTH_CHAIN_ID;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
};

export function normalizeStudioWallet(value: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) throw new Error("invalid_studio_wallet");
  return getAddress(value).toLowerCase() as `0x${string}`;
}

function canonicalIso(value: string): boolean {
  const time = new Date(value);
  return !Number.isNaN(time.getTime()) && time.toISOString() === value;
}

export function formatStudioAuthMessage(fields: StudioAuthMessageFields): string {
  return [
    "GIWA Verified Intent Rail authentication request",
    "",
    `Wallet: ${getAddress(fields.walletAddress)}`,
    `Statement: ${fields.statement}`,
    `URI: ${fields.uri}`,
    `Domain: ${fields.domain}`,
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    `Expiration Time: ${fields.expirationTime}`
  ].join("\n");
}

export function parseStudioAuthMessage(message: string): StudioAuthMessageFields | null {
  const lines = message.split("\n");
  if (lines.length !== 10 || lines[0] !== "GIWA Verified Intent Rail authentication request" || lines[1] !== "") {
    return null;
  }
  const value = (index: number, prefix: string): string | null =>
    lines[index]?.startsWith(prefix) === true ? lines[index]!.slice(prefix.length) : null;
  const wallet = value(2, "Wallet: ");
  const statement = value(3, "Statement: ");
  const uri = value(4, "URI: ");
  const domain = value(5, "Domain: ");
  const chainId = value(6, "Chain ID: ");
  const nonce = value(7, "Nonce: ");
  const issuedAt = value(8, "Issued At: ");
  const expirationTime = value(9, "Expiration Time: ");
  if (
    wallet === null || statement !== STUDIO_AUTH_STATEMENT || uri === null || domain === null ||
    chainId !== String(STUDIO_AUTH_CHAIN_ID) || nonce === null || issuedAt === null || expirationTime === null ||
    !/^[A-Za-z0-9_-]{32}$/u.test(nonce) || !canonicalIso(issuedAt) || !canonicalIso(expirationTime)
  ) return null;
  try {
    const normalized = normalizeStudioWallet(wallet);
    const parsedUri = new URL(uri);
    if (parsedUri.host !== domain) return null;
    const fields: StudioAuthMessageFields = {
      walletAddress: normalized,
      statement: STUDIO_AUTH_STATEMENT,
      uri,
      domain,
      chainId: STUDIO_AUTH_CHAIN_ID,
      nonce,
      issuedAt,
      expirationTime
    };
    return formatStudioAuthMessage(fields) === message ? fields : null;
  } catch {
    return null;
  }
}

export function hashStudioAuthSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function studioAuthHashEquals(leftHex: string, rightHex: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(leftHex) || !/^[a-f0-9]{64}$/u.test(rightHex)) return false;
  const encoder = new TextEncoder();
  return timingSafeEqual(encoder.encode(leftHex), encoder.encode(rightHex));
}

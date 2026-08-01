import { describe, expect, it } from "vitest";

import {
  STUDIO_AUTH_CHAIN_ID,
  formatStudioAuthMessage,
  hashStudioAuthSecret,
  normalizeStudioWallet,
  parseStudioAuthMessage,
  studioAuthHashEquals
} from "./studioAuthMessage.ts";

const fields = {
  walletAddress: "0x1111111111111111111111111111111111111111" as const,
  statement: "Sign in to the Loop organization Studio. This does not submit a transaction or spend funds.",
  uri: "https://app.example/studio",
  domain: "app.example",
  chainId: STUDIO_AUTH_CHAIN_ID,
  nonce: "abcdefghijklmnopqrstuvwxyzABCDEF",
  issuedAt: "2026-08-01T00:00:00.000Z",
  expirationTime: "2026-08-01T00:05:00.000Z"
} as const;

describe("Studio auth message", () => {
  it("formats and parses one canonical byte sequence", () => {
    const message = formatStudioAuthMessage(fields);
    expect(message).toBe(
      [
        "GIWA Verified Intent Rail authentication request",
        "",
        `Wallet: ${fields.walletAddress}`,
        `Statement: ${fields.statement}`,
        `URI: ${fields.uri}`,
        `Domain: ${fields.domain}`,
        "Chain ID: 91342",
        `Nonce: ${fields.nonce}`,
        `Issued At: ${fields.issuedAt}`,
        `Expiration Time: ${fields.expirationTime}`
      ].join("\n")
    );
    expect(parseStudioAuthMessage(message)).toEqual(fields);
  });

  it.each([
    ["changed title", (message: string) => message.replace("authentication request", "login")],
    ["reordered fields", (message: string) => message.replace("URI:", "Domain2:")],
    ["wrong chain", (message: string) => message.replace("91342", "1")],
    ["duplicate field", (message: string) => `${message}\nNonce: ${fields.nonce}`],
    ["non-canonical time", (message: string) => message.replace(".000Z", "Z")],
    ["unknown field", (message: string) => `${message}\nRequest ID: one`]
  ])("rejects %s", (_label, mutate) => {
    expect(parseStudioAuthMessage(mutate(formatStudioAuthMessage(fields)))).toBeNull();
  });

  it("normalizes valid EVM addresses and rejects malformed values", () => {
    expect(normalizeStudioWallet("0x1111111111111111111111111111111111111111")).toBe(
      "0x1111111111111111111111111111111111111111"
    );
    expect(() => normalizeStudioWallet("0x1234")).toThrow("invalid_studio_wallet");
  });

  it("hashes without returning the source value", () => {
    const hash = hashStudioAuthSecret("one-time-value");
    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(hash).not.toContain("one-time-value");
    expect(studioAuthHashEquals(hash, hash)).toBe(true);
    expect(studioAuthHashEquals(hash, "b".repeat(64))).toBe(false);
    expect(studioAuthHashEquals(hash, "short")).toBe(false);
  });
});

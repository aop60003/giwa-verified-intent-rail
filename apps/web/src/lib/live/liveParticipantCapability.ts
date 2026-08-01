import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

type LiveRunCapabilityBytes = {
  toString(encoding: "base64url"): string;
};

declare module "node:crypto" {
  export function randomBytes(size: number): LiveRunCapabilityBytes;
  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}

declare const Buffer: {
  from(value: string, encoding: "hex"): Uint8Array;
};

export type IssuedLiveRunCapability = { value: string; hash: string };

export function hashLiveRunCapability(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function issueLiveRunCapability(
  bytes: (size: number) => LiveRunCapabilityBytes = randomBytes
): IssuedLiveRunCapability {
  const value = bytes(32).toString("base64url");
  return { value, hash: hashLiveRunCapability(value) };
}

export function verifyLiveRunCapability(value: string, expectedHash: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value) || !/^[a-f0-9]{64}$/u.test(expectedHash)) return false;
  const observed = Buffer.from(hashLiveRunCapability(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return observed.length === expected.length && timingSafeEqual(observed, expected);
}

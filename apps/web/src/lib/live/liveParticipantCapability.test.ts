import { describe, expect, it } from "vitest";
import {
  hashLiveRunCapability,
  issueLiveRunCapability,
  verifyLiveRunCapability
} from "./liveParticipantCapability.ts";

declare const Buffer: {
  alloc(size: number, fill: number): { toString(encoding: "base64url"): string };
};

describe("live participant run capability", () => {
  it("issues a 32-byte random browser value and stores only its sha256 hash", () => {
    let requestedSize: number | undefined;
    const issued = issueLiveRunCapability((size) => {
      requestedSize = size;
      return Buffer.alloc(size, 7);
    });

    expect(requestedSize).toBe(32);
    expect(issued.value).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(issued.hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(issued.hash).toBe(hashLiveRunCapability(issued.value));
    expect(issued.hash).not.toContain(issued.value);
  });

  it("accepts only the matching bounded capability value", () => {
    const issued = issueLiveRunCapability((size) => Buffer.alloc(size, 9));
    const different = issueLiveRunCapability((size) => Buffer.alloc(size, 10));

    expect(verifyLiveRunCapability(issued.value, issued.hash)).toBe(true);
    expect(verifyLiveRunCapability(different.value, issued.hash)).toBe(false);
    expect(verifyLiveRunCapability(issued.value, different.hash)).toBe(false);
    expect(verifyLiveRunCapability("bad", issued.hash)).toBe(false);
    expect(verifyLiveRunCapability(issued.value, "bad")).toBe(false);
  });
});

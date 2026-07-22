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
  it("issues a random browser value and stores only its sha256 hash", () => {
    const issued = issueLiveRunCapability(() => Buffer.alloc(32, 7));

    expect(issued.value).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(issued.hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(issued.hash).toBe(hashLiveRunCapability(issued.value));
    expect(issued.hash).not.toContain(issued.value);
  });

  it("accepts only the matching bounded capability value", () => {
    const issued = issueLiveRunCapability(() => Buffer.alloc(32, 9));

    expect(verifyLiveRunCapability(issued.value, issued.hash)).toBe(true);
    expect(verifyLiveRunCapability("bad", issued.hash)).toBe(false);
    expect(verifyLiveRunCapability(issued.value, "bad")).toBe(false);
  });
});

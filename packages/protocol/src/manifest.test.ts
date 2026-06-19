import { describe, expect, it } from "vitest";
import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  computeIntentHash,
  normalizeManifest
} from "./manifest";
import { manifestFixture } from "./fixtures";
import type { ActionManifest } from "./types";

const { referralCode: _referralCode, ...manifestWithoutReferral } = manifestFixture;

describe("manifest canonical payload", () => {
  it("keeps the exact Sprint 1 field order", () => {
    expect(canonicalManifestPayload(manifestFixture)).toBe(
      '{"manifestVersion":"1","chainId":91342,"nonce":"wallet-1-campaign-1-mission-1","expiryUnix":1790000000,"campaignId":"gasok-demo","missionId":"first-mock-vault-deposit","wallet":"0x0000000000000000000000000000000000000001","actionType":"mockVaultDeposit","target":"0x0000000000000000000000000000000000000002","selector":"0xb6b55f25","asset":"0x0000000000000000000000000000000000000003","amountBaseUnits":"1000000000000000000","spender":"0x0000000000000000000000000000000000000002","maxAllowanceBaseUnits":"1000000000000000000","referralCode":"qr-judge-demo"}'
    );
  });

  it("omits absent optional referral code", () => {
    const payload = canonicalManifestPayload(manifestWithoutReferral);
    expect(payload).not.toContain("referralCode");
  });

  it("normalizes addresses and bytes to lowercase strings", () => {
    const normalized = normalizeManifest({
      ...manifestFixture,
      wallet: "0x00000000000000000000000000000000000000A1",
      target: "0x00000000000000000000000000000000000000B2",
      selector: "0xB6B55F25"
    });

    expect(normalized.wallet).toBe("0x00000000000000000000000000000000000000a1");
    expect(normalized.target).toBe("0x00000000000000000000000000000000000000b2");
    expect(normalized.selector).toBe("0xb6b55f25");
  });

  it("keeps base-unit amounts as decimal strings and exposes UTF-8 bytes", () => {
    const parsed = JSON.parse(canonicalManifestPayload(manifestFixture)) as Record<string, unknown>;

    expect(parsed.amountBaseUnits).toBe("1000000000000000000");
    expect(parsed.maxAllowanceBaseUnits).toBe("1000000000000000000");
    expect(canonicalManifestPayloadBytesHex(manifestFixture)).toMatch(/^0x[0-9a-f]+$/);
  });

  it("computes a stable intent hash", () => {
    expect(computeIntentHash(manifestFixture)).toMatch(/^0x[a-f0-9]{64}$/);
    expect(computeIntentHash(manifestFixture)).toBe(computeIntentHash({ ...manifestFixture }));
  });
});

describe("manifest validation", () => {
  it.each([
    ["wrong chain id", { chainId: 1 }, "chainId must be 91342"],
    ["empty nonce", { nonce: "  " }, "nonce must be a non-empty trimmed string"],
    ["empty campaign id", { campaignId: "" }, "campaignId must be a non-empty trimmed string"],
    ["empty mission id", { missionId: "  " }, "missionId must be a non-empty trimmed string"],
    ["unsupported action type", { actionType: "stake" }, "actionType must be mockVaultDeposit"],
    ["invalid address", { wallet: "0xabc" }, "wallet must be a valid address"],
    ["invalid selector", { selector: "0x1234" }, "selector must be bytes4"],
    ["non-integer amount", { amountBaseUnits: "1.5" }, "amountBaseUnits must be a base-unit decimal string"],
    ["negative max allowance", { maxAllowanceBaseUnits: "-1" }, "maxAllowanceBaseUnits must be a base-unit decimal string"]
  ])("rejects %s", (_name, patch, message) => {
    expect(() => normalizeManifest({ ...manifestFixture, ...patch } as ActionManifest)).toThrow(message);
  });
});

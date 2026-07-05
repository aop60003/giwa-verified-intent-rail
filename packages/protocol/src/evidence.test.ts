import { describe, expect, it } from "vitest";
import {
  SPRINT1_GOLDEN_VECTORS,
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  computeVerifierInputHash
} from "./evidence";
import type { Hex, VerifierInputPayload } from "./types";

const fakeBytes32 = (char: string): Hex => `0x${char.repeat(64)}` as Hex;
const h1 = fakeBytes32("1");
const h2 = fakeBytes32("2");
const h3 = fakeBytes32("3");
const h4 = fakeBytes32("4");
const h5 = fakeBytes32("5");

const verifierInputFixture: VerifierInputPayload = {
  schemaVersion: "1",
  chainId: 91342,
  intentHash: h1,
  depositTxHash: h2,
  depositTransactionSnapshotHash: h3,
  depositReceiptSnapshotHash: h4,
  decodedLogSnapshotHash: h5,
  confirmationDepth: 3,
  headBlockNumberAtVerification: 12348,
  verifierVersion: "1"
};

describe("verifier input evidence", () => {
  it("uses the exact verifier input field order", () => {
    expect(canonicalVerifierInputPayload(verifierInputFixture)).toBe(
      `{"schemaVersion":"1","chainId":91342,"intentHash":"${h1}","depositTxHash":"${h2}","depositTransactionSnapshotHash":"${h3}","depositReceiptSnapshotHash":"${h4}","decodedLogSnapshotHash":"${h5}","confirmationDepth":3,"headBlockNumberAtVerification":12348,"verifierVersion":"1"}`
    );
  });

  it("computes verifierInputHash from canonicalVerifierInputPayload", () => {
    expect(canonicalVerifierInputPayloadBytesHex(verifierInputFixture)).toMatch(/^0x[0-9a-f]+$/);
    expect(computeVerifierInputHash(verifierInputFixture)).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("requires a non-empty verifier version", () => {
    expect(() => canonicalVerifierInputPayload({ ...verifierInputFixture, verifierVersion: "  " })).toThrow(
      "verifierVersion must be a non-empty trimmed string"
    );
  });

  it("exports Sprint 1 golden vectors for downstream sprints", () => {
    expect(SPRINT1_GOLDEN_VECTORS.campaignIdBytes32.hash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(SPRINT1_GOLDEN_VECTORS.missionIdBytes32.hash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(SPRINT1_GOLDEN_VECTORS.canonicalManifestPayload.payloadJson).toContain('"campaignId":"gasok-demo"');
    expect(SPRINT1_GOLDEN_VECTORS.canonicalReceiptPayload.payloadJson).toContain('"status":"matched"');
    expect(SPRINT1_GOLDEN_VECTORS.canonicalVerifierInputPayload.hash).toBe(
      computeVerifierInputHash(verifierInputFixture)
    );
  });
});

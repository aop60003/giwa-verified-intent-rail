import { describe, expect, it } from "vitest";
import {
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  computeReceiptHash,
  createReceiptEnvelope,
  normalizeReceiptPayload,
  receiptIdempotencyKey
} from "./receipt";
import type { Hex } from "./types";
import type { ReceiptPayload } from "./types";

const fakeBytes32 = (char: string): Hex => `0x${char.repeat(64)}` as Hex;
const h1 = fakeBytes32("1");
const h2 = fakeBytes32("2");
const h3 = fakeBytes32("3");
const h4 = fakeBytes32("4");
const h5 = fakeBytes32("5");

const receiptFixture: ReceiptPayload = {
  schemaVersion: "1",
  verifierVersion: "1",
  intentHash: h1,
  chainId: 91342,
  networkName: "GIWA Sepolia",
  status: "matched",
  actionType: "mockVaultDeposit",
  asset: "0x0000000000000000000000000000000000000003",
  amountBaseUnits: "1000000000000000000",
  target: "0x0000000000000000000000000000000000000002",
  spender: "0x0000000000000000000000000000000000000002",
  maxAllowanceBaseUnits: "1000000000000000000",
  allowanceUsedBaseUnits: "1000000000000000000",
  approvalRequired: false,
  approveTxHash: null,
  depositTxHash: h2,
  depositBlockNumber: 12345,
  depositBlockHash: h3,
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  wallet: "0x0000000000000000000000000000000000000001",
  verifiedState: "guest",
  testnetDepositAmountDelta: "1000000000000000000",
  issuedAt: 1790000010,
  issuer: "GIWA Verified Intent Rail MVP",
  safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
};

describe("receipt canonical identity", () => {
  it("keeps the exact receipt field order and excludes envelope fields", () => {
    const payload = canonicalReceiptPayload(receiptFixture);

    expect(payload).toBe(
      `{"schemaVersion":"1","verifierVersion":"1","intentHash":"${h1}","chainId":91342,"networkName":"GIWA Sepolia","status":"matched","actionType":"mockVaultDeposit","asset":"0x0000000000000000000000000000000000000003","amountBaseUnits":"1000000000000000000","target":"0x0000000000000000000000000000000000000002","spender":"0x0000000000000000000000000000000000000002","maxAllowanceBaseUnits":"1000000000000000000","allowanceUsedBaseUnits":"1000000000000000000","approvalRequired":false,"approveTxHash":null,"depositTxHash":"${h2}","depositBlockNumber":12345,"depositBlockHash":"${h3}","campaignId":"gasok-demo","missionId":"first-mock-vault-deposit","wallet":"0x0000000000000000000000000000000000000001","verifiedState":"guest","testnetDepositAmountDelta":"1000000000000000000","issuedAt":1790000010,"issuer":"GIWA Verified Intent Rail MVP","safetyNotice":"Testnet-only. No real asset, no yield, no RWA claim."}`
    );
    expect(payload).not.toContain("receiptHash");
    expect(payload).not.toContain("decisionTxHash");
    expect(canonicalReceiptPayloadBytesHex(receiptFixture)).toMatch(/^0x[0-9a-f]+$/);
  });

  it("keeps base-unit amounts as strings and creates a stable receipt hash", () => {
    const parsed = JSON.parse(canonicalReceiptPayload(receiptFixture)) as Record<string, unknown>;

    expect(parsed.amountBaseUnits).toBe("1000000000000000000");
    expect(parsed.allowanceUsedBaseUnits).toBe("1000000000000000000");
    expect(computeReceiptHash(receiptFixture)).toBe(computeReceiptHash({ ...receiptFixture }));
  });

  it("requires issuedAt to be supplied by first issuance and keeps duplicate idempotency stable", () => {
    expect(() => normalizeReceiptPayload({ ...receiptFixture, issuedAt: undefined } as unknown as ReceiptPayload)).toThrow(
      "issuedAt must be a positive integer"
    );
    expect(receiptIdempotencyKey(receiptFixture.intentHash)).toBe(`proofkpi-receipt:${h1}`);
  });

  it("creates an envelope without changing the canonical receipt hash", () => {
    const envelope = createReceiptEnvelope(receiptFixture, {
      decisionTxHash: h4,
      decisionBlockNumber: 12346,
      decisionBlockHash: h5,
      explorerUrl: "https://sepolia-explorer.giwa.io/tx/0x2222",
      displayStatus: "Receipt ready",
      displayCopy: "Block-confirmed mock vault action matched the signed manifest."
    });

    expect(envelope.receiptHash).toBe(computeReceiptHash(receiptFixture));
    expect(canonicalReceiptPayload(envelope.payload)).toBe(canonicalReceiptPayload(receiptFixture));
  });
});

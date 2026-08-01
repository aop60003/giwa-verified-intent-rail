import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildUserReceiptView } from "./userReceiptView";

const receiptInput = {
  status: "matched" as const,
  receiptHash: `0x${"0".repeat(64)}`,
  depositTxHash: `0x${"6".repeat(64)}`,
  blockNumber: 28_483_877,
  blockHash: `0x${"c".repeat(64)}`,
  confirmationDepth: 3,
  verifierInputHash: `0x${"b".repeat(64)}`,
  wallet: "0xf3a729973559082260e742ebedf705271ad29476",
  target: "0x1111111111111111111111111111111111111111",
  asset: "0x2222222222222222222222222222222222222222",
  amountBaseUnits: "1000000000000000000",
  issuedAt: 1_800_000_000,
  safetyNotice: "Testnet-only mock action evidence.",
  actionName: "First mock vault action",
  networkName: "GIWA Sepolia"
};

describe("buildUserReceiptView", () => {
  it("projects every matched public Receipt field without truncating evidence", () => {
    const receipt = buildUserReceiptView(receiptInput);

    expect(receipt.state).toBe("verified");
    expect(receipt.summary).toMatchObject({
      title: "약속한 조건대로 실행됐습니다.",
      receiptHash: receiptInput.receiptHash,
      depositTxHash: receiptInput.depositTxHash,
      wallet: receiptInput.wallet,
      target: receiptInput.target,
      asset: receiptInput.asset,
      amountBaseUnits: receiptInput.amountBaseUnits,
      blockNumber: "28483877",
      blockHash: receiptInput.blockHash,
      confirmationDepth: "3",
      verifierInputHash: receiptInput.verifierInputHash,
      issuedAt: "2027-01-15T08:00:00.000Z",
      safetyNotice: receiptInput.safetyNotice
    });
    expect(receipt.share.path).toBe(`/user/receipt/${receiptInput.receiptHash}`);
    expect(receipt.partner.path).toBe(
      `/partner?receipt=${receiptInput.receiptHash}`
    );
    expect(receipt.publicProof.path).toBe(
      `/evidence?proof=${receiptInput.receiptHash}`
    );
    expect(receipt.partner.label).toBe("Campaign Studio에서 반영 확인");
    expect(receipt.publicProof.label).toBe("Proof Ledger에서 공개 검증");
  });

  it("does not project internal, operator, or capability fields", () => {
    const receipt = buildUserReceiptView({
      ...receiptInput,
      status: "pending",
      receiptHash: null,
      depositTxHash: null,
      blockNumber: null,
      blockHash: null,
      confirmationDepth: null,
      verifierInputHash: null,
      issuedAt: null,
      safetyNotice: null
    });

    const json = JSON.stringify(receipt);
    expect(json).not.toMatch(/gateReason|localDb|blocker|protectedCI|signer|capability/iu);
    expect(receipt.state).toBe("pending");
    expect(receipt.partner.path).toBeNull();
    expect(receipt.publicProof.path).toBeNull();
  });

  it("maps failed verification to not matched", () => {
    expect(buildUserReceiptView({ ...receiptInput, status: "failed", receiptHash: null }).state).toBe("notMatched");
  });

  it("adds a bounded verification bundle action to the public participant Receipt", () => {
    const direct = join(process.cwd(), "public/user-flow.js");
    const workspace = join(process.cwd(), "apps/web/public/user-flow.js");
    const source = readFileSync(existsSync(direct) ? direct : workspace, "utf8");

    expect(source).toContain("검증 번들 JSON 받기");
    expect(source).toContain(
      "pnpm --filter @giwa/web evidence:replay -- <bundle.json>"
    );
    expect(source).toContain("6개 무결성 검사를 직접 재계산할 수 있습니다");
    expect(source).toContain('download: "giwa-verification-bundle.json"');
    expect(source).toContain("?download=1");
    expect(source).toContain("검증 번들을 사용할 수 없습니다");
    expect(source).toContain("Manifest 및 서명");
    expect(source).toContain("Receipt canonical payload");
  });
});

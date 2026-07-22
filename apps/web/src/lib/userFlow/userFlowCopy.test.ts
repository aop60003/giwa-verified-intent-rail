import { describe, expect, it } from "vitest";
import { userBlockCopy, userCtaCopy, userProgressCopy, userReceiptStateCopy } from "./userFlowCopy";

const allCopy = [
  ...Object.values(userCtaCopy),
  ...Object.values(userBlockCopy),
  ...Object.values(userReceiptStateCopy),
  ...Object.values(userProgressCopy).flatMap((step) => [step.label, step.detail])
].join("\n");

describe("userFlowCopy", () => {
  it("uses the exact Korean-first primary CTA sequence", () => {
    expect([
      userCtaCopy.connect_wallet,
      userCtaCopy.switch_network,
      userCtaCopy.get_test_eth,
      userCtaCopy.prepare_mock_token,
      userCtaCopy.review_action,
      userCtaCopy.approve_exact_amount,
      userCtaCopy.deposit_to_vault,
      userCtaCopy.verifying,
      userCtaCopy.view_receipt
    ]).toEqual([
      "지갑 연결",
      "GIWA Sepolia로 전환",
      "테스트 ETH 받기",
      "Mock Token 준비",
      "액션 검토",
      "정확한 수량 승인",
      "Vault에 예치",
      "검증 중",
      "영수증 보기"
    ]);
  });

  it("keeps implementation and operator wording out of user copy", () => {
    expect(allCopy).not.toMatch(/gateReason|blocker register|protected CI|signer role|stack trace|exception/iu);
    expect(allCopy).not.toMatch(/server-only|internal gate|production asset|production yield|identity service|safety guarantee/iu);
  });

  it("labels final verification source without claiming fast feedback finality", () => {
    expect(userProgressCopy.standard_rpc_receipt_found.detail).toContain("Standard RPC");
    expect(allCopy).not.toMatch(/preconfirmed success|final in|즉시 확정/iu);
  });
});

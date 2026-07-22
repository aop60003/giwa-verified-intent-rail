import type { UserBlockReason, UserCta, UserProgressStep } from "./userFlowState";

export const userCtaCopy: Record<UserCta, string> = {
  connect_wallet: "지갑 연결",
  switch_network: "GIWA Sepolia로 전환",
  get_test_eth: "테스트 ETH 받기",
  prepare_mock_token: "Mock Token 준비",
  review_action: "액션 검토",
  approve_exact_amount: "정확한 수량 승인",
  deposit_to_vault: "Vault에 예치",
  verifying: "검증 중",
  view_receipt: "영수증 보기"
};

export const userBlockCopy: Record<UserBlockReason, string> = {
  wallet_disconnected: "계속하려면 브라우저 지갑을 연결해 주세요.",
  wrong_network: "계속하려면 GIWA Sepolia로 전환해 주세요.",
  gas_required: "테스트 트랜잭션을 위해 GIWA Sepolia 테스트 ETH가 필요합니다.",
  token_required: "고정된 데모 수량의 Mock Token을 준비해 주세요.",
  manifest_missing: "계속하기 전에 액션을 검토해 주세요.",
  manifest_expired: "Manifest가 만료되었습니다. 새 액션을 검토해 주세요.",
  manifest_invalidated: "지갑 정보가 변경되었습니다. 새 Manifest를 발급해 주세요.",
  wallet_action_submitted: "지갑 액션이 이미 제출되었습니다.",
  receipt_locked: "Standard RPC 검증이 완료될 때까지 Receipt가 잠겨 있습니다."
};

export const userReceiptStateCopy = {
  verified: "Manifest matched. Receipt가 준비되었습니다.",
  pending: "Standard RPC 검증을 기다리고 있습니다.",
  notMatched: "트랜잭션이 검토한 Manifest와 일치하지 않았습니다."
} as const;

export const userProgressCopy: Record<UserProgressStep["id"], { label: string; detail: string }> = {
  wallet_connected: {
    label: "지갑 연결",
    detail: "지갑이 GIWA Sepolia에 연결되었습니다."
  },
  intent_issued: {
    label: "Manifest 발급",
    detail: "검토한 액션이 현재 지갑에 연결되었습니다."
  },
  approval_submitted: {
    label: "정확한 수량 승인",
    detail: "필요한 경우 고정 데모 수량만 승인합니다."
  },
  deposit_submitted: {
    label: "Vault 예치",
    detail: "지갑이 예치 트랜잭션 해시를 반환했습니다."
  },
  standard_rpc_receipt_found: {
    label: "블록 증거 확인",
    detail: "검증기가 Standard RPC 블록 증거를 찾았습니다."
  },
  verification_matched: {
    label: "Manifest matched",
    detail: "확인된 트랜잭션이 검토한 액션과 일치합니다."
  },
  receipt_ready: {
    label: "Receipt 준비",
    detail: "Receipt를 열고 공개 증거를 확인할 수 있습니다."
  }
};

export type UserReceiptState = "verified" | "pending" | "notMatched";

export type UserReceiptViewInput = {
  status: "matched" | "pending" | "failed" | "mismatched" | "notMatched" | "timeout" | string;
  receiptHash: string | null;
  depositTxHash: string | null;
  blockNumber: number | string | null;
  blockHash: string | null;
  confirmationDepth: number | null;
  verifierInputHash: string | null;
  wallet: string;
  target: string;
  asset: string;
  amountBaseUnits: string;
  issuedAt: number | null;
  safetyNotice: string | null;
  actionName: string;
  networkName: string;
};

export type UserReceiptView = {
  state: UserReceiptState;
  summary: {
    title: string;
    receiptHash: string;
    actionName: string;
    networkName: string;
    wallet: string;
    target: string;
    asset: string;
    amountBaseUnits: string;
    depositTxHash: string;
    blockNumber: string;
    blockHash: string;
    confirmationDepth: string;
    verifierInputHash: string;
    issuedAt: string;
    safetyNotice: string;
  };
  share: {
    copyLabel: string;
    path: string | null;
  };
  partner: {
    label: string;
    path: string | null;
  };
  publicProof: {
    label: string;
    path: string | null;
  };
};

function display(value: string | number | null): string {
  return value === null ? "pending" : String(value);
}

function stateFor(input: UserReceiptViewInput): UserReceiptState {
  if (input.status === "matched" && input.receiptHash !== null) return "verified";
  if (input.status === "failed" || input.status === "mismatched" || input.status === "notMatched") return "notMatched";
  return "pending";
}

export function buildUserReceiptView(input: UserReceiptViewInput): UserReceiptView {
  const state = stateFor(input);
  const receiptPath =
    input.receiptHash === null ? null : `/user/receipt/${input.receiptHash}`;
  const partnerPath =
    input.receiptHash === null
      ? null
      : `/partner?receipt=${input.receiptHash}`;
  const publicProofPath =
    input.receiptHash === null
      ? null
      : `/evidence?proof=${input.receiptHash}`;

  return {
    state,
    summary: {
      title:
        state === "verified"
          ? "약속한 조건대로 실행됐습니다."
          : state === "notMatched"
            ? "Manifest 불일치"
            : "Receipt 검증 중",
      receiptHash: display(input.receiptHash),
      actionName: input.actionName,
      networkName: input.networkName,
      wallet: input.wallet,
      target: input.target,
      asset: input.asset,
      amountBaseUnits: input.amountBaseUnits,
      depositTxHash: display(input.depositTxHash),
      blockNumber: display(input.blockNumber),
      blockHash: display(input.blockHash),
      confirmationDepth: display(input.confirmationDepth),
      verifierInputHash: display(input.verifierInputHash),
      issuedAt: input.issuedAt === null ? "pending" : new Date(input.issuedAt * 1000).toISOString(),
      safetyNotice: input.safetyNotice ?? "Testnet-only."
    },
    share: {
      copyLabel: "Receipt 링크 복사",
      path: receiptPath
    },
    partner: {
      label: "Campaign Studio에서 반영 확인",
      path: partnerPath
    },
    publicProof: {
      label: "Proof Ledger에서 공개 검증",
      path: publicProofPath
    }
  };
}

export type UserReceiptState = "verified" | "pending" | "notMatched";

export type UserReceiptViewInput = {
  status: "matched" | "pending" | "failed" | "mismatched" | "notMatched" | "timeout" | string;
  receiptHash: string | null;
  depositTxHash: string | null;
  blockNumber: number | string | null;
  wallet: string;
  actionName: string;
  networkName: string;
  technical: Record<string, string | number | null | undefined>;
};

export type UserReceiptView = {
  state: UserReceiptState;
  summary: {
    title: string;
    receiptId: string;
    actionName: string;
    networkName: string;
    wallet: string;
    depositTxHash: string;
    blockNumber: string;
  };
  share: {
    copyLabel: string;
    path: string | null;
  };
  technicalAccordion: Array<{ label: string; value: string }>;
};

function shortHash(value: string | null | undefined): string {
  if (typeof value !== "string" || value.length <= 18) return String(value ?? "pending");
  return `${value.slice(0, 10)}...${value.slice(-5)}`;
}

function stateFor(input: UserReceiptViewInput): UserReceiptState {
  if (input.status === "matched" && input.receiptHash !== null) return "verified";
  if (input.status === "failed" || input.status === "mismatched" || input.status === "notMatched") return "notMatched";
  return "pending";
}

export function buildUserReceiptView(input: UserReceiptViewInput): UserReceiptView {
  const state = stateFor(input);
  const receiptId = shortHash(input.receiptHash);
  const technicalAccordion = Object.entries(input.technical)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([label, value]) => ({ label, value: String(value) }));

  return {
    state,
    summary: {
      title:
        state === "verified"
          ? "Verified receipt"
          : state === "notMatched"
            ? "Receipt not matched"
            : "Receipt pending",
      receiptId,
      actionName: input.actionName,
      networkName: input.networkName,
      wallet: shortHash(input.wallet),
      depositTxHash: shortHash(input.depositTxHash),
      blockNumber: input.blockNumber === null ? "pending" : String(input.blockNumber)
    },
    share: {
      copyLabel: "Copy receipt link",
      path: input.receiptHash === null ? null : `/user/receipt/${input.receiptHash}`
    },
    technicalAccordion
  };
}

import { describe, expect, it } from "vitest";

import { buildApproveTransactionRequest, buildDepositTransactionRequest } from "./walletTransactionRequest.ts";

const preview = {
  target: "0x2222222222222222222222222222222222222222",
  selector: "0x47e7ef24",
  asset: "0x3333333333333333333333333333333333333333",
  amountBaseUnits: "1000000000000000000",
  spender: "0x2222222222222222222222222222222222222222",
  maxAllowanceBaseUnits: "1000000000000000000",
  expiryUnix: 1790003600,
  intentHash: `0x${"a".repeat(64)}`
};

describe("wallet transaction requests", () => {
  it("builds approve request to token contract from manifest preview", () => {
    const request = buildApproveTransactionRequest({
      from: "0x1111111111111111111111111111111111111111",
      preview
    });

    expect(request.from).toBe("0x1111111111111111111111111111111111111111");
    expect(request.to).toBe(preview.asset);
    expect(request.value).toBe("0x0");
    expect(request.data).toMatch(/^0x095ea7b3/u);
  });

  it("builds deposit request to mock vault from manifest preview", () => {
    const request = buildDepositTransactionRequest({
      from: "0x1111111111111111111111111111111111111111",
      preview
    });

    expect(request.from).toBe("0x1111111111111111111111111111111111111111");
    expect(request.to).toBe(preview.target);
    expect(request.value).toBe("0x0");
    expect(request.data).toMatch(/^0x47e7ef24/u);
  });
});

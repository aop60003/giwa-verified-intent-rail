import { describe, expect, it } from "vitest";

import { GIWA_SEPOLIA_CHAIN_HEX, GIWA_SEPOLIA_CHAIN_ID } from "./walletTypes.ts";
import { buildGiwaAddChainRequest, evaluateGiwaChainGate } from "./giwaChainGate.ts";

describe("GIWA Sepolia chain gate", () => {
  it("allows manifest issuance only on GIWA Sepolia", () => {
    expect(evaluateGiwaChainGate({ account: "0x0000000000000000000000000000000000000001", chainId: 91342 })).toEqual({
      status: "connected",
      account: "0x0000000000000000000000000000000000000001",
      chainId: GIWA_SEPOLIA_CHAIN_ID
    });
    expect(evaluateGiwaChainGate({ account: "0x0000000000000000000000000000000000000001", chainId: 1 })).toMatchObject({
      status: "wrongChain",
      chainId: 1
    });
  });

  it("builds the wallet add-chain payload without private RPC values", () => {
    expect(buildGiwaAddChainRequest()).toMatchObject({
      chainId: GIWA_SEPOLIA_CHAIN_HEX,
      chainName: "GIWA Sepolia",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://sepolia-rpc.giwa.io"],
      blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
    });
  });
});

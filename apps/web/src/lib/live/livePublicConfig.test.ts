import { describe, expect, it } from "vitest";

import {
  GASOK_CAMPAIGN_ID,
  GASOK_DEMO_AMOUNT_BASE_UNITS,
  GASOK_MISSION_ID,
  buildLivePublicConfig
} from "./livePublicConfig.ts";

const canonicalInput = {
  chainId: 91342,
  txExplorerTemplate: "https://sepolia-explorer.giwa.io/tx/{txHash}",
  faucetHelpUrl: "https://docs.giwa.io/introduction/try-giwa",
  minGasBalanceWei: "100000000000000",
  deployment: {
    mockTokenAddress: "0x06a26a1182bd40ec38b38ee987a0a16cf572222f",
    mockVaultAddress: "0x94c7a4deb22318ff798cbe8340d7cc3365c405f6",
    intentRailAddress: "0x5282325c5b82e9e3fb39050bdd8ec0f500185597"
  }
};

describe("live public configuration", () => {
  it("builds the exact GIWA Sepolia participant projection without server-only material", () => {
    const config = buildLivePublicConfig(canonicalInput);

    expect(config).toEqual({
      chainId: 91342,
      chainName: "GIWA Sepolia",
      explorerTxBaseUrl: "https://sepolia-explorer.giwa.io/tx/",
      faucetHelpUrl: "https://docs.giwa.io/introduction/try-giwa",
      minGasBalanceWei: "100000000000000",
      demoAmountBaseUnits: "1000000000000000000",
      contracts: {
        mockToken: "0x06a26a1182bd40ec38b38ee987a0a16cf572222f",
        mockVault: "0x94c7a4deb22318ff798cbe8340d7cc3365c405f6",
        intentRail: "0x5282325c5b82e9e3fb39050bdd8ec0f500185597"
      }
    });
    expect(JSON.stringify(config)).not.toMatch(/signer|rpc/iu);
    expect(GASOK_CAMPAIGN_ID).toBe("gasok-demo");
    expect(GASOK_MISSION_ID).toBe("first-mock-vault-deposit");
    expect(GASOK_DEMO_AMOUNT_BASE_UNITS).toBe("1000000000000000000");
  });

  it("rejects invalid chain, address, quantity, and public URL inputs", () => {
    expect(() => buildLivePublicConfig({ ...canonicalInput, chainId: 1 })).toThrow("chainId");
    expect(() =>
      buildLivePublicConfig({
        ...canonicalInput,
        deployment: { ...canonicalInput.deployment, mockVaultAddress: "not-an-address" }
      })
    ).toThrow("mockVaultAddress");
    expect(() => buildLivePublicConfig({ ...canonicalInput, minGasBalanceWei: "-1" })).toThrow(
      "minGasBalanceWei"
    );
    expect(() => buildLivePublicConfig({ ...canonicalInput, faucetHelpUrl: "http://docs.example.invalid" })).toThrow(
      "faucetHelpUrl"
    );
    expect(() => buildLivePublicConfig({ ...canonicalInput, txExplorerTemplate: "https://example.invalid/tx" })).toThrow(
      "txExplorerTemplate"
    );
  });
});

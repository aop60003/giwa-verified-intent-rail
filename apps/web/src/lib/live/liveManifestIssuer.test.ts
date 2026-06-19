import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import deployment from "../../generated/deployment.json";
import { createLiveManifestIssuer } from "./liveManifestIssuer.ts";

const account = privateKeyToAccount(keccak256(stringToBytes("giwa sprint 9 manifest issuer test signer")));

describe("live manifest issuer", () => {
  it("issues a protocol-backed manifest bound to the connected wallet", async () => {
    const issuer = createLiveManifestIssuer({
      campaignSignerAccount: account,
      deployment,
      nowSeconds: () => 1790000000,
      nonceSource: () => "nonce-wallet-bound"
    });

    const issued = await issuer.issue({
      wallet: "0x00000000000000000000000000000000000000A1",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: "qr-judge-demo"
    });

    expect(issued.manifest.wallet).toBe("0x00000000000000000000000000000000000000a1");
    expect(issued.manifest.chainId).toBe(91342);
    expect(issued.verifyingContract).toBe(deployment.intentRailAddress);
    expect(issued.intentHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(issued.manifestSignature).toMatch(/^0x[a-f0-9]+$/u);
    expect(issued.preview).toMatchObject({
      target: deployment.mockVaultAddress,
      selector: "0x47e7ef24",
      asset: deployment.mockTokenAddress,
      amountBaseUnits: "1000000000000000000",
      spender: deployment.mockVaultAddress,
      maxAllowanceBaseUnits: "1000000000000000000",
      expiryUnix: 1790003600,
      intentHash: issued.intentHash
    });
  });

  it("rejects a deployment with the wrong GIWA chain id", () => {
    expect(() =>
      createLiveManifestIssuer({
        campaignSignerAccount: account,
        deployment: { ...deployment, chainId: 1 },
        nowSeconds: () => 1790000000,
        nonceSource: () => "nonce"
      })
    ).toThrow("deployment chainId must be 91342");
  });
});

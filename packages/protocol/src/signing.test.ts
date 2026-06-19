import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, stringToBytes } from "viem";
import { manifestFixture } from "./fixtures";
import {
  buildManifestTypedData,
  computeEip712Digest,
  computeManifestStructHash,
  recoverManifestSigner,
  signManifest,
  verifyAgainstAllowedSigner
} from "./signing";

const verifyingContract = "0x0000000000000000000000000000000000000100";
const officialAccount = privateKeyToAccount(keccak256(stringToBytes("giwa sprint 1 official test signer")));
const otherAccount = privateKeyToAccount(keccak256(stringToBytes("giwa sprint 1 other test signer")));

describe("manifest EIP-712 signing", () => {
  it("builds a GIWA Sepolia domain bound to the rail verifying contract", () => {
    const typedData = buildManifestTypedData({
      manifest: manifestFixture,
      verifyingContract
    });

    expect(typedData.domain).toEqual({
      name: "GIWA Verified Intent Rail",
      version: "1",
      chainId: 91342,
      verifyingContract
    });
    expect(typedData.primaryType).toBe("IntentManifest");
    expect(typedData.message.campaignId).toBe("gasok-demo");
  });

  it("documents separate intentHash, manifestStructHash, and eip712Digest values", () => {
    expect(computeManifestStructHash(manifestFixture)).toMatch(/^0x[a-f0-9]{64}$/);
    expect(computeEip712Digest({ manifest: manifestFixture, verifyingContract })).toMatch(/^0x[a-f0-9]{64}$/);
    expect(computeManifestStructHash(manifestFixture)).not.toBe(
      computeEip712Digest({ manifest: manifestFixture, verifyingContract })
    );
  });

  it("recovers the official campaign signer and passes allowlist validation", async () => {
    const signed = await signManifest({
      manifest: manifestFixture,
      verifyingContract,
      account: officialAccount
    });

    await expect(
      recoverManifestSigner({
        manifest: manifestFixture,
        verifyingContract,
        signature: signed.manifestSignature
      })
    ).resolves.toBe(officialAccount.address.toLowerCase());

    await expect(
      verifyAgainstAllowedSigner({
        manifest: manifestFixture,
        verifyingContract,
        signature: signed.manifestSignature,
        allowedSigner: officialAccount.address
      })
    ).resolves.toBe(true);
  });

  it("rejects a non-official signer", async () => {
    const signed = await signManifest({
      manifest: manifestFixture,
      verifyingContract,
      account: otherAccount
    });

    await expect(
      verifyAgainstAllowedSigner({
        manifest: manifestFixture,
        verifyingContract,
        signature: signed.manifestSignature,
        allowedSigner: officialAccount.address
      })
    ).resolves.toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, stringToBytes } from "viem";

import { signManifest } from "../../../../../packages/protocol/src/index.js";
import type { ActionManifest, Address } from "../../../../../packages/protocol/src/index.js";
import anchorEvidence from "../../../../../packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json";
import { verifyDeploymentManifestSigner } from "./verifyManifestSigner.js";

const manifest = anchorEvidence.manifest.manifest as ActionManifest;
const verifyingContract = anchorEvidence.contracts.intentRailAddress as Address;
const officialAccount = privateKeyToAccount(keccak256(stringToBytes("sprint 4 official signer")));
const attackerAccount = privateKeyToAccount(keccak256(stringToBytes("sprint 4 attacker signer")));

describe("deployment manifest signer verifier", () => {
  it("accepts only the configured campaign signer for the deployed rail domain", async () => {
    const signed = await signManifest({ manifest, verifyingContract, account: officialAccount });

    await expect(
      verifyDeploymentManifestSigner({
        manifest,
        verifyingContract,
        signature: signed.manifestSignature,
        officialCampaignSigner: officialAccount.address,
        requestProvidedManifestSigner: attackerAccount.address
      })
    ).resolves.toMatchObject({
      ok: true,
      recoveredSigner: officialAccount.address.toLowerCase()
    });
  });

  it("rejects attacker signatures, malformed signatures, and wrong deployed domains", async () => {
    const attackerSigned = await signManifest({ manifest, verifyingContract, account: attackerAccount });
    const officialSigned = await signManifest({ manifest, verifyingContract, account: officialAccount });

    await expect(
      verifyDeploymentManifestSigner({
        manifest,
        verifyingContract,
        signature: attackerSigned.manifestSignature,
        officialCampaignSigner: officialAccount.address
      })
    ).resolves.toMatchObject({ ok: false, failureReason: "official_signer_mismatch" });

    await expect(
      verifyDeploymentManifestSigner({
        manifest,
        verifyingContract,
        signature: "0x1234",
        officialCampaignSigner: officialAccount.address
      })
    ).resolves.toMatchObject({ ok: false, failureReason: "malformed_signature" });

    await expect(
      verifyDeploymentManifestSigner({
        manifest,
        verifyingContract: "0x0000000000000000000000000000000000000001" as Address,
        signature: officialSigned.manifestSignature,
        officialCampaignSigner: officialAccount.address
      })
    ).resolves.toMatchObject({ ok: false, failureReason: "official_signer_mismatch" });
  });
});

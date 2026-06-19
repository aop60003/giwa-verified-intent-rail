import {
  recoverManifestSigner,
  type ActionManifest,
  type Address,
  type Hex
} from "../../../../../packages/protocol/src/index.ts";
import { normalizeAddress } from "../../../../../packages/protocol/src/validation.ts";

export type ManifestSignerVerificationInput = {
  manifest: ActionManifest;
  verifyingContract: Address;
  signature: Hex;
  officialCampaignSigner: Address;
  requestProvidedManifestSigner?: Address;
};

export type ManifestSignerVerification = {
  ok: boolean;
  recoveredSigner?: Address;
  expectedSigner: Address;
  failureReason: "malformed_signature" | "official_signer_mismatch" | null;
};

export async function verifyDeploymentManifestSigner(
  input: ManifestSignerVerificationInput
): Promise<ManifestSignerVerification> {
  const expectedSigner = normalizeAddress(input.officialCampaignSigner, "officialCampaignSigner");

  if (!/^0x[a-fA-F0-9]{130}$/.test(input.signature)) {
    return {
      ok: false,
      expectedSigner,
      failureReason: "malformed_signature"
    };
  }

  try {
    const recoveredSigner = await recoverManifestSigner({
      manifest: input.manifest,
      verifyingContract: input.verifyingContract,
      signature: input.signature
    });

    if (recoveredSigner !== expectedSigner) {
      return {
        ok: false,
        recoveredSigner,
        expectedSigner,
        failureReason: "official_signer_mismatch"
      };
    }

    return {
      ok: true,
      recoveredSigner,
      expectedSigner,
      failureReason: null
    };
  } catch {
    return {
      ok: false,
      expectedSigner,
      failureReason: "malformed_signature"
    };
  }
}

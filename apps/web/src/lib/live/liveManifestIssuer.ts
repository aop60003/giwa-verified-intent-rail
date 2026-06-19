import {
  ACTION_TYPE,
  GIWA_SEPOLIA_CHAIN_ID,
  MANIFEST_VERSION,
  signManifest,
  type ActionManifest,
  type Address,
  type Hex,
  type SignedManifest
} from "../../../../../packages/protocol/src/index.ts";
import type { PrivateKeyAccount } from "viem/accounts";

export type LiveDeployment = {
  chainId: number;
  mockTokenAddress: string;
  mockVaultAddress: string;
  intentRailAddress: string;
};

export type LiveManifestIssueInput = {
  wallet: string;
  campaignId: string;
  missionId: string;
  referralCode: string | null;
};

export type LiveManifestPreview = {
  target: Address;
  selector: Hex;
  asset: Address;
  amountBaseUnits: string;
  spender: Address;
  maxAllowanceBaseUnits: string;
  expiryUnix: number;
  intentHash: Hex;
};

export type IssuedLiveManifest = SignedManifest & {
  preview: LiveManifestPreview;
  manifestJson: string;
};

export type LiveManifestIssuer = {
  issue(input: LiveManifestIssueInput): Promise<IssuedLiveManifest>;
};

const MOCK_VAULT_DEPOSIT_SELECTOR = "0x47e7ef24" as const;
const MOCK_TESTNET_AMOUNT_BASE_UNITS = "1000000000000000000";
const MANIFEST_TTL_SECONDS = 3600;

export function createLiveManifestIssuer({
  campaignSignerAccount,
  deployment,
  nowSeconds,
  nonceSource
}: {
  campaignSignerAccount: PrivateKeyAccount;
  deployment: LiveDeployment;
  nowSeconds: () => number;
  nonceSource: () => string;
}): LiveManifestIssuer {
  if (deployment.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    throw new Error("deployment chainId must be 91342");
  }

  return {
    async issue(input) {
      const expiryUnix = nowSeconds() + MANIFEST_TTL_SECONDS;
      const manifest: ActionManifest = {
        manifestVersion: MANIFEST_VERSION,
        chainId: GIWA_SEPOLIA_CHAIN_ID,
        nonce: nonceSource(),
        expiryUnix,
        campaignId: input.campaignId,
        missionId: input.missionId,
        wallet: input.wallet as Address,
        actionType: ACTION_TYPE,
        target: deployment.mockVaultAddress as Address,
        selector: MOCK_VAULT_DEPOSIT_SELECTOR,
        asset: deployment.mockTokenAddress as Address,
        amountBaseUnits: MOCK_TESTNET_AMOUNT_BASE_UNITS,
        spender: deployment.mockVaultAddress as Address,
        maxAllowanceBaseUnits: MOCK_TESTNET_AMOUNT_BASE_UNITS,
        ...(input.referralCode === null ? {} : { referralCode: input.referralCode })
      };

      const signed = await signManifest({
        manifest,
        verifyingContract: deployment.intentRailAddress as Address,
        account: campaignSignerAccount
      });

      return {
        ...signed,
        manifestJson: JSON.stringify(signed.manifest),
        preview: {
          target: signed.manifest.target,
          selector: signed.manifest.selector,
          asset: signed.manifest.asset,
          amountBaseUnits: signed.manifest.amountBaseUnits,
          spender: signed.manifest.spender,
          maxAllowanceBaseUnits: signed.manifest.maxAllowanceBaseUnits,
          expiryUnix: signed.manifest.expiryUnix,
          intentHash: signed.intentHash
        }
      };
    }
  };
}

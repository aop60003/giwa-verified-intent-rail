import { privateKeyToAccount } from "viem/accounts";

import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  recoverManifestSigner,
  signManifest
} from "../../protocol/src/index.js";
import { buildSprint3Manifest } from "./chain-anchor-helpers.js";
import { loadEnvFromFiles } from "./giwa-env-files.js";
import {
  normalizePrivateKey,
  publicAddressFromAddressEnv,
  publicAddressFromPrivateKey,
  type EnvMap
} from "./preflight-giwa-helpers.js";

declare const process: {
  env: EnvMap;
  exitCode?: number;
  cwd: () => string;
};

function normalizeForJson(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForJson(entry));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeForJson(entry)])
    );
  }

  return value;
}

function requiredEnv(env: EnvMap, name: string, blockers: string[]): string | undefined {
  const value = env[name]?.trim();
  if (value === undefined || value.length === 0) {
    blockers.push(`${name} is missing`);
    return undefined;
  }

  return value;
}

async function main() {
  const loadedEnv = loadEnvFromFiles(process.env, process.cwd());
  const blockers: string[] = [];
  const env = loadedEnv.effectiveEnv;
  const campaignSignerPrivateKey = normalizePrivateKey(requiredEnv(env, "CAMPAIGN_SIGNER_PRIVATE_KEY", blockers));
  const intentRailAddress = publicAddressFromAddressEnv(requiredEnv(env, "GIWA_INTENT_RAIL_ADDRESS", blockers));
  const mockTokenAddress = publicAddressFromAddressEnv(requiredEnv(env, "GIWA_MOCK_TOKEN_ADDRESS", blockers));
  const mockVaultAddress = publicAddressFromAddressEnv(requiredEnv(env, "GIWA_MOCK_VAULT_ADDRESS", blockers));
  const demoWalletAddress =
    publicAddressFromAddressEnv(env.DEMO_WALLET_ADDRESS) ?? publicAddressFromAddressEnv(env.DEMO_USER_ADDRESS);
  const campaignSignerAddress = publicAddressFromPrivateKey(campaignSignerPrivateKey);

  if (campaignSignerPrivateKey === undefined) {
    blockers.push("CAMPAIGN_SIGNER_PRIVATE_KEY has invalid format");
  }
  if (intentRailAddress === undefined || intentRailAddress === "invalid-address-format") {
    blockers.push("GIWA_INTENT_RAIL_ADDRESS has invalid format");
  }
  if (mockTokenAddress === undefined || mockTokenAddress === "invalid-address-format") {
    blockers.push("GIWA_MOCK_TOKEN_ADDRESS has invalid format");
  }
  if (mockVaultAddress === undefined || mockVaultAddress === "invalid-address-format") {
    blockers.push("GIWA_MOCK_VAULT_ADDRESS has invalid format");
  }
  if (demoWalletAddress === undefined || demoWalletAddress === "invalid-address-format") {
    blockers.push("DEMO_WALLET_ADDRESS or DEMO_USER_ADDRESS is missing or invalid");
  }

  if (
    blockers.length > 0 ||
    campaignSignerPrivateKey === undefined ||
    intentRailAddress === undefined ||
    intentRailAddress === "invalid-address-format" ||
    mockTokenAddress === undefined ||
    mockTokenAddress === "invalid-address-format" ||
    mockVaultAddress === undefined ||
    mockVaultAddress === "invalid-address-format" ||
    demoWalletAddress === undefined ||
    demoWalletAddress === "invalid-address-format"
  ) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: "sprint-3-manifest-signing-v1",
          loadedEnvFiles: loadedEnv.loadedEnvFiles,
          signingOk: false,
          blockers
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const manifest = buildSprint3Manifest({
    nonce: env.GIWA_MANIFEST_NONCE?.trim() ?? `sprint-3-${Date.now().toString()}`,
    expiryUnix: Number(env.GIWA_MANIFEST_EXPIRY_UNIX?.trim() ?? Math.floor(Date.now() / 1000) + 604_800),
    wallet: demoWalletAddress,
    mockVaultAddress,
    mockTokenAddress
  });
  const signedManifest = await signManifest({
    manifest,
    verifyingContract: intentRailAddress,
    account: privateKeyToAccount(campaignSignerPrivateKey)
  });
  const recoveredSigner = await recoverManifestSigner({
    manifest,
    verifyingContract: intentRailAddress,
    signature: signedManifest.manifestSignature
  });

  console.log(
    JSON.stringify(
      normalizeForJson({
        schemaVersion: "sprint-3-manifest-signing-v1",
        loadedEnvFiles: loadedEnv.loadedEnvFiles,
        signingOk: true,
        campaignSignerAddress,
        recoveredSigner,
        verifyingContract: intentRailAddress,
        manifest,
        canonicalManifestPayload: canonicalManifestPayload(manifest),
        canonicalManifestPayloadBytesHex: canonicalManifestPayloadBytesHex(manifest),
        manifestSignature: signedManifest.manifestSignature,
        intentHash: signedManifest.intentHash,
        manifestStructHash: signedManifest.manifestStructHash,
        eip712Digest: signedManifest.eip712Digest
      }),
      null,
      2
    )
  );
}

await main();

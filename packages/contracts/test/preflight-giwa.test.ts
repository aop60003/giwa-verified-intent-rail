import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

import { upsertDecodedLogSnapshots } from "../scripts/chain-anchor-helpers.js";
import { buildFundingTransfers, summarizeFundingPlan } from "../scripts/fund-roles-giwa-helpers.js";
import {
  buildExplorerSmokeUrl,
  collectEnvReadiness,
  EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
  mergeEnvMaps,
  parseEnvFileContent,
  publicAddressFromAddressEnv,
  redactEndpointForReport
} from "../scripts/preflight-giwa-helpers.js";

describe("GIWA Sepolia preflight helpers", () => {
  it("keeps chain id pinned to GIWA Sepolia", () => {
    expect(EXPECTED_GIWA_SEPOLIA_CHAIN_ID).toBe(91_342);
  });

  it("reports env readiness without leaking raw endpoint or key material", () => {
    const deployerKey = generatePrivateKey();
    const campaignSignerKey = generatePrivateKey();
    const verifierKey = generatePrivateKey();
    const submitterKey = generatePrivateKey();
    const demoWallet = privateKeyToAccount(generatePrivateKey()).address;

    const readiness = collectEnvReadiness({
      GIWA_SEPOLIA_RPC_URL: "https://rpc.example.invalid/project/sensitive-segment?token=value",
      GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL: "https://flash.example.invalid/project/sensitive-segment",
      GIWA_EXPLORER_TX_URL_TEMPLATE: "https://explorer.example.invalid/tx/{txHash}",
      GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: "https://explorer.example.invalid/address/{address}",
      DEPLOYER_PRIVATE_KEY: deployerKey,
      CAMPAIGN_SIGNER_PRIVATE_KEY: campaignSignerKey,
      VERIFIER_PRIVATE_KEY: verifierKey,
      INTENT_SUBMITTER_PRIVATE_KEY: submitterKey,
      DEMO_WALLET_ADDRESS: demoWallet
    });

    const serialized = JSON.stringify(readiness);
    expect(readiness.missing).toEqual([]);
    expect(serialized).not.toContain(deployerKey);
    expect(serialized).not.toContain("sensitive-segment");
    expect(serialized).not.toContain("token=value");
    expect(readiness.entries.find((entry) => entry.key === "DEPLOYER_PRIVATE_KEY")).toMatchObject({
      status: "set",
      length: deployerKey.length,
      publicAddress: privateKeyToAccount(deployerKey).address
    });
  });

  it("parses env file content without comments, quotes, or export prefixes", () => {
    expect(
      parseEnvFileContent(`
        # local-only GIWA env
        export GIWA_SEPOLIA_RPC_URL="https://rpc.example.invalid/secret-path?token=value"
        GIWA_EXPLORER_TX_URL_TEMPLATE='https://explorer.example.invalid/tx/{txHash}'
        EMPTY_VALUE=
        INVALID LINE
      `)
    ).toEqual({
      GIWA_SEPOLIA_RPC_URL: "https://rpc.example.invalid/secret-path?token=value",
      GIWA_EXPLORER_TX_URL_TEMPLATE: "https://explorer.example.invalid/tx/{txHash}",
      EMPTY_VALUE: ""
    });
  });

  it("keeps process env values ahead of file env values", () => {
    expect(
      mergeEnvMaps(
        {
          GIWA_SEPOLIA_RPC_URL: "https://process.example.invalid"
        },
        {
          GIWA_SEPOLIA_RPC_URL: "https://file.example.invalid",
          GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL: "https://flash.example.invalid"
        }
      )
    ).toMatchObject({
      GIWA_SEPOLIA_RPC_URL: "https://process.example.invalid",
      GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL: "https://flash.example.invalid"
    });
  });

  it("requires verifier and demo wallet alternatives without requiring their private keys", () => {
    const readiness = collectEnvReadiness({
      GIWA_SEPOLIA_RPC_URL: "https://rpc.example.invalid",
      GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL: "https://flash.example.invalid",
      GIWA_EXPLORER_TX_URL_TEMPLATE: "https://explorer.example.invalid/tx/{txHash}",
      GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: "https://explorer.example.invalid/address/{address}",
      DEPLOYER_PRIVATE_KEY: generatePrivateKey(),
      CAMPAIGN_SIGNER_PRIVATE_KEY: generatePrivateKey(),
      VERIFIER_ADDRESS: privateKeyToAccount(generatePrivateKey()).address,
      INTENT_SUBMITTER_PRIVATE_KEY: generatePrivateKey(),
      DEMO_USER_ADDRESS: privateKeyToAccount(generatePrivateKey()).address
    });

    expect(readiness.missing).toEqual([]);
  });

  it("redacts URL path and query fields for reportable endpoints", () => {
    expect(redactEndpointForReport("https://rpc.example.invalid/project/abc?token=value")).toMatchObject({
      status: "valid-url",
      protocol: "https:",
      host: "rpc.example.invalid",
      path: "<redacted-path>",
      hasQuery: true
    });
  });

  it("builds explorer smoke URLs only when a supported placeholder exists", () => {
    expect(buildExplorerSmokeUrl("https://explorer.example.invalid/tx/{txHash}", "tx")).toContain(
      "/tx/0x"
    );
    expect(buildExplorerSmokeUrl("https://explorer.example.invalid/tx/static", "tx")).toBeUndefined();
  });

  it("normalizes public address env values without deriving a demo private key", () => {
    const address = privateKeyToAccount(generatePrivateKey()).address.toLowerCase();

    expect(publicAddressFromAddressEnv(address)).toBe(getAddress(address));
  });

  it("builds funding transfers only for underfunded non-funder recipients", () => {
    const funderAddress = privateKeyToAccount(generatePrivateKey()).address;
    const deployerAddress = privateKeyToAccount(generatePrivateKey()).address;
    const demoWalletAddress = privateKeyToAccount(generatePrivateKey()).address;

    expect(
      buildFundingTransfers(
        [
          {
            role: "deployer",
            address: deployerAddress,
            currentBalanceWei: 10n,
            targetBalanceWei: 25n
          },
          {
            role: "demoWallet",
            address: demoWalletAddress,
            currentBalanceWei: 40n,
            targetBalanceWei: 25n
          },
          {
            role: "verifier",
            address: funderAddress,
            currentBalanceWei: 50n,
            targetBalanceWei: 25n
          }
        ],
        funderAddress
      )
    ).toEqual([
      {
        role: "deployer",
        address: deployerAddress,
        valueWei: 15n
      }
    ]);
  });

  it("summarizes funding plans without private key or raw RPC material", () => {
    const funderAddress = privateKeyToAccount(generatePrivateKey()).address;
    const deployerAddress = privateKeyToAccount(generatePrivateKey()).address;
    const secret = generatePrivateKey();
    const summary = summarizeFundingPlan({
      funderAddress,
      funderBalanceWei: 1_000n,
      estimatedTransferGasWei: 10n,
      transfers: [
        {
          role: "deployer",
          address: deployerAddress,
          valueWei: 100n
        }
      ],
      blockers: [],
      secretLikeInput: secret
    });

    const serialized = JSON.stringify(summary);
    expect(serialized).toContain(funderAddress);
    expect(serialized).toContain(deployerAddress);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("https://");
  });

  it("upserts decoded log snapshots when chain anchor is rerun", () => {
    const intentSubmitted = {
      eventName: "IntentSubmitted",
      contractAddress: "0x1111111111111111111111111111111111111111",
      logIndex: 1,
      marker: "keep"
    };
    const previousApproval = {
      eventName: "Approval",
      contractAddress: "0x2222222222222222222222222222222222222222",
      logIndex: 2,
      marker: "old"
    };
    const duplicateApproval = {
      eventName: "Approval",
      contractAddress: "0x2222222222222222222222222222222222222222",
      logIndex: 2,
      marker: "duplicate"
    };
    const unrelatedTransfer = {
      eventName: "Transfer",
      contractAddress: "0x3333333333333333333333333333333333333333",
      logIndex: 9,
      marker: "keep"
    };
    const latestApproval = {
      eventName: "Approval",
      contractAddress: "0x2222222222222222222222222222222222222222",
      logIndex: 2,
      marker: "latest"
    };
    const latestDeposit = {
      eventName: "MockDeposit",
      address: "0x4444444444444444444444444444444444444444",
      logIndex: 4,
      marker: "latest"
    };

    expect(
      upsertDecodedLogSnapshots(
        [intentSubmitted, previousApproval, duplicateApproval, unrelatedTransfer],
        [latestApproval, latestDeposit]
      )
    ).toEqual([intentSubmitted, unrelatedTransfer, latestApproval, latestDeposit]);
  });
});

import { mkdirSync, writeFileSync } from "node:fs";
import { artifacts } from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  encodeFunctionData,
  getAddress,
  getContract,
  http,
  toFunctionSelector,
  type Abi,
  type Address,
  type Hex,
  type TransactionReceipt
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  idToBytes32,
  signManifest
} from "../../protocol/src/index.js";
import {
  buildExplorerUrl,
  buildSprint3Manifest,
  normalizeForEvidence,
  sprint3AmountBaseUnits
} from "./chain-anchor-helpers.js";
import { loadEnvFromFiles } from "./giwa-env-files.js";
import {
  EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
  normalizePrivateKey,
  publicAddressFromAddressEnv,
  type EnvMap
} from "./preflight-giwa-helpers.js";

declare const process: {
  env: EnvMap;
  exitCode?: number;
  cwd: () => string;
};

type ContractCallOptions = {
  account?: Address;
};

type ContractRead = (args?: readonly unknown[]) => Promise<unknown>;
type ContractWrite = (args?: readonly unknown[], options?: ContractCallOptions) => Promise<Hex>;

type DeployedContract = {
  address: Address;
  abi: Abi;
  read: Record<string, ContractRead> & {
    balanceOf: ContractRead;
  };
  write: Record<string, ContractWrite> & {
    mint: ContractWrite;
    submitIntent: ContractWrite;
  };
};

const requestTimeoutMs = 10_000;
const deployedCodePollIntervalMs = 2_000;
const deployedCodePollAttempts = 10;
const giwaSepolia = defineChain({
  id: EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
  name: "GIWA Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH"
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rpc.giwa.io"]
    }
  }
});

function requiredPrivateKey(env: EnvMap, name: string, blockers: string[]): Hex | undefined {
  const key = normalizePrivateKey(env[name]);
  if (key === undefined) {
    blockers.push(`${name} is missing or invalid`);
  }

  return key;
}

function requiredAddress(value: string | undefined, label: string, blockers: string[]): Address | undefined {
  const address = publicAddressFromAddressEnv(value);
  if (address === undefined || address === "invalid-address-format") {
    blockers.push(`${label} is missing or invalid`);
    return undefined;
  }

  return address;
}

function writeJson(path: string, value: unknown) {
  const slashPath = path.replace(/\\/gu, "/");
  const directory = slashPath.slice(0, slashPath.lastIndexOf("/"));
  mkdirSync(directory, { recursive: true });
  writeFileSync(slashPath, `${JSON.stringify(normalizeForEvidence(value), null, 2)}\n`);
}

async function waitForDeployedCode({
  publicClient,
  address,
  contractName
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  address: Address;
  contractName: string;
}): Promise<Hex> {
  for (let attempt = 1; attempt <= deployedCodePollAttempts; attempt += 1) {
    const code = await publicClient.getCode({ address });
    if (code !== undefined && code !== "0x") {
      return code;
    }

    if (attempt < deployedCodePollAttempts) {
      await new Promise((resolve) => setTimeout(resolve, deployedCodePollIntervalMs));
    }
  }

  throw new Error(`${contractName} deployed code is missing after polling`);
}

function decodeEventFromReceipt({
  abi,
  address,
  eventName,
  receipt
}: {
  abi: Abi;
  address: Address;
  eventName: string;
  receipt: TransactionReceipt;
}) {
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== getAddress(address)) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics
      });

      if (decoded.eventName === eventName) {
        return {
          address: log.address,
          args: decoded.args,
          data: log.data,
          logIndex: log.logIndex,
          topics: log.topics
        };
      }
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
    }
  }

  return undefined;
}

async function main() {
  const loadedEnv = loadEnvFromFiles(process.env, process.cwd());
  const env = loadedEnv.effectiveEnv;
  const blockers: string[] = [];
  const standardRpcUrl = env.GIWA_SEPOLIA_RPC_URL?.trim();
  const deployerPrivateKey = requiredPrivateKey(env, "DEPLOYER_PRIVATE_KEY", blockers);
  const campaignSignerPrivateKey = requiredPrivateKey(env, "CAMPAIGN_SIGNER_PRIVATE_KEY", blockers);
  const intentSubmitterPrivateKey = requiredPrivateKey(env, "INTENT_SUBMITTER_PRIVATE_KEY", blockers);
  const verifierPrivateKey = normalizePrivateKey(env.VERIFIER_PRIVATE_KEY);
  const verifierAddress =
    verifierPrivateKey === undefined
      ? requiredAddress(env.VERIFIER_ADDRESS, "VERIFIER_ADDRESS", blockers)
      : privateKeyToAccount(verifierPrivateKey).address;
  const demoWalletAddress =
    requiredAddress(env.DEMO_WALLET_ADDRESS ?? env.DEMO_USER_ADDRESS, "DEMO_WALLET_ADDRESS or DEMO_USER_ADDRESS", blockers);
  const txExplorerTemplate = env.GIWA_EXPLORER_TX_URL_TEMPLATE?.trim();
  const addressExplorerTemplate = env.GIWA_EXPLORER_ADDRESS_URL_TEMPLATE?.trim();

  if (standardRpcUrl === undefined || standardRpcUrl.length === 0) {
    blockers.push("GIWA_SEPOLIA_RPC_URL is missing");
  }
  if (txExplorerTemplate === undefined || txExplorerTemplate.length === 0) {
    blockers.push("GIWA_EXPLORER_TX_URL_TEMPLATE is missing");
  }
  if (addressExplorerTemplate === undefined || addressExplorerTemplate.length === 0) {
    blockers.push("GIWA_EXPLORER_ADDRESS_URL_TEMPLATE is missing");
  }

  if (
    blockers.length > 0 ||
    standardRpcUrl === undefined ||
    deployerPrivateKey === undefined ||
    campaignSignerPrivateKey === undefined ||
    intentSubmitterPrivateKey === undefined ||
    verifierAddress === undefined ||
    demoWalletAddress === undefined ||
    txExplorerTemplate === undefined ||
    addressExplorerTemplate === undefined
  ) {
    console.log(JSON.stringify({ deployOk: false, blockers }, null, 2));
    process.exitCode = 1;
    return;
  }

  const deployer = privateKeyToAccount(deployerPrivateKey);
  const campaignSigner = privateKeyToAccount(campaignSignerPrivateKey);
  const intentSubmitter = privateKeyToAccount(intentSubmitterPrivateKey);
  const publicClient = createPublicClient({
    chain: giwaSepolia,
    transport: http(standardRpcUrl, { timeout: requestTimeoutMs })
  });
  const deployerWallet = createWalletClient({
    account: deployer,
    chain: giwaSepolia,
    transport: http(standardRpcUrl, { timeout: requestTimeoutMs })
  });
  const submitterWallet = createWalletClient({
    account: intentSubmitter,
    chain: giwaSepolia,
    transport: http(standardRpcUrl, { timeout: requestTimeoutMs })
  });

  const chainId = await publicClient.getChainId();
  if (chainId !== EXPECTED_GIWA_SEPOLIA_CHAIN_ID) {
    console.log(JSON.stringify({ deployOk: false, blockers: [`chainId ${chainId.toString()} is not 91342`] }, null, 2));
    process.exitCode = 1;
    return;
  }

  async function deployContract(contractName: string, args: readonly unknown[] = []) {
    const artifact = await artifacts.readArtifact(contractName);
    const txHash = await deployerWallet.deployContract({
      account: deployer,
      abi: artifact.abi as Abi,
      bytecode: artifact.bytecode as Hex,
      args
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success" || receipt.contractAddress == null) {
      throw new Error(`${contractName} deployment failed`);
    }

    const address = getAddress(receipt.contractAddress);
    const code = await waitForDeployedCode({ publicClient, address, contractName });

    return {
      contract: getContract({
        address,
        abi: artifact.abi as Abi,
        client: {
          public: publicClient,
          wallet: deployerWallet
        }
      }) as unknown as DeployedContract,
      codeLength: code.length,
      receipt,
      txHash
    };
  }

  const token = await deployContract("MockIntentToken", ["Mock Intent Token", "MIT"]);
  const vault = await deployContract("MockVault");
  const rail = await deployContract("IntentRail", [verifierAddress]);

  const mintReceipt = await publicClient.waitForTransactionReceipt({
    hash: await token.contract.write.mint([demoWalletAddress, BigInt(sprint3AmountBaseUnits)])
  });
  if (mintReceipt.status !== "success") {
    throw new Error("mint transaction failed");
  }

  const manifest = buildSprint3Manifest({
    nonce: `sprint-3-${rail.receipt.blockNumber.toString()}-${rail.txHash.slice(2, 10)}`,
    expiryUnix: Math.floor(Date.now() / 1000) + 604_800,
    wallet: demoWalletAddress,
    mockVaultAddress: vault.contract.address,
    mockTokenAddress: token.contract.address
  });
  const signedManifest = await signManifest({
    manifest,
    verifyingContract: rail.contract.address,
    account: campaignSigner
  });
  const campaignIdBytes32 = idToBytes32(manifest.campaignId);
  const missionIdBytes32 = idToBytes32(manifest.missionId);
  const railWithSubmitter = getContract({
    address: rail.contract.address,
    abi: rail.contract.abi,
    client: {
      public: publicClient,
      wallet: submitterWallet
    }
  }) as unknown as DeployedContract;
  const intentSubmittedReceipt = await publicClient.waitForTransactionReceipt({
    hash: await railWithSubmitter.write.submitIntent(
      [
        signedManifest.intentHash,
        campaignIdBytes32,
        missionIdBytes32,
        manifest.wallet,
        manifest.target,
        manifest.selector,
        manifest.asset,
        BigInt(manifest.amountBaseUnits),
        manifest.spender,
        BigInt(manifest.maxAllowanceBaseUnits),
        BigInt(manifest.expiryUnix)
      ]
    )
  });
  if (intentSubmittedReceipt.status !== "success") {
    throw new Error("IntentSubmitted transaction failed");
  }

  const intentSubmitted = decodeEventFromReceipt({
    abi: rail.contract.abi,
    eventName: "IntentSubmitted",
    address: rail.contract.address,
    receipt: intentSubmittedReceipt
  });
  if (intentSubmitted === undefined) {
    throw new Error("IntentSubmitted event was not found");
  }

  const tokenArtifact = await artifacts.readArtifact("MockIntentToken");
  const vaultArtifact = await artifacts.readArtifact("MockVault");
  const walletActions = {
    approvalRequired: true,
    approve: {
      from: demoWalletAddress,
      to: token.contract.address,
      valueWei: "0",
      data: encodeFunctionData({
        abi: tokenArtifact.abi as Abi,
        functionName: "approve",
        args: [vault.contract.address, BigInt(sprint3AmountBaseUnits)]
      })
    },
    deposit: {
      from: demoWalletAddress,
      to: vault.contract.address,
      valueWei: "0",
      data: encodeFunctionData({
        abi: vaultArtifact.abi as Abi,
        functionName: "deposit",
        args: [token.contract.address, BigInt(sprint3AmountBaseUnits)]
      })
    }
  };

  const evidence = {
    schemaVersion: "sprint-3-giwa-chain-anchor-v1",
    status: "pending_demo_wallet_transactions",
    network: {
      chainId: EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
      networkName: "GIWA Sepolia",
      standardRpcSanitizedHost: "sepolia-rpc.giwa.io",
      flashblocksEvidenceNamespace: "non-final"
    },
    roles: {
      deployerAddress: deployer.address,
      campaignSignerAddress: campaignSigner.address,
      verifierAddress,
      intentSubmitterAddress: intentSubmitter.address,
      demoUserAddress: demoWalletAddress,
      demoUserPrivateKeyNeverRequested: true
    },
    contracts: {
      mockTokenAddress: token.contract.address,
      mockVaultAddress: vault.contract.address,
      intentRailAddress: rail.contract.address,
      mockTokenDeploymentTxHash: token.txHash,
      mockVaultDeploymentTxHash: vault.txHash,
      intentRailDeploymentTxHash: rail.txHash,
      deploymentBlockNumber: rail.receipt.blockNumber,
      deploymentBlockHash: rail.receipt.blockHash,
      codePresent: true,
      codeLength: {
        mockToken: token.codeLength,
        mockVault: vault.codeLength,
        intentRail: rail.codeLength
      }
    },
    manifest: {
      ...signedManifest,
      canonicalManifestPayload: canonicalManifestPayload(manifest),
      canonicalManifestPayloadBytesHex: canonicalManifestPayloadBytesHex(manifest),
      campaignIdBytes32,
      missionIdBytes32
    },
    transactions: {
      mintTxHash: mintReceipt.transactionHash,
      intentSubmittedTxHash: intentSubmittedReceipt.transactionHash,
      approveTxHash: null,
      depositTxHash: null,
      decisionTxHash: {
        sprint4Output: true,
        value: null
      }
    },
    decodedLogSnapshots: [
      {
        eventName: "IntentSubmitted",
        contractAddress: intentSubmitted.address,
        logIndex: intentSubmitted.logIndex,
        args: intentSubmitted.args
      }
    ],
    explorer: {
      contracts: {
        mockToken: buildExplorerUrl(addressExplorerTemplate, token.contract.address),
        mockVault: buildExplorerUrl(addressExplorerTemplate, vault.contract.address),
        intentRail: buildExplorerUrl(addressExplorerTemplate, rail.contract.address)
      },
      transactions: {
        mockTokenDeployment: buildExplorerUrl(txExplorerTemplate, token.txHash),
        mockVaultDeployment: buildExplorerUrl(txExplorerTemplate, vault.txHash),
        intentRailDeployment: buildExplorerUrl(txExplorerTemplate, rail.txHash),
        mint: buildExplorerUrl(txExplorerTemplate, mintReceipt.transactionHash),
        intentSubmitted: buildExplorerUrl(txExplorerTemplate, intentSubmittedReceipt.transactionHash)
      }
    },
    walletActions,
    nextStep: {
      setEnv: ["GIWA_APPROVE_TX_HASH", "GIWA_DEPOSIT_TX_HASH"],
      command: "pnpm --filter @giwa/contracts --fail-if-no-match anchor:giwa"
    }
  };

  writeJson(`${process.cwd()}/../../docs/evidence/giwa-sepolia-chain-anchor.json`, evidence);
  writeJson(`${process.cwd()}/../../apps/web/src/generated/deployment.json`, {
    chainId: EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
    mockTokenAddress: token.contract.address,
    mockVaultAddress: vault.contract.address,
    intentRailAddress: rail.contract.address,
    intentSubmittedTxHash: intentSubmittedReceipt.transactionHash,
    decisionTxHash: null
  });

  console.log(JSON.stringify(normalizeForEvidence({ deployOk: true, evidencePath: "docs/evidence/giwa-sepolia-chain-anchor.json", evidence }), null, 2));
}

await main();

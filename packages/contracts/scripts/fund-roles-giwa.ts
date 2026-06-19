import { artifacts } from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeDeployData,
  formatEther,
  getAddress,
  http,
  type Abi,
  type Address,
  type Hex,
  type PublicClient
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  buildFundingTransfers,
  summarizeFundingPlan,
  totalFundingValueWei,
  type FundingRequirement
} from "./fund-roles-giwa-helpers.js";
import { loadEnvFromFiles } from "./giwa-env-files.js";
import {
  EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
  publicAddressFromAddressEnv,
  publicAddressFromPrivateKey,
  type EnvMap
} from "./preflight-giwa-helpers.js";

declare const process: {
  env: EnvMap;
  exitCode?: number;
  cwd: () => string;
};

const requestTimeoutMs = 10_000;
const balanceSafetyMultiplier = 2n;
const roleOperationGasEstimate = 300_000n;
const nativeTransferGasEstimate = 21_000n;

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

function requireAddress(
  label: string,
  value: Address | "invalid-address-format" | "invalid-private-key-format" | undefined,
  blockers: string[]
): Address | undefined {
  if (value === undefined) {
    blockers.push(`${label} is missing`);
    return undefined;
  }

  if (value === "invalid-address-format" || value === "invalid-private-key-format") {
    blockers.push(`${label} has invalid format`);
    return undefined;
  }

  return getAddress(value);
}

function createRpcClient(rpcUrl: string): PublicClient {
  return createPublicClient({
    chain: giwaSepolia,
    transport: http(rpcUrl, {
      timeout: requestTimeoutMs
    })
  });
}

async function estimateDeploymentGas(
  publicClient: PublicClient,
  account: Address,
  contractName: string,
  args: readonly unknown[] = []
): Promise<bigint> {
  const artifact = await artifacts.readArtifact(contractName);
  const data = encodeDeployData({
    abi: artifact.abi as Abi,
    bytecode: artifact.bytecode as Hex,
    args
  });

  return publicClient.estimateGas({
    account,
    data
  });
}

async function buildFundingRequirements(
  publicClient: PublicClient,
  gasPriceWei: bigint,
  deployerAddress: Address,
  verifierAddress: Address,
  intentSubmitterAddress: Address,
  demoWalletAddress: Address
): Promise<FundingRequirement[]> {
  const [tokenDeploymentGas, vaultDeploymentGas, railDeploymentGas] = await Promise.all([
    estimateDeploymentGas(publicClient, deployerAddress, "MockIntentToken", ["Mock Intent Token", "MIT"]),
    estimateDeploymentGas(publicClient, deployerAddress, "MockVault"),
    estimateDeploymentGas(publicClient, deployerAddress, "IntentRail", [verifierAddress])
  ]);
  const deploymentTargetWei =
    (tokenDeploymentGas + vaultDeploymentGas + railDeploymentGas) * gasPriceWei * balanceSafetyMultiplier;
  const operationTargetWei = roleOperationGasEstimate * gasPriceWei * balanceSafetyMultiplier;

  const [deployerBalance, verifierBalance, intentSubmitterBalance, demoWalletBalance] = await Promise.all([
    publicClient.getBalance({ address: deployerAddress }),
    publicClient.getBalance({ address: verifierAddress }),
    publicClient.getBalance({ address: intentSubmitterAddress }),
    publicClient.getBalance({ address: demoWalletAddress })
  ]);

  return [
    {
      role: "deployer",
      address: deployerAddress,
      currentBalanceWei: deployerBalance,
      targetBalanceWei: deploymentTargetWei
    },
    {
      role: "verifier",
      address: verifierAddress,
      currentBalanceWei: verifierBalance,
      targetBalanceWei: operationTargetWei
    },
    {
      role: "intentSubmitter",
      address: intentSubmitterAddress,
      currentBalanceWei: intentSubmitterBalance,
      targetBalanceWei: operationTargetWei
    },
    {
      role: "demoWallet",
      address: demoWalletAddress,
      currentBalanceWei: demoWalletBalance,
      targetBalanceWei: operationTargetWei
    }
  ];
}

async function main() {
  const loadedEnv = loadEnvFromFiles(process.env, process.cwd());
  const blockers: string[] = [];
  const funderPrivateKey = loadedEnv.effectiveEnv.GIWA_FUNDER_PRIVATE_KEY?.trim();

  const funderAddress = requireAddress(
    "GIWA_FUNDER_PRIVATE_KEY public address",
    publicAddressFromPrivateKey(funderPrivateKey),
    blockers
  );
  const deployerAddress = requireAddress(
    "DEPLOYER_PRIVATE_KEY public address",
    publicAddressFromPrivateKey(loadedEnv.effectiveEnv.DEPLOYER_PRIVATE_KEY),
    blockers
  );
  const verifierAddress = requireAddress(
    "verifier public address",
    publicAddressFromPrivateKey(loadedEnv.effectiveEnv.VERIFIER_PRIVATE_KEY) ??
      publicAddressFromAddressEnv(loadedEnv.effectiveEnv.VERIFIER_ADDRESS),
    blockers
  );
  const intentSubmitterAddress = requireAddress(
    "INTENT_SUBMITTER_PRIVATE_KEY public address",
    publicAddressFromPrivateKey(loadedEnv.effectiveEnv.INTENT_SUBMITTER_PRIVATE_KEY),
    blockers
  );
  const demoWalletAddress = requireAddress(
    "demo wallet public address",
    publicAddressFromAddressEnv(loadedEnv.effectiveEnv.DEMO_WALLET_ADDRESS) ??
      publicAddressFromAddressEnv(loadedEnv.effectiveEnv.DEMO_USER_ADDRESS),
    blockers
  );

  const standardRpcUrl = loadedEnv.effectiveEnv.GIWA_SEPOLIA_RPC_URL?.trim();
  if (standardRpcUrl === undefined || standardRpcUrl.length === 0) {
    blockers.push("GIWA_SEPOLIA_RPC_URL is missing");
  }

  const report: Record<string, unknown> = {
    schemaVersion: "sprint-3-giwa-role-funding-v1",
    capturedAt: new Date().toISOString(),
    loadedEnvFiles: loadedEnv.loadedEnvFiles,
    expectedChainId: EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
    funder: {
      status: funderAddress === undefined ? "missing" : "set",
      publicAddress: funderAddress
    },
    recipients: {
      deployerAddress,
      verifierAddress,
      intentSubmitterAddress,
      demoWalletAddress
    }
  };

  if (
    blockers.length > 0 ||
    funderPrivateKey === undefined ||
    standardRpcUrl === undefined ||
    funderAddress === undefined ||
    deployerAddress === undefined ||
    verifierAddress === undefined ||
    intentSubmitterAddress === undefined ||
    demoWalletAddress === undefined
  ) {
    report.decision = {
      fundingOk: false,
      blockers
    };
    console.log(JSON.stringify(normalizeForJson(report), null, 2));
    process.exitCode = 1;
    return;
  }

  const account = privateKeyToAccount(funderPrivateKey as Hex);
  const publicClient = createRpcClient(standardRpcUrl);
  const walletClient = createWalletClient({
    account,
    chain: giwaSepolia,
    transport: http(standardRpcUrl, {
      timeout: requestTimeoutMs
    })
  });

  const chainId = await publicClient.getChainId();
  report.network = {
    standardRpcChainId: chainId
  };
  if (chainId !== EXPECTED_GIWA_SEPOLIA_CHAIN_ID) {
    report.decision = {
      fundingOk: false,
      blockers: [`standard RPC chainId is not GIWA Sepolia ${EXPECTED_GIWA_SEPOLIA_CHAIN_ID}`]
    };
    console.log(JSON.stringify(normalizeForJson(report), null, 2));
    process.exitCode = 1;
    return;
  }

  const gasPriceWei = await publicClient.getGasPrice();
  const requirements = await buildFundingRequirements(
    publicClient,
    gasPriceWei,
    deployerAddress,
    verifierAddress,
    intentSubmitterAddress,
    demoWalletAddress
  );
  const transfers = buildFundingTransfers(requirements, funderAddress);
  const estimatedTransferGasWei = BigInt(transfers.length) * nativeTransferGasEstimate * gasPriceWei * balanceSafetyMultiplier;
  const funderBalanceWei = await publicClient.getBalance({ address: funderAddress });

  const selfRequirement = requirements.find((requirement) => getAddress(requirement.address) === funderAddress);
  const selfReserveWei = selfRequirement?.targetBalanceWei ?? 0n;
  const totalRequiredFromFunderWei = selfReserveWei + totalFundingValueWei(transfers) + estimatedTransferGasWei;
  if (funderBalanceWei < totalRequiredFromFunderWei) {
    blockers.push("GIWA_FUNDER_PRIVATE_KEY public address balance is below required transfer total");
  }

  report.gas = {
    gasPriceWei: gasPriceWei.toString(),
    balanceSafetyMultiplier: balanceSafetyMultiplier.toString(),
    nativeTransferGasEstimate: nativeTransferGasEstimate.toString()
  };
  report.requirements = requirements.map((requirement) => ({
    role: requirement.role,
    address: requirement.address,
    currentBalanceWei: requirement.currentBalanceWei.toString(),
    targetBalanceWei: requirement.targetBalanceWei.toString(),
    currentBalanceEth: formatEther(requirement.currentBalanceWei),
    targetBalanceEth: formatEther(requirement.targetBalanceWei),
    ok: requirement.currentBalanceWei >= requirement.targetBalanceWei
  }));
  report.plan = summarizeFundingPlan({
    funderAddress,
    funderBalanceWei,
    estimatedTransferGasWei,
    transfers,
    blockers
  });

  if (blockers.length > 0) {
    report.decision = {
      fundingOk: false,
      blockers
    };
    console.log(JSON.stringify(normalizeForJson(report), null, 2));
    process.exitCode = 1;
    return;
  }

  const sentTransfers = [];
  for (const transfer of transfers) {
    const hash = await walletClient.sendTransaction({
      account,
      chain: giwaSepolia,
      to: transfer.address,
      value: transfer.valueWei
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    sentTransfers.push({
      role: transfer.role,
      to: transfer.address,
      valueWei: transfer.valueWei.toString(),
      txHash: hash,
      receiptStatus: receipt.status,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash
    });

    if (receipt.status !== "success") {
      blockers.push(`${transfer.role} funding transaction did not succeed`);
      break;
    }
  }

  report.sentTransfers = sentTransfers;
  report.decision = {
    fundingOk: blockers.length === 0,
    blockers,
    nextCommand: "pnpm --filter @giwa/contracts --fail-if-no-match preflight:giwa"
  };

  console.log(JSON.stringify(normalizeForJson(report), null, 2));
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
}

await main();

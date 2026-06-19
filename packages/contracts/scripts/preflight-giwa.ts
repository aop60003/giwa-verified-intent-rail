import { artifacts } from "hardhat";
import {
  createPublicClient,
  encodeDeployData,
  formatEther,
  getAddress,
  http,
  type Abi,
  type Address,
  type Hex,
  type PublicClient
} from "viem";

import { loadEnvFromFiles, type LoadedEnv } from "./giwa-env-files.js";
import {
  buildExplorerSmokeUrl,
  collectEnvReadiness,
  EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
  publicAddressFromAddressEnv,
  publicAddressFromPrivateKey,
  redactEndpointForReport,
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

type RoleAddressReport = {
  deployerAddress: Address | undefined;
  campaignSignerAddress: Address | undefined;
  verifierAddress: Address | undefined;
  intentSubmitterAddress: Address | undefined;
  demoWalletAddress: Address | undefined;
};

type ChainProbe =
  | {
      status: "ok";
      chainId: number;
    }
  | {
      status: "failed";
      errorName: string;
    };

type BalanceReport = {
  role: string;
  address: Address;
  balanceWei: string;
  balanceEth: string;
  requiredMinimumWei: string;
  requiredMinimumReason: string;
  ok: boolean;
};

type ExplorerSmokeReport =
  | {
      status: "skipped";
      reason: string;
    }
  | {
      status: "ok" | "failed";
      statusCode?: number;
      errorName?: string;
      redactedEndpoint?: ReturnType<typeof redactEndpointForReport>;
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

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
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
    transport: http(rpcUrl, {
      timeout: requestTimeoutMs
    })
  });
}

async function probeChainId(client: PublicClient): Promise<ChainProbe> {
  try {
    return {
      status: "ok",
      chainId: await client.getChainId()
    };
  } catch (error) {
    return {
      status: "failed",
      errorName: errorName(error)
    };
  }
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

async function readBalanceReport(
  publicClient: PublicClient,
  gasPriceWei: bigint,
  role: string,
  address: Address,
  requiredGas: bigint,
  reason: string
): Promise<BalanceReport> {
  const balanceWei = await publicClient.getBalance({ address });
  const requiredMinimumWei = gasPriceWei * requiredGas * balanceSafetyMultiplier;

  return {
    role,
    address,
    balanceWei: balanceWei.toString(),
    balanceEth: formatEther(balanceWei),
    requiredMinimumWei: requiredMinimumWei.toString(),
    requiredMinimumReason: `${requiredGas.toString()} gas * gasPrice * ${balanceSafetyMultiplier.toString()} safety multiplier (${reason})`,
    ok: balanceWei >= requiredMinimumWei
  };
}

async function smokeExplorerTemplate(
  template: string | undefined,
  kind: "tx" | "address"
): Promise<ExplorerSmokeReport> {
  const url = buildExplorerSmokeUrl(template, kind);
  if (url === undefined) {
    return {
      status: "skipped",
      reason: "template missing, invalid, or without a supported placeholder"
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });
    return {
      status: response.status >= 200 && response.status < 500 ? "ok" : "failed",
      statusCode: response.status,
      redactedEndpoint: redactEndpointForReport(url)
    };
  } catch (error) {
    return {
      status: "failed",
      errorName: errorName(error),
      redactedEndpoint: redactEndpointForReport(url)
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function main() {
  const loadedEnv = loadEnvFromFiles(process.env, process.cwd());
  const envReadiness = collectEnvReadiness(loadedEnv.effectiveEnv);
  const blockers = [...envReadiness.missing.map((name) => `missing env: ${name}`)];

  const roleAddresses: RoleAddressReport = {
    deployerAddress: requireAddress(
      "DEPLOYER_PRIVATE_KEY public address",
      publicAddressFromPrivateKey(loadedEnv.effectiveEnv.DEPLOYER_PRIVATE_KEY),
      blockers
    ),
    campaignSignerAddress: requireAddress(
      "CAMPAIGN_SIGNER_PRIVATE_KEY public address",
      publicAddressFromPrivateKey(loadedEnv.effectiveEnv.CAMPAIGN_SIGNER_PRIVATE_KEY),
      blockers
    ),
    verifierAddress: requireAddress(
      "verifier public address",
      publicAddressFromPrivateKey(loadedEnv.effectiveEnv.VERIFIER_PRIVATE_KEY) ??
        publicAddressFromAddressEnv(loadedEnv.effectiveEnv.VERIFIER_ADDRESS),
      blockers
    ),
    intentSubmitterAddress: requireAddress(
      "INTENT_SUBMITTER_PRIVATE_KEY public address",
      publicAddressFromPrivateKey(loadedEnv.effectiveEnv.INTENT_SUBMITTER_PRIVATE_KEY),
      blockers
    ),
    demoWalletAddress: requireAddress(
      "demo wallet public address",
      publicAddressFromAddressEnv(loadedEnv.effectiveEnv.DEMO_WALLET_ADDRESS) ??
        publicAddressFromAddressEnv(loadedEnv.effectiveEnv.DEMO_USER_ADDRESS),
      blockers
    )
  };

  const report: Record<string, unknown> = {
    schemaVersion: "sprint-3-giwa-preflight-v1",
    capturedAt: new Date().toISOString(),
    expectedChainId: EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
    loadedEnvFiles: loadedEnv.loadedEnvFiles,
    envReadiness,
    roleAddresses,
    rpcEndpoints: {
      standard: redactEndpointForReport(loadedEnv.effectiveEnv.GIWA_SEPOLIA_RPC_URL),
      flashblocks: redactEndpointForReport(loadedEnv.effectiveEnv.GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL)
    }
  };

  if (blockers.length > 0) {
    report.decision = {
      preflightOk: false,
      blockers
    };
    console.log(JSON.stringify(normalizeForJson(report), null, 2));
    process.exitCode = 1;
    return;
  }

  const standardRpcUrl = loadedEnv.effectiveEnv.GIWA_SEPOLIA_RPC_URL?.trim();
  const flashblocksRpcUrl = loadedEnv.effectiveEnv.GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL?.trim();
  if (standardRpcUrl === undefined || flashblocksRpcUrl === undefined) {
    throw new Error("unreachable missing RPC env state");
  }

  const standardClient = createRpcClient(standardRpcUrl);
  const flashblocksClient = createRpcClient(flashblocksRpcUrl);

  const [standardChain, flashblocksChain] = await Promise.all([
    probeChainId(standardClient),
    probeChainId(flashblocksClient)
  ]);
  report.network = {
    standardRpc: standardChain,
    flashblocksRpc: flashblocksChain,
    flashblocksEvidenceNamespace: "non-final"
  };

  if (standardChain.status !== "ok" || standardChain.chainId !== EXPECTED_GIWA_SEPOLIA_CHAIN_ID) {
    blockers.push("standard RPC chainId is not GIWA Sepolia 91342");
  }
  if (flashblocksChain.status !== "ok" || flashblocksChain.chainId !== EXPECTED_GIWA_SEPOLIA_CHAIN_ID) {
    blockers.push("Flashblocks RPC chainId is not GIWA Sepolia 91342");
  }

  if (blockers.length === 0) {
    const gasPriceWei = await standardClient.getGasPrice();
    const deployerAddress = roleAddresses.deployerAddress;
    const verifierAddress = roleAddresses.verifierAddress;
    const intentSubmitterAddress = roleAddresses.intentSubmitterAddress;
    const demoWalletAddress = roleAddresses.demoWalletAddress;

    if (
      deployerAddress === undefined ||
      verifierAddress === undefined ||
      intentSubmitterAddress === undefined ||
      demoWalletAddress === undefined
    ) {
      throw new Error("unreachable missing role address state");
    }

    const [tokenDeploymentGas, vaultDeploymentGas, railDeploymentGas] = await Promise.all([
      estimateDeploymentGas(standardClient, deployerAddress, "MockIntentToken", [
        "Mock Intent Token",
        "MIT"
      ]),
      estimateDeploymentGas(standardClient, deployerAddress, "MockVault"),
      estimateDeploymentGas(standardClient, deployerAddress, "IntentRail", [verifierAddress])
    ]);
    const totalDeploymentGas = tokenDeploymentGas + vaultDeploymentGas + railDeploymentGas;

    const balances = await Promise.all([
      readBalanceReport(
        standardClient,
        gasPriceWei,
        "deployer",
        deployerAddress,
        totalDeploymentGas,
        "MockIntentToken + MockVault + IntentRail deployments"
      ),
      readBalanceReport(
        standardClient,
        gasPriceWei,
        "verifier",
        verifierAddress,
        roleOperationGasEstimate,
        "Sprint 4 decision transaction reserve"
      ),
      readBalanceReport(
        standardClient,
        gasPriceWei,
        "intentSubmitter",
        intentSubmitterAddress,
        roleOperationGasEstimate,
        "IntentSubmitted transaction reserve"
      ),
      readBalanceReport(
        standardClient,
        gasPriceWei,
        "demoWallet",
        demoWalletAddress,
        roleOperationGasEstimate,
        "wallet-app approve/deposit reserve"
      )
    ]);

    for (const balance of balances) {
      if (!balance.ok) {
        blockers.push(`${balance.role} native balance is below preflight minimum`);
      }
    }

    report.gas = {
      gasPriceWei: gasPriceWei.toString(),
      deploymentGas: {
        mockIntentToken: tokenDeploymentGas.toString(),
        mockVault: vaultDeploymentGas.toString(),
        intentRail: railDeploymentGas.toString(),
        total: totalDeploymentGas.toString()
      },
      balanceSafetyMultiplier: balanceSafetyMultiplier.toString()
    };
    report.balances = balances;
  }

  report.explorerSmoke = {
    tx: await smokeExplorerTemplate(loadedEnv.effectiveEnv.GIWA_EXPLORER_TX_URL_TEMPLATE, "tx"),
    address: await smokeExplorerTemplate(loadedEnv.effectiveEnv.GIWA_EXPLORER_ADDRESS_URL_TEMPLATE, "address")
  };
  report.decision = {
    preflightOk: blockers.length === 0,
    blockers
  };

  console.log(JSON.stringify(normalizeForJson(report), null, 2));
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
}

await main();

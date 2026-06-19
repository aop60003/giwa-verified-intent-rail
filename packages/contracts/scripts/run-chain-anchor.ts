import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { artifacts } from "hardhat";
import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  keccak256,
  stringToBytes,
  type Abi,
  type Address,
  type Hex,
  type TransactionReceipt
} from "viem";

import { buildExplorerUrl, normalizeForEvidence, upsertDecodedLogSnapshots } from "./chain-anchor-helpers.js";
import { loadEnvFromFiles } from "./giwa-env-files.js";
import { EXPECTED_GIWA_SEPOLIA_CHAIN_ID, type EnvMap } from "./preflight-giwa-helpers.js";

declare const process: {
  env: EnvMap;
  exitCode?: number;
  cwd: () => string;
};

const requestTimeoutMs = 10_000;
const evidencePath = "docs/evidence/giwa-sepolia-chain-anchor.json";
const fixturePath = "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json";

function writeJson(path: string, value: unknown) {
  const slashPath = path.replace(/\\/gu, "/");
  const directory = slashPath.slice(0, slashPath.lastIndexOf("/"));
  mkdirSync(directory, { recursive: true });
  writeFileSync(slashPath, `${JSON.stringify(normalizeForEvidence(value), null, 2)}\n`);
}

function hashJson(value: unknown): Hex {
  return keccak256(stringToBytes(JSON.stringify(normalizeForEvidence(value))));
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

function requireHash(env: EnvMap, name: string, blockers: string[]): Hex | undefined {
  const value = env[name]?.trim();
  if (value === undefined || value.length === 0) {
    blockers.push(`${name} is missing`);
    return undefined;
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    blockers.push(`${name} is not a transaction hash`);
    return undefined;
  }

  return value as Hex;
}

async function getSuccessfulReceipt(
  publicClient: ReturnType<typeof createPublicClient>,
  hash: Hex,
  label: string,
  blockers: string[]
): Promise<TransactionReceipt | undefined> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    blockers.push(`${label} standard RPC receipt status is not success`);
    return undefined;
  }

  return receipt;
}

async function main() {
  const loadedEnv = loadEnvFromFiles(process.env, process.cwd());
  const env = loadedEnv.effectiveEnv;
  const blockers: string[] = [];
  const standardRpcUrl = env.GIWA_SEPOLIA_RPC_URL?.trim();
  const flashblocksRpcUrl = env.GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL?.trim();
  const txExplorerTemplate = env.GIWA_EXPLORER_TX_URL_TEMPLATE?.trim();
  const fullEvidencePath = `${process.cwd()}/../../${evidencePath}`;

  if (!existsSync(fullEvidencePath)) {
    blockers.push(`${evidencePath} is missing; run deploy:giwa first`);
  }
  if (standardRpcUrl === undefined || standardRpcUrl.length === 0) {
    blockers.push("GIWA_SEPOLIA_RPC_URL is missing");
  }
  if (txExplorerTemplate === undefined || txExplorerTemplate.length === 0) {
    blockers.push("GIWA_EXPLORER_TX_URL_TEMPLATE is missing");
  }

  const approveTxHash = requireHash(env, "GIWA_APPROVE_TX_HASH", blockers);
  const depositTxHash = requireHash(env, "GIWA_DEPOSIT_TX_HASH", blockers);

  if (
    blockers.length > 0 ||
    standardRpcUrl === undefined ||
    txExplorerTemplate === undefined ||
    approveTxHash === undefined ||
    depositTxHash === undefined
  ) {
    const priorEvidence = existsSync(fullEvidencePath)
      ? JSON.parse(readFileSync(fullEvidencePath, { encoding: "utf8" }) || "{}")
      : {};
    console.log(
      JSON.stringify(
        normalizeForEvidence({
          anchorOk: false,
          blockers,
          walletActions: priorEvidence.walletActions,
          evidencePath
        }),
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const evidence = JSON.parse(readFileSync(fullEvidencePath, { encoding: "utf8" }));
  const publicClient = createPublicClient({
    transport: http(standardRpcUrl, { timeout: requestTimeoutMs })
  });
  const chainId = await publicClient.getChainId();
  if (chainId !== EXPECTED_GIWA_SEPOLIA_CHAIN_ID) {
    blockers.push(`standard RPC chainId ${chainId.toString()} is not 91342`);
  }

  const approveReceipt = await getSuccessfulReceipt(publicClient, approveTxHash, "approve", blockers);
  const depositReceipt = await getSuccessfulReceipt(publicClient, depositTxHash, "deposit", blockers);
  if (blockers.length > 0 || approveReceipt === undefined || depositReceipt === undefined) {
    console.log(JSON.stringify(normalizeForEvidence({ anchorOk: false, blockers, evidencePath }), null, 2));
    process.exitCode = 1;
    return;
  }

  const [approveTx, depositTx] = await Promise.all([
    publicClient.getTransaction({ hash: approveTxHash }),
    publicClient.getTransaction({ hash: depositTxHash })
  ]);

  const tokenArtifact = await artifacts.readArtifact("MockIntentToken");
  const vaultArtifact = await artifacts.readArtifact("MockVault");
  const tokenAddress = getAddress(evidence.contracts.mockTokenAddress) as Address;
  const vaultAddress = getAddress(evidence.contracts.mockVaultAddress) as Address;
  const approval = decodeEventFromReceipt({
    abi: tokenArtifact.abi as Abi,
    eventName: "Approval",
    address: tokenAddress,
    receipt: approveReceipt
  });
  const transfer = decodeEventFromReceipt({
    abi: tokenArtifact.abi as Abi,
    eventName: "Transfer",
    address: tokenAddress,
    receipt: depositReceipt
  });
  const mockDeposit = decodeEventFromReceipt({
    abi: vaultArtifact.abi as Abi,
    eventName: "MockDeposit",
    address: vaultAddress,
    receipt: depositReceipt
  });

  if (approval === undefined) {
    blockers.push("Approval log is missing from approve receipt block");
  }
  if (transfer === undefined) {
    blockers.push("Transfer log is missing from deposit receipt block");
  }
  if (mockDeposit === undefined) {
    blockers.push("MockDeposit log is missing from deposit receipt block");
  }

  const flashblocksObservation =
    flashblocksRpcUrl === undefined || flashblocksRpcUrl.length === 0
      ? { observed: false, reason: "GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL missing" }
      : await (async () => {
          const flashblocksClient = createPublicClient({
            transport: http(flashblocksRpcUrl, { timeout: requestTimeoutMs })
          });
          try {
            const receipt = await flashblocksClient.getTransactionReceipt({ hash: depositTxHash });
            return {
              observed: true,
              namespace: "non-final",
              receiptStatus: receipt.status,
              blockNumber: receipt.blockNumber,
              blockHash: receipt.blockHash
            };
          } catch (error) {
            return {
              observed: false,
              namespace: "non-final",
              errorName: error instanceof Error ? error.name : "UnknownError"
            };
          }
        })();

  const decodedLogSnapshots = upsertDecodedLogSnapshots(evidence.decodedLogSnapshots ?? [], [
    {
      eventName: "Approval",
      contractAddress: approval?.address,
      logIndex: approval?.logIndex,
      topics: approval?.topics,
      args: approval?.args
    },
    {
      eventName: "Transfer",
      contractAddress: transfer?.address,
      logIndex: transfer?.logIndex,
      topics: transfer?.topics,
      args: transfer?.args
    },
    {
      eventName: "MockDeposit",
      contractAddress: mockDeposit?.address,
      logIndex: mockDeposit?.logIndex,
      topics: mockDeposit?.topics,
      args: mockDeposit?.args
    }
  ]);

  const finalEvidence = {
    ...evidence,
    status: blockers.length === 0 ? "standard_rpc_deposit_confirmed" : "failed",
    transactions: {
      ...evidence.transactions,
      approveTxHash,
      depositTxHash,
      decisionTxHash: {
        sprint4Output: true,
        value: null
      },
      approveTx: {
        rawEthGetTransaction: approveTx,
        rawEthGetTransactionReceipt: approveReceipt,
        receiptStatus: approveReceipt.status,
        blockNumber: approveReceipt.blockNumber,
        blockHash: approveReceipt.blockHash
      },
      depositTx: {
        rawEthGetTransaction: depositTx,
        rawEthGetTransactionReceipt: depositReceipt,
        receiptStatus: depositReceipt.status,
        blockNumber: depositReceipt.blockNumber,
        blockHash: depositReceipt.blockHash,
        depositTransactionSnapshotHash: hashJson(depositTx),
        depositReceiptSnapshotHash: hashJson(depositReceipt)
      }
    },
    confirmation: {
      standardRpcReceiptStatus: depositReceipt.status === "success" ? 1 : 0,
      depositBlockNumber: depositReceipt.blockNumber,
      depositBlockHash: depositReceipt.blockHash,
      flashblocksObserved: flashblocksObservation.observed,
      flashblocksObservationStatus: flashblocksObservation,
      flashblocksExcludedFromFinalConfirmation: true
    },
    decodedLogSnapshots,
    explorer: {
      ...evidence.explorer,
      transactions: {
        ...evidence.explorer.transactions,
        approve: buildExplorerUrl(txExplorerTemplate, approveTxHash),
        deposit: buildExplorerUrl(txExplorerTemplate, depositTxHash)
      }
    },
    sprint4Boundary: {
      decisionTxHashProducedInSprint3: false,
      decisionTxHashOwner: "Sprint 4 verifier and receipt engine"
    }
  };

  finalEvidence.decodedLogSnapshotHash = hashJson(finalEvidence.decodedLogSnapshots);
  if (blockers.length === 0) {
    writeJson(fullEvidencePath, finalEvidence);
    writeJson(`${process.cwd()}/../../${fixturePath}`, finalEvidence);
  }

  console.log(
    JSON.stringify(
      normalizeForEvidence({
        anchorOk: blockers.length === 0,
        blockers,
        evidencePath,
        fixturePath: blockers.length === 0 ? fixturePath : null,
        approveTxHash,
        depositTxHash,
        depositBlockNumber: depositReceipt.blockNumber,
        depositBlockHash: depositReceipt.blockHash,
        flashblocksEvidenceNamespace: "non-final",
        decisionTxHash: "Sprint 4 output"
      }),
      null,
      2
    )
  );

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
}

await main();

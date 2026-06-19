import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { artifacts } from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  getAddress,
  http,
  stringToHex,
  type Abi,
  type Address,
  type Hex,
  type TransactionReceipt
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { createReceiptEnvelope } from "../../../packages/protocol/src/index.js";
import { verifyDepositEvidence } from "../../../apps/web/src/lib/verifier/verifyDeposit.js";
import { buildExplorerUrl, normalizeForEvidence } from "./chain-anchor-helpers.js";
import { loadEnvFromFiles } from "./giwa-env-files.js";
import {
  EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
  normalizePrivateKey,
  type EnvMap
} from "./preflight-giwa-helpers.js";

declare const process: {
  env: EnvMap;
  exitCode?: number;
  cwd: () => string;
};

const requestTimeoutMs = 10_000;
const verifierVersion = "1";
const evidencePath = "docs/evidence/giwa-sepolia-chain-anchor.json";
const mvpEvidencePath = "docs/evidence/giwa-sepolia-mvp-evidence.json";
const fixturePath = "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json";
const deploymentPath = "apps/web/src/generated/deployment.json";

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

function writeJson(path: string, value: unknown) {
  const slashPath = path.replace(/\\/gu, "/");
  const directory = slashPath.slice(0, slashPath.lastIndexOf("/"));
  mkdirSync(directory, { recursive: true });
  writeFileSync(slashPath, `${JSON.stringify(normalizeForEvidence(value), null, 2)}\n`);
}

function existingDecisionTxHash(evidence: Record<string, any>): Hex | undefined {
  const value = evidence.transactions?.decisionTxHash;
  if (typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value)) {
    return value as Hex;
  }

  if (typeof value?.value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value.value)) {
    return value.value as Hex;
  }

  return undefined;
}

function decodeDecisionEvent({
  abi,
  address,
  receipt
}: {
  abi: Abi;
  address: Address;
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

      if (decoded.eventName === "IntentMatched" || decoded.eventName === "IntentFailed") {
        return {
          eventName: decoded.eventName,
          contractAddress: log.address,
          logIndex: log.logIndex,
          topics: log.topics,
          args: decoded.args
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

function statusCode(decision: string): Hex {
  return stringToHex(decision === "failed" ? "FAILED" : "MISMATCHED", { size: 32 });
}

function failureCode(reason: string | null): Hex {
  const allowed = new Set([
    "EXPIRED",
    "TARGET_MISMATCH",
    "SPENDER_MISMATCH",
    "ALLOWANCE_EXCEEDED",
    "TX_FAILED",
    "MISSING_REQUIRED_LOG"
  ]);
  const code = reason !== null && allowed.has(reason) ? reason : "MISSING_REQUIRED_LOG";

  return stringToHex(code, { size: 32 });
}

async function main() {
  const loadedEnv = loadEnvFromFiles(process.env, process.cwd());
  const env = loadedEnv.effectiveEnv;
  const blockers: string[] = [];
  const standardRpcUrl = env.GIWA_SEPOLIA_RPC_URL?.trim();
  const txExplorerTemplate = env.GIWA_EXPLORER_TX_URL_TEMPLATE?.trim();
  const verifierPrivateKey = normalizePrivateKey(env.VERIFIER_PRIVATE_KEY);
  const fullEvidencePath = `${process.cwd()}/../../${evidencePath}`;

  if (standardRpcUrl === undefined || standardRpcUrl.length === 0) {
    blockers.push("GIWA_SEPOLIA_RPC_URL is missing");
  }
  if (txExplorerTemplate === undefined || txExplorerTemplate.length === 0) {
    blockers.push("GIWA_EXPLORER_TX_URL_TEMPLATE is missing");
  }
  if (verifierPrivateKey === undefined) {
    blockers.push("VERIFIER_PRIVATE_KEY is missing or invalid");
  }
  if (!existsSync(fullEvidencePath)) {
    blockers.push(`${evidencePath} is missing; run anchor:giwa first`);
  }

  if (
    blockers.length > 0 ||
    standardRpcUrl === undefined ||
    txExplorerTemplate === undefined ||
    verifierPrivateKey === undefined
  ) {
    console.log(
      JSON.stringify(
        normalizeForEvidence({
          verifyOk: false,
          blockers,
          loadedEnvFiles: loadedEnv.loadedEnvFiles,
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
  const verifier = privateKeyToAccount(verifierPrivateKey);
  const publicClient = createPublicClient({
    chain: giwaSepolia,
    transport: http(standardRpcUrl, { timeout: requestTimeoutMs })
  });
  const walletClient = createWalletClient({
    account: verifier,
    chain: giwaSepolia,
    transport: http(standardRpcUrl, { timeout: requestTimeoutMs })
  });
  const chainId = await publicClient.getChainId();
  if (chainId !== EXPECTED_GIWA_SEPOLIA_CHAIN_ID) {
    console.log(
      JSON.stringify(
        normalizeForEvidence({
          verifyOk: false,
          blockers: [`standard RPC chainId ${chainId.toString()} is not 91342`],
          evidencePath
        }),
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const verifierAddress = getAddress(verifier.address);
  if (getAddress(evidence.roles.verifierAddress) !== verifierAddress) {
    console.log(
      JSON.stringify(
        normalizeForEvidence({
          verifyOk: false,
          blockers: ["VERIFIER_PRIVATE_KEY public address does not match evidence verifierAddress"],
          verifierAddress,
          evidenceVerifierAddress: evidence.roles.verifierAddress,
          evidencePath
        }),
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const railArtifact = await artifacts.readArtifact("IntentRail");
  const railAddress = getAddress(evidence.contracts.intentRailAddress) as Address;
  const priorDecisionTxHash = existingDecisionTxHash(evidence);
  if (priorDecisionTxHash !== undefined) {
    const priorReceipt = await publicClient.getTransactionReceipt({ hash: priorDecisionTxHash });
    const priorEvent = decodeDecisionEvent({
      abi: railArtifact.abi as Abi,
      address: railAddress,
      receipt: priorReceipt
    });

    console.log(
      JSON.stringify(
        normalizeForEvidence({
          verifyOk: priorReceipt.status === "success" && priorEvent !== undefined,
          idempotent: true,
          blockers: priorReceipt.status === "success" && priorEvent !== undefined ? [] : ["existing decision tx is not valid"],
          decisionTxHash: priorDecisionTxHash,
          decisionReceiptStatus: priorReceipt.status,
          decisionEvent: priorEvent?.eventName,
          evidencePath,
          mvpEvidencePath,
          fixturePath
        }),
        null,
        2
      )
    );
    process.exitCode = priorReceipt.status === "success" && priorEvent !== undefined ? 0 : 1;
    return;
  }

  const [headBlockNumber, intentSubmittedTx, intentSubmittedReceipt] = await Promise.all([
    publicClient.getBlockNumber(),
    publicClient.getTransaction({ hash: evidence.transactions.intentSubmittedTxHash }),
    publicClient.getTransactionReceipt({ hash: evidence.transactions.intentSubmittedTxHash })
  ]);
  const depositBlockNumber = BigInt(evidence.transactions.depositTx.blockNumber);
  const confirmationDepth = headBlockNumber >= depositBlockNumber ? Number(headBlockNumber - depositBlockNumber) : 0;
  const issuedAt = Math.floor(Date.now() / 1000);
  const augmentedEvidence = {
    ...evidence,
    transactions: {
      ...evidence.transactions,
      intentSubmittedTx: {
        rawEthGetTransaction: intentSubmittedTx,
        rawEthGetTransactionReceipt: intentSubmittedReceipt,
        receiptStatus: intentSubmittedReceipt.status,
        blockNumber: intentSubmittedReceipt.blockNumber,
        blockHash: intentSubmittedReceipt.blockHash
      }
    },
    confirmation: {
      ...evidence.confirmation,
      confirmationDepth,
      headBlockNumberAtVerification: Number(headBlockNumber)
    }
  };
  const result = await verifyDepositEvidence(augmentedEvidence, {
    officialCampaignSigner: evidence.roles.campaignSignerAddress,
    configuredIntentSubmitter: evidence.roles.intentSubmitterAddress,
    confirmationDepth,
    headBlockNumberAtVerification: Number(headBlockNumber),
    issuedAt,
    verifierVersion
  });

  let decisionTxHash: Hex;
  if (result.decision === "matched" && result.receipt !== undefined) {
    decisionTxHash = await walletClient.writeContract({
      account: verifier,
      chain: giwaSepolia,
      address: railAddress,
      abi: railArtifact.abi as Abi,
      functionName: "emitMatched",
      args: [
        result.receipt.payload.intentHash,
        result.receipt.receiptHash,
        result.receipt.payload.wallet,
        result.receipt.payload.approveTxHash,
        result.receipt.payload.depositTxHash,
        BigInt(result.receipt.payload.depositBlockNumber),
        result.receipt.payload.depositBlockHash,
        BigInt(result.receipt.payload.allowanceUsedBaseUnits),
        BigInt(result.receipt.payload.issuedAt)
      ]
    });
  } else {
    if (result.decision === "timeout") {
      console.log(
        JSON.stringify(
          normalizeForEvidence({
            verifyOk: false,
            blockers: ["verification timed out; no IntentFailed emitted for unconfirmed evidence"],
            decision: result.decision,
            failureReason: result.failureReason,
            evidencePath
          }),
          null,
          2
        )
      );
      process.exitCode = 1;
      return;
    }

    decisionTxHash = await walletClient.writeContract({
      account: verifier,
      chain: giwaSepolia,
      address: railAddress,
      abi: railArtifact.abi as Abi,
      functionName: "emitFailed",
      args: [
        result.verifierInputPayload.intentHash,
        evidence.manifest.manifest.wallet,
        evidence.transactions.depositTxHash,
        BigInt(evidence.transactions.depositTx.blockNumber),
        evidence.transactions.depositTx.blockHash,
        statusCode(result.decision),
        failureCode(result.failureReason),
        BigInt(issuedAt)
      ]
    });
  }

  const [decisionReceipt, decisionTx] = await Promise.all([
    publicClient.waitForTransactionReceipt({ hash: decisionTxHash }),
    publicClient.getTransaction({ hash: decisionTxHash })
  ]);
  const decisionEvent = decodeDecisionEvent({
    abi: railArtifact.abi as Abi,
    address: railAddress,
    receipt: decisionReceipt
  });
  const finalBlockers = [];
  if (decisionReceipt.status !== "success") {
    finalBlockers.push("decision standard RPC receipt status is not success");
  }
  if (decisionEvent === undefined) {
    finalBlockers.push("decision event log is missing");
  }

  const receiptEnvelope =
    result.decision === "matched" && result.receipt !== undefined
      ? createReceiptEnvelope(result.receipt.payload, {
          decisionTxHash,
          decisionBlockNumber: Number(decisionReceipt.blockNumber),
          decisionBlockHash: decisionReceipt.blockHash,
          explorerUrl: buildExplorerUrl(txExplorerTemplate, decisionTxHash),
          displayStatus: "Receipt ready",
          displayCopy: "Block-confirmed GIWA Sepolia testnet vault deposit matched the signed manifest."
        })
      : undefined;
  const finalEvidence = {
    ...augmentedEvidence,
    schemaVersion: "sprint-4-giwa-mvp-evidence-draft-v1",
    sourceChainAnchorSchemaVersion: evidence.schemaVersion,
    status: result.decision,
    draftUntilSprint7: true,
    transactions: {
      ...augmentedEvidence.transactions,
      decisionTxHash,
      decisionTx: {
        rawEthGetTransaction: decisionTx,
        rawEthGetTransactionReceipt: decisionReceipt,
        receiptStatus: decisionReceipt.status,
        blockNumber: decisionReceipt.blockNumber,
        blockHash: decisionReceipt.blockHash
      }
    },
    confirmation: {
      ...augmentedEvidence.confirmation,
      standardRpcDecisionReceiptStatus: decisionReceipt.status === "success" ? 1 : 0,
      decisionBlockNumber: decisionReceipt.blockNumber,
      decisionBlockHash: decisionReceipt.blockHash,
      flashblocksExcludedFromFinalConfirmation: true
    },
    verifier: {
      verifierVersion,
      canonicalVerifierInputPayload: result.canonicalVerifierInputPayload,
      canonicalVerifierInputPayloadBytesHex: result.canonicalVerifierInputPayloadBytesHex,
      verifierInputHash: result.verifierInputHash,
      matchedFields: result.matchedFields,
      decision: result.decision,
      failureReason: result.failureReason,
      failureMatchedFields: result.failureMatchedFields
    },
    receipt:
      receiptEnvelope === undefined || result.receipt === undefined
        ? null
        : {
            payload: receiptEnvelope.payload,
            canonicalReceiptPayload: result.receipt.canonicalReceiptPayload,
            canonicalReceiptPayloadBytesHex: result.receipt.canonicalReceiptPayloadBytesHex,
            receiptHash: receiptEnvelope.receiptHash,
            envelope: receiptEnvelope
          },
    decisionEvent,
    explorer: {
      ...augmentedEvidence.explorer,
      transactions: {
        ...augmentedEvidence.explorer.transactions,
        decision: buildExplorerUrl(txExplorerTemplate, decisionTxHash)
      }
    },
    sprint4Boundary: {
      decisionTxHashProducedInSprint3: false,
      decisionTxHashProducedInSprint4: true,
      decisionTxHashOwner: "Sprint 4 verifier and receipt engine"
    }
  };

  if (finalBlockers.length === 0) {
    writeJson(fullEvidencePath, finalEvidence);
    writeJson(`${process.cwd()}/../../${mvpEvidencePath}`, finalEvidence);
    writeJson(`${process.cwd()}/../../${fixturePath}`, finalEvidence);
    writeJson(`${process.cwd()}/../../${deploymentPath}`, {
      chainId: EXPECTED_GIWA_SEPOLIA_CHAIN_ID,
      mockTokenAddress: evidence.contracts.mockTokenAddress,
      mockVaultAddress: evidence.contracts.mockVaultAddress,
      intentRailAddress: evidence.contracts.intentRailAddress,
      intentSubmittedTxHash: evidence.transactions.intentSubmittedTxHash,
      decisionTxHash
    });
  }

  console.log(
    JSON.stringify(
      normalizeForEvidence({
        verifyOk: finalBlockers.length === 0 && result.decision === "matched",
        blockers: finalBlockers,
        decision: result.decision,
        failureReason: result.failureReason,
        verifierInputHash: result.verifierInputHash,
        receiptHash: receiptEnvelope?.receiptHash ?? null,
        decisionTxHash,
        decisionReceiptStatus: decisionReceipt.status,
        decisionBlockNumber: decisionReceipt.blockNumber,
        decisionBlockHash: decisionReceipt.blockHash,
        decisionEvent: decisionEvent?.eventName,
        evidencePath,
        mvpEvidencePath,
        fixturePath
      }),
      null,
      2
    )
  );

  if (finalBlockers.length > 0 || result.decision !== "matched") {
    process.exitCode = 1;
  }
}

await main();

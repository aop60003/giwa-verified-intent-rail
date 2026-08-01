import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { backfillPublicEvidence } from "../src/lib/live/publicEvidenceBackfill.ts";
import { createSqliteLiveStore } from "../src/lib/live/liveStore.ts";
import { createStandardRpcReceiptClient } from "../src/lib/verifier/standardRpcReceiptClient.ts";

const deploymentPath = fileURLToPath(
  new URL("../src/generated/deployment.json", import.meta.url)
);

function emptyCounts() {
  return {
    candidates: 0,
    saved: 0,
    alreadyPresent: 0,
    skippedIntegrityMismatch: 0,
    failedBoundedError: 0
  };
}

function explicitDbPath(argv) {
  const index = argv.indexOf("--db");
  if (index < 0 || index + 1 >= argv.length || argv[index + 1].trim() === "") {
    throw new Error("explicit_db_path_required");
  }
  if (argv.length !== 2) throw new Error("unsupported_argument");
  return resolve(argv[index + 1]);
}

function standardRpcUrl(env) {
  const value = env.GIWA_SEPOLIA_RPC_URL?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error("standard_rpc_url_required");
  }
  const parsed = new URL(value);
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    throw new Error("standard_rpc_url_invalid");
  }
  return value;
}

function publicVerifyingContract() {
  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  if (
    deployment.chainId !== 91342 ||
    typeof deployment.intentRailAddress !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/u.test(deployment.intentRailAddress)
  ) {
    throw new Error("public_deployment_invalid");
  }
  return deployment.intentRailAddress.toLowerCase();
}

function markProcessFailed() {
  process.exitCode = 1;
}

export function closeBackfillStore(
  store,
  counts,
  markFailed = markProcessFailed
) {
  if (store === undefined) return;
  try {
    store.close();
  } catch {
    counts.failedBoundedError += 1;
    markFailed();
  }
}

export async function runPublicEvidenceBackfillCli({
  argv = process.argv.slice(2),
  env = process.env
} = {}) {
  const counts = emptyCounts();
  let store;
  try {
    const dbPath = explicitDbPath(argv);
    const rpcUrl = standardRpcUrl(env);
    store = createSqliteLiveStore(dbPath);
    const result = await backfillPublicEvidence({
      store,
      receiptClient: createStandardRpcReceiptClient({
        chainId: 91342,
        rpcUrl
      }),
      verifyingContract: publicVerifyingContract(),
      now: () => new Date().toISOString()
    });
    Object.assign(counts, result);
  } catch {
    counts.failedBoundedError += 1;
    process.exitCode = 1;
  } finally {
    closeBackfillStore(store, counts);
  }

  console.log(JSON.stringify(counts));
  return counts;
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  pathToFileURL(resolve(invokedPath)).href === import.meta.url
) {
  await runPublicEvidenceBackfillCli();
}

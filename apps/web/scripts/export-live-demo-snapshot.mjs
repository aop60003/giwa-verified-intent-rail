import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildLiveDemoSnapshot } from "../src/lib/live/liveDemoSnapshot.ts";
import { createSqliteLiveStore } from "../src/lib/live/liveStore.ts";
import { assertPublicArtifactSafe } from "../src/lib/verifier/publicArtifactGuard.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../../..");
const dbPath = resolve(workspaceRoot, process.env.GIWA_LIVE_DB_PATH ?? "apps/web/.data/live-mvp-sprint12.sqlite");
const liveUrl = process.env.GIWA_LIVE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "4177"}/live`;
const docsOutputPath = resolve(workspaceRoot, "docs/evidence/live-demo-sprint12-snapshot.json");
const publicOutputPath = resolve(__dirname, "../public/live-demo-snapshot.json");

if (!existsSync(dbPath)) {
  throw new Error(`live DB not found: ${dbPath}`);
}

let store;
try {
  store = createSqliteLiveStore(dbPath);
  const matchedRuns = store
    .listRuns()
    .filter((run) => run.status === "matched")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const run = matchedRuns[0];
  if (run === undefined) {
    throw new Error("matched live run not found");
  }

  const submittedTx = store.getSubmittedTx(run.runId) ?? null;
  const decision = store.getDecisionByIntentHash(run.intentHash) ?? null;
  const receipt = decision?.receiptHash === null || decision?.receiptHash === undefined ? null : store.getReceipt(decision.receiptHash) ?? null;
  const verifierInput =
    decision?.verifierInputHash === undefined ? null : store.getVerifierInput(decision.verifierInputHash) ?? null;
  const snapshot = buildLiveDemoSnapshot({
    capturedAt: new Date().toISOString(),
    liveUrl,
    run,
    submittedTx,
    decision,
    receipt,
    verifierInput
  });
  assertPublicArtifactSafe(snapshot);

  mkdirSync(dirname(docsOutputPath), { recursive: true });
  mkdirSync(dirname(publicOutputPath), { recursive: true });
  writeFileSync(docsOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(publicOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        source: snapshot.source,
        runId: snapshot.run.runId,
        receiptHash: snapshot.receipt.receiptHash,
        depositTxHash: snapshot.transactions.depositTxHash,
        liveUrl: snapshot.liveUrl,
        docsOutputPath,
        publicOutputPath
      },
      null,
      2
    )
  );
} finally {
  store?.close();
}

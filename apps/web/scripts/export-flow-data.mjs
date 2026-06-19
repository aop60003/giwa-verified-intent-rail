import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildGuidedFlowModel } from "../src/lib/flow/guidedFlow.ts";
import { buildPartnerProofConsoleModel } from "../src/lib/partner/partnerSummary.ts";
import { assertPublicArtifactSafe } from "../src/lib/verifier/publicArtifactGuard.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../../..");
const evidencePath = resolve(workspaceRoot, "docs/evidence/giwa-sepolia-mvp-evidence.json");
const deploymentPath = resolve(__dirname, "../src/generated/deployment.json");
const outputPath = resolve(__dirname, "../public/flow-data.json");
const partnerSnapshotPath = resolve(__dirname, "../public/partner-snapshot.json");

export function exportFlowData() {
  const evidence = JSON.parse(readFileSync(evidencePath, { encoding: "utf8" }));
  const deployment = JSON.parse(readFileSync(deploymentPath, { encoding: "utf8" }));
  const model = buildGuidedFlowModel(evidence, deployment);
  const partnerConsole = buildPartnerProofConsoleModel(model, evidence, {
    evidencePath: "docs/evidence/giwa-sepolia-mvp-evidence.json"
  });
  const publicModel = {
    ...model,
    partnerConsole
  };
  assertPublicArtifactSafe(publicModel);
  assertPublicArtifactSafe(partnerConsole);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(publicModel, null, 2)}\n`);
  writeFileSync(partnerSnapshotPath, `${JSON.stringify(partnerConsole, null, 2)}\n`);

  return {
    outputPath,
    partnerSnapshotPath,
    receiptHash: model.receipt.receiptHash,
    decisionTxHash: model.receipt.decisionTxHash,
    matchedTxRate: partnerConsole.summary.matchedTxRate
  };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = exportFlowData();
  console.log(JSON.stringify(result, null, 2));
}

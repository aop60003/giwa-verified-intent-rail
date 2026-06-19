import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { stableJson } from "../src/lib/provenance/artifactManifest.ts";
import { buildAndWriteLocalProvenanceVerification } from "../src/lib/provenance/provenanceVerifier.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../../..");
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const generatedAt = new Date().toISOString();

const result = buildAndWriteLocalProvenanceVerification({
  workspaceRoot,
  generatedAt,
  checkOnly
});

console.log(
  stableJson({
    authority: "local-advisory",
    reportPath: "docs/evidence/local-provenance-report.json",
    reportSha256: result.reportSha256,
    verificationPath: "docs/evidence/local-provenance-verification.json",
    verificationDecision: result.verification.verificationDecision,
    manifestBindingDecision: result.verification.manifestBinding.decision,
    driftDecision: result.verification.drift.decision,
    failureCount: result.verification.failures.length,
    releaseGrade: false,
    canUnblockStaging: false,
    checkOnly
  })
);

if (result.verification.verificationDecision !== "pass") {
  process.exitCode = 1;
}

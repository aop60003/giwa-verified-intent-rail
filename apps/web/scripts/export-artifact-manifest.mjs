import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLocalArtifactManifest,
  stableJson,
  validateLocalArtifactManifest
} from "../src/lib/provenance/artifactManifest.ts";
import {
  buildCommandEvidenceReport,
  buildEnhancedLocalProvenanceReport
} from "../src/lib/provenance/provenanceReport.ts";
import {
  readScanTargetContent,
  scanPublicArtifactText,
  selectPublicArtifactScanEntries,
  summarizePublicArtifactScans
} from "../src/lib/provenance/publicArtifactScanner.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../../..");
const manifestPath = resolve(workspaceRoot, "docs/evidence/local-artifact-manifest.json");
const provenancePath = resolve(workspaceRoot, "docs/evidence/local-provenance-report.json");
const provenanceSidecarPath = resolve(workspaceRoot, "docs/evidence/local-provenance-report.json.sha256");
const commandEvidencePath = resolve(workspaceRoot, "docs/evidence/local-command-evidence-report.json");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const manifestOnly = args.has("--manifest");
const provenanceOnly = args.has("--provenance");
const scanOnly = args.has("--scan");
const generatedAt = new Date().toISOString();

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stableJson(value));
}

function scanManifest(manifest) {
  const publicEntries = selectPublicArtifactScanEntries(manifest);
  const results = publicEntries.map((entry) =>
    scanPublicArtifactText({
      path: entry.path,
      content: readScanTargetContent(workspaceRoot, entry)
    })
  );
  const summary = summarizePublicArtifactScans(results);
  return { results, summary };
}

function loadExistingManifest() {
  const manifestJson = readFileSync(manifestPath, { encoding: "utf8" });
  return { manifest: JSON.parse(manifestJson), manifestJson };
}

const loaded = provenanceOnly ? loadExistingManifest() : null;
const manifest = loaded?.manifest ?? buildLocalArtifactManifest(workspaceRoot, generatedAt);
const manifestJson = loaded?.manifestJson ?? stableJson(manifest);
validateLocalArtifactManifest(manifest);
const scan = scanManifest(manifest);
const commandEvidenceReport = buildCommandEvidenceReport({ generatedAt });
const { report, reportSha256, sidecar } = buildEnhancedLocalProvenanceReport({
  manifest,
  manifestJson,
  generatedAt,
  scanResults: scan.results,
  commandEvidenceReport
});

if (scan.summary.decision === "blocked") {
  console.error(
    stableJson({
      authority: "local-advisory",
      scanner: scan.summary.scanner,
      decision: scan.summary.decision,
      blockedCount: scan.summary.blockedCount,
      findings: scan.results.flatMap((result) => result.findings)
    })
  );
  process.exitCode = 1;
} else {
  if (!dryRun && !scanOnly) {
    if (!provenanceOnly) writeJson(manifestPath, manifest);
    if (!manifestOnly) {
      writeJson(provenancePath, report);
      writeJson(commandEvidencePath, commandEvidenceReport);
      writeFileSync(provenanceSidecarPath, sidecar.content);
    }
  }

  console.log(
    stableJson({
      authority: "local-advisory",
      manifestPath: "docs/evidence/local-artifact-manifest.json",
      provenancePath: "docs/evidence/local-provenance-report.json",
      provenanceSidecarPath: "docs/evidence/local-provenance-report.json.sha256",
      commandEvidencePath: "docs/evidence/local-command-evidence-report.json",
      manifestHash: report.manifestBinding.artifactManifestSha256,
      provenanceReportHash: reportSha256,
      publicArtifactCount: manifest.artifactGroups.publicArtifacts.length,
      publicEvidenceCount: manifest.artifactGroups.publicEvidence.length,
      implementationDocCount: manifest.artifactGroups.implementationDocs.length,
      packageMetadataCount: manifest.artifactGroups.packageMetadata.length,
      buildTreeSha256: report.manifestBinding.buildTreeSha256,
      scanDecision: scan.summary.decision,
      dryRun
    })
  );
}

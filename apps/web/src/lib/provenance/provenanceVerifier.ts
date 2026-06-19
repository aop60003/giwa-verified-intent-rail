import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import {
  buildLocalArtifactManifest,
  type ArtifactEntry,
  type LocalArtifactManifest,
  sha256Hex,
  stableJson,
  validateLocalArtifactManifest
} from "./artifactManifest.ts";
import {
  buildCommandEvidenceReport,
  buildEnhancedLocalProvenanceReport,
  LOCAL_ARTIFACT_MANIFEST_PATH,
  LOCAL_PROVENANCE_REPORT_PATH,
  LOCAL_PROVENANCE_REPORT_SIDECAR_PATH,
  LOCAL_PROVENANCE_VERIFICATION_PATH,
  type EnhancedLocalProvenanceReport,
  type KnownProvenanceBlocker
} from "./provenanceReport.ts";
import {
  readScanTargetContent,
  scanPublicArtifactText,
  selectPublicArtifactScanEntries
} from "./publicArtifactScanner.ts";

export type ProvenanceFailure = {
  code:
    | "PROV_MANIFEST_HASH_MISMATCH"
    | "PROV_MANIFEST_BYTE_MISMATCH"
    | "PROV_BUILD_TREE_MISMATCH"
    | "PROV_PUBLIC_ARTIFACT_DRIFT"
    | "PROV_PUBLIC_ARTIFACT_MISSING"
    | "PROV_EQUIVALENCE_GROUP_FAILED"
    | "PROV_REPORT_SIDECAR_MISMATCH"
    | "PROV_REPORT_ONLY_DRIFT"
    | "PROV_NON_TERMINAL_DECISION"
    | "PROV_PROTECTED_FIELD_POPULATED"
    | "PROV_LOCAL_AUTHORITY_CONFUSION"
    | "PROV_OUTPUT_SELF_INCLUDED"
    | "PROV_SCAN_FINDING"
    | "PROV_SCAN_VALUE_OUTPUT";
  path?: string;
  detail?: string;
};

export type VerificationDecision = "pass" | "blocked";

export type ProvenanceCheckResult = {
  decision: VerificationDecision;
  failures: ProvenanceFailure[];
};

export type LocalProvenanceVerification = {
  schemaVersion: "1";
  verificationKind: "local-provenance-verification";
  authority: "local-advisory";
  generatedAt: string;
  manifestPath: typeof LOCAL_ARTIFACT_MANIFEST_PATH;
  reportPath: typeof LOCAL_PROVENANCE_REPORT_PATH;
  verificationDecision: VerificationDecision;
  manifestBinding: ProvenanceCheckResult;
  drift: ProvenanceCheckResult;
  reportHashPolicy: "external-only";
  reportSha256: string;
  sidecar: {
    path: typeof LOCAL_PROVENANCE_REPORT_SIDECAR_PATH;
    decision: VerificationDecision;
  };
  excludedBoundary: {
    envFilesRead: false;
    privateDatabasesRead: false;
    excludedPaths: [".env", ".env.local", "apps/web/.data", "node_modules"];
  };
  knownBlockers: KnownProvenanceBlocker[];
  releaseGrade: false;
  canUnblockStaging: false;
  failures: ProvenanceFailure[];
};

const TEXT_ENCODER = new TextEncoder();
const PROTECTED_FIELDS = ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"] as const;
const GENERATED_OUTPUT_PATHS = new Set([
  "docs/evidence/local-artifact-manifest.json",
  "docs/evidence/local-command-evidence-report.json",
  "docs/evidence/local-provenance-report.json",
  "docs/evidence/local-provenance-report.json.sha256",
  "docs/evidence/local-provenance-verification.json"
]);

function decisionFor(failures: ProvenanceFailure[]): VerificationDecision {
  return failures.length === 0 ? "pass" : "blocked";
}

function allEntries(manifest: LocalArtifactManifest): ArtifactEntry[] {
  return [
    ...manifest.artifactGroups.packageMetadata,
    ...manifest.artifactGroups.publicArtifacts,
    ...manifest.artifactGroups.publicEvidence,
    ...manifest.artifactGroups.implementationDocs
  ].sort((left, right) => left.path.localeCompare(right.path, "en"));
}

function recomputeBuildTreeSha256(manifest: LocalArtifactManifest): string {
  return sha256Hex(allEntries(manifest).map((entry) => `${entry.sha256}  ${entry.path}\n`).join(""));
}

function entryMap(manifest: LocalArtifactManifest): Map<string, ArtifactEntry> {
  return new Map(allEntries(manifest).map((entry) => [entry.path, entry]));
}

function containsNonTerminalDecision(value: unknown): boolean {
  if (value === "pass-or-blocked") return true;
  if (Array.isArray(value)) return value.some(containsNonTerminalDecision);
  if (value !== null && typeof value === "object") return Object.values(value).some(containsNonTerminalDecision);
  return false;
}

function protectedFieldsPopulated(report: unknown): ProvenanceFailure[] {
  if (report === null || typeof report !== "object") return [];
  return PROTECTED_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(report, field)).map((field) => ({
    code: "PROV_PROTECTED_FIELD_POPULATED" as const,
    detail: field
  }));
}

function outputSelfInclusionFailures(manifest: LocalArtifactManifest): ProvenanceFailure[] {
  return allEntries(manifest)
    .filter((entry) => GENERATED_OUTPUT_PATHS.has(entry.path))
    .map((entry) => ({
      code: "PROV_OUTPUT_SELF_INCLUDED" as const,
      path: entry.path
    }));
}

function authorityConfusionFailures(report: EnhancedLocalProvenanceReport): ProvenanceFailure[] {
  const failures: ProvenanceFailure[] = [];
  if (report.authority !== "local-advisory") failures.push({ code: "PROV_LOCAL_AUTHORITY_CONFUSION", detail: "authority" });
  if (report.releaseGrade !== false) failures.push({ code: "PROV_LOCAL_AUTHORITY_CONFUSION", detail: "releaseGrade" });
  if (report.canUnblockStaging !== false) failures.push({ code: "PROV_LOCAL_AUTHORITY_CONFUSION", detail: "canUnblockStaging" });
  return failures;
}

function scanFailures(report: EnhancedLocalProvenanceReport): ProvenanceFailure[] {
  const failures: ProvenanceFailure[] = [];
  if (report.scanBinding.decision === "blocked") failures.push({ code: "PROV_SCAN_FINDING" });
  if (
    report.scanBinding.valuePrinted !== false ||
    report.scanBinding.findings.some((finding) => finding.valuePrinted !== false)
  ) {
    failures.push({ code: "PROV_SCAN_VALUE_OUTPUT" });
  }
  return failures;
}

export function verifyLocalProvenanceReportBinding(input: {
  manifest: LocalArtifactManifest;
  manifestJson: string;
  report: EnhancedLocalProvenanceReport;
}): ProvenanceCheckResult {
  const manifestBytes = TEXT_ENCODER.encode(input.manifestJson).byteLength;
  const manifestSha256 = sha256Hex(input.manifestJson);
  const failures: ProvenanceFailure[] = [];

  if (
    input.report.manifestBinding.artifactManifestSha256 !== manifestSha256 ||
    input.report.manifestBinding.artifactManifestSha256 !== input.report.manifestBinding.artifactManifestSha256.toLowerCase()
  ) {
    failures.push({ code: "PROV_MANIFEST_HASH_MISMATCH" });
  }
  if (input.report.manifestBinding.artifactManifestBytes !== manifestBytes) {
    failures.push({ code: "PROV_MANIFEST_BYTE_MISMATCH" });
  }
  if (
    input.report.manifestBinding.buildTreeSha256 !== input.manifest.buildTreeSha256 ||
    input.report.manifestBinding.buildTreeSha256 !== recomputeBuildTreeSha256(input.manifest)
  ) {
    failures.push({ code: "PROV_BUILD_TREE_MISMATCH" });
  }
  if (containsNonTerminalDecision(input.report)) {
    failures.push({ code: "PROV_NON_TERMINAL_DECISION" });
  }
  failures.push(...outputSelfInclusionFailures(input.manifest));
  failures.push(...authorityConfusionFailures(input.report));
  failures.push(...protectedFieldsPopulated(input.report));

  return {
    decision: decisionFor(failures),
    failures
  };
}

export function compareManifestForDrift(input: {
  checked: LocalArtifactManifest;
  current: LocalArtifactManifest;
}): ProvenanceCheckResult {
  const checkedEntries = entryMap(input.checked);
  const currentEntries = entryMap(input.current);
  const failures: ProvenanceFailure[] = [];

  for (const [path, checkedEntry] of checkedEntries) {
    const currentEntry = currentEntries.get(path);
    if (currentEntry === undefined) {
      failures.push({ code: "PROV_PUBLIC_ARTIFACT_MISSING", path });
      continue;
    }
    if (currentEntry.sha256 !== checkedEntry.sha256 || currentEntry.bytes !== checkedEntry.bytes) {
      failures.push({ code: "PROV_PUBLIC_ARTIFACT_DRIFT", path });
    }
  }

  for (const [path] of currentEntries) {
    if (!checkedEntries.has(path)) {
      failures.push({ code: "PROV_PUBLIC_ARTIFACT_DRIFT", path, detail: "current-only" });
    }
  }

  for (const group of input.current.equivalenceGroups) {
    if (group.decision !== "pass") failures.push({ code: "PROV_EQUIVALENCE_GROUP_FAILED", detail: group.name });
  }

  return {
    decision: decisionFor(failures),
    failures
  };
}

export function compareReportForDrift(input: {
  checkedReportJson: string | null;
  recomputedReport: EnhancedLocalProvenanceReport;
}): ProvenanceCheckResult {
  if (input.checkedReportJson === null) return { decision: "pass", failures: [] };
  const recomputedJson = stableJson(input.recomputedReport);
  const failures: ProvenanceFailure[] =
    input.checkedReportJson === recomputedJson ? [] : [{ code: "PROV_REPORT_ONLY_DRIFT", path: LOCAL_PROVENANCE_REPORT_PATH }];
  return {
    decision: decisionFor(failures),
    failures
  };
}

export function buildLocalProvenanceVerification(input: {
  manifest: LocalArtifactManifest;
  currentManifest: LocalArtifactManifest;
  manifestJson: string;
  report: EnhancedLocalProvenanceReport;
  reportSha256: string;
  sidecarContent?: string;
  generatedAt: string;
}): LocalProvenanceVerification {
  const manifestBinding = verifyLocalProvenanceReportBinding({
    manifest: input.manifest,
    manifestJson: input.manifestJson,
    report: input.report
  });
  const drift = compareManifestForDrift({ checked: input.manifest, current: input.currentManifest });
  const expectedSidecar = `${input.reportSha256}  ${LOCAL_PROVENANCE_REPORT_PATH}\n`;
  const sidecarDecision = input.sidecarContent === undefined || input.sidecarContent === expectedSidecar ? "pass" : "blocked";
  const sidecarFailures: ProvenanceFailure[] =
    sidecarDecision === "pass" ? [] : [{ code: "PROV_REPORT_SIDECAR_MISMATCH", path: LOCAL_PROVENANCE_REPORT_SIDECAR_PATH }];
  const failures = [...manifestBinding.failures, ...drift.failures, ...sidecarFailures, ...scanFailures(input.report)];

  return {
    schemaVersion: "1",
    verificationKind: "local-provenance-verification",
    authority: "local-advisory",
    generatedAt: input.generatedAt,
    manifestPath: LOCAL_ARTIFACT_MANIFEST_PATH,
    reportPath: LOCAL_PROVENANCE_REPORT_PATH,
    verificationDecision: decisionFor(failures),
    manifestBinding,
    drift,
    reportHashPolicy: "external-only",
    reportSha256: input.reportSha256,
    sidecar: {
      path: LOCAL_PROVENANCE_REPORT_SIDECAR_PATH,
      decision: sidecarDecision
    },
    excludedBoundary: {
      envFilesRead: false,
      privateDatabasesRead: false,
      excludedPaths: [".env", ".env.local", "apps/web/.data", "node_modules"]
    },
    knownBlockers: input.report.knownBlockers,
    releaseGrade: false,
    canUnblockStaging: false,
    failures
  };
}

function readText(path: string): string {
  return readFileSync(path, { encoding: "utf8" });
}

function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export function buildAndWriteLocalProvenanceVerification(input: {
  workspaceRoot: string;
  generatedAt: string;
  checkOnly?: boolean;
}): { report: EnhancedLocalProvenanceReport; reportSha256: string; verification: LocalProvenanceVerification } {
  const root = resolve(input.workspaceRoot);
  const currentManifest = buildLocalArtifactManifest(root, input.generatedAt);
  validateLocalArtifactManifest(currentManifest);
  const manifestPath = join(root, LOCAL_ARTIFACT_MANIFEST_PATH);
  const existingManifestJson = existsSync(manifestPath) ? readText(manifestPath) : stableJson(currentManifest);
  const checkedManifest = JSON.parse(existingManifestJson) as LocalArtifactManifest;
  const existingReportPath = join(root, LOCAL_PROVENANCE_REPORT_PATH);
  const existingReportJson = input.checkOnly && existsSync(existingReportPath) ? readText(existingReportPath) : null;
  const existingReportGeneratedAt =
    existingReportJson === null ? null : (JSON.parse(existingReportJson) as { generatedAt?: string }).generatedAt ?? null;
  const reportGeneratedAt = input.checkOnly && existingReportGeneratedAt !== null ? existingReportGeneratedAt : input.generatedAt;
  const commandEvidenceReport = buildCommandEvidenceReport({ generatedAt: reportGeneratedAt });
  const scanResults = selectPublicArtifactScanEntries(currentManifest).map((entry) =>
    scanPublicArtifactText({ path: entry.path, content: readScanTargetContent(root, entry) })
  );
  const reportOutput = buildEnhancedLocalProvenanceReport({
    manifest: checkedManifest,
    manifestJson: existingManifestJson,
    generatedAt: reportGeneratedAt,
    scanResults,
    commandEvidenceReport
  });
  const sidecarPath = join(root, LOCAL_PROVENANCE_REPORT_SIDECAR_PATH);
  const sidecarContent = input.checkOnly && existsSync(sidecarPath) ? readText(sidecarPath) : reportOutput.sidecar.content;
  const reportDrift = compareReportForDrift({
    checkedReportJson: input.checkOnly ? existingReportJson : null,
    recomputedReport: reportOutput.report
  });
  const verification = buildLocalProvenanceVerification({
    manifest: checkedManifest,
    currentManifest,
    manifestJson: existingManifestJson,
    report: reportOutput.report,
    reportSha256: reportOutput.reportSha256,
    sidecarContent,
    generatedAt: input.generatedAt
  });
  const verificationWithReportDrift: LocalProvenanceVerification = {
    ...verification,
    verificationDecision: decisionFor([...verification.failures, ...reportDrift.failures]),
    failures: [...verification.failures, ...reportDrift.failures]
  };

  if (!input.checkOnly) {
    writeText(join(root, LOCAL_PROVENANCE_REPORT_PATH), stableJson(reportOutput.report));
    writeText(join(root, LOCAL_PROVENANCE_REPORT_SIDECAR_PATH), reportOutput.sidecar.content);
    writeText(join(root, "docs/evidence/local-command-evidence-report.json"), stableJson(commandEvidenceReport));
    writeText(join(root, LOCAL_PROVENANCE_VERIFICATION_PATH), stableJson(verificationWithReportDrift));
  }

  return { report: reportOutput.report, reportSha256: reportOutput.reportSha256, verification: verificationWithReportDrift };
}

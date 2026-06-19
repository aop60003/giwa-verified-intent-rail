import type { LocalArtifactManifest } from "./artifactManifest.ts";
import { sha256Hex, stableJson } from "./artifactManifest.ts";
import type { PublicArtifactScanFinding, PublicArtifactScanResult } from "./publicArtifactScanner.ts";
import { summarizePublicArtifactScans } from "./publicArtifactScanner.ts";

export const LOCAL_ARTIFACT_MANIFEST_PATH = "docs/evidence/local-artifact-manifest.json";
export const LOCAL_PROVENANCE_REPORT_PATH = "docs/evidence/local-provenance-report.json";
export const LOCAL_PROVENANCE_REPORT_SIDECAR_PATH = "docs/evidence/local-provenance-report.json.sha256";
export const LOCAL_PROVENANCE_VERIFICATION_PATH = "docs/evidence/local-provenance-verification.json";

export type TerminalDecision = "pass" | "blocked" | "skipped";

export type KnownProvenanceBlocker = {
  id: "source-provenance" | "protected-ci";
  status: "blocked";
  reason: string;
};

export type LocalCommandEvidenceReport = {
  schemaVersion: "1";
  reportKind: "local-command-evidence-report";
  authority: "local-advisory";
  generatedAt: string;
  claim: "commands-declared-not-executed-by-report-builder";
  requiredCommands: Array<{
    command: string;
    expectedResult: "exit-0";
    evidenceBoundary: "local-shell-output-not-protected-ci";
  }>;
  forbiddenFields: ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"];
  recordedResults: [];
  decision: "pass";
};

export type LocalCommandEvidenceBinding = {
  path: "docs/evidence/local-command-evidence-report.json";
  sha256: string;
  bytes: number;
  decision: TerminalDecision;
};

export type DomainHashBindingEntry = {
    name: "intentHash" | "verifierInputHash" | "receiptHash";
    algorithm: "keccak256";
    source: "public evidence";
    sourcePath: typeof LOCAL_ARTIFACT_MANIFEST_PATH;
    jsonPointer: string;
    value: string;
    derivation: "extracted";
    decision: "pass" | "blocked";
};

export type ScanBinding = {
  scanner: "public-artifact-scanner";
  scope: "served-public-artifacts";
  decision: TerminalDecision;
  filesScanned: number;
  blockedCount: number;
  skippedCount: number;
  findingCount: number;
  valuePrinted: false;
  findings: Array<{
    ruleId: PublicArtifactScanFinding["ruleId"];
    count: number;
    valuePrinted: false;
  }>;
};

export type ReportHashSidecar = {
  path: typeof LOCAL_PROVENANCE_REPORT_SIDECAR_PATH;
  content: string;
  reportSha256: string;
};

export type EnhancedLocalProvenanceReport = {
  schemaVersion: "1";
  reportKind: "local-provenance-report";
  authority: "local-advisory";
  generatedAt: string;
  reportHashPolicy: "external-only";
  releaseGrade: false;
  canUnblockStaging: false;
  blockedProtectedFields: ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"];
  manifestBinding: {
    authority: "local-advisory";
    bindingKind: "artifact-manifest-binding";
    manifestPath: typeof LOCAL_ARTIFACT_MANIFEST_PATH;
    manifestKind: "local-artifact-manifest";
    manifestAuthority: "local-advisory";
    artifactManifestSha256: string;
    artifactManifestBytes: number;
    buildTreeSha256: string;
    artifactGroupCounts: {
      packageMetadata: number;
      publicArtifacts: number;
      publicEvidence: number;
      implementationDocs: number;
    };
    equivalenceGroups: {
      passed: number;
      blocked: number;
    };
    domainHashCount: number;
    decision: TerminalDecision;
  };
  scanBinding: ScanBinding;
  commandEvidenceBinding: LocalCommandEvidenceBinding;
  domainHashBinding: DomainHashBindingEntry[];
  knownBlockers: KnownProvenanceBlocker[];
  sidecar: {
    path: typeof LOCAL_PROVENANCE_REPORT_SIDECAR_PATH;
    algorithm: "sha256";
    decision: TerminalDecision;
  };
  releaseGateStatus: "blocked-until-protected-ci-and-release-approval";
};

const TEXT_ENCODER = new TextEncoder();
const HASH_VALUE_PATTERN = /^0x[a-f0-9]{64}$/;

export function buildKnownProvenanceBlockers(
  sourceState: Pick<LocalArtifactManifest["sourceState"], "gitDirectory" | "githubDirectory" | "workflowDirectory">
): KnownProvenanceBlocker[] {
  const blockers: KnownProvenanceBlocker[] = [];
  if (!sourceState.gitDirectory) {
    blockers.push({
      id: "source-provenance",
      status: "blocked",
      reason: ".git is absent"
    });
  }
  if (!sourceState.githubDirectory || !sourceState.workflowDirectory) {
    blockers.push({
      id: "protected-ci",
      status: "blocked",
      reason: ".github workflows are absent"
    });
  }
  return blockers;
}

export function buildCommandEvidenceReport(input: { generatedAt: string }): LocalCommandEvidenceReport {
  return {
    schemaVersion: "1",
    reportKind: "local-command-evidence-report",
    authority: "local-advisory",
    generatedAt: input.generatedAt,
    claim: "commands-declared-not-executed-by-report-builder",
    requiredCommands: [
      { command: "pnpm test", expectedResult: "exit-0", evidenceBoundary: "local-shell-output-not-protected-ci" },
      { command: "pnpm build", expectedResult: "exit-0", evidenceBoundary: "local-shell-output-not-protected-ci" },
      {
        command: "pnpm --filter @giwa/web --fail-if-no-match test",
        expectedResult: "exit-0",
        evidenceBoundary: "local-shell-output-not-protected-ci"
      },
      {
        command: "pnpm --filter @giwa/web --fail-if-no-match typecheck",
        expectedResult: "exit-0",
        evidenceBoundary: "local-shell-output-not-protected-ci"
      },
      {
        command: "pnpm --filter @giwa/web --fail-if-no-match build",
        expectedResult: "exit-0",
        evidenceBoundary: "local-shell-output-not-protected-ci"
      },
      {
        command: "pnpm --filter @giwa/protocol --fail-if-no-match test",
        expectedResult: "exit-0",
        evidenceBoundary: "local-shell-output-not-protected-ci"
      },
      {
        command: "pnpm --filter @giwa/contracts --fail-if-no-match test",
        expectedResult: "exit-0",
        evidenceBoundary: "local-shell-output-not-protected-ci"
      },
      {
        command: "node --check apps/web/scripts/export-artifact-manifest.mjs",
        expectedResult: "exit-0",
        evidenceBoundary: "local-shell-output-not-protected-ci"
      },
      {
        command: "node --check apps/web/scripts/verify-provenance-report.mjs",
        expectedResult: "exit-0",
        evidenceBoundary: "local-shell-output-not-protected-ci"
      }
    ],
    forbiddenFields: ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"],
    recordedResults: [],
    decision: "pass"
  };
}

export function buildLocalCommandEvidenceBinding(report: LocalCommandEvidenceReport): LocalCommandEvidenceBinding {
  const reportJson = stableJson(report);
  return {
    path: "docs/evidence/local-command-evidence-report.json",
    sha256: sha256Hex(reportJson),
    bytes: TEXT_ENCODER.encode(reportJson).byteLength,
    decision: report.decision
  };
}

export function buildScanBinding(scanResults: PublicArtifactScanResult[]): ScanBinding {
  const summary = summarizePublicArtifactScans(scanResults);
  const findings = new Map<PublicArtifactScanFinding["ruleId"], number>();
  for (const finding of scanResults.flatMap((result) => result.findings)) {
    findings.set(finding.ruleId, (findings.get(finding.ruleId) ?? 0) + 1);
  }
  return {
    scanner: "public-artifact-scanner",
    scope: "served-public-artifacts",
    decision: summary.decision,
    filesScanned: summary.filesScanned,
    blockedCount: summary.blockedCount,
    skippedCount: summary.skippedCount,
    findingCount: [...findings.values()].reduce((total, count) => total + count, 0),
    valuePrinted: false,
    findings: [...findings.entries()].map(([ruleId, count]) => ({ ruleId, count, valuePrinted: false }))
  };
}

export function buildDomainHashBinding(manifest: LocalArtifactManifest): DomainHashBindingEntry[] {
  return manifest.domainHashes.map((entry, index) => {
    const value = entry.value.toLowerCase();
    return {
      name: entry.name,
      algorithm: entry.algorithm,
      source: entry.source,
      sourcePath: LOCAL_ARTIFACT_MANIFEST_PATH,
      jsonPointer: `/domainHashes/${index}`,
      value,
      derivation: "extracted" as const,
      decision: HASH_VALUE_PATTERN.test(value) ? ("pass" as const) : ("blocked" as const)
    };
  });
}

function buildManifestDecision(manifest: LocalArtifactManifest): TerminalDecision {
  if (manifest.ignoredPublicArtifacts.length > 0) return "blocked";
  if (manifest.equivalenceGroups.some((group) => group.decision !== "pass")) return "blocked";
  return "pass";
}

function manifestByteLength(manifestJson: string): number {
  return TEXT_ENCODER.encode(manifestJson).byteLength;
}

export function buildReportSha256Sidecar(input: { reportJson: string }): ReportHashSidecar {
  const reportSha256 = sha256Hex(input.reportJson);
  return {
    path: LOCAL_PROVENANCE_REPORT_SIDECAR_PATH,
    content: `${reportSha256}  ${LOCAL_PROVENANCE_REPORT_PATH}\n`,
    reportSha256
  };
}

export function buildEnhancedLocalProvenanceReport(input: {
  manifest: LocalArtifactManifest;
  manifestJson?: string;
  generatedAt: string;
  scanResults: PublicArtifactScanResult[];
  commandEvidenceReport?: LocalCommandEvidenceReport;
}): { report: EnhancedLocalProvenanceReport; reportSha256: string; sidecar: ReportHashSidecar } {
  const manifestJson = input.manifestJson ?? stableJson(input.manifest);
  const artifactManifestSha256 = sha256Hex(manifestJson);
  const artifactManifestBytes = manifestByteLength(manifestJson);
  const manifestDecision = buildManifestDecision(input.manifest);
  const scanBinding = buildScanBinding(input.scanResults);
  const domainHashBinding = buildDomainHashBinding(input.manifest);
  const commandEvidenceReport = input.commandEvidenceReport ?? buildCommandEvidenceReport({ generatedAt: input.generatedAt });
  const commandEvidenceBinding = buildLocalCommandEvidenceBinding(commandEvidenceReport);
  const passedEquivalenceGroups = input.manifest.equivalenceGroups.filter((group) => group.decision === "pass").length;
  const report: EnhancedLocalProvenanceReport = {
    schemaVersion: "1",
    reportKind: "local-provenance-report",
    authority: "local-advisory",
    generatedAt: input.generatedAt,
    releaseGrade: false,
    canUnblockStaging: false,
    blockedProtectedFields: ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"],
    reportHashPolicy: "external-only",
    manifestBinding: {
      authority: "local-advisory",
      bindingKind: "artifact-manifest-binding",
      manifestPath: LOCAL_ARTIFACT_MANIFEST_PATH,
      manifestKind: input.manifest.manifestKind,
      manifestAuthority: input.manifest.authority,
      artifactManifestSha256,
      artifactManifestBytes,
      buildTreeSha256: input.manifest.buildTreeSha256,
      artifactGroupCounts: {
        packageMetadata: input.manifest.artifactGroups.packageMetadata.length,
        publicArtifacts: input.manifest.artifactGroups.publicArtifacts.length,
        publicEvidence: input.manifest.artifactGroups.publicEvidence.length,
        implementationDocs: input.manifest.artifactGroups.implementationDocs.length
      },
      equivalenceGroups: {
        passed: passedEquivalenceGroups,
        blocked: input.manifest.equivalenceGroups.length - passedEquivalenceGroups
      },
      domainHashCount: input.manifest.domainHashes.length,
      decision: manifestDecision
    },
    scanBinding,
    commandEvidenceBinding,
    domainHashBinding,
    knownBlockers: buildKnownProvenanceBlockers(input.manifest.sourceState),
    sidecar: {
      path: LOCAL_PROVENANCE_REPORT_SIDECAR_PATH,
      algorithm: "sha256",
      decision: "pass"
    },
    releaseGateStatus: "blocked-until-protected-ci-and-release-approval"
  };
  const reportJson = stableJson(report);
  const sidecar = buildReportSha256Sidecar({ reportJson });
  return {
    report,
    reportSha256: sidecar.reportSha256,
    sidecar
  };
}

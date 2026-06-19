import { describe, expect, it } from "vitest";

import { buildLocalArtifactManifestFromEntries, stableJson } from "./artifactManifest.ts";
import {
  buildCommandEvidenceReport,
  buildEnhancedLocalProvenanceReport,
  buildKnownProvenanceBlockers,
  buildReportSha256Sidecar
} from "./provenanceReport.ts";
import { scanPublicArtifactText } from "./publicArtifactScanner.ts";

const generatedAt = "2026-06-19T00:00:00.000Z";
const intentHash = `0x${"1".repeat(64)}`;
const receiptHash = `0x${"2".repeat(64)}`;
const verifierInputHash = `0x${"3".repeat(64)}`;

const evidenceJson = JSON.stringify({ intentHash, receiptHash, verifierInputHash });
const liveSnapshotJson = JSON.stringify({ receiptHash, status: "matched" });

const manifestEntries = [
  { path: "apps/web/public/index.html", content: "<main>GIWA Verified Intent Rail</main>\n" },
  { path: "apps/web/public/live-demo-snapshot.json", content: `${liveSnapshotJson}\n` },
  { path: "docs/evidence/live-demo-sprint12-snapshot.json", content: `${liveSnapshotJson}\n` },
  { path: "docs/evidence/giwa-sepolia-chain-anchor.json", content: `${evidenceJson}\n` },
  { path: "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json", content: `${evidenceJson}\n` },
  { path: "docs/implementation/giwa-mvp-runbook.md", content: "# Runbook\n" },
  { path: "package.json", content: "{\"name\":\"fixture\"}\n" },
  { path: "apps/web/package.json", content: "{\"name\":\"@giwa/web\"}\n" },
  { path: "packages/protocol/package.json", content: "{\"name\":\"@giwa/protocol\"}\n" },
  { path: "packages/contracts/package.json", content: "{\"name\":\"@giwa/contracts\"}\n" },
  { path: "pnpm-lock.yaml", content: "lockfileVersion: 9.0\n" },
  { path: "pnpm-workspace.yaml", content: "packages: []\n" },
  { path: "tsconfig.base.json", content: "{}\n" }
];

function buildFixtureReport() {
  const manifest = buildLocalArtifactManifestFromEntries(manifestEntries, { generatedAt });
  const manifestJson = stableJson(manifest);
  const scanResults = manifest.artifactGroups.publicArtifacts.map((entry) =>
    scanPublicArtifactText({
      path: entry.path,
      content: manifestEntries.find((input) => input.path === entry.path)?.content ?? ""
    })
  );

  return buildEnhancedLocalProvenanceReport({
    manifest,
    manifestJson,
    generatedAt,
    scanResults,
    commandEvidenceReport: buildCommandEvidenceReport({ generatedAt })
  });
}

describe("enhanced local provenance report", () => {
  it("binds manifest hash, scan result, command catalog, domain hashes, and known blockers", () => {
    const { report, reportSha256, sidecar } = buildFixtureReport();

    expect(report.authority).toBe("local-advisory");
    expect(report.reportKind).toBe("local-provenance-report");
    expect(report.releaseGrade).toBe(false);
    expect(report.canUnblockStaging).toBe(false);
    expect(report.manifestBinding.artifactManifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.manifestBinding.artifactManifestBytes).toBeGreaterThan(0);
    expect(report.manifestBinding.manifestKind).toBe("local-artifact-manifest");
    expect(report.manifestBinding.manifestAuthority).toBe("local-advisory");
    expect(report.scanBinding.decision).toBe("pass");
    expect(report.scanBinding.findingCount).toBe(0);
    expect(report.scanBinding.valuePrinted).toBe(false);
    expect(report.commandEvidenceBinding.path).toBe("docs/evidence/local-command-evidence-report.json");
    expect(report.commandEvidenceBinding.decision).toBe("pass");
    expect(report.domainHashBinding.map((entry) => entry.value).sort()).toEqual([intentHash, receiptHash, verifierInputHash].sort());
    expect(report.domainHashBinding.every((entry) => entry.decision === "pass")).toBe(true);
    expect(report.knownBlockers.map((blocker) => blocker.id)).toContain("protected-ci");
    expect(report.reportHashPolicy).toBe("external-only");
    expect(report.sidecar).toEqual({
      path: "docs/evidence/local-provenance-report.json.sha256",
      algorithm: "sha256",
      decision: "pass"
    });
    expect(sidecar.reportSha256).toBe(reportSha256);
    expect(sidecar.content).toMatch(/^[a-f0-9]{64}  docs\/evidence\/local-provenance-report\.json\n$/);
    expect(JSON.stringify(report)).not.toContain(reportSha256);
    expect(JSON.stringify(report)).not.toContain("pass-or-blocked");
    expect(Object.keys(report)).not.toContain("advisoryChecks");
    expect(Object.keys(report)).not.toContain("blockedActions");
    expect(Object.keys(report)).not.toContain("artifactManifestSha256");
  });

  it("keeps blocked scan findings redacted while binding the scanner decision", () => {
    const manifest = buildLocalArtifactManifestFromEntries(manifestEntries, { generatedAt });
    const canary = "CANARY-VALUE-DO-NOT-PRINT";
    const { report } = buildEnhancedLocalProvenanceReport({
      manifest,
      manifestJson: stableJson(manifest),
      generatedAt,
      commandEvidenceReport: buildCommandEvidenceReport({ generatedAt }),
      scanResults: [
        scanPublicArtifactText({
          path: "apps/web/public/index.html",
          content: JSON.stringify({ apiKey: canary })
        })
      ]
    });

    expect(report.scanBinding.decision).toBe("blocked");
    expect(report.scanBinding.findingCount).toBe(1);
    expect(report.scanBinding.valuePrinted).toBe(false);
    expect(report.scanBinding.findings).toEqual([
      {
        ruleId: "credential-like-key",
        count: 1,
        valuePrinted: false
      }
    ]);
    expect(report.scanBinding).toMatchObject({
      decision: "blocked"
    });
    expect(JSON.stringify(report)).not.toContain(canary);
  });

  it("separates protected CI blockers from local-advisory checks", () => {
    expect(buildKnownProvenanceBlockers({ gitDirectory: false, githubDirectory: false, workflowDirectory: false })).toEqual([
      {
        id: "source-provenance",
        status: "blocked",
        reason: ".git is absent"
      },
      {
        id: "protected-ci",
        status: "blocked",
        reason: ".github workflows are absent"
      }
    ]);
  });

  it("keeps the report hash external in a sha256 sidecar", () => {
    const reportJson = "{\"reportKind\":\"local-provenance-report\"}\n";
    const sidecar = buildReportSha256Sidecar({ reportJson });

    expect(sidecar.path).toBe("docs/evidence/local-provenance-report.json.sha256");
    expect(sidecar.content).toMatch(/^[a-f0-9]{64}  docs\/evidence\/local-provenance-report\.json\n$/);
    expect(reportJson).not.toContain(sidecar.reportSha256);
  });
});

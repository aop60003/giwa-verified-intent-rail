import { describe, expect, it } from "vitest";

import { buildLocalArtifactManifestFromEntries, stableJson } from "./artifactManifest.ts";
import { buildEnhancedLocalProvenanceReport } from "./provenanceReport.ts";
import {
  buildLocalProvenanceVerification,
  compareReportForDrift,
  compareManifestForDrift,
  verifyLocalProvenanceReportBinding
} from "./provenanceVerifier.ts";
import { scanPublicArtifactText } from "./publicArtifactScanner.ts";

const generatedAt = "2026-06-19T00:00:00.000Z";

const baseEntries = [
  { path: "apps/web/public/index.html", content: "<main>GIWA Verified Intent Rail</main>\n" },
  { path: "apps/web/public/live-demo-snapshot.json", content: "{\"status\":\"matched\"}\n" },
  { path: "docs/evidence/live-demo-sprint12-snapshot.json", content: "{\"status\":\"matched\"}\n" },
  { path: "docs/evidence/giwa-sepolia-chain-anchor.json", content: "{\"receiptHash\":\"0x1111111111111111111111111111111111111111111111111111111111111111\"}\n" },
  {
    path: "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json",
    content: "{\"receiptHash\":\"0x1111111111111111111111111111111111111111111111111111111111111111\"}\n"
  },
  { path: "docs/implementation/giwa-mvp-runbook.md", content: "# Runbook\n" },
  { path: "package.json", content: "{\"name\":\"fixture\"}\n" },
  { path: "apps/web/package.json", content: "{\"name\":\"@giwa/web\"}\n" },
  { path: "packages/protocol/package.json", content: "{\"name\":\"@giwa/protocol\"}\n" },
  { path: "packages/contracts/package.json", content: "{\"name\":\"@giwa/contracts\"}\n" },
  { path: "pnpm-lock.yaml", content: "lockfileVersion: 9.0\n" },
  { path: "pnpm-workspace.yaml", content: "packages: []\n" },
  { path: "tsconfig.base.json", content: "{}\n" }
];

function buildFixture() {
  const manifest = buildLocalArtifactManifestFromEntries(baseEntries, { generatedAt });
  const manifestJson = stableJson(manifest);
  const scanResults = manifest.artifactGroups.publicArtifacts.map((entry) =>
    scanPublicArtifactText({
      path: entry.path,
      content: baseEntries.find((input) => input.path === entry.path)?.content ?? ""
    })
  );
  const reportOutput = buildEnhancedLocalProvenanceReport({
    manifest,
    manifestJson,
    generatedAt,
    scanResults
  });

  return { manifest, manifestJson, ...reportOutput };
}

describe("local provenance verifier", () => {
  it("accepts a report bound to the exact manifest bytes and rejects hash drift", () => {
    const { manifest, manifestJson, report } = buildFixture();

    expect(verifyLocalProvenanceReportBinding({ manifest, manifestJson, report })).toMatchObject({
      decision: "pass",
      failures: []
    });

    expect(
      verifyLocalProvenanceReportBinding({
        manifest,
        manifestJson,
        report: {
          ...report,
          manifestBinding: { ...report.manifestBinding, artifactManifestSha256: "0".repeat(64) }
        }
      })
    ).toMatchObject({
      decision: "blocked",
      failures: [{ code: "PROV_MANIFEST_HASH_MISMATCH" }]
    });
  });

  it("detects current manifest drift while ignoring timestamp-only regeneration", () => {
    const checked = buildLocalArtifactManifestFromEntries(baseEntries, { generatedAt });
    const regenerated = buildLocalArtifactManifestFromEntries(baseEntries, { generatedAt: "2026-06-19T00:01:00.000Z" });
    const drifted = buildLocalArtifactManifestFromEntries(
      baseEntries.map((entry) =>
        entry.path === "apps/web/public/index.html" ? { ...entry, content: "<main>changed</main>\n" } : entry
      ),
      { generatedAt }
    );
    const withExtraPublicFile = buildLocalArtifactManifestFromEntries(
      [...baseEntries, { path: "apps/web/public/new-export.json", content: "{}\n" }],
      { generatedAt }
    );

    expect(compareManifestForDrift({ checked, current: regenerated })).toMatchObject({
      decision: "pass",
      failures: []
    });
    expect(compareManifestForDrift({ checked, current: drifted })).toMatchObject({
      decision: "blocked",
      failures: [{ code: "PROV_PUBLIC_ARTIFACT_DRIFT", path: "apps/web/public/index.html" }]
    });
    expect(compareManifestForDrift({ checked, current: withExtraPublicFile })).toMatchObject({
      decision: "blocked",
      failures: [{ code: "PROV_PUBLIC_ARTIFACT_DRIFT", path: "apps/web/public/new-export.json" }]
    });
  });

  it("detects report-only drift, local authority confusion, scan findings, and output self-inclusion", () => {
    const { manifest, manifestJson, report } = buildFixture();

    expect(
      compareReportForDrift({
        checkedReportJson: stableJson({ ...report, releaseGateStatus: "manually-changed" }),
        recomputedReport: report
      })
    ).toMatchObject({
      decision: "blocked",
      failures: [{ code: "PROV_REPORT_ONLY_DRIFT" }]
    });

    expect(
      verifyLocalProvenanceReportBinding({
        manifest,
        manifestJson,
        report: { ...report, authority: "protected-ci" } as unknown as typeof report
      })
    ).toMatchObject({
      decision: "blocked",
      failures: [{ code: "PROV_LOCAL_AUTHORITY_CONFUSION" }]
    });

    const manifestWithSelfIncludedOutput = {
      ...manifest,
      artifactGroups: {
        ...manifest.artifactGroups,
        publicEvidence: [
          ...manifest.artifactGroups.publicEvidence,
          {
            path: "docs/evidence/local-provenance-verification.json",
            role: "public-evidence",
            required: true,
            sha256: "0".repeat(64),
            bytes: 2,
            scanDecision: "pass-or-blocked",
            generatedBy: "fixture",
            schemaPath: null
          }
        ]
      }
    } as typeof manifest;

    expect(
      verifyLocalProvenanceReportBinding({
        manifest: manifestWithSelfIncludedOutput,
        manifestJson: stableJson(manifestWithSelfIncludedOutput),
        report: {
          ...report,
          manifestBinding: {
            ...report.manifestBinding,
            artifactManifestSha256: "0".repeat(64),
            artifactManifestBytes: 2
          }
        }
      })
    ).toMatchObject({
      decision: "blocked",
      failures: expect.arrayContaining([{ code: "PROV_OUTPUT_SELF_INCLUDED", path: "docs/evidence/local-provenance-verification.json" }])
    });

    expect(
      buildLocalProvenanceVerification({
        manifest,
        currentManifest: manifest,
        manifestJson,
        report: {
          ...report,
          scanBinding: {
            ...report.scanBinding,
            decision: "blocked",
            blockedCount: 1,
            findingCount: 1,
            findings: [{ ruleId: "credential-like-key", count: 1, valuePrinted: false }]
          }
        },
        reportSha256: "0".repeat(64),
        generatedAt
      })
    ).toMatchObject({
      verificationDecision: "blocked",
      failures: [{ code: "PROV_SCAN_FINDING" }]
    });
  });

  it("creates a redacted local-advisory verification envelope for dynamic review", () => {
    const { manifest, manifestJson, report, reportSha256 } = buildFixture();
    const verification = buildLocalProvenanceVerification({
      manifest,
      currentManifest: manifest,
      manifestJson,
      report,
      reportSha256,
      generatedAt
    });

    expect(verification.authority).toBe("local-advisory");
    expect(verification.verificationKind).toBe("local-provenance-verification");
    expect(verification.verificationDecision).toBe("pass");
    expect(verification.manifestBinding.decision).toBe("pass");
    expect(verification.drift.decision).toBe("pass");
    expect(verification.reportHashPolicy).toBe("external-only");
    expect(verification.reportSha256).toBe(reportSha256);
    expect(verification.releaseGrade).toBe(false);
    expect(verification.canUnblockStaging).toBe(false);
    expect(verification.knownBlockers.map((blocker) => blocker.id)).toContain("protected-ci");
    expect(verification.excludedBoundary.envFilesRead).toBe(false);
    expect(verification.excludedBoundary.privateDatabasesRead).toBe(false);
  });
});

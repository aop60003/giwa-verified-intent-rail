import { describe, expect, it } from "vitest";

import {
  buildLocalArtifactManifestFromEntries,
  buildLocalProvenanceReport,
  validateLocalArtifactManifest,
  normalizeArtifactPath
} from "./artifactManifest.ts";

const generatedAt = "2026-06-19T00:00:00.000Z";

const currentPublicPaths = [
  "apps/web/public/demo-control-room.js",
  "apps/web/public/demo.html",
  "apps/web/public/flow-data.json",
  "apps/web/public/flow.js",
  "apps/web/public/index.html",
  "apps/web/public/live-demo-snapshot.json",
  "apps/web/public/live-flow.js",
  "apps/web/public/live.html",
  "apps/web/public/partner-snapshot.json",
  "apps/web/public/styles.css"
];

const manifestEntries = [
  ...currentPublicPaths.map((path) => ({ path, content: `public fixture for ${path}` })),
  { path: "docs/evidence/giwa-sepolia-chain-anchor.json", content: "{\"status\":\"matched\"}\n" },
  { path: "docs/evidence/live-demo-sprint12-snapshot.schema.md", content: "# Schema\n" },
  { path: "docs/implementation/giwa-mvp-runbook.md", content: "# Runbook\n" },
  { path: "package.json", content: "{\"name\":\"fixture\"}\n" },
  { path: "apps/web/package.json", content: "{\"name\":\"@giwa/web\"}\n" },
  { path: "packages/protocol/package.json", content: "{\"name\":\"@giwa/protocol\"}\n" },
  { path: "packages/contracts/package.json", content: "{\"name\":\"@giwa/contracts\"}\n" },
  { path: "pnpm-lock.yaml", content: "lockfileVersion: 9.0\n" },
  { path: "pnpm-workspace.yaml", content: "packages: []\n" },
  { path: "tsconfig.base.json", content: "{}\n" },
  { path: "docs/evidence/local-command-evidence-report.json", content: "excluded" },
  { path: "docs/evidence/local-provenance-verification.json", content: "excluded" },
  {
    path: "docs/evidence/local/lightsail-access-operator-note.md",
    content: "private operator-only state"
  },
  { path: "apps/web/.data/live.sqlite", content: "excluded" },
  { path: ".env.local", content: "excluded" },
  { path: "node_modules/example/index.js", content: "excluded" }
];

describe("local artifact manifest", () => {
  it("normalizes repo-relative paths and rejects unsafe path shapes", () => {
    expect(normalizeArtifactPath("apps\\web\\public\\demo.html")).toBe("apps/web/public/demo.html");
    expect(normalizeArtifactPath("./apps/web/public/demo.html")).toBe("apps/web/public/demo.html");
    expect(() => normalizeArtifactPath("C:\\Users\\fixture\\file.txt")).toThrow("artifact path must be repo-relative");
    expect(() => normalizeArtifactPath("../outside.json")).toThrow("artifact path must stay inside the workspace");
  });

  it("covers every served public artifact and excludes local-only surfaces", () => {
    const manifest = buildLocalArtifactManifestFromEntries(manifestEntries, { generatedAt });

    expect(manifest.authority).toBe("local-advisory");
    expect(manifest.manifestKind).toBe("local-artifact-manifest");
    expect(manifest.releaseGrade).toBe(false);
    expect(manifest.canUnblockStaging).toBe(false);
    expect(manifest.hashPolicy).toMatchObject({
      fileHashAlgorithm: "sha256",
      fileHashInput: "raw-file-bytes",
      pathStyle: "repo-relative-posix",
      aggregateLineEnding: "lf",
      aggregateSort: "normalized-path-ascending"
    });

    expect(manifest.artifactGroups.publicArtifacts.map((entry) => entry.path)).toEqual(currentPublicPaths);
    expect(manifest.artifactGroups.publicArtifacts.every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256))).toBe(true);
    expect(manifest.artifactGroups.packageMetadata.map((entry) => entry.path)).toContain("package.json");
    expect(manifest.buildTreeSha256).toMatch(/^[a-f0-9]{64}$/);

    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain(".env.local");
    expect(serialized).not.toContain("apps/web/.data");
    expect(serialized).not.toContain("node_modules");
    expect(serialized).not.toContain("local-command-evidence-report");
    expect(serialized).not.toContain("local-provenance-verification");
    expect(serialized).not.toContain("docs/evidence/local/");
  });

  it("keeps provenance local-advisory and binds it to the manifest hash without self-reference", () => {
    const manifest = buildLocalArtifactManifestFromEntries(manifestEntries, { generatedAt });
    const { report, reportSha256 } = buildLocalProvenanceReport(manifest, { generatedAt });

    expect(report.authority).toBe("local-advisory");
    expect(report.reportKind).toBe("local-provenance-report");
    expect(report.manifestPath).toBe("docs/evidence/local-artifact-manifest.json");
    expect(report.reportHashPolicy).toBe("external-only");
    expect(report.artifactManifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.buildTreeSha256).toBe(manifest.buildTreeSha256);
    expect(report.blockedProtectedFields).toEqual([
      "sourceCommit",
      "ciRunId",
      "releaseTag",
      "promotionDecision"
    ]);
    expect(report.releaseGateStatus).toBe("blocked-until-protected-ci-and-release-approval");
    expect(reportSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(report)).not.toContain(reportSha256);
  });

  it("extracts protocol domain hashes from byte-backed public evidence inputs", () => {
    const encoder = new TextEncoder();
    const manifest = buildLocalArtifactManifestFromEntries(
      [
        {
          path: "docs/evidence/giwa-sepolia-mvp-evidence.json",
          content: encoder.encode(
            JSON.stringify({
              intentHash: `0x${"1".repeat(64)}`,
              verifierInputHash: `0x${"2".repeat(64)}`,
              receiptHash: `0x${"3".repeat(64)}`
            })
          )
        }
      ],
      { generatedAt }
    );

    expect(manifest.domainHashes).toEqual([
      { name: "intentHash", algorithm: "keccak256", source: "public evidence", value: `0x${"1".repeat(64)}` },
      { name: "receiptHash", algorithm: "keccak256", source: "public evidence", value: `0x${"3".repeat(64)}` },
      { name: "verifierInputHash", algorithm: "keccak256", source: "public evidence", value: `0x${"2".repeat(64)}` }
    ]);
  });

  it("fails validation when an equivalence group is missing or mismatched", () => {
    const missing = buildLocalArtifactManifestFromEntries(
      [{ path: "docs/evidence/live-demo-sprint12-snapshot.json", content: "{}\n" }],
      { generatedAt }
    );
    expect(() => validateLocalArtifactManifest(missing)).toThrow("artifact_equivalence_group_failed");

    const mismatched = buildLocalArtifactManifestFromEntries(
      [
        { path: "docs/evidence/live-demo-sprint12-snapshot.json", content: "{\"a\":1}\n" },
        { path: "apps/web/public/live-demo-snapshot.json", content: "{\"a\":2}\n" },
        { path: "docs/evidence/giwa-sepolia-chain-anchor.json", content: "{\"a\":1}\n" },
        { path: "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json", content: "{\"a\":1}\n" }
      ],
      { generatedAt }
    );
    expect(() => validateLocalArtifactManifest(mismatched)).toThrow("artifact_equivalence_group_failed");
  });

  it("fails validation when a served public file has an unsupported extension", () => {
    const manifest = buildLocalArtifactManifestFromEntries(
      [
        ...manifestEntries,
        { path: "apps/web/public/logo.svg", content: "<svg />" }
      ],
      { generatedAt }
    );

    expect(() => validateLocalArtifactManifest(manifest)).toThrow("artifact_public_file_not_manifested");
  });
});

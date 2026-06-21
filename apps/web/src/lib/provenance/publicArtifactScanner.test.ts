import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

import { buildLocalArtifactManifestFromEntries } from "./artifactManifest.ts";
import { readScanTargetContent, scanPublicArtifactText, selectPublicArtifactScanEntries } from "./publicArtifactScanner.ts";

const generatedAt = "2026-06-19T00:00:00.000Z";
const workspaceRoot = resolve(process.cwd(), "../..");

describe("public artifact scanner", () => {
  it("blocks credential-like keys without printing synthetic canary values", () => {
    const canary = "CANARY-VALUE-DO-NOT-PRINT";
    const result = scanPublicArtifactText({
      path: "apps/web/public/partner-snapshot.json",
      content: JSON.stringify({ apiKey: canary })
    });

    expect(result.decision).toBe("blocked");
    expect(result.findings[0]).toMatchObject({
      ruleId: "credential-like-key",
      matchClass: "credential-key-name",
      valuePrinted: false
    });
    expect(JSON.stringify(result)).not.toContain(canary);
  });

  it("blocks additional credential-shaped keys without printing synthetic canary values", () => {
    const canary = "CANARY-VALUE-DO-NOT-PRINT";
    for (const key of ["clientSecret", "password", "cookie", "refreshToken", "idToken"]) {
      const result = scanPublicArtifactText({
        path: "apps/web/public/partner-snapshot.json",
        content: JSON.stringify({ [key]: canary })
      });

      expect(result.decision).toBe("blocked");
      expect(result.findings[0]).toMatchObject({
        ruleId: "credential-like-key",
        matchClass: "credential-key-name",
        valuePrinted: false
      });
      expect(JSON.stringify(result)).not.toContain(canary);
    }
  });

  it("blocks credential-like JSON string values without printing synthetic canary values", () => {
    const canary = "CANARY-VALUE-DO-NOT-PRINT";
    const result = scanPublicArtifactText({
      path: "apps/web/public/live-demo-snapshot.json",
      content: JSON.stringify({ header: `Authorization: Bearer ${canary}` })
    });

    expect(result.decision).toBe("blocked");
    expect(result.findings[0]).toMatchObject({
      ruleId: "credential-like-key",
      matchClass: "credential-marker",
      valuePrinted: false
    });
    expect(JSON.stringify(result)).not.toContain(canary);
  });

  it("blocks additional credential-shaped string markers without printing synthetic canary values", () => {
    const canary = "CANARY-VALUE-DO-NOT-PRINT";
    for (const marker of ["client_secret", "password", "refresh_token", "id_token"]) {
      const result = scanPublicArtifactText({
        path: "apps/web/public/live-demo-snapshot.json",
        content: JSON.stringify({ note: `${marker}=${canary}` })
      });

      expect(result.decision).toBe("blocked");
      expect(result.findings[0]).toMatchObject({
        ruleId: "credential-like-key",
        matchClass: "credential-marker",
        valuePrinted: false
      });
      expect(JSON.stringify(result)).not.toContain(canary);
    }
  });

  it("allows public addresses, transaction hashes, receipt hashes, and bounded status", () => {
    const result = scanPublicArtifactText({
      path: "apps/web/public/live-demo-snapshot.json",
      content: JSON.stringify({
        wallet: "0xf3a729973559082260e742ebedf705271ad29476",
        depositTxHash: `0x${"a".repeat(64)}`,
        receiptHash: `0x${"b".repeat(64)}`,
        status: "matched"
      })
    });

    expect(result.decision).toBe("pass");
    expect(result.findings).toEqual([]);
  });

  it("blocks unsupported public claims while redacting the matched phrase", () => {
    const phrase = "instant final" + "ity";
    const result = scanPublicArtifactText({
      path: "apps/web/public/index.html",
      content: `<p>${phrase}</p>`
    });

    expect(result.decision).toBe("blocked");
    expect(result.findings[0]).toMatchObject({
      ruleId: "unsupported-claim",
      matchClass: "claim-boundary",
      valuePrinted: false
    });
    expect(JSON.stringify(result)).not.toContain(phrase);
  });

  it("skips excluded local surfaces before reporting content details", () => {
    const canary = "EXCLUDED-CANARY-VALUE";
    const result = scanPublicArtifactText({
      path: ".env.local",
      content: canary
    });

    expect(result.decision).toBe("skipped");
    expect(result.findings[0]).toMatchObject({
      ruleId: "excluded-surface",
      matchClass: "excluded-path",
      valuePrinted: false
    });
    expect(JSON.stringify(result)).not.toContain(canary);
  });

  it("allows negative evidence safety flags without treating them as leaked values", () => {
    const result = scanPublicArtifactText({
      path: "docs/evidence/giwa-sepolia-mvp-evidence.json",
      content: JSON.stringify({
        noPrivateKeys: true,
        demoUserPrivateKeyNeverRequested: true,
        noBearerTokens: true
      })
    });

    expect(result.decision).toBe("pass");
    expect(result.findings).toEqual([]);
  });

  it("allows negative safety metadata in the public chain evidence fixture", () => {
    const result = scanPublicArtifactText({
      path: "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json",
      content: JSON.stringify({
        roles: { demoUserPrivateKeyNeverRequested: true },
        submissionFinalization: {
          redactionChecklist: {
            noPrivateKeys: true,
            noMnemonics: true,
            noRpcTokens: true,
            noBearerTokens: true
          }
        }
      })
    });

    expect(result.decision).toBe("pass");
    expect(result.findings).toEqual([]);
  });

  it("selects served public artifacts and public evidence JSON for blocking scan", () => {
    const manifest = buildLocalArtifactManifestFromEntries(
      [
        { path: "apps/web/public/index.html", content: "<html></html>" },
        { path: "apps/web/public/demo-control-room.js", content: "console.log('safe')" },
        { path: "docs/evidence/giwa-sepolia-mvp-evidence.schema.md", content: "# Schema\n" },
        { path: "docs/evidence/giwa-sepolia-mvp-evidence.json", content: "{\"noPrivateKeys\":true}\n" }
      ],
      { generatedAt }
    );

    expect(selectPublicArtifactScanEntries(manifest).map((entry) => entry.path)).toEqual([
      "apps/web/public/demo-control-room.js",
      "apps/web/public/index.html",
      "docs/evidence/giwa-sepolia-mvp-evidence.json"
    ]);
  });

  it("applies path policy before resolving scan target content", () => {
    expect(() =>
      readScanTargetContent("C:/workspace", {
        path: ".env.local",
        role: "public-served-artifact",
        required: true,
        sha256: "0".repeat(64),
        bytes: 1,
        scanDecision: "pass-or-blocked",
        generatedBy: "fixture",
        schemaPath: null
      })
    ).toThrow("artifact_scan_path_policy_violation");
  });

  it("allows reading public evidence JSON scan targets but rejects evidence schemas", () => {
    expect(() =>
      readScanTargetContent(workspaceRoot, {
        path: "docs/evidence/giwa-sepolia-mvp-evidence.json",
        role: "public-evidence",
        required: true,
        sha256: "0".repeat(64),
        bytes: 1,
        scanDecision: "pass-or-blocked",
        generatedBy: "fixture",
        schemaPath: null
      })
    ).not.toThrow();
    expect(() =>
      readScanTargetContent(workspaceRoot, {
        path: "docs/evidence/giwa-sepolia-mvp-evidence.schema.md",
        role: "public-evidence",
        required: true,
        sha256: "0".repeat(64),
        bytes: 1,
        scanDecision: "pass-or-blocked",
        generatedBy: "fixture",
        schemaPath: null
      })
    ).toThrow("artifact_scan_path_policy_violation");
  });
});

import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

import { buildLocalArtifactManifestFromEntries } from "./artifactManifest.ts";
import { readScanTargetContent, scanPublicArtifactText, selectPublicArtifactScanEntries } from "./publicArtifactScanner.ts";

const generatedAt = "2026-06-19T00:00:00.000Z";
const workspaceRoot = resolve(process.cwd(), "../..");
const documentedServerOnlyNames = [
  "HOST",
  "PORT",
  "GIWA_LIVE_MODE",
  "GIWA_LIVE_DB_PATH",
  "GIWA_LIVE_ALLOWED_ORIGINS",
  "GIWA_LIVE_PARTNER_TENANT_ID",
  "GIWA_LIVE_PARTNER_CREDENTIAL_HASHES",
  "GIWA_SEPOLIA_RPC_URL",
  "GIWA_EXPLORER_TX_URL_TEMPLATE",
  "GIWA_EXPLORER_ADDRESS_URL_TEMPLATE",
  "CAMPAIGN_SIGNER_PRIVATE_KEY",
  "INTENT_SUBMITTER_PRIVATE_KEY",
  "VERIFIER_PRIVATE_KEY"
];

function variableNameContract(serverOnlyNames: string[] = documentedServerOnlyNames): Record<string, unknown> {
  return { variableNamesOnly: true, valuesIncluded: false, serverOnlyNames };
}

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

  it("keeps blocking credential property markers inside URL parser checks", () => {
    const result = scanPublicArtifactText({
      path: "apps/web/public/user-flow.js",
      content: [
        "const parsed = new URL(value);",
        'const safe = parsed.protocol === "https:" && parsed.username === "" && parsed.password === "";'
      ].join("\n")
    });

    expect(result.decision).toBe("blocked");
    expect(result.findings[0]).toMatchObject({
      ruleId: "credential-like-key",
      matchClass: "credential-key-name",
      decision: "blocked"
    });
  });

  it("keeps blocking JavaScript credential variables, assignments, and markers", () => {
    for (const content of [
      "const password = input;",
      "config.password = input;",
      "const parsed = new URL(value); parsed.password = input;",
      'const header = "Authorization: Bearer synthetic";'
    ]) {
      const result = scanPublicArtifactText({ path: "apps/web/public/user-flow.js", content });

      expect(result.decision).toBe("blocked");
      expect(result.findings[0]).toMatchObject({ ruleId: "credential-like-key", decision: "blocked" });
    }
  });

  it("allows environment variable names only in an explicit public evidence contract", () => {
    const result = scanPublicArtifactText({
      path: "docs/evidence/lightsail-staging-preflight-sprint52.json",
      content: JSON.stringify({
        envContract: variableNameContract()
      })
    });

    expect(result.decision).toBe("pass");
    expect(result.findings).toEqual([]);
  });

  it("blocks a variable-name contract in another public evidence file", () => {
    const result = scanPublicArtifactText({
      path: "docs/evidence/another-preflight.json",
      content: JSON.stringify({ envContract: variableNameContract() })
    });

    expect(result.decision).toBe("blocked");
  });

  it("blocks a variable-name contract outside the root envContract property", () => {
    const result = scanPublicArtifactText({
      path: "docs/evidence/lightsail-staging-preflight-sprint52.json",
      content: JSON.stringify({ nested: { envContract: variableNameContract() } })
    });

    expect(result.decision).toBe("blocked");
  });

  it.each(["PASSWORD", "COOKIE", "PRIVATE_KEY_LITERAL"])(
    "blocks unexpected uppercase token %s inside the evidence exception",
    (unexpectedName) => {
      const result = scanPublicArtifactText({
        path: "docs/evidence/lightsail-staging-preflight-sprint52.json",
        content: JSON.stringify({
          envContract: variableNameContract([...documentedServerOnlyNames, unexpectedName])
        })
      });

      expect(result.decision).toBe("blocked");
    }
  );

  it.each([
    { serverOnlyNames: documentedServerOnlyNames.slice(1) },
    {
      serverOnlyNames: [...documentedServerOnlyNames.slice(0, -1), documentedServerOnlyNames[0] ?? "HOST"]
    }
  ])("blocks incomplete or duplicate copies of the documented name set", ({ serverOnlyNames }) => {
    const result = scanPublicArtifactText({
      path: "docs/evidence/lightsail-staging-preflight-sprint52.json",
      content: JSON.stringify({ envContract: variableNameContract(serverOnlyNames) })
    });

    expect(result.decision).toBe("blocked");
  });

  it("continues scanning sibling fields beside the exact name set", () => {
    const result = scanPublicArtifactText({
      path: "docs/evidence/lightsail-staging-preflight-sprint52.json",
      content: JSON.stringify({
        envContract: { ...variableNameContract(), note: "PASSWORD=synthetic" }
      })
    });

    expect(result.decision).toBe("blocked");
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "credential-like-key", matchClass: "credential-marker" })
      ])
    );
  });

  it("blocks malformed server-only name contracts even when their entries are not sensitive", () => {
    const unsafeCases = [
      { path: "docs/evidence/preflight.json", value: { serverOnlyNames: ["HOST"] } },
      {
        path: "docs/evidence/preflight.json",
        value: { valuesIncluded: false, serverOnlyNames: ["HOST"] }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { variableNamesOnly: true, serverOnlyNames: ["HOST"] }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { variableNamesOnly: false, valuesIncluded: false, serverOnlyNames: ["HOST"] }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { variableNamesOnly: true, valuesIncluded: true, serverOnlyNames: ["HOST"] }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { variableNamesOnly: true, valuesIncluded: false, serverOnlyNames: ["host"] }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { variableNamesOnly: true, valuesIncluded: false, serverOnlyNames: [] }
      },
      {
        path: "apps/web/public/preflight.json",
        value: { variableNamesOnly: true, valuesIncluded: false, serverOnlyNames: ["HOST"] }
      }
    ];

    for (const unsafeCase of unsafeCases) {
      const result = scanPublicArtifactText({
        path: unsafeCase.path,
        content: JSON.stringify(unsafeCase.value)
      });

      expect(result.decision).toBe("blocked");
      expect(result.findings[0]).toMatchObject({
        ruleId: "credential-like-key",
        matchClass: "credential-key-name",
        decision: "blocked"
      });
    }
  });

  it("blocks evidence variable-name exceptions outside their exact safe context", () => {
    const safeContract = {
      variableNamesOnly: true,
      valuesIncluded: false,
      serverOnlyNames: ["CAMPAIGN_SIGNER_PRIVATE_KEY"]
    };
    const unsafeCases = [
      {
        path: "docs/evidence/preflight.json",
        value: { ...safeContract, serverOnlyNames: ["CAMPAIGN_SIGNER_PRIVATE_KEY=synthetic"] }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { valuesIncluded: false, serverOnlyNames: ["CAMPAIGN_SIGNER_PRIVATE_KEY"] }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { ...safeContract, variableNamesOnly: false }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { variableNamesOnly: true, serverOnlyNames: ["CAMPAIGN_SIGNER_PRIVATE_KEY"] }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { ...safeContract, valuesIncluded: true }
      },
      {
        path: "docs/evidence/preflight.json",
        value: { ...safeContract, note: "CAMPAIGN_SIGNER_PRIVATE_KEY" }
      },
      { path: "apps/web/public/preflight.json", value: safeContract },
      { path: "docs/implementation/preflight.json", value: safeContract }
    ];

    for (const unsafeCase of unsafeCases) {
      const result = scanPublicArtifactText({
        path: unsafeCase.path,
        content: JSON.stringify(unsafeCase.value)
      });

      expect(result.decision).toBe("blocked");
      expect(result.findings[0]).toMatchObject({
        ruleId: "credential-like-key",
        decision: "blocked"
      });
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

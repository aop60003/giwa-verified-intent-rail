import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const runtimeLoadedSourceFiles = [
  "src/lib/storage/receiptStore.ts",
  "src/lib/verifier/verifyManifestSigner.ts",
  "src/lib/verifier/verifyDeposit.ts",
  "src/lib/live/liveApi.ts",
  "scripts/serve-live.mjs"
];

function readRuntimeSource(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

describe("live server source imports", () => {
  it("loads the Studio campaign service under the pinned Node strip-only runtime", () => {
    const result = spawnSync(
      "node",
      [
        "--experimental-strip-types",
        "--input-type=module",
        "--eval",
        'await import("./src/lib/live/studioCampaignService.ts");'
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    expect(result.status, result.stderr).toBe(0);
  });

  it("uses TypeScript source extensions for protocol imports loaded by node strip-types", () => {
    for (const filePath of runtimeLoadedSourceFiles) {
      const source = readFileSync(filePath, "utf8");

      expect(source, filePath).not.toMatch(/packages\/protocol\/src\/[^"']+\.js["']/);
    }
  });

  it("wires the hosted participant, public configuration, route policy, and real chain probe dependencies", () => {
    const source = readRuntimeSource("scripts/serve-live.mjs");

    expect(source).toMatch(/import \{[^}]*classifyLiveApiRoute[^}]*\} from "\.\.\/src\/lib\/live\/liveRoutePolicy\.ts"/su);
    expect(source).toMatch(/import \{[^}]*issueLiveRunCapability[^}]*\} from "\.\.\/src\/lib\/live\/liveParticipantCapability\.ts"/su);
    expect(source).toMatch(/import \{[^}]*buildLivePublicConfig[^}]*\} from "\.\.\/src\/lib\/live\/livePublicConfig\.ts"/su);
    expect(source).toMatch(/import \{[^}]*probeLiveChainReadiness[^}]*\} from "\.\.\/src\/lib\/live\/liveChainReadiness\.ts"/su);
    expect(source).toMatch(/import \{[^}]*createPublicCampaignVersionApiHandler[^}]*createStudioCampaignVersionApiHandler[^}]*\} from "\.\.\/src\/lib\/live\/studioCampaignVersionApi\.ts"/su);
    expect(source).toMatch(/import \{[^}]*createStudioCampaignVersionService[^}]*\} from "\.\.\/src\/lib\/live\/studioCampaignVersionService\.ts"/su);
    expect(source).toContain("createPublicClient");
    expect(source).toContain("http(serverEnv.standardRpcUrl)");
    expect(source).toContain("issueRunCapability: issueLiveRunCapability");
    expect(source).toContain('verifierVersion: "gasok-staging-1"');
    expect(source).toContain("baseUrl: publicBaseUrl");
  });

  it("builds readiness from bounded live storage, schema, chain, signer, origin, and verifier checks", () => {
    const source = readRuntimeSource("scripts/serve-live.mjs");

    expect(source).toContain("await probeLiveChainReadiness(");
    expect(source).toContain("store.checkWritable()");
    expect(source).toContain("evaluateLiveSchemaState({");
    expect(source).toContain("requiredMigrations: ALL_REQUIRED_LIVE_MIGRATIONS");
    expect(source).toContain("chainReady:");
    expect(source).toContain("signerReady:");
    expect(source).toContain("originReady:");
    expect(source).toContain("verifierReady:");
    expect(source).not.toMatch(/sendJson\([^;]*(?:standardRpcUrl|campaignSignerPrivateKey|dbPath|publicOrigin)/su);
  });

  it("guards startup export writes in both immutable-release servers", () => {
    for (const filePath of ["scripts/serve-live.mjs", "scripts/serve-static.mjs"]) {
      const source = readRuntimeSource(filePath);
      expect(source, filePath).toContain('if (process.env.GIWA_SKIP_PUBLIC_EXPORT !== "1")');
      expect(source, filePath).toMatch(/if \(process\.env\.GIWA_SKIP_PUBLIC_EXPORT !== "1"\)\s*\{?\s*(?:await\s+)?exportFlowData\(\);?/u);
    }
  });

  it("prunes incomplete runs on startup and every exact six hours, then clears the timer on shutdown", () => {
    const source = readRuntimeSource("scripts/serve-live.mjs");

    expect(source).toContain("const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;");
    expect(source).toMatch(/incompleteRunRetentionHours\s*\*\s*60\s*\*\s*60\s*\*\s*1000/u);
    expect(source.match(/pruneIncompleteRuns\(/gu)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(source).toMatch(/pruneStaleIncompleteRuns\(\);[\s\S]{0,300}setInterval\(pruneStaleIncompleteRuns, PRUNE_INTERVAL_MS\)/u);
    expect(source).toMatch(/clearInterval\(pruneTimer\)[\s\S]{0,500}store\.close\(\)/u);
    expect(source).toMatch(/removedCount/u);
    expect(source).not.toMatch(/pruned[^\n]*(?:runId|dbPath)/iu);
  });

  it("registers one idempotent shutdown path for SIGTERM and SIGINT and closes HTTP before SQLite", () => {
    const source = readRuntimeSource("scripts/serve-live.mjs");
    const closeIndex = source.indexOf("server.close(");
    const storeCloseIndex = source.indexOf("store.close()", closeIndex);

    expect(source).toMatch(/let shutdownStarted = false/u);
    expect(source).toMatch(/if \(shutdownStarted\) return/u);
    expect(source).toContain('process.once("SIGTERM", shutdown);');
    expect(source).toContain('process.once("SIGINT", shutdown);');
    expect(closeIndex).toBeGreaterThan(-1);
    expect(storeCloseIndex).toBeGreaterThan(closeIndex);
    expect(source).toMatch(/setTimeout\([\s\S]{0,700}closeAllConnections/u);
    expect(source).toMatch(/clearInterval\(pruneTimer\)[\s\S]{0,700}server\.close\([\s\S]{0,700}store\.close\(\)/u);
    expect(source).not.toContain("process.exit(0)");
  });

  it("validates raw hosted DB configuration before any startup write and keeps it outside release roots", () => {
    const source = readRuntimeSource("scripts/serve-live.mjs");
    const readinessIndex = source.indexOf("buildRedactedLiveEnvReadiness({");
    const requireEnvIndex = source.indexOf("requireLiveServerEnv(loadedEnv.effectiveEnv)");
    const exportIndex = source.indexOf("exportFlowData();");
    const mkdirIndex = source.indexOf("mkdirSync(");
    const storeIndex = source.indexOf("createSqliteLiveStore(");

    expect(source).not.toMatch(/const dbPath = resolve\(workspaceRoot, process\.env\.GIWA_LIVE_DB_PATH \?\?/u);
    expect(source).toContain("GIWA_LIVE_DB_PATH: loadedEnv.effectiveEnv.GIWA_LIVE_DB_PATH");
    expect(source).not.toContain("GIWA_LIVE_DB_PATH: dbPath");
    expect(requireEnvIndex).toBeGreaterThan(readinessIndex);
    expect(exportIndex).toBeGreaterThan(requireEnvIndex);
    expect(mkdirIndex).toBeGreaterThan(requireEnvIndex);
    expect(storeIndex).toBeGreaterThan(mkdirIndex);
    expect(source).toContain("requireExternalHostedDbPath(serverEnv.dbPath)");
    expect(source).toMatch(/function isWithinRoot\([\s\S]{0,500}relative\(/u);
    expect(source).toMatch(/function requireExternalHostedDbPath\([\s\S]{0,1000}isAbsolute\([\s\S]{0,1000}isWithinRoot\(/u);
    expect(source).toContain('resolve("/opt/giwa/current")');
    expect(source).toContain('resolve("/opt/giwa/releases")');
  });

  it("uses strictly validated partner hashes and a loopback-only X-Real-IP identity", () => {
    const source = readRuntimeSource("scripts/serve-live.mjs");

    expect(source).toContain("parseLivePartnerCredentialHashes(");
    expect(source).toMatch(
      /authReady:\s*liveMode === "local" \|\|\s*\(credentialHashes\.length > 0 && studioAuthReadiness\.ok\)/u
    );
    expect(source).toContain("selectLiveClientIp({");
    expect(source).toContain('realIpHeader: request.headers["x-real-ip"]');
    expect(source).toContain("isIp: isIP");
    expect(source).not.toContain("x-forwarded-for");
    expect(source).not.toMatch(/console\.(?:log|error)\([^\n]*(?:credentialHashes|tokenHash)/u);
  });

  it("derives only one bounded download boolean and forwards API-owned response metadata", () => {
    const source = readRuntimeSource("scripts/serve-live.mjs");

    expect(source).toContain('url.searchParams.getAll("download")');
    expect(source).toContain("downloadRequested:");
    expect(source).toMatch(
      /downloadValues\.length === 1 && downloadValues\[0\] === "1"/u
    );
    expect(source).toMatch(
      /writeLiveJsonResponse\(response, result\.status, result\.body, result\.headers\)/u
    );
    expect(source).not.toMatch(
      /(?:query|string|search|searchParams):\s*(?:url\.search|request\.url)/u
    );
  });

  it("can be imported for focused adapter tests without starting the live runtime", () => {
    const source = readRuntimeSource("scripts/serve-live.mjs");

    expect(source).toMatch(
      /if \(invokedPath === resolve\(fileURLToPath\(import\.meta\.url\)\)\)/u
    );
    expect(source).not.toMatch(/\nstartLiveServer\(\)\.catch/u);
  });
});

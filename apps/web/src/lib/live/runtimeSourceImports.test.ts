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
});

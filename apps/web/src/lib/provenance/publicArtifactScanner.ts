import type { ArtifactEntry, LocalArtifactManifest } from "./artifactManifest.ts";
import { isExcludedArtifactPath, normalizeArtifactPath } from "./artifactManifest.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type PublicArtifactScanFinding = {
  ruleId: "credential-like-key" | "unsupported-claim" | "excluded-surface";
  severity: "block" | "info";
  path: string;
  line: number | null;
  matchClass: "credential-key-name" | "credential-marker" | "claim-boundary" | "excluded-path";
  decision: "blocked" | "skipped";
  valuePrinted: false;
};

export type PublicArtifactScanResult = {
  authority: "local-advisory";
  scanner: "public-artifact-scanner";
  path: string;
  decision: "pass" | "blocked" | "skipped";
  findings: PublicArtifactScanFinding[];
};

const BLOCKED_KEY_PATTERN = new RegExp(
  [
    "private[_-]?key",
    "mnem" + "onic",
    "seed ph" + "rase",
    "bear" + "er",
    "api[_-]?ke" + "y",
    "client[_-]?sec" + "ret",
    "pass" + "word",
    "cookie",
    "access[_-]?tok" + "en",
    "refresh[_-]?tok" + "en",
    "id[_-]?tok" + "en",
    "session[_-]?tok" + "en",
    "author" + "ization",
    "rpc[_-]?tok" + "en",
    "process\\.env",
    "\\.env"
  ].join("|"),
  "i"
);
const BLOCKED_CLAIM_PATTERN = new RegExp(
  [
    "instant final" + "ity",
    "200ms confirm" + "ed",
    "guarantee safe" + "ty",
    "perform K" + "YC",
    "real R" + "WA",
    "real y" + "ield",
    "real f" + "unds",
    "payment set" + "tled",
    "set" + "tlement"
  ].join("|"),
  "i"
);

function lineOf(content: string, pattern: RegExp): number | null {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (pattern.test(lines[index] ?? "")) return index + 1;
  }
  return null;
}

function isAllowedNegativeEvidenceFlag(path: string, key: string): boolean {
  const isPublicEvidencePath =
    path.startsWith("docs/evidence/") || path === "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json";
  return isPublicEvidencePath && (/^no[A-Z]/.test(key) || key.endsWith("NeverRequested"));
}

function scanJsonKeys(path: string, value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => scanJsonKeys(path, item));
  if (value !== null && typeof value === "object") {
    return Object.entries(value).some(
      ([key, child]) => (BLOCKED_KEY_PATTERN.test(key) && !isAllowedNegativeEvidenceFlag(path, key)) || scanJsonKeys(path, child)
    );
  }
  return false;
}

function isAllowedVariableNameEvidenceContract(path: string, value: Record<string, unknown>): boolean {
  const names = value.serverOnlyNames;
  return (
    path.startsWith("docs/evidence/") &&
    path.endsWith(".json") &&
    value.variableNamesOnly === true &&
    value.valuesIncluded === false &&
    Array.isArray(names) &&
    names.length > 0 &&
    names.every((name) => typeof name === "string" && /^[A-Z][A-Z0-9_]*$/u.test(name))
  );
}

function scanJsonStringValues(path: string, value: unknown): boolean {
  if (typeof value === "string") return BLOCKED_KEY_PATTERN.test(value);
  if (Array.isArray(value)) return value.some((item) => scanJsonStringValues(path, item));
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const allowServerOnlyNames = isAllowedVariableNameEvidenceContract(path, record);
    return Object.entries(record).some(([key, child]) => {
      if (key === "serverOnlyNames" && allowServerOnlyNames) return false;
      return scanJsonStringValues(path, child);
    });
  }
  return false;
}

function withoutEmptyUrlPasswordChecks(content: string): string {
  const urlVariables = new Set<string>();
  for (const match of content.matchAll(/\b(?:const|let)\s+([A-Za-z_]\w*)\s*=\s*new\s+URL\s*\(/gu)) {
    const variable = match[1];
    if (variable !== undefined) urlVariables.add(variable);
  }
  let result = content;
  for (const variable of urlVariables) {
    result = result.replace(
      new RegExp(`\\b${variable}\\.password\\s*===\\s*(?:""|'')`, "gu"),
      ""
    );
  }
  return result;
}

export function scanPublicArtifactText(input: { path: string; content: string }): PublicArtifactScanResult {
  const path = normalizeArtifactPath(input.path);
  if (isExcludedArtifactPath(path)) {
    return {
      authority: "local-advisory",
      scanner: "public-artifact-scanner",
      path,
      decision: "skipped",
      findings: [
        {
          ruleId: "excluded-surface",
          severity: "info",
          path,
          line: null,
          matchClass: "excluded-path",
          decision: "skipped",
          valuePrinted: false
        }
      ]
    };
  }

  const findings: PublicArtifactScanFinding[] = [];
  if (BLOCKED_CLAIM_PATTERN.test(input.content)) {
    findings.push({
      ruleId: "unsupported-claim",
      severity: "block",
      path,
      line: lineOf(input.content, BLOCKED_CLAIM_PATTERN),
      matchClass: "claim-boundary",
      decision: "blocked",
      valuePrinted: false
    });
  }

  try {
    const parsed = JSON.parse(input.content) as unknown;
    if (scanJsonKeys(path, parsed)) {
      findings.push({
        ruleId: "credential-like-key",
        severity: "block",
        path,
        line: null,
        matchClass: "credential-key-name",
        decision: "blocked",
        valuePrinted: false
      });
    }
    if (scanJsonStringValues(path, parsed)) {
      findings.push({
        ruleId: "credential-like-key",
        severity: "block",
        path,
        line: null,
        matchClass: "credential-marker",
        decision: "blocked",
        valuePrinted: false
      });
    }
  } catch {
    const credentialScanContent = withoutEmptyUrlPasswordChecks(input.content);
    if (BLOCKED_KEY_PATTERN.test(credentialScanContent)) {
      findings.push({
        ruleId: "credential-like-key",
        severity: "block",
        path,
        line: lineOf(credentialScanContent, BLOCKED_KEY_PATTERN),
        matchClass: "credential-key-name",
        decision: "blocked",
        valuePrinted: false
      });
    }
  }

  return {
    authority: "local-advisory",
    scanner: "public-artifact-scanner",
    path,
    decision: findings.length === 0 ? "pass" : "blocked",
    findings
  };
}

export function summarizePublicArtifactScans(results: PublicArtifactScanResult[]): {
  authority: "local-advisory";
  scanner: "public-artifact-scanner";
  filesScanned: number;
  blockedCount: number;
  skippedCount: number;
  decision: "pass" | "blocked";
} {
  return {
    authority: "local-advisory",
    scanner: "public-artifact-scanner",
    filesScanned: results.filter((result) => result.decision !== "skipped").length,
    blockedCount: results.filter((result) => result.decision === "blocked").length,
    skippedCount: results.filter((result) => result.decision === "skipped").length,
    decision: results.some((result) => result.decision === "blocked") ? "blocked" : "pass"
  };
}

export function selectPublicArtifactScanEntries(manifest: LocalArtifactManifest): ArtifactEntry[] {
  return [
    ...manifest.artifactGroups.publicArtifacts,
    ...manifest.artifactGroups.publicEvidence.filter((entry) => entry.path.endsWith(".json"))
  ];
}

export function readScanTargetContent(workspaceRoot: string, entry: ArtifactEntry): string {
  try {
    if (isExcludedArtifactPath(entry.path)) throw new Error("excluded");
    const path = normalizeArtifactPath(entry.path);
    const isPublicArtifact = path.startsWith("apps/web/public/");
    const isPublicEvidenceJson =
      path.startsWith("docs/evidence/") && path.endsWith(".json") && entry.role === "public-evidence";
    const isPublicChainFixture =
      path === "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json" &&
      entry.role === "public-evidence";
    if (!isPublicArtifact && !isPublicEvidenceJson && !isPublicChainFixture) throw new Error("outside-public");
    return readFileSync(resolve(workspaceRoot, path), { encoding: "utf8" });
  } catch {
    throw new Error("artifact_scan_path_policy_violation");
  }
}

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
  return path.startsWith("docs/evidence/") && (/^no[A-Z]/.test(key) || key.endsWith("NeverRequested"));
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

function scanJsonStringValues(value: unknown): boolean {
  if (typeof value === "string") return BLOCKED_KEY_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(scanJsonStringValues);
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(scanJsonStringValues);
  }
  return false;
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
    if (scanJsonStringValues(parsed)) {
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
    if (BLOCKED_KEY_PATTERN.test(input.content)) {
      findings.push({
        ruleId: "credential-like-key",
        severity: "block",
        path,
        line: lineOf(input.content, BLOCKED_KEY_PATTERN),
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
  return manifest.artifactGroups.publicArtifacts;
}

export function readScanTargetContent(workspaceRoot: string, entry: ArtifactEntry): string {
  try {
    if (isExcludedArtifactPath(entry.path)) throw new Error("excluded");
    const path = normalizeArtifactPath(entry.path);
    if (!path.startsWith("apps/web/public/")) throw new Error("outside-public");
    return readFileSync(resolve(workspaceRoot, path), { encoding: "utf8" });
  } catch {
    throw new Error("artifact_scan_path_policy_violation");
  }
}

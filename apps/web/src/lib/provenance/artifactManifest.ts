import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

export type ArtifactInputEntry = {
  path: string;
  content: string | Uint8Array;
};

export type ArtifactEntry = {
  path: string;
  role: "package-metadata" | "public-served-artifact" | "public-evidence" | "implementation-doc";
  required: boolean;
  sha256: string;
  bytes: number;
  scanDecision: "pass" | "pass-or-blocked";
  generatedBy: string;
  schemaPath: string | null;
};

export type IgnoredPublicArtifact = {
  path: string;
  reason: "unsupported-extension";
};

export type LocalArtifactManifest = {
  schemaVersion: "1";
  manifestKind: "local-artifact-manifest";
  authority: "local-advisory";
  generatedAt: string;
  releaseGrade: false;
  canUnblockStaging: false;
  hashPolicy: {
    fileHashAlgorithm: "sha256";
    fileHashInput: "raw-file-bytes";
    pathStyle: "repo-relative-posix";
    aggregateLineEnding: "lf";
    aggregateSort: "normalized-path-ascending";
  };
  sourceState: {
    gitDirectory: boolean;
    githubDirectory: boolean;
    workflowDirectory: boolean;
    sourceAuthority: "local-non-git-advisory";
  };
  artifactGroups: {
    packageMetadata: ArtifactEntry[];
    publicArtifacts: ArtifactEntry[];
    publicEvidence: ArtifactEntry[];
    implementationDocs: ArtifactEntry[];
  };
  ignoredPublicArtifacts: IgnoredPublicArtifact[];
  equivalenceGroups: Array<{
    name: string;
    mustShareSha256: true;
    paths: string[];
    decision: "pass" | "missing" | "mismatch";
    sha256: string | null;
  }>;
  domainHashes: Array<{
    name: "intentHash" | "verifierInputHash" | "receiptHash";
    algorithm: "keccak256";
    source: "public evidence";
    value: string;
  }>;
  scanSummary: {
    scanner: "public-artifact-scanner";
    decision: "pass-or-blocked";
  };
  buildTreeSha256: string;
  unmanifestedFilePolicy: "fail";
};

export type LocalProvenanceReport = {
  schemaVersion: "1";
  reportKind: "local-provenance-report";
  authority: "local-advisory";
  generatedAt: string;
  manifestPath: "docs/evidence/local-artifact-manifest.json";
  artifactManifestSha256: string;
  artifactManifestBytes: number;
  buildTreeSha256: string;
  reportHashPolicy: "external-only";
  releaseGrade: false;
  canUnblockStaging: false;
  blockedProtectedFields: ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"];
  advisoryChecks: Array<{
    name: string;
    decision: "pass-or-blocked" | "blocked";
  }>;
  blockedActions: {
    chainOperations: "not-run";
    walletActions: "not-run";
    publicHosting: "not-run";
    deployment: "not-run";
    dependencyChanges: "not-run";
    protectedCi: "absent";
  };
  releaseGateStatus: "blocked-until-protected-ci-and-release-approval";
};

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const OUTPUT_PATHS = new Set([
  "docs/evidence/local-artifact-manifest.json",
  "docs/evidence/local-command-evidence-report.json",
  "docs/evidence/local-provenance-report.json",
  "docs/evidence/local-provenance-report.json.sha256",
  "docs/evidence/local-provenance-verification.json",
  "docs/evidence/giwa-local-advisory-artifact-manifest.json",
  "docs/evidence/giwa-local-advisory-provenance-report.json",
  "docs/evidence/giwa-local-advisory-provenance-report.json.sha256"
]);
const PACKAGE_METADATA_PATHS = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "apps/web/package.json",
  "packages/protocol/package.json",
  "packages/contracts/package.json"
]);
const PUBLIC_EXTENSIONS = new Set([".html", ".js", ".css", ".json"]);
const EVIDENCE_EXTENSIONS = new Set([".json", ".md"]);
const IMPLEMENTATION_EXTENSIONS = new Set([".md"]);
const EQUIVALENCE_GROUPS = [
  {
    name: "live-demo-snapshot-public-copy",
    paths: ["docs/evidence/live-demo-sprint12-snapshot.json", "apps/web/public/live-demo-snapshot.json"]
  },
  {
    name: "giwa-sepolia-chain-evidence-copy",
    paths: [
      "docs/evidence/giwa-sepolia-chain-anchor.json",
      "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json"
    ]
  }
] as const;
const HASH_FIELD_NAMES = ["intentHash", "verifierInputHash", "receiptHash"] as const;

export function normalizeArtifactPath(input: string): string {
  if (/^[A-Za-z]:[\\/]/.test(input) || isAbsolute(input)) {
    throw new Error("artifact path must be repo-relative");
  }
  const normalized = input.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");
  if (normalized.length === 0) throw new Error("artifact path must be non-empty");
  if (normalized.split("/").some((part) => part === "..")) {
    throw new Error("artifact path must stay inside the workspace");
  }
  return normalized;
}

export function isExcludedArtifactPath(path: string): boolean {
  const normalized = normalizeArtifactPath(path);
  if (OUTPUT_PATHS.has(normalized)) return true;
  if (normalized === ".env" || normalized === ".env.local" || normalized.startsWith(".env.")) return true;
  if (normalized === ".git" || normalized.startsWith(".git/")) return true;
  if (normalized === ".github" || normalized.startsWith(".github/")) return true;
  if (normalized === "apps/web/.data" || normalized.startsWith("apps/web/.data/")) return true;
  if (normalized.startsWith("packages/contracts/cache/")) return true;
  if (normalized.startsWith("packages/contracts/artifacts/")) return true;
  if (normalized.startsWith("packages/contracts/typechain-types/")) return true;
  if (normalized.endsWith(".sqlite") || normalized.endsWith(".db")) return true;
  if (normalized.endsWith(".raw.json") || normalized.endsWith(".private.json")) return true;
  return normalized
    .split("/")
    .some((part) => part === "node_modules" || part === ".next" || part === "dist" || part === "coverage" || part === ".turbo" || part === ".engram");
}

export function sha256Hex(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? TEXT_ENCODER.encode(data) : data;
  return createHash("sha256").update(bytes).digest("hex");
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function bytesOf(content: string | Uint8Array): Uint8Array {
  return typeof content === "string" ? TEXT_ENCODER.encode(content) : content;
}

function groupForPath(path: string): ArtifactEntry["role"] | null {
  const extension = extname(path);
  if (PACKAGE_METADATA_PATHS.has(path)) return "package-metadata";
  if (path.startsWith("apps/web/public/") && PUBLIC_EXTENSIONS.has(extension)) return "public-served-artifact";
  if (path.startsWith("docs/evidence/") && EVIDENCE_EXTENSIONS.has(extension)) return "public-evidence";
  if (path === "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json") return "public-evidence";
  if (path.startsWith("docs/implementation/") && IMPLEMENTATION_EXTENSIONS.has(extension)) return "implementation-doc";
  return null;
}

function generatedByForPath(path: string): string {
  if (path === "apps/web/public/flow-data.json") return "pnpm --filter @giwa/web --fail-if-no-match build";
  if (path === "apps/web/public/partner-snapshot.json") return "pnpm --filter @giwa/web --fail-if-no-match build";
  if (path === "apps/web/public/live-demo-snapshot.json") return "approved local live snapshot export or checked-in public artifact";
  if (path === "docs/evidence/live-demo-sprint12-snapshot.json") return "approved local live snapshot export or checked-in public artifact";
  return "checked-in-public-safe-input";
}

function schemaPathForPath(path: string): string | null {
  if (path === "apps/web/public/live-demo-snapshot.json") return "docs/evidence/live-demo-sprint12-snapshot.schema.md";
  if (path === "docs/evidence/live-demo-sprint12-snapshot.json") return "docs/evidence/live-demo-sprint12-snapshot.schema.md";
  if (path === "docs/evidence/giwa-sepolia-mvp-evidence.json") return "docs/evidence/giwa-sepolia-mvp-evidence.schema.md";
  return null;
}

function toArtifactEntry(input: ArtifactInputEntry): ArtifactEntry | null {
  const path = normalizeArtifactPath(input.path);
  if (isExcludedArtifactPath(path)) return null;
  const role = groupForPath(path);
  if (role === null) return null;
  const bytes = bytesOf(input.content);
  return {
    path,
    role,
    required: true,
    sha256: sha256Hex(bytes),
    bytes: bytes.byteLength,
    scanDecision: "pass-or-blocked",
    generatedBy: generatedByForPath(path),
    schemaPath: schemaPathForPath(path)
  };
}

function buildIgnoredPublicArtifacts(inputs: ArtifactInputEntry[]): IgnoredPublicArtifact[] {
  return inputs
    .map((input) => normalizeArtifactPath(input.path))
    .filter((path) => path.startsWith("apps/web/public/") && !isExcludedArtifactPath(path) && groupForPath(path) === null)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((path) => ({ path, reason: "unsupported-extension" }));
}

function sortedEntries(entries: ArtifactEntry[]): ArtifactEntry[] {
  return [...entries].sort((left, right) => left.path.localeCompare(right.path, "en"));
}

function buildTreeSha256(entries: ArtifactEntry[]): string {
  const lines = sortedEntries(entries).map((entry) => `${entry.sha256}  ${entry.path}\n`).join("");
  return sha256Hex(lines);
}

function extractDomainHashes(inputs: ArtifactInputEntry[]): LocalArtifactManifest["domainHashes"] {
  const values = new Map<string, LocalArtifactManifest["domainHashes"][number]>();

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (
        HASH_FIELD_NAMES.includes(key as (typeof HASH_FIELD_NAMES)[number]) &&
        typeof child === "string" &&
        /^0x[a-fA-F0-9]{64}$/.test(child)
      ) {
        const name = key as "intentHash" | "verifierInputHash" | "receiptHash";
        values.set(`${name}:${child.toLowerCase()}`, {
          name,
          algorithm: "keccak256",
          source: "public evidence",
          value: child.toLowerCase()
        });
      }
      visit(child);
    }
  };

  for (const input of inputs) {
    const path = normalizeArtifactPath(input.path);
    if (!path.startsWith("docs/evidence/") || !path.endsWith(".json") || isExcludedArtifactPath(path)) continue;
    const content = typeof input.content === "string" ? input.content : TEXT_DECODER.decode(input.content);
    try {
      visit(JSON.parse(content) as unknown);
    } catch {
      continue;
    }
  }

  return [...values.values()].sort((left, right) => `${left.name}:${left.value}`.localeCompare(`${right.name}:${right.value}`, "en"));
}

function buildEquivalenceGroups(entries: ArtifactEntry[]): LocalArtifactManifest["equivalenceGroups"] {
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  return EQUIVALENCE_GROUPS.map((group) => {
    const groupEntries = group.paths.map((path) => byPath.get(path));
    const missing = groupEntries.some((entry) => entry === undefined);
    const hashes = new Set(groupEntries.filter((entry) => entry !== undefined).map((entry) => entry.sha256));
    return {
      name: group.name,
      mustShareSha256: true,
      paths: [...group.paths],
      decision: missing ? "missing" : hashes.size === 1 ? "pass" : "mismatch",
      sha256: !missing && hashes.size === 1 ? [...hashes][0] ?? null : null
    };
  });
}

export function buildLocalArtifactManifestFromEntries(
  inputs: ArtifactInputEntry[],
  options: { generatedAt: string; sourceState?: Partial<LocalArtifactManifest["sourceState"]> }
): LocalArtifactManifest {
  const entries = sortedEntries(inputs.map(toArtifactEntry).filter((entry): entry is ArtifactEntry => entry !== null));
  const packageMetadata = sortedEntries(entries.filter((entry) => entry.role === "package-metadata"));
  const publicArtifacts = sortedEntries(entries.filter((entry) => entry.role === "public-served-artifact"));
  const publicEvidence = sortedEntries(entries.filter((entry) => entry.role === "public-evidence"));
  const implementationDocs = sortedEntries(entries.filter((entry) => entry.role === "implementation-doc"));

  return {
    schemaVersion: "1",
    manifestKind: "local-artifact-manifest",
    authority: "local-advisory",
    generatedAt: options.generatedAt,
    releaseGrade: false,
    canUnblockStaging: false,
    hashPolicy: {
      fileHashAlgorithm: "sha256",
      fileHashInput: "raw-file-bytes",
      pathStyle: "repo-relative-posix",
      aggregateLineEnding: "lf",
      aggregateSort: "normalized-path-ascending"
    },
    sourceState: {
      gitDirectory: options.sourceState?.gitDirectory ?? false,
      githubDirectory: options.sourceState?.githubDirectory ?? false,
      workflowDirectory: options.sourceState?.workflowDirectory ?? false,
      sourceAuthority: "local-non-git-advisory"
    },
    artifactGroups: {
      packageMetadata,
      publicArtifacts,
      publicEvidence,
      implementationDocs
    },
    ignoredPublicArtifacts: buildIgnoredPublicArtifacts(inputs),
    equivalenceGroups: buildEquivalenceGroups(entries),
    domainHashes: extractDomainHashes(inputs),
    scanSummary: {
      scanner: "public-artifact-scanner",
      decision: "pass-or-blocked"
    },
    buildTreeSha256: buildTreeSha256(entries),
    unmanifestedFilePolicy: "fail"
  };
}

export function validateLocalArtifactManifest(manifest: LocalArtifactManifest): void {
  if (manifest.ignoredPublicArtifacts.length > 0) {
    throw new Error("artifact_public_file_not_manifested");
  }
  const failedEquivalenceGroup = manifest.equivalenceGroups.find((group) => group.decision !== "pass");
  if (failedEquivalenceGroup !== undefined) {
    throw new Error("artifact_equivalence_group_failed");
  }
}

export function buildLocalProvenanceReport(
  manifest: LocalArtifactManifest,
  options: { generatedAt: string }
): { report: LocalProvenanceReport; reportSha256: string } {
  const manifestJson = stableJson(manifest);
  const report: LocalProvenanceReport = {
    schemaVersion: "1",
    reportKind: "local-provenance-report",
    authority: "local-advisory",
    generatedAt: options.generatedAt,
    manifestPath: "docs/evidence/local-artifact-manifest.json",
    artifactManifestSha256: sha256Hex(manifestJson),
    artifactManifestBytes: TEXT_ENCODER.encode(manifestJson).byteLength,
    buildTreeSha256: manifest.buildTreeSha256,
    reportHashPolicy: "external-only",
    releaseGrade: false,
    canUnblockStaging: false,
    blockedProtectedFields: ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"],
    advisoryChecks: [
      { name: "artifactInventory", decision: "pass-or-blocked" },
      { name: "redactedPublicArtifactScan", decision: "pass-or-blocked" },
      { name: "protectedCi", decision: "blocked" }
    ],
    blockedActions: {
      chainOperations: "not-run",
      walletActions: "not-run",
      publicHosting: "not-run",
      deployment: "not-run",
      dependencyChanges: "not-run",
      protectedCi: "absent"
    },
    releaseGateStatus: "blocked-until-protected-ci-and-release-approval"
  };
  return { report, reportSha256: sha256Hex(stableJson(report)) };
}

function collectFilesRecursively(root: string, directory: string): ArtifactInputEntry[] {
  if (!existsSync(directory)) return [];
  const entries: ArtifactInputEntry[] = [];
  for (const dirent of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, dirent.name);
    const relativePath = normalizeArtifactPath(relative(root, absolutePath));
    if (isExcludedArtifactPath(relativePath)) continue;
    if (dirent.isDirectory()) {
      entries.push(...collectFilesRecursively(root, absolutePath));
      continue;
    }
    if (dirent.isFile() && (groupForPath(relativePath) !== null || relativePath.startsWith("apps/web/public/"))) {
      entries.push({ path: relativePath, content: readFileSync(absolutePath) });
    }
  }
  return entries;
}

export function collectLocalArtifactEntries(workspaceRoot: string): ArtifactInputEntry[] {
  const root = resolve(workspaceRoot);
  const entries: ArtifactInputEntry[] = [];

  for (const path of PACKAGE_METADATA_PATHS) {
    const absolutePath = join(root, path);
    if (existsSync(absolutePath)) entries.push({ path, content: readFileSync(absolutePath) });
  }

  for (const directory of ["apps/web/public", "docs/evidence", "docs/implementation"]) {
    entries.push(...collectFilesRecursively(root, join(root, directory)));
  }

  const chainFixturePath = "packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json";
  const chainFixtureAbsolutePath = join(root, chainFixturePath);
  if (existsSync(chainFixtureAbsolutePath)) entries.push({ path: chainFixturePath, content: readFileSync(chainFixtureAbsolutePath) });

  return entries.sort((left, right) => normalizeArtifactPath(left.path).localeCompare(normalizeArtifactPath(right.path), "en"));
}

export function buildLocalArtifactManifest(workspaceRoot: string, generatedAt: string): LocalArtifactManifest {
  const root = resolve(workspaceRoot);
  return buildLocalArtifactManifestFromEntries(collectLocalArtifactEntries(root), {
    generatedAt,
    sourceState: {
      gitDirectory: existsSync(join(root, ".git")),
      githubDirectory: existsSync(join(root, ".github")),
      workflowDirectory: existsSync(join(root, ".github", "workflows"))
    }
  });
}

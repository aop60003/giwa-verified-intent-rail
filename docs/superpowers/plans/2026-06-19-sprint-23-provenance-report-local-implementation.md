# Sprint 23 Provenance Report Local Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development with superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the local-advisory provenance report so it can be recomputed, checked for drift, and bound to artifact, scan, command, domain-hash, and blocker evidence without claiming protected CI authority.

**Architecture:** Sprint 23 builds a verification layer around the Sprint 22 local artifact manifest. It does not repeat inventory generation; it validates report-to-manifest binding, scanner binding, command-evidence binding, domain hash classification, known blocker state, and external-only report hashing.

**Tech Stack:** Existing pnpm workspace, Node.js scripts with `node --experimental-strip-types`, TypeScript/Vitest in `@giwa/web`, existing `viem` dependency, no new dependency.

---

## Scope

Sprint 23 answers these questions:

- does `docs/evidence/local-provenance-report.json` bind to the exact bytes of `docs/evidence/local-artifact-manifest.json`
- can the report be recomputed without timestamp false positives
- can current filesystem artifacts be compared against the checked local manifest without reading excluded surfaces
- are scanner results folded into the report with terminal decisions only
- are command results represented as redacted local-advisory evidence rather than raw logs
- are `intentHash`, `verifierInputHash`, and `receiptHash` classified as extracted or recomputed evidence
- are known blockers carried forward without unblocking staging or protected release flow

Output authority remains:

```text
authority=local-advisory
```

## Non-Goals

Sprint 23 does not:

- create `.git`
- initialize a repository
- create `.github`
- create workflow files
- create CI scripts
- public-host or deploy
- connect managed infrastructure
- send wallet actions
- run GIWA chain-operation commands
- run mint commands
- install dependencies
- create release tags
- create fake CI results
- create fake artifact hashes
- claim protected CI, staging promotion, or release approval

## Parallel Analysis Incorporated

1. Provenance report schema reviewer: replace `pass-or-blocked` placeholders with terminal decisions and bind scanner counts into the report.
2. Report recomputation reviewer: split `report:check` from `drift:check` so `generatedAt` changes do not create false drift.
3. Artifact manifest binding reviewer: verify raw manifest bytes, manifest byte length, and `buildTreeSha256` from the checked manifest.
4. Local CI evidence binding reviewer: add a fixed command catalog, command evidence JSON, redacted output hashes, and mutation decisions.
5. Domain hash and receipt evidence reviewer: separate file hashes from protocol hashes, classify extracted versus recomputed domain hashes, and keep `decisionTxHash` as a chain reference.
6. Redacted public export reviewer: bind served-public scanner results, make scan output metadata-only, and document scanner limits.
7. Failure and drift detection reviewer: add explicit failure ids for stale manifest, stale report, public artifact drift, output self-inclusion, and authority confusion.
8. Future protected CI integration reviewer: keep local outputs advisory, reserve source commit, CI run, workflow, and promotion fields for a later approved protected-CI sprint.

## Sprint 22 Non-Duplication Boundary

Sprint 22 already implemented:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-provenance-report.json
apps/web/scripts/export-artifact-manifest.mjs
apps/web/src/lib/provenance/artifactManifest.ts
apps/web/src/lib/provenance/publicArtifactScanner.ts
```

Sprint 23 must not re-solve artifact inventory. It consumes the Sprint 22 manifest and strengthens the report and check layer around it.

## Current Sprint 22 Baseline

Sprint 23 starts from these local-advisory facts:

```text
localArtifactManifestPath=docs/evidence/local-artifact-manifest.json
localProvenanceReportPath=docs/evidence/local-provenance-report.json
artifactManifestSha256=107ef6092816bea682bc20a5edb9a6c411826dd098caf2cb3766e0ace8a07868
localProvenanceReportSha256=3a521ddb8888f16232ed9d965c650556f65539b89e6f9529e5e4896b106aa837
buildTreeSha256=9c80fd5d3d778eef515fb37b194e6f214a8170f597b05922f0a2e90a18ad5271
publicArtifactCount=10
ignoredPublicArtifacts=0
failedEquivalenceGroups=0
authority=local-advisory
releaseGrade=false
canUnblockStaging=false
```

Those values are useful as local consistency inputs. They do not prove immutable source identity, protected workflow execution, required check enforcement, release approval, or staging readiness.

## Target Output Contract

Enhanced local provenance report shape:

```json
{
  "schemaVersion": "1",
  "reportKind": "local-provenance-report",
  "authority": "local-advisory",
  "generatedAt": "ISO-8601",
  "releaseGrade": false,
  "canUnblockStaging": false,
  "manifestBinding": {
    "manifestPath": "docs/evidence/local-artifact-manifest.json",
    "manifestKind": "local-artifact-manifest",
    "manifestAuthority": "local-advisory",
    "artifactManifestSha256": "computed-from-raw-manifest-bytes",
    "artifactManifestBytes": 23996,
    "buildTreeSha256": "copied-and-recomputed-from-manifest",
    "artifactGroupCounts": {
      "packageMetadata": 7,
      "publicArtifacts": 10,
      "publicEvidence": 6,
      "implementationDocs": 32
    },
    "equivalenceGroups": {
      "passed": 2,
      "blocked": 0
    },
    "domainHashCount": 6
  },
  "scanBinding": {
    "scanner": "public-artifact-scanner",
    "scope": "served-public-artifacts",
    "decision": "pass",
    "filesScanned": 10,
    "blockedCount": 0,
    "skippedCount": 0,
    "findingCount": 0,
    "valuePrinted": false
  },
  "commandEvidenceBinding": {
    "path": "docs/evidence/local-command-evidence-report.json",
    "sha256": "computed-when-command-evidence-is-written",
    "bytes": 0,
    "decision": "pass"
  },
  "domainHashBinding": [
    {
      "name": "receiptHash",
      "value": "0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8",
      "sourcePath": "docs/evidence/live-demo-sprint12-snapshot.json",
      "jsonPointer": "/run/receiptHash",
      "derivation": "recomputed",
      "decision": "pass"
    }
  ],
  "knownBlockers": [
    {
      "id": "source-provenance",
      "status": "blocked",
      "reason": ".git is absent"
    },
    {
      "id": "protected-ci",
      "status": "blocked",
      "reason": ".github workflows are absent"
    }
  ],
  "reportHashPolicy": "external-only",
  "sidecar": {
    "path": "docs/evidence/local-provenance-report.json.sha256",
    "algorithm": "sha256",
    "decision": "pass"
  },
  "blockedProtectedFields": [
    "sourceCommit",
    "ciRunId",
    "releaseTag",
    "promotionDecision"
  ],
  "releaseGateStatus": "blocked-until-protected-ci-and-release-approval"
}
```

The report must not contain its own hash inline. The report hash is carried by stdout and by `docs/evidence/local-provenance-report.json.sha256`.

Protected CI handoff shape:

```json
{
  "handoffKind": "local-to-protected-ci-handoff",
  "authority": "local-advisory",
  "localManifestPath": "docs/evidence/local-artifact-manifest.json",
  "localProvenanceReportPath": "docs/evidence/local-provenance-report.json",
  "localBuildTreeSha256": "local-only-reference",
  "releaseGrade": false,
  "canUnblockStaging": false,
  "blockedProtectedFields": [
    "sourceCommit",
    "ciRunId",
    "releaseTag",
    "promotionDecision"
  ],
  "reservedProtectedOutputs": [
    "docs/evidence/giwa-staging-artifact-manifest.json",
    "docs/evidence/giwa-staging-provenance-report.json"
  ],
  "requiredBeforeProtectedFill": [
    ".git=True",
    ".github=True",
    "workflowPathReviewed",
    "protectedBranchRecorded",
    "requiredChecksEnabled",
    "freshCheckoutFrozenInstallPassed",
    "ciGeneratedManifest",
    "ciGeneratedProvenanceReport"
  ],
  "decision": "blocked-until-repository-transition-and-workflow-approval"
}
```

The handoff contract maps local fields to future protected-CI fields. It must not copy local values into staging provenance outputs.

Command evidence report shape:

```json
{
  "schemaVersion": "1",
  "reportKind": "local-command-evidence-report",
  "authority": "local-advisory",
  "generatedAt": "ISO-8601",
  "releaseGrade": false,
  "canUnblockStaging": false,
  "commandCatalogSource": {
    "packageManager": "pnpm@10.32.1",
    "packageMetadata": [
      { "path": "package.json", "sha256": "computed" },
      { "path": "apps/web/package.json", "sha256": "computed" },
      { "path": "pnpm-lock.yaml", "sha256": "computed" }
    ]
  },
  "sourceState": {
    "gitDirectory": false,
    "githubDirectory": false,
    "workflowDirectory": false,
    "sourceAuthority": "local-non-git-advisory"
  },
  "results": [
    {
      "id": "web-test-provenance",
      "kind": "test",
      "command": ["pnpm", "--filter", "@giwa/web", "--fail-if-no-match", "test", "--", "provenance"],
      "packageScript": "@giwa/web:test",
      "timeoutMs": 120000,
      "status": "passed",
      "exitCode": 0,
      "durationMs": 0,
      "output": {
        "stdoutBytes": 0,
        "stderrBytes": 0,
        "stdoutRedactedSha256": "computed",
        "stderrRedactedSha256": "computed",
        "rawOutputStored": false
      },
      "redaction": {
        "decision": "pass",
        "findingsCount": 0,
        "valuePrinted": false
      },
      "artifactBinding": {
        "inputManifestPath": "docs/evidence/local-artifact-manifest.json",
        "inputManifestSha256": "computed",
        "inputBuildTreeSha256": "computed",
        "postCommandManifestSha256": "computed",
        "postCommandBuildTreeSha256": "computed",
        "changedArtifactPaths": [],
        "mutationDecision": "unchanged"
      }
    }
  ],
  "aggregate": {
    "decision": "pass",
    "passed": 1,
    "failed": 0,
    "blocked": 0,
    "timedOut": 0
  }
}
```

## Failure Ids

| Error id | Meaning | Required response |
| --- | --- | --- |
| `PROV_NON_TERMINAL_DECISION` | generated evidence still contains `pass-or-blocked` | replace with `pass`, `blocked`, or `skipped` |
| `PROV_MANIFEST_HASH_MISMATCH` | report manifest hash differs from raw manifest bytes | regenerate report or inspect manifest drift |
| `PROV_MANIFEST_BYTE_MISMATCH` | report manifest byte length differs from actual bytes | regenerate report or inspect write policy |
| `PROV_BUILD_TREE_MISMATCH` | report and manifest disagree on build tree hash | recompute from manifest entries and fail closed |
| `PROV_TIMESTAMP_FALSE_DRIFT` | timestamp-only changes are treated as artifact drift | split report recomputation from filesystem drift checks |
| `PROV_PUBLIC_ARTIFACT_DRIFT` | current served public file differs from checked manifest | block report verification and refresh manifest intentionally |
| `PROV_REPORT_ONLY_DRIFT` | report fields are changed while manifest is stable | fail `report:check` |
| `PROV_REPORT_SIDECAR_MISMATCH` | `.sha256` sidecar does not match report bytes | rewrite sidecar from report bytes |
| `PROV_OUTPUT_SELF_INCLUDED` | local output file is included in manifest inputs | keep generated output paths excluded |
| `PROV_SCAN_FINDING` | scanner returns a blocked finding | block report generation and print metadata only |
| `PROV_SCAN_VALUE_OUTPUT` | scanner output contains matched sensitive text | quarantine output and fix scanner |
| `PROV_DOMAIN_HASH_REPLAY_MISSING` | stored domain hash lacks replayable payload material | mark domain hash evidence as blocked, not recomputed |
| `PROV_DECISION_TX_HASH_MISCLASSIFIED` | `decisionTxHash` is treated as a canonical payload hash | move it to chain reference evidence |
| `PROV_PROTECTED_FIELD_POPULATED` | local output fills protected source or CI fields | fail report generation |
| `PROV_LOCAL_AUTHORITY_CONFUSION` | local output is treated as protected authority | keep staging blocked |
| `PROV_COMMAND_DRIFT_BLOCKED` | command changed artifacts outside allowed refresh paths | block command evidence report |

Error id aliases for existing Sprint 22 failures:

| Sprint 23 error id | Existing rule or error id | Use |
| --- | --- | --- |
| `PROV_PUBLIC_ARTIFACT_DRIFT` | `artifact.public.hash_drift` | current public file hash differs from manifest entry |
| `PROV_OUTPUT_SELF_INCLUDED` | `artifact.output.self_included` | generated local output appears in manifest inputs |
| `PROV_SCAN_FINDING` | `credential-like-key` or `unsupported-claim` | scanner blocks a public artifact |
| `PROV_SCAN_VALUE_OUTPUT` | `artifact.scan.value_leakage` | scanner prints matched value material |
| `PROV_LOCAL_AUTHORITY_CONFUSION` | `provenance.authority_confusion` | local output is treated as protected CI output |
| `PROV_PROTECTED_FIELD_POPULATED` | `provenance.protected_field_populated` | local report populates protected source or CI fields |
| `PROV_DOMAIN_HASH_REPLAY_MISSING` | `artifact.hash_namespace_mixed` when misclassified | domain hash cannot be replayed or is mixed with file hashes |
| `PROV_OUTPUT_SELF_INCLUDED` | `artifact_public_file_not_manifested`, `artifact_equivalence_group_failed`, `artifact_scan_path_policy_violation` when routed from existing code | preserve compatibility while moving to explicit provenance failure classes |

## Failure Triage

| Priority | Route | Includes | Required response |
| --- | --- | --- | --- |
| P0 | security quarantine | scanner value leakage or confirmed credential-like public output | stop report generation, quarantine output, rotate only if actual exposure is confirmed |
| P1 | artifact drift gate | stale manifest, stale report, public file missing, public hash drift, authority confusion | block handoff, regenerate local artifacts deliberately, keep staging blocked |
| P2 | evidence boundary | unsupported wording, domain/file hash namespace issue, extracted-only hash without replay material | correct evidence classification or copy, rerun focused checks |
| P3 | advisory cleanup | alias consolidation and non-blocking metadata polish | record cleanup without changing release authority |

## Task Breakdown

### Task 1: Provenance Report Schema Tests

**Files:**
- Create: `apps/web/src/lib/provenance/provenanceReportSchema.test.ts`
- Create: `apps/web/src/lib/provenance/provenanceReport.ts`
- Modify: `apps/web/src/lib/provenance/artifactManifest.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildLocalArtifactManifestFromEntries } from "./artifactManifest.ts";
import { buildEnhancedLocalProvenanceReport } from "./provenanceReport.ts";

describe("enhanced local provenance report schema", () => {
  it("uses terminal decisions and binds manifest metadata", () => {
    const generatedAt = "2026-06-19T00:00:00.000Z";
    const manifest = buildLocalArtifactManifestFromEntries(
      [
        { path: "package.json", content: "{}\n" },
        { path: "apps/web/public/index.html", content: "<!doctype html>\n" }
      ],
      { generatedAt }
    );

    const report = buildEnhancedLocalProvenanceReport({
      manifest,
      manifestBytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n"),
      generatedAt,
      scanBinding: {
        scanner: "public-artifact-scanner",
        scope: "served-public-artifacts",
        decision: "pass",
        filesScanned: 1,
        blockedCount: 0,
        skippedCount: 0,
        findingCount: 0,
        valuePrinted: false
      },
      commandEvidenceBinding: null,
      domainHashBinding: [],
      knownBlockers: []
    });

    expect(JSON.stringify(report)).not.toContain("pass-or-blocked");
    expect(report.authority).toBe("local-advisory");
    expect(report.releaseGrade).toBe(false);
    expect(report.canUnblockStaging).toBe(false);
    expect(report.manifestBinding.manifestAuthority).toBe("local-advisory");
    expect(report.scanBinding.decision).toBe("pass");
    expect(report.reportHashPolicy).toBe("external-only");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceReportSchema
```

Expected: FAIL because `buildEnhancedLocalProvenanceReport` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type TerminalDecision = "pass" | "blocked" | "skipped";

export type ScanBinding = {
  scanner: "public-artifact-scanner";
  scope: "served-public-artifacts";
  decision: TerminalDecision;
  filesScanned: number;
  blockedCount: number;
  skippedCount: number;
  findingCount: number;
  valuePrinted: false;
};

export type EnhancedLocalProvenanceReport = {
  schemaVersion: "1";
  reportKind: "local-provenance-report";
  authority: "local-advisory";
  generatedAt: string;
  releaseGrade: false;
  canUnblockStaging: false;
  manifestBinding: {
    manifestPath: "docs/evidence/local-artifact-manifest.json";
    manifestKind: "local-artifact-manifest";
    manifestAuthority: "local-advisory";
    artifactManifestSha256: string;
    artifactManifestBytes: number;
    buildTreeSha256: string;
    artifactGroupCounts: {
      packageMetadata: number;
      publicArtifacts: number;
      publicEvidence: number;
      implementationDocs: number;
    };
    equivalenceGroups: { passed: number; blocked: number };
    domainHashCount: number;
  };
  scanBinding: ScanBinding;
  commandEvidenceBinding: null | {
    path: "docs/evidence/local-command-evidence-report.json";
    sha256: string;
    bytes: number;
    decision: TerminalDecision;
  };
  domainHashBinding: Array<{
    name: "intentHash" | "verifierInputHash" | "receiptHash";
    value: string;
    sourcePath: string;
    jsonPointer: string;
    derivation: "extracted" | "recomputed";
    decision: TerminalDecision;
  }>;
  knownBlockers: Array<{ id: string; status: "blocked"; reason: string }>;
  reportHashPolicy: "external-only";
  sidecar: { path: "docs/evidence/local-provenance-report.json.sha256"; algorithm: "sha256"; decision: TerminalDecision };
  blockedProtectedFields: ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"];
  releaseGateStatus: "blocked-until-protected-ci-and-release-approval";
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceReportSchema
```

Expected: PASS.

### Task 2: Manifest Binding Verifier

**Files:**
- Create: `apps/web/src/lib/provenance/provenanceReportBinding.test.ts`
- Modify: `apps/web/src/lib/provenance/provenanceReport.ts`
- Create: `apps/web/scripts/check-local-provenance.mjs`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { verifyLocalProvenanceReportBinding } from "./provenanceReport.ts";

describe("local provenance report binding", () => {
  it("detects manifest hash and byte drift", () => {
    const manifestBytes = new TextEncoder().encode("{\"schemaVersion\":\"1\"}\n");
    const result = verifyLocalProvenanceReportBinding({
      manifestBytes,
      manifest: { buildTreeSha256: "abc", artifactGroups: {}, equivalenceGroups: [], domainHashes: [] },
      report: {
        artifactManifestSha256: "0000",
        artifactManifestBytes: 1,
        buildTreeSha256: "abc",
        blockedProtectedFields: ["sourceCommit", "ciRunId", "releaseTag", "promotionDecision"],
        releaseGateStatus: "blocked-until-protected-ci-and-release-approval"
      }
    });

    expect(result.decision).toBe("blocked");
    expect(result.failures.map((failure) => failure.errorId)).toContain("PROV_MANIFEST_HASH_MISMATCH");
    expect(result.failures.every((failure) => failure.valuePrinted === false)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceReportBinding
```

Expected: FAIL because the binding verifier does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type ProvenanceFailure = {
  errorId: string;
  field: string;
  path: string;
  valuePrinted: false;
};

export function verifyLocalProvenanceReportBinding(input: {
  manifestBytes: Uint8Array;
  manifest: { buildTreeSha256?: string };
  report: {
    artifactManifestSha256?: string;
    artifactManifestBytes?: number;
    buildTreeSha256?: string;
    blockedProtectedFields?: string[];
    releaseGateStatus?: string;
  };
}): { decision: "pass" | "blocked"; failures: ProvenanceFailure[] } {
  const actualManifestSha256 = sha256Hex(input.manifestBytes);
  const failures: ProvenanceFailure[] = [];
  if (input.report.artifactManifestSha256 !== actualManifestSha256) {
    failures.push({ errorId: "PROV_MANIFEST_HASH_MISMATCH", field: "artifactManifestSha256", path: "docs/evidence/local-provenance-report.json", valuePrinted: false });
  }
  if (input.report.artifactManifestBytes !== input.manifestBytes.byteLength) {
    failures.push({ errorId: "PROV_MANIFEST_BYTE_MISMATCH", field: "artifactManifestBytes", path: "docs/evidence/local-provenance-report.json", valuePrinted: false });
  }
  if (input.report.buildTreeSha256 !== input.manifest.buildTreeSha256) {
    failures.push({ errorId: "PROV_BUILD_TREE_MISMATCH", field: "buildTreeSha256", path: "docs/evidence/local-provenance-report.json", valuePrinted: false });
  }
  return { decision: failures.length === 0 ? "pass" : "blocked", failures };
}
```

- [ ] **Step 4: Add package command and syntax check**

Package script:

```json
{
  "artifact:provenance:check": "node --experimental-strip-types scripts/check-local-provenance.mjs --report"
}
```

Run:

```powershell
node --check apps/web/scripts/check-local-provenance.mjs
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:check
```

Expected: command exits 0 when report and manifest are consistent; output contains error ids only when blocked.

### Task 3: Timestamp-Aware Artifact Drift Check

**Files:**
- Create: `apps/web/src/lib/provenance/provenanceDrift.test.ts`
- Modify: `apps/web/src/lib/provenance/provenanceReport.ts`
- Create: `apps/web/scripts/check-local-artifact-drift.mjs`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { compareManifestForDrift } from "./provenanceReport.ts";

describe("local artifact drift check", () => {
  it("ignores generatedAt-only changes and blocks artifact hash drift", () => {
    const checked = {
      generatedAt: "2026-06-19T00:00:00.000Z",
      buildTreeSha256: "tree-a",
      artifactGroups: {
        publicArtifacts: [{ path: "apps/web/public/index.html", sha256: "a", bytes: 1 }]
      }
    };
    const current = {
      generatedAt: "2026-06-19T01:00:00.000Z",
      buildTreeSha256: "tree-b",
      artifactGroups: {
        publicArtifacts: [{ path: "apps/web/public/index.html", sha256: "b", bytes: 1 }]
      }
    };

    const result = compareManifestForDrift({ checked, current });

    expect(result.decision).toBe("blocked");
    expect(result.failures).toEqual([
      {
        errorId: "PROV_PUBLIC_ARTIFACT_DRIFT",
        path: "apps/web/public/index.html",
        field: "sha256",
        valuePrinted: false
      }
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceDrift
```

Expected: FAIL because `compareManifestForDrift` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function compareManifestForDrift(input: {
  checked: { artifactGroups: Record<string, Array<{ path: string; sha256: string; bytes: number }>> };
  current: { artifactGroups: Record<string, Array<{ path: string; sha256: string; bytes: number }>> };
}): { decision: "pass" | "blocked"; failures: ProvenanceFailure[] } {
  const checkedEntries = flattenArtifactGroups(input.checked.artifactGroups);
  const currentEntries = new Map(flattenArtifactGroups(input.current.artifactGroups).map((entry) => [entry.path, entry]));
  const failures: ProvenanceFailure[] = [];
  for (const checkedEntry of checkedEntries) {
    const currentEntry = currentEntries.get(checkedEntry.path);
    if (currentEntry === undefined || currentEntry.sha256 !== checkedEntry.sha256 || currentEntry.bytes !== checkedEntry.bytes) {
      failures.push({ errorId: "PROV_PUBLIC_ARTIFACT_DRIFT", path: checkedEntry.path, field: "sha256", valuePrinted: false });
    }
  }
  return { decision: failures.length === 0 ? "pass" : "blocked", failures };
}
```

- [ ] **Step 4: Add drift command**

Package script:

```json
{
  "artifact:drift": "node --experimental-strip-types scripts/check-local-artifact-drift.mjs"
}
```

Run:

```powershell
node --check apps/web/scripts/check-local-artifact-drift.mjs
pnpm --filter @giwa/web --fail-if-no-match artifact:drift
```

Expected: command exits 0 when current public/docs/package artifacts match the checked manifest; timestamp differences alone do not block.

### Task 4: External-Only Report Hash Sidecar

**Files:**
- Create: `apps/web/src/lib/provenance/provenanceSidecar.test.ts`
- Modify: `apps/web/src/lib/provenance/provenanceReport.ts`
- Modify: `apps/web/scripts/export-artifact-manifest.mjs`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildReportSha256Sidecar } from "./provenanceReport.ts";

describe("local provenance sidecar", () => {
  it("keeps report hash outside the report body", () => {
    const reportJson = "{\"reportKind\":\"local-provenance-report\"}\n";
    const sidecar = buildReportSha256Sidecar({
      reportPath: "docs/evidence/local-provenance-report.json",
      reportJson
    });

    expect(sidecar.path).toBe("docs/evidence/local-provenance-report.json.sha256");
    expect(sidecar.content).toMatch(/^[a-f0-9]{64}  docs\/evidence\/local-provenance-report\.json\n$/);
    expect(reportJson).not.toContain("provenanceReportHash");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceSidecar
```

Expected: FAIL because `buildReportSha256Sidecar` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildReportSha256Sidecar(input: {
  reportPath: "docs/evidence/local-provenance-report.json";
  reportJson: string;
}): { path: "docs/evidence/local-provenance-report.json.sha256"; content: string } {
  return {
    path: "docs/evidence/local-provenance-report.json.sha256",
    content: `${sha256Hex(input.reportJson)}  ${input.reportPath}\n`
  };
}
```

- [ ] **Step 4: Verify output exclusion remains intact**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:check
```

Expected:

```text
docs/evidence/local-provenance-report.json.sha256 exists
docs/evidence/local-provenance-report.json.sha256 is not included in local-artifact-manifest.json artifact groups
```

### Task 5: Domain Hash Evidence Binding

**Files:**
- Create: `apps/web/src/lib/provenance/domainHashEvidence.test.ts`
- Create: `apps/web/src/lib/provenance/domainHashEvidence.ts`
- Modify: `apps/web/src/lib/provenance/provenanceReport.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { classifyDomainHashEvidence } from "./domainHashEvidence.ts";

describe("domain hash evidence", () => {
  it("marks replayable receipt hashes as recomputed and missing replay material as blocked", () => {
    const results = classifyDomainHashEvidence({
      sourcePath: "docs/evidence/example.json",
      json: {
        receiptHash: "0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8",
        canonicalReceiptPayload: { status: "matched" },
        verifierInputHash: "0x83a4b7d20d0162affe04be016a68d9711f86eef356cf527620159957c7b2ed04"
      }
    });

    expect(results).toContainEqual(
      expect.objectContaining({ name: "receiptHash", derivation: "recomputed", decision: "pass" })
    );
    expect(results).toContainEqual(
      expect.objectContaining({ name: "verifierInputHash", derivation: "extracted", decision: "blocked", errorId: "PROV_DOMAIN_HASH_REPLAY_MISSING" })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- domainHashEvidence
```

Expected: FAIL because `domainHashEvidence.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type DomainHashEvidence = {
  name: "intentHash" | "verifierInputHash" | "receiptHash";
  value: string;
  sourcePath: string;
  jsonPointer: string;
  derivation: "extracted" | "recomputed";
  decision: "pass" | "blocked";
  errorId?: "PROV_DOMAIN_HASH_REPLAY_MISSING";
};

export function classifyDomainHashEvidence(input: { sourcePath: string; json: unknown }): DomainHashEvidence[] {
  const findings = findHashFields(input.json);
  return findings.map((finding) => {
    const replayPayload = findReplayPayload(input.json, finding.name);
    if (replayPayload === undefined) {
      return {
        name: finding.name,
        value: finding.value,
        sourcePath: input.sourcePath,
        jsonPointer: finding.jsonPointer,
        derivation: "extracted",
        decision: "blocked",
        errorId: "PROV_DOMAIN_HASH_REPLAY_MISSING"
      };
    }
    return {
      name: finding.name,
      value: finding.value,
      sourcePath: input.sourcePath,
      jsonPointer: finding.jsonPointer,
      derivation: "recomputed",
      decision: "pass"
    };
  });
}
```

- [ ] **Step 4: Keep chain transaction references separate**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- domainHashEvidence
```

Expected: `decisionTxHash` is never emitted as a `domainHashBinding` entry. If present in public evidence, it is classified as a chain reference in documentation only.

### Task 6: Scanner Binding And Redacted Output Tests

**Files:**
- Create: `apps/web/src/lib/provenance/publicArtifactScannerBinding.test.ts`
- Modify: `apps/web/src/lib/provenance/publicArtifactScanner.ts`
- Modify: `apps/web/src/lib/provenance/provenanceReport.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { scanPublicArtifactText, summarizePublicArtifactScans } from "./publicArtifactScanner.ts";

describe("public artifact scanner binding", () => {
  it("reports metadata without printing matched values", () => {
    const canary = "CREDENTIAL_CANARY_VALUE_SHOULD_NOT_PRINT";
    const result = scanPublicArtifactText({
      path: "apps/web/public/example.json",
      content: JSON.stringify({ credentialMaterial: canary })
    });
    const summary = summarizePublicArtifactScans([result]);

    expect(result.decision).toBe("blocked");
    expect(summary.decision).toBe("blocked");
    expect(JSON.stringify(result.findings)).not.toContain(canary);
    expect(result.findings.every((finding) => finding.valuePrinted === false)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicArtifactScannerBinding
```

Expected: FAIL if scanner does not catch the synthetic key or if it prints matched values.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildScanBinding(results: PublicArtifactScanResult[]): ScanBinding {
  const summary = summarizePublicArtifactScans(results);
  return {
    scanner: "public-artifact-scanner",
    scope: "served-public-artifacts",
    decision: summary.decision,
    filesScanned: summary.filesScanned,
    blockedCount: summary.blockedCount,
    skippedCount: summary.skippedCount,
    findingCount: results.flatMap((result) => result.findings).length,
    valuePrinted: false
  };
}
```

- [ ] **Step 4: Verify scanner CLI failure path**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- publicArtifactScanner
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
```

Expected: scanner output contains rule ids, paths, line numbers, classes, counts, and `valuePrinted=false`; it does not print matched values.

### Task 7: Local Command Evidence Binding

**Files:**
- Create: `apps/web/src/lib/provenance/localCommandEvidence.test.ts`
- Create: `apps/web/src/lib/provenance/localCommandEvidence.ts`
- Create: `apps/web/scripts/export-local-command-evidence.mjs`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildLocalCommandEvidenceReport, LOCAL_COMMAND_CATALOG } from "./localCommandEvidence.ts";

describe("local command evidence", () => {
  it("uses fixed command arrays and redacted output metadata", () => {
    expect(LOCAL_COMMAND_CATALOG.some((command) => command.id === "web-test-provenance")).toBe(true);
    expect(LOCAL_COMMAND_CATALOG.every((command) => Array.isArray(command.command))).toBe(true);
    expect(LOCAL_COMMAND_CATALOG.every((command) => command.timeoutMs > 0)).toBe(true);

    const report = buildLocalCommandEvidenceReport({
      generatedAt: "2026-06-19T00:00:00.000Z",
      results: [
        {
          id: "web-test-provenance",
          status: "passed",
          exitCode: 0,
          durationMs: 10,
          stdout: "ok\n",
          stderr: "",
          artifactBinding: {
            inputManifestSha256: "a",
            inputBuildTreeSha256: "b",
            postCommandManifestSha256: "a",
            postCommandBuildTreeSha256: "b",
            changedArtifactPaths: [],
            mutationDecision: "unchanged"
          }
        }
      ]
    });

    expect(report.authority).toBe("local-advisory");
    expect(report.results[0]?.output.rawOutputStored).toBe(false);
    expect(report.results[0]?.output.stdoutRedactedSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(report)).not.toContain("ok\\n");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- localCommandEvidence
```

Expected: FAIL because command evidence module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const LOCAL_COMMAND_CATALOG = [
  {
    id: "web-test-provenance",
    kind: "test",
    packageScript: "@giwa/web:test",
    command: ["pnpm", "--filter", "@giwa/web", "--fail-if-no-match", "test", "--", "provenance"],
    timeoutMs: 120000,
    mutationPolicy: "unchanged"
  },
  {
    id: "artifact-local",
    kind: "artifact",
    packageScript: "@giwa/web:artifact:local",
    command: ["pnpm", "--filter", "@giwa/web", "--fail-if-no-match", "artifact:local"],
    timeoutMs: 120000,
    mutationPolicy: "allowed-local-refresh"
  }
] as const;
```

- [ ] **Step 4: Add command evidence script**

Package script:

```json
{
  "artifact:commands": "node --experimental-strip-types scripts/export-local-command-evidence.mjs"
}
```

Run:

```powershell
node --check apps/web/scripts/export-local-command-evidence.mjs
pnpm --filter @giwa/web --fail-if-no-match artifact:commands -- --dry-run
```

Expected: command evidence output is local-advisory, redacted, and includes no raw stdout or stderr text.

### Task 8: Known Blockers And Protected-CI Boundary

**Files:**
- Create: `apps/web/src/lib/provenance/provenanceBlockers.test.ts`
- Modify: `apps/web/src/lib/provenance/provenanceReport.ts`
- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildKnownProvenanceBlockers } from "./provenanceReport.ts";

describe("known provenance blockers", () => {
  it("keeps local output blocked when source and workflow authority are absent", () => {
    const blockers = buildKnownProvenanceBlockers({
      gitDirectory: false,
      githubDirectory: false,
      workflowDirectory: false
    });

    expect(blockers).toEqual([
      { id: "source-provenance", status: "blocked", reason: ".git is absent" },
      { id: "protected-ci", status: "blocked", reason: ".github workflows are absent" }
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceBlockers
```

Expected: FAIL because blocker builder does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildKnownProvenanceBlockers(input: {
  gitDirectory: boolean;
  githubDirectory: boolean;
  workflowDirectory: boolean;
}): Array<{ id: string; status: "blocked"; reason: string }> {
  const blockers: Array<{ id: string; status: "blocked"; reason: string }> = [];
  if (!input.gitDirectory) blockers.push({ id: "source-provenance", status: "blocked", reason: ".git is absent" });
  if (!input.githubDirectory || !input.workflowDirectory) {
    blockers.push({ id: "protected-ci", status: "blocked", reason: ".github workflows are absent" });
  }
  return blockers;
}
```

- [ ] **Step 4: Update docs with local-advisory routing**

Add wording to the staging and commercial readiness docs:

```text
Sprint 23 local provenance checks can detect local drift and bind local advisory evidence, but they do not prove immutable source identity, protected workflow execution, required check enforcement, or release approval.
```

Run:

```powershell
rg -n "Sprint 23 local provenance" docs\implementation -g "*.md"
```

Expected: updated routing appears only in implementation docs.

### Task 9: Package Commands And Report Writer Integration

**Files:**
- Modify: `apps/web/scripts/export-artifact-manifest.mjs`
- Modify: `apps/web/package.json`
- Modify: `docs/implementation/giwa-provenance-artifact-manifest.md`
- Modify: `docs/implementation/giwa-local-ci-simulation.md`

- [ ] **Step 1: Write package script assertion**

```ts
import { describe, expect, it } from "vitest";
import webPackageJson from "../../../package.json" with { type: "json" };

describe("Sprint 23 package scripts", () => {
  it("exposes provenance check, drift check, and command evidence scripts", () => {
    expect(webPackageJson.scripts["artifact:provenance:check"]).toBe("node --experimental-strip-types scripts/check-local-provenance.mjs --report");
    expect(webPackageJson.scripts["artifact:drift"]).toBe("node --experimental-strip-types scripts/check-local-artifact-drift.mjs");
    expect(webPackageJson.scripts["artifact:commands"]).toBe("node --experimental-strip-types scripts/export-local-command-evidence.mjs");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenancePackageScripts
```

Expected: FAIL until scripts are added.

- [ ] **Step 3: Add scripts and docs**

Required package scripts:

```json
{
  "artifact:provenance:check": "node --experimental-strip-types scripts/check-local-provenance.mjs --report",
  "artifact:drift": "node --experimental-strip-types scripts/check-local-artifact-drift.mjs",
  "artifact:commands": "node --experimental-strip-types scripts/export-local-command-evidence.mjs"
}
```

Documentation commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:check
pnpm --filter @giwa/web --fail-if-no-match artifact:drift
pnpm --filter @giwa/web --fail-if-no-match artifact:commands -- --dry-run
```

- [ ] **Step 4: Verify docs link to outputs**

Run:

```powershell
rg -n "local-command-evidence-report|artifact:provenance:check|artifact:drift" docs\implementation README.md -g "*.md"
```

Expected: docs mention local-advisory output and do not claim protected authority.

### Task 10: Final Verification And Handoff

**Files:**
- Verify: `docs/evidence/local-artifact-manifest.json`
- Verify: `docs/evidence/local-provenance-report.json`
- Verify: `docs/evidence/local-provenance-report.json.sha256`
- Verify: `docs/evidence/local-command-evidence-report.json`

- [ ] **Step 1: Run focused provenance checks**

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceReport
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match test -- domainHashEvidence
pnpm --filter @giwa/web --fail-if-no-match test -- localCommandEvidence
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:check
pnpm --filter @giwa/web --fail-if-no-match artifact:drift
pnpm --filter @giwa/web --fail-if-no-match artifact:commands -- --dry-run
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
```

Expected: all focused commands exit 0. If a domain hash is extracted-only, the report records a bounded blocker instead of claiming recomputation.

- [ ] **Step 2: Run package verification**

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
```

Expected: all package and workspace checks pass.

- [ ] **Step 3: Run syntax checks**

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/export-artifact-manifest.mjs
node --check apps/web/scripts/check-local-provenance.mjs
node --check apps/web/scripts/check-local-artifact-drift.mjs
node --check apps/web/scripts/export-local-command-evidence.mjs
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Expected: all JavaScript files parse.

- [ ] **Step 4: Run safe scans without scanning real env file contents**

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("set" + "tlement")
$sensitivePattern = ("private " + "key") + "|mnem" + "onic|bear" + "er|api " + "key|sec" + "ret"
rg -n $docPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $riskPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $sensitivePattern docs\superpowers\plans\2026-06-19-sprint-23-provenance-report-local-implementation.md
```

Expected:

```text
No unfinished markers appear in Sprint 23 plan.
Risk phrase hits are limited to explicit guardrail or forbidden-claim references outside Sprint 23.
Sensitive-surface hits do not appear in the Sprint 23 plan.
No real env file content is scanned or printed.
```

- [ ] **Step 5: Confirm blocked actions stayed blocked**

```powershell
Test-Path .git
Test-Path .github
Test-Path .github\workflows
```

Expected in current non-git prototype mode:

```text
False
False
False
```

No wallet transaction, public hosting, deployment, dependency install, or GIWA chain-operation command is run.

## Sprint 23 Exit Gate

Sprint 23 exits only when:

- enhanced local provenance report schema exists and is tested
- generated report uses terminal decisions only
- report hash, byte length, and build tree binding are recomputed from the checked manifest
- timestamp-only regeneration cannot trigger false artifact drift
- current filesystem drift is detected separately from report consistency
- report hash is carried externally through stdout and `.sha256` sidecar
- scan results are bound into the report with counts and `valuePrinted=false`
- command evidence is represented by a fixed command catalog and redacted metadata
- domain hashes are classified as extracted or recomputed
- missing replay material is recorded as a bounded blocker, not silently passed
- known blockers keep source provenance and protected CI blocked
- output authority remains `local-advisory`
- `releaseGrade=false` and `canUnblockStaging=false`
- no `.git`, `.github`, workflow file, CI script, public hosting, deployment, managed infrastructure, wallet action, GIWA chain-operation command, mint command, dependency change, fake CI result, fake release tag, or fake artifact hash is created

## Sprint 24 Candidates

- `ci-workflow-file-creation-after-approval`
- `hosted-adapter-implementation`
- `staging-deployment-dry-run`

Recommended ordering after Sprint 23 is to decide whether the local advisory report is stable enough for a separately approved repository and workflow transition. Hosted adapter and staging dry-run work remain blocked until source and protected CI gates are green.

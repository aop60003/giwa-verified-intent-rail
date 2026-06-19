# Sprint 22 Artifact Manifest Local Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development with superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a local-advisory artifact manifest and provenance report for `GIWA Verified Intent Rail` public demo assets and public-safe evidence.

**Architecture:** Sprint 22 adds deterministic inventory, hashing, redacted scanning, and diagnostic report generation. The output is useful for drift detection and later protected CI integration, but it is not release provenance.

**Tech Stack:** Existing pnpm workspace, Node.js scripts, TypeScript/Vitest in `@giwa/web`, no new dependency.

---

## Scope

Sprint 22 creates local tools and tests that can answer:

- which public demo files are included
- which public evidence files are included
- which package metadata files are included
- what each file SHA-256 is
- whether known public/evidence copies still match
- whether the public artifact set passes redacted scanning
- whether the generated manifest and provenance report are deterministic for the same inputs

Sprint 22 output authority is always:

```text
authority=local-advisory
```

## Non-Goals

Sprint 22 does not:

- create `.git`
- initialize a repository
- create `.github`
- create workflow files
- public-host or deploy
- connect managed infrastructure
- send wallet actions
- run GIWA chain-operation commands
- install dependencies
- create release tags
- claim protected CI, staging promotion, or release provenance

## Parallel Analysis Incorporated

1. Artifact inventory and inclusion rules: fail closed on every served `apps/web/public` file, including `demo.html` and `demo-control-room.js`.
2. Hashing and canonical JSON policy: keep file SHA-256, build tree SHA-256, and protocol domain hashes in separate namespaces.
3. Public asset and evidence boundary: include public-safe evidence JSON/MD and served assets; exclude runtime state and credential-bearing local material.
4. Sensitive-surface artifact scanning: use an allowlist walker and synthetic canary tests; do not enumerate process environment values.
5. Local provenance report structure: use a local-only path and keep protected CI fields blocked.
6. Reproducibility and deterministic build concerns: treat build-refreshing assets and live snapshots as input caveats, not release-grade rebuild proof.
7. Failure modes and triage: every missing, extra, excluded, unstable, or authority-confused case fails closed.
8. Future protected CI integration path: local output maps cleanly to future protected CI artifacts after separate repository and workflow approvals.

## Local-Advisory Artifact Manifest Scope

The future artifact manifest output path is:

```text
docs/evidence/local-artifact-manifest.json
```

The future provenance report output paths are:

```text
docs/evidence/local-provenance-report.json
```

These paths are intentionally separate from staging paths such as `giwa-staging-artifact-manifest.json`.

## Manifest Target Rules

Include these groups:

- `apps/web/public` files with `.html`, `.js`, `.css`, and `.json` extensions
- `docs/evidence` public-safe `.json` and `.md` files
- `docs/implementation` release, submission, CI, staging, live, hosted, and partner readiness documents
- package metadata files:
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
  - `tsconfig.base.json`
  - `apps/web/package.json`
  - `packages/protocol/package.json`
  - `packages/contracts/package.json`

The `apps/web/public` set currently includes:

```text
apps/web/public/demo-control-room.js
apps/web/public/demo.html
apps/web/public/flow-data.json
apps/web/public/flow.js
apps/web/public/index.html
apps/web/public/live-demo-snapshot.json
apps/web/public/live-flow.js
apps/web/public/live.html
apps/web/public/partner-snapshot.json
apps/web/public/styles.css
```

Any served public file missing from the manifest is a failing condition.

## Excluded Surfaces

The inventory walker must reject these before reading file content:

- `.env`, `.env.local`, and `.env.*`
- credential-bearing local files, wallet exports, keystores, auth headers, and process environment dumps
- `apps/web/.data`
- `*.sqlite`, `*.db`, `*.raw.json`, and `*.private.json`
- `node_modules`
- `.next`, `dist`, `coverage`, `.turbo`, `.engram`
- `packages/contracts/cache`, `packages/contracts/artifacts`, and `packages/contracts/typechain-types`
- generated caches and browser state
- private local DB files

## Canonical JSON Schema

Artifact manifest shape:

```json
{
  "schemaVersion": "1",
  "manifestKind": "local-artifact-manifest",
  "authority": "local-advisory",
  "generatedAt": "ISO-8601",
  "releaseGrade": false,
  "canUnblockStaging": false,
  "hashPolicy": {
    "fileHashAlgorithm": "sha256",
    "fileHashInput": "raw-file-bytes",
    "pathStyle": "repo-relative-posix",
    "aggregateLineEnding": "lf",
    "aggregateSort": "normalized-path-ascending"
  },
  "sourceState": {
    "gitDirectory": false,
    "githubDirectory": false,
    "workflowDirectory": false,
    "sourceAuthority": "local-non-git-advisory"
  },
  "artifactGroups": {
    "packageMetadata": [],
    "publicArtifacts": [],
    "publicEvidence": [],
    "implementationDocs": []
  },
  "equivalenceGroups": [],
  "domainHashes": [],
  "scanSummary": {
    "scanner": "redacted-artifact-scan",
    "decision": "pass-or-blocked"
  },
  "buildTreeSha256": "computed-from-sorted-lines",
  "unmanifestedFilePolicy": "fail"
}
```

Provenance report shape:

```json
{
  "schemaVersion": "1",
  "reportKind": "local-provenance-report",
  "authority": "local-advisory",
  "generatedAt": "ISO-8601",
  "manifestPath": "docs/evidence/local-artifact-manifest.json",
  "artifactManifestSha256": "computed",
  "artifactManifestBytes": 0,
  "buildTreeSha256": "copied-from-manifest",
  "reportHashPolicy": "external-only",
  "releaseGrade": false,
  "canUnblockStaging": false,
  "blockedProtectedFields": [
    "sourceCommit",
    "ciRunId",
    "releaseTag",
    "promotionDecision"
  ],
  "advisoryChecks": [],
  "blockedActions": {
    "chainOperations": "not-run",
    "walletActions": "not-run",
    "publicHosting": "not-run",
    "deployment": "not-run",
    "dependencyChanges": "not-run",
    "protectedCi": "absent"
  },
  "releaseGateStatus": "blocked-until-protected-ci-and-release-approval"
}
```

Canonical writer rules:

- construct objects in explicit schema order
- sort file arrays by normalized path
- write UTF-8 JSON with two-space indentation and one trailing LF
- omit `undefined`
- use `null` only for fields where the schema explicitly allows no value
- never include the report file hash inside the report JSON itself

## Hash Algorithm Policy

File hash:

```text
sha256(raw-file-bytes)
```

Build tree input:

```text
<sha256><two spaces><repo-relative-posix-path><lf>
```

Build tree hash:

```text
sha256(all-sorted-build-tree-lines)
```

Protocol domain hashes stay separate:

```text
intentHash
verifierInputHash
receiptHash
```

Those values belong under `domainHashes` and must not be mixed into file SHA-256 fields.

## File Path Normalization

Normalize paths with these rules:

- repo-relative only
- POSIX slash only
- no absolute path output
- no backslash output
- no `..` segment
- no path outside the workspace root
- case-preserving path value
- normalized-path ascending sort with locale-independent comparison

## Redacted Scanner Design

The scanner uses an allowlist walker. It scans only approved source, docs, evidence, package metadata, and public artifact paths.

Allowed public artifact values include:

- public wallet addresses
- public transaction hashes
- block numbers and block hashes
- receipt hashes
- verifier input hashes
- bounded status strings
- public route strings
- approved snapshot paths

Findings output is metadata only:

```json
{
  "ruleId": "credential-like-surface",
  "severity": "block",
  "path": "apps/web/public/partner-snapshot.json",
  "line": 42,
  "matchClass": "credential-key-name",
  "decision": "blocked",
  "valuePrinted": false
}
```

Scanner tests must use synthetic fixtures and canary strings. They must assert stdout and stderr do not contain the canary value.

## Reproducibility Caveats

Local advisory output can detect drift, but it cannot prove no-rebuild promotion.

Known caveats:

- `@giwa/web` build refreshes public JSON artifacts through `apps/web/scripts/export-flow-data.mjs`.
- `export:live-demo` depends on a selected local DB and a capture timestamp.
- contract tests run Hardhat build and refresh excluded contract outputs.
- local filesystem metadata is not part of the hash policy.
- non-git mode cannot prove immutable source identity.

## Local-Advisory Versus Protected CI

Local advisory output can prove:

- file inventory rules execute
- redacted scanner rules execute
- hash policy is deterministic for current local inputs
- served public files are covered
- equivalence groups match or fail closed

Local advisory output cannot prove:

- immutable source identity
- branch protection
- required check enforcement
- protected workflow run identity
- artifact upload identity
- release approval
- public hosting readiness
- staging promotion readiness

Protected CI provenance remains blocked until repository transition and workflow file creation are separately approved.

## Task Breakdown

### Task 1: Runtime Boundary And Routing Docs

- [ ] Failing test/write-up: Add a plan validation note that `docs/evidence/local-artifact-manifest.json` is the Sprint 22 manifest output path and `giwa-staging-*` paths are reserved for protected CI.
- [ ] Failure command:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-22-artifact-manifest-local-implementation.md
```

- [ ] Minimal implementation: create the plan and link it from `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`.
- [ ] Passing command: same `Test-Path` returns `True`.

### Task 2: Artifact Inventory Tests

- [ ] Failing test: create `apps/web/src/lib/provenance/artifactInventory.test.ts` asserting the current ten `apps/web/public` files are all present.
- [ ] Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
```

- [ ] Minimal implementation: create `apps/web/src/lib/provenance/artifactInventory.ts` with allowlisted groups and public-file discovery.
- [ ] Passing command: the provenance-focused test passes and fails closed when a public file is removed from the manifest list.

### Task 3: Exclusion And Path Normalization Tests

- [ ] Failing test: add `apps/web/src/lib/provenance/pathPolicy.test.ts` with synthetic excluded paths and Windows-style path inputs.
- [ ] Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- pathPolicy
```

- [ ] Minimal implementation: create `apps/web/src/lib/provenance/pathPolicy.ts` to normalize repo-relative POSIX paths and reject excluded surfaces before content reads.
- [ ] Passing command: rejected surfaces return a typed policy error without file content.

### Task 4: File Hash And Canonical JSON Tests

- [ ] Failing test: create `apps/web/src/lib/provenance/artifactHash.test.ts` covering raw-byte SHA-256, LF sorted build-tree lines, and deterministic JSON output.
- [ ] Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- artifactHash
```

- [ ] Minimal implementation: create `apps/web/src/lib/provenance/artifactHash.ts` and `apps/web/src/lib/provenance/canonicalJson.ts`.
- [ ] Passing command: repeated writes for the same input produce identical JSON and identical `buildTreeSha256`.

### Task 5: Manifest Writer Tests

- [ ] Failing test: create `apps/web/src/lib/provenance/artifactManifest.test.ts` covering schema fields, authority, artifact groups, equivalence groups, and domain hash separation.
- [ ] Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- artifactManifest
```

- [ ] Minimal implementation: create `apps/web/src/lib/provenance/artifactManifest.ts` and `apps/web/scripts/write-artifact-manifest.mjs`.
- [ ] Passing commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- artifactManifest
node --check apps/web/scripts/write-artifact-manifest.mjs
```

### Task 6: Redacted Scanner Tests

- [ ] Failing test: create `apps/web/src/lib/provenance/redactedArtifactScan.test.ts` with synthetic canary values in temporary fixtures.
- [ ] Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- redactedArtifactScan
```

- [ ] Minimal implementation: create `apps/web/src/lib/provenance/redactedArtifactScan.ts` and `apps/web/scripts/redacted-artifact-scan.mjs`.
- [ ] Passing commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- redactedArtifactScan
node --check apps/web/scripts/redacted-artifact-scan.mjs
```

### Task 7: Provenance Report Tests

- [ ] Failing test: create `apps/web/src/lib/provenance/provenanceReport.test.ts` asserting protected CI fields remain blocked locally and report hashing avoids self-reference.
- [ ] Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceReport
```

- [ ] Minimal implementation: create `apps/web/src/lib/provenance/provenanceReport.ts` and `apps/web/scripts/write-provenance-report.mjs`.
- [ ] Passing commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenanceReport
node --check apps/web/scripts/write-provenance-report.mjs
```

### Task 8: Package Commands And Advisory Dry-Run

- [ ] Failing test: update package script assertions in existing package metadata tests or add `apps/web/src/lib/provenance/provenancePackageScripts.test.ts`.
- [ ] Failure command:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenancePackageScripts
```

- [ ] Minimal implementation: add `artifact:manifest`, `artifact:provenance`, `artifact:scan`, and `artifact:local` scripts to `apps/web/package.json`.
- [ ] Passing commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match artifact:manifest -- --dry-run
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance -- --dry-run
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
```

### Task 9: Failure Triage Documentation

- [ ] Failing doc check: the implementation docs do not yet describe Sprint 22 local-advisory output paths and failure classes.
- [ ] Failure command:

```powershell
rg -n "local-artifact-manifest|local-provenance-report" docs\implementation docs\superpowers\plans -g "*.md"
```

- [ ] Minimal implementation: update `docs/implementation/giwa-provenance-artifact-manifest.md`, `docs/implementation/giwa-local-ci-simulation.md`, and `docs/implementation/giwa-ci-failure-triage.md` with local path routing.
- [ ] Passing command: the routing search returns the Sprint 22 plan and updated docs.

### Task 10: Final Verification And Handoff

- [ ] Run focused verification:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/write-artifact-manifest.mjs
node --check apps/web/scripts/write-provenance-report.mjs
node --check apps/web/scripts/redacted-artifact-scan.mjs
```

- [ ] Run workspace verification:

```powershell
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
```

- [ ] Run safe scans without scanning real env file content:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("set" + "tlement")
$sensitivePattern = ("private " + "key") + "|mnem" + "onic|bear" + "er|api " + "key|sec" + "ret"
rg -n $docPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $riskPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $sensitivePattern docs\superpowers\plans\2026-06-19-sprint-22-artifact-manifest-local-implementation.md
```

Expected:

```text
Sprint 22 plan path exists.
No unfinished marker appears in Sprint 22 plan.
Risk phrase hits are limited to existing policy or guardrail references outside Sprint 22.
Sensitive-surface scan emits no values.
Local artifact outputs are labeled authority=local-advisory.
No .git, .github, workflow file, public hosting, deployment, chain-operation, wallet action, or dependency change occurs.
```

## Failure Triage

| Priority | Failure | Signal | Required Response |
| --- | --- | --- | --- |
| P0 | sensitive output disclosure | dry-run prints credential material, env content, DB content, or process environment value | cancel run, quarantine output, rotate affected value only if exposure is confirmed |
| P1 | authority confusion | missing `authority=local-advisory` or protected CI fields populated locally | fail manifest or report generation |
| P1 | unmanifested public file | served file under `apps/web/public` missing from manifest | fail closed and update artifact inventory |
| P1 | excluded surface access | walker attempts to read excluded path | fail before content read |
| P1 | hash instability | repeated dry-runs differ for unchanged inputs | block handoff until deterministic writer is fixed |
| P1 | protected field spoofing | local output emits fake commit, run id, release tag, or promotion decision | fail report generation |
| P2 | domain/file hash mixing | protocol hash values appear as file SHA-256 entries | move to `domainHashes` |
| P2 | equivalence mismatch | expected public/evidence copies differ | fail manifest and report repo-relative paths only |
| P2 | unsupported wording hit | scanner flags product or confirmation copy outside approved examples | correct copy and rerun |

## Sprint 22 Exit Gate

Sprint 22 exits only when:

- local artifact manifest writer exists and is tested
- local provenance report writer exists and is tested
- redacted artifact scanner exists and is tested with synthetic canaries
- all served `apps/web/public` files are manifest-covered
- `demo.html` and `demo-control-room.js` are covered or deliberately reclassified in docs
- equivalence groups pass
- `domainHashes` stay separate from file SHA-256 entries
- output paths use `docs/evidence/local-artifact-manifest.json` and `docs/evidence/local-provenance-report.json`
- output authority is `local-advisory`
- protected CI fields remain blocked
- static fallback remains unchanged
- no `.git`, `.github`, workflow file, public hosting, deployment, chain-operation, wallet action, or dependency change occurs

## Sprint 23 Candidates

- `provenance-report-local-implementation`
- `ci-workflow-file-creation-after-approval`
- `hosted-adapter-implementation`

Recommended ordering after Sprint 22 is to review whether local provenance output is stable enough to support a separately approved repository and workflow transition. Hosted adapter work remains blocked until source and protected CI provenance gates are green.

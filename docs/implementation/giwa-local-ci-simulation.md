# GIWA Local CI Simulation

## Purpose

This document records Sprint 21 local CI simulation scope. Local simulation is useful for command readiness, but it is not protected CI and it is not release provenance.

## Output Contract

Every local simulation result is labeled:

```text
authority=local-advisory
```

Local simulation must not populate:

```text
sourceCommit
ci.runId
release tag
final artifact provenance
promotion decision
protected branch status
```

Logical protected-CI artifact paths such as the staging artifact manifest and provenance report remain blocked until protected CI exists. Local copies, if a later sprint creates them, are diagnostic only unless tied to a protected GitHub run id and artifact digest.

## Current Non-Git State

```powershell
Test-Path .git
Test-Path .github
Test-Path .github\workflows
Test-Path pnpm-lock.yaml
```

Expected current state:

```text
False
False
False
True
```

This means authoritative source provenance is blocked.

## Local Simulation Commands

Focused web simulations:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- live
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- commercialReceiptGate
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
```

Package and workspace simulations:

```powershell
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
```

Syntax simulations:

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Sprint 22 local artifact simulations:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match artifact:local
pnpm --filter @giwa/web --fail-if-no-match artifact:scan
node --check apps/web/scripts/export-artifact-manifest.mjs
```

Sprint 22 local outputs:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-provenance-report.json
```

These outputs are labeled `authority=local-advisory`.

Sprint 23 local provenance verification simulations:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- provenance
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify
pnpm --filter @giwa/web --fail-if-no-match artifact:provenance:verify -- --check
node --check apps/web/scripts/verify-provenance-report.mjs
```

Sprint 23 local outputs:

```text
docs/evidence/local-command-evidence-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
```

These outputs bind command catalog, manifest hash, drift, sidecar, scan, domain hash, and blocker evidence for local review only. They do not populate source commit, CI run id, release tag, final provenance, promotion decision, or protected branch status.

## Build Artifact Caveats

`pnpm --filter @giwa/web --fail-if-no-match build` runs the web export script before typechecking. It may refresh public JSON artifacts.

`pnpm --filter @giwa/contracts --fail-if-no-match test` runs Hardhat build before Vitest. It may refresh transient contract outputs.

In non-git mode, those changes are not authoritative provenance. A future protected CI run must regenerate or hash artifacts from immutable source before any release decision.

## Local Simulation Can Prove

- package scripts are present
- selected commands exit successfully
- syntax-check targets parse
- local build and test commands are runnable
- docs route links exist
- local scans can classify policy examples

## Local Simulation Cannot Prove

- immutable source commit
- branch protection enforcement
- required check enforcement
- clean checkout state
- lockfile drift against protected source
- workflow run id
- CI artifact digest
- release approval readiness
- no-rebuild promotion

## Handoff Wording

Use:

```text
local CI matrix simulated locally, advisory only
```

Do not use:

```text
protected CI passed
release provenance complete
staging promotion unblocked
```

unless those claims are backed by protected CI from an immutable source commit.

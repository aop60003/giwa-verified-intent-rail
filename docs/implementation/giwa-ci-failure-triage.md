# GIWA CI Failure Triage

## Purpose

This document routes Sprint 21 CI/provenance failures without starting deployment, public hosting, wallet actions, or GIWA chain-operation commands.

## Triage Table

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P0 | sensitive value disclosure | CI log or artifact prints env/process sensitive value | security quarantine | cancel run, remove artifact, rotate affected value if confirmed, block promotion |
| P1 | Sprint 21 plan missing | plan path check is false | approval gap | do not execute CI workflow work |
| P1 | source provenance failed | `.git=False` or `.github=False` | source provenance gate | block staging and keep local checks advisory |
| P1 | forbidden workflow capability | privileged trigger, write permission, deploy/fund/anchor/verify/mint/live-signing command | workflow boundary | block workflow approval and replace before CI |
| P1 | protected-check enforcement gap | CI passes but branch protection or required checks are not enforced | branch protection gate | block release provenance |
| P1 | runtime/toolchain mismatch | Node not `22.16.0`, pnpm not `10.32.1`, cache includes forbidden paths | install provenance | invalidate run and rerun from clean protected CI |
| P1 | command matrix failure | package, workspace, typecheck, build, or syntax job fails | CI blocker | keep release blocked and attach first failing job plus command |
| P1 | protected CI absent or failing | workflow path, required checks, or artifact generation missing | protected CI blocker | block release provenance |
| P1 | GitHub Actions startup failure | run conclusion is `startup_failure` and job count is zero | protected CI startup gate | keep release blocked, inspect run/check-suite metadata, and run only minimal diagnostics |
| P1 | branch protection plan or visibility gate | branch protection API returns plan or private repository visibility error | branch policy gate | keep branch protection blocked until plan upgrade, explicit public source visibility approval, or approved substitute policy |
| P1 | third-party app check suite noise | Cloudtype, Cloudflare, or Vercel check suite is queued or absent without owner | non-authoritative integration gate | do not add app checks to required checks and do not trigger provider setup |
| P1 | provenance writer invalid | source commit or run id missing, local placeholder treated as final, artifact not uploaded | artifact provenance | block promotion and regenerate only in protected CI |
| P1 | artifact hash mismatch | build tree or public artifact hash changes after manifest | no-rebuild promotion gate | stop promotion and regenerate from protected source |
| P1 | unmanifested public file | served public file missing from artifact manifest | artifact manifest gate | block promotion and update manifest policy |
| P1 | static fallback smoke failure | `/`, receipt route, `/partner`, or snapshot route not GET/200/hash-verified | rollback continuity | block promotion and do not use fallback as recovery surface |
| P1 | non-matched receipt unlock | pending or failed state opens receipt | commercial receipt gate | lock receipt/export and replay standard RPC evidence |
| P2 | lockfile drift | frozen install fails or rewrites lockfile | dependency policy | block until approved drift is recorded |
| P2 | unsupported-claim scan failure | redacted safe-scan flags boundary language outside examples | evidence boundary | correct source copy and rerun scan |
| P2 | safe scan failure | unsupported claim or sensitive surface failure | evidence boundary | quarantine artifact, correct source, rerun scans |
| P2 | approval metadata gap | owner, reviewer policy, merge policy, or approval timestamp absent | release approval | no release decision until recorded |
| P2 | rollback prerequisites missing | no manifest, prior checksum, owner, or static fallback | rollback gate | block promotion |
| P2 | partner promotion gap | signoff absent or blocker register open | partner gate | no-go for beta or staging promotion |

## Sprint 24 Approval Failure Triage

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | workflow approval missing | `.github/workflows/ci-source-provenance.yml` appears without approval record | workflow approval gate | stop workflow work and report approval gap |
| P1 | workflow created before repository authority | workflow file exists while `.git=False` or `.github=False` | source provenance gate | keep protected CI blocked |
| P1 | branch protection mismatch | required check names do not match workflow job names | branch protection gate | block release approval and update check list |
| P1 | artifact upload before protected CI | provenance JSON is uploaded without protected workflow run id | artifact upload gate | quarantine upload and regenerate from protected source later |
| P1 | blocker register not updated | source, protected CI, rollback, or fallback state changes without blocker update | release governance | block promotion until register has owner, timestamp, and evidence path |
| P2 | helper script referenced before approval | workflow references `scripts/ci` helper files that do not exist | workflow creation gate | omit helper command or approve helper creation separately |

## Sprint 30 Startup Failure Routes

| Signal | Classification | Required response |
| --- | --- | --- |
| Protected workflow has zero jobs | pre-job startup failure | do not debug package commands yet; record check-suite metadata |
| Minimal diagnostic workflow also has zero jobs | repository/account/platform gate | keep protected CI blocked and record external gate evidence |
| Diagnostic workflow starts but checkout job fails | allowed-actions policy gate | inspect repository Actions policy before changing protected workflow |
| Diagnostic Linux job starts but Windows job does not | runner policy or availability gate | keep Windows protected workflow blocked and record runner decision |
| Diagnostic workflow passes but protected workflow still has zero jobs | protected workflow YAML or graph gate | inspect `.github/workflows/ci.yml` without removing safe scans, artifact checks, or `protected-ci-gate` |

## Rollback And Static Fallback Routing

Rollback can replace app artifacts and lock new writes. Rollback cannot reverse public GIWA Sepolia evidence.

Static fallback can act as continuity only when these GET-only surfaces are green and hash-verified:

```text
/
/receipt/<receiptHash>
/partner
/partner-snapshot.json
```

Routing:

| Trigger | Route |
| --- | --- |
| CI or provenance fails before promotion | no rollback; block promotion and keep local checks advisory |
| artifact hash mismatch or bad export | quarantine artifact, remove share path, recompute hashes, rerun scans |
| non-matched receipt unlock | lock dynamic receipt/export, replay standard RPC evidence, use only verified matched static fallback |
| RPC or explorer outage | mark readiness degraded; static fallback may show recorded testnet evidence |
| stale DB or storage issue | fail closed; use isolated restore only if owner and restore evidence exist |
| no prior manifest or checksum | rollback unavailable; block promotion instead of inventing fallback provenance |

## Sprint 22 Exit Gate Prerequisites

For the recommended artifact-manifest local implementation sprint to exit:

1. User approves exactly one Sprint 22 path and file scope.
2. Local schemas and scripts exist for artifact manifest, provenance report, redacted safe scan, and workflow command boundary.
3. Dry-runs print only repo-relative paths, byte counts, hashes, or placeholders.
4. Dry-runs do not print env values, DB contents, process env, fake source commit, fake CI run id, or fake release tag.
5. Hash policy uses normalized POSIX paths, SHA-256 file hashes, sorted build-tree lines, and explicit env/DB/cache/private artifact exclusions.
6. Command-boundary guard rejects deploy, fund, anchor, verify, mint, live-signing, wallet-action, public-hosting, and managed-infrastructure commands.
7. Safe scan allowlist and exclude policy is enforced with redacted output.
8. Verification passes for script syntax, dry-run writers, command boundary, safe scan, marker scan, claim scan, and sensitive-surface scan.
9. No workflow file, deployment, public hosting, dependency install, wallet action, GIWA chain command, or protected-CI provenance claim is created unless separately approved.

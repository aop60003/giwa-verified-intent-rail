# GIWA Release 1 and Release 2 Local Completion Freeze

## Purpose and Authority

This document records the local-advisory completion boundary for:

- Release 1 — Trust and Data Integrity; and
- Release 2 — Public Verifiability and Partner Evidence.

It moves the durable outcome out of ignored local execution logs and into the
versioned documentation set. It does not claim protected CI, public deployment,
remote migration, backfill, wallet action, or chain
transaction.

```text
capturedAt=2026-07-31
authority=local-advisory
releaseGrade=false
release1=complete-local
release2=complete-local
baseHead=3b2acbcbb47fe1966e330f2080284e62c848fb6a
freezeCommit=7207be914ebc0558b8269b84271e005b40cc0d16
originIntegration=6f8974e-integrated-locally
deploymentAuthorized=false
```

The July GASOK staging plan and runbook remain authoritative for any later
public rollout. This local freeze must not be treated as Task 15 submission
evidence.

## Closed Local Scope

| Release | Locally closed behavior |
| --- | --- |
| Release 1 | neutral pre-execution Receipt state; bounded wallet recovery copy; truthful Receipt destinations and evidence-time labels; narrative-safe Campaign handoff; separate approval branch; run-ID-based local history promotion; distinct malformed and fail-closed proof states |
| Release 2 | immutable public verification bundle; Receipt/Intent/deposit three-key lookup; capability-free replay and JSON download; atomic SQLite evidence persistence; separately gated legacy backfill; controlled mismatch without a Receipt; privacy-safe campaign metrics; read-only three-hash staging smoke |

Release 1 and Release 2 preserve the public testnet/mock-asset boundary. They do
not add RWA issuance, funds or yield, settlement, identity/KYC, phishing
prevention, a security guarantee, mainnet readiness, or finality claims.

## Verification Evidence

Fresh local verification on 2026-07-31 produced:

| Command | Result |
| --- | --- |
| `pnpm test` | passed: web 94 files / 714 tests; protocol 5 files / 29 tests; contracts 3 files / 21 tests |
| `pnpm typecheck` | passed for web, protocol, and contracts |
| `pnpm build` | passed for web, protocol, and contracts; owning web export refreshed `flow-data.json` and `partner-snapshot.json` |
| `git diff --check` | passed; line-ending conversion warnings only |
| `pnpm --filter @giwa/web artifact:scan` | passed: 18 public artifacts and 25 public evidence files |
| local artifact manifest/provenance | regenerated; manifest binding and drift verification passed with zero failures |

Node emitted its existing experimental SQLite warning during SQLite-backed
tests. No test failed because of that warning.

The first freeze artifact scan found conservative scanner matches in the public
proof runtimes' own deny-list and negative settlement disclaimer. A failing
regression test was added before changing the source representation. The
runtime comparisons and rendered disclaimer remain byte-equivalent, both
public JavaScript syntax checks pass, and the complete scanner now passes.

Ignored `.superpowers/sdd/` reports retain the task-by-task RED/GREEN, browser,
privacy-scan, and review detail for the current local workspace. They are useful
operator notes but are not release evidence by themselves.

## Public and Private Boundary

The locally completed public projection is read-only and capability-free:

- a Matched Receipt publishes one immutable public bundle;
- Receipt, Intent, and deposit transaction hashes resolve the same identity;
- replay uses public bundle fields only;
- public proof remains gated by an eligible commercial Receipt and successful
  six-check replay;
- private run capabilities, run/session identifiers, request headers, raw IP,
  raw user-agent, credentials, environment values, and signing secrets are not
  public bundle fields; and
- the controlled mismatch states that no Matched Receipt was issued.

## Retained No-Go Conditions

`R2-T7-M1` remains open. Public campaign-event ingestion has no approved
release-specific retention window, row/disk capacity threshold, pruning
cadence, backup interaction, monitoring threshold, fail-closed behavior, or
implemented and verified pruning procedure. Event ingestion must remain
disabled until those decisions and the procedure are approved and verified.

The overall GASOK staging-origin gate also remains `NO-GO` until the current
submission checklist records an actual public HTTPS participant origin, a fresh
Matched Receipt and explorer transaction, a source/freshness-labelled partner
packet, the exact source commit, and final verification evidence.

## Working Tree and Git Integration Boundary

The Release 1 and Release 2 source freeze is commit `7207be9`. After that local
commit made the work recoverable, the previously unique `origin/main` commit
`6f8974e` was integrated locally under explicit user direction. Overlapping
browser and live API changes retained the current Release 1/2 trust, replay,
privacy, and public-boundary contracts; remote protocol and evidence additions
were preserved. Workspace verification and artifact provenance must pass on the
resulting merge before the integration is considered complete.

This record authorizes no additional Git publication, push, deployment, remote
migration, backfill, wallet action, or chain transaction.

## Local Artifact Exclusions

- `.superpowers/` contains ignored local execution and review records.
- `.playwright-mcp/` contains local browser snapshots/logs and is ignored.
- `apps/web/.data/` and `docs/evidence/local/` remain local-only runtime paths.
- `.env` files, credentials, wallet material, private runtime data, and raw
  local databases must never enter the freeze set.

## Next Routed Work

After the source freeze and Git integration decision:

- for GASOK submission work, follow the current staging runbook and keep event
  ingestion disabled unless `R2-T7-M1` is resolved; or
- for local product evolution, write and review a separate Release 3 Product
  Design and Responsive Accessibility implementation plan before changing the
  shared visual system.

Release 3 must preserve the Release 1 and Release 2 trust, privacy, replay, and
evidence-integrity contracts.

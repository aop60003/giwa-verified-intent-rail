# GIWA Hosted Ops Runbook

## Scope

This runbook defines hosted operations readiness for `GIWA Verified Intent Rail`.

Sprint 17 does not launch hosting. It defines the release, environment, observability, backup, incident, and partner beta gates that must pass before a later sprint can approve staging or managed partner beta exposure.

Supported operating shape:

```text
one partner
one campaign
one mission
one GIWA Sepolia mock vault action
one matched-only receipt flow
one partner evidence packet
```

## CI Blocked State

Historical hosted-ops planning allowed the workspace to be non-git prototype mode. When either `.git` or `.github` is absent, authoritative CI, branch protection, release provenance, and artifact promotion are blocked.

Current Sprint 39 posture: `.git`, `.github`, and `.github/workflows/ci.yml` exist, but current `main` has zero check-runs, the latest observed Actions run is stale and failed before runner steps with the GitHub billing/account annotation, and protected artifact metadata is absent. Hosted beta, public release, and staging dry-run execution remain blocked until protected CI passes on current `main` and protected artifact metadata exists.

Check:

```powershell
Test-Path .git
Test-Path .github
```

Historical prototype posture:

```text
At least one value may be False. No hosted beta or public release is approved from this state.
```

Do not create hosted release artifacts from a workspace without a protected source-control and CI path, or from a git-backed workspace whose protected CI is still blocked.

## Environment Contract

| Mode | Purpose | Mock mode | Host policy | Storage | Auth |
| --- | --- | --- | --- | --- | --- |
| `local` | localhost rehearsal and review | allowed only with explicit local flag | `127.0.0.1` default | local SQLite rehearsal DB | local bypass only when explicitly enabled |
| `staging-testnet` | pre-hosted GIWA Sepolia smoke | disabled by default | public host only after release gate approval | staging durable store or isolated rehearsal DB | required |
| `prod-testnet` | managed GIWA Sepolia partner beta | forbidden | public host only after deployment approval | durable store with backup/restore drill | required |

`prod-testnet` cannot use mock mode.

Plain-language gate: prod-testnet cannot use mock mode.

`prod-testnet` is still GIWA Sepolia testnet. It is not a mainnet, custody, billing, production finance, or public self-serve mode.

Public host binding remains blocked until a later approved deployment plan names the host, owner, credential distribution process, storage adapter, backup/restore procedure, incident owner, and rollback path.

## Server-Only Environment Matrix

| Category | Examples | Public exposure rule |
| --- | --- | --- |
| Runtime mode and host | mode, host, port, allowed origins | show mode and host policy only |
| Chain/RPC | GIWA Sepolia standard RPC config | show chain id and provider label only |
| Manifest signing | campaign signer credential | show normalized public address only |
| Partner auth | credential hashes and key ids | show set/missing and key id only |
| Storage and backup | DB path or adapter, backup target | show adapter, status, and backup age only |
| Observability | log or metric sink config | show configured/missing only |

Runtime must never include deployer, funder, mint, anchor, verifier-chain, or user wallet secret material.

## Redacted Readiness Requirement

`/healthz` remains a liveness endpoint. It must stay cheap and dependency-light.

`/readyz` reports only redacted readiness:

- mode
- check names
- set, missing, or invalid state
- public address where derivable
- chain id result
- string length or format class
- backup freshness
- DB read/write probe result
- queue backlog status
- verifier/RPC health status
- hosted policy status

`/readyz` must not return raw config values, credential values, tokenized URLs, auth headers, request bodies, stack traces, provider error strings, signed manifest internals, or real env file content.

## Role and Rotation Policy

Separate roles:

- campaign signer
- partner API credential
- RPC credential
- DB migration role
- backup/restore role
- observability credential
- optional verifier or anchor operator only after explicit approval

Rotation requirements:

1. Assign a key id or credential id before activation.
2. Log a redacted rotation event with owner and time.
3. Confirm readiness with the new credential.
4. Revoke the old credential after the overlap window.
5. Notify partner contacts when partner access is affected.
6. Stop new manifest issuance if campaign signer exposure is suspected.
7. Allow existing unexpired manifests only when verifier policy supports the signer key id.
8. Keep receipts locked for evidence signed by a retired signer unless replay policy explicitly accepts it.

Any suspected credential exposure pauses hosted beta until rotation and public artifact scans pass.

## Release Gate Checklist

Required before staging smoke or managed beta:

- web package tests pass
- protocol package tests pass
- contracts package tests pass
- typecheck and build pass
- browser and server scripts pass syntax checks
- static fallback routes return HTTP 200 locally
- `/demo`, `/live`, `/healthz`, `/readyz`, and matched dynamic receipt API return bounded output locally
- commercial receipt gate passes and remains matched-only
- verifier replay evidence can recompute `verifierInputHash` and `receiptHash`
- partner evidence packet remains one partner, one campaign, one mission, one action
- public artifact guard passes for snapshots and static assets
- no dependency drift without dependency approval update
- no real env file content printed or scanned
- no wallet transaction, deploy, funding, anchoring, verifier-chain, or mint command in release gate

Allowed verification commands:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Do not include chain-operation scripts in the release gate.

Historical verifier-chain checks are not part of Sprint 17 automated release verification. If a later sprint needs a verifier replay check, create a separately named read-only command that cannot emit chain transactions.

## Artifact Promotion Manifest

Promotion from staging to `prod-testnet` must use the same artifact manifest and checksums. Do not rebuild or mutate artifacts between stages.

Manifest shape:

```json
{
  "releaseId": "giwa-intent-rail-testnet-YYYYMMDD",
  "sourceCommit": "required-when-git-backed",
  "stage": "staging-testnet",
  "generatedAt": "ISO-8601",
  "artifacts": [
    { "path": "apps/web/public/flow-data.json", "sha256": "<computed>" },
    { "path": "apps/web/public/partner-snapshot.json", "sha256": "<computed>" },
    { "path": "apps/web/public/live-demo-snapshot.json", "sha256": "<computed>" },
    { "path": "docs/evidence/live-demo-sprint12-snapshot.json", "sha256": "<computed>" }
  ],
  "checks": {
    "staticFallback": "pass",
    "liveReadOnlySmoke": "pass",
    "commercialReceiptGate": "pass",
    "safeScans": "pass"
  }
}
```

Stop promotion if CI is absent, `.git` is absent, the lockfile changed unexpectedly, public artifact guard fails, static fallback fails, hosted readiness is red, or any workflow needs wallet action, chain operation, or real env content output.

## Observability and Alert Model

API responses and logs must correlate to a request id. Logs are allowlist-based and exclude raw request bodies, credential values, tokenized URLs, env values, stack traces, and raw upstream provider messages.

Standard event names:

```text
live.api.request
live.server.startup
live.readiness.check
live.receipt.gate_violation
live.chain.wrong_chain
live.hosted.mock_mode_blocked
live.backup.stale
live.verifier.timeout
live.db.write_failure
live.auth.bypass_suspicion
live.rate_limited
live.verification.job_queued
live.verification.job_leased
live.verification.job_retryable
live.verification.job_dead
```

Low-cardinality metric names:

```text
live_api_requests_total
live_api_request_duration_ms
live_readiness_ready
live_backup_age_seconds
live_verifier_timeout_total
live_verification_job_backlog
live_db_write_failures_total
live_auth_failures_total
live_receipt_gate_violations_total
live_wrong_chain_total
```

Keep run id, wallet address, transaction hash, and request id in structured logs, not metric labels.

| Alert | Severity | Trigger |
| --- | --- | --- |
| Receipt gate violation | P0 | Receipt/API/export succeeds while run or decision is not `matched` |
| Wrong chain | P0/P1 | Verifier or readiness evidence is not GIWA Sepolia `91342` |
| Mock mode in `prod-testnet` | P0 | Hosted startup attempts mock mode in managed beta |
| Backup stale | P1 | Backup age exceeds RPO or restore drill metadata is missing |
| Verifier timeout spike | P1 | Timeout ratio or count crosses threshold |
| DB write failure | P1 | Run, evidence, job, decision, receipt, or audit write fails |
| Auth bypass suspicion | P0/P1 | Hosted mode sees unauthenticated partner API access or local bypass |

## Fresh Rehearsal Gate

Fresh rehearsal must use isolated staging state or an isolated local DB path. Old local DB rows must not hide readiness or schema issues.

Gate:

- `/healthz` and `/readyz` return redacted output
- receipt route opens only for `matched`
- standard RPC evidence is replayable
- `verifierInputHash` and `receiptHash` recompute
- manifest signer recovery is documented in evidence
- public snapshots pass artifact scans
- static fallback still works
- no flow asks for wallet or env secrets
- fast feedback is never final confirmation

If the live path is unavailable, switch to the recorded static fallback and label it as recorded GIWA Sepolia testnet evidence.

## Static Fallback Gate

Static fallback must remain available before any hosted beta:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner-snapshot.json
```

Live read-only smoke, when a local live server is already running:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/demo
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/readyz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/api/receipts/<matchedReceiptHash>
```

Do not include wallet execution, `/verify`, deploy, funding, anchoring, verifier-chain, or mint commands in this gate.

## Sprint 18 Partner Rehearsal Gate

Sprint 18 must use the partner rehearsal package:

```text
docs/implementation/giwa-partner-beta-rehearsal-runbook.md
docs/implementation/giwa-partner-beta-rehearsal-checklist.md
docs/implementation/giwa-partner-beta-feedback-form.md
docs/implementation/giwa-partner-beta-closeout-report.md
```

Gate:

- partner intake is frozen before review
- opening order uses `/demo`, `/live`, matched receipt API, static fallback, `/partner`, and `/partner-snapshot.json`
- local live review uses isolated DB state
- `/healthz` and `/readyz` return bounded redacted output
- dynamic receipt opens only after `matched`
- static fallback is labeled recorded GIWA Sepolia testnet evidence
- incident and fallback drill result is captured
- closeout report records Sprint 19 blockers
- no public hosting, staging deployment, server/script wallet action, dependency installation, or chain-operation command is performed

## Sprint 19 Staging Deployment Preparation

Sprint 19 planning is documented in:

```text
docs/superpowers/plans/2026-06-19-sprint-19-staging-deployment-preparation.md
```

The plan must turn Sprint 18 blockers into owner-assigned gates for source provenance, host policy, environment contract, storage, observability, security, rollback, and partner promotion. It does not approve public host binding or staging smoke by itself.

Sprint 19 execution artifacts:

```text
docs/implementation/giwa-staging-deployment-preparation.md
docs/implementation/giwa-staging-release-provenance.md
docs/implementation/giwa-staging-env-contract.md
docs/implementation/giwa-staging-storage-and-restore.md
docs/implementation/giwa-staging-observability.md
docs/implementation/giwa-staging-security-boundary.md
docs/implementation/giwa-staging-rollback-and-incident-drill.md
docs/implementation/giwa-staging-partner-promotion-gate.md
docs/implementation/giwa-staging-blocker-register.md
```

Current Sprint 19 blocker state:

- Historical Sprint 19 planning began from a prototype posture; current Sprint 39 is git-backed, but protected CI and release provenance remain blocked
- current `main` has zero check-runs
- latest real Actions evidence is stale for current `main` and failed before runner steps with the GitHub account gate
- protected artifact metadata is absent
- staging host selection is absent
- durable staging storage and restore evidence are absent
- hosted readiness currently needs protected CI, protected artifact metadata, tenant, rate-limit, queue, and backup probes before public binding
- external partner signoff is absent

## Hosted Ops Exit Gate

Hosted ops readiness is met only when:

- environment contract and redacted readiness are documented
- release gate checklist is complete
- CI remains blocked when `.git` or `.github` is absent, or when protected CI has not passed on current `main`
- artifact promotion manifest is defined
- observability events, metrics, and alerts are defined
- backup/restore and retention policy is linked
- incident response runbook is linked
- partner beta runbook is linked
- Sprint 18 partner rehearsal package is linked
- public hosting remains blocked until explicit Sprint 18 approval

## Linked Sprint 17 Documents

- `docs/implementation/giwa-partner-beta-runbook.md`
- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-partner-beta-rehearsal-checklist.md`
- `docs/implementation/giwa-partner-beta-feedback-form.md`
- `docs/implementation/giwa-partner-beta-closeout-report.md`
- `docs/implementation/giwa-incident-response.md`
- `docs/implementation/giwa-evidence-retention-policy.md`

# Sprint 17 Hosted Ops and Partner Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare `GIWA Verified Intent Rail` for hosted operations and a controlled partner beta by closing operational documents, release gates, rehearsal criteria, and partner handoff materials. Sprint 17 is a planning and operations-readiness sprint. It does not deploy, public-host, connect external managed infrastructure, or start partner beta traffic.

**Architecture:** Sprint 17 sits on top of Sprint 15 hosted API foundations and Sprint 16 commercial UX polish. The local live server, static fallback, matched-only receipt gate, standard RPC verifier evidence, partner packet, and `/demo` control room remain the baseline. Hosted operations are defined through environment contracts, release gates, observability, backup/restore, incident response, and partner beta runbooks before any deployment or public exposure can be approved.

**Tech Stack:** Markdown operational documentation, existing local Node HTTP server checks, existing Vitest/package verification commands, existing static and live smoke paths, existing GIWA Sepolia testnet evidence. No new dependency is allowed in Sprint 17.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-19-giwa-commercial-readiness-design.md`
- `docs/superpowers/specs/2026-06-19-intentrail-v2-decision-anchor-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-13-commercial-readiness.md`
- `docs/superpowers/plans/2026-06-19-sprint-14-verifier-trust-hardening.md`
- `docs/superpowers/plans/2026-06-19-sprint-15-hosted-api-foundation.md`
- `docs/superpowers/plans/2026-06-19-sprint-16-commercial-ux-polish.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-demo-script.md`
- `docs/implementation/giwa-mvp-acceptance-checklist.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`
- `apps/web/scripts/serve-live.mjs`
- `apps/web/scripts/serve-static.mjs`
- `apps/web/src/lib/live/*`
- `apps/web/src/lib/verifier/*`
- `apps/web/public/demo-control-room.js`
- `apps/web/public/live-flow.js`
- `apps/web/public/flow.js`

## Parallel Read-Only Analysis Summary

Six read-only explorer passes inform this plan:

- Environment contract: split `local`, `staging-testnet`, and `prod-testnet` explicitly. `prod-testnet` is still GIWA Sepolia testnet, forbids mock mode, and requires approval before public host binding.
- CI and release gate: the workspace is currently non-git prototype mode, no authoritative CI was found, and release or public hosting must stay blocked until a git-backed gate and artifact provenance exist.
- Observability: keep `/healthz` cheap, make `/readyz` redacted and richer, standardize low-cardinality metrics and structured event names, and alert on receipt gate violations, wrong chain, mock mode in `prod-testnet`, stale backups, verifier timeout spikes, DB write failures, and auth bypass suspicion.
- Backup and evidence archive: local SQLite is rehearsal storage only. Hosted beta needs durable storage, restore drills, retention rules, raw-versus-sanitized evidence boundaries, and archive manifests with snapshot hashes.
- Incident response: define P0/P1/P2 severity, key exposure response, wrong-chain response, evidence quarantine, verifier mismatch spike response, RPC/faucet outage response, read-only fallback, and a postmortem template.
- Partner beta operations: add intake, kickoff, reviewer opening order, fresh rehearsal gate, closeout report, success metrics, non-goals, stop conditions, and customer-facing limitations for one partner, one campaign, one mission, and one GIWA Sepolia mock vault action.

## Sprint 17 Boundary

Allowed:

- Create or update operational markdown documents.
- Add release, rehearsal, static fallback, observability, backup/restore, incident, and partner beta gate checklists.
- Use local/dry-run verification commands that do not mutate chain state.
- Keep hosted modes as policy and runbook language, not as a public deployment.
- Reference existing public transaction hashes, receipt hashes, block metadata, and safe evidence artifact paths.

Not allowed:

- Code implementation beyond correcting broken documentation or asset references.
- Public hosting, deployment, or production infrastructure connection.
- External managed database or cloud credential store connection.
- Wallet approve/deposit transaction submission.
- Contract deployment, funding, anchoring, verifier-chain command, or mint command execution.
- New dependency installation.
- Sprint 18 staging deployment or post-beta scope.
- Flashblocks as final confirmation.
- Production asset, yield, fund movement, settlement, identity-service, phishing-prevention, or safety warranty claims.
- Reading, printing, or content-scanning real env files.

## Planned File Structure

Create during Sprint 17 execution:

```text
docs/implementation/giwa-hosted-ops-runbook.md
docs/implementation/giwa-partner-beta-runbook.md
docs/implementation/giwa-incident-response.md
docs/implementation/giwa-evidence-retention-policy.md
```

Modify during Sprint 17 execution:

```text
README.md
docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
docs/implementation/giwa-commercial-readiness-gate.md
docs/implementation/giwa-live-mvp-runtime-gate.md
docs/implementation/giwa-mvp-runbook.md
docs/implementation/giwa-mvp-demo-script.md
docs/implementation/giwa-mvp-acceptance-checklist.md
docs/implementation/giwa-mvp-submission-evidence.md
```

Keep these as documentation and operations artifacts. Do not add hosted infrastructure code, CI workflow files, deployment scripts, or cloud-specific adapters in Sprint 17 unless a later approved sprint explicitly changes the scope.

---

## Task 1: Sprint 17 Boundary Docs and Index Update

### Files

- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `README.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`

### Failing Doc Check

- [ ] Add a documentation check that proves Sprint 17 is not yet linked from the sprint index or hosted operations docs.

```powershell
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-17-hosted-ops-and-partner-beta.md" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Hosted Ops and Partner Beta Gate" -Quiet
Select-String -Path docs\implementation\giwa-live-mvp-runtime-gate.md -Pattern "Sprint 17 Hosted Ops Boundary" -Quiet
Select-String -Path docs\implementation\giwa-mvp-runbook.md -Pattern "Sprint 17 Hosted Ops" -Quiet
```

Expected red state:

```text
At least one check returns False before Sprint 17 docs are linked.
```

### Failure Confirmation Command

```powershell
Test-Path docs\implementation\giwa-hosted-ops-runbook.md
Test-Path docs\implementation\giwa-partner-beta-runbook.md
Test-Path docs\implementation\giwa-incident-response.md
Test-Path docs\implementation\giwa-evidence-retention-policy.md
```

Expected red state:

```text
The new operations docs do not exist before this task is implemented.
```

### Writing Direction

- Add a Sprint 17 row after Sprint 16 in the sprint index.
- Add a short hosted operations boundary to the runtime gate.
- Add a commercial readiness gate section that keeps public hosting blocked until release, storage, backup, incident, and partner beta gates pass.
- Add runbook links to the future hosted ops and partner beta docs without changing runnable local commands.
- Keep the language testnet-only and single-flow.

Suggested index row:

```markdown
| 17 | `2026-06-19-sprint-17-hosted-ops-and-partner-beta.md` | hosted operations, release gate, observability, backup/restore, incident response, and partner beta runbooks | Sprint 16 approval |
```

### Passing Command

```powershell
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-17-hosted-ops-and-partner-beta.md" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Hosted Ops and Partner Beta Gate" -Quiet
Select-String -Path docs\implementation\giwa-live-mvp-runtime-gate.md -Pattern "Sprint 17 Hosted Ops Boundary" -Quiet
Select-String -Path docs\implementation\giwa-mvp-runbook.md -Pattern "Sprint 17 Hosted Ops" -Quiet
```

### Exit Condition

```text
Sprint 17 is discoverable from the index and runbooks, and the docs explicitly state that Sprint 17 does not authorize deployment, public hosting, external storage, cloud credential management, wallet transactions, or chain-operation commands.
```

## Task 2: Environment Contract Matrix

### Files

- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-role-and-key-policy.md`

### Failing Doc Check

- [ ] Add a check that fails until the environment contract includes all three runtime modes and role separation.

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "local" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "staging-testnet" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "prod-testnet" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Server-Only Environment Matrix" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Role and Rotation Policy" -Quiet
```

Expected red state:

```text
The checks fail before the hosted operations runbook exists.
```

### Failure Confirmation Command

```powershell
Select-String -Path docs\implementation\giwa-live-mvp-runtime-gate.md -Pattern "prod-testnet cannot use mock mode" -Quiet
```

### Writing Direction

Create an environment matrix with these minimum rules:

| Mode | Purpose | Mock mode | Host policy | Storage | Auth |
| --- | --- | --- | --- | --- | --- |
| `local` | localhost rehearsal and review | allowed only with explicit local flag | `127.0.0.1` default | local SQLite rehearsal DB | local bypass only when explicitly enabled |
| `staging-testnet` | pre-hosted GIWA Sepolia smoke | disabled by default | public host only after release gate approval | staging durable store or isolated rehearsal DB | required |
| `prod-testnet` | managed GIWA Sepolia partner beta | forbidden | public host only after deployment approval | durable store with backup/restore drill | required |

Document server-only categories without values:

```markdown
| Category | Examples | Public exposure rule |
| --- | --- | --- |
| Runtime mode and host | mode, host, port, allowed origins | show mode and host policy only |
| Chain/RPC | GIWA Sepolia standard RPC config | show chain id and provider label only |
| Manifest signing | campaign signer credential | show normalized public address only |
| Partner auth | credential hashes and key ids | show set/missing and key id only |
| Storage and backup | DB path or adapter, backup target | show adapter, status, and backup age only |
| Observability | log or metric sink config | show configured/missing only |
```

Rotation policy must cover campaign signer, partner API credential, RPC credential, DB migration role, backup role, and observability credential. It must stop new issuance on suspected exposure and keep existing unexpired manifests valid only if the verifier policy supports the key id.

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Server-Only Environment Matrix" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "prod-testnet cannot use mock mode" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Role and Rotation Policy" -Quiet
```

### Exit Condition

```text
The runbook explains local, staging-testnet, and prod-testnet behavior; public host binding remains blocked without approval; prod-testnet cannot use mock mode; and readiness output is redacted by design.
```

## Task 3: Release Gate Checklist

### Files

- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-mvp-acceptance-checklist.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`

### Failing Doc Check

- [ ] Add a check that fails until release gate criteria are documented.

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Release Gate Checklist" -Quiet
Select-String -Path docs\implementation\giwa-mvp-acceptance-checklist.md -Pattern "Hosted ops release gate" -Quiet
```

### Failure Confirmation Command

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "no dependency drift" -Quiet
```

### Writing Direction

Add a release gate checklist with these required results:

```markdown
## Release Gate Checklist

- web package tests pass
- protocol package tests pass
- contracts package tests pass
- typecheck and build pass
- browser and server scripts pass syntax checks
- static fallback routes return HTTP 200 locally
- `/demo`, `/live`, `/healthz`, `/readyz`, and matched dynamic receipt API return bounded output locally
- commercial receipt gate passes and remains matched-only
- verifier replay evidence can recompute `verifierInputHash` and `receiptHash`
- public artifact guard passes for snapshots and static assets
- no dependency drift without dependency approval update
- no real env file content printed or scanned
- no wallet transaction, deploy, funding, anchoring, verifier-chain, or mint command in release gate
```

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

Do not include chain-operation scripts in the gate. If a read-only verifier replay command is desired later, create a separately named command that cannot emit chain transactions.

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Release Gate Checklist" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "no dependency drift" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Release Gate Checklist" -Quiet
```

### Exit Condition

```text
The release gate documents every required check, excludes chain-operation and wallet-action commands, and blocks hosted beta if any required check is red.
```

## Task 4: CI and Artifact Promotion Plan

### Files

- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`

### Failing Doc Check

- [ ] Add a check that fails until CI blocked state and artifact promotion are documented.

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "CI Blocked State" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Artifact Promotion Manifest" -Quiet
```

### Failure Confirmation Command

```powershell
Test-Path .git
Test-Path .github
```

Expected red state in the current workspace:

```text
At least one check is False, so authoritative CI and promotion remain blocked in non-git prototype mode.
```

### Writing Direction

Document that CI and release are blocked until the workspace is git-backed and a protected workflow exists. Define the proposed required checks, but do not create workflow files in Sprint 17.

Artifact promotion must use the same manifest/checksum set from staging to `prod-testnet`. It must not rebuild or mutate artifacts between stages.

Promotion manifest fields:

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

Stop promotion if CI is absent, `.git` is absent, the lockfile changes unexpectedly, public artifact guard fails, static fallback fails, hosted readiness is red, or any workflow requires wallet action, chain operation, or real env content output.

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "CI Blocked State" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Artifact Promotion Manifest" -Quiet
Select-String -Path docs\implementation\giwa-mvp-submission-evidence.md -Pattern "artifact promotion" -Quiet
```

### Exit Condition

```text
The plan states that CI/release remains blocked in the current workspace, defines promotion manifest requirements, and requires staging verification before any prod-testnet promotion.
```

## Task 5: Observability and Alert Model

### Files

- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`

### Failing Doc Check

- [ ] Add a check that fails until health/readiness, event names, metrics, and alerts are documented.

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Observability and Alert Model" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "live.receipt.gate_violation" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "live_backup_age_seconds" -Quiet
```

### Failure Confirmation Command

```powershell
Select-String -Path apps\web\scripts\serve-live.mjs -Pattern "/healthz|/readyz"
Select-String -Path apps\web\src\lib\live\liveTelemetry.ts -Pattern "live.api.request"
```

The current code confirms a baseline exists. Sprint 17 documents the operational contract without changing code.

### Writing Direction

Add these operational rules:

- `/healthz` remains liveness-only and dependency-light.
- `/readyz` returns redacted readiness only: mode, check names, set/missing/invalid state, public address where derivable, chain id result, backup freshness, DB probe, queue status, verifier/RPC status, hosted policy status.
- API responses and logs include or correlate to a request id.
- Logs are allowlist-based and exclude raw request bodies, credential values, tokenized URLs, env values, stack traces, and raw upstream provider messages.

Standardize event names:

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

Metrics must be low-cardinality and keep run id, wallet address, tx hash, and request id out of metric labels:

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

Alert table:

| Alert | Severity | Trigger |
| --- | --- | --- |
| Receipt gate violation | P0 | Receipt/API/export succeeds while run or decision is not `matched` |
| Wrong chain | P0/P1 | Verifier or readiness evidence is not GIWA Sepolia `91342` |
| Mock mode in `prod-testnet` | P0 | Hosted startup attempts mock mode in managed beta |
| Backup stale | P1 | Backup age exceeds RPO or restore drill metadata is missing |
| Verifier timeout spike | P1 | Timeout ratio or count crosses threshold |
| DB write failure | P1 | Run, evidence, job, decision, receipt, or audit write fails |
| Auth bypass suspicion | P0/P1 | Hosted mode sees unauthenticated partner API access or local bypass |

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Observability and Alert Model" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "live.receipt.gate_violation" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "live_backup_age_seconds" -Quiet
```

### Exit Condition

```text
Hosted operations docs define health, readiness, redacted logs, metrics, and alert rules without adding a metrics endpoint or external telemetry integration in Sprint 17.
```

## Task 6: Backup, Restore, and Evidence Archive Policy

### Files

- `docs/implementation/giwa-evidence-retention-policy.md`
- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`

### Failing Doc Check

- [ ] Add a check that fails until backup/restore and evidence archive policy are documented.

```powershell
Select-String -Path docs\implementation\giwa-evidence-retention-policy.md -Pattern "Backup and Restore Drill" -Quiet
Select-String -Path docs\implementation\giwa-evidence-retention-policy.md -Pattern "Evidence Archive Manifest" -Quiet
Select-String -Path docs\implementation\giwa-evidence-retention-policy.md -Pattern "Raw Versus Sanitized Evidence" -Quiet
```

### Failure Confirmation Command

```powershell
Test-Path docs\implementation\giwa-evidence-retention-policy.md
```

Expected red state:

```text
The policy file does not exist before Sprint 17 execution.
```

### Writing Direction

Document the distinction:

- Local SQLite rehearsal DB is not a hosted durable store.
- Hosted beta requires durable storage, migration guard, backup catalog, restore drill, and owner.
- Raw evidence stays private and retention-bound.
- Sanitized evidence snapshots can be shared after scans.

Backup/restore drill checklist:

```markdown
1. Record environment, DB path or adapter, app version, schema migrations, tenant, partner, campaign, mission, and backup timestamp.
2. Back up DB plus public evidence artifacts; exclude env files, wallet material, raw local logs, and browser state.
3. Restore into isolated staging or rehearsal state.
4. Confirm migration guard passes and legacy schemas fail closed.
5. Compare row counts for runs, submitted txs, decisions, receipts, verifier inputs, and verification jobs.
6. Recompute `verifierInputHash` and `receiptHash`.
7. Regenerate live snapshot and compare file hash.
8. Confirm matched-only receipt gate remains closed for unmatched, failed, timeout, missing-decision, and replay-mismatch states.
9. Run public artifact scans before sharing the archive.
```

Evidence archive manifest fields:

```json
{
  "archiveId": "giwa-evidence-YYYYMMDD",
  "createdAt": "ISO-8601",
  "environment": "staging-testnet",
  "tenantId": "tenant_public_label",
  "campaignId": "gasok-demo",
  "missionId": "first-mock-vault-deposit",
  "schemaMigrations": ["001_live_base"],
  "snapshotSha256": "<computed>",
  "containsRawEvidence": false,
  "redactionResult": "pass"
}
```

Retention policy:

- Local unmatched/failed/timeout rehearsal DBs: purge within 7 days unless preserved for investigation.
- Local matched rehearsal DBs: purge within 30 days after public snapshot export unless preserved for review.
- Public sanitized snapshots: retain as versioned artifacts.
- Raw local logs: do not share; if centralized later, default 14 days.
- Partner beta audit logs: default 90 days unless partner agreement requires a shorter period.
- Public chain data cannot be deleted by the app.

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-evidence-retention-policy.md -Pattern "Backup and Restore Drill" -Quiet
Select-String -Path docs\implementation\giwa-evidence-retention-policy.md -Pattern "Evidence Archive Manifest" -Quiet
Select-String -Path docs\implementation\giwa-evidence-retention-policy.md -Pattern "Raw Versus Sanitized Evidence" -Quiet
```

### Exit Condition

```text
The policy defines storage boundaries, backup/restore checks, archive manifest fields, retention periods, and public evidence redaction requirements without creating or modifying any DB.
```

## Task 7: Incident Response Runbook Plan

### Files

- `docs/implementation/giwa-incident-response.md`
- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`

### Failing Doc Check

- [ ] Add a check that fails until the incident runbook includes severity, key response, fallback, and postmortem sections.

```powershell
Select-String -Path docs\implementation\giwa-incident-response.md -Pattern "Severity Matrix" -Quiet
Select-String -Path docs\implementation\giwa-incident-response.md -Pattern "Key Exposure Response" -Quiet
Select-String -Path docs\implementation\giwa-incident-response.md -Pattern "Read-Only Fallback Mode" -Quiet
Select-String -Path docs\implementation\giwa-incident-response.md -Pattern "Postmortem Template" -Quiet
```

### Failure Confirmation Command

```powershell
Test-Path docs\implementation\giwa-incident-response.md
```

Expected red state:

```text
The incident response file does not exist before Sprint 17 execution.
```

### Writing Direction

Create a severity matrix:

| Severity | Trigger | Immediate posture |
| --- | --- | --- |
| P0 | Secret exposure, wrong-chain acceptance, receipt opens for bad evidence, public export leak | Stop live path, lock receipts/exports, rotate or retire affected role, use static fallback only |
| P1 | Verifier mismatch spike, RPC outage, faucet exhaustion, hosted gate regression | Read-only mode, queue or hold verification, preserve evidence, investigate before retry |
| P2 | Stale static fallback, unclear readiness copy, isolated failed export before distribution | Fix docs or artifacts, regenerate safe outputs, add checks |

Incident workflows:

- Key exposure response: stop issuance and exports, rotate distinct roles, invalidate manifests if signer exposure is suspected, regenerate public artifacts only after scans pass.
- Wrong-chain response: invalidate run, require chain `91342`, verify EIP-712 domain and deployed `IntentRail`, keep receipt locked.
- Bad evidence export: quarantine artifact, remove public link, recompute hashes, regenerate from sanitized fields.
- Verifier mismatch spike: pause fanout, keep receipts locked, group by failure reason, replay standard RPC evidence, inspect signer/domain/deployment drift.
- RPC or faucet outage: mark readiness degraded, block final verification/export, keep static fallback labeled as recorded evidence.
- Read-only fallback: allow safe GETs for static demo, partner snapshot, known matched fixture receipt; block POST actions.

Postmortem template:

```markdown
## Incident <id>

- Severity:
- Owner:
- Status:
- Time window:
- Affected mode:
- Summary:
- Reviewer or partner impact:
- Detection source:
- Timeline:
- Root cause:
- Evidence affected:
- Mitigation:
- Follow-up actions:
- Safety confirmations:
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-incident-response.md -Pattern "Severity Matrix" -Quiet
Select-String -Path docs\implementation\giwa-incident-response.md -Pattern "Read-Only Fallback Mode" -Quiet
Select-String -Path docs\implementation\giwa-incident-response.md -Pattern "Postmortem Template" -Quiet
```

### Exit Condition

```text
The incident runbook covers P0/P1/P2, key exposure, wrong chain, bad export, verifier spike, RPC/faucet outage, read-only fallback, and postmortem capture.
```

## Task 8: Partner Beta Intake, Kickoff, and Closeout Plan

### Files

- `docs/implementation/giwa-partner-beta-runbook.md`
- `docs/implementation/giwa-mvp-demo-script.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`

### Failing Doc Check

- [ ] Add a check that fails until partner beta intake, kickoff, opening order, rehearsal, closeout, success metrics, and stop conditions are present.

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Partner Intake Checklist" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Pilot Kickoff" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Reviewer Opening Order" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Partner Closeout Report" -Quiet
```

### Failure Confirmation Command

```powershell
Test-Path docs\implementation\giwa-partner-beta-runbook.md
```

Expected red state:

```text
The partner beta runbook does not exist before Sprint 17 execution.
```

### Writing Direction

Partner beta scope:

```text
one partner
one campaign
one mission
one GIWA Sepolia mock vault action
one matched-only receipt flow
one evidence packet
```

Intake checklist:

- partner name, owner, technical contact, incident contact, pilot window
- campaign id, mission id, referral or QR metadata
- GIWA Sepolia `91342`, mock vault target, selector, mock token, amount, spender, max allowance, expiry
- safe copy approval for testnet-only mock action evidence
- expected traffic, rate limits, rehearsal date, fallback path, closeout date
- data handling confirmation for public wallet and transaction evidence

Reviewer opening order:

```text
1. /demo control room
2. /live fresh wallet-run path
3. /api/receipts/<matchedReceiptHash> after matched receipt exists
4. / static fallback
5. /partner evidence packet
6. /partner-snapshot.json static snapshot
```

Closeout report fields:

- pilot scope and dates
- funnel: entry opened, wallet connected, GIWA readiness, manifest preview, wallet actions, block confirmation, verifier decision, receipt issued
- evidence quality: `intentHash`, `depositTxHash`, block evidence, verifier status, `receiptHash`, replay status
- failure summary: wrong chain, no test token, rejected wallet action, timeout, mismatch, failed transaction, rate limit, bounded API error
- recommendation: repeat campaign, second testnet action template, export improvement, or stop

Customer-facing limitations:

- GIWA Sepolia testnet mock vault action only
- receipt is manifest-matched action evidence, not payment or settlement proof
- Flashblocks is fast non-final feedback
- optional verified-state context is read-only context, not identity or eligibility service
- public chain data cannot be deleted by the app

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Partner Intake Checklist" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Pilot Kickoff" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Partner Closeout Report" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Stop Conditions" -Quiet
```

### Exit Condition

```text
The partner beta runbook can guide a controlled one-partner testnet pilot without expanding into multi-campaign SaaS, mainnet, custody, billing, or production financial claims.
```

## Task 9: Fresh Rehearsal and Static Fallback Gate

### Files

- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-partner-beta-runbook.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-acceptance-checklist.md`

### Failing Doc Check

- [ ] Add a check that fails until fresh rehearsal and static fallback gates are documented.

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Fresh Rehearsal Gate" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Static Fallback Gate" -Quiet
Select-String -Path docs\implementation\giwa-mvp-acceptance-checklist.md -Pattern "Hosted ops fresh rehearsal" -Quiet
```

### Failure Confirmation Command

```powershell
Select-String -Path docs\implementation\giwa-mvp-runbook.md -Pattern "Fresh Rehearsal Gate" -Quiet
```

### Writing Direction

Fresh rehearsal gate:

- use an isolated DB path or hosted staging state
- confirm `/healthz` and `/readyz` are redacted
- confirm receipt gate opens only for `matched`
- confirm standard RPC evidence, verifier input hash, receipt hash, signer recovery, and snapshot export are recomputable
- confirm public artifacts contain no secret-like material
- confirm static fallback still works
- stop if a receipt opens before match, fast feedback is used as final confirmation, or any flow asks for wallet or env secrets

Static fallback gate:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner-snapshot.json
```

Live read-only smoke gate:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/demo
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/readyz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/api/receipts/<matchedReceiptHash>
```

Do not include wallet execution, `/verify`, deploy, funding, anchoring, verifier-chain, or mint commands in this gate.

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Fresh Rehearsal Gate" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Static Fallback Gate" -Quiet
Select-String -Path docs\implementation\giwa-mvp-acceptance-checklist.md -Pattern "Hosted ops fresh rehearsal" -Quiet
```

### Exit Condition

```text
The gate documents fresh rehearsal and static fallback verification with local/read-only commands only, and keeps wallet execution as a human-owned browser action outside Sprint 17 automated operations.
```

## Task 10: Final Safe Scans and Handoff

### Files

- `docs/superpowers/plans/2026-06-19-sprint-17-hosted-ops-and-partner-beta.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/implementation/*.md`
- `README.md`

### Failing Doc Check

- [ ] Run safe scans after all Sprint 17 documents are written.

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("payment set" + "tled")
$secretSurfacePattern = "private" + "Key|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|author" + "ization|NEXT" + "_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"

rg -n $docPattern docs\superpowers\plans\2026-06-19-sprint-17-hosted-ops-and-partner-beta.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation README.md -g "*.md"
rg -n $riskPattern docs\superpowers\plans\2026-06-19-sprint-17-hosted-ops-and-partner-beta.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation README.md -g "*.md"
rg -n $secretSurfacePattern docs\superpowers\plans\2026-06-19-sprint-17-hosted-ops-and-partner-beta.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation README.md -g "*.md" -g "!**/.env*"
```

Expected result:

```text
The Sprint 17 plan and changed docs contain no unfinished markers, no forbidden commercial claim, and no secret-like value. Existing matches outside changed text must be reported as guardrail examples only.
```

### Failure Confirmation Command

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-17-hosted-ops-and-partner-beta.md -Pattern "deploy:giwa|fund:giwa|anchor:giwa|verify:giwa|mint"
```

Expected result:

```text
Matches are allowed only in "Not allowed" or "do not run" guardrails.
```

### Writing Direction

Write a Sprint 17 completion report with:

- parallel analysis summary
- created and modified files
- commands/checks run
- environment contract summary
- release gate summary
- observability and alert summary
- backup/restore and evidence retention summary
- incident response summary
- partner beta runbook summary
- fresh rehearsal and static fallback gate summary
- confirmation that no implementation, deployment, public hosting, cloud integration, dependency installation, wallet transaction, or chain-operation command was run
- unresolved risks

Sprint 17 approval block:

```text
Sprint 17 exit approval:
approvedBy=<user or role>
approvedAt=<YYYY-MM-DD>
evidencePath=docs/implementation/giwa-hosted-ops-runbook.md
nextSprint=docs/superpowers/plans/2026-06-20-sprint-18-staging-deployment-preparation.md
```

### Passing Command

```powershell
Test-Path docs\implementation\giwa-hosted-ops-runbook.md
Test-Path docs\implementation\giwa-partner-beta-runbook.md
Test-Path docs\implementation\giwa-incident-response.md
Test-Path docs\implementation\giwa-evidence-retention-policy.md
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Release Gate Checklist" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Partner Closeout Report" -Quiet
Select-String -Path docs\implementation\giwa-incident-response.md -Pattern "Postmortem Template" -Quiet
Select-String -Path docs\implementation\giwa-evidence-retention-policy.md -Pattern "Evidence Archive Manifest" -Quiet
```

### Exit Condition

```text
Sprint 17 is complete only when hosted ops, partner beta, incident response, and evidence retention docs exist; the sprint index and runbooks route to them; local/read-only gates are documented; safe scans are reviewed; and public hosting remains blocked pending explicit Sprint 18 approval.
```

---

## Sprint 17 Exit Gate

Sprint 17 is complete when:

- Environment contract distinguishes `local`, `staging-testnet`, and `prod-testnet`.
- `prod-testnet` forbids mock mode and requires approved public host policy.
- Server-only environment categories and redacted readiness rules are documented.
- Role/key rotation policy is documented without exposing values.
- Release gate checklist exists and excludes wallet action and chain-operation commands.
- CI blocked state and artifact promotion manifest are documented.
- Observability event names, metrics, and alert rules are documented.
- Backup/restore drill, evidence archive manifest, raw/sanitized evidence boundary, and retention policy are documented.
- Incident response runbook covers P0/P1/P2, key exposure, wrong chain, bad export, verifier spike, RPC/faucet outage, read-only fallback, and postmortem capture.
- Partner beta runbook covers intake, kickoff, reviewer opening order, fresh rehearsal, closeout, success metrics, limitations, and stop conditions.
- Fresh rehearsal and static fallback gates use local/read-only checks.
- Sprint 7 static fallback and Sprint 16 local control-room path remain the review baseline.
- No new dependency is installed.
- No code implementation, deployment, public hosting, external DB connection, or cloud credential store connection is performed.
- No wallet transaction is sent by server or scripts.
- No deploy, funding, anchoring, verifier-chain, or mint command is run.
- No real env file content is printed or content-scanned.

## Handoff

Sprint 17 handoff must include:

- files changed
- commands run and results
- parallel agent analysis summary
- hosted environment contract summary
- release gate and CI blocked-state summary
- artifact promotion manifest summary
- observability and alert summary
- backup/restore and evidence archive summary
- incident response summary
- partner beta operations summary
- fresh rehearsal and static fallback gate summary
- safety confirmations
- unresolved risks
- next action:

```text
Write the Sprint 17 execution prompt for docs/superpowers/plans/2026-06-19-sprint-17-hosted-ops-and-partner-beta.md.
```

Possible later Sprint 18 path, after Sprint 17 approval:

```text
docs/superpowers/plans/2026-06-20-sprint-18-staging-deployment-preparation.md
```

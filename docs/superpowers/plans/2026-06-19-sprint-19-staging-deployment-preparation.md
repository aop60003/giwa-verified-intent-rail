# Sprint 19 Staging Deployment Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define and verify the staging deployment preparation gates for `GIWA Verified Intent Rail` before any public host or staging smoke is started.

**Architecture:** Sprint 19 converts Sprint 18 partner rehearsal blockers into a go/no-go preparation package. It names runtime boundaries, release provenance, environment contracts, storage readiness, observability, security gates, rollback posture, and partner promotion criteria without deploying, binding a public host, connecting managed infrastructure, or sending wallet or chain actions.

**Tech Stack:** Markdown plans and runbooks, existing TypeScript live runtime contracts, existing local Node HTTP servers, existing package verification commands, GIWA Sepolia testnet evidence, and existing public/static evidence artifacts. No dependency installation is allowed in Sprint 19 preparation.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-18-partner-beta-rehearsal.md`
- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-partner-beta-rehearsal-checklist.md`
- `docs/implementation/giwa-partner-beta-feedback-form.md`
- `docs/implementation/giwa-partner-beta-closeout-report.md`
- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-partner-beta-runbook.md`
- `docs/implementation/giwa-incident-response.md`
- `docs/implementation/giwa-evidence-retention-policy.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-acceptance-checklist.md`
- `apps/web/src/lib/live`
- `apps/web/scripts/serve-live.mjs`
- `apps/web/scripts/serve-static.mjs`

## Parallel Read-Only Analysis Summary

Eight independent read-only perspectives inform this plan:

- Deployment target and runtime boundary: Sprint 19 is a preparation gate, not staging execution. It must name `local`, `staging-testnet`, and `prod-testnet` boundaries, public host blockers, and local-only constraints.
- CI and release provenance: `.git` and `.github` can be absent in this workspace, so protected CI, branch policy, source commit, release manifest, and no-rebuild artifact promotion remain blockers.
- Environment and credential contract: staging must use process env only, redacted readiness, explicit tenant and credential mapping, server-only value separation, and fail-closed startup when readiness is red.
- Database and migration readiness: current storage is local SQLite behind an adapter, with memory rate limit and queue behavior. Staging must name a durable adapter or explicitly stay blocked, prove migration guard, backup, restore, and retention readiness.
- Observability, logs, and alerts: `/healthz` stays cheap, `/readyz` stays redacted, API responses carry request ids, logs are allowlist-based, and alerts have owners and fallback posture.
- Security, tenant, and auth boundary: staging requires auth context, tenant-scoped access, exact origin policy, request body limits, rate limits, bounded errors, receipt gates, and an explicit CORS decision.
- Rollback and incident response: rollback uses artifact manifests and static fallback; stale server, stale DB, wrong receipt, unmatched decision, bad export, and restore drills require public or redacted incident packets.
- Partner beta promotion criteria: promotion needs completed intake, one-action scope, evidence packet acceptance, partner feedback, closeout, reviewer signoff, and all Sprint 19 blockers assigned and green.

## Sprint 19 Boundary

Allowed:

- Create the Sprint 19 staging preparation plan and linked documentation.
- Convert Sprint 18 blocker categories into owner, evidence, and approval gates.
- Define exact read-only verification commands and expected outputs.
- Document environment variable names and categories without values.
- Document artifact manifest shape, checksum policy, rollback posture, static fallback, and partner promotion rules.
- Run documentation scans and read-only local checks that do not require host binding or wallet action.

Not allowed:

- Implement Sprint 19 runtime code.
- Start public hosting, staging deployment, or public staging smoke.
- Connect managed storage, managed credential services, external production-like infrastructure, or cloud host services.
- Read or print real env file contents.
- Print credential values, wallet signing material, tokenized URLs, or auth material.
- Send wallet transactions from browser automation, server, or scripts.
- Run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, verifier-chain, or mint commands.
- Install dependencies.
- Add unsupported production-finance, identity-service, phishing-prevention, or safety-warranty claims.
- Treat Flashblocks as authoritative confirmation.

## Planned Sprint 19 Execution Artifacts

Sprint 19 execution may create these docs, but this plan-writing step does not create them:

```text
docs/implementation/giwa-staging-deployment-preparation.md
docs/implementation/giwa-staging-release-provenance.md
docs/implementation/giwa-staging-env-contract.md
docs/implementation/giwa-staging-storage-and-restore.md
docs/implementation/giwa-staging-observability.md
docs/implementation/giwa-staging-security-boundary.md
docs/implementation/giwa-staging-rollback-and-incident-drill.md
docs/implementation/giwa-staging-partner-promotion-gate.md
```

Sprint 19 execution may update only documentation links in:

```text
README.md
docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
docs/implementation/giwa-hosted-ops-runbook.md
docs/implementation/giwa-commercial-readiness-gate.md
docs/implementation/giwa-live-mvp-runtime-gate.md
docs/implementation/giwa-evidence-retention-policy.md
docs/implementation/giwa-incident-response.md
docs/implementation/giwa-partner-beta-closeout-report.md
```

Do not modify app, protocol, contract, wallet, verifier, public asset, or deployment code in Sprint 19 preparation unless the user explicitly approves moving from planning into implementation.

---

## Task 1: Workspace Mode and Source Provenance Gate

### Files

- Create: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `docs/implementation/giwa-hosted-ops-runbook.md`
- Modify: `README.md`

### Failing Doc Check

- [ ] Add checks that fail until Sprint 19 is linked and source provenance blockers are explicit.

```powershell
Test-Path docs\implementation\giwa-staging-release-provenance.md
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-19-staging-deployment-preparation.md" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Source Provenance Gate" -Quiet
```

Expected red state:

```text
At least one check returns False before Sprint 19 execution creates and links the provenance gate.
```

### Writing Direction

Create a provenance gate that starts with these checks:

```powershell
Test-Path .git
Test-Path .github
```

Document the gate:

```markdown
# GIWA Staging Release Provenance

## Source Provenance Gate

Staging preparation remains blocked when either `.git` or `.github` is absent. A staging artifact cannot be promoted from non-git prototype mode.

Required before staging dry-run:

| Gate | Required evidence |
| --- | --- |
| Git-backed workspace | `Test-Path .git` returns `True` |
| CI workflow path | `Test-Path .github` returns `True` |
| Protected branch policy | recorded branch and reviewer policy |
| Source commit | immutable commit id recorded in release manifest |
| Lockfile state | no unexpected lockfile drift |
| Release owner | named owner and approval timestamp |
```

Add a Sprint 19 row after Sprint 18:

```markdown
| 19 | `2026-06-19-sprint-19-staging-deployment-preparation.md` | staging deployment preparation gates for source provenance, host policy, env contract, storage, observability, security, rollback, and partner promotion | Sprint 18 approval |
```

### Passing Command

```powershell
Test-Path docs\implementation\giwa-staging-release-provenance.md
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Source Provenance Gate" -Quiet
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-19-staging-deployment-preparation.md" -Quiet
```

### Exit Condition

```text
Sprint 19 cannot proceed toward a staging dry-run while source provenance, CI path, or protected release ownership is missing.
```

## Task 2: Deployment Target and Runtime Boundary

### Files

- Create: `docs/implementation/giwa-staging-deployment-preparation.md`
- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-hosted-ops-runbook.md`

### Failing Doc Check

- [ ] Add checks that fail until staging runtime mode and non-goals are documented.

```powershell
Test-Path docs\implementation\giwa-staging-deployment-preparation.md
Select-String -Path docs\implementation\giwa-staging-deployment-preparation.md -Pattern "Runtime Boundary" -Quiet
Select-String -Path docs\implementation\giwa-staging-deployment-preparation.md -Pattern "Public Host Blockers" -Quiet
```

Expected red state:

```text
The staging preparation doc does not exist before Sprint 19 execution.
```

### Writing Direction

Document the target states:

```markdown
## Runtime Boundary

| Mode | Host binding | Mock mode | Auth | Storage | Approval state |
| --- | --- | --- | --- | --- | --- |
| `local` | `127.0.0.1` | explicit local-only flag allowed | local bypass only when configured | local rehearsal DB | allowed for rehearsal |
| `staging-testnet` | approved staging host only | disabled by default | required | approved staging adapter or blocked | blocked until this gate passes |
| `prod-testnet` | approved managed beta host only | forbidden | required | durable store with restore drill | outside Sprint 19 |
```

Document the public host blockers:

```markdown
## Public Host Blockers

Staging host binding is blocked until all of these have owners and evidence:

- approved host name and owner
- exact origin policy
- credential distribution and rotation process
- auth and tenant isolation gate
- request limits, rate limits, and bounded error gate
- redacted readiness and log gate
- staging storage adapter and migration guard
- backup catalog and restore drill
- rollback path and static fallback path
- incident owner and escalation path
- partner promotion go/no-go approval
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-staging-deployment-preparation.md -Pattern "staging-testnet" -Quiet
Select-String -Path docs\implementation\giwa-staging-deployment-preparation.md -Pattern "Public Host Blockers" -Quiet
Select-String -Path docs\implementation\giwa-live-mvp-runtime-gate.md -Pattern "Sprint 19 Staging Deployment Preparation Boundary" -Quiet
```

### Exit Condition

```text
Staging is framed as a testnet-only preparation target with explicit blockers and no public host binding until every blocker is green.
```

## Task 3: Environment and Credential Contract

### Files

- Create: `docs/implementation/giwa-staging-env-contract.md`
- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-hosted-ops-runbook.md`

### Failing Doc Check

- [ ] Add checks that fail until the staging env contract and redacted readiness rules exist.

```powershell
Test-Path docs\implementation\giwa-staging-env-contract.md
Select-String -Path docs\implementation\giwa-staging-env-contract.md -Pattern "Environment Contract" -Quiet
Select-String -Path docs\implementation\giwa-staging-env-contract.md -Pattern "Redacted Readiness" -Quiet
```

Expected red state:

```text
The staging env contract doc does not exist before Sprint 19 execution.
```

### Writing Direction

Document names and categories only:

```markdown
# GIWA Staging Environment Contract

## Environment Contract

| Category | Variable names | Staging rule |
| --- | --- | --- |
| Runtime | `GIWA_LIVE_MODE`, `HOST`, `PORT` | `GIWA_LIVE_MODE=staging-testnet`; host and port are approved by host policy |
| Storage | `GIWA_LIVE_DB_PATH` or approved adapter config names | adapter and owner recorded before binding |
| Chain and explorer | `GIWA_SEPOLIA_RPC_URL`, `GIWA_EXPLORER_TX_URL_TEMPLATE`, `GIWA_EXPLORER_ADDRESS_URL_TEMPLATE` | redacted readiness only |
| Manifest signing | `CAMPAIGN_SIGNER_PRIVATE_KEY` | public signer address only in readiness |
| Operator roles | `INTENT_SUBMITTER_PRIVATE_KEY`, `VERIFIER_PRIVATE_KEY` | inactive for Sprint 19 release gates unless a later plan approves use |
| Hosted auth and origin | `GIWA_LIVE_ALLOWED_ORIGINS`, `GIWA_LIVE_PARTNER_CREDENTIAL_HASHES`, `GIWA_LIVE_PARTNER_TENANT_ID` | explicit tenant and credential mapping required |
| Client-safe display | `NEXT_PUBLIC_GIWA_CHAIN_ID`, `NEXT_PUBLIC_INTENT_RAIL_ADDRESS`, `NEXT_PUBLIC_MOCK_TOKEN_ADDRESS`, `NEXT_PUBLIC_MOCK_VAULT_ADDRESS` | public values only |
```

Document fail-closed behavior:

```markdown
## Redacted Readiness

Startup and `/readyz` may show only:

- check name
- set, missing, or invalid state
- length or format class
- normalized public address where derivable
- chain id result
- DB probe result
- queue status
- hosted policy result

The server fails closed when non-mock readiness is red, hosted policy is red, tenant mapping is implicit, or public binding is requested without host approval.
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-staging-env-contract.md -Pattern "GIWA_LIVE_MODE" -Quiet
Select-String -Path docs\implementation\giwa-staging-env-contract.md -Pattern "GIWA_LIVE_PARTNER_TENANT_ID" -Quiet
Select-String -Path docs\implementation\giwa-staging-env-contract.md -Pattern "Redacted Readiness" -Quiet
```

### Exit Condition

```text
Staging env requirements are documented by name and category only, readiness is redacted, and hosted mode fails closed on missing or implicit required state.
```

## Task 4: Database, Migration, Backup, and Retention Readiness

### Files

- Create: `docs/implementation/giwa-staging-storage-and-restore.md`
- Modify: `docs/implementation/giwa-evidence-retention-policy.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`

### Failing Doc Check

- [ ] Add checks that fail until storage readiness, migrations, backup, and restore are documented.

```powershell
Test-Path docs\implementation\giwa-staging-storage-and-restore.md
Select-String -Path docs\implementation\giwa-staging-storage-and-restore.md -Pattern "Storage Readiness Gate" -Quiet
Select-String -Path docs\implementation\giwa-staging-storage-and-restore.md -Pattern "Restore Drill" -Quiet
```

Expected red state:

```text
The staging storage and restore doc does not exist before Sprint 19 execution.
```

### Writing Direction

Document the storage gate:

```markdown
# GIWA Staging Storage and Restore

## Storage Readiness Gate

| Requirement | Evidence |
| --- | --- |
| Adapter choice | approved staging adapter or documented block |
| Owner | named storage owner |
| Connection method | process env category and readiness probe |
| Migration guard | `001_live_base`, `002_nullable_decision_tx_hash`, and `003_verification_jobs` verified |
| Legacy schema behavior | incompatible schema fails closed |
| Repository readiness | real probe, not assumed ready |
| Rate limit state | memory-only accepted only for local; staging needs approved behavior |
| Verification queue state | memory-only accepted only for local; staging needs approved behavior |
```

Document the restore drill:

```markdown
## Restore Drill

1. Record mode, adapter, app version, schema migrations, tenant, partner, campaign, mission, and backup timestamp.
2. Restore into isolated staging state.
3. Compare row counts for runs, submitted transactions, decisions, receipts, verifier inputs, and verification jobs.
4. Recompute `verifierInputHash` and `receiptHash`.
5. Regenerate public snapshot and compare SHA-256.
6. Confirm pending, timeout, mismatched, failed, missing-decision, and replay-mismatch states stay locked.
7. Record restore owner, restore duration, and result.
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-staging-storage-and-restore.md -Pattern "001_live_base" -Quiet
Select-String -Path docs\implementation\giwa-staging-storage-and-restore.md -Pattern "Restore Drill" -Quiet
Select-String -Path docs\implementation\giwa-staging-storage-and-restore.md -Pattern "receiptHash" -Quiet
```

### Exit Condition

```text
Staging storage cannot go green until adapter, migration, backup, restore, retention, and locked-state replay evidence are documented and assigned.
```

## Task 5: Observability, Health, Readiness, and Bounded Errors

### Files

- Create: `docs/implementation/giwa-staging-observability.md`
- Modify: `docs/implementation/giwa-hosted-ops-runbook.md`
- Modify: `docs/implementation/giwa-incident-response.md`

### Failing Doc Check

- [ ] Add checks that fail until observability and alert gates exist.

```powershell
Test-Path docs\implementation\giwa-staging-observability.md
Select-String -Path docs\implementation\giwa-staging-observability.md -Pattern "Health and Readiness Gate" -Quiet
Select-String -Path docs\implementation\giwa-staging-observability.md -Pattern "Alert Matrix" -Quiet
```

Expected red state:

```text
The staging observability doc does not exist before Sprint 19 execution.
```

### Writing Direction

Document bounded readiness and logs:

```markdown
# GIWA Staging Observability

## Health and Readiness Gate

- `/healthz` returns cheap liveness only.
- `/readyz` returns redacted readiness and HTTP 503 when any required staging gate is red.
- API responses include `requestId`.
- Unknown runtime, provider, and storage failures map to bounded public error codes.
- Raw request bodies are never logged.
- Upstream provider text is not returned to clients.

## Structured Event Allowlist

Use only bounded event names such as:

- `live.api.request`
- `live.server.startup`
- `live.readiness.check`
- `live.receipt.gate_violation`
- `live.chain.wrong_chain`
- `live.hosted.mock_mode_blocked`
- `live.backup.stale`
- `live.verifier.timeout`
- `live.db.write_failure`
- `live.auth.bypass_suspicion`
- `live.rate_limited`
```

Document alert ownership:

```markdown
## Alert Matrix

| Alert | Severity | Owner | Required response |
| --- | --- | --- | --- |
| Receipt gate violation | P0 | named incident owner | lock receipts and exports |
| Wrong chain | P0 | named runtime owner | lock run and replay evidence |
| Mock mode in managed beta | P0 | named host owner | stop startup |
| Backup stale | P1 | named restore owner | block promotion |
| Verifier timeout spike | P1 | named verifier owner | pause verifier fanout |
| DB write failure | P1 | named storage owner | enter read-only fallback |
| Auth bypass suspicion | P0 | named auth owner | block partner API |
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-staging-observability.md -Pattern "/readyz" -Quiet
Select-String -Path docs\implementation\giwa-staging-observability.md -Pattern "requestId" -Quiet
Select-String -Path docs\implementation\giwa-staging-observability.md -Pattern "Alert Matrix" -Quiet
```

### Exit Condition

```text
Staging readiness is observable through bounded, redacted, owner-assigned signals before any public host binding.
```

## Task 6: Auth, Tenant, Origin, Rate Limit, and Receipt Access Gate

### Files

- Create: `docs/implementation/giwa-staging-security-boundary.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`
- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`

### Failing Doc Check

- [ ] Add checks that fail until auth, tenant, origin, rate, and receipt gates are documented.

```powershell
Test-Path docs\implementation\giwa-staging-security-boundary.md
Select-String -Path docs\implementation\giwa-staging-security-boundary.md -Pattern "Auth and Tenant Gate" -Quiet
Select-String -Path docs\implementation\giwa-staging-security-boundary.md -Pattern "Origin and CORS Decision" -Quiet
```

Expected red state:

```text
The staging security boundary doc does not exist before Sprint 19 execution.
```

### Writing Direction

Document the security gates:

```markdown
# GIWA Staging Security Boundary

## Auth and Tenant Gate

- `staging-testnet` has no local bypass.
- Partner credential hashes map to actor id, tenant id, and scopes.
- `GIWA_LIVE_PARTNER_TENANT_ID` is explicit and not defaulted.
- Tenant id comes from auth context only.
- Request body tenant overrides are rejected.
- Routes enforce scopes for run creation, run read, receipt read, verification request, and partner read.
- Cross-tenant run, receipt, queue, and partner list access tests pass.

## Origin and CORS Decision

Choose one before staging dry-run:

| Decision | Required result |
| --- | --- |
| Same-origin only | browser calls use same staging origin; no cross-origin headers needed |
| Allowlisted CORS | exact origins only, no wildcard, `Vary: Origin`, allowed methods and headers recorded |

Missing or unapproved browser origins fail closed.
```

Document limits:

```markdown
## Request and Rate Gate

- POST requests require JSON content type.
- Request bodies remain bounded.
- Malformed JSON fails before handler invocation.
- Non-object POST bodies are rejected.
- Rate limits exist for source, credential, tenant, wallet, and verification path.
- Pre-auth source limiting protects invalid credential attempts.
- In-memory limits are local-only unless the operator records explicit staging acceptance.
```

Document receipt access:

```markdown
## Receipt Access Gate

Receipt access is allowed only when:

- run status is `matched`
- verifier decision is `matched`
- failure reason is absent
- receipt and decision hashes match
- intent hash links run, decision, and receipt
- receipt payload is a JSON object
- `verifierInputHash` recomputes
- `receiptHash` recomputes
- tenant access is authorized

All locked states return bounded `receipt_not_found` without payload details.
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-staging-security-boundary.md -Pattern "Auth and Tenant Gate" -Quiet
Select-String -Path docs\implementation\giwa-staging-security-boundary.md -Pattern "Origin and CORS Decision" -Quiet
Select-String -Path docs\implementation\giwa-staging-security-boundary.md -Pattern "Receipt Access Gate" -Quiet
```

### Exit Condition

```text
Staging cannot proceed until partner access is authenticated, tenant-scoped, origin-bound, rate-limited, request-bounded, and matched-only for receipts.
```

## Task 7: Release Artifact Manifest and No-Rebuild Promotion

### Files

- Modify: `docs/implementation/giwa-staging-release-provenance.md`
- Modify: `docs/implementation/giwa-hosted-ops-runbook.md`
- Modify: `docs/implementation/giwa-evidence-retention-policy.md`

### Failing Doc Check

- [ ] Add checks that fail until artifact manifest and no-rebuild promotion are documented.

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "Artifact Manifest" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "No-Rebuild Promotion" -Quiet
```

Expected red state:

```text
The release provenance doc lacks artifact promotion details before this task.
```

### Writing Direction

Document the artifact manifest shape:

````markdown
## Artifact Manifest

```json
{
  "releaseId": "giwa-intent-rail-testnet-YYYYMMDD",
  "sourceCommit": "required-after-git-backed",
  "stage": "staging-testnet",
  "generatedAt": "ISO-8601",
  "artifacts": [
    { "path": "apps/web/public/flow-data.json", "sha256": "computed" },
    { "path": "apps/web/public/partner-snapshot.json", "sha256": "computed" },
    { "path": "apps/web/public/live-demo-snapshot.json", "sha256": "computed" },
    { "path": "docs/evidence/live-demo-sprint12-snapshot.json", "sha256": "computed" }
  ],
  "checks": {
    "staticFallback": "pass-or-blocked",
    "liveReadOnlySmoke": "pass-or-blocked",
    "commercialReceiptGate": "pass-or-blocked",
    "safeScans": "pass-or-blocked"
  }
}
```

## No-Rebuild Promotion

- Build once from a protected source commit.
- Record artifact checksums.
- Promote the same artifact set to later stages.
- Stop if any artifact changes between stages.
- Stop if lockfile drift is unexplained.
- Stop if public artifact scan fails.
- Stop if readiness is red.
- Stop if any gate requires wallet action, chain-operation command, or real env output.
````

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern '"releaseId"' -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "No-Rebuild Promotion" -Quiet
Select-String -Path docs\implementation\giwa-staging-release-provenance.md -Pattern "sourceCommit" -Quiet
```

### Exit Condition

```text
Staging artifacts have a checksum manifest and cannot be rebuilt or mutated between staging and later managed beta stages.
```

## Task 8: Rollback, Static Fallback, and Incident Drill Gate

### Files

- Create: `docs/implementation/giwa-staging-rollback-and-incident-drill.md`
- Modify: `docs/implementation/giwa-incident-response.md`
- Modify: `docs/implementation/giwa-hosted-ops-runbook.md`

### Failing Doc Check

- [ ] Add checks that fail until rollback, static fallback, stale state, and evidence quarantine rules exist.

```powershell
Test-Path docs\implementation\giwa-staging-rollback-and-incident-drill.md
Select-String -Path docs\implementation\giwa-staging-rollback-and-incident-drill.md -Pattern "Rollback Gate" -Quiet
Select-String -Path docs\implementation\giwa-staging-rollback-and-incident-drill.md -Pattern "Evidence Quarantine" -Quiet
```

Expected red state:

```text
The rollback and incident drill doc does not exist before Sprint 19 execution.
```

### Writing Direction

Document rollback:

```markdown
# GIWA Staging Rollback and Incident Drill

## Rollback Gate

Rollback is allowed only when:

- release artifact manifest exists
- prior artifact checksums are available
- rollback owner is named
- storage rollback limitation is recorded
- matched-only receipt gate remains active
- static fallback is available
- partner communications owner is named

Rollback cannot undo public chain evidence. It can only remove or replace app artifacts and lock new writes.
```

Document fallback:

```markdown
## Static Fallback Gate

Required GET-only surfaces:

- `/`
- `/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503`
- `/partner`
- `/partner-snapshot.json`

Fallback copy must say recorded GIWA Sepolia testnet evidence.
```

Document incident drills:

```markdown
## Incident Drill Matrix

| Drill | Expected posture |
| --- | --- |
| stale server | do not stop unknown listener automatically; use operator-owned restart |
| stale DB | fail closed; use isolated state or approved restore |
| wrong receipt | lock receipt and export; quarantine artifact |
| unmatched decision | keep receipt locked; replay standard RPC evidence |
| timeout | keep non-terminal |
| RPC or explorer issue | mark readiness degraded; use static fallback |
| bad export | remove public link, recompute hashes, rescan |
| public artifact scan failure | stop sharing until regenerated and rescanned |
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-staging-rollback-and-incident-drill.md -Pattern "Rollback Gate" -Quiet
Select-String -Path docs\implementation\giwa-staging-rollback-and-incident-drill.md -Pattern "Static Fallback Gate" -Quiet
Select-String -Path docs\implementation\giwa-staging-rollback-and-incident-drill.md -Pattern "Incident Drill Matrix" -Quiet
```

### Exit Condition

```text
Staging preparation has a rollback and incident posture that locks unsafe states, preserves static fallback, and quarantines bad evidence.
```

## Task 9: Partner Beta Promotion Criteria

### Files

- Create: `docs/implementation/giwa-staging-partner-promotion-gate.md`
- Modify: `docs/implementation/giwa-partner-beta-runbook.md`
- Modify: `docs/implementation/giwa-partner-beta-closeout-report.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`

### Failing Doc Check

- [ ] Add checks that fail until partner promotion criteria and go/no-go rules exist.

```powershell
Test-Path docs\implementation\giwa-staging-partner-promotion-gate.md
Select-String -Path docs\implementation\giwa-staging-partner-promotion-gate.md -Pattern "Partner Promotion Criteria" -Quiet
Select-String -Path docs\implementation\giwa-staging-partner-promotion-gate.md -Pattern "Go No-Go Checklist" -Quiet
```

Expected red state:

```text
The partner promotion gate doc does not exist before Sprint 19 execution.
```

### Writing Direction

Document criteria:

```markdown
# GIWA Staging Partner Promotion Gate

## Partner Promotion Criteria

All criteria must be green:

- partner intake completed
- one campaign and one mission frozen
- one GIWA Sepolia mock vault action frozen
- evidence packet accepted
- partner feedback captured from real reviewer or operator-led dry run
- closeout report completed
- reviewer signoff recorded
- incident owner named
- retention owner named
- staging blockers have owners and evidence
```

Document go/no-go:

```markdown
## Go No-Go Checklist

Go only when:

- receipt access remains locked unless run and verifier are `matched`
- public artifacts include only allowed public evidence fields
- static fallback is labeled recorded GIWA Sepolia testnet evidence
- incident and fallback drills pass
- Sprint 19 blocker register is closed
- partner understands matched-only receipt, public chain evidence, and Flashblocks non-final feedback

No-go when:

- CI or source provenance is missing
- public artifact scan fails
- any non-matched state unlocks receipt
- partner asks for unsupported production-finance, identity-service, phishing-prevention, or safety-warranty positioning
- scope expands beyond one partner, one campaign, one mission, one action, and one evidence packet
- any flow asks for wallet signing material or raw local configuration values
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-staging-partner-promotion-gate.md -Pattern "Partner Promotion Criteria" -Quiet
Select-String -Path docs\implementation\giwa-staging-partner-promotion-gate.md -Pattern "Go No-Go Checklist" -Quiet
Select-String -Path docs\implementation\giwa-staging-partner-promotion-gate.md -Pattern "one GIWA Sepolia mock vault action" -Quiet
```

### Exit Condition

```text
Partner beta promotion is blocked until observed partner or operator evidence, matched-only receipt behavior, and all staging blockers are green.
```

## Task 10: Documentation Links, Verification, and Handoff

### Files

- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `docs/implementation/giwa-hosted-ops-runbook.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`
- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-evidence-retention-policy.md`
- Modify: `docs/implementation/giwa-incident-response.md`

### Failing Doc Check

- [ ] Add checks that fail until Sprint 19 docs are linked and safe scans are run.

```powershell
Select-String -Path README.md -Pattern "Sprint 19 Staging Deployment Preparation" -Quiet
Select-String -Path docs\implementation\giwa-hosted-ops-runbook.md -Pattern "Sprint 19 Staging Deployment Preparation" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "2026-06-19-sprint-19-staging-deployment-preparation.md" -Quiet
```

Expected red state:

```text
At least one link check returns False before documentation links are added.
```

### Verification Commands

Run documentation existence and marker checks:

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-19-staging-deployment-preparation.md
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$claimPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment")
rg -n $docPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $claimPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

Run the Sprint 19 sensitive-surface scan without placing the literal pattern in this plan:

```powershell
$surfacePattern = "private " + "key|mnem" + "onic|bear" + "er|api " + "key|sec" + "ret"
rg -n $surfacePattern docs\superpowers\plans\2026-06-19-sprint-19-staging-deployment-preparation.md
```

Expected result:

```text
The Sprint 19 plan and changed docs contain no unfinished markers, no unsupported public claim, and no sensitive-surface wording except clearly marked guardrail examples. Existing matches outside changed text are reported as guardrail text, not new claims.
```

### Handoff Direction

Sprint 19 execution handoff must include:

- files changed
- commands run and results
- eight-perspective analysis summary
- workspace provenance status
- staging target status
- environment contract status
- storage and migration readiness status
- observability and alert status
- auth, tenant, origin, rate, and receipt gate status
- rollback and incident drill status
- partner promotion go/no-go status
- confirmation that no implementation, deployment, public hosting, dependency installation, wallet transaction, or chain-operation command was run
- unresolved risks
- next action

Approval block:

```text
Sprint 19 exit approval:
approvedBy=<user or role>
approvedAt=<YYYY-MM-DD>
evidencePath=docs/implementation/giwa-staging-deployment-preparation.md
nextSprint=docs/superpowers/plans/2026-06-19-sprint-20-staging-deployment-dry-run.md
```

### Passing Command

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-19-staging-deployment-preparation.md
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-19-staging-deployment-preparation.md" -Quiet
Select-String -Path README.md -Pattern "Sprint 19 Staging Deployment Preparation" -Quiet
```

### Exit Condition

```text
Sprint 19 preparation is complete only when staging blockers are documented with owners, evidence, approval gates, and next-sprint options, while deployment and public hosting remain unstarted.
```

---

## Sprint 19 Exit Gate

Sprint 19 is complete when:

- staging deployment goals and non-goals are documented
- public deploy blockers are documented
- non-git prototype blockers are documented
- CI and source provenance gates are documented
- artifact manifest and no-rebuild promotion are documented
- environment and credential contract is documented without values
- staging storage, migration, backup, restore, and retention readiness are documented
- `/healthz` and `/readyz` requirements are documented
- auth, tenant, rate-limit, request, origin, and receipt access gates are documented
- observability, redacted logs, alerts, and bounded errors are documented
- rollback, static fallback, stale state, incident, and evidence quarantine drills are documented
- partner beta promotion criteria and go/no-go are documented
- Sprint 20 candidates are listed
- no dependency is installed
- no implementation code is changed
- no public hosting or staging deployment is executed
- no managed infrastructure is connected
- no wallet transaction is sent
- no deploy, funding, anchoring, verifier-chain, or mint command is run
- no real env file content is printed or content-scanned
- Flashblocks remains fast non-final feedback only

## Sprint 20 Candidates

Candidate Sprint 20 paths after user approval:

```text
docs/superpowers/plans/2026-06-19-sprint-20-staging-deployment-dry-run.md
docs/superpowers/plans/2026-06-19-sprint-20-hosted-adapter-implementation.md
docs/superpowers/plans/2026-06-19-sprint-20-ci-release-provenance-setup.md
```

Choose only one Sprint 20 path after Sprint 19 closeout. Staging deployment dry-run must not begin until the Sprint 19 exit gate is explicitly approved.

## Handoff

Sprint 19 handoff must include:

- created and modified files
- commands run and results
- eight-perspective analysis summary
- source provenance blocker status
- deployment target blocker status
- env contract blocker status
- storage and restore blocker status
- observability blocker status
- security and tenant blocker status
- rollback and incident blocker status
- partner promotion blocker status
- confirmation that Sprint 19 implementation and deployment were not started
- confirmation that no wallet transaction, deploy, funding, anchoring, verifier-chain, mint, public hosting, managed infrastructure, or dependency installation occurred
- unresolved risks
- next action:

```text
Ask the user whether to prepare a Sprint 19 execution prompt or revise this plan first.
```

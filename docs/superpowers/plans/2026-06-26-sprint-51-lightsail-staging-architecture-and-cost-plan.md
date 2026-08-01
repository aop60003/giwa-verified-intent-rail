# Sprint 51 Lightsail Staging Architecture and Cost Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define a Lightsail staging architecture, cost model, and deployment runbook draft for `GIWA Verified Intent Rail` without creating infrastructure or deploying.

**Architecture:** Sprint 51 is a documentation-only staging design gate. It maps the current static and live Node servers to a future Ubuntu Lightsail topology, defines credential, storage, observability, security, rollback, and go/no-go gates, and keeps the authority local-advisory until protected CI and external approvals exist.

**Tech Stack:** Amazon Lightsail Ubuntu instance, Node.js runtime, existing `@giwa/web` static/live Node scripts, Nginx or Lightsail load balancer, systemd, SQLite for rehearsal-only staging state, future approved durable storage, PowerShell verification scans.

---

## Current Scope

Sprint 51 writes planning documents only.

It does not:

- create a Lightsail instance
- bind DNS
- configure HTTPS
- request or print credential values
- deploy public traffic
- connect managed infrastructure
- run wallet, chain, deploy, fund, anchor, verifier-chain, or mint commands
- dispatch or rerun protected CI
- install dependencies

## Eight-Angle Analysis

| Perspective | Sprint 51 decision |
| --- | --- |
| Lightsail runtime architecture | Use one Ubuntu instance for the first staging design. Serve static and live Node processes behind a reverse proxy. Keep `/user` and static fallback available even if live API is down. |
| Cost and instance sizing | Model minimum staging, beta, and production candidates separately. Do not claim hosting is free; require final AWS console price check before approval. |
| Reverse proxy, HTTPS, and domain | Compare Lightsail load balancer certificate handling with direct Nginx and certbot. Recommend same-origin routing under one staging host. |
| Environment and credential handling | Use approved injected environment values or a managed credential store. Never place credential values in repository docs, public assets, logs, snapshots, or browser bundles. |
| Storage, SQLite, and backup | Allow SQLite only for local or explicitly accepted rehearsal staging. Durable beta requires an approved storage adapter, backup catalog, and restore drill. |
| Observability, logs, and health checks | Keep `/healthz` cheap, `/readyz` redacted, and logs allowlist-based with request ids and bounded error names. |
| Security, rate limit, CORS, and tenant boundary | Require auth, explicit tenant mapping, exact origin policy, bounded request bodies, rate buckets, and matched-only receipt access before partner traffic. |
| Deployment, rollback, and staging go/no-go | Treat protected CI, artifact metadata, host approval, rollback owner, partner signoff, and managed infrastructure approval as blockers. |

## File Map

| Path | Responsibility |
| --- | --- |
| `docs/implementation/giwa-lightsail-staging-architecture.md` | Runtime topology, process layout, reverse proxy decision, health/readiness boundary, security and storage gates. |
| `docs/implementation/giwa-lightsail-cost-and-sizing.md` | Sizing tiers, cost components, AWS console confirmation steps, cost risks. |
| `docs/implementation/giwa-lightsail-deploy-runbook-draft.md` | Draft preflight, deploy, smoke, rollback, and stop conditions. Not executable until later approval. |
| `docs/evidence/lightsail-staging-plan-sprint51.json` | Public-safe local-advisory evidence for the planning sprint. |
| `README.md` | Link Sprint 51 docs from the handoff package. |
| `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md` | Add Sprint 51 routing and current state summary. |
| `docs/implementation/giwa-staging-blocker-register.md` | Add Lightsail-specific blockers without changing approval state. |
| `docs/implementation/giwa-commercial-readiness-gate.md` | Add Sprint 51 Lightsail gate and keep commercial readiness blocked. |

## Task 1: Create Lightsail Architecture Record

**Files:**
- Create: `docs/implementation/giwa-lightsail-staging-architecture.md`

- [ ] **Step 1: Write the architecture record**

Use these sections:

```markdown
# GIWA Lightsail Staging Architecture

## Scope

Sprint 51 defines a future staging topology only. It does not create AWS resources, deploy, bind DNS, configure HTTPS, connect managed storage, request credential values, or send wallet or chain transactions.

## Recommended Topology

Use one Ubuntu Lightsail instance as the minimum staging host:

- Nginx listens on public HTTP/HTTPS ports after approval.
- `giwa-static.service` runs `node --experimental-strip-types apps/web/scripts/serve-static.mjs` on `127.0.0.1:4176`.
- `giwa-live.service` runs `node --experimental-strip-types apps/web/scripts/serve-live.mjs` on `127.0.0.1:4177` or an approved internal port.
- Nginx routes `/user`, `/user/receipt/`, `/user/receipts`, `/user/help`, `/`, `/partner`, `/demo`, and static assets to the static service unless a later sprint explicitly promotes live-backed user routes.
- Nginx routes `/live`, `/healthz`, `/readyz`, `/api/`, and approved dynamic receipt paths to the live service.

## Server Boundaries

Static service:

- serves checked-in public assets and recorded snapshots
- provides bounded static `/demo`, `/healthz`, `/readyz`, and `/api/demo/status` projections
- remains the rollback continuity surface

Live service:

- issues wallet-bound manifests only in approved non-mock staging mode
- stores run state in the approved staging store
- verifies public transaction hashes through standard RPC evidence
- unlocks receipts only after matched verifier decisions

## Reverse Proxy Decision

Preferred first staging path:

- same-origin Nginx reverse proxy
- no wildcard CORS
- exact route allowlist
- request body limits before Node
- static fallback route remains available during live restart

HTTPS options:

| Option | Fit | Tradeoff |
| --- | --- | --- |
| Lightsail load balancer with certificate | Better for future beta and simpler certificate lifecycle | Adds monthly cost and another managed component |
| Nginx with certbot on one instance | Lower component count and simpler first dry run | Operator owns renewal, firewall, and host hardening |

## Systemd Service Draft

Define two services after deployment approval:

- `giwa-static.service`
- `giwa-live.service`

Both services must:

- run as a non-root service user
- use an explicit working directory
- load environment values from an approved injection path
- restart on failure with bounded backoff
- write logs to journald only with redacted application output

## Storage Boundary

SQLite is acceptable only for:

- local rehearsal
- explicitly approved single-instance staging dry run
- short-lived demo state with backup and restore drill

Partner beta or multi-operator staging requires an approved durable adapter, backup target, restore owner, migration marker review, and hosted probe.

## Go-No-Go Summary

Staging deploy remains blocked until protected CI or an approved local-advisory exception, host approval, domain/HTTPS approval, credential injection approval, backup/restore drill, partner signoff, and rollback owner approval are recorded.
```

- [ ] **Step 2: Verify the file exists**

Run:

```powershell
Test-Path docs\implementation\giwa-lightsail-staging-architecture.md
```

Expected: `True`.

## Task 2: Create Cost And Sizing Record

**Files:**
- Create: `docs/implementation/giwa-lightsail-cost-and-sizing.md`

- [ ] **Step 1: Write the cost record**

Include:

- AWS official pricing references
- minimum staging, beta, and production candidate sizing
- load balancer, snapshots, storage, data transfer, domain, and operational cost components
- final AWS console confirmation gate

- [ ] **Step 2: Verify the file exists**

Run:

```powershell
Test-Path docs\implementation\giwa-lightsail-cost-and-sizing.md
```

Expected: `True`.

## Task 3: Create Deploy Runbook Draft

**Files:**
- Create: `docs/implementation/giwa-lightsail-deploy-runbook-draft.md`

- [ ] **Step 1: Write the draft runbook**

Include:

- approval preflight
- build artifact source
- instance preparation outline
- systemd outline
- Nginx route outline
- health/readiness smoke
- static fallback smoke
- rollback path
- stop conditions

Every command must be marked draft-only until Sprint 52 approval. Do not include credential values.

- [ ] **Step 2: Verify the file exists**

Run:

```powershell
Test-Path docs\implementation\giwa-lightsail-deploy-runbook-draft.md
```

Expected: `True`.

## Task 4: Create Sprint 51 Evidence

**Files:**
- Create: `docs/evidence/lightsail-staging-plan-sprint51.json`

- [ ] **Step 1: Write public-safe evidence**

Use this shape:

```json
{
  "sprint": 51,
  "title": "Lightsail Staging Architecture / Cost / Deploy Plan",
  "authority": "local-advisory",
  "execution": {
    "lightsailInstanceCreated": false,
    "publicDeployExecuted": false,
    "dnsConfigured": false,
    "httpsConfigured": false,
    "managedInfrastructureConnected": false,
    "walletTransactionsSent": false,
    "chainCommandsRun": false,
    "protectedCiDispatchRun": false,
    "dependencyInstallRun": false
  },
  "recommendedArchitecture": {
    "host": "Ubuntu Lightsail instance",
    "runtime": "Node static service plus Node live service behind reverse proxy",
    "reverseProxy": "Nginx same-origin routing recommended for first staging dry run",
    "httpsOptions": ["Lightsail load balancer certificate", "Nginx with certbot"],
    "storage": "SQLite only for approved single-instance rehearsal; durable adapter required for beta"
  },
  "remainingBlockers": [
    "AWS account and billing approval",
    "protected CI or approved exception",
    "domain and HTTPS approval",
    "credential injection approval",
    "backup and restore drill",
    "partner or customer signoff",
    "release and rollback owner approval"
  ]
}
```

- [ ] **Step 2: Validate JSON**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('docs/evidence/lightsail-staging-plan-sprint51.json','utf8')); console.log('valid')"
```

Expected: `valid`.

## Task 5: Update Routing Documents

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`

- [ ] **Step 1: Update README links**

Add Sprint 51 evidence and implementation docs to the hosted ops readiness section. Keep public deploy blocked.

- [ ] **Step 2: Update sprint index**

Add Sprint 51 row and a narrative paragraph after Sprint 50.

- [ ] **Step 3: Update blocker register**

Add a Sprint 51 section with Lightsail blockers:

- AWS account and billing approval
- host owner
- origin policy
- domain and HTTPS approval
- credential injection path
- protected CI or approved exception
- backup/restore drill
- partner/customer signoff
- release and rollback owner

- [ ] **Step 4: Update commercial readiness gate**

Add a Sprint 51 Lightsail gate and state that planning does not unblock commercial readiness.

## Task 6: Verification

**Files:**
- Verify all Sprint 51 docs and routing updates.

- [ ] **Step 1: Path checks**

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-26-sprint-51-lightsail-staging-architecture-and-cost-plan.md
Test-Path docs\implementation\giwa-lightsail-staging-architecture.md
Test-Path docs\implementation\giwa-lightsail-cost-and-sizing.md
Test-Path docs\implementation\giwa-lightsail-deploy-runbook-draft.md
Test-Path docs\evidence\lightsail-staging-plan-sprint51.json
```

Expected: all `True`.

- [ ] **Step 2: Documentation scans**

Run:

```powershell
$unfinishedPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$forbiddenPattern = ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|set" + "tlement|" + ("perform K" + "YC") + "|" + ("guarantee safe" + "ty") + "|" + ("instant final" + "ity") + "|" + ("200ms confirm" + "ed")
rg -n $unfinishedPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $forbiddenPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

Expected: no unapproved new findings.

- [ ] **Step 3: Sprint 51 credential-surface scan**

Run only against Sprint 51 documents, not `.env` files:

```powershell
$credentialScanPattern = ("private " + "key") + "|mnem" + "onic|bear" + "er|" + ("api " + "key") + "|" + ("access " + "key") + "|" + ("secret " + "key") + "|AWS_ACCESS_" + "KEY|AWS_" + "SECRET"
rg -n $credentialScanPattern docs\superpowers\plans\2026-06-26-sprint-51-lightsail-staging-architecture-and-cost-plan.md docs\implementation\giwa-lightsail-staging-architecture.md docs\implementation\giwa-lightsail-cost-and-sizing.md docs\implementation\giwa-lightsail-deploy-runbook-draft.md docs\evidence\lightsail-staging-plan-sprint51.json
```

Expected: no matches.

- [ ] **Step 4: Git status**

Run:

```powershell
git status --short
```

Expected: only intended Sprint 51 documentation and evidence changes before commit.

## Sprint 51 Exit Gate

Sprint 51 exits when:

- all requested planning and implementation docs exist
- README and sprint index route to the new docs
- blocker and commercial readiness docs keep staging blocked
- evidence records no deploy, no credential work, no chain or wallet work, no protected CI dispatch, and no dependency install
- verification scans pass or report only known pre-existing allowlisted findings

## Next Sprint Candidate

```text
docs/superpowers/plans/2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md
```

# Sprint 53 Lightsail Staging Deploy Execution After Explicit Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the approval-gated Lightsail staging deployment execution procedure without executing deployment.

**Architecture:** Sprint 53 converts the Sprint 51 architecture and Sprint 52 preflight package into an ordered execution plan for a later explicit approval sprint. It keeps the current state local-advisory and no-go until all approval records exist, then describes the future sequence from source verification through provisioning, runtime setup, Nginx/HTTPS, smoke, evidence, rollback, and handoff.

**Tech Stack:** Amazon Lightsail Ubuntu, Node.js, existing `@giwa/web` static/live scripts, systemd, Nginx, optional Lightsail load balancer or Nginx certificate automation, SQLite staging exception, PowerShell verification scans.

---

## Scope

Sprint 53 is an execution plan only. It does not create infrastructure, publish traffic, configure DNS or HTTPS, request credential values, read local env files, send wallet actions, run GIWA chain-operation package commands, install dependencies, dispatch protected CI, or claim resolved billing/account state.

## Eight-Perspective Deployment Review

| Perspective | Sprint 53 execution-plan decision |
| --- | --- |
| Deploy approval gate | Deployment cannot start until account/billing, region, instance plan, domain/HTTPS, runtime injection, backup, protected CI or exception, release owner, and rollback owner are recorded. |
| Lightsail provisioning sequence | Plan the later order: verify approvals, create Ubuntu instance, lock firewall, create service user, prepare directories, and record host evidence. |
| Code transfer / git pull / artifact strategy | Prefer protected artifact metadata when available; otherwise require explicit local-advisory exception and source commit record before copying or pulling code. |
| Node runtime / build / service start | Install approved Node runtime, fetch approved source or artifact, build app, create service files, bind services to localhost, then start static before live. |
| Nginx / HTTPS / domain activation | Configure Nginx route table first, validate local upstreams, then activate HTTP/HTTPS only after DNS and certificate method are approved. |
| Env / credential injection | Use approved server-only injection channel with variable names only in docs and no values in logs, screenshots, public files, or evidence. |
| Smoke tests / rollback | Smoke static, live, API, health, and readiness routes; rollback stops live, restores release directory or commit, restores proxy config, and restores DB backup only with owner approval. |
| Go-live / blocker update / handoff | Record evidence, update blocker register, keep no-go if smoke or approval fails, and do not allow public user traffic before signoff. |

## Required Explicit Approvals Before Execution

All approvals must be recorded before a later Sprint 54 can execute deployment:

- AWS/Lightsail account and billing approval
- instance region and plan approval
- domain and HTTPS approval
- runtime value injection approval
- backup destination approval
- protected CI pass or explicit local-advisory exception approval
- release owner approval
- rollback owner approval
- partner/customer signoff or explicit internal-only staging exception

## Planned Execution Sequence

This is the future execution order after explicit approval:

1. Verify current git commit and approved artifact source.
2. Create Lightsail instance in approved region and plan.
3. Install approved Node runtime.
4. Fetch source or artifact using the approved provenance path.
5. Build the app or unpack protected artifact.
6. Create runtime files or service env injection through the approved server-only channel.
7. Configure `giwa-static.service` and `giwa-live.service`.
8. Configure Nginx route table.
9. Enable HTTPS using the approved method.
10. Run smoke tests.
11. Record evidence.
12. Choose rollback or go/no-go result.

## Task 1: Create Sprint 53 Execution Plan Record

**Files:**
- Create: `docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md`

- [ ] **Step 1: Write the execution plan**

Include approval gates, ordered execution, artifact strategy, runtime setup, service start order, route activation, evidence capture, and stop conditions.

- [ ] **Step 2: Verify the file exists**

Run:

```powershell
Test-Path docs\implementation\giwa-lightsail-staging-deploy-execution-plan.md
```

Expected: `True`.

## Task 2: Create Smoke And Rollback Plan

**Files:**
- Create: `docs/implementation/giwa-lightsail-staging-smoke-and-rollback-plan.md`

- [ ] **Step 1: Write route smoke plan**

Include later approved checks for:

```text
/user
/user/receipts
/user/help
/user/receipt/<hash>
/live
/demo
/partner
/healthz
/readyz
/api/partner/runs only with approved auth boundary
```

- [ ] **Step 2: Write rollback plan**

Include stopping services, reverting release directory or git commit, restoring Nginx config, restoring DB backup if needed, preserving logs/evidence, and recording blocker updates.

- [ ] **Step 3: Verify the file exists**

Run:

```powershell
Test-Path docs\implementation\giwa-lightsail-staging-smoke-and-rollback-plan.md
```

Expected: `True`.

## Task 3: Create Sprint 53 Evidence Plan

**Files:**
- Create: `docs/evidence/lightsail-staging-deploy-execution-plan-sprint53.json`

- [ ] **Step 1: Write public-safe evidence**

Record that Sprint 53 is planning-only, actual deploy is false, credential values are absent, protected CI remains unclaimed, and the next sprint requires explicit approval.

- [ ] **Step 2: Validate JSON**

Run:

```powershell
node -e "JSON.parse(require('node:fs').readFileSync('docs/evidence/lightsail-staging-deploy-execution-plan-sprint53.json','utf8')); console.log('json ok')"
```

Expected: `json ok`.

## Task 4: Update Routing And Gate Documents

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Modify: `docs/implementation/giwa-lightsail-deploy-runbook-draft.md`
- Modify: `docs/implementation/giwa-staging-blocker-register.md`
- Modify: `docs/implementation/giwa-commercial-readiness-gate.md`

- [ ] **Step 1: Update README**

Add Sprint 53 plan/evidence links and keep deployment blocked.

- [ ] **Step 2: Update sprint index**

Add Sprint 53 row and narrative after Sprint 52.

- [ ] **Step 3: Update deploy runbook draft**

Link the Sprint 53 execution plan and smoke/rollback plan as future execution references.

- [ ] **Step 4: Update blocker and commercial gates**

Record Sprint 53 as planning-only and keep staging execution blocked until explicit approval exists.

## Task 5: Verification

Run:

```powershell
Test-Path docs\superpowers\plans\2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md
Test-Path docs\implementation\giwa-lightsail-staging-deploy-execution-plan.md
Test-Path docs\implementation\giwa-lightsail-staging-smoke-and-rollback-plan.md
Test-Path docs\evidence\lightsail-staging-deploy-execution-plan-sprint53.json
node -e "JSON.parse(require('node:fs').readFileSync('docs/evidence/lightsail-staging-deploy-execution-plan-sprint53.json','utf8')); console.log('json ok')"
$unfinishedPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $unfinishedPattern docs\superpowers\plans\2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md docs\implementation\giwa-lightsail-staging-deploy-execution-plan.md docs\implementation\giwa-lightsail-staging-smoke-and-rollback-plan.md docs\evidence\lightsail-staging-deploy-execution-plan-sprint53.json
$claimPattern = "real RW" + "A|real yi" + "eld|real fu" + "nds|settle" + "ment|KY" + "C|guarantee safe" + "ty|instant final" + "ity|200ms confirm" + "ed"
rg -n $claimPattern docs\superpowers\plans\2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md docs\implementation\giwa-lightsail-staging-deploy-execution-plan.md docs\implementation\giwa-lightsail-staging-smoke-and-rollback-plan.md docs\evidence\lightsail-staging-deploy-execution-plan-sprint53.json
$credentialScanPattern = ("private " + "key") + "|mnem" + "onic|bear" + "er|" + ("api " + "key") + "|" + ("access " + "key") + "|" + ("secret " + "key")
rg -n $credentialScanPattern docs\superpowers\plans\2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md docs\implementation\giwa-lightsail-staging-deploy-execution-plan.md docs\implementation\giwa-lightsail-staging-smoke-and-rollback-plan.md docs\evidence\lightsail-staging-deploy-execution-plan-sprint53.json
git status --short
```

Expected: paths exist, JSON parses, targeted scans return no matches, and git status shows only intended Sprint 53 documentation/evidence changes.

## Exit Gate

Sprint 53 exits when the execution plan, smoke/rollback plan, evidence JSON, and routing links exist and pass verification. Actual deployment remains blocked until a later Sprint 54 explicit approval provides the account, region, instance plan, domain/HTTPS method, runtime injection method, backup destination, release owner, rollback owner, and protected CI or local-advisory exception record.

## Next Sprint Candidate

`docs/superpowers/plans/2026-06-26-sprint-54-lightsail-staging-deploy-after-explicit-approval.md`

# Sprint 52 Lightsail Staging Deploy Preflight After Approval Implementation Plan

## Purpose

Sprint 52 turns the Sprint 51 Lightsail architecture into a deploy preflight package. It remains documentation-only and local-advisory. It does not create an AWS resource, start public hosting, configure DNS or HTTPS, connect managed infrastructure, request credential values, dispatch protected CI, send wallet actions, run GIWA chain-operation package commands, or install dependencies.

The preflight package is the operator-facing gate that must be completed before a later Sprint 53 deployment execution can be considered.

## Eight-Perspective Review

| Perspective | Sprint 52 preflight decision |
| --- | --- |
| AWS account / billing / region readiness | Require an operator-recorded account, billing, budget owner, region, and stop condition before any instance work. |
| Lightsail instance sizing / OS / Node runtime readiness | Require selected Ubuntu bundle, Node runtime method, disk budget, and upgrade owner before host creation. |
| Nginx / HTTPS / domain preflight | Draft route ownership, HTTPS option, domain/subdomain owner, renewal owner, and rollback behavior without configuring any external route. |
| Env / credential injection preflight | Record variable names and server-only/public-safe boundaries only; no values enter docs, chat, logs, or public artifacts. |
| systemd service / process lifecycle preflight | Draft `giwa-static.service` and `giwa-live.service` with localhost binding, restart policy, non-root user, and no runtime values. |
| Storage / SQLite / backup / restore preflight | Treat SQLite as a staging-only exception, require backup destination approval, restore drill, and durable storage blocker before beta or production. |
| Observability / health / logs / alerts preflight | Require `/healthz`, `/readyz`, bounded upstream errors, journald review path, and alert owner before public access. |
| Rollback / go-no-go / release approval preflight | Require protected CI or explicit local-advisory exception, smoke checklist, rollback owner, artifact reference, and release approval owner. |

## Deliverables

- `docs/implementation/giwa-lightsail-staging-preflight-checklist.md`
- `docs/implementation/giwa-lightsail-systemd-and-nginx-draft.md`
- `docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md`
- `docs/implementation/giwa-lightsail-backup-restore-preflight.md`
- `docs/evidence/lightsail-staging-preflight-sprint52.json`
- README, sprint index, deploy runbook draft, blocker register, and commercial readiness gate links.

## Task Plan

### 1. Preflight Checklist

- Write `docs/implementation/giwa-lightsail-staging-preflight-checklist.md`.
- Capture required external inputs: account/billing readiness, region, instance plan, domain/subdomain, HTTPS approach, credential injection method, backup destination, rollback owner, release owner, and protected CI or approved local-advisory exception.
- Mark every unresolved input as a blocker.

### 2. systemd And Nginx Draft

- Write `docs/implementation/giwa-lightsail-systemd-and-nginx-draft.md`.
- Include `giwa-static.service` and `giwa-live.service` draft shapes.
- Bind services to `127.0.0.1`.
- Route `/user`, `/user/receipts`, `/user/help`, `/user/receipt/*`, `/live`, `/demo`, `/partner`, `/api/*`, `/healthz`, and `/readyz`.

### 3. Env And Credential Injection Preflight

- Write `docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md`.
- Record variable names only.
- Separate server-only categories from public-safe fields.
- Require redacted readiness output and prohibit raw runtime value capture.

### 4. Backup And Restore Preflight

- Write `docs/implementation/giwa-lightsail-backup-restore-preflight.md`.
- Document SQLite staging limitations.
- Define backup cadence, restore drill gate, owner record, and durable storage blocker.

### 5. Evidence Packet

- Write `docs/evidence/lightsail-staging-preflight-sprint52.json`.
- Record local-advisory authority, no-execution facts, external inputs required, draft service/route/env/backup gates, and remaining blockers.

### 6. Existing Document Links

- Update README and sprint index with Sprint 52 links.
- Update Sprint 51 deploy runbook draft to point to the new preflight package.
- Update staging blocker register and commercial readiness gate with Sprint 52 status.

## Verification

Run after documentation updates:

```powershell
Test-Path docs\superpowers\plans\2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md
Test-Path docs\implementation\giwa-lightsail-staging-preflight-checklist.md
Test-Path docs\implementation\giwa-lightsail-systemd-and-nginx-draft.md
Test-Path docs\implementation\giwa-lightsail-env-and-secret-injection-preflight.md
Test-Path docs\implementation\giwa-lightsail-backup-restore-preflight.md
Test-Path docs\evidence\lightsail-staging-preflight-sprint52.json
node -e "JSON.parse(require('node:fs').readFileSync('docs/evidence/lightsail-staging-preflight-sprint52.json','utf8')); console.log('json ok')"
$unfinishedPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $unfinishedPattern docs\superpowers\plans\2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md docs\implementation\giwa-lightsail-staging-preflight-checklist.md docs\implementation\giwa-lightsail-systemd-and-nginx-draft.md docs\implementation\giwa-lightsail-env-and-secret-injection-preflight.md docs\implementation\giwa-lightsail-backup-restore-preflight.md docs\evidence\lightsail-staging-preflight-sprint52.json
$claimPattern = "real RW" + "A|real yi" + "eld|real fu" + "nds|settle" + "ment|perform KY" + "C|guarantee safe" + "ty|instant final" + "ity|200ms confirm" + "ed"
rg -n $claimPattern docs\superpowers\plans\2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md docs\implementation\giwa-lightsail-staging-preflight-checklist.md docs\implementation\giwa-lightsail-systemd-and-nginx-draft.md docs\implementation\giwa-lightsail-env-and-secret-injection-preflight.md docs\implementation\giwa-lightsail-backup-restore-preflight.md docs\evidence\lightsail-staging-preflight-sprint52.json
$credentialScanPattern = ("private " + "key") + "|mnem" + "onic|bear" + "er|" + ("api " + "key") + "|" + ("access " + "key") + "|" + ("secret " + "key")
rg -n $credentialScanPattern docs\superpowers\plans\2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md docs\implementation\giwa-lightsail-staging-preflight-checklist.md docs\implementation\giwa-lightsail-systemd-and-nginx-draft.md docs\implementation\giwa-lightsail-env-and-secret-injection-preflight.md docs\implementation\giwa-lightsail-backup-restore-preflight.md docs\evidence\lightsail-staging-preflight-sprint52.json
git status --short
```

Expected result: all paths exist, JSON parses, targeted scans return no matches, and git status shows only intended Sprint 51/52 documentation and evidence changes.

## Exit Gate

Sprint 52 is complete when the preflight checklist, service/proxy draft, env/credential boundary, backup/restore drill, evidence JSON, and index links exist and pass targeted verification. Staging execution remains blocked until an explicit Sprint 53 approval names the account, region, host policy, credential injection path, backup target, protected CI or exception path, release owner, and rollback owner.

## Next Sprint Candidate

`docs/superpowers/plans/2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md`

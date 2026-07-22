# GIWA Lightsail Staging Smoke And Rollback Plan (Historical Sprint 53 Record)

## Scope

This Sprint 53 document defines future smoke and rollback behavior only. It does not run network checks, publish a host, configure Nginx, enable HTTPS, connect managed services, or request runtime values.

This file preserves the Sprint 53 planning state. [The GASOK staging runbook](giwa-gasok-staging-runbook.md) is the current operational source and the versioned smoke/backup/proxy assets are under `ops/lightsail`. References to "current" below mean the recorded historical state. This document is not evidence that staging was deployed.

## Smoke Prerequisites

Before smoke can run in a later execution sprint:

- release owner has approved the deploy attempt
- rollback owner is present
- source commit and artifact source are recorded
- Nginx config has passed syntax validation
- static service is running on localhost
- live service is running on localhost only if runtime readiness passed
- backup or empty-state record exists
- `/api/partner/runs` auth boundary is approved before that route is checked
- git push, host package installation, DNS, HTTPS/certificate work, wallet actions, and any DB restore have their separate required approvals

## Route Smoke Matrix

| Route | Expected result | Failure response |
| --- | --- | --- |
| `/` | HTTP success from static `127.0.0.1:4176` | rollback static release if root fails |
| `/user` | HTTP success from live `127.0.0.1:4177`, user action page renders | live upstream failure must reach recorded static `/user*` fallback |
| `/user/receipts` | HTTP success from live, receipt list projection renders | live upstream failure must reach recorded static `/user*` fallback |
| `/user/help` | HTTP success from live, recovery copy renders | live upstream failure must reach recorded static `/user*` fallback |
| `/user/receipt/<hash>` | HTTP success or bounded not-found for unknown hash | block go-live if raw failure text appears |
| `/live` | HTTP success only after live readiness | keep static fallback and stop live if unavailable |
| `/demo` | HTTP success from static, bounded demo copy | rollback static release if static route fails |
| `/partner` | HTTP success from static, redacted partner proof surface renders | rollback static release if partner route fails |
| `/healthz` | bounded live liveness result | live upstream failure returns bounded HTTP `503` JSON |
| `/readyz` | redacted live readiness result | live upstream failure returns bounded HTTP `503` JSON; stop on raw runtime values |
| `/api/partner/runs` | bounded JSON only with approved auth boundary | do not check before auth boundary approval; upstream failure returns bounded HTTP `503` JSON |

## Smoke Commands For Later Approval

On the host, after static and live readiness:

```bash
sudo -u giwa /opt/giwa/current/ops/lightsail/scripts/smoke-local.sh
```

The script checks static `4176`, live `4177`, health, readiness, and public config through loopback and prints only route labels. For the public origin, set the actual approved HTTPS origin in the private operator shell and run:

```powershell
$env:GIWA_SMOKE_BASE_URL="https://$env:GIWA_STAGE_HOST"
pnpm --filter @giwa/web smoke:staging
```

That command checks `/`, `/user`, `/user/help`, `/partner`, `/healthz`, `/readyz`, and `/api/public/config` with bounded timeouts. The following manual probes are supplemental shapes only:

```powershell
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/user
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/user/receipts
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/user/help
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/user/receipt/<known-public-receipt-hash>
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/live
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/demo
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/partner
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/healthz
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/readyz
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/api/partner/runs
```

Do not run wallet actions or GIWA chain-operation package commands as smoke checks.

Before Nginx reload, render a new allowed candidate with `ops/lightsail/render-nginx-config.mjs`, put it through the approved candidate link flow, and run `sudo nginx -t`. Install/activate and reload only after syntax success. Certificate work begins only after DNS resolves to the Lightsail static IP; rerun `nginx -t` and public smoke after certificate activation.

## Smoke Pass Criteria

Pass requires:

- approved host responds on expected routes
- static fallback stays available
- live route returns bounded output
- `/user*` uses live in the healthy case and reaches recorded static fallback when live is deliberately stopped
- `/api/*`, `/healthz`, and `/readyz` return bounded `503` JSON during the same live outage drill
- health/readiness routes do not expose runtime values
- API routes return bounded JSON
- no route shows raw internal failure text
- receipt states remain locked unless verifier match evidence exists
- rollback owner confirms rollback remains possible

## Rollback Triggers

Rollback is required if:

- static route smoke fails
- live service cannot start cleanly
- Nginx route table is wrong
- HTTPS activation breaks access
- readiness exposes runtime values
- API response exposes raw failure text
- DB write or restore check fails
- SQLite `.backup`/`PRAGMA quick_check` fails or schema compatibility is not established
- `/var/lib/giwa/backups` growth has no owned capacity/retention response
- receipt lock opens unexpectedly
- release owner calls no-go

## Rollback Procedure

Future operator actions:

```text
1. Stop new writes and giwa-live.service.
2. Keep giwa-static.service online if static smoke still passes.
3. Repoint /opt/giwa/current to the preserved previous immutable release.
4. Restore previous systemd unit candidates and run systemctl daemon-reload.
5. Restore the previous Nginx candidate/link and reload only after nginx -t passes.
6. Rerun static and /user* fallback smoke; expect bounded 503 JSON from API/health/readiness while live is stopped.
7. Start the prior live release only after its schema compatibility and readiness pass.
8. Restore a DB backup only after writes are stopped, quick_check passes, old/new schema compatibility is assessed, and the restore owner explicitly approves.
9. Preserve service logs, proxy logs, smoke output, source commit, owner decision, and blocker evidence without runtime values.
10. Update blocker register and commercial readiness gate.
```

Rollback cannot reverse public GIWA Sepolia testnet transactions or public chain evidence.

## Go/No-Go Decision

Go requires:

- all approved smoke routes pass
- backup/restore gate is satisfied
- release owner approves
- rollback owner approves
- partner/customer signoff or internal-only exception is recorded
- protected CI or explicit local-advisory exception is recorded

No-go keeps staging execution blocked and records the failure class in the blocker register.

The historical Sprint 53 result was no-go/planning-only. Current release authority defaults to protected CI evidence; no GASOK-only local-advisory exception is recorded. Any later exception must be exact-commit, GASOK-only, named-approver, expiry-bounded, and never described as protected CI.

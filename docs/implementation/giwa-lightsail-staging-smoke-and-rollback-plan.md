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
- static and live were restarted after release activation; each is Active with nonzero MainPID and `/proc/<MainPID>/cwd` resolves to the exact `/opt/giwa/current` release
- backup or empty-state record exists
- public unauthenticated `/api/partner/runs` `401` boundary probe is required; the separate private authenticated probe runs only after explicit approval
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
| `/api/partner/runs` without partner header | HTTP `401` bounded `unauthorized` JSON | any public success is a blocker; upstream outage may instead return bounded HTTP `503` JSON |
| `/api/partner/runs` with approved private auth | HTTP success with redacted tenant-scoped rows | separate approval-gated probe; never print auth material or response fields outside the approved evidence boundary |

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
$partnerProbe = Invoke-WebRequest -UseBasicParsing -SkipHttpErrorCheck https://<approved-staging-host>/api/partner/runs
if ($partnerProbe.StatusCode -ne 401) { throw 'partner boundary failed' }
```

The private authenticated partner probe is separate and approval-gated. Load its value through an approved non-echoed shell/environment source, send it only as the `x-giwa-partner-token` header from an operator-controlled probe, and never print the header or value. Do not place the value in repository examples, command arguments, captured shell history, smoke output, or public evidence.

Do not run wallet actions or GIWA chain-operation package commands as smoke checks.

The Nginx checkpoint uses exactly one approval-gated link state: render a NEW unique allowed candidate, capture the previous enabled target, create a temporary candidate symlink and atomically replace the enabled link, then run `nginx -t` against that exact state. On failure, atomically restore the previous target and verify it with `nginx -t`. On success, make no further config/link/file mutation and run `systemctl reload nginx`. Record candidate path, previous target, tested enabled target, and test output/status. Certificate work begins only after DNS resolves to the Lightsail static IP; rerun this same checkpoint and public smoke after certificate activation.

## Smoke Pass Criteria

Pass requires:

- approved host responds on expected routes
- exact source commit, resolved current release, static/live MainPIDs, Active states, and process cwd checks are recorded before route smoke
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
4. Restore previous systemd unit candidates, run systemctl daemon-reload, restart static first, and verify its Active/MainPID/prior-release cwd before restarting and verifying live.
5. Atomically restore the previous Nginx enabled target, run nginx -t against that exact link state, then reload without another config/link/file mutation.
6. Rerun static and /user* fallback smoke; expect bounded 503 JSON from API/health/readiness while live is stopped.
7. Keep the restarted prior live release only after its schema compatibility, exact process cwd, and readiness pass.
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

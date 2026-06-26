# GIWA Lightsail Staging Smoke And Rollback Plan

## Scope

This Sprint 53 document defines future smoke and rollback behavior only. It does not run network checks, publish a host, configure Nginx, enable HTTPS, connect managed services, or request runtime values.

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

## Route Smoke Matrix

| Route | Expected result | Failure response |
| --- | --- | --- |
| `/user` | HTTP success, user action page renders | rollback static release if static route fails |
| `/user/receipts` | HTTP success, receipt list projection renders | rollback static release if static route fails |
| `/user/help` | HTTP success, recovery copy renders | rollback static release if static route fails |
| `/user/receipt/<hash>` | HTTP success or bounded not-found for unknown hash | block go-live if raw failure text appears |
| `/live` | HTTP success only after live readiness | keep static fallback and stop live if unavailable |
| `/demo` | HTTP success, bounded demo copy | rollback static release if static route fails |
| `/partner` | HTTP success, partner proof surface renders | rollback static release if partner route fails |
| `/healthz` | bounded liveness result | stop live route activation if unavailable |
| `/readyz` | redacted readiness result | stop if raw config names or runtime values appear |
| `/api/partner/runs` | bounded JSON only with approved auth boundary | do not check before auth boundary approval |

## Smoke Commands For Later Approval

These are shapes only:

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

## Smoke Pass Criteria

Pass requires:

- approved host responds on expected routes
- static fallback stays available
- live route returns bounded output
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
- receipt lock opens unexpectedly
- release owner calls no-go

## Rollback Procedure

Future operator actions:

```text
1. Stop giwa-live.service.
2. Keep giwa-static.service online if static smoke still passes.
3. Restore previous release directory or git commit.
4. Restore previous Nginx config and reload only after syntax check passes.
5. Restore DB backup only if restore owner approves and active writes are stopped.
6. Preserve service logs, proxy logs, smoke output, and blocker evidence.
7. Rerun static fallback smoke.
8. Update blocker register and commercial readiness gate.
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

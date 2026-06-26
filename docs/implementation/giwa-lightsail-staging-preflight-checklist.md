# GIWA Lightsail Staging Preflight Checklist

## Scope

This checklist is the Sprint 52 preflight package for a later approved Lightsail staging deployment. It does not create infrastructure, publish a host, configure DNS or HTTPS, connect managed services, request credential values, dispatch protected CI, send wallet actions, run GIWA chain-operation package commands, or install dependencies.

The current authority remains `local-advisory`. Release-grade provenance is absent until protected CI and protected artifact metadata exist, or a named release owner grants an explicit local-advisory exception for an internal-only staging rehearsal.

## Required External Inputs

| Input | Required record | Current state | Blocks |
| --- | --- | --- | --- |
| AWS account and billing readiness | Account owner, billing status, budget owner, stop condition | absent | instance creation |
| Region | Selected Lightsail region and data-handling owner | absent | host placement |
| Instance plan | Ubuntu bundle, disk size, monthly budget owner, resize trigger | absent | capacity approval |
| Domain or subdomain | Hostname, DNS owner, change window, rollback owner | absent | public route |
| HTTPS approach | Lightsail load balancer or Nginx certificate path, renewal owner, failure response | absent | browser access |
| Credential injection method | Approved server-only injection channel and owner, values excluded | absent | live service activation |
| Backup destination | Destination category, retention owner, restore owner, access policy | absent | live state retention |
| Rollback owner | Owner, artifact reference, DB restore decision, incident route | absent | release approval |
| Protected CI or exception | Protected CI pass, or named local-advisory exception for internal staging only | absent | provenance gate |
| Partner/customer decision | Real signoff, or explicit internal-only preflight exception | absent | beta promotion |

## Preflight Gates

### Account And Region Gate

Pass criteria:

- account owner is recorded
- billing readiness is recorded by the operator
- selected region is recorded
- budget owner is recorded
- stop condition for unexpected spend is recorded

Current result: blocked.

### Runtime Gate

Pass criteria:

- Ubuntu image is selected
- Node runtime source is approved
- non-root service user is defined
- static and live service ports remain localhost-bound
- service restart policy is documented

Current result: draft-ready, not approved.

### Domain And HTTPS Gate

Pass criteria:

- domain or subdomain is approved
- HTTPS method is selected
- certificate renewal owner is recorded
- rollback behavior for certificate or proxy failure is documented

Current result: blocked.

### Credential Injection Gate

Pass criteria:

- variable names are documented without values
- server-only fields are separated from public-safe fields
- redacted readiness output format is approved
- docs, chat, shell history, screenshots, and public artifacts exclude runtime values

Current result: blocked.

### Storage And Restore Gate

Pass criteria:

- SQLite staging limitation is acknowledged
- backup destination is approved
- backup cadence is approved
- restore drill passes before partner-facing use
- durable storage blocker remains open for beta or production

Current result: blocked.

### Observability Gate

Pass criteria:

- `/healthz` and `/readyz` ownership is documented
- bounded upstream failure response is documented
- logs are redacted and scoped
- alert owner is recorded

Current result: draft-ready, not approved.

### Go/No-Go Gate

Minimum go criteria:

- protected CI passes on intended source, or a named local-advisory exception is approved
- staging smoke list is approved
- rollback owner is recorded
- release approval owner is recorded
- no open gate asks for credential values in docs or chat

Current result: no-go.

## Staging Smoke List For Later Approval

These checks are not executed in Sprint 52. They define the later deploy smoke surface:

```text
GET /user
GET /user/receipts
GET /user/help
GET /user/receipt/<known-public-receipt-hash>
GET /live
GET /demo
GET /partner
GET /healthz
GET /readyz
GET /api/partner/runs
```

Pass criteria:

- HTTP success for static routes
- bounded response for unavailable live dependencies
- no raw internal failure text in public output
- no runtime value exposure
- static fallback remains available if live service is stopped

## Stop Conditions

Stop before deployment execution if:

- account, billing, region, or budget owner is absent
- hostname or HTTPS owner is absent
- credential injection method is absent
- backup destination or restore owner is absent
- protected CI or explicit local-advisory exception is absent
- partner/customer signoff or internal-only exception is absent
- release owner or rollback owner is absent
- a step asks for runtime values in docs, chat, screenshots, or public artifacts
- a step sends wallet actions or runs GIWA chain-operation package commands

## Sprint 52 Result

Sprint 52 makes the deploy path auditable. It does not approve or execute deployment.

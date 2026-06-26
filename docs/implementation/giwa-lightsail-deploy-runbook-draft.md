# GIWA Lightsail Deploy Runbook Draft

## Scope

This is a draft runbook supported by the Sprint 52 preflight package. It is not an approval to create a Lightsail instance, deploy a public service, configure DNS or HTTPS, connect managed infrastructure, request credential values, send wallet transactions, run chain-operation package commands, install dependencies, or dispatch protected CI.

Every command in this document is a draft shape only. Operators must re-check commands against the approved host, account, region, artifact, and credential plan before execution.

## Preflight Approval Gate

Do not begin a deploy preflight until these are recorded:

- AWS account and billing approval
- selected Lightsail region
- instance size and monthly budget owner
- host owner
- rollback owner
- domain and HTTPS decision
- credential injection method
- storage mode and backup owner
- protected CI or approved local-advisory exception
- partner/customer signoff or explicit internal-only dry-run exception
- static fallback evidence path
- Sprint 51 architecture and cost docs reviewed
- Sprint 52 preflight checklist reviewed

## Sprint 52 Preflight Package

Use these documents before any later deploy execution sprint:

```text
docs/superpowers/plans/2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md
docs/implementation/giwa-lightsail-staging-preflight-checklist.md
docs/implementation/giwa-lightsail-systemd-and-nginx-draft.md
docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md
docs/implementation/giwa-lightsail-backup-restore-preflight.md
docs/evidence/lightsail-staging-preflight-sprint52.json
```

Sprint 52 keeps the current result `no-go`. It records required external inputs, service and proxy drafts, runtime variable names only, backup/restore gates, smoke list, rollback owner requirements, and local-advisory authority. It does not authorize AWS resource creation, public deployment, DNS/HTTPS configuration, managed infrastructure connection, protected CI dispatch, credential value capture, wallet actions, chain-operation package commands, dependency installation, or release promotion.

## Sprint 53 Execution Plan Package

Use these documents before any later execution sprint:

```text
docs/superpowers/plans/2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md
docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md
docs/implementation/giwa-lightsail-staging-smoke-and-rollback-plan.md
docs/evidence/lightsail-staging-deploy-execution-plan-sprint53.json
```

Sprint 53 remains planning-only. It records the later sequence for selected commit verification, Lightsail instance creation, runtime installation, source or artifact fetch, build or unpack, runtime injection, systemd, Nginx, HTTPS, smoke, evidence, rollback, and go/no-go. It does not authorize AWS resource creation, public deployment, DNS/HTTPS configuration, managed infrastructure connection, protected CI dispatch, credential value capture, wallet actions, chain-operation package commands, dependency installation, or release promotion.

## Artifact Source

Approved artifact source must be one of:

1. protected CI artifact after required checks pass
2. explicitly approved local-advisory artifact exception

The current state is local-advisory only. It is not release-grade provenance.

Before copying artifacts to a staging host, record:

- source commit
- artifact manifest path
- local provenance report path
- evidence hash
- approval owner
- rollback artifact reference

## Instance Preparation Draft

Future operator steps, after approval:

```text
1. Create Ubuntu Lightsail instance in approved region.
2. Attach static IP only if approved.
3. Configure firewall for SSH from approved operator source and HTTP/HTTPS only after reverse proxy is ready.
4. Create non-root service user.
5. Install approved Node runtime from the approved package source.
6. Copy approved repository artifact or release bundle.
7. Place runtime configuration through approved server-only injection.
8. Create service working directory and data directory with restrictive permissions.
```

Do not paste credential values into shell history, runbook text, chat, screenshots, logs, or public evidence.

## Service Layout Draft

```text
/opt/giwa/current
  apps/web/public
  apps/web/scripts
  apps/web/src
  packages
  docs/evidence public-safe artifacts only

/var/lib/giwa
  live.sqlite only if approved single-instance staging
  backups

/var/log/journal
  systemd logs only
```

Service names:

```text
giwa-static.service
giwa-live.service
```

Static service environment:

```text
PORT=4176
HOST=127.0.0.1
```

Live service categories:

```text
PORT
HOST
GIWA_LIVE_MODE
GIWA_LIVE_DB_PATH or approved storage adapter category
GIWA_LIVE_ALLOWED_ORIGINS
GIWA_LIVE_PARTNER_TENANT_ID
GIWA_LIVE_PARTNER_CREDENTIAL_HASHES
GIWA_SEPOLIA_RPC_URL category
campaign signer credential category
```

Values are not recorded in this document.

## Nginx Route Draft

First staging should route:

```text
/user                 -> static service
/user/receipt/        -> static service unless live-backed route is approved
/user/receipts        -> static service
/user/help            -> static service
/                     -> static service
/partner              -> static service
/demo                 -> static service first; live version only when live health is green
/live                 -> live service
/healthz              -> live service
/readyz               -> live service
/api/                 -> live service
```

Nginx must:

- set request body limits
- keep same-origin browser behavior
- avoid wildcard CORS
- preserve static fallback during live restart
- return bounded public errors for unavailable upstreams

## Smoke Test Draft

After approved deployment only:

```powershell
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/user
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/user/receipts
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/user/help
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/partner
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/demo
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/healthz
Invoke-WebRequest -UseBasicParsing https://<approved-staging-host>/readyz
```

Do not run wallet actions or chain-operation package commands as part of staging smoke.

## Browser QA Draft

Use desktop and mobile viewport checks:

- `/user`
- `/user/receipt/<known-public-receipt-hash>`
- `/user/receipts`
- `/user/help`
- `/`
- `/partner`
- `/demo`

Pass criteria:

- HTTP 200
- no horizontal overflow
- no console errors for static surfaces
- user screens do not show protected CI, blocker register, signer role, credential, raw env, raw failure reason, or internal gate copy

## Backup And Restore Draft

Before partner review:

1. Stop live writes or enter maintenance mode.
2. Create a snapshot or DB backup using the approved method.
3. Restore into isolated staging state.
4. Compare row counts for runs, submitted transactions, decisions, receipts, verifier inputs, and verification jobs.
5. Recompute `verifierInputHash` and `receiptHash`.
6. Regenerate public snapshot and compare SHA-256.
7. Confirm locked states remain locked.
8. Record owner, timestamp, restore duration, and result.

## Rollback Draft

Rollback target:

- static fallback remains available
- live API can be stopped without breaking `/user`, `/`, `/partner`, and `/demo` static fallback
- previous artifact bundle is retained
- previous systemd service files are retained or restorable
- database rollback is treated as partial unless restore drill proves complete behavior

Rollback steps after approval:

```text
1. Stop live service.
2. Route `/live` and `/api/` to bounded unavailable responses or maintenance page.
3. Keep static service online.
4. Restore previous artifact bundle if static assets regressed.
5. Restore database only from approved backup and only after restore owner approval.
6. Run static fallback smoke.
7. Record incident and blocker register update.
```

Rollback cannot reverse public GIWA Sepolia testnet transactions or public chain evidence.

## Stop Conditions

Stop the deploy path if:

- protected CI or approved exception is absent
- AWS account/billing approval is absent
- host owner or rollback owner is absent
- domain/HTTPS approval is absent
- credential injection path is absent
- any step asks for credential values in chat or docs
- any step reads or prints real env file content
- any step sends a wallet transaction
- any step runs deploy, fund, anchor, verifier-chain, or mint commands
- any step installs dependencies without approval
- `/readyz` exposes raw config names or values
- locked receipt state opens a receipt payload
- static fallback fails

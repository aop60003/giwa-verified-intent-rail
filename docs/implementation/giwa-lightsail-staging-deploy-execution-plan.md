# GIWA Lightsail Staging Deploy Execution Plan (Historical Sprint 53 Record)

## Scope

This Sprint 53 document is an execution plan for a later explicitly approved Lightsail staging deployment. It is not a deployment approval and it does not create infrastructure, publish traffic, configure DNS or HTTPS, connect managed services, request credential values, read local env files, dispatch protected CI, send wallet actions, run GIWA chain-operation package commands, or install dependencies.

The current result remains `no-go`.

This file preserves the Sprint 53 planning state. The current source of truth is [the GASOK staging runbook](giwa-gasok-staging-runbook.md), backed by the versioned assets under `ops/lightsail`. References below to "current" mean the state recorded during Sprint 53, not the repository or deployment state today. Public deployment has not been claimed.

## Explicit Approval Record Required

Before execution begins, the release owner must record:

| Approval | Required record | Current state |
| --- | --- | --- |
| AWS/Lightsail account and billing | account owner, billing readiness, budget owner, spend stop condition | absent |
| Region and plan | selected region, Ubuntu plan, disk size, resize trigger | absent |
| Host packages | approval for Node/pnpm, Nginx, `sqlite3`, and the selected certificate tool | absent |
| Domain and HTTPS | hostname, DNS owner, HTTPS method, renewal owner | absent |
| Runtime injection | approved server-only injection method, variable names reviewed, values excluded from docs | absent |
| Backup destination | destination category, retention owner, restore owner, drill gate | absent |
| Source provenance | protected CI artifact metadata or explicit local-advisory exception | absent |
| Release owner | named owner for go/no-go | absent |
| Rollback owner | named owner for rollback and DB restore decision | absent |
| Partner/customer decision | signoff or internal-only staging exception | absent |
| Wallet actions | named human who will connect and approve each GIWA Sepolia testnet transaction | absent |

Git push, host package installation, DNS, HTTPS/certificate work, wallet actions, DB restore, and other destructive steps each retain a separate explicit approval gate.

## Execution Sequence After Approval

### 1. Verify Current Git Commit

Future operator record:

```text
selectedCommit=<approved commit hash>
artifactSource=current protected CI evidence or approved GASOK-only local-advisory exception
artifactManifest=<approved manifest path>
rollbackArtifact=<previous artifact path or commit>
```

Stop if selected commit and artifact source are not recorded. Protected CI evidence is the default. No GASOK-only exception is recorded in this historical plan or the current runbook; any later exception must record exact source commit, GASOK-only scope, named approver, and expiry date and must never be represented as protected CI or reused outside that scope and expiry.

### 2. Create Lightsail Instance

Future operator actions:

```text
create Ubuntu instance in approved region and plan
attach static IP only if approved
restrict SSH to approved operator source
keep HTTP/HTTPS closed until proxy is ready
record instance id, region, plan, and owner in private ops record
```

Do not paste credential values into chat, docs, logs, shell history, or public evidence.

### 3. Install Runtime

Future operator actions:

```text
install approved Node runtime
create non-root giwa service user
create /opt/giwa/releases
create /opt/giwa/current as an active-release symlink only after build success
create /var/lib/giwa and /var/lib/giwa/backups
create /etc/giwa
set restrictive ownership and permissions
```

Stop if runtime source is not approved.

### 4. Fetch Source Or Artifact

Allowed strategies:

| Strategy | Use when | Required record |
| --- | --- | --- |
| Protected artifact copy | protected CI passed for the exact source and artifact metadata exists | run id, artifact id, manifest hash, source commit |
| Exact commit checkout | git push and repository access are approved | remote, exact 40-character commit, operator |
| Local-advisory bundle | explicit GASOK-only exception exists and has not expired | bundle hash, exact source commit, scope, approver, expiry |

The current state has no protected artifact metadata.

### 5. Build App

Future operator actions inside `/opt/giwa/releases/<exact-source-commit>`:

```text
pnpm install --frozen-lockfile only if approved for the host
pnpm build
node --check ops/lightsail/render-nginx-config.mjs
bash -n ops/lightsail/scripts/backup-live-db.sh
bash -n ops/lightsail/scripts/smoke-local.sh
```

If dependencies are prebuilt in an artifact, the host should not install dependencies. The chosen approach must be recorded before execution. Do not change `/opt/giwa/current` until build and syntax checks pass; preserve its previous symlink target for rollback.

### 6. Create Runtime Injection

Future operator actions:

```text
create approved server-only runtime file or systemd drop-in
set owner to service user
set permissions to 0600 or stricter approved mode
run redacted readiness check
```

The current runtime file is `/etc/giwa/giwa-live.runtime`. Its exact allowed names and the `HOST`, `PORT`, `GIWA_LIVE_MODE`, and `GIWA_SKIP_PUBLIC_EXPORT` reserved-key exclusions are defined in the current runbook. Only variable names may appear in documentation. Values stay on the host or approved runtime channel.

### 7. Configure systemd

Future operator actions:

```text
install ops/lightsail/systemd/giwa-static.service as giwa-static.service
install ops/lightsail/systemd/giwa-live.service as giwa-live.service
install ops/lightsail/systemd/giwa-backup.service as giwa-backup.service
install ops/lightsail/systemd/giwa-backup.timer as giwa-backup.timer
systemctl daemon-reload
systemctl start giwa-static.service
systemctl status giwa-static.service
systemctl start giwa-live.service only after runtime readiness passes
systemctl status giwa-live.service
systemctl enable --now giwa-backup.timer
```

Both services must bind to localhost.

Before release activation, run the exact backup service command if an active DB exists:

```text
sudo systemctl start giwa-backup.service
```

The versioned backup script uses SQLite `.backup` and `PRAGMA quick_check`. SQLite/WAL restore compatibility must be rehearsed on a non-active path. The script does not prune old backups, so `/var/lib/giwa/backups` growth requires an owned storage/retention decision.

### 8. Configure Nginx

Future operator actions:

```text
render a new allowed candidate with ops/lightsail/render-nginx-config.mjs
test the candidate activation with nginx -t before reload
install/activate only after nginx -t passes
route /, /demo, and /partner to static 127.0.0.1:4176
route /user* to live 127.0.0.1:4177 with static fallback on live upstream failure
route /api/*, /healthz, and /readyz to live 127.0.0.1:4177
return bounded 503 JSON for API/health/readiness upstream failure
```

The renderer output must be a new `giwa-staging.conf` or `giwa-staging.candidate-<id>.conf` inside `/etc/nginx/sites-available` or `/etc/nginx/conf.d`; it refuses arbitrary output paths and existing files. Stop if config test fails or route ownership differs from the approved split.

### 9. Enable HTTPS

Future operator chooses the approved method:

- Lightsail load balancer certificate path
- Nginx certificate automation path

Stop if hostname, certificate owner, renewal owner, or rollback behavior is absent.

Do not request or activate a certificate until the approved DNS record resolves to the Lightsail static IP. After certificate changes, rerun `nginx -t`, reload, and perform HTTPS smoke before enforcing HTTP redirect.

### 10. Smoke Test

Run the versioned on-host smoke and the public staging smoke documented in the current runbook:

```text
sudo -u giwa /opt/giwa/current/ops/lightsail/scripts/smoke-local.sh
GIWA_SMOKE_BASE_URL=https://<approved-host> pnpm --filter @giwa/web smoke:staging
```

Stop if any required route fails, returns raw internal failure text, exposes runtime values, or unlocks a receipt state that should remain locked.

### 11. Record Evidence

Future evidence must include:

```text
selected commit
artifact source category
service status summary
route smoke results
health/readiness result
backup result
rollback owner
release owner
go/no-go decision
```

Evidence must not include runtime values or local env file content.

### 12. Rollback Or Go/No-Go

If smoke fails:

- stop live writes and `giwa-live.service`
- keep `giwa-static.service` online so `/user*` can use the recorded static fallback
- repoint `/opt/giwa/current` to the preserved prior immutable release
- restore previous systemd unit and Nginx candidates; run `nginx -t` before reload
- expect `/api/*`, `/healthz`, and `/readyz` to return bounded `503` while live is unavailable
- restore DB backup only after compatibility assessment, stopped writes, and explicit restore owner approval
- preserve logs and evidence
- update blocker register

If smoke passes:

- record go/no-go decision
- do not allow public user traffic until signoff and release approval are recorded

## Current Sprint 53 Result

Historical planning-only result. No execution was performed by Sprint 53. Refer to the current GASOK staging runbook and submission checklist for today's gate; neither document currently claims a completed public deployment.

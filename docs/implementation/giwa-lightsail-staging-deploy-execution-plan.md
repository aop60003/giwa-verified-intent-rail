# GIWA Lightsail Staging Deploy Execution Plan

## Scope

This Sprint 53 document is an execution plan for a later explicitly approved Lightsail staging deployment. It is not a deployment approval and it does not create infrastructure, publish traffic, configure DNS or HTTPS, connect managed services, request credential values, read local env files, dispatch protected CI, send wallet actions, run GIWA chain-operation package commands, or install dependencies.

The current result remains `no-go`.

## Explicit Approval Record Required

Before execution begins, the release owner must record:

| Approval | Required record | Current state |
| --- | --- | --- |
| AWS/Lightsail account and billing | account owner, billing readiness, budget owner, spend stop condition | absent |
| Region and plan | selected region, Ubuntu plan, disk size, resize trigger | absent |
| Domain and HTTPS | hostname, DNS owner, HTTPS method, renewal owner | absent |
| Runtime injection | approved server-only injection method, variable names reviewed, values excluded from docs | absent |
| Backup destination | destination category, retention owner, restore owner, drill gate | absent |
| Source provenance | protected CI artifact metadata or explicit local-advisory exception | absent |
| Release owner | named owner for go/no-go | absent |
| Rollback owner | named owner for rollback and DB restore decision | absent |
| Partner/customer decision | signoff or internal-only staging exception | absent |

## Execution Sequence After Approval

### 1. Verify Current Git Commit

Future operator record:

```text
selectedCommit=<approved commit hash>
artifactSource=protected artifact or approved local-advisory exception
artifactManifest=<approved manifest path>
rollbackArtifact=<previous artifact path or commit>
```

Stop if selected commit and artifact source are not recorded.

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
create /opt/giwa/current
create /var/lib/giwa
create /etc/giwa
set restrictive ownership and permissions
```

Stop if runtime source is not approved.

### 4. Fetch Source Or Artifact

Allowed strategies:

| Strategy | Use when | Required record |
| --- | --- | --- |
| Protected artifact copy | protected CI passed and artifact metadata exists | run id, artifact id, manifest hash, source commit |
| Git pull | repository access and source commit are approved | remote, branch, commit, operator |
| Local-advisory bundle | explicit internal-only exception exists | bundle hash, exception owner, source commit |

The current state has no protected artifact metadata.

### 5. Build App

Future operator actions:

```text
pnpm install --frozen-lockfile only if approved for the host
pnpm build
pnpm --filter @giwa/web --fail-if-no-match build
```

If dependencies are prebuilt in an artifact, the host should not install dependencies. The chosen approach must be recorded before execution.

### 6. Create Runtime Injection

Future operator actions:

```text
create approved server-only runtime file or systemd drop-in
set owner to service user
set permissions to 0600 or stricter approved mode
run redacted readiness check
```

Only variable names may appear in documentation. Values stay on the host or approved runtime channel.

### 7. Configure systemd

Future operator actions:

```text
install giwa-static.service
install giwa-live.service
systemctl daemon-reload
systemctl start giwa-static.service
systemctl status giwa-static.service
systemctl start giwa-live.service only after runtime readiness passes
systemctl status giwa-live.service
```

Both services must bind to localhost.

### 8. Configure Nginx

Future operator actions:

```text
install approved Nginx config
nginx -t
route static paths to 127.0.0.1:4176
route live/API/health/readiness paths to 127.0.0.1:4177
return bounded upstream errors
```

Stop if config test fails or route table differs from the approved plan.

### 9. Enable HTTPS

Future operator chooses the approved method:

- Lightsail load balancer certificate path
- Nginx certificate automation path

Stop if hostname, certificate owner, renewal owner, or rollback behavior is absent.

### 10. Smoke Test

Run the approved route smoke in `docs/implementation/giwa-lightsail-staging-smoke-and-rollback-plan.md`.

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

- stop live service
- keep static fallback online when possible
- restore prior release directory or commit
- restore previous Nginx config
- restore DB backup only with restore owner approval
- preserve logs and evidence
- update blocker register

If smoke passes:

- record go/no-go decision
- do not allow public user traffic until signoff and release approval are recorded

## Current Sprint 53 Result

Planning-only. No execution performed. Staging deploy remains blocked.

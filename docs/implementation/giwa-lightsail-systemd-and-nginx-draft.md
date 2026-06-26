# GIWA Lightsail systemd And Nginx Draft

## Scope

This document is a Sprint 52 draft for a later approved Lightsail host. It is not a deployment instruction by itself. It does not create services, configure a proxy, publish a route, request credential values, or touch any AWS account.

All examples use placeholders and localhost bindings. Operators must replace paths and owners only after Sprint 53 approval.

## Service Layout

Draft layout:

```text
/opt/giwa/current
  apps/web/public
  apps/web/scripts
  apps/web/src
  packages

/var/lib/giwa
  live.sqlite if approved for single-instance staging only
  backups

/etc/giwa
  approved runtime files outside the repository
```

Runtime files must not be copied into public assets, repository docs, screenshots, or evidence.

## giwa-static.service Draft

```ini
[Unit]
Description=GIWA static staging surface
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=giwa
Group=giwa
WorkingDirectory=/opt/giwa/current
Environment=HOST=127.0.0.1
Environment=PORT=4176
ExecStart=/usr/bin/node apps/web/scripts/serve-static.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Preflight checks:

- service user exists
- working directory is owned by the service user
- service binds only to `127.0.0.1`
- no runtime values appear in the unit file
- static fallback responds while live service is stopped

## giwa-live.service Draft

```ini
[Unit]
Description=GIWA live staging service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=giwa
Group=giwa
WorkingDirectory=/opt/giwa/current
Environment=HOST=127.0.0.1
Environment=PORT=4177
EnvironmentFile=/etc/giwa/giwa-live.runtime
ExecStart=/usr/bin/node apps/web/scripts/serve-live.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Preflight checks:

- runtime file is server-only
- runtime file is not committed
- runtime file contains approved variable names and values only on the host
- live DB path points to approved staging storage
- service binds only to `127.0.0.1`
- logs are reviewed for redacted output before public access

## Nginx Route Draft

Draft upstreams:

```nginx
upstream giwa_static {
  server 127.0.0.1:4176;
}

upstream giwa_live {
  server 127.0.0.1:4177;
}
```

Draft route ownership:

| Route | Upstream | Notes |
| --- | --- | --- |
| `/user` | static | user-facing action page |
| `/user/receipts` | static | user-safe receipt list projection |
| `/user/help` | static | recovery and support copy |
| `/user/receipt/*` | static first | live-backed path requires separate approval |
| `/live` | live | local operator live flow |
| `/demo` | static first | demo control remains bounded |
| `/partner` | static | partner proof console fallback |
| `/api/*` | live | bounded JSON responses only |
| `/healthz` | live | liveness signal |
| `/readyz` | live | readiness signal |
| `/` | static | static guided fallback |

Draft server block shape:

```nginx
server {
  listen 80;
  server_name <approved-hostname>;

  client_max_body_size 256k;

  location = /healthz {
    proxy_pass http://giwa_live;
  }

  location = /readyz {
    proxy_pass http://giwa_live;
  }

  location /api/ {
    proxy_pass http://giwa_live;
  }

  location /live {
    proxy_pass http://giwa_live;
  }

  location / {
    proxy_pass http://giwa_static;
  }
}
```

## HTTPS Options

Option A: Lightsail load balancer.

- simpler certificate lifecycle for staging
- adds recurring cost
- requires load balancer health checks
- keeps instance Nginx HTTP-only behind the balancer

Option B: Nginx with certificate automation.

- lower infrastructure count
- renewal owner and failure alert must be recorded
- host-level certificate files become operational state
- rollback must handle certificate renewal failure

No option is approved in Sprint 52.

## Proxy Safety Requirements

- no wildcard CORS unless separately approved for a bounded origin set
- no raw upstream error body returned to browser
- request body size bounded
- static fallback remains online during live restart
- `/api/*` responses stay bounded JSON
- logs do not include runtime values

## Rollback Shape

Static service is the continuity surface. If live service fails:

1. keep static service online
2. return bounded unavailable responses for `/api/*`
3. disable live-only browser actions if needed
4. retain previous artifact bundle
5. restore live storage only after restore owner approval

Sprint 52 does not execute this rollback.

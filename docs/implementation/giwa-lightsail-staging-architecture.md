# GIWA Lightsail Staging Architecture

## Scope

Sprint 51 defines a future Lightsail staging topology for `GIWA Verified Intent Rail`.

This document does not create AWS resources, deploy public traffic, bind DNS, configure HTTPS, connect managed infrastructure, request credential values, send wallet transactions, run chain-operation package commands, install dependencies, or dispatch protected CI.

The current authority remains `local-advisory`. Staging promotion still requires protected CI or an approved exception, protected artifact metadata or an approved exception, partner/customer signoff, external hosting approval, managed infrastructure approval, release approval, and rollback owner approval.

## Recommended Topology

Use one Ubuntu Lightsail instance for the first staging dry-run design:

```text
Internet
  -> approved domain and HTTPS layer
  -> Nginx reverse proxy on Ubuntu Lightsail
      -> 127.0.0.1:4176 giwa-static.service
      -> 127.0.0.1:4177 giwa-live.service
```

`giwa-static.service` runs:

```text
node --experimental-strip-types apps/web/scripts/serve-static.mjs
```

`giwa-live.service` runs:

```text
node --experimental-strip-types apps/web/scripts/serve-live.mjs
```

The static service is the continuity surface. The live service is the stateful staging surface and remains blocked until its runtime, credential, storage, rate-limit, and rollback gates are approved.

## Route Ownership

| Route | First staging owner | Notes |
| --- | --- | --- |
| `/user` | static service | Commercial user action page from Sprint 49/50. |
| `/user/receipt/<hash>` | static service first, live-backed later only after approval | Static route stays safe when live state is unavailable. |
| `/user/receipts` | static service | Local browser receipt projection only. |
| `/user/help` | static service | Recovery and support copy, no internal gate names. |
| `/` | static service | Recorded fallback. |
| `/partner` | static service | Partner/reviewer proof packet. |
| `/demo` | static service or live service through same proxy | Static bounded projection exists; live control room may replace it only when live API is healthy. |
| `/live` | live service | Operator/rehearsal live wallet path. |
| `/healthz` | live service for live host, static service for static fallback host | Cheap liveness only. |
| `/readyz` | live service for live host, static service for static fallback host | Redacted readiness only. |
| `/api/*` | live service | Requires request safety, auth, tenant, and rate gates before external exposure. |

## Reverse Proxy Policy

First staging should use same-origin routing. Same-origin keeps browser behavior simple and avoids broad CORS exposure.

Nginx must enforce:

- exact route prefixes
- request body size limit before Node
- method restrictions for static assets
- no wildcard origin policy
- no proxying to arbitrary upstream paths
- no raw upstream error pages in public responses
- static fallback preserved when the live service is down

## HTTPS Options

| Option | Use when | Strength | Risk |
| --- | --- | --- | --- |
| Lightsail load balancer certificate | Beta or reviewer traffic needs simpler certificate lifecycle and possible future multi-instance routing | Managed certificate flow and predictable load balancer component | Adds a monthly load balancer charge and another AWS resource to operate |
| Nginx with certbot | First staging dry run has one instance and an operator can own certificate renewal | Fewer AWS components and lower infrastructure complexity | Operator owns renewal, firewall, Nginx hardening, and failed-renewal response |

Sprint 51 recommends Nginx same-origin routing for the architecture plan, with the final HTTPS choice deferred to Sprint 52 approval.

## Systemd Services

Future services should be named:

```text
giwa-static.service
giwa-live.service
```

Service rules:

- run as a non-root service account
- use an explicit working directory
- load runtime values from an approved injection path
- write logs to journald
- restart on failure with bounded backoff
- expose only localhost ports to Nginx
- avoid printing credential values, raw env file content, raw provider URLs, request bodies, or stack traces

## Runtime Modes

| Mode | Allowed in Lightsail staging? | Notes |
| --- | --- | --- |
| `local` | no for public staging | Local-only mode may be used for private operator rehearsal. |
| `staging-testnet` | yes after approval | Must disable mock mode unless an explicit rehearsal exception is recorded. |
| `prod-testnet` | no for Sprint 51 | Requires later commercial gate and stricter managed infrastructure approval. |

## Environment And Credential Boundary

Staging activation requires approved environment categories, not values in documentation:

- runtime mode and host policy
- GIWA Sepolia standard RPC endpoint category
- explorer link template category
- campaign signer credential category
- partner credential hash category
- storage adapter category
- observability sink category

Credential values must be injected through an approved server-only channel and must not appear in:

- repository files
- public static assets
- browser bundles
- screenshots
- logs
- evidence JSON
- runbook examples

## Storage Boundary

SQLite is acceptable only for an explicitly approved single-instance staging rehearsal.

SQLite staging limitations:

- no multi-instance write safety
- local disk failure can lose unbacked state
- restore drill must be proven before partner review
- queue and rate-limit durability remain limited

Partner beta requires:

- approved durable storage adapter
- migration marker inventory
- incompatible-schema fail-closed behavior
- backup catalog
- restore drill with row-count checks
- recomputed `verifierInputHash` and `receiptHash`
- public snapshot hash comparison

## Observability Boundary

Required before any staging deploy:

- `/healthz` cheap liveness
- `/readyz` redacted readiness
- request id in API responses or logs
- allowlisted event names
- bounded error codes
- no raw request body logs
- no credential values
- no tokenized URL output
- no raw provider errors
- live service start/stop owner

Initial event names should reuse the hosted ops model:

```text
live.api.request
live.server.startup
live.readiness.check
live.receipt.gate_violation
live.chain.wrong_chain
live.hosted.mock_mode_blocked
live.verifier.timeout
live.db.write_failure
live.rate_limited
```

## Security Boundary

Staging remains blocked until:

- exact origin policy is approved
- partner auth maps credential hash to actor, tenant, and scope
- tenant id comes from auth context
- request body limit is enforced before handler execution
- malformed JSON fails closed
- rate limits exist for source, credential, tenant, wallet, and verify paths
- locked receipt states return bounded not-found responses
- public exports use an allowlisted schema
- static fallback remains available

## Go-No-Go Gate

Do not start a Lightsail deploy until all are recorded:

- AWS account and billing approval
- selected region and instance size
- host owner
- domain and HTTPS decision
- credential injection method
- storage mode and backup owner
- protected CI or approved local-advisory exception
- partner/customer signoff or explicit no-partner dry-run exception
- release owner
- rollback owner
- static fallback smoke result

## Stop Conditions

Stop before deployment if any workflow requires:

- AWS credential values in chat or docs
- real env file content
- wallet signing material
- wallet transaction
- chain-operation package command
- dependency installation
- public DNS binding without approval
- HTTPS setup without approval
- managed storage connection without approval
- protected CI claim without passing protected CI evidence

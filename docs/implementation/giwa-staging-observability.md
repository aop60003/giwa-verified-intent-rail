# GIWA Staging Observability

## Health and Readiness Gate

- `/healthz` returns cheap liveness only.
- `/readyz` returns redacted readiness and HTTP 503 when any required staging gate is red.
- Every `/api/*` response includes `requestId` in the body or response header, including success, validation errors, auth failures, receipt lock responses, and unexpected-handler errors.
- Unknown runtime, provider, and storage failures map to bounded public error codes.
- Raw request bodies are never logged.
- Upstream provider text is not returned to clients.

## Structured Event Allowlist

Use only bounded event names such as:

- `live.api.request`
- `live.server.startup`
- `live.readiness.check`
- `live.receipt.gate_violation`
- `live.chain.wrong_chain`
- `live.hosted.mock_mode_blocked`
- `live.backup.stale`
- `live.verifier.timeout`
- `live.db.write_failure`
- `live.auth.bypass_suspicion`
- `live.rate_limited`

Keep run id, wallet address, transaction hash, and request id in structured logs, not metric labels.

Startup logs use `live.server.startup` and include only redacted readiness classifications.

Blocked log fields:

- raw request bodies
- headers
- env values
- credential values
- tokenized URLs
- provider error text
- stack traces
- manifest signatures
- full signed manifest internals

## Metric Shape

Low-cardinality metrics only:

- `live_api_requests_total`
- `live_api_request_duration_ms`
- `live_readiness_ready`
- `live_backup_age_seconds`
- `live_verifier_timeout_total`
- `live_verification_job_backlog`
- `live_db_write_failures_total`
- `live_auth_failures_total`
- `live_receipt_gate_violations_total`
- `live_wrong_chain_total`

## Alert Matrix

| Alert | Severity | Owner | Required response |
| --- | --- | --- | --- |
| Receipt gate violation | P0 | named incident owner | lock receipts and exports |
| Wrong chain | P0 | named runtime owner | lock run and replay evidence |
| Mock mode in managed beta | P0 | named host owner | stop startup |
| Redaction failure or sensitive log output | P0 | named security owner | quarantine logs and artifacts |
| Backup stale | P1 | named restore owner | block promotion |
| Verifier timeout spike | P1 | named verifier owner | pause verifier fanout |
| DB write failure | P1 | named storage owner | enter read-only fallback |
| Auth bypass suspicion | P0 | named auth owner | block partner API |
| `/readyz` red after staging start | P1 | named runtime owner | block promotion and keep staging smoke stopped |
| Rate-limit saturation or abuse | P1/P2 | named runtime owner | keep bounded errors and review source, credential, and tenant buckets |

## Drill Requirement

Before staging dry run, table-drill at least:

- readiness red at startup
- receipt gate violation
- wrong chain
- stale backup
- verifier timeout spike
- DB write failure
- auth bypass suspicion
- bad export
- log redaction failure

Each drill records only public or redacted fields: alert name, severity, owner role, request ids, affected mode, bounded event names, affected run/receipt/transaction hashes, readiness state, fallback posture, lock criteria, and follow-up owner.

## Sprint 33 Billing-Lock Boundary

Sprint 33 may review observability requirements, but public staging execution remains blocked until protected CI passes.

Before staging execution, record:

| Gate | Required evidence |
| --- | --- |
| `/healthz` | cheap liveness only |
| `/readyz` | redacted response and HTTP 503 for any red gate |
| Request id | every `/api/*` success and error path includes `requestId` |
| Log redaction | no raw bodies, headers, env values, credential values, tokenized URLs, provider text, stack traces, or manifest signatures |
| Metric labels | no wallet, tx hash, run id, or request id as metric labels |
| Alert owners | named owner for receipt gate, wrong chain, mock mode, redaction, backup, verifier, DB write, auth, readiness, and rate-limit alerts |

The billing lock keeps `stagingDryRunExecution=blocked-protected-ci`; local observability checks are advisory only.

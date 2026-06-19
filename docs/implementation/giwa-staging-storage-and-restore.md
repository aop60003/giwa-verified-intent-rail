# GIWA Staging Storage and Restore

## Storage Readiness Gate

| Requirement | Evidence |
| --- | --- |
| Adapter choice | approved staging adapter or documented block |
| Owner | named storage owner |
| Connection method | process env category and readiness probe |
| Migration guard | `001_live_base`, `002_nullable_decision_tx_hash`, and `003_verification_jobs` verified |
| Legacy schema behavior | incompatible schema fails closed |
| Repository readiness | real probe, not assumed ready |
| Rate limit state | memory-only accepted only for local; staging needs approved behavior |
| Verification queue state | memory-only accepted only for local; staging needs approved behavior |

Current Sprint 19 status: blocked until an approved staging adapter, backup catalog, restore owner, and replay evidence exist.

Current runtime observations that keep the gate blocked:

- live server storage is wired to local SQLite through `GIWA_LIVE_DB_PATH`
- repository readiness is not a real hosted DB probe
- tenant readiness, rate-limit readiness, and queue readiness need staging probes before being treated as green
- verification queue state is memory-backed in the local server
- rate-limit state is memory-backed in the local server
- no backup age probe or restore metadata probe is connected to `/readyz`

## Migration Guard

Staging cannot run with implicit schema repair. The startup gate must show:

- known migrations are present
- unknown incompatible schemas fail closed
- nullable local verifier decision behavior is preserved
- verification job table is present when verifier queue is enabled
- migration owner and rollback posture are named
- migration markers include checksums or equivalent reviewed provenance before hosted activation
- staging startup proves the schema state instead of assuming local initialization succeeded

## Restore Drill

1. Record mode, adapter, app version, schema migrations, tenant, partner, campaign, mission, and backup timestamp.
2. Restore into isolated staging state.
3. Compare row counts for runs, submitted transactions, decisions, receipts, verifier inputs, and verification jobs.
4. Recompute `verifierInputHash` and `receiptHash`.
5. Regenerate public snapshot and compare SHA-256.
6. Confirm pending, timeout, mismatched, failed, missing-decision, and replay-mismatch states stay locked.
7. Record restore owner, restore duration, and result.

## Retention Gate

Shared evidence uses sanitized public fields only. Raw local rows, local logs, browser state, and credential-bearing provider data stay private and retention-bound.

Staging promotion stays blocked until retention owner, archive manifest shape, delete limits, and public chain-data limitations are acknowledged in the partner closeout packet.

## Sprint 33 Billing-Lock Boundary

Sprint 33 does not connect a production, managed, or cloud database. It prepares the storage evidence shape only:

| Gate | Sprint 33 state | Required before staging execution |
| --- | --- | --- |
| Adapter decision | blocked | approved non-production staging adapter and owner |
| Migration marker review | prepared | `001_live_base`, `002_nullable_decision_tx_hash`, and `003_verification_jobs` checked with reviewed marker provenance |
| Hosted probe | absent | real adapter probe with redacted result |
| Backup catalog | absent | isolated staging backup catalog with owner |
| Restore drill | absent | restore duration, row-count comparison, snapshot hash comparison, and receipt hash recomputation |
| Rate and queue state | local-only | approved multi-instance behavior or explicit rehearsal limitation |

Local SQLite, local snapshots, and local live rehearsal databases remain advisory and cannot unblock staging while `protectedCI=blocked-billing-lock`.

## Sprint 34 Hosted Adapter Readiness

Sprint 34 adds an adapter readiness record:

```text
docs/implementation/giwa-hosted-adapter-readiness.md
```

Readiness does not mean connection. Required later evidence remains:

| Gate | Required later evidence |
| --- | --- |
| Adapter | approved non-production staging adapter and owner |
| Migrations | marker inventory, reviewed checksums or equivalent provenance, and incompatible-schema fail-closed behavior |
| Probe | real hosted adapter probe with redacted result |
| Backup | isolated staging backup catalog with owner and timestamp |
| Restore | row-count comparison, public snapshot SHA-256 comparison, `verifierInputHash` recompute, and `receiptHash` recompute |
| Rate/queue | durable behavior or explicit rehearsal-only limitation |
| Queue restore | pending, leased, retryable, failed, and dead verification jobs preserve bounded states after restore |
| Worker crash | lease expiry, retry, dead-letter, and no-duplicate-fanout behavior is table-drilled |

Sprint 34 leaves `managedDatabaseConnection=blocked` and `hostedAdapterImplementation=blocked`.

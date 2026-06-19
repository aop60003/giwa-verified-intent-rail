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

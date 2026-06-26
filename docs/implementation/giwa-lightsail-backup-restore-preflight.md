# GIWA Lightsail Backup Restore Preflight

## Scope

This Sprint 52 document defines the backup and restore preflight for a later approved Lightsail staging host. It does not create a backup destination, connect managed storage, copy databases, or run a restore.

## SQLite Staging Limitation

SQLite is acceptable only as a single-instance staging exception when all of these are true:

- one live writer process
- no horizontal scaling
- no partner-facing durability claim
- restore drill completed before partner review
- backup owner and restore owner recorded
- durable storage blocker remains open for beta or production

SQLite is not the durable storage plan for beta or production.

## Data Classes

| Class | Example | Backup handling |
| --- | --- | --- |
| Static artifacts | checked-in public assets and docs | regenerated from source/artifact manifest |
| Local-advisory evidence | public-safe JSON and markdown evidence | committed and hashed |
| Live staging DB | run, transaction, verifier, receipt, job rows | backup before and after deploy smoke |
| Runtime values | server-only host material | never copied into evidence or public artifacts |
| Logs | service and proxy logs | retained only with redaction and retention owner |

## Backup Cadence Draft

For a future approved staging host:

| Moment | Action | Owner record |
| --- | --- | --- |
| Before deploy | capture DB backup or confirm empty DB | deploy operator |
| After deploy smoke | capture DB backup after successful smoke | deploy operator |
| Before partner rehearsal | capture DB backup and snapshot artifact reference | rehearsal owner |
| After partner rehearsal | capture DB backup and export public-safe evidence | rehearsal owner |
| Daily during short staging window | capture DB backup while staging is active | operations owner |

Sprint 52 does not execute any backup.

## Restore Drill Gate

Before partner-facing use, restore must prove:

1. backup file can be located by owner
2. restore target is isolated from the active service
3. live service can start against restored state
4. row counts are compared for runs, submitted transactions, decisions, receipts, verifier inputs, and verification jobs
5. receipt hash recomputation matches expected public-safe receipt records
6. locked receipt states remain locked
7. public snapshot export can be regenerated
8. restore duration and operator are recorded

Pass result must be recorded before partner review.

## Backup Destination Gate

Destination approval must record:

- destination category
- owner
- access policy
- retention window
- restore operator
- deletion process
- evidence path for backup and restore drill result

No destination is approved in Sprint 52.

## Rollback Interaction

Rollback can:

- restore a previous static artifact bundle
- stop live service
- route live API to bounded unavailable responses
- restore live DB only after restore owner approval

Rollback cannot:

- reverse public GIWA Sepolia testnet transactions
- remove public chain evidence
- replace protected CI provenance
- convert local-advisory artifacts into release-grade artifacts

## Current Result

Backup and restore readiness is blocked until backup destination, owner, restore drill, and durable storage decision are approved.

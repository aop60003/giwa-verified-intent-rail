# GIWA Evidence Retention Policy

## Scope

This policy defines Sprint 17 evidence retention, backup, restore, and archive rules for `GIWA Verified Intent Rail`.

It covers local rehearsal, staging-testnet, and managed GIWA Sepolia `prod-testnet` beta preparation. It does not connect to external storage or run DB migrations.

## Raw Versus Sanitized Evidence

Raw evidence stays private and retention-bound:

- local DB rows
- raw RPC transaction snapshots
- raw RPC receipt snapshots
- raw block snapshots
- decoded logs
- referral and timestamp linkage
- local operational logs

Sanitized evidence may be shared after scans:

- public wallet addresses
- public transaction hashes
- block numbers
- block hashes
- signatures and recovered public signer address
- canonical payloads
- payload byte hex
- `intentHash`
- `verifierInputHash`
- `receiptHash`
- sanitized provider labels
- public explorer base URL

Never share credential values, real env file content, auth headers, tokenized URLs, server-only config values, local browser state, or wallet secret material.

## Local SQLite Rehearsal Retention

Local SQLite is rehearsal storage only. It is not a hosted durable DB.

Default retention:

- unmatched, failed, or timeout local rehearsal DBs: purge within 7 days unless preserved for investigation
- matched local rehearsal DBs: purge within 30 days after public snapshot export unless preserved for review
- raw local logs: do not share; if centralized later, default 14 days
- public sanitized snapshots: retain as versioned artifacts
- partner beta audit logs: default 90 days unless partner agreement requires a shorter period

Public on-chain transaction and block data cannot be deleted by the app.

## Backup and Restore Drill

Backup/restore drill checklist:

1. Record environment, DB path or adapter, app version, schema migrations, tenant, partner, campaign, mission, and backup timestamp.
2. Back up DB plus public evidence artifacts; exclude env files, wallet material, raw local logs, and browser state.
3. Restore into isolated staging or rehearsal state.
4. Confirm migration guard passes and legacy schemas fail closed.
5. Compare row counts for runs, submitted txs, decisions, receipts, verifier inputs, and verification jobs.
6. Recompute `verifierInputHash` and `receiptHash`.
7. Regenerate live snapshot and compare file hash.
8. Confirm matched-only receipt gate remains closed for unmatched, failed, timeout, missing-decision, and replay-mismatch states.
9. Run public artifact scans before sharing the archive.

Hosted beta requires durable storage, migration guard, backup catalog, restore drill, and named owner before exposure.

## Evidence Archive Manifest

Archive manifest shape:

```json
{
  "archiveId": "giwa-evidence-YYYYMMDD",
  "createdAt": "ISO-8601",
  "environment": "staging-testnet",
  "tenantId": "tenant_public_label",
  "campaignId": "gasok-demo",
  "missionId": "first-mock-vault-deposit",
  "schemaMigrations": ["001_live_base"],
  "snapshotSha256": "<computed>",
  "containsRawEvidence": false,
  "redactionResult": "pass"
}
```

Archive contents:

- archive manifest
- signed manifest evidence
- canonical manifest payload
- manifest payload byte hex
- recovered signer
- `intentHash`
- canonical verifier input payload
- verifier input payload byte hex
- `verifierInputHash`
- component snapshot hashes
- receipt payload
- canonical receipt payload
- receipt payload byte hex
- `receiptHash`
- chain id `91342`
- GIWA Sepolia network name
- deployment metadata
- public approve/deposit transaction hashes
- standard RPC receipt status
- block number and block hash
- confirmation depth
- decoded log summary

## Public Snapshot Rule

Public snapshots are commit-safe only when:

- matched-only receipt gate passes
- standard RPC evidence is the final verifier source
- fast feedback is excluded from final confirmation
- `verifierInputHash` recomputes
- `receiptHash` recomputes
- public artifact scan passes
- no server-only values are present

## Sprint 18 Rehearsal Packet Retention

Sprint 18 partner rehearsal packets are operating artifacts. Store only sanitized packet outputs in shared documents:

- partner intake fields
- public run ids
- public wallet addresses
- public transaction hashes
- block numbers and block hashes
- `intentHash`
- `verifierInputHash`
- `receiptHash`
- snapshot paths and hashes
- bounded failure reasons
- partner feedback summary
- closeout recommendation

Raw local DB rows, raw local logs, browser local state, and credential values remain private and retention-bound. Public chain data cannot be removed by this app and must be disclosed before rehearsal starts.

## Sprint 19 Staging Archive Gate

Sprint 19 staging preparation records archive and retention gates in:

```text
docs/implementation/giwa-staging-storage-and-restore.md
docs/implementation/giwa-staging-blocker-register.md
```

Staging promotion remains blocked until these are assigned and evidenced:

- storage owner
- backup catalog owner
- restore drill owner
- retention owner
- archive manifest owner
- snapshot SHA-256 comparison result
- locked-state replay result
- public artifact scan result

Local SQLite rehearsal state is not hosted durable storage.

## Deletion Limitations

App-owned raw rows and derived exports can be deleted according to retention policy.

Public chain data cannot be deleted by the app. Partner beta closeout must state this limitation before pilot traffic begins.

## Linked Docs

- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-partner-beta-runbook.md`
- `docs/implementation/giwa-incident-response.md`

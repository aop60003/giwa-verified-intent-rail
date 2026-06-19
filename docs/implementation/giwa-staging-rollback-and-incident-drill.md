# GIWA Staging Rollback and Incident Drill

## Rollback Gate

Rollback is allowed only when:

- release artifact manifest exists
- prior artifact checksums are available
- rollback owner is named
- storage rollback limitation is recorded
- matched-only receipt gate remains active
- static fallback is available
- partner communications owner is named

Rollback cannot undo public chain evidence. It can only remove or replace app artifacts and lock new writes.

## Static Fallback Gate

Required GET-only surfaces:

- `/`
- `/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503`
- `/partner`
- `/partner-snapshot.json`

Fallback copy must say recorded GIWA Sepolia testnet evidence.

## Incident Drill Matrix

| Drill | Expected posture |
| --- | --- |
| stale server | do not stop unknown listener automatically; use operator-owned restart |
| stale DB | fail closed; use isolated state or approved restore |
| wrong receipt | lock receipt and export; quarantine artifact |
| unmatched decision | keep receipt locked; replay standard RPC evidence |
| timeout | keep non-terminal |
| RPC or explorer issue | mark readiness degraded; use static fallback |
| bad export | remove public link, recompute hashes, rescan |
| public artifact scan failure | stop sharing until regenerated and rescanned |

## Evidence Quarantine

Quarantine a public artifact when:

- it unlocks receipt content for a non-matched state
- snapshot hashes differ across docs and public paths
- receipt hash or verifier input hash does not recompute
- chain id is not GIWA Sepolia `91342`
- public artifact scan fails
- it includes unbounded provider text or local runtime material

Quarantine response:

1. Remove the share link from partner-facing docs.
2. Preserve the bad artifact path for incident review.
3. Recompute canonical hashes.
4. Regenerate from sanitized public fields only.
5. Rerun scans and snapshot hash checks.
6. Record owner, time window, and result.


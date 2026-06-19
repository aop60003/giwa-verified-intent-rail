# GIWA Partner Beta Rehearsal Runbook

## Scope

This runbook executes Sprint 18 Partner Beta Rehearsal for `GIWA Verified Intent Rail`.

Sprint 18 is a local partner rehearsal and evidence-acceptance sprint. It does not approve public hosting, staging deployment, external managed infrastructure, server-driven wallet actions, or chain-operation commands.

Supported rehearsal shape:

```text
one partner
one campaign
one mission
one GIWA Sepolia mock vault action
one matched-only receipt flow
one partner evidence packet
```

## Rehearsal Outputs

Sprint 18 produces and links:

```text
docs/implementation/giwa-partner-beta-rehearsal-runbook.md
docs/implementation/giwa-partner-beta-feedback-form.md
docs/implementation/giwa-partner-beta-closeout-report.md
docs/implementation/giwa-partner-beta-rehearsal-checklist.md
```

These documents are operating artifacts. They do not certify partner success until a real partner reviewer or operator records the result.

## Partner Intake Freeze

Record these fields before the rehearsal starts:

| Field | Required result |
| --- | --- |
| Partner name | recorded |
| Partner owner | recorded |
| Technical contact | recorded |
| Incident contact | recorded |
| Pilot window | recorded |
| Campaign id | one value |
| Mission id | one value |
| Referral, QR, or link metadata | recorded or explicitly absent |
| Expected traffic | bounded estimate |
| Rate-limit expectation | bounded estimate |
| Rehearsal date | recorded |
| Fallback path | static fallback path selected |
| Closeout date | recorded |

## Action Configuration Freeze

Record one action configuration:

| Field | Required result |
| --- | --- |
| Chain | GIWA Sepolia `91342` |
| Action | mock vault deposit |
| Target | contract address recorded |
| Selector | selector recorded |
| Mock token | contract address recorded |
| Amount | base-unit amount recorded |
| Spender | contract address recorded |
| Max allowance | base-unit allowance recorded |
| Expiry or TTL | recorded |

The browser wallet owns user signing. The server stores public transaction hashes and verifies standard RPC evidence only after the browser wallet returns those hashes.

## Kickoff Gate

Confirm before opening the reviewer flow:

- partner owner, operator, reviewer, and incident owner are named
- hosted ops runbook is acknowledged
- evidence retention policy is acknowledged
- incident response path is acknowledged
- receipt gate is understood as `matched` only
- fallback route is selected
- Sprint 18 scope is local rehearsal and documentation
- public hosting and staging deployment remain blocked
- no unsupported public positioning is requested

## Reviewer Opening Order

Use this URL order:

```text
1. http://127.0.0.1:4190/demo
2. http://127.0.0.1:4190/live
3. http://127.0.0.1:4190/api/receipts/<matchedReceiptHash>
4. http://127.0.0.1:4176/
5. http://127.0.0.1:4176/partner
6. http://127.0.0.1:4176/partner-snapshot.json
```

The dynamic receipt API is reviewed only after verifier status is `matched`. If live readiness, wallet state, faucet state, RPC state, DB state, or hosted policy blocks review, use the static fallback and label it as recorded GIWA Sepolia testnet evidence.

## Local Rehearsal Preflight

Check local listener ownership before trusting a running port:

```powershell
Get-NetTCPConnection -LocalPort 4190,4176 -State Listen
Get-Process -Id <OwningProcess>
```

Start a local rehearsal only with an isolated DB path:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-partner-beta-rehearsal.sqlite"
$env:PORT="4190"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Read-only live smoke:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/demo
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/readyz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/api/demo/status
```

Readiness responses must be bounded and redacted. They may show mode, check names, set/missing/invalid state, public address where derivable, chain id, format class, DB probe, backup freshness, queue status, and RPC status.

## Stale Server Response

Treat a server as stale or misbound when:

- `/demo` is missing
- `/live` serves an unexpected surface
- `/healthz` or `/readyz` does not match the intended local mode
- `/api/demo/status` points to old run state
- port ownership does not match the intended operator process
- live pages show inconsistent receipt or run state

Do not stop an unknown listener automatically. Switch to static fallback or ask the operator to restart with the intended `PORT` and `GIWA_LIVE_DB_PATH`.

## Stale DB Response

Use isolated local DB state for Sprint 18. Do not reuse older Sprint DBs unless the maintainer explicitly selects them.

Fail the rehearsal and restart with a fresh DB path when:

- old matched rows hide current readiness or schema issues
- schema compatibility fails closed
- DB writes fail
- receipt state cannot be traced to the selected DB
- snapshot export points to a different live run

Sprint 18 does not run migrations or silently repair DB state.

## Human-Owned Wallet Actions

Live rehearsal steps:

1. Connect browser wallet.
2. Confirm GIWA Sepolia chain id `91342`.
3. Issue the signed manifest preview.
4. Review target, selector, asset, amount, spender, max allowance, expiry, and intent hash.
5. Submit approve and deposit from the wallet app.
6. Select `Verify receipt`.
7. Open the displayed dynamic receipt API after `matched`.

The server and scripts must not ask for wallet signing material and must not send approve or deposit transactions.

## Live Demo Operator Checklist

Before partner review:

- `/demo` opens
- `/live` opens
- `/healthz` returns bounded liveness
- `/readyz` returns redacted readiness
- `/api/demo/status` is consistent with the selected rehearsal state
- connected wallet uses GIWA Sepolia `91342`
- manifest preview shows target, selector, asset, amount, spender, max allowance, expiry, and intent hash
- approve transaction hash is public when present
- deposit transaction hash is public when present
- `Verify receipt` runs only after deposit transaction hash exists
- receipt stays locked until verifier `matched`

## Evidence Packet Acceptance

Accept the partner evidence packet only when these public fields are present and consistent:

- run id
- wallet public address
- approve transaction hash when present
- deposit transaction hash
- standard RPC receipt status
- block number
- block hash
- confirmation depth
- `intentHash`
- `verifierInputHash`
- `receiptHash`
- canonical manifest payload reference
- canonical verifier input payload reference
- canonical receipt payload reference
- live snapshot path when a live matched run is selected
- static partner snapshot path when recorded fallback is selected

Static `partner-snapshot.json` is recorded fallback evidence. Do not describe it as fresh live evidence.

## Dynamic Receipt Verification Checklist

Dynamic receipt review passes only when:

- run status is `matched`
- verifier decision is `matched`
- failure reason is absent
- receipt hash matches stored decision receipt hash
- intent hash links run, decision, and receipt
- receipt payload parses as JSON
- chain id is `91342`
- standard RPC receipt evidence is the final source
- `verifierInputHash` recomputes
- `receiptHash` recomputes
- Flashblocks appears only as non-final feedback

Reject the packet when state is pending, timeout, mismatched, failed, missing decision, missing receipt, receipt/decision mismatch, replay mismatch, malformed public JSON, or non-recomputable hash evidence.

## Snapshot Consistency Check

For the selected fresh live rehearsal snapshot:

```powershell
Get-FileHash docs\evidence\live-demo-sprint12-snapshot.json -Algorithm SHA256
Get-FileHash apps\web\public\live-demo-snapshot.json -Algorithm SHA256
```

The expected current fresh rehearsal snapshot hash is:

```text
E6EDD7A6032FB4B7ABDF68AFFB2DC16CA5A306215D73594A273514FAF32059D6
```

If hashes differ, do not share the packet.

## Static Fallback Verification Checklist

Start static server when needed:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
```

Verify:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner-snapshot.json
```

Optional recorded receipt route:

```text
http://127.0.0.1:4176/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503
```

Fallback copy must say recorded GIWA Sepolia testnet evidence, not fresh live run.

## Public Artifact Boundary

Allowed in partner packet:

- public wallet address
- public transaction hashes
- block number and block hash
- `intentHash`
- `verifierInputHash`
- `receiptHash`
- bounded verifier decision
- public snapshot paths
- replay/recompute status

Blocked data classes:

- real environment file contents
- credential values
- tokenized URLs
- raw auth headers
- raw request bodies
- browser local state
- wallet signing material
- server-only config values
- unbounded provider errors

Use only this partner-facing frame:

```text
manifest-matched GIWA Sepolia testnet action evidence
mock testnet deposit metrics
Flashblocks fast non-final feedback
read-only verified state where available
```

## Incident and Fallback Drill

| Drill | Expected response |
| --- | --- |
| Stale server | Use `/api/demo/status`, `/healthz`, and `/readyz`; do not stop unknown process automatically; restart only with operator intent. |
| Stale DB | Use isolated DB; if old rows hide readiness or schema state, fail rehearsal and restart with a fresh DB path. |
| Unknown receipt | Return locked or not found; do not create synthetic receipt or export. |
| Wrong receipt | Lock live path, receipt, and export; quarantine artifact; recompute hashes; rescan before sharing. |
| Unmatched decision | Keep receipt locked; group bounded failure reasons; replay standard RPC evidence. |
| Timeout | Keep non-terminal; do not issue receipt from timeout state. |
| RPC or explorer issue | Mark readiness degraded; block verification/export; use recorded static fallback. |
| Static fallback | Open `/`, `/receipt/<recordedHash>`, `/partner`, and `/partner-snapshot.json`; label as recorded testnet evidence. |
| Read-only fallback | Allow safe GETs only; block writes, verification POSTs, export, wallet action, and chain-operation commands. |

## Incident Packet Fields

Capture only public or redacted fields:

- incident id
- severity
- affected mode
- request ids
- run ids
- receipt hashes
- transaction hashes
- block number and block hash
- bounded failure reason
- redacted readiness state
- artifact paths and hashes
- owner and time window

## Sprint 19 Staging Readiness Blockers

Sprint 19 does not begin until these blockers have owners and green evidence:

| Blocker | Required before Sprint 19 |
| --- | --- |
| Source provenance | git-backed workspace and protected CI path |
| Artifact promotion | checksum manifest with no rebuild between stages |
| Host policy | approved host, owner, origin policy, rollback path |
| Credential distribution | role-separated activation and rotation process |
| Auth and tenant isolation | fail-closed hosted mode |
| Request safety | body limits, bounded errors, rate limits |
| Storage | isolated durable state or approved staging adapter |
| Migration guard | fail-closed incompatible schemas |
| Backup/restore | backup catalog and restore drill evidence |
| Observability | request ids, redacted readiness, low-cardinality metrics, alert owners |
| Incident readiness | named owner and fallback drill pass |
| Partner signoff | intake, evidence packet acceptance, feedback, closeout |

Current workspace note:

```powershell
Test-Path .git
Test-Path .github
```

Both values can be `False` in the current prototype workspace, so CI provenance and artifact promotion remain blocked.

## Sprint 18 Exit Gate

Sprint 18 rehearsal documentation is ready when:

- partner intake fields are present
- kickoff gate is defined
- reviewer opening order is documented
- local live preflight is documented
- stale server and stale DB response is documented
- evidence packet acceptance is documented
- dynamic receipt checklist is documented
- static fallback checklist is documented
- incident and fallback drill is documented
- feedback form is linked
- closeout report template is linked
- Sprint 19 blockers are listed
- public hosting and staging deployment remain blocked
- no fake partner feedback, fake evidence, or fake success is recorded

## Linked Sprint 18 Documents

- `docs/implementation/giwa-partner-beta-feedback-form.md`
- `docs/implementation/giwa-partner-beta-closeout-report.md`
- `docs/implementation/giwa-partner-beta-rehearsal-checklist.md`

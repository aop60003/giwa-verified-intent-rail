# GIWA Partner Beta Rehearsal Closeout Report

## Status

This report is a Sprint 18 closeout template. Fill it only after a real partner beta rehearsal or operator-led dry run. Do not fabricate partner feedback, evidence, or rehearsal success.

## Scope

- Partner:
- Campaign:
- Mission:
- Pilot window:
- Rehearsal date:
- Action:
- Operator:
- Reviewer:
- Incident owner:

Required scope confirmation:

```text
one partner
one campaign
one mission
one GIWA Sepolia mock vault action
one matched-only receipt flow
one partner evidence packet
```

## Opening Order Result

| Surface | Result | Evidence or note |
| --- | --- | --- |
| `http://127.0.0.1:4190/demo` |  |  |
| `http://127.0.0.1:4190/live` |  |  |
| `http://127.0.0.1:4190/api/receipts/<matchedReceiptHash>` |  |  |
| `http://127.0.0.1:4176/` |  |  |
| `http://127.0.0.1:4176/partner` |  |  |
| `http://127.0.0.1:4176/partner-snapshot.json` |  |  |

## Funnel Closeout

| Funnel step | Count or result | Note |
| --- | --- | --- |
| Entry opened |  |  |
| Wallet connected |  |  |
| GIWA readiness passed |  |  |
| Intent preview viewed |  |  |
| Manifest accepted |  |  |
| Approve submitted |  |  |
| Deposit submitted |  |  |
| Block confirmation observed |  |  |
| Verifier decision reached |  |  |
| Receipt issued |  |  |

## Evidence Quality

| Evidence field | Value or result | Acceptance |
| --- | --- | --- |
| Run id |  |  |
| Wallet public address |  |  |
| `intentHash` |  |  |
| `approveTxHash` |  |  |
| `depositTxHash` |  |  |
| Block number |  |  |
| Block hash |  |  |
| Verifier status |  |  |
| `verifierInputHash` |  |  |
| `receiptHash` |  |  |
| Replay/recompute result |  |  |
| Dynamic receipt API |  |  |
| Snapshot/export result |  |  |

Acceptance rule:

```text
Accept only when run status and verifier decision are matched, standard RPC evidence is the final source, and receipt hashes recompute.
```

## Snapshot Consistency

| Snapshot | Path | SHA-256 |
| --- | --- | --- |
| Docs live snapshot | `docs/evidence/live-demo-sprint12-snapshot.json` |  |
| Public live snapshot | `apps/web/public/live-demo-snapshot.json` |  |
| Static partner snapshot | `apps/web/public/partner-snapshot.json` | recorded fallback only |

Known fresh rehearsal hash for the current selected live snapshot:

```text
E6EDD7A6032FB4B7ABDF68AFFB2DC16CA5A306215D73594A273514FAF32059D6
```

## Failure Summary

| Failure class | Observed | Count or note |
| --- | --- | --- |
| wrong chain |  |  |
| no test token |  |  |
| rejected wallet action |  |  |
| timeout |  |  |
| mismatch |  |  |
| failed transaction |  |  |
| rate limited |  |  |
| bounded API error |  |  |
| unknown receipt |  |  |
| stale server |  |  |
| stale DB |  |  |
| public artifact scan failure |  |  |

## Incident and Fallback Drill Result

| Drill | Result | Evidence or note |
| --- | --- | --- |
| Stale server response |  |  |
| Stale DB response |  |  |
| Unknown receipt response |  |  |
| Unmatched decision response |  |  |
| RPC or explorer issue response |  |  |
| Read-only fallback response |  |  |
| Static fallback labeling |  |  |

Incident packet path, if used:

```text
<path recorded after real incident drill>
```

## Partner Feedback Summary

- Main value understood:
- Main confusion:
- Evidence field requests:
- Export requests:
- Copy changes requested:
- Unsupported requests:
- Partner recommendation:

## Public Artifact Boundary Result

Confirm before sharing:

- public wallet and transaction evidence only:
- block fields only:
- hash fields only:
- bounded verifier decision only:
- public snapshot paths only:
- no raw environment content:
- no credential values:
- no tokenized URLs:
- no raw auth headers:
- no raw request bodies:
- no browser local state:
- no wallet signing material:
- no server-only config values:

## Sprint 19 Staging Blockers

| Blocker | Current status | Required owner |
| --- | --- | --- |
| git-backed workspace | blocked in current prototype mode |  |
| protected CI path | blocked in current prototype mode |  |
| source provenance | blocked until git-backed release path |  |
| artifact checksum manifest |  |  |
| no-rebuild promotion process |  |  |
| approved host and owner |  |  |
| exact origin policy |  |  |
| hosted auth and tenant isolation |  |  |
| request body and rate limits |  |  |
| bounded error responses |  |  |
| redacted logs and readiness |  |  |
| durable storage or approved adapter |  |  |
| migration guard |  |  |
| backup catalog and restore drill |  |  |
| retention owner |  |  |
| incident owner |  |  |
| partner signoff |  |  |

## Recommendation

Choose one:

- repeat campaign:
- second testnet action template:
- export improvement:
- stop:

## Safety Confirmations

- no public hosting performed:
- no staging deployment performed:
- no external managed infrastructure connected:
- no server/script wallet transaction sent:
- no deploy command run:
- no funding command run:
- no anchoring command run:
- no verifier-chain command run:
- no mint command run:
- no dependency installation performed:
- no real environment file content printed:
- no fake partner feedback recorded:
- no fake evidence recorded:
- no fake rehearsal success recorded:

## Sprint 18 Exit Approval

```text
Sprint 18 exit approval:
approvedBy=<user or role>
approvedAt=<YYYY-MM-DD>
evidencePath=docs/implementation/giwa-partner-beta-closeout-report.md
nextSprint=docs/superpowers/plans/2026-06-19-sprint-19-staging-deployment-preparation.md
```

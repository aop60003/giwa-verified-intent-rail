# GIWA Incident Response

## Scope

This runbook covers Sprint 17 incident response for `GIWA Verified Intent Rail` hosted operations and partner beta readiness.

It applies to local rehearsal, staging-testnet, and managed `prod-testnet` GIWA Sepolia beta modes. It does not authorize deployment, chain operations, or public hosting.

## Severity Matrix

| Severity | Trigger | Immediate posture |
| --- | --- | --- |
| P0 | Secret exposure, wrong-chain acceptance, receipt opens for bad evidence, public export leak | Stop live path, lock receipts/exports, rotate or retire affected role, use static fallback only |
| P1 | Verifier mismatch spike, RPC outage, faucet exhaustion, hosted gate regression | Read-only mode, queue or hold verification, preserve evidence, investigate before retry |
| P2 | Stale static fallback, unclear readiness copy, isolated failed export before distribution | Fix docs or artifacts, regenerate safe outputs, add checks |

## Key Exposure Response

Treat suspected credential exposure as P0.

Immediate actions:

1. Stop live manifest issuance.
2. Stop verification fanout.
3. Stop snapshot export.
4. Stop hosted or staging promotion.
5. Rotate the affected role only after identifying its boundary.
6. Revoke the old credential after the overlap window.
7. Invalidate manifests signed by an exposed campaign signer unless verifier policy explicitly accepts that key id.
8. Regenerate public artifacts only after public artifact scans pass.

Distinct roles:

- deployer
- campaign signer
- verifier operator
- intent submitter
- demo wallet
- partner API credential
- RPC credential
- DB migration role
- backup/restore role
- observability credential

If verifier/operator authority cannot rotate in-place, retire that rail for future live runs and require a fresh approved testnet deployment in a later sprint.

## Wrong Chain Response

Wrong-chain acceptance is P0 if receipt or partner success state opens from it.

Response:

1. Lock wallet actions and receipts.
2. Invalidate the run manifest.
3. Require GIWA Sepolia chain id `91342`.
4. Verify EIP-712 domain and deployed `IntentRail`.
5. Keep receipt locked until standard RPC evidence is replayed.
6. Keep static fallback available as recorded evidence.
7. Record affected run ids and receipt hashes in the incident packet.

## Bad Evidence Export Response

Bad evidence export includes leaked server-only values, hash mismatch, missing canonical payloads, or success rows that are not gate-passed.

Response:

1. Quarantine the artifact.
2. Remove public links to the artifact.
3. Recompute `intentHash`, `verifierInputHash`, and `receiptHash`.
4. Confirm matched-only receipt gate.
5. Regenerate from sanitized public fields only.
6. Compare snapshot file hashes.
7. Run public artifact scans before sharing again.

## Verifier Mismatch Spike Response

Response:

1. Pause verifier fanout.
2. Keep receipts locked.
3. Group failures by bounded failure reason.
4. Replay standard RPC evidence.
5. Check signer, EIP-712 domain, deployment address, chain id, expiry, amount, spender, allowance, and log contract address.
6. Keep `timeout` non-terminal.
7. Resume only after the mismatch cause is understood and documented.

## RPC Outage and Faucet Exhaustion Response

Response:

1. Mark readiness degraded.
2. Block final verification/export.
3. Keep runs pending or timeout.
4. Use recorded static fallback for review.
5. Record faucet or RPC attempts without exposing credentials.
6. Do not substitute personal or production wallets.
7. Do not use fast feedback as final confirmation.

## Read-Only Fallback Mode

Enter read-only mode for:

- credential suspicion
- RPC outage
- faucet exhaustion
- verifier mismatch spike
- bad export
- hosted gate failure

Allowed:

- static demo GETs
- partner snapshot GETs
- known matched fixture receipt GETs
- health/readiness GETs with redacted output

Blocked:

- run creation
- intent submission
- evidence writes
- verification POSTs
- snapshot export
- wallet execution
- chain-operation commands

Fallback copy must say recorded GIWA Sepolia testnet evidence, not fresh live run.

## Sprint 18 Rehearsal Drill

During partner beta rehearsal, run or table-drill these cases:

- stale server
- stale DB
- unknown receipt
- unmatched decision
- timeout
- RPC or explorer issue
- read-only fallback
- static fallback labeling

Each drill records only public or redacted fields in the incident packet. The live path, receipt route, and export stay locked when verifier status is not `matched`.

## Sprint 19 Staging Incident Drill

Sprint 19 staging preparation records rollback and incident gates in:

```text
docs/implementation/giwa-staging-rollback-and-incident-drill.md
docs/implementation/giwa-staging-observability.md
```

Before staging dry run, table-drill:

- stale server
- stale DB
- red `/readyz`
- receipt gate violation
- wrong chain
- verifier timeout spike
- DB write failure
- auth bypass suspicion
- backup stale
- bad export
- log redaction failure

No drill may require wallet action, chain-operation command, dependency installation, public host binding, managed infrastructure connection, or raw local configuration output.

## Postmortem Template

```markdown
## Incident <id>

- Severity:
- Owner:
- Status:
- Time window:
- Affected mode:
- Summary:
- Reviewer or partner impact:
- Detection source:
- Timeline:
- Root cause:
- Contributing factors:
- Evidence affected:
- Mitigation:
- Current guard state:
- Follow-up actions:
- Safety confirmations:
```

Safety confirmations:

- no real env content printed
- no server/script wallet transaction sent
- no fast feedback final-confirmation claim
- matched-only receipt gate preserved
- public artifacts rescanned

## Incident Evidence Packet

Capture only public or redacted fields:

- incident id
- severity
- affected mode
- request ids
- run ids
- receipt hashes
- transaction hashes
- block numbers and block hashes
- bounded failure reasons
- redacted readiness state
- artifact paths and hashes
- owner and time window

Do not include raw env values, credential values, auth headers, raw request bodies, stack traces, or provider strings that include credentials.

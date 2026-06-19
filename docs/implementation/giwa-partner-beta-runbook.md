# GIWA Partner Beta Runbook

## Scope

This runbook prepares a controlled partner beta for `GIWA Verified Intent Rail`.

Sprint 17 does not start partner traffic. It defines intake, kickoff, rehearsal, reviewer flow, closeout, success metrics, and stop conditions for a later approved beta.

Supported beta shape:

```text
one partner
one campaign
one mission
one GIWA Sepolia mock vault action
one matched-only receipt flow
one partner evidence packet
```

## Partner Intake Checklist

Collect and review:

- partner name
- campaign owner
- technical contact
- incident contact
- pilot window
- campaign id
- mission id
- referral, QR, or link metadata
- expected traffic
- rate limit expectations
- rehearsal date
- fallback path
- closeout date

Action configuration:

- GIWA Sepolia chain id `91342`
- mock vault target
- selector
- mock token
- amount
- spender
- max allowance
- manifest expiry or TTL

Safety review:

- testnet-only mock action evidence copy approved
- wallet-owned execution explained
- public wallet and transaction evidence accepted
- no server-side wallet custody
- no public copy outside the MVP boundary
- no request for wallet or env secrets

## Pilot Kickoff

Use the pilot frame:

```text
Manifest-Matched Activation Evidence Pilot
```

Kickoff agenda:

1. Confirm partner, campaign, mission, and action configuration.
2. Confirm GIWA Sepolia `91342` and mock vault action.
3. Confirm roles: partner owner, operator, reviewer, incident owner.
4. Confirm rehearsal window, live testnet window, fallback path, and closeout date.
5. Confirm release gate status from `docs/implementation/giwa-hosted-ops-runbook.md`.
6. Confirm retention policy from `docs/implementation/giwa-evidence-retention-policy.md`.
7. Confirm incident path from `docs/implementation/giwa-incident-response.md`.
8. Confirm customer-facing limitations.

## Reviewer Opening Order

Use this order when the local or staged reviewer surface is available:

```text
1. /demo control room
2. /live fresh wallet-run path
3. /api/receipts/<matchedReceiptHash> after matched receipt exists
4. / static fallback
5. /partner evidence packet
6. /partner-snapshot.json static snapshot
```

If live state, wallet readiness, faucet state, RPC readiness, DB readiness, or hosted policy blocks review, switch to the static fallback and label it as recorded GIWA Sepolia testnet evidence.

## Fresh Rehearsal Gate

Before a partner-facing beta rehearsal:

- use isolated staging state or an isolated local DB path
- confirm `/healthz` and `/readyz` are redacted
- confirm receipt gate opens only for `matched`
- confirm standard RPC evidence is replayable
- confirm `verifierInputHash` and `receiptHash` recompute
- confirm signer recovery is represented in evidence
- confirm snapshot export is public-artifact safe
- confirm static fallback works
- confirm public surfaces do not expose server-only values
- confirm no server or script sends wallet actions

Stop rehearsal if:

- receipt opens before verifier match
- fast feedback is treated as final confirmation
- any flow asks for wallet or env secrets
- scope expands beyond one partner, one campaign, one mission, and one mock vault action

## Sprint 18 Partner Beta Rehearsal

Sprint 18 executes the partner beta rehearsal package without starting public traffic or staging deployment.

Use:

```text
docs/implementation/giwa-partner-beta-rehearsal-runbook.md
docs/implementation/giwa-partner-beta-rehearsal-checklist.md
docs/implementation/giwa-partner-beta-feedback-form.md
docs/implementation/giwa-partner-beta-closeout-report.md
```

Required rehearsal order:

```text
1. /demo control room
2. /live fresh wallet-run path
3. /api/receipts/<matchedReceiptHash> after matched receipt exists
4. / static fallback
5. /partner evidence packet
6. /partner-snapshot.json static snapshot
```

If the live path is blocked by wallet readiness, faucet state, RPC state, DB state, stale server state, or hosted policy, switch to the recorded static fallback and label it as recorded GIWA Sepolia testnet evidence.

## Static Fallback Route

Recorded fallback:

```text
/
/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503
/partner
/partner-snapshot.json
```

Fallback copy must describe recorded GIWA Sepolia testnet evidence, not a fresh live run.

## Partner Closeout Report

Use this structure:

```markdown
# Partner Beta Closeout

## Scope

- Partner:
- Campaign:
- Mission:
- Pilot window:
- Action:

## Funnel

- Entry opened:
- Wallet connected:
- GIWA readiness passed:
- Intent preview viewed:
- Manifest accepted:
- Approve submitted:
- Deposit submitted:
- Block confirmation observed:
- Verifier decision reached:
- Receipt issued:

## Evidence Quality

- `intentHash`:
- `depositTxHash`:
- block evidence:
- verifier status:
- `verifierInputHash`:
- `receiptHash`:
- replay/recompute status:

## Failure Summary

- wrong chain:
- no test token:
- rejected wallet action:
- timeout:
- mismatch:
- failed transaction:
- rate limited:
- bounded API error:

## Recommendation

- repeat campaign
- second testnet action template
- export improvement
- stop
```

## Success Metrics

- Receipt issued only after verifier status `matched`.
- Matched transaction rate over submitted deposit count.
- Zero receipts for pending, timeout, mismatched, failed, or unknown states.
- Zero secret/env exposure in public artifacts.
- Partner can explain participation versus manifest-matched testnet action evidence.
- Partner requests a repeat pilot or next testnet action without asking for unsupported claims.

## Customer-Facing Limitations

- GIWA Sepolia testnet mock vault action only.
- Receipt is manifest-matched action evidence.
- Flashblocks is fast non-final feedback.
- Standard RPC confirmation plus verifier match controls receipt unlock.
- Optional verified-state context is read-only context.
- Public chain data cannot be deleted by the app.

## Non-Goals

- quest marketplace
- dashboard-first SaaS
- wallet firewall
- phishing-prevention product
- identity or eligibility decisioning
- mainnet launch
- self-serve billing
- custody
- multi-campaign product surface

## Stop Conditions

Stop partner beta if:

- partner requires mainnet or production finance positioning
- partner requires identity, eligibility, or safety guarantee positioning
- partner asks to treat fast feedback as final confirmation
- public hosting lacks auth, tenant isolation, exact origin policy, request/rate limits, redacted logs, durable storage, backup/restore, and an operational owner
- evidence export cannot pass public artifact scans
- live receipt gate opens for any state other than `matched`
- scope expands before a later approved launch gate

## Linked Docs

- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-partner-beta-rehearsal-checklist.md`
- `docs/implementation/giwa-partner-beta-feedback-form.md`
- `docs/implementation/giwa-partner-beta-closeout-report.md`
- `docs/implementation/giwa-incident-response.md`
- `docs/implementation/giwa-evidence-retention-policy.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`

## Sprint 33 Billing-Lock Boundary

Sprint 33 can rehearse controls and review the evidence packet locally, but partner beta traffic must wait for protected CI or an explicitly approved substitute source-control policy.

Partner-facing wording must stay within:

```text
GIWA Sepolia testnet mock vault action evidence
manifest-matched receipt after standard RPC confirmation and verifier match
Flashblocks as non-final fast feedback only
```

Do not describe Sprint 33 as a public beta, staging launch, production finance surface, identity service, phishing-prevention service, or safety warranty.

## Sprint 34 Hosted Adapter Readiness Boundary

Sprint 34 can explain that hosted adapter readiness is being prepared, but partner beta traffic remains blocked:

```text
hostedAdapterReadiness=prepared
partnerBetaTraffic=blocked
protectedCI=blocked-billing-lock
```

Do not ask a partner to use a public hosted surface until protected CI, adapter implementation approval, storage/restore evidence, auth/tenant/origin gates, incident owner, retention owner, and partner signoff are recorded.

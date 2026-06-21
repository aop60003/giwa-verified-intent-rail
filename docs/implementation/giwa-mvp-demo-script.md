# GIWA Verified Intent Rail Demo Script

Use this script for the final submission demo. Open the local `/demo` control room first when the local live server is running, then use the fresh live path and static path as separate review surfaces.

Commercial UX polish is implemented from:

```text
docs/superpowers/plans/2026-06-19-sprint-16-commercial-ux-polish.md
```

Open the local `/demo` control room first when the local live server is running. If the local live server is unavailable, continue with the fresh live path or recorded static fallback below.

## Opening

Open the local demo control room first:

```text
http://127.0.0.1:4190/demo
```

Then open the fresh live flow:

```text
http://127.0.0.1:4190/live
```

Narration:

```text
GIWA Verified Intent Rail shows one GIWA Sepolia mock vault action from a wallet-bound signed manifest through browser-wallet execution, standard RPC evidence, verifier match, and a dynamic receipt.
```

When using the pre-seeded Sprint 12 live DB, open the dynamic receipt API after confirming the run is `matched`:

```text
http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
```

The static fallback remains available at:

```text
http://127.0.0.1:4176/
```

## Guided Flow

1. Review the mission card.
   - Confirm campaign `gasok-demo`.
   - Confirm mission `first-mock-vault-deposit`.
   - Confirm chain `GIWA Sepolia`, chain id `91342`.

2. Review the manifest.
   - Show target, selector, asset, amount, spender, max allowance, and intent hash.
   - Explain that the action is bounded before wallet execution.

3. Inspect wallet actions.
   - Show approve transaction hash.
   - Show deposit transaction hash.
   - State that the demo wallet action was sent from a wallet app, not from a private key in the browser.

4. Show status rail.
   - Fast feedback is non-final.
   - Standard RPC receipt status and block data are the confirmation source.
   - Verifier matched only after comparing the signed manifest and confirmed chain evidence.

5. Open the recorded static fallback receipt route:

```text
http://127.0.0.1:4176/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503
```

6. Show the receipt values.
   - Receipt hash: `0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503`
   - Decision transaction: `0x2eb0cd03c3b71fb53664cf9364916453c442de8c05f5b436f3537414636f85df`
   - Deposit transaction: `0xd25a4f064d15aba1fb108a2db08dc673932314c42507db5b7f9162e0a0126886`

## Partner Console

Open the partner proof console:

```text
http://127.0.0.1:4176/partner
```

Show:

- KPI summary for the one mock testnet run.
- Receipt, decision transaction, and deposit transaction links.
- Standard RPC confirmation card.
- Manifest signer and recovered signer match.
- Decoded log summary.
- JSON snapshot export.

Download or open:

```text
http://127.0.0.1:4176/partner-snapshot.json
```

## Live Demo Path

Use this path when a browser wallet and GIWA Sepolia testnet state are available.

Start the live server with the final fresh rehearsal DB path:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:PORT="4190"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
http://127.0.0.1:4190/live
```

Narration:

```text
This live path issues a wallet-bound signed manifest, lets the browser wallet submit approve and deposit, then verifies the public deposit transaction through standard RPC before unlocking a dynamic receipt.
```

Demo steps:

1. Connect a browser wallet.
2. Confirm GIWA Sepolia chain id `91342`.
3. Issue the signed manifest preview.
4. Review target, selector, asset, amount, spender, max allowance, expiry, and intent hash.
5. Submit approve and deposit from the wallet app.
6. Select `Verify receipt`.
7. When the status is `matched`, open the displayed dynamic receipt API path.

These wallet steps are operator-only for a live rehearsal. A partner/customer reviewer should not be asked to connect a wallet or submit approve/deposit transactions unless a separate live rehearsal has been explicitly approved.

Fresh rehearsal evidence:

```text
Run id:       0x67c754c6e4582cb6b1c574c21e2ea4fe034691de80e7512223fe338aee40a88d
Approve tx:   0xdac977c324239faf5e4560c6b137b6d6954d2490b85dd83690ba7a39f430774b
Deposit tx:   0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30
Receipt hash: 0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
```

Export a live snapshot only after `matched`:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:GIWA_LIVE_URL="http://127.0.0.1:4190/live"
pnpm --filter @giwa/web --fail-if-no-match export:live-demo
```

Live snapshot outputs:

```text
docs/evidence/live-demo-sprint12-snapshot.json
apps/web/public/live-demo-snapshot.json
```

## Evidence Close

Point to the source evidence:

```text
docs/evidence/giwa-sepolia-mvp-evidence.json
packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json
apps/web/public/partner-snapshot.json
docs/evidence/live-demo-sprint12-snapshot.json
docs/evidence/staging-readiness-sprint38-handoff.json
docs/evidence/commercial-readiness-sprint39-final-handoff.json
docs/evidence/commercial-readiness-sprint40-freeze.json
docs/evidence/partner-customer-handoff-sprint41.json
docs/evidence/hosted-adapter-commercial-boundary-sprint42.json
docs/evidence/staging-handoff-sprint43-external-blockers.json
docs/evidence/bounded-failure-redaction-sprint45.json
docs/evidence/public-boundary-final-hardening-sprint46.json
docs/implementation/giwa-partner-customer-handoff-package.md
docs/implementation/giwa-external-blocker-monitoring-and-staging-handoff.md
```

Close with:

```text
This MVP is a testnet-only mock action evidence rail. It demonstrates the local GIWA Sepolia testnet evidence path for the manifest, wallet action, standard RPC confirmation, verifier decision, and receipt route for one GIWA Sepolia flow.
```

## Hosted Ops and Partner Beta Note

Sprint 17 hosted ops documents are linked from:

```text
docs/implementation/giwa-hosted-ops-runbook.md
docs/implementation/giwa-partner-beta-runbook.md
docs/implementation/giwa-incident-response.md
docs/implementation/giwa-evidence-retention-policy.md
```

For a controlled partner beta rehearsal, use this reviewer opening order:

```text
1. /demo control room
2. /live fresh wallet-run path
3. /api/receipts/<matchedReceiptHash> after matched receipt exists
4. / static fallback
5. /partner evidence packet
6. /partner-snapshot.json static snapshot
```

The partner beta runbook keeps the pilot to one partner, one campaign, one mission, one GIWA Sepolia mock vault action, one matched-only receipt flow, and one evidence packet.

## Sprint 18 Partner Rehearsal Close

Use the Sprint 18 rehearsal package when a reviewer or partner needs a structured dry run:

```text
docs/implementation/giwa-partner-beta-rehearsal-runbook.md
docs/implementation/giwa-partner-beta-rehearsal-checklist.md
docs/implementation/giwa-partner-beta-feedback-form.md
docs/implementation/giwa-partner-beta-closeout-report.md
```

Close the rehearsal by recording only observed results: which local URLs opened, whether the matched receipt was accepted, which fallback drill was run, and whether Sprint 19 staging blockers remain open.

## Sprint 39 Partner Handoff Close

The partner-facing packet is local-advisory:

```text
docs/implementation/giwa-commercial-hardening-and-partner-handoff-final-readiness.md
docs/evidence/commercial-readiness-sprint39-final-handoff.json
```

Partner or reviewer signoff confirms review of the local-advisory packet only. It is not release approval, staging approval, public-hosting approval, protected-CI approval, or authorization for partner traffic.

## Sprint 40 Local Freeze Close

Sprint 40 remains the local readiness freeze input:

```text
docs/implementation/giwa-external-only-blocker-handoff-and-staging-readiness-freeze.md
docs/evidence/commercial-readiness-sprint40-freeze.json
```

Open `/demo` before `/live`. Keep the live receipt hash `0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8` separate from the static fallback receipt hash `0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503`. Sprint 40 is local-advisory only and does not authorize protected CI provenance, public hosting, staging execution, managed infrastructure, partner traffic, or release approval.

## Sprint 41 Partner Customer Handoff Close

Use Sprint 41 as the partner/customer package, then use Sprint 43 for the current stop condition:

```text
docs/implementation/giwa-partner-customer-handoff-package.md
docs/evidence/partner-customer-handoff-sprint41.json
```

State the boundary plainly: the package is local-advisory and partner review-ready, but commercial readiness, staging dry-run execution, protected CI provenance, protected artifact metadata, public hosting, managed infrastructure, release approval, and real partner/customer signoff remain blocked. The live `0x057b...74be8` receipt is the fresh local rehearsal receipt, and the static `0x710c...1503` receipt is the recorded fallback receipt.

## Sprint 43 External Blocker Handoff Close

Use Sprint 43 as the current stop condition:

```text
docs/implementation/giwa-external-blocker-monitoring-and-staging-handoff.md
docs/evidence/staging-handoff-sprint43-external-blockers.json
```

Close by stating that the safe internal handoff is frozen at local-advisory authority. Protected CI, protected artifact metadata, branch-protection satisfaction, partner/customer signoff, public hosting approval, managed infrastructure approval, release approval, and staging dry-run execution remain blocked until a real external blocker state change is recorded.

## Sprint 45 Local Hardening Close

Use Sprint 45 as the latest local-advisory quality note:

```text
docs/evidence/bounded-failure-redaction-sprint45.json
```

State that Sprint 45 tightened bounded verifier failure redaction, hosted request safety, public artifact credential-marker scans, telemetry redaction, retained snapshot replay-boundary labeling, and recorded wallet evidence copy. It does not alter the external blocker state or authorize protected CI, public hosting, staging execution, managed infrastructure, partner traffic, or release approval.

## Sprint 46 Public Boundary Close

Use Sprint 46 as the latest local-advisory public boundary note:

```text
docs/evidence/public-boundary-final-hardening-sprint46.json
```

State that Sprint 46 tightened legacy verifier failure read-path redaction, readiness category labels, public evidence JSON scanning, standard RPC block evidence wording, and historical chain-operation reference boundaries. It does not alter the external blocker state or authorize protected CI, public hosting, staging execution, managed infrastructure, partner traffic, wallet actions, chain-operation package commands, or release approval.

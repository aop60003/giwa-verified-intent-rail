# GIWA Verified Intent Rail Submission Evidence

This document maps the final MVP to the submission artifacts.

## What To Open First

1. Demo control room: `http://127.0.0.1:4190/demo`
2. Fresh live flow: `http://127.0.0.1:4190/live`
3. Dynamic receipt API after `matched`: `http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8`
4. Static fallback: `http://127.0.0.1:4176/`
5. Partner console: `http://127.0.0.1:4176/partner`
6. Static snapshot: `http://127.0.0.1:4176/partner-snapshot.json`

## Artifact Map

| Artifact | Path |
| --- | --- |
| Final MVP evidence | `docs/evidence/giwa-sepolia-mvp-evidence.json` |
| Chain anchor evidence | `docs/evidence/giwa-sepolia-chain-anchor.json` |
| Chain fixture | `packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json` |
| Deployment JSON | `apps/web/src/generated/deployment.json` |
| Guided flow data | `apps/web/public/flow-data.json` |
| Partner snapshot | `apps/web/public/partner-snapshot.json` |
| Live demo snapshot schema | `docs/evidence/live-demo-sprint12-snapshot.schema.md` |
| Live demo snapshot evidence | `docs/evidence/live-demo-sprint12-snapshot.json` |
| Live demo public snapshot | `apps/web/public/live-demo-snapshot.json` |
| Commercial readiness design | `docs/superpowers/specs/2026-06-19-giwa-commercial-readiness-design.md` |
| Sprint 13 plan | `docs/superpowers/plans/2026-06-19-sprint-13-commercial-readiness.md` |
| Commercial readiness gate | `docs/implementation/giwa-commercial-readiness-gate.md` |
| Hosted ops runbook | `docs/implementation/giwa-hosted-ops-runbook.md` |
| Partner beta runbook | `docs/implementation/giwa-partner-beta-runbook.md` |
| Partner beta rehearsal runbook | `docs/implementation/giwa-partner-beta-rehearsal-runbook.md` |
| Partner beta rehearsal checklist | `docs/implementation/giwa-partner-beta-rehearsal-checklist.md` |
| Partner beta feedback form | `docs/implementation/giwa-partner-beta-feedback-form.md` |
| Partner beta closeout report | `docs/implementation/giwa-partner-beta-closeout-report.md` |
| Incident response | `docs/implementation/giwa-incident-response.md` |
| Evidence retention policy | `docs/implementation/giwa-evidence-retention-policy.md` |
| Demo script | `docs/implementation/giwa-mvp-demo-script.md` |
| Runbook | `docs/implementation/giwa-mvp-runbook.md` |
| Acceptance checklist | `docs/implementation/giwa-mvp-acceptance-checklist.md` |
| Sprint 38 local readiness evidence | `docs/evidence/staging-readiness-sprint38-handoff.json` |
| Sprint 39 final handoff evidence | `docs/evidence/commercial-readiness-sprint39-final-handoff.json` |
| Sprint 39 final readiness record | `docs/implementation/giwa-commercial-hardening-and-partner-handoff-final-readiness.md` |
| Sprint 40 freeze evidence | `docs/evidence/commercial-readiness-sprint40-freeze.json` |
| Sprint 40 freeze record | `docs/implementation/giwa-external-only-blocker-handoff-and-staging-readiness-freeze.md` |

## Evidence Summary

| Field | Value |
| --- | --- |
| Chain id | `91342` |
| Network | `GIWA Sepolia` |
| Intent hash | `0x359228ce2ef1d59fff6479e3f0a8c4a9ccc84d74dc89b9b387a25247fd28c7a4` |
| Receipt hash | `0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503` |
| Verifier input hash | `0x1ca37e2ff786764bbc84e55df26382a5948e7bf8de279b54c1ac5736366395de` |
| Decoded log snapshot hash | `0x1f338c1999a710bdf1688d5074be7fe2f77a372520ed20fced2aacfc2044d4ce` |
| Decision transaction | `0x2eb0cd03c3b71fb53664cf9364916453c442de8c05f5b436f3537414636f85df` |
| Deposit transaction | `0xd25a4f064d15aba1fb108a2db08dc673932314c42507db5b7f9162e0a0126886` |
| Partner snapshot | `apps/web/public/partner-snapshot.json` |
| Live demo snapshot | `docs/evidence/live-demo-sprint12-snapshot.json` after matched live rehearsal |

## Fresh Live Evidence Summary

| Field | Value |
| --- | --- |
| Live URL | `http://127.0.0.1:4190/live` |
| Live DB | `apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite` |
| Run id | `0x67c754c6e4582cb6b1c574c21e2ea4fe034691de80e7512223fe338aee40a88d` |
| Wallet | `0xf3a729973559082260e742ebedf705271ad29476` |
| Approve transaction | `0xdac977c324239faf5e4560c6b137b6d6954d2490b85dd83690ba7a39f430774b` |
| Deposit transaction | `0x63c1ad3171a78b3e417e38eacc3fc57b545a39cabfa7a5bea2164d75b4526b30` |
| Verifier decision | `matched` |
| Verifier input hash | `0x83a4b7d20d0162affe04be016a68d9711f86eef356cf527620159957c7b2ed04` |
| Receipt hash | `0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8` |
| Dynamic receipt API | `http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8` |
| Deposit block | `28483877` |
| Confirmation depth at rehearsal | `37` |

The fresh live evidence is exported to both `docs/evidence/live-demo-sprint12-snapshot.json` and `apps/web/public/live-demo-snapshot.json`.

## Recorded Static Evidence Summary

The recorded static fallback remains available for reviewers who do not run the local live server.

## Operations Readiness Evidence

Sprint 17 adds hosted operations and partner beta readiness artifacts:

- hosted environment contract
- release gate checklist
- CI blocked-state rule for git-backed source with protected CI blocked by external account state
- artifact promotion manifest shape
- observability and alert model
- backup/restore drill
- evidence archive and retention policy
- incident response runbook
- partner beta intake, kickoff, rehearsal, and closeout runbook
- partner rehearsal checklist, feedback form, and closeout report for Sprint 18

The artifact promotion plan requires staging verification and matching checksums before any later `prod-testnet` promotion. Sprint 17 does not perform that promotion.

Sprint 18 keeps the same local-first boundary and adds the partner beta rehearsal package. Staging remains blocked until the closeout report marks the Sprint 19 blocker register resolved.

Sprint 39 closes the local-advisory commercial hardening and partner handoff packet. Sprint 40 freezes the current local-advisory readiness state on current `main`, records that check-runs remain absent, and separates external-only blockers from mixed repo/workflow blockers. Protected CI evidence, protected artifact metadata, branch-protection satisfaction, release approval, partner signoff, external hosting approval, and managed infrastructure remain blockers for staging promotion.

## Criteria Map

| Criterion | Evidence |
| --- | --- |
| GIWA ecosystem fit | Uses GIWA Sepolia chain id `91342`, GIWA explorer links, standard RPC receipts, and Flashblocks only for non-final feedback. |
| Originality | Turns quest-style completion into signed manifest evidence, verifier decision output, receipt hash, and partner proof snapshot. |
| Feasibility | Deployed contracts, recorded wallet transactions, and verifier command are present in the repository. |
| Marketability | Partner console summarizes one mock testnet activation with transaction links and a downloadable JSON snapshot. |
| GIWA Wallet integration path | The flow keeps wallet actions user-controlled and avoids private key handling in the browser. |
| Implementation level | Sprints 3 through 6 produced chain anchor, verifier, receipt, guided flow, and partner console artifacts. |
| Technical maturity | Hash recomputation, signer recovery, decoded logs, confirmation depth, and idempotent verifier behavior are recorded or tested. |
| Team capability | Runbook, demo script, acceptance checklist, and evidence paths make the MVP repeatable for review. |
| Local live readiness | Fresh rehearsal on port `4190` produced a matched live run, dynamic receipt API, and commit-safe live snapshot export. |

## Official Reference Check

Checked on `2026-06-17`.

| Topic | URL |
| --- | --- |
| GIWA Sepolia chain settings, RPC, Flashblocks RPC, explorer | `https://docs.giwa.io/get-started/connect-to-giwa` |
| GIWA test ETH faucet | `https://docs.giwa.io/get-started/faucets` |
| Flashblocks behavior | `https://docs.giwa.io/giwa-chain/en/network-information/flashblocks` |
| GIWA Sepolia explorer | `https://sepolia-explorer.giwa.io/` |
| Dojang Verified Address | `https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/dojang/verified-address` |
| up.id | `https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/up-id` |

## Scope Boundaries

- The MVP is testnet-only.
- The action is a mock vault deposit.
- Partner metrics are proof summary metrics for this mock testnet action.
- Flashblocks is only presented as non-final fast feedback.
- The verifier relies on standard RPC receipt status, block number, block hash, logs, manifest fields, and signer recovery.
- Browser/public files are generated from sanitized public evidence and do not include local secret values.
- Live demo snapshot export is allowed only after a matched live verifier decision.

## Residual Risks

- The recorded final evidence contains one completed GIWA Sepolia run; additional live reruns depend on current faucet, RPC, and wallet state.
- Official GIWA docs may change after the reference check date.
- The UI is a dependency-free static demo, not a production web app.
- Sprint 12 live snapshot files are generated from the matched fresh local live rehearsal.
- Sprint 40 readiness freeze is local-advisory only because current `main` has no protected CI check-runs and the latest real Actions run is stale for current source.

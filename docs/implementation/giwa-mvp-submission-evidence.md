# GIWA Verified Intent Rail Submission Evidence

This document maps the final MVP to the submission artifacts.

## What To Open First

1. External blocker handoff: `docs/implementation/giwa-external-blocker-monitoring-and-staging-handoff.md`
2. Sprint 43 handoff evidence: `docs/evidence/staging-handoff-sprint43-external-blockers.json`
3. Partner/customer handoff package: `docs/implementation/giwa-partner-customer-handoff-package.md`
4. Demo control room: `http://127.0.0.1:4190/demo`
5. Fresh live flow: `http://127.0.0.1:4190/live`
6. Dynamic receipt API after `matched`: `http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8`
7. Static fallback: `http://127.0.0.1:4176/`
8. Partner console: `http://127.0.0.1:4176/partner`
9. Static snapshot: `http://127.0.0.1:4176/partner-snapshot.json`

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
| Sprint 41 partner/customer handoff package | `docs/implementation/giwa-partner-customer-handoff-package.md` |
| Sprint 41 partner/customer handoff evidence | `docs/evidence/partner-customer-handoff-sprint41.json` |
| Sprint 42 hosted adapter commercial boundary | `docs/implementation/giwa-hosted-adapter-commercial-boundary.md` |
| Sprint 42 hosted adapter boundary evidence | `docs/evidence/hosted-adapter-commercial-boundary-sprint42.json` |
| Sprint 43 external blocker handoff | `docs/implementation/giwa-external-blocker-monitoring-and-staging-handoff.md` |
| Sprint 43 staging handoff evidence | `docs/evidence/staging-handoff-sprint43-external-blockers.json` |
| Sprint 44 commercial handoff consistency evidence | `docs/evidence/commercial-handoff-consistency-sprint44.json` |
| Sprint 45 bounded failure redaction evidence | `docs/evidence/bounded-failure-redaction-sprint45.json` |
| Sprint 46 public boundary hardening evidence | `docs/evidence/public-boundary-final-hardening-sprint46.json` |

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

The fresh live evidence is exported to both `docs/evidence/live-demo-sprint12-snapshot.json` and `apps/web/public/live-demo-snapshot.json`. These retained snapshots are evidence for the approved Sprint 12 rehearsal run only; they are not protected CI provenance and do not authorize a fresh wallet rehearsal.

## Recorded Static Evidence Summary

The recorded static fallback remains available for reviewers who do not run the local live server.

| Field | Value |
| --- | --- |
| Static receipt hash | `0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503` |
| Static decision transaction | `0x2eb0cd03c3b71fb53664cf9364916453c442de8c05f5b436f3537414636f85df` |
| Static partner snapshot | `apps/web/public/partner-snapshot.json` |
| Static snapshot SHA-256 | `33C7EDD496B2D76A68A624C98B86FC0ADC404D35C302942E62382CDE3720485A` |

## Sprint 41 Handoff Summary

| Field | Value |
| --- | --- |
| Handoff package | `docs/implementation/giwa-partner-customer-handoff-package.md` |
| Handoff evidence | `docs/evidence/partner-customer-handoff-sprint41.json` |
| Authority | `local-advisory` |
| Commercial readiness | `blocked` |
| Staging dry-run execution | `blocked` |
| Protected CI for current handoff input | absent |
| Latest real protected workflow evidence | stale billing-lock failure with zero artifacts |

## Sprint 43 Handoff Summary

| Field | Value |
| --- | --- |
| External blocker handoff | `docs/implementation/giwa-external-blocker-monitoring-and-staging-handoff.md` |
| Handoff evidence | `docs/evidence/staging-handoff-sprint43-external-blockers.json` |
| Authority | `local-advisory` |
| Local-review handoff freeze | `true` |
| Commercial readiness | `blocked` |
| Staging dry-run execution | `blocked` |
| Protected CI | `blocked-external-github-account` |
| Protected artifact metadata | `absent` |
| Partner/customer signoff | `absent` |
| External hosting approval | `absent` |
| Managed infrastructure approval | `absent` |
| Remaining internal safe-track work | `none-known` |

## Sprint 45 Local Hardening Summary

| Field | Value |
| --- | --- |
| Sprint 45 plan | `docs/superpowers/plans/2026-06-21-sprint-45-bounded-failure-redaction-and-handoff-alignment.md` |
| Sprint 45 evidence | `docs/evidence/bounded-failure-redaction-sprint45.json` |
| Authority | `local-advisory` |
| Commercial readiness | `blocked` |
| Staging dry-run execution | `blocked` |
| Protected CI | `blocked-external-github-account` |
| Scope | bounded verifier failures, hosted request safety, public artifact credential markers, telemetry redaction, retained snapshot replay boundary, and recorded wallet evidence copy |

## Sprint 46 Public Boundary Summary

| Field | Value |
| --- | --- |
| Sprint 46 plan | `docs/superpowers/plans/2026-06-21-sprint-46-public-boundary-final-hardening.md` |
| Sprint 46 evidence | `docs/evidence/public-boundary-final-hardening-sprint46.json` |
| Authority | `local-advisory` |
| Commercial readiness | `blocked` |
| Staging dry-run execution | `blocked` |
| Protected CI | `blocked-external-github-account` |
| Scope | legacy verifier failure read redaction, redacted readiness category labels, public evidence JSON scanning, standard RPC block evidence wording, and historical chain-operation reference boundaries |

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

Sprint 39 closes the local-advisory commercial hardening and partner handoff packet. Sprint 40 freezes the current local-advisory readiness state on current `main`, records that check-runs remain absent, and separates external-only blockers from mixed repo/workflow blockers. Sprint 42 hardens the hosted adapter commercial boundary without connecting managed infrastructure. Sprint 43 freezes the external blocker monitoring and staging handoff state. Sprint 45 hardens local bounded failures, request safety, public artifact scanning, telemetry redaction, retained snapshot replay-boundary labeling, and handoff copy. Sprint 46 hardens public read paths, readiness metadata, public evidence scanning, and standard RPC block evidence wording. Protected CI evidence, protected artifact metadata, branch-protection satisfaction, release approval, partner/customer signoff, external hosting approval, and managed infrastructure remain blockers for staging promotion.

## Criteria Map

| Criterion | Evidence |
| --- | --- |
| GIWA ecosystem fit | Uses GIWA Sepolia chain id `91342`, GIWA explorer links, standard RPC receipts, and Flashblocks only for non-final feedback. |
| Originality | Turns quest-style completion into signed manifest evidence, verifier decision output, receipt hash, and partner proof snapshot. |
| Feasibility | GIWA Sepolia testnet mock-contract evidence, recorded wallet transactions, and verifier artifacts are present in the repository. |
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
- Sprint 43 is the final local-advisory handoff freeze. The remaining blockers require external state changes before another execution sprint should begin.
- Sprint 45 adds local-advisory quality hardening after that freeze, but it does not change the external blocker set or authorize staging execution.
- Sprint 46 adds local-advisory public boundary hardening after Sprint 45, but it does not change the external blocker set or authorize staging execution.

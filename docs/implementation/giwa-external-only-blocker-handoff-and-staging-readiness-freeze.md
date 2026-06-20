# GIWA External-Only Blocker Handoff And Staging Readiness Freeze

Sprint 40 freezes the maximum safe local-advisory handoff package while protected CI remains blocked outside the repository. It does not create protected CI provenance or staging authority.

## Current Authority

```text
authority=local-advisory
releaseGrade=false
canUnblockStaging=false
currentMain=afe0bf50022717f8011fd7691b00ce0a8af90802
currentMainCheckRuns=0
latestBillingLockRun=27873338373
latestBillingLockRunHead=2b414c91b1da6ed64287dbf7b2635be7586e287d
protectedCI=blocked-external-github-account
```

The current `main` commit is newer than the latest real protected workflow run. Current `main` has no check-runs. The latest real protected workflow evidence remains the billing-lock failure from run `27873338373`, which is stale for the current source state.

## Frozen Local Packet

| Item | Path |
| --- | --- |
| Sprint 40 plan | `docs/superpowers/plans/2026-06-20-sprint-40-external-only-blocker-handoff-and-staging-readiness-freeze.md` |
| Sprint 40 evidence | `docs/evidence/commercial-readiness-sprint40-freeze.json` |
| Sprint 39 final readiness record | `docs/implementation/giwa-commercial-hardening-and-partner-handoff-final-readiness.md` |
| Sprint 38 hosted adapter contract | `docs/implementation/giwa-hosted-adapter-local-contract.md` |
| Sprint 38 staging simulation | `docs/implementation/giwa-staging-dry-run-simulation.md` |
| Final demo script | `docs/implementation/giwa-mvp-demo-script.md` |
| Runbook | `docs/implementation/giwa-mvp-runbook.md` |
| Acceptance checklist | `docs/implementation/giwa-mvp-acceptance-checklist.md` |
| Submission evidence map | `docs/implementation/giwa-mvp-submission-evidence.md` |
| Partner beta closeout template | `docs/implementation/giwa-partner-beta-closeout-report.md` |
| Staging blocker register | `docs/implementation/giwa-staging-blocker-register.md` |
| Staging provenance gate | `docs/implementation/giwa-staging-release-provenance.md` |

## Final Demo Opening Order

```text
1. http://127.0.0.1:4190/demo
2. http://127.0.0.1:4190/live
3. http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
4. http://127.0.0.1:4176/
5. http://127.0.0.1:4176/partner
6. http://127.0.0.1:4176/partner-snapshot.json
```

The `0x057b...74be8` receipt is the fresh live local dynamic receipt. The `0x710c...1503` receipt is the recorded static fallback receipt. Keep these modes separate during review.

## Locally Closed Safe Tracks

| Track | Sprint 40 state |
| --- | --- |
| Final demo order | frozen |
| Static fallback | available as recorded GIWA Sepolia testnet evidence |
| Fresh live evidence | available as local matched rehearsal evidence |
| Dynamic receipt gate | matched-only and bounded |
| Locked receipt API | returns bounded not-found without gate details |
| Public copy | stale internal sprint wording removed from public assets |
| Safe scans | plan blanket allowlist removed for unsupported and sensitive terms |
| Hosted adapter contract | local-advisory contract complete, activation blocked |
| Staging dry-run simulation | local-advisory simulation complete, execution blocked |
| Partner handoff packet | ready for local review only |

## External-Only Blockers

| Blocker | Required outside the repository |
| --- | --- |
| GitHub account gate | Billing or account lock must be cleared in GitHub before protected CI can start |
| External partner signoff | Real reviewer or partner must sign off on the local-advisory packet |
| External hosting approval | Host, owner, origin policy, and rollback owner must be approved |
| Managed infrastructure approval | Durable DB, credential manager, backup target, and restore owner must be selected and approved |

## Mixed Repo/Workflow Blockers

| Blocker | Why it is mixed |
| --- | --- |
| Protected CI evidence for current `main` | external account gate must clear, then repository workflow must pass all required checks |
| Protected artifact metadata | external account gate must clear, then workflow artifact upload metadata must exist |
| Branch protection satisfaction | required checks are configured but current `main` has no check-runs |
| Release approval | depends on protected CI, protected artifacts, owners, rollback path, and partner decision |

## Remaining Staging No-Go

Staging dry-run execution remains blocked until:

1. protected CI passes on current `main`,
2. protected artifact metadata exists,
3. external partner signoff exists,
4. external hosting approval exists,
5. managed infrastructure is approved and connected through a separately approved sprint,
6. release and rollback owners approve the exact artifact set.

## Safety Confirmation

Sprint 40 does not dispatch or rerun GitHub Actions, public-host, deploy, connect managed infrastructure, print credential values, read real env file contents, send wallet actions, run GIWA chain-operation package commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

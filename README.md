# GIWA Verified Intent Rail

This repository contains the final submission pack for the GASOK MVP concept. The public-facing product name is `GIWA Verified Intent Rail`.

## Canonical Document

Use [03_giwa_verified_intent_rail_positioning.md](03_giwa_verified_intent_rail_positioning.md) as the source of truth for external pitch decks, submission copy, MVP scope, and product positioning.

## Current Routing / Stop Condition

Use [docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md](docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md) as the current implementation routing document.

The older [docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md](docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md) is reference-only and must not be executed directly.

Current state is a local-review handoff freeze with Sprint 52 Lightsail staging deploy preflight packaging completed locally after the Sprint 51 Lightsail architecture and cost plan. Sprint 52 defines the deploy preflight checklist, systemd/Nginx draft, runtime injection boundary, backup/restore gate, and no-go blockers, but it does not create infrastructure, deploy, configure DNS/HTTPS, connect managed infrastructure, or change protected CI status. Open the Sprint 43 blocker handoff, Sprint 47 evidence, Sprint 48 UX spec, Sprint 49 evidence, Sprint 50 visual QA evidence, Sprint 51 Lightsail plan, and Sprint 52 preflight package before any demo route or staging discussion. Protected CI, protected artifact metadata, branch-protection satisfaction, partner/customer signoff, external hosting approval, managed infrastructure approval, release approval, and staging dry-run execution remain blocked until external conditions change.

## Final Demo Pack

Open these first:

- [External blocker monitoring and staging handoff](docs/implementation/giwa-external-blocker-monitoring-and-staging-handoff.md)
- [Partner/customer handoff package](docs/implementation/giwa-partner-customer-handoff-package.md)
- [Demo script](docs/implementation/giwa-mvp-demo-script.md)
- [Runbook](docs/implementation/giwa-mvp-runbook.md)
- [Acceptance checklist](docs/implementation/giwa-mvp-acceptance-checklist.md)
- [Submission evidence map](docs/implementation/giwa-mvp-submission-evidence.md)

Recommended demo order:

```text
Commercial user flow: http://127.0.0.1:4176/user
Demo control room:    http://127.0.0.1:4190/demo
Fresh live flow:      http://127.0.0.1:4190/live
Dynamic receipt API:  http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
Static fallback:      http://127.0.0.1:4176/
Partner console:      http://127.0.0.1:4176/partner
Static snapshot:      http://127.0.0.1:4176/partner-snapshot.json
```

Run the static demo:

```powershell
$env:PORT=4176
pnpm --filter @giwa/web --fail-if-no-match serve
```

Local URLs:

```text
User action:     http://127.0.0.1:4176/user
User receipts:   http://127.0.0.1:4176/user/receipts
User recovery:   http://127.0.0.1:4176/user/help
Guided flow:     http://127.0.0.1:4176/
Receipt route:   http://127.0.0.1:4176/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503
Partner console: http://127.0.0.1:4176/partner
JSON snapshot:   http://127.0.0.1:4176/partner-snapshot.json
```

Evidence paths:

- [docs/evidence/giwa-sepolia-mvp-evidence.json](docs/evidence/giwa-sepolia-mvp-evidence.json)
- [docs/evidence/giwa-sepolia-chain-anchor.json](docs/evidence/giwa-sepolia-chain-anchor.json)
- [packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json](packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json)
- [apps/web/public/partner-snapshot.json](apps/web/public/partner-snapshot.json)
- [docs/evidence/staging-handoff-sprint43-external-blockers.json](docs/evidence/staging-handoff-sprint43-external-blockers.json)
- [docs/evidence/commercial-handoff-consistency-sprint44.json](docs/evidence/commercial-handoff-consistency-sprint44.json)
- [docs/evidence/bounded-failure-redaction-sprint45.json](docs/evidence/bounded-failure-redaction-sprint45.json)
- [docs/evidence/public-boundary-final-hardening-sprint46.json](docs/evidence/public-boundary-final-hardening-sprint46.json)
- [docs/evidence/client-side-public-error-copy-sprint47.json](docs/evidence/client-side-public-error-copy-sprint47.json)
- [docs/superpowers/specs/2026-06-26-commercial-user-facing-ux-design.md](docs/superpowers/specs/2026-06-26-commercial-user-facing-ux-design.md)
- [docs/evidence/commercial-user-flow-sprint49.json](docs/evidence/commercial-user-flow-sprint49.json)
- [docs/evidence/commercial-user-flow-sprint50-visual-qa.json](docs/evidence/commercial-user-flow-sprint50-visual-qa.json)
- [docs/evidence/lightsail-staging-plan-sprint51.json](docs/evidence/lightsail-staging-plan-sprint51.json)
- [docs/evidence/lightsail-staging-preflight-sprint52.json](docs/evidence/lightsail-staging-preflight-sprint52.json)

## Hosted Ops Readiness

Sprint 17 adds hosted operations and partner beta readiness documents. Sprint 18 adds the partner beta rehearsal package. Sprint 19 adds staging deployment preparation gates. These are gates and runbooks only; they do not authorize public hosting or deployment.

Sprint 19 Staging Deployment Preparation is the baseline staging-readiness gate package. Sprint 40 is the local-advisory staging-readiness freeze. Sprint 41 is the partner/customer handoff package. Sprint 42 hardens the hosted adapter commercial boundary with local-advisory code, tests, docs, and evidence while keeping managed infrastructure unconnected. Sprint 43 is the current external blocker monitoring and staging handoff freeze: it is ready for local review only and keeps protected CI, protected artifacts, partner/customer signoff, public hosting, managed infrastructure, release approval, and staging execution blocked until those external conditions change.
Sprint 44 tightens the local handoff consistency and evidence guardrails only. It does not change the external blocker state or authorize protected CI, hosting, managed infrastructure, partner traffic, staging execution, or release promotion.
Sprint 45 tightens bounded verifier failure redaction, hosted request safety, credential-like public artifact detection, telemetry value redaction, legacy snapshot replay-boundary labeling, and recorded-wallet-evidence copy. It does not change the external blocker state or authorize protected CI, hosting, managed infrastructure, partner traffic, staging execution, or release promotion.
Sprint 46 tightens the final local public boundary: legacy verifier failure values are redacted on read paths, readiness metadata uses category labels instead of raw config names, public evidence JSON enters artifact scanning, public models use standard RPC block evidence wording, and historical chain-operation docs are marked reference-only. It does not change the external blocker state or authorize protected CI, hosting, managed infrastructure, partner traffic, staging execution, wallet actions, or release promotion.
Sprint 47 tightens client-side public error copy: checked-in browser assets no longer render raw exception-message fallback strings for static demo, demo control room, wallet, approve, deposit, verify, or live API fallback paths. It does not change the external blocker state or authorize protected CI, hosting, managed infrastructure, partner traffic, staging execution, wallet actions, or release promotion.
Sprint 48 defines the future commercial user-facing UX as a design-only spec: Action Page, Wallet/Network Gate, Intent Preview, Transaction Progress, Verified Receipt, My Receipts, Help/Recovery, and public share receipt boundaries. It does not implement UI, deploy, dispatch protected CI, change wallet behavior, or alter the existing reviewer/operator/partner routes.
Sprint 49 implements that commercial user-facing UX locally. It adds `/user`, `/user/receipt/<receiptHash>`, `/user/receipts`, and `/user/help`, plus user-flow state, copy, receipt projection, recovery models, public route mapping, and bounded-copy guards. It does not deploy, dispatch protected CI, connect managed infrastructure, install dependencies, run chain-operation package commands, or authorize server/script wallet transactions.
Sprint 50 polishes and verifies the commercial user-facing UX locally. It tightens `/user` layout, action readiness cards, progress rail framing, receipt actions, help/recovery spacing, static `/demo` bounded fallback projections, and desktop/mobile browser smoke evidence. It does not deploy, dispatch protected CI, connect managed infrastructure, install dependencies, run chain-operation package commands, or send wallet transactions.
Sprint 51 plans a future Lightsail staging path. It documents a Ubuntu instance topology, Node static/live services, Nginx reverse proxy, HTTPS options, systemd service shape, cost and sizing model, deploy runbook draft, and staging go/no-go blockers. It does not create AWS resources, deploy, configure DNS or HTTPS, connect managed infrastructure, request credential values, dispatch protected CI, install dependencies, run chain-operation package commands, or send wallet transactions.
Sprint 52 turns that path into a deploy preflight package. It documents external approval inputs, `giwa-static.service` and `giwa-live.service` drafts, Nginx route ownership, server-only runtime variable names, SQLite backup/restore gates, smoke checks, rollback triggers, and no-go conditions. It does not create AWS resources, deploy, configure DNS or HTTPS, connect managed infrastructure, request credential values, dispatch protected CI, install dependencies, run chain-operation package commands, or send wallet transactions.
Sprint 20 CI and Source Provenance is the historical source-control and protected-check planning package.
Sprint 21 CI Workflow Implementation is the gated execution plan for source-control transition, reviewed workflow creation, and protected provenance checks.
Sprint 22 Artifact Manifest Local Implementation adds local-advisory artifact inventory, hashing, scan, and provenance report outputs without enabling protected CI or deployment.
Sprint 23 Provenance Report Local Implementation adds local-advisory report verification, timestamp-aware drift detection, command evidence binding, domain hash classification, and protected CI handoff fields without enabling protected CI or deployment.
Sprint 24 CI Workflow File Creation After Approval is the next approval-gated plan for repository initialization, workflow file creation, branch protection, command matrix, and artifact upload policy without enabling protected CI or deployment.
Sprint 25 Git and Workflow Initialization After Approval is the approval-gated execution plan for repository initialization, initial commit policy, workflow file creation, branch protection preparation, and local-advisory to protected-CI handoff. Sprint 26 executed the approved local repository and workflow initialization path. It creates local source provenance and a workflow file, but protected CI, branch protection, public hosting, deployment, and release-grade provenance remain blocked until a remote GitHub repository, push approval, and real CI statuses exist. Sprint 27 records the protected CI run and release provenance probe: no remote GitHub repository or Actions status exists yet, so protected CI, branch protection, release approval, and staging promotion remain blocked. Sprint 28 plans the GitHub remote and protected CI activation path, including local workflow hardening and approval gates, without adding a remote, pushing, dispatching Actions, configuring branch protection, hosting, or deploying. Sprint 29 executed the approved private GitHub remote activation path, pushed `main`, and observed real Actions run ids. The observed runs ended `startup_failure` with zero jobs, and branch protection is blocked by GitHub plan or private-repository visibility, so protected CI, release approval, and staging promotion remain blocked. Sprint 30 routes that failure through a minimal diagnostic workflow, branch policy retry rules, third-party check-suite classification, and blocker updates before any protected artifact or staging dry-run work. The minimal diagnostic workflow also ended `startup_failure` with zero jobs, so the current root-cause class is repository/account/platform startup gate. Sprint 31 made the source repository public after source-safety checks and configured branch protection for `main`. GitHub now creates required-check contexts, but the first job is not started because the account is locked due to a billing issue, so protected CI, release approval, and staging promotion remain blocked. Sprint 32 records the billing lock as the remaining external gate and defines the post-billing protected CI rerun and artifact handoff procedure. Sprint 33 prepares the staging dry-run packet under that billing lock, keeps staging execution blocked, and documents the post-billing handoff without public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, or protected-CI claims. Sprint 34 prepares hosted adapter readiness under the same protected-CI blocker without implementing an adapter, connecting managed infrastructure, or approving staging execution. Sprint 35 records the post-billing protected CI rerun and artifact handoff plan; billing unlock is not confirmed, so no rerun is executed and protected CI, artifact handoff, release approval, staging dry-run execution, hosted adapter implementation, and partner promotion remain blocked. Sprint 36 checks again after the Sprint 35 handoff commit; billing unlock is still not evidenced, current `main` has no Actions run, the latest real run remains on an older commit, and no protected CI rerun or dispatch is executed. Sprint 37 dispatches `ci-source-provenance` on current `main` after the user-reported billing unlock; GitHub still returns the billing-lock annotation, `source-provenance` fails before runner steps, the other nine required jobs are skipped, artifact count is zero, and staging remains blocked. Sprint 38 stops repeating protected CI dispatches under the billing blocker and advances the safe local tracks: hosted adapter local contract, staging dry-run simulation, and final blocker handoff remain local-advisory until protected CI and artifact metadata exist. Sprint 39 closes the commercial hardening and partner handoff safe track: final demo, partner packet, acceptance, submission, and blocker documents point to the Sprint 38 local readiness evidence while protected CI, protected artifacts, partner signoff, hosting approval, and managed infrastructure remain blocked. Sprint 40 freezes the maximum safe local handoff on current `main`: the local packet is ready for review, locked receipt responses are bounded, public copy and scans are hardened, and remaining release blockers are separated into external-only and mixed repo/workflow gates.

- [Hosted ops runbook](docs/implementation/giwa-hosted-ops-runbook.md)
- [Partner beta runbook](docs/implementation/giwa-partner-beta-runbook.md)
- [Partner beta rehearsal runbook](docs/implementation/giwa-partner-beta-rehearsal-runbook.md)
- [Partner beta feedback form](docs/implementation/giwa-partner-beta-feedback-form.md)
- [Partner beta closeout report](docs/implementation/giwa-partner-beta-closeout-report.md)
- [Partner beta rehearsal checklist](docs/implementation/giwa-partner-beta-rehearsal-checklist.md)
- [Sprint 19 staging preparation plan](docs/superpowers/plans/2026-06-19-sprint-19-staging-deployment-preparation.md)
- [Sprint 19 staging preparation runbook](docs/implementation/giwa-staging-deployment-preparation.md)
- [Sprint 19 release provenance gate](docs/implementation/giwa-staging-release-provenance.md)
- [Sprint 19 environment contract](docs/implementation/giwa-staging-env-contract.md)
- [Sprint 19 storage and restore gate](docs/implementation/giwa-staging-storage-and-restore.md)
- [Sprint 19 observability gate](docs/implementation/giwa-staging-observability.md)
- [Sprint 19 security boundary](docs/implementation/giwa-staging-security-boundary.md)
- [Sprint 19 rollback and incident drill](docs/implementation/giwa-staging-rollback-and-incident-drill.md)
- [Sprint 19 partner promotion gate](docs/implementation/giwa-staging-partner-promotion-gate.md)
- [Sprint 19 blocker register](docs/implementation/giwa-staging-blocker-register.md)
- [Sprint 20 CI and Source Provenance plan](docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md)
- [Sprint 21 CI Workflow Implementation plan](docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md)
- [Sprint 21 CI workflow draft](docs/implementation/giwa-ci-workflow-draft.md)
- [Sprint 21 local CI simulation](docs/implementation/giwa-local-ci-simulation.md)
- [Sprint 21 provenance artifact manifest](docs/implementation/giwa-provenance-artifact-manifest.md)
- [Sprint 21 release approval checklist](docs/implementation/giwa-release-approval-checklist.md)
- [Sprint 21 CI failure triage](docs/implementation/giwa-ci-failure-triage.md)
- [Sprint 22 Artifact Manifest Local Implementation plan](docs/superpowers/plans/2026-06-19-sprint-22-artifact-manifest-local-implementation.md)
- [Sprint 23 Provenance Report Local Implementation plan](docs/superpowers/plans/2026-06-19-sprint-23-provenance-report-local-implementation.md)
- [Sprint 24 CI Workflow File Creation After Approval plan](docs/superpowers/plans/2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md)
- [Sprint 25 Git and Workflow Initialization After Approval plan](docs/superpowers/plans/2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md)
- [Sprint 24 git initialization approval](docs/implementation/giwa-git-initialization-approval.md)
- [Sprint 24 workflow creation approval](docs/implementation/giwa-ci-workflow-creation-approval.md)
- [Sprint 24 branch protection approval](docs/implementation/giwa-branch-protection-approval.md)
- [Sprint 24 workflow YAML draft](docs/implementation/giwa-ci-workflow-yaml-draft.md)
- [Sprint 25 git and workflow initialization readiness](docs/implementation/giwa-git-and-workflow-initialization-readiness.md)
- [Sprint 25 initial commit file policy](docs/implementation/giwa-initial-commit-file-policy.md)
- [Sprint 25 workflow creation preflight](docs/implementation/giwa-workflow-creation-preflight.md)
- [Sprint 25 protected CI transition checklist](docs/implementation/giwa-protected-ci-transition-checklist.md)
- [Sprint 26 git and workflow initialization execution](docs/implementation/giwa-git-and-workflow-initialization-execution.md)
- [Sprint 26 GitHub Actions workflow](.github/workflows/ci.yml)
- [Sprint 27 protected CI run and release provenance plan](docs/superpowers/plans/2026-06-19-sprint-27-protected-ci-run-and-release-provenance.md)
- [Sprint 27 protected CI run and release provenance record](docs/implementation/giwa-protected-ci-run-and-release-provenance.md)
- [Sprint 28 GitHub remote and protected CI activation plan](docs/superpowers/plans/2026-06-19-sprint-28-github-remote-and-protected-ci-activation.md)
- [Sprint 29 GitHub remote activation after user approval plan](docs/superpowers/plans/2026-06-19-sprint-29-github-remote-activation-after-user-approval.md)
- [Sprint 30 protected CI startup and branch policy unblock plan](docs/superpowers/plans/2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md)
- [Sprint 31 source visibility and Actions runner gate plan](docs/superpowers/plans/2026-06-20-sprint-31-source-visibility-and-actions-runner-gate.md)
- [Sprint 32 GitHub billing lock and protected CI rerun plan](docs/superpowers/plans/2026-06-20-sprint-32-github-billing-lock-and-protected-ci-rerun.md)
- [Sprint 33 staging dry-run preparation under billing lock plan](docs/superpowers/plans/2026-06-20-sprint-33-staging-dry-run-preparation-under-billing-lock.md)
- [Sprint 33 staging dry-run preparation record](docs/implementation/giwa-staging-dry-run-preparation-under-billing-lock.md)
- [Sprint 34 hosted adapter readiness under protected-CI blocker plan](docs/superpowers/plans/2026-06-20-sprint-34-hosted-adapter-readiness-under-protected-ci-blocker.md)
- [Sprint 34 hosted adapter readiness record](docs/implementation/giwa-hosted-adapter-readiness.md)
- [Sprint 35 post-billing protected CI rerun and artifact handoff plan](docs/superpowers/plans/2026-06-20-sprint-35-post-billing-protected-ci-rerun-and-artifact-handoff.md)
- [Sprint 35 post-billing protected CI rerun and artifact handoff record](docs/implementation/giwa-post-billing-protected-ci-rerun-and-artifact-handoff.md)
- [Sprint 35 protected CI blocked handoff evidence](docs/evidence/protected-ci-sprint35-blocked-handoff.json)
- [Sprint 36 protected CI rerun after billing unlock plan](docs/superpowers/plans/2026-06-20-sprint-36-protected-ci-rerun-after-billing-unlock.md)
- [Sprint 36 protected CI rerun after billing unlock record](docs/implementation/giwa-protected-ci-rerun-after-billing-unlock.md)
- [Sprint 36 protected CI blocked handoff evidence](docs/evidence/protected-ci-sprint36-blocked-handoff.json)
- [Sprint 37 protected CI dispatch after reported billing unlock plan](docs/superpowers/plans/2026-06-20-sprint-37-protected-ci-dispatch-after-reported-billing-unlock.md)
- [Sprint 37 protected CI dispatch after reported billing unlock record](docs/implementation/giwa-protected-ci-dispatch-after-reported-billing-unlock.md)
- [Sprint 37 protected CI dispatch failure evidence](docs/evidence/protected-ci-sprint37-dispatch-failure.json)
- [Sprint 38 hosted adapter local contract and staging simulation plan](docs/superpowers/plans/2026-06-20-sprint-38-hosted-adapter-local-contract-and-staging-simulation.md)
- [Sprint 38 hosted adapter local contract](docs/implementation/giwa-hosted-adapter-local-contract.md)
- [Sprint 38 staging dry-run simulation](docs/implementation/giwa-staging-dry-run-simulation.md)
- [Sprint 38 staging readiness handoff evidence](docs/evidence/staging-readiness-sprint38-handoff.json)
- [Sprint 39 commercial hardening and partner handoff plan](docs/superpowers/plans/2026-06-20-sprint-39-commercial-hardening-and-partner-handoff-final-readiness.md)
- [Sprint 39 final readiness record](docs/implementation/giwa-commercial-hardening-and-partner-handoff-final-readiness.md)
- [Sprint 39 final handoff evidence](docs/evidence/commercial-readiness-sprint39-final-handoff.json)
- [Sprint 40 external-only blocker handoff and staging readiness freeze plan](docs/superpowers/plans/2026-06-20-sprint-40-external-only-blocker-handoff-and-staging-readiness-freeze.md)
- [Sprint 40 freeze record](docs/implementation/giwa-external-only-blocker-handoff-and-staging-readiness-freeze.md)
- [Sprint 40 freeze evidence](docs/evidence/commercial-readiness-sprint40-freeze.json)
- [Sprint 41 partner/customer handoff plan](docs/superpowers/plans/2026-06-21-sprint-41-partner-customer-handoff-package-finalization.md)
- [Sprint 41 partner/customer handoff package](docs/implementation/giwa-partner-customer-handoff-package.md)
- [Sprint 41 partner/customer handoff evidence](docs/evidence/partner-customer-handoff-sprint41.json)
- [Sprint 42 hosted adapter commercial boundary plan](docs/superpowers/plans/2026-06-21-sprint-42-hosted-adapter-commercial-boundary-hardening.md)
- [Sprint 42 hosted adapter commercial boundary](docs/implementation/giwa-hosted-adapter-commercial-boundary.md)
- [Sprint 42 hosted adapter commercial boundary evidence](docs/evidence/hosted-adapter-commercial-boundary-sprint42.json)
- [Sprint 43 external blocker monitoring plan](docs/superpowers/plans/2026-06-21-sprint-43-external-blocker-monitoring-and-staging-handoff.md)
- [Sprint 43 external blocker monitoring and staging handoff](docs/implementation/giwa-external-blocker-monitoring-and-staging-handoff.md)
- [Sprint 43 staging handoff evidence](docs/evidence/staging-handoff-sprint43-external-blockers.json)
- [Sprint 44 commercial handoff consistency evidence](docs/evidence/commercial-handoff-consistency-sprint44.json)
- [Sprint 45 bounded failure redaction evidence](docs/evidence/bounded-failure-redaction-sprint45.json)
- [Sprint 46 public boundary hardening plan](docs/superpowers/plans/2026-06-21-sprint-46-public-boundary-final-hardening.md)
- [Sprint 46 public boundary hardening evidence](docs/evidence/public-boundary-final-hardening-sprint46.json)
- [Sprint 47 client-side public error copy plan](docs/superpowers/plans/2026-06-21-sprint-47-client-side-public-error-copy-hardening.md)
- [Sprint 47 client-side public error copy evidence](docs/evidence/client-side-public-error-copy-sprint47.json)
- [Sprint 48 commercial user-facing UX design spec](docs/superpowers/specs/2026-06-26-commercial-user-facing-ux-design.md)
- [Sprint 48 commercial user-facing UX design plan](docs/superpowers/plans/2026-06-26-sprint-48-commercial-user-facing-ux-design-spec.md)
- [Sprint 49 commercial user-facing UX implementation plan](docs/superpowers/plans/2026-06-26-sprint-49-commercial-user-facing-ux-implementation-plan.md)
- [Sprint 49 commercial user-facing UX implementation evidence](docs/evidence/commercial-user-flow-sprint49.json)
- [Sprint 50 commercial user-facing UX visual QA evidence](docs/evidence/commercial-user-flow-sprint50-visual-qa.json)
- [Sprint 51 Lightsail staging architecture plan](docs/superpowers/plans/2026-06-26-sprint-51-lightsail-staging-architecture-and-cost-plan.md)
- [Sprint 51 Lightsail staging architecture](docs/implementation/giwa-lightsail-staging-architecture.md)
- [Sprint 51 Lightsail cost and sizing](docs/implementation/giwa-lightsail-cost-and-sizing.md)
- [Sprint 51 Lightsail deploy runbook draft](docs/implementation/giwa-lightsail-deploy-runbook-draft.md)
- [Sprint 51 Lightsail staging plan evidence](docs/evidence/lightsail-staging-plan-sprint51.json)
- [Sprint 52 Lightsail staging deploy preflight plan](docs/superpowers/plans/2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md)
- [Sprint 52 Lightsail staging preflight checklist](docs/implementation/giwa-lightsail-staging-preflight-checklist.md)
- [Sprint 52 Lightsail systemd and Nginx draft](docs/implementation/giwa-lightsail-systemd-and-nginx-draft.md)
- [Sprint 52 Lightsail env and credential injection preflight](docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md)
- [Sprint 52 Lightsail backup restore preflight](docs/implementation/giwa-lightsail-backup-restore-preflight.md)
- [Sprint 52 Lightsail staging preflight evidence](docs/evidence/lightsail-staging-preflight-sprint52.json)
- [Sprint 30 GitHub Actions startup failure triage](docs/implementation/giwa-github-actions-startup-failure-triage.md)
- [Sprint 22 local artifact manifest](docs/evidence/local-artifact-manifest.json)
- [Sprint 23 local provenance report](docs/evidence/local-provenance-report.json)
- [Sprint 23 local provenance report sidecar](docs/evidence/local-provenance-report.json.sha256)
- [Sprint 23 local command evidence report](docs/evidence/local-command-evidence-report.json)
- [Sprint 23 local provenance verification](docs/evidence/local-provenance-verification.json)
- [Incident response](docs/implementation/giwa-incident-response.md)
- [Evidence retention policy](docs/implementation/giwa-evidence-retention-policy.md)

## Local Live MVP

Sprint 12 adds a local live rehearsal path while keeping the Sprint 7 static fallback intact. The final fresh wallet rehearsal used:

```text
Live URL: http://127.0.0.1:4190/live
Live DB:  apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite
Run id:   0x67c754c6e4582cb6b1c574c21e2ea4fe034691de80e7512223fe338aee40a88d
Receipt:  0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
```

To rerun the same local live rehearsal path, start the live server with a separate DB:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:PORT=4190
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
Live wallet flow: http://127.0.0.1:4190/live
Live partner API: http://127.0.0.1:4190/api/partner/runs
```

The browser wallet owns approve/deposit signing. The server issues the wallet-bound manifest, stores public transaction hashes, verifies the public deposit transaction through standard RPC, and unlocks a dynamic receipt only after `matched`.

Export a live demo snapshot after a matched run:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:GIWA_LIVE_URL="http://127.0.0.1:4190/live"
pnpm --filter @giwa/web --fail-if-no-match export:live-demo
```

Live snapshot paths:

- [docs/evidence/live-demo-sprint12-snapshot.schema.md](docs/evidence/live-demo-sprint12-snapshot.schema.md)
- [docs/evidence/live-demo-sprint12-snapshot.json](docs/evidence/live-demo-sprint12-snapshot.json)
- [apps/web/public/live-demo-snapshot.json](apps/web/public/live-demo-snapshot.json)

The live snapshot is retained from the approved Sprint 12 rehearsal. Treat it as local live evidence for that recorded run, not as a replacement for protected CI provenance or a fresh wallet rehearsal authorization.

## Alternative GASOK Idea Candidates

These documents capture the top three alternative ideas from the parallel judge-style analysis. They are separate from the current `GIWA Verified Intent Rail` positioning:

- [04_giwa_agent_permission_sandbox.md](04_giwa_agent_permission_sandbox.md) - AI/Web3 wallet permission sandbox for bounded testnet agent actions
- [05_giwa_flashtrace_replay_studio.md](05_giwa_flashtrace_replay_studio.md) - Flashblocks-aware transaction lifecycle replay and debugging tool
- [06_giwa_builder_proofbook.md](06_giwa_builder_proofbook.md) - public GIWA Sepolia builder evidence profile

## Current MVP Scope

The July 31 GASOK MVP should focus on one flagship flow:

```text
First Mock Vault Deposit on GIWA Sepolia
```

Guardrails:

- testnet-only demo
- no production funds, asset issuance, yield, settlement, identity-service, or safety-guarantee claim
- no Flashblocks final confirmation claim
- no phishing-prevention claim

## Working Notes

This workspace now includes the static dependency-free web demo, protocol package, contracts package, evidence JSON, and submission docs.

After Sprint 0, use `.env.example`, `docs/implementation/giwa-mvp-role-and-key-policy.md`, and the evidence redaction rules before running any GIWA Sepolia scripts.

Use UTF-8 when reading files in PowerShell:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
Get-Content -Encoding UTF8 .\03_giwa_verified_intent_rail_positioning.md
```

Use project-local Engram only:

```powershell
.\scripts\engram-local.ps1 status
.\scripts\engram-local.ps1 find "GIWA Verified Intent Rail"
.\scripts\engram-local.ps1 save "Decision: ..."
```

Do not run bare `engram` in this folder.

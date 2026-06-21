# GIWA Verified Intent Rail

This repository contains the final submission pack for the GASOK MVP concept. The public-facing product name is `GIWA Verified Intent Rail`.

## Canonical Document

Use [03_giwa_verified_intent_rail_positioning.md](03_giwa_verified_intent_rail_positioning.md) as the source of truth for external pitch decks, submission copy, MVP scope, and product positioning.

## Current Execution Plan

Use [docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md](docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md) as the current implementation routing document.

The older [docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md](docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md) is reference-only and must not be executed directly.

## Final Demo Pack

Open these first:

- [Partner/customer handoff package](docs/implementation/giwa-partner-customer-handoff-package.md)
- [Demo script](docs/implementation/giwa-mvp-demo-script.md)
- [Runbook](docs/implementation/giwa-mvp-runbook.md)
- [Acceptance checklist](docs/implementation/giwa-mvp-acceptance-checklist.md)
- [Submission evidence map](docs/implementation/giwa-mvp-submission-evidence.md)

Recommended demo order:

```text
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

## Hosted Ops Readiness

Sprint 17 adds hosted operations and partner beta readiness documents. Sprint 18 adds the partner beta rehearsal package. Sprint 19 adds staging deployment preparation gates. These are gates and runbooks only; they do not authorize public hosting or deployment.

Sprint 19 Staging Deployment Preparation is the baseline staging-readiness gate package. Sprint 40 is the local-advisory staging-readiness freeze. Sprint 41 is the current partner/customer handoff package; it is ready for local review only and keeps protected CI, protected artifacts, partner signoff, public hosting, managed infrastructure, release approval, and staging execution blocked.
Sprint 20 CI and Source Provenance is the next source-control and protected-check planning package.
Sprint 21 CI Workflow Implementation is the next gated execution plan for source-control transition, reviewed workflow creation, and protected provenance checks.
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

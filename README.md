# GIWA Verified Intent Rail

This repository contains the final submission pack for the GASOK MVP concept. The public-facing product name is `GIWA Verified Intent Rail`.

## Canonical Document

Use [03_giwa_verified_intent_rail_positioning.md](03_giwa_verified_intent_rail_positioning.md) as the source of truth for external pitch decks, submission copy, MVP scope, and product positioning.

## Current Execution Plan

Use [docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md](docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md) as the current implementation routing document.

The older [docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md](docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md) is reference-only and must not be executed directly.

## Final Demo Pack

Open these first:

- [Demo script](docs/implementation/giwa-mvp-demo-script.md)
- [Runbook](docs/implementation/giwa-mvp-runbook.md)
- [Acceptance checklist](docs/implementation/giwa-mvp-acceptance-checklist.md)
- [Submission evidence map](docs/implementation/giwa-mvp-submission-evidence.md)

Recommended demo order:

```text
Fresh live flow:      http://127.0.0.1:4190/live
Dynamic receipt API:  http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
Static fallback:      http://127.0.0.1:4176/
Partner console:      http://127.0.0.1:4176/partner
Static snapshot:      http://127.0.0.1:4176/partner-snapshot.json
```

Run the static demo:

```powershell
$env:PORT=4176
pnpm --filter @giwa/web --fail-if-no-match dev
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

Sprint 19 Staging Deployment Preparation is the current staging-readiness package.
Sprint 20 CI and Source Provenance is the next source-control and protected-check planning package.
Sprint 21 CI Workflow Implementation is the next gated execution plan for source-control transition, reviewed workflow creation, and protected provenance checks.
Sprint 22 Artifact Manifest Local Implementation adds local-advisory artifact inventory, hashing, scan, and provenance report outputs without enabling protected CI or deployment.
Sprint 23 Provenance Report Local Implementation adds local-advisory report verification, timestamp-aware drift detection, command evidence binding, domain hash classification, and protected CI handoff fields without enabling protected CI or deployment.
Sprint 24 CI Workflow File Creation After Approval is the next approval-gated plan for repository initialization, workflow file creation, branch protection, command matrix, and artifact upload policy without enabling protected CI or deployment.
Sprint 25 Git and Workflow Initialization After Approval is the approval-gated execution plan for repository initialization, initial commit policy, workflow file creation, branch protection preparation, and local-advisory to protected-CI handoff. Sprint 26 executed the approved local repository and workflow initialization path. It creates local source provenance and a workflow file, but protected CI, branch protection, public hosting, deployment, and release-grade provenance remain blocked until a remote GitHub repository, push approval, and real CI statuses exist.

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

# GIWA MVP Sprint Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `GIWA Verified Intent Rail` development aligned across all MVP sprints.

**Architecture:** This index is the routing document for sprint execution. The older full implementation map remains reference-only; the sprint-specific documents below are the execution source of truth.

**Tech Stack:** Documentation control plan for a future TypeScript, Next.js, viem, Hardhat, and Solidity MVP.

---

## Execution Rule

Do not execute `docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md` directly.

Use this sprint index and the per-sprint documents instead. Each sprint must stop at its exit gate, record evidence, and receive approval before the next sprint starts.

## Current State After Sprint 53

The repo is in a local-review handoff freeze with Sprint 53 Lightsail staging deploy execution planning completed locally. Sprint 48 defines the user-facing UX spec, Sprint 49 adds the `/user`, `/user/receipt/<hash>`, `/user/receipts`, and `/user/help` route family, Sprint 50 polishes that user route family with desktop/mobile browser QA, Sprint 51 defines a future Lightsail staging topology without deploying, Sprint 52 defines the deploy preflight checklist, and Sprint 53 defines the explicit-approval execution sequence before any host work. Sprint 43 remains the first-read stop-condition packet. Protected CI provenance, protected artifact metadata, branch-protection satisfaction, partner/customer signoff, external hosting approval, managed infrastructure approval, release approval, and staging dry-run execution remain blocked. Further work must either respond to real external blocker evidence or improve internal local-advisory quality without touching protected CI, hosting, managed infrastructure, wallet actions, chain operations, or dependencies.

## Canonical Inputs

- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-15-giwa-chain-mvp-sprint-strategy-design.md`
- `docs/superpowers/specs/2026-06-15-giwa-mvp-final-review-summary.md`

## Sprint Order

| Sprint | Document | Purpose | Start After |
|---|---|---|---|
| 0 | `2026-06-16-sprint-0-scope-and-evidence-contract.md` | freeze scope, workspace mode, evidence schema, roles, dependency gate | now |
| 1 | `2026-06-16-sprint-1-protocol-kernel.md` | manifest, receipt, signer, hash rules | Sprint 0 approval |
| 2 | `2026-06-16-sprint-2-local-contract-proof.md` | local mock token, vault, rail event proof | Sprint 1 approval |
| 3 | `2026-06-16-sprint-3-giwa-sepolia-chain-anchor.md` | actual GIWA Sepolia deployment and deposit proof | Sprint 2 approval |
| 4 | `2026-06-16-sprint-4-verifier-and-receipt-engine.md` | verifier, receipt, decision event, idempotency | Sprint 3 approval |
| 5 | `2026-06-16-sprint-5-thin-guided-user-flow.md` | minimal guided user flow | Sprint 4 approval |
| 6 | `2026-06-16-sprint-6-partner-proofkpi-summary.md` | one-page partner evidence summary | Sprint 5 approval |
| 7 | `2026-06-16-sprint-7-demo-hardening-and-submission-evidence.md` | repeatable demo and final evidence bundle | Sprint 6 approval |
| 8 | `2026-06-17-sprint-8-local-live-architecture-cutover.md` | local live runtime API, state model, and storage cutover | Sprint 7 approval |
| 9 | `2026-06-17-sprint-9-wallet-and-manifest-issuance.md` | EIP-1193 wallet gate and signed wallet-bound manifest preview | Sprint 8 approval |
| 10 | `2026-06-17-sprint-10-live-approve-and-deposit.md` | user wallet approve/deposit transaction requests and tx hash storage | Sprint 9 approval |
| 11 | `2026-06-17-sprint-11-live-verifier-and-dynamic-receipt.md` | standard RPC deposit verification, dynamic receipt creation, and live receipt route unlock | Sprint 10 approval |
| 12 | `2026-06-17-sprint-12-live-demo-hardening-and-submission-refresh.md` | fresh live demo rehearsal, public live snapshot export, and submission document refresh | Sprint 11 approval |
| 13 | `2026-06-19-sprint-13-commercial-readiness.md` | commercial receipt gate, API safety boundary, partner metric gate, hosted blocker design | Sprint 12 approval |
| 14 | `2026-06-19-sprint-14-verifier-trust-hardening.md` | verifier trust hardening and hosted-pilot prerequisite planning | Sprint 13 approval |
| 15 | `2026-06-19-sprint-15-hosted-api-foundation.md` | hosted API mode, auth, tenant isolation, request safety, rate limit, verification job, migration, and observability foundation | Sprint 14 approval |
| 16 | `2026-06-19-sprint-16-commercial-ux-polish.md` | commercial UX polish for participant live flow, receipt page, partner evidence packet, operator demo, accessibility, and smoke QA | Sprint 15 approval |
| 17 | `2026-06-19-sprint-17-hosted-ops-and-partner-beta.md` | hosted operations, release gate, observability, backup/restore, incident response, and partner beta runbooks | Sprint 16 approval |
| 18 | `2026-06-19-sprint-18-partner-beta-rehearsal.md` | controlled partner beta rehearsal, evidence packet acceptance, fallback drill, feedback, closeout, and Sprint 19 staging blockers | Sprint 17 approval |
| 19 | `2026-06-19-sprint-19-staging-deployment-preparation.md` | staging deployment preparation gates for source provenance, host policy, env contract, storage, observability, security, rollback, and partner promotion | Sprint 18 approval |
| 20 | `2026-06-19-sprint-20-ci-and-source-provenance.md` | CI and source provenance plan for git-backed protected checks, artifact hashing, lockfile policy, redacted scans, release approval, and no-rebuild promotion | Sprint 19 approval |
| 21 | `2026-06-19-sprint-21-ci-workflow-implementation.md` | CI workflow implementation plan for approved git transition, reviewed workflow creation, protected checks, artifact provenance, and release approval routing | Sprint 20 approval |
| 22 | `2026-06-19-sprint-22-artifact-manifest-local-implementation.md` | local-advisory artifact manifest plan for deterministic inventory, hashing, redacted scans, provenance report output, and future protected CI integration | Sprint 21 approval |
| 23 | `2026-06-19-sprint-23-provenance-report-local-implementation.md` | local-advisory provenance report verification plan for manifest binding, drift detection, command evidence, domain hash classification, blocker state, and future protected CI handoff | Sprint 22 approval |
| 24 | `2026-06-19-sprint-24-ci-workflow-file-creation-after-approval.md` | approval-gated CI workflow file creation plan for repository initialization, workflow file creation, branch protection, command matrix, artifact upload policy, and protected CI handoff | Sprint 23 approval |
| 25 | `2026-06-19-sprint-25-git-and-workflow-initialization-after-approval.md` | approval-gated final execution plan for repository initialization, initial commit policy, workflow creation, branch-protection preparation, and protected CI handoff without performing those actions during plan-writing | Sprint 24 approval |
| 26 | `docs/implementation/giwa-git-and-workflow-initialization-execution.md` | approved local git initialization, initial source snapshot, workflow file creation, and branch-protection blocker record | Sprint 25 approval |
| 27 | `2026-06-19-sprint-27-protected-ci-run-and-release-provenance.md` | protected CI run and release provenance probe that records remote GitHub, pushed source, Actions status, branch protection, release approval, and rollback-owner blockers without pushing or deploying | Sprint 26 approval |
| 28 | `2026-06-19-sprint-28-github-remote-and-protected-ci-activation.md` | GitHub remote and protected CI activation plan for workflow hardening, remote/push/Actions/branch-protection approval gates, staging artifact handoff, and protected provenance blockers | Sprint 27 approval |
| 29 | `2026-06-19-sprint-29-github-remote-activation-after-user-approval.md` | approved GitHub private remote creation or reuse, push, real Actions observation, branch-protection attempt, and protected CI blocker recording without public hosting or deployment | Sprint 28 approval |
| 30 | `2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md` | GitHub Actions startup failure triage, minimal diagnostic workflow, branch policy blocker routing, third-party check-suite classification, and protected CI blocker updates | Sprint 29 approval |
| 31 | `2026-06-20-sprint-31-source-visibility-and-actions-runner-gate.md` | source visibility safety review, public repository conversion if safe, diagnostic workflow rerun, protected workflow rerun, and branch protection retry routing without public app hosting or deployment | Sprint 30 approval |
| 32 | `2026-06-20-sprint-32-github-billing-lock-and-protected-ci-rerun.md` | GitHub billing-lock evidence, post-billing protected CI rerun procedure, branch policy verification, protected artifact handoff gate, and staging blocker updates | Sprint 31 approval |
| 33 | `2026-06-20-sprint-33-staging-dry-run-preparation-under-billing-lock.md` | staging dry-run preparation packet under GitHub billing lock, host/runtime/storage/security/rollback gate alignment, and post-billing handoff without public hosting or deployment | Sprint 32 blocked-billing-lock |
| 34 | `2026-06-20-sprint-34-hosted-adapter-readiness-under-protected-ci-blocker.md` | hosted adapter readiness packet for runtime, env, storage, migration, backup, restore, rate, queue, observability, security, rollback, and partner gates without implementing or connecting hosted infrastructure | Sprint 33 blocked-protected-ci |
| 35 | `2026-06-20-sprint-35-post-billing-protected-ci-rerun-and-artifact-handoff.md` | post-billing protected CI rerun and artifact handoff plan, current billing-lock blocked state, source binding, required checks, and protected artifact metadata gates | Sprint 34 blocked-protected-ci |
| 36 | `2026-06-20-sprint-36-protected-ci-rerun-after-billing-unlock.md` | protected CI rerun gate after Sprint 35 handoff, current-main source binding, billing-lock recheck, zero-artifact blocker, and staging/hosted/partner no-go update | Sprint 35 blocked-billing-lock |
| 37 | `2026-06-20-sprint-37-protected-ci-dispatch-after-reported-billing-unlock.md` | protected CI dispatch after user-reported billing unlock, current-main check results, billing-lock annotation, zero-artifact handoff, and staging/hosted/partner no-go update | Sprint 36 blocked-billing-lock |
| 38 | `2026-06-20-sprint-38-hosted-adapter-local-contract-and-staging-simulation.md` | local-advisory hosted adapter contract, staging dry-run simulation, safe-track handoff, and external-only blocker register while protected CI remains billing-locked | Sprint 37 blocked-billing-lock-after-dispatch |
| 39 | `2026-06-20-sprint-39-commercial-hardening-and-partner-handoff-final-readiness.md` | commercial hardening, partner handoff final readiness, final demo packet refresh, and external-only blocker separation without touching protected CI | Sprint 38 local-advisory handoff |
| 40 | `2026-06-20-sprint-40-external-only-blocker-handoff-and-staging-readiness-freeze.md` | external-only blocker handoff, local staging-readiness freeze, bounded receipt API hardening, public copy hardening, safe-scan tightening, and current-main local-advisory evidence without touching protected CI | Sprint 39 local-advisory handoff |
| 41 | `2026-06-21-sprint-41-partner-customer-handoff-package-finalization.md` | partner/customer first-read handoff package, demo order alignment, evidence map refresh, acceptance closeout, blocker separation, and local-advisory evidence without touching protected CI | Sprint 40 local-advisory freeze |
| 42 | `2026-06-21-sprint-42-hosted-adapter-commercial-boundary-hardening.md` | hosted adapter commercial boundary hardening for storage, migration, backup, queue, rate, origin, tenant, logging, and failure blockers without connecting managed infrastructure | Sprint 41 local-advisory handoff |
| 43 | `2026-06-21-sprint-43-external-blocker-monitoring-and-staging-handoff.md` | external blocker monitoring, staging handoff freeze, restart conditions, evidence binding, and final local-advisory stop conditions without external execution | Sprint 42 local-advisory boundary |
| 44 | `2026-06-21-sprint-44-commercial-handoff-consistency-and-evidence-guard-hardening.md` | commercial handoff consistency, checked-in provenance drift guard, request safety, public artifact guard, and local-advisory evidence refresh without external execution | Sprint 43 local-advisory freeze |
| 45 | `2026-06-21-sprint-45-bounded-failure-redaction-and-handoff-alignment.md` | bounded verifier failure redaction, hosted request safety, public artifact credential scanning, telemetry value redaction, legacy snapshot replay boundary, and handoff copy alignment without external execution | Sprint 44 local-advisory hardening |
| 46 | `2026-06-21-sprint-46-public-boundary-final-hardening.md` | legacy verifier failure read-path redaction, readiness metadata category labels, public evidence JSON scanning, standard RPC block evidence wording, and historical chain-operation reference boundaries without external execution | Sprint 45 local-advisory hardening |
| 47 | `2026-06-21-sprint-47-client-side-public-error-copy-hardening.md` | client-side public error-copy bounding for static demo, demo control room, wallet, approve, deposit, verify, and live API fallback paths without external execution | Sprint 46 local-advisory hardening |
| 48 | `2026-06-26-sprint-48-commercial-user-facing-ux-design-spec.md` | design-only commercial user-facing UX spec for Action Page, wallet/network gate, intent preview, transaction progress, verified receipt, My Receipts, Help/Recovery, and surface separation without implementation or deployment | Sprint 47 local-advisory hardening |
| 49 | `2026-06-26-sprint-49-commercial-user-facing-ux-implementation-plan.md` | implemented local commercial `/user` route family, user-flow state/copy/receipt/recovery models, public route shell, tests, route mapping, and evidence without deployment | Sprint 48 design spec |
| 50 | `docs/evidence/commercial-user-flow-sprint50-visual-qa.json` | visual polish and responsive browser QA for the local commercial `/user` route family, static `/demo` bounded fallback projections, route regression smoke, and evidence without deployment | Sprint 49 implementation |
| 51 | `2026-06-26-sprint-51-lightsail-staging-architecture-and-cost-plan.md` | documentation-only Lightsail staging architecture, cost, sizing, deploy runbook draft, and go/no-go blocker plan without creating infrastructure or deploying | Sprint 50 visual QA |
| 52 | `2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md` | documentation-only Lightsail deploy preflight package for approval inputs, systemd/Nginx draft, runtime injection boundary, backup/restore gate, smoke list, rollback owner, and no-go blockers without creating infrastructure or deploying | Sprint 51 architecture plan |
| 53 | `2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md` | documentation-only Lightsail deploy execution plan for explicit approvals, provisioning order, artifact strategy, runtime setup, Nginx/HTTPS activation, smoke, evidence, rollback, and go/no-go without creating infrastructure or deploying | Sprint 52 preflight package |

## Sprint 0 Execution Artifacts

Sprint 0 fixes the workspace and evidence contract without installing dependencies or running GIWA Sepolia transactions.

- Workspace mode: non-git prototype mode when `Test-Path .\.git` returns `False`.
- Commit steps: inactive until the workspace is converted into a git-backed repository.
- Workspace scaffold: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `apps/web/package.json`, `packages/protocol/package.json`, and `packages/contracts/package.json`.
- Environment contract: `.env.example`, with server-only variables separated from public client-safe variables.
- Dependency gate: `docs/implementation/giwa-mvp-dependency-approval.md`.
- Role/key policy: `docs/implementation/giwa-mvp-role-and-key-policy.md`.
- Faucet/preflight gate: `docs/implementation/giwa-mvp-faucet-and-preflight.md`.
- Evidence schema: `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`.

## P0 Evidence Chain

`ProofKPI` means manifest-matched GIWA Sepolia testnet action evidence converted into partner-readable activation metrics.

The P0 MVP is complete only when this chain is proven:

```text
workspace scaffold and env contract approved
-> server-only official signed manifest
-> IntentSubmitted on GIWA Sepolia
-> approve/deposit on GIWA Sepolia
-> standard RPC block confirmation
-> verifier matched decision
-> IntentMatched on GIWA Sepolia
-> ProofKPI receipt
-> one-page partner summary
-> reproducible evidence.json
```

## Local Live MVP Extension

Sprint 8 starts the post-submission Live MVP path. Sprint 0 through Sprint 7 remain the recorded evidence baseline. Sprint 8 must preserve that baseline while adding local runtime state for fresh user runs.

Sprint 9 adds the wallet connection, GIWA Sepolia chain gate, and signed wallet-bound manifest preview on top of the Sprint 8 local live server.

The Sprint 8 and Sprint 9 exit gates do not require wallet approve or deposit transactions. Those belong to Sprint 10 after wallet and manifest issuance are implemented.

Sprint 10 enables browser-wallet approve and deposit transaction requests from the signed manifest preview. It stores wallet-returned transaction hashes but keeps verifier, decision, and receipt unlock behavior in Sprint 11.

Sprint 11 verifies stored live deposit transaction hashes through GIWA Sepolia standard RPC, creates a dynamic receipt only after deterministic match, and keeps later demo polish or submission refresh work outside the verifier boundary.

Sprint 12 hardens the live demo path, adds commit-safe live snapshot export, refreshes submission documents, and keeps the recorded Sprint 7 static demo as fallback.

Sprint 13 starts the commercial readiness foundation. It keeps the product local, GIWA Sepolia testnet-only, and single-flow while adding a commercial receipt gate, safer local API boundaries, partner metric gating, and explicit hosted-preview blockers. Sprint 13 does not make the live API public and does not expand the product into a multi-campaign dashboard.

Sprint 14 hardens verifier trust before any hosted API sprint. It keeps the local live MVP testnet-only, requires verifier input replay for `verifierInputHash` and public replay of `receiptHash`, and treats optional `IntentRailV2` anchoring as a decision anchor design rather than a deployment step. Sprint 14 must keep Sprint 13 hosted blockers in force until a separate plan approves any hosted-pilot changes.

Sprint 15 creates the hosted API foundation plan for runtime mode, auth context, tenant isolation, request safety, rate limits, verification jobs, repository/migration guards, health/readiness, and redacted observability. Sprint 15 does not expose the live API outside approved host policy and does not deploy a public hosted service.

Sprint 16 plans the commercial UX polish pass for the participant `/live` flow, commercial `/receipt/:hash` page, partner evidence packet, and local `/demo` operator control room. Sprint 16 is not a public hosting sprint and must preserve the Sprint 7 static fallback and Sprint 15 hosted API gates.

Sprint 17 plans hosted operations and partner beta readiness. It closes the environment contract, release gate, artifact promotion, observability, backup/restore, incident response, fresh rehearsal, static fallback, and partner beta runbooks before any staging deployment or public host can be approved. Sprint 17 does not deploy, public-host, connect external managed infrastructure, send wallet transactions, or run chain-operation commands.

Sprint 18 runs the controlled partner beta rehearsal package before staging deployment. It uses local live and static fallback surfaces to validate partner intake, reviewer opening order, evidence packet acceptance, dynamic receipt review, incident fallback, partner feedback, closeout, and the Sprint 19 staging blocker register. Sprint 18 does not public-host, deploy, connect external managed infrastructure, send wallet transactions from server or scripts, or run chain-operation commands.

Sprint 19 plans staging deployment preparation gates. It turns the Sprint 18 blocker register into source provenance, host policy, environment contract, storage, observability, security, rollback, and partner promotion gates before any staging dry-run can begin. Sprint 19 does not public-host, deploy, connect managed infrastructure, send wallet transactions, run chain-operation commands, or install dependencies.

Sprint 20 plans CI and source provenance before hosted adapter work or staging dry run. It keeps `.git` and `.github` creation outside plan-writing, defines future protected CI checks, hash manifests, lockfile rules, redacted scans, release approval, and no-rebuild promotion. Sprint 20 does not initialize git, create workflow files, deploy, public-host, connect managed infrastructure, send wallet transactions, run chain-operation commands, or install dependencies.

Sprint 21 plans CI workflow implementation while keeping repository creation and workflow-file creation behind separate user approval gates. It defines local advisory checks versus protected CI, planned workflow jobs, artifact manifest and provenance report schemas, branch protection, release approval, failure triage, and rollback routing. Sprint 21 plan-writing does not create `.git`, `.github`, workflow files, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, fake CI artifacts, or dependencies.

Sprint 21 execution adds documentation-only dry-run artifacts for the CI workflow draft, local CI simulation, provenance artifact manifest, release approval checklist, and CI failure triage. These artifacts do not create `.git`, `.github`, workflow files, protected CI, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, fake CI artifacts, or dependencies.

Sprint 22 plans the local-advisory artifact manifest implementation. It keeps source and protected CI provenance blocked while defining deterministic public artifact inventory, hash policy, redacted scanning, local provenance report output, failure triage, and the later protected CI integration path.

Sprint 22 execution adds local-advisory outputs at `docs/evidence/local-artifact-manifest.json` and `docs/evidence/local-provenance-report.json`. These outputs do not create `.git`, `.github`, workflow files, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, fake CI artifacts, or dependencies.

Sprint 23 plans local provenance report verification around the Sprint 22 outputs. It keeps artifact inventory generation intact while adding report recomputation, timestamp-aware drift checks, external report hashing, scanner binding, local command evidence binding, domain hash classification, known blocker state, and protected CI handoff fields. Sprint 23 planning does not create `.git`, `.github`, workflow files, CI scripts, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, fake CI artifacts, or dependencies.

Sprint 23 execution adds local-advisory verification outputs at `docs/evidence/local-command-evidence-report.json`, `docs/evidence/local-provenance-report.json.sha256`, and `docs/evidence/local-provenance-verification.json`. It upgrades `docs/evidence/local-provenance-report.json` to the nested Sprint 23 report contract. These outputs verify local manifest binding, drift, sidecar, scan, command catalog, domain hash, and known blocker consistency. They do not create `.git`, `.github`, workflow files, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, fake CI artifacts, dependencies, or protected CI provenance.

Sprint 24 plans CI workflow file creation after explicit approval. It separates repository initialization, `.github/workflows` file creation, and branch protection into distinct approval gates while preserving Sprint 22/23 local-advisory provenance. Sprint 24 planning does not create `.git`, `.github`, workflow files, CI scripts, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, fake CI artifacts, dependencies, or protected CI provenance.

Sprint 24 execution adds documentation-only approval packets at `docs/implementation/giwa-git-initialization-approval.md`, `docs/implementation/giwa-ci-workflow-creation-approval.md`, `docs/implementation/giwa-branch-protection-approval.md`, and `docs/implementation/giwa-ci-workflow-yaml-draft.md`. These artifacts preserve the same blocked state: no `.git`, `.github`, workflow file, CI script, public hosting, deployment, managed infrastructure, wallet action, chain-operation command, fake CI artifact, dependency change, or protected CI provenance is created.

Sprint 25 plans the final approved execution path for repository initialization, initial commit, workflow creation, and branch-protection preparation. It keeps each action behind a separate explicit approval record and does not create `.git`, `.github`, workflow files, CI scripts, commits, branches, tags, remotes, pushes, protected checks, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, fake CI artifacts, dependency changes, or protected CI provenance during plan-writing.

Sprint 25 execution without the four explicit approvals remains a readiness-only pass. It adds `docs/implementation/giwa-git-and-workflow-initialization-readiness.md`, `docs/implementation/giwa-initial-commit-file-policy.md`, `docs/implementation/giwa-workflow-creation-preflight.md`, and `docs/implementation/giwa-protected-ci-transition-checklist.md`. These documents record the blocked approval gates, first-commit file policy, workflow creation preflight, exact required checks, local-advisory to protected-CI transition rules, and rollback/cleanup boundaries without creating `.git`, `.github`, workflow files, CI scripts, commits, branches, tags, remotes, pushes, protected checks, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, fake CI artifacts, dependency changes, or protected CI provenance.

Sprint 26 executes the approved local git and workflow initialization path. It records `docs/implementation/giwa-git-and-workflow-initialization-execution.md`, creates `.github/workflows/ci.yml`, and creates an initial local source snapshot. Sprint 26 does not push, configure remotes, public-host, deploy, connect managed infrastructure, send wallet actions, run chain-operation commands, install dependencies, create release tags, upload CI artifacts, or claim protected CI provenance. Branch protection and required checks remain blocked until a remote GitHub repository, push approval, real workflow run, and exact required-check statuses exist.

Sprint 27 probes the protected CI and release provenance transition after Sprint 26. It records that local git and `.github/workflows/ci.yml` exist, verifies the absence of a configured remote and real GitHub Actions statuses, refreshes local-advisory provenance, updates release/blocker documents, and keeps protected CI, branch protection, release approval, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, and dependency installation blocked.

Sprint 28 plans the GitHub remote and protected CI activation path. It can harden the local workflow with CI guard scripts and future protected artifact handoff metadata, but remote add, push, Actions dispatch or reliance, branch protection, artifact upload, release approval, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, and dependency installation remain gated by explicit external approval.

Sprint 29 executes the approved private GitHub remote activation path. It may create or reuse `aop60003/giwa-verified-intent-rail` as a private repository, add `origin`, push `main`, observe the real `ci-source-provenance` workflow, and attempt branch protection after matching check names exist. Sprint 29 does not public-host, deploy, connect managed infrastructure, read env contents, output credentials, send wallet actions, run chain-operation commands, install dependencies, create release tags, or claim staging promotion from incomplete GitHub evidence.

Sprint 30 diagnoses the GitHub Actions `startup_failure` state observed after Sprint 29. It may add a minimal diagnostic workflow to separate repository/account/platform startup gates from protected workflow YAML or runner issues. Sprint 30 keeps branch protection blocked unless a GitHub plan, repository visibility, or approved substitute source-control policy changes. It does not public-host, deploy, connect managed infrastructure, read env contents, output credentials, send wallet actions, run chain-operation commands, install dependencies, create release tags, or claim protected CI provenance before real job/check contexts exist.

Sprint 31 tests whether source repository visibility is the remaining Actions and branch-protection gate. It may convert the GitHub source repository to public only after source-safety scans pass. Public source visibility is not public app hosting or deployment. Sprint 31 still does not deploy, connect managed infrastructure, read env contents, output credentials, send wallet actions, run chain-operation commands, install dependencies, create release tags, or claim protected CI provenance before real GitHub checks pass.

Sprint 32 records the GitHub account billing lock as the remaining protected CI blocker and defines the exact rerun procedure for after billing is resolved outside the repository. Sprint 32 keeps branch protection configured, keeps staging promotion blocked while checks fail, and does not deploy, connect managed infrastructure, read env contents, output credentials, send wallet actions, run chain-operation commands, install dependencies, create release tags, or claim protected CI before required checks pass.

Sprint 33 prepares the staging dry-run packet while the GitHub account billing lock remains open. It records host/runtime/storage/security/rollback/partner go/no-go gates, keeps local static and live rehearsal evidence advisory only, and defines the post-billing protected CI and artifact handoff before any public hosting or deployment. Sprint 33 does not deploy, connect managed infrastructure, read env contents, output credentials, send wallet actions, run chain-operation commands, install dependencies, create release tags, or claim protected CI before required checks pass.

Sprint 34 prepares the hosted adapter readiness packet while protected CI remains blocked. It defines adapter selection, process-env activation, redacted readiness, migration guard, backup catalog, restore drill, rate-limit and queue durability, observability, security, rollback, partner, and commercial gates. Sprint 34 does not implement an adapter, connect managed infrastructure, read env contents, output credentials, send wallet actions, run chain-operation commands, install dependencies, public-host, deploy, create release tags, or claim protected CI before required checks pass.

Sprint 35 records the post-billing protected CI rerun and artifact handoff path while billing unlock remains unconfirmed. It preserves the current source-binding gap between `main` and the latest real Actions run, keeps rerun execution blocked, and defines the protected artifact metadata required before release approval, staging dry-run execution, hosted adapter implementation, partner promotion, public hosting, or deployment. Sprint 35 does not rerun workflows, connect managed infrastructure, read env contents, output credentials, send wallet actions, run chain-operation commands, install dependencies, create release tags, or claim protected CI before required checks pass.

Sprint 36 rechecks the protected CI rerun gate after the Sprint 35 blocked handoff commit. Billing unlock is still not evidenced, current `main` is `30eddb3da26ca6cf8302d1396bd8f5fbe61759c1`, the latest real Actions run remains `27850867132` on `779b63878b37c3b4f3792dd67718ea5bb3e9d92b`, and no rerun or workflow dispatch is executed. Sprint 36 keeps protected CI, protected artifacts, release approval, staging dry-run execution, hosted adapter implementation, partner promotion, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, dependency installation, release tags, and protected provenance claims blocked.

Sprint 37 dispatches the protected workflow on current `main` after the user reports the GitHub billing/account gate is unlocked. The dispatch creates run `27852941488` on `b769003e733a83faa70b57b4c0bda6ac26821044`, but GitHub still reports that the account is locked due to a billing issue. `source-provenance` fails before runner steps, nine downstream required jobs are skipped, Actions artifact count is zero, and protected CI, protected artifacts, release approval, staging dry-run execution, hosted adapter implementation, partner promotion, public hosting, deployment, managed infrastructure, wallet actions, chain-operation commands, dependency installation, release tags, and protected provenance claims remain blocked.

Sprint 38 records the next safe-track handoff after the billing annotation repeats on run `27873338373` for `2b414c91b1da6ed64287dbf7b2635be7586e287d`. It does not dispatch or rerun protected CI. It adds local evaluators for hosted adapter contract status and staging dry-run simulation, writes public-safe handoff evidence, and keeps the authority `local-advisory` until protected CI passes and protected artifact metadata exists.

Sprint 39 closes the commercial hardening and partner handoff safe track. It refreshes the final demo order, partner handoff packet, acceptance checklist, submission evidence map, commercial readiness gate, and blocker register against Sprint 38 evidence while recording current `main` check-runs count `0` and keeping protected CI as an external GitHub account blocker.

Sprint 40 freezes the maximum safe local handoff package after Sprint 39. It records freeze input `afe0bf50022717f8011fd7691b00ce0a8af90802` with zero check-runs, keeps the latest billing-lock run stale for that input source, hardens bounded receipt and public copy guardrails, and separates remaining blockers into external-only and mixed repo/workflow gates. Sprint 40 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 41 finalizes the partner/customer first-read handoff package after the Sprint 40 freeze. It aligns README, demo script, runbook, acceptance checklist, submission evidence map, closeout template, blocker register, and public-safe evidence around one opening order and one blocker story. Sprint 41 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 42 hardens the hosted adapter commercial boundary after the Sprint 41 handoff. It adds local-advisory code and evidence that separate external approval blockers, mixed repo/workflow blockers, and local contract blockers for storage, migration, backup, queue, rate, origin, tenant, logging, rollback, and failure handling. Sprint 42 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 43 freezes the external blocker monitoring and staging handoff state after Sprint 42. It binds Sprint 40, Sprint 41, and Sprint 42 evidence into one monitorable handoff, names exact resume conditions for protected CI, partner/customer signoff, hosting approval, managed infrastructure approval, branch protection satisfaction, artifact metadata, and release approval, and records that no further internal safe-track work is known. Sprint 43 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 44 hardens the already frozen local handoff by fixing first-read document order, adding checked-in provenance and handoff evidence regression tests, rejecting missing JSON content type for POST API requests, and rejecting credential-like public artifact string values. Sprint 44 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 45 hardens bounded verifier failure handling and the local-advisory handoff boundary after Sprint 44. It redacts non-canonical verifier failure strings before API response and persistence, rejects missing hosted origins and invalid JSON-like media types, expands public artifact and telemetry credential marker coverage, records the retained Sprint 12 live snapshot as a legacy replay-boundary artifact instead of synthesizing verifier input fields, and clarifies recorded wallet evidence copy. Sprint 45 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 46 hardens public boundaries after Sprint 45. It redacts legacy verifier failure values on read paths, reports readiness with category labels and counts instead of raw config names, scans public evidence JSON, renames public model fields to standard RPC block evidence wording, and marks historical chain-operation docs as reference-only for the current handoff. Sprint 46 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 47 hardens client-side public error copy after Sprint 46. It adds a public-copy guard against raw browser exception fallback strings and replaces static demo, demo control room, wallet, approve, deposit, verify, and live API fallback notices with bounded public copy. Sprint 47 does not dispatch or rerun protected CI, public-host, deploy, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, create release tags, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 48 defines the commercial user-facing UX after the local-review handoff. It creates `docs/superpowers/specs/2026-06-26-commercial-user-facing-ux-design.md` and `docs/superpowers/plans/2026-06-26-sprint-48-commercial-user-facing-ux-design-spec.md` to separate future general user screens from partner/reviewer and operator/admin surfaces. Sprint 48 does not implement UI, create new public assets, deploy, dispatch or rerun protected CI, connect managed infrastructure, read env file contents, output credential values, send wallet actions, run chain-operation commands, install dependencies, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 49 implements the commercial user-facing UX after Sprint 48. It adds `apps/web/public/user.html`, `apps/web/public/user-flow.js`, user-flow state/copy/receipt/recovery models and tests, route mapping for `/user`, `/user/receipt/<hash>`, `/user/receipts`, and `/user/help`, and `docs/evidence/commercial-user-flow-sprint49.json`. Sprint 49 preserves `/`, `/live`, `/demo`, `/partner`, and `/receipt/<hash>`. Sprint 49 does not deploy, dispatch or rerun protected CI, connect managed infrastructure, read env file contents, output credential values, send wallet actions from server/scripts, run chain-operation commands, install dependencies, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 50 polishes and verifies the commercial user-facing UX after Sprint 49. It tightens `apps/web/public/user-flow.js` and `apps/web/public/styles.css`, adds focused visual regression tests, records desktop/mobile browser smoke screenshots, adds bounded static `/demo` local projections for quiet route regression smoke, and writes `docs/evidence/commercial-user-flow-sprint50-visual-qa.json`. Sprint 50 preserves `/`, `/live`, `/demo`, `/partner`, and `/receipt/<hash>`. Sprint 50 does not deploy, dispatch or rerun protected CI, connect managed infrastructure, read env file contents, output credential values, send wallet actions from server/scripts, run chain-operation commands, install dependencies, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 51 plans the future Lightsail staging path after Sprint 50. It writes `docs/superpowers/plans/2026-06-26-sprint-51-lightsail-staging-architecture-and-cost-plan.md`, `docs/implementation/giwa-lightsail-staging-architecture.md`, `docs/implementation/giwa-lightsail-cost-and-sizing.md`, `docs/implementation/giwa-lightsail-deploy-runbook-draft.md`, and `docs/evidence/lightsail-staging-plan-sprint51.json`. Sprint 51 recommends a Ubuntu Lightsail instance with Node static/live services behind Nginx, compares HTTPS options, separates minimum staging, beta, and production candidate sizing, and keeps AWS account, domain, credential injection, backup/restore, protected CI or approved exception, partner signoff, and release approval blocked. Sprint 51 does not create AWS resources, public-host, deploy, configure DNS or HTTPS, connect managed infrastructure, read env file contents, output credential values, send wallet actions from server/scripts, run chain-operation commands, install dependencies, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 52 turns the Sprint 51 Lightsail path into a deploy preflight package. It writes `docs/superpowers/plans/2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md`, `docs/implementation/giwa-lightsail-staging-preflight-checklist.md`, `docs/implementation/giwa-lightsail-systemd-and-nginx-draft.md`, `docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md`, `docs/implementation/giwa-lightsail-backup-restore-preflight.md`, and `docs/evidence/lightsail-staging-preflight-sprint52.json`. Sprint 52 records required external inputs, `giwa-static.service` and `giwa-live.service` draft shapes, Nginx route ownership, server-only runtime variable names, public-safe categories, SQLite staging limitations, restore drill gates, smoke tests, rollback triggers, and no-go criteria. Sprint 52 does not create AWS resources, public-host, deploy, configure DNS or HTTPS, connect managed infrastructure, read env file contents, output credential values, send wallet actions from server/scripts, run chain-operation commands, install dependencies, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

Sprint 53 turns the Sprint 52 preflight package into a deploy execution plan after explicit approval. It writes `docs/superpowers/plans/2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md`, `docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md`, `docs/implementation/giwa-lightsail-staging-smoke-and-rollback-plan.md`, and `docs/evidence/lightsail-staging-deploy-execution-plan-sprint53.json`. Sprint 53 records the future sequence for selected commit verification, Lightsail instance creation, runtime installation, source or artifact fetch, app build or unpack, runtime injection, systemd, Nginx, HTTPS, route smoke, evidence capture, rollback, and go/no-go. Sprint 53 does not create AWS resources, public-host, deploy, configure DNS or HTTPS, connect managed infrastructure, read env file contents, output credential values, send wallet actions from server/scripts, run chain-operation commands, install dependencies, invent CI results, invent partner signoff, invent staging URLs, or claim protected CI provenance.

## Global Stop Conditions

Stop and ask for direction if any of these happens:

- workspace mode is unclear
- root workspace scaffold or `@giwa/web` scaffold is missing before a sprint references it
- dependency approval is missing
- required private keys are not available in local env
- private keys, RPC tokens, bearer tokens, mnemonics, or API keys are logged, committed, exposed to the client bundle, or copied into evidence files
- GIWA Sepolia RPC or explorer behavior differs from the strategy document
- a sprint tries to expand beyond one campaign, one mission, one mock token, one mock vault, and one receipt flow
- Flashblocks is being used as final confirmation evidence
- receipt is shown before verifier status is `matched`
- partner summary expands into a dashboard

## Global Verification Commands

Before closing any documentation-only sprint:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("preconfirmed succ" + "ess") + "|" + ("payment set" + "tled") + "|" + ("real f" + "unds")
$secretPattern = "0x[a-fA-F0-9]{64}|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|NEXT_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"
rg -n $docPattern 03_giwa_verified_intent_rail_positioning.md README.md docs/superpowers/plans -g "2026-06-16-*.md"
rg -n $riskPattern 03_giwa_verified_intent_rail_positioning.md README.md docs/superpowers/plans -g "2026-06-16-*.md"
rg -n $secretPattern . -g "*.md" -g "*.json" -g "*.ts" -g "*.tsx" -g "!*.env*" -g "!docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md"
```

Expected:

```text
Unfinished-marker matches appear only in repository policy examples.
Risk-phrase matches appear only in explicit guardrail or forbidden-claim sections.
Secret matches contain no live secret values; pattern definitions and guardrails are allowed only when clearly marked.
Do not run content-printing `rg -n` against real `.env` files. Real env files must be checked only by a redacted scanner that reports file path, match type, and count without printing secret values.
```

## Handoff Rule

Each sprint handoff must include:

- files changed
- commands run
- evidence produced
- artifacts produced and artifacts consumed
- unresolved risks
- explicit next sprint document path
- exit approval block in this shape:

```text
Sprint N exit approval:
approvedBy=<user or role>
approvedAt=<YYYY-MM-DD>
evidencePath=<path>
nextSprint=<path>
```

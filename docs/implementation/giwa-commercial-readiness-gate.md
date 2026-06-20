# GIWA Commercial Readiness Gate

## Scope

`GIWA Verified Intent Rail` is commercial-ready only for a managed GIWA Sepolia testnet activation evidence pilot.

The supported pilot shape is:

- one partner
- one campaign
- one mission
- one GIWA Sepolia mock vault action
- one matched-only receipt flow
- one partner evidence packet

Sprint 13 does not make the local live API a hosted public service.

## Receipt Gate

Commercial receipt access requires:

- run status `matched`
- terminal verifier decision `matched`
- no verifier failure reason
- decision receipt hash equals the stored receipt hash
- decision intent hash equals the stored receipt intent hash
- run intent hash equals the stored receipt intent hash
- receipt payload parses as a JSON object
- standard RPC evidence was used for the final verifier decision
- Flashblocks was not used as final confirmation

All other states stay locked, including `depositSubmitted`, `timeout`, `mismatched`, `failed`, missing decision, missing receipt, and receipt/decision mismatch.

## API Safety Boundary

The local live API returns bounded error codes. Unknown storage, provider, or runtime failures are mapped to `internal_error` and must not expose raw upstream messages.

The local live server rejects oversized API request bodies and malformed JSON before calling the live API handler. It does not log raw request bodies.

## Hosted Blockers

Do not expose the live API outside localhost until these gates exist:

- authentication
- tenant isolation
- exact origin policy
- request body limits
- rate limits
- bounded error responses
- redacted structured logs
- durable storage policy
- backup and restore policy
- partner data retention policy

## Hosted API Foundation Gate

Sprint 15 is the implementation plan for the hosted API foundation:

```text
docs/superpowers/plans/2026-06-19-sprint-15-hosted-api-foundation.md
```

The hosted foundation must prove:

- runtime mode separation for `local`, `staging-testnet`, and `prod-testnet`
- `prod-testnet` rejects mock mode
- tenant id comes from auth context, not request body
- partner run and receipt APIs are tenant-scoped
- request body, method, origin, and malformed JSON failures return bounded public error codes
- rate limits exist for request source, credential, tenant, wallet, and verify paths
- verification can be enqueued and replayed without duplicate RPC verifier fanout
- repository and migration guards fail closed on incompatible local DB schemas
- health and readiness responses are redacted
- structured logs include request ids and bounded event names only

This gate does not authorize public hosting by itself. Public hosting still requires an approved deployment plan, durable storage policy, backup and restore policy, and operational owner.

Sprint 15 implements the local foundation for this gate. Remaining hosted pilot blockers are:

- approved deployment target
- durable managed storage adapter
- backup and restore procedure
- operational owner and incident path
- exact partner onboarding process for hosted credentials
- retention and deletion policy for partner evidence packets

## Pilot Stop Conditions

Stop the pilot path if a workflow asks for wallet secrets, prints local env values, opens receipts before `matched`, treats Flashblocks as final confirmation, or expands the product into production asset, production yield, settlement, identity/KYC service, phishing-prevention, or safety-guarantee claims.

## Evidence Boundary

Public evidence may include public wallet addresses, public transaction hashes, receipt hashes, verifier input hashes, block numbers, block hashes, and commit-safe JSON snapshots.

Public evidence must not include private keys, mnemonics, bearer tokens, RPC tokens, API keys, local env file contents, or server-only configuration values.

## Sprint 14 Verifier Replay Gate

Commercial receipt access also requires Sprint 14 verifier input replay checks when those fields are present:

- recovered manifest signer equals the configured campaign signer
- EIP-712 domain uses GIWA Sepolia `91342` and the deployed `IntentRail` verifying contract
- recomputed manifest `intentHash` equals the stored run `intentHash`
- recomputed `verifierInputHash` equals the stored decision `verifierInputHash`
- recomputed `receiptHash` equals the stored receipt hash
- confirmation and expiry checks use standard RPC block data
- decoded evidence is derived from raw standard RPC receipt logs

## Optional Decision Anchor

The commercial pilot does not require an on-chain decision anchor when public evidence can recompute `intentHash`, `verifierInputHash`, and `receiptHash`.

If a future pilot enables an anchor, the gate must also check that the anchored `verifierInputHash` equals the stored verifier input hash.

## Commercial UX Polish Gate

Sprint 16 implements the commercial UX polish pass:

```text
docs/superpowers/plans/2026-06-19-sprint-16-commercial-ux-polish.md
```

The UX polish improves participant, receipt, partner, and operator readability, but it must not weaken the receipt gate. Receipt pages, partner packet rows, and live snapshot exports remain matched-only. Unknown, pending, mismatched, failed, timeout, missing-decision, missing-receipt, and replay-mismatch states stay locked.

The `/demo` control room is a local reviewer surface only. It uses safe projections and must not expose signed manifest internals, server-only values, raw env values, or unbounded upstream errors.

## Hosted Ops and Partner Beta Gate

Sprint 17 implements hosted operations and partner beta readiness documents:

```text
docs/superpowers/plans/2026-06-19-sprint-17-hosted-ops-and-partner-beta.md
docs/implementation/giwa-hosted-ops-runbook.md
docs/implementation/giwa-partner-beta-runbook.md
docs/implementation/giwa-incident-response.md
docs/implementation/giwa-evidence-retention-policy.md
```

Hosted beta remains blocked until these gates pass:

- environment contract for `local`, `staging-testnet`, and `prod-testnet`
- `prod-testnet` mock mode blocked
- public host policy approved
- release gate checklist complete
- CI and artifact promotion provenance available
- static fallback gate passes
- live read-only smoke gate passes
- matched-only commercial receipt gate passes
- verifier replay gate passes
- observability and alert model approved
- backup/restore drill approved
- evidence archive and retention policy approved
- incident response owner assigned
- partner beta intake and closeout process approved

Sprint 17 does not authorize public hosting, deployment, external storage connection, cloud credential management, wallet actions, or chain-operation commands.

## Sprint 18 Partner Rehearsal Gate

Sprint 18 executes the partner rehearsal package:

```text
docs/superpowers/plans/2026-06-19-sprint-18-partner-beta-rehearsal.md
docs/implementation/giwa-partner-beta-rehearsal-runbook.md
docs/implementation/giwa-partner-beta-rehearsal-checklist.md
docs/implementation/giwa-partner-beta-feedback-form.md
docs/implementation/giwa-partner-beta-closeout-report.md
```

Commercial readiness does not advance until the closeout report confirms:

- one partner, one campaign, one mission, one GIWA Sepolia mock vault action
- dynamic receipt reviewed only after `matched`
- static fallback labeled as recorded GIWA Sepolia testnet evidence
- evidence packet includes public fields only
- partner feedback captured without invented answers
- incident and fallback drill captured
- Sprint 19 blockers assigned to owners

## Sprint 19 Staging Gate

Staging preparation remains blocked until source provenance, protected CI path, artifact checksum manifest, host owner, exact origin policy, hosted auth, tenant isolation, request limits, rate limits, bounded errors, redacted logs, durable state, migration guard, backup/restore drill, retention owner, incident owner, and partner signoff are approved.

The Sprint 19 plan is:

```text
docs/superpowers/plans/2026-06-19-sprint-19-staging-deployment-preparation.md
```

Sprint 19 execution gates are:

```text
docs/implementation/giwa-staging-deployment-preparation.md
docs/implementation/giwa-staging-release-provenance.md
docs/implementation/giwa-staging-env-contract.md
docs/implementation/giwa-staging-storage-and-restore.md
docs/implementation/giwa-staging-observability.md
docs/implementation/giwa-staging-security-boundary.md
docs/implementation/giwa-staging-rollback-and-incident-drill.md
docs/implementation/giwa-staging-partner-promotion-gate.md
docs/implementation/giwa-staging-blocker-register.md
```

Commercial readiness does not advance to staging dry run while the Sprint 19 blocker register remains open.

## Sprint 20 CI and Source Provenance Gate

The Sprint 20 CI/source plan is:

```text
docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md
```

Commercial readiness remains blocked until source provenance, protected CI, lockfile policy, artifact hashes, redacted scans, release approval, and no-rebuild promotion are proven from a git-backed source.

## Sprint 21 CI Workflow Implementation Gate

The Sprint 21 CI workflow implementation plan is:

```text
docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md
```

Commercial readiness remains blocked until repository transition, workflow-file creation, branch protection, required checks, artifact manifest generation, provenance report generation, safe scans, and release approval are proven by protected CI from an immutable source commit. Local checks remain advisory and must not be treated as release provenance.

Sprint 21 dry-run artifacts are:

```text
docs/implementation/giwa-ci-workflow-draft.md
docs/implementation/giwa-local-ci-simulation.md
docs/implementation/giwa-provenance-artifact-manifest.md
docs/implementation/giwa-release-approval-checklist.md
docs/implementation/giwa-ci-failure-triage.md
```

These documents do not authorize staging promotion, public hosting, deployment, managed infrastructure, wallet actions, or GIWA chain-operation commands.

## Sprint 22 Artifact Manifest Gate

The Sprint 22 local artifact manifest plan and outputs are:

```text
docs/superpowers/plans/2026-06-19-sprint-22-artifact-manifest-local-implementation.md
docs/evidence/local-artifact-manifest.json
docs/evidence/local-provenance-report.json
```

Commercial readiness remains blocked until protected CI later regenerates equivalent artifact and provenance evidence from git-backed source. Sprint 22 local outputs are useful for drift detection and public artifact review only.

## Sprint 23 Provenance Verification Gate

Sprint 23 local outputs are:

```text
docs/evidence/local-command-evidence-report.json
docs/evidence/local-provenance-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
```

Commercial readiness remains blocked until protected CI later repeats the report verification from git-backed source and binds immutable source commit, required check enforcement, artifact digest, release approval, and rollback metadata. Sprint 23 local verification is useful for report consistency, drift detection, command catalog review, public scan review, and domain hash classification only.

## Sprint 24 CI Workflow Approval Gate

Sprint 24 approval documents are:

```text
docs/implementation/giwa-git-initialization-approval.md
docs/implementation/giwa-ci-workflow-creation-approval.md
docs/implementation/giwa-branch-protection-approval.md
docs/implementation/giwa-ci-workflow-yaml-draft.md
```

Commercial readiness remains blocked until repository initialization, workflow file creation, branch protection, required checks, artifact upload, and rollback routing are approved and proven by protected CI from immutable source. Sprint 24 documents do not authorize public hosting, deployment, managed infrastructure, wallet actions, or GIWA chain-operation commands.

## Sprint 25 Git And Workflow Readiness Gate

Sprint 25 readiness documents are:

```text
docs/implementation/giwa-git-and-workflow-initialization-readiness.md
docs/implementation/giwa-initial-commit-file-policy.md
docs/implementation/giwa-workflow-creation-preflight.md
docs/implementation/giwa-protected-ci-transition-checklist.md
```

Commercial readiness remains blocked until repository initialization, initial commit, workflow creation, and branch protection are each explicitly approved and protected CI regenerates artifact and provenance evidence from immutable source. Sprint 25 readiness documents do not authorize public hosting, deployment, managed infrastructure, wallet actions, or GIWA chain-operation commands.

## Sprint 26 Git And Workflow Initialization Gate

Sprint 26 execution record:

```text
docs/implementation/giwa-git-and-workflow-initialization-execution.md
```

Sprint 26 creates local git source provenance and `.github/workflows/ci.yml`. Commercial readiness remains blocked until a remote GitHub workflow run, exact required-check statuses, branch protection, protected artifact generation, release approval, and rollback owner are recorded. Sprint 26 does not authorize public hosting, deployment, managed infrastructure, wallet actions, or GIWA chain-operation commands.

## Sprint 27 Protected CI Run And Release Provenance Gate

Sprint 27 execution record:

```text
docs/implementation/giwa-protected-ci-run-and-release-provenance.md
```

Sprint 27 records that the local git repository and workflow file exist, but commercial readiness remains blocked because there is no configured GitHub remote, pushed source commit, GitHub Actions run id, exact required-check status set, branch protection evidence, protected artifact generation, release owner approval, or rollback owner. Sprint 27 does not authorize public hosting, deployment, managed infrastructure, wallet actions, or GIWA chain-operation commands.

## Release Gate Checklist

The hosted ops release gate is documented in:

```text
docs/implementation/giwa-hosted-ops-runbook.md
```

The release gate must not include verifier-chain, deploy, fund, anchor, mint, or wallet-action commands.

## Sprint 33 Billing-Lock Boundary

Sprint 33 does not change commercial readiness. The dry-run preparation packet is advisory while:

```text
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
```

Any manual local rehearsal under Sprint 33 is a control rehearsal only. It is not commercial readiness, not a public staging launch, not release approval, and not protected provenance.

## Sprint 34 Hosted Adapter Readiness Gate

Sprint 34 readiness remains advisory:

```text
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
protectedCI=blocked-billing-lock
commercialReadiness=blocked
```

Commercial readiness requires a later protected-CI-backed adapter implementation and release approval. A readiness packet alone cannot authorize partner traffic, public hosting, deployment, managed infrastructure, wallet actions, or chain-operation commands.

## Sprint 35 Rerun Handoff Gate

Sprint 35 does not change commercial readiness:

```text
billingUnlockConfirmed=false
rerunExecuted=false
noActionsRunForCurrentMain=true
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUploadImplemented=false
releaseApproval=blocked
commercialReadiness=blocked
```

Commercial readiness remains blocked until protected CI passes on the intended source commit, protected artifact metadata exists, release and rollback owners approve, and staging/hosted/partner gates are green.

## Sprint 38 Safe-Track Handoff Gate

Sprint 38 adds local-advisory evaluators and handoff evidence:

```text
docs/superpowers/plans/2026-06-20-sprint-38-hosted-adapter-local-contract-and-staging-simulation.md
docs/implementation/giwa-hosted-adapter-local-contract.md
docs/implementation/giwa-staging-dry-run-simulation.md
docs/evidence/staging-readiness-sprint38-handoff.json
```

Commercial readiness remains blocked:

```text
latestWorkflowRunId=27873338373
latestWorkflowRunConclusion=failure
source-provenance=failure
downstreamRequiredJobs=9-skipped
workflowRunArtifactTotalCount=0
protectedCI=blocked-billing-lock-after-dispatch
hostedAdapterLocalContract=blocked-local-advisory
stagingDryRunSimulation=blocked-local-advisory
commercialReadiness=blocked
```

The Sprint 38 local contract and simulation do not authorize partner traffic, public hosting, deployment, managed infrastructure, wallet actions, or GIWA chain-operation commands.

## Sprint 39 Commercial Handoff Gate

Sprint 39 closes the local-advisory commercial hardening and partner handoff packet:

```text
docs/superpowers/plans/2026-06-20-sprint-39-commercial-hardening-and-partner-handoff-final-readiness.md
docs/implementation/giwa-commercial-hardening-and-partner-handoff-final-readiness.md
docs/evidence/commercial-readiness-sprint39-final-handoff.json
```

Commercial readiness remains blocked:

```text
currentMain=042d58ddabdf16426c4b870c2c63be2bd406a68f
currentMainCheckRuns=0
latestBillingLockRun=27873338373
protectedCI=blocked-external-github-account
protectedArtifactMetadata=mixed-repo-workflow-blocker
partnerSignoffPresent=false
externalHostingApproved=false
managedInfrastructureConnected=false
commercialReadiness=blocked
```

The local packet can be reviewed by a partner or operator, but it does not authorize partner traffic, public hosting, deployment, managed infrastructure, wallet actions, GIWA chain-operation package commands, or protected CI provenance claims.

## Sprint 40 Local Readiness Freeze Gate

Sprint 40 freezes the maximum safe local-advisory package:

```text
docs/superpowers/plans/2026-06-20-sprint-40-external-only-blocker-handoff-and-staging-readiness-freeze.md
docs/implementation/giwa-external-only-blocker-handoff-and-staging-readiness-freeze.md
docs/evidence/commercial-readiness-sprint40-freeze.json
```

Commercial readiness remains blocked:

```text
freezeInputMain=afe0bf50022717f8011fd7691b00ce0a8af90802
currentMainCheckRuns=0
latestBillingLockRun=27873338373
protectedCI=blocked-external-github-account
protectedArtifactMetadata=mixed-repo-workflow-blocker
partnerSignoffPresent=false
externalHostingApproved=false
managedInfrastructureConnected=false
commercialReadiness=blocked
```

The Sprint 40 packet is ready for local review and operator handoff only. It does not authorize partner traffic, public hosting, deployment, managed infrastructure, wallet actions, GIWA chain-operation package commands, or protected CI provenance claims. Protected CI evidence for current `main`, protected artifact metadata, branch-protection satisfaction, and release approval remain mixed repository/workflow blockers after the external GitHub account gate clears.

# GIWA Staging Deployment Preparation

## Scope

Sprint 19 is a preparation gate for a future `GIWA Verified Intent Rail` staging dry run. It converts the Sprint 18 blocker register into deploy-readiness evidence without starting a public host, managed infrastructure connection, wallet action, or chain-operation command.

Supported scope remains:

```text
one partner
one campaign
one mission
one GIWA Sepolia mock vault action
one matched-only receipt flow
one partner evidence packet
```

## Runtime Boundary

| Mode | Host binding | Mock mode | Auth | Storage | Approval state |
| --- | --- | --- | --- | --- | --- |
| `local` | `127.0.0.1` | explicit local-only flag allowed | local bypass only when configured | local rehearsal DB | allowed for rehearsal |
| `staging-testnet` | approved staging host only | disabled by default | required | approved staging adapter or blocked | blocked until this gate passes |
| `prod-testnet` | approved managed beta host only | forbidden | required | durable store with restore drill | outside Sprint 19 |

`staging-testnet` and `prod-testnet` are GIWA Sepolia testnet modes. They are not mainnet, custody, payment, eligibility, or production finance modes.

## Public Host Blockers

Staging host binding is blocked until all items have owners and evidence:

| Blocker | Required evidence |
| --- | --- |
| Approved host | host name, owner, and approval timestamp |
| Origin policy | exact allowed origin decision |
| Role activation | role-separated activation and rotation process |
| Auth and tenant gate | credential mapping, actor id, tenant id, and scopes |
| Request gate | method, content-type, body-size, malformed JSON, and bounded error checks |
| Rate gate | source, credential, tenant, wallet, and verification limits |
| Readiness gate | `/healthz` and `/readyz` redacted responses |
| Storage gate | approved staging adapter or explicit block |
| Migration gate | schema guard evidence |
| Restore gate | backup catalog and restore drill |
| Rollback gate | artifact manifest, prior checksums, static fallback, and owner |
| Incident gate | incident owner, escalation path, and drill result |
| Partner gate | intake, evidence acceptance, feedback, closeout, and go/no-go |

## Local Read-Only Checks

Sprint 19 may use localhost checks as advisory evidence only:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/partner-snapshot.json
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/demo
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/readyz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:<PORT>/api/partner/runs
```

Local checks cannot replace source provenance, protected CI, approved host policy, durable storage, or restore evidence.

## Sprint 20 Entry Gate

A later Sprint 20 dry run can be proposed only when:

- source provenance and protected CI are green
- staging host owner and origin policy are approved
- staging environment contract is accepted without exposing values
- storage adapter, migration guard, backup catalog, and restore drill are green
- health, readiness, logs, alerts, and bounded error gates are green
- auth, tenant, request, rate, and receipt access gates are green
- rollback and incident drills are complete
- partner promotion gate is approved
- static fallback and matched-only receipt behavior pass local checks

Until then, public host binding remains blocked.

## Sprint 20 CI and Source Provenance

The Sprint 20 CI/source plan is:

```text
docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md
```

Sprint 20 must close or explicitly preserve the source provenance blocker before any hosted adapter work or staging dry run is treated as promotable. If `.git` or `.github` remains absent, staging dry run remains blocked and local checks remain advisory only.

## Sprint 21 CI Workflow Dry-Run

Sprint 21 dry-run documentation:

```text
docs/implementation/giwa-ci-workflow-draft.md
docs/implementation/giwa-local-ci-simulation.md
docs/implementation/giwa-provenance-artifact-manifest.md
docs/implementation/giwa-release-approval-checklist.md
docs/implementation/giwa-ci-failure-triage.md
```

These documents keep staging deployment blocked until repository transition, workflow-file creation, branch protection, required checks, artifact manifest generation, provenance report generation, and release approval are proven by protected CI.

## Sprint 33 Dry-Run Preparation Under Billing Lock

Sprint 33 records a preparation-only staging dry-run packet:

```text
docs/superpowers/plans/2026-06-20-sprint-33-staging-dry-run-preparation-under-billing-lock.md
docs/implementation/giwa-staging-dry-run-preparation-under-billing-lock.md
```

Current state:

```text
protectedCI=blocked-billing-lock
stagingDryRunPreparation=ready-for-post-billing-review
stagingDryRunExecution=blocked-protected-ci
protectedArtifactGeneration=blocked
releaseApproval=blocked
publicHosting=blocked
deployment=blocked
```

The packet can be reviewed locally, but it cannot be executed as a staging dry run until GitHub billing is resolved outside the repository, all required checks pass from the intended source commit, protected artifact metadata is recorded, and host/runtime/storage/security/rollback/partner gates are approved.

## Sprint 34 Hosted Adapter Readiness

Sprint 34 readiness documents:

```text
docs/superpowers/plans/2026-06-20-sprint-34-hosted-adapter-readiness-under-protected-ci-blocker.md
docs/implementation/giwa-hosted-adapter-readiness.md
```

Current state:

```text
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
cloudSecretManagerConnection=blocked
protectedCI=blocked-billing-lock
stagingDryRunExecution=blocked-protected-ci
```

The hosted adapter readiness packet can define adapter criteria, but it cannot bind a host, connect storage, load hosted credentials, or execute a staging dry run until protected CI, protected artifact metadata, host approval, storage restore evidence, security policy, observability, rollback, and partner gates are green.

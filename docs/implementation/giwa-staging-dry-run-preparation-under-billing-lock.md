# GIWA Staging Dry-Run Preparation Under Billing Lock

Sprint 33 prepares the staging dry-run packet while protected CI is blocked by GitHub account billing. This record is not a deployment authorization, not a public-hosting authorization, and not release-grade provenance.

## Current Authority Boundary

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=public
branchProtected=true
requiredChecks=10
latestProtectedRunId=27850867132
latestProtectedRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestProtectedRunConclusion=failure
latestProtectedRunFirstJob=source-provenance
latestProtectedRunDownstreamJobs=9-skipped
latestProtectedRunLog=not-found
rootCauseClass=github-account-billing-lock
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
releaseApproval=blocked
stagingPromotion=blocked
```

Local evidence remains advisory until GitHub required checks pass from the intended source commit and protected artifact metadata is recorded.

## Dry-Run Opening Order

1. Read `docs/implementation/giwa-staging-blocker-register.md`.
2. Confirm the latest protected CI run and branch protection state.
3. Confirm the local static fallback packet is still available.
4. Confirm the local live rehearsal packet and dynamic receipt evidence remain linked.
5. Confirm host/runtime/storage/security/rollback gates have named owners and evidence.
6. Stop before public hosting, deployment, managed infrastructure, wallet actions, or chain-operation commands.

## Go/No-Go Matrix

| Gate | Sprint 33 state | Dry-run decision |
| --- | --- | --- |
| Protected CI | blocked by GitHub account billing | no-go |
| Required checks | configured but failing | no-go |
| Protected artifact generation | absent | no-go |
| Release approval | absent | no-go |
| Staging host | unapproved | no-go |
| Durable storage | absent | no-go |
| Restore drill | absent | no-go |
| Auth and tenant policy | documented gate only | no-go |
| Rate and origin policy | documented gate only | no-go |
| Rollback owner | absent | no-go |
| Static fallback | available as recorded fallback | advisory check only |
| Local live rehearsal | available as local evidence | advisory check only |

## Prepared Packet

Sprint 33 prepares these handoff items for the first sprint after billing is resolved:

| Item | Evidence path | Required before staging execution |
| --- | --- | --- |
| Branch policy | `docs/implementation/giwa-branch-protection-approval.md` | confirm required checks still match `.github/workflows/ci.yml` |
| Protected CI rerun | `docs/superpowers/plans/2026-06-20-sprint-32-github-billing-lock-and-protected-ci-rerun.md` | rerun or dispatch after billing unlock |
| Staging blockers | `docs/implementation/giwa-staging-blocker-register.md` | update every blocker row after rerun |
| Release provenance | `docs/implementation/giwa-staging-release-provenance.md` | record protected artifact and approval metadata |
| Staging preparation | `docs/implementation/giwa-staging-deployment-preparation.md` | keep deployment blocked until all gates close |
| Static fallback | `apps/web/public/partner-snapshot.json` | smoke check before any dry run |
| Live evidence | `apps/web/public/live-demo-snapshot.json` | confirm local rehearsal evidence remains public-safe |

## Failure Routes

| Signal | Route | Required response |
| --- | --- | --- |
| Billing annotation repeats | GitHub account gate | keep protected CI and staging blocked |
| Required check name mismatch | Branch policy gate | update branch policy plan before rerun |
| Protected workflow passes but artifact metadata is absent | Artifact handoff gate | plan protected artifact upload work before release approval |
| Static fallback smoke fails | Rollback gate | repair fallback before staging work |
| Live evidence hash drifts | Evidence retention gate | regenerate public-safe snapshot from approved local rehearsal path |
| Host owner missing | Hosted ops gate | block dry-run execution |
| Storage or restore evidence missing | Storage gate | block dry-run execution |

## Post-Billing Handoff

After GitHub billing is resolved outside this repository:

1. Rerun or dispatch `ci-source-provenance` on `main`.
2. Verify all ten required checks pass.
3. Download or inspect protected artifact metadata if the workflow produced it.
4. Update blocker, release provenance, and staging preparation records with run id, source commit, check results, artifact names, hash values, owner, and timestamp.
5. Only then plan a staging dry-run execution sprint.

## Safety Confirmation

Sprint 33 does not:

- read or print local env-file values
- output credential values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- public-host or deploy
- connect managed infrastructure
- create release tags
- claim protected CI or release-grade provenance

## Exit Decision

Sprint 33 exits as:

```text
stagingDryRunPreparation=ready-for-post-billing-review
stagingDryRunExecution=blocked-protected-ci
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
releaseApproval=blocked
publicHosting=blocked
deployment=blocked
nextSprint=docs/superpowers/plans/2026-06-20-sprint-35-post-billing-protected-ci-rerun-and-artifact-handoff.md
```

## Sprint 35 Rerun Handoff State

Sprint 35 records that billing unlock is still unconfirmed:

```text
docs/superpowers/plans/2026-06-20-sprint-35-post-billing-protected-ci-rerun-and-artifact-handoff.md
docs/implementation/giwa-post-billing-protected-ci-rerun-and-artifact-handoff.md
```

Current decision:

```text
billingUnlockConfirmed=false
rerunExecuted=false
noActionsRunForCurrentMain=true
currentMainCommitSkippedCI=true
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
protectedArtifactUploadImplemented=false
stagingDryRunExecution=blocked-protected-ci
```

Staging dry-run execution remains blocked until protected CI passes on the intended source commit and protected artifact metadata is recorded.

## Sprint 36 Rerun Gate State

Sprint 36 records that billing unlock is still not evidenced:

```text
docs/superpowers/plans/2026-06-20-sprint-36-protected-ci-rerun-after-billing-unlock.md
docs/implementation/giwa-protected-ci-rerun-after-billing-unlock.md
docs/evidence/protected-ci-sprint36-blocked-handoff.json
```

Current decision:

```text
currentMainHead=30eddb3da26ca6cf8302d1396bd8f5fbe61759c1
billingUnlockConfirmed=false
currentMainCheckRuns=0
noActionsRunForCurrentMain=true
rerunAllowed=false
rerunExecuted=false
workflowDispatchExecuted=false
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
protectedArtifactUploadImplemented=false
stagingDryRunExecution=blocked-protected-ci
```

Staging dry-run execution remains no-go until current `main` receives a passing protected CI run and protected artifact metadata exists.

## Sprint 37 Dispatch Gate State

Sprint 37 records a protected workflow dispatch that still failed on the billing gate:

```text
docs/superpowers/plans/2026-06-20-sprint-37-protected-ci-dispatch-after-reported-billing-unlock.md
docs/implementation/giwa-protected-ci-dispatch-after-reported-billing-unlock.md
docs/evidence/protected-ci-sprint37-dispatch-failure.json
```

Current decision:

```text
currentMainHead=b769003e733a83faa70b57b4c0bda6ac26821044
workflowDispatchExecuted=true
workflowRunId=27852941488
workflowRunConclusion=failure
source-provenance=failure
downstreamRequiredJobs=9-skipped
workflowRunArtifactTotalCount=0
protectedCI=blocked-billing-lock-after-dispatch
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked-no-artifacts
stagingDryRunExecution=blocked-protected-ci
```

Staging dry-run execution remains no-go because the required checks did not pass and no protected artifact metadata exists.

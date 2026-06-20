# GIWA Hosted Adapter Readiness

Sprint 34 defines hosted adapter readiness while protected CI is blocked by GitHub billing. This is an advisory readiness packet, not an adapter implementation, public host binding, managed infrastructure connection, or deployment approval.

## Current Boundary

```text
currentMainHead=30eddb3da26ca6cf8302d1396bd8f5fbe61759c1
latestProtectedRunId=27850867132
latestProtectedRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestProtectedRunConclusion=failure
latestProtectedRunFirstJob=source-provenance
latestProtectedRunDownstreamJobs=9-skipped
latestProtectedRunLog=not-found
rootCauseClass=github-account-billing-lock
protectedCI=blocked-billing-lock
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
cloudSecretManagerConnection=blocked
publicHosting=blocked
deployment=blocked
```

## Adapter Contract

| Field | Sprint 34 value | Required before staging execution |
| --- | --- | --- |
| Adapter name | not selected | approved adapter name |
| Adapter owner | absent | named owner |
| Runtime mode | `staging-testnet` target only | process-env runtime with hosted mode |
| Env source | process-env-only requirement | no local env-file loading in hosted modes |
| Readiness probe | required | redacted startup and `/readyz` evidence |
| Migration guard | required | known migration markers and incompatible-schema fail-closed behavior |
| Backup catalog | required | isolated staging backup catalog |
| Restore drill | required | row-count, snapshot-hash, `verifierInputHash`, and `receiptHash` recomputation |
| Rate limit state | local-only today | durable behavior or explicit rehearsal limitation |
| Verification queue state | local-only today | durable behavior or explicit rehearsal limitation |
| Retention owner | absent | named evidence-retention owner |

## Required Evidence

Before a later sprint can implement or connect a hosted adapter, it must record:

1. Protected CI pass on the intended source commit.
2. Protected artifact manifest, provenance report, sidecar hash, and upload metadata.
3. Adapter owner and activation owner.
4. Redacted readiness contract and failure modes.
5. Migration marker inventory and incompatible schema fail-closed evidence.
6. Backup catalog owner, retention owner, and restore drill owner.
7. Restore drill result with public-safe snapshot hash comparison.
8. Rate-limit and verification-queue durability decision.
9. Auth, tenant, origin, request, and receipt access gate evidence.
10. Rollback owner, partner communications owner, and static fallback smoke result.

## Source Boundary References

Sprint 34 names these local-runtime boundaries for later implementation review. It does not change them:

| Source | Current boundary |
| --- | --- |
| `apps/web/scripts/serve-live.mjs` | local server wires SQLite store, memory rate limit state, and memory verification queue |
| `apps/web/src/lib/live/liveEnv.ts` | hosted modes must use process env and redacted readiness |
| `apps/web/src/lib/live/liveHealth.ts` | readiness gaps remain for backup age, restore metadata, queue readiness, and real hosted adapter probes |
| `apps/web/src/lib/live/liveRateLimit.ts` | per-process memory state is local-only unless explicitly accepted as rehearsal limitation |
| `apps/web/src/lib/live/verificationJobQueue.ts` | memory queue state does not survive process loss |
| `apps/web/src/lib/live/liveStore.ts` | local SQLite migration markers are advisory until reviewed as hosted adapter provenance |
| `apps/web/src/lib/live/liveApi.ts` | non-local queued verification makes queue durability a staging gate |

## Rate And Queue Durability Boundary

Later hosted adapter work must prove:

| Gate | Required evidence |
| --- | --- |
| Rate state | shared durable buckets or explicit single-instance rehearsal limitation |
| Verification queue | durable pending, leased, retryable, failed, and dead state |
| Idempotency | one verification job per run id and no duplicate verifier fanout |
| Lease recovery | expired leases re-enter safely or fail closed |
| Terminal decisions | matched and failed decisions are immutable |
| Restore behavior | restored pending, leased, retryable, and dead jobs keep bounded public states |
| Metrics | queue depth, lease age, retry count, dead count, and rate-limit saturation stay low-cardinality |

## No-Go Conditions

Hosted adapter work remains blocked when:

- protected CI is red, skipped, absent, or blocked by billing
- protected artifact metadata is absent
- adapter owner is absent
- runtime uses local env-file loading in hosted mode
- runtime defaults to local tenant state such as `tenant_default`
- readiness uses assumed booleans instead of measured adapter, tenant, rate, queue, backup, and restore probes
- tenant id defaults locally or comes from request body
- origin policy is wildcard or missing
- storage probe is assumed instead of measured
- backup catalog or restore drill is absent
- rate-limit or queue behavior is memory-only without explicit rehearsal limitation
- rollback owner or static fallback smoke is absent

## Safety Confirmation

Sprint 34 does not:

- implement or connect a hosted adapter
- connect production, managed, or cloud infrastructure
- read or print local env-file values
- output credential values
- send wallet transactions
- run `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands
- install dependencies
- public-host or deploy
- create release tags
- claim protected CI or release-grade provenance

## Exit Decision

Sprint 34 exits as:

```text
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
cloudSecretManagerConnection=blocked
protectedCI=blocked-billing-lock
stagingDryRunExecution=blocked-protected-ci
nextSprint=docs/superpowers/plans/2026-06-20-sprint-35-post-billing-protected-ci-rerun-and-artifact-handoff.md
```

## Sprint 35 Rerun Handoff State

Sprint 35 does not unblock hosted adapter implementation:

```text
billingUnlockConfirmed=false
rerunExecuted=false
noActionsRunForCurrentMain=true
currentMainCommitSkippedCI=true
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUploadImplemented=false
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
cloudSecretManagerConnection=blocked
```

Hosted adapter implementation requires a later protected-CI pass, protected artifact metadata, adapter owner, storage/restore evidence, auth/tenant/origin gates, rollback owner, and release approval.

## Sprint 36 Rerun Gate State

Sprint 36 keeps hosted adapter implementation blocked:

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
protectedArtifactUploadImplemented=false
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
cloudSecretManagerConnection=blocked
```

Hosted adapter implementation requires protected CI on current `main`, protected artifact metadata, adapter owner, storage/restore evidence, auth/tenant/origin gates, rollback owner, and release approval.

## Sprint 37 Dispatch Gate State

Sprint 37 keeps hosted adapter implementation blocked:

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
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
cloudSecretManagerConnection=blocked
```

Hosted adapter implementation still requires a passing protected-CI run, protected artifact metadata, adapter owner, storage/restore evidence, auth/tenant/origin gates, rollback owner, and release approval.

## Sprint 38 Local Contract State

Sprint 38 adds a code-backed local contract evaluator:

```text
apps/web/src/lib/live/hostedAdapterContract.ts
apps/web/src/lib/live/hostedAdapterContract.test.ts
docs/implementation/giwa-hosted-adapter-local-contract.md
```

Current decision:

```text
currentMainHead=2b414c91b1da6ed64287dbf7b2635be7586e287d
latestWorkflowRunId=27873338373
latestWorkflowRunConclusion=failure
protectedCI=blocked-billing-lock-after-dispatch
protectedArtifactMetadataReady=false
hostedAdapterLocalContract=blocked-local-advisory
managedConnectionAttempted=false
externalConnectionAllowed=false
blockers=protected_ci_missing,protected_artifact_metadata_missing,rate_limit_durability_missing,queue_durability_missing
```

The evaluator makes the adapter contract explicit while preserving the no-go state for managed infrastructure, public hosting, deployment, and protected provenance claims.

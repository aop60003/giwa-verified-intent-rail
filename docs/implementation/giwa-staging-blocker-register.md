# GIWA Staging Blocker Register

## Current Status

Sprint 19 preparation is blocked for staging dry run. Sprint 26 created local git and workflow state, but protected CI and release approval remain absent:

```text
.git=True
.github=True
.github/workflows=True
workflowPath=.github/workflows/ci.yml
sourceCommit=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
remoteGitHubRepository=https://github.com/aop60003/giwa-verified-intent-rail
repositoryVisibility=public
remotePushApproval=approved-2026-06-20
remotePush=complete
githubActionsRun=27850867132
githubActionsConclusion=failure
githubActionsFirstJob=source-provenance
githubActionsDownstreamJobs=9-skipped
githubActionsLog=not-found
githubActionsFailureClass=github-account-billing-lock
requiredCheckStatuses=created-but-failing
protectedArtifactGeneration=absent
protectedArtifactUploadMetadata=absent
releaseApproval=absent
rollbackOwner=absent
protected-ci=blocked-billing-lock
branch-protection=configured-required-checks-failing
external partner signoff=absent
public host approval=absent
durable staging storage=absent
explicit tenant mapping=absent
hosted DB probe=absent
backup restore drill=absent
```

## Blocker Register

| Blocker | Current status | Required evidence | Staging impact |
| --- | --- | --- | --- |
| Source provenance | remote-public / branch policy configured | passing protected CI on immutable remote commit | blocks deployment dry run until checks pass |
| Protected CI | blocked-billing-lock | successful GitHub workflow run id, exact required-check statuses including `protected-ci-gate`, protected artifact generation, and protected artifact upload metadata | blocks release provenance |
| Branch protection | configured-required-checks-failing | branch protection with exact checks plus passing required-check statuses | blocks release provenance until checks pass |
| Lockfile and dependency policy | partial | pinned pnpm version, frozen lockfile install, approved drift only | blocks release provenance |
| Host selection | blocked | approved host, owner, origin policy | blocks public binding |
| Environment contract | partial | names, categories, redacted readiness, activation owner | blocks hosted startup |
| Storage adapter | blocked | approved adapter or explicit local-only block | blocks durable state |
| Migration guard | partial | migration probe and incompatible-schema fail-closed evidence | blocks DB activation |
| Backup catalog | blocked | backup path, owner, timestamp, restore proof | blocks partner exposure |
| Restore drill | blocked | isolated restore, row counts, hash recompute, snapshot hash | blocks retention gate |
| Observability | partial | health, readiness, event allowlist, metrics, alerts | blocks operations |
| Request id coverage | partial | every API response has request id body or header | blocks incident correlation |
| Auth and tenant | blocked | explicit credential-to-actor-to-tenant-to-scope mapping | blocks partner API |
| Origin and CORS | blocked | same-origin or allowlist decision | blocks browser access |
| Request and rate gates | blocked | body limits, pre-auth limiting, bounded errors, source, credential, tenant, wallet, and verify buckets | blocks abuse boundary |
| Public receipt errors | blocked | locked states return bounded not-found without gate details | blocks receipt route |
| Tenant-safe export | blocked | export selects approved tenant/campaign/run and allowlisted schema | blocks public snapshot |
| Rollback | blocked | protected artifact manifest, previous checksums, rollback owner, and static fallback evidence | blocks promotion |
| Static fallback | partial | GET smoke and recorded evidence labeling | required before staging |
| Incident drill | partial | stale state, wrong receipt, timeout, bad export drills | blocks on-call readiness |
| Partner promotion | blocked | closeout, reviewer signoff, owner approval | blocks beta promotion |

## Sprint 19 Exit Gate

Sprint 19 exits only as a preparation package when:

- all blocker categories are documented
- blocked states are explicit
- local checks are labeled advisory
- Sprint 20 candidate path is selected by the user
- no deployment, public host binding, managed infrastructure, wallet action, chain-operation command, or dependency installation occurs

## Sprint 20 CI and Source Provenance

Sprint 20 plan:

```text
docs/superpowers/plans/2026-06-19-sprint-20-ci-and-source-provenance.md
```

Sprint 20 remains blocked for promotion while remote GitHub source, push approval, protected workflow evidence, real CI status, or branch protection evidence is absent. Local checks are advisory until protected CI repeats them from an immutable pushed source commit.

## Sprint 21 CI Workflow Implementation

Sprint 21 plan:

```text
docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md
```

Sprint 21 separates repository transition approval, workflow-file creation approval, local advisory checks, protected CI, artifact provenance, branch protection, release approval, failure triage, and rollback routing. Promotion remains blocked while remote GitHub source, real protected CI evidence, or branch protection evidence is absent.

Sprint 21 dry-run artifacts:

```text
docs/implementation/giwa-ci-workflow-draft.md
docs/implementation/giwa-local-ci-simulation.md
docs/implementation/giwa-provenance-artifact-manifest.md
docs/implementation/giwa-release-approval-checklist.md
docs/implementation/giwa-ci-failure-triage.md
```

## Sprint 22 Local Advisory Artifacts

Sprint 22 implements local diagnostic outputs:

```text
docs/evidence/local-artifact-manifest.json
docs/evidence/local-provenance-report.json
```

The source provenance and protected CI blockers remain open while remote GitHub source, protected CI evidence, or branch protection evidence is absent.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | generated output self-inclusion | local output file appears in manifest inputs | artifact inventory | exclude generated output from hash input and rerun |
| P1 | unmanifested public file | served file under `apps/web/public` is absent from manifest | artifact inventory | fail closed and update inventory policy |
| P1 | excluded surface access | scanner or writer attempts to read excluded local runtime path | evidence boundary | fail before content read |
| P1 | authority confusion | local output is treated as protected CI provenance | source provenance gate | keep staging blocked |
| P1 | hash instability | repeated run changes without input change except timestamped output | artifact manifest gate | isolate generated time fields and rerun |
| P2 | scanner value leakage | scanner output includes matched text instead of metadata | evidence boundary | quarantine output and redact scanner |

## Sprint 23 Local Provenance Verification

Sprint 23 implements local-advisory verification outputs:

```text
docs/evidence/local-command-evidence-report.json
docs/evidence/local-provenance-report.json.sha256
docs/evidence/local-provenance-verification.json
```

The source provenance and protected CI blockers remain open while remote GitHub source, protected workflow evidence, real CI statuses, or branch protection evidence is absent.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | manifest binding mismatch | raw manifest bytes do not match report binding | provenance report gate | regenerate report or inspect manifest drift |
| P1 | build tree mismatch | recomputed sorted artifact hash lines differ | artifact manifest gate | block local verification and inspect artifact inputs |
| P1 | public artifact drift | current public artifact differs from checked manifest | drift gate | refresh manifest intentionally or restore artifact |
| P1 | sidecar mismatch | report hash sidecar differs from report bytes | external report hash gate | rewrite sidecar from current report bytes |
| P1 | non-terminal decision | generated report contains `pass-or-blocked` | report schema gate | replace with terminal `pass`, `blocked`, or `skipped` |
| P2 | local command evidence confusion | command catalog is treated as protected CI output | source provenance gate | keep release provenance blocked |

## Sprint 24 Approval Gate Packet

Sprint 24 adds approval and draft documents:

```text
docs/implementation/giwa-git-initialization-approval.md
docs/implementation/giwa-ci-workflow-creation-approval.md
docs/implementation/giwa-branch-protection-approval.md
docs/implementation/giwa-ci-workflow-yaml-draft.md
```

Current blocker state remains:

```text
source-provenance=blocked
protected-ci=blocked
rollback=blocked
static-fallback=partial
```

Any future approved repository, workflow, or branch-protection action must update the blocker rows for `Source provenance`, `Protected CI`, `Rollback`, and `Static fallback` with owner, timestamp, evidence path, and remaining blocked state.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | workflow approval missing | workflow file path appears without approval record | workflow approval gate | stop and remove only after explicit approval |
| P1 | branch protection mismatch | required check name differs from workflow job name | branch protection gate | block protected CI and update approval record |
| P1 | artifact upload too early | provenance JSON uploaded before protected CI exists | artifact upload gate | quarantine upload and keep local evidence advisory |
| P1 | blocker register stale | approved action changes state but blocker register is unchanged | release governance | block promotion until register is updated |
| P2 | rollback route incomplete | no static fallback status, rollback owner, or blocker update | rollback gate | block workflow promotion |

## Sprint 25 Git And Workflow Readiness

Sprint 25 readiness documents:

```text
docs/implementation/giwa-git-and-workflow-initialization-readiness.md
docs/implementation/giwa-initial-commit-file-policy.md
docs/implementation/giwa-workflow-creation-preflight.md
docs/implementation/giwa-protected-ci-transition-checklist.md
```

Current blocker state remains:

```text
source-provenance=blocked
protected-ci=blocked
rollback=blocked
static-fallback=partial
authority=local-advisory
```

The four approval gates are repository initialization, initial commit, workflow file creation, and branch protection or required checks. Without those approvals, Sprint 25 can record readiness only.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | approval gate missing | requested action lacks current explicit approval | Sprint 25 readiness gate | keep action blocked |
| P1 | commit without approval | local commit exists before Gate B approval | initial commit gate | stop git actions and require cleanup approval |
| P1 | local evidence treated as protected CI | `local-advisory` output is used for release authority | provenance gate | keep staging blocked |
| P1 | required check drift | configured check name differs from canonical list | branch protection gate | block protection and update records |
| P2 | protected evidence path ambiguity | protected CI output path is not named | artifact provenance gate | select staging-named output or add protected metadata |
| P2 | cleanup without approval | repository metadata, workflow file, helper file, commit, or setting is removed without approval | rollback gate | stop and require cleanup approval |

## Sprint 26 Git And Workflow Initialization Execution

Sprint 26 execution record:

```text
docs/implementation/giwa-git-and-workflow-initialization-execution.md
```

Current blocker state after local execution:

```text
source-provenance=partial-local
protected-ci=blocked
branch-protection=blocked
rollback=blocked
static-fallback=partial
authority=local-advisory
```

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | no real CI status | required checks have never run in GitHub | branch protection gate | keep required checks blocked |
| P1 | push needed | protected CI requires remote source upload | source provenance gate | stop and request separate push approval |
| P1 | local workflow treated as protected CI | `.github/workflows/ci.yml` exists but no GitHub run id exists | provenance gate | keep release provenance blocked |
| P2 | helper script absent | `scripts/ci=False` | workflow command boundary | keep helper-based checks out of required evidence |

## Sprint 27 Protected CI Run And Release Provenance

Sprint 27 execution record:

```text
docs/implementation/giwa-protected-ci-run-and-release-provenance.md
```

Current blocker state after the protected-CI probe:

```text
source-provenance=partial-local / remote blocked
protected-ci=blocked
branch-protection=blocked
release-approval=blocked
rollback=blocked
authority=local-advisory
```

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | no configured remote | `git remote -v` has no entries | source provenance gate | stop before push or workflow dispatch and request remote approval |
| P1 | no real Actions run | no GitHub run id or required-check statuses exist | protected CI gate | keep local evidence advisory |
| P1 | branch protection attempted without statuses | required checks have not run in GitHub | branch protection gate | keep branch protection blocked |
| P1 | local source treated as release authority | local commit or workflow file is used as protected CI evidence | release provenance gate | keep staging promotion blocked |
| P2 | safe scan enforcement not proven | `safe-scans` has not run as a protected required check | evidence boundary | review blocking behavior before release authority |
| P2 | rollback owner absent | no rollback owner or protected artifact manifest exists | rollback gate | keep promotion blocked until owner and previous checksums are recorded |

## Sprint 28 GitHub Remote And Protected CI Activation

Sprint 28 plan:

```text
docs/superpowers/plans/2026-06-19-sprint-28-github-remote-and-protected-ci-activation.md
```

Sprint 28 keeps external activation blocked until these separate approvals exist:

```text
git-remote-add
git-push
github-actions-observe-or-dispatch
branch-protection-or-ruleset
protected-artifact-upload
```

Current protected evidence remains blocked while remote source, push approval, real Actions run id, required-check statuses, branch protection, and protected artifact upload metadata are absent.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | remote approval missing | no approved GitHub repository URL or remote name | source provenance gate | keep push and Actions blocked |
| P1 | Actions status absent | `protected-ci-gate` has no real GitHub status | protected CI gate | keep local workflow advisory |
| P1 | artifact upload too early | staging-named provenance files appear without run id and upload metadata | protected artifact gate | quarantine and keep promotion blocked |
| P1 | local artifact authority confusion | `local-*` evidence is used to unblock staging | release provenance gate | keep `authority=local-advisory` and block promotion |
| P2 | package command boundary drift | CI-invoked package script calls deploy, serve, wallet, chain, or hosted actions | workflow command boundary | fail CI before package checks |

## Sprint 29 GitHub Remote Activation After User Approval

Sprint 29 plan:

```text
docs/superpowers/plans/2026-06-19-sprint-29-github-remote-activation-after-user-approval.md
```

Sprint 29 created the approved private GitHub repository, added `origin`, pushed `main`, and observed real GitHub Actions runs:

```text
repository=https://github.com/aop60003/giwa-verified-intent-rail
visibility=private
pushedCommit=f0a54e684bcd873cedc3623a8416faf356484730
pushRunId=27848145919
pushRunConclusion=startup_failure
dispatchRunId=27848184212
dispatchRunConclusion=startup_failure
latestPushedCommit=6cc707a5713c3355bba0a22afe7458a787e1c8d7
latestPushRunId=27848419907
latestPushRunConclusion=startup_failure
jobsCreated=0
protectedArtifactUploadMetadata=absent
```

Branch protection remains blocked:

```text
apiStatus=403
errorClass=github-plan-or-visibility-gate
summary=Upgrade to GitHub Pro or make this repository public to enable this feature.
```

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | GitHub Actions startup failure | real run ids exist but jobs count is zero | protected CI gate | resolve GitHub Actions private repository startup gate before claiming protected CI |
| P1 | branch protection unavailable | GitHub API returns plan or visibility 403 | branch protection gate | upgrade GitHub plan or explicitly approve public repository conversion before retry |
| P1 | protected artifact metadata absent | artifacts count is zero for observed run | protected artifact gate | keep staging-named protected artifact outputs blocked |
| P2 | source remote exists without successful CI | remote and pushed commit exist but checks failed before jobs | release provenance | keep source provenance partial and release approval blocked |

## Sprint 30 Protected CI Startup And Branch Policy Unblock

Sprint 30 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-30-protected-ci-startup-and-branch-policy-unblock.md
```

Sprint 30 triage record:

```text
docs/implementation/giwa-github-actions-startup-failure-triage.md
```

Current Sprint 30 blocker state:

```text
sourceProvenance=partial-remote
sourceVisibility=public
protectedCI=blocked-billing-lock
protectedCIJobs=created-but-not-started
diagnosticRunId=27849055389
diagnosticRunConclusion=startup_failure
diagnosticRunJobs=0
postVisibilityDiagnosticRunId=27849292869
postVisibilityDiagnosticConclusion=failure
postVisibilityDiagnosticJobs=3
githubAccountBilling=locked
branchProtection=configured-required-checks-failing
protectedBranch=main
branchProtectionEnforceAdmins=false
thirdPartyCheckSuites=non-authoritative
protectedArtifactGeneration=blocked
releaseApproval=blocked
stagingPromotion=blocked
```

Every external-state transition in Sprint 30 or later must update this blocker register with run id, source commit, job count, check contexts, branch-protection result, artifact count, owner/timestamp, and next retry condition.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | diagnostic workflow creates no jobs | minimal workflow has `startup_failure` with zero jobs | GitHub account or platform gate | keep protected CI blocked and record plan, billing, runner, or visibility gate |
| P1 | diagnostic workflow passes but protected workflow fails before jobs | `ci-diagnostic` has jobs while `ci-source-provenance` does not | workflow graph or YAML gate | inspect `.github/workflows/ci.yml` without dropping required checks |
| P1 | third-party app checks are queued | Cloudtype, Cloudflare, or Vercel suites remain queued | non-authoritative integration gate | do not add them to required checks and do not trigger provider setup |
| P1 | branch policy workaround requested | private repo branch protection stays 403 | source-control policy gate | require plan upgrade, explicit public repository conversion, or approved substitute policy |
| P1 | GitHub account billing lock | check-run annotation says the job was not started because the account is locked due to billing | account billing gate | resolve GitHub account billing outside the repository before claiming protected CI |
| P1 | branch protection configured while checks fail | `main` requires canonical checks, but `source-provenance` fails before runner steps | release provenance gate | keep release and staging blocked until billing is resolved and checks pass |

## Sprint 32 GitHub Billing Lock And Protected CI Rerun

Sprint 32 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-32-github-billing-lock-and-protected-ci-rerun.md
```

Current Sprint 32 blocker state:

```text
repositoryVisibility=public
branchProtected=true
requiredChecks=10
latestProtectedRunId=27849499574
latestProtectedRunAttempt=2
latestProtectedRunConclusion=failure
latestProtectedRunAnnotation=account-locked-due-to-billing
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
releaseApproval=blocked
stagingPromotion=blocked
```

The latest rerun attempt also failed before runner steps with the same billing-lock annotation. The next executable step is outside the repository: resolve the GitHub account billing lock. After that, rerun the protected workflow and record whether checks pass, fail by command, or fail by artifact gate.

## Sprint 33 Staging Dry-Run Preparation Under Billing Lock

Sprint 33 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-33-staging-dry-run-preparation-under-billing-lock.md
```

Sprint 33 preparation record:

```text
docs/implementation/giwa-staging-dry-run-preparation-under-billing-lock.md
```

Current Sprint 33 blocker state:

```text
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
stagingDryRunPreparation=ready-for-post-billing-review
stagingDryRunExecution=blocked-protected-ci
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
releaseApproval=blocked
publicHosting=blocked
deployment=blocked
```

Sprint 33 may prepare the dry-run packet only. It cannot authorize public hosting, deployment, managed infrastructure, protected artifact promotion, or staging execution while GitHub billing prevents required checks from running.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | staging dry-run starts under billing lock | protected CI is failing or unstarted | release provenance gate | stop dry-run execution and keep packet as preparation only |
| P1 | local advisory evidence promoted | `local-*` files are used as release authority | provenance gate | keep local evidence advisory until protected CI regenerates it |
| P1 | host selected before protection passes | staging host owner exists while protected CI is red | hosted ops gate | record host as proposed only and block execution |
| P2 | storage drill absent | no approved adapter, backup catalog, or restore evidence | storage gate | keep dry-run no-go |
| P2 | rollback path incomplete | static fallback, owner, or artifact manifest is missing | rollback gate | block dry-run execution until fallback smoke and owner are recorded |

## Sprint 34 Hosted Adapter Readiness Under Protected-CI Blocker

Sprint 34 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-34-hosted-adapter-readiness-under-protected-ci-blocker.md
```

Sprint 34 readiness record:

```text
docs/implementation/giwa-hosted-adapter-readiness.md
```

Current Sprint 34 blocker state:

```text
currentMainHead=0a5fdc235cd49f2bef78087d029f194635833e7c
latestProtectedRunId=27850867132
latestProtectedRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestProtectedRunConclusion=failure
protectedCI=blocked-billing-lock
hostedAdapterReadiness=prepared
hostedAdapterImplementation=blocked
managedDatabaseConnection=blocked
cloudSecretManagerConnection=blocked
stagingDryRunExecution=blocked-protected-ci
publicHosting=blocked
deployment=blocked
```

Sprint 34 defines the adapter readiness contract only. It cannot authorize hosted adapter implementation, managed infrastructure connection, public host binding, or staging execution while protected CI remains blocked.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | hosted adapter implemented under red CI | code or config connects managed infrastructure while protected CI is blocked | source provenance gate | stop and revert the implementation plan to readiness-only |
| P1 | local SQLite treated as hosted-ready | `GIWA_LIVE_DB_PATH` or local DB probe is used as staging adapter evidence | storage gate | keep adapter implementation blocked |
| P1 | local env loading in hosted mode | hosted runtime reads local env files | runtime gate | fail closed before staging execution |
| P2 | memory rate or queue state promoted | in-memory bucket or queue is treated as multi-instance evidence | durability gate | require durable behavior or explicit rehearsal limitation |
| P2 | missing restore owner | backup catalog or restore drill owner absent | restore gate | keep staging dry-run execution blocked |

## Sprint 35 Post-Billing Protected CI Rerun And Artifact Handoff

Sprint 35 plan:

```text
docs/superpowers/plans/2026-06-20-sprint-35-post-billing-protected-ci-rerun-and-artifact-handoff.md
```

Sprint 35 handoff record:

```text
docs/implementation/giwa-post-billing-protected-ci-rerun-and-artifact-handoff.md
```

Current Sprint 35 blocker state:

```text
currentMainHead=11587e18caae0c73bf0ac61ef8f6e096655f8cac
readOnlyEvidence=docs/evidence/protected-ci-sprint35-blocked-handoff.json
latestRealActionsRunId=27850867132
latestRealActionsRunHeadSha=779b63878b37c3b4f3792dd67718ea5bb3e9d92b
latestRealActionsRunConclusion=failure
billingUnlockConfirmed=false
rerunExecuted=false
noActionsRunForCurrentMain=true
currentMainCommitSkippedCI=true
sourceBinding=blocked-no-run-for-current-main
protectedCI=blocked-billing-lock
protectedArtifactGeneration=blocked
protectedArtifactUpload=blocked
protectedArtifactUploadImplemented=false
latestRealActionsRunArtifactTotalCount=0
releaseApproval=blocked
stagingDryRunExecution=blocked-protected-ci
hostedAdapterImplementation=blocked
partnerPromotion=blocked
```

Sprint 35 cannot rerun protected CI while billing unlock is unconfirmed. If a later rerun targets a head SHA different from the intended `main` commit, it cannot be used as release evidence.

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | rerun before billing unlock | `billingUnlockConfirmed=false` but workflow is rerun or dispatched | billing gate | stop and document the run as non-authoritative |
| P1 | run head mismatch | protected run `headSha` differs from intended `main` commit | source binding gate | block artifact handoff |
| P1 | skipped required check | any canonical required check is skipped, missing, or renamed | protected CI gate | block release approval |
| P1 | no protected artifact metadata | required checks pass but artifact metadata is absent | artifact handoff gate | block release approval and plan artifact handoff work |
| P1 | workflow has no artifact upload | Actions artifacts API returns zero artifacts after checks pass | artifact upload gate | keep protected artifact upload blocked |
| P2 | local advisory evidence promoted | `local-*` files are used as protected output | provenance gate | keep staging blocked |

## Sprint 21 Failure Triage

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | Sprint 21 plan missing | plan path check is false | approval gap | do not execute CI workflow work |
| P1 | source provenance failed | remote GitHub source or protected CI evidence absent | source provenance gate | block staging and keep local checks advisory |
| P1 | protected CI absent or failing | workflow path, required checks, or artifact generation missing | protected CI blocker | block release provenance |
| P1 | artifact hash mismatch | build tree or public artifact hash changes after manifest | no-rebuild promotion gate | stop promotion and regenerate from protected source |
| P1 | non-matched receipt unlock | pending or failed state opens receipt | commercial receipt gate | lock receipt/export and replay standard RPC evidence |
| P2 | lockfile drift | frozen install fails or rewrites lockfile | dependency policy | block until approved drift is recorded |
| P2 | safe scan failure | unsupported claim or sensitive surface failure | evidence boundary | quarantine artifact, correct source, rerun scans |
| P2 | rollback prerequisites missing | no manifest, prior checksum, owner, or static fallback | rollback gate | block promotion |
| P2 | partner promotion gap | signoff absent or blocker register open | partner gate | no-go for beta or staging promotion |
 
Rollback can replace app artifacts and lock new writes. Rollback cannot reverse public GIWA Sepolia evidence. Static fallback remains the continuity surface and must stay GET-only, labeled as recorded GIWA Sepolia testnet evidence, and hash-verified.

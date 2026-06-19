# GIWA Staging Blocker Register

## Current Status

Sprint 19 preparation is blocked for staging dry run. Sprint 26 created local git and workflow state, but protected CI and release approval remain absent:

```text
.git=True
.github=True
.github/workflows=True
workflowPath=.github/workflows/ci.yml
sourceCommit=local-initial-commit
protected-ci=blocked
branch-protection=blocked
external partner signoff=absent
public host approval=absent
durable staging storage=absent
explicit tenant mapping=absent
hosted DB probe=absent
backup restore drill=absent
```

## Blocker Register

| Blocker | Current status | Required evidence | Sprint 20 impact |
| --- | --- | --- | --- |
| Source provenance | blocked | git-backed source, immutable commit, branch policy | blocks deployment dry run |
| Protected CI | blocked | workflow path, required checks, artifact generation | blocks release provenance |
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
| Rollback | blocked | artifact manifest, previous checksums, owner | blocks promotion |
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

Sprint 20 remains blocked for promotion while `.git=False` or `.github=False`. Local checks are advisory until protected CI repeats them from an immutable git-backed source commit.

## Sprint 21 CI Workflow Implementation

Sprint 21 plan:

```text
docs/superpowers/plans/2026-06-19-sprint-21-ci-workflow-implementation.md
```

Sprint 21 separates repository transition approval, workflow-file creation approval, local advisory checks, protected CI, artifact provenance, branch protection, release approval, failure triage, and rollback routing. Promotion remains blocked while `.git=False`, `.github=False`, or protected CI evidence is absent.

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

The source provenance and protected CI blockers remain open while `.git=False` or `.github=False`.

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

The source provenance and protected CI blockers remain open while `.git=False`, `.github=False`, or protected workflow evidence is absent.

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

## Sprint 21 Failure Triage

| Priority | Failure | Signal | Route | Required response |
| --- | --- | --- | --- | --- |
| P1 | Sprint 21 plan missing | plan path check is false | approval gap | do not execute CI workflow work |
| P1 | source provenance failed | `.git=False` or `.github=False` | source provenance gate | block staging and keep local checks advisory |
| P1 | protected CI absent or failing | workflow path, required checks, or artifact generation missing | protected CI blocker | block release provenance |
| P1 | artifact hash mismatch | build tree or public artifact hash changes after manifest | no-rebuild promotion gate | stop promotion and regenerate from protected source |
| P1 | non-matched receipt unlock | pending or failed state opens receipt | commercial receipt gate | lock receipt/export and replay standard RPC evidence |
| P2 | lockfile drift | frozen install fails or rewrites lockfile | dependency policy | block until approved drift is recorded |
| P2 | safe scan failure | unsupported claim or sensitive surface failure | evidence boundary | quarantine artifact, correct source, rerun scans |
| P2 | rollback prerequisites missing | no manifest, prior checksum, owner, or static fallback | rollback gate | block promotion |
| P2 | partner promotion gap | signoff absent or blocker register open | partner gate | no-go for beta or staging promotion |
 
Rollback can replace app artifacts and lock new writes. Rollback cannot reverse public GIWA Sepolia evidence. Static fallback remains the continuity surface and must stay GET-only, labeled as recorded GIWA Sepolia testnet evidence, and hash-verified.

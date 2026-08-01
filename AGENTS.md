# AGENTS.md

<!-- agent-template v0.3.0 · https://github.com/aop60003/agent -->

Project-wide defaults for AI coding agents. Keep the Project Profile current
and the stable policy concise.

Priority is: platform instructions, the user's current request, the nearest
scoped `AGENTS.md`, then parent guides. Code, tests, and configuration describe
current behavior; this guide describes intended policy. Investigate meaningful
conflicts instead of assuming either source automatically wins.

## Project Profile

Change only this bounded block during normal project initialization. Record
confirmed facts, not guesses.

<!-- BEGIN PROJECT PROFILE -->

- **State:** ACTIVE
- **Product:** `GIWA Verified Intent Rail`, a GASOK MVP that demonstrates one
  testnet-only verified-intent flow on GIWA Sepolia.
- **Stack:** Node.js, pnpm 10 workspace, TypeScript 6, Vitest, viem, Hardhat 3,
  a dependency-light static/live web application, and local SQLite runtime data.
- **Structure:**
  - `apps/web/` - static evaluator UI, live adapter, runtime scripts, and public
    demo artifacts.
  - `packages/protocol/` - intent, receipt, policy, and evidence domain logic.
  - `packages/contracts/` - Solidity/Hardhat contracts, deployment scripts, and
    chain fixtures.
  - `docs/` - current design/implementation routing, runbooks, and evidence.
  - `ops/lightsail/` - versioned staging service, Nginx, backup, and smoke assets.
  - `scripts/engram-local.ps1` - project-local Engram wrapper.
- **Commands:**
  - Setup: `pnpm install --frozen-lockfile`
  - Develop static: `pnpm --filter @giwa/web dev`
  - Develop live: `pnpm --filter @giwa/web dev:live`
  - Focused check: `pnpm --filter @giwa/web test`
  - Type check: `pnpm typecheck`
  - Test: `pnpm test`
  - Build: `pnpm build`
- **Project constraints:**
  - Use `GIWA Verified Intent Rail` publicly. Treat `Loop Rail` and
    `GIWA Verified Activation Rail` as legacy/internal names.
  - Keep the MVP on testnet unless the user explicitly changes direction.
  - Do not claim real RWA issuance, real yield or funds, settlement, KYC service,
    phishing prevention, or security guarantees.
  - Do not describe Flashblocks preconfirmation as finality or settlement.
  - Public deployment, DNS/HTTPS, managed infrastructure, and wallet or chain
    transactions require explicit user direction and the current runbook gates.
  - Never expose `.env` contents or copy local runtime data into public evidence.
- **Pattern references:**
  - `03_giwa_verified_intent_rail_positioning.md` for external positioning and
    MVP scope.
  - `docs/superpowers/specs/2026-07-22-gasok-selection-staging-submission-design.md`
    for the approved current staging/submission design.
  - `docs/superpowers/plans/2026-07-22-gasok-selection-staging-submission-implementation.md`
    for the current implementation sequence.
  - `docs/superpowers/specs/2026-08-01-giwa-release-4-owner-campaign-publishing-design.md`
    for the approved local Campaign Published Version and public-preview
    boundary.
  - `docs/implementation/giwa-gasok-staging-runbook.md` for approved staging
    operations.
- **Sources of truth / generated paths:**
  - `README.md` is the current repository map and stop-condition summary.
  - `docs/evidence/giwa-sepolia-mvp-evidence.json` and
    `apps/web/src/generated/deployment.json` generate
    `apps/web/public/flow-data.json` and `apps/web/public/partner-snapshot.json`.
  - `apps/web/scripts/export-artifact-manifest.mjs` owns the local manifest,
    command-evidence, provenance report, and SHA-256 sidecar in `docs/evidence/`.
  - `apps/web/src/lib/partner/publicCampaignStudio.ts` owns the public-safe,
    evidence-derived Campaign Studio projection.
  - `apps/web/src/lib/live/publicProofLookup.ts` owns exact-hash public proof
    lookup without exposing capabilities or private runtime data.
  - `docs/implementation/giwa-release-1-2-local-completion-freeze.md` records
    the local-advisory Release 1 and Release 2 completion boundary and the
    unresolved Git and deployment gates.
  - `docs/implementation/giwa-release-4-wallet-session-studio-local-completion-freeze.md`
    records the locally verified Owner wallet-session and read-only Studio
    boundary; hosted configuration, deployment, and real-wallet approval remain
    unresolved gates.
  - `docs/implementation/giwa-release-4-owner-campaign-drafts-local-completion-freeze.md`
    records the local-only Owner Campaign Draft boundary and the unresolved Git,
    deployment, real-wallet, and chain-action gates.
  - `docs/implementation/giwa-release-4-owner-campaign-publishing-local-completion-freeze.md`
    records the locally verified immutable Published Version and exact public-
    preview boundary, evidence invariance, and unresolved Git/deployment gates.
  - `apps/web/.data/` and `docs/evidence/local/` are ignored local-only runtime
    paths and are not release evidence.
- **Architecture decisions:**
  - Present one flagship mock-vault deposit flow rather than a dashboard-first
    or multi-template product.
  - Use one deep GIWA Genesis participant journey, joining participant,
    public-proof, and read-only partner views by the same matched Receipt.
  - ProofKPI reports evidence for manifest-covered testnet actions; it is not a
    security, identity, KYC, RWA issuance, or settlement layer.
  - Static evaluator routes remain available independently of the live adapter;
    the GASOK staging topology intentionally uses one SQLite-backed live instance.
  - Release 4 authenticates configured organization Owners with a five-minute
    application-defined EIP-191 challenge and a fixed eight-hour server session;
    that wallet-session authority does not authorize existing partner routes.
  - Owner-authenticated Studio campaign Drafts are organization-scoped,
    SQLite-backed, fixed to `mockVaultDeposit`, and remain disconnected from
    executable participant behavior.
  - Campaign Publishing keeps Drafts mutable, creates
    append-only immutable Published Versions, and exposes exact public preview
    URLs without enabling participant execution, Manifest/Receipt creation, or
    wallet and chain actions.
  - Publish eligibility requires a strict successful Version-history response;
    failed or malformed history remains unavailable and cannot be treated as an
    empty Version sequence.
  - Public artifact inventory scans text licenses, hashes PNG/WOFF2 binaries
    without decoding them as text, and keeps unsupported served extensions
    fail-closed.
- **Git conventions:** Use Conventional Commits. Stage, commit, branch, push, or
  open/merge a PR only with explicit user direction; never commit secrets or
  ignored runtime evidence.

<!-- END PROJECT PROFILE -->

### Profile lifecycle

- `SEED` is a starting point. Begin the requested project directly; do not run
  a separate onboarding audit merely to fill the profile.
- Populate confirmed fields incrementally. Unknown fields may remain undefined
  and must not block useful work.
- Change the state to `ACTIVE` when a concrete project and runnable stack exist.
  Thereafter, update durable commands, structure, constraints, sources of truth,
  and architecture decisions when they change.
- Do not rewrite the stable policy below to record project facts.

## Work Modes

### Fast path

For small, clear, low-risk work: inspect relevant context, make the smallest
coherent change, run the narrowest useful verification, and report concisely.

- Do not create a spec, plan file, worktree, checkpoint, or subagent workflow
  unless the user asks or the deliberate-path triggers below genuinely apply.
- Do not scan the whole repository, read every large file in full, or run every
  check when targeted context and verification are sufficient.
- Stop when the requested outcome is met. Do not fix unrelated discoveries
  unless they block the task.

### Deliberate path

Use a short plan for ambiguous, cross-cutting, or materially risky work, such as
public API changes, auth/security boundaries, persistent data migrations, broad
architecture changes, production impact, or irreversible operations.

- Resolve choices that materially change the result; make safe local assumptions
  for details that do not.
- Use skills only when the user names them or their applicability is concrete.
  Skill availability alone must not expand scope or manufacture artifacts.
- Use parallel work only for genuinely independent tasks when it reduces elapsed
  time without adding coordination risk. No file-count threshold applies.

## Autonomy and Safety

### Proceed autonomously for local work

- Read, search, edit, create, rename, and remove files in scope. Check references
  before renames/removals and preserve unrelated user changes.
- Add, remove, or update dependencies and lockfiles when needed. Prefer the
  existing stack and standard library; confirm the exact package/version exists
  and summarize why a new runtime dependency was justified.
- Run formatters, linters, type checks, tests, builds, development tools, and
  diagnostics. A useful full build does not require approval.
- Generate artifacts from their source and create migrations. Run a migration
  only against an explicitly local, disposable environment when its effect is
  understood and non-destructive.
- Investigate failures and fix causes within scope instead of repeating failed
  commands or immediately handing the problem back to the user.

Ask before adding a dependency only when it creates a material licensing,
security, billing, private-registry, or platform commitment.

### Require explicit user direction

- Stage or commit; create tags, branches, or worktrees; push; open/merge a PR;
  publish a package; or deploy.
- Change remote services, cloud resources, accounts, billing, production systems,
  or shared databases.
- Run destructive or hard-to-reverse operations, including destructive data
  migrations and history rewrites.
- Access, rotate, reveal, or handle secret values beyond the established secure
  mechanism, or expand into a materially different product/architecture choice.

Implementing code does not imply permission for Git publication, deployment, or
other external side effects.

### Hard boundaries

- Never expose, log, or commit credentials, tokens, private keys, or `.env`
  contents. Refer to secret names, not values.
- Never use destructive Git commands, bypass hooks/tests, or force-push unless
  the user directs the exact operation. Prefer `--force-with-lease` when an
  approved force-push is necessary.
- Never modify production data directly or treat a local dry run as authorization
  for a remote change.

## Implementation Quality

- Follow established patterns and public contracts. Avoid unrelated refactors,
  speculative abstractions, and compatibility layers without a real consumer.
- Read enough of each target and its callers/tests to understand the change; an
  entire large file is not mandatory when focused context is sufficient.
- Do not fabricate APIs, package names, versions, config keys, or command output.
  Verify unstable facts from authoritative sources when they matter.
- Validate boundaries touched by the change. Add failure handling, cleanup,
  retries, and timeouts where the actual risk requires them, not everywhere.
- Do not suppress errors silently. Preserve useful context without logging
  secrets or merging distinct failures into an ambiguous fallback.
- Use configuration for environment-dependent values and secrets. Ordinary
  stable constants may remain in code when that is clearest.
- Do not leave accidental stubs in a completed path. Intentional follow-up
  markers are allowed only when requested or when the limitation is explicit
  and delivered behavior remains complete.
- Edit sources of truth, not generated output. Regenerate committed projections
  with their owning command and include coupled changes.

## Verification

Match verification to the changed surface and risk:

| Change | Minimum useful evidence |
|---|---|
| Docs/comments | Relevant format/link check or direct inspection |
| Localized behavior | Focused test plus relevant type/lint check |
| Shared/public interface | Focused tests plus affected integration/contract checks |
| Dependency/config/build | Manifest-lock consistency and affected build/startup check |
| Data/auth/security/cross-system | Regression tests plus risk-appropriate integration checks |

- Start focused and widen only when the blast radius justifies it.
- Before completion, inspect the final diff and run fresh commands that prove the
  relevant claims.
- Fix failures caused by the change. Identify unrelated or pre-existing failures
  separately; do not claim completion with a caused failure unresolved.
- If a required check cannot run, state what was not verified and why. Report
  command names and concise outcomes rather than dumping large logs.

## Scoped Guidance and Tools

- Add a nested `AGENTS.md` only when a subtree has materially different rules.
  Keep it short and do not duplicate root policy.
- Put long procedures and durable background in linked docs; route to them only
  when relevant. Keep root plus nested guidance comfortably within context limits.
- Project skills may live in `.agents/skills/`, with `.claude/skills/` as the
  Claude Code copy. Keep intentional custom changes synchronized when both exist.
- If Engram is available, use it quietly for prior-session context and durable
  decisions, conventions, root causes, preferences, or release outcomes. Never
  store secrets, raw logs, speculation, or active checklists. Its absence must
  not block work.

## Communication

- Match the user's language, lead with outcomes, and avoid narrating every command.
- State material assumptions and uncertainty.
- In the final handoff, summarize changed files, verification evidence, and any
  unresolved risk or required next action.

# AGENTS.md

<!-- agent-template v0.2.0 · https://github.com/aop60003/agent -->

This file defines how AI coding agents (Claude Code, Codex, Cursor, Copilot, etc.) should operate in this repository.
It is a **project-wide guide** for the GIWA Verified Intent Rail MVP workspace.

> If repository code, tests, configs, or maintainer instructions conflict with this file, follow the **more specific source of truth**.

---

## 1. Project Overview

MVP workspace for the GASOK concept currently positioned as `GIWA Verified Intent Rail`.

The repository now contains the local-review submission packet plus a pnpm TypeScript workspace for:

- static and local-live web demo surfaces
- protocol hashing/signing/receipt libraries
- local mock contracts and GIWA Sepolia operation scripts
- local-advisory evidence, provenance, and deployment planning documents

---

## 2. Tech Stack

pnpm monorepo using TypeScript, Vitest, viem, Hardhat 3, Solidity, dependency-free public browser assets, Node.js helper scripts, and PowerShell CI/Engram helper scripts.

The current local checkout may not have `node_modules` installed. Installing dependencies remains an ASK FIRST action.

---

## 3. Project Structure

- `README.md` - repository entry point and current canonical document map
- `03_giwa_verified_intent_rail_positioning.md` - canonical product positioning and MVP scope
- `04_giwa_agent_permission_sandbox.md` - alternative GASOK idea candidate
- `05_giwa_flashtrace_replay_studio.md` - alternative GASOK idea candidate
- `06_giwa_builder_proofbook.md` - alternative GASOK idea candidate
- `apps/web/` - static demo, commercial `/user` flow, local live API, verifier, provenance, wallet, transaction, and partner modules
- `packages/protocol/` - canonical manifest, receipt, hash, signer, and evidence primitives
- `packages/contracts/` - Solidity mock token, mock vault, IntentRail event contract, Hardhat tests, and gated chain-operation scripts
- `docs/implementation/` - runbooks, blocker registers, staging and handoff records
- `docs/evidence/` - public-safe evidence JSON, provenance reports, visual QA artifacts, and local-advisory handoff records
- `.github/workflows/` - protected CI workflow definitions; do not dispatch or alter without explicit approval
- `scripts/engram-local.ps1` - project-local Engram wrapper

---

## 4. Non-Negotiable Constraints

- Public-facing product name is `GIWA Verified Intent Rail`.
- Treat `Loop Rail` and `GIWA Verified Activation Rail` as legacy/internal names unless explicitly discussing history.
- Do not claim real RWA issuance, real yield, real funds, settlement, KYC service, phishing prevention, or security guarantees.
- Do not describe Flashblocks preconfirmation as finality or settlement.
- Keep MVP scope testnet-only unless the user explicitly changes direction.

---

## 5. Commands

### 5.1 Setup / Build

Dependency installation is approval-gated:

```powershell
pnpm install --frozen-lockfile
```

Common local commands after dependencies are installed:

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @giwa/web --fail-if-no-match serve
```

Treat full builds, dependency installation, live servers, and any chain-operation package command as approval-sensitive when they are not clearly required by the current task.

### 5.2 Testing

Automated tests exist, but require dependencies to be installed. Use focused checks first:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/protocol --fail-if-no-match typecheck
pnpm --filter @giwa/contracts --fail-if-no-match typecheck
```

Dependency-free checks that are safe when `node_modules` is absent:

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/public/user-flow.js
node --check apps/web/public/demo-control-room.js
node --check apps/web/scripts/export-artifact-manifest.mjs
node --check apps/web/scripts/verify-provenance-report.mjs
node --check apps/web/scripts/serve-static.mjs
node --check apps/web/scripts/serve-live.mjs
```

For documentation and public-boundary verification, run targeted scans such as:

```powershell
rg -n "TODO|FIXME|TBD" . -g "*.md"
rg -n "instant finality|200ms confirmed|guarantee safety|perform KYC|real RWA|real yield" . -g "*.md"
```

When PowerShell is available, the CI helper scans are:

```powershell
pwsh -NoProfile -File scripts\ci\check-package-script-boundary.ps1
pwsh -NoProfile -File scripts\ci\check-safe-scans.ps1
```

---

## 6. Code Style

- Follow surrounding code style — do not introduce new patterns
- Pattern reference file: `03_giwa_verified_intent_rail_positioning.md`
- Alternative idea reference files: `04_giwa_agent_permission_sandbox.md`, `05_giwa_flashtrace_replay_studio.md`, `06_giwa_builder_proofbook.md`
- Public browser assets in `apps/web/public/` intentionally avoid framework dependencies.
- TypeScript packages use strict settings from `tsconfig.base.json`.
- Gated chain-operation scripts live in `packages/contracts/scripts/`; do not run them without explicit approval.

---

## 7. Safety Boundaries (3-Tier)

### ALWAYS (auto-execute)
- Read files, search code (grep, glob)
- Run type checks, linting, tests
- Check surrounding code context

### ASK FIRST (require user confirmation)
- Install packages / add dependencies
- Create/run DB migrations
- Delete files/directories
- Git push, branch merge
- Run full builds (time-consuming)
- Dispatch or rerun protected CI
- Start live servers that read local env files
- Run `serve:live`, `export:live-demo`, `deploy:*`, `fund:giwa`, `preflight:giwa`, `sign:manifest`, `anchor:giwa`, or `verify:giwa`
- Create cloud resources, configure DNS/HTTPS, connect managed infrastructure, or execute staging smoke tests

### NEVER (forbidden)
- Commit .env, credentials, secrets
- Use `--force` (without `--force-with-lease`), `--no-verify`, or `--no-gpg-sign` without explicit approval
- Run `rm -rf`, `git reset --hard`, or other destructive commands
- Modify production DB directly
- Delete or skip tests without approval (legitimate removal when a feature is genuinely gone — flag the intent, don't silently remove)
- Read, print, log, or paste local `.env` values or wallet signing material
- Treat local-advisory provenance as protected CI or release-grade evidence

---

## 8. Working Rules

### 8.1 Implementation
- ALWAYS read the target file completely before editing
- NEVER leave TODO, FIXME, stub, or placeholder code
- NEVER use generic catch-all error handling (`catch { return null }`)
- NEVER fabricate API versions, config values, or package names
- NEVER rewrite entire files without cause — prefer surgical edits; if a full rewrite is genuinely simpler, state why
- NEVER repeat a failed approach — investigate root cause first
- NEVER self-evaluate as "done" — run tests and show output

### 8.2 Robustness
- ALWAYS handle failure cases — assume external services WILL fail
- ALWAYS set timeouts on network/API calls unless the pattern is intentionally unbounded (e.g. streaming, long-poll)
- ALWAYS clean up resources in finally blocks
- ALWAYS validate inputs at system boundaries
- NEVER suppress errors silently — log with context
- NEVER hardcode config values — use env vars or config files

### 8.3 Edit Safety
- Re-read files before editing if significant time or many edits have passed
- When renaming: grep all references, then bulk-rename
- Before deleting files: verify no import/require references
- For 5+ independent files: batch via parallel tool calls or subagents (if the agent supports them)

---

## 9. Verification Standard (Evidence Required)

A task is not complete just because code was written. Show evidence.

### 9.1 Design — Consistent with existing architecture? No unnecessary complexity?
### 9.2 Implementation — Build / lint / typecheck pass? Tests pass? No leftover TODO/FIXME?
### 9.3 Integration — No regressions? Adjacent workflows still work?
### 9.4 Evidence — Show test/build/lint output. If verification cannot be run, explain why explicitly.
### 9.5 On Failure — If verification fails, do NOT mark the task done. Report what failed, what was tried, and whether a root cause is known, then request direction.

---

## 10. Architecture Notes (Why, not What)

- `03_giwa_verified_intent_rail_positioning.md` is the canonical external pitch source.
- The MVP should be framed as one GIWA Sepolia flagship flow, not a dashboard-first or multi-template product.
- ProofKPI is evidence/reporting for manifest-covered testnet actions, not a security, KYC, or RWA settlement layer.
- Current Sprint 53 state is local-advisory planning only: no Lightsail instance, DNS/HTTPS, managed infrastructure, public deployment, protected artifact metadata, release approval, or partner/customer signoff exists unless later evidence proves otherwise.

---

## 11. Git & Contribution Conventions

Defaults (override any that do not match your team):
- Branches: `feat/*`, `fix/*`, `chore/*`, `docs/*`
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- PRs: at least 1 review, CI pass, linear history preferred

---

## 12. Tooling

### 12.1 Engram Memory

Project-local rule for this folder: do not use bare `engram` commands here. Use `.\scripts\engram-local.ps1 ...` or `engram-advanced --db .\.engram\memory.db ...` so memory is stored only in `.\.engram\memory.db`.

If `engram` is available (Unix: `command -v engram`; Windows: `Get-Command engram`), use it as a quiet cross-session memory loop. Check availability once per session or substantial task, remember that result, and skip quietly if unavailable; never make the task fail just because memory is missing. Use `engram-advanced` for `--db <path>`, `--json`, context transfer, and operations review when available.

- **Recall first** when the task depends on prior session context, user/project history, previous decisions, deployment history, or phrases like "last time", "previous decision", or "what did we decide?"
  - Simple recall: `.\scripts\engram-local.ps1 find "<query>"`
  - Entity recall: `.\scripts\engram-local.ps1 who "<name>"`
  - Goal-aware recall: `.\scripts\engram-local.ps1 context-search "<query>" --goal task_handoff`
- **Save durable facts** after architectural/product/process decisions, completed investigations with reusable conclusions, release/deploy outcomes, unusual repo conventions, stable user preferences, important names/roles, and confirmed root causes that should survive this session.
  - Free text: `.\scripts\engram-local.ps1 save "<durable fact or decision>"`
  - Entity fact: `.\scripts\engram-local.ps1 remember "<entity>" "<fact>"`
- **Before saving**, ask: "Will this still matter to a future agent in a month?" If not, keep it in the active thread or plan instead.
- **Transfer work intentionally** when handing work to another agent or resuming a substantial session:
  - `.\scripts\engram-local.ps1 context-transfer <source-session-id> <target-agent-id>`
- **Review memory health only when useful** during long-running work, before major handoff/release, or when Engram behavior seems unreliable:
  - `.\scripts\engram-local.ps1 status`
  - `.\scripts\engram-local.ps1 operations-review`

Do not store noisy or temporary data:

- current task checklist items that already live in the active plan
- raw command output, logs, stack traces, or secrets
- speculation that has not been verified
- obvious facts already encoded in source code or docs

When saving, write one searchable atomic fact using this shape:
`<Prefix>: <stable subject/entity> <durable conclusion>; <reason/symptom/fix when useful>.`

Use these exact prefixes only: `Decision:`, `Convention:`, `Root cause:`, `User preference:`, `Release note:`.

Include likely future search terms such as repo name, file name, service name, feature name, error symptom, config key, command, or tool name. Avoid vague pronouns like "this", "that", or "it"; repeat the stable subject instead.

If `engram-ctx` hooks or MCP tools are installed, prefer their normal automatic indexing for large tool outputs. Use manual `.\scripts\engram-local.ps1 save` only for the distilled conclusion, not the full output.

### 12.2 Skills

Skills are placed in two locations (Claude Code + Codex compatible):
- `.agents/skills/<name>/SKILL.md` — canonical (edit here)
- `.claude/skills/<name>/SKILL.md` — Claude Code copy

Superpowers skills from [obra/superpowers](https://github.com/obra/superpowers) + custom skills (`review`, `sprint`, `deploy`).
Browse `.agents/skills/` for the full list and descriptions.

To add a skill: create `.agents/skills/<name>/SKILL.md` with `name` + `description` frontmatter, copy to `.claude/skills/`.
Project-specific product guidance currently lives in the root markdown documents.

### 12.3 Long-Running Tasks

For large features, use checkpoints. If context exceeds 70%, save state to `.claude/workspace/progress.md` and `/clear`.

---

## 13. Operational Notes

### 13.1 Secrets
- NEVER log, commit, or echo secret values. Reference via env vars or a secret manager only.
- Local live and chain-operation paths may use server-only env vars. Keep local secrets in git-ignored `.env` files and document required variable names without values.
- If a secret is accidentally committed: rotate immediately, then scrub history (`git filter-repo`).

### 13.2 Dependencies (gate detail for §7 ASK FIRST)
Before proposing a new dependency, verify: (a) license is compatible, (b) last release within ~12 months OR widely used, (c) no lighter alternative in the current stack. State these in the request.

### 13.3 Communication
- Match the user's working language (e.g. Korean ↔ English).
- Short, concrete answers; skip preamble. State uncertainty when present.

### 13.4 Onboarding (first actions in this repo)
1. Read `AGENTS.md` (this file), then `README.md`.
2. Scan `03_giwa_verified_intent_rail_positioning.md`.
3. Run the documentation verification scans in section 5.2.
4. Check whether dependencies are installed before claiming test/typecheck/build results.
5. Open the Sprint 43 blocker handoff and Sprint 51-53 Lightsail planning records before any staging or demo-route discussion.

---

## 14. Additional Context

Large docs should be split and referenced. Claude Code: `@path/to/file.md` (on-demand load). Other agents: standard markdown links — readers open as needed.

- `@03_giwa_verified_intent_rail_positioning.md` - canonical external positioning
- `@04_giwa_agent_permission_sandbox.md` - alternative AI/Web3 permission candidate
- `@05_giwa_flashtrace_replay_studio.md` - alternative Flashblocks debugging candidate
- `@06_giwa_builder_proofbook.md` - alternative builder evidence candidate

---

## 15. Agent Behavior Summary

These 5 principles apply always — return to them especially when stuck:

1. **Read first** — read before editing
2. **Change as little as necessary** — only change what's needed
3. **Follow existing patterns** — match the codebase
4. **Verify with evidence** — prove it works
5. **State uncertainty honestly** — say when you don't know

> The goal is not "working code" but **safe, reviewable, repository-consistent changes**.

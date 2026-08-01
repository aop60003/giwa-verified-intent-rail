# Project Agent and Skills Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the current repository-local agent template and skill set while retaining an accurate ACTIVE Looprail project profile.

**Architecture:** The root `AGENTS.md` uses the stable upstream `v0.3.0` policy with one project-owned profile block. Skills are installed once into `.agents/skills/` and mirrored exactly into `.claude/skills/`; `CLAUDE.md` imports the root contract.

**Tech Stack:** Markdown, PowerShell, Git, repository-local Codex/Claude skill directories

---

### Task 1: Install the pinned upstream template assets

**Files:**
- Modify: `AGENTS.md`
- Create: `CLAUDE.md`
- Create: `.agents/skills/**`
- Create: `.claude/skills/**`

- [x] **Step 1: Run the inspected installer without Engram mutation**

Run the cloned `aop60003/agent` PowerShell installer with `-Force
-SkipEngram`. The expected output reports creation of `AGENTS.md`, `CLAUDE.md`,
the pinned Superpowers skills, and the three custom skills under both local
skill roots.

- [x] **Step 2: Confirm the raw installation inventory**

Run:

```powershell
rg --files .agents/skills .claude/skills
```

Expected: both roots contain the same relative file set, including
`brainstorming`, `review`, `sprint`, and `deploy`.

### Task 2: Activate the Looprail project profile

**Files:**
- Modify: `AGENTS.md`

- [x] **Step 1: Replace only the bounded upstream Project Profile**

Set the state to `ACTIVE` and record the confirmed product, pnpm workspace,
commands, source structure, safety boundaries, canonical routing documents,
generated evidence paths, and Git conventions. Keep the stable policy outside
`BEGIN PROJECT PROFILE` and `END PROJECT PROFILE` identical to upstream
`v0.3.0`.

- [x] **Step 2: Inspect the profile and stable-policy boundary**

Run:

```powershell
git diff -- AGENTS.md
```

Expected: the upstream template replacement is visible and the only
project-specific customization inside the new template is the bounded profile.

### Task 3: Verify the local agent installation

**Files:**
- Verify: `AGENTS.md`
- Verify: `CLAUDE.md`
- Verify: `.agents/skills/**`
- Verify: `.claude/skills/**`

- [x] **Step 1: Validate the agent contract and skill projections**

Run a PowerShell verification script that asserts the `v0.3.0` stamp, `ACTIVE`
state, exact `@AGENTS.md` import, matching relative file inventories, matching
SHA-256 hashes, and valid `name`/`description` frontmatter in every `SKILL.md`.

Expected: exit code `0` and a summary with zero mismatches.

- [x] **Step 2: Inspect the complete change set**

Run:

```powershell
git status --short
git diff --stat
git diff --check
```

Expected: only the approved agent configuration, synchronized skills, and these
design/plan records are changed; `git diff --check` exits `0`. Leave the changes
unstaged and uncommitted because no Git-history change was requested.

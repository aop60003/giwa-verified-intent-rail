# Project Agent and Skills Refresh Design

## Goal

Refresh the repository-local agent operating contract from
`aop60003/agent@6b884013bc510c577335c8f3a299c0e3b6bd0761` while preserving the
confirmed GIWA Verified Intent Rail product, safety, runtime, and release facts.

## Approved Approach

Use the upstream `v0.3.0` stable policy as the root `AGENTS.md` body and replace
only its bounded Project Profile with an `ACTIVE` Looprail profile. This removes
the stale documentation-only description without carrying the old template's
duplicated operating rules forward.

Install repository-local skills into both supported projections:

- `.agents/skills/` is the canonical project skill tree.
- `.claude/skills/` is the synchronized Claude Code copy.
- Superpowers comes from the upstream installer's pinned `v6.1.1` release.
- `review`, `sprint`, and `deploy` come from the inspected `aop60003/agent`
  revision above.

Create `CLAUDE.md` as the one-line `@AGENTS.md` import expected by the upstream
template. Keep Engram project-local and do not install or initialize a global
Engram database.

## Project Profile Content

The active profile records the pnpm workspace, TypeScript/Vitest/Hardhat/viem
stack, web/protocol/contracts/Lightsail layout, runnable setup/development/check
commands, current GASOK routing documents, generated public evidence paths, and
the existing testnet-only product-claim boundaries.

## Safety and Verification

No dependency, remote, cloud, wallet, database, deployment, or Git-history
operation is part of this refresh. Verification checks the upstream version
stamp, expected skill inventory, byte-for-byte synchronization between both
skill projections, skill frontmatter, `CLAUDE.md` import, clean forbidden-claim
wording in the active profile, and the final Git diff. Application tests are not
required because runtime source and dependencies are unchanged.

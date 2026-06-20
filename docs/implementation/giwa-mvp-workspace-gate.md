# GIWA MVP Workspace Gate

## Workspace Mode

Sprint 0 runs in non-git prototype mode.

Current note for Sprint 39: this section is historical Sprint 0 evidence. The workspace has since been converted to a git-backed repository with a workflow file, but protected CI provenance remains blocked by the external GitHub account gate and missing protected artifact metadata. Current readiness records should use the Sprint 39 handoff evidence instead of treating the Sprint 0 non-git observation as the active state.

Evidence:

```powershell
Test-Path .\.git
```

Observed result on 2026-06-16:

```text
False
```

At Sprint 0, because this folder was not a git repository, commit-based sprint execution was inactive. Later sprint plans could keep commit commands as review guidance, but agents could not report commits, require git history, or assume branch isolation until the user initialized or cloned a git-backed workspace.

## Commit Step Policy

- Sprint 0 file creation and edits are direct workspace edits.
- Commit steps in Sprint 1 through Sprint 7 are inactive in this folder until `.git` exists.
- If the user converts this folder to a git repository, agents must check `git status --short --branch` before editing and protect unrelated user changes.
- Git push, branch merge, reset, destructive checkout, and force operations remain blocked unless the user explicitly approves the exact operation.

## User Change Protection

- Read target files completely before editing.
- Prefer surgical edits over rewrites.
- Re-read files before editing when significant time has passed.
- Do not revert files that changed outside the current task.
- If a user change conflicts with a Sprint 0 gate, stop and ask before overwriting it.

## Evidence Locations

Raw local-only evidence:

- `docs/evidence/local/`
- `*.raw.json`
- `*.private.json`
- local app data under `apps/web/.data/`

Commit-safe evidence:

- sanitized Markdown summaries under `docs/evidence/`
- sanitized JSON files that exclude secrets, auth headers, tokenized RPC URLs, and private wallet material
- final partner-facing summaries that contain public addresses, transaction hashes, block metadata, hashes, and redacted provider labels only

Raw evidence must stay local until a redaction check passes. Final evidence must be reproducible from canonical payloads and must never depend on hidden local state.

## Package Manager And Bootstrap Sequence

Package manager:

```text
pnpm@10.32.1
```

Sprint 0 bootstrap sequence:

1. Create the root workspace files.
2. Create package shells for `apps/web`, `packages/protocol`, and `packages/contracts`.
3. Record dependency approval requirements.
4. Do not install packages in Sprint 0.

Post-approval bootstrap sequence:

1. Confirm dependency approval status is `approved`.
2. Install only the approved package set and versions.
3. Generate the lockfile.
4. Run workspace `test`, `typecheck`, and `build`.
5. Record the command output in the sprint handoff.

## Sprint 1 Start Conditions

Sprint 1 can start only when:

- workspace mode is still explicit
- `.env.example` exists and contains no secret values
- dependency approval is complete or Sprint 1 stays dependency-free
- role keys remain separated by policy
- the evidence schema supports `intentHash`, `verifierInputHash`, and `receiptHash`
- Flashblocks remains fast feedback only, not final confirmation
- the MVP remains one GIWA Sepolia mock vault flow

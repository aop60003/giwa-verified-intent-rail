# Sprint 0 Scope and Evidence Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the MVP scope, evidence schema, workspace mode, roles, dependency gate, and sprint handoff rules before code starts.

**Architecture:** This sprint is documentation-only. It prevents implementation drift by turning the final review summary into concrete gates that every later sprint must satisfy.

**Tech Stack:** Markdown planning documents, PowerShell verification scans, future TypeScript/Hardhat stack not yet installed.

---

## Start Conditions

- Current repo remains documentation-only.
- No package installation has been approved.
- Current workspace may not be a `.git` repository.
- `docs/superpowers/specs/2026-06-15-giwa-mvp-final-review-summary.md` exists.

## Files

- Create or update: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Create or update: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.env.example`
- Update: `.gitignore`
- Create: `apps/web/package.json`
- Create: `packages/protocol/package.json`
- Create: `packages/contracts/package.json`
- Create: `docs/evidence/giwa-sepolia-mvp-evidence.schema.md`
- Create: `docs/implementation/giwa-mvp-dependency-approval.md`
- Create: `docs/implementation/giwa-mvp-role-and-key-policy.md`
- Create: `docs/implementation/giwa-mvp-workspace-gate.md`
- Create: `docs/implementation/giwa-mvp-faucet-and-preflight.md`
- Reference only: `docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md`

## Tasks

- [ ] Confirm workspace mode.

Run:

```powershell
Test-Path .\.git
```

Expected:

```text
True means commit-based sprint execution can be used.
False means Sprint 0 must document non-git prototype mode or the user must initialize/clone a git repository before Sprint 1.
```

- [ ] Create the workspace gate document.

Required decisions:

- git-backed execution or non-git prototype mode
- whether commit steps in later sprint plans are active
- where generated evidence files live
- how user changes are protected
- whether local run data is ignored or redacted before commit
- which evidence files are raw local-only and which final redacted artifacts are commit-safe
- exact package manager and workspace bootstrap sequence

- [ ] Create the root workspace scaffold.

Required outputs:

- root `package.json` with `packageManager`
- root `package.json` scripts for `test`, `typecheck`, and `build`, each delegating to recursive workspace commands with fail-on-no-match behavior
- `pnpm-workspace.yaml` including `apps/*` and `packages/*`
- `tsconfig.base.json`
- empty package shells for `apps/web`, `packages/protocol`, and `packages/contracts`
- `.env.example` with variable names only
- `.gitignore` entries for env files, Node output, local run data, and Hardhat output

- [ ] Create the role and key policy.

Required roles:

- `DEPLOYER_PRIVATE_KEY`
- `CAMPAIGN_SIGNER_PRIVATE_KEY`
- `VERIFIER_PRIVATE_KEY`
- `INTENT_SUBMITTER_PRIVATE_KEY`
- demo user wallet controlled by the user's wallet app

Required statement:

```text
The app must not ask for, store, echo, or commit the demo user's private key.
```

Required boundaries:

- `CAMPAIGN_SIGNER_PRIVATE_KEY` signs manifests only from server-side code or local scripts.
- `VERIFIER_PRIVATE_KEY` emits verifier decision events only.
- `INTENT_SUBMITTER_PRIVATE_KEY` relays `IntentSubmitted` only.
- no private key may appear in logs, Markdown, JSON evidence, browser bundles, or screenshots.
- evidence files may include public addresses, tx hashes, block data, signatures, sanitized RPC provider labels, and hashes, but not private keys, bearer tokens, RPC query tokens, API keys, mnemonics, or auth headers.
- role keys should be distinct, GIWA Sepolia-only, throwaway, non-personal, and not reused from mainnet; exceptions require explicit user approval.
- exposed or suspected-exposed keys must be rotated before the next sprint starts.

Required `.env.example` sections:

```text
# SERVER_ONLY - never import into client components or expose through NEXT_PUBLIC
GIWA_SEPOLIA_RPC_URL=
GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL=
GIWA_EXPLORER_TX_URL_TEMPLATE=
GIWA_EXPLORER_ADDRESS_URL_TEMPLATE=
DEPLOYER_PRIVATE_KEY=
CAMPAIGN_SIGNER_PRIVATE_KEY=
VERIFIER_PRIVATE_KEY=
INTENT_SUBMITTER_PRIVATE_KEY=

# PUBLIC_CLIENT_SAFE - no secrets, tokens, private keys, or tokenized RPC URLs
NEXT_PUBLIC_GIWA_CHAIN_ID=
NEXT_PUBLIC_INTENT_RAIL_ADDRESS=
NEXT_PUBLIC_MOCK_TOKEN_ADDRESS=
NEXT_PUBLIC_MOCK_VAULT_ADDRESS=
```

Required `.env.example` variables:

- `GIWA_SEPOLIA_RPC_URL`
- `GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL`
- `GIWA_EXPLORER_TX_URL_TEMPLATE`
- `GIWA_EXPLORER_ADDRESS_URL_TEMPLATE`
- `DEPLOYER_PRIVATE_KEY`
- `CAMPAIGN_SIGNER_PRIVATE_KEY`
- `VERIFIER_PRIVATE_KEY`
- `INTENT_SUBMITTER_PRIVATE_KEY`
- `NEXT_PUBLIC_GIWA_CHAIN_ID`
- `NEXT_PUBLIC_INTENT_RAIL_ADDRESS`
- `NEXT_PUBLIC_MOCK_TOKEN_ADDRESS`
- `NEXT_PUBLIC_MOCK_VAULT_ADDRESS`

Required `.env.example` verification:

```powershell
Test-Path .\.env.example
$envSecretPattern = "0x[a-fA-F0-9]{64}|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en"
rg -n $envSecretPattern .\.env.example
```

Expected:

```text
.env.example exists.
The secret scan returns no live values.
```

- [ ] Create the dependency approval document.

Each dependency group must include:

- package name
- pinned version or version range
- purpose
- license check
- recent release or adoption check
- lighter alternative considered
- approval status
- approval date and approver

Initial dependency groups:

- TypeScript toolchain
- Next.js and React
- viem
- Vitest
- Hardhat and contract testing tools

- [ ] Create the faucet and preflight document.

Required checks:

- GIWA Sepolia standard RPC chain id
- GIWA Sepolia Flashblocks RPC chain id
- explorer URL template smoke check
- deployer balance
- verifier operator balance
- intent submitter balance
- demo user wallet balance
- mock token mint path
- `estimateGas`-based minimum test ETH for deploy, submit, decision, approve, and deposit
- gas price snapshot
- faucet source URL
- faucet claimed timestamp and next retry timestamp when applicable
- fallback path when faucet is unavailable

- [ ] Create the evidence schema document.

Minimum sections:

- network
- roles
- contracts
- manifest
- transactions
- confirmation
- verifier
- receipt
- partner summary

Required reproducibility fields:

- `canonicalManifestPayload`
- `manifestSignature`
- EIP-712 domain fields
- `recoveredSigner`
- `intentHash`
- `verifierInputHash`
- standard RPC transaction receipt snapshots
- decoded log snapshots with `contractAddress` and `logIndex`
- `confirmationDepth`
- `headBlockNumberAtVerification`
- `canonicalReceiptPayload`
- deterministic field order and schema version
- `receiptHash`
- failure reason and matched fields for non-success decisions

`canonicalVerifierInputPayload` must include, in exact order:

- `schemaVersion`
- `chainId`
- `intentHash`
- `depositTxHash`
- `depositTransactionSnapshotHash`
- `depositReceiptSnapshotHash`
- `decodedLogSnapshotHash`
- `confirmationDepth`
- `headBlockNumberAtVerification`
- `verifierVersion`

`verifierInputHash = keccak256(canonicalVerifierInputPayload)`. Golden vectors must include payload JSON, payload byte hex, and hash.

Required redaction policy:

- raw local evidence goes under `docs/evidence/local/` or uses `*.raw.json` / `*.private.json`
- commit-safe evidence is sanitized and final
- RPC URLs are stored as provider label plus sanitized host/path only; query strings, headers, tokens, and credentials are replaced with `<redacted>`
- evidence export must fail if secret scan detects private keys, bearer tokens, RPC query tokens, API keys, or mnemonics

- [ ] Mark the older full implementation plan as reference-only.

Add a short warning near the top of `docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md`:

```text
This document is a reference map only. Do not execute it directly. Use the 2026-06-16 sprint plans instead.
```

## Exit Gate

Sprint 0 is complete only when:

- workspace mode is explicit
- root workspace scaffold exists
- `.env.example` exists without secret values
- `.gitignore` protects env files, local run data, Node output, and Hardhat output
- root scripts cannot false-pass when no workspace package matches
- evidence redaction policy exists
- dependency approval checklist exists
- key roles are separated
- faucet/preflight checklist exists
- evidence schema exists
- older full plan is clearly marked reference-only
- Sprint 1 can start without product-scope ambiguity

## Stop Conditions

Stop if:

- the user wants git-backed execution but `.git` is absent
- dependency installation is requested before approval
- any plan asks for the demo user's private key
- evidence schema cannot support recomputing `intentHash` and `receiptHash`

## Handoff To Sprint 1

Pass these artifacts:

- workspace mode
- workspace scaffold paths
- dependency approval status
- role/key policy
- `.env.example` variable contract
- evidence schema path
- final manifest and receipt field requirements

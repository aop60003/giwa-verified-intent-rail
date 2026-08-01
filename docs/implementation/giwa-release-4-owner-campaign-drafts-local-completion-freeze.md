# GIWA Release 4 Owner Campaign Drafts Local Completion Freeze

## Status and authority

This records the locally verified Release 4 Owner Campaign Draft slice as of
2026-08-01. It is local-advisory evidence only. It does not stage or commit
source, authorize Git publication, deploy a service, configure hosted runtime,
connect a real wallet, collect a real signature, call an RPC endpoint, or send
a chain action.

The approved [Owner Campaign Draft design](../superpowers/specs/2026-08-01-giwa-release-4-owner-campaign-drafts-design.md)
and [implementation plan](../superpowers/plans/2026-08-01-giwa-release-4-owner-campaign-drafts.md)
are the scope authority. The earlier [wallet-session Studio freeze](giwa-release-4-wallet-session-studio-local-completion-freeze.md)
remains the authority for the application-defined EIP-191 Owner authentication
boundary.

## Implemented local boundary

Migration `009_studio_campaign_drafts` adds the SQLite `campaigns` table and
its checksum, constraints, foreign keys, and organization/list index. The live
store exposes matching memory and SQLite campaign repositories. The campaign
service bootstraps one fixed `gasok-demo` `published-baseline` record and
supports only server-generated, organization-scoped `draft` records with the
fixed `mockVaultDeposit` template and optimistic revision updates.

Hosted startup evaluates the complete required schema immediately after opening
the store and before Studio auth or Campaign bootstrap. Missing or drifted
schema closes the store and aborts startup. Migration 009 verification includes
the positive revision constraint and the exact Campaign index column order,
including descending `updatedAt` metadata read through SQLite
`pragma_index_xinfo`.

The authenticated Studio routes are exactly:

```text
GET   /api/studio/campaigns
POST  /api/studio/campaigns
PATCH /api/studio/campaigns/:campaignId
```

Only an existing, non-expired, non-revoked active Owner session supplies the
organization and member authority. POST and PATCH require the configured exact
Origin and use a privacy-safe per-session mutation limit. Unknown paths and
methods fail closed. The public-safe campaign projection never serializes a
session token, organization ID, member ID, source, creator, updater, or
internal session context.

`/studio` now renders the baseline first as read-only and supports a narrow
Draft list/editor for name and summary only. The UI retains the testnet label,
dirty-state protection, keyboard focus behavior, responsive layout, and
safe DOM construction. No Draft is public or executable: it cannot publish,
version, delete, clone, issue a Manifest or Receipt, or configure an action,
target, amount, selector, calldata, asset, or verifier rule.

## Fresh verification evidence

The focused campaign regression command completed with exit 0:

```powershell
pnpm --filter @giwa/web exec vitest run -- `
  src/lib/live/studioCampaignRepository.test.ts `
  src/lib/live/studioCampaignService.test.ts `
  src/lib/live/studioSessionCookie.test.ts `
  src/lib/live/studioCampaignApi.test.ts `
  src/lib/live/liveSchemaMigrations.test.ts `
  src/lib/live/liveStore.test.ts `
  src/lib/live/liveRoutePolicy.test.ts `
  src/lib/live/liveRequestSafety.test.ts `
  src/lib/live/liveRateLimit.test.ts `
  src/lib/live/studioAuthRuntimeContract.test.ts `
  src/lib/live/studioPresentation.test.ts `
  src/lib/live/studioCampaignPresentation.test.ts
```

Result: 12 files passed, 179 tests passed, 0 failures. Node emitted its known
experimental SQLite warning; it was non-failing.

Before this document edit, the fresh full local gates completed with exit 0:

| Command | Result |
| --- | --- |
| `pnpm --filter @giwa/web test` | 107 files, 887 tests passed |
| `pnpm typecheck` | all 3 workspace projects passed |
| `pnpm test` | web 107 files/887 tests, protocol 5 files/29 tests, contracts 3 files/21 tests passed |
| `pnpm build` | all 3 workspace projects passed |
| `& .\scripts\ci\check-safe-scans.ps1` | pass; 1 unfinished-marker, 93 unsupported-claim, and 305 sensitive-term findings, all allowlisted |

The documented post-edit verification repeats these gates and is recorded in
the Task 8 handoff report. `pnpm --filter @giwa/web artifact:scan` is not a
gate for this slice: its existing baseline is blocked by five Release 3
font/license files with extensions unsupported by that manifest policy.

Final independent review found two hosted schema fail-closed gaps: the startup
guard ran too late, and migration 009 did not verify the revision constraint or
index sort direction. Both were reproduced, fixed, and independently
re-reviewed with no remaining Critical, Important, or Minor finding. The final
post-review run passed 3 focused files/80 tests, web 107 files/889 tests,
workspace typecheck/test/build, and the direct safe scan.

## Deterministic local API lifecycle

A disposable temporary SQLite database and deterministic locally derived test
account exercised the actual auth service/API, campaign service/API, SQLite
repositories, and a reopened store. No real wallet, network, RPC, or chain was
used; the session token stayed only in process memory and was never logged or
written. The temporary directory, database, and any sidecars were removed.

The verified status vector was:

```text
200, 201, 200, 409, 200, 204, 401
```

It covers Owner list with the fixed baseline first; Draft creation at revision
1; update to revision 2; stale-revision conflict; close/reopen persistence at
revision 2; logout; and rejected use of the revoked session. Each campaign API
response was checked for token and internal-field exclusion and for the fixed
template without a publish/execution field. The disposable harness was removed
after recording this evidence.

## Public and execution boundary

The four generated/public-evidence paths remain outside this slice:

- `docs/evidence/giwa-sepolia-mvp-evidence.json`
- `apps/web/src/generated/deployment.json`
- `apps/web/public/flow-data.json`
- `apps/web/public/partner-snapshot.json`

The focused source review found no `eth_sendTransaction`,
`wallet_addEthereumChain`, Delete, Execute, custom target, amount, calldata,
or action-template-selection control in the Studio campaign modules. The only
`Publish` substring was the intended non-interactive `Published baseline`
label. The existing user-triggered `wallet_switchEthereumChain` behavior was
not changed. Public `/partner` remains read-only and independent of Drafts.

## Browser verification

The primary agent ran the real public browser module and DOM against a local,
deterministic same-origin fixture without a wallet, signature, RPC, or chain
call. The verified states were: authenticated baseline-first/no-Draft and
loading views; an 80-Unicode-code-point name with Save enabled and a complete
revert with Save disabled; create and edit success; a 503 save failure that
preserved the local input; a 409 conflict that preserved the local input;
Reload latest success; list omission and list failure that both preserved the
local conflict editor; and a 401 mutation that returned to the session-expired
sign-in gate. A dirty Sign out attempt was dismissed and retained the editor.

The responsive matrix covered 320, 360, 768, 1024, and 1440 CSS pixels plus a
512-pixel 200-percent-zoom proxy. It initially exposed a 768-pixel Studio header
overflow. A focused regression test failed before the fix, then passed after a
scoped at-or-below-800-pixel Studio-header rule. The post-fix matrix had no
horizontal overflow, narrow layouts stacked, and measured Campaign controls
were at least 44 pixels high.

The browser safety policy stopped the same-tab `/partner` navigation check
while its dirty-state confirmation was open. Therefore modifier/new-tab
behavior, full keyboard-only traversal, console-log inspection, and visual
comparison of `/partner` are not claimed as browser-complete here. Their
deterministic presentation/decision regressions passed in the verified suite;
they remain explicit manual-review items rather than inferred browser evidence.

## Exclusions and remaining gates

Excluded from this slice: publishing, campaign versions, membership mutation,
Editor/Viewer provisioning, Receipt history, analytics, PostgreSQL, mainnet,
no real assets, funds, yield/rewards, settlement, KYC service, or security
guarantees.

The source remains an unstaged local worktree pending human Git review and an
explicit decision to stage, commit, branch, push, or open a PR. Protected CI
has not evaluated an approved source freeze. Deployment, hosted configuration,
DNS/HTTPS, migration of a hosted database, real wallet authentication,
signature collection, and every testnet/mainnet chain action remain separately
approved gates under the GASOK staging runbook.

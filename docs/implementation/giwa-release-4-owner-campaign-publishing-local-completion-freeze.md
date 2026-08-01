# GIWA Release 4 Owner Campaign Publishing Local Completion Freeze

Date: 2026-08-01

## Status and authority

This document records the locally verified Campaign Published Version and
public-preview boundary for `GIWA Verified Intent Rail`. It is local-advisory
evidence only. It is limited to GIWA Sepolia testnet, mock assets, and the fixed
`mockVaultDeposit` template.

The local completion verification recorded here did not stage or commit source,
establish a protected-CI source freeze, deploy a service, migrate a hosted
database, or configure DNS or HTTPS. It did not access secrets, connect a real
wallet, collect a signature, send an RPC call, or take a chain action. The approved [Campaign Publishing design](../superpowers/specs/2026-08-01-giwa-release-4-owner-campaign-publishing-design.md)
and [implementation plan](../superpowers/plans/2026-08-01-giwa-release-4-owner-campaign-publishing.md)
define the local scope. The [GASOK staging runbook](giwa-gasok-staging-runbook.md)
remains the separate authority for any later approved rollout.

## Locally completed boundary

An authenticated active organization Owner can publish one saved, clean Draft
revision only after an exact Version-history response has established sequence
readiness. The mutable Draft remains the editing workspace. Publication copies
its bounded name, summary, revision, and fixed action template into a new
append-only Published Version. Earlier Versions retain their exact public
snapshot when the Draft changes and a later Version is published.

The implementation includes:

- equivalent memory and SQLite Campaign Version repositories;
- Owner and organization scoping for publication and private history;
- one SQLite `BEGIN IMMEDIATE` publication transaction with bounded duplicate,
  revision-conflict, and no-change outcomes;
- strict server-owned version numbers, publication time, canonical JSON, hash,
  publisher, network, and public path;
- a strict history parser that keeps Publish disabled and renders unavailable
  copy after load/parse failure, while reserving empty-history copy for an exact
  ready response with zero Versions;
- exact-version public lookup without Draft or campaign enumeration;
- a Studio confirmation flow, immutable Version history, and exact preview
  links; and
- a dependency-light public page that renders safe text through DOM APIs and
  reports `executionAvailable: false`.

The exact API paths are:

```text
POST /api/studio/campaigns/:campaignId/publish
GET  /api/studio/campaigns/:campaignId/versions
GET  /api/public/campaigns/:campaignId/versions/:versionNumber
GET  /campaign/:campaignId/v/:versionNumber
```

Private publication and history require the existing active Owner session.
Publication also requires the configured exact Origin and privacy-safe mutation
limit. The public API accepts only a canonical lowercase Draft campaign ID and
a positive Version number. It returns the public snapshot only and omits
organization IDs, member IDs, canonical JSON, repository source values,
authorization capabilities, session values, and raw storage errors.

## Storage and canonical hash boundary

Migration `010_campaign_versions`, checksum `campaign-versions-v1`, adds the
`campaign_versions` table, tenant-aware composite foreign keys, positive-number
and fixed-template constraints, unique revision and hash indexes, and the exact
`campaign_versions_no_update` and `campaign_versions_no_delete` triggers. Both
triggers abort changes with `campaign_versions_immutable`; the repository has no
update or delete operation for a Published Version.

Canonical JSON uses the fixed displayed key order, JSON escaping, UTF-8, and no
insignificant whitespace. The application-defined digest is
`keccak256(utf8(canonicalJson))`. The verified golden Keccak-256 vector is:

```text
0x101fd0cda215689f915c76bf14471a1d4be5e71c0491e8c5f48abd170028a18e
```

This digest identifies the stored preview snapshot. It is not a wallet
signature. It is not a contract anchor, settlement proof, finality claim, or
security guarantee.

## Fresh local verification

The Task 8 verification commands were run from the repository root after the
implementation and before the final documentation checks.

| Command | Exit | Observed result |
| --- | ---: | --- |
| Task 8 focused seven-file Vitest command | 0 | 7 files, 68 tests passed |
| `pnpm --filter @giwa/web test` | 0 | 113 files, 944 tests passed |
| `pnpm typecheck` | 0 | web, protocol, and contracts passed |
| `pnpm test` | 0 | web 944, protocol 29, contracts 21 tests passed |
| `pnpm build` | 0 | all three workspace projects passed |
| `scripts/ci/check-safe-scans.ps1` | 0 | 1/98/319 findings; 0 unallowlisted |
| `git diff --check` | 0 | no whitespace errors |
| `pnpm --filter @giwa/web artifact:scan` | 0 | 31 public artifacts and 27 public evidence files; scan decision `pass` |

The integration gate now inventories the self-hosted Pretendard fonts and the
font/icon license files instead of treating them as unmanifested. Text licenses
remain subject to the blocking text scanner. PNG and WOFF2 binaries are hashed
in the fail-closed manifest but are not decoded as text scan targets. An
unsupported served extension still fails manifest validation.

Node printed its known experimental SQLite and type-stripping warnings during
the applicable commands. They were non-failing.

## Deterministic API and browser evidence

The authoritative lifecycle and browser observations are recorded in
`.superpowers/sdd/r4-publishing-task-7-report.md`. A disposable SQLite runtime
using the real handlers produced this sequence:

```text
200 list -> 201 Draft r1 -> 200 Draft r2 -> 201 Version 1
-> 409 repeated revision -> 200 history/public Version 1
-> 200 Draft r3 -> 201 Version 2 -> byte-identical Version 1 reread
-> 204 logout -> 401 publish after logout
```

The same vector asserted zero rows in runs, submitted transactions, decisions,
Receipts, verifier inputs, public evidence bundles, verification jobs, and
public campaign events. The disposable database was removed.

The Task 7 browser matrix covered Studio and the public preview at 320, 360,
512, 768, 1024, and 1440 CSS pixels with no final horizontal overflow. It also
covered clean and dirty Draft eligibility, confirmation and pending states,
Version history, conflict and retry states, session expiry, exact Version 1 and
Version 2 previews, generic missing/unavailable states, heading focus, wrapped
hashes, and zero final application console warnings or errors. Task 6 separately
verified the corrected Campaign-header intrinsic-width gap at 801 and 820
pixels, plus the surrounding 800, 900, and wide states.

Manual-only browser items remain: a complete keyboard-only tab and focus-trap
cycle, real browser zoom at 200 percent, and emulated
`prefers-reduced-motion: reduce`. The 512-pixel inspection is a layout-pressure
proxy, not a claim that real 200-percent browser zoom was exercised.

Post-review presentation regressions additionally verify that publication stays
blocked until strict Version-history readiness, malformed history is distinct
from an exact empty history, and a failed history renders only unavailable copy.
These are deterministic source/test results rather than new browser claims.

## Existing evidence invariance

The following Git blob hashes were captured before verification, recomputed
after the workspace build, and matched exactly. `git diff --exit-code` also
reported no diff for all four paths.

| Path | Unchanged Git blob hash |
| --- | --- |
| `apps/web/public/flow-data.json` | `1bdf141ef20cbbbf602191fb674268a3f656204a` |
| `apps/web/public/partner-snapshot.json` | `aa79fccfe8e9a62de3125574b617401580eac398` |
| `docs/evidence/giwa-sepolia-mvp-evidence.json` | `cf78c21004903dc63feb04f5dcca6ffcf3c6100b` |
| `apps/web/src/generated/deployment.json` | `1fc61ee309a4fa0323f2d72e216d4f88f97c8410` |

The claim/control scan retained only approved boundaries: negative copy that a
Draft save does not execute a transaction and a preview has no execution or
Receipt evidence, the `secureCookie` implementation identifier, foreign-key
`ON DELETE RESTRICT`, and the immutable no-delete trigger. It found no enabled
wallet, execute, delete, unpublish, Manifest, Receipt, yield, reward, or
real-asset control on the new public preview. It also found no settlement
control.

## Product and execution exclusions

Published Versions are public previews only. This slice does not:

- activate a participant journey or execute a transaction;
- generate or sign a Manifest, verify an action, issue a Receipt, or create
  existing execution/evidence records;
- connect a wallet, request a signature, call an RPC endpoint, deploy a
  contract, or anchor data on GIWA Sepolia;
- create or move any non-mock asset or funds, promise returns or rewards, or
  settle transfers;
- provide identity/compliance checks, phishing protection, or any security
  guarantee;
- add delete, unpublish, archive, rollback, clone, schedule, arbitrary-template,
  target, selector, calldata, asset, amount, spender, or verifier controls; or
- authorize Editor/Viewer access or membership mutation.

The existing `/partner` evidence-derived Campaign board remains independent of
the new exact Published Version preview.

## Captured worktree and remaining gates

At the Task 8 completion capture, the repository was a substantial unstaged
local working tree containing the preserved Release work and this completion
record. `git diff --cached` was empty when that state was inspected, and no
source-freeze commit had been created. A later user-authorized local integration
branch or commit is a separate Git step and does not establish protected CI,
deployment approval, or source promotion by itself.

Pushing or opening a pull request still requires separate user approval.
Protected CI has not evaluated this exact source state. Deployment,
hosted migration and backup, runtime configuration, DNS/HTTPS, real-wallet
authentication, signature collection, RPC use, and every testnet or mainnet
chain action remain separate approval gates.

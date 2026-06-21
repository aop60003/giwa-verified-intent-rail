# GIWA Partner Customer Handoff Package

Sprint 41 is the partner/customer package for a reviewer or operator who needs to understand the `GIWA Verified Intent Rail` local handoff. Sprint 43 is the current staging handoff freeze and should be opened first when checking remaining external blockers. Sprint 47 is the latest internal quality hardening pass for client-side public error-copy bounding after the Sprint 46 public boundary pass; it does not change the external blocker state.

## Authority

```text
authority=local-advisory
partnerCustomerHandoffPackage=local-advisory-finalized
externalBlockerMonitoring=complete-local-advisory
commercialReadyLocalHandoffFreeze=true
releaseGrade=false
canUnblockStaging=false
commercialReadiness=blocked
stagingDryRunExecution=blocked
protectedCI=blocked-external-github-account
```

This package is ready for local review. It is not release approval, staging approval, public-hosting approval, managed infrastructure approval, protected CI provenance, protected artifact metadata, partner traffic approval, or partner signoff.

## Open In This Order

Use the local live server for the first three surfaces and the static server for the fallback surfaces.

```text
1. Demo control room:   http://127.0.0.1:4190/demo
2. Fresh live path:     http://127.0.0.1:4190/live
3. Dynamic receipt API: http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
4. Static fallback:     http://127.0.0.1:4176/
5. Partner console:     http://127.0.0.1:4176/partner
6. Static snapshot:     http://127.0.0.1:4176/partner-snapshot.json
```

Live receipt and static receipt are intentionally different:

| Mode | Role | Receipt hash | Decision transaction |
| --- | --- | --- | --- |
| Fresh local live rehearsal | Dynamic matched receipt from the local live DB | `0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8` | `null` in the local verifier decision |
| Recorded static fallback | Fixture-backed recorded GIWA Sepolia testnet evidence | `0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503` | `0x2eb0cd03c3b71fb53664cf9364916453c442de8c05f5b436f3537414636f85df` |

## Run Locally

Start the live server for the fresh rehearsal surface:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite"
$env:PORT="4190"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Start the static fallback server in a separate terminal:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
```

Do not ask a reviewer for wallet signing material. Do not run server-side wallet actions or GIWA chain-operation package commands as part of this handoff.

## What This Demonstrates

The local-advisory handoff demonstrates one GIWA Sepolia testnet mock vault flow:

- a wallet-bound signed manifest preview
- browser-wallet-submitted approve and deposit transaction hashes from the fresh rehearsal
- standard RPC receipt status and block data as the block-evidence source
- verifier match before dynamic receipt unlock
- recorded static fallback evidence for review when live state is unavailable
- partner-facing mock testnet activation summary

The package does not demonstrate production traffic, public hosting, managed infrastructure, protected CI provenance, protected artifact upload metadata, release approval, external partner signoff, production asset issuance, production yield, production settlement, identity-service operation, phishing prevention, or a safety guarantee.

Flashblocks and preconfirmation language are limited to non-final fast feedback. Standard RPC receipt status, block data, logs, manifest fields, signer recovery, and verifier replay are the evidence sources for a matched receipt.

## Evidence Packet

| Item | Path | SHA-256 |
| --- | --- | --- |
| Sprint 43 external blocker handoff | `docs/evidence/staging-handoff-sprint43-external-blockers.json` | `D28B96DFCDB339EFBA75765AE69FBC38880BF4A4D6529C3633222CBA9E878A35` |
| Sprint 44 commercial handoff consistency | `docs/evidence/commercial-handoff-consistency-sprint44.json` | `11AF5EA9D8245F1F5FAD1DE1A1BED0F7BB3AF8C2DD4FDE4B2BCB45D2FD839489` |
| Sprint 45 bounded failure redaction | `docs/evidence/bounded-failure-redaction-sprint45.json` | `AAF6D2000CCB304A892686A727C3760A37288CE5943D7BC836B58358E747E062` |
| Sprint 46 public boundary hardening | `docs/evidence/public-boundary-final-hardening-sprint46.json` | `3878B7115DA374A4EC15FBFBC3C76B205DA7DED33476A394550AAD1ACA210584` |
| Sprint 47 client-side public error copy hardening | `docs/evidence/client-side-public-error-copy-sprint47.json` | `47F6744877A8C6DD18996B743A55ECE20D6F8B5E41EB18331D36BBFBE755C39B` |
| Sprint 42 hosted adapter commercial boundary | `docs/evidence/hosted-adapter-commercial-boundary-sprint42.json` | `CEF54B9AE1F41BA6037C6822A7383BDA4D734B71EF95B26FE8FD92BEC617D594` |
| Sprint 41 handoff evidence | `docs/evidence/partner-customer-handoff-sprint41.json` | `80A2EA69F9E4DB25B1CAD9C08B507E44211DA4B1102016ECF2E60F4297AD9E94` |
| Sprint 40 freeze evidence | `docs/evidence/commercial-readiness-sprint40-freeze.json` | `768DC90A549D4838D22E9BA00C9FBDB2F3A06E7539B7033211D15F3E1F64304A` |
| Sprint 38 staging readiness evidence | `docs/evidence/staging-readiness-sprint38-handoff.json` | `DFDDBCF91B5374B5B980BE1DFCCFE70364A66469B41933006605E8B6ED97D3C3` |
| Fresh live snapshot | `docs/evidence/live-demo-sprint12-snapshot.json` | `E6EDD7A6032FB4B7ABDF68AFFB2DC16CA5A306215D73594A273514FAF32059D6` |
| Public live snapshot | `apps/web/public/live-demo-snapshot.json` | `E6EDD7A6032FB4B7ABDF68AFFB2DC16CA5A306215D73594A273514FAF32059D6` |
| Static partner snapshot | `apps/web/public/partner-snapshot.json` | `33C7EDD496B2D76A68A624C98B86FC0ADC404D35C302942E62382CDE3720485A` |
| Local artifact manifest | `docs/evidence/local-artifact-manifest.json` | Local-advisory; regenerated after Sprint 41 edits |
| Local provenance report | `docs/evidence/local-provenance-report.json` | Local-advisory; regenerated after Sprint 41 edits |
| Local provenance verification | `docs/evidence/local-provenance-verification.json` | Local-advisory; regenerated after Sprint 41 edits |

The Sprint 41 evidence JSON is public-safe. It records paths, hashes, blockers, and action boundaries, not credential values or local environment file contents.

Open the Sprint 43 evidence JSON for the current stop conditions and restart signals. It records monitorable external blockers, mixed repo/workflow blockers, and the final local safe-track audit. Open the Sprint 47 evidence JSON only to inspect the latest local public browser fallback-copy hardening; open Sprint 46 evidence for public API read-path, readiness metadata, public-evidence scan, standard RPC wording, and historical chain-operation boundary hardening.

## Reviewer Checklist

| Check | Expected result |
| --- | --- |
| `/demo` opens first | Operator can see the live path, receipt path, static fallback, and partner console order. |
| `/live` uses the fresh rehearsal DB | The matched live receipt hash is `0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8`. |
| Dynamic receipt API opens only for matched receipt | Unknown, pending, mismatched, failed, timeout, missing-decision, missing-receipt, and replay-mismatch states stay locked. |
| Static fallback opens on port `4176` | The recorded receipt hash is `0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503`. |
| Partner console explains fixture-backed evidence | It is a static recorded fallback, not the fresh live run. |
| Public snapshots are present | `live-demo-sprint12-snapshot.json`, `live-demo-snapshot.json`, and `partner-snapshot.json` are available. |
| Blockers remain visible | Protected CI, protected artifacts, hosting, managed infrastructure, release approval, and external signoff remain blocked. |

## Public Evidence Boundary

Public evidence may include public wallet addresses, public transaction hashes, receipt hashes, verifier hashes, block numbers, block hashes, and commit-safe snapshots.

Public evidence must exclude wallet signing material, credential values, local environment file contents, server-only configuration values, raw request bodies, raw upstream errors, and tokenized URLs.

Reviewers should not be asked to connect a wallet or submit approve/deposit transactions unless a separate live rehearsal has been explicitly approved. The pre-seeded live receipt and static fallback are enough for handoff review.

## External-Only Blockers

| Blocker | Required transition |
| --- | --- |
| GitHub account gate | GitHub must allow the protected workflow runner to start. |
| External partner or customer signoff | A real reviewer must sign the local-advisory packet. |
| External hosting approval | Host, origin policy, rollback owner, and operator must be approved. |
| Managed infrastructure approval | Durable database, credential manager, backup target, and restore owner must be approved before any connection work. |

## Mixed Repo And Workflow Blockers

| Blocker | Required transition |
| --- | --- |
| Protected CI evidence for current `main` | External GitHub account gate clears, then all required checks pass on the intended source commit. |
| Protected artifact metadata | Protected workflow emits staging-named artifact metadata after required checks pass. |
| Branch protection satisfaction | Required check contexts pass on the protected branch. |
| Release approval | Protected CI, protected artifacts, owners, rollback path, and partner/customer decision are complete. |

## Handoff Close

Give reviewers the Sprint 43 external blocker handoff, this package, the Sprint 41 evidence JSON, and the demo/runbook/submission docs. Record only observed partner or customer feedback in the closeout report. Do not prefill success, signoff, release approval, staging approval, or hosted approval.

## Partner Signoff Contract

A valid partner/customer signoff artifact must include reviewer identity, reviewer role, review date, reviewed handoff package path, reviewed evidence paths and hashes, reviewed local URLs, the dynamic live receipt hash, the recorded static receipt hash, acknowledgement that the packet is local-advisory only, and acknowledgement that signoff is not release approval, staging approval, public-hosting approval, managed infrastructure approval, or protected CI approval.

Do not fabricate this artifact. Record only a real reviewer response.

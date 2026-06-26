# Sprint 48 Commercial User-Facing UX Design Spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans when changing this plan and use superpowers:executing-plans or superpowers:subagent-driven-development for any later implementation sprint. Sprint 48 itself is design-only.

**Goal:** Define the commercial user-facing UX for `GIWA Verified Intent Rail` without implementing UI, deploying, or changing protected CI state.

**Architecture:** Separate the future general user product flow from the existing demo, partner, reviewer, and operator surfaces. Keep technical proof available through progressive disclosure while making the receipt the primary user outcome.

**Tech Stack:** Documentation-only sprint over Markdown specifications. Existing static HTML, JavaScript, CSS, live API, and evidence files are read as inputs only.

---

## Scope

Sprint 48 answers three questions:

- What does a general user see?
- How are user-facing screens separated from partner, reviewer, and operator surfaces?
- Which proof details are visible by default versus hidden behind opt-in technical disclosure?

Sprint 48 does not create UI files, change routes, change JavaScript, change CSS, deploy to Lightsail, dispatch protected CI, connect managed infrastructure, send wallet actions, run chain-operation commands, install dependencies, or claim release-grade provenance.

## Parallel Analysis Summary

| Perspective | Finding |
| --- | --- |
| General user onboarding | A commercial flow should start at an Action Page, not `/demo` or `/partner`. |
| Wallet and network gate | Connect and GIWA Sepolia chain `91342` checks remain before manifest issuance. |
| Intent preview and consent | The consent checkpoint should show action, amount, wallet, target, and expiry with technical details collapsed. |
| Transaction progress | The progress rail should separate browser wallet submissions, standard RPC evidence, verifier match, and receipt readiness. |
| Verified receipt and share | Receipt pages should be the main outcome and share surface, with proof details opt-in. |
| Recovery and support | Help should support tx hash paste, re-verify, and bounded support copy. |
| Partner and reviewer separation | `/partner`, `/demo`, blocker records, and evidence packet paths remain non-user surfaces. |
| Security and privacy copy | General user screens must avoid raw internal errors, local runtime metadata, signer role internals, and overclaiming. |

## Task 1: Read Canonical Inputs

**Files:**
- Read: `AGENTS.md`
- Read: `README.md`
- Read: `03_giwa_verified_intent_rail_positioning.md`
- Read: `docs/implementation/giwa-partner-customer-handoff-package.md`
- Read: `docs/implementation/giwa-mvp-demo-script.md`
- Read: `docs/implementation/giwa-mvp-runbook.md`
- Read: `docs/implementation/giwa-commercial-readiness-gate.md`
- Read: `docs/implementation/giwa-staging-blocker-register.md`
- Read: `apps/web/public/index.html`
- Read: `apps/web/public/flow.js`
- Read: `apps/web/public/live-flow.js`
- Read: `apps/web/public/demo.html`
- Read: `apps/web/public/demo-control-room.js`
- Read: `apps/web/public/styles.css`

- [x] **Step 1: Input review**

Confirm the current repo has reviewer/operator/partner surfaces and no distinct commercial user-facing screen spec.

- [x] **Step 2: Boundary decision**

Classify existing routes:

- `/live`: live rehearsal behavior source
- `/demo`: operator/reviewer control room
- `/partner`: partner/reviewer proof console
- static `/`: recorded fallback
- receipt API: machine-readable receipt source

## Task 2: Write Commercial UX Spec

**Files:**
- Create: `docs/superpowers/specs/2026-06-26-commercial-user-facing-ux-design.md`

- [x] **Step 1: Define audience separation**

Specify general user, public share receipt, partner/reviewer, and operator/admin surfaces.

- [x] **Step 2: Define required screens**

Include:

- Action Page
- Wallet / Network Gate
- Intent Preview
- Transaction Progress
- Verified Receipt
- My Receipts
- Help / Recovery

- [x] **Step 3: Define proof disclosure**

Use default user summary, receipt evidence, and technical accordion layers.

- [x] **Step 4: Define forbidden user-facing content**

Keep raw internal errors, local runtime values, server role details, internal gate identifiers, protected CI state, blocker registers, production asset claims, identity-service claims, safety claims, and Flashblocks final-confirmation claims out of general user screens.

## Task 3: Link Sprint 48 From Routing Documents

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

- [x] **Step 1: README link**

Add the Sprint 48 spec and plan to the document map without changing demo execution instructions.

- [x] **Step 2: Sprint index row**

Add Sprint 48 as a design-only commercial user-facing UX spec after Sprint 47.

## Task 4: Verification

**Files:**
- `docs/superpowers/specs/2026-06-26-commercial-user-facing-ux-design.md`
- `docs/superpowers/plans/2026-06-26-sprint-48-commercial-user-facing-ux-design-spec.md`
- `README.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

- [ ] **Step 1: Path checks**

Run:

```powershell
Test-Path docs\superpowers\specs\2026-06-26-commercial-user-facing-ux-design.md
Test-Path docs\superpowers\plans\2026-06-26-sprint-48-commercial-user-facing-ux-design-spec.md
```

Expected: both return `True`.

- [ ] **Step 2: Safe scans**

Run the user-requested documentation scans:

```powershell
$unfinishedPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("settle" + "ment") + "|" + ("perform K" + "YC") + "|" + ("guarantee safe" + "ty") + "|" + ("instant final" + "ity") + "|" + ("200ms confirm" + "ed")
$credentialPattern = ("private k" + "ey") + "|" + ("mnem" + "onic") + "|" + ("bear" + "er") + "|" + ("api k" + "ey") + "|" + ("sec" + "ret")
rg -n $unfinishedPattern docs\superpowers\specs docs\superpowers\plans README.md -g "*.md"
rg -n $riskPattern docs\superpowers\specs docs\superpowers\plans README.md -g "*.md"
rg -n $credentialPattern docs\superpowers\specs\2026-06-26-commercial-user-facing-ux-design.md
```

Expected: no Sprint 48 user-facing overclaim or credential-value exposure. Existing historical guardrail or scan-pattern references in older documents should remain contextual and not product claims.

## Task 5: Sprint 49 Handoff

**Files:**
- No implementation files.

- [ ] **Step 1: Close Sprint 48**

Report:

- generated spec and plan paths
- eight analysis perspectives
- final user-facing flow
- surface separation rule
- verification output
- no implementation, no deployment, no protected CI dispatch

- [ ] **Step 2: Next action**

Next action is user approval for a Sprint 49 implementation plan. Sprint 49 should plan route/component/data/copy/test changes before any UI implementation starts.

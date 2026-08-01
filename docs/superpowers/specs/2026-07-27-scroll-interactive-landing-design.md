# Scroll-Interactive Landing Design

**Date:** 2026-07-27
**Status:** Approved on 2026-07-27
**Product:** `GIWA Verified Intent Rail`
**Scope:** scroll-interactive production landing at `/`

## 1. Goal

Turn the current static editorial landing into a restrained scroll narrative
that explains one product truth:

> 서명한 조건과 실제 실행이 일치했는지 필드 단위로 확인하고,
> 일치한 실행만 공개 Receipt로 남깁니다.

The interaction must make the verification sequence easier to understand,
without making the site feel like a presentation, an animation demo, or a
generic Web3 landing page.

The existing public demo remains at `/giwa-demo`. The landing does not connect
a wallet, submit a transaction, or duplicate the live demo controller.

The finished page must read as a real product landing rather than a pitch deck
or a scroll experiment. For GASOK review, the judge-facing entry is
`/giwa-demo`; the demo's persistent `제품 소개` link opens this landing. The
intended review path is:

`judge link -> /giwa-demo -> product introduction (/) -> verification model ->
bounded use -> demo or public Receipt`

The landing must also remain understandable when opened directly, but it must
not become a required preface that delays the judge from reaching the working
demo.

## 2. Design Principles

1. **Evidence leads the motion.**
   Motion explains how a Manifest becomes a matched Receipt. Decorative motion
   that does not clarify this sequence is excluded.

2. **Editorial before cinematic.**
   Preserve the warm ivory, near-black, deep green, Pretendard typography,
   structural rules, and generous whitespace of the approved landing.

3. **One interactive chapter.**
   Only the verification story uses a pinned desktop composition. The rest of
   the page uses normal document flow and subtle entrance transitions.

4. **The document remains complete without JavaScript.**
   All four stages, all evidence fields, navigation, and calls to action are
   available in semantic HTML before enhancement.

5. **Testnet claims stay bounded.**
   Copy refers only to GIWA Sepolia, mock contracts and assets, wallet-submitted
   testnet transactions, Standard RPC evidence, field matching, and public
   Receipts for matched executions.

6. **Product hierarchy stays visible.**
   Product name, one primary promise, proof, practical use, scope, and the demo
   action remain recognizable even when the visitor does not complete the full
   scroll narrative.

7. **Demo remains the judge entry.**
   Do not redirect `/giwa-demo` through the landing. The demo keeps a persistent
   `제품 소개` link to `/`, and the landing provides a clear route back to the
   live demo.

## 3. Page Narrative

### 3.1 Header

Keep the existing slim wordmark, section navigation, mobile disclosure, and
primary `/giwa-demo` action.

On desktop, the header may remain visible while the interactive chapter is
active. It must not obscure focused controls or section targets.

### 3.2 Hero

The hero remains a direct product introduction rather than an animation stage.

- eyebrow: `GIWA SEPOLIA · TESTNET`
- headline: `조건은 서명되고, 실행은 증명됩니다.`
- supporting statement:
  `Manifest에 서명한 조건을 GIWA Sepolia 트랜잭션과 대조해,
  일치한 실행만 공개 Receipt로 남깁니다.`
- primary action: `GIWA 데모 열기`
- secondary action: `검증된 Receipt 보기`

The right-hand proof surface previews the final matched state. It establishes
the destination of the story without pretending to be a live wallet.

### 3.3 Product Statement

Use one short bridge between the hero and the interactive chapter:

> 트랜잭션이 존재한다는 사실만으로는, 약속한 실행이었다는 것을
> 설명할 수 없습니다.

Supporting copy introduces the need to compare signed conditions with
block-confirmed execution evidence.

### 3.4 Interactive Verification Chapter

The chapter combines the current `How it works` and primary evidence comparison
into one coordinated desktop experience.

#### Desktop composition

- four semantic stage pairs, each containing narrative copy and its evidence
  snapshot;
- on desktop, the four snapshots occupy the same pinned right-hand visual slot,
  so they read as one evidence surface changing state;
- a small progress label shows `01 / 04` through `04 / 04`;
- the active step uses deep green, full-opacity ink, and a short rule;
- inactive and completed steps remain readable but visually quieter;
- only the snapshot paired with the active step is presented in the pinned slot.

Pairing copy and evidence in the document avoids a second mobile-only copy of
the same proof. On mobile, the same markup naturally becomes
`narrative -> evidence` for each stage.

The chapter is tall enough to give each step a deliberate reading interval, but
does not hijack the wheel, snap the viewport, or alter native scroll velocity.

#### Stage 1 — Manifest

Narrative:

> 무엇을 실행할지 먼저 고정합니다.

Evidence surface:

- network: `GIWA Sepolia`
- target: `Mock vault`
- action: `Deposit selector`
- amount: `Exact value`
- state label: `SIGNED CONDITION`

All Manifest fields are visible. Transaction values remain pending.

#### Stage 2 — Execution

Narrative:

> 지갑이 동일한 조건으로 테스트넷 트랜잭션을 제출합니다.

Evidence surface:

- Manifest remains visible;
- transaction lane enters the comparison;
- wallet submission and Standard RPC confirmation are labelled separately;
- state label: `BLOCK CONFIRMED`;
- no copy calls preconfirmation finality or settlement.

#### Stage 3 — Field Matching

Narrative:

> 네 개의 필드를 각각 대조합니다.

Evidence surface:

- network, target, action, and amount resolve in sequence;
- each resolved row receives both a `MATCHED` label and a small non-color status
  mark;
- state label: `4 / 4 MATCHED`;
- values come from the existing public evidence projection where available.

#### Stage 4 — Public Receipt

Narrative:

> 일치한 실행만 공개 Receipt로 남깁니다.

Evidence surface:

- the four matched rows remain visible;
- the validated Receipt hash appears;
- `검증된 Receipt 보기` becomes the clear next action;
- state label: `RECEIPT READY`;
- `/evidence` remains the fallback when recorded evidence is unavailable.

### 3.5 Remaining Sections

Keep the remaining production information architecture in normal flow:

1. bounded use cases;
2. why GIWA;
3. current testnet scope;
4. final demo and Receipt calls to action.

Each section may use one restrained reveal consisting of opacity and a short
vertical translation. No staggered card spectacle, continuous loop, parallax,
or horizontal scrolling is introduced.

## 4. Interaction Model

### 4.1 Enhancement

JavaScript adds a single landing-story controller:

- locate the story root and its four steps;
- observe which step crosses the central reading zone;
- add an enhancement marker only after observer setup succeeds;
- update the root's current stage attribute;
- update `aria-current="step"` on the active narrative step;
- update the visible progress label;
- leave evidence text and links sanitized through existing `textContent` and
  strict bytes32 validation.

`IntersectionObserver` is the preferred enhancement because it follows native
scrolling and avoids a frame-by-frame global scroll handler.

If `IntersectionObserver` is unavailable, no enhancement marker is added, all
four semantic stage pairs remain visible, and no exception is thrown.

### 4.2 State Contract

The story root exposes one of:

- `data-story-stage="manifest"`
- `data-story-stage="execution"`
- `data-story-stage="matching"`
- `data-story-stage="receipt"`

CSS owns visual transitions for these finite states. JavaScript does not write
inline layout styles or calculate synthetic scroll positions. Inactive evidence
snapshots may be visually collapsed only when the enhancement marker is
present; they remain available in the unenhanced document.

### 4.3 Reveal Contract

Normal-flow sections use a separate optional observer:

- initial content is visible by default;
- JavaScript adds an enhancement marker before reveal styling applies;
- an observed section becomes permanently visible after its first entry;
- content never becomes hidden again when the user scrolls upward.

## 5. Responsive Behavior

### Desktop

At widths where both columns remain comfortably readable:

- the evidence surface is `position: sticky`;
- its top offset clears the persistent header;
- narrative steps provide the scroll duration;
- the proof panel does not create its own scroll container.

### Tablet

Use the same two-column idea only when the evidence panel retains a practical
minimum width. Otherwise, switch to the mobile sequence.

### Mobile, high zoom, and short viewports

- remove sticky positioning;
- render each narrative step followed by its corresponding evidence state;
- allow ordinary vertical scrolling;
- do not hide prior evidence needed to understand later stages;
- keep all buttons at least 44 CSS pixels high;
- preserve hash wrapping and prevent horizontal overflow.

The mobile document should feel intentionally composed, not like the desktop
sticky layout simply failed.

## 6. Motion and Accessibility

- Never intercept wheel, touch, keyboard, or scrollbar behavior.
- No scroll snapping, cursor replacement, autoplay media, parallax, or nested
  scroll traps.
- The current step is communicated through text, `aria-current`, and contrast,
  not color alone.
- The evidence panel is not an `aria-live` region; normal scrolling must not
  create repeated screen-reader announcements.
- Focus order follows DOM order and all section anchors remain meaningful.
- With `prefers-reduced-motion: reduce`, transitions are removed and the
  complete content is presented as a normal document.
- With JavaScript disabled or observer support absent, the full static story is
  visible.

## 7. Copy Boundaries

Public copy must not claim:

- mainnet or production transactions;
- real funds, real yield, RWA issuance, payment, or settlement;
- KYC, identity, fraud, phishing, compliance, or security guarantees;
- current GIWA Wallet in-app placement;
- real users, adoption, customers, or guaranteed outcomes.

The interaction must distinguish:

- wallet submission;
- block-confirmed Standard RPC evidence;
- field-level matching;
- matched-only public Receipt publication.

## 8. Files and Ownership

Expected local changes:

- `apps/web/public/landing.html`
  - revised Korean copy;
  - semantic four-step story;
  - evidence state markup;
  - normal-flow mobile fallback.
- `apps/web/public/landing.css`
  - desktop sticky story;
  - finite stage transitions;
  - mobile and reduced-motion fallbacks;
  - restrained section reveal.
- `apps/web/public/landing.js`
  - story and reveal observers;
  - existing recorded-evidence and menu behavior retained.
- `apps/web/src/lib/landing/landingPresentation.test.ts`
  - update the superseded no-sticky expectation;
  - assert story semantics, responsive fallback, and reduced motion.
- `apps/web/src/lib/landing/landingEvidence.test.ts`
  - replace the retired-controller assertion with interaction fallback and state
    behavior coverage.

No contract, API, SQLite, Manifest domain, verifier, wallet controller, route,
or deployment change is required.

The existing `/giwa-demo` shell is not redesigned in this scope. Its already
implemented, persistent `제품 소개` link to `/` is a required verification
condition.

## 9. Verification

### Automated

Test-first coverage must prove:

1. four semantic steps and four finite stage names exist;
2. the landing controller selects and updates the active stage;
3. an absent observer fails open to readable static content;
4. recorded Receipt projection and strict hash validation remain unchanged;
5. desktop sticky behavior is scoped to the verification chapter;
6. mobile and short-viewport rules disable sticky behavior;
7. reduced-motion rules remove transitions;
8. no wallet or transaction API is introduced into landing assets;
9. public copy guards continue to pass;
10. `/giwa-demo` still exposes `제품 소개` to `/` and remains directly
    reachable without a landing redirect.

Run:

```text
pnpm --filter @giwa/web test -- landing
pnpm --filter @giwa/web test
pnpm typecheck
pnpm build
```

### Browser

Inspect the running landing at:

- 1440 × 900;
- 1280 × 720;
- 1024 × 768;
- 390 × 844;
- 360 × 800;
- keyboard-only navigation;
- reduced-motion emulation;
- JavaScript-disabled or observer-unavailable fallback;
- recorded evidence success and failure.

Confirm:

- each desktop step activates at a predictable reading point;
- scrolling remains native and reversible;
- the evidence panel clears the header;
- mobile contains no sticky trap or horizontal overflow;
- hashes wrap safely;
- CTA and section targets remain functional;
- no console errors occur.

## 10. Superseded Constraint

This design intentionally supersedes only the following parts of
`2026-07-27-production-landing-giwa-demo-design.md`:

- the landing-specific prohibition on `position: sticky`;
- the landing-specific prohibition on an `IntersectionObserver` story
  controller;
- the static presentation of the `How it works` and primary evidence sections.

All other product boundaries, visual exclusions, accessibility requirements,
route contracts, and testnet claim limits remain in force.

## 11. Delivery Boundary

Approval authorizes local implementation and local verification only. It does
not authorize:

- Git staging, commit, branch, push, or pull request actions;
- public deployment;
- Lightsail, DNS, certificate, Nginx, or other cloud changes;
- wallet signatures or chain transactions.

# GASOK Judge Landing Design

**Date:** 2026-07-27<br />
**Status:** Approved on 2026-07-27<br />
**Product:** `GIWA Verified Intent Rail`<br />
**Authority:** GASOK selection landing design; testnet-only staging presentation

## 1. Goal

Replace the recorded-evidence-first root page with a judge-first landing that
lets a GASOK evaluator understand the product, inspect the implementation, and
enter the live wallet flow in about 60 seconds.

The landing must communicate this statement:

> 사용자가 확인한 조건과 실제 GIWA Sepolia 실행이 일치할 때만 공개
> Receipt를 만든다.

The page should strengthen the current submission on GIWA chain fit,
originality, feasibility, marketability, execution capability, and future GIWA
Wallet in-app suitability without claiming capabilities that are not live.

## 2. Success Criteria

The landing succeeds when:

1. The first viewport identifies the product and its value within seven
   seconds.
2. The primary CTA opens the existing live `/user` flow.
3. The secondary CTA opens a valid recorded public Receipt or recorded evidence
   route.
4. A natural scroll explains the difference between click metrics and verified
   action evidence.
5. The product sequence is understandable as
   `Review -> Sign -> Execute -> Verify -> Receipt`.
6. The page exposes real GIWA Sepolia implementation evidence without requiring
   the reviewer to read setup documentation.
7. The page explains why GIWA is used now and labels GIWA Wallet in-app
   placement as a future integration path.
8. The existing `/user`, `/partner`, `/receipt/[receiptHash]`, and technical
   evidence behavior remain intact.
9. Desktop and mobile layouts work without scroll hijacking, layout overflow,
   console errors, or inaccessible motion.
10. Public copy stays within the repository's testnet and claim boundaries.

## 3. Non-goals

- Redesigning the live `/user` wallet flow.
- Changing manifests, verification, contracts, receipt gates, APIs, SQLite
  state, or GIWA Sepolia transactions.
- Implementing GIWA Wallet in-app placement.
- Adding a campaign builder, partner dashboard, authentication, analytics, or
  content management system.
- Claiming production readiness, mainnet support, real asset issuance, yield,
  funds, payment, settlement, KYC, security guarantees, or finality.
- Fabricating customer logos, user counts, revenue, partnerships, team
  credentials, or traction.
- Adding an animation framework or a frontend application framework.

## 4. Approved Direction

### 4.1 Reference principle

Use the clarity of Family's product-first landing as a structural reference,
not as a visual template:

- large breathing room;
- one short message per section;
- real product state as the main visual;
- small, purposeful interactions;
- personality emerging from the product rather than from generic Web3 effects.

Do not copy Family's characters, pastel objects, composition, or brand assets.

### 4.2 GIWA-specific visual idea

The only recurring decorative object is a verification Receipt assembled from
real product concepts:

- Intent terms;
- wallet review;
- transaction evidence;
- Standard RPC match;
- public Receipt.

The object begins as separate paper-like evidence slips and becomes one Receipt
as the reviewer scrolls. This replaces neon glows, glass cards, abstract
particles, decorative 3D, and unrelated blockchain imagery.

### 4.3 Typography

Use the version-pinned official Pretendard variable dynamic subset:

```html
<link
  rel="stylesheet"
  as="style"
  crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
/>
```

The primary stack is:

```css
font-family:
  "Pretendard Variable",
  Pretendard,
  -apple-system,
  BlinkMacSystemFont,
  system-ui,
  sans-serif;
```

Use weight `650` for the main Korean headline, `600-650` for section headings,
and `400-500` for body copy. Keep hashes, chain IDs, route labels, and
verification states in the existing system monospace stack.

If the CDN is unavailable, the page remains usable with the system fallback.
The font request must not block content or route functionality.

### 4.4 Color and material

Use a restrained palette derived from the current product:

| Role | Color |
| --- | --- |
| paper background | `#f4f3ee` |
| primary ink | `#171916` |
| muted text | `#6e736b` |
| structural rule | `#c5c9c0` |
| verified signal | `#1e684f` |
| proof highlight | `#b9ead1` |
| optional single marker | `#f0d76f` |

Do not use gradients or glass blur. Shadows, where necessary to communicate a
physical slip, remain hard, shallow, and low contrast.

## 5. Route Architecture

The root landing must not break the technical surfaces currently sharing
`index.html`.

| Route | Served document | Purpose |
| --- | --- | --- |
| `/` | new `landing.html` | judge-first landing |
| `/evidence` | existing `index.html` | recorded guided evidence formerly at `/` |
| `/partner` | existing `index.html` | partner ProofKPI projection |
| `/receipt/[receiptHash]` | existing `index.html` | public technical Receipt |
| `/user` and child routes | existing `user.html` | live evaluator action and user Receipts |

Implementation should add:

- `apps/web/public/landing.html`;
- `apps/web/public/landing.css`;
- `apps/web/public/landing.js`.

Both `serve-static.mjs` and `serve-live.mjs` route `/` to `landing.html` and
route `/evidence`, `/partner`, and `/receipt/[receiptHash]` to the existing
`index.html`. The existing `flow.js` default renderer can render `/evidence`
without behavior changes.

Direct `/index.html` behavior is not a public contract. No existing public
Receipt URL changes.

## 6. Sixty-second Information Architecture

### 6.1 Global navigation

Use a small fixed or static header with:

- product wordmark;
- `Product`;
- `How it works`;
- `Evidence`;
- `Why GIWA`;
- primary `Live Demo` CTA.

On narrow screens, retain the wordmark and primary CTA and collapse optional
anchors into a simple disclosure. Do not add a full navigation system.

### 6.2 Section 00: Hero, 0-7 seconds

Primary copy:

> 확인한 행동만<br />
> 증거가 됩니다.

Supporting copy:

> 사용자가 확인한 조건과 실제 GIWA Sepolia 실행이 일치할 때만 누구나
> 검증할 수 있는 공개 Receipt를 만듭니다.

Visible boundaries and actions:

- `LIVE ON GIWA SEPOLIA` environment badge;
- primary CTA: `실제 흐름 실행하기` -> `/user`;
- secondary CTA: `검증 결과 보기` -> recorded public Receipt when valid, with
  `/evidence` as the fallback;
- `Testnet-only` label close to the CTAs.

The environment badge identifies the chain used by the demo; it is not a
service-health, finality, or production guarantee.

Three product-specific slips may surround the centered copy:

- `Intent / Locked`;
- `Wallet / Reviewed`;
- `Receipt / Public`.

They use bounded, truthful example values and never imitate live wallet state.

### 6.3 Section 01: Problem, 7-14 seconds

Show one contrast:

```text
참여 버튼을 눌렀다
        ↓
정해진 조건으로 GIWA 액션이 실행됐다
```

Copy explains that clicks or signatures show participation, while the Rail
checks whether a manifest-covered testnet action matches block-confirmed
transaction evidence. Do not imply identity, fraud prevention, security, or
settlement verification.

### 6.4 Section 02: Product flow, 14-34 seconds

This is the primary interactive-scroll section. A sticky product panel changes
through five bounded states:

1. `Review` - network, action, amount, target, spender, and exact allowance;
2. `Sign` - wallet-bound terms and intent hash;
3. `Execute` - exact approval when needed, then mock vault deposit;
4. `Verify` - Standard RPC transaction, receipt, block, and confirmation
   evidence;
5. `Receipt` - matched-only public result.

The copy column advances with natural document scroll. The app panel is sticky
only on desktop widths where it does not obstruct content. Mobile renders the
same states as a normal vertical sequence.

This section is an explanatory reproduction of the actual product sequence.
Its CTA opens `/user`; the landing itself never calls a wallet provider or
sends a transaction.

### 6.5 Section 03: Deterministic match, 34-43 seconds

Show a field-level comparison between the committed Intent and Standard RPC
transaction evidence:

| Manifest | Transaction evidence |
| --- | --- |
| chain ID | chain ID |
| wallet | sender |
| target | transaction destination |
| action selector | calldata selector |
| asset and amount | calldata and required logs |
| expiry | block time |

Each row changes from neutral to matched as it enters view. Copy uses
`block-confirmed` and `confirmation depth`, never `instant finality` or
`settlement`.

### 6.6 Section 04: Public evidence, 43-49 seconds

Assemble the slips into one Receipt and expose three evaluator paths:

- recorded public Receipt;
- GIWA explorer transaction;
- recorded guided evidence at `/evidence`.

Landing data is read from existing bounded public artifacts such as
`flow-data.json`; hashes and URLs are validated before rendering. Do not copy
local SQLite state or `.env` values into the landing.

The current live flow remains discoverable through `/user`, but the landing
must stay useful if the live service is temporarily unavailable.

### 6.7 Section 05: Why GIWA, 49-55 seconds

Separate current implementation from the next integration:

**Works now**

- GIWA Sepolia chain ID `91342`;
- deployed mock contracts;
- wallet-submitted approve and deposit;
- Standard RPC evidence;
- matched-only public Receipt.

**Next integration**

- GIWA Wallet in-app entry;
- compact action preview;
- return-to-wallet Receipt handoff.

Do not state that GIWA Wallet integration or placement is already live.

### 6.8 Section 06: Market and execution proof, 55-60 seconds

Use a compact strip rather than a broad business section.

Target use case:

> 온체인 캠페인과 퀘스트 운영자가 클릭 수가 아니라 조건과 일치한 테스트넷
> 실행 증거를 확인하는 흐름.

Execution proof:

- public HTTPS app;
- fresh-wallet GIWA Sepolia rehearsal;
- public Receipt and explorer evidence;
- deterministic verifier;
- static fallback and deployment runbook.

This demonstrates feasibility and team execution without inventing traction.
ProofKPI is described as manifest-covered action evidence, not as a security,
identity, KYC, issuance, or settlement product.

### 6.9 Final CTA

End with three explicit links:

1. `Run the live flow` -> `/user`;
2. `Open a verified example` -> validated recorded Receipt or `/evidence`;
3. `Check the transaction` -> validated GIWA explorer URL.

Do not use a generic `Contact us`, email capture, or account-creation form for
this selection landing.

## 7. Motion and Interaction

Use only native CSS and a small dependency-free JavaScript controller.

Allowed motion:

- evidence slips translating into the Receipt position;
- progress state changes in the sticky product panel;
- field-match lines and verified markers;
- restrained number or status transitions.

Rules:

- preserve native scroll and browser history;
- no scroll-jacking, horizontal-scroll trap, cursor replacement, parallax
  background, continuous particle loop, or autoplay audio;
- use `IntersectionObserver` for section state;
- avoid per-frame layout reads and writes;
- keep animation to transform and opacity where practical;
- support `prefers-reduced-motion: reduce` by showing the final state without
  transitional movement;
- make all information available without motion;
- keep focus order independent from visual movement.

## 8. Data and Error Handling

The landing is static-first and progressively enhanced.

1. Essential product explanation and `/user` CTA exist in HTML.
2. `landing.js` requests recorded public artifacts with `cache: "no-store"` or
   the repository's existing artifact-loading convention.
3. Receipt and transaction hashes must pass strict 32-byte hex validation
   before becoming text or links.
4. Explorer URLs must be built from the approved public template, not accepted
   as arbitrary HTML.
5. Render dynamic values with DOM text properties, never untrusted HTML.
6. If an artifact request fails, retain the narrative and `/user` CTA, hide
   dynamic hashes, and link the evidence CTA to `/evidence`.
7. Font, motion, or dynamic evidence failure must never block navigation.
8. No wallet API, capability, secret, operator credential, database detail, or
   raw server error is used on the landing.

## 9. Responsive and Accessibility Design

- Target a fluid layout from 360 px mobile through large desktop screens.
- Keep body copy at or above 16 CSS px on the implemented page.
- Maintain visible keyboard focus and semantic heading order.
- Use actual links and buttons rather than clickable generic containers.
- Provide a skip link to the main content.
- Meet WCAG AA contrast for text and interactive states.
- Keep touch targets at least 44 by 44 CSS px where practical.
- Do not rely on color alone for matched state; pair color with label and icon.
- Paper slips are supplementary. The same content exists in accessible text.
- The pinned sequence becomes ordinary stacked content on mobile and at high
  zoom.

## 10. Components and Boundaries

The dependency-light implementation should keep responsibilities explicit:

| Unit | Responsibility |
| --- | --- |
| `landing.html` | semantic section order, static copy, accessible CTAs |
| `landing.css` | visual tokens, responsive layout, reduced motion |
| `landing.js` | scroll state, bounded artifact loading, validated links |
| static/live route mapping | send only `/` to the landing document |
| existing `flow.js` | recorded evidence, partner, and public Receipt behavior |
| existing `user-flow.js` | live wallet experience |

Do not move or refactor unrelated existing flow code. Add a small pure helper
module under `apps/web/src/lib/landing/` only if validation or view-state logic
needs focused unit tests; generated browser code remains dependency-light.

## 11. Verification

### 11.1 Focused tests

Add regression coverage for:

- `/` serving the new landing document in both static and live servers;
- `/evidence` serving the existing technical document;
- `/partner`, `/receipt/[receiptHash]`, and `/user` remaining unchanged;
- public copy guard coverage including new landing files;
- strict Receipt and transaction hash validation;
- artifact failure falling back to `/evidence`;
- no wallet request on the landing;
- reduced-motion and mobile fallback markers in source.

### 11.2 Browser checks

Verify:

- 1440 px and 1024 px desktop;
- 390 px mobile;
- keyboard-only navigation;
- reduced motion;
- font-loaded and font-fallback states;
- live artifact success and failure;
- primary and evidence CTA routes;
- no console errors or horizontal overflow.

### 11.3 Commands

Run focused web tests first, then:

```text
pnpm --filter @giwa/web test
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
```

Run staging smoke against the local live service after route behavior is
implemented. Deployment is a separate user-authorized step.

## 12. Claim Boundaries

The landing must say:

- GIWA Sepolia;
- testnet-only;
- mock vault and mock asset;
- Standard RPC evidence;
- block-confirmed transaction evidence;
- matched-only Receipt;
- future GIWA Wallet in-app path.

The landing must not say or imply:

- mainnet or production readiness;
- real funds, yield, RWA issuance, payment, or settlement;
- finality when describing preconfirmation or confirmation depth;
- KYC, identity, compliance, fraud, phishing, or security guarantees;
- current GIWA Wallet placement;
- customer adoption or partnership without verified evidence.

## 13. Delivery Boundary

This design authorizes a local landing implementation after final written-spec
approval. It does not authorize:

- Git stage, commit, branch, push, or PR operations;
- Lightsail or other public deployment;
- DNS, Nginx, certificate, or cloud changes;
- wallet or chain transactions.

Those actions continue to require explicit user direction under the project
policy.

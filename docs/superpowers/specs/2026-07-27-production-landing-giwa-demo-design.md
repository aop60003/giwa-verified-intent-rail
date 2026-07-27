# Production Landing and GIWA Demo Design

**Date:** 2026-07-27
**Status:** Approved on 2026-07-27
**Product:** `GIWA Verified Intent Rail`
**Scope:** production-usable public landing and a separate one-screen testnet demo

## 1. Goal

Separate product communication from product execution:

- `/` becomes an evergreen public product landing suitable for real users,
  partners, and future program evaluators.
- `/giwa-demo` becomes a focused, one-screen live demo for the existing GIWA
  Sepolia verified-intent flow.
- the existing operator `/demo` control room remains unchanged.

The public experience should communicate one durable product statement:

> 서명한 조건과 실제 실행을 필드 단위로 대조하고, 일치한 실행만 공개
> Receipt로 남깁니다.

The landing must not read like an application submission, pitch deck, or
temporary demo microsite. The demo must not repeat the landing narrative or
require a long scroll before the user can act.

## 2. Success Criteria

1. The root page explains the product and shows real proof within the first
   viewport.
2. Public copy remains useful after GASOK and contains no judge, selection,
   scoring, or submission language.
3. The primary landing CTA opens `/giwa-demo`.
4. `/giwa-demo` keeps the full live wallet, Manifest, transaction, verifier,
   and Receipt behavior while presenting the active flow in one desktop
   viewport.
5. The demo exposes a persistent `제품 소개` action that returns to `/`.
6. The demo has one dominant action whose label changes with the current state.
7. Existing `/demo`, `/user`, `/user/receipts`, `/user/help`, public Receipt,
   evidence, and partner routes keep their current contracts.
8. Desktop and mobile remain keyboard accessible and usable with reduced
   motion.
9. No new runtime framework or duplicated wallet/domain implementation is
   introduced.
10. Public claims remain testnet-only and evidence-backed.

## 3. Route Contract

| Route | Document or behavior | Purpose |
| --- | --- | --- |
| `/` | `landing.html` | evergreen public product landing |
| `/giwa-demo` | new `giwa-demo.html` shell using the existing live user controller | public one-screen testnet demo |
| `/demo` | existing `demo.html` | operator Demo Control Room |
| `/user` | existing `user.html` | compatibility entry for the live user flow |
| `/user/receipts` | existing user document | local user Receipt list |
| `/user/help` | existing user document | live-flow recovery help |
| `/user/receipt/[hash]` | existing user document | live user Receipt view |
| `/evidence` | existing technical document | recorded guided evidence |
| `/partner` | existing technical document | partner ProofKPI projection |
| `/receipt/[hash]` | existing technical document | public technical Receipt |

Both static and live servers must map `/giwa-demo` explicitly to
`giwa-demo.html`. The route must not replace or redirect `/demo`.

The existing `/user` entry stays available so previously shared links and user
Receipt navigation do not break. New public landing CTAs use `/giwa-demo`.

## 4. Approved Visual Direction

Use a shared, production-grade visual system across both public pages:

- Pretendard as the primary Korean typeface with system fallbacks;
- warm ivory base, near-black ink, and one deep GIWA green accent;
- fine structural rules, generous whitespace, and controlled typography;
- real product and Receipt surfaces as the main visual asset;
- square or subtly rounded product frames with little or no shadow;
- hashes and technical field values in a restrained monospace face.

The landing follows the quiet editorial hierarchy of the first generated
concept. The demo uses the evidence-led Manifest-versus-Transaction structure
of the second concept.

Do not use paper slips, rotated cards, stamps, yellow poster blocks, decorative
wallet simulations, gradients, glassmorphism, neon, 3D objects, generic Web3
imagery, or AI-style floating card collections.

Generated concept images are visual references only. The implementation uses
semantic HTML, CSS, existing public evidence, and real live flow state.

## 5. Public Landing at `/`

### 5.1 Responsibility

The landing explains what the Rail is, why it exists, how matching works, what
evidence is public, where it can be used, and why GIWA is relevant. It does not
connect a wallet or send a transaction.

### 5.2 Header

Use a slim header with:

- `GIWA Verified Intent Rail` wordmark;
- `제품`;
- `작동 방식`;
- `실행 증거`;
- `활용`;
- `GIWA`;
- primary `데모 체험하기` CTA to `/giwa-demo`.

The wordmark links to `/`. Mobile keeps the wordmark and CTA visible and moves
optional anchors into a simple disclosure.

### 5.3 Hero

Eyebrow:

> GIWA SEPOLIA · TESTNET

Headline:

> 서명한 조건과 실제 실행을 대조합니다.

Supporting copy:

> Manifest의 네트워크·대상·액션·수량을 GIWA Sepolia 트랜잭션과
> 비교하고, 일치한 실행만 공개 Receipt로 남깁니다.

Actions:

- `데모 체험하기` -> `/giwa-demo`;
- `검증된 Receipt 보기` -> a validated recorded public Receipt, with
  `/evidence` as the fallback.

The first viewport includes a real-looking evidence surface derived from
existing public artifacts: Manifest fields, Transaction fields, and one
unambiguous `MATCHED` result. It must not fabricate a live wallet state.

### 5.4 Section Order

1. **Problem**
   `실행했다는 기록과, 약속대로 실행했다는 증거는 다릅니다.`

2. **How it works**
   Four concise stages:
   `조건 확정 -> 지갑 실행 -> 필드 대조 -> Receipt 공개`.

3. **Evidence**
   A readable Manifest-versus-Transaction comparison for network, target,
   action, and amount, followed by block, transaction hash, and Receipt ID.

4. **Use cases**
   Describe bounded future users without claiming adoption:
   onchain campaign operators, quest or activation operators, and partners
   that need manifest-covered action evidence.

5. **Why GIWA**
   Separate what works now on GIWA Sepolia from the future GIWA Wallet in-app
   entry and Receipt handoff.

6. **Scope**
   State exactly what the current demo can verify and repeat that it uses
   testnet assets only.

7. **Final CTA**
   `직접 실행하고, 직접 대조하세요.` with the demo and recorded Receipt
   actions.

### 5.5 Copy Boundaries

Remove:

- GASOK, judge, evaluator, selection, scoring, submission, and demo-day copy;
- claims that the project is production-ready or has real customers;
- implementation-boast sections that read like an application checklist.

Keep factual proof:

- GIWA Sepolia chain ID `91342`;
- testnet-only mock contracts and mock assets;
- wallet-submitted transaction flow;
- Standard RPC transaction evidence;
- field-level matching;
- matched-only public Receipt;
- future GIWA Wallet in-app path clearly labeled as next.

## 6. One-Screen Demo at `/giwa-demo`

### 6.1 Responsibility

The demo executes the existing flagship mock-vault deposit flow. It does not
explain the full product story. The user should immediately see the current
condition, the next action, and the evidence that will be produced.

### 6.2 Desktop Layout

Use a `100dvh` application shell at ordinary desktop sizes:

1. **Slim top bar**
   - wordmark;
   - `GIWA Sepolia · Testnet`;
   - `제품 소개` link to `/`.

2. **Compact four-stage rail**
   - `준비`;
   - `조건 검토`;
   - `실행`;
   - `Receipt`.

   The existing seven technical states remain in logic, but the visual rail
   groups them into four user-comprehensible stages.

3. **Primary action panel**
   - short current-state heading;
   - the one action required now;
   - one dominant button;
   - bounded notice and recovery link;
   - no competing generic navigation.

4. **Evidence panel**
   - before execution: Manifest terms;
   - during execution: wallet transaction and verification status;
   - after verification: Manifest and Transaction field comparison;
   - on success: public `MATCHED` Receipt action.

Technical details that are not needed for the next decision stay in a native
`details` disclosure. The desktop page must not rely on body scrolling during
the core flow at a 1440 x 900 viewport.

### 6.3 Dynamic Primary Action

Preserve the current state machine and button progression:

- connect wallet;
- switch to GIWA Sepolia;
- inspect or prepare testnet assets;
- issue and review the Manifest;
- submit exact approval when required;
- submit the mock-vault deposit;
- wait for Standard RPC verification;
- open the matched Receipt.

Only the action that is currently valid is visually dominant. The button must
retain disabled, pending, success, rejection, timeout, mismatch, and recovery
states.

### 6.4 Landing Return

The demo top bar always exposes:

> 제품 소개

This is a normal link to `/`, preserves browser history, and does not interrupt
or mutate the live run before navigation.

Matched Receipt views should expose both:

- `다시 실행` -> `/giwa-demo`;
- `제품 소개` -> `/`.

### 6.5 Mobile and Zoom

The one-screen constraint applies to ordinary desktop viewports, not at the
expense of accessibility. At narrow widths, high zoom, or short viewports:

- sections stack in decision order;
- the primary action remains near the top;
- normal vertical scrolling is allowed;
- no panel gets an inaccessible nested scroll trap;
- the top-bar landing link remains available.

## 7. Implementation Boundaries

Create a small public shell for `/giwa-demo`:

- `apps/web/public/giwa-demo.html`;
- isolated route-specific styles in `apps/web/public/giwa-demo.css`;
- the existing `user-flow.js` as the live controller.

Do not copy wallet, transaction, Manifest, verifier, session, or Receipt logic
into a second controller. The route-specific shell and CSS may change layout,
labels, grouping, and navigation, but domain state stays shared.

The landing continues to own:

- semantic public narrative in `landing.html`;
- visual system and responsive layout in `landing.css`;
- validated recorded-evidence projection and small interactions in
  `landing.js`.

No contract, API, database, manifest, verifier, chain, or deployment topology
change is required.

## 8. Data and Error Handling

### Landing

- Essential content and `/giwa-demo` navigation exist before JavaScript runs.
- Recorded hashes must pass the existing strict 32-byte validation.
- Dynamic values use `textContent`, never untrusted HTML.
- Artifact failure hides optional hashes and falls back to `/evidence`.
- The landing remains useful if the live service is unavailable.

### Demo

- Reuse current public configuration, participant capability, wallet context,
  session invalidation, asset readiness, timeout, verifier, and Receipt rules.
- Preserve explicit rejected, wrong-chain, insufficient-gas, missing-token,
  expired-Manifest, mismatch, timeout, and unavailable-service messages.
- Never log or render secrets, local database paths, operator credentials, or
  raw server errors.
- Leaving through `제품 소개` performs navigation only; it does not claim that
  an in-flight wallet or chain request was cancelled.

## 9. Accessibility and Motion

- Semantic heading order and landmark structure.
- Visible keyboard focus and 44 px practical target minimum.
- No color-only status: pair green with labels and icons.
- `aria-live` remains bounded to current notices rather than the entire page.
- Support `prefers-reduced-motion`.
- No scroll-jacking, cursor replacement, parallax, autoplay media, continuous
  decorative loops, or horizontal-scroll traps.
- Landing body copy stays at or above 16 CSS px.
- Hashes and field values can wrap without forcing horizontal overflow.

## 10. Verification

### Focused automated coverage

- `/` serves `landing.html` in static and live servers.
- `/giwa-demo` serves `giwa-demo.html` in static and live servers.
- `/demo` still serves the operator control room.
- `/user` and its child routes keep their existing documents.
- landing CTAs target `/giwa-demo`.
- demo `제품 소개` links target `/`.
- the public demo reuses `user-flow.js` rather than a duplicate live controller.
- public claim guards include all modified public files.
- no wallet API is introduced into landing assets.
- mobile, reduced-motion, and overflow fallbacks remain present.

### Browser checks

- landing at 1440, 1024, 390, and 360 px widths;
- demo at 1440 x 900, 1024 x 768, and 390 x 844;
- keyboard-only navigation;
- high zoom and short viewport behavior;
- font-loaded and system-fallback states;
- artifact success and failure;
- disconnected, wrong-chain, asset-preparation, pending, matched, mismatch,
  timeout, and recovery states;
- no horizontal overflow or console errors;
- all cross-page buttons and browser-back behavior.

### Commands

Run focused route, landing, and user-flow tests first, then:

```text
pnpm --filter @giwa/web test
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
```

## 11. Non-goals

- mainnet support or production transactions;
- real funds, real yield, RWA issuance, payment, or settlement;
- KYC, identity, fraud, phishing, compliance, or security guarantees;
- current GIWA Wallet placement;
- campaign builder, authentication, analytics dashboard, or CMS;
- changes to operator Control Room behavior;
- new frontend framework or animation dependency;
- public deployment, DNS, HTTPS, Nginx, cloud, or wallet transaction changes.

## 12. Superseded Direction

This specification supersedes the public-facing narrative, visual metaphor,
root CTA, and landing-only information architecture in
`2026-07-27-gasok-judge-landing-design.md`.

The earlier document remains historical evidence for the GASOK-oriented
iteration. Its technical claim boundaries and existing-route preservation
requirements continue to apply where they do not conflict with this
specification.

## 13. Delivery Boundary

Approval of this specification authorizes local implementation and local
verification only. It does not authorize:

- Git staging, commit, branch, push, or pull request actions;
- public deployment;
- Lightsail, DNS, certificate, Nginx, or other cloud changes;
- wallet signatures or chain transactions.

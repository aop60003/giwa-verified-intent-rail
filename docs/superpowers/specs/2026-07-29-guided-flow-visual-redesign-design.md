# GIWA Guided Flow Visual Redesign

## Status

Approved in conversation on 2026-07-29. This document defines the visual and
interaction design for the production landing page and the GASOK evaluator demo.

## Context

The current landing and demo are functionally complete, but the presentation does
not yet feel like one finished product.

The browser review identified four concrete problems:

1. The demo uses fixed minimum column widths that create horizontal overflow in
   the 981–1120 px range.
2. The first screen presents too many bordered cells and status fragments at the
   same visual weight.
3. The landing repeats rounded cards often enough to resemble a generic generated
   template.
4. The landing and demo use similar colors but do not share a strong interaction
   or typography system.

The selected direction is **Guided Flow** for `/giwa-demo`, while `/` remains an
editorial scroll landing page using the same visual language.

## Goals

- Make the demo understandable within the first ten seconds.
- Present one current action and one primary button at a time.
- Give the landing and demo a shared, restrained product identity.
- Remove horizontal overflow at common desktop, tablet, and mobile widths.
- Preserve the existing wallet, manifest, transaction, verification, and receipt
  behavior.
- Keep all public claims bounded to the current GIWA Sepolia testnet MVP.

## Non-goals

- Changing the contract, API, verification algorithm, or wallet transaction flow.
- Adding production mainnet support, real assets, settlement, KYC, or security
  guarantees.
- Creating a dashboard, multi-template product, or additional demo flow.
- Adding a new frontend framework or runtime dependency.
- Replacing the public receipt or evidence routes.

## Visual System

### Color

Reuse the current product palette with fewer simultaneous surfaces:

- Paper: `#f7f6f1`
- Surface: `#fcfbf7`
- Ink: `#171916`
- Muted text: `#656960`
- Rule: `#cdcec6`
- Verified green: `#0b5f43`
- Soft verified state: `#dcefe6`

No gradients are used. Large shadows are removed from ordinary content. A subtle
shadow may appear only on the current interactive stage or primary action.

### Typography

Pretendard Variable is the default typeface.

- Landing hero: 64–76 px desktop, 42–50 px mobile.
- Demo hero: 44–52 px desktop, 36–42 px mobile, Pretendard Variable 600,
  `1.08` line height, and `-0.035em` letter spacing.
- Section headings: 36–56 px depending on hierarchy.
- Body: 16–18 px with 1.6–1.7 line height.
- Small status labels: 11–12 px.

Weights are limited to regular, semibold, and bold. Monospace is reserved for
chain IDs, transaction hashes, receipt hashes, field names, and compact status
labels. Navigation, headlines, descriptions, and buttons use Pretendard.

### Shape and spacing

- Content is separated primarily by space and 1 px rules.
- Large rounded card grids are not used as the page skeleton.
- A 10–12 px radius is allowed for controls and the current action.
- A 16 px radius is the maximum for a highlighted stage or contained surface.
- Page spacing follows an 8 px base rhythm with 24, 32, 48, 72, and 96 px section
  intervals.

### Motion

Motion communicates state only:

- 160–220 ms fade for stage changes.
- A short underline or bottom-rule transition marks the current stage.
- Reduced-motion users receive immediate state changes without animation.
- No parallax, scroll snapping, floating decorative objects, or large entrance
  sequences.

## Copy

### Landing hero

Headline:

> 약속한 실행은,
> 증명될 수 있어야 합니다.

Description:

> 서명된 Manifest와 GIWA Sepolia 트랜잭션을 네 필드로 대조해, 모두
> 일치한 경우에만 공개 Receipt를 발급합니다.

Primary CTA: `데모 실행`

Secondary CTA: `Receipt 확인`

### Demo hero

Headline:

> 직접 실행하고,<br />
> 결과를 확인해보세요.

Description:

> 지갑 연결부터 공개 Receipt까지, 지금 필요한 순서대로 안내합니다.

All supporting copy remains concise and action-oriented. English is retained only
for established technical terms such as Manifest, Receipt, Standard RPC, and
GIWA Sepolia.

## Landing Page

The landing remains a production-facing editorial scroll page.

### 1. Hero

- One high-impact headline and a short two-line explanation.
- One primary CTA and one quiet text CTA.
- A restrained proof illustration shows the relationship between Manifest,
  transaction, field match, and Receipt.
- The proof illustration remains technically precise but does not look like an
  application panel.

### 2. Problem statement

Use one large statement and two short paragraphs. Avoid a surrounding card. A
single rule and generous vertical space create separation.

### 3. Verification narrative

Keep the four-stage story:

1. Manifest conditions are signed.
2. The action is executed on GIWA Sepolia.
3. Network, Target, Action, and Amount are matched.
4. A public Receipt is issued only for a complete match.

The story uses text, rules, and one active proof view. It must not become four
repeated marketing cards.

### 4. Use cases

Present the three use cases as a numbered editorial list rather than filled
cards. Each row contains a number, title, and one sentence.

### 5. GIWA relationship

Keep the current-versus-next distinction:

- Now: GIWA Sepolia execution and public Receipt.
- Next: GIWA Wallet in-app entry and Receipt handoff.

Use a dark full-width band, but reduce nested rounded surfaces. Typography and
rules should carry the hierarchy.

### 6. Scope and CTA

State the current testnet-only scope directly. The final CTA repeats `데모 실행`
without adding new claims.

## Demo Page

The demo is a focused application page based on the selected Guided Flow
direction.

### Header

The header contains:

- Product name.
- `GIWA Sepolia · Testnet`.
- A quiet `제품 설명` link.

It does not contain a second primary action.

### Guided stages

The detailed controller state is projected into three visible stages.

#### Stage 1: 준비 상태 확인

Contains:

- Wallet connection.
- GIWA Sepolia network status.
- Gas and mock token readiness.

The primary action is the existing next action, beginning with `지갑 연결`.

#### Stage 2: 조건 검토 및 실행

Contains:

- Manifest issuance and the four locked fields.
- Approval requirement when applicable.
- Deposit transaction submission.

Technical values are placed in a native `<details>` section. The primary view
shows only the human-readable condition summary and current action.

#### Stage 3: Receipt 확인

Contains:

- Standard RPC evidence status.
- Four-field match result.
- Public Receipt link after a complete match.

The Receipt stage does not imply settlement, finality, identity verification, or
security guarantees.

### Stage states

Each visible stage has one of four presentation states:

- `current`: available now and visually emphasized.
- `complete`: successfully completed with a compact check state.
- `locked`: waiting for a previous stage.
- `attention`: requires a network, asset, transaction, or verification recovery
  action.

Existing detailed states remain the source of truth. The view projection must not
invent or persist a second workflow state.

### Error handling

- Errors appear inside the current stage.
- Each error includes the cause in plain language and the next supported action.
- Pending wallet or transaction actions disable duplicate submission.
- Context changes continue to invalidate stale runs through the existing logic.
- Unknown Receipt results retain the current non-disclosure behavior.

## Responsive Behavior

### 960 px and wider

- The three stages appear in one fluid three-column row.
- Columns use `minmax(0, 1fr)` and never fixed 420/520 px minimums.
- The current stage may be wider only through fluid fractions that still fit the
  container.
- Page content has a bounded maximum width and no horizontal scrollbar.

### 640–959 px

- Stages stack vertically in workflow order.
- The current stage is expanded.
- Complete and locked stages use compact summaries.
- The primary action appears before technical details.

### Below 640 px

- Header metadata is reduced to product name and product link.
- Stages remain in document order.
- The current stage, notice, and primary action appear within the first viewport
  when content length permits.
- Buttons use the full available width.
- Technical hashes wrap without changing page width.

## Accessibility

- Preserve the skip link and visible keyboard focus.
- Use an ordered list for workflow stages.
- Mark the current stage with `aria-current="step"`.
- Use existing live status announcements for asynchronous state changes.
- Do not communicate completion, attention, or locked state with color alone.
- Maintain at least a 44 px interactive target.
- Use native `<details>` and `<summary>` for optional technical information.

## Implementation Boundaries

Expected source changes:

- `apps/web/public/landing.html`
- `apps/web/public/landing.css`
- `apps/web/public/user-flow.js`
- `apps/web/public/giwa-demo.css`
- Landing and demo presentation tests under `apps/web/src/lib/`

The existing controller, API calls, storage projection, transaction behavior, and
receipt routes are preserved.

## Verification

### Automated

- Update presentation tests for the approved copy and three-stage structure.
- Verify there is exactly one primary action.
- Verify the demo has no fixed 420/520 px desktop column minimums.
- Verify the responsive stack and reduced-motion rules exist.
- Run the full web test suite.
- Run workspace type checking and build.

### Browser

Inspect at minimum:

- 1280 × 720 desktop.
- 1024 × 768 compact desktop/tablet.
- 390 × 844 mobile.

For both `/` and `/giwa-demo`, confirm:

- No horizontal overflow.
- No clipped copy or controls.
- Correct current-stage emphasis.
- Primary action is visible and unique.
- Technical details do not dominate the initial view.
- Landing and demo feel like the same product.

## Acceptance Criteria

The redesign is complete when:

1. The landing uses the approved headline and editorial hierarchy.
2. The demo projects the existing workflow into the approved three stages.
3. A 1024 px viewport has no horizontal scrollbar.
4. The current action and single primary button are immediately identifiable.
5. Technical details remain accessible without dominating the page.
6. Existing wallet, execution, verification, and Receipt behavior remains intact.
7. Automated checks and desktop/mobile browser QA pass.

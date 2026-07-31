# Landing and GIWA Demo Editorial Polish Design

**Status:** Approved through the 2026-07-29 visual audit and the user's request
to proceed with cleaner typography and more natural copy.

## Goal

Make the public landing and `/giwa-demo` feel like one credible product rather
than a collection of equally bordered template cards. Preserve the proof-first
story, testnet boundaries, and one-action demo flow.

## Chosen direction

Use an **editorial proof** language:

- Proof artifacts remain sharp, dense, and technical.
- Narrative sections become quieter and mostly borderless.
- Interactive controls use a restrained 10–12px radius and a clear primary /
  secondary hierarchy.
- Only hashes, chain identifiers, evidence fields, and short machine states use
  monospace. Navigation, headings, labels, and explanatory copy use Pretendard.
- Ivory and charcoal remain the base. One dark GIWA section breaks the repeated
  light-grid rhythm without introducing gradients.

Rejected alternatives:

- Copy-only polish would leave the repeated box geometry unchanged.
- A fully rounded SaaS redesign would weaken the precise evidence language.
- A broad visual rebrand would exceed the approved scope and risk demo stability.

## Landing content

- Hero: `서명한 조건대로 실행됐는지 확인합니다.`
- Hero body: explain field-by-field comparison and that a public Receipt is
  available only for a fully matched action.
- Primary CTA: `GIWA 데모 시작`
- Secondary CTA: `공개 Receipt 보기`
- Problem statement: distinguish an existing transaction from a transaction
  that fulfilled an agreed condition.
- Verification story: use four direct verbs—sign, execute, compare, publish.
- Use cases: campaign evidence, quest completion verification, partner sharing.
- GIWA section: one large `NOW` area for GIWA Sepolia plus Public Receipt, and a
  smaller `NEXT` handoff for GIWA Wallet in-app.
- Final CTA: invite the user to run the full Manifest-to-Receipt flow.

## Demo content and layout

- Headline: `조건을 확인한 뒤, GIWA에서 실행하세요.`
- Explain that only the currently required action is shown.
- Rename the summary to `이번 데모에서 실행할 액션`.
- Replace nested status cards and instruction cards with one evidence surface,
  internal dividers, and compact rows.
- Remove the desktop evidence pane's independent scrollbar; the document scroll
  owns overflow.
- Keep the primary wallet/action button dominant. Product, help, and Receipt
  links remain quiet secondary actions.

## Responsive and accessibility requirements

- Preserve the skip link, semantic headings, links, buttons, tables, and live
  status regions.
- Minimum explanatory text size is 13px; body copy remains 16px or larger.
- Focus rings remain visible against both light and dark sections.
- At mobile width, the primary action stays full width while secondary Receipt
  actions become text-like rather than matching the primary button.
- Reduced-motion behavior remains intact.

## Scope boundaries

- No chain, wallet, verifier, receipt-gating, or runtime data behavior changes.
- No new dependency, route, gradient, marketing claim, or production deployment.
- GIWA Sepolia remains testnet-only and Flashblocks is not described as finality
  or settlement.

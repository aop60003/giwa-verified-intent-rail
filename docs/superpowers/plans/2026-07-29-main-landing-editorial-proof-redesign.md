# Main Landing Editorial Proof Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/` as a shorter editorial landing that makes `데모 실행` the dominant conversion while preserving validated evidence links and the dependency-free static runtime.

**Architecture:** Keep the existing static landing shell and evidence controller. Replace only the landing information architecture and visual CSS; retain `landing.js` interfaces (`data-recorded-receipt`, `data-scroll-story`, `data-story-step`, `data-story-trigger`, and `data-story-progress`) so evidence projection, menu behavior, reveal behavior, and scroll-stage tests remain stable.

**Tech Stack:** Semantic HTML, CSS, dependency-free ES modules, Pretendard Variable, Vitest.

## Global Constraints

- Public product name remains `GIWA Verified Intent Rail`.
- GIWA Sepolia chain ID remains `91342`; the experience remains testnet-only.
- Primary conversion is `/giwa-demo`; recorded Receipt falls back to `/evidence`.
- Use four top-level landing sections at most: hero, why, flow/scope, final action.
- Use Pretendard for narrative UI and monospace only for hashes, field names, chain identifiers, and machine states.
- No gradients, glassmorphism, card grids, 3D Web3 art, coins, shields, locks, scroll-jacking, parallax, or new dependencies.
- Do not modify `/giwa-demo`, wallet logic, contracts, APIs, runtime data, Nginx, Lightsail, or deployment.
- Git staging and commit are not authorized by this plan; perform them only after separate explicit user direction.

---

## File map

- Modify `apps/web/src/lib/landing/landingPresentation.test.ts`: lock the approved copy, four-section architecture, responsive breakpoints, and visual exclusions.
- Modify `apps/web/public/landing.html`: own the concise product narrative and semantic proof-led structure.
- Modify `apps/web/public/landing.css`: own the editorial tokens, proof ledger, responsive layout, and reduced-motion behavior.
- Preserve `apps/web/public/landing.js`: continue validated Receipt projection, menu state, section reveals, and four-stage scroll state without changing its public functions.

### Task 1: Lock the approved landing contract with a failing presentation test

**Files:**
- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Test: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**
- Consumes: static `landing.html`, `landing.css`, and `landing.js`.
- Produces: an exact presentation contract for Tasks 2 and 3.

- [ ] **Step 1: Replace old copy and section assertions with the approved contract**

Use these exact assertions:

```ts
it("is Korean-first, concise, and demo-directed", () => {
  const html = readWebFile("public/landing.html");
  expect(html).toContain('<html lang="ko">');
  expect(html).toContain('class="skip-link"');
  expect(html).toContain('id="main-content"');
  expect(html).toContain("실행은 기록되고,");
  expect(html).toContain("약속은 증명됩니다.");
  expect(html).toContain(
    "서명된 Manifest와 GIWA Sepolia 트랜잭션을 대조해"
  );
  expect(html).toContain('class="button button-primary" href="/giwa-demo"');
  expect(html).toContain("데모 실행");
  expect(html).toContain("Receipt 확인");
  expect(html).not.toMatch(/GASOK|심사|평가자|선발|제출|데모데이/iu);
});

it("uses four focused editorial chapters", () => {
  const html = readWebFile("public/landing.html");
  expect(html.match(/<section\b/gu)).toHaveLength(4);
  for (const id of ["product", "why", "how-it-works", "final-action"]) {
    expect(html).toContain(`id="${id}"`);
  }
  expect(html).toContain('id="why-giwa"');
  expect(html).toContain("트랜잭션이 남았다는 사실만으로는");
  expect(html).toContain("Manifest에서 Receipt까지,");
  expect(html).toContain("하나의 검증 흐름.");
  expect(html).toContain("직접 실행하고,");
  expect(html).toContain("결과를 확인해보세요.");
  expect(html).not.toMatch(/use-cases-section|scope-section/iu);
});
```

- [ ] **Step 2: Preserve the four-stage runtime contract**

Keep assertions for:

```ts
expect(html).toContain("data-scroll-story");
expect(html).toContain("data-story-progress");
for (const stage of ["manifest", "execution", "matching", "receipt"]) {
  expect(html).toContain(`data-story-step="${stage}"`);
  expect(html).toContain(`data-story-trigger="${stage}"`);
  expect(html).toContain(`data-story-proof="${stage}"`);
}
expect(html).toContain("GIWA Wallet in-app");
expect(html).toContain("NEXT");
```

- [ ] **Step 3: Lock the editorial CSS and responsive fallback**

Use assertions for:

```ts
expect(css).toContain("--paper: #f7f6f1");
expect(css).toContain("--ink: #171916");
expect(css).toContain("--verified: #0b5f43");
expect(css).toContain("--control-radius: 10px");
expect(css).toContain("@media (max-width: 1180px)");
expect(css).toContain("@media (max-width: 760px)");
expect(css).toContain("@media (prefers-reduced-motion: reduce)");
expect(css).toContain(":focus-visible");
expect(css).toContain("overflow-wrap: anywhere");
expect(css).toMatch(
  /@media\s*\(max-width:\s*1180px\)[\s\S]*\.hero\s*\{[\s\S]*grid-template-columns:\s*1fr/iu
);
expect(css).not.toMatch(
  /backdrop-filter|linear-gradient|radial-gradient|scroll-snap|proof-shadow|surface-radius/iu
);
```

- [ ] **Step 4: Run the focused test and confirm the expected failure**

Run:

```text
pnpm --filter @giwa/web test -- landingPresentation
```

Expected: FAIL on the new headline, four-section count, `--control-radius: 10px`, and the `1180px` stacking breakpoint.

### Task 2: Rebuild the semantic landing structure

**Files:**
- Modify: `apps/web/public/landing.html`
- Test: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**
- Consumes: existing `landing.js` selectors and the validated recorded Receipt projection.
- Produces: four semantic sections with stable evidence and story data attributes.

- [ ] **Step 1: Reduce the header navigation**

Keep the existing wordmark, menu button, and header CTA. Replace navigation
anchors with:

```html
<nav id="site-menu" class="site-menu" aria-label="주요 탐색" data-menu>
  <a href="#product">제품</a>
  <a href="#how-it-works">검증 방식</a>
  <a href="#why-giwa">GIWA</a>
</nav>
```

- [ ] **Step 2: Replace the hero copy and use one integrated proof ledger**

Use:

```html
<section id="product" class="hero" aria-labelledby="hero-title">
  <div class="hero-copy">
    <p class="eyebrow">GIWA SEPOLIA · VERIFIED INTENT</p>
    <h1 id="hero-title">
      <span>실행은 기록되고,</span>
      <span>약속은 증명됩니다.</span>
    </h1>
    <p class="hero-description">
      서명된 Manifest와 GIWA Sepolia 트랜잭션을 대조해, 일치한 실행만
      공개 Receipt로 남깁니다.
    </p>
    <div class="hero-actions">
      <a class="button button-primary" href="/giwa-demo">데모 실행</a>
      <a class="button button-secondary" data-recorded-receipt href="/evidence">
        Receipt 확인
      </a>
    </div>
    <p class="hero-note">GIWA Sepolia · Chain ID 91342 · 테스트넷 전용</p>
  </div>
  <article class="proof-ledger" aria-label="검증 결과 미리보기">
    <!-- one header, four field rows, and one public Receipt footer -->
  </article>
</section>
```

The proof ledger must keep `data-receipt-hash` on its Receipt value and present
NETWORK, TARGET, ACTION, and AMOUNT as rows inside one table-like surface.

- [ ] **Step 3: Replace the problem section with three unboxed principles**

Create `section#why` containing the approved heading and a
`ul.verification-principles` with:

```html
<li>
  <span>01</span>
  <strong>서명된 의도</strong>
  <p>실행 전 조건과 대상을 기록합니다.</p>
</li>
<li>
  <span>02</span>
  <strong>필드 대조</strong>
  <p>network, target, action, amount를 대조합니다.</p>
</li>
<li>
  <span>03</span>
  <strong>공개 Receipt</strong>
  <p>모두 일치한 실행만 공개합니다.</p>
</li>
```

- [ ] **Step 4: Replace the long sticky story with one continuous four-row flow**

Create `section#how-it-works[data-scroll-story]` with one progress label and
four `article.flow-step` rows. Each row must preserve the corresponding
`data-story-step`, `data-story-trigger`, and `data-story-proof` value. Use the
exact labels and copy:

```text
Manifest — 의도와 조건을 서명합니다.
Transaction — GIWA Sepolia에서 실행합니다.
Field match — 네 필드의 일치 여부를 확인합니다.
Receipt — 일치한 결과를 공개합니다.
```

Place `aside#why-giwa.scope-strip` after the rows with:

```text
NOW · GIWA Sepolia
Standard RPC evidence
Matched-only public Receipt
NEXT · GIWA Wallet in-app
```

Label the wallet line as future direction; do not imply current availability.

- [ ] **Step 5: Add the concise final action and preserve recorded evidence**

Create `section#final-action.final-cta` with:

```html
<h2 id="final-title">
  <span>직접 실행하고,</span>
  <span>결과를 확인해보세요.</span>
</h2>
```

Include the same `/giwa-demo` primary CTA and `data-recorded-receipt`
secondary CTA. Keep the current footer and `/landing.js` module script.

- [ ] **Step 6: Run the focused test**

Run:

```text
pnpm --filter @giwa/web test -- landingPresentation
```

Expected: copy and architecture assertions pass; CSS assertions remain failing
until Task 3.

### Task 3: Implement the editorial proof visual system

**Files:**
- Modify: `apps/web/public/landing.css`
- Test: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**
- Consumes: the class names created in Task 2.
- Produces: a two-column wide hero, an integrated proof ledger, unboxed
  principles, a continuous flow, and deterministic responsive stacking.

- [ ] **Step 1: Replace obsolete tokens**

Start the root tokens with:

```css
:root {
  --paper: #f7f6f1;
  --paper-deep: #efeee7;
  --surface: #fcfbf7;
  --ink: #171916;
  --muted: #656960;
  --quiet: #747970;
  --rule: #cdcec6;
  --rule-dark: #aeb0a8;
  --verified: #0b5f43;
  --verified-soft: #dcefe6;
  --control-radius: 10px;
  --content-width: 1280px;
}
```

Remove `--surface-radius`, `--proof-shadow`, and shadow declarations from
primary controls and proof surfaces.

- [ ] **Step 2: Build the wide hero and integrated proof ledger**

Use:

```css
.hero {
  width: min(var(--content-width), calc(100% - 96px));
  min-height: min(820px, calc(100dvh - 72px));
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(520px, 1.08fr);
  align-items: center;
  gap: clamp(56px, 6vw, 96px);
  padding-block: clamp(88px, 9vw, 136px);
}

.hero h1 {
  margin: 20px 0 28px;
  font-size: clamp(72px, 6vw, 88px);
  font-weight: 650;
  line-height: 1.01;
  letter-spacing: -0.055em;
  word-break: keep-all;
}

.proof-ledger {
  min-width: 0;
  border-block: 1px solid var(--ink);
  background: transparent;
}
```

Use internal row rules and alignment only. Do not add outer shadow, floating
card offset, or nested bordered panels.

- [ ] **Step 3: Build unboxed principles and continuous flow rows**

Use a three-column grid for `.verification-principles` with only a top rule
and vertical separators. Use one `.flow-list` with four rows; each row uses
`grid-template-columns: 88px minmax(180px, 0.55fr) minmax(0, 1fr)` and a
bottom rule. Active scroll state may color the number and state label using
`[aria-current="step"]` without hiding inactive rows.

- [ ] **Step 4: Build the compact GIWA scope strip and final action**

Use one dark, full-width `.scope-strip` with a maximum-width inner grid.
Separate NOW and NEXT with a rule, not nested cards. Keep `GIWA Wallet in-app`
visually subordinate and label it `NEXT`.

Keep `.final-cta` on the base paper surface with a top rule, no rounded outer
container, and centered actions.

- [ ] **Step 5: Add deterministic intermediate and mobile fallbacks**

Use:

```css
@media (max-width: 1180px) {
  .hero {
    width: min(100% - 64px, 920px);
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .hero-copy {
    max-width: 760px;
  }
}

@media (max-width: 760px) {
  .hero,
  .section,
  .final-cta {
    width: 100%;
    padding-inline: 20px;
  }

  .hero h1 {
    font-size: clamp(38px, 11vw, 44px);
  }

  .verification-principles,
  .flow-step,
  .scope-strip-inner {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    display: grid;
  }

  .hero-actions .button-primary {
    width: 100%;
  }
}
```

Preserve visible focus, `overflow-wrap: anywhere`, short-height fallback, and
`prefers-reduced-motion`.

- [ ] **Step 6: Run focused and landing integration tests**

Run:

```text
pnpm --filter @giwa/web test -- landingPresentation landingEvidence landingRouting
```

Expected: PASS.

### Task 4: Verify the changed surface and visually compare it

**Files:**
- Verify: `apps/web/public/landing.html`
- Verify: `apps/web/public/landing.css`
- Verify: `apps/web/public/landing.js`
- Verify: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: evidence that the local landing is code-safe, responsive, and
  visually aligned with the approved reference.

- [ ] **Step 1: Run the full web suite**

Run:

```text
pnpm --filter @giwa/web test
```

Expected: all web tests pass.

- [ ] **Step 2: Run workspace type and build checks**

Run:

```text
pnpm typecheck
pnpm build
```

Expected: both commands exit `0`.

- [ ] **Step 3: Inspect the local landing in the in-app browser**

At 1440 px verify:

- headline uses two intentional lines;
- both hero columns are visible;
- Proof Ledger is not clipped;
- `데모 실행` resolves to `/giwa-demo`;
- current Receipt resolves to the validated dynamic route or `/evidence`;
- top-level section count is four;
- console has no errors.

At 1024 px verify the hero stacks, and at 390 px verify no horizontal overflow,
readable body type, full-width primary CTA, visible focus, and no nested scroll.

- [ ] **Step 4: Compare matching-view screenshots**

Capture the local page at the same wide viewport used by
`docs/superpowers/specs/assets/2026-07-29-main-landing-editorial-proof.png`.
Compare the approved reference and implementation together. Fix only visible
misalignment in hierarchy, spacing, typography, borders, radii, or overflow;
do not introduce new visual ideas.

- [ ] **Step 5: Inspect the final diff**

Run:

```text
git diff --check
git diff -- apps/web/public/landing.html apps/web/public/landing.css apps/web/public/landing.js apps/web/src/lib/landing/landingPresentation.test.ts
```

Expected: no whitespace errors and no changes outside the approved landing
surface. Do not stage or commit without separate explicit direction.

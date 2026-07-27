# Scroll-Interactive Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. The user requires CODEX ONLY, so do
> not dispatch subagents.

**Goal:** Build a production-shaped `/` landing that judges can enter from the
working `/giwa-demo`, then use native scroll to understand the
Manifest-to-Receipt verification model and return to the demo or public
Receipt.

**Architecture:** Keep the existing dependency-light HTML/CSS/JavaScript
landing and recorded-evidence projection. Model the interactive chapter as four
semantic copy-and-evidence pairs; desktop CSS places their evidence snapshots
in one sticky visual slot, while mobile keeps the pairs in normal order.
`IntersectionObserver` enhances active-stage and reveal state without hiding
the unenhanced document.

**Tech Stack:** semantic HTML, CSS, browser JavaScript modules, Pretendard,
Vitest, existing pnpm workspace.

## Global Constraints

- Public name is exactly `GIWA Verified Intent Rail`.
- The public flow remains GIWA Sepolia testnet-only.
- Do not claim real funds, yield, RWA issuance, payment, settlement, KYC,
  identity, fraud prevention, security guarantees, adoption, or customers.
- Do not call preconfirmation finality or settlement.
- Keep `/giwa-demo`, `/demo`, `/user`, evidence, partner, and Receipt route
  contracts unchanged.
- `/giwa-demo` is the judge-facing entry and must keep its persistent
  `제품 소개` link to `/`; do not redirect it through the landing.
- Do not add a frontend framework or animation dependency.
- JavaScript failure, unavailable observers, mobile, short viewports, high zoom,
  and reduced motion must leave a complete readable document.
- Do not intercept native scrolling or add scroll snap, parallax, autoplay,
  horizontal scroll, or nested scroll traps.
- No Git stage, commit, branch, push, PR, deployment, wallet signature, or chain
  transaction is authorized.

---

### Task 1: Lock the product and responsive presentation contract

**Files:**
- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Test: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**
- Consumes: static files returned by the existing `readWebFile(path)` helper.
- Produces: test contracts for `data-scroll-story`, the four stage names,
  production landing copy, sticky scoping, mobile fallback, and reduced motion.

- [ ] **Step 1: Replace the retired static-story expectations with failing
      production-story expectations**

Add assertions equivalent to:

```ts
expect(html).toContain("조건은 서명되고,");
expect(html).toContain("실행은 증명됩니다.");
expect(html).toContain('data-scroll-story');
for (const stage of ["manifest", "execution", "matching", "receipt"]) {
  expect(html).toContain(`data-story-step="${stage}"`);
}
expect(html).toContain('data-story-progress');
expect(html).toContain("트랜잭션이 존재한다는 사실만으로는");
expect(html).toContain("제품이 필요한 순간");
expect(html).not.toMatch(/GASOK|심사|평가자|선발|제출|데모데이/iu);
```

Replace the global no-sticky assertion with scoped interaction checks:

```ts
expect(css).toMatch(/\.story-proof[\s\S]*position:\s*sticky/iu);
expect(css).toMatch(
  /@media\s*\(max-width:\s*980px\)[\s\S]*\.story-proof[\s\S]*position:\s*relative/iu
);
expect(css).toMatch(
  /@media\s*\(max-height:\s*640px\)[\s\S]*\.story-proof[\s\S]*position:\s*relative/iu
);
expect(css).toContain("@media (prefers-reduced-motion: reduce)");
expect(css).not.toMatch(/scroll-snap|backdrop-filter|linear-gradient|radial-gradient/iu);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingPresentation.test.ts
```

Expected: FAIL because the current HTML has no scroll story or revised product
copy and the current CSS explicitly contains no sticky story.

- [ ] **Step 3: Keep the failure focused**

Confirm the failure is only missing presentation behavior. If an existing claim
or route assertion fails for another reason, preserve that assertion and fix
the fixture or expectation rather than deleting protection.

---

### Task 2: Build the semantic product landing and scroll composition

**Files:**
- Modify: `apps/web/public/landing.html`
- Modify: `apps/web/public/landing.css`
- Test: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**
- Consumes: existing `/landing.css`, `/landing.js`, `/giwa-demo`, `/evidence`,
  `[data-recorded-receipt]`, `[data-recorded-explorer]`,
  `[data-receipt-hash]`, and `[data-deposit-hash]` contracts.
- Produces: `[data-scroll-story]`, four `[data-story-step]` articles,
  `[data-story-progress]`, `[data-reveal]`, and responsive `.story-proof`
  surfaces for Task 3.

- [ ] **Step 1: Rewrite the hero as a real product entry**

Use this content hierarchy in `landing.html`:

```html
<section id="product" class="hero" aria-labelledby="hero-title">
  <div class="hero-copy">
    <p class="eyebrow">GIWA SEPOLIA · TESTNET</p>
    <h1 id="hero-title">
      <span>조건은 서명되고,</span>
      <span>실행은 증명됩니다.</span>
    </h1>
    <p class="hero-description">
      Manifest에 서명한 조건을 GIWA Sepolia 트랜잭션과 대조해,
      일치한 실행만 공개 Receipt로 남깁니다.
    </p>
    <div class="hero-actions">
      <a class="button button-primary" href="/giwa-demo">GIWA 데모 열기</a>
      <a class="button button-secondary" data-recorded-receipt href="/evidence">
        검증된 Receipt 보기
      </a>
    </div>
  </div>
  <article class="hero-proof" aria-label="검증 결과 미리보기">
    <header>
      <span>PUBLIC PROOF</span>
      <strong>4 / 4 MATCHED</strong>
    </header>
    <dl>
      <div><dt>Network</dt><dd>GIWA Sepolia</dd></div>
      <div><dt>Target</dt><dd>Mock vault</dd></div>
      <div><dt>Action</dt><dd>Deposit selector</dd></div>
      <div><dt>Amount</dt><dd>Exact value</dd></div>
    </dl>
    <footer>
      <span>Receipt</span>
      <strong data-receipt-hash>검증된 실행</strong>
    </footer>
  </article>
</section>
```

Keep all dynamic evidence values in text nodes targeted by existing data
attributes. Do not add wallet APIs or fabricated live-state language.

- [ ] **Step 2: Replace the static process and duplicate evidence table with one
      semantic four-stage chapter**

The exact structure must follow:

```html
<section
  id="how-it-works"
  class="section story-section"
  data-scroll-story
  data-story-stage="manifest"
  aria-labelledby="story-title"
>
  <header class="story-heading" data-reveal>
    <p class="section-index">02 · VERIFICATION</p>
    <h2 id="story-title">약속과 실행 사이를, 네 단계로 확인합니다.</h2>
    <p>스크롤을 따라 실제 검증 구조를 확인하세요.</p>
  </header>
  <div class="story-progress" aria-hidden="true">
    <span data-story-progress>01 / 04</span>
    <span class="story-progress-line"><i></i></span>
  </div>
  <div class="story-steps">
    <article class="story-step" data-story-step="manifest" aria-current="step">
      <div class="story-copy">
        <span>01</span>
        <p>MANIFEST</p>
        <h3>무엇을 실행할지 먼저 고정합니다.</h3>
      </div>
      <div class="story-proof" data-story-proof="manifest">
        <p>SIGNED CONDITION</p>
        <dl>
          <div><dt>Network</dt><dd>GIWA Sepolia</dd></div>
          <div><dt>Target</dt><dd>Mock vault</dd></div>
          <div><dt>Action</dt><dd>Deposit selector</dd></div>
          <div><dt>Amount</dt><dd>Exact value</dd></div>
        </dl>
      </div>
    </article>
    <article class="story-step" data-story-step="execution">
      <div class="story-copy">
        <span>02</span>
        <p>EXECUTION</p>
        <h3>지갑이 동일한 조건으로 트랜잭션을 전송합니다.</h3>
      </div>
      <div class="story-proof" data-story-proof="execution">
        <p>BLOCK CONFIRMED</p>
        <ol>
          <li>Manifest signed</li>
          <li>Wallet submitted</li>
          <li>Standard RPC confirmed</li>
        </ol>
      </div>
    </article>
    <article class="story-step" data-story-step="matching">
      <div class="story-copy">
        <span>03</span>
        <p>FIELD MATCHING</p>
        <h3>네 개의 필드를 각각 대조합니다.</h3>
      </div>
      <div class="story-proof" data-story-proof="matching">
        <p>4 / 4 MATCHED</p>
        <dl>
          <div><dt>Network</dt><dd>MATCHED</dd></div>
          <div><dt>Target</dt><dd>MATCHED</dd></div>
          <div><dt>Action</dt><dd>MATCHED</dd></div>
          <div><dt>Amount</dt><dd>MATCHED</dd></div>
        </dl>
      </div>
    </article>
    <article class="story-step" data-story-step="receipt">
      <div class="story-copy">
        <span>04</span>
        <p>PUBLIC RECEIPT</p>
        <h3>일치한 실행만 공개 Receipt로 남깁니다.</h3>
      </div>
      <div class="story-proof" data-story-proof="receipt">
        <p>RECEIPT READY</p>
        <strong data-receipt-hash>검증된 실행</strong>
        <a data-recorded-receipt href="/evidence">검증된 Receipt 보기</a>
      </div>
    </article>
  </div>
</section>
```

Every article must contain its own meaningful evidence snapshot so mobile and
JavaScript-disabled layouts remain complete without cloned content.

- [ ] **Step 3: Tighten the rest of the page into a product conversion path**

Preserve route anchors but use these section responsibilities:

```html
<section id="use-cases" class="section" data-reveal>
  <p class="section-index">03 · USE CASES</p>
  <h2>제품이 필요한 순간</h2>
  <div class="use-case-list">
    <article><strong>온체인 캠페인</strong><p>약속한 액션의 실행 근거를 확인합니다.</p></article>
    <article><strong>퀘스트·활성화</strong><p>참여 기록과 실제 실행을 구분합니다.</p></article>
    <article><strong>파트너 검증</strong><p>Manifest 범위의 증거를 Receipt로 전달합니다.</p></article>
  </div>
</section>

<section id="why-giwa" class="section" data-reveal>
  <p class="section-index">04 · BUILT ON GIWA</p>
  <div class="giwa-list">
    <article><small>NOW</small><strong>GIWA Sepolia</strong></article>
    <article><small>NOW</small><strong>Public Receipt</strong></article>
    <article><small>NEXT</small><strong>GIWA Wallet in-app</strong></article>
  </div>
</section>

<section id="scope" class="section scope-section" data-reveal>
  <p class="section-index">05 · CURRENT SCOPE</p>
  <ul>
    <li>GIWA Sepolia 테스트넷 실행</li>
    <li>Manifest와 필드 대조</li>
    <li>Standard RPC transaction evidence</li>
    <li>일치한 실행의 공개 Receipt</li>
  </ul>
</section>
```

End with a calm `GIWA 데모 열기` return action to `/giwa-demo` and the
validated recorded Receipt, then keep the existing public product/testnet
footer. The landing remains useful to direct visitors, but it is not a
mandatory pre-demo introduction for judges.

- [ ] **Step 4: Implement the desktop visual system**

Keep the existing tokens and use a maximum content width of 1440 px. The core
story layout must use native sticky behavior only:

```css
.story-step {
  min-height: min(920px, 92vh);
  display: grid;
  grid-template-columns: minmax(280px, 0.72fr) minmax(520px, 1.28fr);
  gap: clamp(56px, 8vw, 128px);
  align-items: start;
}

.story-copy {
  align-self: center;
  padding-block: 18vh;
}

.story-proof {
  position: sticky;
  top: 104px;
  min-height: 560px;
  align-self: start;
  border: 1px solid var(--rule);
  background: var(--surface);
}
```

Use fine rules, tabular monospace fields, deep green status accents, generous
space, and no decorative image or fake illustration. Transitions are limited to
opacity, short translation, rule width, and evidence-row emphasis.

- [ ] **Step 5: Implement tablet, mobile, short-viewport, and reduced-motion
      fallbacks**

Required behavior:

```css
@media (max-width: 980px), (max-height: 640px) {
  .story-step {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 28px;
    padding-block: 72px;
  }

  .story-copy {
    padding-block: 0;
  }

  .story-proof {
    position: relative;
    top: auto;
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

At 390 px and 360 px, use one-column proof rows, wrap hashes with
`overflow-wrap: anywhere`, keep controls at least 44 px tall, and eliminate all
horizontal overflow.

- [ ] **Step 6: Run the presentation test and confirm GREEN**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingPresentation.test.ts
```

Expected: PASS.

---

### Task 3: Add progressive scroll and reveal enhancement

**Files:**
- Modify: `apps/web/src/lib/landing/landingEvidence.test.ts`
- Modify: `apps/web/public/landing.js`
- Test: `apps/web/src/lib/landing/landingEvidence.test.ts`

**Interfaces:**
- Consumes: Task 2's `[data-scroll-story]`, `[data-story-step]`,
  `[data-story-progress]`, and `[data-reveal]` hooks.
- Produces:
  - `applyStoryStage(root, steps, stage): boolean`
  - `setupScrollStory(rootDocument, ObserverCtor): () => void`
  - `setupReveals(rootDocument, ObserverCtor): () => void`

- [ ] **Step 1: Write failing state and fallback tests**

Extend the imported module type and add tests equivalent to:

```ts
it("projects an active story stage without hiding semantic content", () => {
  const root = { dataset: { storyStage: "manifest" } };
  const steps = ["manifest", "execution", "matching", "receipt"].map((stage) => ({
    dataset: { storyStep: stage },
    attributes: new Map<string, string>(),
    setAttribute(name: string, value: string) { this.attributes.set(name, value); },
    removeAttribute(name: string) { this.attributes.delete(name); }
  }));

  expect(landing.applyStoryStage(root, steps, "matching")).toBe(true);
  expect(root.dataset.storyStage).toBe("matching");
  expect(steps[2].attributes.get("aria-current")).toBe("step");
  expect(steps[0].attributes.has("aria-current")).toBe(false);
  expect(landing.applyStoryStage(root, steps, "unknown")).toBe(false);
});
```

Add a fake observer test that verifies all four steps are observed, an
intersecting callback updates `data-story-stage` and `01 / 04`-style progress,
and cleanup calls `disconnect()`. Add a fallback test proving an undefined
observer does not add `data-story-enhanced`.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingEvidence.test.ts
```

Expected: FAIL because the three exported interaction functions do not exist.

- [ ] **Step 3: Implement finite story state**

Add:

```js
const STORY_STAGES = ["manifest", "execution", "matching", "receipt"];

export function applyStoryStage(root, steps, stage) {
  if (!STORY_STAGES.includes(stage)) return false;
  root.dataset.storyStage = stage;
  for (const step of steps) {
    if (step.dataset.storyStep === stage) {
      step.setAttribute("aria-current", "step");
    } else {
      step.removeAttribute("aria-current");
    }
  }
  return true;
}
```

- [ ] **Step 4: Implement observer enhancement with dependency injection**

Add a controller with this behavior:

```js
export function setupScrollStory(
  rootDocument = document,
  ObserverCtor = globalThis.IntersectionObserver
) {
  const root = rootDocument.querySelector("[data-scroll-story]");
  const steps = root ? Array.from(root.querySelectorAll("[data-story-step]")) : [];
  const progress = root?.querySelector("[data-story-progress]");
  if (!root || steps.length !== STORY_STAGES.length || typeof ObserverCtor !== "function") {
    return () => {};
  }

  const setActive = (stage) => {
    if (!applyStoryStage(root, steps, stage)) return;
    const index = STORY_STAGES.indexOf(stage);
    if (progress) progress.textContent = `${String(index + 1).padStart(2, "0")} / 04`;
  };

  setActive("manifest");
  const observer = new ObserverCtor((entries) => {
    const active = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    const stage = active?.target?.dataset?.storyStep;
    if (typeof stage === "string") setActive(stage);
  }, {
    rootMargin: "-28% 0px -48% 0px",
    threshold: [0.15, 0.35, 0.55, 0.75]
  });

  root.dataset.storyEnhanced = "true";
  for (const step of steps) observer.observe(step);
  return () => observer.disconnect();
}
```

The actual implementation may use equivalent defensive syntax but must preserve
the exported signatures and fail-open behavior.

- [ ] **Step 5: Implement one-shot normal-section reveals**

`setupReveals` must add its enhancement marker only after observer construction,
observe every `[data-reveal]`, set `data-visible="true"` once, unobserve that
node, and return a disconnect cleanup. Missing observer support returns a no-op
without hiding content.

Call both controllers from `initLanding` before the existing recorded-evidence
fetch:

```js
export async function initLanding(rootDocument = document) {
  setupMenu(rootDocument);
  setupScrollStory(rootDocument);
  setupReveals(rootDocument);
  const evidence = await fetchRecordedEvidence();
  applyRecordedEvidence(rootDocument, evidence);
}
```

- [ ] **Step 6: Run the focused landing tests and confirm GREEN**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing
```

Expected: all landing presentation, evidence, and route tests PASS.

---

### Task 4: Verify, visually tune, and update durable design routing

**Files:**
- Modify if required by approved behavior:
  `docs/superpowers/specs/2026-07-27-scroll-interactive-landing-design.md`
- Modify if required by durable routing:
  `README.md`
- Verify:
  `apps/web/public/landing.html`
  `apps/web/public/landing.css`
  `apps/web/public/landing.js`

**Interfaces:**
- Consumes: completed landing HTML, CSS, controller, existing local static
  server, and in-app browser.
- Produces: verified desktop/mobile/reduced-motion behavior and a concise
  repository handoff.

- [ ] **Step 1: Run the complete local verification**

Run:

```text
pnpm --filter @giwa/web test
pnpm typecheck
pnpm build
```

Expected: every command exits 0. If a failure is caused by the landing change,
fix it and rerun the failing command before continuing. Report unrelated
pre-existing failures separately.

- [ ] **Step 2: Restart or refresh the existing local preview**

Use the existing dependency-light web command and keep the preview on an
available loopback port. Do not deploy or mutate Lightsail.

- [ ] **Step 3: Inspect and tune desktop scroll behavior**

In the in-app browser, inspect 1440 × 900, 1280 × 720, and 1024 × 768:

- hero hierarchy is readable without scrolling;
- proof looks like a real product surface rather than a slide graphic;
- each narrative step activates predictably in both scroll directions;
- evidence remains within the viewport and clears the header;
- CTA, header anchors, Receipt fallback, and `/giwa-demo` work;
- the browser-back path and `GIWA 데모 열기` return to the direct demo;
- no console error or horizontal overflow appears.

Use CSS-only tuning for spacing and timing unless a controller defect is
demonstrated.

- [ ] **Step 4: Inspect and tune mobile and accessibility fallbacks**

Inspect 390 × 844 and 360 × 800, keyboard navigation, reduced motion, and an
observer-unavailable fallback:

- stage pairs are in natural `copy -> evidence` order;
- no sticky or nested scroll trap remains;
- focus is visible;
- buttons meet the 44 px target;
- long hashes wrap;
- all content remains visible without enhancement.

Also confirm `/giwa-demo` still exposes its persistent `제품 소개` link to `/`
without redirecting through the landing.

- [ ] **Step 5: Inspect the final diff and rerun fresh evidence**

Run:

```text
git diff --check
pnpm --filter @giwa/web test -- src/lib/landing
pnpm typecheck
pnpm build
```

Expected: no whitespace errors and all commands exit 0.

- [ ] **Step 6: Hand off without Git or deployment side effects**

Report:

- visible landing result;
- files changed;
- focused and full verification outcomes;
- any residual visual risk;
- that no Git stage/commit/push, deployment, wallet signature, or chain
  transaction occurred.

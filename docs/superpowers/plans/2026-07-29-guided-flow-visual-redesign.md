# GIWA Guided Flow Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. The user has
> selected CODEX-only inline execution, so do not dispatch subagents unless the
> user explicitly changes that preference. Steps use checkbox (`- [ ]`) syntax
> for tracking.

**Goal:** Redesign `/` as a restrained editorial landing page and `/giwa-demo`
as a responsive three-stage Guided Flow without changing the existing wallet,
transaction, verification, or Receipt behavior.

**Architecture:** Keep the dependency-light static UI and the existing
`user-flow.js` controller. Project the detailed controller states into three
presentation-only stages, render them with semantic ordered-list markup, and
use CSS to switch between a fluid three-column desktop layout and an intentional
stacked mobile layout. The landing keeps its four-step proof story but removes
repeated filled-card treatment and adopts the approved copy.

**Tech Stack:** HTML, CSS, browser DOM APIs, JavaScript, TypeScript 6, Vitest,
pnpm 10.

## Global Constraints

- Public name remains `GIWA Verified Intent Rail`.
- The MVP remains testnet-only on GIWA Sepolia.
- Do not change contracts, APIs, wallet transaction behavior, storage
  projection, verification logic, or public Receipt routes.
- Do not claim real assets, real funds, RWA issuance, yield, settlement, KYC,
  phishing prevention, finality, or security guarantees.
- Pretendard Variable is the default UI typeface. Monospace is restricted to
  chain IDs, hashes, field names, and compact technical statuses.
- Use no gradients, parallax, scroll snapping, or decorative entrance motion.
- Keep exactly one `#user-primary-action` in the rendered action page.
- Do not add a runtime dependency.
- Do not stage, commit, branch, push, or deploy without explicit user
  authorization. Commit commands below are gated by that authorization.
- Preserve unrelated working-tree changes.

---

## File Map

- `apps/web/public/landing.html`
  - Owns approved landing copy and semantic section markup.
- `apps/web/public/landing.css`
  - Owns the shared editorial visual system and landing responsive behavior.
- `apps/web/public/user-flow.js`
  - Owns existing runtime behavior plus the new presentation-only three-stage
    projection and demo DOM.
- `apps/web/public/giwa-demo.css`
  - Owns the Guided Flow layout, stage states, and demo breakpoints.
- `apps/web/src/lib/landing/landingPresentation.test.ts`
  - Guards approved landing copy, semantics, and visual constraints.
- `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`
  - Guards the three-stage projection, single action, semantics, and overflow
    prevention.
- `docs/superpowers/specs/2026-07-29-guided-flow-visual-redesign-design.md`
  - Approved design source.

---

### Task 1: Lock the landing redesign with failing presentation tests

**Files:**

- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Reference:
  `docs/superpowers/specs/2026-07-29-guided-flow-visual-redesign-design.md`

**Interfaces:**

- Consumes: static `public/landing.html` and `public/landing.css`.
- Produces: regression expectations for approved copy and editorial structure.

- [ ] **Step 1: Replace old hero copy expectations**

Update the first test to require the approved headline and CTA labels:

```ts
expect(html).toContain("약속한 실행은,");
expect(html).toContain("증명될 수 있어야 합니다.");
expect(html).toContain(
  "서명된 Manifest와 GIWA Sepolia 트랜잭션을 네 필드로 대조해"
);
expect(html).toContain('href="/giwa-demo"');
expect(html).toContain("데모 실행");
expect(html).toContain("Receipt 확인");
```

Keep the existing Korean-language, skip-link, route, and unsupported-claim
assertions.

- [ ] **Step 2: Add editorial-list and visual-token expectations**

Add these expectations to the information-architecture and CSS tests:

```ts
expect(html).toContain('<ol class="use-case-list">');
expect(html).toContain("캠페인 성과 증빙");
expect(html).toContain("퀘스트 완료 검증");
expect(html).toContain("파트너 공유");

expect(css).toMatch(/\.use-case-list\s*>\s*li/iu);
expect(css).toMatch(/\.giwa-section\s*\{[\s\S]*background:\s*var\(--ink\)/iu);
expect(css).not.toMatch(
  /backdrop-filter|linear-gradient|radial-gradient|scroll-snap/iu
);
```

Remove expectations that require filled use-case `<article>` cards.

- [ ] **Step 3: Run the landing presentation test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- landingPresentation
```

Expected: FAIL because the approved headline, CTA labels, and ordered use-case
markup are not yet in `landing.html`.

- [ ] **Step 4: Review only the test diff**

Run:

```powershell
git diff -- apps/web/src/lib/landing/landingPresentation.test.ts
```

Expected: only approved-copy and editorial-structure expectations changed.

- [ ] **Step 5: Commit only with explicit Git authorization**

If the user explicitly authorizes commits:

```powershell
git add apps/web/src/lib/landing/landingPresentation.test.ts
git commit -m "test(web): define guided landing presentation"
```

Otherwise leave the change unstaged.

---

### Task 2: Implement the editorial landing page

**Files:**

- Modify: `apps/web/public/landing.html`
- Modify: `apps/web/public/landing.css`
- Test: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**

- Consumes: existing `data-*` hooks used by `landing.js`.
- Produces: the same route and scroll-story hooks with approved copy and
  simplified presentation markup.

- [ ] **Step 1: Replace the hero copy and CTA labels**

In `landing.html`, keep the existing hero structure and data hooks, but make the
copy exactly:

```html
<p class="eyebrow">GIWA SEPOLIA · VERIFIED INTENT</p>
<h1 id="hero-title">
  <span>약속한 실행은,</span>
  <span>증명될 수 있어야 합니다.</span>
</h1>
<p class="hero-description">
  서명된 Manifest와 GIWA Sepolia 트랜잭션을 네 필드로 대조해,
  모두 일치한 경우에만 공개 Receipt를 발급합니다.
</p>
```

Change the hero and final CTA labels to:

```html
<a class="button button-primary" href="/giwa-demo">데모 실행</a>
<a class="button button-secondary" data-recorded-receipt href="/evidence">
  Receipt 확인
</a>
```

Preserve `data-recorded-receipt`, `data-receipt-hash`,
`data-deposit-hash`, and all existing route targets.

- [ ] **Step 2: Convert use cases from filled cards to an ordered list**

Replace the current use-case container with:

```html
<ol class="use-case-list">
  <li>
    <span>01</span>
    <strong>캠페인 성과 증빙</strong>
    <p>Manifest로 정한 테스트넷 액션의 실행 근거를 남깁니다.</p>
  </li>
  <li>
    <span>02</span>
    <strong>퀘스트 완료 검증</strong>
    <p>오프체인 참여와 실제 온체인 실행을 구분해 확인합니다.</p>
  </li>
  <li>
    <span>03</span>
    <strong>파트너 공유</strong>
    <p>조건과 실행의 대조 결과를 공개 Receipt 하나로 전달합니다.</p>
  </li>
</ol>
```

- [ ] **Step 3: Flatten the landing surfaces**

In `landing.css`, replace filled repeated-card styling with an editorial list:

```css
.hero h1 {
  font-size: clamp(64px, 5.3vw, 76px);
}

.use-case-list {
  display: grid;
  margin: 64px 0 0;
  padding: 0;
  border-top: 1px solid var(--ink);
  list-style: none;
}

.use-case-list > li {
  min-width: 0;
  display: grid;
  grid-template-columns: 72px minmax(220px, 0.8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 24px;
  min-height: 132px;
  padding-block: 24px;
  border-bottom: 1px solid var(--rule);
}

.use-case-list > li > span {
  color: var(--verified);
  font: 700 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
}

.use-case-list > li > strong {
  font-size: clamp(22px, 2.2vw, 30px);
  letter-spacing: -0.035em;
}

.use-case-list > li > p {
  max-width: 48ch;
  margin: 0;
}
```

Make `.statement-section` rely on spacing and a top rule instead of a filled
rounded surface:

```css
.statement-section {
  width: min(100%, var(--max-width));
  margin-top: 0;
  border-top: 1px solid var(--rule);
  border-radius: 0;
  background: transparent;
}
```

Reduce the GIWA band to a dark section with rules rather than nested floating
cards:

```css
.giwa-now,
.giwa-next {
  border-radius: 0;
}

.giwa-now {
  border-block: 1px solid #464b42;
  background: transparent;
}

.giwa-next {
  border-block: 1px solid #aacdbd;
  background: var(--verified-soft);
}
```

- [ ] **Step 4: Add intentional mobile landing behavior**

Under `@media (max-width: 760px)`, add:

```css
.use-case-list > li {
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px 18px;
  padding-block: 28px;
}

.use-case-list > li > p {
  grid-column: 2;
}

.hero h1 {
  font-size: clamp(42px, 12vw, 50px);
}
```

Keep the existing single-column proof and four-step story fallbacks.

- [ ] **Step 5: Run the landing test and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- landingPresentation
```

Expected: all landing presentation tests pass.

- [ ] **Step 6: Inspect the landing diff**

Run:

```powershell
git diff --check
git diff -- apps/web/public/landing.html apps/web/public/landing.css
```

Expected: no whitespace errors, no route/data-hook removal, and no unsupported
claims.

- [ ] **Step 7: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/public/landing.html apps/web/public/landing.css apps/web/src/lib/landing/landingPresentation.test.ts
git commit -m "feat(web): refine editorial landing"
```

Otherwise leave the files unstaged.

---

### Task 3: Lock the three-stage demo projection with failing tests

**Files:**

- Modify: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`
- Reference: `apps/web/public/user-flow.js`
- Reference: `apps/web/public/giwa-demo.css`

**Interfaces:**

- Consumes: existing `progressSteps()` state values
  (`active`, `complete`, `blocked`, `pending`).
- Produces: required presentation states
  (`current`, `complete`, `attention`, `locked`) and three stage identifiers
  (`prepare`, `execute`, `receipt`).

- [ ] **Step 1: Replace four-stage expectations with three-stage expectations**

Change the route-aware test to require:

```ts
expect(source).toContain("projectDemoStageState");
expect(source).toContain("demoProgressStages");
expect(source).toContain("renderDemoGuidedFlow");
expect(source).toContain("준비 상태 확인");
expect(source).toContain("조건 검토 및 실행");
expect(source).toContain("Receipt 확인");
expect(source).toContain('view("span", { text: "직접 실행하고," })');
expect(source).toContain(
  'view("span", { text: "결과를 확인해보세요." })'
);
expect(source).toContain(
  "지갑 연결부터 공개 Receipt까지, 지금 필요한 순서대로 안내합니다."
);
expect(source).not.toContain("renderDemoStageRail");
```

Keep the assertion that `#user-primary-action` occurs exactly once.

- [ ] **Step 2: Add semantic and overflow-prevention CSS expectations**

Replace the old two-column-shell assertions with:

```ts
expect(css).toContain(".giwa-demo-guided-flow");
expect(css).toMatch(
  /\.giwa-demo-guided-flow\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/iu
);
expect(css).toContain('@media (max-width: 959px)');
expect(css).toContain('@media (max-width: 639px)');
expect(css).not.toContain("minmax(420px");
expect(css).not.toContain("minmax(520px");
expect(css).not.toContain("scrollbar-gutter");
expect(css).not.toMatch(/linear-gradient|radial-gradient|scroll-snap/iu);
```

- [ ] **Step 3: Run the focused demo test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- giwaDemoPresentation
```

Expected: FAIL because the current source still renders a four-stage rail and
fixed-minimum two-column demo.

- [ ] **Step 4: Review only the test diff**

Run:

```powershell
git diff -- apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: the test change is limited to the approved three-stage structure,
copy, semantics, and responsive constraints.

- [ ] **Step 5: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
git commit -m "test(web): define guided demo flow"
```

Otherwise leave the change unstaged.

---

### Task 4: Implement the three-stage presentation projection

**Files:**

- Modify: `apps/web/public/user-flow.js`
- Test: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`

**Interfaces:**

- Consumes: `progressSteps()`, `nextPrimaryAction()`, `primaryLabel()`,
  `renderIntentPanel()`, `walletState`, `assetState`, `runState`, and the
  existing `onPrimaryAction`.
- Produces:
  - `projectDemoStageState(states: string[]): "current" | "complete" |
    "attention" | "locked"`
  - `demoProgressStages(): Array<[string, string, string, string]>`
  - `renderDemoGuidedFlow(actions: Node[], action: string): HTMLOListElement`

- [ ] **Step 1: Replace the four-stage projection**

Replace `combineDemoStageState()` and the current `demoProgressStages()` with:

```js
function projectDemoStageState(states) {
  if (states.includes("blocked")) return "attention";
  if (states.every((state) => state === "complete")) return "complete";
  if (states.includes("active")) return "current";
  return "locked";
}

function demoProgressStages() {
  const states = Object.fromEntries(
    progressSteps().map(([id, , , state]) => [id, state])
  );
  return [
    [
      "prepare",
      "준비 상태 확인",
      "지갑, 네트워크와 테스트 자산을 확인합니다.",
      projectDemoStageState([states.wallet_connected])
    ],
    [
      "execute",
      "조건 검토 및 실행",
      "Manifest의 네 필드를 확인하고 GIWA에서 실행합니다.",
      projectDemoStageState([
        states.intent_issued,
        states.approval_submitted,
        states.deposit_submitted
      ])
    ],
    [
      "receipt",
      "Receipt 확인",
      "트랜잭션 증거와 조건이 모두 일치하면 결과를 공개합니다.",
      projectDemoStageState([
        states.standard_rpc_receipt_found,
        states.verification_matched,
        states.receipt_ready
      ])
    ]
  ];
}
```

The function is presentation-only and must not write to storage or modify
controller state.

- [ ] **Step 2: Add compact stage summary helpers**

Add these helpers near the existing demo renderer:

```js
function renderDemoPrepareSummary() {
  return view("dl", { className: "giwa-demo-stage-summary" }, [
    field("Network", "GIWA Sepolia 91342"),
    field("Wallet", walletState.account === null ? "연결 필요" : shortHash(walletState.account)),
    field(
      "Readiness",
      assetState.next === "deposit_ready" ? "준비 완료" : "확인 필요"
    )
  ]);
}

function renderDemoReceiptSummary() {
  const receiptReady = Boolean(runState?.receiptHash);
  return view("dl", { className: "giwa-demo-stage-summary" }, [
    field(
      "Standard RPC",
      runState?.depositTxHash ? "증거 확인 중 또는 완료" : "실행 후 확인"
    ),
    field("Field match", receiptReady ? "4 / 4 matched" : "대기 중"),
    field(
      "Receipt",
      receiptReady ? shortHash(runState.receiptHash) : "일치 후 공개"
    )
  ]);
}
```

Do not infer settlement or finality from a confirmed transaction.

- [ ] **Step 3: Add the semantic Guided Flow renderer**

Replace `renderDemoStageRail()` with:

```js
function renderDemoGuidedFlow(actions, action) {
  const stages = demoProgressStages();
  const activeStage =
    stages.find(([,,, state]) => state === "attention") ??
    stages.find(([,,, state]) => state === "current") ??
    stages.find(([,,, state]) => state === "locked") ??
    stages[stages.length - 1];

  return view(
    "ol",
    {
      className: "giwa-demo-guided-flow",
      "aria-label": "데모 진행 단계"
    },
    stages.map(([id, label, detail, state], index) => {
      const isActionStage = id === activeStage?.[0];
      const stateLabel = {
        current: "현재",
        complete: "완료",
        attention: "확인 필요",
        locked: "잠김"
      }[state];
      const content =
        id === "prepare"
          ? renderDemoPrepareSummary()
          : id === "execute"
            ? renderIntentPanel()
            : renderDemoReceiptSummary();

      return view("li", {
        className: `giwa-demo-stage ${state}`,
        "data-demo-stage": id,
        "aria-current": isActionStage ? "step" : null
      }, [
        view("div", { className: "giwa-demo-stage-meta" }, [
          view("span", {
            className: "giwa-demo-stage-index",
            text: `STEP ${String(index + 1).padStart(2, "0")}`
          }),
          view("em", {
            className: "giwa-demo-stage-state",
            text: stateLabel
          })
        ]),
        view("div", { className: "giwa-demo-stage-heading" }, [
          view("h2", { text: label }),
          view("p", { text: detail })
        ]),
        view("div", { className: "giwa-demo-stage-content" }, [content]),
        ...(isActionStage
          ? [
              view("p", {
                className: "notice",
                role: "status",
                "aria-live": "polite",
                "aria-atomic": "true",
                text: notice
              }),
              view("p", {
                className: flowStateClass(),
                text: inFlight
                  ? `${primaryLabel()} 작업을 처리하고 있습니다.`
                  : assetCopy()
              }),
              view("div", {
                className: "hero-actions user-cta-cluster",
                "data-current-action": action
              }, actions)
            ]
          : [])
      ]);
    })
  );
}
```

- [ ] **Step 4: Make the demo route use the Guided Flow**

In `renderActionPage()`, keep the existing `actions` construction and
`#user-primary-action`, but branch the route markup:

```js
const actionPage = demoRoute
  ? view("main", { className: "giwa-demo-frame", id: "main-content" }, [
      view("header", { className: "giwa-demo-intro" }, [
        view("p", { className: "eyebrow", text: "GIWA Verified Intent Rail" }),
        view("h1", {}, [
          view("span", { text: "직접 실행하고," }),
          view("span", { text: "결과를 확인해보세요." })
        ]),
        view("p", {
          className: "lead",
          text: "지갑 연결부터 공개 Receipt까지, 지금 필요한 순서대로 안내합니다."
        })
      ]),
      renderDemoGuidedFlow(actions, action)
    ])
  : view("section", { className: "hero-flow user-action-hero" }, [
      /* preserve the existing non-demo `/user` hero and evidence markup */
    ]);

app.append(...(demoRoute ? [renderDemoTopBar(), actionPage] : [actionPage]));
```

The non-demo `/user` route must keep `renderStatusRail()`,
`renderActionSummary()`, and `renderIntentPanel()` in its current layout.

- [ ] **Step 5: Keep technical Manifest values optional**

For the demo route, ensure `renderIntentPanel()` keeps its existing
`<details class="panel user-technical-details">` for selector, run ID, approval
transaction, and deposit transaction. Human-readable Network, Amount, Target,
and Asset fields may remain visible in Stage 2.

- [ ] **Step 6: Run the focused demo test**

Run:

```powershell
pnpm --filter @giwa/web test -- giwaDemoPresentation
```

Expected: the source-structure assertions pass; CSS assertions may remain RED
until Task 5.

- [ ] **Step 7: Inspect the controller diff for behavioral changes**

Run:

```powershell
git diff -- apps/web/public/user-flow.js
```

Expected: changes are confined to copy, presentation state projection, and DOM
composition. No changes occur inside wallet request, transaction submission,
verification polling, storage projection, or receipt API functions.

- [ ] **Step 8: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/public/user-flow.js
git commit -m "feat(web): add guided demo presentation"
```

Otherwise leave the file unstaged.

---

### Task 5: Implement the Guided Flow visual system and breakpoints

**Files:**

- Modify: `apps/web/public/giwa-demo.css`
- Test: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`

**Interfaces:**

- Consumes: `.giwa-demo-frame`, `.giwa-demo-intro`,
  `.giwa-demo-guided-flow`, `.giwa-demo-stage`,
  `.giwa-demo-stage-content`, and the four presentation state classes.
- Produces: no-overflow three-column desktop and stacked tablet/mobile layout.

- [ ] **Step 1: Replace the old two-column frame**

Remove fixed 420/520 px minimums, sticky side hero, and the separate evidence
surface. Use:

```css
.giwa-demo-frame {
  width: min(100% - 48px, 1180px);
  min-height: calc(100dvh - 64px);
  margin-inline: auto;
  padding: clamp(40px, 6vw, 80px) 0 72px;
}

.giwa-demo-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.52fr);
  gap: clamp(40px, 7vw, 96px);
  align-items: end;
  margin-bottom: 40px;
}

.giwa-demo-intro h1 {
  max-width: 760px;
  margin: 12px 0 0;
  font-size: clamp(44px, 5vw, 56px);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.035em;
  word-break: keep-all;
}

.giwa-demo-intro h1 > span {
  display: block;
}

.giwa-demo-intro .lead {
  margin: 0;
  font-size: 17px;
  line-height: 1.65;
}
```

- [ ] **Step 2: Build the open three-column stage row**

Add:

```css
.giwa-demo-guided-flow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  border-block: 1px solid #cdcec6;
  list-style: none;
}

.giwa-demo-stage {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 20px;
  padding: 28px;
  border-right: 1px solid #cdcec6;
  background: transparent;
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.giwa-demo-stage:last-child {
  border-right: 0;
}

.giwa-demo-stage.current,
.giwa-demo-stage.attention {
  background: #fcfbf7;
  box-shadow: inset 0 -4px 0 #0b5f43;
}

.giwa-demo-stage.complete {
  color: #3f4942;
}

.giwa-demo-stage.locked {
  color: #777c75;
}

.giwa-demo-stage-index {
  color: #0b5f43;
  font: 700 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
}

.giwa-demo-stage-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.giwa-demo-stage-state {
  color: #656960;
  font: normal 700 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
}

.giwa-demo-stage-heading h2 {
  margin: 0 0 8px;
  font-size: clamp(21px, 2vw, 28px);
  letter-spacing: -0.035em;
}

.giwa-demo-stage-heading p {
  margin: 0;
  color: #656960;
  line-height: 1.55;
}
```

- [ ] **Step 3: Flatten nested panels inside stages**

Add:

```css
.giwa-demo-stage .panel,
.giwa-demo-stage .user-gate-card,
.giwa-demo-stage .field {
  border-radius: 0;
  box-shadow: none;
}

.giwa-demo-stage .panel {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
}

.giwa-demo-stage-summary {
  display: grid;
  margin: 0;
  border-top: 1px solid #d8d8d0;
}

.giwa-demo-stage-summary .field {
  min-width: 0;
  min-height: 54px;
  padding-block: 12px;
  border: 0;
  border-bottom: 1px solid #d8d8d0;
}

.giwa-demo-stage .user-technical-details {
  margin-top: 18px;
  border-top: 1px solid #d8d8d0;
}
```

Keep the primary button at 10–12 px radius and at least 44 px high. Quiet links
remain underlined text, not secondary filled buttons.

- [ ] **Step 4: Add 640–959 px stacking**

Add:

```css
@media (max-width: 959px) {
  .giwa-demo-frame {
    width: min(100% - 40px, 760px);
  }

  .giwa-demo-intro {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .giwa-demo-guided-flow {
    grid-template-columns: 1fr;
  }

  .giwa-demo-stage {
    border-right: 0;
    border-bottom: 1px solid #cdcec6;
  }

  .giwa-demo-stage:last-child {
    border-bottom: 0;
  }

  .giwa-demo-stage.locked .giwa-demo-stage-content {
    display: none;
  }
}
```

- [ ] **Step 5: Add below-640 px behavior**

Add:

```css
@media (max-width: 639px) {
  .giwa-demo-topbar {
    grid-template-columns: 1fr auto;
    padding-inline: 16px;
  }

  .giwa-demo-environment {
    display: none;
  }

  .giwa-demo-frame {
    width: min(100% - 28px, 520px);
    padding-block: 34px 56px;
  }

  .giwa-demo-intro h1 {
    font-size: clamp(36px, 10.5vw, 42px);
  }

  .giwa-demo-stage {
    padding: 24px 4px;
  }

  .giwa-demo-stage.current,
  .giwa-demo-stage.attention {
    padding-inline: 18px;
  }

  .giwa-demo-stage .user-cta-cluster,
  .giwa-demo-stage .user-primary-action {
    width: 100%;
  }
}
```

Ensure long values keep `overflow-wrap: anywhere`.

- [ ] **Step 6: Keep accessibility and reduced motion**

Preserve:

```css
.giwa-demo-shell :focus-visible {
  outline: 3px solid #0b5f43;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .giwa-demo-shell *,
  .giwa-demo-shell *::before,
  .giwa-demo-shell *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Run focused presentation tests**

Run:

```powershell
pnpm --filter @giwa/web test -- landingPresentation giwaDemoPresentation
```

Expected: 2 test files pass with all presentation tests green.

- [ ] **Step 8: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/public/giwa-demo.css apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
git commit -m "feat(web): style guided demo flow"
```

Otherwise leave the files unstaged.

---

### Task 6: Verify behavior, responsiveness, and final scope

**Files:**

- Inspect all modified files.
- Do not modify generated evidence unless its owning build command changes it.

**Interfaces:**

- Consumes: completed landing and demo presentation.
- Produces: fresh automated and browser evidence for completion.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm --filter @giwa/web test -- landingPresentation giwaDemoPresentation
```

Expected: all focused tests pass.

- [ ] **Step 2: Run the full web test suite**

Run:

```powershell
pnpm --filter @giwa/web test
```

Expected: all 79 test files and 424 tests pass. If the existing
`lightsailOpsAssets` process-spawning test exceeds the default 5-second timeout,
run it alone to confirm it passes, then run:

```powershell
pnpm --filter @giwa/web exec vitest run --testTimeout=10000
```

Record the default-timeout result separately; do not change unrelated Lightsail
tests as part of this visual task.

- [ ] **Step 3: Run workspace checks**

Run:

```powershell
pnpm typecheck
pnpm build
```

Expected: all workspace type checks and builds pass.

- [ ] **Step 4: Inspect the final diff**

Run:

```powershell
git diff --check
git status --short
git diff --stat
git diff -- apps/web/public/landing.html apps/web/public/landing.css apps/web/public/user-flow.js apps/web/public/giwa-demo.css apps/web/src/lib/landing/landingPresentation.test.ts apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: only the approved landing/demo presentation, tests, and design/plan
documents are changed. No secrets, runtime data, or unrelated generated evidence
appears.

- [ ] **Step 5: Run desktop browser QA**

At 1280 × 720, inspect `/` and `/giwa-demo`:

- No horizontal overflow.
- Approved headline and CTA labels appear.
- Demo shows three semantic stages.
- Exactly one primary action appears.
- Technical fields do not dominate the first view.

- [ ] **Step 6: Run compact desktop browser QA**

At 1024 × 768, inspect `/giwa-demo`:

- `document.documentElement.scrollWidth <= window.innerWidth`.
- All three columns or the intended stacked breakpoint fit without clipping.
- Header product link remains visible.
- Long Korean copy does not overlap stage rules.

- [ ] **Step 7: Run mobile browser QA**

At 390 × 844, inspect `/` and `/giwa-demo`:

- No horizontal overflow.
- Landing use cases render as editorial rows.
- Demo stages stack in workflow order.
- Current stage, status, and primary action precede optional technical details.
- Tap targets are at least 44 px high.

- [ ] **Step 8: Restore the browser viewport and keep the local preview**

Reset any temporary viewport override. Leave the local landing or demo preview as
the deliverable tab and close only temporary QA tabs.

- [ ] **Step 9: Commit only with explicit Git authorization**

If the user explicitly authorizes the final commit:

```powershell
git add apps/web/public/landing.html apps/web/public/landing.css apps/web/public/user-flow.js apps/web/public/giwa-demo.css apps/web/src/lib/landing/landingPresentation.test.ts apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts docs/superpowers/specs/2026-07-29-guided-flow-visual-redesign-design.md docs/superpowers/plans/2026-07-29-guided-flow-visual-redesign.md
git commit -m "feat(web): redesign landing and guided demo"
```

Do not include `.superpowers/`, local runtime data, `.env`, or ignored evidence.

- [ ] **Step 10: Deploy only after a separate explicit instruction**

Do not publish to Lightsail or change the live site as part of local completion.
If deployment is later authorized, use the project deploy skill and the current
Lightsail runbook.

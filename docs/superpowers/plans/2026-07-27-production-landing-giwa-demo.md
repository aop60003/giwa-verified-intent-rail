# Production Landing and GIWA Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. The user
> requires CODEX ONLY, so do not dispatch subagents. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary judge-oriented root presentation with an
evergreen public product landing at `/` and add a separate, one-screen live
testnet experience at `/giwa-demo` without changing the existing operator
`/demo` or duplicating live-flow domain logic.

**Architecture:** Keep the dependency-light public assets and existing Node
route adapters. Rewrite the root landing around real Receipt evidence, add a
new route-specific `giwa-demo.html` and `giwa-demo.css` shell, and reuse
`user-flow.js` for wallet, Manifest, transaction, verifier, and Receipt state.
Map `/giwa-demo` through both local servers while leaving `/demo`, `/user`, and
all Receipt routes intact.

**Tech Stack:** Node.js, pnpm 10 workspace, TypeScript 6, Vitest 4, static
HTML/CSS/JavaScript, Pretendard Variable v1.3.9, existing static/live Node
servers, local SQLite-backed live adapter.

## Global Constraints

- Use `GIWA Verified Intent Rail` publicly.
- `/` is the evergreen public landing.
- `/giwa-demo` is the public one-screen testnet demo.
- `/demo` remains the operator Demo Control Room.
- `/user` and its child Receipt/help routes remain backward compatible.
- Reuse `user-flow.js`; do not duplicate wallet, Manifest, transaction,
  verifier, session, or Receipt logic.
- Keep the MVP on GIWA Sepolia testnet and use mock assets only.
- Do not claim mainnet readiness, real funds, real yield, or RWA issuance.
- Do not claim payment, settlement, KYC, identity, fraud prevention, phishing prevention,
  security guarantees, finality, live GIWA Wallet placement, customers, or
  partnerships.
- Do not add a frontend framework, animation library, or runtime dependency.
- Do not hand-edit generated public evidence or provenance projections.
- Do not stage, commit, branch, push, deploy, change cloud infrastructure, or
  send wallet/chain transactions without separate explicit authorization.
- Every commit step is conditional. Without explicit Git authorization, run
  the diff check and record `commit skipped by project policy`.
- Preserve unrelated user changes in the working tree.

---

## File Responsibility Map

### New files

- `apps/web/public/giwa-demo.html` — accessible public demo document and
  no-JavaScript loading shell.
- `apps/web/public/giwa-demo.css` — route-scoped one-screen desktop layout,
  stacked mobile fallback, focus, overflow, and reduced-motion rules.
- `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts` — public demo route,
  shell, navigation, compact-stage, and responsive source contracts.

### Modified files

- `apps/web/public/landing.html` — evergreen public narrative, real proof hero,
  use cases, claim boundaries, and `/giwa-demo` CTAs.
- `apps/web/public/landing.css` — quiet editorial visual system without the
  paper-slip/sticky-story treatment.
- `apps/web/public/landing.js` — keep bounded recorded-evidence and menu
  enhancement; remove the retired sticky-story controller.
- `apps/web/public/user-flow.js` — route-aware demo top bar, four-stage visual
  projection, product-introduction link, and Receipt return actions.
- `apps/web/scripts/serve-static.mjs` — map `/giwa-demo` to
  `giwa-demo.html`.
- `apps/web/scripts/serve-live.mjs` — mirror the `/giwa-demo` document mapping.
- `apps/web/scripts/smoke-staging.mjs` — smoke the public demo without removing
  existing checks.
- `apps/web/src/lib/landing/landingRouting.test.ts` — production landing and
  demo route ownership.
- `apps/web/src/lib/landing/landingPresentation.test.ts` — evergreen copy,
  semantic structure, visual constraints, and `/giwa-demo` CTA contracts.
- `apps/web/src/lib/landing/landingEvidence.test.ts` — remove retired
  sticky-story expectations while preserving fail-closed evidence tests.
- `apps/web/src/lib/live/userRouteMapping.test.ts` — `/giwa-demo`, `/demo`, and
  `/user` isolation.
- `apps/web/src/lib/live/stagingSmokeScript.test.ts` — expected public demo
  smoke tuple.
- `apps/web/src/lib/live/publicCopyGuard.test.ts` — scan both new public demo
  assets.
- `apps/web/src/lib/provenance/artifactManifest.test.ts` — include the new
  served HTML and CSS files.
- `README.md` — route ownership and local preview commands.
- `docs/implementation/giwa-gasok-staging-runbook.md` — static/live route table
  and smoke list.
- `docs/superpowers/specs/2026-07-27-production-landing-giwa-demo-design.md` —
  preserve the approved status.
- Generated local evidence under `docs/evidence/` — regenerate with the owning
  artifact command after public assets are final.

---

### Task 1: Establish the `/giwa-demo` Route and Shared-Controller Shell

**Files:**

- Create: `apps/web/public/giwa-demo.html`
- Create: `apps/web/public/giwa-demo.css`
- Modify: `apps/web/scripts/serve-static.mjs`
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/scripts/smoke-staging.mjs`
- Modify: `apps/web/src/lib/landing/landingRouting.test.ts`
- Modify: `apps/web/src/lib/live/userRouteMapping.test.ts`
- Modify: `apps/web/src/lib/live/stagingSmokeScript.test.ts`

**Interfaces:**

- Consumes: existing `public/user-flow.js` and the current live/public API
  routes.
- Produces: `/giwa-demo -> /giwa-demo.html` on both servers; a shell with
  `#app.giwa-demo-shell`; a smoke marker of `user-flow.js`.

- [ ] **Step 1: Extend route tests before changing the servers**

In `apps/web/src/lib/landing/landingRouting.test.ts`, rename the suite to
`production landing and public demo route ownership` and add these assertions
inside the server loop:

```ts
expect(source).toContain('decoded === "/giwa-demo"');
expect(source).toContain('"/giwa-demo.html"');
expect(source).toContain('decoded === "/demo"');
expect(source).toContain('"/demo.html"');
```

Extend the asset test:

```ts
for (const path of [
  "public/landing.html",
  "public/landing.css",
  "public/landing.js",
  "public/giwa-demo.html",
  "public/giwa-demo.css"
]) {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  expect(existsSync(direct) || existsSync(workspace), path).toBe(true);
}

const demoHtml = readWebFile("public/giwa-demo.html");
expect(demoHtml).toContain('href="/giwa-demo.css"');
expect(demoHtml).toContain('src="/user-flow.js"');
expect(demoHtml).toContain('class="app-shell user-shell giwa-demo-shell"');
```

In `apps/web/src/lib/live/userRouteMapping.test.ts`, add to both route-mapping
tests:

```ts
expect(source).toContain('decoded === "/giwa-demo"');
expect(source).toContain('"/giwa-demo.html"');
expect(source).toContain('decoded === "/demo"');
expect(source).toContain('"/demo.html"');
```

- [ ] **Step 2: Add the failing staging-smoke expectation**

In `apps/web/src/lib/live/stagingSmokeScript.test.ts`, change the test title to
`checks the nine public surfaces with bounded per-request behavior` and add:

```ts
["/giwa-demo", 200, "user-flow.js"],
```

immediately after the root tuple.

In `apps/web/src/lib/landing/landingRouting.test.ts`, add:

```ts
expect(smoke).toContain('["/giwa-demo",200,"user-flow.js"]');
```

- [ ] **Step 3: Run the focused tests and verify failure**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingRouting.test.ts src/lib/live/userRouteMapping.test.ts src/lib/live/stagingSmokeScript.test.ts
```

Expected: FAIL because `giwa-demo.html`, `giwa-demo.css`, and the explicit route
mapping do not exist.

- [ ] **Step 4: Create the public demo document**

Create `apps/web/public/giwa-demo.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="GIWA Sepolia에서 서명 조건과 테스트넷 실행을 대조하고 공개 Receipt를 확인하는 GIWA Verified Intent Rail 데모."
    />
    <title>GIWA Demo · GIWA Verified Intent Rail</title>
    <link
      rel="stylesheet"
      as="style"
      crossorigin
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
    />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/giwa-demo.css" />
  </head>
  <body>
    <a class="skip-link" href="#app">데모로 건너뛰기</a>
    <main
      id="app"
      class="app-shell user-shell giwa-demo-shell"
      tabindex="-1"
    >
      <section class="loading-panel">
        <p class="eyebrow">GIWA Sepolia · Testnet demo</p>
        <h1>데모를 불러오는 중</h1>
        <a class="secondary-link" href="/">제품 소개</a>
      </section>
    </main>
    <noscript>
      이 데모는 현재 상태와 지갑 액션을 표시하기 위해 JavaScript가
      필요합니다. <a href="/">제품 소개로 돌아가기</a>
    </noscript>
    <script src="/user-flow.js"></script>
  </body>
</html>
```

Create `apps/web/public/giwa-demo.css` with an initial route boundary:

```css
.giwa-demo-shell {
  min-height: 100dvh;
  background: #f7f6f1;
  color: #171916;
  font-family:
    "Pretendard Variable",
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    system-ui,
    sans-serif;
}
```

- [ ] **Step 5: Map `/giwa-demo` without touching `/demo`**

In `apps/web/scripts/serve-static.mjs`, insert the branch between `/` and
`/demo`:

```js
const requested =
  decoded === "/"
    ? "/landing.html"
    : decoded === "/giwa-demo"
      ? "/giwa-demo.html"
      : decoded === "/demo"
        ? "/demo.html"
        : decoded === "/user" ||
            decoded === "/user/receipts" ||
            decoded === "/user/help" ||
            decoded.startsWith("/user/receipt/")
          ? "/user.html"
          : decoded === "/evidence" ||
              decoded === "/partner" ||
              decoded.startsWith("/receipt/")
            ? "/index.html"
            : decoded;
```

In `apps/web/scripts/serve-live.mjs`, preserve `/live` and insert
`/giwa-demo` before the existing `/demo` branch:

```js
const requested =
  decoded === "/"
    ? "/landing.html"
    : decoded === "/live"
      ? "/live.html"
      : decoded === "/giwa-demo"
        ? "/giwa-demo.html"
        : decoded === "/demo"
          ? "/demo.html"
          : decoded === "/user" ||
              decoded === "/user/receipts" ||
              decoded === "/user/help" ||
              decoded.startsWith("/user/receipt/")
            ? "/user.html"
            : decoded === "/evidence" ||
                decoded === "/partner" ||
                decoded.startsWith("/receipt/")
              ? "/index.html"
              : decoded;
```

- [ ] **Step 6: Add the public demo smoke tuple**

In `apps/web/scripts/smoke-staging.mjs`, make the leading checks:

```js
const checks = [
  ["/",200,"landing.js"],
  ["/giwa-demo",200,"user-flow.js"],
  ["/evidence",200,"flow.js"],
  ["/user",200,"user-flow.js"],
  ["/user/help",200,"user-flow.js"],
  ["/partner",200,"GIWA Verified Intent Rail"],
  ["/healthz",200,"\"ok\":true"],
  ["/readyz",200,"\"ready\":true"],
  ["/api/public/config",200,"\"chainId\":91342"]
];
```

- [ ] **Step 7: Run the route and smoke-contract tests**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingRouting.test.ts src/lib/live/userRouteMapping.test.ts src/lib/live/stagingSmokeScript.test.ts
```

Expected: PASS.

- [ ] **Step 8: Review and conditionally commit Task 1**

Run:

```text
git diff --check
git diff -- apps/web/public/giwa-demo.html apps/web/public/giwa-demo.css apps/web/scripts/serve-static.mjs apps/web/scripts/serve-live.mjs apps/web/scripts/smoke-staging.mjs apps/web/src/lib/landing/landingRouting.test.ts apps/web/src/lib/live/userRouteMapping.test.ts apps/web/src/lib/live/stagingSmokeScript.test.ts
```

Expected: no whitespace errors and no change to the existing `/demo.html`
ownership.

If and only if Git approval is explicit:

```text
git add apps/web/public/giwa-demo.html apps/web/public/giwa-demo.css apps/web/scripts/serve-static.mjs apps/web/scripts/serve-live.mjs apps/web/scripts/smoke-staging.mjs apps/web/src/lib/landing/landingRouting.test.ts apps/web/src/lib/live/userRouteMapping.test.ts apps/web/src/lib/live/stagingSmokeScript.test.ts
git commit -m "feat(web): add public GIWA demo route"
```

Otherwise record `commit skipped by project policy`.

---

### Task 2: Replace the Judge Landing with an Evergreen Product Landing

**Files:**

- Modify: `apps/web/public/landing.html`
- Modify: `apps/web/public/landing.css`
- Modify: `apps/web/public/landing.js`
- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Modify: `apps/web/src/lib/landing/landingEvidence.test.ts`

**Interfaces:**

- Consumes: existing `flow-data.json` and
  `projectRecordedEvidence()`/`applyRecordedEvidence()`.
- Produces: semantic anchors `product`, `how-it-works`, `evidence`, `use-cases`,
  `why-giwa`, and `scope`; `/giwa-demo` primary CTAs; validated Receipt and
  explorer links.

- [ ] **Step 1: Replace judge-oriented presentation expectations**

Rewrite `apps/web/src/lib/landing/landingPresentation.test.ts` with:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("production landing presentation", () => {
  it("is Korean-first, evergreen, and demo-directed", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain("서명한 조건과 실제 실행을 대조합니다.");
    expect(html).toContain('href="/giwa-demo"');
    expect(html).toContain("데모 체험하기");
    expect(html).toContain("검증된 Receipt 보기");
    expect(html).not.toMatch(/GASOK|심사|평가자|선발|제출|스코어/iu);
  });

  it("contains the approved evergreen information architecture", () => {
    const html = readWebFile("public/landing.html");
    for (const id of [
      "product",
      "how-it-works",
      "evidence",
      "use-cases",
      "why-giwa",
      "scope"
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    for (const copy of [
      "조건 확정",
      "지갑 실행",
      "필드 대조",
      "Receipt 공개",
      "실제 GIWA Sepolia 실행을 공개합니다.",
      "현재 데모에서 확인할 수 있는 것"
    ]) {
      expect(html).toContain(copy);
    }
  });

  it("uses real proof framing without retired decorative metaphors", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain("Manifest");
    expect(html).toContain("Transaction");
    expect(html).toContain("MATCHED");
    expect(html).toContain("GIWA Wallet in-app");
    expect(html).toContain("NEXT");
    expect(html).not.toMatch(
      /hero-slip|receipt-stamp|data-story-root|story-step/iu
    );
  });

  it("keeps unsupported claims and wallet APIs out", () => {
    const html = readWebFile("public/landing.html");
    const source = readWebFile("public/landing.js");
    expect(html).not.toMatch(
      /mainnet ready|real yield|real funds|real RWA|KYC service|settlement|customer logos/iu // forbidden claims
    );
    expect(source).not.toMatch(
      /ethereum\.request|eth_sendTransaction|wallet_switchEthereumChain/iu
    );
  });

  it("uses the approved editorial tokens and accessibility fallbacks", () => {
    const css = readWebFile("public/landing.css");
    expect(css).toContain('"Pretendard Variable"');
    expect(css).toContain("--paper: #f7f6f1");
    expect(css).toContain("--ink: #171916");
    expect(css).toContain("--verified: #0b5f43");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).not.toMatch(
      /backdrop-filter|linear-gradient|radial-gradient|position:\s*sticky/iu
    );
  });
});
```

- [ ] **Step 2: Retire sticky-story evidence tests**

In `apps/web/src/lib/landing/landingEvidence.test.ts`:

- change the Node import to:

```ts
import { existsSync, readFileSync } from "node:fs";
```

- remove `chooseActiveStoryStep` from the `LandingModule` type;
- remove the `selects the most visible known story step and keeps a safe
  fallback` test;
- keep all `normalizeBytes32`, `projectRecordedEvidence`,
  `fetchRecordedEvidence`, and `applyRecordedEvidence` tests unchanged.

Add this helper after the `LandingModule` type:

```ts
function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}
```

Add this source-level test:

```ts
it("does not initialize the retired sticky story controller", () => {
  const source = readWebFile("public/landing.js");
  expect(source).not.toContain("IntersectionObserver");
  expect(source).not.toContain("setupStory");
});
```

- [ ] **Step 3: Run the landing tests and verify failure**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingPresentation.test.ts src/lib/landing/landingEvidence.test.ts
```

Expected: FAIL because the current landing still contains judge-era copy,
paper-slip classes, sticky layout, `/user` primary CTAs, and story observation.

- [ ] **Step 4: Replace the landing document structure**

Keep the existing `<head>` Pretendard link and replace the `<body>` with this
semantic structure:

```html
<body>
  <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>
  <header class="site-header" data-header>
    <a class="wordmark" href="/" aria-label="GIWA Verified Intent Rail 홈">
      GIWA VERIFIED INTENT RAIL
    </a>
    <button
      class="menu-toggle"
      type="button"
      aria-expanded="false"
      aria-controls="site-menu"
      data-menu-toggle
    >
      MENU
    </button>
    <nav id="site-menu" class="site-menu" aria-label="주요 탐색" data-menu>
      <a href="#product">제품</a>
      <a href="#how-it-works">작동 방식</a>
      <a href="#evidence">실행 증거</a>
      <a href="#use-cases">활용</a>
      <a href="#why-giwa">GIWA</a>
    </nav>
    <a class="button button-primary header-cta" href="/giwa-demo">
      데모 체험하기
    </a>
  </header>

  <main id="main-content" tabindex="-1">
    <section id="product" class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">GIWA SEPOLIA · TESTNET</p>
        <h1 id="hero-title">서명한 조건과<br />실제 실행을 대조합니다.</h1>
        <p class="hero-description">
          Manifest의 네트워크·대상·액션·수량을 GIWA Sepolia
          트랜잭션과 비교하고, 일치한 실행만 공개 Receipt로 남깁니다.
        </p>
        <div class="hero-actions">
          <a class="button button-primary" href="/giwa-demo">데모 체험하기</a>
          <a
            class="button button-secondary"
            data-recorded-receipt
            href="/evidence"
          >
            검증된 Receipt 보기
          </a>
        </div>
      </div>
      <article class="proof-surface" aria-label="Manifest와 실행 증거 대조">
        <header>
          <span>GIWA VERIFIED INTENT RAIL</span>
          <strong>MATCHED</strong>
        </header>
        <div class="proof-columns">
          <section>
            <p>MANIFEST</p>
            <dl>
              <div><dt>Network</dt><dd>GIWA Sepolia</dd></div>
              <div><dt>Target</dt><dd>Mock vault</dd></div>
              <div><dt>Action</dt><dd>Deposit selector</dd></div>
              <div><dt>Amount</dt><dd>Exact value</dd></div>
            </dl>
          </section>
          <section>
            <p>TRANSACTION</p>
            <dl>
              <div><dt>Network</dt><dd>MATCHED</dd></div>
              <div><dt>Target</dt><dd>MATCHED</dd></div>
              <div><dt>Action</dt><dd>MATCHED</dd></div>
              <div><dt>Amount</dt><dd>MATCHED</dd></div>
            </dl>
          </section>
        </div>
        <footer>
          <span>Receipt</span>
          <strong data-receipt-hash>검증된 예시</strong>
        </footer>
      </article>
    </section>

    <section class="section statement-section" aria-labelledby="problem-title">
      <p class="section-index">01 · PRODUCT</p>
      <h2 id="problem-title">
        실행했다는 기록과, 약속대로 실행했다는 증거는 다릅니다.
      </h2>
      <p>
        Rail은 Manifest에 서명된 조건과 block-confirmed Standard RPC
        트랜잭션 증거를 필드 단위로 비교합니다.
      </p>
    </section>

    <section id="how-it-works" class="section" aria-labelledby="process-title">
      <p class="section-index">02 · HOW IT WORKS</p>
      <h2 id="process-title">Intent에서 Receipt까지, 네 단계로 연결합니다.</h2>
      <ol class="process-list">
        <li><span>01</span><strong>조건 확정</strong><p>네트워크, 대상, 액션, 수량을 Manifest에 고정합니다.</p></li>
        <li><span>02</span><strong>지갑 실행</strong><p>검토한 조건에 따라 GIWA Sepolia 액션을 실행합니다.</p></li>
        <li><span>03</span><strong>필드 대조</strong><p>Manifest와 Standard RPC 증거를 비교합니다.</p></li>
        <li><span>04</span><strong>Receipt 공개</strong><p>일치한 실행만 공개 Receipt로 남깁니다.</p></li>
      </ol>
    </section>

    <section id="evidence" class="section evidence-section" aria-labelledby="evidence-title">
      <p class="section-index">03 · EVIDENCE</p>
      <h2 id="evidence-title">실제 GIWA Sepolia 실행을 공개합니다.</h2>
      <div class="match-table" role="table" aria-label="Manifest와 트랜잭션 증거 대조">
        <div role="row"><span role="cell">NETWORK</span><strong role="cell">GIWA Sepolia</strong><em role="cell">MATCHED</em></div>
        <div role="row"><span role="cell">TARGET</span><strong role="cell">Mock vault</strong><em role="cell">MATCHED</em></div>
        <div role="row"><span role="cell">ACTION</span><strong role="cell">Deposit selector</strong><em role="cell">MATCHED</em></div>
        <div role="row"><span role="cell">AMOUNT</span><strong role="cell">Exact value</strong><em role="cell">MATCHED</em></div>
      </div>
      <a class="text-link" data-recorded-explorer href="/evidence" hidden>
        GIWA Explorer에서 확인
      </a>
    </section>

    <section id="use-cases" class="section" aria-labelledby="use-title">
      <p class="section-index">04 · USE CASES</p>
      <h2 id="use-title">클릭 수가 아니라, 조건과 일치한 실행을 확인합니다.</h2>
      <div class="use-case-list">
        <article><strong>온체인 캠페인</strong><p>Manifest가 정한 액션의 실행 증거를 확인합니다.</p></article>
        <article><strong>퀘스트와 활성화</strong><p>참여 기록과 실제 테스트넷 실행을 구분합니다.</p></article>
        <article><strong>파트너 검증</strong><p>공개 Receipt와 트랜잭션 증거를 함께 전달합니다.</p></article>
      </div>
    </section>

    <section id="why-giwa" class="section" aria-labelledby="giwa-title">
      <p class="section-index">05 · WHY GIWA</p>
      <h2 id="giwa-title">GIWA에서 실행하고, 같은 체인의 증거로 확인합니다.</h2>
      <div class="giwa-list">
        <article><small>NOW</small><strong>GIWA Sepolia</strong><p>Chain ID 91342의 테스트넷 실행과 Standard RPC 증거.</p></article>
        <article><small>NOW</small><strong>Public Receipt</strong><p>일치한 실행에 한해 공개되는 검증 결과.</p></article>
        <article><small>NEXT</small><strong>GIWA Wallet in-app</strong><p>액션 진입과 Receipt handoff를 지갑 안으로 연결하는 다음 경로.</p></article>
      </div>
    </section>

    <section id="scope" class="section scope-section" aria-labelledby="scope-title">
      <p class="section-index">06 · CURRENT SCOPE</p>
      <h2 id="scope-title">현재 데모에서 확인할 수 있는 것</h2>
      <ul>
        <li>GIWA Sepolia 테스트넷 실행</li>
        <li>Manifest의 네 필드 대조</li>
        <li>Standard RPC transaction evidence</li>
        <li>일치한 실행의 공개 Receipt</li>
      </ul>
    </section>

    <section class="final-cta" aria-labelledby="final-title">
      <p>GIWA SEPOLIA · TESTNET ASSETS ONLY</p>
      <h2 id="final-title">직접 실행하고, 직접 대조하세요.</h2>
      <div class="hero-actions">
        <a class="button button-primary" href="/giwa-demo">데모 체험하기</a>
        <a class="button button-secondary" data-recorded-receipt href="/evidence">
          검증된 Receipt 보기
        </a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <span>GIWA VERIFIED INTENT RAIL</span>
    <span>GIWA SEPOLIA · TESTNET ONLY</span>
  </footer>
  <script type="module" src="/landing.js"></script>
</body>
```

- [ ] **Step 5: Simplify the landing controller**

In `apps/web/public/landing.js`:

- retain `normalizeBytes32`, `shortHash`, `projectRecordedEvidence`,
  `fetchRecordedEvidence`, `applyRecordedEvidence`, `setupMenu`, and
  `initLanding`;
- delete `STORY_STEPS`, `chooseActiveStoryStep`, and `setupStory`;
- remove `setupStory(rootDocument);` from `initLanding`.

The final initializer is:

```js
export async function initLanding(rootDocument = document) {
  setupMenu(rootDocument);
  const evidence = await fetchRecordedEvidence();
  applyRecordedEvidence(rootDocument, evidence);
}
```

- [ ] **Step 6: Replace the landing visual system**

Rewrite `apps/web/public/landing.css` around these exact tokens and structural
rules:

```css
:root {
  --paper: #f7f6f1;
  --surface: #fcfbf7;
  --ink: #171916;
  --muted: #656960;
  --rule: #cdcec6;
  --verified: #0b5f43;
  --verified-soft: #dcefe6;
  --max-width: 1440px;
  color: var(--ink);
  background: var(--paper);
  font-family:
    "Pretendard Variable",
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    system-ui,
    sans-serif;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--paper);
}

a,
button {
  color: inherit;
}

:focus-visible {
  outline: 3px solid var(--verified);
  outline-offset: 4px;
}

.site-header,
.hero,
.section,
.final-cta,
.site-footer {
  width: min(100%, var(--max-width));
  margin-inline: auto;
  padding-inline: clamp(20px, 5vw, 72px);
}

.site-header {
  min-height: 72px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 28px;
  border-bottom: 1px solid var(--rule);
}

.site-menu {
  display: flex;
  justify-content: center;
  gap: 28px;
}

.hero {
  min-height: min(860px, calc(100dvh - 72px));
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(520px, 1.1fr);
  align-items: center;
  gap: clamp(48px, 7vw, 112px);
  padding-block: clamp(72px, 10vw, 144px);
}

.hero h1 {
  margin: 16px 0 24px;
  max-width: 700px;
  font-size: clamp(54px, 6.8vw, 96px);
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.hero-description,
.section > p,
.use-case-list p,
.giwa-list p {
  max-width: 66ch;
  font-size: clamp(16px, 1.4vw, 20px);
  line-height: 1.7;
  color: var(--muted);
}

.button {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border: 1px solid var(--ink);
  text-decoration: none;
  font-weight: 650;
}

.button-primary {
  background: var(--verified);
  border-color: var(--verified);
  color: #fff;
}

.button-secondary {
  background: transparent;
}

.proof-surface {
  background: var(--surface);
  border: 1px solid var(--rule);
  padding: clamp(24px, 3vw, 44px);
}

.proof-surface > header,
.proof-surface > footer,
.proof-columns,
.proof-surface dl div,
.match-table > div {
  display: grid;
  align-items: center;
}

.proof-surface > header,
.proof-surface > footer {
  grid-template-columns: 1fr auto;
  gap: 24px;
}

.proof-surface > header strong,
.proof-surface em,
.match-table em {
  color: var(--verified);
  font-style: normal;
}

.proof-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-block: 32px;
  border-block: 1px solid var(--rule);
}

.proof-columns > section {
  padding: 28px;
}

.proof-columns > section + section {
  border-left: 1px solid var(--rule);
}

.proof-surface dl div {
  grid-template-columns: 1fr auto;
  gap: 18px;
  padding-block: 12px;
  border-top: 1px solid var(--rule);
}

.proof-surface dd,
.match-table strong,
[data-receipt-hash] {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.section {
  padding-block: clamp(96px, 12vw, 180px);
  border-top: 1px solid var(--rule);
}

.section h2,
.final-cta h2 {
  max-width: 1000px;
  margin: 12px 0 28px;
  font-size: clamp(38px, 5vw, 72px);
  line-height: 1.06;
  letter-spacing: -0.045em;
}

.process-list,
.use-case-list,
.giwa-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 0;
  list-style: none;
  border-block: 1px solid var(--rule);
}

.process-list li,
.use-case-list article,
.giwa-list article {
  padding: 28px;
  border-right: 1px solid var(--rule);
}

.match-table > div {
  grid-template-columns: 180px minmax(0, 1fr) auto;
  gap: 28px;
  min-height: 64px;
  border-top: 1px solid var(--rule);
}

.scope-section ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 48px;
  padding-left: 20px;
}

.final-cta {
  padding-block: clamp(100px, 14vw, 220px);
  text-align: center;
  border-top: 1px solid var(--rule);
}

@media (max-width: 980px) {
  .hero {
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .process-list,
  .use-case-list,
  .giwa-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .site-header {
    grid-template-columns: 1fr auto auto;
  }

  .site-menu {
    position: absolute;
    inset: 72px 0 auto;
    display: none;
    padding: 20px;
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
  }

  .site-menu[data-open="true"] {
    display: grid;
  }

  .header-cta {
    min-height: 44px;
    padding-inline: 12px;
  }

  .hero h1 {
    font-size: clamp(48px, 14vw, 68px);
  }

  .proof-columns,
  .process-list,
  .use-case-list,
  .giwa-list,
  .scope-section ul {
    grid-template-columns: 1fr;
  }

  .proof-columns > section + section,
  .process-list li,
  .use-case-list article,
  .giwa-list article {
    border-left: 0;
    border-right: 0;
    border-top: 1px solid var(--rule);
  }

  .match-table > div {
    grid-template-columns: 1fr auto;
  }

  .match-table strong {
    grid-column: 1 / -1;
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

Retain existing skip-link, menu-toggle, wordmark, hero-actions, footer, and
visually hidden utility rules only where their selectors are still used by
the new HTML.

- [ ] **Step 7: Run focused landing tests**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingPresentation.test.ts src/lib/landing/landingEvidence.test.ts src/lib/landing/landingRouting.test.ts
```

Expected: PASS.

- [ ] **Step 8: Review and conditionally commit Task 2**

Run:

```text
git diff --check
git diff -- apps/web/public/landing.html apps/web/public/landing.css apps/web/public/landing.js apps/web/src/lib/landing/landingPresentation.test.ts apps/web/src/lib/landing/landingEvidence.test.ts
```

Expected: the landing has no GASOK/judge copy, paper slips, stamp, sticky
story, `/user` primary CTA, wallet API, or unsupported claim.

If and only if Git approval is explicit:

```text
git add apps/web/public/landing.html apps/web/public/landing.css apps/web/public/landing.js apps/web/src/lib/landing/landingPresentation.test.ts apps/web/src/lib/landing/landingEvidence.test.ts
git commit -m "feat(web): redesign production landing"
```

Otherwise record `commit skipped by project policy`.

---

### Task 3: Project the Existing Live Flow into a One-Screen Demo

**Files:**

- Create: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/giwa-demo.css`

**Interfaces:**

- Consumes: `progressSteps()`, `nextPrimaryAction()`, `primaryLabel()`,
  `renderActionSummary()`, `renderIntentPanel()`, and existing Receipt routes.
- Produces: `isGiwaDemoRoute()`, `combineDemoStageState(states)`,
  `demoProgressStages()`, `renderDemoTopBar()`, and route-specific CSS classes.

- [ ] **Step 1: Write the demo presentation contract**

Create `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("GIWA public demo presentation", () => {
  it("ships a Korean one-screen shell that reuses the live controller", () => {
    const html = readWebFile("public/giwa-demo.html");
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("GIWA Demo · GIWA Verified Intent Rail");
    expect(html).toContain('href="/styles.css"');
    expect(html).toContain('href="/giwa-demo.css"');
    expect(html).toContain('src="/user-flow.js"');
    expect(html).toContain('href="/"');
  });

  it("adds a route-aware product link and four-stage projection", () => {
    const source = readWebFile("public/user-flow.js");
    expect(source).toContain('location.pathname === "/giwa-demo"');
    expect(source).toContain("renderDemoTopBar");
    expect(source).toContain("combineDemoStageState");
    expect(source).toContain("demoProgressStages");
    expect(source).toContain("준비");
    expect(source).toContain("조건 검토");
    expect(source).toContain("실행");
    expect(source).toContain("Receipt");
    expect(source).toContain('href: "/", text: "제품 소개"');
    expect(source).toContain('href: "/giwa-demo", text: "다시 실행"');
  });

  it("keeps one dominant action and the existing technical state machine", () => {
    const source = readWebFile("public/user-flow.js");
    expect(source).toContain('id: "user-primary-action"');
    expect(source).toContain("nextPrimaryAction()");
    expect(source).toContain("primaryLabel()");
    expect(source).toContain("progressSteps()");
    expect(source).toContain("renderActionSummary()");
    expect(source).toContain("renderIntentPanel()");
    expect(source.match(/id: "user-primary-action"/gu)).toHaveLength(1);
  });

  it("uses a desktop viewport shell with accessible stacked fallbacks", () => {
    const css = readWebFile("public/giwa-demo.css");
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain(".giwa-demo-topbar");
    expect(css).toContain(".giwa-demo-stage-rail");
    expect(css).toContain(".giwa-demo-frame");
    expect(css).toContain("@media (max-width: 980px)");
    expect(css).toContain("@media (max-height: 760px)");
    expect(css).toContain("overflow: visible");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
  });
});
```

- [ ] **Step 2: Run the demo presentation test and verify failure**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: FAIL because the route-aware top bar, four-stage projection, Receipt
links, and completed demo CSS do not exist.

- [ ] **Step 3: Add route and stage helpers to `user-flow.js`**

Add after `routeName()`:

```js
function isGiwaDemoRoute() {
  return location.pathname === "/giwa-demo";
}

function combineDemoStageState(states) {
  if (states.includes("blocked")) return "blocked";
  if (states.every((state) => state === "complete")) return "complete";
  if (states.includes("active")) return "active";
  return "pending";
}

function demoProgressStages() {
  const states = Object.fromEntries(
    progressSteps().map(([id, , , state]) => [id, state])
  );
  return [
    ["prepare", "준비", combineDemoStageState([states.wallet_connected])],
    ["review", "조건 검토", combineDemoStageState([states.intent_issued])],
    [
      "execute",
      "실행",
      combineDemoStageState([
        states.approval_submitted,
        states.deposit_submitted
      ])
    ],
    [
      "receipt",
      "Receipt",
      combineDemoStageState([
        states.standard_rpc_receipt_found,
        states.verification_matched,
        states.receipt_ready
      ])
    ]
  ];
}
```

`demoProgressStages()` must remain below the `progressSteps()` declaration or
be called only after initialization. Function declarations are hoisted, so no
controller-order change is required.

- [ ] **Step 4: Add the demo top bar and compact stage rail**

Add:

```js
function renderDemoTopBar() {
  return view("header", { className: "giwa-demo-topbar" }, [
    view("a", {
      className: "giwa-demo-wordmark",
      href: "/",
      text: "GIWA VERIFIED INTENT RAIL"
    }),
    view("p", {
      className: "giwa-demo-environment",
      text: "GIWA Sepolia · Testnet"
    }),
    view("a", {
      className: "secondary-link giwa-demo-product-link",
      href: "/",
      text: "제품 소개"
    })
  ]);
}

function renderDemoStageRail() {
  return view(
    "ol",
    { className: "giwa-demo-stage-rail", "aria-label": "데모 진행 단계" },
    demoProgressStages().map(([id, label, state], index) =>
      view("li", {
        className: `giwa-demo-stage ${state}`,
        "data-demo-stage": id,
        "aria-current": state === "active" ? "step" : null
      }, [
        view("span", { text: String(index + 1).padStart(2, "0") }),
        view("strong", { text: label }),
        view("em", { text: state })
      ])
    )
  );
}
```

The existing `view()` helper already omits `null` attributes; keep that helper
unchanged so only the active stage receives `aria-current="step"`.

- [ ] **Step 5: Make the action renderer route-aware**

In `renderActionPage()`, derive:

```js
const demoRoute = isGiwaDemoRoute();
```

Change the root section class to:

```js
className: `hero-flow user-action-hero ${demoRoute ? "giwa-demo-frame" : ""}`
```

Inside the hero-copy children, insert `renderDemoStageRail()` immediately
after the eyebrow only when `demoRoute` is true:

```js
...(demoRoute ? [renderDemoStageRail()] : []),
```

Replace the final `app.append(...)` call with:

```js
const actionPage = view("section", {
  className: `hero-flow user-action-hero ${demoRoute ? "giwa-demo-frame" : ""}`
}, [
  view("div", { className: "hero-copy" }, [
    view("p", { className: "eyebrow", text: "GIWA Verified Intent Rail" }),
    ...(demoRoute ? [renderDemoStageRail()] : []),
    view("h1", {
      text: demoRoute
        ? "조건을 확인하고 GIWA에서 실행하세요"
        : "서명 전에 테스트넷 액션을 검토하세요"
    }),
    view("p", {
      className: "lead",
      text: demoRoute
        ? "현재 필요한 액션 하나만 안내합니다. 실행 후 Manifest와 트랜잭션을 대조해 공개 Receipt를 만듭니다."
        : "한 개의 버튼이 현재 필요한 단계만 안내합니다. Manifest와 일치한 트랜잭션만 공개 Receipt를 받습니다."
    }),
    view("p", {
      className: "notice",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      text: notice
    }),
    view("p", {
      className: flowStateClass(),
      text: inFlight ? `${primaryLabel()} 작업을 처리하고 있습니다.` : assetCopy()
    }),
    view("div", {
      className: "hero-actions user-cta-cluster",
      "data-current-action": action
    }, actions),
    ...(demoRoute ? [] : [renderStatusRail()])
  ]),
  view("div", { className: demoRoute ? "giwa-demo-evidence" : "" }, [
    renderActionSummary(),
    renderIntentPanel()
  ])
]);

app.append(...(demoRoute ? [renderDemoTopBar(), actionPage] : [actionPage]));
```

Keep the existing `#user-primary-action` listener unchanged.

- [ ] **Step 6: Add Receipt return actions**

In `renderReceiptRoute()`, replace the existing `새 테스트 시작` action with:

```js
view("a", {
  className: "secondary-link",
  href: "/giwa-demo",
  text: "다시 실행"
}),
view("a", {
  className: "secondary-link",
  href: "/",
  text: "제품 소개"
})
```

Do not change the Receipt hash, explorer, public evidence, or copy-link logic.

- [ ] **Step 7: Complete the demo-only stylesheet**

Replace `apps/web/public/giwa-demo.css` with:

```css
.giwa-demo-shell {
  height: 100dvh;
  min-height: 720px;
  overflow: hidden;
  display: grid;
  grid-template-rows: 64px minmax(0, 1fr);
  background: #f7f6f1;
  color: #171916;
  font-family:
    "Pretendard Variable",
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    system-ui,
    sans-serif;
}

.giwa-demo-shell:focus-within {
  scroll-behavior: auto;
}

.giwa-demo-shell :focus-visible {
  outline: 3px solid #0b5f43;
  outline-offset: 3px;
}

.giwa-demo-topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  min-width: 0;
  padding: 0 clamp(20px, 3vw, 48px);
  border-bottom: 1px solid #cdcec6;
}

.giwa-demo-wordmark {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;
  text-decoration: none;
  font-size: 13px;
  font-weight: 750;
  letter-spacing: 0.04em;
}

.giwa-demo-environment {
  margin: 0;
  color: #0b5f43;
  font-size: 13px;
  font-weight: 650;
}

.giwa-demo-product-link {
  justify-self: end;
}

.giwa-demo-frame {
  min-height: 0;
  height: 100%;
  overflow: hidden;
  grid-template-columns: minmax(420px, 0.82fr) minmax(520px, 1.18fr);
  align-items: stretch;
  gap: clamp(28px, 4vw, 64px);
  padding: clamp(24px, 3vw, 48px);
}

.giwa-demo-frame > * {
  min-width: 0;
  min-height: 0;
}

.giwa-demo-frame .hero-copy {
  max-width: 680px;
  align-self: center;
}

.giwa-demo-frame h1 {
  margin-block: 18px 14px;
  font-size: clamp(42px, 4.4vw, 68px);
  line-height: 1.02;
  letter-spacing: -0.045em;
}

.giwa-demo-frame .lead {
  max-width: 58ch;
  font-size: 17px;
  line-height: 1.6;
}

.giwa-demo-stage-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
  border-block: 1px solid #cdcec6;
}

.giwa-demo-stage {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding: 12px;
  border-right: 1px solid #cdcec6;
}

.giwa-demo-stage span,
.giwa-demo-stage em {
  color: #656960;
  font-size: 11px;
  font-style: normal;
  text-transform: uppercase;
}

.giwa-demo-stage.complete strong,
.giwa-demo-stage.complete em,
.giwa-demo-stage.active strong {
  color: #0b5f43;
}

.giwa-demo-stage.blocked {
  background: #fff3d8;
}

.giwa-demo-evidence {
  min-height: 0;
  overflow: auto;
  align-self: stretch;
  padding-right: 4px;
  scrollbar-gutter: stable;
}

.giwa-demo-evidence .panel {
  background: #fcfbf7;
  border-color: #cdcec6;
  box-shadow: none;
}

.giwa-demo-frame .user-status-rail {
  display: none;
}

@media (max-width: 980px), (max-height: 760px) {
  .giwa-demo-shell {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
    display: block;
  }

  .giwa-demo-topbar {
    min-height: 64px;
    position: static;
  }

  .giwa-demo-frame {
    height: auto;
    min-height: auto;
    overflow: visible;
    grid-template-columns: 1fr;
  }

  .giwa-demo-evidence {
    overflow: visible;
  }
}

@media (max-width: 620px) {
  .giwa-demo-topbar {
    grid-template-columns: 1fr auto;
  }

  .giwa-demo-environment {
    display: none;
  }

  .giwa-demo-stage-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .giwa-demo-frame {
    padding: 22px 14px 40px;
  }

  .giwa-demo-frame h1 {
    font-size: clamp(38px, 11vw, 52px);
  }
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

- [ ] **Step 8: Run demo and existing user-flow regression tests**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/userFlow/giwaDemoPresentation.test.ts src/lib/userFlow/userVisualPolish.test.ts src/lib/userFlow/userPublicBoundary.test.ts src/lib/live/userRouteMapping.test.ts
```

Expected: PASS. Existing `/user` behavior and public safety assertions remain
green.

- [ ] **Step 9: Review and conditionally commit Task 3**

Run:

```text
git diff --check
git diff -- apps/web/public/user-flow.js apps/web/public/giwa-demo.css apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: one route-aware presentation branch, one primary action, shared live
logic, no new network calls, and no operator `/demo` change.

If and only if Git approval is explicit:

```text
git add apps/web/public/user-flow.js apps/web/public/giwa-demo.css apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
git commit -m "feat(web): add one-screen GIWA demo"
```

Otherwise record `commit skipped by project policy`.

---

### Task 4: Extend Public Boundaries, Artifact Coverage, and Route Documentation

**Files:**

- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`
- Modify: `apps/web/src/lib/provenance/artifactManifest.test.ts`
- Modify: `README.md`
- Modify: `docs/implementation/giwa-gasok-staging-runbook.md`
- Regenerate: `docs/evidence/local-artifact-manifest.json`
- Regenerate: coupled local command/provenance reports and SHA-256 sidecar

**Interfaces:**

- Consumes: final public files from Tasks 1-3.
- Produces: claim scanning for `giwa-demo.html`/`giwa-demo.css`, artifact
  manifest inclusion, and truthful route documentation.

- [ ] **Step 1: Add failing public-copy and artifact expectations**

In `apps/web/src/lib/live/publicCopyGuard.test.ts`, add:

```ts
"public/giwa-demo.html",
"public/giwa-demo.css",
```

immediately after the landing files.

In `apps/web/src/lib/provenance/artifactManifest.test.ts`, insert in
`currentPublicPaths` in alphabetical order:

```ts
"apps/web/public/giwa-demo.css",
"apps/web/public/giwa-demo.html",
```

Add both fixture entries automatically through the existing
`currentPublicPaths.map(...)` construction; do not create separate duplicate
entries.

- [ ] **Step 2: Run the focused guards and verify failure if coverage is stale**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/live/publicCopyGuard.test.ts src/lib/provenance/artifactManifest.test.ts
```

Expected before all public files are present: FAIL on missing or mismatched
public artifact coverage. After Tasks 1-3 are present, the source guards may
already pass; that is acceptable evidence that the required served files
exist.

- [ ] **Step 3: Update README route ownership**

Update the staging topology table in `README.md` to:

```md
| `/`, `/giwa-demo`, `/evidence`, `/demo`, `/partner`, `/receipt/*` | static service on `127.0.0.1:4176` | production landing, public demo shell, operator control, and recorded evidence |
| `/user*` | live service on `127.0.0.1:4177` | compatibility live flow with recorded static fallback |
| `/api/*`, `/healthz`, `/readyz` | live service on `127.0.0.1:4177` | live API and health surfaces |
```

Add to the local URL block:

```text
Production landing:   http://127.0.0.1:4176/
Public GIWA demo:     http://127.0.0.1:4176/giwa-demo
Operator control:     http://127.0.0.1:4176/demo
Compatibility user:  http://127.0.0.1:4176/user
```

Do not replace references to `/user/receipts`, `/user/help`, or public Receipt
routes.

- [ ] **Step 4: Update the staging runbook route and smoke tables**

In `docs/implementation/giwa-gasok-staging-runbook.md`:

- add `/giwa-demo` to the `giwa-static.service` responsibility;
- add `/giwa-demo` to the static route row around the current `/`, `/evidence`,
  `/demo`, `/partner`, `/receipt/*` list;
- add `/giwa-demo` to the HTTP smoke list;
- state that `/giwa-demo` serves a static shell while its relative `/api/*`
  calls continue through the live upstream;
- retain `/demo` as the operator Control Room;
- retain `/user*` as the live upstream with static fallback.

Use this exact route explanation:

```md
`/giwa-demo`의 HTML/CSS/JavaScript shell은 static upstream이 제공한다.
동일 origin의 `/api/*`, `/healthz`, `/readyz` 요청은 기존 live upstream으로
분리되므로 공개 데모 shell 추가가 API 인증·rate limit·SQLite 경계를
변경하지 않는다.
```

- [ ] **Step 5: Run the public guards**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/live/publicCopyGuard.test.ts src/lib/provenance/artifactManifest.test.ts src/lib/live/lightsailOpsAssets.test.ts
```

Expected: PASS. The Nginx template's generic static `location /` continues to
cover `/giwa-demo`; no Nginx template change is required.

- [ ] **Step 6: Regenerate the local artifact projections**

Run:

```text
pnpm --filter @giwa/web artifact:local
pnpm --filter @giwa/web artifact:provenance:verify
```

Expected: PASS; generated local manifest/provenance files include
`giwa-demo.html` and `giwa-demo.css`, contain repo-relative paths only, and
remain local-advisory rather than release evidence.

- [ ] **Step 7: Review and conditionally commit Task 4**

Run:

```text
git diff --check
git diff -- README.md docs/implementation/giwa-gasok-staging-runbook.md apps/web/src/lib/live/publicCopyGuard.test.ts apps/web/src/lib/provenance/artifactManifest.test.ts docs/evidence
```

Expected: route docs, public guard coverage, and generated projections agree
with the final served file set.

If and only if Git approval is explicit:

```text
git add README.md docs/implementation/giwa-gasok-staging-runbook.md apps/web/src/lib/live/publicCopyGuard.test.ts apps/web/src/lib/provenance/artifactManifest.test.ts docs/evidence
git commit -m "docs(web): document production landing and GIWA demo"
```

Otherwise record `commit skipped by project policy`.

---

### Task 5: Browser QA and Full Local Verification

**Files:**

- Inspect: all files modified in Tasks 1-4
- Do not create committed screenshots unless the user explicitly requests
  evidence artifacts.

**Interfaces:**

- Consumes: complete local implementation.
- Produces: fresh test/build output and verified desktop/mobile page behavior.

- [ ] **Step 1: Run all focused tests together**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingRouting.test.ts src/lib/landing/landingPresentation.test.ts src/lib/landing/landingEvidence.test.ts src/lib/userFlow/giwaDemoPresentation.test.ts src/lib/userFlow/userVisualPolish.test.ts src/lib/userFlow/userPublicBoundary.test.ts src/lib/live/userRouteMapping.test.ts src/lib/live/stagingSmokeScript.test.ts src/lib/live/publicCopyGuard.test.ts src/lib/provenance/artifactManifest.test.ts src/lib/live/lightsailOpsAssets.test.ts
```

Expected: PASS.

- [ ] **Step 2: Start the local static server**

Run:

```text
pnpm --filter @giwa/web dev
```

Expected: the static server reports its local origin and keeps running. Use
the in-app browser for visual checks. Do not use Chrome or Playwright CLI
unless the user explicitly changes browser preference.

- [ ] **Step 3: Verify the production landing visually**

Open `/` in the in-app browser and check at 1440 px, 1024 px, 390 px, and
360 px widths:

- the first viewport shows the headline, both CTAs, and proof surface;
- `데모 체험하기` resolves to `/giwa-demo`;
- the Receipt CTA resolves to a validated Receipt or `/evidence`;
- no GASOK/judge copy, paper slip, rotated Receipt, stamp, yellow poster block,
  sticky-story section, horizontal overflow, clipped text, or console error;
- navigation anchors and mobile menu work with keyboard focus;
- reduced motion preserves all information.

Expected: PASS at each width.

- [ ] **Step 4: Verify the public demo visually**

Open `/giwa-demo` in the in-app browser at 1440 x 900, 1024 x 768, and
390 x 844:

- desktop fits the top bar, four-stage rail, one primary action, and evidence
  area in the viewport;
- the internal evidence area may scroll when its content exceeds the panel,
  but the body does not create a desktop scroll trap;
- 1024 x 768 and mobile use the stacked normal-scroll fallback;
- `제품 소개` returns to `/`;
- `/demo` still displays the operator Control Room;
- `/user` still displays the compatibility live flow;
- no wallet request is triggered merely by loading the page.

Expected: PASS without signing or sending a chain transaction.

- [ ] **Step 5: Check accessible navigation**

Using keyboard only:

1. focus the landing skip link;
2. traverse header navigation and CTAs;
3. enter `/giwa-demo`;
4. focus `제품 소개`, the primary action, help, and Receipt links;
5. confirm visible focus and logical order;
6. confirm status announcements do not repeat the entire page.

Expected: PASS.

- [ ] **Step 6: Run the complete web verification**

Stop the development server, then run:

```text
pnpm --filter @giwa/web test
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
```

Expected: all commands exit 0.

- [ ] **Step 7: Inspect the final diff**

Run:

```text
git status --short
git diff --check
git diff --stat
git diff -- apps/web/public apps/web/scripts apps/web/src/lib/landing apps/web/src/lib/userFlow apps/web/src/lib/live apps/web/src/lib/provenance README.md docs/implementation/giwa-gasok-staging-runbook.md docs/superpowers/specs/2026-07-27-production-landing-giwa-demo-design.md docs/evidence
```

Expected:

- only approved landing/demo, tests, route docs, and generated projections are
  present;
- unrelated user changes remain untouched;
- no secrets, private paths, local SQLite data, `.env` values, operator
  credentials, or raw errors appear;
- no Git staging or deployment occurred.

- [ ] **Step 8: Conditionally create the final commit**

If and only if the user separately authorizes Git staging and commit:

```text
git add apps/web/public/landing.html apps/web/public/landing.css apps/web/public/landing.js apps/web/public/giwa-demo.html apps/web/public/giwa-demo.css apps/web/public/user-flow.js apps/web/scripts/serve-static.mjs apps/web/scripts/serve-live.mjs apps/web/scripts/smoke-staging.mjs apps/web/src/lib/landing apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts apps/web/src/lib/live/userRouteMapping.test.ts apps/web/src/lib/live/stagingSmokeScript.test.ts apps/web/src/lib/live/publicCopyGuard.test.ts apps/web/src/lib/provenance/artifactManifest.test.ts README.md docs/implementation/giwa-gasok-staging-runbook.md docs/superpowers/specs/2026-07-27-production-landing-giwa-demo-design.md docs/evidence
git commit -m "feat(web): add production landing and GIWA demo"
```

Otherwise record `commit skipped by project policy` and leave the verified
working tree unstaged.

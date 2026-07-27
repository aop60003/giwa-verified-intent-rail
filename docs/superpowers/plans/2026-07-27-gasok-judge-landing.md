# GASOK Judge Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Korean-first, Pretendard-based judge landing at `/` that explains and proves the GIWA Sepolia verified-intent flow in about 60 seconds while preserving every existing evaluator and Receipt route.

**Architecture:** Add an isolated dependency-light landing document, stylesheet, and ES module under `apps/web/public/`. Route only `/` to the new document; preserve the former recorded guided flow at `/evidence` and leave `/user`, `/partner`, and `/receipt/[receiptHash]` on their current documents. Load only validated hashes from the existing `flow-data.json`, use `IntersectionObserver` for progressive story state, and keep the HTML useful when font, JavaScript, or artifact loading fails.

**Tech Stack:** Node.js, pnpm 10 workspace, dependency-free HTML/CSS/ES modules, Pretendard Variable v1.3.9 CDN with system fallback, Vitest 4, TypeScript 6, existing static/live Node servers.

---

## Working constraints

- Execute in the current workspace because the user previously chose to continue
  here instead of creating a separate worktree.
- Do not stage, commit, branch, push, deploy, change DNS, change Lightsail, or
  send wallet transactions without separate explicit authorization.
- Every commit step below is conditional. If Git authorization is absent, run
  the diff check, record `commit skipped by project policy`, and continue
  without staging.
- Preserve unrelated dirty-worktree changes.
- Do not edit generated public evidence by hand. Regenerate it with its owning
  command.

## File responsibility map

### New files

- `apps/web/public/landing.html` — semantic judge story, static CTAs, accessible
  content, and progressive-enhancement hooks.
- `apps/web/public/landing.css` — Pretendard visual system, responsive layout,
  sticky desktop story, normal mobile story, focus states, and reduced motion.
- `apps/web/public/landing.js` — strict evidence projection, safe DOM
  hydration, IntersectionObserver state, and mobile navigation.
- `apps/web/src/lib/landing/landingRouting.test.ts` — root/evidence route
  regression and smoke-contract tests.
- `apps/web/src/lib/landing/landingEvidence.test.ts` — executable tests for
  public artifact normalization and fail-closed behavior.
- `apps/web/src/lib/landing/landingPresentation.test.ts` — semantic copy,
  accessibility, visual-token, and claim-boundary source tests.

### Modified files

- `.gitignore` — ignore `.superpowers/` browser brainstorming artifacts.
- `apps/web/scripts/serve-static.mjs` — route `/` to `landing.html` and
  `/evidence` to `index.html`; keep static fallback metadata accurate.
- `apps/web/scripts/serve-live.mjs` — mirror the route split in the live server.
- `apps/web/scripts/smoke-staging.mjs` — smoke both `/` and `/evidence`.
- `apps/web/src/lib/live/stagingSmokeScript.test.ts` — require the new smoke
  surface.
- `apps/web/src/lib/live/publicCopyGuard.test.ts` — scan the new public landing
  files.
- `apps/web/src/lib/provenance/artifactManifest.test.ts` — include the three
  new served assets in the expected public artifact set.
- `README.md` — describe root landing and `/evidence` ownership.
- `docs/implementation/giwa-gasok-staging-runbook.md` — update public route and
  smoke tables.
- `docs/evidence/local-artifact-manifest.json` and coupled local provenance
  reports — regenerate after all public files are final.

## Task 1: Split the root route without losing recorded evidence

**Files:**

- Create: `apps/web/src/lib/landing/landingRouting.test.ts`
- Create: `apps/web/public/landing.html`
- Create: `apps/web/public/landing.css`
- Create: `apps/web/public/landing.js`
- Modify: `.gitignore`
- Modify: `apps/web/scripts/serve-static.mjs`
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/scripts/smoke-staging.mjs`
- Modify: `apps/web/src/lib/live/stagingSmokeScript.test.ts`

- [ ] **Step 1: Write the failing route regression test**

Create `apps/web/src/lib/landing/landingRouting.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("judge landing route ownership", () => {
  it("keeps the landing, recorded evidence, user, partner and receipt documents isolated", () => {
    const staticServer = readWebFile("scripts/serve-static.mjs");
    const liveServer = readWebFile("scripts/serve-live.mjs");

    for (const source of [staticServer, liveServer]) {
      expect(source).toContain('decoded === "/"');
      expect(source).toContain('"/landing.html"');
      expect(source).toContain('decoded === "/evidence"');
      expect(source).toContain('decoded === "/partner"');
      expect(source).toContain('decoded.startsWith("/receipt/")');
      expect(source).toContain('"/index.html"');
      expect(source).toContain('decoded === "/user"');
      expect(source).toContain('"/user.html"');
    }
  });

  it("ships separate landing assets and keeps them dependency-light", () => {
    for (const path of ["public/landing.html", "public/landing.css", "public/landing.js"]) {
      const direct = join(process.cwd(), path);
      const workspace = join(process.cwd(), "apps/web", path);
      expect(existsSync(direct) || existsSync(workspace), path).toBe(true);
    }

    const html = readWebFile("public/landing.html");
    expect(html).toContain('href="/landing.css"');
    expect(html).toContain('src="/landing.js"');
    expect(html).not.toMatch(/react|vue|three\.js|gsap/iu);
  });

  it("smokes the judge landing and recorded evidence as distinct surfaces", () => {
    const smoke = readWebFile("scripts/smoke-staging.mjs");
    expect(smoke).toContain('["/",200,"landing.js"]');
    expect(smoke).toContain('["/evidence",200,"flow.js"]');
  });
});
```

- [ ] **Step 2: Run the route test and verify that it fails**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingRouting.test.ts
```

Expected: FAIL because `landing.html`, `landing.css`, `landing.js`, and the
`/evidence` mapping do not exist.

- [ ] **Step 3: Add the minimal landing shell**

Create `apps/web/public/landing.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="GIWA Sepolia 테스트넷에서 사용자가 확인한 조건과 실제 실행을 대조하고 공개 Receipt를 만드는 검증 흐름."
    />
    <title>GIWA Verified Intent Rail</title>
    <link
      rel="stylesheet"
      as="style"
      crossorigin
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
    />
    <link rel="stylesheet" href="/landing.css" />
  </head>
  <body>
    <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <header class="site-header">
      <a class="wordmark" href="/" aria-label="GIWA Verified Intent Rail 홈">
        GIWA VERIFIED INTENT RAIL
      </a>
      <a class="header-cta" href="/user">LIVE DEMO</a>
    </header>
    <main id="main-content">
      <section class="landing-shell" aria-labelledby="landing-title">
        <p>GIWA SEPOLIA · TESTNET ONLY</p>
        <h1 id="landing-title">확인한 행동만 증거가 됩니다.</h1>
        <p>
          사용자가 확인한 조건과 실제 GIWA Sepolia 실행이 일치할 때만
          공개 Receipt를 만듭니다.
        </p>
        <a href="/user">실제 흐름 실행하기</a>
        <a href="/evidence">기록형 증거 보기</a>
      </section>
    </main>
    <script type="module" src="/landing.js"></script>
  </body>
</html>
```

Create `apps/web/public/landing.css`:

```css
:root {
  color: #171916;
  background: #f4f3ee;
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

body {
  margin: 0;
}

.landing-shell {
  min-height: 80vh;
  padding: 6rem max(1.25rem, 6vw);
}
```

Create `apps/web/public/landing.js`:

```js
export const LANDING_VERSION = "gasok-judge-landing-v1";
```

- [ ] **Step 4: Route only `/` to the new document**

In `apps/web/scripts/serve-static.mjs`, replace the `requested` route
expression with:

```js
const requested =
  decoded === "/"
    ? "/landing.html"
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

Also change the `static-fallback` entry in `staticDemoStatusPayload`:

```js
{
  id: "static-fallback",
  label: "Recorded evidence",
  href: "/evidence",
  state: "available",
  reason: "Recorded evidence remains available without the live local API."
}
```

In `apps/web/scripts/serve-live.mjs`, use the same split while preserving the
existing `/live` and `/demo` branches:

```js
const requested =
  decoded === "/"
    ? "/landing.html"
    : decoded === "/live"
      ? "/live.html"
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

- [ ] **Step 5: Extend staging smoke coverage**

Change the first part of `apps/web/scripts/smoke-staging.mjs` to:

```js
const checks = [
  ["/",200,"landing.js"],
  ["/evidence",200,"flow.js"],
  ["/user",200,"user-flow.js"],
  ["/user/help",200,"user-flow.js"],
  ["/partner",200,"GIWA Verified Intent Rail"],
  ["/healthz",200,"\"ok\":true"],
  ["/readyz",200,"\"ready\":true"],
  ["/api/public/config",200,"\"chainId\":91342"]
];
```

Update `apps/web/src/lib/live/stagingSmokeScript.test.ts` so the test title says
`eight public surfaces` and its `checks` tuple contains the same eight entries.

- [ ] **Step 6: Ignore local visual-companion artifacts**

Append this bounded entry to `.gitignore`:

```gitignore

# Local visual brainstorming artifacts
.superpowers/
```

Run:

```text
git check-ignore .superpowers/brainstorm
```

Expected: `.superpowers/brainstorm` is reported as ignored.

- [ ] **Step 7: Run the focused route and smoke-contract tests**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingRouting.test.ts src/lib/live/stagingSmokeScript.test.ts
```

Expected: PASS.

- [ ] **Step 8: Check the task diff and conditionally commit**

Run:

```text
git diff --check
git diff -- .gitignore apps/web/public/landing.html apps/web/public/landing.css apps/web/public/landing.js apps/web/scripts/serve-static.mjs apps/web/scripts/serve-live.mjs apps/web/scripts/smoke-staging.mjs apps/web/src/lib/landing/landingRouting.test.ts apps/web/src/lib/live/stagingSmokeScript.test.ts
```

Expected: no whitespace errors; the diff contains only the route split, shell,
tests, and ignore rule.

If and only if the user has explicitly authorized Git staging and commit:

```text
git add .gitignore apps/web/public/landing.html apps/web/public/landing.css apps/web/public/landing.js apps/web/scripts/serve-static.mjs apps/web/scripts/serve-live.mjs apps/web/scripts/smoke-staging.mjs apps/web/src/lib/landing/landingRouting.test.ts apps/web/src/lib/live/stagingSmokeScript.test.ts
git commit -m "feat(web): add GASOK landing route"
```

Otherwise do not stage and record `commit skipped by project policy`.

## Task 2: Build the fail-closed recorded evidence adapter

**Files:**

- Create: `apps/web/src/lib/landing/landingEvidence.test.ts`
- Modify: `apps/web/public/landing.js`

- [ ] **Step 1: Write executable evidence-normalization tests**

Create `apps/web/src/lib/landing/landingEvidence.test.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

type LandingModule = {
  normalizeBytes32(value: unknown): string | null;
  projectRecordedEvidence(value: unknown): {
    receiptHash: string;
    receiptHref: string;
    depositTxHash: string;
    explorerHref: string;
  } | null;
  fetchRecordedEvidence(
    fetcher: (input: string, init: { cache: string }) => Promise<{
      ok: boolean;
      json(): Promise<unknown>;
    }>
  ): Promise<unknown>;
};

let landing: LandingModule;

beforeAll(async () => {
  const direct = join(process.cwd(), "public/landing.js");
  const workspace = join(process.cwd(), "apps/web/public/landing.js");
  const path = existsSync(direct) ? direct : workspace;
  landing = (await import(`${pathToFileURL(path).href}?test=${Date.now()}`)) as LandingModule;
});

describe("landing recorded evidence", () => {
  const receiptHash = `0x${"a".repeat(64)}`;
  const depositTxHash = `0x${"b".repeat(64)}`;

  it("normalizes only exact 32-byte hashes", () => {
    expect(landing.normalizeBytes32(receiptHash.toUpperCase().replace("0X", "0x"))).toBe(receiptHash);
    expect(landing.normalizeBytes32("0x1234")).toBeNull();
    expect(landing.normalizeBytes32(null)).toBeNull();
  });

  it("projects only a route-enabled ready Receipt and rebuilds the explorer URL", () => {
    expect(
      landing.projectRecordedEvidence({
        receipt: {
          ready: true,
          routeEnabled: true,
          receiptHash,
          depositTxHash,
          depositExplorerUrl: "https://attacker.invalid/ignored"
        }
      })
    ).toEqual({
      receiptHash,
      receiptHref: `/receipt/${receiptHash}`,
      depositTxHash,
      explorerHref: `https://sepolia-explorer.giwa.io/tx/${depositTxHash}`
    });
  });

  it("fails closed for incomplete or mismatched public artifacts", () => {
    expect(landing.projectRecordedEvidence({ receipt: { ready: false, routeEnabled: true } })).toBeNull();
    expect(
      landing.projectRecordedEvidence({
        receipt: {
          ready: true,
          routeEnabled: true,
          receiptHash: "not-a-hash",
          depositTxHash
        }
      })
    ).toBeNull();
  });

  it("returns null for network, status and JSON failures", async () => {
    await expect(
      landing.fetchRecordedEvidence(async () => ({
        ok: false,
        json: async () => ({})
      }))
    ).resolves.toBeNull();

    await expect(
      landing.fetchRecordedEvidence(async () => {
        throw new Error("offline");
      })
    ).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run the evidence test and verify that it fails**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingEvidence.test.ts
```

Expected: FAIL because the three exported functions do not exist.

- [ ] **Step 3: Implement strict artifact projection**

Replace `apps/web/public/landing.js` with:

```js
const BYTES32_PATTERN = /^0x[a-fA-F0-9]{64}$/u;
const EXPLORER_TX_BASE = "https://sepolia-explorer.giwa.io/tx/";

export function normalizeBytes32(value) {
  return typeof value === "string" && BYTES32_PATTERN.test(value) ? value.toLowerCase() : null;
}

export function shortHash(value) {
  const normalized = normalizeBytes32(value);
  return normalized === null ? null : `${normalized.slice(0, 8)}…${normalized.slice(-6)}`;
}

export function projectRecordedEvidence(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const receipt = value.receipt;
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) return null;
  if (receipt.ready !== true || receipt.routeEnabled !== true) return null;

  const receiptHash = normalizeBytes32(receipt.receiptHash);
  const depositTxHash = normalizeBytes32(receipt.depositTxHash);
  if (receiptHash === null || depositTxHash === null) return null;

  return {
    receiptHash,
    receiptHref: `/receipt/${receiptHash}`,
    depositTxHash,
    explorerHref: `${EXPLORER_TX_BASE}${depositTxHash}`
  };
}

export async function fetchRecordedEvidence(fetcher = fetch) {
  try {
    const response = await fetcher("/flow-data.json", { cache: "no-store" });
    if (!response.ok) return null;
    return projectRecordedEvidence(await response.json());
  } catch {
    return null;
  }
}

export function applyRecordedEvidence(root, evidence) {
  const receiptLinks = root.querySelectorAll("[data-recorded-receipt]");
  const explorerLinks = root.querySelectorAll("[data-recorded-explorer]");
  const receiptValues = root.querySelectorAll("[data-receipt-hash]");
  const txValues = root.querySelectorAll("[data-deposit-hash]");

  if (evidence === null) {
    for (const link of receiptLinks) link.setAttribute("href", "/evidence");
    for (const link of explorerLinks) link.setAttribute("hidden", "");
    return;
  }

  for (const link of receiptLinks) link.setAttribute("href", evidence.receiptHref);
  for (const link of explorerLinks) {
    link.setAttribute("href", evidence.explorerHref);
    link.removeAttribute("hidden");
  }
  for (const value of receiptValues) value.textContent = shortHash(evidence.receiptHash);
  for (const value of txValues) value.textContent = shortHash(evidence.depositTxHash);
}
```

Do not add a startup call yet; Task 5 will initialize evidence and scroll
behavior together.

- [ ] **Step 4: Run the evidence test**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingEvidence.test.ts
```

Expected: PASS.

- [ ] **Step 5: Check the task diff and conditionally commit**

Run:

```text
git diff --check
git diff -- apps/web/public/landing.js apps/web/src/lib/landing/landingEvidence.test.ts
```

If Git authorization exists:

```text
git add apps/web/public/landing.js apps/web/src/lib/landing/landingEvidence.test.ts
git commit -m "feat(web): validate landing evidence"
```

Otherwise do not stage and record `commit skipped by project policy`.

## Task 3: Build the semantic 60-second judge story

**Files:**

- Create: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Modify: `apps/web/public/landing.html`

- [ ] **Step 1: Write the semantic and claim-boundary test**

Create `apps/web/src/lib/landing/landingPresentation.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("GASOK judge landing presentation", () => {
  it("is Korean-first, static-first and keyboard navigable", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain("확인한 행동만");
    expect(html).toContain('href="/user"');
    expect(html).toContain('href="/evidence"');
    expect(html).toContain("TESTNET ONLY");
    expect(html).not.toContain("<form");
  });

  it("contains the complete five-state product story and judge evidence sections", () => {
    const html = readWebFile("public/landing.html");
    for (const step of ["review", "sign", "execute", "verify", "receipt"]) {
      expect(html).toContain(`data-story-step="${step}"`);
      expect(html).toContain(`data-story-frame="${step}"`);
    }
    for (const id of ["problem", "how-it-works", "evidence", "why-giwa", "execution"]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("keeps unsupported claims out and labels the wallet path as next", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain("GIWA Wallet in-app");
    expect(html).toContain("NEXT");
    expect(html).not.toMatch(/instant finality|mainnet ready|real yield|real funds|KYC service|settlement/iu);
  });

  it("provides safe evidence fallbacks before JavaScript runs", () => {
    const html = readWebFile("public/landing.html");
    expect(html).toContain('data-recorded-receipt href="/evidence"');
    expect(html).toContain("data-recorded-explorer");
    expect(html).toContain("기록형 증거 보기");
  });
});
```

- [ ] **Step 2: Run the presentation test and verify that it fails**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingPresentation.test.ts
```

Expected: FAIL because the minimal shell has no story or judge sections.

- [ ] **Step 3: Replace the landing body with the approved content**

Keep the approved `<head>` from Task 1. Replace the `<body>` of
`apps/web/public/landing.html` with the following semantic structure:

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
      <a href="#problem">PRODUCT</a>
      <a href="#how-it-works">HOW IT WORKS</a>
      <a href="#evidence">EVIDENCE</a>
      <a href="#why-giwa">WHY GIWA</a>
    </nav>
    <a class="button button-dark header-cta" href="/user">LIVE DEMO ↗</a>
  </header>

  <main id="main-content">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-slip hero-slip-intent" aria-hidden="true">
        <span>01 / INTENT</span><strong>LOCKED</strong>
      </div>
      <div class="hero-slip hero-slip-wallet" aria-hidden="true">
        <span>02 / WALLET</span><strong>REVIEWED</strong>
      </div>
      <div class="hero-slip hero-slip-receipt" aria-hidden="true">
        <span>04 / RECEIPT</span><strong>PUBLIC</strong>
      </div>

      <div class="hero-copy">
        <p class="status-pill"><span aria-hidden="true"></span>GIWA SEPOLIA · TESTNET ONLY</p>
        <h1 id="hero-title">확인한 행동만<br /><mark>증거</mark>가 됩니다.</h1>
        <p class="hero-description">
          사용자가 확인한 조건과 실제 GIWA Sepolia 실행이 일치할 때만
          누구나 검증할 수 있는 공개 Receipt를 만듭니다.
        </p>
        <div class="hero-actions">
          <a class="button button-dark" href="/user">실제 흐름 실행하기</a>
          <a class="button button-light" data-recorded-receipt href="/evidence">
            검증 결과 보기
          </a>
        </div>
      </div>

      <ul class="hero-proof-list" aria-label="검증 흐름">
        <li><span>01</span>Intent terms locked</li>
        <li><span>02</span>Wallet review</li>
        <li><span>03</span>Standard RPC match</li>
        <li><span>04</span>Public Receipt</li>
      </ul>
    </section>

    <section id="problem" class="section problem-section" aria-labelledby="problem-title">
      <p class="section-index">01 / THE GAP</p>
      <div>
        <h2 id="problem-title">클릭은 참여를 보여줍니다.<br />일치는 실행을 증명합니다.</h2>
        <p>
          GIWA Verified Intent Rail은 서명된 Manifest 범위의 테스트넷 행동이
          block-confirmed transaction evidence와 일치했는지 확인합니다.
        </p>
      </div>
      <div class="comparison" aria-label="기존 지표와 검증 증거 비교">
        <article><small>BEFORE</small><strong>참여 버튼을 눌렀다</strong></article>
        <span aria-hidden="true">→</span>
        <article class="comparison-result">
          <small>WITH THE RAIL</small>
          <strong>정해진 조건으로 실행됐다</strong>
        </article>
      </div>
    </section>

    <section id="how-it-works" class="story-section" aria-labelledby="story-title">
      <header class="section-heading">
        <p class="section-index">02 / PRODUCT</p>
        <h2 id="story-title">한 번의 스크롤이<br />하나의 Receipt를 완성합니다.</h2>
      </header>

      <div class="story-layout" data-story-root data-active-step="review">
        <div class="story-copy">
          <article class="story-step" data-story-step="review">
            <p>01 / REVIEW</p>
            <h3>서명 전에 조건을 확인합니다.</h3>
            <p>네트워크, 대상, 수량, spender, exact allowance를 먼저 잠급니다.</p>
          </article>
          <article class="story-step" data-story-step="sign">
            <p>02 / SIGN</p>
            <h3>Manifest를 지갑에 연결합니다.</h3>
            <p>연결된 계정과 Intent hash가 같은 실행 문맥을 가리킵니다.</p>
          </article>
          <article class="story-step" data-story-step="execute">
            <p>03 / EXECUTE</p>
            <h3>테스트넷 행동은 지갑이 실행합니다.</h3>
            <p>필요한 경우 exact approval 후 mock vault deposit을 전송합니다.</p>
          </article>
          <article class="story-step" data-story-step="verify">
            <p>04 / VERIFY</p>
            <h3>Standard RPC 증거를 대조합니다.</h3>
            <p>transaction, receipt, block, confirmation depth를 Manifest와 비교합니다.</p>
          </article>
          <article class="story-step" data-story-step="receipt">
            <p>05 / RECEIPT</p>
            <h3>일치한 실행만 공개됩니다.</h3>
            <p>matched 결정 이후에만 공유 가능한 Receipt hash를 만듭니다.</p>
          </article>
        </div>

        <div class="story-stage" aria-hidden="true">
          <div class="product-window">
            <div class="product-window-bar">
              <span>GIWA VERIFIED INTENT RAIL / LIVE</span>
              <span>CHAIN 91342</span>
            </div>
            <div class="story-frame" data-story-frame="review">
              <small>INTENT MANIFEST</small><h3>Review exact terms</h3>
              <dl><div><dt>NETWORK</dt><dd>GIWA Sepolia</dd></div><div><dt>AMOUNT</dt><dd>1 mock asset</dd></div><div><dt>ALLOWANCE</dt><dd>Exact only</dd></div></dl>
            </div>
            <div class="story-frame" data-story-frame="sign">
              <small>WALLET-BOUND INTENT</small><h3>Terms ready to sign</h3>
              <dl><div><dt>ACCOUNT</dt><dd>0xf3a7…9476</dd></div><div><dt>INTENT</dt><dd>0x3592…c7a4</dd></div><div><dt>EXPIRY</dt><dd>Bounded</dd></div></dl>
            </div>
            <div class="story-frame" data-story-frame="execute">
              <small>GIWA SEPOLIA</small><h3>Wallet execution</h3>
              <dl><div><dt>APPROVE</dt><dd>Exact amount</dd></div><div><dt>DEPOSIT</dt><dd>Mock vault</dd></div><div><dt>SIGNER</dt><dd>User wallet</dd></div></dl>
            </div>
            <div class="story-frame" data-story-frame="verify">
              <small>STANDARD RPC</small><h3>Evidence matched</h3>
              <dl><div><dt>CHAIN ID</dt><dd>Matched</dd></div><div><dt>TARGET</dt><dd>Matched</dd></div><div><dt>AMOUNT</dt><dd>Matched</dd></div></dl>
            </div>
            <div class="story-frame receipt-frame" data-story-frame="receipt">
              <small>PUBLIC RECEIPT</small><h3 data-receipt-hash>검증된 예시</h3>
              <dl><div><dt>STATUS</dt><dd>MATCHED</dd></div><div><dt>DEPOSIT TX</dt><dd data-deposit-hash>기록형 증거</dd></div><div><dt>NETWORK</dt><dd>GIWA Sepolia</dd></div></dl>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="evidence" class="section evidence-section" aria-labelledby="evidence-title">
      <p class="section-index">03 / DETERMINISTIC MATCH</p>
      <div>
        <h2 id="evidence-title">주장이 아니라<br />필드 단위로 대조합니다.</h2>
        <p>Manifest와 block-confirmed Standard RPC evidence를 같은 줄에서 확인합니다.</p>
      </div>
      <div class="match-table" role="table" aria-label="Manifest와 transaction evidence 비교">
        <div role="row"><span role="cell">CHAIN ID</span><strong role="cell">91342</strong><span role="cell">MATCHED</span></div>
        <div role="row"><span role="cell">TARGET</span><strong role="cell">Mock vault</strong><span role="cell">MATCHED</span></div>
        <div role="row"><span role="cell">ACTION</span><strong role="cell">Deposit selector</strong><span role="cell">MATCHED</span></div>
        <div role="row"><span role="cell">AMOUNT</span><strong role="cell">Exact value</strong><span role="cell">MATCHED</span></div>
      </div>
    </section>

    <section class="receipt-section" aria-labelledby="receipt-title">
      <div class="receipt-object">
        <small>GIWA VERIFIED INTENT RAIL</small>
        <h3 id="receipt-title">MANIFEST MATCHED</h3>
        <dl>
          <div><dt>RECEIPT</dt><dd data-receipt-hash>검증된 예시</dd></div>
          <div><dt>DEPOSIT</dt><dd data-deposit-hash>기록형 증거</dd></div>
          <div><dt>NETWORK</dt><dd>GIWA SEPOLIA</dd></div>
        </dl>
        <strong class="receipt-stamp">MATCHED</strong>
      </div>
      <div class="receipt-copy">
        <p class="section-index">04 / PUBLIC EVIDENCE</p>
        <h2>직접 열어보고<br />직접 대조하세요.</h2>
        <div class="stacked-actions">
          <a class="button button-light" data-recorded-receipt href="/evidence">기록형 Receipt 열기</a>
          <a class="button button-light" data-recorded-explorer href="/evidence" hidden>GIWA Explorer에서 확인</a>
          <a class="button button-light" href="/evidence">전체 증거 흐름 보기</a>
        </div>
      </div>
    </section>

    <section id="why-giwa" class="section giwa-section" aria-labelledby="giwa-title">
      <p class="section-index">05 / WHY GIWA</p>
      <div><h2 id="giwa-title">GIWA 위에서<br />작동해야 하는 이유.</h2></div>
      <div class="giwa-grid">
        <article><small>NOW</small><h3>GIWA Sepolia</h3><p>Chain ID 91342에서 실제 mock action을 실행합니다.</p></article>
        <article><small>NOW</small><h3>Standard RPC</h3><p>누구나 다시 읽을 수 있는 transaction evidence를 사용합니다.</p></article>
        <article><small>NEXT</small><h3>GIWA Wallet in-app</h3><p>Action preview와 Receipt handoff를 지갑 안으로 연결합니다.</p></article>
      </div>
    </section>

    <section id="execution" class="execution-section" aria-labelledby="execution-title">
      <div>
        <p class="section-index">06 / SHIPPED</p>
        <h2 id="execution-title">선발을 위한 아이디어가 아니라,<br />이미 실행된 테스트넷 흐름입니다.</h2>
      </div>
      <ul>
        <li>Public HTTPS application</li>
        <li>Fresh-wallet GIWA Sepolia rehearsal</li>
        <li>Deterministic verifier</li>
        <li>Matched-only public Receipt</li>
        <li>Recorded static fallback</li>
      </ul>
      <p>
        첫 대상은 클릭 수가 아니라 조건과 일치한 온체인 실행 증거가 필요한
        테스트넷 캠페인과 퀘스트입니다.
      </p>
    </section>

    <section class="final-cta" aria-labelledby="final-title">
      <p>TESTNET ONLY · MOCK ASSET · GIWA SEPOLIA</p>
      <h2 id="final-title">이제 직접 실행하고<br />증거를 확인하세요.</h2>
      <div class="hero-actions">
        <a class="button button-dark" href="/user">LIVE FLOW 실행</a>
        <a class="button button-light" data-recorded-receipt href="/evidence">VERIFIED EXAMPLE</a>
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

- [ ] **Step 4: Run the presentation and route tests**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingPresentation.test.ts src/lib/landing/landingRouting.test.ts
```

Expected: PASS.

- [ ] **Step 5: Check the task diff and conditionally commit**

Run:

```text
git diff --check
git diff -- apps/web/public/landing.html apps/web/src/lib/landing/landingPresentation.test.ts
```

If Git authorization exists:

```text
git add apps/web/public/landing.html apps/web/src/lib/landing/landingPresentation.test.ts
git commit -m "feat(web): add judge landing narrative"
```

Otherwise do not stage and record `commit skipped by project policy`.

## Task 4: Implement the Pretendard visual system and responsive layout

**Files:**

- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Modify: `apps/web/public/landing.css`

- [ ] **Step 1: Extend the failing presentation test for visual constraints**

Append this test:

```ts
it("uses the approved Pretendard, paper, responsive and reduced-motion system", () => {
  const css = readWebFile("public/landing.css");
  expect(css).toContain('"Pretendard Variable"');
  expect(css).toContain("--paper: #f4f3ee");
  expect(css).toContain("--verified: #1e684f");
  expect(css).toContain("position: sticky");
  expect(css).toContain("@media (max-width: 760px)");
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  expect(css).toContain(":focus-visible");
  expect(css).toContain("overflow-wrap: anywhere");
  expect(css).not.toMatch(/backdrop-filter|linear-gradient|radial-gradient/iu);
});
```

- [ ] **Step 2: Run the presentation test and verify that it fails**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingPresentation.test.ts
```

Expected: FAIL because the minimal stylesheet lacks the approved layout and
motion guards.

- [ ] **Step 3: Replace `landing.css` with the production stylesheet**

Implement these exact foundations first:

```css
:root {
  --paper: #f4f3ee;
  --paper-raised: #fffefa;
  --ink: #171916;
  --muted: #6e736b;
  --rule: #c5c9c0;
  --verified: #1e684f;
  --highlight: #b9ead1;
  --marker: #f0d76f;
  color: var(--ink);
  background: var(--paper);
  font-family:
    "Pretendard Variable",
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    system-ui,
    sans-serif;
  font-synthesis: none;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-width: 320px;
  overflow-x: hidden;
  font-size: 16px;
  line-height: 1.6;
}

a {
  color: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

:focus-visible {
  outline: 3px solid var(--verified);
  outline-offset: 4px;
}

.skip-link {
  position: fixed;
  z-index: 100;
  left: 1rem;
  top: 1rem;
  padding: 0.75rem 1rem;
  color: white;
  background: var(--ink);
  transform: translateY(-180%);
}

.skip-link:focus {
  transform: translateY(0);
}
```

Implement the header and button system:

```css
.site-header {
  position: relative;
  z-index: 30;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 4.5rem;
  padding: 0 2rem;
  border-bottom: 1px solid var(--rule);
  background: color-mix(in srgb, var(--paper) 94%, transparent);
}

.wordmark,
.site-menu a,
.header-cta,
.menu-toggle,
.section-index,
.status-pill {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
}

.site-menu {
  display: flex;
  gap: 1.75rem;
}

.header-cta {
  justify-self: end;
}

.menu-toggle {
  display: none;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.9rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ink);
  border-radius: 0.25rem;
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
}

.button-dark {
  color: white;
  background: var(--ink);
}

.button-light {
  color: var(--ink);
  background: transparent;
}
```

Implement the hero and paper slips:

```css
.hero {
  position: relative;
  display: grid;
  place-items: center;
  min-height: min(52rem, calc(100svh - 4.5rem));
  padding: 6rem 5vw 3rem;
  overflow: hidden;
}

.hero-copy {
  position: relative;
  z-index: 3;
  max-width: 62rem;
  text-align: center;
}

.hero h1,
.section h2,
.story-section h2,
.receipt-section h2,
.execution-section h2,
.final-cta h2 {
  margin: 0;
  font-weight: 650;
  line-height: 0.94;
  letter-spacing: -0.065em;
  word-break: keep-all;
}

.hero h1 {
  font-size: clamp(3.6rem, 8.7vw, 7.5rem);
}

.hero mark {
  color: inherit;
  background: linear-gradient(transparent 70%, var(--highlight) 0);
}

.hero-description {
  max-width: 38rem;
  margin: 1.75rem auto 0;
  color: var(--muted);
  word-break: keep-all;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.65rem;
  margin-top: 1.75rem;
}

.hero-slip {
  position: absolute;
  z-index: 1;
  width: 11.5rem;
  padding: 0.9rem;
  border: 1px solid #aeb3aa;
  background: var(--paper-raised);
  box-shadow: 0.35rem 0.4rem 0 rgb(23 25 22 / 8%);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.65rem;
}

.hero-slip span,
.hero-slip strong {
  display: block;
}

.hero-slip-intent {
  left: 5vw;
  top: 27%;
  transform: rotate(-4deg);
}

.hero-slip-wallet {
  right: 5vw;
  top: 21%;
  transform: rotate(4deg);
}

.hero-slip-receipt {
  right: 10vw;
  bottom: 10%;
  transform: rotate(-2deg);
}

.hero-proof-list {
  position: absolute;
  left: 5vw;
  right: 5vw;
  bottom: 2rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--rule);
}

.hero-proof-list li {
  padding: 0.9rem 0;
  color: var(--muted);
  font-size: 0.75rem;
}

.hero-proof-list span {
  margin-right: 0.55rem;
  color: var(--verified);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

Implement shared sections and the story:

```css
.section,
.receipt-section,
.execution-section {
  display: grid;
  grid-template-columns: 8rem minmax(15rem, 0.8fr) minmax(22rem, 1.2fr);
  gap: clamp(1.5rem, 4vw, 5rem);
  padding: clamp(5rem, 10vw, 9rem) max(1.25rem, 6vw);
  border-top: 1px solid var(--rule);
}

.section h2,
.receipt-section h2,
.execution-section h2,
.final-cta h2,
.story-section h2 {
  font-size: clamp(2.6rem, 5.6vw, 5.4rem);
}

.section-index {
  color: var(--verified);
}

.comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
}

.comparison article,
.giwa-grid article {
  min-height: 10rem;
  padding: 1.25rem;
  border: 1px solid var(--rule);
  background: var(--paper-raised);
}

.comparison-result {
  border-color: var(--verified) !important;
}

.story-section {
  padding: clamp(5rem, 10vw, 9rem) max(1.25rem, 6vw);
  border-top: 1px solid var(--rule);
  background: var(--ink);
  color: #f2f4ef;
}

.section-heading {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 5rem);
  margin-bottom: 5rem;
}

.story-layout {
  display: grid;
  grid-template-columns: minmax(17rem, 0.72fr) minmax(28rem, 1.28fr);
  gap: clamp(2rem, 6vw, 7rem);
}

.story-step {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 72vh;
  color: #aeb7af;
}

.story-step h3 {
  margin: 0.75rem 0;
  color: #f2f4ef;
  font-size: clamp(2rem, 3.5vw, 3.6rem);
  line-height: 1;
  letter-spacing: -0.05em;
  word-break: keep-all;
}

.story-stage {
  position: sticky;
  top: 5.5rem;
  align-self: start;
  min-width: 0;
}

.product-window {
  min-height: 34rem;
  padding: 0.9rem;
  color: var(--ink);
  background: #e9ebe5;
  border-radius: 0.5rem;
}

.product-window-bar {
  display: flex;
  justify-content: space-between;
  padding: 0.45rem 0.3rem 1rem;
  color: var(--muted);
  font: 700 0.62rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.story-frame {
  display: none;
  min-height: 29rem;
  padding: clamp(1.5rem, 4vw, 3rem);
  border: 1px solid var(--rule);
  border-radius: 0.3rem;
  background: var(--paper-raised);
}

[data-active-step="review"] [data-story-frame="review"],
[data-active-step="sign"] [data-story-frame="sign"],
[data-active-step="execute"] [data-story-frame="execute"],
[data-active-step="verify"] [data-story-frame="verify"],
[data-active-step="receipt"] [data-story-frame="receipt"] {
  display: block;
}

.story-frame h3 {
  margin: 0.75rem 0 2rem;
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 1;
  letter-spacing: -0.055em;
}

.story-frame dl,
.receipt-object dl {
  margin: 0;
}

.story-frame dl div,
.receipt-object dl div {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--rule);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
}

.story-frame dt,
.story-frame dd,
.receipt-object dt,
.receipt-object dd {
  margin: 0;
  overflow-wrap: anywhere;
}
```

Implement the evidence, GIWA, execution, and CTA layouts:

```css
.match-table {
  border-top: 1px solid var(--ink);
}

.match-table [role="row"] {
  display: grid;
  grid-template-columns: 1fr 1.4fr 0.7fr;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--rule);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
}

.match-table [role="row"] span:last-child {
  color: var(--verified);
  font-weight: 700;
}

.receipt-section {
  color: #f2f4ef;
  background: var(--ink);
}

.receipt-object {
  grid-column: 1 / 3;
  max-width: 31rem;
  padding: clamp(1.5rem, 4vw, 3rem);
  color: var(--ink);
  background: var(--paper-raised);
  transform: rotate(-1deg);
}

.receipt-stamp {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.65rem;
  color: var(--verified);
  border: 2px solid var(--verified);
  border-radius: 50%;
  transform: rotate(-7deg);
}

.stacked-actions {
  display: grid;
  gap: 0.65rem;
  margin-top: 2rem;
}

.receipt-section .button-light {
  color: #f2f4ef;
  border-color: #f2f4ef;
}

.giwa-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.giwa-grid small {
  color: var(--verified);
  font: 700 0.65rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.execution-section {
  grid-template-columns: minmax(18rem, 1.2fr) minmax(14rem, 0.8fr) minmax(14rem, 0.8fr);
  background: var(--marker);
}

.execution-section ul {
  margin: 0;
  padding-left: 1.2rem;
}

.final-cta {
  display: grid;
  place-items: center;
  min-height: 44rem;
  padding: 6rem 1.25rem;
  text-align: center;
  border-top: 1px solid var(--rule);
}

.site-footer {
  display: flex;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--rule);
  font: 700 0.65rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

Implement responsive and reduced-motion rules:

```css
@media (max-width: 980px) {
  .site-header {
    grid-template-columns: 1fr auto auto;
    gap: 0.75rem;
  }

  .menu-toggle {
    display: inline-flex;
    min-width: 2.75rem;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--rule);
    background: transparent;
  }

  .site-menu {
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    display: none;
    padding: 1.25rem 2rem;
    border-bottom: 1px solid var(--rule);
    background: var(--paper);
  }

  .site-menu[data-open="true"] {
    display: grid;
    gap: 1rem;
  }

  .section,
  .receipt-section,
  .execution-section {
    grid-template-columns: 5rem 1fr;
  }

  .comparison,
  .match-table,
  .giwa-grid,
  .execution-section > p,
  .execution-section > ul,
  .receipt-copy {
    grid-column: 2;
  }

  .story-layout {
    grid-template-columns: minmax(14rem, 0.72fr) minmax(23rem, 1.28fr);
  }
}

@media (max-width: 760px) {
  .site-header {
    min-height: 4rem;
    padding: 0 1rem;
  }

  .wordmark {
    max-width: 12rem;
  }

  .header-cta {
    display: none;
  }

  .hero {
    min-height: 43rem;
    padding: 5rem 1.25rem 9rem;
  }

  .hero-slip {
    width: 9rem;
    opacity: 0.34;
  }

  .hero-slip-receipt {
    display: none;
  }

  .hero-proof-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .section,
  .receipt-section,
  .execution-section,
  .section-heading {
    grid-template-columns: 1fr;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .comparison,
  .match-table,
  .giwa-grid,
  .execution-section > p,
  .execution-section > ul,
  .receipt-copy,
  .receipt-object {
    grid-column: 1;
  }

  .comparison,
  .giwa-grid {
    grid-template-columns: 1fr;
  }

  .story-layout {
    display: block;
  }

  .story-step {
    min-height: auto;
    padding: 4rem 0;
    border-top: 1px solid rgb(255 255 255 / 18%);
  }

  .story-stage {
    display: none;
  }

  .site-footer {
    display: grid;
    gap: 0.75rem;
    padding: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .hero-slip,
  .receipt-object,
  .receipt-stamp {
    transform: none;
  }
}
```

The approved design prohibits gradients, but `mark` above uses a
`linear-gradient` solely as a text underline. Replace that declaration before
running the test with a pseudo-element implementation so the final stylesheet
contains no gradient:

```css
.hero mark {
  position: relative;
  z-index: 0;
  color: inherit;
  background: transparent;
}

.hero mark::after {
  content: "";
  position: absolute;
  z-index: -1;
  left: -0.04em;
  right: -0.06em;
  bottom: 0.04em;
  height: 0.2em;
  background: var(--highlight);
  transform: rotate(-1deg);
}
```

- [ ] **Step 4: Run presentation tests**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingPresentation.test.ts
```

Expected: PASS, including the no-gradient and reduced-motion checks.

- [ ] **Step 5: Check the task diff and conditionally commit**

Run:

```text
git diff --check
git diff -- apps/web/public/landing.css apps/web/src/lib/landing/landingPresentation.test.ts
```

If Git authorization exists:

```text
git add apps/web/public/landing.css apps/web/src/lib/landing/landingPresentation.test.ts
git commit -m "feat(web): style GASOK judge landing"
```

Otherwise do not stage and record `commit skipped by project policy`.

## Task 5: Add bounded scroll state, evidence hydration, and mobile navigation

**Files:**

- Modify: `apps/web/src/lib/landing/landingEvidence.test.ts`
- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Modify: `apps/web/public/landing.js`

- [ ] **Step 1: Add failing behavior tests**

Add this type member to `LandingModule` in
`apps/web/src/lib/landing/landingEvidence.test.ts`:

```ts
chooseActiveStoryStep(
  values: Array<{ id: string; ratio: number }>,
  fallback: string
): string;
```

Append:

```ts
it("selects the most visible known story step and keeps a safe fallback", () => {
  expect(
    landing.chooseActiveStoryStep(
      [
        { id: "review", ratio: 0.2 },
        { id: "verify", ratio: 0.72 },
        { id: "receipt", ratio: 0.4 }
      ],
      "review"
    )
  ).toBe("verify");
  expect(landing.chooseActiveStoryStep([], "sign")).toBe("sign");
  expect(landing.chooseActiveStoryStep([{ id: "unknown", ratio: 1 }], "review")).toBe("review");
});
```

Append to `apps/web/src/lib/landing/landingPresentation.test.ts`:

```ts
it("uses bounded browser APIs without scroll handlers or unsafe HTML sinks", () => {
  const source = readWebFile("public/landing.js");
  expect(source).toContain("IntersectionObserver");
  expect(source).toContain("DOMContentLoaded");
  expect(source).toContain("querySelectorAll");
  expect(source).toContain("textContent");
  expect(source).toContain('setAttribute("aria-expanded"');
  expect(source).not.toContain("innerHTML");
  expect(source).not.toMatch(/addEventListener\\([\"']scroll/iu);
  expect(source).not.toMatch(/ethereum\\.request|eth_sendTransaction|wallet_switchEthereumChain/iu);
});
```

- [ ] **Step 2: Run focused tests and verify that they fail**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingEvidence.test.ts src/lib/landing/landingPresentation.test.ts
```

Expected: FAIL because `chooseActiveStoryStep`, startup, observer, and menu
behavior are missing.

- [ ] **Step 3: Add the story selector**

Append after `projectRecordedEvidence` in `apps/web/public/landing.js`:

```js
const STORY_STEPS = new Set(["review", "sign", "execute", "verify", "receipt"]);

export function chooseActiveStoryStep(values, fallback = "review") {
  const safeFallback = STORY_STEPS.has(fallback) ? fallback : "review";
  let selected = safeFallback;
  let selectedRatio = -1;

  for (const value of values) {
    if (
      value === null ||
      typeof value !== "object" ||
      !STORY_STEPS.has(value.id) ||
      typeof value.ratio !== "number" ||
      !Number.isFinite(value.ratio) ||
      value.ratio < 0
    ) {
      continue;
    }
    if (value.ratio > selectedRatio) {
      selected = value.id;
      selectedRatio = value.ratio;
    }
  }
  return selected;
}
```

- [ ] **Step 4: Add IntersectionObserver and accessible menu initialization**

Append to `apps/web/public/landing.js`:

```js
export function setupStory(rootDocument = document) {
  const storyRoot = rootDocument.querySelector("[data-story-root]");
  const steps = Array.from(rootDocument.querySelectorAll("[data-story-step]"));
  if (!storyRoot || steps.length === 0 || typeof IntersectionObserver !== "function") return;

  const ratios = new Map(steps.map((step) => [step.dataset.storyStep, 0]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.dataset.storyStep;
        if (STORY_STEPS.has(id)) ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      const active = chooseActiveStoryStep(
        Array.from(ratios, ([id, ratio]) => ({ id, ratio })),
        storyRoot.dataset.activeStep
      );
      storyRoot.dataset.activeStep = active;
      for (const step of steps) {
        if (step.dataset.storyStep === active) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      }
    },
    { rootMargin: "-22% 0px -38% 0px", threshold: [0, 0.2, 0.4, 0.6, 0.8] }
  );

  for (const step of steps) observer.observe(step);
}

export function setupMenu(rootDocument = document) {
  const toggle = rootDocument.querySelector("[data-menu-toggle]");
  const menu = rootDocument.querySelector("[data-menu]");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    menu.dataset.open = open ? "true" : "false";
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) setOpen(false);
  });
  rootDocument.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

export async function initLanding(rootDocument = document) {
  setupMenu(rootDocument);
  setupStory(rootDocument);
  const evidence = await fetchRecordedEvidence();
  applyRecordedEvidence(rootDocument, evidence);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void initLanding(document);
    }, { once: true });
  } else {
    void initLanding(document);
  }
}
```

The landing must continue to render all copy and `/user` links if
`IntersectionObserver`, fetch, or the font fails.

- [ ] **Step 5: Run behavior, evidence, and presentation tests**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/landing/landingEvidence.test.ts src/lib/landing/landingPresentation.test.ts
```

Expected: PASS.

- [ ] **Step 6: Check the task diff and conditionally commit**

Run:

```text
git diff --check
git diff -- apps/web/public/landing.js apps/web/src/lib/landing/landingEvidence.test.ts apps/web/src/lib/landing/landingPresentation.test.ts
```

If Git authorization exists:

```text
git add apps/web/public/landing.js apps/web/src/lib/landing/landingEvidence.test.ts apps/web/src/lib/landing/landingPresentation.test.ts
git commit -m "feat(web): animate verified intent story"
```

Otherwise do not stage and record `commit skipped by project policy`.

## Task 6: Extend public-copy and provenance coverage

**Files:**

- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`
- Modify: `apps/web/src/lib/provenance/artifactManifest.test.ts`

- [ ] **Step 1: Write failing coverage expectations**

In `apps/web/src/lib/live/publicCopyGuard.test.ts`, add these entries to
`publicFiles`:

```ts
"public/landing.html",
"public/landing.css",
"public/landing.js",
```

In `apps/web/src/lib/provenance/artifactManifest.test.ts`, add these sorted
entries to `currentPublicPaths`:

```ts
"apps/web/public/landing.css",
"apps/web/public/landing.html",
"apps/web/public/landing.js",
```

Before changing the production manifest generation, run the tests so the new
landing copy is scanned and the expected public artifact set is explicit.

- [ ] **Step 2: Run public copy and provenance tests**

Run:

```text
pnpm --filter @giwa/web test -- src/lib/live/publicCopyGuard.test.ts src/lib/provenance/artifactManifest.test.ts
```

Expected: PASS when the landing contains no forbidden claims and the expected
path list is correctly sorted. If the copy guard fails, change the landing copy;
do not weaken the forbidden-claim pattern.

- [ ] **Step 3: Run the public artifact safe scan**

Run:

```text
pnpm --filter @giwa/web artifact:scan
```

Expected: exit code 0 and no secret, local-runtime, unsupported-claim, or unsafe
URL findings caused by the landing files.

- [ ] **Step 4: Check the task diff and conditionally commit**

Run:

```text
git diff --check
git diff -- apps/web/src/lib/live/publicCopyGuard.test.ts apps/web/src/lib/provenance/artifactManifest.test.ts
```

If Git authorization exists:

```text
git add apps/web/src/lib/live/publicCopyGuard.test.ts apps/web/src/lib/provenance/artifactManifest.test.ts
git commit -m "test(web): cover landing public artifacts"
```

Otherwise do not stage and record `commit skipped by project policy`.

## Task 7: Update route documentation and regenerate local evidence

**Files:**

- Modify: `README.md`
- Modify: `docs/implementation/giwa-gasok-staging-runbook.md`
- Regenerate: `docs/evidence/local-artifact-manifest.json`
- Regenerate: `docs/evidence/local-command-evidence-report.json`
- Regenerate: `docs/evidence/local-provenance-report.json`
- Regenerate: `docs/evidence/local-provenance-report.json.sha256`
- Regenerate: `docs/evidence/local-provenance-verification.json`

- [ ] **Step 1: Update README route ownership**

Replace the public route ownership rows near the top of `README.md` with:

```markdown
| Route | Owner | Failure behavior |
| --- | --- | --- |
| `/`, `/evidence`, `/demo`, `/partner`, `/receipt/*` | static service on `127.0.0.1:4176` | judge landing and recorded evidence remain available |
| `/user*` | live service on `127.0.0.1:4177` | recorded static user fallback |
| `/api/*`, `/healthz`, `/readyz` | live service on `127.0.0.1:4177` | bounded `503`; never proxy to static |
```

Add these local route examples beside the existing action and Receipt URLs:

```text
Judge landing:    http://127.0.0.1:4176/
Recorded evidence:http://127.0.0.1:4176/evidence
```

State that `/` is presentation-first and `/evidence` preserves the recorded
guided technical projection. Do not change historical sprint records.

- [ ] **Step 2: Update staging runbook route and smoke tables**

In `docs/implementation/giwa-gasok-staging-runbook.md`, change static ownership
rows from `/`, `/demo`, `/partner` to:

```markdown
| `/`, `/evidence`, `/demo`, `/partner`, `/receipt/*` | static `127.0.0.1:4176` | landing and recorded evidence 유지 |
```

Change the smoke sentence to require eight routes:

```text
`/`, `/evidence`, `/user`, `/user/help`, `/partner`, `/healthz`, `/readyz`,
`/api/public/config` 여덟 route가 모두 `pass`여야 한다.
```

Keep wallet approval and deployment instructions unchanged.

- [ ] **Step 3: Run documentation and full web tests before regeneration**

Run:

```text
pnpm --filter @giwa/web test
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
```

Expected: all web tests pass, TypeScript reports no errors, and the web build
completes.

- [ ] **Step 4: Regenerate coupled local evidence**

Run the owning command:

```text
pnpm --filter @giwa/web artifact:local
pnpm --filter @giwa/web artifact:provenance:verify
```

Expected:

- the manifest contains `landing.html`, `landing.css`, and `landing.js`;
- safe scans pass;
- the SHA-256 sidecar matches the regenerated provenance report;
- the report remains `local-advisory` and does not claim protected CI or release
  authority.

- [ ] **Step 5: Check documentation and generated diffs**

Run:

```text
git diff --check
git diff -- README.md docs/implementation/giwa-gasok-staging-runbook.md docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-report.json.sha256 docs/evidence/local-provenance-verification.json
```

Expected: only route documentation and regenerated evidence change; no `.env`,
SQLite, local wallet, or `.superpowers` path appears.

- [ ] **Step 6: Conditionally commit documentation and generated evidence**

If Git authorization exists:

```text
git add README.md docs/implementation/giwa-gasok-staging-runbook.md docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-report.json.sha256 docs/evidence/local-provenance-verification.json
git commit -m "docs: route judges through GASOK landing"
```

Otherwise do not stage and record `commit skipped by project policy`.

## Task 8: Perform local HTTP and browser verification

**Files:**

- Verify only; modify failing files in their owning task if a regression is
  found.

- [ ] **Step 1: Start the static server**

Run in the established local terminal:

```text
pnpm --filter @giwa/web dev
```

Expected: the server announces `http://127.0.0.1:4176`.

- [ ] **Step 2: Verify root and preserved routes over HTTP**

In a second PowerShell terminal run:

```powershell
$landingResponse = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/
$evidenceResponse = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/evidence
$userResponse = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/user
$receiptResponse = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4176/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503
[pscustomobject]@{
  Landing = $landingResponse.StatusCode -eq 200 -and $landingResponse.Content.Contains('landing.js')
  Evidence = $evidenceResponse.StatusCode -eq 200 -and $evidenceResponse.Content.Contains('flow.js')
  User = $userResponse.StatusCode -eq 200 -and $userResponse.Content.Contains('user-flow.js')
  Receipt = $receiptResponse.StatusCode -eq 200 -and $receiptResponse.Content.Contains('flow.js')
}
```

Expected: all four properties are `True`.

- [ ] **Step 3: Verify the page visually at desktop width**

Open `http://127.0.0.1:4176/` in the available browser at approximately
1440×900. Confirm:

- first viewport shows the exact Korean headline, testnet badge, `/user` CTA,
  and evidence CTA;
- Pretendard loads and fallback does not change layout materially;
- paper slips do not overlap the headline or controls;
- story frames change in the order Review, Sign, Execute, Verify, Receipt;
- Receipt and explorer links use validated recorded hashes;
- there is no horizontal overflow or console error.

- [ ] **Step 4: Verify tablet, mobile, keyboard, and reduced motion**

Check at 1024×768 and 390×844:

- the mobile menu opens, closes after link activation, and closes on Escape;
- all touch targets remain usable;
- sticky behavior becomes a normal readable mobile sequence;
- long hashes wrap without widening the page;
- Tab reaches skip link, menu, live CTA, evidence CTA, Receipt, explorer, and
  final CTA in semantic order;
- with reduced motion enabled, all information remains visible and no
  transition is required to understand the page.

- [ ] **Step 5: Verify artifact failure fallback**

Temporarily block the `flow-data.json` request in the browser or load
`landing.html` in a context where the request returns non-200. Confirm:

- headline, explanatory copy, and `/user` CTA remain visible;
- evidence links fall back to `/evidence`;
- explorer link stays hidden;
- no raw error appears.

Do not edit or delete `flow-data.json` for this check.

- [ ] **Step 6: Run the final fresh verification set**

Run:

```text
pnpm --filter @giwa/web test
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
pnpm --filter @giwa/web artifact:scan
pnpm --filter @giwa/web artifact:provenance:verify
git diff --check
git status --short
```

Expected:

- all web tests pass;
- type check and build pass;
- artifact scan and local provenance verification pass;
- `.superpowers/` is absent from `git status`;
- only intended landing, route, test, documentation, and regenerated evidence
  files are changed.

- [ ] **Step 7: Run live staging smoke only through the established secure environment**

Start `dev:live` using the existing secure runtime mechanism without printing
or copying `.env` values. Then run:

```powershell
$env:GIWA_SMOKE_BASE_URL = "http://127.0.0.1:4177/"
pnpm --filter @giwa/web smoke:staging
Remove-Item Env:GIWA_SMOKE_BASE_URL
```

Expected: eight `pass` lines for `/`, `/evidence`, `/user`, `/user/help`,
`/partner`, `/healthz`, `/readyz`, and `/api/public/config`.

If the secure live runtime is unavailable, do not fabricate this result. Report
that the static HTTP and full build were verified and that live staging smoke
remains pending.

- [ ] **Step 8: Prepare the implementation handoff**

Report:

- files created and modified;
- exact focused and full commands that passed;
- browser widths and states checked;
- whether live staging smoke ran;
- that no deployment, DNS, Lightsail, Git publication, or wallet transaction
  occurred;
- any pre-existing or unrelated failure separately.

Do not claim completion until the final commands have been run after the last
code change.

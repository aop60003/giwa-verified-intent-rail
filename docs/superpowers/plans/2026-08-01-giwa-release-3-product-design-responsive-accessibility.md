# GIWA Release 3 Product Design and Responsive Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one shared `GIWA Protocol Dossier` presentation system to the participant, Matched Receipt, Campaign Studio, and Proof Ledger surfaces while preserving every Release 1 and Release 2 trust, privacy, replay, and evidence-integrity boundary.

**Architecture:** Keep the dependency-light static application and its existing route/data modules. Add one browser-global presentation primitive for the shared shell and approved line icons, consume it from both `user-flow.js` and `flow.js`, and keep route-specific content in its current owner. Self-host Pretendard, harden interaction sizing and disclosure behavior in `styles.css`, then verify source contracts plus live browser reflow at the four approved viewports.

**Tech Stack:** Browser DOM APIs, dependency-light JavaScript, CSS, local Pretendard WOFF2, Vitest, TypeScript 6, pnpm 10.

## Global Constraints

- Public name remains `GIWA Verified Intent Rail`; `Loop Rail` is not introduced into product copy.
- GIWA Sepolia testnet and mock-asset limits remain visible; no production funds, yield, RWA, settlement, KYC, security, or finality claims.
- Release 1 and Release 2 public/private authority boundaries and evidence projections are not changed.
- No new runtime framework or UI dependency is added.
- Do not approximate the GIWA brand mark. Continue with the text brand until an approved source asset exists.
- Icons use one vendored Lucide line-icon subset with its license; emoji, text-symbol status marks, CSS-drawn icons, and approximate brand marks are prohibited.
- Pretendard is served locally with preload and `font-display: swap`; no remote font request remains in public HTML.
- Interactive targets are at least `44px`; body copy is `16px` where it carries instructions or outcomes; supporting copy is never below `12px`.
- No horizontal page overflow at `320px`; routes and utilities become one column at `360px` and below; `200%` zoom must reflow without clipping.
- `prefers-reduced-motion` must render terminal states immediately.
- Do not stage, commit, branch, push, deploy, or perform wallet/chain transactions without separate user direction.

---

## File Map

### Create

- `apps/web/public/protocol-dossier.js` — shared shell, three-step semantic progression, destination navigation, and Lucide-derived inline SVG factory.
- `apps/web/public/fonts/pretendard-giwa-subset.woff2` — local Pretendard 1.3.9 regular subset.
- `apps/web/public/fonts/pretendard-giwa-semibold-subset.woff2` — local Pretendard 1.3.9 semibold subset.
- `apps/web/public/fonts/pretendard-giwa-bold-subset.woff2` — local Pretendard 1.3.9 bold subset.
- `apps/web/public/fonts/pretendard.css` — local `@font-face` declaration with `font-display: swap`.
- `apps/web/public/fonts/OFL.txt` — Pretendard license text.
- `apps/web/public/icons/LUCIDE-LICENSE` — Lucide license for the copied line paths.
- `apps/web/src/lib/userFlow/protocolDossierPresentation.test.ts` — shared shell, font, icon, interaction-target, and copy-contract tests.
- `docs/implementation/giwa-release-3-local-completion-freeze.md` — local-only completion boundary and remaining Git/deployment gates.

### Modify

- `apps/web/public/user.html` — preload the local font and load `protocol-dossier.js` before `user-flow.js`.
- `apps/web/public/index.html` — preload the local font and load `protocol-dossier.js` before the module `flow.js`.
- `apps/web/public/user-flow.js` — consume the shared shell and line icons; remove text-symbol status marks; preserve participant state behavior.
- `apps/web/public/flow.js` — consume the shared shell on Receipt, Campaign Studio, and Proof Ledger routes; align action hierarchy and disclosure labeling.
- `apps/web/public/styles.css` — shared dossier tokens, 44px targets, disclosure focus/chevrons, hash disclosure, responsive and reduced-motion behavior.
- `apps/web/src/lib/userFlow/userVisualPolish.test.ts` — replace remote-font and text-symbol assertions with Release 3 contracts.
- `apps/web/src/lib/userFlow/userProtocolConsolePresentation.test.ts` — assert shared shell use and semantic step state.
- `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts` — assert shared Receipt shell and first action group.
- `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts` — assert Campaign handoff explanation and shared shell.
- `apps/web/src/lib/flow/publicEvidencePresentation.test.ts` — assert Proof explanation-first hierarchy and shared shell.
- `README.md` — route later local evolution to Release 4 only after Release 3 verification passes.

---

### Task 1: Lock the Release 3 Presentation Contract

**Files:**
- Create: `apps/web/src/lib/userFlow/protocolDossierPresentation.test.ts`
- Modify: `apps/web/src/lib/userFlow/userVisualPolish.test.ts`
- Test: `apps/web/src/lib/userFlow/protocolDossierPresentation.test.ts`

**Interfaces:**
- Consumes: static HTML, JavaScript, CSS, and font assets under `apps/web/public/`.
- Produces: failing source-contract tests that define the exact shared-shell, font, icon, target-size, and responsive requirements used by Tasks 2–5.

- [ ] **Step 1: Add the failing shared presentation tests**

Create the test with these exact contracts:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("GIWA Protocol Dossier presentation contract", () => {
  it("loads one shared shell before both route runtimes", () => {
    const userHtml = readWebFile("public/user.html");
    const indexHtml = readWebFile("public/index.html");
    expect(userHtml).toContain('<script src="/protocol-dossier.js"></script>');
    expect(indexHtml).toContain('<script src="/protocol-dossier.js"></script>');
    expect(userHtml.indexOf('/protocol-dossier.js')).toBeLessThan(
      userHtml.indexOf('/user-flow.js')
    );
    expect(indexHtml.indexOf('/protocol-dossier.js')).toBeLessThan(
      indexHtml.indexOf('/flow.js')
    );
  });

  it("keeps the shell semantic and testnet-bounded", () => {
    const shell = readWebFile("public/protocol-dossier.js");
    expect(shell).toContain("GIWA Verified Intent Rail");
    expect(shell).toContain("GIWA Sepolia · Testnet");
    expect(shell).toContain("조건 확인");
    expect(shell).toContain("지갑 실행");
    expect(shell).toContain("결과 공개");
    expect(shell).toContain('aria-label", "검증 여정"');
    expect(shell).not.toMatch(/Loop Rail|mainnet|finality|settlement/iu);
  });

  it("self-hosts Pretendard with preload and swap", () => {
    const userHtml = readWebFile("public/user.html");
    const indexHtml = readWebFile("public/index.html");
    const fontCss = readWebFile("public/fonts/pretendard.css");
    for (const html of [userHtml, indexHtml]) {
      expect(html).toContain('rel="preload"');
      expect(html).toContain('/fonts/pretendard-giwa-subset.woff2');
      expect(html).not.toContain("cdn.jsdelivr.net");
    }
    expect(fontCss).toContain("font-display: swap");
    expect(fontCss).toContain("format(\"woff2\")");
  });

  it("uses one line-icon factory instead of text status symbols", () => {
    const shell = readWebFile("public/protocol-dossier.js");
    const userFlow = readWebFile("public/user-flow.js");
    expect(shell).toContain("createLineIcon");
    expect(shell).toContain("check");
    expect(shell).toContain("clock-3");
    expect(shell).toContain("triangle-alert");
    expect(shell).toContain("chevron-down");
    expect(userFlow).not.toContain('return "✓"');
    expect(userFlow).not.toContain('return "→"');
  });

  it("enforces responsive, focus, target, and reduced-motion guards", () => {
    const css = readWebFile("public/styles.css");
    expect(css).toContain("--protocol-target: 44px");
    expect(css).toContain("min-height: var(--protocol-target)");
    expect(css).toContain("@media (max-width: 360px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain(".hash-disclosure");
    expect(css).not.toContain("min-width: 320px");
  });
});
```

- [ ] **Step 2: Update the existing visual-polish test expectations**

Replace the remote-font assertion with:

```ts
expect(html).toContain('/fonts/pretendard-giwa-subset.woff2');
expect(html).toContain('/fonts/pretendard.css');
expect(html).not.toContain('cdn.jsdelivr.net');
```

- [ ] **Step 3: Run the focused tests and confirm the new contract fails**

Run:

```powershell
pnpm --filter @giwa/web test -- protocolDossierPresentation userVisualPolish
```

Expected: FAIL because `protocol-dossier.js`, local font assets, and the new CSS contracts do not yet exist.

---

### Task 2: Add the Shared Dossier Shell, Local Font, and Line Icons

**Files:**
- Create: `apps/web/public/protocol-dossier.js`
- Create: `apps/web/public/fonts/pretendard-giwa-subset.woff2`
- Create: `apps/web/public/fonts/pretendard.css`
- Create: `apps/web/public/fonts/OFL.txt`
- Create: `apps/web/public/icons/LUCIDE-LICENSE`
- Modify: `apps/web/public/user.html`
- Modify: `apps/web/public/index.html`
- Modify: `apps/web/public/styles.css`
- Test: `apps/web/src/lib/userFlow/protocolDossierPresentation.test.ts`

**Interfaces:**
- Produces: `globalThis.GiwaProtocolDossier.createHeader(document, options)` and `globalThis.GiwaProtocolDossier.createLineIcon(document, name, options)`.
- `createHeader` options: `{ activeView: "mission" | "execution" | "receipt" | "campaign" | "proof", walletLabel?: string, walletInteractive?: boolean }`.
- `createLineIcon` options: `{ label?: string, size?: number }`; it returns an SVG element using only vendored Lucide paths.

- [ ] **Step 1: Implement the shared browser-global module**

Create an IIFE that exposes a frozen API and uses real SVG elements:

```js
(function installProtocolDossier(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = Object.freeze({
    check: [["path", { d: "m9 12 2 2 4-4" }], ["path", { d: "M21 12a9 9 0 1 1-5.3-8.2" }]],
    "clock-3": [["circle", { cx: "12", cy: "12", r: "9" }], ["path", { d: "M12 7v5h3" }]],
    "triangle-alert": [["path", { d: "m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" }], ["path", { d: "M12 9v4" }], ["path", { d: "M12 17h.01" }]],
    "chevron-down": [["path", { d: "m6 9 6 6 6-6" }]],
    wallet: [["path", { d: "M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" }], ["path", { d: "M16 13h2" }]],
    "external-link": [["path", { d: "M15 3h6v6" }], ["path", { d: "M10 14 21 3" }], ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }]]
  });

  function createLineIcon(documentRef, name, options = {}) {
    if (!Object.prototype.hasOwnProperty.call(ICONS, name)) {
      throw new Error(`unknown_protocol_icon:${name}`);
    }
    const svg = documentRef.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(options.size ?? 18));
    svg.setAttribute("height", String(options.size ?? 18));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("protocol-line-icon");
    if (options.label) {
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", options.label);
    } else {
      svg.setAttribute("aria-hidden", "true");
    }
    for (const [tag, attributes] of ICONS[name]) {
      const child = documentRef.createElementNS(SVG_NS, tag);
      for (const [key, value] of Object.entries(attributes)) {
        child.setAttribute(key, value);
      }
      svg.append(child);
    }
    return svg;
  }

  function element(documentRef, tag, className, text) {
    const node = documentRef.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createHeader(documentRef, options) {
    const header = element(documentRef, "header", "protocol-product-bar protocol-dossier-shell");
    const brand = element(documentRef, "a", "protocol-brand", "GIWA Verified Intent Rail");
    brand.href = "/";
    const journey = element(documentRef, "ol", "protocol-view-nav");
    journey.setAttribute("aria-label", "검증 여정");
    const steps = [["mission", "조건 확인"], ["execution", "지갑 실행"], ["receipt", "결과 공개"]];
    for (const [id, label] of steps) {
      const item = element(documentRef, "li", id === options.activeView ? "is-active" : "", label);
      if (id === options.activeView) item.setAttribute("aria-current", "step");
      journey.append(item);
    }
    const destinations = element(documentRef, "nav", "protocol-destinations");
    destinations.setAttribute("aria-label", "공개 증거 화면");
    for (const [href, label] of [["/partner", "Campaign"], ["/evidence", "Proof"]]) {
      const link = element(documentRef, "a", "protocol-destination", label);
      link.href = href;
      destinations.append(link);
    }
    const meta = element(documentRef, "div", "protocol-bar-meta");
    meta.append(
      element(documentRef, "span", "protocol-network", "GIWA Sepolia · Testnet"),
      element(documentRef, "span", "protocol-wallet", options.walletLabel ?? "지갑 미연결")
    );
    header.append(brand, journey, destinations, meta);
    return header;
  }

  global.GiwaProtocolDossier = Object.freeze({ createHeader, createLineIcon });
})(globalThis);
```

- [ ] **Step 2: Vendor the font subsets and licenses**

Download the official Pretendard 1.3.9 static Korean subsets and copy the OFL license:

```powershell
$release3FontDir = 'apps/web/public/fonts'
New-Item -ItemType Directory -Force -Path $release3FontDir, 'apps/web/public/icons' | Out-Null
curl.exe -L --fail --output "$release3FontDir/pretendard-giwa-subset.woff2" 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2-subset/Pretendard-Regular.subset.woff2'
curl.exe -L --fail --output "$release3FontDir/pretendard-giwa-semibold-subset.woff2" 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2-subset/Pretendard-SemiBold.subset.woff2'
curl.exe -L --fail --output "$release3FontDir/pretendard-giwa-bold-subset.woff2" 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2-subset/Pretendard-Bold.subset.woff2'
curl.exe -L --fail --output 'apps/web/public/fonts/OFL.txt' 'https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/LICENSE'
curl.exe -L --fail --output 'apps/web/public/icons/LUCIDE-LICENSE' 'https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE'
```

Expected: the WOFF2 begins with `wOF2`; both license files are non-empty.

- [ ] **Step 3: Add the local font stylesheet**

```css
@font-face {
  font-family: "Pretendard Variable";
  src: url("/fonts/pretendard-giwa-subset.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
```

- [ ] **Step 4: Replace both remote font links and load the shared script**

In `user.html` and `index.html`, use:

```html
<link rel="preload" href="/fonts/pretendard-giwa-subset.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/fonts/pretendard.css" />
<link rel="stylesheet" href="/styles.css" />
```

Before each route runtime, add:

```html
<script src="/protocol-dossier.js"></script>
```

- [ ] **Step 5: Add shared shell and interaction tokens**

Add exact root tokens and reusable rules:

```css
:root {
  --protocol-target: 44px;
  --protocol-focus: #0078a6;
  --protocol-text: #161814;
  --protocol-muted: #596461;
  --protocol-rule: #d7dedc;
  --protocol-surface: #ffffff;
}

.protocol-dossier-shell a,
.protocol-dossier-shell button,
.verification-bundle-disclosure > summary,
.hash-disclosure > summary {
  min-height: var(--protocol-target);
}

.protocol-line-icon {
  flex: 0 0 auto;
  pointer-events: none;
}

.protocol-destinations {
  display: flex;
  gap: 8px;
}

.protocol-destination {
  display: inline-flex;
  align-items: center;
  padding-inline: 12px;
  color: var(--protocol-muted);
  text-decoration: none;
}
```

- [ ] **Step 6: Run the focused contract test**

Run:

```powershell
pnpm --filter @giwa/web test -- protocolDossierPresentation
```

Expected: PASS.

---

### Task 3: Integrate the Participant, Execution, and Matched Receipt Surfaces

**Files:**
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/src/lib/userFlow/userProtocolConsolePresentation.test.ts`
- Modify: `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`
- Test: `apps/web/src/lib/userFlow/userProtocolConsolePresentation.test.ts`
- Test: `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`

**Interfaces:**
- Consumes: `GiwaProtocolDossier.createHeader` and `createLineIcon` from Task 2.
- Preserves: `nextPrimaryAction`, wallet readiness, approval-required/skipped state, verifier polling, matched-only receipt publication, and public Receipt route behavior.
- Produces: consistent semantic shell, text+icon+color states, accessible hash disclosures, and first-group Campaign/Proof actions.

- [ ] **Step 1: Add failing participant and Receipt assertions**

Add source-contract assertions:

```ts
expect(source).toContain("GiwaProtocolDossier.createHeader");
expect(source).toContain("const protocolViews");
expect(source).toContain("activeView: protocolViews.has(activeView)");
expect(source).toContain("GiwaProtocolDossier.createLineIcon");
expect(source).toContain('className: "hash-disclosure"');
expect(source).not.toContain('return "✓"');
expect(source).not.toContain('return "→"');
```

In the public Receipt route test, assert the first meaningful action group contains `/partner?receipt=` and `/evidence?receipt=` before technical disclosures.

- [ ] **Step 2: Replace the local top bar builder**

Implement:

```js
function renderProtocolTopBar(activeView) {
  return globalThis.GiwaProtocolDossier.createHeader(document, {
    activeView,
    walletLabel:
      walletState.account === null ? "지갑 미연결" : shortHash(walletState.account)
  });
}
```

- [ ] **Step 3: Replace text-symbol state marks with line icons**

Change the state projection to return icon names and Korean labels:

```js
function journeyStatePresentation(state) {
  if (state === "complete") return { icon: "check", label: "완료" };
  if (state === "active") return { icon: "clock-3", label: "진행 중" };
  if (state === "blocked") return { icon: "triangle-alert", label: "확인 필요" };
  return { icon: "clock-3", label: "대기" };
}
```

Append the icon with `aria-hidden="true"` and keep the visible text label. Do not replace the text label with icon-only status.

- [ ] **Step 4: Add accessible full-hash disclosure**

For long hashes that are visually truncated, render:

```js
function renderHashDisclosure(label, value) {
  return view("details", { className: "hash-disclosure" }, [
    view("summary", {}, [
      view("span", { text: label }),
      view("span", { className: "mono hash-visual", text: shortHash(value) }),
      globalThis.GiwaProtocolDossier.createLineIcon(document, "chevron-down")
    ]),
    view("code", { className: "mono hash-full", text: value ?? "확인 중" })
  ]);
}
```

- [ ] **Step 5: Keep the primary action and safety boundary in the first viewport**

Use layout rules that keep the mission cockpit action visible at `1366×768` without hiding content:

```css
@media (min-width: 960px) and (max-height: 800px) {
  .protocol-mission {
    min-height: calc(100vh - 64px);
    padding-block: 24px;
  }

  .mission-cockpit {
    padding: 18px;
  }

  .mission-condition-row {
    min-height: 38px;
  }
}
```

- [ ] **Step 6: Run participant and Receipt tests**

Run:

```powershell
pnpm --filter @giwa/web test -- userProtocolConsolePresentation livePublicReceiptRoute userVisualPolish
```

Expected: PASS with wallet and receipt behavior unchanged.

---

### Task 4: Integrate Campaign Studio and Proof Ledger Hierarchy

**Files:**
- Modify: `apps/web/public/flow.js`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`
- Modify: `apps/web/src/lib/flow/publicEvidencePresentation.test.ts`
- Test: `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`
- Test: `apps/web/src/lib/flow/publicEvidencePresentation.test.ts`

**Interfaces:**
- Consumes: the shared shell and line-icon API from Task 2.
- Preserves: public-safe Campaign projections, exact-hash lookup, negative control, bundle download, replay command, and no-capability/no-session public boundary.
- Produces: explanation-first selected-Receipt handoff and consistent action hierarchy.

- [ ] **Step 1: Add failing Campaign and Proof assertions**

Add:

```ts
expect(source).toContain("GiwaProtocolDossier.createHeader");
expect(source).toContain('activeView: "campaign"');
expect(source).toContain('activeView: "proof"');
expect(source).toContain("이 Receipt가 Campaign evidence에 반영된 방식");
expect(source).toContain("Manifest → GIWA 실행 → Match → Receipt");
expect(source).toContain("hash-disclosure");
```

- [ ] **Step 2: Add the shared header to each public route**

Implement:

```js
function renderProtocolHeader(activeView) {
  return globalThis.GiwaProtocolDossier.createHeader(document, {
    activeView,
    walletLabel: "공개 읽기 전용"
  });
}
```

Prepend it exactly once in `renderReceiptRoute`, `renderPublicCampaignStudio`, and `renderPublicEvidenceSearch`.

- [ ] **Step 3: Make Campaign handoff explanation-first**

The selected Receipt panel begins with:

```js
el("div", { className: "campaign-receipt-explanation" }, [
  el("p", { className: "eyebrow", text: "Selected Receipt" }),
  el("h2", { text: "이 Receipt가 Campaign evidence에 반영된 방식" }),
  el("p", {
    text: "Manifest와 일치한 GIWA Sepolia 실행만 참여·제출·Matched Receipt 지표에 포함됩니다."
  })
])
```

Place the Proof Ledger row link after this explanation and before raw hashes.

- [ ] **Step 4: Make Proof explanation-first**

The Proof page begins with:

```js
el("div", { className: "proof-chain-intro" }, [
  el("p", { className: "eyebrow", text: "Verification chain" }),
  el("h1", { text: "Manifest → GIWA 실행 → Match → Receipt" }),
  el("p", {
    className: "lead",
    text: "서명된 조건과 확인된 테스트넷 트랜잭션을 대조한 뒤, 일치한 Receipt만 공개합니다."
  })
])
```

Then show exact lookup, matched row, bundle download, Explorer, participant Receipt, and public Receipt actions in that order.

- [ ] **Step 5: Standardize disclosure controls**

Every evidence `details > summary` receives a visible Lucide chevron, a `44px` focus surface, and an expanded-state rotation:

```css
.verification-bundle-disclosure > summary,
.hash-disclosure > summary {
  min-height: var(--protocol-target);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

details[open] > summary .protocol-line-icon {
  transform: rotate(180deg);
}
```

With reduced motion, the rotation transition is removed.

- [ ] **Step 6: Run public surface tests**

Run:

```powershell
pnpm --filter @giwa/web test -- publicCampaignStudioPresentation publicEvidencePresentation livePublicReceiptRoute
```

Expected: PASS with public evidence boundary assertions unchanged.

---

### Task 5: Complete Responsive and Accessibility Verification

**Files:**
- Modify: `apps/web/public/styles.css`
- Modify: `README.md`
- Create: `docs/implementation/giwa-release-3-local-completion-freeze.md`
- Test: all affected web presentation tests

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: verified local Release 3 presentation, browser QA evidence, and an explicit no-deployment completion record.

- [ ] **Step 1: Add the final mobile and zoom rules**

```css
@media (max-width: 360px) {
  .protocol-dossier-shell,
  .protocol-destinations,
  .protocol-primary-actions,
  .receipt-artifact-utilities,
  .receipt-next-participation,
  .proof-ledger-links {
    grid-template-columns: 1fr;
  }

  .protocol-dossier-shell {
    position: relative;
    display: grid;
    height: auto;
    padding: 12px;
  }

  .protocol-destinations,
  .protocol-bar-meta {
    width: 100%;
  }
}

.hash-full {
  display: block;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

@media (prefers-reduced-motion: reduce) {
  .protocol-line-icon,
  .matched-receipt-seal,
  .receipt-artifact {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: Run focused and full local checks**

Run in order:

```powershell
pnpm --filter @giwa/web test -- protocolDossierPresentation userVisualPolish userProtocolConsolePresentation livePublicReceiptRoute publicCampaignStudioPresentation publicEvidencePresentation
pnpm --filter @giwa/web test
pnpm typecheck
pnpm test
pnpm build
```

Expected: every command exits `0`.

- [ ] **Step 3: Start the static application for browser QA**

Run:

```powershell
pnpm --filter @giwa/web dev
```

Open `/user`, one recorded `/user/receipt/:hash`, `/partner`, and `/evidence` only on localhost. Do not perform a wallet or chain transaction.

- [ ] **Step 4: Verify the four required browser viewports**

At `320×720`, `390×844`, `1366×768`, and `1440×1024`, inspect each route and record:

```js
({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  overflowFree: document.documentElement.scrollWidth <= document.documentElement.clientWidth
})
```

Expected: `overflowFree: true` on all four routes at all four viewports. At `1366×768`, the mission primary action and testnet/mock limitation are visible without scrolling.

- [ ] **Step 5: Verify keyboard, zoom, and reduced motion**

- Tab order starts at the brand, follows the three-step progression destinations, then reaches the route's primary action before technical disclosures.
- Every focused link, button, input, and summary has a visible focus ring.
- At browser zoom `200%`, content reflows without clipped text or horizontal page scrolling.
- With reduced motion enabled, Receipt and disclosure states appear immediately and remain readable.
- Long hashes show a truncated summary and reveal the complete value through the accessible disclosure.

- [ ] **Step 6: Write the local completion freeze**

Record exact commands and observed results. The document must include:

```markdown
Release 3 is locally complete for presentation and responsive accessibility only.
No Git integration, deployment, DNS/HTTPS change, wallet transaction, chain transaction, mainnet integration, or production claim is implied.
Release 1 and Release 2 trust, privacy, replay, and evidence-integrity boundaries remain authoritative.
```

- [ ] **Step 7: Update README routing only after all checks pass**

Replace the current Release 3 next-work paragraph with a link to the Release 3 freeze and route later local product evolution to a separately reviewed Release 4 plan. Keep the GASOK staging/deployment gate unchanged.

- [ ] **Step 8: Inspect the final diff**

Run:

```powershell
git diff --check
git status --short
git diff -- apps/web/public apps/web/src/lib/userFlow apps/web/src/lib/flow apps/web/src/lib/partner README.md docs/implementation/giwa-release-3-local-completion-freeze.md
```

Expected: no whitespace errors, no remote font URL, no secret/runtime evidence, and no unrelated file changes.

---

## Plan Self-Review

- **Spec coverage:** Shared shell, mission, execution, Receipt, Campaign, Proof, 320px/360px/200% zoom, 44px targets, focus-visible, reduced motion, self-hosted Pretendard, line icons, hash disclosure, and four browser viewports each have an owning task.
- **Boundary coverage:** No task changes authentication, persistence, API authority, verification decisions, public evidence contents, contract state, deployment, or wallet transactions.
- **Type/interface consistency:** Both route runtimes consume the same `GiwaProtocolDossier.createHeader` and `createLineIcon` signatures defined in Task 2.
- **Placeholder scan:** The plan contains no unresolved placeholder, deferred implementation marker, or unspecified error-handling step.
- **Scope check:** Release 4 multi-tenancy, wallet authentication, campaign mutation, new action templates, and receipt anchoring remain excluded.

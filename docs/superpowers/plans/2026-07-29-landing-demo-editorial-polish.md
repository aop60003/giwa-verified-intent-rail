# Landing and GIWA Demo Editorial Polish Implementation Plan

> **For agentic workers:** Execute inline in this task. Do not dispatch
> subagents. Track every behavior change with a red-green test cycle.

**Goal:** Apply the approved editorial-proof typography, copy, border, GIWA
layout, and demo-surface improvements without changing runtime behavior.

**Architecture:** Keep the dependency-light static application. Treat
`landing.html` and `user-flow.js` as content sources, while `landing.css` and
`giwa-demo.css` own presentation overrides. Existing Vitest source-contract
tests protect the public copy and responsive structure.

**Tech Stack:** HTML, CSS, browser JavaScript, TypeScript, Vitest, pnpm.

## Global Constraints

- Public product name remains `GIWA Verified Intent Rail`.
- Testnet scope and current verifier semantics remain unchanged.
- Pretendard is the product face; monospace is limited to evidence data.
- No gradients, new dependencies, routes, wallet behavior, or deployment.
- Git staging and commits are intentionally excluded because the user has not
  authorized Git mutations.

---

### Task 1: Add the presentation contracts

**Files:**

- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Modify: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`

- [ ] Assert the new hero, CTA, verification, GIWA `NOW / NEXT`, and final CTA
  copy.
- [ ] Assert `.giwa-now`, `.giwa-next`, and a dark full-width GIWA treatment.
- [ ] Assert navigation and narrative labels no longer inherit the global
  monospace group.
- [ ] Assert the demo headline, summary copy, flat evidence surface, document
  overflow, and quiet product link.
- [ ] Run:
  `pnpm --filter @giwa/web test -- landingPresentation giwaDemoPresentation`
  and confirm the new assertions fail because the implementation is absent.

### Task 2: Rewrite landing copy and GIWA structure

**Files:**

- Modify: `apps/web/public/landing.html`

- [ ] Replace the hero, problem, verification, use-case, scope, and final CTA
  sentences with the exact approved Korean copy from the design spec.
- [ ] Keep technical nouns only where they improve precision: Manifest,
  Standard RPC, Receipt, GIWA Sepolia.
- [ ] Replace the equal three-card `.giwa-list` with:

```html
<div class="giwa-path">
  <div class="giwa-now">...</div>
  <article class="giwa-next">...</article>
</div>
```

- [ ] Keep all existing anchors, data attributes, route targets, ARIA labels,
  and receipt bindings.

### Task 3: Apply the editorial-proof landing system

**Files:**

- Modify: `apps/web/public/landing.css`

- [ ] Add 10–12px control radii, a softer primary-button lift, and a text-like
  secondary action on mobile.
- [ ] Remove navigation, section index, and explanatory labels from the broad
  monospace selector; keep monospace on proof objects and machine data.
- [ ] Remove narrative section borders and replace equal card grids with tonal
  groups and spacing.
- [ ] Style `.giwa-section` as the single dark rhythm break and `.giwa-path` as
  an asymmetric `NOW / NEXT` composition.
- [ ] Keep proof frames sharp and add one restrained active-proof shadow.
- [ ] Preserve sticky scroll behavior, reduced motion, focus visibility, and
  320px mobile support.

### Task 4: Flatten and rewrite the judge demo

**Files:**

- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/giwa-demo.css`

- [ ] Replace the demo headline, lead, product link, summary title, and expected
  steps with the approved copy.
- [ ] Use CSS overrides scoped to `.giwa-demo-shell` so shared user, partner,
  and receipt routes are unaffected.
- [ ] Convert summary cards and expected steps into divided rows inside one
  evidence surface.
- [ ] Remove independent desktop scrolling from `.giwa-demo-evidence`.
- [ ] Keep one primary action, existing state classes, live announcements,
  small-screen stacking, and short-viewport fallback.

### Task 5: Verify behavior and visual output

**Files:**

- Inspect: all modified files and the final diff

- [ ] Re-run the focused presentation tests and confirm zero failures.
- [ ] Run `pnpm --filter @giwa/web test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Start the local static server, inspect `/` and `/giwa-demo` in the in-app
  browser at desktop and mobile widths, and fix clipping, overlap, typography,
  focus, or overflow regressions.
- [ ] Confirm production was not deployed and report deployment as the next
  explicit user decision.

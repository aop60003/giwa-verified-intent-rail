# Main Landing Proof Clarity Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the root landing prove what is compared and state the mismatch outcome without changing verifier, Receipt, wallet, chain, or deployment behavior.

**Architecture:** Keep the existing dependency-free landing and recorded-evidence adapter. Change only the static proof-ledger markup, its responsive presentation, and the focused presentation test; the live verifier already gates public Receipts to matched decisions.

**Tech Stack:** Semantic HTML, CSS, TypeScript, Vitest.

## Global Constraints

- Public product name remains `GIWA Verified Intent Rail`.
- The experience remains GIWA Sepolia testnet-only.
- The ledger compares `FIELD | MANIFEST | ON-CHAIN | RESULT`.
- State the rule exactly: `한 필드라도 다르면 Receipt를 발행하지 않습니다.`
- Do not change `/giwa-demo`, verifier logic, wallet logic, contracts, APIs, runtime data, infrastructure, or deployment.
- Do not stage or commit.

---

### Task 1: Lock the proof contract

**Files:**
- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Test: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**
- Consumes: static `public/landing.html` and `public/landing.css`.
- Produces: a presentation contract for a four-column comparison and explicit mismatch rule.

- [x] **Step 1: Add the failing semantic assertions**

```ts
it("shows both sides of every proof comparison and the mismatch rule", () => {
  const html = readWebFile("public/landing.html");
  expect(html).toContain('role="columnheader">MANIFEST');
  expect(html).toContain('role="columnheader">ON-CHAIN');
  expect(html).toContain('class="ledger-rule"');
  expect(html).toContain("한 필드라도 다르면 Receipt를 발행하지 않습니다.");
  expect(html.match(/class="ledger-manifest"/gu)).toHaveLength(4);
  expect(html.match(/class="ledger-onchain"/gu)).toHaveLength(4);
});
```

- [x] **Step 2: Add the failing responsive-layout assertions**

```ts
expect(css).toContain(
  "grid-template-columns: minmax(78px, 0.55fr) minmax(118px, 1fr) minmax(118px, 1fr) auto"
);
expect(css).toContain(".ledger-manifest::before");
expect(css).toContain(".ledger-onchain::before");
```

- [x] **Step 3: Verify RED**

Run:

```text
pnpm --filter @giwa/web test -- landingPresentation
```

Expected: FAIL because the `MANIFEST` and `ON-CHAIN` columns, rule, paired cell classes, and mobile labels do not exist.

### Task 2: Implement the comparison ledger

**Files:**
- Modify: `apps/web/public/landing.html`
- Modify: `apps/web/public/landing.css`
- Test: `apps/web/src/lib/landing/landingPresentation.test.ts`

**Interfaces:**
- Consumes: the existing proof-ledger structure and `data-receipt-hash`.
- Produces: an accessible four-column comparison on desktop and labeled paired values on mobile.

- [x] **Step 1: Replace `SIGNED VALUE` with separate comparison columns**

Each of the four rows renders:

```html
<span role="cell">NETWORK</span>
<strong class="ledger-manifest" role="cell">GIWA Sepolia</strong>
<strong class="ledger-onchain" role="cell">GIWA Sepolia</strong>
<em role="cell">MATCHED</em>
```

- [x] **Step 2: Add the explicit mismatch rule**

Place this between the table and public Receipt footer:

```html
<p class="ledger-rule">
  <span>ISSUE RULE</span>
  한 필드라도 다르면 Receipt를 발행하지 않습니다.
</p>
```

- [x] **Step 3: Implement responsive CSS**

Use four aligned columns above `760px`. Below `760px`, render the field and result on the first line, stack Manifest and On-chain values below, and expose `MANIFEST` and `ON-CHAIN` through pseudo-labels.

- [x] **Step 4: Verify GREEN**

Run:

```text
pnpm --filter @giwa/web test -- landingPresentation
```

Expected: PASS.

### Task 3: Verify the landing

**Files:**
- Inspect: `apps/web/public/landing.html`
- Inspect: `apps/web/public/landing.css`

**Interfaces:**
- Consumes: the completed static landing.
- Produces: automated and visual evidence without publishing.

- [x] **Step 1: Run affected automated checks**

```text
pnpm --filter @giwa/web test
pnpm typecheck
pnpm build
```

- [x] **Step 2: Inspect `/` at desktop and mobile widths**

Verify no horizontal overflow, readable comparison headers and values, explicit mismatch rule, preserved CTAs, and no console errors.

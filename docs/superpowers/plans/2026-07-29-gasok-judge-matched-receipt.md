# GASOK Judge Matched Receipt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. This
> project remains Codex-only; do not dispatch subagents.

**Goal:** Make the public GASOK demo explain `Manifest → GIWA 실행 → Match →
Receipt` at first read, then present a human-readable Matched Receipt and one
restrained Proof Seal only after a real matched live response.

**Architecture:** Preserve the existing dependency-light browser controller,
live API, verifier, SQLite store, and public Receipt contract. Add judge-facing
copy and bounded presentation helpers inside `public/user-flow.js`, restyle the
existing `/user/receipt/:receiptHash` route, and label the recorded
`/receipt/:receiptHash` fallback explicitly. No new workflow state or backend
surface is introduced.

**Tech Stack:** Browser JavaScript, HTML, CSS, Pretendard Variable, Node.js,
TypeScript 6, Vitest 4, existing live API and Standard RPC verifier.

## Global Constraints

- Public first-read vocabulary is limited to `Manifest` and `Matched Receipt`.
- The visible product flow is exactly `Manifest → GIWA 실행 → Match → Receipt`.
- The Seal is a matched-state visual asset, not a protocol object, NFT, SBT,
  POAP, token, identity credential, or on-chain certificate.
- Mismatched and failed runs never show a Receipt link or Seal.
- Pending verification never claims a field is matched.
- Fresh live runs keep `decisionTxHash: null`; do not add a relay transaction,
  contract call, API endpoint, schema change, or database table.
- Keep all claims testnet-only. Do not claim real assets, yield, RWA issuance.
  Do not claim settlement, finality, KYC, phishing protection, or security
  guarantees.
- Label checked-in historical evidence as a recorded verified example; never
  imply that its on-chain decision transaction belongs to a fresh live run.
- Keep the existing exact approval, deposit calldata, participant capability,
  verifier, Receipt gate, storage, and retry behavior unchanged.
- Use the existing paper/ink/rule/verified-green editorial design. No gradient,
  glass effect, confetti, particle burst, trophy, collectible card, or repeated
  rounded marketing-card grid.
- Use Pretendard Variable for interface copy and monospace only for hashes and
  compact evidence labels.
- Preserve the user's existing dirty changes in
  `apps/web/public/giwa-demo.css`,
  `apps/web/public/user-flow.js`, and
  `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`. Inspect the current
  diff before every edit and patch against the current file.
- Git staging and commits are approval-gated. Commit commands in this plan are
  checkpoints only and must not run without explicit user direction.
- Deployment and wallet transactions are outside this plan and require separate
  explicit direction.

## File Structure

### Files to modify

- `apps/web/public/user-flow.js`
  - Owns judge-facing demo copy, bounded failure projection, Matched Receipt
    rendering, local history rendering, and Receipt interactions.
- `apps/web/public/giwa-demo.css`
  - Owns `/giwa-demo` first-read problem/promise presentation.
- `apps/web/public/styles.css`
  - Owns `/user/receipt/*` and `/user/receipts` layout, Seal placement,
    responsive behavior, focus, and reduced motion.
- `apps/web/public/user.html`
  - Loads Pretendard Variable for live user and Receipt routes and provides
    bounded loading metadata.
- `apps/web/public/flow.js`
  - Distinguishes fresh live technical receipts from the recorded verified
    fallback.
- `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`
  - Guards first-read vocabulary, flow, and one-primary-action presentation.
- `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`
  - Guards bounded failure-code projection and matched-only public Receipt
    behavior.
- `apps/web/src/lib/userFlow/userVisualPolish.test.ts`
  - Guards Matched Receipt hierarchy, Seal asset use, accessibility, and motion.
- `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`
  - Guards fresh-live versus recorded source labeling.

### File to create

- `apps/web/public/matched-receipt-seal.png`
  - Transparent, text-free, restrained ink-ring texture used behind accessible
    HTML text. The file must be an original generated or otherwise approved
    asset, not CSS art or a hand-drawn SVG.

### Files explicitly unchanged

- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveStore.ts`
- `apps/web/src/lib/live/commercialReceiptGate.ts`
- `apps/web/src/lib/verifier/liveVerifierService.ts`
- `apps/web/src/lib/verifier/matchLiveDeposit.ts`
- `packages/protocol/`
- `packages/contracts/`

---

### Task 1: Judge-First Problem, Promise, And Four-Word Flow

**Files:**

- Modify: `apps/web/public/user-flow.js:838-1070`
- Modify: `apps/web/public/giwa-demo.css:92-340`
- Test: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`

**Interfaces:**

- Consumes: existing `view()`, `renderDemoTopBar()`,
  `renderDemoGuidedFlow(actions, action)`, and route-aware
  `renderActionPage()`.
- Produces: `renderDemoJudgePromise(): HTMLElement`, the exact first-read copy,
  and `.giwa-demo-judge-promise` presentation classes.

- [ ] **Step 1: Capture the dirty-file baseline**

Run:

```powershell
git diff -- apps/web/public/user-flow.js apps/web/public/giwa-demo.css apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: the command may show user changes. Save the output mentally as the
patch baseline; do not restore, reset, or overwrite it.

- [ ] **Step 2: Add failing first-read presentation assertions**

In `giwaDemoPresentation.test.ts`, add this test:

```ts
it("explains the judge problem and the four-word product flow before execution", () => {
  const source = readWebFile("public/user-flow.js");

  expect(source).toContain("renderDemoJudgePromise");
  expect(source).toContain(
    "버튼을 눌렀다는 기록만으로는, 약속한 온체인 액션이 실행됐는지 알 수 없습니다."
  );
  expect(source).toContain(
    "Looprail은 실행 전 Manifest와 실제 GIWA 트랜잭션을 대조합니다."
  );
  expect(source).toContain(
    'const labels = ["Manifest", "GIWA 실행", "Match", "Receipt"]'
  );
  expect(source).toContain("확인한 조건대로,");
  expect(source).toContain("실행됐는지 증명합니다.");
  expect(source).not.toContain("Proofbook");
  expect(source).not.toContain("Execution Proof");
});
```

Extend the CSS test in the same file:

```ts
expect(css).toContain(".giwa-demo-judge-promise");
expect(css).toContain(".giwa-demo-proof-path");
```

- [ ] **Step 3: Run the focused test and confirm the new assertions fail**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: FAIL because `renderDemoJudgePromise` and the approved copy do not
exist yet. Existing unrelated assertions should still pass.

- [ ] **Step 4: Add the judge promise renderer**

Add this function after `renderDemoTopBar()` in `public/user-flow.js`:

```js
function renderDemoJudgePromise() {
  const labels = ["Manifest", "GIWA 실행", "Match", "Receipt"];
  return view("aside", {
    className: "giwa-demo-judge-promise",
    "aria-label": "Looprail 작동 방식"
  }, [
    view("div", { className: "giwa-demo-judge-copy" }, [
      view("p", {
        className: "giwa-demo-problem",
        text: "버튼을 눌렀다는 기록만으로는, 약속한 온체인 액션이 실행됐는지 알 수 없습니다."
      }),
      view("p", {
        className: "giwa-demo-promise",
        text: "Looprail은 실행 전 Manifest와 실제 GIWA 트랜잭션을 대조합니다."
      })
    ]),
    view("ol", { className: "giwa-demo-proof-path" },
      labels.map((label, index) =>
        view("li", {}, [
          view("span", {
            className: "giwa-demo-proof-index",
            text: String(index + 1).padStart(2, "0")
          }),
          view("strong", { text: label })
        ])
      )
    )
  ]);
}
```

In the `/giwa-demo` branch of `renderActionPage()`, replace the hero text with:

```js
view("h1", {}, [
  view("span", { text: "확인한 조건대로," }),
  view("span", { text: "실행됐는지 증명합니다." })
]),
view("p", {
  className: "lead",
  text: "Manifest를 확인하고 GIWA Sepolia에서 실행하세요. 실제 트랜잭션이 조건과 모두 일치할 때만 Receipt가 열립니다."
})
```

Insert `renderDemoJudgePromise()` between the intro header and
`renderDemoGuidedFlow(actions, action)`.

- [ ] **Step 5: Add the restrained editorial styles**

Add to `public/giwa-demo.css`:

```css
.giwa-demo-judge-promise {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  gap: clamp(28px, 5vw, 72px);
  align-items: end;
  margin: 0 0 40px;
  padding-block: 22px;
  border-block: 1px solid #cdcec6;
}

.giwa-demo-judge-copy {
  display: grid;
  gap: 8px;
}

.giwa-demo-problem,
.giwa-demo-promise {
  max-width: 66ch;
  margin: 0;
  line-height: 1.55;
  word-break: keep-all;
}

.giwa-demo-problem {
  color: #656960;
  font-size: 14px;
}

.giwa-demo-promise {
  color: #171916;
  font-size: 15px;
  font-weight: 650;
}

.giwa-demo-proof-path {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.giwa-demo-proof-path li {
  min-width: 0;
  padding: 0 12px;
  border-left: 1px solid #cdcec6;
}

.giwa-demo-proof-path li:first-child {
  padding-left: 0;
  border-left: 0;
}

.giwa-demo-proof-index {
  display: block;
  margin-bottom: 7px;
  color: #0b5f43;
  font: 700 10px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
}

.giwa-demo-proof-path strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}
```

Inside `@media (max-width: 959px)` add:

```css
.giwa-demo-judge-promise {
  grid-template-columns: 1fr;
  gap: 18px;
}
```

Inside `@media (max-width: 639px)` add:

```css
.giwa-demo-proof-path {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 0;
}

.giwa-demo-proof-path li:nth-child(3) {
  padding-left: 0;
  border-left: 0;
}
```

- [ ] **Step 6: Run the focused presentation test**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: PASS. The test must still report exactly one
`id: "user-primary-action"`.

- [ ] **Step 7: Review the task diff**

Run:

```powershell
git diff --check
git diff -- apps/web/public/user-flow.js apps/web/public/giwa-demo.css apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: no whitespace errors; the diff contains only the approved first-read
copy and its presentation.

- [ ] **Step 8: Optional approval-gated commit checkpoint**

Only after explicit Git approval:

```powershell
git add -- apps/web/public/user-flow.js apps/web/public/giwa-demo.css apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
git commit -m "feat(web): clarify GASOK judge demo promise"
```

---

### Task 2: Bounded Mismatch Projection And Receipt Withholding

**Files:**

- Modify: `apps/web/public/user-flow.js:41-240`
- Modify: `apps/web/public/user-flow.js:866-940`
- Modify: `apps/web/public/user-flow.js:1437-1490`
- Modify: `apps/web/public/giwa-demo.css:143-340`
- Test: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`
- Test: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`

**Interfaces:**

- Consumes: live API response fields `status`, `failureCode`, `receiptHash`, and
  existing strict `projectSessionRun()`/`mergeRunResponse()` boundaries.
- Produces:
  - `projectFailureCode(value): string | null`
  - `mismatchDisplayCopy(code): string`
  - optional `runState.failureCode`
  - a terminal mismatch presentation with no Receipt link or Seal.

- [ ] **Step 1: Write failing bounded-failure tests**

In `userPublicBoundary.test.ts`, add:

```ts
it("projects only bounded verifier failure codes for the public mismatch state", () => {
  const source = readWebFile("public/user-flow.js");
  const functions = standaloneFunctions<{
    projectFailureCode: (value: unknown) => string | null;
    mismatchDisplayCopy: (value: unknown) => string;
  }>(source, ["projectFailureCode", "mismatchDisplayCopy"]);

  expect(functions.projectFailureCode("TARGET_MISMATCH")).toBe("TARGET_MISMATCH");
  expect(functions.projectFailureCode("ALLOWANCE_EXCEEDED")).toBe("ALLOWANCE_EXCEEDED");
  expect(functions.projectFailureCode("provider said secret details")).toBeNull();
  expect(functions.mismatchDisplayCopy("TARGET_MISMATCH")).toContain("실행 대상");
  expect(functions.mismatchDisplayCopy("ALLOWANCE_EXCEEDED")).toContain("승인 조건");
  expect(functions.mismatchDisplayCopy("unknown")).toBe(
    "확인한 조건과 실행 결과가 달라 Receipt를 발급하지 않았습니다."
  );
});
```

In the existing strict-session test, replace its current
`standaloneFunctions` declaration with:

```ts
const functions = standaloneFunctions<{
  projectFailureCode: (value: unknown) => string | null;
  projectSessionRun: (value: unknown) => Record<string, unknown> | null;
  runMatchesContext: (run: unknown, account: string, config: unknown) => boolean;
}>(source, ["projectFailureCode", "projectSessionRun", "runMatchesContext"]);
```

Then append these assertions to that test:

```ts
const mismatched = functions.projectSessionRun({
  ...strictRunFixture,
  status: "mismatched",
  failureCode: "TARGET_MISMATCH"
});
expect(mismatched?.failureCode).toBe("TARGET_MISMATCH");
expect(
  functions.projectSessionRun({
    ...strictRunFixture,
    status: "mismatched",
    failureCode: "raw upstream details"
  })
).toBeNull();
```

Extend the demo presentation test:

```ts
expect(source).toContain("Receipt를 발급하지 않았습니다.");
expect(source).toContain("renderDemoMismatchSummary");
expect(source).not.toContain("failed NFT");
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/userPublicBoundary.test.ts src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: FAIL because the bounded projection and mismatch renderer do not
exist.

- [ ] **Step 3: Add the failure-code projector and Korean display copy**

Add before `projectSessionRun()`:

```js
function projectFailureCode(value) {
  const allowed = new Set([
    "SIGNER_MISMATCH",
    "INTENT_HASH_MISMATCH",
    "VERIFYING_CONTRACT_MISMATCH",
    "TARGET_MISMATCH",
    "SELECTOR_MISMATCH",
    "ASSET_MISMATCH",
    "AMOUNT_MISMATCH",
    "SPENDER_MISMATCH",
    "ALLOWANCE_EXCEEDED",
    "TX_FAILED",
    "EXPIRED",
    "MISSING_REQUIRED_LOG",
    "UNDER_CONFIRMED",
    "WRONG_CHAIN"
  ]);
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function mismatchDisplayCopy(value) {
  const code = projectFailureCode(value);
  if (code === "TARGET_MISMATCH" || code === "SELECTOR_MISMATCH") {
    return "실행 대상 또는 액션이 Manifest와 달라 Receipt를 발급하지 않았습니다.";
  }
  if (code === "ASSET_MISMATCH" || code === "AMOUNT_MISMATCH") {
    return "자산 또는 수량이 Manifest와 달라 Receipt를 발급하지 않았습니다.";
  }
  if (code === "SPENDER_MISMATCH" || code === "ALLOWANCE_EXCEEDED") {
    return "승인 조건이 Manifest의 범위를 벗어나 Receipt를 발급하지 않았습니다.";
  }
  if (code === "EXPIRED") {
    return "트랜잭션이 Manifest 만료 후 확인되어 Receipt를 발급하지 않았습니다.";
  }
  if (code === "TX_FAILED") {
    return "GIWA Sepolia 트랜잭션이 실패해 Receipt를 발급하지 않았습니다.";
  }
  if (code === "MISSING_REQUIRED_LOG") {
    return "필수 트랜잭션 증거를 확인할 수 없어 Receipt를 발급하지 않았습니다.";
  }
  if (
    code === "SIGNER_MISMATCH" ||
    code === "INTENT_HASH_MISMATCH" ||
    code === "VERIFYING_CONTRACT_MISMATCH" ||
    code === "WRONG_CHAIN"
  ) {
    return "Manifest 검증 조건이 일치하지 않아 Receipt를 발급하지 않았습니다.";
  }
  return "확인한 조건과 실행 결과가 달라 Receipt를 발급하지 않았습니다.";
}
```

- [ ] **Step 4: Preserve only a bounded failure code in session state**

Inside `projectSessionRun()`:

```js
const failureCode = projectFailureCode(value.failureCode);
if (value.failureCode != null && failureCode === null) return null;
```

Add `failureCode` to the returned projected object.

In `projectIssuedRun()`, initialize:

```js
failureCode: null,
```

In `mergeRunResponse()`:

```js
const failureCode =
  response.failureCode === undefined
    ? base.failureCode
    : projectFailureCode(response.failureCode);
if (response.failureCode != null && failureCode === null) return null;
```

Pass `failureCode` into the final `projectSessionRun({...})` call. Because all
other construction paths call `projectSessionRun()`, omitted codes normalize to
`null`.

- [ ] **Step 5: Render an explicit mismatch result without a Receipt**

Add:

```js
function renderDemoMismatchSummary() {
  return view("section", {
    className: "giwa-demo-mismatch",
    role: "status",
    "aria-live": "polite"
  }, [
    view("p", { className: "eyebrow", text: "Receipt not issued" }),
    view("h3", {
      text: "확인한 조건과 실행 결과가 달라 Receipt를 발급하지 않았습니다."
    }),
    view("p", {
      className: "muted",
      text: mismatchDisplayCopy(runState?.failureCode)
    }),
    view("dl", { className: "giwa-demo-stage-summary" }, [
      field("Manifest match", "Not matched"),
      field("Receipt", "발급되지 않음")
    ])
  ]);
}
```

At the top of `renderDemoReceiptSummary()`:

```js
if (runState?.status === "mismatched" || runState?.status === "failed") {
  return renderDemoMismatchSummary();
}
```

In the terminal mismatch branch of `verifyAutomatically()`, replace the generic
notice with:

```js
notice = mismatchDisplayCopy(runState.failureCode);
```

Do not add any route navigation or Receipt fallback in this branch.

- [ ] **Step 6: Add mismatch styling**

Add to `giwa-demo.css`:

```css
.giwa-demo-mismatch {
  display: grid;
  gap: 12px;
  padding-left: 14px;
  border-left: 3px solid #805800;
}

.giwa-demo-mismatch h3,
.giwa-demo-mismatch p {
  margin: 0;
}

.giwa-demo-mismatch h3 {
  font-size: 17px;
  line-height: 1.45;
  word-break: keep-all;
}
```

- [ ] **Step 7: Run focused public-boundary and presentation tests**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/userPublicBoundary.test.ts src/lib/userFlow/giwaDemoPresentation.test.ts
```

Expected: PASS. The existing `location.assign()` assertion remains confined to
the valid matched-Receipt branch.

- [ ] **Step 8: Review for raw error leakage**

Run:

```powershell
rg -n "failureReason|error\\.message|upstream|runtime config" apps/web/public/user-flow.js
git diff --check
```

Expected: no new rendering path uses raw `failureReason` or exception messages.
Existing bounded internal handling may remain.

- [ ] **Step 9: Optional approval-gated commit checkpoint**

Only after explicit Git approval:

```powershell
git add -- apps/web/public/user-flow.js apps/web/public/giwa-demo.css apps/web/src/lib/userFlow/userPublicBoundary.test.ts apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
git commit -m "feat(web): explain receipt withholding on mismatch"
```

---

### Task 3: Human-Readable Matched Receipt And Proof Seal

**Files:**

- Create: `apps/web/public/matched-receipt-seal.png`
- Modify: `apps/web/public/user.html`
- Modify: `apps/web/public/user-flow.js:1660-1750`
- Modify: `apps/web/public/styles.css:419-710`
- Test: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`
- Test: `apps/web/src/lib/userFlow/userVisualPolish.test.ts`
- Regression test: `apps/web/src/lib/userFlow/userReceiptView.test.ts`

**Interfaces:**

- Consumes: existing public `GET /api/receipts/:receiptHash` response,
  `shortHash()`, `field()`, `explorerTxUrl()`, and normalized verification
  fields.
- Produces:
  - `projectMatchedReceiptBody(body, expectedHash): object | null`
  - `matchedReceiptRows(payload, verification): Array<{label,evidence,result}>`
  - `renderMatchedReceiptRows(rows): HTMLElement`
  - `renderMatchedReceiptSeal(): HTMLElement`
  - a human-readable, matched-only Receipt first viewport.

- [ ] **Step 1: Add failing hierarchy, data, asset, and accessibility tests**

In `userPublicBoundary.test.ts`, update the existing public Receipt test. Replace
the loose matched-response assertion:

```ts
expect(receiptRoute).toContain("projectMatchedReceiptBody(body, hash)");
expect(receiptRoute).not.toContain(
  'response.ok && body?.receiptHash === hash && body?.payload?.status === "matched"'
);
```

Replace its existing payload-field loop with:

```ts
for (const field of [
  "wallet",
  "target",
  "asset",
  "amountBaseUnits",
  "depositTxHash",
  "depositBlockNumber",
  "depositBlockHash",
  "issuedAt",
  "safetyNotice",
  "actionType",
  "spender",
  "maxAllowanceBaseUnits",
  "allowanceUsedBaseUnits",
  "networkName"
]) {
  expect(receiptRoute).toContain(`payload?.${field}`);
}
expect(source).toContain("matchedReceiptRows");
expect(source).toContain("renderMatchedReceiptSeal");
expect(source).toContain("projectMatchedReceiptBody");
expect(source).toContain("확인한 조건대로 실행됐습니다.");
expect(source).toContain("Matched Receipt");
```

Add a strict projection test:

```ts
it("shows the Matched Receipt and Seal only for a complete live public payload", () => {
  const source = readWebFile("public/user-flow.js");
  const project = standaloneFunction<
    (body: unknown, expectedHash: string) => Record<string, unknown> | null
  >(source, "projectMatchedReceiptBody");
  const receiptHash = `0x${"a".repeat(64)}`;
  const intentHash = `0x${"b".repeat(64)}`;
  const depositTxHash = `0x${"c".repeat(64)}`;
  const blockHash = `0x${"d".repeat(64)}`;
  const verifierInputHash = `0x${"e".repeat(64)}`;
  const body = {
    source: "live",
    receiptHash,
    intentHash,
    verifierInputHash,
    standardRpcReceiptStatus: 1,
    depositBlockNumber: 123,
    depositBlockHash: blockHash,
    confirmationDepth: 3,
    testnetNotice: "Testnet-only. No real asset, no yield, no RWA claim.",
    payload: {
      status: "matched",
      chainId: 91342,
      networkName: "GIWA Sepolia",
      actionType: "mockVaultDeposit",
      intentHash,
      wallet: "0x1111111111111111111111111111111111111111",
      target: "0x2222222222222222222222222222222222222222",
      asset: "0x3333333333333333333333333333333333333333",
      spender: "0x2222222222222222222222222222222222222222",
      amountBaseUnits: "1000000000000000000",
      maxAllowanceBaseUnits: "1000000000000000000",
      allowanceUsedBaseUnits: "1000000000000000000",
      depositTxHash,
      depositBlockNumber: 123,
      depositBlockHash: blockHash,
      issuedAt: 1_800_000_000,
      safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
    }
  };

  expect(project(body, receiptHash)).not.toBeNull();
  expect(project({ ...body, source: "fixture" }, receiptHash)).toBeNull();
  expect(project({ ...body, receiptHash: `0x${"f".repeat(64)}` }, receiptHash)).toBeNull();
  expect(project({ ...body, payload: { ...body.payload, status: "failed" } }, receiptHash)).toBeNull();
  expect(
    project({
      ...body,
      payload: { ...body.payload, allowanceUsedBaseUnits: undefined }
    }, receiptHash)
  ).toBeNull();
});
```

In `userVisualPolish.test.ts`, add a binary reader beside `readWebFile()`:

```ts
function readWebBuffer(path: string): Buffer {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath);
}
```

Add:

```ts
it("uses one real Seal asset and a human-readable matched Receipt hierarchy", () => {
  const html = readWebFile("public/user.html");
  const source = readWebFile("public/user-flow.js");
  const css = readWebFile("public/styles.css");
  const seal = readWebBuffer("public/matched-receipt-seal.png");
  const routeStart = source.indexOf("async function renderReceiptRoute");
  const receiptRoute = source.slice(
    routeStart,
    source.indexOf("function renderHelp", routeStart)
  );

  expect(html).toContain("pretendardvariable-dynamic-subset.min.css");
  expect(source).toContain("/matched-receipt-seal.png");
  expect(source).toContain('alt: ""');
  expect(source).toContain('"aria-hidden": "true"');
  expect(receiptRoute.indexOf("renderMatchedReceiptRows(matchRows)")).toBeLessThan(
    receiptRoute.indexOf('field("Receipt hash", receiptHash)')
  );
  expect(source).toContain('id: "copy-receipt-feedback"');
  expect(source).toContain('tabindex: "-1"');
  expect(css).toContain(".matched-receipt-seal");
  expect(css).toContain(".matched-receipt-rows");
  expect(css).toContain("@keyframes matched-receipt-reveal");
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  expect([...seal.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
});
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/userPublicBoundary.test.ts src/lib/userFlow/userVisualPolish.test.ts src/lib/userFlow/userReceiptView.test.ts
```

Expected: FAIL because the Seal asset, match-row helpers, and new Receipt
hierarchy do not exist.

- [ ] **Step 3: Generate and inspect the Seal texture asset**

Use the repository `imagegen` skill with this exact art direction:

```text
Create a single transparent PNG asset for a premium Korean fintech/Web3
execution receipt. It is a restrained circular ink-ring texture only, with no
letters, numbers, symbols, icons, logos, mockup, paper, background, shadow, or
gradient. Dark GIWA-style verified green (#0b5f43), slightly imperfect
letterpress ink edges, editorial and precise rather than vintage or playful.
Centered, square 1024×1024 composition, wide transparent interior so accessible
HTML text can be overlaid. No border outside the ring.
```

Save the accepted output as:

```text
apps/web/public/matched-receipt-seal.png
```

Inspect it with the local image viewer. Reject and regenerate if it contains any
text, fake logo, background, gradient, drop shadow, trophy, coin, badge icon, or
opaque corners.

- [ ] **Step 4: Load Pretendard on live user and Receipt routes**

In `public/user.html`, add before `/styles.css`:

```html
<link
  rel="stylesheet"
  as="style"
  crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
/>
```

Change the static document title to:

```html
<title>GIWA Verified Intent Rail</title>
```

Inside `renderReceiptRoute()`, set the route-specific title after `matched` is
known:

```js
document.title = matched
  ? "Matched Receipt · GIWA Verified Intent Rail"
  : "Receipt unavailable · GIWA Verified Intent Rail";
```

The static document remains route-generic because JavaScript also renders the
action, history, and help surfaces.

- [ ] **Step 5: Add strict public Receipt and matched-row projection**

Add before `renderReceiptRoute()`:

```js
function projectMatchedReceiptBody(body, expectedHash) {
  const hash = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value);
  const address = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value);
  const amount = (value) =>
    typeof value === "string" && /^(?:0|[1-9][0-9]{0,77})$/u.test(value);
  const safeInteger = (value) =>
    Number.isSafeInteger(value) && value >= 0;
  const safetyNotice = "Testnet-only. No real asset, no yield, no RWA claim.";

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    body.source !== "live" ||
    !hash(expectedHash) ||
    !hash(body.receiptHash) ||
    body.receiptHash.toLowerCase() !== expectedHash.toLowerCase() ||
    !hash(body.intentHash) ||
    !hash(body.verifierInputHash) ||
    body.standardRpcReceiptStatus !== 1 ||
    !safeInteger(body.depositBlockNumber) ||
    !hash(body.depositBlockHash) ||
    !safeInteger(body.confirmationDepth) ||
    body.testnetNotice !== safetyNotice
  ) {
    return null;
  }

  const payload = body.payload;
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.status !== "matched" ||
    payload.chainId !== 91342 ||
    payload.networkName !== "GIWA Sepolia" ||
    payload.actionType !== "mockVaultDeposit" ||
    !hash(payload.intentHash) ||
    payload.intentHash.toLowerCase() !== body.intentHash.toLowerCase() ||
    !address(payload.wallet) ||
    !address(payload.target) ||
    !address(payload.asset) ||
    !address(payload.spender) ||
    !amount(payload.amountBaseUnits) ||
    !amount(payload.maxAllowanceBaseUnits) ||
    !amount(payload.allowanceUsedBaseUnits) ||
    !hash(payload.depositTxHash) ||
    !safeInteger(payload.depositBlockNumber) ||
    !hash(payload.depositBlockHash) ||
    !safeInteger(payload.issuedAt) ||
    payload.depositBlockNumber !== body.depositBlockNumber ||
    payload.depositBlockHash.toLowerCase() !== body.depositBlockHash.toLowerCase() ||
    payload.safetyNotice !== safetyNotice
  ) {
    return null;
  }

  return {
    receiptHash: body.receiptHash.toLowerCase(),
    intentHash: body.intentHash.toLowerCase(),
    verifierInputHash: body.verifierInputHash.toLowerCase(),
    confirmationDepth: body.confirmationDepth,
    payload
  };
}

function matchedReceiptRows(payload, verification) {
  return [
    {
      label: "지갑",
      evidence: shortHash(payload.wallet),
      result: "일치"
    },
    {
      label: "실행 대상과 액션",
      evidence: `${shortHash(payload.target)} · ${payload.actionType}`,
      result: "일치"
    },
    {
      label: "자산과 수량",
      evidence: `${shortHash(payload.asset)} · ${payload.amountBaseUnits}`,
      result: "일치"
    },
    {
      label: "승인 조건",
      evidence: `${shortHash(payload.spender)} · ${payload.allowanceUsedBaseUnits}/${payload.maxAllowanceBaseUnits}`,
      result: "범위 내"
    },
    {
      label: "블록 증거",
      evidence: `Block ${payload.depositBlockNumber} · ${verification.confirmationDepth} confirmations`,
      result: "확인됨"
    }
  ];
}

function renderMatchedReceiptRows(rows) {
  return view("dl", {
    className: "matched-receipt-rows",
    "aria-label": "Manifest와 실제 실행의 일치 결과"
  }, rows.map((row) =>
    view("div", { className: "matched-receipt-row" }, [
      view("dt", { text: row.label }),
      view("dd", { className: "mono hash-wrap", text: row.evidence }),
      view("span", { className: "matched-receipt-result", text: row.result })
    ])
  ));
}

function renderMatchedReceiptSeal() {
  return view("figure", {
    className: "matched-receipt-seal",
    "aria-hidden": "true"
  }, [
    view("img", {
      src: "/matched-receipt-seal.png",
      alt: ""
    }),
    view("figcaption", {}, [
      view("strong", { text: "MATCHED" }),
      view("span", { text: "GIWA SEPOLIA" })
    ])
  ]);
}
```

Do not accept data from query parameters or session storage. These helpers
receive only the already validated matched public API payload.

- [ ] **Step 6: Replace the Receipt first viewport**

Inside `renderReceiptRoute()`, replace the existing block beginning with
`const matched =` and ending with `const issuedTime =` with this complete
projection block:

```js
const receiptModel =
  response !== null && response.ok
    ? projectMatchedReceiptBody(body, hash)
    : null;
const matched = receiptModel !== null;
const payload = receiptModel?.payload ?? null;
const receiptHash = receiptModel?.receiptHash ?? null;
const wallet = payload?.wallet ?? null;
const target = payload?.target ?? null;
const asset = payload?.asset ?? null;
const amountBaseUnits = payload?.amountBaseUnits ?? null;
const actionType = payload?.actionType ?? null;
const spender = payload?.spender ?? null;
const maxAllowanceBaseUnits = payload?.maxAllowanceBaseUnits ?? null;
const allowanceUsedBaseUnits = payload?.allowanceUsedBaseUnits ?? null;
const networkName = payload?.networkName ?? null;
const depositTxHash = payload?.depositTxHash ?? null;
const blockNumber = payload?.depositBlockNumber ?? null;
const blockHash = payload?.depositBlockHash ?? null;
const issuedAt = payload?.issuedAt ?? null;
const safetyNotice = payload?.safetyNotice ?? null;
const verification = {
  confirmationDepth: receiptModel?.confirmationDepth ?? null,
  verifierInputHash: receiptModel?.verifierInputHash ?? null
};
const txExplorerUrl = explorerTxUrl(depositTxHash);
const issuedTime =
  Number.isInteger(issuedAt)
    ? new Date(issuedAt * 1000).toISOString()
    : "확인 중";
```

Build a `receiptPayload` only when matched:

```js
const receiptPayload = matched
  ? {
      wallet,
      target,
      asset,
      amountBaseUnits,
      actionType,
      spender,
      maxAllowanceBaseUnits,
      allowanceUsedBaseUnits,
      depositBlockNumber: blockNumber
    }
  : null;
const matchRows =
  receiptPayload === null ? [] : matchedReceiptRows(receiptPayload, verification);
```

Replace the current matched `app.append(...)` block with this structure:

```js
const receiptHeading = view("h1", {
  id: "matched-receipt-heading",
  tabindex: "-1",
  text: matched
    ? "확인한 조건대로 실행됐습니다."
    : "Receipt를 확인할 수 없습니다."
});

app.append(
  view("section", {
    className: `matched-receipt-page ${matched ? "is-matched" : "is-unavailable"}`,
    id: "main-content"
  }, [
    view("header", { className: "matched-receipt-header" }, [
      view("div", { className: "matched-receipt-copy" }, [
        view("p", {
          className: "eyebrow",
          text: matched ? "Manifest matched · Matched Receipt" : "Receipt unavailable"
        }),
        receiptHeading,
        view("p", {
          className: "lead",
          text: matched
            ? "GIWA Sepolia 트랜잭션과 Manifest를 대조해, 일치한 실행 기록을 발급했습니다."
            : "일치가 확인된 공개 Receipt만 이 경로에서 볼 수 있습니다."
        }),
        view("p", {
          className: matched ? "user-state complete" : "user-state blocked",
          role: "status",
          "aria-live": "polite",
          text: matched ? "Matched Receipt 발급 완료" : "공개 Receipt 없음"
        })
      ]),
      matched ? renderMatchedReceiptSeal() : view("span")
    ]),
    matched ? renderMatchedReceiptRows(matchRows) : view("span"),
    view("div", { className: "hero-actions user-receipt-actions" }, [
      txExplorerUrl === null
        ? view("span", { className: "disabled-link", text: "GIWA Explorer에서 보기" })
        : view("a", {
            className: "primary-link",
            href: txExplorerUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            text: "GIWA Explorer에서 보기"
          }),
      view("button", {
        type: "button",
        id: "copy-receipt-link",
        disabled: !matched,
        text: "Receipt 링크 복사"
      }),
      matched
        ? view("a", {
            className: "secondary-link",
            href: `/receipt/${receiptHash}`,
            text: "검증 증거 보기"
          })
        : view("span", { className: "disabled-link", text: "검증 증거 보기" }),
      view("a", { className: "secondary-link", href: "/giwa-demo", text: "다시 실행" })
    ]),
    view("p", {
      id: "copy-receipt-feedback",
      className: "sr-only",
      role: "status",
      "aria-live": "polite",
      text: ""
    }),
    view("details", { className: "matched-receipt-technical" }, [
      view("summary", { text: "Technical details" }),
      field("Receipt hash", receiptHash),
      field("Intent hash", receiptModel?.intentHash ?? null),
      field("Deposit transaction", depositTxHash),
      field("Wallet", wallet),
      field("Target", target),
      field("Asset", asset),
      field("Amount", amountBaseUnits),
      field("Network", networkName),
      field("Block number", blockNumber),
      field("Block hash", blockHash),
      field("Confirmation depth", matched ? verification.confirmationDepth : null),
      field("Verifier input hash", matched ? verification.verifierInputHash : null),
      field("Issued time", issuedTime),
      view("p", {
        className: "notice user-safety-notice",
        text: safetyNotice ?? "Testnet-only. No real asset, no yield, no RWA claim."
      })
    ])
  ])
);

receiptHeading.focus({ preventScroll: true });
```

The technical block preserves all existing public evidence. Do not remove the
technical `/receipt/:receiptHash` link.

- [ ] **Step 7: Make copy feedback observable**

Replace the copy handler body with:

```js
const copyFeedback = document.querySelector("#copy-receipt-feedback");
try {
  await navigator.clipboard.writeText(location.href);
  if (copyFeedback) copyFeedback.textContent = "Receipt 링크를 복사했습니다.";
} catch {
  if (copyFeedback) {
    copyFeedback.textContent = "링크를 복사하지 못했습니다. 주소창에서 직접 복사해 주세요.";
  }
}
```

Do not rerender the whole route after a copy attempt.

- [ ] **Step 8: Add Receipt and Seal styling**

Add to `public/styles.css`:

```css
.matched-receipt-page {
  width: min(100% - 48px, 1120px);
  min-height: 100dvh;
  margin-inline: auto;
  padding: clamp(48px, 7vw, 96px) 0 72px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.matched-receipt-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
  gap: clamp(32px, 7vw, 96px);
  align-items: center;
  padding-bottom: 36px;
  border-bottom: 1px solid #cdcec6;
}

.matched-receipt-copy h1 {
  max-width: 780px;
  margin: 12px 0 18px;
  font-size: clamp(44px, 6vw, 72px);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.04em;
  word-break: keep-all;
}

.matched-receipt-copy .lead {
  max-width: 680px;
  margin: 0;
  color: #5b615a;
  font-size: 17px;
  line-height: 1.65;
  word-break: keep-all;
}

.matched-receipt-seal {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 240px);
  aspect-ratio: 1;
  margin: 0;
  justify-self: end;
  color: #0b5f43;
  animation: matched-receipt-reveal 720ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.matched-receipt-seal img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.matched-receipt-seal figcaption {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 7px;
  text-align: center;
}

.matched-receipt-seal strong {
  font: 800 clamp(19px, 2.4vw, 28px)/1 ui-monospace, SFMono-Regular, Consolas, monospace;
  letter-spacing: 0.08em;
}

.matched-receipt-seal span {
  font: 700 10px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
  letter-spacing: 0.16em;
}

.matched-receipt-rows {
  display: grid;
  margin: 32px 0 0;
  border-top: 1px solid #cdcec6;
}

.matched-receipt-row {
  display: grid;
  grid-template-columns: minmax(150px, 0.6fr) minmax(0, 1.4fr) auto;
  gap: 20px;
  align-items: center;
  min-height: 64px;
  border-bottom: 1px solid #cdcec6;
}

.matched-receipt-row dt,
.matched-receipt-row dd {
  margin: 0;
}

.matched-receipt-row dt {
  font-weight: 650;
}

.matched-receipt-row dd {
  color: #656960;
  font-size: 12px;
}

.matched-receipt-result {
  color: #0b5f43;
  font-size: 13px;
  font-weight: 750;
}

.matched-receipt-page .user-receipt-actions {
  margin-top: 28px;
}

.matched-receipt-technical {
  margin-top: 40px;
  border-top: 1px solid #cdcec6;
}

.matched-receipt-technical > summary {
  min-height: 52px;
  display: flex;
  align-items: center;
  font-weight: 650;
  cursor: pointer;
}

@keyframes matched-receipt-reveal {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

Add responsive rules:

```css
@media (max-width: 760px) {
  .matched-receipt-page {
    width: min(100% - 28px, 620px);
    padding-top: 38px;
  }

  .matched-receipt-header {
    grid-template-columns: 1fr;
  }

  .matched-receipt-seal {
    width: 160px;
    justify-self: start;
  }

  .matched-receipt-row {
    grid-template-columns: 1fr auto;
    gap: 7px 16px;
    padding-block: 14px;
  }

  .matched-receipt-row dd {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
```

Inside the existing reduced-motion block, ensure:

```css
.matched-receipt-seal {
  animation: none;
}
```

- [ ] **Step 9: Run focused tests**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/userPublicBoundary.test.ts src/lib/userFlow/userVisualPolish.test.ts src/lib/userFlow/userReceiptView.test.ts
```

Expected: PASS, including the PNG signature check.

- [ ] **Step 10: Inspect the asset and task diff**

Run:

```powershell
git diff --check
git status --short -- apps/web/public/matched-receipt-seal.png apps/web/public/user.html apps/web/public/user-flow.js apps/web/public/styles.css apps/web/src/lib/userFlow
```

Expected: one new PNG and only the planned Receipt/presentation changes.

- [ ] **Step 11: Optional approval-gated commit checkpoint**

Only after explicit Git approval:

```powershell
git add -- apps/web/public/matched-receipt-seal.png apps/web/public/user.html apps/web/public/user-flow.js apps/web/public/styles.css apps/web/src/lib/userFlow/userPublicBoundary.test.ts apps/web/src/lib/userFlow/userVisualPolish.test.ts apps/web/src/lib/userFlow/userReceiptView.test.ts
git commit -m "feat(web): add human-readable matched receipt"
```

---

### Task 4: Local Execution History And Recorded-Evidence Labels

**Files:**

- Modify: `apps/web/public/user-flow.js:1599-1660`
- Modify: `apps/web/public/styles.css:550-710`
- Modify: `apps/web/public/flow.js:36-112`
- Modify: `apps/web/public/flow.js:316-430`
- Regression test: `apps/web/src/lib/userFlow/userReceiptsList.test.ts`
- Test: `apps/web/src/lib/userFlow/userVisualPolish.test.ts`
- Test: `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`

**Interfaces:**

- Consumes: existing `USER_RECEIPTS_KEY` browser storage, `flow-data.json`
  source mode `completed-demo-evidence`, and strict live Receipt projection.
- Produces: `내 실행 기록` boundary copy, optional `networkName`/`savedAt`
  local fields, and explicit `Live matched receipt` versus
  `Recorded verified example` labels.

- [ ] **Step 1: Write failing history and source-label tests**

In `userVisualPolish.test.ts`, add:

```ts
it("describes Receipt history as local browser execution records", () => {
  const source = readWebFile("public/user-flow.js");

  expect(source).toContain("내 실행 기록");
  expect(source).toContain("이 브라우저에 저장된 테스트넷 실행 기록입니다.");
  expect(source).toContain(
    "사용자는 실행 기록을 받고, 파트너는 클릭이 아니라 Manifest와 일치한 트랜잭션을 KPI로 확인합니다."
  );
  expect(source).toContain(
    "GIWA Wallet 안에서 실행 전 Manifest와 실행 후 Receipt 기록을 연결할 수 있습니다."
  );
  expect(source).toContain('networkName: "GIWA Sepolia"');
  expect(source).toContain("savedAt:");
  expect(source).not.toContain("영구 소유");
  expect(source).not.toContain("지갑에 귀속된 NFT");
});
```

In `livePublicReceiptRoute.test.ts`, extend the live model assertion:

```ts
expect(model).toMatchObject({
  source: { mode: "fresh-live" }
});
```

Add:

```ts
it("labels fresh live and committed recorded receipts differently", () => {
  expect(source).toContain("Live matched receipt");
  expect(source).toContain("Recorded verified example");
  expect(source).toContain('model.source?.mode === "completed-demo-evidence"');
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/userReceiptsList.test.ts src/lib/userFlow/userVisualPolish.test.ts src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: FAIL because local-boundary and source-mode labels are absent.

- [ ] **Step 3: Store bounded local history metadata**

In `storeReceiptProjection()` add:

```js
networkName: "GIWA Sepolia",
savedAt: new Date().toISOString(),
```

Keep `id`, `state`, `actionName`, `receiptHash`, and `depositTxHash` unchanged so
old records continue to render.

In `renderReceiptCard(item)`, use:

```js
field("Network", item.networkName ?? "GIWA Sepolia"),
field("Saved", item.savedAt ?? "이전 기록"),
```

Do not call this an issued time; `savedAt` is browser retention time.

- [ ] **Step 4: Rename the history surface and add the storage boundary**

In `renderReceiptsList()` use:

```js
view("p", { className: "eyebrow", text: "Matched Receipts" }),
view("h1", { text: "내 실행 기록" }),
view("p", {
  className: "lead",
  text: "이 브라우저에 저장된 테스트넷 실행 기록입니다."
})
```

Use Korean filter labels:

```text
전체
Matched
검증 중
불일치
```

Empty-state copy:

```text
이 브라우저에 저장된 실행 기록이 없습니다.
```

Pending and not-matched cards keep recovery links but do not display a Seal or
use `획득` language.

- [ ] **Step 5: Add the user, partner, and future Wallet value handoff**

Add this helper after `renderMatchedReceiptSeal()`:

```js
function renderMatchedReceiptValue() {
  return view("section", {
    className: "matched-receipt-value",
    "aria-labelledby": "matched-receipt-value-heading"
  }, [
    view("p", { className: "eyebrow", text: "What this proves" }),
    view("h2", {
      id: "matched-receipt-value-heading",
      text: "사용자 기록에서 파트너 KPI까지"
    }),
    view("p", {
      text: "사용자는 실행 기록을 받고, 파트너는 클릭이 아니라 Manifest와 일치한 트랜잭션을 KPI로 확인합니다."
    }),
    view("p", {
      className: "muted",
      text: "GIWA Wallet 안에서 실행 전 Manifest와 실행 후 Receipt 기록을 연결할 수 있습니다."
    })
  ]);
}
```

In the matched `/user/receipt/:receiptHash` rendering from Task 3, place
`renderMatchedReceiptValue()` after the Receipt actions and copy-feedback live
region, but before `matched-receipt-technical`.

Add to `styles.css`:

```css
.matched-receipt-value {
  display: grid;
  grid-template-columns: minmax(150px, 0.45fr) minmax(0, 1.1fr);
  gap: 10px 32px;
  margin-top: 40px;
  padding: 28px 0;
  border-block: 1px solid #cdcec6;
}

.matched-receipt-value .eyebrow {
  grid-row: 1 / span 3;
  margin: 0;
}

.matched-receipt-value h2,
.matched-receipt-value p {
  margin: 0;
}

.matched-receipt-value h2 {
  font-size: clamp(24px, 3vw, 36px);
  letter-spacing: -0.035em;
}

.matched-receipt-value p {
  max-width: 720px;
  line-height: 1.65;
  word-break: keep-all;
}

@media (max-width: 760px) {
  .matched-receipt-value {
    grid-template-columns: 1fr;
  }

  .matched-receipt-value .eyebrow {
    grid-row: auto;
  }
}
```

The Wallet sentence is explicitly a possible placement path. Do not add
`연동 완료`, `GIWA Wallet에서 사용 가능`, or other present-tense integration
claims.

- [ ] **Step 6: Add explicit live source mode**

In `projectLiveReceiptModel()` in `public/flow.js`, add at the top level of the
returned model:

```js
source: {
  mode: "fresh-live"
},
```

Do not add a decision transaction to this model.

- [ ] **Step 7: Label the technical Receipt route by source**

At the start of `renderReceiptRoute(model, routeAllowed, routeHash)` after the
locked branch:

```js
const recorded = model.source?.mode === "completed-demo-evidence";
const sourceLabel = recorded
  ? "Recorded verified example"
  : "Live matched receipt";
```

Use `sourceLabel` for the Receipt-route eyebrow. When `recorded` is true, add:

```js
el("p", {
  className: "notice",
  text: "이 화면은 이전 GIWA Sepolia 테스트넷 실행에서 저장된 검증 예시입니다."
})
```

When live, add:

```js
el("p", {
  className: "notice",
  text: "이 Receipt는 현재 live verifier와 public Receipt gate를 통과했습니다."
})
```

Keep the recorded decision transaction visible only inside the recorded
technical evidence route. Fresh live `decisionTxHash` remains `null`.

- [ ] **Step 8: Run focused history and source tests**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/userReceiptsList.test.ts src/lib/userFlow/userVisualPolish.test.ts src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: PASS.

- [ ] **Step 9: Review public wording and diff**

Run:

```powershell
rg -n "Recorded verified example|Live matched receipt|내 실행 기록|이 브라우저에 저장된" apps/web/public
git diff --check
```

Expected: source labels are explicit, and no copy claims cross-device,
permanent, account, token, or wallet ownership.

- [ ] **Step 10: Optional approval-gated commit checkpoint**

Only after explicit Git approval:

```powershell
git add -- apps/web/public/user-flow.js apps/web/public/styles.css apps/web/public/flow.js apps/web/src/lib/userFlow/userReceiptsList.test.ts apps/web/src/lib/userFlow/userVisualPolish.test.ts apps/web/src/lib/flow/livePublicReceiptRoute.test.ts
git commit -m "feat(web): distinguish live and recorded receipts"
```

---

### Task 5: Full Verification And Judge-Comprehension QA

**Files:**

- Inspect: all files changed in Tasks 1-4
- Save local-only screenshots under:
  `docs/evidence/local/gasok-judge-matched-receipt/`

**Interfaces:**

- Consumes: completed presentation, existing static/live servers, current
  recorded evidence, and optionally an already-existing matched live Receipt.
- Produces: automated verification evidence, desktop/mobile screenshots, and a
  final go/no-go assessment without deploying or sending a transaction.

- [ ] **Step 1: Run all focused tests together**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow/giwaDemoPresentation.test.ts src/lib/userFlow/userPublicBoundary.test.ts src/lib/userFlow/userVisualPolish.test.ts src/lib/userFlow/userReceiptView.test.ts src/lib/userFlow/userReceiptsList.test.ts src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: all listed files pass.

- [ ] **Step 2: Run verifier and Receipt-gate regression tests**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveApi.test.ts src/lib/live/stagingParticipantFlow.test.ts src/lib/live/commercialReceiptGate.test.ts src/lib/verifier/liveVerifierService.test.ts
```

Expected: PASS. In particular:

- matched verification exposes a Receipt;
- mismatched verification stores no Receipt;
- tampered canonical payloads stay locked;
- fresh live decisions keep `decisionTxHash: null`.

- [ ] **Step 3: Run full web verification**

Run:

```powershell
pnpm --filter @giwa/web test
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
```

Expected: all commands exit `0`.

- [ ] **Step 4: Run workspace regression verification**

Run:

```powershell
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit `0`. If an unrelated pre-existing failure appears,
record it separately and prove the focused changed-surface checks still pass.

- [ ] **Step 5: Run public-claim and secret scans**

Run:

```powershell
pnpm --filter @giwa/web artifact:scan
rg -n "NFT|SBT|POAP|settlement|finality|KYC|security guarantee|real yield|real RWA" apps/web/public
```

Expected: artifact scan passes. Any matching boundary/safety text is acceptable;
no positive unsupported claim is introduced.

- [ ] **Step 6: Start the local static preview**

Run:

```powershell
$env:PORT='4176'
pnpm --filter @giwa/web serve
```

Expected: server starts on `127.0.0.1:4176`. If the command yields a running
cell, keep it alive and continue with bounded waits rather than starting a
duplicate server.

- [ ] **Step 7: Capture the judge-first demo at required viewports**

Using the already chosen in-app browser, inspect `/giwa-demo` at:

```text
1280 × 720
1024 × 768
390 × 844
```

Save accepted screenshots as:

```text
docs/evidence/local/gasok-judge-matched-receipt/01-demo-1280.png
docs/evidence/local/gasok-judge-matched-receipt/02-demo-1024.png
docs/evidence/local/gasok-judge-matched-receipt/03-demo-390.png
```

For each viewport confirm:

- problem and product promise are visible before wallet connection;
- the four-word flow is readable;
- exactly one primary action is dominant;
- no horizontal overflow occurs;
- technical details do not dominate;
- product copy does not introduce Proofbook or Execution Proof.

- [ ] **Step 8: Capture recorded and live Receipt source labels**

Open the checked-in recorded example Receipt route and save:

```text
docs/evidence/local/gasok-judge-matched-receipt/04-recorded-receipt.png
```

Confirm `Recorded verified example` is visible.

If an existing matched live Receipt is already available in the local or
staging SQLite store, open it read-only and capture:

```text
docs/evidence/local/gasok-judge-matched-receipt/05-live-matched-receipt.png
```

Confirm:

- completion headline appears before hashes;
- five match rows are present;
- the Seal appears once;
- the source is live;
- Explorer, copy, evidence, and restart actions are visible;
- technical details are collapsed initially.

If no matched live Receipt exists, do not fabricate one and do not send a wallet
transaction. Record the live screenshot as not captured pending a separately
approved testnet run.

- [ ] **Step 9: Inspect accessibility behavior**

With keyboard only:

1. Enter `/user/receipt/:receiptHash`.
2. Confirm focus lands on the Receipt heading.
3. Tab through Explorer, copy, evidence, restart, and technical disclosure.
4. Activate copy and confirm the live region announces the outcome.
5. Enable reduced motion and confirm the Seal appears immediately.

Expected: visible focus, logical order, no motion loop, no color-only result.

- [ ] **Step 10: Run the judge comprehension gate**

Using only the visible demo and Receipt, answer:

```text
1. What problem does Looprail solve?
2. What did the user review?
3. What ran on GIWA Sepolia?
4. What did Looprail compare?
5. Why was the Receipt issued?
6. What happens on mismatch?
7. What does the partner measure?
8. Where could this fit in GIWA Wallet?
```

Expected: all eight answers are visible without explaining the Seal as a
separate product. A missing answer is a no-go and must be fixed before
deployment planning.

- [ ] **Step 11: Inspect the final diff**

Run:

```powershell
git diff --check
git status --short
git diff -- apps/web/public apps/web/src/lib/userFlow apps/web/src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected:

- unrelated user files and changes are untouched;
- no backend, protocol, contract, dependency, or lockfile changes exist;
- one new approved PNG asset exists;
- all required presentation and test changes are visible.

- [ ] **Step 12: Stop before external actions**

Do not stage, commit, deploy, change DNS, restart Lightsail, or send a wallet
transaction without a new explicit instruction. Hand off:

- changed files;
- focused and full verification outcomes;
- accepted screenshot paths;
- any missing live matched screenshot;
- the exact next approval needed.

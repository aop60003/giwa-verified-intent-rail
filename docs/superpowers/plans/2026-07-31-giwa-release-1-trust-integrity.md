# GIWA Release 1 Trust and Data Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Local Completion Status — 2026-07-31

This plan is locally complete. The detailed unchecked steps below preserve the
original RED → GREEN execution script; the completed task-level gate is:

- [x] Task 1 — Correct pre-execution Receipt state and wallet recovery copy.
- [x] Task 2 — Align Receipt destinations and evidence-time labels.
- [x] Task 3 — Make the Campaign Receipt handoff truthful and narrative-safe.
- [x] Task 4 — Separate the approval branch from the evidence funnel.
- [x] Task 5 — Promote local Receipt history by stable execution identity.
- [x] Task 6 — Separate malformed proof input from fail-closed absence.
- [x] Task 7 — Pass the local Release 1 verification and review gate.

The durable completion boundary and remaining release gates are recorded in
[`docs/implementation/giwa-release-1-2-local-completion-freeze.md`](../../implementation/giwa-release-1-2-local-completion-freeze.md).
Local completion does not authorize staging, committing, Git publication, or a
chain transaction.

**Goal:** Remove the current judge-facing state, link, count, history, and recovery inconsistencies without changing valid Manifest, verifier, Receipt, contract, or participant-capability semantics.

**Architecture:** Keep the dependency-light browser runtimes and existing live API. Add small pure projection helpers at the presentation and local-history boundaries, then drive the DOM from those projections. Change the public campaign model only to separate the approval branch from the monotonic evidence funnel; all other behavior remains compatible with existing matched Receipt records.

**Tech Stack:** Node.js, TypeScript 6, Vitest, browser JavaScript, CSS, local SQLite live store, existing static and live servers.

## Global Constraints

- Public product name remains `GIWA Verified Intent Rail`.
- GIWA Sepolia testnet and mock assets only.
- Do not claim real funds, yield, RWA issuance, settlement, KYC, identity,
  security guarantees, mainnet readiness, or finality.
- Preserve all valid Manifest, verifier-input, transaction, and Receipt hashes.
- Do not change contract behavior or perform a chain transaction.
- Public proof must remain fail-closed and capability-free.
- A public caller may distinguish malformed input from
  `not found or not public`, but may not discover pending, failed, or
  mismatched private runs.
- Preserve the participant run capability boundary.
- Preserve the 12-item local Receipt history bound.
- Do not add a runtime dependency.
- Do not stage, commit, branch, push, deploy, or mutate Lightsail.
- Follow RED → GREEN → REFACTOR for every behavior change.

---

### Task 1: Correct the pre-execution Receipt state and wallet recovery copy

**Files:**
- Modify: `apps/web/public/user-flow.js:928-944`
- Modify: `apps/web/public/user-flow.js:1559-1569`
- Test: `apps/web/src/lib/userFlow/userProtocolConsolePresentation.test.ts`
- Test: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`

**Interfaces:**
- Consumes: `walletState`, the existing `publicNotice(kind)` call sites, and
  wallet-provider errors from `onPrimaryAction()`.
- Produces:
  - `walletRequestFailureCode(error): "wallet_rejected" | "wallet_unavailable"`
  - `walletRequestNotice(code): string`
  - a neutral promised-Receipt badge using
    `protocol-status-badge pending`.

- [ ] **Step 1: Add failing Mission presentation assertions**

In `userProtocolConsolePresentation.test.ts`, add:

```ts
it("keeps the promised Receipt neutral before wallet execution", () => {
  const source = readUserFlow();
  const start = source.indexOf("function renderPromisedReceipt");
  const end = source.indexOf("function renderMissionCockpitPage", start);
  const promisedReceipt = source.slice(start, end);

  expect(promisedReceipt).toContain('className: "protocol-status-badge pending"');
  expect(promisedReceipt).toContain('text: "발급 조건"');
  expect(promisedReceipt).toContain("4/4 조건 일치 필요");
  expect(promisedReceipt).not.toContain("검증 완료");
  expect(promisedReceipt).not.toContain(
    'className: "protocol-status-badge verified"'
  );
});
```

- [ ] **Step 2: Add failing wallet-error projection tests**

In `userPublicBoundary.test.ts`, add:

```ts
it("distinguishes missing, rejected, and unavailable wallet requests", () => {
  const source = readWebFile("public/user-flow.js");
  const functions = standaloneFunctions<{
    walletRequestFailureCode: (
      error: unknown
    ) => "wallet_rejected" | "wallet_unavailable";
    walletRequestNotice: (
      code: "provider_missing" | "wallet_rejected" | "wallet_unavailable"
    ) => string;
  }>(source, ["walletRequestFailureCode", "walletRequestNotice"]);

  expect(functions.walletRequestFailureCode({ code: 4001 })).toBe(
    "wallet_rejected"
  );
  expect(functions.walletRequestFailureCode({ code: "ACTION_REJECTED" })).toBe(
    "wallet_rejected"
  );
  expect(functions.walletRequestFailureCode(new Error("other"))).toBe(
    "wallet_unavailable"
  );
  expect(functions.walletRequestNotice("provider_missing")).toContain(
    "브라우저 지갑을 설치하거나 활성화"
  );
  expect(functions.walletRequestNotice("wallet_rejected")).toContain(
    "연결 요청을 거절"
  );
  expect(functions.walletRequestNotice("wallet_unavailable")).toContain(
    "지갑 창과 연결 상태"
  );
  expect(source).toContain('publicNotice("network")');
});
```

The wrong-network path already has distinct recovery copy; keep it separate
while splitting the three wallet-request cases.

- [ ] **Step 3: Run the focused tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run `
  src/lib/userFlow/userProtocolConsolePresentation.test.ts `
  src/lib/userFlow/userPublicBoundary.test.ts
```

Expected: FAIL because the promised Receipt is still verified and the two
wallet projection functions do not exist.

- [ ] **Step 4: Implement the minimal pure wallet projections**

Add before `publicNotice()` in `user-flow.js`:

```js
function walletRequestFailureCode(error) {
  const code =
    error !== null && typeof error === "object" && "code" in error
      ? error.code
      : null;
  return code === 4001 || code === "ACTION_REJECTED"
    ? "wallet_rejected"
    : "wallet_unavailable";
}

function walletRequestNotice(code) {
  const copy = {
    provider_missing:
      "이 브라우저에서 지갑을 찾지 못했습니다. 지원되는 브라우저 지갑을 설치하거나 활성화해 주세요.",
    wallet_rejected:
      "지갑 연결 요청을 거절했습니다. 준비되면 연결을 다시 요청해 주세요.",
    wallet_unavailable:
      "지갑 요청을 완료하지 못했습니다. 지갑 창과 연결 상태를 확인한 뒤 다시 시도해 주세요."
  };
  return copy[code] ?? copy.wallet_unavailable;
}
```

Change `publicNotice()` to accept an optional reason:

```js
function publicNotice(kind, reason = null) {
  if (kind === "wallet") {
    return walletRequestNotice(reason ?? "wallet_unavailable");
  }
  const notices = {
    network: "GIWA Sepolia로 전환한 뒤 다시 시도해 주세요.",
    readiness: "지갑 자산 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    faucet: "공식 테스트 ETH 안내를 새 창에서 열었습니다. 수령 후 다시 확인해 주세요.",
    mint: "Mock Token 준비가 완료되지 않았습니다. 지갑에서 트랜잭션 상태를 확인해 주세요.",
    manifest: "Manifest를 만들지 못했습니다. 현재 지갑과 네트워크를 확인해 주세요.",
    approve: "정확한 수량 승인 요청이 완료되지 않았습니다. 지갑에서 다시 시도해 주세요.",
    deposit: "Vault 예치 요청이 완료되지 않았습니다. 트랜잭션을 다시 보내지 말고 상태를 확인해 주세요.",
    verify: "Standard RPC 검증이 아직 완료되지 않았습니다. 같은 버튼으로 다시 시도할 수 있습니다.",
    recovery: "현재 탭의 활성 실행이 없습니다. 액션 화면에서 새 Manifest를 시작해 주세요.",
    copy: "복사하지 못했습니다. 링크를 직접 선택해 주세요.",
    context: "지갑 정보가 변경되어 이전 Manifest를 폐기했습니다. 현재 지갑으로 다시 시작해 주세요."
  };
  return notices[kind] ?? "요청을 완료하지 못했습니다. 현재 단계에서 다시 시도해 주세요.";
}
```

At the provider-missing branch, call:

```js
notice = publicNotice("wallet", "provider_missing");
```

At the wallet request catch branch, call:

```js
notice = publicNotice("wallet", walletRequestFailureCode(error));
```

- [ ] **Step 5: Make the promised Receipt neutral**

Change `renderPromisedReceipt()` to:

```js
function renderPromisedReceipt() {
  return view("div", { className: "mission-receipt-preview" }, [
    view("div", {}, [
      view("strong", { text: "받게 될 결과 · Matched Receipt" }),
      view("span", { text: "4/4 조건 일치 필요" })
    ]),
    view("span", {
      className: "protocol-status-badge pending",
      text: "발급 조건"
    })
  ]);
}
```

Keep the existing pending status colors. Do not introduce a new decorative
color.

- [ ] **Step 6: Run the focused tests and confirm GREEN**

Run the Step 3 command.

Expected: both test files PASS.

- [ ] **Step 7: Inspect the task diff**

Run:

```powershell
git diff -- `
  apps/web/public/user-flow.js `
  apps/web/src/lib/userFlow/userProtocolConsolePresentation.test.ts `
  apps/web/src/lib/userFlow/userPublicBoundary.test.ts
```

Expected: only the neutral promised state, bounded wallet failure projection,
and their tests changed.

---

### Task 2: Align Receipt destinations and evidence-time labels

**Files:**
- Modify: `apps/web/src/lib/userFlow/userReceiptView.ts:64-110`
- Modify: `apps/web/src/lib/userFlow/userReceiptView.test.ts`
- Modify: `apps/web/public/user-flow.js:2762-2808`
- Modify: `apps/web/public/flow.js:684-724`
- Test: `apps/web/src/lib/userFlow/userProtocolConsolePresentation.test.ts`
- Test: `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`

**Interfaces:**
- Consumes: a matched Receipt hash and the existing public Receipt model.
- Produces:
  - Proof Ledger path `/evidence?hash=<receiptHash>`
  - separately named public Receipt detail path where needed
  - `Verification snapshot` confirmation copy
  - no empty `Decoded logs` disclosure.

- [ ] **Step 1: Change the Receipt view expectation first**

In `userReceiptView.test.ts`, change the expected public proof path to:

```ts
expect(receipt.publicProof.path).toBe(
  `/evidence?hash=${receiptInput.receiptHash}`
);
```

Add:

```ts
expect(receipt.publicProof.label).toBe("Proof Ledger에서 공개 검증");
```

- [ ] **Step 2: Add failing source-contract assertions**

In `userProtocolConsolePresentation.test.ts`, change the Receipt continuation
test to require:

```ts
expect(source).toContain("/evidence?hash=");
expect(source).toContain("공개 Receipt 상세 보기");
expect(source).not.toContain(
  'const proofPath =\n    matched && receiptHash !== null\n      ? `/receipt/${receiptHash}`'
);
```

In `livePublicReceiptRoute.test.ts`, add:

```ts
it("labels confirmations as a verification snapshot and hides empty logs", () => {
  expect(source).toContain("Verification snapshot");
  expect(source).toContain("decodedLogSummary.length > 0");
  expect(source).not.toContain('field("Confirmation depth"');
});
```

- [ ] **Step 3: Run the focused tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run `
  src/lib/userFlow/userReceiptView.test.ts `
  src/lib/userFlow/userProtocolConsolePresentation.test.ts `
  src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: FAIL on the old `/receipt/` proof path, old confirmation label, and
unconditional empty log disclosure.

- [ ] **Step 4: Update the TypeScript Receipt projection**

In `buildUserReceiptView()`:

```ts
const publicProofPath =
  input.receiptHash === null
    ? null
    : `/evidence?hash=${input.receiptHash}`;
```

Do not encode or truncate a value that has already passed the strict Receipt
hash boundary.

- [ ] **Step 5: Update the browser Receipt continuation**

In `renderReceiptNextParticipation()`:

```js
const proofPath =
  matched && receiptHash !== null
    ? `/evidence?hash=${receiptHash}`
    : null;
```

Keep the existing two-card route structure. Leave Route A as Campaign Studio
and replace Route B with:

```js
routeCard(
  "ROUTE B",
  "Proof Ledger",
  "Receipt, Intent 또는 트랜잭션 hash로 같은 공개 증거를 다시 확인합니다.",
  "Proof Ledger에서 공개 검증",
  proofPath
)
```

In `renderReceiptArtifact()`, compute:

```js
const publicReceiptPath =
  matched && receiptHash !== null
    ? `/receipt/${receiptHash}`
    : null;
```

In `.receipt-artifact-utilities`, add this compact utility immediately before
Explorer:

```js
publicReceiptPath === null
  ? view("span", {
      className: "disabled-link",
      text: "공개 Receipt 상세 보기"
    })
  : view("a", {
      className: "secondary-link",
      href: publicReceiptPath,
      text: "공개 Receipt 상세 보기"
    })
```

Do not add a third route card and do not relabel the public Receipt as Proof
Ledger.

- [ ] **Step 6: Correct the verification snapshot and decoded-log disclosure**

In `renderReceiptRoute()` replace:

```js
field("Confirmation depth", receipt.confirmationDepth)
```

with:

```js
field(
  "Verification snapshot",
  `${receipt.confirmationDepth} confirmations observed`
)
```

Build the decoded log disclosure conditionally:

```js
const decodedLogs = model.partnerConsole.evidenceCards.decodedLogSummary;
const decodedLogPanel =
  decodedLogs.length > 0
    ? el("details", { className: "panel" }, [
        el("summary", { text: "Decoded logs" }),
        el(
          "div",
          { className: "log-list" },
          decodedLogs.map((log) =>
            el("div", { className: "event-row" }, [
              el("span", { text: `${log.eventName} #${log.logIndex}` }),
              el("span", {
                className: "mono hash-wrap",
                text: shortHash(log.contractAddress)
              })
            ])
          )
        )
      ])
    : null;
```

Append `decodedLogPanel` only when it is non-null.

- [ ] **Step 7: Run the focused tests and confirm GREEN**

Run the Step 3 command.

Expected: all three test files PASS.

- [ ] **Step 8: Inspect the task diff**

Run:

```powershell
git diff -- `
  apps/web/src/lib/userFlow/userReceiptView.ts `
  apps/web/src/lib/userFlow/userReceiptView.test.ts `
  apps/web/public/user-flow.js `
  apps/web/public/flow.js `
  apps/web/src/lib/userFlow/userProtocolConsolePresentation.test.ts `
  apps/web/src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: only destination semantics, snapshot copy, conditional log rendering,
and their tests changed.

---

### Task 3: Make Campaign Receipt handoff truthful and narrative-safe

**Files:**
- Modify: `apps/web/public/flow.js:888-1046`
- Modify: `apps/web/public/styles.css`
- Test: `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`

**Interfaces:**
- Consumes: sorted public Receipt rows, an optional selected Receipt hash, and
  matched count.
- Produces:
  - `projectCampaignReceiptHandoff(receipts, selectedHash, matchedCount)`
  - a top Campaign handoff summary
  - latest/selected copy that never mislabels an older Receipt
  - focus on the summary rather than the ledger row.

- [ ] **Step 1: Add failing pure projection tests**

Add the local `standaloneFunction()` helper to
`publicCampaignStudioPresentation.test.ts` if it is not already present, then
add:

```ts
it("distinguishes the newest Receipt from an older selected Receipt", () => {
  const project = standaloneFunction<
    (
      receipts: Array<{ receiptHash: string }>,
      selectedHash: string | null,
      matchedCount: number
    ) => null | {
      index: number;
      latest: boolean;
      eyebrow: string;
      message: string;
    }
  >(source, "projectCampaignReceiptHandoff");
  const newest = `0x${"a".repeat(64)}`;
  const older = `0x${"b".repeat(64)}`;
  const receipts = [{ receiptHash: newest }, { receiptHash: older }];

  expect(project(receipts, newest, 4)).toMatchObject({
    index: 0,
    latest: true,
    eyebrow: "방금 발급된 Receipt",
    message: "방금 발급된 Receipt · 3 → 4"
  });
  expect(project(receipts, older, 4)).toMatchObject({
    index: 1,
    latest: false,
    eyebrow: "선택한 Receipt",
    message: "선택한 Receipt · 현재 4건 중 포함"
  });
  expect(project(receipts, null, 4)).toBeNull();
});
```

Add presentation assertions:

```ts
expect(source).toContain('id: "campaign-receipt-handoff"');
expect(source).toContain('href: `#receipt-row-${handoff.index}`');
expect(source).toContain(
  'document.querySelector("#campaign-receipt-handoff")?.focus()'
);
expect(source).not.toContain(
  'document.querySelector(`#receipt-row-${index}`)?.focus()'
);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run `
  src/lib/partner/publicCampaignStudioPresentation.test.ts
```

Expected: FAIL because the handoff projection and summary do not exist.

- [ ] **Step 3: Add the pure handoff projection**

Add before `renderPublicCampaignStudio()`:

```js
function projectCampaignReceiptHandoff(
  receipts,
  selectedHash,
  matchedCount
) {
  if (selectedHash === null) return null;
  const index = receipts.findIndex(
    (row) => row.receiptHash === selectedHash
  );
  if (index < 0) return null;
  const latest = index === 0;
  return {
    index,
    latest,
    eyebrow: latest ? "방금 발급된 Receipt" : "선택한 Receipt",
    message: latest
      ? `방금 발급된 Receipt · ${Math.max(0, matchedCount - 1)} → ${matchedCount}`
      : `선택한 Receipt · 현재 ${matchedCount}건 중 포함`
  };
}
```

- [ ] **Step 4: Render the handoff before the detailed sections**

Compute:

```js
const handoff = projectCampaignReceiptHandoff(
  model.receipts,
  highlightedReceipt,
  matchedCount
);
```

Immediately after the hero, render when non-null:

```js
el(
  "section",
  {
    className: "campaign-receipt-handoff",
    id: "campaign-receipt-handoff",
    tabindex: "-1"
  },
  [
    el("p", { className: "eyebrow", text: handoff.eyebrow }),
    el("h2", { text: "이 Receipt가 현재 공개 집계에 포함됐습니다." }),
    el("p", { text: handoff.message }),
    el("a", {
      className: "secondary-link",
      href: `#receipt-row-${handoff.index}`,
      text: "Receipt 행 확인"
    })
  ]
)
```

In the row, use `handoff.eyebrow` only for the selected row. Remove the old
unconditional transition paragraph from the Proof Ledger section.

After append:

```js
if (handoff !== null) {
  document.querySelector("#campaign-receipt-handoff")?.focus();
}
```

- [ ] **Step 5: Add minimal handoff styling**

In `styles.css`:

```css
.campaign-receipt-handoff {
  width: min(100% - 96px, 1200px);
  margin: 24px auto 0;
  border-left: 3px solid var(--protocol-verified);
  padding: 18px 22px;
  background: var(--protocol-verified-soft);
}

.campaign-receipt-handoff h2,
.campaign-receipt-handoff p {
  margin-block: 0;
}

.campaign-receipt-handoff h2 {
  margin-top: 6px;
}

.campaign-receipt-handoff .secondary-link {
  margin-top: 14px;
}
```

At `max-width: 720px`, use `width: min(100% - 32px, 620px)` and preserve a
minimum 44px action target.

- [ ] **Step 6: Run the focused test and confirm GREEN**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 7: Inspect the task diff**

Run:

```powershell
git diff -- `
  apps/web/public/flow.js `
  apps/web/public/styles.css `
  apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts
```

Expected: only truthful handoff projection, summary focus, scoped styles, and
tests changed.

---

### Task 4: Separate the approval branch from the monotonic evidence funnel

**Files:**
- Modify: `apps/web/src/lib/partner/publicCampaignStudio.ts:6-77`
- Modify: `apps/web/src/lib/partner/publicCampaignStudio.ts:212-265`
- Modify: `apps/web/src/lib/partner/publicCampaignStudio.test.ts`
- Modify: `apps/web/public/flow.js:744-875`
- Modify: `apps/web/public/flow.js:935-958`
- Test: `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`

**Interfaces:**
- Consumes: campaign-scoped runs and submitted transaction records.
- Produces:
  - a monotonic evidence funnel without approval branch steps
  - `approvalPaths: { exactApprovalSubmitted, exactApprovalConfirmed, approvalNotRequired, depositSubmitted }`
  - a separate public Approval path summary.

- [ ] **Step 1: Write failing campaign-model tests**

In `publicCampaignStudio.test.ts`, add a fixture case containing two submitted
deposits: one with an approve transaction hash and one with
`approveTxHash: null`. Assert:

```ts
expect(model.approvalPaths).toEqual({
  exactApprovalSubmitted: 1,
  exactApprovalConfirmed: 1,
  approvalNotRequired: 1,
  depositSubmitted: 2
});
expect(model.funnel.map((step) => step.id)).not.toContain("approveSubmitted");
expect(model.funnel.map((step) => step.id)).not.toContain("approveConfirmed");

const counts = model.funnel
  .map((step) => step.count)
  .filter((count): count is number => count !== null);
expect(counts.every((count, index) => index === 0 || count <= counts[index - 1]!))
  .toBe(true);
```

Use fixture run states that produce:

```text
Manifest 2
Deposit submitted 2
Deposit confirmed 2
Verifier checking 2
Matched 1
Receipt issued 1
```

- [ ] **Step 2: Add failing presentation assertions**

In `publicCampaignStudioPresentation.test.ts`, update the fixture with:

```ts
approvalPaths: {
  exactApprovalSubmitted: 3,
  exactApprovalConfirmed: 2,
  approvalNotRequired: 1,
  depositSubmitted: 4
}
```

Assert:

```ts
expect(source).toContain("Approval path");
expect(source).toContain("정확한 승인 제출");
expect(source).toContain("승인 확인");
expect(source).toContain("기존 허용량으로 승인 생략");
expect(source).not.toContain('"approveSubmitted"');
expect(source).not.toContain('"approveConfirmed"');
```

The separate Approval path uses the new `approvalPaths` field names, so these
negative assertions do not reject its user-facing copy.

- [ ] **Step 3: Run the focused tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run `
  src/lib/partner/publicCampaignStudio.test.ts `
  src/lib/partner/publicCampaignStudioPresentation.test.ts
```

Expected: FAIL because `approvalPaths` does not exist and approval counts remain
inside the funnel.

- [ ] **Step 4: Change the public campaign model**

Remove `approveSubmitted` and `approveConfirmed` from
`PublicCampaignFunnelId`.

Add to `PublicCampaignStudio`:

```ts
approvalPaths: {
  exactApprovalSubmitted: number;
  exactApprovalConfirmed: number;
  approvalNotRequired: number;
  depositSubmitted: number;
};
```

Before returning:

```ts
const exactApprovalSubmitted = submitted.filter(
  (item) => item.tx.approveTxHash !== null
).length;
const exactApprovalConfirmed = submitted.filter(
  (item) =>
    item.tx.approveTxHash !== null &&
    CONFIRMED_APPROVAL_STATUSES.has(item.run.status)
).length;
const approvalNotRequired =
  submittedDepositCount - exactApprovalSubmitted;
```

Return:

```ts
approvalPaths: {
  exactApprovalSubmitted,
  exactApprovalConfirmed,
  approvalNotRequired,
  depositSubmitted: submittedDepositCount
},
funnel: [
  notCapturedStep("campaignVisited", "캠페인 방문"),
  notCapturedStep("walletConnected", "지갑 연결"),
  derivedStep("manifestIssued", "Manifest 발급", runs.length),
  derivedStep("depositSubmitted", "예치 제출", submittedDepositCount),
  derivedStep(
    "depositConfirmed",
    "예치 확인",
    runs.filter((run) => CONFIRMED_DEPOSIT_STATUSES.has(run.status)).length
  ),
  derivedStep(
    "verifierChecking",
    "Verifier 대조",
    runs.filter((run) => VERIFIER_STATUSES.has(run.status)).length
  ),
  derivedStep("matched", "조건 일치", matchedReceiptCount),
  derivedStep("receiptIssued", "Receipt 발급", matchedReceiptCount)
]
```

Keep `CONFIRMED_APPROVAL_STATUSES` for the approval confirmation branch.

- [ ] **Step 5: Update the strict browser projection**

In `projectPublicCampaignStudio()`, require four safe non-negative integers:

```js
const approvalPaths = body.approvalPaths;
if (
  !object(approvalPaths) ||
  !Number.isSafeInteger(approvalPaths?.exactApprovalSubmitted) ||
  approvalPaths.exactApprovalSubmitted < 0 ||
  !Number.isSafeInteger(approvalPaths?.exactApprovalConfirmed) ||
  approvalPaths.exactApprovalConfirmed < 0 ||
  !Number.isSafeInteger(approvalPaths?.approvalNotRequired) ||
  approvalPaths.approvalNotRequired < 0 ||
  !Number.isSafeInteger(approvalPaths?.depositSubmitted) ||
  approvalPaths.depositSubmitted < 0 ||
  approvalPaths.exactApprovalConfirmed >
    approvalPaths.exactApprovalSubmitted ||
  approvalPaths.exactApprovalSubmitted +
      approvalPaths.approvalNotRequired !==
    approvalPaths.depositSubmitted
) {
  return null;
}
```

Project only the four normalized fields. Do not spread the input object:

```js
approvalPaths: {
  exactApprovalSubmitted: approvalPaths.exactApprovalSubmitted,
  exactApprovalConfirmed: approvalPaths.exactApprovalConfirmed,
  approvalNotRequired: approvalPaths.approvalNotRequired,
  depositSubmitted: approvalPaths.depositSubmitted
}
```

- [ ] **Step 6: Render the separate Approval path**

After the funnel section:

```js
el("section", { className: "studio-section" }, [
  el("div", { className: "section-heading" }, [
    el("div", {}, [
      el("p", { className: "eyebrow", text: "Approval path" }),
      el("h2", { text: "승인은 필요한 실행에서만 제출됩니다" })
    ])
  ]),
  el("dl", { className: "studio-policy" }, [
    field(
      "정확한 승인 제출",
      `${model.approvalPaths.exactApprovalSubmitted}건`
    ),
    field(
      "승인 확인",
      `${model.approvalPaths.exactApprovalConfirmed}건`
    ),
    field(
      "기존 허용량으로 승인 생략",
      `${model.approvalPaths.approvalNotRequired}건`
    ),
    field(
      "예치 제출",
      `${model.approvalPaths.depositSubmitted}건`
    )
  ])
])
```

- [ ] **Step 7: Run the focused tests and confirm GREEN**

Run the Step 3 command.

Expected: both test files PASS and the numeric funnel is monotonic for the
fixture.

- [ ] **Step 8: Run affected live API tests**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run `
  src/lib/live/liveApi.test.ts `
  src/lib/live/participantPartnerLoop.test.ts `
  src/lib/partner/publicCampaignStudio.test.ts `
  src/lib/partner/publicCampaignStudioPresentation.test.ts
```

Expected: all affected live and presentation tests PASS.

- [ ] **Step 9: Inspect the task diff**

Run:

```powershell
git diff -- `
  apps/web/src/lib/partner/publicCampaignStudio.ts `
  apps/web/src/lib/partner/publicCampaignStudio.test.ts `
  apps/web/public/flow.js `
  apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts
```

Expected: approval branching changed without widening public or tenant
boundaries.

---

### Task 5: Promote local Receipt history by stable execution identity

**Files:**
- Create: `apps/web/src/lib/userFlow/userReceiptHistoryRuntime.test.ts`
- Modify: `apps/web/public/user-flow.js:2494-2515`
- Modify: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`

**Interfaces:**
- Consumes: the existing bounded local Receipt history and current `runState`.
- Produces:
  - `upsertReceiptHistory(items, next): unknown[]`
  - stable history identity using `runId`, then deposit transaction, then
    Receipt hash
  - promotion of pending to verified without a duplicate row.

- [ ] **Step 1: Create the failing runtime-history test**

Create `userReceiptHistoryRuntime.test.ts` with the existing
`readUserFlow()` and `standaloneFunction()` helpers used by neighboring
presentation tests, then add:

```ts
describe("upsertReceiptHistory", () => {
  const upsert = standaloneFunction<
    (
      items: Array<Record<string, unknown>>,
      next: Record<string, unknown>
    ) => Array<Record<string, unknown>>
  >(readUserFlow(), "upsertReceiptHistory");

  it("promotes one run from pending to verified without duplication", () => {
    const runId = "run_1";
    const depositTxHash = `0x${"a".repeat(64)}`;
    const receiptHash = `0x${"b".repeat(64)}`;
    const pending = {
      id: runId,
      runId,
      state: "pending",
      depositTxHash,
      receiptHash: null
    };
    const verified = {
      id: runId,
      runId,
      state: "verified",
      depositTxHash,
      receiptHash
    };

    expect(upsert([pending], verified)).toEqual([verified]);
  });

  it("deduplicates legacy deposit and Receipt identities", () => {
    const depositTxHash = `0x${"c".repeat(64)}`;
    const receiptHash = `0x${"d".repeat(64)}`;
    const legacy = {
      id: depositTxHash,
      state: "pending",
      depositTxHash,
      receiptHash: null
    };
    const verified = {
      id: "run_2",
      runId: "run_2",
      state: "verified",
      depositTxHash,
      receiptHash
    };

    expect(upsert([legacy], verified)).toEqual([verified]);
  });

  it("keeps the history bounded to twelve entries", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `run_${index}`,
      runId: `run_${index}`
    }));
    expect(upsert(items, { id: "new", runId: "new" })).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Add a failing public-boundary assertion**

In `userPublicBoundary.test.ts`, require the stored projection to include
`runId` but not `runCapability`:

```ts
expect(receiptProjection).toContain("runId: runState?.runId ?? null");
expect(receiptProjection).toContain("upsertReceiptHistory(items, next)");
expect(receiptProjection).not.toMatch(/runCapability|capabilityHash/u);
```

- [ ] **Step 3: Run the focused tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run `
  src/lib/userFlow/userReceiptHistoryRuntime.test.ts `
  src/lib/userFlow/userPublicBoundary.test.ts
```

Expected: FAIL because `upsertReceiptHistory()` and stable run projection do
not exist.

- [ ] **Step 4: Add the self-contained upsert helper**

Before `storeReceiptProjection()`:

```js
function upsertReceiptHistory(items, next) {
  const keys = (item) =>
    [item?.runId, item?.depositTxHash, item?.receiptHash]
      .filter((value) => typeof value === "string" && value.length > 0);
  const nextKeys = new Set(keys(next));
  const filtered = items.filter(
    (item) => !keys(item).some((key) => nextKeys.has(key))
  );
  return [next, ...filtered].slice(0, 12);
}
```

The helper intentionally ignores arbitrary object fields and only compares the
three public-safe execution identities.

- [ ] **Step 5: Store and promote by run ID**

Change `storeReceiptProjection()`:

```js
function storeReceiptProjection(state = receiptStateFromRun()) {
  const items = readReceiptHistory();
  const id =
    runState?.runId ??
    runState?.depositTxHash ??
    runState?.receiptHash;
  if (!id) return;
  const next = {
    id,
    runId: runState?.runId ?? null,
    state,
    actionName:
      runState?.manifestPreview?.actionName ??
      "Mock vault 테스트넷 액션",
    receiptHash: runState?.receiptHash ?? null,
    depositTxHash: runState?.depositTxHash ?? null,
    networkName: "GIWA Sepolia",
    savedAt: new Date().toISOString()
  };
  writeReceiptHistory(upsertReceiptHistory(items, next));
}
```

Do not store capability, signature, private error, or full Manifest fields.

- [ ] **Step 6: Run the focused tests and confirm GREEN**

Run the Step 3 command.

Expected: both test files PASS.

- [ ] **Step 7: Inspect the task diff**

Run:

```powershell
git diff -- `
  apps/web/public/user-flow.js `
  apps/web/src/lib/userFlow/userReceiptHistoryRuntime.test.ts `
  apps/web/src/lib/userFlow/userPublicBoundary.test.ts
```

Expected: one stable upsert helper, one runtime test file, and no capability
leak.

---

### Task 6: Separate malformed proof input from fail-closed absence

**Files:**
- Modify: `apps/web/public/flow.js:1049-1110`
- Modify: `apps/web/public/flow.js:1241-1258`
- Test: `apps/web/src/lib/flow/publicEvidencePresentation.test.ts`
- Test: `apps/web/src/lib/live/publicProofLookup.test.ts`

**Interfaces:**
- Consumes: one raw query string and an optional matched public proof.
- Produces:
  - `projectProofSearchState(query, proof): "idle" | "malformed" | "not-found-or-not-public" | "matched"`
  - `proofSearchEmptyCopy(state): { title: string; body: string }`
  - distinct malformed copy
  - one fail-closed absence state for valid but unavailable public hashes.

- [ ] **Step 1: Add failing state projection tests**

In `publicEvidencePresentation.test.ts`, add:

```ts
it("separates malformed input from fail-closed public absence", () => {
  const project = standaloneFunction<
    (
      query: string,
      proof: typeof proofFixture | null
    ) => "idle" | "malformed" | "not-found-or-not-public" | "matched"
  >(source, "projectProofSearchState");
  const copy = standaloneFunction<
    (
      state: "idle" | "malformed" | "not-found-or-not-public"
    ) => { title: string; body: string }
  >(source, "proofSearchEmptyCopy");

  expect(project("", null)).toBe("idle");
  expect(project("0x123", null)).toBe("malformed");
  expect(project(receiptHash, null)).toBe("not-found-or-not-public");
  expect(project(receiptHash, proofFixture)).toBe("matched");
  expect(copy("malformed").body).toContain(
    "올바른 0x 형식의 32-byte hash"
  );
  expect(copy("not-found-or-not-public").body).toContain(
    "공개 증거가 없거나 아직 공개 대상이 아닙니다."
  );
});
```

Add source assertions:

```ts
expect(source).toContain("올바른 0x 형식의 32-byte hash를 입력해 주세요.");
expect(source).toContain("공개 증거가 없거나 아직 공개 대상이 아닙니다.");
expect(source).not.toContain("대기·실패·불일치 실행은 공개되지 않습니다.");
```

- [ ] **Step 2: Preserve the lookup privacy test**

In `publicProofLookup.test.ts`, retain or add:

```ts
expect(
  lookupPublicMatchedProof({
    store: fixture.store,
    queryHash: fixture.pendingDeposit
  })
).toBeNull();
expect(
  lookupPublicMatchedProof({
    store: fixture.store,
    queryHash: fixture.mismatchIntent
  })
).toBeNull();
```

This test must remain GREEN before and after the presentation change.

- [ ] **Step 3: Run the focused tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run `
  src/lib/flow/publicEvidencePresentation.test.ts `
  src/lib/live/publicProofLookup.test.ts
```

Expected: the presentation test FAILS because the projection and distinct copy
do not exist; the lookup privacy test remains PASS.

- [ ] **Step 4: Add the pure proof state projection**

Before `renderPublicEvidenceSearch()`:

```js
function projectProofSearchState(query, proof) {
  if (query === "") return "idle";
  if (!/^0x[a-fA-F0-9]{64}$/u.test(query)) return "malformed";
  return proof === null ? "not-found-or-not-public" : "matched";
}

function proofSearchEmptyCopy(state) {
  const copy = {
    idle: {
      title: "하나의 해시로 같은 실행 증거를 찾습니다",
      body: "지갑 주소가 아니라 Receipt, Deposit transaction 또는 Intent의 정확한 hash로 조회합니다."
    },
    malformed: {
      title: "해시 형식을 확인해 주세요",
      body: "올바른 0x 형식의 32-byte hash를 입력해 주세요."
    },
    "not-found-or-not-public": {
      title: "공개 증거를 찾지 못했습니다.",
      body: "공개 증거가 없거나 아직 공개 대상이 아닙니다."
    }
  };
  return copy[state] ?? copy.idle;
}
```

- [ ] **Step 5: Render safe, distinct messages**

In `renderPublicEvidenceSearch()`:

```js
const state =
  input.state ??
  projectProofSearchState(input.query ?? "", input.proof ?? null);
const emptyCopy =
  proof === null ? proofSearchEmptyCopy(state) : null;
```

Keep the current matched `proof !== null` result branch unchanged. Replace
only its current `state === "not-found"` and idle alternatives with:

```js
el("section", { className: "public-proof-empty" }, [
  el("h2", { text: emptyCopy?.title ?? "" }),
  el("p", { className: "muted", text: emptyCopy?.body ?? "" })
])
```

Do not reveal whether the valid hash belongs to a pending, failed, mismatched,
or unrelated private run.

- [ ] **Step 6: Drive the route through the projection**

In `main()`:

```js
const query = new URLSearchParams(location.search).get("hash") ?? "";
if (query === "" || !/^0x[a-fA-F0-9]{64}$/u.test(query)) {
  renderPublicEvidenceSearch({
    query,
    state: projectProofSearchState(query, null)
  });
  return;
}
const normalizedQuery = query.toLowerCase();
const proof = await fetchPublicMatchedProof(normalizedQuery);
renderPublicEvidenceSearch({
  query: normalizedQuery,
  proof,
  state: projectProofSearchState(normalizedQuery, proof)
});
```

- [ ] **Step 7: Run the focused tests and confirm GREEN**

Run the Step 3 command.

Expected: both test files PASS and private lookup remains fail-closed.

- [ ] **Step 8: Inspect the task diff**

Run:

```powershell
git diff -- `
  apps/web/public/flow.js `
  apps/web/src/lib/flow/publicEvidencePresentation.test.ts `
  apps/web/src/lib/live/publicProofLookup.test.ts
```

Expected: presentation-only state separation and no server disclosure change.

---

### Task 7: Run the Release 1 verification gate

**Files:**
- Inspect: all Release 1 changed files
- Inspect: `docs/superpowers/specs/2026-07-31-giwa-full-platform-evolution-design.md`
- Inspect: `docs/superpowers/plans/2026-07-31-giwa-release-1-trust-integrity.md`

**Interfaces:**
- Consumes: the six completed Release 1 tasks.
- Produces: fresh test, typecheck, build, local smoke, browser, and diff
  evidence for the Release 1 review checkpoint.

- [ ] **Step 1: Run the complete web test suite**

Run:

```powershell
pnpm --filter @giwa/web test
```

Expected: all web test files PASS with zero failures.

- [ ] **Step 2: Run workspace type checking**

Run:

```powershell
pnpm typecheck
```

Expected: exit code `0`.

- [ ] **Step 3: Run the workspace test suite**

Run:

```powershell
pnpm test
```

Expected: exit code `0` with zero test failures.

- [ ] **Step 4: Run the workspace build**

Run:

```powershell
pnpm build
```

Expected: exit code `0`. Regenerated committed projections must either remain
unchanged or be inspected as coupled source-of-truth output.

- [ ] **Step 5: Start the local live server**

Run:

```powershell
pnpm --filter @giwa/web dev:live
```

Keep the yielded process running only for the smoke and browser checks.

- [ ] **Step 6: Run local read-only smoke checks**

Against the local live port, verify:

```text
GET /user
GET /partner?receipt=<known-public-receipt>
GET /receipt/<known-public-receipt>
GET /evidence?hash=<known-public-receipt>
GET /user/receipts
GET /readyz
```

Expected: all routes respond successfully and `/readyz` remains ready.

- [ ] **Step 7: Inspect the corrected browser states**

Using the selected in-app browser, capture and inspect:

1. `/user` before mission review:
   - promised Receipt says `발급 조건`;
   - no pre-execution `검증 완료`.
2. provider-missing wallet attempt:
   - actionable installation or activation guidance.
3. matched participant Receipt:
   - Proof Ledger opens `/evidence?hash=...`;
   - Public Receipt is named separately;
   - confirmation is labeled as a verification snapshot.
4. Campaign Studio with newest Receipt:
   - `방금 발급된`.
5. Campaign Studio with older selected Receipt:
   - `선택한 Receipt`;
   - no fake count transition;
   - focus starts on the handoff summary.
6. Campaign Studio approval path:
   - exact approval and approval-not-required are separate;
   - core funnel counts never increase.
7. `/user/receipts` after pending-to-verified promotion:
   - one row for the execution.
8. Proof Ledger:
   - malformed and fail-closed absence copy are different.

- [ ] **Step 8: Check responsive regressions**

Inspect `/user`, the matched participant Receipt, Campaign Studio, and Proof
Ledger at:

```text
390 × 844
1366 × 768
```

Release 1 does not claim the full 320px redesign; it must, however, avoid
making the known 320px behavior worse.

- [ ] **Step 9: Stop the local live server**

Terminate only the server process started in Step 5. Do not stop unrelated
user processes.

- [ ] **Step 10: Inspect the final Release 1 diff**

Run:

```powershell
git diff --check
git diff --stat
git status --short
```

Then inspect every changed hunk in the Release 1 files. Separate unrelated
pre-existing user changes from the Release 1 diff in the handoff.

- [ ] **Step 11: Request a focused code review**

Use the `requesting-code-review` skill with:

```text
Description:
Release 1 trust and data integrity corrections for pre-execution state,
Receipt destinations, Campaign handoff, approval-path accounting, local
Receipt history promotion, and fail-closed Proof Ledger copy.

Requirements:
docs/superpowers/specs/2026-07-31-giwa-full-platform-evolution-design.md
Release 1 and this implementation plan.
```

Because the worktree contains substantial pre-existing user changes and no
Release 1 commit is authorized, provide the reviewer the exact changed file
list and diff instead of inventing a clean commit range.

- [ ] **Step 12: Resolve review findings**

Fix every Critical or Important finding with a new failing regression test,
then rerun Steps 1–4. Record Minor findings separately only when they are
outside Release 1 scope.

## Release 1 Completion Handoff

Release 1 may be reported complete only when:

- all six behavior tasks have verified RED and GREEN evidence;
- public capability and proof privacy tests remain passing;
- full web tests, workspace typecheck, workspace tests, and workspace build
  pass freshly;
- local live smoke and browser checks pass;
- no caused warning or failure remains;
- the final diff contains no secret, capability, environment value, or
  unrelated refactor; and
- code review has no unresolved Critical or Important finding.

Do not stage, commit, push, deploy, or perform a chain transaction without a
new explicit user direction.

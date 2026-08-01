# GIWA Participation Platform P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. This workspace has an existing
> CODEX-only preference, so use `superpowers:executing-plans` unless the user
> explicitly changes that preference.

**Goal:** Turn the current GIWA Sepolia mock-vault demo into one real
participant journey whose Matched Receipt is reflected in a public-safe,
read-only Partner Studio and exact-hash Proof Ledger.

**Architecture:** Preserve the current Manifest issuer, wallet transactions,
Standard RPC verifier, SQLite store, and matched-only Receipt gate. Add
presentation projections on top of the existing runtime, plus two public
read-only API projections: one for campaign evidence and one for exact-hash
proof lookup. The participant Receipt hash is the identity that joins the user,
partner, and public-proof surfaces.

**Tech Stack:** Node.js, pnpm 10, TypeScript 6, Vitest, browser DOM APIs,
dependency-light HTML/CSS/JavaScript, viem, and the existing SQLite live store.

## Global Constraints

- Public product name is `GIWA Verified Intent Rail`.
- `Loop Rail`, `Looprail`, and `GIWA Verified Activation Rail` remain
  legacy/internal names and must not appear in new public copy.
- The complete P0 remains testnet-only on GIWA Sepolia chain ID `91342`.
- The campaign signer signs the EIP-712 Manifest; the participant signs the
  approve and deposit wallet transactions. Never say that the participant
  signs the Manifest.
- Keep the flagship `mockVaultDeposit` action, exact amount policy, exact
  allowance policy, and current deployed contracts unchanged.
- A Receipt and Exact Execution Seal appear only after the commercial Receipt
  gate passes a terminal `matched` decision.
- Flashblocks may be shown only as non-final early feedback.
- Do not claim real funds, real assets, real yield, TVL, or RWA issuance.
  Do not claim settlement, KYC, identity, eligibility, phishing prevention, security
  approval, finality, trustless verification, or current GIWA Wallet
  integration.
- The P0 Partner Studio is public-safe and read-only. It has no mutation,
  no partner secret, no full-wallet directory, and no manual match override.
- Live, Recorded, and Fixture sources remain visibly separate and are never
  merged into an unlabeled total.
- Public proof lookup returns only gate-passed matched evidence and does not
  reveal whether a pending or mismatched run exists.
- Pretendard Variable remains the default interface font. Monospace is limited
  to hashes and compact technical values.
- Do not add a runtime dependency.
- Preserve unrelated working-tree changes and existing ignored runtime data.
- Do not stage, commit, branch, push, or deploy without explicit Git authorization.
  Commit commands below are conditional on that explicit Git authorization.

---

## File Map

### Participant entry and journey

- `apps/web/public/landing.html`
  - Owns real campaign-entry copy, public metadata, testnet boundary, and links
    into `/user` and `/giwa-demo`.
- `apps/web/public/landing.css`
  - Owns the production landing composition and responsive campaign-entry
    treatment.
- `apps/web/public/landing.js`
  - Preserves the existing scroll story and routes the Receipt proof link.
- `apps/web/public/user.html`
  - Owns the participant document shell and Pretendard loading.
- `apps/web/public/giwa-demo.html`
  - Owns the judge document shell and guided-entry metadata.
- `apps/web/public/user-flow.js`
  - Continues to own wallet, transaction, verification, route rendering, and
    the new five-stage presentation projection.
- `apps/web/public/styles.css`
  - Owns shared Journey Canvas, Receipt, Partner Studio, Proof Ledger,
    accessibility, and mobile styles.
- `apps/web/public/giwa-demo.css`
  - Owns judge-only framing and the controlled Recorded mismatch presentation.

### Public evidence and partner projections

- `apps/web/src/lib/partner/publicCampaignStudio.ts`
  - Builds the public-safe, read-only live Campaign Studio model from the
    existing `LiveStore`.
- `apps/web/src/lib/partner/publicCampaignStudio.test.ts`
  - Proves matched-only KPI derivation, redaction, source labeling, and
    truthful unavailable funnel stages.
- `apps/web/src/lib/live/publicProofLookup.ts`
  - Resolves a Receipt, intent, or deposit transaction hash to one
    gate-passed public proof.
- `apps/web/src/lib/live/publicProofLookup.test.ts`
  - Proves exact-hash lookup, equivalent identity, and non-disclosure for
    non-matched evidence.
- `apps/web/src/lib/live/liveApi.ts`
  - Exposes `GET /api/public/campaign-studio` and
    `GET /api/public/evidence/:hash`.
- `apps/web/src/lib/live/liveApi.test.ts`
  - Guards public endpoint contracts, redaction, and non-disclosure.
- `apps/web/src/lib/live/liveRoutePolicy.ts`
  - Classifies the two new endpoints as public read-only routes.
- `apps/web/src/lib/live/liveRoutePolicy.test.ts`
  - Guards hosted public-route classification.
- `apps/web/public/flow.js`
  - Renders `/partner`, `/evidence`, and `/receipt/:hash` from strict public
    projections.

### Tests, runbook, and release evidence

- `apps/web/src/lib/landing/landingPresentation.test.ts`
  - Guards public naming, campaign entry, testnet boundary, and CTA routing.
- `apps/web/src/lib/userFlow/userJourneyProjection.test.ts`
  - Executes the browser projection and proves the five-stage state mapping.
- `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`
  - Guards the judge route, Recorded mismatch example, and product vocabulary.
- `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`
  - Guards strict Manifest-response projection and ensures the raw signature is
    not retained in browser session state.
- `apps/web/src/lib/userFlow/userReceiptView.test.ts`
  - Guards human-readable Receipt fields and technical disclosure.
- `apps/web/src/lib/userFlow/userReceiptsList.ts`
  - Separates acquired matched Receipts from pending or not-matched recovery
    records.
- `apps/web/src/lib/userFlow/userReceiptsList.test.ts`
  - Guards the acquired-versus-recovery history boundary.
- `apps/web/src/lib/userFlow/userVisualPolish.test.ts`
  - Guards Seal gating, accessibility, responsive behavior, and Receipt-to-
    Partner navigation.
- `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`
  - Guards strict public live Receipt projection and technical proof.
- `apps/web/src/lib/flow/publicEvidencePresentation.test.ts`
  - Guards Proof Ledger input, public lookup projection, and locked result.
- `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`
  - Guards Partner Studio layout, source labels, and highlighted Receipt.
- `apps/web/src/lib/live/participantPartnerLoop.test.ts`
  - Proves that one gate-passed Receipt joins all three public API surfaces.
- `apps/web/src/lib/live/publicCopyGuard.test.ts`
  - Guards approved public naming, signature-role wording, and unsupported
    claims.
- `apps/web/src/lib/live/stagingParticipantFlow.test.ts`
  - Guards the reviewer route order without fabricating navigation.
- `apps/web/src/lib/live/stagingSmokeScript.test.ts`
  - Guards the release smoke surface and credential-safe output.
- `apps/web/scripts/smoke-staging.mjs`
  - Adds safe route and public Campaign Studio API smoke checks.
- `README.md`
  - Updates the route map and P0 stop conditions.
- `docs/implementation/giwa-gasok-staging-runbook.md`
  - Records the 90-second review route and local verification commands.
- `AGENTS.md`
  - Updates only the bounded Project Profile after the behavior exists.

---

### Task 1: Lock Public Naming and Real Campaign Entry

**Files:**

- Modify: `apps/web/src/lib/landing/landingPresentation.test.ts`
- Modify: `apps/web/src/lib/live/publicCopyGuard.test.ts`
- Modify: `apps/web/public/landing.html`
- Modify: `apps/web/public/landing.css`
- Modify: `apps/web/public/giwa-demo.html`
- Modify: `apps/web/public/user.html`
- Modify: `apps/web/public/user-flow.js`

**Interfaces:**

- Consumes: existing `/`, `/user`, `/giwa-demo`, and `/evidence` routes.
- Produces: public metadata and first-read copy using only
  `GIWA Verified Intent Rail`, plus a primary `/user` campaign CTA.

- [ ] **Step 1: Replace legacy public-name expectations with the approved name**

In `landingPresentation.test.ts`, replace the tests that require
`GIWA Looprail` and `Looprail Demo` with:

```ts
it("publishes the approved GIWA Verified Intent Rail identity", () => {
  const html = readWebFile("public/landing.html");
  expect(html).toContain(
    '<meta property="og:site_name" content="GIWA Verified Intent Rail" />'
  );
  expect(html).toContain(
    '<meta property="og:title" content="GIWA Genesis Journey" />'
  );
  expect(html).toContain(
    '<meta name="twitter:title" content="GIWA Genesis Journey" />'
  );
  expect(html).toContain("<title>GIWA Genesis Journey · GIWA Verified Intent Rail</title>");
  expect(html).not.toMatch(/Loop ?Rail|Looprail|GIWA Verified Activation Rail/u);
});

it("starts the real participant journey before the judge guide", () => {
  const html = readWebFile("public/landing.html");
  expect(html).toContain('class="button button-primary" href="/user"');
  expect(html).toContain("미션 보기");
  expect(html).toContain('href="/giwa-demo"');
  expect(html).toContain("90초 데모");
  expect(html).toContain("GIWA Sepolia 테스트넷");
  expect(html).toContain("Mock 자산만 사용");
});
```

Extend `publicCopyGuard.test.ts`:

```ts
expect(copy).not.toMatch(
  /Loop Rail|Looprail|GIWA Verified Activation Rail/u
);
expect(copy).not.toContain("사용자가 Manifest에 서명");
expect(copy).not.toContain("Manifest에 서명하세요");
```

- [ ] **Step 2: Run the naming tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- landingPresentation publicCopyGuard
```

Expected: FAIL because current social metadata and public copy still contain
legacy `Looprail` wording and the primary CTA still points to `/giwa-demo`.

- [ ] **Step 3: Implement the campaign-entry metadata and hero**

Use this exact metadata in `landing.html`:

```html
<title>GIWA Genesis Journey · GIWA Verified Intent Rail</title>
<meta
  name="description"
  content="GIWA Sepolia에서 캠페인이 서명한 조건을 확인하고, 지갑으로 실행한 뒤 Matched Receipt를 받는 테스트넷 여정."
/>
<meta property="og:site_name" content="GIWA Verified Intent Rail" />
<meta property="og:title" content="GIWA Genesis Journey" />
<meta
  property="og:description"
  content="캠페인이 서명한 조건과 GIWA Sepolia 실행이 일치할 때만 Matched Receipt를 발급합니다."
/>
<meta name="twitter:title" content="GIWA Genesis Journey" />
<meta
  name="twitter:description"
  content="캠페인이 서명한 조건과 GIWA Sepolia 실행이 일치할 때만 Matched Receipt를 발급합니다."
/>
```

Replace the hero action group with:

```html
<div class="hero-actions">
  <a class="button button-primary" href="/user">미션 보기</a>
  <a class="button button-secondary" href="/giwa-demo">90초 데모</a>
</div>
<p class="hero-safety">
  GIWA Sepolia 테스트넷 · Mock 자산만 사용 · 실제 자금 및 수익 없음
</p>
```

Keep the existing four-step scroll proof story below the campaign entry.

- [ ] **Step 4: Make the entry read as a real campaign, not a submission deck**

Update the hero copy to:

```html
<p class="eyebrow">GIWA Genesis Journey</p>
<h1>조건을 확인하고,<br />직접 실행해보세요.</h1>
<p class="hero-lead">
  캠페인이 서명한 실행 조건을 먼저 확인합니다. 지갑으로 GIWA Sepolia
  액션을 실행하면, 실제 트랜잭션과 조건이 일치할 때 Matched Receipt를
  받습니다.
</p>
```

Keep `GASOK`, `심사`, `평가자`, and `선발` out of `/`.

In `landing.css`, retain the approved paper/ink/verified tokens and style
`.hero-safety` as secondary text without adding a filled card:

```css
.hero-safety {
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.6;
}
```

- [ ] **Step 5: Align the document shells**

In both `user.html` and `giwa-demo.html`:

- keep `lang="ko"`;
- keep Pretendard Variable;
- keep the existing scripts and styles;
- use `GIWA Verified Intent Rail` in the title; and
- add a testnet description without legacy names.

Use this participant loading copy:

```html
<p class="eyebrow">GIWA Genesis Journey · Testnet</p>
<h1>미션을 불러오는 중</h1>
```

Replace the remaining legacy public demo copy in `user-flow.js`:

```js
"aria-label": "GIWA Verified Intent Rail 작동 방식"
```

and:

```text
GIWA Verified Intent Rail은 실행 전 Manifest와 실제 GIWA 트랜잭션을 대조합니다.
```

- [ ] **Step 6: Run the focused tests and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- landingPresentation publicCopyGuard landingRouting
```

Expected: PASS.

- [ ] **Step 7: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/public/landing.html apps/web/public/landing.css apps/web/public/giwa-demo.html apps/web/public/user.html apps/web/public/user-flow.js apps/web/src/lib/landing/landingPresentation.test.ts apps/web/src/lib/live/publicCopyGuard.test.ts
git commit -m "feat(web): establish GIWA Genesis campaign entry"
```

Otherwise leave the files unstaged.

---

### Task 2: Project the Existing Runtime Into Five Journey Stages

**Files:**

- Create: `apps/web/src/lib/userFlow/userJourneyProjection.test.ts`
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`

**Interfaces:**

- Consumes:
  - existing browser state: `account`, `chainId`, `assetState`, `runState`;
  - existing helpers: `isExpired()`, `receiptStateFromRun()`.
- Produces:
  - `projectJourneyStageState(input): JourneyProjection`;
  - stage IDs: `prepare`, `signedMission`, `execute`, `match`, `collect`;
  - exactly one `active` stage.

- [ ] **Step 1: Write a failing executable projection test**

Create `userJourneyProjection.test.ts` with the existing
`standaloneFunction` helper pattern used by `userPublicBoundary.test.ts`, then
add:

```ts
type ProjectionInput = {
  missionReviewed: boolean;
  walletReady: boolean;
  assetsReady: boolean;
  manifestReady: boolean;
  approvalSubmitted: boolean;
  depositSubmitted: boolean;
  verifying: boolean;
  receiptReady: boolean;
  mismatched: boolean;
};

type Projection = {
  activeStage:
    | "prepare"
    | "signedMission"
    | "execute"
    | "match"
    | "collect";
  stages: Array<{
    id: Projection["activeStage"];
    state: "pending" | "active" | "complete" | "blocked";
  }>;
};

it.each([
  ["prepare", {}, "prepare"],
  [
    "signed mission",
    { missionReviewed: true },
    "signedMission"
  ],
  [
    "execute",
    {
      missionReviewed: true,
      walletReady: true,
      assetsReady: true,
      manifestReady: true
    },
    "execute"
  ],
  [
    "match",
    {
      missionReviewed: true,
      walletReady: true,
      assetsReady: true,
      manifestReady: true,
      depositSubmitted: true,
      verifying: true
    },
    "match"
  ],
  [
    "collect",
    {
      missionReviewed: true,
      walletReady: true,
      assetsReady: true,
      manifestReady: true,
      depositSubmitted: true,
      receiptReady: true
    },
    "collect"
  ]
] as const)("%s maps to %s", (_name, overrides, expected) => {
  const result = projectJourneyStageState({
    missionReviewed: false,
    walletReady: false,
    assetsReady: false,
    manifestReady: false,
    approvalSubmitted: false,
    depositSubmitted: false,
    verifying: false,
    receiptReady: false,
    mismatched: false,
    ...overrides
  });

  expect(result.activeStage).toBe(expected);
  expect(result.stages.filter((stage) => stage.state === "active")).toHaveLength(1);
});

it("blocks collect after a mismatch", () => {
  const result = projectJourneyStageState({
    missionReviewed: true,
    walletReady: true,
    assetsReady: true,
    manifestReady: true,
    approvalSubmitted: true,
    depositSubmitted: true,
    verifying: false,
    receiptReady: false,
    mismatched: true
  });

  expect(result.activeStage).toBe("match");
  expect(result.stages.find((stage) => stage.id === "match")?.state).toBe("blocked");
  expect(result.stages.find((stage) => stage.id === "collect")?.state).toBe("pending");
});
```

- [ ] **Step 2: Run the projection test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- userJourneyProjection
```

Expected: FAIL because `projectJourneyStageState` does not exist.

- [ ] **Step 3: Add the minimal pure runtime projection**

Add this pure function before the render functions in `user-flow.js`:

```js
function projectJourneyStageState(input) {
  const activeStage = input.receiptReady
    ? "collect"
    : input.depositSubmitted || input.verifying || input.mismatched
      ? "match"
      : input.manifestReady
        ? "execute"
        : input.missionReviewed
          ? "signedMission"
          : "prepare";

  const order = ["prepare", "signedMission", "execute", "match", "collect"];
  const activeIndex = order.indexOf(activeStage);
  const stages = order.map((id, index) => ({
    id,
    state:
      id === "match" && input.mismatched
        ? "blocked"
        : index < activeIndex
          ? "complete"
          : index === activeIndex
            ? "active"
            : "pending"
  }));

  return { activeStage, stages };
}
```

Add a `journeyProjection()` adapter that reads existing runtime state without
changing it:

```js
function journeyProjection() {
  const walletReady =
    walletState.account !== null && walletState.chainId === GIWA_CHAIN_ID;
  const assetsReady =
    assetState === "approvalRequired" || assetState === "depositReady";
  const manifestReady =
    runState?.manifestPreview !== null &&
    runState?.manifestPreview !== undefined &&
    runState?.status !== "manifestInvalidated" &&
    !isExpired();
  const depositSubmitted = typeof runState?.depositTxHash === "string";
  const mismatched = ["mismatched", "notMatched", "failed"].includes(
    runState?.status
  );

  return projectJourneyStageState({
    missionReviewed,
    walletReady,
    assetsReady,
    manifestReady,
    approvalSubmitted: typeof runState?.approveTxHash === "string",
    depositSubmitted,
    verifying: depositSubmitted && !mismatched && runState?.status !== "matched",
    receiptReady:
      runState?.status === "matched" &&
      typeof runState?.receiptHash === "string",
    mismatched
  });
}
```

`missionReviewed` is a presentation-only session value. It allows the visitor
to inspect the fixed mission before any wallet request; it does not represent a
signed Manifest or verifier evidence.

- [ ] **Step 4: Replace the three-stage demo expectations**

Update `giwaDemoPresentation.test.ts` to require:

```ts
for (const label of [
  "준비",
  "서명된 미션",
  "실행",
  "대조",
  "Receipt"
]) {
  expect(source).toContain(label);
}
expect(source).toContain("projectJourneyStageState");
expect(source).toContain("journeyProjection");
expect(source).not.toContain('const labels = ["Manifest", "GIWA 실행", "Match", "Receipt"]');
```

Keep the existing single-primary-action and security-boundary assertions.

- [ ] **Step 5: Run the focused tests and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- userJourneyProjection giwaDemoPresentation userPublicBoundary
```

Expected: PASS.

- [ ] **Step 6: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/public/user-flow.js apps/web/src/lib/userFlow/userJourneyProjection.test.ts apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts
git commit -m "feat(web): project the five-stage Genesis journey"
```

Otherwise leave the files unstaged.

---

### Task 3: Render the Journey Canvas and Controlled Mismatch Example

**Files:**

- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/public/giwa-demo.css`
- Modify: `apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts`
- Modify: `apps/web/src/lib/userFlow/userVisualPolish.test.ts`
- Modify: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`

**Interfaces:**

- Consumes: `journeyProjection()`, existing `nextPrimaryAction()`, existing
  wallet and transaction handlers.
- Produces:
  - `renderJourneyRail(projection)`;
  - `renderJourneyCanvas(projection, actions, action)`;
  - a first `미션 조건 보기` action that never calls the wallet;
  - `/giwa-demo?example=mismatch` Recorded example;
  - exactly one `#user-primary-action`.

- [ ] **Step 1: Add failing structure and mismatch tests**

Add to `giwaDemoPresentation.test.ts`:

```ts
expect(source).toContain("renderJourneyRail");
expect(source).toContain("renderJourneyCanvas");
expect(source).toContain('className: "journey-canvas"');
expect(source).toContain('className: "journey-stage-rail"');
expect(source).toContain("캠페인이 이 실행 조건에 서명했습니다.");
expect(source).toContain("참여자는 지갑에서 실제 트랜잭션에 서명합니다.");
expect(source).toContain("GIWA Verified Intent Rail이 두 기록을 대조합니다.");
expect(source).toContain('review_mission: "미션 조건 보기"');
expect(source).toContain('action === "review_mission"');
expect(source).toContain('action !== "review_mission"');
const primaryStart = source.indexOf("function nextPrimaryAction()");
const primaryEnd = source.indexOf("function primaryLabel()", primaryStart);
const primarySource = source.slice(primaryStart, primaryEnd);
expect(primarySource.indexOf("!missionReviewed")).toBeLessThan(
  primarySource.indexOf("walletState.account === null")
);
expect(source).toContain("isRecordedMismatchExample");
expect(source).toContain("Recorded mismatch example");
expect(source).toContain("이 예시는 저장된 불일치 시나리오입니다.");
expect(source.match(/id: "user-primary-action"/gu)).toHaveLength(1);
```

Add to `userVisualPolish.test.ts`:

```ts
expect(css).toContain(".journey-canvas");
expect(css).toContain(".journey-stage-rail");
expect(css).toContain(".journey-condition-table");
expect(css).toContain(".journey-match-table");
expect(css).toContain("@media (max-width: 720px)");
expect(css).toContain("@media (prefers-reduced-motion: reduce)");
expect(css).not.toMatch(/confetti|particle|trophy/iu);
```

- [ ] **Step 2: Run the presentation tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- giwaDemoPresentation userVisualPolish
```

Expected: FAIL because the Journey Canvas and Recorded mismatch route do not
exist.

- [ ] **Step 3: Render a semantic five-stage rail**

Add:

```js
const journeyStageCopy = {
  prepare: ["준비", "네트워크와 테스트 자산을 확인합니다."],
  signedMission: ["서명된 미션", "캠페인이 고정한 실행 조건을 확인합니다."],
  execute: ["실행", "지갑에서 승인과 예치를 진행합니다."],
  match: ["대조", "Manifest와 GIWA 실행 증거를 비교합니다."],
  collect: ["Receipt", "일치한 실행 기록을 받습니다."]
};

function renderJourneyRail(projection) {
  return view(
    "ol",
    {
      className: "journey-stage-rail",
      "aria-label": "GIWA Genesis Journey 진행 상태"
    },
    projection.stages.map((stage, index) => {
      const [label, detail] = journeyStageCopy[stage.id];
      return view(
        "li",
        {
          className: `journey-stage ${stage.state}`,
          "aria-current": stage.state === "active" ? "step" : null
        },
        [
          view("span", {
            className: "journey-stage-index",
            text: String(index + 1).padStart(2, "0")
          }),
          view("span", { className: "journey-stage-copy" }, [
            view("strong", { text: label }),
            view("span", { text: detail })
          ])
        ]
      );
    })
  );
}
```

- [ ] **Step 4: Render human-readable Signed Mission and match tables**

Before wallet connection, render a clearly labeled fixed-policy preview from
the already validated `publicConfig`:

```js
function renderPreIssueMissionPreview() {
  const amount = displayMockAmount(publicConfig.demoAmountBaseUnits);
  return view("section", { className: "journey-condition-table" }, [
    view("p", {
      className: "source-label",
      text: "발급 전 미리보기"
    }),
    field("네트워크", "GIWA Sepolia"),
    field("실행 대상", "Genesis Mock Vault"),
    field("액션", "Mock USDC 예치"),
    field("자산과 수량", `${amount} Mock USDC`),
    field("최대 승인", `${amount} Mock USDC`),
    field("만료", "Manifest 발급 후 1시간"),
    view("p", {
      className: "muted",
      text: "지갑을 연결하면 현재 지갑에 묶인 캠페인 서명 Manifest를 발급합니다."
    })
  ]);
}
```

This preview is not called signed evidence and does not show an `intentHash`.

After issuance, use the strict `runState.manifestPreview` fields. Strengthen
the browser boundary without retaining the raw signature:

```js
const manifestSignature =
  typeof value.manifestSignature === "string" &&
  /^0x[a-fA-F0-9]{130}$/u.test(value.manifestSignature)
    ? value.manifestSignature.toLowerCase()
    : null;
if (manifestSignature === null) return null;
```

`projectIssuedRun` passes `campaignSigned: true` into the session projection.
`projectSessionRun` requires and returns that boolean, while still discarding
`manifestSignature`. Update the strict fixture in `userPublicBoundary.test.ts`
with `campaignSigned: true` and assert:

```ts
expect(projected?.campaignSigned).toBe(true);
expect(projected).not.toHaveProperty("manifestSignature");
```

The human-readable signed condition table contains:

```js
function displayMockAmount(value) {
  const baseUnits = BigInt(value);
  const decimals = 10n ** 18n;
  const whole = baseUnits / decimals;
  const fraction = (baseUnits % decimals)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/u, "");
  return fraction.length === 0 ? whole.toString() : `${whole}.${fraction}`;
}

function formatExpiry(expiryUnix) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(expiryUnix * 1000));
}

const conditions = [
  ["네트워크", "GIWA Sepolia"],
  ["실행 대상", "Genesis Mock Vault"],
  ["액션", "Mock USDC 예치"],
  ["자산과 수량", `${displayMockAmount(preview.amountBaseUnits)} Mock USDC`],
  ["최대 승인", `${displayMockAmount(preview.maxAllowanceBaseUnits)} Mock USDC`],
  ["만료", formatExpiry(preview.expiryUnix)]
];
```

Render raw target, selector, asset, amount base units, spender, intent hash, and
signature only inside native `<details>`.

Only after `runState.campaignSigned === true` and a valid preview exist, use:

```text
캠페인이 이 실행 조건에 서명했습니다.
```

At the execution and match boundaries, respectively, use:

```text
참여자는 지갑에서 실제 트랜잭션에 서명합니다.
GIWA Verified Intent Rail이 두 기록을 대조합니다.
```

Do not add any new wallet request or modify `approveCalldata`,
`depositCalldata`, `sendWalletTransaction`, or `verifyAutomatically`.

- [ ] **Step 5: Gate the first wallet request behind mission review**

Add a presentation-only session key:

```js
const USER_MISSION_REVIEW_KEY = "giwa:userMissionReviewed";
let missionReviewed =
  sessionStorage.getItem(USER_MISSION_REVIEW_KEY) === "true";
```

Make `nextPrimaryAction()` start with:

```js
if (!missionReviewed) return "review_mission";
```

Add this label:

```js
review_mission: "미션 조건 보기"
```

In `onPrimaryAction()`, allow this action without a provider:

```js
if (
  currentProvider === null &&
  action !== "open_receipt" &&
  action !== "review_mission"
) {
  walletState = {
    status: "providerMissing",
    account: null,
    chainId: null
  };
  notice = publicNotice("wallet");
  render();
  return;
}
```

Handle it before wallet actions:

```js
if (action === "review_mission") {
  missionReviewed = true;
  sessionStorage.setItem(USER_MISSION_REVIEW_KEY, "true");
} else if (action === "connect") {
  await connectWallet(currentProvider);
  context = captureContext();
}
```

This action changes only presentation state. It does not issue a Manifest,
connect a wallet, or write live evidence.

- [ ] **Step 6: Add the controlled Recorded mismatch route**

Add:

```js
function isRecordedMismatchExample() {
  return (
    location.pathname === "/giwa-demo" &&
    new URLSearchParams(location.search).get("example") === "mismatch"
  );
}
```

When true, render:

```text
Recorded mismatch example
이 예시는 저장된 불일치 시나리오입니다.
확인한 실행 대상과 실제 트랜잭션 대상이 달라 Receipt를 발급하지 않았습니다.
```

Show one failed `실행 대상` row, keep the remaining rows neutral, and expose
only:

```html
<a href="/giwa-demo">실제 데모로 돌아가기</a>
```

Do not connect a wallet, call the live API, render the Seal, or create Receipt
history in this mode.

- [ ] **Step 7: Implement the editorial Journey Canvas styles**

The core layout must use:

```css
.journey-shell {
  display: grid;
  grid-template-columns: minmax(180px, 0.34fr) minmax(0, 1fr);
  gap: clamp(28px, 5vw, 80px);
  align-items: start;
}

.journey-canvas {
  min-width: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding-block: clamp(28px, 5vw, 64px);
}

@media (max-width: 720px) {
  .journey-shell {
    grid-template-columns: 1fr;
  }

  .journey-stage-rail {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    overflow-x: auto;
  }
}
```

Use thin rules and whitespace. Do not create five equal filled cards.

- [ ] **Step 8: Run the focused tests and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- giwaDemoPresentation userVisualPolish userPublicBoundary
```

Expected: PASS.

- [ ] **Step 9: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/public/user-flow.js apps/web/public/styles.css apps/web/public/giwa-demo.css apps/web/src/lib/userFlow/giwaDemoPresentation.test.ts apps/web/src/lib/userFlow/userVisualPolish.test.ts apps/web/src/lib/userFlow/userPublicBoundary.test.ts
git commit -m "feat(web): render the interactive Genesis journey"
```

Otherwise leave the files unstaged.

---

### Task 4: Join the Matched Receipt to the Partner Transition

**Files:**

- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/flow.js`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/src/lib/userFlow/userReceiptView.ts`
- Modify: `apps/web/src/lib/userFlow/userReceiptView.test.ts`
- Modify: `apps/web/src/lib/userFlow/userReceiptsList.ts`
- Modify: `apps/web/src/lib/userFlow/userReceiptsList.test.ts`
- Modify: `apps/web/src/lib/userFlow/userVisualPolish.test.ts`
- Modify: `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`

**Interfaces:**

- Consumes:
  - existing `GET /api/receipts/:receiptHash`;
  - existing `matchedReceiptRows(payload, verification)`;
  - existing `matched-receipt-seal.png`.
- Produces:
  - participant Partner Studio link:
    `/partner?receipt=:receiptHash`;
  - public technical proof link:
    `/receipt/:receiptHash`;
  - completion copy that accurately names both signature roles.

- [ ] **Step 1: Add failing Receipt hierarchy and link tests**

Extend `userReceiptView.test.ts`:

```ts
expect(receipt.summary.title).toBe("서명된 조건 안에서 실행됐습니다.");
expect(receipt.share.path).toBe(`/user/receipt/${receiptInput.receiptHash}`);
expect(receipt.partner.path).toBe(
  `/partner?receipt=${receiptInput.receiptHash}`
);
expect(receipt.publicProof.path).toBe(`/receipt/${receiptInput.receiptHash}`);
```

Extend `userVisualPolish.test.ts`:

```ts
expect(source).toContain("서명된 조건 안에서 실행됐습니다.");
expect(source).toContain(
  "캠페인이 서명한 Manifest와 확인된 GIWA Sepolia 트랜잭션을 대조했습니다."
);
expect(source).toContain('`/partner?receipt=${receiptHash}`');
expect(source).toContain('`/receipt/${receiptHash}`');
expect(source).toContain("Partner Studio에서 이 실행 보기");
```

Extend `livePublicReceiptRoute.test.ts`:

```ts
expect(source).toContain("캠페인이 서명한 조건");
expect(source).toContain("참여자 지갑이 실행한 트랜잭션");
expect(source).toContain("Exact Execution Seal");
```

Extend `userReceiptsList.test.ts`:

```ts
import {
  filterUserReceipts,
  partitionUserReceipts
} from "./userReceiptsList";

const partitioned = partitionUserReceipts(receipts);
expect(partitioned.acquired.map((item) => item.id)).toEqual(["r1"]);
expect(partitioned.recovery.map((item) => item.id)).toEqual(["r2", "r3"]);
expect(partitioned.acquired.every((item) => item.state === "verified")).toBe(true);
```

- [ ] **Step 2: Run the Receipt tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- userReceiptView userReceiptsList userVisualPolish livePublicReceiptRoute
```

Expected: FAIL because `UserReceiptView` has no partner/public-proof links and
the current completion copy uses older Manifest wording.

- [ ] **Step 3: Extend the Receipt view contract**

In `userReceiptView.ts`, add:

```ts
export type UserReceiptView = {
  state: UserReceiptState;
  summary: {
    title: string;
    receiptHash: string;
    actionName: string;
    networkName: string;
    wallet: string;
    target: string;
    asset: string;
    amountBaseUnits: string;
    depositTxHash: string;
    blockNumber: string;
    blockHash: string;
    confirmationDepth: string;
    verifierInputHash: string;
    issuedAt: string;
    safetyNotice: string;
  };
  share: { copyLabel: string; path: string | null };
  partner: { label: string; path: string | null };
  publicProof: { label: string; path: string | null };
};
```

Build the new fields with:

```ts
const receiptPath =
  input.receiptHash === null ? null : `/user/receipt/${input.receiptHash}`;
const partnerPath =
  input.receiptHash === null
    ? null
    : `/partner?receipt=${input.receiptHash}`;
const publicProofPath =
  input.receiptHash === null ? null : `/receipt/${input.receiptHash}`;
```

The verified title is exactly:

```text
서명된 조건 안에서 실행됐습니다.
```

- [ ] **Step 4: Update the participant Receipt actions**

After the existing match rows, render:

```js
view("div", { className: "user-receipt-actions" }, [
  view("a", {
    className: "primary-link",
    href: explorerUrl,
    text: "GIWA Explorer에서 보기"
  }),
  view("a", {
    className: "secondary-link",
    href: `/receipt/${receiptHash}`,
    text: "공개 검증 증거 보기"
  }),
  view("a", {
    className: "secondary-link",
    href: `/partner?receipt=${receiptHash}`,
    text: "Partner Studio에서 이 실행 보기"
  })
]);
```

Keep the Seal decorative with empty `alt`, keep the text result outside the
image, and render it only when the strict live Receipt projection is matched.

- [ ] **Step 5: Update the public technical Receipt hierarchy**

In `flow.js`, the live Receipt route must lead with:

```text
캠페인이 서명한 조건과,
참여자 지갑이 실행한 트랜잭션이 일치했습니다.
```

Then show five human-readable comparison rows before canonical payload and
hash details. Label the visual result `Exact Execution Seal`, but do not add a
second protocol object or imply on-chain minting.

- [ ] **Step 6: Enforce the Receipt history acquisition boundary**

In `userReceiptsList.ts`, add:

```ts
export type PartitionedUserReceipts = {
  acquired: Array<UserReceiptListItem & { state: "verified" }>;
  recovery: Array<UserReceiptListItem & { state: "pending" | "notMatched" }>;
};

export function partitionUserReceipts(
  items: UserReceiptListItem[]
): PartitionedUserReceipts {
  return {
    acquired: items.filter(
      (item): item is UserReceiptListItem & { state: "verified" } =>
        item.state === "verified"
    ),
    recovery: items.filter(
      (
        item
      ): item is UserReceiptListItem & {
        state: "pending" | "notMatched";
      } => item.state !== "verified"
    )
  };
}
```

Mirror this boundary in `renderReceiptsList()`:

- `획득한 Receipt` contains matched items only;
- `복구가 필요한 실행` contains pending and not-matched projections;
- the page states `이 브라우저에 저장된 테스트넷 실행 기록입니다.`;
- no pending or not-matched row uses acquired, owned, or collected wording.

- [ ] **Step 7: Run the focused tests and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- userReceiptView userReceiptsList userVisualPolish livePublicReceiptRoute
```

Expected: PASS.

- [ ] **Step 8: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/public/user-flow.js apps/web/public/flow.js apps/web/public/styles.css apps/web/src/lib/userFlow/userReceiptView.ts apps/web/src/lib/userFlow/userReceiptView.test.ts apps/web/src/lib/userFlow/userReceiptsList.ts apps/web/src/lib/userFlow/userReceiptsList.test.ts apps/web/src/lib/userFlow/userVisualPolish.test.ts apps/web/src/lib/flow/livePublicReceiptRoute.test.ts
git commit -m "feat(web): connect matched receipts to partner evidence"
```

Otherwise leave the files unstaged.

---

### Task 5: Build the Public-Safe Campaign Studio Projection

**Files:**

- Create: `apps/web/src/lib/partner/publicCampaignStudio.ts`
- Create: `apps/web/src/lib/partner/publicCampaignStudio.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.test.ts`

**Interfaces:**

- Consumes:
  - `LiveStore.listRuns()`;
  - `LiveStore.getSubmittedTx(runId)`;
  - `LiveStore.getDecisionByIntentHash(intentHash)`;
  - `LiveStore.getReceipt(receiptHash)`;
  - `LiveStore.getVerifierInput(verifierInputHash)`;
  - `evaluateCommercialReceiptGate(...)`.
- Produces:
  - `buildPublicCampaignStudio(input): PublicCampaignStudio`;
  - `GET /api/public/campaign-studio`;
  - matched-only public rows with shortened wallets.

- [ ] **Step 1: Define the public Campaign Studio types in a failing test**

Create `publicCampaignStudio.test.ts` with a memory-store fixture that includes:

- one matched gate-passed run;
- one mismatched run without a Receipt;
- one pending run;
- submitted deposits for the matched and mismatched runs.

The core expectations are:

```ts
const model = buildPublicCampaignStudio({
  store,
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  generatedAt: "2026-07-30T00:00:00.000Z"
});

expect(model).toMatchObject({
  screenKind: "public-campaign-studio",
  source: "live",
  campaign: {
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    networkName: "GIWA Sepolia",
    policyVersion: null,
    policyStatus: "fixed-unversioned"
  },
  kpis: {
    submittedDepositCount: 2,
    matchedReceiptCount: 1,
    matchedTxRate: "1/2"
  }
});
expect(model.receipts).toHaveLength(1);
expect(model.receipts[0]?.receiptHash).toBe(matchedReceiptHash);
expect(model.receipts[0]?.walletLabel).toMatch(/^0x[0-9a-f]{6}…[0-9a-f]{4}$/u);
expect(JSON.stringify(model)).not.toContain(fullWallet);
expect(JSON.stringify(model)).not.toContain("manifestSignature");
expect(JSON.stringify(model)).not.toContain("capabilityHash");
expect(model.funnel.find((step) => step.id === "campaignVisited")).toMatchObject({
  count: null,
  capture: "not-captured"
});
```

- [ ] **Step 2: Run the Campaign Studio model test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- publicCampaignStudio
```

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the model with an explicit truth boundary**

Start `publicCampaignStudio.ts` with:

```ts
import { evaluateCommercialReceiptGate } from "../live/commercialReceiptGate.ts";
import type { LiveStore } from "../live/liveStore.ts";
import {
  toBoundedFailureCode,
  type LiveFailureCode
} from "../verifier/liveFailureCode.ts";
```

Create these public types:

```ts
export type PublicCampaignFunnelId =
  | "campaignVisited"
  | "walletConnected"
  | "manifestIssued"
  | "approveSubmitted"
  | "approveConfirmed"
  | "depositSubmitted"
  | "depositConfirmed"
  | "verifierChecking"
  | "matched"
  | "receiptIssued";

export type PublicCampaignStudio = {
  screenKind: "public-campaign-studio";
  source: "live";
  generatedAt: string;
  campaign: {
    campaignId: string;
    missionId: string;
    networkName: "GIWA Sepolia";
    actionName: "Mock USDC deposit";
    policyVersion: null;
    policyStatus: "fixed-unversioned";
    managedMode: true;
    testnetOnly: true;
  };
  funnel: Array<{
    id: PublicCampaignFunnelId;
    label: string;
    count: number | null;
    capture: "derived" | "not-captured";
  }>;
  kpis: {
    submittedDepositCount: number;
    matchedReceiptCount: number;
    matchedTxRate: string;
  };
  mismatchBreakdown: Array<{
    code: string;
    label: string;
    count: number;
  }>;
  receipts: Array<{
    source: "live";
    runId: string;
    walletLabel: string;
    receiptHash: string;
    intentHash: string;
    depositTxHash: string;
    verifierInputHash: string;
    receiptPath: string;
    participantReceiptPath: string;
    explorerUrl: string;
    updatedAt: string;
  }>;
};
```

Implement:

```ts
export function buildPublicCampaignStudio(input: {
  store: LiveStore;
  campaignId: string;
  missionId: string;
  generatedAt: string;
}): PublicCampaignStudio
```

Rules:

1. Scope runs by exact campaign and mission.
2. Count submitted deposits from `getSubmittedTx`.
3. Include a Receipt row only when `evaluateCommercialReceiptGate` opens.
4. Compute matched count from those rows.
5. Derive only stages reconstructable from the current store.
6. Set `campaignVisited`, `walletConnected`, and any non-reconstructable
   historical stage to `{ count: null, capture: "not-captured" }`.
7. Return `policyVersion: null` and `policyStatus: "fixed-unversioned"`;
   never relabel the verifier version as a campaign policy version.
8. Map mismatch reasons through `toBoundedFailureCode` and a Korean
   presentation label; never return raw exception strings.
9. Sort Receipt rows by `updatedAt` descending and return at most 20 rows.
10. Shorten wallets before returning the model.

Use:

```ts
function walletLabel(wallet: string): string {
  const normalized = wallet.toLowerCase();
  return `${normalized.slice(0, 8)}…${normalized.slice(-4)}`;
}
```

- [ ] **Step 4: Expose the public read-only endpoint**

In `liveRoutePolicy.ts`:

```ts
if (method === "GET" && pathname === "/api/public/campaign-studio") {
  return "public";
}
```

In `liveApi.ts`, before participant mutation routes:

```ts
if (
  request.method === "GET" &&
  request.pathname === "/api/public/campaign-studio"
) {
  return {
    status: 200,
    body: buildPublicCampaignStudio({
      store: deps.store,
      campaignId: GASOK_CAMPAIGN_ID,
      missionId: GASOK_MISSION_ID,
      generatedAt: deps.now()
    })
  };
}
```

Do not reuse `/api/partner/runs`; that route remains authenticated in hosted
mode and may expose partner-scoped operational rows.

- [ ] **Step 5: Add API and route-policy tests**

Add:

```ts
expect(
  classifyLiveApiRoute("GET", "/api/public/campaign-studio")
).toBe("public");
```

In `liveApi.test.ts`, call the new endpoint in
`mode: "staging-testnet"` without auth and assert:

```ts
expect(response.status).toBe(200);
expect(response.body.screenKind).toBe("public-campaign-studio");
expect(JSON.stringify(response.body)).not.toMatch(
  /manifestJson|manifestSignature|capabilityHash|referralCode/u
);
```

- [ ] **Step 6: Run the focused tests and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- publicCampaignStudio liveApi liveRoutePolicy
```

Expected: PASS.

- [ ] **Step 7: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/src/lib/partner/publicCampaignStudio.ts apps/web/src/lib/partner/publicCampaignStudio.test.ts apps/web/src/lib/live/liveApi.ts apps/web/src/lib/live/liveApi.test.ts apps/web/src/lib/live/liveRoutePolicy.ts apps/web/src/lib/live/liveRoutePolicy.test.ts
git commit -m "feat(api): expose receipt-backed campaign evidence"
```

Otherwise leave the files unstaged.

---

### Task 6: Add Exact-Hash Public Proof Lookup

**Files:**

- Create: `apps/web/src/lib/live/publicProofLookup.ts`
- Create: `apps/web/src/lib/live/publicProofLookup.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.ts`
- Modify: `apps/web/src/lib/live/liveRoutePolicy.test.ts`

**Interfaces:**

- Consumes: the same `LiveStore` records and commercial Receipt gate as the
  Campaign Studio.
- Produces:
  - `lookupPublicMatchedProof(input): PublicMatchedProof | null`;
  - `GET /api/public/evidence/:hash`;
  - identical proof identity for Receipt, intent, and deposit transaction
    searches.

- [ ] **Step 1: Write failing lookup tests**

Create one gate-passed matched fixture and call:

```ts
import {
  lookupPublicMatchedProof,
  type PublicMatchedProof
} from "./publicProofLookup.ts";

const byReceipt = lookupPublicMatchedProof({
  store,
  queryHash: receiptHash
});
const byIntent = lookupPublicMatchedProof({
  store,
  queryHash: intentHash
});
const byDeposit = lookupPublicMatchedProof({
  store,
  queryHash: depositTxHash
});

const proofIdentity = (
  proof: PublicMatchedProof | null
): Omit<PublicMatchedProof, "queryKind"> | null => {
  if (proof === null) return null;
  const { queryKind: _queryKind, ...identity } = proof;
  return identity;
};

expect(proofIdentity(byReceipt)).toEqual(proofIdentity(byIntent));
expect(proofIdentity(byIntent)).toEqual(proofIdentity(byDeposit));
expect(byReceipt).toMatchObject({
  screenKind: "public-matched-proof",
  source: "live",
  receiptHash,
  intentHash,
  depositTxHash,
  receiptPath: `/receipt/${receiptHash}`,
  participantReceiptPath: `/user/receipt/${receiptHash}`
});
```

Add non-disclosure cases:

```ts
expect(
  lookupPublicMatchedProof({ store: mismatchedStore, queryHash: mismatchIntent })
).toBeNull();
expect(
  lookupPublicMatchedProof({ store: pendingStore, queryHash: pendingDeposit })
).toBeNull();
expect(
  lookupPublicMatchedProof({ store, queryHash: "not-a-hash" })
).toBeNull();
```

- [ ] **Step 2: Run the lookup test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- publicProofLookup
```

Expected: FAIL because the lookup does not exist.

- [ ] **Step 3: Implement the exact public proof type and lookup**

Start `publicProofLookup.ts` with:

```ts
import { evaluateCommercialReceiptGate } from "./commercialReceiptGate.ts";
import type { LiveStore } from "./liveStore.ts";
```

Create:

```ts
export type PublicMatchedProof = {
  screenKind: "public-matched-proof";
  source: "live";
  queryKind: "receipt" | "intent" | "depositTx";
  campaignId: string;
  missionId: string;
  policyVersion: null;
  policyStatus: "fixed-unversioned";
  networkName: "GIWA Sepolia";
  walletLabel: string;
  receiptHash: string;
  intentHash: string;
  depositTxHash: string;
  verifierInputHash: string;
  blockNumber: number;
  blockHash: string;
  confirmationDepth: number;
  receiptPath: string;
  participantReceiptPath: string;
  explorerUrl: string;
  testnetNotice: "GIWA Sepolia testnet · Mock assets only";
};

export function lookupPublicMatchedProof(input: {
  store: LiveStore;
  queryHash: string;
}): PublicMatchedProof | null
```

Implementation rules:

1. Normalize only `0x` plus 64 hexadecimal characters.
2. Resolve Receipt hash through `getReceipt`.
3. Resolve intent hash through `getDecisionByIntentHash`.
4. Resolve deposit transaction hash by scanning scoped submitted
   transactions; P0 has one SQLite instance and does not add a new index or
   schema migration.
5. Recover run, decision, Receipt, and verifier input.
6. Re-run `evaluateCommercialReceiptGate`.
7. Require Standard RPC success, non-null block metadata, and positive
   confirmation depth.
8. Return a shortened wallet and no raw Manifest, signature, capability,
   referral, or internal error.

Although lookup accepts three identities, set `queryKind` to the actual matched
input before returning. The equality test above compares the proof identity
after omitting `queryKind`.

- [ ] **Step 4: Expose the public lookup route**

In `liveRoutePolicy.ts`:

```ts
if (
  method === "GET" &&
  pathname.startsWith("/api/public/evidence/")
) {
  return "public";
}
```

In `liveApi.ts`:

```ts
if (
  request.method === "GET" &&
  request.pathname.startsWith("/api/public/evidence/")
) {
  const queryHash = request.pathname.slice("/api/public/evidence/".length);
  const proof = lookupPublicMatchedProof({
    store: deps.store,
    queryHash
  });
  return proof === null
    ? { status: 404, body: { error: "proof_not_found" } }
    : { status: 200, body: proof };
}
```

The same generic `proof_not_found` response is used for malformed, unknown,
pending, failed, and mismatched inputs.

- [ ] **Step 5: Add API redaction tests**

Test the three paths and assert:

```ts
expect(receiptResponse.status).toBe(200);
expect(intentResponse.status).toBe(200);
expect(depositResponse.status).toBe(200);
expect(receiptResponse.body.receiptHash).toBe(receiptHash);
expect(intentResponse.body.receiptHash).toBe(receiptHash);
expect(depositResponse.body.receiptHash).toBe(receiptHash);
expect(JSON.stringify(receiptResponse.body)).not.toMatch(
  /manifestJson|manifestSignature|capabilityHash|referralCode/u
);
```

Test pending and mismatched hashes:

```ts
expect(response).toEqual({
  status: 404,
  body: { error: "proof_not_found" }
});
```

- [ ] **Step 6: Run the focused tests and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- publicProofLookup liveApi liveRoutePolicy
```

Expected: PASS.

- [ ] **Step 7: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/src/lib/live/publicProofLookup.ts apps/web/src/lib/live/publicProofLookup.test.ts apps/web/src/lib/live/liveApi.ts apps/web/src/lib/live/liveApi.test.ts apps/web/src/lib/live/liveRoutePolicy.ts apps/web/src/lib/live/liveRoutePolicy.test.ts
git commit -m "feat(api): add matched public proof lookup"
```

Otherwise leave the files unstaged.

---

### Task 7: Render Partner Studio and Proof Ledger

**Files:**

- Create:
  `apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts`
- Create: `apps/web/src/lib/flow/publicEvidencePresentation.test.ts`
- Modify: `apps/web/public/flow.js`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/public/index.html`

**Interfaces:**

- Consumes:
  - `GET /api/public/campaign-studio`;
  - `GET /api/public/evidence/:hash`;
  - fallback `/flow-data.json` and `/partner-snapshot.json`.
- Produces:
  - strict `projectPublicCampaignStudio(body)`;
  - strict `projectPublicMatchedProof(body, expectedHash)`;
  - highlighted Receipt from `/partner?receipt=:hash`;
  - exact-hash search from `/evidence?hash=:hash`.

- [ ] **Step 1: Write failing Partner Studio presentation tests**

Create `publicCampaignStudioPresentation.test.ts` using the existing
read-file and standalone-function helpers:

```ts
const html = readWebFile("public/index.html");
expect(html).toContain('<html lang="ko">');
expect(html).toContain("Pretendard");
expect(html).toContain(
  "<title>Public Proof · GIWA Verified Intent Rail</title>"
);
expect(source).toContain("projectPublicCampaignStudio");
expect(source).toContain("fetchPublicCampaignStudio");
expect(source).toContain("renderPublicCampaignStudio");
expect(source).toContain("Campaign Brief");
expect(source).toContain("Mission Policy");
expect(source).toContain("Verified activation funnel");
expect(source).toContain("Mismatch breakdown");
expect(source).toContain("Proof Ledger");
expect(source).toContain("Closeout");
expect(source).toContain("미수집");
expect(source).toContain("Live");
expect(source).toContain("Recorded");
expect(source).toContain("Fixture");
expect(source).not.toContain("force match");
```

Project a valid fixture and assert:

```ts
expect(projected?.receipts[0]?.receiptHash).toBe(receiptHash);
expect(projected?.receipts[0]?.walletLabel).toBe("0x111111…1111");
expect(projected).not.toHaveProperty("manifestSignature");
```

Reject a model containing a full wallet or unknown source.

- [ ] **Step 2: Write failing Proof Ledger presentation tests**

Create `publicEvidencePresentation.test.ts`:

```ts
expect(source).toContain("renderPublicEvidenceSearch");
expect(source).toContain("projectPublicMatchedProof");
expect(source).toContain("fetchPublicMatchedProof");
expect(source).toContain('name: "hash"');
expect(source).toContain("Receipt, 트랜잭션 또는 Intent hash");
expect(source).toContain("일치한 공개 증거를 찾지 못했습니다.");
expect(source).not.toContain("wallet profile");
```

Test projection rejects:

- malformed hashes;
- a source other than `live`;
- a wallet value not already shortened;
- missing block evidence; and
- a Receipt hash different from the response identity.

- [ ] **Step 3: Run the presentation tests and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- publicCampaignStudioPresentation publicEvidencePresentation
```

Expected: FAIL because the new renderers do not exist.

- [ ] **Step 4: Implement strict browser projections**

Update `index.html` with:

```html
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="GIWA Verified Intent Rail의 Receipt-backed Partner Studio와 공개 테스트넷 증거."
    />
    <title>Public Proof · GIWA Verified Intent Rail</title>
    <link
      rel="stylesheet"
      as="style"
      crossorigin
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
    />
    <link rel="stylesheet" href="/styles.css" />
  </head>
```

Keep the existing `#app` shell and module script.

In `flow.js`, add:

```js
function requestedReceiptHighlight() {
  const value = new URLSearchParams(location.search).get("receipt");
  return /^0x[a-fA-F0-9]{64}$/u.test(value ?? "")
    ? value.toLowerCase()
    : null;
}

async function fetchPublicCampaignStudio(fetchImpl = fetch) {
  const response = await fetchImpl("/api/public/campaign-studio", {
    cache: "no-store"
  });
  if (!response.ok) return null;
  return projectPublicCampaignStudio(await response.json());
}

async function fetchPublicMatchedProof(hash, fetchImpl = fetch) {
  const response = await fetchImpl(
    `/api/public/evidence/${encodeURIComponent(hash)}`,
    { cache: "no-store" }
  );
  if (!response.ok) return null;
  return projectPublicMatchedProof(await response.json(), hash);
}
```

Both projection functions must copy only whitelisted properties, validate
hash/address-label shapes, reject raw wallets, and return `null` on any schema
violation.

- [ ] **Step 5: Render the six-section read-only Studio**

`renderPublicCampaignStudio(model)` renders:

1. Campaign Brief;
2. Mission Policy;
3. Verified activation funnel;
4. mismatch breakdown;
5. Proof Ledger; and
6. Closeout.

For a funnel step whose `count` is `null`, render:

```text
미수집
P0 저장소에서 재구성할 수 없는 단계
```

For captured counts, render the number and `증거에서 계산`.

If `requestedReceiptHighlight()` matches a Receipt row:

- add `.is-highlighted`;
- focus its heading after render;
- show `방금 발급된 Receipt`;
- render the current matched count with a truthful transition:
  `Math.max(0, count - 1) → count`; and
- never animate a different hard-coded total.

- [ ] **Step 6: Render the exact-hash Proof Ledger**

At `/evidence`, render a GET form:

```html
<form class="proof-search" action="/evidence" method="get">
  <label for="proof-hash">Receipt, 트랜잭션 또는 Intent hash</label>
  <input
    id="proof-hash"
    name="hash"
    inputmode="text"
    autocomplete="off"
    spellcheck="false"
  />
  <button type="submit">증거 찾기</button>
</form>
```

Behavior:

- no query: render an explanation and no API call;
- malformed query: render the same generic not-found state;
- matched proof: render human-readable identity, Receipt link, participant
  Receipt link, GIWA Explorer link, block evidence, and testnet notice;
- unknown, pending, failed, or mismatched: render
  `일치한 공개 증거를 찾지 못했습니다.`;
- never search or list by wallet.

- [ ] **Step 7: Preserve explicit fallback source labels**

If the live Campaign Studio API is unavailable:

- load the existing committed snapshot;
- label the whole view `Recorded` or `Fixture` according to its known source;
- do not merge fallback counts with live counts; and
- do not highlight it as the Receipt just created.

If public proof lookup is unavailable, keep the not-found state. Do not silently
substitute a recorded Receipt for a user-provided hash.

- [ ] **Step 8: Add responsive and accessible styles**

Add:

```css
.studio-section,
.proof-ledger-section {
  border-top: 1px solid var(--line);
  padding-block: clamp(28px, 4vw, 56px);
}

.proof-ledger-row.is-highlighted {
  border-left: 3px solid var(--verified);
  padding-left: 18px;
}

.source-label[data-source="live"]::before {
  content: "Live";
}

@media (max-width: 720px) {
  .studio-funnel,
  .proof-ledger-row {
    grid-template-columns: 1fr;
  }
}
```

Use text labels in addition to color. Preserve `:focus-visible`,
`overflow-wrap: anywhere`, 16 px base text, and reduced-motion rules.

- [ ] **Step 9: Run the focused tests and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- publicCampaignStudioPresentation publicEvidencePresentation livePublicReceiptRoute
```

Expected: PASS.

- [ ] **Step 10: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/public/flow.js apps/web/public/styles.css apps/web/public/index.html apps/web/src/lib/partner/publicCampaignStudioPresentation.test.ts apps/web/src/lib/flow/publicEvidencePresentation.test.ts
git commit -m "feat(web): add Partner Studio and public Proof Ledger"
```

Otherwise leave the files unstaged.

---

### Task 8: Prove the Same Receipt Across Participant, Partner, and Proof APIs

**Files:**

- Create: `apps/web/src/lib/live/participantPartnerLoop.test.ts`
- Modify: `apps/web/scripts/smoke-staging.mjs`
- Modify: `apps/web/src/lib/live/stagingSmokeScript.test.ts`
- Modify: `apps/web/src/lib/live/stagingParticipantFlow.test.ts`

**Interfaces:**

- Consumes:
  - `POST /api/runs`;
  - transaction evidence and verifier result fixture;
  - `GET /api/receipts/:receiptHash`;
  - `GET /api/public/campaign-studio`;
  - `GET /api/public/evidence/:hash`.
- Produces: one integration proof that the exact `receiptHash` joins the user,
  partner, and public-proof surfaces.

- [ ] **Step 1: Write the failing end-to-end API identity test**

Use the existing canonical Receipt fixture helpers from `liveApi.test.ts`.
After persisting one valid matched run, call:

```ts
const participant = await api({
  method: "GET",
  pathname: `/api/receipts/${receiptHash}`
});
const studio = await api({
  method: "GET",
  pathname: "/api/public/campaign-studio"
});
const proof = await api({
  method: "GET",
  pathname: `/api/public/evidence/${depositTxHash}`
});

expect(participant.status).toBe(200);
expect(studio.status).toBe(200);
expect(proof.status).toBe(200);
expect(participant.body.receiptHash).toBe(receiptHash);
expect(
  (studio.body.receipts as Array<{ receiptHash: string }>)[0]?.receiptHash
).toBe(receiptHash);
expect(proof.body.receiptHash).toBe(receiptHash);
```

Then persist a mismatched run and assert:

```ts
const mismatchReceiptHash = `0x${"f".repeat(64)}`;
const mismatchReceipt = await api({
  method: "GET",
  pathname: `/api/receipts/${mismatchReceiptHash}`
});
const mismatchProof = await api({
  method: "GET",
  pathname: `/api/public/evidence/${mismatchIntentHash}`
});
const studioAfterMismatch = await api({
  method: "GET",
  pathname: "/api/public/campaign-studio"
});

expect(mismatchReceipt.status).toBe(404);
expect(mismatchProof.status).toBe(404);
expect(
  (studioAfterMismatch.body.receipts as Array<{ receiptHash: string }>).some(
    (row) => row.receiptHash === mismatchReceiptHash
  )
).toBe(false);
```

- [ ] **Step 2: Run the integration test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web test -- participantPartnerLoop
```

Expected: FAIL until Tasks 5-7 exist.

- [ ] **Step 3: Add route and API smoke checks**

Extend `smoke-staging.mjs`:

```js
const checks = [
  ["/", 200, "landing.js"],
  ["/giwa-demo", 200, "user-flow.js"],
  ["/user", 200, "user-flow.js"],
  ["/evidence", 200, "flow.js"],
  ["/partner", 200, "GIWA Verified Intent Rail"],
  ["/api/public/campaign-studio", 200, '"screenKind":"public-campaign-studio"'],
  ["/healthz", 200, '"ok":true'],
  ["/readyz", 200, '"ready":true'],
  ["/api/public/config", 200, '"chainId":91342']
];
```

Do not add a fixed Receipt hash to the generic smoke script. The integration
test owns dynamic Receipt identity.

- [ ] **Step 4: Update smoke and participant-flow test expectations**

In `stagingSmokeScript.test.ts`, require the new endpoint marker and keep
credential-safe output checks.

In `stagingParticipantFlow.test.ts`, add the required judge order:

```ts
expect(routeOrder).toEqual([
  "/giwa-demo",
  "/user",
  `/user/receipt/${receiptHash}`,
  `/partner?receipt=${receiptHash}`,
  `/receipt/${receiptHash}`
]);
```

Keep it as a presentation order assertion; do not fabricate browser navigation
inside the API test.

- [ ] **Step 5: Run the focused integration checks and confirm GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- participantPartnerLoop stagingSmokeScript stagingParticipantFlow
```

Expected: PASS.

- [ ] **Step 6: Commit only with explicit Git authorization**

If authorized:

```powershell
git add apps/web/src/lib/live/participantPartnerLoop.test.ts apps/web/scripts/smoke-staging.mjs apps/web/src/lib/live/stagingSmokeScript.test.ts apps/web/src/lib/live/stagingParticipantFlow.test.ts
git commit -m "test(web): prove the receipt-backed activation loop"
```

Otherwise leave the files unstaged.

---

### Task 9: Update Durable Documentation and Run Fresh Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/implementation/giwa-gasok-staging-runbook.md`
- Modify: `AGENTS.md`
- Reference:
  `docs/superpowers/specs/2026-07-30-giwa-two-signed-activation-platform-design.md`

**Interfaces:**

- Consumes: completed P0 behavior and all test evidence.
- Produces: an accurate route map, 90-second demo procedure, stop conditions,
  and implementation verification record.

- [ ] **Step 1: Update the README route map**

Document:

```text
/                         real GIWA Genesis campaign entry
/giwa-demo                GASOK guided entry
/user                     five-stage participant journey
/user/receipt/:hash       participant Receipt and Exact Execution Seal
/user/receipts            browser-local matched execution history
/partner                  public-safe read-only Campaign Studio
/evidence                 exact-hash public Proof Ledger
/receipt/:hash            public technical Receipt
```

State that `/partner` uses evidence-derived counts, marks unavailable historical
stages as not captured, and has no management mutations.

- [ ] **Step 2: Update the 90-second runbook**

Add this exact sequence:

```text
0-10s   explain participation signal vs execution evidence
10-25s  open the real GIWA Genesis Journey
25-40s  show campaign-signed conditions
40-60s  execute participant-owned wallet transactions
60-75s  show field match and Matched Receipt
75-85s  open /partner?receipt=:hash and highlight the same Receipt
85-90s  open /receipt/:hash and close on receipt-backed activation
```

Include:

- `/giwa-demo?example=mismatch` is Recorded;
- no Receipt or Seal appears in that example;
- GIWA Sepolia and mock-asset wording must remain visible;
- Flashblocks is early feedback only; and
- a fresh live Receipt has no on-chain decision transaction.

- [ ] **Step 3: Update only the AGENTS.md Project Profile**

After implementation is verified, add the durable architecture decision:

```text
- Present one deep GIWA Genesis participant journey. Join participant,
  public-proof, and read-only partner surfaces by the same matched-only
  Receipt hash.
```

Add the two public API projections to the source-of-truth notes. Do not rewrite
the stable policy.

- [ ] **Step 4: Run focused tests first**

Run:

```powershell
pnpm --filter @giwa/web test -- landingPresentation userJourneyProjection giwaDemoPresentation userReceiptView publicCampaignStudio publicProofLookup publicCampaignStudioPresentation publicEvidencePresentation participantPartnerLoop
```

Expected: all focused tests PASS.

- [ ] **Step 5: Run the complete verification suite**

Run:

```powershell
pnpm --filter @giwa/web test
pnpm typecheck
pnpm test
pnpm build
```

Expected:

- web tests PASS;
- TypeScript checks PASS;
- all workspace tests PASS;
- the generated flow artifacts rebuild successfully;
- the complete workspace build exits `0`.

If `pnpm build` regenerates tracked projections, inspect them and include only
source-owned, expected changes.

- [ ] **Step 6: Inspect the final diff and public-copy boundary**

Run:

```powershell
git diff --check
git diff --stat
git status --short
rg -n "Loop Rail|Looprail|GIWA Verified Activation Rail|사용자가 Manifest에 서명|trustless|real yield|real funds|settlement|KYC" apps/web/public README.md docs/implementation/giwa-gasok-staging-runbook.md
```

Expected:

- `git diff --check` exits `0`;
- only planned and generated coupled files changed;
- legacy public names and unsupported claims have no positive public-copy
  matches;
- expected warning-boundary mentions in documentation are manually confirmed
  as negations, not claims.

- [ ] **Step 7: Perform local browser verification**

Start:

```powershell
pnpm --filter @giwa/web dev:live
```

Use the in-app browser to verify:

1. `/` at 1280 x 720 and 390 x 844;
2. `/giwa-demo` through the current real stage;
3. `/giwa-demo?example=mismatch`;
4. `/user`;
5. one matched `/user/receipt/:hash`;
6. `/partner?receipt=:hash`;
7. `/evidence?hash=:depositTxHash`; and
8. `/receipt/:hash`.

At 320 px width, verify no horizontal overflow and wrapping hashes. Test
keyboard-only focus order and reduced motion. Confirm the partner row and public
proof show the identical Receipt hash.

- [ ] **Step 8: Run local or authorized staging smoke**

For a local server:

```powershell
$env:GIWA_SMOKE_BASE_URL = "http://127.0.0.1:4177/"
pnpm --filter @giwa/web smoke:staging
```

Expected: every listed route prints `pass`.

For `https://giwa.teckbrick.com/`, run the same smoke only after the user
explicitly authorizes deployment or staging validation against the changed
release.

- [ ] **Step 9: Commit only with explicit Git authorization**

If authorized:

```powershell
git add README.md docs/implementation/giwa-gasok-staging-runbook.md AGENTS.md
git commit -m "docs: document the receipt-backed participation platform"
```

Then inspect:

```powershell
git status --short
git log -5 --oneline
```

Otherwise leave all work unstaged.

## Deployment Gate

Deployment is not part of this plan unless the user separately authorizes it.
After all verification passes:

1. invoke the project `deploy` skill;
2. follow the current Lightsail runbook;
3. create a versioned release directory;
4. switch the release symlink only after pre-deploy checks pass;
5. run post-deploy route, API, Receipt, Partner Studio, and Proof Ledger smoke;
6. verify the same live Receipt across participant, partner, and public proof;
7. retain the previous release for rollback; and
8. report the deployed commit and live Receipt evidence without exposing secrets
   or local runtime data.

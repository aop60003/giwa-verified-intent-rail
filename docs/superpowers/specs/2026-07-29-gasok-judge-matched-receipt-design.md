# GASOK Judge Matched Receipt Design

## Status

Approved in conversation on 2026-07-29. This document defines the judge-facing
information architecture and completion moment for the public `/giwa-demo` flow.
It refines, rather than replaces, the approved Guided Flow design in
`2026-07-29-guided-flow-visual-redesign-design.md`.

## Goal

A GASOK reviewer should understand the product without learning new product
vocabulary:

> Looprail compares the conditions reviewed before signing with the actual GIWA
> Sepolia transaction, and publishes a Receipt only when they match.

The experience must make five facts clear:

1. A quest click is not evidence of a completed on-chain action.
2. The user reviews fixed execution conditions before using the wallet.
3. The action is executed by the user's wallet on GIWA Sepolia.
4. Looprail compares the confirmed transaction evidence with the signed
   Manifest.
5. A shareable Receipt is available only after a complete match.

This supports the current GASOK selection criteria published at
`https://giwa.io/gasok`: GIWA chain fit, originality, feasibility, market
potential, team execution, GIWA Wallet placement, actual implementation level,
and technical completeness.

## Decision

### Public vocabulary

The judge-facing flow uses only two primary technical nouns:

- `Manifest`: the reviewed pre-execution conditions.
- `Matched Receipt`: the public result unlocked after verification.

The following concepts remain internal presentation layers and are not
introduced as separate products in the first-read experience:

- `Verified Execution Proof`: the product meaning of the canonical Receipt.
- `Proof Seal`: the visual matched-state mark.
- `Proofbook`: the future collection model.

The existing `/user/receipts` surface is presented as `내 실행 기록`, not as a
new account, wallet, passport, or permanent on-chain collection.

### Core judge-facing sentence

> 확인한 조건대로 실행되면, 공유 가능한 Receipt를 받습니다.

### Completion sentence

> 확인한 조건대로 실행됐습니다.

Supporting copy:

> GIWA Sepolia 트랜잭션과 Manifest를 대조해, 일치한 실행 기록을
> 발급했습니다.

## Why This Model

Three separately branded concepts would force the reviewer to determine whether
the Seal is an NFT, whether Proof differs from Receipt, and whether Proofbook is
a wallet or account product. That cognitive work obscures the actual
differentiator.

The design therefore keeps the existing protocol object, `Receipt`, as the
public result. The Seal supplies an acquisition moment without creating a new
technical claim. The history surface supplies retention without implying
on-chain ownership or cross-device persistence.

## Product Truth And Runtime Boundary

The design must reflect the fresh live-run implementation:

- The Manifest is EIP-712 signed by the configured campaign signer.
- The user wallet sends the approve transaction when needed and sends the mock
  vault deposit transaction.
- The deposit transaction and its block/log evidence exist on GIWA Sepolia.
- The live verifier reads transaction, receipt, block, head, and decoded-log
  evidence through Standard RPC.
- The live verifier compares signer, chain, wallet, target, selector, asset,
  amount, spender, allowance, expiry, required logs, receipt status, and
  confirmation depth.
- The live adapter stores verifier input, decision, and canonical Receipt data
  in its SQLite staging store.
- A live Receipt is public only when the run and decision are `matched`, their
  hashes agree, and the Receipt and verifier-input hashes can be recomputed.
- A fresh live run does not currently submit an `IntentSubmitted` relay
  transaction or an on-chain decision transaction. Its `decisionTxHash` is
  `null`.

Historical recorded evidence may contain on-chain `IntentSubmitted` and
`IntentMatched` events. Recorded evidence must be labeled as a recorded verified
example and must not be presented as the behavior of a fresh live run.

The Proof Seal therefore means:

> The public Matched Receipt gate opened for this execution.

It does not mean NFT minting, identity certification, KYC, risk review, security
approval, settlement, finality, asset ownership, RWA issuance, or yield.

## Judge Comprehension Sequence

### 0–10 seconds: problem

Visible message:

> 퀘스트 완료만으로는 약속한 온체인 액션이 실제로 실행됐는지 알 수
> 없습니다.

The screen should show one restrained contrast:

```text
Quest completion     Participation signal
Matched Receipt      Execution evidence
```

This contrast is explanatory copy, not a competitor-comparison table.

### 10–20 seconds: product promise

Visible message:

> Looprail은 서명 전에 확인한 조건과 실제 GIWA 실행을 연결합니다.

The visible flow is:

```text
Manifest → GIWA 실행 → Match → Receipt
```

No additional branded terminology appears in this first-read path.

### 20–40 seconds: review

The Manifest stage emphasizes four human-readable promises:

1. 실행 지갑
2. 실행 대상과 액션
3. 자산과 정확한 수량
4. 승인 한도와 만료 시간

Addresses, hashes, selectors, base units, chain IDs, and signatures remain
available through native progressive disclosure. The user must not need to read
raw values to understand the action.

### 40–60 seconds: execute

The primary action remains wallet-owned:

```text
exact approve when required
→ mock vault deposit
→ transaction submitted
```

The UI shows one current action at a time. It does not simulate a transaction or
claim that a browser animation is chain evidence.

### 60–72 seconds: match

During verification, the UI changes from generic loading copy to a compact
evidence comparison:

| Reviewed condition | Actual evidence | Result |
| --- | --- | --- |
| Wallet | transaction sender | Matched |
| Target and action | transaction target and calldata | Matched |
| Asset and amount | calldata, Transfer, and MockDeposit logs | Matched |
| Allowance and expiry | Approval log and block time | Within condition |
| Block evidence | Standard RPC receipt and confirmation depth | Confirmed |

While verification is pending, no row may claim a match. After the terminal
verifier result is `matched`, the rows may resolve progressively as a short
result reveal. The public Receipt remains locked until that terminal result and
a valid Receipt hash both exist.

### 72–80 seconds: acquire

After a matched response with a valid Receipt hash:

1. The browser navigates to the public user Receipt route.
2. The receipt header states `확인한 조건대로 실행됐습니다.`
3. A single `MATCHED · GIWA SEPOLIA` Seal appears with a short acquisition
   transition.
4. The page identifies the result as `Matched Receipt`.
5. The Receipt hash and deposit transaction become visible after the
   human-readable explanation.

The Seal is a visual asset, not a CSS-drawn badge or a new protocol object. It
must be created from an approved original asset source and remain legible in
high-contrast and reduced-motion modes.

Motion requirements:

- Total reveal duration: 500–900 ms.
- No artificial wait before the Receipt content is usable.
- The Seal may scale from 0.94 to 1 and fade in once.
- No repeated pulse, particle burst, confetti, shake, or sound.
- `prefers-reduced-motion: reduce` renders the final state immediately.

### 80–90 seconds: value

The Receipt surface closes the product story with two quiet outcomes:

- User: `내 실행 기록에 저장됨`
- Partner: `manifest-matched transaction을 activation KPI로 집계 가능`

GIWA Wallet placement is framed as a next-step product path:

> GIWA Wallet 안에서 실행 전 조건 확인과 실행 후 Receipt 기록을 연결할 수
> 있습니다.

This is a placement proposal, not a claim that the integration already exists.

## Matched Receipt Information Hierarchy

### Above the fold

1. `Manifest matched` eyebrow.
2. Completion headline.
3. One-sentence explanation.
4. Proof Seal.
5. Five-row human-readable match summary.
6. Primary action: `GIWA Explorer에서 보기`.
7. Secondary actions: `Receipt 링크 복사`, `검증 증거 보기`.

### Below the fold or progressive disclosure

- Receipt hash
- Intent hash
- Deposit transaction hash
- Wallet
- Target
- Asset
- Amount
- Block number and block hash
- Confirmation depth
- Verifier input hash
- Issued time
- Canonical testnet safety notice

The page must not begin with a grid of hashes. Technical evidence remains
complete and untruncated when opened.

## Mismatch And Failure Design

The mismatch state is necessary to explain the product. It remains on the demo
flow and never navigates to a Receipt route.

Headline:

> 확인한 조건과 실행 결과가 달라 Receipt를 발급하지 않았습니다.

The page shows one bounded category:

- 지갑 불일치
- 실행 대상 불일치
- 자산 또는 수량 불일치
- 승인 조건 불일치
- Manifest 만료
- 필수 실행 로그 없음
- 트랜잭션 실패

The failed condition is emphasized while the other condition rows remain
neutral. Raw internal errors, RPC values, configuration names, and exception
messages stay hidden.

The state includes one supported next action:

- retry verification for a retryable confirmation state; or
- start a fresh Manifest for a terminal mismatch or failed transaction.

There is no greyed-out Seal silhouette, consolation badge, or failed NFT.

## History Surface

`/user/receipts` becomes the secondary retention surface.

Judge-facing label:

> 내 실행 기록

Each matched item shows:

- action name
- `Matched` state
- network
- abbreviated Receipt hash
- abbreviated deposit transaction hash
- issued time when available
- `Receipt 열기`

Pending and not-matched local projections may remain available for recovery, but
they are not presented as acquired proofs.

The page must state:

> 이 브라우저에 저장된 테스트넷 실행 기록입니다.

It must not imply a GIWA Wallet account, cross-device sync, permanent storage,
transferability, or token ownership.

## Partner And Market Meaning

The user acquisition moment is immediately connected to the partner value:

```text
Matched Receipt
→ matched transaction count
→ matched transaction rate
→ mock testnet action amount
```

The judge-facing explanation is:

> 사용자는 실행 기록을 받고, 파트너는 클릭이 아니라 Manifest와 일치한
> 트랜잭션을 KPI로 확인합니다.

The demo does not claim real TVL, real deposits, production conversion, real
funds, yield, RWA issuance, settlement, or existing paying customers.

## Visual Direction

The design extends the approved editorial Guided Flow system:

- Pretendard Variable for interface copy.
- Monospace only for hashes and compact evidence labels.
- Paper, ink, rule, verified green, and soft verified surfaces from the current
  visual system.
- Whitespace and thin rules carry hierarchy.
- No gradient, glassmorphism, trophy illustration, collectible-card frame,
  dashboard-first layout, or repeated rounded card grid.
- One Seal asset is the only ceremonial object.
- The Receipt reads like a precise execution record rather than a certificate,
  achievement page, or generic Web3 reward.

## Responsive Behavior

### Desktop

- Completion copy and Seal may share a balanced two-column header.
- The match summary remains readable without horizontal scrolling.
- Technical evidence stays below the first viewport.

### Mobile

- Completion headline appears first.
- Seal follows at a smaller size without consuming the entire viewport.
- The five match rows stack as label, result, and short evidence.
- The primary explorer action is visible before technical details.
- Hashes wrap without expanding the viewport.

## Accessibility

- The Seal is decorative when its `Matched` meaning is already present in text.
- The terminal result is announced through the existing live status mechanism.
- Match and mismatch are never communicated by color alone.
- Focus moves to the Receipt heading after navigation.
- Copy-link feedback is announced without moving focus.
- All actions meet the existing minimum 44 px target.
- Reduced-motion behavior is mandatory.
- Technical disclosure uses native `<details>` and `<summary>`.

## Implementation Boundaries

Expected implementation surfaces:

- `apps/web/public/user-flow.js`
- `apps/web/public/giwa-demo.css`
- the existing shared public styles when necessary
- Receipt and demo presentation tests under `apps/web/src/lib/userFlow/`
- a single approved Seal asset under `apps/web/public/`

The implementation preserves:

- wallet connection and context invalidation
- Manifest issuance and signature behavior
- exact approval and deposit calldata
- evidence submission and verification retry behavior
- live API, verifier, commercial Receipt gate, and SQLite schema
- `/api/receipts/:receiptHash` contract
- public technical evidence availability

The design does not add a new framework, runtime dependency, API endpoint,
database table, contract, transaction, token, NFT, account system, or wallet
integration.

## Verification

### Automated

- A matched state with a valid Receipt hash navigates to the Receipt route.
- A mismatched or failed state does not expose a Receipt link or Seal.
- The Receipt page renders the completion headline, five match summaries, and
  testnet notice from public Receipt data.
- Technical evidence remains present and untruncated.
- The history page uses the browser-storage boundary copy.
- No public copy claims NFT issuance, on-chain certification, settlement,
  finality, KYC, security approval, real assets, yield, or RWA issuance.
- Reduced-motion rules exist for the acquisition transition.
- Existing live API, verifier, and Receipt gate tests remain unchanged and pass.

### Browser

Inspect the live and recorded-example paths at:

- 1280 × 720
- 1024 × 768
- 390 × 844

Confirm:

- The problem and product promise are understandable before wallet connection.
- Only one primary action is visible in each active stage.
- The first Receipt viewport explains what was verified before showing raw
  hashes.
- The Seal appears only for a real matched public Receipt.
- Mismatch visibly withholds the Receipt.
- Recorded evidence is clearly labeled.
- No horizontal overflow, clipped copy, inaccessible focus, or motion loop is
  present.

## Judge Comprehension Acceptance Test

After the flow, a reviewer should be able to answer these questions without
technical help:

1. What problem does Looprail solve?
2. What did the user review before signing?
3. What did the user execute on GIWA Sepolia?
4. What did Looprail compare?
5. Why was the Receipt issued?
6. What happens when the execution does not match?
7. What does the partner measure?
8. Where could this fit inside GIWA Wallet?

The design passes only when all answers are visible in the demo and none depend
on explaining the Seal as a separate product.

## Out Of Scope

- NFT, SBT, POAP, collectible, points, level, or token rewards
- Mainnet behavior
- Real asset, yield, RWA issuance, or settlement claims
- Identity issuance, KYC, phishing detection, or security guarantees
- On-chain anchoring of every fresh live decision
- GIWA Wallet production integration
- Cross-device Proofbook or account sync
- Multiple action templates
- Partner billing or production analytics

## Acceptance Criteria

The design is complete when:

1. The first-read vocabulary is limited to Manifest and Matched Receipt.
2. The public flow follows `Manifest → GIWA 실행 → Match → Receipt`.
3. The matched Receipt begins with a human-readable result, not hashes.
4. A single Proof Seal supplies the acquisition moment without implying an NFT
   or on-chain certificate.
5. Mismatch withholds both the Receipt and Seal.
6. Partner KPI meaning and future GIWA Wallet placement are stated without
   overclaiming current implementation.
7. Fresh live and recorded historical evidence remain visibly distinct.
8. Existing protocol, transaction, verifier, storage, and public API behavior is
   preserved.

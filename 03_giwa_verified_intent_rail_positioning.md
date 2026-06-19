# GIWA Verified Intent Rail Positioning

## Judge-Facing Problem

GIWA campaigns can drive wallet traffic, but partners still need evidence that a user understood and completed a specific GIWA Sepolia testnet action.

The current gap:

- A quest click is not the same as a confirmed GIWA Sepolia transaction.
- A wallet preview is not connected to campaign attribution or partner KPIs.
- A preconfirmation signal is fast feedback, not final completion.
- A testnet mock deposit needs a receipt that shows which manifest-covered action matched the confirmed transaction.

Korean:

```text
GIWA 캠페인은 지갑 유입을 만들 수 있지만, 사용자가 특정 GIWA Sepolia 테스트넷 액션을 이해하고 완료했는지 파트너가 확인할 근거는 부족합니다.
```

## Judge-Facing Solution

GIWA Verified Intent Rail connects one signed action manifest to one confirmed GIWA Sepolia testnet action and one partner-readable receipt.

```text
Partner campaign link
-> Intent Preview
-> GIWA Sepolia mock vault action
-> Flashblocks early status
-> Confirmed block evidence
-> Manifest match decision
-> ProofKPI receipt and partner summary
```

This is not a quest board, wallet firewall, KYC service, RWA product, yield product, or settlement rail.

## 90-Second Demo Script

1. User opens a partner campaign link or QR.
2. App checks wallet, GIWA Sepolia network, test token balance, and optional read-only verified state.
3. User reviews the mock vault intent: target, selector, asset, amount, spender, and max allowance.
4. User sends the optional limited approve transaction if needed.
5. User sends the required mock vault deposit transaction.
6. UI shows `submitted -> fast feedback -> block confirmed -> verifier checking -> matched`.
7. Verifier compares the confirmed deposit transaction with the signed manifest.
8. User receives a receipt only after the verifier matches the block-confirmed transaction.
9. Partner sees a single-run summary with tx evidence, receipt hash, and mock testnet deposit metrics.

## Naming Decision

External pitch and submission materials should stop using `Loop Rail` as the product name.

Use:

```text
GIWA Verified Intent Rail
```

Do not introduce a second public product name in the pitch. If a shorter phrase is needed inside copy, use it as a descriptor such as `intent evidence rail`, not as a separate name.

`Loop Rail` can remain an internal legacy concept for campaign entry, action templates, and KPI loops, but it should not be the public-facing name.

## Why Rename

`Loop Rail` sounds like a generic growth loop, quest system, or campaign analytics tool. That creates direct comparison pressure against Galxe, Zealy, Layer3, and ordinary Web3 quest products.

`GIWA Verified Intent Rail` sounds closer to the real product:

- a GIWA-native first action execution layer
- an intent preview flow before a user signs
- a manifest-covered transaction check
- an execution evidence and receipt system
- a ProofKPI reporting layer for partner dApps

The product should not be positioned as a quest board. It should be positioned as a first testnet action evidence rail for manifest-matched GIWA Sepolia actions.

## One-Line Definition

```text
GIWA Verified Intent Rail turns a user's first GIWA Sepolia mock vault action into a signed intent, confirmed transaction evidence, and measurable ProofKPI receipt.
```

Korean:

```text
GIWA Verified Intent Rail은 GIWA Sepolia의 첫 mock vault 액션을 서명된 의도, 확인된 트랜잭션 증거, 측정 가능한 ProofKPI 영수증으로 전환합니다.
```

Boundary:

```text
The MVP uses a mock vault and test token to demonstrate a DeFi/RWA-style UX pattern only. It does not use production funds, production yield, production asset issuance, or settlement.
```

## Better Product Frame

Old frame:

```text
Guide users through their first GIWA DeFi/RWA action and measure the result.
```

New frame:

```text
Connect a user's signed action conditions to confirmed GIWA Sepolia testnet transaction evidence, so apps and campaigns can show that a manifest-covered transaction matched and report activation KPIs.
```

Korean:

```text
사용자가 서명한 조건을 확인된 GIWA Sepolia 테스트넷 트랜잭션 증거와 연결해, 앱과 캠페인이 manifest에 포함된 트랜잭션이 매칭되었는지 근거로 보여주고 activation KPI로 보고할 수 있게 합니다.
```

## Core Product Loop

```text
Signed Action Manifest
-> Intent Preview
-> GIWA Sepolia Transaction
-> Flashblocks Early Status
-> Confirmed Block Evidence
-> Verifier Decision
-> ProofKPI Receipt
-> Partner Report
```

This loop is the core distinction from quest platforms and wallet preview tools.

## Verifier Decision

`Verifier Decision` is a deterministic off-chain/indexer-side check, not a security guarantee.

It compares the confirmed GIWA Sepolia deposit transaction against the signed action manifest:

- `chainId`
- `campaignId`
- `missionId`
- `wallet`
- `target`
- `selector`
- `asset`
- `amountBaseUnits`
- `spender`
- `maxAllowanceBaseUnits`
- `expiryUnix`

The MVP verifier follows four steps:

1. Read the signed manifest and compute `intentHash`.
2. Wait for the required deposit transaction to receive GIWA Sepolia block confirmation.
3. Decode calldata and logs for wallet, target, selector, asset, amount, spender, and allowance usage.
4. Return a deterministic decision: `matched`, `mismatched`, `failed`, or `timeout`.

MVP block confirmation means standard RPC transaction receipt status `1` and confirmation depth greater than or equal to the configured MVP threshold. Flashblocks observations are never part of this final confirmation calculation.

The output should be one of:

- `matched`
- `mismatched`
- `failed`
- `timeout`

Only `matched` transactions should produce a successful ProofKPI receipt.

`timeout` is an off-chain, non-terminal observation state. It should not emit `IntentFailed` because an unconfirmed transaction may later confirm. `IntentFailed` is only for confirmed but mismatched or failed transaction evidence.

Mismatch examples:

- transaction target differs from the manifest target
- spender differs from the declared spender
- amount exceeds `amountBaseUnits`
- allowance used exceeds `maxAllowanceBaseUnits`
- transaction confirms after `expiryUnix`

The verifier is not a risk scanner, phishing detector, KYC/compliance decision, identity issuer, or settlement proof.

## User Reason To Use

Users do not use this because they want a "rail." They use it because they want to complete a confusing first GIWA Sepolia mock vault action with more clarity and a receipt.

Primary user jobs:

- Understand what they are about to sign before sending a transaction.
- Know the target contract, spender, allowance, amount, and expected result.
- Get fast feedback without confusing preconfirmation with final confirmation.
- Receive a receipt recording the manifest-matched testnet action on GIWA Sepolia.
- Build a GIWA readiness history without looking like cheap airdrop farming.

User hook:

```text
Review the action before you sign.
```

Support hooks:

```text
Your first GIWA Sepolia mock vault action, with a receipt.
From intent to receipt.
Preconfirmed fast, confirmed clearly.
Manifest-matched testnet actions, not empty quests.
```

## Partner Reason To Use

The paying customer is likely the partner dApp, campaign operator, or GIWA ecosystem team.

They use the product to show evidence that:

- users with verified status where available reached the dApp
- users connected wallets successfully
- users accepted the intent
- users completed a valid GIWA Sepolia testnet transaction
- users completed manifest-matched GIWA Sepolia mock vault actions
- campaign activity can be reported with first-action conversion, matched tx rate, and mock testnet deposit metrics

Partner pitch:

```text
Quest completion is not enough. GIWA Verified Intent Rail records evidence that a user's first GIWA Sepolia mock vault action matched the signed manifest, with txHash, receiptHash, and mock testnet deposit metrics.
```

Korean:

```text
퀘스트 완료만으로는 부족합니다. GIWA Verified Intent Rail은 사용자의 첫 GIWA Sepolia mock vault 액션이 서명된 manifest와 매칭되었는지 txHash, receiptHash, mock testnet deposit 지표로 기록합니다.
```

## MVP Flagship Flow

The first MVP demo should be one clear user action, not a dashboard-first product.

Recommended flagship flow:

```text
First Mock Vault Deposit on GIWA Sepolia
```

Demo sequence:

1. User enters from a partner campaign link or QR.
2. App checks wallet, GIWA Sepolia network, test token balance, and optional verified status.
3. User sees an Intent Preview.
4. User confirms an optional limited approve transaction if required.
5. User executes the required mock vault deposit transaction.
6. UI shows `submitted -> fast feedback -> block confirmed -> verifier checking -> matched`.
7. User receives a ProofKPI receipt only after verifier match.
8. Partner report shows depositTxHash, receiptHash, matched tx status, and mock testnet deposit metrics.

Identity boundary:

```text
The product reads Dojang Verified Address or up.id status where available. It does not run identity checks, issue identity credentials, or block the guest fallback path in the MVP.
```

MVP copy:

```text
Make your first mock GIWA Sepolia vault deposit.
Testnet-only guided intent. No real funds, yield, or RWA claim.
```

Receipt copy:

```text
Receipt ready: Your block-confirmed GIWA Sepolia testnet vault deposit matched the signed manifest.
```

## Receipt Model

The receipt should feel like execution evidence, not an NFT reward.

Canonical receipt payload fields, used for `receiptHash`:

- `schemaVersion`
- `verifierVersion`
- `intentHash`
- `chainId`
- `networkName`
- `status`
- `actionType`
- `asset`
- `amountBaseUnits`
- `target`
- `spender`
- `maxAllowanceBaseUnits`
- `allowanceUsedBaseUnits`
- `approvalRequired`
- `approveTxHash`
- `depositTxHash`
- `depositBlockNumber`
- `depositBlockHash`
- `campaignId`
- `missionId`
- `wallet`
- `verifiedState`
- `verifiedProvider` (optional)
- `testnetDepositAmountDelta`
- `issuedAt`
- `issuer`
- `safetyNotice`

Receipt envelope fields, not included in `receiptHash`:

- `receiptHash`
- `decisionTxHash`
- `decisionBlockNumber`
- `decisionBlockHash`
- `explorerUrl`
- display-only copy

Receipt hash rule:

```text
receiptHash = keccak256(canonicalReceiptPayload)
```

`receiptHash` is excluded from `canonicalReceiptPayload` to avoid a self-referential hash. `decisionTxHash` is also excluded because it is produced after the receipt hash is emitted in `IntentMatched`.

Canonical payload encoding rule:

```text
canonicalPayloadBytes = utf8(JSON.stringify(fieldsInExactOrder))
```

Rules:

- fields appear in the exact schema order
- absent optional fields are omitted, not set to `undefined`
- null is allowed only for fields that explicitly permit null
- addresses are lowercase `0x` strings
- `uint256` values are base-unit decimal strings
- bytes values are lowercase `0x` hex strings
- golden vectors must include payload JSON, payload byte hex, and hash

Example safety notice:

```text
Testnet-only. No real asset, no yield, no RWA claim.
```

## Product Modules

| Module | Purpose | MVP Output |
|---|---|---|
| Campaign Entry | Route users from partner link or QR | `campaignId`, `missionId`, optional `referralCode` |
| Readiness Check | Confirm wallet, network, token balance, optional verified status | clear setup state and recovery actions |
| Signed Action Manifest | Define allowed action conditions | target, selector, asset, amount, spender, max allowance, expiry |
| Intent Preview | Explain what the user is about to do | human-readable action summary |
| Transaction Execution | Submit the GIWA Sepolia testnet transaction | approveTxHash if needed, depositTxHash, explorer link |
| Flashblocks Early Status | Provide fast early feedback | submitted, fastFeedback, blockConfirmed, timeout |
| Execution Evidence | Compare result with declared intent | verifierChecking, matched, mismatched, failed, timeout |
| Verifier Decision | Classify whether the confirmed tx matched the manifest | matched, mismatched, failed, timeout |
| ProofKPI | Report action outcome to partner | funnel, matched tx rate, mock testnet deposit metrics |

## Minimum MVP Scope Lock

For the July 31 MVP, keep the demo narrower than the product vision:

- one flagship flow: `First Mock Vault Deposit on GIWA Sepolia`
- one mock ERC-20 token
- one mock vault contract
- one rail/event contract
- one canonical manifest schema with typed fields and canonical hash rules
- one receipt schema generated from canonical fields only after verifier match on a block-confirmed transaction
- optional Dojang/up.id read with `verified`, `guest`, or `unavailable` states

## Canonical MVP Schema

Manifest fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `manifestVersion` | string | yes | MVP uses `1`. |
| `chainId` | number | yes | GIWA Sepolia, `91342`. |
| `nonce` | string | yes | Unique per wallet and campaign action. |
| `expiryUnix` | number | yes | Verifier returns `timeout` or `mismatched` after expiry. |
| `campaignId` | string | yes | Partner campaign identifier. |
| `missionId` | string | yes | Single MVP mission identifier. |
| `wallet` | address | yes | User wallet expected to execute the action. |
| `actionType` | string | yes | MVP uses `mockVaultDeposit`. |
| `target` | address | yes | Mock vault contract. |
| `selector` | bytes4 | yes | Deposit function selector. |
| `asset` | address | yes | Mock ERC-20 token. |
| `amountBaseUnits` | uint256 string | yes | Test token amount in base units. |
| `spender` | address | yes | Contract allowed to spend the mock token. |
| `maxAllowanceBaseUnits` | uint256 string | yes | Maximum test token allowance permitted by the manifest. |
| `referralCode` | string | no | Optional attribution only; not required for receipt matching. |

Intent hash rule:

```text
intentHash = keccak256(canonicalManifestPayload)
```

The MVP should use deterministic field ordering and base-unit amounts for both manifest and receipt payloads.

EIP-712 signing relation:

- `intentHash` is the product identity hash used in events, receipts, evidence, and idempotency keys.
- `manifestStructHash` is the EIP-712 struct hash for signing.
- `eip712Digest` is the EIP-712 digest recovered against the official campaign signer.
- the three values are stored in evidence JSON with golden vectors.
- for deployed runs, EIP-712 `domain.verifyingContract` is the deployed `IntentRail` address.
- deployment-independent signing vectors are test vectors only and must not be accepted by the Sprint 4 verifier for deployed GIWA Sepolia evidence.

String id normalization rule:

```text
idToBytes32(id) = keccak256(toUtf8Bytes(id.trim()))
```

The MVP should reject empty trimmed ids. Human-readable `campaignId` and `missionId` remain in canonical payloads and evidence JSON; `campaignIdBytes32` and `missionIdBytes32` are used in contract events.

## MVP Event Contract

The rail/event contract should favor simple, inspectable events over complex on-chain logic.

```solidity
event IntentSubmitted(
    bytes32 indexed intentHash,
    bytes32 indexed campaignIdBytes32,
    bytes32 indexed missionIdBytes32,
    address wallet,
    address target,
    bytes4 selector,
    address asset,
    uint256 amountBaseUnits,
    address spender,
    uint256 maxAllowanceBaseUnits,
    uint256 expiryUnix
);

event IntentMatched(
    bytes32 indexed intentHash,
    bytes32 indexed receiptHash,
    address indexed wallet,
    bytes32 approveTxHash,
    bytes32 depositTxHash,
    uint256 blockNumber,
    bytes32 blockHash,
    uint256 allowanceUsedBaseUnits,
    uint256 issuedAt
);

event IntentFailed(
    bytes32 indexed intentHash,
    address indexed wallet,
    bytes32 depositTxHash,
    uint256 blockNumber,
    bytes32 blockHash,
    bytes32 status,
    bytes32 failureReason,
    uint256 decidedAt
);
```

Human-readable status and failure reason strings belong in evidence JSON and partner-facing UI. On-chain decision events should use bounded fields that are easy to index.

Bounded status code rule:

- `MATCHED = bytes32("MATCHED")`
- `MISMATCHED = bytes32("MISMATCHED")`
- `FAILED = bytes32("FAILED")`
- failure reason codes use `bytes32("EXPIRED")`, `bytes32("TARGET_MISMATCH")`, `bytes32("SPENDER_MISMATCH")`, `bytes32("ALLOWANCE_EXCEEDED")`, `bytes32("TX_FAILED")`, or `bytes32("MISSING_REQUIRED_LOG")`

No-approve sentinel:

- evidence JSON uses `approvalRequired=false` and `approveTxHash=null`
- on-chain `IntentMatched.approveTxHash` uses `bytes32(0)`
- canonical receipt payload keeps `approveTxHash=null` when no approve transaction was required

Post-MVP items:

- mock/testnet stake and swap templates, CSV/API export, partner billing, full dashboard, GIWA Wallet in-app placement, production compliance review workflows that do not claim to make identity or compliance decisions

Off-chain evidence JSON should include:

- `chainId`
- `manifestVersion`
- `intentHash`
- `receiptHash` when matched
- `wallet`
- `campaignId`
- `missionId`
- `actionType`
- `target`
- `selector`
- `asset`
- `amountBaseUnits`
- `spender`
- `maxAllowanceBaseUnits`
- `allowanceUsedBaseUnits`
- `approveTxHash` if used
- `depositTxHash`
- `blockNumber`
- `blockHash`
- `status`
- `failureReason`

Contract events use bounded on-chain fields only. Raw string ids, `chainId`, `manifestVersion`, and `actionType` remain in canonical payloads and evidence JSON.

Decision policy:

- one `intentHash` has at most one terminal confirmed attempt in the MVP
- `matched`, `mismatched`, and `failed` are terminal
- `timeout` is non-terminal and off-chain only
- `IntentSubmitted.tx.from` may be the configured intent submitter
- `IntentSubmitted.wallet`, `approve.owner`, and `depositTx.from` must match manifest `wallet`

MVP acceptance cases:

- wrong network
- insufficient test token balance
- expired manifest
- mismatched target
- mismatched spender
- allowance used above `maxAllowanceBaseUnits`
- deposit transaction failed
- Flashblocks early status timeout
- Dojang/up.id state is `guest` or `unavailable`

## Status Language

Flashblocks must never be described as final confirmation.

Use:

```text
Submitted: Your wallet sent the transaction.
Preconfirmed: The network has seen it. This is fast feedback, not final confirmation.
Block confirmed: Standard RPC block confirmation received. The verifier check can start.
Verifier checking: The app is comparing the block-confirmed transaction with the signed manifest.
Matched: The verifier matched the transaction to the manifest. Your receipt is ready.
Timeout: The app did not observe confirmation within the expected window. Check the explorer before retrying.
```

Authoritative Korean status copy:

```text
제출됨: 지갑이 트랜잭션을 보냈습니다.
빠른 피드백: 네트워크가 트랜잭션을 관측했습니다. 최종 확인은 아닙니다.
블록 확인됨: 표준 RPC 기준 블록 확인을 받았습니다. 이제 verifier 확인을 시작할 수 있습니다.
검증 중: 앱이 블록 확인된 트랜잭션과 서명된 manifest를 비교하고 있습니다.
매칭됨: verifier가 트랜잭션과 manifest를 매칭했습니다. 영수증이 준비되었습니다.
시간 초과: 예상 시간 안에 확인 상태를 관측하지 못했습니다. 다시 시도하기 전에 explorer를 확인하세요.
```

Legacy corrupted Korean status copy below must not be used for implementation:

```text
제출됨: 지갑에서 트랜잭션을 보냈습니다.
빠른 피드백: 네트워크가 트랜잭션을 관측했습니다. 아직 최종 확정은 아닙니다.
확인됨: 온체인 블록 확인을 받았습니다. 영수증을 만들 수 있습니다.
시간 초과: 앱이 예상 시간 안에 확인 상태를 관측하지 못했습니다. 다시 시도하기 전에 explorer를 확인하세요.
```

Do not use:

- instant-settlement wording
- sub-second final confirmation wording
- `preconfirmed success`
- `payment settled`

## Competitive Positioning

| Category | Examples | Overlap | Difference |
|---|---|---|---|
| Quest / Growth | Galxe, Zealy, Layer3 | campaigns and user activation | Intent Rail records first GIWA Sepolia mock vault action evidence with tx and KPI data |
| Wallet Preview | Rabby, Tenderly-style preview | pre-sign clarity | Intent Rail connects preview to campaign manifest and post-execution receipt |
| Risk Scanning | Blowfish-style tools | warnings before signing | Intent Rail is not a security guarantee; it explains manifest-covered actions |
| Intent Protocol | CoW Protocol | signed intent concept | Intent Rail is activation intent, not trade execution or solver routing |
| Attestation | EAS, Dojang | verifiable claims | Intent Rail consumes verified status and produces action receipts |
| Wallet Onboarding | Privy, Dynamic, AA/paymaster stacks | user onboarding and execution help | Intent Rail starts after wallet readiness and records first testnet action evidence |

Category line:

```text
Quest tools track participation. Wallet previews explain signing. GIWA Verified Intent Rail connects signed intent, confirmed GIWA Sepolia testnet execution, and partner activation evidence.
```

Safe differentiation line:

```text
Galxe tracks participation and Rabby previews transactions. GIWA Verified Intent Rail checks whether a confirmed GIWA Sepolia testnet transaction matched the user's declared manifest and turns that evidence into partner KPIs.
```

## What To Avoid

Do not pitch this as:

- a quest platform
- a dashboard product
- a wallet firewall
- a scam prevention guarantee
- a transaction simulator
- a solver or best-execution protocol
- a production asset product
- a yield product
- a payment settlement rail
- a KYC provider

Avoid these claims:

- "We prevent phishing."
- "We remove wallet risk."
- "Flashblocks confirms transactions in 200ms."
- "We provide production asset settlement."
- "We run identity checks."
- "We replace Galxe/Rabby/CoW."
- "This is a first financial action proof rail."
- "Users completed a real testnet transaction."
- "Campaign budget produced TVL."

Use these safer claims:

- "We provide intent previews for manifest-covered actions."
- "We separate preconfirmation from final confirmation."
- "We use GIWA Sepolia testnet transactions as evidence."
- "We turn manifest-matched GIWA Sepolia mock vault actions into ProofKPI receipts."
- "We read verified status where available and provide guest fallback."
- "We report mock testnet deposit metrics, not real TVL or yield."

## GASOK Alignment

GASOK criteria include GIWA ecosystem fit, originality, feasibility, marketability, team capability, GIWA Wallet integration, MVP implementation level, and technical maturity.

This concept aligns because it can show:

- GIWA-native action execution on GIWA Sepolia
- Flashblocks-based fast status feedback
- optional Dojang/up.id-aware user state
- measurable testnet tx evidence
- partner-facing KPI reporting
- a GIWA Wallet-compatible onboarding path without claiming current in-wallet placement

Judge-visible MVP artifacts:

| GASOK Criterion | MVP Artifact | Why It Matters |
|---|---|---|
| GIWA ecosystem fit | GIWA Sepolia mock vault deposit tx, explorer link, and chainId in manifest/receipt | Shows the product runs on GIWA, not a generic off-chain campaign page. |
| Originality | signed manifest -> confirmed tx match -> receipt | Combines wallet preview, execution evidence, and partner KPI reporting. |
| Feasibility | one token, one vault, one manifest, one receipt | Keeps the July MVP narrow enough to build and demo. |
| Marketability | partner single-run summary | Shows why ecosystem teams and partner dApps would use it. |
| GIWA Wallet integration path | intent preview and transaction status flow | Shows a GIWA Wallet-compatible onboarding path without claiming current in-wallet placement. |
| Technical maturity | verifier decision, event logs, receipt hash, timeout/mismatch states | Shows the demo handles more than the happy path. |
| Team capability / implementation level | repeatable demo, recomputable evidence JSON, acceptance checklist, known limitations | Shows the team can execute, verify, and explain the MVP boundaries. |

Official references checked on 2026-06-14:

- GASOK: https://giwa.io/gasok
- Flashblocks: https://docs.giwa.io/giwa-chain/en/network-information/flashblocks
- Verified Address: https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/dojang/verified-address
- up.id: https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/up-id

## Final External Message

```text
GIWA Verified Intent Rail is a testnet action evidence rail for GIWA.

It helps users review one GIWA Sepolia mock vault action before signing, execute it on testnet, and receive a receipt only after verifier match on a block-confirmed transaction.

For partners, it turns campaign traffic into manifest-matched activation evidence: depositTxHash, receiptHash, read-only verifiedState where available, and mock testnet deposit metrics. The verifiedState field is not KYC, not eligibility, and not a gating decision.
```

Authoritative Korean:

```text
GIWA Verified Intent Rail은 GIWA를 위한 testnet action evidence rail입니다.

사용자는 서명 전에 GIWA Sepolia mock vault 액션을 검토하고, testnet에서 실행한 뒤, block-confirmed transaction이 verifier match된 경우에만 영수증을 받습니다.

파트너는 캠페인 유입을 depositTxHash, receiptHash, 사용 가능한 경우의 read-only verifiedState, mock testnet deposit 지표로 구성된 manifest-matched activation evidence로 볼 수 있습니다. verifiedState는 KYC, 자격 판단, 게이팅이 아닙니다.
```

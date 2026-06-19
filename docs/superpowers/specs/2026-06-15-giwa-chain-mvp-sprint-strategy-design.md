# GIWA Chain MVP Sprint Strategy Design

## Purpose

This document defines how to implement `GIWA Verified Intent Rail` without attempting the whole product in one pass.

The central constraint is that the MVP must actually operate on GIWA Sepolia, not merely simulate a Web3 flow in a browser. The product is only credible if the demo can show an actual on-chain GIWA Sepolia mock vault transaction, block confirmation evidence, a deterministic manifest match, and a receipt generated after confirmation.

## Source Documents

- `03_giwa_verified_intent_rail_positioning.md` - canonical product positioning and MVP scope.
- `docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md` - full implementation map created before this sprint strategy.

Official GIWA references checked on 2026-06-15:

- GIWA Sepolia network setup: https://docs.giwa.io/get-started/connect-to-giwa
- GIWA Sepolia faucet setup: https://docs.giwa.io/get-started/faucets
- Flashblocks behavior: https://docs.giwa.io/giwa-chain/en/network-information/flashblocks
- Dojang Verified Address: https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/dojang/verified-address
- up.id: https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/up-id

## Non-Negotiable Chain Requirements

The MVP must use GIWA Sepolia as the execution layer.

Required chain values:

| Item | Value |
|---|---|
| Network | GIWA Sepolia |
| Chain ID | `91342` |
| Standard RPC | `https://sepolia-rpc.giwa.io` |
| Flashblocks RPC | `https://sepolia-rpc-flashblocks.giwa.io` |
| Explorer | `https://sepolia-explorer.giwa.io` |
| Native token symbol | `ETH` |

The demo must produce these judge-visible artifacts:

- deployment transaction hashes for mock token, mock vault, and intent rail
- deployed mock token address on GIWA Sepolia
- deployed mock vault address on GIWA Sepolia
- deployed intent rail contract address on GIWA Sepolia
- `intentSubmittedTxHash`
- `approveTxHash` when approval is required
- user `depositTxHash`
- verifier decision transaction hash: `decisionTxHash`
- confirmed `blockNumber`
- confirmed `blockHash`
- GIWA explorer link
- `intentHash`
- `receiptHash`
- receipt payload containing `chainId: 91342`
- partner summary showing manifest-matched mock testnet deposit metrics
- final `evidence.json` bundle containing addresses, transaction hashes, block evidence, explorer links, `intentHash`, `receiptHash`, and verifier status

## Product Boundary

The MVP is a testnet action evidence rail.

It must not become:

- a generic quest platform
- a generic dashboard
- a wallet firewall
- a transaction simulator
- a solver or best-execution system
- a KYC provider
- an actual asset, yield, RWA issuance, or settlement product

The first action remains:

```text
First Mock Vault Deposit on GIWA Sepolia
```

## Why Split Into Sprints

The system has four different risk layers:

1. Protocol correctness: manifest and receipt hashes must be stable.
2. Chain correctness: contracts and transactions must actually run on GIWA Sepolia.
3. Verification correctness: confirmed transactions must match or fail deterministically.
4. Demo clarity: users and judges must understand the flow without confusing fast feedback with final confirmation.

If the UI is built first, the product can look finished while the chain evidence and verifier remain fragile. The safer order is to prove the protocol, then prove the chain path, then build the verifier, then attach the user experience.

## Approach Options

### Option A: Chain-Anchored Vertical Slice

Build protocol utilities first, then local contracts, then deploy a minimal GIWA Sepolia chain anchor before building the full UI.

Pros:

- proves early that the MVP really operates on GIWA Sepolia
- catches RPC, explorer, wallet, deployment, and block confirmation issues before UI work
- makes the later UI honest because it is wired to real deployed addresses
- strongest fit for GASOK judging criteria

Cons:

- requires testnet keys and deployment discipline earlier
- slower to get a polished screen

Recommendation: use this approach.

### Option B: UI-First Demo

Build the full guided UI first, then connect contracts and verifier later.

Pros:

- faster first visual demo
- easier to discuss user flow with non-technical reviewers

Cons:

- high risk of a polished shell without real GIWA evidence
- verifier and receipt rules may be forced to fit UI assumptions
- more likely to drift into a generic onboarding or quest product

Do not use this as the primary path.

### Option C: Backend-Only Proof

Build contracts, scripts, verifier, and receipts first, then add UI at the end.

Pros:

- technically rigorous
- good for proving deterministic receipt behavior

Cons:

- weak early user story
- harder to show the 90-second demo loop
- partner/reporting value may arrive too late

Use selected pieces of this approach inside Option A.

## P0 MVP Cut

The full sprint map has eight phases, but not every phase has the same priority. The P0 MVP must be a narrow vertical slice:

```text
one campaign
-> one mission
-> one mock token and one mock vault
-> one signed manifest bound to GIWA Sepolia
-> one IntentSubmitted event on GIWA Sepolia
-> one approve transaction if required
-> one mock vault deposit transaction on GIWA Sepolia
-> one verifier matched decision
-> one IntentMatched event on GIWA Sepolia
-> one receipt page
-> one thin partner summary
```

P0 is complete only when the demo proves the rail, not just the deposit. A mock vault `depositTxHash` alone proves that a user sent a GIWA Sepolia transaction. It does not prove that `GIWA Verified Intent Rail` worked end to end. The MVP evidence must include `intentSubmittedTxHash`, `depositTxHash`, `decisionTxHash`, and `receiptHash`.

`decisionTxHash` is a final verifier artifact, not a Sprint 3 chain-shape artifact. It may only be counted as P0 evidence after Sprint 4 verifies the confirmed deposit transaction and emits `IntentMatched` or `IntentFailed` from the verifier operator.

P1 items:

- broader mismatch gallery in the UI
- richer partner analytics
- multiple campaigns
- multiple action templates
- full Dojang/up.id integration beyond read-only state

Sprint 6 should remain thin but should not be delayed out of the MVP demo. A one-page partner summary is part of P0 because it explains why the evidence matters to a campaign operator.

## Recommended Sprint Sequence

```text
Sprint 0: Scope and evidence contract
-> Sprint 1: Protocol kernel
-> Sprint 2: Local contract proof
-> Sprint 3: GIWA Sepolia chain anchor
-> Sprint 4: Verifier and receipt engine
-> Sprint 5: Thin guided user flow
-> Sprint 6: Partner ProofKPI summary
-> Sprint 7: Demo hardening and submission evidence
```

## Sprint 0: Scope and Evidence Contract

Goal:

Freeze the product boundary and the evidence model before adding dependencies or code.

Main decisions:

- one flagship flow only: `First Mock Vault Deposit on GIWA Sepolia`
- one mock ERC-20 token
- one mock vault
- one intent rail event contract
- one campaign id
- one mission id
- one manifest schema
- one receipt schema
- Dojang/up.id is read-only optional state with `verified`, `guest`, or `unavailable`

Output:

- sprint strategy document
- updated implementation plan split into separate sprint plans
- final manifest field list
- final receipt field list
- final event list
- final demo success criteria
- final P0 evidence bundle schema
- final `evidence.json` schema
- final role and key matrix
- final `confirmationDepth` value
- final dependency approval checklist
- final git repository readiness decision

Exit criteria:

- every future sprint can be judged by whether it produces GIWA Sepolia evidence
- no scope item requires mainnet, actual assets, yield, RWA issuance, settlement, security guarantees, or KYC decisions
- the workspace has either a confirmed `.git` repository or an explicit non-git execution mode for local prototype work
- dependency installation is not allowed until license, recent-release or adoption status, and lighter alternatives are reviewed
- `DEPLOYER_PRIVATE_KEY`, `CAMPAIGN_SIGNER_PRIVATE_KEY`, and `VERIFIER_PRIVATE_KEY` roles are separated in the plan
- demo user signing stays in the user's wallet; the server must not require or store a demo user's private key

## Role and Gas Policy

| Role | Purpose | Gas Payer | Secret Handling |
|---|---|---|---|
| Deployer | deploy mock token, mock vault, and intent rail | deployer | `DEPLOYER_PRIVATE_KEY` in local env only |
| Campaign signer | signs official manifests | no on-chain gas required | `CAMPAIGN_SIGNER_PRIVATE_KEY` in server env only |
| Intent submitter | emits `IntentSubmitted` after user accepts the manifest | verifier/operator relayer in P0 | relayer key may reuse `VERIFIER_PRIVATE_KEY` for MVP |
| Demo user | sends approve and deposit transactions | user wallet | private key stays in wallet; not stored by app |
| Verifier operator | emits `IntentMatched` or `IntentFailed` after verification | verifier/operator | `VERIFIER_PRIVATE_KEY` in server env only |

P0 should use a relayed `IntentSubmitted` event to keep the live demo short. The user still controls the actual approve and deposit transactions. A user-submitted `IntentSubmitted` fallback is acceptable for local testing, but it should not be the default 90-second demo path unless the team explicitly accepts the extra wallet transaction.

## Sprint 1: Protocol Kernel

Goal:

Create a small shared protocol package that defines the canonical evidence language for the entire product.

Build:

- `ActionManifest` type
- `SignedManifest` type
- `ProofKpiReceipt` type
- deterministic canonical payload ordering
- domain-separated manifest signing payload
- `intentHash`
- `receiptHash`
- `campaignId` and `missionId` normalization to `bytes32`
- validation for `chainId: 91342`
- validation for non-empty `nonce`, `campaignId`, and `missionId`
- official campaign signer allowlist or campaign registry rule
- golden test vectors for manifest hash and receipt hash

Signing rule:

The preferred signing model is EIP-712 typed data. If implementation speed forces a plain message signature for the first prototype, the signed payload must still include an explicit domain prefix and the verifier must enforce the official campaign signer.

Minimum EIP-712 domain:

| Field | Value |
|---|---|
| `name` | `GIWA Verified Intent Rail` |
| `version` | `1` |
| `chainId` | `91342` |
| `verifyingContract` | deployed `IntentRail` address |

The signed manifest must include `nonce` and `expiryUnix`. The verifier must reject any manifest not signed by the configured campaign signer or campaign registry entry.

Test vector rule:

Sprint 1 may create deployment-independent golden vectors for canonical payload ordering, `intentHash`, and `receiptHash`. The EIP-712 digest that includes `verifyingContract` becomes final only after Sprint 3 deploys `IntentRail` on GIWA Sepolia. Sprint 3 must write a deployment-bound manifest vector, and Sprint 4 must use that vector for verifier tests.

Why this comes first:

All later components depend on identical manifest and receipt semantics. If the protocol shifts after contracts or UI are built, the whole MVP becomes expensive to correct.

Verification:

- unit tests prove stable manifest hash
- unit tests prove stable receipt hash
- invalid chain id is rejected
- invalid action type is rejected
- empty campaign or mission id is rejected
- empty nonce is rejected
- official signer mismatch is rejected
- duplicate hash vectors stay stable across test runs

Exit artifact:

```text
Given the same manifest, every component computes the same intentHash.
Given the same receipt payload, every component computes the same receiptHash.
```

## Sprint 2: Local Contract Proof

Goal:

Prove the on-chain shape locally before spending time on GIWA Sepolia deployment or UI.

Build:

- `MockIntentToken`
- `MockVault`
- `IntentRail`
- local Hardhat tests
- deployment script structure

Contract philosophy:

The rail contract should emit inspectable events rather than perform complex business logic. Matching remains off-chain in the verifier because the MVP needs deterministic evidence classification, not heavy on-chain enforcement.

Verification:

- user can mint mock test tokens locally
- user can approve the vault locally
- user can deposit into the mock vault locally
- token `Approval` event can be observed for the spender and allowance
- token `Transfer` event can be observed for the deposit amount
- mock vault `MockDeposit` event can be observed for wallet, asset, and amount
- `IntentSubmitted` event emits the manifest-covered action fields
- `IntentMatched` event emits `intentHash`, `receiptHash`, wallet, deposit tx hash, block number, allowance used, and issued time
- non-operator accounts cannot emit verifier decision events

Exit artifact:

```text
The local chain proves that the mock deposit and evidence events are structurally sound.
```

## Sprint 3: GIWA Sepolia Chain Anchor

Goal:

Prove the product actually runs on GIWA Sepolia before building the user-facing flow.

Build:

- GIWA Sepolia preflight script
- GIWA Sepolia network config
- deploy script using `chainId: 91342`
- `.env.example` with required non-secret variable names
- deployment output file
- script-driven mock deposit on GIWA Sepolia
- explorer URL generation
- `EXPLORER_TX_URL_TEMPLATE` configuration
- `evidence.json` writer

Preflight checks:

- standard GIWA RPC returns `chainId: 91342`
- Flashblocks RPC returns `chainId: 91342`
- deployer account has enough test ETH for deployment and verifier decision transactions
- user demo wallet has enough test ETH for approve and deposit transactions
- explorer transaction URL template is smoke-tested with a known or newly produced transaction hash
- wallet network switch data is available for manual and injected-provider flows

Required chain behavior:

- deploy mock token to GIWA Sepolia
- deploy mock vault to GIWA Sepolia
- deploy intent rail to GIWA Sepolia
- record deployment transaction hashes and explorer URLs
- fund a test wallet with mock test tokens
- submit `IntentSubmitted` to the intent rail contract
- submit approval transaction
- submit mock vault deposit transaction
- observe block confirmation through standard GIWA RPC
- observe fast feedback through Flashblocks RPC when available
- record explorer links

Sprint 3 intentionally does not produce the final `decisionTxHash`. It proves deployment, intent submission, approval, deposit, explorer links, and block confirmation. The final verifier decision event belongs to Sprint 4 after the verifier engine is implemented.

Verification:

- deployment script fails if connected chain is not `91342`
- preflight fails if standard RPC, Flashblocks RPC, deployer balance, or user wallet balance is missing
- intent rail emits `IntentSubmitted` on GIWA Sepolia
- deposited transaction has a GIWA Sepolia explorer URL
- transaction receipt includes `blockNumber` and `blockHash`
- block confirmation is defined as standard RPC receipt with successful status, non-null `blockHash`, non-null `blockNumber`, and the configured confirmation depth
- Flashblocks status is labeled only as fast feedback and never used as receipt evidence
- final receipt generation is still blocked until Sprint 4

Exit artifact:

```text
mockTokenDeploymentTxHash=<GIWA Sepolia transaction hash>
mockVaultDeploymentTxHash=<GIWA Sepolia transaction hash>
intentRailDeploymentTxHash=<GIWA Sepolia transaction hash>
mockToken=<GIWA Sepolia address>
mockVault=<GIWA Sepolia address>
intentRail=<GIWA Sepolia address>
intentSubmittedTxHash=<GIWA Sepolia transaction hash>
approveTxHash=<GIWA Sepolia transaction hash when approval is required>
depositTxHash=<GIWA Sepolia transaction hash>
decisionTxHash=<not produced until Sprint 4>
blockNumber=<confirmed block number>
blockHash=<confirmed block hash>
explorerUrl=https://sepolia-explorer.giwa.io/tx/<depositTxHash>
evidenceJson=docs/evidence/giwa-sepolia-mvp-evidence.json
```

This sprint is the first hard proof that the MVP is not a generic browser demo.

## Sprint 4: Verifier and Receipt Engine

Goal:

Turn confirmed GIWA Sepolia transactions into deterministic verifier decisions and successful receipts only when the transaction matches the signed manifest.

Build:

- manifest signature verification
- official campaign signer or campaign registry verification
- transaction fetch by `depositTxHash`
- block confirmation check
- calldata decode for `deposit(uint256)`
- mock vault token address check
- target check
- wallet check
- selector check
- asset check from vault and logs
- spender check from approval or allowance evidence
- amount check
- allowance bound check from `Approval`, `Transfer`, and mock vault deposit evidence
- token `Transfer` log verification
- mock vault `MockDeposit` log verification
- `IntentSubmitted` event existence and field match verification
- expiry check
- `matched`, `mismatched`, `failed`, `timeout` decisions
- verifier result event emission through `IntentMatched` or `IntentFailed`
- `decisionTxHash` capture after the verifier result event
- receipt payload creation
- receipt hash creation
- duplicate verification idempotency by `intentHash + depositTxHash`
- receipt storage for demo use

Verification:

- matched deposit creates a receipt
- recovered manifest signer must equal the configured official campaign signer or campaign registry signer
- mismatched target does not create a successful receipt
- wrong wallet does not create a successful receipt
- amount above manifest does not create a successful receipt
- transaction after expiry does not create a successful receipt
- failed deposit does not create a successful receipt
- unconfirmed transaction returns timeout
- mismatched asset does not create a successful receipt
- mismatched spender does not create a successful receipt
- allowance above `maxAllowanceBaseUnits` does not create a successful receipt
- duplicate verification of the same `intentHash + depositTxHash` returns the same `receiptHash`
- confirmed block evidence and verifier match are separate states
- receipt ready appears only after `status: matched`
- `IntentSubmitted -> deposit confirmed -> verifier matched -> decisionTxHash` order is recorded in evidence

Exit artifact:

```text
An actual GIWA Sepolia depositTxHash can be checked against an official signed manifest and converted into a ProofKPI receipt only after block confirmation and verifier match.
```

Additional Sprint 4 artifact:

```text
decisionTxHash=<GIWA Sepolia transaction hash for verifier-produced IntentMatched or IntentFailed>
verifierVersion=<version that produced the decision>
verifierInputHash=<hash of manifest, deposit tx receipt, and decoded evidence inputs>
```

Receipt idempotency rule:

The receipt identity is keyed by `intentHash + depositTxHash`. If verification is requested again for the same pair, the system must return the existing receipt. `issuedAt` must not cause a different `receiptHash` for the same verified action.

Flashblocks evidence rule:

Flashblocks observations may be recorded as `fastFeedbackObserved`, but they must not be included as final block evidence. Receipt fields `blockNumber` and `blockHash` must come from the standard GIWA RPC confirmed receipt.

Intent usage rule:

The MVP treats one `intentHash` as single-use. A second successful receipt for the same `intentHash` is rejected unless it is the same `depositTxHash` returning the existing idempotent receipt.

## Sprint 5: Thin Guided User Flow

Goal:

Build the minimum user-facing path required for the 90-second demo.

Build:

- campaign entry page
- wallet connect
- GIWA Sepolia network check
- mock test token balance check
- optional verified state display
- signed manifest request
- intent preview
- limited approve transaction
- mock vault deposit transaction
- submitted status
- Flashblocks fast feedback status
- confirmed status
- receipt page redirect
- receipt page showing `intentHash`, `receiptHash`, `depositTxHash`, `decisionTxHash`, `blockNumber`, `blockHash`, and explorer links

UI principle:

The first screen should be the actual guided action flow, not a landing page. The user must see what they are about to sign: target, selector, asset, amount, spender, and max allowance.

Verification:

- wrong network blocks execution and asks for GIWA Sepolia
- missing wallet blocks manifest request
- no test token balance gives a recovery message
- user can review manifest before signing transactions
- receipt is not shown before block confirmation
- receipt is not shown merely because a block is confirmed; it appears only after verifier status is `matched`
- preconfirmation copy never implies finality

Exit artifact:

```text
User can complete the flagship GIWA Sepolia mock vault action from the web app and land on a receipt page.
```

## Sprint 6: Partner ProofKPI Summary

Goal:

Add the smallest partner-facing report that demonstrates marketability without becoming a dashboard product.

Priority:

This sprint is thin but part of the P0 demo. It can use a simple local store for the MVP, but the report must be visible in the judging flow because it explains why campaign operators care about the receipt.

Build:

- single campaign report page
- campaign entry count
- wallet connected count
- intent accepted count
- deposit submitted count
- manifest-matched receipt count
- matched transaction rate
- mock testnet deposit metrics
- links to receipt and explorer evidence

Verification:

- report includes `depositTxHash`
- report includes `receiptHash`
- report includes `intentSubmittedTxHash`
- report includes `decisionTxHash`
- report includes matched status
- report includes mock testnet deposit metric
- report does not imply TVL, yield, settlement, or production compliance

Exit artifact:

```text
Partner can see that campaign traffic produced manifest-matched GIWA Sepolia mock vault evidence.
```

## Sprint 7: Demo Hardening and Submission Evidence

Goal:

Make the MVP reliable enough for judging and handoff.

Build:

- runbook
- demo script
- known failure states
- reset procedure for test wallet and mock tokens
- explorer evidence checklist
- acceptance-case checklist
- final pitch-safe wording
- final `evidence.json` file
- GASOK criterion to artifact checklist

Verification:

- full happy path can be completed twice
- expired manifest path is demonstrated
- mismatched transaction path is demonstrated in test
- Flashblocks timeout copy is demonstrated
- partner report is populated after the user flow
- `evidence.json` contains chain id, contract addresses, deployment hashes, intent submission hash, approve hash when used, deposit hash, decision hash, block evidence, `intentHash`, `receiptHash`, verifier status, and explorer links
- documentation scans show no unfinished implementation markers
- risk phrase scan only matches explicit guardrail sections

Exit artifact:

```text
The team can run the same 90-second demo repeatedly and show exact GIWA Sepolia evidence values.
```

## Dependency Flow

```text
Protocol kernel
  -> contract events use protocol ids and hashes
  -> chain anchor deploys contracts and creates tx evidence
  -> verifier reads tx evidence and protocol manifest
  -> UI calls manifest issuer, tx execution, verifier
  -> partner report aggregates receipts and tx evidence
```

## Data Flow

```text
Partner link or QR
-> campaignId, missionId, referralCode
-> wallet connects on GIWA Sepolia
-> official campaign signer issues a GIWA Sepolia-bound signed action manifest
-> user reviews target, selector, asset, amount, spender, max allowance
-> user submits IntentSubmitted to the rail contract
-> user approves mock token if needed
-> user deposits into GIWA Sepolia mock vault
-> Flashblocks gives fast feedback
-> standard GIWA RPC confirms block inclusion
-> verifier compares confirmed tx logs and calldata to signed manifest
-> matched decision creates ProofKPI receipt and emits IntentMatched
-> partner report summarizes evidence
```

## Evidence JSON Schema

Sprint 0 must define the exact schema and Sprint 7 must produce the final file at:

```text
docs/evidence/giwa-sepolia-mvp-evidence.json
```

Minimum fields:

```json
{
  "schemaVersion": "1",
  "generatedAt": 1790000000,
  "network": {
    "name": "GIWA Sepolia",
    "chainId": 91342,
    "standardRpc": "https://sepolia-rpc.giwa.io",
    "flashblocksRpc": "https://sepolia-rpc-flashblocks.giwa.io",
    "explorerTxUrlTemplate": "https://sepolia-explorer.giwa.io/tx/{txHash}",
    "confirmationDepth": 1,
    "headBlockNumberAtVerification": "12346"
  },
  "roles": {
    "deployer": "0x...",
    "campaignSigner": "0x...",
    "recoveredSigner": "0x...",
    "verifierOperator": "0x...",
    "demoWallet": "0x..."
  },
  "contracts": {
    "mockToken": {
      "address": "0x...",
      "deploymentTxHash": "0x...",
      "deploymentReceiptStatus": "success",
      "codePresent": true
    },
    "mockVault": {
      "address": "0x...",
      "deploymentTxHash": "0x...",
      "deploymentReceiptStatus": "success",
      "codePresent": true
    },
    "intentRail": {
      "address": "0x...",
      "deploymentTxHash": "0x...",
      "deploymentReceiptStatus": "success",
      "codePresent": true
    }
  },
  "manifest": {
    "canonicalManifestPayload": "{...}",
    "manifestSignature": "0x...",
    "intentHash": "0x...",
    "domain": {
      "name": "GIWA Verified Intent Rail",
      "version": "1",
      "chainId": 91342,
      "verifyingContract": "0x..."
    }
  },
  "transactions": {
    "intentSubmittedTxHash": "0x...",
    "approveTxHash": "0x...",
    "depositTxHash": "0x...",
    "decisionTxHash": "0x..."
  },
  "confirmation": {
    "depositReceiptStatus": "success",
    "blockNumber": "12345",
    "blockHash": "0x...",
    "confirmationDepth": 1,
    "standardRpcReceiptSnapshot": {},
    "logsSnapshot": {
      "approval": {},
      "transfer": {},
      "mockDeposit": {},
      "intentSubmitted": {},
      "intentMatched": {}
    },
    "fastFeedbackObserved": true
  },
  "verifier": {
    "verifierVersion": "1",
    "status": "matched",
    "failureReason": null,
    "verifierInputHash": "0x...",
    "matchedFields": [
      "chainId",
      "wallet",
      "target",
      "selector",
      "asset",
      "amountBaseUnits",
      "spender",
      "maxAllowanceBaseUnits",
      "expiryUnix"
    ]
  },
  "receipt": {
    "canonicalReceiptPayload": "{...}",
    "receiptHash": "0x..."
  },
  "partnerSummary": {
    "campaignId": "gasok-demo",
    "missionId": "first-mock-vault-deposit",
    "matchedReceiptCount": 1,
    "mockTestnetDepositMetric": "1000000000000000000"
  }
}
```

The final evidence bundle must be independently reproducible: a reviewer should be able to recompute `intentHash`, recover the manifest signer, confirm the signer is authorized, recompute `receiptHash`, and inspect the standard RPC receipt/log evidence.

## Acceptance Gates

| Gate | Required Proof | Blocks Next Sprint If Missing |
|---|---|---|
| Workspace gate | confirmed `.git` repository or explicit non-git prototype mode, dependency approval checklist ready | Sprint 1 |
| Protocol gate | stable `intentHash` and `receiptHash` tests, official signer rule, non-empty manifest fields | Sprint 2 |
| Local chain gate | local mock deposit, token logs, vault event, and rail event tests pass | Sprint 3 |
| GIWA chain gate | deployed contracts, `IntentSubmitted`, confirmed GIWA Sepolia `depositTxHash`, deployment receipt status, and `eth_getCode != 0x` | Sprint 4 |
| Verifier gate | actual or fixture tx classifies as `matched` only when manifest, signer, logs, and calldata match; verifier emits final `decisionTxHash` | Sprint 5 |
| UX gate | user can execute the guided action and receipt waits for confirmation | Sprint 6 |
| Partner gate | report shows tx evidence and mock metrics without unsafe claims | Sprint 7 |
| Submission gate | repeatable 90-second demo with explorer evidence | final delivery |

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| GIWA RPC rate limits | demo or tests may be flaky | keep standard and Flashblocks RPC configurable through env vars |
| Wallet does not have GIWA Sepolia configured | user cannot execute flow | provide network add/switch prompt and manual network values |
| Test wallet lacks ETH | deployment or tx execution fails | add pre-demo faucet checklist using GIWA Faucet and Nodit Faucet limits from official docs |
| Test wallet lacks mock token | deposit cannot complete | add mint script or owner faucet function for demo token |
| Flashblocks response differs from standard receipt | copy may confuse judges | label Flashblocks as fast feedback only and wait for standard block confirmation |
| Verifier overfits happy path | invalid tx could receive receipt | build mismatch tests before UI |
| Official signer check is skipped | forged manifest could receive a receipt | verifier must compare recovered signer to configured campaign signer or registry |
| Receipt hash changes on repeated verification | same action may produce conflicting receipts | key receipts by `intentHash + depositTxHash` and return existing receipt |
| Intent rail is deployed but unused | judges see only a mock deposit app | require `IntentSubmitted` and `IntentMatched` or `IntentFailed` transaction hashes in `evidence.json` |
| Workspace lacks git metadata | commit-based implementation steps fail | add workspace readiness gate before dependency installation |
| Key roles are mixed | deployment, manifest signing, and verifier authority become ambiguous | separate deployer, campaign signer, verifier operator, and demo wallet roles |
| Evidence bundle is hash-only | reviewer cannot independently recompute proof | include canonical payloads, signatures, recovered signer, receipt/log snapshots, and verifier input/output |
| UI expands into dashboard | scope creep | partner report remains single-campaign summary |
| Identity integration gets too large | scope creep | keep Dojang/up.id as optional read-only state with guest fallback |

## What To Defer

Defer these until after the GASOK MVP:

- multiple campaigns
- multiple action templates
- production partner dashboard
- CSV/API export
- billing
- GIWA Wallet native placement
- production identity workflows
- production compliance workflows
- mainnet deployment
- non-mock asset integrations

## Sprint Plan Files To Create Next

After this strategy is approved, split the existing full implementation plan into smaller execution plans:

- `docs/superpowers/plans/2026-06-15-sprint-0-scope-and-evidence-contract.md`
- `docs/superpowers/plans/2026-06-15-sprint-1-protocol-kernel.md`
- `docs/superpowers/plans/2026-06-15-sprint-2-local-contract-proof.md`
- `docs/superpowers/plans/2026-06-15-sprint-3-giwa-sepolia-chain-anchor.md`
- `docs/superpowers/plans/2026-06-15-sprint-4-verifier-and-receipt-engine.md`
- `docs/superpowers/plans/2026-06-15-sprint-5-thin-guided-user-flow.md`
- `docs/superpowers/plans/2026-06-15-sprint-6-partner-proofkpi-summary.md`
- `docs/superpowers/plans/2026-06-15-sprint-7-demo-hardening-and-submission-evidence.md`

Each sprint plan should be independently executable and should stop at its exit gate.

## Recommended Next Step

Start with Sprint 0. Do not install dependencies or scaffold code yet.

Sprint 0 should produce a smaller implementation plan for Sprint 1 and a final evidence checklist. Once Sprint 0 is accepted, Sprint 1 can start with protocol tests and no chain dependency. Sprint 3 is the first point where funded GIWA Sepolia testnet keys and deployment approval are required.

## Approval Check

This strategy is ready for user review. If approved, the next action is to split the current full implementation plan into Sprint 0 and Sprint 1 execution documents rather than implementing the entire MVP at once.

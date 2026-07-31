# GIWA Two-Signed Activation Platform Design

## Status

Approved in conversation on 2026-07-30.

This document fixes the product, information architecture, trust boundary, and
GASOK demonstration design for the next evolution of `GIWA Verified Intent
Rail`.

It extends the current single-flow GIWA Sepolia implementation into a
participant-facing campaign journey and a partner-facing, receipt-backed
activation view. It does not authorize implementation, Git publication, or
deployment by itself.

## Executive Decision

Build one deep, real participant journey rather than a generic quest
marketplace:

```text
Campaign-signed Mission
+ user-signed wallet execution
+ verifier match
= Matched Receipt
```

The product idea is **Two-Signed Activation**:

> The campaign signs the conditions. The participant signs the execution. A
> Receipt is issued only when the two match.

The two signatures are different cryptographic actions:

- The configured campaign signer issues an EIP-712 signed Manifest.
- The participant signs the actual approve and deposit transactions in their
  wallet.
- The participant does not sign the Manifest.
- The verifier re-reads GIWA Sepolia evidence and compares it with the signed
  Manifest.

The user outcome is a `Matched Receipt` and a visual `Exact Execution Seal`.
The partner outcome is a receipt-backed activation KPI. The Seal is a visual
result state, not an NFT, token, credential, identity object, or new protocol
object.

## Public Naming

Use `GIWA Verified Intent Rail` on public product surfaces.

`Loop Rail`, `Looprail`, and `GIWA Verified Activation Rail` remain
legacy/internal names. Earlier design shorthand such as `Verified by Looprail`
must become:

```text
Verified by GIWA Verified Intent Rail
```

Campaign branding leads on participant pages. The product verification
signature is secondary.

Do not use `GIWA Dojang` for the product Seal. GIWA already has an official
Dojang attestation service, so the visual result is named `Exact Execution
Seal` or `Campaign Verification Seal`.

## Product Goal

A participant should be able to:

1. understand one real GIWA Sepolia mission before connecting a wallet;
2. review the exact execution conditions in human-readable form;
3. execute the action with their own wallet;
4. see the reviewed conditions compared with confirmed chain evidence; and
5. receive a public Matched Receipt only after a complete match.

A partner or GASOK reviewer should be able to:

1. see the same Receipt become one verified activation;
2. understand why it was counted;
3. open the Receipt, transaction, and verifier evidence;
4. see mismatch and drop-off categories without trusting a mutable success
   counter; and
5. understand the path to a managed paid campaign pilot.

## Business Model

The near-term buyer is a GIWA ecosystem team, partner dApp, or campaign
operator.

The near-term commercial product is a fixed-fee managed activation evidence
pilot:

- one partner;
- one campaign;
- one mission;
- one supported GIWA Sepolia action;
- campaign and Manifest configuration;
- participant journey;
- matched-only Receipt output;
- receipt-backed ProofKPI view; and
- campaign closeout report.

The commercial value is configuration, campaign operation, evidence quality,
failure analysis, and partner reporting. It is not a fee on TVL, yield,
settlement, or production transaction volume.

The P0 GASOK surface demonstrates the business loop but does not claim a paying
customer, production analytics, or public self-serve campaign management.

## Differentiation

The product must not be positioned as merely another task or quest UI.
Competitors can already verify many on-chain actions. The differentiation is
the complete evidence chain:

```text
versioned campaign policy
-> wallet-bound signed Manifest
-> participant-owned execution
-> field-level verifier match
-> matched-only canonical Receipt
-> Receipt-derived partner KPI
```

### User-side differentiation

- The mission is understandable before wallet execution.
- The wallet action is bounded by target, selector, asset, amount, allowance,
  and expiry conditions.
- The user receives a reusable public result instead of only a completion
  checkmark.
- A mismatch visibly withholds the Receipt.

### Partner-side differentiation

- The partner defines a versioned execution policy rather than only a task
  description.
- Campaign attribution is deterministic inside the controlled campaign flow:
  `campaignId + missionId + referralCode + wallet` are bound to the Manifest
  and later to the matched Receipt.
- Success metrics are derived from matched Receipts, not manually editable
  completion counters.
- Every counted activation can be inspected through its public proof.

### Claim boundary

The product may claim deterministic attribution only inside the
`GIWA Verified Intent Rail` campaign flow. It must not claim perfect web-wide,
cross-device, or identity-level attribution.

It must not claim:

- that competitors only verify clicks;
- trustless or fully on-chain verification;
- transaction simulation;
- security approval or phishing prevention;
- KYC, identity, compliance, or eligibility decisions;
- production settlement, funds, yield, RWA issuance, or TVL;
- finality from Flashblocks; or
- that a fresh live Receipt currently has an on-chain decision transaction.

## Current Product Truth

The existing implementation already supports:

- an EIP-712 Manifest signed by the configured campaign signer;
- chain, deployed rail, campaign, mission, wallet, action, and expiry binding;
- participant-owned approve and mock-vault deposit transactions;
- GIWA Sepolia Standard RPC evidence reads;
- wallet/from, target/to, selector, asset, amount, Approval, Transfer,
  MockDeposit, expiry, receipt status, block, and confirmation checks;
- a matched-only canonical Receipt gate;
- public Receipt and verifier-input hashes; and
- matched-only partner evidence filtering.

The current limitations remain visible:

- a fresh live run has no on-chain decision transaction and
  `decisionTxHash` is `null`;
- the SQLite live service is a trusted staging component;
- the Receipt is not independently signed or anchored on-chain;
- the participant does not sign the Manifest;
- only the flagship mock-vault action is supported;
- the checked-in partner snapshot may be recorded or fixture data rather than
  a live multi-partner analytics system; and
- GIWA Wallet production integration does not exist.

## Product Architecture

### Public routes

| Route | Audience | Purpose |
| --- | --- | --- |
| `/` | Participant | Real campaign entry and product landing page. |
| `/giwa-demo` | GASOK reviewer | Guided 90-second entry into the same real flow. |
| `/user` | Participant | Five-stage `GIWA Genesis Journey`. |
| `/user/receipt/:hash` | Participant | Human-readable Receipt and Exact Execution Seal. |
| `/user/receipts` | Participant | Browser-local matched execution history. |
| `/receipt/:hash` | Public verifier | Technical Receipt and chain evidence. |
| `/evidence` | Public verifier | Exact-hash proof lookup. |
| `/partner` | Partner/reviewer | Read-only managed Campaign Studio for P0. |
| `/user/help` | Participant | Network, transaction, verification, and retry recovery. |

### GASOK reviewer route

```text
/giwa-demo
-> /user
-> /user/receipt/:hash
-> /partner
-> /receipt/:hash
```

The reviewer sees a participant action first and the business result second.
The partner KPI must point back to the exact Receipt just created.

### P0 partner access boundary

For the GASOK staging build, `/partner` is a read-only presentation of the
managed campaign:

- public-safe aggregate counts only;
- no partner secrets;
- no participant wallet directory;
- no campaign mutation;
- no arbitrary target or verifier change;
- no manual `matched` override; and
- no simulated control that looks operational.

Authenticated, tenant-scoped management is P1 work. Until that boundary exists,
campaign configuration remains an operator-managed process.

## Campaign Entry

The landing page is a real participant entry, not a pitch deck.

It must answer above the fold:

1. What can I do?
2. What network and assets are used?
3. What will I receive?
4. When will I need to connect a wallet?

Recommended hierarchy:

```text
GIWA Genesis Journey
Complete one verifiable action on GIWA Sepolia.

Review the campaign's signed conditions, execute with your wallet,
and receive a Matched Receipt when the execution matches.

[View mission]
```

The mission can be viewed without wallet connection. Wallet connection is
requested only when execution begins.

Show a compact safety line:

```text
GIWA Sepolia testnet · Mock assets only · No real funds or yield
```

## Participant Journey

Use one continuous Journey Canvas rather than a grid of equal cards. Each stage
replaces the central focus while preserving a quiet progress rail.

### Stage 1: Prepare

Purpose:

- explain GIWA Sepolia;
- show the mock token and mock vault;
- show the expected wallet actions;
- confirm that no real assets are involved; and
- let the participant understand the mission before connecting.

Primary action:

```text
Continue to signed mission
```

Only when execution is imminent:

```text
Connect wallet to execute
```

Readiness states:

- wallet not connected;
- wrong network;
- network switch pending;
- test token unavailable;
- ready.

### Stage 2: Signed Mission

This stage translates the EIP-712 Manifest into a human-readable promise:

| Condition | Participant wording |
| --- | --- |
| Network | GIWA Sepolia |
| Target | Genesis Mock Vault |
| Action | Deposit mock USDC |
| Asset and amount | Exact mock USDC amount |
| Approval | Maximum allowance for this mission |
| Expiry | Human-readable remaining time |
| Campaign signer | Campaign-issued signed conditions |

Raw addresses, selector, base units, chain ID, nonce, signature, canonical JSON,
and `intentHash` live in a technical disclosure.

Copy must say:

> The campaign has signed these execution conditions.

It must not say:

> You signed the Manifest.

Primary action:

```text
Execute this mission
```

### Stage 3: Execute

The active action is singular and explicit:

1. request bounded approval when required;
2. wait for approval confirmation;
3. request mock-vault deposit;
4. show the submitted transaction; and
5. transition into verification.

The UI must never display a successful deposit before the wallet transaction
and Standard RPC evidence exist.

Flashblocks may provide early progress feedback, but the UI must label it as
early feedback and not final confirmation.

### Stage 4: Match

Pending verification shows neutral rows. A row changes to `Matched` only after
the terminal verifier decision.

| Signed Mission | GIWA execution evidence | Result |
| --- | --- | --- |
| Participant wallet | Transaction sender | Matched |
| Target and action | Transaction target and calldata | Matched |
| Asset and amount | Calldata and event logs | Matched |
| Approval and expiry | Approval log and confirmed block time | Within policy |
| Block evidence | Standard RPC receipt and confirmations | Confirmed |

The core explanation is:

> The campaign signed the conditions. You signed the execution. GIWA Verified
> Intent Rail is checking that they match.

### Stage 5: Collect

Only a terminal `matched` decision with a valid Receipt may enter this stage.

The participant receives:

- a human-readable completion statement;
- `Matched Receipt`;
- `Exact Execution Seal`;
- GIWA Explorer link;
- public technical proof link;
- Receipt link copy action; and
- browser-local execution history entry.

Recommended completion copy:

> The action was executed within the signed conditions.

Supporting copy:

> GIWA Verified Intent Rail compared the campaign-signed Manifest with the
> confirmed GIWA Sepolia transaction and issued this Receipt.

## Exact Execution Seal

The Seal is the emotional acquisition moment but remains subordinate to the
Receipt.

Allowed text:

```text
MATCHED
GIWA SEPOLIA
```

Rules:

- render only for a matched public Receipt;
- never render for pending, mismatch, timeout, or transaction failure;
- do not describe it as minted, owned, transferable, attested by GIWA Dojang,
  or stored on-chain;
- no points, rarity, trophy, leaderboard, confetti, or collectible frame;
- use one restrained entrance transition;
- render the final state immediately under reduced motion.

## Receipt Surfaces

### Participant Receipt

`/user/receipt/:hash` is optimized for comprehension:

1. result headline;
2. one-sentence explanation;
3. Exact Execution Seal;
4. five human-readable comparison rows;
5. explorer and public-proof actions; and
6. technical evidence disclosure.

Technical evidence includes:

- Receipt hash;
- intent hash;
- deposit transaction hash;
- shortened participant wallet;
- target;
- asset;
- amount;
- block number and block hash;
- confirmation depth;
- verifier input hash;
- issued time when available; and
- explicit GIWA Sepolia testnet boundary.

### Public Technical Receipt

`/receipt/:hash` prioritizes reproducibility:

- canonical Receipt payload;
- Manifest identity;
- transaction and block evidence;
- verifier-input hash;
- exact field comparisons;
- source classification; and
- known trust boundary.

`Verify again` in P0 may ask the server verifier to re-read Standard RPC
evidence. It must not be described as browser-only or trustless verification.

### Receipt History

`/user/receipts` is browser-local convenience:

- matched items only in the acquired-receipt collection;
- no claim of account sync or permanent wallet storage;
- no public wallet profile;
- clear browser-storage notice; and
- direct links to participant and technical Receipt views.

## Public Proof Ledger

`/evidence` supports exact proof lookup by:

- Receipt hash;
- transaction hash; or
- intent hash.

It does not provide:

- browse-all participant wallets;
- public wallet profiles;
- wallet-based ranking;
- campaign-wide identity lists; or
- a claim that every stored row is on-chain.

Public proof may show hashes, campaign and mission identifiers, shortened
wallet, transaction, block, confirmation depth, matched fields, timestamp, and
testnet label. Any referral or operational metadata must be omitted or
redacted.

## Partner Campaign Studio

The Studio explains the commercial system without becoming a generic
dashboard.

### 1. Campaign Brief

Show:

- partner-safe campaign identity;
- campaign goal;
- active mission;
- GIWA Sepolia network;
- managed pilot status; and
- live, recorded, or fixture source label.

### 2. Mission Policy

Show the same participant-facing conditions plus:

- policy version;
- issued date;
- campaign signer;
- target and selector;
- asset and amount policy;
- approval limit;
- expiry policy; and
- immutable prior-version reference.

P0 is view-only. P1 may add authenticated operator-managed policy versioning,
but an old Receipt always remains bound to its original policy version.

### 3. Live Funnel Rail

Use the authoritative states:

```text
campaignVisited
-> walletConnected
-> manifestIssued
-> approveSubmitted
-> approveConfirmed
-> depositSubmitted
-> depositConfirmed
-> verifierChecking
-> matched
-> receiptIssued
```

Related exception states:

- `wrongChain`;
- `walletRejected`;
- `manifestExpired`;
- `txFailed`;
- `verificationDelayed`; and
- `mismatched`.

The latest demo Receipt creates a visible, traceable increment such as:

```text
Matched activations 67 -> 68
```

The highlighted increment must use the same Receipt hash visible on the user
result. A static animation without data identity does not pass.

### 4. Mismatch Breakdown

Use bounded, non-sensitive categories:

- wallet mismatch;
- target or action mismatch;
- asset or amount mismatch;
- approval policy mismatch;
- expired Manifest;
- required log missing;
- transaction failed; and
- verification delayed.

RPC timeouts are non-terminal delays, not mismatches.

### 5. Proof Ledger

Each counted activation links to:

- participant Receipt;
- public technical Receipt;
- GIWA Explorer transaction; and
- evidence details.

The table must not expose full wallet identities by default.

### 6. Closeout Report

The managed pilot report contains:

- campaign entry count;
- wallet connection count;
- Manifest issue count;
- deposit submission count;
- matched Receipt count;
- matched rate with its denominator stated;
- failure and mismatch breakdown;
- mock testnet action amount, clearly labeled;
- evidence links; and
- operational recommendations.

It must not label mock testnet amount as TVL, revenue, settlement, funds, or
production volume.

## Evidence Model

### Entity chain

```text
Campaign
-> Mission
-> PolicyVersion
-> Run
   -> Manifest
   -> WalletTransactions
   -> ChainEvidence
   -> Decision
   -> Receipt
```

### Required identity links

Every matched Receipt must be traceable to:

- `campaignId`;
- `missionId`;
- `policyVersion`;
- `runId`;
- `intentHash`;
- participant wallet;
- `depositTxHash`;
- `verifierInputHash`; and
- `receiptHash`.

An optional `referralCode` may participate in controlled-flow attribution, but
it is not public Receipt data by default.

### KPI derivation

Partner metrics are projections from immutable or append-only evidence:

```text
matched activation count
= count(Receipt where decision = matched and commercial gate = pass)
```

No UI control or partner request may directly increment this number.

### Source labels

Every aggregate, example, or row must declare one source:

- `Live`: derived from the active staging verifier and Receipt store;
- `Recorded`: a preserved, previously verified public example; or
- `Fixture`: synthetic presentation data.

Source classes must not be combined into an unlabeled total.

## Trust And Safety Boundary

### Receipt gate

A Receipt is issued only when:

1. the run reaches terminal `matched`;
2. the decision is `matched`;
3. no failure reason exists;
4. the decision and Receipt hashes agree;
5. the intent identity agrees across run, decision, and Receipt;
6. the canonical Receipt hash recomputes;
7. the verifier-input hash recomputes;
8. the campaign Manifest signature is valid for the configured domain;
9. Standard RPC confirms successful transaction evidence;
10. confirmation depth meets policy;
11. all required fields and logs match; and
12. the public payload passes redaction.

Mismatch, failure, timeout, pending confirmation, or malformed evidence cannot
produce a Receipt or partner matched count.

### No manual success

The product provides no:

- force-Receipt button;
- partner-controlled match override;
- client-supplied verifier result;
- client-supplied decoded log trusted as evidence; or
- mutable KPI success counter.

### Verifier delay

An RPC timeout or low confirmation depth produces `verificationDelayed`.

It:

- is non-terminal;
- does not issue a Receipt;
- does not increment partner KPI;
- may be retried with bounded backoff; and
- must not be shown as a mismatch.

### Terminal mismatch

A proven field mismatch:

- lists the failed human-readable condition;
- withholds the Receipt and Seal;
- records the terminal mismatch category;
- offers a fresh Manifest when retry is valid; and
- never exposes raw exceptions or secrets.

### Privacy

Wallet addresses and transaction hashes are pseudonymous, linkable operational
data.

Rules:

- show shortened wallet values on participant and partner first-read surfaces;
- expose full public chain identifiers only inside explicit technical details;
- do not build public wallet profiles;
- do not expose referral codes;
- do not expose `.env`, credentials, tokenized RPC URLs, auth headers, or local
  runtime paths; and
- do not copy local SQLite data into release evidence.

## Responsive And Visual Direction

The experience uses an editorial, precise visual system:

- Pretendard Variable for interface copy;
- monospace only for hashes and compact evidence labels;
- paper, ink, soft rule, and restrained verified green;
- large whitespace and asymmetric editorial composition;
- thin separators instead of repeated rounded cards;
- one continuous Journey Canvas;
- one ceremonial Seal object; and
- motion that explains state transition rather than decorating idle screens.

Avoid:

- dashboard-first card grids;
- glassmorphism;
- gradients used as generic decoration;
- identical rounded rectangles;
- neon Web3 styling;
- trophy or collectible framing;
- fake terminal windows;
- unexplained technical hashes above the fold; and
- scroll effects that obscure the primary action.

### Mobile

At 320 px and above:

- no horizontal overflow;
- hashes wrap;
- the active action remains visible;
- comparison rows stack as condition, evidence, and result;
- the Seal does not consume the first viewport; and
- technical detail remains progressively disclosed.

## Accessibility

- All functionality is keyboard operable.
- Visible focus is preserved.
- Status is not communicated by color alone.
- Terminal changes use an accessible live announcement.
- Focus moves to the result heading after Receipt navigation.
- The base body size is at least 16 px.
- Interactive targets are at least 44 px where practical.
- Native disclosure semantics are preferred.
- Copy-link feedback is announced without stealing focus.
- `prefers-reduced-motion: reduce` removes transition-dependent meaning and
  renders terminal states immediately.

## P0 GASOK Scope

Implement only:

- real campaign entry;
- five-stage participant journey;
- wallet connection at execution time;
- campaign-signed Manifest;
- bounded mock USDC approval and mock-vault deposit;
- Standard RPC verification;
- live field-level matching;
- matched-only Receipt and Exact Execution Seal;
- the same Receipt reflected in a read-only Partner Studio;
- public technical Receipt;
- exact-hash Evidence lookup; and
- one clearly labeled recorded mismatch path for judge explanation.

P0 does not add a generic mission grid, account system, token reward, NFT,
self-serve campaign builder, or multiple action adapters.

## P1 Managed Paid Pilot

Add only after P0 proves the full loop:

- authenticated partner access;
- tenant-scoped APIs;
- operator-managed Campaign Studio;
- policy versioning;
- durable funnel and mismatch projections;
- closeout report generation;
- export and redaction gates;
- rate limits and request limits;
- public replay improvements;
- campaign branding and QR/referral intake; and
- staging-grade backup, observability, and incident procedures.

## P2 Protocol Expansion

Potential later work:

- action adapter library;
- independently signed Receipt;
- on-chain Receipt or decision anchor;
- browser-side public replay;
- Receipt-gated follow-up journeys;
- multi-partner tenancy;
- multi-campaign analytics; and
- a proposed GIWA Wallet placement.

Each item requires a separate trust, privacy, and rollout design. None is
claimed as current behavior.

## Test Strategy

### Protocol tests

- canonical Manifest stability;
- domain and campaign signer recovery;
- wallet, campaign, mission, policy-version, action, and expiry binding;
- canonical verifier-input stability;
- canonical Receipt stability;
- Receipt hash recomputation; and
- no Receipt creation for non-matched decisions.

### State-transition tests

- valid forward journey;
- wrong network recovery;
- wallet rejection;
- Manifest expiry;
- approval not required;
- approval submitted and failed;
- deposit submitted and failed;
- low confirmation depth;
- retryable RPC timeout;
- terminal mismatch;
- terminal matched; and
- repeated verification idempotency.

### Integration tests

- Manifest issuance to live Receipt;
- user wallet equals transaction sender;
- target, selector, asset, and amount matching;
- Approval, Transfer, and MockDeposit log binding;
- block timestamp expiry;
- confirmation policy;
- mismatch withholds Receipt and partner KPI;
- Receipt gate rejects cross-record hash disagreement;
- partner KPI increment uses the same Receipt;
- Recorded and Fixture rows never appear as Live; and
- public proof redaction.

### API and security tests

For P0:

- request validation;
- body size limits where routes accept writes;
- idempotent evidence submission;
- bounded error messages;
- secret-like content redaction; and
- exact-hash public lookup behavior.

For P1:

- authentication;
- tenant isolation;
- partner scope;
- origin policy;
- per-IP, token, tenant, wallet, and run rate limits; and
- audit logging without secret leakage.

### Browser tests

Test at:

- 1280 x 720;
- 1024 x 768;
- 390 x 844; and
- 320 px width.

Verify:

- mission is understandable without wallet connection;
- wallet connection appears only at execution;
- only one primary action leads each stage;
- pending rows do not claim a match;
- mismatch exposes no Receipt or Seal;
- a live matched run opens the correct Receipt;
- the partner increment uses the identical Receipt hash;
- all source labels are visible;
- public proof opens from the Receipt;
- keyboard and focus flow are complete;
- reduced motion preserves meaning; and
- no horizontal overflow exists.

## Ninety-Second GASOK Demo

### 0-10 seconds: problem

> A quest completion shows participation. It does not prove that the intended
> on-chain action was executed exactly as promised.

Show:

```text
Campaign condition -> wallet execution -> verifiable result
```

### 10-25 seconds: participant entry

Open the real `GIWA Genesis Journey`. Point out that the mission is visible
before wallet connection and uses only GIWA Sepolia mock assets.

### 25-40 seconds: campaign-signed conditions

Show the human-readable Signed Mission:

- target;
- action;
- mock asset and amount;
- maximum approval; and
- expiry.

State:

> The campaign signed these conditions.

### 40-60 seconds: participant-owned execution

Connect the wallet, approve only when required, and submit the mock-vault
deposit.

State:

> The participant signs the actual GIWA Sepolia execution.

### 60-75 seconds: match and Receipt

Show field-level comparison resolving from neutral to matched. Open the
Matched Receipt and Exact Execution Seal.

State:

> A Receipt exists only because the confirmed execution matched every signed
> condition.

### 75-85 seconds: partner value

Open `/partner`. Show the latest activation increment and highlighted row.
Open the row and demonstrate that it is the same Receipt.

State:

> The participant gets a proof. The partner gets a Receipt-backed activation
> KPI.

### 85-90 seconds: close

> GIWA Verified Intent Rail turns a campaign promise and a wallet execution
> into one inspectable activation record.

## Acceptance Criteria

The design is successfully implemented only when:

1. A real GIWA Sepolia transaction completes the flagship journey.
2. The participant understands network, mock asset, target, amount, approval,
   and expiry before execution.
3. Public copy correctly distinguishes the campaign-signed Manifest from the
   participant-signed transactions.
4. Pending, delayed, failed, and mismatched runs cannot expose a Receipt or
   Seal.
5. A matched Receipt links to GIWA Explorer and public technical evidence.
6. The Partner Studio increments from the exact same Receipt identity.
7. Partner counts are derived from matched Receipts rather than mutable UI
   state.
8. Live, Recorded, and Fixture sources are visually distinct.
9. The P0 Partner Studio is read-only and public-safe.
10. The core journey works on mobile, keyboard, and reduced-motion settings.
11. All public surfaces state the GIWA Sepolia testnet and mock-asset boundary.
12. The complete user value and partner value are understandable within 90
    seconds.
13. No public copy claims settlement, finality, KYC, security approval, real
    funds, yield, TVL, RWA issuance, or current GIWA Wallet integration.
14. Public naming uses `GIWA Verified Intent Rail`; legacy `Looprail` naming is
    kept internal.

## Non-Goals

- Generic quest marketplace
- Mission discovery grid
- Public self-serve campaign builder
- Production mainnet launch
- Real funds, yield, RWA, or settlement
- NFT, SBT, POAP, points, level, or leaderboard
- Identity, KYC, eligibility, compliance, or security decisions
- Participant wallet custody or server-side transaction signing
- Perfect web-wide attribution
- Trustless or browser-only verification claims
- Flashblocks finality claims
- Current GIWA Wallet production integration
- Multi-action or multi-partner platform in P0

## Implementation Gate

Before implementation begins:

1. the user reviews this written specification;
2. contradictions or requested changes are resolved in this document;
3. a separate implementation plan maps each P0 behavior to concrete files,
   tests, checkpoints, and deployment gates; and
4. Git and deployment actions remain separately authorized.

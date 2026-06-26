# Commercial User-Facing UX Design

## Purpose

Sprint 48 defines the commercial user-facing product flow for `GIWA Verified Intent Rail`.

The current local MVP already supports reviewer, operator, and partner surfaces:

- local demo control room
- live rehearsal flow
- dynamic receipt API
- static fallback
- partner proof console
- public evidence snapshots

Those surfaces are useful for review and operations, but they are not the final commercial user experience. The commercial user experience should feel like a verifiable Web3 action checkout: the user understands the action, connects the right wallet, submits wallet actions from the browser wallet, watches bounded progress, and receives a receipt after verification.

This document is a design specification only. It does not create UI files, change routes, deploy, or alter verifier behavior.

## Design Inputs

- Product name: `GIWA Verified Intent Rail`
- Canonical action: first GIWA Sepolia mock vault action
- Primary user job: review the action before signing and receive a matched testnet receipt
- Evidence rule: standard RPC block evidence and verifier match are the receipt source
- Fast-feedback rule: Flashblocks can appear only as non-final early feedback
- Current blocker rule: protected CI, hosting approval, managed infrastructure approval, and partner signoff are not general user concepts

## Eight-Angle Analysis

| Perspective | Design consequence |
| --- | --- |
| General user onboarding | Start with one action page, not a dashboard. Explain what the action is and what the wallet will be asked to do. |
| Wallet and network gate | Keep wallet connect and GIWA Sepolia chain `91342` checks before manifest issuance or wallet actions. |
| Intent preview and consent | Show action name, amount, target, wallet, expiry, and collapsed technical details before transaction requests. |
| Transaction progress | Use a step rail that separates wallet submission, standard RPC receipt discovery, verification, and receipt readiness. |
| Verified receipt and share | Make the receipt the primary outcome. Share links should show bounded public evidence by default. |
| Recovery and support | Provide tx hash paste, re-verify, and support copy without exposing raw internal errors. |
| Partner and reviewer separation | Keep `/partner`, `/demo`, blocker registers, and evidence packets outside the general user path. |
| Security, privacy, and public copy | Hide role internals, local runtime details, and credential material. Use bounded state copy and opt-in technical proof. |

## Product Framing

Commercial user-facing copy should describe the flow as:

```text
Review the action, submit it from your wallet, and get a receipt after the transaction matches the signed intent.
```

Use:

- verifiable Web3 action checkout
- testnet action receipt
- signed intent preview
- standard RPC block evidence
- matched receipt

Do not use claims about production asset movement, production yield, KYC operation, safety guarantees, or finality from fast-feedback signals.

## Surface Separation

| Surface | Audience | Purpose | Technical detail level |
| --- | --- | --- | --- |
| General user action flow | End user | Complete one action and receive a receipt | Low by default, expandable proof |
| Public share receipt | Anyone with link | Inspect a receipt without operator context | Medium, safe proof accordion |
| Partner/reviewer console | Partner, reviewer, judge | Inspect evidence packet and KPI summary | High, evidence-oriented |
| Operator/admin surfaces | Demo operator, maintainer | Run local rehearsal, inspect readiness, handle fallback | High, internal only |

General user screens must not show blocker registers, protected CI status, staging readiness state, server role names, local DB paths, local environment names, raw verifier internals, or operator-only runbook copy.

Partner/reviewer screens may show evidence packet paths, receipt hashes, transaction hashes, standard RPC confirmation details, fixture labels, replay status, and local-advisory authority.

Operator/admin screens may show runtime readiness, opening order, fallback state, local rehearsal status, and stop conditions. These screens are not a commercial user product.

Public share receipt screens may show receipt status, receipt ID, transaction hash, block number, wallet, action, and collapsed technical evidence. They must not show private runtime details or internal gate names.

## Information Architecture

These route names are design targets, not implemented routes:

| Route pattern | Audience | Role |
| --- | --- | --- |
| `/action/:campaignId/:missionId` | General user | Action Page and wallet/network gate |
| `/action/:runId/progress` | General user | Transaction Progress |
| `/receipt/:receiptId` | General user and public share | Verified Receipt |
| `/receipts` | General user | My Receipts |
| `/help` | General user | Help and Recovery |
| `/partner` | Partner/reviewer | Evidence packet and KPI summary |
| `/demo` | Operator/reviewer | Local control room |

The product may later use different route names, but the audience boundaries should remain stable.

## Screen 1: Action Page

### Purpose

The Action Page is the first user-facing screen. It should answer:

- What action am I about to do?
- Which wallet and network are required?
- How many steps will happen?
- What does success look like?

### Primary content

- Product name: `GIWA Verified Intent Rail`
- Action summary: `First mock vault action on GIWA Sepolia`
- Required wallet state: wallet connected or connect required
- Required network: GIWA Sepolia, chain `91342`
- Expected steps:
  1. Connect wallet
  2. Review intent
  3. Approve if needed
  4. Submit deposit
  5. Verify evidence
  6. View receipt
- Primary CTA:
  - disconnected: `Connect wallet`
  - wrong network: `Switch to GIWA Sepolia`
  - ready: `Review action`
- Secondary links:
  - `How receipts work`
  - `Need help?`

### Bounded copy examples

| State | User copy |
| --- | --- |
| Ready | `Review the action before your wallet asks for approval.` |
| Wallet missing | `Open this page in a browser with a wallet provider.` |
| Wrong network | `Switch to GIWA Sepolia to continue.` |
| Temporarily unavailable | `Action data is unavailable. Retry from this page.` |

## Screen 2: Wallet / Network Gate

### Purpose

The gate ensures the user is connected with the intended wallet and chain before manifest issuance.

### States

| State | CTA | Detail |
| --- | --- | --- |
| Disconnected | `Connect wallet` | No action preview is issued yet. |
| Connecting | Disabled | Wallet request is in progress. |
| Connected, correct chain | `Review action` | Manifest preview can be requested. |
| Connected, wrong chain | `Switch network` | Wallet actions stay blocked. |
| Wrong wallet for issued manifest | `Request new intent` | Prior manifest is invalidated. |
| Wallet provider unavailable | `Use a wallet browser` | No transaction request is created. |

### User-visible rule

Account or chain changes invalidate the current manifest. The user-facing explanation should be:

```text
Your wallet context changed. Review a fresh intent before continuing.
```

Do not show internal invalidation reason names.

## Screen 3: Intent Preview

### Purpose

The preview is the consent checkpoint before wallet transaction requests.

### Visible summary

- Action name
- Amount
- Network
- Wallet
- Target label
- Expiry time
- Required approval status
- Primary CTA: `Continue to wallet`

### Technical details accordion

Collapsed by default:

- target address
- selector
- asset address
- spender address
- max allowance
- intent hash
- manifest expiry

### Disclosure policy

Default copy should focus on understandable user consequences. Technical proof is opt-in for users who want to inspect exact fields.

## Screen 4: Transaction Progress

### Purpose

The progress screen should reduce uncertainty while avoiding false finality claims.

### Required steps

| Step | Meaning | Completion source |
| --- | --- | --- |
| Wallet connected | User has a wallet and correct chain | Browser wallet state |
| Intent issued | Server issued wallet-bound manifest preview | Live run state |
| Approval submitted | Wallet returned approve transaction hash | Browser wallet response |
| Deposit submitted | Wallet returned deposit transaction hash | Browser wallet response |
| Standard RPC receipt found | Standard RPC receipt exists and meets configured depth | Verifier input |
| Verification matched | Confirmed transaction matched the manifest | Verifier decision |
| Receipt ready | Matched receipt payload exists | Receipt gate |

### Non-final feedback

Fast feedback may appear as:

```text
The network has seen the transaction. This is early feedback; the receipt waits for standard RPC block evidence and verification.
```

## Screen 5: Verified Receipt

### Purpose

The receipt is the primary user outcome and the default share surface.

### States

| State | User copy | Available action |
| --- | --- | --- |
| Verified | `Verified receipt ready.` | Copy link, view transaction, expand proof |
| Pending | `Receipt is waiting for verification.` | Refresh, paste tx hash, contact support |
| Not matched | `This transaction did not match the reviewed action.` | View help, retry from action page |

### Default fields

- Receipt ID
- Verification status
- Action name
- Wallet
- Transaction hash
- Block number
- Network
- Issued time
- Copy/share link

### Technical accordion

Collapsed by default:

- intent hash
- verifier input hash
- block hash
- target
- selector
- asset
- spender
- allowance used
- manifest expiry

### Public share rule

The public share view should reveal only receipt-safe fields. It should not reveal operator notes, blocker state, local runtime metadata, or internal gate names.

## Screen 6: My Receipts

### Purpose

`My Receipts` gives users a lightweight history without turning the product into a partner dashboard.

### Content

- Receipt cards grouped by status
- Filters:
  - `Verified`
  - `Pending`
  - `Not matched`
- Search by action name, receipt ID, or transaction hash
- Empty state:
  - `No receipts yet. Start an action to create your first receipt.`

### Boundaries

Do not show partner KPIs, campaign conversion analytics, protected CI status, blocker registers, local evidence file paths, or operator runbook links.

## Screen 7: Help / Recovery

### Purpose

Recovery helps a user resolve uncertain wallet or verifier states without exposing internal details.

### Actions

- Paste transaction hash
- Re-verify current receipt
- Return to action page
- Copy support summary

### Support summary fields

- Receipt ID, if available
- Transaction hash, if available
- Wallet address
- Network
- User-visible status
- Timestamp

### Bounded error copy

| Failure class | User copy |
| --- | --- |
| Verification unavailable | `Verification is temporarily unavailable. Retry from this receipt.` |
| Receipt not found | `No verified receipt is available for this link.` |
| Wrong network | `Switch to GIWA Sepolia and retry.` |
| Transaction not matched | `The submitted transaction did not match the reviewed action.` |
| Confirmation pending | `The transaction is still waiting for enough block evidence.` |

## Technical Proof Disclosure

Technical proof should follow a three-layer model:

1. User summary: action, wallet, status, receipt ID.
2. Receipt evidence: transaction hash, block number, network, verification status.
3. Technical accordion: hashes, target, selector, asset, spender, allowance, manifest expiry.

The default user view should never require a user to understand calldata, event logs, local provenance, protected CI status, or staging blockers.

## Public Copy Rules

Use bounded state copy:

- `Receipt ready`
- `Waiting for verification`
- `Switch to GIWA Sepolia`
- `Request a fresh intent`
- `No verified receipt is available for this link`
- `Technical details`

Avoid:

- raw internal error text
- local runtime values
- server role names
- internal gate identifiers
- protected CI or blocker-register language in general user screens
- production asset or yield implications
- identity or safety assurance claims
- Flashblocks as final confirmation

## Accessibility And Responsive Requirements

- Primary CTA must remain visible after wallet/network gate state changes.
- Status rail must collapse into stacked steps on mobile.
- Receipt fields must wrap hashes without horizontal scroll.
- Technical accordion summaries must be keyboard reachable.
- Status changes should be announced through polite live regions.
- Buttons should not resize the layout when labels change.

## Privacy Boundary

General user screens may show public wallet addresses and public transaction hashes because the action is chain-visible. They should not show local configuration names, signer role internals, runtime readiness categories, local DB paths, environment file references, or credential material.

## Relationship To Existing Surfaces

| Existing surface | Future role |
| --- | --- |
| `/live` | Source for commercial user flow behavior, but current copy remains rehearsal-oriented. |
| `/demo` | Operator/reviewer control room only. |
| `/partner` | Partner/reviewer proof console only. |
| Static `/` | Recorded fallback, not the final commercial Action Page. |
| Dynamic receipt API | Machine-readable receipt source; commercial UI should wrap it in a user receipt page. |

## Sprint 49 Handoff

Sprint 49 should be an implementation plan, not direct UI work unless explicitly approved. The plan should decide:

- route names
- data model projection
- copy table source
- component boundaries
- test coverage
- static fallback preservation
- partner/operator route separation
- no-deployment verification scope

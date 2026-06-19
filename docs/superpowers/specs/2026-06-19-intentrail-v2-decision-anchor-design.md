# IntentRailV2 Decision Anchor Design

## Scope

This document defines when a future `IntentRailV2` decision anchor is useful. It does not authorize contract implementation, deployment, funding, or verifier transactions.

## Current Boundary

Sprint 11 and Sprint 12 live verifier decisions are local standard RPC verifier decisions with `decisionTxHash: null`.

Sprint 14 commercial readiness can be satisfied off-chain when public evidence can recompute `intentHash`, `verifierInputHash`, and `receiptHash`.

## When V2 Is Needed

Use `IntentRailV2` only if a partner pilot requires public on-chain anchoring of the verifier decision identity in addition to the public receipt snapshot.

## Minimum Event Shape

```solidity
event IntentDecisionAnchored(
    bytes32 indexed intentHash,
    bytes32 indexed verifierInputHash,
    address indexed wallet,
    bytes32 receiptHash,
    bytes32 approveTxHash,
    bytes32 depositTxHash,
    uint256 depositBlockNumber,
    bytes32 depositBlockHash,
    uint256 allowanceUsedBaseUnits,
    bytes32 status,
    bytes32 failureReason,
    uint256 decidedAt
);
```

## Rules

- `verifierInputHash` must be nonzero.
- `MATCHED`, `MISMATCHED`, and `FAILED` are terminal.
- `timeout` remains off-chain and non-terminal.
- `receiptHash` is nonzero only for `MATCHED`.
- human-readable failure copy stays off-chain.
- this event does not custody assets, issue assets, produce yield, settle payments, run identity checks, prevent phishing, or make safety guarantees.

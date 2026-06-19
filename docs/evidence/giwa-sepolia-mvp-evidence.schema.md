# GIWA Sepolia MVP Evidence Schema

## Scope

This schema defines the evidence bundle for the GIWA Verified Intent Rail MVP. It covers one GIWA Sepolia mock vault flow and supports recomputing `intentHash`, `verifierInputHash`, and `receiptHash`.

The evidence bundle is testnet-only. It must not contain private keys, bearer tokens, RPC query tokens, API keys, mnemonics, auth headers, tokenized RPC URLs, or demo user private wallet material.

## Top-Level Sections

| Section | Purpose |
|---|---|
| `network` | GIWA Sepolia chain and RPC metadata. |
| `roles` | Public role addresses and signer recovery evidence. |
| `contracts` | Mock token, mock vault, and rail contract addresses. |
| `manifest` | Signed action manifest and canonical hash inputs. |
| `transactions` | Submit, approve, deposit, and decision transaction evidence. |
| `confirmation` | Standard RPC confirmation depth and head block context. |
| `verifier` | Deterministic verifier input, hash, matched fields, and decision. |
| `receipt` | Canonical receipt payload, hash, and envelope. |
| `partnerSummary` | Partner-readable activation metrics and links. |

## Network

Required fields:

- `schemaVersion`
- `chainId`
- `networkName`
- `standardRpcProviderLabel`
- `standardRpcSanitizedHost`
- `flashblocksRpcProviderLabel`
- `flashblocksRpcSanitizedHost`
- `explorerBaseUrl`
- `capturedAt`

Rules:

- `chainId` must be `91342`.
- RPC URLs must be stored as provider label plus sanitized host/path only.
- Query strings, headers, tokens, credentials, and account-specific parameters must be replaced with `<redacted>`.

## Roles

Required fields:

- `deployerAddress`
- `campaignSignerAddress`
- `verifierAddress`
- `intentSubmitterAddress`
- `demoUserAddress`
- `roleSeparationConfirmed`
- `demoUserPrivateKeyNeverRequested`

Rules:

- Store public addresses only.
- Store `recoveredSigner` under `manifest` to prove the manifest signer.
- Do not store private keys, mnemonics, or wallet export files.

## Contracts

Required fields:

- `intentRailAddress`
- `mockTokenAddress`
- `mockVaultAddress`
- `intentRailDeploymentTxHash`
- `mockTokenDeploymentTxHash`
- `mockVaultDeploymentTxHash`
- `deploymentBlockNumber`
- `deploymentBlockHash`

Optional fields:

- `verifiedSourceUrl`
- `compilerVersion`
- `contractBuildMetadataHash`

## Manifest

Required fields:

- `manifestVersion`
- `chainId`
- `nonce`
- `expiryUnix`
- `campaignId`
- `missionId`
- `wallet`
- `actionType`
- `target`
- `selector`
- `asset`
- `amountBaseUnits`
- `spender`
- `maxAllowanceBaseUnits`
- `referralCode`
- `canonicalManifestPayload`
- `canonicalManifestPayloadBytesHex`
- `manifestSignature`
- `eip712Domain`
- `manifestStructHash`
- `eip712Digest`
- `recoveredSigner`
- `intentHash`

EIP-712 domain fields:

- `name`
- `version`
- `chainId`
- `verifyingContract`

Rules:

- `canonicalManifestPayload` uses deterministic field order from the canonical positioning document.
- `canonicalManifestPayloadBytesHex` is the UTF-8 byte encoding of `canonicalManifestPayload`.
- `intentHash = keccak256(canonicalManifestPayload)`.
- `recoveredSigner` must equal `campaignSignerAddress`.

## Transactions

Required transaction groups:

- `intentSubmittedTx`
- `approveTx`
- `depositTx`
- `decisionTx`

Each group records:

- `txHash`
- `from`
- `to`
- `nonce`
- `input`
- `value`
- `gas`
- `gasPrice`
- `maxFeePerGas`
- `maxPriorityFeePerGas`
- `blockNumber`
- `blockHash`
- `transactionIndex`

Deposit-specific required fields:

- `rawEthGetTransaction`
- `rawEthGetTransactionDepositCalldataSnapshot`
- `depositTransactionSnapshotHash`

Receipt-specific required fields:

- `rawEthGetTransactionReceipt`
- `rawEthGetTransactionReceiptFields`
- `depositReceiptSnapshotHash`

Raw receipt fields must include:

- `transactionHash`
- `transactionIndex`
- `blockHash`
- `blockNumber`
- `from`
- `to`
- `cumulativeGasUsed`
- `gasUsed`
- `contractAddress`
- `logs`
- `logsBloom`
- `status`
- `effectiveGasPrice`

Decoded log snapshots:

- `decodedLogSnapshots`
- `decodedLogSnapshotHash`

Each decoded log snapshot includes:

- `contractAddress`
- `logIndex`
- `sourceTxHash`
- `blockNumber`
- `blockHash`
- `eventName`
- `topics`
- `args`

## Confirmation

Required fields:

- `standardRpcReceiptStatus`
- `confirmationDepth`
- `headBlockNumberAtVerification`
- `depositBlockNumber`
- `depositBlockHash`
- `flashblocksObserved`
- `flashblocksObservationStatus`
- `flashblocksExcludedFromFinalConfirmation`

Rules:

- Successful final confirmation requires standard RPC transaction receipt status `1`.
- `confirmationDepth` must be greater than or equal to the configured MVP threshold.
- Flashblocks observations are never part of final confirmation calculation.

## Verifier

Required fields:

- `verifierVersion`
- `canonicalVerifierInputPayload`
- `canonicalVerifierInputPayloadBytesHex`
- `verifierInputHash`
- `matchedFields`
- `decision`
- `failureReason`
- `failureMatchedFields`

`canonicalVerifierInputPayload` exact field order:

1. `schemaVersion`
2. `chainId`
3. `intentHash`
4. `depositTxHash`
5. `depositTransactionSnapshotHash`
6. `depositReceiptSnapshotHash`
7. `decodedLogSnapshotHash`
8. `confirmationDepth`
9. `headBlockNumberAtVerification`
10. `verifierVersion`

Hash rule:

```text
verifierInputHash = keccak256(canonicalVerifierInputPayload)
```

Golden vectors must include:

- payload JSON
- payload byte hex
- hash

Allowed decisions:

- `matched`
- `mismatched`
- `failed`
- `timeout`

Rules:

- `timeout` is non-terminal and off-chain only.
- `IntentFailed` is only for confirmed but mismatched or failed transaction evidence.
- `failureReason` is `null` only when `decision` is `matched`.

## Receipt

Required canonical payload fields:

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
- `verifiedProvider`
- `testnetDepositAmountDelta`
- `issuedAt`
- `issuer`
- `safetyNotice`

Required hash fields:

- `canonicalReceiptPayload`
- `canonicalReceiptPayloadBytesHex`
- `receiptHash`

Hash rule:

```text
receiptHash = keccak256(canonicalReceiptPayload)
```

Receipt envelope fields, excluded from `receiptHash`:

- `receiptHash`
- `decisionTxHash`
- `decisionBlockNumber`
- `decisionBlockHash`
- `explorerUrl`
- `displayStatus`
- `displayCopy`

Rules:

- The receipt is created only after `decision` is `matched`.
- `receiptHash` is excluded from `canonicalReceiptPayload`.
- `decisionTxHash` is excluded because it is produced after the receipt hash is emitted in `IntentMatched`.
- No-approve runs use `approvalRequired=false` and `approveTxHash=null`.

## Optional Decision Anchor

Local live verifier evidence may use `decisionTxHash: null`.

If an optional decision anchor exists, evidence should include `decisionAnchor.intentHash`, `decisionAnchor.verifierInputHash`, `decisionAnchor.status`, `decisionAnchor.receiptHash`, and `decisionAnchor.txHash`.

## Partner Summary

Required fields:

- `campaignId`
- `missionId`
- `runId`
- `wallet`
- `verifiedState`
- `depositTxHash`
- `receiptHash`
- `status`
- `matchedTxRate`
- `mockTestnetDepositAmount`
- `mockTestnetDepositCount`
- `issuedAt`
- `evidencePath`

Rules:

- Metrics are activation evidence for the mock GIWA Sepolia testnet action.
- Metrics must not be described as production TVL, production yield, production asset issuance, settlement, or identity-service output.

## Redaction Policy

Raw local evidence lives under:

- `docs/evidence/local/`
- `*.raw.json`
- `*.private.json`

Commit-safe evidence must:

- contain public addresses, transaction hashes, block metadata, signatures, sanitized provider labels, canonical payloads, and hashes only
- replace RPC query strings, bearer tokens, API keys, auth headers, credentials, and account-specific tokens with `<redacted>`
- omit private keys, mnemonics, wallet export JSON, local browser storage, and screenshots that reveal secret material
- fail export if a secret scan detects private keys, bearer tokens, RPC query tokens, API keys, mnemonics, or auth headers

Redacted evidence must remain sufficient to recompute:

- `intentHash`
- `manifestStructHash`
- `eip712Digest`
- `verifierInputHash`
- `receiptHash`

## Golden Vector Requirements

Each golden vector must include:

- `payloadName`
- `fieldOrder`
- `payloadJson`
- `payloadBytesHex`
- `hash`
- `createdBy`
- `createdAt`

Required golden vectors:

- `canonicalManifestPayload`
- `canonicalVerifierInputPayload`
- `canonicalReceiptPayload`

## Sprint 1 Protocol Kernel Exports

The Sprint 1 protocol package is the source of truth for canonical field order, payload bytes, and hash helpers:

- `packages/protocol/src/manifest.ts`
  - `MANIFEST_FIELD_ORDER`
  - `canonicalManifestPayload`
  - `canonicalManifestPayloadBytesHex`
  - `computeIntentHash`
- `packages/protocol/src/signing.ts`
  - `buildManifestTypedData`
  - `computeManifestStructHash`
  - `computeEip712Digest`
  - `recoverManifestSigner`
  - `verifyAgainstAllowedSigner`
- `packages/protocol/src/ids.ts`
  - `idToBytes32`
- `packages/protocol/src/receipt.ts`
  - `RECEIPT_FIELD_ORDER`
  - `canonicalReceiptPayload`
  - `canonicalReceiptPayloadBytesHex`
  - `computeReceiptHash`
  - `receiptIdempotencyKey`
- `packages/protocol/src/evidence.ts`
  - `VERIFIER_INPUT_FIELD_ORDER`
  - `canonicalVerifierInputPayload`
  - `canonicalVerifierInputPayloadBytesHex`
  - `computeVerifierInputHash`
  - `SPRINT1_GOLDEN_VECTORS`

`SPRINT1_GOLDEN_VECTORS` stores deployment-independent Sprint 1 vectors for:

- `campaignIdBytes32`
- `missionIdBytes32`
- `canonicalManifestPayload`
- `canonicalReceiptPayload`
- `canonicalVerifierInputPayload`

Sprint 3 must add deployed-address vectors after `IntentRail` exists. Sprint 4 must reject deployed GIWA Sepolia evidence that relies on deployment-independent signing vectors.

## Sprint 2 Local Contract Proof Artifacts

Sprint 2 local artifacts prove the event model before GIWA Sepolia deployment:

- `packages/contracts/contracts/MockIntentToken.sol`
  - emits `Approval`
  - emits `Transfer`
- `packages/contracts/contracts/MockVault.sol`
  - emits `MockDeposit`
  - tracks demo wallet deposit balance by asset
- `packages/contracts/contracts/IntentRail.sol`
  - emits `IntentSubmitted`
  - emits `IntentMatched`
  - emits `IntentFailed`
  - enforces verifier operator access for terminal decisions
  - prevents duplicate terminal decisions per `intentHash`
- `packages/contracts/scripts/deploy-local.ts`
  - deploys the local token, vault, and rail
  - runs the local happy path
  - prints public local addresses, transaction hashes, and decoded log snapshots
- `packages/contracts/fixtures/chain-evidence/local-happy-path.json`
  - stores a commit-safe local fixture for Sprint 4 verifier tests
  - includes local contract addresses, role addresses, tx hashes, and decoded `IntentSubmitted`, `Approval`, `Transfer`, `MockDeposit`, and `IntentMatched` logs

The local fixture is not GIWA Sepolia evidence and must not be used as Sprint 3 chain anchor proof.

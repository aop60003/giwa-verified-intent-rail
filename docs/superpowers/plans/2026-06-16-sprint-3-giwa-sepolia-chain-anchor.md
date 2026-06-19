# Sprint 3 GIWA Sepolia Chain Anchor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that the MVP can deploy and execute its mock vault action on GIWA Sepolia.

**Architecture:** This sprint creates chain evidence only. It does not create final receipts and does not produce final `decisionTxHash`; that belongs to Sprint 4.

**Tech Stack:** Hardhat, viem, GIWA Sepolia standard RPC, GIWA Sepolia Flashblocks RPC.

---

## Start Conditions

- Sprint 2 exit gate is approved.
- `DEPLOYER_PRIVATE_KEY` is available in local env.
- `VERIFIER_PRIVATE_KEY` or `VERIFIER_ADDRESS` is available for verifier operator configuration and balance preflight.
- `INTENT_SUBMITTER_PRIVATE_KEY` is available in local env for `IntentSubmitted`.
- `CAMPAIGN_SIGNER_PRIVATE_KEY` is available in local env for the Sprint 3 manifest signing script.
- Demo user wallet has GIWA Sepolia test ETH.
- Dependency and workspace gates are already resolved.
- Server/client env boundaries from Sprint 0 are still respected.
- GIWA Sepolia env may come from process env or a gitignored `.env` / `.env.local` file. File values must be loaded without printing raw values, and process env takes priority.

## Files

- Create: `packages/contracts/scripts/preflight-giwa.ts`
- Create: `packages/contracts/scripts/sign-manifest-local.ts`
- Create: `packages/contracts/scripts/deploy-giwa.ts`
- Create: `packages/contracts/scripts/run-chain-anchor.ts`
- Create: `docs/evidence/giwa-sepolia-chain-anchor.json`
- Create: `packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json`
- Update: `apps/web/src/generated/deployment.json` only after deployment succeeds
- Update: `docs/implementation/giwa-mvp-faucet-and-preflight.md`

## Preflight Requirements

- standard RPC returns `91342`
- Flashblocks RPC returns `91342`
- deployer has sufficient GIWA Sepolia test ETH
- verifier operator has sufficient GIWA Sepolia test ETH
- intent submitter has sufficient GIWA Sepolia test ETH
- demo wallet has sufficient GIWA Sepolia test ETH
- minimum balances come from `estimateGas` plus a documented buffer
- `gasPriceSnapshot` is recorded
- faucet source, claim timestamp, and next retry timestamp are recorded when faucet funding is used
- explorer tx URL template is configured
- wallet network values are documented
- verifier operator address and intent submitter address are documented
- If role balances are empty but one GIWA Sepolia L2 funder account is funded, run `pnpm --filter @giwa/contracts --fail-if-no-match fund:giwa` before retrying preflight. This is funding setup only, not an exit-gate bypass.

## Tasks

- [ ] Run GIWA Sepolia preflight.

Run:

```powershell
Test-Path .\pnpm-workspace.yaml
Test-Path .\packages\contracts\package.json
pnpm --filter @giwa/contracts --fail-if-no-match preflight:giwa
```

The command uses the package script because Sprint 3 follows the existing Hardhat 3 plus viem pattern and does not add `tsx`.

Expected:

```text
standardRpcChainId=91342
flashblocksRpcChainId=91342
deployerBalanceOk=true
verifierBalanceOk=true
intentSubmitterBalanceOk=true
demoWalletBalanceOk=true
```

- [ ] Prepare and then sign the deployment-bound manifest with the Sprint 1 protocol utilities.

Prepare manifest input before deployment, then produce the final signature immediately after the `IntentRail` address exists.

The final `canonicalManifestPayload`, `manifestSignature`, `manifestStructHash`, and `eip712Digest` must be generated only after `mockToken`, `mockVault`, and `intentRail` addresses are known, because those addresses define `asset`, `target`, `spender`, and `domain.verifyingContract`.

Expected evidence:

```text
canonicalManifestPayload=<payload>
canonicalManifestPayloadBytesHex=<hex>
intentHash=<hash>
manifestStructHash=<hash>
eip712Digest=<hash>
manifestSignature=<signature>
manifestDomain.verifyingContract=<IntentRail address after deployment>
recoveredSigner=<campaign signer address>
nonce=<nonce>
nonceSource=local-script
```

- [ ] Deploy contracts to GIWA Sepolia.

Expected output:

```text
mockTokenDeploymentTxHash=<hash>
mockVaultDeploymentTxHash=<hash>
intentRailDeploymentTxHash=<hash>
mockToken=<address>
mockVault=<address>
intentRail=<address>
verifierOperatorAddress=<address>
intentSubmitterAddress=<address>
operatorConfigured=true
deploymentReceiptStatus=1
codePresent=true
codeLength=<number>
```

- [ ] Verify deployed code exists.

Each deployed address must satisfy:

```text
eth_getCode(address) != 0x
```

- [ ] Mint mock test token to demo wallet.

Expected evidence:

```text
mintTxHash=<hash>
demoWalletMockTokenBalance=<base-unit amount>
```

- [ ] Submit `IntentSubmitted` to intent rail.

P0 default:

```text
IntentSubmitted is relayed by the configured intent submitter to keep the demo short.
```

The evidence must still separate user acceptance from relay execution:

```text
userAcceptedAt=<timestamp>
relayerAddress=<address>
relayReason=operator-relay-for-demo
canonicalManifestPayload=<payload>
canonicalManifestPayloadBytesHex=<hex>
manifestSignature=<signature>
manifestDomain=<domain>
recoveredSigner=<campaign signer address>
manifestStructHash=<hash>
eip712Digest=<hash>
campaignIdBytes32=<hash>
missionIdBytes32=<hash>
```

Expected evidence:

```text
intentSubmittedTxHash=<hash>
intentHash=<hash>
```

- [ ] Submit approve and deposit from demo wallet.

Current implementation boundary:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match deploy:giwa
pnpm --filter @giwa/contracts --fail-if-no-match anchor:giwa
```

`deploy:giwa` prepares `walletActions.approve` and `walletActions.deposit`. The demo wallet owner sends both transactions from the wallet app. `anchor:giwa` then reads `GIWA_APPROVE_TX_HASH` and `GIWA_DEPOSIT_TX_HASH` from local env and collects standard RPC evidence. It must fail before writing the final fixture if either hash is missing.

Expected evidence:

```text
approvalRequired=true or false
approveTxHash=<hash or null>
approvalReceiptStatus=<1 or null>
allowanceBeforeBaseUnits=<amount>
allowanceAfterBaseUnits=<amount>
depositTxHash=<hash>
depositReceiptStatus=1
blockNumber=<confirmed block number>
blockHash=<confirmed block hash>
depositBlockNumber=<confirmed block number>
depositBlockHash=<confirmed block hash>
```

- [ ] Record Flashblocks fast feedback separately.

Expected evidence:

```text
flashblocksObservedAt=<timestamp or null>
flashblocksMethod=<method or null>
flashblocksPendingReceiptSnapshot=<snapshot or null>
fastFeedbackObserved=true or false
```

This field is not final confirmation evidence.

- [ ] Write standard chain evidence fixture.

The fixture must include:

- deployment addresses and tx receipts
- `IntentSubmitted`, `Approval`, `Transfer`, and `MockDeposit` logs
- decoded fields with `contractAddress` and `logIndex`
- explorer tx and address URLs
- standard RPC receipt snapshots
- raw `eth_getTransactionReceipt` fields: `transactionHash`, `status`, `from`, `to`, `blockNumber`, `blockHash`, `transactionIndex`, `logs`, `logs[].address`, `logs[].topics`, `logs[].data`, `logs[].logIndex`, `logs[].removed`
- raw `eth_getTransaction` fields for deposit calldata: `hash`, `from`, `to`, `input`, `value`
- Flashblocks observations in a separate non-final namespace

## Verification

Run:

```powershell
Test-Path .\pnpm-workspace.yaml
Test-Path .\packages\contracts\package.json
pnpm --filter @giwa/contracts --fail-if-no-match tsx scripts/run-chain-anchor.ts
```

Expected:

```text
GIWA Sepolia deployment, intent submission, approval, deposit, block confirmation, and evidence write all succeed.
decisionTxHash is not produced in Sprint 3.
Filtered pnpm command fails if `@giwa/contracts` does not exist.
```

## Exit Gate

Sprint 3 is complete only when:

- deployment tx hashes exist
- deployed addresses have code
- `IntentSubmitted` is confirmed
- deposit is confirmed by standard RPC
- `blockNumber` and `blockHash` are recorded
- explorer links open for tx hashes
- explorer URL smoke status is recorded
- explorer smoke check uses `Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 <explorerUrl>` or an equivalent HTTP status check
- standard chain evidence fixture exists
- `decisionTxHash` is explicitly marked as Sprint 4 output

## Stop Conditions

Stop if:

- RPC chain id is not `91342`
- deployed contract code is missing
- demo wallet lacks gas
- deposit cannot be confirmed by standard RPC
- anyone attempts to use Flashblocks as final receipt evidence
- manual `IntentMatched` is proposed as final verifier evidence

## Handoff To Sprint 4

Pass these artifacts:

- deployment addresses
- deployment tx hashes
- `intentSubmittedTxHash`
- `approveTxHash` if used
- `depositTxHash`
- confirmed `blockNumber`
- confirmed `blockHash`
- receipt/log snapshots from standard RPC
- chain evidence fixture path
- deployment-bound manifest signing vector
- verifier operator address and operator configuration proof

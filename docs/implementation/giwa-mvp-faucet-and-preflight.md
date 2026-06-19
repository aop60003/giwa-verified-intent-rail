# GIWA MVP Faucet And Preflight

## Purpose

This checklist must pass before Sprint 3 deploys or submits GIWA Sepolia transactions. Sprint 0 records the plan only; it does not deploy, transact, or claim faucet funds.

## Network Checks

| Check | Method | Expected |
|---|---|---|
| Standard RPC chain ID | Call `eth_chainId` through `GIWA_SEPOLIA_RPC_URL`. | `91342` decimal, `0x164ce` hex. |
| Flashblocks RPC chain ID | Call `eth_chainId` through `GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL`. | `91342` decimal, `0x164ce` hex. |
| Explorer transaction URL template | Substitute a known or newly produced tx hash into `GIWA_EXPLORER_TX_URL_TEMPLATE`. | URL opens the transaction page without exposing query tokens. |
| Explorer address URL template | Substitute a public address into `GIWA_EXPLORER_ADDRESS_URL_TEMPLATE`. | URL opens the address page without exposing query tokens. |

GIWA docs list GIWA Sepolia chain ID `91342`, standard RPC `https://sepolia-rpc.giwa.io`, Flashblocks RPC `https://sepolia-rpc-flashblocks.giwa.io`, and explorer `https://sepolia-explorer.giwa.io`.

## Sprint 3 Preflight Script

Run the preflight through the contracts package script:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match preflight:giwa
```

The script lives at `packages/contracts/scripts/preflight-giwa.ts` and follows the current Hardhat 3 plus viem pattern. It does not require `tsx` or Hardhat Toolbox.

The script can load local env files before checking readiness:

- workspace `.env`
- workspace `.env.local`
- contracts-package `.env`
- contracts-package `.env.local`

These files are gitignored and must never be printed, searched with content-printing commands, or committed. Existing process env values take priority over file values.

The script reports:

- set or missing env status, value length, and public addresses derived from server-side role private keys
- sanitized RPC and explorer endpoint metadata without query strings or path tokens
- standard RPC and Flashblocks RPC chain ID checks against `91342`
- current standard RPC gas price
- deployment gas estimates for `MockIntentToken`, `MockVault`, and `IntentRail`
- native balance checks for deployer, verifier, intent submitter, and demo wallet
- explorer template smoke status

The script must stop before deployment when any required env, role address, RPC chain ID, or minimum balance check fails.

2026-06-16 run status: current process env is missing all required GIWA Sepolia variables and `loadedEnvFiles` is empty, so the preflight stops before network calls, deployment, or anchor transactions. No real `.env` content was printed or scanned.

## Balance Checks

Check balances through the standard RPC before any deploy or transaction work:

| Wallet | Required check | Minimum basis |
|---|---|---|
| Deployer | Native test ETH balance for contract deployment. | Sum of deployment `estimateGas` values multiplied by current gas price plus a safety margin. |
| Verifier | Native test ETH balance for verifier decision event. | `IntentMatched` or `IntentFailed` `estimateGas` multiplied by current gas price plus a safety margin. |
| Intent submitter | Native test ETH balance for `IntentSubmitted`. | `submitIntent` `estimateGas` multiplied by current gas price plus a safety margin. |
| Demo user wallet | Native test ETH balance and mock token balance. | Optional approve plus required deposit `estimateGas` multiplied by current gas price plus a safety margin. |

The demo user wallet must be controlled through the user's wallet app. The app must not request or store the demo user's private key.

## Role Funding Helper

If faucet funding is confirmed on one GIWA Sepolia L2 account, use the role funding helper to distribute native test ETH to the Sprint 3 role addresses:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match fund:giwa
```

Required extra local env:

- `GIWA_FUNDER_PRIVATE_KEY`

The helper:

- loads the same gitignored local env files as `preflight:giwa`
- derives and prints only the funder public address
- computes the same deployer, verifier, intent submitter, and demo wallet balance targets used by preflight
- sends standard GIWA Sepolia L2 native ETH transfers only when the funder balance is sufficient
- records tx hashes, receipt status, block number, and block hash for funding transfers
- never asks for the demo wallet private key

The helper must not be used with Ethereum Sepolia L1 ETH directly. If the funder balance is `0` on GIWA Sepolia standard RPC, claim GIWA Sepolia faucet ETH or bridge to GIWA Sepolia first.

## Sprint 3 Chain Anchor Commands

After preflight passes, deploy the mock token, mock vault, and intent rail, mint mock test tokens to the demo wallet, sign the deployment-bound manifest, and submit `IntentSubmitted`:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match deploy:giwa
```

The deploy command writes:

- `docs/evidence/giwa-sepolia-chain-anchor.json`
- `apps/web/src/generated/deployment.json`

The deploy output includes `walletActions.approve` and `walletActions.deposit`. The demo wallet owner must send those transactions from the wallet app. The script must not use or ask for the demo wallet private key for approve or deposit.

After the wallet app returns the transaction hashes, store them locally without printing values:

```text
GIWA_APPROVE_TX_HASH=<wallet-app approve tx hash>
GIWA_DEPOSIT_TX_HASH=<wallet-app deposit tx hash>
```

Then collect standard RPC evidence:

```powershell
pnpm --filter @giwa/contracts --fail-if-no-match anchor:giwa
```

The anchor command writes the final Sprint 3 fixture only after both standard RPC receipts have `status=success`.

## EstimateGas Inputs

Before Sprint 3, compute these estimates with the exact deployed addresses and calldata:

- mock token deploy
- mock vault deploy
- intent rail deploy
- `submitIntent`
- optional ERC-20 `approve`
- mock vault `deposit`
- `IntentMatched`
- `IntentFailed`

Minimum test ETH rule:

```text
minimumTestEthWei = sum(estimateGasForRole) * currentGasPriceWei * safetyMultiplier
```

Use a default `safetyMultiplier` of `2` unless Sprint 3 records a better reason. Record the gas price snapshot source and timestamp.

## Faucet Sources

Primary source:

- `https://faucet.giwa.io`

Fallback source:

- `https://faucet.lambda256.io/giwa-sepolia`

The GIWA faucet documentation lists a GIWA Faucet and a Nodit Faucet. The public documentation states GIWA Faucet claims up to `0.005 ETH` every `24 hours`, and Nodit Faucet claims up to `0.01 ETH` every `24 hours`. If faucet limits change, record the observed limit in the Sprint 3 handoff.

## Faucet Record

Record these fields after each claim attempt:

| Field | Meaning |
|---|---|
| `walletAddress` | Public address that requested test ETH. |
| `faucetSourceUrl` | Faucet page used, without auth data. |
| `claimedAt` | Timestamp when the claim completed or failed. |
| `nextRetryAt` | Timestamp when the faucet allows another claim, if shown. |
| `result` | `funded`, `rateLimited`, `unavailable`, or `failed`. |
| `notes` | Sanitized operator notes without secrets or auth headers. |

## Faucet Unavailable Fallback

If both faucet sources are unavailable:

1. Do not reduce confirmation or evidence requirements.
2. Do not borrow mainnet keys or use personal production wallets.
3. Record the failure reason and timestamps.
4. Ask the user whether to wait, use another approved GIWA Sepolia faucet source, or postpone Sprint 3.

## Flashblocks Boundary

Flashblocks is fast feedback only. Standard RPC block confirmation is required before verifier matching and receipt issuance. Flashblocks observations must not be used as final confirmation or settlement evidence.

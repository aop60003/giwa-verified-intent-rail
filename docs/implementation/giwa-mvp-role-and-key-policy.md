# GIWA MVP Role And Key Policy

## Scope

This policy applies to the GIWA Verified Intent Rail MVP on GIWA Sepolia only. It does not authorize mainnet use, production custody, production funds, production yield, production asset issuance, settlement, identity-service behavior, or security guarantees.

## Roles

| Role | Environment variable | Purpose | Boundary |
|---|---|---|---|
| Deployer | `DEPLOYER_PRIVATE_KEY` | Deploy Sprint 3 GIWA Sepolia mock token, mock vault, and rail contracts. | Deploys testnet contracts only. |
| Campaign signer | `CAMPAIGN_SIGNER_PRIVATE_KEY` | Sign action manifests from server-side code or local scripts. | Never used in browser code. |
| Verifier | `VERIFIER_PRIVATE_KEY` | Emit verifier decision events after confirmed evidence is checked. | Emits decision events only. |
| Intent submitter | `INTENT_SUBMITTER_PRIVATE_KEY` | Relay `IntentSubmitted` when the MVP flow uses a server-side submitter. | Does not sign user deposits or approvals. |
| Demo user wallet | User-controlled wallet app | Sends optional approve and required mock vault deposit transactions. | The app must not ask for, store, echo, or commit the demo user's private key. |

## Key Rules

- Role keys must be distinct, GIWA Sepolia-only, throwaway, non-personal, and not reused from mainnet.
- Any exception requires explicit user approval before the key is used.
- Exposed or suspected-exposed keys must be rotated before the next sprint starts.
- Private keys, bearer tokens, RPC query tokens, API keys, mnemonics, auth headers, and tokenized RPC URLs must not appear in logs, Markdown, JSON evidence, browser bundles, screenshots, or copied chat output.
- Evidence files may include public addresses, transaction hashes, block data, signatures, sanitized RPC provider labels, canonical payloads, and hashes.

## Client Boundary

Only variables prefixed with `NEXT_PUBLIC_` may be imported into client-side code. Public variables must never contain private keys, bearer tokens, tokenized RPC URLs, API keys, auth headers, or secrets.

Server-only variables must remain in server code, local scripts, or deployment tooling. Client components, browser bundles, static exports, screenshots, and partner summaries must not include server-only variable values.

## Environment Contract

`.env.example` documents names only and keeps values empty.

```dotenv
# SERVER_ONLY - never import into client components or expose through NEXT_PUBLIC
GIWA_SEPOLIA_RPC_URL=
GIWA_SEPOLIA_FLASHBLOCKS_RPC_URL=
GIWA_EXPLORER_TX_URL_TEMPLATE=
GIWA_EXPLORER_ADDRESS_URL_TEMPLATE=
DEPLOYER_PRIVATE_KEY=
CAMPAIGN_SIGNER_PRIVATE_KEY=
VERIFIER_PRIVATE_KEY=
INTENT_SUBMITTER_PRIVATE_KEY=

# PUBLIC_CLIENT_SAFE - no secrets, tokens, private keys, or tokenized RPC URLs
NEXT_PUBLIC_GIWA_CHAIN_ID=
NEXT_PUBLIC_INTENT_RAIL_ADDRESS=
NEXT_PUBLIC_MOCK_TOKEN_ADDRESS=
NEXT_PUBLIC_MOCK_VAULT_ADDRESS=
```

## Scanner Policy

Do not run content-printing scans against real `.env` files. If a real env file exists, use only a redacted scanner that reports file path, match type, and count without printing matched values.

Content-printing scans are allowed for `.env.example` because it must contain variable names only and no values.

Required `.env.example` check:

```powershell
$envSecretPattern = "0x[a-fA-F0-9]{64}|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en"
rg -n $envSecretPattern .\.env.example
```

Expected result:

```text
No live secret values are printed.
```

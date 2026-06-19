# GIWA Staging Environment Contract

## Environment Contract

Document variable names and categories only. Do not record values in runbooks, release manifests, public snapshots, or partner packets.

| Category | Variable names | Staging rule |
| --- | --- | --- |
| Runtime | `GIWA_LIVE_MODE`, `HOST`, `PORT` | `GIWA_LIVE_MODE=staging-testnet`; host and port are approved by host policy |
| Storage | `GIWA_LIVE_DB_PATH` or approved adapter config names | adapter and owner recorded before binding |
| Chain and explorer | `GIWA_SEPOLIA_RPC_URL`, `GIWA_EXPLORER_TX_URL_TEMPLATE`, `GIWA_EXPLORER_ADDRESS_URL_TEMPLATE` | redacted readiness only |
| Manifest signing | `CAMPAIGN_SIGNER_PRIVATE_KEY` | public signer address only in readiness |
| Operator roles | `INTENT_SUBMITTER_PRIVATE_KEY`, `VERIFIER_PRIVATE_KEY` | inactive for Sprint 19 release gates unless a later plan approves use |
| Hosted auth and origin | `GIWA_LIVE_ALLOWED_ORIGINS`, `GIWA_LIVE_PARTNER_CREDENTIAL_HASHES`, `GIWA_LIVE_PARTNER_TENANT_ID` | explicit tenant and credential mapping required |
| Client-safe display | `NEXT_PUBLIC_GIWA_CHAIN_ID`, `NEXT_PUBLIC_INTENT_RAIL_ADDRESS`, `NEXT_PUBLIC_MOCK_TOKEN_ADDRESS`, `NEXT_PUBLIC_MOCK_VAULT_ADDRESS` | public values only |

## Redacted Readiness

Startup and `/readyz` may show only:

- check name
- set, missing, or invalid state
- length or format class
- normalized public address where derivable
- chain id result
- DB probe result
- queue status
- hosted policy result

The server fails closed when non-mock readiness is red, hosted policy is red, tenant mapping is implicit, or public binding is requested without host approval.

## Public Artifact Rule

Public outputs may include public addresses, public transaction hashes, block fields, hash fields, bounded verifier status, and public snapshot paths. Public outputs must not include local configuration contents, credential values, tokenized URLs, raw auth headers, raw request bodies, browser local state, wallet signing material, or server-only runtime values.

## Staging Activation Rule

`staging-testnet` activation requires:

- process environment supplied by the approved runtime path
- local env file loading disabled for hosted modes
- redacted startup readiness captured
- public signer address verified
- hosted tenant mapping explicit
- origin policy explicit
- storage readiness green or explicitly blocked

## Sprint 33 Billing-Lock Boundary

Sprint 33 may prepare the redacted readiness checklist, but it cannot activate a public staging runtime while protected CI is blocked by GitHub billing.

Required post-billing readiness evidence:

| Gate | Evidence required before staging execution |
| --- | --- |
| Runtime mode | `GIWA_LIVE_MODE=staging-testnet` from process environment |
| Env loading | hosted modes do not load local env files |
| Redaction | startup and `/readyz` show set, missing, invalid, length, format, public address, and probe classes only |
| Tenant mapping | credential hash maps to actor id, tenant id, and scopes |
| Origin policy | exact same-origin or allowlisted CORS decision |
| Storage | approved adapter probe or explicit dry-run block |

Until protected CI passes, all readiness evidence is advisory and `stagingDryRunExecution=blocked-protected-ci`.

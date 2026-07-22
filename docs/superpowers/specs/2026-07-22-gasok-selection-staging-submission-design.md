# GASOK Selection Staging Submission Design

**Status:** Approved on 2026-07-22
**Deadline:** 2026-07-31
**Product:** `GIWA Verified Intent Rail`
**Authority:** GASOK selection testnet staging design; not a production or mainnet release design

## 1. Goal

Ship an evaluator-ready public staging experience that proves this statement:

> A reviewer can open a public HTTPS URL, use their own wallet to execute one GIWA Sepolia mock vault action, and receive a receipt only after the confirmed transaction matches the signed manifest.

The submission should optimize for the GASOK selection criteria published at `https://giwa.io/gasok`:

- GIWA chain fit
- originality
- feasibility
- marketability
- team execution capability
- GIWA Wallet placement potential
- actual implementation level
- technical completeness

The design favors one reliable, understandable action over broader product scope.

## 2. Current Baseline

The repository already contains:

- a canonical manifest and receipt protocol with EIP-712 signing and deterministic hashes
- `MockIntentToken`, `MockVault`, and `IntentRail` contracts deployed on GIWA Sepolia
- recorded GIWA Sepolia transaction and event evidence
- browser-wallet approve and deposit requests
- a Standard RPC verifier and matched-only dynamic receipt gate
- static, live, user, demo, receipt, and partner surfaces
- local SQLite state
- local tests, type checks, artifact scans, provenance reports, and deployment planning documents

The deployed contract bytecode was read from the current GIWA Sepolia state on 2026-07-22 and remains present at the checked-in token, vault, and rail addresses.

The current gaps that affect submission readiness are:

- the public user flow is not deployed
- hosted participant and partner access boundaries are not suitable for an evaluator-facing public app
- a fresh wallet has no integrated gas and mock-token readiness flow
- verification is user-triggered instead of progressing automatically after deposit
- checked-in provenance evidence is out of sync with later staging documents
- safe scans currently report staging-document policy mismatches
- protected CI is not current for the selected source commit
- Lightsail, domain, and HTTPS execution has not occurred

## 3. Success Criteria

A reviewer must be able to complete the primary experience in no more than five minutes without cloning the repository or reading setup documentation.

The submission passes when all of the following are true:

1. A public HTTPS URL opens the `/user` action page.
2. The product value and testnet boundary are understandable within ten seconds.
3. The app detects wallet, network, gas balance, mock-token balance, and allowance state.
4. The app provides recovery for wrong network, low gas, and missing mock token.
5. The reviewer sees target, asset, amount, spender, allowance limit, expiry, wallet, and intent hash before wallet submission.
6. The browser wallet sends the required GIWA Sepolia transactions.
7. The server stores only public transaction evidence returned by the wallet.
8. Standard RPC evidence reaches the configured confirmation threshold.
9. The verifier compares the confirmed transaction with the signed manifest.
10. A receipt becomes public only when the decision is `matched`.
11. The receipt links to the GIWA explorer and exposes replayable public evidence.
12. A recorded successful example remains available if a live dependency is temporarily unavailable.
13. Desktop and mobile browser smoke tests pass without console or page errors.
14. Repository tests, type checks, build checks, syntax checks, safe scans, and local provenance verification pass for the selected commit.

## 4. Scope Lock

### 4.1 Included

- one action: `First Mock Vault Deposit on GIWA Sepolia`
- one public evaluator-facing staging origin
- one campaign and one mission fixed by server policy
- one permissionless mock-token preparation action
- exact-amount approval when required
- one mock vault deposit
- one signed action manifest
- one Standard RPC verifier decision
- one matched-only receipt
- one public receipt share route
- one redacted partner evidence surface
- one static recorded-evidence fallback
- one Lightsail instance behind Nginx and HTTPS

### 4.2 Excluded

- mainnet execution
- no production funds, asset issuance, yield, RWA, payment, or settlement claims or execution
- additional action templates
- multi-campaign management
- managed database and multi-instance deployment
- fresh-run `IntentSubmitted` or decision relay transactions sent by the server
- Dojang or up.id live integration
- live Flashblocks integration as confirmation evidence
- GIWA Wallet in-app implementation
- partner billing or general-purpose analytics
- production account, identity, or compliance systems

SQLite and single-process runtime behavior are explicitly described as GASOK selection testnet staging, not production infrastructure.

## 5. Product Surface Strategy

The public route hierarchy is:

| Route | Purpose | Priority |
| --- | --- | --- |
| `/user` | primary evaluator action | primary |
| `/user/receipt/[receiptHash]` | user-facing matched receipt | primary |
| `/user/receipts` | receipts retained in the current browser | secondary |
| `/user/help` | recovery and retry guidance | secondary |
| `/receipt/[receiptHash]` | technical public receipt projection | evidence |
| `/partner` | redacted partner ProofKPI projection | evidence |
| `/demo` | operator and fallback control room | evidence |
| `/live` | technical live-flow reference | legacy support |
| `/` | recorded guided evidence | static fallback |

The first screen does not lead with operator, partner, or technical controls. It presents one primary action and one secondary link to a verified example.

## 6. Evaluator User Flow

### 6.1 Entry

The entry page communicates:

- review the action before signing
- execute on GIWA Sepolia testnet
- receive a receipt only after manifest match
- no production asset, yield, RWA, payment, or settlement behavior

The visible progress model is:

```text
Review -> Execute -> Receipt
```

Only the action relevant to the current step is emphasized.

### 6.2 Wallet And Readiness

After wallet connection, the client reads:

- current account
- current chain ID
- GIWA Sepolia ETH balance
- mock-token balance
- mock-vault allowance
- restorable run state for the current tab

Recovery behavior is deterministic:

| State | Primary action |
| --- | --- |
| wallet missing | explain supported browser-wallet requirement |
| wallet disconnected | connect wallet |
| wrong chain | switch or add GIWA Sepolia |
| gas insufficient | open the official GIWA faucet and recheck balance |
| mock token insufficient | request wallet transaction to mint the fixed demo amount to the connected account |
| ready | issue and review the wallet-bound manifest |

The server does not mint, approve, or deposit on behalf of the reviewer. The wallet owns all user transaction signing.

Manifest issuance occurs after gas and mock-token readiness so the one-hour manifest lifetime is not consumed during faucet recovery.

### 6.3 Intent Preview

The default preview shows:

- network and chain ID
- action description
- demo amount
- target
- asset
- spender
- maximum allowance
- expiry
- wallet
- intent hash

Technical details are available through progressive disclosure. The default copy emphasizes that approval is limited to the exact demo amount and the action is testnet-only.

### 6.4 Transaction Execution

The client refreshes allowance immediately before execution.

```text
allowance below required amount
-> approve exact amount
-> wait for successful receipt
-> deposit

allowance at or above required amount
-> skip approve
-> deposit
```

Unlimited approval is not used.

After the wallet returns the deposit transaction hash, the client automatically:

1. records public transaction evidence
2. waits before the first verification request
3. requests Standard RPC verification
4. displays pending confirmation without resending the transaction
5. retries verification within bounded limits
6. renders the terminal verifier result

Manual `Verify receipt` is a recovery action, not a required happy-path step.

### 6.5 Receipt

The user-facing success state displays:

- `Manifest matched`
- receipt hash
- deposit transaction hash and explorer link
- wallet
- target, asset, and amount
- block number and block hash
- confirmation depth
- verifier input hash
- issued time
- testnet safety notice

Primary receipt actions are:

- open transaction in explorer
- copy receipt link
- open verification evidence
- start a new test

The partner projection is secondary to the user receipt.

### 6.6 Language

The submission UI uses Korean-first explanatory copy with stable English product terms such as `Intent Preview`, `Manifest matched`, and `Receipt`. A general internationalization framework is outside scope.

## 7. Runtime Architecture

```text
Reviewer browser wallet
   |
   | mint / approve / deposit
   v
GIWA Sepolia

Reviewer browser
   |
   | HTTPS
   v
Nginx :443
   |-- static and public UI -> static service 127.0.0.1:4176
   `-- API, health, readiness -> live service 127.0.0.1:4177
                                      |
                                      |-- SQLite run and receipt state
                                      `-- GIWA Standard RPC reads
```

Only Nginx accepts public traffic. Node services remain bound to loopback.

## 8. Participant And Partner Access Boundaries

### 8.1 Participant Capability

`POST /api/runs` is a public participant entry point protected by exact-origin checks, input constraints, and rate limits. A successful response includes a random `runCapability`. The server stores only its hash.

The browser stores `runCapability` in `sessionStorage`. The capability is required to read or mutate its run, but it is not included in receipt URLs, logs, public evidence, or partner projections.

### 8.2 Endpoint Policy

| Endpoint | Access | Behavior |
| --- | --- | --- |
| `POST /api/runs` | public participant entry | fixed campaign and mission; issues run capability |
| `GET /api/runs/[runId]` | matching run capability | returns bounded run state |
| `POST /api/runs/[runId]/evidence` | matching run capability | records unique public transaction hashes |
| `POST /api/runs/[runId]/verify` | matching run capability | performs bounded synchronous verification |
| `POST /api/runs/[runId]/invalidate` | matching run capability | invalidates manifest after wallet context change |
| `GET /api/receipts/[receiptHash]` | public after matched gate | returns public replayable receipt evidence |
| `GET /api/partner/runs` | protected partner boundary | returns redacted tenant-scoped rows |
| detailed demo status | protected operator boundary | returns bounded operational data |

The public `/partner` screen consumes only redacted snapshot or aggregate data. It never embeds an operator credential in browser assets.

### 8.3 Request Controls

The live service enforces:

- exact allowed HTTPS origin for state-changing requests
- JSON content type for POST requests
- 64 KiB request body limit
- method allowlist
- wallet and transaction hash format validation
- fixed campaign and mission allowlist
- rejection of body-supplied tenant, target, asset, or spender overrides
- IP limits for run creation and verification
- one-run ownership for each deposit transaction hash
- bounded public error codes
- redacted telemetry

Nginx adds coarse IP limiting, body size limits, upstream timeouts, and bounded upstream failure responses.

## 9. Verification And Receipt Data Flow

The selection staging runtime intentionally uses bounded synchronous verification rather than adding a new durable worker.

```text
deposit hash stored
-> verification request
-> Standard RPC transaction, receipt, block, and head snapshots
-> confirmation threshold check
-> signed manifest replay
-> calldata and log match
-> verifier input hash
-> terminal decision
-> matched-only canonical receipt
```

Under-confirmed evidence returns a pending state. The client retries verification only; it does not resend the deposit transaction.

Before receipt creation, the verifier checks:

- EIP-712 signer and verifying contract
- stored intent hash replay
- chain ID `91342`
- transaction sender and manifest wallet
- target, selector, asset, and amount
- spender and allowance bound
- required deposit logs
- successful Standard RPC receipt
- confirmation depth
- expiry against block time
- canonical verifier input hash
- canonical receipt hash

The same intent and transaction inputs are idempotent. A transaction hash cannot be reassigned to another run.

## 10. Staging Data Model

SQLite stores:

- runs
- submitted transactions
- verifier inputs
- decisions
- receipts
- run capability hashes
- created and updated timestamps

Staging operations include:

- backup before every release
- daily database backup
- retention cleanup for incomplete runs
- preservation of final receipt evidence
- static fallback during live storage recovery

SQLite is not presented as production-ready hosted storage.

## 11. Error And Recovery Model

| Failure | User behavior | Server behavior |
| --- | --- | --- |
| wallet request rejected | allow safe retry | do not create or advance invalid state |
| account or chain changes | request fresh manifest | invalidate current run |
| gas insufficient | open faucet and recheck | no run mutation |
| mock token insufficient | request self-mint transaction | no server transaction |
| approve fails | show explorer and retry guidance | keep deposit disabled |
| deposit fails | show explorer and issue new-action guidance | do not unlock receipt |
| confirmation pending | show non-terminal progress | allow bounded verification retry |
| RPC unavailable | preserve tx hash and recovery path | return bounded dependency category |
| verifier mismatch | show safe mismatch category | store terminal decision; do not issue receipt |
| live service unavailable | open verified example | keep static fallback available |
| database recovery required | keep static fallback | stop live writes before restore |

Raw exception text and runtime values are never returned to the browser.

## 12. Lightsail Deployment Design

### 12.1 Release Layout

```text
/opt/giwa/releases/[commit]  immutable release directories
/opt/giwa/current            active release link
/var/lib/giwa                SQLite and backups
/etc/giwa                    server-only runtime configuration
```

Services run as a non-root `giwa` account.

### 12.2 Source Policy

The selected commit must pass local verification before deployment. The preferred transfer path is:

```text
verified local source
-> commit
-> user-approved push
-> exact commit checkout on Lightsail
-> frozen lockfile installation
-> web build
-> release activation
```

If protected CI remains unavailable for an external account reason, the user may approve a GASOK-selection-only local-advisory staging exception. The submission must not represent that exception as protected CI or release-grade provenance.

### 12.3 Services

`giwa-static.service` runs the static web server on `127.0.0.1:4176`.

`giwa-live.service` runs the live service on `127.0.0.1:4177` with:

- `staging-testnet` mode
- explicit database path
- explicit public origin
- role signing material supplied only through the server runtime boundary
- GIWA Standard RPC endpoint
- explorer templates
- protected partner credential hashes

Static starts and passes smoke before live activation.

### 12.4 Nginx And HTTPS

The deployment sequence is:

```text
fixed public IP
-> domain record
-> localhost service smoke
-> Nginx configuration test
-> certificate activation
-> HTTPS smoke
-> HTTP-to-HTTPS redirect
```

Nginx denies direct access to runtime files, repository metadata, database files, backups, and directory listings.

### 12.5 Health And Readiness

`/healthz` reports process liveness only.

`/readyz` reports redacted categories for:

- staging runtime mode
- SQLite open and write readiness
- GIWA chain ID
- token, vault, and rail bytecode presence
- campaign signer readiness
- exact public origin
- verifier dependency readiness
- schema compatibility

Failure returns HTTP 503 and a bounded category without configuration values.

### 12.6 Rollback

Rollback order is:

1. stop live service
2. keep static fallback online when healthy
3. switch the active release link to the previous commit
4. restore previous Nginx configuration when required
5. restore database only after writes stop and the owner approves
6. rerun static and readiness smoke
7. preserve bounded failure evidence

Public testnet transactions cannot be rolled back. A retry uses a new run and manifest.

## 13. Verification Strategy

### 13.1 Unit Coverage

- readiness state calculation
- mock-token mint calldata
- exact approval and deposit calldata
- allowance skip
- run capability hashing and validation
- origin and request controls
- manifest normalization, signing, and hash replay
- confirmation pending, mismatch, failure, and matched states
- receipt gate and public projection
- safe public error copy

### 13.2 API Integration Coverage

- public run creation
- missing or incorrect run capability rejection
- cross-run transaction hash reuse rejection
- campaign, tenant, target, asset, and spender override rejection
- wallet context invalidation
- pending confirmation behavior
- idempotent verification retry
- mismatch receipt lock
- matched receipt publication
- protected partner endpoint rejection
- SQLite restart recovery
- rate-limit decisions

### 13.3 Browser Coverage

- missing wallet
- rejected connection
- wrong chain
- low gas
- low mock-token balance
- self-mint success and failure
- approve required and skipped
- deposit success and failure
- pending confirmation
- matched receipt
- refresh recovery
- help and static fallback
- desktop and mobile layout
- console and page error checks

### 13.4 On-Chain Readiness

Deployment smoke rechecks:

- chain ID
- token, vault, and rail bytecode
- configured selector and addresses
- Standard RPC receipt behavior
- GIWA explorer links

The final fresh-wallet rehearsal requires a human wallet approval checkpoint. Codex does not handle user wallet signing material.

## 14. Demo And Submission Package

### 14.1 Ninety-Second Demo

| Time | Content |
| --- | --- |
| 0-10 seconds | problem: a click is not GIWA action evidence |
| 10-20 seconds | public app and wallet connection |
| 20-35 seconds | target, amount, spender, and allowance preview |
| 35-50 seconds | actual approve and deposit |
| 50-65 seconds | Standard RPC confirmation and verifier match |
| 65-78 seconds | receipt hash, transaction hash, and explorer |
| 78-90 seconds | partner KPI value and GIWA Wallet placement path |

Block waiting may be edited for video pacing, but copy must not imply instant finality or fabricated transaction speed.

### 14.2 Submission Links And Evidence

The first-read package contains:

1. public `/user` URL
2. ninety-second demo video
3. verified example receipt
4. GIWA explorer deposit link
5. partner evidence surface
6. one-page product explanation
7. exact source commit
8. one-page technical architecture
9. verification summary
10. explicit current limitations

The narrative order is:

```text
problem
-> why GIWA
-> one user action
-> verification mechanism
-> partner value
-> implementation evidence
-> GIWA Wallet placement path
```

## 15. Delivery Sequence

| Date | Exit result |
| --- | --- |
| 2026-07-22 | design and scope freeze |
| 2026-07-23 | provenance, safe scans, and repository verification green |
| 2026-07-24 | staging participant boundary and run capability complete |
| 2026-07-25 | readiness, mock-token preparation, and progressive user flow complete |
| 2026-07-26 | integration verification and fresh local wallet rehearsal complete |
| 2026-07-27 | Lightsail release and local proxy smoke complete |
| 2026-07-28 | domain, HTTPS, external smoke, and fresh staging run complete |
| 2026-07-29 | UX polish, responsive QA, and evidence refresh complete |
| 2026-07-30 | video, submission copy, final rehearsal, and commit freeze complete |
| 2026-07-31 | contingency buffer and submission |

If schedule pressure occurs, optional presentation polish is reduced before any primary acceptance criterion.

## 16. Human Checkpoints

Codex performs repository analysis, design, implementation, automated verification, deployment preparation, and evidence assembly. The user remains responsible for actions that require external human authority:

- approval before dependency installation if a new dependency becomes necessary
- approval before git push
- Lightsail account access and spending authority
- domain and DNS authority
- runtime value placement through an approved channel
- wallet connection and transaction approval
- final staging exception, release, and submission decisions

## 17. Final Scope Decision

The selected approach is an evaluator-executable hybrid MVP:

- fresh reviewer wallet execution is the primary proof
- matched local verifier receipts are the primary live result
- existing IntentRail chain evidence demonstrates the complete recorded rail event path
- recorded static evidence is the reliability fallback
- production hardening remains a later phase

Implementation must preserve the public product name `GIWA Verified Intent Rail`, the testnet-only boundary, and the distinction between non-final fast feedback and Standard RPC block confirmation.

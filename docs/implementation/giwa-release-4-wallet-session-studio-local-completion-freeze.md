# GIWA Release 4 Wallet Session Studio Local Completion Freeze

Date: 2026-08-01

## Completion boundary

Release 4 is locally complete for the application-defined EIP-191 Owner
challenge, eight-hour server session, organization-backed auth storage, and
read-only `/studio` slice. Existing public proof routes and partner-token
authority remain separate. No Git integration, protected CI result, hosted
configuration, staging migration, deployment, DNS/HTTPS change, real-wallet
approval, real-wallet signature, network switch, or chain transaction is implied.

The public product name remains `GIWA Verified Intent Rail`. The experience is
limited to GIWA Sepolia testnet and mock assets. It does not claim real funds, real yield, RWA issuance, settlement, KYC, identity, phishing prevention, security, or finality.

Open registration, membership or role-management UI, campaign creation or
mutation, Receipt history, analytics, PostgreSQL, mainnet, real assets, and real
rewards are outside this slice. Any campaign/role product expansion requires a
separately reviewed Release 4 design.

## Locally completed surface

- One canonical, strictly parsed EIP-191 `personal_sign` message binds the
  normalized wallet, exact Studio URI and Origin, GIWA Sepolia chain ID `91342`,
  issued/expiry times, and a five-minute one-time challenge.
- The service caps verification attempts, verifies the recovered signer and
  current active Owner membership, atomically consumes a challenge, and issues
  a fixed eight-hour session without sliding renewal.
- Only SHA-256 nonce and session-token hashes are stored. Session recovery joins
  the current member and organization state; logout revokes the token hash.
- Memory and SQLite repositories share the same organization, membership,
  challenge, session, replay, revocation, expiry, and tenant-isolation behavior.
- Migration `008_studio_wallet_auth` adds four auth tables, their unique and
  covering indexes, and membership/session foreign keys without rewriting
  existing live evidence.
- The HTTP boundary enforces exact methods and paths, exact same-Origin auth
  POSTs, generic authentication failure copy, bounded auth rate limits, and a
  `HttpOnly`, `SameSite=Lax`, `Path=/` session cookie. Hosted mode additionally
  requires `Secure` and no cookie `Domain` is set.
- `/studio` passively recovers a session and does not request a wallet on load.
  User-triggered actions are limited to connect, GIWA Sepolia network switch,
  EIP-191 signature, and sign out. The authenticated card is read-only.
- Wallet-session authority is not accepted by existing partner-token routes.

## Verification evidence

Commands were run from the repository root after the Release 4 implementation
and before these documentation-only changes:

| Check | Result |
| --- | --- |
| `pnpm --filter @giwa/web test -- studioAuthMessage studioAuthRepository studioAuthConfig studioAuthService studioAuthApi studioAuthRuntimeContract studioPresentation liveStore liveSchemaMigrations liveRoutePolicy liveRateLimit liveHealth protocolDossierPresentation landingRouting publicCopyGuard` | PASS — 16 files, 183 tests |
| `pnpm --filter @giwa/web test` | PASS — 102 files, 815 tests |
| `pnpm typecheck` | PASS — web, protocol, and contracts |
| `pnpm test` | PASS — web 815, protocol 29, contracts 21 tests; 865 total |
| `pnpm build` | PASS — web export/typecheck, protocol typecheck, contracts build/typecheck |

### Local auth API smoke

The live adapter ran in local mock mode from an explicit temporary workspace and
SQLite path. The isolated copy excluded `.env*`, `.git`, `.data`, and dependency
contents; only the dependency junction was shared, and server readiness reported
no loaded environment files. A deterministic test account was derived in a
one-off process and used only for local EIP-191 message signing.

The observed sequence was:

```text
challenge 200 -> verify 200 -> session 200 -> logout 204 -> authenticated:false
```

The message, signature, cookie, raw token, signer material, Owner address, and
environment contents were not printed. The smoke used no browser wallet,
provider, RPC, network-switch request, or chain transaction. The server was
stopped, its listener closed, and the validated temporary database/workspace
was removed.

### Browser matrix

The local `/studio` surface was inspected with the browser-client workflow at
`320×720`, `390×844`, `1366×768`, and `1440×1024`. A temporary browser-only QA
harness in the isolated copy imported the unchanged checked-in `studio.js`; it
added no repository route, source backdoor, or production fixture. It supplied
only a public fake projection and an ephemeral EIP-1193 provider stub.

At all four viewports the following seven states were inspected:

- loading completion to the disconnected gate;
- wallet unavailable;
- wrong network;
- authenticated organization card;
- session expired;
- access denied;
- retryable service error.

All 28 state/viewport combinations reported `scrollWidth <= clientWidth`. Every
visible link or button in the measured set was at least 44px high, and no target
was below 44px in either dimension. Keyboard Tab focus produced the configured
3px solid focus outline at each viewport. Only `Connect wallet`,
`Switch network`, and `Sign out` appeared as state actions; no campaign mutation
control appeared.

The provider stub recorded zero calls during passive boot. After the explicit
Connect action it recorded only `eth_requestAccounts` and `eth_chainId`, then
rendered the wrong-network gate; it did not sign, switch a real wallet, or send
a transaction. The application-origin console recorded zero warnings and zero
errors. Chrome-extension-origin warnings were outside the application result.

A `683×384` layout viewport, equivalent to the CSS-pixel pressure of
`1366×768` at 200% zoom, remained overflow-free with 44px targets for the
disconnected, authenticated, and expired states. The loaded stylesheet exposed
one `prefers-reduced-motion: reduce` media rule that disables transitions. The
QA host preference itself was not enabled, so the rule was verified through the
loaded CSSOM and the presentation source contract rather than an operating-system
preference change.

## Migration and preservation evidence

The focused store/schema tests freshly proved the exact migration
`008_studio_wallet_auth`, checksum validation, exact columns and indexes,
membership/session foreign keys, SQLite persistence, atomic replay behavior,
and rollback on migration failure. The legacy-upgrade fixture reopened a store
without migration 008, installed the additive auth schema, and compared the
pre-existing Receipt and public-evidence records unchanged, including their
Receipt, Intent, and transaction hashes.

No auth migration or browser fixture was applied to a retained local or hosted
database. The only Task 9 SQLite file was disposable and was removed after the
smoke and browser checks.

## Remaining gates

- The work remains an unstaged, uncommitted local change set; no source freeze
  commit has been selected.
- Protected CI has not evaluated this exact source state.
- No public deployment, staging migration, DNS/HTTPS work, hosted runtime
  configuration, video capture, or submission freeze has occurred.
- Hosted readiness still requires an explicit organization ID, at least one
  valid Owner address, and the exact approved HTTPS public Origin through the
  controlled server-only configuration mechanism.
- Real wallet connection, authentication signature, network switching, and any
  testnet chain action remain separate explicit human approval gates.
- Any later rollout remains governed by
  `docs/implementation/giwa-gasok-staging-runbook.md`, including backup-before-
  migration, migration 008 readiness, cookie/Origin smoke, and additive rollback
  checks.

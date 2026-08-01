# GIWA Release 4 Wallet Session and Read-Only Studio Design

## Status

Approved section by section by the user on 2026-08-01.

This document refines the first vertical slice of Release 4 from
`2026-07-31-giwa-full-platform-evolution-design.md`. It authorizes a local
implementation plan after user review. It does not authorize Git publication,
deployment, cloud changes, contract deployment, wallet transactions, or chain
transactions.

## Decision

Implement the smallest complete Release 4 participation boundary:

```text
wallet connect
-> five-minute EIP-191 challenge
-> signature and Owner membership verification
-> eight-hour server session
-> read-only /studio organization card
-> server-side logout
```

The wallet-session path is additive. Existing public evaluator routes and the
legacy partner-token authentication path remain available and unchanged. The
new session may be represented by the shared internal authentication context,
but no existing partner API begins accepting it until a later release slice
explicitly grants that route-level authority.

## Goals

1. Prove that one configured partner Owner can enter an organization-scoped
   Studio using a wallet signature rather than a bearer credential.
2. Establish replay-resistant challenge, cookie-session, membership, and
   tenant-storage primitives for later Release 4 capabilities.
3. Preserve all completed Release 1-3 behavior and public evidence.
4. Keep the first Studio surface read-only so authentication can be verified
   independently of campaign mutations.

## Non-Goals

This slice does not add:

- open registration or first-wallet organization claiming;
- member invitations or role-management UI;
- campaign creation, editing, publishing, or deletion;
- partner mutations authenticated by wallet sessions;
- wallet-linked Receipt history;
- analytics dashboards;
- PostgreSQL, hosted deployment, DNS, or infrastructure changes;
- SIWE compliance claims;
- mainnet, real assets, real rewards, RWA issuance, settlement, KYC, identity,
  phishing prevention, or security guarantees.

## Existing Boundaries to Preserve

- Public participant, Receipt, Campaign, and Proof routes remain unauthenticated
  where they are public today.
- Existing `x-giwa-partner-token` authentication continues to protect its
  current routes.
- The existing `tenantId` remains the organization data-partition key.
- Existing Manifest, verifier-input, Receipt, and public-evidence hashes remain
  byte-for-byte valid.
- Static evaluator routes continue to operate independently of the live
  adapter.
- No local ignored runtime data becomes public release evidence.

## Route Boundary

The first slice adds the authenticated Studio gate and four authentication
endpoints:

```text
GET  /studio
POST /api/auth/challenge
POST /api/auth/verify
GET  /api/auth/session
POST /api/auth/logout
```

`/studio` may serve the unauthenticated sign-in shell, but it must not render
organization data until `GET /api/auth/session` returns an authenticated
session. This preserves a direct sign-in route without making protected data
public.

The existing route classifier gains an explicit authentication route class.
The auth endpoints do not silently inherit local partner-token bypass or
partner-route authorization. Unknown auth paths fail closed.

## Authentication Approach

### Application-defined EIP-191 challenge

Use an application-defined `personal_sign` message. The product and code must
not label it as a complete SIWE implementation.

The server is authoritative for every challenge field:

- application domain derived from the configured public origin;
- exact Studio URI derived from that origin;
- expected normalized wallet address;
- GIWA Sepolia chain ID `91342`;
- cryptographically random one-time nonce;
- issued-at timestamp;
- five-minute expiration timestamp;
- human-readable statement explaining that this is authentication and not a
  transaction.

The message has one canonical formatter and one strict parser. Verification
rejects duplicated, missing, reordered, unknown, or non-canonical fields. The
server does not accept a client-supplied domain, URI, chain ID, statement, or
expiration.

An illustrative message is:

```text
GIWA Verified Intent Rail authentication request

Wallet: 0x...
Statement: Sign in to the Loop organization Studio. This does not submit a transaction or spend funds.
URI: https://example.test/studio
Domain: example.test
Chain ID: 91342
Nonce: ...
Issued At: ...
Expiration Time: ...
```

The implementation owns the exact byte format. Tests use the production
formatter rather than maintaining a second message template.

### Challenge lifecycle

1. The browser obtains an account only after the user selects `Connect wallet`.
2. It checks `eth_chainId` and offers a user-triggered GIWA Sepolia switch when
   needed.
3. It requests a challenge for the selected wallet.
4. The server validates the address, generates the canonical message, stores
   only the nonce hash and verification metadata, and returns the message.
5. The browser requests `personal_sign` only after a separate or continuing
   user action; it never signs automatically on page load.
6. The browser submits the challenge ID, exact message, and signature.
7. The server strictly parses the message, compares its metadata and nonce hash
   to the stored challenge, and recovers the signer.
8. The server verifies an active Owner membership for the recovered wallet.
9. In one transaction, the server consumes the unused challenge and creates
   the session. A concurrent replay loses the single-use update and fails.

Challenge creation does not reveal whether the requested wallet is a member.
Verification returns the same public failure code for an invalid signature,
unknown member, inactive member, or wrong organization.

### API contracts

Challenge request:

```json
{
  "walletAddress": "0x..."
}
```

Challenge success:

```json
{
  "challengeId": "challenge_...",
  "message": "...",
  "expiresAt": "2026-08-01T00:05:00.000Z"
}
```

Verification request:

```json
{
  "challengeId": "challenge_...",
  "message": "...",
  "signature": "0x..."
}
```

Verification success sets the session cookie and returns the same public-safe
session projection used by session recovery:

```json
{
  "authenticated": true,
  "organization": {
    "id": "tenant_default",
    "displayName": "Loop"
  },
  "member": {
    "walletAddress": "0xChecksumAddress",
    "role": "Owner"
  },
  "chainId": 91342,
  "expiresAt": "2026-08-01T08:00:00.000Z"
}
```

`GET /api/auth/session` returns the projection above for a valid session. For a
missing, expired, revoked, or no-longer-authorized session it clears any stale
cookie and returns:

```json
{
  "authenticated": false
}
```

`POST /api/auth/logout` is idempotent. When a valid cookie exists, the server
revokes the stored session before expiring the browser cookie. The response has
no organization or token material.

Malformed inputs receive `400`. Authentication failure receives a generic
`401`. Origin rejection receives `403`. Rate limiting receives `429`. Internal
failures return a request identifier without raw error, nonce, message,
signature, cookie, or token values.

## Session Security

- Generate session tokens from at least 32 cryptographically random bytes.
- Return the token only in a cookie and store only its SHA-256 hash.
- Compare token hashes with a timing-safe comparison.
- Expire sessions eight hours after creation; this slice does not implement a
  sliding expiration.
- Name the cookie `giwa_studio_session`, set `HttpOnly`, `SameSite=Lax`,
  `Path=/`, and omit `Domain`.
- Set `Secure` for every hosted environment. A non-Secure cookie is allowed
  only for an explicitly detected loopback development origin.
- Reject hosted configuration whose public origin is not HTTPS.
- Validate the exact configured public Origin on challenge, verification, and
  logout requests. Missing or mismatched Origin fails closed.
- Do not derive organization access from a request body, query string, header,
  wallet provider state, or cookie payload. It comes from the server-side
  session and active membership join.
- Re-check membership status and role on every authenticated session lookup.
  A disabled or demoted bootstrap Owner therefore loses access without waiting
  for session expiration.
- Use the existing privacy-safe rate-limit bucket utilities for challenge and
  verification attempts. Buckets must not retain raw IP addresses or wallet
  addresses.

Signatures are authentication evidence, not secrets, but they are still
excluded from application logs and telemetry to minimize retained data.

## Organization and Membership Model

The first slice supports the complete role vocabulary while provisioning only
Owners:

```text
Owner
Editor
Viewer
```

`Editor` and `Viewer` have no Studio entry path in this slice. Their records are
defined now so later slices do not require a role-schema migration.

Wallet addresses are validated as EVM addresses and stored in one normalized
lowercase form for uniqueness. Public responses use checksum formatting. The
same wallet may belong to different organizations in the future, so uniqueness
is `(organizationId, walletAddress)` rather than global wallet uniqueness.

The internal wallet-session authentication context contains:

```text
actorId          normalized wallet address
tenantId         organization ID
mode             wallet-session
organizationRole Owner | Editor | Viewer
sessionId        opaque server-side session identity
```

This context is not accepted by existing partner routes in the first slice.
The distinction prevents the addition of authentication from accidentally
granting mutation authority.

## Storage Design

Add four records to both the in-memory and SQLite store contracts.

### `organizations`

```text
id           text primary key; identical to the existing tenantId
displayName  text not null
createdAt    ISO timestamp
updatedAt    ISO timestamp
```

### `organization_members`

```text
memberId             text primary key
organizationId       foreign key -> organizations.id
walletAddress        normalized address
role                 Owner | Editor | Viewer
status               active | disabled
provisioningSource   bootstrap-config
createdAt             ISO timestamp
updatedAt             ISO timestamp
unique (organizationId, walletAddress)
```

### `auth_challenges`

```text
challengeId      text primary key
expectedWallet   normalized address
nonceHash        unique SHA-256 hash
origin           exact configured origin
uri              exact configured Studio URI
chainId          integer constrained to 91342
issuedAt         ISO timestamp
expiresAt        ISO timestamp
usedAt           nullable ISO timestamp
attemptCount     non-negative integer
createdAt        ISO timestamp
```

### `auth_sessions`

```text
sessionId     text primary key
tokenHash     unique SHA-256 hash
memberId      foreign key -> organization_members.memberId
createdAt     ISO timestamp
expiresAt     ISO timestamp
revokedAt     nullable ISO timestamp
```

The session does not persist a role snapshot. Session reads join the current
member and organization records. Indexes cover token hash, challenge expiry,
session expiry, membership wallet lookup, and organization membership lookup.

Expired challenges and sessions are removed in bounded batches during normal
auth operations or an existing maintenance cycle. Cleanup is not required for
correct rejection: all reads independently check expiration and revocation.

## Migration and Bootstrap

Add a checksum-recorded, transactional migration after
`007_public_campaign_events`. It creates the four tables, constraints, and
indexes without changing existing run, Receipt, decision, or public-evidence
rows.

For each distinct tenant ID already present in tenant-scoped live records, the
migration or bootstrap inserts a matching organization record. The configured
default partner tenant receives the display name `Loop`; other discovered
tenant IDs receive a non-public administrative label. If no tenant-scoped data
exists, the configured default organization is still created.

The first-slice bootstrap inputs are:

```text
GIWA_LIVE_PARTNER_TENANT_ID          existing organization/tenant identity
GIWA_LIVE_STUDIO_ORGANIZATION_NAME  display name; defaults to Loop
GIWA_LIVE_STUDIO_OWNER_WALLETS      comma-separated Owner wallet addresses
GIWA_LIVE_PUBLIC_ORIGIN             authoritative domain and Studio URI origin
```

Owner wallet addresses are not secrets, but readiness and logs report only
validation state and counts, never the configured list. Hosted mode fails
closed when there is no valid Owner, the public origin is absent or non-HTTPS,
or the organization ID is invalid.

Bootstrap synchronization is transactional and authoritative only for members
whose `provisioningSource` is `bootstrap-config`:

- add or reactivate configured Owners;
- retain their Owner role;
- disable config-provisioned Owners removed from the list;
- never modify a future manually provisioned member;
- validate at least one configured Owner before applying hosted changes.

This preserves a future membership-management path without leaving removed
bootstrap wallets active.

## Read-Only Studio Experience

### Unauthenticated state

The sign-in gate contains:

- GIWA Verified Intent Rail product identity;
- `GIWA Sepolia` and `Testnet` labels;
- one concise explanation of organization authentication;
- a `Connect wallet` primary action;
- a user-triggered `Switch network` action when needed;
- explicit copy that signing does not submit a transaction, spend funds, or
  require gas.

No wallet request, network switch, or signature prompt occurs on page load.
Passive session recovery occurs first. A valid cookie restores the Studio even
if the wallet extension is currently disconnected.

### Authenticated state

Show one read-only organization card containing:

- organization display name;
- checksum wallet address;
- role;
- GIWA Sepolia network;
- absolute session-expiration time;
- `Sign out` action.

Do not render campaign controls, empty analytics, member management, or future
feature placeholders as if they are working.

### State model

The UI explicitly represents:

```text
loading
wallet-unavailable
disconnected
wrong-network
challenge-loading
signature-pending
verifying
authenticated
session-expired
access-denied
retryable-error
```

Rejected wallet access, rejected network switch, and rejected signature remain
distinct user-facing states. Authentication failure does not reveal whether
the wallet is registered. Retry never loops or reopens the wallet without a
new user action.

Status changes use an appropriate live region without moving keyboard focus.
Interactive targets remain at least 44px, focus-visible remains perceptible,
and content reflows without horizontal page overflow from 320px through the
existing desktop widths and at 200% zoom. Reduced-motion users receive stable
terminal states immediately. The Release 3 Dossier shell, self-hosted
Pretendard, and approved line-icon family are reused.

## Failure and Recovery Behavior

| Condition | Server behavior | Studio behavior |
|---|---|---|
| Wallet provider absent | No auth request | Explain that a compatible wallet is required |
| Wrong chain | Do not issue a misleading authenticated state | Offer user-triggered network switch |
| Challenge expired | Generic `401` | Return to connect/sign action |
| Message changed | Generic `401`; increment bounded attempt count | Show authentication failed |
| Nonce replay | Generic `401` | Require a fresh challenge |
| Signer differs from expected wallet | Generic `401` | Show authentication failed |
| Wallet is not an active Owner | Generic `401` | Show access denied without membership detail |
| Origin missing or wrong | `403` | Show request could not be completed |
| Session expired or revoked | Clear cookie; unauthenticated session projection | Return to sign-in gate |
| Membership disabled | Clear cookie; unauthenticated session projection | Return to sign-in gate |
| Store unavailable | `500` with request ID | Show retryable service error |

## Threat Model

This slice explicitly addresses:

- challenge replay through hashed, expiring, atomically consumed nonces;
- message substitution through strict canonical parsing and stored metadata;
- signer substitution through recovered-address comparison;
- session database disclosure through hashed random tokens;
- cross-site mutation through exact Origin checks and SameSite cookies;
- tenant override through server-derived organization context;
- membership enumeration through generic verification failure;
- stale authorization through per-request membership checks;
- raw identifier retention in rate limits through hashed buckets.

This is a bounded authentication design, not a general wallet-security,
phishing-prevention, identity, or custody guarantee.

## Verification Strategy

### Pure authentication tests

- canonical format/parse round trip;
- domain, URI, chain, wallet, issued-at, and expiration binding;
- valid signature recovery using a deterministic test account;
- malformed, reordered, duplicated, unknown, or altered message fields;
- expired challenge, replay, signer mismatch, and invalid signature;
- random-token and hash behavior without snapshotting secrets.

### Store contract tests

Run the same behavior suite against memory and SQLite stores:

- organization and normalized membership creation;
- duplicate membership rejection;
- cross-organization membership isolation;
- challenge single-use atomicity;
- session lookup, expiration, revocation, and membership disablement;
- bounded expired-record cleanup;
- bootstrap add, retain, disable, and last-configured-Owner validation.

### Migration tests

- upgrade a representative schema through migration `007` into the new schema;
- confirm all existing rows and public hashes remain unchanged;
- create organizations for existing tenant IDs without rewriting those IDs;
- verify tables, foreign keys, uniqueness constraints, indexes, migration ID,
  and checksum;
- reopen the migrated database idempotently.

### API and route tests

- happy-path challenge, verification, cookie, session recovery, and logout;
- cookie attributes and eight-hour fixed expiration;
- no token in response bodies, logs, or telemetry;
- missing/wrong Origin and hosted non-HTTPS rejection;
- generic failure response for invalid signature and unknown membership;
- challenge and verification rate limits;
- wallet session rejected by legacy partner routes in this slice;
- existing partner credential and public route behavior unchanged.

### Browser checks

- configured Owner signs in and sees only the expected organization card;
- refresh restores a valid session without a wallet prompt;
- logout and expired session return to the gate;
- provider missing, wrong network, rejected signature, access denied, and
  retryable service states;
- keyboard operation, focus-visible, live-region behavior, reduced motion,
  200% zoom, and no horizontal overflow at representative mobile and desktop
  widths.

### Completion gate

The slice is complete only when:

1. all focused authentication, store, migration, API, and Studio tests pass;
2. the complete web test suite passes;
3. repository type checking and build pass;
4. the final diff contains no token, nonce, signature, private key, environment
   value, or local runtime evidence;
5. legacy public and partner-token flows remain green;
6. implementation documentation records that deployment and Git publication
   remain unresolved approval gates.

## Rollout and Rollback Boundary

Implementation is local-only until separately authorized. The database change
is additive: older code may ignore the new tables, and rollback must not drop
them or delete authentication records automatically. Hosted enablement requires
valid origin, organization, and Owner configuration plus the existing staging
runbook gates.

No implementation step may deploy the application, change DNS, provision cloud
resources, submit a wallet transaction, deploy a contract, stage files, create
a commit, push a branch, or open a pull request without explicit user direction.

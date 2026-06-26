# GIWA Lightsail Env And Credential Injection Preflight

## Scope

This Sprint 52 document records the staging runtime contract without values. It does not request, print, store, or validate runtime values. It does not read local env files.

The goal is to make a later host setup reviewable while keeping server-only runtime material out of repository files, public assets, logs, screenshots, docs, and chat.

## Injection Method Gate

A later deployment sprint must choose one approved injection method:

| Method | Acceptable for first staging | Required control |
| --- | --- | --- |
| host-local runtime file | yes, if permissions and ownership are approved | outside repo, readable only by service user and operator group |
| systemd drop-in | possible | values excluded from committed unit file |
| managed credential store | later approval only | provider, owner, audit path, and rotation process recorded |
| shell export during manual session | no | shell history and process leaks are too easy |

Sprint 52 does not choose a final method.

## Server-Only Variable Names

The following names are server-only and must not appear with values in public assets or evidence:

```text
HOST
PORT
GIWA_LIVE_MODE
GIWA_LIVE_DB_PATH
GIWA_LIVE_ALLOWED_ORIGINS
GIWA_LIVE_PARTNER_TENANT_ID
GIWA_LIVE_PARTNER_CREDENTIAL_HASHES
GIWA_SEPOLIA_RPC_URL
GIWA_EXPLORER_TX_URL_TEMPLATE
GIWA_EXPLORER_ADDRESS_URL_TEMPLATE
CAMPAIGN_SIGNER_PRIVATE_KEY
INTENT_SUBMITTER_PRIVATE_KEY
VERIFIER_PRIVATE_KEY
```

These names may appear in docs as contract labels. Their values must not appear in committed files or public output.

## Public-Safe Fields

The following categories are public-safe when they contain only already-public or static display data:

```text
product name
chain id 91342
public transaction hash
public block number
public block hash
public receipt hash
public route path
static snapshot hash
local-advisory evidence path
bounded status code
```

Public-safe fields still require copy review so they do not imply protected CI, release approval, or external deployment.

## Runtime Readiness Output

Readiness output may include:

```text
variable name
set or missing
category label
length only where useful
public derived address where the value is a signing role and derivation is already approved
sanitized host/path presence for URLs
```

Readiness output must not include:

```text
raw runtime values
query tokens
authorization material
wallet signing material
complete provider URLs with sensitive query strings
local env file content
```

## Host File Permissions Draft

If a host-local runtime file is approved later:

```text
path: /etc/giwa/giwa-live.runtime
owner: giwa
group: giwa
mode: 0600
committed: false
included in artifact manifest: false
included in public evidence: false
```

Operators must create or rotate this file outside the repository and outside chat.

## Preflight Checklist

- variable names reviewed
- server-only/public-safe boundary accepted
- injection method approved
- redacted readiness format approved
- log review confirms no runtime values
- screenshots exclude terminal output with runtime values
- public artifact scan passes
- rollback removes or disables the runtime file if host access changes

## Current Result

Blocked. No injection method is approved and no runtime values are requested by Sprint 52.

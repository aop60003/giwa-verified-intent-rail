# GIWA Staging Security Boundary

## Auth and Tenant Gate

- `staging-testnet` has no local bypass.
- Partner credential hashes map to actor id, tenant id, and scopes.
- `GIWA_LIVE_PARTNER_TENANT_ID` is explicit and not defaulted.
- Tenant id comes from auth context only.
- Request body tenant overrides are rejected.
- Routes enforce scopes for run creation, run read, receipt read, verification request, and partner read.
- Cross-tenant run, receipt, queue, and partner list access tests pass.

Current Sprint 19 blocker: the local server maps configured partner credential hashes to generated ids and one shared tenant, and the tenant id can default locally. Staging requires an explicit credential-to-actor-to-tenant-to-scope mapping with no implicit tenant.

## Origin and CORS Decision

Choose one before staging dry run:

| Decision | Required result |
| --- | --- |
| Same-origin only | browser calls use same staging origin; no cross-origin headers needed |
| Allowlisted CORS | exact origins only, no wildcard, `Vary: Origin`, allowed methods and headers recorded |

Missing or unapproved browser origins fail closed.

Current Sprint 19 blocker: staging needs an explicit origin policy, including the decision for preflight handling when allowlisted CORS is selected. Empty allowlists cannot silently disable origin checks for public binding.

## Request and Rate Gate

- POST requests require JSON content type.
- Request bodies remain bounded.
- Malformed JSON fails before handler invocation.
- Non-object POST bodies are rejected.
- Rate limits exist for source, credential, tenant, wallet, and verification path.
- Pre-auth source limiting protects invalid credential attempts.
- In-memory limits are local-only unless the operator records explicit staging acceptance.

Current Sprint 19 blockers:

- missing JSON content type must fail closed for POST requests
- invalid credential attempts need pre-auth source limiting
- body parsing must not bypass the auth/rate posture
- tenant and wallet rate buckets need staging evidence
- in-memory rate state is not multi-instance staging evidence

## Receipt Access Gate

Receipt access is allowed only when:

- run status is `matched`
- verifier decision is `matched`
- failure reason is absent
- receipt and decision hashes match
- intent hash links run, decision, and receipt
- receipt payload is a JSON object
- `verifierInputHash` recomputes
- `receiptHash` recomputes
- tenant access is authorized

All locked states return bounded `receipt_not_found` without payload details.

Current Sprint 19 blocker: public receipt errors must not reveal internal gate reason details in staging responses.

## Public Surface Gate

Browser files, public snapshots, and partner packets may show only public chain fields, public hashes, bounded verifier state, and public routes. They must not expose signed manifest internals beyond the approved preview, server-only runtime values, raw local config, or credential material.

Current Sprint 19 blockers:

- live snapshot export selects latest matched local run and is not a tenant-scoped staging export
- staging export needs an allowlisted schema plus artifact checksums
- public artifact guard remains a scan layer, not the only boundary

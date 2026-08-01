# Live Public Receipt Route Design

**Date:** 2026-07-23
**Status:** Approved for implementation

## Problem

The completed GIWA Sepolia flow produces a verifier-matched live Receipt at
`/user/receipt/[receiptHash]`, but the linked technical route
`/receipt/[receiptHash]` only compares the requested hash with the committed
`flow-data.json` fixture. A newly generated live Receipt is therefore shown as
unavailable even though `/api/receipts/[receiptHash]` returns the matched
evidence.

## Goals

- Render a live public Receipt only when the live receipt API returns a valid
  matched projection for the requested hash.
- Preserve the committed fixture Receipt used by the static evaluator fallback.
- Keep unknown, malformed, pending, mismatched, and failed hashes fail-closed
  without exposing run details.
- Preserve the current `/receipt/[receiptHash]` URL and public evidence role.

## Non-goals

- Changing the user-facing `/user/receipt/[receiptHash]` route.
- Changing verifier, database, manifest, or contract behavior.
- Adding a new API route, framework, dependency, or server-rendering layer.
- Publishing local runtime data as committed evidence.

## Approaches Considered

1. **Live API first with fixture fallback - selected.** The public route queries
   `/api/receipts/[receiptHash]`, renders a normalized matched response, and
   falls back to the existing fixture only when the requested hash matches that
   committed fixture. This preserves both staging and static evaluator flows.
2. **Redirect to the user Receipt.** This is smaller but removes the distinct
   technical public evidence projection and makes the existing link misleading.
3. **Server-render the public Receipt.** This provides a strong route boundary
   but is unnecessary for the dependency-light web application and broadens the
   change into server routing and template work.

## Design

`apps/web/public/flow.js` will detect `/receipt/[receiptHash]` before loading the
default fixture-only page. It will:

1. Decode and validate the route hash as a 32-byte hex value.
2. Fetch `/api/receipts/[receiptHash]` with `cache: "no-store"`.
3. Accept the response only when:
   - the HTTP response is successful;
   - `receiptHash` exactly matches the normalized route hash;
   - `payload.status` is `matched`;
   - the public receipt fields needed by the technical projection pass bounded
     type and format checks.
4. Render the live technical Receipt using only the normalized public response.
5. If the live lookup is not matched, load `flow-data.json` and retain the
   existing fixture gate.
6. If neither live nor fixture evidence matches, render the current locked,
   non-enumerating state.

The live projection will show the same bounded evidence categories already used
by the route: Receipt status and hash, deposit transaction and block evidence,
Manifest target/asset/amount, confirmation depth, and verifier input hash.
It will retain the testnet-only and no-real-asset copy.

## Error Handling And Safety

- Network errors, non-JSON responses, oversized or malformed fields, hash
  mismatches, and non-matched statuses all resolve to the existing locked state.
- Raw API errors, stack traces, run capabilities, credentials, and local
  database details are never rendered.
- The fixture remains an explicit fallback and cannot authorize a different
  requested hash.
- No wallet request or chain transaction is introduced by this change.

## Tests

Add focused regression coverage that proves:

- the public route attempts the live receipt API for a valid receipt hash;
- a valid matched live response is accepted and rendered;
- malformed, hash-mismatched, and non-matched live responses remain locked;
- a matching committed fixture still opens when live lookup is unavailable;
- an unknown hash remains non-enumerating and shows no run details.

Run the focused web tests first, followed by the web type check and build because
`flow.js` is a public evaluator surface.

## Success Criteria

- The newly generated live Receipt opens successfully at its
  `/receipt/[receiptHash]` link.
- The existing committed fixture Receipt still opens.
- Unknown and unverified receipt hashes remain locked.
- No new dependency, generated evidence mutation, or public claim is introduced.

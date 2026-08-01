# GIWA Public Verification Bundle Guide

This guide explains how a third party can inspect a matched
`GIWA Verified Intent Rail` Receipt on GIWA Sepolia without a participant
capability, partner credential, private API, database connection, or RPC call.
The bundle is public evidence for one testnet-only mock-vault action.

## Find the matched proof

Open the public Proof Ledger at `/evidence` and paste exactly one of these
32-byte hashes:

- the Receipt hash;
- the Intent hash;
- the mock-vault deposit transaction hash.

Each accepted form resolves to the same `identity.receiptHash`. The response
also labels which hash form matched. A malformed, unknown, pending, mismatched,
or private record returns the bounded not-found state and does not reveal a run
identifier, capability, session identifier, or private failure trace.

## Download the JSON bundle

Use **Download verification bundle JSON** from the Receipt or Proof Ledger.
The download is a JSON attachment with a server-chosen filename derived only
from the matched Receipt hash. The downloaded object is the immutable bundle
used by the public view; it is not a request dump or a private runtime export.

The bundle includes:

- the canonical Manifest, signature, signing domain, and recovered signer;
- the canonical verifier input and its hash;
- Standard RPC verification-time block and receipt evidence;
- allowlisted decoded `Approval`, `Transfer`, and `MockDeposit` logs when
  applicable;
- the canonical matched Receipt and its hash;
- the three-hash public identity and replay metadata.

## Replay independently

From a checkout of this repository with dependencies installed, run:

```powershell
pnpm --filter @giwa/web evidence:replay -- <bundle.json>
```

Replace `<bundle.json>` with the path to the downloaded file. The replay reads
only that JSON file. It does not connect to SQLite, GIWA RPC, a wallet, a
participant endpoint, or a private API.

Success requires all six checks:

| Check | What it recomputes or compares |
| --- | --- |
| `manifestHash` | Canonicalizes the signed Manifest, recomputes its Intent hash, and compares it with the bundle identity. |
| `manifestSignature` | Recovers the EIP-712 signer and verifies the fixed GIWA Sepolia signing domain and recorded recovered signer. |
| `verifierInputHash` | Canonicalizes the verifier input and recomputes its hash. |
| `decodedLogHash` | Hashes the allowlisted decoded log snapshot and compares it with the verifier input. |
| `receiptHash` | Canonicalizes the Receipt payload and recomputes its Receipt hash. |
| `crossReferences` | Requires the Manifest, verifier input, block snapshot, decoded logs, Receipt, and three public hashes to describe the same action. |

Treat any failed check or malformed bundle as **not independently verified**.
A Matched badge in the interface does not replace this replay.

## Evidence boundaries

The block number, block hash, transaction receipt status, head block, and
confirmation depth are Standard RPC evidence captured at verification time.
They are not a claim of GIWA finality or settlement. The bundle also makes no
claim of real asset issuance and no claim of real funds, yield, RWA issuance, KYC service,
phishing prevention, or a security guarantee.

The controlled `TARGET_MISMATCH` example is deliberate: its Manifest expects
one target while the controlled demonstration uses another. The verifier emits
no Matched Receipt, so exact-hash public Receipt lookup remains unavailable.
This is a recorded negative control, not an incident, exploit, asset loss, or
failed live transaction.

## Campaign Studio metric definitions

Campaign Studio reports the fixed `gasok-demo` campaign and
`first-mock-vault-deposit` mission. Its definitions are:

- **Submitted deposits**: campaign/mission runs with a persisted submitted
  deposit transaction record.
- **Matched Receipts**: the complete set of submitted actions whose stored
  decision, verifier input, and Receipt pass the public commercial evidence
  gate. The count is computed before the latest-20 display limit.
- **Proof Ledger rows**: the latest 20 gate-passed Matched Receipts whose
  persisted public bundle also passes the same exact-hash public lookup and
  replay checks used by `/receipt/:hash`. A legacy Matched Receipt can remain
  in the aggregate count without advertising a public link until its bundle is
  safely backfilled.
- **Matched rate**: **Matched Receipts / submitted deposits**. The numerator
  is `matchedReceiptCount`; the denominator is `submittedDepositCount`. A
  captured denominator of zero displays `0%`.
- **Unique participants**: distinct normalized participant wallets among runs
  with a persisted submitted deposit transaction.
- **Repeat activators**: distinct normalized wallets with more than one gated
  Matched Receipt.
- **Repeat activations**: for each repeat activator, Matched Receipts after the
  first, summed across participants.
- **Approval required / not required**: submitted deposits separated by whether
  an approval transaction hash was recorded; confirmed approval count also
  requires a later compatible run status.
- **Mismatch reasons**: bounded reason-code counts from mismatched or failed
  decisions for the fixed campaign and mission.
- **Unique campaign visitors / wallet-connect sessions**: distinct
  privacy-hashed anonymous sessions for the corresponding fixed event. If event
  capture is unavailable, the UI shows unavailable rather than estimating; if
  capture is available with no events, it shows `0`.

Campaign metrics are testnet operational evidence, not settlement, identity,
KYC, asset, yield, or security metrics.

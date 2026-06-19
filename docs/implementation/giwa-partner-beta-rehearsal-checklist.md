# GIWA Partner Beta Rehearsal Checklist

## Pre-Rehearsal

- [ ] Partner owner recorded.
- [ ] Technical contact recorded.
- [ ] Incident contact recorded.
- [ ] Pilot window recorded.
- [ ] Campaign id recorded.
- [ ] Mission id recorded.
- [ ] GIWA Sepolia chain id `91342` confirmed.
- [ ] One mock vault deposit action selected.
- [ ] Target, selector, mock token, amount, spender, max allowance, and expiry recorded.
- [ ] Fallback path selected.
- [ ] Closeout date recorded.
- [ ] Unsupported public positioning rejected.

## Local Environment

- [ ] Local live port selected.
- [ ] Static fallback port selected.
- [ ] Isolated local DB path selected.
- [ ] Listener ownership checked.
- [ ] `/healthz` checked.
- [ ] `/readyz` checked.
- [ ] `/api/demo/status` checked.
- [ ] Readiness output is redacted.
- [ ] Stale server response understood.
- [ ] Stale DB response understood.

## Reviewer Opening Order

- [ ] Open `http://127.0.0.1:4190/demo`.
- [ ] Open `http://127.0.0.1:4190/live`.
- [ ] Open dynamic receipt API only after `matched`.
- [ ] Open `http://127.0.0.1:4176/`.
- [ ] Open `http://127.0.0.1:4176/partner`.
- [ ] Open `http://127.0.0.1:4176/partner-snapshot.json`.

## Live Action Review

- [ ] Browser wallet connected by user.
- [ ] GIWA Sepolia `91342` confirmed.
- [ ] Manifest issued.
- [ ] Target reviewed.
- [ ] Selector reviewed.
- [ ] Asset reviewed.
- [ ] Amount reviewed.
- [ ] Spender reviewed.
- [ ] Max allowance reviewed.
- [ ] Expiry reviewed.
- [ ] Intent hash reviewed.
- [ ] Approve transaction hash recorded when present.
- [ ] Deposit transaction hash recorded.
- [ ] Verification requested only after deposit transaction hash exists.
- [ ] Receipt stayed locked before verifier `matched`.

## Evidence Packet Acceptance

- [ ] Run id present.
- [ ] Wallet public address present.
- [ ] Deposit transaction hash present.
- [ ] Standard RPC receipt status present.
- [ ] Block number present.
- [ ] Block hash present.
- [ ] Confirmation depth present.
- [ ] `intentHash` present.
- [ ] `verifierInputHash` present.
- [ ] `receiptHash` present.
- [ ] Receipt payload parses.
- [ ] `verifierInputHash` recomputes.
- [ ] `receiptHash` recomputes.
- [ ] Flashblocks appears only as non-final feedback.
- [ ] Static partner snapshot is labeled recorded fallback when used.

## Dynamic Receipt Gate

- [ ] Run status is `matched`.
- [ ] Verifier decision is `matched`.
- [ ] Failure reason is absent.
- [ ] Chain id is `91342`.
- [ ] Receipt hash links to decision.
- [ ] Intent hash links run, decision, and receipt.
- [ ] Unknown receipt returns locked or not found.
- [ ] Timeout state stays locked.
- [ ] Mismatched state stays locked.
- [ ] Failed state stays locked.
- [ ] Missing decision stays locked.
- [ ] Replay mismatch stays locked.

## Static Fallback

- [ ] Static `/` returns HTTP 200.
- [ ] Static `/partner` returns HTTP 200.
- [ ] Static `/partner-snapshot.json` returns HTTP 200.
- [ ] Recorded receipt route returns expected static receipt when checked.
- [ ] Fallback is labeled recorded GIWA Sepolia testnet evidence.
- [ ] Fallback is not described as fresh live evidence.

## Incident Drill

- [ ] Stale server response recorded.
- [ ] Stale DB response recorded.
- [ ] Unknown receipt response recorded.
- [ ] Unmatched decision response recorded.
- [ ] RPC or explorer issue response recorded.
- [ ] Read-only fallback response recorded.
- [ ] Incident packet contains only public or redacted fields.
- [ ] Receipt/export remains locked for non-matched states.

## Closeout

- [ ] Feedback form completed from real reviewer or operator notes.
- [ ] Closeout report completed.
- [ ] Evidence quality recorded.
- [ ] Failure summary recorded.
- [ ] Partner understanding recorded.
- [ ] Sprint 19 blockers recorded.
- [ ] Repeat, improve, or stop recommendation selected.
- [ ] Public hosting remains blocked.
- [ ] Staging deployment remains blocked.
- [ ] No fake partner feedback recorded.
- [ ] No fake evidence recorded.
- [ ] No fake rehearsal success recorded.

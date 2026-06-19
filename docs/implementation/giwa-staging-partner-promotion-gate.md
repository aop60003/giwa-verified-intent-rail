# GIWA Staging Partner Promotion Gate

## Partner Promotion Criteria

All criteria must be green:

- partner intake completed
- one campaign and one mission frozen
- one GIWA Sepolia mock vault action frozen
- evidence packet accepted
- partner feedback captured from real reviewer or operator-led dry run
- closeout report completed
- reviewer signoff recorded
- incident owner named
- retention owner named
- staging blockers have owners and evidence

## Go No-Go Checklist

Go only when:

- receipt access remains locked unless run and verifier are `matched`
- public artifacts include only allowed public evidence fields
- static fallback is labeled recorded GIWA Sepolia testnet evidence
- incident and fallback drills pass
- Sprint 19 blocker register is closed
- partner understands matched-only receipt, public chain evidence, and Flashblocks non-final feedback

No-go when:

- CI or source provenance is missing
- public artifact scan fails
- any non-matched state unlocks receipt
- partner asks for unsupported production-finance, identity-service, phishing-prevention, or safety-warranty positioning
- scope expands beyond one partner, one campaign, one mission, one action, and one evidence packet
- any flow asks for wallet signing material or raw local configuration values

## Promotion Evidence Packet

The promotion packet must link:

- partner intake and action freeze
- rehearsal checklist
- feedback form
- closeout report
- evidence packet acceptance
- dynamic receipt API result when matched
- static fallback result
- incident drill result
- staging blocker register

External partner signoff is not present in the current Sprint 19 state, so promotion remains blocked.

## Sprint 33 Billing-Lock Boundary

Sprint 33 adds one automatic no-go:

```text
protectedCI=blocked-billing-lock
```

Partner beta or staging promotion remains blocked while protected CI is red, skipped, or blocked before runner steps. Sprint 33 can rehearse partner review controls locally, but it cannot route partner traffic to a public staging host or present local advisory output as release authority.

Post-billing promotion still requires one partner, one campaign, one mission, one GIWA Sepolia mock vault action, one evidence packet, reviewer signoff, incident owner, retention owner, protected artifact metadata, and an updated blocker register.

# GIWA Verified Intent Rail Acceptance Checklist

This checklist records the current acceptance matrix for the single GIWA Sepolia mock vault flow and the local-advisory handoff package.

| Case | Verifier fixture or source | UI expected state | Partner summary | Evidence field |
| --- | --- | --- | --- | --- |
| Happy path | `packages/contracts/fixtures/chain-evidence/giwa-sepolia-anchor.json` | Receipt ready, route enabled | One matched row, 100% matched tx rate | `status=matched`, `receipt.receiptHash` |
| Wrong network | `apps/web/src/lib/flow/guidedFlow.test.ts` mutates chain id | Wallet actions blocked, receipt route locked | No new partner row | `network.chainId` versus deployment chain id |
| No test token | Live wallet precondition | Wallet action cannot complete | Excluded until deposit tx exists | `walletActions.deposit.status` |
| Expired manifest | Verifier branch in `verifyDeposit.ts` | Receipt locked | Excluded from matched count | `failureReason=EXPIRED` |
| Mismatched target | Verifier branch in `verifyDeposit.ts` | Receipt locked | Excluded from matched count | `failureReason=TARGET_MISMATCH` |
| Mismatched spender | Verifier branch in `verifyDeposit.ts` | Receipt locked | Excluded from matched count | `failureReason=SPENDER_MISMATCH` |
| Allowance above manifest bound | Verifier branch in `verifyDeposit.ts` | Receipt locked | Excluded from matched count | `failureReason=ALLOWANCE_EXCEEDED` |
| Failed deposit | `apps/web/src/lib/verifier/verifyDeposit.test.ts` reverted receipt mutation | Receipt locked | Excluded from matched count | `failureReason=TX_FAILED` |
| Missing signer or signer mismatch | `apps/web/src/lib/verifier/verifyManifestSigner.test.ts` | Receipt locked | Excluded from matched count | `official_signer_mismatch` |
| Duplicate verification | `apps/web/src/lib/verifier/verifyDeposit.test.ts` receipt store case | Existing receipt remains stable | Dedupe keeps one matched row | `receiptHash` unchanged |
| Guest verified-state path | `apps/web/src/lib/flow/guidedFlow.test.ts` | Guest state is read-only and ungated | Included as fixture row | `receipt.payload.verifiedState=guest` |
| Unavailable verified-state path | Receipt payload schema supports unavailable | Guest path remains ungated when unavailable | Included only after matched receipt | `verifiedState=unavailable` |
| Flashblocks timeout or absence | Status rail fast feedback step | Standard RPC block confirmation remains the final source | Not counted as final confirmation | `confirmation.flashblocksExcludedFromFinalConfirmation=true` |
| Live manifest issuance | `POST /api/runs` on GIWA Sepolia `91342` | Signed manifest preview visible | Appears in live partner API row | `status=manifestIssued` |
| Live deposit submitted | Browser wallet returns public approve/deposit hashes | Verify action enabled, receipt still locked | Excluded from matched count until verifier match | `status=depositSubmitted` |
| Live verifier matched | `POST /api/runs/:runId/verify` with standard RPC evidence | Dynamic receipt API link visible | Counted as one matched live row | `status=matched`, `decisionTxHash=null` |
| Live verifier mismatch | Verifier branch returns `mismatched` or `failed` | Receipt remains locked with failure reason | Excluded from matched count | `failureReason` present |
| Live DB incompatible schema | `apps/web/src/lib/live/liveStore.test.ts` nullable decision guard | Server fails closed before rehearsal | No live row created | `decisions.decisionTxHash` nullable check |
| Live snapshot export | `pnpm --filter @giwa/web --fail-if-no-match export:live-demo` after matched run | Public snapshot available | Snapshot contains one matched live run | `docs/evidence/live-demo-sprint12-snapshot.json` |
| Fresh wallet rehearsal | `apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite` | Live flow and dynamic receipt API open on port `4190` | One matched fresh live run | `receiptHash=0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8` |
| Commercial receipt gate | `evaluateCommercialReceiptGate` | Receipt opens only for matched run, matched decision, and matching receipt | Public receipt evidence | receipt route locked otherwise |
| Bounded API errors | `toLiveApiErrorBody` | Raw provider, storage, and RPC messages are not returned | Safer local API behavior | unknown errors map to `internal_error` |
| Request body limit | `serve-live.mjs` | Oversized or malformed API body fails before handler | Safer local API behavior | no raw request body logging |
| Snapshot commercial gate | `buildLiveDemoSnapshot` | Export succeeds only for gate-passed matched receipt | Commit-safe live snapshot | no synthetic evidence |
| Hosted blocker list | commercial readiness gate doc | External hosting remains blocked until auth, tenant, rate, request, logging, and storage gates exist | Sprint 14+ routing | local-only Sprint 13 |
| Hosted ops release gate | `docs/implementation/giwa-hosted-ops-runbook.md` | Release checks exclude wallet action and chain-operation commands | Hosted beta remains blocked until gate passes | no public hosting from local advisory mode |
| Hosted ops fresh rehearsal | hosted ops and partner beta runbooks | Isolated rehearsal proves health, readiness, matched receipt, replay, snapshot, and fallback | Rehearsal evidence packet only after gate pass | static fallback used when live readiness blocks |
| Partner beta rehearsal package | `docs/implementation/giwa-partner-beta-rehearsal-runbook.md` | Reviewer opening order is explicit for live, dynamic receipt, and static fallback surfaces | Partner feedback is captured only from observed review | rehearsal checklist and closeout report |
| Partner evidence packet acceptance | `docs/implementation/giwa-partner-beta-rehearsal-checklist.md` | Receipt opens only after matched local verifier decision | Evidence packet accepted only after hash and snapshot checks | matched receipt hash and live snapshot SHA256 |
| Partner feedback closeout | `docs/implementation/giwa-partner-beta-feedback-form.md` | Feedback form separates understanding, evidence quality, and friction | Closeout report records open blockers without inventing approval | reviewer signoff fields |
| Sprint 19 staging blocker register | `docs/implementation/giwa-partner-beta-closeout-report.md` | Staging remains blocked until repo, CI, hosting, storage, credential handling, and runbook gates are resolved | Partner beta can close without public hosting | blocker status table |
| Sprint 19 staging preparation package | `docs/implementation/giwa-staging-deployment-preparation.md` | Public binding remains blocked while staging blockers are open | Staging preparation is document-only | staging blocker register |
| Sprint 19 source provenance gate | `docs/implementation/giwa-staging-release-provenance.md` | Git-backed source exists, but protected CI remains blocked | Local checks are advisory until protected CI passes | `.git=True`, `.github=True`, `checkRuns=0` on current main |
| Sprint 38 local readiness handoff | `docs/evidence/staging-readiness-sprint38-handoff.json` | Hosted adapter contract and staging simulation stay local-advisory | Partner packet can review local readiness only | `releaseGrade=false`, `canUnblockStaging=false` |
| Sprint 39 partner handoff readiness | `docs/evidence/commercial-readiness-sprint39-final-handoff.json` | Final demo, partner packet, and blocker register are refreshed | External partner signoff remains absent | `authority=local-advisory` |
| Sprint 40 local readiness freeze | `docs/evidence/commercial-readiness-sprint40-freeze.json` | Current `main` has zero check-runs, locked receipts are bounded, and public copy/scans are hardened | Partner packet remains local-advisory only | `releaseGrade=false`, `canUnblockStaging=false` |
| Sprint 41 partner/customer handoff | `docs/evidence/partner-customer-handoff-sprint41.json` | First-read handoff package, demo order, receipt mode separation, and blocker state are aligned | Partner/customer review can start locally only | `partnerCustomerHandoffPackage=local-advisory-finalized`, `commercialReadiness=blocked` |
| Sprint 42 hosted adapter boundary | `docs/evidence/hosted-adapter-commercial-boundary-sprint42.json` | Hosted storage, migration, backup, queue, rate, origin, tenant, logging, and failure blockers are stateful | Managed infrastructure remains unconnected | `commercialReadiness=blocked`, `externalConnectionAllowed=false` |
| Sprint 43 external blocker handoff | `docs/evidence/staging-handoff-sprint43-external-blockers.json` | Remaining blockers are monitorable with resume and stop conditions | Safe internal work is frozen until external state changes | `commercialReadyLocalHandoffFreeze=true`, `remainingInternalSafeTrackWork=none-known` |
| Sprint 19 storage and restore gate | `docs/implementation/giwa-staging-storage-and-restore.md` | Local SQLite and memory queues stay local-only | Hosted storage remains blocked | restore drill required |
| Sprint 19 security and observability gates | `docs/implementation/giwa-staging-security-boundary.md` and `docs/implementation/giwa-staging-observability.md` | Staging requires auth, tenant, origin, rate, readiness, request id, and alert gates | Partner API remains blocked until gates pass | bounded public errors |
| Incident read-only fallback | `docs/implementation/giwa-incident-response.md` | GET-only fallback stays available while POST actions are blocked | Recorded evidence remains reviewable | no new live receipt during incident |
| Evidence retention policy | `docs/implementation/giwa-evidence-retention-policy.md` | Raw rehearsal data and public snapshots have separate retention rules | Public snapshots are retained after scans | public chain data cannot be deleted by the app |

## Final Acceptance Notes

- The final submission evidence records one completed chain run.
- Fresh live rehearsal records a second matched wallet-run snapshot for final local review.
- Negative and boundary cases are covered by verifier branches and focused unit tests where implemented.
- The partner console is populated from fixture evidence and labels rows by source.
- No browser route asks for, stores, or displays private key material.
- Live snapshot export fails closed when no matched live run exists.
- Sprint 17 hosted ops documents define release, incident, retention, and partner beta gates without launching public hosting.
- Sprint 18 adds the partner rehearsal runbook, checklist, feedback form, and closeout report while keeping staging deployment blocked.
- Sprint 19 adds staging preparation documents and confirms source provenance, CI, host, storage, security, observability, rollback, and partner promotion blockers before any staging dry run.
- Sprint 39 refreshes final demo and partner handoff documents while keeping protected CI, artifact metadata, partner signoff, hosting approval, and managed infrastructure blocked.
- Sprint 40 freezes the local readiness package while keeping protected CI, artifact metadata, branch protection satisfaction, release approval, partner signoff, hosting approval, and managed infrastructure blocked.
- Sprint 41 finalizes the partner/customer handoff package and evidence while keeping the package local-advisory, not release-grade, and not staging-authorizing.
- Sprint 42 hardens the hosted adapter commercial boundary while keeping all managed infrastructure unconnected.
- Sprint 43 freezes the external blocker monitoring and staging handoff state. No further internal safe-track work is known until protected CI, artifact metadata, branch protection, partner/customer signoff, hosting approval, managed infrastructure approval, or release approval changes state.

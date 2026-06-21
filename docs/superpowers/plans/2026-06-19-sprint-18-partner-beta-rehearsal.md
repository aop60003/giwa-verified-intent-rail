# Sprint 18 Partner Beta Rehearsal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run and document a controlled `GIWA Verified Intent Rail` partner beta rehearsal before any staging deployment. Sprint 18 proves that one partner can be guided through intake, local live review, evidence packet acceptance, incident fallback, feedback capture, and closeout while public hosting remains blocked.

**Architecture:** Sprint 18 sits on top of Sprint 17 hosted operations runbooks. It uses the existing local live server, `/demo` control room, static fallback, matched-only receipt gate, standard RPC verifier evidence, live snapshot export, and partner evidence packet. It is an operations rehearsal and documentation sprint, not a code, deploy, infrastructure, or chain-action sprint.

**Tech Stack:** Markdown runbooks, existing local Node HTTP smoke checks, existing public evidence JSON, existing static and live demo surfaces, existing GIWA Sepolia testnet evidence, and existing package verification commands. No dependency installation is allowed in Sprint 18.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-17-hosted-ops-and-partner-beta.md`
- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-partner-beta-runbook.md`
- `docs/implementation/giwa-incident-response.md`
- `docs/implementation/giwa-evidence-retention-policy.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-mvp-demo-script.md`
- `docs/implementation/giwa-mvp-acceptance-checklist.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`

## Parallel Read-Only Analysis Summary

Eight read-only perspectives inform this plan:

- Partner onboarding and intake: freeze one partner, one campaign, one mission, one GIWA Sepolia mock vault action, one matched-only receipt flow, and one evidence packet before rehearsal starts.
- Demo rehearsal flow: open `/demo`, `/live`, matched dynamic receipt API, static fallback, `/partner`, and `/partner-snapshot.json` in that order; stale live state switches to recorded fallback.
- Evidence packet and receipt acceptance: accept only public wallet, transaction, block, hash, receipt, replay, and snapshot evidence; receipt opens only after verifier `matched`.
- Security and privacy boundary: public artifacts and partner packets must exclude raw env contents, credential values, auth headers, tokenized URLs, server-only config, and wallet signing material.
- Hosted ops readiness: keep `local`, `staging-testnet`, and `prod-testnet` boundaries; public host binding remains blocked until a later approved deployment plan.
- Incident and fallback response: stale server, stale DB, wrong receipt, unmatched decision, RPC outage, and export issues move the rehearsal to read-only fallback and incident packet capture.
- Partner feedback and closeout: collect intake, funnel, evidence quality, failure summary, partner understanding, unresolved risks, and repeat-or-stop recommendation.
- Staging deployment blockers: `.git` and `.github` can be absent, so CI provenance, branch protection, artifact promotion, durable storage, backup/restore, incident ownership, and partner signoff remain Sprint 19 prerequisites.

## Sprint 18 Boundary

Allowed:

- Create or update partner rehearsal markdown artifacts.
- Run local/read-only checks against existing local servers and static assets.
- Start local servers only for rehearsal if the operator chooses a local port and isolated DB path.
- Record public run ids, public wallet addresses, public transaction hashes, block numbers, block hashes, `intentHash`, `verifierInputHash`, `receiptHash`, and public snapshot paths.
- Capture partner feedback and closeout evidence.
- Update runbooks to link the rehearsal artifacts.

Not allowed:

- Sprint 18 product implementation, hosted infrastructure code, public hosting, deployment, or external managed infrastructure.
- Connecting production DB, managed DB, or external credential services.
- Reading or printing real env file contents.
- Printing credential values, wallet signing material, raw auth material, tokenized RPC URLs, or tokenized service URLs.
- Server or script wallet transaction sending.
- Running `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, verifier-chain commands, or mint commands.
- Installing dependencies.
- Advancing into Sprint 19 staging deployment work.
- Treating Flashblocks as final confirmation.
- Adding production asset, production yield, production fund movement, payment-finality, identity-service, phishing-prevention, or safety-warranty claims.

## Planned File Structure

Create during Sprint 18 execution:

```text
docs/implementation/giwa-partner-beta-rehearsal-runbook.md
docs/implementation/giwa-partner-beta-feedback-form.md
docs/implementation/giwa-partner-beta-closeout-report.md
```

Modify during Sprint 18 execution only when needed for links and opening order:

```text
README.md
docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md
docs/implementation/giwa-partner-beta-runbook.md
docs/implementation/giwa-hosted-ops-runbook.md
docs/implementation/giwa-commercial-readiness-gate.md
docs/implementation/giwa-live-mvp-runtime-gate.md
docs/implementation/giwa-mvp-runbook.md
docs/implementation/giwa-mvp-demo-script.md
docs/implementation/giwa-mvp-acceptance-checklist.md
docs/implementation/giwa-mvp-submission-evidence.md
```

Do not modify app, protocol, contract, deployment, live store, verifier, wallet, or public asset code in Sprint 18 unless a broken documentation link points to a renamed static artifact.

---

## Task 1: Sprint 18 Boundary and Routing

### Files

- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `README.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `docs/implementation/giwa-partner-beta-runbook.md`

### Failing Doc Check

- [ ] Add checks that fail until Sprint 18 is discoverable from the index and runbooks.

```powershell
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-18-partner-beta-rehearsal.md" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Sprint 18 Partner Beta Rehearsal" -Quiet
Select-String -Path docs\implementation\giwa-mvp-runbook.md -Pattern "Sprint 18 Partner Beta Rehearsal" -Quiet
```

Expected red state:

```text
At least one check returns False before Sprint 18 execution links the rehearsal plan.
```

### Writing Direction

- Add Sprint 18 after Sprint 17 in the sprint index.
- State that Sprint 18 is partner rehearsal and blocker review before staging deployment.
- Keep public hosting blocked.
- Keep the recorded static fallback and local live path as the rehearsal surfaces.
- Add links to the Sprint 18 rehearsal artifacts only after they exist.

Suggested index row:

```markdown
| 18 | `2026-06-19-sprint-18-partner-beta-rehearsal.md` | controlled partner beta rehearsal, evidence packet acceptance, fallback drill, feedback, closeout, and Sprint 19 staging blockers | Sprint 17 approval |
```

### Passing Command

```powershell
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "2026-06-19-sprint-18-partner-beta-rehearsal.md" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-runbook.md -Pattern "Sprint 18 Partner Beta Rehearsal" -Quiet
Select-String -Path docs\implementation\giwa-mvp-runbook.md -Pattern "Sprint 18 Partner Beta Rehearsal" -Quiet
```

### Exit Condition

```text
Sprint 18 is discoverable as a partner rehearsal sprint, not a staging deployment sprint, and all linked docs preserve local-only and testnet-only boundaries.
```

## Task 2: Partner Intake and Kickoff Packet

### Files

- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-partner-beta-feedback-form.md`
- `docs/implementation/giwa-partner-beta-runbook.md`

### Failing Doc Check

- [ ] Add checks that fail until the partner rehearsal packet has intake, kickoff, and scope acknowledgement fields.

```powershell
Test-Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md
Test-Path docs\implementation\giwa-partner-beta-feedback-form.md
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Partner Intake Freeze" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Kickoff Gate" -Quiet
```

Expected red state:

```text
The new Sprint 18 rehearsal docs do not exist before this task is implemented.
```

### Writing Direction

Create a partner intake freeze checklist with these fields:

```markdown
## Partner Intake Freeze

| Field | Required Result |
| --- | --- |
| Partner name | recorded |
| Partner owner | recorded |
| Technical contact | recorded |
| Incident contact | recorded |
| Pilot window | recorded |
| Campaign id | one value |
| Mission id | one value |
| Referral, QR, or link metadata | recorded or explicitly absent |
| Expected traffic | bounded estimate |
| Rate-limit expectation | bounded estimate |
| Rehearsal date | recorded |
| Fallback path | static fallback path selected |
| Closeout date | recorded |
```

Create an action config freeze:

```markdown
## Action Configuration Freeze

- Chain: GIWA Sepolia `91342`
- Action: one mock vault deposit
- Target:
- Selector:
- Mock token:
- Amount:
- Spender:
- Max allowance:
- Expiry or TTL:
```

Require acknowledgement that:

- browser wallet owns user signing
- server stores only public transaction hashes
- public evidence may include public wallet and chain evidence
- static fallback is recorded GIWA Sepolia testnet evidence
- Sprint 18 does not start public traffic or staging deployment
- unsupported commercial, identity, or safety positioning stops the rehearsal

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Partner Intake Freeze" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Action Configuration Freeze" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-feedback-form.md -Pattern "Partner Understanding Check" -Quiet
```

### Exit Condition

```text
The rehearsal cannot begin until partner identity, contacts, campaign, mission, one action config, fallback path, and scope acknowledgement are recorded.
```

## Task 3: Local Rehearsal Environment and Stale State Preflight

### Files

- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`

### Failing Doc Check

- [ ] Add checks that fail until the preflight covers local port, isolated DB, stale listener, stale DB, and redacted readiness.

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Local Rehearsal Preflight" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Stale Server Response" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Stale DB Response" -Quiet
```

Expected red state:

```text
Checks return False until the Sprint 18 rehearsal runbook is created.
```

### Writing Direction

Document local-only preflight:

```powershell
Get-NetTCPConnection -LocalPort 4190,4176 -State Listen
Get-Process -Id <OwningProcess>
```

Operator-selected local live state:

```powershell
$env:GIWA_LIVE_DB_PATH="apps/web/.data/live-mvp-partner-beta-rehearsal.sqlite"
$env:PORT="4190"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Read-only smoke against the running local server:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/demo
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/readyz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4190/api/demo/status
```

Rules:

- Do not stop an unknown listener automatically.
- If the running server points at stale state, ask the operator to restart on the intended port and isolated DB path.
- If an older matched row hides readiness or schema problems, fail the rehearsal and use a fresh DB path.
- If schema compatibility fails closed, do not mutate the DB in Sprint 18; restart with isolated rehearsal state.
- `/healthz` and `/readyz` must be bounded and redacted.

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Local Rehearsal Preflight" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "GIWA_LIVE_DB_PATH" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Stale Server Response" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Stale DB Response" -Quiet
```

### Exit Condition

```text
The rehearsal starts from a known local port and isolated state, and stale server or stale DB state cannot be mistaken for fresh partner evidence.
```

## Task 4: Reviewer Opening Order and Local Live Rehearsal

### Files

- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-mvp-demo-script.md`
- `docs/implementation/giwa-mvp-runbook.md`

### Failing Doc Check

- [ ] Add checks that fail until the exact reviewer opening order and human-owned wallet action boundary are documented.

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Reviewer Opening Order" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Human-Owned Wallet Actions" -Quiet
```

Expected red state:

```text
The Sprint 18 rehearsal runbook lacks the opening order before this task is implemented.
```

### Writing Direction

Use this opening order:

```text
1. http://127.0.0.1:4190/demo
2. http://127.0.0.1:4190/live
3. http://127.0.0.1:4190/api/receipts/<matchedReceiptHash>
4. http://127.0.0.1:4176/
5. http://127.0.0.1:4176/partner
6. http://127.0.0.1:4176/partner-snapshot.json
```

Human-owned live action script:

```text
1. Connect browser wallet.
2. Confirm GIWA Sepolia chain id 91342.
3. Issue the signed manifest preview.
4. Review target, selector, asset, amount, spender, max allowance, expiry, and intent hash.
5. Submit approve and deposit from the wallet app.
6. Select Verify receipt.
7. Open the displayed dynamic receipt API after matched.
```

Boundary:

- Server and scripts must not send wallet actions.
- If live wallet, faucet, RPC, DB, or hosted policy blocks review, switch to the static fallback.
- Static fallback must be labeled recorded GIWA Sepolia testnet evidence, not a fresh live run.

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "http://127.0.0.1:4190/demo" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Human-Owned Wallet Actions" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "recorded GIWA Sepolia testnet evidence" -Quiet
```

### Exit Condition

```text
Partner reviewers have a deterministic URL order, and wallet actions remain browser-wallet owned during the live path.
```

## Task 5: Evidence Packet and Dynamic Receipt Acceptance

### Files

- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-partner-beta-closeout-report.md`
- `docs/implementation/giwa-mvp-submission-evidence.md`

### Failing Doc Check

- [ ] Add checks that fail until evidence packet and dynamic receipt acceptance rules exist.

```powershell
Test-Path docs\implementation\giwa-partner-beta-closeout-report.md
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Evidence Packet Acceptance" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Dynamic Receipt Acceptance" -Quiet
```

Expected red state:

```text
The closeout report and acceptance sections do not exist before this task is implemented.
```

### Writing Direction

Accepted public evidence fields:

```markdown
## Evidence Packet Acceptance

- run id
- wallet public address
- approve transaction hash when present
- deposit transaction hash
- standard RPC receipt status
- block number
- block hash
- confirmation depth
- `intentHash`
- `verifierInputHash`
- `receiptHash`
- canonical manifest payload reference
- canonical verifier input payload reference
- canonical receipt payload reference
- live snapshot path
- partner snapshot path
```

Dynamic receipt acceptance:

```markdown
## Dynamic Receipt Acceptance

- run status is `matched`
- verifier decision is `matched`
- failure reason is absent
- receipt hash matches stored decision receipt hash
- intent hash links run, decision, and receipt
- receipt payload parses as JSON
- chain id is `91342`
- standard RPC receipt status and block data are the block-evidence source
- `verifierInputHash` recomputes
- `receiptHash` recomputes
- Flashblocks appears only as non-final feedback
```

Snapshot acceptance:

```powershell
Get-FileHash docs\evidence\live-demo-sprint12-snapshot.json -Algorithm SHA256
Get-FileHash apps\web\public\live-demo-snapshot.json -Algorithm SHA256
```

The two hashes must match for the selected live snapshot. Current fresh rehearsal snapshot hash was observed as:

```text
E6EDD7A6032FB4B7ABDF68AFFB2DC16CA5A306215D73594A273514FAF32059D6
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Evidence Packet Acceptance" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Dynamic Receipt Acceptance" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Evidence Quality" -Quiet
```

### Exit Condition

```text
Partner evidence is accepted only when matched receipt gates, standard RPC evidence, recomputed hashes, and public snapshot checks pass.
```

## Task 6: Security, Privacy, and Public Artifact Boundary

### Files

- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`

### Failing Doc Check

- [ ] Add checks that fail until the public artifact boundary and blocked data classes are documented.

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Public Artifact Boundary" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Blocked Data Classes" -Quiet
```

Expected red state:

```text
The Sprint 18 rehearsal runbook lacks public artifact boundary language before this task.
```

### Writing Direction

Public artifact boundary:

```markdown
## Public Artifact Boundary

Allowed in partner packet:

- public wallet address
- public transaction hashes
- block number and block hash
- `intentHash`
- `verifierInputHash`
- `receiptHash`
- bounded verifier decision
- public snapshot paths
- replay/recompute status

Blocked data classes:

- real env file contents
- credential values
- tokenized URLs
- raw auth headers
- raw request bodies
- browser local state
- wallet signing material
- server-only config values
- unbounded provider errors
```

Language guard:

```text
Use: manifest-matched GIWA Sepolia testnet action evidence.
Use: mock testnet deposit metrics.
Use: Flashblocks fast non-final feedback.
Avoid: production finance, identity-service, phishing-prevention, or safety-warranty positioning.
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Public Artifact Boundary" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Blocked Data Classes" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Flashblocks fast non-final feedback" -Quiet
```

### Exit Condition

```text
The partner packet cannot include raw local configuration, credential material, wallet signing material, or unsupported public claims.
```

## Task 7: Incident and Fallback Drill

### Files

- `docs/implementation/giwa-partner-beta-rehearsal-runbook.md`
- `docs/implementation/giwa-incident-response.md`
- `docs/implementation/giwa-hosted-ops-runbook.md`

### Failing Doc Check

- [ ] Add checks that fail until the rehearsal drill covers stale server, stale DB, wrong receipt, unmatched decision, and fallback.

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Incident and Fallback Drill" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Wrong Receipt Drill" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Unmatched Decision Drill" -Quiet
```

Expected red state:

```text
The Sprint 18 rehearsal runbook lacks incident drill steps before this task.
```

### Writing Direction

Document these drills:

| Drill | Expected response |
| --- | --- |
| Stale server | Use `/api/demo/status`, `/healthz`, and `/readyz`; do not stop unknown process automatically; restart only with operator intent. |
| Stale DB | Use isolated DB; if old rows hide readiness or schema state, fail rehearsal and restart with a fresh DB path. |
| Wrong receipt | Lock live path, receipt, and export; quarantine artifact; recompute hashes; rescan before sharing. |
| Unmatched decision | Keep receipt locked; group bounded failure reasons; replay standard RPC evidence. |
| Timeout | Keep non-terminal; do not issue receipt from timeout state. |
| RPC or explorer issue | Mark readiness degraded; block verification/export; use recorded static fallback. |
| Static fallback | Open `/`, `/receipt/<recordedHash>`, `/partner`, and `/partner-snapshot.json`; label as recorded testnet evidence. |
| Read-only fallback | Allow safe GETs only; block writes, verification POSTs, export, wallet action, and chain-operation commands. |

Incident packet fields:

```markdown
- incident id
- severity
- affected mode
- request ids
- run ids
- receipt hashes
- transaction hashes
- block number and block hash
- bounded failure reason
- redacted readiness state
- artifact paths and hashes
- owner and time window
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Incident and Fallback Drill" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Wrong Receipt Drill" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "recorded testnet evidence" -Quiet
```

### Exit Condition

```text
Every rehearsal failure path has a bounded response that locks receipts when needed and preserves static fallback review.
```

## Task 8: Partner Feedback and Closeout

### Files

- `docs/implementation/giwa-partner-beta-feedback-form.md`
- `docs/implementation/giwa-partner-beta-closeout-report.md`
- `docs/implementation/giwa-partner-beta-runbook.md`

### Failing Doc Check

- [ ] Add checks that fail until feedback and closeout fields exist.

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-feedback-form.md -Pattern "Partner Understanding Check" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Funnel Closeout" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Recommendation" -Quiet
```

Expected red state:

```text
The Sprint 18 feedback and closeout docs do not exist before this task.
```

### Writing Direction

Feedback form:

```markdown
# Partner Beta Rehearsal Feedback

## Partner Context

- Partner:
- Owner:
- Technical contact:
- Incident contact:
- Pilot window:
- Campaign id:
- Mission id:

## Opening Order Feedback

- `/demo` understood:
- `/live` understood:
- Dynamic receipt API understood:
- Static fallback understood:
- `/partner` understood:
- Snapshot understood:

## Partner Understanding Check

- Can explain participation versus manifest-matched testnet action evidence:
- Can explain why receipt requires verifier `matched`:
- Can explain Flashblocks as non-final feedback:
- Can explain public evidence fields:
- Confusing copy or UI:
```

Closeout report:

```markdown
# Partner Beta Rehearsal Closeout

## Funnel Closeout

- Entry opened:
- Wallet connected:
- GIWA readiness passed:
- Intent preview viewed:
- Manifest accepted:
- Approve submitted:
- Deposit submitted:
- Block confirmation observed:
- Verifier decision reached:
- Receipt issued:

## Evidence Quality

- `intentHash`:
- `depositTxHash`:
- block evidence:
- verifier status:
- `verifierInputHash`:
- `receiptHash`:
- replay/recompute result:
- snapshot/export result:

## Failure Summary

- wrong chain:
- no test token:
- rejected wallet action:
- timeout:
- mismatch:
- failed transaction:
- rate limited:
- bounded API error:

## Recommendation

- repeat campaign
- second testnet action template
- export improvement
- stop
```

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-feedback-form.md -Pattern "Partner Understanding Check" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Funnel Closeout" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Failure Summary" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Recommendation" -Quiet
```

### Exit Condition

```text
Sprint 18 captures partner comprehension, funnel evidence, failure summary, unresolved risks, and a repeat, improve, or stop recommendation.
```

## Task 9: Staging Deployment Blocker Register and Sprint 19 Gate

### Files

- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-hosted-ops-runbook.md`
- `docs/implementation/giwa-partner-beta-closeout-report.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`

### Failing Doc Check

- [ ] Add checks that fail until Sprint 19 blocker handoff is documented.

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Sprint 19 Staging Blockers" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Sprint 19 Staging Gate" -Quiet
```

Expected red state:

```text
The blocker register does not exist before Sprint 18 execution.
```

### Writing Direction

Create a blocker register with these categories:

```markdown
## Sprint 19 Staging Blockers

| Blocker | Required before Sprint 19 |
| --- | --- |
| Source provenance | git-backed workspace and protected CI path |
| Artifact promotion | checksum manifest with no rebuild between stages |
| Host policy | approved host, owner, origin policy, rollback path |
| Credential distribution | role-separated activation and rotation process |
| Auth and tenant isolation | fail-closed hosted mode |
| Request safety | body limits, bounded errors, rate limits |
| Storage | isolated durable state or approved staging adapter |
| Migration guard | fail-closed incompatible schemas |
| Backup/restore | backup catalog and restore drill evidence |
| Observability | request ids, redacted readiness, low-cardinality metrics, alert owners |
| Incident readiness | named owner and fallback drill pass |
| Partner signoff | intake, evidence packet acceptance, feedback, closeout |
```

Sprint 19 may begin only when:

- release gate passes
- static fallback gate passes
- live read-only smoke gate passes
- matched-only receipt gate passes
- verifier replay gate passes
- public artifact scan passes
- partner intake and closeout are approved
- incident drill is complete
- backup/restore owner is assigned
- staging target is approved by a separate plan

### Passing Command

```powershell
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Sprint 19 Staging Blockers" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Source provenance" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Sprint 19 Staging Gate" -Quiet
```

### Exit Condition

```text
Sprint 18 exits with a clear go/no-go list for Sprint 19 staging deployment preparation, while public hosting remains blocked until separately approved.
```

## Task 10: Final Safe Scans and Handoff

### Files

- `docs/superpowers/plans/2026-06-19-sprint-18-partner-beta-rehearsal.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/implementation/*.md`
- `README.md`

### Failing Doc Check

- [ ] Run required documentation scans after Sprint 18 execution docs are written.

```powershell
Test-Path docs\superpowers\plans\2026-06-19-sprint-18-partner-beta-rehearsal.md
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$claimPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("payment set" + "tled")
rg -n $docPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
rg -n $claimPattern docs\superpowers\plans docs\implementation README.md -g "*.md"
```

For sensitive-surface checks, avoid printing real env files. Use split local variables in PowerShell when documenting patterns that would otherwise match the plan itself:

```powershell
$surfacePattern = "private " + "key|mnem" + "onic|bear" + "er|api " + "key|sec" + "ret"
rg -n $surfacePattern docs\superpowers\plans\2026-06-19-sprint-18-partner-beta-rehearsal.md
```

Expected result:

```text
The Sprint 18 plan and changed docs contain no unfinished markers, no unsupported public claim, and no sensitive-surface wording except explicitly approved guardrail examples. Existing matches outside changed text must be reported as guardrail text, not new claims.
```

### Failure Confirmation Command

```powershell
Select-String -Path docs\superpowers\plans\2026-06-19-sprint-18-partner-beta-rehearsal.md -Pattern "public hosting|deploy:giwa|fund:giwa|anchor:giwa|verify:giwa|mint"
```

Expected result:

```text
Matches are allowed only in boundary, blocker, or not-allowed sections.
```

### Handoff Direction

Sprint 18 handoff must include:

- files changed
- commands run and results
- eight-perspective analysis summary
- partner intake summary
- reviewer opening order
- local live rehearsal result
- evidence packet acceptance result
- dynamic receipt API result
- fallback drill result
- partner feedback summary
- closeout recommendation
- staging blocker register
- safety confirmations
- unresolved risks
- next action

Sprint 18 approval block:

```text
Sprint 18 exit approval:
approvedBy=<user or role>
approvedAt=<YYYY-MM-DD>
evidencePath=docs/implementation/giwa-partner-beta-closeout-report.md
nextSprint=docs/superpowers/plans/2026-06-19-sprint-19-staging-deployment-preparation.md
```

### Passing Command

```powershell
Test-Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md
Test-Path docs\implementation\giwa-partner-beta-feedback-form.md
Test-Path docs\implementation\giwa-partner-beta-closeout-report.md
Select-String -Path docs\implementation\giwa-partner-beta-rehearsal-runbook.md -Pattern "Evidence Packet Acceptance" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-feedback-form.md -Pattern "Partner Understanding Check" -Quiet
Select-String -Path docs\implementation\giwa-partner-beta-closeout-report.md -Pattern "Sprint 19 Staging Blockers" -Quiet
```

### Exit Condition

```text
Sprint 18 is complete only when partner intake, local rehearsal, evidence packet acceptance, dynamic receipt acceptance, incident fallback, feedback, closeout, and Sprint 19 blockers are documented and reviewed without starting staging deployment.
```

---

## Sprint 18 Exit Gate

Sprint 18 is complete when:

- Partner intake and kickoff fields are frozen.
- One partner, one campaign, one mission, one GIWA Sepolia mock vault action, one matched-only receipt flow, and one evidence packet remain the scope.
- Reviewer opening order is documented and rehearsed.
- Local live rehearsal uses known local port and isolated state.
- `/healthz` and `/readyz` are redacted and bounded.
- Dynamic receipt API opens only for verifier `matched`.
- Evidence packet includes only public chain, receipt, hash, replay, and snapshot fields.
- Static fallback is available and labeled recorded GIWA Sepolia testnet evidence.
- Stale server, stale DB, wrong receipt, unmatched decision, timeout, and RPC issue drills are documented.
- Partner feedback and closeout report are captured.
- Sprint 19 staging blockers are listed with required owners and gates.
- No dependency is installed.
- No code implementation, public hosting, deployment, external managed infrastructure, or staging smoke is performed.
- No server/script wallet transaction is sent.
- No deploy, funding, anchoring, verifier-chain, or mint command is run.
- No real env file content is printed or content-scanned.
- Flashblocks remains fast non-final feedback only.

## Handoff

Sprint 18 handoff must include:

- created and modified files
- commands run and results
- eight-perspective analysis summary
- partner intake and kickoff status
- reviewer opening order
- local live URL and DB path when used
- dynamic receipt API path when matched
- evidence packet paths and snapshot hashes
- partner feedback and closeout summary
- incident/fallback drill result
- Sprint 19 staging blocker register
- confirmation that no implementation, deployment, public hosting, dependency installation, server/script wallet transaction, or chain-operation command was run
- unresolved risks
- next action:

```text
Write the Sprint 18 execution prompt for docs/superpowers/plans/2026-06-19-sprint-18-partner-beta-rehearsal.md.
```

Possible later Sprint 19 path, after Sprint 18 approval:

```text
docs/superpowers/plans/2026-06-19-sprint-19-staging-deployment-preparation.md
```

# GIWA External Blocker Monitoring and Staging Handoff

Sprint 43 freezes the local-advisory staging handoff and turns the remaining release blockers into monitorable external conditions. It does not dispatch protected CI, create public hosting, connect managed infrastructure, request wallet actions, run GIWA chain-operation package commands, install dependencies, or claim commercial readiness.

## Current Decision

```text
sprint=43
handoffInputMain=db9e6a8ec321f7d0223b49cb733c8b983698e3ae
authority=local-advisory
releaseGrade=false
commercialReadyLocalHandoffFreeze=true
commercialReadiness=blocked
stagingDryRunExecution=blocked
protectedCI=blocked-external-github-account
protectedArtifactMetadata=absent
branchProtectionSatisfaction=blocked-current-head-checks-absent
partnerCustomerSignoff=absent
externalHostingApproval=absent
managedInfrastructureApproval=absent
publicHosting=false
managedInfrastructureConnection=false
```

This is the final safe-track handoff state unless an external blocker changes. The local package is ready for review, but it is not a release, staging, hosting, partner traffic, managed infrastructure, or protected provenance approval.

## Evidence Packet

| Evidence | Path | SHA-256 |
| --- | --- | --- |
| Sprint 40 local readiness freeze | `docs/evidence/commercial-readiness-sprint40-freeze.json` | `768DC90A549D4838D22E9BA00C9FBDB2F3A06E7539B7033211D15F3E1F64304A` |
| Sprint 41 partner/customer handoff | `docs/evidence/partner-customer-handoff-sprint41.json` | `80A2EA69F9E4DB25B1CAD9C08B507E44211DA4B1102016ECF2E60F4297AD9E94` |
| Sprint 42 hosted adapter commercial boundary | `docs/evidence/hosted-adapter-commercial-boundary-sprint42.json` | `CEF54B9AE1F41BA6037C6822A7383BDA4D734B71EF95B26FE8FD92BEC617D594` |
| Sprint 43 external blocker handoff | `docs/evidence/staging-handoff-sprint43-external-blockers.json` | `D28B96DFCDB339EFBA75765AE69FBC38880BF4A4D6529C3633222CBA9E878A35` |

Open the handoff package first:

```text
docs/implementation/giwa-partner-customer-handoff-package.md
```

Then follow the local demo order:

```text
1. http://127.0.0.1:4190/demo
2. http://127.0.0.1:4190/live
3. http://127.0.0.1:4190/api/receipts/0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8
4. http://127.0.0.1:4176/
5. http://127.0.0.1:4176/partner
6. http://127.0.0.1:4176/partner-snapshot.json
```

Before opening the dynamic receipt API, confirm the local live server is using:

```text
GIWA_LIVE_DB_PATH=apps/web/.data/live-mvp-fresh-rehearsal-2.sqlite
PORT=4190
```

The reviewer should not be asked to connect a wallet or submit approve/deposit transactions unless a separate live rehearsal has been explicitly approved.

## Monitor Checklist

| Blocker | Current state | Monitor signal | Resume condition | Required evidence |
| --- | --- | --- | --- | --- |
| GitHub account runner startup | blocked | Billing and Actions UI | Account lock warning absent and workflow runner can queue or start | Screenshot or GitHub UI note, then one approved protected CI run |
| Protected CI required checks | blocked | Checks for exact current `main` SHA | Ten required checks pass on the selected source commit | Run id, head SHA, workflow name, check names, conclusions |
| Protected artifact metadata | blocked | Actions artifacts API | Staging-named artifact manifest, provenance report, sidecar, and upload metadata exist | Artifact ids, names, sizes, retention, source SHA binding |
| Branch protection satisfaction | blocked | Branch protection status | Required checks are enforced and passing on protected branch | Required-check configuration and passing contexts |
| Partner/customer signoff | absent | Signoff artifact | Reviewer identity, date, reviewed packet hash, reviewed URLs, receipt hashes, blocker acknowledgement, and no-release-approval attestation | Signed or recorded signoff packet |
| External hosting approval | absent | Hosting approval record | Host, origin policy, operator, rollback owner, observability, and stop conditions approved | Approval record with no public URL until deploy sprint |
| Managed infrastructure approval | absent | Infrastructure approval record | Durable DB, credential manager, backup target, queue design, restore owner, and connection plan approved | Approval record with no connection attempt |

## Protected CI Recovery Rule

Do not dispatch or rerun protected CI from this handoff. A future recovery run must:

1. Select the exact current `main` SHA at the time of recovery.
2. Confirm GitHub Billing and Actions UI no longer show an account lock or disabled workflow state.
3. Run the protected workflow once for that SHA.
4. Record all ten required checks.
5. Stop if the first job fails before runner logs, if any required check is skipped, if artifacts are zero, or if the run head SHA differs from the selected source.
6. Keep local-advisory and protected CI provenance separate.

## Partner Signoff Contract

A valid partner/customer signoff artifact must include:

- reviewer name or organization
- reviewer role
- review date
- reviewed handoff package path
- reviewed evidence paths and hashes
- reviewed local URLs
- dynamic live receipt hash `0x057b0c02076123b1f30ab374fe96e31d3b99ac03bbeda82d8fc97fbeffd74be8`
- recorded static receipt hash `0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503`
- acknowledgement that the packet is local-advisory only
- acknowledgement that signoff is not release approval, staging approval, public hosting approval, managed infrastructure approval, or protected CI approval

Do not fabricate this artifact. Record only a real reviewer response.

## Stop Conditions

Stop and do not proceed to another internal safe-track sprint when:

- protected CI remains blocked by the GitHub account gate
- partner/customer signoff is absent
- external hosting approval is absent
- managed infrastructure approval is absent
- protected artifact metadata is absent
- branch protection required checks are not satisfied
- release approval is absent
- all local-advisory demo, handoff, hosted adapter boundary, evidence, and scan work has passed

Stop immediately if any workflow asks for env-file contents, credential values, wallet signing material, public hosting, managed infrastructure connection, dependency installation, or GIWA chain-operation commands.

## Final Local Freeze

The safe-track state is now:

```text
localAdvisoryDemoPackage=complete
partnerCustomerHandoff=complete
hostedAdapterCommercialBoundary=complete-local-advisory
externalBlockerMonitoring=complete
commercialReadyLocalHandoffFreeze=true
commercialReadiness=blocked
stagingDryRunExecution=blocked
nextAction=wait-for-external-blocker-state-change
```

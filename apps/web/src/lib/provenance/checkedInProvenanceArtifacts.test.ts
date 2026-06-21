import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(process.cwd(), "../..");

function readWorkspaceText(path: string): string {
  return readFileSync(resolve(workspaceRoot, path), "utf8");
}

function readWorkspaceJson<T>(path: string): T {
  return JSON.parse(readWorkspaceText(path)) as T;
}

function sha256WorkspaceFile(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(workspaceRoot, path))).digest("hex");
}

describe("checked-in provenance and handoff artifacts", () => {
  it("keeps local provenance verification bound to the current report sidecar", () => {
    const sidecarHash = readWorkspaceText("docs/evidence/local-provenance-report.json.sha256").trim().split(/\s+/)[0];
    const reportHash = sha256WorkspaceFile("docs/evidence/local-provenance-report.json");
    const verification = readWorkspaceJson<{
      reportSha256: string;
      verificationDecision: string;
      releaseGrade: boolean;
      canUnblockStaging: boolean;
    }>("docs/evidence/local-provenance-verification.json");

    expect(reportHash).toBe(sidecarHash);
    expect(verification.reportSha256).toBe(sidecarHash);
    expect(verification.verificationDecision).toBe("pass");
    expect(verification.releaseGrade).toBe(false);
    expect(verification.canUnblockStaging).toBe(false);
  });

  it("keeps Sprint 43 handoff evidence local-advisory and externally blocked", () => {
    const evidence = readWorkspaceJson<{
      authority: string;
      releaseGrade: boolean;
      canUnblockStaging: boolean;
      commercialReadyLocalHandoffFreeze: boolean;
      externalBlockers: Array<{ id: string; status: string }>;
      mixedRepoWorkflowBlockers: Array<{ id: string; status: string }>;
      localSafeTrackAudit: { remainingInternalSafeTrackWork: string };
      forbiddenActionsObserved: Record<string, boolean>;
      evidenceInputs: Record<string, { path: string; sha256: string }>;
    }>("docs/evidence/staging-handoff-sprint43-external-blockers.json");
    const externalBlockerStatus = Object.fromEntries(evidence.externalBlockers.map((blocker) => [blocker.id, blocker.status]));
    const mixedBlockerStatus = Object.fromEntries(
      evidence.mixedRepoWorkflowBlockers.map((blocker) => [blocker.id, blocker.status])
    );

    expect(evidence.authority).toBe("local-advisory");
    expect(evidence.releaseGrade).toBe(false);
    expect(evidence.canUnblockStaging).toBe(false);
    expect(evidence.commercialReadyLocalHandoffFreeze).toBe(true);
    expect(evidence.localSafeTrackAudit.remainingInternalSafeTrackWork).toBe("none-known");
    expect(externalBlockerStatus.github_account_runner_startup).toBe("blocked");
    expect(externalBlockerStatus.partner_customer_signoff).toBe("absent");
    expect(externalBlockerStatus.external_hosting_approval).toBe("absent");
    expect(externalBlockerStatus.managed_infrastructure_approval).toBe("absent");
    expect(mixedBlockerStatus.protected_ci_required_checks).toBe("blocked-current-head-checks-absent");
    expect(mixedBlockerStatus.protected_artifact_metadata).toBe("absent");
    expect(mixedBlockerStatus.branch_protection_satisfaction).toBe("blocked-required-checks-not-passing");
    expect(Object.values(evidence.forbiddenActionsObserved).every((observed) => observed === false)).toBe(true);

    for (const input of Object.values(evidence.evidenceInputs)) {
      expect(sha256WorkspaceFile(input.path).toUpperCase()).toBe(input.sha256.toUpperCase());
    }
  });

  it("keeps live demo snapshot copies replayable with canonical verifier input payloads", () => {
    type LiveSnapshot = {
      verifier: {
        verifierInputHash: string;
        canonicalVerifierInputPayload?: string;
        canonicalVerifierInputPayloadBytesHex?: string;
        replayBoundary?: {
          canonicalVerifierInputPayloadAvailable: false;
          canonicalVerifierInputPayloadBytesHexAvailable: false;
          reason: string;
          exportCommandFailsClosedWhenVerifierInputMissing: true;
          replacementSource: string;
        };
      };
      receipt: {
        receiptHash: string;
        canonicalPayload: string;
        canonicalPayloadBytesHex: string;
      };
    };
    const docsSnapshot = readWorkspaceJson<LiveSnapshot>("docs/evidence/live-demo-sprint12-snapshot.json");
    const publicSnapshot = readWorkspaceJson<LiveSnapshot>("apps/web/public/live-demo-snapshot.json");

    expect(docsSnapshot).toEqual(publicSnapshot);
    expect(docsSnapshot.verifier.verifierInputHash).toMatch(/^0x[a-f0-9]{64}$/u);
    if (docsSnapshot.verifier.canonicalVerifierInputPayload !== undefined) {
      expect(docsSnapshot.verifier.canonicalVerifierInputPayload).toContain('"schemaVersion":"1"');
      expect(docsSnapshot.verifier.canonicalVerifierInputPayloadBytesHex).toMatch(/^0x[0-9a-f]+$/u);
    } else {
      expect(docsSnapshot.verifier.replayBoundary).toMatchObject({
        canonicalVerifierInputPayloadAvailable: false,
        canonicalVerifierInputPayloadBytesHexAvailable: false,
        reason: "legacy_sprint12_db_missing_verifier_input_row",
        exportCommandFailsClosedWhenVerifierInputMissing: true
      });
      expect(docsSnapshot.verifier.replayBoundary?.replacementSource).toContain(
        "docs/evidence/giwa-sepolia-mvp-evidence.json"
      );
    }
    expect(docsSnapshot.receipt.receiptHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(docsSnapshot.receipt.canonicalPayload).toContain('"schemaVersion":"1"');
    expect(docsSnapshot.receipt.canonicalPayloadBytesHex).toMatch(/^0x[0-9a-f]+$/u);
  });

  it("opens Sprint 43 handoff before demo routes in the submission evidence map", () => {
    const submissionEvidence = readWorkspaceText("docs/implementation/giwa-mvp-submission-evidence.md");
    const firstSection = submissionEvidence.slice(
      submissionEvidence.indexOf("## What To Open First"),
      submissionEvidence.indexOf("## Artifact Map")
    );
    const firstListItem = firstSection.split(/\r?\n/).find((line) => /^\d+\./.test(line.trim()));

    expect(firstListItem).toContain("giwa-external-blocker-monitoring-and-staging-handoff.md");
    expect(firstSection).toContain("docs/evidence/staging-handoff-sprint43-external-blockers.json");
  });
});

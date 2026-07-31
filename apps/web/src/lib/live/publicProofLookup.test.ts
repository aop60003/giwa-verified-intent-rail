import { describe, expect, it } from "vitest";

import { createMemoryLiveStore, type LiveStore } from "./liveStore.ts";
import { lookupPublicMatchedProof } from "./publicProofLookup.ts";
import { createPublicVerificationBundleFixture } from "./publicVerificationBundle.test.ts";

async function publishedFixture() {
  const store = createMemoryLiveStore();
  const bundle = await createPublicVerificationBundleFixture();
  const runId = "run-public-proof";
  const createdAt = "2026-07-31T00:00:00.000Z";
  const run = store.createRun({
    runId,
    tenantId: "local",
    capabilityHash: "private-capability-canary",
    idempotencyKey: "public-proof:idempotency",
    wallet: bundle.manifest.payload.wallet,
    campaignId: bundle.manifest.payload.campaignId,
    missionId: bundle.manifest.payload.missionId,
    referralCode: "private-referral-canary",
    nonce: bundle.manifest.payload.nonce,
    intentHash: bundle.identity.intentHash,
    manifestJson: JSON.stringify(bundle.manifest.payload),
    manifestSignature: bundle.manifest.signature,
    status: "depositConfirmed",
    expiryUnix: bundle.manifest.payload.expiryUnix,
    createdAt,
    updatedAt: createdAt
  });
  const submittedTx = store.saveSubmittedTx({
    runId,
    approveTxHash: bundle.receipt.payload.approveTxHash,
    depositTxHash: bundle.identity.depositTxHash,
    submittedAt: createdAt
  });
  const verifierInput = {
    runId,
    verifierInputHash: bundle.verifierInput.verifierInputHash,
    canonicalPayload: bundle.verifierInput.canonicalPayload,
    canonicalPayloadBytesHex: bundle.verifierInput.canonicalPayloadBytesHex,
    createdAt
  };
  const receipt = {
    receiptHash: bundle.identity.receiptHash,
    intentHash: bundle.identity.intentHash,
    payloadJson: JSON.stringify(bundle.receipt.payload),
    canonicalPayload: bundle.receipt.canonicalPayload,
    canonicalPayloadBytesHex: bundle.receipt.canonicalPayloadBytesHex
  };
  const decision = {
    intentHash: bundle.identity.intentHash,
    depositTxHash: bundle.identity.depositTxHash,
    decision: "matched" as const,
    failureReason: null,
    verifierInputHash: bundle.verifierInput.verifierInputHash,
    receiptHash: bundle.identity.receiptHash,
    decisionTxHash: null,
    issuedAt: bundle.receipt.payload.issuedAt,
    standardRpcReceiptStatus: 1 as const,
    depositBlockNumber: bundle.verification.depositBlockNumber,
    depositBlockHash: bundle.verification.depositBlockHash,
    confirmationDepth: bundle.verification.confirmationDepth
  };
  const publicEvidence = {
    receiptHash: bundle.identity.receiptHash,
    intentHash: bundle.identity.intentHash,
    depositTxHash: bundle.identity.depositTxHash,
    bundleJson: JSON.stringify(bundle),
    createdAt: bundle.generatedAt
  };

  store.publishMatchedEvidence({
    runId,
    updatedAt: createdAt,
    verifierInput,
    receipt,
    decision,
    publicEvidence
  });

  return {
    store,
    bundle,
    run,
    submittedTx,
    verifierInput,
    receipt,
    decision,
    publicEvidence
  };
}

function withoutQueryKind<T extends { queryKind: string }>(
  value: T
): Omit<T, "queryKind"> {
  const { queryKind: _queryKind, ...rest } = value;
  return rest;
}

describe("lookupPublicMatchedProof", () => {
  it("returns byte-equivalent bundle content for Receipt, Intent, and deposit hashes", async () => {
    const fixture = await publishedFixture();
    const byReceipt = await lookupPublicMatchedProof({
      store: fixture.store,
      queryHash: fixture.bundle.identity.receiptHash
    });
    const byIntent = await lookupPublicMatchedProof({
      store: fixture.store,
      queryHash: fixture.bundle.identity.intentHash
    });
    const byDeposit = await lookupPublicMatchedProof({
      store: fixture.store,
      queryHash: fixture.bundle.identity.depositTxHash
    });

    expect(byReceipt).not.toBeNull();
    expect(byIntent).not.toBeNull();
    expect(byDeposit).not.toBeNull();
    expect(withoutQueryKind(byReceipt!)).toEqual(withoutQueryKind(byIntent!));
    expect(withoutQueryKind(byIntent!)).toEqual(withoutQueryKind(byDeposit!));
    expect(JSON.stringify(byReceipt!.bundle)).toBe(JSON.stringify(byIntent!.bundle));
    expect(JSON.stringify(byIntent!.bundle)).toBe(JSON.stringify(byDeposit!.bundle));
    expect(byReceipt!.queryKind).toBe("receipt");
    expect(byIntent!.queryKind).toBe("intent");
    expect(byDeposit!.queryKind).toBe("depositTx");
    expect(byReceipt!.bundle).toEqual(fixture.bundle);
    expect(JSON.stringify(byReceipt)).not.toMatch(
      /capability|session|private|manifestJson|runId/iu
    );
  });

  it("returns one bounded not-found state for malformed and missing hashes", async () => {
    const fixture = await publishedFixture();

    await expect(
      lookupPublicMatchedProof({ store: fixture.store, queryHash: "not-a-hash" })
    ).resolves.toBeNull();
    await expect(
      lookupPublicMatchedProof({
        store: fixture.store,
        queryHash: `0x${"9".repeat(64)}`
      })
    ).resolves.toBeNull();
  });

  it.each(["mismatched", "depositSubmitted"] as const)(
    "does not publish an otherwise stored bundle when its run is %s",
    async (status) => {
      const fixture = await publishedFixture();
      const lockedStore: LiveStore = {
        ...fixture.store,
        listRuns: () =>
          fixture.store.listRuns().map((run) => ({ ...run, status }))
      };

      await expect(
        lookupPublicMatchedProof({
          store: lockedStore,
          queryHash: fixture.bundle.identity.receiptHash
        })
      ).resolves.toBeNull();
    }
  );

  it("does not publish a bundle that fails normalization or replay integrity", async () => {
    const fixture = await publishedFixture();
    const corruptedStore: LiveStore = {
      ...fixture.store,
      getPublicEvidenceByReceiptHash: () => ({
        ...fixture.publicEvidence,
        bundleJson: fixture.publicEvidence.bundleJson.replace(
          fixture.bundle.identity.intentHash,
          `0x${"9".repeat(64)}`
        )
      })
    };

    await expect(
      lookupPublicMatchedProof({
        store: corruptedStore,
        queryHash: fixture.bundle.identity.receiptHash
      })
    ).resolves.toBeNull();
  });

  it("does not describe a valid legacy Receipt without a bundle as replayable", async () => {
    const fixture = await publishedFixture();
    const legacyStore = createMemoryLiveStore();
    legacyStore.createRun({ ...fixture.run, status: "matched" });
    legacyStore.saveSubmittedTx(fixture.submittedTx);
    legacyStore.saveVerifierInput(fixture.verifierInput);
    legacyStore.saveReceipt(fixture.receipt);
    legacyStore.saveDecision(fixture.decision);

    await expect(
      lookupPublicMatchedProof({
        store: legacyStore,
        queryHash: fixture.bundle.identity.receiptHash
      })
    ).resolves.toBeNull();
  });
});

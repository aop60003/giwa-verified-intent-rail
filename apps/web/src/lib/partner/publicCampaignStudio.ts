import { evaluateCommercialReceiptGate } from "../live/commercialReceiptGate.ts";
import {
  PUBLIC_NEGATIVE_CONTROL,
  type PublicNegativeControl
} from "../live/publicNegativeControl.ts";
import type { LiveStore } from "../live/liveStore.ts";
import type { LiveRunRecord } from "../live/liveTypes.ts";
import { lookupPublicMatchedProof } from "../live/publicProofLookup.ts";
import {
  toBoundedFailureCode,
  type LiveFailureCode
} from "../verifier/liveFailureCode.ts";

export type PublicCampaignFunnelId =
  | "campaignVisited"
  | "walletConnected"
  | "manifestIssued"
  | "depositSubmitted"
  | "depositConfirmed"
  | "verifierChecking"
  | "matched"
  | "receiptIssued";

export type PublicCampaignStudio = {
  screenKind: "public-campaign-studio";
  source: "live";
  generatedAt: string;
  eventCapture: {
    status: "captured" | "unavailable";
    generatedAt: string;
  };
  campaign: {
    campaignId: string;
    missionId: string;
    networkName: "GIWA Sepolia";
    actionName: "Mock USDC deposit";
    policyVersion: null;
    policyStatus: "fixed-unversioned";
    managedMode: true;
    testnetOnly: true;
  };
  funnel: Array<{
    id: PublicCampaignFunnelId;
    label: string;
    count: number | null;
    capture: "captured" | "derived" | "not-captured";
  }>;
  approvalPaths: {
    exactApprovalSubmitted: number;
    exactApprovalConfirmed: number;
    approvalNotRequired: number;
    depositSubmitted: number;
  };
  kpis: {
    uniqueCampaignVisitorCount: number | null;
    uniqueWalletConnectSessionCount: number | null;
    submittedDepositCount: number;
    matchedReceiptCount: number;
    matchedRate: {
      numerator: number;
      denominator: number;
      displayRate: string;
      definition: "Matched Receipts / submitted deposits";
    };
    uniqueParticipantCount: number;
    repeatActivatorCount: number;
    repeatActivationCount: number;
  };
  negativeControl: Readonly<PublicNegativeControl>;
  mismatchBreakdown: Array<{
    code: string;
    label: string;
    count: number;
  }>;
  receipts: Array<{
    source: "live";
    walletLabel: string;
    receiptHash: string;
    intentHash: string;
    depositTxHash: string;
    verifierInputHash: string;
    receiptPath: string;
    participantReceiptPath: string;
    explorerUrl: string;
    updatedAt: string;
  }>;
};

type PublicCampaignProofLink = Pick<
  NonNullable<Awaited<ReturnType<typeof lookupPublicMatchedProof>>>,
  | "walletLabel"
  | "receiptHash"
  | "intentHash"
  | "depositTxHash"
  | "verifierInputHash"
  | "receiptPath"
  | "participantReceiptPath"
  | "explorerUrl"
>;

const CONFIRMED_APPROVAL_STATUSES = new Set<LiveRunRecord["status"]>([
  "approveConfirmed",
  "depositReady",
  "depositSubmitted",
  "depositConfirmed",
  "verifierChecking",
  "matched",
  "mismatched",
  "failed"
]);

const CONFIRMED_DEPOSIT_STATUSES = new Set<LiveRunRecord["status"]>([
  "depositConfirmed",
  "verifierChecking",
  "matched",
  "mismatched",
  "failed"
]);

const VERIFIER_STATUSES = new Set<LiveRunRecord["status"]>([
  "verifierChecking",
  "matched",
  "mismatched",
  "failed"
]);

const FAILURE_LABELS: Record<LiveFailureCode, string> = {
  SIGNER_MISMATCH: "캠페인 서명 불일치",
  INTENT_HASH_MISMATCH: "Intent hash 불일치",
  VERIFYING_CONTRACT_MISMATCH: "검증 컨트랙트 불일치",
  TARGET_MISMATCH: "실행 대상 불일치",
  SELECTOR_MISMATCH: "액션 불일치",
  ASSET_MISMATCH: "자산 불일치",
  AMOUNT_MISMATCH: "수량 불일치",
  SPENDER_MISMATCH: "승인 대상 불일치",
  ALLOWANCE_EXCEEDED: "승인 수량 초과",
  TX_FAILED: "트랜잭션 실패",
  EXPIRED: "Manifest 만료",
  MISSING_REQUIRED_LOG: "필수 실행 증거 누락",
  UNDER_CONFIRMED: "확인 수 부족",
  WRONG_CHAIN: "네트워크 불일치"
};

function derivedStep(
  id: PublicCampaignFunnelId,
  label: string,
  count: number
): PublicCampaignStudio["funnel"][number] {
  return { id, label, count, capture: "derived" };
}

function notCapturedStep(
  id: PublicCampaignFunnelId,
  label: string
): PublicCampaignStudio["funnel"][number] {
  return { id, label, count: null, capture: "not-captured" };
}

function displayMatchedRate(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%";
  const percent = (numerator / denominator) * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

export async function buildPublicCampaignStudio(input: {
  store: LiveStore;
  campaignId: string;
  missionId: string;
  generatedAt: string;
  resolvePublicProof?: (
    receiptHash: string
  ) => Promise<PublicCampaignProofLink | null>;
}): Promise<PublicCampaignStudio> {
  const runs = input.store
    .listRuns()
    .filter(
      (run) =>
        run.campaignId === input.campaignId &&
        run.missionId === input.missionId
    );
  const submitted = runs
    .map((run) => ({ run, tx: input.store.getSubmittedTx(run.runId) }))
    .filter(
      (
        item
      ): item is {
        run: LiveRunRecord;
        tx: NonNullable<ReturnType<LiveStore["getSubmittedTx"]>>;
      } => item.tx !== undefined
    );

  const gatedMatched = (
    await Promise.all(
      runs.map(async (run) => {
      const decision = input.store.getDecisionByIntentHash(run.intentHash);
      const receipt =
        decision?.receiptHash == null
          ? undefined
          : input.store.getReceipt(decision.receiptHash);
      const verifierInput =
        decision === undefined
          ? undefined
          : input.store.getVerifierInput(decision.verifierInputHash);
      const submittedTx = input.store.getSubmittedTx(run.runId);
      const gate = evaluateCommercialReceiptGate({
        run,
        decision,
        receipt,
        verifierInput,
        replay: { requireHashRecomputation: true }
      });
      if (
        !gate.open ||
        decision === undefined ||
        receipt === undefined ||
        submittedTx === undefined
      ) {
        return null;
      }
      const publicProof = await (input.resolvePublicProof === undefined
        ? lookupPublicMatchedProof({
            store: input.store,
            queryHash: receipt.receiptHash
          })
        : input.resolvePublicProof(receipt.receiptHash));
      return {
        participantWallet: run.wallet.toLowerCase(),
        publicRow:
          publicProof === null
            ? null
            : {
                source: "live" as const,
                walletLabel: publicProof.walletLabel,
                receiptHash: publicProof.receiptHash,
                intentHash: publicProof.intentHash,
                depositTxHash: publicProof.depositTxHash,
                verifierInputHash: publicProof.verifierInputHash,
                receiptPath: publicProof.receiptPath,
                participantReceiptPath: publicProof.participantReceiptPath,
                explorerUrl: publicProof.explorerUrl,
                updatedAt: run.updatedAt
              }
      };
      })
    )
  ).filter(
    (
      item
    ): item is NonNullable<typeof item> => item !== null
  );
  const publicRows = gatedMatched
    .flatMap((item) => (item.publicRow === null ? [] : [item.publicRow]))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const receipts = publicRows.slice(0, 20);

  const mismatchCounts = new Map<LiveFailureCode, number>();
  for (const run of runs) {
    const decision = input.store.getDecisionByIntentHash(run.intentHash);
    if (
      decision === undefined ||
      (decision.decision !== "mismatched" && decision.decision !== "failed")
    ) {
      continue;
    }
    const code = toBoundedFailureCode(decision.failureReason);
    if (code !== null) {
      mismatchCounts.set(code, (mismatchCounts.get(code) ?? 0) + 1);
    }
  }

  const matchedReceiptCount = gatedMatched.length;
  const submittedDepositCount = submitted.length;
  const exactApprovalSubmitted = submitted.filter(
    (item) => item.tx.approveTxHash !== null
  ).length;
  const exactApprovalConfirmed = submitted.filter(
    (item) =>
      item.tx.approveTxHash !== null &&
      CONFIRMED_APPROVAL_STATUSES.has(item.run.status)
  ).length;
  const approvalNotRequired =
    submittedDepositCount - exactApprovalSubmitted;
  const uniqueSubmittedParticipants = new Set(
    submitted.map((item) => item.run.wallet.toLowerCase())
  ).size;
  const participantActivationCounts = new Map<string, number>();
  for (const item of gatedMatched) {
    participantActivationCounts.set(
      item.participantWallet,
      (participantActivationCounts.get(item.participantWallet) ?? 0) + 1
    );
  }
  const repeatCounts = [...participantActivationCounts.values()].filter(
    (count) => count > 1
  );
  return {
    screenKind: "public-campaign-studio",
    source: "live",
    generatedAt: input.generatedAt,
    eventCapture: {
      status: "unavailable",
      generatedAt: input.generatedAt
    },
    campaign: {
      campaignId: input.campaignId,
      missionId: input.missionId,
      networkName: "GIWA Sepolia",
      actionName: "Mock USDC deposit",
      policyVersion: null,
      policyStatus: "fixed-unversioned",
      managedMode: true,
      testnetOnly: true
    },
    funnel: [
      notCapturedStep("campaignVisited", "캠페인 방문"),
      notCapturedStep("walletConnected", "지갑 연결"),
      derivedStep("manifestIssued", "Manifest 발급", runs.length),
      derivedStep("depositSubmitted", "예치 제출", submittedDepositCount),
      derivedStep(
        "depositConfirmed",
        "예치 확인",
        runs.filter((run) => CONFIRMED_DEPOSIT_STATUSES.has(run.status)).length
      ),
      derivedStep(
        "verifierChecking",
        "Verifier 대조",
        runs.filter((run) => VERIFIER_STATUSES.has(run.status)).length
      ),
      derivedStep("matched", "조건 일치", matchedReceiptCount),
      derivedStep("receiptIssued", "Receipt 발급", matchedReceiptCount)
    ],
    approvalPaths: {
      exactApprovalSubmitted,
      exactApprovalConfirmed,
      approvalNotRequired,
      depositSubmitted: submittedDepositCount
    },
    kpis: {
      uniqueCampaignVisitorCount: null,
      uniqueWalletConnectSessionCount: null,
      submittedDepositCount,
      matchedReceiptCount,
      matchedRate: {
        numerator: matchedReceiptCount,
        denominator: submittedDepositCount,
        displayRate: displayMatchedRate(
          matchedReceiptCount,
          submittedDepositCount
        ),
        definition: "Matched Receipts / submitted deposits"
      },
      uniqueParticipantCount: uniqueSubmittedParticipants,
      repeatActivatorCount: repeatCounts.length,
      repeatActivationCount: repeatCounts.reduce(
        (sum, count) => sum + count - 1,
        0
      )
    },
    negativeControl: PUBLIC_NEGATIVE_CONTROL,
    mismatchBreakdown: [...mismatchCounts.entries()]
      .map(([code, count]) => ({ code, label: FAILURE_LABELS[code], count }))
      .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code)),
    receipts
  };
}

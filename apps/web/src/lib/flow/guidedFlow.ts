type JsonRecord = Record<string, any>;

export type FlowStepState = "complete" | "active" | "pending" | "blocked";
export type FlowStepId =
  | "reviewManifest"
  | "walletAction"
  | "fastFeedback"
  | "blockConfirmed"
  | "verifierChecking"
  | "matched"
  | "viewReceipt";

export type GuidedFlowModel = {
  screenKind: "guided-flow";
  productName: "GIWA Verified Intent Rail";
  source: {
    mode: "completed-demo-evidence";
    evidenceDraftUntilSprint7: boolean;
  };
  mission: {
    campaignId: string;
    missionId: string;
    actionType: string;
    networkName: string;
    chainId: number;
  };
  networkGate: {
    requiredChainId: number;
    observedChainId: number;
    state: "ready" | "wrong_network";
    blocksExecution: boolean;
    message: string;
  };
  readiness: {
    wallet: string;
    network: "GIWA Sepolia ready" | "Wrong network";
    tokenBalanceState: "minted for completed demo";
    verifiedState: {
      state: "verified" | "guest" | "unavailable";
      readOnly: true;
      gatesGuestPath: false;
    };
  };
  deployedAddresses: Array<{
    label: string;
    address: string;
    explorerUrl?: string | undefined;
  }>;
  manifest: {
    target: string;
    selector: string;
    asset: string;
    amountBaseUnits: string;
    spender: string;
    maxAllowanceBaseUnits: string;
    expiryUnix: number;
    intentHash: string;
  };
  walletActions: Array<{
    kind: "approve" | "deposit";
    from: string;
    to: string;
    txHash?: string | undefined;
    explorerUrl?: string | undefined;
    status: "completed" | "ready" | "blocked";
    note: string;
  }>;
  statusRail: Array<{
    id: FlowStepId;
    label: string;
    state: FlowStepState;
    finalConfirmation: boolean;
    detail: string;
  }>;
  receipt: {
    ready: boolean;
    routeEnabled: boolean;
    receiptHash: string | null;
    decisionTxHash: string | null;
    depositTxHash: string | null;
    decisionExplorerUrl: string | null;
    depositExplorerUrl: string | null;
    blockNumber: number | null;
    blockHash: string | null;
    displayStatus: string;
    safetyNotice: string;
  };
  runEvents: Array<{
    name:
      | "campaign_entry"
      | "wallet_connected"
      | "intent_accepted"
      | "intent_submitted"
      | "deposit_submitted"
      | "receipt_matched";
    runId: string;
    timestamp: string;
    campaignId: string;
    missionId: string;
    wallet?: string;
    source: "fixture";
  }>;
};

export type ReceiptRouteResolution =
  | {
      allowed: true;
      receiptHash: string;
    }
  | {
      allowed: false;
      reason: "receipt_not_ready" | "receipt_hash_mismatch";
    };

function txExplorer(evidence: JsonRecord, key: string): string | undefined {
  return evidence.explorer?.transactions?.[key];
}

function addressExplorer(evidence: JsonRecord, key: string): string | undefined {
  return evidence.explorer?.contracts?.[key];
}

function bool(value: unknown): boolean {
  return value === true;
}

function state(condition: boolean): FlowStepState {
  return condition ? "complete" : "pending";
}

function buildNetworkGate(evidence: JsonRecord, deployment: JsonRecord): GuidedFlowModel["networkGate"] {
  const requiredChainId = Number(deployment.chainId);
  const observedChainId = Number(evidence.network?.chainId);
  const ready = Number.isFinite(requiredChainId) && Number.isFinite(observedChainId) && requiredChainId === observedChainId;

  return {
    requiredChainId,
    observedChainId,
    state: ready ? "ready" : "wrong_network",
    blocksExecution: !ready,
    message: ready
      ? "Wallet actions are scoped to GIWA Sepolia."
      : `Switch to GIWA Sepolia chain ${requiredChainId} before wallet execution.`
  };
}

function timestampFromIssuedAt(issuedAt: number | undefined, offsetSeconds: number): string {
  const base = Number.isInteger(issuedAt) && issuedAt !== undefined ? issuedAt : 1_781_674_617;
  return new Date((base - offsetSeconds) * 1000).toISOString();
}

function statusRail(evidence: JsonRecord, receiptReady: boolean, executionBlocked: boolean): GuidedFlowModel["statusRail"] {
  const hasWalletActions = Boolean(evidence.transactions?.approveTxHash && evidence.transactions?.depositTxHash);
  const fastFeedbackObserved = evidence.confirmation?.flashblocksObserved === true;
  const blockConfirmed = evidence.confirmation?.standardRpcReceiptStatus === 1;
  const verifierMatched = evidence.verifier?.decision === "matched";
  const verifierFinished = evidence.verifier?.decision != null;

  return [
    {
      id: "reviewManifest",
      label: "Review manifest",
      state: "complete",
      finalConfirmation: false,
      detail: "Target, selector, asset, amount, spender, and allowance are visible before action."
    },
    {
      id: "walletAction",
      label: "Wallet actions",
      state: executionBlocked ? "blocked" : state(hasWalletActions),
      finalConfirmation: false,
      detail: executionBlocked
        ? "Wallet execution is locked until the connected chain is GIWA Sepolia."
        : "Approve and deposit transaction hashes are recorded from wallet execution."
    },
    {
      id: "fastFeedback",
      label: "Fast feedback",
      state: state(fastFeedbackObserved),
      finalConfirmation: false,
      detail: "Flashblocks observation is non-final and separate from verifier match."
    },
    {
      id: "blockConfirmed",
      label: "Block confirmed",
      state: state(blockConfirmed),
      finalConfirmation: true,
      detail: "Standard RPC receipt status is 1 with block number and block hash."
    },
    {
      id: "verifierChecking",
      label: "Verifier checking",
      state: verifierFinished ? "complete" : blockConfirmed ? "active" : "pending",
      finalConfirmation: false,
      detail: "The Sprint 4 verifier compares confirmed evidence with the signed manifest."
    },
    {
      id: "matched",
      label: "Matched",
      state: state(verifierMatched),
      finalConfirmation: false,
      detail: "Receipt readiness starts only after verifier decision is matched."
    },
    {
      id: "viewReceipt",
      label: "View receipt",
      state: receiptReady ? "complete" : "pending",
      finalConfirmation: false,
      detail: "Receipt route is enabled only when receiptHash and decisionTxHash exist."
    }
  ];
}

export function buildGuidedFlowModel(evidence: JsonRecord, deployment: JsonRecord): GuidedFlowModel {
  const manifest = evidence.manifest.manifest;
  const receiptPayload = evidence.receipt?.payload;
  const receiptEnvelope = evidence.receipt?.["envelope"];
  const verifierMatched = evidence.verifier?.decision === "matched";
  const receiptHash = evidence.receipt?.receiptHash ?? null;
  const decisionTxHash = deployment.decisionTxHash ?? evidence.transactions?.decisionTxHash ?? null;
  const gate = buildNetworkGate(evidence, deployment);
  const receiptReady = !gate.blocksExecution && verifierMatched && typeof receiptHash === "string" && typeof decisionTxHash === "string";
  const campaignId = manifest.campaignId;
  const missionId = manifest.missionId;
  const wallet = manifest.wallet;
  const runId = `${campaignId}:${missionId}:${String(evidence.manifest.intentHash).slice(2, 10)}`;
  const issuedAt = receiptPayload?.issuedAt;
  const eventBase = {
    runId,
    campaignId,
    missionId,
    wallet,
    source: "fixture" as const
  };

  return {
    screenKind: "guided-flow",
    productName: "GIWA Verified Intent Rail",
    source: {
      mode: "completed-demo-evidence",
      evidenceDraftUntilSprint7: bool(evidence.draftUntilSprint7)
    },
    mission: {
      campaignId,
      missionId,
      actionType: manifest.actionType,
      networkName: evidence.network.networkName,
      chainId: evidence.network.chainId
    },
    networkGate: gate,
    readiness: {
      wallet,
      network: gate.blocksExecution ? "Wrong network" : "GIWA Sepolia ready",
      tokenBalanceState: "minted for completed demo",
      verifiedState: {
        state: receiptPayload?.verifiedState ?? "guest",
        readOnly: true,
        gatesGuestPath: false
      }
    },
    deployedAddresses: [
      {
        label: "Mock token",
        address: deployment.mockTokenAddress,
        explorerUrl: addressExplorer(evidence, "mockToken")
      },
      {
        label: "Mock vault",
        address: deployment.mockVaultAddress,
        explorerUrl: addressExplorer(evidence, "mockVault")
      },
      {
        label: "Intent rail",
        address: deployment.intentRailAddress,
        explorerUrl: addressExplorer(evidence, "intentRail")
      }
    ],
    manifest: {
      target: manifest.target,
      selector: manifest.selector,
      asset: manifest.asset,
      amountBaseUnits: manifest.amountBaseUnits,
      spender: manifest.spender,
      maxAllowanceBaseUnits: manifest.maxAllowanceBaseUnits,
      expiryUnix: manifest.expiryUnix,
      intentHash: evidence.manifest.intentHash
    },
    walletActions: [
      {
        kind: "approve",
        from: evidence.walletActions.approve.from,
        to: evidence.walletActions.approve.to,
        txHash: evidence.transactions.approveTxHash,
        explorerUrl: txExplorer(evidence, "approve"),
        status: gate.blocksExecution ? "blocked" : evidence.transactions.approveTxHash ? "completed" : "ready",
        note: gate.blocksExecution ? gate.message : "Limited test token allowance for the mock vault."
      },
      {
        kind: "deposit",
        from: evidence.walletActions.deposit.from,
        to: evidence.walletActions.deposit.to,
        txHash: evidence.transactions.depositTxHash,
        explorerUrl: txExplorer(evidence, "deposit"),
        status: gate.blocksExecution ? "blocked" : evidence.transactions.depositTxHash ? "completed" : "ready",
        note: gate.blocksExecution ? gate.message : "Mock vault deposit covered by the signed manifest."
      }
    ],
    statusRail: statusRail(evidence, receiptReady, gate.blocksExecution),
    receipt: {
      ready: receiptReady,
      routeEnabled: receiptReady,
      receiptHash,
      decisionTxHash,
      depositTxHash: evidence.transactions?.depositTxHash ?? null,
      decisionExplorerUrl: txExplorer(evidence, "decision") ?? receiptEnvelope?.explorerUrl ?? null,
      depositExplorerUrl: txExplorer(evidence, "deposit") ?? null,
      blockNumber: receiptPayload?.depositBlockNumber ?? null,
      blockHash: receiptPayload?.depositBlockHash ?? null,
      displayStatus: receiptEnvelope?.displayStatus ?? "Verifier pending",
      safetyNotice: receiptPayload?.safetyNotice ?? "Testnet-only mock action evidence. No production asset or yield claim."
    },
    runEvents: [
      { name: "campaign_entry", timestamp: timestampFromIssuedAt(issuedAt, 60), ...eventBase },
      { name: "wallet_connected", timestamp: timestampFromIssuedAt(issuedAt, 50), ...eventBase },
      { name: "intent_accepted", timestamp: timestampFromIssuedAt(issuedAt, 40), ...eventBase },
      { name: "intent_submitted", timestamp: timestampFromIssuedAt(issuedAt, 30), ...eventBase },
      { name: "deposit_submitted", timestamp: timestampFromIssuedAt(issuedAt, 20), ...eventBase },
      { name: "receipt_matched", timestamp: timestampFromIssuedAt(issuedAt, 0), ...eventBase }
    ]
  };
}

export function resolveReceiptRoute(model: GuidedFlowModel, pathname: string): ReceiptRouteResolution {
  if (!model.receipt.ready || !model.receipt.routeEnabled || model.receipt.receiptHash === null) {
    return {
      allowed: false,
      reason: "receipt_not_ready"
    };
  }

  const routeHash = pathname.split("/").filter(Boolean).at(-1);
  if (routeHash?.toLowerCase() !== model.receipt.receiptHash.toLowerCase()) {
    return {
      allowed: false,
      reason: "receipt_hash_mismatch"
    };
  }

  return {
    allowed: true,
    receiptHash: model.receipt.receiptHash
  };
}

const app = document.querySelector("#app");
const GIWA_CHAIN_ID = 91342;
const GIWA_CHAIN_HEX = "0x164ce";
const GIWA_EXPLORER_TX_BASE = "https://sepolia-explorer.giwa.io/tx/";
const USER_RUN_KEY = "giwa:userRunState";
const USER_WALLET_TX_KEY = "giwa:userWalletTxState";
const USER_RECEIPTS_KEY = "giwa:userReceipts";
const CAMPAIGN_HANDOFF_RECEIPT_KEY = "giwa:campaignHandoffReceipt";
const USER_MISSION_REVIEW_KEY = "giwa:userMissionReviewed";
const BALANCE_OF_SELECTOR = "0x70a08231";
const ALLOWANCE_SELECTOR = "0xdd62ed3e";
const MINT_SELECTOR = "0x40c10f19";
const APPROVE_SELECTOR = "0x095ea7b3";
const DEPOSIT_SELECTOR = "0x47e7ef24";
const VERIFY_RETRY_DELAY_MS = 8_000;
const VERIFY_MAX_ATTEMPTS = 24;
const RECEIPT_POLL_DELAY_MS = 2_000;
const RECEIPT_POLL_MAX_ATTEMPTS = 60;
const API_TIMEOUT_MS = 15_000;
const PROVIDER_TIMEOUT_MS = 15_000;
const MAX_UINT256 = (1n << 256n) - 1n;

const addChainRequest = {
  chainId: GIWA_CHAIN_HEX,
  chainName: "GIWA Sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia-rpc.giwa.io"],
  blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
};

const restoredSession = readSessionRun();
let walletState = { status: "disconnected", account: null, chainId: null };
let runState = restoredSession.run;
let walletTxState = readWalletTxState();
let publicConfig = null;
let assetState = { next: "gas_required", approveRequired: true, gasWei: null, tokenBalance: null, allowance: null };
let inFlight = false;
let contextGeneration = 0;
let missionReviewed = sessionStorage.getItem(USER_MISSION_REVIEW_KEY) === "true";
const activeRequestControllers = new Set();
const contextChangeListeners = new Set();
let notice = "먼저 미션 조건을 확인하세요.";

function projectFailureCode(value) {
  const allowed = new Set([
    "SIGNER_MISMATCH",
    "INTENT_HASH_MISMATCH",
    "VERIFYING_CONTRACT_MISMATCH",
    "TARGET_MISMATCH",
    "SELECTOR_MISMATCH",
    "ASSET_MISMATCH",
    "AMOUNT_MISMATCH",
    "SPENDER_MISMATCH",
    "ALLOWANCE_EXCEEDED",
    "TX_FAILED",
    "EXPIRED",
    "MISSING_REQUIRED_LOG",
    "UNDER_CONFIRMED",
    "WRONG_CHAIN"
  ]);
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function mismatchDisplayCopy(value) {
  const code = projectFailureCode(value);
  if (code === "TARGET_MISMATCH" || code === "SELECTOR_MISMATCH") {
    return "실행 대상 또는 액션이 Manifest와 달라 Receipt를 발급하지 않았습니다.";
  }
  if (code === "ASSET_MISMATCH" || code === "AMOUNT_MISMATCH") {
    return "자산 또는 수량이 Manifest와 달라 Receipt를 발급하지 않았습니다.";
  }
  if (code === "SPENDER_MISMATCH" || code === "ALLOWANCE_EXCEEDED") {
    return "승인 조건이 Manifest의 범위를 벗어나 Receipt를 발급하지 않았습니다.";
  }
  if (code === "EXPIRED") {
    return "트랜잭션이 Manifest 만료 후 확인되어 Receipt를 발급하지 않았습니다.";
  }
  if (code === "TX_FAILED") {
    return "GIWA Sepolia 트랜잭션이 실패해 Receipt를 발급하지 않았습니다.";
  }
  if (code === "MISSING_REQUIRED_LOG") {
    return "필수 트랜잭션 증거를 확인할 수 없어 Receipt를 발급하지 않았습니다.";
  }
  if (
    code === "SIGNER_MISMATCH" ||
    code === "INTENT_HASH_MISMATCH" ||
    code === "VERIFYING_CONTRACT_MISMATCH" ||
    code === "WRONG_CHAIN"
  ) {
    return "Manifest 검증 조건이 일치하지 않아 Receipt를 발급하지 않았습니다.";
  }
  return "확인한 조건과 실행 결과가 달라 Receipt를 발급하지 않았습니다.";
}

function projectSessionRun(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const address = (input) =>
    typeof input === "string" && /^0x[a-fA-F0-9]{40}$/u.test(input) ? input.toLowerCase() : null;
  const bytes32 = (input) =>
    typeof input === "string" && /^0x[a-fA-F0-9]{64}$/u.test(input) ? input.toLowerCase() : null;
  const optionalBytes32 = (input) => (input === null || input === undefined ? null : bytes32(input));
  const positiveDecimal = (input) => typeof input === "string" && /^[1-9][0-9]*$/u.test(input);
  const statuses = new Set([
    "manifestIssued",
    "approveSubmitted",
    "depositSubmitted",
    "standardRpcReceiptFound",
    "verifierChecking",
    "verifying",
    "matched",
    "pending",
    "notMatched",
    "mismatched",
    "failed",
    "timeout"
  ]);
  const preview = value.manifestPreview;
  const runId = typeof value.runId === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(value.runId) ? value.runId : null;
  const capability =
    typeof value.runCapability === "string" && /^[A-Za-z0-9_-]{43}$/u.test(value.runCapability)
      ? value.runCapability
      : null;
  const wallet = address(value.wallet);
  const intentHash = bytes32(value.intentHash);
  const expiryUnix = value.expiryUnix;
  if (
    runId === null ||
    capability === null ||
    wallet === null ||
    intentHash === null ||
    value.campaignSigned !== true ||
    !statuses.has(value.status) ||
    !Number.isSafeInteger(expiryUnix) ||
    expiryUnix <= 0 ||
    expiryUnix > 4_102_444_800 ||
    preview === null ||
    typeof preview !== "object" ||
    Array.isArray(preview)
  ) {
    return null;
  }
  const target = address(preview.target);
  const asset = address(preview.asset);
  const spender = address(preview.spender);
  const previewIntentHash = bytes32(preview.intentHash);
  if (
    target === null ||
    asset === null ||
    spender === null ||
    preview.selector !== "0x47e7ef24" ||
    !positiveDecimal(preview.amountBaseUnits) ||
    !positiveDecimal(preview.maxAllowanceBaseUnits) ||
    previewIntentHash !== intentHash ||
    preview.expiryUnix !== expiryUnix
  ) {
    return null;
  }
  const approveTxHash = optionalBytes32(value.approveTxHash);
  const pendingApproveTxHash = optionalBytes32(value.pendingApproveTxHash);
  const depositTxHash = optionalBytes32(value.depositTxHash);
  const receiptHash = optionalBytes32(value.receiptHash);
  const failureCode = projectFailureCode(value.failureCode);
  if (
    (value.approveTxHash != null && approveTxHash === null) ||
    (value.pendingApproveTxHash != null && pendingApproveTxHash === null) ||
    (value.depositTxHash != null && depositTxHash === null) ||
    (value.receiptHash != null && receiptHash === null) ||
    (value.failureCode != null && failureCode === null) ||
    (approveTxHash !== null && pendingApproveTxHash !== null) ||
    typeof value.evidenceSubmitted !== "boolean" ||
    (value.evidenceSubmitted && depositTxHash === null)
  ) {
    return null;
  }
  return {
    runId,
    runCapability: capability,
    campaignSigned: true,
    wallet,
    status: value.status,
    intentHash,
    expiryUnix,
    manifestPreview: {
      target,
      selector: "0x47e7ef24",
      asset,
      amountBaseUnits: preview.amountBaseUnits,
      spender,
      maxAllowanceBaseUnits: preview.maxAllowanceBaseUnits,
      expiryUnix,
      intentHash
    },
    approveTxHash,
    pendingApproveTxHash,
    depositTxHash,
    receiptHash,
    failureCode,
    evidenceSubmitted: value.evidenceSubmitted
  };
}

function projectInvalidationIdentity(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.runId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(value.runId)) return null;
  if (typeof value.runCapability !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(value.runCapability)) return null;
  return { runId: value.runId, runCapability: value.runCapability };
}

function runMatchesContext(run, account, config) {
  if (run === null || typeof run !== "object" || config === null || typeof config !== "object") return false;
  if (typeof account !== "string" || !/^0x[a-fA-F0-9]{40}$/u.test(account)) return false;
  const preview = run.manifestPreview;
  const contracts = config.contracts;
  return (
    config.chainId === 91342 &&
    preview !== null &&
    typeof preview === "object" &&
    contracts !== null &&
    typeof contracts === "object" &&
    run.wallet === account.toLowerCase() &&
    preview.target === String(contracts.mockVault).toLowerCase() &&
    preview.spender === String(contracts.mockVault).toLowerCase() &&
    preview.asset === String(contracts.mockToken).toLowerCase() &&
    preview.amountBaseUnits === config.demoAmountBaseUnits &&
    preview.maxAllowanceBaseUnits === config.demoAmountBaseUnits &&
    preview.selector === "0x47e7ef24" &&
    preview.intentHash === run.intentHash &&
    preview.expiryUnix === run.expiryUnix
  );
}

function projectIssuedRun(value, expectedContext) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const manifestSignatureValid =
    typeof value.manifestSignature === "string" &&
    /^0x[a-fA-F0-9]{130}$/u.test(value.manifestSignature);
  if (!manifestSignatureValid) return null;
  const candidate = projectSessionRun({
    runId: value.runId,
    runCapability: value.runCapability,
    campaignSigned: true,
    wallet: value.wallet,
    status: value.status,
    intentHash: value.intentHash,
    expiryUnix: value.expiryUnix,
    manifestPreview: value.manifestPreview,
    approveTxHash: null,
    pendingApproveTxHash: null,
    depositTxHash: null,
    receiptHash: null,
    failureCode: null,
    evidenceSubmitted: false
  });
  if (candidate === null || candidate.status !== "manifestIssued") return null;
  return runMatchesContext(candidate, expectedContext.account, expectedContext.config) ? candidate : null;
}

function mergeRunResponse(current, response) {
  const base = projectSessionRun(current);
  if (base === null || response === null || typeof response !== "object" || Array.isArray(response)) return null;
  const same = (field, expected, normalize = (value) => value) =>
    response[field] === undefined || normalize(response[field]) === expected;
  const normalizeWallet = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value) ? value.toLowerCase() : null;
  const normalizeHash = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value) ? value.toLowerCase() : null;
  if (
    !same("runId", base.runId) ||
    !same("wallet", base.wallet, normalizeWallet) ||
    !same("intentHash", base.intentHash, normalizeHash)
  ) {
    return null;
  }
  const statuses = new Set([
    "manifestIssued",
    "approveSubmitted",
    "depositSubmitted",
    "standardRpcReceiptFound",
    "verifierChecking",
    "verifying",
    "matched",
    "pending",
    "notMatched",
    "mismatched",
    "failed",
    "timeout"
  ]);
  const status = response.status === undefined ? base.status : response.status;
  if (!statuses.has(status)) return null;
  const mergeTxHash = (field, localValue) => {
    if (response[field] === undefined || response[field] === null) return localValue;
    const projected = normalizeHash(response[field]);
    if (projected === null || (localValue !== null && localValue !== projected)) return undefined;
    return projected;
  };
  const approveTxHash = mergeTxHash("approveTxHash", base.approveTxHash);
  const depositTxHash = mergeTxHash("depositTxHash", base.depositTxHash);
  if (approveTxHash === undefined || depositTxHash === undefined) return null;
  const receiptHash =
    response.receiptHash === undefined || response.receiptHash === null
      ? base.receiptHash
      : normalizeHash(response.receiptHash);
  if (response.receiptHash != null && receiptHash === null) return null;
  const failureCode =
    response.failureCode === undefined
      ? base.failureCode
      : projectFailureCode(response.failureCode);
  if (response.failureCode != null && failureCode === null) return null;
  return projectSessionRun({
    runId: base.runId,
    runCapability: base.runCapability,
    campaignSigned: base.campaignSigned,
    wallet: base.wallet,
    status,
    intentHash: base.intentHash,
    expiryUnix: base.expiryUnix,
    manifestPreview: base.manifestPreview,
    approveTxHash,
    pendingApproveTxHash: base.pendingApproveTxHash,
    depositTxHash,
    receiptHash,
    failureCode,
    evidenceSubmitted: base.evidenceSubmitted
  });
}

function readSessionRun() {
  try {
    const value = sessionStorage.getItem(USER_RUN_KEY);
    const parsed = value === null ? null : JSON.parse(value);
    if (parsed === null) return { run: null, invalidation: null };
    const run = projectSessionRun(parsed);
    if (run !== null) return { run, invalidation: null };
    sessionStorage.removeItem(USER_RUN_KEY);
    return { run: null, invalidation: projectInvalidationIdentity(parsed) };
  } catch {
    try {
      sessionStorage.removeItem(USER_RUN_KEY);
    } catch {
      // The bounded UI notice is installed after global initialization.
    }
    return { run: null, invalidation: null };
  }
}

function writeSessionRun(value) {
  try {
    if (value === null) sessionStorage.removeItem(USER_RUN_KEY);
    else {
      const projected = projectSessionRun(value);
      if (projected === null) throw new Error("invalid_run_state");
      sessionStorage.setItem(USER_RUN_KEY, JSON.stringify(projected));
    }
  } catch {
    notice = "현재 탭의 진행 상태를 저장할 수 없습니다. 페이지를 닫지 말고 계속해 주세요.";
  }
}

function readWalletTxState() {
  try {
    const value = sessionStorage.getItem(USER_WALLET_TX_KEY);
    const parsed = value === null ? null : JSON.parse(value);
    if (parsed === null) return null;
    if (
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      typeof parsed.pendingMintTxHash !== "string" ||
      !/^0x[a-fA-F0-9]{64}$/u.test(parsed.pendingMintTxHash) ||
      typeof parsed.pendingMintWallet !== "string" ||
      !/^0x[a-fA-F0-9]{40}$/u.test(parsed.pendingMintWallet) ||
      parsed.pendingMintChainId !== 91342
    ) {
      sessionStorage.removeItem(USER_WALLET_TX_KEY);
      return null;
    }
    return {
      pendingMintTxHash: parsed.pendingMintTxHash.toLowerCase(),
      pendingMintWallet: parsed.pendingMintWallet.toLowerCase(),
      pendingMintChainId: 91342
    };
  } catch {
    return null;
  }
}

function writeWalletTxState(value) {
  try {
    if (value === null) sessionStorage.removeItem(USER_WALLET_TX_KEY);
    else sessionStorage.setItem(USER_WALLET_TX_KEY, JSON.stringify(value));
  } catch {
    notice = "현재 탭의 Mock Token 준비 상태를 저장할 수 없습니다.";
  }
}

function readReceiptHistory() {
  try {
    const value = localStorage.getItem(USER_RECEIPTS_KEY);
    const parsed = value === null ? [] : JSON.parse(value);
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function writeReceiptHistory(value) {
  try {
    localStorage.setItem(USER_RECEIPTS_KEY, JSON.stringify(value.slice(0, 12)));
    return true;
  } catch {
    notice = "이 브라우저의 Receipt 목록을 저장할 수 없습니다. 공개 Receipt 링크는 계속 사용할 수 있습니다.";
    return false;
  }
}

function readCampaignHandoffReceipt() {
  try {
    const receiptHash = sessionStorage.getItem(CAMPAIGN_HANDOFF_RECEIPT_KEY);
    return /^0x[a-fA-F0-9]{64}$/u.test(receiptHash ?? "")
      ? receiptHash.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function writeCampaignHandoffReceipt(receiptHash) {
  if (!/^0x[a-fA-F0-9]{64}$/u.test(receiptHash ?? "")) return false;
  const normalizedReceiptHash = receiptHash.toLowerCase();
  try {
    sessionStorage.setItem(CAMPAIGN_HANDOFF_RECEIPT_KEY, normalizedReceiptHash);
    return true;
  } catch {
    return false;
  }
}

function view(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (value !== null && value !== false) node.setAttribute(key, String(value));
  }
  for (const child of children) node.append(child);
  return node;
}

function field(label, value) {
  return view("div", { className: "field" }, [
    view("span", { className: "field-label", text: label }),
    view("span", { className: "mono field-value hash-wrap", text: String(value ?? "확인 중") })
  ]);
}

function shortHash(value) {
  if (typeof value !== "string" || value.length <= 18) return String(value ?? "확인 중");
  return `${value.slice(0, 10)}...${value.slice(-5)}`;
}

function explorerTxUrl(value, baseUrl = GIWA_EXPLORER_TX_BASE) {
  if (typeof baseUrl !== "string" || !isSafeHttpsUrl(baseUrl)) return null;
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value) ? `${baseUrl}${value}` : null;
}

function routeName() {
  if (location.pathname === "/user/receipts") return "receipts";
  if (location.pathname === "/user/help") return "help";
  if (location.pathname.startsWith("/user/receipt/")) return "receipt";
  return "action";
}

function isGiwaDemoRoute() {
  return location.pathname === "/giwa-demo";
}

function isRecordedMismatchExample() {
  return (
    isGiwaDemoRoute() &&
    new URLSearchParams(location.search).get("example") === "mismatch"
  );
}

function projectJourneyStageState(input) {
  const activeStage = input.receiptReady
    ? "collect"
    : input.depositSubmitted || input.verifying || input.mismatched
      ? "match"
      : input.manifestReady
        ? "execute"
        : input.missionReviewed
          ? "signedMission"
          : "prepare";
  const order = ["prepare", "signedMission", "execute", "match", "collect"];
  const activeIndex = order.indexOf(activeStage);
  const stages = order.map((id, index) => ({
    id,
    state:
      id === "match" && input.mismatched
        ? "blocked"
        : index < activeIndex
          ? "complete"
          : index === activeIndex
            ? "active"
            : "pending"
  }));
  return { activeStage, stages };
}

function projectProtocolConsoleState(input) {
  const activeView = input.receiptReady
    ? "receipt"
    : input.depositSubmitted || input.verifying || input.mismatched
      ? "execution"
      : "mission";
  const publicOrder = ["mission", "execution", "receipt"];
  const publicIndex = publicOrder.indexOf(activeView);
  return {
    activeView,
    publicStages: publicOrder.map((id, index) => ({
      id,
      state:
        id === "execution" && input.mismatched
          ? "blocked"
          : index < publicIndex
            ? "complete"
            : index === publicIndex
              ? "active"
              : "pending"
    })),
    executionStages: [
      { id: "prepare", state: "complete" },
      {
        id: "wallet",
        state: input.approvalSubmitted ? "complete" : "active"
      },
      {
        id: "submit",
        state: input.depositSubmitted ? "complete" : "pending"
      },
      {
        id: "match",
        state: input.mismatched
          ? "blocked"
          : input.receiptReady
            ? "complete"
            : input.verifying
              ? "active"
              : "pending"
      },
      {
        id: "receipt",
        state: input.receiptReady ? "complete" : "pending"
      }
    ]
  };
}

function journeyProjection() {
  const walletReady =
    walletState.account !== null && walletState.chainId === GIWA_CHAIN_ID;
  const assetsReady =
    assetState.next === "approval_required" ||
    assetState.next === "deposit_ready";
  const manifestReady =
    runState?.manifestPreview !== null &&
    runState?.manifestPreview !== undefined &&
    runState?.status !== "manifestInvalidated" &&
    !isExpired();
  const depositSubmitted = typeof runState?.depositTxHash === "string";
  const mismatched = ["mismatched", "notMatched", "failed"].includes(
    runState?.status
  );
  return projectJourneyStageState({
    missionReviewed,
    walletReady,
    assetsReady,
    manifestReady,
    approvalSubmitted: typeof runState?.approveTxHash === "string",
    depositSubmitted,
    verifying:
      depositSubmitted && !mismatched && runState?.status !== "matched",
    receiptReady:
      runState?.status === "matched" &&
      typeof runState?.receiptHash === "string",
    mismatched
  });
}

function protocolConsoleProjection() {
  const depositSubmitted = typeof runState?.depositTxHash === "string";
  const mismatched = ["mismatched", "notMatched", "failed"].includes(
    runState?.status
  );
  return projectProtocolConsoleState({
    missionReviewed,
    approvalSubmitted:
      typeof runState?.approveTxHash === "string" ||
      assetState.next === "deposit_ready",
    depositSubmitted,
    verifying:
      depositSubmitted &&
      !mismatched &&
      runState?.status !== "matched",
    mismatched,
    receiptReady:
      runState?.status === "matched" &&
      typeof runState?.receiptHash === "string"
  });
}

const journeyStageCopy = {
  prepare: ["준비", "네트워크와 테스트 자산을 확인합니다."],
  signedMission: ["서명된 미션", "캠페인이 고정한 실행 조건을 확인합니다."],
  execute: ["실행", "지갑에서 승인과 예치를 진행합니다."],
  match: ["대조", "Manifest와 GIWA 실행 증거를 비교합니다."],
  collect: ["Receipt", "일치한 실행 기록을 받습니다."]
};

function projectDemoStageState(states) {
  if (states.includes("blocked")) return "attention";
  if (states.every((state) => state === "complete")) return "complete";
  if (states.includes("active")) return "current";
  return "locked";
}

function demoProgressStages() {
  const states = Object.fromEntries(
    progressSteps().map(([id, , , state]) => [id, state])
  );
  return [
    [
      "prepare",
      "준비 상태 확인",
      "지갑, 네트워크와 테스트 자산을 확인합니다.",
      projectDemoStageState([states.wallet_connected])
    ],
    [
      "execute",
      "조건 검토 및 실행",
      "Manifest의 네 필드를 확인하고 GIWA에서 실행합니다.",
      projectDemoStageState([
        states.intent_issued,
        states.approval_submitted,
        states.deposit_submitted
      ])
    ],
    [
      "receipt",
      "Receipt 확인",
      "트랜잭션 증거와 조건이 모두 일치하면 결과를 공개합니다.",
      projectDemoStageState([
        states.standard_rpc_receipt_found,
        states.verification_matched,
        states.receipt_ready
      ])
    ]
  ];
}

function receiptHashFromRoute() {
  try {
    const value = decodeURIComponent(location.pathname.slice("/user/receipt/".length));
    return /^0x[a-fA-F0-9]{64}$/u.test(value) ? value.toLowerCase() : "";
  } catch {
    return "";
  }
}

function provider() {
  return window.ethereum ?? null;
}

function normalizeAccount(account) {
  if (typeof account !== "string" || !/^0x[a-fA-F0-9]{40}$/u.test(account)) throw new Error("invalid_account");
  return account.toLowerCase();
}

function parseChainId(value) {
  if (typeof value !== "string" || !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/u.test(value)) {
    throw new Error("invalid_chain");
  }
  const chainId = Number(BigInt(value));
  if (!Number.isSafeInteger(chainId)) throw new Error("invalid_chain");
  return chainId;
}

function parseRpcQuantity(value) {
  if (typeof value !== "string" || !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/u.test(value)) {
    throw new Error("invalid_quantity");
  }
  const quantity = BigInt(value);
  if (quantity > MAX_UINT256) throw new Error("invalid_quantity");
  return quantity;
}

function parseAbiUint256(value) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/u.test(value)) throw new Error("invalid_abi_word");
  return BigInt(value);
}

function encodeAddressWord(value) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/u.test(value)) throw new Error("invalid_address");
  return value.slice(2).toLowerCase().padStart(64, "0");
}

function encodeUint256Word(value, positive = false) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value)) throw new Error("invalid_amount");
  const amount = BigInt(value);
  if ((positive && amount === 0n) || amount > MAX_UINT256) throw new Error("invalid_amount");
  return amount.toString(16).padStart(64, "0");
}

function isSafeHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.href.startsWith(`${parsed.origin}/`);
  } catch {
    return false;
  }
}

function requirePublicConfig(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_public_config");
  const contracts = body.contracts;
  if (
    body.chainId !== GIWA_CHAIN_ID ||
    body.chainName !== "GIWA Sepolia" ||
    !isSafeHttpsUrl(body.explorerTxBaseUrl) ||
    !isSafeHttpsUrl(body.faucetHelpUrl) ||
    typeof body.minGasBalanceWei !== "string" ||
    !/^(0|[1-9][0-9]*)$/u.test(body.minGasBalanceWei) ||
    typeof body.demoAmountBaseUnits !== "string" ||
    !/^[1-9][0-9]*$/u.test(body.demoAmountBaseUnits) ||
    contracts === null ||
    typeof contracts !== "object" ||
    Array.isArray(contracts)
  ) {
    throw new Error("invalid_public_config");
  }
  for (const key of ["mockToken", "mockVault", "intentRail"]) {
    if (typeof contracts[key] !== "string" || !/^0x[a-fA-F0-9]{40}$/u.test(contracts[key])) {
      throw new Error("invalid_public_config");
    }
  }
  return {
    chainId: body.chainId,
    chainName: body.chainName,
    explorerTxBaseUrl: body.explorerTxBaseUrl,
    faucetHelpUrl: body.faucetHelpUrl,
    minGasBalanceWei: body.minGasBalanceWei,
    demoAmountBaseUnits: body.demoAmountBaseUnits,
    contracts: {
      mockToken: contracts.mockToken.toLowerCase(),
      mockVault: contracts.mockVault.toLowerCase(),
      intentRail: contracts.intentRail.toLowerCase()
    }
  };
}

async function apiFetchJson(path, options = {}) {
  const controller = new AbortController();
  activeRequestControllers.add(controller);
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal });
    const body = await response.json();
    return { response, body };
  } catch {
    throw new Error("request_unavailable");
  } finally {
    window.clearTimeout(timeoutId);
    activeRequestControllers.delete(controller);
  }
}

async function apiFetchJsonWithContext(context, path, options = {}) {
  try {
    const result = await apiFetchJson(path, options);
    assertContext(context);
    return result;
  } catch (error) {
    assertContext(context);
    throw error;
  }
}

function participantHeaders(localRun) {
  const value = localRun?.runCapability;
  return typeof value === "string"
    ? { "content-type": "application/json", "x-giwa-run-capability": value }
    : { "content-type": "application/json" };
}

function participantFetch(localRun, path, options = {}, context = null) {
  if (!/^\/api\/runs\/[^/]+(?:\/(?:evidence|verify|invalidate))?$/u.test(path)) {
    throw new Error("invalid_participant_path");
  }
  const identity = projectInvalidationIdentity(localRun);
  const pathRunId = path.split("/")[3];
  if (identity === null || pathRunId !== identity.runId) {
    throw new Error("run_capability_unavailable");
  }
  const request = { ...options, headers: participantHeaders(identity) };
  return context === null ? apiFetchJson(path, request) : apiFetchJsonWithContext(context, path, request);
}

function captureContext() {
  return {
    generation: contextGeneration,
    account: walletState.account,
    chainId: walletState.chainId,
    runId: runState?.runId ?? null,
    runCapability: runState?.runCapability ?? null
  };
}

function isGenerationCurrent(context, currentGeneration = contextGeneration) {
  return (
    context !== null &&
    typeof context === "object" &&
    Number.isSafeInteger(context.generation) &&
    context.generation === currentGeneration
  );
}

function contextIsCurrent(context) {
  return (
    isGenerationCurrent(context) &&
    context.account === walletState.account &&
    context.chainId === walletState.chainId &&
    context.runId === (runState?.runId ?? null) &&
    context.runCapability === (runState?.runCapability ?? null)
  );
}

function assertContext(context) {
  if (!contextIsCurrent(context)) throw new Error("context_changed");
}

function requireContextRun(context) {
  assertContext(context);
  const projected = projectSessionRun(runState);
  if (
    projected === null ||
    projected.runId !== context.runId ||
    projected.runCapability !== context.runCapability
  ) {
    throw new Error("context_changed");
  }
  return projected;
}

function waitWithContext(milliseconds, context) {
  assertContext(context);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      contextChangeListeners.delete(onContextChange);
      callback(value);
    };
    const onContextChange = () => finish(reject, new Error("context_changed"));
    const timeoutId = window.setTimeout(() => {
      try {
        assertContext(context);
        finish(resolve);
      } catch (error) {
        finish(reject, error);
      }
    }, milliseconds);
    contextChangeListeners.add(onContextChange);
  });
}

function providerRequestWithContext(currentProvider, request, context) {
  assertContext(context);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      contextChangeListeners.delete(onContextChange);
      callback(value);
    };
    const onContextChange = () => finish(reject, new Error("context_changed"));
    contextChangeListeners.add(onContextChange);
    Promise.resolve()
      .then(() => currentProvider.request(request))
      .then(
        (value) => {
          try {
            assertContext(context);
            finish(resolve, value);
          } catch (error) {
            finish(reject, error);
          }
        },
        (error) => finish(reject, error)
      );
  });
}

function providerRequestWithTimeout(currentProvider, request, context) {
  assertContext(context);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      contextChangeListeners.delete(onContextChange);
      callback(value);
    };
    const onContextChange = () => finish(reject, new Error("context_changed"));
    const timeoutId = window.setTimeout(
      () => finish(reject, new Error("provider_request_timeout")),
      PROVIDER_TIMEOUT_MS
    );
    contextChangeListeners.add(onContextChange);
    Promise.resolve()
      .then(() => currentProvider.request(request))
      .then(
        (value) => {
          try {
            assertContext(context);
            finish(resolve, value);
          } catch (error) {
            finish(reject, error);
          }
        },
        (error) => finish(reject, error)
      );
  });
}

function beginContextChange() {
  const stale = projectInvalidationIdentity(runState);
  contextGeneration += 1;
  for (const controller of activeRequestControllers) controller.abort();
  activeRequestControllers.clear();
  for (const listener of [...contextChangeListeners]) listener();
  runState = null;
  walletTxState = null;
  assetState = { next: "gas_required", approveRequired: true, gasWei: null, tokenBalance: null, allowance: null };
  inFlight = false;
  writeSessionRun(null);
  writeWalletTxState(null);
  return stale;
}

function walletRequestFailureCode(error) {
  const code =
    error !== null && typeof error === "object" && "code" in error
      ? error.code
      : null;
  return code === 4001 || code === "ACTION_REJECTED"
    ? "wallet_rejected"
    : "wallet_unavailable";
}

function walletRequestNotice(code) {
  const copy = {
    provider_missing:
      "이 브라우저에서 지갑을 찾지 못했습니다. 지원되는 브라우저 지갑을 설치하거나 활성화해 주세요.",
    wallet_rejected:
      "지갑 연결 요청을 거절했습니다. 준비되면 연결을 다시 요청해 주세요.",
    wallet_unavailable:
      "지갑 요청을 완료하지 못했습니다. 지갑 창과 연결 상태를 확인한 뒤 다시 시도해 주세요."
  };
  return copy[code] ?? copy.wallet_unavailable;
}

function publicNotice(kind, reason = null) {
  if (kind === "wallet") {
    return walletRequestNotice(reason ?? "wallet_unavailable");
  }
  const notices = {
    network: "GIWA Sepolia로 전환한 뒤 다시 시도해 주세요.",
    readiness: "지갑 자산 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    faucet: "공식 테스트 ETH 안내를 새 창에서 열었습니다. 수령 후 다시 확인해 주세요.",
    mint: "Mock Token 준비가 완료되지 않았습니다. 지갑에서 트랜잭션 상태를 확인해 주세요.",
    manifest: "Manifest를 만들지 못했습니다. 현재 지갑과 네트워크를 확인해 주세요.",
    approve: "정확한 수량 승인 요청이 완료되지 않았습니다. 지갑에서 다시 시도해 주세요.",
    deposit: "Vault 예치 요청이 완료되지 않았습니다. 트랜잭션을 다시 보내지 말고 상태를 확인해 주세요.",
    verify: "Standard RPC 검증이 아직 완료되지 않았습니다. 같은 버튼으로 다시 시도할 수 있습니다.",
    recovery: "현재 탭의 활성 실행이 없습니다. 액션 화면에서 새 Manifest를 시작해 주세요.",
    copy: "복사하지 못했습니다. 링크를 직접 선택해 주세요.",
    context: "지갑 정보가 변경되어 이전 Manifest를 폐기했습니다. 현재 지갑으로 다시 시작해 주세요."
  };
  return notices[kind] ?? "요청을 완료하지 못했습니다. 현재 단계에서 다시 시도해 주세요.";
}

function nextPrimaryAction() {
  if (!missionReviewed) return "review_mission";
  if (walletState.account === null) return "connect";
  if (walletState.chainId !== GIWA_CHAIN_ID) return "switch_chain";
  if (assetState.next === "gas_required") return "open_faucet";
  if (walletTxState?.pendingMintTxHash) return "mint";
  if (assetState.next === "mint_required") return "mint";
  if (!runState?.manifestPreview) return "issue_manifest";
  if (runState.pendingApproveTxHash) return "approve";
  if (assetState.next === "approval_required" && !runState.approveTxHash) return "approve";
  if (!runState.depositTxHash) return "deposit";
  if (runState.status === "matched" && runState.receiptHash) return "open_receipt";
  return "verify";
}

function primaryLabel() {
  const labels = {
    review_mission: "미션 조건 보기",
    connect: "지갑 연결",
    switch_chain: "GIWA Sepolia로 전환",
    open_faucet: "테스트 ETH 받기",
    mint: "Mock Token 준비",
    issue_manifest: "액션 검토",
    approve: "정확한 수량 승인",
    deposit: "Vault에 예치",
    verify: "검증 중",
    open_receipt: "Receipt 보기"
  };
  return labels[nextPrimaryAction()];
}

function walletCopy() {
  if (walletState.status === "providerMissing") return "지원되는 브라우저 지갑이 필요합니다.";
  if (walletState.status === "wrongChain") return "계속하려면 GIWA Sepolia로 전환해 주세요.";
  if (walletState.account === null) return "먼저 브라우저 지갑을 연결해 주세요.";
  return "GIWA Sepolia에 연결된 지갑입니다.";
}

function assetCopy() {
  if (walletState.account === null || walletState.chainId !== GIWA_CHAIN_ID) return "연결 후 테스트 자산 상태를 확인합니다.";
  if (assetState.next === "gas_required") return "테스트 ETH가 필요합니다. 공식 안내에서 수령 후 다시 확인합니다.";
  if (assetState.next === "mint_required") return "고정 데모 수량의 Mock Token을 지갑으로 준비합니다.";
  if (assetState.next === "approval_required") return "Mock Token이 준비되었습니다. Manifest 검토 후 정확한 수량만 승인합니다.";
  return "테스트 ETH, Mock Token, allowance 상태를 확인했습니다.";
}

function isExpired() {
  const expiry = Number(runState?.expiryUnix ?? runState?.manifestPreview?.expiryUnix ?? 0);
  return expiry > 0 && Math.floor(Date.now() / 1000) > expiry;
}

function flowStateClass() {
  if (runState?.status === "matched" && runState.receiptHash) return "user-state complete";
  if (runState?.status === "mismatched" || runState?.status === "failed") return "user-state blocked";
  return "user-state pending";
}

function stepPresentation(state) {
  if (state === "complete") return { icon: "check", label: "완료" };
  if (state === "active") return { icon: "clock-3", label: "진행 중" };
  if (state === "blocked") {
    return { icon: "triangle-alert", label: "확인 필요" };
  }
  return { icon: "clock-3", label: "대기" };
}

function renderHashDisclosure(label, value) {
  return view("details", { className: "hash-disclosure" }, [
    view("summary", {}, [
      view("span", { text: label }),
      view("span", {
        className: "mono hash-visual",
        text: shortHash(value)
      }),
      globalThis.GiwaProtocolDossier.createLineIcon(
        document,
        "chevron-down"
      )
    ]),
    view("code", {
      className: "mono hash-full",
      text: value ?? "확인 중"
    })
  ]);
}

function progressSteps() {
  const walletReady = walletState.status === "connected" && walletState.chainId === GIWA_CHAIN_ID;
  const assetsReady = assetState.next === "approval_required" || assetState.next === "deposit_ready";
  const hasPreview = Boolean(runState?.manifestPreview);
  const approvalComplete = hasPreview && (typeof runState?.approveTxHash === "string" || assetState.next === "deposit_ready");
  const hasDeposit = typeof runState?.depositTxHash === "string";
  const matched = runState?.status === "matched";
  const failed = runState?.status === "mismatched" || runState?.status === "failed";
  const receiptFound = matched || failed || runState?.status === "verifying" || runState?.status === "timeout";
  return [
    ["wallet_connected", "지갑 및 자산 준비", "GIWA Sepolia 지갑과 테스트 자산 상태를 확인합니다.", walletReady && assetsReady ? "complete" : "active"],
    ["intent_issued", "Manifest 검토", "지갑, target, asset, 정확한 수량과 만료 시간을 검토합니다.", hasPreview ? "complete" : assetsReady ? "active" : "pending"],
    ["approval_submitted", "정확한 수량 승인", "필요한 경우 고정된 수량만 승인합니다.", approvalComplete ? "complete" : hasPreview ? "active" : "pending"],
    ["deposit_submitted", "Vault 예치", "검토한 Manifest 그대로 지갑에서 예치합니다.", hasDeposit ? "complete" : approvalComplete ? "active" : "pending"],
    ["standard_rpc_receipt_found", "Standard RPC 증거", "블록 증거와 confirmation depth를 확인합니다.", receiptFound ? "complete" : hasDeposit ? "active" : "pending"],
    ["verification_matched", "Manifest matched", "트랜잭션이 검토한 액션과 일치해야 합니다.", matched ? "complete" : failed ? "blocked" : "pending"],
    ["receipt_ready", "Receipt 준비", "일치한 실행만 공개 Receipt가 됩니다.", runState?.receiptHash ? "complete" : "pending"]
  ];
}

function renderStatusRail() {
  return view("section", { className: "user-progress-panel", "aria-label": "트랜잭션 진행 상태" }, [
    view("div", { className: "user-progress-heading" }, [
      view("p", { className: "eyebrow", text: "Review → Execute → Receipt" }),
      view("h2", { text: "다음 진행 단계" })
    ]),
    view(
      "ol",
      { className: "status-rail user-status-rail" },
      progressSteps().map(([id, label, detail, state]) => {
        const presentation = stepPresentation(state);
        return view(
          "li",
          { className: `status-step ${state}`, "data-step": id },
          [
            view(
              "span",
              { className: "status-icon", title: presentation.label },
              [
                globalThis.GiwaProtocolDossier.createLineIcon(
                  document,
                  presentation.icon
                ),
                view("span", {
                  className: "sr-only",
                  text: presentation.label
                })
              ]
            ),
            view("span", { className: "status-body" }, [
              view("strong", { text: label }),
              view("span", { text: detail }),
              view("em", {
                text:
                  id === "standard_rpc_receipt_found"
                    ? "Standard RPC evidence"
                    : "Evaluator step"
              })
            ])
          ]
        );
      })
    )
  ]);
}

function renderDemoTopBar() {
  return view("header", { className: "giwa-demo-topbar" }, [
    view("a", {
      className: "giwa-demo-wordmark",
      href: "/",
      text: "GIWA VERIFIED INTENT RAIL"
    }),
    view("p", {
      className: "giwa-demo-environment",
      text: "GIWA Sepolia · Testnet"
    }),
    view("a", { className: "secondary-link giwa-demo-product-link", href: "/", text: "제품 설명 보기" })
  ]);
}

function renderDemoJudgePromise() {
  const labels = ["캠페인 서명", "지갑 실행", "Receipt"];
  return view("aside", {
    className: "giwa-demo-judge-promise",
    "aria-label": "GIWA Verified Intent Rail 작동 방식"
  }, [
    view("div", { className: "giwa-demo-judge-copy" }, [
      view("p", {
        className: "giwa-demo-problem",
        text: "버튼을 눌렀다는 기록만으로는, 약속한 온체인 액션이 실행됐는지 알 수 없습니다."
      }),
      view("p", {
        className: "giwa-demo-promise",
        text: "GIWA Verified Intent Rail은 실행 전 Manifest와 실제 GIWA 트랜잭션을 대조합니다."
      })
    ]),
    view("ol", { className: "giwa-demo-proof-path" },
      labels.map((label, index) =>
        view("li", {}, [
          view("span", {
            className: "giwa-demo-proof-index",
            text: String(index + 1).padStart(2, "0")
          }),
          view("strong", { text: label })
        ])
      )
    )
  ]);
}

function renderDemoPrepareSummary() {
  return view("dl", { className: "giwa-demo-stage-summary" }, [
    field("Network", "GIWA Sepolia 91342"),
    field(
      "Wallet",
      walletState.account === null ? "연결 필요" : shortHash(walletState.account)
    ),
    field(
      "Readiness",
      assetState.next === "deposit_ready" ? "준비 완료" : "확인 필요"
    )
  ]);
}

function renderDemoMismatchSummary() {
  return view("section", {
    className: "giwa-demo-mismatch",
    role: "status",
    "aria-live": "polite"
  }, [
    view("p", { className: "eyebrow", text: "Receipt not issued" }),
    view("h3", {
      text: "확인한 조건과 실행 결과가 달라 Receipt를 발급하지 않았습니다."
    }),
    view("p", {
      className: "muted",
      text: mismatchDisplayCopy(runState?.failureCode)
    }),
    view("dl", { className: "giwa-demo-stage-summary" }, [
      field("Manifest match", "Not matched"),
      field("Receipt", "발급되지 않음")
    ])
  ]);
}

function renderDemoReceiptSummary() {
  if (runState?.status === "mismatched" || runState?.status === "failed") {
    return renderDemoMismatchSummary();
  }
  const receiptReady = Boolean(runState?.receiptHash);
  return view("dl", { className: "giwa-demo-stage-summary" }, [
    field(
      "Standard RPC",
      runState?.depositTxHash ? "증거 확인 중 또는 완료" : "실행 후 확인"
    ),
    field("Field match", receiptReady ? "4 / 4 matched" : "대기 중"),
    field(
      "Receipt",
      receiptReady ? shortHash(runState.receiptHash) : "일치 후 공개"
    )
  ]);
}

function renderDemoGuidedFlow(actions, action) {
  const stages = demoProgressStages();
  const activeStage =
    stages.find(([, , , state]) => state === "attention") ??
    stages.find(([, , , state]) => state === "current") ??
    stages.find(([, , , state]) => state === "locked") ??
    stages[stages.length - 1];

  return view(
    "ol",
    {
      className: "giwa-demo-guided-flow",
      "aria-label": "데모 진행 단계"
    },
    stages.map(([id, label, detail, state], index) => {
      const isActionStage = id === activeStage?.[0];
      const stateLabel = {
        current: "현재",
        complete: "완료",
        attention: "확인 필요",
        locked: "잠김"
      }[state];
      const content =
        id === "prepare"
          ? renderDemoPrepareSummary()
          : id === "execute"
            ? renderIntentPanel()
            : renderDemoReceiptSummary();

      return view("li", {
        className: `giwa-demo-stage ${state}`,
        "data-demo-stage": id,
        "aria-current": isActionStage ? "step" : null
      }, [
        view("div", { className: "giwa-demo-stage-meta" }, [
          view("span", {
            className: "giwa-demo-stage-index",
            text: `STEP ${String(index + 1).padStart(2, "0")}`
          }),
          view("em", {
            className: "giwa-demo-stage-state",
            text: stateLabel
          })
        ]),
        view("div", { className: "giwa-demo-stage-heading" }, [
          view("h2", { text: label }),
          view("p", { text: detail })
        ]),
        view("div", { className: "giwa-demo-stage-content" }, [content]),
        ...(isActionStage
          ? [
              view("p", {
                className: "notice",
                role: "status",
                "aria-live": "polite",
                "aria-atomic": "true",
                text: notice
              }),
              view("div", {
                className: "hero-actions user-cta-cluster",
                "data-current-action": action
              }, actions)
            ]
          : [])
      ]);
    })
  );
}

function renderExpectedSteps() {
  return view("ol", { className: "user-step-list" }, [
    view("li", { text: "지갑과 테스트 자산 상태 확인" }),
    view("li", { text: "Manifest에 고정된 조건 검토 후 실행" }),
    view("li", { text: "Standard RPC 증거가 일치하면 Receipt 확인" })
  ]);
}

function displayMockAmount(value) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/u.test(value)) return "확인 중";
  const baseUnits = BigInt(value);
  const decimals = 10n ** 18n;
  const whole = baseUnits / decimals;
  const fraction = (baseUnits % decimals)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/u, "");
  return `${whole}${fraction.length > 0 ? `.${fraction}` : ""} Mock Token`;
}

function formatExpiry(expiryUnix) {
  if (!Number.isSafeInteger(expiryUnix) || expiryUnix <= 0) return "Manifest 발급 후 60분";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(expiryUnix * 1_000));
}

function missionPreview() {
  if (runState?.manifestPreview) return runState.manifestPreview;
  if (publicConfig === null) return null;
  return {
    target: publicConfig.contracts.mockVault,
    selector: DEPOSIT_SELECTOR,
    asset: publicConfig.contracts.mockToken,
    amountBaseUnits: publicConfig.demoAmountBaseUnits,
    spender: publicConfig.contracts.mockVault,
    maxAllowanceBaseUnits: publicConfig.demoAmountBaseUnits,
    expiryUnix: null,
    intentHash: null
  };
}

function renderJourneyNarrative() {
  return view("ol", {
    className: "journey-narrative",
    "aria-label": "서명과 실행 대조 방식"
  }, [
    view("li", {}, [
      view("strong", { text: "캠페인 서명" }),
      view("span", { text: "캠페인이 이 실행 조건에 서명했습니다." })
    ]),
    view("li", {}, [
      view("strong", { text: "지갑 실행" }),
      view("span", { text: "참여자는 지갑에서 실제 트랜잭션에 서명합니다." })
    ]),
    view("li", {}, [
      view("strong", { text: "독립 대조" }),
      view("span", { text: "GIWA Verified Intent Rail이 두 기록을 대조합니다." })
    ])
  ]);
}

function renderJourneyConditionTable() {
  const preview = missionPreview();
  const signed = runState?.campaignSigned === true;
  if (preview === null) {
    return view("section", { className: "journey-condition-card" }, [
      view("p", { className: "eyebrow", text: "발급 전 미리보기" }),
      view("h2", { text: "미션 조건을 불러오는 중입니다" }),
      view("p", {
        className: "muted",
        text: "지갑 연결 없이 공개 미션 정보를 먼저 확인할 수 있습니다."
      })
    ]);
  }

  return view("section", { className: "journey-condition-card" }, [
    view("div", { className: "journey-section-heading" }, [
      view("div", {}, [
        view("p", {
          className: "eyebrow",
          text: signed ? "Campaign-signed Manifest" : "발급 전 미리보기"
        }),
        view("h2", { text: "Mock Vault에 테스트 자산 1개 예치" })
      ]),
      view("span", {
        className: `journey-signature-state ${signed ? "is-signed" : ""}`,
        text: signed ? "캠페인 서명 확인됨" : "Manifest 발급 전"
      })
    ]),
    view("p", {
      className: signed ? "notice" : "muted",
      text: signed
        ? "캠페인이 이 실행 조건에 서명했습니다."
        : "아래 조건은 공개 미션 미리보기이며 아직 서명된 실행 증거가 아닙니다."
    }),
    view("dl", { className: "journey-condition-table" }, [
      field("네트워크", "GIWA Sepolia · Testnet"),
      field("실행", "Mock Vault deposit"),
      field("수량", displayMockAmount(preview.amountBaseUnits)),
      field("유효 시간", formatExpiry(preview.expiryUnix))
    ]),
    view("details", { className: "panel user-technical-details" }, [
      view("summary", { text: "Technical details" }),
      field("Target", preview.target),
      field("Asset", preview.asset),
      field("Selector", preview.selector ?? DEPOSIT_SELECTOR),
      field("Spender", preview.spender),
      field("Max allowance", preview.maxAllowanceBaseUnits),
      field("Intent hash", preview.intentHash ?? "Manifest 발급 후 생성")
    ])
  ]);
}

function renderJourneyMatchTable(options = {}) {
  const recordedMismatch = options.recordedMismatch === true;
  const mismatched =
    recordedMismatch ||
    runState?.status === "mismatched" ||
    runState?.status === "notMatched" ||
    runState?.status === "failed";
  const matched = runState?.status === "matched" && Boolean(runState?.receiptHash);
  const waitingLabel = runState?.depositTxHash ? "대조 중" : "실행 후 대조";
  const rows = [
    ["지갑", recordedMismatch ? "조건 일치" : matched ? "일치" : waitingLabel, "wallet"],
    ["실행 대상", mismatched ? "불일치" : matched ? "일치" : waitingLabel, "target"],
    ["자산과 수량", recordedMismatch ? "조건 일치" : matched ? "일치" : waitingLabel, "asset"],
    ["블록 증거", recordedMismatch ? "기록됨" : matched ? "확인됨" : waitingLabel, "block"]
  ];

  return view("section", { className: "journey-match-card" }, [
    view("div", { className: "journey-section-heading" }, [
      view("div", {}, [
        view("p", { className: "eyebrow", text: "Manifest ↔ GIWA transaction" }),
        view("h2", {
          text: mismatched
            ? "조건이 달라 Receipt를 발급하지 않았습니다"
            : matched
              ? "모든 조건이 일치했습니다"
              : "실행 후 네 가지 조건을 대조합니다"
        })
      ]),
      view("span", {
        className: `journey-match-state ${mismatched ? "is-blocked" : matched ? "is-matched" : ""}`,
        text: mismatched ? "Not matched" : matched ? "Matched" : "Waiting"
      })
    ]),
    view("dl", { className: "journey-match-table" },
      rows.map(([label, value, key]) =>
        view("div", {
          className: `journey-match-row ${mismatched && key === "target" ? "is-blocked" : ""}`
        }, [
          view("dt", { text: label }),
          view("dd", { text: value })
        ])
      )
    ),
    ...(mismatched
      ? [
          view("p", {
            className: "journey-mismatch-note",
            text: recordedMismatch
              ? "통제된 대조 결과: Matched Receipt 없음"
              : mismatchDisplayCopy(runState?.failureCode)
          })
        ]
      : [])
  ]);
}

function renderJourneyRail(projection) {
  const stateLabels = {
    complete: "완료",
    active: "현재",
    blocked: "불일치",
    pending: "대기"
  };
  return view("ol", {
    className: "journey-stage-rail",
    "aria-label": "참여 여정"
  }, projection.stages.map((stage, index) => {
    const [label, detail] = journeyStageCopy[stage.id];
    return view("li", {
      className: `journey-stage-item ${stage.state}`,
      "aria-current": stage.state === "active" ? "step" : null
    }, [
      view("span", { className: "journey-stage-number", text: String(index + 1).padStart(2, "0") }),
      view("div", {}, [
        view("strong", { text: label }),
        view("span", { text: detail })
      ]),
      view("em", { text: stateLabels[stage.state] })
    ]);
  }));
}

function renderJourneyCanvas(projection, actions, action) {
  const activeStage = projection.activeStage;
  const stageContent = {
    prepare: () => renderActionSummary(),
    signedMission: () => renderJourneyConditionTable(),
    execute: () => renderIntentPanel(),
    match: () => renderJourneyMatchTable(),
    collect: () => renderDemoReceiptSummary()
  }[activeStage]();

  return view("section", { className: "journey-shell" }, [
    renderJourneyRail(projection),
    view("div", { className: "journey-canvas" }, [
      renderJourneyNarrative(),
      view("div", { className: "journey-current-stage" }, [stageContent]),
      view("p", {
        className: "notice",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        text: notice
      }),
      view("div", {
        className: "hero-actions user-cta-cluster",
        "data-current-action": action
      }, actions)
    ])
  ]);
}

function renderProtocolTopBar(activeView) {
  const protocolViews = new Set(["mission", "execution", "receipt"]);
  return globalThis.GiwaProtocolDossier.createHeader(document, {
    activeView: protocolViews.has(activeView) ? activeView : "mission",
    walletLabel:
      walletState.account === null
        ? "지갑 미연결"
        : shortHash(walletState.account)
  });
}

function renderPublicJourney(stages) {
  const copy = {
    mission: ["조건 확인", "캠페인 약속"],
    execution: ["지갑 실행", "직접 승인"],
    receipt: ["결과 공개", "Receipt 발급"]
  };
  return view(
    "ol",
    {
      className: "protocol-public-journey",
      "aria-label": "조건 확인, 지갑 실행, 결과 공개"
    },
    stages.map((stage, index) => {
      const [label, detail] = copy[stage.id];
      return view(
        "li",
        {
          className: stage.state,
          "aria-current": stage.state === "active" ? "step" : null
        },
        [
          view("strong", {
            text: `${String(index + 1).padStart(2, "0")}  ${label}`
          }),
          view("span", { text: detail })
        ]
      );
    })
  );
}

function renderMissionConditionRows(preview) {
  const amount =
    preview?.amountBaseUnits ?? publicConfig?.demoAmountBaseUnits ?? null;
  const maxApproval =
    preview?.maxAllowanceBaseUnits ??
    publicConfig?.demoAmountBaseUnits ??
    null;
  const rows = [
    ["네트워크", "GIWA Sepolia · Testnet"],
    ["실행", "Mock Vault deposit"],
    ["대상", shortHash(preview?.target)],
    ["수량", amount === null ? "확인 중" : displayMockAmount(amount)],
    [
      "최대 승인",
      maxApproval === null ? "확인 중" : displayMockAmount(maxApproval)
    ],
    ["예상 시간", "약 30초"]
  ];
  return view(
    "dl",
    {
      className: "mission-condition-list",
      "aria-label": "지갑 요청 전에 고정되는 조건"
    },
    rows.map(([label, value]) =>
      view("div", { className: "mission-condition-row" }, [
        view("dt", { text: label }),
        view("dd", {
          className:
            label === "대상" ? "mono hash-wrap" : "",
          text: value
        })
      ])
    )
  );
}

function renderPromisedReceipt() {
  return view("div", { className: "mission-receipt-preview" }, [
    view("div", {}, [
      view("strong", { text: "받게 될 결과 · Matched Receipt" }),
      view("span", { text: "4/4 조건 일치 필요" })
    ]),
    view("span", {
      className: "protocol-status-badge pending",
      text: "발급 조건"
    })
  ]);
}

function renderMissionCockpitPage(consoleState, actions) {
  const preview = missionPreview();
  return view(
    "section",
    {
      className: "protocol-screen protocol-mission",
      id: "main-content"
    },
    [
      view("div", { className: "protocol-mission-intro" }, [
        view("p", {
          className: "eyebrow",
          text: "MISSION 01 · MOCK VAULT DEPOSIT"
        }),
        view("h1", {}, [
          view("span", { text: "약속한 조건을 확인하고," }),
          view("span", { text: "내 지갑으로 실행합니다." })
        ]),
        view("p", {
          className: "lead",
          text: "캠페인이 고정한 실행 조건을 먼저 확인하세요. 내 지갑에서 동일한 조건으로 실행되면, 누구나 검증할 수 있는 Matched Receipt가 발급됩니다."
        }),
        renderPublicJourney(consoleState.publicStages),
        view("p", {
          className: "protocol-safety",
          text: "GIWA Sepolia 테스트넷 · Mock 자산만 사용 · 실제 자금 및 수익 없음"
        })
      ]),
      view("section", { className: "mission-cockpit" }, [
        view("header", { className: "mission-cockpit-header" }, [
          view("p", {
            className: "eyebrow",
            text: "MISSION 01 / MOCK VAULT"
          }),
          view("h2", { text: "테스트 자산 1개 예치" }),
          view("p", {
            className: "muted",
            text: "아래 조건은 지갑 요청 전에 고정됩니다."
          })
        ]),
        renderMissionConditionRows(preview),
        renderPromisedReceipt(),
        view(
          "div",
          {
            className: "protocol-primary-actions",
            "data-current-action": nextPrimaryAction()
          },
          actions
        ),
        view("p", {
          className: "protocol-action-notice",
          role: "status",
          "aria-live": "polite",
          "aria-atomic": "true",
          text: notice
        })
      ])
    ]
  );
}

function executionStageCopy(stage) {
  const copy = {
    prepare: ["실행 준비", "Manifest 조건 고정"],
    wallet: [
      stage.state === "complete" ? "지갑 승인 완료" : "지갑 승인 요청",
      runState?.approveTxHash
        ? `${shortHash(runState.approveTxHash)} · 정확한 수량 승인`
        : "1.0 Mock Token 승인"
    ],
    submit: [
      "트랜잭션 제출",
      runState?.depositTxHash
        ? `${shortHash(runState.depositTxHash)} · GIWA Sepolia`
        : "GIWA Sepolia 제출 대기"
    ],
    match: [
      stage.state === "blocked"
        ? "조건 불일치"
        : stage.state === "complete"
          ? "조건 대조 완료"
          : stage.state === "active"
            ? "조건 대조 중"
            : "조건 대조",
      "지갑 · 대상 · 자산 · 수량을 Manifest와 비교"
    ],
    receipt: ["Receipt 발급", "4/4 조건 일치 시 공개 기록 생성"]
  };
  return copy[stage.id];
}

function executionStateLabel(state) {
  return {
    complete: "검증 완료",
    active: "검증 중",
    blocked: "중단",
    pending: "대기"
  }[state];
}

function renderExecutionLifecycle(stages) {
  return view("section", { className: "execution-lifecycle" }, [
    view("header", { className: "execution-panel-heading" }, [
      view("div", {}, [
        view("h2", { text: "실행 상태" }),
        view("p", {
          className: "muted",
          text: "체인 이벤트가 확인될 때마다 다음 단계가 열립니다."
        })
      ]),
      view("span", {
        className: "mono execution-progress",
        text: `${String(
          Math.max(
            1,
            stages.findIndex((stage) =>
              ["active", "blocked"].includes(stage.state)
            ) + 1
          )
        ).padStart(2, "0")} / 05`
      })
    ]),
    view(
      "ol",
      { className: "execution-stage-list" },
      stages.map((stage, index) => {
        const [title, detail] = executionStageCopy(stage);
        return view("li", { className: `execution-stage ${stage.state}` }, [
          view("span", {
            className: "mono execution-stage-index",
            text: String(index + 1).padStart(2, "0")
          }),
          view("div", { className: "execution-stage-copy" }, [
            view("strong", { text: title }),
            view("span", { text: detail })
          ]),
          view("span", {
            className: `protocol-status-badge ${stage.state}`,
            text: executionStateLabel(stage.state)
          })
        ]);
      })
    )
  ]);
}

function renderLiveEvidencePanel(actions) {
  const transactionHash = runState?.depositTxHash ?? null;
  const explorerUrl = explorerTxUrl(transactionHash);
  const evidence = [
    ["네트워크", "GIWA Sepolia"],
    ["트랜잭션", transactionHash ? shortHash(transactionHash) : "제출 대기"],
    ["블록", runState?.status === "matched" ? "확인됨" : "관찰 중"],
    ["Manifest", shortHash(runState?.intentHash)]
  ];
  const panelActions = [...actions];
  if (explorerUrl !== null) {
    panelActions.push(
      view("a", {
        className: "secondary-link",
        href: explorerUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        text: "GIWA Explorer에서 보기"
      })
    );
  }
  return view("aside", { className: "execution-evidence" }, [
    view("header", { className: "execution-panel-heading" }, [
      view("h2", { text: "체인 증거" }),
      view("span", {
        className: "protocol-live-label",
        text: "LIVE"
      })
    ]),
    view(
      "dl",
      { className: "execution-evidence-list" },
      evidence.map(([label, value]) =>
        view("div", {}, [
          view("dt", { text: label }),
          view("dd", { className: "mono hash-wrap", text: value })
        ])
      )
    ),
    view("div", { className: "execution-match-rule" }, [
      view("strong", { text: "Receipt 발급 조건" }),
      view("p", {
        text: "대상 · 액션 · 자산 · 수량 중 하나라도 다르면 Receipt는 발급되지 않습니다."
      }),
      view("span", {
        className: "mono",
        text: `manifest  ${shortHash(runState?.intentHash)}`
      })
    ]),
    view(
      "div",
      {
        className: "protocol-primary-actions execution-actions",
        "data-current-action": nextPrimaryAction()
      },
      panelActions
    ),
    view("p", {
      className: "protocol-action-notice",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      text: notice
    })
  ]);
}

function renderReceiptUnlockPreview(consoleState) {
  const receiptStage = consoleState.executionStages.find(
    (stage) => stage.id === "receipt"
  );
  const state = receiptStage?.state ?? "pending";
  return view("section", { className: "execution-receipt-preview" }, [
    view("div", {}, [
      view("strong", { text: "다음 · Matched Receipt 공개" }),
      view("span", {
        text: "4/4 조건 대조가 끝나면 검증 가능한 실행 기록이 열립니다."
      })
    ]),
    view("span", {
      className: `protocol-status-badge ${state}`,
      text: executionStateLabel(state)
    })
  ]);
}

function renderLiveExecutionPage(consoleState, actions) {
  return view(
    "section",
    {
      className: "protocol-screen protocol-execution",
      id: "main-content"
    },
    [
      view("header", { className: "protocol-screen-heading" }, [
        view("p", {
          className: "eyebrow",
          text: "LIVE EXECUTION / GIWA SEPOLIA"
        }),
        view("h1", {}, [
          view("span", { text: "지갑 승인부터 Receipt 발급까지," }),
          view("span", { text: "모든 단계를 공개합니다." })
        ])
      ]),
      renderPublicJourney(consoleState.publicStages),
      view("div", { className: "execution-workspace" }, [
        renderExecutionLifecycle(consoleState.executionStages),
        renderLiveEvidencePanel(actions)
      ]),
      renderReceiptUnlockPreview(consoleState)
    ]
  );
}

function renderRecordedMismatchPage() {
  app.textContent = "";
  app.append(
    renderDemoTopBar(),
    view("section", { className: "giwa-demo-frame", id: "main-content" }, [
      view("header", { className: "giwa-demo-intro" }, [
        view("div", { className: "giwa-demo-intro-heading" }, [
          view("p", { className: "eyebrow", text: "Recorded negative control" }),
          view("h1", {}, [
            view("span", { text: "조건이 다르면," }),
            view("span", { text: "Receipt는 열리지 않습니다." })
          ])
        ]),
        view("p", {
          className: "lead",
          text: "실제 참여 기록이 아닌 통제된 데모 시나리오입니다."
        })
      ]),
      view("section", { className: "journey-shell" }, [
        renderJourneyRail(projectJourneyStageState({
          missionReviewed: true,
          manifestReady: true,
          depositSubmitted: true,
          verifying: false,
          mismatched: true,
          receiptReady: false
        })),
        view("div", { className: "journey-canvas" }, [
          renderJourneyNarrative(),
          renderJourneyMatchTable({ recordedMismatch: true }),
          view("article", {
            className: "notice negative-control-card",
            "aria-labelledby": "negative-control-heading"
          }, [
            view("p", { className: "eyebrow", text: "Recorded negative control" }),
            view("h2", {
              id: "negative-control-heading",
              text: "불일치 대조 예시"
            }),
            view("p", {
              text: "Manifest는 하나의 실행 대상을 기대했지만, 통제된 실행은 다른 대상을 사용했습니다."
            }),
            view("p", {
              text: "검증기는 Matched Receipt를 발급하지 않았습니다."
            }),
            view("p", {
              text: "따라서 정확한 해시의 공개 Receipt 조회는 사용할 수 없습니다."
            })
          ]),
          view("div", { className: "hero-actions" }, [
            view("a", { className: "secondary-link", href: "/giwa-demo", text: "다시 실행" })
          ])
        ])
      ])
    ])
  );
}

function renderActionSummary() {
  return view("section", { className: "panel user-action-summary" }, [
    view("p", { className: "eyebrow", text: "Action summary" }),
    view("h2", { text: "이번 데모에서 실행할 액션" }),
    view("div", { className: "user-gate-grid" }, [
      view("div", { className: "user-gate-card" }, [
        view("span", { className: "field-label", text: "Network" }),
        view("strong", { text: "GIWA Sepolia" }),
        view("span", { className: "muted", text: "Chain 91342" })
      ]),
      view("div", { className: "user-gate-card" }, [
        view("span", { className: "field-label", text: "Wallet" }),
        view("strong", { text: walletState.account === null ? "연결 필요" : shortHash(walletState.account) }),
        view("span", { className: "muted", text: walletCopy() })
      ]),
      view("div", { className: "user-gate-card" }, [
        view("span", { className: "field-label", text: "Readiness" }),
        view("strong", { text: assetState.next === "deposit_ready" ? "준비 완료" : "확인 필요" }),
        view("span", { className: "muted", text: assetCopy() })
      ]),
      view("div", { className: "user-gate-card" }, [
        view("span", { className: "field-label", text: "Receipt" }),
        view("strong", { text: runState?.receiptHash ? shortHash(runState.receiptHash) : "검증 후 공개" }),
        view("span", { className: "muted", text: "Manifest matched 액션만 공개" })
      ])
    ]),
    renderExpectedSteps()
  ]);
}

function renderIntentPanel() {
  const preview = runState?.manifestPreview ?? null;
  if (preview === null) {
    return renderJourneyConditionTable();
  }

  return view("section", { className: "panel user-intent-panel" }, [
    view("p", { className: "eyebrow", text: "Campaign-signed Manifest" }),
    view("h2", { text: "Mock Vault에 테스트 자산 1개 예치" }),
    view("p", { className: "notice", text: "캠페인이 이 실행 조건에 서명했습니다. 실제 자산이나 수익은 사용하지 않는 테스트넷 미션입니다." }),
    field("Network", "GIWA Sepolia 91342"),
    field("Amount", displayMockAmount(preview.amountBaseUnits)),
    field("Valid until", formatExpiry(preview.expiryUnix)),
    view("details", { className: "panel user-technical-details" }, [
      view("summary", { text: "Technical details" }),
      field("Target", preview.target),
      field("Asset", preview.asset),
      field("Selector", preview.selector ?? DEPOSIT_SELECTOR),
      field("Run", runState.runId),
      field("Spender", preview.spender),
      field("Max allowance", preview.maxAllowanceBaseUnits),
      field("Expiry", preview.expiryUnix ?? runState.expiryUnix),
      field("Wallet", runState.wallet),
      field("Intent hash", preview.intentHash),
      field("Approve transaction", runState.approveTxHash ?? "필요 여부 확인 중"),
      field("Deposit transaction", runState.depositTxHash ?? "아직 제출하지 않음")
    ])
  ]);
}

function renderActionPage() {
  if (isRecordedMismatchExample()) {
    renderRecordedMismatchPage();
    return;
  }
  const action = nextPrimaryAction();
  const demoRoute = isGiwaDemoRoute();
  const projection = journeyProjection();
  const consoleState = protocolConsoleProjection();
  const faucetLink = assetState.next === "gas_required" && publicConfig?.faucetHelpUrl
    ? view("a", { className: "secondary-link", href: publicConfig.faucetHelpUrl, target: "_blank", rel: "noopener noreferrer", text: "공식 Faucet 안내" })
    : null;
  const actions = [
    view("button", {
      type: "button",
      id: "user-primary-action",
      className: `user-primary-action ${inFlight ? "is-pending" : ""}`,
      disabled: inFlight,
      "aria-label": primaryLabel(),
      "aria-busy": inFlight ? "true" : "false",
      text: primaryLabel()
    })
  ];
  if (faucetLink !== null) actions.push(faucetLink);
  actions.push(
    view("a", { className: "secondary-link", href: "/user/help", text: "도움말" }),
    view("a", { className: "secondary-link", href: "/user/receipts", text: "내 Receipt" })
  );
  const protocolActions = [actions[0]];

  app.textContent = "";
  const actionPage = demoRoute
    ? view("section", { className: "giwa-demo-frame", id: "main-content" }, [
        view("header", { className: "giwa-demo-intro" }, [
          view("div", { className: "giwa-demo-intro-heading" }, [
            view("p", {
              className: "eyebrow",
              text: "GIWA Verified Intent Rail"
            }),
            view("h1", {}, [
              view("span", { text: "확인한 조건대로," }),
              view("span", { text: "실행됐는지 증명합니다." })
            ])
          ]),
          view("p", {
            className: "lead",
            text: "Manifest를 확인하고 GIWA Sepolia에서 실행하세요. 실제 트랜잭션이 조건과 모두 일치할 때만 Receipt가 열립니다."
          })
        ]),
        renderDemoJudgePromise(),
        renderJourneyCanvas(projection, actions, action)
      ])
    : consoleState.activeView === "mission"
      ? renderMissionCockpitPage(consoleState, protocolActions)
      : renderLiveExecutionPage(consoleState, protocolActions);

  app.append(
    ...(demoRoute
      ? [renderDemoTopBar(), actionPage]
      : [renderProtocolTopBar(consoleState.activeView), actionPage])
  );
  document.querySelector("#user-primary-action")?.addEventListener("click", onPrimaryAction);
}

async function connectWallet(currentProvider) {
  const context = captureContext();
  const accounts = await providerRequestWithContext(currentProvider, { method: "eth_requestAccounts" }, context);
  if (!Array.isArray(accounts) || accounts.length === 0) throw new Error("invalid_accounts");
  const account = normalizeAccount(accounts[0]);
  const chainId = parseChainId(
    await providerRequestWithTimeout(currentProvider, { method: "eth_chainId" }, context)
  );
  assertContext(context);
  walletState = { status: chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain", account, chainId };
  if (chainId === GIWA_CHAIN_ID) {
    await inspectWalletAssets(captureContext());
  }
}

async function switchToGiwa(currentProvider) {
  const context = captureContext();
  try {
    await providerRequestWithContext(
      currentProvider,
      { method: "wallet_switchEthereumChain", params: [{ chainId: GIWA_CHAIN_HEX }] },
      context
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 4902) {
      await providerRequestWithContext(
        currentProvider,
        { method: "wallet_addEthereumChain", params: [addChainRequest] },
        context
      );
    } else {
      throw error;
    }
  }
  const chainId = parseChainId(
    await providerRequestWithTimeout(currentProvider, { method: "eth_chainId" }, context)
  );
  assertContext(context);
  walletState = { ...walletState, status: chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain", chainId };
  if (chainId !== GIWA_CHAIN_ID) throw new Error("wrong_chain");
  await inspectWalletAssets(captureContext());
}

async function loadPublicConfig(context) {
  const { response, body } = await apiFetchJsonWithContext(context, "/api/public/config");
  assertContext(context);
  if (!response.ok) throw new Error("public_config_unavailable");
  publicConfig = requirePublicConfig(body);
  return publicConfig;
}

function evaluateAssetState(gasWei, tokenBalance, allowance, config) {
  const minGasWei = BigInt(config.minGasBalanceWei);
  const requiredAmount = BigInt(config.demoAmountBaseUnits);
  const approveRequired = allowance < requiredAmount;
  if (gasWei < minGasWei) return { next: "gas_required", approveRequired, gasWei, tokenBalance, allowance };
  if (tokenBalance < requiredAmount) return { next: "mint_required", approveRequired, gasWei, tokenBalance, allowance };
  if (approveRequired) return { next: "approval_required", approveRequired: true, gasWei, tokenBalance, allowance };
  return { next: "deposit_ready", approveRequired: false, gasWei, tokenBalance, allowance };
}

async function inspectWalletAssets(context) {
  assertContext(context);
  const currentProvider = provider();
  if (currentProvider === null || walletState.account === null || walletState.chainId !== GIWA_CHAIN_ID) {
    throw new Error("wallet_not_ready");
  }
  const config = publicConfig ?? (await loadPublicConfig(context));
  assertContext(context);
  if (runState !== null && !runMatchesContext(runState, walletState.account, config)) {
    const stale = beginContextChange();
    notice = publicNotice("context");
    render();
    await invalidateCapturedRun(stale, "restored_context_mismatch");
    throw new Error("context_changed");
  }
  if (
    walletTxState !== null &&
    (walletTxState.pendingMintWallet !== walletState.account || walletTxState.pendingMintChainId !== walletState.chainId)
  ) {
    walletTxState = null;
    writeWalletTxState(null);
  }
  const balanceData = `${BALANCE_OF_SELECTOR}${encodeAddressWord(walletState.account)}`;
  const allowanceData = `${ALLOWANCE_SELECTOR}${encodeAddressWord(walletState.account)}${encodeAddressWord(config.contracts.mockVault)}`;
  const gasRaw = await providerRequestWithTimeout(
    currentProvider,
    { method: "eth_getBalance", params: [walletState.account, "latest"] },
    context
  );
  const tokenRaw = await providerRequestWithTimeout(
    currentProvider,
    { method: "eth_call", params: [{ to: publicConfig.contracts.mockToken, data: balanceData }, "latest"] },
    context
  );
  const allowanceRaw = await providerRequestWithTimeout(
    currentProvider,
    { method: "eth_call", params: [{ to: publicConfig.contracts.mockToken, data: allowanceData }, "latest"] },
    context
  );
  assertContext(context);
  assetState = evaluateAssetState(parseRpcQuantity(gasRaw), parseAbiUint256(tokenRaw), parseAbiUint256(allowanceRaw), config);
  return assetState;
}

function mintCalldata(to, amountBaseUnits) {
  return `${MINT_SELECTOR}${encodeAddressWord(to)}${encodeUint256Word(amountBaseUnits, true)}`;
}

function approveCalldata(preview) {
  if (preview.maxAllowanceBaseUnits !== preview.amountBaseUnits) throw new Error("approval_not_exact");
  return `${APPROVE_SELECTOR}${encodeAddressWord(preview.spender)}${encodeUint256Word(preview.maxAllowanceBaseUnits, true)}`;
}

function depositCalldata(preview) {
  return `${DEPOSIT_SELECTOR}${encodeAddressWord(preview.asset)}${encodeUint256Word(preview.amountBaseUnits, true)}`;
}

async function sendWalletTransaction(request, context) {
  const currentProvider = provider();
  if (currentProvider === null) throw new Error("wallet_missing");
  const hash = await providerRequestWithContext(
    currentProvider,
    { method: "eth_sendTransaction", params: [request] },
    context
  );
  assertContext(context);
  if (typeof hash !== "string" || !/^0x[a-fA-F0-9]{64}$/u.test(hash)) throw new Error("invalid_hash");
  return hash.toLowerCase();
}

function parseTransactionReceipt(value, requestedHash) {
  if (value === null) return "pending";
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_receipt");
  if (typeof value.transactionHash !== "string" || !/^0x[a-fA-F0-9]{64}$/u.test(value.transactionHash)) {
    throw new Error("invalid_receipt");
  }
  if (value.transactionHash.toLowerCase() !== requestedHash.toLowerCase()) throw new Error("receipt_hash_mismatch");
  if (value.status === "0x1") return "success";
  if (value.status === "0x0") return "reverted";
  throw new Error("invalid_receipt_status");
}

async function waitForSuccessfulTransactionReceipt(transactionHash, context) {
  const currentProvider = provider();
  if (currentProvider === null) throw new Error("wallet_missing");
  for (let attempt = 0; attempt < RECEIPT_POLL_MAX_ATTEMPTS; attempt += 1) {
    assertContext(context);
    const raw = await providerRequestWithTimeout(
      currentProvider,
      { method: "eth_getTransactionReceipt", params: [transactionHash] },
      context
    );
    assertContext(context);
    const status = parseTransactionReceipt(raw, transactionHash);
    if (status === "success") return;
    if (status === "reverted") throw new Error("transaction_reverted");
    if (attempt + 1 < RECEIPT_POLL_MAX_ATTEMPTS) await waitWithContext(RECEIPT_POLL_DELAY_MS, context);
  }
  throw new Error("transaction_receipt_timeout");
}

async function prepareMockToken(context) {
  assertContext(context);
  if (walletState.account === null || publicConfig === null) throw new Error("wallet_not_ready");
  let transactionHash = walletTxState?.pendingMintTxHash ?? null;
  if (transactionHash === null) {
    transactionHash = await sendWalletTransaction(
      {
        from: walletState.account,
        to: publicConfig.contracts.mockToken,
        data: mintCalldata(walletState.account, publicConfig.demoAmountBaseUnits),
        value: "0x0"
      },
      context
    );
    assertContext(context);
    walletTxState = {
      pendingMintTxHash: transactionHash,
      pendingMintWallet: walletState.account,
      pendingMintChainId: walletState.chainId
    };
    writeWalletTxState(walletTxState);
  }
  try {
    await waitForSuccessfulTransactionReceipt(transactionHash, context);
  } catch (error) {
    if (error instanceof Error && error.message === "transaction_reverted" && contextIsCurrent(context)) {
      walletTxState = null;
      writeWalletTxState(null);
    }
    throw error;
  }
  assertContext(context);
  walletTxState = null;
  writeWalletTxState(null);
  await inspectWalletAssets(context);
  if (assetState.next === "mint_required") throw new Error("mint_balance_unchanged");
  notice = "Mock Token 준비를 확인했습니다. 다음 단계에서 Manifest를 검토하세요.";
}

async function issueManifest() {
  const context = captureContext();
  if (walletState.account === null || walletState.chainId !== GIWA_CHAIN_ID) throw new Error("wallet_not_ready");
  if (assetState.next !== "approval_required" && assetState.next !== "deposit_ready") throw new Error("assets_not_ready");
  const expectedContext = { account: context.account, config: publicConfig };
  const { response, body } = await apiFetchJsonWithContext(context, "/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet: context.account,
      chainId: context.chainId,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null
    })
  });
  assertContext(context);
  const issuedRun = response.ok ? projectIssuedRun(body, expectedContext) : null;
  if (issuedRun === null) {
    const invalidation = projectInvalidationIdentity(body);
    writeSessionRun(null);
    if (invalidation !== null) await invalidateCapturedRun(invalidation, "invalid_issue_response");
    assertContext(context);
    throw new Error("manifest_issue_failed");
  }
  assertContext(context);
  runState = issuedRun;
  writeSessionRun(runState);
  notice = "Manifest가 준비되었습니다. 지갑, target, asset, 수량과 만료 시간을 검토하세요.";
}

async function approveExactAmount(context) {
  assertContext(context);
  if (!runState?.manifestPreview || walletState.account === null) throw new Error("manifest_missing");
  await inspectWalletAssets(context);
  let localRun = requireContextRun(context);
  let approveTxHash = runState.pendingApproveTxHash;
  if (assetState.next === "deposit_ready" && approveTxHash === null) {
    runState = projectSessionRun({ ...localRun, approveTxHash: null, pendingApproveTxHash: null });
    if (runState === null) throw new Error("invalid_run_state");
    writeSessionRun(runState);
    notice = "기존 allowance가 충분해 별도 승인 없이 예치 단계로 이동합니다.";
    return;
  }
  if (approveTxHash === null && assetState.next !== "approval_required") throw new Error("approval_not_ready");
  const preview = localRun.manifestPreview;
  if (approveTxHash === null) {
    approveTxHash = await sendWalletTransaction(
      {
        from: walletState.account,
        to: preview.asset,
        data: approveCalldata(preview),
        value: "0x0"
      },
      context
    );
    localRun = requireContextRun(context);
    runState = projectSessionRun({
      ...localRun,
      status: "approveSubmitted",
      pendingApproveTxHash: approveTxHash
    });
    if (runState === null) throw new Error("invalid_run_state");
    writeSessionRun(runState);
  }
  try {
    await waitForSuccessfulTransactionReceipt(approveTxHash, context);
  } catch (error) {
    if (error instanceof Error && error.message === "transaction_reverted" && contextIsCurrent(context)) {
      localRun = requireContextRun(context);
      runState = projectSessionRun({ ...localRun, pendingApproveTxHash: null });
      if (runState !== null) writeSessionRun(runState);
    }
    throw error;
  }
  await inspectWalletAssets(context);
  if (assetState.next !== "deposit_ready") throw new Error("allowance_not_updated");
  localRun = requireContextRun(context);
  runState = projectSessionRun({
    ...localRun,
    approveTxHash,
    pendingApproveTxHash: null,
    status: "approveSubmitted"
  });
  if (runState === null) throw new Error("invalid_run_state");
  writeSessionRun(runState);
  notice = "정확한 데모 수량 승인을 확인했습니다. 다음 단계에서 Vault에 예치하세요.";
}

async function ensureEvidenceSubmitted(context) {
  let localRun = requireContextRun(context);
  if (!localRun.depositTxHash) throw new Error("evidence_missing");
  if (localRun.evidenceSubmitted) return localRun;
  const { response, body } = await participantFetch(
    localRun,
    `/api/runs/${localRun.runId}/evidence`,
    {
      method: "POST",
      body: JSON.stringify({
        approveTxHash: localRun.approveTxHash ?? null,
        depositTxHash: localRun.depositTxHash
      })
    },
    context
  );
  assertContext(context);
  if (!response.ok) throw new Error("evidence_submit_failed");
  localRun = requireContextRun(context);
  const merged = mergeRunResponse(localRun, body);
  if (merged === null) throw new Error("invalid_evidence_response");
  runState = projectSessionRun({ ...merged, evidenceSubmitted: true });
  if (runState === null) throw new Error("invalid_run_state");
  writeSessionRun(runState);
  storeReceiptProjection("pending");
  return runState;
}

function verificationDecision(body) {
  const value = body?.decision ?? body?.status;
  if (value === "matched" || value === "mismatched" || value === "failed" || value === "timeout") return value;
  if (body?.verification?.status === "retryable" || body?.verification?.status === "queued") return "timeout";
  return "timeout";
}

function matchedReceiptOutcome(value) {
  const receiptHash = typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value) ? value.toLowerCase() : null;
  return { receiptHash, navigate: receiptHash !== null };
}

async function verifyAutomatically(context) {
  await ensureEvidenceSubmitted(context);
  if (!runState?.runId || !runState.depositTxHash) throw new Error("verification_missing");
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    const localRun = requireContextRun(context);
    runState = projectSessionRun({ ...localRun, status: "verifying" });
    if (runState === null) throw new Error("invalid_run_state");
    writeSessionRun(runState);
    notice = `Standard RPC 검증 중입니다. ${attempt}/${VERIFY_MAX_ATTEMPTS}`;
    render();
    const { response, body } = await participantFetch(
      localRun,
      `/api/runs/${localRun.runId}/verify`,
      {
        method: "POST",
        body: JSON.stringify({})
      },
      context
    );
    assertContext(context);
    if (!response.ok) throw new Error("verification_request_failed");
    const decision = verificationDecision(body);
    const currentRun = requireContextRun(context);
    const merged = mergeRunResponse(currentRun, body);
    if (merged === null) throw new Error("invalid_verification_response");
    runState = projectSessionRun({
      ...merged,
      status: decision === "timeout" ? "verifying" : decision
    });
    if (runState === null) throw new Error("invalid_run_state");
    writeSessionRun(runState);
    if (decision === "matched") {
      const outcome = matchedReceiptOutcome(runState.receiptHash);
      runState = projectSessionRun({ ...runState, status: "matched", receiptHash: outcome.receiptHash });
      if (runState === null) throw new Error("invalid_run_state");
      writeSessionRun(runState);
      if (outcome.navigate) {
        storeReceiptProjection("verified");
        notice = "Manifest matched. 공개 Receipt가 준비되었습니다.";
        location.assign(`/user/receipt/${outcome.receiptHash}`);
      } else {
        notice = "Manifest matched 결과를 받았지만 공개 Receipt를 열 수 없습니다. 같은 버튼으로 검증만 다시 시도해 주세요.";
      }
      return;
    }
    if (decision === "mismatched" || decision === "failed") {
      storeReceiptProjection("notMatched");
      notice = mismatchDisplayCopy(runState.failureCode);
      return;
    }
    if (attempt < VERIFY_MAX_ATTEMPTS) await waitWithContext(VERIFY_RETRY_DELAY_MS, context);
  }
  notice = "자동 검증 대기 한도에 도달했습니다. 같은 버튼으로 Standard RPC 검증만 다시 시도할 수 있습니다.";
}

async function depositFromManifest(context) {
  assertContext(context);
  if (!runState?.manifestPreview || walletState.account === null) throw new Error("manifest_missing");
  if (isExpired()) throw new Error("manifest_expired");
  await inspectWalletAssets(context);
  let localRun = requireContextRun(context);
  if (assetState.next === "approval_required" && !runState.approveTxHash) throw new Error("approval_required");
  if (assetState.next !== "deposit_ready") throw new Error("deposit_not_ready");
  const preview = localRun.manifestPreview;
  const depositTxHash = await sendWalletTransaction(
    {
      from: walletState.account,
      to: preview.target,
      data: depositCalldata(preview),
      value: "0x0"
    },
    context
  );
  localRun = requireContextRun(context);
  runState = projectSessionRun({
    ...localRun,
    depositTxHash,
    status: "depositSubmitted",
    evidenceSubmitted: false
  });
  if (runState === null) throw new Error("invalid_run_state");
  writeSessionRun(runState);
  await ensureEvidenceSubmitted(context);
  await verifyAutomatically(context);
}

async function onPrimaryAction() {
  if (inFlight) return;
  if (isExpired()) {
    let expiryContext = captureContext();
    inFlight = true;
    render();
    try {
      expiryContext = await invalidateRun("manifest_expired");
      notice = "Manifest가 만료되어 이전 액션을 폐기했습니다. 새 Manifest를 검토해 주세요.";
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "context_changed") notice = publicNotice("recovery");
    } finally {
      if (contextIsCurrent(expiryContext)) {
        inFlight = false;
        render();
      }
    }
    return;
  }
  const action = nextPrimaryAction();
  let context = captureContext();
  const currentProvider = provider();
  if (
    currentProvider === null &&
    action !== "open_receipt" &&
    action !== "review_mission"
  ) {
    walletState = { status: "providerMissing", account: null, chainId: null };
    notice = publicNotice("wallet", "provider_missing");
    render();
    return;
  }

  inFlight = true;
  render();
  try {
    if (action === "review_mission") {
      missionReviewed = true;
      sessionStorage.setItem(USER_MISSION_REVIEW_KEY, "true");
      notice = "미션 조건을 확인했습니다. 이제 지갑을 연결해 참여할 수 있습니다.";
    } else if (action === "connect") {
      await connectWallet(currentProvider);
      context = captureContext();
    } else if (action === "switch_chain") {
      await switchToGiwa(currentProvider);
      context = captureContext();
    }
    else if (action === "open_faucet") {
      if (publicConfig === null || !isSafeHttpsUrl(publicConfig.faucetHelpUrl)) throw new Error("faucet_unavailable");
      window.open(publicConfig.faucetHelpUrl, "_blank", "noopener,noreferrer");
      notice = publicNotice("faucet");
      await inspectWalletAssets(context);
    } else if (action === "mint") await prepareMockToken(context);
    else if (action === "issue_manifest") {
      await issueManifest();
      context = captureContext();
    }
    else if (action === "approve") await approveExactAmount(context);
    else if (action === "deposit") await depositFromManifest(context);
    else if (action === "verify") await verifyAutomatically(context);
    else if (action === "open_receipt") location.assign(`/user/receipt/${runState.receiptHash}`);
  } catch (error) {
    const actionCommittedWalletContext =
      isGenerationCurrent(context) &&
      (context.account !== walletState.account || context.chainId !== walletState.chainId);
    if (error instanceof Error && error.message === "context_changed" && !isGenerationCurrent(context)) return;
    if (action === "connect") {
      notice = actionCommittedWalletContext ? publicNotice("readiness") : publicNotice("wallet", walletRequestFailureCode(error));
    }
    else if (action === "switch_chain") notice = publicNotice("network");
    else if (action === "open_faucet") notice = publicNotice("readiness");
    else if (action === "mint") notice = publicNotice("mint");
    else if (action === "issue_manifest") notice = publicNotice("manifest");
    else if (action === "approve") notice = publicNotice("approve");
    else if (action === "deposit") notice = publicNotice("deposit");
    else notice = publicNotice("verify");
  } finally {
    if (isGenerationCurrent(context)) {
      inFlight = false;
      render();
    }
  }
}

function receiptStateFromRun() {
  if (runState?.status === "matched" && runState?.receiptHash) return "verified";
  if (runState?.status === "failed" || runState?.status === "mismatched") return "notMatched";
  return "pending";
}

function upsertReceiptHistory(items, next) {
  const keys = (item) =>
    [item?.runId, item?.depositTxHash, item?.receiptHash]
      .filter((value) => typeof value === "string" && value.length > 0);
  const nextKeys = new Set(keys(next));
  const terminalStates = new Set(["verified", "notMatched"]);
  const existingTerminal =
    next?.state === "pending"
      ? items.find(
          (item) =>
            terminalStates.has(item?.state) &&
            keys(item).some((key) => nextKeys.has(key))
        )
      : undefined;
  if (existingTerminal !== undefined) return items.slice(0, 12);
  const filtered = items.filter(
    (item) => !keys(item).some((key) => nextKeys.has(key))
  );
  return [next, ...filtered].slice(0, 12);
}

function projectCampaignHandoffReceipt(items, next) {
  if (
    next?.state !== "verified" ||
    !/^0x[a-fA-F0-9]{64}$/u.test(next?.receiptHash ?? "")
  ) {
    return null;
  }
  const keys = (item) =>
    [item?.runId, item?.depositTxHash, item?.receiptHash]
      .filter((value) => typeof value === "string" && value.length > 0);
  const nextKeys = new Set(keys(next));
  const previous = items.filter((item) =>
    keys(item).some((key) => nextKeys.has(key))
  );
  return previous.length > 0 &&
    previous.every((item) => item?.state === "pending")
    ? next.receiptHash.toLowerCase()
    : null;
}

function storeReceiptProjection(state = receiptStateFromRun()) {
  const items = readReceiptHistory();
  const id =
    runState?.runId ??
    runState?.depositTxHash ??
    runState?.receiptHash;
  if (!id) return;
  const next = {
    id,
    runId: runState?.runId ?? null,
    state,
    actionName: runState?.manifestPreview?.actionName ?? "Mock vault 테스트넷 액션",
    receiptHash: runState?.receiptHash ?? null,
    depositTxHash: runState?.depositTxHash ?? null,
    networkName: "GIWA Sepolia",
    savedAt: new Date().toISOString()
  };
  const handoffReceiptHash = projectCampaignHandoffReceipt(items, next);
  const historyWritten = writeReceiptHistory(
    upsertReceiptHistory(items, next)
  );
  if (historyWritten && handoffReceiptHash !== null) {
    writeCampaignHandoffReceipt(handoffReceiptHash);
  }
}

function renderReceiptCard(item) {
  const href = item.receiptHash ? `/user/receipt/${item.receiptHash}` : "/user/help";
  return view("article", { className: "user-receipt-card" }, [
    view("p", { className: `status-pill ${item.state === "verified" ? "ready" : "blocked"}`, text: item.state }),
    view("h2", { text: item.actionName ?? "Mock vault 테스트넷 액션" }),
    field("Receipt", item.receiptHash ?? "검증 중"),
    field("Deposit", item.depositTxHash ?? "확인 중"),
    field("Network", item.networkName ?? "GIWA Sepolia"),
    field("Saved", item.savedAt ?? "이전 기록"),
    view("a", { className: "secondary-link", href, text: item.receiptHash ? "Receipt 열기" : "복구 안내" })
  ]);
}

function filterReceipts(items, filter) {
  if (filter === "all") return items;
  return items.filter((item) => item.state === filter);
}

function partitionReceiptHistory(items) {
  return {
    acquired: items.filter((item) => item.state === "verified"),
    recovery: items.filter((item) => item.state !== "verified")
  };
}

function renderReceiptHistorySection(title, description, items, emptyCopy) {
  return view("section", { className: "user-receipt-history-section" }, [
    view("div", { className: "section-heading" }, [
      view("div", {}, [
        view("h2", { text: title }),
        view("p", { className: "muted", text: description })
      ])
    ]),
    items.length === 0
      ? view("p", { className: "notice", text: emptyCopy })
      : view("div", { className: "proof-grid" }, items.map(renderReceiptCard))
  ]);
}

function renderReceiptsList() {
  const params = new URLSearchParams(location.search);
  const filter = params.get("filter") ?? "all";
  const items = filterReceipts(readReceiptHistory(), filter);
  const partitioned = partitionReceiptHistory(items);
  app.textContent = "";
  app.append(
    view("section", { className: "band user-list-band" }, [
      view("div", { className: "section-heading" }, [
        view("div", {}, [
          view("p", { className: "eyebrow", text: "Matched Receipts" }),
          view("h1", { text: "내 실행 기록" }),
          view("p", {
            className: "lead",
            text: "이 브라우저에 저장된 테스트넷 실행 기록입니다."
          })
        ]),
        view("a", { className: "secondary-link", href: "/user", text: "새 액션 시작" })
      ]),
      view("div", { className: "user-filter-row", "aria-label": "Receipt 상태 필터" }, [
        view("a", { className: "secondary-link", href: "/user/receipts?filter=all", text: "전체" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=verified", text: "Matched" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=pending", text: "검증 중" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=notMatched", text: "불일치" })
      ]),
      renderReceiptHistorySection(
        "획득한 Receipt",
        "Manifest와 실제 GIWA Sepolia 실행이 일치해 발급된 공개 기록입니다.",
        partitioned.acquired,
        filter === "all" || filter === "verified"
          ? "아직 획득한 Receipt가 없습니다."
          : "현재 필터에는 획득한 Receipt가 없습니다."
      ),
      renderReceiptHistorySection(
        "복구가 필요한 실행",
        "검증 중이거나 조건이 일치하지 않은 테스트넷 실행입니다.",
        partitioned.recovery,
        filter === "all" || filter !== "verified"
          ? "복구가 필요한 실행이 없습니다."
          : "Matched 필터에서는 복구 실행을 표시하지 않습니다."
      )
    ])
  );
}

function projectMatchedReceiptBody(body, expectedHash) {
  const hash = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value);
  const address = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value);
  const amount = (value) =>
    typeof value === "string" && /^(?:0|[1-9][0-9]{0,77})$/u.test(value);
  const safeInteger = (value) =>
    Number.isSafeInteger(value) && value >= 0;
  const safetyNotice = "Testnet-only. No real asset, no yield, no RWA claim.";

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    body.source !== "live" ||
    !hash(expectedHash) ||
    !hash(body.receiptHash) ||
    body.receiptHash.toLowerCase() !== expectedHash.toLowerCase() ||
    !hash(body.intentHash) ||
    !hash(body.verifierInputHash) ||
    body.standardRpcReceiptStatus !== 1 ||
    !safeInteger(body.depositBlockNumber) ||
    !hash(body.depositBlockHash) ||
    !safeInteger(body.confirmationDepth) ||
    body.testnetNotice !== safetyNotice
  ) {
    return null;
  }

  const payload = body.payload;
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.status !== "matched" ||
    payload.chainId !== 91342 ||
    payload.networkName !== "GIWA Sepolia" ||
    payload.actionType !== "mockVaultDeposit" ||
    !hash(payload.intentHash) ||
    payload.intentHash.toLowerCase() !== body.intentHash.toLowerCase() ||
    !address(payload.wallet) ||
    !address(payload.target) ||
    !address(payload.asset) ||
    !address(payload.spender) ||
    !amount(payload.amountBaseUnits) ||
    !amount(payload.maxAllowanceBaseUnits) ||
    !amount(payload.allowanceUsedBaseUnits) ||
    !hash(payload.depositTxHash) ||
    !safeInteger(payload.depositBlockNumber) ||
    !hash(payload.depositBlockHash) ||
    !safeInteger(payload.issuedAt) ||
    payload.depositBlockNumber !== body.depositBlockNumber ||
    payload.depositBlockHash.toLowerCase() !== body.depositBlockHash.toLowerCase() ||
    payload.safetyNotice !== safetyNotice
  ) {
    return null;
  }

  return {
    receiptHash: body.receiptHash.toLowerCase(),
    intentHash: body.intentHash.toLowerCase(),
    verifierInputHash: body.verifierInputHash.toLowerCase(),
    confirmationDepth: body.confirmationDepth,
    payload
  };
}

function keccak256Utf8(value) {
  const mask = (1n << 64n) - 1n;
  const rotations = [
    0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39,
    41, 45, 15, 21, 8, 18, 2, 61, 56, 14
  ];
  const constants = [
    0x0000000000000001n, 0x0000000000008082n,
    0x800000000000808an, 0x8000000080008000n,
    0x000000000000808bn, 0x0000000080000001n,
    0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008an, 0x0000000000000088n,
    0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn,
    0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n,
    0x000000000000800an, 0x800000008000000an,
    0x8000000080008081n, 0x8000000000008080n,
    0x0000000080000001n, 0x8000000080008008n
  ];
  const rotate = (lane, count) => {
    const shift = BigInt(count);
    return shift === 0n
      ? lane & mask
      : ((lane << shift) | (lane >> (64n - shift))) & mask;
  };
  const permute = (state) => {
    for (const roundConstant of constants) {
      const column = Array(5).fill(0n);
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          column[x] ^= state[x + 5 * y];
        }
      }
      const delta = column.map(
        (_, x) =>
          column[(x + 4) % 5] ^ rotate(column[(x + 1) % 5], 1)
      );
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          state[x + 5 * y] =
            (state[x + 5 * y] ^ delta[x]) & mask;
        }
      }
      const shifted = Array(25).fill(0n);
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          shifted[y + 5 * ((2 * x + 3 * y) % 5)] = rotate(
            state[x + 5 * y],
            rotations[x + 5 * y]
          );
        }
      }
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          state[x + 5 * y] =
            (shifted[x + 5 * y] ^
              ((~shifted[((x + 1) % 5) + 5 * y]) &
                shifted[((x + 2) % 5) + 5 * y])) &
            mask;
        }
      }
      state[0] = (state[0] ^ roundConstant) & mask;
    }
  };
  const rate = 136;
  const input = new TextEncoder().encode(value);
  const padded = new Uint8Array(
    Math.ceil((input.length + 1) / rate) * rate
  );
  padded.set(input);
  padded[input.length] = 0x01;
  padded[padded.length - 1] |= 0x80;
  const state = Array(25).fill(0n);
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let index = 0; index < rate; index += 1) {
      state[Math.floor(index / 8)] ^=
        BigInt(padded[offset + index]) << BigInt((index % 8) * 8);
    }
    permute(state);
  }
  const output = Array.from({ length: 32 }, (_, index) =>
    Number(
      (state[Math.floor(index / 8)] >> BigInt((index % 8) * 8)) & 0xffn
    )
      .toString(16)
      .padStart(2, "0")
  ).join("");
  return `0x${output}`;
}

function normalizePublicVerificationResponse(body, expectedHash) {
  const object = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const exact = (value, fields, optional = []) =>
    object(value) &&
    fields.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    Object.keys(value).every((key) => [...fields, ...optional].includes(key));
  const project = (value, fields, optional = []) => {
    if (!exact(value, fields, optional)) return null;
    return Object.fromEntries(
      [...fields, ...optional]
        .filter((key) => Object.prototype.hasOwnProperty.call(value, key))
        .map((key) => [key, value[key]])
    );
  };
  const hash = (value) =>
    typeof value === "string" && /^0x[a-f0-9]{64}$/u.test(value)
      ? value
      : null;
  const address = (value) =>
    typeof value === "string" && /^0x[a-f0-9]{40}$/u.test(value)
      ? value
      : null;
  const bytes4 = (value) =>
    typeof value === "string" && /^0x[a-f0-9]{8}$/u.test(value)
      ? value
      : null;
  const units = (value) =>
    typeof value === "string" && /^(?:0|[1-9][0-9]*)$/u.test(value);
  const integer = (value, positive = false) =>
    Number.isSafeInteger(value) && value >= (positive ? 1 : 0);
  const version = (value) =>
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value);
  const text = (value) =>
    typeof value === "string" && value.length > 0 && value.trim() === value;
  const utf8Hex = (value) =>
    `0x${Array.from(new TextEncoder().encode(value))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;
  const forbidden = (value, seen = new WeakSet()) => {
    if (value === null || typeof value !== "object") return false;
    if (seen.has(value)) return true;
    seen.add(value);
    if (Array.isArray(value)) {
      return value.some((entry) => forbidden(entry, seen));
    }
    return Object.entries(value).some(([key, entry]) => {
      const normalized = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
      return (
        [
          "runid", "capability", "runaccess", "session", "credential",
          "private", "visibility", "secret", "token", "author" + "ization",
          "headers", "database", "dbkey"
        ].some((part) => normalized.includes(part)) ||
        normalized === "env" ||
        normalized.startsWith("environment") ||
        forbidden(entry, seen)
      );
    });
  };
  const canonical = (section, payload) => {
    const json = JSON.stringify(payload);
    return section.canonicalPayload === json &&
      section.canonicalPayloadBytesHex === utf8Hex(json)
      ? {
          canonicalPayload: json,
          canonicalPayloadBytesHex: utf8Hex(json)
        }
      : null;
  };
  if (forbidden(body)) return null;

  const topFields = [
    "screenKind", "source", "queryKind", "campaignId", "missionId",
    "policyVersion", "policyStatus", "networkName", "walletLabel",
    "receiptHash", "intentHash", "depositTxHash", "verifierInputHash",
    "blockNumber", "blockHash", "confirmationDepth", "receiptPath",
    "participantReceiptPath", "explorerUrl", "testnetNotice", "bundle"
  ];
  const top = project(body, topFields);
  if (
    top === null ||
    top.screenKind !== "public-matched-proof" ||
    top.source !== "live" ||
    !["receipt", "intent", "depositTx"].includes(top.queryKind) ||
    top.policyVersion !== null ||
    top.policyStatus !== "fixed-unversioned" ||
    top.networkName !== "GIWA Sepolia" ||
    !/^0x[0-9a-f]{6}…[0-9a-f]{4}$/u.test(top.walletLabel ?? "") ||
    hash(expectedHash) === null
  ) {
    return null;
  }
  const bundleFields = [
    "schemaVersion", "source", "generatedAt", "identity", "manifest",
    "verifierInput", "verification", "decodedLogs", "receipt", "replay",
    "notice"
  ];
  const bundle = project(top.bundle, bundleFields);
  const generatedAt = new Date(bundle?.generatedAt ?? "");
  if (
    bundle === null ||
    bundle.schemaVersion !== "1" ||
    bundle.source !== "live" ||
    Number.isNaN(generatedAt.getTime()) ||
    generatedAt.toISOString() !== bundle.generatedAt ||
    bundle.notice !==
      "GIWA Sepolia testnet · Mock assets only · No settlement or finality claim"
  ) {
    return null;
  }
  const identity = project(bundle.identity, [
    "receiptHash", "intentHash", "depositTxHash"
  ]);
  if (
    identity === null ||
    hash(identity.receiptHash) !== hash(top.receiptHash) ||
    hash(identity.intentHash) !== hash(top.intentHash) ||
    hash(identity.depositTxHash) !== hash(top.depositTxHash)
  ) {
    return null;
  }

  const manifestSection = project(bundle.manifest, [
    "payload", "canonicalPayload", "canonicalPayloadBytesHex", "signature",
    "signingDomain", "recoveredSigner"
  ]);
  const manifestFields = [
    "manifestVersion", "chainId", "nonce", "expiryUnix", "campaignId",
    "missionId", "wallet", "actionType", "target", "selector", "asset",
    "amountBaseUnits", "spender", "maxAllowanceBaseUnits"
  ];
  const manifest = project(
    manifestSection?.payload,
    manifestFields,
    ["referralCode"]
  );
  const domain = project(manifestSection?.signingDomain, [
    "name", "version", "chainId", "verifyingContract"
  ]);
  const manifestCanonical =
    manifestSection === null || manifest === null
      ? null
      : canonical(manifestSection, manifest);
  if (
    manifestSection === null ||
    manifest === null ||
    domain === null ||
    manifestCanonical === null ||
    manifest.manifestVersion !== "1" ||
    manifest.chainId !== 91342 ||
    !text(manifest.nonce) ||
    !integer(manifest.expiryUnix, true) ||
    !text(manifest.campaignId) ||
    !text(manifest.missionId) ||
    address(manifest.wallet) === null ||
    manifest.actionType !== "mockVaultDeposit" ||
    address(manifest.target) === null ||
    bytes4(manifest.selector) === null ||
    address(manifest.asset) === null ||
    !units(manifest.amountBaseUnits) ||
    address(manifest.spender) === null ||
    !units(manifest.maxAllowanceBaseUnits) ||
    (manifest.referralCode !== undefined && !text(manifest.referralCode)) ||
    !/^0x[a-f0-9]{130}$/u.test(manifestSection.signature ?? "") ||
    domain.name !== "GIWA Verified Intent Rail" ||
    domain.version !== "1" ||
    domain.chainId !== 91342 ||
    address(domain.verifyingContract) === null ||
    address(manifestSection.recoveredSigner) === null ||
    keccak256Utf8(manifestCanonical.canonicalPayload) !== identity.intentHash
  ) {
    return null;
  }

  const verifierSection = project(bundle.verifierInput, [
    "payload", "canonicalPayload", "canonicalPayloadBytesHex",
    "verifierInputHash", "verifierVersion"
  ]);
  const verifier = project(verifierSection?.payload, [
    "schemaVersion", "chainId", "intentHash", "depositTxHash",
    "depositTransactionSnapshotHash", "depositReceiptSnapshotHash",
    "decodedLogSnapshotHash", "confirmationDepth",
    "headBlockNumberAtVerification", "verifierVersion"
  ]);
  const verifierCanonical =
    verifierSection === null || verifier === null
      ? null
      : canonical(verifierSection, verifier);
  if (
    verifierSection === null ||
    verifier === null ||
    verifierCanonical === null ||
    verifier.schemaVersion !== "1" ||
    verifier.chainId !== 91342 ||
    [
      verifier.intentHash, verifier.depositTxHash,
      verifier.depositTransactionSnapshotHash,
      verifier.depositReceiptSnapshotHash, verifier.decodedLogSnapshotHash,
      verifierSection.verifierInputHash
    ].some((value) => hash(value) === null) ||
    !integer(verifier.confirmationDepth) ||
    !integer(verifier.headBlockNumberAtVerification, true) ||
    !version(verifier.verifierVersion) ||
    verifierSection.verifierVersion !== verifier.verifierVersion ||
    keccak256Utf8(verifierCanonical.canonicalPayload) !==
      verifierSection.verifierInputHash ||
    verifierSection.verifierInputHash !== top.verifierInputHash
  ) {
    return null;
  }

  if (!Array.isArray(bundle.decodedLogs) || bundle.decodedLogs.length > 20) {
    return null;
  }
  const decodedLogs = [];
  for (const raw of bundle.decodedLogs) {
    const log = project(
      raw,
      [
        "eventName", "contractAddress", "logIndex", "sourceTxHash",
        "blockNumber", "blockHash", "args"
      ],
      ["topics"]
    );
    const argsFields =
      log?.eventName === "Approval"
        ? ["owner", "spender", "amount"]
        : log?.eventName === "Transfer"
          ? ["from", "to", "amount"]
          : log?.eventName === "MockDeposit"
            ? ["wallet", "asset", "amount"]
            : null;
    const args = argsFields === null ? null : project(log.args, argsFields);
    const topics =
      log?.topics === undefined
        ? undefined
        : Array.isArray(log.topics) && log.topics.every((topic) => hash(topic))
          ? [...log.topics]
          : null;
    if (
      log === null ||
      args === null ||
      address(log.contractAddress) === null ||
      !integer(log.logIndex) ||
      hash(log.sourceTxHash) === null ||
      !integer(log.blockNumber) ||
      hash(log.blockHash) === null ||
      topics === null ||
      Object.entries(args).some(([key, value]) =>
        key === "amount" ? !units(value) : address(value) === null
      )
    ) {
      return null;
    }
    decodedLogs.push({
      eventName: log.eventName,
      contractAddress: log.contractAddress,
      logIndex: log.logIndex,
      sourceTxHash: log.sourceTxHash,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      args: { ...args },
      ...(topics === undefined ? {} : { topics })
    });
  }

  const receiptSection = project(bundle.receipt, [
    "payload", "canonicalPayload", "canonicalPayloadBytesHex", "receiptHash",
    "schemaVersion", "verifierVersion"
  ]);
  const receiptFieldsBeforeProvider = [
    "schemaVersion", "verifierVersion", "intentHash", "chainId",
    "networkName", "status", "actionType", "asset", "amountBaseUnits",
    "target", "spender", "maxAllowanceBaseUnits", "allowanceUsedBaseUnits",
    "approvalRequired", "approveTxHash", "depositTxHash",
    "depositBlockNumber", "depositBlockHash", "campaignId", "missionId",
    "wallet", "verifiedState"
  ];
  const receiptFieldsAfterProvider = [
    "testnetDepositAmountDelta", "issuedAt",
    "issuer", "safetyNotice"
  ];
  const receiptFields = [
    ...receiptFieldsBeforeProvider,
    ...receiptFieldsAfterProvider
  ];
  const rawReceipt = receiptSection?.payload;
  const receipt =
    exact(rawReceipt, receiptFields, ["verifiedProvider"])
      ? Object.fromEntries(
          [
            ...receiptFieldsBeforeProvider,
            ...(Object.prototype.hasOwnProperty.call(
              rawReceipt,
              "verifiedProvider"
            )
              ? ["verifiedProvider"]
              : []),
            ...receiptFieldsAfterProvider
          ].map((key) => [key, rawReceipt[key]])
        )
      : null;
  const receiptCanonical =
    receiptSection === null || receipt === null
      ? null
      : canonical(receiptSection, receipt);
  if (
    receiptSection === null ||
    receipt === null ||
    receiptCanonical === null ||
    receipt.schemaVersion !== "1" ||
    !version(receipt.verifierVersion) ||
    receipt.chainId !== 91342 ||
    receipt.networkName !== "GIWA Sepolia" ||
    receipt.status !== "matched" ||
    receipt.actionType !== "mockVaultDeposit" ||
    [receipt.intentHash, receipt.depositTxHash, receipt.depositBlockHash]
      .some((value) => hash(value) === null) ||
    [receipt.asset, receipt.target, receipt.spender, receipt.wallet]
      .some((value) => address(value) === null) ||
    [
      receipt.amountBaseUnits, receipt.maxAllowanceBaseUnits,
      receipt.allowanceUsedBaseUnits, receipt.testnetDepositAmountDelta
    ].some((value) => !units(value)) ||
    typeof receipt.approvalRequired !== "boolean" ||
    (receipt.approveTxHash !== null && hash(receipt.approveTxHash) === null) ||
    !integer(receipt.depositBlockNumber, true) ||
    !integer(receipt.issuedAt, true) ||
    !text(receipt.campaignId) ||
    !text(receipt.missionId) ||
    !["verified", "guest", "unavailable"].includes(receipt.verifiedState) ||
    (receipt.verifiedProvider !== undefined &&
      !["Dojang", "up.id"].includes(receipt.verifiedProvider)) ||
    receipt.issuer !== "GIWA Verified Intent Rail MVP" ||
    receipt.safetyNotice !==
      "Testnet-only. No real asset, no yield, no RWA claim." ||
    receiptSection.schemaVersion !== "1" ||
    receiptSection.verifierVersion !== receipt.verifierVersion ||
    hash(receiptSection.receiptHash) !== identity.receiptHash ||
    keccak256Utf8(receiptCanonical.canonicalPayload) !==
      identity.receiptHash
  ) {
    return null;
  }

  const verification = project(bundle.verification, [
    "depositBlockNumber", "depositBlockHash",
    "headBlockNumberAtVerification", "confirmationDepth",
    "standardRpcReceiptStatus"
  ]);
  const replay = project(bundle.replay, ["algorithm", "command"]);
  if (
    verification === null ||
    !integer(verification.depositBlockNumber) ||
    hash(verification.depositBlockHash) === null ||
    !integer(verification.headBlockNumberAtVerification) ||
    !integer(verification.confirmationDepth) ||
    verification.standardRpcReceiptStatus !== 1 ||
    replay === null ||
    replay.algorithm !== "keccak256-canonical-json+eip712" ||
    replay.command !==
      "pnpm --filter @giwa/web evidence:replay -- <bundle.json>"
  ) {
    return null;
  }
  const approvals = decodedLogs.filter((log) => log.eventName === "Approval");
  const transfers = decodedLogs.filter((log) => log.eventName === "Transfer");
  const deposits = decodedLogs.filter((log) => log.eventName === "MockDeposit");
  const approval = approvals[0];
  const transfer = transfers[0];
  const deposit = deposits[0];
  const identities = {
    receipt: identity.receiptHash,
    intent: identity.intentHash,
    depositTx: identity.depositTxHash
  };
  if (
    identities[top.queryKind] !== expectedHash ||
    manifest.campaignId !== receipt.campaignId ||
    manifest.missionId !== receipt.missionId ||
    manifest.wallet !== receipt.wallet ||
    manifest.chainId !== receipt.chainId ||
    manifest.actionType !== receipt.actionType ||
    manifest.asset !== receipt.asset ||
    manifest.amountBaseUnits !== receipt.amountBaseUnits ||
    manifest.target !== receipt.target ||
    manifest.spender !== receipt.spender ||
    manifest.maxAllowanceBaseUnits !== receipt.maxAllowanceBaseUnits ||
    receipt.allowanceUsedBaseUnits !== receipt.amountBaseUnits ||
    receipt.testnetDepositAmountDelta !== receipt.amountBaseUnits ||
    receipt.intentHash !== identity.intentHash ||
    receipt.depositTxHash !== identity.depositTxHash ||
    receipt.depositBlockNumber !== verification.depositBlockNumber ||
    receipt.depositBlockHash !== verification.depositBlockHash ||
    verifier.intentHash !== identity.intentHash ||
    verifier.depositTxHash !== identity.depositTxHash ||
    verifier.confirmationDepth !== verification.confirmationDepth ||
    verifier.headBlockNumberAtVerification !==
      verification.headBlockNumberAtVerification ||
    verifier.verifierVersion !== receipt.verifierVersion ||
    verification.depositBlockNumber !== top.blockNumber ||
    verification.depositBlockHash !== top.blockHash ||
    verification.confirmationDepth !== top.confirmationDepth ||
    verification.confirmationDepth !==
      Math.max(
        0,
        verification.headBlockNumberAtVerification -
          verification.depositBlockNumber +
          1
      ) ||
    keccak256Utf8(JSON.stringify(decodedLogs)) !==
      verifier.decodedLogSnapshotHash ||
    transfers.length !== 1 ||
    deposits.length !== 1 ||
    approvals.length !== (receipt.approvalRequired ? 1 : 0) ||
    (receipt.approvalRequired
      ? receipt.approveTxHash === null ||
        approval.sourceTxHash !== receipt.approveTxHash ||
        approval.contractAddress !== receipt.asset ||
        approval.args.owner !== receipt.wallet ||
        approval.args.spender !== receipt.spender ||
        approval.args.amount !== receipt.maxAllowanceBaseUnits
      : receipt.approveTxHash !== null) ||
    transfer.sourceTxHash !== receipt.depositTxHash ||
    transfer.blockNumber !== receipt.depositBlockNumber ||
    transfer.blockHash !== receipt.depositBlockHash ||
    transfer.contractAddress !== receipt.asset ||
    transfer.args.from !== receipt.wallet ||
    transfer.args.to !== receipt.target ||
    transfer.args.amount !== receipt.amountBaseUnits ||
    deposit.sourceTxHash !== receipt.depositTxHash ||
    deposit.blockNumber !== receipt.depositBlockNumber ||
    deposit.blockHash !== receipt.depositBlockHash ||
    deposit.contractAddress !== receipt.target ||
    deposit.args.wallet !== receipt.wallet ||
    deposit.args.asset !== receipt.asset ||
    deposit.args.amount !== receipt.amountBaseUnits ||
    top.campaignId !== receipt.campaignId ||
    top.missionId !== receipt.missionId ||
    top.walletLabel !==
      `${receipt.wallet.slice(0, 8)}…${receipt.wallet.slice(-4)}` ||
    top.receiptPath !== `/receipt/${identity.receiptHash}` ||
    top.participantReceiptPath !==
      `/user/receipt/${identity.receiptHash}` ||
    top.explorerUrl !==
      `https://sepolia-explorer.giwa.io/tx/${identity.depositTxHash}` ||
    top.testnetNotice !== "GIWA Sepolia testnet · Mock assets only"
  ) {
    return null;
  }

  return {
    screenKind: "public-matched-proof",
    source: "live",
    queryKind: top.queryKind,
    campaignId: receipt.campaignId,
    missionId: receipt.missionId,
    policyVersion: null,
    policyStatus: "fixed-unversioned",
    networkName: "GIWA Sepolia",
    walletLabel: top.walletLabel,
    receiptHash: identity.receiptHash,
    intentHash: identity.intentHash,
    depositTxHash: identity.depositTxHash,
    verifierInputHash: verifierSection.verifierInputHash,
    blockNumber: verification.depositBlockNumber,
    blockHash: verification.depositBlockHash,
    confirmationDepth: verification.confirmationDepth,
    receiptPath: `/receipt/${identity.receiptHash}`,
    participantReceiptPath: `/user/receipt/${identity.receiptHash}`,
    explorerUrl:
      `https://sepolia-explorer.giwa.io/tx/${identity.depositTxHash}`,
    testnetNotice: "GIWA Sepolia testnet · Mock assets only",
    bundle: {
      schemaVersion: "1",
      source: "live",
      generatedAt: bundle.generatedAt,
      identity: { ...identity },
      manifest: {
        payload: { ...manifest },
        ...manifestCanonical,
        signature: manifestSection.signature,
        signingDomain: { ...domain },
        recoveredSigner: manifestSection.recoveredSigner
      },
      verifierInput: {
        payload: { ...verifier },
        ...verifierCanonical,
        verifierInputHash: verifierSection.verifierInputHash,
        verifierVersion: verifier.verifierVersion
      },
      verification: { ...verification },
      decodedLogs,
      receipt: {
        payload: { ...receipt },
        ...receiptCanonical,
        receiptHash: receiptSection.receiptHash,
        schemaVersion: "1",
        verifierVersion: receipt.verifierVersion
      },
      replay: { ...replay },
      notice: bundle.notice
    }
  };
}

function projectPublicVerificationBundleResponse(body, expectedHash) {
  const strictBody = normalizePublicVerificationResponse(body, expectedHash);
  if (strictBody === null) return null;
  body = strictBody;
  const object = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const hash = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value);
  const address = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value);
  const bytes = (value) =>
    typeof value === "string" && /^0x(?:[a-fA-F0-9]{2})+$/u.test(value);
  const version = (value) =>
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value);
  const timestamp = (value) => {
    if (typeof value !== "string") return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
  };
  const hasForbiddenKey = (value, seen = new WeakSet()) => {
    if (value === null || typeof value !== "object") return false;
    if (seen.has(value)) return true;
    seen.add(value);
    if (Array.isArray(value)) {
      return value.some((entry) => hasForbiddenKey(entry, seen));
    }
    return Object.entries(value).some(([key, entry]) => {
      const normalized = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
      return (
        normalized.includes("runid") ||
        normalized.includes("capability") ||
        normalized.includes("session") ||
        normalized.includes("credential") ||
        normalized.includes("private" + "key") ||
        normalized.includes("headers") ||
        normalized.includes("privateerror") ||
        normalized.includes("databasekey") ||
        normalized.includes("dbkey") ||
        normalized === "env" ||
        normalized.startsWith("environment") ||
        hasForbiddenKey(entry, seen)
      );
    });
  };
  const canonical = (section) => {
    if (
      !object(section) ||
      !object(section.payload) ||
      typeof section.canonicalPayload !== "string" ||
      !bytes(section.canonicalPayloadBytesHex)
    ) {
      return false;
    }
    try {
      return (
        JSON.stringify(JSON.parse(section.canonicalPayload)) ===
        JSON.stringify(section.payload)
      );
    } catch {
      return false;
    }
  };

  if (
    !hash(expectedHash) ||
    !object(body) ||
    hasForbiddenKey(body) ||
    body.screenKind !== "public-matched-proof" ||
    body.source !== "live" ||
    !["receipt", "intent", "depositTx"].includes(body.queryKind) ||
    !hash(body.receiptHash) ||
    body.receiptHash.toLowerCase() !== expectedHash.toLowerCase() ||
    !hash(body.intentHash) ||
    !hash(body.depositTxHash) ||
    !hash(body.verifierInputHash) ||
    !Number.isSafeInteger(body.blockNumber) ||
    body.blockNumber < 0 ||
    !hash(body.blockHash) ||
    !Number.isSafeInteger(body.confirmationDepth) ||
    body.confirmationDepth <= 0 ||
    body.explorerUrl !==
      `https://sepolia-explorer.giwa.io/tx/${body.depositTxHash}` ||
    body.testnetNotice !== "GIWA Sepolia testnet · Mock assets only"
  ) {
    return null;
  }

  const bundle = body.bundle;
  if (
    !object(bundle) ||
    bundle.schemaVersion !== "1" ||
    bundle.source !== "live" ||
    !timestamp(bundle.generatedAt) ||
    !object(bundle.identity) ||
    !hash(bundle.identity.receiptHash) ||
    !hash(bundle.identity.intentHash) ||
    !hash(bundle.identity.depositTxHash) ||
    bundle.identity.receiptHash.toLowerCase() !== body.receiptHash.toLowerCase() ||
    bundle.identity.intentHash.toLowerCase() !== body.intentHash.toLowerCase() ||
    bundle.identity.depositTxHash.toLowerCase() !== body.depositTxHash.toLowerCase() ||
    !canonical(bundle.manifest) ||
    !/^0x[a-fA-F0-9]{130}$/u.test(bundle.manifest.signature ?? "") ||
    !object(bundle.manifest.signingDomain) ||
    bundle.manifest.signingDomain.name !== "GIWA Verified Intent Rail" ||
    bundle.manifest.signingDomain.version !== "1" ||
    bundle.manifest.signingDomain.chainId !== 91342 ||
    !address(bundle.manifest.signingDomain.verifyingContract) ||
    !address(bundle.manifest.recoveredSigner) ||
    !canonical(bundle.verifierInput) ||
    !hash(bundle.verifierInput.verifierInputHash) ||
    bundle.verifierInput.verifierInputHash.toLowerCase() !==
      body.verifierInputHash.toLowerCase() ||
    !version(bundle.verifierInput.verifierVersion) ||
    !object(bundle.verification) ||
    bundle.verification.depositBlockNumber !== body.blockNumber ||
    !hash(bundle.verification.depositBlockHash) ||
    bundle.verification.depositBlockHash.toLowerCase() !==
      body.blockHash.toLowerCase() ||
    !Number.isSafeInteger(bundle.verification.headBlockNumberAtVerification) ||
    bundle.verification.headBlockNumberAtVerification < body.blockNumber ||
    bundle.verification.confirmationDepth !== body.confirmationDepth ||
    bundle.verification.standardRpcReceiptStatus !== 1 ||
    !Array.isArray(bundle.decodedLogs) ||
    bundle.decodedLogs.length > 20 ||
    !canonical(bundle.receipt) ||
    !hash(bundle.receipt.receiptHash) ||
    bundle.receipt.receiptHash.toLowerCase() !== body.receiptHash.toLowerCase() ||
    bundle.receipt.schemaVersion !== "1" ||
    !version(bundle.receipt.verifierVersion) ||
    bundle.receipt.verifierVersion !== bundle.verifierInput.verifierVersion ||
    !object(bundle.replay) ||
    bundle.replay.algorithm !== "keccak256-canonical-json+eip712" ||
    bundle.replay.command !==
      "pnpm --filter @giwa/web evidence:replay -- <bundle.json>" ||
    bundle.notice !==
      "GIWA Sepolia testnet · Mock assets only · No settlement or finality claim"
  ) {
    return null;
  }

  const allowedLogs = new Set(["Approval", "Transfer", "MockDeposit"]);
  if (
    bundle.decodedLogs.some(
      (log) =>
        !object(log) ||
        !allowedLogs.has(log.eventName) ||
        !address(log.contractAddress) ||
        !Number.isSafeInteger(log.logIndex) ||
        log.logIndex < 0 ||
        !hash(log.sourceTxHash) ||
        !Number.isSafeInteger(log.blockNumber) ||
        log.blockNumber < 0 ||
        !hash(log.blockHash) ||
        !object(log.args)
    ) ||
    bundle.verifierInput.payload.intentHash?.toLowerCase() !==
      body.intentHash.toLowerCase() ||
    bundle.verifierInput.payload.depositTxHash?.toLowerCase() !==
      body.depositTxHash.toLowerCase() ||
    bundle.receipt.payload.intentHash?.toLowerCase() !==
      body.intentHash.toLowerCase() ||
    bundle.receipt.payload.depositTxHash?.toLowerCase() !==
      body.depositTxHash.toLowerCase()
  ) {
    return null;
  }

  return {
    receiptHash: body.receiptHash.toLowerCase(),
    explorerUrl: body.explorerUrl,
    bundle: {
      schemaVersion: "1",
      source: "live",
      generatedAt: bundle.generatedAt,
      identity: {
        receiptHash: bundle.identity.receiptHash.toLowerCase(),
        intentHash: bundle.identity.intentHash.toLowerCase(),
        depositTxHash: bundle.identity.depositTxHash.toLowerCase()
      },
      manifest: bundle.manifest,
      verifierInput: bundle.verifierInput,
      verification: bundle.verification,
      decodedLogs: bundle.decodedLogs,
      receipt: bundle.receipt,
      replay: bundle.replay,
      notice: bundle.notice
    }
  };
}

async function fetchPublicVerificationBundle(receiptHash) {
  if (!/^0x[a-f0-9]{64}$/u.test(receiptHash ?? "")) return null;
  try {
    const result = await apiFetchJson(
      `/api/public/evidence/${encodeURIComponent(receiptHash)}`
    );
    if (!result.response.ok) return null;
    return projectPublicVerificationBundleResponse(
      result.body,
      receiptHash
    );
  } catch {
    return null;
  }
}

function verificationBundleMetadata(items) {
  return items.map(([label, value]) =>
    view("div", { className: "verification-bundle-meta-item" }, [
      view("dt", { text: label }),
      view("dd", { className: "mono hash-wrap", text: String(value) })
    ])
  );
}

function renderDisclosureSummary(text) {
  return view("summary", {}, [
    view("span", { text }),
    globalThis.GiwaProtocolDossier.createLineIcon(
      document,
      "chevron-down"
    )
  ]);
}

function renderVerificationBundle(publicProof) {
  const bundle = publicProof?.bundle ?? null;
  const receiptHash = bundle?.identity?.receiptHash ?? null;
  const downloadPath =
    /^0x[a-f0-9]{64}$/u.test(receiptHash ?? "")
      ? `/api/public/evidence/${receiptHash}?download=1`
      : null;
  if (bundle === null || downloadPath === null) {
    return view("section", { className: "verification-bundle panel" }, [
      view("p", { className: "eyebrow", text: "Independent verification" }),
      view("h2", { text: "검증 번들을 사용할 수 없습니다" }),
      view("p", {
        className: "muted",
        text: "찾을 수 없거나 공개되지 않은 증거입니다."
      }),
      view("div", { className: "verification-bundle-actions" }, [
        view("span", {
          className: "disabled-link",
          text: "검증 번들 JSON 받기"
        }),
        view("button", {
          type: "button",
          disabled: true,
          text: "재검증 명령 복사"
        })
      ])
    ]);
  }

  return view("section", { className: "verification-bundle" }, [
    view("header", { className: "section-heading" }, [
      view("div", {}, [
        view("p", { className: "eyebrow", text: "Independent verification" }),
        view("h2", { text: "검증 번들로 직접 다시 확인하세요" }),
        view("p", {
          className: "muted",
          text: "6개 무결성 검사를 직접 재계산할 수 있습니다"
        })
      ]),
      view("span", { className: "status-pill", text: "Matched" })
    ]),
    view("dl", { className: "verification-bundle-meta" }, [
      ...verificationBundleMetadata([
        ["Source", "Live"],
        ["Generated at", bundle.generatedAt],
        ["Schema version", bundle.schemaVersion],
        ["Verifier version", bundle.verifierInput.verifierVersion]
      ])
    ]),
    view("div", { className: "verification-bundle-actions" }, [
      view("a", {
        className: "secondary-link",
        href: publicProof.explorerUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        text: "GIWA Explorer"
      }),
      view("a", {
        className: "primary-link",
        href: downloadPath,
        download: "giwa-verification-bundle.json",
        text: "검증 번들 JSON 받기"
      })
    ]),
    view("p", { className: "notice", text: bundle.notice }),
    view("div", { className: "verification-bundle-disclosures" }, [
      view("details", { className: "verification-bundle-disclosure" }, [
        renderDisclosureSummary("Manifest 및 서명"),
        field("Manifest signature", bundle.manifest.signature),
        field("Recovered signer", bundle.manifest.recoveredSigner),
        field(
          "Verifying contract",
          bundle.manifest.signingDomain.verifyingContract
        ),
        field("Intent hash", bundle.identity.intentHash)
      ]),
      view("details", { className: "verification-bundle-disclosure" }, [
        renderDisclosureSummary("Verifier input"),
        field("Verifier input hash", bundle.verifierInput.verifierInputHash),
        field("Verifier version", bundle.verifierInput.verifierVersion),
        field(
          "Block snapshot",
          `${bundle.verification.depositBlockNumber} → ${bundle.verification.headBlockNumberAtVerification}`
        ),
        field(
          "Verification snapshot",
          `${bundle.verification.confirmationDepth} confirmations observed`
        ),
        field("Block hash", bundle.verification.depositBlockHash)
      ]),
      view("details", { className: "verification-bundle-disclosure" }, [
        renderDisclosureSummary("Decoded logs"),
        ...(bundle.decodedLogs.length === 0
          ? [view("p", { className: "muted", text: "공개 가능한 decoded log가 없습니다." })]
          : bundle.decodedLogs.map((log) =>
              view("div", { className: "verification-log-row" }, [
                view("strong", { text: `${log.eventName} #${log.logIndex}` }),
                view("span", {
                  className: "mono hash-wrap",
                  text: log.contractAddress
                })
              ])
            ))
      ]),
      view("details", { className: "verification-bundle-disclosure" }, [
        renderDisclosureSummary("Receipt canonical payload"),
        field("Receipt hash", bundle.receipt.receiptHash),
        field("Schema version", bundle.receipt.schemaVersion),
        field("Verifier version", bundle.receipt.verifierVersion)
      ]),
      view("details", { className: "verification-bundle-disclosure" }, [
        renderDisclosureSummary("독립 재검증"),
        view("p", {
          className: "muted",
          text: "다운로드한 JSON만 사용하며 DB, RPC 또는 비공개 API에 연결하지 않습니다."
        }),
        view("code", {
          className: "verification-replay-command",
          text: bundle.replay.command
        }),
        view("button", {
          type: "button",
          id: "copy-public-replay-command",
          "data-replay-command": bundle.replay.command,
          text: "재검증 명령 복사"
        }),
        view("span", {
          className: "sr-only",
          id: "copy-public-replay-command-feedback",
          role: "status",
          "aria-live": "polite",
          text: ""
        })
      ])
    ])
  ]);
}

function bindVerificationReplayCopy() {
  const button = document.querySelector("#copy-public-replay-command");
  button?.addEventListener("click", async () => {
    const command = button.getAttribute("data-replay-command");
    const feedback = document.querySelector(
      "#copy-public-replay-command-feedback"
    );
    if (command === null) return;
    try {
      await navigator.clipboard.writeText(command);
      if (feedback) feedback.textContent = "재검증 명령을 복사했습니다.";
    } catch {
      if (feedback) feedback.textContent = "명령을 복사하지 못했습니다.";
    }
  });
}

function matchedReceiptRows(payload, verification) {
  return [
    {
      label: "지갑",
      evidence: shortHash(payload.wallet),
      result: "일치"
    },
    {
      label: "실행 대상과 액션",
      evidence: `${shortHash(payload.target)} · ${payload.actionType}`,
      result: "일치"
    },
    {
      label: "자산과 수량",
      evidence: `${shortHash(payload.asset)} · ${payload.amountBaseUnits}`,
      result: "일치"
    },
    {
      label: "승인 조건",
      evidence: `${shortHash(payload.spender)} · ${payload.allowanceUsedBaseUnits}/${payload.maxAllowanceBaseUnits}`,
      result: "범위 내"
    },
    {
      label: "블록 증거",
      evidence: `Block ${payload.depositBlockNumber} · ${verification.confirmationDepth} confirmations`,
      result: "확인됨"
    }
  ];
}

function renderMatchedReceiptRows(rows) {
  return view("dl", {
    className: "matched-receipt-rows",
    "aria-label": "Manifest와 실제 실행의 일치 결과"
  }, rows.map((row) =>
    view("div", { className: "matched-receipt-row" }, [
      view("dt", { text: row.label }),
      view("dd", { className: "mono hash-wrap", text: row.evidence }),
      view("span", { className: "matched-receipt-result", text: row.result })
    ])
  ));
}

function renderMatchedReceiptSeal(issuedTime = null) {
  return view("figure", {
    className: "matched-receipt-seal",
    "aria-hidden": "true"
  }, [
    view("img", {
      src: "/matched-receipt-seal.png",
      alt: ""
    }),
    view("figcaption", {}, [
      view("strong", { text: "MATCHED" }),
      view("span", { text: "GIWA SEPOLIA" }),
      issuedTime === null
        ? view("span")
        : view("span", { text: issuedTime })
    ])
  ]);
}

function renderMatchedReceiptValue() {
  return view("section", {
    className: "matched-receipt-value",
    "aria-labelledby": "matched-receipt-value-heading"
  }, [
    view("p", { className: "eyebrow", text: "What this proves" }),
    view("h2", {
      id: "matched-receipt-value-heading",
      text: "사용자 기록에서 파트너 KPI까지"
    }),
    view("p", {
      text: "사용자는 실행 기록을 받고, 파트너는 클릭이 아니라 Manifest와 일치한 트랜잭션을 KPI로 확인합니다."
    }),
    view("p", {
      className: "muted",
      text: "GIWA Wallet 안에서 실행 전 Manifest와 실행 후 Receipt 기록을 연결할 수 있습니다."
    })
  ]);
}

function receiptSerial(receiptHash, blockNumber) {
  const block = Number.isSafeInteger(blockNumber)
    ? String(blockNumber)
    : "PENDING";
  const suffix =
    typeof receiptHash === "string"
      ? receiptHash.slice(-3).toUpperCase()
      : "---";
  return `GIWA-RCP-${block}-${suffix}`;
}

function projectReceiptArtifactMetrics(matched) {
  return matched
    ? {
        fieldMatch: "4 / 4",
        fieldMatchLabel: "조건 일치",
        coveredFields: "4 / 4",
        matchDetailsSummary: "조건 대조 결과 4/4 보기",
        summaryAriaLabel: "Matched Receipt 요약"
      }
    : {
        fieldMatch: "—",
        fieldMatchLabel: "확인 불가",
        coveredFields: "—",
        matchDetailsSummary: "조건 대조 결과 확인 불가",
        summaryAriaLabel: "Receipt 확인 불가 요약"
      };
}

function campaignStudioReceiptPath(
  receiptHash,
  matched,
  handoffReceiptHash
) {
  if (
    !matched ||
    !/^0x[a-fA-F0-9]{64}$/u.test(receiptHash ?? "")
  ) {
    return null;
  }
  const normalizedReceiptHash = receiptHash.toLowerCase();
  const basePath = `/partner?receipt=${normalizedReceiptHash}`;
  return /^0x[a-fA-F0-9]{64}$/u.test(handoffReceiptHash ?? "") &&
    handoffReceiptHash.toLowerCase() === normalizedReceiptHash
    ? `${basePath}&handoff=issued`
    : basePath;
}

function renderReceiptNextParticipation(receiptHash, matched) {
  const studioPath = campaignStudioReceiptPath(
    receiptHash,
    matched,
    readCampaignHandoffReceipt()
  );
  const proofPath =
    matched && receiptHash !== null
      ? `/evidence?proof=${receiptHash}`
      : null;
  const routeCard = (eyebrow, title, description, label, path) =>
    view("article", { className: "receipt-participation-route" }, [
      view("p", { className: "eyebrow", text: eyebrow }),
      view("h3", { text: title }),
      view("p", { text: description }),
      path === null
        ? view("span", { className: "disabled-link", text: label })
        : view("a", { className: "secondary-link", href: path, text: label })
    ]);

  return view("section", {
    className: "receipt-next-participation",
    "aria-labelledby": "receipt-next-participation-heading"
  }, [
    view("header", {}, [
      view("p", { className: "eyebrow", text: "다음 참여" }),
      view("h2", {
        id: "receipt-next-participation-heading",
        text: "Receipt는 끝이 아니라 다음 참여의 시작입니다."
      }),
      view("p", {
        text: "같은 Receipt를 캠페인 성과와 공개 증거에서 이어서 확인하세요."
      })
    ]),
    routeCard(
      "ROUTE A",
      "Campaign Studio",
      "검증된 조건을 고정하고 다음 테스트넷 Mission을 공개합니다.",
      "Campaign Studio에서 반영 확인",
      studioPath
    ),
    routeCard(
      "ROUTE B",
      "Proof Ledger",
      "Receipt, Intent 또는 트랜잭션 hash로 같은 공개 증거를 다시 확인합니다.",
      "Proof Ledger에서 공개 검증",
      proofPath
    )
  ]);
}

function renderReceiptArtifact(model) {
  const {
    matched,
    receiptHeading,
    receiptHash,
    issuedTime,
    blockNumber,
    verification,
    receiptModel,
    matchedRowsView,
    txExplorerUrl,
    technicalDetails
  } = model;
  const serial = receiptSerial(receiptHash, blockNumber);
  const artifactMetrics = projectReceiptArtifactMetrics(matched);
  const publicReceiptPath =
    matched && receiptHash !== null
      ? `/receipt/${receiptHash}`
      : null;

  return view("section", {
    className: `matched-receipt-page receipt-artifact ${matched ? "is-matched" : "is-unavailable"}`,
    id: "main-content"
  }, [
    view("header", { className: "receipt-artifact-intro" }, [
      view("div", {}, [
        view("p", {
          className: "eyebrow",
          text: matched
            ? "MATCHED RECEIPT / GIWA SEPOLIA"
            : "RECEIPT UNAVAILABLE"
        }),
        receiptHeading,
        view("p", {
          className: "lead",
          text: matched
            ? "Manifest와 일치한 GIWA Sepolia 테스트넷 실행 기록입니다."
            : "일치가 확인된 공개 Receipt만 이 경로에서 볼 수 있습니다."
        })
      ]),
      view("div", { className: "receipt-artifact-utilities" }, [
        view("button", {
          type: "button",
          id: "copy-receipt-link",
          disabled: !matched,
          text: "Receipt 링크 복사"
        }),
        publicReceiptPath === null
          ? view("span", {
              className: "disabled-link",
              text: "공개 Receipt 보기"
            })
          : view("a", {
              className: "secondary-link",
              href: publicReceiptPath,
              text: "공개 Receipt 보기"
            }),
        txExplorerUrl === null
          ? view("span", { className: "disabled-link", text: "Explorer에서 보기" })
          : view("a", {
              className: "primary-link",
              href: txExplorerUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              text: "Explorer에서 보기"
            })
      ])
    ]),
    view("article", {
      className: "receipt-artifact-summary",
      "aria-label": artifactMetrics.summaryAriaLabel
    }, [
      view("header", { className: "receipt-artifact-summary-header" }, [
        view("strong", { text: "GIWA VERIFIED INTENT RAIL" }),
        view("div", {}, [
          view("span", { className: "mono", text: "GIWA SEPOLIA · TESTNET" }),
          view("span", { className: "mono", text: serial })
        ])
      ]),
      view("div", { className: "receipt-artifact-main" }, [
        view("div", { className: "receipt-artifact-copy" }, [
          view("p", {
            className: "eyebrow",
            text: matched
              ? "4개 조건 모두 일치 · Receipt 발급됨"
              : "Receipt 발급 조건 미충족"
          }),
          view("h2", {
            text: matched
              ? "약속한 조건대로 실행됐습니다."
              : "Receipt를 확인할 수 없습니다."
          }),
          view("p", {
            text: matched
              ? "Manifest와 GIWA Sepolia 트랜잭션을 대조해 일치한 실행 기록을 발급했습니다."
              : "완료된 공개 검증 기록이 없습니다."
          }),
          view("dl", { className: "receipt-artifact-metrics" }, [
            view("div", {}, [
              view("dt", { text: artifactMetrics.fieldMatch }),
              view("dd", { text: artifactMetrics.fieldMatchLabel })
            ]),
            view("div", {}, [
              view("dt", { text: String(blockNumber ?? "—") }),
              view("dd", { text: "Block" })
            ]),
            view("div", {}, [
              view("dt", {
                text: String(verification.confirmationDepth ?? "—")
              }),
              view("dd", { text: "confirmations" })
            ]),
            view("div", {}, [
              view("dt", {
                className: "mono",
                text: shortHash(receiptModel?.intentHash)
              }),
              view("dd", { text: "Manifest" })
            ])
          ])
        ]),
        matched ? renderMatchedReceiptSeal(issuedTime) : view("span")
      ]),
      view("footer", { className: "receipt-artifact-footer" }, [
        view("span", {
          text: "GIWA Sepolia 테스트넷 · Mock 자산만 사용 · 실제 자금 및 수익 없음"
        }),
        view("span", {
          className: "mono",
          text: shortHash(receiptHash)
        })
      ])
    ]),
    view("dl", { className: "receipt-artifact-meta" }, [
      view("div", {}, [
        view("dt", { text: "Receipt serial" }),
        view("dd", { className: "mono", text: serial })
      ]),
      view("div", {}, [
        view("dt", { text: "Issued time" }),
        view("dd", { className: "mono", text: issuedTime })
      ]),
      view("div", {}, [
        view("dt", { text: "Network" }),
        view("dd", { text: "GIWA Sepolia · Testnet" })
      ]),
      view("div", {}, [
        view("dt", { text: "Covered fields" }),
        view("dd", {
          className: "mono",
          text: artifactMetrics.coveredFields
        })
      ])
    ]),
    view("details", { className: "receipt-match-details" }, [
      view("summary", { text: artifactMetrics.matchDetailsSummary }),
      matchedRowsView
    ]),
    view("p", {
      id: "copy-receipt-feedback",
      className: "sr-only",
      role: "status",
      "aria-live": "polite",
      text: ""
    }),
    renderReceiptNextParticipation(receiptHash, matched),
    model.verificationBundleView,
    technicalDetails
  ]);
}

async function renderReceiptRoute() {
  const hash = receiptHashFromRoute();
  app.textContent = "";
  app.append(view("section", { className: "loading-panel" }, [
    view("p", { className: "eyebrow", text: "Receipt" }),
    view("h1", { text: "Receipt를 불러오는 중" })
  ]));
  let response = null;
  let body = null;
  if (hash !== "") {
    try {
      const result = await apiFetchJson(`/api/receipts/${hash}`);
      response = result.response;
      body = result.body;
    } catch {
      response = null;
      body = null;
    }
  }
  const receiptModel =
    response !== null && response.ok
      ? projectMatchedReceiptBody(body, hash)
      : null;
  const matched = receiptModel !== null;
  const publicProof = matched
    ? await fetchPublicVerificationBundle(hash)
    : null;
  const payload = receiptModel?.payload ?? null;
  const receiptHash = receiptModel?.receiptHash ?? null;
  const wallet = payload?.wallet ?? null;
  const target = payload?.target ?? null;
  const asset = payload?.asset ?? null;
  const amountBaseUnits = payload?.amountBaseUnits ?? null;
  const actionType = payload?.actionType ?? null;
  const spender = payload?.spender ?? null;
  const maxAllowanceBaseUnits = payload?.maxAllowanceBaseUnits ?? null;
  const allowanceUsedBaseUnits = payload?.allowanceUsedBaseUnits ?? null;
  const networkName = payload?.networkName ?? null;
  const depositTxHash = payload?.depositTxHash ?? null;
  const blockNumber = payload?.depositBlockNumber ?? null;
  const blockHash = payload?.depositBlockHash ?? null;
  const issuedAt = payload?.issuedAt ?? null;
  const safetyNotice = payload?.safetyNotice ?? null;
  const verification = {
    confirmationDepth: receiptModel?.confirmationDepth ?? null,
    verifierInputHash: receiptModel?.verifierInputHash ?? null
  };
  const txExplorerUrl = explorerTxUrl(depositTxHash);
  const issuedTime =
    Number.isInteger(issuedAt)
      ? new Date(issuedAt * 1000).toISOString()
      : "확인 중";
  const receiptPayload = matched
    ? {
        wallet,
        target,
        asset,
        amountBaseUnits,
        actionType,
        spender,
        maxAllowanceBaseUnits,
        allowanceUsedBaseUnits,
        depositBlockNumber: blockNumber
      }
    : null;
  const matchRows =
    receiptPayload === null ? [] : matchedReceiptRows(receiptPayload, verification);

  document.title = matched
    ? "Matched Receipt · GIWA Verified Intent Rail"
    : "Receipt unavailable · GIWA Verified Intent Rail";
  const receiptHeading = view("h1", {
    id: "matched-receipt-heading",
    tabindex: "-1",
    text: matched
      ? "약속한 조건대로 실행됐습니다."
      : "Receipt를 확인할 수 없습니다."
  });
  const matchedRowsView = matched
    ? renderMatchedReceiptRows(matchRows)
    : view("span");
  const technicalDetails = view("details", {
    className: "matched-receipt-technical"
  }, [
    view("summary", { text: "Technical details" }),
    renderHashDisclosure("Receipt hash", receiptHash),
    renderHashDisclosure("Intent hash", receiptModel?.intentHash ?? null),
    renderHashDisclosure("Deposit transaction", depositTxHash),
    renderHashDisclosure("Wallet", wallet),
    renderHashDisclosure("Target", target),
    renderHashDisclosure("Asset", asset),
    field("Amount", amountBaseUnits),
    field("Network", networkName),
    field("Block number", blockNumber),
    renderHashDisclosure("Block hash", blockHash),
    field("Verification snapshot", matched ? `${verification.confirmationDepth} confirmations observed` : null),
    renderHashDisclosure(
      "Verifier input hash",
      matched ? verification.verifierInputHash : null
    ),
    field("Issued time", issuedTime),
    view("p", {
      className: "notice user-safety-notice",
      text: safetyNotice ?? "Testnet-only. No real asset, no yield, no RWA claim."
    })
  ]);

  app.textContent = "";
  app.append(
    renderProtocolTopBar("receipt"),
    renderReceiptArtifact({
      matched,
      receiptHeading,
      receiptHash,
      issuedTime,
      blockNumber,
      verification,
      receiptModel,
      matchedRowsView,
      txExplorerUrl,
      verificationBundleView: renderVerificationBundle(publicProof),
      technicalDetails
    })
  );

  receiptHeading.focus({ preventScroll: true });
  bindVerificationReplayCopy();
  document.querySelector("#copy-receipt-link")?.addEventListener("click", async () => {
    const copyFeedback = document.querySelector("#copy-receipt-feedback");
    try {
      await navigator.clipboard.writeText(location.href);
      if (copyFeedback) copyFeedback.textContent = "Receipt 링크를 복사했습니다.";
    } catch {
      if (copyFeedback) {
        copyFeedback.textContent = "링크를 복사하지 못했습니다. 주소창에서 직접 복사해 주세요.";
      }
    }
  });
}

function renderHelp() {
  const summary = [
    `Action: ${runState?.manifestPreview?.actionName ?? "Mock vault 테스트넷 액션"}`,
    `Wallet: ${runState?.wallet ? shortHash(runState.wallet) : "현재 탭에 없음"}`,
    `Deposit transaction: ${runState?.depositTxHash ? shortHash(runState.depositTxHash) : "확인 중"}`,
    `Receipt: ${runState?.receiptHash ? shortHash(runState.receiptHash) : "검증 중"}`
  ].join("\n");
  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow user-help-hero" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "Help / Recovery" }),
        view("h1", { text: "현재 실행을 안전하게 복구하세요" }),
        view("p", { className: "lead", text: "예치 해시가 저장된 현재 탭에서는 액션 화면의 같은 기본 버튼으로 검증만 다시 시도할 수 있습니다." }),
        view("p", { className: "notice", role: "status", "aria-live": "polite", text: notice }),
        view("div", { className: "hero-actions" }, [
          view("a", { className: "secondary-link", href: "/user", text: "액션으로 돌아가기" }),
          view("a", { className: "secondary-link", href: "/user/receipts", text: "내 Receipt" })
        ])
      ]),
      view("section", { className: "user-help-panel user-help-card" }, [
        view("h2", { text: "지원용 공개 요약" }),
        view("p", { className: "muted", text: "지갑 서명 정보나 탭 전용 접근 값은 포함하지 않습니다." }),
        view("button", { type: "button", id: "copy-support-summary", text: "지원 요약 복사" }),
        view("pre", { className: "user-support-summary", text: summary })
      ])
    ])
  );
  document.querySelector("#copy-support-summary")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(summary);
      notice = "지원 요약을 복사했습니다.";
    } catch {
      notice = publicNotice("copy");
    }
    renderHelp();
  });
}

async function invalidateCapturedRun(staleRun, reason) {
  const identity = projectInvalidationIdentity(staleRun);
  if (identity === null) return;
  try {
    await participantFetch(identity, `/api/runs/${identity.runId}/invalidate`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  } catch {
    // Session state is already cleared; invalidation is deliberately best effort.
  }
}

async function invalidateRun(reason) {
  const staleRun = beginContextChange();
  const context = captureContext();
  await invalidateCapturedRun(staleRun, reason);
  assertContext(context);
  return context;
}

async function handleAccountsChanged(accounts) {
  const stale = beginContextChange();
  try {
    const nextAccount = Array.isArray(accounts) && accounts[0] ? normalizeAccount(accounts[0]) : null;
    walletState = {
      ...walletState,
      account: nextAccount,
      status: nextAccount === null ? "disconnected" : walletState.chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain"
    };
    notice = publicNotice("context");
    const context = captureContext();
    render();
    await invalidateCapturedRun(stale, "account_changed");
    assertContext(context);
    if (nextAccount !== null && walletState.chainId === GIWA_CHAIN_ID) await inspectWalletAssets(context);
  } catch (error) {
    if (error instanceof Error && error.message === "context_changed") return;
    walletState = { status: "disconnected", account: null, chainId: walletState.chainId };
    notice = publicNotice("context");
  }
  render();
}

async function handleChainChanged(chainIdHex) {
  const stale = beginContextChange();
  try {
    const nextChainId = parseChainId(chainIdHex);
    walletState = {
      ...walletState,
      chainId: nextChainId,
      status: walletState.account === null ? "disconnected" : nextChainId === GIWA_CHAIN_ID ? "connected" : "wrongChain"
    };
    notice = publicNotice("context");
    const context = captureContext();
    render();
    await invalidateCapturedRun(stale, "chain_changed");
    assertContext(context);
    if (walletState.account !== null && nextChainId === GIWA_CHAIN_ID) await inspectWalletAssets(context);
  } catch (error) {
    if (error instanceof Error && error.message === "context_changed") return;
    walletState = { ...walletState, status: walletState.account === null ? "disconnected" : "wrongChain", chainId: null };
    notice = publicNotice("context");
  }
  render();
}

function render() {
  const route = routeName();
  if (route === "receipts") renderReceiptsList();
  else if (route === "help") renderHelp();
  else if (route === "receipt") void renderReceiptRoute();
  else renderActionPage();
}

async function initializePublicMission() {
  if (routeName() !== "action" || isRecordedMismatchExample()) return;
  const context = captureContext();
  try {
    await loadPublicConfig(context);
    if (contextIsCurrent(context)) render();
  } catch {
    if (contextIsCurrent(context)) {
      notice = "공개 미션 조건을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      render();
    }
  }
}

const currentProvider = provider();
if (currentProvider?.on) {
  currentProvider.on("accountsChanged", (accounts) => void handleAccountsChanged(accounts));
  currentProvider.on("chainChanged", (chainIdHex) => void handleChainChanged(chainIdHex));
}

if (restoredSession.invalidation !== null) {
  void invalidateCapturedRun(restoredSession.invalidation, "invalid_session");
}

render();
void initializePublicMission();

const app = document.querySelector("#app");
const GIWA_CHAIN_ID = 91342;
const GIWA_CHAIN_HEX = "0x164ce";
const GIWA_EXPLORER_TX_BASE = "https://sepolia-explorer.giwa.io/tx/";
const USER_RUN_KEY = "giwa:userRunState";
const USER_WALLET_TX_KEY = "giwa:userWalletTxState";
const USER_RECEIPTS_KEY = "giwa:userReceipts";
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
const activeRequestControllers = new Set();
const contextChangeListeners = new Set();
let notice = "지갑을 연결해 GIWA Sepolia 테스트넷 액션을 시작하세요.";

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
  if (
    (value.approveTxHash != null && approveTxHash === null) ||
    (value.pendingApproveTxHash != null && pendingApproveTxHash === null) ||
    (value.depositTxHash != null && depositTxHash === null) ||
    (value.receiptHash != null && receiptHash === null) ||
    (approveTxHash !== null && pendingApproveTxHash !== null) ||
    typeof value.evidenceSubmitted !== "boolean" ||
    (value.evidenceSubmitted && depositTxHash === null)
  ) {
    return null;
  }
  return {
    runId,
    runCapability: capability,
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
  const candidate = projectSessionRun({
    runId: value.runId,
    runCapability: value.runCapability,
    wallet: value.wallet,
    status: value.status,
    intentHash: value.intentHash,
    expiryUnix: value.expiryUnix,
    manifestPreview: value.manifestPreview,
    approveTxHash: null,
    pendingApproveTxHash: null,
    depositTxHash: null,
    receiptHash: null,
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
  return projectSessionRun({
    runId: base.runId,
    runCapability: base.runCapability,
    wallet: base.wallet,
    status,
    intentHash: base.intentHash,
    expiryUnix: base.expiryUnix,
    manifestPreview: base.manifestPreview,
    approveTxHash,
    pendingApproveTxHash: base.pendingApproveTxHash,
    depositTxHash,
    receiptHash,
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
  } catch {
    notice = "이 브라우저의 Receipt 목록을 저장할 수 없습니다. 공개 Receipt 링크는 계속 사용할 수 있습니다.";
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

function combineDemoStageState(states) {
  if (states.includes("blocked")) return "blocked";
  if (states.every((state) => state === "complete")) return "complete";
  if (states.includes("active")) return "active";
  return "pending";
}

function demoProgressStages() {
  const states = Object.fromEntries(
    progressSteps().map(([id, , , state]) => [id, state])
  );
  return [
    ["prepare", "준비", combineDemoStageState([states.wallet_connected])],
    ["review", "조건 검토", combineDemoStageState([states.intent_issued])],
    [
      "execute",
      "실행",
      combineDemoStageState([
        states.approval_submitted,
        states.deposit_submitted
      ])
    ],
    [
      "receipt",
      "Receipt",
      combineDemoStageState([
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

function publicNotice(kind) {
  const notices = {
    wallet: "지갑 요청이 완료되지 않았습니다. 지갑 상태를 확인하고 다시 시도해 주세요.",
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
    connect: "지갑 연결",
    switch_chain: "GIWA Sepolia로 전환",
    open_faucet: "테스트 ETH 받기",
    mint: "Mock Token 준비",
    issue_manifest: "액션 검토",
    approve: "정확한 수량 승인",
    deposit: "Vault에 예치",
    verify: "검증 중",
    open_receipt: "영수증 보기"
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

function stepIcon(state) {
  if (state === "complete") return "✓";
  if (state === "active") return "→";
  if (state === "blocked") return "!";
  return "·";
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
      progressSteps().map(([id, label, detail, state]) =>
        view("li", { className: `status-step ${state}`, "data-step": id }, [
          view("span", { className: "status-icon", text: stepIcon(state), title: state }),
          view("span", { className: "status-body" }, [
            view("strong", { text: label }),
            view("span", { text: detail }),
            view("em", { text: id === "standard_rpc_receipt_found" ? "Standard RPC evidence" : "Evaluator step" })
          ])
        ])
      )
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
    view("a", { className: "secondary-link giwa-demo-product-link", href: "/", text: "제품 소개" })
  ]);
}

function renderDemoStageRail() {
  return view(
    "ol",
    { className: "giwa-demo-stage-rail", "aria-label": "데모 진행 단계" },
    demoProgressStages().map(([id, label, state], index) =>
      view("li", {
        className: `giwa-demo-stage ${state}`,
        "data-demo-stage": id,
        "aria-current": state === "active" ? "step" : null
      }, [
        view("span", { text: String(index + 1).padStart(2, "0") }),
        view("strong", { text: label }),
        view("em", { text: state })
      ])
    )
  );
}

function renderExpectedSteps() {
  return view("ul", { className: "user-step-list" }, [
    view("li", { text: "1. 연결한 지갑과 테스트 자산 상태를 확인합니다." }),
    view("li", { text: "2. Manifest에 고정된 액션을 검토하고 지갑에서 실행합니다." }),
    view("li", { text: "3. Standard RPC 검증이 일치한 경우에만 Receipt를 받습니다." })
  ]);
}

function renderActionSummary() {
  return view("section", { className: "panel user-action-summary" }, [
    view("p", { className: "eyebrow", text: "Action summary" }),
    view("h2", { text: "Mock vault 테스트넷 액션" }),
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
    return view("section", { className: "panel" }, [
      view("p", { className: "eyebrow", text: "Manifest" }),
      view("h2", { text: "검토 전 준비 단계" }),
      view("p", { className: "muted", text: "지갑, 네트워크와 테스트 자산이 준비되면 지갑에 고정된 Manifest를 발급합니다." }),
      field("Required network", "GIWA Sepolia 91342"),
      field("Technical details", "Manifest 발급 후 표시")
    ]);
  }

  return view("section", { className: "panel user-intent-panel" }, [
    view("p", { className: "eyebrow", text: "Manifest" }),
    view("h2", { text: preview.actionName ?? "Mock vault 테스트넷 액션" }),
    view("p", { className: "notice", text: "승인이 필요한 경우 Manifest의 정확한 데모 수량만 승인합니다. 실제 자산은 사용하지 않습니다." }),
    field("Network", "GIWA Sepolia 91342"),
    field("Amount", preview.amountBaseUnits),
    field("Target", preview.target),
    field("Asset", preview.asset),
    field("Spender", preview.spender),
    field("Max allowance", preview.maxAllowanceBaseUnits),
    field("Expiry", preview.expiryUnix ?? runState.expiryUnix),
    field("Wallet", runState.wallet),
    field("Intent hash", preview.intentHash),
    view("details", { className: "panel user-technical-details" }, [
      view("summary", { text: "Technical details" }),
      field("Selector", preview.selector ?? DEPOSIT_SELECTOR),
      field("Run", runState.runId),
      field("Approve transaction", runState.approveTxHash ?? "필요 여부 확인 중"),
      field("Deposit transaction", runState.depositTxHash ?? "아직 제출하지 않음")
    ])
  ]);
}

function renderActionPage() {
  const action = nextPrimaryAction();
  const demoRoute = isGiwaDemoRoute();
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

  app.textContent = "";
  const actionPage = view("section", {
    className: `hero-flow user-action-hero ${demoRoute ? "giwa-demo-frame" : ""}`
  }, [
    view("div", { className: "hero-copy" }, [
      view("p", { className: "eyebrow", text: "GIWA Verified Intent Rail" }),
      ...(demoRoute ? [renderDemoStageRail()] : []),
      view("h1", {
        text: demoRoute
          ? "조건을 확인하고 GIWA에서 실행하세요"
          : "서명 전에 테스트넷 액션을 검토하세요"
      }),
      view("p", {
        className: "lead",
        text: demoRoute
          ? "현재 필요한 액션 하나만 안내합니다. 실행 후 Manifest와 트랜잭션을 대조해 공개 Receipt를 만듭니다."
          : "한 개의 버튼이 현재 필요한 단계만 안내합니다. Manifest와 일치한 트랜잭션만 공개 Receipt를 받습니다."
      }),
      view("p", {
        className: "notice",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        text: notice
      }),
      view("p", {
        className: flowStateClass(),
        text: inFlight ? `${primaryLabel()} 작업을 처리하고 있습니다.` : assetCopy()
      }),
      view("div", {
        className: "hero-actions user-cta-cluster",
        "data-current-action": action
      }, actions),
      ...(demoRoute ? [] : [renderStatusRail()])
    ]),
    view("div", { className: demoRoute ? "giwa-demo-evidence" : "" }, [
      renderActionSummary(),
      renderIntentPanel()
    ])
  ]);

  app.append(...(demoRoute ? [renderDemoTopBar(), actionPage] : [actionPage]));
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
  if (chainId === GIWA_CHAIN_ID) await inspectWalletAssets(captureContext());
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
      notice = "검증 결과가 Manifest와 일치하지 않아 Receipt를 발급하지 않았습니다.";
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
  if (currentProvider === null && action !== "open_receipt") {
    walletState = { status: "providerMissing", account: null, chainId: null };
    notice = publicNotice("wallet");
    render();
    return;
  }

  inFlight = true;
  render();
  try {
    if (action === "connect") {
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
      notice = actionCommittedWalletContext ? publicNotice("readiness") : publicNotice("wallet");
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

function storeReceiptProjection(state = receiptStateFromRun()) {
  const items = readReceiptHistory();
  const id = runState?.receiptHash ?? runState?.depositTxHash ?? runState?.runId;
  if (!id) return;
  const next = {
    id,
    state,
    actionName: runState?.manifestPreview?.actionName ?? "Mock vault 테스트넷 액션",
    receiptHash: runState?.receiptHash ?? null,
    depositTxHash: runState?.depositTxHash ?? null
  };
  const filtered = items.filter((item) => item.id !== id);
  writeReceiptHistory([next, ...filtered].slice(0, 12));
}

function renderReceiptCard(item) {
  const href = item.receiptHash ? `/user/receipt/${item.receiptHash}` : "/user/help";
  return view("article", { className: "user-receipt-card" }, [
    view("p", { className: `status-pill ${item.state === "verified" ? "ready" : "blocked"}`, text: item.state }),
    view("h2", { text: item.actionName ?? "Mock vault 테스트넷 액션" }),
    field("Receipt", item.receiptHash ?? "검증 중"),
    field("Deposit", item.depositTxHash ?? "확인 중"),
    view("a", { className: "secondary-link", href, text: item.receiptHash ? "Receipt 열기" : "복구 안내" })
  ]);
}

function filterReceipts(items, filter) {
  if (filter === "all") return items;
  return items.filter((item) => item.state === filter);
}

function renderReceiptsList() {
  const params = new URLSearchParams(location.search);
  const filter = params.get("filter") ?? "all";
  const items = filterReceipts(readReceiptHistory(), filter);
  app.textContent = "";
  app.append(
    view("section", { className: "band user-list-band" }, [
      view("div", { className: "section-heading" }, [
        view("div", {}, [view("p", { className: "eyebrow", text: "My Receipts" }), view("h1", { text: "이 브라우저에 저장된 Receipt" })]),
        view("a", { className: "secondary-link", href: "/user", text: "새 액션 시작" })
      ]),
      view("div", { className: "user-filter-row", "aria-label": "Receipt 상태 필터" }, [
        view("a", { className: "secondary-link", href: "/user/receipts?filter=all", text: "전체" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=verified", text: "검증 완료" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=pending", text: "검증 중" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=notMatched", text: "불일치" })
      ]),
      items.length === 0
        ? view("p", { className: "notice", text: "이 브라우저에 저장된 Receipt가 없습니다." })
        : view("div", { className: "proof-grid" }, items.map(renderReceiptCard))
    ])
  );
}

function normalizeReceiptVerification(body) {
  const nested = body?.verification;
  if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
    return {
      confirmationDepth: nested.confirmationDepth ?? null,
      verifierInputHash: nested.verifierInputHash ?? null
    };
  }
  return {
    confirmationDepth: body?.confirmationDepth ?? null,
    verifierInputHash: body?.verifierInputHash ?? null
  };
}

async function renderReceiptRoute() {
  const hash = receiptHashFromRoute();
  app.textContent = "";
  app.append(view("section", { className: "loading-panel" }, [view("p", { className: "eyebrow", text: "Receipt" }), view("h1", { text: "Receipt를 불러오는 중" })]));
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
  const matched = response !== null && response.ok && body?.receiptHash === hash && body?.payload?.status === "matched";
  const receiptHash = matched ? body.receiptHash : null;
  const wallet = matched ? body?.payload?.wallet : null;
  const target = matched ? body?.payload?.target : null;
  const asset = matched ? body?.payload?.asset : null;
  const amountBaseUnits = matched ? body?.payload?.amountBaseUnits : null;
  const depositTxHash = matched ? body?.payload?.depositTxHash : null;
  const blockNumber = matched ? body?.payload?.depositBlockNumber : null;
  const blockHash = matched ? body?.payload?.depositBlockHash : null;
  const issuedAt = matched ? body?.payload?.issuedAt : null;
  const safetyNotice = matched ? body?.payload?.safetyNotice : null;
  const verification = normalizeReceiptVerification(body);
  const txExplorerUrl = explorerTxUrl(depositTxHash);
  const issuedTime = Number.isInteger(issuedAt) ? new Date(issuedAt * 1000).toISOString() : "확인 중";

  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow receipt-hero user-receipt-page" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "GIWA Verified Intent Rail · Receipt" }),
        view("h1", { text: matched ? "Manifest matched" : "Receipt를 확인할 수 없습니다" }),
        view("p", { className: "lead", text: matched ? "확인된 테스트넷 트랜잭션이 서명된 Manifest와 일치합니다." : "알 수 없는 Receipt도 동일한 비공개 상태로 표시됩니다." }),
        view("p", { className: matched ? "user-state complete" : "user-state blocked", role: "status", "aria-live": "polite", text: matched ? "검증 완료" : "공개 Receipt 없음" }),
        view("div", { className: "hero-actions user-receipt-actions" }, [
          view("button", { type: "button", id: "copy-receipt-link", disabled: !matched, text: "Receipt 링크 복사" }),
          txExplorerUrl === null
            ? view("span", { className: "disabled-link", text: "트랜잭션 열기" })
            : view("a", { className: "secondary-link", href: txExplorerUrl, target: "_blank", rel: "noopener noreferrer", text: "트랜잭션 열기" }),
          matched
            ? view("a", { className: "secondary-link", href: `/receipt/${receiptHash}`, text: "검증 증거 열기" })
            : view("span", { className: "disabled-link", text: "검증 증거 열기" }),
          view("a", { className: "secondary-link", href: "/giwa-demo", text: "다시 실행" }),
          view("a", { className: "secondary-link", href: "/", text: "제품 소개" })
        ])
      ]),
      view("article", { className: "user-receipt-card" }, [
        view("p", { className: `status-pill ${matched ? "ready" : "blocked"}`, text: matched ? "Manifest matched" : "unavailable" }),
        field("Receipt hash", receiptHash),
        field("Deposit transaction", depositTxHash),
        field("Wallet", wallet),
        field("Target", target),
        field("Asset", asset),
        field("Amount", amountBaseUnits),
        field("Block number", blockNumber),
        field("Block hash", blockHash),
        field("Confirmation depth", matched ? verification.confirmationDepth : null),
        field("Verifier input hash", matched ? verification.verifierInputHash : null),
        field("Issued time", issuedTime),
        view("p", { className: "notice user-safety-notice", text: safetyNotice ?? "Testnet-only Receipt만 공개됩니다." })
      ])
    ])
  );
  document.querySelector("#copy-receipt-link")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      notice = "Receipt 링크를 복사했습니다.";
    } catch {
      notice = publicNotice("copy");
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

const currentProvider = provider();
if (currentProvider?.on) {
  currentProvider.on("accountsChanged", (accounts) => void handleAccountsChanged(accounts));
  currentProvider.on("chainChanged", (chainIdHex) => void handleChainChanged(chainIdHex));
}

if (restoredSession.invalidation !== null) {
  void invalidateCapturedRun(restoredSession.invalidation, "invalid_session");
}

render();

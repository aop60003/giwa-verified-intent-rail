const app = document.querySelector("#app");
const GIWA_CHAIN_ID = 91342;
const GIWA_CHAIN_HEX = "0x164ce";
const GIWA_EXPLORER_TX_BASE = "https://sepolia-explorer.giwa.io/tx/";
const REQUEST_TIMEOUT_MS = 8000;
const RECORDED_RECEIPT_HASH = "0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503";
const USER_RUN_KEY = "giwa:userRunState";
const USER_RECEIPTS_KEY = "giwa:userReceipts";
const addChainRequest = {
  chainId: GIWA_CHAIN_HEX,
  chainName: "GIWA Sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia-rpc.giwa.io"],
  blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
};

let walletState = { status: "disconnected", account: null, chainId: null };
let runState = readJson(USER_RUN_KEY, null);
let notice = "Ready to review your testnet action.";
let runtimeState = { checked: false, liveApiAvailable: false, mode: "checking" };

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    notice = "Local browser storage is unavailable. Continue from this page.";
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
    view("span", { className: "mono field-value hash-wrap", text: String(value ?? "pending") })
  ]);
}

function shortHash(value) {
  if (typeof value !== "string" || value.length <= 18) return String(value ?? "pending");
  return `${value.slice(0, 10)}...${value.slice(-5)}`;
}

function explorerTxUrl(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value) ? `${GIWA_EXPLORER_TX_BASE}${value}` : null;
}

function routeName() {
  if (location.pathname === "/user/receipts") return "receipts";
  if (location.pathname === "/user/help") return "help";
  if (location.pathname.startsWith("/user/receipt/")) return "receipt";
  return "action";
}

function receiptHashFromRoute() {
  return decodeURIComponent(location.pathname.slice("/user/receipt/".length));
}

function provider() {
  return window.ethereum ?? null;
}

function normalizeAccount(account) {
  if (typeof account !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
    throw new Error("invalid_account");
  }
  return account.toLowerCase();
}

function parseChainId(value) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]+$/.test(value)) {
    throw new Error("invalid_chain");
  }
  return Number.parseInt(value, 16);
}

function publicNotice(kind) {
  const notices = {
    wallet: "Wallet request was not completed. Check the wallet state and try again.",
    network: "Switch to GIWA Sepolia to continue.",
    manifest: "Action preview could not be created. Retry from this page.",
    approve: "Approve request was not completed. Check the wallet and try again.",
    deposit: "Deposit request was not completed. Check the wallet and try again.",
    verify: "Verification is temporarily unavailable. Retry from this receipt.",
    recovery: "Enter a valid transaction hash and try again.",
    copy: "Copy action was not completed. Select the text manually if needed."
  };
  return notices[kind] ?? "Request was not completed. Try again from the current step.";
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(path, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readApiJson(path, options = {}) {
  const response = await fetchWithTimeout(path, options);
  const body = await response.json();
  return { response, body };
}

function liveApiReady() {
  return runtimeState.checked && runtimeState.liveApiAvailable;
}

function runtimeNotice() {
  if (!runtimeState.checked) return "Checking whether wallet submission is available.";
  if (runtimeState.liveApiAvailable) {
    return "Wallet submission is available for this browser run.";
  }
  return "Wallet submission is unavailable here. You can still inspect the recorded testnet receipt.";
}

function primaryLabel() {
  if (!runtimeState.checked) return "Preparing action";
  if (!runtimeState.liveApiAvailable) return "Open recorded receipt";
  if (walletState.account === null) return "Connect wallet";
  if (walletState.chainId !== GIWA_CHAIN_ID) return "Switch to GIWA Sepolia";
  if (runState?.receiptHash) return "View receipt";
  if (runState?.depositTxHash) return "Verify receipt";
  if (runState?.manifestPreview) return "Continue to wallet";
  return "Review action";
}

function walletCopy() {
  if (!runtimeState.checked) return "Checking wallet submission availability.";
  if (!runtimeState.liveApiAvailable) return "Wallet actions are unavailable while viewing recorded evidence.";
  if (walletState.status === "providerMissing") return "Browser wallet was not detected.";
  if (walletState.status === "wrongChain") return "Switch to GIWA Sepolia before continuing.";
  if (walletState.account === null) return "Connect a wallet to review the action.";
  return "Wallet connected on GIWA Sepolia.";
}

function isExpired() {
  const expiry = Number(runState?.expiryUnix ?? runState?.manifestPreview?.expiryUnix ?? 0);
  return expiry > 0 && Math.floor(Date.now() / 1000) > expiry;
}

function manifestReady() {
  return liveApiReady() && walletState.status === "connected" && runState?.manifestPreview && !isExpired() && runState.status !== "manifestInvalidated";
}

function txReady(kind) {
  if (!manifestReady()) return false;
  if (kind === "approve") return !runState.approveTxHash;
  if (kind === "deposit") return !runState.depositTxHash;
  return false;
}

function verifyReady() {
  if (!liveApiReady()) return false;
  if (!runState?.runId || !runState.depositTxHash) return false;
  if (runState.status === "matched" || runState.status === "mismatched" || runState.status === "failed") return false;
  return runState.verification?.status !== "queued";
}

function statusLabel(state) {
  if (state === "complete") return "Done";
  if (state === "active") return "Current";
  if (state === "blocked") return "Needs review";
  return "Next";
}

function progressSteps() {
  const walletReady = walletState.status === "connected" && walletState.chainId === GIWA_CHAIN_ID;
  const hasPreview = runState?.manifestPreview !== null && runState?.manifestPreview !== undefined;
  const hasApprove = typeof runState?.approveTxHash === "string";
  const hasDeposit = typeof runState?.depositTxHash === "string";
  const matched = runState?.status === "matched";
  const failed = runState?.status === "mismatched" || runState?.status === "failed";
  const receiptFound = matched || failed || runState?.status === "timeout" || runState?.status === "verifierChecking";
  return [
    [
      "wallet_connected",
      "Connect wallet",
      walletReady ? "Wallet connected on GIWA Sepolia." : "Connect a wallet on GIWA Sepolia.",
      walletReady ? "complete" : "active"
    ],
    ["intent_issued", "Intent issued", "The action preview is bound to your wallet.", hasPreview ? "complete" : "pending"],
    ["approval_submitted", "Approval submitted", "Your wallet returned the approval transaction hash.", hasApprove ? "complete" : "pending"],
    ["deposit_submitted", "Deposit submitted", "Your wallet returned the deposit transaction hash.", hasDeposit ? "complete" : "pending"],
    ["standard_rpc_receipt_found", "Block evidence found", "The verifier found standard RPC block evidence.", receiptFound ? "complete" : "pending"],
    ["verification_matched", "Verification matched", "The confirmed transaction matched the reviewed action.", matched ? "complete" : failed ? "blocked" : "pending"],
    ["receipt_ready", "Receipt ready", "Your receipt is ready to view and share.", runState?.receiptHash ? "complete" : "pending"]
  ];
}

function renderStatusRail() {
  return view("section", { className: "user-progress-panel", "aria-label": "Transaction progress" }, [
    view("div", { className: "user-progress-heading" }, [
      view("p", { className: "eyebrow", text: "Progress" }),
      view("h2", { text: "What happens next" })
    ]),
    view(
      "ol",
      { className: "status-rail user-status-rail" },
      progressSteps().map(([id, label, detail, state], index) =>
        view("li", { className: `status-step ${state}`, "data-step": id, "aria-current": state === "active" ? "step" : null }, [
          view("span", { className: "status-icon", text: String(index + 1), title: statusLabel(state) }),
          view("span", { className: "status-body" }, [
            view("strong", { text: label }),
            view("span", { text: detail }),
            view("em", { text: id === "standard_rpc_receipt_found" ? "Standard RPC evidence" : "User step" })
          ]),
          view("span", { className: "status-state", text: statusLabel(state) })
        ])
      )
    )
  ]);
}

function renderExpectedSteps() {
  const steps = [
    "Connect wallet",
    "Review testnet action",
    "Submit approval in wallet",
    "Submit deposit in wallet",
    "Verify evidence",
    "Open receipt"
  ];
  return view(
    "ul",
    { className: "user-step-list" },
    steps.map((step) => view("li", { text: step }))
  );
}

function renderActionSummary() {
  return view("section", { className: "panel user-action-summary" }, [
    view("p", { className: "eyebrow", text: "Checkout summary" }),
    view("h2", { text: "First mock vault action" }),
    view("div", { className: "user-gate-grid" }, [
      view("div", { className: "user-gate-card" }, [
        view("span", { className: "field-label", text: "Network" }),
        view("strong", { text: "GIWA Sepolia" }),
        view("span", { className: "muted", text: "Chain 91342" })
      ]),
      view("div", { className: "user-gate-card" }, [
        view("span", { className: "field-label", text: "Wallet" }),
        view("strong", { text: walletState.account === null ? "Connect required" : shortHash(walletState.account) }),
        view("span", { className: "muted", text: walletCopy() })
      ]),
      view("div", { className: "user-gate-card" }, [
        view("span", { className: "field-label", text: "Receipt" }),
        view("strong", { text: runState?.receiptHash ? shortHash(runState.receiptHash) : "Issued after match" }),
        view("span", { className: "muted", text: "Requires verifier match" })
      ])
    ]),
    renderExpectedSteps()
  ]);
}

function renderIntentPanel() {
  const preview = runState?.manifestPreview ?? null;
  if (preview === null) {
    return view("section", { className: "panel" }, [
      view("p", { className: "eyebrow", text: "Intent preview" }),
      view("h2", { text: "Review action details" }),
      view("p", { className: "muted", text: "Review the action before your wallet asks for approval or deposit submission." }),
      field("Required network", "GIWA Sepolia 91342"),
      field("Technical details", "available after action review")
    ]);
  }

  return view("section", { className: "panel user-intent-panel" }, [
    view("p", { className: "eyebrow", text: "Intent preview" }),
    view("h2", { text: preview.actionName ?? "Mock vault testnet action" }),
    field("Amount", preview.amountBaseUnits),
    field("Target", shortHash(preview.target)),
    field("Wallet", shortHash(preview.wallet ?? walletState.account)),
    field("Expiry", preview.expiryUnix ?? runState.expiryUnix),
    view("details", { className: "panel user-technical-details" }, [
      view("summary", { text: "Technical details" }),
      field("Target", preview.target),
      field("Selector", preview.selector ?? "0x47e7ef24"),
      field("Asset", preview.asset ?? "pending"),
      field("Spender", preview.spender ?? "pending"),
      field("Max allowance", preview.maxAllowanceBaseUnits ?? "pending"),
      field("Intent hash", preview.intentHash)
    ])
  ]);
}

function renderWalletActionControls() {
  if (
    !liveApiReady() ||
    (!runState?.manifestPreview && !runState?.approveTxHash && !runState?.depositTxHash && !runState?.verification)
  ) {
    return null;
  }
  return view("div", { className: "user-wallet-actions", "aria-label": "Wallet transaction actions" }, [
    view("button", {
      type: "button",
      id: "user-approve-action",
      disabled: !txReady("approve"),
      text: runState?.approveTxHash ? "Approval submitted" : "Submit approval"
    }),
    view("button", {
      type: "button",
      id: "user-deposit-action",
      disabled: !txReady("deposit"),
      text: runState?.depositTxHash ? "Deposit submitted" : "Submit deposit"
    }),
    view("button", {
      type: "button",
      id: "user-verify-action",
      disabled: !verifyReady(),
      text: runState?.receiptHash ? "Receipt ready" : "Verify evidence"
    })
  ]);
}

function renderActionPage() {
  const walletActions = renderWalletActionControls();
  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow user-action-hero" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "GIWA Verified Intent Rail" }),
        view("h1", { text: "Review action before signing" }),
        view("p", {
          className: "lead",
          text: "Check the signed intent, submit the GIWA Sepolia wallet actions, and receive a matched testnet receipt."
        }),
        view("p", { className: "notice", text: runtimeNotice() }),
        view("p", {
          className: "muted",
          text: "Testnet-only mock action. It does not move mainnet funds, provide returns, or perform identity checks."
        }),
        view("p", { className: "notice", role: "status", "aria-live": "polite", text: notice }),
        view("p", { className: "muted", text: walletCopy() }),
        view("div", { className: "hero-actions user-cta-cluster" }, [
          view("button", { type: "button", id: "user-primary-action", text: primaryLabel() }),
          view("a", { className: "secondary-link", href: "/user/help", text: "Need help?" }),
          view("a", { className: "secondary-link", href: "/user/receipts", text: "My receipts" })
        ]),
        walletActions ?? view("span", { className: "user-wallet-actions-placeholder" }),
        renderStatusRail()
      ]),
      view("div", { className: "user-checkout-side" }, [renderActionSummary(), renderIntentPanel()])
    ])
  );
  document.querySelector("#user-primary-action")?.addEventListener("click", onPrimaryAction);
  document.querySelector("#user-approve-action")?.addEventListener("click", onApproveAction);
  document.querySelector("#user-deposit-action")?.addEventListener("click", onDepositAction);
  document.querySelector("#user-verify-action")?.addEventListener("click", onVerifyAction);
}

function encodeAddressWord(value) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error("invalid_address");
  return value.slice(2).toLowerCase().padStart(64, "0");
}

function encodeUint256Word(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) throw new Error("invalid_amount");
  return BigInt(value).toString(16).padStart(64, "0");
}

function approveCalldata(preview) {
  return `0x095ea7b3${encodeAddressWord(preview.spender)}${encodeUint256Word(preview.maxAllowanceBaseUnits)}`;
}

function depositCalldata(preview) {
  return `0x47e7ef24${encodeAddressWord(preview.asset)}${encodeUint256Word(preview.amountBaseUnits)}`;
}

async function connectWallet(currentProvider) {
  const accounts = await currentProvider.request({ method: "eth_requestAccounts" });
  const chainId = parseChainId(await currentProvider.request({ method: "eth_chainId" }));
  walletState = {
    status: chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain",
    account: normalizeAccount(accounts[0]),
    chainId
  };
}

async function switchToGiwa(currentProvider) {
  try {
    await currentProvider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GIWA_CHAIN_HEX }] });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 4902) {
      await currentProvider.request({ method: "wallet_addEthereumChain", params: [addChainRequest] });
    } else {
      throw error;
    }
  }
  const chainId = parseChainId(await currentProvider.request({ method: "eth_chainId" }));
  walletState = { ...walletState, status: chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain", chainId };
}

async function issueManifest() {
  if (walletState.account === null || walletState.chainId !== GIWA_CHAIN_ID) return;
  const { response, body } = await readApiJson("/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet: walletState.account,
      chainId: walletState.chainId,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null
    })
  });
  if (!response.ok) {
    notice = publicNotice("manifest");
    return;
  }
  runState = body;
  writeJson(USER_RUN_KEY, runState);
  notice = "Intent preview ready. Review before wallet submission.";
}

async function sendWalletTransaction(request) {
  const currentProvider = provider();
  if (currentProvider === null) throw new Error("wallet_missing");
  const hash = await currentProvider.request({ method: "eth_sendTransaction", params: [request] });
  if (typeof hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error("invalid_hash");
  return hash.toLowerCase();
}

async function submitEvidence() {
  if (!runState?.runId || !runState.depositTxHash) return;
  const { response, body } = await readApiJson(`/api/runs/${runState.runId}/evidence`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      approveTxHash: runState.approveTxHash ?? null,
      depositTxHash: runState.depositTxHash
    })
  });
  if (!response.ok) {
    notice = "Transaction hash was saved locally. Verification can be retried from Help.";
    return;
  }
  runState = { ...runState, ...body };
  writeJson(USER_RUN_KEY, runState);
  storeReceiptProjection("pending");
  notice = "Deposit submitted. Verify receipt when block evidence is ready.";
}

async function verifyReceipt() {
  if (!verifyReady()) return;
  const { response, body } = await readApiJson(`/api/runs/${runState.runId}/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  if (!response.ok) {
    notice = publicNotice("verify");
    return;
  }
  runState = { ...runState, ...body };
  writeJson(USER_RUN_KEY, runState);
  storeReceiptProjection(runState.status === "matched" ? "verified" : runState.status === "failed" ? "notMatched" : "pending");
  notice = runState.status === "matched" ? "Verified receipt ready." : "Verification complete. Review receipt status.";
}

async function onPrimaryAction() {
  if (!runtimeState.checked) {
    notice = "Action availability is still being checked.";
    render();
    return;
  }
  if (!runtimeState.liveApiAvailable) {
    location.href = `/receipt/${RECORDED_RECEIPT_HASH}`;
    return;
  }
  const currentProvider = provider();
  if (currentProvider === null) {
    walletState = { status: "providerMissing", account: null, chainId: null };
    notice = publicNotice("wallet");
    render();
    return;
  }

  try {
    if (walletState.account === null) await connectWallet(currentProvider);
    if (walletState.status === "wrongChain") await switchToGiwa(currentProvider);
    if (walletState.status === "connected") await issueManifest();
  } catch {
    notice = publicNotice("wallet");
  }
  render();
}

async function onApproveAction() {
  if (!txReady("approve")) return;
  try {
    const preview = runState.manifestPreview;
    const approveTxHash = await sendWalletTransaction({
      from: walletState.account,
      to: preview.asset,
      data: approveCalldata(preview),
      value: "0x0"
    });
    runState = { ...runState, approveTxHash, status: "approveSubmitted" };
    writeJson(USER_RUN_KEY, runState);
    notice = "Approval submitted by wallet.";
  } catch {
    notice = publicNotice("approve");
  }
  render();
}

async function onDepositAction() {
  if (!txReady("deposit")) return;
  try {
    const preview = runState.manifestPreview;
    const depositTxHash = await sendWalletTransaction({
      from: walletState.account,
      to: preview.target,
      data: depositCalldata(preview),
      value: "0x0"
    });
    runState = { ...runState, depositTxHash, status: "depositSubmitted" };
    writeJson(USER_RUN_KEY, runState);
    await submitEvidence();
  } catch {
    notice = publicNotice("deposit");
  }
  render();
}

async function onVerifyAction() {
  try {
    await verifyReceipt();
  } catch {
    notice = publicNotice("verify");
  }
  render();
}

function receiptStateFromRun() {
  if (runState?.status === "matched" && runState?.receiptHash) return "verified";
  if (runState?.status === "failed" || runState?.status === "mismatched") return "notMatched";
  return "pending";
}

function storeReceiptProjection(state = receiptStateFromRun()) {
  const items = readJson(USER_RECEIPTS_KEY, []);
  const id = runState?.receiptHash ?? runState?.depositTxHash ?? runState?.runId;
  if (!id) return;
  const next = {
    id,
    state,
    actionName: runState?.manifestPreview?.actionName ?? "Mock vault testnet action",
    receiptHash: runState?.receiptHash ?? null,
    depositTxHash: runState?.depositTxHash ?? null
  };
  const filtered = items.filter((item) => item.id !== id);
  writeJson(USER_RECEIPTS_KEY, [next, ...filtered].slice(0, 12));
}

function renderReceiptCard(item) {
  const href = item.receiptHash ? `/user/receipt/${item.receiptHash}` : "/user/help";
  return view("article", { className: "user-receipt-card" }, [
    view("p", { className: `status-pill ${item.state === "verified" ? "ready" : "blocked"}`, text: item.state }),
    view("h2", { text: item.actionName ?? "Mock vault testnet action" }),
    field("Receipt", item.receiptHash ? shortHash(item.receiptHash) : "pending"),
    field("Deposit", item.depositTxHash ? shortHash(item.depositTxHash) : "pending"),
    view("a", { className: "secondary-link", href, text: item.receiptHash ? "Open receipt" : "Open recovery" })
  ]);
}

function renderRecordedReceiptCard() {
  return view("article", { className: "user-receipt-card" }, [
    view("p", { className: "status-pill ready", text: "recorded" }),
    view("h2", { text: "Recorded mock vault receipt" }),
    field("Receipt ID", shortHash(RECORDED_RECEIPT_HASH)),
    field("Network", "GIWA Sepolia"),
    field("Status", "verifier matched"),
    view("p", {
      className: "muted",
      text: "Recorded testnet receipt for the sample mock vault action."
    }),
    view("a", { className: "secondary-link", href: `/receipt/${RECORDED_RECEIPT_HASH}`, text: "View receipt" })
  ]);
}

function filterReceipts(items, filter) {
  if (filter === "all") return items;
  return items.filter((item) => item.state === filter);
}

function renderReceiptsList() {
  const params = new URLSearchParams(location.search);
  const filter = params.get("filter") ?? "all";
  const items = filterReceipts(readJson(USER_RECEIPTS_KEY, []), filter);
  app.textContent = "";
  app.append(
    view("section", { className: "band user-list-band" }, [
      view("div", { className: "section-heading" }, [
        view("div", {}, [view("p", { className: "eyebrow", text: "My receipts" }), view("h1", { text: "Testnet receipt history" })]),
        view("a", { className: "secondary-link", href: "/user", text: "Start action" })
      ]),
      view("div", { className: "user-receipts-layout" }, [
        view("aside", { className: "panel user-receipts-sidebar" }, [
          view("p", { className: "eyebrow", text: "Filters" }),
          view("div", { className: "user-filter-row" }, [
            view("a", { className: "secondary-link", href: "/user/receipts?filter=all", text: "All" }),
            view("a", { className: "secondary-link", href: "/user/receipts?filter=verified", text: "Verified" }),
            view("a", { className: "secondary-link", href: "/user/receipts?filter=pending", text: "Pending" }),
            view("a", { className: "secondary-link", href: "/user/receipts?filter=notMatched", text: "Not matched" })
          ])
        ]),
        items.length === 0
          ? view("div", { className: "user-empty-receipts" }, [
              view("p", {
                className: "notice",
                text: runtimeState.liveApiAvailable
                  ? "No receipts saved in this browser yet. Start an action to create your first receipt."
                  : "No receipts saved in this browser yet. You can inspect the recorded testnet receipt below."
              }),
              renderRecordedReceiptCard()
            ])
          : view("div", { className: "proof-grid user-receipt-grid" }, items.map(renderReceiptCard))
      ])
    ])
  );
}

async function renderReceiptRoute() {
  const hash = receiptHashFromRoute();
  app.textContent = "";
  app.append(view("section", { className: "loading-panel" }, [view("p", { className: "eyebrow", text: "Receipt" }), view("h1", { text: "Loading receipt" })]));
  let body = null;
  const shouldReadReceiptApi = runState?.receiptHash === hash || Boolean(runState?.depositTxHash);
  if (shouldReadReceiptApi) {
    try {
      const response = await fetchWithTimeout(`/api/receipts/${hash}`);
      body = response.ok ? await response.json() : null;
    } catch {
      body = null;
    }
  }
  const matched = body?.status === "matched" || body?.receipt?.receiptHash === hash;
  const receiptHash = body?.receiptHash ?? body?.receipt?.receiptHash ?? (matched ? hash : null);
  const depositTxHash = body?.depositTxHash ?? body?.receipt?.depositTxHash ?? runState?.depositTxHash ?? null;
  const txExplorerUrl = explorerTxUrl(depositTxHash);
  const blockNumber = body?.blockNumber ?? body?.receipt?.blockNumber ?? null;
  const state = matched ? "verified" : body?.status === "failed" ? "not matched" : "pending";
  if (!matched && hash.toLowerCase() === RECORDED_RECEIPT_HASH.toLowerCase()) {
    app.textContent = "";
    app.append(
      view("section", { className: "hero-flow receipt-hero user-receipt-page" }, [
        view("div", { className: "hero-copy" }, [
          view("p", { className: "eyebrow", text: "Testnet receipt" }),
          view("h1", { text: "Recorded receipt ready" }),
          view("p", {
            className: "lead",
            text: "The sample mock vault action has a recorded verifier-matched testnet receipt."
          }),
          view("div", { className: "hero-actions user-receipt-actions" }, [
            view("button", { type: "button", id: "copy-recorded-receipt-link", text: "Copy receipt link" }),
            view("a", { className: "secondary-link", href: `/receipt/${RECORDED_RECEIPT_HASH}`, text: "Open public receipt" }),
            view("a", { className: "secondary-link", href: "/user/help", text: "Need help?" })
          ])
        ]),
        view("article", { className: "user-receipt-card user-receipt-detail" }, [
          view("p", { className: "status-pill ready", text: "matched" }),
          view("h2", { text: "Recorded mock vault receipt" }),
          field("Receipt ID", shortHash(RECORDED_RECEIPT_HASH)),
          field("Network", "GIWA Sepolia"),
          field("Action", "Mock vault testnet action"),
          field("Evidence source", "standard RPC block evidence"),
          view("p", {
            className: "muted",
            text: "Testnet-only receipt. It does not move mainnet funds, provide returns, or perform identity checks."
          }),
          view("details", { className: "panel user-technical-details" }, [
            view("summary", { text: "Technical proof" }),
            field("Receipt hash", RECORDED_RECEIPT_HASH)
          ])
        ])
      ])
    );
    document.querySelector("#copy-recorded-receipt-link")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        notice = "Receipt link copied.";
      } catch {
        notice = publicNotice("copy");
      }
    });
    return;
  }
  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow receipt-hero user-receipt-page" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "Verified Receipt" }),
        view("h1", { text: matched ? "Verified receipt ready" : "Receipt status" }),
        view("p", { className: "lead", text: matched ? "This testnet action matched the reviewed intent." : "Receipt details appear after verification." }),
        view("div", { className: "hero-actions user-receipt-actions" }, [
          view("button", { type: "button", id: "copy-receipt-link", disabled: !receiptHash, text: "Copy receipt link" }),
          txExplorerUrl === null
            ? view("span", { className: "disabled-link", text: "Open transaction" })
            : view("a", { className: "secondary-link", href: txExplorerUrl, target: "_blank", rel: "noreferrer", text: "Open transaction" }),
          view("a", { className: "secondary-link", href: "/user/help", text: "Need help?" })
        ])
      ]),
      view("article", { className: "user-receipt-card" }, [
        view("p", { className: `status-pill ${matched ? "ready" : "blocked"}`, text: state }),
        field("Receipt ID", receiptHash ? shortHash(receiptHash) : "pending"),
        field("Transaction", depositTxHash ? shortHash(depositTxHash) : "pending"),
        field("Block number", blockNumber ?? "pending"),
        field("Wallet", runState?.manifestPreview?.wallet ? shortHash(runState.manifestPreview.wallet) : "current browser"),
        field("Action", runState?.manifestPreview?.actionName ?? "Mock vault testnet action"),
        view("details", { className: "panel user-technical-details" }, [
          view("summary", { text: "Technical details" }),
          field("Receipt hash", receiptHash ?? "pending"),
          field("Deposit transaction", depositTxHash ?? "pending"),
          field("Block number", blockNumber ?? "pending")
        ])
      ])
    ])
  );
  document.querySelector("#copy-receipt-link")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      notice = "Receipt link copied.";
    } catch {
      notice = publicNotice("copy");
    }
  });
}

function renderHelp() {
  app.textContent = "";
  const summary = [
    `Action: ${runState?.manifestPreview?.actionName ?? "Mock vault testnet action"}`,
    `Wallet: ${runState?.manifestPreview?.wallet ? shortHash(runState.manifestPreview.wallet) : "current browser"}`,
    `Deposit transaction: ${runState?.depositTxHash ? shortHash(runState.depositTxHash) : "pending"}`,
    `Receipt: ${runState?.receiptHash ? shortHash(runState.receiptHash) : "pending"}`
  ].join("\n");
  app.append(
    view("section", { className: "hero-flow user-help-hero" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "Help / Recovery" }),
        view("h1", { text: "Recover a receipt check" }),
        view("p", {
          className: "lead",
          text: runtimeState.liveApiAvailable
            ? "Enter a valid transaction hash and retry verification from the current browser run."
            : "Recovery is available after a wallet run. You can inspect the recorded testnet receipt while no run is active."
        }),
        view("p", { className: "notice", role: "status", "aria-live": "polite", text: notice }),
        view("div", { className: "hero-actions" }, [
          view("a", { className: "secondary-link", href: "/user", text: "Back to action" }),
          view("a", { className: "secondary-link", href: "/user/receipts", text: "My receipts" }),
          view("a", { className: "secondary-link", href: `/receipt/${RECORDED_RECEIPT_HASH}`, text: "View recorded receipt" })
        ])
      ]),
      view("section", { className: "user-help-panel user-help-card" }, [
        view("label", { className: "field-label", for: "recovery-tx", text: "Transaction hash" }),
        view("input", { id: "recovery-tx", className: "user-input", placeholder: "0x..." }),
        view("div", { className: "hero-actions" }, [
          view("button", { type: "button", id: "reverify-action", text: "Re-verify" }),
          view("button", { type: "button", id: "copy-support-summary", text: "Copy support summary" })
        ]),
        view("pre", { className: "user-support-summary", text: summary })
      ])
    ])
  );
  document.querySelector("#reverify-action")?.addEventListener("click", async () => {
    const value = document.querySelector("#recovery-tx")?.value ?? "";
    if (!/^0x[a-fA-F0-9]{64}$/.test(value.trim())) {
      notice = publicNotice("recovery");
      renderHelp();
      return;
    }
    if (!runState?.runId) {
      notice = "Start an action before retrying verification.";
      renderHelp();
      return;
    }
    runState = { ...runState, depositTxHash: value.trim().toLowerCase(), status: "depositSubmitted" };
    writeJson(USER_RUN_KEY, runState);
    await submitEvidence();
    await verifyReceipt();
    renderHelp();
  });
  document.querySelector("#copy-support-summary")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(summary);
      notice = "Support summary copied.";
    } catch {
      notice = publicNotice("copy");
    }
    renderHelp();
  });
}

async function invalidateRun(reason) {
  if (runState?.runId) {
    try {
      await fetchWithTimeout(`/api/runs/${runState.runId}/invalidate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason })
      });
    } catch {
      notice = "Action preview was reset in this browser.";
    }
  }
  runState = { ...runState, status: "manifestInvalidated", manifestPreview: null };
  writeJson(USER_RUN_KEY, runState);
}

async function refreshRuntimeMode() {
  try {
    const response = await fetchWithTimeout("/readyz", { cache: "no-store" });
    const body = response.ok ? await response.json() : {};
    runtimeState = {
      checked: true,
      liveApiAvailable: body?.ready === true && body?.mode !== "static-fallback",
      mode: typeof body?.mode === "string" ? body.mode : "unavailable"
    };
  } catch {
    runtimeState = { checked: true, liveApiAvailable: false, mode: "unavailable" };
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
  currentProvider.on("accountsChanged", async (accounts) => {
    const nextAccount = Array.isArray(accounts) && accounts[0] ? normalizeAccount(accounts[0]) : null;
    if (runState !== null && nextAccount !== walletState.account) await invalidateRun("account_changed");
    walletState = {
      ...walletState,
      account: nextAccount,
      status: nextAccount === null ? "disconnected" : walletState.chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain"
    };
    render();
  });
  currentProvider.on("chainChanged", async (chainIdHex) => {
    const nextChainId = parseChainId(chainIdHex);
    if (runState !== null && nextChainId !== walletState.chainId) await invalidateRun("chain_changed");
    walletState = {
      ...walletState,
      chainId: nextChainId,
      status: walletState.account === null ? "disconnected" : nextChainId === GIWA_CHAIN_ID ? "connected" : "wrongChain"
    };
    render();
  });
}

render();
void refreshRuntimeMode();

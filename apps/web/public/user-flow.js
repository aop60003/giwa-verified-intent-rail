const app = document.querySelector("#app");
const GIWA_CHAIN_ID = 91342;
const GIWA_CHAIN_HEX = "0x164ce";
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

function primaryLabel() {
  if (walletState.account === null) return "Connect wallet";
  if (walletState.chainId !== GIWA_CHAIN_ID) return "Switch to GIWA Sepolia";
  if (runState?.receiptHash) return "View receipt";
  if (runState?.depositTxHash) return "Verify receipt";
  if (runState?.manifestPreview) return "Continue to wallet";
  return "Review action";
}

function walletCopy() {
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
  return walletState.status === "connected" && runState?.manifestPreview && !isExpired() && runState.status !== "manifestInvalidated";
}

function txReady(kind) {
  if (!manifestReady()) return false;
  if (kind === "approve") return !runState.approveTxHash;
  if (kind === "deposit") return !runState.depositTxHash;
  return false;
}

function verifyReady() {
  if (!runState?.runId || !runState.depositTxHash) return false;
  if (runState.status === "matched" || runState.status === "mismatched" || runState.status === "failed") return false;
  return runState.verification?.status !== "queued";
}

function stepIcon(state) {
  if (state === "complete") return "OK";
  if (state === "active") return ">";
  if (state === "blocked") return "!";
  return "-";
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
    ["wallet_connected", "Wallet connected", "Your wallet is connected to GIWA Sepolia.", walletReady ? "complete" : "active"],
    ["intent_issued", "Intent issued", "The action preview is bound to your wallet.", hasPreview ? "complete" : "pending"],
    ["approval_submitted", "Approval submitted", "Your wallet returned the approval transaction hash.", hasApprove ? "complete" : "pending"],
    ["deposit_submitted", "Deposit submitted", "Your wallet returned the deposit transaction hash.", hasDeposit ? "complete" : "pending"],
    ["standard_rpc_receipt_found", "Block evidence found", "The verifier found standard RPC block evidence.", receiptFound ? "complete" : "pending"],
    ["verification_matched", "Verification matched", "The confirmed transaction matched the reviewed action.", matched ? "complete" : failed ? "blocked" : "pending"],
    ["receipt_ready", "Receipt ready", "Your receipt is ready to view and share.", runState?.receiptHash ? "complete" : "pending"]
  ];
}

function renderStatusRail() {
  return view(
    "ol",
    { className: "status-rail user-status-rail", "aria-label": "Transaction progress" },
    progressSteps().map(([id, label, detail, state]) =>
      view("li", { className: `status-step ${state}`, "data-step": id }, [
        view("span", { className: "status-icon", text: stepIcon(state), title: state }),
        view("span", { className: "status-body" }, [
          view("strong", { text: label }),
          view("span", { text: detail }),
          view("em", { text: id === "standard_rpc_receipt_found" ? "Standard RPC evidence" : "User step" })
        ])
      ])
    )
  );
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
    view("p", { className: "eyebrow", text: "Action summary" }),
    view("h2", { text: "Mock vault testnet action" }),
    field("Network", "GIWA Sepolia 91342"),
    field("Wallet", walletState.account === null ? "Connect wallet" : shortHash(walletState.account)),
    field("Receipt", runState?.receiptHash ? shortHash(runState.receiptHash) : "created after matched verification"),
    renderExpectedSteps()
  ]);
}

function renderIntentPanel() {
  const preview = runState?.manifestPreview ?? null;
  if (preview === null) {
    return view("section", { className: "panel" }, [
      view("p", { className: "eyebrow", text: "Intent preview" }),
      view("h2", { text: "Review action details" }),
      view("p", { className: "muted", text: "Connect your wallet and review the action before wallet submission." }),
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

function renderActionPage() {
  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow user-action-hero" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "GIWA Verified Intent Rail" }),
        view("h1", { text: "Review your testnet action before signing" }),
        view("p", {
          className: "lead",
          text: "Connect a wallet, review the intent, submit wallet actions, and receive a receipt after verification."
        }),
        view("p", { className: "notice", role: "status", "aria-live": "polite", text: notice }),
        view("p", { className: "muted", text: walletCopy() }),
        view("div", { className: "hero-actions" }, [
          view("button", { type: "button", id: "user-primary-action", text: primaryLabel() }),
          view("button", { type: "button", id: "user-approve-action", disabled: !txReady("approve"), text: runState?.approveTxHash ? "Approve submitted" : "Approve" }),
          view("button", { type: "button", id: "user-deposit-action", disabled: !txReady("deposit"), text: runState?.depositTxHash ? "Deposit submitted" : "Deposit" }),
          view("button", { type: "button", id: "user-verify-action", disabled: !verifyReady(), text: runState?.receiptHash ? "Receipt ready" : "Verify receipt" }),
          view("a", { className: "secondary-link", href: "/user/help", text: "Need help?" }),
          view("a", { className: "secondary-link", href: "/user/receipts", text: "My receipts" })
        ]),
        renderStatusRail()
      ]),
      view("div", {}, [renderActionSummary(), renderIntentPanel()])
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
  const response = await fetch("/api/runs", {
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
  const body = await response.json();
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
  const response = await fetch(`/api/runs/${runState.runId}/evidence`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      approveTxHash: runState.approveTxHash ?? null,
      depositTxHash: runState.depositTxHash
    })
  });
  const body = await response.json();
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
  const response = await fetch(`/api/runs/${runState.runId}/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  const body = await response.json();
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
        view("div", {}, [view("p", { className: "eyebrow", text: "My receipts" }), view("h1", { text: "Receipts from this browser" })]),
        view("a", { className: "secondary-link", href: "/user", text: "Start action" })
      ]),
      view("div", { className: "user-filter-row" }, [
        view("a", { className: "secondary-link", href: "/user/receipts?filter=all", text: "All" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=verified", text: "Verified" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=pending", text: "Pending" }),
        view("a", { className: "secondary-link", href: "/user/receipts?filter=notMatched", text: "Not matched" })
      ]),
      items.length === 0
        ? view("p", { className: "notice", text: "No receipts yet. Start an action to create your first receipt." })
        : view("div", { className: "proof-grid" }, items.map(renderReceiptCard))
    ])
  );
}

async function renderReceiptRoute() {
  const hash = receiptHashFromRoute();
  app.textContent = "";
  app.append(view("section", { className: "loading-panel" }, [view("p", { className: "eyebrow", text: "Receipt" }), view("h1", { text: "Loading receipt" })]));
  let body = null;
  try {
    const response = await fetch(`/api/receipts/${hash}`);
    body = response.ok ? await response.json() : null;
  } catch {
    body = null;
  }
  const matched = body?.status === "matched" || body?.receipt?.receiptHash === hash;
  const receiptHash = body?.receiptHash ?? body?.receipt?.receiptHash ?? (matched ? hash : null);
  const depositTxHash = body?.depositTxHash ?? body?.receipt?.depositTxHash ?? runState?.depositTxHash ?? null;
  const blockNumber = body?.blockNumber ?? body?.receipt?.blockNumber ?? null;
  const state = matched ? "verified" : body?.status === "failed" ? "not matched" : "pending";
  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow receipt-hero user-receipt-page" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "Verified Receipt" }),
        view("h1", { text: matched ? "Verified receipt ready" : "Receipt status" }),
        view("p", { className: "lead", text: matched ? "This testnet action matched the reviewed intent." : "Receipt details appear after verification." }),
        view("div", { className: "hero-actions" }, [
          view("button", { type: "button", id: "copy-receipt-link", disabled: !receiptHash, text: "Copy receipt link" }),
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
        view("p", { className: "lead", text: "Enter a valid transaction hash and retry verification from the current browser run." }),
        view("p", { className: "notice", role: "status", "aria-live": "polite", text: notice }),
        view("div", { className: "hero-actions" }, [
          view("a", { className: "secondary-link", href: "/user", text: "Back to action" }),
          view("a", { className: "secondary-link", href: "/user/receipts", text: "My receipts" })
        ])
      ]),
      view("section", { className: "user-help-panel" }, [
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
      await fetch(`/api/runs/${runState.runId}/invalidate`, {
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

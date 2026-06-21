const app = document.querySelector("#app");
const GIWA_CHAIN_ID = 91342;
const GIWA_CHAIN_HEX = "0x164ce";
const addChainRequest = {
  chainId: GIWA_CHAIN_HEX,
  chainName: "GIWA Sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia-rpc.giwa.io"],
  blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
};

let walletState = { status: "disconnected", account: null, chainId: null };
let runState = null;
let notice = null;

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
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function normalizeAccount(account) {
  if (typeof account !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
    throw new Error("wallet account must be a valid address");
  }
  return account.toLowerCase();
}

function parseChainId(value) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]+$/.test(value)) {
    throw new Error("wallet chain id must be hex");
  }
  return Number.parseInt(value, 16);
}

function walletProvider() {
  return window.ethereum ?? null;
}

function walletCopy() {
  if (walletState.status === "providerMissing") return "Wallet provider not detected in this browser.";
  if (walletState.status === "wrongChain") return "Wrong network. Switch to GIWA Sepolia before requesting a manifest.";
  if (walletState.status === "manifestInvalidated") return "Wallet or chain changed. Request a fresh manifest before continuing.";
  if (walletState.account === null) return "Connect a wallet to start a live manifest preview.";
  return "Wallet connected on GIWA Sepolia. Manifest issuance is available.";
}

function primaryButtonLabel() {
  if (walletState.account === null) return "Connect wallet";
  if (walletState.status === "wrongChain") return "Switch network";
  return "Issue manifest";
}

function canRequestTransaction() {
  if (walletState.account === null) return false;
  if (walletState.status !== "connected") return false;
  if (walletState.chainId !== GIWA_CHAIN_ID) return false;
  if (runState === null || runState.status === "manifestInvalidated") return false;
  if (runState.manifestPreview === null) return false;
  return Math.floor(Date.now() / 1000) <= Number(runState.expiryUnix);
}

function canRequestVerify() {
  if (runState === null || !runState.runId || !runState.depositTxHash) return false;
  if (runState.verification?.status === "queued") return false;
  if (["matched", "mismatched", "failed", "verifierChecking"].includes(runState.status)) return false;
  return true;
}

function transactionBlockReason(kind) {
  if (walletState.account === null) return "Connect a wallet first.";
  if (walletState.status !== "connected" || walletState.chainId !== GIWA_CHAIN_ID) return "Switch to GIWA Sepolia before wallet action.";
  if (runState === null || runState.manifestPreview === null) return "Issue a valid manifest before wallet action.";
  if (runState.status === "manifestInvalidated") return "Request a fresh manifest before wallet action.";
  if (Math.floor(Date.now() / 1000) > Number(runState.expiryUnix)) return "Issue a new manifest because this one expired.";
  if (kind === "approve" && runState.approveTxHash) return "Approve transaction hash is already stored.";
  if (kind === "deposit" && runState.depositTxHash) return "Deposit transaction hash is already stored.";
  return null;
}

function verifyBlockReason() {
  if (runState === null || !runState.depositTxHash) return "Submit a deposit transaction before verification.";
  if (runState.verification?.status === "queued") return "Verification is queued. Refresh run state before retrying.";
  if (runState.status === "matched") return "Receipt is already unlocked.";
  if (runState.status === "mismatched" || runState.status === "failed") return "Verification finished without receipt unlock.";
  if (runState.status === "verifierChecking") return "Verifier is checking standard RPC evidence.";
  return null;
}

function stepIcon(state) {
  if (state === "complete") return "OK";
  if (state === "active") return ">";
  if (state === "blocked") return "!";
  return "-";
}

function statusRailSteps() {
  const walletReady = walletState.status === "connected" && walletState.account !== null && walletState.chainId === GIWA_CHAIN_ID;
  const manifestReady = runState?.manifestPreview !== null && runState?.manifestPreview !== undefined && runState?.status !== "manifestInvalidated";
  const approveSubmitted = typeof runState?.approveTxHash === "string";
  const depositSubmitted = typeof runState?.depositTxHash === "string";
  const checking = runState?.verification?.status === "queued" || runState?.status === "verifierChecking";
  const matched = runState?.status === "matched";
  const failed = runState?.status === "mismatched" || runState?.status === "failed";
  const timeout = runState?.status === "timeout";
  const states = [
    {
      id: "walletReady",
      label: "Wallet ready",
      state: walletReady ? "complete" : "active",
      standardRpcBlockEvidence: false,
      detail: walletReady ? "Connected on GIWA Sepolia." : walletCopy()
    },
    {
      id: "manifestIssued",
      label: "Manifest issued",
      state: manifestReady ? "complete" : walletReady ? "active" : "pending",
      standardRpcBlockEvidence: false,
      detail: "Wallet-bound manifest preview comes before wallet action."
    },
    {
      id: "approveSubmitted",
      label: "Approve submitted",
      state: approveSubmitted ? "complete" : manifestReady ? "active" : "pending",
      standardRpcBlockEvidence: false,
      detail: "Browser wallet returns the approve transaction hash."
    },
    {
      id: "depositSubmitted",
      label: "Deposit submitted",
      state: depositSubmitted ? "complete" : approveSubmitted || manifestReady ? "active" : "pending",
      standardRpcBlockEvidence: false,
      detail: "Browser wallet returns the deposit transaction hash."
    },
    {
      id: "standardRpcChecking",
      label: "Standard RPC check",
      state: matched || failed || timeout ? "complete" : checking || depositSubmitted ? "active" : "pending",
      standardRpcBlockEvidence: true,
      detail: "Verifier uses standard RPC receipt evidence."
    },
    {
      id: "verifierMatched",
      label: "Verifier matched",
      state: matched ? "complete" : failed ? "blocked" : depositSubmitted ? "active" : "pending",
      standardRpcBlockEvidence: false,
      detail: matched ? "Evidence matched the manifest." : "Receipt stays locked until match."
    },
    {
      id: "receiptReady",
      label: "Receipt ready",
      state: matched ? "complete" : "pending",
      standardRpcBlockEvidence: false,
      detail: "Dynamic receipt opens only after matched verification."
    }
  ];
  const active = states.find((step) => step.state === "active") ?? states.findLast((step) => step.state === "complete");
  return states.map((step) => ({ ...step, current: step.id === active?.id }));
}

function renderStatusRail() {
  return view(
    "ol",
    { className: "status-rail compact-rail", "aria-label": "Live action status" },
    statusRailSteps().map((step) =>
      view("li", { className: `status-step ${step.state}`, "aria-current": step.current ? "step" : null }, [
        view("span", { className: "status-icon", text: stepIcon(step.state), title: step.state }),
        view("span", { className: "status-body" }, [
          view("strong", { text: step.label }),
          view("span", { text: step.detail }),
          step.standardRpcBlockEvidence ? view("em", { text: "Standard RPC block evidence" }) : view("em", { text: "Non-final step" })
        ])
      ])
    )
  );
}

function encodeAddressWord(value) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error("Manifest preview address is invalid");
  }
  return value.slice(2).toLowerCase().padStart(64, "0");
}

function encodeUint256Word(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error("Manifest preview amount is invalid");
  }
  return BigInt(value).toString(16).padStart(64, "0");
}

function approveCalldata(preview) {
  const selector = "0x095ea7b3";
  const spender = encodeAddressWord(preview.spender);
  const amount = encodeUint256Word(preview.maxAllowanceBaseUnits);
  return `${selector}${spender}${amount}`;
}

function depositCalldata(preview) {
  const selector = "0x47e7ef24";
  const asset = encodeAddressWord(preview.asset);
  const amount = encodeUint256Word(preview.amountBaseUnits);
  return `${selector}${asset}${amount}`;
}

function renderManifestPreview() {
  const preview = runState?.manifestPreview ?? null;
  if (preview === null) {
    return view("section", { className: "panel" }, [
      view("div", { className: "panel-heading" }, [
        view("p", { className: "eyebrow", text: "Manifest preview" }),
        view("h2", { text: runState?.status === "manifestInvalidated" ? "Invalidated" : "Locked" })
      ]),
      view("p", {
        className: "muted",
        text:
          runState?.status === "manifestInvalidated"
            ? "Wallet context changed. Request a fresh manifest before wallet action."
            : "Preview appears after wallet connect and GIWA Sepolia chain check."
      })
    ]);
  }

  return view("section", { className: "panel" }, [
    view("div", { className: "panel-heading" }, [
      view("p", { className: "eyebrow", text: "Manifest preview" }),
      view("h2", { text: "Wallet-bound action" })
    ]),
    field("Target", preview.target),
    field("Selector", preview.selector),
    field("Asset", preview.asset),
    field("Amount", preview.amountBaseUnits),
    field("Spender", preview.spender),
    field("Max allowance", preview.maxAllowanceBaseUnits),
    field("Expiry", preview.expiryUnix),
    field("Intent hash", preview.intentHash),
    field("Approve tx", runState?.approveTxHash ?? "pending"),
    field("Deposit tx", runState?.depositTxHash ?? "pending"),
    field("Verifier decision", runState?.decision ?? runState?.status ?? "pending"),
    field("Receipt hash", runState?.receiptHash ?? "locked"),
    runState?.receiptHash && runState?.status === "matched"
      ? field("Dynamic receipt API", `/api/receipts/${runState.receiptHash}`)
      : view("span"),
    runState?.receiptHash && runState?.status === "matched"
      ? view("a", { className: "button-link", href: `/api/receipts/${runState.receiptHash}`, text: "Open receipt API" })
      : view("span"),
    view("p", {
      className: "notice",
      text:
        runState?.status === "matched"
          ? "Dynamic receipt ready. Standard RPC verifier matched the deposit."
          : runState?.status === "mismatched" || runState?.status === "failed"
            ? `Verifier stopped without receipt unlock: ${runState.failureCopy ?? runState.failureCode ?? "unmatched evidence"}.`
            : runState?.status === "timeout"
              ? "Standard RPC confirmation depth is still below the local verifier threshold. Try verification again after more blocks."
            : runState?.depositTxHash != null
              ? "Deposit submitted. Run local verification to unlock a dynamic receipt."
              : "Approve and deposit request the connected browser wallet. Receipt unlock requires verifier match."
    })
  ]);
}

function render() {
  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow live-hero" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "GIWA Verified Intent Rail" }),
        view("h1", { text: "Live mock vault evidence flow" }),
        view("p", {
          className: "lead",
          text:
            "Review a wallet-bound manifest, submit wallet actions, verify standard RPC evidence, then open the matched receipt."
        }),
        view("p", { className: "eyebrow", text: "GIWA Sepolia live preview" }),
        view("p", { className: "muted", text: walletCopy() }),
        view("p", { className: "notice", role: "status", "aria-live": "polite", text: notice ?? "Ready for wallet connection." }),
        view("div", { className: "hero-actions" }, [
          view("button", { type: "button", id: "primary-wallet-action", text: primaryButtonLabel() }),
          view("button", {
            type: "button",
            id: "approve-action",
            "aria-describedby": "approve-action-reason",
            disabled: !canRequestTransaction() || Boolean(runState?.approveTxHash),
            text: runState?.approveTxHash ? "Approve submitted" : "Approve"
          }),
          view("button", {
            type: "button",
            id: "deposit-action",
            "aria-describedby": "deposit-action-reason",
            disabled: !canRequestTransaction() || Boolean(runState?.depositTxHash),
            text: runState?.depositTxHash ? "Deposit submitted" : "Deposit"
          }),
          view("button", {
            type: "button",
            id: "verify-action",
            "aria-describedby": "verify-action-reason",
            disabled: !canRequestVerify(),
            text: runState?.status === "matched" ? "Receipt unlocked" : "Verify receipt"
          })
        ]),
        view("div", { className: "action-reasons" }, [
          view("span", { id: "approve-action-reason", className: "muted", text: transactionBlockReason("approve") ?? "Approve is ready for the connected wallet." }),
          view("span", { id: "deposit-action-reason", className: "muted", text: transactionBlockReason("deposit") ?? "Deposit is ready for the connected wallet." }),
          view("span", { id: "verify-action-reason", className: "muted", text: verifyBlockReason() ?? "Verification is ready after deposit submission." })
        ]),
        renderStatusRail()
      ]),
      renderManifestPreview()
    ])
  );
  document.querySelector("#primary-wallet-action")?.addEventListener("click", onPrimaryAction);
  document.querySelector("#approve-action")?.addEventListener("click", onApproveAction);
  document.querySelector("#deposit-action")?.addEventListener("click", onDepositAction);
  document.querySelector("#verify-action")?.addEventListener("click", onVerifyAction);
}

async function connectWallet(provider) {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
  walletState = {
    status: chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain",
    account: normalizeAccount(accounts[0]),
    chainId
  };
}

async function switchToGiwa(provider) {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GIWA_CHAIN_HEX }] });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 4902) {
      await provider.request({ method: "wallet_addEthereumChain", params: [addChainRequest] });
    } else {
      throw error;
    }
  }
  const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
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
    notice = `Manifest request could not be created: ${body.error ?? "unknown error"}`;
    return;
  }
  runState = body;
  notice = null;
}

async function sendWalletTransaction(request) {
  const provider = walletProvider();
  if (provider === null) throw new Error("Wallet provider not detected");
  const hash = await provider.request({ method: "eth_sendTransaction", params: [request] });
  if (typeof hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    throw new Error("Wallet returned an invalid transaction hash");
  }
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
    notice = `Evidence submit could not be saved: ${body.error ?? "unknown error"}`;
    return;
  }
  runState = { ...runState, ...body, receiptLocked: true };
  notice = "Deposit submitted. Run local verification to unlock the dynamic receipt.";
}

async function verifyReceipt() {
  if (!canRequestVerify()) return;
  const response = await fetch(`/api/runs/${runState.runId}/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  const body = await response.json();
  if (!response.ok) {
    notice = `Verification could not run yet: ${body.error ?? "unknown error"}`;
    return;
  }
  runState = { ...runState, ...body };
  if (body.verification?.status === "queued") {
    notice = "Verification queued. Refresh the run state before retrying.";
  } else if (body.status === "matched") {
    notice = "Dynamic receipt ready. Standard RPC verifier matched the deposit.";
  } else if (body.status === "timeout") {
    notice = "Standard RPC confirmation depth is still below the local verifier threshold. Try verification again after more blocks.";
  } else {
    notice = `Verification completed without receipt unlock: ${body.failureCopy ?? body.failureCode ?? body.status}.`;
  }
}

async function onApproveAction() {
  if (!canRequestTransaction()) return;
  try {
    const preview = runState.manifestPreview;
    const approveTxHash = await sendWalletTransaction({
      from: walletState.account,
      to: preview.asset,
      data: approveCalldata(preview),
      value: "0x0"
    });
    runState = { ...runState, approveTxHash, status: "approveSubmitted" };
    notice = "Approve transaction submitted.";
  } catch (error) {
    notice = error instanceof Error ? error.message : "Approve request failed";
  }
  render();
}

async function onDepositAction() {
  if (!canRequestTransaction()) return;
  try {
    const preview = runState.manifestPreview;
    const depositTxHash = await sendWalletTransaction({
      from: walletState.account,
      to: preview.target,
      data: depositCalldata(preview),
      value: "0x0"
    });
    runState = { ...runState, depositTxHash, status: "depositSubmitted" };
    await submitEvidence();
  } catch (error) {
    notice = error instanceof Error ? error.message : "Deposit request failed";
  }
  render();
}

async function onVerifyAction() {
  try {
    await verifyReceipt();
  } catch (error) {
    notice = error instanceof Error ? error.message : "Verification request failed";
  }
  render();
}

async function invalidateCurrentRun(reason) {
  if (!runState?.runId) return;
  await fetch(`/api/runs/${runState.runId}/invalidate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason })
  });
  runState = { ...runState, status: "manifestInvalidated", manifestPreview: null, invalidationReason: reason };
  notice = reason === "account_changed" ? "Wallet account changed. Manifest invalidated." : "Wallet chain changed. Manifest invalidated.";
}

async function onPrimaryAction() {
  const provider = walletProvider();
  if (provider === null) {
    walletState = { status: "providerMissing", account: null, chainId: null };
    render();
    return;
  }

  try {
    if (walletState.account === null) await connectWallet(provider);
    if (walletState.status === "wrongChain") await switchToGiwa(provider);
    if (walletState.status === "connected") await issueManifest();
  } catch (error) {
    notice = error instanceof Error ? error.message : "Wallet request failed";
  }
  render();
}

const provider = walletProvider();
if (provider?.on) {
  provider.on("accountsChanged", async (accounts) => {
    const nextAccount = Array.isArray(accounts) && accounts[0] ? normalizeAccount(accounts[0]) : null;
    if (runState !== null && nextAccount !== walletState.account) await invalidateCurrentRun("account_changed");
    walletState = {
      ...walletState,
      account: nextAccount,
      status: nextAccount === null ? "disconnected" : walletState.chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain"
    };
    render();
  });
  provider.on("chainChanged", async (chainIdHex) => {
    const nextChainId = parseChainId(chainIdHex);
    if (runState !== null && nextChainId !== walletState.chainId) await invalidateCurrentRun("chain_changed");
    walletState = {
      ...walletState,
      chainId: nextChainId,
      status: walletState.account === null ? "disconnected" : nextChainId === GIWA_CHAIN_ID ? "connected" : "wrongChain"
    };
    render();
  });
}

render();

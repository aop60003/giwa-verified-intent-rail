import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
}

function functionSource(source: string, name: string, nextName: string): string {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("evaluator public boundary", () => {
  it("renders exactly one primary action and no separate transaction buttons", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source.match(/id:\s*"user-primary-action"/gu)).toHaveLength(1);
    expect(source).not.toMatch(/user-(?:approve|deposit|verify)-action/u);
    expect(source).toContain("function nextPrimaryAction()");
  });

  it("keeps the active capability in session storage and bounded receipts in local storage", () => {
    const source = readWebFile("public/user-flow.js");
    const receiptProjection = functionSource(source, "storeReceiptProjection", "renderReceiptCard");
    const supportView = functionSource(source, "renderHelp", "invalidateRun");

    expect(source).toContain('const USER_RUN_KEY = "giwa:userRunState"');
    expect(source).toContain("sessionStorage.getItem(USER_RUN_KEY)");
    expect(source).toContain("sessionStorage.setItem(USER_RUN_KEY");
    expect(source).toContain("localStorage.getItem(USER_RECEIPTS_KEY)");
    expect(source).toContain(".slice(0, 12)");
    expect(receiptProjection).not.toMatch(/runCapability|participantHeaders/u);
    expect(supportView).not.toMatch(/runCapability|x-giwa-run-capability/u);
    expect(source).not.toMatch(/console\.(?:log|info|warn|error)/u);
    expect(source).not.toMatch(/[?&](?:capability|runCapability)=/u);
  });

  it("attaches the capability only to participant run requests", () => {
    const source = readWebFile("public/user-flow.js");
    const participantHeaders = functionSource(source, "participantHeaders", "participantFetch");
    const participantFetch = functionSource(source, "participantFetch", "publicNotice");

    expect(participantHeaders).toContain('"content-type": "application/json"');
    expect(participantHeaders).toContain('"x-giwa-run-capability": value');
    expect(participantFetch).toContain('/^\\/api\\/runs\\/[^/]+(?:\\/(?:evidence|verify|invalidate))?$/u');
    expect(source).toContain('apiFetch("/api/public/config")');
    expect(source).toContain('apiFetch("/api/runs",');
    expect(source).toContain("apiFetch(`/api/receipts/${hash}`)");
    expect(source).not.toContain('participantFetch("/api/public/config"');
    expect(source).not.toContain('participantFetch("/api/runs"');
    expect(source).not.toContain("participantFetch(`/api/receipts/");
  });

  it("bounds every HTTP request and clears its timeout", () => {
    const source = readWebFile("public/user-flow.js");
    const apiFetch = functionSource(source, "apiFetch", "participantHeaders");

    expect(apiFetch).toContain("new AbortController()");
    expect(apiFetch).toContain("window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)");
    expect(apiFetch).toContain("window.clearTimeout(timeoutId)");
    expect(source.match(/\bfetch\(/gu)).toHaveLength(1);
  });

  it("uses strict wallet read boundaries and exact RPC calls", () => {
    const source = readWebFile("public/user-flow.js");

    expect(source).toContain('/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/u');
    expect(source).toContain('/^0x[0-9a-fA-F]{64}$/u');
    expect(source).toContain('method: "eth_getBalance", params: [walletState.account, "latest"]');
    expect(source).toContain('method: "eth_call", params: [{ to: publicConfig.contracts.mockToken, data: balanceData }, "latest"]');
    expect(source).toContain('method: "eth_call", params: [{ to: publicConfig.contracts.mockToken, data: allowanceData }, "latest"]');
    expect(source).toContain('const BALANCE_OF_SELECTOR = "0x70a08231"');
    expect(source).toContain('const ALLOWANCE_SELECTOR = "0xdd62ed3e"');
  });

  it("fails closed before executing an expired Manifest", () => {
    const source = readWebFile("public/user-flow.js");
    const actionHandler = functionSource(source, "onPrimaryAction", "receiptStateFromRun");

    expect(actionHandler).toContain("if (isExpired())");
    expect(actionHandler).toContain('await invalidateRun("manifest_expired")');
    expect(actionHandler.indexOf("if (isExpired())")).toBeLessThan(actionHandler.indexOf("nextPrimaryAction()"));
  });

  it("binds mint, exact approval, and deposit to validated wallet state and Manifest fields", () => {
    const source = readWebFile("public/user-flow.js");
    const mint = functionSource(source, "prepareMockToken", "issueManifest");
    const approve = functionSource(source, "approveExactAmount", "submitEvidence");
    const deposit = functionSource(source, "depositFromManifest", "onPrimaryAction");

    expect(mint).toContain("to: publicConfig.contracts.mockToken");
    expect(mint.indexOf("waitForSuccessfulTransactionReceipt(transactionHash)")).toBeLessThan(mint.indexOf("inspectWalletAssets()"));
    expect(approve).toContain('if (assetState.next === "deposit_ready")');
    expect(approve).toContain("approveTxHash: null");
    expect(approve).toContain("to: preview.asset");
    expect(approve.indexOf("waitForSuccessfulTransactionReceipt(approveTxHash)")).toBeLessThan(approve.lastIndexOf("inspectWalletAssets()"));
    expect(deposit).toContain("to: preview.target");
    expect(deposit).toContain("data: depositCalldata(preview)");
  });

  it("automates bounded evidence verification with one in-flight guard", () => {
    const source = readWebFile("public/user-flow.js");
    const verification = functionSource(source, "verifyAutomatically", "depositFromManifest");
    const deposit = functionSource(source, "depositFromManifest", "onPrimaryAction");
    const action = functionSource(source, "onPrimaryAction", "receiptStateFromRun");

    expect(source).toContain("const VERIFY_RETRY_DELAY_MS = 8_000");
    expect(source).toContain("const VERIFY_MAX_ATTEMPTS = 24");
    expect(deposit.indexOf("writeSessionRun(runState)")).toBeLessThan(deposit.indexOf("submitEvidence()"));
    expect(deposit.indexOf("submitEvidence()")).toBeLessThan(deposit.indexOf("verifyAutomatically()"));
    expect(verification).toContain("await sleep(VERIFY_RETRY_DELAY_MS)");
    expect(verification).toContain('decision === "mismatched" || decision === "failed"');
    expect(verification).toContain("location.assign(`/user/receipt/${runState.receiptHash}`)");
    expect(action).toContain("if (inFlight) return");
    expect(action).toContain("try {");
    expect(action).toContain("finally {");
    expect(action).toContain("inFlight = false");
  });

  it("invalidates capability-bound stale runs on wallet context changes", () => {
    const source = readWebFile("public/user-flow.js");
    const invalidate = functionSource(source, "invalidateRun", "handleAccountsChanged");

    expect(invalidate).toContain("participantFetch(`/api/runs/${staleRun.runId}/invalidate`");
    expect(invalidate).toContain("runState = null");
    expect(invalidate).toContain('assetState = { next: "gas_required"');
    expect(invalidate).toContain("writeSessionRun(null)");
    expect(source).toContain('currentProvider.on("accountsChanged"');
    expect(source).toContain('currentProvider.on("chainChanged"');
    expect(source).toContain('await invalidateRun("account_listener_failed")');
    expect(source).toContain('await invalidateRun("chain_listener_failed")');
  });

  it("reads public Receipt payload and normalized verification fields without session gating", () => {
    const source = readWebFile("public/user-flow.js");
    const receiptRoute = functionSource(source, "renderReceiptRoute", "renderHelp");

    expect(receiptRoute).toContain('response = await apiFetch(`/api/receipts/${hash}`)');
    expect(receiptRoute).not.toContain("shouldReadReceiptApi");
    expect(receiptRoute).toContain('response.ok && body?.receiptHash === hash && body?.payload?.status === "matched"');
    for (const field of ["wallet", "target", "asset", "amountBaseUnits", "depositTxHash", "depositBlockNumber", "depositBlockHash", "issuedAt", "safetyNotice"]) {
      expect(receiptRoute).toContain(`body?.payload?.${field}`);
    }
    expect(source).toContain("body?.verification");
    for (const field of ["confirmationDepth", "verifierInputHash"]) {
      expect(source).toContain(`body?.${field}`);
    }
  });

  it("does not expose internal or unsupported claim copy in public assets", () => {
    const files = ["public/user.html", "public/user-flow.js", "public/styles.css"];
    const joined = files.map((file) => readWebFile(file)).join("\n");

    expect(joined).not.toMatch(/gateReason|protected CI|blocker register|local DB path|signer role/iu);
    expect(joined).not.toMatch(/production asset|production yield|safety guarantee|final confirmation in/iu);
    const credentialPattern = new RegExp(
      [("mnem" + "onic"), ("seed ph" + "rase"), "credential value", ("bear" + "er " + "token")].join("|"),
      "iu"
    );
    expect(joined).not.toMatch(credentialPattern);
  });
});

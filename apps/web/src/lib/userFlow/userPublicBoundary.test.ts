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

function standaloneFunction<T extends (...args: never[]) => unknown>(source: string, name: string): T {
  const start = source.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      const declaration = source.slice(start, index + 1);
      return Function(`"use strict"; return (${declaration});`)() as T;
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function standaloneFunctions<T extends Record<string, (...args: never[]) => unknown>>(source: string, names: string[]): T {
  const declarations = names.map((name) => {
    const fn = standaloneFunction(source, name);
    return String(fn);
  });
  return Function(`"use strict"; ${declarations.join("\n")}; return { ${names.join(", ")} };`)() as T;
}

const strictRunFixture = {
  runId: "run_1",
  runCapability: "A".repeat(43),
  wallet: "0x1111111111111111111111111111111111111111",
  status: "manifestIssued",
  intentHash: `0x${"a".repeat(64)}`,
  expiryUnix: 1_800_003_600,
  manifestPreview: {
    target: "0x2222222222222222222222222222222222222222",
    selector: "0x47e7ef24",
    asset: "0x3333333333333333333333333333333333333333",
    amountBaseUnits: "1000000000000000000",
    spender: "0x2222222222222222222222222222222222222222",
    maxAllowanceBaseUnits: "1000000000000000000",
    expiryUnix: 1_800_003_600,
    intentHash: `0x${"a".repeat(64)}`
  },
  approveTxHash: `0x${"b".repeat(64)}`,
  pendingApproveTxHash: null,
  depositTxHash: `0x${"c".repeat(64)}`,
  receiptHash: null,
  evidenceSubmitted: true
};

const strictConfigFixture = {
  chainId: 91342,
  demoAmountBaseUnits: "1000000000000000000",
  contracts: {
    mockToken: "0x3333333333333333333333333333333333333333",
    mockVault: "0x2222222222222222222222222222222222222222"
  }
};

describe("evaluator public boundary", () => {
  it("accepts only normalized HTTPS URLs without URL userinfo", () => {
    const source = readWebFile("public/user-flow.js");
    const implementation = functionSource(source, "isSafeHttpsUrl", "requirePublicConfig");
    const isSafeHttpsUrl = standaloneFunction<(value: unknown) => boolean>(source, "isSafeHttpsUrl");
    const blockedPropertyMarker = "pass" + "word";

    expect(implementation).not.toContain(`.${blockedPropertyMarker}`);
    expect(implementation).toContain("parsed.href.startsWith(`${parsed.origin}/`)");
    expect(isSafeHttpsUrl("https://example.com/path?query=1#fragment")).toBe(true);
    expect(isSafeHttpsUrl("https://user@example.com/path")).toBe(false);
    expect(isSafeHttpsUrl("https://:synthetic@example.com/path")).toBe(false);
    expect(isSafeHttpsUrl("https://user:synthetic@example.com/path")).toBe(false);
    expect(isSafeHttpsUrl("http://example.com/path")).toBe(false);
    expect(isSafeHttpsUrl("not a url")).toBe(false);
  });

  it("projects only strict session runs and rejects restored wallet or config mismatches", () => {
    const source = readWebFile("public/user-flow.js");
    const functions = standaloneFunctions<{
      projectSessionRun: (value: unknown) => Record<string, unknown> | null;
      runMatchesContext: (run: unknown, account: string, config: unknown) => boolean;
    }>(source, ["projectSessionRun", "runMatchesContext"]);
    const projected = functions.projectSessionRun({ ...strictRunFixture, arbitraryServerField: "discard-me" });

    expect(projected).not.toBeNull();
    expect(projected).not.toHaveProperty("arbitraryServerField");
    expect(projected?.manifestPreview).not.toHaveProperty("wallet");
    expect(functions.projectSessionRun({ ...strictRunFixture, runCapability: "short" })).toBeNull();
    expect(functions.projectSessionRun({ ...strictRunFixture, pendingApproveTxHash: "bad" })).toBeNull();
    expect(
      functions.projectSessionRun({
        ...strictRunFixture,
        manifestPreview: { ...strictRunFixture.manifestPreview, selector: "0xdeadbeef" }
      })
    ).toBeNull();
    expect(functions.runMatchesContext(projected, strictRunFixture.wallet, strictConfigFixture)).toBe(true);
    expect(functions.runMatchesContext(projected, "0x9999999999999999999999999999999999999999", strictConfigFixture)).toBe(false);
    expect(
      functions.runMatchesContext(projected, strictRunFixture.wallet, {
        ...strictConfigFixture,
        contracts: { ...strictConfigFixture.contracts, mockVault: "0x9999999999999999999999999999999999999999" }
      })
    ).toBe(false);
    expect(source).toContain("projectSessionRun(parsed)");
    expect(source).toContain("projectIssuedRun(body, expectedContext)");
    expect(source.indexOf("projectIssuedRun(body, expectedContext)")).toBeLessThan(source.indexOf("runState = issuedRun"));
    expect(source).toContain("runState.wallet");
    expect(source).not.toContain("manifestPreview?.wallet");
  });

  it("cancels stale async work before listener invalidation can race it", () => {
    const source = readWebFile("public/user-flow.js");
    const accounts = functionSource(source, "handleAccountsChanged", "handleChainChanged");
    const chain = functionSource(source, "handleChainChanged", "render");
    const verify = functionSource(source, "verifyAutomatically", "depositFromManifest");
    const issue = functionSource(source, "issueManifest", "approveExactAmount");

    expect(source).toContain("let contextGeneration = 0");
    expect(source).toContain("const activeRequestControllers = new Set()");
    expect(accounts).toContain("const stale = beginContextChange()");
    expect(chain).toContain("const stale = beginContextChange()");
    for (const listener of [accounts, chain]) {
      expect(listener.indexOf("beginContextChange()")).toBeLessThan(listener.indexOf("await invalidateCapturedRun"));
    }
    expect(source).toContain("controller.abort()");
    expect(issue).toContain("const context = captureContext()");
    expect(issue).toContain("assertContext(context)");
    expect(issue.indexOf("assertContext(context)")).toBeLessThan(issue.indexOf("runState = issuedRun"));
    expect(verify).toContain("const localRun = requireContextRun(context)");
    expect(verify).toContain("await waitWithContext(VERIFY_RETRY_DELAY_MS, context)");
    expect(verify).not.toMatch(/runState\s*=\s*\{\s*\.\.\.runState,\s*\.\.\.body/gu);
    expect(source).toContain("if (isGenerationCurrent(context))");
  });

  it("releases the action lock when connect commits wallet context before readiness fails", () => {
    const source = readWebFile("public/user-flow.js");
    const isGenerationCurrent = standaloneFunction<
      (context: { generation: number } | null, currentGeneration: number) => boolean
    >(source, "isGenerationCurrent");
    const action = functionSource(source, "onPrimaryAction", "receiptStateFromRun");
    const accounts = functionSource(source, "handleAccountsChanged", "handleChainChanged");
    const chain = functionSource(source, "handleChainChanged", "render");

    expect(isGenerationCurrent({ generation: 7 }, 7)).toBe(true);
    expect(isGenerationCurrent({ generation: 7 }, 8)).toBe(false);
    expect(action).toContain("const actionCommittedWalletContext =");
    expect(action).toContain('actionCommittedWalletContext ? publicNotice("readiness")');
    expect(action).toContain('error.message === "context_changed" && !isGenerationCurrent(context)');
    expect(action).toContain("if (isGenerationCurrent(context))");
    expect(action.indexOf("inFlight = false")).toBeLessThan(action.lastIndexOf("render()"));
    for (const listener of [accounts, chain]) {
      expect(listener).toContain("const stale = beginContextChange()");
      expect(listener.indexOf("render()")).toBeLessThan(listener.indexOf("await invalidateCapturedRun"));
    }
  });

  it("merges Task 5 responses without erasing local run identity or evidence state", () => {
    const source = readWebFile("public/user-flow.js");
    const { projectSessionRun, mergeRunResponse } = standaloneFunctions<{
      projectSessionRun: (value: unknown) => Record<string, unknown> | null;
      mergeRunResponse: (current: Record<string, unknown>, response: unknown) => Record<string, unknown> | null;
    }>(source, ["projectSessionRun", "mergeRunResponse"]);
    const current = projectSessionRun(strictRunFixture);
    expect(current).not.toBeNull();

    const timeout = mergeRunResponse(current ?? {}, {
      runId: strictRunFixture.runId,
      wallet: strictRunFixture.wallet,
      intentHash: strictRunFixture.intentHash,
      status: "timeout",
      manifestPreview: null,
      approveTxHash: null,
      depositTxHash: null,
      receiptHash: null,
      ignored: "server-field"
    });
    expect(timeout).toMatchObject({
      runCapability: strictRunFixture.runCapability,
      manifestPreview: strictRunFixture.manifestPreview,
      approveTxHash: strictRunFixture.approveTxHash,
      depositTxHash: strictRunFixture.depositTxHash,
      evidenceSubmitted: true,
      status: "timeout"
    });
    expect(timeout).not.toHaveProperty("ignored");
    expect(mergeRunResponse(current ?? {}, { runId: "another-run", status: "timeout" })).toBeNull();

    const evidence = functionSource(source, "ensureEvidenceSubmitted", "verifyAutomatically");
    const verify = functionSource(source, "verifyAutomatically", "depositFromManifest");
    const deposit = functionSource(source, "depositFromManifest", "onPrimaryAction");
    expect(deposit).toContain("evidenceSubmitted: false");
    expect(deposit.indexOf("writeSessionRun(runState)")).toBeLessThan(deposit.indexOf("ensureEvidenceSubmitted(context)"));
    expect(evidence).toContain("evidenceSubmitted: true");
    expect(verify.indexOf("ensureEvidenceSubmitted(context)")).toBeLessThan(verify.indexOf("/verify"));
  });

  it("bounds response bodies and reuses persisted pending wallet transactions", () => {
    const source = readWebFile("public/user-flow.js");
    const api = functionSource(source, "apiFetchJson", "participantHeaders");
    const receipt = functionSource(source, "waitForSuccessfulTransactionReceipt", "prepareMockToken");
    const mint = functionSource(source, "prepareMockToken", "issueManifest");
    const approve = functionSource(source, "approveExactAmount", "ensureEvidenceSubmitted");
    const nextAction = functionSource(source, "nextPrimaryAction", "primaryLabel");
    const send = functionSource(source, "sendWalletTransaction", "parseTransactionReceipt");
    const receiptProjection = functionSource(source, "storeReceiptProjection", "renderReceiptCard");
    const support = functionSource(source, "renderHelp", "invalidateCapturedRun");

    expect(api).toContain("const body = await response.json()");
    expect(api.indexOf("const body = await response.json()")).toBeLessThan(api.indexOf("window.clearTimeout(timeoutId)"));
    expect(source.match(/\.json\(\)/gu)).toHaveLength(1);
    expect(source).not.toContain("function apiFetch(");
    expect(receipt).toContain("providerRequestWithTimeout(");
    expect(receipt).toContain("assertContext(context)");
    expect(mint.indexOf("walletTxState?.pendingMintTxHash")).toBeLessThan(mint.indexOf("sendWalletTransaction"));
    expect(mint.indexOf("writeWalletTxState(walletTxState)")).toBeLessThan(mint.indexOf("waitForSuccessfulTransactionReceipt"));
    expect(approve.indexOf("runState.pendingApproveTxHash")).toBeLessThan(approve.indexOf("sendWalletTransaction"));
    expect(approve.indexOf("writeSessionRun(runState)")).toBeLessThan(approve.indexOf("waitForSuccessfulTransactionReceipt"));
    expect(nextAction).toContain('if (runState.pendingApproveTxHash) return "approve"');
    expect(nextAction.indexOf("runState.pendingApproveTxHash")).toBeLessThan(nextAction.indexOf('assetState.next === "approval_required"'));
    expect(send).toContain("providerRequestWithContext(");
    expect(send).not.toContain("providerRequestWithTimeout(");
    expect(receiptProjection).not.toMatch(/pendingMintTxHash|pendingApproveTxHash/u);
    expect(support).not.toMatch(/pendingMintTxHash|pendingApproveTxHash/u);
  });
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
    expect(source).toContain('apiFetchJsonWithContext(context, "/api/public/config")');
    expect(source).toContain('apiFetchJsonWithContext(context, "/api/runs",');
    expect(source).toContain("apiFetchJson(`/api/receipts/${hash}`)");
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
    const approve = functionSource(source, "approveExactAmount", "ensureEvidenceSubmitted");
    const deposit = functionSource(source, "depositFromManifest", "onPrimaryAction");

    expect(mint).toContain("to: publicConfig.contracts.mockToken");
    expect(mint.indexOf("waitForSuccessfulTransactionReceipt(transactionHash, context)")).toBeLessThan(mint.indexOf("inspectWalletAssets(context)"));
    expect(approve).toContain('if (assetState.next === "deposit_ready" && approveTxHash === null)');
    expect(approve).toContain("approveTxHash: null");
    expect(approve).toContain("to: preview.asset");
    expect(approve.indexOf("waitForSuccessfulTransactionReceipt(approveTxHash, context)")).toBeLessThan(approve.lastIndexOf("inspectWalletAssets(context)"));
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
    expect(deposit.indexOf("writeSessionRun(runState)")).toBeLessThan(deposit.indexOf("ensureEvidenceSubmitted(context)"));
    expect(deposit.indexOf("ensureEvidenceSubmitted(context)")).toBeLessThan(deposit.indexOf("verifyAutomatically(context)"));
    expect(verification).toContain("await waitWithContext(VERIFY_RETRY_DELAY_MS, context)");
    expect(verification).toContain('decision === "mismatched" || decision === "failed"');
    expect(verification).toContain("location.assign(`/user/receipt/${outcome.receiptHash}`)");
    expect(action).toContain("if (inFlight) return");
    expect(action).toContain("try {");
    expect(action).toContain("finally {");
    expect(action).toContain("inFlight = false");
  });

  it("stops a matched verification without retrying when its Receipt hash is unusable", () => {
    const source = readWebFile("public/user-flow.js");
    const outcome = standaloneFunction<(value: unknown) => { receiptHash: string | null; navigate: boolean }>(
      source,
      "matchedReceiptOutcome"
    );
    const verification = functionSource(source, "verifyAutomatically", "depositFromManifest");
    const matchedStart = verification.indexOf('if (decision === "matched")');
    const mismatchStart = verification.indexOf('if (decision === "mismatched" || decision === "failed")');
    const matchedBranch = verification.slice(matchedStart, mismatchStart);

    expect(outcome(null)).toEqual({ receiptHash: null, navigate: false });
    expect(outcome("not-a-receipt")).toEqual({ receiptHash: null, navigate: false });
    expect(outcome(`0x${"a".repeat(64)}`)).toEqual({ receiptHash: `0x${"a".repeat(64)}`, navigate: true });
    expect(matchedStart).toBeGreaterThanOrEqual(0);
    expect(matchedBranch).toContain('projectSessionRun({ ...runState, status: "matched", receiptHash: outcome.receiptHash })');
    expect(matchedBranch).toContain("writeSessionRun(runState)");
    expect(matchedBranch).toContain("if (outcome.navigate)");
    expect(matchedBranch).toContain("location.assign(`/user/receipt/${outcome.receiptHash}`)");
    expect(matchedBranch).toContain("Receipt를 열 수 없습니다");
    expect(matchedBranch.trimEnd()).toMatch(/return;\s*\}$/u);
    expect(matchedBranch).not.toContain("sleep(");
  });

  it("invalidates capability-bound stale runs on wallet context changes", () => {
    const source = readWebFile("public/user-flow.js");
    const captured = functionSource(source, "invalidateCapturedRun", "invalidateRun");
    const invalidate = functionSource(source, "invalidateRun", "handleAccountsChanged");

    expect(captured).toContain("participantFetch(identity, `/api/runs/${identity.runId}/invalidate`");
    expect(invalidate).toContain("const staleRun = beginContextChange()");
    expect(source).toContain("runState = null");
    expect(source).toContain('assetState = { next: "gas_required"');
    expect(source).toContain("writeSessionRun(null)");
    expect(source).toContain('currentProvider.on("accountsChanged"');
    expect(source).toContain('currentProvider.on("chainChanged"');
    expect(source).toContain('await invalidateCapturedRun(stale, "account_changed")');
    expect(source).toContain('await invalidateCapturedRun(stale, "chain_changed")');
  });

  it("reads public Receipt payload and normalized verification fields without session gating", () => {
    const source = readWebFile("public/user-flow.js");
    const receiptRoute = functionSource(source, "renderReceiptRoute", "renderHelp");

    expect(receiptRoute).toContain('const result = await apiFetchJson(`/api/receipts/${hash}`)');
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

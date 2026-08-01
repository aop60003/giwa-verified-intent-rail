# Live Public Receipt Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/receipt/[receiptHash]` render newly verifier-matched live Receipts while preserving the committed fixture fallback and fail-closed unknown state.

**Architecture:** Add strict, dependency-free projection helpers to `apps/web/public/flow.js`. The public route will validate its hash, query `/api/receipts/[receiptHash]` first, render only a normalized `matched` response, and otherwise continue through the existing `flow-data.json` fixture gate.

**Tech Stack:** Browser-native JavaScript, TypeScript 6 test sources, Vitest, pnpm 10 workspace, existing static/live Node.js servers.

## Global Constraints

- Keep the product testnet-only and retain the exact copy: `Testnet-only. No real asset, no yield, no RWA claim.`
- Do not expose run capabilities, credentials, raw API errors, stack traces, or local database details.
- Do not add a dependency, API route, server-rendering layer, or generated evidence mutation.
- Unknown, malformed, pending, mismatched, and failed hashes must remain fail-closed and non-enumerating.
- Preserve the committed fixture Receipt when live lookup is unavailable or does not match.
- Do not stage or commit unless the user gives a separate explicit Git instruction.

---

## File Structure

- Modify `apps/web/public/flow.js`: validate public Receipt routes, normalize matched live API responses, query live evidence before the fixture, and render live verification fields.
- Create `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`: execute the browser script's pure projection helpers and enforce live-first/fallback route orchestration.
- Retain `apps/web/public/flow-data.json` unchanged: it remains the committed static evaluator fallback.

### Task 1: Strict Live Receipt Projection

**Files:**
- Create: `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`
- Modify: `apps/web/public/flow.js`

**Interfaces:**
- Produces: `receiptHashFromPathname(pathname: string): string | null`
- Produces: `projectLiveReceiptModel(body: unknown, expectedHash: string): object | null`
- Consumes: the existing `renderReceiptRoute(model, routeAllowed, routeHash)` model shape.

- [ ] **Step 1: Write the failing projection tests**

Create `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts` with the source-loader, standalone-function evaluator, live fixture, and focused assertions below:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
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
      return Function(`"use strict"; return (${source.slice(start, index + 1)});`)() as T;
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function standaloneFunctions<T extends Record<string, (...args: never[]) => unknown>>(
  source: string,
  names: string[]
): T {
  const declarations = names.map((name) => String(standaloneFunction(source, name)));
  return Function(`"use strict"; ${declarations.join("\n")}; return { ${names.join(", ")} };`)() as T;
}

const receiptHash = `0x${"a".repeat(64)}`;
const intentHash = `0x${"b".repeat(64)}`;
const depositTxHash = `0x${"c".repeat(64)}`;
const depositBlockHash = `0x${"d".repeat(64)}`;
const verifierInputHash = `0x${"e".repeat(64)}`;
const wallet = `0x${"1".repeat(40)}`;
const target = `0x${"2".repeat(40)}`;
const asset = `0x${"3".repeat(40)}`;
const safetyNotice = "Testnet-only. No real asset, no yield, no RWA claim.";

const matchedLiveReceipt = {
  source: "live",
  receiptHash,
  intentHash,
  payload: {
    intentHash,
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: "mockVaultDeposit",
    wallet,
    target,
    asset,
    spender: target,
    amountBaseUnits: "1000000000000000000",
    depositTxHash,
    depositBlockNumber: 31_439_338,
    depositBlockHash,
    safetyNotice
  },
  verifierInputHash,
  standardRpcReceiptStatus: 1,
  depositBlockNumber: 31_439_338,
  depositBlockHash,
  confirmationDepth: 8,
  testnetNotice: safetyNotice
};

describe("live public Receipt route", () => {
  const source = readWebFile("public/flow.js");
  const functions = standaloneFunctions<{
    receiptHashFromPathname: (pathname: string) => string | null;
    projectLiveReceiptModel: (body: unknown, expectedHash: string) => Record<string, unknown> | null;
  }>(source, ["receiptHashFromPathname", "projectLiveReceiptModel"]);

  it("normalizes only one valid public Receipt hash segment", () => {
    expect(functions.receiptHashFromPathname(`/receipt/${receiptHash.toUpperCase().replace("0X", "0x")}`)).toBe(
      receiptHash
    );
    expect(functions.receiptHashFromPathname("/receipt/not-a-hash")).toBeNull();
    expect(functions.receiptHashFromPathname(`/receipt/${receiptHash}/extra`)).toBeNull();
    expect(functions.receiptHashFromPathname("/user/receipt/" + receiptHash)).toBeNull();
  });

  it("projects a strict verifier-matched live Receipt into the existing route model", () => {
    const model = functions.projectLiveReceiptModel(matchedLiveReceipt, receiptHash) as {
      manifest: Record<string, unknown>;
      receipt: Record<string, unknown>;
      partnerConsole: { evidenceCards: { decodedLogSummary: unknown[] } };
    };

    expect(model.manifest).toMatchObject({
      target,
      selector: "0x47e7ef24",
      asset,
      amountBaseUnits: "1000000000000000000",
      spender: target,
      intentHash
    });
    expect(model.receipt).toMatchObject({
      ready: true,
      receiptHash,
      depositTxHash,
      blockNumber: 31_439_338,
      blockHash: depositBlockHash,
      confirmationDepth: 8,
      verifierInputHash,
      displayStatus: "Manifest matched",
      safetyNotice
    });
    expect(model.partnerConsole.evidenceCards.decodedLogSummary).toEqual([]);
  });

  it.each([
    ["wrong hash", { ...matchedLiveReceipt, receiptHash: `0x${"f".repeat(64)}` }],
    ["non-matched status", { ...matchedLiveReceipt, payload: { ...matchedLiveReceipt.payload, status: "failed" } }],
    ["wrong chain", { ...matchedLiveReceipt, payload: { ...matchedLiveReceipt.payload, chainId: 1 } }],
    ["bad block evidence", { ...matchedLiveReceipt, depositBlockHash: "0x1234" }],
    ["unconfirmed receipt", { ...matchedLiveReceipt, standardRpcReceiptStatus: 0 }]
  ])("rejects %s", (_name, body) => {
    expect(functions.projectLiveReceiptModel(body, receiptHash)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm --filter @giwa/web test -- src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: FAIL because `receiptHashFromPathname` and `projectLiveReceiptModel` do not exist in `public/flow.js`.

- [ ] **Step 3: Add the minimal pure projection helpers**

Insert these functions near the top of `apps/web/public/flow.js`, after `shortHash`:

```js
function receiptHashFromPathname(pathname) {
  const prefix = "/receipt/";
  if (typeof pathname !== "string" || !pathname.startsWith(prefix)) return null;
  try {
    const segment = decodeURIComponent(pathname.slice(prefix.length));
    return /^0x[a-fA-F0-9]{64}$/u.test(segment) ? segment.toLowerCase() : null;
  } catch {
    return null;
  }
}

function projectLiveReceiptModel(body, expectedHash) {
  const hash = (value) => typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value);
  const address = (value) => typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value);
  const amount = (value) => typeof value === "string" && /^(?:0|[1-9][0-9]{0,77})$/u.test(value);
  const safeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
  const safetyNotice = "Testnet-only. No real asset, no yield, no RWA claim.";
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !hash(expectedHash) ||
    body.source !== "live" ||
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
    !hash(payload.depositTxHash) ||
    payload.depositBlockNumber !== body.depositBlockNumber ||
    payload.depositBlockHash !== body.depositBlockHash ||
    payload.safetyNotice !== safetyNotice
  ) {
    return null;
  }
  const receiptHash = body.receiptHash.toLowerCase();
  const depositTxHash = payload.depositTxHash.toLowerCase();
  return {
    manifest: {
      target: payload.target.toLowerCase(),
      selector: "0x47e7ef24",
      asset: payload.asset.toLowerCase(),
      amountBaseUnits: payload.amountBaseUnits,
      spender: payload.spender.toLowerCase(),
      intentHash: body.intentHash.toLowerCase()
    },
    receipt: {
      ready: true,
      routeEnabled: true,
      receiptHash,
      decisionTxHash: null,
      depositTxHash,
      decisionExplorerUrl: null,
      depositExplorerUrl: `https://sepolia-explorer.giwa.io/tx/${depositTxHash}`,
      blockNumber: body.depositBlockNumber,
      blockHash: body.depositBlockHash.toLowerCase(),
      confirmationDepth: body.confirmationDepth,
      verifierInputHash: body.verifierInputHash.toLowerCase(),
      displayStatus: "Manifest matched",
      safetyNotice
    },
    partnerConsole: { evidenceCards: { decodedLogSummary: [] } }
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
pnpm --filter @giwa/web test -- src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: PASS for hash parsing, matched projection, and all fail-closed cases.

- [ ] **Step 5: Inspect the diff**

Run:

```powershell
git diff --check
git diff -- apps/web/public/flow.js apps/web/src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: no whitespace errors; only the pure projection helpers and focused tests are present.

### Task 2: Live-First Route With Fixture Fallback

**Files:**
- Modify: `apps/web/src/lib/flow/livePublicReceiptRoute.test.ts`
- Modify: `apps/web/public/flow.js`

**Interfaces:**
- Consumes: `receiptHashFromPathname(pathname)`
- Consumes: `projectLiveReceiptModel(body, expectedHash)`
- Produces: `fetchLiveReceiptModel(routeHash, fetchImpl = fetch): Promise<object | null>`
- Preserves: existing `render(model)` fixture route behavior.

- [ ] **Step 1: Add failing live-first and fallback tests**

Append these tests inside the existing `describe` block:

```ts
  it("fetches the public live Receipt without cache and projects a matched response", async () => {
    const functions = standaloneFunctions<{
      projectLiveReceiptModel: (body: unknown, expectedHash: string) => Record<string, unknown> | null;
      fetchLiveReceiptModel: (
        routeHash: string,
        fetchImpl: (input: string, init: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>
      ) => Promise<Record<string, unknown> | null>;
    }>(source, ["projectLiveReceiptModel", "fetchLiveReceiptModel"]);
    const calls: Array<{ input: string; init: RequestInit }> = [];
    const model = await functions.fetchLiveReceiptModel(receiptHash, async (input, init) => {
      calls.push({ input, init });
      return { ok: true, json: async () => matchedLiveReceipt };
    });

    expect(calls).toEqual([
      { input: `/api/receipts/${receiptHash}`, init: { cache: "no-store" } }
    ]);
    expect(model).not.toBeNull();
  });

  it("returns null for unavailable or malformed live Receipt responses", async () => {
    const functions = standaloneFunctions<{
      projectLiveReceiptModel: (body: unknown, expectedHash: string) => Record<string, unknown> | null;
      fetchLiveReceiptModel: (
        routeHash: string,
        fetchImpl: (input: string, init: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>
      ) => Promise<Record<string, unknown> | null>;
    }>(source, ["projectLiveReceiptModel", "fetchLiveReceiptModel"]);

    await expect(
      functions.fetchLiveReceiptModel(receiptHash, async () => ({ ok: false, json: async () => ({}) }))
    ).resolves.toBeNull();
    await expect(
      functions.fetchLiveReceiptModel(receiptHash, async () => {
        throw new Error("network unavailable");
      })
    ).resolves.toBeNull();
  });

  it("checks the live Receipt before loading the committed fixture", () => {
    const mainStart = source.indexOf("async function main()");
    const main = source.slice(mainStart);
    expect(mainStart).toBeGreaterThanOrEqual(0);
    expect(main.indexOf("receiptHashFromPathname(location.pathname)")).toBeGreaterThanOrEqual(0);
    expect(main.indexOf("await fetchLiveReceiptModel(routeHash)")).toBeLessThan(
      main.indexOf('fetch("/flow-data.json"')
    );
    expect(main).toContain("renderReceiptRoute(liveModel, true, routeHash)");
    expect(main).toContain("render(await response.json())");
  });
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm --filter @giwa/web test -- src/lib/flow/livePublicReceiptRoute.test.ts
```

Expected: FAIL because `fetchLiveReceiptModel` and live-first `main()` orchestration are absent.

- [ ] **Step 3: Add the live lookup and route orchestration**

Add this function after `projectLiveReceiptModel`:

```js
async function fetchLiveReceiptModel(routeHash, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`/api/receipts/${routeHash}`, { cache: "no-store" });
    if (!response.ok) return null;
    return projectLiveReceiptModel(await response.json(), routeHash);
  } catch {
    return null;
  }
}
```

Replace `main()` with:

```js
async function main() {
  const receiptRoute = location.pathname.startsWith("/receipt/");
  const routeHash = receiptHashFromPathname(location.pathname);
  if (receiptRoute && routeHash !== null) {
    const liveModel = await fetchLiveReceiptModel(routeHash);
    if (liveModel !== null) {
      renderReceiptRoute(liveModel, true, routeHash);
      return;
    }
  }

  try {
    const response = await fetch("/flow-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`flow-data ${response.status}`);
    render(await response.json());
  } catch {
    app.textContent = "";
    app.append(
      el("section", { className: "loading-panel" }, [
        el("p", { className: "eyebrow", text: "Load error" }),
        el("h1", { text: "Guided action data unavailable" }),
        el("p", { className: "muted", text: "Guided action data could not be loaded. Check the local server and retry." })
      ])
    );
  }
}
```

In the matched evidence panel of `renderReceiptRoute`, add bounded live-only fields without changing the fixture shape:

```js
        field("Deposit block hash", receipt.blockHash),
        receipt.confirmationDepth === undefined ? el("span") : field("Confirmation depth", receipt.confirmationDepth),
        receipt.verifierInputHash === undefined ? el("span") : field("Verifier input hash", receipt.verifierInputHash)
```

- [ ] **Step 4: Run focused and affected web tests**

Run:

```powershell
pnpm --filter @giwa/web test -- src/lib/flow/livePublicReceiptRoute.test.ts
pnpm --filter @giwa/web test -- src/lib/flow/guidedFlow.test.ts src/lib/live/liveReceiptPage.test.ts
```

Expected: all focused route, fixture gate, and receipt page tests PASS.

- [ ] **Step 5: Run type and build verification**

Run:

```powershell
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
git diff --check
git status --short
```

Expected: type check and build PASS; no unintended generated evidence or runtime-data changes appear.

- [ ] **Step 6: Verify the live and fixture routes**

With the existing local staging runtime running, verify:

```powershell
curl.exe --silent --show-error --fail "https://127.0.0.1:4443/api/receipts/0xde965eb246965bb005eb9b40c46c07f5c50f645499c1e5381c3c2ddbca3b991a"
curl.exe --silent --show-error --fail "https://127.0.0.1:4443/receipt/0xde965eb246965bb005eb9b40c46c07f5c50f645499c1e5381c3c2ddbca3b991a"
```

Reload the live public Receipt in Chrome and confirm `Receipt ready`, the matching Receipt hash, deposit transaction, block evidence, confirmation depth, verifier input hash, and testnet-only notice. Then open the committed fixture hash from `apps/web/public/flow-data.json` and confirm its public Receipt remains available; open an unknown 32-byte hash and confirm it remains locked without run details.

- [ ] **Step 7: Run the full web regression suite and review the final diff**

Run:

```powershell
pnpm --filter @giwa/web test
git diff --check
git diff --stat
git status --short
```

Expected: the web suite PASSes and the final diff contains only the approved spec, this plan, `flow.js`, and the new focused regression test. Do not stage or commit without separate user direction.

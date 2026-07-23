import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
}

function standaloneFunction<T extends (...args: never[]) => unknown>(source: string, name: string): T {
  const functionStart = source.indexOf(`function ${name}`);
  expect(functionStart).toBeGreaterThanOrEqual(0);
  const start = source.slice(Math.max(0, functionStart - 6), functionStart) === "async " ? functionStart - 6 : functionStart;
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

    expect(calls).toEqual([{ input: `/api/receipts/${receiptHash}`, init: { cache: "no-store" } }]);
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
});

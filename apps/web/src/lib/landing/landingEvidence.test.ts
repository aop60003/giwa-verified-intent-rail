import { existsSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

type LandingModule = {
  normalizeBytes32(value: unknown): string | null;
  projectRecordedEvidence(value: unknown): {
    receiptHash: string;
    receiptHref: string;
    depositTxHash: string;
    explorerHref: string;
  } | null;
  fetchRecordedEvidence(
    fetcher: (input: string, init: { cache: string }) => Promise<{
      ok: boolean;
      json(): Promise<unknown>;
    }>
  ): Promise<unknown>;
  applyRecordedEvidence(
    root: {
      querySelectorAll(selector: string): Array<{
        textContent: string | null;
        setAttribute(name: string, value: string): void;
        removeAttribute(name: string): void;
      }>;
    },
    evidence: {
      receiptHash: string;
      receiptHref: string;
      depositTxHash: string;
      explorerHref: string;
    } | null
  ): void;
  chooseActiveStoryStep(
    values: Array<{ id: string; ratio: number }>,
    fallback: string
  ): string;
};

let landing: LandingModule;

beforeAll(async () => {
  const direct = join(process.cwd(), "public/landing.js");
  const workspace = join(process.cwd(), "apps/web/public/landing.js");
  const path = existsSync(direct) ? direct : workspace;
  const normalizedPath = path.replaceAll("\\", "/");
  const fileUrl = new URL(normalizedPath.startsWith("/") ? `file://${normalizedPath}` : `file:///${normalizedPath}`);
  landing = (await import(`${fileUrl.href}?test=${Date.now()}`)) as LandingModule;
});

describe("landing recorded evidence", () => {
  const receiptHash = `0x${"a".repeat(64)}`;
  const depositTxHash = `0x${"b".repeat(64)}`;

  it("normalizes only exact 32-byte hashes", () => {
    expect(landing.normalizeBytes32(receiptHash.toUpperCase().replace("0X", "0x"))).toBe(receiptHash);
    expect(landing.normalizeBytes32("0x1234")).toBeNull();
    expect(landing.normalizeBytes32(null)).toBeNull();
  });

  it("projects only a route-enabled ready Receipt and rebuilds the explorer URL", () => {
    expect(
      landing.projectRecordedEvidence({
        receipt: {
          ready: true,
          routeEnabled: true,
          receiptHash,
          depositTxHash,
          depositExplorerUrl: "https://attacker.invalid/ignored"
        }
      })
    ).toEqual({
      receiptHash,
      receiptHref: `/receipt/${receiptHash}`,
      depositTxHash,
      explorerHref: `https://sepolia-explorer.giwa.io/tx/${depositTxHash}`
    });
  });

  it("fails closed for incomplete or malformed public artifacts", () => {
    expect(landing.projectRecordedEvidence({ receipt: { ready: false, routeEnabled: true } })).toBeNull();
    expect(
      landing.projectRecordedEvidence({
        receipt: {
          ready: true,
          routeEnabled: true,
          receiptHash: "not-a-hash",
          depositTxHash
        }
      })
    ).toBeNull();
  });

  it("returns null for network, status and JSON failures", async () => {
    await expect(
      landing.fetchRecordedEvidence(async () => ({
        ok: false,
        json: async () => ({})
      }))
    ).resolves.toBeNull();

    await expect(
      landing.fetchRecordedEvidence(async () => {
        throw new Error("offline");
      })
    ).resolves.toBeNull();
  });

  it("hydrates every receipt link and hash without HTML injection", () => {
    const receiptLinks = [
      { href: "/evidence", setAttribute(name: string, value: string) { if (name === "href") this.href = value; }, removeAttribute() {}, textContent: null },
      { href: "/evidence", setAttribute(name: string, value: string) { if (name === "href") this.href = value; }, removeAttribute() {}, textContent: null }
    ];
    const explorerLinks = [
      { href: "/evidence", hidden: true, setAttribute(name: string, value: string) { if (name === "href") this.href = value; }, removeAttribute(name: string) { if (name === "hidden") this.hidden = false; }, textContent: null }
    ];
    const receiptValues = [{ textContent: "recorded", setAttribute() {}, removeAttribute() {} }];
    const txValues = [{ textContent: "recorded", setAttribute() {}, removeAttribute() {} }];
    const root = {
      querySelectorAll(selector: string) {
        if (selector === "[data-recorded-receipt]") return receiptLinks;
        if (selector === "[data-recorded-explorer]") return explorerLinks;
        if (selector === "[data-receipt-hash]") return receiptValues;
        if (selector === "[data-deposit-hash]") return txValues;
        return [];
      }
    };

    landing.applyRecordedEvidence(root, {
      receiptHash,
      receiptHref: `/receipt/${receiptHash}`,
      depositTxHash,
      explorerHref: `https://sepolia-explorer.giwa.io/tx/${depositTxHash}`
    });

    expect(receiptLinks.map((link) => link.href)).toEqual([
      `/receipt/${receiptHash}`,
      `/receipt/${receiptHash}`
    ]);
    expect(explorerLinks[0]).toMatchObject({
      href: `https://sepolia-explorer.giwa.io/tx/${depositTxHash}`,
      hidden: false
    });
    expect(receiptValues.map((value) => value.textContent)).toEqual(["0xaaaaaa…aaaaaa"]);
    expect(txValues.map((value) => value.textContent)).toEqual(["0xbbbbbb…bbbbbb"]);
  });

  it("selects the most visible known story step and keeps a safe fallback", () => {
    expect(
      landing.chooseActiveStoryStep(
        [
          { id: "review", ratio: 0.2 },
          { id: "verify", ratio: 0.72 },
          { id: "receipt", ratio: 0.4 }
        ],
        "review"
      )
    ).toBe("verify");
    expect(landing.chooseActiveStoryStep([], "sign")).toBe("sign");
    expect(landing.chooseActiveStoryStep([{ id: "unknown", ratio: 1 }], "review")).toBe("review");
  });
});

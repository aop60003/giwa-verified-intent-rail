import { existsSync, readFileSync } from "node:fs";
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
  applyStoryStage(
    root: { dataset: Record<string, string> },
    steps: Array<{
      dataset: { storyStep: string };
      setAttribute(name: string, value: string): void;
      removeAttribute(name: string): void;
    }>,
    stage: string
  ): boolean;
  setupScrollStory(rootDocument: unknown, ObserverCtor?: unknown): () => void;
  setupReveals(rootDocument: unknown, ObserverCtor?: unknown): () => void;
};

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

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

  it("projects one valid active story stage without changing semantic content", () => {
    const root = { dataset: { storyStage: "manifest" } };
    const steps = ["manifest", "execution", "matching", "receipt"].map((stage) => ({
      dataset: { storyStep: stage },
      attributes: new Map<string, string>(),
      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      },
      removeAttribute(name: string) {
        this.attributes.delete(name);
      }
    }));

    expect(landing.applyStoryStage(root, steps, "matching")).toBe(true);
    expect(root.dataset.storyStage).toBe("matching");
    expect(steps[2]?.attributes.get("aria-current")).toBe("step");
    expect(steps[0]?.attributes.has("aria-current")).toBe(false);

    expect(landing.applyStoryStage(root, steps, "unknown")).toBe(false);
    expect(root.dataset.storyStage).toBe("matching");
  });

  it("observes all four story steps, updates progress, and disconnects cleanly", () => {
    type StoryStep = {
      dataset: { storyStep: string };
      attributes: Map<string, string>;
      setAttribute(name: string, value: string): void;
      removeAttribute(name: string): void;
    };
    type StoryEntry = {
      isIntersecting: boolean;
      intersectionRatio: number;
      target: { dataset: { storyTrigger: string } };
    };

    const steps: StoryStep[] = ["manifest", "execution", "matching", "receipt"].map((stage) => ({
      dataset: { storyStep: stage },
      attributes: new Map<string, string>(),
      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      },
      removeAttribute(name: string) {
        this.attributes.delete(name);
      }
    }));
    const progress = { textContent: "01 / 04" };
    const triggers = ["manifest", "execution", "matching", "receipt"].map((stage) => ({
      dataset: { storyTrigger: stage }
    }));
    const root = {
      dataset: { storyStage: "manifest" },
      querySelectorAll(selector: string) {
        if (selector === "[data-story-step]") return steps;
        if (selector === "[data-story-trigger]") return triggers;
        return [];
      },
      querySelector(selector: string) {
        return selector === "[data-story-progress]" ? progress : null;
      }
    };
    const rootDocument = {
      querySelector(selector: string) {
        return selector === "[data-scroll-story]" ? root : null;
      }
    };
    const observed: Array<{ dataset: { storyTrigger: string } }> = [];
    let callback: ((entries: StoryEntry[]) => void) | undefined;
    let disconnected = false;
    class FakeObserver {
      constructor(handler: (entries: StoryEntry[]) => void) {
        callback = handler;
      }
      observe(trigger: { dataset: { storyTrigger: string } }) {
        observed.push(trigger);
      }
      disconnect() {
        disconnected = true;
      }
    }

    const cleanup = landing.setupScrollStory(rootDocument, FakeObserver);
    expect(root.dataset).toMatchObject({
      storyStage: "manifest",
      storyEnhanced: "true"
    });
    expect(observed).toEqual(triggers);

    callback?.([
      { isIntersecting: true, intersectionRatio: 0.72, target: triggers[2]! },
      { isIntersecting: true, intersectionRatio: 0.18, target: triggers[1]! }
    ]);
    expect(root.dataset.storyStage).toBe("matching");
    expect(progress.textContent).toBe("03 / 04");
    expect(steps[2]?.attributes.get("aria-current")).toBe("step");

    cleanup();
    expect(disconnected).toBe(true);
  });

  it("fails open when observer enhancement is unavailable", () => {
    const root = {
      dataset: { storyStage: "manifest" },
      querySelectorAll() {
        return [];
      },
      querySelector() {
        return null;
      }
    };
    const rootDocument = {
      querySelector() {
        return root;
      }
    };

    const cleanup = landing.setupScrollStory(rootDocument, null);
    expect(root.dataset).not.toHaveProperty("storyEnhanced");
    expect(cleanup).toBeTypeOf("function");
    expect(() => cleanup()).not.toThrow();
  });

  it("reveals normal sections once and leaves them visible", () => {
    type RevealNode = { dataset: Record<string, string> };
    type RevealEntry = { isIntersecting: boolean; target: RevealNode };

    const nodes: RevealNode[] = [{ dataset: {} }, { dataset: {} }];
    const rootDocument = {
      documentElement: { dataset: {} as Record<string, string> },
      querySelectorAll(selector: string) {
        return selector === "[data-reveal]" ? nodes : [];
      }
    };
    const observed: RevealNode[] = [];
    const unobserved: RevealNode[] = [];
    let callback: ((entries: RevealEntry[]) => void) | undefined;
    class FakeObserver {
      constructor(handler: (entries: RevealEntry[]) => void) {
        callback = handler;
      }
      observe(node: RevealNode) {
        observed.push(node);
      }
      unobserve(node: RevealNode) {
        unobserved.push(node);
      }
      disconnect() {}
    }

    landing.setupReveals(rootDocument, FakeObserver);
    expect(rootDocument.documentElement.dataset.revealEnhanced).toBe("true");
    expect(observed).toEqual(nodes);

    callback?.([{ isIntersecting: true, target: nodes[1]! }]);
    expect(nodes[1]?.dataset.visible).toBe("true");
    expect(unobserved).toEqual([nodes[1]]);
  });
});

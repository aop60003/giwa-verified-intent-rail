const BYTES32_PATTERN = /^0x[a-fA-F0-9]{64}$/u;
const EXPLORER_TX_BASE = "https://sepolia-explorer.giwa.io/tx/";

export function normalizeBytes32(value) {
  return typeof value === "string" && BYTES32_PATTERN.test(value) ? value.toLowerCase() : null;
}

export function shortHash(value) {
  const normalized = normalizeBytes32(value);
  return normalized === null ? null : `${normalized.slice(0, 8)}…${normalized.slice(-6)}`;
}

export function projectRecordedEvidence(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const receipt = value.receipt;
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) return null;
  if (receipt.ready !== true || receipt.routeEnabled !== true) return null;

  const receiptHash = normalizeBytes32(receipt.receiptHash);
  const depositTxHash = normalizeBytes32(receipt.depositTxHash);
  if (receiptHash === null || depositTxHash === null) return null;

  return {
    receiptHash,
    receiptHref: `/receipt/${receiptHash}`,
    depositTxHash,
    explorerHref: `${EXPLORER_TX_BASE}${depositTxHash}`
  };
}

const STORY_STEPS = new Set(["review", "sign", "execute", "verify", "receipt"]);

export function chooseActiveStoryStep(values, fallback = "review") {
  const safeFallback = STORY_STEPS.has(fallback) ? fallback : "review";
  let selected = safeFallback;
  let selectedRatio = -1;

  for (const value of values) {
    if (
      value === null ||
      typeof value !== "object" ||
      !STORY_STEPS.has(value.id) ||
      typeof value.ratio !== "number" ||
      !Number.isFinite(value.ratio) ||
      value.ratio < 0
    ) {
      continue;
    }
    if (value.ratio > selectedRatio) {
      selected = value.id;
      selectedRatio = value.ratio;
    }
  }
  return selected;
}

export async function fetchRecordedEvidence(fetcher = fetch) {
  try {
    const response = await fetcher("/flow-data.json", { cache: "no-store" });
    if (!response.ok) return null;
    return projectRecordedEvidence(await response.json());
  } catch {
    return null;
  }
}

export function applyRecordedEvidence(root, evidence) {
  const receiptLinks = root.querySelectorAll("[data-recorded-receipt]");
  const explorerLinks = root.querySelectorAll("[data-recorded-explorer]");
  const receiptValues = root.querySelectorAll("[data-receipt-hash]");
  const txValues = root.querySelectorAll("[data-deposit-hash]");

  if (evidence === null) {
    for (const link of receiptLinks) link.setAttribute("href", "/evidence");
    for (const link of explorerLinks) link.setAttribute("hidden", "");
    return;
  }

  for (const link of receiptLinks) link.setAttribute("href", evidence.receiptHref);
  for (const link of explorerLinks) {
    link.setAttribute("href", evidence.explorerHref);
    link.removeAttribute("hidden");
  }
  for (const value of receiptValues) value.textContent = shortHash(evidence.receiptHash);
  for (const value of txValues) value.textContent = shortHash(evidence.depositTxHash);
}

export function setupStory(rootDocument = document) {
  const storyRoot = rootDocument.querySelector("[data-story-root]");
  const steps = Array.from(rootDocument.querySelectorAll("[data-story-step]"));
  if (!storyRoot || steps.length === 0 || typeof IntersectionObserver !== "function") return;

  const ratios = new Map(steps.map((step) => [step.dataset.storyStep, 0]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.dataset.storyStep;
        if (STORY_STEPS.has(id)) ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      const active = chooseActiveStoryStep(
        Array.from(ratios, ([id, ratio]) => ({ id, ratio })),
        storyRoot.dataset.activeStep
      );
      storyRoot.dataset.activeStep = active;
      for (const step of steps) {
        if (step.dataset.storyStep === active) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      }
    },
    { rootMargin: "-22% 0px -38% 0px", threshold: [0, 0.2, 0.4, 0.6, 0.8] }
  );

  for (const step of steps) observer.observe(step);
}

export function setupMenu(rootDocument = document) {
  const toggle = rootDocument.querySelector("[data-menu-toggle]");
  const menu = rootDocument.querySelector("[data-menu]");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    menu.dataset.open = open ? "true" : "false";
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) setOpen(false);
  });
  rootDocument.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

export async function initLanding(rootDocument = document) {
  setupMenu(rootDocument);
  setupStory(rootDocument);
  const evidence = await fetchRecordedEvidence();
  applyRecordedEvidence(rootDocument, evidence);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void initLanding(document);
    }, { once: true });
  } else {
    void initLanding(document);
  }
}

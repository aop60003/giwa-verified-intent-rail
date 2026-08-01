const BYTES32_PATTERN = /^0x[a-fA-F0-9]{64}$/u;
const EXPLORER_TX_BASE = "https://sepolia-explorer.giwa.io/tx/";
const STORY_STAGES = ["manifest", "execution", "matching", "receipt"];

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

export function applyStoryStage(root, steps, stage) {
  if (!STORY_STAGES.includes(stage)) return false;

  root.dataset.storyStage = stage;
  for (const step of steps) {
    if (step.dataset.storyStep === stage) {
      step.setAttribute("aria-current", "step");
    } else {
      step.removeAttribute("aria-current");
    }
  }
  return true;
}

export function setupScrollStory(
  rootDocument = document,
  ObserverCtor = globalThis.IntersectionObserver
) {
  const root = rootDocument.querySelector("[data-scroll-story]");
  const steps = root ? Array.from(root.querySelectorAll("[data-story-step]")) : [];
  const triggers = root ? Array.from(root.querySelectorAll("[data-story-trigger]")) : [];
  const progress = root?.querySelector("[data-story-progress]");

  if (
    !root ||
    steps.length !== STORY_STAGES.length ||
    triggers.length !== STORY_STAGES.length ||
    typeof ObserverCtor !== "function"
  ) {
    return () => {};
  }

  const setActive = (stage) => {
    if (!applyStoryStage(root, steps, stage)) return;
    const index = STORY_STAGES.indexOf(stage);
    if (progress) {
      progress.textContent = `${String(index + 1).padStart(2, "0")} / 04`;
    }
  };

  let observer;
  try {
    observer = new ObserverCtor((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      const stage = active?.target?.dataset?.storyTrigger;
      if (typeof stage === "string") setActive(stage);
    }, {
      rootMargin: "-28% 0px -48% 0px",
      threshold: [0.15, 0.35, 0.55, 0.75]
    });

    setActive("manifest");
    for (const trigger of triggers) observer.observe(trigger);
    root.dataset.storyEnhanced = "true";
  } catch {
    observer?.disconnect();
    delete root.dataset.storyEnhanced;
    return () => {};
  }

  return () => observer.disconnect();
}

export function setupReveals(
  rootDocument = document,
  ObserverCtor = globalThis.IntersectionObserver
) {
  const nodes = Array.from(rootDocument.querySelectorAll("[data-reveal]"));
  const documentElement = rootDocument.documentElement;
  if (
    nodes.length === 0 ||
    !documentElement ||
    typeof ObserverCtor !== "function"
  ) {
    return () => {};
  }

  let observer;
  try {
    observer = new ObserverCtor((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.dataset.visible = "true";
        observer?.unobserve(entry.target);
      }
    }, {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12
    });

    for (const node of nodes) observer.observe(node);
    documentElement.dataset.revealEnhanced = "true";
  } catch {
    observer?.disconnect();
    delete documentElement.dataset.revealEnhanced;
    return () => {};
  }

  return () => observer.disconnect();
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
  setupScrollStory(rootDocument);
  setupReveals(rootDocument);
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

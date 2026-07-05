const app = document.querySelector("#app");
const REQUEST_TIMEOUT_MS = 8000;

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "href") node.setAttribute("href", value);
    else if (value !== null && value !== false) node.setAttribute(key, String(value));
  }
  for (const child of children) node.append(child);
  return node;
}

function field(label, value, href = null) {
  return el("div", { className: "field" }, [
    el("span", { className: "field-label", text: label }),
    href === null
      ? el("span", { className: "mono field-value hash-wrap", text: String(value ?? "unavailable") })
      : el("a", { className: "mono field-value hash-wrap", href, text: String(value ?? href) })
  ]);
}

async function json(path) {
  const response = await fetchWithTimeout(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return response.json();
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(path, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function optionalJson(path) {
  try {
    return await json(path);
  } catch {
    return null;
  }
}

function statePill(state) {
  return el("span", { className: `status-pill ${state}`, text: state });
}

function renderError() {
  app.textContent = "";
  app.append(
    el("section", { className: "loading-panel" }, [
      el("p", { className: "eyebrow", text: "Demo control room" }),
      el("h1", { text: "Live status unavailable" }),
      el("p", { className: "muted", text: "Live status could not be loaded. Use the static fallback or retry the local server." }),
      el("a", { className: "primary-link", href: "/", text: "Open static fallback" })
    ])
  );
}

function render(status, health, readiness, snapshot) {
  const control = status?.controlRoom;
  const projection = control?.safeProjection ?? {};
  const liveItem = control?.openingOrder?.find((item) => item.id === "freshLive" || item.href === "/live");
  const liveHref = liveItem?.href ?? "http://127.0.0.1:4190/live";
  app.textContent = "";
  app.append(
    el("section", { className: "hero-flow demo-hero" }, [
      el("div", { className: "hero-copy" }, [
        el("p", { className: "eyebrow", text: "GIWA Verified Intent Rail" }),
        el("h1", { text: "Demo control room" }),
        el("p", {
          className: "lead",
          text: "Use this local reviewer surface to choose the live path, dynamic receipt, or recorded fallback."
        }),
        el("div", { className: "hero-actions" }, [
          el("a", { className: "primary-link", href: liveHref, text: "Open live flow" }),
          el("a", { className: "secondary-link", href: "/user", text: "User flow" }),
          el("a", { className: "secondary-link", href: "/", text: "Static fallback" }),
          el("a", { className: "secondary-link", href: "/partner", text: "Partner packet" })
        ])
      ]),
      el("section", { className: "panel" }, [
        el("div", { className: "panel-heading" }, [
          el("p", { className: "eyebrow", text: "Runtime status" }),
          el("h2", { text: readiness?.ready ? "Ready" : "Check readiness" })
        ]),
        field("Health", health?.ok === true ? "ok" : "unavailable"),
        field("Readiness", readiness?.ready === true ? "ready" : "not ready"),
        field("Mode", readiness?.mode ?? projection.readiness?.mode ?? "local"),
        field("Latest run", projection.latestRun?.runId ?? "none"),
        field("Run status", projection.latestRun?.status ?? "none"),
        field("Receipt hash", projection.receiptHash ?? "locked")
      ])
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "Opening order" }),
        el("h2", { text: "Reviewer path" })
      ]),
      el(
        "div",
        { className: "proof-grid" },
        (control?.openingOrder ?? []).map((item) =>
          el("section", { className: "panel" }, [
            el("div", { className: "panel-heading" }, [
              el("p", { className: "eyebrow", text: item.label ?? item.id }),
              statePill(item.state)
            ]),
            el("p", { className: "muted", text: item.reason }),
            field("URL", item.href, item.href)
          ])
        )
      )
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "Snapshot" }),
        el("h2", { text: snapshot === null ? "Snapshot unavailable" : "Public snapshot available" })
      ]),
      el("section", { className: "panel" }, [
        field("Live snapshot", snapshot?.receipt?.receiptHash ?? "unavailable", "/live-demo-snapshot.json"),
        field("Static snapshot", "/partner-snapshot.json", "/partner-snapshot.json"),
        field("Block evidence", "standard RPC evidence only")
      ])
    ])
  );
}

async function main() {
  try {
    const [health, readiness, status, snapshot] = await Promise.all([
      optionalJson("/healthz"),
      optionalJson("/readyz"),
      json("/api/demo/status"),
      optionalJson("/live-demo-snapshot.json")
    ]);
    render(status, health, readiness, snapshot);
  } catch {
    renderError();
  }
}

void main();

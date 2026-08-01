import { campaignVersionRoute, projectPublicCampaignVersion } from "/campaign-version-model.js";

const app = document.querySelector("#app");

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.href) node.href = options.href;
  if (options.role) node.setAttribute("role", options.role);
  if (options.tabindex) node.setAttribute("tabindex", options.tabindex);
  if (options.text !== undefined) node.textContent = options.text;
  node.append(...children);
  return node;
}

function viewState(heading, message) {
  document.title = `${heading} · GIWA Verified Intent Rail`;
  app.textContent = "";
  app.append(
    globalThis.GiwaProtocolDossier.createHeader(document, { activeView: "campaign", walletLabel: "Preview only" }),
    element("section", { className: "campaign-version-page campaign-version-state" }, [
      element("p", { className: "eyebrow", text: "Published campaign preview" }),
      element("h1", { text: heading, tabindex: "-1" }),
      element("p", { className: "lead", text: message })
    ])
  );
  document.querySelector("h1")?.focus({ preventScroll: true });
}

function field(label, value, className = "") {
  return element("div", { className: "campaign-version-field" }, [
    element("dt", { text: label }),
    element("dd", { className, text: value })
  ]);
}

function renderCampaign(campaign) {
  document.title = `${campaign.name} · GIWA Verified Intent Rail`;
  const heading = element("h1", { text: campaign.name, tabindex: "-1" });
  app.textContent = "";
  app.append(
    globalThis.GiwaProtocolDossier.createHeader(document, { activeView: "campaign", walletLabel: "Preview only" }),
    element("section", { className: "campaign-version-page" }, [
      element("p", { className: "eyebrow", text: "Published campaign preview" }),
      heading,
      element("p", { className: "lead", text: campaign.summary }),
      element("div", { className: "campaign-version-facts", role: "list" }, [
        element("span", { className: "campaign-version-pill", text: "GIWA Sepolia testnet" }),
        element("span", { className: "campaign-version-pill", text: "Mock assets only" }),
        element("span", { className: "campaign-version-pill", text: `Version ${campaign.versionNumber}` }),
        element("span", { className: "campaign-version-pill", text: "Mock Vault Deposit" }),
        element("span", { className: "campaign-version-pill", text: "Preview only - Transaction unavailable" })
      ]),
      element("section", { className: "campaign-version-card" }, [
        element("h2", { text: "Published version details" }),
        element("dl", { className: "campaign-version-details" }, [
          field("Publication time", campaign.publishedAt, "mono"),
          field("Campaign version hash", campaign.campaignVersionHash, "mono hash-wrap"),
          field("Network", campaign.network),
          field("Template", "Mock Vault Deposit")
        ]),
        element("p", { className: "notice", text: "This preview has no execution or Receipt evidence." }),
        element("a", { className: "secondary-link campaign-version-link", href: "/partner", text: "View existing Campaign evidence board" })
      ])
    ])
  );
  heading.focus({ preventScroll: true });
}

async function loadCampaign() {
  if (window.location.search !== "") {
    viewState("Campaign version not found", "This published campaign version is not available.");
    return;
  }
  let route = null;
  try {
    route = campaignVersionRoute(decodeURIComponent(window.location.pathname));
  } catch {
    route = null;
  }
  if (route === null) {
    viewState("Campaign version not found", "This published campaign version is not available.");
    return;
  }

  try {
    const response = await fetch(`/api/public/campaigns/${route.campaignId}/versions/${route.versionNumber}`, {
      headers: { accept: "application/json" }
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) throw new Error("non_json_response");
    const payload = await response.json();
    if (response.status === 404 && payload?.error === "not_found") {
      viewState("Campaign version not found", "This published campaign version is not available.");
      return;
    }
    if (!response.ok) throw new Error("unavailable_response");
    const campaign = projectPublicCampaignVersion(payload, route);
    if (campaign === null) throw new Error("invalid_public_payload");
    renderCampaign(campaign);
  } catch {
    viewState("Live campaign preview unavailable", "The live campaign preview cannot be loaded right now.");
  }
}

void loadCampaign();

const app = document.querySelector("#app");

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "href") {
      node.setAttribute("href", value);
      if (!String(value).startsWith("/")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noreferrer");
      }
    } else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function shortHash(value) {
  if (!value) return "pending";
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function field(label, value, href) {
  return el("div", { className: "field" }, [
    el("span", { className: "field-label", text: label }),
    href
      ? el("a", { className: "mono field-value hash-wrap", href, text: shortHash(value) })
      : el("span", { className: "mono field-value hash-wrap", text: String(value ?? "pending") })
  ]);
}

function metric(label, value, detail) {
  return el("section", { className: "metric-panel" }, [
    el("span", { className: "field-label", text: label }),
    el("strong", { text: String(value) }),
    el("span", { className: "muted", text: detail })
  ]);
}

function stepIcon(state) {
  if (state === "complete") return "OK";
  if (state === "active") return ">";
  if (state === "blocked") return "!";
  return "-";
}

function renderStatusRail(model) {
  return el(
    "ol",
    { className: "status-rail", "aria-label": "Action status" },
    model.statusRail.map((step) =>
      el("li", { className: `status-step ${step.state}`, "aria-current": step.state === "active" ? "step" : null }, [
        el("span", { className: "status-icon", text: stepIcon(step.state), title: step.state }),
        el("span", { className: "status-body" }, [
          el("strong", { text: step.label }),
          el("span", { text: step.detail }),
          step.finalConfirmation ? el("em", { text: "Standard RPC confirmation" }) : el("em", { text: "Not final completion" })
        ])
      ])
    )
  );
}

function renderEvidencePacket(partner) {
  const packet = partner.evidencePacket;
  if (!packet) return el("span");
  const firstRow = packet.rows[0];

  return el("section", { className: "band packet-band" }, [
    el("div", { className: "section-heading" }, [
      el("p", { className: "eyebrow", text: "Evidence packet" }),
      el("h2", { text: `${packet.campaignId} / ${packet.missionId}` })
    ]),
    el("div", { className: "metric-grid" }, [
      metric("Matched receipts", packet.kpis.matchedReceiptCount, "gate-passed receipt rows"),
      metric("Matched tx rate", packet.kpis.matchedTxRate, "matched receipts / submitted deposits"),
      metric("Mock testnet amount", packet.kpis.mockTestnetDepositAmountBaseUnits, "base units in matched packet"),
      metric("Fixture rows", packet.sourceMix.fixture, "recorded evidence rows"),
      metric("Live rows", packet.sourceMix.live, "fresh live evidence rows"),
      metric("Replay status", packet.evidence.replayStatus, "public evidence replay")
    ]),
    el("section", { className: "panel proof-row" }, [
      field("Source label", firstRow?.source ?? "none"),
      field("Receipt hash", firstRow?.receiptHash ?? "locked", firstRow?.receiptPermalink ?? null),
      field("Deposit tx", firstRow?.depositTxHash ?? "pending"),
      field("Verifier input hash", firstRow?.verifierInputHash ?? "pending"),
      field("Standard RPC status", packet.evidence.standardRpc.status),
      field("Confirmation depth", packet.evidence.standardRpc.confirmationDepth),
      field("Snapshot", packet.exportLinks.snapshotPath)
    ])
  ]);
}

function renderPartnerConsole(model) {
  const partner = model.partnerConsole;
  const summary = partner.summary;
  const cards = partner.evidenceCards;
  const row = partner.rows[0];
  app.textContent = "";
  app.append(
    el("section", { className: "hero-flow partner-hero" }, [
      el("div", { className: "hero-copy" }, [
        el("p", { className: "eyebrow", text: "Partner ProofKPI console" }),
        el("h1", { text: "Mock testnet action evidence" }),
        el("p", { className: "lead", text: partner.partnerExplanation }),
        el("div", { className: "hero-actions" }, [
          el("a", { className: "primary-link", href: partner.exportSnapshot.snapshotPath, download: "partner-snapshot.json", text: "Download JSON snapshot" }),
          row?.receiptPermalink
            ? el("a", { className: "secondary-link", href: row.receiptPermalink, text: "Receipt permalink" })
            : el("span", { className: "disabled-link", text: "Receipt pending" })
        ])
      ]),
      el("div", { className: "hero-status" }, [
        el("span", { className: "status-pill", text: summary.matchedStatus }),
        el("span", { className: "mono hash-xl", text: shortHash(cards.receiptHash) }),
        el("p", { className: "muted", text: partner.source.evidenceDraftUntilSprint7 ? "Pre-final evidence snapshot." : "Evidence snapshot." })
      ])
    ]),
    renderEvidencePacket(partner),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "KPI summary" }),
        el("h2", { text: `${summary.campaignId} / ${summary.missionId}` })
      ]),
      el("div", { className: "metric-grid" }, [
        metric("Campaign entries", summary.campaignEntryCount, "fixture and live rows are deduped by run"),
        metric("Wallet connected", summary.walletConnectedCount, "same campaign, mission, wallet, intent"),
        metric("Deposit submitted", summary.depositSubmittedCount, "mock testnet transaction count"),
        metric("Receipt matched", summary.manifestMatchedReceiptCount, "manifest-matched receipt count"),
        metric("Matched tx rate", summary.matchedTxRate, `${summary.matchedTxRateNumerator}/${summary.matchedTxRateDenominator || 0} deposits`),
        metric("Mock testnet deposit amount", summary.mockTestnetDepositAmountBaseUnits, `${summary.mockTestnetDepositCount} matched mock deposit`)
      ])
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "Evidence cards" }),
        el("h2", { text: "Receipt, transaction, signer, and logs" })
      ]),
      el("div", { className: "proof-grid" }, [
        el("section", { className: "panel" }, [
          el("div", { className: "panel-heading" }, [el("p", { className: "eyebrow", text: "Receipt" }), el("h2", { text: "Matched output" })]),
          field("Receipt hash", cards.receiptHash, row?.receiptPermalink),
          field("Decision tx", cards.decisionTxHash, row?.decisionExplorerUrl),
          field("Deposit tx", cards.depositTxHash, row?.depositExplorerUrl),
          field("Intent submitted tx", cards.intentSubmittedTxHash)
        ]),
        el("section", { className: "panel" }, [
          el("div", { className: "panel-heading" }, [el("p", { className: "eyebrow", text: "Confirmation" }), el("h2", { text: "Standard RPC only" })]),
          field("Receipt status", cards.standardConfirmation.status),
          field("Block number", cards.standardConfirmation.blockNumber),
          field("Block hash", cards.standardConfirmation.blockHash),
          field("Confirmation depth", cards.standardConfirmation.confirmationDepth),
          field("Flashblocks namespace", `${cards.fastFeedback.namespace} - not final`)
        ]),
        el("section", { className: "panel" }, [
          el("div", { className: "panel-heading" }, [el("p", { className: "eyebrow", text: "Manifest signer" }), el("h2", { text: cards.manifestSigner.signerMatched ? "Recovered signer matched" : "Signer mismatch" })]),
          field("Expected signer", cards.manifestSigner.expectedSigner),
          field("Recovered signer", cards.manifestSigner.recoveredSigner),
          field("Signer matched", cards.manifestSigner.signerMatched ? "yes" : "no")
        ]),
        el("section", { className: "panel" }, [
          el("div", { className: "panel-heading" }, [el("p", { className: "eyebrow", text: "Decoded logs" }), el("h2", { text: "Manifest evidence" })]),
          el(
            "div",
            { className: "log-list" },
            cards.decodedLogSummary.map((log) =>
              el("div", { className: "event-row" }, [
                el("span", { text: `${log.eventName} #${log.logIndex}` }),
                el("span", { className: "mono", text: shortHash(log.contractAddress) })
              ])
            )
          )
        ])
      ])
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "Fixture source" }),
        el("h2", { text: "One proof row" })
      ]),
      el("section", { className: "panel proof-row" }, [
        field("Source", row?.source ?? "fixture"),
        field("Evidence path", partner.source.evidencePath),
        field("Source timestamp", partner.source.sourceTimestamp),
        field("Run id", row?.runId),
        field("Dedupe key", row?.dedupeKey),
        field("Wallet", row?.wallet),
        field("Verified state", `${row?.verifiedState ?? "guest"} - read-only`),
        field("Status", row?.status ?? "pending"),
        field("Block hash", row?.blockHash)
      ]),
      el("p", { className: "notice", text: "Metrics describe one GIWA Sepolia mock testnet action. Flashblocks is shown only as non-final fast feedback." })
    ])
  );
}

function renderActions(model) {
  return el(
    "div",
    { className: "action-grid" },
    model.walletActions.map((action) =>
      el("section", { className: "panel action-panel" }, [
        el("div", { className: "panel-heading" }, [
          el("p", { className: "eyebrow", text: action.status }),
          el("h2", { text: action.kind === "approve" ? "Approve mock token" : "Deposit to mock vault" })
        ]),
        el("p", { className: "muted", text: action.note }),
        field("From", action.from),
        field("To", action.to),
        field("Tx", action.txHash, action.explorerUrl)
      ])
    )
  );
}

function renderReceipt(model, routeMode) {
  const receipt = model.receipt;
  const title = receipt.ready ? "Receipt ready" : "Receipt pending";
  return el("section", { className: `panel receipt-panel ${routeMode ? "route-focus" : ""}` }, [
    el("div", { className: "panel-heading" }, [
      el("p", { className: "eyebrow", text: model.source.evidenceDraftUntilSprint7 ? "Pre-final evidence" : "Evidence" }),
      el("h2", { text: title })
    ]),
    el("p", {
      className: "muted",
      text: receipt.ready
        ? "Verifier matched the block-confirmed mock vault action to the signed manifest."
        : "Receipt stays locked until verifier status is matched."
    }),
    field("Receipt hash", receipt.receiptHash),
    field("Decision tx", receipt.decisionTxHash, receipt.decisionExplorerUrl),
    field("Deposit tx", receipt.depositTxHash, receipt.depositExplorerUrl),
    field("Deposit block", receipt.blockNumber),
    field("Deposit block hash", receipt.blockHash),
    receipt.ready
      ? el("a", {
          className: "primary-link",
          href: `/receipt/${receipt.receiptHash}`,
          text: routeMode ? "Receipt route active" : "Open receipt route"
        })
      : el("span", { className: "disabled-link", text: "Receipt route locked" })
  ]);
}

function renderReceiptRoute(model, routeAllowed, routeHash) {
  app.textContent = "";
  if (!routeAllowed) {
    app.append(
      el("section", { className: "hero-flow receipt-hero" }, [
        el("div", { className: "hero-copy" }, [
          el("p", { className: "eyebrow", text: "Commercial receipt" }),
          el("h1", { text: "Receipt not found or not available" }),
          el("p", {
            className: "lead",
            text: "This public route only opens after verifier-matched evidence passes the receipt gate."
          }),
          el("div", { className: "hero-actions" }, [
            el("a", { className: "primary-link", href: "/", text: "Open guided flow" }),
            el("a", { className: "secondary-link", href: "/partner", text: "Partner packet" })
          ])
        ]),
        el("section", { className: "panel" }, [
          el("div", { className: "panel-heading" }, [
            el("p", { className: "eyebrow", text: "Locked" }),
            el("h2", { text: "Matched receipt required" })
          ]),
          field("Requested hash", routeHash ?? "missing"),
          field("Receipt gate", "matched verification required"),
          field("Details", "No run details are shown for unknown receipt hashes")
        ])
      ])
    );
    return;
  }

  const receipt = model.receipt;
  app.append(
    el("section", { className: "hero-flow receipt-hero" }, [
      el("div", { className: "hero-copy" }, [
        el("p", { className: "eyebrow", text: "Commercial receipt" }),
        el("h1", { text: "Receipt ready" }),
        el("p", {
          className: "lead",
          text: "Verifier matched the confirmed mock vault action to the signed manifest."
        }),
        el("div", { className: "hero-actions" }, [
          el("a", { className: "primary-link", href: receipt.depositExplorerUrl ?? "#", text: "Deposit tx" }),
          el("a", { className: "secondary-link", href: "/partner", text: "Partner packet" })
        ])
      ]),
      el("section", { className: "panel" }, [
        el("div", { className: "panel-heading" }, [
          el("p", { className: "eyebrow", text: "Matched evidence" }),
          el("h2", { text: shortHash(receipt.receiptHash) })
        ]),
        field("Receipt hash", receipt.receiptHash),
        field("Decision tx", receipt.decisionTxHash, receipt.decisionExplorerUrl),
        field("Deposit tx", receipt.depositTxHash, receipt.depositExplorerUrl),
        field("Deposit block", receipt.blockNumber),
        field("Deposit block hash", receipt.blockHash)
      ])
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "Progressive disclosure" }),
        el("h2", { text: "Evidence chain" })
      ]),
      el("div", { className: "proof-grid" }, [
        el("details", { className: "panel", open: true }, [
          el("summary", { text: "Manifest summary" }),
          field("Target", model.manifest.target),
          field("Selector", model.manifest.selector),
          field("Asset", model.manifest.asset),
          field("Amount", model.manifest.amountBaseUnits),
          field("Spender", model.manifest.spender),
          field("Intent hash", model.manifest.intentHash)
        ]),
        el("details", { className: "panel" }, [
          el("summary", { text: "Receipt payload" }),
          field("Status", model.receipt.displayStatus),
          field("Safety notice", model.receipt.safetyNotice),
          field("Standard source", "standard RPC receipt")
        ]),
        el("details", { className: "panel" }, [
          el("summary", { text: "Decoded logs" }),
          el(
            "div",
            { className: "log-list" },
            model.partnerConsole.evidenceCards.decodedLogSummary.map((log) =>
              el("div", { className: "event-row" }, [
                el("span", { text: `${log.eventName} #${log.logIndex}` }),
                el("span", { className: "mono hash-wrap", text: shortHash(log.contractAddress) })
              ])
            )
          )
        ])
      ])
    ])
  );
}

function render(model) {
  if (location.pathname === "/partner") {
    renderPartnerConsole(model);
    return;
  }

  const receiptRoute = location.pathname.startsWith("/receipt/");
  const routeHash = location.pathname.split("/").filter(Boolean).at(-1);
  const routeAllowed = receiptRoute && model.receipt.ready && routeHash?.toLowerCase() === model.receipt.receiptHash?.toLowerCase();
  if (receiptRoute) {
    renderReceiptRoute(model, routeAllowed, routeHash);
    return;
  }
  app.textContent = "";
  app.append(
    el("section", { className: "hero-flow" }, [
      el("div", { className: "hero-copy" }, [
        el("p", { className: "eyebrow", text: `${model.mission.networkName} - Chain ${model.mission.chainId}` }),
        el("h1", { text: "First mock vault deposit" }),
        el("p", {
          className: "lead",
          text: "Review the signed manifest, inspect the completed wallet actions, then view the verifier-matched receipt."
        }),
        el("div", { className: "hero-actions" }, [
          el("a", { className: "primary-link", href: model.receipt.decisionExplorerUrl ?? "#", text: "Decision tx" }),
          el("a", { className: "secondary-link", href: model.receipt.depositExplorerUrl ?? "#", text: "Deposit tx" }),
          el("a", { className: "secondary-link", href: "/partner", text: "Partner console" })
        ])
      ]),
      el("div", { className: "hero-status" }, [
        el("span", { className: "status-pill", text: model.receipt.ready ? "Verifier matched" : "Verifier pending" }),
        el("span", { className: "mono hash-xl", text: shortHash(model.receipt.receiptHash) })
      ])
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "summary-grid" }, [
        el("section", { className: "panel" }, [
          el("div", { className: "panel-heading" }, [el("p", { className: "eyebrow", text: "Mission" }), el("h2", { text: model.mission.missionId })]),
          field("Campaign", model.mission.campaignId),
          field("Wallet", model.readiness.wallet),
          field("Network", `${model.readiness.network} - observed ${model.networkGate.observedChainId} - required ${model.networkGate.requiredChainId}`),
          field("Execution gate", model.networkGate.message),
          field("Verified state", `${model.readiness.verifiedState.state} - read-only - guest path open`)
        ]),
        el("section", { className: "panel" }, [
          el("div", { className: "panel-heading" }, [el("p", { className: "eyebrow", text: "Manifest" }), el("h2", { text: model.mission.actionType })]),
          field("Target", model.manifest.target),
          field("Selector", model.manifest.selector),
          field("Asset", model.manifest.asset),
          field("Amount", model.manifest.amountBaseUnits),
          field("Spender", model.manifest.spender),
          field("Max allowance", model.manifest.maxAllowanceBaseUnits),
          field("Intent hash", model.manifest.intentHash)
        ])
      ])
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "Deployed GIWA Sepolia addresses" }),
        el("h2", { text: "Contracts used by this run" })
      ]),
      el(
        "div",
        { className: "address-grid" },
        model.deployedAddresses.map((item) => el("section", { className: "panel" }, [field(item.label, item.address, item.explorerUrl)]))
      )
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "Guided steps" }),
        el("h2", { text: "Review, execute, verify, receipt" })
      ]),
      renderStatusRail(model),
      renderActions(model),
      renderReceipt(model, routeAllowed)
    ]),
    el("section", { className: "band" }, [
      el("div", { className: "section-heading" }, [
        el("p", { className: "eyebrow", text: "Run events" }),
        el("h2", { text: "Captured for this fixture source" })
      ]),
      el(
        "div",
        { className: "event-list" },
        model.runEvents.map((event) =>
          el("div", { className: "event-row" }, [
            el("span", { text: event.name }),
            el("span", { className: "mono", text: event.timestamp })
          ])
        )
      ),
      el("p", { className: "notice", text: `${model.receipt.safetyNotice} Flashblocks is fast feedback only, not final completion.` })
    ])
  );
}

async function main() {
  try {
    const response = await fetch("/flow-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`flow-data ${response.status}`);
    render(await response.json());
  } catch (error) {
    app.textContent = "";
    app.append(
      el("section", { className: "loading-panel" }, [
        el("p", { className: "eyebrow", text: "Load error" }),
        el("h1", { text: "Guided action data unavailable" }),
        el("p", { className: "muted", text: error instanceof Error ? error.message : "Unknown error" })
      ])
    );
  }
}

await main();

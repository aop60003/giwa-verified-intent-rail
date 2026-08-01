(function installProtocolDossier(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = Object.freeze({
    "check": [
      ["path", { d: "m9 12 2 2 4-4" }],
      ["path", { d: "M21 12a9 9 0 1 1-5.3-8.2" }]
    ],
    "clock-3": [
      ["circle", { cx: "12", cy: "12", r: "9" }],
      ["path", { d: "M12 7v5h3" }]
    ],
    "triangle-alert": [
      [
        "path",
        {
          d: "m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"
        }
      ],
      ["path", { d: "M12 9v4" }],
      ["path", { d: "M12 17h.01" }]
    ],
    "chevron-down": [["path", { d: "m6 9 6 6 6-6" }]],
    "wallet": [
      [
        "path",
        {
          d: "M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6"
        }
      ],
      ["path", { d: "M16 13h2" }]
    ],
    "external-link": [
      ["path", { d: "M15 3h6v6" }],
      ["path", { d: "M10 14 21 3" }],
      [
        "path",
        { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }
      ]
    ]
  });

  function createLineIcon(documentRef, name, options = {}) {
    if (!Object.prototype.hasOwnProperty.call(ICONS, name)) {
      throw new Error(`unknown_protocol_icon:${name}`);
    }
    const svg = documentRef.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(options.size ?? 18));
    svg.setAttribute("height", String(options.size ?? 18));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("protocol-line-icon");
    if (options.label) {
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", options.label);
    } else {
      svg.setAttribute("aria-hidden", "true");
    }
    for (const [tag, attributes] of ICONS[name]) {
      const child = documentRef.createElementNS(SVG_NS, tag);
      for (const [key, value] of Object.entries(attributes)) {
        child.setAttribute(key, value);
      }
      svg.append(child);
    }
    return svg;
  }

  function element(documentRef, tag, className, text) {
    const node = documentRef.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createHeader(documentRef, options) {
    const activeView = options?.activeView ?? "mission";
    const header = element(
      documentRef,
      "header",
      `protocol-product-bar protocol-dossier-shell protocol-product-bar-${activeView}`
    );
    const brand = element(
      documentRef,
      "a",
      "protocol-brand",
      "GIWA Verified Intent Rail"
    );
    brand.href = "/";

    const journey = element(documentRef, "ol", "protocol-view-nav");
    journey.setAttribute("aria-label", "검증 여정");
    const steps = [
      ["mission", "조건 확인"],
      ["execution", "지갑 실행"],
      ["receipt", "결과 공개"]
    ];
    for (const [id, label] of steps) {
      const item = element(
        documentRef,
        "li",
        id === activeView ? "is-active" : "",
        label
      );
      if (id === activeView) item.setAttribute("aria-current", "step");
      journey.append(item);
    }

    const destinations = element(documentRef, "nav", "protocol-destinations");
    destinations.setAttribute("aria-label", "공개 증거 화면");
    for (const [href, label, id] of [
      ["/studio", "Studio", "studio"],
      ["/partner", "Campaign", "campaign"],
      ["/evidence", "Proof", "proof"]
    ]) {
      const link = element(documentRef, "a", "protocol-destination", label);
      link.href = href;
      if (id === activeView) link.setAttribute("aria-current", "page");
      destinations.append(link);
    }

    const meta = element(documentRef, "div", "protocol-bar-meta");
    meta.append(
      element(
        documentRef,
        "span",
        "protocol-network",
        "GIWA Sepolia · Testnet"
      ),
      element(
        documentRef,
        "span",
        "protocol-wallet",
        options?.walletLabel ?? "지갑 미연결"
      )
    );

    header.append(brand, journey, destinations, meta);
    return header;
  }

  global.GiwaProtocolDossier = Object.freeze({
    createHeader,
    createLineIcon
  });
})(globalThis);

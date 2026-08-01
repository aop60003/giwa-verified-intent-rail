const app = document.querySelector("#app");

function opensInNewTab(href) {
  const value = String(href);
  return !value.startsWith("/") && !value.startsWith("#");
}

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (value === null || value === undefined) continue;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "href") {
      node.setAttribute("href", value);
      if (opensInNewTab(value)) {
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
    source: {
      mode: "fresh-live"
    },
    manifest: {
      wallet: payload.wallet.toLowerCase(),
      actionType: payload.actionType,
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

async function fetchLiveReceiptModel(routeHash, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`/api/receipts/${routeHash}`, { cache: "no-store" });
    if (!response.ok) return null;
    return projectLiveReceiptModel(await response.json(), routeHash);
  } catch {
    return null;
  }
}

function projectPublicCampaignStudio(body) {
  const hash = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value);
  const wallet = (value) =>
    typeof value === "string" && /^0x[0-9a-f]{6}…[0-9a-f]{4}$/u.test(value);
  const safeCount = (value) => Number.isSafeInteger(value) && value >= 0;
  const object = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const timestamp = (value) => {
    if (typeof value !== "string") return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
  };
  const mismatchCodes = new Set([
    "SIGNER_MISMATCH",
    "INTENT_HASH_MISMATCH",
    "VERIFYING_CONTRACT_MISMATCH",
    "TARGET_MISMATCH",
    "SELECTOR_MISMATCH",
    "ASSET_MISMATCH",
    "AMOUNT_MISMATCH",
    "SPENDER_MISMATCH",
    "ALLOWANCE_EXCEEDED",
    "TX_FAILED",
    "EXPIRED",
    "MISSING_REQUIRED_LOG",
    "UNDER_CONFIRMED",
    "WRONG_CHAIN"
  ]);
  const funnelIds = new Set([
    "campaignVisited",
    "walletConnected",
    "manifestIssued",
    "depositSubmitted",
    "depositConfirmed",
    "verifierChecking",
    "matched",
    "receiptIssued"
  ]);
  if (
    !object(body) ||
    body.screenKind !== "public-campaign-studio" ||
    body.source !== "live" ||
    !timestamp(body.generatedAt) ||
    !object(body.eventCapture) ||
    !object(body.campaign) ||
    !Array.isArray(body.funnel) ||
    !object(body.approvalPaths) ||
    !object(body.kpis) ||
    !object(body.negativeControl) ||
    !Array.isArray(body.mismatchBreakdown) ||
    !Array.isArray(body.receipts)
  ) {
    return null;
  }
  if (
    !["captured", "unavailable"].includes(body.eventCapture.status) ||
    body.eventCapture.generatedAt !== body.generatedAt
  ) {
    return null;
  }
  const negativeControl = body.negativeControl;
  if (
    Object.keys(negativeControl).length !== 6 ||
    negativeControl.label !== "Recorded negative control" ||
    negativeControl.scenario !== "TARGET_MISMATCH" ||
    negativeControl.scope !== "controlled-demo-scenario" ||
    negativeControl.receiptIssued !== false ||
    negativeControl.publicReceiptAvailable !== false ||
    negativeControl.path !== "/giwa-demo?example=mismatch"
  ) {
    return null;
  }
  const campaign = body.campaign;
  if (
    typeof campaign.campaignId !== "string" ||
    typeof campaign.missionId !== "string" ||
    campaign.networkName !== "GIWA Sepolia" ||
    campaign.actionName !== "Mock USDC deposit" ||
    campaign.policyVersion !== null ||
    campaign.policyStatus !== "fixed-unversioned" ||
    campaign.managedMode !== true ||
    campaign.testnetOnly !== true
  ) {
    return null;
  }
  const funnel = body.funnel.map((step) => {
    if (
      !object(step) ||
      !funnelIds.has(step.id) ||
      typeof step.label !== "string" ||
      !(
        (step.count === null && step.capture === "not-captured") ||
        (safeCount(step.count) &&
          (step.capture === "captured" || step.capture === "derived"))
      )
    ) {
      return null;
    }
    return {
      id: step.id,
      label: step.label,
      count: step.count,
      capture: step.capture
    };
  });
  if (funnel.some((step) => step === null)) return null;
  const approvalPaths = body.approvalPaths;
  if (
    !object(approvalPaths) ||
    !Number.isSafeInteger(approvalPaths?.exactApprovalSubmitted) ||
    approvalPaths.exactApprovalSubmitted < 0 ||
    !Number.isSafeInteger(approvalPaths?.exactApprovalConfirmed) ||
    approvalPaths.exactApprovalConfirmed < 0 ||
    !Number.isSafeInteger(approvalPaths?.approvalNotRequired) ||
    approvalPaths.approvalNotRequired < 0 ||
    !Number.isSafeInteger(approvalPaths?.depositSubmitted) ||
    approvalPaths.depositSubmitted < 0 ||
    approvalPaths.exactApprovalConfirmed >
      approvalPaths.exactApprovalSubmitted ||
    approvalPaths.exactApprovalSubmitted +
        approvalPaths.approvalNotRequired !==
      approvalPaths.depositSubmitted ||
    approvalPaths.depositSubmitted !== body.kpis.submittedDepositCount
  ) {
    return null;
  }
  const kpis = body.kpis;
  const matchedRate = kpis.matchedRate;
  const matchedPercent =
    safeCount(kpis.submittedDepositCount) &&
    safeCount(kpis.matchedReceiptCount) &&
    kpis.submittedDepositCount > 0
      ? (kpis.matchedReceiptCount / kpis.submittedDepositCount) * 100
      : 0;
  const expectedMatchedDisplayRate = `${
    Number.isInteger(matchedPercent)
      ? matchedPercent
      : matchedPercent.toFixed(1)
  }%`;
  if (
    (body.eventCapture.status === "captured"
      ? !safeCount(kpis.uniqueCampaignVisitorCount) ||
        !safeCount(kpis.uniqueWalletConnectSessionCount)
      : kpis.uniqueCampaignVisitorCount !== null ||
        kpis.uniqueWalletConnectSessionCount !== null) ||
    !safeCount(kpis.submittedDepositCount) ||
    !safeCount(kpis.matchedReceiptCount) ||
    kpis.matchedReceiptCount > kpis.submittedDepositCount ||
    !safeCount(kpis.uniqueParticipantCount) ||
    !safeCount(kpis.repeatActivatorCount) ||
    !safeCount(kpis.repeatActivationCount) ||
    !object(matchedRate) ||
    matchedRate.numerator !== kpis.matchedReceiptCount ||
    matchedRate.denominator !== kpis.submittedDepositCount ||
    typeof matchedRate.displayRate !== "string" ||
    !/^(?:0|[1-9][0-9]?(?:\.[0-9])?|100)%$/u.test(
      matchedRate.displayRate
    ) ||
    matchedRate.displayRate !== expectedMatchedDisplayRate ||
    matchedRate.definition !== "Matched Receipts / submitted deposits" ||
    kpis.uniqueParticipantCount > kpis.submittedDepositCount ||
    kpis.repeatActivatorCount > kpis.uniqueParticipantCount ||
    kpis.repeatActivatorCount > kpis.repeatActivationCount ||
    kpis.repeatActivationCount >
      Math.max(0, kpis.matchedReceiptCount - kpis.repeatActivatorCount)
  ) {
    return null;
  }
  const mismatchBreakdown = body.mismatchBreakdown.map((row) => {
    if (
      !object(row) ||
      typeof row.code !== "string" ||
      !mismatchCodes.has(row.code) ||
      typeof row.label !== "string" ||
      !safeCount(row.count)
    ) {
      return null;
    }
    return { code: row.code, label: row.label, count: row.count };
  });
  if (
    mismatchBreakdown.some((row) => row === null) ||
    mismatchBreakdown.length > mismatchCodes.size
  ) {
    return null;
  }
  const receipts = body.receipts.map((row) => {
    if (
      !object(row) ||
      row.source !== "live" ||
      !wallet(row.walletLabel) ||
      !hash(row.receiptHash) ||
      !hash(row.intentHash) ||
      !hash(row.depositTxHash) ||
      !hash(row.verifierInputHash) ||
      row.receiptPath !== `/receipt/${row.receiptHash}` ||
      row.participantReceiptPath !== `/user/receipt/${row.receiptHash}` ||
      row.explorerUrl !==
        `https://sepolia-explorer.giwa.io/tx/${row.depositTxHash}` ||
      typeof row.updatedAt !== "string"
    ) {
      return null;
    }
    return {
      source: "live",
      walletLabel: row.walletLabel,
      receiptHash: row.receiptHash.toLowerCase(),
      intentHash: row.intentHash.toLowerCase(),
      depositTxHash: row.depositTxHash.toLowerCase(),
      verifierInputHash: row.verifierInputHash.toLowerCase(),
      receiptPath: row.receiptPath,
      participantReceiptPath: row.participantReceiptPath,
      explorerUrl: row.explorerUrl,
      updatedAt: row.updatedAt
    };
  });
  if (receipts.some((row) => row === null) || receipts.length > 20) return null;
  return {
    screenKind: "public-campaign-studio",
    source: "live",
    generatedAt: body.generatedAt,
    eventCapture: {
      status: body.eventCapture.status,
      generatedAt: body.eventCapture.generatedAt
    },
    campaign: {
      campaignId: campaign.campaignId,
      missionId: campaign.missionId,
      networkName: "GIWA Sepolia",
      actionName: "Mock USDC deposit",
      policyVersion: null,
      policyStatus: "fixed-unversioned",
      managedMode: true,
      testnetOnly: true
    },
    funnel,
    approvalPaths: {
      exactApprovalSubmitted: approvalPaths.exactApprovalSubmitted,
      exactApprovalConfirmed: approvalPaths.exactApprovalConfirmed,
      approvalNotRequired: approvalPaths.approvalNotRequired,
      depositSubmitted: approvalPaths.depositSubmitted
    },
    kpis: {
      uniqueCampaignVisitorCount: kpis.uniqueCampaignVisitorCount,
      uniqueWalletConnectSessionCount: kpis.uniqueWalletConnectSessionCount,
      submittedDepositCount: kpis.submittedDepositCount,
      matchedReceiptCount: kpis.matchedReceiptCount,
      matchedRate: {
        numerator: matchedRate.numerator,
        denominator: matchedRate.denominator,
        displayRate: matchedRate.displayRate,
        definition: "Matched Receipts / submitted deposits"
      },
      uniqueParticipantCount: kpis.uniqueParticipantCount,
      repeatActivatorCount: kpis.repeatActivatorCount,
      repeatActivationCount: kpis.repeatActivationCount
    },
    negativeControl: {
      label: "Recorded negative control",
      scenario: "TARGET_MISMATCH",
      scope: "controlled-demo-scenario",
      receiptIssued: false,
      publicReceiptAvailable: false,
      path: "/giwa-demo?example=mismatch"
    },
    mismatchBreakdown,
    receipts
  };
}

function keccak256Utf8(value) {
  const mask = (1n << 64n) - 1n;
  const rotations = [
    0, 1, 62, 28, 27,
    36, 44, 6, 55, 20,
    3, 10, 43, 25, 39,
    41, 45, 15, 21, 8,
    18, 2, 61, 56, 14
  ];
  const constants = [
    0x0000000000000001n, 0x0000000000008082n,
    0x800000000000808an, 0x8000000080008000n,
    0x000000000000808bn, 0x0000000080000001n,
    0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008an, 0x0000000000000088n,
    0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn,
    0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n,
    0x000000000000800an, 0x800000008000000an,
    0x8000000080008081n, 0x8000000000008080n,
    0x0000000080000001n, 0x8000000080008008n
  ];
  const rotate = (lane, count) => {
    const shift = BigInt(count);
    return shift === 0n
      ? lane & mask
      : ((lane << shift) | (lane >> (64n - shift))) & mask;
  };
  const permute = (state) => {
    for (const roundConstant of constants) {
      const column = Array(5).fill(0n);
      const delta = Array(5).fill(0n);
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          column[x] ^= state[x + 5 * y];
        }
      }
      for (let x = 0; x < 5; x += 1) {
        delta[x] =
          column[(x + 4) % 5] ^ rotate(column[(x + 1) % 5], 1);
      }
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          state[x + 5 * y] =
            (state[x + 5 * y] ^ delta[x]) & mask;
        }
      }
      const shifted = Array(25).fill(0n);
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          shifted[y + 5 * ((2 * x + 3 * y) % 5)] = rotate(
            state[x + 5 * y],
            rotations[x + 5 * y]
          );
        }
      }
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          state[x + 5 * y] =
            (shifted[x + 5 * y] ^
              ((~shifted[((x + 1) % 5) + 5 * y]) &
                shifted[((x + 2) % 5) + 5 * y])) &
            mask;
        }
      }
      state[0] = (state[0] ^ roundConstant) & mask;
    }
  };

  const rate = 136;
  const input = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((input.length + 1) / rate) * rate;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x01;
  padded[padded.length - 1] |= 0x80;
  const state = Array(25).fill(0n);
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let index = 0; index < rate; index += 1) {
      state[Math.floor(index / 8)] ^=
        BigInt(padded[offset + index]) << BigInt((index % 8) * 8);
    }
    permute(state);
  }
  const output = [];
  for (let index = 0; index < 32; index += 1) {
    output.push(
      Number(
        (state[Math.floor(index / 8)] >> BigInt((index % 8) * 8)) & 0xffn
      )
    );
  }
  return `0x${output.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function normalizePublicVerificationResponse(body, expectedHash) {
  const object = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const exactKeys = (value, required, optional = []) => {
    if (!object(value)) return false;
    const allowed = new Set([...required, ...optional]);
    const keys = Object.keys(value);
    return (
      required.every((key) =>
        Object.prototype.hasOwnProperty.call(value, key)
      ) && keys.every((key) => allowed.has(key))
    );
  };
  const hash = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value)
      ? value.toLowerCase()
      : null;
  const address = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value)
      ? value.toLowerCase()
      : null;
  const selector = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{8}$/u.test(value)
      ? value.toLowerCase()
      : null;
  const signature = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{130}$/u.test(value)
      ? value.toLowerCase()
      : null;
  const version = (value) =>
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value)
      ? value
      : null;
  const text = (value) =>
    typeof value === "string" && value.trim() === value && value.length > 0
      ? value
      : null;
  const units = (value) =>
    typeof value === "string" && /^(?:0|[1-9][0-9]*)$/u.test(value)
      ? value
      : null;
  const integer = (value, positive = false) =>
    Number.isSafeInteger(value) && value >= (positive ? 1 : 0)
      ? value
      : null;
  const timestamp = (value) => {
    if (typeof value !== "string") return null;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
      ? value
      : null;
  };
  const utf8Hex = (value) =>
    `0x${Array.from(new TextEncoder().encode(value))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;
  const hasForbiddenKey = (value, seen = new WeakSet()) => {
    if (value === null || typeof value !== "object") return false;
    if (seen.has(value)) return true;
    seen.add(value);
    if (Array.isArray(value)) {
      return value.some((entry) => hasForbiddenKey(entry, seen));
    }
    return Object.entries(value).some(([key, entry]) => {
      const normalized = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
      return (
        normalized.includes("runid") ||
        normalized.includes("capability") ||
        normalized.includes("runaccess") ||
        normalized.includes("session") ||
        normalized.includes("credential") ||
        normalized.includes("private") ||
        normalized.includes("visibility") ||
        normalized.includes("secret") ||
        normalized.includes("token") ||
        normalized.includes("author" + "ization") ||
        normalized.includes("headers") ||
        normalized.includes("database") ||
        normalized.includes("dbkey") ||
        normalized === "env" ||
        normalized.startsWith("environment") ||
        hasForbiddenKey(entry, seen)
      );
    });
  };
  const canonicalSection = (section, payload, sectionKeys) => {
    if (!exactKeys(section, sectionKeys)) return null;
    const canonicalPayload = JSON.stringify(payload);
    if (
      section.canonicalPayload !== canonicalPayload ||
      typeof section.canonicalPayloadBytesHex !== "string" ||
      section.canonicalPayloadBytesHex.toLowerCase() !==
        utf8Hex(canonicalPayload)
    ) {
      return null;
    }
    return {
      canonicalPayload,
      canonicalPayloadBytesHex: utf8Hex(canonicalPayload)
    };
  };
  if (hasForbiddenKey(body)) return null;

  const topKeys = [
    "screenKind", "source", "queryKind", "campaignId", "missionId",
    "policyVersion", "policyStatus", "networkName", "walletLabel",
    "receiptHash", "intentHash", "depositTxHash", "verifierInputHash",
    "blockNumber", "blockHash", "confirmationDepth", "receiptPath",
    "participantReceiptPath", "explorerUrl", "testnetNotice", "bundle"
  ];
  if (
    !exactKeys(body, topKeys) ||
    body.screenKind !== "public-matched-proof" ||
    body.source !== "live" ||
    !["receipt", "intent", "depositTx"].includes(body.queryKind) ||
    body.policyVersion !== null ||
    body.policyStatus !== "fixed-unversioned" ||
    body.networkName !== "GIWA Sepolia" ||
    !/^0x[0-9a-f]{6}…[0-9a-f]{4}$/u.test(body.walletLabel ?? "")
  ) {
    return null;
  }
  const topReceiptHash = hash(body.receiptHash);
  const topIntentHash = hash(body.intentHash);
  const topDepositTxHash = hash(body.depositTxHash);
  const topVerifierInputHash = hash(body.verifierInputHash);
  const topBlockHash = hash(body.blockHash);
  const normalizedExpectedHash = hash(expectedHash);
  if (
    topReceiptHash === null ||
    topIntentHash === null ||
    topDepositTxHash === null ||
    topVerifierInputHash === null ||
    topBlockHash === null ||
    normalizedExpectedHash === null ||
    integer(body.blockNumber) === null ||
    integer(body.confirmationDepth, true) === null
  ) {
    return null;
  }

  const bundle = body.bundle;
  if (
    !exactKeys(bundle, [
      "schemaVersion", "source", "generatedAt", "identity", "manifest",
      "verifierInput", "verification", "decodedLogs", "receipt", "replay",
      "notice"
    ]) ||
    bundle.schemaVersion !== "1" ||
    bundle.source !== "live" ||
    timestamp(bundle.generatedAt) === null ||
    bundle.notice !==
      "GIWA Sepolia testnet · Mock assets only · No settlement or finality claim"
  ) {
    return null;
  }
  if (
    !exactKeys(bundle.identity, [
      "receiptHash", "intentHash", "depositTxHash"
    ])
  ) {
    return null;
  }
  const receiptHash = hash(bundle.identity.receiptHash);
  const intentHash = hash(bundle.identity.intentHash);
  const depositTxHash = hash(bundle.identity.depositTxHash);
  if (
    receiptHash !== topReceiptHash ||
    intentHash !== topIntentHash ||
    depositTxHash !== topDepositTxHash
  ) {
    return null;
  }

  const manifestSection = bundle.manifest;
  if (
    !exactKeys(manifestSection, [
      "payload", "canonicalPayload", "canonicalPayloadBytesHex", "signature",
      "signingDomain", "recoveredSigner"
    ]) ||
    !exactKeys(
      manifestSection.payload,
      [
        "manifestVersion", "chainId", "nonce", "expiryUnix", "campaignId",
        "missionId", "wallet", "actionType", "target", "selector", "asset",
        "amountBaseUnits", "spender", "maxAllowanceBaseUnits"
      ],
      ["referralCode"]
    )
  ) {
    return null;
  }
  const rawManifest = manifestSection.payload;
  const manifest = {
    manifestVersion: rawManifest.manifestVersion,
    chainId: rawManifest.chainId,
    nonce: text(rawManifest.nonce),
    expiryUnix: integer(rawManifest.expiryUnix, true),
    campaignId: text(rawManifest.campaignId),
    missionId: text(rawManifest.missionId),
    wallet: address(rawManifest.wallet),
    actionType: rawManifest.actionType,
    target: address(rawManifest.target),
    selector: selector(rawManifest.selector),
    asset: address(rawManifest.asset),
    amountBaseUnits: units(rawManifest.amountBaseUnits),
    spender: address(rawManifest.spender),
    maxAllowanceBaseUnits: units(rawManifest.maxAllowanceBaseUnits),
    ...(rawManifest.referralCode === undefined
      ? {}
      : { referralCode: text(rawManifest.referralCode) })
  };
  if (
    manifest.manifestVersion !== "1" ||
    manifest.chainId !== 91342 ||
    manifest.actionType !== "mockVaultDeposit" ||
    Object.values(manifest).some((value) => value === null)
  ) {
    return null;
  }
  const manifestCanonical = canonicalSection(
    manifestSection,
    manifest,
    [
      "payload", "canonicalPayload", "canonicalPayloadBytesHex", "signature",
      "signingDomain", "recoveredSigner"
    ]
  );
  if (
    manifestCanonical === null ||
    keccak256Utf8(manifestCanonical.canonicalPayload) !== intentHash ||
    signature(manifestSection.signature) === null ||
    address(manifestSection.recoveredSigner) === null ||
    !exactKeys(manifestSection.signingDomain, [
      "name", "version", "chainId", "verifyingContract"
    ]) ||
    manifestSection.signingDomain.name !== "GIWA Verified Intent Rail" ||
    manifestSection.signingDomain.version !== "1" ||
    manifestSection.signingDomain.chainId !== 91342 ||
    address(manifestSection.signingDomain.verifyingContract) === null
  ) {
    return null;
  }

  const verifierSection = bundle.verifierInput;
  if (
    !exactKeys(verifierSection, [
      "payload", "canonicalPayload", "canonicalPayloadBytesHex",
      "verifierInputHash", "verifierVersion"
    ]) ||
    !exactKeys(verifierSection.payload, [
      "schemaVersion", "chainId", "intentHash", "depositTxHash",
      "depositTransactionSnapshotHash", "depositReceiptSnapshotHash",
      "decodedLogSnapshotHash", "confirmationDepth",
      "headBlockNumberAtVerification", "verifierVersion"
    ])
  ) {
    return null;
  }
  const rawVerifier = verifierSection.payload;
  const verifierInput = {
    schemaVersion: rawVerifier.schemaVersion,
    chainId: rawVerifier.chainId,
    intentHash: hash(rawVerifier.intentHash),
    depositTxHash: hash(rawVerifier.depositTxHash),
    depositTransactionSnapshotHash:
      hash(rawVerifier.depositTransactionSnapshotHash),
    depositReceiptSnapshotHash: hash(rawVerifier.depositReceiptSnapshotHash),
    decodedLogSnapshotHash: hash(rawVerifier.decodedLogSnapshotHash),
    confirmationDepth: integer(rawVerifier.confirmationDepth),
    headBlockNumberAtVerification:
      integer(rawVerifier.headBlockNumberAtVerification, true),
    verifierVersion: version(rawVerifier.verifierVersion)
  };
  const verifierCanonical = canonicalSection(
    verifierSection,
    verifierInput,
    [
      "payload", "canonicalPayload", "canonicalPayloadBytesHex",
      "verifierInputHash", "verifierVersion"
    ]
  );
  const verifierInputHash = hash(verifierSection.verifierInputHash);
  if (
    verifierInput.schemaVersion !== "1" ||
    verifierInput.chainId !== 91342 ||
    Object.values(verifierInput).some((value) => value === null) ||
    verifierCanonical === null ||
    verifierInputHash !== topVerifierInputHash ||
    keccak256Utf8(verifierCanonical.canonicalPayload) !== verifierInputHash ||
    version(verifierSection.verifierVersion) !==
      verifierInput.verifierVersion
  ) {
    return null;
  }

  if (!Array.isArray(bundle.decodedLogs) || bundle.decodedLogs.length > 20) {
    return null;
  }
  const decodedLogs = [];
  for (const rawLog of bundle.decodedLogs) {
    if (
      !exactKeys(
        rawLog,
        [
          "eventName", "contractAddress", "logIndex", "sourceTxHash",
          "blockNumber", "blockHash", "args"
        ],
        ["topics"]
      ) ||
      !["Approval", "Transfer", "MockDeposit"].includes(rawLog.eventName)
    ) {
      return null;
    }
    const argsKeys =
      rawLog.eventName === "Approval"
        ? ["owner", "spender", "amount"]
        : rawLog.eventName === "Transfer"
          ? ["from", "to", "amount"]
          : ["wallet", "asset", "amount"];
    if (!exactKeys(rawLog.args, argsKeys)) return null;
    const args =
      rawLog.eventName === "Approval"
        ? {
            owner: address(rawLog.args.owner),
            spender: address(rawLog.args.spender),
            amount: units(rawLog.args.amount)
          }
        : rawLog.eventName === "Transfer"
          ? {
              from: address(rawLog.args.from),
              to: address(rawLog.args.to),
              amount: units(rawLog.args.amount)
            }
          : {
              wallet: address(rawLog.args.wallet),
              asset: address(rawLog.args.asset),
              amount: units(rawLog.args.amount)
            };
    const topics =
      rawLog.topics === undefined
        ? undefined
        : Array.isArray(rawLog.topics)
          ? rawLog.topics.map(hash)
          : null;
    const log = {
      eventName: rawLog.eventName,
      contractAddress: address(rawLog.contractAddress),
      logIndex: integer(rawLog.logIndex),
      sourceTxHash: hash(rawLog.sourceTxHash),
      blockNumber: integer(rawLog.blockNumber),
      blockHash: hash(rawLog.blockHash),
      args,
      ...(topics === undefined ? {} : { topics })
    };
    if (
      Object.values(log).some((value) => value === null) ||
      Object.values(args).some((value) => value === null) ||
      (Array.isArray(topics) && topics.some((topic) => topic === null))
    ) {
      return null;
    }
    decodedLogs.push(log);
  }

  const receiptSection = bundle.receipt;
  if (
    !exactKeys(receiptSection, [
      "payload", "canonicalPayload", "canonicalPayloadBytesHex", "receiptHash",
      "schemaVersion", "verifierVersion"
    ]) ||
    !exactKeys(
      receiptSection.payload,
      [
        "schemaVersion", "verifierVersion", "intentHash", "chainId",
        "networkName", "status", "actionType", "asset", "amountBaseUnits",
        "target", "spender", "maxAllowanceBaseUnits",
        "allowanceUsedBaseUnits", "approvalRequired", "approveTxHash",
        "depositTxHash", "depositBlockNumber", "depositBlockHash",
        "campaignId", "missionId", "wallet", "verifiedState",
        "testnetDepositAmountDelta", "issuedAt", "issuer", "safetyNotice"
      ],
      ["verifiedProvider"]
    )
  ) {
    return null;
  }
  const rawReceipt = receiptSection.payload;
  const receipt = {
    schemaVersion: rawReceipt.schemaVersion,
    verifierVersion: version(rawReceipt.verifierVersion),
    intentHash: hash(rawReceipt.intentHash),
    chainId: rawReceipt.chainId,
    networkName: rawReceipt.networkName,
    status: rawReceipt.status,
    actionType: rawReceipt.actionType,
    asset: address(rawReceipt.asset),
    amountBaseUnits: units(rawReceipt.amountBaseUnits),
    target: address(rawReceipt.target),
    spender: address(rawReceipt.spender),
    maxAllowanceBaseUnits: units(rawReceipt.maxAllowanceBaseUnits),
    allowanceUsedBaseUnits: units(rawReceipt.allowanceUsedBaseUnits),
    approvalRequired: rawReceipt.approvalRequired,
    approveTxHash:
      rawReceipt.approveTxHash === null ? null : hash(rawReceipt.approveTxHash),
    depositTxHash: hash(rawReceipt.depositTxHash),
    depositBlockNumber: integer(rawReceipt.depositBlockNumber, true),
    depositBlockHash: hash(rawReceipt.depositBlockHash),
    campaignId: text(rawReceipt.campaignId),
    missionId: text(rawReceipt.missionId),
    wallet: address(rawReceipt.wallet),
    verifiedState: rawReceipt.verifiedState,
    ...(rawReceipt.verifiedProvider === undefined
      ? {}
      : { verifiedProvider: rawReceipt.verifiedProvider }),
    testnetDepositAmountDelta: units(rawReceipt.testnetDepositAmountDelta),
    issuedAt: integer(rawReceipt.issuedAt, true),
    issuer: rawReceipt.issuer,
    safetyNotice: rawReceipt.safetyNotice
  };
  if (
    receipt.schemaVersion !== "1" ||
    receipt.chainId !== 91342 ||
    receipt.networkName !== "GIWA Sepolia" ||
    receipt.status !== "matched" ||
    receipt.actionType !== "mockVaultDeposit" ||
    typeof receipt.approvalRequired !== "boolean" ||
    !["verified", "guest", "unavailable"].includes(receipt.verifiedState) ||
    (receipt.verifiedProvider !== undefined &&
      !["Dojang", "up.id"].includes(receipt.verifiedProvider)) ||
    receipt.issuer !== "GIWA Verified Intent Rail MVP" ||
    receipt.safetyNotice !==
      "Testnet-only. No real asset, no yield, no RWA claim." ||
    Object.entries(receipt).some(
      ([key, value]) => key !== "approveTxHash" && value === null
    )
  ) {
    return null;
  }
  const receiptCanonical = canonicalSection(
    receiptSection,
    receipt,
    [
      "payload", "canonicalPayload", "canonicalPayloadBytesHex", "receiptHash",
      "schemaVersion", "verifierVersion"
    ]
  );
  if (
    receiptCanonical === null ||
    hash(receiptSection.receiptHash) !== receiptHash ||
    keccak256Utf8(receiptCanonical.canonicalPayload) !== receiptHash ||
    receiptSection.schemaVersion !== "1" ||
    version(receiptSection.verifierVersion) !== receipt.verifierVersion
  ) {
    return null;
  }

  const verification = bundle.verification;
  if (
    !exactKeys(verification, [
      "depositBlockNumber", "depositBlockHash",
      "headBlockNumberAtVerification", "confirmationDepth",
      "standardRpcReceiptStatus"
    ]) ||
    integer(verification.depositBlockNumber) === null ||
    hash(verification.depositBlockHash) === null ||
    integer(verification.headBlockNumberAtVerification) === null ||
    integer(verification.confirmationDepth) === null ||
    verification.standardRpcReceiptStatus !== 1
  ) {
    return null;
  }

  const approvals = decodedLogs.filter((log) => log.eventName === "Approval");
  const transfers = decodedLogs.filter((log) => log.eventName === "Transfer");
  const deposits = decodedLogs.filter((log) => log.eventName === "MockDeposit");
  const approval = approvals[0];
  const transfer = transfers[0];
  const deposit = deposits[0];
  const crossReferences =
    manifest.campaignId === receipt.campaignId &&
    manifest.missionId === receipt.missionId &&
    manifest.wallet === receipt.wallet &&
    manifest.chainId === receipt.chainId &&
    manifest.actionType === receipt.actionType &&
    manifest.asset === receipt.asset &&
    manifest.amountBaseUnits === receipt.amountBaseUnits &&
    manifest.target === receipt.target &&
    manifest.spender === receipt.spender &&
    manifest.maxAllowanceBaseUnits === receipt.maxAllowanceBaseUnits &&
    receipt.allowanceUsedBaseUnits === receipt.amountBaseUnits &&
    receipt.testnetDepositAmountDelta === receipt.amountBaseUnits &&
    receipt.intentHash === intentHash &&
    receipt.depositTxHash === depositTxHash &&
    receipt.depositBlockNumber === verification.depositBlockNumber &&
    receipt.depositBlockHash === hash(verification.depositBlockHash) &&
    verifierInput.intentHash === intentHash &&
    verifierInput.depositTxHash === depositTxHash &&
    verifierInput.confirmationDepth === verification.confirmationDepth &&
    verifierInput.headBlockNumberAtVerification ===
      verification.headBlockNumberAtVerification &&
    receipt.verifierVersion === verifierInput.verifierVersion &&
    receipt.verifierVersion === verifierSection.verifierVersion &&
    verification.depositBlockNumber === body.blockNumber &&
    hash(verification.depositBlockHash) === topBlockHash &&
    verification.confirmationDepth === body.confirmationDepth &&
    verification.confirmationDepth ===
      Math.max(
        0,
        verification.headBlockNumberAtVerification -
          verification.depositBlockNumber +
          1
      ) &&
    keccak256Utf8(JSON.stringify(decodedLogs)) ===
      verifierInput.decodedLogSnapshotHash &&
    transfers.length === 1 &&
    deposits.length === 1 &&
    approvals.length === (receipt.approvalRequired ? 1 : 0) &&
    (receipt.approvalRequired
      ? receipt.approveTxHash !== null &&
        approval.sourceTxHash === receipt.approveTxHash &&
        approval.contractAddress === receipt.asset &&
        approval.args.owner === receipt.wallet &&
        approval.args.spender === receipt.spender &&
        approval.args.amount === receipt.maxAllowanceBaseUnits
      : receipt.approveTxHash === null) &&
    transfer.sourceTxHash === depositTxHash &&
    transfer.blockNumber === verification.depositBlockNumber &&
    transfer.blockHash === hash(verification.depositBlockHash) &&
    transfer.contractAddress === receipt.asset &&
    transfer.args.from === receipt.wallet &&
    transfer.args.to === receipt.target &&
    transfer.args.amount === receipt.amountBaseUnits &&
    deposit.sourceTxHash === depositTxHash &&
    deposit.blockNumber === verification.depositBlockNumber &&
    deposit.blockHash === hash(verification.depositBlockHash) &&
    deposit.contractAddress === receipt.target &&
    deposit.args.wallet === receipt.wallet &&
    deposit.args.asset === receipt.asset &&
    deposit.args.amount === receipt.amountBaseUnits;
  const identities = {
    receipt: receiptHash,
    intent: intentHash,
    depositTx: depositTxHash
  };
  if (
    !crossReferences ||
    identities[body.queryKind] !== normalizedExpectedHash ||
    body.campaignId !== receipt.campaignId ||
    body.missionId !== receipt.missionId ||
    body.walletLabel !==
      `${receipt.wallet.slice(0, 8)}…${receipt.wallet.slice(-4)}` ||
    body.receiptPath !== `/receipt/${receiptHash}` ||
    body.participantReceiptPath !== `/user/receipt/${receiptHash}` ||
    body.explorerUrl !==
      `https://sepolia-explorer.giwa.io/tx/${depositTxHash}` ||
    body.testnetNotice !== "GIWA Sepolia testnet · Mock assets only"
  ) {
    return null;
  }
  if (
    !exactKeys(bundle.replay, ["algorithm", "command"]) ||
    bundle.replay.algorithm !== "keccak256-canonical-json+eip712" ||
    bundle.replay.command !==
      "pnpm --filter @giwa/web evidence:replay -- <bundle.json>"
  ) {
    return null;
  }

  return {
    screenKind: "public-matched-proof",
    source: "live",
    queryKind: body.queryKind,
    campaignId: receipt.campaignId,
    missionId: receipt.missionId,
    policyVersion: null,
    policyStatus: "fixed-unversioned",
    networkName: "GIWA Sepolia",
    walletLabel: body.walletLabel,
    receiptHash,
    intentHash,
    depositTxHash,
    verifierInputHash,
    blockNumber: verification.depositBlockNumber,
    blockHash: hash(verification.depositBlockHash),
    confirmationDepth: verification.confirmationDepth,
    receiptPath: `/receipt/${receiptHash}`,
    participantReceiptPath: `/user/receipt/${receiptHash}`,
    explorerUrl: `https://sepolia-explorer.giwa.io/tx/${depositTxHash}`,
    testnetNotice: "GIWA Sepolia testnet · Mock assets only",
    bundle: {
      schemaVersion: "1",
      source: "live",
      generatedAt: bundle.generatedAt,
      identity: { receiptHash, intentHash, depositTxHash },
      manifest: {
        payload: manifest,
        ...manifestCanonical,
        signature: signature(manifestSection.signature),
        signingDomain: {
          name: "GIWA Verified Intent Rail",
          version: "1",
          chainId: 91342,
          verifyingContract:
            address(manifestSection.signingDomain.verifyingContract)
        },
        recoveredSigner: address(manifestSection.recoveredSigner)
      },
      verifierInput: {
        payload: verifierInput,
        ...verifierCanonical,
        verifierInputHash,
        verifierVersion: verifierInput.verifierVersion
      },
      verification: {
        depositBlockNumber: verification.depositBlockNumber,
        depositBlockHash: hash(verification.depositBlockHash),
        headBlockNumberAtVerification:
          verification.headBlockNumberAtVerification,
        confirmationDepth: verification.confirmationDepth,
        standardRpcReceiptStatus: 1
      },
      decodedLogs,
      receipt: {
        payload: receipt,
        ...receiptCanonical,
        receiptHash,
        schemaVersion: "1",
        verifierVersion: receipt.verifierVersion
      },
      replay: {
        algorithm: "keccak256-canonical-json+eip712",
        command: "pnpm --filter @giwa/web evidence:replay -- <bundle.json>"
      },
      notice:
        "GIWA Sepolia testnet · Mock assets only · No settlement or finality claim"
    }
  };
}

function projectPublicMatchedProof(body, expectedHash) {
  const strictBody = normalizePublicVerificationResponse(body, expectedHash);
  if (strictBody === null) return null;
  body = strictBody;
  const hash = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value);
  const address = (value) =>
    typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value);
  const bytes = (value) =>
    typeof value === "string" && /^0x(?:[a-fA-F0-9]{2})+$/u.test(value);
  const object = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const wallet = (value) =>
    typeof value === "string" && /^0x[0-9a-f]{6}…[0-9a-f]{4}$/u.test(value);
  const version = (value) =>
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(value);
  const isoTimestamp = (value) => {
    if (typeof value !== "string") return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
  };
  const forbiddenKey = (value, seen = new WeakSet()) => {
    if (value === null || typeof value !== "object") return false;
    if (seen.has(value)) return true;
    seen.add(value);
    if (Array.isArray(value)) {
      return value.some((entry) => forbiddenKey(entry, seen));
    }
    return Object.entries(value).some(([key, entry]) => {
      const normalized = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
      return (
        normalized.includes("runid") ||
        normalized.includes("capability") ||
        normalized.includes("session") ||
        normalized.includes("credential") ||
        normalized.includes("private" + "key") ||
        normalized.includes("headers") ||
        normalized.includes("privateerror") ||
        normalized.includes("databasekey") ||
        normalized.includes("dbkey") ||
        normalized === "env" ||
        normalized.startsWith("environment") ||
        forbiddenKey(entry, seen)
      );
    });
  };
  const canonicalSection = (section) => {
    if (
      !object(section) ||
      !object(section.payload) ||
      typeof section.canonicalPayload !== "string" ||
      !bytes(section.canonicalPayloadBytesHex)
    ) {
      return false;
    }
    try {
      return (
        JSON.stringify(JSON.parse(section.canonicalPayload)) ===
        JSON.stringify(section.payload)
      );
    } catch {
      return false;
    }
  };
  if (
    !hash(expectedHash) ||
    !object(body) ||
    forbiddenKey(body) ||
    body.screenKind !== "public-matched-proof" ||
    body.source !== "live" ||
    !["receipt", "intent", "depositTx"].includes(body.queryKind) ||
    typeof body.campaignId !== "string" ||
    typeof body.missionId !== "string" ||
    body.policyVersion !== null ||
    body.policyStatus !== "fixed-unversioned" ||
    body.networkName !== "GIWA Sepolia" ||
    !wallet(body.walletLabel) ||
    !hash(body.receiptHash) ||
    !hash(body.intentHash) ||
    !hash(body.depositTxHash) ||
    !hash(body.verifierInputHash) ||
    !Number.isSafeInteger(body.blockNumber) ||
    body.blockNumber < 0 ||
    !hash(body.blockHash) ||
    !Number.isSafeInteger(body.confirmationDepth) ||
    body.confirmationDepth <= 0 ||
    body.receiptPath !== `/receipt/${body.receiptHash}` ||
    body.participantReceiptPath !== `/user/receipt/${body.receiptHash}` ||
    body.explorerUrl !==
      `https://sepolia-explorer.giwa.io/tx/${body.depositTxHash}` ||
    body.testnetNotice !== "GIWA Sepolia testnet · Mock assets only"
  ) {
    return null;
  }
  const identities = {
    receipt: body.receiptHash,
    intent: body.intentHash,
    depositTx: body.depositTxHash
  };
  if (identities[body.queryKind].toLowerCase() !== expectedHash.toLowerCase()) {
    return null;
  }
  const bundle = body.bundle;
  if (
    !object(bundle) ||
    bundle.schemaVersion !== "1" ||
    bundle.source !== "live" ||
    !isoTimestamp(bundle.generatedAt) ||
    !object(bundle.identity) ||
    !hash(bundle.identity.receiptHash) ||
    !hash(bundle.identity.intentHash) ||
    !hash(bundle.identity.depositTxHash) ||
    bundle.identity.receiptHash.toLowerCase() !== body.receiptHash.toLowerCase() ||
    bundle.identity.intentHash.toLowerCase() !== body.intentHash.toLowerCase() ||
    bundle.identity.depositTxHash.toLowerCase() !== body.depositTxHash.toLowerCase() ||
    !canonicalSection(bundle.manifest) ||
    !/^0x[a-fA-F0-9]{130}$/u.test(bundle.manifest.signature ?? "") ||
    !object(bundle.manifest.signingDomain) ||
    bundle.manifest.signingDomain.name !== "GIWA Verified Intent Rail" ||
    bundle.manifest.signingDomain.version !== "1" ||
    bundle.manifest.signingDomain.chainId !== 91342 ||
    !address(bundle.manifest.signingDomain.verifyingContract) ||
    !address(bundle.manifest.recoveredSigner) ||
    !canonicalSection(bundle.verifierInput) ||
    !hash(bundle.verifierInput.verifierInputHash) ||
    bundle.verifierInput.verifierInputHash.toLowerCase() !==
      body.verifierInputHash.toLowerCase() ||
    !version(bundle.verifierInput.verifierVersion) ||
    !object(bundle.verification) ||
    bundle.verification.depositBlockNumber !== body.blockNumber ||
    !hash(bundle.verification.depositBlockHash) ||
    bundle.verification.depositBlockHash.toLowerCase() !==
      body.blockHash.toLowerCase() ||
    !Number.isSafeInteger(bundle.verification.headBlockNumberAtVerification) ||
    bundle.verification.headBlockNumberAtVerification < body.blockNumber ||
    bundle.verification.confirmationDepth !== body.confirmationDepth ||
    bundle.verification.standardRpcReceiptStatus !== 1 ||
    !Array.isArray(bundle.decodedLogs) ||
    bundle.decodedLogs.length > 20 ||
    !canonicalSection(bundle.receipt) ||
    !hash(bundle.receipt.receiptHash) ||
    bundle.receipt.receiptHash.toLowerCase() !== body.receiptHash.toLowerCase() ||
    bundle.receipt.schemaVersion !== "1" ||
    !version(bundle.receipt.verifierVersion) ||
    bundle.receipt.verifierVersion !== bundle.verifierInput.verifierVersion ||
    !object(bundle.replay) ||
    bundle.replay.algorithm !== "keccak256-canonical-json+eip712" ||
    bundle.replay.command !==
      "pnpm --filter @giwa/web evidence:replay -- <bundle.json>" ||
    bundle.notice !==
      "GIWA Sepolia testnet · Mock assets only · No settlement or finality claim"
  ) {
    return null;
  }
  const allowedLogs = new Set(["Approval", "Transfer", "MockDeposit"]);
  if (
    bundle.decodedLogs.some(
      (log) =>
        !object(log) ||
        !allowedLogs.has(log.eventName) ||
        !address(log.contractAddress) ||
        !Number.isSafeInteger(log.logIndex) ||
        log.logIndex < 0 ||
        !hash(log.sourceTxHash) ||
        !Number.isSafeInteger(log.blockNumber) ||
        log.blockNumber < 0 ||
        !hash(log.blockHash) ||
        !object(log.args)
    )
  ) {
    return null;
  }
  const verifierPayload = bundle.verifierInput.payload;
  const receiptPayload = bundle.receipt.payload;
  if (
    verifierPayload.intentHash?.toLowerCase() !== body.intentHash.toLowerCase() ||
    verifierPayload.depositTxHash?.toLowerCase() !==
      body.depositTxHash.toLowerCase() ||
    receiptPayload.intentHash?.toLowerCase() !== body.intentHash.toLowerCase() ||
    receiptPayload.depositTxHash?.toLowerCase() !==
      body.depositTxHash.toLowerCase()
  ) {
    return null;
  }
  return {
    screenKind: "public-matched-proof",
    source: "live",
    queryKind: body.queryKind,
    campaignId: body.campaignId,
    missionId: body.missionId,
    policyVersion: null,
    policyStatus: "fixed-unversioned",
    networkName: "GIWA Sepolia",
    walletLabel: body.walletLabel,
    receiptHash: body.receiptHash.toLowerCase(),
    intentHash: body.intentHash.toLowerCase(),
    depositTxHash: body.depositTxHash.toLowerCase(),
    verifierInputHash: body.verifierInputHash.toLowerCase(),
    blockNumber: body.blockNumber,
    blockHash: body.blockHash.toLowerCase(),
    confirmationDepth: body.confirmationDepth,
    receiptPath: body.receiptPath,
    participantReceiptPath: body.participantReceiptPath,
    explorerUrl: body.explorerUrl,
    testnetNotice: "GIWA Sepolia testnet · Mock assets only",
    bundle: {
      schemaVersion: "1",
      source: "live",
      generatedAt: bundle.generatedAt,
      identity: {
        receiptHash: bundle.identity.receiptHash.toLowerCase(),
        intentHash: bundle.identity.intentHash.toLowerCase(),
        depositTxHash: bundle.identity.depositTxHash.toLowerCase()
      },
      manifest: bundle.manifest,
      verifierInput: bundle.verifierInput,
      verification: bundle.verification,
      decodedLogs: bundle.decodedLogs,
      receipt: bundle.receipt,
      replay: bundle.replay,
      notice: bundle.notice
    }
  };
}

async function fetchPublicCampaignStudio(fetchImpl = fetch) {
  try {
    const response = await fetchImpl("/api/public/campaign-studio", {
      cache: "no-store"
    });
    if (!response.ok) return null;
    return projectPublicCampaignStudio(await response.json());
  } catch {
    return null;
  }
}

async function fetchPublicMatchedProof(hash, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(
      `/api/public/evidence/${encodeURIComponent(hash)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    return projectPublicMatchedProof(await response.json(), hash);
  } catch {
    return null;
  }
}

function field(label, value, href) {
  return el("div", { className: "field" }, [
    el("span", { className: "field-label", text: label }),
    href
      ? el("a", { className: "mono field-value hash-wrap", href, text: shortHash(value) })
      : el("span", { className: "mono field-value hash-wrap", text: String(value ?? "pending") })
  ]);
}

function renderProtocolHeader(activeView) {
  return globalThis.GiwaProtocolDossier.createHeader(document, {
    activeView,
    walletLabel: "공개 읽기 전용"
  });
}

function disclosureSummary(text) {
  return el("summary", {}, [
    el("span", { text }),
    globalThis.GiwaProtocolDossier.createLineIcon(document, "chevron-down")
  ]);
}

function renderHashDisclosure(label, value) {
  return el("details", { className: "hash-disclosure" }, [
    el("summary", {}, [
      el("span", { text: label }),
      el("span", { className: "mono hash-visual", text: shortHash(value) }),
      globalThis.GiwaProtocolDossier.createLineIcon(document, "chevron-down")
    ]),
    el("code", { className: "mono hash-full", text: value ?? "확인 중" })
  ]);
}

function verificationBundleDownloadPath(bundle) {
  const receiptHash = bundle?.identity?.receiptHash;
  return /^0x[a-f0-9]{64}$/u.test(receiptHash ?? "")
    ? `/api/public/evidence/${receiptHash}?download=1`
    : null;
}

function verificationBundleMetadata(items) {
  return items.map(([label, value]) =>
    el("div", { className: "verification-bundle-meta-item" }, [
      el("dt", { text: label }),
      el("dd", { className: "mono hash-wrap", text: String(value) })
    ])
  );
}

function renderVerificationBundle(proof, options = {}) {
  const bundle = proof?.bundle ?? null;
  const downloadPath = verificationBundleDownloadPath(bundle);
  const explorerUrl = proof?.explorerUrl ?? null;
  const unavailable = bundle === null || downloadPath === null;
  const replayId = options.replayId ?? "copy-public-replay-command";

  if (unavailable) {
    return el("section", { className: "verification-bundle panel" }, [
      el("div", { className: "panel-heading" }, [
        el("p", { className: "eyebrow", text: "Independent verification" }),
        el("h2", { text: "검증 번들을 사용할 수 없습니다" })
      ]),
      el("p", {
        className: "muted",
        text: "완전한 공개 번들이 확인된 Matched Receipt에서만 내려받기와 재검증을 사용할 수 있습니다."
      }),
      el("div", { className: "verification-bundle-actions" }, [
        el("span", {
          className: "disabled-link",
          text: "검증 번들 JSON 받기"
        }),
        el("button", {
          type: "button",
          disabled: true,
          text: "재검증 명령 복사"
        })
      ])
    ]);
  }

  return el("section", { className: "verification-bundle" }, [
    el("div", { className: "section-heading" }, [
      el("div", {}, [
        el("p", { className: "eyebrow", text: "Independent verification" }),
        el("h2", { text: "검증 번들로 직접 다시 확인하세요" }),
        el("p", {
          className: "muted",
          text: "6개 무결성 검사를 직접 재계산할 수 있습니다"
        })
      ]),
      el("span", { className: "status-pill", text: "Matched" })
    ]),
    el("dl", { className: "verification-bundle-meta" }, [
      ...verificationBundleMetadata([
        ["Source", "Live"],
        ["Generated at", bundle.generatedAt],
        ["Schema version", bundle.schemaVersion],
        ["Verifier version", bundle.verifierInput.verifierVersion]
      ])
    ]),
    el("div", { className: "verification-bundle-actions" }, [
      explorerUrl === null
        ? el("span", { className: "disabled-link", text: "GIWA Explorer" })
        : el("a", {
            className: "secondary-link",
            href: explorerUrl,
            text: "GIWA Explorer"
          }),
      el("a", {
        className: "primary-link",
        href: downloadPath,
        download: "giwa-verification-bundle.json",
        text: "검증 번들 JSON 받기"
      })
    ]),
    el("p", { className: "notice", text: bundle.notice }),
    el("div", { className: "verification-bundle-disclosures" }, [
      el("details", { className: "verification-bundle-disclosure" }, [
        disclosureSummary("Manifest 및 서명"),
        field("Manifest signature", bundle.manifest.signature),
        field("Recovered signer", bundle.manifest.recoveredSigner),
        field(
          "Verifying contract",
          bundle.manifest.signingDomain.verifyingContract
        ),
        field("Intent hash", bundle.identity.intentHash)
      ]),
      el("details", { className: "verification-bundle-disclosure" }, [
        disclosureSummary("Verifier input"),
        field("Verifier input hash", bundle.verifierInput.verifierInputHash),
        field("Verifier version", bundle.verifierInput.verifierVersion),
        field(
          "Block snapshot",
          `${bundle.verification.depositBlockNumber} → ${bundle.verification.headBlockNumberAtVerification}`
        ),
        field(
          "Verification snapshot",
          `${bundle.verification.confirmationDepth} confirmations observed`
        ),
        field("Block hash", bundle.verification.depositBlockHash)
      ]),
      el("details", { className: "verification-bundle-disclosure" }, [
        disclosureSummary("Decoded logs"),
        ...(bundle.decodedLogs.length === 0
          ? [el("p", { className: "muted", text: "공개 가능한 decoded log가 없습니다." })]
          : bundle.decodedLogs.map((log) =>
              el("div", { className: "verification-log-row" }, [
                el("strong", { text: `${log.eventName} #${log.logIndex}` }),
                el("span", {
                  className: "mono hash-wrap",
                  text: log.contractAddress
                })
              ])
            ))
      ]),
      el("details", { className: "verification-bundle-disclosure" }, [
        disclosureSummary("Receipt canonical payload"),
        field("Receipt hash", bundle.receipt.receiptHash),
        field("Schema version", bundle.receipt.schemaVersion),
        field("Verifier version", bundle.receipt.verifierVersion)
      ]),
      el("details", { className: "verification-bundle-disclosure" }, [
        disclosureSummary("독립 재검증"),
        el("p", {
          className: "muted",
          text: "다운로드한 JSON만 사용하며 DB, RPC 또는 비공개 API에 연결하지 않습니다."
        }),
        el("code", {
          className: "verification-replay-command",
          text: bundle.replay.command
        }),
        el("button", {
          type: "button",
          id: replayId,
          "data-replay-command": bundle.replay.command,
          text: "재검증 명령 복사"
        }),
        el("span", {
          className: "sr-only",
          id: `${replayId}-feedback`,
          role: "status",
          "aria-live": "polite",
          text: ""
        })
      ])
    ])
  ]);
}

function bindVerificationReplayCopy() {
  document.querySelectorAll("[data-replay-command]").forEach((button) => {
    button.addEventListener("click", async () => {
      const command = button.getAttribute("data-replay-command");
      const feedback = document.querySelector(`#${button.id}-feedback`);
      if (command === null) return;
      try {
        await navigator.clipboard.writeText(command);
        if (feedback) feedback.textContent = "재검증 명령을 복사했습니다.";
      } catch {
        if (feedback) feedback.textContent = "명령을 복사하지 못했습니다.";
      }
    });
  });
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
          step.standardRpcBlockEvidence ? el("em", { text: "Standard RPC block evidence" }) : el("em", { text: "Non-final step" })
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
      field(
        "Verification snapshot",
        `${packet.evidence.standardRpc.confirmationDepth} confirmations observed`
      ),
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
          field(
            "Verification snapshot",
            `${cards.standardConfirmation.confirmationDepth} confirmations observed`
          ),
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

function renderExactExecutionComparison(model) {
  const manifest = model.manifest;
  const receipt = model.receipt;
  const rows = [
    ["캠페인이 서명한 조건", shortHash(manifest.intentHash), "확인됨"],
    ["참여자 지갑이 실행한 트랜잭션", shortHash(manifest.wallet), "확인됨"],
    ["실행 대상과 액션", `${shortHash(manifest.target)} · ${manifest.actionType ?? "mockVaultDeposit"}`, "일치"],
    ["자산과 수량", `${shortHash(manifest.asset)} · ${manifest.amountBaseUnits}`, "일치"],
    ["블록 증거", `Block ${receipt.blockNumber} · ${receipt.confirmationDepth ?? 0} confirmations`, "확인됨"]
  ];
  return el("section", { className: "band exact-execution-section" }, [
    el("div", { className: "section-heading" }, [
      el("div", {}, [
        el("p", { className: "eyebrow", text: "Exact Execution Seal" }),
        el("h2", { text: "약속한 실행과 실제 트랜잭션을 한 줄씩 대조했습니다" })
      ])
    ]),
    el("dl", { className: "exact-execution-table" },
      rows.map(([label, value, result]) =>
        el("div", { className: "exact-execution-row" }, [
          el("dt", { text: label }),
          el("dd", { className: "mono hash-wrap", text: value }),
          el("span", { className: "exact-execution-result", text: result })
        ])
      )
    )
  ]);
}

function renderReceiptRoute(model, routeAllowed, routeHash, publicProof = null) {
  document.title = "Matched Receipt · GIWA Verified Intent Rail";
  app.textContent = "";
  if (!routeAllowed) {
    app.append(
      renderProtocolHeader("receipt"),
      el("section", { className: "hero-flow receipt-hero" }, [
        el("div", { className: "hero-copy" }, [
          el("p", { className: "eyebrow", text: "Testnet receipt" }),
          el("h1", { text: "Receipt not found or not available" }),
          el("p", {
            className: "lead",
            text: "This public route only opens after verifier-matched evidence passes the receipt gate."
          }),
          el("div", { className: "hero-actions" }, [
            el("a", { className: "primary-link", href: "/", text: "Open guided flow" }),
            el("a", { className: "secondary-link", href: "/partner", text: "Campaign" })
          ])
        ]),
        el("section", { className: "panel" }, [
          el("div", { className: "panel-heading" }, [
            el("p", { className: "eyebrow", text: "Locked" }),
            el("h2", { text: "Matched receipt required" })
          ]),
          field("Requested hash", routeHash ?? "missing"),
          field("Receipt gate", "matched verification required"),
          field("Details", "No run details are shown for unknown receipt hashes"),
          renderVerificationBundle(null, { replayId: "copy-receipt-replay" })
        ])
      ])
    );
    return;
  }

  const recorded = model.source?.mode === "completed-demo-evidence";
  const sourceLabel = recorded
    ? "Recorded verified example"
    : "Live matched receipt";
  const receipt = model.receipt;
  const decodedLogs = model.partnerConsole.evidenceCards.decodedLogSummary;
  const decodedLogPanel =
    model.partnerConsole.evidenceCards.decodedLogSummary.length > 0
      ? el("details", { className: "panel" }, [
          el("summary", { text: "Decoded logs" }),
          el(
            "div",
            { className: "log-list" },
            decodedLogs.map((log) =>
              el("div", { className: "event-row" }, [
                el("span", { text: `${log.eventName} #${log.logIndex}` }),
                el("span", {
                  className: "mono hash-wrap",
                  text: shortHash(log.contractAddress)
                })
              ])
            )
          )
        ])
      : null;
  app.append(
    renderProtocolHeader("receipt"),
    el("section", { className: "hero-flow receipt-hero" }, [
      el("div", { className: "hero-copy" }, [
        el("p", { className: "eyebrow", text: sourceLabel }),
        el("h1", { text: "서명된 조건 안에서 실행됐습니다." }),
        el("p", {
          className: "lead",
          text: "캠페인이 서명한 조건과 참여자 지갑이 실행한 트랜잭션이 일치했습니다."
        }),
        el("p", {
          className: "notice",
          text: recorded
            ? "이 화면은 이전 GIWA Sepolia 테스트넷 실행에서 저장된 검증 예시입니다."
            : "이 Receipt는 현재 live verifier와 public Receipt gate를 통과했습니다."
        }),
        el("div", { className: "hero-actions receipt-primary-actions" }, [
          el("a", { className: "primary-link", href: receipt.depositExplorerUrl ?? "#", text: "GIWA Explorer" }),
          el("a", {
            className: "secondary-link",
            href: `/partner?receipt=${receipt.receiptHash}`,
            text: "Campaign"
          }),
          el("a", {
            className: "secondary-link",
            href: `/evidence?proof=${receipt.receiptHash}`,
            text: "Proof Ledger"
          })
        ])
      ]),
      el("section", { className: "panel" }, [
        el("div", { className: "panel-heading" }, [
          el("p", { className: "eyebrow", text: "Matched evidence" }),
          el("h2", { text: shortHash(receipt.receiptHash) })
        ]),
        field("Receipt hash", receipt.receiptHash),
        field(
          "Decision tx",
          receipt.decisionTxHash ?? "별도 decision tx 없음",
          receipt.decisionExplorerUrl
        ),
        field("Deposit tx", receipt.depositTxHash, receipt.depositExplorerUrl),
        field("Deposit block", receipt.blockNumber),
        field("Deposit block hash", receipt.blockHash),
        receipt.confirmationDepth === undefined
          ? el("span")
          : field(
              "Verification snapshot",
              `${receipt.confirmationDepth} confirmations observed`
            ),
        receipt.verifierInputHash === undefined ? el("span") : field("Verifier input hash", receipt.verifierInputHash)
      ])
    ]),
    renderExactExecutionComparison(model),
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
        ...(decodedLogPanel === null ? [] : [decodedLogPanel])
      ])
    ]),
    renderVerificationBundle(publicProof, {
      replayId: "copy-receipt-replay"
    })
  );
  bindVerificationReplayCopy();
}

function projectCampaignHandoffRequest(href, storedReceiptHash) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return {
      selectedHash: null,
      handoffMarker: null,
      fresh: false,
      consumeStoredMarker: false,
      replacementPath: null
    };
  }
  const receipt = url.searchParams.get("receipt");
  const selectedHash = /^0x[a-fA-F0-9]{64}$/u.test(receipt ?? "")
    ? receipt.toLowerCase()
    : null;
  const issuedParam = url.searchParams.get("handoff") === "issued";
  const normalizedStoredReceiptHash =
    typeof storedReceiptHash === "string" &&
    /^0x[a-fA-F0-9]{64}$/u.test(storedReceiptHash)
      ? storedReceiptHash.toLowerCase()
      : null;
  const fresh =
    issuedParam &&
    selectedHash !== null &&
    normalizedStoredReceiptHash === selectedHash;
  const handoffMarker = fresh ? "issued" : null;
  if (!issuedParam) {
    return {
      selectedHash,
      handoffMarker,
      fresh,
      consumeStoredMarker: false,
      replacementPath: null
    };
  }
  url.searchParams.delete("handoff");
  const search = url.searchParams.toString();
  return {
    selectedHash,
    handoffMarker,
    fresh,
    consumeStoredMarker: fresh,
    replacementPath: `${url.pathname}${search === "" ? "" : `?${search}`}${url.hash}`
  };
}

function consumeCampaignHandoffRequest(options) {
  options = options ?? {};
  const markerKey = "giwa:campaignHandoffReceipt";
  const href = options.href ?? location.href;
  let storage = options.storage;
  let storedReceiptHash = null;
  try {
    storage = storage ?? sessionStorage;
    storedReceiptHash = storage.getItem(markerKey);
  } catch {
    storage = null;
  }
  const request = projectCampaignHandoffRequest(href, storedReceiptHash);
  let consumed = false;
  if (request.consumeStoredMarker && storage !== null) {
    try {
      storage.removeItem(markerKey);
      consumed = true;
    } catch {
      consumed = false;
    }
  }
  if (request.replacementPath !== null) {
    try {
      if (typeof options.replacePath === "function") {
        options.replacePath(request.replacementPath);
      } else {
        history.replaceState(history.state, "", request.replacementPath);
      }
    } catch {
      // The storage marker still prevents a repeated fresh transition.
    }
  }
  return {
    ...request,
    fresh: consumed,
    handoffMarker: consumed ? "issued" : null
  };
}

function projectFallbackCampaignStudio(body) {
  const partner =
    body?.screenKind === "partner-proof-console"
      ? body
      : body?.partnerConsole;
  const summary = partner?.summary;
  const packet = partner?.evidencePacket;
  const rows = Array.isArray(packet?.rows)
    ? packet.rows
    : Array.isArray(partner?.rows)
      ? partner.rows
      : [];
  if (
    summary === null ||
    typeof summary !== "object" ||
    typeof summary?.campaignId !== "string" ||
    typeof summary?.missionId !== "string"
  ) {
    return null;
  }
  const sourceLabel = rows.some((row) => row?.source === "fixture")
    ? "Fixture"
    : "Recorded";
  const safeCount = (value) => Number.isSafeInteger(value) && value >= 0;
  const receipts = rows
    .filter(
      (row) =>
        row?.status === "matched" &&
        /^0x[a-fA-F0-9]{64}$/u.test(row.receiptHash ?? "") &&
        /^0x[a-fA-F0-9]{64}$/u.test(row.depositTxHash ?? "") &&
        /^0x[a-fA-F0-9]{64}$/u.test(row.verifierInputHash ?? "") &&
        /^0x[a-fA-F0-9]{40}$/u.test(row.wallet ?? "")
    )
    .slice(0, 20)
    .map((row) => {
      const receiptHash = row.receiptHash.toLowerCase();
      const depositTxHash = row.depositTxHash.toLowerCase();
      const normalizedWallet = row.wallet.toLowerCase();
      return {
        source: "recorded",
        walletLabel: `${normalizedWallet.slice(0, 8)}…${normalizedWallet.slice(-4)}`,
        receiptHash,
        intentHash: /^0x[a-fA-F0-9]{64}$/u.test(row.intentHash ?? "")
          ? row.intentHash.toLowerCase()
          : "저장된 패킷에서 비공개",
        depositTxHash,
        verifierInputHash: row.verifierInputHash.toLowerCase(),
        receiptPath: `/receipt/${receiptHash}`,
        participantReceiptPath: `/user/receipt/${receiptHash}`,
        explorerUrl: `https://sepolia-explorer.giwa.io/tx/${depositTxHash}`,
        updatedAt: partner.source?.sourceTimestamp ?? packet?.exportLinks?.generatedAt ?? ""
      };
    });
  const packetSubmittedDepositCount =
    safeCount(packet?.kpis?.submittedDepositCount)
      ? packet.kpis.submittedDepositCount
      : null;
  const packetMatchedReceiptCount =
    safeCount(packet?.kpis?.matchedReceiptCount)
      ? packet.kpis.matchedReceiptCount
      : null;
  const matchedCountsAvailable =
    packetSubmittedDepositCount !== null &&
    packetMatchedReceiptCount !== null &&
    packetMatchedReceiptCount <= packetSubmittedDepositCount;
  const submittedDepositCount = matchedCountsAvailable
    ? packetSubmittedDepositCount
    : null;
  const matchedReceiptCount = matchedCountsAvailable
    ? packetMatchedReceiptCount
    : null;
  const generatedAt =
    partner.source?.sourceTimestamp ??
    packet?.exportLinks?.generatedAt ??
    "저장 시각 미상";
  const packetMatchedRate = packet?.kpis?.matchedRate;
  const matchedPercent =
    submittedDepositCount === null ||
    matchedReceiptCount === null ||
    submittedDepositCount === 0
      ? 0
      : (matchedReceiptCount / submittedDepositCount) * 100;
  const expectedMatchedDisplayRate = `${
    Number.isInteger(matchedPercent)
      ? matchedPercent
      : matchedPercent.toFixed(1)
  }%`;
  const matchedRateAvailable =
    matchedCountsAvailable &&
    packetMatchedRate !== null &&
    typeof packetMatchedRate === "object" &&
    !Array.isArray(packetMatchedRate) &&
    packetMatchedRate.numerator === matchedReceiptCount &&
    packetMatchedRate.denominator === submittedDepositCount &&
    packetMatchedRate.displayRate === expectedMatchedDisplayRate &&
    packetMatchedRate.definition ===
      "Matched Receipts / submitted deposits";
  const participantKpisAvailable =
    matchedCountsAvailable &&
    safeCount(packet?.kpis?.uniqueParticipantCount) &&
    safeCount(packet?.kpis?.repeatActivatorCount) &&
    safeCount(packet?.kpis?.repeatActivationCount) &&
    packet.kpis.uniqueParticipantCount <= submittedDepositCount &&
    packet.kpis.repeatActivatorCount <=
      packet.kpis.uniqueParticipantCount &&
    packet.kpis.repeatActivatorCount <=
      packet.kpis.repeatActivationCount &&
    packet.kpis.repeatActivationCount <=
      matchedReceiptCount - packet.kpis.repeatActivatorCount;
  return {
    sourceLabel,
    model: {
      screenKind: "public-campaign-studio",
      source: "recorded",
      generatedAt,
      eventCapture: {
        status: "unavailable",
        generatedAt
      },
      campaign: {
        campaignId: summary.campaignId,
        missionId: summary.missionId,
        networkName: "GIWA Sepolia",
        actionName: "Mock USDC deposit",
        policyVersion: null,
        policyStatus: "fixed-unversioned",
        managedMode: true,
        testnetOnly: true
      },
      funnel: [
        {
          id: "campaignVisited",
          label: "캠페인 방문",
          count: Number.isSafeInteger(summary.campaignEntryCount)
            ? summary.campaignEntryCount
            : null,
          capture: Number.isSafeInteger(summary.campaignEntryCount)
            ? "derived"
            : "not-captured"
        },
        {
          id: "walletConnected",
          label: "지갑 연결",
          count: Number.isSafeInteger(summary.walletConnectedCount)
            ? summary.walletConnectedCount
            : null,
          capture: Number.isSafeInteger(summary.walletConnectedCount)
            ? "derived"
            : "not-captured"
        },
        {
          id: "manifestIssued",
          label: "Manifest 발급",
          count: Number.isSafeInteger(summary.intentAcceptedCount)
            ? summary.intentAcceptedCount
            : null,
          capture: Number.isSafeInteger(summary.intentAcceptedCount)
            ? "derived"
            : "not-captured"
        },
        {
          id: "depositSubmitted",
          label: "예치 제출",
          count: submittedDepositCount,
          capture:
            submittedDepositCount === null ? "not-captured" : "derived"
        },
        {
          id: "receiptIssued",
          label: "Receipt 발급",
          count: matchedReceiptCount,
          capture:
            matchedReceiptCount === null ? "not-captured" : "derived"
        }
      ],
      kpis: {
        uniqueCampaignVisitorCount: null,
        uniqueWalletConnectSessionCount: null,
        submittedDepositCount,
        matchedReceiptCount,
        matchedRate: {
          numerator: matchedRateAvailable
            ? packetMatchedRate.numerator
            : null,
          denominator: matchedRateAvailable
            ? packetMatchedRate.denominator
            : null,
          displayRate: matchedRateAvailable
            ? packetMatchedRate.displayRate
            : null,
          definition: "Matched Receipts / submitted deposits"
        },
        uniqueParticipantCount: participantKpisAvailable
          ? packet.kpis.uniqueParticipantCount
          : null,
        repeatActivatorCount: participantKpisAvailable
          ? packet.kpis.repeatActivatorCount
          : null,
        repeatActivationCount: participantKpisAvailable
          ? packet.kpis.repeatActivationCount
          : null
      },
      mismatchBreakdown: [],
      receipts
    }
  };
}

function renderSourceLabel(sourceLabel) {
  return el("span", {
    className: "source-label",
    "data-source": sourceLabel.toLowerCase(),
    "aria-label": sourceLabel,
    text: ""
  });
}

function renderPublicNegativeControl(control) {
  if (control === null || control === undefined) {
    return el("span", { hidden: "hidden" });
  }
  return el("article", {
    className: "notice negative-control-card",
    "aria-labelledby": "negative-control-heading"
  }, [
    el("p", { className: "eyebrow", text: control.label }),
    el("h3", {
      id: "negative-control-heading",
      text: "불일치 대조 예시"
    }),
    el("p", {
      text: "Manifest는 하나의 실행 대상을 기대했지만, 통제된 실행은 다른 대상을 사용했습니다."
    }),
    el("p", {
      text: "검증기는 Matched Receipt를 발급하지 않았습니다."
    }),
    el("p", {
      text: "따라서 정확한 해시의 공개 Receipt 조회는 사용할 수 없습니다."
    }),
    el("a", {
      className: "secondary-link",
      href: control.path,
      text: "불일치 예시 보기"
    })
  ]);
}

function projectCampaignReceiptHandoff(
  receipts,
  selectedHash,
  matchedCount,
  handoffMarker
) {
  if (selectedHash === null) return null;
  const index = receipts.findIndex(
    (row) => row.receiptHash === selectedHash
  );
  if (index < 0) return null;
  const latest = index === 0;
  const fresh = latest && handoffMarker === "issued";
  return {
    index,
    latest,
    fresh,
    rowId: `receipt-row-${index}-${receipts[index].receiptHash.slice(2, 14).toLowerCase()}`,
    eyebrow: fresh ? "방금 발급된 Receipt" : "선택한 Receipt",
    message: fresh
      ? `방금 발급된 Receipt · ${Math.max(0, matchedCount - 1)} → ${matchedCount}`
      : `선택한 Receipt · 현재 ${matchedCount}건 중 포함`
  };
}

function campaignReceiptRowId(receiptHash, index) {
  return `receipt-row-${index}-${receiptHash.slice(2, 14).toLowerCase()}`;
}

function renderPublicCampaignStudio(model, options = {}) {
  document.title = "Campaign Studio · GIWA Verified Intent Rail";
  const sourceLabel = options.sourceLabel ?? "Live";
  const live = sourceLabel === "Live";
  const request = live
    ? consumeCampaignHandoffRequest()
    : { selectedHash: null, handoffMarker: null };
  const matchedCount = Number.isSafeInteger(
    model.kpis.matchedReceiptCount
  )
    ? model.kpis.matchedReceiptCount
    : null;
  const handoff =
    matchedCount === null
      ? null
      : projectCampaignReceiptHandoff(
          model.receipts,
          request.selectedHash,
          matchedCount,
          request.handoffMarker
        );
  const matchedRate = model.kpis.matchedRate;
  const matchedRateDisplay =
    typeof matchedRate?.displayRate === "string" &&
    Number.isSafeInteger(matchedRate.numerator) &&
    Number.isSafeInteger(matchedRate.denominator)
      ? `${matchedRate.displayRate} (${matchedRate.numerator}/${matchedRate.denominator})`
      : "—";

  app.textContent = "";
  app.append(
    renderProtocolHeader("campaign"),
    el("section", { className: "studio-hero", id: "main-content" }, [
      el("div", {}, [
        el("div", { className: "studio-kicker" }, [
          renderSourceLabel(sourceLabel),
          el("span", { text: "GIWA Sepolia · Testnet" })
        ]),
        el("p", { className: "eyebrow", text: "Campaign Brief" }),
        el("h1", { text: "클릭이 아니라, 확인된 실행을 집계합니다." }),
        el("p", {
          className: "lead",
          text: "캠페인이 서명한 미션과 참여자의 GIWA Sepolia 트랜잭션이 일치할 때만 KPI와 Proof Ledger에 반영됩니다."
        })
      ]),
      el("dl", { className: "studio-kpi-strip" }, [
        field(
          "Unique campaign visitors · Distinct anonymous sessions with campaignVisited",
          model.kpis.uniqueCampaignVisitorCount ?? "—"
        ),
        field(
          "Unique wallet-connect sessions · Distinct anonymous sessions with walletConnected",
          model.kpis.uniqueWalletConnectSessionCount ?? "—"
        ),
        field(
          "Submitted deposits",
          model.kpis.submittedDepositCount ?? "—"
        ),
        field("Matched Receipt", matchedCount ?? "—"),
        field(
          "Matched Receipts / submitted deposits",
          matchedRateDisplay
        ),
        field(
          "Unique participants · Distinct normalized wallets among submitted deposits",
          model.kpis.uniqueParticipantCount ?? "—"
        ),
        field(
          "Repeat activators · Wallets with at least 2 gated Matched Receipts",
          model.kpis.repeatActivatorCount ?? "—"
        ),
        field(
          "Repeat activations · Gated Matched Receipts after each wallet's first",
          model.kpis.repeatActivationCount ?? "—"
        ),
        field("Event capture", model.eventCapture.status),
        field("Generated at", model.eventCapture.generatedAt)
      ])
    ]),
    ...(handoff === null
      ? []
      : [
          el(
            "section",
            {
              className: "campaign-receipt-handoff",
              id: "campaign-receipt-handoff",
              tabindex: "-1"
            },
            [
              el("div", { className: "campaign-receipt-explanation" }, [
                el("p", { className: "eyebrow", text: handoff.eyebrow }),
                el("h2", { text: "이 Receipt가 Campaign evidence에 반영된 방식" }),
                el("p", {
                  text: "Manifest와 일치한 GIWA Sepolia 실행만 참여·제출·Matched Receipt 지표에 포함됩니다."
                }),
                el("p", { className: "muted", text: handoff.message })
              ]),
              el("div", { className: "proof-ledger-links" }, [
                el("a", {
                  className: "secondary-link",
                  href: `#${handoff.rowId}`,
                  text: "Receipt 행 확인"
                })
              ])
            ]
          )
        ]),
    el("section", { className: "studio-section" }, [
      el("div", { className: "section-heading" }, [
        el("div", {}, [
          el("p", { className: "eyebrow", text: "Mission Policy" }),
          el("h2", { text: "서명되는 조건은 하나의 고정된 테스트넷 미션입니다" })
        ])
      ]),
      el("dl", { className: "studio-policy" }, [
        field("Campaign", model.campaign.campaignId),
        field("Mission", model.campaign.missionId),
        field("Action", model.campaign.actionName),
        field("Network", model.campaign.networkName),
        field("Policy", "Fixed · unversioned"),
        field("Mode", "Managed · Mock assets only")
      ])
    ]),
    el("section", { className: "studio-section" }, [
      el("div", { className: "section-heading" }, [
        el("div", {}, [
          el("p", { className: "eyebrow", text: "Verified activation funnel" }),
          el("h2", { text: "현재 저장소에서 재구성 가능한 전환만 표시합니다" })
        ])
      ]),
      el("ol", { className: "studio-funnel" },
        model.funnel.map((step) =>
          el("li", { className: "studio-funnel-step" }, [
            el("span", { text: step.label }),
            el("strong", {
              text: step.count === null ? "—" : String(step.count)
            }),
            el("small", {
              text:
                step.count === null
                  ? "P0 저장소에서 재구성할 수 없는 단계"
                  : "증거에서 계산"
            })
          ])
        )
      )
    ]),
    ...(model.approvalPaths === undefined
      ? []
      : [
          el("section", { className: "studio-section" }, [
            el("div", { className: "section-heading" }, [
              el("div", {}, [
                el("p", { className: "eyebrow", text: "Approval path" }),
                el("h2", {
                  text: "승인은 필요한 실행에서만 제출됩니다"
                })
              ])
            ]),
            el("dl", { className: "studio-policy" }, [
              field(
                "정확한 승인 제출 · Approval required (approval tx submitted)",
                `${model.approvalPaths.exactApprovalSubmitted}건`
              ),
              field(
                "승인 확인",
                `${model.approvalPaths.exactApprovalConfirmed}건`
              ),
              field(
                "기존 허용량으로 승인 생략 · Approval not required (allowance sufficient)",
                `${model.approvalPaths.approvalNotRequired}건`
              ),
              field(
                "예치 제출",
                `${model.approvalPaths.depositSubmitted}건`
              )
            ])
          ])
        ]),
    el("section", { className: "studio-section" }, [
      el("div", { className: "section-heading" }, [
        el("div", {}, [
          el("p", { className: "eyebrow", text: "Mismatch breakdown" }),
          el("h2", { text: "Receipt가 열리지 않은 이유" })
        ])
      ]),
      model.mismatchBreakdown.length === 0
        ? el("p", {
            className: "notice",
            text:
              sourceLabel === "Live"
                ? "현재 공개 가능한 불일치 집계가 없습니다."
                : "이 저장된 자료에는 불일치 집계가 포함되지 않았습니다."
          })
        : el("dl", { className: "studio-mismatch-list" },
            model.mismatchBreakdown.map((row) =>
              field(row.label, `${row.count}건`)
            )
          )
    ]),
    el("section", { className: "studio-section proof-ledger-section" }, [
      el("div", { className: "section-heading" }, [
        el("div", {}, [
          el("p", { className: "eyebrow", text: "Proof Ledger" }),
          el("h2", { text: "Receipt gate를 통과한 실행" })
        ]),
        el("a", {
          className: "secondary-link",
          href: "/evidence",
          text: "해시로 증거 찾기"
        })
      ]),
      model.receipts.length === 0
        ? el("p", { className: "notice", text: "공개 가능한 Matched Receipt가 없습니다." })
        : el("div", { className: "proof-ledger" },
            model.receipts.map((row, index) => {
              const isHighlighted = handoff !== null && index === handoff.index;
              return el("article", {
                className: `proof-ledger-row ${isHighlighted ? "is-highlighted" : ""}`
              }, [
                el("div", {}, [
                  el("p", {
                    className: "eyebrow",
                    text: isHighlighted ? handoff.eyebrow : sourceLabel
                  }),
                  el("h3", {
                    id: campaignReceiptRowId(row.receiptHash, index),
                    tabindex: isHighlighted ? "-1" : null,
                    text: shortHash(row.receiptHash)
                  }),
                  el("p", { className: "muted", text: `${row.walletLabel} · ${row.updatedAt}` })
                ]),
                el("div", { className: "proof-ledger-links" }, [
                  el("a", { className: "primary-link", href: row.participantReceiptPath, text: "Participant Receipt" }),
                  el("a", { className: "secondary-link", href: row.receiptPath, text: "공개 증거" }),
                  el("a", { className: "secondary-link", href: row.explorerUrl, text: "GIWA Explorer" })
                ])
              ]);
            })
          )
    ]),
    renderPublicNegativeControl(model.negativeControl),
    el("section", { className: "studio-section studio-closeout" }, [
      el("div", {}, [
        el("p", { className: "eyebrow", text: "Closeout" }),
        el("h2", { text: "현재 데모의 증명 범위" }),
        el("p", {
          text: "GIWA Sepolia의 mock-vault deposit을 Manifest와 대조한 테스트넷 기록입니다. 실제 자산, 수익, RWA 발행 또는 결제를 의미하지 않습니다."
        })
      ]),
      el("a", { className: "primary-link", href: "/giwa-demo", text: "참여자 여정 실행" })
    ])
  );

  if (handoff !== null) {
    document.querySelector("#campaign-receipt-handoff")?.focus();
  }
}

function projectProofSearchState(query, proof) {
  if (query === "") return "idle";
  if (!/^0x[a-fA-F0-9]{64}$/u.test(query)) return "malformed";
  return proof === null ? "not-found-or-not-public" : "matched";
}

function proofSearchEmptyCopy(state) {
  const copy = {
    idle: {
      title: "하나의 해시로 같은 실행 증거를 찾습니다",
      body: "지갑 주소가 아니라 Receipt, Deposit transaction 또는 Intent의 정확한 hash로 조회합니다."
    },
    malformed: {
      title: "해시 형식을 확인해 주세요",
      body: "올바른 0x 형식의 32-byte hash를 입력해 주세요."
    },
    "not-found-or-not-public": {
      title: "공개 증거를 찾지 못했습니다.",
      body: "찾을 수 없거나 공개되지 않은 증거입니다."
    }
  };
  return copy[state] ?? copy.idle;
}

function renderPublicEvidenceSearch(input = {}) {
  document.title = "Proof Ledger · GIWA Verified Intent Rail";
  const query = input.query ?? "";
  const proof = input.proof ?? null;
  const state =
    input.state ??
    projectProofSearchState(input.query ?? "", input.proof ?? null);
  const emptyCopy =
    proof === null ? proofSearchEmptyCopy(state) : null;
  const negativeControlSlot = el("div", {
    className: "proof-negative-control-slot",
    id: "proof-negative-control-slot"
  }, [
    renderPublicNegativeControl(input.negativeControl)
  ]);
  app.textContent = "";
  const result =
    proof !== null
      ? el("section", { className: "public-proof-result" }, [
          el("div", { className: "section-heading" }, [
            el("div", {}, [
              el("p", { className: "eyebrow", text: "Exact Execution Seal" }),
              el("h2", { text: "서명된 조건 안에서 실행됐습니다." })
            ]),
            renderSourceLabel("Live")
          ]),
          el("div", { className: "exact-execution-table" }, [
            field("Campaign", proof.campaignId),
            field("Mission", proof.missionId),
            field("Participant", proof.walletLabel),
            renderHashDisclosure("Receipt hash", proof.receiptHash),
            renderHashDisclosure("Intent hash", proof.intentHash),
            renderHashDisclosure("Deposit transaction", proof.depositTxHash),
            field("Block", `${proof.blockNumber} · ${proof.confirmationDepth} confirmations`),
            renderHashDisclosure("Block hash", proof.blockHash),
            renderHashDisclosure("Verifier input", proof.verifierInputHash)
          ]),
          el("div", { className: "hero-actions" }, [
            el("a", { className: "primary-link", href: proof.receiptPath, text: "공개 Receipt" }),
            el("a", { className: "secondary-link", href: proof.participantReceiptPath, text: "Participant Receipt" }),
            el("a", { className: "secondary-link", href: proof.explorerUrl, text: "GIWA Explorer" })
          ]),
          el("p", { className: "notice", text: proof.testnetNotice })
        ])
      : el("section", { className: "public-proof-empty" }, [
          el("h2", { text: emptyCopy?.title ?? "" }),
          el("p", { className: "muted", text: emptyCopy?.body ?? "" })
        ]);
  app.append(
    renderProtocolHeader("proof"),
    el("section", { className: "proof-search-page", id: "main-content" }, [
      el("header", { className: "proof-search-header proof-chain-intro" }, [
        el("p", { className: "eyebrow", text: "Public Proof Ledger" }),
        el("h1", { text: "Manifest → GIWA 실행 → Match → Receipt" }),
        el("p", {
          className: "lead",
          text: "서명된 조건과 확인된 테스트넷 트랜잭션을 대조한 뒤, 일치한 Receipt만 공개합니다."
        })
      ]),
      el("form", {
        className: "proof-search",
        action: "/evidence",
        method: "get"
      }, [
        el("label", { for: "proof-hash", text: "Receipt, 트랜잭션 또는 Intent hash" }),
        el("div", { className: "proof-search-controls" }, [
          el("input", {
            id: "proof-hash",
            name: "proof",
            inputmode: "text",
            autocomplete: "off",
            spellcheck: "false",
            value: query
          }),
          el("button", { type: "submit", text: "증거 찾기" })
        ])
      ]),
      result,
      renderVerificationBundle(proof, { replayId: "copy-proof-replay" }),
      negativeControlSlot
    ])
  );
  bindVerificationReplayCopy();
  return negativeControlSlot;
}

function appendPublicNegativeControl(slot, control) {
  slot.textContent = "";
  if (control !== null && control !== undefined) {
    slot.append(renderPublicNegativeControl(control));
  }
}

function loadPublicEvidenceRoute(options) {
  const validQuery = /^0x[a-fA-F0-9]{64}$/u.test(options.query);
  const normalizedQuery = validQuery
    ? options.query.toLowerCase()
    : options.query;
  const campaignRequest = Promise.resolve()
    .then(() => options.fetchCampaignStudio())
    .catch(() => null);
  const proofRequest = validQuery
    ? Promise.resolve().then(() => options.fetchProof(normalizedQuery))
    : Promise.resolve(null);

  return proofRequest.then((proof) => {
    const slot = options.renderProof({
      query: normalizedQuery,
      proof,
      state: projectProofSearchState(normalizedQuery, proof)
    });
    const secondary = campaignRequest
      .then((studio) => {
        if (studio?.negativeControl !== null && studio?.negativeControl !== undefined) {
          options.appendNegativeControl(slot, studio.negativeControl);
        }
      })
      .catch(() => undefined);
    return { secondary };
  });
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
          text: "Review the signed manifest, inspect recorded approve/deposit evidence, then view the verifier-matched receipt."
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
      el("p", { className: "notice", text: `${model.receipt.safetyNotice} Flashblocks is fast feedback only, not final confirmation.` })
    ])
  );
}

async function fetchFallbackCampaignStudio(fetchImpl = fetch) {
  for (const path of ["/partner-snapshot.json", "/flow-data.json"]) {
    try {
      const response = await fetchImpl(path, { cache: "no-store" });
      if (!response.ok) continue;
      const projected = projectFallbackCampaignStudio(await response.json());
      if (projected !== null) return projected;
    } catch {
      // Try the next committed public artifact.
    }
  }
  return null;
}

async function main() {
  if (location.pathname === "/evidence") {
    const query =
      new URLSearchParams(location.search).get("proof") ??
      new URLSearchParams(location.search).get("hash") ??
      "";
    const route = await loadPublicEvidenceRoute({
      query,
      fetchProof: fetchPublicMatchedProof,
      fetchCampaignStudio: fetchPublicCampaignStudio,
      renderProof: renderPublicEvidenceSearch,
      appendNegativeControl: appendPublicNegativeControl
    });
    void route.secondary;
    return;
  }

  if (location.pathname === "/partner") {
    const liveStudio = await fetchPublicCampaignStudio();
    if (liveStudio !== null) {
      renderPublicCampaignStudio(liveStudio, { sourceLabel: "Live" });
      return;
    }
    const fallback = await fetchFallbackCampaignStudio();
    if (fallback !== null) {
      renderPublicCampaignStudio(fallback.model, {
        sourceLabel: fallback.sourceLabel
      });
      return;
    }
    app.textContent = "";
    app.append(
      el("section", { className: "loading-panel" }, [
        el("p", { className: "eyebrow", text: "Partner Studio" }),
        el("h1", { text: "공개 캠페인 증거를 불러오지 못했습니다" }),
        el("p", {
          className: "muted",
          text: "Live API와 저장된 public artifact를 모두 확인할 수 없습니다."
        })
      ])
    );
    return;
  }

  const receiptRoute = location.pathname.startsWith("/receipt/");
  const routeHash = receiptHashFromPathname(location.pathname);
  if (receiptRoute && routeHash !== null) {
    const liveModel = await fetchLiveReceiptModel(routeHash);
    if (liveModel !== null) {
      const publicProof = await fetchPublicMatchedProof(routeHash);
      renderReceiptRoute(liveModel, true, routeHash, publicProof);
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

await main();

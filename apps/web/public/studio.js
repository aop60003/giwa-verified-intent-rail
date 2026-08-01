const studioCampaignModelUrl = typeof document === "undefined"
  ? new URL("./studio-campaign-model.js", import.meta.url).href
  : "/studio-campaign-model.js";
const {
  createStudioCampaignPayload,
  editorFromStudioCampaign,
  emptyStudioCampaignEditor,
  studioCampaignEditorIsDirty,
  studioCampaignFailurePresentation,
  studioCampaignPublicationFromPayload,
  studioCampaignPublishAllowed,
  studioCampaignPublishFailurePresentation,
  studioCampaignPublishPayload,
  studioCampaignVersionHistoryFromPayload,
  updateStudioCampaignPayload,
  validateStudioCampaignEditor
} = await import(/* @vite-ignore */ studioCampaignModelUrl);

const GIWA_CHAIN_ID = 91342;
const AUTHENTICATION_MEANING =
  "서명은 트랜잭션을 제출하거나 자금을 사용하지 않으며 가스가 필요하지 않습니다.";

const STATE_COPY = Object.freeze({
  disconnected: "조직 Studio에 접근하려면 Owner 지갑으로 서명해 주세요.",
  "wallet-unavailable": "호환되는 브라우저 지갑을 찾을 수 없습니다.",
  "wrong-network": "현재 지갑 네트워크가 GIWA Sepolia가 아닙니다.",
  "challenge-loading": "인증 요청을 준비하고 있습니다.",
  "signature-pending": "지갑에서 인증 서명을 확인해 주세요.",
  verifying: "서명과 조직 접근 권한을 확인하고 있습니다.",
  "session-expired": "세션이 만료되었습니다. 다시 연결해 주세요.",
  "access-denied": "인증을 완료하지 못했습니다. 접근 대상 여부는 공개되지 않습니다.",
  "retryable-error": "Studio 인증 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요."
});

const PUBLIC_ERROR_COPY = Object.freeze({
  invalid_request: "인증 요청을 확인하지 못했습니다. 다시 시도해 주세요.",
  authentication_failed: STATE_COPY["access-denied"],
  origin_not_allowed: "이 Studio 주소에서는 요청을 완료할 수 없습니다.",
  rate_limited: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  service_unavailable: STATE_COPY["retryable-error"],
  studio_auth_unavailable: STATE_COPY["retryable-error"]
});

let walletFlowBusy = false;
let wrongNetworkWallet = null;
let campaignStudioState = {
  session: null,
  campaigns: [],
  limits: { name: 80, summary: 280 },
  editor: null,
  loading: false,
  saving: false,
  publishing: false,
  versionsLoading: false,
  versionsReady: false,
  versions: [],
  publishConfirmation: null,
  notice: null
};
let campaignBeforeUnloadRegistered = false;
let campaignFocusBeforeReplacement = null;
let campaignNavigationGuardRegistered = false;

const STUDIO_CAMPAIGN_LIMITS = Object.freeze({ name: 80, summary: 280 });

export function studioCampaignControlsAreBusy(state) {
  return state?.saving === true || state?.loading === true || state?.publishing === true ||
    state?.versionsLoading === true;
}

export function studioCampaignSaveAllowed(state) {
  return state?.editor !== null && !studioCampaignControlsAreBusy(state) &&
    studioCampaignEditorIsDirty(state.editor);
}

export function studioCampaignSaveControlState(state) {
  const eligible = studioCampaignSaveAllowed(state);
  return { eligible, disabled: !eligible };
}

export function studioCampaignPublishControlState(state) {
  const editor = state?.editor;
  const visible = editor?.mode === "edit" && typeof editor.campaignId === "string" &&
    editor.campaignId !== "gasok-demo";
  const eligible = visible && studioCampaignPublishAllowed(state);
  return { visible, eligible, disabled: !eligible };
}

export function studioCampaignRequestState(state, event) {
  const saving = state?.saving === true;
  const publishing = state?.publishing === true;
  const versionsLoading = state?.versionsLoading === true;
  const versionsReady = state?.versionsReady === true;
  switch (event) {
    case "save-start": return { saving: true, loading: false, publishing: false, versionsLoading: false, versionsReady };
    case "refresh-start": return { saving, loading: true, publishing, versionsLoading, versionsReady };
    case "refresh-success":
    case "refresh-failure":
    case "save-failure": return { saving: false, loading: false, publishing, versionsLoading, versionsReady };
    case "publish-start": return { saving: false, loading: false, publishing: true, versionsLoading: false, versionsReady };
    case "publish-success":
    case "publish-failure": return { saving, loading: false, publishing: false, versionsLoading, versionsReady };
    case "versions-start": return { saving, loading: false, publishing, versionsLoading: true, versionsReady: false };
    case "versions-success": return { saving, loading: false, publishing, versionsLoading: false, versionsReady: true };
    case "versions-failure": return { saving, loading: false, publishing, versionsLoading: false, versionsReady: false };
    default: return { saving, loading: state?.loading === true, publishing, versionsLoading, versionsReady };
  }
}

export function studioCampaignSaveFlowState(state, event) {
  return { ...state, ...studioCampaignRequestState(state, event) };
}

export function studioCampaignMutationResponseState(state, savedEditor) {
  const valid = savedEditor !== null && typeof savedEditor === "object" &&
    savedEditor.mode === "edit" && typeof savedEditor.campaignId === "string" &&
    typeof savedEditor.name === "string" && typeof savedEditor.summary === "string" &&
    Number.isSafeInteger(savedEditor.revision) && savedEditor.revision > 0 &&
    savedEditor.initialName === savedEditor.name && savedEditor.initialSummary === savedEditor.summary;
  if (!valid) {
    return {
      accepted: false,
      state: {
        ...state,
        saving: false,
        loading: false,
        editor: null,
        notice: { kind: "service-unavailable", message: "Saved Draft details could not be confirmed." }
      }
    };
  }
  return {
    accepted: true,
    state: { ...state, editor: { ...savedEditor }, notice: null }
  };
}

export function studioCampaignInputNoticePolicy(notice) {
  if (notice?.kind === "validation" && (notice.field === "name" || notice.field === "summary")) {
    return { clear: true, field: notice.field, dirtyCopy: true };
  }
  if (notice === null || notice?.kind === "new" || notice?.kind === "selected" || notice?.kind === "saved") {
    return { clear: true, field: null, dirtyCopy: true };
  }
  return { clear: false, field: null, dirtyCopy: false };
}

export function studioCampaignInputPresentationDecision(notice, editor) {
  const policy = studioCampaignInputNoticePolicy(notice);
  if (!policy.clear) return { clearNotice: false, field: null, status: "preserve" };
  return {
    clearNotice: true,
    field: policy.field,
    status: studioCampaignEditorIsDirty(editor) ? "dirty" : "clean"
  };
}

export function studioCampaignRefetchSelectionState({ expectedId, listEditor, fallbackEditor }) {
  if (typeof expectedId !== "string" || expectedId.length === 0) {
    return { editor: listEditor ?? null, consistent: true };
  }
  if (listEditor?.campaignId === expectedId) return { editor: listEditor, consistent: true };
  if (fallbackEditor?.campaignId === expectedId) return { editor: fallbackEditor, consistent: false };
  return { editor: null, consistent: false };
}

export function studioCampaignInconsistentRefreshPresentation(value) {
  if (value === "save-omission") {
    return {
      kind: "service-unavailable",
      message: "Saved Draft is not yet available in the Campaign list. Please try again.",
      action: null
    };
  }
  if (value === "reload-latest") {
    return {
      kind: "revision-conflict",
      message: "Latest Draft is unavailable; local edits remain.",
      action: "reload-latest"
    };
  }
  return null;
}

export function studioCampaignNavigationDecision(input) {
  if (input?.dirty !== true || input.button !== 0 || input.ctrlKey || input.metaKey || input.shiftKey || input.altKey ||
    input.download === true || input.sameOrigin !== true || input.hashOnly === true ||
    (input.target !== "" && input.target !== "_self")) {
    return "ignore";
  }
  return "confirm";
}

export function clampStudioCampaignLimits(limits) {
  const name = ownValue(limits, "name");
  const summary = ownValue(limits, "summary");
  return {
    name: Number.isSafeInteger(name) && name > 0
      ? Math.min(name, STUDIO_CAMPAIGN_LIMITS.name)
      : STUDIO_CAMPAIGN_LIMITS.name,
    summary: Number.isSafeInteger(summary) && summary > 0
      ? Math.min(summary, STUDIO_CAMPAIGN_LIMITS.summary)
      : STUDIO_CAMPAIGN_LIMITS.summary
  };
}

export function studioCampaignFocusMatch(nodes, focus) {
  if (typeof focus !== "string") return null;
  for (const node of nodes) {
    if (node?.dataset?.studioCampaignFocus === focus) return node;
  }
  return null;
}

export function studioCampaignEditorInputState(state, field, value) {
  const editor = state?.editor ?? null;
  if (editor === null || studioCampaignControlsAreBusy(state) ||
    (field !== "name" && field !== "summary")) {
    return { accepted: false, editor };
  }
  return { accepted: true, editor: { ...editor, [field]: value } };
}

function campaignControlsAreBusy() {
  return studioCampaignControlsAreBusy(campaignStudioState);
}

function updateCampaignRequestState(event) {
  Object.assign(campaignStudioState, studioCampaignSaveFlowState(campaignStudioState, event));
}

function resetCampaignStudioState() {
  closePublishConfirmation({ restoreFocus: false, force: true });
  campaignStudioState = {
    session: null,
    campaigns: [],
    limits: { ...STUDIO_CAMPAIGN_LIMITS },
    editor: null,
    loading: false,
    saving: false,
    publishing: false,
    versionsLoading: false,
    versionsReady: false,
    versions: [],
    publishConfirmation: null,
    notice: null
  };
  campaignFocusBeforeReplacement = null;
  syncCampaignBeforeUnload();
}

function campaignBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = "";
}

function syncCampaignBeforeUnload() {
  if (typeof window === "undefined") return;
  const dirty = campaignStudioState.editor !== null &&
    studioCampaignEditorIsDirty(campaignStudioState.editor);
  if (dirty && !campaignBeforeUnloadRegistered) {
    window.addEventListener("beforeunload", campaignBeforeUnload);
    campaignBeforeUnloadRegistered = true;
  } else if (!dirty && campaignBeforeUnloadRegistered) {
    window.removeEventListener("beforeunload", campaignBeforeUnload);
    campaignBeforeUnloadRegistered = false;
  }
  if (dirty && !campaignNavigationGuardRegistered && typeof document !== "undefined") {
    document.addEventListener("click", guardCampaignNavigation, true);
    campaignNavigationGuardRegistered = true;
  } else if (!dirty && campaignNavigationGuardRegistered && typeof document !== "undefined") {
    document.removeEventListener("click", guardCampaignNavigation, true);
    campaignNavigationGuardRegistered = false;
  }
}

function studioRoot() {
  if (typeof document === "undefined") return null;
  return document.getElementById("studio-app");
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function replaceStudioContent(root, nodes) {
  root.replaceChildren(...nodes);
}

function dossierHeader(walletLabel = "조직 인증") {
  const dossier = globalThis.GiwaProtocolDossier;
  if (!dossier || typeof dossier.createHeader !== "function") return null;
  return dossier.createHeader(document, { activeView: "studio", walletLabel });
}

function actionButton(label, className, action, busy = false) {
  const button = element("button", className, label);
  button.type = "button";
  button.dataset.studioAction = action;
  if (busy) button.setAttribute("aria-disabled", "true");
  return button;
}

function gateAction(state) {
  if (state === "wrong-network") {
    const button = actionButton(
      "Switch network",
      "studio-secondary-action",
      "switch-network",
      walletFlowBusy
    );
    button.addEventListener("click", switchNetwork);
    return button;
  }
  const pending = ["challenge-loading", "signature-pending", "verifying"].includes(state);
  const button = actionButton(
    "Connect wallet",
    "studio-primary-action",
    "connect-wallet",
    pending || walletFlowBusy
  );
  button.addEventListener("click", connectWallet);
  return button;
}

function currentAction() {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  return active instanceof HTMLElement ? active.dataset.studioAction ?? null : null;
}

function restoreActionFocus(action) {
  if (!action || typeof document === "undefined") return;
  const replacement =
    document.querySelector(`[data-studio-action="${action}"]`) ??
    document.querySelector("[data-studio-action]");
  if (replacement instanceof HTMLElement) replacement.focus({ preventScroll: true });
}

function finishWalletFlow() {
  walletFlowBusy = false;
  if (typeof document === "undefined") return;
  for (const button of document.querySelectorAll("[data-studio-action][aria-disabled]")) {
    button.removeAttribute("aria-disabled");
  }
}

export function renderStudioGate(options = {}) {
  const root = studioRoot();
  if (!root) return null;

  resetCampaignStudioState();
  const state = options.state ?? "disconnected";
  const activeAction = currentAction();
  const header = dossierHeader(options.walletAddress ? "지갑 확인됨" : "조직 인증");
  const gate = element("section", "studio-auth-gate protocol-screen");
  gate.setAttribute("aria-labelledby", "studio-title");

  const eyebrow = element("p", "eyebrow", "GIWA Verified Intent Rail · Studio");
  const title = element("h1", "studio-title", "조직 Studio 로그인");
  title.id = "studio-title";
  const network = element("p", "studio-network", "GIWA Sepolia · Testnet");
  const explanation = element(
    "p",
    "studio-explanation",
    "등록된 Owner 지갑의 서명으로 조직 접근 권한을 확인합니다."
  );
  const status = element(
    "p",
    `studio-state studio-state-${state}`,
    options.notice ?? STATE_COPY[state] ?? STATE_COPY["retryable-error"]
  );
  status.setAttribute("aria-live", "polite");
  status.setAttribute("role", "status");

  const actions = element("div", "studio-actions");
  actions.append(gateAction(state));
  const meaning = element("p", "studio-signing-note", AUTHENTICATION_MEANING);
  gate.append(eyebrow, title, network, explanation, status, actions, meaning);

  replaceStudioContent(root, header ? [header, gate] : [gate]);
  restoreActionFocus(activeAction);
  return gate;
}

function definition(label, value, valueClass = "") {
  const row = element("div", "studio-detail-row");
  row.append(
    element("dt", "studio-detail-label", label),
    element("dd", `studio-detail-value ${valueClass}`.trim(), value)
  );
  return row;
}

function localizedExpiry(expiresAt) {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "확인할 수 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

function ownValue(value, field) {
  try {
    if (typeof value !== "object" || value === null ||
      !Object.prototype.hasOwnProperty.call(value, field)) return undefined;
    return value[field];
  } catch {
    return undefined;
  }
}

function campaignLimitsFromPayload(payload) {
  return clampStudioCampaignLimits(ownValue(payload, "limits"));
}

function formattedCampaignUpdatedAt(value) {
  if (typeof value !== "string") return "Updated time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated time unavailable";
  return `Updated ${new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)}`;
}

function draftCampaignFromProjection(campaign) {
  const editor = editorFromStudioCampaign(campaign);
  if (editor === null) return null;
  return {
    kind: "draft",
    editor,
    name: editor.name,
    summary: editor.summary,
    updatedAt: formattedCampaignUpdatedAt(ownValue(campaign, "updatedAt"))
  };
}

function campaignListFromPayload(payload) {
  const campaigns = [{ kind: "baseline" }];
  const rawCampaigns = ownValue(payload, "campaigns");
  if (Array.isArray(rawCampaigns)) {
    for (const campaign of rawCampaigns) {
      const draft = draftCampaignFromProjection(campaign);
      if (draft !== null) campaigns.push(draft);
    }
  }
  return { campaigns, limits: campaignLimitsFromPayload(payload) };
}

function activeCampaignFocus() {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  return active instanceof HTMLElement ? active.dataset.studioCampaignFocus ?? null : null;
}

function restoreCampaignFocus(focus) {
  if (!focus || typeof document === "undefined") return;
  const target = studioCampaignFocusMatch(
    document.querySelectorAll("[data-studio-campaign-focus]"),
    focus
  );
  if (target instanceof HTMLElement) target.focus({ preventScroll: true });
}

function campaignDirty() {
  return campaignStudioState.editor !== null &&
    studioCampaignEditorIsDirty(campaignStudioState.editor);
}

function confirmDiscardCampaignEditor() {
  if (!campaignDirty()) return true;
  const focus = campaignFocusBeforeReplacement ?? activeCampaignFocus();
  if (!confirmCampaignExit("Discard unsaved Draft changes?")) {
    restoreCampaignFocus(campaignFocusBeforeReplacement);
    return false;
  }
  campaignFocusBeforeReplacement = focus;
  return true;
}

function rememberCampaignFocus() {
  campaignFocusBeforeReplacement = activeCampaignFocus();
}

function confirmCampaignExit(message) {
  if (!campaignDirty()) return true;
  if (window.confirm(message)) return true;
  restoreCampaignFocus(campaignFocusBeforeReplacement ?? activeCampaignFocus());
  return false;
}

function suspendCampaignBeforeUnloadOnce() {
  if (typeof window === "undefined" || !campaignBeforeUnloadRegistered) return;
  window.removeEventListener("beforeunload", campaignBeforeUnload);
  campaignBeforeUnloadRegistered = false;
  window.setTimeout(() => syncCampaignBeforeUnload(), 0);
}

function guardCampaignNavigation(event) {
  if (event.defaultPrevented || typeof Element === "undefined") return;
  const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(target instanceof HTMLAnchorElement) || typeof window === "undefined") return;
  const destination = new URL(target.href, window.location.href);
  const current = new URL(window.location.href);
  const decision = studioCampaignNavigationDecision({
    dirty: campaignDirty(),
    button: typeof event.button === "number" ? event.button : 0,
    ctrlKey: event.ctrlKey === true,
    metaKey: event.metaKey === true,
    shiftKey: event.shiftKey === true,
    altKey: event.altKey === true,
    download: target.download.length > 0,
    target: target.target,
    sameOrigin: destination.origin === current.origin,
    hashOnly: destination.origin === current.origin && destination.pathname === current.pathname &&
      destination.search === current.search && destination.hash !== current.hash
  });
  if (decision !== "confirm") return;
  if (!confirmCampaignExit("Leave this Draft without saving?")) {
    event.preventDefault();
    return;
  }
  suspendCampaignBeforeUnloadOnce();
}

function campaignNotice(kind, message, options = {}) {
  campaignStudioState.notice = { kind, message, ...options };
}

function currentDraftCampaign(campaignId) {
  return campaignStudioState.campaigns.find((campaign) =>
    campaign.kind === "draft" && campaign.editor.campaignId === campaignId
  ) ?? null;
}

function campaignNextVersionNumber() {
  return campaignStudioState.versions.reduce((highest, version) =>
    Number.isSafeInteger(version?.versionNumber) && version.versionNumber > highest
      ? version.versionNumber : highest, 0) + 1;
}

function publishDialog() {
  if (typeof document === "undefined") return null;
  const dialog = document.getElementById("studio-publish-confirmation");
  return dialog instanceof HTMLDialogElement ? dialog : null;
}

export function studioCampaignPublishConfirmationCancelDecision(state, eventType) {
  const focus = typeof state?.publishConfirmation?.focus === "string"
    ? state.publishConfirmation.focus
    : null;
  if (eventType !== "cancel" && eventType !== "escape") return { close: false, restoreFocus: null };
  if (state?.publishing === true) return { close: false, restoreFocus: null };
  return { close: true, restoreFocus: focus };
}

function renderPublishConfirmation() {
  const dialog = publishDialog();
  const confirmation = campaignStudioState.publishConfirmation;
  if (dialog === null || confirmation === null) return;
  const facts = dialog.querySelector("[data-studio-publish-facts]");
  const form = dialog.querySelector(".studio-publish-dialog-content");
  const cancel = dialog.querySelector("[data-studio-publish-cancel]");
  const submit = dialog.querySelector("[data-studio-publish-submit]");
  if (!(facts instanceof HTMLElement) || !(form instanceof HTMLFormElement) ||
    !(cancel instanceof HTMLButtonElement) || !(submit instanceof HTMLButtonElement)) return;
  const factList = element("dl", "studio-publish-facts");
  factList.append(
    definition("Campaign", confirmation.name),
    definition("Proposed version", `Version ${confirmation.versionNumber}`),
    definition("Saved revision", String(confirmation.revision)),
    definition("Network", "GIWA Sepolia testnet"),
    definition("Assets", "Mock assets only")
  );
  facts.replaceChildren(factList);
  if (campaignStudioState.publishing) {
    dialog.setAttribute("aria-busy", "true");
    form.setAttribute("aria-busy", "true");
  } else {
    dialog.removeAttribute("aria-busy");
    form.removeAttribute("aria-busy");
  }
  cancel.disabled = campaignStudioState.publishing;
  submit.disabled = campaignStudioState.publishing;
  submit.textContent = campaignStudioState.publishing ? "Publishing public preview…" : "Publish public preview";
}

function closePublishConfirmation({ restoreFocus = true, force = false, eventType = "cancel" } = {}) {
  const dialog = publishDialog();
  const decision = force
    ? { close: true, restoreFocus: campaignStudioState.publishConfirmation?.focus ?? null }
    : studioCampaignPublishConfirmationCancelDecision(campaignStudioState, eventType);
  if (!decision.close) return false;
  campaignStudioState.publishConfirmation = null;
  if (dialog?.open) dialog.close();
  if (restoreFocus) restoreCampaignFocus(decision.restoreFocus);
  return true;
}

function openPublishConfirmation() {
  const editor = campaignStudioState.editor;
  if (editor === null || !studioCampaignPublishAllowed(campaignStudioState) || campaignStudioState.versionsLoading) return;
  const dialog = publishDialog();
  if (dialog === null) return;
  campaignStudioState.publishConfirmation = {
    campaignId: editor.campaignId,
    name: editor.name,
    revision: editor.revision,
    versionNumber: campaignNextVersionNumber(),
    focus: "publish"
  };
  renderPublishConfirmation();
  if (!dialog.open) dialog.showModal();
  const submit = dialog.querySelector("[data-studio-publish-submit]");
  if (submit instanceof HTMLElement) submit.focus({ preventScroll: true });
}

function renderCampaignVersions(editorRegion, editor) {
  if (editor.mode !== "edit" || editor.campaignId === "gasok-demo") return;
  const section = element("section", "studio-version-history");
  section.setAttribute("aria-labelledby", "studio-version-history-title");
  const title = element("h4", "studio-version-history-title", "Published Versions");
  title.id = "studio-version-history-title";
  section.append(title);
  if (campaignStudioState.versionsLoading) {
    section.append(element("p", "studio-version-history-state", "Loading published Versions…"));
  } else if (!campaignStudioState.versionsReady) {
    section.append(element("p", "studio-version-history-state", "Published Version history is unavailable."));
  } else if (campaignStudioState.versions.length === 0) {
    section.append(element("p", "studio-version-history-state", "No public previews yet."));
  } else {
    const list = element("ul", "studio-version-list");
    for (const version of campaignStudioState.versions) {
      const row = element("li", "studio-version-row");
      const link = element("a", "studio-version-link", `Version ${version.versionNumber}`);
      link.href = version.publicPath;
      const hash = element("span", "studio-version-hash", version.campaignVersionHash);
      row.append(link, hash);
      list.append(row);
    }
    section.append(list);
  }
  editorRegion.append(section);
}

function renderCampaignStatus(status) {
  const notice = campaignStudioState.notice;
  if (notice === null) {
    status.textContent = campaignStudioState.loading
      ? "Loading Campaign Drafts…"
      : "";
    return;
  }
  const { message: noticeText, action: noticeAction } = notice;
  status.classList.add(`studio-campaign-status-${notice.kind}`);
  status.append(document.createTextNode(noticeText));
  if (noticeAction === "reload-latest") {
    const reload = actionButton("Reload latest", "studio-secondary-action studio-campaign-reload", "reload-latest");
    reload.dataset.studioCampaignFocus = "reload";
    reload.disabled = campaignControlsAreBusy();
    reload.addEventListener("click", reloadLatestCampaign);
    status.append(reload);
  }
  if (noticeAction === "open-latest" && typeof notice.publicPath === "string") {
    const latest = element("a", "studio-secondary-action studio-campaign-open-latest", "Open latest public preview");
    latest.href = notice.publicPath;
    latest.dataset.studioCampaignFocus = "open-latest";
    status.append(latest);
  }
}

function renderCampaignList(list) {
  const drafts = campaignStudioState.campaigns.filter((campaign) => campaign.kind === "draft");
  const baseline = element("article", "studio-campaign-card studio-campaign-baseline");
  baseline.append(
    element("p", "eyebrow", "Published baseline"),
    element("h3", "studio-campaign-card-title", "Mock Vault Deposit · Testnet only"),
    element("p", "studio-campaign-card-copy", "Read only")
  );
  const evidence = element("a", "studio-campaign-evidence", "View public evidence");
  evidence.href = "/partner";
  baseline.append(evidence);
  list.append(baseline);

  if (campaignStudioState.loading) {
    list.append(element("p", "studio-campaign-list-state", "Loading Drafts…"));
    return;
  }
  if (drafts.length === 0) {
    list.append(element("p", "studio-campaign-list-state", "No Drafts yet. Start a new Draft to prepare private testnet copy."));
    return;
  }
  for (const campaign of drafts) {
    const card = actionButton("", "studio-campaign-card", "select-draft");
    card.dataset.studioCampaignFocus = `draft-${campaign.editor.campaignId}`;
    card.disabled = campaignControlsAreBusy();
    if (campaignStudioState.editor?.campaignId === campaign.editor.campaignId) {
      card.setAttribute("aria-current", "true");
    }
    card.append(
      element("span", "studio-campaign-card-state", "Draft"),
      element("span", "studio-campaign-card-title", campaign.name),
      element("span", "studio-campaign-card-copy", campaign.summary || "No Draft summary"),
      element("span", "studio-campaign-card-context", "Mock Vault Deposit · Testnet only"),
      element("span", "studio-campaign-card-updated", campaign.updatedAt)
    );
    card.addEventListener("pointerdown", rememberCampaignFocus);
    card.addEventListener("keydown", rememberCampaignFocus);
    card.addEventListener("click", () => selectDraftCampaign(campaign.editor.campaignId));
    list.append(card);
  }
}

function renderCampaignEditor(editorRegion) {
  const editor = campaignStudioState.editor;
  if (editor === null) {
    editorRegion.append(
      element("h3", "studio-campaign-editor-title", "Draft editor"),
      element("p", "studio-campaign-editor-empty", "Select a Draft or start a new Draft. Saving remains private to this organization.")
    );
    return;
  }
  const notice = campaignStudioState.notice;
  const validationField = notice?.kind === "validation" ? notice.field : null;
  const form = element("form", "studio-campaign-form");
  form.noValidate = true;
  const title = element("h3", "studio-campaign-editor-title", editor.mode === "create" ? "New Draft" : "Edit Draft");
  const context = element("p", "studio-campaign-editor-context", "Mock Vault Deposit · Testnet only");
  const nameLabel = element("label", "studio-campaign-label", "Draft name");
  nameLabel.htmlFor = "studio-campaign-name";
  const name = document.createElement("input");
  name.id = "studio-campaign-name";
  name.name = "name";
  name.type = "text";
  name.value = editor.name;
  name.required = true;
  name.disabled = campaignControlsAreBusy();
  name.dataset.studioCampaignFocus = "name";
  name.setAttribute(
    "aria-describedby",
    validationField === "name"
      ? "studio-campaign-name-help studio-campaign-name-error"
      : "studio-campaign-name-help"
  );
  if (validationField === "name") name.setAttribute("aria-invalid", "true");
  name.addEventListener("focus", rememberCampaignFocus);
  name.addEventListener("input", () => updateCampaignEditor("name", name.value, "name"));
  const nameHelp = element("p", "studio-campaign-help", `${campaignStudioState.limits.name} characters maximum`);
  nameHelp.id = "studio-campaign-name-help";
  const summaryLabel = element("label", "studio-campaign-label", "Draft summary");
  summaryLabel.htmlFor = "studio-campaign-summary";
  const summary = document.createElement("textarea");
  summary.id = "studio-campaign-summary";
  summary.name = "summary";
  summary.value = editor.summary;
  summary.disabled = campaignControlsAreBusy();
  summary.dataset.studioCampaignFocus = "summary";
  summary.setAttribute(
    "aria-describedby",
    validationField === "summary"
      ? "studio-campaign-summary-help studio-campaign-summary-error"
      : "studio-campaign-summary-help"
  );
  if (validationField === "summary") summary.setAttribute("aria-invalid", "true");
  summary.addEventListener("focus", rememberCampaignFocus);
  summary.addEventListener("input", () => updateCampaignEditor("summary", summary.value, "summary"));
  const summaryHelp = element("p", "studio-campaign-help", `${campaignStudioState.limits.summary} characters maximum`);
  summaryHelp.id = "studio-campaign-summary-help";
  const validation = validationField === "name" || validationField === "summary"
    ? element("p", "studio-campaign-validation", (() => {
      const { message: noticeText } = notice;
      return noticeText;
    })())
    : null;
  if (validation !== null) validation.id = `studio-campaign-${validationField}-error`;
  const save = actionButton(
    campaignStudioState.saving ? "Saving Draft…" : "Save Draft",
    "studio-primary-action studio-campaign-save",
    "save-draft"
  );
  save.dataset.studioCampaignFocus = "save";
  save.type = "submit";
  save.disabled = !studioCampaignSaveAllowed(campaignStudioState);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveCampaignDraft();
  });
  form.append(title, context, nameLabel, name, nameHelp, summaryLabel, summary, summaryHelp);
  if (validation !== null) form.append(validation);
  form.append(save);
  const publishState = studioCampaignPublishControlState(campaignStudioState);
  if (publishState.visible) {
    const publish = actionButton(
      "Publish public preview",
      "studio-secondary-action studio-campaign-publish",
      "publish-public-preview"
    );
    publish.dataset.studioCampaignFocus = "publish";
    publish.disabled = publishState.disabled;
    publish.addEventListener("click", openPublishConfirmation);
    form.append(publish);
  }
  editorRegion.append(form);
  renderCampaignVersions(editorRegion, editor);
}

function renderCampaignPanel() {
  const panel = element("section", "studio-campaign-panel");
  panel.setAttribute("aria-labelledby", "studio-campaign-title");
  const heading = element("div", "studio-campaign-heading");
  const headingCopy = element("div", "studio-campaign-heading-copy");
  const title = element("h2", "studio-campaign-title", "Campaign Drafts");
  title.id = "studio-campaign-title";
  headingCopy.append(title, element("p", "studio-campaign-intro", "Prepare owner-visible Draft copy for the GIWA Sepolia testnet."));
  const create = actionButton("New draft", "studio-secondary-action studio-campaign-new", "new-draft");
  create.dataset.studioCampaignFocus = "new";
  create.disabled = campaignControlsAreBusy();
  create.addEventListener("pointerdown", rememberCampaignFocus);
  create.addEventListener("keydown", rememberCampaignFocus);
  create.addEventListener("click", startNewDraft);
  heading.append(headingCopy, create);
  const boundary = element(
    "p",
    "studio-draft-boundary",
    "Saving a Draft does not publish it, execute a transaction, or change the public demo."
  );
  const layout = element("div", "studio-campaign-layout");
  const list = element("section", "studio-campaign-list");
  list.setAttribute("aria-label", "Campaign list");
  const editor = element("section", "studio-campaign-editor");
  editor.setAttribute("aria-label", "Draft editor");
  renderCampaignList(list);
  renderCampaignEditor(editor);
  layout.append(list, editor);
  const status = element("p", "studio-campaign-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  renderCampaignStatus(status);
  panel.append(heading, boundary, layout, status);
  return panel;
}

export function renderAuthenticatedStudio(session, options = {}) {
  const root = studioRoot();
  if (!root) return null;

  const organization = session.organization;
  const member = session.member;
  const header = dossierHeader(member.walletAddress);
  const workspace = element("section", "studio-workspace protocol-screen");
  const card = element("section", "studio-organization-card");
  card.setAttribute("aria-labelledby", "studio-organization-name");
  const name = element("h1", "studio-organization-name", organization.displayName);
  name.id = "studio-organization-name";
  const details = element("dl", "studio-organization-details");
  details.append(
    definition("Wallet", member.walletAddress, "studio-wallet-address"),
    definition("Role", member.role),
    definition("Network", "GIWA Sepolia · Testnet"),
    definition("Session expires", localizedExpiry(session.expiresAt))
  );
  const logout = actionButton("Sign out", "studio-secondary-action", "sign-out");
  logout.dataset.studioCampaignFocus = "sign-out";
  logout.disabled = campaignControlsAreBusy();
  logout.addEventListener("pointerdown", rememberCampaignFocus);
  logout.addEventListener("keydown", rememberCampaignFocus);
  logout.addEventListener("click", logoutStudio);
  card.append(name, details, logout);
  workspace.append(card, renderCampaignPanel());
  replaceStudioContent(root, header ? [header, workspace] : [workspace]);
  restoreCampaignFocus(options.focus ?? activeCampaignFocus());
  return workspace;
}

function renderCurrentCampaignStudio(focus = null) {
  if (campaignStudioState.session !== null) {
    renderAuthenticatedStudio(campaignStudioState.session, { focus });
  }
}

function clearCampaignValidationPresentation(field) {
  if (typeof document === "undefined") return;
  const control = document.getElementById(`studio-campaign-${field}`);
  if (control instanceof HTMLElement) {
    control.removeAttribute("aria-invalid");
    control.setAttribute("aria-describedby", `studio-campaign-${field}-help`);
  }
  document.getElementById(`studio-campaign-${field}-error`)?.remove();
}

function updateCampaignDirtyPresentation(focus) {
  if (typeof document === "undefined") return;
  const status = document.querySelector(".studio-campaign-status");
  if (!(status instanceof HTMLElement)) return;
  status.className = "studio-campaign-status studio-campaign-status-selected";
  status.replaceChildren(document.createTextNode("Draft has unsaved changes."));
  restoreCampaignFocus(focus);
}

function updateCampaignCleanPresentation() {
  if (typeof document === "undefined") return;
  const status = document.querySelector(".studio-campaign-status");
  if (!(status instanceof HTMLElement)) return;
  status.className = "studio-campaign-status";
  status.replaceChildren();
}

function syncCampaignSaveControl() {
  if (typeof document === "undefined") return;
  const save = document.querySelector(".studio-campaign-save");
  if (save instanceof HTMLButtonElement) {
    save.disabled = studioCampaignSaveControlState(campaignStudioState).disabled;
  }
}

function syncCampaignPublishControl() {
  if (typeof document === "undefined") return;
  const publish = document.querySelector(".studio-campaign-publish");
  if (publish instanceof HTMLButtonElement) {
    const state = studioCampaignPublishControlState(campaignStudioState);
    publish.disabled = state.disabled;
  }
}

function updateCampaignEditor(field, value, focus) {
  const next = studioCampaignEditorInputState(campaignStudioState, field, value);
  if (!next.accepted) return;
  campaignStudioState.editor = next.editor;
  syncCampaignSaveControl();
  syncCampaignPublishControl();
  const presentation = studioCampaignInputPresentationDecision(campaignStudioState.notice, next.editor);
  if (presentation.clearNotice) {
    campaignStudioState.notice = null;
    if (presentation.field !== null) clearCampaignValidationPresentation(presentation.field);
  }
  syncCampaignBeforeUnload();
  if (presentation.status === "dirty") updateCampaignDirtyPresentation(focus);
  if (presentation.status === "clean") updateCampaignCleanPresentation();
}

function startNewDraft() {
  if (campaignControlsAreBusy() || !confirmDiscardCampaignEditor()) return;
  campaignStudioState.editor = emptyStudioCampaignEditor();
  campaignStudioState.versions = [];
  campaignStudioState.versionsReady = false;
  campaignStudioState.publishConfirmation = null;
  campaignNotice("new", "New Draft ready. Add a name before saving.");
  syncCampaignBeforeUnload();
  renderCurrentCampaignStudio("name");
}

function selectDraftCampaign(campaignId) {
  if (campaignControlsAreBusy()) return;
  const draft = currentDraftCampaign(campaignId);
  if (draft === null || campaignStudioState.editor?.campaignId === campaignId) return;
  if (!confirmDiscardCampaignEditor()) return;
  campaignStudioState.editor = { ...draft.editor };
  campaignStudioState.versions = [];
  campaignStudioState.versionsReady = false;
  campaignStudioState.publishConfirmation = null;
  campaignNotice("selected", "Draft selected.");
  syncCampaignBeforeUnload();
  renderCurrentCampaignStudio(`draft-${campaignId}`);
  void loadCampaignVersionHistory(campaignStudioState.session, campaignId);
}

function campaignFailure(error) {
  const presentation = studioCampaignFailurePresentation(error);
  const { kind, message, action } = presentation;
  return { kind, message, action };
}

function endCampaignSession() {
  wrongNetworkWallet = null;
  renderStudioGate({ state: "session-expired" });
}

async function loadStudioCampaigns(session, options = {}) {
  updateCampaignRequestState("refresh-start");
  campaignStudioState.notice = null;
  renderCurrentCampaignStudio(options.focus ?? null);
  try {
    const payload = await authFetch("/api/studio/campaigns");
    if (campaignStudioState.session !== session) return;
    const next = campaignListFromPayload(payload);
    campaignStudioState.campaigns = next.campaigns;
    campaignStudioState.limits = next.limits;
    const savedDraft = typeof options.selectedId === "string"
      ? currentDraftCampaign(options.selectedId)
      : null;
    const selection = studioCampaignRefetchSelectionState({
      expectedId: options.expectedSelectedId ?? options.selectedId,
      listEditor: savedDraft?.editor ?? null,
      fallbackEditor: options.fallbackEditor ?? null
    });
    const previousCampaignId = campaignStudioState.editor?.campaignId ?? null;
    if (options.replaceEditor === true || campaignStudioState.editor === null) {
      campaignStudioState.editor = selection.editor === null ? null : { ...selection.editor };
    }
    if (campaignStudioState.editor?.campaignId !== previousCampaignId) {
      campaignStudioState.versions = [];
      campaignStudioState.versionsReady = false;
      campaignStudioState.publishConfirmation = null;
    }
    updateCampaignRequestState("refresh-success");
    if (selection.consistent && typeof options.notice === "string") {
      campaignNotice("saved", options.notice);
    } else if (options.fallbackEditor !== null && options.fallbackEditor !== undefined) {
      const inconsistency = studioCampaignInconsistentRefreshPresentation(options.inconsistentNotice);
      if (inconsistency !== null) {
        campaignNotice(inconsistency.kind, inconsistency.message, { action: inconsistency.action });
      }
    }
    syncCampaignBeforeUnload();
    renderCurrentCampaignStudio(options.focus ?? null);
    if (campaignStudioState.editor?.mode === "edit") {
      void loadCampaignVersionHistory(session, campaignStudioState.editor.campaignId);
    }
  } catch (error) {
    if (campaignStudioState.session !== session) return;
    const failure = campaignFailure(error);
    if (failure.kind === "session-expired") {
      endCampaignSession();
      return;
    }
    updateCampaignRequestState("refresh-failure");
    campaignNotice(failure.kind, failure.message, { action: failure.action });
    renderCurrentCampaignStudio(options.focus ?? null);
  }
}

async function loadCampaignVersionHistory(session, campaignId) {
  const editor = campaignStudioState.editor;
  if (session === null || editor?.mode !== "edit" || editor.campaignId !== campaignId ||
    campaignStudioState.publishing || campaignStudioState.versionsLoading) return;
  campaignStudioState.versions = [];
  updateCampaignRequestState("versions-start");
  renderCurrentCampaignStudio(null);
  try {
    const payload = await authFetch(`/api/studio/campaigns/${encodeURIComponent(campaignId)}/versions`);
    if (campaignStudioState.session !== session || campaignStudioState.editor?.campaignId !== campaignId) return;
    const versions = studioCampaignVersionHistoryFromPayload(payload, campaignId);
    if (versions === null) throw { status: 503, code: "service_unavailable" };
    campaignStudioState.versions = versions;
    updateCampaignRequestState("versions-success");
    renderCurrentCampaignStudio(null);
  } catch (error) {
    if (campaignStudioState.session !== session) return;
    const failure = campaignFailure(error);
    if (failure.kind === "session-expired") {
      endCampaignSession();
      return;
    }
    updateCampaignRequestState("versions-failure");
    campaignNotice("service-unavailable", "Published Version history is unavailable. Please try again.");
    renderCurrentCampaignStudio(null);
  }
}

async function saveCampaignDraft() {
  const editor = campaignStudioState.editor;
  const session = campaignStudioState.session;
  if (editor === null || session === null || !studioCampaignSaveAllowed(campaignStudioState)) return;
  const validation = validateStudioCampaignEditor(editor, campaignStudioState.limits);
  if (!validation.ok) {
    campaignNotice("validation", validation.message, { field: validation.field });
    renderCurrentCampaignStudio(validation.field);
    return;
  }

  updateCampaignRequestState("save-start");
  campaignStudioState.notice = null;
  renderCurrentCampaignStudio("save");
  try {
    const payload = editor.mode === "create"
      ? createStudioCampaignPayload(editor)
      : updateStudioCampaignPayload(editor);
    let saved;
    if (editor.mode === "create") {
      saved = await authFetch("/api/studio/campaigns", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } else {
      saved = await authFetch(`/api/studio/campaigns/${encodeURIComponent(editor.campaignId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
    const savedEditor = editorFromStudioCampaign(saved);
    const mutation = studioCampaignMutationResponseState(campaignStudioState, savedEditor);
    Object.assign(campaignStudioState, mutation.state);
    syncCampaignBeforeUnload();
    if (!mutation.accepted) {
      renderCurrentCampaignStudio("save");
      return;
    }
    await loadStudioCampaigns(session, {
      selectedId: savedEditor.campaignId,
      expectedSelectedId: savedEditor.campaignId,
      fallbackEditor: savedEditor,
      inconsistentNotice: "save-omission",
      replaceEditor: true,
      notice: editor.mode === "create" ? "Draft created." : "Draft saved.",
      focus: "name"
    });
  } catch (error) {
    if (campaignStudioState.session !== session) return;
    const failure = campaignFailure(error);
    if (failure.kind === "session-expired") {
      endCampaignSession();
      return;
    }
    updateCampaignRequestState("save-failure");
    campaignNotice(failure.kind, failure.message, { action: failure.action });
    renderCurrentCampaignStudio(failure.action === "reload-latest" ? "reload" : "save");
  }
}

async function reloadLatestCampaign() {
  const session = campaignStudioState.session;
  const editor = campaignStudioState.editor;
  if (session === null || editor === null || campaignControlsAreBusy()) return;
  await loadStudioCampaigns(session, {
    selectedId: editor.campaignId,
    expectedSelectedId: editor.campaignId,
    fallbackEditor: editor,
    inconsistentNotice: "reload-latest",
    replaceEditor: true,
    notice: "Latest Draft reloaded.",
    focus: "name"
  });
}

async function publishCampaignPreview() {
  const editor = campaignStudioState.editor;
  const session = campaignStudioState.session;
  const confirmation = campaignStudioState.publishConfirmation;
  if (editor === null || session === null || confirmation === null || campaignStudioState.publishing ||
    !studioCampaignPublishAllowed(campaignStudioState) || confirmation.campaignId !== editor.campaignId ||
    confirmation.revision !== editor.revision) return;

  updateCampaignRequestState("publish-start");
  renderPublishConfirmation();
  renderCurrentCampaignStudio(null);
  try {
    const published = await authFetch(`/api/studio/campaigns/${encodeURIComponent(editor.campaignId)}/publish`, {
      method: "POST",
      body: JSON.stringify(studioCampaignPublishPayload(editor))
    });
    if (campaignStudioState.session !== session || campaignStudioState.editor?.campaignId !== editor.campaignId) return;
    const publication = studioCampaignPublicationFromPayload(published, editor.campaignId);
    if (publication === null) throw { status: 503, code: "service_unavailable" };
    updateCampaignRequestState("publish-success");
    closePublishConfirmation({ restoreFocus: false });
    campaignNotice("saved", `Published Version ${publication.versionNumber}.`);
    renderCurrentCampaignStudio(null);
    await loadCampaignVersionHistory(session, editor.campaignId);
  } catch (error) {
    if (campaignStudioState.session !== session) return;
    const failure = studioCampaignPublishFailurePresentation(error, editor.campaignId);
    if (failure.kind === "session-expired") {
      updateCampaignRequestState("publish-failure");
      endCampaignSession();
      return;
    }
    updateCampaignRequestState("publish-failure");
    campaignNotice(failure.kind, failure.message, {
      action: failure.action,
      publicPath: failure.latest?.publicPath
    });
    if (failure.action !== null) {
      closePublishConfirmation({ restoreFocus: false });
    } else {
      renderPublishConfirmation();
    }
    renderCurrentCampaignStudio(null);
  }
}

async function authFetch(path, options = {}) {
  const method = options.method ?? "GET";
  const requestOptions = {
    ...options,
    method,
    credentials: "same-origin"
  };
  if (method === "POST" || method === "PATCH") {
    requestOptions.headers = {
      "content-type": "application/json",
      ...(options.headers ?? {})
    };
  }

  const response = await fetch(path, requestOptions);
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw {
      name: "StudioAuthError",
      code: typeof payload?.error === "string" ? payload.error : "service_unavailable",
      status: response.status,
      existingVersion: payload?.existingVersion
    };
  }
  return payload;
}

function setupPublishConfirmation() {
  const dialog = publishDialog();
  if (dialog === null || dialog.dataset.studioPublishBound === "true") return;
  dialog.dataset.studioPublishBound = "true";
  const cancel = dialog.querySelector("[data-studio-publish-cancel]");
  const submit = dialog.querySelector("[data-studio-publish-submit]");
  if (cancel instanceof HTMLButtonElement) {
    cancel.addEventListener("click", () => {
      closePublishConfirmation({ eventType: "cancel" });
    });
  }
  if (submit instanceof HTMLButtonElement) {
    submit.addEventListener("click", () => {
      void publishCampaignPreview();
    });
  }
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePublishConfirmation({ eventType: "escape" });
  });
}

function isProviderRejection(error) {
  return typeof error === "object" && error !== null && error.code === 4001;
}

function renderOperationFailure(operation, error, walletAddress = null) {
  if (!isProviderRejection(error)) {
    renderStudioGate({ state: "retryable-error", walletAddress });
    return;
  }

  const rejectionCopy = {
    account: "지갑 연결 요청을 취소했습니다. 다시 연결할 수 있습니다.",
    "network-switch": "네트워크 전환 요청을 취소했습니다. GIWA Sepolia로 전환해 주세요.",
    signature: "인증 서명을 취소했습니다. 트랜잭션은 제출되지 않았습니다."
  };
  renderStudioGate({
    state: operation === "network-switch" ? "wrong-network" : "disconnected",
    walletAddress,
    notice: rejectionCopy[operation]
  });
}

function providerFromUserAction() {
  const provider = globalThis.ethereum;
  return provider && typeof provider.request === "function" ? provider : null;
}

export function studioAuthFailurePresentation(error) {
  const code = typeof error === "object" && error !== null ? error.code : null;
  const status = typeof error === "object" && error !== null ? error.status : null;
  const notice = PUBLIC_ERROR_COPY[code] ??
    (status === 429 ? PUBLIC_ERROR_COPY.rate_limited : STATE_COPY["retryable-error"]);
  const state = code === "authentication_failed" ? "access-denied" : "retryable-error";
  return { state, notice };
}

function renderAuthFailure(error, walletAddress = null) {
  renderStudioGate({ ...studioAuthFailurePresentation(error), walletAddress });
}

export async function requestStudioChallengeSignature({
  challenge,
  walletAddress,
  provider,
  onSignaturePending
}) {
  const { challengeId, message } = challenge ?? {};
  if (
    typeof challengeId !== "string" ||
    challengeId.trim().length === 0 ||
    typeof message !== "string" ||
    message.trim().length === 0
  ) {
    throw {
      name: "StudioAuthError",
      code: "service_unavailable",
      status: 502
    };
  }

  onSignaturePending();
  const signature = await provider.request({
    method: "personal_sign",
    params: [message, walletAddress]
  });
  return { challengeId, message, signature };
}

async function connectWallet() {
  if (walletFlowBusy) return;
  const provider = providerFromUserAction();
  if (!provider) {
    renderStudioGate({ state: "wallet-unavailable" });
    return;
  }

  walletFlowBusy = true;
  let walletAddress = null;
  try {
    let accounts;
    try {
      accounts = await provider.request({ method: "eth_requestAccounts" });
    } catch (error) {
      renderOperationFailure("account", error);
      return;
    }
    walletAddress = Array.isArray(accounts) ? accounts[0] : null;
    if (typeof walletAddress !== "string") {
      renderStudioGate({ state: "disconnected", notice: "연결할 지갑 계정을 찾지 못했습니다." });
      return;
    }

    const chainValue = await provider.request({ method: "eth_chainId" });
    const chainId = Number.parseInt(chainValue, 16);
    if (chainId !== GIWA_CHAIN_ID) {
      wrongNetworkWallet = walletAddress;
      renderStudioGate({ state: "wrong-network", walletAddress });
      return;
    }

    renderStudioGate({ state: "challenge-loading", walletAddress });
    const challenge = await authFetch("/api/auth/challenge", {
      method: "POST",
      body: JSON.stringify({ walletAddress })
    });

    let signedChallenge;
    try {
      signedChallenge = await requestStudioChallengeSignature({
        challenge,
        walletAddress,
        provider,
        onSignaturePending: () => {
          renderStudioGate({ state: "signature-pending", walletAddress });
        }
      });
    } catch (error) {
      if (isProviderRejection(error)) {
        renderOperationFailure("signature", error, walletAddress);
        return;
      }
      throw error;
    }

    renderStudioGate({ state: "verifying", walletAddress });
    const session = await authFetch("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({
        challengeId: signedChallenge.challengeId,
        message: signedChallenge.message,
        signature: signedChallenge.signature
      })
    });
    wrongNetworkWallet = null;
    campaignStudioState.session = session;
    renderAuthenticatedStudio(session);
    await loadStudioCampaigns(session);
  } catch (error) {
    renderAuthFailure(error, walletAddress);
  } finally {
    finishWalletFlow();
  }
}

async function switchNetwork() {
  if (walletFlowBusy) return;
  const provider = providerFromUserAction();
  if (!provider) {
    renderStudioGate({ state: "wallet-unavailable" });
    return;
  }

  walletFlowBusy = true;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x164ce" }]
    });
    const walletAddress = wrongNetworkWallet;
    wrongNetworkWallet = null;
    renderStudioGate({
      state: "disconnected",
      walletAddress,
      notice: "GIWA Sepolia로 전환했습니다. 지갑을 다시 연결해 주세요."
    });
  } catch (error) {
    renderOperationFailure("network-switch", error, wrongNetworkWallet);
  } finally {
    finishWalletFlow();
  }
}

async function logoutStudio() {
  if (campaignControlsAreBusy()) return;
  if (!confirmCampaignExit("Sign out and discard unsaved Draft changes?")) return;
  try {
    await authFetch("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });
    wrongNetworkWallet = null;
    renderStudioGate({ state: "disconnected" });
  } catch (error) {
    const failure = campaignFailure(error);
    if (failure.kind === "session-expired") {
      endCampaignSession();
      return;
    }
    campaignNotice(failure.kind, failure.message, { action: failure.action });
    renderCurrentCampaignStudio("sign-out");
    syncCampaignBeforeUnload();
  }
}

async function boot() {
  if (!studioRoot()) return;
  setupPublishConfirmation();
  try {
    const session = await authFetch("/api/auth/session");
    if (session?.authenticated === true) {
      campaignStudioState.session = session;
      renderAuthenticatedStudio(session);
      await loadStudioCampaigns(session);
      return;
    }
    renderStudioGate({ state: "disconnected" });
  } catch (error) {
    renderAuthFailure(error);
  }
}

void boot();

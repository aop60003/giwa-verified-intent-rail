function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function isSafePositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function hasRequiredOwn(value, fields) {
  return fields.every((field) => hasOwn(value, field));
}

function hasExactOwn(value, fields) {
  if (!isRecord(value) || !hasRequiredOwn(value, fields)) return false;
  try {
    const keys = Reflect.ownKeys(value);
    return keys.length === fields.length && fields.every((field) => keys.includes(field));
  } catch {
    return false;
  }
}

function validPublicPath(campaignId, versionNumber, publicPath) {
  return typeof publicPath === "string" && publicPath === `/campaign/${campaignId}/v/${versionNumber}`;
}

function snapshotVersionReference(value, campaignId) {
  if (!hasExactOwn(value, ["versionNumber", "publicPath"])) return null;
  const versionNumber = value.versionNumber;
  const publicPath = value.publicPath;
  return isSafePositiveInteger(versionNumber) && validPublicPath(campaignId, versionNumber, publicPath)
    ? { versionNumber, publicPath }
    : null;
}

function snapshotCampaignVersion(value, campaignId) {
  const fields = [
    "campaignId", "versionNumber", "name", "summary", "actionTemplate", "sourceDraftRevision",
    "campaignVersionHash", "publishedAt", "publicPath"
  ];
  if (!hasExactOwn(value, fields)) return null;
  const snapshot = {
    campaignId: value.campaignId,
    versionNumber: value.versionNumber,
    name: value.name,
    summary: value.summary,
    actionTemplate: value.actionTemplate,
    sourceDraftRevision: value.sourceDraftRevision,
    campaignVersionHash: value.campaignVersionHash,
    publishedAt: value.publishedAt,
    publicPath: value.publicPath
  };
  return snapshot.campaignId === campaignId && isSafePositiveInteger(snapshot.versionNumber) &&
    typeof snapshot.name === "string" && typeof snapshot.summary === "string" &&
    snapshot.actionTemplate === "mockVaultDeposit" && isSafePositiveInteger(snapshot.sourceDraftRevision) &&
    typeof snapshot.campaignVersionHash === "string" && /^0x[a-f0-9]{64}$/u.test(snapshot.campaignVersionHash) &&
    typeof snapshot.publishedAt === "string" && snapshot.publishedAt.length > 0 &&
    validPublicPath(campaignId, snapshot.versionNumber, snapshot.publicPath) ? snapshot : null;
}

function snapshotCampaignPublication(value, campaignId) {
  const fields = ["campaignId", "versionNumber", "campaignVersionHash", "publishedAt", "publicPath"];
  if (!hasExactOwn(value, fields)) return null;
  const snapshot = {
    campaignId: value.campaignId,
    versionNumber: value.versionNumber,
    campaignVersionHash: value.campaignVersionHash,
    publishedAt: value.publishedAt,
    publicPath: value.publicPath
  };
  return snapshot.campaignId === campaignId && isSafePositiveInteger(snapshot.versionNumber) &&
    typeof snapshot.campaignVersionHash === "string" && /^0x[a-f0-9]{64}$/u.test(snapshot.campaignVersionHash) &&
    typeof snapshot.publishedAt === "string" && snapshot.publishedAt.length > 0 &&
    validPublicPath(campaignId, snapshot.versionNumber, snapshot.publicPath) ? snapshot : null;
}

function snapshotCampaign(campaign) {
  if (!isRecord(campaign) || !hasRequiredOwn(campaign, [
    "campaignId", "lifecycleState", "editable", "name", "summary", "revision"
  ])) {
    return null;
  }
  return {
    campaignId: campaign.campaignId,
    lifecycleState: campaign.lifecycleState,
    editable: campaign.editable,
    name: campaign.name,
    summary: campaign.summary,
    revision: campaign.revision
  };
}

function snapshotEditor(editor) {
  if (!isRecord(editor) || !hasRequiredOwn(editor, [
    "mode", "campaignId", "name", "summary", "revision", "initialName", "initialSummary"
  ])) {
    return null;
  }
  return {
    mode: editor.mode,
    campaignId: editor.campaignId,
    name: editor.name,
    summary: editor.summary,
    revision: editor.revision,
    initialName: editor.initialName,
    initialSummary: editor.initialSummary
  };
}

function snapshotEditorText(editor) {
  if (!isRecord(editor) || !hasRequiredOwn(editor, ["name", "summary"])) {
    return null;
  }
  return { name: editor.name, summary: editor.summary };
}

function snapshotLimits(limits) {
  if (!isRecord(limits) || !hasOwn(limits, "name") || !hasOwn(limits, "summary")) {
    return null;
  }
  const name = limits.name;
  const summary = limits.summary;
  return isSafePositiveInteger(name) && isSafePositiveInteger(summary) ? { name, summary } : null;
}

function normalizedText(value, allowLineFeed) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\r\n/g, "\n");
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    if (code === 0x0d || code === 0x7f || (code < 0x20 && (code !== 0x0a || !allowLineFeed))) {
      return null;
    }
  }

  return normalized.trim();
}

function validationFailure(field, message) {
  return { ok: false, field, message };
}

function validEditorShape(editor) {
  if (!isRecord(editor)) {
    return false;
  }
  if (editor.mode === "create") {
    return editor.campaignId === null
      && editor.revision === null
      && typeof editor.name === "string"
      && typeof editor.summary === "string"
      && typeof editor.initialName === "string"
      && typeof editor.initialSummary === "string";
  }
  return editor.mode === "edit"
    && typeof editor.campaignId === "string"
    && editor.campaignId.length > 0
    && isSafePositiveInteger(editor.revision)
    && typeof editor.name === "string"
    && typeof editor.summary === "string"
    && typeof editor.initialName === "string"
    && typeof editor.initialSummary === "string";
}

function normalizedPayloadText(editor) {
  const name = normalizedText(editor.name, false);
  const summary = normalizedText(editor.summary, true);
  if (name === null || summary === null || name.length === 0
    || [...name].length > 80 || [...summary].length > 280) {
    throw new TypeError("Invalid campaign editor");
  }
  return { name, summary };
}

export function emptyStudioCampaignEditor() {
  return {
    mode: "create",
    campaignId: null,
    name: "",
    summary: "",
    revision: null,
    initialName: "",
    initialSummary: ""
  };
}

export function editorFromStudioCampaign(campaign) {
  try {
    const snapshot = snapshotCampaign(campaign);
    if (snapshot === null
      || snapshot.campaignId === "gasok-demo"
      || snapshot.lifecycleState !== "draft"
      || snapshot.editable !== true
      || typeof snapshot.campaignId !== "string"
      || snapshot.campaignId.length === 0
      || typeof snapshot.name !== "string"
      || typeof snapshot.summary !== "string"
      || !isSafePositiveInteger(snapshot.revision)) {
      return null;
    }
    return {
      mode: "edit",
      campaignId: snapshot.campaignId,
      name: snapshot.name,
      summary: snapshot.summary,
      revision: snapshot.revision,
      initialName: snapshot.name,
      initialSummary: snapshot.summary
    };
  } catch {
    return null;
  }
}

export function validateStudioCampaignEditor(editor, limits) {
  try {
    const limitSnapshot = snapshotLimits(limits);
    if (limitSnapshot === null) {
      return validationFailure("name", "Campaign limits are unavailable.");
    }
    const editorSnapshot = snapshotEditorText(editor);
    if (editorSnapshot === null || typeof editorSnapshot.name !== "string") {
      return validationFailure("name", "Enter a Draft name.");
    }
    const name = normalizedText(editorSnapshot.name, false);
    if (name === null) {
      return validationFailure("name", "Draft names use supported single-line text.");
    }
    if (name.length === 0) {
      return validationFailure("name", "Enter a Draft name.");
    }
    if ([...name].length > limitSnapshot.name) {
      return validationFailure("name", "Draft name is too long.");
    }
    if (typeof editorSnapshot.summary !== "string") {
      return validationFailure("summary", "Draft summary uses supported text.");
    }
    const summary = normalizedText(editorSnapshot.summary, true);
    if (summary === null) {
      return validationFailure("summary", "Draft summary uses supported text.");
    }
    if ([...summary].length > limitSnapshot.summary) {
      return validationFailure("summary", "Draft summary is too long.");
    }
    return { ok: true, value: { name, summary } };
  } catch {
    return validationFailure("name", "Campaign text is unavailable.");
  }
}

export function studioCampaignEditorIsDirty(editor) {
  try {
    const snapshot = snapshotEditor(editor);
    return snapshot !== null
      && validEditorShape(snapshot)
      && (snapshot.name !== snapshot.initialName || snapshot.summary !== snapshot.initialSummary);
  } catch {
    return false;
  }
}

export function createStudioCampaignPayload(editor) {
  try {
    const snapshot = snapshotEditor(editor);
    if (snapshot === null || !validEditorShape(snapshot) || snapshot.mode !== "create") {
      throw new TypeError("Invalid campaign editor");
    }
    const value = normalizedPayloadText(snapshot);
    return { name: value.name, summary: value.summary };
  } catch {
    throw new TypeError("Invalid campaign editor");
  }
}

export function updateStudioCampaignPayload(editor) {
  try {
    const snapshot = snapshotEditor(editor);
    if (snapshot === null || !validEditorShape(snapshot) || snapshot.mode !== "edit") {
      throw new TypeError("Invalid campaign editor");
    }
    const value = normalizedPayloadText(snapshot);
    return { name: value.name, summary: value.summary, revision: snapshot.revision };
  } catch {
    throw new TypeError("Invalid campaign editor");
  }
}

export function studioCampaignPublishAllowed(state) {
  try {
    return state?.editor?.mode === "edit" && state.editor.campaignId !== null && state.editor.campaignId !== "gasok-demo" &&
      isSafePositiveInteger(state.editor.revision) && !studioCampaignEditorIsDirty(state.editor) &&
      state.loading !== true && state.saving !== true && state.publishing !== true &&
      state.versionsLoading !== true && state.versionsReady === true;
  } catch {
    return false;
  }
}

export function studioCampaignPublishPayload(editor) {
  try {
    const snapshot = snapshotEditor(editor);
    if (snapshot === null || !validEditorShape(snapshot) || snapshot.mode !== "edit") {
      throw new TypeError("Invalid campaign editor");
    }
    return { revision: snapshot.revision };
  } catch {
    throw new TypeError("Invalid campaign editor");
  }
}

export function studioCampaignVersionHistoryFromPayload(payload, campaignId) {
  try {
    if (typeof campaignId !== "string" || campaignId.length === 0 || !hasExactOwn(payload, ["versions"]) ||
      !Array.isArray(payload.versions)) return null;
    const versions = [];
    for (const value of payload.versions) {
      const version = snapshotCampaignVersion(value, campaignId);
      if (version === null) return null;
      versions.push(version);
    }
    return versions;
  } catch {
    return null;
  }
}

export function studioCampaignPublicationFromPayload(payload, campaignId) {
  try {
    if (typeof campaignId !== "string" || campaignId.length === 0) return null;
    return snapshotCampaignPublication(payload, campaignId);
  } catch {
    return null;
  }
}

export function studioCampaignPublishFailurePresentation(error, campaignId) {
  let status = null;
  let code = null;
  let latest = null;
  try {
    if (isRecord(error) && hasOwn(error, "status") && typeof error.status === "number") status = error.status;
    if (isRecord(error) && hasOwn(error, "code") && typeof error.code === "string") code = error.code;
    if (isRecord(error) && hasOwn(error, "existingVersion")) latest = snapshotVersionReference(error.existingVersion, campaignId);
  } catch {
    return { kind: "service-unavailable", message: "The public preview service is unavailable. Please try again.", retryable: true, action: null, latest: null };
  }
  if (status === 401) return { kind: "session-expired", message: "Your Studio session has ended. Sign in again.", retryable: false, action: "sign-in", latest: null };
  if (status === 409 && code === "revision_conflict") {
    return { kind: "revision-conflict", message: "This Draft changed elsewhere. Reload the latest revision.", retryable: false, action: "reload-latest", latest: null };
  }
  if (status === 409 && code === "already_published") {
    return { kind: "already-published", message: "This saved Draft revision is already public.", retryable: false, action: "open-latest", latest };
  }
  if (status === 409 && code === "no_changes_to_publish") {
    return { kind: "no-changes-to-publish", message: "The public preview already matches this Draft.", retryable: false, action: "open-latest", latest };
  }
  if (status === 429) return { kind: "rate-limited", message: "Too many publish requests. Please try again shortly.", retryable: true, action: null, latest: null };
  return { kind: "service-unavailable", message: "The public preview service is unavailable. Please try again.", retryable: true, action: null, latest: null };
}

export function studioCampaignFailurePresentation(error) {
  let status;
  try {
    status = isRecord(error) && typeof error.status === "number" ? error.status : null;
  } catch {
    status = null;
  }

  switch (status) {
    case 400:
      return { kind: "validation", message: "Check the Draft details and try again.", retryable: false, action: null };
    case 401:
      return { kind: "session-expired", message: "Your Studio session has ended. Sign in again.", retryable: false, action: "sign-in" };
    case 403:
      return { kind: "insufficient-access", message: "This Owner account cannot update this Draft.", retryable: false, action: null };
    case 404:
      return { kind: "not-found", message: "This Draft is no longer available.", retryable: false, action: null };
    case 409:
      return { kind: "revision-conflict", message: "This Draft changed elsewhere. Reload the latest version.", retryable: false, action: "reload-latest" };
    case 429:
      return { kind: "rate-limited", message: "Too many Draft updates. Please try again shortly.", retryable: true, action: null };
    default:
      return { kind: "service-unavailable", message: "The Draft service is unavailable. Please try again.", retryable: true, action: null };
  }
}

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

const limits = { name: 4, summary: 6 };

async function model() {
  // @ts-expect-error The dependency-free browser module intentionally has no declaration file.
  return import("../../../public/studio-campaign-model.js");
}

async function studioUi() {
  // @ts-expect-error The dependency-free browser module intentionally has no declaration file.
  return import("../../../public/studio.js");
}

describe("Studio Campaign editor presentation", () => {
  it("accepts publishing only for a clean saved Draft and emits an exact revision payload", async () => {
    const studio = await model();
    const clean = {
      mode: "edit", campaignId: "campaign_00000000-0000-4000-8000-000000000001", name: "Saved", summary: "",
      revision: 3, initialName: "Saved", initialSummary: ""
    };

    expect(studio.studioCampaignPublishAllowed({
      loading: false, saving: false, publishing: false, versionsReady: true, editor: clean
    })).toBe(true);
    for (const state of [
      { ...clean, mode: "create", campaignId: null, revision: null },
      { ...clean, name: "Changed" }
    ]) {
      expect(studio.studioCampaignPublishAllowed({
        loading: false, saving: false, publishing: false, versionsReady: true, editor: state
      })).toBe(false);
    }
    for (const pending of ["loading", "saving", "publishing", "versionsLoading"] as const) {
      expect(studio.studioCampaignPublishAllowed({
        loading: false, saving: false, publishing: false, versionsReady: true, [pending]: true, editor: clean
      })).toBe(false);
    }
    expect(studio.studioCampaignPublishAllowed({
      loading: false, saving: false, publishing: false, versionsReady: true,
      editor: { ...clean, campaignId: "gasok-demo" }
    })).toBe(false);
    expect(studio.studioCampaignPublishPayload({ ...clean, revision: 7, private: "ignored" })).toEqual({ revision: 7 });
    expect(() => studio.studioCampaignPublishPayload({ ...clean, revision: 0 })).toThrow("Invalid campaign editor");
  });

  it("allows publication only after strict Version history is ready", async () => {
    const studio = await model();
    const editor = {
      mode: "edit", campaignId: "campaign_00000000-0000-4000-8000-000000000001", name: "Saved", summary: "",
      revision: 3, initialName: "Saved", initialSummary: ""
    };
    const state = { editor, loading: false, saving: false, publishing: false, versionsLoading: false };

    expect(studio.studioCampaignPublishAllowed({ ...state, versionsReady: true })).toBe(true);
    expect(studio.studioCampaignPublishAllowed({ ...state, versionsReady: false })).toBe(false);
    expect(studio.studioCampaignPublishAllowed(state)).toBe(false);
  });

  it("strictly projects public version history and publication responses", async () => {
    const studio = await model();
    const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
    const version = {
      campaignId,
      versionNumber: 2,
      name: "Published Draft",
      summary: "Mock assets only",
      actionTemplate: "mockVaultDeposit",
      sourceDraftRevision: 4,
      campaignVersionHash: `0x${"a".repeat(64)}`,
      publishedAt: "2026-08-01T00:00:00.000Z",
      publicPath: `/campaign/${campaignId}/v/2`
    };

    expect(studio.studioCampaignVersionHistoryFromPayload({ versions: [] }, campaignId)).toEqual([]);
    expect(studio.studioCampaignVersionHistoryFromPayload({ versions: [version] }, campaignId)).toEqual([version]);
    expect(studio.studioCampaignVersionHistoryFromPayload({ versions: [], extra: true }, campaignId)).toBeNull();
    expect(studio.studioCampaignVersionHistoryFromPayload({ versions: [{ ...version, private: "no" }] }, campaignId)).toBeNull();
    expect(studio.studioCampaignVersionHistoryFromPayload({ versions: [{ ...version, campaignVersionHash: `0x${"A".repeat(64)}` }] }, campaignId)).toBeNull();
    expect(studio.studioCampaignVersionHistoryFromPayload({ versions: [{ ...version, publicPath: `/campaign/${campaignId}/v/3` }] }, campaignId)).toBeNull();
    expect(studio.studioCampaignVersionHistoryFromPayload(null, campaignId)).toBeNull();
    const publication = {
      campaignId,
      versionNumber: 2,
      campaignVersionHash: `0x${"a".repeat(64)}`,
      publishedAt: "2026-08-01T00:00:00.000Z",
      publicPath: `/campaign/${campaignId}/v/2`
    };
    expect(studio.studioCampaignPublicationFromPayload(publication, campaignId)).toEqual(publication);
    expect(studio.studioCampaignPublicationFromPayload({ ...publication, private: "no" }, campaignId)).toBeNull();
  });

  it("maps bounded publish conflicts to their exact user decisions", async () => {
    const studio = await model();
    expect(studio.studioCampaignPublishFailurePresentation({ status: 409, code: "revision_conflict" })).toEqual({
      kind: "revision-conflict", message: "This Draft changed elsewhere. Reload the latest revision.", retryable: false, action: "reload-latest", latest: null
    });
    for (const code of ["already_published", "no_changes_to_publish"]) {
      expect(studio.studioCampaignPublishFailurePresentation({ status: 409, code })).toMatchObject({ action: "open-latest", retryable: false });
    }
    expect(studio.studioCampaignPublishFailurePresentation({ status: 401, code: "authentication_required" }))
      .toMatchObject({ kind: "session-expired", action: "sign-in" });
    expect(studio.studioCampaignPublishFailurePresentation({ status: 429, code: "rate_limited" })).toMatchObject({ retryable: true });
    expect(studio.studioCampaignPublishFailurePresentation({ status: 503, code: "service_unavailable" })).toMatchObject({ retryable: true });
  });

  it("opens only the exact immutable version linked by a duplicate publish response", async () => {
    const studio = await model();
    const campaignId = "campaign_00000000-0000-4000-8000-000000000001";
    const duplicate = studio.studioCampaignPublishFailurePresentation({
      status: 409,
      code: "already_published",
      existingVersion: { versionNumber: 1, publicPath: `/campaign/${campaignId}/v/1` }
    }, campaignId);

    expect(duplicate).toMatchObject({
      kind: "already-published",
      action: "open-latest",
      latest: { versionNumber: 1, publicPath: `/campaign/${campaignId}/v/1` }
    });
    expect(studio.studioCampaignPublishFailurePresentation({
      status: 409,
      code: "already_published",
      existingVersion: { versionNumber: 2, publicPath: `/campaign/${campaignId}/v/1` }
    }, campaignId)).toMatchObject({ latest: null });
  });

  it("keeps a pending confirmation non-cancellable and restores its trigger after it settles", async () => {
    const studio = await studioUi();
    const pending = {
      publishing: true,
      publishConfirmation: { focus: "publish" }
    };
    const settled = { ...pending, publishing: false };

    expect(studio.studioCampaignPublishConfirmationCancelDecision(pending, "cancel"))
      .toEqual({ close: false, restoreFocus: null });
    expect(studio.studioCampaignPublishConfirmationCancelDecision(pending, "escape"))
      .toEqual({ close: false, restoreFocus: null });
    expect(studio.studioCampaignPublishConfirmationCancelDecision(settled, "cancel"))
      .toEqual({ close: true, restoreFocus: "publish" });
    expect(studio.studioCampaignPublishConfirmationCancelDecision(settled, "escape"))
      .toEqual({ close: true, restoreFocus: "publish" });
  });

  it("synchronizes the saved-Draft publish control from clean to dirty to clean without replacing inputs", async () => {
    const studio = await studioUi();
    const source = readWebFile("public/studio.js");
    const cleanEditor = {
      mode: "edit", campaignId: "campaign_00000000-0000-4000-8000-000000000001", name: "Saved", summary: "",
      revision: 3, initialName: "Saved", initialSummary: ""
    };
    const cleanState = {
      editor: cleanEditor, loading: false, saving: false, publishing: false, versionsLoading: false, versionsReady: true
    };
    const dirtyEditor = studio.studioCampaignEditorInputState(cleanState, "summary", "Changed").editor;
    const dirtyState = { ...cleanState, editor: dirtyEditor };
    const revertedEditor = studio.studioCampaignEditorInputState(dirtyState, "summary", "").editor;

    expect(studio.studioCampaignPublishControlState(cleanState))
      .toEqual({ visible: true, eligible: true, disabled: false });
    expect(studio.studioCampaignPublishControlState(dirtyState))
      .toEqual({ visible: true, eligible: false, disabled: true });
    expect(studio.studioCampaignPublishControlState({ ...dirtyState, editor: revertedEditor }))
      .toEqual({ visible: true, eligible: true, disabled: false });
    for (const pending of ["loading", "saving", "publishing", "versionsLoading"] as const) {
      expect(studio.studioCampaignPublishControlState({ ...cleanState, [pending]: true }))
        .toEqual({ visible: true, eligible: false, disabled: true });
    }
    expect(studio.studioCampaignPublishControlState({ ...cleanState, editor: { ...cleanEditor, mode: "create" } }))
      .toEqual({ visible: false, eligible: false, disabled: true });
    expect(studio.studioCampaignPublishControlState({ ...cleanState, editor: { ...cleanEditor, campaignId: "gasok-demo" } }))
      .toEqual({ visible: false, eligible: false, disabled: true });

    const inputHandler = source.match(/function updateCampaignEditor\([\s\S]*?\n\}\n\nfunction startNewDraft/u)?.[0] ?? "";
    expect(inputHandler).toContain("syncCampaignPublishControl();");
    expect(inputHandler).not.toContain("renderCurrentCampaignStudio");
    expect(source).toMatch(/function syncCampaignPublishControl\(\)[\s\S]*publish\.disabled = state\.disabled/u);
    expect(source).toMatch(/function openPublishConfirmation\(\)[\s\S]*!studioCampaignPublishAllowed\(campaignStudioState\)[\s\S]*return/u);
  });

  it("renders a Draft-only Campaign workspace with exact authenticated requests", () => {
    const source = readWebFile("public/studio.js");
    const html = readWebFile("public/studio.html");

    expect(source).toContain('"/studio-campaign-model.js"');
    expect(source).toContain("let campaignStudioState = {");
    expect(source).toContain('authFetch("/api/studio/campaigns")');
    expect(source).toContain('method: "POST"');
    expect(source).toContain('method: "PATCH"');
    expect(source).toContain('`/api/studio/campaigns/${encodeURIComponent(editor.campaignId)}`');
    expect(source).toContain("Published baseline");
    expect(source).toContain("Read only");
    expect(source).toContain("Mock Vault Deposit · Testnet only");
    expect(source).toContain("New draft");
    expect(source).toContain("Saving a Draft does not publish it, execute a transaction, or change the public demo.");
    expect(source).toContain('setAttribute("role", "status")');
    expect(source).toContain('setAttribute("aria-live", "polite")');
    expect(source).toContain('addEventListener("beforeunload"');
    expect(source).toContain("window.confirm");
    expect(source).toContain("campaignFocusBeforeReplacement");
    expect(source).toContain("restoreCampaignFocus(campaignFocusBeforeReplacement)");
    expect(source).toContain("Reload latest");
    expect(source).not.toContain("innerHTML");
    expect(source).not.toMatch(/\b(?:Delete|Clone|Execute)\b\s*(?:draft|campaign)?/u);
    expect(html).toContain("Campaign Draft management");
  });

  it("uses responsive Campaign layout, bounded controls, and visible keyboard focus", () => {
    const css = readWebFile("public/styles.css");

    expect(css).toContain(".studio-campaign-layout");
    expect(css).toContain("grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr)");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toMatch(/@media \(max-width: 760px\)[\s\S]*\.studio-campaign-layout[\s\S]*grid-template-columns: minmax\(0, 1fr\)/u);
    expect(css).toContain(".studio-campaign-card:focus-visible");
    expect(css).toContain(".studio-campaign-save:focus-visible");
    expect(css).toContain("resize: vertical");
    expect(css).toContain("max-width: 100%");
    expect(css).not.toContain("min-width: 320px");
  });

  it("keeps saving through a save-originated refresh and exposes busy controls", async () => {
    const studio = await studioUi();

    expect(studio.studioCampaignRequestState({ saving: false, loading: false }, "save-start"))
      .toMatchObject({ saving: true, loading: false, publishing: false, versionsLoading: false });
    expect(studio.studioCampaignRequestState({ saving: true, loading: false }, "refresh-start"))
      .toMatchObject({ saving: true, loading: true });
    expect(studio.studioCampaignRequestState({ saving: true, loading: true }, "refresh-success"))
      .toMatchObject({ saving: false, loading: false });
    expect(studio.studioCampaignControlsAreBusy({ saving: true, loading: true })).toBe(true);
    expect(studio.studioCampaignControlsAreBusy({ saving: false, loading: false })).toBe(false);
  });

  it("marks Version history unready until one strict history response succeeds", async () => {
    const studio = await studioUi();
    const ready = {
      saving: false, loading: false, publishing: false, versionsLoading: false, versionsReady: true
    };

    expect(studio.studioCampaignRequestState(ready, "versions-start"))
      .toMatchObject({ versionsLoading: true, versionsReady: false });
    expect(studio.studioCampaignRequestState(ready, "versions-failure"))
      .toMatchObject({ versionsLoading: false, versionsReady: false });
    expect(studio.studioCampaignRequestState({ ...ready, versionsReady: false }, "versions-success"))
      .toMatchObject({ versionsLoading: false, versionsReady: true });
  });

  it("routes malformed Version history through failure without enabling publish", () => {
    const source = readWebFile("public/studio.js");
    const loader = source.match(/async function loadCampaignVersionHistory\([\s\S]*?\n\}\n\nasync function saveCampaignDraft/u)?.[0] ?? "";

    expect(loader).toContain("const versions = studioCampaignVersionHistoryFromPayload(payload, campaignId);");
    expect(loader).toContain('if (versions === null) throw { status: 503, code: "service_unavailable" };');
    expect(loader).toContain("campaignStudioState.versions = versions;");
    expect(loader).toContain('updateCampaignRequestState("versions-success")');
    expect(loader).toContain('updateCampaignRequestState("versions-failure")');
  });

  it("shows unavailable history until a strict ready response proves an empty history", () => {
    const source = readWebFile("public/studio.js");
    const renderer = source.match(/function renderCampaignVersions\([\s\S]*?\n\}\n\nfunction renderCampaignStatus/u)?.[0] ?? "";

    expect(renderer).toMatch(
      /if \(campaignStudioState\.versionsLoading\)[\s\S]*else if \(!campaignStudioState\.versionsReady\)[\s\S]*Published Version history is unavailable\.[\s\S]*else if \(campaignStudioState\.versions\.length === 0\)[\s\S]*No public previews yet\./u
    );
  });

  it("rejects editor input state changes while a save or refresh is pending", async () => {
    const studio = await studioUi();
    const state = {
      saving: true,
      loading: false,
      editor: {
        mode: "create", campaignId: null, name: "Original", summary: "", revision: null,
        initialName: "", initialSummary: ""
      }
    };

    expect(studio.studioCampaignEditorInputState(state, "name", "Changed"))
      .toEqual({ accepted: false, editor: state.editor });
    expect(studio.studioCampaignEditorInputState({ ...state, saving: false }, "name", "Changed"))
      .toMatchObject({ accepted: true, editor: { name: "Changed", summary: "" } });
  });

  it("keeps the returned clean Draft when a post-save refetch fails", async () => {
    const studio = await studioUi();
    const savedEditor = {
      mode: "edit", campaignId: "campaign_saved", name: "Saved", summary: "", revision: 3,
      initialName: "Saved", initialSummary: ""
    };
    const mutation = studio.studioCampaignMutationResponseState({
      saving: true,
      loading: false,
      editor: { mode: "create", campaignId: null, name: "Saved", summary: "", revision: null, initialName: "", initialSummary: "" }
    }, savedEditor);
    const afterFailedRefresh = studio.studioCampaignSaveFlowState(mutation.state, "refresh-failure");

    expect(mutation.accepted).toBe(true);
    expect(mutation.state.editor).toEqual(savedEditor);
    expect(mutation.state.editor.initialName).toBe(mutation.state.editor.name);
    expect(mutation.state.editor.initialSummary).toBe(mutation.state.editor.summary);
    expect(afterFailedRefresh).toMatchObject({ saving: false, loading: false, editor: savedEditor });
    expect(studio.studioCampaignMutationResponseState(mutation.state, null))
      .toMatchObject({ accepted: false, state: { editor: null } });
  });

  it("allows a mutation only for a dirty non-busy editor", async () => {
    const studio = await studioUi();
    const clean = {
      mode: "edit", campaignId: "campaign_saved", name: "Saved", summary: "", revision: 3,
      initialName: "Saved", initialSummary: ""
    };

    expect(studio.studioCampaignSaveAllowed({ saving: false, loading: false, editor: clean })).toBe(false);
    expect(studio.studioCampaignSaveAllowed({ saving: true, loading: false, editor: { ...clean, name: "Changed" } })).toBe(false);
    expect(studio.studioCampaignSaveAllowed({ saving: false, loading: false, editor: { ...clean, name: "Changed" } })).toBe(true);
  });

  it("locally enables and disables the existing Save control as input dirtiness changes", async () => {
    const studio = await studioUi();
    const clean = {
      mode: "create", campaignId: null, name: "", summary: "", revision: null,
      initialName: "", initialSummary: ""
    };
    const typed = studio.studioCampaignEditorInputState({ saving: false, loading: false, editor: clean }, "name", "First Draft");
    const reverted = studio.studioCampaignEditorInputState({ saving: false, loading: false, editor: typed.editor }, "name", "");
    const source = readWebFile("public/studio.js");
    const inputHandler = source.match(/function updateCampaignEditor\([\s\S]*?\n\}\n\nfunction startNewDraft/u)?.[0] ?? "";

    expect(studio.studioCampaignSaveControlState({ saving: false, loading: false, editor: typed.editor }))
      .toEqual({ eligible: true, disabled: false });
    expect(studio.studioCampaignSaveControlState({ saving: false, loading: false, editor: reverted.editor }))
      .toEqual({ eligible: false, disabled: true });
    expect(studio.studioCampaignSaveControlState({ saving: true, loading: false, editor: typed.editor }))
      .toEqual({ eligible: false, disabled: true });
    expect(inputHandler).toContain("syncCampaignSaveControl();");
  });

  it("renders clean status after reverting edit and create input while preserving conflict notices", async () => {
    const studio = await studioUi();
    const edit = {
      mode: "edit", campaignId: "campaign_edit", name: "Original", summary: "", revision: 2,
      initialName: "Original", initialSummary: ""
    };
    const created = {
      mode: "create", campaignId: null, name: "", summary: "", revision: null,
      initialName: "", initialSummary: ""
    };
    const changedEdit = studio.studioCampaignEditorInputState({ saving: false, loading: false, editor: edit }, "name", "Changed").editor;
    const revertedEdit = studio.studioCampaignEditorInputState({ saving: false, loading: false, editor: changedEdit }, "name", "Original").editor;
    const typedCreate = studio.studioCampaignEditorInputState({ saving: false, loading: false, editor: created }, "name", "Draft").editor;
    const clearedCreate = studio.studioCampaignEditorInputState({ saving: false, loading: false, editor: typedCreate }, "name", "").editor;

    expect(studio.studioCampaignInputPresentationDecision({ kind: "saved" }, changedEdit)).toMatchObject({ status: "dirty" });
    expect(studio.studioCampaignInputPresentationDecision({ kind: "saved" }, revertedEdit)).toMatchObject({ status: "clean" });
    expect(studio.studioCampaignInputPresentationDecision({ kind: "new" }, typedCreate)).toMatchObject({ status: "dirty" });
    expect(studio.studioCampaignInputPresentationDecision({ kind: "new" }, clearedCreate)).toMatchObject({ status: "clean" });
    expect(studio.studioCampaignInputPresentationDecision({ kind: "revision-conflict", action: "reload-latest" }, changedEdit))
      .toMatchObject({ status: "preserve", clearNotice: false });
  });

  it("keeps a trusted saved Draft when its refetch list omits the expected ID", async () => {
    const studio = await studioUi();
    const saved = {
      mode: "edit", campaignId: "campaign_saved", name: "Saved", summary: "", revision: 4,
      initialName: "Saved", initialSummary: ""
    };
    const listed = { ...saved, revision: 5, initialName: "Saved", initialSummary: "" };

    expect(studio.studioCampaignRefetchSelectionState({ expectedId: saved.campaignId, listEditor: listed, fallbackEditor: saved }))
      .toEqual({ editor: listed, consistent: true });
    expect(studio.studioCampaignRefetchSelectionState({ expectedId: saved.campaignId, listEditor: null, fallbackEditor: saved }))
      .toEqual({ editor: saved, consistent: false });
  });

  it("keeps the dirty conflict editor and reload action when latest list omits it", async () => {
    const studio = await studioUi();
    const source = readWebFile("public/studio.js");
    const local = {
      mode: "edit", campaignId: "campaign_conflict", name: "Local edit", summary: "Still local", revision: 2,
      initialName: "Original", initialSummary: ""
    };

    expect(studio.studioCampaignRefetchSelectionState({
      expectedId: local.campaignId,
      listEditor: null,
      fallbackEditor: local
    })).toEqual({ editor: local, consistent: false });
    expect(studio.studioCampaignInconsistentRefreshPresentation("reload-latest"))
      .toMatchObject({ kind: "revision-conflict", action: "reload-latest" });
    expect(studio.studioCampaignInconsistentRefreshPresentation("untrusted"))
      .toBeNull();
    expect(source).toMatch(/async function reloadLatestCampaign\(\)[\s\S]*expectedSelectedId: editor\.campaignId[\s\S]*fallbackEditor: editor[\s\S]*inconsistentNotice: "reload-latest"/u);
    expect(source).toContain("Latest Draft is unavailable; local edits remain.");
  });

  it("fails closed on an invalid 2xx projection without automatically refetching it", async () => {
    const studio = await studioUi();
    const source = readWebFile("public/studio.js");
    const invalid = studio.studioCampaignMutationResponseState({
      saving: true,
      loading: false,
      editor: { mode: "create", campaignId: null, name: "Draft", summary: "", revision: null, initialName: "", initialSummary: "" }
    }, null);

    expect(invalid).toMatchObject({
      accepted: false,
      state: { saving: false, loading: false, editor: null, notice: { message: "Saved Draft details could not be confirmed." } }
    });
    expect(source).toMatch(/if \(!mutation\.accepted\)[\s\S]*renderCurrentCampaignStudio[\s\S]*return;/u);
  });

  it("clears the notice field that was invalid without clearing conflict or retry notices", async () => {
    const studio = await studioUi();

    expect(studio.studioCampaignInputNoticePolicy({ kind: "validation", field: "name" }))
      .toEqual({ clear: true, field: "name", dirtyCopy: true });
    expect(studio.studioCampaignInputNoticePolicy({ kind: "validation", field: "summary" }))
      .toEqual({ clear: true, field: "summary", dirtyCopy: true });
    expect(studio.studioCampaignInputNoticePolicy({ kind: "revision-conflict", action: "reload-latest" }))
      .toEqual({ clear: false, field: null, dirtyCopy: false });
    expect(studio.studioCampaignInputNoticePolicy({ kind: "service-unavailable", retryable: true }))
      .toEqual({ clear: false, field: null, dirtyCopy: false });
  });

  it("requires confirmation only for same-tab internal dirty navigation", async () => {
    const studio = await studioUi();
    const base = { dirty: true, button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, download: false, target: "", sameOrigin: true, hashOnly: false };

    expect(studio.studioCampaignNavigationDecision(base)).toBe("confirm");
    expect(studio.studioCampaignNavigationDecision({ ...base, ctrlKey: true })).toBe("ignore");
    expect(studio.studioCampaignNavigationDecision({ ...base, metaKey: true })).toBe("ignore");
    expect(studio.studioCampaignNavigationDecision({ ...base, shiftKey: true })).toBe("ignore");
    expect(studio.studioCampaignNavigationDecision({ ...base, altKey: true })).toBe("ignore");
    expect(studio.studioCampaignNavigationDecision({ ...base, button: 1 })).toBe("ignore");
    expect(studio.studioCampaignNavigationDecision({ ...base, download: true })).toBe("ignore");
    expect(studio.studioCampaignNavigationDecision({ ...base, target: "_blank" })).toBe("ignore");
    expect(studio.studioCampaignNavigationDecision({ ...base, target: "_self" })).toBe("confirm");
    expect(studio.studioCampaignNavigationDecision({ ...base, sameOrigin: false })).toBe("ignore");
    expect(studio.studioCampaignNavigationDecision({ ...base, hashOnly: true })).toBe("ignore");
  });

  it("clamps untrusted limits and matches untrusted focus without selector interpolation", async () => {
    const studio = await studioUi();
    const specialId = 'draft-x"]';
    const matching = { dataset: { studioCampaignFocus: specialId } };
    const other = { dataset: { studioCampaignFocus: "draft-other" } };

    expect(studio.clampStudioCampaignLimits({ name: 1_000, summary: 1_000 }))
      .toEqual({ name: 80, summary: 280 });
    expect(studio.clampStudioCampaignLimits({ name: 40, summary: 120 }))
      .toEqual({ name: 40, summary: 120 });
    expect(studio.studioCampaignFocusMatch([other, matching], specialId)).toBe(matching);
    expect(studio.studioCampaignFocusMatch([other], specialId)).toBeNull();
  });

  it("keeps composition input local and disables fields while campaign work is busy", () => {
    const source = readWebFile("public/studio.js");
    const inputHandler = source.match(/function updateCampaignEditor\([\s\S]*?\n\}\n\nfunction startNewDraft/u)?.[0] ?? "";

    expect(inputHandler).not.toContain("renderCurrentCampaignStudio");
    expect(source).toContain("name.disabled = campaignControlsAreBusy()");
    expect(source).toContain("summary.disabled = campaignControlsAreBusy()");
    expect(source).not.toContain("name.maxLength");
    expect(source).not.toContain("summary.maxLength");
  });

  it("exports only the public editor model functions and creates an empty Draft editor", async () => {
    const studio = await model();

    expect(Object.keys(studio).sort()).toEqual([
      "createStudioCampaignPayload",
      "editorFromStudioCampaign",
      "emptyStudioCampaignEditor",
      "studioCampaignEditorIsDirty",
      "studioCampaignFailurePresentation",
      "studioCampaignPublicationFromPayload",
      "studioCampaignPublishAllowed",
      "studioCampaignPublishFailurePresentation",
      "studioCampaignPublishPayload",
      "studioCampaignVersionHistoryFromPayload",
      "updateStudioCampaignPayload",
      "validateStudioCampaignEditor"
    ]);
    expect(studio.emptyStudioCampaignEditor()).toEqual({
      mode: "create",
      campaignId: null,
      name: "",
      summary: "",
      revision: null,
      initialName: "",
      initialSummary: ""
    });
  });

  it("creates an edit editor from only an editable Draft campaign projection", async () => {
    const studio = await model();
    const campaign = {
      campaignId: "campaign_draft",
      name: "Partner Draft",
      summary: "Testnet only",
      revision: 2,
      lifecycleState: "draft",
      editable: true,
      actionTemplate: "mockVaultDeposit",
      updatedAt: "2026-08-01T00:00:00.000Z",
      tenantId: "private-tenant",
      author: "private-author"
    };

    expect(studio.editorFromStudioCampaign(campaign)).toEqual({
      mode: "edit",
      campaignId: "campaign_draft",
      name: "Partner Draft",
      summary: "Testnet only",
      revision: 2,
      initialName: "Partner Draft",
      initialSummary: "Testnet only"
    });
    expect(studio.editorFromStudioCampaign({ ...campaign, editable: false })).toBeNull();
    expect(studio.editorFromStudioCampaign({ ...campaign, lifecycleState: "published" })).toBeNull();
    expect(studio.editorFromStudioCampaign({ ...campaign, campaignId: "gasok-demo" })).toBeNull();
  });

  it("validates trimmed text with Unicode code-point limits and normalized summary line breaks", async () => {
    const studio = await model();

    expect(studio.validateStudioCampaignEditor({ name: "  A😀BC  ", summary: "  a\r\nb  " }, limits)).toEqual({
      ok: true,
      value: { name: "A😀BC", summary: "a\nb" }
    });
    expect(studio.validateStudioCampaignEditor({ name: "😀".repeat(4), summary: "😀".repeat(6) }, limits)).toEqual({
      ok: true,
      value: { name: "😀".repeat(4), summary: "😀".repeat(6) }
    });
    expect(studio.validateStudioCampaignEditor({ name: "😀".repeat(5), summary: "" }, limits)).toMatchObject({
      ok: false,
      field: "name"
    });
    expect(studio.validateStudioCampaignEditor({ name: "Test", summary: "😀".repeat(7) }, limits)).toMatchObject({
      ok: false,
      field: "summary"
    });
    expect(studio.validateStudioCampaignEditor({ name: "Test", summary: "" }, limits)).toEqual({
      ok: true,
      value: { name: "Test", summary: "" }
    });
  });

  it("rejects unsafe Draft text and invalid limits with bounded non-reflective copy", async () => {
    const studio = await model();
    const unsafeEditors = [
      { name: "Name\nline", summary: "" },
      { name: "Name", summary: "left\rright" },
      { name: "Bad\tname", summary: "" },
      { name: "Bad\u0000name", summary: "" },
      { name: "Bad\u007fname", summary: "" },
      { name: "Bad\u0001name", summary: "" },
      { name: "Draft", summary: "Bad\ttext" },
      { name: "Draft", summary: "Bad\u0000text" },
      { name: "Draft", summary: "Bad\u007ftext" },
      { name: "Draft", summary: "Bad\u0001text" },
      { name: 1, summary: "" },
      { name: "Draft", summary: null }
    ];

    for (const editor of unsafeEditors) {
      const result = studio.validateStudioCampaignEditor(editor, limits);
      expect(result).toMatchObject({ ok: false });
      expect(JSON.stringify(result)).not.toContain("Bad");
    }
    for (const invalidLimits of [undefined, null, {}, { name: 0, summary: 6 }, { name: 4, summary: -1 }, { name: Infinity, summary: 6 }]) {
      const result = studio.validateStudioCampaignEditor({ name: "Draft", summary: "" }, invalidLimits);
      expect(result).toMatchObject({ ok: false });
      expect(JSON.stringify(result)).not.toContain("Draft");
    }
  });

  it("detects only text changes on a well-formed editor", async () => {
    const studio = await model();
    const editor = {
      mode: "edit",
      campaignId: "campaign_draft",
      name: "Draft",
      summary: "Testnet only",
      revision: 1,
      initialName: "Draft",
      initialSummary: "Testnet only"
    };

    expect(studio.studioCampaignEditorIsDirty(editor)).toBe(false);
    expect(studio.studioCampaignEditorIsDirty({ ...editor, revision: 2, campaignId: "campaign_changed" })).toBe(false);
    expect(studio.studioCampaignEditorIsDirty({ ...editor, summary: "Changed" })).toBe(true);
    expect(studio.studioCampaignEditorIsDirty({ ...editor, name: null })).toBe(false);
  });

  it("builds fresh exact create and update payloads without extra campaign data", async () => {
    const studio = await model();
    const create = studio.createStudioCampaignPayload({
      mode: "create",
      campaignId: null,
      name: "  Partner Draft  ",
      summary: "  Testnet\r\nonly  ",
      revision: null,
      initialName: "",
      initialSummary: "",
      action: "publish",
      tenant: "private-tenant"
    });
    const update = studio.updateStudioCampaignPayload({
      mode: "edit",
      campaignId: "campaign_one",
      name: " Updated ",
      summary: "",
      revision: 2,
      initialName: "Draft",
      initialSummary: "",
      source: "private"
    });

    expect(create).toEqual({ name: "Partner Draft", summary: "Testnet\nonly" });
    expect(Object.keys(create).sort()).toEqual(["name", "summary"]);
    expect(update).toEqual({ name: "Updated", summary: "", revision: 2 });
    expect(Object.keys(update).sort()).toEqual(["name", "revision", "summary"]);
    expect(() => studio.createStudioCampaignPayload({ mode: "edit", name: "Draft", summary: "" })).toThrow("Invalid campaign editor");
    expect(() => studio.createStudioCampaignPayload({
      mode: "create",
      campaignId: null,
      name: "Draft",
      summary: "",
      revision: 1,
      initialName: "",
      initialSummary: ""
    })).toThrow("Invalid campaign editor");
    expect(() => studio.updateStudioCampaignPayload({ mode: "edit", name: "Draft", summary: "", revision: "2" })).toThrow("Invalid campaign editor");
  });

  it("snapshots each public campaign field once before creating an editor", async () => {
    const studio = await model();
    const canary = "CANARY_private_campaign_value";
    const values: Record<string, string | number | boolean> = {
      campaignId: "campaign_one",
      lifecycleState: "draft",
      editable: true,
      name: "Draft one",
      summary: "Testnet only",
      revision: 2
    };
    const reads: Record<string, number> = Object.fromEntries(Object.keys(values).map((field) => [field, 0]));
    const campaign: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(values)) {
      Object.defineProperty(campaign, field, {
        enumerable: true,
        get() {
          reads[field] = (reads[field] ?? 0) + 1;
          return reads[field] === 1 ? value : field === "campaignId" ? "gasok-demo" : canary;
        }
      });
    }
    Object.defineProperty(campaign, "tenant", { value: canary });
    Object.defineProperty(campaign, Symbol("author"), { value: canary });

    const editor = studio.editorFromStudioCampaign(campaign);

    expect(editor).toEqual({
      mode: "edit",
      campaignId: "campaign_one",
      name: "Draft one",
      summary: "Testnet only",
      revision: 2,
      initialName: "Draft one",
      initialSummary: "Testnet only"
    });
    expect(reads).toEqual({ campaignId: 1, lifecycleState: 1, editable: 1, name: 1, summary: 1, revision: 1 });
    expect(Object.getOwnPropertyNames(editor).sort()).toEqual([
      "campaignId", "initialName", "initialSummary", "mode", "name", "revision", "summary"
    ]);
    expect(Object.getOwnPropertySymbols(editor)).toEqual([]);
    expect(JSON.stringify(editor)).not.toContain(canary);
  });

  it("snapshots dynamic limits once and fails closed for throwing limit access", async () => {
    const studio = await model();
    const reads = { name: 0, summary: 0 };
    const dynamicLimits = {};
    Object.defineProperties(dynamicLimits, {
      name: {
        enumerable: true,
        get() {
          reads.name += 1;
          return reads.name === 1 ? 4 : Infinity;
        }
      },
      summary: {
        enumerable: true,
        get() {
          reads.summary += 1;
          return reads.summary === 1 ? 6 : Infinity;
        }
      }
    });

    expect(studio.validateStudioCampaignEditor({ name: "Test", summary: "Six ok" }, dynamicLimits)).toEqual({
      ok: true,
      value: { name: "Test", summary: "Six ok" }
    });
    expect(reads).toEqual({ name: 1, summary: 1 });

    const canary = "CANARY_limit_getter";
    const throwingLimits = new Proxy({ name: 4, summary: 6 }, {
      get(_target, property) {
        if (property === "summary") {
          throw new Error(canary);
        }
        return 4;
      }
    });
    const result = studio.validateStudioCampaignEditor({ name: "Test", summary: "" }, throwingLimits);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain(canary);
  });

  it("uses one editor snapshot for dirty state and exact payloads", async () => {
    const studio = await model();
    const canary = "CANARY_editor_getter";
    const snapshot = (values: Record<string, unknown>) => {
      const reads: Record<string, number> = Object.fromEntries(Object.keys(values).map((field) => [field, 0]));
      const editor: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(values)) {
        Object.defineProperty(editor, field, {
          enumerable: true,
          get() {
            reads[field] = (reads[field] ?? 0) + 1;
            return reads[field] === 1 ? value : canary;
          }
        });
      }
      return { editor, reads };
    };
    const dirty = snapshot({
      mode: "edit", campaignId: "campaign_one", name: "Changed", summary: "", revision: 2,
      initialName: "Original", initialSummary: ""
    });
    const create = snapshot({
      mode: "create", campaignId: null, name: "Create Draft", summary: "", revision: null,
      initialName: "", initialSummary: ""
    });
    const update = snapshot({
      mode: "edit", campaignId: "campaign_one", name: "Update Draft", summary: "", revision: 2,
      initialName: "Original", initialSummary: ""
    });

    expect(studio.studioCampaignEditorIsDirty(dirty.editor)).toBe(true);
    expect(studio.createStudioCampaignPayload(create.editor)).toEqual({ name: "Create Draft", summary: "" });
    expect(studio.updateStudioCampaignPayload(update.editor)).toEqual({ name: "Update Draft", summary: "", revision: 2 });
    expect(dirty.reads).toEqual({ mode: 1, campaignId: 1, name: 1, summary: 1, revision: 1, initialName: 1, initialSummary: 1 });
    expect(create.reads).toEqual({ mode: 1, campaignId: 1, name: 1, summary: 1, revision: 1, initialName: 1, initialSummary: 1 });
    expect(update.reads).toEqual({ mode: 1, campaignId: 1, name: 1, summary: 1, revision: 1, initialName: 1, initialSummary: 1 });
  });

  it("enforces fixed server text limits and never emits private properties", async () => {
    const studio = await model();
    const astral = "\u{1F600}";
    const createInput: Record<string | symbol, unknown> = {
      mode: "create", campaignId: null, name: astral.repeat(80), summary: astral.repeat(280), revision: null,
      initialName: "", initialSummary: ""
    };
    Object.defineProperty(createInput, "tenant", { value: "CANARY_private_tenant" });
    createInput[Symbol("author")] = "CANARY_private_author";
    const create = studio.createStudioCampaignPayload(createInput);
    expect(create).toEqual({ name: astral.repeat(80), summary: astral.repeat(280) });
    expect(Object.getOwnPropertyNames(create).sort()).toEqual(["name", "summary"]);
    expect(Object.getOwnPropertySymbols(create)).toEqual([]);
    expect(() => studio.createStudioCampaignPayload({ ...createInput, name: astral.repeat(81) })).toThrow("Invalid campaign editor");
    expect(() => studio.updateStudioCampaignPayload({
      mode: "edit", campaignId: "campaign_one", name: "Draft", summary: astral.repeat(281), revision: 2,
      initialName: "Draft", initialSummary: ""
    })).toThrow("Invalid campaign editor");
  });

  it("fails closed without reflecting accessor or Proxy canaries", async () => {
    const studio = await model();
    const canary = "CANARY_accessor_private_value";
    const throwing = new Proxy({}, { get() { throw new Error(canary); } });
    const result = studio.validateStudioCampaignEditor(throwing, limits);

    expect(studio.editorFromStudioCampaign(throwing)).toBeNull();
    expect(studio.studioCampaignEditorIsDirty(throwing)).toBe(false);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain(canary);
    for (const build of [studio.createStudioCampaignPayload, studio.updateStudioCampaignPayload]) {
      let caught: unknown;
      try {
        build(throwing);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(TypeError);
      expect(String(caught)).toContain("Invalid campaign editor");
      expect(String(caught)).not.toContain(canary);
    }
  });

  it("rejects inherited required fields without reflecting prototype values", async () => {
    const studio = await model();
    const canary = "CANARY_inherited_private_value";
    const validCampaignProjection = {
      campaignId: "campaign_one",
      lifecycleState: "draft",
      editable: true,
      name: canary,
      summary: canary,
      revision: 2
    };
    const validCreateEditor = {
      mode: "create",
      campaignId: null,
      name: canary,
      summary: canary,
      revision: null,
      initialName: "",
      initialSummary: ""
    };
    const validEditEditor = {
      mode: "edit",
      campaignId: "campaign_one",
      name: canary,
      summary: canary,
      revision: 2,
      initialName: canary,
      initialSummary: canary
    };
    const inheritedCampaign = Object.create(validCampaignProjection);
    const inheritedCreate = Object.create(validCreateEditor);
    const inheritedEdit = Object.create(validEditEditor);
    const inheritedText = Object.create({ name: canary, summary: canary });

    expect(studio.editorFromStudioCampaign(inheritedCampaign)).toBeNull();
    expect(studio.studioCampaignEditorIsDirty(inheritedEdit)).toBe(false);
    expect(() => studio.createStudioCampaignPayload(inheritedCreate)).toThrow("Invalid campaign editor");
    expect(() => studio.updateStudioCampaignPayload(inheritedEdit)).toThrow("Invalid campaign editor");
    const validation = studio.validateStudioCampaignEditor(inheritedText, limits);
    expect(validation).toMatchObject({ ok: false });
    expect(JSON.stringify(validation)).not.toContain(canary);
  });

  it("maps only status codes to bounded campaign failure presentations", async () => {
    const studio = await model();
    const canary = "CANARY_token_request-body_message";
    const cases = [
      [400, "validation", false, null],
      [401, "session-expired", false, "sign-in"],
      [403, "insufficient-access", false, null],
      [404, "not-found", false, null],
      [409, "revision-conflict", false, "reload-latest"],
      [429, "rate-limited", true, null],
      [503, "service-unavailable", true, null],
      [500, "service-unavailable", true, null]
    ] as const;

    for (const [status, kind, retryable, action] of cases) {
      const presentation = studio.studioCampaignFailurePresentation({
        status,
        message: canary,
        body: { message: canary, token: canary }
      });
      expect(presentation).toMatchObject({ kind, retryable, action });
      expect(Object.keys(presentation).sort()).toEqual(["action", "kind", "message", "retryable"]);
      expect(JSON.stringify(presentation)).not.toContain(canary);
    }
    expect(studio.studioCampaignFailurePresentation(null)).toMatchObject({ kind: "service-unavailable", retryable: true });
    expect(studio.studioCampaignFailurePresentation({ get status() { throw new Error(canary); } })).toMatchObject({ kind: "service-unavailable", retryable: true });
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("read-only Studio presentation", () => {
  it("loads the shared Dossier, self-hosted font, and module runtime", () => {
    const html = readWebFile("public/studio.html");

    expect(html).toContain("GIWA Verified Intent Rail");
    expect(html).toContain("/fonts/pretendard-giwa-subset.woff2");
    expect(html).toContain('<script src="/protocol-dossier.js"></script>');
    expect(html).toContain('<script type="module" src="/studio.js"></script>');
    expect(html).toContain('id="studio-app"');
    expect(html).toContain('aria-live="polite"');
  });

  it("uses passive session recovery and explicit wallet operations", () => {
    const source = readWebFile("public/studio.js");

    expect(source).toContain('"/api/auth/session"');
    expect(source).toContain('"/api/auth/challenge"');
    expect(source).toContain('"/api/auth/verify"');
    expect(source).toContain('"/api/auth/logout"');
    expect(source).toContain('method: "eth_requestAccounts"');
    expect(source).toContain('method: "eth_chainId"');
    expect(source).toContain('method: "personal_sign"');
    expect(source).toContain('method: "wallet_switchEthereumChain"');
    expect(source).toContain('chainId: "0x164ce"');
    expect(source).toContain('credentials: "same-origin"');
    expect(source).toMatch(/async function boot\(\)[\s\S]*authFetch\("\/api\/auth\/session"/u);
    expect(source).toMatch(/addEventListener\("click", connectWallet\)/u);
    expect(source).toMatch(/addEventListener\("click", switchNetwork\)/u);
    expect(source).toContain('removeAttribute("aria-disabled")');
    expect(source).toContain('document.querySelector("[data-studio-action]")');
  });

  it("exports QA renderers and keeps public errors bounded by operation", () => {
    const source = readWebFile("public/studio.js");

    expect(source).toContain("export function renderStudioGate");
    expect(source).toContain("export function renderAuthenticatedStudio");
    expect(source).toMatch(/4001[\s\S]*(?:account|network-switch|signature)/u);
    expect(source).toContain('"wallet-unavailable"');
    expect(source).toContain('"wrong-network"');
    expect(source).toContain('"session-expired"');
    expect(source).toContain('"access-denied"');
    expect(source).toContain('"retryable-error"');
    expect(source).not.toMatch(/\.message\s*\)|\.message\s*;/u);
  });

  it("keeps the Studio authority surface bounded while allowing Draft-only editing", () => {
    const source = readWebFile("public/studio.js");

    expect(source).not.toContain("innerHTML");
    expect(source).not.toMatch(/eth_sendTransaction|wallet_addEthereumChain/u);
    expect(source).not.toMatch(/\b(?:Delete|Clone|Execute)\b\s*(?:draft|campaign)?/u);
    expect(source).not.toMatch(/action-template|spender|calldata|custom verifier/u);
    expect(source).not.toMatch(/analytics|member management|Receipt/iu);
    expect(source).toContain("organization.displayName");
    expect(source).toContain("member.walletAddress");
    expect(source).toContain("member.role");
    expect(source).toContain("expiresAt");
  });

  it("keeps responsive controls accessible with existing tokens", () => {
    const css = readWebFile("public/styles.css");

    expect(css).toContain(".studio-primary-action:focus-visible");
    expect(css).toMatch(
      /\.studio-primary-action[\s\S]*min-height:\s*var\(--protocol-target\)/u
    );
    expect(css).toContain(".studio-secondary-action");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("@media (max-width: 360px)");
    expect(css).toMatch(
      /@media \(max-width: 800px\)[\s\S]*\.protocol-product-bar-studio[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto[\s\S]*\.protocol-product-bar-studio \.protocol-view-nav[\s\S]*display:\s*none/u
    );
    expect(css).not.toContain("min-width: 320px");
  });

  it("keeps the public-preview confirmation, request payload, and history controls bounded", () => {
    const source = readWebFile("public/studio.js");
    const html = readWebFile("public/studio.html");
    const css = readWebFile("public/styles.css");

    expect(html).toContain('<dialog id="studio-publish-confirmation"');
    expect(html).toContain('data-studio-publish-cancel');
    expect(html).toContain('data-studio-publish-submit');
    expect(source).toContain("Publish public preview");
    expect(source).toContain("GIWA Sepolia testnet");
    expect(source).toContain("Mock assets only");
    expect(html).toContain("No transaction, Manifest, verification, or Receipt is created.");
    expect(source).toContain('authFetch(`/api/studio/campaigns/${encodeURIComponent(campaignId)}/versions`)');
    expect(source).toContain('authFetch(`/api/studio/campaigns/${encodeURIComponent(editor.campaignId)}/publish`, {');
    expect(source).toContain("studioCampaignPublishPayload(editor)");
    expect(source).toContain("versionsLoading: false");
    expect(source).toContain("publishConfirmation: null");
    expect(source).toContain('dialog.setAttribute("aria-busy", "true")');
    expect(source).toContain('form.setAttribute("aria-busy", "true")');
    expect(source).toContain("cancel.disabled = campaignStudioState.publishing");
    expect(source).toMatch(/cancel\.addEventListener\("click", \(\) => \{[\s\S]*?closePublishConfirmation\(\{ eventType: "cancel" \}\)/u);
    expect(source).toMatch(/dialog\.addEventListener\("cancel", \(event\) => \{[\s\S]*?closePublishConfirmation\(\{ eventType: "escape" \}\)/u);
    expect(source).not.toContain("innerHTML");
    expect(css).toContain(".studio-publish-dialog");
    expect(css).toContain(".studio-version-row");
    expect(css).toContain(".studio-version-hash");
  });
});

describe("Studio challenge signature boundary", () => {
  const malformedChallenges = [
    ["missing challengeId", { message: "unexpected raw message" }],
    ["empty challengeId", { challengeId: "", message: "unexpected raw message" }],
    ["blank challengeId", { challengeId: "   ", message: "unexpected raw message" }],
    ["non-string challengeId", { challengeId: 7, message: "unexpected raw message" }],
    ["missing message", { challengeId: "challenge_test" }],
    ["empty message", { challengeId: "challenge_test", message: "" }],
    ["blank message", { challengeId: "challenge_test", message: "   " }],
    ["non-string message", { challengeId: "challenge_test", message: 7 }]
  ] as const;

  it.each(malformedChallenges)(
    "rejects %s before rendering signature pending or requesting a signature",
    async (_label, challenge) => {
      // @ts-expect-error The dependency-free browser module intentionally has no declaration file.
      const studio = await import("../../../public/studio.js");
      expect(typeof studio.requestStudioChallengeSignature).toBe("function");
      expect(typeof studio.studioAuthFailurePresentation).toBe("function");

      const provider = { request: vi.fn(async () => "0xsignature") };
      const onSignaturePending = vi.fn();
      let caught: unknown;
      try {
        await studio.requestStudioChallengeSignature({
          challenge,
          walletAddress: "0x1111111111111111111111111111111111111111",
          provider,
          onSignaturePending
        });
      } catch (error) {
        caught = error;
      }

      expect(caught).toMatchObject({ code: "service_unavailable" });
      expect(onSignaturePending).not.toHaveBeenCalled();
      expect(provider.request).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: "personal_sign" })
      );
      const presentation = studio.studioAuthFailurePresentation(caught);
      expect(presentation).toEqual({
        state: "retryable-error",
        notice: "Studio 인증 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요."
      });
      expect(JSON.stringify(presentation)).not.toContain("unexpected raw message");
    }
  );

  it("renders signature pending before requesting a signature for a valid challenge", async () => {
    // @ts-expect-error The dependency-free browser module intentionally has no declaration file.
    const studio = await import("../../../public/studio.js");
    expect(typeof studio.requestStudioChallengeSignature).toBe("function");

    const order: string[] = [];
    const provider = {
      request: vi.fn(async () => {
        order.push("personal_sign");
        return "0xsignature";
      })
    };

    await expect(studio.requestStudioChallengeSignature({
      challenge: {
        challengeId: "challenge_test",
        message: "Sign in to GIWA Verified Intent Rail"
      },
      walletAddress: "0x1111111111111111111111111111111111111111",
      provider,
      onSignaturePending: () => order.push("signature-pending")
    })).resolves.toEqual({
      challengeId: "challenge_test",
      message: "Sign in to GIWA Verified Intent Rail",
      signature: "0xsignature"
    });
    expect(order).toEqual(["signature-pending", "personal_sign"]);
  });
});

import { failureCodeDisplayCopy, toBoundedFailureCode, type LiveFailureCode } from "../verifier/liveFailureCode.ts";

export type RecoveryCopy = {
  title: string;
  happened: string;
  locked: string;
  next: string;
  severity: "info" | "action-required" | "blocked";
};

export type RecoveryCopyInput =
  | { code: "provider_missing" }
  | { code: "wallet_rejected" }
  | { code: "wrong_chain"; expectedChainId?: number }
  | { code: "manifest_invalidated" }
  | { code: "manifest_expired" }
  | { code: "approve_rejected" }
  | { code: "deposit_rejected" }
  | { code: "duplicate_deposit_hash" }
  | { code: "deposit_evidence_required" }
  | { code: "verifier_timeout" }
  | { code: "verifier_mismatch"; failureCode?: string | LiveFailureCode | null; failureCopy?: string | null }
  | { code: "receipt_not_found" }
  | { code: "hosted_auth_blocked" }
  | { code: "rate_limited" }
  | { code: "readiness_blocked" };

function copy(title: string, happened: string, locked: string, next: string, severity: RecoveryCopy["severity"]): RecoveryCopy {
  return { title, happened, locked, next, severity };
}

export function recoveryCopyFor(input: RecoveryCopyInput): RecoveryCopy {
  switch (input.code) {
    case "provider_missing":
      return copy(
        "Install or enable a browser wallet",
        "This browser did not expose an EIP-1193 wallet provider.",
        "Manifest issuance and wallet actions are locked.",
        "Open the demo in a browser with a wallet extension, then connect again.",
        "action-required"
      );
    case "wallet_rejected":
      return copy(
        "Wallet request was rejected",
        "The wallet did not approve the requested action.",
        "The current step remains locked.",
        "Review the wallet prompt and retry only if the request matches the manifest preview.",
        "action-required"
      );
    case "wrong_chain": {
      const chain = input.expectedChainId ?? 91342;
      return copy(
        "Switch to GIWA Sepolia",
        "The connected wallet is on a different chain.",
        "Manifest issuance and wallet actions are locked.",
        `Switch the wallet to chain ${chain}, then issue a new manifest.`,
        "action-required"
      );
    }
    case "manifest_invalidated":
      return copy(
        "Request a fresh manifest",
        "The wallet account or chain changed after the manifest was issued.",
        "Approve, deposit, verification, and receipt handoff are locked for the stale manifest.",
        "Issue a new wallet-bound manifest for the current wallet context.",
        "action-required"
      );
    case "manifest_expired":
      return copy(
        "Issue a new manifest",
        "The manifest expiry window has passed.",
        "Wallet actions and receipt unlock are locked for this manifest.",
        "Issue a fresh manifest, then repeat the wallet action.",
        "action-required"
      );
    case "approve_rejected":
      return copy(
        "Approve was not submitted",
        "The wallet did not return an approve transaction hash.",
        "Deposit and receipt verification are locked.",
        "Retry approve from the wallet if the request still matches the manifest.",
        "action-required"
      );
    case "deposit_rejected":
      return copy(
        "Deposit was not submitted",
        "The wallet did not return a deposit transaction hash.",
        "Verification and receipt handoff are locked.",
        "Retry deposit from the wallet after confirming the target and amount.",
        "action-required"
      );
    case "duplicate_deposit_hash":
      return copy(
        "Use a fresh run",
        "The submitted deposit transaction hash is already attached to another run.",
        "This run cannot use that transaction for receipt unlock.",
        "Start a fresh run or verify the original run that owns the transaction hash.",
        "blocked"
      );
    case "deposit_evidence_required":
      return copy(
        "Submit deposit evidence",
        "No deposit transaction hash is stored for this run.",
        "Verification and receipt handoff are locked.",
        "Submit the browser-wallet deposit transaction before verification.",
        "action-required"
      );
    case "verifier_timeout":
      return copy(
        "Wait for more confirmations",
        "Standard RPC confirmation depth is below the local verifier threshold.",
        "Receipt handoff is locked until the verifier can recheck confirmed evidence.",
        "Retry verification after more GIWA Sepolia blocks.",
        "info"
      );
    case "verifier_mismatch": {
      const bounded = typeof input.failureCode === "string" ? toBoundedFailureCode(input.failureCode) : input.failureCode ?? null;
      const happened = input.failureCopy ?? (bounded === null ? "Verifier did not match the transaction evidence." : failureCodeDisplayCopy(bounded));
      return copy(
        "Receipt not issued",
        happened,
        "Receipt stays locked because the confirmed evidence did not pass the verifier.",
        "Review the manifest fields and transaction evidence, then start a fresh run if needed.",
        "blocked"
      );
    }
    case "receipt_not_found":
      return copy(
        "Receipt not found or not available",
        "The receipt hash is unknown or the receipt gate is closed.",
        "No run details are shown for this public route.",
        "Use the receipt link shown after matched verification.",
        "blocked"
      );
    case "hosted_auth_blocked":
      return copy(
        "Reviewer access is blocked",
        "This hosted endpoint requires scoped access.",
        "Partner and operator data stay locked.",
        "Use the approved local demo route or provide the configured reviewer credential through the server.",
        "blocked"
      );
    case "rate_limited":
      return copy(
        "Wait briefly and retry",
        "The live API accepted too many requests in the current window.",
        "Further requests are temporarily locked.",
        "Wait for the retry window, then continue from the current step.",
        "info"
      );
    case "readiness_blocked":
      return copy(
        "Live readiness is blocked",
        "The local live server is missing a required readiness gate.",
        "Fresh live actions stay locked.",
        "Use the static fallback or fix redacted readiness before rerunning the live path.",
        "blocked"
      );
  }
}

# GASOK Selection Staging Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one public, evaluator-executable GIWA Sepolia flow that prepares a fresh wallet, issues a wallet-bound manifest, executes mint/approve/deposit, verifies Standard RPC evidence, publishes a matched-only receipt, and remains recoverable through a static fallback.

**Architecture:** Keep the existing Node HTTP + SQLite + static browser architecture. Add a hashed per-run capability for public participant routes, keep partner routes credential-scoped, run bounded synchronous verification in the single-instance `staging-testnet` mode, and expose only public chain configuration to the browser. Deploy the static and live services behind Nginx on the existing Lightsail instance, with the static service retained as the rollback surface.

**Tech Stack:** TypeScript 6, Node.js HTTP and `node:sqlite`, Vitest, viem, browser EIP-1193 wallet API, Solidity contracts already deployed on GIWA Sepolia, systemd, Nginx, PowerShell and POSIX shell operations scripts.

---

## Source Of Truth And Execution Rules

- Approved design: `docs/superpowers/specs/2026-07-22-gasok-selection-staging-submission-design.md`
- Public product name: `GIWA Verified Intent Rail`
- Chain: GIWA Sepolia, chain ID `91342`
- Existing deployment addresses remain sourced from `apps/web/src/generated/deployment.json`.
- No new package is required. Stop and request approval if implementation reveals a dependency gap.
- Run each task in order. Do not refresh provenance until all tracked public assets and implementation documents are stable.
- Do not push, install host packages, alter DNS, approve wallet transactions, or publish the Lightsail route without the matching human checkpoint.
- Local commits are small and conventional. Each commit includes only the files listed in that task.

## Execution Setup

After this plan is committed and an execution mode is selected, use the `using-git-worktrees` skill to create an isolated worktree on branch `codex/gasok-selection-staging`. Run every implementation task from that worktree. Confirm `git status --short` is empty before Task 1 and preserve the design and plan commits in the new branch history.

## Delivery Checkpoints

| Date | Required outcome |
| --- | --- |
| 2026-07-23 | Tasks 1–3: safety gate, capability primitive and SQLite contract green |
| 2026-07-24 | Tasks 4–6: public configuration, participant API and hosted runtime green |
| 2026-07-25 | Tasks 7–9: fresh-wallet UX and integrated participant journey green |
| 2026-07-26 | Tasks 10–12: versioned Lightsail assets, runbooks and full local gate green |
| 2026-07-27 | Task 13: fresh local GIWA Sepolia rehearsal and evidence complete |
| 2026-07-28 | Task 14: exact commit on Lightsail, HTTP and on-host smoke green |
| 2026-07-29 | Task 14: DNS, HTTPS and one public fresh-wallet Receipt green |
| 2026-07-30 | Task 15: video, links, screenshots, final evidence and source freeze complete |
| 2026-07-31 | Submission buffer; only submission-blocking corrections are permitted |

## File Responsibility Map

| File | Responsibility |
| --- | --- |
| `scripts/ci/check-safe-scans.ps1` | Repository-wide bounded language and sensitive-term scan policy |
| `apps/web/src/lib/live/liveParticipantCapability.ts` | Generate, hash, and compare opaque per-run capabilities |
| `apps/web/src/lib/live/liveRoutePolicy.ts` | Classify public, participant, and partner API routes |
| `apps/web/src/lib/live/livePublicConfig.ts` | Build the public GIWA Sepolia configuration projection |
| `apps/web/src/lib/live/liveChainReadiness.ts` | Probe chain ID and deployed contract bytecode with timeouts |
| `apps/web/src/lib/live/liveTypes.ts` | Persisted run and decision contracts |
| `apps/web/src/lib/live/liveStore.ts` | Memory and SQLite persistence, capability lookup, write health |
| `apps/web/src/lib/live/liveSchemaMigrations.ts` | Required schema migration contract |
| `apps/web/src/lib/live/liveApi.ts` | Fixed-campaign participant API, verification, receipt and partner boundaries |
| `apps/web/src/lib/live/liveEnv.ts` | Redacted server runtime configuration contract |
| `apps/web/src/lib/live/liveHealth.ts` | Redacted liveness and readiness projection |
| `apps/web/scripts/serve-live.mjs` | HTTP boundary, auth routing, rate limits, startup and shutdown |
| `apps/web/scripts/serve-static.mjs` | Static fallback runtime |
| `apps/web/src/lib/transaction/mockTokenMintCalldata.ts` | Encode permissionless mock-token mint requests |
| `apps/web/src/lib/wallet/walletAssetReadiness.ts` | Derive gas, token, allowance and next-action readiness |
| `apps/web/public/user-flow.js` | Progressive evaluator flow and browser wallet orchestration |
| `apps/web/public/user.html` | User surface shell and accessibility metadata |
| `apps/web/public/styles.css` | Responsive evaluator-facing presentation |
| `apps/web/scripts/smoke-staging.mjs` | Bounded HTTP smoke checks for local and public origins |
| `ops/lightsail/systemd/*` | Static and live process definitions |
| `ops/lightsail/nginx/*` | Route ownership, bounded upstream errors and HTTPS-ready proxy config |
| `ops/lightsail/scripts/*` | Backup and local-on-host smoke commands |
| `docs/implementation/giwa-gasok-*` | Operator runbook, demo script and submission checklist |
| `docs/evidence/local-*` | Final refreshed local-advisory provenance bundle |

## Task 1: Restore The Repository Safety Gate

**Files:**
- Modify: `scripts/ci/check-safe-scans.ps1`
- Modify: `apps/web/src/lib/provenance/safeScanScript.test.ts`
- Modify (exact scan-policy reference): `docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md`
- Modify: `docs/superpowers/plans/2026-06-26-sprint-51-lightsail-staging-architecture-and-cost-plan.md`
- Modify: `docs/superpowers/plans/2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md`
- Modify: `docs/superpowers/plans/2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md`

- [ ] **Step 1: Add the failing exact-path scan-policy test**

Add this assertion to `safeScanScript.test.ts` without weakening the existing anti-blanket assertions:

```ts
it("allows only the exact server runtime injection policy filename as a documentation reference", () => {
  const script = safeScanScript();

  expect(script).toContain(
    '$normalizedText.Contains("giwa-lightsail-env-and-secret-injection-preflight.md")' // exact scan-policy contract
  );
  expect(script).not.toContain('$RuleId -eq "sensitive-term") { return $true }');
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/provenance/safeScanScript.test.ts
```

Expected: one failure because the exact filename exception is not present.

- [ ] **Step 3: Make the scan policy exact and repair unsafe-context lines**

Insert this rule after the `.test.ts` rule in `Test-SafeContext`:

```powershell
if (
  $RuleId -eq "sensitive-term" -and
  $normalizedText.Contains("giwa-lightsail-env-and-secret-injection-preflight.md") # exact scan-policy reference
) {
  return $true
}
```

Change the policy document line from `authorization material` to:

```text
do not print authorization material
```

In the three historical sprint plans, rename each local PowerShell variable from `$credentialPattern` to `$credentialScanPattern`, including its `rg` invocation. This makes the line visibly scan-related without exempting the whole document.

- [ ] **Step 4: Prove the safety gate passes**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/provenance/safeScanScript.test.ts
& .\scripts\ci\check-safe-scans.ps1
```

Expected:

```text
safe_scans=pass
```

- [ ] **Step 5: Commit the gate repair**

```powershell
git add scripts/ci/check-safe-scans.ps1 apps/web/src/lib/provenance/safeScanScript.test.ts docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md docs/superpowers/plans/2026-06-26-sprint-51-lightsail-staging-architecture-and-cost-plan.md docs/superpowers/plans/2026-06-26-sprint-52-lightsail-staging-deploy-preflight-after-approval.md docs/superpowers/plans/2026-06-26-sprint-53-lightsail-staging-deploy-execution-after-explicit-approval.md
git commit -m "fix: restore safe scan policy"
```

## Task 2: Add Per-Run Participant Capabilities

**Files:**
- Create: `apps/web/src/lib/live/liveParticipantCapability.ts`
- Create: `apps/web/src/lib/live/liveParticipantCapability.test.ts`

- [ ] **Step 1: Write capability tests**

```ts
import { describe, expect, it } from "vitest";
import {
  hashLiveRunCapability,
  issueLiveRunCapability,
  verifyLiveRunCapability
} from "./liveParticipantCapability.ts";

describe("live participant run capability", () => {
  it("issues a random browser value and stores only its sha256 hash", () => {
    const issued = issueLiveRunCapability(() => Buffer.alloc(32, 7));

    expect(issued.value).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(issued.hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(issued.hash).toBe(hashLiveRunCapability(issued.value));
    expect(issued.hash).not.toContain(issued.value);
  });

  it("accepts only the matching bounded capability value", () => {
    const issued = issueLiveRunCapability(() => Buffer.alloc(32, 9));

    expect(verifyLiveRunCapability(issued.value, issued.hash)).toBe(true);
    expect(verifyLiveRunCapability("bad", issued.hash)).toBe(false);
    expect(verifyLiveRunCapability(issued.value, "bad")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveParticipantCapability.test.ts
```

Expected: failure because `liveParticipantCapability.ts` does not exist.

- [ ] **Step 3: Implement the focused capability module**

```ts
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type IssuedLiveRunCapability = { value: string; hash: string };

export function hashLiveRunCapability(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function issueLiveRunCapability(
  bytes: (size: number) => Buffer = randomBytes
): IssuedLiveRunCapability {
  const value = bytes(32).toString("base64url");
  return { value, hash: hashLiveRunCapability(value) };
}

export function verifyLiveRunCapability(value: string, expectedHash: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value) || !/^[a-f0-9]{64}$/u.test(expectedHash)) return false;
  const observed = Buffer.from(hashLiveRunCapability(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return observed.length === expected.length && timingSafeEqual(observed, expected);
}
```

- [ ] **Step 4: Run the focused test**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveParticipantCapability.test.ts
```

Expected: two passing tests.

- [ ] **Step 5: Commit the capability primitive**

```powershell
git add apps/web/src/lib/live/liveParticipantCapability.ts apps/web/src/lib/live/liveParticipantCapability.test.ts
git commit -m "feat: add participant run capabilities"
```

## Task 3: Persist Capability Hashes And Receipt Evidence Metadata

**Files:**
- Modify: `apps/web/src/lib/live/liveTypes.ts`
- Modify: `apps/web/src/lib/live/liveStore.ts`
- Modify: `apps/web/src/lib/live/liveStore.test.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.ts`
- Modify: `apps/web/src/lib/live/liveSchemaMigrations.test.ts`

- [ ] **Step 1: Add failing memory and SQLite coverage**

Add tests proving all of the following:

```ts
const capabilityHash = "a".repeat(64);
expect(store.getRunForCapabilityHash("run-1", capabilityHash)?.runId).toBe("run-1");
expect(store.getRunForCapabilityHash("run-1", "b".repeat(64))).toBeUndefined();
expect(store.checkWritable()).toBe(true);
expect(store.getSchemaState().migrations).toEqual(REQUIRED_LIVE_MIGRATIONS);
```

Persist and reload a decision with:

```ts
{
  standardRpcReceiptStatus: 1,
  depositBlockNumber: 123,
  depositBlockHash: `0x${"c".repeat(64)}`,
  confirmationDepth: 3
}
```

Create one stale incomplete run and one stale matched run, then assert:

```ts
expect(store.pruneIncompleteRuns("2026-07-01T00:00:00.000Z")).toBe(1);
expect(store.getRun("stale-incomplete")).toBeUndefined();
expect(store.getRun("stale-matched")?.status).toBe("matched");
```

Update the schema test to require:

```ts
expect(REQUIRED_LIVE_MIGRATIONS).toEqual([
  "001_live_base",
  "002_nullable_decision_tx_hash",
  "003_verification_jobs",
  "004_run_capability_hash",
  "005_decision_rpc_metadata"
]);
```

- [ ] **Step 2: Run the store and migration tests and confirm failure**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveStore.test.ts src/lib/live/liveSchemaMigrations.test.ts
```

Expected: failures for the new methods, fields and migrations.

- [ ] **Step 3: Extend persisted types without breaking legacy fixtures**

Add optional legacy-compatible fields:

```ts
export type LiveRunRecord = {
  // existing fields stay unchanged
  capabilityHash?: string | null;
};

export type DecisionRecord = {
  // existing fields stay unchanged
  standardRpcReceiptStatus?: 1 | 0 | null;
  depositBlockNumber?: number | null;
  depositBlockHash?: string | null;
  confirmationDepth?: number | null;
};
```

Extend `LiveStore` with:

```ts
getRunForCapabilityHash(runId: string, capabilityHash: string): LiveRunRecord | undefined;
checkWritable(): boolean;
getSchemaState(): LiveSchemaStateInput;
pruneIncompleteRuns(cutoffIso: string): number;
```

- [ ] **Step 4: Add SQLite columns and migration records**

The `runs` table gains nullable `capabilityHash text`. The `decisions` table gains nullable `standardRpcReceiptStatus integer`, `depositBlockNumber integer`, `depositBlockHash text`, and `confirmationDepth integer` columns. Add narrow `pragma table_info` guards before each `alter table` so existing local databases migrate once.

Record these migrations exactly:

```ts
["004_run_capability_hash", "run-capability-hash"],
["005_decision_rpc_metadata", "decision-rpc-metadata"]
```

Implement `checkWritable()` for SQLite with `begin immediate` and a `finally` rollback, returning `false` on failure; memory returns `true`. `getSchemaState()` reads `schema_migrations` and `pragma table_info` without exposing the DB path. Implement capability lookup with both run ID and hash in one query; never expose the stored hash in API projections.

`pruneIncompleteRuns(cutoffIso)` removes only runs older than the cutoff whose status is not `matched`, `mismatched`, or `failed`, together with their submitted transaction, verifier-input and verification-job rows in one transaction. It preserves every terminal decision and receipt. The memory adapter follows the same rule.

- [ ] **Step 5: Run focused and full live-store tests**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveStore.test.ts src/lib/live/liveSchemaMigrations.test.ts src/lib/live/liveTypes.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit persistence changes**

```powershell
git add apps/web/src/lib/live/liveTypes.ts apps/web/src/lib/live/liveStore.ts apps/web/src/lib/live/liveStore.test.ts apps/web/src/lib/live/liveSchemaMigrations.ts apps/web/src/lib/live/liveSchemaMigrations.test.ts
git commit -m "feat: persist participant and receipt evidence state"
```

## Task 4: Add Public Configuration And Chain Readiness

**Files:**
- Create: `apps/web/src/lib/live/livePublicConfig.ts`
- Create: `apps/web/src/lib/live/livePublicConfig.test.ts`
- Create: `apps/web/src/lib/live/liveChainReadiness.ts`
- Create: `apps/web/src/lib/live/liveChainReadiness.test.ts`
- Modify: `apps/web/src/lib/live/liveEnv.ts`
- Modify: `apps/web/src/lib/live/liveEnv.test.ts`
- Modify: `apps/web/src/lib/live/liveHealth.ts`
- Modify: `apps/web/src/lib/live/liveHealth.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write public-config and readiness tests**

The public projection test must expect this shape and confirm that no signer material or provider URL is serialized:

```ts
expect(config).toEqual({
  chainId: 91342,
  chainName: "GIWA Sepolia",
  explorerTxBaseUrl: "https://sepolia-explorer.giwa.io/tx/",
  faucetHelpUrl: "https://docs.giwa.io/introduction/try-giwa",
  minGasBalanceWei: "100000000000000",
  demoAmountBaseUnits: "1000000000000000000",
  contracts: {
    mockToken: "0x06a26a1182bd40ec38b38ee987a0a16cf572222f",
    mockVault: "0x94c7a4deb22318ff798cbe8340d7cc3365c405f6",
    intentRail: "0x5282325c5b82e9e3fb39050bdd8ec0f500185597"
  }
});
expect(JSON.stringify(config)).not.toMatch(/signer|rpc/iu);
```

The chain probe test uses a fake client and verifies wrong-chain, missing-bytecode and timeout results without making network calls.

- [ ] **Step 2: Run both new tests and confirm failure**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/livePublicConfig.test.ts src/lib/live/liveChainReadiness.test.ts
```

Expected: failure because both modules are absent.

- [ ] **Step 3: Implement the public configuration builder**

Define `GASOK_CAMPAIGN_ID = "gasok-demo"`, `GASOK_MISSION_ID = "first-mock-vault-deposit"`, and `GASOK_DEMO_AMOUNT_BASE_UNITS = "1000000000000000000"` in this module. Validate chain ID, addresses, decimal quantities and HTTPS URLs before returning `LivePublicConfig`. Convert the transaction explorer template by removing `{txHash}`; do not expose the Standard RPC endpoint.

- [ ] **Step 4: Implement the chain probe with an injected client**

Use this interface so tests remain deterministic:

```ts
export type LiveChainReadinessClient = {
  getChainId(): Promise<number>;
  getBytecode(input: { address: `0x${string}` }): Promise<`0x${string}` | undefined>;
};

export type LiveChainReadiness = {
  ok: boolean;
  chainId: "ok" | "wrong" | "unavailable";
  contracts: Record<"mockToken" | "mockVault" | "intentRail", "ok" | "missing" | "unavailable">;
};
```

Wrap the complete probe in an 8-second timeout and return bounded states rather than upstream messages.

- [ ] **Step 5: Narrow the live runtime configuration**

`LiveServerEnv` keeps only values used by the web runtime: Standard RPC endpoint, explorer templates, campaign signer material, DB path, public origin, minimum gas quantity and faucet help URL. Remove the unused submitter and verifier signer fields from `requireLiveServerEnv`; contract-operation scripts retain their own environment contract.

For hosted mode, require `GIWA_LIVE_PUBLIC_ORIGIN`, `GIWA_LIVE_MIN_GAS_WEI`, `GIWA_LIVE_FAUCET_HELP_URL`, and `GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS`. Classify them as origin, decimal quantity, HTTPS URL and positive integer without returning their raw values from readiness. Require the public origin to be included exactly once in `GIWA_LIVE_ALLOWED_ORIGINS`.

Document the hosted variable names without values in `.env.example`; retain the contract-operation variables already used by package scripts.

- [ ] **Step 6: Expand redacted readiness**

Add these booleans to `LiveReadinessInput` and its `checks` projection:

```ts
storageReady: boolean;
chainReady: boolean;
signerReady: boolean;
originReady: boolean;
verifierReady: boolean;
schemaReady: boolean;
```

`ready` is true only when all existing and new checks are true. Tests must assert that output contains only the bounded check names and no runtime values.

- [ ] **Step 7: Run focused tests and typecheck**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/livePublicConfig.test.ts src/lib/live/liveChainReadiness.test.ts src/lib/live/liveEnv.test.ts src/lib/live/liveHealth.test.ts
pnpm --filter @giwa/web typecheck
```

Expected: all tests and typecheck pass.

- [ ] **Step 8: Commit configuration and readiness**

```powershell
git add apps/web/src/lib/live/livePublicConfig.ts apps/web/src/lib/live/livePublicConfig.test.ts apps/web/src/lib/live/liveChainReadiness.ts apps/web/src/lib/live/liveChainReadiness.test.ts apps/web/src/lib/live/liveEnv.ts apps/web/src/lib/live/liveEnv.test.ts apps/web/src/lib/live/liveHealth.ts apps/web/src/lib/live/liveHealth.test.ts .env.example
git commit -m "feat: add public config and chain readiness"
```

## Task 5: Enforce Public, Participant And Partner Route Policies

**Files:**
- Create: `apps/web/src/lib/live/liveRoutePolicy.ts`
- Create: `apps/web/src/lib/live/liveRoutePolicy.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/src/lib/live/liveRequestSafety.ts`
- Modify: `apps/web/src/lib/live/liveRequestSafety.test.ts`
- Modify: `apps/web/src/lib/verifier/standardRpcReceiptClient.ts`
- Modify: `apps/web/src/lib/verifier/standardRpcReceiptClient.test.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.ts`
- Modify: `apps/web/src/lib/verifier/liveVerifierService.test.ts`

- [ ] **Step 1: Write route-classification tests**

```ts
expect(classifyLiveApiRoute("GET", "/api/public/config")).toBe("public");
expect(classifyLiveApiRoute("POST", "/api/runs")).toBe("participant-create");
expect(classifyLiveApiRoute("GET", "/api/runs/run-1")).toBe("participant");
expect(classifyLiveApiRoute("POST", "/api/runs/run-1/evidence")).toBe("participant");
expect(classifyLiveApiRoute("GET", "/api/receipts/0xabc")).toBe("public");
expect(classifyLiveApiRoute("GET", "/api/partner/runs")).toBe("partner");
expect(classifyLiveApiRoute("GET", "/api/unknown")).toBe("unknown");
```

- [ ] **Step 2: Run the route-policy test and confirm failure**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveRoutePolicy.test.ts
```

Expected: missing-module failure.

- [ ] **Step 3: Implement explicit route classification**

```ts
export type LiveApiRouteClass = "public" | "participant-create" | "participant" | "partner" | "unknown";

export function classifyLiveApiRoute(method: string, pathname: string): LiveApiRouteClass {
  if (method === "GET" && (pathname === "/api/public/config" || pathname === "/api/demo/status")) return "public";
  if (method === "GET" && pathname.startsWith("/api/receipts/")) return "public";
  if (method === "POST" && pathname === "/api/runs") return "participant-create";
  if (pathname.startsWith("/api/runs/")) return "participant";
  if (pathname.startsWith("/api/partner/")) return "partner";
  return "unknown";
}
```

- [ ] **Step 4: Add failing API boundary tests**

Cover these cases in `liveApi.test.ts`:

1. Hosted `POST /api/runs` succeeds without partner credentials and returns `runCapability` once.
2. The server fixes campaign and mission; body-supplied campaign, mission, tenant, target, asset or spender keys return `400 fixed_policy_override_not_allowed`.
3. Missing capability on a run route returns `401 run_capability_required`.
4. Incorrect capability returns non-enumerating `404 run_not_found`.
5. Correct capability permits evidence, verify and invalidate.
6. `GET /api/public/config` and matched receipt reads are public.
7. `GET /api/partner/runs` still requires scoped partner credentials.
8. `staging-testnet` verifies synchronously; only `prod-testnet` uses the queued branch.
9. A timeout remains retryable and does not save a terminal decision.
10. Public receipt output includes verifier input hash, block number, block hash, confirmation depth and testnet notice.
11. A transaction whose Standard RPC receipt is not available yet returns retryable `timeout` with null block metadata and no terminal decision.

- [ ] **Step 5: Implement capability-bound run lookup**

Extend `LiveApiRequest` with `runCapability?: string | null`. Extend dependencies with `issueRunCapability()` and `publicConfig`. On hosted run routes:

```ts
function participantRun(deps: LiveApiDependencies, request: LiveApiRequest, runId: string): LiveRunRecord | undefined {
  if ((deps.mode ?? "local") === "local") return deps.store.getRun(runId);
  if (typeof request.runCapability !== "string") return undefined;
  return deps.store.getRunForCapabilityHash(runId, hashLiveRunCapability(request.runCapability));
}
```

Check the missing-capability case before lookup so it returns `401`; return `404` for a wrong value. Never include `capabilityHash` in `runResponse`, partner projections, receipt projections or telemetry.

- [ ] **Step 6: Fix campaign policy and verification behavior**

`POST /api/runs` accepts `wallet`, `chainId`, nullable `referralCode`, and legacy campaign/mission fields only when they equal the fixed policy. Reject every other key and every differing campaign/mission value:

```ts
const RUN_CREATE_KEYS = new Set(["wallet", "chainId", "referralCode", "campaignId", "missionId"]);

function assertFixedRunPolicy(body: Record<string, unknown>): void {
  if (Object.keys(body).some((key) => !RUN_CREATE_KEYS.has(key))) {
    throw new Error("fixed_policy_override_not_allowed");
  }
  if (body.campaignId !== undefined && body.campaignId !== GASOK_CAMPAIGN_ID) {
    throw new Error("fixed_policy_override_not_allowed");
  }
  if (body.missionId !== undefined && body.missionId !== GASOK_MISSION_ID) {
    throw new Error("fixed_policy_override_not_allowed");
  }
}
```

Always supply `GASOK_CAMPAIGN_ID` and `GASOK_MISSION_ID` to the manifest issuer. Remove the global hosted-auth rejection and enforce access at each route class. Generate a capability, store only its hash, include the raw value only in the `201` response, and include `issued.runId` in the idempotency key so a new evaluator attempt does not inherit an unrecoverable older capability. Add `fixed_policy_override_not_allowed` and `run_capability_required` to bounded API error mapping.

Change the queued branch condition to:

```ts
if ((deps.mode ?? "local") === "prod-testnet" && deps.verificationJobs !== undefined) {
```

When saving a terminal decision, persist all Standard RPC evidence metadata returned by the verifier. Timeout responses retain `status: "timeout"` and a retry path but do not save a decision or receipt.

For timeout results, define Standard RPC metadata as nullable:

```ts
standardRpcReceiptStatus: 1 | 0 | null;
depositBlockNumber: number | null;
depositBlockHash: string | null;
confirmationDepth: number;
```

Normalize receipt-not-found and bounded RPC timeout failures inside `standardRpcReceiptClient.ts` to a typed retryable error code. `verifyLiveRun` converts only that typed error to `decision: "timeout"`, `failureReason: "UNDER_CONFIRMED"`, zero confirmations and null block metadata. All other upstream failures continue through bounded API error handling; raw messages never reach the response.

- [ ] **Step 7: Make origin checks apply to state-changing API requests**

Keep method and media-type checks unchanged. Apply the exact origin allowlist only when `pathname` starts with `/api/` and `method === "POST"`. Add tests showing a same-origin GET without an `Origin` header is accepted while a hosted POST without an allowed origin is rejected.

- [ ] **Step 8: Run API and boundary tests**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveRoutePolicy.test.ts src/lib/live/liveApi.test.ts src/lib/live/liveRequestSafety.test.ts src/lib/verifier/standardRpcReceiptClient.test.ts src/lib/verifier/liveVerifierService.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 9: Commit API policy changes**

```powershell
git add apps/web/src/lib/live/liveRoutePolicy.ts apps/web/src/lib/live/liveRoutePolicy.test.ts apps/web/src/lib/live/liveApi.ts apps/web/src/lib/live/liveApi.test.ts apps/web/src/lib/live/liveRequestSafety.ts apps/web/src/lib/live/liveRequestSafety.test.ts apps/web/src/lib/verifier/standardRpcReceiptClient.ts apps/web/src/lib/verifier/standardRpcReceiptClient.test.ts apps/web/src/lib/verifier/liveVerifierService.ts apps/web/src/lib/verifier/liveVerifierService.test.ts
git commit -m "feat: open capability-bound participant API"
```

## Task 6: Wire The Hosted HTTP Runtime And Graceful Shutdown

**Files:**
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/scripts/serve-static.mjs`
- Modify: `apps/web/src/lib/live/liveRateLimit.ts`
- Modify: `apps/web/src/lib/live/liveRateLimit.test.ts`
- Modify: `apps/web/src/lib/live/userRouteMapping.test.ts`
- Modify: `apps/web/src/lib/live/runtimeSourceImports.test.ts`

- [ ] **Step 1: Add failing runtime source assertions**

Assert that the live server imports `classifyLiveApiRoute`, `issueLiveRunCapability`, `buildLivePublicConfig`, and `probeLiveChainReadiness`; reads the `x-giwa-run-capability` header; authenticates only `partner` routes; and closes both HTTP server and SQLite store on `SIGTERM` and `SIGINT`.

Assert that both servers respect `GIWA_SKIP_PUBLIC_EXPORT=1`, preventing startup writes inside an immutable release directory.

Assert that the live server prunes only incomplete runs at startup and every six hours using the configured retention period, and clears the timer during shutdown.

- [ ] **Step 2: Run the runtime source tests and confirm failure**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/userRouteMapping.test.ts src/lib/live/runtimeSourceImports.test.ts
```

Expected: failures for the missing imports and shutdown/export guards.

- [ ] **Step 3: Build live dependencies from validated configuration**

In `serve-live.mjs`:

- build `publicConfig` from deployment JSON and validated hosted values;
- create a viem public client for the chain probe;
- call `issueLiveRunCapability()` through the API dependency;
- pass `runCapability` from the request header to `createLiveApiHandler`;
- use the validated public origin as `baseUrl`;
- set verifier version to `gasok-staging-1`;
- keep the trust policy at chain `91342`, exact amount, exact allowance, and three confirmations.

The participant browser never receives the Standard RPC endpoint or campaign signer material.

- [ ] **Step 4: Route authentication by class**

Use `classifyLiveApiRoute` before authentication. Partner routes call `authenticateLiveRequest`; public and participant routes use `auth: null`. Unknown routes proceed to the API handler and receive bounded `404` output. Do not inspect or log the run capability value.

- [ ] **Step 5: Adjust bounded rate limits**

Use these single-instance staging limits:

```ts
export const LIVE_RATE_LIMIT_POLICY = {
  generalPerIpPerMinute: 120,
  createRunPerIpPerMinute: 12,
  verifyPerRunPerMinute: 10,
  partnerPerCredentialPerMinute: 60
} as const;
```

Keep buckets hashed. Apply the create limit to exactly `POST /api/runs` and the verify limit to exactly `/verify` routes. Tests must prove the raw wallet, remote address and partner identity do not appear in bucket names.

- [ ] **Step 6: Make readiness probe real and redacted**

On `/readyz`, await the bounded chain probe and combine:

- SQLite `checkWritable()`;
- `evaluateLiveSchemaState` with all required migrations;
- chain ID and three contract bytecode results;
- manifest signer availability;
- exact hosted origin configuration;
- verifier client availability;
- existing auth, tenant, request safety, rate and telemetry gates.

Return `503` unless every required staging check is green. Return only bounded check states.

- [ ] **Step 7: Add shutdown and immutable-release guards**

Wrap startup in a function that retains `server` and `store`. Register one shutdown handler that stops accepting requests, closes SQLite after the HTTP close callback, and exits with a bounded timeout fallback. Guard `exportFlowData()` in both servers:

```js
if (process.env.GIWA_SKIP_PUBLIC_EXPORT !== "1") exportFlowData();
```

Compute the retention cutoff from the validated positive-hour setting, call `pruneIncompleteRuns` once after store creation, and repeat every six hours. Log only the removed row count. Clear the interval before closing SQLite.

- [ ] **Step 8: Run runtime tests and syntax checks**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/liveRateLimit.test.ts src/lib/live/userRouteMapping.test.ts src/lib/live/runtimeSourceImports.test.ts src/lib/live/liveHealth.test.ts
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
```

Expected: all tests pass and both syntax checks exit `0`.

- [ ] **Step 9: Commit runtime wiring**

```powershell
git add apps/web/scripts/serve-live.mjs apps/web/scripts/serve-static.mjs apps/web/src/lib/live/liveRateLimit.ts apps/web/src/lib/live/liveRateLimit.test.ts apps/web/src/lib/live/userRouteMapping.test.ts apps/web/src/lib/live/runtimeSourceImports.test.ts
git commit -m "feat: wire staging participant runtime"
```

## Task 7: Add Wallet Asset Readiness And Mock Mint Encoding

**Files:**
- Create: `apps/web/src/lib/transaction/mockTokenMintCalldata.ts`
- Create: `apps/web/src/lib/transaction/mockTokenMintCalldata.test.ts`
- Create: `apps/web/src/lib/wallet/walletAssetReadiness.ts`
- Create: `apps/web/src/lib/wallet/walletAssetReadiness.test.ts`
- Modify: `apps/web/src/lib/wallet/eip1193Provider.ts`
- Modify: `apps/web/src/lib/wallet/eip1193Provider.test.ts`

- [ ] **Step 1: Write mint calldata tests**

```ts
expect(
  buildMockTokenMintCalldata({
    to: "0x1111111111111111111111111111111111111111",
    amountBaseUnits: "1000000000000000000"
  })
).toBe(
  `0x40c10f19${"1".repeat(40).padStart(64, "0")}${BigInt("1000000000000000000").toString(16).padStart(64, "0")}`
);
expect(() => buildMockTokenMintCalldata({ to: "bad", amountBaseUnits: "1" })).toThrow();
expect(() => buildMockTokenMintCalldata({ to: "0x1111111111111111111111111111111111111111", amountBaseUnits: "0" })).toThrow();
```

- [ ] **Step 2: Write readiness-state tests**

Cover these exact outcomes:

```ts
expect(evaluateWalletAssetReadiness({ gasWei: 0n, minGasWei: 1n, tokenBalance: 0n, requiredAmount: 10n, allowance: 0n })).toEqual({ next: "gas_required", approveRequired: true });
expect(evaluateWalletAssetReadiness({ gasWei: 1n, minGasWei: 1n, tokenBalance: 0n, requiredAmount: 10n, allowance: 0n })).toEqual({ next: "mint_required", approveRequired: true });
expect(evaluateWalletAssetReadiness({ gasWei: 1n, minGasWei: 1n, tokenBalance: 10n, requiredAmount: 10n, allowance: 0n })).toEqual({ next: "approval_required", approveRequired: true });
expect(evaluateWalletAssetReadiness({ gasWei: 1n, minGasWei: 1n, tokenBalance: 10n, requiredAmount: 10n, allowance: 10n })).toEqual({ next: "deposit_ready", approveRequired: false });
```

- [ ] **Step 3: Run both tests and confirm failure**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/transaction/mockTokenMintCalldata.test.ts src/lib/wallet/walletAssetReadiness.test.ts
```

Expected: missing-module failures.

- [ ] **Step 4: Implement the minimal pure modules**

Use selector `0x40c10f19` for `mint(address,uint256)`. Reuse the validation style from `erc20ApproveCalldata.ts`; require a positive base-unit amount.

Define:

```ts
export type WalletAssetNext = "gas_required" | "mint_required" | "approval_required" | "deposit_ready";

export function evaluateWalletAssetReadiness(input: {
  gasWei: bigint;
  minGasWei: bigint;
  tokenBalance: bigint;
  requiredAmount: bigint;
  allowance: bigint;
}): { next: WalletAssetNext; approveRequired: boolean } {
  const approveRequired = input.allowance < input.requiredAmount;
  if (input.gasWei < input.minGasWei) return { next: "gas_required", approveRequired };
  if (input.tokenBalance < input.requiredAmount) return { next: "mint_required", approveRequired };
  if (approveRequired) return { next: "approval_required", approveRequired: true };
  return { next: "deposit_ready", approveRequired: false };
}
```

- [ ] **Step 5: Extend the EIP-1193 adapter for read calls and receipt polling**

Add typed methods for `eth_getBalance`, `eth_call`, and `eth_getTransactionReceipt`. Normalize quantities to `bigint`; treat a null receipt as pending; accept only `0x1` as success and `0x0` as reverted. Tests use the existing fake provider and assert exact JSON-RPC method names.

- [ ] **Step 6: Run focused wallet and transaction tests**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/transaction/mockTokenMintCalldata.test.ts src/lib/wallet/walletAssetReadiness.test.ts src/lib/wallet/eip1193Provider.test.ts src/lib/transaction/walletTransactionRequest.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 7: Commit wallet readiness primitives**

```powershell
git add apps/web/src/lib/transaction/mockTokenMintCalldata.ts apps/web/src/lib/transaction/mockTokenMintCalldata.test.ts apps/web/src/lib/wallet/walletAssetReadiness.ts apps/web/src/lib/wallet/walletAssetReadiness.test.ts apps/web/src/lib/wallet/eip1193Provider.ts apps/web/src/lib/wallet/eip1193Provider.test.ts
git commit -m "feat: add fresh wallet readiness checks"
```

## Task 8: Refactor The Evaluator Page Into One Progressive Action

**Files:**
- Modify: `apps/web/public/user-flow.js`
- Modify: `apps/web/public/user.html`
- Modify: `apps/web/public/styles.css`
- Modify: `apps/web/src/lib/userFlow/userFlowState.ts`
- Modify: `apps/web/src/lib/userFlow/userFlowState.test.ts`
- Modify: `apps/web/src/lib/userFlow/userFlowCopy.ts`
- Modify: `apps/web/src/lib/userFlow/userFlowCopy.test.ts`
- Modify: `apps/web/src/lib/userFlow/userPublicBoundary.test.ts`
- Modify: `apps/web/src/lib/userFlow/userVisualPolish.test.ts`
- Modify: `apps/web/src/lib/userFlow/userReceiptView.ts`
- Modify: `apps/web/src/lib/userFlow/userReceiptView.test.ts`

- [ ] **Step 1: Add failing progressive-flow tests**

Extend the typed user flow with `gasRequired`, `mintRequired`, `approvalRequired`, `depositReady`, and `verifying` states. Tests must prove the primary CTA order:

```text
지갑 연결 → GIWA Sepolia로 전환 → 테스트 ETH 받기 → Mock Token 준비 → 액션 검토 → 정확한 수량 승인 → Vault에 예치 → 검증 중 → 영수증 보기
```

Add static source assertions proving there is one element with ID `user-primary-action`, no separate approve/deposit/verify action buttons, `sessionStorage` holds the active run, the `x-giwa-run-capability` header is attached to run requests, and the public receipt response reads fields from `body.payload` and `body.verification`.

- [ ] **Step 2: Run user-flow tests and confirm failure**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow
```

Expected: failures for the new states and source assertions.

- [ ] **Step 3: Separate session run state from local receipt history**

Use `sessionStorage` for `giwa:userRunState`, including `runCapability`. Continue using `localStorage` only for the bounded receipt list. API helpers attach the capability only to `/api/runs/<id>` requests:

```js
function participantHeaders() {
  const value = runState?.runCapability;
  return typeof value === "string"
    ? { "content-type": "application/json", "x-giwa-run-capability": value }
    : { "content-type": "application/json" };
}
```

Never copy the capability into receipt history, URLs, support summaries or console output.

- [ ] **Step 4: Load public config and inspect the connected wallet**

After chain readiness, call `GET /api/public/config`. Use wallet JSON-RPC reads for:

- native balance;
- `balanceOf(wallet)` with selector `0x70a08231`;
- `allowance(wallet, vault)` with selector `0xdd62ed3e`.

Parse returned 32-byte quantities as `BigInt`. A low gas state renders the official faucet-help link. A low token state builds and sends the permissionless mint transaction to the configured mock-token address, waits for a successful receipt, and rechecks balances before manifest issuance.

- [ ] **Step 5: Make one primary action drive the whole flow**

Implement a pure `nextPrimaryAction()` branch in `user-flow.js` with these exact action IDs:

```js
function nextPrimaryAction() {
  if (walletState.account === null) return "connect";
  if (walletState.chainId !== GIWA_CHAIN_ID) return "switch_chain";
  if (assetState.next === "gas_required") return "open_faucet";
  if (assetState.next === "mint_required") return "mint";
  if (!runState?.manifestPreview) return "issue_manifest";
  if (assetState.next === "approval_required" && !runState.approveTxHash) return "approve";
  if (!runState.depositTxHash) return "deposit";
  if (runState.status === "matched" && runState.receiptHash) return "open_receipt";
  return "verify";
}
```

After approval, wait for its successful wallet receipt and re-read allowance. If the existing allowance is already at least the manifest amount, skip approval and send no approval hash. Deposit stays bound to manifest target, asset and exact amount.

- [ ] **Step 6: Submit evidence and verify automatically**

After the deposit wallet returns a hash:

1. save it to session state;
2. POST evidence with capability;
3. call verify immediately;
4. on `timeout` or pending block evidence, wait 8 seconds and retry;
5. stop after 24 attempts and show a manual retry action;
6. stop immediately on matched, mismatched or failed;
7. navigate to the public receipt only on matched.

Use one in-flight flag to prevent duplicate wallet prompts or verify loops.

Preserve the existing account and chain listeners. A changed account or chain posts run invalidation with the capability, clears the active Manifest and readiness state from session storage, and requires a new wallet-bound Manifest. A listener failure shows bounded recovery copy and never reuses the stale run.

- [ ] **Step 7: Correct the public receipt projection**

Treat `response.ok && body.receiptHash === routeHash && body.payload.status === "matched"` as the matched condition. Render:

- receipt hash;
- deposit transaction and explorer link;
- wallet, target, asset and amount;
- deposit block number and block hash;
- confirmation depth;
- verifier input hash;
- issued time;
- `body.payload.safetyNotice`.

Do not require session state to read a public receipt. Unknown hashes stay non-enumerating.

- [ ] **Step 8: Apply Korean-first copy and responsive states**

Keep `GIWA Verified Intent Rail`, `Standard RPC`, `Manifest`, and `Receipt` as English product terms. Use Korean for guidance, errors and CTAs. Add visible pending, blocked and complete states, mobile button stacking, hash wrapping, focus styles and a reduced-motion rule. Update `<html lang="ko">`, title and loading text in `user.html`.

- [ ] **Step 9: Run user, public-boundary and transaction tests**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/userFlow src/lib/transaction src/lib/wallet
node --check apps/web/public/user-flow.js
```

Expected: all tests pass and browser script syntax is valid.

- [ ] **Step 10: Commit the evaluator flow**

```powershell
git add apps/web/public/user-flow.js apps/web/public/user.html apps/web/public/styles.css apps/web/src/lib/userFlow/userFlowState.ts apps/web/src/lib/userFlow/userFlowState.test.ts apps/web/src/lib/userFlow/userFlowCopy.ts apps/web/src/lib/userFlow/userFlowCopy.test.ts apps/web/src/lib/userFlow/userPublicBoundary.test.ts apps/web/src/lib/userFlow/userVisualPolish.test.ts apps/web/src/lib/userFlow/userReceiptView.ts apps/web/src/lib/userFlow/userReceiptView.test.ts
git commit -m "feat: add progressive evaluator wallet flow"
```

## Task 9: Add End-To-End API Contract And HTTP Smoke Coverage

**Files:**
- Create: `apps/web/src/lib/live/stagingParticipantFlow.test.ts`
- Create: `apps/web/scripts/smoke-staging.mjs`
- Create: `apps/web/src/lib/live/stagingSmokeScript.test.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write an integrated in-memory participant-flow test**

Build one handler with `mode: "staging-testnet"`, memory store, deterministic capability issuer, public config and a verifier that returns timeout once and matched on retry. The test executes:

```text
public config → create run → rejected missing capability → evidence → timeout → retry → matched receipt → public receipt read → rejected partner read
```

Assert the stored run has a capability hash but no API response except the creation response contains the raw capability.

- [ ] **Step 2: Run the integrated test and fix only integration defects**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/stagingParticipantFlow.test.ts
```

Expected: pass after correcting any contract mismatch in Tasks 3–6; do not add alternate behavior solely for the test.

- [ ] **Step 3: Create the HTTP smoke script**

The script reads `GIWA_SMOKE_BASE_URL`, requires an `http:` or `https:` URL, applies an 8-second timeout per request, and checks:

```js
const checks = [
  ["/", 200, "GIWA Verified Intent Rail"],
  ["/user", 200, "user-flow.js"],
  ["/user/help", 200, "user-flow.js"],
  ["/partner", 200, "GIWA Verified Intent Rail"],
  ["/healthz", 200, '"ok":true'],
  ["/readyz", 200, '"ready":true'],
  ["/api/public/config", 200, '"chainId":91342']
];
```

Print only path, status and pass/fail. Do not print response bodies or headers. Exit nonzero on the first failed check.

- [ ] **Step 4: Add the smoke script contract test and package command**

The test reads the source and asserts all seven paths, timeout use, bounded output and absence of runtime values. Add:

```json
"smoke:staging": "node scripts/smoke-staging.mjs"
```

- [ ] **Step 5: Run the integration and smoke-script tests**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/stagingParticipantFlow.test.ts src/lib/live/stagingSmokeScript.test.ts
node --check apps/web/scripts/smoke-staging.mjs
```

Expected: all tests pass and syntax check exits `0`.

- [ ] **Step 6: Commit integration coverage**

```powershell
git add apps/web/src/lib/live/stagingParticipantFlow.test.ts apps/web/scripts/smoke-staging.mjs apps/web/src/lib/live/stagingSmokeScript.test.ts apps/web/package.json
git commit -m "test: cover staging participant journey"
```

## Task 10: Add Versioned Lightsail Service And Proxy Assets

**Files:**
- Create: `ops/lightsail/systemd/giwa-static.service`
- Create: `ops/lightsail/systemd/giwa-live.service`
- Create: `ops/lightsail/systemd/giwa-backup.service`
- Create: `ops/lightsail/systemd/giwa-backup.timer`
- Create: `ops/lightsail/nginx/giwa-staging.conf.template`
- Create: `ops/lightsail/render-nginx-config.mjs`
- Create: `ops/lightsail/scripts/backup-live-db.sh`
- Create: `ops/lightsail/scripts/smoke-local.sh`
- Create: `apps/web/src/lib/live/lightsailOpsAssets.test.ts`

- [ ] **Step 1: Write source-level ops asset tests**

Assert that:

- both services bind through environment to `127.0.0.1`;
- the live service uses `node --experimental-strip-types`;
- both services set `GIWA_SKIP_PUBLIC_EXPORT=1`;
- only the live service can write `/var/lib/giwa`;
- the backup timer runs daily and the backup service invokes only the versioned backup script;
- Nginx limits bodies to `64k`;
- `/api/`, `/healthz`, `/readyz` and `/user` go to live;
- `/`, `/demo` and `/partner` retain static ownership;
- API upstream failure returns bounded JSON;
- user upstream failure reaches static fallback;
- no service or proxy file contains runtime values.

- [ ] **Step 2: Run the ops asset test and confirm missing files**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/lightsailOpsAssets.test.ts
```

Expected: failure because the ops files do not exist.

- [ ] **Step 3: Create hardened systemd units**

Both units use `User=giwa`, `Group=giwa`, `WorkingDirectory=/opt/giwa/current`, restart on failure, `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=strict`, and localhost ports `4176`/`4177`. The live unit reads `/etc/giwa/giwa-live.runtime` and sets `ReadWritePaths=/var/lib/giwa`. The static unit has no runtime file and no writable application paths.

The backup service is `Type=oneshot`, reads the same server-only runtime file, writes only `/var/lib/giwa/backups`, and calls `/opt/giwa/current/ops/lightsail/scripts/backup-live-db.sh`. The timer uses `OnCalendar=daily`, `Persistent=true`, and a bounded randomized delay.

- [ ] **Step 4: Create the Nginx template and renderer**

Use `__GIWA_STAGE_HOST__` as the renderer token. `render-nginx-config.mjs` requires `GIWA_STAGE_HOST` to match a DNS hostname pattern, replaces the token exactly once, refuses remaining tokens, and writes to the explicit output path argument.

The Nginx template defines static and live upstreams, `client_max_body_size 64k`, bounded proxy timeouts, forwarded scheme/host, JSON `503` for API upstream failure, and static fallback for user-page upstream failure. It starts on port 80; certificate automation adds port 443 only after DNS resolves.

- [ ] **Step 5: Create backup and on-host smoke scripts**

`backup-live-db.sh` requires readable `GIWA_LIVE_DB_PATH` and an existing `/var/lib/giwa/backups` directory, then uses `sqlite3` `.backup` into a timestamped file, verifies the backup with `pragma quick_check`, prints only the backup filename and exits nonzero on failure. It does not delete old backups.

`smoke-local.sh` checks static `4176`, live `4177`, health, readiness and public config with `curl --fail --silent --show-error --max-time 8`; it prints only route labels.

- [ ] **Step 6: Run asset tests and local syntax checks**

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/lightsailOpsAssets.test.ts
node --check ops/lightsail/render-nginx-config.mjs
```

Expected: tests and Node syntax pass. POSIX shell syntax is checked later on the Ubuntu host with `bash -n`.

- [ ] **Step 7: Commit operations assets**

```powershell
git add ops/lightsail apps/web/src/lib/live/lightsailOpsAssets.test.ts
git commit -m "chore: add Lightsail staging assets"
```

## Task 11: Update Runbook, Demo And Submission Documents

**Files:**
- Create: `docs/implementation/giwa-gasok-staging-runbook.md`
- Create: `docs/implementation/giwa-gasok-demo-script.md`
- Create: `docs/implementation/giwa-gasok-submission-checklist.md`
- Modify: `README.md`
- Modify: `docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md`
- Modify: `docs/implementation/giwa-lightsail-staging-smoke-and-rollback-plan.md`

- [ ] **Step 1: Write the staging runbook from the versioned assets**

Document the exact release layout, service names, ports, runtime variable names, backup command, local smoke command, Nginx renderer, certificate checkpoint, rollback order and static-fallback behavior. Runtime values remain outside the repository. Clearly label SQLite and the memory rate limiter as one-instance staging choices.

Document the decision gate as either current protected CI evidence or a user-approved GASOK-only local-advisory exception. The exception must name the exact source commit, scope, approver and expiry date and must not be described as protected CI.

- [ ] **Step 2: Write the 90-second demo script**

Use these timed beats:

```text
0–10s: problem and one-sentence product promise
10–22s: connect evaluator wallet and show GIWA Sepolia
22–35s: gas/token readiness and permissionless mock-token preparation
35–48s: inspect Manifest fields and exact bound
48–65s: wallet approval when required and mock-vault deposit
65–80s: Standard RPC confirmation and manifest match
80–90s: public Receipt, explorer link, partner evidence and static fallback
```

State testnet limitations explicitly and never describe confirmation as finality.

- [ ] **Step 3: Write the submission checklist**

Require actual values or links for public user URL, video, matched receipt, explorer transaction, partner surface, source commit, architecture diagram, verification output, limitation statement, contact and final submission timestamp. A missing item is a no-go; the checklist contains no empty check values in committed final evidence.

Include one bounded GIWA Wallet placement paragraph: the same fixed Manifest preview, wallet action and public Receipt route can be embedded as a future GIWA Wallet discovery entry, while the current submission does not claim an in-wallet integration.

- [ ] **Step 4: Align older Lightsail documents and README**

Replace planning-only route ownership with the approved split: live owns `/user*`, `/api/*`, health and readiness; static owns root, demo and partner fallback. Link the versioned files under `ops/lightsail`. Keep historical sprint status clear and preserve the explicit approval requirements for push, host packages, DNS, HTTPS and wallet actions.

- [ ] **Step 5: Run documentation checks**

```powershell
rg -n "TODO|FIXME|TBD" docs/implementation/giwa-gasok-*.md README.md
rg -n "instant finality|200ms confirmed|guarantee safety|perform KYC|real RWA|real yield" docs/implementation/giwa-gasok-*.md README.md
& .\scripts\ci\check-safe-scans.ps1
git diff --check
```

Expected: the first two scans return no new unguarded findings, safe scans pass, and diff check exits `0`.

- [ ] **Step 6: Commit operational documentation**

```powershell
git add docs/implementation/giwa-gasok-staging-runbook.md docs/implementation/giwa-gasok-demo-script.md docs/implementation/giwa-gasok-submission-checklist.md docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md docs/implementation/giwa-lightsail-staging-smoke-and-rollback-plan.md README.md
git commit -m "docs: add GASOK staging and submission runbook"
```

## Task 12: Run The Full Local Gate And Refresh Provenance

**Files:**
- Modify: `docs/evidence/local-artifact-manifest.json`
- Modify: `docs/evidence/local-command-evidence-report.json`
- Modify: `docs/evidence/local-provenance-report.json`
- Modify: `docs/evidence/local-provenance-report.json.sha256`
- Modify: `docs/evidence/local-provenance-verification.json`

- [ ] **Step 1: Run focused safety and syntax gates**

```powershell
& .\scripts\ci\check-safe-scans.ps1
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/serve-static.mjs
node --check apps/web/scripts/smoke-staging.mjs
node --check apps/web/public/user-flow.js
node --check ops/lightsail/render-nginx-config.mjs
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 2: Run tests and typecheck**

```powershell
pnpm test
pnpm typecheck
```

Expected: all package tests and all three package typechecks pass.

- [ ] **Step 3: Ask before the full workspace build, then run it**

This repository requires explicit approval before a full build. After approval:

```powershell
pnpm build
```

Expected: protocol, contracts and web builds pass.

- [ ] **Step 4: Regenerate the final local-advisory provenance bundle**

Run only after public assets, evidence and implementation documents are stable:

```powershell
pnpm --filter @giwa/web artifact:local
pnpm --filter @giwa/web artifact:provenance:verify
pnpm --filter @giwa/web exec node --experimental-strip-types scripts/verify-provenance-report.mjs --check
pnpm --filter @giwa/web exec vitest run src/lib/provenance
```

Expected: public artifact scan passes, verification decision is `pass`, drift decision is `pass`, and provenance tests pass. The bundle remains `local-advisory`, `releaseGrade: false`, and `canUnblockStaging: false`.

- [ ] **Step 5: Verify generated evidence binding**

```powershell
$sidecar=(Get-Content docs/evidence/local-provenance-report.json.sha256).Split()[0]
$actual=(Get-FileHash docs/evidence/local-provenance-report.json -Algorithm SHA256).Hash.ToLowerInvariant()
if ($sidecar -ne $actual) { throw "provenance sidecar mismatch" }
git diff --check
```

Expected: no exception and clean diff format.

- [ ] **Step 6: Commit the green local evidence**

```powershell
git add docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-report.json.sha256 docs/evidence/local-provenance-verification.json
git commit -m "chore: refresh local provenance evidence"
```

## Task 13: Run A Fresh Local GIWA Sepolia Rehearsal

**Files:**
- Create after a real run: `docs/evidence/gasok-local-rehearsal-2026-07.json`
- Create after visual verification: `docs/evidence/browser-smoke/gasok-local-desktop-user.png`
- Create after visual verification: `docs/evidence/browser-smoke/gasok-local-mobile-receipt.png`

- [ ] **Step 1: Prepare a private local staging runtime**

Use a new DB under `apps/web/.data`, mode `staging-testnet`, host `127.0.0.1`, the exact local origin, deployed addresses, campaign signer material and a deterministic partner credential hash. Do not print the runtime file or values. Validate `/readyz` before opening the browser.

- [ ] **Step 2: Start static and live services**

```powershell
$env:PORT='4176'; pnpm --filter @giwa/web serve
```

Run the live service in a separate terminal with the approved private runtime loaded:

```powershell
$env:HOST='127.0.0.1'; $env:PORT='4177'; pnpm --filter @giwa/web serve:live
```

Expected: static health responds on `4176`; live health and readiness respond on `4177`; no raw runtime value appears in logs.

- [ ] **Step 3: Run HTTP smoke**

```powershell
$env:GIWA_SMOKE_BASE_URL='http://127.0.0.1:4177'; pnpm --filter @giwa/web smoke:staging
```

Expected: all seven smoke checks pass.

- [ ] **Step 4: Execute the fresh-wallet browser flow**

Codex controls navigation and inspection. The user performs the human wallet connection and approves only the displayed GIWA Sepolia transactions. Confirm in order: chain switch, gas readiness, self-mint if needed, Manifest preview, exact approval or allowance skip, deposit, pending confirmation, matched Receipt and explorer link.

- [ ] **Step 5: Capture truthful rehearsal evidence**

The JSON evidence contains only public origin category, source commit, chain ID, public addresses, transaction hashes, receipt hash, block metadata, verifier input hash, smoke results, screenshot paths, timestamps and `authority: "local-advisory"`. It contains no runtime values, capability values, local DB path or wallet signing material.

- [ ] **Step 6: Re-run gates because a tracked evidence file changed**

```powershell
& .\scripts\ci\check-safe-scans.ps1
pnpm --filter @giwa/web artifact:local
pnpm --filter @giwa/web artifact:provenance:verify
pnpm --filter @giwa/web exec node --experimental-strip-types scripts/verify-provenance-report.mjs --check
pnpm test
```

Expected: all gates pass.

- [ ] **Step 7: Commit real rehearsal evidence**

```powershell
git add docs/evidence/gasok-local-rehearsal-2026-07.json docs/evidence/browser-smoke/gasok-local-desktop-user.png docs/evidence/browser-smoke/gasok-local-mobile-receipt.png docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-report.json.sha256 docs/evidence/local-provenance-verification.json
git commit -m "test: record fresh GASOK rehearsal"
```

## Task 14: Deploy The Exact Commit To Existing Lightsail

**Files:**
- Host state only until public evidence is captured
- Modify after successful smoke: `docs/evidence/gasok-lightsail-staging-2026-07.json`

- [ ] **Step 1: Obtain the external checkpoints**

Required before mutation: user approval for git push, exact Lightsail SSH target, approved Ubuntu package installation, release and rollback owners, public origin, DNS owner, HTTPS method, runtime placement, wallet transaction approval, and either current protected CI evidence or the exact-commit GASOK-only local-advisory exception. Stop if any checkpoint needed for the current phase is missing.

- [ ] **Step 2: Push the reviewed commit after approval**

```powershell
git status --short
git log -1 --format='%H %s'
git push origin HEAD
```

Expected: clean worktree and successful push of the exact reviewed commit. Record the commit hash.

- [ ] **Step 3: Validate private operator shell inputs**

Set `GIWA_STAGE_SSH`, `GIWA_STAGE_HOST`, and `GIWA_STAGE_COMMIT` in the private operator shell, then validate:

```powershell
foreach($name in 'GIWA_STAGE_SSH','GIWA_STAGE_HOST','GIWA_STAGE_COMMIT') {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) { throw "$name is required" }
}
if ($env:GIWA_STAGE_COMMIT -notmatch '^[a-f0-9]{40}$') { throw 'invalid commit hash' }
```

- [ ] **Step 4: Prepare the host after package-install approval**

On Ubuntu, install the approved Node/pnpm runtime, Nginx, certificate tooling and SQLite CLI; create the `giwa` service user and `/opt/giwa/releases`, `/var/lib/giwa/backups`, `/etc/giwa`. Restrict `/etc/giwa/giwa-live.runtime` to the service owner. No runtime value enters repository files or command output captured as evidence.

- [ ] **Step 5: Check out, install and build the exact commit**

Before changing the current release, run the versioned DB backup script if the live DB exists and verify `pragma quick_check`. Create `/opt/giwa/releases/$GIWA_STAGE_COMMIT`, check out that exact commit, run `pnpm install --frozen-lockfile`, and run `pnpm build`. Point `/opt/giwa/current` to the release only after build success. Preserve the previous symlink target for rollback.

- [ ] **Step 6: Install and validate services**

Copy the versioned unit files, run `systemctl daemon-reload`, start static first, then run `bash -n` on both ops shell scripts and `smoke-local.sh`. Start live only after runtime placement and `/readyz` are green. Verify both Node processes bind only to loopback.

- [ ] **Step 7: Install proxy, DNS and HTTPS in two phases**

Render Nginx config with the validated host, run `nginx -t`, enable HTTP, and smoke by hostname or temporary host mapping. After DNS resolves to the Lightsail static IP, enable the approved certificate method, rerun `nginx -t`, reload, and verify HTTPS renewal configuration. HTTP redirects to HTTPS only after HTTPS smoke passes.

- [ ] **Step 8: Run public smoke and one fresh evaluator transaction**

```powershell
$env:GIWA_SMOKE_BASE_URL="https://$env:GIWA_STAGE_HOST"
pnpm --filter @giwa/web smoke:staging
```

Then execute the browser wallet flow with the user's transaction approvals. Verify public receipt access in a separate browser context without the run capability.

- [ ] **Step 9: Exercise rollback without deleting the new release**

Stop live, confirm static fallback, repoint `/opt/giwa/current` to the preserved prior release, restart static, and smoke. Restore the new release symlink, start static and live, and smoke again. Do not restore a DB backup unless a real storage failure requires the separately approved restore decision.

- [ ] **Step 10: Record and commit public deployment evidence**

The evidence JSON contains source commit, public URL, service-state summary, redacted readiness, smoke results, backup filename, public transaction and receipt identifiers, rollback rehearsal result, release owner, rollback owner and go/no-go decision. Refresh provenance after adding it and rerun tests:

```powershell
pnpm --filter @giwa/web artifact:local
pnpm --filter @giwa/web artifact:provenance:verify
pnpm --filter @giwa/web exec node --experimental-strip-types scripts/verify-provenance-report.mjs --check
pnpm test
```

Then commit:

```powershell
git add docs/evidence/gasok-lightsail-staging-2026-07.json docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-report.json.sha256 docs/evidence/local-provenance-verification.json
git commit -m "docs: record GASOK staging deployment"
```

## Task 15: Produce The Submission Package And Freeze

**Files:**
- Create after real capture: `docs/evidence/browser-smoke/gasok-staging-desktop-user.png`
- Create after real capture: `docs/evidence/browser-smoke/gasok-staging-mobile-receipt.png`
- Create after real capture: `docs/evidence/gasok-submission-package-2026-07.json`
- Modify: `docs/implementation/giwa-gasok-submission-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Capture desktop and mobile public visuals**

Capture entry, readiness, Manifest preview, verification progress and matched Receipt at desktop and mobile widths. Inspect browser console and network panel for uncaught errors, failed same-origin requests, capability leakage and layout overflow.

- [ ] **Step 2: Record the 90-second demo**

Use the approved demo script. Pre-fund only testnet gas if needed; do not pre-seed token balance when demonstrating self-mint. Waiting between confirmed public events may be edited for pacing, but the narration must preserve the true Standard RPC confirmation sequence.

- [ ] **Step 3: Complete the submission checklist with real links**

Fill every required field: public URL, video, matched receipt, explorer transaction, partner surface, source commit, architecture image, verification summary, limitation statement and final submission time. Verify each link in a clean browser context.

- [ ] **Step 4: Freeze tracked artifacts and refresh evidence one final time**

Confirm that the earlier full-build approval still covers this final freeze build; otherwise request it again before running the block.

```powershell
& .\scripts\ci\check-safe-scans.ps1
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @giwa/web artifact:local
pnpm --filter @giwa/web artifact:provenance:verify
pnpm --filter @giwa/web exec node --experimental-strip-types scripts/verify-provenance-report.mjs --check
git diff --check
```

Expected: every gate passes. If any tracked public or implementation file changes after this step, repeat the entire step.

- [ ] **Step 5: Commit the submission freeze**

```powershell
git add docs/evidence/browser-smoke/gasok-staging-desktop-user.png docs/evidence/browser-smoke/gasok-staging-mobile-receipt.png docs/evidence/gasok-submission-package-2026-07.json docs/implementation/giwa-gasok-submission-checklist.md README.md docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-report.json.sha256 docs/evidence/local-provenance-verification.json
git commit -m "docs: freeze GASOK submission package"
```

- [ ] **Step 6: Final no-change confirmation**

```powershell
git status --short
git log -1 --format='%H %s'
```

Expected: empty status output and the submission-freeze commit at `HEAD`. Push requires a fresh explicit approval.

## Requirement Coverage Matrix

| Approved requirement | Implemented by |
| --- | --- |
| Public HTTPS evaluator route | Tasks 10, 14 |
| Fresh wallet gas/token readiness | Tasks 4, 7, 8 |
| Permissionless self-mint | Tasks 7, 8 |
| Exact approval or allowance skip | Tasks 7, 8 |
| Wallet-bound Manifest | Existing issuer plus Tasks 5, 8 |
| Capability-scoped participant API | Tasks 2, 3, 5, 6 |
| Protected partner API | Tasks 5, 6 |
| Synchronous single-instance verification | Tasks 5, 6 |
| Pending confirmations retry only verification | Tasks 5, 8, 9 |
| Matched-only public Receipt | Tasks 3, 5, 8, 9 |
| Standard RPC evidence fields | Tasks 3, 5, 8 |
| Redacted readiness and logs | Tasks 4, 6 |
| SQLite backup and static fallback | Tasks 10, 14 |
| Safe scans and provenance green | Tasks 1, 12, 13, 15 |
| Desktop/mobile evidence | Tasks 13, 15 |
| Demo and submission package | Tasks 11, 15 |
| GIWA Wallet placement potential without live-integration claim | Task 11 |
| Incomplete-run retention and daily DB backup | Tasks 3, 4, 6, 10, 14 |

# Sprint 15 Hosted API Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the hosted API foundation for `GIWA Verified Intent Rail` without making the service public yet. Sprint 15 turns the Sprint 13 hosted blockers and Sprint 14 replay gates into a testable local/staging/prod-testnet boundary: hosted mode policy, auth context, tenant isolation, bounded requests, dependency-free rate limits, verification jobs, repository/migration guards, health/readiness, and redacted observability.

**Architecture:** Sprint 15 keeps the Sprint 7 static fallback, Sprint 12 live rehearsal path, Sprint 13 commercial receipt gate, and Sprint 14 verifier replay gate intact. The local live server remains a localhost rehearsal entrypoint. Hosted behavior is added behind explicit runtime mode and policy gates. Public host binding remains blocked unless auth, tenant, rate limit, request safety, origin, durable repository, migration, and redacted logging checks all pass. Verification moves from inline API execution toward an enqueue-and-worker model, but no new chain transaction is sent.

**Tech Stack:** TypeScript 6, Vitest 4, viem 2, Node HTTP live server, existing `node:sqlite` local adapter behind repository interfaces, existing protocol helpers, existing verifier modules, markdown docs. No new dependency is allowed in Sprint 15.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-19-giwa-commercial-readiness-design.md`
- `docs/superpowers/specs/2026-06-19-intentrail-v2-decision-anchor-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-19-sprint-13-commercial-readiness.md`
- `docs/superpowers/plans/2026-06-19-sprint-14-verifier-trust-hardening.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `apps/web/src/lib/live/*`
- `apps/web/src/lib/verifier/*`
- `apps/web/scripts/serve-live.mjs`

## Parallel Analysis Summary

Four read-only explorer passes informed this plan:

- Hosted mode and environment boundary: current `serve-live.mjs` is local-first, loads local env files internally, binds `127.0.0.1`, and should stay the rehearsal entrypoint. Hosted behavior needs a separate mode policy that rejects mock mode in `prod-testnet` and refuses public host binding until the hosted gates pass.
- Auth and tenant isolation: current live API request shape has no auth context, `/api/partner/runs` is global, and `runResponse` includes signed manifest fields. Sprint 15 needs auth-derived tenant context, tenant-scoped repository methods, redacted partner projections, and receipt hiding for cross-tenant hashes.
- Verification queue, repository, and migration: current `/verify` runs inline and the SQLite schema has no `verification_jobs` or `schema_migrations`. Sprint 15 needs a queue abstraction, worker lease model, schema version guard, and legacy DB fail-closed behavior.
- Request safety, rate limit, and observability: current server has a 64 KiB JSON body cap and malformed JSON handling, but lacks exact method handling, origin policy, auth parser, rate limiter, request IDs, health/readiness routes, and structured redacted logs.

## Sprint 15 Boundary

Allowed:

- Add hosted runtime policy models and tests.
- Add auth context and tenant derivation models with local bypass only when explicitly configured.
- Add tenant-scoped repository interfaces and local adapter tests.
- Add request safety, method, origin, and bounded error models.
- Add dependency-free in-memory rate limit models for local and staging testnet.
- Add verification job queue interfaces, local worker abstraction, and persistence tests.
- Add health/readiness models with redacted output only.
- Update `serve-live.mjs` only to wire the new boundaries while preserving localhost rehearsal defaults.
- Update docs and the sprint index.

Not allowed:

- Public hosting or deploy.
- New dependency installation.
- Wallet approve or deposit submission from server or scripts.
- `deploy:giwa`, `fund:giwa`, `anchor:giwa`, `verify:giwa`, or mint commands.
- `IntentRailV2` implementation or deployment.
- Flashblocks as final confirmation.
- Production asset, yield, settlement, identity-service, phishing-prevention, or safety-guarantee claims.
- Reading or printing real env file contents.

## Runtime Modes

Sprint 15 introduces explicit mode terms:

| Mode | Purpose | Mock Mode | Host Binding | Auth |
|---|---|---|---|---|
| `local` | existing localhost live rehearsal | allowed only with explicit flag | `127.0.0.1` | optional local bypass |
| `staging-testnet` | pre-hosted API contract smoke | disabled by default | allowed only after gates | required |
| `prod-testnet` | managed GIWA Sepolia pilot preparation | forbidden | allowed only after gates | required |

`prod-testnet` is not a production chain mode. It is a managed GIWA Sepolia pilot mode.

## Planned File Structure

Create during Sprint 15 implementation:

```text
apps/web/src/lib/live/hostedMode.ts
apps/web/src/lib/live/hostedMode.test.ts
apps/web/src/lib/live/liveAuth.ts
apps/web/src/lib/live/liveAuth.test.ts
apps/web/src/lib/live/liveTenantPolicy.ts
apps/web/src/lib/live/liveTenantPolicy.test.ts
apps/web/src/lib/live/liveRequestSafety.ts
apps/web/src/lib/live/liveRequestSafety.test.ts
apps/web/src/lib/live/liveRateLimit.ts
apps/web/src/lib/live/liveRateLimit.test.ts
apps/web/src/lib/live/verificationJobQueue.ts
apps/web/src/lib/live/verificationJobQueue.test.ts
apps/web/src/lib/live/liveSchemaMigrations.ts
apps/web/src/lib/live/liveSchemaMigrations.test.ts
apps/web/src/lib/live/liveHealth.ts
apps/web/src/lib/live/liveHealth.test.ts
apps/web/src/lib/live/liveTelemetry.ts
apps/web/src/lib/live/liveTelemetry.test.ts
```

Modify during Sprint 15 implementation:

```text
apps/web/src/lib/live/liveTypes.ts
apps/web/src/lib/live/liveStore.ts
apps/web/src/lib/live/liveStore.test.ts
apps/web/src/lib/live/liveApi.ts
apps/web/src/lib/live/liveApi.test.ts
apps/web/src/lib/live/liveApiErrors.ts
apps/web/src/lib/live/liveEnv.ts
apps/web/scripts/serve-live.mjs
docs/implementation/giwa-live-mvp-runtime-gate.md
docs/implementation/giwa-commercial-readiness-gate.md
docs/implementation/giwa-mvp-runbook.md
```

Do not create a separate public hosted server script unless a later execution review concludes it is safer than wrapping `serve-live.mjs`. If a hosted entrypoint is added, it must share the same API handler and tests rather than duplicating verifier or receipt logic.

## Task 1: Sprint 15 Boundary Docs and Index Update

### Files

- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-commercial-readiness-gate.md`
- `docs/implementation/giwa-mvp-runbook.md`

### Failing Test

- [ ] Add a documentation check that fails when Sprint 15 is missing from the sprint index or hosted blockers.

```powershell
$sprint15 = "docs\superpowers\plans\2026-06-19-sprint-15-hosted-api-foundation.md"
Select-String -Path docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md -Pattern "sprint-15-hosted-api-foundation" -Quiet
Select-String -Path docs\implementation\giwa-live-mvp-runtime-gate.md -Pattern "Sprint 15 Hosted API Foundation Boundary" -Quiet
Select-String -Path docs\implementation\giwa-commercial-readiness-gate.md -Pattern "Hosted API Foundation Gate" -Quiet
Test-Path $sprint15
```

Expected red state before implementation: the Sprint 15 plan path and boundary sections are absent.

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveDemoReadiness
```

The focused test may still pass before docs are updated; the documentation check above is the required red signal for this task.

### Minimal Implementation Direction

- Add Sprint 15 to the sprint index table after Sprint 14.
- Add a `Sprint 15 Hosted API Foundation Boundary` section to the runtime gate.
- Add a `Hosted API Foundation Gate` section to the commercial gate.
- Add a short runbook note that Sprint 15 is a foundation plan, not a public deployment.

Suggested runtime gate language:

```markdown
## Sprint 15 Hosted API Foundation Boundary

Sprint 15 prepares hosted API boundaries without exposing the local live API outside the approved host policy.

Hosted mode must fail closed when auth, tenant isolation, exact origin policy, request limits, rate limits, bounded errors, redacted logs, durable repository, and migration guards are not ready.
```

### Passing Command

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $docPattern docs\superpowers\plans\2026-06-19-sprint-15-hosted-api-foundation.md docs\implementation -g "*.md"
```

### Exit Condition

- Sprint index routes Sprint 15 correctly.
- Runtime and commercial gate docs state that Sprint 15 does not authorize public hosting.
- No unfinished-marker matches were introduced.

## Task 2: Hosted Mode and Env Policy Model

### Files

- `apps/web/src/lib/live/hostedMode.ts`
- `apps/web/src/lib/live/hostedMode.test.ts`
- `apps/web/src/lib/live/liveEnv.ts`
- `apps/web/src/lib/live/liveEnv.test.ts`
- `apps/web/scripts/serve-live.mjs`

### Failing Test

- [ ] Write hosted mode tests before implementation.

```ts
import { describe, expect, it } from "vitest";
import { evaluateHostedModePolicy } from "./hostedMode.ts";

describe("evaluateHostedModePolicy", () => {
  it("rejects prod-testnet mock mode", () => {
    const result = evaluateHostedModePolicy({
      mode: "prod-testnet",
      mockMode: true,
      host: "127.0.0.1",
      authReady: true,
      tenantReady: true,
      rateLimitReady: true,
      requestSafetyReady: true,
      repositoryReady: true,
      telemetryReady: true
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("mock_mode_forbidden");
  });

  it("rejects public host binding before hosted gates are ready", () => {
    const result = evaluateHostedModePolicy({
      mode: "staging-testnet",
      mockMode: false,
      host: "0.0.0.0",
      authReady: false,
      tenantReady: true,
      rateLimitReady: true,
      requestSafetyReady: true,
      repositoryReady: true,
      telemetryReady: true
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("hosted_gate_not_ready");
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- hostedMode
```

Expected red state: `hostedMode.ts` does not exist.

### Minimal Implementation Direction

Implement a pure policy model:

```ts
export type HostedRuntimeMode = "local" | "staging-testnet" | "prod-testnet";

export type HostedModeInput = {
  mode: HostedRuntimeMode;
  mockMode: boolean;
  host: string;
  authReady: boolean;
  tenantReady: boolean;
  rateLimitReady: boolean;
  requestSafetyReady: boolean;
  repositoryReady: boolean;
  telemetryReady: boolean;
};

export type HostedModeResult =
  | { ok: true; reason: null }
  | { ok: false; reason: "mock_mode_forbidden" | "hosted_gate_not_ready" | "public_host_forbidden" };

export function evaluateHostedModePolicy(input: HostedModeInput): HostedModeResult {
  if (input.mode === "prod-testnet" && input.mockMode) return { ok: false, reason: "mock_mode_forbidden" };
  const publicHost = input.host !== "127.0.0.1" && input.host !== "localhost";
  const gatesReady =
    input.authReady &&
    input.tenantReady &&
    input.rateLimitReady &&
    input.requestSafetyReady &&
    input.repositoryReady &&
    input.telemetryReady;
  if (publicHost && !gatesReady) return { ok: false, reason: "hosted_gate_not_ready" };
  if (input.mode === "local" && publicHost) return { ok: false, reason: "public_host_forbidden" };
  return { ok: true, reason: null };
}
```

Extend env readiness with redacted hosted keys only. Hosted mode must not read local env files; local mode may preserve the existing loader behavior.

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- hostedMode liveEnv
```

### Exit Condition

- `prod-testnet` cannot run with mock mode.
- Public host binding fails closed until every hosted gate is ready.
- Startup logs show only redacted key states and no raw secret material.

## Task 3: Auth Context and bearer-style Credential Abstraction

### Files

- `apps/web/src/lib/live/liveAuth.ts`
- `apps/web/src/lib/live/liveAuth.test.ts`
- `apps/web/src/lib/live/liveTypes.ts`
- `apps/web/src/lib/live/liveApiErrors.ts`

### Failing Test

- [ ] Write auth context tests first.

```ts
import { describe, expect, it } from "vitest";
import { authenticateLiveRequest } from "./liveAuth.ts";

const credentials = [
  {
    id: "cred_partner_alpha",
    tenantId: "tenant_alpha",
    scopes: ["runs:write", "runs:read", "receipts:read"]
  }
];

describe("authenticateLiveRequest", () => {
  it("rejects missing credentials", () => {
    expect(authenticateLiveRequest({ headers: {}, credentials })).toEqual({
      ok: false,
      status: 401,
      code: "unauthorized"
    });
  });

  it("derives tenant from the matched credential", () => {
    const result = authenticateLiveRequest({
      headers: { "x-giwa-partner-token": "alpha-secret-for-test" },
      credentials
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.tenantId).toBe("tenant_alpha");
      expect(result.context.scopes).toContain("runs:write");
      expect(JSON.stringify(result)).not.toContain("alpha-secret-for-test");
    }
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveAuth
```

Expected red state: auth module is missing.

### Minimal Implementation Direction

Use a dependency-free credential abstraction. Store only deterministic comparison values in tests and runtime config. Do not log raw credential strings.

```ts
export type LiveAuthScope = "runs:read" | "runs:write" | "receipts:read" | "verify:write" | "partner:read";

export type LiveAuthContext = {
  actorId: string;
  tenantId: string;
  scopes: LiveAuthScope[];
  mode: "local-bypass" | "credential";
};

export type LiveCredentialRecord = {
  id: string;
  tenantId: string;
  scopes: LiveAuthScope[];
  tokenHash: string;
};
```

The implementation can use existing Node crypto APIs to compare a one-way hash of the incoming credential. If constant-time comparison is used, keep it inside `liveAuth.ts`.

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveAuth liveApiErrors
```

### Exit Condition

- Missing or invalid credential returns bounded `401`.
- Auth context carries `tenantId` and scopes.
- Raw credential input never appears in returned objects or logs.
- Local bypass is allowed only when `mode === "local"` and explicit local bypass is enabled.

## Task 4: Tenant-Scoped Partner API Model

### Files

- `apps/web/src/lib/live/liveTenantPolicy.ts`
- `apps/web/src/lib/live/liveTenantPolicy.test.ts`
- `apps/web/src/lib/live/liveStore.ts`
- `apps/web/src/lib/live/liveStore.test.ts`
- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveApi.test.ts`

### Failing Test

- [ ] Add tenant isolation tests before changing store/API behavior.

```ts
import { describe, expect, it } from "vitest";
import { createMemoryLiveStore } from "./liveStore.ts";

describe("tenant scoped live store", () => {
  it("keeps idempotency and partner listing scoped by tenant", () => {
    const store = createMemoryLiveStore();
    const base = {
      runId: "run_alpha",
      idempotencyKey: "wallet:campaign:mission:",
      wallet: "0x0000000000000000000000000000000000000001",
      campaignId: "campaign",
      missionId: "mission",
      referralCode: null,
      nonce: "nonce",
      intentHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      manifestJson: "{}",
      manifestSignature: "0xsigned",
      status: "manifestIssued",
      expiryUnix: 1999999999,
      createdAt: "2026-06-19T00:00:00.000Z",
      updatedAt: "2026-06-19T00:00:00.000Z"
    } as const;

    store.createRun({ ...base, tenantId: "tenant_alpha" });
    store.createRun({
      ...base,
      runId: "run_beta",
      tenantId: "tenant_beta",
      intentHash: "0x2222222222222222222222222222222222222222222222222222222222222222"
    });

    expect(store.listRunsForTenant("tenant_alpha")).toHaveLength(1);
    expect(store.getRunForTenant("tenant_beta", "run_alpha")).toBeUndefined();
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveTenantPolicy liveStore liveApi
```

Expected red state: `tenantId`, scoped methods, and tenant policy do not exist.

### Minimal Implementation Direction

- Add `tenantId` to `LiveRunRecord`.
- Include tenant in the idempotency key.
- Add scoped store methods:

```ts
export type TenantScopedLiveStore = LiveStore & {
  getRunForTenant(tenantId: string, runId: string): LiveRunRecord | undefined;
  listRunsForTenant(tenantId: string): LiveRunRecord[];
  getReceiptForTenant(tenantId: string, receiptHash: string): ReceiptRecord | undefined;
};
```

- `tenantId` from request body must be ignored or rejected. Tenant comes only from `LiveAuthContext`.
- Replace partner response with a redacted projection:

```ts
export type PartnerRunProjection = {
  runId: string;
  wallet: string;
  campaignId: string;
  missionId: string;
  status: string;
  intentHash: string;
  receiptHash: string | null;
  updatedAt: string;
};
```

Do not include `manifestJson` or `manifestSignature` in partner list responses.

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveTenantPolicy liveStore liveApi
```

### Exit Condition

- Partner APIs are tenant-scoped.
- Cross-tenant run and receipt access returns non-enumerating `404`.
- Same campaign/wallet/mission values can exist in separate tenants.
- Partner list responses do not expose signed manifest internals.

## Task 5: Request Safety and Bounded Error Contract

### Files

- `apps/web/src/lib/live/liveRequestSafety.ts`
- `apps/web/src/lib/live/liveRequestSafety.test.ts`
- `apps/web/src/lib/live/liveApiErrors.ts`
- `apps/web/src/lib/live/liveApiErrors.test.ts`
- `apps/web/scripts/serve-live.mjs`

### Failing Test

- [ ] Write request safety tests.

```ts
import { describe, expect, it } from "vitest";
import { evaluateLiveRequestSafety } from "./liveRequestSafety.ts";

describe("evaluateLiveRequestSafety", () => {
  it("rejects unsupported API methods", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "PUT",
        pathname: "/api/runs",
        origin: "http://127.0.0.1:4177",
        allowedOrigins: ["http://127.0.0.1:4177"],
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 405, code: "method_not_allowed" });
  });

  it("rejects unknown origins in hosted modes", () => {
    expect(
      evaluateLiveRequestSafety({
        method: "POST",
        pathname: "/api/runs",
        origin: "https://unexpected.example",
        allowedOrigins: ["https://partner.example"],
        contentType: "application/json"
      })
    ).toEqual({ ok: false, status: 403, code: "origin_not_allowed" });
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveRequestSafety liveApiErrors
```

Expected red state: request safety module is missing and non-`POST` methods are normalized to `GET`.

### Minimal Implementation Direction

- Move method/origin/content-type policy into a pure module.
- Keep `request_body_too_large` and `malformed_json` as bounded server errors.
- Add bounded public error codes:

```ts
export type LivePublicErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "unsupported_media_type"
  | "request_body_too_large"
  | "malformed_json"
  | "rate_limited"
  | "internal_error";
```

- API bodies must not include raw provider, RPC, storage, or stack messages.

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveRequestSafety liveApiErrors
node --check apps/web/scripts/serve-live.mjs
```

### Exit Condition

- Unsupported methods return `405`.
- Unknown hosted origins return bounded `403`.
- Oversized and malformed request bodies stay bounded.
- Raw upstream error messages are never returned in API bodies.

## Task 6: In-Memory Rate Limit Foundation

### Files

- `apps/web/src/lib/live/liveRateLimit.ts`
- `apps/web/src/lib/live/liveRateLimit.test.ts`
- `apps/web/scripts/serve-live.mjs`
- `apps/web/src/lib/live/liveApi.ts`

### Failing Test

- [ ] Write dependency-free rate limiter tests.

```ts
import { describe, expect, it } from "vitest";
import { createMemoryLiveRateLimiter } from "./liveRateLimit.ts";

describe("createMemoryLiveRateLimiter", () => {
  it("limits repeated verify attempts per run", () => {
    const limiter = createMemoryLiveRateLimiter({ nowMs: () => 1000 });
    const input = { bucket: "verify:run_alpha", limit: 2, windowMs: 60_000 };

    expect(limiter.consume(input).allowed).toBe(true);
    expect(limiter.consume(input).allowed).toBe(true);
    expect(limiter.consume(input)).toEqual({
      allowed: false,
      code: "rate_limited",
      retryAfterMs: 60_000
    });
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveRateLimit
```

Expected red state: rate limiter module is missing.

### Minimal Implementation Direction

Implement sliding or fixed window counters using `Map`. Include rate keys for:

- client address
- credential id hash
- tenant id
- wallet address
- run id for verify attempts

The limiter result must never include the incoming credential value.

```ts
export type RateLimitDecision =
  | { allowed: true; remaining: number; resetAtMs: number }
  | { allowed: false; code: "rate_limited"; retryAfterMs: number };
```

Repeated verify behavior:

- If a terminal decision exists, return the stored terminal state instead of running the verifier again.
- If a job is already pending or leased, return queued state.
- If neither exists, enqueue subject to per-run verify limits.

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveRateLimit liveApi
```

### Exit Condition

- Rate limits work without new packages.
- Repeated verify calls cannot fan out RPC verifier work.
- Terminal decisions are idempotent.
- Rate limit responses are bounded and do not reveal credential values.

## Task 7: Verification Job Queue Interface

### Files

- `apps/web/src/lib/live/verificationJobQueue.ts`
- `apps/web/src/lib/live/verificationJobQueue.test.ts`
- `apps/web/src/lib/live/liveTypes.ts`
- `apps/web/src/lib/live/liveStore.ts`
- `apps/web/src/lib/live/liveStore.test.ts`
- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveApi.test.ts`

### Failing Test

- [ ] Write queue tests before changing `/verify`.

```ts
import { describe, expect, it } from "vitest";
import { createMemoryVerificationJobQueue } from "./verificationJobQueue.ts";

describe("verification job queue", () => {
  it("enqueues one job per run and returns the existing pending job", () => {
    const queue = createMemoryVerificationJobQueue({ now: () => "2026-06-19T00:00:00.000Z" });
    const first = queue.enqueue({ tenantId: "tenant_alpha", runId: "run_alpha", reason: "deposit_submitted" });
    const second = queue.enqueue({ tenantId: "tenant_alpha", runId: "run_alpha", reason: "manual_verify" });

    expect(first.jobId).toBe(second.jobId);
    expect(second.status).toBe("pending");
  });

  it("leases only due pending jobs", () => {
    const queue = createMemoryVerificationJobQueue({ now: () => "2026-06-19T00:00:00.000Z" });
    queue.enqueue({ tenantId: "tenant_alpha", runId: "run_alpha", reason: "deposit_submitted" });

    const leased = queue.leaseNext({ workerId: "worker_one", leaseUntil: "2026-06-19T00:01:00.000Z" });
    expect(leased?.status).toBe("leased");
    expect(queue.leaseNext({ workerId: "worker_two", leaseUntil: "2026-06-19T00:01:00.000Z" })).toBeUndefined();
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- verificationJobQueue liveApi
```

Expected red state: queue module and job status model do not exist.

### Minimal Implementation Direction

Define job status and storage models:

```ts
export type VerificationJobStatus = "pending" | "leased" | "succeeded" | "retryable" | "dead";

export type VerificationJobRecord = {
  jobId: string;
  tenantId: string;
  runId: string;
  status: VerificationJobStatus;
  attempts: number;
  availableAt: string;
  leasedBy: string | null;
  leasedUntil: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
};
```

Update `/api/runs/:runId/verify` for Sprint 15:

- If matched/mismatched/failed already exists, return terminal decision.
- If no submitted deposit hash exists, return `deposit_evidence_required`.
- Otherwise enqueue or return existing job state.
- Worker abstraction can run inline only in local mode tests; hosted API path should be ready for poll.

Suggested response:

```json
{
  "runId": "run_alpha",
  "verification": {
    "status": "queued",
    "jobId": "job_alpha",
    "pollPath": "/api/runs/run_alpha"
  }
}
```

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- verificationJobQueue liveApi liveStore
```

### Exit Condition

- Verification can be enqueued without immediate RPC work.
- Duplicate enqueue returns the existing pending/leased job.
- Timeout remains non-terminal and does not create a receipt.
- Matched decisions still create receipts only after the verifier match path.

## Task 8: Repository and Migration Guard Model

### Files

- `apps/web/src/lib/live/liveSchemaMigrations.ts`
- `apps/web/src/lib/live/liveSchemaMigrations.test.ts`
- `apps/web/src/lib/live/liveStore.ts`
- `apps/web/src/lib/live/liveStore.test.ts`

### Failing Test

- [ ] Write schema guard tests first.

```ts
import { describe, expect, it } from "vitest";
import { evaluateLiveSchemaState } from "./liveSchemaMigrations.ts";

describe("evaluateLiveSchemaState", () => {
  it("rejects pre-Sprint14 decisions schema", () => {
    const result = evaluateLiveSchemaState({
      migrations: [],
      tables: {
        decisions: [{ name: "decisionTxHash", notNull: true }]
      }
    });

    expect(result).toEqual({
      ok: false,
      reason: "legacy_decision_tx_hash_not_nullable"
    });
  });

  it("requires verification job migration in hosted modes", () => {
    const result = evaluateLiveSchemaState({
      migrations: ["001_live_base", "002_nullable_decision_tx_hash"],
      tables: { decisions: [{ name: "decisionTxHash", notNull: false }] },
      requiredMigrations: ["001_live_base", "002_nullable_decision_tx_hash", "003_verification_jobs"]
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("migration_missing");
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveSchemaMigrations liveStore
```

Expected red state: schema migration module and `schema_migrations` table do not exist.

### Minimal Implementation Direction

- Keep `node:sqlite` hidden behind store/repository adapters.
- Add a `schema_migrations` table with migration id, checksum, and applied timestamp.
- Add a `verification_jobs` table in local SQLite.
- Add fail-closed checks for:
  - missing required migration
  - changed migration checksum
  - legacy `decisions.decisionTxHash` non-null schema
  - hosted mode using an adapter without tenant-scoped methods

Suggested type:

```ts
export type LiveRepositoryCapabilities = {
  tenantScopedRuns: boolean;
  verificationJobs: boolean;
  schemaMigrations: boolean;
  transactionalDecisions: boolean;
};
```

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveSchemaMigrations liveStore
```

### Exit Condition

- Local SQLite remains a local rehearsal adapter.
- Hosted DB work is represented by repository contracts, not direct managed DB connections.
- Pre-Sprint14 DBs fail closed with an actionable bounded message.
- No migration silently mutates an incompatible DB without an explicit Sprint 15 path.

## Task 9: Health, Readiness, and Redacted Observability Model

### Files

- `apps/web/src/lib/live/liveHealth.ts`
- `apps/web/src/lib/live/liveHealth.test.ts`
- `apps/web/src/lib/live/liveTelemetry.ts`
- `apps/web/src/lib/live/liveTelemetry.test.ts`
- `apps/web/scripts/serve-live.mjs`

### Failing Test

- [ ] Write health/readiness and telemetry tests.

```ts
import { describe, expect, it } from "vitest";
import { buildLiveReadinessBody } from "./liveHealth.ts";
import { redactLiveLogEvent } from "./liveTelemetry.ts";

describe("live hosted observability", () => {
  it("reports readiness without raw config values", () => {
    const body = buildLiveReadinessBody({
      mode: "staging-testnet",
      envReady: false,
      authReady: true,
      tenantReady: true,
      repositoryReady: false,
      missingKeys: ["GIWA_SEPOLIA_RPC_URL"],
      invalidKeys: []
    });

    expect(body.ready).toBe(false);
    expect(JSON.stringify(body)).toContain("GIWA_SEPOLIA_RPC_URL");
    expect(JSON.stringify(body)).not.toContain("https://");
  });

  it("drops sensitive-shaped metadata from log events", () => {
    const event = redactLiveLogEvent({
      event: "live.api.error",
      requestId: "req_1",
      metadata: {
        runId: "run_alpha",
        secret: "must-not-log",
        body: { wallet: "0xabc" }
      }
    });

    expect(event.metadata).toEqual({ runId: "run_alpha" });
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveHealth liveTelemetry
```

Expected red state: health and telemetry modules are missing.

### Minimal Implementation Direction

Add routes:

```text
GET /healthz
GET /readyz
```

`/healthz` reports process liveness only. `/readyz` reports redacted readiness:

```json
{
  "ready": false,
  "mode": "staging-testnet",
  "checks": {
    "env": "missing",
    "auth": "ok",
    "tenant": "ok",
    "repository": "missing"
  },
  "missingKeys": ["GIWA_SEPOLIA_RPC_URL"]
}
```

Structured log events should include:

- `requestId`
- `event`
- `method`
- `pathname`
- `status`
- `errorCode`
- `tenantId` when available
- `runId` when available
- `durationMs`

Do not log raw request bodies, env values, credential values, or RPC provider errors.

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveHealth liveTelemetry
node --check apps/web/scripts/serve-live.mjs
```

### Exit Condition

- `/healthz` and `/readyz` are bounded and redacted.
- Every API response can carry or correlate to a request id.
- Logs include stable event names and bounded error codes only.
- Redaction tests fail if secret-shaped fields are emitted.

## Task 10: `serve-live.mjs` Integration Plan

### Files

- `apps/web/scripts/serve-live.mjs`
- `apps/web/src/lib/live/liveApi.ts`
- `apps/web/src/lib/live/liveApi.test.ts`
- `apps/web/src/lib/live/hostedMode.test.ts`
- `apps/web/src/lib/live/liveRequestSafety.test.ts`
- `apps/web/src/lib/live/liveRateLimit.test.ts`
- `apps/web/src/lib/live/liveHealth.test.ts`

### Failing Test

- [ ] Add integration tests around hosted request context and mode gates.

```ts
import { describe, expect, it } from "vitest";
import { createLiveApiHandler } from "./liveApi.ts";
import { createMemoryLiveStore } from "./liveStore.ts";

describe("hosted live API integration", () => {
  it("requires auth context for partner runs in hosted mode", async () => {
    const api = createLiveApiHandler({
      store: createMemoryLiveStore(),
      now: () => "2026-06-19T00:00:00.000Z",
      issueManifest: async () => {
        throw new Error("not reached");
      },
      mode: "staging-testnet"
    });

    const response = await api({
      method: "GET",
      pathname: "/api/partner/runs",
      body: undefined,
      auth: null,
      requestId: "req_1"
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "unauthorized", requestId: "req_1" });
  });
});
```

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi hostedMode liveRequestSafety liveRateLimit liveHealth
```

Expected red state: `LiveApiRequest` has no auth/request id fields and `createLiveApiHandler` has no hosted mode options.

### Minimal Implementation Direction

Wire the new modules in this order:

1. Create request id.
2. Serve `/healthz` and `/readyz` before API handler.
3. Apply request safety and origin policy.
4. Parse body with existing size limit.
5. Build auth context or local bypass context.
6. Apply rate limits.
7. Call `createLiveApiHandler`.
8. Log one redacted structured event.

Keep local defaults:

```text
host = 127.0.0.1
mode = local
mock mode allowed only with explicit flag
```

Hosted mode must not load local env files. If this requires a new hosted entrypoint later, add it in a separate Sprint 15 task after tests describe why shared request handling is insufficient.

### Passing Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi hostedMode liveRequestSafety liveRateLimit liveHealth liveTelemetry
node --check apps/web/scripts/serve-live.mjs
```

### Exit Condition

- Local rehearsal URLs still work.
- Hosted gates fail closed.
- Request context reaches API handler.
- No chain transaction commands are introduced or run.

## Task 11: Regression and Safe Scans

### Files

- `apps/web/public/flow.js`
- `apps/web/public/live-flow.js`
- `apps/web/scripts/serve-live.mjs`
- `apps/web/scripts/export-live-demo-snapshot.mjs`
- `docs/superpowers/plans/2026-06-19-sprint-15-hosted-api-foundation.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/implementation/*.md`

### Failing Test

- [ ] Before claiming Sprint 15 complete, run regressions and scans.

### Failure Command

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- hosted
pnpm --filter @giwa/web --fail-if-no-match test -- live
pnpm --filter @giwa/web --fail-if-no-match test -- verifier
pnpm --filter @giwa/web --fail-if-no-match test -- receipt
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm --filter @giwa/protocol --fail-if-no-match test
pnpm --filter @giwa/contracts --fail-if-no-match test
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
node --check apps/web/scripts/export-live-demo-snapshot.mjs
```

### Minimal Implementation Direction

Regression expectations:

- Sprint 7 static fallback routes remain available through the existing static server.
- Sprint 12 live rehearsal path still works in `local` mode.
- Sprint 13 commercial receipt gate still blocks non-matched receipts.
- Sprint 14 replay gate still recomputes verifier input and receipt hashes.
- `/api/partner/runs` is no longer unauthenticated in hosted modes.
- `/api/runs/:runId/verify` does not bypass job/rate gates.

### Passing Command

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield") + "|" + ("real f" + "unds") + "|" + ("payment set" + "tled")
$secretSurfacePattern = "private" + "Key|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|author" + "ization|NEXT" + "_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"

rg -n $docPattern docs\superpowers\plans\2026-06-19-sprint-15-hosted-api-foundation.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation -g "*.md"
rg -n $riskPattern docs\superpowers\plans\2026-06-19-sprint-15-hosted-api-foundation.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation -g "*.md"
rg -n $secretSurfacePattern docs\superpowers\plans\2026-06-19-sprint-15-hosted-api-foundation.md docs\superpowers\plans\2026-06-16-giwa-mvp-sprint-index.md docs\implementation -g "*.md" -g "!**/.env*"
```

Expected:

- Unfinished-marker scan has no Sprint 15 plan matches.
- Risk phrase matches, if any, appear only in existing guardrail sections.
- Secret-like matches, if any, are policy descriptions or pattern definitions, not live values.
- Real env files are not scanned.

### Exit Condition

- All focused and workspace checks pass or failures are explained with root cause.
- No secret values are printed.
- No deploy, fund, anchor, verify, mint, or wallet transaction command is run.
- No public hosting or deployment is attempted.

## Sprint 15 Exit Gate

Sprint 15 is complete only when:

- Hosted mode policy distinguishes `local`, `staging-testnet`, and `prod-testnet`.
- `prod-testnet` rejects mock mode.
- Public host binding fails closed without auth, tenant, rate limit, request safety, repository, migration, and telemetry gates.
- Auth context is available and raw credential values are not returned or logged.
- Tenant id is derived from auth context, not request body.
- Partner runs, receipts, and verification operations are tenant-scoped.
- Request safety returns stable public error codes for malformed JSON, oversized bodies, unsupported methods, unknown origins, missing auth, forbidden access, rate limits, and internal errors.
- Dependency-free rate limiter covers IP, credential, tenant, wallet, and run verify paths.
- Verification jobs can be enqueued, leased, completed, retried, or dead-lettered behind an interface.
- Repository and migration guards reject incompatible local DB schemas.
- `/healthz` and `/readyz` exist with redacted readiness only.
- Sprint 13 commercial receipt gate and Sprint 14 verifier replay gate still pass.
- Sprint 7 static fallback and Sprint 12 live local path still pass.
- No public hosting or deployment is performed.

## Handoff

Sprint 15 handoff must include:

- created and modified files
- commands run and results
- hosted mode decision summary
- auth and tenant isolation summary
- rate-limit and request-safety summary
- verification job queue state
- repository and migration guard state
- health/readiness paths
- local live URL if started
- confirmation that no wallet transaction was sent by server or scripts
- confirmation that deploy/fund/anchor/verify/mint commands were not run
- confirmation that no real env content was printed or scanned
- unresolved risks
- next sprint document path:

```text
docs/superpowers/plans/2026-06-19-sprint-16-hosted-partner-beta-runbook.md
```

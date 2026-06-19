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

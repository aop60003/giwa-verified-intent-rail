export type VerificationJobStatus = "pending" | "leased" | "succeeded" | "retryable" | "dead";

export type VerificationJobReason = "deposit_submitted" | "manual_verify";

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

export type VerificationJobQueue = {
  enqueue(input: { tenantId: string; runId: string; reason: VerificationJobReason }): VerificationJobRecord;
  leaseNext(input: { workerId: string; leaseUntil: string }): VerificationJobRecord | undefined;
  getJobForRun(runId: string): VerificationJobRecord | undefined;
  complete(jobId: string, updatedAt?: string): VerificationJobRecord;
  fail(jobId: string, input: { retryable: boolean; errorCode: string; availableAt?: string }): VerificationJobRecord;
};

function jobIdFor(tenantId: string, runId: string): string {
  return `job_${tenantId}_${runId}`.replace(/[^A-Za-z0-9_]/gu, "_");
}

export function createMemoryVerificationJobQueue(options: { now: () => string }): VerificationJobQueue {
  const jobsById = new Map<string, VerificationJobRecord>();
  const jobIdByRun = new Map<string, string>();

  function save(job: VerificationJobRecord): VerificationJobRecord {
    jobsById.set(job.jobId, job);
    jobIdByRun.set(job.runId, job.jobId);
    return job;
  }

  return {
    enqueue(input) {
      const existingId = jobIdByRun.get(input.runId);
      const existing = existingId === undefined ? undefined : jobsById.get(existingId);
      if (existing !== undefined && ["pending", "leased", "retryable", "succeeded"].includes(existing.status)) {
        return existing;
      }

      const now = options.now();
      return save({
        jobId: jobIdFor(input.tenantId, input.runId),
        tenantId: input.tenantId,
        runId: input.runId,
        status: "pending",
        attempts: 0,
        availableAt: now,
        leasedBy: null,
        leasedUntil: null,
        lastErrorCode: null,
        createdAt: now,
        updatedAt: now
      });
    },
    leaseNext(input) {
      const now = options.now();
      const candidate = [...jobsById.values()]
        .filter(
          (job) =>
            (job.status === "pending" || job.status === "retryable") &&
            job.availableAt <= now &&
            (job.leasedUntil === null || job.leasedUntil <= now)
        )
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
      if (candidate === undefined) return undefined;

      return save({
        ...candidate,
        status: "leased",
        attempts: candidate.attempts + 1,
        leasedBy: input.workerId,
        leasedUntil: input.leaseUntil,
        updatedAt: now
      });
    },
    getJobForRun(runId) {
      const id = jobIdByRun.get(runId);
      return id === undefined ? undefined : jobsById.get(id);
    },
    complete(jobId, updatedAt = options.now()) {
      const existing = jobsById.get(jobId);
      if (existing === undefined) throw new Error("verification job does not exist");
      return save({ ...existing, status: "succeeded", leasedBy: null, leasedUntil: null, updatedAt });
    },
    fail(jobId, input) {
      const existing = jobsById.get(jobId);
      if (existing === undefined) throw new Error("verification job does not exist");
      return save({
        ...existing,
        status: input.retryable ? "retryable" : "dead",
        leasedBy: null,
        leasedUntil: null,
        lastErrorCode: input.errorCode,
        availableAt: input.availableAt ?? options.now(),
        updatedAt: options.now()
      });
    }
  };
}

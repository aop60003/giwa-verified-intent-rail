export type LiveLogEventInput = {
  event: string;
  requestId: string;
  method?: string;
  pathname?: string;
  status?: number;
  errorCode?: string | null;
  tenantId?: string | null;
  runId?: string | null;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

export type LiveLogEvent = Omit<LiveLogEventInput, "metadata"> & {
  metadata: Record<string, unknown>;
};

const BLOCKED_KEYS = new Set([
  "secret",
  "token",
  "body",
  "headers",
  "env",
  "privateKey",
  "rpcUrl",
  "providerError",
  "stack"
]);

export function redactLiveLogEvent(input: LiveLogEventInput): LiveLogEvent {
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    if (BLOCKED_KEYS.has(key) || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) continue;
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) metadata[key] = value;
  }

  const event: LiveLogEvent = {
    event: input.event,
    requestId: input.requestId,
    tenantId: input.tenantId ?? null,
    runId: input.runId ?? null,
    metadata
  };
  if (input.method !== undefined) event.method = input.method;
  if (input.pathname !== undefined) event.pathname = input.pathname;
  if (input.status !== undefined) event.status = input.status;
  if (input.errorCode !== undefined) event.errorCode = input.errorCode;
  if (input.durationMs !== undefined) event.durationMs = input.durationMs;

  return event;
}

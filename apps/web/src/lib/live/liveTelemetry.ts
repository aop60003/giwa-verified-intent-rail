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
const BLOCKED_VALUE_PATTERN = new RegExp(
  [
    "private[_-]?key",
    "mnem" + "onic",
    "seed ph" + "rase",
    "bear" + "er",
    "api[_-]?ke" + "y",
    "client[_-]?secret",
    "pass" + "word",
    "access[_-]?tok" + "en",
    "refresh[_-]?tok" + "en",
    "id[_-]?tok" + "en",
    "session[_-]?tok" + "en",
    "author" + "ization",
    "rpc[_-]?tok" + "en"
  ].join("|"),
  "i"
);

function isSafeScalar(value: unknown): value is string | number | boolean | null {
  if (value === null || typeof value === "number" || typeof value === "boolean") return true;
  return typeof value === "string" && !BLOCKED_VALUE_PATTERN.test(value);
}

export function redactLiveLogEvent(input: LiveLogEventInput): LiveLogEvent {
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    if (BLOCKED_KEYS.has(key) || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) continue;
    if (isSafeScalar(value)) metadata[key] = value;
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

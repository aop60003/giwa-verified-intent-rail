export type RunEventName =
  | "campaign_entry"
  | "wallet_connected"
  | "intent_accepted"
  | "intent_submitted"
  | "deposit_submitted"
  | "receipt_matched";

export type RunEventSource = "fixture" | "live";

export type StoredRunEvent = {
  name: RunEventName;
  runId: string;
  timestamp: string;
  campaignId: string;
  missionId: string;
  wallet?: string | undefined;
  intentHash: string;
  source: RunEventSource;
};

export type RunStore = {
  append(event: StoredRunEvent): void;
  list(): StoredRunEvent[];
};

export function runDedupeKey(event: Pick<StoredRunEvent, "wallet" | "campaignId" | "missionId" | "intentHash">): string {
  return [
    event.wallet?.toLowerCase() ?? "unknown-wallet",
    event.campaignId,
    event.missionId,
    event.intentHash.toLowerCase()
  ].join(":");
}

export function dedupeRunEvents(events: StoredRunEvent[]): StoredRunEvent[] {
  const byEventAndRun = new Map<string, StoredRunEvent>();

  for (const event of events) {
    const key = `${event.name}:${runDedupeKey(event)}`;
    const existing = byEventAndRun.get(key);
    if (existing === undefined || event.timestamp < existing.timestamp) {
      byEventAndRun.set(key, event);
    }
  }

  return [...byEventAndRun.values()].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function createMemoryRunStore(initialEvents: StoredRunEvent[] = []): RunStore {
  const events = [...initialEvents];

  return {
    append(event) {
      events.push(event);
    },
    list() {
      return dedupeRunEvents(events);
    }
  };
}

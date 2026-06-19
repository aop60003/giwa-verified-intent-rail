import { describe, expect, it } from "vitest";

import { redactLiveLogEvent } from "./liveTelemetry.ts";

describe("live telemetry redaction", () => {
  it("drops sensitive-shaped metadata from log events", () => {
    const event = redactLiveLogEvent({
      event: "live.api.error",
      requestId: "req_1",
      metadata: {
        runId: "run_alpha",
        secret: "must-not-log",
        body: { wallet: "0xabc" },
        token: "raw-token"
      }
    });

    expect(event.metadata).toEqual({ runId: "run_alpha" });
  });
});

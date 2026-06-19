import { describe, expect, it } from "vitest";

import { toLiveApiErrorBody } from "./liveApiErrors.ts";

describe("live API error mapping", () => {
  it("maps known validation messages to bounded codes", () => {
    expect(toLiveApiErrorBody(new Error("Request body must be an object"))).toEqual({
      error: "invalid_request_body"
    });
  });

  it("does not expose unknown raw error messages", () => {
    const body = toLiveApiErrorBody(new Error("rpc token failed against https://example.invalid/private"));

    expect(body).toEqual({ error: "internal_error" });
    expect(JSON.stringify(body)).not.toContain("https://");
  });
});

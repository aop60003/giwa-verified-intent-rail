import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { createPublicVerificationBundleFixture } from "./publicVerificationBundle.test.ts";

const SCRIPT_PATH = "scripts/smoke-staging.mjs";
const REQUEST_HEADER_SENTINELS = {
  authorization: "Bearer giwa-smoke-request-authorization-canary",
  "user-agent": "giwa-smoke-request-user-agent-canary",
  "x-forwarded-for": "giwa-smoke-request-forwarded-for-canary",
  "x-giwa-smoke-canary": "giwa-smoke-request-custom-canary"
} as const;

type TestRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
};
type TestResponse = {
  writeHead(status: number, headers?: Record<string, string>): void;
  end(body?: string): void;
};
type TestServer = {
  listen(port: number, host: string, callback: () => void): void;
  address(): { port: number } | string | null;
  close(callback: (error?: Error) => void): void;
};
type SmokeScriptModule = {
  runStagingSmoke(
    environment: Record<string, string | undefined>
  ): Promise<number>;
  campaignMetricsAreComplete?: (body: string) => boolean;
  replayBundle?: (
    bundleJson: string,
    options?: {
      spawnImpl?: (...args: unknown[]) => FakeChild;
      timeoutMs?: number;
      maxOutputBytes?: number;
    }
  ) => Promise<boolean>;
};

class FakeEmitter {
  private readonly listeners = new Map<string, Array<(...args: any[]) => void>>();

  on(event: string, listener: (...args: any[]) => void): this {
    const registered = this.listeners.get(event) ?? [];
    registered.push(listener);
    this.listeners.set(event, registered);
    return this;
  }

  emit(event: string, ...args: any[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

class FakeReadable extends FakeEmitter {
  setEncoding(_encoding: string): void {}
}

type FakeChild = FakeEmitter & {
  stdout: FakeReadable;
  stderr: FakeReadable;
  stdin: FakeEmitter & { end(value: string): void };
  kill(): boolean;
};

async function loadSmokeScript(): Promise<SmokeScriptModule> {
  const scriptUrl =
    `file:///${process.cwd().replace(/\\/gu, "/")}/${SCRIPT_PATH}`;
  return import(scriptUrl) as Promise<SmokeScriptModule>;
}

async function loadTestHttp(): Promise<{
  createServer(
    handler: (request: TestRequest, response: TestResponse) => void
  ): TestServer;
}> {
  const httpSpecifier = "node:http";
  return import(httpSpecifier) as Promise<{
    createServer(
      handler: (request: TestRequest, response: TestResponse) => void
    ): TestServer;
  }>;
}

async function listen(server: TestServer): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("loopback fixture did not bind");
  }
  return address.port;
}

async function close(server: TestServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
  });
}

function smokeEnvironment(port: number): Record<string, string | undefined> {
  return {
    ...process.env,
    GIWA_SMOKE_BASE_URL: `http://127.0.0.1:${port}/`,
    GIWA_SMOKE_RECEIPT_HASH: `0x${"1".repeat(64)}`,
    GIWA_SMOKE_INTENT_HASH: `0x${"2".repeat(64)}`,
    GIWA_SMOKE_DEPOSIT_TX_HASH: `0x${"3".repeat(64)}`
  };
}

async function runFirstGateFixture(
  responseFor: (request: TestRequest) => {
    body: string;
    headers?: Record<string, string>;
  }
): Promise<{
  exitCode: number;
  output: string;
  request: TestRequest | undefined;
}> {
  const requests: TestRequest[] = [];
  const { createServer } = await loadTestHttp();
  const server = createServer((request, response) => {
    requests.push(request);
    const fixture = responseFor(request);
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
      ...fixture.headers
    });
    response.end(fixture.body);
  });
  const port = await listen(server);
  const output: string[] = [];
  const consoleLog = vi
    .spyOn(console, "log")
    .mockImplementation((value: unknown) => output.push(String(value)));
  try {
    const smoke = await loadSmokeScript();
    return {
      exitCode: await smoke.runStagingSmoke(smokeEnvironment(port)),
      output: output.join("\n"),
      request: requests[0]
    };
  } finally {
    consoleLog.mockRestore();
    await close(server);
  }
}

describe("staging HTTP smoke script", () => {
  it("checks the ten public surfaces with bounded per-request behavior", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    const checks = [
      ["landing", "/", 200, "landing.js"],
      ["guided-demo", "/giwa-demo", 200, "user-flow.js"],
      ["proof-ledger", "/evidence", 200, "flow.js"],
      ["participant", "/user", 200, "user-flow.js"],
      ["participant-help", "/user/help", 200, "user-flow.js"],
      ["campaign-page", "/partner", 200, "GIWA Verified Intent Rail"],
      [
        "campaign-api",
        "/api/public/campaign-studio",
        200,
        '"screenKind":"public-campaign-studio"'
      ],
      ["health", "/healthz", 200, '"ok":true'],
      ["readiness", "/readyz", 200, '"ready":true'],
      ["public-config", "/api/public/config", 200, '"chainId":91342']
    ] as const;

    for (const [label, path, status, marker] of checks) {
      expect(source, label).toContain(
        JSON.stringify([label, path, status, marker])
      );
    }

    const runCheckStart = source.indexOf("async function runCheck");
    const runCheckEnd = source.indexOf("function parseJsonObject", runCheckStart);
    expect(runCheckEnd).toBeGreaterThan(runCheckStart);
    const runCheckSource = source.slice(runCheckStart, runCheckEnd);
    expect(runCheckSource).not.toContain("function parseJsonObject");
    expect(source).toContain("const REQUEST_TIMEOUT_MS = 8000;");
    expect(runCheckSource).toContain("const controller = new AbortController();");
    expect(runCheckSource).toContain(
      "const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);"
    );
    expect(runCheckSource).toMatch(/fetch\(new URL\(path, baseUrl\), \{[\s\S]{0,200}signal: controller\.signal/u);
    const requestTryIndex = runCheckSource.indexOf("  try {");
    const fetchIndex = runCheckSource.indexOf("await fetch(", requestTryIndex);
    const bodyReadIndex = runCheckSource.indexOf(
      "await readBoundedBody(response)",
      fetchIndex
    );
    const finallyIndex = runCheckSource.indexOf("  } finally {", bodyReadIndex);
    const timeoutCleanupIndex = runCheckSource.indexOf("clearTimeout(timeout)", finallyIndex);
    expect(requestTryIndex).toBeGreaterThan(-1);
    expect(fetchIndex).toBeGreaterThan(requestTryIndex);
    expect(bodyReadIndex).toBeGreaterThan(fetchIndex);
    expect(finallyIndex).toBeGreaterThan(bodyReadIndex);
    expect(timeoutCleanupIndex).toBeGreaterThan(finallyIndex);
    expect(source).toContain('redirect: "manual"');
    expect(runCheckSource).toContain('method: "GET"');
    expect(source).toMatch(/new URL\(response\.url\)\.origin !== baseUrl\.origin/u);
    expect(source).toContain("const MAX_RESPONSE_BYTES = 1024 * 1024;");
    expect(source).toMatch(/content-length[\s\S]{0,500}MAX_RESPONSE_BYTES/iu);
    expect(source).toMatch(
      /for await \(const chunk of response\.body\)[\s\S]{0,400}MAX_RESPONSE_BYTES/u
    );
  });

  it("validates the base URL and exposes only bounded result lines", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");

    expect(source).toContain("runStagingSmoke(environment = process.env)");
    expect(source).toContain("environment.GIWA_SMOKE_BASE_URL");
    expect(source).toMatch(/new URL\(rawValue\)/u);
    expect(source).toContain('parsed.protocol !== "http:" && parsed.protocol !== "https:"');
    expect(source).toContain('parsed.username !== "" || parsed.password !== ""');
    expect(source.match(/console\.(?:log|error)/gu)).toHaveLength(1);
    expect(source).toContain('console.log(`${label} ${status} ${passed ? "pass" : "fail"}`);');
    expect(source).not.toMatch(/console\.(?:log|error)\([^\n]*(?:GIWA_SMOKE_BASE_URL|process\.env|baseUrl|body|headers|error)/iu);
    expect(source).not.toMatch(/console\.(?:log|error)\([^\n]*(?:receiptHash|intentHash|depositTxHash)/iu);
    expect(source).toMatch(/catch \{[\s\S]{0,250}writeResult\(label, "000", false\)/u);
    expect(source).toContain("if (!passed) return 1;");
  });

  it("accepts only a root origin and never normalizes away URL metadata", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    const parseStart = source.indexOf("function parseBaseUrl");
    const parseEnd = source.indexOf("function boundedStatus", parseStart);
    const parseSource = source.slice(parseStart, parseEnd);

    expect(parseSource).toMatch(
      /if \(parsed\.pathname !== "\/" \|\| parsed\.search !== "" \|\| parsed\.hash !== ""\)\s*throw/u
    );
    expect(parseSource).not.toContain("new URL(parsed.origin)");
    expect(parseSource).toContain("return parsed;");
    expect(parseSource).not.toContain("parsed.port");

    const mainSource = source.slice(
      source.indexOf("export async function runStagingSmoke")
    );
    expect(mainSource).toMatch(
      /try \{\s*baseUrl = parseBaseUrl\(environment\.GIWA_SMOKE_BASE_URL\);[\s\S]{0,500}\} catch \{\s*writeResult\("smoke-config", "000", false\);\s*return 1;/u
    );
    expect(mainSource).toContain("process.exitCode = await runStagingSmoke();");
  });

  it("requires exact lowercase public hashes and keeps every request read-only", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");

    expect(source).toContain("environment.GIWA_SMOKE_RECEIPT_HASH");
    expect(source).toContain("environment.GIWA_SMOKE_INTENT_HASH");
    expect(source).toContain("environment.GIWA_SMOKE_DEPOSIT_TX_HASH");
    expect(source).toContain("const PUBLIC_HASH_PATTERN = /^0x[a-f0-9]{64}$/u;");
    expect(source).toContain("PUBLIC_HASH_PATTERN.test(rawValue)");
    expect(source).not.toContain('method: "POST"');
    expect(source).not.toContain("/api/public/events");
    expect(source).not.toContain("/api/runs");
    for (const [header, value] of Object.entries(REQUEST_HEADER_SENTINELS)) {
      expect(source).toContain(JSON.stringify(header));
      expect(source).toContain(JSON.stringify(value));
    }
  });

  it("replays one bundle and resolves all public hash forms to one Receipt identity", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");

    expect(source).toContain(
      '`/api/public/evidence/${publicHashes.receiptHash}`'
    );
    expect(source).toContain(
      '`/api/public/evidence/${publicHashes.intentHash}`'
    );
    expect(source).toContain(
      '`/api/public/evidence/${publicHashes.depositTxHash}`'
    );
    expect(source).toContain(
      "proof.body.identity?.receiptHash === publicHashes.receiptHash"
    );
    expect(source).toContain(
      "proof.body.identity.intentHash === publicHashes.intentHash"
    );
    expect(source).toContain(
      "proof.body.identity.depositTxHash === publicHashes.depositTxHash"
    );
    expect(source).toContain('"--experimental-strip-types"');
    expect(source).toContain("publicVerificationBundle.ts");
    expect(source).toContain("publicVerificationReplay.ts");
    expect(source).toContain("manifestHash");
    expect(source).toContain("manifestSignature");
    expect(source).toContain("verifierInputHash");
    expect(source).toContain("decodedLogHash");
    expect(source).toContain("receiptHash");
    expect(source).toContain("crossReferences");
  });

  it("checks safe download headers, campaign metric definitions, an unknown 404, and privacy canaries", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");

    expect(source).toContain('searchParams.set("download", "1")');
    expect(source).toContain('"application/json; charset=utf-8"');
    expect(source).toContain(
      '`attachment; filename="giwa-receipt-${publicHashes.receiptHash}.json"`'
    );
    expect(source).toContain('"Matched Receipts / submitted deposits"');
    expect(source).toContain("uniqueParticipantCount");
    expect(source).toContain("repeatActivationCount");
    expect(source).toContain("randomBytes(32)");
    expect(source).toContain('"proof_not_found"');
    for (const forbiddenKeyShape of [
      "capability",
      "runid",
      "sessionid",
      "sessionhash",
      "privatekey",
      "headers",
      "useragent",
      "authorization",
      "credential",
      "environment",
      "remoteaddress",
      "clientip",
      "xforwardedfor"
    ]) {
      expect(source).toContain(forbiddenKeyShape);
    }
  });

  it("uses the exact additive migration identifiers in the gated rollout", () => {
    const runbook = readFileSync(
      "../../docs/implementation/giwa-gasok-staging-runbook.md",
      "utf8"
    );

    expect(runbook).toContain("`006_public_evidence_bundles`");
    expect(runbook).toContain("`007_public_campaign_events`");
    expect(runbook).not.toMatch(/`006_public_evidence`(?!_bundles)/u);
  });

  it("passes the complete read-only smoke against a loopback fixture", async () => {
    const bundle = await createPublicVerificationBundleFixture();
    const requests: Array<{
      method: string;
      path: string;
      headers: TestRequest["headers"];
    }> = [];
    const { createServer } = await loadTestHttp();
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      requests.push({
        method: request.method ?? "",
        path: url.pathname,
        headers: request.headers
      });
      const fixedBodies = new Map([
        ["/", "landing.js"],
        ["/giwa-demo", "user-flow.js"],
        ["/evidence", "flow.js"],
        ["/user", "user-flow.js"],
        ["/user/help", "user-flow.js"],
        ["/partner", "GIWA Verified Intent Rail"],
        ["/healthz", '{"ok":true}'],
        ["/readyz", '{"ready":true}'],
        ["/api/public/config", '{"chainId":91342}']
      ]);
      const fixedBody = fixedBodies.get(url.pathname);
      if (fixedBody !== undefined) {
        response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        response.end(fixedBody);
        return;
      }
      if (url.pathname === "/api/public/campaign-studio") {
        response.writeHead(200, {
          "content-type": "application/json; charset=utf-8"
        });
        response.end(
          JSON.stringify({
            screenKind: "public-campaign-studio",
            source: "live",
            generatedAt: "2026-07-31T00:00:00.000Z",
            kpis: {
              matchedReceiptCount: 1,
              submittedDepositCount: 1,
              matchedRate: {
                numerator: 1,
                denominator: 1,
                displayRate: "100%",
                definition: "Matched Receipts / submitted deposits"
              },
              uniqueParticipantCount: 1,
              repeatActivationCount: 0
            }
          })
        );
        return;
      }
      const evidencePrefix = "/api/public/evidence/";
      if (url.pathname.startsWith(evidencePrefix)) {
        const queryHash = url.pathname.slice(evidencePrefix.length);
        const queryKind =
          queryHash === bundle.identity.receiptHash
            ? "receipt"
            : queryHash === bundle.identity.intentHash
              ? "intent"
              : queryHash === bundle.identity.depositTxHash
                ? "depositTx"
                : null;
        if (queryKind === null) {
          response.writeHead(404, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store"
          });
          response.end('{"error":"proof_not_found"}');
          return;
        }
        if (url.searchParams.get("download") === "1") {
          response.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "content-disposition":
              `attachment; filename="giwa-receipt-${bundle.identity.receiptHash}.json"`,
            "cache-control": "public, max-age=60, stale-while-revalidate=300"
          });
          response.end(JSON.stringify(bundle));
          return;
        }
        response.writeHead(200, {
          "content-type": "application/json; charset=utf-8"
        });
        response.end(
          JSON.stringify({
            queryKind,
            receiptHash: bundle.identity.receiptHash,
            bundle
          })
        );
        return;
      }
      response.writeHead(404);
      response.end();
    });
    const port = await listen(server);

    const output: string[] = [];
    const consoleLog = vi
      .spyOn(console, "log")
      .mockImplementation((value: unknown) => {
        output.push(String(value));
      });
    try {
      const smokeModule = await loadSmokeScript();
      const exitCode = await smokeModule.runStagingSmoke({
          ...process.env,
          GIWA_SMOKE_BASE_URL: `http://127.0.0.1:${port}/`,
          GIWA_SMOKE_RECEIPT_HASH: bundle.identity.receiptHash,
          GIWA_SMOKE_INTENT_HASH: bundle.identity.intentHash,
          GIWA_SMOKE_DEPOSIT_TX_HASH: bundle.identity.depositTxHash
      });

      const stdout = output.join("\n");
      expect(exitCode).toBe(0);
      expect(stdout).toContain("bundle-replay 200 pass");
      expect(stdout).toContain("campaign-metrics 200 pass");
      expect(stdout).toContain("unknown-proof 404 pass");
      expect(stdout).not.toContain(bundle.identity.receiptHash);
      expect(stdout).not.toContain(bundle.identity.intentHash);
      expect(stdout).not.toContain(bundle.identity.depositTxHash);
      expect(requests.length).toBeGreaterThan(0);
      expect(requests.every((request) => request.method === "GET")).toBe(true);
      expect(
        requests.every((request) =>
          Object.entries(REQUEST_HEADER_SENTINELS).every(
            ([name, value]) => request.headers?.[name] === value
          )
        )
      ).toBe(true);
      expect(requests.some((request) => request.path === "/api/public/events")).toBe(false);
      expect(requests.some((request) => request.path.startsWith("/api/runs"))).toBe(false);
    } finally {
      consoleLog.mockRestore();
      await close(server);
    }
  }, 40_000);

  it("fails the first gate for structured public leak keys", async () => {
    for (const forbiddenKey of [
      "runCapability",
      "run",
      "run_id",
      "session",
      "sessionHash",
      "privateKey",
      "headers",
      "responseHeaders",
      "userAgent",
      "authorization",
      "credential",
      "env",
      "environment",
      "ip",
      "remoteAddress",
      "client_ip",
      "rawIp",
      "realIp",
      "xForwardedFor",
      "xRealIp",
      "X-Raw-IP",
      "X-Real-IP",
      "X-Client-IP",
      "X-Run-Id",
      "X-Session-Id",
      "X-Capability",
      "X-Credential",
      "X-Private-Key",
      "X-User-Agent"
    ]) {
      const result = await runFirstGateFixture(() => ({
        body: JSON.stringify({
          marker: "landing.js",
          public: { [forbiddenKey]: "fixed-test-leak" }
        }),
        headers: { "content-type": "application/json; charset=utf-8" }
      }));

      expect(result.exitCode, forbiddenKey).toBe(1);
      expect(result.output, forbiddenKey).toContain("landing 200 fail");
      expect(result.output, forbiddenKey).not.toContain("fixed-test-leak");
    }
  }, 20_000);

  it("fails the first gate for explicit sensitive response-header aliases", async () => {
    for (const forbiddenHeader of [
      "X-Raw-IP",
      "X-Real-IP",
      "X-Client-IP",
      "X-Run-Id",
      "X-Session-Id",
      "X-Capability",
      "X-Credential",
      "X-Private-Key",
      "X-User-Agent"
    ]) {
      const result = await runFirstGateFixture(() => ({
        body: "landing.js",
        headers: { [forbiddenHeader]: "fixed-test-leak" }
      }));

      expect(result.exitCode, forbiddenHeader).toBe(1);
      expect(result.output, forbiddenHeader).toContain("landing 200 fail");
      expect(result.output, forbiddenHeader).not.toContain("fixed-test-leak");
    }
  });

  it("allows ordinary CORS response-header metadata through the first gate", async () => {
    const result = await runFirstGateFixture(() => ({
      body: "landing.js",
      headers: {
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Origin": "https://example.test"
      }
    }));

    expect(result.output).toContain("landing 200 pass");
    expect(result.output).not.toContain("landing 200 fail");
  });

  it("fails when request sentinels are echoed in a response body or header", async () => {
    const bodyEcho = await runFirstGateFixture((request) => ({
      body: `landing.js ${String(request.headers?.authorization)}`
    }));
    expect(bodyEcho.request?.headers?.authorization).toBe(
      REQUEST_HEADER_SENTINELS.authorization
    );
    expect(bodyEcho.exitCode).toBe(1);
    expect(bodyEcho.output).toContain("landing 200 fail");
    expect(bodyEcho.output).not.toContain(REQUEST_HEADER_SENTINELS.authorization);

    const headerEcho = await runFirstGateFixture((request) => ({
      body: "landing.js",
      headers: {
        "x-smoke-echo": String(
          request.headers?.["x-giwa-smoke-canary"]
        )
      }
    }));
    expect(headerEcho.request?.headers?.["x-giwa-smoke-canary"]).toBe(
      REQUEST_HEADER_SENTINELS["x-giwa-smoke-canary"]
    );
    expect(headerEcho.exitCode).toBe(1);
    expect(headerEcho.output).toContain("landing 200 fail");
    expect(headerEcho.output).not.toContain(
      REQUEST_HEADER_SENTINELS["x-giwa-smoke-canary"]
    );
  });

  it("rejects contradictory Campaign Studio count and display-rate fields", async () => {
    const smoke = await loadSmokeScript();
    expect(typeof smoke.campaignMetricsAreComplete).toBe("function");
    if (smoke.campaignMetricsAreComplete === undefined) return;

    const campaign = {
      screenKind: "public-campaign-studio",
      source: "live",
      generatedAt: "2026-07-31T00:00:00.000Z",
      kpis: {
        matchedReceiptCount: 1,
        submittedDepositCount: 3,
        matchedRate: {
          numerator: 1,
          denominator: 3,
          displayRate: "33.3%",
          definition: "Matched Receipts / submitted deposits"
        },
        uniqueParticipantCount: 1,
        repeatActivationCount: 0
      }
    };
    expect(smoke.campaignMetricsAreComplete(JSON.stringify(campaign))).toBe(
      true
    );

    for (const kpis of [
      { ...campaign.kpis, matchedReceiptCount: -1 },
      {
        ...campaign.kpis,
        matchedRate: { ...campaign.kpis.matchedRate, numerator: 2 }
      },
      {
        ...campaign.kpis,
        matchedRate: { ...campaign.kpis.matchedRate, denominator: 2 }
      },
      {
        ...campaign.kpis,
        matchedRate: { ...campaign.kpis.matchedRate, displayRate: "33%" }
      }
    ]) {
      expect(
        smoke.campaignMetricsAreComplete(
          JSON.stringify({ ...campaign, kpis })
        )
      ).toBe(false);
    }
  });

  it("waits for replay-child close after timeout, output overflow, and stdin failure", async () => {
    const smoke = await loadSmokeScript();
    expect(typeof smoke.replayBundle).toBe("function");
    if (smoke.replayBundle === undefined) return;

    for (const fault of ["timeout", "output", "stdin"] as const) {
      const childEmitter = new FakeEmitter();
      const stdout = new FakeReadable();
      const stderr = new FakeReadable();
      const stdin = new FakeEmitter() as FakeEmitter & {
        end(value: string): void;
      };
      let killCount = 0;
      let closed = false;
      const child = Object.assign(childEmitter, {
        stdout,
        stderr,
        stdin,
        kill: () => {
          killCount += 1;
          setTimeout(() => {
            closed = true;
            childEmitter.emit("close", 1);
          }, 5);
          return true;
        }
      }) as FakeChild;
      stdin.end = () => {
        if (fault === "stdin") {
          queueMicrotask(() => stdin.emit("error", new Error("stdin failed")));
        }
      };
      const spawnImpl = () => {
        if (fault === "output") {
          queueMicrotask(() => stdout.emit("data", "x".repeat(33)));
        }
        return child;
      };

      const result = await Promise.race([
        smoke.replayBundle("{}", {
          spawnImpl,
          timeoutMs: fault === "timeout" ? 10 : 100,
          maxOutputBytes: 32
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`${fault} cleanup hung`)), 250);
        })
      ]);

      expect(result, fault).toBe(false);
      expect(killCount, fault).toBe(1);
      expect(closed, fault).toBe(true);
    }

    const failedSpawn = await Promise.race([
      smoke.replayBundle("{}", {
        spawnImpl: () => {
          throw new Error("spawn failed");
        },
        timeoutMs: 20,
        maxOutputBytes: 32
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("failed-spawn cleanup hung")), 250);
      })
    ]);
    expect(failedSpawn).toBe(false);
  });

  it("registers the exact package command", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["smoke:staging"]).toBe("node scripts/smoke-staging.mjs");
  });
});

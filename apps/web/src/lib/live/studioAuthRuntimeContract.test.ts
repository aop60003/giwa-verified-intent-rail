import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";

import { evaluateStudioAuthConfig } from "./studioAuthConfig.ts";
import { hashStudioAuthSecret } from "./studioAuthMessage.ts";
import { createMemoryStudioAuthRepository } from "./studioAuthRepository.ts";
import { createMemoryStudioCampaignRepository } from "./studioCampaignRepository.ts";
import { liveRateLimitBucket } from "./liveRateLimit.ts";
import { createSqliteLiveStore } from "./liveStore.ts";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
}

function loggedEventObjects(source: string): string[] {
  const marker = "redactLiveLogEvent({";
  const objects: string[] = [];
  let searchIndex = 0;
  while (true) {
    const callIndex = source.indexOf(marker, searchIndex);
    if (callIndex < 0) return objects;
    const objectStart = callIndex + marker.length - 1;
    let depth = 0;
    let quote: string | null = null;
    let escaped = false;
    for (let index = objectStart; index < source.length; index += 1) {
      const character = source[index]!;
      if (quote !== null) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
        continue;
      }
      if (character === "{") depth += 1;
      if (character !== "}") continue;
      depth -= 1;
      if (depth === 0) {
        objects.push(source.slice(objectStart, index + 1));
        searchIndex = index + 1;
        break;
      }
    }
  }
}

describe("Studio auth live runtime contract", () => {
  it("initializes config, bootstrap, service, and API before serving auth routes", () => {
    const source = readWebFile("scripts/serve-live.mjs");

    expect(source).toMatch(
      /import \{[^}]*evaluateStudioAuthConfig[^}]*applyStudioAuthBootstrap[^}]*\} from "\.\.\/src\/lib\/live\/studioAuthConfig\.ts"/su
    );
    expect(source).toMatch(
      /import \{[^}]*createStudioAuthService[^}]*\} from "\.\.\/src\/lib\/live\/studioAuthService\.ts"/su
    );
    expect(source).toMatch(
      /import \{[^}]*createStudioAuthApiHandler[^}]*\} from "\.\.\/src\/lib\/live\/studioAuthApi\.ts"/su
    );

    const runtimeIndex = source.indexOf("async function startLiveServer");
    const configIndex = source.indexOf("evaluateStudioAuthConfig(", runtimeIndex);
    const hostedPolicyIndex = source.indexOf("evaluateHostedModePolicy(", runtimeIndex);
    const storeIndex = source.indexOf("createSqliteLiveStore(", runtimeIndex);
    const initializerIndex = source.indexOf("export function initializeStudioAuthApi");
    const initializerEnd = source.indexOf("async function startLiveServer", initializerIndex);
    const initializerSource = source.slice(initializerIndex, initializerEnd);
    const initializeCallIndex = source.indexOf("initializeStudioAuthApi({", storeIndex);

    expect(configIndex).toBeGreaterThan(-1);
    expect(configIndex).toBeLessThan(hostedPolicyIndex);
    expect(initializerIndex).toBeGreaterThan(-1);
    expect(initializerSource).toContain("applyStudioAuthBootstrap(");
    expect(initializerSource).toContain("createStudioAuthService(");
    expect(initializerSource).toContain("createStudioAuthApiHandler(");
    expect(initializeCallIndex).toBeGreaterThan(storeIndex);
    expect(initializerSource).toContain("store.studioAuth");
    expect(initializerSource).toContain("store.listRuns().map((run) => run.tenantId ?? \"local\")");

    const startupLogIndex = source.indexOf("console.log(", hostedPolicyIndex);
    const startupGateIndex = source.indexOf("if (!hostedPolicy.ok)", startupLogIndex);
    const startupLog = source.slice(startupLogIndex, startupGateIndex);
    expect(startupLog).toContain("studioAuthReadiness: studioAuthReadiness.readiness");
    expect(startupLog).toContain("studioAuthEnabled: studioAuthReadiness.enabled");
    expect(startupLog).not.toContain("studioAuthReadiness.config");
  });

  it("dispatches bounded auth requests before legacy partner authentication", () => {
    const source = readWebFile("scripts/serve-live.mjs");
    const serverIndex = source.indexOf("const server =");
    const authRouteIndex = source.indexOf('routeClass === "auth"', serverIndex);
    const authenticateIndex = source.indexOf("authenticateLiveRequest(", serverIndex);

    expect(authRouteIndex).toBeGreaterThan(serverIndex);
    expect(authRouteIndex).toBeLessThan(authenticateIndex);
    expect(source).toMatch(/kind: "auth"[\s\S]{0,300}authPerIpPerMinute/u);
    expect(source).toContain('error: "studio_auth_unavailable"');
    expect(source).not.toMatch(
      /routeClass\s*===\s*["']partner["'][\s\S]{0,500}wallet-session/u
    );

    const events = loggedEventObjects(source);
    expect(events).toHaveLength(4);
    for (const event of events) {
      const fields = [...event.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):/gmu)]
        .map((match) => match[1]);
      expect(fields).toEqual([
        "event",
        "requestId",
        "method",
        "pathname",
        "status",
        "errorCode",
        "tenantId",
        "durationMs"
      ]);
      expect(event).not.toMatch(/token|signature|nonce|message|cookie|wallet|\bheaders\b/iu);
      expect(event).toMatch(
        /errorCode:\s*typeof result\.body(?:\?\.|\.)error === "string"\s*\? result\.body\.error\s*: null/u
      );
    }
  });

  it("rejects query-suffixed Task 4 routes before classification, body parsing, or handler access", () => {
    const source = readWebFile("scripts/serve-live.mjs");
    const serverIndex = source.indexOf("const server =");
    const queryGuardIndex = source.indexOf("if (isTask4QuerySuffixedRoute(", serverIndex);
    const classificationIndex = source.indexOf("const routeClass = classifyLiveApiRoute(", serverIndex);
    const bodyReadIndex = source.indexOf("await readLiveJsonBody(", serverIndex);
    const studioHandlerIndex = source.indexOf("studioCampaignVersionApis.studioApi", serverIndex);
    const publicHandlerIndex = source.indexOf("studioCampaignVersionApis.publicApi", serverIndex);

    expect(queryGuardIndex).toBeGreaterThan(serverIndex);
    expect(queryGuardIndex).toBeLessThan(classificationIndex);
    expect(queryGuardIndex).toBeLessThan(bodyReadIndex);
    expect(queryGuardIndex).toBeLessThan(studioHandlerIndex);
    expect(queryGuardIndex).toBeLessThan(publicHandlerIndex);
    expect(source.slice(queryGuardIndex, classificationIndex)).toMatch(
      /writeLiveJsonResponse\(response, 404, \{ error: "not_found" \}\);\s*return;/u
    );
  });

  it("derives a valid bracketed local origin for an IPv6 loopback bind", async () => {
    const serveScriptPath = join(process.cwd(), "scripts/serve-live.mjs");
    const serveScriptUrl = `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      deriveLocalOrigin: (host: string, port: number) => string;
    };

    const localOrigin = adapter.deriveLocalOrigin("::1", 4177);
    expect(localOrigin).toBe("http://[::1]:4177");
    expect(new URL(localOrigin).hostname).toBe("[::1]");
    expect(
      evaluateStudioAuthConfig({
        mode: "local",
        localOrigin,
        env: {
          GIWA_LIVE_PARTNER_TENANT_ID: "tenant_default",
          GIWA_LIVE_STUDIO_OWNER_WALLETS:
            "0x0000000000000000000000000000000000000001"
        }
      })
    ).toMatchObject({ ok: true, enabled: true });
  });

  it("closes SQLite without masking a post-open Studio initialization error", async () => {
    const serveScriptPath = join(process.cwd(), "scripts/serve-live.mjs");
    const serveScriptUrl = `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      initializeStudioAuthApi: (input: Record<string, unknown>) => unknown;
    };
    const originalError = new Error("bootstrap_failed");
    let closeAttempts = 0;

    expect(() =>
      adapter.initializeStudioAuthApi({
        store: {
          studioAuth: {
            bootstrapOrganizationsAndOwners() {
              throw originalError;
            }
          },
          listRuns: () => [],
          close() {
            closeAttempts += 1;
            throw new Error("close_failed");
          }
        },
        studioAuthReadiness: {
          ok: true,
          enabled: true,
          missing: [],
          invalid: [],
          ownerCount: 1,
          readiness: { ownerCount: 1, keys: {} },
          config: {
            organizationId: "tenant_default",
            organizationName: "Loop",
            ownerWallets: ["0x0000000000000000000000000000000000000001"],
            origin: "http://127.0.0.1:4177",
            studioUri: "http://127.0.0.1:4177/studio",
            secureCookie: false
          }
        },
        nowIso: "2026-08-01T00:00:00.000Z"
      })
    ).toThrow(originalError);
    expect(closeAttempts).toBe(1);
  });

  it("fails hosted startup before Studio bootstrap when the full schema guard rejects drift", async () => {
    const serveScriptPath = join(process.cwd(), "scripts/serve-live.mjs");
    const serveScriptUrl = `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      assertHostedLiveSchemaState: (input: Record<string, unknown>) => void;
    };
    let closeAttempts = 0;
    const store = {
      getSchemaState() {
        return {
          migrations: [],
          tables: {},
          requiredMigrations: ["009_studio_campaign_drafts"]
        };
      },
      close() {
        closeAttempts += 1;
      }
    };

    expect(() => adapter.assertHostedLiveSchemaState({ mode: "hosted", store }))
      .toThrow("Hosted live schema state failed: migration_missing");
    expect(closeAttempts).toBe(1);

    expect(() => adapter.assertHostedLiveSchemaState({
      mode: "local",
      store: {
        getSchemaState() {
          throw new Error("local schema inspection must not run at startup");
        },
        close() {
          throw new Error("local store must not close");
        }
      }
    })).not.toThrow();

    const source = readWebFile("scripts/serve-live.mjs");
    const storeIndex = source.indexOf("const store = createSqliteLiveStore(");
    const schemaGuardIndex = source.indexOf("assertHostedLiveSchemaState({", storeIndex);
    const authInitializerIndex = source.indexOf("initializeStudioAuthApi({", storeIndex);
    const campaignInitializerIndex = source.indexOf("initializeStudioCampaignApi({", storeIndex);
    expect(schemaGuardIndex).toBeGreaterThan(storeIndex);
    expect(schemaGuardIndex).toBeLessThan(authInitializerIndex);
    expect(schemaGuardIndex).toBeLessThan(campaignInitializerIndex);
  });

  it("writes auth response headers while keeping a 204 response body empty", async () => {
    const serveScriptPath = join(process.cwd(), "scripts/serve-live.mjs");
    const serveScriptUrl = `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      writeLiveJsonResponse: (
        response: {
          writeHead(status: number, headers: Record<string, string>): void;
          end(body?: string): void;
        },
        status: number,
        body: Record<string, unknown> | null,
        headers?: Record<string, string>
      ) => void;
    };
    let writtenStatus = 0;
    let writtenHeaders: Record<string, string> = {};
    let writtenBody: string | undefined;

    adapter.writeLiveJsonResponse(
      {
        writeHead(status, headers) {
          writtenStatus = status;
          writtenHeaders = headers;
        },
        end(body) {
          writtenBody = body;
        }
      },
      204,
      null,
      { "set-cookie": "giwa_studio_session=; Max-Age=0" }
    );

    expect(writtenStatus).toBe(204);
    expect(writtenHeaders).toMatchObject({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": "giwa_studio_session=; Max-Age=0"
    });
    expect(writtenBody).toBeUndefined();
  });

  it("creates a campaign through initialized Owner session APIs and consumes one redacted Studio limiter bucket", async () => {
    const serveScriptPath = join(process.cwd(), "scripts/serve-live.mjs");
    const serveScriptUrl = `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      initializeStudioAuthApi: (input: Record<string, unknown>) => (request: Record<string, unknown>) => Promise<{
        status: number;
        body: Record<string, unknown>;
        headers: Record<string, string>;
      }>;
      initializeStudioCampaignApi: (input: Record<string, unknown>) => (request: Record<string, unknown>) => Promise<{
        status: number;
        body: Record<string, unknown>;
        headers: Record<string, string>;
      }>;
    };
    const owner = privateKeyToAccount(`0x${"1".repeat(64)}` as `0x${string}`);
    const authRepository = createMemoryStudioAuthRepository();
    const campaignRepository = createMemoryStudioCampaignRepository();
    const store = {
      studioAuth: authRepository,
      studioCampaigns: campaignRepository,
      listRuns: () => [],
      close() {}
    };
    const studioAuthReadiness = {
      ok: true,
      enabled: true,
      missing: [],
      invalid: [],
      ownerCount: 1,
      readiness: { ownerCount: 1, keys: {} },
      config: {
        organizationId: "tenant_default",
        organizationName: "Loop",
        ownerWallets: [owner.address.toLowerCase()],
        origin: "http://127.0.0.1:4177",
        studioUri: "http://127.0.0.1:4177/studio",
        secureCookie: false
      }
    };

    const studioAuthApi = adapter.initializeStudioAuthApi({
      store,
      studioAuthReadiness,
      nowIso: "2026-08-01T00:00:00.000Z"
    });
    const rateLimitInputs: Array<{ bucket: string; limit: number; windowMs: number }> = [];
    const campaignApi = adapter.initializeStudioCampaignApi({
      store,
      studioAuthReadiness,
      rateLimiter: {
        consume(input: { bucket: string; limit: number; windowMs: number }) {
          rateLimitInputs.push(input);
          return { allowed: true, remaining: 29, resetAtMs: 60_000 };
        }
      }
    });

    const challenge = await studioAuthApi({
      method: "POST",
      pathname: "/api/auth/challenge",
      origin: studioAuthReadiness.config.origin,
      body: { walletAddress: owner.address },
      requestId: "req_challenge"
    });
    expect(challenge.status).toBe(200);
    const signature = await owner.signMessage({ message: challenge.body.message as string });
    const verified = await studioAuthApi({
      method: "POST",
      pathname: "/api/auth/verify",
      origin: studioAuthReadiness.config.origin,
      body: {
        challengeId: challenge.body.challengeId,
        message: challenge.body.message,
        signature
      },
      requestId: "req_verify"
    });
    expect(verified.status).toBe(200);

    const sessionCookie = verified.headers["set-cookie"]!;
    const rawToken = sessionCookie.split(";", 1)[0]!.slice("giwa_studio_session=".length);
    const session = authRepository.getSessionContextByTokenHash(
      hashStudioAuthSecret(rawToken),
      new Date().toISOString()
    );
    expect(session).not.toBeNull();

    const created = await campaignApi({
      method: "POST",
      pathname: "/api/studio/campaigns",
      origin: studioAuthReadiness.config.origin,
      cookie: sessionCookie,
      body: { name: "Owner draft" },
      requestId: "req_campaign"
    });
    expect(created).toMatchObject({
      status: 201,
      body: { name: "Owner draft", lifecycleState: "draft" }
    });
    expect(rateLimitInputs).toHaveLength(1);
    const rateLimitInput = rateLimitInputs[0]!;
    const sessionId = session!.session.sessionId;
    const tenantId = session!.organization.id;
    expect(rateLimitInput).toEqual({
      bucket: liveRateLimitBucket({ kind: "studio", value: sessionId, tenantId }),
      limit: 30,
      windowMs: 60_000
    });
    expect(rateLimitInput.bucket).not.toContain(rawToken);
    expect(rateLimitInput.bucket).not.toContain(sessionId);
    expect(rateLimitInput.bucket).not.toContain(tenantId);
  });

  it("returns a generic disabled campaign response and preserves baseline failures after closing the store", async () => {
    const serveScriptPath = join(process.cwd(), "scripts/serve-live.mjs");
    const serveScriptUrl = `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      initializeStudioCampaignApi: (input: Record<string, unknown>) => (request: Record<string, unknown>) => Promise<{
        status: number;
        body: Record<string, unknown>;
      }>;
    };
    const disabled = adapter.initializeStudioCampaignApi({
      store: {},
      studioAuthReadiness: { enabled: false },
      rateLimiter: { consume: () => ({ allowed: true, remaining: 0, resetAtMs: 0 }) }
    });
    await expect(disabled({ method: "GET", pathname: "/api/studio/campaigns", requestId: "req_test" }))
      .resolves.toEqual({ status: 503, body: { error: "studio_campaign_unavailable" }, headers: {} });

    const originalError = new Error("baseline_failed");
    let closeAttempts = 0;
    expect(() => adapter.initializeStudioCampaignApi({
      store: {
        studioAuth: {},
        studioCampaigns: {
          bootstrapPublishedBaseline() {
            throw originalError;
          }
        },
        close() {
          closeAttempts += 1;
          throw new Error("close_failed");
        }
      },
      studioAuthReadiness: {
        enabled: true,
        config: {
          organizationId: "tenant_default",
          organizationName: "Loop",
          ownerWallets: ["0x0000000000000000000000000000000000000001"],
          origin: "http://127.0.0.1:4177",
          studioUri: "http://127.0.0.1:4177/studio",
          secureCookie: false
        }
      },
      rateLimiter: { consume: () => ({ allowed: true, remaining: 0, resetAtMs: 0 }) }
    })).toThrow(originalError);
    expect(closeAttempts).toBe(1);
  });

  it("keeps the Studio dispatch isolated ahead of partner authentication and limits mutations by hashed session context", () => {
    const source = readWebFile("scripts/serve-live.mjs");
    const serverIndex = source.indexOf("const server =");
    const studioRouteIndex = source.indexOf('routeClass === "studio"', serverIndex);
    const partnerAuthIndex = source.indexOf("authenticateLiveRequest(", serverIndex);

    expect(source).toMatch(/import \{[^}]*createStudioCampaignService[^}]*\} from "\.\.\/src\/lib\/live\/studioCampaignService\.ts"/su);
    expect(source).toMatch(/import \{[^}]*createStudioCampaignApiHandler[^}]*\} from "\.\.\/src\/lib\/live\/studioCampaignApi\.ts"/su);
    expect(source).toMatch(/import \{[^}]*createPublicCampaignVersionApiHandler[^}]*createStudioCampaignVersionApiHandler[^}]*\} from "\.\.\/src\/lib\/live\/studioCampaignVersionApi\.ts"/su);
    expect(source).toMatch(/import \{[^}]*createStudioCampaignVersionService[^}]*\} from "\.\.\/src\/lib\/live\/studioCampaignVersionService\.ts"/su);
    expect(source).toContain("store.studioCampaigns");
    expect(source).toContain("store.studioCampaignVersions");
    expect(source).toContain("studioAuthReadiness.config.organizationId");
    expect(source).toMatch(/kind: "studio", value: context\.sessionId, tenantId: context\.tenantId/su);
    expect(source).toMatch(/studioMutationPerSessionPerMinute[\s\S]{0,100}windowMs: 60_000/su);
    expect(studioRouteIndex).toBeGreaterThan(serverIndex);
    expect(studioRouteIndex).toBeLessThan(partnerAuthIndex);
    expect(source.slice(studioRouteIndex, partnerAuthIndex)).not.toContain("authenticateLiveRequest");

    const events = loggedEventObjects(source);
    expect(events).toHaveLength(4);
    expect(events[1]).toContain("tenantId: null");
  });

  it("publishes immutable public versions through real SQLite runtime handlers without creating live flow records", async () => {
    const serveScriptPath = join(process.cwd(), "scripts/serve-live.mjs");
    const serveScriptUrl = `file:///${serveScriptPath.replace(/\\/gu, "/")}`;
    const adapter = (await import(serveScriptUrl)) as {
      initializeStudioAuthApi: (input: Record<string, unknown>) => (request: Record<string, unknown>) => Promise<{
        status: number;
        body: Record<string, unknown> | null;
        headers: Record<string, string>;
      }>;
      initializeStudioCampaignApi: (input: Record<string, unknown>) => (request: Record<string, unknown>) => Promise<{
        status: number;
        body: Record<string, unknown> | null;
        headers: Record<string, string>;
      }>;
      initializeStudioCampaignVersionApis: (input: Record<string, unknown>) => {
        studioApi: (request: Record<string, unknown>) => Promise<{
          status: number;
          body: Record<string, unknown> | null;
          headers: Record<string, string>;
        }>;
        publicApi: (request: Record<string, unknown>) => Promise<{
          status: number;
          body: Record<string, unknown> | null;
          headers: Record<string, string>;
        }>;
      };
    };
    const databaseDirectory = mkdtempSync(join(tmpdir(), "giwa-task7-"));
    const databasePath = join(databaseDirectory, "publishing.sqlite");
    const origin = "http://127.0.0.1:4177";
    const ownerWallet = "0x0000000000000000000000000000000000000001" as const;
    const rawToken = "a".repeat(43);
    const cookie = `giwa_studio_session=${rawToken}`;
    const nowIso = "2026-08-01T00:00:00.000Z";
    let store: ReturnType<typeof createSqliteLiveStore> | null = null;
    let inspection: DatabaseSync | null = null;

    try {
      store = createSqliteLiveStore(databasePath);
      const studioAuthReadiness = {
        ok: true,
        enabled: true,
        missing: [],
        invalid: [],
        ownerCount: 1,
        readiness: { ownerCount: 1, keys: {} },
        config: {
          organizationId: "tenant_task7",
          organizationName: "Task 7 Owner",
          ownerWallets: [ownerWallet],
          origin,
          studioUri: `${origin}/studio`,
          secureCookie: false
        }
      };
      const authApi = adapter.initializeStudioAuthApi({ store, studioAuthReadiness, nowIso });
      const owner = store.studioAuth.getActiveMember(studioAuthReadiness.config.organizationId, ownerWallet);
      expect(owner).not.toBeNull();
      store.studioAuth.createChallenge({
        challengeId: "challenge_task7",
        expectedWallet: ownerWallet,
        nonceHash: hashStudioAuthSecret("task7-nonce"),
        origin,
        uri: `${origin}/studio`,
        chainId: 91342,
        issuedAt: nowIso,
        expiresAt: "2026-08-01T00:05:00.000Z",
        usedAt: null,
        attemptCount: 0,
        createdAt: nowIso
      });
      expect(store.studioAuth.consumeChallengeAndCreateSession({
        challengeId: "challenge_task7",
        nowIso,
        session: {
          sessionId: "session_task7",
          tokenHash: hashStudioAuthSecret(rawToken),
          memberId: owner!.memberId,
          createdAt: nowIso,
          expiresAt: "2099-01-01T00:00:00.000Z",
          revokedAt: null
        }
      })).toBe(true);

      const rateLimiter = {
        consume: () => ({ allowed: true, remaining: 29, resetAtMs: 60_000 })
      };
      const campaigns = adapter.initializeStudioCampaignApi({ store, studioAuthReadiness, rateLimiter });
      const versions = adapter.initializeStudioCampaignVersionApis({ store, studioAuthReadiness, rateLimiter });

      const listed = await campaigns({
        method: "GET", pathname: "/api/studio/campaigns", cookie, requestId: "task7_list"
      });
      expect(listed).toMatchObject({
        status: 200,
        body: { campaigns: [{ campaignId: "gasok-demo", editable: false, revision: 1 }] }
      });

      const created = await campaigns({
        method: "POST", pathname: "/api/studio/campaigns", origin, cookie,
        body: { name: "Task 7 Draft", summary: "Version one snapshot" }, requestId: "task7_create"
      });
      expect(created).toMatchObject({
        status: 201,
        body: { name: "Task 7 Draft", summary: "Version one snapshot", revision: 1 }
      });
      const campaignId = created.body?.campaignId;
      expect(campaignId).toMatch(/^campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
      if (typeof campaignId !== "string") throw new Error("Task 7 campaign id missing");

      const updatedV2 = await campaigns({
        method: "PATCH", pathname: `/api/studio/campaigns/${campaignId}`, origin, cookie,
        body: { name: "Task 7 Draft", summary: "Version one published snapshot", revision: 1 },
        requestId: "task7_update_v2"
      });
      expect(updatedV2).toMatchObject({
        status: 200,
        body: { campaignId, summary: "Version one published snapshot", revision: 2 }
      });

      const publishV1 = await versions.studioApi({
        method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`, origin, cookie,
        body: { revision: 2 }, requestId: "task7_publish_v1"
      });
      expect(publishV1).toMatchObject({
        status: 201,
        body: { campaignId, versionNumber: 1, publicPath: `/campaign/${campaignId}/v/1` }
      });
      const repeatPublish = await versions.studioApi({
        method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`, origin, cookie,
        body: { revision: 2 }, requestId: "task7_publish_v1_repeat"
      });
      expect(repeatPublish).toEqual({
        status: 409,
        body: {
          error: "already_published",
          existingVersion: { versionNumber: 1, publicPath: `/campaign/${campaignId}/v/1` }
        },
        headers: {}
      });
      const listedVersions = await versions.studioApi({
        method: "GET", pathname: `/api/studio/campaigns/${campaignId}/versions`, cookie, requestId: "task7_versions"
      });
      expect(listedVersions).toMatchObject({
        status: 200,
        body: { versions: [{ campaignId, versionNumber: 1, sourceDraftRevision: 2 }] }
      });

      const publicV1 = await versions.publicApi({
        method: "GET", pathname: `/api/public/campaigns/${campaignId}/versions/1`, requestId: "task7_public_v1"
      });
      expect(publicV1).toMatchObject({
        status: 200,
        body: { campaign: { campaignId, versionNumber: 1, summary: "Version one published snapshot", executionAvailable: false } },
        headers: { "cache-control": "public, max-age=300, immutable" }
      });
      const publicV1Bytes = JSON.stringify(publicV1.body);

      const updatedV3 = await campaigns({
        method: "PATCH", pathname: `/api/studio/campaigns/${campaignId}`, origin, cookie,
        body: { name: "Task 7 Draft", summary: "Version two changed snapshot", revision: 2 },
        requestId: "task7_update_v3"
      });
      expect(updatedV3).toMatchObject({
        status: 200,
        body: { campaignId, summary: "Version two changed snapshot", revision: 3 }
      });
      const publishV2 = await versions.studioApi({
        method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`, origin, cookie,
        body: { revision: 3 }, requestId: "task7_publish_v2"
      });
      expect(publishV2).toMatchObject({
        status: 201,
        body: { campaignId, versionNumber: 2, publicPath: `/campaign/${campaignId}/v/2` }
      });
      const publicV1Again = await versions.publicApi({
        method: "GET", pathname: `/api/public/campaigns/${campaignId}/versions/1`, requestId: "task7_public_v1_again"
      });
      const publicV2 = await versions.publicApi({
        method: "GET", pathname: `/api/public/campaigns/${campaignId}/versions/2`, requestId: "task7_public_v2"
      });
      expect(publicV1Again).toEqual(publicV1);
      expect(JSON.stringify(publicV1Again.body)).toBe(publicV1Bytes);
      expect(publicV2).toMatchObject({
        status: 200,
        body: { campaign: { campaignId, versionNumber: 2, summary: "Version two changed snapshot", executionAvailable: false } }
      });
      expect(JSON.stringify(publicV2.body)).not.toBe(publicV1Bytes);

      const logout = await authApi({
        method: "POST", pathname: "/api/auth/logout", origin, cookie, body: {}, requestId: "task7_logout"
      });
      expect(logout).toMatchObject({ status: 204, body: null, headers: { "set-cookie": expect.stringContaining("Max-Age=0") } });
      await expect(versions.studioApi({
        method: "POST", pathname: `/api/studio/campaigns/${campaignId}/publish`, origin, cookie,
        body: { revision: 3 }, requestId: "task7_publish_after_logout"
      })).resolves.toEqual({
        status: 401,
        body: { error: "authentication_required" },
        headers: { "set-cookie": expect.stringContaining("Max-Age=0") }
      });

      expect(store.listRuns()).toEqual([]);
      expect(store.getVerificationJobForRun(campaignId)).toBeUndefined();
      store.close();
      store = null;
      inspection = new DatabaseSync(databasePath);
      for (const table of [
        "runs", "submitted_txs", "decisions", "receipts", "verifier_inputs",
        "public_evidence_bundles", "verification_jobs", "public_campaign_events"
      ]) {
        const row = inspection.prepare(`select count(*) as count from ${table}`).get() as { count: number | bigint };
        expect(Number(row.count)).toBe(0);
      }
    } finally {
      inspection?.close();
      store?.close();
      rmSync(databaseDirectory, { recursive: true, force: true });
    }
  });
});

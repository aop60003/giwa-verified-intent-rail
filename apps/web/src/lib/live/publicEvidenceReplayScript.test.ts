import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { createPublicVerificationBundleFixture } from "./publicVerificationBundle.test.ts";

const scriptPath = resolve(process.cwd(), "scripts/replay-public-evidence.mjs");
const temporaryDirectories: string[] = [];
const checkNames = [
  "manifestHash",
  "manifestSignature",
  "verifierInputHash",
  "decodedLogHash",
  "receiptHash",
  "crossReferences"
];

type ReplayScriptModule = {
  loadPublicEvidenceJson(
    source: string,
    options?: {
      fetchImpl?: typeof fetch;
      maxResponseBytes?: number;
      requestTimeoutMs?: number;
      openFileImpl?: (path: string) => Promise<{
        stat(): Promise<{ size: number }>;
        read(
          buffer: Uint8Array,
          offset: number,
          length: number,
          position: number
        ): Promise<{ bytesRead: number }>;
        close(): Promise<void>;
      }>;
    }
  ): Promise<unknown>;
};

async function importReplayScript(): Promise<ReplayScriptModule> {
  const scriptUrl = `file:///${scriptPath.replace(/\\/gu, "/")}`;
  return import(scriptUrl) as Promise<ReplayScriptModule>;
}

function temporaryJson(value: unknown): string {
  const directory = mkdtempSync(resolve(tmpdir(), "giwa-replay-"));
  temporaryDirectories.push(directory);
  const path = resolve(directory, "bundle.json");
  writeFileSync(path, JSON.stringify(value));
  return path;
}

function runCli(
  pathOrUrl: string,
  env: Record<string, string | undefined> = {}
) {
  return spawnSync(
    "node",
    ["--experimental-strip-types", scriptPath, pathOrUrl],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_NO_WARNINGS: "1",
        GIWA_REPLAY_PRIVATE_CANARY: "environment-must-not-escape",
        ...env
      }
    }
  );
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("public evidence replay CLI", () => {
  it("is wired as a source-only command without private runtime dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    );
    const source = readFileSync(scriptPath, "utf8");

    expect(packageJson.scripts["evidence:replay"]).toBe(
      "node --experimental-strip-types scripts/replay-public-evidence.mjs"
    );
    expect(source).toContain(
      '../src/lib/live/publicVerificationReplay.ts'
    );
    expect(source).not.toMatch(
      /liveStore|node:sqlite|GIWA_SEPOLIA_RPC_URL|private API|authorization|process\.env/iu
    );
  });

  it("replays a valid local bundle and reports every bounded check name", async () => {
    const bundle = await createPublicVerificationBundleFixture();
    const result = runCli(temporaryJson(bundle));

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      ok: true,
      passedChecks: checkNames
    });
    expect(result.stderr).toBe("");
  });

  it("exits non-zero for a tampered bundle and emits only bounded failed check names", async () => {
    const bundle = structuredClone(
      await createPublicVerificationBundleFixture()
    );
    bundle.manifest.signature =
      `${bundle.manifest.signature.slice(0, 2)}` +
      `${bundle.manifest.signature[2] === "0" ? "1" : "0"}` +
      `${bundle.manifest.signature.slice(3)}`;
    const result = runCli(temporaryJson(bundle));
    const output = JSON.parse(result.stderr);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(output).toEqual({
      ok: false,
      failedChecks: ["manifestSignature"]
    });
    expect(JSON.stringify(output)).not.toContain(bundle.manifest.payload.wallet);
    expect(JSON.stringify(output)).not.toContain(bundle.manifest.signature);
    expect(JSON.stringify(output)).not.toContain("environment-must-not-escape");
    expect(JSON.stringify(output)).not.toMatch(/headers?|authorization/iu);
  });

  it("accepts HTTPS input with bounded response bytes and no request headers", async () => {
    const bundle = await createPublicVerificationBundleFixture();
    const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const { loadPublicEvidenceJson } = await importReplayScript();

    const loaded = await loadPublicEvidenceJson(
      "https://public.example.test/bundle.json",
      {
        fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
          fetchCalls.push({ url: String(url), init });
          return new Response(JSON.stringify(bundle), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      }
    );

    expect(loaded).toEqual(bundle);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]?.url).toBe(
      "https://public.example.test/bundle.json"
    );
    expect(fetchCalls[0]?.init?.headers).toBeUndefined();
    expect(fetchCalls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("accepts a case-insensitive HTTPS scheme after URL normalization", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();
    const requestedUrls: string[] = [];

    await expect(
      loadPublicEvidenceJson("HTTPS://PUBLIC.EXAMPLE.TEST/bundle.json", {
        fetchImpl: async (url: string | URL | Request) => {
          requestedUrls.push(String(url));
          return new Response("{}");
        }
      })
    ).resolves.toEqual({});
    expect(requestedUrls).toEqual([
      "https://public.example.test/bundle.json"
    ]);
  });

  it("rejects non-HTTPS URLs without making a request", async () => {
    let fetchCalls = 0;
    const { loadPublicEvidenceJson } = await importReplayScript();

    await expect(
      loadPublicEvidenceJson("http://private.example.test/bundle.json", {
        fetchImpl: async () => {
          fetchCalls += 1;
          return new Response("{}");
        }
      })
    ).rejects.toThrow("unsupported_input");
    expect(fetchCalls).toBe(0);
  });

  it("enforces the remote response-size limit", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();

    await expect(
      loadPublicEvidenceJson("https://public.example.test/oversized.json", {
        maxResponseBytes: 8,
        fetchImpl: async () => new Response('{"oversized":true}')
      })
    ).rejects.toThrow("remote_response_too_large");
  });

  it("prechecks Content-Length and cancels the oversized response body", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{}"));
      },
      cancel() {
        cancelled += 1;
      }
    });

    await expect(
      loadPublicEvidenceJson("https://public.example.test/oversized.json", {
        maxResponseBytes: 8,
        fetchImpl: async () =>
          new Response(body, {
            headers: { "content-length": "9" }
          })
      })
    ).rejects.toThrow("remote_response_too_large");
    expect(cancelled).toBe(1);
  });

  it("preserves the oversized-response error when body cancellation outlives the deadline", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{}"));
      },
      async cancel() {
        cancelled += 1;
        await new Promise<void>((resolveCancellation) => {
          setTimeout(resolveCancellation, 25);
        });
      }
    });

    await expect(
      loadPublicEvidenceJson("https://public.example.test/oversized.json", {
        maxResponseBytes: 8,
        requestTimeoutMs: 5,
        fetchImpl: async () =>
          new Response(body, {
            headers: { "content-length": "9" }
          })
      })
    ).rejects.toThrow("remote_response_too_large");
    expect(cancelled).toBe(1);
  });

  it("cancels a non-OK HTTPS response without masking the bounded error", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("private-upstream-body"));
      },
      cancel() {
        cancelled += 1;
      }
    });

    await expect(
      loadPublicEvidenceJson("https://public.example.test/unavailable.json", {
        fetchImpl: async () => new Response(body, { status: 503 })
      })
    ).rejects.toThrow("remote_request_failed");
    expect(cancelled).toBe(1);
  });

  it("rejects redirects and aborts the request without exposing redirect details", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();
    let requestSignal: AbortSignal | undefined;

    await expect(
      loadPublicEvidenceJson("https://public.example.test/redirect.json", {
        fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
          expect(init?.redirect).toBe("error");
          requestSignal = init?.signal ?? undefined;
          throw new TypeError("redirect target private-canary");
        }
      })
    ).rejects.toThrow("remote_request_failed");
    expect(requestSignal?.aborted).toBe(true);
  });

  it("enforces the remote request-time limit", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();

    await expect(
      loadPublicEvidenceJson("https://public.example.test/slow.json", {
        requestTimeoutMs: 5,
        fetchImpl: async (_url: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true }
            );
          })
      })
    ).rejects.toThrow("remote_request_timeout");
  });

  it("prechecks local file size before reading and always closes the handle", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();
    let readCalls = 0;
    let closeCalls = 0;

    await expect(
      loadPublicEvidenceJson("oversized-local.json", {
        maxResponseBytes: 8,
        openFileImpl: async () => ({
          stat: async () => ({ size: 9 }),
          read: async () => {
            readCalls += 1;
            return { bytesRead: 0 };
          },
          close: async () => {
            closeCalls += 1;
          }
        })
      })
    ).rejects.toThrow("local_input_too_large");
    expect(readCalls).toBe(0);
    expect(closeCalls).toBe(1);
  });

  it("closes the local file handle when a bounded read fails", async () => {
    const { loadPublicEvidenceJson } = await importReplayScript();
    let closeCalls = 0;

    await expect(
      loadPublicEvidenceJson("unreadable-local.json", {
        openFileImpl: async () => ({
          stat: async () => ({ size: 2 }),
          read: async () => {
            throw new Error("read_canary");
          },
          close: async () => {
            closeCalls += 1;
          }
        })
      })
    ).rejects.toThrow("read_canary");
    expect(closeCalls).toBe(1);
  });
});

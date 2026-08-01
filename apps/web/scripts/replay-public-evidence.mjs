import { open } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizePublicVerificationBundle } from "../src/lib/live/publicVerificationBundle.ts";
import { replayPublicVerificationBundle } from "../src/lib/live/publicVerificationReplay.ts";

const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

function boundedError(error) {
  if (!(error instanceof Error)) return "replay_failed";
  return new Set([
    "invalid_json",
    "local_input_too_large",
    "remote_request_failed",
    "remote_request_timeout",
    "remote_response_too_large",
    "unsupported_input"
  ]).has(error.message)
    ? error.message
    : "invalid_bundle";
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("invalid_json");
  }
}

async function readBoundedResponse(response, maxResponseBytes) {
  const contentLength = response.headers.get("content-length");
  if (
    contentLength !== null &&
    /^\d+$/u.test(contentLength) &&
    Number(contentLength) > maxResponseBytes
  ) {
    throw new Error("remote_response_too_large");
  }
  if (!response.ok || response.body === null) {
    throw new Error("remote_request_failed");
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    totalBytes += chunk.byteLength;
    if (totalBytes > maxResponseBytes) {
      throw new Error("remote_response_too_large");
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function cancelResponseBody(response) {
  if (response?.body === null || response?.body === undefined) return;
  try {
    await response.body.cancel();
  } catch {
    // Preserve the bounded replay error when cancellation itself fails.
  }
}

async function loadRemoteJson(source, options) {
  const controller = new AbortController();
  let timedOut = false;
  let response;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.requestTimeoutMs);
  timeout.unref?.();

  try {
    response = await options.fetchImpl(source, {
      redirect: "error",
      signal: controller.signal
    });
    return parseJson(
      await readBoundedResponse(response, options.maxResponseBytes)
    );
  } catch (error) {
    const timeoutOccurred = timedOut;
    clearTimeout(timeout);
    controller.abort();
    await cancelResponseBody(response);
    if (timeoutOccurred) {
      throw new Error("remote_request_timeout");
    }
    if (
      error instanceof Error &&
      new Set([
        "invalid_json",
        "remote_request_failed",
        "remote_response_too_large"
      ]).has(error.message)
    ) {
      throw error;
    }
    throw new Error("remote_request_failed");
  } finally {
    clearTimeout(timeout);
  }
}

async function loadLocalJson(source, options) {
  const handle = await options.openFileImpl(resolve(source), "r");
  try {
    const stats = await handle.stat();
    if (
      !Number.isSafeInteger(stats.size) ||
      stats.size < 0 ||
      stats.size > options.maxResponseBytes
    ) {
      throw new Error("local_input_too_large");
    }

    const bytes = Buffer.alloc(stats.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const { bytesRead } = await handle.read(
        bytes,
        offset,
        bytes.byteLength - offset,
        offset
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    return parseJson(bytes.subarray(0, offset).toString("utf8"));
  } finally {
    await handle.close();
  }
}

export async function loadPublicEvidenceJson(
  source,
  {
    fetchImpl = fetch,
    maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    openFileImpl = open
  } = {}
) {
  if (typeof source !== "string" || source.length === 0) {
    throw new Error("unsupported_input");
  }

  if (!isAbsolute(source)) {
    try {
      const url = new URL(source);
      if (url.protocol !== "https:") {
        throw new Error("unsupported_input");
      }
      return loadRemoteJson(url.href, {
        fetchImpl,
        maxResponseBytes,
        requestTimeoutMs
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "unsupported_input"
      ) {
        throw error;
      }
      if (/^[a-z][a-z0-9+.-]*:/iu.test(source)) {
        throw new Error("unsupported_input");
      }
    }
  }

  return loadLocalJson(source, { maxResponseBytes, openFileImpl });
}

export async function runPublicEvidenceReplayCli({
  source,
  stdout = process.stdout,
  stderr = process.stderr,
  fetchImpl = fetch
}) {
  try {
    const input = await loadPublicEvidenceJson(source, { fetchImpl });
    const bundle = normalizePublicVerificationBundle(input);
    const replay = await replayPublicVerificationBundle(bundle);
    const entries = Object.entries(replay.checks);

    if (replay.ok) {
      stdout.write(
        `${JSON.stringify({
          ok: true,
          passedChecks: entries.map(([name]) => name)
        })}\n`
      );
      return 0;
    }

    stderr.write(
      `${JSON.stringify({
        ok: false,
        failedChecks: entries
          .filter(([, result]) => result === "failed")
          .map(([name]) => name)
      })}\n`
    );
    return 1;
  } catch (error) {
    stderr.write(
      `${JSON.stringify({ ok: false, error: boundedError(error) })}\n`
    );
    return 1;
  }
}

const invokedPath =
  process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await runPublicEvidenceReplayCli({
    source: process.argv[2]
  });
}

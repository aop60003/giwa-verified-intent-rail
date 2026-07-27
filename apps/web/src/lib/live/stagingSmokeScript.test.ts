import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const SCRIPT_PATH = "scripts/smoke-staging.mjs";

describe("staging HTTP smoke script", () => {
  it("checks the eight public surfaces with bounded per-request behavior", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    const checks = [
      ["/", 200, "landing.js"],
      ["/evidence", 200, "flow.js"],
      ["/user", 200, "user-flow.js"],
      ["/user/help", 200, "user-flow.js"],
      ["/partner", 200, "GIWA Verified Intent Rail"],
      ["/healthz", 200, '"ok":true'],
      ["/readyz", 200, '"ready":true'],
      ["/api/public/config", 200, '"chainId":91342']
    ] as const;

    for (const [path, status, marker] of checks) {
      expect(source, path).toContain(JSON.stringify([path, status, marker]));
    }

    const runCheckStart = source.indexOf("async function runCheck");
    const runCheckEnd = source.indexOf("async function main", runCheckStart);
    const runCheckSource = source.slice(runCheckStart, runCheckEnd);
    expect(source).toContain("const REQUEST_TIMEOUT_MS = 8000;");
    expect(runCheckSource).toContain("const controller = new AbortController();");
    expect(runCheckSource).toContain(
      "const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);"
    );
    expect(runCheckSource).toMatch(/fetch\(new URL\(path, baseUrl\), \{[\s\S]{0,200}signal: controller\.signal/u);
    const requestTryIndex = runCheckSource.indexOf("  try {");
    const fetchIndex = runCheckSource.indexOf("await fetch(", requestTryIndex);
    const bodyReadIndex = runCheckSource.indexOf("await response.text()", fetchIndex);
    const finallyIndex = runCheckSource.indexOf("  } finally {", bodyReadIndex);
    const timeoutCleanupIndex = runCheckSource.indexOf("clearTimeout(timeout)", finallyIndex);
    expect(requestTryIndex).toBeGreaterThan(-1);
    expect(fetchIndex).toBeGreaterThan(requestTryIndex);
    expect(bodyReadIndex).toBeGreaterThan(fetchIndex);
    expect(finallyIndex).toBeGreaterThan(bodyReadIndex);
    expect(timeoutCleanupIndex).toBeGreaterThan(finallyIndex);
    expect(source).toContain('redirect: "manual"');
    expect(source).toMatch(/new URL\(response\.url\)\.origin !== baseUrl\.origin/u);
  });

  it("validates the base URL and exposes only bounded result lines", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");

    expect(source).toContain("process.env.GIWA_SMOKE_BASE_URL");
    expect(source).toMatch(/new URL\(rawValue\)/u);
    expect(source).toContain('parsed.protocol !== "http:" && parsed.protocol !== "https:"');
    expect(source).toContain('parsed.username !== "" || parsed.password !== ""');
    expect(source.match(/console\.(?:log|error)/gu)).toHaveLength(1);
    expect(source).toContain('console.log(`${path} ${status} ${passed ? "pass" : "fail"}`);');
    expect(source).not.toMatch(/console\.(?:log|error)\([^\n]*(?:GIWA_SMOKE_BASE_URL|process\.env|baseUrl|body|headers|error)/iu);
    expect(source).toMatch(/catch \{[\s\S]{0,250}writeResult\(path, "000", false\)/u);
    expect(source).toMatch(/if \(!passed\) \{[\s\S]{0,120}process\.exitCode = 1;[\s\S]{0,80}return;/u);
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

    const mainSource = source.slice(source.indexOf("async function main"));
    expect(mainSource).toMatch(
      /try \{\s*baseUrl = parseBaseUrl\(process\.env\.GIWA_SMOKE_BASE_URL\);\s*\} catch \{\s*writeResult\("\/", "000", false\);\s*process\.exitCode = 1;\s*return;/u
    );
  });

  it("registers the exact package command", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["smoke:staging"]).toBe("node scripts/smoke-staging.mjs");
  });
});

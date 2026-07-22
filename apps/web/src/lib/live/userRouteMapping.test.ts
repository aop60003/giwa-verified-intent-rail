import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const directPath = join(process.cwd(), path);
  const workspacePath = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(directPath) ? directPath : workspacePath, "utf8");
}

describe("commercial user route mapping", () => {
  it("maps user-facing routes without replacing existing static routes", () => {
    const source = readWebFile("scripts/serve-static.mjs");

    expect(source).toContain('decoded === "/user"');
    expect(source).toContain('decoded.startsWith("/user/receipt/")');
    expect(source).toContain('decoded === "/partner"');
    expect(source).toContain('decoded.startsWith("/receipt/")');
  });

  it("maps user-facing routes on the live server", () => {
    const source = readWebFile("scripts/serve-live.mjs");

    expect(source).toContain('decoded === "/user"');
    expect(source).toContain('decoded.startsWith("/user/receipt/")');
    expect(source).toContain('decoded === "/live"');
    expect(source).toContain('decoded === "/demo"');
  });

  it("routes authentication by API class and forwards only a validated participant capability", () => {
    const source = readWebFile("scripts/serve-live.mjs");
    const classifyIndex = source.indexOf("classifyLiveApiRoute(");
    const authenticateIndex = source.indexOf("authenticateLiveRequest(");
    const apiIndex = source.indexOf("await api({");

    expect(classifyIndex).toBeGreaterThan(-1);
    expect(authenticateIndex).toBeGreaterThan(classifyIndex);
    expect(apiIndex).toBeGreaterThan(authenticateIndex);
    expect(source).toMatch(/routeClass === "partner"[\s\S]{0,300}authenticateLiveRequest/u);
    expect(source).toMatch(/let auth = null/u);
    expect(source).toMatch(/runCapability:\s*readRunCapabilityHeader\(request\.headers\["x-giwa-run-capability"\]\)/u);
    expect(source).toMatch(/function readRunCapabilityHeader\([\s\S]{0,500}Array\.isArray[\s\S]{0,500}CAPABILITY_PATTERN/u);
    expect(source).not.toMatch(/routeClass === "unknown"[\s\S]{0,200}(?:return|sendJson)/u);

    const telemetryCall = source.match(/redactLiveLogEvent\(\{([\s\S]*?)\}\)/u)?.[1] ?? "";
    expect(telemetryCall).not.toContain("runCapability");
    expect(telemetryCall).not.toContain("x-giwa-run-capability");
  });
});

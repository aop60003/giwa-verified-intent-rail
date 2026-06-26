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
});

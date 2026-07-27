import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

describe("production landing and public demo route ownership", () => {
  it("keeps the landing, recorded evidence, user, partner and receipt documents isolated", () => {
    const staticServer = readWebFile("scripts/serve-static.mjs");
    const liveServer = readWebFile("scripts/serve-live.mjs");

    for (const source of [staticServer, liveServer]) {
      expect(source).toContain('decoded === "/"');
      expect(source).toContain('"/landing.html"');
      expect(source).toContain('decoded === "/giwa-demo"');
      expect(source).toContain('"/giwa-demo.html"');
      expect(source).toContain('decoded === "/demo"');
      expect(source).toContain('"/demo.html"');
      expect(source).toContain('decoded === "/evidence"');
      expect(source).toContain('decoded === "/partner"');
      expect(source).toContain('decoded.startsWith("/receipt/")');
      expect(source).toContain('"/index.html"');
      expect(source).toContain('decoded === "/user"');
      expect(source).toContain('"/user.html"');
    }
  });

  it("ships separate landing assets and keeps them dependency-light", () => {
    for (const path of [
      "public/landing.html",
      "public/landing.css",
      "public/landing.js",
      "public/giwa-demo.html",
      "public/giwa-demo.css"
    ]) {
      const direct = join(process.cwd(), path);
      const workspace = join(process.cwd(), "apps/web", path);
      expect(existsSync(direct) || existsSync(workspace), path).toBe(true);
    }

    const html = readWebFile("public/landing.html");
    expect(html).toContain('href="/landing.css"');
    expect(html).toContain('src="/landing.js"');
    expect(html).not.toMatch(/react|vue|three\.js|gsap/iu);

    const demoHtml = readWebFile("public/giwa-demo.html");
    expect(demoHtml).toContain('href="/giwa-demo.css"');
    expect(demoHtml).toContain('src="/user-flow.js"');
    expect(demoHtml).toContain('class="app-shell user-shell giwa-demo-shell"');
  });

  it("smokes the judge landing and recorded evidence as distinct surfaces", () => {
    const smoke = readWebFile("scripts/smoke-staging.mjs");
    expect(smoke).toContain('["/",200,"landing.js"]');
    expect(smoke).toContain('["/giwa-demo",200,"user-flow.js"]');
    expect(smoke).toContain('["/evidence",200,"flow.js"]');
  });
});

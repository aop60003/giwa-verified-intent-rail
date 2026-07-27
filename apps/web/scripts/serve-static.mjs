import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { exportFlowData } from "./export-flow-data.mjs";

const publicDir = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const port = Number(process.env.PORT ?? 4176);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

if (process.env.GIWA_SKIP_PUBLIC_EXPORT !== "1") exportFlowData();

const staticDemoStatusPayload = {
  ok: true,
  controlRoom: {
    screenKind: "operator-demo-control-room",
    openingOrder: [
      {
        id: "static-fallback",
        label: "Recorded evidence",
        href: "/evidence",
        state: "available",
        reason: "Recorded evidence remains available without the live local API."
      },
      {
        id: "user-flow",
        label: "User-facing flow",
        href: "/user",
        state: "available",
        reason: "Commercial user route is served as a local static surface."
      },
      {
        id: "partner-packet",
        label: "Partner packet",
        href: "/partner",
        state: "available",
        reason: "Partner proof packet remains a separate reviewer surface."
      }
    ],
    safeProjection: {
      readiness: {
        mode: "static-fallback",
        state: "recorded"
      },
      latestRun: null,
      receiptHash: null
    }
  }
};

const staticHealthPayload = {
  ok: true,
  mode: "static-fallback"
};

const staticReadinessPayload = {
  ready: false,
  mode: "static-fallback",
  checks: [
    {
      name: "live-api",
      state: "not-connected",
      reason: "Static server serves recorded public artifacts only."
    }
  ]
};

function writeJson(response, payload) {
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function publicPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested =
    decoded === "/"
      ? "/landing.html"
      : decoded === "/giwa-demo"
        ? "/giwa-demo.html"
        : decoded === "/demo"
          ? "/demo.html"
          : decoded === "/user" ||
              decoded === "/user/receipts" ||
              decoded === "/user/help" ||
              decoded.startsWith("/user/receipt/")
            ? "/user.html"
            : decoded === "/evidence" ||
                decoded === "/partner" ||
                decoded.startsWith("/receipt/")
              ? "/index.html"
              : decoded;
  const normalized = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(publicDir, normalized);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/healthz") {
    writeJson(response, staticHealthPayload);
    return;
  }

  if (url.pathname === "/readyz") {
    writeJson(response, staticReadinessPayload);
    return;
  }

  if (url.pathname === "/api/demo/status") {
    writeJson(response, staticDemoStatusPayload);
    return;
  }

  const filePath = publicPath(url.pathname);

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`@giwa/web Sprint 7 final demo: http://127.0.0.1:${port}`);
});

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

exportFlowData();

function publicPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested =
    decoded === "/demo"
      ? "/demo.html"
      : decoded === "/" || decoded === "/partner" || decoded.startsWith("/receipt/")
        ? "/index.html"
        : decoded;
  const normalized = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(publicDir, normalized);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
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

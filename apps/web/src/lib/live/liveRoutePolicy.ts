export type LiveApiRouteClass = "public" | "participant-create" | "participant" | "partner" | "unknown";

export function classifyLiveApiRoute(method: string, pathname: string): LiveApiRouteClass {
  if (method === "GET" && pathname === "/api/public/config") return "public";
  if (method === "GET" && pathname === "/api/public/campaign-studio") {
    return "public";
  }
  if (method === "POST" && pathname === "/api/public/events") return "public";
  if (
    method === "GET" &&
    /^\/api\/public\/evidence\/[^/]+$/u.test(pathname)
  ) {
    return "public";
  }
  if (method === "GET" && pathname.startsWith("/api/receipts/")) return "public";
  if (method === "GET" && pathname === "/api/demo/status") return "partner";
  if (method === "POST" && pathname === "/api/runs") return "participant-create";
  if (pathname.startsWith("/api/runs/")) return "participant";
  if (pathname.startsWith("/api/partner/")) return "partner";
  return "unknown";
}

export type LiveApiRouteClass = "public" | "participant-create" | "participant" | "partner" | "unknown";

export function classifyLiveApiRoute(method: string, pathname: string): LiveApiRouteClass {
  if (method === "GET" && (pathname === "/api/public/config" || pathname === "/api/demo/status")) return "public";
  if (method === "GET" && pathname.startsWith("/api/receipts/")) return "public";
  if (method === "POST" && pathname === "/api/runs") return "participant-create";
  if (pathname.startsWith("/api/runs/")) return "participant";
  if (pathname.startsWith("/api/partner/")) return "partner";
  return "unknown";
}

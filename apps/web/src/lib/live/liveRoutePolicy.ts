export type LiveApiRouteClass = "public" | "participant-create" | "participant" | "partner" | "auth" | "studio" | "campaign-version-public" | "unknown";

const STUDIO_PUBLISH = /^\/api\/studio\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/publish$/u;
const STUDIO_VERSIONS = /^\/api\/studio\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/versions$/u;
const PUBLIC_VERSION = /^\/api\/public\/campaigns\/(campaign_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/versions\/([1-9][0-9]*)$/u;

export function classifyLiveApiRoute(method: string, pathname: string): LiveApiRouteClass {
  if (
    (method === "POST" && pathname === "/api/auth/challenge") ||
    (method === "POST" && pathname === "/api/auth/verify") ||
    (method === "GET" && pathname === "/api/auth/session") ||
    (method === "POST" && pathname === "/api/auth/logout")
  ) return "auth";
  if (method === "GET" && pathname === "/api/public/config") return "public";
  if (method === "GET" && pathname === "/api/public/campaign-studio") {
    return "public";
  }
  if (method === "POST" && pathname === "/api/public/events") return "public";
  if (
    (method === "GET" || method === "POST") && pathname === "/api/studio/campaigns"
  ) return "studio";
  if (
    method === "PATCH" &&
    /^\/api\/studio\/campaigns\/(campaign_[0-9a-f-]+|gasok-demo)$/u.test(pathname)
  ) return "studio";
  if (
    (method === "POST" && STUDIO_PUBLISH.test(pathname)) ||
    (method === "GET" && STUDIO_VERSIONS.test(pathname))
  ) return "studio";
  const publicVersion = method === "GET" ? PUBLIC_VERSION.exec(pathname) : null;
  if (publicVersion?.[2] !== undefined) {
    const versionNumber = Number(publicVersion[2]);
    if (Number.isSafeInteger(versionNumber) && versionNumber > 0) return "campaign-version-public";
  }
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

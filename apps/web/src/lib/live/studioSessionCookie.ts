export const STUDIO_SESSION_COOKIE_NAME = "giwa_studio_session";

const STUDIO_SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

export function isStudioSessionToken(value: string): boolean {
  return STUDIO_SESSION_TOKEN_PATTERN.test(value);
}

export function parseStudioSessionCookie(cookie: string | undefined): {
  present: boolean;
  rawToken: string | null;
} {
  if (cookie === undefined) return { present: false, rawToken: null };
  const values: string[] = [];
  for (const part of cookie.split(";")) {
    const segment = part.trim();
    const separator = segment.indexOf("=");
    if (segment === STUDIO_SESSION_COOKIE_NAME) {
      values.push("");
      continue;
    }
    if (separator < 0 || segment.slice(0, separator).trim() !== STUDIO_SESSION_COOKIE_NAME) continue;
    values.push(segment.slice(separator + 1));
  }
  if (values.length !== 1 || !isStudioSessionToken(values[0]!)) {
    return { present: values.length > 0, rawToken: null };
  }
  return { present: true, rawToken: values[0]! };
}

export function studioSessionCookie(rawToken: string, expiresAt: string, secure: boolean): string {
  return [
    `${STUDIO_SESSION_COOKIE_NAME}=${rawToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=28800",
    `Expires=${new Date(expiresAt).toUTCString()}`,
    secure ? "Secure" : null
  ].filter((part): part is string => part !== null).join("; ");
}

export function clearStudioSessionCookie(secure: boolean): string {
  return [
    `${STUDIO_SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    secure ? "Secure" : null
  ].filter((part): part is string => part !== null).join("; ");
}

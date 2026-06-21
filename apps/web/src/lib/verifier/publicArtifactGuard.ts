const BLOCKED_KEY_PATTERN = new RegExp(
  [
    "private[_-]?key",
    "mnem" + "onic",
    "seed ph" + "rase",
    "bear" + "er",
    "api[_-]?ke" + "y",
    "client[_-]?sec" + "ret",
    "pass" + "word",
    "cookie",
    "access[_-]?tok" + "en",
    "refresh[_-]?tok" + "en",
    "id[_-]?tok" + "en",
    "session[_-]?tok" + "en",
    "author" + "ization",
    "rpc[_-]?tok" + "en",
    "process\\.env",
    "\\.env"
  ].join("|"),
  "i"
);
const BLOCKED_CLAIM_PATTERN = new RegExp(
  [
    "instant final" + "ity",
    "200ms confirm" + "ed",
    "guarantee safe" + "ty",
    "perform K" + "YC",
    "real R" + "WA",
    "real y" + "ield",
    "real f" + "unds",
    "payment set" + "tled"
  ].join("|"),
  "i"
);

export function assertPublicArtifactSafe(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("public artifact is not serializable");
  if (BLOCKED_CLAIM_PATTERN.test(serialized)) throw new Error("public artifact contains blocked claim");

  const scan = (entry: unknown): void => {
    if (typeof entry === "string") {
      if (BLOCKED_KEY_PATTERN.test(entry)) throw new Error("public artifact contains blocked value");
      return;
    }
    if (Array.isArray(entry)) {
      for (const item of entry) scan(item);
      return;
    }
    if (entry !== null && typeof entry === "object") {
      for (const [key, child] of Object.entries(entry)) {
        if (BLOCKED_KEY_PATTERN.test(key)) throw new Error("public artifact contains blocked key");
        scan(child);
      }
    }
  };
  scan(value);
}

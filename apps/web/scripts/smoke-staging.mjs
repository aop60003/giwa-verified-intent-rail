const REQUEST_TIMEOUT_MS = 8000;

const checks = [
  ["/",200,"GIWA Verified Intent Rail"],
  ["/user",200,"user-flow.js"],
  ["/user/help",200,"user-flow.js"],
  ["/partner",200,"GIWA Verified Intent Rail"],
  ["/healthz",200,"\"ok\":true"],
  ["/readyz",200,"\"ready\":true"],
  ["/api/public/config",200,"\"chainId\":91342"]
];

function parseBaseUrl(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") throw new Error("invalid base URL");

  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error("invalid base URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid base URL");
  if (parsed.username !== "" || parsed.password !== "") throw new Error("invalid base URL");
  if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") throw new Error("invalid base URL");

  return parsed;
}

function boundedStatus(value) {
  return Number.isInteger(value) && value >= 100 && value <= 599 ? String(value) : "000";
}

function writeResult(path, status, passed) {
  console.log(`${path} ${status} ${passed ? "pass" : "fail"}`);
}

async function runCheck(baseUrl, [path, expectedStatus, expectedMarker]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: "manual",
      signal: controller.signal
    });
    const status = boundedStatus(response.status);
    const body = await response.text();
    if (new URL(response.url).origin !== baseUrl.origin) {
      writeResult(path, status, false);
      return false;
    }
    const passed = response.status === expectedStatus && body.includes(expectedMarker);
    writeResult(path, status, passed);
    return passed;
  } catch {
    writeResult(path, "000", false);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  let baseUrl;
  try {
    baseUrl = parseBaseUrl(process.env.GIWA_SMOKE_BASE_URL);
  } catch {
    writeResult("/", "000", false);
    process.exitCode = 1;
    return;
  }

  for (const check of checks) {
    const passed = await runCheck(baseUrl, check);
    if (!passed) {
      process.exitCode = 1;
      return;
    }
  }
}

await main();

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function safeScanScriptPath(): string {
  return join(process.cwd(), "../../scripts/ci/check-safe-scans.ps1");
}

function safeScanScript(): string {
  return readFileSync(safeScanScriptPath(), "utf8");
}

function runSensitiveTermPolicyProbe(path: string, text: string): {
  status: number | null;
  output: string;
} {
  const shell = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const command = `
Set-Location $env:GIWA_SAFE_SCAN_ROOT
. $env:GIWA_SAFE_SCAN_SCRIPT
$probeArguments = @{
  RuleId = "sensitive-term"
  Path = $env:GIWA_SAFE_SCAN_PATH
  Text = $env:GIWA_SAFE_SCAN_TEXT
}
if ((Get-Command Test-SafeContext).Parameters.ContainsKey("Pattern")) {
  $probeArguments["Pattern"] = "private key|mnemonic|bearer|api[_-]?key|access[_-]?token|authorization|client[_-]?secret|begin private key|rpc[_-]?url|secret"
}
if (Test-SafeContext @probeArguments) {
  Write-Output "policy_probe=allowed"
  exit 0
}
Write-Output "policy_probe=rejected"
exit 1
`;
  const result = spawnSync(
    shell,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      ...(process.platform === "win32" ? ["-ExecutionPolicy", "Bypass"] : []),
      "-Command",
      command
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GIWA_SAFE_SCAN_ROOT: join(process.cwd(), "../.."),
        GIWA_SAFE_SCAN_SCRIPT: safeScanScriptPath(),
        GIWA_SAFE_SCAN_PATH: path,
        GIWA_SAFE_SCAN_TEXT: text
      }
    }
  );

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`
  };
}

describe("safe scan script contract", () => {
  it("does not blanket-allow unsupported claims or sensitive terms across every sprint plan", () => {
    const script = safeScanScript();

    expect(script).not.toContain(
      '$normalizedPath.StartsWith("docs\\superpowers\\plans\\") -and $RuleId -in @("unsupported-claim", "sensitive-term")'
    );
  });

  it("allows only the exact server runtime injection policy filename as a documentation reference", () => {
    const script = safeScanScript();

    expect(script).toContain(
      '$normalizedText.Contains("giwa-lightsail-env-and-secret-injection-preflight.md")'
    );
    expect(script).not.toContain('$RuleId -eq "sensitive-term") { return $true }');
  });

  it("detects common secret-like names without printing real env values", () => {
    const script = safeScanScript().toLowerCase();

    for (const pattern of [
      "api[_-]?key",
      "access[_-]?token",
      "authorization",
      "client[_-]?secret",
      "begin private key",
      "rpc[_-]?url"
    ]) {
      expect(script).toContain(pattern);
    }
  });

  it("allows the full server runtime injection policy path in Markdown", () => {
    const result = runSensitiveTermPolicyProbe(
      "README.md",
      "See docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md."
    );

    expect(result.status).toBe(0);
    expect(result.output).toContain("policy_probe=allowed");
  });

  it("rejects a sensitive public JavaScript line that appends the full policy path", () => {
    const result = runSensitiveTermPolicyProbe(
      "apps/web/public/user-flow.js",
      'const api_key = "demo"; // docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md'
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain("policy_probe=rejected");
  });

  it("rejects unrelated Markdown with sensitive content before the full policy path", () => {
    const result = runSensitiveTermPolicyProbe(
      "docs/implementation/unrelated.md",
      "authorization material docs/implementation/giwa-lightsail-env-and-secret-injection-preflight.md"
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain("policy_probe=rejected");
  });

  it("rejects a basename-only policy reference", () => {
    const result = runSensitiveTermPolicyProbe(
      "README.md",
      "See giwa-lightsail-env-and-secret-injection-preflight.md."
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain("policy_probe=rejected");
  });
});

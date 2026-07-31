import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function safeScanScriptPath(): string {
  return join(process.cwd(), "../../scripts/ci/check-safe-scans.ps1");
}

function safeScanScript(): string {
  return readFileSync(safeScanScriptPath(), "utf8");
}

function runSafeScan(): { status: number | null; output: string } {
  const shell = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const result = spawnSync(
    shell,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      ...(process.platform === "win32" ? ["-ExecutionPolicy", "Bypass"] : []),
      "-File",
      safeScanScriptPath()
    ],
    {
      cwd: join(process.cwd(), "../.."),
      encoding: "utf8"
    }
  );

  if (result.error) throw result.error;
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
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

function runMarkdownContextPolicyProbe(): {
  status: number | null;
  output: string;
} {
  const directory = mkdtempSync(join(tmpdir(), "giwa-safe-scan-context-"));
  const markdownPath = join(directory, "probe.md");
  writeFileSync(
    markdownPath,
    ["Policy guardrail for an unrelated section.", 'authorization = "raw-value"'].join("\n")
  );
  const shell = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const command = `
Set-Location $env:GIWA_SAFE_SCAN_ROOT
. $env:GIWA_SAFE_SCAN_SCRIPT
$context = Get-SafeScanContext -Path $env:GIWA_SAFE_SCAN_PATH -LineNumber "2" -Text 'authorization = "raw-value"'
$probeArguments = @{
  RuleId = "sensitive-term"
  Path = $env:GIWA_SAFE_SCAN_PATH
  Text = $context
  Pattern = "private key|mnemonic|bearer|api[_-]?key|access[_-]?token|authorization|client[_-]?secret|begin private key|rpc[_-]?url|secret"
}
if (Test-SafeContext @probeArguments) {
  Write-Output "policy_probe=allowed"
  exit 0
}
Write-Output "policy_probe=rejected"
exit 1
`;

  try {
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
          GIWA_SAFE_SCAN_PATH: markdownPath
        }
      }
    );
    if (result.error) throw result.error;
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("safe scan script contract", () => {
  it("passes the current repository-wide CI scan", () => {
    const result = runSafeScan();

    expect(result.status).toBe(0);
    expect(result.output).toContain("safe_scans=pass");
  });

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

  it("loads policy functions without launching the full scan when dot-sourced", () => {
    const script = safeScanScript();

    expect(script).toContain('if ($MyInvocation.InvocationName -eq ".") { return }');
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

  it("rejects a raw authorization assignment outside an approved smoke canary", () => {
    const result = runSensitiveTermPolicyProbe(
      "apps/web/public/user-flow.js",
      'const authorization = "Bearer live-looking-value";'
    );

    expect(result.status).toBe(1);
    expect(result.output).toContain("policy_probe=rejected");
  });

  it("does not let an unrelated nearby Markdown guardrail exempt a sensitive line", () => {
    const result = runMarkdownContextPolicyProbe();

    expect(result.status).toBe(1);
    expect(result.output).toContain("policy_probe=rejected");
  });

  it("allows explicit Git authorization language without treating it as a secret", () => {
    const result = runSensitiveTermPolicyProbe(
      "docs/superpowers/plans/example.md",
      "Commit only with explicit Git authorization."
    );

    expect(result.status).toBe(0);
    expect(result.output).toContain("policy_probe=allowed");
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

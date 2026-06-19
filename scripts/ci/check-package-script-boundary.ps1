Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ciScriptsByPackage = @{
  "package.json" = @("test", "typecheck", "build")
  "apps/web/package.json" = @("test", "typecheck", "build", "artifact:local", "artifact:provenance:verify", "artifact:scan")
  "packages/protocol/package.json" = @("test", "typecheck", "build")
  "packages/contracts/package.json" = @("test", "typecheck", "build")
}

$blockedPatterns = @(
  @{ Term = "deploy:local"; Regex = "(?i)(^|[\s`"'])deploy:local($|[\s`"'])" },
  @{ Term = "deploy:giwa"; Regex = "(?i)(^|[\s`"'])deploy:giwa($|[\s`"'])" },
  @{ Term = "fund:giwa"; Regex = "(?i)(^|[\s`"'])fund:giwa($|[\s`"'])" },
  @{ Term = "preflight:giwa"; Regex = "(?i)(^|[\s`"'])preflight:giwa($|[\s`"'])" },
  @{ Term = "sign:manifest"; Regex = "(?i)(^|[\s`"'])sign:manifest($|[\s`"'])" },
  @{ Term = "anchor:giwa"; Regex = "(?i)(^|[\s`"'])anchor:giwa($|[\s`"'])" },
  @{ Term = "verify:giwa"; Regex = "(?i)(^|[\s`"'])verify:giwa($|[\s`"'])" },
  @{ Term = "dev"; Regex = "(?i)(^|[\s`"':])dev($|[\s`"'])" },
  @{ Term = "serve"; Regex = "(?i)(^|[\s`"':])serve($|[\s`"'])" },
  @{ Term = "dev:live"; Regex = "(?i)(^|[\s`"'])dev:live($|[\s`"'])" },
  @{ Term = "serve:live"; Regex = "(?i)(^|[\s`"'])serve:live($|[\s`"'])" },
  @{ Term = "export:live-demo"; Regex = "(?i)(^|[\s`"'])export:live-demo($|[\s`"'])" },
  @{ Term = "mint"; Regex = "(?i)(^|[\s`"':])mint($|[\s`"'])" },
  @{ Term = "public hosting"; Regex = "(?i)public hosting" },
  @{ Term = "managed infrastructure"; Regex = "(?i)managed infrastructure" }
)

function Read-PackageScripts {
  param([string] $Path)

  $json = Get-Content -Raw $Path | ConvertFrom-Json
  if ($null -eq $json.scripts) {
    return @{}
  }

  $scripts = @{}
  $json.scripts.PSObject.Properties | ForEach-Object {
    $scripts[$_.Name] = [string] $_.Value
  }
  return $scripts
}

$failures = @()

foreach ($packagePath in $ciScriptsByPackage.Keys) {
  $scripts = Read-PackageScripts $packagePath
  foreach ($scriptName in $ciScriptsByPackage[$packagePath]) {
    if (-not $scripts.ContainsKey($scriptName)) {
      $failures += "missing-ci-script:${packagePath}:${scriptName}"
      continue
    }

    $command = $scripts[$scriptName]
    foreach ($blocked in $blockedPatterns) {
      if ($command -match $blocked.Regex) {
        $failures += "blocked-command:${packagePath}:${scriptName}:$($blocked.Term)"
      }
    }
  }
}

if ($failures.Count -gt 0) {
  Write-Host "package_script_boundary=blocked failures=$($failures.Count)"
  $failures | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host "package_script_boundary=pass"

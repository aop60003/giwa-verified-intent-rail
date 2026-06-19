[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$EngramArgs
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DbDir = Join-Path $ProjectRoot '.engram'
$DbPath = Join-Path $DbDir 'memory.db'

function Show-Usage {
    Write-Host 'Usage: .\scripts\engram-local.ps1 <command> [args...]'
    Write-Host ''
    Write-Host 'Local aliases:'
    Write-Host '  init                         Initialize .\.engram\memory.db'
    Write-Host '  save "text"                  Store memory in the local DB'
    Write-Host '  find "query"                 Search the local DB'
    Write-Host '  who "name"                   Get an entity from the local DB'
    Write-Host '  remember "name" "fact"       Add a fact to an entity'
    Write-Host '  all                          List entities'
    Write-Host '  status                       Run health checks'
    Write-Host ''
    Write-Host 'Advanced commands pass through to engram-advanced with --db .\.engram\memory.db.'
}

if (-not $EngramArgs -or $EngramArgs.Count -eq 0) {
    Show-Usage
    exit 2
}

$EngramCommand = Get-Command 'engram-advanced' -ErrorAction SilentlyContinue
if (-not $EngramCommand) {
    Write-Error 'engram-advanced was not found on PATH. Install engram-ms or add the Python Scripts directory to PATH.'
    exit 127
}

New-Item -ItemType Directory -Path $DbDir -Force | Out-Null

$Command = $EngramArgs[0]
$Rest = if ($EngramArgs.Count -gt 1) { $EngramArgs[1..($EngramArgs.Count - 1)] } else { @() }

$MappedArgs = @()
switch ($Command) {
    'save' { $MappedArgs = @('store') + $Rest; break }
    'find' { $MappedArgs = @('search') + $Rest; break }
    'who' { $MappedArgs = @('get') + $Rest; break }
    'remember' { $MappedArgs = @('add-fact') + $Rest; break }
    'all' { $MappedArgs = @('list') + $Rest; break }
    'status' { $MappedArgs = @('health') + $Rest; break }
    default { $MappedArgs = @($EngramArgs); break }
}

& $EngramCommand.Source --db $DbPath @MappedArgs
if ($null -ne $LASTEXITCODE) {
    exit $LASTEXITCODE
}

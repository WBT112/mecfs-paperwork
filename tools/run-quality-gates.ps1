# tools\run-quality-gates.ps1
# Runs all quality gates from the "app" package and stays in /app on success.
# Usage:
#   .\run-quality-gates.ps1
#   .\run-quality-gates.ps1 -UnitCommand "test:unit" -E2eCommand "test:e2e" -E2eRuns 3

[CmdletBinding()]
param(
  [string]$AppSubdir = "app",
  [string]$UnitCommand = "",
  [string]$E2eCommand = "test:e2e",
  [int]$E2eRuns = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$didPush = $false
$success = $false

function Find-RepoRoot {
  param([string]$StartDir)

  $dir = Resolve-Path -LiteralPath $StartDir
  while ($true) {
    $pkg = Join-Path $dir "package.json"
    if (Test-Path -LiteralPath $pkg) { return $dir }

    $parent = Split-Path -Parent $dir
    if ([string]::IsNullOrWhiteSpace($parent) -or ($parent -eq $dir)) {
      throw "Could not find repo root (package.json) when searching upwards from: $StartDir"
    }
    $dir = $parent
  }
}

function Get-PackageJsonScripts {
  param([string]$PackageDir)

  $pkgPath = Join-Path $PackageDir "package.json"
  if (-not (Test-Path -LiteralPath $pkgPath)) {
    throw "No package.json found in package dir: $PackageDir"
  }

  $json = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
  if ($null -eq $json.scripts) { return @{} }

  $scripts = @{}
  foreach ($p in $json.scripts.PSObject.Properties) {
    $scripts[$p.Name] = [string]$p.Value
  }
  return $scripts
}

function Assert-ScriptExists {
  param(
    [hashtable]$Scripts,
    [string]$Name,
    [string]$PackageDir
  )

  if (-not $Scripts.ContainsKey($Name)) {
    $available = ($Scripts.Keys | Sort-Object) -join ", "
    throw "Missing npm script '$Name' in $PackageDir. Available scripts: $available"
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Exe,
    [Parameter(Mandatory = $false)][string[]]$Args = @()
  )

  Write-Host ""
  Write-Host "==> $Label" -ForegroundColor Cyan

  & $Exe @Args
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    throw "$Label failed (exit code $exitCode)."
  }
}

try {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $repoRoot  = Find-RepoRoot -StartDir $scriptDir

  $appDir = Join-Path $repoRoot $AppSubdir
  if (-not (Test-Path -LiteralPath $appDir)) {
    throw "App directory not found: $appDir (repoRoot=$repoRoot, AppSubdir=$AppSubdir)"
  }

  Write-Host "Repo root: $repoRoot" -ForegroundColor DarkGray
  Write-Host "App dir:   $appDir" -ForegroundColor DarkGray

  # Verify required scripts exist in app/package.json
  $scripts = Get-PackageJsonScripts -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "lint" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "typecheck" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "build" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "formpack:validate" -PackageDir $appDir
  if (-not [string]::IsNullOrWhiteSpace($UnitCommand)) {
    Assert-ScriptExists -Scripts $scripts -Name $UnitCommand -PackageDir $appDir
  }
  Assert-ScriptExists -Scripts $scripts -Name $E2eCommand -PackageDir $appDir

  Push-Location -LiteralPath $appDir
  $didPush = $true

  # Quality gates
  Invoke-Checked -Label "lint (npm run lint)" -Exe "npm" -Args @("run", "lint")
  Invoke-Checked -Label "typecheck (npm run typecheck)" -Exe "npm" -Args @("run", "typecheck")
  Invoke-Checked -Label "build (npm run build)" -Exe "npm" -Args @("run", "build")

  # Formpack validation
  Invoke-Checked -Label "formpack:validate (npm run formpack:validate)" -Exe "npm" -Args @("run", "formpack:validate")

  # Unit tests
  if ([string]::IsNullOrWhiteSpace($UnitCommand)) {
    Invoke-Checked -Label "unit tests (npm test)" -Exe "npm" -Args @("test")
  } else {
    Invoke-Checked -Label "unit tests (npm run $UnitCommand)" -Exe "npm" -Args @("run", $UnitCommand)
  }

  # E2E tests (3x)
  for ($i = 1; $i -le $E2eRuns; $i++) {
    Invoke-Checked -Label "e2e run $i/$E2eRuns (npm run $E2eCommand)" -Exe "npm" -Args @("run", $E2eCommand)
  }

  $success = $true

  Write-Host ""
  Write-Host "Erfolg (du bist jetzt im /app Ordner; starte direkt: npm run dev)" -ForegroundColor Green
  exit 0
}
catch {
  Write-Host ""
  Write-Host "FEHLER: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Abbruch." -ForegroundColor Red
  exit 1
}
finally {
  # On failure: return to original directory. On success: stay in /app.
  if (-not $success -and $didPush) {
    Pop-Location -ErrorAction SilentlyContinue
  }
}
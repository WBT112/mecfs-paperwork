# tools\run-quality-gates.ps1
# Runs all quality gates from the "app" package and stays in /app on success.
# Additionally builds + runs Docker image and performs smoke checks.

[CmdletBinding()]
param(
  [string]$AppSubdir = "app",

  # Unit tests:
  # - default uses "npm test"
  # - alternatively set to an npm script name like "test:unit"
  [string]$UnitCommand = "",

  # E2E tests npm script name (default "test:e2e")
  [string]$E2eCommand = "test:e2e",

  # How many times to run E2E
  [int]$E2eRuns = 3,

  # Docker checks
  [switch]$SkipDockerChecks,

  # If set, container keeps running after checks (prints stop command)
  [switch]$KeepDockerRunning
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$didPushApp = $false
$success = $false
$containerId = ""

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

function Invoke-DockerLogin {
  Write-Host ""
  Write-Host "==> docker login dhi.io (optional, only if private)" -ForegroundColor Cyan

  # If credentials are provided via env vars, do non-interactive login.
  # Otherwise, fall back to interactive login.
  if (-not [string]::IsNullOrWhiteSpace($env:DHI_USERNAME) -and -not [string]::IsNullOrWhiteSpace($env:DHI_PASSWORD)) {
    # Use docker login with password via stdin
    $env:DHI_PASSWORD | docker login dhi.io -u $env:DHI_USERNAME --password-stdin | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "docker login dhi.io failed (exit code $LASTEXITCODE)."
    }
  } else {
    Write-Host "No DHI_USERNAME/DHI_PASSWORD env vars found. Falling back to interactive login..." -ForegroundColor DarkGray
    docker login dhi.io | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "docker login dhi.io failed (exit code $LASTEXITCODE)."
    }
  }
}

function Wait-HttpOk {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$MaxSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($MaxSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      # -f fails on >=400, -sS makes errors visible but quiet otherwise
      curl.exe -fsS $Url | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "Timeout waiting for HTTP 200 from: $Url"
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
  $didPushApp = $true

  # Quality gates
  Invoke-Checked -Label "lint (npm run lint)" -Exe "npm" -Args @("run", "lint")
  Invoke-Checked -Label "typecheck (npm run typecheck)" -Exe "npm" -Args @("run", "typecheck")
  Invoke-Checked -Label "build (npm run build)" -Exe "npm" -Args @("run", "build")
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

  # Docker checks (build + run + smoke)
  if (-not $SkipDockerChecks) {
    # Build must be executed from repo root (Dockerfile is in repo root)
    Push-Location -LiteralPath $repoRoot

    # 1) Login (only required if registry is private)
    Invoke-DockerLogin

    # 2) Build image
    Invoke-Checked -Label "docker build (mecfs-paperwork:local)" -Exe "docker" -Args @("build", "-t", "mecfs-paperwork:local", ".")

    # 3) Run container detached for smoke checks
    Write-Host ""
    Write-Host "==> docker run (detached) -p 8080:80" -ForegroundColor Cyan
    $containerId = (docker run -d --rm -p 8080:80 mecfs-paperwork:local).Trim()
    if ([string]::IsNullOrWhiteSpace($containerId)) {
      throw "docker run did not return a container id."
    }

    # 4) Smoke checks (HTTP 200)
    Write-Host ""
    Write-Host "==> smoke check: http://localhost:8080/" -ForegroundColor Cyan
    Wait-HttpOk -Url "http://localhost:8080/"

    Write-Host ""
    Write-Host "==> smoke check (SPA fallback): http://localhost:8080/some/deep/link" -ForegroundColor Cyan
    Wait-HttpOk -Url "http://localhost:8080/some/deep/link"

    Write-Host ""
    Write-Host "Docker smoke checks passed. You can open: http://localhost:8080" -ForegroundColor Green

    if (-not $KeepDockerRunning) {
      Write-Host ""
      Write-Host "==> stopping container $containerId" -ForegroundColor Cyan
      docker stop $containerId | Out-Host
    } else {
      Write-Host ""
      Write-Host "Container is still running. Stop it with:" -ForegroundColor Yellow
      Write-Host "docker stop $containerId" -ForegroundColor Yellow
    }

    Pop-Location # back to /app
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
  # Stop container if still running and we failed mid-run (best-effort)
  if (-not $success -and -not [string]::IsNullOrWhiteSpace($containerId)) {
    try { docker stop $containerId | Out-Null } catch {}
  }

  # On failure: return to original directory. On success: stay in /app.
  if (-not $success -and $didPushApp) {
    Pop-Location -ErrorAction SilentlyContinue
  }
}

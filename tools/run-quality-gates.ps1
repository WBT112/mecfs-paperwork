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


  # Docker image smoke test port (uses docker run -p)
  [int]$DockerImagePort = 18080,

  # Docker Compose published port (should match compose.yaml)
  [int]$ComposePort = 8080,

  # Docker Compose checks
  [switch]$SkipComposeChecks,
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
  param([Parameter(Mandatory = $true)][string]$StartDir)

  $dir = Resolve-Path -LiteralPath $StartDir
  while ($true) {
    if (Test-Path -LiteralPath (Join-Path $dir ".git")) { return $dir.Path }
    $parent = Split-Path -Parent $dir
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $dir) { break }
    $dir = $parent
  }
  throw "Repo root not found (no .git directory) starting from: $StartDir"
}

function Get-PackageJsonScripts {
  param([Parameter(Mandatory = $true)][string]$PackageDir)

  $pkgPath = Join-Path $PackageDir "package.json"
  if (-not (Test-Path -LiteralPath $pkgPath)) {
    throw "package.json not found at: $pkgPath"
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
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$PackageDir
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
    Write-Host "No DHI_USERNAME/DHI_PASSWORD env vars found... Falling back to interactive login..." -ForegroundColor DarkGray
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
  Assert-ScriptExists -Scripts $scripts -Name "format:check" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "format" -PackageDir $appDir

  if (-not [string]::IsNullOrWhiteSpace($UnitCommand)) {
    Assert-ScriptExists -Scripts $scripts -Name $UnitCommand -PackageDir $appDir
  }
  Assert-ScriptExists -Scripts $scripts -Name $E2eCommand -PackageDir $appDir

  Push-Location -LiteralPath $appDir
  $didPushApp = $true

  # Quality gates
  try {
    Invoke-Checked -Label "format:check (npm run format:check)" -Exe "npm" -Args @("run", "format:check")
  } catch {
    Write-Host ""
    Write-Host "==> format:check failed; running prettier write (npm run format)" -ForegroundColor Yellow
    Invoke-Checked -Label "format (npm run format)" -Exe "npm" -Args @("run", "format")
    Invoke-Checked -Label "format:check (npm run format:check) [after format]" -Exe "npm" -Args @("run", "format:check")
  }

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
    Invoke-Checked -Label ("e2e tests run {0}/{1} (npm run {2})" -f $i, $E2eRuns, $E2eCommand) -Exe "npm" -Args @("run", $E2eCommand)
  }

  # Return to repo root for docker checks
  Pop-Location
  $didPushApp = $false

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
    Write-Host ("==> docker run (detached) -p {0}:80" -f $DockerImagePort) -ForegroundColor Cyan
    $runOut = (& docker run -d --rm -p ("{0}:80" -f $DockerImagePort) mecfs-paperwork:local) 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      throw "docker run failed (exit code $exitCode). Output: $runOut"
    }
    $containerId = $runOut.Trim()
    Write-Host "Container started: $containerId" -ForegroundColor DarkGray

    # 4) Smoke check HTTP
    Wait-HttpOk -Url ("http://127.0.0.1:{0}/" -f $DockerImagePort) -MaxSeconds 20

    if ($KeepDockerRunning) {
      Write-Host ""
      Write-Host "Docker smoke checks OK. Container is kept running." -ForegroundColor Green
      Write-Host ("Stop with: docker stop {0}" -f $containerId) -ForegroundColor Yellow
    } else {
      Write-Host ""
      Write-Host "Stopping container..." -ForegroundColor DarkGray
      docker stop $containerId | Out-Null
      $containerId = ""
    }

    Pop-Location
  }

  # Docker Compose checks (build + up + smoke + down)
  if (-not $SkipComposeChecks) {
    Push-Location -LiteralPath $repoRoot

    Invoke-DockerLogin

    Write-Host ""
    Write-Host "==> docker compose up -d --build" -ForegroundColor Cyan
    Invoke-Checked -Label "docker compose up -d --build" -Exe "docker" -Args @("compose", "up", "-d", "--build")

    try {
      Wait-HttpOk -Url ("http://127.0.0.1:{0}/" -f $ComposePort) -MaxSeconds 30
    }
    finally {
      Write-Host ""
      Write-Host "==> docker compose down" -ForegroundColor Cyan
      docker compose down | Out-Host
    }

    Pop-Location
  }

  # Stay in /app on success
  Push-Location -LiteralPath $appDir
  $didPushApp = $true

  $success = $true
  Write-Host ""
  Write-Host "✅ All quality gates passed." -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "❌ Quality gates failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ""
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
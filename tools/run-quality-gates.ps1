# tools\run-quality-gates.ps1
# Runs all quality gates from the "app" package and stays in /app on success.
# Additionally builds + runs Docker image and performs smoke checks.
# Optionally checks docker compose.

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
  [int]$E2eRuns = 2,

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

$success = $false
$containerId = ""
$originalLocation = Get-Location

function Find-RepoRoot {
  param([Parameter(Mandatory = $true)][string]$StartDir)

  # Keep $dir as a STRING path throughout to avoid .Path issues.
  $dir = (Resolve-Path -LiteralPath $StartDir).Path
  while ($true) {
    $gitMarker = Join-Path $dir ".git"
    if (Test-Path -LiteralPath $gitMarker) { return $dir }

    $parent = Split-Path -Parent $dir
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $dir) { break }
    $dir = $parent
  }

  throw "Repo root not found (no .git) starting from: $StartDir"
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

  # Non-interactive login if env vars exist (CI-safe), otherwise interactive.
  if (-not [string]::IsNullOrWhiteSpace($env:DHI_USERNAME) -and -not [string]::IsNullOrWhiteSpace($env:DHI_PASSWORD)) {
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
    & curl.exe -fsS $Url *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 1
  }

  throw "Timeout waiting for HTTP 200 from: $Url"
}

try {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $repoRoot  = Find-RepoRoot -StartDir $scriptDir
  $appDir    = Join-Path $repoRoot $AppSubdir

  if (-not (Test-Path -LiteralPath $appDir)) {
    throw "App directory not found: $appDir (repoRoot=$repoRoot, AppSubdir=$AppSubdir)"
  }

  Write-Host "Repo root: $repoRoot" -ForegroundColor DarkGray
  Write-Host "App dir:   $appDir" -ForegroundColor DarkGray

  # --- App quality gates ---
  Push-Location -LiteralPath $appDir

  $scripts = Get-PackageJsonScripts -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "lint" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "typecheck" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "build" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "formpack:validate" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "format:check" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "format" -PackageDir $appDir
  Assert-ScriptExists -Scripts $scripts -Name "dev" -PackageDir $appDir

  if (-not [string]::IsNullOrWhiteSpace($UnitCommand)) {
    Assert-ScriptExists -Scripts $scripts -Name $UnitCommand -PackageDir $appDir
  }
  Assert-ScriptExists -Scripts $scripts -Name $E2eCommand -PackageDir $appDir

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

  if ([string]::IsNullOrWhiteSpace($UnitCommand)) {
    Invoke-Checked -Label "unit tests (npm test)" -Exe "npm" -Args @("test")
  } else {
    Invoke-Checked -Label "unit tests (npm run $UnitCommand)" -Exe "npm" -Args @("run", $UnitCommand)
  }

  for ($i = 1; $i -le $E2eRuns; $i++) {
    Invoke-Checked -Label ("e2e tests run {0}/{1} (npm run {2})" -f $i, $E2eRuns, $E2eCommand) -Exe "npm" -Args @("run", $E2eCommand)
  }

  Invoke-Checked -Label "formpack:validate (npm run formpack:validate)" -Exe "npm" -Args @("run", "formpack:validate")
  Invoke-Checked -Label "build (npm run build)" -Exe "npm" -Args @("run", "build")

  Pop-Location

  # If both docker image + compose checks are enabled and ports collide, avoid conflicts.
  if (-not $SkipDockerChecks -and -not $SkipComposeChecks -and $DockerImagePort -eq $ComposePort) {
    Write-Host ""
    Write-Host "==> Note: DockerImagePort equals ComposePort; switching DockerImagePort to 18080 to avoid port conflict." -ForegroundColor Yellow
    $DockerImagePort = 18080
  }

  # --- Docker image checks ---
  if (-not $SkipDockerChecks) {
    Push-Location -LiteralPath $repoRoot

    Invoke-DockerLogin
    Invoke-Checked -Label "docker build (mecfs-paperwork:local)" -Exe "docker" -Args @("build", "-t", "mecfs-paperwork:local", ".")

    Write-Host ""
    Write-Host ("==> docker run (detached) -p {0}:80" -f $DockerImagePort) -ForegroundColor Cyan
    $runOut = (& docker run -d --rm -p ("{0}:80" -f $DockerImagePort) "mecfs-paperwork:local") 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "docker run failed (exit code $LASTEXITCODE): $runOut"
    }

    $containerId = ([string]$runOut).Trim()
    if ([string]::IsNullOrWhiteSpace($containerId)) {
      throw "docker run did not return a container id."
    }

    Write-Host ""
    Write-Host ("==> smoke check: http://localhost:{0}/" -f $DockerImagePort) -ForegroundColor Cyan
    Wait-HttpOk -Url ("http://localhost:{0}/" -f $DockerImagePort)

    Write-Host ""
    Write-Host ("==> smoke check (SPA fallback): http://localhost:{0}/some/deep/link" -f $DockerImagePort) -ForegroundColor Cyan
    Wait-HttpOk -Url ("http://localhost:{0}/some/deep/link" -f $DockerImagePort)

    Write-Host ""
    Write-Host ("Docker image smoke checks passed. Open: http://localhost:{0}" -f $DockerImagePort) -ForegroundColor Green

    if (-not $KeepDockerRunning) {
      Write-Host ""
      Write-Host "==> stopping container $containerId" -ForegroundColor Cyan
      docker stop $containerId | Out-Host
      $containerId = ""
    } else {
      Write-Host ""
      Write-Host "Container is still running. Stop it with:" -ForegroundColor Yellow
      Write-Host "docker stop $containerId" -ForegroundColor Yellow
    }

    Pop-Location
  }

  # --- Docker Compose checks ---
  if (-not $SkipComposeChecks) {
    $composeFile = Join-Path $repoRoot "compose.yaml"
    if (-not (Test-Path -LiteralPath $composeFile)) {
      throw "compose.yaml not found in repo root: $repoRoot. Add compose.yaml or run with -SkipComposeChecks."
    }

    Push-Location -LiteralPath $repoRoot

    Invoke-DockerLogin
    Invoke-Checked -Label "docker compose version" -Exe "docker" -Args @("compose", "version")

    $composeStarted = $false
    try {
      Invoke-Checked -Label "docker compose up -d --build" -Exe "docker" -Args @("compose", "up", "-d", "--build")
      $composeStarted = $true

      Write-Host ""
      Write-Host ("==> compose smoke check: http://localhost:{0}/" -f $ComposePort) -ForegroundColor Cyan
      Wait-HttpOk -Url ("http://localhost:{0}/" -f $ComposePort)

      Write-Host ""
      Write-Host ("==> compose smoke check (SPA fallback): http://localhost:{0}/some/deep/link" -f $ComposePort) -ForegroundColor Cyan
      Wait-HttpOk -Url ("http://localhost:{0}/some/deep/link" -f $ComposePort)

      Write-Host ""
      Write-Host ("Docker Compose smoke checks passed. Open: http://localhost:{0}" -f $ComposePort) -ForegroundColor Green
    }
    finally {
      if ($composeStarted) {
        Write-Host ""
        Write-Host "==> docker compose down (cleanup)" -ForegroundColor Cyan
        docker compose down --remove-orphans | Out-Host
      }
      Pop-Location
    }
  }

  # Success: move to /app so you can run npm run dev immediately.
  Set-Location -LiteralPath $appDir
  $success = $true

  Write-Host ""
  Write-Host "Erfolg (du bist jetzt im /app Ordner; starte npm run dev)" -ForegroundColor Green
  & npm run dev
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

  # On failure, return to original directory.
  if (-not $success) {
    try { Set-Location -LiteralPath $originalLocation } catch {}
  }
}

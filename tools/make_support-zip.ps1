<# 
.SYNOPSIS
  Creates a support ZIP of the repo without node_modules etc. using git file lists.

.DESCRIPTION
  - Default: includes tracked files (git ls-files).
  - Optional: include untracked files (git ls-files -o --exclude-standard).
  - Uses the working tree contents (so modified tracked files are included as-is).
  - Excludes common heavy/sensitive folders by pattern.

.REQUIREMENTS
  - PowerShell 5.1+ (Windows) or PowerShell 7+
  - git available in PATH
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$OutFile = "",

  [Parameter(Mandatory = $false)]
  [switch]$IncludeUntracked,

  [Parameter(Mandatory = $false)]
  [string[]]$ExcludePatterns = @(
    ".git/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.vite/**",
    "**/.turbo/**",
    "**/.next/**",
    "**/coverage/**",
    "**/.cache/**",
    "**/*.log",
    "**/.DS_Store"
  )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $name"
  }
}

function Get-RepoRoot {
  Assert-Command git
  $root = (git rev-parse --show-toplevel 2>$null).Trim()
  if (-not $root) { throw "Not a git repository (or git rev-parse failed)." }
  return $root
}

function New-DefaultOutFile([string]$repoRoot) {
  $repoName = Split-Path -Leaf $repoRoot
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"
  $parent = Split-Path -Parent $repoRoot
  return Join-Path $parent "$repoName-support-$ts.zip"
}
function Convert-ToWildcardRegex([string]$pattern) {
  # Convert a glob-ish pattern to a regex for matching normalized paths.
  # Supports ** and * and ?
  $p = $pattern.Replace("\", "/")
  $p = [Regex]::Escape($p)
  $p = $p.Replace("\*\*", "§§DOUBLESTAR§§")
  $p = $p.Replace("\*", "§§STAR§§")
  $p = $p.Replace("\?", "§§Q§§")
  $p = $p.Replace("§§DOUBLESTAR§§", ".*")
  $p = $p.Replace("§§STAR§§", "[^/]*")
  $p = $p.Replace("§§Q§§", ".")
  return "^$p$"
}

function Test-Excluded([string]$relativePath, [string[]]$excludePatterns) {
  $path = $relativePath.Replace("\", "/")
  foreach ($pat in $excludePatterns) {
    $rx = Convert-ToWildcardRegex $pat
    if ($path -match $rx) { return $true }
  }
  return $false
}

function Get-FileList([string]$repoRoot, [switch]$includeUntracked, [string[]]$excludePatterns) {
  Push-Location $repoRoot
  try {
    $tracked = git ls-files
    $files = @($tracked)

    if ($includeUntracked) {
      $untracked = git ls-files -o --exclude-standard
      $files += @($untracked)
    }

    # Normalize, filter empties, exclusions, and ensure file exists.
    $result = New-Object System.Collections.Generic.List[string]
    foreach ($f in $files) {
      $rel = ($f ?? "").Trim()
      if (-not $rel) { continue }
      if (Test-Excluded -relativePath $rel -excludePatterns $excludePatterns) { continue }

      $full = Join-Path $repoRoot $rel
      if (Test-Path -LiteralPath $full -PathType Leaf) {
        $result.Add($rel.Replace("\", "/"))
      }
    }

    # De-duplicate
    return $result | Sort-Object -Unique
  }
  finally {
    Pop-Location
  }
}

function Write-Zip([string]$repoRoot, [string[]]$relativeFiles, [string]$outFile) {
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem

  if (Test-Path -LiteralPath $outFile) {
    Remove-Item -LiteralPath $outFile -Force
  }

  $zip = [System.IO.Compression.ZipFile]::Open($outFile, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($rel in $relativeFiles) {
      $src = Join-Path $repoRoot $rel
      # Ensure forward slashes inside ZIP
      $entryName = $rel.Replace("\", "/")
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $src, $entryName) | Out-Null
    }

    # Add a tiny manifest (no sensitive contents, only metadata + file list)
    $branch = ""
    $commit = ""
    Push-Location $repoRoot
    try {
      $branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
      $commit = (git rev-parse HEAD 2>$null).Trim()
    } finally { Pop-Location }

    $manifest = @()
    $manifest += "createdAt=$(Get-Date -Format o)"
    $manifest += "repoRoot=$repoRoot"
    if ($branch) { $manifest += "gitBranch=$branch" }
    if ($commit) { $manifest += "gitCommit=$commit" }
    $manifest += ""
    $manifest += "files:"
    $manifest += $relativeFiles

    $entry = $zip.CreateEntry("support-manifest.txt")
    $writer = New-Object System.IO.StreamWriter($entry.Open())
    try { $writer.Write(($manifest -join "`n")) }
    finally { $writer.Dispose() }
  }
  finally {
    $zip.Dispose()
  }
}

# ---- Main ----
$repoRoot = Get-RepoRoot

if (-not $OutFile -or $OutFile.Trim().Length -eq 0) {
  $OutFile = New-DefaultOutFile -repoRoot $repoRoot
} elseif (-not ([System.IO.Path]::IsPathRooted($OutFile))) {
  $OutFile = Join-Path $repoRoot $OutFile
}

$files = Get-FileList -repoRoot $repoRoot -includeUntracked:$IncludeUntracked -excludePatterns $ExcludePatterns
if (-not $files -or $files.Count -eq 0) {
  throw "No files selected for ZIP. Check git status and exclusion patterns."
}

Write-Zip -repoRoot $repoRoot -relativeFiles $files -outFile $OutFile

Write-Host "Created ZIP: $OutFile"
Write-Host "Files included: $($files.Count)"
if ($IncludeUntracked) {
  Write-Host "Included untracked files: YES"
} else {
  Write-Host "Included untracked files: NO"
}

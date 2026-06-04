[CmdletBinding()]
param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'SkillCascade\ReportGeneratorHelper'),
  [int]$Port = 4181,
  [switch]$InstallStartup,
  [switch]$SkipSmoke,
  [switch]$PreviewOnly
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageRoot = Resolve-Path (Join-Path $ScriptDir '..')
$AppSource = Join-Path $PackageRoot 'app'
$RuntimeSource = Join-Path $PackageRoot 'runtime'
$ScriptsSource = Join-Path $PackageRoot 'scripts'

if (-not (Test-Path -LiteralPath (Join-Path $AppSource 'src\server.js'))) {
  throw "Packaged app source not found: $AppSource"
}

function Get-PortOwnerDescription {
  param([int]$PortToCheck)

  try {
    $connection = Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($connection) {
      $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
      if ($process) {
        return "$($process.ProcessName) (PID $($connection.OwningProcess))"
      }
      return "PID $($connection.OwningProcess)"
    }
  } catch {
    return 'another local process'
  }

  return 'another local process'
}

function Assert-LoopbackPortAvailable {
  param([int]$PortToCheck)

  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $PortToCheck)
    $listener.Start()
  } catch {
    $owner = Get-PortOwnerDescription -PortToCheck $PortToCheck
    throw "Port $PortToCheck is already in use by $owner. SkillCascade will not take over a port that another local app is using. Close that app, restart the computer, or rerun setup with a different port and update Advanced setup on the Report Generator page."
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Copy-PackageFolder {
  param(
    [string]$Source,
    [string]$Destination
  )

  if ($PreviewOnly) {
    Write-Host "Would copy $Source -> $Destination"
    return
  }

  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Copy-Item -Path (Join-Path $Source '*') -Destination $Destination -Recurse -Force
}

Write-Host "Installing SkillCascade Report Generator Helper to: $InstallDir"
Write-Host 'Saved customer template profiles remain in the user data folder and are not removed by updates.'
Assert-LoopbackPortAvailable -PortToCheck $Port

Copy-PackageFolder -Source $AppSource -Destination (Join-Path $InstallDir 'app')
Copy-PackageFolder -Source $RuntimeSource -Destination (Join-Path $InstallDir 'runtime')
Copy-PackageFolder -Source $ScriptsSource -Destination (Join-Path $InstallDir 'scripts')

$StartScript = Join-Path $InstallDir 'scripts\start-report-helper.ps1'
$StartupScript = Join-Path $InstallDir 'scripts\install-startup-wrapper.ps1'

if ($PreviewOnly) {
  Write-Host "Would run smoke check with: $StartScript -Smoke -NoInstall"
  if ($InstallStartup) {
    Write-Host "Would install startup wrapper with: $StartupScript -Port $Port"
  }
  exit 0
}

if (-not $SkipSmoke) {
  Write-Host 'Running packaged helper smoke check...'
  & $StartScript -Smoke -NoInstall
  if ($LASTEXITCODE -ne 0) {
    throw "Packaged helper smoke check failed with exit code $LASTEXITCODE"
  }
}

if ($InstallStartup) {
  Write-Host 'Installing current-user startup wrapper...'
  & $StartupScript -Port $Port
  if ($LASTEXITCODE -ne 0) {
    throw "Startup wrapper install failed with exit code $LASTEXITCODE"
  }
}

Write-Host 'SkillCascade Report Generator Helper installed.'
Write-Host "Start it with: powershell -NoProfile -ExecutionPolicy Bypass -File ""$StartScript"" -Port $Port -NoInstall"

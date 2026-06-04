[CmdletBinding()]
param(
  [int]$Port = 4181,
  [switch]$InstallDependencies,
  [switch]$NoInstall,
  [switch]$Smoke
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HelperRoot = Resolve-Path (Join-Path $ScriptDir '..')
$AppRootCandidates = @(
  (Join-Path $HelperRoot 'app'),
  $HelperRoot
)
$AppRoot = $AppRootCandidates | Where-Object {
  (Test-Path -LiteralPath (Join-Path $_ 'package.json')) -and
  (Test-Path -LiteralPath (Join-Path $_ 'src\server.js'))
} | Select-Object -First 1

if (-not $AppRoot) {
  throw "Could not find Report Generator helper app under: $HelperRoot"
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
    throw "Port $PortToCheck is already in use by $owner. SkillCascade will not take over a port that another local app is using. Close that app, restart the computer, or start this helper with a different port and update Advanced setup on the Report Generator page."
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

$NodeModules = Join-Path $AppRoot 'node_modules'
$BundledNode = Join-Path $HelperRoot 'runtime\node.exe'
$NodeCommand = if (Test-Path -LiteralPath $BundledNode) {
  $BundledNode
} else {
  $foundNode = Get-Command node -ErrorAction SilentlyContinue
  if (-not $foundNode) {
    throw 'node.exe was not found. Install Node.js LTS or use the packaged SkillCascade helper bundle.'
  }
  $foundNode.Source
}
$NpmCommand = Get-Command npm -ErrorAction SilentlyContinue

Push-Location $AppRoot
try {
  if ($InstallDependencies -or ((-not $NoInstall) -and (-not (Test-Path -LiteralPath $NodeModules)))) {
    if (-not $NpmCommand) {
      throw 'npm was not found and helper dependencies are not installed. Reinstall from the packaged helper bundle.'
    }
    Write-Host 'Installing Report Generator helper dependencies...'
    npm install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE"
    }
  }

  if ($Smoke) {
    if (Test-Path -LiteralPath $BundledNode) {
      & $NodeCommand (Join-Path $AppRoot 'test\smoke.mjs')
    } elseif ($NpmCommand) {
      npm run smoke
    } else {
      & $NodeCommand (Join-Path $AppRoot 'test\smoke.mjs')
    }
    exit $LASTEXITCODE
  }

  Assert-LoopbackPortAvailable -PortToCheck $Port
  $env:PORT = [string]$Port
  Write-Host "Starting SkillCascade Report Generator helper at http://127.0.0.1:$Port"
  & $NodeCommand (Join-Path $AppRoot 'src\server.js')
  exit $LASTEXITCODE
} finally {
  Pop-Location
}

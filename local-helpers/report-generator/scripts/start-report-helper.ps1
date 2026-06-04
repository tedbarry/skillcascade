[CmdletBinding()]
param(
  [int]$Port = 0,
  [switch]$InstallDependencies,
  [switch]$NoInstall,
  [switch]$Smoke
)

$ErrorActionPreference = 'Stop'
$DefaultPort = 4181
$DiscoveryPortEnd = 4199

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

function Get-HelperConfigPath {
  param([string]$Root)
  Join-Path $Root 'helper-config.json'
}

function Read-ConfiguredHelperPort {
  param([string]$ConfigPath)

  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    return $null
  }

  try {
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    $configuredPort = [int]$config.port
    if ($configuredPort -gt 0) {
      return $configuredPort
    }
  } catch {
    Write-Host "Ignoring unreadable helper port config: $ConfigPath"
  }

  return $null
}

function Save-ConfiguredHelperPort {
  param(
    [string]$ConfigPath,
    [int]$SelectedPort,
    [int]$PreferredPort
  )

  $configDir = Split-Path -Parent $ConfigPath
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  Set-Content -LiteralPath $ConfigPath -Encoding ASCII -Value (@{
    port = $SelectedPort
    preferredPort = $PreferredPort
    host = '127.0.0.1'
    helperUrl = "http://127.0.0.1:$SelectedPort"
    portDiscoveryStart = $DefaultPort
    portDiscoveryEnd = $DiscoveryPortEnd
    updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json -Depth 3)
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

function Test-LoopbackPortAvailable {
  param([int]$PortToCheck)

  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $PortToCheck)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Find-AvailableLoopbackPort {
  param(
    [int]$PreferredPort,
    [int]$PortRangeStart,
    [int]$PortRangeEnd
  )

  $candidates = New-Object System.Collections.Generic.List[int]
  if ($PreferredPort -gt 0) {
    $candidates.Add($PreferredPort)
  }
  for ($candidate = $PortRangeStart; $candidate -le $PortRangeEnd; $candidate += 1) {
    if (-not $candidates.Contains($candidate)) {
      $candidates.Add($candidate)
    }
  }

  foreach ($candidate in $candidates) {
    if (Test-LoopbackPortAvailable -PortToCheck $candidate) {
      return $candidate
    }
  }

  $owner = if ($PreferredPort -gt 0) { Get-PortOwnerDescription -PortToCheck $PreferredPort } else { 'another local process' }
  throw "No safe local helper port is available. SkillCascade checked $PortRangeStart-$PortRangeEnd without taking over any existing local app. Preferred port $PreferredPort is being used by $owner. Close an unused local app or contact support."
}

function Get-ReportHelperStatus {
  param([int]$PortToCheck)

  $client = $null
  try {
    Add-Type -AssemblyName System.Net.Http -ErrorAction Stop
    $client = New-Object System.Net.Http.HttpClient
    $client.Timeout = [TimeSpan]::FromMilliseconds(500)
    $response = $client.GetAsync("http://127.0.0.1:$PortToCheck/api/local-report-generator/status").GetAwaiter().GetResult()
    if (-not $response.IsSuccessStatusCode) {
      return $null
    }

    $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return $body | ConvertFrom-Json
  } catch {
    return $null
  } finally {
    if ($client) {
      $client.Dispose()
    }
  }
}

function Find-RunningSkillCascadeHelper {
  param(
    [int]$PortRangeStart,
    [int]$PortRangeEnd
  )

  for ($candidate = $PortRangeStart; $candidate -le $PortRangeEnd; $candidate += 1) {
    if (Test-LoopbackPortAvailable -PortToCheck $candidate) {
      continue
    }

    $status = Get-ReportHelperStatus -PortToCheck $candidate
    if (($status.ok -eq $true) -and ($status.mode -eq 'skillcascade-report-generator-release-v1')) {
      return [pscustomobject]@{
        Port = $candidate
        HelperUrl = if ($status.helperUrl) { $status.helperUrl } else { "http://127.0.0.1:$candidate" }
      }
    }
  }

  return $null
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

  $ConfigPath = Get-HelperConfigPath -Root $HelperRoot
  $ConfiguredPort = Read-ConfiguredHelperPort -ConfigPath $ConfigPath
  $PreferredPort = if ($Port -gt 0) {
    $Port
  } elseif ($ConfiguredPort) {
    $ConfiguredPort
  } else {
    $DefaultPort
  }
  $RunningHelper = Find-RunningSkillCascadeHelper -PortRangeStart $DefaultPort -PortRangeEnd $DiscoveryPortEnd
  if ($RunningHelper) {
    Save-ConfiguredHelperPort -ConfigPath $ConfigPath -SelectedPort $RunningHelper.Port -PreferredPort $PreferredPort
    Write-Host "SkillCascade Report Generator helper is already running at $($RunningHelper.HelperUrl)"
    exit 0
  }

  $SelectedPort = Find-AvailableLoopbackPort -PreferredPort $PreferredPort -PortRangeStart $DefaultPort -PortRangeEnd $DiscoveryPortEnd
  if ($SelectedPort -ne $PreferredPort) {
    Write-Host "Preferred helper port $PreferredPort is busy. Using safe local port $SelectedPort instead."
  }
  Save-ConfiguredHelperPort -ConfigPath $ConfigPath -SelectedPort $SelectedPort -PreferredPort $PreferredPort
  $env:PORT = [string]$SelectedPort
  Write-Host "Starting SkillCascade Report Generator helper at http://127.0.0.1:$SelectedPort"
  & $NodeCommand (Join-Path $AppRoot 'src\server.js')
  exit $LASTEXITCODE
} finally {
  Pop-Location
}

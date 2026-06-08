[CmdletBinding()]
param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'SkillCascade\ReportGeneratorHelper'),
  [int]$Port = 0,
  [switch]$InstallStartup,
  [switch]$SkipSmoke,
  [switch]$NoStart,
  [switch]$PreviewOnly
)

$ErrorActionPreference = 'Stop'
$DefaultPort = 4181
$DiscoveryPortEnd = 4199

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageRoot = Resolve-Path (Join-Path $ScriptDir '..')
$AppSource = Join-Path $PackageRoot 'app'
$RuntimeSource = Join-Path $PackageRoot 'runtime'
$ScriptsSource = Join-Path $PackageRoot 'scripts'

if (-not (Test-Path -LiteralPath (Join-Path $AppSource 'src\server.js'))) {
  throw "Packaged app source not found: $AppSource"
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

function Get-InstalledHelperRuntimeProcesses {
  param([string]$Root)

  if (-not (Test-Path -LiteralPath $Root)) {
    return @()
  }

  $rootNeedle = ([System.IO.Path]::GetFullPath($Root)).ToLowerInvariant()
  @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    if ([string]::IsNullOrWhiteSpace($_.CommandLine)) {
      return $false
    }

    $commandLine = $_.CommandLine.ToLowerInvariant()
    $isInstalledHelper = $commandLine.Contains($rootNeedle)
    $isHelperProcess = (
      $commandLine.Contains('watch-report-helper.ps1') -or
      $commandLine.Contains('src\server.js') -or
      $commandLine.Contains('runtime\node.exe')
    )

    $isInstalledHelper -and $isHelperProcess
  })
}

function Stop-InstalledHelperProcesses {
  param([string]$Root)

  $processes = @(Get-InstalledHelperRuntimeProcesses -Root $Root)
  if ($processes.Count -eq 0) {
    return
  }

  Write-Host 'Stopping existing helper/watchdog processes before update...'
  $orderedProcesses = $processes | Sort-Object @{
    Expression = {
      if ($_.CommandLine.ToLowerInvariant().Contains('watch-report-helper.ps1')) { 0 } else { 1 }
    }
  }, ProcessId

  foreach ($processInfo in $orderedProcesses) {
    if ($processInfo.ProcessId -eq $PID) {
      continue
    }

    try {
      Write-Host "Stopping PID $($processInfo.ProcessId)"
      Stop-Process -Id $processInfo.ProcessId -Force -ErrorAction Stop
    } catch {
      Write-Host "Could not stop PID $($processInfo.ProcessId): $($_.Exception.Message)"
    }
  }

  for ($attempt = 1; $attempt -le 30; $attempt += 1) {
    Start-Sleep -Milliseconds 250
    $remaining = @(Get-InstalledHelperRuntimeProcesses -Root $Root | Where-Object { $_.ProcessId -ne $PID })
    if ($remaining.Count -eq 0) {
      return
    }
  }

  throw "Existing SkillCascade helper processes did not stop cleanly. Close the helper and run setup again."
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

function Start-InstalledHelperWatchdog {
  param(
    [string]$WatchScript,
    [int]$SelectedPort,
    [string]$Root
  )

  $logDir = Join-Path $Root 'logs'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $outLog = Join-Path $logDir 'watcher.out.log'
  $errLog = Join-Path $logDir 'watcher.err.log'

  Write-Host "Starting helper watchdog at http://127.0.0.1:$SelectedPort"
  Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $WatchScript, '-Port', [string]$SelectedPort) `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog | Out-Null

  for ($attempt = 1; $attempt -le 20; $attempt += 1) {
    Start-Sleep -Milliseconds 500
    $status = Get-ReportHelperStatus -PortToCheck $SelectedPort
    if (($status.ok -eq $true) -and ($status.mode -eq 'skillcascade-report-generator-release-v1')) {
      Write-Host "Helper is running at http://127.0.0.1:$SelectedPort"
      return
    }
  }

  throw "The helper watchdog started, but the helper did not become reachable at http://127.0.0.1:$SelectedPort. Check logs in $logDir."
}

Write-Host "Installing SkillCascade Report Generator Helper to: $InstallDir"
Write-Host 'Local helper identity and settings remain in the user data folder and are not removed by updates.'
$ConfigPath = Get-HelperConfigPath -Root $InstallDir
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
  $SelectedPort = $RunningHelper.Port
  Write-Host "Existing SkillCascade helper detected at $($RunningHelper.HelperUrl). Setup will keep using that safe local address."
} else {
  $SelectedPort = Find-AvailableLoopbackPort -PreferredPort $PreferredPort -PortRangeStart $DefaultPort -PortRangeEnd $DiscoveryPortEnd
}
if ((-not $RunningHelper) -and ($SelectedPort -ne $PreferredPort)) {
  Write-Host "Preferred helper port $PreferredPort is busy. Setup will use safe local port $SelectedPort instead."
}

if (-not $PreviewOnly) {
  Stop-InstalledHelperProcesses -Root $InstallDir
}

Copy-PackageFolder -Source $AppSource -Destination (Join-Path $InstallDir 'app')
Copy-PackageFolder -Source $RuntimeSource -Destination (Join-Path $InstallDir 'runtime')
Copy-PackageFolder -Source $ScriptsSource -Destination (Join-Path $InstallDir 'scripts')

$StartScript = Join-Path $InstallDir 'scripts\start-report-helper.ps1'
$StartupScript = Join-Path $InstallDir 'scripts\install-startup-wrapper.ps1'
$WatchScript = Join-Path $InstallDir 'scripts\watch-report-helper.ps1'

if ($PreviewOnly) {
  Write-Host "Would run smoke check with: $StartScript -Smoke -NoInstall"
  if ($InstallStartup) {
    Write-Host "Would install startup wrapper with: $StartupScript -Port $SelectedPort"
  }
  if (-not $NoStart) {
    Write-Host "Would start helper watchdog with: $WatchScript -Port $SelectedPort"
  }
  Write-Host "Would save helper address: http://127.0.0.1:$SelectedPort"
  exit 0
}

Save-ConfiguredHelperPort -ConfigPath $ConfigPath -SelectedPort $SelectedPort -PreferredPort $PreferredPort

if (-not $SkipSmoke) {
  Write-Host 'Running packaged helper smoke check...'
  & $StartScript -Smoke -NoInstall
  if ($LASTEXITCODE -ne 0) {
    throw "Packaged helper smoke check failed with exit code $LASTEXITCODE"
  }
}

if ($InstallStartup) {
  Write-Host 'Installing current-user startup wrapper...'
  & $StartupScript -Port $SelectedPort
  if ($LASTEXITCODE -ne 0) {
    throw "Startup wrapper install failed with exit code $LASTEXITCODE"
  }
}

if (-not $NoStart) {
  Start-InstalledHelperWatchdog -WatchScript $WatchScript -SelectedPort $SelectedPort -Root $InstallDir
}

Write-Host 'SkillCascade Report Generator Helper installed.'
Write-Host "Helper address: http://127.0.0.1:$SelectedPort"
Write-Host "Start it with: powershell -NoProfile -ExecutionPolicy Bypass -File ""$WatchScript"" -Port $SelectedPort"

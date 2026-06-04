[CmdletBinding()]
param(
  [int]$Port = 0,
  [switch]$PreviewOnly,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$DefaultPort = 4181
$DiscoveryPortEnd = 4199

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HelperRoot = Resolve-Path (Join-Path $ScriptDir '..')
$StartScript = Join-Path $ScriptDir 'start-report-helper.ps1'
$StartupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)
$ShortcutPath = Join-Path $StartupDir 'SkillCascade Report Generator Helper.vbs'

if (-not (Test-Path -LiteralPath $StartScript)) {
  throw "Start script not found: $StartScript"
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

function Find-RunningSkillCascadeHelper {
  param(
    [int]$PortRangeStart,
    [int]$PortRangeEnd
  )

  for ($candidate = $PortRangeStart; $candidate -le $PortRangeEnd; $candidate += 1) {
    try {
      $status = Invoke-RestMethod -Uri "http://127.0.0.1:$candidate/api/local-report-generator/status" -Method Get -TimeoutSec 1 -ErrorAction Stop
      if (($status.ok -eq $true) -and ($status.mode -eq 'skillcascade-report-generator-release-v1')) {
        return [pscustomobject]@{
          Port = $candidate
          HelperUrl = if ($status.helperUrl) { $status.helperUrl } else { "http://127.0.0.1:$candidate" }
        }
      }
    } catch {}
  }

  return $null
}

function New-StartupScriptContent {
  param(
    [string]$PowerShellScript,
    [int]$HelperPort
  )

  $escapedScript = $PowerShellScript.Replace('"', '""')
  $command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""$escapedScript"" -Port $HelperPort"
  $escapedCommand = $command.Replace('"', '""')

  @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "$escapedCommand", 0, False
"@
}

if ($Uninstall) {
  if ($PreviewOnly) {
    Write-Host "Would remove startup wrapper: $ShortcutPath"
    exit 0
  }

  if (Test-Path -LiteralPath $ShortcutPath) {
    Remove-Item -LiteralPath $ShortcutPath -Force
    Write-Host "Removed startup wrapper: $ShortcutPath"
  } else {
    Write-Host "No startup wrapper found at: $ShortcutPath"
  }
  exit 0
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
  $SelectedPort = $RunningHelper.Port
  Write-Host "Existing SkillCascade helper detected at $($RunningHelper.HelperUrl). Startup will keep using that safe local address."
} else {
  $SelectedPort = Find-AvailableLoopbackPort -PreferredPort $PreferredPort -PortRangeStart $DefaultPort -PortRangeEnd $DiscoveryPortEnd
}
if ((-not $RunningHelper) -and ($SelectedPort -ne $PreferredPort)) {
  Write-Host "Preferred helper port $PreferredPort is busy. Startup will use safe local port $SelectedPort instead."
}

$content = New-StartupScriptContent -PowerShellScript $StartScript -HelperPort $SelectedPort

if ($PreviewOnly) {
  Write-Host "Would create startup wrapper: $ShortcutPath"
  Write-Host '--- wrapper content ---'
  Write-Host $content
  exit 0
}

Write-Host 'Preparing helper dependencies and smoke test before installing startup wrapper...'
& $StartScript -InstallDependencies -Smoke
if ($LASTEXITCODE -ne 0) {
  throw "Helper smoke test failed with exit code $LASTEXITCODE"
}

Save-ConfiguredHelperPort -ConfigPath $ConfigPath -SelectedPort $SelectedPort -PreferredPort $PreferredPort
New-Item -ItemType Directory -Force -Path $StartupDir | Out-Null
Set-Content -LiteralPath $ShortcutPath -Value $content -Encoding ASCII
Write-Host "Installed startup wrapper: $ShortcutPath"
Write-Host "The helper will start on Windows login at http://127.0.0.1:$SelectedPort"

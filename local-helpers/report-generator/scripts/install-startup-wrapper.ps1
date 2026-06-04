[CmdletBinding()]
param(
  [int]$Port = 4181,
  [switch]$PreviewOnly,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartScript = Join-Path $ScriptDir 'start-report-helper.ps1'
$StartupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)
$ShortcutPath = Join-Path $StartupDir 'SkillCascade Report Generator Helper.vbs'

if (-not (Test-Path -LiteralPath $StartScript)) {
  throw "Start script not found: $StartScript"
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
    throw "Port $PortToCheck is already in use by $owner. The startup launcher was not installed because SkillCascade will not take over a port that another local app is using. Close that app, restart the computer, or rerun setup with a different port and update Advanced setup on the Report Generator page."
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
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

$content = New-StartupScriptContent -PowerShellScript $StartScript -HelperPort $Port

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

Assert-LoopbackPortAvailable -PortToCheck $Port
New-Item -ItemType Directory -Force -Path $StartupDir | Out-Null
Set-Content -LiteralPath $ShortcutPath -Value $content -Encoding ASCII
Write-Host "Installed startup wrapper: $ShortcutPath"
Write-Host "The helper will start on Windows login at http://127.0.0.1:$Port"

[CmdletBinding()]
param(
  [int]$Port = 0,
  [int]$RestartDelaySeconds = 5
)

$ErrorActionPreference = 'Continue'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HelperRoot = Resolve-Path (Join-Path $ScriptDir '..')
$StartScript = Join-Path $ScriptDir 'start-report-helper.ps1'
$LogDir = Join-Path $HelperRoot 'logs'
$WatchLog = Join-Path $LogDir 'watcher.log'
$DefaultPort = 4181
$WatchPort = if ($Port -gt 0) { $Port } else { $DefaultPort }

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-WatchLog {
  param([string]$Message)
  $timestamp = (Get-Date).ToUniversalTime().ToString('o')
  Add-Content -LiteralPath $WatchLog -Encoding ASCII -Value "[$timestamp] $Message"
}

if (-not (Test-Path -LiteralPath $StartScript)) {
  Write-WatchLog "Start script not found: $StartScript"
  exit 2
}

$createdMutex = $false
$mutexName = "Local\SkillCascadeReportGeneratorHelperWatchdog_$WatchPort"
$mutex = [System.Threading.Mutex]::new($true, $mutexName, [ref]$createdMutex)
if (-not $createdMutex) {
  Write-WatchLog "Watchdog already running for port $WatchPort. Exiting duplicate watchdog."
  exit 0
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

Write-WatchLog "Starting watchdog for SkillCascade Report Generator helper on preferred port $WatchPort."

try {
  while ($true) {
    try {
      $status = Get-ReportHelperStatus -PortToCheck $WatchPort
      if (($status.ok -eq $true) -and ($status.mode -eq 'skillcascade-report-generator-release-v1')) {
        Start-Sleep -Seconds 15
        continue
      }

      $startParams = @{
        NoInstall = $true
      }
      if ($Port -gt 0) {
        $startParams.Port = $Port
      }

      Write-WatchLog "Launching helper on preferred port $WatchPort."
      & $StartScript @startParams
      $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
      Write-WatchLog "Helper exited with code $exitCode. Restarting in $RestartDelaySeconds seconds."
    } catch {
      Write-WatchLog "Helper launch failed: $($_.Exception.Message). Restarting in $RestartDelaySeconds seconds."
    }

    Start-Sleep -Seconds $RestartDelaySeconds
  }
} finally {
  if ($mutex) {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
  }
}

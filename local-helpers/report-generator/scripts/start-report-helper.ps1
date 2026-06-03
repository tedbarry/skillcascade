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
$NodeModules = Join-Path $HelperRoot 'node_modules'

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm was not found. Install Node.js LTS before running the SkillCascade Report Generator helper.'
}

Push-Location $HelperRoot
try {
  if ($InstallDependencies -or ((-not $NoInstall) -and (-not (Test-Path -LiteralPath $NodeModules)))) {
    Write-Host 'Installing Report Generator helper dependencies...'
    npm install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE"
    }
  }

  if ($Smoke) {
    npm run smoke
    exit $LASTEXITCODE
  }

  $env:PORT = [string]$Port
  Write-Host "Starting SkillCascade Report Generator helper at http://127.0.0.1:$Port"
  npm start
  exit $LASTEXITCODE
} finally {
  Pop-Location
}


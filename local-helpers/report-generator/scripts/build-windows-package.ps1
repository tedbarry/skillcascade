[CmdletBinding()]
param(
  [string]$Version = (Get-Date -Format 'yyyy.MM.dd.HHmm'),
  [string]$OutputDir = (Join-Path (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..')) 'dist'),
  [switch]$ReuseInstalledDependencies,
  [switch]$CreateInstallerExe
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HelperRoot = Resolve-Path (Join-Path $ScriptDir '..')
$PackageName = "SkillCascadeReportHelper-$Version"
$ResolvedOutputDir = New-Item -ItemType Directory -Force -Path $OutputDir
$PackageRoot = Join-Path $ResolvedOutputDir.FullName $PackageName
$ZipPath = Join-Path $ResolvedOutputDir.FullName "$PackageName.zip"
$InstallerExePath = Join-Path $ResolvedOutputDir.FullName "$PackageName-installer.exe"

function Assert-Inside {
  param(
    [string]$CandidatePath,
    [string]$ParentPath
  )

  $candidateFull = [System.IO.Path]::GetFullPath($CandidatePath)
  $parentFull = [System.IO.Path]::GetFullPath($ParentPath)
  if (-not $candidateFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to write outside output directory: $candidateFull"
  }
}

Assert-Inside -CandidatePath $PackageRoot -ParentPath $ResolvedOutputDir.FullName
if (Test-Path -LiteralPath $PackageRoot) {
  Remove-Item -LiteralPath $PackageRoot -Recurse -Force
}
if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}
if (Test-Path -LiteralPath $InstallerExePath) {
  Remove-Item -LiteralPath $InstallerExePath -Force
}

$AppDir = Join-Path $PackageRoot 'app'
$RuntimeDir = Join-Path $PackageRoot 'runtime'
$ScriptsDir = Join-Path $PackageRoot 'scripts'
New-Item -ItemType Directory -Force -Path $AppDir,$RuntimeDir,$ScriptsDir | Out-Null

$HelperPackageJson = Get-Content -Raw (Join-Path $HelperRoot 'package.json') | ConvertFrom-Json
$BuiltAt = (Get-Date).ToUniversalTime().ToString('o')

Copy-Item -LiteralPath (Join-Path $HelperRoot 'package.json') -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $HelperRoot 'package-lock.json') -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $HelperRoot 'README.md') -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $HelperRoot 'src') -Destination $AppDir -Recurse
Copy-Item -LiteralPath (Join-Path $HelperRoot 'test') -Destination $AppDir -Recurse
Copy-Item -LiteralPath (Join-Path $HelperRoot 'assets') -Destination $AppDir -Recurse

Set-Content -LiteralPath (Join-Path $AppDir 'helper-build-manifest.json') -Encoding ASCII -Value (@{
  packageName = $PackageName
  packageVersion = $Version
  helperVersion = $HelperPackageJson.version
  builtAt = $BuiltAt
  localOnly = $true
  bundledNodeRuntime = $true
  installerLauncher = 'Install-ReportGeneratorHelper.exe'
  appInstallDir = '%LOCALAPPDATA%\SkillCascade\ReportGeneratorHelper'
  customerDataDir = '%USERPROFILE%\.skillcascade\report-generator-helper'
  updatesPreserveCustomerData = $true
  defaultLocalHelperUrl = 'http://127.0.0.1:4181'
  portDiscoveryStart = 4181
  portDiscoveryEnd = 4199
  portCollisionPolicy = 'choose-next-available-loopback-port-without-taking-over-existing-local-port'
} | ConvertTo-Json -Depth 3)

foreach ($scriptName in @('start-report-helper.ps1', 'watch-report-helper.ps1', 'install-startup-wrapper.ps1', 'install-packaged-helper.ps1')) {
  Copy-Item -LiteralPath (Join-Path $ScriptDir $scriptName) -Destination $ScriptsDir
}

$NodePath = (Get-Command node.exe -ErrorAction Stop).Source
Copy-Item -LiteralPath $NodePath -Destination (Join-Path $RuntimeDir 'node.exe')

if ($ReuseInstalledDependencies) {
  $SourceNodeModules = Join-Path $HelperRoot 'node_modules'
  if (-not (Test-Path -LiteralPath $SourceNodeModules)) {
    throw "Cannot reuse dependencies because node_modules was not found: $SourceNodeModules"
  }
  Copy-Item -LiteralPath $SourceNodeModules -Destination $AppDir -Recurse
} else {
  $Npm = Get-Command npm -ErrorAction Stop
  Push-Location $AppDir
  try {
    & $Npm.Source ci --omit=dev
    if ($LASTEXITCODE -ne 0) {
      throw "npm ci failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

Set-Content -LiteralPath (Join-Path $PackageRoot 'Install-ReportGeneratorHelper.cmd') -Encoding ASCII -Value @'
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-packaged-helper.ps1" -InstallStartup %*
pause
'@

Set-Content -LiteralPath (Join-Path $PackageRoot 'Start-ReportGeneratorHelper.cmd') -Encoding ASCII -Value @'
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\watch-report-helper.ps1" %*
'@

$LauncherSource = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

public static class SkillCascadeReportGeneratorInstaller
{
  private static string Quote(string value)
  {
    return "\"" + value.Replace("\"", "\\\"") + "\"";
  }

  public static int Main(string[] args)
  {
    string root = AppDomain.CurrentDomain.BaseDirectory;
    string script = Path.Combine(root, "scripts", "install-packaged-helper.ps1");
    if (!File.Exists(script))
    {
      Console.Error.WriteLine("Installer script not found: " + script);
      return 2;
    }

    var commandArgs = new List<string>
    {
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      Quote(script),
      "-InstallStartup"
    };

    foreach (string arg in args)
    {
      commandArgs.Add(Quote(arg));
    }

    var process = new Process();
    process.StartInfo.FileName = "powershell.exe";
    process.StartInfo.Arguments = string.Join(" ", commandArgs);
    process.StartInfo.UseShellExecute = false;
    process.StartInfo.CreateNoWindow = false;
    process.Start();
    process.WaitForExit();
    return process.ExitCode;
  }
}
'@

$LauncherExe = Join-Path $PackageRoot 'Install-ReportGeneratorHelper.exe'
Add-Type -TypeDefinition $LauncherSource -OutputAssembly $LauncherExe -OutputType ConsoleApplication -ReferencedAssemblies 'System.dll'
if (-not (Test-Path -LiteralPath $LauncherExe)) {
  throw "Installer launcher EXE was not created: $LauncherExe"
}

Compress-Archive -LiteralPath $PackageRoot -DestinationPath $ZipPath -Force

if ($CreateInstallerExe) {
  $IExpress = Get-Command iexpress.exe -ErrorAction Stop
  $IExpressDir = Join-Path $ResolvedOutputDir.FullName "$PackageName-iexpress"
  if (Test-Path -LiteralPath $IExpressDir) {
    Remove-Item -LiteralPath $IExpressDir -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $IExpressDir | Out-Null
  Copy-Item -LiteralPath $ZipPath -Destination (Join-Path $IExpressDir 'payload.zip')
  Set-Content -LiteralPath (Join-Path $IExpressDir 'install-from-iexpress.cmd') -Encoding ASCII -Value @'
@echo off
setlocal
set "PAYLOAD=%~dp0payload.zip"
set "TARGET=%TEMP%\SkillCascadeReportHelperInstaller"
if exist "%TARGET%" rmdir /s /q "%TARGET%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%PAYLOAD%' -DestinationPath '%TARGET%' -Force"
for /d %%D in ("%TARGET%\SkillCascadeReportHelper-*") do set "PACKAGE=%%~fD"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE%\scripts\install-packaged-helper.ps1" -InstallStartup
endlocal
'@

  $SedPath = Join-Path $IExpressDir 'installer.sed'
  Set-Content -LiteralPath $SedPath -Encoding ASCII -Value @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$IExpressDir
[SourceFiles0]
%FILE0%=
%FILE1%=
[Strings]
InstallPrompt=""
DisplayLicense=""
FinishMessage="SkillCascade Report Generator Helper installed."
TargetName="$InstallerExePath"
FriendlyName="SkillCascade Report Generator Helper"
AppLaunched="install-from-iexpress.cmd"
PostInstallCmd="<None>"
AdminQuietInstCmd="install-from-iexpress.cmd"
UserQuietInstCmd="install-from-iexpress.cmd"
FILE0="payload.zip"
FILE1="install-from-iexpress.cmd"
"@

  & $IExpress.Source /N /Q $SedPath
  if ($LASTEXITCODE -ne 0) {
    throw "IExpress failed with exit code $LASTEXITCODE"
  }
  if (-not (Test-Path -LiteralPath $InstallerExePath)) {
    throw "IExpress did not create the expected installer: $InstallerExePath"
  }
}

[pscustomobject]@{
  ok = $true
  packageRoot = $PackageRoot
  zipPath = $ZipPath
  launcherExePath = $LauncherExe
  buildManifestPath = Join-Path $AppDir 'helper-build-manifest.json'
  installerExePath = if ($CreateInstallerExe) { $InstallerExePath } else { '' }
  dataPreservedAt = Join-Path $env:USERPROFILE '.skillcascade\report-generator-helper'
} | ConvertTo-Json -Depth 3

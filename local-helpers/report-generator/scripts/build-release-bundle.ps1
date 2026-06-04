param(
  [string]$Version = "release-$(Get-Date -Format 'yyyyMMdd-HHmm')",
  [string]$OutputDir = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\dist'),
  [switch]$ReuseInstalledDependencies,
  [switch]$NoSmoke,
  [switch]$KeepPackageBuild
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResolvedOutputDir = New-Item -ItemType Directory -Force -Path $OutputDir
$BundleName = "SkillCascadeReportGeneratorRelease-$Version"
$BundleRoot = Join-Path $ResolvedOutputDir.FullName $BundleName
$PackageBuilder = Join-Path $ScriptDir 'build-windows-package.ps1'
$PackageBuildDir = Join-Path ([System.IO.Path]::GetTempPath()) ("scrg-pkg-" + [System.Guid]::NewGuid().ToString('N').Substring(0, 8))

function Assert-Inside {
  param([string]$CandidatePath, [string]$ParentPath)
  $candidate = [System.IO.Path]::GetFullPath($CandidatePath)
  $parent = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd('\') + '\'
  if (-not $candidate.StartsWith($parent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside output directory: $candidate"
  }
}

Assert-Inside -CandidatePath $BundleRoot -ParentPath $ResolvedOutputDir.FullName
if (Test-Path -LiteralPath $BundleRoot) {
  Remove-Item -LiteralPath $BundleRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $BundleRoot,$PackageBuildDir | Out-Null

try {
  $builderArgs = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $PackageBuilder,
    '-Version', $Version,
    '-OutputDir', $PackageBuildDir
  )
  if ($ReuseInstalledDependencies) {
    $builderArgs += '-ReuseInstalledDependencies'
  }

  & powershell @builderArgs | Tee-Object -Variable packageBuildOutput | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Package builder failed with exit code $LASTEXITCODE"
  }

  $packageRoot = Join-Path $PackageBuildDir "SkillCascadeReportHelper-$Version"
  $helperZip = Join-Path $PackageBuildDir "SkillCascadeReportHelper-$Version.zip"
  if (-not (Test-Path -LiteralPath $helperZip)) {
    throw "Expected helper zip was not created: $helperZip"
  }

  if (-not $NoSmoke) {
    $smokeScript = Join-Path $packageRoot 'scripts\start-report-helper.ps1'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $smokeScript -Smoke -NoInstall | Tee-Object -Variable smokeOutput | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Packaged helper smoke failed with exit code $LASTEXITCODE"
    }
  }

  $bundleHelperZip = Join-Path $BundleRoot (Split-Path -Leaf $helperZip)
  Copy-Item -LiteralPath $helperZip -Destination $bundleHelperZip

  $hash = Get-FileHash -LiteralPath $bundleHelperZip -Algorithm SHA256
  Set-Content -LiteralPath (Join-Path $BundleRoot 'checksums.sha256.txt') -Encoding ASCII -Value "$($hash.Hash)  $($hash.Path | Split-Path -Leaf)"

  $manifest = [ordered]@{
    bundleName = $BundleName
    version = $Version
    builtAt = (Get-Date).ToUniversalTime().ToString('o')
    releaseChannel = 'controlled-release'
    localOnly = $true
    helperZip = (Split-Path -Leaf $bundleHelperZip)
    helperZipSha256 = $hash.Hash
    smokeRun = (-not $NoSmoke)
    skillCascadeRoute = 'https://www.skillcascade.com/report-generator'
    localHelperDefaultUrl = 'http://127.0.0.1:4181'
    localHelperDiscoveryPorts = '4181-4199'
    portCollisionPolicy = 'The helper tries 4181 first, then chooses the next available loopback port in 4181-4199 without taking over a port already used by another local app. The SkillCascade page auto-detects the selected helper port.'
    helperApiPrefix = '/api/local-report-generator'
    legacyHelperApiPrefix = '/api/local-report-pilot'
    phiBoundary = 'Source folders, templates, generated drafts, review JSON, and evidence ledgers stay on the buyer workstation.'
    reviewGates = @(
      'BCBA review required before use.',
      'No automatic signing.',
      'No automatic submission.',
      'No external platform write.'
    )
  }
  Set-Content -LiteralPath (Join-Path $BundleRoot 'release-manifest.json') -Encoding ASCII -Value ($manifest | ConvertTo-Json -Depth 4)

  $readme = @"
SkillCascade Report Generator Release Bundle
Version: $Version

What this is:
- A controlled-release local helper package for the SkillCascade Report Generator workflow pack.
- The helper reads local source folders and Word templates on the buyer workstation.
- SkillCascade coordinates access, setup, helper readiness, template profiling, preflight, and draft generation.

What this is not:
- It is not an automatic signer.
- It is not an automatic payer/CentralReach/Passage/Word Online writer.
- It is not a cloud PHI uploader.

Buyer setup:
1. Sign in to SkillCascade and open:
   https://www.skillcascade.com/report-generator

2. Extract the helper zip included in this folder:
   $(Split-Path -Leaf $bundleHelperZip)

3. In the extracted helper folder, run:
   Install-ReportGeneratorHelper.exe

4. Back in SkillCascade, click:
   Check helper
   Claim local install
   Profile Word template
   Review aliases
   Run local preflight
   Generate local DOCX draft

Local files created by the helper:
- Editable report draft DOCX
- Review summary JSON
- Evidence ledger JSON
- Saved template profile JSON

Port safety:
- The helper tries http://127.0.0.1:4181 first.
- If another local app is already using that address, setup chooses the next available safe local address.
- SkillCascade finds the helper automatically when the buyer clicks Check setup.
- The helper never takes over a port already used by another local app.

Privacy boundary:
- Source folders, template paths, output folders, client names, document text, generated drafts, review JSON, and evidence ledgers stay local.
- The install claim sends only non-PHI helper readiness metadata such as install fingerprint and helper version.

Verification included:
- SHA256 checksum: checksums.sha256.txt
- Release manifest: release-manifest.json
"@
  Set-Content -LiteralPath (Join-Path $BundleRoot 'README-FIRST.txt') -Encoding ASCII -Value $readme

  [pscustomobject]@{
    ok = $true
    releaseChannel = 'controlled-release'
    bundleRoot = $BundleRoot
    helperZip = $bundleHelperZip
    checksumPath = Join-Path $BundleRoot 'checksums.sha256.txt'
    manifestPath = Join-Path $BundleRoot 'release-manifest.json'
    readmePath = Join-Path $BundleRoot 'README-FIRST.txt'
    smokeRun = (-not $NoSmoke)
    packageBuildDir = if ($KeepPackageBuild) { $PackageBuildDir } else { $null }
  } | ConvertTo-Json -Depth 4
} finally {
  if (-not $KeepPackageBuild -and (Test-Path -LiteralPath $PackageBuildDir)) {
    Remove-Item -LiteralPath $PackageBuildDir -Recurse -Force
  }
}

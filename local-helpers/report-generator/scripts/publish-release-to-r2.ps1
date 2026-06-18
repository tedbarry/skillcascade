param(
  [Parameter(Mandatory = $true)]
  [string]$BundleRoot,
  [string]$BucketName = 'skillcascade-private-artifacts',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $ScriptDir '..\..\..')).Path
$LocalWrangler = Join-Path $RepoRoot 'workers\api\node_modules\.bin\wrangler.cmd'

function Read-JsonFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required file was not found: $Path"
  }
  Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

function Assert-ZipEntry {
  param(
    [Parameter(Mandatory = $true)][string]$ZipPath,
    [Parameter(Mandatory = $true)][string]$Pattern
  )
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    $match = $zip.Entries | Where-Object { $_.FullName -match $Pattern } | Select-Object -First 1
    if (-not $match) {
      throw "Expected zip entry matching '$Pattern' was not found in $ZipPath"
    }
  } finally {
    $zip.Dispose()
  }
}

function Invoke-WranglerR2Put {
  param(
    [Parameter(Mandatory = $true)][string]$Bucket,
    [Parameter(Mandatory = $true)][string]$ObjectKey,
    [Parameter(Mandatory = $true)][string]$FilePath
  )

  $target = "$Bucket/$ObjectKey"
  if (Test-Path -LiteralPath $LocalWrangler) {
    & $LocalWrangler r2 object put $target --file $FilePath
  } else {
    & npx wrangler r2 object put $target --file $FilePath
  }
  if ($LASTEXITCODE -ne 0) {
    throw "wrangler r2 object put failed for $target"
  }
}

$resolvedBundleRoot = (Resolve-Path -LiteralPath $BundleRoot).Path
$latestManifestPath = Join-Path $resolvedBundleRoot 'latest-helper.json'
$releaseManifestPath = Join-Path $resolvedBundleRoot 'release-manifest.json'

$latest = Read-JsonFile -Path $latestManifestPath
$release = Read-JsonFile -Path $releaseManifestPath

$zipPath = Join-Path $resolvedBundleRoot $latest.filename
if (-not (Test-Path -LiteralPath $zipPath)) {
  throw "Helper zip listed by latest-helper.json was not found: $zipPath"
}

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
if ($hash.Hash -ne $latest.sha256) {
  throw "Helper zip SHA256 mismatch. Expected $($latest.sha256), got $($hash.Hash)."
}
if ($hash.Hash -ne $release.helperZipSha256) {
  throw "Release manifest SHA256 mismatch. Expected $($release.helperZipSha256), got $($hash.Hash)."
}

Assert-ZipEntry -ZipPath $zipPath -Pattern '(^|[/\\])Install-ReportGeneratorHelper\.exe$'
Assert-ZipEntry -ZipPath $zipPath -Pattern '(^|[/\\])Install-ReportGeneratorHelper\.cmd$'
Assert-ZipEntry -ZipPath $zipPath -Pattern '(^|[/\\])app[/\\]helper-build-manifest\.json$'
Assert-ZipEntry -ZipPath $zipPath -Pattern '(^|[/\\])app[/\\]src[/\\]learning-tree-setup\.js$'

$publishPlan = [ordered]@{
  ok = $true
  dryRun = [bool]$DryRun
  bucket = $BucketName
  version = $latest.version
  minimumVersion = $latest.minimumVersion
  helperZip = $zipPath
  helperObjectKey = $latest.objectKey
  helperZipSha256 = $hash.Hash
  latestManifest = $latestManifestPath
  latestManifestObjectKey = 'report-generator/latest-helper.json'
  installerName = $latest.installerName
}

if (-not $DryRun) {
  Invoke-WranglerR2Put -Bucket $BucketName -ObjectKey $latest.objectKey -FilePath $zipPath
  Invoke-WranglerR2Put -Bucket $BucketName -ObjectKey 'report-generator/latest-helper.json' -FilePath $latestManifestPath
  $publishPlan.published = $true
} else {
  $publishPlan.published = $false
}

$publishPlan | ConvertTo-Json -Depth 4

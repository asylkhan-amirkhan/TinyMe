$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$output = Join-Path $projectRoot 'transfer'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bundle = Join-Path $output "TinyMe-shop-$stamp"
$filesRoot = Join-Path $bundle 'files'
New-Item -ItemType Directory -Path $filesRoot -Force | Out-Null
$paths = @(& git -c core.quotepath=false diff --name-only HEAD; & git -c core.quotepath=false ls-files --others --exclude-standard) | Sort-Object -Unique
$paths = @($paths | Where-Object { $_ -and $_ -notlike 'transfer/*' -and ($_ -notlike '.env*' -or $_ -eq '.env.example') })
if (!$paths.Count) { throw 'No changed files to export.' }
foreach ($relative in $paths) {
  $source = Join-Path $projectRoot $relative
  if (Test-Path -LiteralPath $source -PathType Leaf) {
    $destination = Join-Path $filesRoot $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
  }
}
# A temporary Git index includes new files in the patch without staging them in the real index.
$previousIndex = $env:GIT_INDEX_FILE
$temporaryIndex = Join-Path $output "index-$stamp"
try {
  $env:GIT_INDEX_FILE = $temporaryIndex
  & git read-tree HEAD
  if ($LASTEXITCODE -ne 0) { throw 'git read-tree failed' }
  & git add --all -- $paths
  if ($LASTEXITCODE -ne 0) { throw 'git add to temporary index failed' }
  $patch = & git -c core.quotepath=false diff --cached --binary --no-ext-diff HEAD
  if ($LASTEXITCODE -ne 0) { throw 'git diff failed' }
  [System.IO.File]::WriteAllText((Join-Path $bundle 'TinyMe-shop.patch'), (($patch -join "`n") + "`n"), [System.Text.UTF8Encoding]::new($false))
} finally {
  $env:GIT_INDEX_FILE = $previousIndex
  if (Test-Path -LiteralPath $temporaryIndex) { Remove-Item -LiteralPath $temporaryIndex }
}
$base = & git rev-parse HEAD
$manifest = @("Base commit: $base", '', 'Changed/new/deleted paths:', '') + $paths + @('', 'Copy files/ contents into the repository, preserving paths.', 'Alternatively run: git apply --check TinyMe-shop.patch', 'Then: git apply TinyMe-shop.patch', 'Review git diff, then commit. Do not apply both methods.', 'Setup and checks: files/docs/shop-changes.md', 'No .env.local, node_modules or credentials are included.')
[System.IO.File]::WriteAllLines((Join-Path $bundle 'CHANGED-FILES.txt'), [string[]]$manifest, [System.Text.UTF8Encoding]::new($false))
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open("$bundle.zip", [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in Get-ChildItem -LiteralPath $bundle -Recurse -File -Force) {
    # ZIP uses forward slashes so phone extractors preserve the directory tree.
    $entry = $file.FullName.Substring($bundle.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entry) | Out-Null
  }
} finally { $archive.Dispose() }
Write-Output "$bundle.zip"

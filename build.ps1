$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$AppName  = 'gerdur'
$BuildDir = 'build'
$DistDir  = 'dist'

if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
if (Test-Path $DistDir)  { Remove-Item $DistDir  -Recurse -Force }

yarn build

New-Item -ItemType Directory -Path $BuildDir | Out-Null

npx pkg@4.5.1 --out-path $BuildDir package.json --targets node14-win-x64

Set-Location $BuildDir

Get-ChildItem -File | ForEach-Object {
  $file = $_.Name
  $base = [System.IO.Path]::GetFileNameWithoutExtension($file)

  $archivePath = "$base.zip"

  if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
  }

  Compress-Archive -Path $file -DestinationPath $archivePath -Force
}

Get-ChildItem -File | Select-Object Name, Length

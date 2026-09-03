$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$publish = Join-Path $root "publish"
$package = Join-Path $root "package"

Remove-Item $publish, $package -Recurse -Force -ErrorAction SilentlyContinue
dotnet publish (Join-Path $root "PrintAnywhere.Gateway.csproj") -c Release -r win-x64 --self-contained true -o $publish
Copy-Item (Join-Path $root "Package.appxmanifest") $publish
Copy-Item (Join-Path $root "Assets") $publish -Recurse

if (-not (Get-Command makeappx.exe -ErrorAction SilentlyContinue)) {
  throw "makeappx.exe is required. Install the Windows SDK or package with Visual Studio."
}

makeappx.exe pack /d $publish /p (Join-Path $root "PrintAnywhere.Gateway.msix") /o
Write-Host "Created PrintAnywhere.Gateway.msix"
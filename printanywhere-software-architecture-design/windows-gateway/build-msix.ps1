$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$publish = Join-Path $root "publish"
$package = Join-Path $root "package"

Remove-Item $publish, $package -Recurse -Force -ErrorAction SilentlyContinue
dotnet publish (Join-Path $root "PrintAnywhere.Gateway.csproj") -c Release -r win-x64 --self-contained true -o $publish
Copy-Item (Join-Path $root "Package.appxmanifest") (Join-Path $publish "AppxManifest.xml")
Copy-Item (Join-Path $root "Assets") $publish -Recurse

$makeAppx = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match "\\x64\\makeappx\.exe$" } |
  Sort-Object FullName -Descending |
  Select-Object -First 1
if (-not $makeAppx) {
  throw "makeappx.exe is required. Install the Windows SDK or package with Visual Studio."
}

& $makeAppx.FullName pack /d $publish /p (Join-Path $root "PrintAnywhere.Gateway.msix") /o
if ($LASTEXITCODE -ne 0) { throw "MSIX package creation failed with exit code $LASTEXITCODE" }
Write-Host "Created PrintAnywhere.Gateway.msix"
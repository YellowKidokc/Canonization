# Backup the embedded PostgreSQL database to %LOCALAPPDATA%\Theophysics\Canonization\backups
$ErrorActionPreference = 'Stop'
$dataDir = Join-Path $env:LOCALAPPDATA 'Theophysics\Canonization\postgres-data'
$backupDir = Join-Path $env:LOCALAPPDATA 'Theophysics\Canonization\backups'
New-Item -ItemType Directory -Force $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMddTHHmmssZ'
$out = Join-Path $backupDir "canonization-$stamp.dump"

# Use the pg_dump bundled with pgserver.
$pgDump = Get-ChildItem -Recurse -Filter pg_dump.exe "$PSScriptRoot\..\.venv\Lib\site-packages\pgserver" | Select-Object -First 1
if (-not $pgDump) { throw 'pg_dump.exe not found under the pgserver package' }

$env:PGPASSWORD = (Select-String -Path "$PSScriptRoot\..\..\..\.env" -Pattern '^PG_PASSWORD=(.+)$').Matches.Groups[1].Value
$portFile = Join-Path $env:LOCALAPPDATA 'Theophysics\Canonization\postgres.port'
$port = if (Test-Path $portFile) { (Get-Content $portFile).Trim() } else { 55432 }
& $pgDump.FullName -h 127.0.0.1 -p $port -U canonization -F c -f $out canonization
if ($LASTEXITCODE -eq 0) { Write-Output "Backup written: $out" } else { throw "pg_dump failed with $LASTEXITCODE" }

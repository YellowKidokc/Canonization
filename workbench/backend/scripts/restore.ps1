# Restore the embedded PostgreSQL database from a backup dump.
# Usage: .\restore.ps1 <path-to-backup.dump>   (DESTRUCTIVE: replaces current data)
$ErrorActionPreference = 'Stop'
if (-not $args[0]) { throw 'Usage: .\restore.ps1 <backup.dump>' }
$dump = $args[0]
if (-not (Test-Path $dump)) { throw "Not found: $dump" }

$pgDir = Get-ChildItem -Recurse -Filter pg_ctl.exe "$PSScriptRoot\..\.venv\Lib\site-packages\pgserver" | Select-Object -First 1
if (-not $pgDir) { throw 'pg_ctl.exe not found under the pgserver package' }
$binDir = $pgDir.DirectoryName
$dataDir = Join-Path $env:LOCALAPPDATA 'Theophysics\Canonization\postgres-data'

Write-Warning 'This replaces the current database. Ctrl-C to abort.'
Pause

& (Join-Path $binDir 'pg_ctl.exe') -D $dataDir -w stop
& (Join-Path $binDir 'pg_ctl.exe') -D $dataDir -w start
$env:PGPASSWORD = (Select-String -Path "$PSScriptRoot\..\..\..\.env" -Pattern '^PG_PASSWORD=(.+)$').Matches.Groups[1].Value
$portFile = Join-Path $env:LOCALAPPDATA 'Theophysics\Canonization\postgres.port'
$port = if (Test-Path $portFile) { (Get-Content $portFile).Trim() } else { 55432 }
& (Join-Path $binDir 'pg_restore.exe') -h 127.0.0.1 -p $port -U canonization -d canonization --clean --if-exists $dump
Write-Output 'Restore complete.'

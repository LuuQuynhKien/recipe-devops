# Sinh file .env voi mat khau ngau nhien manh (24 ky tu chu + so).
# Chay tu thu muc goc repo:  powershell -ExecutionPolicy Bypass -File .\scripts\gen-env.ps1
$ErrorActionPreference = "Stop"

function New-StrongPassword {
    param([int]$Length = 24)
    $chars = ([char[]](48..57) + [char[]](65..90) + [char[]](97..122))
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

if (Test-Path ".env") {
    Write-Host ".env da ton tai - giu nguyen. Xoa file neu muon tao lai." -ForegroundColor Yellow
    exit 0
}

$content = @"
MYSQL_DATABASE=recipes_db
MYSQL_ROOT_PASSWORD=$(New-StrongPassword)
APP_DB_PASSWORD=$(New-StrongPassword)
EXPORTER_DB_PASSWORD=$(New-StrongPassword)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$(New-StrongPassword)
"@

# Ghi ASCII (khong BOM, LF) de docker compose doc dung
[System.IO.File]::WriteAllText((Join-Path (Get-Location) ".env"), ($content -replace "`r`n", "`n"), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Da tao .env voi mat khau ngau nhien. KHONG commit file nay len GitHub." -ForegroundColor Green

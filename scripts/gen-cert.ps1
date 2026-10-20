# Sinh chung chi HTTPS tu ky (self-signed) bang openssl trong container (khong can cai openssl tren Windows).
# Tham so: -Mssv "MaSV"  (dua vao truong O cua chung chi)
param([string]$Mssv = "SV000000")
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path "nginx/certs" | Out-Null
$certDir = (Resolve-Path "nginx/certs").Path

docker run --rm -v "${certDir}:/certs" alpine/openssl req -x509 -nodes -days 365 `
    -newkey rsa:2048 `
    -keyout /certs/server.key -out /certs/server.crt `
    -subj "/C=VN/O=$Mssv/CN=localhost" `
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

if ($LASTEXITCODE -ne 0) { throw "Tao chung chi that bai" }
Write-Host "Da tao nginx/certs/server.crt va server.key" -ForegroundColor Green

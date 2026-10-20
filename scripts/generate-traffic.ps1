# Tao luu luong mau de dashboard Grafana va log Loki co du lieu (dung curl.exe co san tren Windows 10/11)
param([int]$Count = 60)

for ($i = 1; $i -le $Count; $i++) {
    curl.exe -sk -o NUL "https://localhost:8443/"                   | Out-Null
    curl.exe -sk -o NUL "https://localhost:8443/recipe/$((Get-Random -Minimum 1 -Maximum 6))" | Out-Null
    curl.exe -sk -o NUL "https://localhost:8443/?q=pho"            | Out-Null
    if ($i % 10 -eq 0) {
        curl.exe -sk -o NUL "https://localhost:8443/trang-khong-ton-tai"  | Out-Null   # tao 404
        curl.exe -sk -o NUL -X POST -d "title=a" "https://localhost:8443/new" | Out-Null # tao 400
    }
    Start-Sleep -Milliseconds 200
}
Write-Host "Da gui $Count vong request." -ForegroundColor Green

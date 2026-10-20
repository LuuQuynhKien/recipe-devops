# Kiem tra nhanh he thong + cac bien phap hardening (chup man hinh ket qua dua vao bao cao)
Write-Host "`n=== 1. Trang thai container ===" -ForegroundColor Cyan
docker compose ps

Write-Host "`n=== 2. HTTP -> HTTPS redirect ===" -ForegroundColor Cyan
curl.exe -sI http://localhost:8080/ | Select-String "HTTP/|Location"

Write-Host "`n=== 3. Security headers (HTTPS) ===" -ForegroundColor Cyan
curl.exe -skI https://localhost:8443/

Write-Host "`n=== 4. /metrics khong lo ra ngoai (mong doi 404) ===" -ForegroundColor Cyan
curl.exe -sk -o NUL -w "HTTP %{http_code}`n" https://localhost:8443/metrics

Write-Host "`n=== 5. Non-root: user dang chay trong container ===" -ForegroundColor Cyan
foreach ($c in "recipe_app", "recipe_nginx", "recipe_grafana", "recipe_prometheus") {
    $u = docker exec $c id 2>$null
    Write-Host ("{0,-20} {1}" -f $c, $u)
}

Write-Host "`n=== 6. DB khong publish cong ra host (mong doi: khong co dong nao) ===" -ForegroundColor Cyan
docker port recipe_db

Write-Host "`n=== 7. Network isolation: db_net la internal ===" -ForegroundColor Cyan
docker network inspect recipe-devops_db_net --format "Internal={{.Internal}}"

Write-Host "`n=== 8. Quyen user ung dung tren MySQL ===" -ForegroundColor Cyan
Write-Host "Chay lenh sau de xem (nhap mat khau root trong .env):"
Write-Host "  docker exec -it recipe_db mysql -uroot -p -e `"SHOW GRANTS FOR 'recipe_app'@'%';`""

Write-Host "`n=== 9. Prometheus targets ===" -ForegroundColor Cyan
curl.exe -s "http://localhost:9090/api/v1/targets" | ConvertFrom-Json |
    ForEach-Object { $_.data.activeTargets } |
    ForEach-Object { "{0,-14} {1}" -f $_.labels.job, $_.health }

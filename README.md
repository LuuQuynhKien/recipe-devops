# Recipe DevOps - Website Công thức Nấu ăn (Đề 29)

Triển khai website chia sẻ công thức nấu ăn bằng Docker Compose, kèm reverse proxy, giám sát, log tập trung và hardening.

| Thành phần | Công nghệ |
|---|---|
| Web app | Node.js 20 (Express), tự viết |
| Database | MySQL 8.0 + phpMyAdmin 5.2 |
| Reverse proxy | Nginx (unprivileged), HTTPS tự ký, security headers, rate limit |
| Giám sát | Prometheus, Grafana, cAdvisor, nginx-prometheus-exporter, mysqld-exporter |
| Log tập trung | Loki + Promtail (truy vấn LogQL) |

## Kiến trúc

```
Internet/Host ──8080/8443──> [nginx] ──> [app] ──> [db (MySQL)] <── [phpMyAdmin 127.0.0.1:8081]
                                 │          │          │
                       (monitoring network) │          │
        [cAdvisor] [nginx-exporter] [mysqld-exporter] ─┴──> [Prometheus 127.0.0.1:9090] ──> [Grafana 127.0.0.1:3000]
        [Promtail] ──(docker.sock)──> log mọi container ──> [Loki] ──> Grafana (LogQL)
```

Mạng: `web` (nginx, app, phpMyAdmin) · `db_net` (**internal**: db, app, phpMyAdmin, mysqld-exporter) · `monitoring` (giám sát/log).

## Cấu trúc thư mục

```
docker-compose.yml             # Commit 1: app + MySQL + phpMyAdmin + Nginx
docker-compose.monitoring.yml  # Commit 2: Prometheus + Grafana + exporters
docker-compose.logging.yml     # Commit 3: Loki + Promtail
app/            nginx/         monitoring/        logging/        db/init/        scripts/
```

## Chạy (PowerShell, Docker Desktop đã bật)

```powershell
git clone https://github.com/<MSSV>/<repo>.git ; cd <repo>
powershell -ExecutionPolicy Bypass -File .\scripts\gen-env.ps1          # sinh .env (mật khẩu mạnh)
powershell -ExecutionPolicy Bypass -File .\scripts\gen-cert.ps1 -Mssv "<MSSV>"   # chứng chỉ HTTPS tự ký

# Chỉ web + DB + Nginx (Commit 1)
docker compose up -d --build

# Thêm giám sát (Commit 2) và log (Commit 3)
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.logging.yml up -d --build
```

| Dịch vụ | Địa chỉ |
|---|---|
| Website | https://localhost:8443 (HTTP :8080 tự chuyển sang HTTPS) |
| phpMyAdmin | http://127.0.0.1:8081 (đăng nhập `root` + mật khẩu trong `.env`) |
| Prometheus | http://127.0.0.1:9090 |
| Grafana | http://127.0.0.1:3000 (`admin` + `GRAFANA_ADMIN_PASSWORD` trong `.env`) |

Dừng: thêm cùng các `-f` rồi `down` (thêm `-v` để xóa dữ liệu).

## LogQL mẫu (Grafana → Explore → Loki)

```logql
{service="nginx"} |= "POST"
{service="app"} | json | level=~"warn|error"
sum by (service) (count_over_time({job="docker"}[5m]))
{service="nginx"} | pattern `<ip> - <user> [<_>] "<method> <uri> <_>" <status> <size> "<_>" "<_>"` | status >= 400
```

## Hardening đã áp dụng

- Container non-root: `app` (user `node`), Nginx (`nginx-unprivileged`), Grafana (uid 472), Prometheus (nobody), Loki (uid 10001), exporters.
- Network isolation: DB nằm trong mạng `internal`, không publish cổng; phpMyAdmin/Prometheus/Grafana chỉ bind `127.0.0.1`.
- Mật khẩu mạnh sinh ngẫu nhiên, lưu `.env` (đã `.gitignore`); user DB theo least privilege (`recipe_app` chỉ SELECT/INSERT).
- `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, giới hạn RAM/PID cho các container chính.
- Nginx: TLS 1.2/1.3, HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy, ẩn version, rate limit, chặn `/metrics`.
- Ứng dụng: truy vấn tham số hóa (chống SQL injection), escape HTML (chống XSS), validate đầu vào.

Ngoại lệ có chủ đích: phpMyAdmin (Apache), cAdvisor và Promtail cần quyền/mount đặc biệt - được giảm thiểu bằng cách chỉ bind localhost và mạng tách biệt.

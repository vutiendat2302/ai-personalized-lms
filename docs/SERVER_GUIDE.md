# AI Personalized LMS - Server Operation Guide

## Server Architecture

```text
Internet
    │
    ▼
Tailscale Funnel
    │
    ▼
PC Server
    │
    ▼
Docker Compose
    ├── Frontend (React + Nginx)
    ├── Backend (Spring Boot)
    ├── MySQL
    ├── Redis
    └── MinIO
```

Public URL:

```
https://datdepzaivcl.taile009f4.ts.net/
```

---

# 1. Start Server

## Step 1. SSH vào server

```bash
ssh <username>@<server-ip>
```

Hoặc qua Tailscale:

```bash
ssh <username>@100.x.x.x
```

---

## Step 2. Di chuyển đến project

```bash
cd ~/ai-personalized-lms
```

---

## Step 3. Kiểm tra Docker

```bash
docker ps
```

Nếu Docker chưa chạy:

```bash
sudo systemctl start docker
```

---

## Step 4. Khởi động toàn bộ hệ thống

```bash
docker compose up -d
```

Kiểm tra:

```bash
docker ps
```

Kết quả mong muốn:

```
frontend     Up
backend      Up
mysql        Up
redis        Up
minio        Up
```

---

## Step 5. Kiểm tra Tailscale

```bash
tailscale status
```

---

## Step 6. Kiểm tra Funnel

```bash
tailscale funnel status
```

Kết quả:

```
https://datdepzaivcl.taile009f4.ts.net/
└── proxy http://127.0.0.1:80
```

Nếu Funnel chưa hoạt động:

```bash
sudo tailscale funnel 80
```

---

# 2. Stop Server

## Chỉ dừng ứng dụng

```bash
docker compose down
```

---

## Tắt máy

```bash
docker compose down
sudo shutdown now
```

Hoặc:

```bash
sudo poweroff
```

---

# 3. Restart Server

Restart toàn bộ:

```bash
docker compose restart
```

Restart backend:

```bash
docker restart backend
```

Restart frontend:

```bash
docker restart frontend
```

---

# 4. Deploy / Update Project

## Bước 1. Pull source mới

```bash
git pull
```

---

## Bước 2. Build lại

Toàn bộ:

```bash
docker compose up -d --build
```

Chỉ backend:

```bash
docker compose up -d --build backend
```

Chỉ frontend:

```bash
docker compose up -d --build frontend
```

---

## Bước 3. Kiểm tra

```bash
docker ps
```

---

# 5. Xem Logs

Backend:

```bash
docker logs backend --tail 200
```

Frontend:

```bash
docker logs frontend --tail 200
```

MySQL:

```bash
docker logs mysql --tail 200
```

Theo dõi realtime:

```bash
docker logs backend -f
```

---

# 6. Kiểm tra trạng thái

## Docker

```bash
docker ps
```

---

## Tailscale

```bash
tailscale status
```

---

## Funnel

```bash
tailscale funnel status
```

---

## Website

```
https://datdepzaivcl.taile009f4.ts.net/
```

---

# 7. Backup Database

Backup:

```bash
docker exec mysql \
mysqldump -u root -p database_name \
> backup.sql
```

Restore:

```bash
docker exec -i mysql \
mysql -u root -p database_name \
< backup.sql
```

---

# 8. Auto Start Sau Khi Mất Điện

Bật Docker tự khởi động:

```bash
sudo systemctl enable docker
```

Trong `docker-compose.yml`:

```yaml
restart: always
```

Ví dụ:

```yaml
services:
  backend:
    restart: always

  frontend:
    restart: always

  mysql:
    restart: always

  redis:
    restart: always

  minio:
    restart: always
```

---

# 9. Quy trình Deploy

```
Local Development
        │
        ▼
Git Commit
        │
        ▼
Git Push
        │
        ▼
SSH vào Server
        │
        ▼
git pull
        │
        ▼
docker compose up -d --build
        │
        ▼
Kiểm tra Website
```

---

# 10. Khi Website Không Hoạt Động

Kiểm tra theo thứ tự:

- PC Server đã bật chưa.
- SSH vào được không.
- Docker còn chạy không.

```bash
docker ps
```

- Funnel còn hoạt động không.

```bash
tailscale funnel status
```

- Xem log backend.

```bash
docker logs backend --tail 200
```

- Xem log frontend.

```bash
docker logs frontend --tail 200
```

---

# 11. Các lệnh thường dùng

### Start

```bash
docker compose up -d
```

---

### Stop

```bash
docker compose down
```

---

### Restart

```bash
docker compose restart
```

---

### Update

```bash
git pull
docker compose up -d --build
```

---

### Xem container

```bash
docker ps
```

---

### Xem log

```bash
docker logs backend -f
```

---

### Kiểm tra Funnel

```bash
tailscale funnel status
```

---

### Kiểm tra Tailscale

```bash
tailscale status
```

# AI-Personalized-LMS 

## Project Goal 

The goal of this project is to build a smart LMS that:
- Supports course and class management
- Enables online assessments and grading
- Tracks student learning progress
- Provides interaction between teachers and students
- Applies AI to personalize learning paths based on user behavior

--- 

## System Design (In Progress)

Architechture
- Frontend: React
- Backend Spring Boot 
- Database: MySql 
- AI Service: Python 

--- 
## Current Phase
- Status: In Progress, Completed, To Do, Canceled, In Review 


### Phase 1 (In Progress)
- Initialize repository
- Write README
- Design database schema
- Design system workflow
- Backend development 

### Phase 2
- Backend development
- Frontend development

### Phase 3
- AI recommendation system integration


``` bash
docker compose up --build

```

``` bash
docker compose -f docker-compose.yml up --build -d

```

``` bash 

docker compose up -d 

```

``` bash

docker compose up --build backend // Sửa code be 
or 
docker compose up --build -d backend

docker compose up --build frontend

```

``` bash 

# Chỉ khởi động lại container
docker compose restart backend

# Xem log
docker compose logs -f backend


# Reset toàn bộ DB
docker compose down -v
docker compose up --build -d
```

``` bash 

docker compose logs backend -f // xem logs be 
```

``` bash 


docker run --rm --network ailms-network -v $(pwd):/app -w /app python:3.12-slim bash -c "pip install -r requirements.txt && DB_HOST=mysql python main.py"

```


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
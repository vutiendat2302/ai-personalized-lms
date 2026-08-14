# 🖥️ AI Personalized LMS — Server & Infrastructure Operation Guide

<div align="center">

![Docker Compose](https://img.shields.io/badge/Docker_Compose-v2.x-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Tailscale](https://img.shields.io/badge/Tailscale-Funnel_Ingress-4353FF?style=for-the-badge&logo=tailscale&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-Reverse_Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4_InnoDB-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Ubuntu](https://img.shields.io/badge/Ubuntu_Linux-24.04_LTS-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)

<p align="center">
  <b>Tài liệu Hướng dẫn Quản trị Máy chủ, Vận hành Hạ tầng Container và Quy trình Triển khai Hệ thống (DevOps & Server Operations)</b>
</p>

</div>

---

## 1. Kiến trúc Hạ tầng & Định tuyến Lưu lượng (Network Ingress Topology)

Toàn bộ hệ thống được triển khai trên nền tảng máy chủ Linux theo mô hình Container hóa hoàn chỉnh. Lưu lượng từ Internet được định tuyến an toàn qua **Tailscale Funnel (HTTPS Termination)** tới **Nginx Reverse Proxy** và phân phối vào mạng nội bộ **`ailms-network`**.

```mermaid
flowchart TD
    subgraph ExternalNetwork ["External Network (Internet)"]
        User["Người dùng cuối (Web Client / Mobile Browser)"]
        AdminDev["Quản trị viên / Developer"]
    end

    subgraph SecureIngress ["Secure Ingress & Tunnel Layer"]
        Funnel["Tailscale Funnel (Public HTTPS Proxy: Port 443)<br/><code>https://datdepzaivcl.taile009f4.ts.net</code>"]
        Tailnet["Tailscale Encrypted Mesh VPN (Private IP: 100.x.x.x)"]
    end

    subgraph HostServer ["Host Machine (Linux PC / Cloud Server)"]
        Systemd["Systemd Service Manager (Docker Daemon: Auto-start)"]
        
        subgraph DockerNetwork ["Docker Bridge Network (ailms-network)"]
            Nginx["frontend (Nginx Reverse Proxy: Port 80)"]
            
            subgraph Microservices ["Application Tier"]
                Backend["backend (Spring Boot 3 / Java 25: Port 8080)"]
                AIService["ai-service (FastAPI / Python 3.12: Port 8000)"]
            end

            subgraph DataTier ["Data & Stateful Storage Tier"]
                MySQL[("mysql (MySQL 8.4 Server: Port 3306)")]
                Redis[("redis (Redis 7 In-Memory: Port 6379)")]
                Meili[("meilisearch (Full-Text Search: Port 7700)")]
                Qdrant[("qdrant (Vector Database: Port 6333)")]
                MinIO[("minio (S3 Object Storage: Port 9000/9001)")]
            end
        end

        subgraph PersistentVolumes ["Host Named Volumes (Data Persistence)"]
            V_MySQL[("ailms_mysql_data")]
            V_Redis[("ailms_redis_data")]
            V_MinIO[("ailms_minio_data")]
            V_Qdrant[("ailms_qdrant_data")]
            V_Meili[("meilisearch_data")]
        end
    end

    User -->|HTTPS 443| Funnel
    Funnel -->|HTTP Ingress: Port 80| Nginx
    AdminDev -->|SSH over Tailnet IP| HostServer

    Nginx -->|Serve Static SPA / Rewrites| Nginx
    Nginx -->|Proxy /api/*| Backend
    
    Backend -->|X-Internal-Token / Loopback| AIService
    Backend -->|JDBC / Connection Pool| MySQL
    Backend -->|Jedis / Lettuce| Redis
    Backend -->|REST API Index Sync| Meili
    Backend -->|S3 SDK / Presigned URLs| MinIO
    
    AIService -->|Similarity Search 768d| Qdrant
    AIService -->|Fetch Documents for OCR/RAG| MinIO

    MySQL --- V_MySQL
    Redis --- V_Redis
    MinIO --- V_MinIO
    Qdrant --- V_Qdrant
    Meili --- V_Meili
```

---

## 2. Truy cập Quản trị Máy chủ (Server Access)

### 2.1 Truy cập qua Mạng Tailscale VPN (Khuyên dùng)
```bash
# Truy cập qua địa chỉ Tailscale IP
ssh <username>@100.x.x.x

# Hoặc qua hostname máy chủ
ssh <username>@ailms-server
```

### 2.2 Di chuyển đến thư mục dự án & Kiểm tra biến môi trường
```bash
cd /home/datbritget/Documents/project-ai-lms/ai-personalized-lms

# Kiểm tra file cấu hình môi trường sản xuất
ls -la .env
```

---

## 3. Vận hành Vòng đời Dịch vụ (Docker Compose Orchestration)

### 3.1 Khởi động Toàn bộ Hệ sinh thái (Cold Start)
```bash
# Khởi chạy toàn bộ 7 dịch vụ ở chế độ background
docker compose up -d

# Theo dõi tiến trình khởi tạo và healthcheck
docker compose ps
```

*Trạng thái mong đợi sau khi toàn bộ healthcheck hoàn tất:*
```text
NAME                     IMAGE                      STATUS                    PORTS
ailms-frontend           ai-personalized-lms-fe     Up (healthy)              0.0.0.0:80->80/tcp
ailms-backend            ai-personalized-lms-be     Up (healthy)              0.0.0.0:8080->8080/tcp
ailms-ai-service         ai-personalized-lms-ai     Up (healthy)              127.0.0.1:8000->8000/tcp
ailms-mysql-docker       mysql:8.4                  Up (healthy)              0.0.0.0:3306->3306/tcp
ailms-redis-docker       redis:7-alpine             Up (healthy)              6379/tcp
ailms-meilisearch-docker getmeili/meilisearch:v1.15 Up (healthy)              0.0.0.0:7700->7700/tcp
ailms-qdrant-docker      qdrant/qdrant:v1.15.4      Up (healthy)              0.0.0.0:6333->6333/tcp
ailms-minio-docker       minio/minio:latest         Up (healthy)              0.0.0.0:9000->9000/tcp, 0.0.0.0:9001->9001/tcp
```

### 3.2 Khởi động lại Từng Dịch vụ Độc lập (Zero-Disruption Restart)
```bash
# Khởi động lại Backend Core (khi cập nhật cấu hình hoặc kiểm toán)
docker compose restart backend

# Khởi động lại AI Service
docker compose restart ai-service

# Khởi động lại Frontend Nginx
docker compose restart frontend
```

### 3.3 Tắt Hệ thống An toàn (Graceful Shutdown)
```bash
# Dừng container và giải phóng tài nguyên CPU/RAM (Dữ liệu trong volumes được bảo toàn)
docker compose down

# Tắt máy chủ từ xa an toàn
sudo shutdown -h now
```

---

## 4. Quy trình Cập nhật & Triển khai (Continuous Deployment Pipeline)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Kỹ sư Phát triển (Local)
    participant Git as GitHub Remote Repository
    participant Host as Host Server (Production PC)
    participant Docker as Docker Compose Engine
    participant App as Ứng dụng LMS (Live)

    Dev->>Git: git push origin feature/update (Commit Verified)
    Dev->>Host: SSH Authentication (qua Tailscale)
    
    Host->>Git: git pull origin <branch-name>
    Git-->>Host: Đồng bộ mã nguồn mới nhất
    
    Host->>Docker: docker compose up -d --build backend frontend ai-service
    
    Note over Docker: Thực thi Multi-stage Build:<br/>1. Maven compile & package JDK 25<br/>2. Vite production build React 19<br/>3. Pip install & Uvicorn refresh
    
    Docker->>Docker: Chạy Healthcheck Dependencies
    Docker-->>App: Switch Live Traffic sang Container mới
    Host->>Host: docker ps & Kiểm tra Logs
    Host-->>Dev: Triển khai hoàn tất (Deployment Success)
```

### Các lệnh thực thi triển khai:
```bash
# Bước 1: Kéo mã nguồn mới nhất
git pull

# Bước 2: Build lại các container có thay đổi mã nguồn
docker compose up -d --build

# Bước 3: Dọn dẹp các Docker image không sử dụng (Dangling Images)
docker image prune -f
```

---

## 5. Quản trị Cơ sở Dữ liệu & Khôi phục Thảm họa (Backup & Disaster Recovery)

```mermaid
flowchart LR
    subgraph BackupProcess ["Quy trình Sao lưu Định kỳ (Daily Backup)"]
        MySQL_Live[("MySQL 8.4 Live DB")] -->|mysqldump --single-transaction| DumpScript["Script mysqldump"]
        DumpScript -->|Nén GZIP & Đặt tên theo Timestamp| SQL_File["backup_ailms_YYYYMMDD_HHMMSS.sql.gz"]
        SQL_File -->|Lưu trữ an toàn| BackupStorage["Thư mục /backups hoặc S3 Bucket"]
    end

    subgraph RestoreProcess ["Quy trình Phục hồi Dữ liệu (Disaster Recovery)"]
        Target_File["backup_ailms_YYYYMMDD_HHMMSS.sql"] -->|Giải nén & Import| MySQL_Restore["mysql client restore"]
        MySQL_Restore -->|Transactional Replay| MySQL_Target[("MySQL 8.4 Restored DB")]
    end
```

### 5.1 Lệnh Tạo Bản sao lưu Cơ sở Dữ liệu (Full Database Backup)
```bash
# Tạo file backup có gắn timestamp
BACKUP_NAME="backup_ailms_$(date +%Y%m%d_%H%M%S).sql"

docker exec ailms-mysql-docker \
  mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" \
  --single-transaction --quick --databases ailms > "${BACKUP_NAME}"

echo "Đã tạo bản backup thành công: ${BACKUP_NAME}"
```

### 5.2 Lệnh Phục hồi Cơ sở Dữ liệu (Database Restore)
```bash
# Phục hồi dữ liệu từ bản sao lưu chỉ định
docker exec -i ailms-mysql-docker \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" ailms < backup_ailms_20260814_150000.sql
```

---

## 6. Vận hành Tailscale Funnel & Kiểm tra Ingress

Tailscale Funnel đóng vai trò là cổng **HTTPS Ingress công khai** chuyển tiếp lưu lượng từ Internet vào cổng 80 của Nginx trên máy chủ.

```bash
# 1. Kiểm tra trạng thái mạng Tailscale
tailscale status

# 2. Kiểm tra trạng thái Funnel Ingress
tailscale funnel status
```

*Nếu Funnel bị tắt hoặc cần khởi động lại:*
```bash
# Bật chuyển tiếp cổng 80 ra Internet
sudo tailscale funnel --bg 80
```

---

## 7. Giám sát & Quản lý Nhật ký (Observability & Logging)

### 7.1 Xem Logs theo thời gian thực (Real-time Stream Logs)
```bash
# Theo dõi log Backend Core
docker logs -f ailms-backend --tail 100

# Theo dõi log AI Microservice
docker logs -f ailms-ai-service --tail 100

# Theo dõi log Nginx Frontend
docker logs -f ailms-frontend --tail 100

# Theo dõi log MySQL Server
docker logs -f ailms-mysql-docker --tail 100
```

### 7.2 Giám sát Tiêu thụ Tài nguyên Phần cứng (Resource Monitoring)
```bash
# Xem mức sử dụng CPU, RAM, Network I/O của toàn bộ 7 container
docker stats --no-stream
```

---

## 8. Tự động Phục hồi sau Sự cố (Self-Healing & Auto-Restart)

Hệ thống được thiết lập cơ chế tự phục hồi sau khi mất điện hoặc máy chủ khởi động lại:

1. **Systemd Service:** Kích hoạt Docker daemon khởi động cùng hệ điều hành:
   ```bash
   sudo systemctl enable docker
   ```
2. **Container Restart Policy:** Toàn bộ dịch vụ trong `docker-compose.yml` được cấu hình:
   ```yaml
   restart: always
   ```

---

## 🚨 9. Quy trình Xử lý Sự cố (Troubleshooting Decision Tree)

```mermaid
flowchart TD
    Issue["Phát hiện Sự cố / Website Không truy cập được"] --> Step1{"Máy chủ Server có phản hồi SSH?"}
    
    Step1 -->|Không| PowerCheck["Kiểm tra nguồn điện PC, kết nối mạng vật lý và khởi động lại Server"]
    Step1 -->|Có| Step2{"Docker Daemon có đang hoạt động?"}
    
    Step2 -->|Không| StartDocker["sudo systemctl restart docker"]
    Step2 -->|Có| Step3{"Tất cả 7 container có Up (healthy)?"}
    
    Step3 -->|Container Exit/Unhealthy| InspectLog["docker compose logs <service-name> --tail 200"]
    InspectLog --> FixEnv["Kiểm tra biến môi trường .env, RAM, xung đột cổng và Restart"]
    
    Step3 -->|Toàn bộ Container Healthy| Step4{"Tailscale Funnel có hoạt động?"}
    
    Step4 -->|Funnel Inactive| ResetFunnel["sudo tailscale funnel --bg 80"]
    Step4 -->|Funnel Active| Step5{"Lỗi cụ thể trên trình duyệt?"}
    
    Step5 -->|502 Bad Gateway| CheckBE["Kiểm tra Backend Spring Boot (port 8080) và Nginx proxy_pass"]
    Step5 -->|500 Internal Error| CheckDB["Kiểm tra kết nối MySQL / Redis / API Keys"]
    Step5 -->|AI Stream Timeout| CheckAI["Kiểm tra AI Service (port 8000) và GEMINI_API_KEY"]
```

---

## 10. Bảng Tra cứu Lệnh Nhanh (Operations Cheat Sheet)

| Tác vụ | Lệnh thực thi nhanh |
| :--- | :--- |
| **Khởi chạy toàn bộ** | `docker compose up -d` |
| **Dừng toàn bộ** | `docker compose down` |
| **Rebuild & Update** | `git pull && docker compose up -d --build` |
| **Kiểm tra trạng thái** | `docker compose ps` |
| **Xem log realtime Backend** | `docker logs -f ailms-backend --tail 100` |
| **Xem log realtime AI** | `docker logs -f ailms-ai-service --tail 100` |
| **Kiểm tra Tailscale Funnel** | `tailscale funnel status` |
| **Kích hoạt Tailscale Funnel** | `sudo tailscale funnel --bg 80` |
| **Backup MySQL nhanh** | `docker exec ailms-mysql-docker mysqldump -u root -p ailms > backup.sql` |
| **Dọn dẹp Docker rác** | `docker system prune -f` |

---

<div align="center">
  <sub>Tài liệu Vận hành Hệ thống <b>AI Personalized LMS</b> — Duy trì bởi Đội ngũ Kỹ thuật.</sub>
</div>

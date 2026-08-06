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
Điều gì xảy ra ở chế độ Dev?

* Docker Compose tự động hợp nhất docker-compose.yml + docker-compose.override.yml.
* Mở các port debug ra máy host: MySQL (3306), Redis (6379), MinIO UI (9001), Backend (8080), AI Service (8000), Frontend (5173).
* Code của ai-service được mount dạng Live Reload (sửa code Python là container tự cập nhật không cần rebuild).

``` bash
docker compose -f docker-compose.yml up --build -d

```

* Ẩn hoàn toàn các port cơ sở dữ liệu (3306, 6379, 8000) khỏi Internet và máy host.
* Chỉ mở duy nhất cổng 80 (Frontend Nginx đóng vai trò vừa serve trang web React vừa reverse-proxy các API /api/* sang Backend).

``` bash 

docker compose up -d 

```

* Update data 


``` bash

docker compose up --build backend // Sửa code be 
or 
docker compose up --build -d backend

docker compose up --build frontend

# Build lại khi đổi Dockerfile hoặc dependency
docker compose up --build -d

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


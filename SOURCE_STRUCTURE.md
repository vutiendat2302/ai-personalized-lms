# Cấu trúc source — AI Personalized LMS

Tài liệu này mô tả cấu trúc source hiện tại của project. Các thư mục phụ thuộc, file build, cache và dữ liệu runtime như `node_modules/`, `target/`, `dist/`, `.venv/`, `__pycache__/` và Docker volumes không được liệt kê.

## 1. Tổng quan kiến trúc

```text
Người dùng
    │
    ▼
Frontend (React + Nginx)
    │  /api/*
    ▼
Backend (Spring Boot)
    ├── MySQL        Lưu dữ liệu nghiệp vụ
    ├── Redis        Cache và dữ liệu tạm
    ├── MinIO        Lưu trữ file
    └── AI Service   Xử lý yêu cầu AI qua API nội bộ
            └── Gemini
```

Frontend không gọi trực tiếp AI Service. Tất cả yêu cầu AI đi qua Backend và được xác thực nội bộ bằng token.

## 2. Cây thư mục cấp cao

```text
ai-personalized-lms/
├── backend/
│   ├── BACKEND.md                 Tài liệu backend
│   └── ailms/                     Ứng dụng Spring Boot
├── frontend/
│   ├── README.md                  Tài liệu frontend
│   └── ailms-frontend/            Ứng dụng React
├── ai-service/                    Microservice AI bằng FastAPI
├── database/                      SQL, migration và script tạo dữ liệu
├── docs/                          Tài liệu vận hành hệ thống
├── docker-compose.yml             Cấu hình chạy gần production
├── docker-compose.override.yml    Cấu hình bổ sung cho môi trường dev
├── AGENTS.md                      Quy ước phát triển trong repository
└── README.md                      Giới thiệu và hướng dẫn chạy project
```

## 3. Backend — `backend/ailms`

**Công nghệ chính:** Java 25, Spring Boot, Maven, Spring Data JPA, Spring Security, MapStruct, MySQL, Redis và MinIO.

```text
backend/ailms/
├── src/
│   ├── main/
│   │   ├── java/com/ailms/
│   │   │   ├── client/            Client gọi service bên ngoài, gồm AI Service
│   │   │   ├── common/            Thành phần dùng chung
│   │   │   │   ├── config/        Cấu hình dùng chung
│   │   │   │   ├── converter/     Bộ chuyển đổi dữ liệu
│   │   │   │   ├── snowflake/     Sinh ID Snowflake
│   │   │   │   └── util/          Hàm tiện ích
│   │   │   ├── config/            Cấu hình Spring, Redis, MinIO, Jackson, async...
│   │   │   ├── controller/        REST API controller
│   │   │   │   └── base/          Controller cơ sở
│   │   │   ├── dto/               Data Transfer Object dùng chung
│   │   │   ├── entity/            JPA entity và enum nghiệp vụ
│   │   │   ├── event/             Application event và listener
│   │   │   ├── exception/         Exception và xử lý lỗi tập trung
│   │   │   ├── job/               Tác vụ chạy theo lịch/nền
│   │   │   ├── mapper/             MapStruct mapper
│   │   │   ├── repository/         Truy cập dữ liệu và specification
│   │   │   ├── request/            DTO request, gồm request AI
│   │   │   ├── response/           DTO response, gồm response AI
│   │   │   ├── security/           JWT, filter và user details
│   │   │   ├── service/            Interface và nghiệp vụ
│   │   │   │   ├── calculator/     Logic tính toán chuyên biệt
│   │   │   │   ├── imp/            Các lớp triển khai service
│   │   │   │   └── lock/           Cơ chế khóa nghiệp vụ
│   │   │   └── AilmsApplication.java
│   │   └── resources/
│   │       ├── application.yaml    Cấu hình ứng dụng
│   │       └── fonts/              Font dùng khi sinh tài liệu
│   └── test/java/com/ailms/        Test backend
├── Dockerfile
├── pom.xml                         Dependency và cấu hình Maven
├── mvnw / mvnw.cmd                 Maven Wrapper
└── lombok.config
```

Luồng xử lý backend phổ biến:

```text
Controller → Request validation → Service → Repository → MySQL
                                   ├──────→ Redis / MinIO
                                   └──────→ AiServiceClient → AI Service
```

## 4. Frontend — `frontend/ailms-frontend`

**Công nghệ chính:** React, TypeScript, Vite, Tailwind CSS, shadcn, Axios, React Router, Zustand, React Hook Form và Zod.

```text
frontend/ailms-frontend/
├── public/                         Tài nguyên tĩnh công khai
├── src/
│   ├── api/                        API client theo từng domain nghiệp vụ
│   │   ├── admin/                  API quản trị
│   │   ├── auths/                  API xác thực
│   │   ├── courses/                API khóa học
│   │   ├── lessons/                API bài học
│   │   ├── quizzes/                API bài kiểm tra
│   │   ├── student/                API cho học viên
│   │   ├── teacher/                API cho giáo viên
│   │   └── ...                     Các domain còn lại
│   ├── components/
│   │   ├── admin/                  Component màn hình quản trị
│   │   ├── auth/                   Component xác thực
│   │   ├── cart/                   Component giỏ hàng
│   │   ├── common/                 Component tái sử dụng toàn hệ thống
│   │   ├── sales/                  Component bán hàng
│   │   ├── student/                Component học viên
│   │   ├── teacher/                Component giáo viên
│   │   └── ui/                     UI primitive/shadcn
│   ├── config/                     Cấu hình frontend
│   ├── hooks/                      Custom React hooks
│   ├── layouts/                    Layout theo khu vực/vai trò
│   ├── lib/                        Khởi tạo thư viện và helper nền tảng
│   ├── pages/
│   │   ├── admin/                  Trang quản trị
│   │   ├── public/                 Trang công khai
│   │   ├── student/                Trang học viên
│   │   └── teacher/                Trang giáo viên
│   ├── services/                   Service phía client
│   ├── store/                      Global state bằng Zustand
│   ├── types/                      Type/interface TypeScript
│   ├── utils/                      Tiện ích và unit test
│   ├── App.tsx                     Component gốc và định tuyến chính
│   ├── main.tsx                    Entry point React
│   └── index.css                   CSS toàn cục và theme Tailwind
├── Dockerfile
├── package.json                    Dependency và npm scripts
├── vite.config.ts                  Cấu hình Vite
└── tsconfig*.json                  Cấu hình TypeScript
```

Luồng dữ liệu frontend phổ biến:

```text
Page → Component / Hook → API client → Backend REST API
                    └──→ Store (khi cần state dùng chung)
```

## 5. AI Service — `ai-service`

**Công nghệ chính:** Pytho, FastAPI, Pydantic và Gemini API.

```text
ai-service/
├── app/
│   ├── core/
│   │   ├── config.py              Đọc cấu hình và biến môi trường
│   │   ├── logging.py             Cấu hình logging
│   │   └── security.py            Xác thực token nội bộ
│   ├── providers/
│   │   ├── base_provider.py       Interface chung cho AI provider
│   │   └── gemini_provider.py     Tích hợp Gemini
│   ├── routers/
│   │   ├── chat.py                Endpoint chat AI
│   │   └── test_ai.py             Endpoint health/test
│   ├── schemas/
│   │   ├── chat_schema.py         Schema request/response chat
│   │   └── test_schema.py         Schema test AI
│   └── main.py                    Khởi tạo FastAPI application
├── tests/
│   └── test_api.py                Test API
├── Dockerfile
├── requirements.txt               Python dependencies
├── pytest.ini                     Cấu hình pytest
└── README.md                      Tài liệu AI Service
```

Hiện tại source đã có provider Gemini, router chat và API test. Các module Prompt Engine, RAG, embedding và vector store được định hướng trong tài liệu nhưng chưa xuất hiện đầy đủ trong cây source hiện tại.

## 6. Database — `database`

```text
database/
├── gen_data/                       Script Python tạo dữ liệu theo bảng/domain
│   ├── main.py                     Điểm chạy chính
│   ├── db.py                       Kết nối database
│   ├── snowflake_id.py             Sinh ID
│   ├── user.py, course.py, ...     Generator theo từng domain
│   └── requirements.txt
├── data.sql                        Dữ liệu SQL
├── v1_create_class_stream_and_resource_tables.sql
├── v2_update_class_online_sessions.sql
├── DATABASE.md                     Tài liệu database
├── full.md                         Mô tả schema đầy đủ
└── requirements.txt               Dependency cho script database
```

Các file `v1_*.sql`, `v2_*.sql`, ... là migration thủ công theo phiên bản. `gen_data/` chứa script hỗ trợ sinh dữ liệu phát triển cho nhiều domain như user, role, course, lesson, attendance, payment và payroll.

## 7. Hạ tầng Docker

`docker-compose.yml` khai báo các service:

| Service | Vai trò | Cổng chính trong container |
|---|---|---:|
| `frontend` | Build React, serve bằng Nginx và reverse proxy API | 80 |
| `backend` | REST API và nghiệp vụ chính | 8080 |
| `ai-service` | API AI nội bộ | 8000 |
| `mysql` | Cơ sở dữ liệu nghiệp vụ | 3306 |
| `redis` | Cache/dữ liệu tạm | 6379 |
| `minio` | Object storage | 9000/9001 |
| `minio-init` | Khởi tạo bucket MinIO | — |

Các container giao tiếp qua network `ailms-network`. Dữ liệu MySQL, Redis và MinIO được giữ trong named volumes. Khi chạy development, Docker Compose tự động hợp nhất thêm `docker-compose.override.yml` để mở cổng và hỗ trợ live reload.

## 8. Lệnh làm việc thường dùng

Chạy toàn hệ thống ở chế độ development:

```bash
docker compose up --build
```

Chạy backend và test:

```bash
cd backend/ailms
./mvnw test
```

Chạy frontend:

```bash
cd frontend/ailms-frontend
npm install
npm run dev
```

Kiểm tra frontend:

```bash
npm run lint
npm run build
```

Chạy test AI Service trong virtual environment:

```bash
cd ai-service
pytest
```

## 9. Quy ước phụ thuộc giữa các phần

- Frontend chỉ gọi API của Backend; không truy cập trực tiếp MySQL, Redis, MinIO hoặc AI Service.
- Backend là lớp điều phối trung tâm cho nghiệp vụ, lưu trữ file và tính năng AI.
- AI Service chỉ nhận yêu cầu nội bộ từ Backend, không truy cập trực tiếp MySQL nghiệp vụ.
- DTO/type phải được cập nhật đồng bộ khi hợp đồng API thay đổi.
- Thay đổi schema database cần có migration và phải xét ảnh hưởng tới Backend, Frontend cùng dữ liệu hiện tại.
- Secret và thông tin đăng nhập chỉ được truyền qua biến môi trường, không lưu trong source.

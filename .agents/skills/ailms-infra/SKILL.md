---
name: ailms-infra
description: Phát triển và xử lý lỗi hạ tầng local/container của AILMS gồm Dockerfile, docker-compose.yml và docker-compose.override.yml. Sử dụng khi làm Docker build, networking, environment variable, port, Nginx proxy, MySQL, Redis, MinIO, AI Service connectivity hoặc cấu hình development Compose. Không sử dụng cho feature code thông thường hoặc tài liệu-only.
---

# AILMS Infrastructure

Sử dụng:

- `docker-compose.yml` cho topology chính;
- `docker-compose.override.yml` cho development override.

## Services

Hệ thống gồm:

- `frontend`
- `backend`
- `ai-service`
- `mysql`
- `redis`
- `minio`
- `minio-init`

Giữ các service giao tiếp qua `ailms-network`.

## Boundary

Giữ kiến trúc:

`Frontend → Backend`

và:

`Backend → MySQL / Redis / MinIO / AI Service`

Không mở kết nối trực tiếp:

`Frontend → AI Service`

Không cho AI Service truy cập business MySQL nếu không có quyết định kiến trúc rõ ràng.

## Environment

Truyền qua environment variable:

- password;
- API key;
- token;
- secret;
- environment-specific config.

Không hard-code secret vào Dockerfile/Compose/source.

## Compose

Trước khi sửa, xác định config thuộc:

- base compose;
- dev override;
- Dockerfile;
- application config.

Không expose internal port ra host nếu không cần.

Giữ named volume cho dữ liệu persistent.

## An toàn

Không xóa volume để chữa lỗi configuration.

Không dùng destructive volume command nếu user không yêu cầu rõ ràng.

## Kiểm tra

Validate:

`docker compose config`

Khi cần chạy toàn hệ thống:

`docker compose up --build`

Nếu lỗi, xác định trước lỗi nằm ở:

- application;
- container;
- network;
- environment;
- dependency service

rồi mới sửa source.
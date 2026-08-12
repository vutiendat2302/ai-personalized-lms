---
name: ailms-ai-service
description: Phát triển, sửa lỗi, review và kiểm thử AI Service AILMS tại ai-service sử dụng Python 3.12, FastAPI, Pydantic và Gemini. Sử dụng khi làm AI provider, Gemini integration, FastAPI router, Pydantic schema, internal-token security, AI config, logging, chat endpoint, AI test hoặc triển khai tương lai cho Prompt Engine, RAG, embedding và vector store. Không sử dụng cho Spring Backend thông thường, Frontend, migration database hoặc tài liệu-only. Đây là tài liệu tham khảo cho phần ai: có thể tham khảo: query, queryEngine, tools, context, history, cost-tracker, service, task, medir https://github.com/chauncygu/collection-claude-code-source-code

---

# AILMS AI Service

Làm việc trong `ai-service`.

Source hiện tại là nguồn sự thật chính.

## Kiến trúc hiện tại

Source hiện đã có:

- `app/core`
- `app/providers`
- `app/routers`
- `app/schemas`
- `app/main.py`
- `tests`

Provider hiện tại là Gemini.

Source hiện tại đã có chat và API test/health.

Prompt Engine, RAG, embedding và vector store hiện là định hướng kiến trúc.

Không giả định chúng đã được implement nếu source chưa có.

Không tự tạo toàn bộ RAG architecture chỉ vì tài liệu có nhắc tới.

## Provider

Giữ provider abstraction tại:

`app/providers/base_provider.py`

Gemini-specific logic đặt tại:

`app/providers/gemini_provider.py`

Router không được gọi trực tiếp Gemini SDK.

Không rải provider-specific logic ra nhiều layer.

Không thêm Groq, OpenRouter, OpenAI hoặc provider khác nếu không được yêu cầu.

Nếu thêm provider mới, implement interface chung trước.

## Router

Giữ FastAPI router gọn.

Router chịu trách nhiệm:

- nhận request;
- validate;
- authentication dependency;
- gọi provider/service tương ứng;
- trả response đúng schema.

Không đặt prompt engine lớn, parsing phức tạp, retrieval hoặc SDK implementation trực tiếp trong router.

## Pydantic schema

Đặt request/response model trong `app/schemas`.

Không dùng `dict` tùy ý cho stable API contract nếu có thể định nghĩa schema rõ ràng.

Structured AI output như:

- quiz;
- question;
- rubric;
- recommendation;
- learning content

phải được validate bằng schema.

Nếu schema thuộc contract Backend ↔ AI Service, áp dụng `ailms-api-contract`.

## Security

AI Service là internal service.

Caller application chính là Backend.

Sử dụng security hiện có tại:

`app/core/security.py`

Không thêm unauthenticated public endpoint nếu không có yêu cầu kiến trúc rõ ràng.

Không bypass internal token để sửa lỗi nhanh.

API key và internal secret chỉ lấy từ environment/config.

## Logging

Dùng infrastructure tại:

`app/core/logging.py`

Ưu tiên log metadata:

- provider;
- model;
- latency;
- status;
- token usage nếu có.

Không log:

- API key;
- internal token;
- dữ liệu cá nhân không cần thiết;
- full prompt/response nhạy cảm.

## Model output

Luôn xem model output là dữ liệu không đáng tin cậy.

Không giả định Gemini luôn trả:

- JSON hợp lệ;
- schema hợp lệ;
- field đầy đủ.

Validate structured output trước khi trả qua service boundary.

Xử lý parse/provider error rõ ràng.

## RAG trong tương lai

Chỉ triển khai RAG khi feature thực sự yêu cầu.

Khi triển khai, tách responsibility:

- extraction;
- chunking;
- embedding;
- retrieval;
- ingestion;
- vector storage.

Không nhét toàn bộ pipeline vào FastAPI router.

Vector-store-specific logic phải được cô lập khỏi business flow.

Khi RAG chuyển từ "planned" thành "implemented", cập nhật tài liệu AI tương ứng.

## Python environment

Sử dụng virtual environment riêng của `ai-service`.

Không cài package vào Python hệ thống.

Đọc `requirements.txt` trước khi thêm dependency.

Không thêm library nếu dependency hiện tại đã giải quyết được.

## Test

Test nằm trong:

`ai-service/tests`

Chạy:

`pytest`

Thêm/cập nhật test khi thay đổi:

- endpoint;
- validation;
- security;
- provider behavior;
- response contract.

Không yêu cầu gọi Gemini thật cho unit test thông thường nếu có thể mock external provider.
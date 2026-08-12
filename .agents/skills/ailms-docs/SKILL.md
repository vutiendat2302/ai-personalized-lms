---
name: ailms-docs
description: Tạo và duy trì tài liệu Markdown/Mermaid cho AILMS. Sử dụng khi chỉnh README, backend/BACKEND.md, database/DATABASE.md, database/full.md, ai-service/README.md, docs/, tài liệu API, kiến trúc, ERD, flowchart, sequence diagram, business workflow hoặc hướng dẫn development. Không sử dụng cho thay đổi code thuần túy không ảnh hưởng tài liệu.
---

# AILMS Documentation

Tài liệu phải phản ánh implementation thực tế.

Luôn phân biệt rõ:

- đã implement;
- đang phát triển;
- planned architecture.

## Tài liệu chính

Tùy task, kiểm tra:

- `README.md`
- `AGENTS.md`
- `backend/BACKEND.md`
- `frontend/README.md`
- `ai-service/README.md`
- `database/DATABASE.md`
- `database/full.md`
- `docs/`

Không duplicate cùng một lượng lớn thông tin ở nhiều file.

## Tài liệu lớn

`backend/BACKEND.md` rất lớn.

Không đọc hoặc rewrite toàn bộ file cho một thay đổi nhỏ.

Tìm section trước:

`rg -n "^## |^### " backend/BACKEND.md`

Sau đó chỉ đọc module liên quan và context xung quanh.

## Markdown

Giữ heading hierarchy rõ ràng.

Dùng:

- list cho rule;
- numbered list cho workflow;
- table cho mapping/comparison chính xác;
- fenced code block cho code/config.

Không lạm dụng formatting trang trí.

## Mermaid

Dùng:

- `sequenceDiagram` → tương tác giữa các thành phần;
- `flowchart` → workflow;
- `erDiagram` → database relationship;
- `classDiagram` → class structure khi thực sự cần.

Diagram phải phản ánh implementation hiện tại.

Khi workflow đổi, cập nhật diagram liên quan.

## Source of truth

Source code và configuration có ưu tiên cao hơn tài liệu cũ.

Nếu tài liệu và source mâu thuẫn, xác minh source trước.

Không tự biến planned feature thành implemented feature.

Ví dụ: AI Service hiện đã có Gemini/provider/chat, nhưng RAG/embedding/vector store vẫn là planned nếu source chưa có.

## Khi cần cập nhật docs

Cập nhật khi thay đổi:

- API contract;
- database schema;
- authentication/authorization;
- architecture boundary;
- business workflow;
- environment/config;
- developer command;
- AI architecture đã implement.

Không rewrite wording của module khác khi không liên quan.

## Review

Trước khi hoàn thành, kiểm tra:

1. tên class/file/path;
2. endpoint;
3. field;
4. diagram flow;
5. implemented và planned;
6. command hướng dẫn developer.

Tài liệu phải mô tả trạng thái cuối cùng của source.
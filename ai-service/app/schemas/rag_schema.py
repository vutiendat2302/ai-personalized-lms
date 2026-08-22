from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class IngestRequest(BaseModel):
    """
    Schema yêu cầu nạp tài liệu vào kho tri thức RAG nội bộ (RAG Ingestion Request).

    Cơ chế hoạt động và kiểm định an toàn (Validation Guardrails):
    - Nhận dữ liệu tài liệu dạng text (`content`) hoặc tệp nhị phân mã hóa Base64 (`fileBase64`).
    - Kiểm soát nghiêm ngặt `allowedRoles` (phải có dạng 'ROLE_*' hoặc 'ALL') và phân vùng theo `module`, `domain`.
    - Kiểm tra loại file: PDF, DOCX, hoặc Ảnh (`image/png`, `image/jpeg`).
    """

    source_id: str = Field(alias="sourceId", min_length=1)
    source_type: Literal["text", "pdf", "docx", "image"] = Field(alias="sourceType")
    content: str | None = None
    file_base64: str | None = Field(default=None, alias="fileBase64")
    mime_type: str | None = Field(default=None, alias="mimeType")
    module: str = Field(default="GENERAL", min_length=1)
    domain: str = Field(min_length=1)
    allowed_roles: list[str] = Field(alias="allowedRoles", min_length=1)
    course_id: str | None = Field(default=None, alias="courseId")
    section_id: str | None = Field(default=None, alias="sectionId")
    lesson_id: str | None = Field(default=None, alias="lessonId")
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_source(self) -> "IngestRequest":
        """Xác thực tính hợp lệ của nguồn dữ liệu và phân quyền trước khi thực thi Ingestion."""
        if self.source_type == "text" and not self.content:
            raise ValueError("Nguồn text phải có content")
        if self.source_type in {"pdf", "docx", "image"} and not self.file_base64:
            raise ValueError("Nguồn PDF/DOCX/ảnh phải có fileBase64")
        if self.source_type == "image" and self.mime_type not in {
            "image/png",
            "image/jpeg",
        }:
            raise ValueError("Ảnh chỉ hỗ trợ image/png hoặc image/jpeg")
        if not self.allowed_roles:
            raise ValueError("allowedRoles không được để trống")
        if any(
            not role.upper().startswith("ROLE_") and role.upper() != "ALL"
            for role in self.allowed_roles
        ):
            raise ValueError("allowedRoles chỉ nhận ROLE_* hoặc ALL")
        return self


class IngestResponse(BaseModel):
    """
    Schema kết quả trả về sau khi hoàn thành quá trình nạp tài liệu (Ingestion Result).

    Cơ chế hoạt động:
    - Báo cáo trạng thái `status` ('ingested'), số lượng phân đoạn đã lưu `chunksCount` và kiểu nguồn `sourceType`.
    """

    status: Literal["ingested"] = "ingested"
    chunks_count: int = Field(alias="chunksCount")
    source_type: str = Field(alias="sourceType")

    model_config = {"populate_by_name": True}


class SearchRequest(BaseModel):
    """
    Schema yêu cầu tìm kiếm vector nội bộ kèm phân quyền thực (RAG Internal Search Request).

    Cơ chế hoạt động:
    - Tiếp nhận câu hỏi `query`, số lượng kết quả `limit`, ngưỡng tương đồng tối thiểu `minScore` (mặc định 0.65),
      danh sách quyền của người dùng `roles` và các filter nghiệp vụ mở rộng `filters`.
    """

    query: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)
    min_score: float = Field(default=0.65, alias="minScore", ge=0.0, le=1.0)
    roles: list[str] = Field(min_length=1)
    filters: dict[str, str | list[str]] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class SearchItem(BaseModel):
    """
    Schema biểu diễn một phân đoạn tài liệu tìm thấy trong kho tri thức (RAG Search Hit).

    Cơ chế hoạt động:
    - Chứa điểm tương đồng cosine `score`, nội dung văn bản `text` và metadata chi tiết `metadata`.
    """

    score: float
    text: str
    metadata: dict[str, Any]

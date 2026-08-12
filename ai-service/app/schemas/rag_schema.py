from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class IngestRequest(BaseModel):
    """Payload ingest text hoặc file do backend gửi nội bộ."""

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
        """Bắt buộc text dùng content và file dùng base64."""
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
    """Kết quả ingestion đồng bộ."""

    status: Literal["ingested"] = "ingested"
    chunks_count: int = Field(alias="chunksCount")
    source_type: str = Field(alias="sourceType")

    model_config = {"populate_by_name": True}


class SearchRequest(BaseModel):
    """Payload tìm kiếm nội bộ với role thật do backend cung cấp."""

    query: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)
    roles: list[str] = Field(min_length=1)
    filters: dict[str, str | list[str]] = Field(default_factory=dict)


class SearchItem(BaseModel):
    """Một chunk cùng điểm tương đồng và metadata nguồn."""

    score: float
    text: str
    metadata: dict[str, Any]

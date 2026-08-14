from typing import Any, Literal

from pydantic import BaseModel, Field


class CatalogIndexRequest(BaseModel):
    """Dữ liệu catalog do Backend gửi để tạo hoặc cập nhật embedding."""

    source_id: str = Field(alias="sourceId", min_length=1)
    entity_type: Literal["category", "course"] = Field(alias="entityType")
    text: str = Field(min_length=1, max_length=12000)
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class CatalogSearchRequest(BaseModel):
    """Yêu cầu tìm catalog gần nghĩa với một danh mục hoặc khóa học."""

    query: str = Field(min_length=1, max_length=12000)
    entity_type: Literal["category", "course"] = Field(alias="entityType")
    limit: int = Field(default=50, ge=1, le=200)
    filters: dict[str, str | int | list[str]] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class CatalogIndexBatchRequest(BaseModel):
    """Batch catalog dùng để backfill nhiều course/category bằng local model."""

    items: list[CatalogIndexRequest] = Field(min_length=1, max_length=500)


class CatalogSearchItem(BaseModel):
    """Một kết quả catalog cùng điểm cosine similarity."""

    id: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)

from typing import Any, Literal

from pydantic import BaseModel, Field


class CatalogIndexRequest(BaseModel):
    """
    Schema yêu cầu đánh chỉ mục vector cho một khóa học hoặc danh mục công khai (Catalog Index Request).

    Cơ chế hoạt động:
    - Nhận `sourceId`, loại thực thể `entityType` ('category' hoặc 'course'), văn bản mô tả `text` và metadata.
    """

    source_id: str = Field(alias="sourceId", min_length=1)
    entity_type: Literal["category", "course"] = Field(alias="entityType")
    text: str = Field(min_length=1, max_length=12000)
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class CatalogSearchRequest(BaseModel):
    """
    Schema yêu cầu tìm kiếm ngữ nghĩa khóa học/danh mục tương tự (Semantic Catalog Search Request).

    Cơ chế hoạt động:
    - Nhận chuỗi truy vấn `query`, loại thực thể cần tìm `entityType`, số lượng kết quả `limit` và bộ lọc `filters`.
    """

    query: str = Field(min_length=1, max_length=12000)
    entity_type: Literal["category", "course"] = Field(alias="entityType")
    limit: int = Field(default=50, ge=1, le=200)
    filters: dict[str, str | int | list[str]] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class CatalogIndexBatchRequest(BaseModel):
    """
    Schema yêu cầu đánh chỉ mục hàng loạt cho nhiều khóa học/danh mục (Catalog Batch Index Request).

    Cơ chế hoạt động:
    - Nhận danh sách tối đa 500 `CatalogIndexRequest` để xử lý gom mẻ, tính content-hash và embedding tối ưu.
    """

    items: list[CatalogIndexRequest] = Field(min_length=1, max_length=500)


class CatalogSearchItem(BaseModel):
    """
    Schema biểu diễn một kết quả tìm kiếm khóa học/danh mục kèm độ tương đồng (Catalog Search Hit).

    Cơ chế hoạt động:
    - Chứa `id` (sourceId), điểm cosine similarity `score`, và `metadata` của thực thể.
    """

    id: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)

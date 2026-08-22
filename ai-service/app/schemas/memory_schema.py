from typing import Any

from pydantic import BaseModel, Field


class RememberRequest(BaseModel):
    """
    Schema yêu cầu ghi nhớ một sự kiện hoặc thông tin người dùng vào bộ nhớ dài hạn (Remember Request).

    Cơ chế hoạt động:
    - Chứa nội dung ký ức (`content`), phạm vi nghiệp vụ (`scope`) và metadata mở rộng.
    """

    content: str = Field(min_length=1, max_length=10000)
    scope: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecallRequest(BaseModel):
    """
    Schema yêu cầu truy xuất hồi tưởng ký ức người dùng theo ngữ nghĩa (Recall Request).

    Cơ chế hoạt động:
    - Bắt buộc phải có `ownerId` và `scope` để phân vùng người dùng, cùng câu hỏi `query` và số lượng tối đa `limit`.
    """

    owner_id: str = Field(alias="ownerId", min_length=1)
    scope: str = Field(min_length=1)
    query: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class MemoryItem(BaseModel):
    """
    Schema biểu diễn một mẩu ký ức đã truy xuất kèm điểm tương đồng (Recalled Memory Item).

    Cơ chế hoạt động:
    - Chứa `memoryId`, nội dung `content`, điểm cosine score `score` và `metadata` của ký ức.
    """

    memory_id: str = Field(alias="memoryId")
    content: str
    score: float
    metadata: dict[str, Any]

    model_config = {"populate_by_name": True}

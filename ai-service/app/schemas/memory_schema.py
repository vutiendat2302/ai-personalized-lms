from typing import Any

from pydantic import BaseModel, Field


class RememberRequest(BaseModel):
    """Nội dung memory đã được backend cho phép lưu."""

    content: str = Field(min_length=1, max_length=10000)
    scope: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecallRequest(BaseModel):
    """Truy vấn memory luôn nằm trong scope của owner."""

    owner_id: str = Field(alias="ownerId", min_length=1)
    scope: str = Field(min_length=1)
    query: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class MemoryItem(BaseModel):
    """Một memory semantic cùng điểm tương đồng."""

    memory_id: str = Field(alias="memoryId")
    content: str
    score: float
    metadata: dict[str, Any]

    model_config = {"populate_by_name": True}

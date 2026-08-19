from abc import ABC, abstractmethod
from typing import Any

from app.rag.models import SearchResult, VectorRecord


class BaseVectorStore(ABC):
    """Hợp đồng vector store để có thể thay Qdrant về sau."""

    @abstractmethod
    async def ensure_collection(self, collection: str, dimension: int) -> None:
        """Tạo collection khi chưa tồn tại."""
        raise NotImplementedError

    @abstractmethod
    async def upsert(self, collection: str, records: list[VectorRecord]) -> None:
        """Ghi hoặc cập nhật các vector record."""
        raise NotImplementedError

    @abstractmethod
    async def delete_by_filter(self, collection: str, filters: dict[str, Any]) -> None:
        """Xóa record theo payload filter."""
        raise NotImplementedError

    @abstractmethod
    async def search(
        self,
        collection: str,
        vector: list[float],
        limit: int,
        filters: dict[str, Any],
        score_threshold: float | None = None,
    ) -> list[SearchResult]:
        """Tìm vector gần nhất với filter tùy chọn và ngưỡng cosine similarity."""
        raise NotImplementedError

    @abstractmethod
    async def get_payload_field(
        self, collection: str, key: str, values: list[str], field: str
    ) -> dict[str, Any]:
        """Lấy nhanh một trường payload theo danh sách giá trị lọc mà không tải vector."""
        raise NotImplementedError

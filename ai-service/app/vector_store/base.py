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
        self, collection: str, vector: list[float], limit: int, filters: dict[str, Any]
    ) -> list[SearchResult]:
        """Tìm vector gần nhất với filter tùy chọn."""
        raise NotImplementedError

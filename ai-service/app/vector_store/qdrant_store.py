from typing import Any

from qdrant_client import AsyncQdrantClient, models

from app.core.config import settings
from app.rag.models import SearchResult, VectorRecord
from app.vector_store.base import BaseVectorStore


class QdrantVectorStore(BaseVectorStore):
    """Hiện thực vector store bằng Qdrant async client."""

    def __init__(self, client: AsyncQdrantClient | None = None) -> None:
        """Khởi tạo client từ ENV hoặc nhận client phục vụ test."""
        self.client = client or AsyncQdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
            check_compatibility=False,
        )

    async def ensure_collection(self, collection: str, dimension: int) -> None:
        """Tạo cosine collection idempotent khi cần."""
        if not await self.client.collection_exists(collection):
            await self.client.create_collection(
                collection_name=collection,
                vectors_config=models.VectorParams(
                    size=dimension, distance=models.Distance.COSINE
                ),
            )

    async def upsert(self, collection: str, records: list[VectorRecord]) -> None:
        """Upsert record theo batch vào collection."""
        if not records:
            return
        await self.client.upsert(
            collection_name=collection,
            points=[
                models.PointStruct(id=item.id, vector=item.vector, payload=item.payload)
                for item in records
            ],
            wait=True,
        )

    async def delete_by_filter(self, collection: str, filters: dict[str, Any]) -> None:
        """Xóa toàn bộ point khớp các điều kiện payload."""
        await self.client.delete(
            collection_name=collection,
            points_selector=models.FilterSelector(filter=self._filter(filters)),
            wait=True,
        )

    async def search(
        self,
        collection: str,
        vector: list[float],
        limit: int,
        filters: dict[str, Any],
        score_threshold: float | None = None,
    ) -> list[SearchResult]:
        """Query Qdrant và chuyển kết quả về model trung gian có lọc ngưỡng điểm tương đồng."""
        response = await self.client.query_points(
            collection_name=collection,
            query=vector,
            query_filter=self._filter(filters) if filters else None,
            limit=limit,
            score_threshold=score_threshold,
            with_payload=True,
        )
        return [
            SearchResult(
                id=str(point.id), score=point.score, payload=dict(point.payload or {})
            )
            for point in response.points
        ]

    async def get_payload_field(
        self,
        collection: str,
        key: str,
        values: list[str],
        field: str,
    ) -> dict[str, Any]:
        """Lấy nhanh một trường payload theo danh sách giá trị lọc mà không tải vector."""
        if not values:
            return {}
        if not await self.client.collection_exists(collection):
            return {}
        result: dict[str, Any] = {}
        offset = None
        scroll_filter = self._filter({key: values})
        while True:
            records, offset = await self.client.scroll(
                collection_name=collection,
                scroll_filter=scroll_filter,
                with_payload=[field, key],
                with_vectors=False,
                limit=256,
                offset=offset,
            )
            for point in records:
                if point.payload:
                    source_val = point.payload.get(key)
                    field_val = point.payload.get(field)
                    if source_val is not None and field_val is not None:
                        result[str(source_val)] = field_val
            if offset is None:
                break
        return result

    @staticmethod
    def _filter(filters: dict[str, Any]) -> models.Filter:
        """Chuyển dictionary thành exact hoặc MatchAny filter của Qdrant."""
        return models.Filter(
            must=[QdrantVectorStore._condition(key, value) for key, value in filters.items()
                  if not key.startswith("!")],
            must_not=[QdrantVectorStore._condition(key[1:], value) for key, value in filters.items()
                      if key.startswith("!")],
        )

    @staticmethod
    def _condition(key: str, value: Any) -> models.FieldCondition:
        """Tạo điều kiện exact hoặc match-any cho payload list."""
        match = (
            models.MatchAny(any=value)
            if isinstance(value, list)
            else models.MatchValue(value=value)
        )
        return models.FieldCondition(key=key, match=match)

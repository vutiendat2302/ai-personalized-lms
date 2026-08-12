from typing import Any

import pytest

from app.rag.embedder import BaseEmbedder
from app.rag.ingestion_pipeline import IngestionPipeline
from app.rag.models import SearchResult, VectorRecord
from app.vector_store.base import BaseVectorStore


class StubEmbedder(BaseEmbedder):
    """Embedder xác định dùng để test pipeline không gọi mạng."""

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Trả một vector cố định cho mỗi document."""
        return [[1.0, 0.0] for _ in texts]

    async def embed_query(self, text: str) -> list[float]:
        """Trả vector truy vấn cố định."""
        return [1.0, 0.0]

    async def embed_media(self, file_bytes: bytes, mime_type: str) -> list[float]:
        """Trả vector media cố định."""
        return [1.0, 0.0]


class StubVectorStore(BaseVectorStore):
    """Vector store trong bộ nhớ để kiểm tra orchestration."""

    def __init__(self) -> None:
        """Khởi tạo danh sách ghi và filter xóa đã nhận."""
        self.records: list[VectorRecord] = []
        self.deleted_filters: list[dict[str, Any]] = []

    async def ensure_collection(self, collection: str, dimension: int) -> None:
        """Không tạo hạ tầng trong unit test."""

    async def upsert(self, collection: str, records: list[VectorRecord]) -> None:
        """Lưu lại records để assertion."""
        self.records.extend(records)

    async def delete_by_filter(self, collection: str, filters: dict[str, Any]) -> None:
        """Lưu filter xóa để assertion."""
        self.deleted_filters.append(filters)

    async def search(
        self, collection: str, vector: list[float], limit: int, filters: dict[str, Any]
    ) -> list[SearchResult]:
        """Không cần search trong test ingestion."""
        return []


@pytest.mark.asyncio
async def test_pipeline_replaces_source_vectors() -> None:
    """Kiểm tra ingest xóa nguồn cũ rồi upsert payload có scope."""
    store = StubVectorStore()
    pipeline = IngestionPipeline(embedder=StubEmbedder(), vector_store=store)
    count = await pipeline.ingest(
        source_id="lesson-1",
        source_type="text",
        content="Nội dung bài học dùng cho RAG.",
        file_bytes=None,
        metadata={"courseId": "course-1"},
    )
    assert count == 1
    assert store.deleted_filters == [{"sourceId": "lesson-1"}]
    assert store.records[0].payload["courseId"] == "course-1"


@pytest.mark.asyncio
async def test_pipeline_deletes_source_by_stable_id() -> None:
    """Kiểm tra xóa entity gốc sẽ xóa toàn bộ vector theo sourceId."""
    store = StubVectorStore()
    pipeline = IngestionPipeline(embedder=StubEmbedder(), vector_store=store)

    await pipeline.delete_source("345050865599516672")

    assert store.deleted_filters == [{"sourceId": "345050865599516672"}]

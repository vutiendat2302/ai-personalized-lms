from typing import Any

from app.core.config import settings
from app.rag.embedder import BaseEmbedder, GeminiEmbedder
from app.rag.models import SearchResult
from app.vector_store.base import BaseVectorStore
from app.vector_store.qdrant_store import QdrantVectorStore


class Retriever:
    """Tìm kiếm semantic trên nội dung đã ingest."""

    def __init__(
        self,
        embedder: BaseEmbedder | None = None,
        vector_store: BaseVectorStore | None = None,
    ) -> None:
        """Nhận dependency tách rời để dễ đổi provider và database."""
        self.embedder = embedder or GeminiEmbedder()
        self.vector_store = vector_store or QdrantVectorStore()

    async def retrieve(
        self, query: str, filters: dict[str, Any], limit: int = 5
    ) -> list[SearchResult]:
        """Embedding câu hỏi rồi tìm các chunk liên quan nhất."""
        vector = await self.embedder.embed_query(query)
        await self.vector_store.ensure_collection(
            settings.QDRANT_CONTENT_COLLECTION, settings.EMBEDDING_DIMENSION
        )
        return await self.vector_store.search(
            settings.QDRANT_CONTENT_COLLECTION, vector, limit, filters
        )

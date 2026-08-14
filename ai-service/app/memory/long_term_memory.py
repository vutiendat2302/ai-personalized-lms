import uuid
from typing import Any

from app.core.config import settings
from app.rag.embedder import BaseEmbedder, GeminiEmbedder
from app.rag.models import SearchResult, VectorRecord
from app.vector_store.base import BaseVectorStore
from app.vector_store.qdrant_store import QdrantVectorStore


class LongTermMemoryStore:
    """Lưu memory semantic theo chủ thể trong collection biệt lập."""

    def __init__(
        self,
        embedder: BaseEmbedder | None = None,
        vector_store: BaseVectorStore | None = None,
    ) -> None:
        """Nhận dependency tách rời để hỗ trợ test và thay hạ tầng."""
        self.embedder = embedder or GeminiEmbedder()
        self.vector_store = vector_store or QdrantVectorStore()

    async def remember(
        self,
        owner_id: str,
        scope: str,
        memory_id: str,
        content: str,
        metadata: dict[str, Any],
    ) -> None:
        """Ghi memory có ID ổn định trong owner và scope trách nhiệm."""
        vector = (await self.embedder.embed_documents([content]))[0]
        collection = settings.QDRANT_MEMORY_COLLECTION
        await self.vector_store.ensure_collection(
            collection, settings.EMBEDDING_DIMENSION
        )
        point_id = str(
            uuid.uuid5(uuid.NAMESPACE_URL, f"{owner_id}:{scope}:{memory_id}")
        )
        await self.vector_store.upsert(
            collection,
            [
                VectorRecord(
                    id=point_id,
                    vector=vector,
                    payload={
                        **metadata,
                        "ownerId": owner_id,
                        "scope": scope,
                        "memoryId": memory_id,
                        "content": content,
                    },
                )
            ],
        )

    async def recall(
        self, owner_id: str, scope: str, query: str, limit: int = 5
    ) -> list[SearchResult]:
        """Tìm memory liên quan và khóa theo owner cùng scope."""
        vector = await self.embedder.embed_query(query)
        await self.vector_store.ensure_collection(
            settings.QDRANT_MEMORY_COLLECTION, settings.EMBEDDING_DIMENSION
        )
        return await self.vector_store.search(
            settings.QDRANT_MEMORY_COLLECTION,
            vector,
            limit,
            {"ownerId": owner_id, "scope": scope},
        )

    async def forget(
        self, owner_id: str, scope: str, memory_id: str | None = None
    ) -> None:
        """Xóa một memory hoặc toàn bộ memory thuộc owner và scope."""
        filters = {"ownerId": owner_id, "scope": scope}
        if memory_id:
            filters["memoryId"] = memory_id
        await self.vector_store.ensure_collection(
            settings.QDRANT_MEMORY_COLLECTION, settings.EMBEDDING_DIMENSION
        )
        await self.vector_store.delete_by_filter(
            settings.QDRANT_MEMORY_COLLECTION, filters
        )

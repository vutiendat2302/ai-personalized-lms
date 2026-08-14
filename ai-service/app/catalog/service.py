from app.core.config import settings
from app.catalog.local_embedder import LocalCatalogEmbedder
from app.rag.models import VectorRecord
from app.vector_store.qdrant_store import QdrantVectorStore
import uuid


class CatalogVectorService:
    """Quản lý embedding và semantic search riêng cho catalog công khai."""

    def __init__(self) -> None:
        """Khởi tạo embedder và vector store dùng chung hạ tầng AI hiện có."""
        self.embedder = LocalCatalogEmbedder()
        self.vector_store = QdrantVectorStore()

    def collection(self, entity_type: str) -> str:
        """Chọn collection tách biệt cho category hoặc course."""
        return f"{settings.QDRANT_CATALOG_LOCAL_COLLECTION_PREFIX}_{entity_type}"

    async def index(self, source_id: str, entity_type: str, text: str, metadata: dict) -> None:
        """Embedding và upsert một bản ghi catalog theo ID ổn định."""
        vector = (await self.embedder.embed_documents([text]))[0]
        collection = self.collection(entity_type)
        await self.vector_store.ensure_collection(collection, len(vector))
        await self.vector_store.upsert(
            collection,
            [VectorRecord(id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"catalog:{entity_type}:{source_id}")),
                          vector=vector, payload={"sourceId": source_id, **metadata})],
        )

    async def index_batch(self, items: list[dict]) -> None:
        """Embed và upsert batch tối đa 500 catalog record trong một lần."""
        grouped: dict[str, list[dict]] = {}
        for item in items:
            grouped.setdefault(item["entityType"], []).append(item)
        for entity_type, records in grouped.items():
            vectors = await self.embedder.embed_documents([item["text"] for item in records])
            collection = self.collection(entity_type)
            await self.vector_store.ensure_collection(collection, len(vectors[0]))
            await self.vector_store.upsert(collection, [
                VectorRecord(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"catalog:{entity_type}:{item['sourceId']}")),
                    vector=vector,
                    payload={"sourceId": item["sourceId"], **item.get("metadata", {})},
                )
                for item, vector in zip(records, vectors, strict=True)
            ])

    async def delete(self, source_id: str, entity_type: str) -> None:
        """Xóa embedding catalog khi bản ghi bị xóa hoặc không còn sử dụng."""
        collection = self.collection(entity_type)
        await self.vector_store.ensure_collection(collection, settings.CATALOG_EMBEDDING_DIMENSION)
        await self.vector_store.delete_by_filter(collection, {"sourceId": source_id})

    async def search(self, query: str, entity_type: str, limit: int, filters: dict):
        """Tìm các catalog gần nghĩa bằng cosine similarity trong Qdrant."""
        vector = await self.embedder.embed_query(query)
        collection = self.collection(entity_type)
        await self.vector_store.ensure_collection(collection, settings.CATALOG_EMBEDDING_DIMENSION)
        qdrant_filters = dict(filters)
        if "excludeCategoryId" in qdrant_filters:
            qdrant_filters["!categoryId"] = qdrant_filters.pop("excludeCategoryId")
        if "excludeCourseId" in qdrant_filters:
            qdrant_filters["!courseId"] = qdrant_filters.pop("excludeCourseId")
        return await self.vector_store.search(collection, vector, limit, qdrant_filters)

import hashlib
from typing import Any
import uuid

from app.catalog.local_embedder import LocalCatalogEmbedder, clean_text
from app.core.config import settings
from app.rag.models import SearchResult, VectorRecord
from app.vector_store.qdrant_store import QdrantVectorStore


class CatalogVectorService:
    """Quản lý embedding và semantic search riêng cho catalog công khai."""

    def __init__(self) -> None:
        """Khởi tạo embedder, vector store và tập hợp cache collection đã kiểm tra."""
        self.embedder = LocalCatalogEmbedder()
        self.vector_store = QdrantVectorStore()
        self._ensured: set[str] = set()

    def collection(self, entity_type: str) -> str:
        """Chọn collection tách biệt cho category hoặc course."""
        return f"{settings.QDRANT_CATALOG_LOCAL_COLLECTION_PREFIX}_{entity_type}"

    @staticmethod
    def _content_hash(text: str) -> str:
        """Tính mã băm SHA-256 của văn bản để phát hiện thay đổi nội dung."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    async def _ensure_once(self, collection: str, dimension: int) -> None:
        """Đảm bảo collection tồn tại một lần duy nhất trong vòng đời service."""
        if collection not in self._ensured:
            await self.vector_store.ensure_collection(collection, dimension)
            self._ensured.add(collection)

    async def index(
        self, source_id: str, entity_type: str, text: str, metadata: dict[str, Any]
    ) -> None:
        """Embedding và upsert một bản ghi catalog khi nội dung có thay đổi."""
        cleaned_text = clean_text(text)
        content_hash = self._content_hash(cleaned_text)
        collection = self.collection(entity_type)
        await self._ensure_once(collection, settings.CATALOG_EMBEDDING_DIMENSION)

        existing_hashes = await self.vector_store.get_payload_field(
            collection, key="sourceId", values=[source_id], field="contentHash"
        )
        if existing_hashes.get(str(source_id)) == content_hash:
            return

        vector = (await self.embedder.embed_documents([cleaned_text]))[0]
        await self.vector_store.upsert(
            collection,
            [
                VectorRecord(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"catalog:{entity_type}:{source_id}")),
                    vector=vector,
                    payload={"sourceId": source_id, "contentHash": content_hash, **metadata},
                )
            ],
        )

    async def index_batch(self, items: list[dict[str, Any]]) -> None:
        """Embed và upsert batch catalog record, bỏ qua các bản ghi không đổi hash."""
        if not items:
            return

        grouped: dict[str, list[dict[str, Any]]] = {}
        for item in items:
            grouped.setdefault(item["entityType"], []).append(item)

        for entity_type, records in grouped.items():
            collection = self.collection(entity_type)
            await self._ensure_once(collection, settings.CATALOG_EMBEDDING_DIMENSION)

            processed_items: list[dict[str, Any]] = []
            source_ids: list[str] = []
            for item in records:
                c_text = clean_text(item.get("text", ""))
                c_hash = self._content_hash(c_text)
                processed_items.append({"item": item, "cleaned_text": c_text, "hash": c_hash})
                source_ids.append(str(item["sourceId"]))

            existing_hashes = await self.vector_store.get_payload_field(
                collection, key="sourceId", values=source_ids, field="contentHash"
            )

            to_index = [
                p
                for p in processed_items
                if existing_hashes.get(str(p["item"]["sourceId"])) != p["hash"]
            ]

            if not to_index:
                continue

            texts_to_embed = [p["cleaned_text"] for p in to_index]
            vectors = await self.embedder.embed_documents(texts_to_embed)

            await self.vector_store.upsert(
                collection,
                [
                    VectorRecord(
                        id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"catalog:{entity_type}:{p['item']['sourceId']}")),
                        vector=vector,
                        payload={
                            "sourceId": p["item"]["sourceId"],
                            "contentHash": p["hash"],
                            **p["item"].get("metadata", {}),
                        },
                    )
                    for p, vector in zip(to_index, vectors, strict=True)
                ],
            )

    async def delete(self, source_id: str, entity_type: str) -> None:
        """Xóa embedding catalog khi bản ghi bị xóa hoặc không còn sử dụng."""
        collection = self.collection(entity_type)
        await self._ensure_once(collection, settings.CATALOG_EMBEDDING_DIMENSION)
        await self.vector_store.delete_by_filter(collection, {"sourceId": source_id})

    async def search(
        self, query: str, entity_type: str, limit: int, filters: dict[str, Any]
    ) -> list[SearchResult]:
        """Tìm các catalog gần nghĩa bằng cosine similarity trong Qdrant."""
        cleaned_query = clean_text(query)
        vector = await self.embedder.embed_query(cleaned_query)
        collection = self.collection(entity_type)
        await self._ensure_once(collection, settings.CATALOG_EMBEDDING_DIMENSION)
        qdrant_filters = dict(filters)
        if "excludeCategoryId" in qdrant_filters:
            qdrant_filters["!categoryId"] = qdrant_filters.pop("excludeCategoryId")
        if "excludeCourseId" in qdrant_filters:
            qdrant_filters["!courseId"] = qdrant_filters.pop("excludeCourseId")
        return await self.vector_store.search(collection, vector, limit, qdrant_filters)

import uuid
from typing import Any

import fitz

from app.core.config import settings
from app.rag.chunker import RecursiveTextChunker
from app.rag.embedder import BaseEmbedder, GeminiEmbedder
from app.rag.extractors.factory import ExtractorFactory
from app.rag.models import ExtractedDocument, VectorRecord
from app.vector_store.base import BaseVectorStore
from app.vector_store.qdrant_store import QdrantVectorStore


class IngestionPipeline:
    """Điều phối extract, chunk, embed và upsert đồng bộ theo request."""

    def __init__(
        self,
        extractor_factory: ExtractorFactory | None = None,
        chunker: RecursiveTextChunker | None = None,
        embedder: BaseEmbedder | None = None,
        vector_store: BaseVectorStore | None = None,
    ) -> None:
        """Khởi tạo pipeline với dependency có thể thay thế khi test/mở rộng."""
        self.extractor_factory = extractor_factory or ExtractorFactory()
        self.chunker = chunker or RecursiveTextChunker(
            settings.CHUNK_SIZE, settings.CHUNK_OVERLAP
        )
        self.embedder = embedder or GeminiEmbedder()
        self.vector_store = vector_store or QdrantVectorStore()

    async def ingest(
        self,
        *,
        source_id: str,
        source_type: str,
        content: str | None,
        file_bytes: bytes | None,
        metadata: dict[str, Any],
    ) -> int:
        """Thay toàn bộ vector cũ của nguồn bằng các chunk mới."""
        extractor = self.extractor_factory.get(source_type)
        document = await extractor.extract(content=content, file_bytes=file_bytes)
        chunks = self.chunker.chunk(document)
        if not chunks:
            raise ValueError("Nguồn không tạo được chunk nào")
        vectors = await self.embedder.embed_documents([chunk.text for chunk in chunks])
        if len(vectors) != len(chunks):
            raise RuntimeError("Số embedding trả về không khớp số chunk")
        collection = settings.QDRANT_CONTENT_COLLECTION
        await self.vector_store.ensure_collection(
            collection, settings.EMBEDDING_DIMENSION
        )
        await self.vector_store.delete_by_filter(collection, {"sourceId": source_id})
        records = [
            VectorRecord(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"{source_id}:{chunk.index}")),
                vector=vector,
                payload={
                    **metadata,
                    **chunk.metadata,
                    "sourceId": source_id,
                    "sourceType": source_type,
                    "chunkIndex": chunk.index,
                    "chunkText": chunk.text,
                },
            )
            for chunk, vector in zip(chunks, vectors, strict=True)
        ]
        media_record = await self._media_record(
            source_id, source_type, file_bytes, metadata, document
        )
        if media_record:
            records.append(media_record)
        await self.vector_store.upsert(collection, records)
        return len(records)

    async def delete_source(self, source_id: str) -> None:
        """Xóa toàn bộ vector của một nguồn theo sourceId ổn định."""
        collection = settings.QDRANT_CONTENT_COLLECTION
        await self.vector_store.ensure_collection(
            collection, settings.EMBEDDING_DIMENSION
        )
        await self.vector_store.delete_by_filter(collection, {"sourceId": source_id})

    async def _media_record(
        self,
        source_id: str,
        source_type: str,
        file_bytes: bytes | None,
        metadata: dict[str, Any],
        document: ExtractedDocument,
    ) -> VectorRecord | None:
        """Tạo thêm vector multimodal trực tiếp cho ảnh hoặc PDF tối đa sáu trang."""
        if not file_bytes or source_type not in {"image", "pdf"}:
            return None
        if source_type == "pdf":
            with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
                if len(pdf) > 6:
                    return None
            mime_type = "application/pdf"
        else:
            mime_type = str(metadata.get("mimeType", "image/png"))
        vector = await self.embedder.embed_media(file_bytes, mime_type)
        extracted_text = "\n".join(segment.text for segment in document.segments)
        return VectorRecord(
            id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"{source_id}:multimodal")),
            vector=vector,
            payload={
                **metadata,
                "sourceId": source_id,
                "sourceType": source_type,
                "chunkIndex": -1,
                "chunkText": extracted_text[:8000],
                "representation": "multimodal",
            },
        )

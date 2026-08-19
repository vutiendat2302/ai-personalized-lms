import uuid
from typing import Any

import fitz

from app.core.config import settings
from app.rag.chunker import RecursiveTextChunker
from app.rag.embedder import BaseEmbedder, LocalRagEmbedder
from app.rag.extractors.factory import ExtractorFactory
from app.rag.models import ExtractedDocument, VectorRecord
from app.vector_store.base import BaseVectorStore
from app.vector_store.qdrant_store import QdrantVectorStore


class IngestionPipeline:
    """
    Quy trình nạp và chỉ mục hóa tài liệu đa phương thức (RAG Ingestion Pipeline).

    Cơ chế hoạt động và nguyên tắc Idempotent Ingestion:
    1. Trích xuất (Extract): Nhận diện định dạng tệp (PDF, DOCX, Ảnh, Text) và bóc tách thành văn bản chuẩn hóa.
    2. Cắt đoạn (Chunk): Phân chia văn bản thành các đoạn nhỏ bảo toàn câu/đoạn và metadata.
    3. Nhúng vector (Embed): Sinh vector 768 chiều cho toàn bộ các chunk văn bản.
    4. Xóa cũ - Ghi mới (Clean-then-Upsert): Trước khi lưu vector mới, pipeline tự động xóa sạch toàn bộ các point cũ
       có cùng `sourceId` trên Qdrant để triệt tiêu nguy cơ trùng lặp dữ liệu khi tài liệu được cập nhật lại.
    5. Đa phương thức bổ trợ (Multimodal Enrichment): Với tài liệu ảnh hoặc PDF ngắn (dưới 6 trang), tạo thêm 1 vector
       nhúng trực tiếp từ file nhị phân (`representation="multimodal"`) để tăng cường khả năng tìm kiếm hình ảnh biểu đồ.
    """

    def __init__(
        self,
        extractor_factory: ExtractorFactory | None = None,
        chunker: RecursiveTextChunker | None = None,
        embedder: BaseEmbedder | None = None,
        vector_store: BaseVectorStore | None = None,
    ) -> None:
        """
        Khởi tạo IngestionPipeline với các thành phần pipeline có thể thay thế.

        Args:
            extractor_factory (ExtractorFactory | None): Factory chọn bộ trích xuất theo định dạng.
            chunker (RecursiveTextChunker | None): Bộ chia nhỏ văn bản.
            embedder (BaseEmbedder | None): Trình tạo vector nhúng (mặc định GeminiEmbedder).
            vector_store (BaseVectorStore | None): Cơ sở dữ liệu vector (mặc định QdrantVectorStore).
        """
        self.extractor_factory = extractor_factory or ExtractorFactory()
        self.chunker = chunker or RecursiveTextChunker(
            settings.CHUNK_SIZE, settings.CHUNK_OVERLAP
        )
        self.embedder = embedder or LocalRagEmbedder()
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
        """
        Điều phối toàn bộ quy trình nạp một tài liệu mới hoặc cập nhật tài liệu đã có vào Qdrant.

        Cơ chế:
        1. Lấy extractor phù hợp từ factory dựa vào `source_type` và gọi `extract()`.
        2. Chạy `chunker.chunk()` trên tài liệu trích xuất được.
        3. Gọi `embedder.embed_documents()` để tính vector cho toàn bộ chunk văn bản.
        4. Gọi `delete_by_filter(sourceId=source_id)` để xóa sạch dữ liệu cũ của nguồn này.
        5. Tạo danh sách `VectorRecord` với ID UUIDv5 ổn định và upsert vào collection `management_knowledge`.
        6. Nếu là ảnh hoặc PDF ngắn, bổ sung thêm 1 vector multimodal qua `_media_record()`.

        Args:
            source_id (str): Mã Snowflake ID hoặc định danh duy nhất của tài liệu từ MySQL.
            source_type (str): Định dạng nguồn ('text', 'pdf', 'docx', 'image').
            content (str | None): Nội dung chuỗi văn bản nếu là kiểu text.
            file_bytes (bytes | None): Dữ liệu nhị phân của tệp đính kèm.
            metadata (dict[str, Any]): Các thông tin ngữ cảnh, phân quyền (`allowedRoles`, `module`, `domain`).

        Returns:
            int: Tổng số lượng vector record đã được lưu vào Qdrant.

        Raises:
            ValueError: Nếu file không trích xuất được chunk nào.
            RuntimeError: Nếu số lượng embedding trả về không khớp số chunk.
        """
        extractor = self.extractor_factory.get(source_type)
        document = await extractor.extract(content=content, file_bytes=file_bytes)
        chunks = self.chunker.chunk(document)
        if not chunks:
            raise ValueError("Nguồn không tạo được chunk nào")
        vectors = await self.embedder.embed_documents([chunk.text for chunk in chunks])
        if len(vectors) != len(chunks):
            raise RuntimeError("Số embedding trả về không khớp số chunk")
        collection = settings.QDRANT_RAG_COLLECTION
        await self.vector_store.ensure_collection(
            collection, settings.RAG_EMBEDDING_DIMENSION
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
        """
        Xóa toàn bộ các vector liên quan đến một tài liệu cụ thể khỏi Vector Store.

        Cơ chế:
        - Sử dụng bộ lọc `{"sourceId": source_id}` để xóa tất cả các chunk văn bản và vector media phụ trợ.

        Args:
            source_id (str): Mã định danh duy nhất của nguồn tài liệu cần xóa.
        """
        collection = settings.QDRANT_RAG_COLLECTION
        await self.vector_store.ensure_collection(
            collection, settings.RAG_EMBEDDING_DIMENSION
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
        """
        Tạo vector đại diện đa phương thức trực tiếp từ tệp nhị phân nếu là ảnh hoặc PDF ngắn (<= 6 trang).

        Cơ chế:
        1. Kiểm tra nếu không có byte hoặc định dạng không phải image/pdf -> Bỏ qua trả về None.
        2. Nếu là PDF: mở tệp bằng PyMuPDF (fitz) để đếm số trang; nếu vượt quá 6 trang -> Bỏ qua để tiết kiệm tài nguyên.
        3. Gọi `embedder.embed_media()` để tạo vector đa phương thức.
        4. Gán `chunkIndex = -1` và `representation = "multimodal"` để phân biệt với các chunk văn bản thông thường.

        Args:
            source_id (str): Định danh nguồn tài liệu.
            source_type (str): Kiểu tài liệu ('image' hoặc 'pdf').
            file_bytes (bytes | None): Dữ liệu nhị phân của tệp.
            metadata (dict[str, Any]): Metadata đi kèm.
            document (ExtractedDocument): Tài liệu đã trích xuất chứa text OCR.

        Returns:
            VectorRecord | None: Bản ghi vector multimodal hoặc None.
        """
        if not file_bytes or source_type not in {"image", "pdf"}:
            return None
        # Local RAG intentionally skips multimodal vectors to avoid Gemini quota usage.
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

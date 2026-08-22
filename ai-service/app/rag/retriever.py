from typing import Any

from app.core.config import settings
from app.rag.embedder import BaseEmbedder, LocalRagEmbedder
from app.rag.models import SearchResult
from app.vector_store.base import BaseVectorStore
from app.vector_store.qdrant_store import QdrantVectorStore


class Retriever:
    """
    Bộ truy xuất tài liệu ngữ nghĩa (Semantic Information Retriever).

    Cơ chế hoạt động và kiểm soát phân quyền (Role-Based Access Control):
    - Đóng vai trò cầu nối giữa câu hỏi của người dùng và kho tri thức tài liệu trong Qdrant (`management_knowledge`).
    - Chuyển đổi câu hỏi thành vector nhúng bằng `GeminiEmbedder`.
    - Thực thi tìm kiếm tương đồng cosine kết hợp các bộ lọc payload nghiêm ngặt
      (ví dụ: `allowedRoles`, `module`, `domain`) để đảm bảo người dùng chỉ xem được các tài liệu mà họ có quyền truy cập.
    """

    def __init__(
        self,
        embedder: BaseEmbedder | None = None,
        vector_store: BaseVectorStore | None = None,
    ) -> None:
        """
        Khởi tạo Retriever với Embedder và VectorStore (hỗ trợ Dependency Injection).

        Args:
            embedder (BaseEmbedder | None): Instance tạo vector nhúng (mặc định GeminiEmbedder).
            vector_store (BaseVectorStore | None): Instance cơ sở dữ liệu vector (mặc định QdrantVectorStore).
        """
        self.embedder = embedder or LocalRagEmbedder()
        self.vector_store = vector_store or QdrantVectorStore()

    async def retrieve(
        self,
        query: str,
        filters: dict[str, Any],
        limit: int = 5,
        score_threshold: float | None = None,
    ) -> list[SearchResult]:
        """
        Thực hiện tìm kiếm ngữ nghĩa các phân đoạn tài liệu phù hợp nhất với câu hỏi.

        Cơ chế:
        1. Tạo vector đại diện câu hỏi qua `embed_query()`.
        2. Đảm bảo collection `management_knowledge` đã sẵn sàng trên Qdrant.
        3. Thực hiện truy vấn `vector_store.search` với vector câu hỏi, giới hạn `limit`, từ điển `filters` và `score_threshold`.
        4. Trả về danh sách `SearchResult` kèm điểm cosine score và nội dung `chunkText`.

        Args:
            query (str): Câu hỏi tìm kiếm (thường đã được làm giàu qua QueryRewriter).
            filters (dict[str, Any]): Bộ lọc payload Qdrant (ví dụ: `{"allowedRoles": ["ADMIN"], "module": "HR"}`).
            limit (int): Số lượng phân đoạn tài liệu tối đa cần lấy (mặc định 5).
            score_threshold (float | None): Ngưỡng điểm tương đồng tối thiểu (mặc định lấy từ settings.RAG_MIN_SCORE).

        Returns:
            list[SearchResult]: Danh sách các đoạn trích tri thức phù hợp nhất.
        """
        threshold = score_threshold if score_threshold is not None else settings.RAG_MIN_SCORE
        vector = await self.embedder.embed_query(query)
        await self.vector_store.ensure_collection(
            settings.QDRANT_RAG_COLLECTION, settings.RAG_EMBEDDING_DIMENSION
        )
        return await self.vector_store.search(
            settings.QDRANT_RAG_COLLECTION,
            vector,
            limit,
            filters,
            score_threshold=threshold,
        )

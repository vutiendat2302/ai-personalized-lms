import uuid
from typing import Any

from app.core.config import settings
from app.rag.embedder import BaseEmbedder, LocalRagEmbedder
from app.rag.models import SearchResult, VectorRecord
from app.vector_store.base import BaseVectorStore
from app.vector_store.qdrant_store import QdrantVectorStore


class LongTermMemoryStore:
    """
    Dịch vụ quản lý bộ nhớ ngữ nghĩa dài hạn (Long-term Episodic Memory).

    Cơ chế hoạt động và phân vùng đa người dùng (Multi-tenant Partitioning):
    - Hệ thống lưu trữ các sự kiện, sở thích học tập, ghi chú cá nhân của người dùng qua các phiên hội thoại khác nhau.
    - Dữ liệu được lưu trong collection chuyên biệt `long_term_memory` của Qdrant.
    - Phân vùng nghiêm ngặt theo `ownerId` (ID người dùng) và `scope` (ví dụ: 'STUDENT_LEARNING', 'HR_ADMIN').
    - Mọi thao tác tìm kiếm (`recall`) và xóa (`forget`) đều bắt buộc phải kèm điều kiện lọc `ownerId` và `scope`
      để đảm bảo tính riêng tư tuyệt đối, người này không thể đọc được ký ức của người khác.
    """

    def __init__(
        self,
        embedder: BaseEmbedder | None = None,
        vector_store: BaseVectorStore | None = None,
    ) -> None:
        """
        Khởi tạo LongTermMemoryStore với embedder và vector store có thể tiêm phụ thuộc (Dependency Injection).

        Args:
            embedder (BaseEmbedder | None): Trình nhúng vector (mặc định GeminiEmbedder).
            vector_store (BaseVectorStore | None): Cơ sở dữ liệu vector (mặc định QdrantVectorStore).
        """
        self.embedder = embedder or LocalRagEmbedder()
        self.vector_store = vector_store or QdrantVectorStore()

    async def remember(
        self,
        owner_id: str,
        scope: str,
        memory_id: str,
        content: str,
        metadata: dict[str, Any],
    ) -> None:
        """
        Ghi nhớ một sự kiện hoặc thông tin mới vào bộ nhớ dài hạn (Idempotent Upsert).

        Cơ chế:
        1. Sinh embedding vector 768 chiều cho chuỗi `content` bằng `GeminiEmbedder`.
        2. Đảm bảo collection `long_term_memory` đã được tạo trong Qdrant.
        3. Tạo deterministic UUIDv5 từ bộ ba `{owner_id}:{scope}:{memory_id}` để tránh trùng lặp bản ghi khi ghi đè cùng ID.
        4. Upsert `VectorRecord` kèm toàn bộ metadata lọc vào Qdrant.

        Args:
            owner_id (str): Định danh người dùng sở hữu ký ức.
            scope (str): Phạm vi nghiệp vụ của ký ức (ví dụ: 'COURSE_CONSULTING').
            memory_id (str): Mã định danh duy nhất của ký ức do Backend cung cấp.
            content (str): Nội dung văn bản cần ghi nhớ.
            metadata (dict[str, Any]): Các thông tin mở rộng đính kèm.
        """
        vector = (await self.embedder.embed_documents([content]))[0]
        collection = settings.QDRANT_MEMORY_COLLECTION
        await self.vector_store.ensure_collection(
            collection, settings.RAG_EMBEDDING_DIMENSION
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
        """
        Truy xuất các ký ức dài hạn có liên quan ngữ nghĩa gần nhất với câu hỏi.

        Cơ chế:
        1. Tạo vector cho chuỗi `query` với task_type tìm kiếm.
        2. Truy vấn Qdrant với bộ lọc bắt buộc `{"ownerId": owner_id, "scope": scope}`.
        3. Trả về danh sách `SearchResult` sắp xếp theo cosine similarity giảm dần.

        Args:
            owner_id (str): Định danh người dùng cần tra cứu ký ức.
            scope (str): Phạm vi nghiệp vụ cần giới hạn.
            query (str): Câu hỏi hoặc chủ đề cần hồi tưởng.
            limit (int): Số lượng ký ức tối đa cần lấy (mặc định 5).

        Returns:
            list[SearchResult]: Danh sách các bản ghi ký ức kèm điểm tương đồng và payload.
        """
        vector = await self.embedder.embed_query(query)
        await self.vector_store.ensure_collection(
            settings.QDRANT_MEMORY_COLLECTION, settings.RAG_EMBEDDING_DIMENSION
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
        """
        Xóa một ký ức cụ thể hoặc xóa toàn bộ ký ức trong một scope của người dùng.

        Cơ chế:
        1. Xây dựng filter xóa chứa `ownerId` và `scope`.
        2. Nếu `memory_id` được chỉ định -> Thêm điều kiện lọc chính xác `memoryId`.
        3. Thực thi xóa hàng loạt trên Qdrant qua `delete_by_filter`.

        Args:
            owner_id (str): Định danh người dùng.
            scope (str): Phạm vi nghiệp vụ.
            memory_id (str | None): ID ký ức cần xóa (nếu None sẽ xóa toàn bộ ký ức trong scope đó).
        """
        filters = {"ownerId": owner_id, "scope": scope}
        if memory_id:
            filters["memoryId"] = memory_id
        await self.vector_store.ensure_collection(
            settings.QDRANT_MEMORY_COLLECTION, settings.RAG_EMBEDDING_DIMENSION
        )
        await self.vector_store.delete_by_filter(
            settings.QDRANT_MEMORY_COLLECTION, filters
        )
